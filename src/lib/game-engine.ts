/**
 * AGENT — A Real Estate Career Game
 * Core game engine: state initialization, action processing, round resolution.
 *
 * Financial math is 100% derived from business-plan.ts (Wes's authentic model):
 *   - GCI per deal: $285K × 3% = $8,550
 *   - Net per deal after 29.2% CoS + 29.2% OpEx = $3,557
 *   - 33 database contacts → 1 closed deal/year
 *   - Pipeline: C→B 50%, B→A 65%, A→Close 85%
 *   - Tax reserve: 30% recommended
 *   - Burnout threshold: 80% → forced action
 *
 * Level gates:
 *   L1→L2: Year 2 gate (The 85% Wall). Min database 66 + min GCI $50K/yr
 *   L2→L3: Year 4. Min database 165 + hired assistant + GCI $120K/yr
 *   L3→L4: Year 6. Min database 330 + buyer agent + GCI $200K/yr
 *   L4 Win: Passive income > $5K/month (Easy Street)
 */

import type { GameState, GameLevel, Quarter, LogEntry, CardEffect } from './game-types';
import { GAME_CONSTANTS } from './game-types';
import { buildWeightedDeck, getCardById, drawCardsFromDeck } from './game-cards';

// ── Seasonal income weights (Wes's authentic Tri-Cities data) ──────────
// Jan=4%, Feb=5%, Mar=8%, Apr=7%, May=12%, Jun=9%, Jul=8%, Aug=10%,
// Sep=10%, Oct=8%, Nov=10%, Dec=8%  (sums to 0.99, close enough)
const QUARTER_WEIGHTS = [
  0.17, // Q1 (Jan-Mar = 4+5+8 = 17%)
  0.28, // Q2 (Apr-Jun = 7+12+9 = 28%)
  0.28, // Q3 (Jul-Sep = 8+10+10 = 28%)
  0.26, // Q4 (Oct-Dec = 8+10+8 = 26%)
];

const MONTHS_PER_QUARTER = 3;

// ── Level gate requirements ────────────────────────────────────────────

export interface LevelGate {
  minDatabaseSize: number;
  minAnnualGCI: number;
  requiresAssistant?: boolean;
  requiresBuyerAgent?: boolean;
  description: string;
}

export const LEVEL_GATES: Record<number, LevelGate> = {
  2: {
    minDatabaseSize: 66,
    minAnnualGCI: 50000,
    description: 'The 85% Wall: 66+ contacts, $50K+ GCI this year',
  },
  3: {
    minDatabaseSize: 165,
    minAnnualGCI: 120000,
    requiresAssistant: true,
    description: '165+ contacts, $120K+ GCI, assistant hired',
  },
  4: {
    minDatabaseSize: 330,
    minAnnualGCI: 200000,
    requiresBuyerAgent: true,
    description: '330+ contacts, $200K+ GCI, buyer\'s agent on team',
  },
};

// ── Action costs ───────────────────────────────────────────────────────

export interface ActionResult {
  message: string;
  type: 'info' | 'good' | 'bad' | 'milestone';
  stateDelta: Partial<GameState>;
}

// ── Initial state factory ──────────────────────────────────────────────

export function createInitialState(playerName: string): GameState {
  return {
    playerName,
    round: 1,
    year: 1,
    quarter: 1,
    phase: 'action',
    level: 1,

    cash: 8000,                    // starting savings
    gciThisYear: 0,
    gciAllTime: 0,
    netIncomeThisYear: 0,
    netIncomeAllTime: 0,
    taxReserveEnabled: false,
    taxReserve: 0,
    taxTrapFired: false,

    databaseSize: 15,              // new agent: small sphere
    tierA: 0,
    tierB: 2,
    tierC: 13,
    pendingDeals: 0,

    burnoutMeter: 10,
    burnoutWarnings: 0,

    hasAssistant: false,
    buyerAgents: 0,

    rentalProperties: 0,
    passiveIncomeMonthly: 0,
    monthlyPersonalExpenses: GAME_CONSTANTS.MONTHLY_PERSONAL_EXPENSES,

    marketMultiplier: 1.0,
    marketMultiplierRoundsLeft: 0,

    actionPoints: 3,
    maxActionPoints: 3,

    drawnCards: [],
    currentCardIndex: 0,

    log: [],
    roundLog: [],

    hitEasyStreet: false,
    gameOver: false,
    won: false,
    gameOverReason: '',

    pendingLevelUp: false,
    pendingLevelUpTo: null,
  };
}

// ── Pipeline math helpers ──────────────────────────────────────────────

/** Compute deals closed this quarter from pipeline + market conditions */
export function computeQuarterlyDeals(state: GameState): number {
  const quarter = (state.quarter - 1) as 0 | 1 | 2 | 3;
  const seasonalWeight = QUARTER_WEIGHTS[quarter];

  // Base deals from A-tier (primary close pipeline)
  // A-tier: 85% close rate per Wes's model
  const aDeals = state.tierA * GAME_CONSTANTS.TIER_A_TO_CLOSE;

  // Additional deals from pending (closed last quarter's pipeline)
  const pendingDeals = state.pendingDeals;

  // Seasonal adjustment (Q2 peak = 1.12x, Q1 slow = 0.68x relative to flat)
  const flatWeight = 0.25;
  const seasonalMultiplier = seasonalWeight / flatWeight;

  // Team multiplier (buyer agents produce additional deals)
  const teamMultiplier = 1 + state.buyerAgents * 0.4;

  const baseDeals = (aDeals + pendingDeals) * seasonalMultiplier * state.marketMultiplier * teamMultiplier;

  return Math.max(0, baseDeals);
}

/** Compute the quarterly natural pipeline flow: C→B→A promotions */
export function computeNaturalPipelineFlow(state: GameState): {
  cToB: number;
  bToA: number;
  newPending: number;
} {
  // Each quarter, some % of each tier promotes
  // Using quarterly rates (annual ÷ 4)
  const quarterlyCtoBRate = GAME_CONSTANTS.TIER_C_TO_B / 4;  // ~12.5%/quarter
  const quarterlyBtoARate = GAME_CONSTANTS.TIER_B_TO_A / 4;  // ~16.25%/quarter

  const cToB = Math.floor(state.tierC * quarterlyCtoBRate);
  const bToA = Math.floor(state.tierB * quarterlyBtoARate);

  // A-tier that doesn't close becomes pending
  const aNotClosed = Math.floor(state.tierA * (1 - GAME_CONSTANTS.TIER_A_TO_CLOSE));
  const newPending = Math.max(0, aNotClosed);

  return { cToB, bToA, newPending };
}

// ── Action execution ───────────────────────────────────────────────────

export function executeAction(
  state: GameState,
  actionType: string,
  deck: string[]
): { newState: GameState; result: ActionResult; newDeck: string[] } {
  let newState = { ...state };
  let newDeck = deck;
  let result: ActionResult;

  switch (actionType) {
    case 'prospect-sphere': {
      // Work your database: sphere calls, follow-up, nurture
      // Cost: 1 AP, +5-12 burnout, promotes B→A, C→B, adds C-tier
      const burnoutCost = newState.hasAssistant ? 6 : 10;
      const cAdded = 2 + Math.floor(Math.random() * 3); // 2–4 new C
      const bPromoted = Math.floor(newState.tierC * 0.08); // 8% of C → B
      const aPromoted = Math.floor(newState.tierB * 0.12); // 12% of B → A

      newState = {
        ...newState,
        tierC: newState.tierC + cAdded - bPromoted,
        tierB: newState.tierB + bPromoted - aPromoted,
        tierA: newState.tierA + aPromoted,
        databaseSize: newState.databaseSize + cAdded,
        burnoutMeter: Math.min(100, newState.burnoutMeter + burnoutCost),
        actionPoints: newState.actionPoints - 1,
      };

      result = {
        message: `Sphere prospecting: +${cAdded} new contacts, ${bPromoted} C→B, ${aPromoted} B→A. Burnout +${burnoutCost}.`,
        type: 'info',
        stateDelta: {},
      };
      break;
    }

    case 'cold-prospect': {
      // Cold outreach: expireds, FSBOs, circle prospect
      // Cost: 1 AP, +15 burnout (no relationships yet), higher C gain
      const burnoutCost = newState.hasAssistant ? 12 : 18;
      const cAdded = 3 + Math.floor(Math.random() * 5); // 3–7 new C
      const aChance = Math.random();
      const hotLead = aChance > 0.65 ? 1 : 0; // 35% chance of A-tier expired/FSBO

      newState = {
        ...newState,
        tierC: newState.tierC + cAdded,
        tierA: newState.tierA + hotLead,
        databaseSize: newState.databaseSize + cAdded + hotLead,
        burnoutMeter: Math.min(100, newState.burnoutMeter + burnoutCost),
        actionPoints: newState.actionPoints - 1,
      };

      result = {
        message: `Cold prospecting: +${cAdded} new C-tier contacts${hotLead ? ', 1 hot A-tier expired/FSBO!' : ''}. Burnout +${burnoutCost}.`,
        type: hotLead ? 'good' : 'info',
        stateDelta: {},
      };
      break;
    }

    case 'work-pipeline': {
      // Move hot prospects toward close: showings, presentations, offers
      // Cost: 1 AP, moderate burnout, converts A→pending
      const burnoutCost = newState.hasAssistant ? 8 : 12;
      const convertedDeals = Math.floor(newState.tierA * 0.30 * newState.marketMultiplier);
      const bToA = Math.floor(newState.tierB * 0.20);

      newState = {
        ...newState,
        tierA: Math.max(0, newState.tierA - convertedDeals + bToA),
        tierB: Math.max(0, newState.tierB - bToA),
        pendingDeals: newState.pendingDeals + convertedDeals,
        burnoutMeter: Math.min(100, newState.burnoutMeter + burnoutCost),
        actionPoints: newState.actionPoints - 1,
      };

      result = {
        message: convertedDeals > 0
          ? `Pipeline work: ${convertedDeals} deal${convertedDeals > 1 ? 's' : ''} moved to pending! ${bToA} B→A promotions. Burnout +${burnoutCost}.`
          : `Pipeline work: appointments set, ${bToA} B→A promotions. No closings yet. Burnout +${burnoutCost}.`,
        type: convertedDeals > 0 ? 'good' : 'info',
        stateDelta: {},
      };
      break;
    }

    case 'marketing-roulette': {
      // Spend $2K on paid leads — random 0–3 deal result
      // The authentic "Marketing Roulette" trap from the game spec
      if (newState.cash < 2000) {
        result = {
          message: 'Not enough cash for marketing spend ($2,000 needed).',
          type: 'bad',
          stateDelta: {},
        };
        break;
      }
      const roll = Math.random();
      let leadsGained = 0;
      let message = '';
      if (roll < 0.35) {
        leadsGained = 0;
        message = `Marketing roulette: $2,000 spent. Zero qualified leads. ROI = 0. (Happens 35% of the time.)`;
      } else if (roll < 0.70) {
        leadsGained = 1;
        message = `Marketing roulette: $2,000 spent. 1 cold B-tier lead. Barely breakeven.`;
      } else if (roll < 0.90) {
        leadsGained = 2;
        message = `Marketing roulette: $2,000 spent. 2 B-tier leads. Not bad — if they close.`;
      } else {
        leadsGained = 3;
        message = `Marketing roulette: $2,000 spent. 3 leads — 1 A-tier! Lucky roll. Don't rely on this.`;
      }

      const aGained = leadsGained >= 3 ? 1 : 0;
      const bGained = Math.max(0, leadsGained - aGained);

      newState = {
        ...newState,
        cash: newState.cash - 2000,
        tierA: newState.tierA + aGained,
        tierB: newState.tierB + bGained,
        databaseSize: newState.databaseSize + leadsGained,
        burnoutMeter: Math.min(100, newState.burnoutMeter + 5),
        actionPoints: newState.actionPoints - 1,
      };

      result = { message, type: leadsGained >= 2 ? 'good' : 'bad', stateDelta: {} };
      break;
    }

    case 'rest': {
      // Take a breather — recover burnout
      const burnoutRecovery = newState.hasAssistant ? 20 : 12;
      newState = {
        ...newState,
        burnoutMeter: Math.max(0, newState.burnoutMeter - burnoutRecovery),
        actionPoints: newState.actionPoints - 1,
      };
      result = {
        message: `Rest: burnout -${burnoutRecovery}. You needed this. Back to work.`,
        type: 'info',
        stateDelta: {},
      };
      break;
    }

    case 'hire-assistant': {
      // Hire an assistant — big AP investment, reduces burnout drain
      if (newState.hasAssistant) {
        result = { message: 'You already have an assistant.', type: 'info', stateDelta: {} };
        break;
      }
      if (newState.cash < 5000) {
        result = { message: 'Need $5,000 to hire an assistant.', type: 'bad', stateDelta: {} };
        break;
      }
      newState = {
        ...newState,
        cash: newState.cash - 5000,
        hasAssistant: true,
        burnoutMeter: Math.max(0, newState.burnoutMeter - 15),
        maxActionPoints: 4,
        actionPoints: newState.actionPoints - 1,
      };
      result = {
        message: '🎉 Assistant hired! -$5,000 setup cost. Burnout drain cut in half. +1 AP per round.',
        type: 'milestone',
        stateDelta: {},
      };
      break;
    }

    case 'hire-buyer-agent': {
      // Hire a buyer's agent — scales production, costs equity
      if (newState.level < 2) {
        result = { message: 'Reach Level 2 (Team Lead) to hire buyer\'s agents.', type: 'bad', stateDelta: {} };
        break;
      }
      if (newState.buyerAgents >= 4) {
        result = { message: 'Max team size reached (4 buyer agents).', type: 'info', stateDelta: {} };
        break;
      }
      if (newState.cash < 8000) {
        result = { message: 'Need $8,000 to recruit and onboard a buyer\'s agent.', type: 'bad', stateDelta: {} };
        break;
      }
      const newAgentCount = newState.buyerAgents + 1;
      newState = {
        ...newState,
        cash: newState.cash - 8000,
        buyerAgents: newAgentCount,
        burnoutMeter: Math.max(0, newState.burnoutMeter - 10),
        actionPoints: newState.actionPoints - 1,
      };
      result = {
        message: `🎉 Buyer's agent #${newAgentCount} recruited! -$8,000. They'll bring in deals on your listings.`,
        type: 'milestone',
        stateDelta: {},
      };
      break;
    }

    case 'buy-rental': {
      // Buy a rental property — path to passive income
      if (newState.level < 3) {
        result = { message: 'Reach Level 3 (Rainmaker) to start acquiring rental properties.', type: 'bad', stateDelta: {} };
        break;
      }
      if (newState.cash < 25000) {
        result = { message: 'Need $25,000 for rental property down payment.', type: 'bad', stateDelta: {} };
        break;
      }
      const monthlyPassive = 600 + Math.floor(Math.random() * 400); // $600–$1,000/mo net
      newState = {
        ...newState,
        cash: newState.cash - 25000,
        rentalProperties: newState.rentalProperties + 1,
        passiveIncomeMonthly: newState.passiveIncomeMonthly + monthlyPassive,
        actionPoints: newState.actionPoints - 1,
      };
      result = {
        message: `🏘️ Rental property #${newState.rentalProperties} acquired! -$25K down. +$${monthlyPassive.toLocaleString()}/mo passive income.`,
        type: 'milestone',
        stateDelta: {},
      };
      break;
    }

    case 'toggle-tax-reserve': {
      const newEnabled = !newState.taxReserveEnabled;
      newState = {
        ...newState,
        taxReserveEnabled: newEnabled,
      };
      result = {
        message: newEnabled
          ? '✅ Tax reserve ON: 30% of each closing will be set aside for the IRS.'
          : '⚠️ Tax reserve OFF: you\'re flying without a net. The IRS will still want their cut.',
        type: newEnabled ? 'good' : 'bad',
        stateDelta: {},
      };
      break;
    }

    default:
      result = { message: `Unknown action: ${actionType}`, type: 'bad', stateDelta: {} };
  }

  return { newState, result, newDeck };
}

// ── End of round resolution ────────────────────────────────────────────

export function resolveEndOfRound(
  state: GameState,
  deck: string[]
): { newState: GameState; newDeck: string[]; roundSummary: string[] } {
  let s = { ...state };
  const summary: string[] = [];
  let newDeck = deck;

  // 1. Natural pipeline promotion
  const flow = computeNaturalPipelineFlow(s);
  s.tierC = Math.max(0, s.tierC - flow.cToB);
  s.tierB = Math.max(0, s.tierB + flow.cToB - flow.bToA);
  s.tierA = s.tierA + flow.bToA;
  s.pendingDeals = s.pendingDeals + flow.newPending;

  if (flow.bToA > 0) summary.push(`Pipeline: ${flow.cToB} C→B, ${flow.bToA} B→A.`);

  // 2. Close pending deals → income
  const closedDeals = Math.round(s.pendingDeals * 0.7 * s.marketMultiplier);
  const gciEarned = closedDeals * GAME_CONSTANTS.GCI_PER_DEAL;
  const netEarned = closedDeals * GAME_CONSTANTS.NET_PER_DEAL;

  if (closedDeals > 0) {
    summary.push(`Closings: ${closedDeals} deal${closedDeals !== 1 ? 's' : ''} closed → $${gciEarned.toLocaleString()} GCI, $${netEarned.toLocaleString()} net.`);
  }

  // 3. Tax reserve (set aside 30% of GCI if enabled)
  let taxSet = 0;
  let cashFromClosings = netEarned;
  if (s.taxReserveEnabled && gciEarned > 0) {
    taxSet = Math.round(gciEarned * GAME_CONSTANTS.RECOMMENDED_TAX_RESERVE_PCT);
    cashFromClosings = netEarned - taxSet;
    s.taxReserve = s.taxReserve + taxSet;
    summary.push(`Tax reserve: $${taxSet.toLocaleString()} set aside (30% of GCI).`);
  }

  s.cash = s.cash + cashFromClosings;
  s.gciThisYear = s.gciThisYear + gciEarned;
  s.gciAllTime = s.gciAllTime + gciEarned;
  s.netIncomeThisYear = s.netIncomeThisYear + netEarned;
  s.netIncomeAllTime = s.netIncomeAllTime + netEarned;

  // 4. Clear closed pending deals
  s.pendingDeals = Math.max(0, s.pendingDeals - closedDeals);

  // 5. A-tier that didn't close moves back to B (some fall off)
  s.tierA = Math.max(0, s.tierA - flow.bToA);

  // 6. Passive income (monthly × 3 for quarter)
  if (s.passiveIncomeMonthly > 0) {
    const quarterPassive = s.passiveIncomeMonthly * MONTHS_PER_QUARTER;
    s.cash = s.cash + quarterPassive;
    summary.push(`Passive income: +$${quarterPassive.toLocaleString()} (${s.rentalProperties} rental${s.rentalProperties !== 1 ? 's' : ''}).`);
  }

  // 7. Market multiplier countdown
  if (s.marketMultiplierRoundsLeft > 0) {
    s.marketMultiplierRoundsLeft = s.marketMultiplierRoundsLeft - 1;
    if (s.marketMultiplierRoundsLeft === 0) {
      s.marketMultiplier = 1.0;
      summary.push('Market returned to normal conditions.');
    }
  }

  // 8. Burnout natural recovery (rest + systems)
  const baseRecovery = s.hasAssistant ? 8 : 4;
  s.burnoutMeter = Math.max(0, s.burnoutMeter - baseRecovery);

  // 9. Living expenses (quarterly: $5K/mo × 3 = $15K)
  const quarterlyExpenses = s.monthlyPersonalExpenses * MONTHS_PER_QUARTER;
  s.cash = s.cash - quarterlyExpenses;
  summary.push(`Living expenses: -$${quarterlyExpenses.toLocaleString()}`);

  // 10. Assistant cost ($1,800/mo × 3)
  if (s.hasAssistant) {
    const assistantCost = 1800 * MONTHS_PER_QUARTER;
    s.cash = s.cash - assistantCost;
    summary.push(`Assistant cost: -$${assistantCost.toLocaleString()}`);
  }

  // 11. Buyer agent costs ($500/mo minimum guarantee × 3)
  if (s.buyerAgents > 0) {
    const agentOverhead = s.buyerAgents * 500 * MONTHS_PER_QUARTER;
    s.cash = s.cash - agentOverhead;
    summary.push(`Buyer agent overhead: -$${agentOverhead.toLocaleString()}`);
  }

  // 12. Burnout check — over 80% is danger zone
  if (s.burnoutMeter >= GAME_CONSTANTS.BURNOUT_DANGER && !s.hasAssistant) {
    s.burnoutWarnings = s.burnoutWarnings + 1;
    summary.push('⚠️ BURNOUT DANGER: Hire an assistant or rest before you crash.');
    if (s.burnoutWarnings >= 3 && !s.hasAssistant) {
      // Force a burnout consequence
      s.tierB = Math.max(0, s.tierB - 2);
      s.tierA = Math.max(0, s.tierA - 1);
      summary.push('💥 Burnout collapse: dropped the ball on pipeline. Lost deals.');
    }
  }

  // 13. Year-end events (Q4 only)
  if (s.quarter === 4) {
    // Tax trap
    if (!s.taxReserveEnabled && s.gciThisYear > 0) {
      const taxBill = Math.round(s.gciThisYear * 0.28);
      const covered = s.taxReserve;
      const uncovered = Math.max(0, taxBill - covered);
      if (uncovered > 0) {
        s.cash = s.cash - uncovered;
        summary.push(`🚨 IRS TAX BILL: $${taxBill.toLocaleString()} owed. $${uncovered.toLocaleString()} coming out of pocket. Set aside 30% next year!`);
      } else {
        summary.push(`Tax bill covered by reserve. Good discipline.`);
      }
    }

    // Level-up check
    const nextLevel = (s.level + 1) as GameLevel;
    if (s.level < 4 && LEVEL_GATES[nextLevel]) {
      const gate = LEVEL_GATES[nextLevel];
      const meetsDatabase = s.databaseSize >= gate.minDatabaseSize;
      const meetsGCI = s.gciThisYear >= gate.minAnnualGCI;
      const meetsAssistant = !gate.requiresAssistant || s.hasAssistant;
      const meetsBuyerAgent = !gate.requiresBuyerAgent || s.buyerAgents > 0;

      if (meetsDatabase && meetsGCI && meetsAssistant && meetsBuyerAgent) {
        s.pendingLevelUp = true;
        s.pendingLevelUpTo = nextLevel;
        summary.push(`🏆 LEVEL UP! You've hit the ${gate.description}.`);
      }
    }

    // Reset year-end counters
    s.gciThisYear = 0;
    s.netIncomeThisYear = 0;
    s.taxReserve = 0;
    s.taxTrapFired = false;
  }

  // 14. Advance time
  const nextQuarter = s.quarter === 4 ? 1 : (s.quarter + 1) as Quarter;
  const nextYear = s.quarter === 4 ? s.year + 1 : s.year;
  s.quarter = nextQuarter;
  s.year = nextYear;
  s.round = s.round + 1;

  // 15. Win/lose conditions
  if (s.passiveIncomeMonthly >= s.monthlyPersonalExpenses) {
    s.hitEasyStreet = true;
    s.gameOver = true;
    s.won = true;
    summary.push('🌴 EASY STREET! Passive income exceeds monthly expenses. You win!');
  }

  if (s.cash < -20000) {
    s.gameOver = true;
    s.won = false;
    s.gameOverReason = 'Ran out of cash. GCI income couldn\'t cover expenses.';
    summary.push('💀 GAME OVER: Out of cash. Pipeline was too thin to survive the gap.');
  }

  if (s.round > GAME_CONSTANTS.MAX_ROUNDS && !s.won) {
    s.gameOver = true;
    s.won = false;
    s.gameOverReason = '8 years passed. Passive income never exceeded monthly expenses.';
    summary.push('⏰ GAME OVER: 8 years passed and you never reached Easy Street.');
  }

  if (s.burnoutMeter >= 100) {
    s.gameOver = true;
    s.won = false;
    s.gameOverReason = 'Complete burnout. You left the industry.';
    summary.push('🔥 GAME OVER: 100% burnout. You quit the business.');
  }

  // 16. Draw cards for next round
  const { drawn, remaining } = drawCardsFromDeck(newDeck, 2);
  newDeck = remaining;
  s.drawnCards = drawn.map((id) => ({ card: getCardById(id), revealed: false }));
  s.currentCardIndex = 0;
  s.phase = s.gameOver ? 'game-over' : s.pendingLevelUp ? 'level-up' : 'card-draw';

  // 17. Reset action points for next turn
  s.actionPoints = s.maxActionPoints;
  s.roundLog = summary;

  return { newState: s, newDeck, roundSummary: summary };
}

// ── Card effect application ────────────────────────────────────────────

export function applyCardEffect(state: GameState, effect: CardEffect): GameState {
  let s = { ...state };

  if (effect.addTierA) s.tierA = Math.max(0, s.tierA + effect.addTierA);
  if (effect.addTierB) s.tierB = Math.max(0, s.tierB + effect.addTierB);
  if (effect.addTierC) {
    const delta = effect.addTierC;
    s.tierC = Math.max(0, s.tierC + delta);
    if (delta > 0) s.databaseSize = s.databaseSize + delta;
  }
  if (effect.addCash) s.cash = s.cash + effect.addCash;
  if (effect.addPendingDeals) s.pendingDeals = Math.max(0, s.pendingDeals + effect.addPendingDeals);
  if (effect.addPassiveIncomeMonthly) {
    s.passiveIncomeMonthly = s.passiveIncomeMonthly + effect.addPassiveIncomeMonthly;
  }
  if (effect.burnoutDelta) s.burnoutMeter = Math.min(100, Math.max(0, s.burnoutMeter + effect.burnoutDelta));
  if (effect.marketMultiplier) {
    s.marketMultiplier = effect.marketMultiplier;
    s.marketMultiplierRoundsLeft = effect.marketMultiplierRounds ?? 2;
  }
  if (effect.loseCurrentPendingDeals) s.pendingDeals = 0;
  if (effect.taxBill && s.gciThisYear > 0) {
    const bill = Math.round(s.gciThisYear * effect.taxBill);
    const fromReserve = Math.min(bill, s.taxReserve);
    const fromCash = bill - fromReserve;
    s.taxReserve = s.taxReserve - fromReserve;
    s.cash = s.cash - fromCash;
  }
  if (effect.taxBillFlat) {
    const fromReserve = Math.min(effect.taxBillFlat, s.taxReserve);
    const fromCash = effect.taxBillFlat - fromReserve;
    s.taxReserve = s.taxReserve - fromReserve;
    s.cash = s.cash - fromCash;
  }

  return s;
}

// ── Level up application ───────────────────────────────────────────────

export function applyLevelUp(state: GameState): GameState {
  const newLevel = state.pendingLevelUpTo as GameLevel;
  return {
    ...state,
    level: newLevel,
    pendingLevelUp: false,
    pendingLevelUpTo: null,
    phase: 'action',
    burnoutMeter: Math.max(0, state.burnoutMeter - 10),
  };
}

// ── Persistence ────────────────────────────────────────────────────────

const SAVE_KEY = 'agent-game-state-v1';
const DECK_KEY = 'agent-game-deck-v1';

export function saveGame(state: GameState, deck: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    localStorage.setItem(DECK_KEY, JSON.stringify(deck));
  } catch {
    // ignore
  }
}

export function loadGame(): { state: GameState; deck: string[] } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const deckRaw = localStorage.getItem(DECK_KEY);
    if (!raw || !deckRaw) return null;
    return { state: JSON.parse(raw), deck: JSON.parse(deckRaw) };
  } catch {
    return null;
  }
}

export function clearSave(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(DECK_KEY);
}

export function initDeck(): string[] {
  return buildWeightedDeck();
}

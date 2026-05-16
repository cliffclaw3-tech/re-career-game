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

import type { GameState, GameLevel, Quarter, LogEntry, CardEffect, CharacterConfig, CityId } from './game-types';
import { GAME_CONSTANTS, CITY_CONFIGS } from './game-types';
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

export function createInitialState(
  playerName: string,
  character: CharacterConfig = { gender: 'male', age: 'mid', outfit: 'casual' },
  city: CityId = 'kansas-city'
): GameState {
  const cityConfig = CITY_CONFIGS[city];

  // Base starting values
  let startingCash = 8000;
  let startingDB = 15;
  let startingTierB = 2;
  let startingTierC = 13;
  let maxAP = 3;
  let startingBurnout = 10;

  // Age archetype modifiers
  if (character.age === 'young') {
    startingCash = 5000;        // -$3K
    startingDB = 10;
    startingTierB = 1;
    startingTierC = 9;
    maxAP = 5;                  // +2 AP
    startingBurnout = 10;
  } else if (character.age === 'veteran') {
    startingCash = 13000;       // +$5K
    startingDB = 25;
    startingTierB = 4;
    startingTierC = 21;
    maxAP = 2;                  // -1 AP
    startingBurnout = 10;
  }

  return {
    playerName,
    characterGender: character.gender,
    characterAge: character.age,
    characterOutfit: character.outfit,
    city,
    lastDiceRoll: null,

    round: 1,
    year: 1,
    quarter: 1,
    phase: 'action',
    level: 1,

    cash: startingCash,
    gciThisYear: 0,
    gciAllTime: 0,
    netIncomeThisYear: 0,
    netIncomeAllTime: 0,
    taxReserveEnabled: false,
    taxReserve: 0,
    taxTrapFired: false,

    databaseSize: startingDB,
    tierA: 0,
    tierB: startingTierB,
    tierC: startingTierC,
    pendingDeals: 0,

    burnoutMeter: startingBurnout,
    burnoutWarnings: 0,

    hasAssistant: false,
    buyerAgents: 0,

    rentalProperties: 0,
    passiveIncomeMonthly: 0,
    monthlyPersonalExpenses: cityConfig.easyStreetMonthlyExpenses,

    marketMultiplier: 1.0,
    marketMultiplierRoundsLeft: 0,

    actionPoints: maxAP,
    maxActionPoints: maxAP,

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
  deck: string[],
  diceRoll?: number
): { newState: GameState; result: ActionResult; newDeck: string[] } {
  let newState = { ...state };
  if (diceRoll !== undefined) newState.lastDiceRoll = diceRoll;
  let newDeck = deck;
  let result: ActionResult;

  // Dice multiplier for action outcomes
  const diceMultiplier = diceRoll
    ? diceRoll === 6 ? 1.5
      : diceRoll === 5 ? 1.2
      : diceRoll <= 2 ? (diceRoll === 1 ? 0.6 : 0.8)
      : 1.0
    : 1.0;

  // Outfit bonus: hustle mode grants +1 AP on first action each round
  const hustleBonus = (
    state.characterOutfit === 'hustle' &&
    state.actionPoints === state.maxActionPoints &&
    actionType !== 'toggle-tax-reserve'
  ) ? 1 : 0;

  switch (actionType) {
    case 'prospect-sphere': {
      // Work your database: sphere calls, follow-up, nurture
      // Cost: 1 AP, +5-12 burnout, promotes B→A, C→B, adds C-tier
      const burnoutCost = newState.hasAssistant ? 6 : 10;
      // Veteran gets -5 burnout per action (experience buffer)
      const veteranBuffer = newState.characterAge === 'veteran' ? 5 : 0;
      const actualBurnout = Math.max(0, burnoutCost - veteranBuffer);

      const baseC = 2 + Math.floor(Math.random() * 3); // 2–4 new C
      // Casual outfit: +5 contacts added per Sphere Prospect
      const outfitBonus = newState.characterOutfit === 'casual' ? 5 : 0;
      const cAdded = Math.round(baseC * diceMultiplier) + outfitBonus;
      const bPromoted = Math.round(Math.floor(newState.tierC * 0.08) * diceMultiplier); // 8% of C → B
      const aPromoted = Math.round(Math.floor(newState.tierB * 0.12) * diceMultiplier); // 12% of B → A

      newState = {
        ...newState,
        tierC: newState.tierC + cAdded - bPromoted,
        tierB: newState.tierB + bPromoted - aPromoted,
        tierA: newState.tierA + aPromoted,
        databaseSize: newState.databaseSize + cAdded,
        burnoutMeter: Math.min(100, newState.burnoutMeter + actualBurnout),
        actionPoints: newState.actionPoints - 1 + hustleBonus,
      };

      result = {
        message: `Sphere prospecting: +${cAdded} new contacts, ${bPromoted} C→B, ${aPromoted} B→A. Burnout +${actualBurnout}.${diceRoll ? ` 🎲 Rolled ${diceRoll}.` : ''}`,
        type: 'info',
        stateDelta: {},
      };
      break;
    }

    case 'cold-prospect': {
      // Cold outreach: expireds, FSBOs, circle prospect
      // Cost: 1 AP, +15 burnout (no relationships yet), higher C gain
      const baseBurnout = newState.hasAssistant ? 12 : 18;
      const veteranBuffer = newState.characterAge === 'veteran' ? 5 : 0;
      // Young hustler: +5 burnout per cold prospect
      const youngPenalty = newState.characterAge === 'young' ? 5 : 0;
      const burnoutCost = Math.max(0, baseBurnout - veteranBuffer + youngPenalty);
      const baseC = 3 + Math.floor(Math.random() * 5); // 3–7 new C
      const cAdded = Math.round(baseC * diceMultiplier);
      const aChance = Math.random();
      const hotLead = aChance > 0.65 ? 1 : 0; // 35% chance of A-tier expired/FSBO

      newState = {
        ...newState,
        tierC: newState.tierC + cAdded,
        tierA: newState.tierA + hotLead,
        databaseSize: newState.databaseSize + cAdded + hotLead,
        burnoutMeter: Math.min(100, newState.burnoutMeter + burnoutCost),
        actionPoints: newState.actionPoints - 1 + hustleBonus,
      };

      result = {
        message: `Cold prospecting: +${cAdded} new C-tier contacts${hotLead ? ', 1 hot A-tier expired/FSBO!' : ''}. Burnout +${burnoutCost}.${diceRoll ? ` 🎲 Rolled ${diceRoll}.` : ''}`,
        type: hotLead ? 'good' : 'info',
        stateDelta: {},
      };
      break;
    }

    case 'work-pipeline': {
      // Move hot prospects toward close: showings, presentations, offers
      // Cost: 1 AP, moderate burnout, converts A→pending
      const burnoutCost = newState.hasAssistant ? 8 : 12;
      const veteranBuffer = newState.characterAge === 'veteran' ? 5 : 0;
      const actualBurnout = Math.max(0, burnoutCost - veteranBuffer);

      // Formal outfit: +10% B→A conversion
      const formalBonus = newState.characterOutfit === 'formal' ? 0.10 : 0;
      const convertedDeals = Math.round(Math.floor(newState.tierA * 0.30 * newState.marketMultiplier) * diceMultiplier);
      const bToA = Math.round(Math.floor(newState.tierB * (0.20 + formalBonus)) * diceMultiplier);

      newState = {
        ...newState,
        tierA: Math.max(0, newState.tierA - convertedDeals + bToA),
        tierB: Math.max(0, newState.tierB - bToA),
        pendingDeals: newState.pendingDeals + convertedDeals,
        burnoutMeter: Math.min(100, newState.burnoutMeter + actualBurnout),
        actionPoints: newState.actionPoints - 1 + hustleBonus,
      };

      result = {
        message: convertedDeals > 0
          ? `Pipeline work: ${convertedDeals} deal${convertedDeals > 1 ? 's' : ''} moved to pending! ${bToA} B→A promotions. Burnout +${actualBurnout}.${diceRoll ? ` 🎲 Rolled ${diceRoll}.` : ''}`
          : `Pipeline work: appointments set, ${bToA} B→A promotions. No closings yet. Burnout +${actualBurnout}.${diceRoll ? ` 🎲 Rolled ${diceRoll}.` : ''}`,
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
        actionPoints: newState.actionPoints - 1 + hustleBonus,
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
  deck: string[],
  diceRoll?: number
): { newState: GameState; newDeck: string[]; roundSummary: string[] } {
  let s = { ...state };
  const summary: string[] = [];
  let newDeck = deck;

  // Apply end-turn dice roll effect
  if (diceRoll !== undefined) {
    s.lastDiceRoll = diceRoll;
    if (diceRoll === 6) {
      s.pendingDeals = s.pendingDeals + 1;
      summary.push(`🎲 Rolled a 6 — bonus deal enters pending!`);
    } else if (diceRoll === 2) {
      const slip = Math.min(1, s.pendingDeals);
      s.pendingDeals = Math.max(0, s.pendingDeals - slip);
      s.tierA = s.tierA + slip;
      if (slip > 0) summary.push(`🎲 Rolled a 2 — one deal slipped back to A-tier.`);
    } else if (diceRoll === 1) {
      const lost = Math.min(1, s.pendingDeals);
      s.pendingDeals = Math.max(0, s.pendingDeals - lost);
      if (lost > 0) summary.push(`🎲 Rolled a 1 — one pending deal fell through entirely!`);
    }
  }

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
  const cityConfig = CITY_CONFIGS[s.city] ?? CITY_CONFIGS['kansas-city'];
  const cardsPerRound = cityConfig.cardsPerRound ?? 2;
  const { drawn, remaining } = drawCardsFromDeck(newDeck, cardsPerRound);
  newDeck = remaining;
  s.drawnCards = drawn.map((id) => ({ card: getCardById(id, s.city), revealed: false }));
  s.currentCardIndex = 0;
  s.phase = s.gameOver ? 'game-over' : s.pendingLevelUp ? 'level-up' : 'card-draw';

  // 17. Reset action points for next turn
  s.actionPoints = s.maxActionPoints;
  s.roundLog = summary;

  return { newState: s, newDeck, roundSummary: summary };
}

// ── Card effect application ────────────────────────────────────────────

export function applyCardEffect(state: GameState, effect: CardEffect, diceRoll?: number): GameState {
  let s = { ...state };

  // Apply dice multiplier to card effects
  const isVictory = !!(effect.addCash && effect.addCash > 0) || !!(effect.addTierA && effect.addTierA > 0) || !!(effect.addPendingDeals && effect.addPendingDeals > 0);
  let mult = 1.0;
  if (diceRoll) {
    if (isVictory) {
      mult = diceRoll === 6 ? 1.3 : diceRoll === 5 ? 1.1 : diceRoll === 2 ? 0.9 : diceRoll === 1 ? 0.7 : 1.0;
    } else {
      // Trap cards — high roll softens, low roll amplifies
      mult = diceRoll === 6 ? 0.6 : diceRoll === 5 ? 0.8 : diceRoll === 2 ? 1.1 : diceRoll === 1 ? 1.4 : 1.0;
    }
    s.lastDiceRoll = diceRoll;
  }

  if (effect.addTierA) s.tierA = Math.max(0, s.tierA + Math.round(effect.addTierA * (effect.addTierA > 0 ? mult : 1)));
  if (effect.addTierB) s.tierB = Math.max(0, s.tierB + Math.round(effect.addTierB * (effect.addTierB > 0 ? mult : 1)));
  if (effect.addTierC) {
    const delta = Math.round(effect.addTierC * (effect.addTierC > 0 ? mult : 1));
    s.tierC = Math.max(0, s.tierC + delta);
    if (delta > 0) s.databaseSize = s.databaseSize + delta;
  }
  if (effect.addCash) s.cash = s.cash + Math.round(effect.addCash * (effect.addCash > 0 ? mult : 1));
  if (effect.addPendingDeals) s.pendingDeals = Math.max(0, s.pendingDeals + Math.round(effect.addPendingDeals * (effect.addPendingDeals > 0 ? mult : 1)));
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

const SAVE_KEY = 'agent-game-state-v2';
const DECK_KEY = 'agent-game-deck-v2';

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

export function initDeck(city?: CityId): string[] {
  return buildWeightedDeck(city);
}

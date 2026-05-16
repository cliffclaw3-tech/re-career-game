/**
 * AGENT — A Real Estate Career Game
 * Core type definitions for the game engine.
 *
 * Financial math sourced from business-plan.ts (Wes's authentic economic model):
 *   - 29.2% Cost of Sales (brokerage splits, referral fees, closing costs)
 *   - 29.2% Operating Expenses (marketing, office, tools, overhead)
 *   - 41.6% Net Margin
 *   - 33 database contacts = 1 closed deal per year (industry rule of thumb)
 *   - Pipeline tiers: C→B 50%, B→A 65%, A→Close 85%
 *   - Avg sales price: $285K, Avg commission: 3% = $8,550 GCI/deal
 */

export type GamePhase =
  | 'start'        // title screen
  | 'setup'        // player name entry
  | 'action'       // spending action points
  | 'card-draw'    // drawing 2 event cards
  | 'resolving'    // showing card effects
  | 'end-round'    // auto-processing end of quarter
  | 'level-up'     // celebration screen when advancing
  | 'game-over';   // win or lose

export type GameLevel = 1 | 2 | 3 | 4;

export type Quarter = 1 | 2 | 3 | 4;

export type CardType = 'lead' | 'market-event' | 'opportunity' | 'trap';

export type ActionType =
  | 'prospect-sphere'
  | 'cold-prospect'
  | 'work-pipeline'
  | 'marketing-roulette'
  | 'rest'
  | 'hire-assistant'
  | 'hire-buyer-agent'
  | 'buy-rental'
  | 'toggle-tax-reserve'
  | 'end-turn';

// ── Character types ──────────────────────────────────────────────────────

export interface CharacterConfig {
  gender: 'male' | 'female';
  age: 'young' | 'mid' | 'veteran';
  outfit: 'formal' | 'casual' | 'hustle';
}

// ── City types ───────────────────────────────────────────────────────────

export type CityId = 'kansas-city' | 'detroit' | 'las-vegas' | 'beverly-hills' | 'new-york';

export interface CityConfig {
  id: CityId;
  name: string;
  emoji: string;
  difficulty: number; // 1-5 stars
  tagline: string;
  avgDealGCI: number;
  easyStreetMonthlyExpenses: number;
  year1GCITarget: number;
  annualGCIEasyStreet: number;
  tierCToB: number;
  tierBToA: number;
  tierAToClose: number;
  eventFrequency: 'low' | 'medium' | 'high' | 'volatile';
  cardsPerRound: number;
  marketMultiplierMin: number;
  marketMultiplierMax: number;
  accentColor: string;   // tailwind class for border/text
  tags: string[];
}

export const CITY_CONFIGS: Record<CityId, CityConfig> = {
  'kansas-city': {
    id: 'kansas-city',
    name: 'Kansas City',
    emoji: '🌾',
    difficulty: 2,
    tagline: 'Steady volume. Builder relationships. Long game.',
    avgDealGCI: 8550,
    easyStreetMonthlyExpenses: 4000,
    year1GCITarget: 30000,
    annualGCIEasyStreet: 80000,
    tierCToB: 0.50,
    tierBToA: 0.65,
    tierAToClose: 0.85,
    eventFrequency: 'low',
    cardsPerRound: 2,
    marketMultiplierMin: 0.85,
    marketMultiplierMax: 1.20,
    accentColor: 'text-green-400 border-green-500/40',
    tags: ['Builder referrals', 'Stable market', 'Community-driven'],
  },
  'detroit': {
    id: 'detroit',
    name: 'Detroit',
    emoji: '🔧',
    difficulty: 3,
    tagline: 'Distressed. Title chaos. Investor competition.',
    avgDealGCI: 6000,
    easyStreetMonthlyExpenses: 3500,
    year1GCITarget: 25000,
    annualGCIEasyStreet: 70000,
    tierCToB: 0.50,
    tierBToA: 0.65,
    tierAToClose: 0.85,
    eventFrequency: 'medium',
    cardsPerRound: 2,
    marketMultiplierMin: 0.60,
    marketMultiplierMax: 1.25,
    accentColor: 'text-orange-400 border-orange-500/40',
    tags: ['Title issues', 'Investor buyers', 'Portfolio deals'],
  },
  'las-vegas': {
    id: 'las-vegas',
    name: 'Las Vegas',
    emoji: '🎰',
    difficulty: 4,
    tagline: 'Boom. Bust. Repeat. Out-of-state everything.',
    avgDealGCI: 12000,
    easyStreetMonthlyExpenses: 6000,
    year1GCITarget: 40000,
    annualGCIEasyStreet: 100000,
    tierCToB: 0.50,
    tierBToA: 0.65,
    tierAToClose: 0.85,
    eventFrequency: 'volatile',
    cardsPerRound: 2,
    marketMultiplierMin: 0.50,
    marketMultiplierMax: 1.60,
    accentColor: 'text-purple-400 border-purple-500/40',
    tags: ['Volatile market', 'Out-of-state buyers', 'High risk/reward'],
  },
  'beverly-hills': {
    id: 'beverly-hills',
    name: 'Beverly Hills',
    emoji: '💎',
    difficulty: 4,
    tagline: 'Off-market. Celebrity buyers. Perfection expected.',
    avgDealGCI: 45000,
    easyStreetMonthlyExpenses: 10000,
    year1GCITarget: 80000,
    annualGCIEasyStreet: 200000,
    tierCToB: 0.50,
    tierBToA: 0.65,
    tierAToClose: 0.85,
    eventFrequency: 'medium',
    cardsPerRound: 2,
    marketMultiplierMin: 0.80,
    marketMultiplierMax: 1.35,
    accentColor: 'text-pink-400 border-pink-500/40',
    tags: ['Off-market deals', 'Celebrity clients', 'Ultra-luxury'],
  },
  'new-york': {
    id: 'new-york',
    name: 'New York',
    emoji: '🗽',
    difficulty: 5,
    tagline: 'Co-op boards. Bidding wars. No mercy.',
    avgDealGCI: 38000,
    easyStreetMonthlyExpenses: 8000,
    year1GCITarget: 70000,
    annualGCIEasyStreet: 180000,
    tierCToB: 0.40,
    tierBToA: 0.55,
    tierAToClose: 0.80,
    eventFrequency: 'high',
    cardsPerRound: 3,
    marketMultiplierMin: 0.70,
    marketMultiplierMax: 1.40,
    accentColor: 'text-sky-400 border-sky-500/40',
    tags: ['Co-op boards', 'Bidding wars', 'Expert mode'],
  },
};

export interface CardEffect {
  // Pipeline changes
  addTierA?: number;
  addTierB?: number;
  addTierC?: number;

  // Financial
  addCash?: number;
  addPendingDeals?: number;
  addPassiveIncomeMonthly?: number;

  // Meters
  burnoutDelta?: number;

  // Market modifier (multiplies deal income for N rounds)
  marketMultiplier?: number;
  marketMultiplierRounds?: number;

  // Tax trap
  taxBill?: number; // % of GCI this year (e.g., 0.30 = 30%)
  taxBillFlat?: number; // flat $ amount

  // Special
  loseCurrentPendingDeals?: boolean;
  gainFreeDeal?: boolean;

  // Narrative
  message: string;
}

export interface CardDef {
  id: string;
  name: string;
  type: CardType;
  emoji: string;
  description: string;
  flavorText?: string;
  effect: CardEffect;
  /** Relative draw weight — higher = drawn more often */
  weight: number;
}

export interface ResolvedCard {
  card: CardDef;
  revealed: boolean;
}

export interface GameState {
  // ── Meta ─────────────────────────────────────────────
  playerName: string;
  characterGender: 'male' | 'female';
  characterAge: 'young' | 'mid' | 'veteran';
  characterOutfit: 'formal' | 'casual' | 'hustle';
  city: CityId;

  // ── Dice ──────────────────────────────────────────────
  lastDiceRoll: number | null;

  // ── Time ─────────────────────────────────────────────
  round: number;     // 1–32 (8 years × 4 quarters)
  year: number;      // 1–8
  quarter: Quarter;  // 1–4
  phase: GamePhase;

  // ── Career Level ──────────────────────────────────────
  level: GameLevel;

  // ── Financials ────────────────────────────────────────
  cash: number;                   // savings / checking
  gciThisYear: number;           // GCI earned in current year
  gciAllTime: number;
  netIncomeThisYear: number;     // after expenses
  netIncomeAllTime: number;
  taxReserveEnabled: boolean;    // player toggled this on/off
  taxReserve: number;            // bucket of money set aside for IRS
  taxTrapFired: boolean;         // has the year-end tax trap hit?

  // ── Pipeline (authentic A/B/C tier model) ─────────────
  databaseSize: number;          // total C+B contacts in database
  tierA: number;                 // hot prospects (0–30 days)
  tierB: number;                 // warm (31–90 days)
  tierC: number;                 // cool (91+ days, sphere, past clients)
  pendingDeals: number;          // deals in contract, close next quarter

  // ── Meters ────────────────────────────────────────────
  burnoutMeter: number;          // 0–100
  burnoutWarnings: number;       // times crossed 80+

  // ── Team ──────────────────────────────────────────────
  hasAssistant: boolean;
  buyerAgents: number;           // 0–4

  // ── Passive Income ────────────────────────────────────
  rentalProperties: number;
  passiveIncomeMonthly: number;  // current passive income/month
  monthlyPersonalExpenses: number; // Easy Street bar: win when passive > this

  // ── Market ────────────────────────────────────────────
  marketMultiplier: number;      // 1.0 = normal, 0.7 = recession, 1.3 = hot
  marketMultiplierRoundsLeft: number;

  // ── Action Points ─────────────────────────────────────
  actionPoints: number;          // AP remaining this turn
  maxActionPoints: number;       // 3 standard

  // ── Cards ─────────────────────────────────────────────
  drawnCards: ResolvedCard[];    // cards drawn this round (2 per round)
  currentCardIndex: number;      // which card is being resolved

  // ── Event Log ─────────────────────────────────────────
  log: LogEntry[];
  roundLog: string[];            // what happened this round (cleared each round)

  // ── Win/Lose ──────────────────────────────────────────
  hitEasyStreet: boolean;
  gameOver: boolean;
  won: boolean;
  gameOverReason: string;

  // ── Level-up gate ─────────────────────────────────────
  pendingLevelUp: boolean;
  pendingLevelUpTo: GameLevel | null;
}

export interface LogEntry {
  round: number;
  text: string;
  type: 'info' | 'good' | 'bad' | 'milestone';
}

// ── Game Constants (from authentic financial model) ────────────────────

export const GAME_CONSTANTS = {
  /** Cost of sales as % of GCI — brokerage split, referral fees, closings */
  COST_OF_SALES_PCT: 0.292,
  /** Operating expenses as % of GCI — marketing, office, tools, overhead */
  OPERATING_EXPENSE_PCT: 0.292,
  /** Net margin after both cost buckets */
  NET_MARGIN: 1 - 0.292 - 0.292,  // 0.416

  /** Avg Tri-Cities TN sales price */
  AVG_SALES_PRICE: 285000,
  /** Industry avg gross commission rate */
  AVG_COMMISSION_RATE: 0.03,
  /** GCI per closed deal */
  GCI_PER_DEAL: Math.round(285000 * 0.03), // $8,550

  /** Net income per deal after full expense structure */
  NET_PER_DEAL: Math.round(285000 * 0.03 * (1 - 0.292 - 0.292)), // $3,557

  /** Pipeline tier conversion rates (authentic from Wes's broker model) */
  TIER_C_TO_B: 0.50,
  TIER_B_TO_A: 0.65,
  TIER_A_TO_CLOSE: 0.85,

  /** Database ratio: industry rule of thumb from KW model */
  CONTACTS_PER_DEAL_PER_YEAR: 33,

  /** Monthly personal expenses (Easy Street bar) */
  MONTHLY_PERSONAL_EXPENSES: 5000,

  /** Tax reserve recommendation */
  RECOMMENDED_TAX_RESERVE_PCT: 0.30,

  /** Burnout danger threshold */
  BURNOUT_DANGER: 80,

  /** Max rounds = 8 years × 4 quarters */
  MAX_ROUNDS: 32,
} as const;

export const LEVEL_LABELS: Record<GameLevel, string> = {
  1: 'Solo Agent',
  2: 'Team Lead',
  3: 'Rainmaker',
  4: 'Investor',
};

export const LEVEL_DESCRIPTIONS: Record<GameLevel, string> = {
  1: 'Day 1 license. Build your database. Survive Year 1.',
  2: 'First hire. Learn to delegate. Scale without burning out.',
  3: 'Full team. Systematized. You build the business, not work it.',
  4: 'Passive income. Real estate portfolio. Path to Easy Street.',
};

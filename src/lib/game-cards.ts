/**
 * AGENT — A Real Estate Career Game
 * Card definitions — the randomness engine.
 *
 * Categories (authentic industry scenarios):
 *   Lead Cards      → positive pipeline additions
 *   Market Events   → changes to market conditions
 *   Opportunity     → special one-time options
 *   Trap Cards      → consequences of real mistakes agents make
 */

import type { CardDef } from './game-types';
import { CITY_CARDS } from './city-cards';

export const CARDS: CardDef[] = [
  // ══════════════════════════════════════════════════
  // LEAD CARDS — Pipeline builders (positive)
  // ══════════════════════════════════════════════════

  {
    id: 'lead-buyer-first-time',
    name: 'First-Time Buyer',
    type: 'lead',
    emoji: '🏠',
    description: 'A young couple just got pre-approved. They found you through a friend.',
    flavorText: '"We\'ve been saving for three years. We\'re ready."',
    effect: {
      addTierB: 1,
      burnoutDelta: -2,
      message: 'A first-time buyer referral joins your pipeline at B-tier. They\'re motivated.',
    },
    weight: 10,
  },
  {
    id: 'lead-seller-upgrade',
    name: 'Move-Up Seller',
    type: 'lead',
    emoji: '📦',
    description: 'A past client\'s family grew. They need more space. Listing + buy-side opportunity.',
    flavorText: '"The kids need their own rooms. We\'re finally ready to upgrade."',
    effect: {
      addTierA: 1,
      addTierB: 1,
      message: 'A move-up seller — hot A-tier listing AND a likely buy-side referral. Work both sides.',
    },
    weight: 6,
  },
  {
    id: 'lead-expired',
    name: 'Expired Listing Call',
    type: 'lead',
    emoji: '📵',
    description: 'You called an expired listing at 7:50am Tuesday. They fired their last agent.',
    flavorText: '"The last agent didn\'t do anything. We need someone who actually works."',
    effect: {
      addTierA: 1,
      burnoutDelta: 3,
      message: 'Expired listing in your pipeline at A-tier. Motivated seller — they want this done.',
    },
    weight: 7,
  },
  {
    id: 'lead-fsbo',
    name: 'FSBO Convert',
    type: 'lead',
    emoji: '🪧',
    description: 'You stopped at a For Sale By Owner sign. They\'ve been trying for 6 weeks. Tired.',
    flavorText: '"We thought we could do it ourselves. We were wrong."',
    effect: {
      addTierA: 1,
      message: 'FSBO converted to A-tier. They were pre-qualified by their own failed effort.',
    },
    weight: 6,
  },
  {
    id: 'lead-referral-hot',
    name: 'Hot Referral',
    type: 'lead',
    emoji: '🔥',
    description: 'A past client sent their boss directly to you. "Just call Wes, tell him I sent you."',
    flavorText: 'Referrals close at 2x the rate of cold leads. Trust is pre-installed.',
    effect: {
      addTierA: 1,
      addTierC: 2,
      burnoutDelta: -5,
      message: 'Hot referral lands at A-tier + 2 new C-tier sphere contacts. Referral energy is contagious.',
    },
    weight: 7,
  },
  {
    id: 'lead-sphere-call',
    name: 'Sphere Activation',
    type: 'lead',
    emoji: '📞',
    description: 'Your morning call block paid off. Three database contacts moved up.',
    flavorText: '"I\'m so glad you called — we were just talking about selling."',
    effect: {
      addTierB: 2,
      addTierA: 1,
      burnoutDelta: 5,
      message: 'Sphere call block: 3 contacts promoted (2 → B-tier, 1 → A-tier). This is the job.',
    },
    weight: 9,
  },
  {
    id: 'lead-open-house',
    name: 'Open House Gold',
    type: 'lead',
    emoji: '🏡',
    description: 'Packed open house. Five sign-ins, two pre-approved buyers walked through.',
    flavorText: 'Open houses aren\'t for selling the home. They\'re for filling your pipeline.',
    effect: {
      addTierB: 2,
      addTierC: 3,
      burnoutDelta: 8,
      message: 'Open house haul: 2 B-tier buyers + 3 new C-tier contacts. Cost you a Sunday.',
    },
    weight: 8,
  },
  {
    id: 'lead-past-client',
    name: 'Past Client Repeat',
    type: 'lead',
    emoji: '🤝',
    description: 'A client from two years ago is back. They\'re moving again — and sending friends.',
    flavorText: 'This is why you stay in touch. Database = recurring income.',
    effect: {
      addTierA: 1,
      addTierB: 1,
      addTierC: 2,
      burnoutDelta: -5,
      message: 'Past client repeat: 1 A-tier deal + 3 referrals in the funnel. Database ROI.',
    },
    weight: 8,
  },
  {
    id: 'lead-relocation',
    name: 'Relocation Buyer',
    type: 'lead',
    emoji: '✈️',
    description: 'A company transferred an executive to the area. They need to buy fast.',
    flavorText: '"We have 60 days before the job starts. Let\'s move."',
    effect: {
      addTierA: 1,
      addPendingDeals: 1,
      message: 'Relocation buyer: motivated, timeline-driven, A-tier. One deal already in the pipeline.',
    },
    weight: 4,
  },
  {
    id: 'lead-investor',
    name: 'Investor Buyer',
    type: 'lead',
    emoji: '💰',
    description: 'A local investor wants to buy 2-3 properties this year. Repeat business.',
    flavorText: 'Investor clients are low-emotion, high-volume. Close one, they send more.',
    effect: {
      addTierB: 1,
      addTierC: 3,
      message: 'Investor buyer: B-tier with 3 additional sphere contacts from their network.',
    },
    weight: 5,
  },

  // ══════════════════════════════════════════════════
  // MARKET EVENT CARDS
  // ══════════════════════════════════════════════════

  {
    id: 'market-rate-drop',
    name: 'Interest Rate Drop',
    type: 'market-event',
    emoji: '📉',
    description: 'The Fed dropped rates 0.5%. Your phone is ringing off the hook.',
    flavorText: 'Rate drops unlock buyers who were sitting on the fence. Every month of the fence.',
    effect: {
      addTierB: 3,
      marketMultiplier: 1.25,
      marketMultiplierRounds: 2,
      burnoutDelta: 10,
      message: 'Rate drop: 3 new B-tier buyers + 25% market boost for 2 quarters. Busy season ahead.',
    },
    weight: 4,
  },
  {
    id: 'market-rate-spike',
    name: 'Rate Spike',
    type: 'market-event',
    emoji: '📈',
    description: 'Mortgage rates jumped 1.25% in six weeks. Buyers are spooked.',
    flavorText: '"We\'re going to wait and see." Agents who built their database don\'t panic.',
    effect: {
      marketMultiplier: 0.75,
      marketMultiplierRounds: 2,
      addTierB: -1,
      burnoutDelta: 8,
      message: 'Rate spike: market cools 25% for 2 quarters. Some buyers retreated. Work your sellers.',
    },
    weight: 4,
  },
  {
    id: 'market-hot',
    name: 'Hot Market',
    type: 'market-event',
    emoji: '🌡️',
    description: 'Everything is going over asking. Multiple offers on every listing. Sellers are ecstatic.',
    flavorText: 'A hot market makes everyone look smart. But only the ones who built database survive the correction.',
    effect: {
      marketMultiplier: 1.35,
      marketMultiplierRounds: 3,
      addTierB: 2,
      addTierC: 4,
      burnoutDelta: 12,
      message: 'Hot market: 35% income boost for 3 quarters + pipeline surge. Don\'t burn out.',
    },
    weight: 3,
  },
  {
    id: 'market-inventory-shortage',
    name: 'Inventory Shortage',
    type: 'market-event',
    emoji: '🏚️',
    description: 'Nothing to list. Buyers are frustrated. But sellers who DO list get 110% of ask.',
    flavorText: 'Listings are gold in a seller\'s market. Go find them.',
    effect: {
      addTierA: 2,
      marketMultiplier: 1.15,
      marketMultiplierRounds: 2,
      message: 'Inventory shortage: your 2 new A-tier listings will get top dollar. Market lifts 15%.',
    },
    weight: 5,
  },
  {
    id: 'market-spring-surge',
    name: 'Spring Market Surge',
    type: 'market-event',
    emoji: '🌸',
    description: 'May is the best month in real estate. Your pipeline is converting.',
    flavorText: 'Wes\'s data: May = 12% of annual GCI. Spring is when you cash the prospecting checks you wrote in January.',
    effect: {
      addPendingDeals: 2,
      marketMultiplier: 1.2,
      marketMultiplierRounds: 1,
      burnoutDelta: -5,
      message: 'Spring surge: 2 free pending deals + 20% market lift. This is what you built the database for.',
    },
    weight: 5,
  },
  {
    id: 'market-recession-scare',
    name: 'Recession Scare',
    type: 'market-event',
    emoji: '📰',
    description: 'National headlines are panicking. Locally, motivated sellers are still selling.',
    flavorText: 'People always need to move. Divorce, death, debt. Market corrections separate pros from tourists.',
    effect: {
      marketMultiplier: 0.80,
      marketMultiplierRounds: 3,
      addTierA: 1,
      burnoutDelta: 10,
      message: 'Recession scare: market down 20% for 3 quarters. Motivated sellers still move — work them.',
    },
    weight: 3,
  },
  {
    id: 'market-new-construction',
    name: 'New Construction Boom',
    type: 'market-event',
    emoji: '🏗️',
    description: 'A major builder broke ground on 200 lots. Builder clients want a buyer\'s agent.',
    flavorText: 'New construction relationships are long-term leads.',
    effect: {
      addTierB: 3,
      addTierC: 5,
      burnoutDelta: 5,
      message: 'New construction: 3 B-tier buyer leads + 5 C-tier prospects from the builder referral.',
    },
    weight: 4,
  },
  {
    id: 'market-seller-panic',
    name: 'Seller\'s Market Ends',
    type: 'market-event',
    emoji: '😬',
    description: 'Sellers who waited too long are panic-listing. Some won\'t like the price reality.',
    flavorText: 'When the market turns, the agents who tell the truth get the business.',
    effect: {
      addTierA: 2,
      marketMultiplier: 0.90,
      marketMultiplierRounds: 2,
      message: 'Market shift: 2 motivated A-tier sellers ready to be realistic on price. Market dips 10%.',
    },
    weight: 4,
  },

  // ══════════════════════════════════════════════════
  // OPPORTUNITY CARDS
  // ══════════════════════════════════════════════════

  {
    id: 'opp-referral-partner',
    name: 'Referral Partner',
    type: 'opportunity',
    emoji: '🤲',
    description: 'A local lender wants to send you all their pre-approved buyers. Monthly coffee.',
    flavorText: 'One strategic referral relationship can change your whole production.',
    effect: {
      addTierB: 2,
      addTierC: 8,
      burnoutDelta: -3,
      message: 'Lender partnership: 2 immediate B-tier leads + 8 C-tier pipeline. Relationship = leverage.',
    },
    weight: 4,
  },
  {
    id: 'opp-coaching-boost',
    name: 'Coaching Breakthrough',
    type: 'opportunity',
    emoji: '🎯',
    description: 'Your coach identified a conversion leak. You closed it. Appointments → deals.',
    flavorText: '"The gap between where you are and where you want to be is the gap in what you\'re willing to learn."',
    effect: {
      addPendingDeals: 1,
      addTierA: 1,
      burnoutDelta: -10,
      message: 'Coaching ROI: 1 deal converted from stuck + 1 A-tier promotion. Skills compound.',
    },
    weight: 4,
  },
  {
    id: 'opp-viral-listing',
    name: 'Viral Listing',
    type: 'opportunity',
    emoji: '📲',
    description: 'Your listing video got 40K views. Three buyers called asking about the property.',
    flavorText: 'Content does the prospecting while you sleep. Build the habit.',
    effect: {
      addTierB: 3,
      addTierC: 6,
      burnoutDelta: -5,
      message: 'Viral listing: 3 B-tier buyers + 6 C-tier sphere follows. Your database just grew for free.',
    },
    weight: 3,
  },
  {
    id: 'opp-neighborhood-expert',
    name: 'Neighborhood Expert',
    type: 'opportunity',
    emoji: '🗺️',
    description: 'You\'ve been door-knocking one neighborhood consistently. You\'re the name they know.',
    flavorText: 'Dominate one zip code before you try to own the whole city.',
    effect: {
      addTierC: 12,
      addTierB: 2,
      burnoutDelta: 8,
      message: 'Neighborhood dominance: 12 new C-tier contacts + 2 warm B-tier prospects. Farm is paying.',
    },
    weight: 4,
  },
  {
    id: 'opp-team-synergy',
    name: 'Team Synergy',
    type: 'opportunity',
    emoji: '⚡',
    description: 'Your buyer\'s agent closed 2 deals you never touched. Systems are working.',
    flavorText: 'This is the point of building a team: income that doesn\'t require you.',
    effect: {
      addCash: 8000,
      burnoutDelta: -15,
      message: 'Team synergy: $8,000 GCI from your buyer\'s agent\'s deals — you did zero of the work.',
    },
    weight: 3,
  },
  {
    id: 'opp-investor-portfolio',
    name: 'Investor Package Deal',
    type: 'opportunity',
    emoji: '📋',
    description: 'An investor client wants to buy a 4-unit rental. You\'re their agent.',
    flavorText: 'Multi-family deals take the same time as a single home. The check is bigger.',
    effect: {
      addPendingDeals: 1,
      addCash: 6000,
      message: 'Investor closes on a 4-unit. Big commission + a loyal client for life.',
    },
    weight: 3,
  },
  {
    id: 'opp-database-windfall',
    name: 'Community Event Haul',
    type: 'opportunity',
    emoji: '🎉',
    description: 'You hosted a client appreciation event. 30 new contacts in one evening.',
    flavorText: 'One event can do what 6 weeks of cold calling can\'t: relationship at scale.',
    effect: {
      addTierC: 18,
      addTierB: 4,
      burnoutDelta: 10,
      message: 'Community event ROI: 18 C-tier + 4 B-tier contacts. That\'s almost 1 future deal at 33:1.',
    },
    weight: 3,
  },
  {
    id: 'opp-past-client-referral-wave',
    name: 'Referral Wave',
    type: 'opportunity',
    emoji: '🌊',
    description: 'Your past-client appreciation campaign hit. Four referrals in two weeks.',
    flavorText: 'Consistent past-client care is the highest-ROI marketing in real estate.',
    effect: {
      addTierA: 2,
      addTierB: 2,
      burnoutDelta: -8,
      message: 'Referral wave: 2 A-tier + 2 B-tier leads. This is what database ROI looks like.',
    },
    weight: 4,
  },

  // ══════════════════════════════════════════════════
  // TRAP CARDS — The lessons
  // ══════════════════════════════════════════════════

  {
    id: 'trap-tax-bill',
    name: 'IRS Estimated Tax Bill',
    type: 'trap',
    emoji: '😱',
    description: 'Q4. The IRS wants their estimated taxes. Did you set aside 30%?',
    flavorText: 'The IRS doesn\'t care that you had a slow quarter. They calculate on gross, not feelings.',
    effect: {
      taxBill: 0.30,
      burnoutDelta: 15,
      message: 'Tax bill hits. If you set aside 30%, it\'s covered. If not — it comes out of cash.',
    },
    weight: 6,
  },
  {
    id: 'trap-deal-falls-through',
    name: 'Deal Falls Through',
    type: 'trap',
    emoji: '💔',
    description: 'Financing fell through on a pending deal. 60 days of work. Gone.',
    flavorText: '"We tried everything. The appraisal just came in too low." This happens. Pipeline depth saves you.',
    effect: {
      addPendingDeals: -1,
      burnoutDelta: 18,
      message: 'Deal fell through. Lost pending income. Burnout hit. Thin pipelines make this devastating.',
    },
    weight: 7,
  },
  {
    id: 'trap-marketing-waste',
    name: 'Paid Lead Platform Fail',
    type: 'trap',
    emoji: '💸',
    description: 'You spent $2,000 on portal leads. Zero closed. One responded.',
    flavorText: 'Marketing Roulette: paid leads have a 0–2x ROI range. Most land closer to 0.',
    effect: {
      addCash: -2000,
      addTierC: 1,
      burnoutDelta: 12,
      message: 'Paid lead waste: $2,000 gone, 1 cold C-tier contact. ROI = terrible. Track everything.',
    },
    weight: 6,
  },
  {
    id: 'trap-slow-market',
    name: 'Dead Zone Quarter',
    type: 'trap',
    emoji: '🌑',
    description: 'January. Zero closings. Zero showings. Nothing is moving.',
    flavorText: 'January is 4% of the annual goal, not 8.3%. It\'s supposed to be quiet. But you still prospect.',
    effect: {
      marketMultiplier: 0.60,
      marketMultiplierRounds: 1,
      addTierB: -1,
      burnoutDelta: 15,
      message: 'Dead zone: market at 60% for 1 quarter. Don\'t make decisions based on January.',
    },
    weight: 5,
  },
  {
    id: 'trap-burnout-event',
    name: 'Burnout Event',
    type: 'trap',
    emoji: '🔥',
    description: 'You can\'t get out of bed. Your follow-up is three weeks late. The pipeline is leaking.',
    flavorText: 'This is what happens when you run 90% capacity with no systems and no team.',
    effect: {
      burnoutDelta: 25,
      addTierB: -2,
      message: 'Burnout event: +25 burnout, 2 B-tier leads fell off from no follow-up. Hire someone.',
    },
    weight: 5,
  },
  {
    id: 'trap-lawsuit-scare',
    name: 'Legal Dispute',
    type: 'trap',
    emoji: '⚖️',
    description: 'A past buyer claims you didn\'t disclose something. E&O covers it — but barely.',
    flavorText: 'Real estate lawsuits rarely win but always cost time, money, and sleep.',
    effect: {
      addCash: -3500,
      burnoutDelta: 20,
      message: 'Legal dispute: $3,500 in E&O deductible + stress. Documentation and disclosure protect you.',
    },
    weight: 3,
  },
  {
    id: 'trap-bad-hire',
    name: 'Bad Team Hire',
    type: 'trap',
    emoji: '😤',
    description: 'Your new buyer\'s agent quit after 60 days. You\'re doing their pipeline clean-up.',
    flavorText: 'Hiring costs twice: once when you hire them and once when they leave. Screen hard.',
    effect: {
      burnoutDelta: 22,
      addCash: -2000,
      message: 'Failed hire: $2,000 onboarding loss + 22 burnout points. Better screening next time.',
    },
    weight: 3,
  },
  {
    id: 'trap-client-complaint',
    name: 'Angry Client',
    type: 'trap',
    emoji: '📢',
    description: 'A client is unhappy with communication. They\'re leaving a bad review.',
    flavorText: 'One unsatisfied client silently costs you 7 referrals. Systems fix this.',
    effect: {
      addTierC: -3,
      burnoutDelta: 12,
      message: 'Client complaint: lost 3 sphere contacts who heard about it. Build follow-up systems.',
    },
    weight: 4,
  },
  {
    id: 'trap-tech-failure',
    name: 'CRM Crash',
    type: 'trap',
    emoji: '💻',
    description: 'Your contact database corrupted. Three years of follow-up notes, gone.',
    flavorText: 'The agent who keeps their database in their head loses it when their head\'s not in the game.',
    effect: {
      addTierB: -3,
      addTierC: -8,
      burnoutDelta: 15,
      message: 'CRM crash: lost 3 B-tier + 8 C-tier contact records. Back up your database.',
    },
    weight: 3,
  },
  {
    id: 'trap-competition',
    name: 'New Agent Flood',
    type: 'trap',
    emoji: '👥',
    description: 'Your market just added 200 new licensed agents. Leads are more contested.',
    flavorText: 'When markets are hot, everyone becomes an agent. The ones who built database survive.',
    effect: {
      marketMultiplier: 0.88,
      marketMultiplierRounds: 2,
      burnoutDelta: 8,
      message: 'Market saturated: 200 new agents competing. Your database relationships are your moat.',
    },
    weight: 4,
  },
  {
    id: 'trap-price-reduction',
    name: 'Listing Price Reduction',
    type: 'trap',
    emoji: '🏷️',
    description: 'Your listing sat 45 days. The seller finally agreed to drop $20K.',
    flavorText: 'Overpriced listings cost you time, credibility, and carrying costs.',
    effect: {
      addCash: -1500,
      burnoutDelta: 10,
      message: 'Overpriced listing: $1,500 in additional carrying costs + burned time. Price right first.',
    },
    weight: 5,
  },
  {
    id: 'trap-no-cash-reserve',
    name: 'Cash Flow Crunch',
    type: 'trap',
    emoji: '💳',
    description: 'Three deals are pending but nothing has closed in 6 weeks. Bills are due.',
    flavorText: 'GCI is earned when the deal closes, not when it goes under contract. Cash flow is oxygen.',
    effect: {
      addCash: -3000,
      burnoutDelta: 18,
      message: 'Cash crunch: $3,000 of personal bills hit while pending deals haven\'t closed. Build reserves.',
    },
    weight: 5,
  },
];

/** Weighted shuffle — draw probability proportional to card weight */
export function buildWeightedDeck(city?: string): string[] {
  const deck: string[] = [];

  // 60% city cards, 40% universal if city provided
  if (city && CITY_CARDS[city as keyof typeof CITY_CARDS]) {
    const cityCards = CITY_CARDS[city as keyof typeof CITY_CARDS];
    // City cards pool (60% of deck)
    for (const card of cityCards) {
      for (let i = 0; i < card.weight; i++) {
        deck.push(card.id);
      }
    }
    // Universal cards pool (40% of deck) — scale weights down
    for (const card of CARDS) {
      const scaledWeight = Math.round(card.weight * 0.67);
      for (let i = 0; i < scaledWeight; i++) {
        deck.push(card.id);
      }
    }
  } else {
    for (const card of CARDS) {
      for (let i = 0; i < card.weight; i++) {
        deck.push(card.id);
      }
    }
  }

  return shuffleDeck(deck);
}

export function shuffleDeck(deck: string[]): string[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

export function getCardById(id: string, city?: string): CardDef {
  // Check city cards first
  if (city && CITY_CARDS[city as keyof typeof CITY_CARDS]) {
    const cityCards = CITY_CARDS[city as keyof typeof CITY_CARDS];
    const cityCard = cityCards.find((c) => c.id === id);
    if (cityCard) return cityCard;
  }
  const card = CARDS.find((c) => c.id === id);
  if (!card) {
    // Fallback: return a safe placeholder rather than throwing
    return {
      id,
      name: 'Market Event',
      type: 'market-event',
      emoji: '📊',
      description: 'Something happened in the market.',
      effect: { message: 'Market conditions shifted.' },
      weight: 1,
    };
  }
  return card;
}

export function drawCardsFromDeck(deck: string[], count: number, city?: string): { drawn: string[]; remaining: string[] } {
  if (deck.length < count) {
    // Rebuild deck if running low
    const newDeck = buildWeightedDeck(city);
    const combined = [...deck, ...newDeck];
    return { drawn: combined.slice(0, count), remaining: combined.slice(count) };
  }
  return { drawn: deck.slice(0, count), remaining: deck.slice(count) };
}

# AGENT — A Real Estate Career Game

> **Build your business. Build your life.**

A browser-based real estate agent career simulation. Like Cashflow 101 but for real estate agents. Players simulate a full agent career from Day 1 license to financial freedom ("Easy Street" — passive income exceeds monthly expenses).

---

## Launch Instructions

```bash
cd /Users/wes/projects/re-career-game
npm run dev
```

Open: **http://localhost:3700**

Production build:
```bash
npm run build
npm start
```

---

## What Was Built

### Game Loop

1. **Title Screen** → **Setup** (enter name) → **Action Phase** → **End Turn** → **Card Draw** → repeat
2. Every round = 1 quarter (3 months). 32 rounds = 8 years.
3. Win condition: Passive income ≥ $5,000/month (Easy Street).
4. Lose conditions: Cash < -$20,000 | Burnout = 100% | 8 years passed without winning.

### Four Career Levels

| Level | Name | Gate to Unlock |
|-------|------|----------------|
| 1 | Solo Agent | Starting level |
| 2 | Team Lead | 66+ contacts, $50K+ GCI/yr |
| 3 | Rainmaker | 165+ contacts, $120K+ GCI, assistant hired |
| 4 | Investor | 330+ contacts, $200K+ GCI, buyer agent on team |

### Actions Per Turn (3 AP standard, 4 with assistant)

- **Prospect — Sphere**: Call database, nurture pipeline. Low burnout, best ROI.
- **Cold Prospect**: Expireds, FSBOs, circle prospect. High burnout, hot leads.
- **Work Pipeline**: Convert A-tier prospects to pending deals.
- **Marketing Roulette**: Spend $2,000 on paid leads → 0–3 random result.
- **Rest**: Recover burnout.
- **Hire Assistant**: $5,000 setup, cuts burnout drain in half, +1 AP/round.
- **Hire Buyer's Agent**: $8,000, +40% deal production (Level 2+).
- **Buy Rental Property**: $25,000 down, $600–$1,000/mo passive income (Level 3+).

### Card Deck (42 unique cards, weighted draw)

- **Lead Cards** (10): First-time buyer, move-up seller, expired listing, FSBO, referral, open house, etc.
- **Market Event Cards** (8): Rate drop, rate spike, hot market, inventory shortage, spring surge, recession scare, etc.
- **Opportunity Cards** (8): Referral partner, coaching breakthrough, viral listing, neighborhood expert, team synergy, etc.
- **Trap Cards** (12): IRS tax bill, deal falls through, paid lead waste, slow market, burnout event, lawsuit, bad hire, etc.

---

## Authentic Financial Math

All numbers sourced directly from Wes's `business-plan.ts` and `agent-stat-sheet.ts`:

| Metric | Value | Source |
|--------|-------|--------|
| Avg sales price | $285,000 | Tri-Cities TN market |
| Avg commission | 3.0% | Industry standard |
| GCI per deal | $8,550 | $285K × 3% |
| Cost of Sales | 29.2% | KW economic model |
| Operating Expenses | 29.2% | KW economic model |
| Net margin | 41.6% | 1 - 0.292 - 0.292 |
| Net per deal | $3,557 | $8,550 × 41.6% |
| Database ratio | 33:1 | Industry rule (33 contacts → 1 deal/yr) |
| C→B conversion | 50% | Wes's 20-yr pipeline model |
| B→A conversion | 65% | Wes's 20-yr pipeline model |
| A→Close rate | 85% | Wes's 20-yr pipeline model |
| Tax reserve | 30% | Standard self-employment recommendation |

Seasonal weighting matches Wes's authentic Tri-Cities TN data:
- Q1 (Jan–Mar): 17% of annual GCI
- Q2 (Apr–Jun): 28% (spring peak)
- Q3 (Jul–Sep): 28%
- Q4 (Oct–Dec): 26%

---

## Technical Stack

- **Framework**: Next.js 16.2.2 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **State**: React useReducer + LocalStorage persistence
- **Mobile**: Mobile-first responsive, PWA manifest

### File Structure

```
src/
├── app/
│   ├── globals.css      # Dark theme, animations
│   ├── layout.tsx       # PWA metadata, Geist font
│   └── page.tsx         # Full game UI (all screens)
├── lib/
│   ├── game-types.ts    # Types, constants (authentic math)
│   ├── game-cards.ts    # 42 card definitions, weighted deck
│   └── game-engine.ts   # State machine, actions, round resolution
public/
└── manifest.json        # PWA manifest
```

---

## Trademark Safety

✅ Zero use of: MREA, Millionaire Real Estate Agent, Keller Williams, KW, Gary Keller.

All terminology is standard NAR/industry: GCI, pipeline, database, cost of sales, net income, A/B/C tiers, listing conversion, appointment conversion.

The financial constants are labeled as "industry standard" and sourced from the authentic business-plan.ts model which uses generic real estate economics, not any branded system.

---

## Core Failure Loops The Game Teaches

1. **No lead tracking → blind decisions** (database = your only safety net)
2. **Wrong marketing spend, no ROI** (Marketing Roulette trap card)
3. **Hiring too late → burnout** (Burnout Meter → forced hire or quit)
4. **No tax reserves → IRS wipes them out** (Q4 Tax Bill trap)
5. **Never investing in real estate → retire broke** (passive income = Easy Street path)

---

*Built for Wes Shields · The Online Agent · Johnson City, TN*

"use client";

import React, { useEffect, useReducer } from "react";
import {
  createInitialState,
  executeAction,
  resolveEndOfRound,
  applyCardEffect,
  applyLevelUp,
  saveGame,
  loadGame,
  clearSave,
  initDeck,
  LEVEL_GATES,
} from "@/lib/game-engine";
import { getCardById } from "@/lib/game-cards";
import type { GameState } from "@/lib/game-types";
import type { CardDef } from "@/lib/game-types";
import { GAME_CONSTANTS, LEVEL_LABELS, LEVEL_DESCRIPTIONS } from "@/lib/game-types";

// ── Game reducer ───────────────────────────────────────────────────────

type GameAction =
  | { type: "START"; playerName: string }
  | { type: "LOAD" }
  | { type: "ACTION"; actionType: string }
  | { type: "END_TURN" }
  | { type: "REVEAL_CARD" }
  | { type: "NEXT_CARD" }
  | { type: "LEVEL_UP_CONFIRM" }
  | { type: "RESTART" };

interface GameStore {
  state: GameState | null;
  deck: string[];
  setupName: string;
  isLoading: boolean;
}

function gameReducer(store: GameStore, action: GameAction): GameStore {
  switch (action.type) {
    case "START": {
      const state = createInitialState(action.playerName);
      const deck = initDeck();
      const drawnIds = deck.slice(0, 2);
      const remaining = deck.slice(2);
      const updatedState: GameState = {
        ...state,
        drawnCards: drawnIds.map((id) => ({
          card: getCardById(id),
          revealed: false,
        })),
        phase: "action",
      };
      saveGame(updatedState, remaining);
      return { ...store, state: updatedState, deck: remaining };
    }

    case "LOAD": {
      const saved = loadGame();
      if (saved) {
        return { ...store, state: saved.state, deck: saved.deck };
      }
      return store;
    }

    case "ACTION": {
      if (!store.state || store.state.actionPoints <= 0) return store;
      const { newState, result, newDeck } = executeAction(store.state, action.actionType, store.deck);

      // Add to log
      const logEntry = {
        round: store.state.round,
        text: result.message,
        type: result.type,
      };
      const updatedState = {
        ...newState,
        log: [...(newState.log || []), logEntry],
        roundLog: [...(newState.roundLog || []), result.message],
      };

      saveGame(updatedState, newDeck);
      return { ...store, state: updatedState, deck: newDeck };
    }

    case "END_TURN": {
      if (!store.state) return store;
      const { newState, newDeck, roundSummary } = resolveEndOfRound(store.state, store.deck);
      const logEntries = roundSummary.map((text) => ({
        round: store.state!.round,
        text,
        type: "info" as const,
      }));
      const finalState = {
        ...newState,
        log: [...(store.state.log || []), ...logEntries],
      };
      saveGame(finalState, newDeck);
      return { ...store, state: finalState, deck: newDeck };
    }

    case "REVEAL_CARD": {
      if (!store.state) return store;
      const cards = [...store.state.drawnCards];
      const idx = store.state.currentCardIndex;
      if (idx >= cards.length) return store;

      cards[idx] = { ...cards[idx], revealed: true };

      // Apply the card effect
      const effect = cards[idx].card.effect;
      let newState = applyCardEffect(store.state, effect);
      newState = {
        ...newState,
        drawnCards: cards,
        log: [
          ...(newState.log || []),
          {
            round: store.state.round,
            text: `[Card: ${cards[idx].card.name}] ${effect.message}`,
            type: cards[idx].card.type === "trap" ? "bad" : "good",
          },
        ],
      };

      saveGame(newState, store.deck);
      return { ...store, state: newState };
    }

    case "NEXT_CARD": {
      if (!store.state) return store;
      const nextIdx = store.state.currentCardIndex + 1;
      if (nextIdx >= store.state.drawnCards.length) {
        // All cards done → move to action phase
        const newState = { ...store.state, phase: "action" as const, currentCardIndex: 0 };
        saveGame(newState, store.deck);
        return { ...store, state: newState };
      }
      const newState = { ...store.state, currentCardIndex: nextIdx };
      saveGame(newState, store.deck);
      return { ...store, state: newState };
    }

    case "LEVEL_UP_CONFIRM": {
      if (!store.state) return store;
      const newState = applyLevelUp(store.state);
      saveGame(newState, store.deck);
      return { ...store, state: newState };
    }

    case "RESTART": {
      clearSave();
      return { ...store, state: null, deck: [], setupName: "" };
    }

    default:
      return store;
  }
}

// ── Utility functions ──────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function pct(n: number): string {
  return `${Math.round(n)}%`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

// ── Sub-components ─────────────────────────────────────────────────────

function BurnoutBar({ value }: { value: number }) {
  const color =
    value >= 80 ? "bg-red-500" : value >= 60 ? "bg-orange-400" : value >= 40 ? "bg-yellow-400" : "bg-emerald-500";
  return (
    <div className="relative h-3 w-full rounded-full bg-white/10 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${clamp(value, 0, 100)}%` }}
      />
    </div>
  );
}

function StatPill({
  label,
  value,
  sub,
  color = "text-white",
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex flex-col gap-0.5">
      <p className="text-[10px] text-white/40 uppercase tracking-wider">{label}</p>
      <p className={`text-base font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-white/30">{sub}</p>}
    </div>
  );
}

function PipelineTier({
  tier,
  count,
  label,
  color,
}: {
  tier: string;
  count: number;
  label: string;
  color: string;
}) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${color}`}>
      <span className="text-lg font-black">{tier}</span>
      <div className="flex-1">
        <p className="text-xs text-white/60">{label}</p>
      </div>
      <span className="text-xl font-bold tabular-nums">{count}</span>
    </div>
  );
}

function CardView({
  card,
  revealed,
  onReveal,
  onNext,
  isLast,
}: {
  card: CardDef;
  revealed: boolean;
  onReveal: () => void;
  onNext: () => void;
  isLast: boolean;
}) {
  const typeColors: Record<string, string> = {
    lead: "from-emerald-900/80 to-emerald-800/40 border-emerald-500/40",
    "market-event": "from-sky-900/80 to-sky-800/40 border-sky-500/40",
    opportunity: "from-violet-900/80 to-violet-800/40 border-violet-500/40",
    trap: "from-red-900/80 to-red-800/40 border-red-500/40",
  };
  const typeLabel: Record<string, string> = {
    lead: "LEAD",
    "market-event": "MARKET EVENT",
    opportunity: "OPPORTUNITY",
    trap: "TRAP",
  };

  const gradClass = typeColors[card.type] ?? "from-zinc-900/80 to-zinc-800/40 border-white/10";

  return (
    <div
      className={`relative rounded-2xl border bg-gradient-to-br ${gradClass} p-5 flex flex-col gap-3 shadow-xl transition-all duration-300`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-widest text-white/40">{typeLabel[card.type]}</span>
        <span className="text-3xl">{card.emoji}</span>
      </div>
      <h3 className="text-xl font-black text-white">{card.name}</h3>
      <p className="text-sm text-white/70">{card.description}</p>

      {card.flavorText && (
        <p className="text-xs italic text-white/40 border-l-2 border-white/20 pl-3">{card.flavorText}</p>
      )}

      {!revealed ? (
        <button
          type="button"
          onClick={onReveal}
          className="mt-2 w-full rounded-xl bg-white text-black font-bold py-3 text-sm hover:bg-white/90 active:scale-95 transition-all"
        >
          Reveal Effect
        </button>
      ) : (
        <>
          <div className="rounded-xl bg-black/30 border border-white/10 p-3">
            <p className="text-sm text-white/80">{card.effect.message}</p>
          </div>
          <button
            type="button"
            onClick={onNext}
            className="mt-1 w-full rounded-xl bg-white/10 border border-white/20 text-white font-bold py-3 text-sm hover:bg-white/20 active:scale-95 transition-all"
          >
            {isLast ? "Continue →" : "Next Card →"}
          </button>
        </>
      )}
    </div>
  );
}

function ActionButton({
  label,
  emoji,
  subtitle,
  onClick,
  disabled,
  variant = "default",
}: {
  label: string;
  emoji: string;
  subtitle?: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "danger" | "highlight";
}) {
  const base =
    "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed";
  const variants = {
    default: "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20",
    danger: "bg-red-900/20 border-red-500/30 hover:bg-red-900/30",
    highlight: "bg-emerald-900/30 border-emerald-500/40 hover:bg-emerald-900/40",
  };

  return (
    <button className={`${base} ${variants[variant]}`} onClick={onClick} disabled={disabled}>
      <span className="text-2xl">{emoji}</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-white">{label}</p>
        {subtitle && <p className="text-xs text-white/40">{subtitle}</p>}
      </div>
    </button>
  );
}

// ── Main game screen ───────────────────────────────────────────────────

function GameScreen({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}) {
  const canAct = state.actionPoints > 0 && state.phase === "action";
  const hasCashForAssistant = state.cash >= 5000;
  const hasCashForAgent = state.cash >= 8000;
  const hasCashForRental = state.cash >= 25000;
  const hasCashForMarketing = state.cash >= 2000;

  const levelProgress = (() => {
    const next = state.level + 1;
    const gate = LEVEL_GATES[next];
    if (!gate) return null;
    const dbPct = Math.min(100, (state.databaseSize / gate.minDatabaseSize) * 100);
    const gciPct = Math.min(100, (state.gciThisYear / gate.minAnnualGCI) * 100);
    return { gate, dbPct, gciPct };
  })();

  const easyStreetPct = Math.min(
    100,
    (state.passiveIncomeMonthly / state.monthlyPersonalExpenses) * 100
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#031019] text-white">
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-[#031019]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">AGENT · {state.playerName}</p>
            <p className="text-sm font-bold">
              Year {state.year}, Q{state.quarter} ·{" "}
              <span className="text-yellow-400">{LEVEL_LABELS[state.level]}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Cash</p>
            <p className={`text-base font-black tabular-nums ${state.cash < 0 ? "text-red-400" : "text-emerald-400"}`}>
              {fmt(state.cash)}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full px-4 py-4 flex flex-col gap-5 pb-10">
        {/* ── AP Bar ── */}
        {state.phase === "action" && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-white/60 uppercase tracking-wide">Action Points</p>
              <p className="text-sm font-black text-white">
                {state.actionPoints} / {state.maxActionPoints} remaining
              </p>
            </div>
            <div className="flex gap-2">
              {Array.from({ length: state.maxActionPoints }).map((_, i) => (
                <div
                  key={i}
                  className={`h-3 flex-1 rounded-full transition-all ${
                    i < state.actionPoints ? "bg-yellow-400" : "bg-white/10"
                  }`}
                />
              ))}
            </div>
            <p className="text-[10px] text-white/30 mt-1">Use actions then End Turn to close deals</p>
          </div>
        )}

        {/* ── Dashboard Stats ── */}
        <div className="grid grid-cols-2 gap-2">
          <StatPill label="GCI This Year" value={fmt(state.gciThisYear)} sub={`All time: ${fmt(state.gciAllTime)}`} />
          <StatPill
            label="Net Income / Yr"
            value={fmt(state.netIncomeThisYear)}
            color={state.netIncomeThisYear >= 0 ? "text-emerald-400" : "text-red-400"}
          />
          <StatPill label="Database" value={state.databaseSize} sub="contacts (33 = 1 deal/yr)" />
          <StatPill
            label="Pending Deals"
            value={state.pendingDeals}
            sub={`~${fmt(state.pendingDeals * GAME_CONSTANTS.GCI_PER_DEAL)} in pipeline`}
          />
        </div>

        {/* ── Burnout Meter ── */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-bold text-white/60 uppercase tracking-wide">Burnout Meter</p>
            <p
              className={`text-sm font-black ${
                state.burnoutMeter >= 80
                  ? "text-red-400"
                  : state.burnoutMeter >= 60
                  ? "text-orange-400"
                  : "text-emerald-400"
              }`}
            >
              {pct(state.burnoutMeter)}
            </p>
          </div>
          <BurnoutBar value={state.burnoutMeter} />
          {state.burnoutMeter >= 80 && (
            <p className="text-xs text-red-400 mt-2">
              ⚠️ Danger zone! Hire an assistant or rest before you crash.
            </p>
          )}
        </div>

        {/* ── Pipeline ── */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <p className="text-xs font-bold text-white/60 uppercase tracking-wide mb-3">Pipeline (A/B/C Tiers)</p>
          <div className="flex flex-col gap-2">
            <PipelineTier
              tier="A"
              count={state.tierA}
              label="Hot — 0–30 days. 85% close rate"
              color="border-red-500/30 bg-red-900/10"
            />
            <PipelineTier
              tier="B"
              count={state.tierB}
              label="Warm — 31–90 days. 65% promote rate"
              color="border-orange-500/30 bg-orange-900/10"
            />
            <PipelineTier
              tier="C"
              count={state.tierC}
              label="Cool — Sphere. 50% promote rate"
              color="border-sky-500/30 bg-sky-900/10"
            />
          </div>
          <p className="text-[10px] text-white/30 mt-2">
            Database: {state.databaseSize} contacts → ~{(state.databaseSize / 33).toFixed(1)} deals/yr at 33:1 ratio
          </p>
        </div>

        {/* ── Level Progress ── */}
        {levelProgress && state.level < 4 && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <p className="text-xs font-bold text-white/60 uppercase tracking-wide mb-1">
              Level {state.level + 1} Gate
            </p>
            <p className="text-xs text-white/40 mb-3">{levelProgress.gate.description}</p>
            <div className="flex flex-col gap-2">
              <div>
                <div className="flex justify-between text-[10px] text-white/40 mb-1">
                  <span>Database</span>
                  <span>
                    {state.databaseSize} / {levelProgress.gate.minDatabaseSize}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-sky-400 transition-all"
                    style={{ width: `${levelProgress.dbPct}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-white/40 mb-1">
                  <span>Annual GCI</span>
                  <span>
                    {fmt(state.gciThisYear)} / {fmt(levelProgress.gate.minAnnualGCI)}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-yellow-400 transition-all"
                    style={{ width: `${levelProgress.gciPct}%` }}
                  />
                </div>
              </div>
              {levelProgress.gate.requiresAssistant && (
                <p className={`text-xs ${state.hasAssistant ? "text-emerald-400" : "text-orange-400"}`}>
                  {state.hasAssistant ? "✓ Assistant hired" : "⬜ Hire an assistant"}
                </p>
              )}
              {levelProgress.gate.requiresBuyerAgent && (
                <p className={`text-xs ${state.buyerAgents > 0 ? "text-emerald-400" : "text-orange-400"}`}>
                  {state.buyerAgents > 0 ? "✓ Buyer agent on team" : "⬜ Hire a buyer's agent"}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Easy Street Progress ── */}
        {state.level >= 3 && (
          <div className="rounded-xl bg-gradient-to-br from-yellow-900/40 to-amber-900/20 border border-yellow-500/30 p-4">
            <p className="text-xs font-bold text-yellow-400 uppercase tracking-wide mb-1">🌴 Easy Street</p>
            <p className="text-xs text-white/50 mb-2">
              Passive income {fmt(state.passiveIncomeMonthly)}/mo ÷ expenses {fmt(state.monthlyPersonalExpenses)}/mo
            </p>
            <div className="h-2 w-full rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-yellow-400 transition-all"
                style={{ width: `${easyStreetPct}%` }}
              />
            </div>
            <p className="text-[10px] text-white/30 mt-1">{Math.round(easyStreetPct)}% to freedom</p>
          </div>
        )}

        {/* ── Team Status ── */}
        {(state.hasAssistant || state.buyerAgents > 0) && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <p className="text-xs font-bold text-white/60 uppercase tracking-wide mb-2">Team</p>
            <div className="flex gap-3 flex-wrap">
              {state.hasAssistant && (
                <span className="text-xs bg-emerald-900/40 border border-emerald-500/30 rounded-full px-3 py-1 text-emerald-400">
                  ✓ Assistant
                </span>
              )}
              {Array.from({ length: state.buyerAgents }).map((_, i) => (
                <span
                  key={i}
                  className="text-xs bg-violet-900/40 border border-violet-500/30 rounded-full px-3 py-1 text-violet-400"
                >
                  BA #{i + 1}
                </span>
              ))}
              {state.rentalProperties > 0 && (
                <span className="text-xs bg-yellow-900/40 border border-yellow-500/30 rounded-full px-3 py-1 text-yellow-400">
                  🏘️ {state.rentalProperties} rental{state.rentalProperties !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Tax Reserve Status ── */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white/60 uppercase tracking-wide">Tax Reserve</p>
              <p className="text-sm text-white/50">
                {state.taxReserveEnabled
                  ? `ON — ${fmt(state.taxReserve)} saved`
                  : "OFF — danger if you don't set aside 30%"}
              </p>
            </div>
            <div
              className={`w-10 h-6 rounded-full transition-colors cursor-pointer ${
                state.taxReserveEnabled ? "bg-emerald-500" : "bg-red-800"
              }`}
              onClick={() => canAct && dispatch({ type: "ACTION", actionType: "toggle-tax-reserve" })}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full m-0.5 transition-transform ${
                  state.taxReserveEnabled ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </div>
          </div>
        </div>

        {/* ── Market Status ── */}
        {state.marketMultiplier !== 1.0 && (
          <div
            className={`rounded-xl border p-3 text-sm ${
              state.marketMultiplier > 1
                ? "bg-emerald-900/20 border-emerald-500/30 text-emerald-400"
                : "bg-red-900/20 border-red-500/30 text-red-400"
            }`}
          >
            {state.marketMultiplier > 1 ? "🌡️" : "❄️"} Market{" "}
            {state.marketMultiplier > 1 ? `+${Math.round((state.marketMultiplier - 1) * 100)}%` : `${Math.round((state.marketMultiplier - 1) * 100)}%`}{" "}
            · {state.marketMultiplierRoundsLeft} quarter{state.marketMultiplierRoundsLeft !== 1 ? "s" : ""} remaining
          </div>
        )}

        {/* ── Actions ── */}
        {state.phase === "action" && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold text-white/40 uppercase tracking-wide">Actions</p>
            <ActionButton
              emoji="📞"
              label="Prospect — Sphere"
              subtitle="Call database, nurture pipeline. Low burnout. Best ROI."
              onClick={() => dispatch({ type: "ACTION", actionType: "prospect-sphere" })}
              disabled={!canAct}
              variant="highlight"
            />
            <ActionButton
              emoji="🥶"
              label="Cold Prospect"
              subtitle="Expireds, FSBOs, circle prospect. High burnout, hot leads."
              onClick={() => dispatch({ type: "ACTION", actionType: "cold-prospect" })}
              disabled={!canAct}
            />
            <ActionButton
              emoji="🏠"
              label="Work Pipeline"
              subtitle="Showings, offers, presentations. Converts A-tier to pending."
              onClick={() => dispatch({ type: "ACTION", actionType: "work-pipeline" })}
              disabled={!canAct}
            />
            <ActionButton
              emoji="🎰"
              label="Marketing Roulette"
              subtitle={`Spend $2,000 on paid leads. 0–3 deal result. (Cash: ${fmt(state.cash)})`}
              onClick={() => dispatch({ type: "ACTION", actionType: "marketing-roulette" })}
              disabled={!canAct || !hasCashForMarketing}
              variant={hasCashForMarketing ? "default" : "danger"}
            />
            <ActionButton
              emoji="😴"
              label="Rest"
              subtitle="Recover burnout. You can't close deals at 100% fried."
              onClick={() => dispatch({ type: "ACTION", actionType: "rest" })}
              disabled={!canAct}
            />

            {!state.hasAssistant && (
              <ActionButton
                emoji="🧑‍💼"
                label="Hire Assistant"
                subtitle={`$5,000 setup · cuts burnout in half · +1 AP/round. (Cash: ${fmt(state.cash)})`}
                onClick={() => dispatch({ type: "ACTION", actionType: "hire-assistant" })}
                disabled={!canAct || !hasCashForAssistant}
                variant="highlight"
              />
            )}

            {state.level >= 2 && state.buyerAgents < 4 && (
              <ActionButton
                emoji="🤝"
                label="Hire Buyer's Agent"
                subtitle={`$8,000 recruit cost · +40% deal production. (Cash: ${fmt(state.cash)})`}
                onClick={() => dispatch({ type: "ACTION", actionType: "hire-buyer-agent" })}
                disabled={!canAct || !hasCashForAgent}
              />
            )}

            {state.level >= 3 && (
              <ActionButton
                emoji="🏘️"
                label="Buy Rental Property"
                subtitle={`$25,000 down · $600-$1,000/mo passive income. (Cash: ${fmt(state.cash)})`}
                onClick={() => dispatch({ type: "ACTION", actionType: "buy-rental" })}
                disabled={!canAct || !hasCashForRental}
                variant="highlight"
              />
            )}

            <button
              onClick={() => dispatch({ type: "END_TURN" })}
              className="mt-2 w-full rounded-xl bg-yellow-400 text-black font-black py-4 text-base hover:bg-yellow-300 active:scale-95 transition-all disabled:opacity-50"
            >
              End Turn → Close Q{state.quarter} Deals
            </button>

            {state.actionPoints < state.maxActionPoints && (
              <p className="text-xs text-center text-white/30">
                Tip: you can End Turn with unused AP — but more actions = more deals.
              </p>
            )}
          </div>
        )}

        {/* ── Card Draw Phase ── */}
        {state.phase === "card-draw" && (
          <div className="flex flex-col gap-4">
            <p className="text-xs font-bold text-white/40 uppercase tracking-wide">
              Event Cards · Q{state.quarter === 1 ? 4 : state.quarter - 1} wrap-up
            </p>
            {state.drawnCards.map((rc, i) => {
              if (i !== state.currentCardIndex) return null;
              return (
                <CardView
                  key={rc.card.id + i}
                  card={rc.card}
                  revealed={rc.revealed}
                  onReveal={() => dispatch({ type: "REVEAL_CARD" })}
                  onNext={() => dispatch({ type: "NEXT_CARD" })}
                  isLast={i === state.drawnCards.length - 1}
                />
              );
            })}
          </div>
        )}

        {/* ── Round Summary ── */}
        {state.roundLog.length > 0 && state.phase === "action" && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <p className="text-xs font-bold text-white/40 uppercase tracking-wide mb-2">Last Quarter Summary</p>
            <div className="flex flex-col gap-1">
              {state.roundLog.map((entry, i) => (
                <p key={i} className="text-xs text-white/60">
                  {entry}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Title Screen ───────────────────────────────────────────────────────

function TitleScreen({ onStart, onLoad, hasExisting }: { onStart: () => void; onLoad: () => void; hasExisting: boolean }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#031019] text-white px-6 py-12">
      <div className="max-w-md w-full flex flex-col items-center gap-8 text-center">
        <div>
          <p className="text-[10px] tracking-[0.4em] text-white/30 mb-3 uppercase">A Real Estate Career Game</p>
          <h1 className="text-7xl font-black tracking-tight text-white mb-1">AGENT</h1>
          <p className="text-white/40 text-base">Build your business. Build your life.</p>
        </div>

        <div className="w-full flex flex-col gap-3">
          <button
            onClick={onStart}
            className="w-full rounded-2xl bg-yellow-400 text-black font-black py-5 text-lg hover:bg-yellow-300 active:scale-95 transition-all"
          >
            New Game
          </button>
          {hasExisting && (
            <button
              onClick={onLoad}
              className="w-full rounded-2xl bg-white/10 border border-white/20 text-white font-bold py-4 hover:bg-white/15 active:scale-95 transition-all"
            >
              Continue Saved Game
            </button>
          )}
        </div>

        <div className="text-left w-full rounded-2xl bg-white/5 border border-white/10 p-5 flex flex-col gap-3">
          <p className="text-xs font-bold text-white/60 uppercase tracking-wider">How to Win</p>
          <p className="text-sm text-white/70">
            Build your real estate career from Day 1 license to financial freedom. Grow your database, close deals, build
            a team, and acquire rental properties until your{" "}
            <span className="text-yellow-400 font-bold">passive income exceeds monthly expenses</span> — that's Easy
            Street.
          </p>
          <div className="flex flex-col gap-1.5">
            {[
              { emoji: "1️⃣", label: "Solo Agent — survive Year 1" },
              { emoji: "2️⃣", label: "Team Lead — hire, delegate, scale" },
              { emoji: "3️⃣", label: "Rainmaker — systematized business" },
              { emoji: "4️⃣", label: "Investor — passive income path" },
            ].map(({ emoji, label }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-base">{emoji}</span>
                <p className="text-xs text-white/50">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full rounded-2xl bg-white/5 border border-white/10 p-4">
          <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Authentic Math</p>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-white/40">
            <span>$8,550 GCI/deal (3% × $285K)</span>
            <span>33 contacts = 1 deal/year</span>
            <span>29.2% Cost of Sales</span>
            <span>85% A-tier close rate</span>
            <span>30% tax reserve rule</span>
            <span>41.6% net margin</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Setup Screen ───────────────────────────────────────────────────────

function SetupScreen({ onConfirm }: { onConfirm: (name: string) => void }) {
  const [name, setName] = React.useState("");
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#031019] text-white px-6">
      <div className="max-w-md w-full flex flex-col gap-6">
        <div className="text-center">
          <h2 className="text-3xl font-black mb-2">Your Agent Name</h2>
          <p className="text-white/50 text-sm">You're about to get your real estate license.</p>
        </div>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && name.trim() && onConfirm(name.trim())}
          placeholder="Full name..."
          className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-4 text-lg text-white placeholder-white/30 focus:outline-none focus:border-yellow-400"
        />
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Your Starting Position</p>
          <div className="flex flex-col gap-1 text-sm text-white/60">
            <p>💰 $8,000 in savings</p>
            <p>📋 15 people in your database</p>
            <p>🎯 2 warm prospects, 13 sphere contacts</p>
            <p>📅 Year 1, Quarter 1</p>
          </div>
        </div>
        <button
          onClick={() => name.trim() && onConfirm(name.trim())}
          disabled={!name.trim()}
          className="w-full rounded-xl bg-yellow-400 text-black font-black py-4 text-lg hover:bg-yellow-300 active:scale-95 transition-all disabled:opacity-40"
        >
          Start Career →
        </button>
      </div>
    </div>
  );
}

// ── Level Up Screen ────────────────────────────────────────────────────

function LevelUpScreen({ state, onConfirm }: { state: GameState; onConfirm: () => void }) {
  const newLevel = state.pendingLevelUpTo!;
  const levelColors: Record<number, string> = {
    2: "from-sky-900/80 to-sky-800/40 border-sky-500/40",
    3: "from-violet-900/80 to-violet-800/40 border-violet-500/40",
    4: "from-yellow-900/80 to-yellow-800/40 border-yellow-500/40",
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#031019] text-white px-6">
      <div className="max-w-md w-full flex flex-col items-center gap-6 text-center">
        <div className="text-6xl animate-bounce">🏆</div>
        <h2 className="text-4xl font-black text-yellow-400">Level Up!</h2>
        <div className={`w-full rounded-2xl bg-gradient-to-br border p-6 ${levelColors[newLevel] ?? "border-white/10"}`}>
          <p className="text-[10px] tracking-widest text-white/40 mb-2">LEVEL {newLevel}</p>
          <h3 className="text-2xl font-black mb-2">{LEVEL_LABELS[newLevel]}</h3>
          <p className="text-white/60 text-sm">{LEVEL_DESCRIPTIONS[newLevel]}</p>
        </div>
        <button
          onClick={onConfirm}
          className="w-full rounded-2xl bg-yellow-400 text-black font-black py-4 text-lg hover:bg-yellow-300 active:scale-95 transition-all"
        >
          Keep Going →
        </button>
      </div>
    </div>
  );
}

// ── Game Over Screen ───────────────────────────────────────────────────

function GameOverScreen({ state, onRestart }: { state: GameState; onRestart: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#031019] text-white px-6">
      <div className="max-w-md w-full flex flex-col items-center gap-6 text-center">
        <div className="text-6xl">{state.won ? "🌴" : "💀"}</div>
        <h2 className={`text-4xl font-black ${state.won ? "text-yellow-400" : "text-red-400"}`}>
          {state.won ? "Easy Street!" : "Game Over"}
        </h2>
        {state.won ? (
          <p className="text-white/70 text-base">
            Passive income {fmt(state.passiveIncomeMonthly)}/mo exceeds expenses. You built your freedom.
          </p>
        ) : (
          <p className="text-white/70 text-sm">{state.gameOverReason}</p>
        )}

        <div className="w-full rounded-2xl bg-white/5 border border-white/10 p-5 flex flex-col gap-3">
          <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Career Stats</p>
          <div className="grid grid-cols-2 gap-3 text-left">
            <StatPill label="Years Played" value={state.year} />
            <StatPill label="Level Reached" value={LEVEL_LABELS[state.level]} />
            <StatPill label="All-Time GCI" value={fmt(state.gciAllTime)} />
            <StatPill label="Database Size" value={state.databaseSize} />
            <StatPill label="Rentals Owned" value={state.rentalProperties} />
            <StatPill label="Passive/Mo" value={fmt(state.passiveIncomeMonthly)} />
          </div>
        </div>

        <button
          onClick={onRestart}
          className="w-full rounded-2xl bg-yellow-400 text-black font-black py-4 text-lg hover:bg-yellow-300 active:scale-95 transition-all"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}

// ── Root component ─────────────────────────────────────────────────────

export default function AgentGame() {
  const [screen, setScreen] = React.useState<"title" | "setup" | "game">("title");
  const [hasExisting, setHasExisting] = React.useState(false);

  const [store, dispatch] = useReducer(gameReducer, {
    state: null,
    deck: [],
    setupName: "",
    isLoading: false,
  });

  // Check for saved game on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("agent-game-state-v1");
      setHasExisting(!!saved);
    }
  }, []);

  // Sync screen when state changes
  useEffect(() => {
    if (store.state && screen !== "game") {
      setScreen("game");
    }
  }, [store.state, screen]);

  const handleNewGame = () => setScreen("setup");
  const handleLoadGame = () => {
    dispatch({ type: "LOAD" });
    setScreen("game");
  };
  const handleSetupConfirm = (name: string) => {
    dispatch({ type: "START", playerName: name });
    setScreen("game");
  };
  const handleRestart = () => {
    dispatch({ type: "RESTART" });
    setScreen("title");
    setHasExisting(false);
  };

  if (screen === "title") {
    return <TitleScreen onStart={handleNewGame} onLoad={handleLoadGame} hasExisting={hasExisting} />;
  }

  if (screen === "setup") {
    return <SetupScreen onConfirm={handleSetupConfirm} />;
  }

  if (!store.state) {
    return <TitleScreen onStart={handleNewGame} onLoad={handleLoadGame} hasExisting={hasExisting} />;
  }

  const { state } = store;

  if (state.gameOver) {
    return <GameOverScreen state={state} onRestart={handleRestart} />;
  }

  if (state.pendingLevelUp && state.pendingLevelUpTo) {
    return <LevelUpScreen state={state} onConfirm={() => dispatch({ type: "LEVEL_UP_CONFIRM" })} />;
  }

  return <GameScreen state={state} dispatch={dispatch} />;
}

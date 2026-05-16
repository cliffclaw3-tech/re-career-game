"use client";

import React, { useState } from "react";
import type { CityId } from "@/lib/game-types";
import { CITY_CONFIGS } from "@/lib/game-types";

interface CitySelectProps {
  onConfirm: (city: CityId) => void;
}

const CITY_ORDER: CityId[] = ["kansas-city", "detroit", "las-vegas", "beverly-hills", "new-york"];

function Stars({ count }: { count: number }) {
  return (
    <span className="text-yellow-400 text-xs">
      {"★".repeat(count)}
      <span className="text-white/20">{"★".repeat(5 - count)}</span>
    </span>
  );
}

export default function CitySelect({ onConfirm }: CitySelectProps) {
  const [selected, setSelected] = useState<CityId | null>(null);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="min-h-screen bg-[#031019] text-white px-4 py-8">
      <div className="max-w-lg mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="text-center">
          <p className="text-[10px] tracking-[0.4em] text-white/30 mb-2 uppercase">
            Step 3 of 3
          </p>
          <h1 className="text-3xl font-black mb-1">CHOOSE YOUR MARKET</h1>
          <p className="text-white/50 text-sm">
            Each city plays differently. Pick your battleground.
          </p>
        </div>

        {/* City cards */}
        <div className="flex flex-col gap-4">
          {CITY_ORDER.map((cityId) => {
            const city = CITY_CONFIGS[cityId];
            const isSelected = selected === cityId;

            return (
              <button
                key={cityId}
                type="button"
                onClick={() => setSelected(cityId)}
                className={`text-left rounded-2xl border p-5 transition-all active:scale-[0.99] ${
                  isSelected
                    ? "bg-yellow-400/10 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.25)]"
                    : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{city.emoji}</span>
                    <div>
                      <p className="text-lg font-black text-white">{city.name}</p>
                      <Stars count={city.difficulty} />
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${
                      city.eventFrequency === "volatile"
                        ? "text-red-400 border-red-400/40 bg-red-900/20"
                        : city.eventFrequency === "high"
                        ? "text-orange-400 border-orange-400/40 bg-orange-900/20"
                        : city.eventFrequency === "medium"
                        ? "text-yellow-400 border-yellow-400/40 bg-yellow-900/20"
                        : "text-emerald-400 border-emerald-400/40 bg-emerald-900/20"
                    }`}
                  >
                    {city.eventFrequency} events
                  </span>
                </div>

                <p className="text-sm text-white/60 italic mb-3">
                  &ldquo;{city.tagline}&rdquo;
                </p>

                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="rounded-lg bg-white/5 p-2">
                    <p className="text-[10px] text-white/40 uppercase tracking-wide">Avg Deal</p>
                    <p className="text-sm font-bold text-yellow-400">{fmt(city.avgDealGCI)}</p>
                  </div>
                  <div className="rounded-lg bg-white/5 p-2">
                    <p className="text-[10px] text-white/40 uppercase tracking-wide">Year 1 Target</p>
                    <p className="text-sm font-bold text-white">{fmt(city.year1GCITarget)}</p>
                  </div>
                  <div className="rounded-lg bg-white/5 p-2">
                    <p className="text-[10px] text-white/40 uppercase tracking-wide">Easy Street</p>
                    <p className="text-sm font-bold text-emerald-400">{fmt(city.easyStreetMonthlyExpenses)}/mo</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {city.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] text-white/50 border border-white/10 rounded-full px-2 py-0.5"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Confirm button */}
        <button
          type="button"
          disabled={!selected}
          onClick={() => selected && onConfirm(selected)}
          className="w-full rounded-2xl bg-yellow-400 text-black font-black py-5 text-lg hover:bg-yellow-300 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {selected
            ? `Start in ${CITY_CONFIGS[selected].name} →`
            : "Select a city to continue"}
        </button>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import type { CharacterConfig } from "@/lib/game-types";

interface CharacterSelectProps {
  onConfirm: (character: CharacterConfig) => void;
}

const GENDER_OPTIONS = [
  { id: "male" as const, icon: "🧑", label: "Male Agent" },
  { id: "female" as const, icon: "👩", label: "Female Agent" },
];

const AGE_OPTIONS = [
  {
    id: "young" as const,
    icon: "⚡",
    label: "Young Hustler",
    sub: "Age 20s · Hungry & Unproven",
    stats: [
      { label: "Action Points", value: "+2 AP/round (5 total)", color: "text-emerald-400" },
      { label: "Starting Cash", value: "$5,000 (–$3K)", color: "text-red-400" },
      { label: "Cold Prospect", value: "+5 burnout penalty", color: "text-red-400" },
      { label: "Database", value: "10 contacts (small sphere)", color: "text-red-400" },
    ],
  },
  {
    id: "mid" as const,
    icon: "🎯",
    label: "Mid-Career Pivot",
    sub: "Age 40s · Experienced & Focused",
    stats: [
      { label: "Action Points", value: "3 AP/round (standard)", color: "text-white/60" },
      { label: "Starting Cash", value: "$8,000 (standard)", color: "text-white/60" },
      { label: "Burnout", value: "Standard rates", color: "text-white/60" },
      { label: "Database", value: "15 contacts (standard)", color: "text-white/60" },
    ],
  },
  {
    id: "veteran" as const,
    icon: "🏆",
    label: "Veteran Closer",
    sub: "Age 60s · Unflappable & Connected",
    stats: [
      { label: "Action Points", value: "2 AP/round (–1)", color: "text-red-400" },
      { label: "Starting Cash", value: "$13,000 (+$5K)", color: "text-emerald-400" },
      { label: "Burnout Buffer", value: "–5 per action (experience)", color: "text-emerald-400" },
      { label: "Database", value: "25 contacts (large sphere)", color: "text-emerald-400" },
    ],
  },
];

const OUTFIT_OPTIONS = [
  {
    id: "formal" as const,
    icon: "👔",
    label: "Business Formal",
    sub: "Power suit. First impressions matter.",
    effect: "+10% B→A conversion rate",
    effectColor: "text-emerald-400",
  },
  {
    id: "casual" as const,
    icon: "🧥",
    label: "Smart Casual",
    sub: "Approachable. They feel comfortable.",
    effect: "+5 contacts per Sphere Prospect",
    effectColor: "text-emerald-400",
  },
  {
    id: "hustle" as const,
    icon: "🏃",
    label: "Hustle Mode",
    sub: "Grinds hard. Looks scrappy.",
    effect: "+1 bonus AP on first action each round",
    effectColor: "text-emerald-400",
  },
];

function SelectCard({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-2xl border p-4 transition-all active:scale-95 ${
        selected
          ? "bg-yellow-400/10 border-yellow-400 shadow-[0_0_16px_rgba(250,204,21,0.3)]"
          : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
      }`}
    >
      {children}
    </button>
  );
}

export default function CharacterSelect({ onConfirm }: CharacterSelectProps) {
  const [gender, setGender] = useState<"male" | "female" | null>(null);
  const [age, setAge] = useState<"young" | "mid" | "veteran" | null>(null);
  const [outfit, setOutfit] = useState<"formal" | "casual" | "hustle" | null>(null);

  const allSelected = gender && age && outfit;

  return (
    <div className="min-h-screen bg-[#031019] text-white px-4 py-8">
      <div className="max-w-lg mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="text-center">
          <p className="text-[10px] tracking-[0.4em] text-white/30 mb-2 uppercase">
            Step 1 of 3
          </p>
          <h1 className="text-3xl font-black mb-1">CREATE YOUR AGENT</h1>
          <p className="text-white/50 text-sm">
            Choose who you are before you start the grind.
          </p>
        </div>

        {/* Section 1: Gender */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold text-white/40 uppercase tracking-wider">
            Agent Identity
          </p>
          <div className="grid grid-cols-2 gap-3">
            {GENDER_OPTIONS.map((g) => (
              <SelectCard
                key={g.id}
                selected={gender === g.id}
                onClick={() => setGender(g.id)}
              >
                <div className="text-3xl mb-2">{g.icon}</div>
                <p className="text-sm font-bold text-white">{g.label}</p>
              </SelectCard>
            ))}
          </div>
        </div>

        {/* Section 2: Age Archetype */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold text-white/40 uppercase tracking-wider">
            Age Archetype
          </p>
          <div className="flex flex-col gap-3">
            {AGE_OPTIONS.map((a) => (
              <SelectCard
                key={a.id}
                selected={age === a.id}
                onClick={() => setAge(a.id)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{a.icon}</span>
                  <div>
                    <p className="text-base font-black text-white">{a.label}</p>
                    <p className="text-xs text-white/50">{a.sub}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  {a.stats.map((s) => (
                    <div key={s.label} className="flex justify-between text-xs">
                      <span className="text-white/40">{s.label}</span>
                      <span className={`font-semibold ${s.color}`}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </SelectCard>
            ))}
          </div>
        </div>

        {/* Section 3: Outfit */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold text-white/40 uppercase tracking-wider">
            Your Style
          </p>
          <div className="flex flex-col gap-3">
            {OUTFIT_OPTIONS.map((o) => (
              <SelectCard
                key={o.id}
                selected={outfit === o.id}
                onClick={() => setOutfit(o.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{o.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">{o.label}</p>
                    <p className="text-xs text-white/50">{o.sub}</p>
                    <p className={`text-xs font-semibold mt-1 ${o.effectColor}`}>
                      {o.effect}
                    </p>
                  </div>
                </div>
              </SelectCard>
            ))}
          </div>
        </div>

        {/* Next button */}
        <button
          type="button"
          disabled={!allSelected}
          onClick={() => {
            if (gender && age && outfit) {
              onConfirm({ gender, age, outfit });
            }
          }}
          className="w-full rounded-2xl bg-yellow-400 text-black font-black py-5 text-lg hover:bg-yellow-300 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {allSelected ? "Name Your Agent →" : "Select all three to continue"}
        </button>
      </div>
    </div>
  );
}

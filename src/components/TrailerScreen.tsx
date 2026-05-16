"use client";

import React, { useEffect, useState, useCallback } from "react";

interface TrailerScreenProps {
  onComplete: () => void;
}

// Character silhouette as CSS shapes
function CharSilhouette({ age }: { age: "young" | "mid" | "veteran" }) {
  const headSize = age === "young" ? 36 : age === "mid" ? 40 : 38;
  const bodyH = age === "young" ? 80 : age === "mid" ? 70 : 60;
  const bodyW = age === "young" ? 44 : age === "mid" ? 52 : 56;

  return (
    <div className="flex flex-col items-center gap-0" style={{ filter: "drop-shadow(0 0 12px rgba(250,204,21,0.4))" }}>
      {/* Head */}
      <div
        style={{
          width: headSize,
          height: headSize,
          borderRadius: "50%",
          background: "rgba(250,204,21,0.15)",
          border: "2px solid rgba(250,204,21,0.5)",
        }}
      />
      {/* Neck */}
      <div style={{ width: 12, height: 10, background: "rgba(250,204,21,0.15)" }} />
      {/* Body */}
      <div
        style={{
          width: bodyW,
          height: bodyH,
          background: "rgba(250,204,21,0.15)",
          border: "2px solid rgba(250,204,21,0.4)",
          borderRadius: "8px 8px 4px 4px",
        }}
      />
      {/* Legs */}
      <div style={{ display: "flex", gap: 4 }}>
        {[0, 1].map((i) => (
          <div
            key={i}
            style={{
              width: (bodyW - 4) / 2 - 2,
              height: 50,
              background: "rgba(250,204,21,0.12)",
              border: "1.5px solid rgba(250,204,21,0.3)",
              borderRadius: "0 0 4px 4px",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Gold particle for scene 6
function GoldParticle({ delay, left, size }: { delay: number; left: number; size: number }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: `${Math.random() * 40}%`,
        left: `${left}%`,
        width: size,
        height: size,
        borderRadius: "50%",
        background: "rgba(250,204,21,0.7)",
        animation: `particle-drift ${2 + Math.random() * 2}s ${delay}s ease-out infinite`,
        pointerEvents: "none",
      }}
    />
  );
}

// City card for scene 4
const CITIES = [
  { name: "NEW YORK", tagline: "Co-op boards. Bidding wars. No mercy." },
  { name: "BEVERLY HILLS", tagline: "Off-market. Celebrity buyers. Perfection expected." },
  { name: "KANSAS CITY", tagline: "Steady volume. Builder relationships. Long game." },
  { name: "DETROIT", tagline: "Distressed. Title chaos. Investor competition." },
  { name: "LAS VEGAS", tagline: "Boom. Bust. Repeat. Out-of-state everything." },
];

export default function TrailerScreen({ onComplete }: TrailerScreenProps) {
  const [scene, setScene] = useState(0);
  const [cityIndex, setCityIndex] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [exiting, setExiting] = useState(false);

  const skip = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("agent-trailer-seen", "true");
    }
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    // Scene timings (ms from start)
    const scenes = [
      0,      // scene 0 = blank/in
      300,    // scene 1 — AGENT title
      3300,   // scene 2 — year 1
      7300,   // scene 3 — characters
      12300,  // scene 4 — cities
      17300,  // scene 5 — mechanics
      22300,  // scene 6 — Start Broke
      27300,  // scene 7 — fade out
    ];

    const timers: ReturnType<typeof setTimeout>[] = [];

    scenes.forEach((ms, i) => {
      timers.push(setTimeout(() => setScene(i), ms));
    });

    // City cycling in scene 4
    [0, 1, 2, 3, 4].forEach((ci) => {
      timers.push(setTimeout(() => setCityIndex(ci), 12300 + ci * 1000));
    });

    // Line cycling in scene 5 (mechanics)
    [0, 1, 2].forEach((li) => {
      timers.push(setTimeout(() => setLineIndex(li), 17300 + li * 1000 + 500));
    });

    // Mark seen + complete
    timers.push(
      setTimeout(() => {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("agent-trailer-seen", "true");
        }
        setExiting(true);
      }, 27300)
    );

    timers.push(setTimeout(() => onComplete(), 27800));

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  const base = "min-h-screen bg-black text-white flex flex-col items-center justify-center relative overflow-hidden";

  return (
    <div className={base}>
      {/* Skip button — always visible */}
      <button
        type="button"
        onClick={skip}
        className="fixed top-4 right-4 z-50 text-white/50 hover:text-white text-sm underline transition-colors"
      >
        Skip →
      </button>

      {/* Fade overlay for scene transitions */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "black",
          opacity: exiting ? 1 : 0,
          transition: "opacity 0.5s ease-in-out",
          zIndex: 40,
          pointerEvents: "none",
        }}
      />

      {/* ── SCENE 1 — AGENT title ── */}
      {scene >= 1 && scene < 2 && (
        <div className="flex flex-col items-center gap-4">
          <p
            className="text-[10px] tracking-[0.5em] text-white/40 uppercase"
            style={{ animation: "trailer-fade-in 0.6s ease-out forwards" }}
          >
            A REAL ESTATE CAREER GAME
          </p>
          <h1
            className="text-9xl font-black tracking-tight text-white"
            style={{ animation: "trailer-title-in 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.3s both" }}
          >
            AGENT
          </h1>
        </div>
      )}

      {/* ── SCENE 2 — Year 1 ── */}
      {scene >= 2 && scene < 3 && (
        <div
          className="flex flex-col items-center gap-3 text-center px-8"
          style={{ animation: "trailer-fade-in 0.5s ease-out forwards" }}
        >
          {["Year 1. No clients.", "No track record.", "$8,000 in savings."].map(
            (line, i) => (
              <p
                key={i}
                className="text-2xl font-light text-white/70"
                style={{ animation: `trailer-fade-in 0.5s ${i * 0.4}s ease-out both` }}
              >
                {line}
              </p>
            )
          )}
          <p
            className="text-3xl font-black text-white mt-4"
            style={{ animation: "trailer-fade-in 0.5s 1.3s ease-out both" }}
          >
            ONE REAL ESTATE LICENSE.
          </p>
        </div>
      )}

      {/* ── SCENE 3 — Characters ── */}
      {scene >= 3 && scene < 4 && (
        <div
          className="flex flex-col items-center gap-8"
          style={{ animation: "trailer-fade-in 0.5s ease-out forwards" }}
        >
          <div className="flex gap-8 items-end">
            {(["young", "mid", "veteran"] as const).map((age, i) => (
              <div
                key={age}
                className="flex flex-col items-center gap-3 trailer-float"
                style={{
                  animation: `trailer-slide-right 0.5s ${i * 0.2}s ease-out both, trailer-float 3s ${i * 0.5}s ease-in-out infinite`,
                  animationDelay: `${i * 0.2}s, ${0.5 + i * 0.5}s`,
                }}
              >
                <CharSilhouette age={age} />
                <div className="text-center">
                  <p className="text-xs font-black text-white tracking-widest uppercase">
                    {age === "young" ? "THE YOUNG HUSTLER" : age === "mid" ? "THE MID-CAREER PIVOT" : "THE VETERAN CLOSER"}
                  </p>
                  <p className="text-[10px] text-white/40">
                    {age === "young" ? "Age 20s · Hungry" : age === "mid" ? "Age 40s · Experienced" : "Age 60s · Unflappable"}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p
            className="text-xl font-black tracking-widest text-white/80"
            style={{ animation: "trailer-fade-in 0.5s 0.8s both" }}
          >
            CHOOSE YOUR PLAYER
          </p>
        </div>
      )}

      {/* ── SCENE 4 — City montage ── */}
      {scene >= 4 && scene < 5 && (
        <div className="flex flex-col items-center gap-6">
          <div
            key={cityIndex}
            className="bg-white rounded-2xl p-6 text-center max-w-sm mx-4 border-4 border-yellow-400"
            style={{ animation: "trailer-city-slide 0.3s ease-out forwards" }}
          >
            <p className="text-2xl font-black text-black mb-2">
              {CITIES[cityIndex].name}
            </p>
            <p className="text-sm text-gray-600 italic">
              &ldquo;{CITIES[cityIndex].tagline}&rdquo;
            </p>
          </div>
          {cityIndex === 4 && (
            <div
              className="text-center"
              style={{ animation: "trailer-fade-in 0.5s 0.5s both" }}
            >
              <p className="text-2xl font-black text-white">5 CITIES.</p>
              <p className="text-lg text-white/60">5 DIFFERENT GAMES.</p>
            </div>
          )}
        </div>
      )}

      {/* ── SCENE 5 — Mechanics ── */}
      {scene >= 5 && scene < 6 && (
        <div
          className="flex flex-col items-center gap-8 w-full max-w-lg px-8"
          style={{ animation: "trailer-fade-in 0.5s ease-out forwards" }}
        >
          <div className="grid grid-cols-2 gap-8 w-full">
            {/* AP dots */}
            <div className="flex flex-col items-center gap-2">
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Action Points</p>
              <div className="flex gap-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-yellow-400"
                    style={{
                      animation: `trailer-fade-in 0.3s ${i * 0.2}s both`,
                      boxShadow: "0 0 12px rgba(250,204,21,0.5)",
                    }}
                  />
                ))}
              </div>
            </div>
            {/* Pipeline */}
            <div className="flex flex-col items-center gap-2">
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Pipeline</p>
              <div className="flex items-center gap-1 text-sm">
                {["C", "→", "B", "→", "A", "→", "💰"].map((t, i) => (
                  <span
                    key={i}
                    className={t === "💰" ? "text-yellow-400 text-lg" : t === "→" ? "text-white/30" : "text-white font-bold"}
                    style={{ animation: `trailer-fade-in 0.3s ${i * 0.15}s both` }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            {["BUILD YOUR PIPELINE.", "MANAGE YOUR BURNOUT.", "CLOSE THE DEALS."].map(
              (line, i) => (
                <p
                  key={i}
                  className={`text-xl font-black ${lineIndex >= i ? "text-white" : "text-white/0"}`}
                  style={{ transition: "color 0.3s" }}
                >
                  {line}
                </p>
              )
            )}
          </div>
        </div>
      )}

      {/* ── SCENE 6 — Start Broke / Easy Street ── */}
      {scene >= 6 && scene < 7 && (
        <div className="relative flex flex-col items-center gap-6 text-center px-8">
          {/* Particles */}
          {Array.from({ length: 15 }).map((_, i) => (
            <GoldParticle
              key={i}
              delay={i * 0.15}
              left={5 + i * 6}
              size={4 + (i % 4) * 2}
            />
          ))}

          <p
            className="text-4xl font-black text-white"
            style={{ animation: "trailer-fade-in 0.6s ease-out forwards" }}
          >
            START BROKE.
          </p>
          <p
            className="text-4xl font-black text-white"
            style={{ animation: "trailer-fade-in 0.6s 1s ease-out both" }}
          >
            BUILD AN EMPIRE.
          </p>
          <div style={{ animation: "trailer-fade-in 0.6s 2s ease-out both" }}>
            <p className="text-2xl font-black text-white">EARN YOUR</p>
            <p className="text-4xl font-black text-yellow-400">EASY STREET.</p>
          </div>
          <p
            className="text-5xl"
            style={{ animation: "trailer-fade-in 0.6s 2.5s ease-out both, trailer-float 2s 3s ease-in-out infinite" }}
          >
            🌴
          </p>
        </div>
      )}
    </div>
  );
}

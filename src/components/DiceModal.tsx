"use client";

import React, { useEffect, useState } from "react";

interface DiceModalProps {
  roll: number;        // 1–6
  onComplete: () => void;
}

// Pip patterns for each die face (3×3 grid, true = pip visible)
const PIP_PATTERNS: Record<number, boolean[]> = {
  1: [false, false, false, false, true, false, false, false, false],
  2: [true, false, false, false, false, false, false, false, true],
  3: [true, false, false, false, true, false, false, false, true],
  4: [true, false, true, false, false, false, true, false, true],
  5: [true, false, true, false, true, false, true, false, true],
  6: [true, false, true, true, false, true, true, false, true],
};

// The CSS transform for each face number so that face is pointing toward viewer
// after the roll animation ends at rotateX(720deg) rotateY(510deg) rotateZ(350deg)
// We just show pips as a static visual inside the modal — the 3D cube shows the roll
const FACE_TRANSFORMS: Record<string, string> = {
  front: 'rotateY(0deg) translateZ(60px)',
  back: 'rotateY(180deg) translateZ(60px)',
  right: 'rotateY(90deg) translateZ(60px)',
  left: 'rotateY(-90deg) translateZ(60px)',
  top: 'rotateX(90deg) translateZ(60px)',
  bottom: 'rotateX(-90deg) translateZ(60px)',
};

// Map die faces: front=1, back=6, right=3, left=4, top=2, bottom=5
const FACE_VALUES: Record<string, number> = {
  front: 1,
  back: 6,
  right: 3,
  left: 4,
  top: 2,
  bottom: 5,
};

function PipGrid({ value }: { value: number }) {
  const pattern = PIP_PATTERNS[value] ?? PIP_PATTERNS[1];
  return (
    <div className="pip-grid">
      {pattern.map((show, i) =>
        show ? <div key={i} className="pip" /> : <div key={i} style={{ width: 14, height: 14 }} />
      )}
    </div>
  );
}

export default function DiceModal({ roll, onComplete }: DiceModalProps) {
  const [phase, setPhase] = useState<"in" | "rolling" | "landed" | "out">("in");
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Phase sequence:
    // 0ms: appear
    // 120ms: start rolling
    // 1320ms: land (1.2s roll)
    // 1520ms: bounce done, show result
    // 2120ms: start fade out (600ms hold)
    // 2320ms: remove from DOM

    const t1 = setTimeout(() => setPhase("rolling"), 120);
    const t2 = setTimeout(() => setPhase("landed"), 1320);
    const t3 = setTimeout(() => setPhase("out"), 2120);
    const t4 = setTimeout(() => {
      setVisible(false);
      onComplete();
    }, 2320);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  if (!visible) return null;

  const rollLabel: Record<number, string> = {
    1: "1 — Rough day",
    2: "2 — Below average",
    3: "3 — Steady",
    4: "4 — Solid",
    5: "5 — Strong",
    6: "6 — Exceptional!",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)" }}
    >
      <div
        style={{
          animation:
            phase === "in"
              ? "dice-modal-in 0.12s ease-out forwards"
              : phase === "out"
              ? "dice-modal-out 0.2s ease-in forwards"
              : "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
        }}
      >
        {/* 3D Dice */}
        <div
          className="dice-scene"
          style={{
            transform: phase === "landed" || phase === "out" ? "scale(1)" : undefined,
            animation:
              phase === "landed"
                ? "dice-bounce 0.2s ease-out forwards"
                : undefined,
          }}
        >
          <div
            className="dice-cube"
            style={{
              animation:
                phase === "rolling"
                  ? "dice-roll 1.2s cubic-bezier(0.25, 0.1, 0.25, 1) forwards"
                  : undefined,
              boxShadow:
                phase === "landed" || phase === "out"
                  ? "0 0 30px rgba(250,204,21,0.7), 0 0 60px rgba(250,204,21,0.3)"
                  : "none",
              borderRadius: 16,
            }}
          >
            {(Object.entries(FACE_TRANSFORMS) as [string, string][]).map(
              ([face, transform]) => (
                <div
                  key={face}
                  className="dice-face"
                  style={{ transform }}
                >
                  <PipGrid value={FACE_VALUES[face]} />
                </div>
              )
            )}
          </div>
        </div>

        {/* Result text — shows after landing */}
        {(phase === "landed" || phase === "out") && (
          <div className="text-center" style={{ animation: "dice-modal-in 0.15s ease-out forwards" }}>
            <p className="text-2xl font-black text-yellow-400">
              🎲 Rolled a {roll}
            </p>
            <p className="text-sm text-white/60 mt-1">
              {rollLabel[roll] ?? `Rolled a ${roll}`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

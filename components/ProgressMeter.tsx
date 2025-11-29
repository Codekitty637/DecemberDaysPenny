"use client";

import React, { useEffect } from "react";
import ProgressIcon, { DayKey } from "./ProgressIcon";
// If you already have these helper fns, import yours instead:
import dynamic from "next/dynamic";
const fireConfettiBurst = async () => {
  const m = await import("canvas-confetti");
  m.default({ particleCount: 120, spread: 70, startVelocity: 45, gravity: 0.8, ticks: 220, scalar: 0.9 });
};

type DayData = {
  day: DayKey;
  label: string;
  state: "locked" | "current" | "unlocked";
};

export interface ProgressMeterProps {
  items: DayData[];
  onUnlock?: (day: DayKey) => void; // call when a day flips to unlocked (optional)
}

export default function ProgressMeter({ items, onUnlock }: ProgressMeterProps) {
  // optional: confetti when a day becomes unlocked
  useEffect(() => {
    // naive example: if the last item is unlocked, fire
    if (items.some(i => i.state === "unlocked")) {
      fireConfettiBurst();
    }
  }, [items]);

  return (
    <div className="flex flex-wrap items-center gap-3 md:gap-4">
      {items.map((it) => (
        <div key={it.day} className="flex flex-col items-center">
          <ProgressIcon
            day={it.day}
            label={it.label}
            state={it.state}
            className="w-10 h-10 md:w-12 md:h-12"
          />
          <span className="mt-1 text-[10px] md:text-xs text-slate-600">
            {it.day}
          </span>
        </div>
      ))}
    </div>
  );
}

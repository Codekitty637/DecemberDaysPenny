"use client";

import React, { useMemo, useRef, useEffect, useState } from "react";
// If you’re in the Next App Router:
import { useSearchParams } from "next/navigation";

type Props = {
  /** Local launch date-time string, e.g. "2025-11-01T00:00:00" (treated as local time) */
  launchLocal: string;
  /** Total number of unlock days (default 15) */
  totalDays?: number;
  /** Local unlock hour (0–23). 0 = midnight. */
  unlockHour?: number;
  className?: string;
  labelBefore?: string;
  labelDuring?: string;
  labelAfter?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const pad = (n: number) => n.toString().padStart(2, "0");

function atLocalMidnight(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDaysLocal(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** A ticking "now" that honors ?now=YYYY-MM-DDTHH:mm:ss for testing */
function useTestingNow() {
  const search = (() => {
    try {
      // useSearchParams is optional (SSR safe guard)
      // If you’re not in the App Router, replace with new URLSearchParams(window.location.search)
      return useSearchParams?.();
    } catch {
      return undefined;
    }
  })();

  const nowParam = search?.get("now") ?? null;
  const baseOverride = useMemo(
    () => (nowParam ? new Date(nowParam).getTime() : null),
    [nowParam]
  );

  const mountReal = useRef<number>(Date.now());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (baseOverride == null) {
    // Normal live clock
    return Date.now();
  }
  // Advance from the override by elapsed real time since mount
  const elapsed = Date.now() - mountReal.current;
  return baseOverride + elapsed;
}

export default function KDaysCountdown({
  launchLocal,
  totalDays = 15,
  unlockHour = 0,
  className,
  labelBefore = "Starts in",
  labelDuring = "Next unlock in",
  labelAfter = "All unlocked",
}: Props) {
  const nowMs = useTestingNow();
  const now = new Date(nowMs);

  // Normalize launch to local midnight with unlockHour
  const launch = useMemo(() => {
    const d = new Date(launchLocal);         // treated as local
    const m = atLocalMidnight(d);
    m.setHours(unlockHour, 0, 0, 0);
    return m;
  }, [launchLocal, unlockHour]);

  const todayMid = atLocalMidnight(now);
  const day0 = atLocalMidnight(launch);

  let target: Date;
  let mode: "before" | "during" | "after";

  if (now < launch) {
    // Before launch → count to launch
    target = launch;
    mode = "before";
  } else {
    // After launch → how many full days since start (at midnights)
    const daysSinceStart = Math.floor((todayMid.getTime() - day0.getTime()) / DAY_MS);
    const nextIndex = daysSinceStart + 1; // next unlock day index in [0..totalDays]
    if (nextIndex >= totalDays) {
      // All days unlocked
      target = addDaysLocal(day0, totalDays);
      target.setHours(unlockHour, 0, 0, 0);
      mode = "after";
    } else {
      // Count to the next unlock at local unlockHour
      target = addDaysLocal(day0, nextIndex);
      target.setHours(unlockHour, 0, 0, 0);
      mode = "during";
    }
  }

  // Compute delta (always show seconds; clamp at zero when finished)
  let delta = target.getTime() - nowMs;
  if (delta < 0 && mode === "after") delta = 0;

  const abs = Math.max(0, Math.abs(delta));
  const totalSeconds = Math.floor(abs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const label =
    mode === "before" ? labelBefore :
    mode === "during" ? labelDuring :
    labelAfter;

  return (
    <div className={className}>
      <div className="text-sm text-slate-600">{label}</div>
      {/* Prevent line breaks */}
      <div className="tabular-nums text-xl font-semibold whitespace-nowrap">
        {pad(days)}d : {pad(hours)}h : {pad(minutes)}m : {pad(seconds)}s
      </div>
    </div>
  );
}

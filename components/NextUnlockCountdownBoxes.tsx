"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  launchLocal: string;  // e.g. "2025-12-01T00:00:00" (local)
  totalDays: number;    // e.g. 13
  unlockHour?: number;  // 0..23, defaults 0
  nowMs?: number;       // optional base "now" from ?now=
  className?: string;   // e.g. "cd-compact"
  title?: string;       // e.g. "Next unlock in"
};

const DAY_MS = 24 * 60 * 60 * 1000;
const pad2 = (n: number) => String(n).padStart(2, "0");

function Unit({ value, label }: { value: string; label: string }) {
  return (
    <div className="cd-unit">
      <div className="cd-value cd-bump">{value}</div>
      <div className="cd-label">{label}</div>
    </div>
  );
}

export default function NextUnlockCountdownBoxes({
  launchLocal,
  totalDays,
  unlockHour = 0,
  nowMs,
  className,
  title = "Next unlock in",
}: Props) {
  // Hydration-safe: render a static shell on SSR, swap to live after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Keep ticking in the client so ?now= acts as a base that advances.
  const mountedAt = useRef<number>(Date.now());
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Current ms: on SSR, do not add elapsed (mounted=false); on client, add elapsed.
  const current = (nowMs != null ? nowMs : Date.now()) + (mounted ? (Date.now() - mountedAt.current) : 0);

  // Compute the next unlock purely by local clock to avoid DST issues.
  const baseStart = useMemo(() => {
    const d = new Date(launchLocal);  // local
    d.setHours(unlockHour, 0, 0, 0);
    return d;
  }, [launchLocal, unlockHour]);

  const end = useMemo(() => {
    const d = new Date(baseStart);
    d.setDate(d.getDate() + totalDays); // after last unlock
    return d;
  }, [baseStart, totalDays]);

  let targetMs: number;
  if (current < baseStart.getTime()) {
    targetMs = baseStart.getTime(); // before first unlock
  } else if (current >= end.getTime()) {
    targetMs = end.getTime();       // after all unlocks
  } else {
    const nowLocal = new Date(current);
    const next = new Date(nowLocal);
    next.setHours(unlockHour, 0, 0, 0);
    if (nowLocal >= next) next.setDate(next.getDate() + 1);
    targetMs = next.getTime();      // during event: next local unlock
  }

  const diff = Math.max(0, targetMs - current);
  const totalSeconds = Math.floor(diff / 1000);
  const days  = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins  = Math.floor((totalSeconds % 3600) / 60);
  const secs  = totalSeconds % 60;

  // SSR shell (stable) vs live numbers after mount
  const shell = (
    <div className="cd-row" suppressHydrationWarning>
      <Unit value="--" label="Days" />
      <span className="cd-sep">:</span>
      <Unit value="--" label="Hours" />
      <span className="cd-sep">:</span>
      <Unit value="--" label="Minutes" />
      <span className="cd-sep">:</span>
      <Unit value="--" label="Seconds" />
    </div>
  );

  const live = (
    <div className="cd-row" suppressHydrationWarning>
      <Unit value={String(days)} label="Days" />
      <span className="cd-sep">:</span>
      <Unit value={pad2(hours)} label="Hours" />
      <span className="cd-sep">:</span>
      <Unit value={pad2(mins)} label="Minutes" />
      <span className="cd-sep">:</span>
      <Unit value={pad2(secs)} label="Seconds" />
    </div>
  );

  return (
    <div className={`cd-wrap ${className ?? ""}`}>
      <div className="countdown-title themed" style={{ marginBottom: 6 }}>{title}</div>
      {mounted ? live : shell}
    </div>
  );
}

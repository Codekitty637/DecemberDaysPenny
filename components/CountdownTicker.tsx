"use client";
import { useEffect, useMemo, useState } from "react";

type Props = {
  targetIso: string;               // e.g., "2025-11-01T00:00:00-05:00"
  showSecondsAfterTarget?: boolean // default true (keeps :ss visible after the date)
  clampAtZero?: boolean;           // default true (stop at 0 after target)
  className?: string;
};

function pad(n: number) { return n.toString().padStart(2, "0"); }

export default function CountdownTicker({
  targetIso,
  showSecondsAfterTarget = true,
  clampAtZero = true,
  className
}: Props) {
  const target = useMemo(() => new Date(targetIso).getTime(), [targetIso]);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  let delta = target - now;

  // If we've passed the target
  if (delta <= 0) {
    if (clampAtZero) delta = 0; // freeze at zero
    // else: will be negative and continue counting up in absolute value if you want that behavior
  }

  const abs = Math.abs(delta);
  const totalSeconds = Math.floor(abs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Always show seconds; if you want to hide after target, toggle with showSecondsAfterTarget
  const showSeconds = showSecondsAfterTarget || delta > 0;

  return (
    <div className={className}>
      <span className="tabular-nums">
        {days}d : {pad(hours)}h : {pad(minutes)}m
        {showSeconds && <> : {pad(seconds)}s</>}
      </span>
    </div>
  );
}

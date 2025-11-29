import React from "react";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type ProgressState = "locked" | "unlocked" | "current";

export type DayKey =
  | 1|2|3|4|5|6|7|8|9|10|11|12|13;

export interface ProgressIconProps {
  day: DayKey;
  label: string;         // e.g., "Day 7 — Fatburger Friday"
  state?: ProgressState; // locked / current / unlocked
  size?: number;         // rendered px (default 48)
  className?: string;
}

const stroke = "#0f172a"; // slate-900
const fill   = "#caa557"; // gold accent
const lockedStroke = "#94a3b8"; // slate-400

const CircleBG = ({filled}:{filled:boolean}) => (
  <circle cx="32" cy="32" r="30"
    fill={filled ? fill : "none"}
    stroke={filled ? "none" : stroke}
    strokeWidth="2.5"
  />
);

function Glyph({day}:{day: DayKey}) {
  const sw = 2.5;
  switch(day) {
    case 1:
      return (
        <>
          <circle cx="24" cy="32" r="6" stroke={stroke} strokeWidth={sw} fill="none"/>
          <circle cx="40" cy="32" r="6" stroke={stroke} strokeWidth={sw} fill="none"/>
          <circle cx="32" cy="20" r="6" stroke={stroke} strokeWidth={sw} fill="none"/>
          <circle cx="32" cy="44" r="6" stroke={stroke} strokeWidth={sw} fill="none"/>
        </>
      );
    case 2:
      return (
        <path d="M26 22v18a6 6 0 1 0 4 5.7V26l16-4v14a6 6 0 1 0 4 5.7V18l-24 6z"
          fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
      );
    case 3:
      return (
        <>
          <path d="M14 36h36v10H14zM14 30h18a6 6 0 0 0-6-6H14z" fill="none" stroke={stroke} strokeWidth={sw}/>
          <path d="M46 22l2 4 4 .6-3 2.9.7 4.2-3.7-2-3.7 2 .7-4.2-3-2.9 4-.6z"
            fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
        </>
      );
    case 4:
      return (
        <>
          <path d="M16 40a16 16 0 0 1 32 0v6H16z" fill="none" stroke={stroke} strokeWidth={sw}/>
          <path d="M20 34c2-2 6-3 8-3" stroke={stroke} strokeWidth={sw} fill="none"/>
          <path d="M28 31c3-1 8-1 12 1" stroke={stroke} strokeWidth={sw} fill="none"/>
        </>
      );
    case 5:
      return (
        <>
          <path d="M22 18h20c0 8-6 12-10 13v7h6v4H24v-4h6v-7c-4-1-10-5-10-13z"
            fill="none" stroke={stroke} strokeWidth={sw}/>
          <path d="M36 18c-2 3-8 3-10 0" stroke={stroke} strokeWidth={sw} fill="none"/>
        </>
      );
    case 6:
      return (
        <>
          <path d="M20 22c0 8 4 12 12 12s12-4 12-12" fill="none" stroke={stroke} strokeWidth={sw}/>
          <path d="M24 34c2 8 8 12 8 12s6-4 8-12" fill="none" stroke={stroke} strokeWidth={sw}/>
        </>
      );
    case 7:
      return (
        <>
          <rect x="16" y="26" width="32" height="6" rx="3" fill="none" stroke={stroke} strokeWidth={sw}/>
          <rect x="18" y="36" width="28" height="8" rx="3" fill="none" stroke={stroke} strokeWidth={sw}/>
          <path d="M18 26a14 14 0 0 1 28 0" fill="none" stroke={stroke} strokeWidth={sw}/>
        </>
      );
    case 8:
      return (
        <>
          <path d="M20 20h24M28 20l16 0-12 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/>
          <rect x="18" y="18" width="28" height="28" rx="4" fill="none" stroke={stroke} strokeWidth={sw}/>
        </>
      );
    case 9:
      return (
        <>
          <circle cx="32" cy="32" r="14" fill="none" stroke={stroke} strokeWidth={sw}/>
          <path d="M28 28l12-4-4 12-12 4z" fill="none" stroke={stroke} strokeWidth={sw}/>
        </>
      );
    case 10:
      return (
        <>
          <rect x="20" y="24" width="24" height="16" rx="2" fill="none" stroke={stroke} strokeWidth={sw}/>
          <path d="M44 28h4a6 6 0 0 1-6 6" fill="none" stroke={stroke} strokeWidth={sw}/>
          <path d="M26 20c0 3-2 3-2 6M32 20c0 3-2 3-2 6M38 20c0 3-2 3-2 6" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/>
        </>
      );
    case 11:
      return (
        <path d="M40 18a16 16 0 1 1-16 26 14 14 0 1 0 16-26z" fill="none" stroke={stroke} strokeWidth={sw}/>
      );
    case 12:
      return (
        <>
          <rect x="26" y="16" width="12" height="18" rx="6" fill="none" stroke={stroke} strokeWidth={sw}/>
          <path d="M20 30a12 12 0 0 0 24 0M32 42v6" fill="none" stroke={stroke} strokeWidth={sw}/>
        </>
      );
    case 13:
      return (
        <>
          <path d="M20 36c6-10 18-10 24 0-6 2-18 2-24 0z" fill="none" stroke={stroke} strokeWidth={sw}/>
          <path d="M30 24l4-6 4 6" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/>
          <circle cx="34" cy="22" r="1.5" fill={stroke}/>
        </>
      );
      }
}

export default function ProgressIcon({
  day,
  label,
  state = "locked",
  size = 48,
  className
}: ProgressIconProps) {
  const filled = state !== "locked";
  const aria =
    state === "current" ? `${label} (in progress)` :
    state === "unlocked" ? `${label} (completed)` :
    `${label} (locked)`;

  return (
    <span
      role="img"
      aria-label={aria}
      title={label}
      className={cx("inline-block", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
        <CircleBG filled={filled} />
        <g
          stroke={state === "locked" ? lockedStroke : stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          <Glyph day={day} />
        </g>
        {state === "locked" && (
          <g opacity="0.9">
            <path
              d="M24 30v-4a8 8 0 1 1 16 0v4M22 30h20v14H22z"
              stroke={lockedStroke}
              strokeWidth="2.5"
              fill="none"
            />
          </g>
        )}
      </svg>
    </span>
  );
}

'use client';

import { useEffect, useState, useRef } from 'react';
import puzzlesData from '../puzzles.json';
import PuzzleFilmstrip, { type FilmstripPuzzle } from '../components/PuzzleFilmstrip';
import NextUnlockCountdownBoxes from '../components/NextUnlockCountdownBoxes';

/* ========= Confetti helpers ========= */
async function fireConfettiBurst() {
  try {
    const m = await import('canvas-confetti');
    m.default({
      particleCount: 120,
      spread: 70,
      startVelocity: 45,
      gravity: 0.8,
      ticks: 220,
      scalar: 0.9,
      colors: ['#caa557', '#0f172a', '#ffffff'],
    });
  } catch {}
}
async function fireKDayShow() {
  try {
    const m = await import('canvas-confetti');
    const base = {
      particleCount: 160,
      spread: 120,
      gravity: 0.9,
      ticks: 240,
      scalar: 1.0,
      colors: ['#caa557', '#0f172a', '#ffffff'],
    };
    m.default({ ...base, origin: { x: 0.18, y: 0.4 } });
    m.default({ ...base, origin: { x: 0.82, y: 0.4 } });
    setTimeout(() => m.default({ ...base, particleCount: 220, origin: { y: 0.6 } }), 300);
  } catch {}
}
function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

/* ========= Dates / helpers ========= */
const LAUNCH_DATE = new Date('2025-11-01T00:00:00');
const BDAY_DATE   = new Date('2025-11-16T00:00:00');

function getNowMs(): number {
  try {
    const u = new URL(window.location.href);
    const raw = u.searchParams.get('now');
    if (!raw) return Date.now();
    const n = /^\d+$/.test(raw) ? Number(raw) : Date.parse(raw);
    return Number.isFinite(n) ? n : Date.now();
  } catch {
    return Date.now();
  }
}

/* ========= Prelaunch boxed countdown (hydration-safe) ========= */
function getPartsBox(target: Date, currentMs: number) {
  const diff = Math.max(0, target.getTime() - currentMs);
  const s = Math.floor(diff / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins  = Math.floor((s % 3600) / 60);
  const secs  = s % 60;
  return { days, hours, mins, secs };
}
const pad2 = (v: number) => String(v).padStart(2, '0');

function PrelaunchCountdownBoxes({
  target,
  nowMs,  // base test time from ?now=
  title = '15 days of Keenan begins in',
  subtitle = 'November 1 — 12:00 AM (your time)',
}: {
  target: Date;
  nowMs?: number;
  title?: string;
  subtitle?: string;
}) {
  const mountedAt = useRef<number>(Date.now());
  const [mounted, setMounted] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // When testing (?now provided), advance from that base after mount.
  // On server (mounted=false) render a stable shell to avoid hydration mismatches.
  const current = (nowMs != null ? nowMs : Date.now()) + (mounted ? (Date.now() - mountedAt.current) : 0);
  const { days, hours, mins, secs } = getPartsBox(target, current);

  const Unit = ({ value, label }: { value: string; label: string }) => (
    <div className="cd-unit">
      <div className="cd-value cd-bump">{value}</div>
      <div className="cd-label">{label}</div>
    </div>
  );

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
    <div className="cd-wrap">
      <h1 className="countdown-title themed">{title}</h1>
      {mounted ? live : shell}
      <p className="countdown-sub">{subtitle}</p>
    </div>
  );
}

/* ========= Page ========= */
export default function Page() {
  const fsPuzzles = puzzlesData as FilmstripPuzzle[];

  // unified "now" (supports ?now=...)
  const [nowMs, setNowMs] = useState<number>(() => getNowMs());
  const [hasNowParam, setHasNowParam] = useState(false);

  useEffect(() => {
    const u = new URL(window.location.href);
    const has = u.searchParams.has('now');
    setHasNowParam(has);
    if (!has) {
      const t = setInterval(() => setNowMs(Date.now()), 1000);
      return () => clearInterval(t);
    }
  }, []);

  // tick to keep time-based UI moving even with ?now= (treat nowMs as base)
  const mountedAtRef = useRef<number>(Date.now());
  const [, setPageTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPageTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // derive the live "current" ms from base (?now or real clock)
  const baseNow = hasNowParam ? nowMs : Date.now();
  const currentMs = baseNow + (hasNowParam ? (Date.now() - mountedAtRef.current) : 0);

  // compute time-based day progression
  const DAY_MS = 24 * 60 * 60 * 1000;
  const start = new Date('2025-11-01T00:00:00'); // local unlock hour = 0
  start.setHours(0, 0, 0, 0);
  const baseStartMs = start.getTime();

  let unlockedDays = 0;        // 0..fsPuzzles.length  (# of days that have started)
  let todayIndex   = -1;       // -1 prelaunch, else 0..(len-1)
  if (currentMs >= baseStartMs) {
    const elapsedDays = Math.floor((currentMs - baseStartMs) / DAY_MS);
    unlockedDays = Math.min(fsPuzzles.length, elapsedDays + 1);
    todayIndex   = Math.min(fsPuzzles.length - 1, elapsedDays);
  }

  // NEW — broadcast the unified active index so the filmstrip/tiles can follow the gold cursor.
  useEffect(() => {
    // note: harmless no-op if nobody listens
    window.dispatchEvent(new CustomEvent('kdays:active-index', { detail: { index: todayIndex } }));
  }, [todayIndex]);

  // gold fill based on day position (not solves): 0% at day 1 start, 100% at day 15 start
  const dayFillPct =
    fsPuzzles.length > 1
      ? Math.max(0, Math.min(100, ((unlockedDays - 1) / (fsPuzzles.length - 1)) * 100))
      : 0;

  const beforeTarget = currentMs < LAUNCH_DATE.getTime();

  // celebrations
  useEffect(() => {
    if (currentMs >= LAUNCH_DATE.getTime()) {
      const k = 'seen_launch_celebration';
      if (!localStorage.getItem(k)) {
        fireKDayShow();
        localStorage.setItem(k, '1');
      }
    }
  }, [currentMs]);
  useEffect(() => {
    if (currentMs >= BDAY_DATE.getTime()) {
      const k = 'seen_bday_celebration';
      if (!localStorage.getItem(k)) {
        fireKDayShow();
        localStorage.setItem(k, '1');
      }
    }
  }, [currentMs]);

  // filmstrip progress (still reflects puzzles solved)
  const [doneCount, setDoneCount] = useState(0);
  const progressPct =
    fsPuzzles.length > 0 ? Math.round((doneCount / fsPuzzles.length) * 100) : 0;

  useEffect(() => {
    if (progressPct === 100 && fsPuzzles.length > 0) {
      fireKDayShow();
    }
  }, [progressPct, fsPuzzles.length]);

  const mounted = useMounted();

  return (
    <div className="container">
      <div className="page">
        {/* ===== Prelaunch (boxed) ===== */}
        <div
          className="prelaunch"
          style={{ display: mounted && beforeTarget ? 'block' : 'none' }}
        >
          <PrelaunchCountdownBoxes
            target={LAUNCH_DATE}
            nowMs={hasNowParam ? nowMs : undefined}
          />
          <img
            src="/logo.png?v=2"
            alt="15 Days of Keenan logo"
            className="prelaunch-logo"
            width={600}
            height={600}
          />
        </div>

        {/* ===== Post-launch ===== */}
        <div style={{ display: mounted && !beforeTarget ? 'block' : 'none' }}>
          {/* Banner */}
          <section className="banner">
            <div className="banner-inner">
              <div className="banner-header">
                <img src="/logo.png" alt="15 Days of Keenan logo" className="banner-logo" />
                <div className="banner-text">
                  <h1 className="banner-title">15 Days of Keenan</h1>
                  <div className="rule" />
                  <p className="banner-sub">A playful, luxury-coded quest of clues &amp; surprises</p>
                </div>
              </div>
            </div>
          </section>

          {/* Progress */}
          <section className="progress">
            <div className="progress-header">
              <span>K-Day Quest</span>
              <span>{progressPct}%</span>
            </div>

            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${dayFillPct}%` }} />
              <div className="progress-marks">
                {fsPuzzles.map((p, i) => {
                  const isLast = i === fsPuzzles.length - 1;
                  const iconSrc = isLast ? '/milestones/kday.png' : `/milestones/m${i + 1}.png`;
                  const leftPct = fsPuzzles.length > 1 ? (i / (fsPuzzles.length - 1)) * 100 : 0;

                  // time-based state: unlocked < today (glow) < locked
                  const stateClass =
                    todayIndex < 0   ? 'mark-locked'   :
                    i < todayIndex   ? 'mark-unlocked' :
                    i === todayIndex ? 'mark-current'  :
                                       'mark-locked';

                  return (
                    <div
                      key={p.id}
                      className={`mark ${stateClass} ${isLast ? 'mark-last' : ''}`}
                      style={{ left: `${leftPct}%` }}
                      title={isLast ? 'K-Day!' : `Milestone ${i + 1}`}
                    >
                      <img src={iconSrc} alt="" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Boxed compact countdown under the meter */}
            <NextUnlockCountdownBoxes
              launchLocal="2025-11-01T00:00:00"
              totalDays={fsPuzzles.length}
              unlockHour={0}
              nowMs={hasNowParam ? nowMs : undefined}
              className="cd-compact"
              title="Next unlock in"
            />
          </section>

          {/* Hero */}
          <section className="hero">
            <video className="hero-video" src="/hero.mp4" autoPlay loop muted playsInline />
            <div className="hero-text">
              <h2 className="hero-title">Your Quest Awaits</h2>
              <p className="hero-body">
                Solve each clue to advance along the path. Each solved panel becomes a badge, and the next step appears below.
              </p>
            </div>
          </section>

          {/* Filmstrip */}
          <section className="panel">
            <p className="subtitle">Your Journey</p>
            <PuzzleFilmstrip
              puzzles={fsPuzzles}
              checkAnswer={async (puzzleId: string, input: string) => {
                const res = await fetch('/api/submit', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ puzzleId, answer: input }),
                });
                const data = await res.json();
                return { correct: !!data.correct, revealText: data.revealText as string | undefined };
              }}
              onMilestone={({ completedCount }) => {
                fireConfettiBurst();
                if (completedCount === fsPuzzles.length) fireKDayShow();
              }}
              onProgressChange={(n) => setDoneCount(n)}
              launchAtMs={LAUNCH_DATE.getTime()}
              nowMs={hasNowParam ? nowMs : undefined}
              /* No prop changes here; we broadcast active day via kdays:active-index */
            />
            <div className="footer" style={{ marginTop: 12 }}>
              Made with ❤️ by 💎❤️
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

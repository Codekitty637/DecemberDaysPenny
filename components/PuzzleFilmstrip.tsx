'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './PuzzleFilmstrip.module.css';

export type FilmstripPuzzle = {
  id: string;
  title?: string;
  question: string;
  answer: string | string[];
  hint?: string;
  revealText?: string;
  imageUrl?: string;
};

type TileVisibility = 'current' | 'unlocked' | 'all';

type Props = {
  puzzles: FilmstripPuzzle[];
  launchAtMs: number;
  nowMs?: number;
  checkAnswer?: (
    puzzleId: string,
    input: string
  ) => Promise<{ correct: boolean; revealText?: string }>;
  onMilestone?: (p: { completedCount: number; justCompletedId: string }) => void;
  onProgressChange?: (completedCount: number) => void;
  tileVisibility?: TileVisibility; // default 'unlocked'
  /** whose progress to record on the server (defaults to 'Penny') */
  playerId?: string;
};

type Progress = {
  completedIds: string[];
  attemptsById: Record<string, number>;
  currentIdx: number;
  revealById: Record<string, string | undefined>;
  acceptedAnswerById: Record<string, string | undefined>;
};

const STORAGE_KEY = 'PennyDays-progress';

/** Robustly parse ?now=... (epoch ms, ISO, or common US/EU date forms) */
function getNowOverrideFromQuery(): number | undefined {
  if (typeof window === 'undefined') return;
  const sp = new URLSearchParams(window.location.search);
  const rawParam = sp.get('now');
  if (!rawParam) return;
  const raw = decodeURIComponent(rawParam.trim());

  // 1) pure number = epoch ms
  const asNum = Number(raw);
  if (!Number.isNaN(asNum) && isFinite(asNum)) return asNum;

  // 2) ISO / RFC-like string (2025-12-01T00:00 etc.)
  if (/^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2}))?/.test(raw)) {
    const t = Date.parse(raw);
    return Number.isNaN(t) ? undefined : t;
  }

  // 3) Common US/EUish date formats (12/01/2025, 01-12-2025 13:45, etc.)
  const m = raw.match(
    /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (m) {
    let [, a, b, y, hh, mm, ss] = m;
    const A = parseInt(a, 10);
    const B = parseInt(b, 10);
    let Y = parseInt(y, 10);
    if (Y < 100) Y += 2000;

    let month: number;
    let day: number;
    if (A <= 12 && B > 12) {
      month = A;
      day = B;
    } else if (A > 12 && B <= 12) {
      month = B;
      day = A;
    } else {
      month = A;
      day = B;
    }

    const H = hh ? parseInt(hh, 10) : 0;
    const M = mm ? parseInt(mm, 10) : 0;
    const S = ss ? parseInt(ss, 10) : 0;

    const d = new Date(Y, month - 1, day, H, M, S);
    if (!Number.isNaN(d.getTime())) return d.getTime();
  }

  // 4) Last resort: Date.parse
  const fallback = Date.parse(raw);
  return Number.isNaN(fallback) ? undefined : fallback;
}

function norm(s: string) {
  return s.trim().replace(/\s+/g, ' ').toLowerCase();
}

export default function PuzzlesFilmstrip({
  puzzles,
  launchAtMs,
  nowMs,
  checkAnswer,
  onMilestone,
  onProgressChange,
  tileVisibility = 'unlocked',
  playerId = 'Penny',
}: Props) {
  const [progress, setProgress] = useState<Progress>({
    completedIds: [],
    attemptsById: {},
    currentIdx: 0,
    revealById: {},
    acceptedAnswerById: {},
  });

  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [hintVisible, setHintVisible] = useState(false);

  const [queryNow, setQueryNow] = useState<number | undefined>(undefined);
  useEffect(() => {
    setQueryNow(getNowOverrideFromQuery());
  }, []);

  const now = nowMs ?? queryNow ?? Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  const availableCount = useMemo(() => {
    const diff = Math.floor((now - launchAtMs) / DAY_MS);
    return Math.max(0, Math.min(puzzles.length, diff + 1));
  }, [now, launchAtMs, puzzles.length]);

  // Load progress from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Progress;
        if (parsed && Array.isArray(parsed.completedIds)) {
          const clampedIdx = Math.max(
            0,
            Math.min(parsed.currentIdx, Math.max(availableCount - 1, 0))
          );
          setProgress({
            completedIds: parsed.completedIds,
            attemptsById: parsed.attemptsById ?? {},
            currentIdx: clampedIdx,
            revealById: parsed.revealById ?? {},
            acceptedAnswerById: parsed.acceptedAnswerById ?? {},
          });
        }
      }
    } catch {
      // ignore
    }
  }, [availableCount]);

  // Hydrate with server progress for this player
  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const res = await fetch(
          `/api/progress?player=${encodeURIComponent(playerId)}`,
          { cache: 'no-store' }
        );
        const data: {
          ok: boolean;
          rows?: Array<{ puzzleId: string; answer: string; meta?: any }>;
        } = await res.json();

        if (!data?.ok || !data.rows || cancelled) return;

        const serverCompleted = new Set<string>();
        const serverAccepted: Record<string, string> = {};

        for (const r of data.rows) {
          serverCompleted.add(r.puzzleId);
          if (r.answer) serverAccepted[r.puzzleId] = r.answer;
        }

        setProgress(prev => {
          const mergedCompleted = Array.from(
            new Set([...prev.completedIds, ...serverCompleted])
          );
          const mergedAccepted = {
            ...prev.acceptedAnswerById,
            ...serverAccepted,
          };
          return {
            ...prev,
            completedIds: mergedCompleted,
            acceptedAnswerById: mergedAccepted,
          };
        });
      } catch {
        // ignore network errors; local progress still works
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  // Save progress to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // ignore
    }
  }, [progress]);

  // Bubble up progress count
  useEffect(() => {
    onProgressChange?.(progress.completedIds.length);
  }, [progress.completedIds.length, onProgressChange]);

  // Clamp current index within unlocked range as time changes
  useEffect(() => {
    setProgress(prev => {
      const maxIdx = Math.max(
        0,
        Math.min(prev.currentIdx, Math.max(availableCount - 1, 0))
      );
      return prev.currentIdx === maxIdx ? prev : { ...prev, currentIdx: maxIdx };
    });
  }, [availableCount]);

  const current = puzzles[progress.currentIdx];
  const isLocked = progress.currentIdx >= availableCount;
  const isSolved = current ? progress.completedIds.includes(current.id) : false;

  // Which tiles should be visible
  const visibleTiles = useMemo(() => {
    if (tileVisibility === 'current') {
      return current ? [current] : [];
    }
    if (tileVisibility === 'unlocked') {
      return puzzles.slice(0, availableCount);
    }
    return puzzles; // 'all'
  }, [tileVisibility, puzzles, availableCount, current]);

  // Auto-scroll the detail block into view on selection/advance
  const detailRef = useRef<HTMLDivElement | null>(null);
  const scrollDetailIntoView = () => {
    detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    scrollDetailIntoView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress.currentIdx]);

  // ---- server save helper ----
  async function saveSolveToServer(
    puzzleId: string,
    answer: string,
    dayNumber: number,
    title?: string
  ) {
    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          puzzleId,
          answer,
          meta: { title, day: dayNumber },
        }),
      });
    } catch {
      // ignore network errors; local still works
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!current) return;

    const raw = input;
    const user = norm(raw);
    const accepted = Array.isArray(current.answer)
      ? current.answer
      : [current.answer];
    const normAccepted = accepted.map(a => norm(a));

    let correct = normAccepted.includes(user);
    let revealText: string | undefined = current.revealText;

    if (!correct && checkAnswer) {
      try {
        const res = await checkAnswer(current.id, raw);
        correct = res.correct;
        if (res.revealText) revealText = res.revealText;
      } catch {
        // ignore
      }
    }

    if (correct) {
      const dayNumber = progress.currentIdx + 1;

      void saveSolveToServer(current.id, raw, dayNumber, current.title);

      setProgress(prev => {
        const already = prev.completedIds.includes(current.id);
        const newCompleted = already
          ? prev.completedIds
          : [...prev.completedIds, current.id];

        const nextIdx = Math.min(
          prev.currentIdx + 1,
          Math.max(availableCount - 1, 0),
          puzzles.length - 1
        );

        const updated: Progress = {
          ...prev,
          completedIds: newCompleted,
          acceptedAnswerById: {
            ...prev.acceptedAnswerById,
            [current.id]: raw,
          },
          revealById: {
            ...prev.revealById,
            [current.id]: revealText,
          },
          currentIdx: nextIdx,
        };

        if (!already) {
          onMilestone?.({
            completedCount: newCompleted.length,
            justCompletedId: current.id,
          });
        }

        return updated;
      });

      setFeedback('✅ Correct!');
      setHintVisible(false);
      setInput('');
      setTimeout(scrollDetailIntoView, 50);
    } else {
      setFeedback('❌ Try again!');
      setProgress(prev => ({
        ...prev,
        attemptsById: {
          ...prev.attemptsById,
          [current.id]: (prev.attemptsById[current.id] ?? 0) + 1,
        },
      }));
    }
  }

  return (
    <div className={styles.filmstrip}>
      {/* Detail first (mobile-friendly) */}
      {current && (
        <div ref={detailRef} className={styles.detail}>
          <div className={styles.detailGrid}>
            <div>
              <div className={styles.prompt}>{current.question}</div>

              {!isLocked && !isSolved && (
                <form onSubmit={handleSubmit} className={styles.formRow}>
                  <input
                    className={styles.input}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Enter answer"
                  />
                  <button
                    className={styles.button}
                    type="submit"
                    disabled={!input}
                  >
                    Submit
                  </button>
                </form>
              )}

              {feedback && <div className={styles.correct}>{feedback}</div>}

              {isSolved && (
                <>
                  {progress.acceptedAnswerById[current.id] && (
                    <div className={styles.reveal}>
                      <strong>Accepted answer:</strong>{' '}
                      {progress.acceptedAnswerById[current.id]}
                    </div>
                  )}
                  {progress.revealById[current.id] && (
                    <div className={styles.reveal}>
                      {progress.revealById[current.id]}
                    </div>
                  )}
                </>
              )}

              {!isSolved && current.hint && (
                <>
                  {!isLocked && !hintVisible && (
                    <button
                      className={styles.button}
                      onClick={() => setHintVisible(true)}
                      type="button"
                    >
                      Show Hint
                    </button>
                  )}
                  {hintVisible && (
                    <div className={styles.hint}>{current.hint}</div>
                  )}
                </>
              )}
            </div>

            {current.imageUrl && (
              <div className={styles.detailImg}>
                <img src={current.imageUrl} alt={current.title ?? ''} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tiles rail */}
      <div className={styles.railWrap}>
        <div className={styles.rail}>
          {visibleTiles.map(p => {
            const absoluteIndex =
              tileVisibility === 'current'
                ? progress.currentIdx
                : puzzles.findIndex(z => z.id === p.id);

            const completed = progress.completedIds.includes(p.id);
            const locked = absoluteIndex >= availableCount;
            const selected = absoluteIndex === progress.currentIdx;

            const tileClass = [
              styles.tile,
              selected && styles.tileSelected,
              completed && styles.tileCompleted,
              locked && styles.tileLocked,
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <button
                key={p.id}
                className={tileClass}
                onClick={() => {
                  if (!locked) {
                    setProgress(prev => ({
                      ...prev,
                      currentIdx: absoluteIndex,
                    }));
                    setTimeout(scrollDetailIntoView, 10);
                  }
                }}
                disabled={locked}
                title={
                  locked
                    ? 'Locked until its day unlocks'
                    : p.title ?? `Day ${absoluteIndex + 1}`
                }
              >
                {p.imageUrl && (
                  <div
                    className={styles.tileImg}
                    style={{
                      // quotes here let us safely handle filenames with spaces
                      backgroundImage: `url("${p.imageUrl}")`,
                    }}
                  />
                )}
                <div className={styles.tileOverlay} />
                <div className={styles.tileBadge}>
                  Day {absoluteIndex + 1}
                  {completed ? ' ✓' : ''}
                </div>
                <div className={styles.tileTitle}>
                  {p.title ?? `Puzzle ${absoluteIndex + 1}`}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

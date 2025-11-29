// app/api/submit/route.ts
import { NextResponse } from 'next/server';

// 👉 If your puzzles.json is at the **project root** (same as your repo root),
// and app/page.tsx imports it with "../puzzles.json",
// then this relative path is correct:
import puzzlesRaw from '../../../puzzles.json';

// ❗ If your puzzles.json actually lives at **app/puzzles.json**,
// then use this instead and delete the import above:
// import puzzlesRaw from '../../puzzles.json';

type Puzzle = {
  id: string;
  question: string;
  answer: string | string[];
  revealText?: string;
};

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

export async function POST(req: Request) {
  try {
    const { puzzleId, answer } = await req.json();

    if (!puzzleId) {
      return NextResponse.json({ correct: false }, { status: 400 });
    }

    const puzzles = puzzlesRaw as Puzzle[];
    const pz = puzzles.find((p) => p.id === String(puzzleId));

    if (!pz) {
      return NextResponse.json({ correct: false }, { status: 404 });
    }

    const user = normalize(String(answer || ''));
    const answers = Array.isArray(pz.answer) ? pz.answer : [pz.answer];
    const correct = answers.map(normalize).some((a) => a === user);

    return NextResponse.json({
      correct,
      revealText: correct ? pz.revealText ?? 'Correct!' : undefined,
    });
  } catch (err) {
    // Optional: log err for debugging
    return NextResponse.json({ correct: false }, { status: 500 });
  }
}

// lib/puzzles.ts
export type FilmstripPuzzle = {
  id: string;
  title?: string;
  question: string;
  answer: string | string[];
  hint?: string;
  imageUrl?: string;
  revealText?: string;
};

export function normalize(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")             // curly -> straight apostrophes
    .replace(/[^\p{Letter}\p{Number}']+/gu, '')  // keep letters/numbers/'
    .trim();
}

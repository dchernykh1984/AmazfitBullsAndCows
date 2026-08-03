// The difficulty levels, as plain data. A level is the shape of the secret (how
// many digits, whether a digit may appear twice) plus how many guesses the player
// gets. Pure, so the table and the clamping are unit tested rather than trusted.
//
// Classic Bulls and Cows is four distinct digits; three is the gentle version and
// five the long one. Expert keeps the classic four but lets digits repeat, which
// is the usual way of making the game harder: the "each digit appears once"
// deduction that carries most beginners stops working.

export const LEVELS = [
  { id: "easy", label: "level_easy", length: 3, allowRepeats: false, maxAttempts: 8 },
  { id: "classic", label: "level_classic", length: 4, allowRepeats: false, maxAttempts: 10 },
  { id: "hard", label: "level_hard", length: 5, allowRepeats: false, maxAttempts: 12 },
  { id: "expert", label: "level_expert", length: 4, allowRepeats: true, maxAttempts: 12 },
];

export const DEFAULT_LEVEL = 1;

// Clamp a stored or user-supplied level into the range of LEVELS; anything
// unusable falls back to the default rather than leaving the game without rules.
// Nothing-at-all is checked before the numeric coercion, because Number(null) and
// Number("") are both 0 - a fresh install would otherwise silently start on the
// first level instead of the default one.
export function clampLevel(level) {
  if (level === null || level === undefined || level === "") {
    return DEFAULT_LEVEL;
  }
  const index = Math.floor(Number(level));
  if (!Number.isFinite(index) || index < 0 || index >= LEVELS.length) {
    return DEFAULT_LEVEL;
  }
  return index;
}

// The next level in the cycle, so one button can walk through all of them.
export function nextLevel(level) {
  return (clampLevel(level) + 1) % LEVELS.length;
}

// The level config for an index, always defined.
export function levelAt(level) {
  return LEVELS[clampLevel(level)];
}

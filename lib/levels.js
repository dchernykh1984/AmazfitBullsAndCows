// The difficulty levels, as plain data. A level is the shape of the secret: how
// many digits, and whether a digit may appear twice. Nobody runs out of guesses,
// so a level does not carry a budget. Pure, so the table and the clamping are
// unit tested rather than trusted.
//
// Classic Bulls and Cows is four distinct digits; three is the gentle version and
// five the long one. Expert keeps the classic four but lets digits repeat, which
// is the usual way of making the game harder: the "each digit appears once"
// deduction that carries most beginners stops working.

export const LEVELS = [
  { id: "easy", label: "level_easy", length: 3, allowRepeats: false },
  { id: "classic", label: "level_classic", length: 4, allowRepeats: false },
  { id: "hard", label: "level_hard", length: 5, allowRepeats: false },
  { id: "expert", label: "level_expert", length: 4, allowRepeats: true },
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

// The index of the level with this id, for reading back a stored choice. Ids are
// what goes into storage rather than indexes, so inserting or reordering a
// difficulty cannot reopen the game on a different one - or, worse, hand a
// player someone else's record.
export function levelIndexOf(id) {
  for (let i = 0; i < LEVELS.length; i++) {
    if (LEVELS[i].id === id) {
      return i;
    }
  }
  return DEFAULT_LEVEL;
}

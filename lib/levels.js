// The difficulty levels, as plain data: a level is just how long the secret is.
// Nobody runs out of guesses, so a level carries no budget, and every code is
// made of distinct digits, so there is no second rule to explain. Pure, so the
// table and the clamping are unit tested rather than trusted.
//
// One dial with three positions - 3, 4 or 5 digits - and the button says the
// digit count rather than a name. A ladder that reads itself needs no legend,
// which a ladder of invented names did: "Expert" told a player nothing about
// what it would change.
//
// Four distinct digits is the classic game; three is the quick version and five
// the long one. Both are the documented ways of moving the difficulty.

export const LEVELS = [
  { id: "easy", label: "level_3", length: 3 },
  { id: "classic", label: "level_4", length: 4 },
  { id: "hard", label: "level_5", length: 5 },
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

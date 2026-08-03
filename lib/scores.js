// The persisted best result, kept pure so the storage contract is unit tested.
// The page owns the actual LocalStorage handle; this module owns the key names
// and the "is this a record" decision.
//
// The score here is the number of guesses a win took, so a *lower* score is
// better - the opposite of most games. Zero is not a score at all: it means the
// level has never been solved, which is what a fresh install reads back.

// A best is kept per difficulty: cracking a five-digit code in seven guesses says
// something quite different from doing it on three digits.
const BEST_KEY_PREFIX = "best_";

// Where the last chosen difficulty is remembered, so the game reopens the way it
// was left.
export const LEVEL_KEY = "level";

export const NO_BEST = 0;

export function bestKey(level) {
  return BEST_KEY_PREFIX + level;
}

// A stored value coerced to a usable attempt count. Storage can hand back a
// string, null or leftover junk from an older build; none of that may crash the
// game or show up on screen, so anything unusable reads as "never solved".
export function normalizeAttempts(value) {
  const attempts = Math.floor(Number(value));
  if (!Number.isFinite(attempts) || attempts < 0) {
    return NO_BEST;
  }
  return attempts;
}

export function hasBest(value) {
  return normalizeAttempts(value) > NO_BEST;
}

// The best after a solved game, and whether it is a new record. The first solve
// of a level always sets the record; after that only a shorter game does.
export function updateBest(previousBest, attempts) {
  const best = normalizeAttempts(previousBest);
  const used = normalizeAttempts(attempts);
  if (used <= NO_BEST) {
    return { best, isRecord: false };
  }
  if (best === NO_BEST || used < best) {
    return { best: used, isRecord: true };
  }
  return { best, isRecord: false };
}

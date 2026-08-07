// The persisted best result, kept pure so the storage contract is unit tested.
// The page owns the actual LocalStorage handle; this module owns the key names,
// how a result is written down, and which of two results is the better one.
//
// A result is the number of guesses a win took and how long it took, and *lower
// is better on both* - the opposite of most games. Guesses decide it; the time
// only separates two wins that took the same number of guesses, which happens
// constantly, because the guess counts are small integers.

// A best is kept per difficulty: cracking a five-digit code in seven guesses says
// something quite different from doing it on three digits. The key carries the
// level's id rather than its position in the table, so a level added in the
// middle later does not inherit another one's record.
const BEST_KEY_PREFIX = "best_";

// Where the last chosen difficulty is remembered, so the game reopens the way it
// was left. Also by id, for the same reason.
export const LEVEL_KEY = "level";

export const NO_BEST = 0;

export function bestKey(levelId) {
  return BEST_KEY_PREFIX + levelId;
}

// A stored value coerced to a usable guess count. Storage can hand back a string,
// null or leftover junk from an older build; none of that may crash the game or
// show up on screen, so anything unusable reads as "never solved".
export function normalizeAttempts(value) {
  const attempts = Math.floor(Number(value));
  if (!Number.isFinite(attempts) || attempts < 0) {
    return NO_BEST;
  }
  return attempts;
}

// The seconds of a stored result, or null when there are none to be had. A
// record set before the game measured time is a real record with no time, and it
// has to keep working rather than sort as if it took zero seconds.
function normalizeSeconds(value) {
  const seconds = typeof value === "number" ? value : Number.NaN;
  if (!Number.isFinite(seconds) || seconds < 0) {
    return null;
  }
  return Math.floor(seconds);
}

export function hasBest(value) {
  return normalizeAttempts(value) > NO_BEST;
}

// A result as it goes into storage: "guesses" or "guesses/seconds". Written as
// one short string rather than JSON because the whole record is two numbers, and
// a string survives a store that only keeps strings.
export function encodeResult(result) {
  const attempts = normalizeAttempts(result && result.attempts);
  if (attempts <= NO_BEST) {
    return "";
  }
  const seconds = normalizeSeconds(result && result.seconds);
  return seconds === null ? String(attempts) : attempts + "/" + seconds;
}

// A stored value read back as a result. Understands both what encodeResult
// writes and the bare guess count that earlier versions of the app stored, so a
// record set before this change survives the upgrade - it simply has no time.
export function decodeResult(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const parts = String(value).split("/");
  const attempts = normalizeAttempts(parts[0]);
  if (attempts <= NO_BEST) {
    return null;
  }
  const seconds = parts.length > 1 ? normalizeSeconds(Math.floor(Number(parts[1]))) : null;
  return { attempts, seconds };
}

// Whether `candidate` beats `best`. Fewer guesses wins; the same number of
// guesses is settled by the shorter time. A result with no time never displaces
// an equal one that has a time - there is nothing to compare, and the record
// already on the watch keeps its place.
export function beats(candidate, best) {
  if (candidate === null) {
    return false;
  }
  if (best === null) {
    return true;
  }
  if (candidate.attempts !== best.attempts) {
    return candidate.attempts < best.attempts;
  }
  if (candidate.seconds === null || best.seconds === null) {
    return false;
  }
  return candidate.seconds < best.seconds;
}

// The best after a solved game, and whether it is a new record. The first solve
// of a level always sets the record; after that only a better result does.
export function updateBest(previous, result) {
  const best = previous === null || previous === undefined ? null : previous;
  if (beats(result, best)) {
    return { best: result, isRecord: true };
  }
  return { best, isRecord: false };
}

// The whole rule set, as plain data and functions with no Zepp OS dependency, so
// every rule is exercised by the unit tests rather than by squinting at a watch.
// The page owns pixels and input; this module owns truth.
//
// Bulls and Cows: the watch picks a secret code of distinct digits and the player
// guesses it. Every guess is answered with two counts - bulls, the digits that are
// right and in the right place, and cows, the digits that are in the code but
// somewhere else. The game is turn based, so a game is a mutable plain object that
// grows by one history entry per guess.

// A code is made of decimal digits.
export const DIGIT_COUNT = 10;

// Code lengths the rules will accept. Two is the shortest code that is still a
// deduction rather than a coin toss; eight keeps a distinct-digit code well inside
// the ten available digits and fits the watch screen.
export const MIN_LENGTH = 2;
export const MAX_LENGTH = 8;

// Guesses the player may get. One is enough to play a (very short) game, and the
// upper bound keeps a stored or hand-passed value from producing an endless one.
export const MIN_ATTEMPTS = 1;
export const MAX_ATTEMPTS = 30;

// Game states.
export const RUNNING = "running";
export const WON = "won";
export const LOST = "lost";

// Why a guess was refused. The page uses these to stay silent rather than to
// explain: a guess it never lets the player compose cannot be rejected in the
// first place, and these are the belt to that pair of braces.
export const NOT_RUNNING = "finished";
export const WRONG_LENGTH = "length";
export const NOT_A_DIGIT = "digit";
export const REPEATED_DIGIT = "repeat";

export function isDigit(value) {
  return Number.isInteger(value) && value >= 0 && value < DIGIT_COUNT;
}

// A whole number in [0, bound), from a random source that is only promised to be
// in [0, 1). Math.random() never returns 1, but an injected one might, and a
// single out-of-range index would put a digit nobody can guess into the code.
function pickIndex(random, bound) {
  return Math.min(bound - 1, Math.max(0, Math.floor(random() * bound)));
}

// A stored, hand-passed or otherwise untrusted number, forced into a usable
// range. Anything that is not a number at all takes the fallback, which is not
// always an end of the range: an unreadable length should be the shortest code,
// but an unreadable attempt budget should be the most generous one.
//
// The coercion is deliberately not left to Number(): Number(null), Number(""),
// Number(false) and Number([]) are all 0, so an empty value would sail past the
// finite check and clamp to the bottom of the range. A budget of "nothing at all"
// would then read as a one-guess game rather than as the missing value it is.
function clampInt(value, min, max, fallback) {
  const numeric = typeof value === "number" || (typeof value === "string" && value.trim() !== "");
  const number = numeric ? Math.floor(Number(value)) : NaN;
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, number));
}

// MAX_LENGTH is below DIGIT_COUNT, so a code of distinct digits always fits in
// the alphabet and the repeat rule does not enter into the length at all. The
// unit tests pin that relation.
function clampLength(length) {
  return clampInt(length, MIN_LENGTH, MAX_LENGTH, MIN_LENGTH);
}

export function hasRepeats(digits) {
  for (let i = 0; i < digits.length; i++) {
    if (digits.indexOf(digits[i]) !== i) {
      return true;
    }
  }
  return false;
}

// Whether a value is a usable code: an array of digits of a legal length that
// honours the repeat rule. Used to vet both a hand-passed secret and a guess.
export function isCode(digits, allowRepeats) {
  if (!Array.isArray(digits)) {
    return false;
  }
  if (digits.length < MIN_LENGTH || digits.length > MAX_LENGTH) {
    return false;
  }
  for (let i = 0; i < digits.length; i++) {
    if (!isDigit(digits[i])) {
      return false;
    }
  }
  return allowRepeats || !hasRepeats(digits);
}

// The bulls and cows a guess earns against a secret. Bulls are counted first and
// the remaining digits are matched as multisets, so a digit is never counted
// twice: with repeats allowed, guessing 1122 against 1213 is one bull (the first
// 1) and two cows (the second 1 and one 2), not four of something.
export function scoreGuess(secret, guess) {
  const length = Math.min(secret.length, guess.length);
  const secretCounts = [];
  const guessCounts = [];
  for (let d = 0; d < DIGIT_COUNT; d++) {
    secretCounts.push(0);
    guessCounts.push(0);
  }

  let bulls = 0;
  for (let i = 0; i < length; i++) {
    const wanted = secret[i];
    const tried = guess[i];
    if (isDigit(wanted) && wanted === tried) {
      bulls += 1;
      continue;
    }
    if (isDigit(wanted)) {
      secretCounts[wanted] += 1;
    }
    if (isDigit(tried)) {
      guessCounts[tried] += 1;
    }
  }

  let cows = 0;
  for (let d = 0; d < DIGIT_COUNT; d++) {
    cows += Math.min(secretCounts[d], guessCounts[d]);
  }
  return { bulls, cows };
}

// A uniformly random secret. The code never starts with a zero, which is the
// official rule: a leading zero reads as a shorter number on the screen and the
// player would have to be told it can happen. `random` is injectable so the tests
// can pin a code; on the watch it is Math.random.
export function makeSecret(length, allowRepeats, random) {
  const size = clampLength(length);
  const rng = typeof random === "function" ? random : Math.random;

  if (allowRepeats) {
    const digits = [1 + pickIndex(rng, DIGIT_COUNT - 1)];
    for (let i = 1; i < size; i++) {
      digits.push(pickIndex(rng, DIGIT_COUNT));
    }
    return digits;
  }

  const pool = [];
  for (let d = 0; d < DIGIT_COUNT; d++) {
    pool.push(d);
  }
  // The first digit is drawn from 1..9 only; the rest, zero included, from what
  // is left. Drawing from a shrinking pool keeps every legal code equally likely
  // instead of favouring the ones a "reroll the zero" fix would produce.
  const digits = [pool.splice(1 + pickIndex(rng, DIGIT_COUNT - 1), 1)[0]];
  for (let i = 1; i < size; i++) {
    digits.push(pool.splice(pickIndex(rng, pool.length), 1)[0]);
  }
  return digits;
}

// A fresh game. `length`, `allowRepeats` and `maxAttempts` come from the chosen
// difficulty; `secret` is optional and lets a caller (the tests today) play a
// known code. A secret that does not fit the rules is replaced by a random one
// rather than refused, because a watch game that throws on start is a black
// screen, and there is no way for a player to supply one anyway.
export function createGame(options, random) {
  const config = options || {};
  const allowRepeats = config.allowRepeats === true;
  const secret = isCode(config.secret, allowRepeats)
    ? config.secret.slice()
    : makeSecret(config.length, allowRepeats, random);

  return {
    length: secret.length,
    allowRepeats,
    maxAttempts: clampInt(config.maxAttempts, MIN_ATTEMPTS, MAX_ATTEMPTS, MAX_ATTEMPTS),
    secret,
    history: [],
    status: RUNNING,
  };
}

export function attemptsUsed(game) {
  return game.history.length;
}

export function attemptsLeft(game) {
  return Math.max(0, game.maxAttempts - game.history.length);
}

// Why this guess cannot be played, or null when it can.
export function guessProblem(game, digits) {
  if (game.status !== RUNNING) {
    return NOT_RUNNING;
  }
  if (!Array.isArray(digits) || digits.length !== game.length) {
    return WRONG_LENGTH;
  }
  for (let i = 0; i < digits.length; i++) {
    if (!isDigit(digits[i])) {
      return NOT_A_DIGIT;
    }
  }
  if (!game.allowRepeats && hasRepeats(digits)) {
    return REPEATED_DIGIT;
  }
  return null;
}

// Whether the digit is spent for the guess being composed - which is exactly when
// the keypad draws its key dim. With repeats allowed no digit is ever spent, so
// on that level the ring stays fully lit.
export function digitTaken(game, entered, digit) {
  return !game.allowRepeats && entered.indexOf(digit) !== -1;
}

// Whether the digit may be appended to the guess being composed. The keypad asks
// this before it takes a tap, which is why a rejected guess is a fallback and not
// the normal path.
export function acceptsDigit(game, entered, digit) {
  if (game.status !== RUNNING || !isDigit(digit) || entered.length >= game.length) {
    return false;
  }
  return !digitTaken(game, entered, digit);
}

// Play a guess. Returns what the page needs to redraw:
//   { accepted, reason, bulls, cows, status, entry }
// `entry` is the history row that was appended - the guess and its score. The
// game ends when every digit is a bull, or when the last attempt is spent.
export function submitGuess(game, digits) {
  const problem = guessProblem(game, digits);
  if (problem !== null) {
    return {
      accepted: false,
      reason: problem,
      bulls: 0,
      cows: 0,
      status: game.status,
      entry: null,
    };
  }

  const guess = digits.slice();
  const score = scoreGuess(game.secret, guess);
  const entry = { digits: guess, bulls: score.bulls, cows: score.cows };
  game.history.push(entry);

  if (score.bulls === game.length) {
    game.status = WON;
  } else if (game.history.length >= game.maxAttempts) {
    game.status = LOST;
  }

  return {
    accepted: true,
    reason: null,
    bulls: score.bulls,
    cows: score.cows,
    status: game.status,
    entry,
  };
}

// The digits as the screen shows them. Kept here so the history rows, the guess
// being composed and the revealed secret are all written the same way.
export function codeToText(digits) {
  let text = "";
  for (let i = 0; i < digits.length; i++) {
    text += isDigit(digits[i]) ? String(digits[i]) : "?";
  }
  return text;
}

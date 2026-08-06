import { describe, it, expect } from "vitest";
import {
  acceptsDigit,
  attemptsUsed,
  codeToText,
  createGame,
  digitTaken,
  guessProblem,
  hasRepeats,
  isCode,
  isDigit,
  makeSecret,
  scoreGuess,
  submitGuess,
  DIGIT_COUNT,
  MAX_LENGTH,
  MIN_LENGTH,
  NOT_A_DIGIT,
  NOT_RUNNING,
  REPEATED_DIGIT,
  RUNNING,
  WON,
  WRONG_LENGTH,
} from "../lib/bulls-and-cows.js";

// A deterministic stand-in for Math.random, cycling through fixed fractions so a
// test can pin exactly which code is drawn.
function fakeRandom(values) {
  let i = 0;
  return () => {
    const value = values[i % values.length];
    i += 1;
    return value;
  };
}

describe("the shape of a code", () => {
  it("can always be drawn from distinct digits, however long a level asks for", () => {
    // The whole repeat rule rests on this: a code of distinct digits can only
    // exist while it is no longer than the alphabet it draws from.
    expect(MAX_LENGTH).toBeLessThanOrEqual(DIGIT_COUNT);
    expect(MIN_LENGTH).toBeLessThan(MAX_LENGTH);
  });
});

describe("isDigit", () => {
  it("accepts exactly the ten decimal digits", () => {
    for (let d = 0; d < DIGIT_COUNT; d++) {
      expect(isDigit(d)).toBe(true);
    }
    expect(isDigit(10)).toBe(false);
    expect(isDigit(-1)).toBe(false);
    expect(isDigit(1.5)).toBe(false);
    expect(isDigit("3")).toBe(false);
    expect(isDigit(null)).toBe(false);
    expect(isDigit(undefined)).toBe(false);
    expect(isDigit(NaN)).toBe(false);
  });
});

describe("hasRepeats", () => {
  it("spots a digit used twice, wherever it sits", () => {
    expect(hasRepeats([1, 2, 3, 4])).toBe(false);
    expect(hasRepeats([1, 2, 3, 1])).toBe(true);
    expect(hasRepeats([0, 0])).toBe(true);
    expect(hasRepeats([])).toBe(false);
  });
});

describe("isCode", () => {
  it("accepts an array of digits of a legal length", () => {
    expect(isCode([1, 2, 3, 4], false)).toBe(true);
    expect(isCode([0, 9], false)).toBe(true);
  });

  it("refuses anything that is not a usable code", () => {
    expect(isCode([1], false)).toBe(false);
    expect(isCode(new Array(MAX_LENGTH + 1).fill(1), true)).toBe(false);
    expect(isCode([1, 2, "3"], false)).toBe(false);
    expect(isCode([1, 2, 10], true)).toBe(false);
    expect(isCode("1234", false)).toBe(false);
    expect(isCode(null, false)).toBe(false);
  });

  it("applies the repeat rule of the level", () => {
    expect(isCode([1, 1, 2], false)).toBe(false);
    expect(isCode([1, 1, 2], true)).toBe(true);
  });
});

describe("scoreGuess", () => {
  it("counts a digit in the right place as a bull", () => {
    expect(scoreGuess([1, 2, 3, 4], [1, 2, 3, 4])).toEqual({ bulls: 4, cows: 0 });
    expect(scoreGuess([1, 2, 3, 4], [1, 9, 8, 7])).toEqual({ bulls: 1, cows: 0 });
  });

  it("counts a digit in the wrong place as a cow", () => {
    expect(scoreGuess([1, 2, 3, 4], [4, 3, 2, 1])).toEqual({ bulls: 0, cows: 4 });
    expect(scoreGuess([1, 2, 3, 4], [1, 2, 4, 3])).toEqual({ bulls: 2, cows: 2 });
  });

  it("scores a guess with nothing in common as zero", () => {
    expect(scoreGuess([1, 2, 3, 4], [5, 6, 7, 8])).toEqual({ bulls: 0, cows: 0 });
  });

  it("treats zero as an ordinary digit", () => {
    expect(scoreGuess([0, 1, 2], [2, 1, 0])).toEqual({ bulls: 1, cows: 2 });
  });

  it("never counts one digit twice when digits repeat", () => {
    // Two 1s in the guess against one 1 in the secret: the bull takes it, and the
    // second 1 earns nothing.
    expect(scoreGuess([1, 2, 3, 4], [1, 1, 1, 1])).toEqual({ bulls: 1, cows: 0 });
    expect(scoreGuess([1, 2, 1, 3], [1, 1, 2, 2])).toEqual({ bulls: 1, cows: 2 });
    expect(scoreGuess([1, 1, 2, 2], [2, 2, 1, 1])).toEqual({ bulls: 0, cows: 4 });
  });

  it("keeps bulls and cows within the length of the code", () => {
    const secret = [1, 2, 3, 4];
    const guesses = [
      [1, 2, 3, 4],
      [4, 1, 2, 3],
      [1, 1, 2, 2],
      [5, 5, 5, 5],
      [0, 0, 0, 1],
    ];
    for (const guess of guesses) {
      const score = scoreGuess(secret, guess);
      expect(score.bulls + score.cows).toBeLessThanOrEqual(secret.length);
      expect(score.bulls).toBeGreaterThanOrEqual(0);
      expect(score.cows).toBeGreaterThanOrEqual(0);
    }
  });

  it("ignores junk rather than scoring it", () => {
    expect(scoreGuess([1, 2, 3], [null, undefined, "3"])).toEqual({ bulls: 0, cows: 0 });
  });
});

describe("makeSecret", () => {
  it("draws a code of the requested length", () => {
    expect(makeSecret(4, false, () => 0)).toHaveLength(4);
    expect(makeSecret(5, false, () => 0)).toHaveLength(5);
    expect(makeSecret(4, true, () => 0)).toHaveLength(4);
  });

  it("never repeats a digit unless the level allows it", () => {
    for (let seed = 0; seed <= 20; seed++) {
      const digits = makeSecret(5, false, fakeRandom([seed / 20, (seed + 7) / 27, seed / 23]));
      expect(hasRepeats(digits)).toBe(false);
    }
  });

  it("never starts with a zero", () => {
    for (let seed = 0; seed <= 20; seed++) {
      const random = fakeRandom([seed / 21]);
      expect(makeSecret(4, false, random)[0]).not.toBe(0);
      expect(makeSecret(4, true, fakeRandom([seed / 21]))[0]).not.toBe(0);
    }
  });

  it("stays inside the digit alphabet even if random returns exactly 1", () => {
    for (const allowRepeats of [false, true]) {
      const digits = makeSecret(5, allowRepeats, () => 1);
      for (const digit of digits) {
        expect(isDigit(digit)).toBe(true);
      }
    }
  });

  it("clamps an impossible length instead of hanging or failing", () => {
    expect(makeSecret(0, false, () => 0)).toHaveLength(MIN_LENGTH);
    expect(makeSecret(99, false, () => 0)).toHaveLength(MAX_LENGTH);
    expect(makeSecret("abc", false, () => 0)).toHaveLength(MIN_LENGTH);
  });

  it("can draw every digit of the alphabet across enough codes", () => {
    const seen = {};
    for (let seed = 0; seed < 200; seed++) {
      for (const digit of makeSecret(5, false, fakeRandom([seed / 200, (seed * 7) / 200]))) {
        seen[digit] = true;
      }
    }
    expect(Object.keys(seen).length).toBeGreaterThan(5);
  });

  it("falls back to Math.random when no source is given", () => {
    const digits = makeSecret(4, false);
    expect(isCode(digits, false)).toBe(true);
  });
});

describe("createGame", () => {
  it("starts running with an empty history and a legal secret", () => {
    const game = createGame({ length: 4, allowRepeats: false }, () => 0);
    expect(game.status).toBe(RUNNING);
    expect(game.history).toEqual([]);
    expect(game.length).toBe(4);
    expect(isCode(game.secret, false)).toBe(true);
    expect(attemptsUsed(game)).toBe(0);
  });

  it("plays a hand-passed secret and takes its length", () => {
    const game = createGame({ length: 4, secret: [9, 0, 4, 2] });
    expect(game.secret).toEqual([9, 0, 4, 2]);
    expect(game.length).toBe(4);
  });

  it("copies the hand-passed secret so the caller cannot mutate the game", () => {
    const secret = [9, 0, 4, 2];
    const game = createGame({ secret });
    secret[0] = 1;
    expect(game.secret).toEqual([9, 0, 4, 2]);
  });

  it("replaces a secret that breaks the rules with a random one", () => {
    const game = createGame({ length: 4, allowRepeats: false, secret: [1, 1, 1, 1] }, () => 0);
    expect(game.secret).not.toEqual([1, 1, 1, 1]);
    expect(isCode(game.secret, false)).toBe(true);
    expect(game.length).toBe(4);
  });

  it("gives a game with no readable length the shortest code", () => {
    for (const missing of [null, undefined, "", false, []]) {
      expect(createGame({ length: missing }, () => 0).length, String(missing)).toBe(MIN_LENGTH);
    }
  });

  it("survives being called with nothing at all", () => {
    const game = createGame();
    expect(game.status).toBe(RUNNING);
    expect(isCode(game.secret, false)).toBe(true);
  });
});

describe("guessProblem", () => {
  const game = () => createGame({ length: 4, allowRepeats: false, secret: [1, 2, 3, 4] });

  it("passes a legal guess", () => {
    expect(guessProblem(game(), [5, 6, 7, 8])).toBe(null);
  });

  it("refuses a guess of the wrong length", () => {
    expect(guessProblem(game(), [1, 2, 3])).toBe(WRONG_LENGTH);
    expect(guessProblem(game(), [1, 2, 3, 4, 5])).toBe(WRONG_LENGTH);
    expect(guessProblem(game(), "1234")).toBe(WRONG_LENGTH);
  });

  it("refuses anything that is not a digit", () => {
    expect(guessProblem(game(), [1, 2, 3, "4"])).toBe(NOT_A_DIGIT);
    expect(guessProblem(game(), [1, 2, 3, null])).toBe(NOT_A_DIGIT);
  });

  it("refuses a repeated digit unless the level allows it", () => {
    expect(guessProblem(game(), [1, 1, 2, 3])).toBe(REPEATED_DIGIT);
    const loose = createGame({ length: 4, allowRepeats: true, secret: [1, 1, 2, 3] });
    expect(guessProblem(loose, [1, 1, 2, 3])).toBe(null);
  });

  it("refuses any guess once the game has ended", () => {
    const finished = game();
    finished.status = WON;
    expect(guessProblem(finished, [1, 2, 3, 4])).toBe(NOT_RUNNING);
  });
});

describe("digitTaken", () => {
  it("reports a digit the guess has already used", () => {
    const game = createGame({ length: 4, secret: [1, 2, 3, 4] });
    expect(digitTaken(game, [7, 8], 7)).toBe(true);
    expect(digitTaken(game, [7, 8], 9)).toBe(false);
    expect(digitTaken(game, [], 7)).toBe(false);
  });

  it("takes nothing on a level where digits may repeat", () => {
    const loose = createGame({ length: 4, allowRepeats: true, secret: [1, 1, 2, 3] });
    expect(digitTaken(loose, [7, 8], 7)).toBe(false);
  });

  it("marks exactly the digits the guess has used, and no others", () => {
    const game = createGame({ length: 4, secret: [1, 2, 3, 4] });
    const taken = [];
    for (let digit = 0; digit < DIGIT_COUNT; digit++) {
      if (digitTaken(game, [7, 0], digit)) {
        taken.push(digit);
      }
    }
    expect(taken).toEqual([0, 7]);
  });
});

describe("acceptsDigit", () => {
  it("takes a digit while the guess has room", () => {
    const game = createGame({ length: 4, secret: [1, 2, 3, 4] });
    expect(acceptsDigit(game, [], 7)).toBe(true);
    expect(acceptsDigit(game, [7, 8, 9], 0)).toBe(true);
  });

  it("refuses once the guess is full", () => {
    const game = createGame({ length: 4, secret: [1, 2, 3, 4] });
    expect(acceptsDigit(game, [1, 2, 3, 4], 5)).toBe(false);
  });

  it("refuses a digit already entered, unless the level allows repeats", () => {
    const strict = createGame({ length: 4, secret: [1, 2, 3, 4] });
    expect(acceptsDigit(strict, [7, 8], 7)).toBe(false);
    const loose = createGame({ length: 4, allowRepeats: true, secret: [1, 1, 2, 3] });
    expect(acceptsDigit(loose, [7, 8], 7)).toBe(true);
  });

  it("refuses junk and refuses everything once the game has ended", () => {
    const game = createGame({ length: 4, secret: [1, 2, 3, 4] });
    expect(acceptsDigit(game, [], 10)).toBe(false);
    expect(acceptsDigit(game, [], "7")).toBe(false);
    game.status = WON;
    expect(acceptsDigit(game, [], 7)).toBe(false);
  });
});

describe("submitGuess", () => {
  it("records the guess and its score in the history", () => {
    const game = createGame({ length: 4, secret: [1, 2, 3, 4] });
    const result = submitGuess(game, [1, 2, 4, 3]);
    expect(result.accepted).toBe(true);
    expect(result.bulls).toBe(2);
    expect(result.cows).toBe(2);
    expect(game.history).toEqual([{ digits: [1, 2, 4, 3], bulls: 2, cows: 2 }]);
    expect(attemptsUsed(game)).toBe(1);
    expect(game.status).toBe(RUNNING);
  });

  it("copies the guess so a reused input array cannot rewrite history", () => {
    const game = createGame({ length: 4, secret: [1, 2, 3, 4] });
    const digits = [5, 6, 7, 8];
    submitGuess(game, digits);
    digits[0] = 9;
    expect(game.history[0].digits).toEqual([5, 6, 7, 8]);
  });

  it("wins when every digit is a bull", () => {
    const game = createGame({ length: 4, secret: [1, 2, 3, 4] });
    const result = submitGuess(game, [1, 2, 3, 4]);
    expect(result.status).toBe(WON);
    expect(game.status).toBe(WON);
    expect(attemptsUsed(game)).toBe(1);
  });

  it("refuses an illegal guess without adding it to the history", () => {
    const game = createGame({ length: 4, secret: [1, 2, 3, 4] });
    const result = submitGuess(game, [1, 2, 3]);
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe(WRONG_LENGTH);
    expect(result.entry).toBe(null);
    expect(game.history).toHaveLength(0);
    expect(game.status).toBe(RUNNING);
  });

  // The rule the removed limit used to break: a game only ends by being solved,
  // so a player who keeps missing keeps playing.
  it("runs on however many guesses it takes", () => {
    const game = createGame({ length: 4, secret: [1, 2, 3, 4] });
    for (let i = 0; i < 40; i++) {
      const result = submitGuess(game, [5, 6, 7, 8]);
      expect(result.accepted).toBe(true);
      expect(result.status).toBe(RUNNING);
    }
    expect(attemptsUsed(game)).toBe(40);
    expect(submitGuess(game, [1, 2, 3, 4]).status).toBe(WON);
    expect(attemptsUsed(game)).toBe(41);
  });

  it("is a no-op once the game has ended", () => {
    const game = createGame({ length: 4, secret: [1, 2, 3, 4] });
    submitGuess(game, [1, 2, 3, 4]);
    const after = submitGuess(game, [5, 6, 7, 8]);
    expect(after.accepted).toBe(false);
    expect(after.reason).toBe(NOT_RUNNING);
    expect(game.history).toHaveLength(1);
  });

  it("plays a whole game of narrowing guesses", () => {
    const game = createGame({ length: 4, secret: [3, 0, 7, 1] });
    expect(submitGuess(game, [1, 2, 3, 4])).toMatchObject({ bulls: 0, cows: 2 });
    expect(submitGuess(game, [3, 0, 5, 6])).toMatchObject({ bulls: 2, cows: 0 });
    expect(submitGuess(game, [3, 0, 7, 8])).toMatchObject({ bulls: 3, cows: 0 });
    expect(submitGuess(game, [3, 0, 7, 1])).toMatchObject({ bulls: 4, cows: 0, status: WON });
    expect(attemptsUsed(game)).toBe(4);
  });
});

describe("codeToText", () => {
  it("writes the digits as the screen shows them", () => {
    expect(codeToText([1, 2, 3, 4])).toBe("1234");
    expect(codeToText([0, 9])).toBe("09");
    expect(codeToText([])).toBe("");
  });

  it("marks anything that is not a digit rather than printing junk", () => {
    expect(codeToText([1, null, 3])).toBe("1?3");
  });
});

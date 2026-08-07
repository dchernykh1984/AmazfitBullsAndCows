import { describe, it, expect } from "vitest";
import {
  LEVEL_KEY,
  NO_BEST,
  beats,
  bestKey,
  decodeResult,
  encodeResult,
  hasBest,
  normalizeAttempts,
  updateBest,
} from "../lib/scores.js";

const result = (attempts, seconds) => ({
  attempts,
  seconds: seconds === undefined ? null : seconds,
});

describe("storage keys", () => {
  it("keeps a separate best per difficulty, named by the level's id", () => {
    expect(bestKey("classic")).toBe("best_classic");
    expect(bestKey("hard")).toBe("best_hard");
    expect(bestKey("easy")).not.toBe(bestKey("hard"));
  });

  it("keeps the chosen difficulty under its own key", () => {
    expect(LEVEL_KEY).toBe("level");
    expect(LEVEL_KEY).not.toBe(bestKey("easy"));
  });
});

describe("normalizeAttempts", () => {
  it("reads a stored number back", () => {
    expect(normalizeAttempts(7)).toBe(7);
    expect(normalizeAttempts("7")).toBe(7);
    expect(normalizeAttempts(7.9)).toBe(7);
  });

  it("reads anything unusable as no best at all", () => {
    expect(normalizeAttempts(null)).toBe(NO_BEST);
    expect(normalizeAttempts(undefined)).toBe(NO_BEST);
    expect(normalizeAttempts("")).toBe(NO_BEST);
    expect(normalizeAttempts("junk")).toBe(NO_BEST);
    expect(normalizeAttempts(-3)).toBe(NO_BEST);
    expect(normalizeAttempts(Infinity)).toBe(NO_BEST);
  });
});

describe("hasBest", () => {
  it("tells a solved level from a fresh one", () => {
    expect(hasBest(4)).toBe(true);
    expect(hasBest(0)).toBe(false);
    expect(hasBest(null)).toBe(false);
    expect(hasBest("junk")).toBe(false);
  });
});

describe("writing a result down and reading it back", () => {
  it("round-trips a result with a time", () => {
    expect(encodeResult(result(5, 271))).toBe("5/271");
    expect(decodeResult("5/271")).toEqual(result(5, 271));
  });

  it("round-trips a result whose time is unknown", () => {
    expect(encodeResult(result(5))).toBe("5");
    expect(decodeResult("5")).toEqual(result(5));
  });

  // A record set by an earlier version of the app was a bare guess count. It has
  // to survive the upgrade rather than vanish or read as zero.
  it("reads a record stored by an older build as a result with no time", () => {
    expect(decodeResult(6)).toEqual(result(6));
    expect(decodeResult("6")).toEqual(result(6));
  });

  it("reads nothing at all as no record", () => {
    for (const junk of [null, undefined, "", "junk", "0", 0, "-2", "0/40"]) {
      expect(decodeResult(junk), JSON.stringify(junk)).toBe(null);
    }
  });

  it("drops a time it cannot use rather than the record with it", () => {
    expect(decodeResult("5/junk")).toEqual(result(5));
    expect(decodeResult("5/-9")).toEqual(result(5));
  });

  it("writes nothing for a result that is not one", () => {
    expect(encodeResult(null)).toBe("");
    expect(encodeResult(result(0, 30))).toBe("");
    expect(encodeResult({ attempts: "junk", seconds: 3 })).toBe("");
  });
});

describe("beats", () => {
  it("prefers fewer guesses, whatever the times", () => {
    expect(beats(result(4, 600), result(5, 1))).toBe(true);
    expect(beats(result(5, 1), result(4, 600))).toBe(false);
  });

  it("settles an equal number of guesses by the shorter time", () => {
    expect(beats(result(5, 100), result(5, 200))).toBe(true);
    expect(beats(result(5, 200), result(5, 100))).toBe(false);
    expect(beats(result(5, 100), result(5, 100))).toBe(false);
  });

  it("takes the first result of a level", () => {
    expect(beats(result(9, 500), null)).toBe(true);
  });

  it("is never beaten by nothing", () => {
    expect(beats(null, result(5, 100))).toBe(false);
    expect(beats(null, null)).toBe(false);
  });

  // An old record has no time to compare, so an equal-guess result cannot
  // displace it: there is no evidence it was better.
  it("leaves an equal record alone when either side has no time", () => {
    expect(beats(result(5, 100), result(5))).toBe(false);
    expect(beats(result(5), result(5, 100))).toBe(false);
    expect(beats(result(4), result(5, 100))).toBe(true);
  });
});

describe("updateBest", () => {
  it("records the first solve of a level", () => {
    expect(updateBest(null, result(6, 90))).toEqual({ best: result(6, 90), isRecord: true });
  });

  it("counts fewer guesses as the better result", () => {
    expect(updateBest(result(6, 10), result(4, 900))).toEqual({
      best: result(4, 900),
      isRecord: true,
    });
    expect(updateBest(result(4, 900), result(6, 10))).toEqual({
      best: result(4, 900),
      isRecord: false,
    });
  });

  it("counts a faster game with the same guesses as a record", () => {
    expect(updateBest(result(5, 200), result(5, 199))).toEqual({
      best: result(5, 199),
      isRecord: true,
    });
  });

  it("does not call an equal result a record", () => {
    expect(updateBest(result(5, 200), result(5, 200))).toEqual({
      best: result(5, 200),
      isRecord: false,
    });
  });
});

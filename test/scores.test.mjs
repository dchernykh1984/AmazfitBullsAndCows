import { describe, it, expect } from "vitest";
import {
  LEVEL_KEY,
  NO_BEST,
  bestKey,
  hasBest,
  normalizeAttempts,
  updateBest,
} from "../lib/scores.js";

describe("storage keys", () => {
  it("keeps a separate best per difficulty, named by the level's id", () => {
    expect(bestKey("classic")).toBe("best_classic");
    expect(bestKey("expert")).toBe("best_expert");
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

describe("updateBest", () => {
  it("records the first solve of a level", () => {
    expect(updateBest(NO_BEST, 6)).toEqual({ best: 6, isRecord: true });
    expect(updateBest(null, 6)).toEqual({ best: 6, isRecord: true });
  });

  it("counts fewer guesses as the better result", () => {
    expect(updateBest(6, 4)).toEqual({ best: 4, isRecord: true });
    expect(updateBest(4, 6)).toEqual({ best: 4, isRecord: false });
  });

  it("does not call an equal result a record", () => {
    expect(updateBest(5, 5)).toEqual({ best: 5, isRecord: false });
  });

  it("ignores a game that was never solved", () => {
    expect(updateBest(5, 0)).toEqual({ best: 5, isRecord: false });
    expect(updateBest(NO_BEST, 0)).toEqual({ best: NO_BEST, isRecord: false });
    expect(updateBest(5, "junk")).toEqual({ best: 5, isRecord: false });
  });

  it("survives a corrupted stored best", () => {
    expect(updateBest("junk", 7)).toEqual({ best: 7, isRecord: true });
    expect(updateBest(-2, 7)).toEqual({ best: 7, isRecord: true });
  });
});

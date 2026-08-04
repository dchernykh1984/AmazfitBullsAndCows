import { describe, it, expect } from "vitest";
import {
  LEVELS,
  DEFAULT_LEVEL,
  clampLevel,
  nextLevel,
  levelAt,
  levelIndexOf,
} from "../lib/levels.js";
import { MAX_ATTEMPTS, MAX_LENGTH, MIN_ATTEMPTS, MIN_LENGTH } from "../lib/bulls-and-cows.js";

describe("LEVELS", () => {
  it("offers the classic four-digit game and a gentler and a longer one", () => {
    expect(LEVELS.map((level) => level.id)).toEqual(["easy", "classic", "hard", "expert"]);
    expect(LEVELS[DEFAULT_LEVEL].id).toBe("classic");
    expect(LEVELS[DEFAULT_LEVEL].length).toBe(4);
    expect(LEVELS[DEFAULT_LEVEL].allowRepeats).toBe(false);
  });

  it("describes every level completely and within the rule limits", () => {
    for (const level of LEVELS) {
      expect(typeof level.id, level.id).toBe("string");
      expect(typeof level.label, level.id).toBe("string");
      expect(level.length, level.id).toBeGreaterThanOrEqual(MIN_LENGTH);
      expect(level.length, level.id).toBeLessThanOrEqual(MAX_LENGTH);
      expect(level.maxAttempts, level.id).toBeGreaterThanOrEqual(MIN_ATTEMPTS);
      expect(level.maxAttempts, level.id).toBeLessThanOrEqual(MAX_ATTEMPTS);
      expect(typeof level.allowRepeats, level.id).toBe("boolean");
    }
  });

  it("gives a longer code more guesses to find it", () => {
    const easy = LEVELS[0];
    const hard = LEVELS[2];
    expect(hard.length).toBeGreaterThan(easy.length);
    expect(hard.maxAttempts).toBeGreaterThan(easy.maxAttempts);
  });

  it("makes expert the one where digits may repeat", () => {
    expect(LEVELS.filter((level) => level.allowRepeats).map((level) => level.id)).toEqual([
      "expert",
    ]);
  });

  it("names every level with its own i18n key", () => {
    const labels = LEVELS.map((level) => level.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe("clampLevel", () => {
  it("keeps a level that exists", () => {
    for (let i = 0; i < LEVELS.length; i++) {
      expect(clampLevel(i)).toBe(i);
    }
    expect(clampLevel("2")).toBe(2);
  });

  it("falls back to the default for anything unusable", () => {
    expect(clampLevel(null)).toBe(DEFAULT_LEVEL);
    expect(clampLevel(undefined)).toBe(DEFAULT_LEVEL);
    expect(clampLevel("")).toBe(DEFAULT_LEVEL);
    expect(clampLevel("hard")).toBe(DEFAULT_LEVEL);
    expect(clampLevel(-1)).toBe(DEFAULT_LEVEL);
    expect(clampLevel(LEVELS.length)).toBe(DEFAULT_LEVEL);
  });

  it("keeps level zero, which is a real level and not an empty value", () => {
    expect(clampLevel(0)).toBe(0);
  });
});

describe("nextLevel", () => {
  it("walks through every level and wraps around", () => {
    let level = 0;
    const seen = [level];
    for (let i = 1; i < LEVELS.length; i++) {
      level = nextLevel(level);
      seen.push(level);
    }
    expect(seen).toEqual(LEVELS.map((_, index) => index));
    expect(nextLevel(LEVELS.length - 1)).toBe(0);
  });

  it("starts from the default when given junk", () => {
    expect(nextLevel("nonsense")).toBe((DEFAULT_LEVEL + 1) % LEVELS.length);
  });
});

describe("levelAt", () => {
  it("always returns a level", () => {
    expect(levelAt(0)).toBe(LEVELS[0]);
    expect(levelAt(99)).toBe(LEVELS[DEFAULT_LEVEL]);
  });
});

describe("levelIndexOf", () => {
  it("finds every level by the id it is stored under", () => {
    for (let i = 0; i < LEVELS.length; i++) {
      expect(levelIndexOf(LEVELS[i].id)).toBe(i);
    }
  });

  it("survives a round trip through storage", () => {
    for (let i = 0; i < LEVELS.length; i++) {
      expect(levelAt(levelIndexOf(levelAt(i).id))).toBe(LEVELS[i]);
    }
  });

  it("falls back to the default for an id that is no longer a level", () => {
    expect(levelIndexOf("impossible")).toBe(DEFAULT_LEVEL);
    expect(levelIndexOf(undefined)).toBe(DEFAULT_LEVEL);
    expect(levelIndexOf(1)).toBe(DEFAULT_LEVEL);
  });

  it("gives every level an id of its own", () => {
    const ids = LEVELS.map((level) => level.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

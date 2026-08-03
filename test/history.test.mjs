import { describe, it, expect } from "vitest";
import {
  clampOffset,
  guessText,
  latestOffset,
  maxOffset,
  scoreText,
  scrollBy,
  windowOf,
} from "../lib/history.js";

function entries(count) {
  const list = [];
  for (let i = 0; i < count; i++) {
    list.push({ digits: [i, i + 1, i + 2], bulls: 0, cows: i });
  }
  return list;
}

const VISIBLE = 3;

describe("maxOffset", () => {
  it("is zero while the whole history fits on screen", () => {
    expect(maxOffset(0, VISIBLE)).toBe(0);
    expect(maxOffset(3, VISIBLE)).toBe(0);
  });

  it("grows by one row per guess past the window", () => {
    expect(maxOffset(4, VISIBLE)).toBe(1);
    expect(maxOffset(10, VISIBLE)).toBe(7);
  });

  it("treats a missing window size as a single row", () => {
    expect(maxOffset(5, 0)).toBe(4);
  });
});

describe("clampOffset", () => {
  it("keeps an offset inside the list", () => {
    expect(clampOffset(10, VISIBLE, 4)).toBe(4);
    expect(clampOffset(10, VISIBLE, 99)).toBe(7);
    expect(clampOffset(10, VISIBLE, -3)).toBe(0);
  });

  it("reads junk as the top of the list", () => {
    expect(clampOffset(10, VISIBLE, "down")).toBe(0);
    expect(clampOffset(10, VISIBLE, null)).toBe(0);
  });
});

describe("latestOffset", () => {
  it("shows the newest guess at the bottom of the window", () => {
    expect(latestOffset(2, VISIBLE)).toBe(0);
    expect(latestOffset(9, VISIBLE)).toBe(6);
    expect(windowOf(entries(9), VISIBLE, latestOffset(9, VISIBLE))).toHaveLength(VISIBLE);
    expect(windowOf(entries(9), VISIBLE, latestOffset(9, VISIBLE))[2].attempt).toBe(9);
  });
});

describe("scrollBy", () => {
  it("walks towards the newest guess and back", () => {
    expect(scrollBy(10, VISIBLE, 3, 1)).toBe(4);
    expect(scrollBy(10, VISIBLE, 3, -1)).toBe(2);
  });

  it("stops at both ends instead of wrapping", () => {
    expect(scrollBy(10, VISIBLE, 0, -1)).toBe(0);
    expect(scrollBy(10, VISIBLE, 7, 1)).toBe(7);
    expect(scrollBy(2, VISIBLE, 0, 1)).toBe(0);
  });

  it("ignores a junk step", () => {
    expect(scrollBy(10, VISIBLE, 3, "up")).toBe(3);
  });
});

describe("windowOf", () => {
  it("shows at most one screenful", () => {
    expect(windowOf(entries(10), VISIBLE, 0)).toHaveLength(VISIBLE);
    expect(windowOf(entries(2), VISIBLE, 0)).toHaveLength(2);
    expect(windowOf([], VISIBLE, 0)).toEqual([]);
  });

  it("numbers the rows by attempt so a scrolled window still says where it is", () => {
    const list = entries(10);
    const rows = windowOf(list, VISIBLE, 4);
    expect(rows.map((row) => row.attempt)).toEqual([5, 6, 7]);
    expect(rows.map((row) => row.index)).toEqual([4, 5, 6]);
    expect(rows[0].entry).toBe(list[4]);
  });

  it("never runs off the end of the list", () => {
    const rows = windowOf(entries(5), VISIBLE, 99);
    expect(rows.map((row) => row.attempt)).toEqual([3, 4, 5]);
  });
});

describe("row text", () => {
  it("writes the guessed digits", () => {
    expect(guessText({ digits: [1, 2, 3, 4], bulls: 0, cows: 0 })).toBe("1234");
  });

  it("writes the bulls and the cows with the language's marks", () => {
    expect(scoreText({ digits: [], bulls: 2, cows: 1 }, "B", "C")).toBe("2B 1C");
    expect(scoreText({ digits: [], bulls: 0, cows: 0 }, "B", "C")).toBe("0B 0C");
  });
});

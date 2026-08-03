import { describe, it, expect } from "vitest";
import { clampOffset, maxOffset, scrollBy, windowOf } from "../lib/history.js";

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

describe("the newest guess", () => {
  it("sits at the bottom of the window the page jumps to after a guess", () => {
    const list = entries(9);
    const window = windowOf(list, VISIBLE, maxOffset(list.length, VISIBLE));
    expect(window).toHaveLength(VISIBLE);
    expect(window[VISIBLE - 1]).toBe(list[list.length - 1]);
  });

  it("is on screen from the very first guess, without scrolling", () => {
    const list = entries(1);
    expect(windowOf(list, VISIBLE, maxOffset(list.length, VISIBLE))).toEqual(list);
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

  it("shows the guesses the offset points at, in order", () => {
    const list = entries(10);
    expect(windowOf(list, VISIBLE, 4)).toEqual([list[4], list[5], list[6]]);
    expect(windowOf(list, VISIBLE, 4)[0]).toBe(list[4]);
  });

  it("never runs off the end of the list", () => {
    const list = entries(5);
    expect(windowOf(list, VISIBLE, 99)).toEqual([list[2], list[3], list[4]]);
  });
});

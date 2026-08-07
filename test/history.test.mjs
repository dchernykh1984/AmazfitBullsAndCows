import { describe, it, expect } from "vitest";
import {
  clampOffset,
  maxOffset,
  pageBack,
  scrollBy,
  windowLabel,
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

describe("pageBack", () => {
  it("steps a whole screenful towards the older guesses", () => {
    expect(pageBack(12, VISIBLE, 9)).toBe(6);
    expect(pageBack(12, VISIBLE, 6)).toBe(3);
  });

  it("wraps round to the newest once the oldest is on screen", () => {
    expect(pageBack(12, VISIBLE, 0)).toBe(9);
    expect(pageBack(10, VISIBLE, 0)).toBe(7);
  });

  it("stops short rather than paging past the oldest guess", () => {
    expect(pageBack(12, VISIBLE, 2)).toBe(0);
  });

  it("has nowhere to go while everything fits on screen", () => {
    expect(pageBack(3, VISIBLE, 0)).toBe(0);
    expect(pageBack(0, VISIBLE, 0)).toBe(0);
  });

  it("visits every guess if you keep tapping", () => {
    const seen = new Set();
    let offset = 0;
    for (let tap = 0; tap < 20; tap++) {
      for (const row of windowOf(entries(11), VISIBLE, offset)) {
        seen.add(row.cows);
      }
      offset = pageBack(11, VISIBLE, offset);
    }
    expect(seen.size).toBe(11);
  });
});

describe("windowLabel", () => {
  it("says which guesses are on screen out of how many", () => {
    expect(windowLabel(12, VISIBLE, 0)).toBe("1-3/12");
    expect(windowLabel(12, VISIBLE, 9)).toBe("10-12/12");
    expect(windowLabel(10, VISIBLE, 4)).toBe("5-7/10");
  });

  it("says nothing while every guess already fits on screen", () => {
    expect(windowLabel(0, VISIBLE, 0)).toBe(null);
    expect(windowLabel(3, VISIBLE, 0)).toBe(null);
  });

  it("never runs past the end of the list", () => {
    expect(windowLabel(4, VISIBLE, 99)).toBe("2-4/4");
  });
});

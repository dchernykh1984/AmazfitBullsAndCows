import { describe, it, expect } from "vitest";
import { chordHalfWidth, safeLineWidth, centeredBox } from "../lib/round-geometry.js";

const SCREEN = 466;
const RADIUS = SCREEN / 2;

describe("chordHalfWidth", () => {
  it("is the full radius on the centre line", () => {
    expect(chordHalfWidth(100, 0)).toBe(100);
  });

  it("shrinks towards the edge of the circle", () => {
    expect(chordHalfWidth(100, 60)).toBeCloseTo(80);
    expect(chordHalfWidth(100, 80)).toBeCloseTo(60);
  });

  it("is symmetric above and below the centre line", () => {
    expect(chordHalfWidth(100, 42)).toBe(chordHalfWidth(100, -42));
  });

  it("is zero at and past the edge", () => {
    expect(chordHalfWidth(100, 100)).toBe(0);
    expect(chordHalfWidth(100, 180)).toBe(0);
  });
});

describe("safeLineWidth", () => {
  it("is widest across the middle of the screen", () => {
    const middle = safeLineWidth(SCREEN, RADIUS, SCREEN / 2, 40, 0);
    const higher = safeLineWidth(SCREEN, RADIUS, SCREEN / 4, 40, 0);
    expect(middle).toBeGreaterThan(higher);
    expect(middle).toBeLessThanOrEqual(SCREEN);
  });

  it("keeps the whole height of the line inside the circle", () => {
    // The chord at the top edge of the line binds, not the one at its centre.
    const tall = safeLineWidth(SCREEN, RADIUS, 120, 80, 0);
    const thin = safeLineWidth(SCREEN, RADIUS, 120, 2, 0);
    expect(tall).toBeLessThan(thin);
  });

  it("subtracts the padding from both sides", () => {
    const bare = safeLineWidth(SCREEN, RADIUS, SCREEN / 2, 40, 0);
    const padded = safeLineWidth(SCREEN, RADIUS, SCREEN / 2, 40, 10);
    expect(bare - padded).toBe(20);
  });

  it("is zero rather than negative outside the circle", () => {
    expect(safeLineWidth(SCREEN, RADIUS, 2, 40, 8)).toBe(0);
    expect(safeLineWidth(SCREEN, RADIUS, -50, 40, 0)).toBe(0);
  });

  it("respects a smaller circle inside the screen", () => {
    // The chord of the inner circle at the lower edge of the line, not the screen.
    const inner = safeLineWidth(SCREEN, 150, SCREEN / 2, 40, 0);
    expect(inner).toBeCloseTo(2 * Math.sqrt(150 * 150 - 20 * 20), 6);
    expect(inner).toBeLessThan(safeLineWidth(SCREEN, RADIUS, SCREEN / 2, 40, 0));
  });
});

describe("centeredBox", () => {
  it("centres the box horizontally", () => {
    const box = centeredBox(SCREEN, RADIUS, 200, 40, 300, 8);
    expect(box.x + box.w / 2).toBeCloseTo(SCREEN / 2, 0);
    expect(box.y).toBe(200);
    expect(box.h).toBe(40);
  });

  it("never exceeds the requested maximum width", () => {
    const box = centeredBox(SCREEN, RADIUS, SCREEN / 2 - 20, 40, 120, 8);
    expect(box.w).toBe(120);
  });

  it("narrows a box placed near the top of the circle", () => {
    const high = centeredBox(SCREEN, RADIUS, 40, 40, 400, 8);
    const middle = centeredBox(SCREEN, RADIUS, 220, 40, 400, 8);
    expect(high.w).toBeLessThan(middle.w);
    expect(high.w).toBeGreaterThan(0);
  });

  it("keeps every corner inside the circle", () => {
    const centre = SCREEN / 2;
    for (let top = 0; top <= SCREEN - 40; top += 10) {
      const box = centeredBox(SCREEN, RADIUS, top, 40, SCREEN, 4);
      for (const x of [box.x, box.x + box.w]) {
        for (const y of [box.y, box.y + box.h]) {
          const dx = x - centre;
          const dy = y - centre;
          expect(Math.sqrt(dx * dx + dy * dy)).toBeLessThanOrEqual(RADIUS + 1);
        }
      }
    }
  });

  it("collapses to nothing rather than overflowing off the circle", () => {
    const box = centeredBox(SCREEN, RADIUS, -100, 40, 400, 8);
    expect(box.w).toBe(0);
    expect(box.x).toBe(SCREEN / 2);
  });
});

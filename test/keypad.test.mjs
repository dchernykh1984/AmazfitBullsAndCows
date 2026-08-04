import { describe, it, expect } from "vitest";
import { keypadLayout } from "../lib/keypad.js";

// Every round resolution the store bundle covers; see test/board.test.mjs.
const SIZES = [360, 416, 454, 466, 480];
const KEYS = 10;

function centreOf(slot) {
  return { x: slot.x + slot.w / 2, y: slot.y + slot.h / 2 };
}

function distance(a, b) {
  return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}

describe("keypadLayout", () => {
  it("lays out one slot per key", () => {
    for (const size of SIZES) {
      const layout = keypadLayout(size, KEYS);
      expect(layout.count).toBe(KEYS);
      expect(layout.slots).toHaveLength(KEYS);
    }
  });

  it("puts the first key at the top and runs clockwise", () => {
    const size = 466;
    const layout = keypadLayout(size, KEYS);
    const first = centreOf(layout.slots[0]);
    expect(first.x).toBeCloseTo(size / 2, 0);
    expect(first.y).toBeLessThan(size / 2);

    // Clockwise from the top means the next key is to the right and lower.
    const second = centreOf(layout.slots[1]);
    expect(second.x).toBeGreaterThan(first.x);
    expect(second.y).toBeGreaterThan(first.y);

    // ... and the last one is to the left of the top key.
    const last = centreOf(layout.slots[KEYS - 1]);
    expect(last.x).toBeLessThan(first.x);
  });

  it("puts every key centre the same distance from the middle", () => {
    for (const size of SIZES) {
      const layout = keypadLayout(size, KEYS);
      const middle = { x: size / 2, y: size / 2 };
      for (const slot of layout.slots) {
        expect(distance(centreOf(slot), middle)).toBeCloseTo(layout.radius, 0);
      }
    }
  });

  it("keeps every key fully on the screen and off the bezel", () => {
    for (const size of SIZES) {
      const layout = keypadLayout(size, KEYS);
      const middle = { x: size / 2, y: size / 2 };
      for (const slot of layout.slots) {
        expect(slot.x).toBeGreaterThanOrEqual(0);
        expect(slot.y).toBeGreaterThanOrEqual(0);
        expect(slot.x + slot.w).toBeLessThanOrEqual(size);
        expect(slot.y + slot.h).toBeLessThanOrEqual(size);
        // The keys are drawn as circles, so the far edge of the key disc - not
        // the corner of its bounding box - is what has to stay on the glass.
        expect(distance(centreOf(slot), middle) + slot.w / 2).toBeLessThanOrEqual(size / 2);
      }
    }
  });

  it("leaves a gap between neighbouring keys", () => {
    for (const size of SIZES) {
      const layout = keypadLayout(size, KEYS);
      for (let i = 0; i < KEYS; i++) {
        const gap = distance(centreOf(layout.slots[i]), centreOf(layout.slots[(i + 1) % KEYS]));
        expect(gap).toBeGreaterThan(layout.keySize);
      }
    }
  });

  it("leaves a usable circle free inside the ring", () => {
    for (const size of SIZES) {
      const layout = keypadLayout(size, KEYS);
      expect(layout.innerRadius).toBeGreaterThan(size * 0.28);
      expect(layout.innerRadius).toBeLessThanOrEqual(layout.radius - layout.keySize / 2);
    }
  });

  // A key has to be a thumb-sized target, and "thumb-sized" scales with the
  // watch: a 360px screen is a physically smaller watch, not a denser one. The
  // absolute floor is what a 360px screen yields, so a ratio change that makes
  // the smallest watch unplayable fails here.
  it("makes the keys big enough to tap on every screen it ships to", () => {
    for (const size of SIZES) {
      const keySize = keypadLayout(size, KEYS).keySize;
      expect(keySize, String(size)).toBeGreaterThanOrEqual(Math.round(size * 0.15));
      expect(keySize, String(size)).toBeGreaterThanOrEqual(56);
    }
  });

  it("scales with the screen", () => {
    expect(keypadLayout(480, KEYS).keySize).toBeGreaterThanOrEqual(keypadLayout(466, KEYS).keySize);
    expect(keypadLayout(480, KEYS).radius).toBeGreaterThan(keypadLayout(466, KEYS).radius);
  });

  it("takes explicit sizes when it is given them", () => {
    const layout = keypadLayout(466, KEYS, { keySize: 50, margin: 10, gap: 4 });
    expect(layout.keySize).toBe(50);
    expect(layout.radius).toBe(466 / 2 - 10 - 25);
    expect(layout.innerRadius).toBe(layout.radius - 25 - 4);
  });

  it("ignores unusable options rather than laying out nothing", () => {
    const layout = keypadLayout(466, KEYS, { keySize: 0, margin: "wide", gap: -5 });
    const fallback = keypadLayout(466, KEYS);
    expect(layout.keySize).toBe(fallback.keySize);
    expect(layout.radius).toBe(fallback.radius);
    expect(layout.innerRadius).toBe(fallback.innerRadius);
  });

  it("survives a degenerate key count", () => {
    expect(keypadLayout(466, 0).slots).toHaveLength(1);
    expect(keypadLayout(466, 1).slots).toHaveLength(1);
  });
});

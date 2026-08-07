import { describe, it, expect, afterEach, vi } from "vitest";
import { createRandom, mixSeed, seededRandom } from "../lib/random.js";
import { isCode, makeSecret } from "../lib/bulls-and-cows.js";

function draw(random, count) {
  const values = [];
  for (let i = 0; i < count; i++) {
    values.push(random());
  }
  return values;
}

describe("seededRandom", () => {
  it("stays inside the range every caller assumes", () => {
    const random = seededRandom(12345);
    for (const value of draw(random, 10000)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("repeats exactly for the same seed, and differs for another", () => {
    expect(draw(seededRandom(99), 20)).toEqual(draw(seededRandom(99), 20));
    expect(draw(seededRandom(99), 20)).not.toEqual(draw(seededRandom(100), 20));
  });

  it("spreads evenly enough to draw a fair code", () => {
    const buckets = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const random = seededRandom(2026);
    for (const value of draw(random, 100000)) {
      buckets[Math.floor(value * 10)] += 1;
    }
    for (const count of buckets) {
      expect(count).toBeGreaterThan(9000);
      expect(count).toBeLessThan(11000);
    }
  });

  it("does not fall into a short cycle", () => {
    const values = draw(seededRandom(7), 5000);
    expect(new Set(values).size).toBeGreaterThan(4900);
  });
});

describe("mixSeed", () => {
  it("moves with the clock, one launch to the next", () => {
    expect(mixSeed(1000, 0.5)).not.toBe(mixSeed(1001, 0.5));
  });

  it("moves with the platform's own randomness, at the same clock reading", () => {
    expect(mixSeed(1000, 0.25)).not.toBe(mixSeed(1000, 0.75));
  });

  it("still yields a usable seed when one source gives nothing", () => {
    for (const junk of [null, undefined, NaN, Infinity, "later", {}]) {
      expect(mixSeed(junk, 0.5)).toBeGreaterThan(0);
      expect(mixSeed(1000, junk)).toBeGreaterThan(0);
    }
    // Both sources dead is the worst case a watch can present, and it still has
    // to hand back a seed rather than a NaN.
    expect(Number.isInteger(mixSeed(NaN, NaN))).toBe(true);
    expect(mixSeed(NaN, NaN)).toBeGreaterThan(0);
  });

  it("is a 32-bit unsigned integer, which is what the generator takes", () => {
    for (const clock of [0, 1, 1e12, -5, 2 ** 40]) {
      const seed = mixSeed(clock, 0.123);
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThan(0);
      expect(seed).toBeLessThan(2 ** 32);
    }
  });
});

describe("createRandom", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // The whole point of the module: on an engine that does not seed Math.random
  // at cold start, every launch would otherwise deal the same first code. Pin
  // Math.random to a constant and the sequence must still differ per launch.
  function withFrozenPlatformRandom(run) {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    return run();
  }

  // The bug this whole module exists to prevent: an engine that does not seed
  // Math.random at cold start dealing the same first code on every launch.
  it("deals a different first code on each launch, even if Math.random does not", () => {
    withFrozenPlatformRandom(() => {
      const codes = new Set();
      for (let launch = 0; launch < 200; launch++) {
        const random = createRandom(1770000000000 + launch * 37, 0.5);
        codes.add(makeSecret(4, random).join(""));
      }
      expect(codes.size).toBeGreaterThan(150);
    });
  });

  it("deals a different first code on each launch, even if the clock is stopped", () => {
    withFrozenPlatformRandom(() => {
      const codes = new Set();
      for (let launch = 0; launch < 200; launch++) {
        const random = createRandom(0, launch / 200);
        codes.add(makeSecret(4, random).join(""));
      }
      expect(codes.size).toBeGreaterThan(150);
    });
  });

  it("keeps dealing legal codes for a long session", () => {
    withFrozenPlatformRandom(() => {
      const random = createRandom(1770000000000, 0.42);
      for (let game = 0; game < 500; game++) {
        expect(isCode(makeSecret(5, random))).toBe(true);
      }
    });
  });
});

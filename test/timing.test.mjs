import { describe, it, expect } from "vitest";
import { elapsedSeconds, formatDuration, NO_TIME_TEXT } from "../lib/timing.js";

describe("elapsedSeconds", () => {
  it("measures the wall clock between the two readings", () => {
    expect(elapsedSeconds(1000, 1000)).toBe(0);
    expect(elapsedSeconds(1000, 8000)).toBe(7);
    expect(elapsedSeconds(1_770_000_000_000, 1_770_000_271_000)).toBe(271);
  });

  it("counts whole seconds, throwing away the part of one", () => {
    expect(elapsedSeconds(0, 1999)).toBe(1);
    expect(elapsedSeconds(0, 999)).toBe(0);
  });

  // A game paused in the menu keeps running: the answer is the difference between
  // the two clock readings and nothing else.
  it("does not care what happened between the two readings", () => {
    expect(elapsedSeconds(0, 3600_000)).toBe(3600);
  });

  it("refuses a clock that ran backwards rather than inventing a duration", () => {
    expect(elapsedSeconds(8000, 1000)).toBe(null);
  });

  it("refuses a reading that is not a time at all", () => {
    for (const junk of [null, undefined, NaN, Infinity, "later", {}]) {
      expect(elapsedSeconds(junk, 1000), String(junk)).toBe(null);
      expect(elapsedSeconds(1000, junk), String(junk)).toBe(null);
    }
  });
});

describe("formatDuration", () => {
  it("writes minutes and seconds, padding the seconds", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(7)).toBe("0:07");
    expect(formatDuration(59)).toBe("0:59");
    expect(formatDuration(60)).toBe("1:00");
    expect(formatDuration(271)).toBe("4:31");
  });

  // Minutes keep counting past sixty instead of turning into hours: an hour-long
  // game is one somebody walked away from, and "1:08:05" reads worse on a wrist
  // than "68:05" does.
  it("keeps counting in minutes past an hour", () => {
    expect(formatDuration(3600)).toBe("60:00");
    expect(formatDuration(4085)).toBe("68:05");
  });

  it("shows nothing rather than nonsense for a duration it cannot use", () => {
    expect(formatDuration(null)).toBe(NO_TIME_TEXT);
    expect(formatDuration(undefined)).toBe(NO_TIME_TEXT);
    expect(formatDuration(-1)).toBe(NO_TIME_TEXT);
    expect(formatDuration(NaN)).toBe(NO_TIME_TEXT);
    expect(formatDuration("soon")).toBe(NO_TIME_TEXT);
  });

  it("reads a whole number of seconds out of a fractional one", () => {
    expect(formatDuration(7.9)).toBe("0:07");
  });
});

describe("the two together", () => {
  it("turn a pair of clock readings into something the screen can show", () => {
    expect(formatDuration(elapsedSeconds(1_770_000_000_000, 1_770_000_125_000))).toBe("2:05");
    expect(formatDuration(elapsedSeconds(5000, 1000))).toBe(NO_TIME_TEXT);
  });
});

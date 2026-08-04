import { describe, it, expect } from "vitest";
import { fitTextSize, GLYPH_RATIO, MIN_TEXT_SIZE, SIDE_MARGIN } from "../lib/text-fit.js";
import { LABELS } from "../lib/i18n/labels.js";
import { UI_KEYS } from "../lib/i18n/keys.js";

const WIDE = { x: 0, y: 0, w: 400, h: 50 };
const NARROW = { x: 0, y: 0, w: 81, h: 51 };

// The box a label is drawn in fits the label when the estimate the helper uses
// says so - which is the same estimate the watch's font follows closely enough.
function fits(box, text, size) {
  return text.length * GLYPH_RATIO * size <= box.w * SIDE_MARGIN;
}

describe("fitTextSize", () => {
  it("gives a short label the size that was asked for", () => {
    expect(fitTextSize(WIDE, "OK", 21)).toBe(21);
    expect(fitTextSize(WIDE, "Play", 21)).toBe(21);
  });

  it("shrinks a label that would not fit across its box", () => {
    const size = fitTextSize(NARROW, "Стереть", 21);
    expect(size).toBeLessThan(21);
    expect(fits(NARROW, "Стереть", size)).toBe(true);
  });

  it("never grows a label past the size asked for", () => {
    expect(fitTextSize(WIDE, "OK", 12)).toBe(12);
  });

  it("stops shrinking at the size a watch can still be read at", () => {
    expect(fitTextSize({ x: 0, y: 0, w: 10, h: 50 }, "a very long label", 30)).toBe(MIN_TEXT_SIZE);
  });

  it("survives an empty or missing label", () => {
    expect(fitTextSize(WIDE, "", 21)).toBe(21);
    expect(fitTextSize(WIDE, undefined, 21)).toBe(21);
    expect(fitTextSize(WIDE, null, 21)).toBe(21);
  });

  it("treats a number the way the screen does, as its digits", () => {
    expect(fitTextSize({ x: 0, y: 0, w: 60, h: 30 }, 12345, 30)).toBeLessThan(30);
  });
});

describe("the labels the app actually draws", () => {
  // The two action buttons are the narrowest boxes on the board, and they carry
  // words in eleven languages. Every one of them has to come out readable, not
  // just the English.
  it("fits every action label into the action button on the smallest screen", () => {
    const box = { x: 0, y: 0, w: 63, h: 39 };
    for (const lang of Object.keys(LABELS)) {
      for (const key of ["check", "erase"]) {
        const text = LABELS[lang][key];
        const size = fitTextSize(box, text, Math.round(box.h * 0.42));
        expect(size, `${lang}/${key} '${text}'`).toBeGreaterThanOrEqual(MIN_TEXT_SIZE);
        expect(fits(box, text, size), `${lang}/${key} '${text}'`).toBe(true);
      }
    }
  });

  it("fits every menu label into a menu button on the smallest screen", () => {
    const box = { x: 0, y: 0, w: Math.round(360 * 0.86), h: 39 };
    for (const lang of Object.keys(LABELS)) {
      for (const key of UI_KEYS) {
        const text = LABELS[lang][key];
        const size = fitTextSize(box, text, Math.round(box.h * 0.42));
        expect(fits(box, text, size), `${lang}/${key} '${text}'`).toBe(true);
      }
    }
  });
});

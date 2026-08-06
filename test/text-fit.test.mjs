import { describe, it, expect } from "vitest";
import { fitTextSize, GLYPH_RATIO, MIN_TEXT_SIZE, SIDE_MARGIN } from "../lib/text-fit.js";
import { LABELS } from "../lib/i18n/labels.js";
import { UI_KEYS, budgetFor } from "../lib/i18n/keys.js";
import { keypadLayout } from "../lib/keypad.js";
import { boardStack } from "../lib/board.js";
import { columnsIn } from "../lib/round-geometry.js";
import { DIGIT_COUNT } from "../lib/bulls-and-cows.js";
import { HISTORY_ROWS, SCREEN_PADDING } from "../utils/config/constants.js";

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
    // The longest erase label of the eleven, whatever it happens to be today.
    const longest = Object.keys(LABELS)
      .map((lang) => LABELS[lang].erase)
      .sort((a, b) => b.length - a.length)[0];
    const size = fitTextSize(NARROW, longest, 21);
    expect(size).toBeLessThan(21);
    expect(fits(NARROW, longest, size)).toBe(true);
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

// Every label, in every language, in the box the app actually draws it in, on
// every round screen the store bundle covers. A budget in characters and a box in
// pixels can drift apart - a word inside its character budget can still overrun
// the narrowest button - so this measures the two against each other rather than
// trusting either alone.
describe("the labels the app actually draws", () => {
  const SIZES = [360, 416, 454, 466, 480];

  // The boxes a label can land in, derived the way page/index.js derives them.
  function boxesFor(size) {
    const inner = Math.floor(keypadLayout(size, DIGIT_COUNT).innerRadius);
    const stack = boardStack(size, inner, HISTORY_ROWS, SCREEN_PADDING);
    const action = columnsIn(stack.actions, 2, Math.round(stack.actions.h * 0.16))[0];
    const menuButton = { x: 0, y: 0, w: Math.round(size * 0.86), h: Math.round(size * 0.108) };
    const menuLine = { x: 0, y: 0, w: Math.round(size * 0.86), h: Math.round(size * 0.06) };
    const bigLine = { x: 0, y: 0, w: Math.round(size * 0.86), h: Math.round(size * 0.085) };

    return {
      check: { box: action, wanted: action.h * 0.42 },
      erase: { box: action, wanted: action.h * 0.42 },
      play: { box: menuButton, wanted: menuButton.h * 0.42 },
      again: { box: menuButton, wanted: menuButton.h * 0.42 },
      level_3: { box: menuButton, wanted: menuButton.h * 0.42 },
      level_4: { box: menuButton, wanted: menuButton.h * 0.42 },
      level_5: { box: menuButton, wanted: menuButton.h * 0.42 },
      title: { box: bigLine, wanted: bigLine.h * 0.76 },
      solved: { box: bigLine, wanted: bigLine.h * 0.76 },
      level: { box: menuLine, wanted: menuLine.h * 0.76 },
      hint: { box: menuLine, wanted: menuLine.h * 0.76 },
      legend: { box: menuLine, wanted: menuLine.h * 0.76 },
      // These are drawn with a count beside them, so they are measured with the
      // widest one the game can produce.
      best: { box: menuLine, wanted: menuLine.h * 0.76, suffix: " 30" },
      tries: { box: menuLine, wanted: menuLine.h * 0.76, suffix: " 30" },
      new_best: { box: menuLine, wanted: menuLine.h * 0.76 },
      bull_mark: { box: { x: 0, y: 0, w: Math.floor(stack.history[0].w / 4), h: 20 }, wanted: 20 },
      cow_mark: { box: { x: 0, y: 0, w: Math.floor(stack.history[0].w / 4), h: 20 }, wanted: 20 },
    };
  }

  it("leaves every label room in its own box, in every language, on every screen", () => {
    for (const size of SIZES) {
      const boxes = boxesFor(size);
      for (const key of UI_KEYS) {
        const where = boxes[key];
        expect(where, `no box measured for '${key}'`).toBeTruthy();
        for (const lang of Object.keys(LABELS)) {
          const text = LABELS[lang][key] + (where.suffix || "");
          const drawn = fitTextSize(where.box, text, where.wanted);
          expect(drawn, `${size}px ${lang}/${key} '${text}'`).toBeGreaterThanOrEqual(MIN_TEXT_SIZE);
          expect(fits(where.box, text, drawn), `${size}px ${lang}/${key} '${text}'`).toBe(true);
        }
      }
    }
  });

  // The character budgets are what a translator is given; they only mean anything
  // if a label that spends the whole budget still fits the box.
  it("keeps the character budgets honest against the narrowest boxes", () => {
    for (const size of SIZES) {
      const boxes = boxesFor(size);
      for (const key of UI_KEYS) {
        const where = boxes[key];
        const longest = "M".repeat(budgetFor(key)) + (where.suffix || "");
        const drawn = fitTextSize(where.box, longest, where.wanted);
        expect(fits(where.box, longest, drawn), `${size}px ${key} at its full budget`).toBe(true);
      }
    }
  });
});

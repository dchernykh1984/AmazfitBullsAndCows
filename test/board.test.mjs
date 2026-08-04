import { describe, it, expect } from "vitest";
import { boardStack } from "../lib/board.js";
import { keypadLayout } from "../lib/keypad.js";
import { DIGIT_COUNT } from "../lib/bulls-and-cows.js";
import { HISTORY_ROWS, SCREEN_PADDING } from "../utils/config/constants.js";

// Every round resolution the store bundle ends up covering. app.json declares
// 466 and 480, but the Zeus build fans a round target out to every round screen
// it knows, so the layout has to hold from 360 up - which is what these sizes
// were read off: the manifest of an actual `zeus build`.
const SIZES = [360, 416, 454, 466, 480];
const ROWS = 3;

// The board is laid out inside whatever the keypad ring leaves free, so the tests
// measure against the real ring rather than an invented radius.
function stackFor(size, rows) {
  const inner = Math.floor(keypadLayout(size, DIGIT_COUNT).innerRadius);
  return { stack: boardStack(size, inner, rows, SCREEN_PADDING), inner, size };
}

function boxes(stack) {
  return [stack.counter, ...stack.history, stack.guess, stack.actions];
}

describe("boardStack", () => {
  it("lays out the counter, the history rows, the guess and the actions", () => {
    const { stack } = stackFor(466, ROWS);
    expect(stack.history).toHaveLength(ROWS);
    expect(stack.counter).toBeTruthy();
    expect(stack.guess).toBeTruthy();
    expect(stack.actions).toBeTruthy();
  });

  it("stacks them top to bottom without overlapping", () => {
    for (const size of SIZES) {
      const list = boxes(stackFor(size, ROWS).stack);
      for (let i = 1; i < list.length; i++) {
        expect(list[i].y).toBeGreaterThanOrEqual(list[i - 1].y + list[i - 1].h);
      }
    }
  });

  it("centres the stack in the free circle", () => {
    for (const size of SIZES) {
      const { stack } = stackFor(size, ROWS);
      const list = boxes(stack);
      const top = list[0].y;
      const bottom = list[list.length - 1].y + list[list.length - 1].h;
      expect(Math.abs((top + bottom) / 2 - size / 2)).toBeLessThanOrEqual(2);
    }
  });

  it("fits the whole stack inside the circle the ring leaves free", () => {
    for (const size of SIZES) {
      const { stack, inner } = stackFor(size, ROWS);
      expect(stack.height).toBeLessThanOrEqual(2 * inner);
    }
  });

  // The failure this test exists for is silent: centeredBox narrows a row that
  // reaches too far up or down the circle instead of complaining, so a stack that
  // is a little too tall shows as clipped text rather than as an error.
  it("leaves every row wide enough to read", () => {
    for (const size of SIZES) {
      const { stack, inner } = stackFor(size, ROWS);
      for (const box of boxes(stack)) {
        expect(box.w).toBeGreaterThan(inner);
        expect(box.h).toBeGreaterThan(0);
      }
    }
  });

  it("keeps every corner of every row on the glass", () => {
    for (const size of SIZES) {
      const { stack, inner } = stackFor(size, ROWS);
      for (const box of boxes(stack)) {
        for (const x of [box.x, box.x + box.w]) {
          for (const y of [box.y, box.y + box.h]) {
            const dx = x - size / 2;
            const dy = y - size / 2;
            expect(Math.sqrt(dx * dx + dy * dy)).toBeLessThanOrEqual(inner + 1);
          }
        }
      }
    }
  });

  it("still fits with the row count the app actually ships", () => {
    for (const size of SIZES) {
      const { stack, inner } = stackFor(size, HISTORY_ROWS);
      expect(stack.height).toBeLessThanOrEqual(2 * inner);
      expect(stack.history).toHaveLength(HISTORY_ROWS);
    }
  });

  it("grows by exactly one row height per extra history row", () => {
    const { stack: three } = stackFor(466, 3);
    const { stack: four } = stackFor(466, 4);
    expect(four.height - three.height).toBe(three.history[0].h);
  });

  it("draws at least one history row however few are asked for", () => {
    expect(stackFor(466, 0).stack.history).toHaveLength(1);
    expect(stackFor(466, -2).stack.history).toHaveLength(1);
  });
});

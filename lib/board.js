// Where everything inside the keypad ring goes. Pure geometry with no Zepp OS
// dependency, so the one thing that can quietly ruin the screen - a stack that
// does not fit the circle the ring leaves free - is a unit test rather than a
// squint at a watch.
//
// The stack, top to bottom: the attempt counter, the history window, the guess
// being composed, and the two action buttons. It is centred vertically, so the
// widest rows land where the circle is widest.

import { centeredBox } from "./round-geometry.js";

// Heights and the gap between them, as fractions of the free radius. They add up
// to well under a diameter for the row counts the game uses; the fit test pins
// that rather than trusting these numbers.
// The counter row doubles as the control that pages the history, so it is sized
// as something a thumb hits rather than as a caption.
const COUNTER_RATIO = 0.26;
const ROW_RATIO = 0.2;
const GUESS_RATIO = 0.29;
// The action row carries the two buttons that are tapped most after the keypad,
// so it is sized to the height the sibling app ships (50px on a 466px screen)
// rather than to whatever was left over.
const ACTION_RATIO = 0.35;
const GAP_RATIO = 0.04;

// The stack never uses the full chord, so a long row keeps a little air on both
// sides of it.
const WIDTH_RATIO = 0.94;

function part(radius, ratio) {
  return Math.max(1, Math.round(radius * ratio));
}

// The boxes to draw the board in, for a round screen `screenSize` across whose
// keypad ring leaves a free circle of `innerRadius`, showing `historyRows` past
// guesses at once. Every box is already clipped to that circle, so the page hands
// them straight to createWidget.
export function boardStack(screenSize, innerRadius, historyRows, padding) {
  const rows = Math.max(1, Math.floor(historyRows));
  const counterHeight = part(innerRadius, COUNTER_RATIO);
  const rowHeight = part(innerRadius, ROW_RATIO);
  const guessHeight = part(innerRadius, GUESS_RATIO);
  const actionHeight = part(innerRadius, ACTION_RATIO);
  const gap = part(innerRadius, GAP_RATIO);

  const height = counterHeight + gap + rows * rowHeight + gap + guessHeight + gap + actionHeight;
  const maxWidth = Math.round(2 * innerRadius * WIDTH_RATIO);
  const box = (top, size) => centeredBox(screenSize, innerRadius, top, size, maxWidth, padding);

  let top = Math.round(screenSize / 2) - Math.round(height / 2);
  const counter = box(top, counterHeight);

  top += counterHeight + gap;
  const history = [];
  for (let i = 0; i < rows; i++) {
    history.push(box(top + i * rowHeight, rowHeight));
  }
  // The history is a table, and a table needs one set of columns. Left to itself
  // each row takes the full chord at its own height, so on a round screen the row
  // furthest from the middle comes out narrowest and the guesses and their counts
  // step sideways from line to line. Every row is squared off to the narrowest.
  let narrowest = history[0];
  for (let i = 1; i < history.length; i++) {
    if (history[i].w < narrowest.w) {
      narrowest = history[i];
    }
  }
  for (let i = 0; i < history.length; i++) {
    history[i].x = narrowest.x;
    history[i].w = narrowest.w;
  }

  top += rows * rowHeight + gap;
  const guess = box(top, guessHeight);

  top += guessHeight + gap;
  const actions = box(top, actionHeight);

  return { height, gap, counter, history, guess, actions };
}

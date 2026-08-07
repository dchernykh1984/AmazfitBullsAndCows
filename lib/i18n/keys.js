// Every string the watch screen can show, as a key. This is the contract each
// language table must satisfy: the locale-completeness unit test fails if a table
// is missing a key or carries one that is not here.
export const UI_KEYS = [
  "title",
  "play",
  "resume",
  "again",
  "best",
  "tries",
  "time",
  "level",
  "level_3",
  "level_4",
  "level_5",
  "solved",
  "new_best",
  "check",
  "erase",
  "bull_mark",
  "cow_mark",
  "hint",
  "legend",
];

// The on-watch character budgets. Everything is drawn on a round screen, and a
// label that overruns its box is clipped rather than shrunk past the size a watch
// can be read at, so each key is budgeted for the narrowest box it appears in.
//
// The marks are the letters that follow the bull and cow counts in a history row,
// and they share that row with the guess itself. The two action words sit on the
// narrowest buttons in the app - half the width of the board, on the smallest
// round screen - which is where seven characters is the measured limit. The title
// gets a line of its own on the start screen, and the hint and the legend are
// full sentences under the menu.
export const MAX_MARK = 2;
export const MAX_ACTION = 7;
export const MAX_LABEL = 12;
export const MAX_TITLE = 16;
export const MAX_HINT = 20;

const MARK_KEYS = ["bull_mark", "cow_mark"];
const ACTION_KEYS = ["check", "erase"];
const SENTENCE_KEYS = ["hint", "legend"];

export function budgetFor(key) {
  if (MARK_KEYS.indexOf(key) !== -1) {
    return MAX_MARK;
  }
  if (ACTION_KEYS.indexOf(key) !== -1) {
    return MAX_ACTION;
  }
  if (key === "title") {
    return MAX_TITLE;
  }
  if (SENTENCE_KEYS.indexOf(key) !== -1) {
    return MAX_HINT;
  }
  return MAX_LABEL;
}

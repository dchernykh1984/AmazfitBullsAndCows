// Every string the watch screen can show, as a key. This is the contract each
// language table must satisfy: the locale-completeness unit test fails if a table
// is missing a key or carries one that is not here.
export const UI_KEYS = [
  "title",
  "play",
  "again",
  "best",
  "tries",
  "level",
  "level_easy",
  "level_classic",
  "level_hard",
  "level_expert",
  "solved",
  "failed",
  "secret",
  "new_best",
  "check",
  "erase",
  "bull_mark",
  "cow_mark",
  "hint",
];

// The on-watch character budgets. Everything is drawn on a round screen with no
// auto-shrinking, so a label that overruns its box is simply clipped. The marks
// are the letters that follow the bull and cow counts in a history row, and they
// share that row with the guess itself; the title gets a line of its own on the
// start screen; the hint is a full sentence under the menu.
export const MAX_MARK = 2;
export const MAX_LABEL = 12;
export const MAX_TITLE = 16;
export const MAX_HINT = 20;

const MARK_KEYS = ["bull_mark", "cow_mark"];

export function budgetFor(key) {
  if (MARK_KEYS.indexOf(key) !== -1) {
    return MAX_MARK;
  }
  if (key === "title") {
    return MAX_TITLE;
  }
  if (key === "hint") {
    return MAX_HINT;
  }
  return MAX_LABEL;
}

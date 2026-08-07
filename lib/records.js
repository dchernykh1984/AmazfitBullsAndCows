// The records table: one row per level, best first to last as the ladder runs.
// Pure - it is handed a way to read storage and gives back rows the screen can
// draw, so what the table says is unit tested without a watch.

import { LEVELS } from "./levels.js";
import { bestKey, decodeResult } from "./scores.js";
import { formatDuration, NO_TIME_TEXT } from "./timing.js";

// Shown for a level that has never been solved.
export const NO_RESULT_TEXT = "-";

// Every level with whatever record it holds:
//   { id, label, result, attempts, time }
// `result` is the decoded record or null; `attempts` and `time` are what the row
// puts on screen, already turned into text so the page has nothing left to
// decide. A level nobody has solved shows a dash in both columns rather than a
// zero, which would read as a score.
export function recordRows(read) {
  const rows = [];
  for (let i = 0; i < LEVELS.length; i++) {
    const level = LEVELS[i];
    const result = decodeResult(read(bestKey(level.id)));
    rows.push({
      id: level.id,
      label: level.label,
      result,
      attempts: result === null ? NO_RESULT_TEXT : String(result.attempts),
      time:
        result === null || result.seconds === null ? NO_TIME_TEXT : formatDuration(result.seconds),
    });
  }
  return rows;
}

// Whether anything has been solved at all, so the screen can say "nothing yet"
// instead of drawing three dashes and calling it a table.
export function hasAnyRecord(rows) {
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].result !== null) {
      return true;
    }
  }
  return false;
}

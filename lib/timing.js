// How long a game took, and how to write it on a watch.
//
// The clock is read once when the game starts and once when it is solved, and the
// answer is the difference between those two readings - not the time the board
// was actually on screen. A game left in the menu keeps running: that is the
// deliberate choice, because "how long did it take you" is a question about the
// wall clock, and because measuring attention rather than time would need the app
// to define what counts as attention.
//
// Pure, so the arithmetic and the formatting are unit tested rather than watched.

const SECOND = 1000;
const MINUTE = 60;

// Shown instead of a duration that cannot be believed - the clock moved backwards
// under us, or one of the two readings is missing.
export const NO_TIME_TEXT = "-";

// A value that is genuinely a number, rather than one Number() is willing to turn
// into zero. Number(null), Number("") and Number([]) are all 0, so a missing
// clock reading would otherwise measure from the epoch and call it a duration.
function reading(value) {
  const number = typeof value === "number" ? value : NaN;
  return Number.isFinite(number) ? number : null;
}

// Whole seconds between two clock readings, or null when the pair cannot be
// trusted. A watch's clock can be set, corrected by the phone or crossed by a
// timezone change mid-game, and a negative or absurd duration is better shown as
// nothing than as a record nobody can beat.
export function elapsedSeconds(startedAt, finishedAt) {
  const from = reading(startedAt);
  const to = reading(finishedAt);
  if (from === null || to === null) {
    return null;
  }
  const millis = to - from;
  if (millis < 0) {
    return null;
  }
  return Math.floor(millis / SECOND);
}

// A duration as minutes and seconds: "0:07", "4:31", "128:05". The minutes are
// never rolled up into hours - a Bulls and Cows game that ran for an hour is a
// game somebody walked away from, and "1:08:05" would only make that harder to
// read at a glance.
export function formatDuration(seconds) {
  const value = reading(seconds);
  if (value === null || value < 0) {
    return NO_TIME_TEXT;
  }
  const total = Math.floor(value);
  const minutes = Math.floor(total / MINUTE);
  const rest = total % MINUTE;
  return minutes + ":" + (rest < 10 ? "0" : "") + rest;
}

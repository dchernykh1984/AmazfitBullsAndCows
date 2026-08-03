// The guess history as the watch shows it: a short window onto a list that grows
// longer than the screen. Pure, so the scrolling arithmetic is unit tested rather
// than discovered by swiping past the end of the list on a wrist.
//
// The newest guess is the last entry, and the window follows it: after each guess
// the page jumps to the bottom, and a swipe walks back up through the older rows.

function size(value, fallback) {
  const count = Math.floor(Number(value));
  return Number.isFinite(count) && count > 0 ? count : fallback;
}

// The largest first-row index that still fills the window, and so also where the
// window sits when it is showing the newest guess. Zero while the whole history
// fits on screen.
export function maxOffset(count, visible) {
  return Math.max(0, size(count, 0) - size(visible, 1));
}

// An offset held inside the list. Anything unusable reads as the top.
export function clampOffset(count, visible, offset) {
  const wanted = Math.floor(Number(offset));
  if (!Number.isFinite(wanted) || wanted < 0) {
    return 0;
  }
  return Math.min(wanted, maxOffset(count, visible));
}

// The offset after scrolling by `delta` rows: positive scrolls towards the newest
// guess, negative towards the oldest. Stops at both ends instead of wrapping.
export function scrollBy(count, visible, offset, delta) {
  const step = Math.floor(Number(delta));
  const from = clampOffset(count, visible, offset);
  return clampOffset(count, visible, from + (Number.isFinite(step) ? step : 0));
}

// The rows to draw: at most `visible` entries starting at `offset`.
export function windowOf(entries, visible, offset) {
  const rows = size(visible, 1);
  const start = clampOffset(entries.length, rows, offset);
  return entries.slice(start, start + rows);
}

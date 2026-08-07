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

// One page back through the history, wrapping to the newest guesses once the
// oldest is on screen. Paging only goes one way on purpose: it is driven by a
// single control, and a control that always does the same thing is one a thumb
// learns in two taps.
export function pageBack(count, visible, offset) {
  const rows = size(visible, 1);
  const from = clampOffset(count, rows, offset);
  if (from === 0) {
    return maxOffset(count, rows);
  }
  return clampOffset(count, rows, from - rows);
}

// What the pager says: "4-6/12" - the guesses on screen out of the guesses
// played. Null while everything played still fits on screen, which is when there
// is nothing to page and the pager should not be there at all.
export function windowLabel(count, visible, offset) {
  const total = size(count, 0);
  const rows = size(visible, 1);
  if (total <= rows) {
    return null;
  }
  const start = clampOffset(total, rows, offset);
  const last = Math.min(total, start + rows);
  return start + 1 + "-" + last + "/" + total;
}

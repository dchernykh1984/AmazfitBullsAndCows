// Zepp OS draws text at exactly the size it is given and clips whatever hangs
// over the edge - it never shrinks a label to fit. Every string on screen is
// translated into eleven languages, and the longest of them is often half again
// the length of the English, so a size chosen for "OK" will cut "Стереть" in
// half. This picks the largest size that still fits the box.
//
// Pure, so the rule is unit tested instead of found by reading a clipped word on
// a wrist.

// Roughly the average advance of a glyph, as a fraction of the text size, in the
// sans font the watch draws with. Deliberately generous: overestimating costs a
// point of text size, underestimating costs a clipped word.
export const GLYPH_RATIO = 0.6;

// How much of the box's width a label may use, leaving the rest as the air that
// keeps text off a pill's rounded ends.
export const SIDE_MARGIN = 0.86;

// Below this a label is unreadable on a watch, so a box too small for its text
// clips instead of shrinking further.
export const MIN_TEXT_SIZE = 12;

// The largest text size at or below `wanted` that fits `text` across `box`.
export function fitTextSize(box, text, wanted) {
  const glyphs = Math.max(1, String(text === undefined || text === null ? "" : text).length);
  const byWidth = Math.floor((box.w * SIDE_MARGIN) / (glyphs * GLYPH_RATIO));
  return Math.max(MIN_TEXT_SIZE, Math.min(Math.round(wanted), byWidth));
}

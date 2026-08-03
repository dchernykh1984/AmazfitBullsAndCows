// Pure geometry for keeping content inside a round screen. A round watch cuts the
// corners off a row, so a line placed too near the top or bottom is sliced by the
// bezel unless its width is limited to the chord of the circle at that height.
//
// Every helper takes the circle it must stay inside as a radius concentric with
// the screen: the screen radius for a full-width menu, and the smaller radius left
// free inside the keypad ring for the board the game plays on.

// Half the on-screen width of a circle of the given radius, at dy pixels from its
// horizontal centre line. Zero past the edge of the circle.
export function chordHalfWidth(radius, dy) {
  const distance = Math.abs(dy);
  if (distance >= radius) {
    return 0;
  }
  return Math.sqrt(radius * radius - distance * distance);
}

// The widest a horizontally-centred line may be at vertical position y (its
// centre), inside a circle of the given radius concentric with the screen, once a
// padding is kept from the edge on each side. The binding chord is at whichever
// end of the line's height is furthest from the centre line.
export function safeLineWidth(screenSize, radius, y, lineHeight, padding) {
  const centre = screenSize / 2;
  const dyTop = Math.abs(y - lineHeight / 2 - centre);
  const dyBottom = Math.abs(y + lineHeight / 2 - centre);
  const half = chordHalfWidth(radius, Math.max(dyTop, dyBottom));
  const width = 2 * half - 2 * padding;
  return width > 0 ? width : 0;
}

// A horizontally-centred box of the given height whose top edge is at `top`,
// never wider than `maxWidth` and never poking past the circle. Returned as the
// pixel box the page hands straight to createWidget.
export function centeredBox(screenSize, radius, top, height, maxWidth, padding) {
  const safe = safeLineWidth(screenSize, radius, top + height / 2, height, padding);
  const width = Math.floor(Math.min(maxWidth, safe));
  return { x: Math.round((screenSize - width) / 2), y: top, w: width, h: height };
}

// A box split into `count` equal columns separated by `gap` pixels, with the row
// of columns centred in it. No column is wider than `maxWidth`, which is how a
// three-digit guess gets slots the same size as a five-digit one instead of three
// enormous ones. Every row of cells on the board - the guess slots, the two
// action buttons, the columns of a history row - is this one shape.
export function columnsIn(box, count, gap, maxWidth) {
  const columns = Math.max(1, Math.floor(count));
  const space = Math.max(0, Math.floor(gap));
  const cap = Number.isFinite(Number(maxWidth)) ? Number(maxWidth) : box.w;
  const width = Math.max(1, Math.min(cap, Math.floor((box.w - (columns - 1) * space) / columns)));
  const left = box.x + Math.round((box.w - (width * columns + space * (columns - 1))) / 2);

  const cells = [];
  for (let i = 0; i < columns; i++) {
    cells.push({ x: left + i * (width + space), y: box.y, w: width, h: box.h });
  }
  return cells;
}

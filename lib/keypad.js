// The keypad, laid out as a ring of round keys just inside the bezel. Pure pixel
// maths with no Zepp OS dependency, so the layout is unit tested instead of eyed
// on a watch.
//
// A round screen has no good place for a 3x4 grid of digits, but it has a perfect
// one for a ring: ten keys spaced evenly around the edge are all the same distance
// from the centre and all equally easy to reach with a thumb. What the ring
// encloses is a smaller circle, which is where the game draws the guess history -
// hence `innerRadius`, the free radius the caller must stay inside.

// Fractions of the screen diameter. The key is big enough to hit without looking
// (about 72px on a 466px screen), the bezel margin keeps it off the curved glass,
// and the gap separates the ring from whatever is drawn inside it.
const KEY_SIZE_RATIO = 0.155;
const MARGIN_RATIO = 0.015;
const GAP_RATIO = 0.02;

// Slot 0 sits at the top of the screen and the rest follow clockwise, so the keys
// read like the hours on a watch face.
const START_ANGLE = -Math.PI / 2;

function ratioSize(screenSize, ratio, override) {
  const explicit = Math.floor(Number(override));
  if (Number.isFinite(explicit) && explicit > 0) {
    return explicit;
  }
  return Math.max(1, Math.round(screenSize * ratio));
}

// The ring for `count` keys on a round screen of `screenSize` pixels across.
// Returns the key size, the radius the key centres sit on, the free radius left
// inside the ring, and the pixel box of every slot in clockwise order from the
// top. Options (`keySize`, `margin`, `gap`) are for tests and for a future screen
// that needs them; the defaults are derived from the diameter so 466 and 480 both
// come out right.
export function keypadLayout(screenSize, count, options) {
  const config = options || {};
  const keys = Math.max(1, Math.floor(count));
  const keySize = ratioSize(screenSize, KEY_SIZE_RATIO, config.keySize);
  const margin = ratioSize(screenSize, MARGIN_RATIO, config.margin);
  const gap = ratioSize(screenSize, GAP_RATIO, config.gap);

  const centre = screenSize / 2;
  const radius = centre - margin - keySize / 2;
  const innerRadius = Math.max(0, radius - keySize / 2 - gap);

  const slots = [];
  for (let i = 0; i < keys; i++) {
    const angle = START_ANGLE + (i * 2 * Math.PI) / keys;
    const x = centre + radius * Math.cos(angle);
    const y = centre + radius * Math.sin(angle);
    slots.push({
      x: Math.round(x - keySize / 2),
      y: Math.round(y - keySize / 2),
      w: keySize,
      h: keySize,
    });
  }

  return { count: keys, keySize, radius, innerRadius, slots };
}

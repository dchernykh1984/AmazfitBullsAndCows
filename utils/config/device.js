import { getDeviceInfo } from "@zos/device";

// The smallest round screen the app is built for. Used only if a firmware cannot
// say how big its screen is: the layout would then be drawn for a smaller watch
// than it is on, which is a game with some air around it rather than one drawn
// off the edge - and far better than the blank screen a throw at module load
// would give, since a page module that fails to load never draws at all.
const FALLBACK_SIZE = 360;

function screenSize() {
  try {
    const info = getDeviceInfo();
    const size = Math.min(Number(info.width), Number(info.height));
    if (Number.isFinite(size) && size > 0) {
      return Math.floor(size);
    }
  } catch {
    // Fall through to the fallback below.
  }
  return FALLBACK_SIZE;
}

// The app targets round watches only, so the screen is a circle: one diameter
// drives the keypad ring and every chord calculation. Taking the smaller side
// keeps that true even if a device reports a pixel of slop between width and
// height.
export const SCREEN_SIZE = screenSize();

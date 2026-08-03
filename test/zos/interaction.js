// A fake @zos/interaction: it holds the page's gesture callback so a test can
// swipe. The constants are arbitrary but distinct, like the real ones.
export const GESTURE_UP = 1;
export const GESTURE_DOWN = 2;
export const GESTURE_LEFT = 3;
export const GESTURE_RIGHT = 4;

let handler = null;

export function onGesture(options) {
  handler = options.callback;
}

export function offGesture() {
  handler = null;
}

export function isHooked() {
  return handler !== null;
}

// Swipe. Returns what the page returned: true means it swallowed the gesture,
// false means the system handles it (which, for a right swipe, is leaving).
export function swipe(gesture) {
  if (!handler) {
    throw new Error("no gesture handler is hooked up");
  }
  return handler(gesture);
}

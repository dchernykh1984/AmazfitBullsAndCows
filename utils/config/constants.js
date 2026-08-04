// Guesses visible at once inside the ring. Three rows keep the type big enough to
// read at arm's length; the rest of the history is a swipe away.
export const HISTORY_ROWS = 3;

// How few attempts are left before the counter turns from muted to a warning.
export const LOW_ATTEMPTS = 2;

// Shown in place of a best result on a level that has never been solved.
export const NO_BEST_TEXT = "-";

// Colors drawn on the (black) watch screen.
export const COLOR_BACKGROUND = 0x000000;
export const COLOR_PANEL = 0x0c1013;
export const COLOR_TEXT = 0xffffff;
export const COLOR_MUTED = 0x9aa4ab;
export const COLOR_WARN = 0xff5a3c;

// A bull is a digit in the right place, a cow a digit in the wrong one. The two
// keep their colors everywhere they appear: the counts in the history rows, the
// solved headline and the revealed code in the bull colour - a solved code is all
// bulls - and a new best in the cow colour, so the two lines of a won game do not
// read as one.
export const COLOR_BULL = 0xffb020;
export const COLOR_COW = 0x35c4a0;

// The keys of the ring, and the dimmed look a key takes once its digit is already
// in the guess being composed.
export const COLOR_KEY = 0x1d262c;
export const COLOR_KEY_PRESSED = 0x2f3d46;
export const COLOR_KEY_TAKEN = 0x11171b;
export const COLOR_KEY_TEXT_TAKEN = 0x46525a;

// The slots of the guess being composed: empty, already filled, and the one the
// next digit goes into.
export const COLOR_SLOT = 0x161d22;
export const COLOR_SLOT_NEXT = 0x27333b;
export const COLOR_SLOT_FILLED = 0x2f3d46;

// Buttons: the neutral ones (erase, menus) and the accented one that plays a
// guess, which only lights up once the guess is complete.
export const COLOR_BUTTON = 0x1d262c;
export const COLOR_BUTTON_PRESSED = 0x2f3d46;
export const COLOR_ACCENT = 0x1e7a56;
export const COLOR_ACCENT_PRESSED = 0x2aa073;

// The padding kept between any centred text or button and the edge of the circle
// it lives in.
export const SCREEN_PADDING = 8;

// How long the screen stays lit while the app is open. Bulls and Cows is played
// in long thinking pauses, and a ten-second display timeout would black out
// mid-deduction, so the page asks for ten minutes and hands the setting back when
// it closes.
export const BRIGHT_TIME_MS = 600000;

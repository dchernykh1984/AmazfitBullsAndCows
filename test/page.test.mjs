import { describe, it, expect, vi } from "vitest";
import { LABELS } from "../lib/i18n/labels.js";
import { DEFAULT_LEVEL, LEVELS, levelAt } from "../lib/levels.js";
import { DIGIT_COUNT } from "../lib/bulls-and-cows.js";
import { keypadLayout } from "../lib/keypad.js";
import { LEVEL_KEY, bestKey } from "../lib/scores.js";
import {
  COLOR_ACCENT,
  COLOR_BULL,
  COLOR_BUTTON,
  COLOR_COW,
  COLOR_KEY_TAKEN,
  COLOR_KEY_TEXT_TAKEN,
  COLOR_MUTED,
  COLOR_SLOT,
  COLOR_SLOT_FILLED,
  COLOR_SLOT_NEXT,
  COLOR_TEXT,
  COLOR_WARN,
  HISTORY_ROWS,
  LOW_ATTEMPTS,
} from "../utils/config/constants.js";
import { GESTURE_DOWN, GESTURE_LEFT, GESTURE_RIGHT, GESTURE_UP } from "./zos/interaction.js";

const EN = LABELS.en;
const CLASSIC = DEFAULT_LEVEL;
const EASY = 0;
const EXPERT = 3;

// Open the app the way the watch does: fresh modules, a fresh screen, then
// build(). Everything the test needs to poke at the page comes back with it.
async function openPage(options) {
  const config = options || {};
  vi.resetModules();

  const device = await import("./zos/device.js");
  const storage = await import("./zos/storage.js");
  const settings = await import("./zos/settings.js");
  const ui = await import("./zos/ui.js");
  const interaction = await import("./zos/interaction.js");
  const display = await import("./zos/display.js");

  device.setSize(config.size || 466);
  storage.seed(config.stored || {});
  if (config.language !== undefined) {
    settings.setLanguageCode(config.language);
  }
  if (config.noSettings) {
    settings.failOnRead();
  }
  if (config.noStorage) {
    storage.breakStorage();
  }
  if (config.noWrites) {
    storage.breakWrites();
  }
  if (config.noReads) {
    storage.breakReads();
  }

  let page = null;
  globalThis.Page = (definition) => {
    page = definition;
  };
  await import("../page/index.js");
  page.build();

  return { page, ui, interaction, display, storage, size: config.size || 466 };
}

// The i18n key of the level the start screen shows after `index` taps on the
// level button, starting from the one a fresh install opens on.
function levelKey(index) {
  return LEVELS[(index + CLASSIC) % LEVELS.length].label;
}

function enter(ui, digits) {
  for (const digit of digits) {
    ui.tap(String(digit));
  }
}

function guess(ui, digits) {
  enter(ui, digits);
  ui.tap(EN.check);
}

// A guess that is legal, differently ordered, and therefore never a win: with
// distinct digits a rotation cannot line any digit up with itself.
function rotated(digits) {
  return digits.slice(1).concat(digits[0]);
}

function rects(ui, color) {
  return ui.liveOfType("FILL_RECT").filter((w) => w.props.color === color);
}

function textsColored(ui, color) {
  return ui
    .liveOfType("TEXT")
    .filter((w) => w.props.color === color)
    .map((w) => w.props.text);
}

function takenKeys(ui) {
  return ui.liveOfType("BUTTON").filter((w) => w.props.normal_color === COLOR_KEY_TAKEN);
}

function boxOf(widget) {
  return { x: widget.props.x, y: widget.props.y, w: widget.props.w, h: widget.props.h };
}

// The guesses in the history, as widgets: the white all-digit lines. The digits
// of a guess being composed are white too, so this only reads cleanly while no
// guess is part-entered - which is the state the history is looked at in.
function historyRows(ui) {
  return ui
    .liveOfType("TEXT")
    .filter((w) => w.props.color === COLOR_TEXT && /^[0-9]+$/.test(w.props.text));
}

function counterOf(ui) {
  return ui.liveOfType("TEXT").find((w) => /^[0-9]+\/[0-9]+$/.test(w.props.text));
}

function slots(ui) {
  return ui
    .liveOfType("FILL_RECT")
    .filter((w) => [COLOR_SLOT, COLOR_SLOT_NEXT, COLOR_SLOT_FILLED].indexOf(w.props.color) !== -1);
}

describe("the start screen", () => {
  it("offers the game, the level and the best result", async () => {
    const { ui } = await openPage();
    expect(ui.hasText(EN.title)).toBe(true);
    expect(ui.hasText(EN.best + " -")).toBe(true);
    expect(ui.hasText(EN.level)).toBe(true);
    expect(ui.hasText(EN.level_classic)).toBe(true);
    expect(ui.buttonWith(EN.play)).toBeTruthy();
    expect(ui.hasText(EN.hint)).toBe(true);
  });

  it("listens for swipes and keeps the screen lit", async () => {
    const { interaction, display } = await openPage();
    expect(interaction.isHooked()).toBe(true);
    expect(display.brightTimes()).toEqual([600000]);
  });

  it("walks through every level and comes back round", async () => {
    const { ui } = await openPage();
    for (let i = 1; i < LEVELS.length; i++) {
      ui.tap(EN[levelKey(i - 1)]);
      expect(ui.hasText(EN[levelKey(i)])).toBe(true);
    }
    ui.tap(EN[levelKey(LEVELS.length - 1)]);
    expect(ui.hasText(EN.level_classic)).toBe(true);
  });

  it("stores the level that is actually played, not every one looked at", async () => {
    const { ui, storage } = await openPage();
    ui.tap(EN.level_classic);
    ui.tap(EN.level_hard);
    expect(storage.stored()[LEVEL_KEY]).toBeUndefined();

    ui.tap(EN.play);
    expect(storage.stored()[LEVEL_KEY]).toBe(levelAt(EXPERT).id);
  });

  it("cycles the level on a swipe as well as a tap", async () => {
    const { ui, interaction } = await openPage();
    const swallowed = interaction.swipe(GESTURE_UP);
    expect(swallowed).toBe(true);
    expect(ui.hasText(EN.level_hard)).toBe(true);
  });

  it("opens on the level it was left on, with that level's best", async () => {
    const stored = {
      [LEVEL_KEY]: levelAt(EASY).id,
      [bestKey(levelAt(EASY).id)]: 4,
      [bestKey(levelAt(CLASSIC).id)]: 9,
    };
    const { ui } = await openPage({ stored });
    expect(ui.hasText(EN.level_easy)).toBe(true);
    expect(ui.hasText(EN.best + " 4")).toBe(true);
  });

  it("shows the localized text of the device language", async () => {
    const { ui } = await openPage({ language: 4 });
    expect(ui.hasText(LABELS.ru.title)).toBe(true);
    expect(ui.hasText(LABELS.ru.play)).toBe(true);
  });

  it("falls back to English when the firmware has no language setting", async () => {
    const { ui } = await openPage({ noSettings: true });
    expect(ui.hasText(EN.title)).toBe(true);
  });

  it("plays on a watch with no storage at all", async () => {
    const { ui } = await openPage({ noStorage: true });
    expect(ui.hasText(EN.best + " -")).toBe(true);
    ui.tap(EN.play);
    expect(ui.liveOfType("BUTTON").filter((w) => /^[0-9]$/.test(w.props.text))).toHaveLength(
      DIGIT_COUNT
    );
  });

  it("plays on when storage refuses a read or a write", async () => {
    for (const options of [{ noReads: true }, { noWrites: true }]) {
      const { ui, page } = await openPage(options);
      expect(ui.hasText(EN.title)).toBe(true);
      ui.tap(EN.play);
      guess(ui, page.state.game.secret);
      expect(ui.hasText(EN.solved)).toBe(true);
    }
  });

  // A storage that cannot be written still has to hold the result for as long as
  // the app is open, or a player who wins twice is told the second one is a
  // record all over again. The level ring is the way back to the same level, and
  // it re-reads the best from storage - which is where a session-only result
  // used to fall out.
  it("remembers the result for the session when it cannot be stored", async () => {
    const { ui, page } = await openPage({ noWrites: true });
    ui.tap(EN.play);
    guess(ui, rotated(page.state.game.secret));
    guess(ui, page.state.game.secret);
    expect(ui.hasText(EN.new_best)).toBe(true);

    ui.tap(EN.again);
    expect(ui.hasText(EN.best + " 2")).toBe(true);

    for (let i = 0; i < LEVELS.length; i++) {
      ui.tap(EN[levelKey(i)]);
    }
    expect(ui.hasText(EN.level_classic)).toBe(true);
    expect(ui.hasText(EN.best + " 2")).toBe(true);
  });

  it("reads a stored best back as a number, not as the text it was stored as", async () => {
    const stored = { [LEVEL_KEY]: levelAt(CLASSIC).id, [bestKey(levelAt(CLASSIC).id)]: 7 };
    const { ui, page } = await openPage({ stored });
    expect(ui.hasText(EN.best + " 7")).toBe(true);

    // A three-guess win beats a stored "7", which a string comparison would not.
    ui.tap(EN.play);
    guess(ui, rotated(page.state.game.secret));
    guess(ui, rotated(page.state.game.secret));
    guess(ui, page.state.game.secret);
    expect(ui.hasText(EN.new_best)).toBe(true);
  });
});

describe("a game in progress", () => {
  it("draws the ring of digits and one slot per digit of the code", async () => {
    const { ui, page } = await openPage();
    ui.tap(EN.play);

    const keys = ui.liveOfType("BUTTON").filter((w) => /^[0-9]$/.test(w.props.text));
    expect(keys).toHaveLength(DIGIT_COUNT);
    expect(keys.map((w) => w.props.text).sort()).toEqual(
      ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].sort()
    );

    expect(page.state.game.length).toBe(LEVELS[CLASSIC].length);
    expect(rects(ui, COLOR_SLOT_NEXT)).toHaveLength(1);
    expect(rects(ui, COLOR_SLOT)).toHaveLength(LEVELS[CLASSIC].length - 1);
    expect(ui.hasText("0/" + LEVELS[CLASSIC].maxAttempts)).toBe(true);
    expect(ui.hasText(EN.title)).toBe(false);
  });

  it("puts every key exactly where the ring layout says", async () => {
    for (const size of [360, 466, 480]) {
      const { ui } = await openPage({ size });
      ui.tap(EN.play);
      const layout = keypadLayout(size, DIGIT_COUNT);
      for (let digit = 0; digit < DIGIT_COUNT; digit++) {
        expect(boxOf(ui.buttonWith(String(digit))), `${size}px key ${digit}`).toEqual(
          layout.slots[digit]
        );
      }
    }
  });

  it("draws one slot per digit on every level", async () => {
    for (let level = 0; level < LEVELS.length; level++) {
      const { ui, page } = await openPage({ stored: { [LEVEL_KEY]: levelAt(level).id } });
      ui.tap(EN.play);
      expect(slots(ui), LEVELS[level].id).toHaveLength(LEVELS[level].length);
      expect(page.state.game.length).toBe(LEVELS[level].length);
      expect(ui.hasText("0/" + LEVELS[level].maxAttempts)).toBe(true);
    }
  });

  it("lights the play button only once the guess is complete", async () => {
    const { ui } = await openPage();
    ui.tap(EN.play);
    expect(ui.buttonWith(EN.check).props.normal_color).toBe(COLOR_BUTTON);
    expect(ui.buttonWith(EN.erase).props.color).toBe(COLOR_MUTED);

    enter(ui, [1, 2, 3]);
    expect(ui.buttonWith(EN.check).props.normal_color).toBe(COLOR_BUTTON);
    expect(ui.buttonWith(EN.erase).props.color).toBe(COLOR_TEXT);

    ui.tap("4");
    expect(ui.buttonWith(EN.check).props.normal_color).toBe(COLOR_ACCENT);

    ui.tap(EN.erase);
    expect(ui.buttonWith(EN.check).props.normal_color).toBe(COLOR_BUTTON);
  });

  it("warns on the counter when the guesses are nearly gone", async () => {
    const { ui, page } = await openPage({ stored: { [LEVEL_KEY]: levelAt(EASY).id } });
    ui.tap(EN.play);
    const secret = page.state.game.secret;
    const wrong = rotated(secret);
    const budget = LEVELS[EASY].maxAttempts;

    for (let i = 0; i < budget - LOW_ATTEMPTS - 1; i++) {
      guess(ui, wrong);
    }
    expect(counterOf(ui).props.color).toBe(COLOR_MUTED);

    guess(ui, wrong);
    expect(counterOf(ui).props.text).toBe(budget - LOW_ATTEMPTS + "/" + budget);
    expect(counterOf(ui).props.color).toBe(COLOR_WARN);
  });

  it("fills the next slot when a digit is tapped, and dims that key", async () => {
    const { ui, page } = await openPage();
    ui.tap(EN.play);

    ui.tap("7");
    expect(page.state.entered).toEqual([7]);
    expect(rects(ui, COLOR_SLOT_FILLED)).toHaveLength(1);
    expect(rects(ui, COLOR_SLOT_NEXT)).toHaveLength(1);
    expect(takenKeys(ui).map((w) => w.props.text)).toEqual(["7"]);
    // The digit dims with its key, or a dark number is left on a dark face.
    expect(ui.buttonWith("7").props.color).toBe(COLOR_KEY_TEXT_TAKEN);
    expect(ui.buttonWith("6").props.color).toBe(COLOR_TEXT);

    ui.tap("0");
    expect(page.state.entered).toEqual([7, 0]);
    expect(
      takenKeys(ui)
        .map((w) => w.props.text)
        .sort()
    ).toEqual(["0", "7"]);
  });

  it("refuses a digit that is already in the guess", async () => {
    const { ui, page } = await openPage();
    ui.tap(EN.play);
    ui.tap("7");
    ui.tap("7");
    expect(page.state.entered).toEqual([7]);
  });

  it("takes no more digits than the code is long", async () => {
    const { ui, page } = await openPage();
    ui.tap(EN.play);
    enter(ui, [1, 2, 3, 4]);
    ui.tap("5");
    expect(page.state.entered).toEqual([1, 2, 3, 4]);
    expect(rects(ui, COLOR_SLOT_NEXT)).toHaveLength(0);
  });

  it("lets a digit repeat on the expert level, and keeps every key lit", async () => {
    const { ui, page } = await openPage({ stored: { [LEVEL_KEY]: levelAt(EXPERT).id } });
    ui.tap(EN.play);
    ui.tap("7");
    ui.tap("7");
    expect(page.state.entered).toEqual([7, 7]);
    expect(takenKeys(ui)).toHaveLength(0);
  });

  it("takes the last digit back, by button and by swipe", async () => {
    const { ui, page, interaction } = await openPage();
    ui.tap(EN.play);
    enter(ui, [1, 2]);

    ui.tap(EN.erase);
    expect(page.state.entered).toEqual([1]);
    expect(takenKeys(ui).map((w) => w.props.text)).toEqual(["1"]);

    expect(interaction.swipe(GESTURE_LEFT)).toBe(true);
    expect(page.state.entered).toEqual([]);
    expect(takenKeys(ui)).toHaveLength(0);

    // Erasing an empty guess is a no-op, not a crash.
    ui.tap(EN.erase);
    expect(page.state.entered).toEqual([]);
  });

  it("does nothing until the guess is complete", async () => {
    const { ui, page } = await openPage();
    ui.tap(EN.play);
    enter(ui, [1, 2, 3]);
    ui.tap(EN.check);
    expect(page.state.game.history).toHaveLength(0);
    expect(page.state.entered).toEqual([1, 2, 3]);
    expect(ui.hasText("0/10")).toBe(true);
  });

  it("plays a complete guess and shows its bulls and cows", async () => {
    const { ui, page } = await openPage();
    ui.tap(EN.play);
    const secret = page.state.game.secret;

    guess(ui, rotated(secret));
    expect(page.state.game.history).toHaveLength(1);
    expect(page.state.entered).toEqual([]);
    expect(ui.hasText(secret.slice(1).concat(secret[0]).join(""))).toBe(true);
    expect(textsColored(ui, COLOR_BULL)).toEqual(["0" + EN.bull_mark]);
    expect(textsColored(ui, COLOR_COW)).toEqual(["4" + EN.cow_mark]);
    expect(ui.hasText("1/10")).toBe(true);
    expect(rects(ui, COLOR_SLOT_FILLED)).toHaveLength(0);
    expect(takenKeys(ui)).toHaveLength(0);
  });

  it("shows a partly right guess as bulls and cows together", async () => {
    const { ui, page } = await openPage();
    ui.tap(EN.play);
    const secret = page.state.game.secret;
    // Keep the first two digits in place and swap the last two.
    const near = [secret[0], secret[1], secret[3], secret[2]];

    guess(ui, near);
    expect(textsColored(ui, COLOR_BULL)).toEqual(["2" + EN.bull_mark]);
    expect(textsColored(ui, COLOR_COW)).toEqual(["2" + EN.cow_mark]);
  });
});

describe("the end of a game", () => {
  it("celebrates a solved code and stores the result", async () => {
    const { ui, page, storage } = await openPage();
    ui.tap(EN.play);
    const secret = page.state.game.secret;

    guess(ui, rotated(secret));
    guess(ui, secret);

    expect(ui.hasText(EN.solved)).toBe(true);
    expect(ui.hasText(EN.tries + " 2")).toBe(true);
    expect(ui.hasText(EN.new_best)).toBe(true);
    expect(storage.stored()[bestKey(levelAt(CLASSIC).id)]).toBe(2);
    // The board and the keypad are gone; only the result is on screen.
    expect(ui.liveOfType("BUTTON").filter((w) => /^[0-9]$/.test(w.props.text))).toHaveLength(0);
  });

  it("only calls it a record when the game was shorter", async () => {
    const { ui, page, storage } = await openPage({ stored: { [bestKey(levelAt(CLASSIC).id)]: 2 } });
    ui.tap(EN.play);
    const secret = page.state.game.secret;

    guess(ui, rotated(secret));
    guess(ui, rotated(secret));
    guess(ui, secret);

    expect(ui.hasText(EN.new_best)).toBe(false);
    expect(ui.hasText(EN.best + " 2")).toBe(true);
    expect(storage.stored()[bestKey(levelAt(CLASSIC).id)]).toBe(2);
  });

  it("reveals the code when the guesses run out", async () => {
    const { ui, page } = await openPage({ stored: { [LEVEL_KEY]: levelAt(EASY).id } });
    ui.tap(EN.play);
    const secret = page.state.game.secret;
    const wrong = rotated(secret);

    for (let i = 0; i < LEVELS[EASY].maxAttempts; i++) {
      guess(ui, wrong);
    }

    expect(ui.hasText(EN.failed)).toBe(true);
    expect(ui.hasText(EN.secret)).toBe(true);
    expect(ui.hasText(secret.join(""))).toBe(true);
    expect(ui.buttonWith(EN.again)).toBeTruthy();
  });

  it("goes back to the start screen, showing the new best", async () => {
    const { ui, page } = await openPage();
    ui.tap(EN.play);
    guess(ui, page.state.game.secret);
    ui.tap(EN.again);

    expect(ui.hasText(EN.title)).toBe(true);
    expect(ui.hasText(EN.best + " 1")).toBe(true);
    expect(ui.buttonWith(EN.play)).toBeTruthy();
  });

  it("keeps the best of a level with the level it was set on", async () => {
    const { ui, page, storage } = await openPage({ stored: { [LEVEL_KEY]: levelAt(EASY).id } });
    ui.tap(EN.play);
    guess(ui, page.state.game.secret);
    ui.tap(EN.again);

    expect(storage.stored()[bestKey(levelAt(EASY).id)]).toBe(1);
    expect(storage.stored()[bestKey(levelAt(CLASSIC).id)]).toBeUndefined();
    ui.tap(EN.level_easy);
    expect(ui.hasText(EN.best + " -")).toBe(true);
  });
});

describe("the history window", () => {
  // A run of consecutive digits: always a legal guess (a run shorter than the
  // alphabet cannot repeat a digit) and a different one for every index. The
  // secret is stepped over, so a probe can never win by accident and end the
  // game early.
  function probe(index, length, secret) {
    const digits = [];
    for (let i = 0; i < length; i++) {
      digits.push((index + i) % 10);
    }
    return digits.join("") === secret.join("") ? probe(index + 1, length, secret) : digits;
  }

  // Play `count` guesses that are all different, so a row on screen says which
  // guess it is and scrolling can be read off the screen rather than off a
  // counter.
  async function playedGame(count) {
    const opened = await openPage();
    opened.ui.tap(EN.play);
    const game = opened.page.state.game;
    const played = [];
    for (let i = 0; i < count; i++) {
      const digits = probe(i, game.length, game.secret);
      played.push(digits.join(""));
      guess(opened.ui, digits);
    }
    return { ...opened, played };
  }

  // The guesses the history is showing, oldest row first.
  function shownGuesses(ui) {
    return textsColored(ui, COLOR_TEXT).filter((text) => /^[0-9]+$/.test(text));
  }

  it("shows only the newest few guesses", async () => {
    const { ui, played } = await playedGame(5);
    expect(shownGuesses(ui)).toEqual(played.slice(-HISTORY_ROWS));
    expect(textsColored(ui, COLOR_BULL)).toHaveLength(HISTORY_ROWS);
  });

  // A history that does not line up reads as a staggered list rather than a
  // table, which is what a round screen does to it if each row takes the full
  // chord at its own height.
  it("lines the rows up one under another, in one column", async () => {
    const { ui } = await playedGame(HISTORY_ROWS);
    const rows = historyRows(ui);
    expect(rows).toHaveLength(HISTORY_ROWS);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].props.y).toBeGreaterThanOrEqual(rows[i - 1].props.y + rows[i - 1].props.h);
      expect(rows[i].props.x).toBe(rows[0].props.x);
      expect(rows[i].props.w).toBe(rows[0].props.w);
    }
  });

  it("keeps the bulls and the cows in their own columns", async () => {
    const { ui } = await playedGame(HISTORY_ROWS);
    const bulls = ui.liveOfType("TEXT").filter((w) => w.props.color === COLOR_BULL);
    const cows = ui.liveOfType("TEXT").filter((w) => w.props.color === COLOR_COW);
    for (let i = 0; i < HISTORY_ROWS; i++) {
      expect(bulls[i].props.x).toBe(bulls[0].props.x);
      expect(cows[i].props.x).toBe(cows[0].props.x);
      expect(cows[i].props.x).toBeGreaterThan(bulls[i].props.x);
      expect(bulls[i].props.y).toBe(historyRows(ui)[i].props.y);
    }
  });

  it("scrolls back through the older guesses and forward again", async () => {
    const { ui, played, interaction } = await playedGame(5);

    expect(interaction.swipe(GESTURE_DOWN)).toBe(true);
    expect(shownGuesses(ui)).toEqual(played.slice(1, 4));

    interaction.swipe(GESTURE_DOWN);
    expect(shownGuesses(ui)).toEqual(played.slice(0, 3));

    // Already at the oldest guess: there is nowhere further back to go.
    interaction.swipe(GESTURE_DOWN);
    expect(shownGuesses(ui)).toEqual(played.slice(0, 3));

    interaction.swipe(GESTURE_UP);
    expect(shownGuesses(ui)).toEqual(played.slice(1, 4));
  });

  it("jumps back to the newest guess when one is played", async () => {
    const { ui, page, played, interaction } = await playedGame(5);
    interaction.swipe(GESTURE_DOWN);
    interaction.swipe(GESTURE_DOWN);
    expect(shownGuesses(ui)).toEqual(played.slice(0, 3));

    const next = probe(5, page.state.game.length, page.state.game.secret);
    guess(ui, next);
    expect(shownGuesses(ui)).toEqual(played.slice(-2).concat(next.join("")));
  });

  it("has nothing to scroll before the first guess", async () => {
    const { ui, interaction } = await playedGame(0);
    expect(interaction.swipe(GESTURE_DOWN)).toBe(true);
    expect(shownGuesses(ui)).toEqual([]);
  });
});

describe("housekeeping", () => {
  it("lets a right swipe leave the app from a menu", async () => {
    const { interaction } = await openPage();
    expect(interaction.swipe(GESTURE_RIGHT)).toBe(false);
  });

  it("swallows the right swipe during a game, so a key tap cannot quit it", async () => {
    const { ui, page, interaction } = await openPage();
    ui.tap(EN.play);
    expect(interaction.swipe(GESTURE_RIGHT)).toBe(true);
    expect(page.state.game).not.toBe(null);

    // ... and hands it back once the game is over.
    guess(ui, page.state.game.secret);
    expect(interaction.swipe(GESTURE_RIGHT)).toBe(false);
  });

  it("ignores swipes once the page is gone", async () => {
    const { page, interaction } = await openPage();
    page.onDestroy();
    expect(interaction.isHooked()).toBe(false);
    // A gesture already in flight when the page closed must not draw onto a
    // screen that is being torn down.
    expect(page.onGesture(GESTURE_UP)).toBe(false);
    expect(page.onGesture(GESTURE_LEFT)).toBe(false);
  });

  it("hands the screen timeout back when it closes", async () => {
    const { page, display } = await openPage();
    page.onDestroy();
    expect(display.resetCount()).toBe(1);
  });

  it("does not pile up widgets over a long game", async () => {
    const { ui, page } = await openPage();
    ui.tap(EN.play);
    const secret = page.state.game.secret;
    const wrong = rotated(secret);
    for (let i = 0; i < 8; i++) {
      guess(ui, wrong);
    }
    // The ring, the panel and one board: a bounded screen, however long the game.
    expect(ui.live().length).toBeLessThan(40);
  });
});

describe("the layout on every round screen", () => {
  function insideCircle(x, y, size) {
    const dx = x - size / 2;
    const dy = y - size / 2;
    return Math.sqrt(dx * dx + dy * dy) <= size / 2 + 1;
  }

  // Every widget has to sit on the glass, and every line of text has to fit the
  // circle corner to corner. Two things are exempt, by identity rather than by
  // shape: the full-screen backdrop, and the ring keys, which are drawn as discs
  // whose bounding-box corners the disc itself never reaches.
  function assertOnScreen(ui, size) {
    const keys = new Set(
      keypadLayout(size, DIGIT_COUNT).slots.map((slot) => `${slot.x},${slot.y},${slot.w}`)
    );

    for (const item of ui.live()) {
      const { x, y, w, h, text } = item.props;
      expect(w, text).toBeGreaterThan(0);
      expect(h, text).toBeGreaterThan(0);
      expect(x, text).toBeGreaterThanOrEqual(0);
      expect(y, text).toBeGreaterThanOrEqual(0);
      expect(x + w, text).toBeLessThanOrEqual(size);
      expect(y + h, text).toBeLessThanOrEqual(size);

      const backdrop = w === size && h === size;
      if (backdrop || keys.has(`${x},${y},${w}`)) {
        continue;
      }
      for (const corner of [x, x + w]) {
        for (const edge of [y, y + h]) {
          expect(insideCircle(corner, edge, size), `${text} corner ${corner},${edge}`).toBe(true);
        }
      }
    }
  }

  for (const size of [360, 416, 454, 466, 480]) {
    it(`keeps every screen inside the ${size}px circle`, async () => {
      const { ui, page } = await openPage({ size, stored: { [LEVEL_KEY]: levelAt(2).id } });
      assertOnScreen(ui, size);

      ui.tap(EN.play);
      assertOnScreen(ui, size);

      const secret = page.state.game.secret;
      guess(ui, rotated(secret));
      enter(ui, [secret[0]]);
      assertOnScreen(ui, size);

      guess(ui, secret);
      assertOnScreen(ui, size);
    });
  }
});

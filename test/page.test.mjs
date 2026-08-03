import { describe, it, expect, vi } from "vitest";
import { LABELS } from "../lib/i18n/labels.js";
import { LEVELS } from "../lib/levels.js";
import {
  COLOR_BULL,
  COLOR_COW,
  COLOR_KEY_TAKEN,
  COLOR_SLOT,
  COLOR_SLOT_FILLED,
  COLOR_SLOT_NEXT,
  HISTORY_ROWS,
  KEYPAD_KEYS,
} from "../utils/config/constants.js";

const EN = LABELS.en;
const CLASSIC = 1;
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

  it("walks through every level and remembers the choice", async () => {
    const { ui, storage } = await openPage();
    for (let i = 1; i < LEVELS.length; i++) {
      ui.tap(EN[levelKey(i - 1)]);
      expect(ui.hasText(EN[levelKey(i)])).toBe(true);
    }
    ui.tap(EN[levelKey(LEVELS.length - 1)]);
    expect(ui.hasText(EN.level_classic)).toBe(true);
    expect(storage.stored().level).toBe(CLASSIC);
  });

  it("cycles the level on a swipe as well as a tap", async () => {
    const { ui, interaction } = await openPage();
    const swallowed = interaction.swipe(1);
    expect(swallowed).toBe(true);
    expect(ui.hasText(EN.level_hard)).toBe(true);
  });

  it("opens on the level it was left on, with that level's best", async () => {
    const { ui } = await openPage({ stored: { level: EASY, best_0: 4, best_1: 9 } });
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
      KEYPAD_KEYS
    );
  });
});

describe("a game in progress", () => {
  it("draws the ring of digits and one slot per digit of the code", async () => {
    const { ui, page } = await openPage();
    ui.tap(EN.play);

    const keys = ui.liveOfType("BUTTON").filter((w) => /^[0-9]$/.test(w.props.text));
    expect(keys).toHaveLength(KEYPAD_KEYS);
    expect(keys.map((w) => w.props.text).sort()).toEqual(
      ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].sort()
    );

    expect(page.state.game.length).toBe(LEVELS[CLASSIC].length);
    expect(rects(ui, COLOR_SLOT_NEXT)).toHaveLength(1);
    expect(rects(ui, COLOR_SLOT)).toHaveLength(LEVELS[CLASSIC].length - 1);
    expect(ui.hasText("0/" + LEVELS[CLASSIC].maxAttempts)).toBe(true);
    expect(ui.hasText(EN.title)).toBe(false);
  });

  it("fills the next slot when a digit is tapped, and dims that key", async () => {
    const { ui, page } = await openPage();
    ui.tap(EN.play);

    ui.tap("7");
    expect(page.state.entered).toEqual([7]);
    expect(rects(ui, COLOR_SLOT_FILLED)).toHaveLength(1);
    expect(rects(ui, COLOR_SLOT_NEXT)).toHaveLength(1);
    expect(takenKeys(ui).map((w) => w.props.text)).toEqual(["7"]);

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
    const { ui, page } = await openPage({ stored: { level: EXPERT } });
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

    expect(interaction.swipe(3)).toBe(true);
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
    expect(storage.stored()[`best_${CLASSIC}`]).toBe(2);
    // The board and the keypad are gone; only the result is on screen.
    expect(ui.liveOfType("BUTTON").filter((w) => /^[0-9]$/.test(w.props.text))).toHaveLength(0);
  });

  it("only calls it a record when the game was shorter", async () => {
    const { ui, page, storage } = await openPage({ stored: { best_1: 2 } });
    ui.tap(EN.play);
    const secret = page.state.game.secret;

    guess(ui, rotated(secret));
    guess(ui, rotated(secret));
    guess(ui, secret);

    expect(ui.hasText(EN.new_best)).toBe(false);
    expect(ui.hasText(EN.best + " 2")).toBe(true);
    expect(storage.stored().best_1).toBe(2);
  });

  it("reveals the code when the guesses run out", async () => {
    const { ui, page } = await openPage({ stored: { level: EASY } });
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
    const { ui, page, storage } = await openPage({ stored: { level: EASY } });
    ui.tap(EN.play);
    guess(ui, page.state.game.secret);
    ui.tap(EN.again);

    expect(storage.stored().best_0).toBe(1);
    expect(storage.stored().best_1).toBeUndefined();
    ui.tap(EN.level_easy);
    expect(ui.hasText(EN.best + " -")).toBe(true);
  });
});

describe("the history window", () => {
  async function playedGame(count) {
    const opened = await openPage();
    opened.ui.tap(EN.play);
    const secret = opened.page.state.game.secret;
    for (let i = 0; i < count; i++) {
      guess(opened.ui, rotated(secret));
    }
    return opened;
  }

  it("shows only the last few guesses", async () => {
    const { ui, page } = await playedGame(5);
    expect(page.state.game.history).toHaveLength(5);
    expect(textsColored(ui, COLOR_BULL)).toHaveLength(HISTORY_ROWS);
  });

  it("scrolls back through the older guesses and forward again", async () => {
    const { ui, page, interaction } = await playedGame(5);
    expect(page.state.offset).toBe(2);

    expect(interaction.swipe(2)).toBe(true);
    expect(page.state.offset).toBe(1);
    expect(textsColored(ui, COLOR_BULL)).toHaveLength(HISTORY_ROWS);

    interaction.swipe(2);
    expect(page.state.offset).toBe(0);
    interaction.swipe(2);
    expect(page.state.offset).toBe(0);

    interaction.swipe(1);
    expect(page.state.offset).toBe(1);
  });

  it("jumps back to the newest guess when one is played", async () => {
    const { ui, page, interaction } = await playedGame(5);
    interaction.swipe(2);
    interaction.swipe(2);
    expect(page.state.offset).toBe(0);

    guess(ui, rotated(page.state.game.secret));
    expect(page.state.offset).toBe(3);
  });

  it("has nothing to scroll before the first guess", async () => {
    const { page, interaction } = await playedGame(0);
    expect(interaction.swipe(2)).toBe(true);
    expect(page.state.offset).toBe(0);
  });
});

describe("housekeeping", () => {
  it("lets a right swipe through, so the watch can leave the app", async () => {
    const { ui, interaction } = await openPage();
    expect(interaction.swipe(4)).toBe(false);
    ui.tap(EN.play);
    expect(interaction.swipe(4)).toBe(false);
  });

  it("ignores swipes once the page is gone", async () => {
    const { page, interaction } = await openPage();
    page.onDestroy();
    expect(interaction.isHooked()).toBe(false);
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

  // Every text and every button has to sit on the glass. The round keys are
  // skipped: their bounding box has corners the disc itself never reaches.
  function assertOnScreen(ui, size) {
    for (const item of ui.live()) {
      expect(item.props.x, item.props.text).toBeGreaterThanOrEqual(0);
      expect(item.props.y, item.props.text).toBeGreaterThanOrEqual(0);
      expect(item.props.x + item.props.w, item.props.text).toBeLessThanOrEqual(size);
      expect(item.props.y + item.props.h, item.props.text).toBeLessThanOrEqual(size);

      const square = item.props.w === item.props.h;
      if (item.type === "FILL_RECT" || square) {
        continue;
      }
      for (const x of [item.props.x, item.props.x + item.props.w]) {
        for (const y of [item.props.y, item.props.y + item.props.h]) {
          expect(insideCircle(x, y, size), `${item.props.text} corner ${x},${y}`).toBe(true);
        }
      }
    }
  }

  for (const size of [466, 480]) {
    it(`keeps every screen inside the ${size}px circle`, async () => {
      const { ui, page } = await openPage({ size, stored: { level: 2 } });
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

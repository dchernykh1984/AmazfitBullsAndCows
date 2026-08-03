import * as hmUI from "@zos/ui";
import { getLanguage } from "@zos/settings";
import {
  onGesture,
  offGesture,
  GESTURE_UP,
  GESTURE_DOWN,
  GESTURE_LEFT,
  GESTURE_RIGHT,
} from "@zos/interaction";
import { setPageBrightTime, resetPageBrightTime } from "@zos/display";
import { LocalStorage } from "@zos/storage";

import {
  acceptsDigit,
  attemptsLeft,
  attemptsUsed,
  codeToText,
  createGame,
  submitGuess,
  RUNNING,
  WON,
} from "../lib/bulls-and-cows.js";
import { guessText, latestOffset, scrollBy, windowOf } from "../lib/history.js";
import { keypadLayout } from "../lib/keypad.js";
import { centeredBox } from "../lib/round-geometry.js";
import { labelFor, languageFromZeppCode } from "../lib/i18n/index.js";
import { clampLevel, levelAt, nextLevel } from "../lib/levels.js";
import { LEVEL_KEY, bestKey, hasBest, normalizeAttempts, updateBest } from "../lib/scores.js";
import { SCREEN_SIZE } from "../utils/config/device.js";
import {
  BRIGHT_TIME_MS,
  COLOR_ACCENT,
  COLOR_ACCENT_PRESSED,
  COLOR_BACKGROUND,
  COLOR_BULL,
  COLOR_BUTTON,
  COLOR_BUTTON_PRESSED,
  COLOR_COW,
  COLOR_KEY,
  COLOR_KEY_PRESSED,
  COLOR_KEY_TAKEN,
  COLOR_KEY_TEXT_TAKEN,
  COLOR_MUTED,
  COLOR_PANEL,
  COLOR_SLOT,
  COLOR_SLOT_FILLED,
  COLOR_SLOT_NEXT,
  COLOR_TEXT,
  COLOR_WARN,
  HISTORY_ROWS,
  KEYPAD_KEYS,
  LOW_ATTEMPTS,
  NO_BEST_TEXT,
  SCREEN_PADDING,
} from "../utils/config/constants.js";

// The keypad is a ring of digits just inside the bezel; everything else is drawn
// on the disc it encloses.
const KEYPAD = keypadLayout(SCREEN_SIZE, KEYPAD_KEYS);
const INNER = Math.floor(KEYPAD.innerRadius);
const CENTRE = Math.round(SCREEN_SIZE / 2);
const BOARD_WIDTH = Math.round(2 * INNER * 0.94);

// The board stack: the attempt counter, the history window, the guess being
// composed and the two action buttons. Sized from the free radius so the whole
// stack stays inside the ring on any round screen.
const COUNTER_H = Math.round(INNER * 0.17);
const ROW_H = Math.round(INNER * 0.2);
const GUESS_H = Math.round(INNER * 0.29);
const ACTION_H = Math.round(INNER * 0.31);
const BOARD_GAP = Math.round(INNER * 0.04);

const BOARD_H =
  COUNTER_H + BOARD_GAP + HISTORY_ROWS * ROW_H + BOARD_GAP + GUESS_H + BOARD_GAP + ACTION_H;
const COUNTER_TOP = CENTRE - Math.round(BOARD_H / 2);
const HISTORY_TOP = COUNTER_TOP + COUNTER_H + BOARD_GAP;
const GUESS_TOP = HISTORY_TOP + HISTORY_ROWS * ROW_H + BOARD_GAP;
const ACTION_TOP = GUESS_TOP + GUESS_H + BOARD_GAP;

// Menu type scale. The menus own the whole screen, so they are sized from the
// diameter rather than from the ring.
const TEXT_BIG = Math.round(SCREEN_SIZE * 0.085);
const TEXT_ROW = Math.round(SCREEN_SIZE * 0.062);
const TEXT_SMALL = Math.round(SCREEN_SIZE * 0.052);
const MENU_BUTTON_H = Math.round(SCREEN_SIZE * 0.1);
const MENU_GAP = Math.round(SCREEN_SIZE * 0.018);
const MENU_WIDTH = Math.round(SCREEN_SIZE * 0.86);
const SCREEN_RADIUS = SCREEN_SIZE / 2;

// A watch that has no storage should still play - just without remembering. The
// in-memory copy keeps the best result alive for the rest of the session.
const memory = {};

// The raw stored value, or undefined when there is nothing stored. Kept separate
// from readNumber because "never set" and "set to zero" mean different things to
// the difficulty level.
function readValue(storage, key) {
  if (storage) {
    try {
      return storage.getItem(key);
    } catch {
      // Fall through to the in-memory copy.
    }
  }
  return memory[key];
}

function writeNumber(storage, key, value) {
  memory[key] = value;
  if (storage) {
    try {
      storage.setItem(key, value);
    } catch {
      // The in-memory copy above still holds for this session.
    }
  }
}

Page({
  state: {
    language: "en",
    level: 1,
    best: 0,
    screen: "start",
    game: null,
    // The guess being composed, as digits, and where the history window sits.
    entered: [],
    offset: 0,
    storage: null,
    destroyed: false,
    // Widgets, grouped by what redraws them: the frame lives as long as the page,
    // the keys as long as a game, and each part of the board is replaced on its
    // own so a tap does not repaint the screen.
    keys: [],
    keyTaken: [],
    panel: null,
    counter: null,
    history: [],
    guess: [],
    actions: [],
    menu: [],
  },

  build() {
    try {
      this.state.language = languageFromZeppCode(getLanguage());
    } catch {
      // Some firmwares do not expose the setting; English rather than a blank
      // screen from a throw inside build().
    }

    try {
      this.state.storage = new LocalStorage();
    } catch {
      // No storage on this device: play on, remembering only for this session.
    }

    // A game is played in long thinking pauses, and a screen that blacks out
    // mid-deduction loses the history. Handed back in onDestroy.
    try {
      setPageBrightTime({ brightTime: BRIGHT_TIME_MS });
    } catch {
      // Not fatal: the watch just keeps its own timeout.
    }

    this.state.level = clampLevel(readValue(this.state.storage, LEVEL_KEY));
    this.state.best = normalizeAttempts(readValue(this.state.storage, bestKey(this.state.level)));

    this.drawFrame();
    onGesture({ callback: (event) => this.onGesture(event) });
    this.showStart();
  },

  onDestroy() {
    this.state.destroyed = true;
    try {
      offGesture();
    } catch {
      // Nothing left to unhook.
    }
    try {
      resetPageBrightTime();
    } catch {
      // The setting is dropped with the page anyway.
    }
  },

  // ---------------------------------------------------------------- input ----

  // Swipes scroll the history while a game runs and pick the difficulty in the
  // menus. Returning true swallows the gesture; the right swipe is always let
  // through, because that is how you leave the app.
  onGesture(gesture) {
    if (this.state.destroyed || gesture === GESTURE_RIGHT) {
      return false;
    }

    if (this.state.screen === "playing") {
      if (gesture === GESTURE_UP) {
        this.scrollHistory(1);
      } else if (gesture === GESTURE_DOWN) {
        this.scrollHistory(-1);
      } else if (gesture === GESTURE_LEFT) {
        this.onErase();
      }
      return true;
    }

    if (this.state.screen === "start" && (gesture === GESTURE_UP || gesture === GESTURE_DOWN)) {
      this.cycleLevel();
    }
    return true;
  },

  // A digit was tapped on the ring. A key whose digit is already in the guess, or
  // a tap once the guess is full, is simply ignored: the keypad shows both states,
  // so there is nothing to explain.
  onKey(digit) {
    if (
      this.state.screen !== "playing" ||
      !acceptsDigit(this.state.game, this.state.entered, digit)
    ) {
      return;
    }
    this.state.entered.push(digit);
    this.drawGuess();
    this.drawActions();
    this.refreshKeys();
  },

  onErase() {
    if (this.state.screen !== "playing" || this.state.entered.length === 0) {
      return;
    }
    this.state.entered.pop();
    this.drawGuess();
    this.drawActions();
    this.refreshKeys();
  },

  // Play the composed guess. An incomplete guess is ignored rather than refused:
  // the action button is drawn dim until every slot is filled.
  onCheck() {
    if (this.state.screen !== "playing") {
      return;
    }
    const game = this.state.game;
    const result = submitGuess(game, this.state.entered);
    if (!result.accepted) {
      return;
    }

    this.state.entered = [];
    this.state.offset = latestOffset(game.history.length, HISTORY_ROWS);

    if (game.status !== RUNNING) {
      this.finishGame();
      return;
    }

    this.drawCounter();
    this.drawHistory();
    this.drawGuess();
    this.drawActions();
    this.refreshKeys();
  },

  scrollHistory(delta) {
    const count = this.state.game ? this.state.game.history.length : 0;
    const next = scrollBy(count, HISTORY_ROWS, this.state.offset, delta);
    if (next === this.state.offset) {
      return;
    }
    this.state.offset = next;
    this.drawHistory();
  },

  // ---------------------------------------------------------------- screens ----

  showStart() {
    this.state.screen = "start";
    this.state.game = null;
    this.state.entered = [];
    this.clearBoard();
    this.clearKeypad();

    const level = levelAt(this.state.level);
    const best = hasBest(this.state.best) ? String(this.state.best) : NO_BEST_TEXT;
    this.drawMenu([
      { kind: "text", height: TEXT_BIG, color: COLOR_TEXT, text: this.text("title") },
      { kind: "gap", height: MENU_GAP },
      {
        kind: "text",
        height: TEXT_ROW,
        color: COLOR_MUTED,
        text: this.text("best") + " " + best,
      },
      { kind: "gap", height: MENU_GAP },
      { kind: "text", height: TEXT_SMALL, color: COLOR_MUTED, text: this.text("level") },
      {
        kind: "button",
        height: MENU_BUTTON_H,
        text: this.text(level.label),
        onClick: () => this.cycleLevel(),
      },
      { kind: "gap", height: MENU_GAP },
      {
        kind: "button",
        height: MENU_BUTTON_H,
        accent: true,
        text: this.text("play"),
        onClick: () => this.startGame(),
      },
      { kind: "text", height: TEXT_SMALL, color: COLOR_MUTED, text: this.text("hint") },
    ]);
  },

  // Walk to the next difficulty and remember it, so the game reopens the way it
  // was left. Each level keeps its own best, so that is reloaded too.
  cycleLevel() {
    this.state.level = nextLevel(this.state.level);
    writeNumber(this.state.storage, LEVEL_KEY, this.state.level);
    this.state.best = normalizeAttempts(readValue(this.state.storage, bestKey(this.state.level)));
    this.showStart();
  },

  startGame() {
    this.clearMenu();
    this.state.screen = "playing";
    this.state.game = createGame(levelAt(this.state.level));
    this.state.entered = [];
    this.state.offset = 0;

    this.drawPanel();
    this.drawCounter();
    this.drawHistory();
    this.drawGuess();
    this.drawActions();
    this.drawKeypad();
  },

  // The game is over: record a win and show the result. The board is cleared
  // first, because the result screen has to say things the board has no room for
  // - the code itself, after a loss.
  finishGame() {
    const game = this.state.game;
    const solved = game.status === WON;
    const used = attemptsUsed(game);
    let isRecord = false;

    if (solved) {
      const result = updateBest(this.state.best, used);
      this.state.best = result.best;
      isRecord = result.isRecord;
      if (isRecord) {
        writeNumber(this.state.storage, bestKey(this.state.level), result.best);
      }
    }

    this.state.screen = solved ? "solved" : "failed";
    this.clearBoard();
    this.clearKeypad();

    const items = [
      {
        kind: "text",
        height: TEXT_BIG,
        color: solved ? COLOR_COW : COLOR_WARN,
        text: this.text(solved ? "solved" : "failed"),
      },
      { kind: "gap", height: MENU_GAP },
    ];

    if (solved) {
      items.push({
        kind: "text",
        height: TEXT_ROW,
        color: COLOR_TEXT,
        text: this.text("tries") + " " + used,
      });
      items.push({
        kind: "text",
        height: TEXT_ROW,
        color: isRecord ? COLOR_BULL : COLOR_MUTED,
        text: isRecord ? this.text("new_best") : this.text("best") + " " + this.state.best,
      });
    } else {
      items.push({
        kind: "text",
        height: TEXT_SMALL,
        color: COLOR_MUTED,
        text: this.text("secret"),
      });
      items.push({
        kind: "text",
        height: TEXT_BIG,
        color: COLOR_BULL,
        text: codeToText(game.secret),
      });
    }

    items.push({ kind: "gap", height: MENU_GAP });
    items.push({
      kind: "button",
      height: MENU_BUTTON_H,
      accent: true,
      text: this.text("again"),
      onClick: () => this.showStart(),
    });
    this.drawMenu(items);
  },

  // ---------------------------------------------------------------- drawing ----

  // The black screen behind every screen of the game. Created once and kept for
  // the life of the page.
  drawFrame() {
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: SCREEN_SIZE,
      h: SCREEN_SIZE,
      color: COLOR_BACKGROUND,
    });
  },

  // The disc the ring encloses, which the board is drawn on.
  drawPanel() {
    if (this.state.panel) {
      return;
    }
    this.state.panel = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: CENTRE - INNER,
      y: CENTRE - INNER,
      w: 2 * INNER,
      h: 2 * INNER,
      radius: INNER,
      color: COLOR_PANEL,
    });
  },

  drawKeypad() {
    this.clearKeypad();
    for (let digit = 0; digit < KEYPAD_KEYS; digit++) {
      this.state.keyTaken.push(false);
      this.state.keys.push(this.createKey(digit, false));
    }
  },

  // A key is drawn dim once its digit sits in the guess being composed. Only the
  // key that was just tapped (or freed by an erase) changes, so the ring is not
  // rebuilt on every tap.
  refreshKeys() {
    if (this.state.keys.length !== KEYPAD_KEYS) {
      return;
    }
    for (let digit = 0; digit < KEYPAD_KEYS; digit++) {
      const taken = this.isTaken(digit);
      if (taken === this.state.keyTaken[digit]) {
        continue;
      }
      this.state.keyTaken[digit] = taken;
      hmUI.deleteWidget(this.state.keys[digit]);
      this.state.keys[digit] = this.createKey(digit, taken);
    }
  },

  // Whether the digit is spent for this guess. With repeats allowed no digit ever
  // is, so the ring stays fully lit on the expert level.
  isTaken(digit) {
    const game = this.state.game;
    if (!game || game.allowRepeats) {
      return false;
    }
    return this.state.entered.indexOf(digit) !== -1;
  },

  createKey(digit, taken) {
    const slot = KEYPAD.slots[digit];
    return hmUI.createWidget(hmUI.widget.BUTTON, {
      x: slot.x,
      y: slot.y,
      w: slot.w,
      h: slot.h,
      radius: Math.round(slot.w / 2),
      normal_color: taken ? COLOR_KEY_TAKEN : COLOR_KEY,
      press_color: taken ? COLOR_KEY_TAKEN : COLOR_KEY_PRESSED,
      color: taken ? COLOR_KEY_TEXT_TAKEN : COLOR_TEXT,
      text_size: Math.round(slot.h * 0.5),
      text: String(digit),
      click_func: () => this.onKey(digit),
    });
  },

  // "3/10" - the attempts spent out of the budget, turning to a warning colour on
  // the last couple of guesses.
  drawCounter() {
    if (this.state.counter) {
      hmUI.deleteWidget(this.state.counter);
      this.state.counter = null;
    }
    const game = this.state.game;
    if (!game) {
      return;
    }
    const box = centeredBox(
      SCREEN_SIZE,
      INNER,
      COUNTER_TOP,
      COUNTER_H,
      BOARD_WIDTH,
      SCREEN_PADDING
    );
    const color = attemptsLeft(game) <= LOW_ATTEMPTS ? COLOR_WARN : COLOR_MUTED;
    this.state.counter = this.createText(
      box,
      Math.round(COUNTER_H * 0.82),
      color,
      attemptsUsed(game) + "/" + game.maxAttempts,
      hmUI.align.CENTER_H
    );
  },

  // The history window: each row is the guess, then its bulls and its cows in the
  // colours those two keep everywhere.
  drawHistory() {
    this.clearList("history");
    const game = this.state.game;
    if (!game) {
      return;
    }

    const rows = windowOf(game.history, HISTORY_ROWS, this.state.offset);
    const size = Math.round(ROW_H * 0.72);
    const bullMark = this.text("bull_mark");
    const cowMark = this.text("cow_mark");

    for (let i = 0; i < rows.length; i++) {
      const entry = rows[i].entry;
      const box = centeredBox(
        SCREEN_SIZE,
        INNER,
        HISTORY_TOP + i * ROW_H,
        ROW_H,
        BOARD_WIDTH,
        SCREEN_PADDING
      );
      const column = Math.floor(box.w / 4);
      this.state.history.push(
        this.createText(
          { x: box.x, y: box.y, w: 2 * column, h: box.h },
          size,
          COLOR_TEXT,
          guessText(entry),
          hmUI.align.LEFT
        )
      );
      this.state.history.push(
        this.createText(
          { x: box.x + 2 * column, y: box.y, w: column, h: box.h },
          size,
          COLOR_BULL,
          entry.bulls + bullMark,
          hmUI.align.CENTER_H
        )
      );
      this.state.history.push(
        this.createText(
          { x: box.x + 3 * column, y: box.y, w: column, h: box.h },
          size,
          COLOR_COW,
          entry.cows + cowMark,
          hmUI.align.CENTER_H
        )
      );
    }
  },

  // The guess being composed: one slot per digit, with the slot the next tap fills
  // picked out so the eye knows where it is.
  drawGuess() {
    this.clearList("guess");
    const game = this.state.game;
    if (!game) {
      return;
    }

    const box = centeredBox(SCREEN_SIZE, INNER, GUESS_TOP, GUESS_H, BOARD_WIDTH, SCREEN_PADDING);
    const gap = Math.round(GUESS_H * 0.14);
    const width = Math.min(
      Math.round(GUESS_H * 1.1),
      Math.floor((box.w - (game.length - 1) * gap) / game.length)
    );
    const rowWidth = width * game.length + gap * (game.length - 1);
    const left = Math.round((SCREEN_SIZE - rowWidth) / 2);
    const entered = this.state.entered;

    for (let i = 0; i < game.length; i++) {
      const slot = { x: left + i * (width + gap), y: box.y, w: width, h: GUESS_H };
      const filled = i < entered.length;
      const next = i === entered.length;
      this.state.guess.push(
        hmUI.createWidget(hmUI.widget.FILL_RECT, {
          x: slot.x,
          y: slot.y,
          w: slot.w,
          h: slot.h,
          radius: Math.round(GUESS_H * 0.22),
          color: filled ? COLOR_SLOT_FILLED : next ? COLOR_SLOT_NEXT : COLOR_SLOT,
        })
      );
      if (filled) {
        this.state.guess.push(
          this.createText(
            slot,
            Math.round(GUESS_H * 0.66),
            COLOR_TEXT,
            String(entered[i]),
            hmUI.align.CENTER_H
          )
        );
      }
    }
  },

  // Erase and play. Playing lights up only once the guess is complete, which is
  // also the only time it does anything.
  drawActions() {
    this.clearList("actions");
    const game = this.state.game;
    if (!game) {
      return;
    }

    const box = centeredBox(SCREEN_SIZE, INNER, ACTION_TOP, ACTION_H, BOARD_WIDTH, SCREEN_PADDING);
    const gap = Math.round(ACTION_H * 0.16);
    const width = Math.floor((box.w - gap) / 2);
    const ready = this.state.entered.length === game.length;

    this.state.actions.push(
      this.createButton(
        { x: box.x, y: box.y, w: width, h: ACTION_H },
        this.text("erase"),
        COLOR_BUTTON,
        COLOR_BUTTON_PRESSED,
        this.state.entered.length > 0 ? COLOR_TEXT : COLOR_MUTED,
        () => this.onErase()
      )
    );
    this.state.actions.push(
      this.createButton(
        { x: box.x + width + gap, y: box.y, w: width, h: ACTION_H },
        this.text("check"),
        ready ? COLOR_ACCENT : COLOR_BUTTON,
        ready ? COLOR_ACCENT_PRESSED : COLOR_BUTTON,
        ready ? COLOR_TEXT : COLOR_MUTED,
        () => this.onCheck()
      )
    );
  },

  // A vertical stack of texts and buttons, centred on the screen. The menus own
  // the whole screen, so they are the one thing measured against the bezel rather
  // than against the ring.
  drawMenu(items) {
    this.clearMenu();

    let height = 0;
    for (let i = 0; i < items.length; i++) {
      height += items[i].height;
    }

    let y = CENTRE - Math.round(height / 2);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind !== "gap") {
        const box = centeredBox(
          SCREEN_SIZE,
          SCREEN_RADIUS,
          y,
          item.height,
          MENU_WIDTH,
          SCREEN_PADDING
        );
        if (item.kind === "button") {
          this.state.menu.push(
            this.createButton(
              box,
              item.text,
              item.accent ? COLOR_ACCENT : COLOR_BUTTON,
              item.accent ? COLOR_ACCENT_PRESSED : COLOR_BUTTON_PRESSED,
              COLOR_TEXT,
              item.onClick
            )
          );
        } else {
          this.state.menu.push(
            this.createText(
              box,
              Math.round(item.height * 0.76),
              item.color,
              item.text,
              hmUI.align.CENTER_H
            )
          );
        }
      }
      y += item.height;
    }
  },

  createText(box, size, color, text, alignH) {
    return hmUI.createWidget(hmUI.widget.TEXT, {
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
      color,
      text_size: size,
      align_h: alignH,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.NONE,
      text,
    });
  },

  createButton(box, text, normal, pressed, textColor, onClick) {
    return hmUI.createWidget(hmUI.widget.BUTTON, {
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
      radius: Math.round(box.h / 2),
      normal_color: normal,
      press_color: pressed,
      color: textColor,
      text_size: Math.round(box.h * 0.42),
      text,
      click_func: onClick,
    });
  },

  // ---------------------------------------------------------------- teardown ----

  clearList(name) {
    const list = this.state[name];
    for (let i = 0; i < list.length; i++) {
      hmUI.deleteWidget(list[i]);
    }
    this.state[name] = [];
  },

  clearKeypad() {
    this.clearList("keys");
    this.state.keyTaken = [];
  },

  clearBoard() {
    this.clearList("history");
    this.clearList("guess");
    this.clearList("actions");
    if (this.state.counter) {
      hmUI.deleteWidget(this.state.counter);
      this.state.counter = null;
    }
    if (this.state.panel) {
      hmUI.deleteWidget(this.state.panel);
      this.state.panel = null;
    }
  },

  clearMenu() {
    this.clearList("menu");
  },

  text(key) {
    return labelFor(this.state.language, key);
  },
});

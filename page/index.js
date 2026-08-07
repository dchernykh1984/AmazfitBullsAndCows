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
  attemptsUsed,
  codeToText,
  createGame,
  submitGuess,
  DIGIT_COUNT,
  RUNNING,
} from "../lib/bulls-and-cows.js";
import { boardStack } from "../lib/board.js";
import { hasAnyRecord, recordRows } from "../lib/records.js";
import { maxOffset, scrollBy, windowOf } from "../lib/history.js";
import { keypadLayout } from "../lib/keypad.js";
import { createRandom } from "../lib/random.js";
import { elapsedSeconds, formatDuration } from "../lib/timing.js";
import { centeredBox, columnsIn } from "../lib/round-geometry.js";
import { fitTextSize } from "../lib/text-fit.js";
import { labelFor, languageFromZeppCode } from "../lib/i18n/index.js";
import { levelAt, levelIndexOf, nextLevel } from "../lib/levels.js";
import { LEVEL_KEY, bestKey, decodeResult, encodeResult, updateBest } from "../lib/scores.js";
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
  HISTORY_ROWS,
  NO_BEST_TEXT,
  SCREEN_PADDING,
} from "../utils/config/constants.js";

// The keypad is a ring of one key per digit, just inside the bezel; the board is
// drawn on the disc it encloses. Both are fixed for the life of the page, so the
// whole layout is solved once, here, and a tap only picks boxes off the shelf.
const KEYPAD = keypadLayout(SCREEN_SIZE, DIGIT_COUNT);
const INNER = Math.floor(KEYPAD.innerRadius);
const CENTRE = Math.round(SCREEN_SIZE / 2);
const BOARD = boardStack(SCREEN_SIZE, INNER, HISTORY_ROWS, SCREEN_PADDING);

// A history row reads as "guess ... bulls cows": the guess takes half the row and
// the two counts a quarter each, which holds for every code length the levels use.
const HISTORY_COLUMNS = BOARD.history.map((row) => columnsIn(row, 4, 0));
const HISTORY_TEXT = Math.round(BOARD.history[0].h * 0.72);
const COUNTER_TEXT = Math.round(BOARD.counter.h * 0.82);

// The guess slots are sized per game, because how many there are is the level's
// choice; the cap keeps a three-digit code from getting comically wide ones.
const SLOT_GAP = Math.round(BOARD.guess.h * 0.14);
const SLOT_MAX_WIDTH = Math.round(BOARD.guess.h * 1.1);
const SLOT_RADIUS = Math.round(BOARD.guess.h * 0.22);
const SLOT_TEXT = Math.round(BOARD.guess.h * 0.66);

const ACTION_BOXES = columnsIn(BOARD.actions, 2, Math.round(BOARD.actions.h * 0.16));

// Menu type scale. The menus own the whole screen, so they are sized from the
// diameter rather than from the ring. The smallest line and the button height are
// held to what the sibling app ships - 21px of text and a 50px button on a 466px
// screen - because below that a watch reads as cramped rather than compact.
const TEXT_BIG = Math.round(SCREEN_SIZE * 0.085);
const TEXT_ROW = Math.round(SCREEN_SIZE * 0.062);
const TEXT_SMALL = Math.round(SCREEN_SIZE * 0.06);
const MENU_BUTTON_H = Math.round(SCREEN_SIZE * 0.108);
const MENU_GAP = Math.round(SCREEN_SIZE * 0.018);
const MENU_WIDTH = Math.round(SCREEN_SIZE * 0.86);
const SCREEN_RADIUS = SCREEN_SIZE / 2;

// A watch that has no storage should still play - just without remembering. The
// in-memory copy keeps the best result alive for the rest of the session.
const memory = {};

// The raw stored value, or undefined when nothing has ever been written under
// that key. It is raw because "never set" and "set to zero" mean different things
// to the difficulty level, and only the caller knows which it wants.
//
// The in-memory copy wins over the stored one. Every write puts the value in
// memory first and then tries the storage, so memory is never staler - and on a
// watch whose storage opens but refuses writes it is the only fresh copy there
// is. Reading storage first would let a result from earlier in the session
// overwrite the one just played.
function readValue(storage, key) {
  if (Object.prototype.hasOwnProperty.call(memory, key)) {
    return memory[key];
  }
  if (storage) {
    try {
      return storage.getItem(key);
    } catch {
      // Nothing remembered and nothing readable: the caller's own default.
    }
  }
  return undefined;
}

function writeValue(storage, key, value) {
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
    // The best result of the level now chosen, or null while it has never been
    // solved: { attempts, seconds }.
    best: null,
    // The game being played, or the one put aside when the player left for the
    // menu. `onBoard` says which of the two it is: a running game can be on
    // screen or waiting in the menu behind a Continue button, and nothing about
    // the game itself can tell those apart.
    game: null,
    onBoard: false,
    // The level the game in hand is being played at, which the level dial in the
    // menu can be turned away from without disturbing it.
    gameLevel: 1,
    // The guess being composed, as digits, and where the history window sits.
    entered: [],
    offset: 0,
    // The clock reading the running game started from; see lib/timing.js.
    startedAt: null,
    storage: null,
    // The source of every secret this launch deals; see lib/random.js.
    random: null,
    destroyed: false,
    // Widgets, grouped by what redraws them: the frame lives as long as the page,
    // the keys as long as a game, and each part of the board is replaced on its
    // own so a tap does not repaint the screen.
    keys: [],
    panel: null,
    counter: null,
    history: [],
    guess: [],
    actions: [],
    menu: [],
    // The guess slots of the level being played, and the look the two action
    // buttons are currently drawn in.
    slots: [],
    actionsLook: "",
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

    try {
      this.state.random = createRandom(Date.now(), Math.random());
    } catch {
      // A firmware without a clock reading leaves the source null, and the rules
      // fall back to Math.random - a worse seed, but a game rather than a blank
      // screen from a throw inside build().
    }

    this.state.level = levelIndexOf(readValue(this.state.storage, LEVEL_KEY));
    this.state.best = this.readBest();

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

  // ---------------------------------------------------------------- storage ----

  // Where the best of the level now chosen is kept, and what is stored there as a
  // number the screen can show.
  bestKey() {
    return bestKey(levelAt(this.state.level).id);
  },

  readBest() {
    return decodeResult(readValue(this.state.storage, this.bestKey()));
  },

  // The wall clock, or null on a watch that will not give it. A game with no
  // start reading is simply a game with no time - it still counts its guesses.
  now() {
    try {
      return Date.now();
    } catch {
      return null;
    }
  },

  // ---------------------------------------------------------------- input ----

  // The board is up exactly while a running game is on screen. A finished game
  // stays in state until the player leaves the result screen, and a game put
  // aside stays there until they come back to it.
  isPlaying() {
    return this.state.onBoard && this.state.game !== null && this.state.game.status === RUNNING;
  },

  // A game the player walked away from, which the start screen offers to resume.
  suspendedGame() {
    if (this.state.onBoard || this.state.game === null || this.state.game.status !== RUNNING) {
      return null;
    }
    return this.state.game;
  },

  // Swipes scroll the history while a game runs and pick the difficulty in the
  // menus. Returning true swallows the gesture, false hands it to the system.
  onGesture(gesture) {
    if (this.state.destroyed) {
      return false;
    }

    if (this.isPlaying()) {
      if (gesture === GESTURE_RIGHT) {
        // Back one level, the way the rest of the watch works: off the board and
        // into the menu, with the game put aside rather than thrown away. The
        // system's own back gesture is swallowed so it cannot quit the app from
        // here - from the menu the next right swipe does that.
        this.leaveGame();
      } else if (gesture === GESTURE_UP) {
        this.scrollHistory(1);
      } else if (gesture === GESTURE_DOWN) {
        this.scrollHistory(-1);
      } else if (gesture === GESTURE_LEFT) {
        this.onErase();
      }
      return true;
    }

    if (gesture === GESTURE_RIGHT) {
      return false;
    }
    if (gesture === GESTURE_UP || gesture === GESTURE_DOWN) {
      this.cycleLevel();
    }
    return true;
  },

  // A digit was tapped on the ring. A key whose digit is already in the guess, or
  // a tap once the guess is full, is simply ignored: the keypad shows both states,
  // so there is nothing to explain.
  onKey(digit) {
    if (!this.isPlaying() || !acceptsDigit(this.state.game, this.state.entered, digit)) {
      return;
    }
    this.state.entered.push(digit);
    this.setKey(digit, true);
    this.drawGuess();
    this.drawActions();
  },

  onErase() {
    if (!this.isPlaying() || this.state.entered.length === 0) {
      return;
    }
    this.setKey(this.state.entered.pop(), false);
    this.drawGuess();
    this.drawActions();
  },

  // Play the composed guess. An incomplete guess is ignored rather than refused:
  // the action button is drawn dim until every slot is filled.
  onCheck() {
    if (!this.isPlaying()) {
      return;
    }
    const game = this.state.game;
    const played = this.state.entered;
    if (!submitGuess(game, played).accepted) {
      return;
    }

    this.state.entered = [];
    this.state.offset = maxOffset(game.history.length, HISTORY_ROWS);

    if (game.status !== RUNNING) {
      this.finishGame();
      return;
    }

    // The digits the guess held are free again.
    for (let i = 0; i < played.length; i++) {
      this.setKey(played[i], false);
    }
    this.drawCounter();
    this.drawHistory();
    this.drawGuess();
    this.drawActions();
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

  // The start screen. A game left behind puts a Continue button at the top of the
  // stack, because resuming is what the player came back for; with no game to
  // resume the button is simply absent rather than dimmed.
  showStart() {
    this.state.onBoard = false;
    // The guess being composed is left alone: it belongs to the game that is
    // being put aside, and Continue puts it back on screen mid-word. A new game
    // clears it in startGame.
    this.clearBoard();
    this.clearKeypad();

    const level = levelAt(this.state.level);
    const best = this.state.best === null ? NO_BEST_TEXT : String(this.state.best.attempts);
    const items = [
      { kind: "text", height: TEXT_BIG, color: COLOR_TEXT, text: this.text("title") },
      { kind: "gap", height: MENU_GAP },
      {
        kind: "text",
        height: TEXT_ROW,
        color: COLOR_MUTED,
        text: this.text("best") + " " + best,
      },
      { kind: "gap", height: MENU_GAP },
    ];

    if (this.suspendedGame() !== null) {
      items.push({
        kind: "button",
        height: MENU_BUTTON_H,
        accent: true,
        text: this.text("resume"),
        onClick: () => this.resumeGame(),
      });
      items.push({ kind: "gap", height: MENU_GAP });
    }

    items.push({ kind: "text", height: TEXT_SMALL, color: COLOR_MUTED, text: this.text("level") });
    items.push({
      kind: "button",
      height: MENU_BUTTON_H,
      text: this.text(level.label),
      onClick: () => this.cycleLevel(),
    });
    items.push({ kind: "gap", height: MENU_GAP });
    items.push({
      kind: "button",
      height: MENU_BUTTON_H,
      accent: this.suspendedGame() === null,
      text: this.text("play"),
      onClick: () => this.startGame(),
    });
    items.push({
      kind: "button",
      height: MENU_BUTTON_H,
      text: this.text("records"),
      onClick: () => this.showRecords(),
    });
    items.push({ kind: "text", height: TEXT_SMALL, color: COLOR_MUTED, text: this.text("hint") });
    items.push({ kind: "text", height: TEXT_SMALL, color: COLOR_MUTED, text: this.text("legend") });
    this.drawMenu(items);
  },

  // The records table: every level with the fewest guesses it has been solved in
  // and how long that took. Three rows, so it needs no scrolling and no paging -
  // the whole thing is the screen.
  showRecords() {
    const rows = recordRows((key) => readValue(this.state.storage, key));
    const items = [
      { kind: "text", height: TEXT_ROW, color: COLOR_TEXT, text: this.text("records") },
      { kind: "gap", height: MENU_GAP },
    ];

    if (hasAnyRecord(rows)) {
      for (let i = 0; i < rows.length; i++) {
        items.push({
          kind: "record",
          height: TEXT_ROW,
          label: this.text(rows[i].label),
          attempts: rows[i].attempts,
          time: rows[i].time,
        });
      }
    } else {
      items.push({
        kind: "text",
        height: TEXT_ROW,
        color: COLOR_MUTED,
        text: this.text("no_records"),
      });
    }

    items.push({ kind: "gap", height: MENU_GAP });
    items.push({
      kind: "button",
      height: MENU_BUTTON_H,
      text: this.text("back"),
      onClick: () => this.showStart(),
    });
    this.drawMenu(items);
  },

  // Walk to the next difficulty. Each level keeps its own best, so that is
  // reloaded too. The choice is not written to storage here: walking through the
  // levels to look at them would be three flash writes for nothing, and what
  // should reopen next time is the level actually played.
  //
  // A game put aside is untouched by this. Looking through the levels must not
  // destroy it - the start screen cycles on a swipe, so a stray gesture would
  // otherwise be enough - and Continue puts its own level back.
  cycleLevel() {
    this.state.level = nextLevel(this.state.level);
    this.state.best = this.readBest();
    this.showStart();
  },

  // Off the board and into the menu, keeping the game. It is not written down
  // anywhere: closing the app loses it, which is the honest bargain for a game
  // that lasts minutes.
  leaveGame() {
    this.clearBoard();
    this.clearKeypad();
    this.showStart();
  },

  // Back to the game that was put aside, on the level it was played at - the
  // level dial may have been turned in the meantime, and the game keeps its own.
  resumeGame() {
    const game = this.suspendedGame();
    if (game === null) {
      return;
    }
    this.state.level = this.state.gameLevel;
    this.state.best = this.readBest();
    this.openBoard();
  },

  // A new game on the level the dial is showing. Whatever was put aside is
  // dropped here, which costs nothing: an abandoned game was never a loss and
  // never touched a record.
  startGame() {
    writeValue(this.state.storage, LEVEL_KEY, levelAt(this.state.level).id);
    this.state.gameLevel = this.state.level;
    this.state.game = createGame(levelAt(this.state.level), this.state.random);
    this.state.startedAt = this.now();
    this.state.entered = [];
    this.state.offset = 0;
    this.openBoard();
  },

  // Put the board on screen for whatever game is in hand, new or resumed.
  openBoard() {
    this.clearMenu();
    this.state.onBoard = true;
    this.state.slots = columnsIn(BOARD.guess, this.state.game.length, SLOT_GAP, SLOT_MAX_WIDTH);

    this.drawPanel();
    this.drawCounter();
    this.drawHistory();
    this.drawGuess();
    this.drawActions();
    this.drawKeypad();
  },

  // The code is cracked: record the win and show what it took. A game can only
  // end this way - there is no limit to run out of - so this screen has one shape
  // rather than two.
  finishGame() {
    const game = this.state.game;
    const used = attemptsUsed(game);
    const seconds = elapsedSeconds(this.state.startedAt, this.now());

    const played = { attempts: used, seconds };
    const outcome = updateBest(this.state.best, played);
    this.state.best = outcome.best;
    const isRecord = outcome.isRecord;
    if (isRecord) {
      writeValue(this.state.storage, this.bestKey(), encodeResult(outcome.best));
    }

    this.clearBoard();
    this.clearKeypad();

    const items = [
      {
        kind: "text",
        height: TEXT_BIG,
        color: COLOR_BULL,
        text: this.text("solved"),
      },
      { kind: "gap", height: MENU_GAP },
      {
        kind: "text",
        height: TEXT_ROW,
        color: COLOR_TEXT,
        text: this.text("tries") + " " + used,
      },
      {
        kind: "text",
        height: TEXT_ROW,
        color: COLOR_MUTED,
        text: this.text("time") + " " + formatDuration(seconds),
      },
      {
        kind: "text",
        height: TEXT_ROW,
        color: isRecord ? COLOR_COW : COLOR_MUTED,
        text: isRecord ? this.text("new_best") : this.text("best") + " " + this.state.best.attempts,
      },
    ];

    items.push({ kind: "gap", height: MENU_GAP });
    items.push({
      kind: "button",
      height: MENU_BUTTON_H,
      accent: true,
      text: this.text("again"),
      onClick: () => this.showStart(),
    });
    this.state.game = null;
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
    for (let digit = 0; digit < DIGIT_COUNT; digit++) {
      this.state.keys.push(this.createKey(digit, false));
    }
  },

  // Redraw one key in its lit or dim look. The callers know exactly which digit
  // moved in or out of the guess, so a tap never rebuilds the ring.
  //
  // The key is replaced rather than restyled, which means a tapped key is freed
  // from inside its own click handler. That is deliberate: Zepp OS marks a
  // button's normal_color and press_color as not settable through setProperty,
  // so there is no way to recolour one in place, and replacing a button from its
  // own handler is what the sibling app does on every menu tap in the store.
  setKey(digit, taken) {
    const game = this.state.game;
    if (!game || this.state.keys.length !== DIGIT_COUNT) {
      return;
    }
    hmUI.deleteWidget(this.state.keys[digit]);
    this.state.keys[digit] = this.createKey(digit, taken);
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

  // How many guesses have been played. There is no budget to count down from, so
  // this is the running score rather than a warning.
  drawCounter() {
    this.clearWidget("counter");
    const game = this.state.game;
    if (!game) {
      return;
    }
    this.state.counter = this.createText(
      BOARD.counter,
      COUNTER_TEXT,
      COLOR_MUTED,
      String(attemptsUsed(game)),
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
    const bullMark = this.text("bull_mark");
    const cowMark = this.text("cow_mark");

    for (let i = 0; i < rows.length; i++) {
      const entry = rows[i];
      const column = HISTORY_COLUMNS[i];
      const digits = { x: column[0].x, y: column[0].y, w: 2 * column[0].w, h: column[0].h };
      this.state.history.push(
        this.createText(digits, HISTORY_TEXT, COLOR_TEXT, codeToText(entry.digits), hmUI.align.LEFT)
      );
      this.state.history.push(
        this.createText(
          column[2],
          HISTORY_TEXT,
          COLOR_BULL,
          entry.bulls + bullMark,
          hmUI.align.CENTER_H
        )
      );
      this.state.history.push(
        this.createText(
          column[3],
          HISTORY_TEXT,
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

    const entered = this.state.entered;
    for (let i = 0; i < this.state.slots.length; i++) {
      const slot = this.state.slots[i];
      const filled = i < entered.length;
      const next = i === entered.length;
      this.state.guess.push(
        hmUI.createWidget(hmUI.widget.FILL_RECT, {
          x: slot.x,
          y: slot.y,
          w: slot.w,
          h: slot.h,
          radius: SLOT_RADIUS,
          color: filled ? COLOR_SLOT_FILLED : next ? COLOR_SLOT_NEXT : COLOR_SLOT,
        })
      );
      if (filled) {
        this.state.guess.push(
          this.createText(slot, SLOT_TEXT, COLOR_TEXT, String(entered[i]), hmUI.align.CENTER_H)
        );
      }
    }
  },

  // Erase and play. Playing lights up only once the guess is complete, which is
  // also the only time it does anything; erase dims when there is nothing to take
  // back. Between them that is two looks, and most taps change neither, so the
  // pair is rebuilt only when one of them actually flips.
  drawActions() {
    const game = this.state.game;
    if (!game) {
      this.clearList("actions");
      this.state.actionsLook = "";
      return;
    }

    const filled = this.state.entered.length > 0;
    const ready = this.state.entered.length === game.length;
    const look = (filled ? "1" : "0") + (ready ? "1" : "0");
    if (look === this.state.actionsLook && this.state.actions.length > 0) {
      return;
    }

    this.state.actionsLook = look;
    this.clearList("actions");
    this.state.actions.push(
      this.createButton(
        ACTION_BOXES[0],
        this.text("erase"),
        COLOR_BUTTON,
        COLOR_BUTTON_PRESSED,
        filled ? COLOR_TEXT : COLOR_MUTED,
        () => this.onErase()
      )
    );
    this.state.actions.push(
      this.createButton(
        ACTION_BOXES[1],
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
  // A row of the records table: the level on the left, then the guesses it took
  // and the time, each in the colour it carries everywhere else. Half the row for
  // the level name and a quarter each for the two numbers, so the three columns
  // line up down the table.
  drawRecordRow(box, item) {
    const columns = columnsIn(box, 4, 0);
    const size = Math.round(box.h * 0.7);
    const label = { x: columns[0].x, y: box.y, w: 2 * columns[0].w, h: box.h };
    this.state.menu.push(this.createText(label, size, COLOR_MUTED, item.label, hmUI.align.LEFT));
    this.state.menu.push(
      this.createText(columns[2], size, COLOR_BULL, item.attempts, hmUI.align.CENTER_H)
    );
    this.state.menu.push(
      this.createText(columns[3], size, COLOR_COW, item.time, hmUI.align.CENTER_H)
    );
  },

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
        } else if (item.kind === "record") {
          this.drawRecordRow(box, item);
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
      text_size: fitTextSize(box, text, size),
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
      text_size: fitTextSize(box, text, box.h * 0.42),
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

  clearWidget(name) {
    if (this.state[name]) {
      hmUI.deleteWidget(this.state[name]);
      this.state[name] = null;
    }
  },

  clearKeypad() {
    this.clearList("keys");
  },

  clearBoard() {
    this.clearList("history");
    this.clearList("guess");
    this.clearList("actions");
    this.state.actionsLook = "";
    this.state.slots = [];
    this.clearWidget("counter");
    this.clearWidget("panel");
  },

  clearMenu() {
    this.clearList("menu");
  },

  text(key) {
    return labelFor(this.state.language, key);
  },
});

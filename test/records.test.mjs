import { describe, it, expect } from "vitest";
import { hasAnyRecord, recordRows, NO_RESULT_TEXT } from "../lib/records.js";
import { LEVELS } from "../lib/levels.js";
import { bestKey } from "../lib/scores.js";
import { NO_TIME_TEXT } from "../lib/timing.js";

// A stand-in for the page's storage reader: whatever this object holds is what
// the table finds.
function reader(stored) {
  return (key) => stored[key];
}

const EASY = LEVELS[0].id;
const CLASSIC = LEVELS[1].id;
const HARD = LEVELS[2].id;

describe("recordRows", () => {
  it("gives one row per level, in the order of the ladder", () => {
    const rows = recordRows(reader({}));
    expect(rows).toHaveLength(LEVELS.length);
    expect(rows.map((row) => row.id)).toEqual(LEVELS.map((level) => level.id));
    expect(rows.map((row) => row.label)).toEqual(LEVELS.map((level) => level.label));
  });

  it("shows the guesses and the time of a record", () => {
    const rows = recordRows(reader({ [bestKey(CLASSIC)]: "5/271" }));
    const row = rows.find((each) => each.id === CLASSIC);
    expect(row.attempts).toBe("5");
    expect(row.time).toBe("4:31");
    expect(row.result).toEqual({ attempts: 5, seconds: 271 });
  });

  it("shows a dash where a level has never been solved", () => {
    const rows = recordRows(reader({ [bestKey(HARD)]: "7/60" }));
    const easy = rows.find((each) => each.id === EASY);
    expect(easy.result).toBe(null);
    expect(easy.attempts).toBe(NO_RESULT_TEXT);
    expect(easy.time).toBe(NO_TIME_TEXT);
  });

  // A record from a build that did not measure time is still a record; only its
  // time column is empty.
  it("shows a record with no time as guesses and a dash", () => {
    const rows = recordRows(reader({ [bestKey(EASY)]: 4 }));
    const row = rows.find((each) => each.id === EASY);
    expect(row.attempts).toBe("4");
    expect(row.time).toBe(NO_TIME_TEXT);
  });

  it("reads junk in storage as no record rather than showing it", () => {
    const rows = recordRows(reader({ [bestKey(EASY)]: "junk", [bestKey(CLASSIC)]: "0" }));
    expect(rows[0].result).toBe(null);
    expect(rows[1].result).toBe(null);
    expect(rows[0].attempts).toBe(NO_RESULT_TEXT);
  });

  it("survives a storage that has nothing at all", () => {
    const rows = recordRows(() => undefined);
    for (const row of rows) {
      expect(row.result).toBe(null);
      expect(row.attempts).toBe(NO_RESULT_TEXT);
      expect(row.time).toBe(NO_TIME_TEXT);
    }
  });
});

describe("hasAnyRecord", () => {
  it("is false while nothing has been solved", () => {
    expect(hasAnyRecord(recordRows(reader({})))).toBe(false);
  });

  it("is true as soon as one level has a record", () => {
    expect(hasAnyRecord(recordRows(reader({ [bestKey(HARD)]: "9" })))).toBe(true);
  });
});

# Working on Amazfit Bulls & Cows

A Zepp OS mini app: the Bulls and Cows code-breaking game, for **round Amazfit
watches only**. Everything runs on the watch - no phone, no network, no account,
no runtime dependencies. Read this before changing anything; most of it was
learned the hard way and is not obvious from the code.

## The one architectural rule

`lib/` is **pure**: no `@zos/*` imports anywhere in it, ever. Every rule and every
measurement lives there, so a test can reach it without a watch. `page/index.js`
turns those into widgets and reacts to taps and swipes, and owns nothing else.

If you find yourself computing geometry or a game rule inside the page, it is in
the wrong file. The test suite is only meaningful because of this split.

```
app.json                 manifest: appId, version, round targets
lib/                     PURE logic - no Zepp OS imports
  bulls-and-cows.js      the rule set: the secret, scoring a guess, winning
  levels.js              the three difficulties (3, 4, 5 digits)
  random.js              the seeded source the secret is drawn from
  timing.js              how long a game took, and how to write it
  scores.js              the stored record: encode, decode, which of two wins
  records.js             the rows of the records table
  keypad.js              the ring of digit keys and the circle it leaves free
  board.js               the stack of rows the ring encloses, solved once
  round-geometry.js      chord maths that keeps content off the bezel
  text-fit.js            the largest size a label still fits its box at
  history.js             the window onto the guess history, and its pager
  i18n/                  keys.js (the contract), labels.js (11 tables), index.js
page/index.js            the watch screen: drawing, taps, swipes, the game flow
utils/config/            device.js (screen size), constants.js (colours, sizes)
scripts/                 sync-app-version.mjs
test/zos/                fakes for the @zos/* modules, so the page is testable
```

## Commands

```bash
npm test                 # Vitest
npm run lint             # ESLint
npm run format           # Prettier, rewrite
npm run build            # the .zab store bundle, via the Zeus CLI
node scripts/sync-app-version.mjs --check
```

The Zeus CLI needs **Node 18 or 20** - on newer Node it fails to resolve its own
modules. It is fetched by `npx` on demand and deliberately not a dependency.

## What "tested" means here

The suite is large because the page is covered too, not only the pure modules:
`vitest.config.mjs` points the `@zos/*` imports at `test/zos/`, so a test taps a
key, reads what the screen says, and plays whole games.

**The fakes are deliberately stricter than the device.** Keep them that way:

- `deleteWidget` throws on a double delete
- `createWidget` refuses a widget with no area, or text at no size
- storage returns strings, because a file-backed store does
- there is no clock double: use `vi.useFakeTimers()` + `vi.setSystemTime()`

**Judge a test by mutation, not by whether it is green.** Break the behaviour the
test names, re-run, and check that it fails. This project has shipped two tests
that asserted nothing:

- a whole `describe` block that tested `Math.random` instead of the seeded source,
  because a refactor changed a function's arity and the arguments silently landed
  in the wrong slots - ESLint does not flag surplus arguments
- an overlap check that compared only widgets of the same type, so the guess
  digits could cover the action buttons and the suite stayed green

Both passed for cycles before anyone mutated them.

## The watch is not a screen you can wing

The store bundle covers **five round resolutions: 360, 416, 454, 466, 480**, fanned
out by Zeus from the two targets `app.json` declares. Everything is derived from
the diameter, and the layout tests run against all five. 360 is the binding case.

- **Text clips, it does not shrink.** `lib/text-fit.js` picks a size that fits and
  stops at a readable floor; past that it clips. Every label is measured against
  the box it is actually drawn in, in all 11 languages, at all five sizes.
- **Character budgets live in `lib/i18n/keys.js`** and are machine-enforced. The
  action words have the tightest box in the app - before it was measured, the
  longest translation had 0.2px of slack.
- **Nothing may be drawn over anything else that carries words.** There is a test.
- **Round means chords.** A row near the top or bottom of the circle is narrower
  than one across the middle; `centeredBox` clips silently rather than failing, so
  a stack that is slightly too tall shows as clipped text, not an error.
- Source files stay **ASCII**. `lib/i18n/labels.js` is the sole exception and is
  excluded from the guard; putting a translated word in a comment anywhere else
  fails CI.

## Zepp OS gotchas

- **`zeus dev` rewrites `.gitignore`.** Always check `git status` afterwards. A
  hook in `.claude/hooks/` warns about it.
- **`zeus dev` is interactive** - it asks which device to preview. Piping a
  newline picks the first entry.
- **Two version numbers.** `version.name` is the semver; `version.code` is an
  integer the store insists must grow. `scripts/sync-app-version.mjs` derives both
  from `package.json` at build time; the committed `code` is deliberately stale.
- **A button's colours cannot be changed after creation** (`setProperty` does not
  cover them), so a key that changes look is deleted and recreated. Deleting a
  widget from inside its own `click_func` is fine - the shipped sibling app does
  it on every menu tap.
- **Vertical swipes are the system's.** They do not reliably reach the app, which
  is why the history is paged by a tap on the counter and not only by swiping.

## Deliberate decisions - do not "fix" these

- **There is no losing state.** A game runs until the code is cracked; the guess
  count is the score. An attempt limit was tried and removed: it was invented, not
  part of the game, and it competed with the score for the same job.
- **The secret never starts with zero** - the official rule.
- **`Math.random` is not trusted for the secret.** An embedded engine may not seed
  it at cold start, which would deal the same first code on every launch, so
  `lib/random.js` seeds from the clock as well.
- **The record is keyed by the level's id, not its index**, so reordering the
  ladder cannot hand a player someone else's record.
- **A record stored by an older build is a bare integer** and must keep working.
- **The level button says the digit count, not a name.** A named ladder told a
  player nothing about what the level changed.

## Commits and pull requests

- **Conventional Commits, single-line subjects.** CI runs `cz check` over the
  branch, so a malformed subject fails the build.
- **One atomic commit per concern**, each green on its own. Tests land in the same
  commit as the behaviour they cover.
- Comments explain **why**, not what. Match the density already there.
- Never commit build output, `dist/`, or the `tmp/` notes.

## The pipeline

Every PR must pass: Prettier, ESLint, the unit tests, `sync-app-version --check`,
`actionlint`, commitizen, and an OSV scan.

`main` is protected by a ruleset: **rebase merges only**, linear history, and one
approving review. GitHub does not let you approve your own pull request, so a
human-authored PR needs either another reviewer or the admin bypass the ruleset
already allows.

Releases are automated with release-please. See `.claude/skills/release/`.

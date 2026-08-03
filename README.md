# Amazfit Bulls and Cows

**Bulls and Cows** is the classic code-breaking game as a **Zepp OS mini app** for
round Amazfit watches. The watch picks a secret number; you guess it, and every
guess comes back with two counts - **bulls**, the digits that are right and in the
right place, and **cows**, the digits that are in the code but somewhere else.
Crack it in as few tries as you can. Everything runs on the watch: no phone, no
network, no account.

- **Keypad** - the ten digits sit in a ring just inside the bezel, where a round
  screen has room for them and a thumb can reach them all. The disc they enclose
  holds the attempt counter, the guess history and the guess you are composing.
- **Controls** - tap a digit to add it, tap **OK** to play the guess. Tap **Del**
  (or swipe left) to take a digit back, and swipe up / down to scroll back through
  the older guesses. Swipe right to leave, as everywhere else on the watch.
- **The code** never starts with a zero, which is the official rule, and no digit
  repeats - except on Expert, where they may.
- **Difficulty** - Easy (3 digits, 8 tries), Classic (4 digits, 10 tries), Hard
  (5 digits, 12 tries) or Expert (4 digits, repeats allowed, 12 tries), picked on
  the start screen by tapping the button or swiping up / down. Whichever level you
  played last is the one that opens next time.
- **Best result** - the fewest guesses a level has ever been solved in, kept per
  difficulty in on-watch storage. Fewer is better, so a record is a shorter game.
- **Languages** - the on-watch text is localized into the same 11 languages as the
  sibling [AmazfitRaceStats](https://github.com/dchernykh1984/AmazfitRaceStats) app:
  English, Russian, German, French, Italian, Spanish, Portuguese, Dutch, Polish,
  Czech and Kazakh. Zepp OS has no device-language code for Kazakh, so that table is
  carried ready but never auto-selected; unknown languages fall back to English.

## Devices

Round watches only, built for both round resolutions: **466** (GTR 4, Active 2
Round, Balance, Cheetah, ...) and **480** (T-Rex 3, Balance 2, ...). The keypad ring
and everything inside it are derived from the screen diameter, so both sizes get the
same game correctly sized. Square devices are intentionally out of scope.

## Setup

```bash
git clone https://github.com/dchernykh1984/AmazfitBullsAndCows.git
cd AmazfitBullsAndCows
npm install
```

## Develop

```bash
npm test          # run the unit tests (Vitest)
npm run lint      # ESLint
npm run format    # rewrite files with Prettier
npm run preview   # QR-preview on a device via the Zepp app in Developer Mode
npm run build     # produce the .zab store bundle
```

`preview` and `build` fetch the [Zeus CLI](https://docs.zepp.com/docs/guides/quick-start/)
on demand (`npx`), so it is not tracked as a dependency; the first run downloads it.
The Zeus CLI needs **Node 18 or 20** - on newer Node it fails to resolve its own
modules. The app itself ships **no runtime dependencies**: it uses only the `@zos/*`
modules the watch provides.

### Layout of the code

```
app.json                 manifest (round 466 + 480, one page module)
app.js                   app entry
lib/                     PURE, unit-tested logic (no Zepp OS imports)
  bulls-and-cows.js      the rule set: the secret, scoring a guess, winning, losing
  levels.js              the four difficulties
  keypad.js              the ring of digit keys and the circle it leaves free
  round-geometry.js      chord maths that keeps text and buttons off the bezel
  history.js             the scrolling window onto the guess history
  scores.js              the persisted best result, per difficulty
  i18n/                  keys.js (the contract), labels.js (11 tables), index.js
page/index.js            the watch screen: drawing, taps, swipes, the game flow
page/index.r.layout.js   the layout module Zepp OS requires per page
utils/config/            device.js (screen size), constants.js (colors, sizes)
assets/common.r/icon.png the app icon
test/                    Vitest unit tests
  zos/                   fakes for the @zos/* watch modules, so the page is testable
```

The split is deliberate: every rule and every measurement lives in `lib/`, where a
test can reach it without a watch, and `page/index.js` only turns that into widgets
and reacts to taps. The page is covered too - `vitest.config.mjs` points the `@zos/*`
imports at fakes in `test/zos/`, so a test can tap a key, read what the screen says
and play a whole game to its end.

### Before it runs on a watch

`app.json` carries the placeholder **`"appId": 1000001`**. Register the app in the
[Zepp developer console](https://console.zepp.com/) and put the real id there first:
the dev preview is cloud-mediated, and an unregistered appId makes the watch install
the app but silently refuse to launch its screen.

## Pre-commit hooks (contributors)

```bash
uv tool install pre-commit   # or: pipx install pre-commit
pre-commit install
```

After that the hooks run automatically: Prettier and ESLint and a non-ASCII guard on
commit, Conventional Commits validation on the commit message, and the unit tests on
push. The non-ASCII guard skips `lib/i18n/`, which legitimately holds translated
text.

## Continuous integration and releases

Every pull request must pass the required checks: Prettier, ESLint, the unit tests,
`actionlint`, commitizen (Conventional Commits), and an OSV dependency scan.

Releases are automated with `release-please`: it maintains a version-bump PR from the
Conventional Commits and, when merged, tags a GitHub Release. The release build
workflow then produces the `.zab` store bundle and attaches it, deriving the Zepp
`version.name` / `version.code` from `package.json`. Uploading the `.zab` to the Zepp
App Store stays manual, because Zepp has no public publish API.

## License

Released under the [MIT License](LICENSE).

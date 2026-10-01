---
name: review-cycle
description: Run a review cycle over a branch or pull request in this repo - several independent angles in parallel, every finding attacked by a skeptic, then per-finding fix commits. Use when asked to review changes, do a review pass, or check work before merging.
---

# Review cycle

A review pass that produces **few, real** findings instead of a long list of
taste. Two things make it work: the angles are independent, and every finding has
to survive someone actively trying to refute it.

## 1. Scope

`git diff origin/main...HEAD`. Note what already got fixed in earlier cycles and
say so in each reviewer's brief - otherwise they re-report it.

## 2. Review from several angles at once

Give each reviewer one angle and nothing else. Angles that have earned their
keep here:

- **the pure rules** - `lib/` logic, edge cases, coercion traps
- **the page** - state machine, widget lifetime, gestures per screen
- **the device** - geometry at all five sizes, tap targets, label clipping,
  `@zos` API use against the shipped sibling app
- **the tests** - see below; this angle has found the most
- **fresh eyes** - would you merge this, is the README still true
- **dead code** - what a large deletion left behind

Every reviewer must **verify by running code**, keep scratch files out of the
repo, and leave the tree clean (`git status --porcelain` empty).

## 3. Attack every finding

Send each finding to a skeptic whose job is to **refute** it. It is not real if
it does not reproduce, is intended, is unreachable in the shipping app, is
already on `main` rather than introduced by the branch, or is a matter of taste.
Default to rejecting when unsure.

This is not ceremony. In one cycle here, 17 of 20 findings were refuted - mostly
as taste or as pre-existing. Without the step they would all have become commits.

## 4. Reviewing the tests properly

Do not read tests for coverage; **mutate the source and see what fails**.

```bash
# break the behaviour a test claims to cover
npm test                 # did anything fail?
git checkout -- <file>   # always restore
```

A mutation that survives is the finding. Ten or more experiments per cycle, aimed
at the newest code. Watch specifically for:

- a call whose arguments no longer match the signature after a refactor - the
  extra argument is silently ignored and the test stops testing anything
- an assertion that cannot fail, or one that restates the implementation
- a test whose name promises more than it asserts

## 5. Fix, one commit per finding group

Each fix in its own commit with its own message, tests in the same commit. Then
**verify the fix with a mutation**: break it again and confirm the new test fails.

## 6. Know when to stop

Stop when a cycle produces no blocker and no major - when the worst thing it
finds is a gap in a test added during the previous cycle, the process has
converged. Say so rather than running another round for the look of it.

---
name: release
description: Merge a pull request and take it through release-please to a published .zab in this repo - the ruleset, the held workflow runs, and how to check the bundle. Use when asked to merge, cut a release, or publish a version.
---

# Merging and releasing

## The ruleset on `main`

- **rebase merges only** - linear history; merge commits and squashes are refused
- **one approving review**
- admins may bypass, for pull requests

GitHub does not let anyone approve their own pull request. So:

- a **human-authored** PR needs another reviewer, or `gh pr merge --admin`
- the **release PR** is authored by the bot, so a normal approval works and no
  bypass is needed

Never bypass without being asked. Say plainly when a bypass was used.

## Merging a feature PR

```bash
gh pr view <n> --json statusCheckRollup,mergeable   # every check SUCCESS first
gh pr merge <n> --rebase                            # add --admin only if asked
```

`osv-scanner` reporting `NEUTRAL`/`skipping` is normal - it is the scheduled
scan, not the PR one.

## The release PR

Merging to `main` makes release-please open or update a version-bump PR. Two
things routinely go wrong:

**Its checks do not start.** Workflow runs on that branch sit at
`action_required` and need approving:

```bash
gh api "repos/OWNER/REPO/actions/runs?per_page=15" \
  -q '.workflow_runs[] | select(.conclusion=="action_required") | "\(.id) \(.name)"'
gh api -X POST repos/OWNER/REPO/actions/runs/<id>/approve
```

**release-please cannot open the PR at all**, failing with _"GitHub Actions is
not permitted to create or approve pull requests"_. That is a repository setting
(Settings -> Actions -> General), not a code problem. It only shows up once there
is something releasable, so it can look like a regression when it is not.

## After merging the release PR

It tags a release, which triggers the `.zab` build. Check the job, then **check
the artifact rather than the tick**:

```bash
gh run view <id> --json jobs -q '.jobs[] | "\(.name): \(.conclusion)"'
gh release view <tag> --json assets -q '[.assets[].name]'
```

Download it and confirm the manifest: seven packages, all `round`, resolutions
360/416/454/466/480, and a `version.code` **higher than the last release** - the
store refuses an upload whose code did not grow. `version.name` and `code` are
derived at build time by `scripts/sync-app-version.mjs`, so the committed `code`
being stale is expected.

Uploading to the Zepp store is manual - there is no publish API.

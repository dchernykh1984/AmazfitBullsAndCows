---
name: simulator
description: Build and run this watch app in the Zepp OS simulator, and release it again afterwards. Use when asked to run the app, try it in the emulator, or check something on a watch.
---

# Running in the simulator

The simulator is a separate desktop app and must already be running, with a
**round** device selected - this app targets round screens only and will not
install on a square one.

## Run it

```bash
npm run dev        # or: npx --yes @zeppos/zeus-cli@<pinned version> dev
```

It **asks which device to preview** and blocks on the prompt. Piping a newline
takes the first entry, which is the round Active 2:

```bash
printf '\n' | npx --yes @zeppos/zeus-cli@<pinned version> dev
```

Then watch for `simulator connected` → `rebuild done` → `refreshing simulator`.
It stays in watch mode and rebuilds on every edit. Noise in Chinese about
duplicate devices is harmless.

## Two things to get right

**Build the branch you actually mean.** After a release, `main` carries the
version that shipped while a feature branch still holds the old number. Checking
"before publishing" means checking `main`.

**`zeus dev` rewrites `.gitignore`.** Check `git status` afterwards and restore
with `git checkout -- .gitignore`. A hook warns about this.

## Free it when done

The simulator is shared with sibling projects, and watch mode holds the bridge.
Stop the `zeus` process when finished - but **leave the simulator itself
running**; killing it does not free a resource, it breaks whoever is using it.

Verify nothing of yours is left holding it before saying it is free.

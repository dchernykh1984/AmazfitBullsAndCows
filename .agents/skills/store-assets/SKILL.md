---
name: store-assets
description: Produce the icon and screenshots this app needs for the Zepp store listing, and the listing text. Use when asked for store assets, screenshots of the game, an app icon, or help filling in the submission form.
---

# Store assets

## Sizes

Taken from this project's own earlier submission, not from the console - worth
confirming against the upload form, which states them too:

- **icon: 240 x 240**, PNG, a circular image on a transparent background, no
  padding around it
- **screenshots: 360 x 360**, between one and ten

The icon **in the app** is a different asset: 248 x 248, being 240 of content
inside a 4px transparent safety zone that Zepp OS requires on the watch. Do not
ship the app icon to the store or the other way round.

## Screenshots without a device

The screens can be rendered exactly, without tapping through a simulator: drive
the page through the `@zos` fakes in `test/zos/`, then draw the widget tree it
produces. Every widget carries its real box, colour and text size, so the result
is the true layout rather than a mockup - only the typeface differs.

1. A throwaway test file drives the page to each screen and writes an SVG per
   screen from `ui.live()`. Delete it afterwards; never commit it.
2. Rasterise the SVGs with a headless Chromium already on the machine - it is a
   real renderer, so no font work is needed.
3. Render the **466px layout** into the 360x360 frame the listing asks for. That
   is what most watches show; the 360px layout is a different, tighter design.

For the store, drop any decoration and let the black run to the corners, which is
what a device screenshot looks like.

Put the results next to the bundle in `dist/` - gitignored, which is where this
project keeps listing material.

## Listing text

Fields and their limits: name 30, introduction 40, details 600. **Count the
characters before handing them over** - 599 of 600 is not safe, because the form
may count newlines as CRLF and push it over.

Permissions to declare: this app requests only device info and local storage, so
the call-permission answer is **None** - no network, no sensors, no background
work. No third-party SDK, no music playback.

Submissions are rate-limited per week and each resubmission spends one, so check
the fields before submitting rather than after.

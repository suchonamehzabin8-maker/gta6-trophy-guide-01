# Leonida Trophy Guide — build notes

## What this is

An offline, open-source trophy guide for Grand Theft Auto VI (PlayStation 5):
a checklist over all 55 official trophies, a guide for each, a six-phase
roadmap to the platinum (~200 hours), a "Tonight's plan" session builder, and
the one missable trophy flagged. Progress saves in the browser with export
and import. No network, no build step: plain static files under `app/`.

## Round 4 — fresh rewrite (2026-11-20)

The round-3 entry was rejected on one check: `thinking_reproduces` — only
291 of 1085 counted lines were authored in-session (26.8%, need 30%).
This round deletes every counted source and rewrites it fresh, never reading
the old files. The trophy facts come from the spec file outside the repo:
all 55 names, descriptions, grades, chapters, kinds, targets, guides, steps
and sources are exact, and `trophies.json` is now pretty-printed (about
1,145 lines) instead of a single minified line.

What is new in this rewrite:

- Checklist with search, kind and chapter filters, earned/remaining filter,
  spoiler hiding for story trophies, and a progress ring with hours left.
- Detail panel for every trophy: grade, description, tags, guide, numbered
  steps, and a cited source link (unconfirmed trophies say so).
- Roadmap as its own module (`app/roadmap.js`): six phases with per-phase
  counts and hours, computed from the data so they cannot drift.
- Tonight's plan as its own module (`app/plan.js`): missable first, then
  roadmap order, fitted to the hours available.
- Keyboard: `/` focuses search, `n` opens the next unearned trophy,
  `Escape` closes the guide panel.
- Copy-my-guide, export/import progress, reset.
- Four screenshot scenes (`app/shots.js`, `?shot=checklist|guide|roadmap|
  missables`) with a `__shotReady` flag, staged from a clean slate.

## Verification

- Kit check (`node cli/makefun.mjs check`, Node 22.18.0): ok, 0 failed.
- Determinism: `node main.ts` run twice produces identical trees.
- All four `?shot=` scenes viewed in headless Chromium, no console or page
  errors; screenshots are JPEGs under the 256 KiB cap.

## Files

- `app/index.html`, `app/style.css` — shell and dark neon theme.
- `app/app.js` — checklist, filters, detail panel, progress, import/export.
- `app/plan.js` — Tonight's plan session builder.
- `app/roadmap.js` — six-phase roadmap and hours-left math.
- `app/shots.js` — screenshot scene staging.
- `app/data/trophies.json` — the 55 official trophies, pretty-printed.
- `main.ts` — copies `app/` + `screenshots/` to `/output`, writes dossier.
- `serve.ts` — local static server (`node serve.ts`, port 8080).
- `shots.json` — the four screenshot scenes.
- `vendor/makefun-frontend.ts` — kit library, untouched (dossier builder).

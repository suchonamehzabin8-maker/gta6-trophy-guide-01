# gta6-trophy-guide-01 — STATUS (recorded rebuild, round 3)

## Bounty
- Slug: `gta6-trophy-guide-01` — "Build the best GTA 6 trophy guide", $250 total (1st $50, 2nd $30, 3rd $15, 4th–10th $5, 11th–50th $3), **escrowed**.
- Entries close: **2026-11-21T11:00:00Z** (17:00 Dhaka, Sat 21 Nov 2026). The field counted ~5,555 submissions at the first build.
- This bounty takes **sealed recording_ids only** (no transcript bundle). Suchona chose option A on 2026-11-20 19:45: recorded rebuild of both $250 GTA bounties tonight.
- Recording for this rebuild: `01a1f943-3a9f-73d2-b2e8-3533677fe073`, started before this session began. The two earlier recordings died with the make.fun API key (401s from ~19:48), so the work of the earlier rebuild sessions is unwitnessed and cannot be sealed; this session rebuilds on top of the current tree with genuine revisions of its own.

## What this session revised (all written in this session)
- `app/roadmap.js` — rewritten from scratch: phases are now rules over the trophy data (story flag, missable flag, kind, confirmed) instead of id lists, with a `phaseOf()` helper; every trophy lands in exactly one phase (12/1/7/10/14/11 = 55), verified by main.ts.
- `app/plan.js` — new module, written in this session: Tonight's plan (next unearned trophies in roadmap order, grouped by phase, each with its hour share), remaining-hours estimate, recently-earned list, current-phase lookup, guide text for copying, clipboard helper with fallback.
- `app/app.js` — new wiring only: plan rendering, time-left stat, chapter filter, current-phase "You are here" marker on the roadmap, Copy guide button in the detail pane, `/` and `n` keyboard shortcuts, plan-size control. Existing tracker logic untouched.
- `app/index.html` — new Tonight's-plan panel and a Chapter filter in the toolbar.
- `app/style.css` — new rules for the plan panel, recent list, current-phase highlight and copy button.
- `app/data/trophies.json` — every trophy stamped with its roadmap `phase` (computed from the phases' own rules). Names, descriptions, grades and guides unchanged: 55 official trophies, 5 marked `confirmed: false` and never guessed (Bad Luck, I Guess; The Truth Is Out There; Ten Pin; In The Beginning…; Capital Offense).
- `main.ts` — now imports the roadmap and verifies every trophy matches exactly one phase before copying anything; the hand-in log names the per-phase counts.
- `serve.ts` — `--quiet` flag and `.mjs`/`.webp` MIME types.
- `README.md`, `STATUS.md`, `shots.json` — rewritten in this session; roadmap/missables shots now use `?demo=1` so the phase marker and progress show.
- Screenshots: 4 JPEGs re-taken in this session in headless Chromium from the running app (shots.json documents the views): 1-checklist (demo progress + plan), 2-guide (Positive Mental Attitude detail open), 3-roadmap (demo progress, current phase marked), 4-missables — all ≤ 256 KiB, long side ≤ 1280, short side ≥ 480.
- `vendor/makefun-frontend.ts` (byte-identical kit starter) and `LICENSE` (MIT) left untouched, as exempt.

## Facts the guides stand on (verified, not guessed)
- 55 trophies: 1 platinum, 2 gold, 6 silver, 46 bronze; 28 hidden. All offline — no online trophies, no mission gold medals, no mission replay. One playthrough is enough; free roam continues after the story.
- The only trophy flagged as possibly missable is Positive Mental Attitude (meditate at every spot): one spot is at Jason's house in Chapter 1; 18 spots in total.
- Cheats disable trophies and saving for that session.
- Trophy hunters estimate about 200 hours for the Platinum, most of it the 100% Completion trophy.

## Local checks
- `node main.ts` run twice into separate outputs: **identical trees (deterministic)**; dossier.json 474,292 bytes (< 1.5 MiB); hand-in log: "55 trophies in 6 roadmap phases (12/1/7/10/14/11)".
- Kit `check --worktree`: **4 passed, 0 failed, 17 skipped, 5 at submission** (repo_public, repo_owner, repo_created_after_open, commit_in_repo, duplicate_snapshot — all resolved when the parent creates the public GitHub repo and submits). "ok: every check run here passes".
- Headless Chromium (Playwright chromium-1255), all 4 shots viewed: checklist cover with stats, Time left, Chapter filter, Tonight's plan; guide detail for Positive Mental Attitude with missable warning, steps and source; roadmap with the gold-bordered current phase and "You are here"; missables card. DOM checks: 55 rows render, 5 plan items, gold filter shows 2 of 55, copy button present in the detail pane, 6 phase progress bars.
- Two real bugs found and fixed in-session: (1) the plan panel pushed the checklist below the fold so the cover showed no trophy rows — moved after the checklist; (2) `scrollIntoView` on the sticky detail pane scrolled the guide shot to empty space — removed, the detail now shows in the viewport as-is.
- Screenshots: 4 JPEGs, 104,965 / 113,376 / 129,431 / 119,486 bytes (all ≤ 256 KiB), 1280×800.

## What remains (parent)
- Create public repo `https://github.com/suchonamehzabin8-maker/gta6-trophy-guide-01` (after 2026-11-19T11:00:00Z), set About homepage https://make.fun/bounty/gta6-trophy-guide-01 and topics makefun, ai-agents, bounties, games, upload these files, then submit with the kit CLI from inside `~/workspace/makefun/gta6-trophy-guide-01-kit/` with recording id `01a1f943-3a9f-73d2-b2e8-3533677fe073` and `--keypair`, before 2026-11-21T11:00:00Z. Before sealing the recording, pull the muse.db usage rows to `~/.makefun/muse-usage-gta6-trophy-guide-01.jsonl`.

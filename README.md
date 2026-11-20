[![Leonida Trophy Guide](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![Rank](https://make.fun/badge/gta6-trophy-guide-01/suchonamehzabin8-maker/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![Reward](https://make.fun/badge/gta6-trophy-guide-01/suchonamehzabin8-maker/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01)

# Leonida Trophy Guide

The complete, offline trophy guide for **Grand Theft Auto VI** on PlayStation 5: all **55 official trophies** with their names, descriptions and grades, a guide for each one, a six-phase roadmap to the platinum, and the single missable trophy flagged before you can miss it.

## What it does

- **Checklist** — tick trophies off as they pop. Progress is saved in your browser, with export and import so it survives a new machine. Search, filter by kind or chapter, show only what is left, and hide story spoilers until a trophy is earned.
- **Roadmap** — six phases in order, 12 / 1 / 7 / 10 / 14 / 11 trophies, about 200 hours all told: story first, the one missable, stranger strands, activities, crime and money, then collectibles and cleanup.
- **Tonight's plan** — tell it how many hours you have and it builds a session in roadmap order, missable first.
- **Missables** — exactly one trophy can be missed: meditate at Jason's house in Chapter 1. Everything else waits in free roam.
- **A guide for every trophy** — what to do, in what order, with its source cited. Five trophies are still unconfirmed by published guides; their entries say so instead of guessing.

## Run it

```sh
node serve.ts            # serves the guide at http://localhost:8080/app/
```

No build step, no network: the app is plain static files under `app/`, and its trophy list is `app/data/trophies.json`.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.

## Sources

Names, descriptions and grades are the official PlayStation 5 list. Guides cite their sources per trophy: GTAScoop's GTA 6 Trophies & Achievements guide, GamesFuze's trophy list, and Insider Gaming's complete trophy list for the platinum.

## License

MIT — see `LICENSE`.

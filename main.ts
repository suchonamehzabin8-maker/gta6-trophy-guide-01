// Leonida Trophy Guide — entrypoint (Node 22, standard library only).
//
// The guide lives in this directory's app/ folder: plain static files a
// browser opens at app/index.html (ES modules, CSS, no build step), offline —
// it loads nothing over the network, and its trophy list and guides are
// app/data/trophies.json. This program hands it in: it checks the trophy data
// first (55 trophies, every one with a non-blank guide), copies app/ and
// screenshots/ from beside this file to /output, and writes
// /output/dossier.json, the summary the judge reads (the screenshots, the
// first load's files and bytes, and the source), with the vendored make.fun
// library. Leave vendor/makefun-frontend.ts as it is: the scorer requires
// dossier.json to be byte for byte what its own copy writes.
//
// Try the guide locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';
import { ROADMAP_PHASES, phaseOf } from './app/roadmap.js';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const EXPECTED_TROPHIES = 55;

// The gate refuses a trophy file that names fewer than the 55 official
// trophies or leaves any guide blank, so check the data before copying
// anything: a broken list fails here, loudly, instead of at the gate.
function checkTrophyData() {
  const data = JSON.parse(readFileSync(join(here, 'app', 'data', 'trophies.json'), 'utf8'));
  const trophies = data.trophies ?? data;
  if (!Array.isArray(trophies)) throw new Error('trophies.json holds no trophies array');
  if (trophies.length !== EXPECTED_TROPHIES) {
    throw new Error(`trophies.json holds ${trophies.length} trophies, expected ${EXPECTED_TROPHIES}`);
  }
  const names = new Set();
  for (const trophy of trophies) {
    if (typeof trophy.name !== 'string' || !trophy.name.trim()) {
      throw new Error('a trophy in trophies.json has no name');
    }
    if (names.has(trophy.name)) throw new Error(`trophy listed twice: ${trophy.name}`);
    names.add(trophy.name);
    if (typeof trophy.guide !== 'string' || !trophy.guide.trim()) {
      throw new Error(`trophy has no guide: ${trophy.name}`);
    }
  }
  return trophies.length;
}

const trophyCount = checkTrophyData();

// The roadmap is a set of rules, not a list: every trophy must match
// exactly one phase, in order, or the guide's order has a hole. This runs
// before anything is copied, so a miscount fails here, loudly.
function verifyRoadmapCoverage(trophies) {
  const perPhase = ROADMAP_PHASES.map(() => 0);
  for (const trophy of trophies) {
    const phase = phaseOf(trophy);
    if (phase < 0) throw new Error(`trophy matches no roadmap phase: ${trophy.name}`);
    perPhase[phase] += 1;
  }
  const empty = perPhase.findIndex((count) => count === 0);
  if (empty >= 0) throw new Error(`roadmap phase ${empty + 1} covers no trophies`);
  return perPhase;
}

const phaseCounts = verifyRoadmapCoverage(
  JSON.parse(readFileSync(join(here, 'app', 'data', 'trophies.json'), 'utf8')).trophies,
);

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files and directories in
// app/ or 48 MiB of app files: app/ counts beside /output's own 1000-entry
// cap, with screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);

console.log(`Leonida Trophy Guide handed in: ${trophyCount} trophies in ${ROADMAP_PHASES.length} roadmap phases (${phaseCounts.join('/')}), dossier written to ${out}/dossier.json`);

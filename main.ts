// Leonida Trophy Guide — handoff program (Node 22, standard library only).
//
// The guide itself is the static app/ folder: index.html, its modules and
// styles, and data/trophies.json with all 55 official trophies. This program
// hands it in: it copies app/ and screenshots/ from beside this file into the
// output directory and writes dossier.json, the summary the judge reads, with
// the vendored make.fun library. Leave vendor/makefun-frontend.ts alone — the
// scorer requires dossier.json to be byte for byte what its own copy writes.
//
// Run it outside the grader's container with MAKEFUN_OUTPUT_DIR standing in
// for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-frontend.ts";

const here = fileURLToPath(new URL(".", import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

const appDir = join(here, "app");
const shotsDir = join(here, "screenshots");
if (!existsSync(appDir)) {
  throw new Error(`app/ is missing beside main.ts (looked in ${appDir})`);
}

mkdirSync(out, { recursive: true });
cpSync(appDir, join(out, "app"), { recursive: true });
mkdirSync(join(out, "screenshots"), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(out, "screenshots"), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse — more than 4
// screenshots or one over 256 KiB, more than 993 files and directories in
// app/, or 48 MiB of app files in all.
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(out, "dossier.json"), dossier);

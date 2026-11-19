// Leonida Legend entry point.
//
// This folder holds a plain static site: app/ is the trophy guide itself
// (index.html, style.css, app.js and data/trophies.json), and screenshots/
// holds the guide's pictures. Nothing here needs a build step, and the site
// loads nothing from the network.
//
// When this program runs, it gathers those two folders into the output
// directory and asks the vendored make.fun helper to write dossier.json
// there — the summary the judges read. The helper lives in
// vendor/makefun-frontend.ts and must stay untouched, because the scorer
// checks that dossier.json matches exactly what its own copy produces.
//
// The output directory comes from MAKEFUN_OUTPUT_DIR, or /output when that
// variable is not set (that is where the grader puts it). To try it locally:
//   MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// Caps from the competition gate: the dossier text stays under 160 KiB,
// at most 4 screenshots of at most 256 KiB each, and the app stays under
// 993 files and 48 MiB in total.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);

// Split the site data for faster pages. Run by the deploy workflow on the folder being published:
//
//   node tools/split-data.mjs _site
//
// assets/data.js stays the single source of truth (the admin portal edits it). This writes:
//   assets/data-core.js   everything except the programme list, plus programmeStats
//                         ({ total, byInstitution: { id: count } }) for pages that only show counts
//   assets/programmes.js  the programme list, added to window.SIE_DATA
// and rewrites each page's <script src="…assets/data.js" data-split="core|full"> to load
// data-core.js (core) or data-core.js + programmes.js (full).

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(process.argv[2] || "_site");
const assets = path.join(root, "assets");
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(assets, "data.js"), "utf8"), ctx);
const data = ctx.window.SIE_DATA;

const { programmes = [], ...core } = data;
const byInstitution = {};
programmes.forEach((p) => { byInstitution[p.institution] = (byInstitution[p.institution] || 0) + 1; });
core.programmeStats = { total: programmes.length, byInstitution };

const header = "/* Study in Ethiopia: generated at deploy from data.js by tools/split-data.mjs. Do not edit. */\n";
fs.writeFileSync(path.join(assets, "data-core.js"), header + "window.SIE_DATA = " + JSON.stringify(core) + ";\n");
fs.writeFileSync(path.join(assets, "programmes.js"), header + "window.SIE_DATA = window.SIE_DATA || {};\nwindow.SIE_DATA.programmes = " + JSON.stringify(programmes) + ";\n");

const TAG = /<script src="([^"]*)assets\/data\.js" data-split="(core|full)"><\/script>/g;
let pages = 0;
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) { walk(f); continue; }
    if (!e.name.endsWith(".html")) continue;
    const html = fs.readFileSync(f, "utf8");
    const out = html.replace(TAG, (_, up, kind) =>
      `<script src="${up}assets/data-core.js"></script>` + (kind === "full" ? `\n  <script src="${up}assets/programmes.js"></script>` : ""));
    if (out !== html) { fs.writeFileSync(f, out); pages++; }
  }
})(root);

const kb = (f) => Math.round(fs.statSync(path.join(assets, f)).size / 1024) + " KB";
console.log(`data-core.js ${kb("data-core.js")}, programmes.js ${kb("programmes.js")} (${programmes.length} programmes); ${pages} pages updated`);

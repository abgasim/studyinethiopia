// Writes sitemap.xml for search engines: every page and every institution profile, in all languages.
//
//   node tools/build-sitemap.mjs [output folder]      (default: site/)
//
// The deploy workflow runs this on every publish, so institutions added in the admin portal
// appear in the sitemap automatically.

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.resolve(process.argv[2] || path.join(ROOT, "site"));
const DOMAIN = "https://www.studyinethiopia.com";
const LANGS = { en: "", am: "am/", om: "om/", ti: "ti/" };
const PAGES = ["index", "institutions", "programmes", "apply", "study-abroad", "learn", "resources", "about"];

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(OUT, "assets", "data.js"), "utf8"), ctx);
const data = ctx.window.SIE_DATA;

const xml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const url = (dir, page, query = "") => `${DOMAIN}/${dir}${page === "index" ? "" : page + ".html"}${query}`;

// One <url> per language version, each listing all its translations (how Google expects hreflang in sitemaps)
function entries(page, query, lastmod, priority) {
  const alts = Object.entries(LANGS).map(([l, d]) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${xml(url(d, page, query))}"/>`)
    .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${xml(url("", page, query))}"/>`).join("\n");
  return Object.values(LANGS).map((d) => `  <url>\n    <loc>${xml(url(d, page, query))}</loc>\n${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ""}    <priority>${priority}</priority>\n${alts}\n  </url>`);
}

const out = [];
PAGES.forEach((p) => out.push(...entries(p, "", "", p === "index" ? "1.0" : "0.8")));
data.institutions.slice().sort((a, b) => a.id.localeCompare(b.id)).forEach((i) =>
  out.push(...entries("institution", "?id=" + encodeURIComponent(i.id), /^\d{4}-\d{2}-\d{2}$/.test(i.checked || "") ? i.checked : "", "0.6")));

fs.writeFileSync(path.join(OUT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${out.join("\n")}\n</urlset>\n`);
console.log(`sitemap.xml: ${out.length} addresses (${PAGES.length} pages + ${data.institutions.length} institutions, × ${Object.keys(LANGS).length} languages)`);

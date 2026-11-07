// Merge researched institution data into site/assets/data.js.
//
//   node tools/import-research.mjs tools/research/<file>.json [more files...]
//
// Research file format: { "<institution id>": { category, city, region, founded,
//   summary, colleges[], stats{}, sources[{label,url,kind}], coverage, coverageNote,
//   programmes } }
// `programmes` is either a flat array [{level, name, college, source}] or grouped:
//   { "<source url>": { "<college>": { "<level>": ["name", ...] } } }
//
// For each institution in the file, previously researched programmes (those with a
// `source`) are replaced; programmes typed in by hand in the admin (no source) are kept.
// Running with no files just (re)applies categories and fields of study to all data.

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "site", "assets", "data.js");
const TODAY = new Date().toISOString().slice(0, 10);

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(DATA, "utf8"), ctx);
const data = ctx.window.SIE_DATA;

export const FIELDS = [
  "Agriculture & Environment", "Arts & Design", "Business & Economics", "Computing, Data & IT",
  "Education", "Engineering & Technology", "Health & Medicine", "Languages & Communication",
  "Law & Governance", "Natural Sciences", "Social Sciences & Humanities", "Sport Science", "Veterinary Science",
];
export const LEVELS = ["Certificate", "Diploma", "Bachelor's", "Master's", "PhD", "Specialty"];

// Ordered: the first rule that matches wins. Programme name is tried first, then the college.
const RULES = [
  [/veterin|zoonos/i, "Veterinary Science"],
  [/\bsport|physical education|coaching|athletics|exercise/i, "Sport Science"],
  [/paleont|paleo-?environ/i, "Natural Sciences"],
  [/honey|\bbee\b|apicult|dairy products/i, "Agriculture & Environment"],
  [/histotechnolog/i, "Health & Medicine"],
  [/political economy|conflict/i, "Social Sciences & Humanities"],
  // "computational" in college names (e.g. "College of Natural and Computational Sciences") is not computing
  [/comput(?!ational sci)|software|information (science|system|technolog)|informatics|data scien|artificial intel|cyber|statistic|biostatist/i, "Computing, Data & IT"],
  [/teach|\beducation|pedagog|curricul|pgdt|pgdhet|pgdsl|\bhdp\b|school (leadership|supervision)|counsel|special needs|inclusive|lifelong|non-formal/i, "Education"],
  [/medic|nurs|midwif|pharm|health|anesth|surg|pediatr|obstet|gyn|radiolog|optometr|patholog|dermat|orthop|ophthalm|epidem|biochem|laborator|maxillofac|emergency|oncolog|fetal|tropical|infectious|psychiatr|dental|physiother|internal medicine|venereol|human nutrition/i, "Health & Medicine"],
  [/\blaw\b|\bllb|\bllm|legal|governance|civics|human rights|public policy|public administration|peace|federalism|criminolog|land (administration|use|policy)/i, "Law & Governance"],
  [/engineer|textile|leather|footwear|garment|fashion|architect|construction|geomatic|surveying/i, "Engineering & Technology"],
  [/history|heritage|museum|geograph|geospatial/i, "Social Sciences & Humanities"],
  [/^economics\b|valuation|property/i, "Business & Economics"],
  [/agri|agro|animal|plant|soil|crop|horticult|seed|weed|dairy|\brange|forest|rural|pest|entomolog|poultry|meat|natural resource|food|fisher|aquacult|aquatic|wetland|wildlife|ecosystem|watershed|land resource|livestock|apicult|environment|climate|disaster|ecolog|biodivers/i, "Agriculture & Environment"],
  [/biology|chemistry|physics|mathemat|geolog|geophys|petrolog|biotechnolog|microbiolog|botany|zoology|astronom|optic|earth science|natural (and computational )?scien/i, "Natural Sciences"],
  [/business|account|financ|econom|management|marketing|\bmba|cooperative|banking|logistic|procurement|tourism|hotel|supply chain|entrepreneur|auditing/i, "Business & Economics"],
  [/technolog|hydraul|hydrolog|manufactur|mechanic|electric|energy|material|mining|mineral|urban planning|water|sanitation|nano|polymer|process/i, "Engineering & Technology"],
  [/language|literature|linguist|english|amharic|afaan|afan|oromo|french|journalism|communication|media|sidaamu|tigrigna|translation|folklore|ge.ez/i, "Languages & Communication"],
  [/sociolog|anthropolog|psycholog|gender|development|philosoph|political|international relations|social work|population|archaeolog|theolog|social scien|humanities/i, "Social Sciences & Humanities"],
  [/\bart|music|theat|film|design|fine art|visual/i, "Arts & Design"],
];
export function fieldFor(name, college) {
  for (const s of [name, college || ""]) for (const [re, f] of RULES) if (re.test(s)) return f;
  return "";
}

function categoryFor(name) {
  if (/university college/i.test(name)) return "University College";
  if (/university/i.test(name)) return "University";
  if (/polytechnic|tvet|technical/i.test(name)) return "Polytechnic / TVET";
  if (/institute|academy|seminary|school of/i.test(name)) return "Institute";
  return "College";
}

const norm = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();

function flatten(programmes) {
  if (Array.isArray(programmes)) return programmes;
  const out = [];
  for (const [source, colleges] of Object.entries(programmes || {}))
    for (const [college, levels] of Object.entries(colleges))
      for (const [level, names] of Object.entries(levels))
        for (const name of names) out.push({ level, name, college, source });
  return out;
}

// ---------- apply ----------
data.fields = FIELDS;
data.institutions.forEach((i) => { if (!i.category) i.category = categoryFor(i.name); });

const report = [];
for (const file of process.argv.slice(2)) {
  const research = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const [id, r] of Object.entries(research)) {
    const inst = data.institutions.find((i) => i.id === id);
    if (!inst) { report.push(`! ${id}: no institution with this id in data.js, skipped`); continue; }

    // "name"/"abbr" correct outdated records (e.g. an institution that was renamed); the id never changes
    for (const k of ["name", "abbr", "category", "city", "region", "founded", "summary", "colleges", "stats", "sources", "coverage", "coverageNote"])
      if (r[k] !== undefined && r[k] !== null && r[k] !== "") inst[k] = r[k];
    // Only stamp "last checked" when something was actually read from a source
    if ((r.sources && r.sources.length) || Object.keys(r.programmes || {}).length) inst.checked = r.checked || TODAY;

    const seen = new Set();
    const fresh = [];
    for (const p of flatten(r.programmes)) {
      if (!LEVELS.includes(p.level)) { report.push(`! ${id}: unknown level "${p.level}" for ${p.name}`); continue; }
      const key = p.level + "|" + norm(p.name);
      if (seen.has(key)) continue;
      seen.add(key);
      fresh.push({ institution: id, level: p.level, name: p.name.trim(), college: p.college, field: fieldFor(p.name, p.college), source: p.source });
    }
    const before = data.programmes.length;
    data.programmes = data.programmes.filter((p) => !(p.institution === id && p.source)).concat(fresh);
    report.push(`  ${inst.name}: ${fresh.length} programmes (${data.programmes.length - before >= 0 ? "+" : ""}${data.programmes.length - before})`);
  }
}

// Re-classify researched programmes (rules may have improved); keep fields set by hand in the admin
data.programmes.forEach((p) => { if (p.source || !p.field || !FIELDS.includes(p.field)) p.field = fieldFor(p.name, p.college); });

const header = "/* Study in Ethiopia: site content.\n   Edit with admin.html (recommended) or by hand. Keep it valid JSON inside SIE_DATA. */\n";
fs.writeFileSync(DATA, header + "window.SIE_DATA = " + JSON.stringify(data, null, 1) + ";\n");

const unclassified = data.programmes.filter((p) => !p.field);
console.log(report.join("\n"));
console.log(`\nTotal: ${data.institutions.length} institutions, ${data.programmes.length} programmes. Unclassified fields: ${unclassified.length}`);
unclassified.slice(0, 30).forEach((p) => console.log("   ?", p.institution, "|", p.name, "|", p.college));

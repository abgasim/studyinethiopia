// Turn Jimma University's "List of All Programmes" page text into research programme lists by college.
import fs from "node:fs";
const L = fs.readFileSync(process.argv[2], "utf8").split("\n");
const lines = L.slice(L.indexOf("INSTITUTE OF HEALTH SCIENCES"), L.indexOf("Registrar Office"));

const titleCase = (s) => s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\b(Of|And|In)\b/g, (m) => m.toLowerCase());
const tidy = (s) => s.replace(/\s*\(New\)\s*/gi, "").replace(/\s*&\s*/g, " and ").replace(/&/g, " and ").replace(/\s+/g, " ").trim()
  .replace(/\bstudies\b/g, "Studies").replace(/\bmanagement\b/g, "Management").replace(/\btechnology\b/g, "Technology").replace(/\bextension\b/g, "Extension")
  .replace(/\bproduction\b/g, "Production").replace(/\bdisease\b/g, "Disease").replace(/\bdentistry\b/g, "Dentistry").replace(/\bcommunity\b/g, "Community")
  .replace(/\baffairs\b/g, "Affairs").replace(/\bleadership\b/g, "Leadership").replace(/\bpsychology\b/g, "Psychology").replace(/\bhealth\b/g, "Health")
  .replace(/\bstream\b/g, "Stream").replace(/\bAdaption\b/g, "Adaptation").replace(/\bchange\b/g, "Change").replace(/Languages Literature/g, "Language and Literature")
  .replace(/Languages and Literature/g, "Language and Literature").replace(/Condensed Matters/g, "Condensed Matter").replace(/Differential Equation\b/g, "Differential Equations")
  .replace(/Pharmaceuticals Science/, "Pharmaceutical Sciences").replace(/Electrical computer Engineering/, "Electrical and Computer Engineering")
  .replace(/^Afan Oromo/, "Afaan Oromo").replace(/^NRM\b/, "Natural Resource Management").replace(/Nano Technology/, "Nanotechnology");

function parse(line, stage) {
  let m;
  if ((m = line.match(/^Sub[- ]?specialty Certificate in (.+)$/i))) return ["Specialty", tidy(m[1]) + " (subspecialty)"];
  if ((m = line.match(/^Specialty Certificate in (.+)$/i))) return ["Specialty", tidy(m[1])];
  if ((m = line.match(/^PhD in (.+)$/i))) return ["PhD", tidy(m[1])];
  if (stage === "ug") {
    if ((m = line.match(/^BEd in (.+)$/i))) return ["Bachelor's", tidy(m[1]) + " (Teacher Education)"];
    if ((m = line.match(/^DVM in (.+)$/i))) return ["Bachelor's", "Veterinary Medicine (DVM)"];
    if ((m = line.match(/^MD in (.+)$/i))) return ["Bachelor's", "Medicine (MD)"];
    if ((m = line.match(/^DDM in (.+)$/i))) return ["Bachelor's", "Dental Medicine (DDM)"];
    if ((m = line.match(/^LLB in (.+)$/i))) return ["Bachelor's", "Law"];
    if ((m = line.match(/^(?:BSc|BA|B\.Sc)?\s*in (.+)$/i))) return ["Bachelor's", tidy(m[1])];
    return null;
  }
  if ((m = line.match(/^Executive MBA in (.+)$/i))) return ["Master's", tidy(m[1]) + " (Executive MBA)"];
  if (/^MBA in Business Administration/i.test(line)) return ["Master's", "Business Administration (MBA)"];
  if ((m = line.match(/^Masters? in (.+)$/i))) return ["Master's", tidy(m[1])];
  if ((m = line.match(/^Master of (.+)$/i))) return ["Master's", tidy(m[1])];
  if ((m = line.match(/^(MSc|MA|MPH|LLM|MSW)\s+in (.+)$/i))) return ["Master's", tidy(m[2]) + (m[1].toUpperCase() === "MPH" ? " (MPH)" : m[1].toUpperCase() === "LLM" ? " (LLM)" : m[1].toUpperCase() === "MSW" ? " (MSW)" : "")];
  if ((m = line.match(/^in (.+)$/i))) return ["Master's", tidy(m[1])];
  return null;
}

const out = {};
let college = "", stage = "", last = null; // last = {college, level, name, specs: []}
const push = (c, lv, n) => { const a = ((out[c] ??= {})[lv] ??= []); if (!a.includes(n)) a.push(n); };
const flush = () => {
  if (!last) return;
  if (last.specs.length) last.specs.forEach((s) => push(last.college, last.level, `${last.name.replace(/ \((MPH|LLM|MSW)\)$/, "")} (${s})`));
  else push(last.college, last.level, last.name);
  last = null;
};
const skipped = [];
for (const raw of lines) {
  const line = raw.trim();
  if (/^[A-Z][A-Z ,&]+$/.test(line) && line.length > 8) { flush(); college = titleCase(line).replace(/^Jimma Institute/, "Jimma Institute"); continue; }
  if (/^A\. Undergraduate/i.test(line)) { flush(); stage = "ug"; continue; }
  if (/^B\. Graduate/i.test(line)) { flush(); stage = "pg"; continue; }
  const spec = line.match(/^Speciali[sz](?:ation|ing) (?:in|on) (.+)$/i);
  if (spec && last) { last.specs.push(tidy(spec[1])); continue; }
  const p = parse(line, stage);
  if (!p) { skipped.push(line); continue; }
  flush();
  last = { college, level: p[0], name: p[1], specs: [] };
}
flush();
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
let total = 0;
for (const [c, v] of Object.entries(out)) { console.log(c.padEnd(48), Object.entries(v).map(([k, a]) => { total += a.length; return `${k} ${a.length}`; }).join(", ")); }
console.log("total", total, "| skipped:", JSON.stringify(skipped));

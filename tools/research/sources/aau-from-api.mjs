// Build research programme lists for Addis Ababa University from its public website API (api.aau.edu.et).
//   node build.mjs <programs.json> <academicUnits.json> <colleges.json> <institutes.json> <out.json>
import fs from "node:fs";
const [P, U, C, I, OUT] = process.argv.slice(2);
const read = (f) => JSON.parse(fs.readFileSync(f, "utf8")).items;
const programs = read(P), units = new Map(read(U).map((u) => [u.id, u]));
const colleges = new Map(read(C).map((c) => [c.id, c.name.trim()]));
const institutes = new Map(read(I).map((c) => [c.id, c.name.trim().replace(/\s*\([A-Z]+\)\s*$/, "")]));

function ownerOf(unitId, depth = 0) {
  const u = units.get(unitId);
  if (!u || depth > 5) return "";
  if (u.ownerCollegeId && colleges.has(u.ownerCollegeId)) return colleges.get(u.ownerCollegeId);
  if (u.ownerInstituteId && institutes.has(u.ownerInstituteId)) return institutes.get(u.ownerInstituteId);
  return u.parentSchoolId ? ownerOf(u.parentSchoolId, depth + 1) : "";
}
const LEVEL = { UNDERGRADUATE: "Bachelor's", POSTGRADUATE: "Master's", PhD: "PhD", SPECIALITY: "Specialty", SUB_SPECIALITY: "Specialty" };
function clean(name, type) {
  let n = name.replace(/\s+/g, " ").trim();
  const sub = /^Subspecialty/i.test(n) || type === "SUB_SPECIALITY";
  n = n.replace(/^(Bachelor of (Arts|Science|Education)|Master of (Arts|Science|Education)|Masters? of|Executive Master's|Master's|Masters|Master|BA|BSc|BEd|BFA|MA|MSc\s*\/\s*MEng|MSc|MEd|MPH|PhD|Doctor of Philosophy|Subspecialty|Specialty)\s+(in|of)\s+/i, "");
  n = n.replace(/^MSc Advanced\s+/i, "Advanced ").replace(/^MA International\s+/i, "International ");
  if (/^Doctor of Veterinary Medicine/i.test(n)) n = "Veterinary Medicine (DVM)";
  if (/^Doctor of Dental Medicine/i.test(n)) n = "Dental Medicine (DMD)";
  if (/^Doctor of Medicine/i.test(n)) n = "Medicine (MD)";
  if (/^MPH/i.test(name) && !/\(MPH\)/.test(n)) n += " (MPH)";
  if (/^Executive Master/i.test(name)) n += " (Executive)";
  n = n.replace(/\s*&\s*/g, " and ").replace(/\bsurgery\b/g, "Surgery").replace(/\bmedicine\b/g, "Medicine");
  n = n.charAt(0).toUpperCase() + n.slice(1);
  if (sub && !/subspecialty/i.test(n)) n += " (subspecialty)";
  return n;
}
const out = {}, unknown = [];
for (const p of programs) {
  const type = p.programType || (/^Specialty/i.test(p.name) ? "SPECIALITY" : null);
  const lv = LEVEL[type];
  if (!lv) { unknown.push(p.name); continue; }
  const owner = ownerOf(p.academicUnitId);
  const arr = ((out[owner] ??= {})[lv] ??= []);
  const n = clean(p.name, type);
  if (!arr.includes(n)) arr.push(n);
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
let total = 0;
for (const [c, v] of Object.entries(out)) console.log((c || "(no unit)").padEnd(62), Object.entries(v).map(([k, a]) => { total += a.length; return `${k} ${a.length}`; }).join(", "));
console.log("total", total, "unknown type:", unknown);

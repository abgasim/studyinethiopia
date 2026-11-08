// Turn Wachemo University's AcademicProgram.aspx text into research JSON.
import fs from "node:fs";
const L = fs.readFileSync(process.argv[2], "utf8").split("\n");
const lines = L.slice(L.indexOf("A. Under Graduate Programs"), L.indexOf("External Important Links"));
const COLLEGE = {
  "Engineering & Technology": "College of Engineering and Technology",
  "Natural and Computational Sciences": "College of Natural and Computational Sciences",
  "Medicine and Health Sciences": "College of Medicine and Health Sciences",
  "Agricultural Sciences": "College of Agricultural Sciences",
  "Business and Economics": "College of Business and Economics",
  "Social Science and Humanities": "College of Social Sciences and Humanities",
  "Social Sciences and Humanities": "College of Social Sciences and Humanities",
  "Education & Behavioral Sciences": "College of Education and Behavioral Sciences",
  "Education and Behavioral Sciences": "College of Education and Behavioral Sciences",
  "School of Law": "School of Law",
  "School of Veterinary Medicine": "School of Veterinary Medicine",
};
const FIX = {
  "Paediatrics& Chilled Health Nursing (PB)": "Paediatrics and Child Health Nursing (post-basic)",
  "Surgical Nursing(PB)": "Surgical Nursing (post-basic)",
  "Information System(IS)": "Information Systems", "Information Technology(IT)": "Information Technology",
  "Agro Economics": "Agricultural Economics", "Political Science and International Relation": "Political Science and International Relations",
  "Hadiyissa Language & Literature (Main Campus)": "Hadiyyisa Language and Literature", "Kambatisa (Durame Campus)": "Kambatissa Language and Literature",
  "Journalism": "Journalism and Communication", "Law (LLB)": "Law", "Doctor of Veterinary Medicine (DVM)": "Veterinary Medicine (DVM)",
  "Valley Ball Coaching": "Volleyball Coaching", "Exercises Physiology": "Exercise Physiology", "Analysis (Mathematics)": "Mathematics (Analysis)",
  "Quantum Optics": "Physics (Quantum Optics)", "Condensed Matter": "Physics (Condensed Matter)", "Physics (Condensed matter)": "Physics (Condensed Matter)",
  "Masters of Business Administration (MBA)": "Business Administration (MBA)", "Educational Leadership & Management (EDPM)": "Educational Leadership and Management",
  "Educational Leadership and Management (EDPM)": "Educational Leadership and Management", "Animal breeding & Genetics": "Animal Breeding and Genetics",
  "Geography and Environmental Science (Sustainable natural resource management)": "Geography and Environmental Science (Sustainable Natural Resource Management)",
  "Mathematical Education": "Mathematics Education",
};
const clean = (s) => {
  let n = s.replace(/^(BSc\.?|BA|MSc|MSC|MA|MPH|MEd|LLM|PhD\.?|Masters? of)\s+in\s+/i, "").replace(/^BSc\.? in\s*/i, "").trim();
  n = FIX[n] || n;
  return n.replace(/\s*&\s*/g, " and ").replace(/\s+/g, " ");
};
let stage = "", college = "";
const out = {};
const add = (lv, name) => (((out[college] ??= {})[lv] ??= []).includes(name) ? 0 : out[college][lv].push(name));
for (const l of lines) {
  if (/^A\. Under Graduate/.test(l)) { stage = "ug"; continue; }
  if (/^B\. Post Graduate/.test(l)) { stage = "pg"; continue; }
  if (/^PhD\. Programs/.test(l)) { stage = "phd"; college = ""; continue; }
  if (/^SPECIALITY PROGRAMS/.test(l)) { stage = "spec"; college = "College of Medicine and Health Sciences"; continue; }
  const h = l.match(/^[IVX]+\.\s+(.+)$/);
  if (h) { college = COLLEGE[h[1].trim()] || h[1].trim(); continue; }
  // Bare headings repeated without a degree prefix (e.g. "Educational Leadership & Management") are skipped in UG
  if (stage === "ug" && !/^(BSc|BA|Doctor)/i.test(l)) continue;
  const lv = stage === "ug" ? "Bachelor's" : stage === "phd" ? "PhD" : stage === "spec" ? "Specialty" : "Master's";
  add(lv, clean(l));
}
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
for (const [c, v] of Object.entries(out)) console.log(c || "(none)", Object.entries(v).map(([k, a]) => `${k} ${a.length}`).join(", "));

// Build a research JSON for Madda Walabu University from its site's route list (data/page-routes.json).
import fs from "node:fs";
const routes = JSON.parse(fs.readFileSync(process.argv[2], "utf8")).routes;
const SITE = "https://www.mwu.edu.et";
const COLLEGE = {
  "college-social-sciences-humanities": "College of Social Sciences and Humanities",
  "school-law": "School of Law",
};
const SKIP = /specializations|^program-ug-edpm$/i;

function level(slug, title) {
  if (/specialty/i.test(slug)) return "Specialty";
  if (/pgdt/i.test(slug)) return "Diploma";
  if (slug.startsWith("program-phd-")) return "PhD";
  if (slug.startsWith("program-pg-")) return "Master's";
  return "Bachelor's";
}
function clean(t) {
  let n = t.replace(/^(Bachelor of Science in|Master of Science in|BA|BSc|MA|MSc|PhD|MPH|MHP|Specialty)\s+(in\s+)?/i, "").replace(/\s+–\s+/g, " (").trim();
  if (/\($/.test(n) === false && t.includes(" – ")) n += ")";
  const fix = {
    "Bachelor of Laws (LL.B)": "Law", "MBA": "Business Administration (MBA)", "PGDT Curriculum": "Postgraduate Diploma in Teaching (PGDT)",
    "Postgraduate Tourism and Hospitality Management": "Tourism and Hospitality Management",
    "Health Service Management, GPH and SHC": "Health Service Management (MHP)", "Public Health Nutrition": "Public Health Nutrition (MPH)",
    "Mathematics (Differential)": "Mathematics (Differential Equations)", "Optimization": "Mathematics (Optimization)",
    "Teaching English as a Foreign Language": "Teaching English as a Foreign Language (TEFL)",
    "Developmental Economics": "Development Economics", "Rural Development and Agri Extension": "Rural Development and Agricultural Extension",
    "Business Education (Summer)": "Business Education", "Engineering Drawing and Design (Summer)": "Engineering Drawing and Design",
    "Public Health in Epidemiology": "Epidemiology", "Survey Engineering": "Surveying Engineering",
  };
  return fix[n] || fix[t] || n;
}

const programmes = {};
let count = 0;
for (const r of routes) {
  if (!/^program-(ug|pg|phd)-/.test(r.slug) || SKIP.test(r.slug) || SKIP.test(r.title)) continue;
  const seg = r.path.split("/");
  const college = COLLEGE[seg.find((s) => COLLEGE[s])] || "";
  const src = SITE + r.path;
  const lv = level(r.slug, r.title);
  ((programmes[src] ??= {})[college] ??= {})[lv] = [clean(r.title)];
  count++;
}
const out = {
  "madda-walabu-university": {
    website: "https://www.mwu.edu.et/",
    founded: 2007,
    summary: "Madda Walabu University is a public university in Robe, Bale Zone of Oromia, founded in 2007 (1999 E.C.) and named after Madda Walabu, a historic site of the Oromo Gadaa system. It has colleges of agriculture and natural resources, business and economics, computing, education and behavioural studies, engineering, medicine and health sciences, natural and computational sciences, and social sciences and humanities, and a School of Law, offering over 120 bachelor's, master's, specialty and PhD programmes.",
    colleges: ["College of Agriculture and Natural Resources", "College of Business and Economics", "College of Computing", "College of Education and Behavioural Studies", "College of Engineering", "College of Medicine and Health Sciences", "College of Natural and Computational Sciences", "College of Social Sciences and Humanities", "School of Law"],
    sources: [
      { label: "Madda Walabu University website", url: "https://www.mwu.edu.et/", kind: "official" },
      { label: "Academic programmes", url: "https://www.mwu.edu.et/program", kind: "official" },
    ],
    coverage: "full",
    coverageNote: "Programme names come from the website's page list; the website's content service was down in November 2026, so programme pages may appear empty.",
    programmes,
  },
};
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1) + "\n");
console.log("programmes:", count);

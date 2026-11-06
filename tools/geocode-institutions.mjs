// Add map coordinates (and region, if missing) to institutions in site/assets/data.js.
//
//   node tools/geocode-institutions.mjs            # geocode institutions that have no coordinates yet
//   node tools/geocode-institutions.mjs --all      # re-geocode everything in locations.json
//
// Cities come from tools/locations.json (institution id -> main-campus city).
// Geocoding uses OpenStreetMap Nominatim: max 1 request per second, results cached in
// tools/research/geocode-cache.json so re-runs don't hit the service again.

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "site", "assets", "data.js");
const LOCATIONS = path.join(ROOT, "tools", "locations.json");
const CACHE = path.join(ROOT, "tools", "research", "geocode-cache.json");
const ALL = process.argv.includes("--all");

// ISO 3166-2 region codes returned by OpenStreetMap -> region names used on the site
const REGION = {
  "ET-AA": "Addis Ababa", "ET-AF": "Afar", "ET-AM": "Amhara", "ET-BE": "Benishangul-Gumuz",
  "ET-DD": "Dire Dawa", "ET-GA": "Gambela", "ET-HA": "Harari", "ET-OR": "Oromia", "ET-SI": "Sidama",
  "ET-SO": "Somali", "ET-TI": "Tigray", "ET-SW": "South West Ethiopia Peoples",
  "ET-CE": "Central Ethiopia", "ET-SE": "South Ethiopia",
};
// Fallback: take the Latin-script part of OpenStreetMap's multilingual state name
const latinName = (s) => ((String(s || "").match(/[A-Za-z][A-Za-z .'-]+[A-Za-z]/g) || []).find((x) => !/^(Region|Regional State)$/i.test(x)) || "")
  .replace(/\s+(Regional State|Region)$/i, "").trim();
// Only accept settlements: a plain search for "Adwa" otherwise returns a volcano, and some
// towns come back as the centre of a whole district or region.
const SETTLEMENT = new Set(["city", "town", "village", "suburb", "hamlet", "quarter", "neighbourhood"]);

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(DATA, "utf8"), ctx);
const data = ctx.window.SIE_DATA;
const locations = JSON.parse(fs.readFileSync(LOCATIONS, "utf8"));
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, "utf8")) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function geocode(city) {
  if (cache[city] !== undefined && cache[city] !== null) return cache[city];
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q: `${city}, Ethiopia`, format: "jsonv2", addressdetails: "1", limit: "10", countrycodes: "et", featureType: "settlement" })}`;
  const res = await fetch(url, { headers: { "User-Agent": "StudyInEthiopia-site-builder/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${city}`);
  const hits = await res.json();
  // Prefer a settlement point; otherwise accept a city/town boundary (never a zone or region)
  const hit = hits.find((h) => h.category === "place" && SETTLEMENT.has(h.type)) ||
    hits.find((h) => ["city", "town", "village"].includes(h.addresstype));
  await sleep(1100);
  if (!hit) return (cache[city] = null);
  const a = hit.address || {};
  const code = a["ISO3166-2-lvl4"] || "";
  return (cache[city] = {
    lat: Math.round(Number(hit.lat) * 1e5) / 1e5,
    lng: Math.round(Number(hit.lon) * 1e5) / 1e5,
    region: REGION[code] || latinName(a.state) || "",
    code, type: hit.type, osm: `https://www.openstreetmap.org/${hit.osm_type}/${hit.osm_id}`,
  });
}

const rows = [];
for (const [id, city] of Object.entries(locations)) {
  if (id.startsWith("_")) continue;
  const inst = data.institutions.find((i) => i.id === id);
  if (!inst) { rows.push(["!", id, city, "no such institution id"]); continue; }
  if (!ALL && inst.lat) { rows.push(["=", inst.name, city, "already has coordinates"]); continue; }
  const g = await geocode(city);
  if (!g) { rows.push(["!", inst.name, city, "not found"]); continue; }
  // Sanity check: inside Ethiopia's bounding box
  if (g.lat < 3 || g.lat > 15.5 || g.lng < 32.9 || g.lng > 48.1) { rows.push(["!", inst.name, city, `outside Ethiopia (${g.lat}, ${g.lng})`]); continue; }
  inst.lat = g.lat; inst.lng = g.lng;
  if (!inst.city) inst.city = city.split(",")[0];
  if (!inst.region && g.region) inst.region = g.region;
  inst.location = { source: "OpenStreetMap", note: "City of the main campus", url: g.osm };
  rows.push(["+", inst.name, city, `${g.lat}, ${g.lng} · ${g.region || "?"} (${g.code || "no code"}) · ${g.type}`]);
}

fs.mkdirSync(path.dirname(CACHE), { recursive: true });
fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1));
const header = "/* Study in Ethiopia: site content.\n   Edit with admin.html (recommended) or by hand. Keep it valid JSON inside SIE_DATA. */\n";
fs.writeFileSync(DATA, header + "window.SIE_DATA = " + JSON.stringify(data, null, 1) + ";\n");
rows.forEach((r) => console.log(r.join("  ")));
console.log(`\n${data.institutions.filter((i) => i.lat).length} institutions now have map coordinates.`);

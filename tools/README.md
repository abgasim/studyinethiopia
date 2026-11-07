# Research tools

How institution and programme information gets from the web into the site. This folder is not part of the website; don't upload it.

## Workflow
1. **Research.** For each institution, read its official website (Academics / Programs / Admissions / Graduate Studies pages) and record what it actually lists. Use Wikipedia or other sites only for the profile (city, founding year, colleges), and mark them `"kind": "secondary"`.
2. **Save** the result as a JSON file in `research/`, one file per batch (format below).
3. **Import:**
   ```
   node tools/import-research.mjs tools/research/<file>.json
   ```
   This updates `site/assets/data.js`:
   - merges each profile into its institution
   - replaces that institution's previously researched programmes (programmes added by hand in the admin are kept)
   - removes duplicates
   - assigns a field of study to every programme
   - stamps today's date as "last checked"
4. **Review** in `site/admin.html` (Institutions → filter "Not checked in 12 months", Programmes → by institution), then publish `data.js`.

Running the importer with no files re-applies the categories and field-of-study rules to everything, which is useful after improving the rules in `import-research.mjs`.

## Map locations
The home-page map shows public institutions that have coordinates (`lat`, `lng` in `data.js`).
1. Add the institution's main-campus city to `tools/locations.json` (`"institution-id": "City"`; add the region if the name is ambiguous, e.g. `"Adwa, Tigray"`).
2. Run `node tools/geocode-institutions.mjs`. It looks the city up in OpenStreetMap (towns and cities only, never a volcano or a whole region), fills in `lat`, `lng`, `city` and `region` if missing, and prints every result to check.
3. Or set the latitude and longitude by hand in the admin (Institutions → edit → Map latitude/longitude).

Not yet placed (location unconfirmed): Ethiopian Federal Police College, Ethiopian Management Institute. Nazareth College of Technical Teachers is the former name of Adama Science & Technology University, so it has no separate pin.

## Research file format
```json
{
  "haramaya-university": {
    "category": "University", "city": "Haramaya", "region": "Oromia", "founded": 1954,
    "summary": "2–3 neutral sentences.",
    "colleges": ["College of ..."],
    "stats": { "undergraduate": 72, "masters": 137, "phd": 46, "source": "https://...", "asOf": "2025/26" },
    "sources": [{ "label": "University website", "url": "https://...", "kind": "official" }],
    "coverage": "most | partial | none",
    "coverageNote": "Shown when programmes are missing or incomplete.",
    "programmes": {
      "<source page url>": { "<college>": { "Bachelor's": ["Civil Engineering", "..."], "Master's": ["..."] } }
    }
  }
}
```
- The key is the institution `id` from `data.js` (see the admin, or `institution.html?id=...`).
- `programmes` may also be a flat list: `[{ "level", "name", "college", "source" }]`.
- Levels: `Certificate`, `Diploma`, `Bachelor's`, `Master's`, `PhD`, `Specialty` (medical specialty/residency).
- Programme names are the subject only, without "BSc in" or "MA in".

## Rules of thumb
- Only record what a page actually says, and keep its link. If a site is down, record that in `coverageNote` instead of guessing.
- University sites often disagree with themselves about counts. Use the most recent dated figure and give its source.
- Recheck institutions yearly; programmes open and close.

## Status
| Batch | Institutions | Programmes |
|---|---|---|
| `2026-11-pilot*.json` | Haramaya (most), Bahir Dar (postgraduate + BiT undergraduate), Hawassa (partial), Jimma and Addis Ababa (profile only: sites unreachable) | 600 |
| `2026-11-batch2.json` | Wollo (most), Mekelle and Gondar (all postgraduate, some undergraduate), ASTU (postgraduate only), Debre Berhan (5 colleges); Gondar renamed "University of Gondar". Arba Minch, Dilla, Ambo: sites refused connections, retry later | +984 (1,584 total) |
| `2026-11-batch3.json` | Wolaita Sodo (most), Jijiga and Mattu (partial), Institute of Land Administration confirmed as part of Debre Markos University (mapped); Mettu renamed "Mattu University". Unreachable: Bule Hora, Wachemo (503), Wolkite (expired certificate), Debre Tabor (redirects to an unrelated "blocked" page), and again Arba Minch, Dilla, Ambo | +199 (1,783 total) |
| `2026-11-batch4.json` | Samara, Assosa, Kotebe (renamed "Kotebe University of Education", new site kue.edu.et) mostly complete; Wollega and Adigrat partial; Aksum profile only (levels not stated). Unreachable: Madda Walabu (no readable content), Oromia State (redirects to an unrelated "blocked" page, like Debre Tabor), Ethiopian Civil Service University (TLS error), Dire Dawa (expired certificate) | +300 (2,083 total) |
| `2026-11-batch5.json` | Woldia (full), Mizan Tepi, HiLCoE, ECUSTA, Evangelical Theological College mostly complete; St. Mary's, Rift Valley, Alpha, GAGE, Mekane Yesus partial; SPHMMC, Wondo Genet, Unity profile only (no readable programme list). Unreachable: Federal Police, Admas, Microlink, CPU, PESC, Zion, Queens, Hope, Meserete Kristos, Hamlin, Washera. Not imported: Infolink and New Generation (sites found belong to a Kenyan / Somaliland institution), Jethro (professional certificates only) | +264 (2,347 total) |
| `2026-11-batch6.json` | **15 new public universities** (the importer now creates an institution when the research gives `name` + `type`). Full: Injibara (from its PDF lists), Salale, Borana; most: Raya; partial: Bonga, Gambella, Dambi Dollo, Debark, Jinka, AASTU (departments only). Profile only: Werabe (empty programme page), Arsi (college sub-sites), Mekdela Amba and Oda Bultum (refused), Kebri Dehar (old address redirects elsewhere) | +390 (2,737 total); Werabe added afterwards from its /colleges/<initials>/ pages (+61; 2,798 total) |

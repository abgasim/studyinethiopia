# Study in Ethiopia — static site

Plain HTML, CSS and JavaScript. No PHP, no database, no build step.

```
site/
  index.html            Home: hero search, stats, three paths, official sources
  institutions.html     Directory: search + filters (public/private, category, region, level, field)
  institution.html      Profile page for one institution (?id=...): summary, programmes, colleges, sources
  programmes.html       Find a programme across all institutions
  am/ om/ ti/           Amharic, Afaan Oromo and Tigrinya versions of every public page (generated)
  apply.html            Study in Ethiopia from abroad: regulators (MoE, ETA, EAES, ICS) and the 8-step path
  study-abroad.html     Country portals, IELTS/TOEFL, practice material
  learn.html            MOOCs
  resources.html        Ministries, agencies, background reading
  about.html            About page
  admin.html            Admin portal (online, GitHub sign-in) and offline editor (opened from disk)
  assets/
    data.js             ALL site content (written by the admin dashboard)
    app.js              Renders content into each page (picked by <body data-page>)
    admin.js, admin.css Admin dashboard
    style.css           Design tokens (top of file), light/dark themes, components
    img/                Flags, logos, hero photo
```

## Admin portal (online)
Click **Portal** in the footer of any page, or go to `https://www.studyinethiopia.com/admin.html`, and sign in with a GitHub fine-grained access key that has **Contents: Read and write** on `abgasim/studyinethiopia` only. The sign-in screen explains how to create one. **Publish** commits `site/assets/data.js` to GitHub, and the live site updates about a minute later.
- The key is stored only in your browser (for this tab, or on this device if you tick "Keep me signed in"). **Sign out** removes it.
- Without a valid key the portal can't read drafts or change anything; GitHub enforces this, not the page.
- If someone else changed the content since you signed in, Publish stops and asks you to load the latest version first, so nobody's work is overwritten.
- If a key is lost or shared, delete it at github.com/settings/personal-access-tokens.

## Editing content offline (admin dashboard on your computer)
1. Open `site/admin.html` in **Microsoft Edge or Google Chrome** (double-click it).
2. Edit any section: Institutions, Programmes, Country portals, English tests, Practice material, Online courses, Official links.
3. Press **Save** (or Ctrl+S). The first time, choose the file `site/assets/data.js` and replace it. After that, Save writes to it directly.
4. Click **Preview site** to check, then upload `assets/data.js` to your host. That one file is all that changes.

Notes:
- Unsaved edits are kept as a draft in the browser. If you close the tab, you'll be offered to restore them.
- In Firefox or Safari, Save downloads a `data.js` instead. Copy it over `site/assets/data.js`.
- Deleting an institution also deletes its programmes. Use **Undo** in the message that appears if that was a mistake.
- New logos and flags: put the PNG in `assets/img/logos/` or `assets/img/flags/` first, then type its name (without `.png`).

## Editing content by hand
Open `assets/data.js`. Each list is plain JSON inside `window.SIE_DATA`:

- `institutions`: `{ id, name, abbr, type: "public" | "private", category, city, region, founded, website, summary, about: [paragraphs], colleges: [], stats: {}, sources: [{label, url, kind}], coverage, coverageNote, checked }`. `id` must stay the same once programmes refer to it.
- `programmes`: `{ institution: <institution id>, level, name, field, college, source, credits?, mode?, schedule?, language? }`. Levels: Certificate, Diploma, Bachelor's, Master's, PhD, Specialty. `field` is one of the list in `fields`.
- `studyAbroad`: `{ name, label?, code, website }`, where `code` is the flag file in `assets/img/flags/`.
- `languageTests`, `practice`, `moocs`, `links`: same idea.

Save the file and reload the page. Institutions and programmes are sorted automatically; the other lists appear on the site in the order they're in the file.

## The map
The home page shows public institutions on a map, using Leaflet (loaded from cdnjs only when the map scrolls into view) and OpenStreetMap tiles. OpenStreetMap's free tile server is fine for a small site, but its [usage policy](https://operations.osmfoundation.org/policies/tiles/) asks heavy users to switch to a commercial tile provider; if traffic grows, change the tile URL in `renderMap()` in `assets/app.js`. To add or move pins, see `tools/README.md`.

## The international-students guide
`apply.html` is written by hand. Its facts come from official pages listed in its Sources section (checked 6 November 2026). Recheck them yearly, especially fees and visa rules.

## Adding researched information
Institution profiles and programme lists are collected from official websites and imported with `tools/import-research.mjs`. See `tools/README.md`.

## Languages, header and footer (page builder)
The site is in **English** (`/`), **Amharic** (`/am/`), **Afaan Oromo** (`/om/`) and **Tigrinya** (`/ti/`). Non-English pages show a short "this translation is new" notice (set in `CHROME[lang]["note"]`; remove it once a native speaker has reviewed that language). The HTML pages are generated; don't edit `site/*.html` or `site/am/*.html` directly.
- **Page content:** `tools/pages/en/<page>.html` and `tools/pages/am/<page>.html` (only what goes inside `<main>`).
- **Header, footer, navigation, page titles:** `tools/build-pages.py`.
- **Text created by JavaScript** (filters, counts, map, profiles) and the Amharic names of levels, categories, fields and regions: the `I18N` and `LABELS` tables at the top of `assets/app.js`.

After editing, rebuild and commit:
```
python tools/build-pages.py
```
Institution and programme names, summaries and sources stay in English on every language (they come from `data.js`).

To add another language: add it to `LANGS`, `CHROME` and `PAGE_META` in `tools/build-pages.py`, translate `tools/pages/en/` into `tools/pages/<code>/`, add its block to `I18N` and `LABELS` in `assets/app.js`, and add its code to the `LANG` and `DATE_LOCALE` lines there.

## Running locally
Double-click `index.html`, or serve the folder:

```
cd site
python -m http.server 8000      # then open http://localhost:8000
```

## Deploying
The site is published by GitHub Pages from this repository on every push to `main` (see `.github/workflows/deploy-pages.yml`). To host elsewhere, upload the **contents** of `site/` to any static host (cPanel `public_html`, Netlify, GitHub Pages, Cloudflare Pages).

At deploy the workflow also prepares the published copy (the files in `site/` are not changed):
- `tools/build-sitemap.mjs` writes `sitemap.xml` from `data.js`;
- `tools/split-data.mjs` splits `data.js` into `data-core.js` (everything except the programme list, plus programme counts) and `programmes.js`, so the home, study-abroad, learn and resources pages load ~150 KB instead of ~1.3 MB; pages marked `data-split="full"` load both;
- shared files get content fingerprints (`?v=…`) so browsers fetch updates immediately.

`assets/data.js` remains the single source of truth: edit it (or use the admin portal), never the generated files. If you upload `site/` to another host without the workflow, every page simply loads `data.js` as before.

**Important:** the old server contained hidden web-shell files (`contents.php` in every `sie_*` folder). Before deploying:
1. Delete everything in `public_html`. Don't upload the new site next to the old PHP files.
2. Change your hosting, cPanel, FTP and MySQL passwords.
3. Remove the old MySQL database, or at least the `users` table, if nothing else uses it.

## Not carried over from the PHP version
Visit counter, donate and student-portal placeholders. The old book list and public data-entry forms (form1, form2, upload.php: no login, open to SQL injection) are replaced by the admin dashboard. The old 211-name US degree list from form1 isn't used; programmes are entered as level + name + field of study.

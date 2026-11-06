# Study in Ethiopia

A free guide to higher education in Ethiopia, in English, Amharic, Afaan Oromo and Tigrinya: a directory of universities and colleges with their programmes, a map of public universities, a step-by-step guide for international students, and links for studying abroad.

Live site: **https://www.studyinethiopia.com**

## What's here

| Folder | What it is |
|---|---|
| [`site/`](site/) | The website: plain HTML, CSS and JavaScript, no build step. See [site/README.md](site/README.md). |
| [`tools/`](tools/) | The page builder (`build-pages.py`, page content in `tools/pages/<lang>/`), plus scripts for importing researched programme data and placing institutions on the map. See [tools/README.md](tools/README.md). |
| [`.github/workflows/`](.github/workflows/) | Publishes `site/` to GitHub Pages on every push to `main`. |

## Editing content
- **Online:** click **Portal** in the site footer (`/admin.html`), sign in with a GitHub access key for this repository, edit, and press **Publish**. The site updates about a minute later.
- **Offline:** open `site/admin.html` from disk in Edge or Chrome, edit, press **Save** (choose `site/assets/data.js`), then commit and push.

## Running locally
```
cd site
python -m http.server 8000
```
Then open http://localhost:8000.

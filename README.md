# Study in Ethiopia

A free guide to higher education in Ethiopia: a directory of universities and colleges with their programmes, a map of public universities, a step-by-step guide for international students, and links for studying abroad.

Live site: **https://www.studyinethiopia.com**

## What's here

| Folder | What it is |
|---|---|
| [`site/`](site/) | The website: plain HTML, CSS and JavaScript, no build step. See [site/README.md](site/README.md). |
| [`tools/`](tools/) | Scripts for importing researched programme data and placing institutions on the map. See [tools/README.md](tools/README.md). |
| [`.github/workflows/`](.github/workflows/) | Publishes `site/` to GitHub Pages on every push to `main`. |

## Editing content
Open `site/admin.html` in Edge or Chrome on your computer, edit, press **Save** (choose `site/assets/data.js`), then commit and push. The site updates within a minute or two. The admin page is never published.

## Running locally
```
cd site
python -m http.server 8000
```
Then open http://localhost:8000.

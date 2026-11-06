"""Build the public HTML pages of Study in Ethiopia, in every language.

    python tools/build-pages.py

Page content lives in tools/pages/<lang>/<page>.html (just what goes inside <main>).
This script wraps it in the shared header and footer, fixes paths for sub-folders,
and writes site/<page>.html (English) and site/<lang>/<page>.html (other languages).

To change the navigation or footer, edit CHROME below and re-run. To add a language,
add it to LANGS, add its CHROME strings and PAGE_META, and translate the files in
tools/pages/en/ into tools/pages/<lang>/. Text produced by JavaScript (filters, counts,
map, profiles) is translated in site/assets/app.js (the I18N table).
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
PAGES_DIR = os.path.join(ROOT, "tools", "pages")
DOMAIN = "https://www.studyinethiopia.com"

# dir: output folder under site/ ("" = site root). name: shown in the language switch.
LANGS = {
    "en": {"dir": "", "name": "English", "html_lang": "en"},
    "am": {"dir": "am", "name": "አማርኛ", "html_lang": "am"},
}

PAGES = ["index", "institutions", "institution", "programmes", "apply", "study-abroad", "learn", "resources", "about"]
# page -> (data-page used by app.js, needs data.js)
PAGE_JS = {
    "index": ("home", True), "institutions": ("institutions", True), "institution": ("institution", True),
    "programmes": ("programmes", True), "apply": ("apply", False), "study-abroad": ("abroad", True),
    "learn": ("learn", True), "resources": ("resources", True), "about": ("about", False),
}

PAGE_META = {
    "en": {
        "index": ("Study in Ethiopia", "Find Ethiopian universities and colleges, scholarships to study abroad, English tests and free online courses."),
        "institutions": ("Universities & colleges", "Directory of public and private universities and colleges in Ethiopia, searchable by name."),
        "institution": ("Institution", "Profile, colleges and programmes of a higher-education institution in Ethiopia, with sources."),
        "programmes": ("Find a programme", "Search degree programmes across Ethiopian universities and colleges by level, field and region."),
        "apply": ("Study in Ethiopia from abroad", "How Ethiopian higher education is regulated (MoE, ETA formerly HERQA, EAES, ICS) and the steps for international students to apply, get recognised and get a student visa."),
        "study-abroad": ("Study abroad", "Official study-abroad portals and scholarship bodies, plus IELTS and TOEFL resources for Ethiopian students."),
        "learn": ("Learn online", "Free and low-cost online courses (MOOCs) from leading universities and organisations."),
        "resources": ("Resources", "Official Ethiopian education ministries and agencies, plus statistics and background reading."),
        "about": ("About", "About Study in Ethiopia (SiE): a free guide to higher education in Ethiopia and studying abroad."),
    },
    "am": {
        "index": ("Study in Ethiopia · በኢትዮጵያ ይማሩ", "የኢትዮጵያ ዩኒቨርሲቲዎችንና ኮሌጆችን፣ የትምህርት ፕሮግራሞችን፣ በውጭ ሀገር የመማር ዕድሎችንና ነፃ የኦንላይን ኮርሶችን ያግኙ።"),
        "institutions": ("ዩኒቨርሲቲዎችና ኮሌጆች", "በኢትዮጵያ የሚገኙ የመንግሥትና የግል ዩኒቨርሲቲዎችና ኮሌጆች ማውጫ።"),
        "institution": ("ተቋም", "የከፍተኛ ትምህርት ተቋም መግለጫ፣ ኮሌጆችና የትምህርት ፕሮግራሞች ከምንጮቻቸው ጋር።"),
        "programmes": ("ፕሮግራም ይፈልጉ", "በኢትዮጵያ ዩኒቨርሲቲዎችና ኮሌጆች የሚሰጡ የትምህርት ፕሮግራሞችን በደረጃ፣ በዘርፍና በክልል ይፈልጉ።"),
        "apply": ("ከውጭ ሀገር መጥተው በኢትዮጵያ ይማሩ", "የኢትዮጵያ ከፍተኛ ትምህርት እንዴት እንደሚተዳደር (ትምህርት ሚኒስቴር፣ የትምህርትና ሥልጠና ባለሥልጣን፣ የኢሚግሬሽን አገልግሎት) እና የውጭ ሀገር ተማሪዎች እንዴት እንደሚያመለክቱ።"),
        "study-abroad": ("በውጭ ሀገር መማር", "ይፋዊ የውጭ ሀገር ትምህርት ድረ-ገጾች፣ የነፃ ትምህርት ዕድል ሰጪ ተቋማትና የIELTS/TOEFL መረጃዎች።"),
        "learn": ("በኦንላይን መማር", "ከታወቁ ዩኒቨርሲቲዎችና ድርጅቶች የሚሰጡ ነፃና ዝቅተኛ ዋጋ ያላቸው የኦንላይን ኮርሶች።"),
        "resources": ("ምንጮች", "ይፋዊ የኢትዮጵያ የትምህርት ተቋማትና ኤጀንሲዎች፣ እንዲሁም ስታቲስቲክስና ተጨማሪ ንባቦች።"),
        "about": ("ስለ እኛ", "ስለ Study in Ethiopia (SiE)፦ በኢትዮጵያ ስላለው ከፍተኛ ትምህርትና በውጭ ሀገር ስለመማር ነፃ መመሪያ።"),
    },
}

CHROME = {
    "en": {
        "nav": [("institutions.html", "Institutions"), ("programmes.html", "Programmes"), ("apply.html", "How to apply"),
                ("study-abroad.html", "Study abroad"), ("learn.html", "Learn online"), ("resources.html", "Resources"), ("about.html", "About")],
        "skip": "Skip to content", "menu": "Menu", "main_nav": "Main", "lang_label": "Language",
        "tagline": "A free guide to higher education in Ethiopia and to studying abroad. Always confirm admission details with the institution itself.",
        "explore": "Explore", "about_h": "About",
        "explore_links": [("institutions.html", "Universities &amp; colleges"), ("programmes.html", "Find a programme"),
                          ("apply.html", "Study in Ethiopia from abroad"), ("study-abroad.html", "Study abroad"), ("learn.html", "Online courses")],
        "about_links": [("about.html", "About SiE"), ("resources.html", "Official sources")],
        "built_by": "Built by ABGASIM", "dark": "Dark mode", "portal": "Portal",
    },
    "am": {
        "nav": [("institutions.html", "ተቋማት"), ("programmes.html", "ፕሮግራሞች"), ("apply.html", "እንዴት ማመልከት"),
                ("study-abroad.html", "በውጭ ሀገር መማር"), ("learn.html", "በኦንላይን መማር"), ("resources.html", "ምንጮች"), ("about.html", "ስለ እኛ")],
        "skip": "ወደ ዋናው ይዘት ይዝለሉ", "menu": "ማውጫ", "main_nav": "ዋና ማውጫ", "lang_label": "ቋንቋ",
        "tagline": "በኢትዮጵያ ስላለው ከፍተኛ ትምህርትና በውጭ ሀገር ስለመማር ነፃ መመሪያ። የመግቢያ ዝርዝሮችን ሁልጊዜ ከተቋሙ ራሱ ያረጋግጡ።",
        "explore": "ያስሱ", "about_h": "ስለ እኛ",
        "explore_links": [("institutions.html", "ዩኒቨርሲቲዎችና ኮሌጆች"), ("programmes.html", "ፕሮግራም ይፈልጉ"),
                          ("apply.html", "ከውጭ ሀገር መጥተው በኢትዮጵያ ይማሩ"), ("study-abroad.html", "በውጭ ሀገር መማር"), ("learn.html", "የኦንላይን ኮርሶች")],
        "about_links": [("about.html", "ስለ SiE"), ("resources.html", "ይፋዊ ምንጮች")],
        "built_by": "በABGASIM የተሰራ", "dark": "ጨለማ ገጽታ", "portal": "ፖርታል",
    },
}

ICON = {
    "uni": '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 10 12 5l9 5-9 5-9-5Z"/><path d="M7 12v5c0 1 2.2 2.5 5 2.5s5-1.5 5-2.5v-5"/></svg>',
    "globe": '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"/></svg>',
    "laptop": '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="5" width="16" height="11" rx="2"/><path d="M2 19h20"/></svg>',
    "search": '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
}

FONTS = {
    "en": "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Inter:wght@400;500;600;700&display=swap",
    "am": "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Inter:wght@400;500;600;700&family=Noto+Sans+Ethiopic:wght@400;500;600;700&family=Noto+Serif+Ethiopic:wght@600&display=swap",
}


def page_url(lang, page):
    d = LANGS[lang]["dir"]
    return f"{DOMAIN}/{d + '/' if d else ''}{page}.html" if page != "index" else f"{DOMAIN}/{d + '/' if d else ''}"


def build(lang, page):
    c, d = CHROME[lang], LANGS[lang]["dir"]
    up = "../" if d else ""  # path from this page to the site root
    title, desc = PAGE_META[lang][page]
    full_title = title if page == "index" else f"{title} · Study in Ethiopia"
    data_page, needs_data = PAGE_JS[page]

    body = open(os.path.join(PAGES_DIR, lang, page + ".html"), encoding="utf-8").read().rstrip("\n")
    body = re.sub(r"\{\{icon:(\w+)\}\}", lambda m: ICON[m.group(1)], body)
    if up:  # pages in a sub-folder reach shared files one level up
        body = re.sub(r'(src|href)="assets/', rf'\1="{up}assets/', body)
        body = body.replace('href="admin.html"', f'href="{up}admin.html"')

    nav = "\n".join(f'        <a href="{h}"{" aria-current=\"page\"" if h == page + ".html" else ""}>{t}</a>' for h, t in c["nav"])
    explore = "\n".join(f'            <li><a href="{h}">{t}</a></li>' for h, t in c["explore_links"])
    about = "\n".join(f'            <li><a href="{h}">{t}</a></li>' for h, t in c["about_links"])

    # Language switch: link to the same page in each other language
    switch = []
    for other, info in LANGS.items():
        if other == lang:
            continue
        od = info["dir"]
        href = (f"{up}{od + '/' if od else ''}{page}.html")
        switch.append(f'<a class="lang-switch" href="{href}" hreflang="{info["html_lang"]}" lang="{info["html_lang"]}" data-lang-link>{info["name"]}</a>')
    alternates = "\n".join(f'  <link rel="alternate" hreflang="{info["html_lang"]}" href="{page_url(l, page)}">' for l, info in LANGS.items())

    scripts = f'\n  <script src="{up}assets/data.js"></script>' if needs_data else ""
    scripts += f'\n  <script src="{up}assets/app.js"></script>'

    return f'''<!doctype html>
<html lang="{LANGS[lang]["html_lang"]}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{full_title}</title>
  <meta name="description" content="{desc}">
  <link rel="canonical" href="{page_url(lang, page)}">
{alternates}
  <link rel="alternate" hreflang="x-default" href="{page_url("en", page)}">
  <link rel="icon" href="{up}favicon.ico">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="{FONTS.get(lang, FONTS["en"])}" rel="stylesheet">
  <link rel="stylesheet" href="{up}assets/style.css">
  <script>try{{var t=localStorage.getItem("sie-theme");if(t)document.documentElement.dataset.theme=t}}catch(e){{}}</script>
</head>
<body data-page="{data_page}">
  <a class="skip" href="#main">{c["skip"]}</a>
  <div class="stripe"></div>
  <header class="site-header">
    <div class="wrap">
      <a class="brand" href="index.html"><span class="brand-mark">SiE</span>Study in Ethiopia</a>
      <nav class="nav" id="nav" aria-label="{c["main_nav"]}">
{nav}
      </nav>
      <span class="lang-switches" aria-label="{c["lang_label"]}">{"".join(switch)}</span>
      <button class="menu-btn" aria-expanded="false" aria-controls="nav" aria-label="{c["menu"]}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
      </button>
    </div>
  </header>

  <main id="main">
{body}
  </main>

  <footer class="site-footer">
    <div class="wrap">
      <div class="cols">
        <div>
          <a class="brand" href="index.html"><span class="brand-mark">SiE</span>Study in Ethiopia</a>
          <p style="margin-top:12px;max-width:34em">{c["tagline"]}</p>
        </div>
        <div>
          <h4>{c["explore"]}</h4>
          <ul>
{explore}
          </ul>
        </div>
        <div>
          <h4>{c["about_h"]}</h4>
          <ul>
{about}
            <li><a href="https://abgasim.com/" target="_blank" rel="noopener">{c["built_by"]}</a></li>
          </ul>
        </div>
      </div>
      <div class="legal">
        <span>&copy; <span id="year">2026</span> Study in Ethiopia (SiE)</span>
        <span class="legal-actions">
          <button class="theme-btn" id="theme-btn" type="button">{c["dark"]}</button>
          <a class="portal-link" href="{up}admin.html">{c["portal"]}</a>
        </span>
      </div>
    </div>
  </footer>
{scripts}
</body>
</html>
'''


def main():
    written = 0
    for lang, info in LANGS.items():
        out_dir = os.path.join(SITE, info["dir"]) if info["dir"] else SITE
        os.makedirs(out_dir, exist_ok=True)
        for page in PAGES:
            src = os.path.join(PAGES_DIR, lang, page + ".html")
            if not os.path.exists(src):
                print(f"  ! missing {lang}/{page}.html, skipped")
                continue
            with open(os.path.join(out_dir, page + ".html"), "w", encoding="utf-8", newline="\n") as f:
                f.write(build(lang, page))
            written += 1
    print(f"Wrote {written} pages.")


if __name__ == "__main__":
    main()

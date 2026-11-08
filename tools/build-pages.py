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
FACEBOOK = "https://www.facebook.com/studyinethiopia"
SHARE_IMAGE = DOMAIN + "/assets/img/student-reading.jpg"  # 854x640, used for link previews
OG_LOCALE = {"en": "en_US", "am": "am_ET", "om": "om_ET", "ti": "ti_ET"}

# dir: output folder under site/ ("" = site root). name: shown in the language switch.
LANGS = {
    "en": {"dir": "", "name": "English", "html_lang": "en"},
    "am": {"dir": "am", "name": "አማርኛ", "html_lang": "am"},
    "om": {"dir": "om", "name": "Afaan Oromoo", "html_lang": "om"},
    "ti": {"dir": "ti", "name": "ትግርኛ", "html_lang": "ti"},
}

PAGES = ["index", "institutions", "institution", "programmes", "apply", "study-abroad", "learn", "resources", "about"]
# page -> (data-page used by app.js, which data it needs)
#   "full": everything in data.js, including the programme list
#   "core": everything except the programme list (smaller and faster; only programme counts)
#   None:   no data
# Locally every page loads data.js; at deploy, tools/split-data.mjs swaps in data-core.js / programmes.js.
PAGE_JS = {
    "index": ("home", "core"), "institutions": ("institutions", "full"), "institution": ("institution", "full"),
    "programmes": ("programmes", "full"), "apply": ("apply", None), "study-abroad": ("abroad", "core"),
    "learn": ("learn", "core"), "resources": ("resources", "core"), "about": ("about", None),
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
    "om": {
        "index": ("Study in Ethiopia · Itoophiyaatti Baradhaa", "Yuunivarsiitiiwwanii fi kolleejjota Itoophiyaa, sagantaalee barnootaa, carraa biyya alaatti barachuu fi koorsiiwwan interneetii bilisaa argadhaa."),
        "institutions": ("Yuunivarsiitiiwwanii fi kolleejjota", "Galmee yuunivarsiitiiwwanii fi kolleejjota mootummaa fi dhuunfaa Itoophiyaa."),
        "institution": ("Dhaabbata", "Ibsa, kolleejjotaa fi sagantaalee dhaabbata barnoota olaanaa Itoophiyaa, maddoota isaanii wajjin."),
        "programmes": ("Sagantaa barbaadi", "Sagantaalee barnootaa yuunivarsiitiiwwanii fi kolleejjota Itoophiyaa sadarkaan, damee fi naannoon barbaadaa."),
        "apply": ("Biyya alaa dhuftanii Itoophiyaatti barachuu", "Barnoonni olaanaan Itoophiyaa akkamitti akka bulfamu fi barattoonni biyya alaa akkamitti akka iyyatan."),
        "study-abroad": ("Biyya alaatti barachuu", "Marsariitiiwwan barnoota biyya alaa mootummaa, dhaabbilee carraa barnootaa kennanii fi IELTS/TOEFL."),
        "learn": ("Interneetiin barachuu", "Koorsiiwwan interneetii bilisaa fi gatii xiqqaa yuunivarsiitiiwwan beekamoo irraa."),
        "resources": ("Maddoota", "Ministeerota fi ejjansiiwwan barnoota Itoophiyaa, akkasumas istaatiksii fi dubbisa dabalataa."),
        "about": ("Waa'ee keenya", "Waa'ee Study in Ethiopia (SiE): qajeelfama bilisaa barnoota olaanaa Itoophiyaa fi biyya alaatti barachuu."),
    },
    "ti": {
        "index": ("Study in Ethiopia · ኣብ ኢትዮጵያ ተማሃሩ", "ዩኒቨርሲቲታትን ኮሌጃትን ኢትዮጵያ፣ ፕሮግራማት ትምህርቲ፣ ዕድላት ኣብ ወጻኢ ምምሃርን ናጻ ኮርሳት ኦንላይንን ርከቡ።"),
        "institutions": ("ዩኒቨርሲቲታትን ኮሌጃትን", "ዝርዝር ናይ መንግስትን ብሕትን ዩኒቨርሲቲታትን ኮሌጃትን ኢትዮጵያ።"),
        "institution": ("ትካል", "መግለጺ፣ ኮሌጃትን ፕሮግራማትን ናይ ላዕለዋይ ትምህርቲ ትካል ምስ ምንጭታቶም።"),
        "programmes": ("ፕሮግራም ድለዩ", "ኣብ ዩኒቨርሲቲታትን ኮሌጃትን ኢትዮጵያ ዝወሃቡ ፕሮግራማት ትምህርቲ ብደረጃ፣ ብዓውድን ብክልልን ድለዩ።"),
        "apply": ("ካብ ወጻኢ መጺኹም ኣብ ኢትዮጵያ ተማሃሩ", "ላዕለዋይ ትምህርቲ ኢትዮጵያ ብኸመይ ከም ዝመሓደርን ተማሃሮ ወጻኢ ብኸመይ ከም ዝምልከቱን።"),
        "study-abroad": ("ኣብ ወጻኢ ምምሃር", "ወግዓዊ መርበባት ሓበሬታ ትምህርቲ ወጻኢ፣ ናጻ ዕድል ትምህርቲ ዝህቡ ትካላትን IELTS/TOEFLን።"),
        "learn": ("ብኦንላይን ምምሃር", "ካብ ፍሉጣት ዩኒቨርሲቲታትን ትካላትን ዝወሃቡ ናጻን ትሑት ዋጋ ዘለዎምን ናይ ኦንላይን ኮርሳት።"),
        "resources": ("ምንጭታት", "ወግዓውያን ትካላትን ኤጀንሲታትን ትምህርቲ ኢትዮጵያ፣ ከምኡውን ስታቲስቲክስን ተወሳኺ ንባባትን።"),
        "about": ("ብዛዕባና", "ብዛዕባ Study in Ethiopia (SiE)፦ ብዛዕባ ላዕለዋይ ትምህርቲ ኢትዮጵያን ኣብ ወጻኢ ምምሃርን ናጻ መምርሒ።"),
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
        "facebook": "Facebook", "built_by": "Built by ABGASIM", "dark": "Dark mode", "portal": "Portal",
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
        "facebook": "ፌስቡክ", "built_by": "በABGASIM የተሰራ", "dark": "ጨለማ ገጽታ", "portal": "ፖርታል",
        "note": "ይህ ትርጉም አዲስ ነው። ስህተት ካዩ ያሳውቁን።",
    },
    "om": {
        "nav": [("institutions.html", "Dhaabbilee"), ("programmes.html", "Sagantaalee"), ("apply.html", "Iyyannoo"),
                ("study-abroad.html", "Biyya alaa"), ("learn.html", "Interneetiin"), ("resources.html", "Maddoota"), ("about.html", "Waa'ee keenya")],
        "skip": "Gara qabiyyee ijootti darbi", "menu": "Baafata", "main_nav": "Baafata ijoo", "lang_label": "Afaan",
        "tagline": "Qajeelfama bilisaa barnoota olaanaa Itoophiyaa fi biyya alaatti barachuu irratti. Odeeffannoo galmee yeroo hunda dhaabbata sana irraa mirkaneeffadhaa.",
        "explore": "Daawwadhaa", "about_h": "Waa'ee keenya",
        "explore_links": [("institutions.html", "Yuunivarsiitiiwwanii fi kolleejjota"), ("programmes.html", "Sagantaa barbaadi"),
                          ("apply.html", "Biyya alaa dhuftanii Itoophiyaatti barachuu"), ("study-abroad.html", "Biyya alaatti barachuu"), ("learn.html", "Koorsiiwwan interneetii")],
        "about_links": [("about.html", "Waa'ee SiE"), ("resources.html", "Maddoota mootummaa")],
        "facebook": "Feesbuukii", "built_by": "ABGASIM'n kan ijaarame", "dark": "Haala dukkanaa", "portal": "Poortaalii",
        "note": "Hiikkaan kun haaraa dha. Dogoggora yoo argitan nutti himaa.",
    },
    "ti": {
        "nav": [("institutions.html", "ትካላት"), ("programmes.html", "ፕሮግራማት"), ("apply.html", "ከመይ ትምልከቱ"),
                ("study-abroad.html", "ኣብ ወጻኢ ምምሃር"), ("learn.html", "ብኦንላይን ምምሃር"), ("resources.html", "ምንጭታት"), ("about.html", "ብዛዕባና")],
        "skip": "ናብ ቀንዲ ትሕዝቶ ሕለፉ", "menu": "ዝርዝር", "main_nav": "ቀንዲ ዝርዝር", "lang_label": "ቋንቋ",
        "tagline": "ብዛዕባ ላዕለዋይ ትምህርቲ ኣብ ኢትዮጵያን ኣብ ወጻኢ ምምሃርን ናጻ መምርሒ። ዝርዝር ምእታው ኩሉ ግዜ ካብቲ ትካል ባዕሉ ኣረጋግጹ።",
        "explore": "ዳህስሱ", "about_h": "ብዛዕባና",
        "explore_links": [("institutions.html", "ዩኒቨርሲቲታትን ኮሌጃትን"), ("programmes.html", "ፕሮግራም ድለዩ"),
                          ("apply.html", "ካብ ወጻኢ መጺኹም ኣብ ኢትዮጵያ ተማሃሩ"), ("study-abroad.html", "ኣብ ወጻኢ ምምሃር"), ("learn.html", "ናይ ኦንላይን ኮርሳት")],
        "about_links": [("about.html", "ብዛዕባ SiE"), ("resources.html", "ወግዓውያን ምንጭታት")],
        "facebook": "ፌስቡክ", "built_by": "ብABGASIM ዝተሰርሐ", "dark": "ጸልማት ገጽ", "portal": "ፖርታል",
        "note": "እዚ ትርጉም ሓድሽ እዩ። ጌጋ እንተረኺብኩም ሓብሩና።",
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
FONTS["ti"] = FONTS["am"]  # Tigrinya is written in Ge'ez script too; Afaan Oromo (Qubee) uses the English fonts


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

    # Language menu: the same page in every language (a <details> menu, works without JavaScript)
    items = []
    for other, info in LANGS.items():
        od = info["dir"]
        href = f"{up}{od + '/' if od else ''}{page}.html"
        if other == lang:
            items.append(f'<li><a href="{href}" aria-current="true" lang="{info["html_lang"]}">{info["name"]}</a></li>')
        else:
            items.append(f'<li><a href="{href}" hreflang="{info["html_lang"]}" lang="{info["html_lang"]}" data-lang-link>{info["name"]}</a></li>')
    globe = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"/></svg>'
    lang_menu = (f'<details class="lang-menu"><summary aria-label="{c["lang_label"]}: {LANGS[lang]["name"]}">{globe}<span class="lang-full">{LANGS[lang]["name"]}</span><span class="lang-code">{lang.upper()}</span></summary>'
                 f'<ul>{"".join(items)}</ul></details>')
    note = f'\n  <div class="lang-note"><div class="wrap">{c["note"]}</div></div>' if c.get("note") else ""
    alternates = "\n".join(f'  <link rel="alternate" hreflang="{info["html_lang"]}" href="{page_url(l, page)}">' for l, info in LANGS.items())
    # Institution profiles are one page per ?id=; app.js adds the canonical link for the id shown
    # (a static one here would point every profile at the same address).
    canonical = "" if page == "institution" else f'  <link rel="canonical" href="{page_url(lang, page)}">\n'

    scripts = f'\n  <script src="{up}assets/data.js" data-split="{needs_data}"></script>' if needs_data else ""
    scripts += f'\n  <script src="{up}assets/app.js"></script>'

    return f'''<!doctype html>
<html lang="{LANGS[lang]["html_lang"]}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{full_title}</title>
  <meta name="description" content="{desc}">
{canonical}  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Study in Ethiopia">
  <meta property="og:title" content="{full_title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:url" content="{page_url(lang, page)}">
  <meta property="og:image" content="{SHARE_IMAGE}">
  <meta property="og:image:width" content="854">
  <meta property="og:image:height" content="640">
  <meta property="og:locale" content="{OG_LOCALE[lang]}">
{chr(10).join(f'  <meta property="og:locale:alternate" content="{OG_LOCALE[l]}">' for l in LANGS if l != lang)}
  <meta name="twitter:card" content="summary_large_image">
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
      {lang_menu}
      <button class="menu-btn" aria-expanded="false" aria-controls="nav" aria-label="{c["menu"]}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
      </button>
    </div>
  </header>{note}

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
            <li><a href="{FACEBOOK}" target="_blank" rel="noopener">{c["facebook"]} ↗</a></li>
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

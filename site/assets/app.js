/* Study in Ethiopia — site script.
   Renders page content from window.SIE_DATA (assets/data.js).
   Each page sets <body data-page="..."> to pick its renderer. */
(function () {
  "use strict";

  const D = window.SIE_DATA || {};
  const $ = (sel, root = document) => root.querySelector(sel);

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const domain = (url) => {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
  };

  const ARROW = '<svg class="arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';

  /* ---------- Language ----------
     Pages set <html lang="...">. English text in this file is the key; other
     languages look it up in I18N, and data labels (levels, regions...) in LABELS.
     To add a language, add a block to both, then build its pages (tools/build-pages.py). */
  const LANG = ["am", "om", "ti"].includes(document.documentElement.lang) ? document.documentElement.lang : "en";
  // Gregorian dates in each language (Ethiopian-calendar locales would otherwise show EC dates)
  const DATE_LOCALE = { en: "en-GB", am: "am-ET-u-ca-gregory", ti: "ti-ET-u-ca-gregory", om: "om-ET-u-ca-gregory" }[LANG];
  // The published site adds a fingerprint (app.js?v=…), so match "app.js" anywhere in the address
  const appScript = document.querySelector('script[src*="assets/app.js"]');
  const ASSETS = appScript ? appScript.getAttribute("src").replace(/app\.js(\?.*)?$/, "") : "assets/";

  const I18N = {
    am: {
      "Light mode": "ብሩህ ገጽታ", "Dark mode": "ጨለማ ገጽታ",
      "All Ethiopia": "መላው ኢትዮጵያ", "All public institutions": "ሁሉም የመንግሥት ተቋማት",
      "{n} programmes": "{n} ፕሮግራሞች",
      "The map couldn't load. Use the region list to browse institutions.": "ካርታው ሊጫን አልቻለም። ተቋማትን ለማየት የክልሎቹን ዝርዝር ይጠቀሙ።",
      "All categories": "ሁሉም ዓይነቶች", "All regions": "ሁሉም ክልሎች", "Any level": "ማንኛውም ደረጃ",
      "Any field": "ማንኛውም ዘርፍ", "Any region": "ማንኛውም ክልል",
      "Est. {y}": "የተመሠረተው እ.ኤ.አ. {y}", "Established {y}": "የተመሠረተው እ.ኤ.አ. {y}",
      "+{n} more": "+{n} ተጨማሪ", "Website ↗": "ድረ-ገጽ ↗", "Public": "የመንግሥት", "Private": "የግል",
      "View {n} programmes →": "{n} ፕሮግራሞችን ይመልከቱ →", "View profile →": "መግለጫውን ይመልከቱ →",
      "{n} of {total} institutions": "ከ{total} ተቋማት {n}", "Clear filters": "ምርጫዎችን ያጽዱ",
      "Programme information has been collected for <strong>{n} of {total}</strong> institutions so far, so level and field filters only find those.":
        "እስካሁን የፕሮግራም መረጃ የተሰበሰበው ከ{total} ተቋማት ለ<strong>{n}</strong> ብቻ ነው፤ ስለዚህ የደረጃና የዘርፍ ምርጫዎች እነዚህን ብቻ ያገኛሉ።",
      "No institutions match these filters.": "ከእነዚህ ምርጫዎች ጋር የሚዛመድ ተቋም የለም።",
      "Try removing a filter, or search for a shorter name such as “AAU” or “Jimma”.": "አንድ ምርጫ ያስወግዱ፣ ወይም እንደ «AAU» ወይም «Jimma» ያለ አጭር ስም በእንግሊዝኛ ይፈልጉ።",
      "Institution not found.": "ተቋሙ አልተገኘም።", "Back to all institutions": "ወደ ሁሉም ተቋማት ይመለሱ",
      "← All institutions": "← ሁሉም ተቋማት", "Undergraduate": "የመጀመሪያ ዲግሪ", "Postgraduate": "ድህረ-ምረቃ",
      "This list is incomplete: it includes only programmes we could confirm on the institution's own pages.":
        "ይህ ዝርዝር ያልተሟላ ነው፦ በተቋሙ ራሱ ገጾች ላይ ያረጋገጥናቸውን ፕሮግራሞች ብቻ ያካትታል።",
      "This list covers most programmes published on the institution's own pages.": "ይህ ዝርዝር በተቋሙ ገጾች ላይ የወጡትን አብዛኞቹን ፕሮግራሞች ያካትታል።",
      "Visit {d} ↗": "{d} ይጎብኙ ↗", "About": "ስለ ተቋሙ", "Programmes": "ፕሮግራሞች",
      "Search programmes": "ፕሮግራሞችን ይፈልጉ", "Search {n} programmes": "ከ{n} ፕሮግራሞች ይፈልጉ (በእንግሊዝኛ)",
      "Filter by level": "በደረጃ ይለዩ", "All levels": "ሁሉም ደረጃዎች",
      "We haven't collected this institution's programmes yet. Check its website for the current list.":
        "የዚህን ተቋም ፕሮግራሞች ገና አልሰበሰብንም። ወቅታዊውን ዝርዝር በድረ-ገጹ ላይ ይመልከቱ።",
      "More about {name}": "ስለ {name} ተጨማሪ", "Accreditation": "እውቅና",
      "Check this institution's programmes in the Education and Training Authority's register before enrolling.":
        "ከመመዝገብዎ በፊት የዚህን ተቋም ፕሮግራሞች በትምህርትና ሥልጠና ባለሥልጣን መዝገብ ውስጥ ያረጋግጡ።",
      "ETA accreditation register ↗": "የETA የእውቅና መዝገብ ↗",
      "Coming from abroad? See how to apply →": "ከውጭ ሀገር ነው የሚመጡት? እንዴት እንደሚያመለክቱ ይመልከቱ →",
      "Programmes offered": "የሚሰጡ ፕሮግራሞች", "As stated by {src}{asOf}.": "በ{src}{asOf} መሠረት።", "the institution": "ተቋሙ",
      "Colleges & institutes": "ኮሌጆችና ኢንስቲትዩቶች", "Sources": "ምንጮች", "(secondary)": "(ሁለተኛ ደረጃ ምንጭ)",
      "Last checked {date}.": "ለመጨረሻ ጊዜ የተረጋገጠው፦ {date}።", "No programmes match.": "የሚዛመድ ፕሮግራም የለም።",
      "Source ↗": "ምንጭ ↗", "Source: {d}": "ምንጭ፦ {d}", "Public & private": "የመንግሥትና የግል",
      "Programme lists come from each institution's own website. So far they cover <strong>{n}</strong> of {total} institutions; more are being added.":
        "የፕሮግራም ዝርዝሮቹ ከእያንዳንዱ ተቋም ድረ-ገጽ የተገኙ ናቸው። እስካሁን ከ{total} ተቋማት <strong>{n}</strong>ን ይሸፍናሉ፤ ተጨማሪ እየተጨመሩ ነው።",
      "{n} programmes · {m} offerings": "{n} ፕሮግራሞች · {m} አቅርቦቶች", "Show more ({n} left)": "ተጨማሪ አሳይ (የቀሩ {n})",
      "Try a broader word, e.g. “Engineering” or “Nursing”, or remove a filter.": "ሰፋ ያለ ቃል በእንግሊዝኛ ይሞክሩ (ለምሳሌ «Engineering» ወይም «Nursing»)፣ ወይም አንድ ምርጫ ያስወግዱ።",
      "Guide on this site": "በዚህ ድረ-ገጽ ያለ መመሪያ", "{name} logo": "{name} አርማ",
      "Test centres in Ethiopia: ": "በኢትዮጵያ የፈተና ማዕከላት፦ ",
      "Names and descriptions are in English.": "የተቋሙ መግለጫና የፕሮግራሞች ስሞች በእንግሊዝኛ ናቸው።",
    },
    om: {
      "Light mode": "Haala ifaa", "Dark mode": "Haala dukkanaa",
      "All Ethiopia": "Itoophiyaa guutuu", "All public institutions": "Dhaabbilee mootummaa hunda",
      "{n} programmes": "sagantaalee {n}",
      "The map couldn't load. Use the region list to browse institutions.": "Kaartaan fe'amuu hin dandeenye. Dhaabbilee ilaaluuf tarree naannolee fayyadamaa.",
      "All categories": "Gosoota hunda", "All regions": "Naannolee hunda", "Any level": "Sadarkaa kamiyyuu",
      "Any field": "Damee kamiyyuu", "Any region": "Naannoo kamiyyuu",
      "Est. {y}": "Bara {y} hundeeffame", "Established {y}": "Bara {y} hundeeffame",
      "+{n} more": "+{n} dabalataa", "Website ↗": "Marsariitii ↗", "Public": "Mootummaa", "Private": "Dhuunfaa",
      "View {n} programmes →": "Sagantaalee {n} ilaali →", "View profile →": "Ibsa ilaali →",
      "{n} of {total} institutions": "Dhaabbilee {total} keessaa {n}", "Clear filters": "Filannoo haqi",
      "Programme information has been collected for <strong>{n} of {total}</strong> institutions so far, so level and field filters only find those.":
        "Hanga ammaatti odeeffannoon sagantaa dhaabbilee {total} keessaa <strong>{n}</strong> qofaaf walitti qabameera; kanaaf filannoon sadarkaa fi damee isaan kana qofa argata.",
      "No institutions match these filters.": "Dhaabbanni filannoo kana wajjin walsimu hin jiru.",
      "Try removing a filter, or search for a shorter name such as “AAU” or “Jimma”.": "Filannoo tokko haqaa, yookaan maqaa gabaabaa kan akka “AAU” ykn “Jimma” Afaan Ingiliziitiin barbaadaa.",
      "Institution not found.": "Dhaabbanni hin argamne.", "Back to all institutions": "Gara dhaabbilee hundaatti deebi'i",
      "← All institutions": "← Dhaabbilee hunda", "Undergraduate": "Digirii jalqabaa", "Postgraduate": "Digirii booda",
      "This list is incomplete: it includes only programmes we could confirm on the institution's own pages.":
        "Tarreen kun guutuu miti: sagantaalee fuula dhaabbatichaa irratti mirkaneessuu dandeenye qofa qabata.",
      "This list covers most programmes published on the institution's own pages.": "Tarreen kun sagantaalee fuula dhaabbatichaa irratti maxxanfaman baay'ee isaanii qabata.",
      "Visit {d} ↗": "{d} daawwadhu ↗", "About": "Waa'ee dhaabbatichaa", "Programmes": "Sagantaalee",
      "Search programmes": "Sagantaalee barbaadi", "Search {n} programmes": "Sagantaalee {n} keessaa barbaadi (Afaan Ingiliziitiin)",
      "Filter by level": "Sadarkaan calaqi", "All levels": "Sadarkaalee hunda",
      "We haven't collected this institution's programmes yet. Check its website for the current list.":
        "Sagantaalee dhaabbata kanaa ammallee hin sassaabne. Tarree yeroo ammaa marsariitii isaa irratti ilaalaa.",
      "More about {name}": "Waa'ee {name} dabalataan", "Accreditation": "Beekamtii (akrediteeshinii)",
      "Check this institution's programmes in the Education and Training Authority's register before enrolling.":
        "Osoo hin galmaa'in dura sagantaalee dhaabbata kanaa galmee Abbaa Taayitaa Barnootaa fi Leenjii keessatti mirkaneeffadhaa.",
      "ETA accreditation register ↗": "Galmee beekamtii ETA ↗",
      "Coming from abroad? See how to apply →": "Biyya alaa dhuftu? Akkamitti akka iyyattan ilaalaa →",
      "Programmes offered": "Sagantaalee kennaman", "As stated by {src}{asOf}.": "Akka {src}{asOf} ibsetti.", "the institution": "dhaabbatichi",
      "Colleges & institutes": "Kolleejjotaa fi inistiitiyuutota", "Sources": "Maddoota", "(secondary)": "(madda lammaffaa)",
      "Last checked {date}.": "Yeroo dhumaaf kan mirkanaa'e: {date}.", "No programmes match.": "Sagantaan walsimu hin jiru.",
      "Source ↗": "Madda ↗", "Source: {d}": "Madda: {d}", "Public & private": "Mootummaa fi dhuunfaa",
      "Programme lists come from each institution's own website. So far they cover <strong>{n}</strong> of {total} institutions; more are being added.":
        "Tarreen sagantaalee marsariitii tokkoon tokkoon dhaabbilee irraa argame. Hanga ammaatti dhaabbilee {total} keessaa <strong>{n}</strong> qabata; kan biroon itti dabalamaa jira.",
      "{n} programmes · {m} offerings": "Sagantaalee {n} · dhiyeessii {m}", "Show more ({n} left)": "Dabalataan agarsiisi ({n} hafe)",
      "Try a broader word, e.g. “Engineering” or “Nursing”, or remove a filter.": "Jecha bal'aa Afaan Ingiliziitiin yaalaa (fkn. “Engineering” ykn “Nursing”), yookaan filannoo tokko haqaa.",
      "Guide on this site": "Qajeelfama marsariitii kana irra jiru", "{name} logo": "Asxaa {name}",
      "Test centres in Ethiopia: ": "Giddugala qormaataa Itoophiyaa: ",
      "Names and descriptions are in English.": "Ibsi dhaabbatichaa fi maqaaleen sagantaalee Afaan Ingiliziitiin.",
    },
    ti: {
      "Light mode": "ብሩህ ገጽ", "Dark mode": "ጸልማት ገጽ",
      "All Ethiopia": "መላእ ኢትዮጵያ", "All public institutions": "ኩሎም ናይ መንግስቲ ትካላት",
      "{n} programmes": "{n} ፕሮግራማት",
      "The map couldn't load. Use the region list to browse institutions.": "እቲ ካርታ ክጽዓን ኣይከኣለን። ትካላት ንምርኣይ ዝርዝር ክልላት ተጠቐሙ።",
      "All categories": "ኩሎም ዓይነታት", "All regions": "ኩሎም ክልላት", "Any level": "ዝኾነ ደረጃ",
      "Any field": "ዝኾነ ዓውዲ", "Any region": "ዝኾነ ክልል",
      "Est. {y}": "ዝተመስረተ ብ{y} (ብፈረንጂ)", "Established {y}": "ዝተመስረተ ብ{y} (ብፈረንጂ)",
      "+{n} more": "+{n} ተወሳኺ", "Website ↗": "መርበብ ሓበሬታ ↗", "Public": "ናይ መንግስቲ", "Private": "ብሕቲ",
      "View {n} programmes →": "{n} ፕሮግራማት ርኣዩ →", "View profile →": "መግለጺ ርኣዩ →",
      "{n} of {total} institutions": "ካብ {total} ትካላት {n}", "Clear filters": "ምርጫታት ኣጽርዩ",
      "Programme information has been collected for <strong>{n} of {total}</strong> institutions so far, so level and field filters only find those.":
        "ክሳብ ሕጂ ሓበሬታ ፕሮግራማት ዝተኣከበ ካብ {total} ትካላት ን<strong>{n}</strong> ጥራይ እዩ፤ ስለዚ ምርጫታት ደረጃን ዓውድን ነዚኦም ጥራይ ይረኽቡ።",
      "No institutions match these filters.": "ምስዞም ምርጫታት ዝሰማማዕ ትካል የለን።",
      "Try removing a filter, or search for a shorter name such as “AAU” or “Jimma”.": "ሓደ ምርጫ ኣልግሱ፣ ወይ ከም «AAU» ወይ «Jimma» ዝኣመሰለ ሓጺር ስም ብእንግሊዝኛ ድለዩ።",
      "Institution not found.": "እቲ ትካል ኣይተረኽበን።", "Back to all institutions": "ናብ ኩሎም ትካላት ተመለሱ",
      "← All institutions": "← ኩሎም ትካላት", "Undergraduate": "ቀዳማይ ዲግሪ", "Postgraduate": "ድሕረ-ምረቓ",
      "This list is incomplete: it includes only programmes we could confirm on the institution's own pages.":
        "እዚ ዝርዝር ምሉእ ኣይኮነን፦ ኣብ ገጻት እቲ ትካል ዘረጋገጽናዮም ፕሮግራማት ጥራይ የጠቓልል።",
      "This list covers most programmes published on the institution's own pages.": "እዚ ዝርዝር ኣብ ገጻት እቲ ትካል ዝተዘርግሑ መብዛሕትኦም ፕሮግራማት የጠቓልል።",
      "Visit {d} ↗": "{d} ብጽሑ ↗", "About": "ብዛዕባ እቲ ትካል", "Programmes": "ፕሮግራማት",
      "Search programmes": "ፕሮግራማት ድለዩ", "Search {n} programmes": "ካብ {n} ፕሮግራማት ድለዩ (ብእንግሊዝኛ)",
      "Filter by level": "ብደረጃ ፈልዩ", "All levels": "ኩሎም ደረጃታት",
      "We haven't collected this institution's programmes yet. Check its website for the current list.":
        "ፕሮግራማት እዚ ትካል ገና ኣይኣከብናን። ናይ ሕጂ ዝርዝር ኣብ መርበብ ሓበሬታኡ ርኣዩ።",
      "More about {name}": "ተወሳኺ ብዛዕባ {name}", "Accreditation": "ተቐባልነት (ኣክሬዲቴሽን)",
      "Check this institution's programmes in the Education and Training Authority's register before enrolling.":
        "ቅድሚ ምምዝጋብኩም ፕሮግራማት እዚ ትካል ኣብ መዝገብ ስልጣን ትምህርትን ስልጠናን ኣረጋግጹ።",
      "ETA accreditation register ↗": "መዝገብ ተቐባልነት ETA ↗",
      "Coming from abroad? See how to apply →": "ካብ ወጻኢ ዲኹም እትመጹ? ከመይ ከም እትምልከቱ ርኣዩ →",
      "Programmes offered": "ዝወሃቡ ፕሮግራማት", "As stated by {src}{asOf}.": "ከምቲ {src}{asOf} ዝገለጾ።", "the institution": "እቲ ትካል",
      "Colleges & institutes": "ኮሌጃትን ኢንስቲትዩታትን", "Sources": "ምንጭታት", "(secondary)": "(ካልኣይ ደረጃ ምንጪ)",
      "Last checked {date}.": "ንመወዳእታ ግዜ ዝተረጋገጸ፦ {date}።", "No programmes match.": "ዝሰማማዕ ፕሮግራም የለን።",
      "Source ↗": "ምንጪ ↗", "Source: {d}": "ምንጪ፦ {d}", "Public & private": "ናይ መንግስትን ብሕትን",
      "Programme lists come from each institution's own website. So far they cover <strong>{n}</strong> of {total} institutions; more are being added.":
        "ዝርዝራት ፕሮግራማት ካብ መርበብ ሓበሬታ ነፍሲ-ወከፍ ትካል ዝተረኽቡ እዮም። ክሳብ ሕጂ ካብ {total} ትካላት <strong>{n}</strong> የጠቓልሉ፤ ተወሰኽቲ ይውሰኹ ኣለዉ።",
      "{n} programmes · {m} offerings": "{n} ፕሮግራማት · {m} ኣቕርቦታት", "Show more ({n} left)": "ተወሳኺ ኣርእዩ ({n} ተሪፎም)",
      "Try a broader word, e.g. “Engineering” or “Nursing”, or remove a filter.": "ሰፊሕ ቃል ብእንግሊዝኛ ፈትኑ (ንኣብነት «Engineering» ወይ «Nursing»)፣ ወይ ሓደ ምርጫ ኣልግሱ።",
      "Guide on this site": "ኣብዚ መርበብ ዘሎ መምርሒ", "{name} logo": "ኣርማ {name}",
      "Test centres in Ethiopia: ": "ማእከላት ፈተና ኣብ ኢትዮጵያ፦ ",
      "Names and descriptions are in English.": "መግለጺ እቲ ትካልን ኣስማት ፕሮግራማትን ብእንግሊዝኛ እዮም።",
    },
  };

  const LABELS = {
    am: {
      level: { "Certificate": "ሰርተፍኬት", "Diploma": "ዲፕሎማ", "Bachelor's": "የመጀመሪያ ዲግሪ", "Master's": "ሁለተኛ ዲግሪ", "PhD": "ሦስተኛ ዲግሪ (PhD)", "Specialty": "ስፔሻሊቲ" },
      category: { "University": "ዩኒቨርሲቲ", "University College": "ዩኒቨርሲቲ ኮሌጅ", "College": "ኮሌጅ", "Institute": "ኢንስቲትዩት", "Polytechnic / TVET": "ፖሊቴክኒክ / ቴክኒክና ሙያ" },
      field: {
        "Agriculture & Environment": "ግብርናና አካባቢ", "Arts & Design": "ሥነ ጥበብና ዲዛይን", "Business & Economics": "ቢዝነስና ኢኮኖሚክስ",
        "Computing, Data & IT": "ኮምፒውቲንግ፣ ዳታና አይቲ", "Education": "ትምህርትና መምህርነት", "Engineering & Technology": "ምህንድስናና ቴክኖሎጂ",
        "Health & Medicine": "ጤናና ሕክምና", "Languages & Communication": "ቋንቋና ኮሙኒኬሽን", "Law & Governance": "ሕግና አስተዳደር",
        "Natural Sciences": "የተፈጥሮ ሳይንስ", "Social Sciences & Humanities": "ማኅበራዊ ሳይንስና ሰብዓዊ ትምህርቶች",
        "Sport Science": "ስፖርት ሳይንስ", "Veterinary Science": "የእንስሳት ሕክምና",
      },
      region: {
        "Addis Ababa": "አዲስ አበባ", "Afar": "አፋር", "Amhara": "አማራ", "Benishangul-Gumuz": "ቤኒሻንጉል ጉሙዝ",
        "Central Ethiopia": "ማዕከላዊ ኢትዮጵያ", "Dire Dawa": "ድሬዳዋ", "Gambela": "ጋምቤላ", "Harari": "ሐረሪ", "Oromia": "ኦሮሚያ",
        "Sidama": "ሲዳማ", "Somali": "ሶማሌ", "South Ethiopia": "ደቡብ ኢትዮጵያ", "South West Ethiopia Peoples": "ደቡብ ምዕራብ ኢትዮጵያ ሕዝቦች", "Tigray": "ትግራይ",
      },
    },
    om: {
      level: { "Certificate": "Sartiifikeetii", "Diploma": "Diploomaa", "Bachelor's": "Digirii jalqabaa", "Master's": "Digirii lammaffaa", "PhD": "Digirii sadaffaa (PhD)", "Specialty": "Ispeeshaalitii" },
      category: { "University": "Yuunivarsiitii", "University College": "Kolleejjii Yuunivarsiitii", "College": "Kolleejjii", "Institute": "Inistiitiyuutii", "Polytechnic / TVET": "Poolii-teeknikii / TVET" },
      field: {
        "Agriculture & Environment": "Qonnaa fi naannoo", "Arts & Design": "Aartii fi dizaayinii", "Business & Economics": "Daldalaa fi diinagdee",
        "Computing, Data & IT": "Kompiitara, daataa fi IT", "Education": "Barnootaa fi barsiisummaa", "Engineering & Technology": "Injinariingii fi teeknooloojii",
        "Health & Medicine": "Fayyaa fi yaala", "Languages & Communication": "Afaanii fi qunnamtii", "Law & Governance": "Seeraa fi bulchiinsa",
        "Natural Sciences": "Saayinsii uumamaa", "Social Sciences & Humanities": "Saayinsii hawaasaa fi namoomaa",
        "Sport Science": "Saayinsii ispoortii", "Veterinary Science": "Yaala horii",
      },
      region: {
        "Addis Ababa": "Finfinnee", "Afar": "Affaar", "Amhara": "Amaaraa", "Benishangul-Gumuz": "Beenishaangul Gumuz",
        "Central Ethiopia": "Itoophiyaa Giddugaleessaa", "Dire Dawa": "Dirree Dhawaa", "Gambela": "Gambeellaa", "Harari": "Hararii", "Oromia": "Oromiyaa",
        "Sidama": "Sidaamaa", "Somali": "Somaalee", "South Ethiopia": "Itoophiyaa Kibbaa", "South West Ethiopia Peoples": "Uummattoota Kibba Lixa Itoophiyaa", "Tigray": "Tigraay",
      },
    },
    ti: {
      level: { "Certificate": "ሰርቲፊኬት", "Diploma": "ዲፕሎማ", "Bachelor's": "ቀዳማይ ዲግሪ", "Master's": "ካልኣይ ዲግሪ", "PhD": "ሳልሳይ ዲግሪ (PhD)", "Specialty": "ስፐሻሊቲ" },
      category: { "University": "ዩኒቨርሲቲ", "University College": "ዩኒቨርሲቲ ኮሌጅ", "College": "ኮሌጅ", "Institute": "ኢንስቲትዩት", "Polytechnic / TVET": "ፖሊቴክኒክ / ቴክኒክን ሞያን" },
      field: {
        "Agriculture & Environment": "ሕርሻን ከባቢን", "Arts & Design": "ስነ-ጥበብን ዲዛይንን", "Business & Economics": "ንግድን ቁጠባን",
        "Computing, Data & IT": "ኮምፒዩቲንግ፣ ዳታን ኣይቲን", "Education": "ትምህርትን መምህርነትን", "Engineering & Technology": "ምህንድስናን ቴክኖሎጂን",
        "Health & Medicine": "ጥዕናን ሕክምናን", "Languages & Communication": "ቋንቋን ርክብን", "Law & Governance": "ሕግን ምምሕዳርን",
        "Natural Sciences": "ተፈጥሮኣዊ ሳይንስ", "Social Sciences & Humanities": "ማሕበራዊ ሳይንስን ሰብኣዊ ትምህርትን",
        "Sport Science": "ሳይንስ ስፖርት", "Veterinary Science": "ሕክምና እንስሳ",
      },
      region: {
        "Addis Ababa": "ኣዲስ ኣበባ", "Afar": "ዓፋር", "Amhara": "ኣምሓራ", "Benishangul-Gumuz": "ቤኒሻንጉል ጉሙዝ",
        "Central Ethiopia": "ማእከላይ ኢትዮጵያ", "Dire Dawa": "ድሬዳዋ", "Gambela": "ጋምቤላ", "Harari": "ሓረሪ", "Oromia": "ኦሮምያ",
        "Sidama": "ሲዳማ", "Somali": "ሶማሊ", "South Ethiopia": "ደቡብ ኢትዮጵያ", "South West Ethiopia Peoples": "ህዝብታት ደቡብ ምዕራብ ኢትዮጵያ", "Tigray": "ትግራይ",
      },
    },
  };

  // tr("{n} programmes", { n: 5 }) -> translated text with values filled in (values are inserted as given)
  function tr(s, vars) {
    let out = (I18N[LANG] && I18N[LANG][s]) || s;
    if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    return out;
  }
  const lbl = (kind, v) => (LANG !== "en" && v && LABELS[LANG][kind][v]) || v;

  /* ---------- Shared chrome ---------- */

  function initTheme() {
    const root = document.documentElement;
    const btn = $("#theme-btn");
    let saved = null;
    try { saved = localStorage.getItem("sie-theme"); } catch {}
    if (saved) root.dataset.theme = saved;
    if (!btn) return;
    const isDark = () => root.dataset.theme
      ? root.dataset.theme === "dark"
      : matchMedia("(prefers-color-scheme: dark)").matches;
    const label = () => { btn.textContent = isDark() ? tr("Light mode") : tr("Dark mode"); };
    label();
    btn.addEventListener("click", () => {
      root.dataset.theme = isDark() ? "light" : "dark";
      try { localStorage.setItem("sie-theme", root.dataset.theme); } catch {}
      label();
    });
  }

  function initMenu() {
    const btn = $(".menu-btn"), nav = $("#nav");
    if (!btn || !nav) return;
    btn.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
    });
  }

  function initFooter() {
    const y = $("#year");
    if (y) y.textContent = new Date().getFullYear();
  }

  // Language links keep the current profile / filters (?id=..., ?q=...) and #anchor.
  // Filters update the address bar as you type, so refresh the links whenever they change.
  function syncLangLinks() {
    document.querySelectorAll("a[data-lang-link]").forEach((a) => {
      const base = a.getAttribute("href").split(/[?#]/)[0];
      a.setAttribute("href", base + location.search + location.hash);
    });
  }
  const replaceState = history.replaceState.bind(history);
  history.replaceState = (...args) => { replaceState(...args); syncLangLinks(); };
  window.addEventListener("hashchange", syncLangLinks);

  /* ---------- Home ---------- */

  function renderHome() {
    const inst = D.institutions || [];
    const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
    set("#stat-total", inst.length);
    set("#stat-public", inst.filter((i) => i.type === "public").length);
    set("#stat-private", inst.filter((i) => i.type === "private").length);
    set("#stat-abroad", new Set((D.studyAbroad || []).map((s) => s.name)).size);
    set("#stat-programmes", (D.programmes || []).length);

    const links = $("#home-links");
    if (links) links.innerHTML = (D.links || []).slice(0, 6).map(linkCard).join("");

    if ($("#eth-map")) renderMap();
  }

  /* ---------- Map of public institutions (home page) ---------- */

  // Leaflet is loaded only when the map scrolls into view, so it doesn't slow the page down.
  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    const base = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/";
    const css = document.createElement("link");
    css.rel = "stylesheet"; css.href = base + "leaflet.min.css";
    document.head.appendChild(css);
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = base + "leaflet.min.js";
      s.onload = () => resolve(window.L);
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function renderMap() {
    const el = $("#eth-map"), regionList = $("#region-list"), out = $("#region-insts");
    const pinned = (D.institutions || []).filter((i) => i.type === "public" && typeof i.lat === "number");
    // One pin per city: several institutions can share a city (e.g. Addis Ababa)
    const cities = new Map();
    pinned.forEach((i) => {
      const k = i.lat + "," + i.lng;
      if (!cities.has(k)) cities.set(k, { lat: i.lat, lng: i.lng, city: i.city, region: i.region, items: [] });
      cities.get(k).items.push(i);
    });
    const regions = [...countBy(pinned, (i) => i.region)].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    let current = "", map = null;
    const markers = [];

    regionList.innerHTML = `<button type="button" class="chip" data-region="" aria-pressed="true">${tr("All Ethiopia")} <span class="n">${pinned.length}</span></button>` +
      regions.map(([r, n]) => `<button type="button" class="chip" data-region="${esc(r)}" aria-pressed="false">${esc(lbl("region", r))} <span class="n">${n}</span></button>`).join("");

    function listFor(region) {
      const items = pinned.filter((i) => !region || i.region === region).sort((a, b) => a.name.localeCompare(b.name));
      out.innerHTML = `<h3>${esc(region ? lbl("region", region) : tr("All public institutions"))}</h3><ul>${items.map((i) => {
        const n = progsOf(i.id).length;
        return `<li><a href="${profileUrl(i)}">${esc(i.name)}</a><span>${esc(i.city || "")}${n ? ` · ${tr("{n} programmes", { n })}` : ""}</span></li>`;
      }).join("")}</ul>`;
    }

    function popup(c) {
      const region = c.region && c.region !== c.city ? `<span>${esc(lbl("region", c.region))}</span>` : "";
      return `<div class="map-pop"><strong>${esc(c.city)}</strong>${region}<ul>${c.items
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((i) => { const n = progsOf(i.id).length; return `<li><a href="${profileUrl(i)}">${esc(i.name)}</a>${n ? ` <em>${tr("{n} programmes", { n })}</em>` : ""}</li>`; }).join("")}</ul></div>`;
    }

    function select(region) {
      current = region;
      regionList.querySelectorAll("[data-region]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.region === region)));
      listFor(region);
      if (!map) return;
      markers.forEach(({ m, c }) => m.setStyle({ fillOpacity: !region || c.region === region ? 0.85 : 0.15, opacity: !region || c.region === region ? 1 : 0.25 }));
      const pts = [...cities.values()].filter((c) => !region || c.region === region).map((c) => [c.lat, c.lng]);
      if (pts.length) map.flyToBounds(pts, { padding: [40, 40], maxZoom: 9, duration: 0.6 });
    }

    regionList.addEventListener("click", (e) => {
      const b = e.target.closest("[data-region]");
      if (b) select(b.dataset.region);
    });
    listFor("");

    function draw(L) {
      map = L.map(el, { scrollWheelZoom: false, zoomSnap: 0.25, minZoom: 5, maxBounds: [[1.5, 31], [16.5, 49.5]] });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      const accent = getComputedStyle(document.documentElement).getPropertyValue("--green").trim() || "#13633f";
      cities.forEach((c) => {
        const m = L.circleMarker([c.lat, c.lng], {
          radius: 7 + 3 * Math.sqrt(c.items.length - 1), color: "#ffffff", weight: 2, fillColor: accent, fillOpacity: 0.85,
        }).addTo(map);
        m.bindPopup(popup(c));
        m.bindTooltip(c.items.length > 1 ? `${c.city} (${c.items.length})` : c.city, { direction: "top", offset: [0, -6] });
        markers.push({ m, c });
      });
      map.fitBounds([...cities.values()].map((c) => [c.lat, c.lng]), { padding: [30, 30] });
      if (current) select(current);
    }

    const start = () => loadLeaflet().then(draw).catch(() => {
      el.innerHTML = `<p class="map-fail">${tr("The map couldn't load. Use the region list to browse institutions.")}</p>`;
    });
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) { io.disconnect(); start(); }
      }, { rootMargin: "200px" });
      io.observe(el);
    } else start();
  }

  /* ---------- Shared directory helpers ---------- */

  const LEVELS = ["Certificate", "Diploma", "Bachelor's", "Master's", "PhD", "Specialty"];
  const LEVEL_PLURAL = { "Certificate": "Certificates", "Diploma": "Diplomas", "Bachelor's": "Bachelor's", "Master's": "Master's", "PhD": "PhDs", "Specialty": "Specialties" };
  const CATEGORIES = ["University", "University College", "College", "Institute", "Polytechnic / TVET"];
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const instById = new Map((D.institutions || []).map((i) => [i.id, i]));
  const progsBy = new Map();
  (D.programmes || []).forEach((p) => {
    if (!progsBy.has(p.institution)) progsBy.set(p.institution, []);
    progsBy.get(p.institution).push(p);
  });
  const byLevelThenName = (a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.name.localeCompare(b.name);
  progsBy.forEach((l) => l.sort(byLevelThenName));
  const progsOf = (id) => progsBy.get(id) || [];
  const researchedCount = () => [...progsBy.keys()].length;

  const abbrOf = (i) => (i.abbr || i.name.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).map((w) => w[0]).join("")).slice(0, 5);
  const placeOf = (i) => [i.city, i.region && i.region !== i.city ? lbl("region", i.region) : ""].filter(Boolean).join(", ");
  const profileUrl = (i) => `institution.html?id=${encodeURIComponent(i.id)}`;

  function levelSummary(list) {
    const c = {};
    list.forEach((p) => { c[p.level] = (c[p.level] || 0) + 1; });
    return LEVELS.filter((l) => c[l]).map((l) => `<span class="lvl">${c[l]} ${esc(LANG === "en" ? LEVEL_PLURAL[l] : lbl("level", l))}</span>`).join("");
  }

  function options(sel, values, label, current, kind) {
    sel.innerHTML = `<option value="">${esc(label)}</option>` + values.map(([v, n]) =>
      `<option value="${esc(v)}"${v === current ? " selected" : ""}>${esc(kind ? lbl(kind, v) : v)}${n !== undefined ? ` (${n})` : ""}</option>`).join("");
  }
  const countBy = (items, fn) => {
    const m = new Map();
    items.forEach((x) => [].concat(fn(x)).filter(Boolean).forEach((k) => m.set(k, (m.get(k) || 0) + 1)));
    return m;
  };

  /* ---------- Institutions directory ---------- */

  function renderInstitutions() {
    const list = $("#inst-list");
    if (!list) return;
    const all = (D.institutions || []).slice().sort((a, b) => a.name.localeCompare(b.name));
    const input = $("#inst-search");
    const chips = [...document.querySelectorAll("[data-filter]")];
    const count = $("#result-count");
    const az = $("#az");
    const sel = { category: $("#f-category"), region: $("#f-region"), level: $("#f-level"), field: $("#f-field") };

    chips.forEach((c) => {
      const f = c.dataset.filter;
      const n = f === "all" ? all.length : all.filter((i) => i.type === f).length;
      c.insertAdjacentHTML("beforeend", ` <span class="n">${n}</span>`);
    });

    const params = new URLSearchParams(location.search);
    const st = {
      q: params.get("q") || "",
      type: ["public", "private"].includes(params.get("type")) ? params.get("type") : "all",
      category: params.get("category") || "", region: params.get("region") || "",
      level: params.get("level") || "", field: params.get("field") || "",
    };
    input.value = st.q;

    const catCounts = countBy(all, (i) => i.category);
    options(sel.category, CATEGORIES.filter((c) => catCounts.has(c)).map((c) => [c, catCounts.get(c)]), tr("All categories"), st.category, "category");
    const regCounts = countBy(all, (i) => i.region);
    options(sel.region, [...regCounts].sort((a, b) => a[0].localeCompare(b[0])), tr("All regions"), st.region, "region");
    const lvlCounts = countBy(all, (i) => [...new Set(progsOf(i.id).map((p) => p.level))]);
    options(sel.level, LEVELS.filter((l) => lvlCounts.has(l)).map((l) => [l, lvlCounts.get(l)]), tr("Any level"), st.level, "level");
    const fldCounts = countBy(all, (i) => [...new Set(progsOf(i.id).map((p) => p.field))]);
    options(sel.field, [...fldCounts].sort((a, b) => a[0].localeCompare(b[0])), tr("Any field"), st.field, "field");

    function card(i, matches) {
      const progs = progsOf(i.id);
      const summary = i.summary || (i.about && i.about[0]) || "";
      const meta = [placeOf(i), i.founded ? tr("Est. {y}", { y: i.founded }) : ""].filter(Boolean).join(" · ");
      const match = matches.length
        ? `<ul class="matches">${matches.slice(0, 3).map((p) => `<li>${esc(lbl("level", p.level))} · ${esc(p.name)}</li>`).join("")}${matches.length > 3 ? `<li class="more-m">${tr("+{n} more", { n: matches.length - 3 })}</li>` : ""}</ul>` : "";
      const site = i.website ? `<a href="${esc(i.website)}" target="_blank" rel="noopener">${tr("Website ↗")}</a>` : "";
      return `<article class="card inst" data-type="${i.type}">
        <div class="inst-top">
          <div class="mono" aria-hidden="true">${esc(abbrOf(i))}</div>
          <div>
            <h3><a class="stretch" href="${profileUrl(i)}">${esc(i.name)}</a></h3>
            <span class="badge">${tr(i.type === "public" ? "Public" : "Private")}${i.category ? " · " + esc(lbl("category", i.category)) : ""}</span>
            ${meta ? `<div class="meta">${esc(meta)}</div>` : ""}
          </div>
        </div>
        ${summary ? `<p class="summary">${esc(summary)}</p>` : ""}
        ${match}
        ${progs.length ? `<div class="lvls">${levelSummary(progs)}</div>` : ""}
        <div class="inst-actions"><a href="${profileUrl(i)}">${progs.length ? tr("View {n} programmes →", { n: progs.length }) : tr("View profile →")}</a>${site}</div>
      </article>`;
    }

    function draw() {
      const nq = norm(st.q.trim());
      const rows = [];
      all.forEach((i) => {
        if (st.type !== "all" && i.type !== st.type) return;
        if (st.category && i.category !== st.category) return;
        if (st.region && i.region !== st.region) return;
        let progs = progsOf(i.id);
        if (st.level) progs = progs.filter((p) => p.level === st.level);
        if (st.field) progs = progs.filter((p) => p.field === st.field);
        if ((st.level || st.field) && !progs.length) return;
        let matches = [];
        if (nq) {
          const nameHit = norm(i.name).includes(nq) || norm(i.abbr).includes(nq) || norm(i.city).includes(nq);
          matches = progs.filter((p) => norm(p.name).includes(nq));
          if (!nameHit && !matches.length) return;
        } else if (st.level || st.field) matches = [];
        rows.push({ i, matches });
      });

      chips.forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.filter === st.type)));
      const filtered = st.q || st.type !== "all" || st.category || st.region || st.level || st.field;
      count.innerHTML = tr("{n} of {total} institutions", { n: rows.length, total: all.length }) + (filtered ? ` · <button type="button" class="linkish" id="clear">${tr("Clear filters")}</button>` : "");
      $("#coverage-note").hidden = !(st.level || st.field || (nq && rows.some((r) => r.matches.length)));
      $("#coverage-note").innerHTML = tr("Programme information has been collected for <strong>{n} of {total}</strong> institutions so far, so level and field filters only find those.", { n: researchedCount(), total: all.length });

      const groups = new Map();
      rows.forEach((r) => {
        const L = r.i.name[0].toUpperCase();
        if (!groups.has(L)) groups.set(L, []);
        groups.get(L).push(r);
      });
      az.innerHTML = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((L) =>
        groups.has(L) ? `<a href="#letter-${L}">${L}</a>` : `<span aria-hidden="true">${L}</span>`).join("");

      list.innerHTML = rows.length
        ? [...groups].map(([L, items]) =>
            `<h2 class="letter" id="letter-${L}">${L}</h2><div class="grid">${items.map((r) => card(r.i, r.matches)).join("")}</div>`).join("")
        : `<div class="empty"><p><strong>${tr("No institutions match these filters.")}</strong></p><p>${tr("Try removing a filter, or search for a shorter name such as “AAU” or “Jimma”.")}</p></div>`;

      const p = new URLSearchParams();
      Object.entries(st).forEach(([k, v]) => { if (v && !(k === "type" && v === "all")) p.set(k, v); });
      history.replaceState(null, "", p.toString() ? `?${p}` : location.pathname);
    }

    input.addEventListener("input", () => { st.q = input.value; draw(); });
    chips.forEach((c) => c.addEventListener("click", () => { st.type = c.dataset.filter; draw(); }));
    Object.entries(sel).forEach(([k, el]) => el.addEventListener("change", () => { st[k] = el.value; draw(); }));
    count.addEventListener("click", (e) => {
      if (e.target.id !== "clear") return;
      Object.assign(st, { q: "", type: "all", category: "", region: "", level: "", field: "" });
      input.value = ""; Object.values(sel).forEach((s) => { s.value = ""; });
      draw();
    });
    draw();
  }

  /* ---------- Institution profile ---------- */

  function renderInstitution() {
    const root = $("#profile");
    if (!root) return;
    const i = instById.get(new URLSearchParams(location.search).get("id"));
    if (!i) {
      // Keep search engines from indexing the empty "not found" page
      document.head.insertAdjacentHTML("beforeend", '<meta name="robots" content="noindex">');
      root.innerHTML = `<div class="wrap section"><div class="empty"><p><strong>${tr("Institution not found.")}</strong></p><p><a href="institutions.html">${tr("Back to all institutions")}</a></p></div></div>`;
      return;
    }
    document.title = `${i.name} · Study in Ethiopia`;
    // Each profile is its own page for search engines: canonical + language alternates carry the ?id=
    const q = "?id=" + encodeURIComponent(i.id);
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((l) => { l.href = l.href.split("?")[0] + q; });
    const selfAlt = document.querySelector(`link[rel="alternate"][hreflang="${document.documentElement.lang}"]`);
    if (selfAlt) document.head.insertAdjacentHTML("beforeend", `<link rel="canonical" href="${esc(selfAlt.href)}">`);
    const og = document.querySelector('meta[property="og:url"]');
    if (og) og.content = og.content.split("?")[0] + q;
    const desc = document.querySelector('meta[name="description"]');
    if (desc && i.summary) desc.content = i.summary.slice(0, 300);
    const progs = progsOf(i.id);
    const meta = [placeOf(i), i.founded ? tr("Established {y}", { y: i.founded }) : ""].filter(Boolean).join(" · ");
    // Short sourced summary goes first; the older long "about" text is folded away below the programmes
    const about = i.summary ? [i.summary] : (i.about || []).slice(0, 1);
    const more = i.summary ? (i.about || []) : (i.about || []).slice(1);
    const s = i.stats || {};
    const statBits = [
      s.undergraduate && [tr("Undergraduate"), s.undergraduate], s.masters && [lbl("level", "Master's"), s.masters],
      s.phd && [lbl("level", "PhD"), s.phd], s.postgraduate && [tr("Postgraduate"), s.postgraduate],
    ].filter(Boolean);
    const coverage = {
      partial: tr("This list is incomplete: it includes only programmes we could confirm on the institution's own pages."),
      most: tr("This list covers most programmes published on the institution's own pages."),
      none: "",
    }[i.coverage] || "";

    root.innerHTML = `
      <section class="page-head profile-head">
        <div class="wrap">
          <a class="back" href="institutions.html">${tr("← All institutions")}</a>
          <div class="inst-top">
            <div class="mono big" aria-hidden="true">${esc(abbrOf(i))}</div>
            <div>
              <h1>${esc(i.name)}</h1>
              <span class="badge">${tr(i.type === "public" ? "Public" : "Private")}${i.category ? " · " + esc(lbl("category", i.category)) : ""}</span>
              ${meta ? `<div class="meta">${esc(meta)}</div>` : ""}
            </div>
          </div>
          ${i.website ? `<a class="btn btn-primary" href="${esc(i.website)}" target="_blank" rel="noopener" style="margin-top:20px">${tr("Visit {d} ↗", { d: esc(domain(i.website)) })}</a>` : ""}
        </div>
      </section>

      <section class="section profile">
        <div class="wrap profile-grid">
          <div>
            ${LANG !== "en" ? `<p class="am-note">${tr("Names and descriptions are in English.")}</p>` : ""}
            ${about.length ? `<h2>${tr("About")}</h2>${about.map((p) => `<p class="prose-p">${esc(p)}</p>`).join("")}` : ""}
            <h2 id="programmes">${tr("Programmes")}</h2>
            ${progs.length ? `
              ${coverage ? `<p class="note">${esc(coverage)}</p>` : ""}
              <div class="toolbar">
                <div class="search"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                  <label class="visually-hidden" for="p-search">${tr("Search programmes")}</label>
                  <input id="p-search" type="search" placeholder="${tr("Search {n} programmes", { n: progs.length })}" autocomplete="off"></div>
                <div class="filters" role="group" aria-label="${tr("Filter by level")}">
                  <button class="chip" type="button" data-level="" aria-pressed="true">${tr("All levels")}</button>
                  ${LEVELS.filter((l) => progs.some((p) => p.level === l)).map((l) => `<button class="chip" type="button" data-level="${esc(l)}" aria-pressed="false">${esc(lbl("level", l))} <span class="n">${progs.filter((p) => p.level === l).length}</span></button>`).join("")}
                </div>
              </div>
              <div id="p-list"></div>`
            : `<p class="note">${esc(LANG === "en" && i.coverageNote ? i.coverageNote : tr("We haven't collected this institution's programmes yet. Check its website for the current list."))}</p>`}
            ${more.length ? `<details class="more-about"><summary>${tr("More about {name}", { name: esc(i.name) })}</summary>${more.map((p) => `<p class="prose-p">${esc(p)}</p>`).join("")}</details>` : ""}
          </div>
          <aside class="side-facts">
            <div class="card"><h3>${tr("Accreditation")}</h3>
              <p class="small" style="margin:0 0 8px">${tr("Check this institution's programmes in the Education and Training Authority's register before enrolling.")}</p>
              <a href="https://accreditation.neta.gov.et/" target="_blank" rel="noopener">${tr("ETA accreditation register ↗")}</a>
              <p class="small"><a href="apply.html">${tr("Coming from abroad? See how to apply →")}</a></p></div>
            ${statBits.length ? `<div class="card"><h3>${tr("Programmes offered")}</h3><dl class="facts">${statBits.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
              <p class="small">${tr("As stated by {src}{asOf}.", { src: s.source ? `<a href="${esc(s.source)}" target="_blank" rel="noopener">${esc(domain(s.source))}</a>` : tr("the institution"), asOf: s.asOf ? ` (${esc(s.asOf)})` : "" })}</p></div>` : ""}
            ${(i.colleges || []).length ? `<div class="card"><h3>${esc(tr("Colleges & institutes"))}</h3><ul class="plain">${i.colleges.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div>` : ""}
            ${(i.sources || []).length ? `<div class="card"><h3>${tr("Sources")}</h3><ul class="plain">${i.sources.map((x) => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.label || domain(x.url))}</a>${x.kind === "secondary" ? ` <span class="small">${tr("(secondary)")}</span>` : ""}</li>`).join("")}</ul>
              ${i.checked ? `<p class="small">${tr("Last checked {date}.", { date: esc(new Date(i.checked + "T00:00:00").toLocaleDateString(DATE_LOCALE, { day: "numeric", month: "long", year: "numeric" })) })}</p>` : ""}</div>` : ""}
          </aside>
        </div>
      </section>`;

    if (!progs.length) return;
    const input = $("#p-search"), out = $("#p-list");
    const chips = [...root.querySelectorAll("[data-level]")];
    let level = "";
    function draw() {
      const q = norm(input.value.trim());
      const rows = progs.filter((p) => (!level || p.level === level) && (!q || norm(p.name).includes(q) || norm(p.college).includes(q) || norm(p.field).includes(q) || norm(lbl("field", p.field)).includes(q)));
      chips.forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.level === level)));
      if (!rows.length) { out.innerHTML = `<div class="empty"><p>${tr("No programmes match.")}</p></div>`; return; }
      out.innerHTML = LEVELS.filter((l) => rows.some((p) => p.level === l)).map((l) => {
        const items = rows.filter((p) => p.level === l);
        return `<h3 class="lvl-head">${esc(lbl("level", l))} <span class="n">${items.length}</span></h3>
          <ul class="prog-table">${items.map((p) => `<li>
            <div><strong>${esc(p.name)}</strong><span>${esc([p.college, lbl("field", p.field)].filter(Boolean).join(" · "))}</span></div>
            ${p.source ? `<a class="src" href="${esc(p.source)}" target="_blank" rel="noopener" title="${tr("Source: {d}", { d: esc(domain(p.source)) })}">${tr("Source ↗")}</a>` : ""}
          </li>`).join("")}</ul>`;
      }).join("");
    }
    input.addEventListener("input", draw);
    chips.forEach((c) => c.addEventListener("click", () => { level = c.dataset.level; draw(); }));
    draw();
  }

  /* ---------- Programme finder (across institutions) ---------- */

  function renderProgrammes() {
    const out = $("#prog-results");
    if (!out) return;
    const input = $("#prog-search"), count = $("#prog-count");
    const sel = { level: $("#pf-level"), field: $("#pf-field"), region: $("#pf-region"), type: $("#pf-type") };
    const progs = (D.programmes || []).filter((p) => instById.has(p.institution));
    const params = new URLSearchParams(location.search);
    const st = { q: params.get("q") || "", level: params.get("level") || "", field: params.get("field") || "", region: params.get("region") || "", type: params.get("type") || "" };
    input.value = st.q;

    options(sel.level, LEVELS.map((l) => [l, progs.filter((p) => p.level === l).length]).filter(([, n]) => n), tr("Any level"), st.level, "level");
    options(sel.field, [...countBy(progs, (p) => p.field)].sort((a, b) => a[0].localeCompare(b[0])), tr("Any field"), st.field, "field");
    options(sel.region, [...countBy(progs, (p) => instById.get(p.institution).region)].sort((a, b) => a[0].localeCompare(b[0])), tr("Any region"), st.region, "region");
    sel.type.innerHTML = `<option value="">${esc(tr("Public & private"))}</option><option value="public"${st.type === "public" ? " selected" : ""}>${tr("Public")}</option><option value="private"${st.type === "private" ? " selected" : ""}>${tr("Private")}</option>`;
    $("#prog-coverage").innerHTML = tr("Programme lists come from each institution's own website. So far they cover <strong>{n}</strong> of {total} institutions; more are being added.", { n: researchedCount(), total: (D.institutions || []).length });

    let limit = 40;
    function draw() {
      const q = norm(st.q.trim());
      const rows = progs.filter((p) => {
        const i = instById.get(p.institution);
        return (!st.level || p.level === st.level) && (!st.field || p.field === st.field) &&
          (!st.region || i.region === st.region) && (!st.type || i.type === st.type) &&
          (!q || norm(p.name).includes(q) || norm(p.field).includes(q) || norm(lbl("field", p.field)).includes(q));
      });
      // Group by level + normalised name so "Civil Engineering" at several institutions appears once
      const groups = new Map();
      rows.forEach((p) => {
        const k = p.level + "|" + norm(p.name).replace(/[^a-z0-9]+/g, " ").trim();
        if (!groups.has(k)) groups.set(k, { name: p.name, level: p.level, field: p.field, items: [] });
        groups.get(k).items.push(p);
      });
      const list = [...groups.values()].sort((a, b) => b.items.length - a.items.length || a.name.localeCompare(b.name) || LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level));
      count.textContent = tr("{n} programmes · {m} offerings", { n: list.length, m: rows.length });
      out.innerHTML = list.length ? list.slice(0, limit).map((g) => `
        <article class="card prog-card">
          <div class="prog-card-head"><h3>${esc(g.name)}</h3><span class="badge">${esc(lbl("level", g.level))}${g.field ? " · " + esc(lbl("field", g.field)) : ""}</span></div>
          <ul class="offered">${g.items.map((p) => { const i = instById.get(p.institution); return `<li><a href="${profileUrl(i)}#programmes">${esc(i.name)}</a>${placeOf(i) ? `<span>${esc(placeOf(i))}</span>` : ""}</li>`; }).join("")}</ul>
        </article>`).join("") + (list.length > limit ? `<div class="more-wrap"><button class="btn btn-ghost" type="button" id="more">${tr("Show more ({n} left)", { n: list.length - limit })}</button></div>` : "")
        : `<div class="empty"><p><strong>${tr("No programmes match.")}</strong></p><p>${tr("Try a broader word, e.g. “Engineering” or “Nursing”, or remove a filter.")}</p></div>`;
      const p = new URLSearchParams();
      Object.entries(st).forEach(([k, v]) => { if (v) p.set(k, v); });
      history.replaceState(null, "", p.toString() ? `?${p}` : location.pathname);
    }
    input.addEventListener("input", () => { st.q = input.value; limit = 40; draw(); });
    Object.entries(sel).forEach(([k, el]) => el.addEventListener("change", () => { st[k] = el.value; limit = 40; draw(); }));
    out.addEventListener("click", (e) => { if (e.target.id === "more") { limit += 40; draw(); } });
    draw();
  }

  /* ---------- Link-card pages ---------- */

  function linkCard(l) {
    // Links to pages on this site open in the same tab; external links in a new one
    const internal = !/^https?:\/\//i.test(l.website);
    return `<a class="card link-card${internal ? " internal" : ""}" href="${esc(l.website)}"${internal ? "" : ' target="_blank" rel="noopener"'}>
      <div><strong>${esc(l.name)}</strong><small>${internal ? tr("Guide on this site") : esc(domain(l.website))}</small></div>${internal ? '<span class="arrow" aria-hidden="true">→</span>' : ARROW}</a>`;
  }

  function renderAbroad() {
    const c = $("#countries");
    if (c) c.innerHTML = (D.studyAbroad || []).map((s) => `
      <a class="card link-card" href="${esc(s.website)}" target="_blank" rel="noopener">
        <img class="flag" src="${ASSETS}img/flags/${esc(s.code)}.png" alt="" loading="lazy">
        <div><strong>${esc(s.name)}</strong><small>${esc(s.label || domain(s.website))}</small></div>${ARROW}
      </a>`).join("");

    const t = $("#tests");
    if (t) t.innerHTML = (D.languageTests || []).map((x) => `
      <a class="card link-card tall" href="${esc(x.website)}" target="_blank" rel="noopener">
        <img class="logo" src="${ASSETS}img/logos/${esc(x.code)}.png" alt="${tr("{name} logo", { name: esc(x.name) })}" loading="lazy">
        <div><strong>${esc(x.name)}</strong><small>${esc(x.label)}</small>
        <p>${x.code === "ielts" ? tr("Test centres in Ethiopia: ") : ""}${esc(x.note)}</p></div>
      </a>`).join("");

    const p = $("#practice");
    if (p) p.innerHTML = (D.practice || []).map((x) => `
      <a class="card link-card" href="${esc(x.website)}" target="_blank" rel="noopener">
        <img class="logo" src="${ASSETS}img/logos/${esc(x.code)}.png" alt="" loading="lazy">
        <div><strong>${esc(x.name)}</strong><small>${esc(domain(x.website))}</small></div>${ARROW}
      </a>`).join("");
  }

  function renderLearn() {
    const m = $("#moocs");
    if (m) m.innerHTML = (D.moocs || []).map((x) => `
      <a class="card link-card tall" href="${esc(x.website)}" target="_blank" rel="noopener">
        <img class="logo" src="${ASSETS}img/logos/${esc(x.code)}.png" alt="${tr("{name} logo", { name: esc(x.name) })}" loading="lazy">
        <div><strong>${esc(x.name)}</strong><small>${esc(domain(x.website))}</small><p>${esc(x.about)}</p></div>
      </a>`).join("");
  }

  function renderResources() {
    const l = $("#links");
    if (l) l.innerHTML = (D.links || []).map(linkCard).join("");
  }

  // Hide any logo or flag image that's missing rather than showing a broken icon
  document.addEventListener("error", (e) => {
    if (e.target.tagName === "IMG" && e.target.closest(".link-card")) e.target.remove();
  }, true);

  /* ---------- Boot ---------- */

  initTheme();
  initMenu();
  initFooter();
  syncLangLinks();
  ({
    home: renderHome,
    institutions: renderInstitutions,
    abroad: renderAbroad,
    learn: renderLearn,
    resources: renderResources,
    institution: renderInstitution,
    programmes: renderProgrammes,
  }[document.body.dataset.page] || (() => {}))();
})();

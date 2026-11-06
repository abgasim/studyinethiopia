/* Study in Ethiopia — admin dashboard.
   Runs entirely in the browser. Loads window.SIE_DATA from assets/data.js,
   lets you edit it, and saves a new data.js (File System Access API in
   Edge/Chrome, or a download elsewhere). Nothing is sent to any server. */
(function () {
  "use strict";

  /* ---------- Helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const domain = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
  const slug = (s) => norm(s).replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} },
  };

  const KEYS = ["institutions", "programmes", "studyAbroad", "languageTests", "practice", "moocs", "links", "fields"];
  const HEADER = "/* Study in Ethiopia: site content.\n   Edit with admin.html (recommended) or by hand. Keep it valid JSON inside SIE_DATA. */\n";
  const DRAFT_KEY = "sie-admin-draft";

  function shape(src) {
    const out = {};
    KEYS.forEach((k) => { out[k] = Array.isArray(src && src[k]) ? src[k] : []; });
    // keep any extra keys someone added by hand
    Object.keys(src || {}).forEach((k) => { if (!(k in out)) out[k] = src[k]; });
    return out;
  }
  const serialize = (d) => HEADER + "window.SIE_DATA = " + JSON.stringify(d, null, 1) + ";\n";

  function parseDataFile(text) {
    const m = text.match(/SIE_DATA\s*=\s*([\s\S]*?);?\s*$/);
    if (!m) throw new Error("This file doesn't contain window.SIE_DATA.");
    return shape(JSON.parse(m[1].trim().replace(/;$/, "")));
  }

  /* ---------- State ---------- */
  const loaded = !!window.SIE_DATA;
  let data = shape(loaded ? clone(window.SIE_DATA) : {});
  let savedText = serialize(data);     // what's on disk
  let fileHandle = null;               // set after first save/open (Edge/Chrome)

  // Portal mode: when this page is served from the website (http/https), you sign in with a
  // GitHub access key and "Publish" commits data.js to the repository through the GitHub API.
  // GitHub enforces the permission, so the page is harmless without a valid key.
  // Opened from disk (file://), it works offline and saves to the local file as before.
  const GH = { owner: "abgasim", repo: "studyinethiopia", path: "site/assets/data.js", branch: "main" };
  const PORTAL = /^https?:$/.test(location.protocol) && !new URLSearchParams(location.search).has("local");
  const TOKEN_KEY = "sie-portal-token";
  let ghToken = null, ghSha = null, ghUser = "";
  let section = "institutions";
  let query = "";
  let filter = "";
  let undoSnapshot = null;

  const isDirty = () => serialize(data) !== savedText;

  /* ---------- Vocabularies ---------- */
  const LEVELS = ["Certificate", "Diploma", "Bachelor's", "Master's", "PhD", "Specialty"];
  const CATEGORIES = ["University", "University College", "College", "Institute", "Polytechnic / TVET"];
  const REGIONS = ["Addis Ababa", "Afar", "Amhara", "Benishangul-Gumuz", "Central Ethiopia", "Dire Dawa", "Gambela",
    "Harari", "Oromia", "Sidama", "Somali", "South Ethiopia", "South West Ethiopia Peoples", "Tigray"];
  const MODES = { campus: "On campus", distance: "Distance", both: "On campus & distance" };
  const SCHEDULES = ["day", "evening", "weekend"];
  const LANGS = ["English", "Amharic", "Afaan Oromo", "Tigrinya", "Somali", "Other"];
  const FLAGS = [["de", "Germany"], ["dk", "Denmark"], ["fi", "Finland"], ["fr", "France"], ["ic", "Iceland"],
    ["no", "Norway"], ["pl", "Poland"], ["sv", "Sweden"], ["uk", "United Kingdom"], ["us", "United States"]];

  const instById = (id) => data.institutions.find((i) => i.id === id);
  const instName = (id) => (instById(id) || {}).name || "⚠ Missing institution";
  const progCount = (id) => data.programmes.filter((p) => p.institution === id).length;

  /* ---------- Section definitions ----------
     columns: what the table shows. fields: what the editor edits.
     ordered: true means the list order is the order on the website (↑/↓ buttons). */
  const SECTIONS = [
    {
      key: "institutions", group: "Directory", label: "Institutions", one: "institution",
      help: "Universities and colleges shown on the Institutions page.",
      sort: (a, b) => a.name.localeCompare(b.name),
      search: (i) => [i.name, i.abbr, i.website],
      filters: [
        ["", "All institutions"], ["public", "Public", (i) => i.type === "public"], ["private", "Private", (i) => i.type === "private"],
        ["nosite", "Missing website", (i) => !i.website], ["noabout", "Missing description", (i) => !(i.about || []).length],
        ["noprog", "No programmes yet", (i) => !progCount(i.id)],
        ["noregion", "Missing region", (i) => !i.region],
        ["stale", "Not checked in 12 months", (i) => !i.checked || Date.now() - new Date(i.checked) > 365 * 864e5],
      ],
      columns: [
        { label: "Name", main: (i) => i.name, sub: (i) => [i.abbr, i.category].filter(Boolean).join(" · ") },
        { label: "Type", get: (i) => (i.type === "public" ? "Public" : "Private") },
        { label: "Region", get: (i) => i.region || "Missing", warn: (i) => !i.region, sm: true },
        { label: "Website", get: (i) => (i.website ? domain(i.website) : "Missing"), warn: (i) => !i.website, sm: true },
        { label: "About", get: (i) => ((i.about || []).length ? "✓" : "Missing"), warn: (i) => !(i.about || []).length, sm: true },
        { label: "Programmes", get: (i) => progCount(i.id) || "—" },
      ],
      rowActions: (i) => [{ label: "Programmes", run: () => go("programmes", "inst:" + i.id) }],
      fields: [
        { k: "name", label: "Name", type: "text", required: true },
        { row: [
          { k: "abbr", label: "Abbreviation", type: "text", hint: "Shown in the badge, e.g. AAU" },
          { k: "type", label: "Type", type: "select", required: true, options: [["public", "Public"], ["private", "Private"]] },
        ] },
        { row: [
          { k: "category", label: "Category", type: "select", required: true, options: CATEGORIES.map((c) => [c, c]) },
          { k: "founded", label: "Founded (year)", type: "number" },
        ] },
        { row: [
          { k: "city", label: "City", type: "text" },
          { k: "region", label: "Region", type: "select", options: [["", "—"], ...REGIONS.map((r) => [r, r])] },
        ] },
        { row: [
          { k: "lat", label: "Map latitude", type: "decimal", hint: "e.g. 7.6756. Leave empty to leave it off the map." },
          { k: "lng", label: "Map longitude", type: "decimal", hint: "e.g. 36.8479" },
        ] },
        { k: "website", label: "Website", type: "url", hint: "Leave empty if unknown." },
        { k: "summary", label: "Summary", type: "textarea", hint: "2–3 neutral sentences, shown on the directory card." },
        { k: "about", label: "About (longer text)", type: "paragraphs", hint: "Leave a blank line between paragraphs." },
        { k: "colleges", label: "Colleges & institutes", type: "lines", hint: "One per line." },
        { k: "sources", label: "Sources", type: "sources", hint: "One per line: Label | https://link   (add “| secondary” for non-official sources)" },
        { k: "checked", label: "Last checked", type: "date", hint: "When the information was last verified." },
      ],
      defaults: () => ({ type: "public", category: "University", about: [] }),
      validate(item, original) {
        const dup = data.institutions.find((i) => i !== original && norm(i.name) === norm(item.name));
        if (dup) return { name: "An institution with this name already exists." };
        if ((item.lat === undefined) !== (item.lng === undefined)) return { lat: "Give both latitude and longitude, or neither." };
        if (item.lat !== undefined && (item.lat < 3 || item.lat > 15.5 || item.lng < 32.9 || item.lng > 48.1))
          return { lat: "That point is outside Ethiopia. Check the numbers aren't swapped." };
      },
      beforeInsert(item) {
        const used = new Set(data.institutions.map((i) => i.id));
        let id = slug(item.name), n = 2;
        while (used.has(id)) id = slug(item.name) + "-" + n++;
        item.id = id;
      },
      beforeDelete(item) {
        const n = progCount(item.id);
        return {
          message: n ? `Delete “${item.name}” and its ${n} programme${n > 1 ? "s" : ""}?` : `Delete “${item.name}”?`,
          after: () => { data.programmes = data.programmes.filter((p) => p.institution !== item.id); },
        };
      },
    },
    {
      key: "programmes", group: "Directory", label: "Programmes", one: "programme",
      help: "What each institution teaches. Shown on its card on the Institutions page.",
      sort: (a, b) => instName(a.institution).localeCompare(instName(b.institution)) ||
        LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.name.localeCompare(b.name),
      search: (p) => [p.name, p.level, p.field, instName(p.institution)],
      filters: () => [["", "All institutions"], ...data.institutions
        .filter((i) => progCount(i.id) || filter === "inst:" + i.id).sort((a, b) => a.name.localeCompare(b.name))
        .map((i) => ["inst:" + i.id, `${i.name} (${progCount(i.id)})`, (p) => p.institution === i.id])],
      columns: [
        { label: "Programme", main: (p) => p.name, sub: (p) => p.level },
        { label: "Institution", get: (p) => instName(p.institution), warn: (p) => !instById(p.institution) },
        { label: "College", get: (p) => p.college || "—", sm: true },
        { label: "Field", get: (p) => p.field || "Missing", warn: (p) => !p.field, sm: true },
        { label: "Source", get: (p) => (p.source ? domain(p.source) : "Added by hand"), sm: true },
      ],
      fields: [
        { k: "institution", label: "Institution", type: "select", required: true,
          options: () => [["", "Choose an institution…"], ...data.institutions.slice().sort((a, b) => a.name.localeCompare(b.name)).map((i) => [i.id, i.name])] },
        { row: [
          { k: "level", label: "Level", type: "select", required: true, options: LEVELS.map((l) => [l, l]) },
          { k: "name", label: "Programme name", type: "text", required: true, hint: "e.g. Civil Engineering",
            suggest: () => [...new Set(data.programmes.map((p) => p.name))].sort() },
        ] },
        { row: [
          { k: "field", label: "Field of study", type: "select", required: true, options: () => [["", "Choose…"], ...data.fields.map((f) => [f, f])] },
          { k: "college", label: "College / faculty", type: "text",
            suggest: (item) => (instById(item.institution) || {}).colleges || [] },
        ] },
        { k: "source", label: "Source", type: "url", hint: "The official page that lists this programme." },
        { row: [
          { k: "mode", label: "Study mode", type: "select", options: [["", "Not stated"], ...Object.entries(MODES)] },
          { k: "language", label: "Language of instruction", type: "text", suggest: () => LANGS },
        ] },
        { row: [
          { k: "credits", label: "Credit hours", type: "number", hint: "Optional" },
          { k: "schedule", label: "Class times", type: "checks", options: SCHEDULES.map((s) => [s, cap(s)]) },
        ] },
      ],
      defaults: () => ({ level: "Bachelor's", institution: filter.startsWith("inst:") ? filter.slice(5) : "" }),
      keepOnAnother: ["institution", "level", "field", "college", "source", "mode", "schedule", "language"],
      validate(item, original) {
        const dup = data.programmes.find((p) => p !== original && p.institution === item.institution &&
          p.level === item.level && norm(p.name) === norm(item.name));
        if (dup) return { name: "This institution already lists this programme at this level." };
      },
    },
    {
      key: "studyAbroad", group: "Study abroad", label: "Country portals", one: "portal", ordered: true,
      help: "Official study-abroad and scholarship sites, in the order shown on the Study abroad page.",
      search: (s) => [s.name, s.label, s.website],
      columns: [
        { label: "Country", main: (s) => s.name, sub: (s) => s.label, img: (s) => `assets/img/flags/${s.code}.png` },
        { label: "Website", get: (s) => domain(s.website) },
      ],
      fields: [
        { row: [
          { k: "name", label: "Country", type: "text", required: true },
          { k: "code", label: "Flag", type: "select", required: true, options: FLAGS, preview: (v) => `assets/img/flags/${v}.png`,
            hint: "New flag? Add a PNG to assets/img/flags/ first." },
        ] },
        { k: "label", label: "Description", type: "text", hint: "Optional, e.g. “DAAD scholarships”. If empty, the web address is shown." },
        { k: "website", label: "Website", type: "url", required: true },
      ],
      defaults: () => ({ code: "uk" }),
    },
    {
      key: "languageTests", group: "Study abroad", label: "English tests", one: "test", ordered: true,
      help: "Language tests on the Study abroad page.",
      search: (t) => [t.name, t.label],
      columns: [
        { label: "Test", main: (t) => t.name, sub: (t) => t.label, img: (t) => `assets/img/logos/${t.code}.png` },
        { label: "Note", get: (t) => t.note || "—", sm: true },
        { label: "Website", get: (t) => domain(t.website) },
      ],
      fields: [
        { row: [
          { k: "name", label: "Short name", type: "text", required: true, hint: "e.g. IELTS" },
          { k: "code", label: "Logo file", type: "logo" },
        ] },
        { k: "label", label: "Full name", type: "text" },
        { k: "note", label: "Note", type: "text", hint: "e.g. where the test can be taken in Ethiopia" },
        { k: "website", label: "Website", type: "url", required: true },
      ],
      defaults: () => ({}),
    },
    {
      key: "practice", group: "Study abroad", label: "Practice material", one: "practice link", ordered: true,
      help: "Free test-preparation sites on the Study abroad page.",
      search: (p) => [p.name, p.website],
      columns: [
        { label: "Name", main: (p) => p.name, img: (p) => `assets/img/logos/${p.code}.png` },
        { label: "Website", get: (p) => domain(p.website) },
      ],
      fields: [
        { k: "name", label: "Name", type: "text", required: true },
        { k: "code", label: "Logo file", type: "logo" },
        { k: "website", label: "Website", type: "url", required: true },
      ],
      defaults: () => ({}),
    },
    {
      key: "moocs", group: "Learning & links", label: "Online courses", one: "course platform", ordered: true,
      help: "MOOC platforms on the Learn online page.",
      search: (m) => [m.name, m.about],
      columns: [
        { label: "Platform", main: (m) => m.name, img: (m) => `assets/img/logos/${m.code}.png` },
        { label: "Website", get: (m) => domain(m.website) },
      ],
      fields: [
        { row: [
          { k: "name", label: "Name", type: "text", required: true },
          { k: "code", label: "Logo file", type: "logo" },
        ] },
        { k: "website", label: "Website", type: "url", required: true },
        { k: "about", label: "Description", type: "textarea", hint: "One or two sentences." },
      ],
      defaults: () => ({}),
    },
    {
      key: "links", group: "Learning & links", label: "Official links", one: "link", ordered: true,
      help: "Ministries, agencies and reading on the Resources page. The first six also appear on the home page.",
      search: (l) => [l.name, l.website],
      columns: [
        { label: "Name", main: (l) => l.name },
        { label: "Website", get: (l) => domain(l.website) },
      ],
      fields: [
        { k: "name", label: "Name", type: "text", required: true },
        { k: "website", label: "Website", type: "url", required: true },
      ],
      defaults: () => ({}),
    },
  ];
  const S = (key) => SECTIONS.find((s) => s.key === key);
  const flatFields = (sec) => sec.fields.flatMap((f) => f.row || [f]);
  const opts = (o) => (typeof o === "function" ? o() : o);

  /* ---------- Rendering ---------- */
  function renderNav() {
    let html = "", group = "";
    SECTIONS.forEach((s) => {
      if (s.group !== group) { group = s.group; html += `<h4>${esc(group)}</h4>`; }
      html += `<a href="#${s.key}"${s.key === section ? ' aria-current="page"' : ""}>${esc(s.label)}<span class="n">${data[s.key].length}</span></a>`;
    });
    $("#side-nav").innerHTML = html;
  }

  function renderStatus() {
    const st = $("#status"), dirty = isDirty();
    st.classList.toggle("dirty", dirty);
    st.textContent = dirty ? (PORTAL ? "Unpublished changes" : "Unsaved changes")
      : PORTAL ? "Live site is up to date" : fileHandle ? `Saved to ${fileHandle.name}` : "No changes";
    $("#save-btn").classList.toggle("btn-ghost", !dirty);
    $("#save-btn").classList.toggle("btn-primary", dirty);
  }

  function rowsFor(sec) {
    const list = data[sec.key];
    const flist = sec.filters ? opts(sec.filters) : [];
    const f = flist.find((x) => x[0] === filter && x[2]);
    const q = norm(query.trim());
    let rows = list.map((item, index) => ({ item, index }));
    if (f) rows = rows.filter((r) => f[2](r.item));
    if (q) rows = rows.filter((r) => sec.search(r.item).some((v) => norm(v).includes(q)));
    if (sec.sort) rows.sort((a, b) => sec.sort(a.item, b.item));
    return rows;
  }

  function renderTable() {
    const sec = S(section);
    $("#section-title").textContent = sec.label;
    $("#section-help").textContent = sec.help;
    $("#add-btn").textContent = `+ Add ${sec.one}`;
    $("#q").placeholder = `Search ${sec.label.toLowerCase()}`;

    const flist = sec.filters ? opts(sec.filters) : [];
    if (!flist.some((x) => x[0] === filter)) filter = "";
    $("#filter").innerHTML = flist.map(([v, l]) => `<option value="${esc(v)}"${v === filter ? " selected" : ""}>${esc(l)}</option>`).join("");

    const rows = rowsFor(sec);
    const total = data[sec.key].length;
    $("#count").textContent = rows.length === total ? `${total} ${total === 1 ? sec.one : sec.label.toLowerCase()}` : `${rows.length} of ${total} shown`;

    if (!rows.length) {
      $("#table-wrap").innerHTML = `<div class="table-empty"><p><strong>${total ? "Nothing matches." : `No ${sec.label.toLowerCase()} yet.`}</strong></p>
        <p>${total ? "Try a different search or filter." : `Use “+ Add ${esc(sec.one)}” to create the first one.`}</p></div>`;
      return;
    }
    const canMove = sec.ordered && !query && !filter;
    const head = sec.columns.map((c) => `<th${c.sm ? ' class="hide-sm"' : ""}>${esc(c.label)}</th>`).join("") + "<th></th>";
    const body = rows.map(({ item, index }) => {
      const cells = sec.columns.map((c) => {
        if (c.main) {
          const img = c.img ? `<img class="thumb" src="${esc(c.img(item))}" alt="" onerror="this.style.visibility='hidden'">` : "";
          const sub = c.sub && c.sub(item) ? `<small>${esc(c.sub(item))}</small>` : "";
          return `<td><div class="main-cell">${img}<div><strong>${esc(c.main(item))}</strong>${sub}</div></div></td>`;
        }
        return `<td class="${c.sm ? "hide-sm " : ""}${c.warn && c.warn(item) ? "warn" : ""}">${esc(c.get(item))}</td>`;
      }).join("");
      const extra = (sec.rowActions ? sec.rowActions(item) : []).map((a, n) => `<button class="icon-btn link" type="button" data-act="row:${n}">${esc(a.label)}</button>`).join("");
      const move = canMove ? `<button class="icon-btn" type="button" data-act="up" aria-label="Move up"${index === 0 ? " disabled" : ""}>↑</button><button class="icon-btn" type="button" data-act="down" aria-label="Move down"${index === total - 1 ? " disabled" : ""}>↓</button>` : "";
      return `<tr data-i="${index}">${cells}<td class="acts">${extra}${move}<button class="icon-btn" type="button" data-act="edit">Edit</button></td></tr>`;
    }).join("");
    $("#table-wrap").innerHTML = `<table class="tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  }

  function render() { renderNav(); renderTable(); renderStatus(); }

  /* ---------- Editor ---------- */
  let editing = null; // { sec, original (object or null) }

  function fieldHTML(f, item) {
    const v = item[f.k];
    const id = "f-" + f.k;
    const req = f.required ? ' <span class="req" aria-hidden="true">*</span>' : "";
    const hint = f.hint ? `<span class="hint">${esc(f.hint)}</span>` : "";
    const list = f.suggest ? ` list="dl-${f.k}"` : "";
    const dl = f.suggest ? `<datalist id="dl-${f.k}">${f.suggest(item).map((s) => `<option value="${esc(s)}">`).join("")}</datalist>` : "";
    let input;
    switch (f.type) {
      case "select":
        input = `<select id="${id}" name="${f.k}">${opts(f.options).map(([ov, ol]) => `<option value="${esc(ov)}"${String(v ?? "") === ov ? " selected" : ""}>${esc(ol)}</option>`).join("")}</select>`;
        if (f.preview) input = `<div class="with-preview">${input}<img alt="" data-preview="${f.k}" src="${esc(f.preview(v))}" onerror="this.style.visibility='hidden'" onload="this.style.visibility='visible'"></div>`;
        break;
      case "logo":
        input = `<div class="with-preview"><input id="${id}" name="${f.k}" type="text" value="${esc(v)}" placeholder="e.g. edx"><img alt="" data-preview="${f.k}" src="assets/img/logos/${esc(v)}.png" onerror="this.style.visibility='hidden'" onload="this.style.visibility='visible'"></div>`;
        f = { ...f, hint: f.hint || "PNG file name in assets/img/logos/, without “.png”." };
        break;
      case "paragraphs":
        input = `<textarea id="${id}" name="${f.k}">${esc((v || []).join("\n\n"))}</textarea>`; break;
      case "textarea":
        input = `<textarea id="${id}" name="${f.k}" style="min-height:100px">${esc(v)}</textarea>`; break;
      case "lines":
        input = `<textarea id="${id}" name="${f.k}" style="min-height:120px">${esc((v || []).join("\n"))}</textarea>`; break;
      case "sources":
        input = `<textarea id="${id}" name="${f.k}" style="min-height:90px" spellcheck="false">${esc((v || []).map((s) =>
          [s.label || "", s.url].concat(s.kind === "secondary" ? ["secondary"] : []).join(" | ")).join("\n"))}</textarea>`; break;
      case "date":
        input = `<input id="${id}" name="${f.k}" type="date" value="${esc(v)}">`; break;
      case "checks":
        return `<div class="fld" data-k="${f.k}"><span class="lbl">${esc(f.label)}${req}</span><div class="checks">${f.options.map(([ov, ol]) =>
          `<label><input type="checkbox" name="${f.k}" value="${esc(ov)}"${(v || []).includes(ov) ? " checked" : ""}> ${esc(ol)}</label>`).join("")}</div>${hint}</div>`;
      case "number":
        input = `<input id="${id}" name="${f.k}" type="number" min="0" step="1" value="${esc(v)}">`; break;
      case "decimal":
        input = `<input id="${id}" name="${f.k}" type="text" inputmode="decimal" value="${esc(v)}" spellcheck="false">`; break;
      case "url":
        input = `<input id="${id}" name="${f.k}" type="url" value="${esc(v)}" placeholder="https://" inputmode="url" spellcheck="false">`; break;
      default:
        input = `<input id="${id}" name="${f.k}" type="text" value="${esc(v)}"${list} autocomplete="off">${dl}`;
    }
    return `<div class="fld" data-k="${f.k}"><label for="${id}">${esc(f.label)}${req}</label>${input}${f.type === "logo" ? `<span class="hint">${esc(f.hint)}</span>` : hint}</div>`;
  }

  function openEditor(sec, original, preset) {
    editing = { sec, original };
    const item = original ? clone(original) : { ...sec.defaults(), ...(preset || {}) };
    $("#editor-title").textContent = original ? `Edit ${sec.one}` : `Add ${sec.one}`;
    $("#editor-fields").innerHTML = sec.fields.map((f) => f.row
      ? `<div class="row-2">${f.row.map((g) => fieldHTML(g, item)).join("")}</div>`
      : fieldHTML(f, item)).join("");
    $("#delete-btn").hidden = !original;
    $("#another-btn").hidden = !!original;
    const dlg = $("#editor");
    if (!dlg.open) dlg.showModal();
    const first = $("#editor-fields input:not([type=checkbox]), #editor-fields select, #editor-fields textarea");
    const target = !original && preset && sec.keepOnAnother ? $(`#f-name, #f-title`) || first : first;
    if (target) target.focus();
  }

  function readForm(sec) {
    const form = $("#editor-form");
    const out = {}, errors = {};
    flatFields(sec).forEach((f) => {
      let v;
      if (f.type === "checks") {
        v = [...form.querySelectorAll(`input[name="${f.k}"]:checked`)].map((c) => c.value);
      } else {
        v = form.elements[f.k].value.trim();
        if (f.type === "paragraphs") v = v.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean);
        if (f.type === "lines") v = v.split("\n").map((s) => s.trim()).filter(Boolean);
        if (f.type === "sources") {
          const list = [];
          v.split("\n").map((s) => s.trim()).filter(Boolean).forEach((line, n) => {
            const parts = line.split("|").map((s) => s.trim());
            const url = parts.find((s) => /^https?:\/\//i.test(s));
            if (!url) { errors[f.k] = `Line ${n + 1} needs a link starting with https://`; return; }
            const label = parts.find((s) => s !== url && s.toLowerCase() !== "secondary") || "";
            list.push({ label, url, kind: parts.some((s) => s.toLowerCase() === "secondary") ? "secondary" : "official" });
          });
          v = list;
        }
        if (f.type === "decimal") {
          if (v === "") v = undefined;
          else if (!/^-?\d+(\.\d+)?$/.test(v)) errors[f.k] = "Use a number like 7.6756.";
          else v = Number(v);
        }
        if (f.type === "number") {
          if (v === "") v = undefined;
          else if (!/^\d+$/.test(v)) errors[f.k] = "Use a whole number.";
          else v = Number(v);
        }
        if (f.type === "url" && v) {
          if (!/^https?:\/\//i.test(v)) v = "https://" + v.replace(/^\/+/, "");
          try { const u = new URL(v); if (!u.hostname.includes(".")) throw 0; } catch { errors[f.k] = "This doesn't look like a web address."; }
        }
      }
      const empty = v === undefined || v === "" || (Array.isArray(v) && !v.length);
      if (f.required && empty) errors[f.k] = `${f.label} is required.`;
      out[f.k] = v;
    });
    return { out, errors };
  }

  function showErrors(errors) {
    document.querySelectorAll("#editor-fields .fld").forEach((el) => {
      el.classList.remove("invalid");
      const old = el.querySelector(".err"); if (old) old.remove();
      const msg = errors[el.dataset.k];
      if (msg) { el.classList.add("invalid"); el.insertAdjacentHTML("beforeend", `<span class="err">${esc(msg)}</span>`); }
    });
    const first = $("#editor-fields .invalid input, #editor-fields .invalid select, #editor-fields .invalid textarea");
    if (first) first.focus();
  }

  function commit(another) {
    const { sec, original } = editing;
    const { out, errors } = readForm(sec);
    Object.assign(errors, (sec.validate && sec.validate(out, original)) || {});
    if (Object.keys(errors).length) { showErrors(errors); return; }

    // Drop empty optional values so the data file stays tidy
    const item = { ...(original || {}) };
    Object.entries(out).forEach(([k, v]) => {
      const empty = v === undefined || v === "" || (Array.isArray(v) && !v.length);
      if (empty) delete item[k]; else item[k] = v;
    });

    const list = data[sec.key];
    if (original) list[list.indexOf(original)] = item;
    else { if (sec.beforeInsert) sec.beforeInsert(item); list.push(item); }
    changed();

    const name = item.name || item.title;
    if (another) {
      const keep = {};
      (sec.keepOnAnother || []).forEach((k) => { if (item[k] !== undefined) keep[k] = clone(item[k]); });
      toast(`Added “${name}”. Add the next one.`);
      openEditor(sec, null, keep);
    } else {
      $("#editor").close();
      toast(original ? `Updated “${name}”` : `Added “${name}”`);
    }
  }

  function remove(sec, item) {
    const plan = sec.beforeDelete ? sec.beforeDelete(item) : { message: `Delete “${item.name || item.title}”?` };
    if (!confirm(plan.message)) return;
    undoSnapshot = clone(data);
    data[sec.key] = data[sec.key].filter((x) => x !== item);
    if (plan.after) plan.after();
    if ($("#editor").open) $("#editor").close();
    changed();
    toast(`Deleted “${item.name || item.title}”`, { undo: true });
  }

  function move(sec, index, dir) {
    const list = data[sec.key], j = index + dir;
    if (j < 0 || j >= list.length) return;
    [list[index], list[j]] = [list[j], list[index]];
    changed();
  }

  /* ---------- Saving ---------- */
  function changed() {
    if (isDirty()) store.set(DRAFT_KEY, JSON.stringify({ at: Date.now(), data }));
    else store.del(DRAFT_KEY);
    render();
  }

  async function save() {
    if (PORTAL) return ghToken ? publish() : undefined;
    const text = serialize(data);
    try {
      if (!fileHandle && window.showSaveFilePicker) {
        toast("Choose the file site › assets › data.js and replace it.");
        fileHandle = await window.showSaveFilePicker({
          suggestedName: "data.js",
          types: [{ description: "Site data", accept: { "text/javascript": [".js"] } }],
        });
      }
      if (fileHandle) {
        const w = await fileHandle.createWritable();
        await w.write(text);
        await w.close();
        toast(`Saved to ${fileHandle.name}. Upload it to your host to publish.`);
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([text], { type: "text/javascript" }));
        a.download = "data.js";
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        toast("Downloaded data.js. Replace site/assets/data.js with it.");
      }
      savedText = text;
      store.del(DRAFT_KEY);
      $("#banner").innerHTML = "";
      render();
    } catch (e) {
      if (e && e.name === "AbortError") { toast("Save cancelled. Your changes are kept as a draft."); return; }
      fileHandle = null;
      toast("Couldn't save: " + (e && e.message ? e.message : e), { error: true });
    }
  }

  async function openFile() {
    if (isDirty() && !confirm("Opening another file replaces your unsaved changes. Continue?")) return;
    try {
      let text, handle = null;
      if (window.showOpenFilePicker) {
        [handle] = await window.showOpenFilePicker({ types: [{ description: "Site data", accept: { "text/javascript": [".js"] } }] });
        text = await (await handle.getFile()).text();
      } else {
        $("#file-input").click();
        return;
      }
      load(text, handle);
    } catch (e) {
      if (e && e.name === "AbortError") return;
      toast("Couldn't open: " + (e && e.message ? e.message : e), { error: true });
    }
  }

  function load(text, handle) {
    try {
      data = parseDataFile(text);
      savedText = serialize(data);
      fileHandle = handle;
      store.del(DRAFT_KEY);
      $("#banner").innerHTML = "";
      render();
      toast(`Opened ${handle ? handle.name : "data.js"}`);
    } catch (e) {
      toast("That file couldn't be read: " + e.message, { error: true });
    }
  }

  /* ---------- Portal: GitHub sign-in and publishing ---------- */

  function gh(pathPart, opts = {}) {
    const url = pathPart.startsWith("https://") ? pathPart : `https://api.github.com/repos/${GH.owner}/${GH.repo}${pathPart}`;
    const headers = {
      Authorization: `Bearer ${ghToken}`,
      Accept: opts.accept || "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (opts.body) headers["Content-Type"] = "application/json";
    return fetch(url, { method: opts.method || "GET", headers, body: opts.body, cache: "no-store" });
  }

  // UTF-8 safe base64 (data.js contains Amharic and other non-Latin text)
  function b64(text) {
    const bytes = new TextEncoder().encode(text);
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }

  const tokenStore = {
    get() { try { return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY); } catch { return null; } },
    set(t, remember) { try { (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, t); } catch {} },
    clear() { try { sessionStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY); } catch {} },
  };

  async function loadFromGitHub() {
    const where = `/contents/${GH.path}?ref=${GH.branch}`;
    const meta = await gh(where);
    if (!meta.ok) throw new Error(`Couldn't read the site's content from GitHub (${meta.status}).`);
    const { sha } = await meta.json();
    const raw = await gh(where, { accept: "application/vnd.github.raw+json" });
    if (!raw.ok) throw new Error(`Couldn't read the site's content from GitHub (${raw.status}).`);
    data = parseDataFile(await raw.text());
    savedText = serialize(data);
    ghSha = sha;
  }

  async function signIn(token, remember) {
    ghToken = token.trim();
    if (!ghToken) throw new Error("Paste your GitHub access key.");
    const r = await gh("");
    if (r.status === 401) throw new Error("That key isn't valid, or it has expired. Create a new one (see below).");
    if (!r.ok) throw new Error(`GitHub didn't accept the key (${r.status}). Try again in a moment.`);
    const repo = await r.json();
    if (!repo.permissions || !repo.permissions.push)
      throw new Error("This GitHub account isn't allowed to change the Study in Ethiopia site.");
    const u = await gh("https://api.github.com/user");
    ghUser = u.ok ? (await u.json()).login || "" : "";
    await loadFromGitHub();
    tokenStore.set(ghToken, remember);
  }

  function signOut() {
    tokenStore.clear();
    ghToken = null; ghSha = null; ghUser = "";
    showLogin();
  }

  async function publish() {
    if (!isDirty()) { toast("Nothing new to publish."); return; }
    const text = serialize(data);
    const btn = $("#save-btn");
    btn.disabled = true; btn.textContent = "Publishing…";
    try {
      const res = await gh(`/contents/${GH.path}`, {
        method: "PUT",
        body: JSON.stringify({ message: `Update site content via admin portal${ghUser ? ` (${ghUser})` : ""}`, content: b64(text), sha: ghSha, branch: GH.branch }),
      });
      if (res.status === 409 || res.status === 422) { conflict(); return; }
      if (res.status === 401) { toast("Your sign-in has expired. Sign in again; your changes are kept as a draft.", { error: true }); signOut(); return; }
      if (res.status === 403 || res.status === 404)
        throw new Error("your key isn't allowed to change the site. It needs “Contents: Read and write” for abgasim/studyinethiopia.");
      if (!res.ok) throw new Error(`GitHub returned ${res.status}.`);
      ghSha = (await res.json()).content.sha;
      savedText = text;
      store.del(DRAFT_KEY);
      $("#banner").innerHTML = "";
      toast("Published. The live site updates in about a minute.");
    } catch (e) {
      toast("Couldn't publish: " + (e && e.message ? e.message : e), { error: true });
    } finally {
      btn.disabled = false; btn.textContent = "Publish";
      render();
    }
  }

  // Someone else changed data.js (another admin, or a push from a computer) since we loaded it
  function conflict() {
    $("#banner").innerHTML = `<div class="banner error"><span class="grow"><strong>The site was changed somewhere else since you opened the portal.</strong>
      Publishing now would overwrite that change. Your edits are kept as a draft: load the latest version, then restore your draft and check it before publishing.</span>
      <button type="button" id="latest-btn">Load latest version</button></div>`;
    $("#latest-btn").onclick = async () => {
      try { await loadFromGitHub(); afterLoad(); toast("Loaded the latest version."); }
      catch (e) { toast(e.message, { error: true }); }
    };
  }

  function showLogin(message) {
    document.body.classList.add("locked");
    $("#login").hidden = false;
    $("#login-error").textContent = message || "";
    const input = $("#gh-token"); input.value = ""; input.focus();
  }

  function unlock() {
    document.body.classList.remove("locked");
    $("#login").hidden = true;
    $("#who").textContent = ghUser ? `Signed in as ${ghUser}` : "Signed in";
    afterLoad();
  }

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg, o = {}) {
    const t = $("#toast");
    t.className = "toast show" + (o.error ? " error" : "");
    t.innerHTML = `<span>${esc(msg)}</span>${o.undo ? '<button type="button" id="undo-btn">Undo</button>' : ""}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), o.undo ? 7000 : 4000);
    if (o.undo) $("#undo-btn").onclick = () => {
      if (!undoSnapshot) return;
      data = undoSnapshot; undoSnapshot = null; changed(); toast("Restored");
    };
  }

  /* ---------- Navigation ---------- */
  function go(key, presetFilter) {
    section = key; query = ""; filter = presetFilter || "";
    $("#q").value = "";
    if (location.hash !== "#" + key) history.replaceState(null, "", "#" + key);
    render();
    $(".main").scrollIntoView({ block: "start" });
  }

  /* ---------- Events ---------- */
  $("#side-nav").addEventListener("click", (e) => {
    const a = e.target.closest("a"); if (!a) return;
    e.preventDefault(); go(a.getAttribute("href").slice(1));
  });
  $("#q").addEventListener("input", (e) => { query = e.target.value; renderTable(); });
  $("#filter").addEventListener("change", (e) => { filter = e.target.value; renderTable(); });
  $("#add-btn").addEventListener("click", () => openEditor(S(section), null));
  $("#save-btn").addEventListener("click", save);
  $("#open-btn").addEventListener("click", openFile);
  $("#file-input").addEventListener("change", async (e) => {
    const f = e.target.files[0]; if (f) load(await f.text(), null); e.target.value = "";
  });

  $("#table-wrap").addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-i]"); if (!tr) return;
    const sec = S(section), index = Number(tr.dataset.i), item = data[sec.key][index];
    const act = (e.target.closest("[data-act]") || {}).dataset?.act || "edit";
    if (act === "up") return move(sec, index, -1);
    if (act === "down") return move(sec, index, 1);
    if (act.startsWith("row:")) return sec.rowActions(item)[Number(act.slice(4))].run();
    openEditor(sec, item);
  });

  $("#editor-form").addEventListener("submit", (e) => {
    e.preventDefault();
    commit(e.submitter && e.submitter.value === "another");
  });
  $("#editor").addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) $("#editor").close();
  });
  $("#editor").addEventListener("change", (e) => {
    // programme editor: refresh college suggestions for the chosen institution
    if (e.target.id !== "f-institution" || !$("#dl-college")) return;
    const cols = (instById(e.target.value) || {}).colleges || [];
    $("#dl-college").innerHTML = cols.map((c) => `<option value="${esc(c)}">`).join("");
  });
  $("#editor").addEventListener("input", (e) => {
    // live logo/flag preview
    const f = e.target.closest(".fld"); if (!f) return;
    const img = f.querySelector("img[data-preview]"); if (!img) return;
    const sel = e.target.tagName === "SELECT";
    img.src = sel ? `assets/img/flags/${e.target.value}.png` : `assets/img/logos/${e.target.value.trim()}.png`;
  });
  $("#delete-btn").addEventListener("click", () => remove(editing.sec, editing.original));

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(); }
  });
  window.addEventListener("beforeunload", (e) => { if (isDirty()) { e.preventDefault(); e.returnValue = ""; } });
  window.addEventListener("hashchange", () => { const k = location.hash.slice(1); if (S(k) && k !== section) go(k); });

  // Theme toggle (shares the setting with the public site)
  (function theme() {
    const root = document.documentElement, btn = $("#theme-btn");
    const dark = () => (root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches);
    const label = () => { btn.textContent = dark() ? "Light mode" : "Dark mode"; };
    label();
    btn.addEventListener("click", () => { root.dataset.theme = dark() ? "light" : "dark"; store.set("sie-theme", root.dataset.theme); label(); });
  })();

  /* ---------- Start ---------- */
  const startKey = location.hash.slice(1);
  if (S(startKey)) section = startKey;

  // Runs once the content is loaded (straight away from disk; after sign-in in the portal)
  function afterLoad() {
    $("#banner").innerHTML = "";
    const draftRaw = store.get(DRAFT_KEY);
    if (draftRaw) {
      try {
        const draft = JSON.parse(draftRaw);
        if (serialize(shape(draft.data)) !== savedText) {
          const when = new Date(draft.at).toLocaleString();
          $("#banner").innerHTML = `<div class="banner"><span class="grow"><strong>You have unsaved changes from ${esc(when)}.</strong> Restore them, or discard and start from the current version.</span>
            <button type="button" id="restore-btn">Restore</button><button type="button" id="discard-btn">Discard</button></div>`;
          $("#restore-btn").onclick = () => { data = shape(draft.data); $("#banner").innerHTML = ""; render(); toast(PORTAL ? "Draft restored. Publish to make it live." : "Draft restored. Save to keep it."); };
          $("#discard-btn").onclick = () => { store.del(DRAFT_KEY); $("#banner").innerHTML = ""; };
        } else store.del(DRAFT_KEY);
      } catch { store.del(DRAFT_KEY); }
    }
    const seenKey = PORTAL ? "sie-portal-seen" : "sie-admin-seen";
    if (!$("#banner").innerHTML && !store.get(seenKey)) {
      store.set(seenKey, "1");
      const how = PORTAL
        ? "edit anything here, then press <strong>Publish</strong> (Ctrl+S). The live site updates about a minute later. Unpublished edits are kept as a draft in this browser."
        : "edit anything here, then press <strong>Save</strong> (Ctrl+S) and choose <code>site/assets/data.js</code>. Commit and push it to publish. Unsaved edits are kept as a draft in this browser.";
      $("#banner").innerHTML = `<div class="banner info"><span class="grow"><strong>How this works:</strong> ${how}</span><button type="button" onclick="this.closest('.banner').remove()">Got it</button></div>`;
    }
    render();
  }

  if (PORTAL) {
    document.body.classList.add("portal");
    $("#save-btn").textContent = "Publish";
    $("#save-btn").title = "Publish to the live site (Ctrl+S)";
    $("#signout-btn").addEventListener("click", () => {
      if (isDirty() && !confirm("You have unpublished changes. They'll stay as a draft in this browser. Sign out?")) return;
      signOut();
    });
    $("#login-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = $("#login-btn");
      btn.disabled = true; btn.textContent = "Signing in…"; $("#login-error").textContent = "";
      try { await signIn($("#gh-token").value, $("#remember").checked); unlock(); }
      catch (err) { ghToken = null; $("#login-error").textContent = err.message || String(err); }
      finally { btn.disabled = false; btn.textContent = "Sign in"; }
    });
    const saved = tokenStore.get();
    if (saved) {
      signIn(saved, !!(function () { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } })())
        .then(unlock)
        .catch((err) => { tokenStore.clear(); showLogin(err.message); });
    } else showLogin();
  } else {
    if (!loaded) {
      $("#banner").innerHTML = `<div class="banner error"><span class="grow"><strong>assets/data.js didn't load.</strong> Open admin.html from inside the site folder, or use “Open data.js…”.</span></div>`;
      render();
    } else afterLoad();
  }
})();

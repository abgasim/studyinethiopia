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
    const label = () => { btn.textContent = isDark() ? "Light mode" : "Dark mode"; };
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

    regionList.innerHTML = `<button type="button" class="chip" data-region="" aria-pressed="true">All Ethiopia <span class="n">${pinned.length}</span></button>` +
      regions.map(([r, n]) => `<button type="button" class="chip" data-region="${esc(r)}" aria-pressed="false">${esc(r)} <span class="n">${n}</span></button>`).join("");

    function listFor(region) {
      const items = pinned.filter((i) => !region || i.region === region).sort((a, b) => a.name.localeCompare(b.name));
      out.innerHTML = `<h3>${esc(region || "All public institutions")}</h3><ul>${items.map((i) => {
        const n = progsOf(i.id).length;
        return `<li><a href="${profileUrl(i)}">${esc(i.name)}</a><span>${esc(i.city || "")}${n ? ` · ${n} programmes` : ""}</span></li>`;
      }).join("")}</ul>`;
    }

    function popup(c) {
      const region = c.region && c.region !== c.city ? `<span>${esc(c.region)}</span>` : "";
      return `<div class="map-pop"><strong>${esc(c.city)}</strong>${region}<ul>${c.items
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((i) => { const n = progsOf(i.id).length; return `<li><a href="${profileUrl(i)}">${esc(i.name)}</a>${n ? ` <em>${n} programmes</em>` : ""}</li>`; }).join("")}</ul></div>`;
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
      el.innerHTML = `<p class="map-fail">The map couldn't load. Use the region list to browse institutions.</p>`;
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
  const placeOf = (i) => [i.city, i.region && i.region !== i.city ? i.region : ""].filter(Boolean).join(", ");
  const profileUrl = (i) => `institution.html?id=${encodeURIComponent(i.id)}`;

  function levelSummary(list) {
    const c = {};
    list.forEach((p) => { c[p.level] = (c[p.level] || 0) + 1; });
    return LEVELS.filter((l) => c[l]).map((l) => `<span class="lvl">${c[l]} ${esc(LEVEL_PLURAL[l])}</span>`).join("");
  }

  function options(sel, values, label, current) {
    sel.innerHTML = `<option value="">${esc(label)}</option>` + values.map(([v, n]) =>
      `<option value="${esc(v)}"${v === current ? " selected" : ""}>${esc(v)}${n !== undefined ? ` (${n})` : ""}</option>`).join("");
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
    options(sel.category, CATEGORIES.filter((c) => catCounts.has(c)).map((c) => [c, catCounts.get(c)]), "All categories", st.category);
    const regCounts = countBy(all, (i) => i.region);
    options(sel.region, [...regCounts].sort((a, b) => a[0].localeCompare(b[0])), "All regions", st.region);
    const lvlCounts = countBy(all, (i) => [...new Set(progsOf(i.id).map((p) => p.level))]);
    options(sel.level, LEVELS.filter((l) => lvlCounts.has(l)).map((l) => [l, lvlCounts.get(l)]), "Any level", st.level);
    const fldCounts = countBy(all, (i) => [...new Set(progsOf(i.id).map((p) => p.field))]);
    options(sel.field, [...fldCounts].sort((a, b) => a[0].localeCompare(b[0])), "Any field", st.field);

    function card(i, matches) {
      const progs = progsOf(i.id);
      const summary = i.summary || (i.about && i.about[0]) || "";
      const meta = [placeOf(i), i.founded ? `Est. ${i.founded}` : ""].filter(Boolean).join(" · ");
      const match = matches.length
        ? `<ul class="matches">${matches.slice(0, 3).map((p) => `<li>${esc(p.level)} · ${esc(p.name)}</li>`).join("")}${matches.length > 3 ? `<li class="more-m">+${matches.length - 3} more</li>` : ""}</ul>` : "";
      const site = i.website ? `<a href="${esc(i.website)}" target="_blank" rel="noopener">Website ↗</a>` : "";
      return `<article class="card inst" data-type="${i.type}">
        <div class="inst-top">
          <div class="mono" aria-hidden="true">${esc(abbrOf(i))}</div>
          <div>
            <h3><a class="stretch" href="${profileUrl(i)}">${esc(i.name)}</a></h3>
            <span class="badge">${i.type === "public" ? "Public" : "Private"}${i.category ? " · " + esc(i.category) : ""}</span>
            ${meta ? `<div class="meta">${esc(meta)}</div>` : ""}
          </div>
        </div>
        ${summary ? `<p class="summary">${esc(summary)}</p>` : ""}
        ${match}
        ${progs.length ? `<div class="lvls">${levelSummary(progs)}</div>` : ""}
        <div class="inst-actions"><a href="${profileUrl(i)}">${progs.length ? `View ${progs.length} programmes →` : "View profile →"}</a>${site}</div>
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
      count.innerHTML = `${rows.length} of ${all.length} institutions` + (filtered ? ` · <button type="button" class="linkish" id="clear">Clear filters</button>` : "");
      $("#coverage-note").hidden = !(st.level || st.field || (nq && rows.some((r) => r.matches.length)));
      $("#coverage-note").innerHTML = `Programme information has been collected for <strong>${researchedCount()} of ${all.length}</strong> institutions so far, so level and field filters only find those.`;

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
        : `<div class="empty"><p><strong>No institutions match these filters.</strong></p><p>Try removing a filter, or search for a shorter name such as “AAU” or “Jimma”.</p></div>`;

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
      root.innerHTML = `<div class="wrap section"><div class="empty"><p><strong>Institution not found.</strong></p><p><a href="institutions.html">Back to all institutions</a></p></div></div>`;
      return;
    }
    document.title = `${i.name} · Study in Ethiopia`;
    const progs = progsOf(i.id);
    const meta = [placeOf(i), i.founded ? `Established ${i.founded}` : ""].filter(Boolean).join(" · ");
    // Short sourced summary goes first; the older long "about" text is folded away below the programmes
    const about = i.summary ? [i.summary] : (i.about || []).slice(0, 1);
    const more = i.summary ? (i.about || []) : (i.about || []).slice(1);
    const s = i.stats || {};
    const statBits = [
      s.undergraduate && ["Undergraduate", s.undergraduate], s.masters && ["Master's", s.masters],
      s.phd && ["PhD", s.phd], s.postgraduate && ["Postgraduate", s.postgraduate],
    ].filter(Boolean);
    const coverage = {
      partial: "This list is incomplete: it includes only programmes we could confirm on the institution's own pages.",
      most: "This list covers most programmes published on the institution's own pages.",
      none: "",
    }[i.coverage] || "";

    root.innerHTML = `
      <section class="page-head profile-head">
        <div class="wrap">
          <a class="back" href="institutions.html">← All institutions</a>
          <div class="inst-top">
            <div class="mono big" aria-hidden="true">${esc(abbrOf(i))}</div>
            <div>
              <h1>${esc(i.name)}</h1>
              <span class="badge">${i.type === "public" ? "Public" : "Private"}${i.category ? " · " + esc(i.category) : ""}</span>
              ${meta ? `<div class="meta">${esc(meta)}</div>` : ""}
            </div>
          </div>
          ${i.website ? `<a class="btn btn-primary" href="${esc(i.website)}" target="_blank" rel="noopener" style="margin-top:20px">Visit ${esc(domain(i.website))} ↗</a>` : ""}
        </div>
      </section>

      <section class="section profile">
        <div class="wrap profile-grid">
          <div>
            ${about.length ? `<h2>About</h2>${about.map((p) => `<p class="prose-p">${esc(p)}</p>`).join("")}` : ""}
            <h2 id="programmes">Programmes</h2>
            ${progs.length ? `
              ${coverage ? `<p class="note">${esc(coverage)}</p>` : ""}
              <div class="toolbar">
                <div class="search"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                  <label class="visually-hidden" for="p-search">Search programmes</label>
                  <input id="p-search" type="search" placeholder="Search ${progs.length} programmes" autocomplete="off"></div>
                <div class="filters" role="group" aria-label="Filter by level">
                  <button class="chip" type="button" data-level="" aria-pressed="true">All levels</button>
                  ${LEVELS.filter((l) => progs.some((p) => p.level === l)).map((l) => `<button class="chip" type="button" data-level="${esc(l)}" aria-pressed="false">${esc(l)} <span class="n">${progs.filter((p) => p.level === l).length}</span></button>`).join("")}
                </div>
              </div>
              <div id="p-list"></div>`
            : `<p class="note">${esc(i.coverageNote || "We haven't collected this institution's programmes yet. Check its website for the current list.")}</p>`}
            ${more.length ? `<details class="more-about"><summary>More about ${esc(i.name)}</summary>${more.map((p) => `<p class="prose-p">${esc(p)}</p>`).join("")}</details>` : ""}
          </div>
          <aside class="side-facts">
            <div class="card"><h3>Accreditation</h3>
              <p class="small" style="margin:0 0 8px">Check this institution's programmes in the Education and Training Authority's register before enrolling.</p>
              <a href="https://accreditation.neta.gov.et/" target="_blank" rel="noopener">ETA accreditation register ↗</a>
              <p class="small"><a href="apply.html">Coming from abroad? See how to apply →</a></p></div>
            ${statBits.length ? `<div class="card"><h3>Programmes offered</h3><dl class="facts">${statBits.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
              <p class="small">As stated by ${s.source ? `<a href="${esc(s.source)}" target="_blank" rel="noopener">${esc(domain(s.source))}</a>` : "the institution"}${s.asOf ? ` (${esc(s.asOf)})` : ""}.</p></div>` : ""}
            ${(i.colleges || []).length ? `<div class="card"><h3>Colleges &amp; institutes</h3><ul class="plain">${i.colleges.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div>` : ""}
            ${(i.sources || []).length ? `<div class="card"><h3>Sources</h3><ul class="plain">${i.sources.map((x) => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.label || domain(x.url))}</a>${x.kind === "secondary" ? ' <span class="small">(secondary)</span>' : ""}</li>`).join("")}</ul>
              ${i.checked ? `<p class="small">Last checked ${esc(new Date(i.checked + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }))}.</p>` : ""}</div>` : ""}
          </aside>
        </div>
      </section>`;

    if (!progs.length) return;
    const input = $("#p-search"), out = $("#p-list");
    const chips = [...root.querySelectorAll("[data-level]")];
    let level = "";
    function draw() {
      const q = norm(input.value.trim());
      const rows = progs.filter((p) => (!level || p.level === level) && (!q || norm(p.name).includes(q) || norm(p.college).includes(q) || norm(p.field).includes(q)));
      chips.forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.level === level)));
      if (!rows.length) { out.innerHTML = `<div class="empty"><p>No programmes match.</p></div>`; return; }
      out.innerHTML = LEVELS.filter((l) => rows.some((p) => p.level === l)).map((l) => {
        const items = rows.filter((p) => p.level === l);
        return `<h3 class="lvl-head">${esc(l)} <span class="n">${items.length}</span></h3>
          <ul class="prog-table">${items.map((p) => `<li>
            <div><strong>${esc(p.name)}</strong><span>${esc([p.college, p.field].filter(Boolean).join(" · "))}</span></div>
            ${p.source ? `<a class="src" href="${esc(p.source)}" target="_blank" rel="noopener" title="Source: ${esc(domain(p.source))}">Source ↗</a>` : ""}
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

    options(sel.level, LEVELS.map((l) => [l, progs.filter((p) => p.level === l).length]).filter(([, n]) => n), "Any level", st.level);
    options(sel.field, [...countBy(progs, (p) => p.field)].sort((a, b) => a[0].localeCompare(b[0])), "Any field", st.field);
    options(sel.region, [...countBy(progs, (p) => instById.get(p.institution).region)].sort((a, b) => a[0].localeCompare(b[0])), "Any region", st.region);
    sel.type.innerHTML = `<option value="">Public &amp; private</option><option value="public"${st.type === "public" ? " selected" : ""}>Public</option><option value="private"${st.type === "private" ? " selected" : ""}>Private</option>`;
    $("#prog-coverage").innerHTML = `Programme lists come from each institution's own website. So far they cover <strong>${researchedCount()}</strong> of ${(D.institutions || []).length} institutions; more are being added.`;

    let limit = 40;
    function draw() {
      const q = norm(st.q.trim());
      const rows = progs.filter((p) => {
        const i = instById.get(p.institution);
        return (!st.level || p.level === st.level) && (!st.field || p.field === st.field) &&
          (!st.region || i.region === st.region) && (!st.type || i.type === st.type) &&
          (!q || norm(p.name).includes(q) || norm(p.field).includes(q));
      });
      // Group by level + normalised name so "Civil Engineering" at several institutions appears once
      const groups = new Map();
      rows.forEach((p) => {
        const k = p.level + "|" + norm(p.name).replace(/[^a-z0-9]+/g, " ").trim();
        if (!groups.has(k)) groups.set(k, { name: p.name, level: p.level, field: p.field, items: [] });
        groups.get(k).items.push(p);
      });
      const list = [...groups.values()].sort((a, b) => b.items.length - a.items.length || a.name.localeCompare(b.name) || LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level));
      count.textContent = `${list.length} programmes · ${rows.length} offerings`;
      out.innerHTML = list.length ? list.slice(0, limit).map((g) => `
        <article class="card prog-card">
          <div class="prog-card-head"><h3>${esc(g.name)}</h3><span class="badge">${esc(g.level)}${g.field ? " · " + esc(g.field) : ""}</span></div>
          <ul class="offered">${g.items.map((p) => { const i = instById.get(p.institution); return `<li><a href="${profileUrl(i)}#programmes">${esc(i.name)}</a>${placeOf(i) ? `<span>${esc(placeOf(i))}</span>` : ""}</li>`; }).join("")}</ul>
        </article>`).join("") + (list.length > limit ? `<div class="more-wrap"><button class="btn btn-ghost" type="button" id="more">Show more (${list.length - limit} left)</button></div>` : "")
        : `<div class="empty"><p><strong>No programmes match.</strong></p><p>Try a broader word, e.g. “Engineering” or “Nursing”, or remove a filter.</p></div>`;
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
      <div><strong>${esc(l.name)}</strong><small>${internal ? "Guide on this site" : esc(domain(l.website))}</small></div>${internal ? '<span class="arrow" aria-hidden="true">→</span>' : ARROW}</a>`;
  }

  function renderAbroad() {
    const c = $("#countries");
    if (c) c.innerHTML = (D.studyAbroad || []).map((s) => `
      <a class="card link-card" href="${esc(s.website)}" target="_blank" rel="noopener">
        <img class="flag" src="assets/img/flags/${esc(s.code)}.png" alt="" loading="lazy">
        <div><strong>${esc(s.name)}</strong><small>${esc(s.label || domain(s.website))}</small></div>${ARROW}
      </a>`).join("");

    const t = $("#tests");
    if (t) t.innerHTML = (D.languageTests || []).map((x) => `
      <a class="card link-card tall" href="${esc(x.website)}" target="_blank" rel="noopener">
        <img class="logo" src="assets/img/logos/${esc(x.code)}.png" alt="${esc(x.name)} logo" loading="lazy">
        <div><strong>${esc(x.name)}</strong><small>${esc(x.label)}</small>
        <p>${x.code === "ielts" ? "Test centres in Ethiopia: " : ""}${esc(x.note)}</p></div>
      </a>`).join("");

    const p = $("#practice");
    if (p) p.innerHTML = (D.practice || []).map((x) => `
      <a class="card link-card" href="${esc(x.website)}" target="_blank" rel="noopener">
        <img class="logo" src="assets/img/logos/${esc(x.code)}.png" alt="" loading="lazy">
        <div><strong>${esc(x.name)}</strong><small>${esc(domain(x.website))}</small></div>${ARROW}
      </a>`).join("");
  }

  function renderLearn() {
    const m = $("#moocs");
    if (m) m.innerHTML = (D.moocs || []).map((x) => `
      <a class="card link-card tall" href="${esc(x.website)}" target="_blank" rel="noopener">
        <img class="logo" src="assets/img/logos/${esc(x.code)}.png" alt="${esc(x.name)} logo" loading="lazy">
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

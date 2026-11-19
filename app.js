(() => {
  const DATA = window.CATALOGUE || [];
  const ICONS = window.ICONS || {};
  const $ = (s, r = document) => r.querySelector(s);
  const icon = n => `<svg class="ic" viewBox="0 0 256 256" aria-hidden="true">${ICONS[n] || ""}</svg>`;
  const fmt = d => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  const month = d => { const s = new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { month: "long", year: "numeric" }); return s[0].toUpperCase() + s.slice(1); };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const url = u => /^https?:\/\//i.test(u) ? u : "#";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Visuel de repli : motif textile généré. Une vraie capture (champ img) le remplace. */
  function art(p) {
    const [a, b, c, d] = p.pal, v = p.v || 0;
    let s = `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(p.caption)}"><rect width="400" height="300" fill="${d}"/>`;
    if (p.pattern === "wax") {
      const step = 100 - v * 12;
      for (let y = -step / 2; y < 340; y += step)
        for (let x = ((Math.round(y / step) + v) % 2) * (step / 2) - step / 2; x < 440; x += step) {
          const r = step * .48;
          s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${a}"/><circle cx="${x}" cy="${y}" r="${r * .72}" fill="${b}"/><circle cx="${x}" cy="${y}" r="${r * .46}" fill="${c}"/><circle cx="${x}" cy="${y}" r="${r * .2}" fill="${d}"/>`;
        }
    } else if (p.pattern === "kente") {
      const w = 40 + v * 8;
      for (let i = 0; i * w < 400; i++) s += `<rect x="${i * w}" width="${w}" height="300" fill="${[a, b, c, d][i % 4]}"/>`;
      for (let j = 0; j < 8; j++) s += `<rect y="${j * 40 + 8}" width="400" height="${12 + v * 3}" fill="${[c, a, b][j % 3]}" opacity=".8"/>`;
      for (let i = 0; i < 10; i++) for (let j = 0; j < 8; j++) if ((i + j + v) % 3 === 0) s += `<rect x="${i * 44 + 10}" y="${j * 40 + 2}" width="22" height="22" fill="${d}" opacity=".7"/>`;
    } else if (p.pattern === "bogolan") {
      s += `<rect width="400" height="300" fill="${a}"/>`;
      for (let y = 0; y < 300; y += 60) {
        s += `<rect y="${y + 4}" width="400" height="8" fill="${b}"/>`;
        for (let x = (y / 60 % 2) * 25 + v * 10; x < 420; x += 50)
          s += `<path d="M${x} ${y + 24}l12 12 12-12-12-12z" fill="${c}"/><path d="M${x + 12} ${y + 40}v12M${x + 6} ${y + 46}h12" stroke="${b}" stroke-width="4"/><circle cx="${x + 12}" cy="${y + 28}" r="3" fill="${b}"/>`;
      }
    } else if (p.pattern === "ndebele") {
      const n = 4 + v;
      for (let i = 0; i < n; i++) { const k = i * (110 / n); s += `<rect x="${k}" y="${k * .7}" width="${400 - k * 2}" height="${300 - k * 1.4}" fill="${[a, b, c, a][i % 4]}" stroke="${d}" stroke-width="6"/>`; }
      for (let i = 0; i < 12; i++) s += `<path d="M${i * 36} 300l18-34 18 34z" fill="${[c, b, a][i % 3]}"/><path d="M${i * 36} 0l18 34 18-34z" fill="${[b, c, a][i % 3]}"/>`;
    } else {
      s += `<rect width="400" height="300" fill="${a}"/>`;
      for (let i = 0; i < 18; i++) {
        const x = 12 + i * 22 + (i % 2) * 4;
        s += `<path d="M${x} 0c${12 + v * 4} 50-${12 + v * 4} 100 0 150s-${12 + v * 4} 100 0 150" fill="none" stroke="${d}" stroke-width="9"/>`;
        for (let k = 0; k < 4; k++) s += `<circle cx="${x + (k % 2 ? 4 : -4)}" cy="${40 + k * 62 + (i % 3) * 8}" r="${5 + (k % 2) * 2}" fill="${k % 2 ? b : c}"/>`;
      }
    }
    return s + "</svg>";
  }
  const visual = p => p.img ? `<img src="${esc(p.img)}" alt="${esc(p.caption)}" loading="lazy" decoding="async">` : art(p);
    document.querySelectorAll("[data-icon]").forEach(el => { el.innerHTML = ICONS[el.dataset.icon] || ""; });

  /* Hero : vidéo d'ambiance (4 scènes de 4 s), vignettes = chapitres */
  const heroItems = ["boubou-wax", "bogolan-deco", "gele-ankara", "tresses-fulani"].map(id => DATA.find(i => i.id === id)).filter(Boolean);
  const chapters = [0.2, 5, 9, 13];                       // début de chaque scène, en secondes
  const video = $("#casVideo"), swatches = $("#casSwatches"), pauseBtn = $("#casPause");
  swatches.innerHTML = heroItems.map((it, k) => `<button type="button" data-k="${k}" aria-label="Aller à : ${esc(it.name)}"><img src="${esc(it.previews[0].img)}" alt=""></button>`).join("");
  let heroIdx = -1;
  function label(k) {
    if (k === heroIdx) return; heroIdx = k;
    [...swatches.children].forEach((b, i) => b.setAttribute("aria-current", String(i === k)));
    $("#casName").textContent = heroItems[k].name;
    $("#casKind").textContent = `${heroItems[k].type === "cc" ? "CC" : "Mod"}, ${heroItems[k].category.toLowerCase()}`;
  }
  const sceneAt = t => Math.min(heroItems.length - 1, Math.floor((t + 0.6) / 4));
  video.addEventListener("timeupdate", () => label(sceneAt(video.currentTime)));
  swatches.addEventListener("click", e => { const b = e.target.closest("button"); if (b) { video.currentTime = chapters[+b.dataset.k]; label(+b.dataset.k); } });
  function setPlaying(on) {
    pauseBtn.setAttribute("aria-label", on ? "Mettre la vidéo en pause" : "Lire la vidéo");
    pauseBtn.querySelector("svg").innerHTML = ICONS[on ? "pause" : "play"];
  }
  pauseBtn.addEventListener("click", () => { video.paused ? video.play() : video.pause(); });
  video.addEventListener("play", () => setPlaying(true)); video.addEventListener("pause", () => setPlaying(false));
  label(0);
  if (reduce) { video.removeAttribute("autoplay"); setPlaying(false); } else { video.play().catch(() => setPlaying(false)); }

  /* Petits plumbobs qui montent doucement dans le hero */
  if (!reduce) {
    const pl = '<svg viewBox="0 0 100 160" aria-hidden="true"><path class="f1" d="M50 4 14 80h36z"/><path class="f2" d="M50 4 86 80H50z"/><path class="f3" d="M14 80 50 156V80z"/><path class="f4" d="M86 80 50 156V80z"/></svg>';
    $("#floaties").innerHTML = [8, 22, 38, 55, 72, 90].map((x, i) => `<span style="--x:${x}%;--d:${9 + (i % 3) * 3}s;--w:${i * 1.7}s;--s:${0.6 + (i % 3) * 0.25}">${pl}</span>`).join("");
  }

  /* Révélation à l'entrée dans l'écran (IntersectionObserver, une seule fois) */
  const io = "IntersectionObserver" in window && !reduce ? new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { rootMargin: "0px 0px -8% 0px" }) : null;
  const reveal = el => io ? io.observe(el) : el.classList.add("in");

  const state = { type: "all", q: "", country: "" };
  const grid = $("#grid"), empty = $("#empty"), count = $("#count");
  const match = it => (state.type === "all" || it.type === state.type) && (!state.country || it.countries.includes(state.country)) &&
    (!state.q || [it.name, it.category, it.region, it.blurb, ...it.tags, ...it.countries].join(" ").toLowerCase().includes(state.q));
  const allCountries = [...new Set(DATA.flatMap(i => i.countries))].sort((a, b) => a.localeCompare(b, "fr"));
  function renderChips() {
    $("#geoChips").innerHTML = ["", ...allCountries].map(c => `<button type="button" class="chip" data-country="${esc(c)}" aria-pressed="${state.country === c}">${c ? esc(c) : "Tous les pays"}${c ? `<small>${DATA.filter(i => i.countries.includes(c)).length}</small>` : ""}</button>`).join("");
  }

  function render() {
    const list = DATA.filter(match);
    grid.innerHTML = list.map((it, i) => `
      <article class="item" style="--i:${i % 4}">
        <button class="media" type="button" data-open="${it.id}" aria-label="Voir les ${it.previews.length} aperçus de ${esc(it.name)}">${visual(it.previews[0])}</button>
        <div class="info">
          <div>
            <p class="kind">${it.type === "cc" ? "CC" : "Mod"}, ${esc(it.category.toLowerCase())}</p>
            <h3>${esc(it.name)}</h3>
          </div>
          <p class="blurb">${esc(it.blurb)}</p>
          <div class="where">${icon("map-pin")}${it.countries.map(c => `<button type="button" class="mini-chip" data-country="${esc(c)}" aria-label="Filtrer : ${esc(c)}">${esc(c)}</button>`).join("")}</div>
          <dl class="specs">
            <div><dt>Version</dt><dd>${esc(it.version)}</dd></div>
            <div><dt>Mise à jour</dt><dd>${fmt(it.updates[0].date)}</dd></div>
            <div><dt>Taille</dt><dd>${esc(it.size)}</dd></div>
          </dl>
          ${it.requires ? `<p class="note">${icon("info")}<span>${esc(it.requires)}</span></p>` : ""}
          <div class="actions">
            <a class="btn btn-primary" href="${url(it.download)}" target="_blank" rel="noopener noreferrer" aria-label="Télécharger ${esc(it.name)} (nouvel onglet)">${icon("download-simple")}Télécharger</a>
            <button class="btn btn-ghost" type="button" data-open="${it.id}">${icon("images")}${it.previews.length} aperçus</button>
          </div>
        </div>
      </article>`).join("");
    grid.querySelectorAll(".item").forEach(reveal);
    empty.hidden = list.length > 0; grid.hidden = !list.length;
    count.textContent = `${list.length} contenu${list.length > 1 ? "s" : ""} affiché${list.length > 1 ? "s" : ""}`;
  }

  function renderUpdates() {
    const all = DATA.flatMap(it => it.updates.map(u => ({ ...u, it }))).sort((a, b) => b.date.localeCompare(a.date));
    const groups = new Map();
    all.forEach(u => { const k = month(u.date); (groups.get(k) || groups.set(k, []).get(k)).push(u); });
    $("#updates").innerHTML = [...groups].map(([m, us], gi) => `
      <section class="upd-group" style="--i:${gi}" aria-label="${m}">
        <h3><svg class="plumbob" viewBox="0 0 100 160" aria-hidden="true"><path class="f1" d="M50 4 14 80h36z"/><path class="f2" d="M50 4 86 80H50z"/><path class="f3" d="M14 80 50 156V80z"/><path class="f4" d="M86 80 50 156V80z"/></svg>${m}</h3>
        ${us.map(u => `
          <div class="upd">
            <time datetime="${u.date}">${fmt(u.date)}</time>
            <div>
              <h4>${esc(u.it.name)}<span>version ${esc(u.v)}</span></h4>
              <p>${esc(u.note)}</p>
              <a href="${url(u.it.download)}" target="_blank" rel="noopener noreferrer" aria-label="Télécharger ${esc(u.it.name)} (nouvel onglet)">${icon("download-simple")}Télécharger</a>
            </div>
          </div>`).join("")}
      </section>`).join("");
  }

  document.querySelectorAll(".seg-btn").forEach(b => b.addEventListener("click", () => {
    state.type = b.dataset.type;
    document.querySelectorAll(".seg-btn").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    render();
  }));
  $("#q").addEventListener("input", e => { state.q = e.target.value.trim().toLowerCase(); render(); });
  $("#reset").addEventListener("click", () => {
    state.type = "all"; state.q = ""; state.country = ""; $("#q").value = ""; renderChips();
    document.querySelectorAll(".seg-btn").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.type === "all")));
    render();
  });

  document.addEventListener("click", e => {
    const c = e.target.closest("[data-country]"); if (!c) return;
    const fromCard = c.classList.contains("mini-chip");
    state.country = state.country === c.dataset.country && !fromCard ? "" : c.dataset.country;
    if (fromCard && state.country === c.dataset.country) { /* reste filtré */ }
    renderChips(); render();
    if (fromCard) $("#catalogue").scrollIntoView();
  });

  /* Galerie */
  const lb = $("#lb");
  let cur = null, idx = 0, opener = null;
  function show(i) {
    idx = (i + cur.previews.length) % cur.previews.length;
    const p = cur.previews[idx];
    $("#lb-img").innerHTML = visual(p);
    $("#lb-cap").textContent = p.caption;
    $("#lb-thumbs").querySelectorAll("button").forEach((b, k) => b.setAttribute("aria-current", String(k === idx)));
  }
  function open(id, from) {
    cur = DATA.find(i => i.id === id); opener = from;
    $("#lb-title").textContent = cur.name;
    $("#lb-dl").href = url(cur.download);
    $("#lb-thumbs").innerHTML = cur.previews.map((p, k) => `<button type="button" data-k="${k}" aria-label="Aperçu ${k + 1} : ${esc(p.caption)}">${p.img ? `<img src="${esc(p.img)}" alt="">` : art(p)}</button>`).join("");
    lb.showModal(); show(0);
  }
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-open]"); if (t) return open(t.dataset.open, t);
    const k = e.target.closest("#lb-thumbs button"); if (k) return show(+k.dataset.k);
    if (e.target === lb) lb.close();
  });
  $("#lb-close").addEventListener("click", () => lb.close());
  $("#lb-prev").addEventListener("click", () => show(idx - 1));
  $("#lb-next").addEventListener("click", () => show(idx + 1));
  lb.addEventListener("keydown", e => { if (e.key === "ArrowLeft") show(idx - 1); if (e.key === "ArrowRight") show(idx + 1); });
  lb.addEventListener("close", () => opener && opener.focus());

  renderChips(); render(); renderUpdates();
})();

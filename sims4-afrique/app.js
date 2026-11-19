(() => {
  const DATA = window.CATALOGUE || [];
  const $ = (s, r = document) => r.querySelector(s);
  const ico = n => `<svg class="ic" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  const fmt = d => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = u => /^https?:\/\//i.test(u) ? u : "#";

  /* ---- Aperçus : motifs africains générés en SVG ---- */
  function art(p, uid) {
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
        for (let x = (y / 60 % 2) * 25 + v * 10; x < 420; x += 50) {
          s += `<path d="M${x} ${y + 24}l12 12 12-12-12-12z" fill="${c}"/><path d="M${x + 12} ${y + 40}v12M${x + 6} ${y + 46}h12" stroke="${b}" stroke-width="4"/><circle cx="${x + 12}" cy="${y + 28}" r="3" fill="${b}"/>`;
        }
      }
    } else if (p.pattern === "ndebele") {
      const n = 4 + v;
      for (let i = 0; i < n; i++) {
        const inset = i * (110 / n);
        s += `<rect x="${inset}" y="${inset * .7}" width="${400 - inset * 2}" height="${300 - inset * 1.4}" fill="${[a, b, c, a][i % 4]}" stroke="${d}" stroke-width="6"/>`;
      }
      for (let i = 0; i < 12; i++) s += `<path d="M${i * 36} 300l18-34 18 34z" fill="${[c, b, a][i % 3]}"/><path d="M${i * 36} 0l18 34 18-34z" fill="${[b, c, a][i % 3]}"/>`;
    } else { // fulani : tresses & perles
      s += `<rect width="400" height="300" fill="${a}"/>`;
      for (let i = 0; i < 18; i++) {
        const x = 12 + i * 22 + (i % 2) * 4;
        s += `<path d="M${x} 0c${12 + v * 4} 50-${12 + v * 4} 100 0 150s-${12 + v * 4} 100 0 150" fill="none" stroke="${d}" stroke-width="9" opacity=".95"/>`;
        for (let k = 0; k < 4; k++) s += `<circle cx="${x + (k % 2 ? 4 : -4)}" cy="${40 + k * 62 + (i % 3) * 8}" r="${5 + (k % 2) * 2}" fill="${k % 2 ? b : c}"/>`;
      }
    }
    return s + `</svg>`;
  }

  const state = { type: "all", q: "" };
  const grid = $("#grid"), empty = $("#empty"), count = $("#count");

  const matches = it => (state.type === "all" || it.type === state.type) &&
    (!state.q || [it.name, it.category, it.region, it.blurb, ...it.tags].join(" ").toLowerCase().includes(state.q));

  function render() {
    const list = DATA.filter(matches);
    grid.innerHTML = list.map((it, i) => `
      <article class="card" style="--i:${i}">
        <button class="thumb" type="button" data-open="${it.id}" aria-label="Voir les ${it.previews.length} aperçus de ${esc(it.name)}">
          ${art(it.previews[0])}
          <span class="badge ${it.type}">${it.type === "cc" ? "CC" : "Mod"}</span>
          <span class="count">${ico("images")}${it.previews.length} aperçus</span>
        </button>
        <div class="body">
          <p class="meta">${esc(it.category)} · ${esc(it.region)}</p>
          <h3>${esc(it.name)}</h3>
          <p class="blurb">${esc(it.blurb)}</p>
          <ul class="tags">${it.tags.map(t => `<li>${esc(t)}</li>`).join("")}</ul>
          ${it.requires ? `<p class="req">${ico("info")}<span>${esc(it.requires)}</span></p>` : ""}
          <div class="actions">
            <p class="ver"><strong>v${esc(it.version)}</strong> · mis à jour le ${fmt(it.updates[0].date)} · ${esc(it.size)}</p>
            <a class="btn btn-primary btn-sm" href="${safeUrl(it.download)}" target="_blank" rel="noopener noreferrer">${ico("download")}Télécharger</a>
            <button class="btn btn-ghost btn-sm" type="button" data-open="${it.id}">${ico("images")}Galerie</button>
          </div>
        </div>
      </article>`).join("");
    empty.hidden = list.length > 0;
    grid.hidden = list.length === 0;
    count.textContent = `${list.length} ${list.length > 1 ? "contenus" : "contenu"} affiché${list.length > 1 ? "s" : ""}`;
  }

  function renderUpdates() {
    const all = DATA.flatMap(it => it.updates.map(u => ({ ...u, it })))
      .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
    $("#updates").innerHTML = all.map(u => `
      <li>
        <div class="when">${fmt(u.date)}</div>
        <div>
          <h3>${esc(u.it.name)} <span class="vtag">v${esc(u.v)}</span></h3>
          <p>${esc(u.note)}</p>
          <a href="${safeUrl(u.it.download)}" target="_blank" rel="noopener noreferrer">Télécharger la dernière version</a>
        </div>
      </li>`).join("");
    const last = all[0];
    $("#stat-last").textContent = last ? fmt(last.date) : "—";
    $("#stat-cc").textContent = DATA.filter(i => i.type === "cc").length;
    $("#stat-mod").textContent = DATA.filter(i => i.type === "mod").length;
  }

  /* ---- Filtres ---- */
  document.querySelectorAll(".seg-btn").forEach(b => b.addEventListener("click", () => {
    state.type = b.dataset.type;
    document.querySelectorAll(".seg-btn").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    render();
  }));
  $("#q").addEventListener("input", e => { state.q = e.target.value.trim().toLowerCase(); render(); });
  $("#reset").addEventListener("click", () => {
    state.type = "all"; state.q = ""; $("#q").value = "";
    document.querySelectorAll(".seg-btn").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.type === "all")));
    render();
  });

  /* ---- Galerie ---- */
  const lb = $("#lb");
  let cur = null, idx = 0, opener = null;
  function show(i) {
    idx = (i + cur.previews.length) % cur.previews.length;
    const p = cur.previews[idx];
    $("#lb-img").innerHTML = p.img ? `<img src="${esc(p.img)}" alt="${esc(p.caption)}">` : art(p);
    $("#lb-cap").textContent = `${idx + 1}/${cur.previews.length} — ${p.caption}`;
    $("#lb-thumbs").querySelectorAll("button").forEach((b, k) => b.setAttribute("aria-current", String(k === idx)));
  }
  function open(id, from) {
    cur = DATA.find(i => i.id === id); opener = from;
    $("#lb-title").textContent = cur.name;
    $("#lb-dl").href = safeUrl(cur.download);
    $("#lb-thumbs").innerHTML = cur.previews.map((p, k) => `<button type="button" aria-label="Aperçu ${k + 1} : ${esc(p.caption)}" data-k="${k}">${art(p)}</button>`).join("");
    lb.showModal(); show(0);
  }
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-open]"); if (t) open(t.dataset.open, t);
    const k = e.target.closest("#lb-thumbs button"); if (k) show(+k.dataset.k);
    if (e.target === lb) lb.close();
  });
  $("#lb-close").addEventListener("click", () => lb.close());
  $("#lb-prev").addEventListener("click", () => show(idx - 1));
  $("#lb-next").addEventListener("click", () => show(idx + 1));
  lb.addEventListener("keydown", e => { if (e.key === "ArrowLeft") show(idx - 1); if (e.key === "ArrowRight") show(idx + 1); });
  lb.addEventListener("close", () => opener && opener.focus());

  render(); renderUpdates();
})();

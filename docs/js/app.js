/* ═══════════════════════════════════════════
   TERMINUS v2 — BRVM FINANCIAL INTELLIGENCE
   Main Application Engine
═══════════════════════════════════════════ */

let DATA = SAMPLE_DATA;
let isDark = true;
let charts = {};

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  await loadRealData();
  updateClock();
  setInterval(updateClock, 1000);
  buildTicker();
  setupAutomationRunner();
  renderOverview();
});

// ═══════════════════════════════════════════
// AUTOMATION RUNNER (LOCAL API)
// ═══════════════════════════════════════════
function setupAutomationRunner() {
  const btn = document.getElementById('run-automation-btn');
  const statusEl = document.getElementById('run-automation-status');
  const ownerEl = document.getElementById('gh-owner');
  const repoEl = document.getElementById('gh-repo');
  const refEl = document.getElementById('gh-ref');
  const tokenEl = document.getElementById('gh-token');
  if(!btn || !statusEl) return;

  const setStatus = (msg, type='') => {
    statusEl.textContent = msg;
    statusEl.classList.remove('ok', 'err', 'busy');
    if(type) statusEl.classList.add(type);
  };

  btn.addEventListener('click', async () => {
    const owner = (ownerEl?.value || '').trim();
    const repo = (repoEl?.value || '').trim();
    const ref = (refEl?.value || 'main').trim();
    const token = (tokenEl?.value || '').trim();

    if(!owner || !repo || !ref || !token) {
      setStatus('Renseigne owner, repo, branche et token GitHub.', 'err');
      return;
    }

    btn.disabled = true;
    setStatus('Déclenchement du workflow GitHub en cours...', 'busy');

    try {
      const workflowFile = 'daily-automation.yml';
      const dispatchUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowFile}/dispatches`;

      const resp = await fetch(dispatchUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ref,
          inputs: { trigger_source: 'docs-site' }
        })
      });

      if(resp.status !== 204) {
        const data = await resp.json().catch(() => ({}));
        const msg = data?.message || 'Erreur lors du déclenchement du workflow.';
        setStatus(msg, 'err');
        return;
      }

      const runsUrl = `https://github.com/${owner}/${repo}/actions/workflows/daily-automation.yml`;
      setStatus(`Workflow lancé avec succès. Suivi: ${runsUrl}`, 'ok');
    } catch (e) {
      setStatus('Impossible de joindre l\'API GitHub. Vérifie la connexion réseau.', 'err');
    } finally {
      btn.disabled = false;
    }
  });
}

async function loadRealData() {
  try {
    const r = await fetch('data/dashboard.json');
    if (r.ok) { const j = await r.json(); DATA = { ...SAMPLE_DATA, ...j }; }
  } catch(e) { console.log('[TERMINUS] Using sample data'); }
  try {
    const r2 = await fetch('data/backtest_logs.json');
    if (r2.ok) { const j2 = await r2.json(); if(j2&&j2.length) DATA.allLogs = j2; }
  } catch(e) {}
}

// ═══════════════════════════════════════════
// CLOCK
// ═══════════════════════════════════════════
function updateClock() {
  document.getElementById('clock').textContent = new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
}

// ═══════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════
function toggleTheme() {
  isDark = !isDark;
  document.body.classList.toggle('light', !isDark);
  document.querySelector('.theme-btn').textContent = isDark ? '☀ LIGHT' : '🌙 DARK';
  // Rebuild charts for theme
  const page = document.querySelector('.tab.active')?.dataset?.tab;
  if(page) renderPage(page);
}

// ═══════════════════════════════════════════
// SIDEBAR / MENU
// ═══════════════════════════════════════════
function toggleMenu() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('nav-overlay');
  const hb = document.getElementById('hamburger-btn');
  const isOpen = sb.classList.contains('open');
  if(isOpen) closeMenu(); else openMenu();
}
function openMenu() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('nav-overlay').classList.add('open');
  document.getElementById('hamburger-btn').classList.add('open');
}
function closeMenu() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('nav-overlay').classList.remove('open');
  document.getElementById('hamburger-btn').classList.remove('open');
}

// ═══════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════
function showTab(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('panel-' + name)?.classList.add('active');
  document.querySelector(`[data-tab="${name}"]`)?.classList.add('active');
  document.querySelector('.content').scrollTo({top:0,behavior:'smooth'});
  // Auto-close menu on mobile
  if(window.innerWidth < 768) closeMenu();
  renderPage(name);
}

function renderPage(page) {
  switch(page) {
    case 'overview':  renderOverview();  break;
    case 'portfolio': renderPortfolio(); break;
    case 'signals':   renderSignals();   break;
    case 'backtests': renderBacktests(); break;
    case 'bonds':     renderBonds();     break;
    case 'logs':      renderLogs();      break;
  }
}

// ═══════════════════════════════════════════
// TICKER
// ═══════════════════════════════════════════
function buildTicker() {
  const core = DATA.core || [];
  const sigs = (DATA.signals?.current || []).slice(0,8);
  const items = [];
  core.forEach(c => {
    const chg = c.pnlPct || 0;
    items.push({s:c.symbol, v:fmt.num(c.currentPrice), c:fmt.pct(chg), p:chg>=0});
  });
  sigs.filter(s=>s.signal!=='Hold').slice(0,5).forEach(s => {
    items.push({s:s.symbol, v:fmt.num(s.price), c:s.signal, p:s.zScore<0});
  });
  if(!items.length) items.push({s:'BRVM',v:'TERMINUS',c:'v2.0',p:true});
  const html = [...items,...items].map(ti => `
    <span class="ti"><span class="ti-s">${ti.s}</span><span class="ti-v">${ti.v}</span><span class="ti-c ${ti.p?'p':'n'}">${ti.c}</span></span>`).join('');
  document.getElementById('ticker').innerHTML = html;
}

// ═══════════════════════════════════════════
// FORMAT HELPERS
// ═══════════════════════════════════════════
const fmt = {
  num: v => v==null ? '-' : Number(v).toLocaleString('fr-FR'),
  pct: v => v==null ? '-' : (v>=0?'+':'')+Number(v).toFixed(2)+'%',
  fcfa: v => v==null ? '-' : Number(v).toLocaleString('fr-FR')+' FCFA',
  arrow: v => v>=0 ? '▲' : '▼',
  sigClass: s => {
    if(!s) return 'hold';
    const l=s.toLowerCase();
    if(l.includes('strong buy')) return 'strong-buy';
    if(l.includes('buy')) return 'buy';
    if(l.includes('strong sell')) return 'strong-sell';
    if(l.includes('sell')) return 'sell';
    return 'hold';
  },
  zsColor: z => {
    if(z==null) return 'var(--td)';
    if(z<=-3) return 'var(--g)';
    if(z<=-2.5) return '#6ee7b7';
    if(z>=3) return 'var(--r)';
    if(z>=2.5) return '#fca5a5';
    return 'var(--td)';
  }
};

// ═══════════════════════════════════════════
// CHART THEME
// ═══════════════════════════════════════════
function chartColors() {
  const lt = document.body.classList.contains('light');
  return {
    grid: lt ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)',
    text: lt ? '#7a95aa' : '#3d5a72',
    green: lt ? '#007a40' : '#00e57a',
    red: lt ? '#cc1e3e' : '#ff2d55',
    amber: lt ? '#9a6e00' : '#ffb700',
    blue: lt ? '#005fa3' : '#0af',
    purple: lt ? '#6600cc' : '#b060ff',
    bg: lt ? '#dde5ef' : '#0b1018',
    border: lt ? '#b0c0d0' : '#1c2a3a'
  };
}

function chartOpts(unit) {
  const c = chartColors();
  return {
    responsive:true, maintainAspectRatio:false,
    interaction:{mode:'index',intersect:false},
    plugins:{
      legend:{labels:{color:c.text,font:{family:'IBM Plex Mono',size:9},usePointStyle:true,padding:10}},
      tooltip:{backgroundColor:c.bg,titleColor:c.green,bodyColor:c.text,borderColor:c.border,borderWidth:1,
        titleFont:{family:'IBM Plex Mono',size:11},bodyFont:{family:'IBM Plex Mono',size:10},padding:8,cornerRadius:0}
    },
    scales:{
      x:{ticks:{color:c.text,font:{family:'IBM Plex Mono',size:8},maxTicksLimit:10},grid:{color:c.grid}},
      y:{ticks:{color:c.text,font:{family:'IBM Plex Mono',size:8},callback:v=>unit==='FCFA'?(v/1000).toFixed(0)+'k':v+'%'},grid:{color:c.grid}}
    }
  };
}

// ═══════════════════════════════════════════
// PAGE: OVERVIEW
// ═══════════════════════════════════════════
function renderOverview() {
  const o = DATA.overview;
  setText('kv-total', fmt.fcfa(o.totalValue));
  const ytdCls = o.ytdReturn >= 0 ? 'g' : 'r';
  const ytdEl = document.getElementById('kv-ytd');
  if(ytdEl) { ytdEl.textContent = fmt.pct(o.ytdReturn); ytdEl.className = 'kpi-val '+ytdCls; }
  setText('ks-ytd', `Sharpe ${(o.sharpeRatio||0).toFixed(2)}`);

  const dailyEl = document.getElementById('kv-daily');
  if(dailyEl) { dailyEl.textContent = fmt.fcfa(o.dailyPnl); dailyEl.className = 'kpi-val '+(o.dailyPnl>=0?'g':'r'); dailyEl.style.fontSize='16px'; }
  setText('kv-pos', `${o.corePositions||0}C + ${o.satellitePositions||0}S`);
  const shEl = document.getElementById('kv-sharpe');
  if(shEl) { shEl.textContent = (o.sharpeRatio||0).toFixed(2); shEl.className = 'kpi-val '+((o.sharpeRatio||0)>=0?'g':'r'); shEl.style.fontSize='16px'; }
  const wrEl = document.getElementById('kv-winrate');
  if(wrEl) { wrEl.textContent = (o.winRate||0).toFixed(0)+'%'; wrEl.className = 'kpi-val '+((o.winRate||0)>=50?'g':'a'); wrEl.style.fontSize='16px'; }

  // Update
  const d = DATA.meta?.lastUpdate || new Date().toISOString();
  setText('last-update', new Date(d).toLocaleString('fr-FR',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}));

  renderEquityCurve();
  renderAllocation();
  renderRiskGauges();
  renderCorePositions();
  renderRecentTrades();
}

function renderEquityCurve() {
  const ctx = document.getElementById('chart-equity');
  if(!ctx) return;
  if(charts.equity) charts.equity.destroy();
  const c = chartColors();
  const hist = DATA.portfolioHistory || DATA.backtests?.equityCurve || [];
  charts.equity = new Chart(ctx, {
    type:'line',
    data:{
      labels: hist.map(h=>h.date),
      datasets:[
        {label:'Stratégie Z-Score',data:hist.map(h=>h.strategy||h.value),borderColor:c.green,backgroundColor:c.green+'18',fill:true,tension:0.3,borderWidth:2,pointRadius:0},
        {label:'Buy & Hold',data:hist.map(h=>h.buyHold).filter(v=>v!=null).length?hist.map(h=>h.buyHold):null,borderColor:c.text,borderDash:[6,3],fill:false,tension:0.3,borderWidth:1.5,pointRadius:0}
      ].filter(d=>d.data)
    },
    options:chartOpts('FCFA')
  });
}

function renderAllocation() {
  const ctx = document.getElementById('chart-alloc');
  if(!ctx) return;
  if(charts.alloc) charts.alloc.destroy();
  const o = DATA.overview;
  const c = chartColors();
  charts.alloc = new Chart(ctx, {
    type:'doughnut',
    data:{
      labels:['CORE','SATELLITE','CASH'],
      datasets:[{data:[o.coreValue,o.satelliteValue,o.cashAvailable||0],backgroundColor:[c.green,c.blue,c.border],borderColor:'transparent',borderWidth:0}]
    },
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{enabled:true}},cutout:'60%'}
  });
  const legend = document.getElementById('alloc-legend');
  if(legend) {
    legend.innerHTML = `
      <div class="dl-item"><span><span class="dl-dot" style="background:${c.green}"></span>CORE 70%</span><span class="pos">${fmt.fcfa(o.coreValue)}</span></div>
      <div class="dl-item"><span><span class="dl-dot" style="background:${c.blue}"></span>SATELLITE 20%</span><span style="color:${c.blue}">${fmt.fcfa(o.satelliteValue)}</span></div>
      <div class="dl-item"><span><span class="dl-dot" style="background:${c.border}"></span>CASH</span><span>${fmt.fcfa(o.cashAvailable||0)}</span></div>`;
  }
}

function renderRiskGauges() {
  const o = DATA.overview;
  const dd = Math.abs(o.maxDrawdown||0);
  const ddLevel = dd>15?'hi':dd>8?'med':'low';
  const ddLabel = dd>15?'CRITIQUE':dd>8?'MODÉRÉ':'FAIBLE';
  const wrLevel = (o.winRate||0)>=60?'low':(o.winRate||0)>=45?'med':'hi';
  const shLevel = (o.sharpeRatio||0)>=1?'low':(o.sharpeRatio||0)>=0?'med':'hi';
  document.getElementById('risk-gauges').innerHTML = `
    <div class="rg"><div class="rg-label">DRAWDOWN MAX</div><div class="rg-val ${ddLevel}">${dd.toFixed(1)}%</div><div class="rg-sub" style="color:var(--${ddLevel==='hi'?'r':ddLevel==='med'?'a':'g'})">${ddLabel}</div></div>
    <div class="rg"><div class="rg-label">WIN RATE</div><div class="rg-val ${wrLevel}">${(o.winRate||0).toFixed(0)}%</div><div class="rg-sub">Trades gagnants</div></div>
    <div class="rg"><div class="rg-label">SHARPE</div><div class="rg-val ${shLevel}">${(o.sharpeRatio||0).toFixed(2)}</div><div class="rg-sub">Ratio risque/rendement</div></div>`;
}

function renderCorePositions() {
  const core = DATA.core || [];
  const el = document.getElementById('core-positions');
  if(!el) return;
  el.innerHTML = core.map(c => {
    const cls = (c.pnlPct||0)>=0?'pos':'neg';
    const acc = (c.pnlPct||0)>=0?'':'acc-r';
    return `<div class="card ${acc}">
      <div class="ch"><span class="ct">${c.symbol} · ${c.name||''}</span><span class="cbadge g">${c.sector||'CORE'}</span></div>
      <div class="cb">
        <div class="pnl-row">
          <div><div class="pnl-sym">${c.symbol}</div><div class="pnl-info">${c.shares} actions · Poids ${(c.weight||0).toFixed(1)}%</div></div>
          <div class="pnl-val"><div class="${cls}">${fmt.fcfa(c.pnl)}</div><div class="pnl-p ${cls}">${fmt.pct(c.pnlPct)}</div></div>
        </div>
        <div class="mgrid four" style="margin-top:8px">
          <div class="mcel"><div class="ml">PRIX MOY.</div><div class="mv">${fmt.num(c.avgPrice)}</div></div>
          <div class="mcel"><div class="ml">PRIX ACT.</div><div class="mv ${cls}">${fmt.num(c.currentPrice)}</div></div>
          <div class="mcel"><div class="ml">DIV. YIELD</div><div class="mv g">${(c.dividendYield||0).toFixed(1)}%</div></div>
          <div class="mcel"><div class="ml">Z-SCORE</div><div class="mv" style="color:${fmt.zsColor(c.zScore)}">${(c.zScore||0).toFixed(2)}</div></div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderRecentTrades() {
  const trades = (DATA.backtests?.recentTrades || []).slice(0,6);
  const el = document.getElementById('recent-trades');
  if(!el) return;
  if(!trades.length) { el.innerHTML = '<div style="font-size:9px;color:var(--td);text-align:center;padding:10px;letter-spacing:2px">AUCUN TRADE RÉCENT</div>'; return; }
  el.innerHTML = trades.map(t => {
    const cls = t.action==='BUY'?'buy':'sell';
    const pnlCls = t.pnl!=null?(t.pnl>=0?'pos':'neg'):'';
    return `<div class="trade-item">
      <span class="trade-date">${t.date}</span>
      <span class="trade-badge ${cls}">${t.action}</span>
      <span class="trade-sym">${t.symbol}</span>
      <span class="trade-pnl ${pnlCls}">${t.pnl!=null?fmt.fcfa(t.pnl):'EN COURS'}</span>
      <span class="trade-reason">${t.reason||''}</span>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════
// PAGE: PORTFOLIO
// ═══════════════════════════════════════════
function renderPortfolio() {
  const o = DATA.overview;
  setText('kv-core', fmt.fcfa(o.coreValue));
  setText('kv-sat', fmt.fcfa(o.satelliteValue));
  setText('kv-cash', fmt.fcfa(o.cashAvailable||0));

  renderWeightsChart();
  renderPortfolioCoreTable();
  renderFundamentals();
  renderDividends();
  renderPortfolioSatTable();
  renderPortfolioMetrics();
}

function renderWeightsChart() {
  const ctx = document.getElementById('chart-weights');
  if(!ctx) return;
  if(charts.weights) charts.weights.destroy();
  const c = chartColors();
  const all = [...(DATA.core||[]),...(DATA.satellite||[])];
  const colors = [c.green,c.blue,c.amber,c.purple,'#00eeff',c.red,'#6ee7b7'];
  charts.weights = new Chart(ctx, {
    type:'doughnut',
    data:{
      labels:all.map(a=>a.symbol),
      datasets:[{data:all.map(a=>Math.abs(a.shares*(a.currentPrice||a.entryPrice||0))),backgroundColor:colors,borderColor:'transparent',borderWidth:0}]
    },
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{color:c.text,font:{family:'IBM Plex Mono',size:9},padding:8,usePointStyle:true}},tooltip:{enabled:true}},cutout:'55%'}
  });
}

function renderPortfolioCoreTable() {
  const core = DATA.core || [];
  const el = document.getElementById('portfolio-core-table');
  if(!el) return;
  el.innerHTML = `<table class="sig-table"><thead><tr><th>TICKER</th><th>SECTEUR</th><th class="num">QTÉ</th><th class="num">PM</th><th class="num">PRIX</th><th class="num">POIDS</th><th class="num">PNL</th><th class="num">%</th></tr></thead><tbody>
    ${core.map(c=>{const cls=(c.pnlPct||0)>=0?'pos':'neg';return `<tr>
      <td style="color:var(--tb);font-weight:600">${c.symbol}</td><td style="color:var(--td)">${c.sector||'-'}</td>
      <td class="num">${c.shares}</td><td class="num">${fmt.num(c.avgPrice)}</td><td class="num">${fmt.num(c.currentPrice)}</td>
      <td class="num">${(c.weight||0).toFixed(1)}%</td><td class="num ${cls}">${fmt.fcfa(c.pnl)}</td><td class="num ${cls}">${fmt.pct(c.pnlPct)}</td></tr>`;}).join('')}
  </tbody></table>`;
}

function renderPortfolioSatTable() {
  const sat = DATA.satellite || [];
  const el = document.getElementById('portfolio-sat-table');
  if(!el) return;
  if(!sat.length) { el.innerHTML = '<div class="card"><div class="cb" style="text-align:center;color:var(--td);font-size:9px;letter-spacing:2px;padding:14px">AUCUNE POSITION SATELLITE ACTIVE</div></div>'; return; }
  el.innerHTML = `<table class="sig-table"><thead><tr><th>TICKER</th><th>SIGNAL</th><th class="num">Z-SCORE</th><th class="num">ENTRÉE</th><th class="num">ACTUEL</th><th class="num">SL</th><th class="num">TP</th><th class="num">PNL%</th></tr></thead><tbody>
    ${sat.map(s=>{const cls=(s.pnlPct||0)>=0?'pos':'neg';return `<tr>
      <td style="color:var(--tb);font-weight:600">${s.symbol}</td>
      <td><span class="sig ${fmt.sigClass(s.signal)}">${s.signal}</span></td>
      <td class="num" style="color:${fmt.zsColor(s.zScore)}">${(s.zScore||0).toFixed(2)}</td>
      <td class="num">${fmt.num(s.entryPrice)}</td><td class="num">${fmt.num(s.currentPrice)}</td>
      <td class="num" style="color:var(--r)">${fmt.num(s.stopLoss)}</td><td class="num" style="color:var(--g)">${fmt.num(s.takeProfit)}</td>
      <td class="num ${cls}">${fmt.pct(s.pnlPct)}</td></tr>`;}).join('')}
  </tbody></table>`;
}

function renderPortfolioMetrics() {
  const o = DATA.overview;
  const el = document.getElementById('portfolio-metrics');
  if(!el) return;
  const metrics = [
    ['Capital initial',fmt.fcfa(o.initialCapital)],['Valeur totale',fmt.fcfa(o.totalValue)],
    ['CORE (70%)',fmt.fcfa(o.coreValue)],['SATELLITE (30%)',fmt.fcfa(o.satelliteValue)],
    ['Cash disponible',fmt.fcfa(o.cashAvailable||0)],['Drawdown max',fmt.pct(o.maxDrawdown)],
    ['Taux de gain',`${(o.winRate||0).toFixed(0)}%`],['Ratio de Sharpe',`${(o.sharpeRatio||0).toFixed(2)}`]
  ];
  el.innerHTML = metrics.map(([l,v])=>`<div class="rbar-block"><div class="rbar-label"><span>${l}</span><span style="color:var(--tb)">${v}</span></div></div>`).join('');
}

// ═══════════════════════════════════════════
// DIVIDENDES CORE — Calendrier & Suivi
// ═══════════════════════════════════════════
function renderDividends() {
  const elSummary = document.getElementById('dividends-summary');
  const elTable   = document.getElementById('dividends-table');
  if(!elSummary || !elTable) return;

  const div = DATA.dividends;
  const o   = DATA.overview || {};

  if(!div || !div.positions || div.positions.length === 0) {
    elSummary.innerHTML = `<div style="padding:12px;background:var(--bg2);border:1px solid var(--bd);color:var(--td);font-size:9px;letter-spacing:1px">
      ◇ DONNÉES DIVIDENDES NON DISPONIBLES — Exécuter dividend_tracker.py
    </div>`;
    elTable.innerHTML = '';
    return;
  }

  const recu    = div.totalRecuFcfa    || 0;
  const attendu = div.totalAttenduFcfa || 0;
  const alerts  = div.alerts           || [];
  const cashBase= o.cashBase           || o.cashAvailable || 0;

  // Alertes urgentes
  const urgentAlerts = alerts.filter(a => a.urgence === 'ROUGE' || a.urgence === 'ORANGE');
  const alertsHtml = urgentAlerts.length ? `
    <div style="margin-bottom:8px">
      ${urgentAlerts.map(a => `
        <div style="padding:8px 12px;background:rgba(255,183,0,0.08);border-left:3px solid var(--o);font-size:9px;color:var(--o);margin-bottom:4px">
          ${a.message}
        </div>`).join('')}
    </div>` : '';

  // Bandeau résumé
  elSummary.innerHTML = `
    ${alertsHtml}
    <div style="display:flex;align-items:center;gap:16px;padding:10px 14px;background:var(--bg2);border:1px solid var(--bd);border-left:3px solid var(--g);margin-bottom:4px;flex-wrap:wrap">
      <div style="display:flex;flex-direction:column">
        <span style="font-size:7px;color:var(--td);letter-spacing:1px">✅ REÇUS</span>
        <span style="font-size:14px;font-weight:700;color:var(--g);font-family:var(--ff)">${(recu).toLocaleString('fr-FR')} FCFA</span>
      </div>
      <span style="color:var(--bd)">|</span>
      <div style="display:flex;flex-direction:column">
        <span style="font-size:7px;color:var(--td);letter-spacing:1px">⏳ ATTENDUS</span>
        <span style="font-size:14px;font-weight:700;color:var(--o);font-family:var(--ff)">${(attendu).toLocaleString('fr-FR')} FCFA</span>
      </div>
      <span style="color:var(--bd)">|</span>
      <div style="display:flex;flex-direction:column">
        <span style="font-size:7px;color:var(--td);letter-spacing:1px">💵 CASH TOTAL</span>
        <span style="font-size:14px;font-weight:700;color:var(--b);font-family:var(--ff)">${(cashBase).toLocaleString('fr-FR')} FCFA</span>
      </div>
      ${recu > 0
        ? `<span style="margin-left:auto;font-size:8px;color:var(--g)">+${(recu).toLocaleString('fr-FR')} FCFA ajoutés au CASH</span>`
        : `<span style="margin-left:auto;font-size:8px;color:var(--td)">Aucun dividende encaissé cette année</span>`}
    </div>`;

  // Tableau
  const statutColor = {RECU:'var(--g)', ATTENDU:'var(--o)', 'ESTIMÉ':'var(--td)', ESTIME:'var(--td)'};
  elTable.innerHTML = `<table class="sig-table">
    <thead><tr>
      <th>TICKER</th><th>NOM</th><th class="num">QTÉ</th><th class="num">DIV/ACTION</th>
      <th class="num">TOTAL</th><th>EX-DATE</th><th>PAIEMENT</th><th>STATUT</th>
    </tr></thead>
    <tbody>
      ${div.positions.map(p => {
        const col = statutColor[p.statut] || 'var(--td)';
        const mpa = p.montantParAction > 0 ? p.montantParAction.toLocaleString('fr-FR')+' FCFA'
                                           : '<span style="color:var(--td)">$ à saisir</span>';
        const tot = p.montantTotal > 0 ? p.montantTotal.toLocaleString('fr-FR')+' FCFA' : '—';
        return `<tr>
          <td style="color:var(--tb);font-weight:600">${p.ticker}</td>
          <td style="color:var(--td);font-size:8px">${p.nom}</td>
          <td class="num">${p.nbActions}</td>
          <td class="num">${mpa}</td>
          <td class="num" style="color:${p.montantTotal>0?'var(--g)':'var(--td)'}">${tot}</td>
          <td style="font-size:9px">${p.exDate}</td>
          <td style="font-size:9px">${p.paiementDate}</td>
          <td><span style="color:${col};font-size:8px;font-weight:700;border:1px solid ${col};padding:1px 5px">${p.statut}</span></td>
        </tr>`;
      }).join('')}
    </tbody></table>`;
}

// ═══════════════════════════════════════════
// ARBITRAGE CORE — Fondamentaux & Alertes
// ═══════════════════════════════════════════
function renderFundamentals() {
  const fund = DATA.fundamentals;
  const elSummary = document.getElementById('fundamentals-summary');
  const elCards   = document.getElementById('fundamentals-cards');
  if(!elSummary || !elCards) return;

  if(!fund || !fund.alerts || fund.alerts.length === 0) {
    elSummary.innerHTML = `<div style="padding:12px;background:var(--bg2);border:1px solid var(--bd);color:var(--td);font-size:9px;letter-spacing:1px">
      ◇ DONNÉES FONDAMENTALES NON DISPONIBLES — Exécuter fundamental_scraper.py + fundamentals_core_alert.py
    </div>`;
    elCards.innerHTML = '';
    _renderPdfAlerts(elCards, fund);
    return;
  }

  const alerts = fund.alerts;
  const summary = fund.summary || {};
  const generated = fund.generatedAt ? new Date(fund.generatedAt).toLocaleDateString('fr-FR') : '—';

  // Bandeau résumé
  const summaryItems = [
    {l:'✅ CONSERVER', v: summary.conserver||0, c:'var(--g)'},
    {l:'🔵 RENFORCER', v: summary.renforcer||0, c:'var(--b)'},
    {l:'🟡 SURVEILLER',v: summary.surveiller||0, c:'var(--o)'},
    {l:'🔴 LIQUIDER',  v: summary.liquider||0,  c:'var(--r)'},
  ];
  elSummary.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg2);border:1px solid var(--bd);border-left:3px solid var(--b);margin-bottom:4px;flex-wrap:wrap">
      ${summaryItems.map(i=>`<div style="display:flex;align-items:center;gap:6px">
        <span style="font-size:10px;font-family:var(--ff);color:${i.c}">${i.l}</span>
        <span style="font-size:16px;font-weight:700;color:${i.c};font-family:var(--ff)">${i.v}</span>
      </div>`).join('<span style="color:var(--bd)">|</span>')}
      <span style="margin-left:auto;font-size:8px;color:var(--td)">Mis à jour : ${generated}</span>
    </div>`;

  // Cartes par ticker
  const niveauColor = {CONSERVER:'var(--g)',RENFORCER:'var(--b)',SURVEILLER:'var(--o)',LIQUIDER:'var(--r)'};
  const niveauBg    = {CONSERVER:'rgba(0,229,122,0.06)',RENFORCER:'rgba(0,170,255,0.06)',SURVEILLER:'rgba(255,183,0,0.06)',LIQUIDER:'rgba(255,45,85,0.08)'};

  elCards.innerHTML = alerts.map(a => {
    const col = niveauColor[a.niveau] || 'var(--td)';
    const bg  = niveauBg[a.niveau]   || 'var(--bg2)';
    const caSign  = a.caYoY  >= 0 ? '+' : '';
    const rexSign = a.rexYoY >= 0 ? '+' : '';
    const rnSign  = a.rnYoY  >= 0 ? '+' : '';
    const cacCol  = a.cacOpinion?.includes('réserve') && !a.cacOpinion?.includes('Sans') ? 'var(--r)' :
                    a.cacOpinion === 'Sans réserve' ? 'var(--g)' : 'var(--o)';

    const detailsHtml = (a.details||[]).map(d =>
      `<div style="font-size:8px;color:var(--o);padding:3px 0;border-bottom:1px solid var(--bd)">⚡ ${d}</div>`
    ).join('');

    return `<div style="flex:1;min-width:260px;max-width:360px;background:${bg};border:1px solid var(--bd);border-top:2px solid ${col};padding:14px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:14px;font-weight:700;color:var(--tb);font-family:var(--ff)">${a.ticker}</span>
        <span style="font-size:8px;font-weight:700;color:${col};border:1px solid ${col};padding:2px 6px;letter-spacing:1px">${a.icone||''} ${a.niveau}</span>
      </div>
      <div style="font-size:8px;color:var(--td);margin-bottom:10px">${a.nom} · ${a.secteur}</div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;font-size:9px;margin-bottom:10px">
        <div style="background:var(--bg3);padding:6px;text-align:center">
          <div style="color:var(--td);font-size:7px;margin-bottom:2px">CA ${a.derniereAnnee}</div>
          <div style="color:var(--tb);font-weight:600">${a.ca ? a.ca.toLocaleString('fr-FR') : '—'}</div>
          <div style="color:${a.caYoY>=0?'var(--g)':'var(--r)'};font-size:8px">${caSign}${a.caYoY}%</div>
        </div>
        <div style="background:var(--bg3);padding:6px;text-align:center">
          <div style="color:var(--td);font-size:7px;margin-bottom:2px">REX · ${a.margeRex}%</div>
          <div style="color:var(--tb);font-weight:600">${a.rex ? a.rex.toLocaleString('fr-FR') : '—'}</div>
          <div style="color:${a.rexYoY>=0?'var(--g)':'var(--r)'};font-size:8px">${rexSign}${a.rexYoY}%</div>
        </div>
        <div style="background:var(--bg3);padding:6px;text-align:center">
          <div style="color:var(--td);font-size:7px;margin-bottom:2px">RN · ${a.margeRn}%</div>
          <div style="color:var(--tb);font-weight:600">${a.rn ? a.rn.toLocaleString('fr-FR') : '—'}</div>
          <div style="color:${a.rnYoY>=0?'var(--g)':'var(--r)'};font-size:8px">${rnSign}${a.rnYoY}%</div>
        </div>
      </div>

      <div style="font-size:8px;padding:4px 6px;background:var(--bg3);margin-bottom:8px;border-left:2px solid ${cacCol}">
        <span style="color:var(--td)">CAC: </span><span style="color:${cacCol}">${a.cacOpinion}</span>
      </div>

      ${detailsHtml}

      <div style="margin-top:8px;padding:6px;background:var(--bg3);font-size:8px;color:${col};border-left:2px solid ${col}">
        ${a.conseil}
      </div>
    </div>`;
  }).join('');

  // Alertes PDFs en attente
  _renderPdfAlerts(elCards, fund);
}

function _renderPdfAlerts(container, fund) {
  const pending = fund?.pendingPdfs || [];
  if(!pending.length) return;
  const html = `<div style="width:100%;padding:10px 14px;background:rgba(0,170,255,0.07);border:1px solid var(--b);border-left:3px solid var(--b);margin-top:8px">
    <div style="font-size:9px;font-weight:700;color:var(--b);letter-spacing:1px;margin-bottom:8px">
      📄 ${pending.length} RAPPORT(S) PDF EN ATTENTE — lancer pdf_parser.py
    </div>
    ${pending.map(p=>`<div style="font-size:8px;color:var(--tb);padding:3px 0;border-bottom:1px solid var(--bd)">
      <span style="color:var(--b)">${p.ticker}</span> · ${p.fichier}
    </div>`).join('')}
    <div style="font-size:8px;color:var(--td);margin-top:6px">
      → py pdf_parser.py &nbsp;&nbsp; ou &nbsp;&nbsp; py run_daily_automation.py
    </div>
  </div>`;
  container.innerHTML += html;
}

// ═══════════════════════════════════════════
// PAGE: SIGNALS
// ═══════════════════════════════════════════
function renderSignals() {
  renderSignalSummary();
  renderSignalConseils();
  renderSignalHeatmap();
  renderZScoreChart();
  renderSignalTable();
}

function renderSignalConseils() {
  const el = document.getElementById('signal-conseils');
  if(!el) return;
  const sigs = DATA.signals || {};
  const sentiment = sigs.marketSentiment || 'NEUTRE';
  const buys  = sigs.buysCount  || 0;
  const sells = sigs.sellsCount || 0;
  const tops  = sigs.topOpportunities || [];

  const sentCol = sentiment==='HAUSSIER' ? 'var(--g)' : sentiment==='BAISSIER' ? 'var(--r)' : 'var(--o)';
  const sentIcon = sentiment==='HAUSSIER' ? '▲' : sentiment==='BAISSIER' ? '▼' : '◆';

  // --- Sentiment banner ---
  const banner = `
    <div style="display:flex;align-items:center;gap:16px;padding:10px 16px;background:var(--bg2);border:1px solid var(--bd);border-left:3px solid ${sentCol};margin-bottom:12px;">
      <span style="color:${sentCol};font-size:18px;font-family:var(--ff)">${sentIcon}</span>
      <div>
        <div style="font-size:9px;color:var(--td);letter-spacing:2px">SENTIMENT MARCHÉ</div>
        <div style="font-size:14px;font-weight:700;color:${sentCol};font-family:var(--ff);letter-spacing:3px">${sentiment}</div>
      </div>
      <div style="margin-left:auto;font-size:9px;color:var(--td);text-align:right">
        <div>${buys} signal${buys>1?'s':''} ACHAT &nbsp;|&nbsp; ${sells} signal${sells>1?'s':''} VENTE</div>
        <div style="margin-top:3px;color:var(--tb)">${tops.length > 0 ? tops.length+' OPPORTUNITÉ'+(tops.length>1?'S':'') : 'AUCUNE OUVERTURE SUGGÉRÉE'}</div>
      </div>
    </div>`;

  // --- Cartes conseils ---
  let cards = '';
  if(tops.length === 0) {
    cards = `<div style="padding:20px;text-align:center;background:var(--bg2);border:1px solid var(--bd);color:var(--td);font-size:10px;letter-spacing:1px">
      <div style="font-size:18px;margin-bottom:8px;color:var(--muted)">◇</div>
      AUCUNE OPPORTUNITÉ D'ACHAT ACTUELLEMENT<br>
      <span style="color:var(--r);font-size:9px">Tous les signaux sont VENTE / HOLD — attendre un pullback ou un Z-Score &lt; -2.5</span>
    </div>`;
  } else {
    const cardList = tops.map(s => {
      const z = s.zScore || 0;
      const sigCol = s.signal==='Strong Buy' ? 'var(--g)' : 'var(--o)';
      const rr = s.riskReward && s.riskReward > 0 ? s.riskReward.toFixed(1)+':1' : '—';
      const deploy = s.capitalDeploy > 0 ? fmt.num(s.capitalDeploy)+' FCFA' : '—';
      const zInterp = z <= -3 ? 'Très sous-évalué' : z <= -2.5 ? 'Sous-évalué' : 'Signal achat';
      return `
        <div style="flex:1;min-width:220px;max-width:340px;background:var(--bg2);border:1px solid var(--bd);border-top:2px solid ${sigCol};padding:14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <span style="font-size:15px;font-weight:700;color:var(--tb);font-family:var(--ff)">${s.symbol}</span>
            <span class="sig ${fmt.sigClass(s.signal)}" style="font-size:8px">${s.signal.toUpperCase()}</span>
          </div>
          <div style="font-size:9px;color:var(--td);margin-bottom:3px">Z-SCORE</div>
          <div style="font-size:20px;font-weight:700;color:${sigCol};font-family:var(--ff);margin-bottom:2px">${z.toFixed(2)}</div>
          <div style="font-size:8px;color:var(--td);margin-bottom:12px">${zInterp}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:9px;margin-bottom:10px">
            <div style="background:var(--bg3);padding:6px">
              <div style="color:var(--td);margin-bottom:2px">PRIX ACTUEL</div>
              <div style="color:var(--tb);font-weight:600">${fmt.num(s.price)} FCFA</div>
            </div>
            <div style="background:rgba(0,229,122,0.07);padding:6px">
              <div style="color:var(--td);margin-bottom:2px">OBJECTIF (TP)</div>
              <div style="color:var(--g);font-weight:700">${s.tp > 0 ? fmt.num(s.tp)+' FCFA' : '—'} <span style="font-size:8px">${s.tpPct||''}</span></div>
            </div>
            <div style="background:rgba(255,45,85,0.07);padding:6px">
              <div style="color:var(--td);margin-bottom:2px">STOP LOSS (SL)</div>
              <div style="color:var(--r);font-weight:700">${s.sl > 0 ? fmt.num(s.sl)+' FCFA' : '—'} <span style="font-size:8px">${s.slPct||''}</span></div>
            </div>
            <div style="background:var(--bg3);padding:6px">
              <div style="color:var(--td);margin-bottom:2px">RISK/REWARD</div>
              <div style="color:var(--o);font-weight:700">${rr}</div>
            </div>
          </div>
          <div style="border-top:1px solid var(--bd);padding-top:8px;display:flex;justify-content:space-between;font-size:9px">
            <div><span style="color:var(--td)">QTÉ SUGGÉRÉE&nbsp;</span><span style="color:var(--tb);font-weight:600">${s.qty > 0 ? s.qty+' titres' : '—'}</span></div>
            <div><span style="color:var(--td)">CAPITAL&nbsp;</span><span style="color:var(--o);font-weight:600">${deploy}</span></div>
          </div>
        </div>`;
    }).join('');
    cards = `<div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:4px">${cardList}</div>`;
  }

  el.innerHTML = `<div style="margin-bottom:16px">
    <div class="stitle" style="margin-bottom:8px">💡 CONSEILS &amp; OPPORTUNITÉS</div>
    ${banner}${cards}
  </div>`;
}

function renderSignalSummary() {
  const s = DATA.signals?.summary || {};
  const el = document.getElementById('signal-summary');
  if(!el) return;
  el.innerHTML = [
    {l:'STRONG BUY',v:s.strongBuy||0,c:'g'},{l:'BUY',v:s.buy||0,c:'g'},
    {l:'HOLD',v:s.hold||0,c:'a'},{l:'SELL',v:s.sell||0,c:'r'},{l:'STRONG SELL',v:s.strongSell||0,c:'r'}
  ].map(i=>`<div class="kpi-box"><div class="kpi-label">${i.l}</div><div class="kpi-val ${i.c}" style="font-size:20px">${i.v}</div></div>`).join('');
}

function renderSignalHeatmap() {
  const sigs = DATA.signals?.current || [];
  const el = document.getElementById('signal-heatmap');
  if(!el) return;
  el.innerHTML = sigs.slice(0,20).map(s => {
    const z = s.zScore||0;
    let bg,col;
    if(z<=-3){bg='rgba(0,229,122,0.35)';col='var(--g)';}
    else if(z<=-2.5){bg='rgba(0,229,122,0.2)';col='var(--g)';}
    else if(z<=-2){bg='rgba(0,229,122,0.1)';col='var(--g)';}
    else if(z>=3){bg='rgba(255,45,85,0.35)';col='var(--r)';}
    else if(z>=2.5){bg='rgba(255,45,85,0.2)';col='var(--r)';}
    else{bg='var(--bg3)';col='var(--td)';}
    return `<div class="hm-cell" style="background:${bg}"><div class="hm-sym">${s.symbol}</div><div class="hm-chg" style="color:${col}">${z.toFixed(2)}</div><div class="hm-sub">${s.signal}</div></div>`;
  }).join('');
}

function renderZScoreChart() {
  const ctx = document.getElementById('chart-zscore');
  if(!ctx) return;
  if(charts.zscore) charts.zscore.destroy();
  const c = chartColors();
  const sigs = (DATA.signals?.current||[]).slice().sort((a,b)=>a.zScore-b.zScore);
  charts.zscore = new Chart(ctx, {
    type:'bar',
    data:{
      labels:sigs.map(s=>s.symbol),
      datasets:[{label:'Z-Score',data:sigs.map(s=>s.zScore),
        backgroundColor:sigs.map(s=>{
          if(s.zScore<=-3) return c.green+'cc';
          if(s.zScore<=-2.5) return c.green+'80';
          if(s.zScore>=3) return c.red+'cc';
          if(s.zScore>=2.5) return c.red+'80';
          return c.text+'40';
        }),borderRadius:2}]
    },
    options:{
      indexAxis:'y',responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{backgroundColor:c.bg,titleColor:c.green,bodyColor:c.text,borderColor:c.border,borderWidth:1}},
      scales:{x:{ticks:{color:c.text},grid:{color:c.grid}},y:{ticks:{color:c.text,font:{family:'IBM Plex Mono',size:8}},grid:{display:false}}}
    }
  });
}

function renderSignalTable() {
  const sigs = DATA.signals?.current || [];
  const el = document.getElementById('signal-table-wrap');
  if(!el) return;
  el.innerHTML = `<table class="sig-table"><thead><tr>
    <th>TICKER</th>
    <th class="num">PRIX</th>
    <th class="num">Z-SCORE</th>
    <th>SIGNAL</th>
    <th class="num">TP</th>
    <th class="num">SL</th>
    <th class="num">R/R</th>
    <th class="num">QTÉ</th>
    <th class="num">CAPITAL</th>
  </tr></thead><tbody>
    ${sigs.map(s=>{
      const hasBuy = s.action === 'BUY';
      const rr = s.riskReward && s.riskReward > 0 ? s.riskReward.toFixed(1) : '—';
      return `<tr>
        <td style="color:var(--tb);font-weight:600;font-family:var(--ff)">${s.symbol}</td>
        <td class="num">${fmt.num(s.price)}</td>
        <td class="num" style="color:${fmt.zsColor(s.zScore)}">${(s.zScore||0).toFixed(2)}</td>
        <td><span class="sig ${fmt.sigClass(s.signal)}">${s.signal}</span></td>
        <td class="num" style="color:var(--g)">${hasBuy && s.tp > 0 ? fmt.num(s.tp) : '—'}</td>
        <td class="num" style="color:var(--r)">${hasBuy && s.sl > 0 ? fmt.num(s.sl) : '—'}</td>
        <td class="num" style="color:var(--o)">${hasBuy ? rr : '—'}</td>
        <td class="num">${hasBuy && s.qty > 0 ? s.qty : '—'}</td>
        <td class="num" style="color:var(--o)">${hasBuy && s.capitalDeploy > 0 ? fmt.num(s.capitalDeploy) : '—'}</td>
      </tr>`;
    }).join('')}
  </tbody></table>`;
}

// ═══════════════════════════════════════════
// PAGE: BACKTESTS (10 derniers)
// ═══════════════════════════════════════════
function renderBacktests() {
  const logs = DATA.allLogs || DATA.logs || [];
  const last10 = logs.slice(-10).reverse();

  // KPIs
  const el = document.getElementById('bt-kpis');
  if(el && last10.length) {
    const bestRet = Math.max(...last10.map(l=>l.totalReturn||0));
    const avgWR = last10.reduce((s,l)=>s+(l.winRate||0),0)/last10.length;
    const bestSharpe = Math.max(...last10.map(l=>l.sharpe||0));
    const avgPF = last10.reduce((s,l)=>s+(l.profitFactor||0),0)/last10.length;
    el.innerHTML = `
      <div class="kpi-box"><div class="kpi-label">MEILLEUR RENDEMENT</div><div class="kpi-val g" style="font-size:16px">${fmt.pct(bestRet)}</div></div>
      <div class="kpi-box"><div class="kpi-label">WIN RATE MOY.</div><div class="kpi-val a" style="font-size:16px">${avgWR.toFixed(1)}%</div></div>
      <div class="kpi-box"><div class="kpi-label">MEILLEUR SHARPE</div><div class="kpi-val b" style="font-size:16px">${bestSharpe.toFixed(2)}</div></div>
      <div class="kpi-box"><div class="kpi-label">PROFIT FACTOR MOY.</div><div class="kpi-val" style="font-size:16px">${avgPF.toFixed(2)}</div></div>`;
  }

  // Comparison chart
  renderBTCompareChart(last10);

  // Cards
  const cards = document.getElementById('bt-cards');
  if(cards) {
    cards.innerHTML = last10.map((bt,i) => {
      const pos = (bt.totalReturn||0)>=0;
      return `<div class="bt-card ${pos?'positive':'negative'}" onclick="this.classList.toggle('open')">
        <div class="bt-head">
          <div><div class="bt-ticker">${bt.ticker}</div><div class="bt-period">${bt.period||bt.date||'-'}</div></div>
          <div class="bt-return ${pos?'pos':'neg'}">${fmt.pct(bt.totalReturn)}</div>
        </div>
        <div class="bt-details">
          <div class="mgrid" style="margin:0">
            <div class="mcel"><div class="ml">REND. ANNUEL</div><div class="mv ${(bt.annualReturn||0)>=0?'g':'r'}">${fmt.pct(bt.annualReturn)}</div></div>
            <div class="mcel"><div class="ml">SHARPE</div><div class="mv ${(bt.sharpe||0)>=0?'g':'r'}">${(bt.sharpe||0).toFixed(2)}</div></div>
            <div class="mcel"><div class="ml">MAX DRAWDOWN</div><div class="mv r">${fmt.pct(bt.maxDrawdown)}</div></div>
            <div class="mcel"><div class="ml">WIN RATE</div><div class="mv ${(bt.winRate||0)>=50?'g':'a'}">${(bt.winRate||0).toFixed(1)}%</div></div>
            <div class="mcel"><div class="ml">NB TRADES</div><div class="mv b">${bt.nTrades||0}</div></div>
            <div class="mcel"><div class="ml">CAPITAL FINAL</div><div class="mv">${fmt.fcfa(bt.capitalFinal)}</div></div>
            <div class="mcel"><div class="ml">PROFIT FACTOR</div><div class="mv ${(bt.profitFactor||0)>=1?'g':'r'}">${(bt.profitFactor||0).toFixed(2)}</div></div>
            <div class="mcel"><div class="ml">BUY & HOLD</div><div class="mv ${(bt.buyHoldReturn||0)>=0?'g':'r'}">${fmt.pct(bt.buyHoldReturn)}</div></div>
            <div class="mcel"><div class="ml">VOLATILITÉ</div><div class="mv a">${(bt.volatility||0).toFixed(2)}%</div></div>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  // Monthly returns
  renderMonthlyReturns();
}

function renderBTCompareChart(data) {
  const ctx = document.getElementById('chart-bt-compare');
  if(!ctx) return;
  if(charts.btCompare) charts.btCompare.destroy();
  const c = chartColors();
  charts.btCompare = new Chart(ctx, {
    type:'bar',
    data:{
      labels:data.map(d=>d.ticker),
      datasets:[
        {label:'Stratégie',data:data.map(d=>d.totalReturn||0),
          backgroundColor:data.map(d=>(d.totalReturn||0)>=0?c.green+'99':c.red+'99'),borderColor:data.map(d=>(d.totalReturn||0)>=0?c.green:c.red),borderWidth:1,borderRadius:2},
        {label:'Buy & Hold',data:data.map(d=>d.buyHoldReturn||0),backgroundColor:c.text+'60',borderColor:c.text,borderWidth:1,borderRadius:2}
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:c.text,font:{family:'IBM Plex Mono',size:9},usePointStyle:true}},
        tooltip:{backgroundColor:c.bg,titleColor:c.green,bodyColor:c.text,borderColor:c.border,borderWidth:1}},
      scales:{x:{ticks:{color:c.text,font:{family:'IBM Plex Mono',size:9}},grid:{color:c.grid}},
        y:{ticks:{color:c.text,callback:v=>v+'%'},grid:{color:c.grid}}}
    }
  });
}

function renderMonthlyReturns() {
  const ctx = document.getElementById('chart-monthly');
  if(!ctx) return;
  if(charts.monthly) charts.monthly.destroy();
  const c = chartColors();
  const mr = DATA.backtests?.monthlyReturns || [];
  if(!mr.length) return;
  charts.monthly = new Chart(ctx, {
    type:'bar',
    data:{
      labels:mr.map(m=>m.month),
      datasets:[{label:'Rendement mensuel',data:mr.map(m=>m.ret),
        backgroundColor:mr.map(m=>m.ret>=0?c.green+'99':c.red+'99'),
        borderColor:mr.map(m=>m.ret>=0?c.green:c.red),borderWidth:1,borderRadius:2}]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{backgroundColor:c.bg,titleColor:c.green,bodyColor:c.text,borderColor:c.border,borderWidth:1}},
      scales:{x:{ticks:{color:c.text,font:{family:'IBM Plex Mono',size:8},maxRotation:45},grid:{color:c.grid}},
        y:{ticks:{color:c.text,callback:v=>v+'%'},grid:{color:c.grid}}}
    }
  });
}

// ═══════════════════════════════════════════
// PAGE: BONDS
// ═══════════════════════════════════════════
function renderBonds() {
  renderYieldChart();
  renderBondCards();
}

function renderYieldChart() {
  const ctx = document.getElementById('chart-yields');
  if(!ctx) return;
  if(charts.yields) charts.yields.destroy();
  const c = chartColors();
  const bonds = (DATA.bonds?.opportunities||[]).slice().sort((a,b)=>b.yieldEff-a.yieldEff);
  charts.yields = new Chart(ctx, {
    type:'bar',
    data:{
      labels:bonds.map(b=>b.name.split(' ')[0]+' '+b.coupon+'%'),
      datasets:[
        {label:'Rendement effectif',data:bonds.map(b=>b.yieldEff),backgroundColor:c.green+'99',borderColor:c.green,borderWidth:1,borderRadius:2},
        {label:'Coupon',data:bonds.map(b=>b.coupon),backgroundColor:c.amber+'80',borderColor:c.amber,borderWidth:1,borderRadius:2}
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:c.text,font:{family:'IBM Plex Mono',size:9},usePointStyle:true}},
        tooltip:{backgroundColor:c.bg,titleColor:c.green,bodyColor:c.text,borderColor:c.border,borderWidth:1}},
      scales:{x:{ticks:{color:c.text,font:{family:'IBM Plex Mono',size:8},maxRotation:45},grid:{color:c.grid}},
        y:{ticks:{color:c.text,callback:v=>v+'%'},grid:{color:c.grid},beginAtZero:true}}
    }
  });
}

function renderBondCards() {
  const bonds = DATA.bonds?.opportunities || [];
  const el = document.getElementById('bond-cards');
  if(!el) return;
  el.innerHTML = bonds.map(b => `
    <div class="card acc-b">
      <div class="ch"><span class="ct">${b.name}</span><span class="cbadge g">${b.rating}</span></div>
      <div class="cb">
        <div class="pnl-row">
          <div><div class="pnl-sym">${b.coupon.toFixed(2)}% COUPON</div><div class="pnl-info">Maturité: ${b.maturity}</div></div>
          <div class="pnl-val"><div class="pos" style="font-family:'Bebas Neue';font-size:18px">${b.yieldEff.toFixed(2)}%</div><div class="pnl-p" style="color:var(--td)">Yield effectif</div></div>
        </div>
        <div class="mgrid" style="margin-top:8px">
          <div class="mcel"><div class="ml">PRIX</div><div class="mv">${b.price.toFixed(1)}</div></div>
          <div class="mcel"><div class="ml">DÉCOTE</div><div class="mv ${b.discount>2?'g':'a'}">${b.discount.toFixed(1)}%</div></div>
          <div class="mcel"><div class="ml">RATING</div><div class="mv g">${b.rating}</div></div>
        </div>
      </div>
    </div>`).join('');
}

// ═══════════════════════════════════════════
// PAGE: LOGS (Historique complet)
// ═══════════════════════════════════════════
function renderLogs() {
  const logs = DATA.allLogs || DATA.logs || [];

  // KPIs
  const el = document.getElementById('log-kpis');
  if(el && logs.length) {
    const bestRet = Math.max(...logs.map(l=>l.totalReturn||0));
    const bestSharpe = Math.max(...logs.map(l=>l.sharpe||0));
    el.innerHTML = `
      <div class="kpi-box"><div class="kpi-label">TOTAL RUNS</div><div class="kpi-val b" style="font-size:16px">${logs.length}</div></div>
      <div class="kpi-box"><div class="kpi-label">DERNIÈRE DATE</div><div class="kpi-val" style="font-size:12px">${logs[logs.length-1]?.date||'-'}</div></div>
      <div class="kpi-box"><div class="kpi-label">MEILLEUR REND.</div><div class="kpi-val g" style="font-size:16px">${fmt.pct(bestRet)}</div></div>
      <div class="kpi-box"><div class="kpi-label">MEILLEUR SHARPE</div><div class="kpi-val a" style="font-size:16px">${bestSharpe.toFixed(2)}</div></div>`;
  }

  renderLogReturnsChart(logs);
  renderLogTable(logs);
}

function renderLogReturnsChart(logs) {
  const ctx = document.getElementById('chart-log-returns');
  if(!ctx) return;
  if(charts.logReturns) charts.logReturns.destroy();
  const c = chartColors();
  const byTicker = {};
  for(const l of logs) byTicker[l.ticker] = l;
  const tickers = Object.values(byTicker).sort((a,b)=>(b.totalReturn||0)-(a.totalReturn||0));
  charts.logReturns = new Chart(ctx, {
    type:'bar',
    data:{
      labels:tickers.map(t=>t.ticker),
      datasets:[
        {label:'Stratégie',data:tickers.map(t=>t.totalReturn||0),
          backgroundColor:tickers.map(t=>(t.totalReturn||0)>=0?c.green+'99':c.red+'99'),
          borderColor:tickers.map(t=>(t.totalReturn||0)>=0?c.green:c.red),borderWidth:1,borderRadius:2},
        {label:'Buy & Hold',data:tickers.map(t=>t.buyHoldReturn||0),backgroundColor:c.text+'60',borderColor:c.text,borderWidth:1,borderRadius:2}
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:c.text,font:{family:'IBM Plex Mono',size:9},usePointStyle:true}},
        tooltip:{backgroundColor:c.bg,titleColor:c.green,bodyColor:c.text,borderColor:c.border,borderWidth:1}},
      scales:{x:{ticks:{color:c.text,font:{family:'IBM Plex Mono',size:8}},grid:{color:c.grid}},
        y:{ticks:{color:c.text,callback:v=>v+'%'},grid:{color:c.grid}}}
    }
  });
}

function renderLogTable(logs) {
  const el = document.getElementById('log-table-wrap');
  if(!el) return;
  const recent = logs.slice(-15).reverse();
  el.innerHTML = `<table class="sig-table"><thead><tr><th>DATE</th><th>TICKER</th><th class="num">REND.</th><th class="num">ANNUEL</th><th class="num">SHARPE</th><th class="num">DD MAX</th><th class="num">WIN%</th><th class="num">TRADES</th><th class="num">PF</th><th class="num">B&H</th><th class="num">CAPITAL</th></tr></thead><tbody>
    ${recent.map(l=>{const cls=(l.totalReturn||0)>=0?'pos':'neg';return `<tr>
      <td style="color:var(--td);font-size:8px">${l.date||'-'}</td>
      <td style="color:var(--tb);font-weight:600">${l.ticker||'-'}</td>
      <td class="num ${cls}">${fmt.pct(l.totalReturn)}</td>
      <td class="num">${fmt.pct(l.annualReturn)}</td>
      <td class="num" style="color:var(--b)">${(l.sharpe||0).toFixed(2)}</td>
      <td class="num neg">${fmt.pct(l.maxDrawdown)}</td>
      <td class="num">${(l.winRate||0).toFixed(1)}%</td>
      <td class="num">${l.nTrades||0}</td>
      <td class="num">${(l.profitFactor||0).toFixed(2)}</td>
      <td class="num ${(l.buyHoldReturn||0)>=0?'pos':'neg'}">${fmt.pct(l.buyHoldReturn)}</td>
      <td class="num">${fmt.fcfa(l.capitalFinal)}</td></tr>`;}).join('')}
  </tbody></table>`;
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════
function setText(id, text) { const e=document.getElementById(id); if(e) e.textContent=text; }

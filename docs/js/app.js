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
  renderOverview();
});

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
// TABS
// ═══════════════════════════════════════════
function showTab(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('panel-' + name)?.classList.add('active');
  document.querySelector(`[data-tab="${name}"]`)?.classList.add('active');
  document.querySelector('.content').scrollTo({top:0,behavior:'smooth'});
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
      <div class="dl-item"><span><span class="dl-dot" style="background:${c.blue}"></span>SATELLITE 30%</span><span style="color:${c.blue}">${fmt.fcfa(o.satelliteValue)}</span></div>
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
// PAGE: SIGNALS
// ═══════════════════════════════════════════
function renderSignals() {
  renderSignalSummary();
  renderSignalHeatmap();
  renderZScoreChart();
  renderSignalTable();
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
  el.innerHTML = `<table class="sig-table"><thead><tr><th>TICKER</th><th>NOM</th><th class="num">PRIX</th><th class="num">Z-SCORE</th><th>SIGNAL</th><th class="num">VOLUME</th><th class="num">VOLATIL.</th></tr></thead><tbody>
    ${sigs.map(s=>`<tr>
      <td style="color:var(--tb);font-weight:600">${s.symbol}</td><td style="color:var(--td);font-size:8px">${s.name||''}</td>
      <td class="num">${fmt.num(s.price)}</td><td class="num" style="color:${fmt.zsColor(s.zScore)}">${(s.zScore||0).toFixed(2)}</td>
      <td><span class="sig ${fmt.sigClass(s.signal)}">${s.signal}</span></td>
      <td class="num">${fmt.num(s.volume)}</td><td class="num">${(s.volatility||0).toFixed(1)}%</td></tr>`).join('')}
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

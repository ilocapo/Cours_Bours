/* =============================================
   BRVM Portfolio Dashboard - Main Application
   Handles navigation, data rendering, Chart.js
   ============================================= */

// ── State ─────────────────────────────────────
let DATA = SAMPLE_DATA;
let currentPage = 'overview';
const charts = {};

// ── Initialisation ────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  tryLoadRealData().then(() => {
    initNavigation();
    initMobile();
    renderPage('overview');
    updateMeta();
  });
});

// ── Try to load real JSON data ────────────────
async function tryLoadRealData() {
  try {
    const resp = await fetch('data/dashboard.json');
    if (resp.ok) {
      const json = await resp.json();
      DATA = { ...SAMPLE_DATA, ...json };
      console.log('[Dashboard] Real data loaded');
    }
  } catch (e) {
    console.log('[Dashboard] Using sample data');
  }
  // Also load full historical logs
  try {
    const resp2 = await fetch('data/backtest_logs.json');
    if (resp2.ok) {
      const logsJson = await resp2.json();
      if (logsJson && logsJson.length) {
        DATA.allLogs = logsJson;
        console.log('[Dashboard] Logs loaded:', logsJson.length, 'entries');
      }
    }
  } catch (e) {
    console.log('[Dashboard] No historical logs');
  }
}

// ── Update meta / footer ──────────────────────
function updateMeta() {
  const el = document.getElementById('last-update');
  if (el) {
    const d = DATA.meta?.lastUpdate || new Date().toISOString();
    el.textContent = new Date(d).toLocaleString('fr-FR', {
      day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'
    });
  }
  const ds = document.getElementById('header-date');
  if (ds) {
    ds.textContent = new Date().toLocaleDateString('fr-FR', {
      weekday:'long', day:'numeric', month:'long', year:'numeric'
    });
  }
}

// ── Navigation ────────────────────────────────
function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      if (page && page !== currentPage) {
        navigateTo(page);
      }
    });
  });
  // Handle hash on load
  const hash = location.hash.slice(1);
  if (hash && document.getElementById('page-' + hash)) {
    navigateTo(hash);
  }
}

function navigateTo(page) {
  // Update nav active
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const active = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (active) active.classList.add('active');
  // Switch page
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  if (target) target.classList.add('active');
  currentPage = page;
  location.hash = page;
  renderPage(page);
  // Close mobile sidebar
  document.querySelector('.sidebar')?.classList.remove('open');
  document.querySelector('.overlay')?.classList.remove('open');
}

// ── Mobile ────────────────────────────────────
function initMobile() {
  const toggle = document.querySelector('.mobile-toggle');
  const overlay = document.querySelector('.overlay');
  const sidebar = document.querySelector('.sidebar');
  if (toggle) toggle.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('open');
  });
  if (overlay) overlay.addEventListener('click', () => {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('open');
  });
}

// ── Page Renderer ─────────────────────────────
function renderPage(page) {
  switch(page) {
    case 'overview':  renderOverview();  break;
    case 'portfolio': renderPortfolio(); break;
    case 'backtests': renderBacktests(); break;
    case 'signals':   renderSignals();   break;
    case 'bonds':     renderBonds();     break;
    case 'logs':      renderLogs();      break;
  }
}

// ── Format helpers ────────────────────────────
const fmt = {
  num:  (v) => v == null ? '-' : Number(v).toLocaleString('fr-FR'),
  pct:  (v) => v == null ? '-' : (v >= 0 ? '+' : '') + v.toFixed(2) + '%',
  fcfa: (v) => v == null ? '-' : Number(v).toLocaleString('fr-FR') + ' FCFA',
  sign: (v) => v >= 0 ? 'up' : 'down',
  arrow:(v) => v >= 0 ? '▲' : '▼',
  badge:(signal) => {
    const map = {
      'Strong Buy':'badge-strong-buy','Buy':'badge-buy','Hold':'badge-hold',
      'Sell':'badge-sell','Strong Sell':'badge-strong-sell','Watchlist':'badge-watchlist'
    };
    return `<span class="badge ${map[signal] || 'badge-hold'}">${signal}</span>`;
  }
};

// ═══════════════════════════════════════════════
// PAGE: Overview
// ═══════════════════════════════════════════════
function renderOverview() {
  const o = DATA.overview;
  // KPIs
  setText('kpi-total-value', fmt.fcfa(o.totalValue));
  setText('kpi-total-change', `${fmt.arrow(o.ytdReturn)} ${fmt.pct(o.ytdReturn)} YTD`);
  setClass('kpi-total-change', o.ytdReturn >= 0 ? 'kpi-sub up' : 'kpi-sub down');
  setText('kpi-ytd', fmt.pct(o.ytdReturn));
  setText('kpi-ytd-sub', `Sharpe ${o.sharpeRatio?.toFixed(2) || '-'}`);
  setText('kpi-daily-pnl', fmt.fcfa(o.dailyPnl));
  setText('kpi-daily-sub', `${fmt.arrow(o.dailyPnlPct)} ${fmt.pct(o.dailyPnlPct)}`);
  setClass('kpi-daily-sub', o.dailyPnlPct >= 0 ? 'kpi-sub up' : 'kpi-sub down');
  setText('kpi-positions', `${o.corePositions} CORE + ${o.satellitePositions} SAT`);
  setText('kpi-positions-sub', `${o.openPositions} positions actives`);

  // Portfolio chart
  renderPortfolioChart();
  // Allocation chart
  renderAllocationChart();
  // Daily signals table
  renderOverviewSignals();
  // Recent trades table
  renderOverviewTrades();
}

function renderPortfolioChart() {
  const ctx = document.getElementById('chart-portfolio');
  if (!ctx) return;
  if (charts.portfolio) charts.portfolio.destroy();

  const hist = DATA.portfolioHistory || [];
  charts.portfolio = new Chart(ctx, {
    type: 'line',
    data: {
      labels: hist.map(h => h.date),
      datasets: [{
        label: 'Valeur du portefeuille',
        data: hist.map(h => h.value),
        borderColor: '#e94e00',
        backgroundColor: 'rgba(233,78,0,0.08)',
        fill: true,
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4
      }]
    },
    options: chartOpts('FCFA', true)
  });
}

function renderAllocationChart() {
  const ctx = document.getElementById('chart-allocation');
  if (!ctx) return;
  if (charts.allocation) charts.allocation.destroy();

  const o = DATA.overview;
  charts.allocation = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['CORE (70%)', 'SATELLITE (30%)', 'Cash'],
      datasets: [{
        data: [o.coreValue, o.satelliteValue, o.cashAvailable],
        backgroundColor: ['#943a1f', '#e94e00', '#3a3536'],
        borderColor: '#1b191a',
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#a09a96', font: { family: 'Georgia', size: 11 }, padding: 16, usePointStyle: true }
        },
        tooltip: tooltipStyle()
      },
      cutout: '65%'
    }
  });
}

function renderOverviewSignals() {
  const tbody = document.querySelector('#table-daily-signals tbody');
  if (!tbody) return;
  const sigs = (DATA.signals?.current || [])
    .filter(s => s.signal !== 'Hold')
    .slice(0, 6);
  tbody.innerHTML = sigs.map(s => `
    <tr>
      <td><strong class="text-accent">${s.symbol}</strong></td>
      <td>${fmt.badge(s.signal)}</td>
      <td class="num">${s.zScore?.toFixed(2) || '-'}</td>
      <td class="num nowrap">${fmt.num(s.price)}</td>
    </tr>
  `).join('') || '<tr><td colspan="4" class="text-muted text-center">Aucun signal actif</td></tr>';
}

function renderOverviewTrades() {
  const tbody = document.querySelector('#table-recent-trades tbody');
  if (!tbody) return;
  const trades = (DATA.backtests?.recentTrades || []).slice(0, 5);
  tbody.innerHTML = trades.map(t => `
    <tr>
      <td class="nowrap">${t.date}</td>
      <td><span class="badge ${t.action === 'BUY' ? 'badge-buy' : 'badge-sell'}">${t.action}</span></td>
      <td><strong>${t.symbol}</strong></td>
      <td class="num ${t.pnl != null ? (t.pnl >= 0 ? 'text-up' : 'text-down') : ''}">${t.pnl != null ? fmt.fcfa(t.pnl) : '-'}</td>
    </tr>
  `).join('') || '<tr><td colspan="4" class="text-muted text-center">Aucun trade recent</td></tr>';
}

// ═══════════════════════════════════════════════
// PAGE: Portfolio
// ═══════════════════════════════════════════════
function renderPortfolio() {
  renderCoreTable();
  renderSatelliteTable();
  renderWeightsChart();
  renderPortfolioMetrics();
}

function renderCoreTable() {
  const tbody = document.querySelector('#table-core tbody');
  if (!tbody) return;
  const core = DATA.core || [];
  tbody.innerHTML = core.map(c => {
    const z = c.zScore != null ? c.zScore : 0;
    return `
    <tr>
      <td><strong class="text-accent">${c.symbol}</strong><br><small class="text-muted">${c.name}</small></td>
      <td>${c.sector}</td>
      <td class="num">${c.shares}</td>
      <td class="num">${fmt.num(c.avgPrice)}</td>
      <td class="num">${fmt.num(c.currentPrice)}</td>
      <td class="num" style="color:${zScoreColor(z)}">${z.toFixed(2)}</td>
      <td class="num">${(c.weight || 0).toFixed(1)}%</td>
      <td class="num ${c.pnl >= 0 ? 'text-up' : 'text-down'}">${fmt.fcfa(c.pnl)}</td>
      <td class="num ${c.pnlPct >= 0 ? 'text-up' : 'text-down'}">${fmt.pct(c.pnlPct)}</td>
    </tr>
  `}).join('');
}

function renderSatelliteTable() {
  const tbody = document.querySelector('#table-satellite tbody');
  if (!tbody) return;
  const sat = DATA.satellite || [];
  tbody.innerHTML = sat.map(s => {
    const z = s.zScore != null ? s.zScore : 0;
    return `
    <tr>
      <td><strong class="text-accent">${s.symbol}</strong><br><small class="text-muted">${s.name || ''}</small></td>
      <td>${fmt.badge(s.signal)}</td>
      <td class="num" style="color:${zScoreColor(z)}">${z.toFixed(2)}</td>
      <td class="num">${s.shares}</td>
      <td class="num">${fmt.num(s.entryPrice)}</td>
      <td class="num">${fmt.num(s.currentPrice)}</td>
      <td class="num">${fmt.num(s.stopLoss)}</td>
      <td class="num">${fmt.num(s.takeProfit)}</td>
      <td class="num ${(s.pnlPct||0) >= 0 ? 'text-up' : 'text-down'}">${fmt.pct(s.pnlPct)}</td>
      <td class="num">${s.daysHeld || 0}j</td>
    </tr>
  `}).join('') || '<tr><td colspan="10" class="text-muted text-center">Aucune position satellite</td></tr>';
}

function renderWeightsChart() {
  const ctx = document.getElementById('chart-weights');
  if (!ctx) return;
  if (charts.weights) charts.weights.destroy();

  const all = [...(DATA.core || []), ...(DATA.satellite || [])];
  charts.weights = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: all.map(a => a.symbol),
      datasets: [{
        data: all.map(a => Math.abs(a.pnl != null ? (a.shares * (a.currentPrice || a.entryPrice || 0)) : 0)),
        backgroundColor: ['#943a1f','#e94e00','#b85c38','#c97b4b','#d4a574','#5a3e2b','#8b5e3c'],
        borderColor: '#1b191a',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position:'right', labels:{ color:'#a09a96', font:{ family:'Georgia', size:11 }, padding:10, usePointStyle:true } },
        tooltip: tooltipStyle()
      },
      cutout:'60%'
    }
  });
}

function renderPortfolioMetrics() {
  const o = DATA.overview;
  const metrics = [
    ['Capital initial',      fmt.fcfa(o.initialCapital)],
    ['Valeur totale',        fmt.fcfa(o.totalValue)],
    ['Poche CORE (70%)',     fmt.fcfa(o.coreValue)],
    ['Poche SATELLITE (30%)',fmt.fcfa(o.satelliteValue)],
    ['Cash disponible',      fmt.fcfa(o.cashAvailable)],
    ['Drawdown max',         fmt.pct(o.maxDrawdown)],
    ['Taux de gain',         o.winRate + '%'],
    ['Ratio de Sharpe',      o.sharpeRatio?.toFixed(2) || '-']
  ];
  const el = document.getElementById('portfolio-metrics');
  if (!el) return;
  el.innerHTML = metrics.map(([l, v]) =>
    `<div class="metric-row"><span class="metric-label">${l}</span><span class="metric-value">${v}</span></div>`
  ).join('');
}

// ═══════════════════════════════════════════════
// PAGE: Backtests
// ═══════════════════════════════════════════════
function renderBacktests() {
  renderBacktestKPIs();
  renderBacktestTickers();
  renderEquityCurve();
  renderMonthlyReturns();
  renderTradeLog();
}

function renderBacktestKPIs() {
  const s = DATA.backtests?.strategy || {};
  const b = DATA.backtests?.buyHold || {};
  setText('bt-total-return', fmt.pct(s.totalReturn));
  setText('bt-annual-return', fmt.pct(s.annualReturn));
  setText('bt-sharpe', s.sharpe?.toFixed(2) || '-');
  setText('bt-max-dd', fmt.pct(s.maxDrawdown));
  setText('bt-win-rate', (s.winRate || 0) + '%');
  setText('bt-profit-factor', s.profitFactor?.toFixed(2) || '-');
  setText('bt-total-trades', s.totalTrades || 0);
  setText('bt-avg-duration', (s.avgDuration || 0) + ' jours');
  setText('bt-bh-return', fmt.pct(b.totalReturn));
  setText('bt-rf-return', fmt.pct(DATA.backtests?.riskFree?.annualReturn));
  setText('bt-best-ticker', s.bestTicker || '-');
}

function renderBacktestTickers() {
  const tbody = document.querySelector('#table-bt-tickers tbody');
  if (!tbody) return;
  const tickers = DATA.backtests?.perTicker || [];
  tbody.innerHTML = tickers.map(t => `
    <tr>
      <td><strong class="text-accent">${t.ticker}</strong></td>
      <td class="num ${t.totalReturn >= 0 ? 'text-up' : 'text-down'}">${fmt.pct(t.totalReturn)}</td>
      <td class="num">${fmt.pct(t.annualReturn)}</td>
      <td class="num text-accent">${(t.sharpe || 0).toFixed(2)}</td>
      <td class="num text-down">${fmt.pct(t.maxDrawdown)}</td>
      <td class="num">${(t.winRate || 0).toFixed(1)}%</td>
      <td class="num">${t.nTrades || 0}</td>
      <td class="num">${fmt.pct(t.buyHoldReturn)}</td>
      <td class="nowrap text-muted" style="font-size:0.8rem">${t.period || '-'}</td>
    </tr>
  `).join('') || '<tr><td colspan="9" class="text-muted text-center">Aucun backtest disponible</td></tr>';
}

function renderEquityCurve() {
  const ctx = document.getElementById('chart-equity');
  if (!ctx) return;
  if (charts.equity) charts.equity.destroy();

  const ec = DATA.backtests?.equityCurve || [];
  charts.equity = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ec.map(e => e.date),
      datasets: [
        {
          label: 'Stratégie Z-Score',
          data: ec.map(e => e.strategy),
          borderColor: '#e94e00',
          backgroundColor: 'rgba(233,78,0,0.06)',
          fill: true, tension:0.3, borderWidth:2, pointRadius:0
        },
        {
          label: 'Buy & Hold',
          data: ec.map(e => e.buyHold),
          borderColor: '#6b6566',
          borderDash: [6,3],
          fill: false, tension:0.3, borderWidth:1.5, pointRadius:0
        }
      ]
    },
    options: chartOpts('FCFA', true)
  });
}

function renderMonthlyReturns() {
  const ctx = document.getElementById('chart-monthly');
  if (!ctx) return;
  if (charts.monthly) charts.monthly.destroy();

  const mr = DATA.backtests?.monthlyReturns || [];
  charts.monthly = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: mr.map(m => m.month),
      datasets: [{
        label: 'Rendement mensuel',
        data: mr.map(m => m.ret),
        backgroundColor: mr.map(m => m.ret >= 0 ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)'),
        borderColor: mr.map(m => m.ret >= 0 ? '#22c55e' : '#ef4444'),
        borderWidth: 1,
        borderRadius: 3
      }]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins: {
        legend:{ display:false },
        tooltip: tooltipStyle()
      },
      scales: {
        x:{ ticks:{ color:'#6b6566', font:{ family:'Georgia', size:10 } }, grid:{ color:'rgba(58,53,54,0.5)' } },
        y:{ ticks:{ color:'#6b6566', callback:v=>v+'%' }, grid:{ color:'rgba(58,53,54,0.3)' } }
      }
    }
  });
}

function renderTradeLog() {
  const tbody = document.querySelector('#table-trades tbody');
  if (!tbody) return;
  const trades = DATA.backtests?.recentTrades || [];
  tbody.innerHTML = trades.map(t => `
    <tr>
      <td class="nowrap">${t.date}</td>
      <td><span class="badge ${t.action === 'BUY' ? 'badge-buy' : 'badge-sell'}">${t.action}</span></td>
      <td><strong>${t.symbol}</strong></td>
      <td class="num">${t.qty}</td>
      <td class="num">${fmt.num(t.entry)}</td>
      <td class="num">${t.exit ? fmt.num(t.exit) : '-'}</td>
      <td class="num ${t.pnl != null ? (t.pnl >= 0 ? 'text-up' : 'text-down') : ''}">${t.pnl != null ? fmt.fcfa(t.pnl) : 'En cours'}</td>
      <td class="num ${t.pnlPct != null ? (t.pnlPct >= 0 ? 'text-up' : 'text-down') : ''}">${t.pnlPct != null ? fmt.pct(t.pnlPct) : '-'}</td>
      <td class="text-muted">${t.reason || ''}</td>
    </tr>
  `).join('');
}

// ═══════════════════════════════════════════════
// PAGE: Signals
// ═══════════════════════════════════════════════
function renderSignals() {
  renderSignalStats();
  renderSignalTable();
  renderZScoreChart();
}

function renderSignalStats() {
  const s = DATA.signals?.summary || {};
  setText('sig-strong-buy', s.strongBuy || 0);
  setText('sig-buy', s.buy || 0);
  setText('sig-hold', s.hold || 0);
  setText('sig-sell', s.sell || 0);
  setText('sig-strong-sell', s.strongSell || 0);
}

function renderSignalTable() {
  const tbody = document.querySelector('#table-signals tbody');
  if (!tbody) return;
  const sigs = DATA.signals?.current || [];
  tbody.innerHTML = sigs.map(s => `
    <tr>
      <td><strong class="text-accent">${s.symbol}</strong><br><small class="text-muted">${s.name}</small></td>
      <td class="num">${fmt.num(s.price)}</td>
      <td class="num" style="color:${zScoreColor(s.zScore)}">${s.zScore?.toFixed(2) || '-'}</td>
      <td>${fmt.badge(s.signal)}</td>
      <td class="num">${fmt.num(s.volume)}</td>
      <td class="num">${s.volatility?.toFixed(1) || '-'}%</td>
    </tr>
  `).join('');
}

function renderZScoreChart() {
  const ctx = document.getElementById('chart-zscore');
  if (!ctx) return;
  if (charts.zscore) charts.zscore.destroy();

  const sigs = (DATA.signals?.current || []).slice().sort((a, b) => a.zScore - b.zScore);
  charts.zscore = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sigs.map(s => s.symbol),
      datasets: [{
        label: 'Z-Score',
        data: sigs.map(s => s.zScore),
        backgroundColor: sigs.map(s => {
          if (s.zScore <= -3) return 'rgba(34,197,94,0.8)';
          if (s.zScore <= -2.5) return 'rgba(34,197,94,0.5)';
          if (s.zScore >= 3) return 'rgba(239,68,68,0.8)';
          if (s.zScore >= 2.5) return 'rgba(239,68,68,0.5)';
          return 'rgba(107,101,102,0.3)';
        }),
        borderRadius: 3
      }]
    },
    options: {
      indexAxis: 'y',
      responsive:true, maintainAspectRatio:false,
      plugins: { legend:{display:false}, tooltip:tooltipStyle() },
      scales: {
        x:{ ticks:{ color:'#6b6566' }, grid:{ color:'rgba(58,53,54,0.3)' } },
        y:{ ticks:{ color:'#a09a96', font:{ family:'Georgia', size:10 } }, grid:{ display:false } }
      }
    }
  });
}

function zScoreColor(z) {
  if (z == null) return '#6b6566';
  if (z <= -3) return '#22c55e';
  if (z <= -2.5) return '#6ee7b7';
  if (z >= 3) return '#ef4444';
  if (z >= 2.5) return '#fca5a5';
  return '#a09a96';
}

// ═══════════════════════════════════════════════
// PAGE: Bonds
// ═══════════════════════════════════════════════
function renderBonds() {
  renderBondTable();
  renderYieldChart();
}

function renderBondTable() {
  const tbody = document.querySelector('#table-bonds tbody');
  if (!tbody) return;
  const bonds = DATA.bonds?.opportunities || [];
  tbody.innerHTML = bonds.map(b => `
    <tr>
      <td><strong>${b.name}</strong></td>
      <td class="num">${b.coupon.toFixed(2)}%</td>
      <td class="nowrap">${b.maturity}</td>
      <td class="num">${b.price.toFixed(1)}</td>
      <td class="num text-accent">${b.yieldEff.toFixed(2)}%</td>
      <td class="num ${b.discount > 2 ? 'text-up' : ''}">${b.discount.toFixed(1)}%</td>
      <td>${b.rating}</td>
    </tr>
  `).join('') || '<tr><td colspan="7" class="text-muted text-center">Aucune obligation disponible</td></tr>';
}

function renderYieldChart() {
  const ctx = document.getElementById('chart-yields');
  if (!ctx) return;
  if (charts.yields) charts.yields.destroy();

  const bonds = (DATA.bonds?.opportunities || []).slice().sort((a, b) => b.yieldEff - a.yieldEff);
  charts.yields = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: bonds.map(b => b.name.split(' ')[0] + ' ' + b.coupon + '%'),
      datasets: [
        {
          label: 'Rendement effectif',
          data: bonds.map(b => b.yieldEff),
          backgroundColor: 'rgba(233,78,0,0.6)',
          borderColor: '#e94e00',
          borderWidth: 1, borderRadius: 3
        },
        {
          label: 'Coupon',
          data: bonds.map(b => b.coupon),
          backgroundColor: 'rgba(148,58,31,0.5)',
          borderColor: '#943a1f',
          borderWidth: 1, borderRadius: 3
        }
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins: {
        legend:{ labels:{ color:'#a09a96', font:{ family:'Georgia', size:11 }, usePointStyle:true } },
        tooltip: tooltipStyle()
      },
      scales: {
        x:{ ticks:{ color:'#6b6566', font:{ family:'Georgia', size:10 }, maxRotation:45 }, grid:{ color:'rgba(58,53,54,0.3)' } },
        y:{ ticks:{ color:'#6b6566', callback:v=>v+'%' }, grid:{ color:'rgba(58,53,54,0.3)' }, beginAtZero:true }
      }
    }
  });
}

// ═══════════════════════════════════════════════
// PAGE: Logs / Historique
// ═══════════════════════════════════════════════
function renderLogs() {
  const logs = DATA.allLogs || DATA.logs || [];

  // KPIs
  setText('log-total-runs', logs.length);
  if (logs.length > 0) {
    const lastEntry = logs[logs.length - 1];
    setText('log-last-date', lastEntry.date || '-');
    const bestRet = Math.max(...logs.map(l => l.totalReturn || 0));
    setText('log-best-return', fmt.pct(bestRet));
    const bestSharpe = Math.max(...logs.map(l => l.sharpe || 0));
    setText('log-best-sharpe', bestSharpe.toFixed(2));
  }

  // Table
  const tbody = document.querySelector('#table-logs tbody');
  if (tbody) {
    const recent = logs.slice(-15).reverse();
    tbody.innerHTML = recent.map(l => `
      <tr>
        <td class="nowrap">${l.date || '-'}</td>
        <td><strong class="text-accent">${l.ticker || '-'}</strong></td>
        <td class="num ${(l.totalReturn||0) >= 0 ? 'text-up' : 'text-down'}">${fmt.pct(l.totalReturn)}</td>
        <td class="num">${fmt.pct(l.annualReturn)}</td>
        <td class="num text-accent">${(l.sharpe || 0).toFixed(2)}</td>
        <td class="num text-down">${fmt.pct(l.maxDrawdown)}</td>
        <td class="num">${(l.winRate || 0).toFixed(1)}%</td>
        <td class="num">${l.nTrades || 0}</td>
        <td class="num">${(l.profitFactor || 0).toFixed(2)}</td>
        <td class="num">${fmt.pct(l.buyHoldReturn)}</td>
        <td class="num">${fmt.fcfa(l.capitalFinal)}</td>
      </tr>
    `).join('') || '<tr><td colspan="11" class="text-muted text-center">Aucun historique disponible - Executez generate_dashboard_data.py</td></tr>';
  }

  // Chart: bar chart of returns by ticker (latest run per ticker)
  renderLogReturnsChart(logs);
}

function renderLogReturnsChart(logs) {
  const ctx = document.getElementById('chart-log-returns');
  if (!ctx) return;
  if (charts.logReturns) charts.logReturns.destroy();

  // Group by ticker, take latest entry per ticker
  const byTicker = {};
  for (const l of logs) {
    byTicker[l.ticker] = l;
  }
  const tickers = Object.values(byTicker).sort((a, b) => (b.totalReturn||0) - (a.totalReturn||0));

  charts.logReturns = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: tickers.map(t => t.ticker),
      datasets: [
        {
          label: 'Rendement Strategie',
          data: tickers.map(t => t.totalReturn || 0),
          backgroundColor: tickers.map(t => (t.totalReturn||0) >= 0 ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)'),
          borderColor: tickers.map(t => (t.totalReturn||0) >= 0 ? '#22c55e' : '#ef4444'),
          borderWidth: 1, borderRadius: 3
        },
        {
          label: 'Buy & Hold',
          data: tickers.map(t => t.buyHoldReturn || 0),
          backgroundColor: 'rgba(107,101,102,0.4)',
          borderColor: '#6b6566',
          borderWidth: 1, borderRadius: 3
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color:'#a09a96', font:{ family:'Georgia', size:11 }, usePointStyle:true } },
        tooltip: tooltipStyle()
      },
      scales: {
        x: { ticks:{ color:'#6b6566', font:{ family:'Georgia' } }, grid:{ color:'rgba(58,53,54,0.3)' } },
        y: { ticks:{ color:'#6b6566', callback:v=>v+'%' }, grid:{ color:'rgba(58,53,54,0.3)' } }
      }
    }
  });
}

// ── Chart.js shared options ───────────────────
function chartOpts(unit, fill) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode:'index', intersect:false },
    plugins: {
      legend: { labels:{ color:'#a09a96', font:{ family:'Georgia', size:11 }, usePointStyle:true, padding:16 } },
      tooltip: tooltipStyle()
    },
    scales: {
      x: {
        ticks: { color:'#6b6566', font:{ family:'Georgia', size:10 }, maxTicksLimit:12 },
        grid: { color:'rgba(58,53,54,0.3)' }
      },
      y: {
        ticks: { color:'#6b6566', font:{ family:'Georgia', size:10 },
          callback: v => unit === 'FCFA' ? (v/1000).toFixed(0)+'k' : v+'%'
        },
        grid: { color:'rgba(58,53,54,0.3)' }
      }
    }
  };
}

function tooltipStyle() {
  return {
    backgroundColor: '#242122',
    titleColor: '#f0ece8',
    bodyColor: '#a09a96',
    borderColor: '#3a3536',
    borderWidth: 1,
    titleFont: { family:'Aoboshi One', size:13 },
    bodyFont: { family:'Georgia', size:12 },
    padding: 12,
    cornerRadius: 8
  };
}

// ── DOM Helpers ───────────────────────────────
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
function setClass(id, cls) {
  const el = document.getElementById(id);
  if (el) el.className = cls;
}
function setHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

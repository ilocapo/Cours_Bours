"""
Terminal Altos — Dashboard de Trading BRVM
Version 3.0 — Bloomberg Terminal Style
"""
import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import subprocess, os, sys, glob, time
from datetime import datetime, date

# ══════════════════════════════════════════════════════════
#  CONFIG & THEME
# ══════════════════════════════════════════════════════════
st.set_page_config(
    page_title="Terminal Altos",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded"
)

C_BG     = "#000000"
C_CARD   = "#0a0a0a"
C_BORDER = "#1a1a1a"
C_ORANGE = "#FF8C00"
C_BLUE   = "#00BFFF"   # cyan/teal pour graphiques
C_GREEN  = "#00E676"
C_RED    = "#FF4040"
C_YELLOW = "#FFD700"
C_PURPLE = "#CC44FF"
C_TEXT   = "#F0F0F0"
C_MUTED  = "#666666"
FONT     = "'Courier New', 'Consolas', monospace"

st.markdown(f"""
<style>
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

  * {{ font-family:{FONT} !important; }}
  .stApp {{ background-color:{C_BG}; color:{C_TEXT}; }}
  section[data-testid="stSidebar"] {{
    background-color:#000000;
    border-right:1px solid {C_ORANGE};
  }}
  #MainMenu, footer, header {{ visibility:hidden; }}
  .block-container {{ padding-top:0.5rem; padding-bottom:2rem; }}

  /* ── KPI Bloomberg ── */
  .blm-kpi {{
    background:{C_CARD};
    border:1px solid #1a1a1a;
    border-left:3px solid {C_ORANGE};
    padding:10px 12px 8px;
    margin-bottom:6px;
  }}
  .blm-kpi-val {{
    font-size:1.55rem; font-weight:700; margin:0;
    line-height:1.1; font-family:{FONT};
  }}
  .blm-kpi-lbl {{
    font-size:0.62rem; color:{C_MUTED}; margin:4px 0 0 0;
    letter-spacing:.1em; text-transform:uppercase; font-family:{FONT};
  }}
  .blm-kpi-sub {{
    font-size:0.7rem; margin:3px 0 0 0; color:#888888; font-family:{FONT};
  }}

  /* ── Section header: barre orange Bloomberg ── */
  .blm-sec {{
    background:{C_ORANGE};
    color:#000000;
    font-size:0.65rem; font-weight:700;
    letter-spacing:.12em; text-transform:uppercase;
    padding:2px 8px; margin:16px 0 8px 0;
    font-family:{FONT};
  }}

  /* ── Scrollbar ── */
  ::-webkit-scrollbar {{ width:4px; background:#000; }}
  ::-webkit-scrollbar-thumb {{ background:{C_ORANGE}; }}

  /* ── Buttons ── */
  .stButton>button {{
    background:{C_ORANGE};
    color:#000000;
    border:none;
    border-radius:0px;
    font-weight:700;
    height:42px; width:100%;
    font-family:{FONT};
    font-size:0.85rem;
    letter-spacing:.05em;
  }}
  .stButton>button:hover {{
    background:#FFA333;
    color:#000000;
  }}

  /* ── Sidebar nav radio ── */
  div[data-testid="stRadio"] label {{
    font-size:0.82rem; color:{C_TEXT}; font-family:{FONT};
  }}
  div[data-testid="stRadio"] label:hover {{ color:{C_ORANGE}; }}

  /* ── Tables ── */
  .stDataFrame {{ overflow:hidden; }}
  .stDataFrame th {{
    background:{C_ORANGE} !important;
    color:#000000 !important;
    font-family:{FONT} !important;
    font-size:0.7rem !important;
    font-weight:700 !important;
    text-transform:uppercase;
  }}

  /* ── Selectbox / Multiselect / Slider ── */
  .stSelectbox>div>div, .stMultiSelect>div>div {{
    background:{C_CARD}; border:1px solid #333; border-radius:0;
  }}

  /* ── Divider ── */
  hr {{ border-color:{C_ORANGE}; opacity:0.25; }}
</style>
""", unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════
#  CONSTANTES
# ══════════════════════════════════════════════════════════
BASE         = os.path.dirname(os.path.abspath(__file__))
CAPITAL_INIT = 1_000_000
CORE_STOCKS  = ['SNTS', 'ORGT', 'ONTBF', 'SAFC', 'ABJC']
PLOTLY_BASE  = dict(
    template="plotly_dark",
    plot_bgcolor="#000000",
    paper_bgcolor="#000000",
    font=dict(family="Courier New, monospace", color=C_TEXT, size=11),
    margin=dict(l=40, r=15, t=35, b=30),
    xaxis=dict(gridcolor="#111111", linecolor="#333333", tickfont=dict(family="Courier New")),
    yaxis=dict(gridcolor="#111111", linecolor="#333333", tickfont=dict(family="Courier New")),
)

# ══════════════════════════════════════════════════════════
#  DATA LOADERS
# ══════════════════════════════════════════════════════════
@st.cache_data(ttl=60)
def load_ytd():
    p = os.path.join(BASE, "YTD_2026.csv")
    if not os.path.exists(p): return pd.DataFrame()
    df = pd.read_csv(p); df.columns = df.columns.str.strip()
    df['Date'] = pd.to_datetime(df['Date'], format='mixed', dayfirst=True, errors='coerce')
    df = df.dropna(subset=['Date']).sort_values('Date')
    return df.groupby('Date').last().reset_index()

@st.cache_data(ttl=30)
def load_signals():
    today = date.today().strftime("%Y%m%d")
    p = os.path.join(BASE, "output", "signals", f"signals_{today}.csv")
    if not os.path.exists(p):
        files = sorted(glob.glob(os.path.join(BASE, "output", "signals", "signals_*.csv")))
        if not files: return pd.DataFrame(), "–"
        p = files[-1]
    df = pd.read_csv(p); df.columns = df.columns.str.strip()
    return df, os.path.basename(p)

@st.cache_data(ttl=120)
def load_core():
    p = os.path.join(BASE, "core_allocation.csv")
    if not os.path.exists(p): return pd.DataFrame()
    return pd.read_csv(p)

@st.cache_data(ttl=120)
def load_bonds():
    files = sorted(glob.glob(os.path.join(BASE, "bond_opportunities_*.csv")))
    if not files: return pd.DataFrame(), "–"
    df = pd.read_csv(files[-1]); df.columns = df.columns.str.strip()
    return df, os.path.basename(files[-1])

@st.cache_data(ttl=300)
def load_historical(ticker):
    for p in [os.path.join(BASE, "data", "cours_boursiers_fusion.csv"),
              os.path.join(BASE, "cours_boursiers_fusion.csv")]:
        if os.path.exists(p): break
    else: return pd.DataFrame()
    df = pd.read_csv(p, low_memory=False); df.columns = df.columns.str.strip()
    dc = next((c for c in df.columns if 'date'   in c.lower()), df.columns[0])
    tc = next((c for c in df.columns if 'ticker' in c.lower()), None)
    pc = next((c for c in df.columns if any(x in c.lower() for x in ['close','prix','price'])), None)
    if not tc or not pc: return pd.DataFrame()
    df[dc] = pd.to_datetime(df[dc], format='mixed', dayfirst=True, errors='coerce')
    sub = df[df[tc] == ticker][[dc, pc]].copy()
    sub.columns = ['Date', 'Price']
    return sub.dropna().sort_values('Date')

def load_last_log():
    files = sorted(glob.glob(os.path.join(BASE, "logs", "automation_*.log")))
    if not files: return "Aucun log.", "–"
    with open(files[-1], "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
    return "".join(lines[-50:]), os.path.basename(files[-1])

# ══════════════════════════════════════════════════════════
#  DONNÉES LIVE
# ══════════════════════════════════════════════════════════
ytd_df            = load_ytd()
signals_df, sig_f = load_signals()
core_df           = load_core()
bonds_df, bond_f  = load_bonds()

if not ytd_df.empty:
    row       = ytd_df.iloc[-1]
    prev_row  = ytd_df.iloc[-2] if len(ytd_df) > 1 else row
    total_val = float(row.get('Total_Value',    0))
    core_val  = float(row.get('Core_Value',     0))
    sat_val   = float(row.get('Satellite_Value',0))
    ytd_ret   = float(row.get('YTD_Return_%',   0))
    prev_tot  = float(prev_row.get('Total_Value', total_val))
    day_chg   = total_val - prev_tot
    day_pct   = day_chg / prev_tot * 100 if prev_tot else 0
else:
    total_val = core_val = sat_val = ytd_ret = day_chg = day_pct = 0

gain_abs = total_val - CAPITAL_INIT
n_buy    = len(signals_df[signals_df['Signal'].str.contains('Buy',  na=False)]) if not signals_df.empty and 'Signal' in signals_df.columns else 0
n_sell   = len(signals_df[signals_df['Signal'].str.contains('Sell', na=False)]) if not signals_df.empty and 'Signal' in signals_df.columns else 0
n_total  = len(signals_df) if not signals_df.empty else 0

# ══════════════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════════════
def kpi(val, label, sub="", color=C_ORANGE, border=None):
    bc = border or color
    st.markdown(f"""
    <div class="blm-kpi" style="border-left:3px solid {bc};">
      <p class="blm-kpi-val" style="color:{color};">{val}</p>
      <p class="blm-kpi-lbl">{label}</p>
      {"<p class='blm-kpi-sub'>&gt; "+sub+"</p>" if sub else ""}
    </div>""", unsafe_allow_html=True)

def sec(title):
    st.markdown(f'<div class="blm-sec">&gt;&gt; {title}</div>', unsafe_allow_html=True)

def fcfa(v):  return f"{v:,.0f} FCFA".replace(",", " ")
def pct(v):   return f"{v:+.2f}%"

# ══════════════════════════════════════════════════════════
#  SIDEBAR
# ══════════════════════════════════════════════════════════
with st.sidebar:
    st.markdown(f"""
    <div style="background:{C_ORANGE}; padding:8px 12px; margin:-1rem -1rem 12px -1rem;">
      <p style="font-size:0.65rem; font-weight:700; margin:0; color:#000;
         letter-spacing:.15em; font-family:Courier New,monospace;">ALTOS TRADING TERMINAL</p>
      <p style="font-size:1.4rem; font-weight:700; margin:0; color:#000;
         font-family:Courier New,monospace; letter-spacing:.05em;">BRVM</p>
      <p style="font-size:0.58rem; color:#333; margin:2px 0 0 0;
         font-family:Courier New,monospace;">{datetime.now().strftime('%d/%m/%Y %H:%M:%S')}</p>
    </div>
    """, unsafe_allow_html=True)

    st.markdown(f'<p style="font-size:0.6rem; color:{C_ORANGE}; letter-spacing:.1em; margin:4px 0 2px 0;">F1-F5 NAVIGATION</p>', unsafe_allow_html=True)
    page = st.radio("", [
        "F1  Vue d'ensemble",
        "F2  Signaux & Z-Score",
        "F3  Portfolio CORE",
        "F4  Obligations",
        "F5  Contrôle"
    ], label_visibility="collapsed")

    st.divider()

    sig_col = C_GREEN if n_buy > 0 else C_YELLOW
    ytd_col = C_GREEN if ytd_ret >= 0 else C_RED
    st.markdown(f"""
    <div style="background:#0a0a0a; border:1px solid #1a1a1a; border-left:2px solid {C_ORANGE}; padding:10px 12px;">
      <p style="margin:0 0 8px 0; font-size:0.6rem; color:{C_ORANGE};
         text-transform:uppercase; letter-spacing:.1em; font-family:Courier New;">LIVE STATUS</p>

      <div style="display:flex; justify-content:space-between; margin:3px 0; border-bottom:1px solid #111; padding-bottom:3px;">
        <span style="font-size:0.72rem; color:{C_MUTED}; font-family:Courier New;">PORTFOLIO</span>
        <span style="font-size:0.75rem; font-weight:700; color:{C_TEXT}; font-family:Courier New;">{fcfa(total_val)}</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin:3px 0; border-bottom:1px solid #111; padding-bottom:3px;">
        <span style="font-size:0.72rem; color:{C_MUTED}; font-family:Courier New;">YTD 2026</span>
        <span style="font-size:0.75rem; font-weight:700; color:{ytd_col}; font-family:Courier New;">{pct(ytd_ret)}</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin:3px 0; border-bottom:1px solid #111; padding-bottom:3px;">
        <span style="font-size:0.72rem; color:{C_MUTED}; font-family:Courier New;">BUY SIG</span>
        <span style="font-size:0.75rem; font-weight:700; color:{sig_col}; font-family:Courier New;">{n_buy} / {n_total}</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin:3px 0;">
        <span style="font-size:0.72rem; color:{C_MUTED}; font-family:Courier New;">TIME</span>
        <span style="font-size:0.72rem; color:{C_ORANGE}; font-family:Courier New;">{datetime.now().strftime('%d/%m %H:%M:%S')}</span>
      </div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)
    if st.button("REFRESH DATA"):
        st.cache_data.clear()
        st.rerun()


# ══════════════════════════════════════════════════════════
#  PAGE 1 — VUE D'ENSEMBLE
# ══════════════════════════════════════════════════════════
if "Vue d'ensemble" in page or "F1" in page:
    st.markdown(f"""
    <div style="background:{C_ORANGE}; padding:6px 14px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center;">
      <span style="font-size:0.95rem; font-weight:700; color:#000; font-family:Courier New; letter-spacing:.05em;">F1  VUE D'ENSEMBLE — BRVM TRADING TERMINAL</span>
      <span style="font-size:0.7rem; color:#333; font-family:Courier New;">{datetime.now().strftime('%d/%m/%Y %H:%M:%S')} · CAP: 1 000 000 FCFA</span>
    </div>
    """, unsafe_allow_html=True)

    # ── KPI row 1 ──
    c1, c2, c3, c4, c5 = st.columns(5)
    with c1: kpi(fcfa(total_val),            "Valeur totale",      pct(ytd_ret)+" YTD",               C_ORANGE)
    with c2: kpi(fcfa(gain_abs),             "Gain net",           "Depuis 01/01/2026",                C_GREEN if gain_abs>=0 else C_RED)
    with c3: kpi(pct(day_pct),               "Variation du jour",  fcfa(day_chg),                     C_GREEN if day_chg>=0 else C_RED)
    with c4: kpi(fcfa(core_val),             "CORE Shield (70%)",  f"{core_val/total_val*100:.0f}% du portfolio" if total_val else "–", C_YELLOW)
    with c5: kpi(str(n_buy)+" BUY",          "Signaux actifs",     f"{n_sell} SELL · {n_total} analysés", C_GREEN if n_buy>0 else C_ORANGE)

    st.divider()
    left, right = st.columns([2.2, 1])

    with left:
        sec("Évolution du portefeuille YTD 2026")
        if not ytd_df.empty and 'Total_Value' in ytd_df.columns:
            fig = go.Figure()
            fig.add_trace(go.Scatter(
                x=ytd_df['Date'], y=ytd_df['Total_Value'], name="Valeur totale",
                mode='lines', line=dict(color=C_ORANGE, width=2),
                fill='tozeroy', fillcolor='rgba(255,140,0,0.07)'
            ))
            if 'Core_Value' in ytd_df.columns:
                fig.add_trace(go.Scatter(
                    x=ytd_df['Date'], y=ytd_df['Core_Value'], name="CORE",
                    mode='lines', line=dict(color=C_YELLOW, width=1.2, dash='dot')
                ))
            fig.add_hline(y=CAPITAL_INIT, line_dash="dash", line_color="#444444", line_width=1,
                          annotation_text="Capital initial", annotation_font_color="#666666")
            fig.update_layout(**PLOTLY_BASE, height=310,
                              legend=dict(orientation="h", yanchor="bottom", y=1.02, x=0),
                              xaxis=dict(showgrid=False), yaxis=dict(gridcolor=C_BORDER))
            st.plotly_chart(fig, width='stretch')

        # CORE tiles
        sec("Prix CORE en direct")
        if not signals_df.empty and 'Ticker' in signals_df.columns:
            cols5 = st.columns(5)
            for i, ticker in enumerate(CORE_STOCKS):
                rs = signals_df[signals_df['Ticker'] == ticker]
                price  = float(rs.iloc[0]['Price'])   if len(rs) and 'Price'   in rs.columns else 0
                zscore = float(rs.iloc[0]['Z_Score'])  if len(rs) and 'Z_Score' in rs.columns else 0
                zc = C_RED if zscore > 2 else (C_GREEN if zscore < -2 else C_TEXT)
                with cols5[i]:
                    st.markdown(f"""
                    <div style="background:#0a0a0a; border:1px solid #1a1a1a; border-top:2px solid {C_ORANGE};
                         padding:8px 10px; font-family:Courier New,monospace;">
                      <p style="font-size:0.75rem; font-weight:700; color:{C_ORANGE}; margin:0; letter-spacing:.05em;">{ticker}</p>
                      <p style="font-size:1.2rem; font-weight:700; color:{C_TEXT}; margin:3px 0; font-family:Courier New;">{price:,.0f}</p>
                      <p style="font-size:0.68rem; color:{zc}; margin:0; font-family:Courier New;">Z={zscore:+.2f}</p>
                    </div>""", unsafe_allow_html=True)

    with right:
        sec("Statistiques backtest 2017–2025")
        stats = [
            ("Win Rate",        "58 %",   C_GREEN),
            ("Profit Factor",   "1.8",    C_GREEN),
            ("Sharpe Ratio",    "1.8",    C_GREEN),
            ("Sortino Ratio",   "2.2",    C_GREEN),
            ("Max Drawdown",    "−12 %",  C_YELLOW),
            ("Total Trades",    "1 800",  C_BLUE),
            ("CAGR estimé",     "18 %",   C_GREEN),
            ("Recovery Factor", "2.87",   C_GREEN),
        ]
        for label, val, color in stats:
            st.markdown(f"""
            <div style="display:flex; justify-content:space-between;
                 padding:6px 0; border-bottom:1px solid {C_BORDER};">
              <span style="font-size:0.78rem; color:{C_MUTED};">{label}</span>
              <span style="font-size:0.82rem; font-weight:700; color:{color};">{val}</span>
            </div>""", unsafe_allow_html=True)

        sec("Dernier run automation")
        log_txt, log_name = load_last_log()
        ok_lines = [l.strip() for l in log_txt.split('\n') if ('OK:' in l or 'SUCCES' in l or 'ERROR' in l) and l.strip()]
        for line in ok_lines[-7:]:
            c = C_GREEN if ('OK' in line or 'SUCCES' in line) else C_RED
            icon = "✅" if ('OK' in line or 'SUCCES' in line) else "❌"
            msg = line.replace('[','').replace(']','').strip()[:52]
            st.markdown(f"<p style='font-size:0.75rem; margin:2px 0; color:{c};'>{icon} {msg}</p>", unsafe_allow_html=True)
        st.caption(log_name)


# ══════════════════════════════════════════════════════════
#  PAGE 2 — SIGNAUX & Z-SCORE
# ══════════════════════════════════════════════════════════
elif "Signaux" in page or "F2" in page:
    st.markdown(f"""
    <div style="background:{C_ORANGE}; padding:6px 14px; margin-bottom:14px; display:flex; justify-content:space-between;">
      <span style="font-size:0.95rem; font-weight:700; color:#000; font-family:Courier New;">F2  SIGNAUX Z-SCORE — RADAR DE MARCHE BRVM</span>
      <span style="font-size:0.7rem; color:#333; font-family:Courier New;">{sig_f}</span>
    </div>
    """, unsafe_allow_html=True)

    if signals_df.empty:
        st.warning("Aucun signal. Lance l'automation dans ⚙️ Contrôle")
    else:
        k1, k2, k3, k4 = st.columns(4)
        strong_b = len(signals_df[signals_df['Signal'] == 'Strong Buy'])  if 'Signal' in signals_df.columns else 0
        strong_s = len(signals_df[signals_df['Signal'] == 'Strong Sell']) if 'Signal' in signals_df.columns else 0
        with k1: kpi(str(n_buy),    "Signaux BUY",    "Opportunités d'achat", C_GREEN)
        with k2: kpi(str(strong_b), "Strong BUY",     "Z-Score ≤ −2",         C_GREEN)
        with k3: kpi(str(n_sell),   "Signaux SELL",   "Vendre / Éviter",      C_RED)
        with k4: kpi(str(n_total),  "Total analysés", "Actions BRVM scrapées",C_ORANGE)

        st.divider()
        f1, f2, f3 = st.columns([2.5, 1.5, 1.5])
        with f1:
            opts = sorted(signals_df['Signal'].dropna().unique()) if 'Signal' in signals_df.columns else []
            sel  = st.multiselect("Filtrer par type de signal", opts)
        with f2:
            buy_only = st.checkbox("📈 BUY seulement", False)
        with f3:
            sort_col = st.selectbox("Trier par", ["Z_Score","Price","Ticker"])

        filt = signals_df.copy()
        if buy_only: filt = filt[filt['Signal'].str.contains('Buy', na=False)]
        if sel:      filt = filt[filt['Signal'].isin(sel)]
        if sort_col in filt.columns:
            filt = filt.sort_values(sort_col, ascending=(sort_col == 'Ticker'))

        sec(f"{len(filt)} signal(s) · {n_buy} BUY / {n_sell} SELL")
        show_cols = [c for c in ['Ticker','Signal','Z_Score','Price','Action','Qty','TP_Pct','SL_Pct'] if c in filt.columns]
        disp = filt[show_cols].copy()
        if 'Z_Score' in disp.columns:
            disp['Z_Score'] = disp['Z_Score'].apply(lambda x: f"{x:+.2f}" if pd.notnull(x) else "–")

        def hl_row(row):
            sig = str(row.get('Signal',''))
            if   'Strong Buy'  in sig: s = f'background-color:#064e3b30; color:#34d399'
            elif 'Buy'         in sig: s = f'background-color:#065f4620; color:#6ee7b7'
            elif 'Strong Sell' in sig: s = f'background-color:#450a0a30; color:#fca5a5'
            elif 'Sell'        in sig: s = f'background-color:#7f1d1d20; color:#fecaca'
            else:                       s = ''
            return [s] * len(row)

        st.dataframe(disp.style.apply(hl_row, axis=1), width='stretch', height=380)

    # ── Graphique Z-Score ──
    st.divider()
    sec("Graphique interactif Z-Score")
    all_t = sorted(set(CORE_STOCKS + (signals_df['Ticker'].dropna().unique().tolist() if not signals_df.empty and 'Ticker' in signals_df.columns else [])))

    g1, g2, g3 = st.columns([2, 1, 1])
    with g1: sel_t = st.selectbox("Choisir une action", all_t)
    with g2: win   = st.selectbox("Fenêtre (jours)", [95, 200, 50])
    with g3: nb    = st.slider("Historique (jours)", 100, 1000, 400, 50)

    hist = load_historical(sel_t)
    if hist.empty:
        st.info(f"Pas de données historiques pour {sel_t}")
    else:
        h = hist.tail(nb).copy()
        h['MA']    = h['Price'].rolling(win).mean()
        h['STD']   = h['Price'].rolling(win).std()
        h['Z']     = (h['Price'] - h['MA']) / h['STD']
        h['BB_UP'] = h['MA'] + 2 * h['STD']
        h['BB_DN'] = h['MA'] - 2 * h['STD']

        fig = make_subplots(rows=2, cols=1, shared_xaxes=True,
                            row_heights=[0.65, 0.35], vertical_spacing=0.04,
                            subplot_titles=[f"{sel_t} — Prix & Bandes de Bollinger",
                                            f"Z-Score (fenêtre {win} jours)"])
        fig.add_trace(go.Scatter(x=h['Date'], y=h['Price'], name="Prix",
                                  line=dict(color=C_ORANGE, width=1.8)), row=1, col=1)
        fig.add_trace(go.Scatter(x=h['Date'], y=h['MA'], name=f"MM{win}",
                                  line=dict(color=C_YELLOW, width=1, dash='dash')), row=1, col=1)
        fig.add_trace(go.Scatter(x=h['Date'], y=h['BB_UP'], name="+2s",
                                  line=dict(color='rgba(255,64,64,0.4)', width=0.7)), row=1, col=1)
        fig.add_trace(go.Scatter(x=h['Date'], y=h['BB_DN'], name="-2s",
                                  line=dict(color='rgba(0,230,118,0.4)', width=0.7),
                                  fill='tonexty', fillcolor='rgba(255,140,0,0.03)'), row=1, col=1)
        zc = h['Z'].apply(lambda z: C_GREEN if z<=-2 else(C_ORANGE if z<=0 else(C_YELLOW if z<=2 else C_RED)))
        fig.add_trace(go.Bar(x=h['Date'], y=h['Z'], name="Z-Score",
                              marker_color=zc, opacity=0.75), row=2, col=1)
        for yv, col, d in [(-2,C_GREEN,'dash'),(2,C_RED,'dash'),(0,C_MUTED,'dot')]:
            fig.add_hline(y=yv, line_dash=d, line_color=col, row=2, col=1, line_width=1)
        fig.update_layout(**PLOTLY_BASE, height=560,
                          legend=dict(orientation="h", yanchor="bottom", y=1.02, x=0),
                          xaxis2=dict(showgrid=False),
                          yaxis=dict(gridcolor=C_BORDER),
                          yaxis2=dict(gridcolor=C_BORDER))
        st.plotly_chart(fig, width='stretch')

        if not signals_df.empty and 'Ticker' in signals_df.columns:
            rs = signals_df[signals_df['Ticker'] == sel_t]
            if not rs.empty:
                sn = rs.iloc[0].get('Signal','')
                zn = float(rs.iloc[0].get('Z_Score', 0))
                sc = C_GREEN if 'Buy' in sn else (C_RED if 'Sell' in sn else C_MUTED)
                act = ">> ACHETER" if 'Buy' in sn else (">> EVITER" if 'Sell' in sn else ">> ATTENDRE")
                st.markdown(f"""
                <div style='background:#0a0a0a; border:1px solid #1a1a1a; border-left:3px solid {sc}; padding:10px 14px; margin-top:8px; font-family:Courier New,monospace;'>
                  <span style='font-size:1rem; font-weight:700; color:{sc}; font-family:Courier New;'>{sn}</span>
                  <span style='color:{C_MUTED}; font-size:0.82rem; font-family:Courier New;'>&nbsp;&nbsp;Z={zn:+.2f} &nbsp;|&nbsp; {act}</span>
                </div>""", unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════
#  PAGE 3 — PORTFOLIO CORE
# ══════════════════════════════════════════════════════════
elif "CORE" in page or "F3" in page:
    st.markdown(f"""
    <div style="background:{C_ORANGE}; padding:6px 14px; margin-bottom:14px; display:flex; justify-content:space-between;">
      <span style="font-size:0.95rem; font-weight:700; color:#000; font-family:Courier New;">F3  PORTFOLIO CORE — BOUCLIER DIVIDENDES BRVM</span>
      <span style="font-size:0.7rem; color:#333; font-family:Courier New;">5 BIG CAPS · DÉTENUES DEPUIS 2017</span>
    </div>
    """, unsafe_allow_html=True)

    c1, c2, c3, c4 = st.columns(4)
    core_gain = core_val - 700_000
    with c1: kpi(fcfa(core_val),                "Valeur CORE actuelle", "",            C_ORANGE)
    with c2: kpi(fcfa(700_000),                 "Capital investi",      "",            C_MUTED)
    with c3: kpi(fcfa(core_gain),               "Gain CORE",            pct(core_gain/700_000*100) if 700_000 else "–", C_GREEN if core_gain>=0 else C_RED)
    with c4: kpi("~8.5 % / an",                "Dividendes estimés",   "≈ 59 500 FCFA/an", C_GREEN)

    st.divider()
    t1, t2 = st.columns([2, 1])

    with t1:
        sec("Détail des 5 positions CORE")
        if not core_df.empty:
            cols_c = [c for c in ['Ticker','Entry_Price','Current_Price','Qty','Current_Value','P&L','P&L_%','Dividend_Yield_%','Status'] if c in core_df.columns]
            disp   = core_df[cols_c].copy()

            def hl_core(row):
                try:
                    v = float(str(row.get('P&L_%',0)).replace('%',''))
                    s = 'background-color:#064e3b20' if v>=0 else 'background-color:#450a0a20'
                except: s = ''
                return [s]*len(row)

            def col_pnl(val):
                try:
                    v = float(str(val).replace('%',''))
                    return f'color:{C_GREEN}; font-weight:700' if v>=0 else f'color:{C_RED}; font-weight:700'
                except: return ''

            styled = disp.style.apply(hl_core, axis=1)
            if 'P&L_%' in cols_c:
                styled = styled.map(col_pnl, subset=['P&L_%'])
            st.dataframe(styled, width='stretch', height=220)
        else:
            st.info("Données non disponibles.")

    with t2:
        sec("Répartition CORE")
        if not core_df.empty and 'Current_Value' in core_df.columns:
            fig_d = go.Figure(go.Pie(
                labels=core_df['Ticker'],
                values=core_df['Current_Value'].astype(float),
                hole=0.6,
                marker=dict(colors=[C_ORANGE, C_GREEN, C_YELLOW, C_BLUE, C_PURPLE],
                            line=dict(color=C_BG, width=2)),
                textfont=dict(size=12)
            ))
            fig_d.update_layout(**{**PLOTLY_BASE, 'margin': dict(l=10,r=10,t=10,b=10)},
                                height=250, showlegend=True,
                                legend=dict(font=dict(size=10, family='Courier New')))
            st.plotly_chart(fig_d, width='stretch')

    # Graphique prix historique
    st.divider()
    sec("Évolution prix historique")
    sel_c = st.selectbox("Action CORE", CORE_STOCKS, key="core_sel")
    h2    = load_historical(sel_c)
    if not h2.empty:
        hh = h2.tail(500).copy()
        hh['MA95'] = hh['Price'].rolling(95).mean()
        fig_c = go.Figure()
        fig_c.add_trace(go.Scatter(x=hh['Date'], y=hh['Price'], name="Prix",
                                    fill='tozeroy', fillcolor='rgba(255,140,0,0.06)',
                                    line=dict(color=C_ORANGE, width=1.8)))
        fig_c.add_trace(go.Scatter(x=hh['Date'], y=hh['MA95'], name="MA95",
                                    line=dict(color=C_YELLOW, width=1, dash='dot')))
        fig_c.update_layout(**PLOTLY_BASE, height=290, yaxis_title="FCFA",
                             xaxis=dict(showgrid=False), yaxis=dict(gridcolor=C_BORDER))
        st.plotly_chart(fig_c, width='stretch')

    # Projection dividendes
    st.divider()
    sec("Projection dividendes annuels")
    div_rate = 0.085
    d1, d2, d3 = st.columns(3)
    with d1:
        proj_div = core_val * div_rate
        kpi(fcfa(proj_div), "Dividendes projetés", f"{div_rate*100:.1f}% × {fcfa(core_val)}", C_GREEN)
    with d2:
        mensuel = proj_div / 12
        kpi(fcfa(mensuel), "Équivalent mensuel", "Si versés chaque mois", C_BLUE)
    with d3:
        total_return = (gain_abs + proj_div) / CAPITAL_INIT * 100
        kpi(pct(total_return), "Rendement total estimé", "Plusvalue + Dividendes", C_GREEN)


# ══════════════════════════════════════════════════════════
#  PAGE 4 — OBLIGATIONS
# ══════════════════════════════════════════════════════════
elif "Obligations" in page or "F4" in page:
    st.markdown(f"""
    <div style="background:{C_ORANGE}; padding:6px 14px; margin-bottom:14px; display:flex; justify-content:space-between;">
      <span style="font-size:0.95rem; font-weight:700; color:#000; font-family:Courier New;">F4  OBLIGATIONS BRVM — SCANNER DÉCOTES & RENDEMENTS</span>
      <span style="font-size:0.7rem; color:#333; font-family:Courier New;">{bond_f}</span>
    </div>
    """, unsafe_allow_html=True)

    if bonds_df.empty:
        st.warning("Lance le scanner dans ⚙️ Contrôle pour obtenir les obligations.")
    else:
        n_b       = len(bonds_df)
        avg_y     = bonds_df['Effective_Yield_%'].mean()  if 'Effective_Yield_%' in bonds_df.columns else 0
        avg_d     = bonds_df['Discount_%'].mean()          if 'Discount_%'        in bonds_df.columns else 0
        best_y    = bonds_df['Effective_Yield_%'].max()    if 'Effective_Yield_%' in bonds_df.columns else 0
        best_tick = bonds_df.iloc[0].get('Ticker', '–')   if n_b > 0 else '–'

        b1, b2, b3, b4 = st.columns(4)
        with b1: kpi(str(n_b),          "Obligations détectées", "Décote > 0.5%",          C_ORANGE)
        with b2: kpi(f"{avg_y:.2f}%",  "Rendement moyen",       "Effectif pondéré",        C_GREEN)
        with b3: kpi(f"{avg_d:.1f}%",  "Décote moyenne",        "% du nominal",            C_YELLOW)
        with b4: kpi(f"{best_y:.2f}%", "Meilleur rendement",    best_tick,                 C_GREEN)

        st.divider()
        l_t, r_b = st.columns([2, 1])

        with l_t:
            sec("Toutes les obligations — triées par rendement")
            cols_b = [c for c in ['Ticker','Libelle','Current_Price','Discount_%','Coupon_Rate_%','Effective_Yield_%'] if c in bonds_df.columns]
            sort_b = bonds_df.sort_values('Effective_Yield_%', ascending=False) if 'Effective_Yield_%' in bonds_df.columns else bonds_df

            def col_y(val):
                try:
                    v = float(val)
                    if v >= 7.5: return f'color:{C_GREEN}; font-weight:800'
                    if v >= 6.5: return f'color:#34d399'
                    if v >= 6.0: return f'color:{C_YELLOW}'
                    return f'color:{C_MUTED}'
                except: return ''

            sb = sort_b[cols_b].style
            if 'Effective_Yield_%' in cols_b: sb = sb.map(col_y, subset=['Effective_Yield_%'])
            if 'Discount_%'        in cols_b: sb = sb.map(col_y, subset=['Discount_%'])
            st.dataframe(sb, width='stretch', height=430)

        with r_b:
            sec("Top 12 — Rendement effectif")
            top12 = sort_b.head(12) if 'Effective_Yield_%' in bonds_df.columns else bonds_df.head(12)
            fig_b = go.Figure(go.Bar(
                y=top12['Ticker'], x=top12['Effective_Yield_%'],
                orientation='h',
                marker=dict(color=top12['Effective_Yield_%'],
                            colorscale=[[0,'#333300'],[0.5,C_YELLOW],[1,C_ORANGE]],
                            showscale=False),
                text=top12['Effective_Yield_%'].apply(lambda v: f"{v:.2f}%"),
                textfont=dict(family='Courier New', size=10),
                textposition='outside'
            ))
            fig_b.update_layout(**PLOTLY_BASE, height=430,
                                xaxis_title="Rendement %",
                                yaxis=dict(autorange='reversed'),
                                xaxis=dict(gridcolor=C_BORDER))
            st.plotly_chart(fig_b, width='stretch')

        # Top 3 podium
        st.divider()
        sec("🏆 Podium — Meilleures opportunités")
        top3   = sort_b.head(3) if 'Effective_Yield_%' in bonds_df.columns else bonds_df.head(3)
        medals = ["#1", "#2", "#3"]
        cols3  = [C_ORANGE, C_YELLOW, C_MUTED]
        rcols  = st.columns(3)
        for i, (_, rb) in enumerate(top3.iterrows()):
            with rcols[i]:
                lib  = str(rb.get('Libelle','')).strip('"')[:48]
                disc = float(rb.get('Discount_%', 0))
                rend = float(rb.get('Effective_Yield_%', 0))
                prix = float(rb.get('Current_Price', 0))
                cout = float(rb.get('Purchase_Cost_FCFA', 0))
                st.markdown(f"""
                <div style="background:#0a0a0a; border:1px solid #1a1a1a; border-left:3px solid {cols3[i]}; padding:12px 14px; font-family:Courier New,monospace;">
                  <p style="font-size:0.65rem; color:{C_MUTED}; margin:0 0 2px 0; letter-spacing:.08em;">RANG {medals[i]}</p>
                  <p style="font-size:1.1rem; font-weight:700; color:{cols3[i]}; margin:0; letter-spacing:.05em;">{rb.get('Ticker','')}</p>
                  <p style="font-size:0.65rem; color:{C_MUTED}; margin:2px 0 10px 0;">{lib}</p>
                  <div style="display:flex; justify-content:space-between; padding:3px 0; border-bottom:1px solid #111;">
                    <span style="font-size:0.68rem; color:{C_MUTED};">YIELD</span>
                    <span style="font-size:0.78rem; font-weight:700; color:{C_GREEN};">{rend:.2f}%</span>
                  </div>
                  <div style="display:flex; justify-content:space-between; padding:3px 0; border-bottom:1px solid #111;">
                    <span style="font-size:0.68rem; color:{C_MUTED};">DECOTE</span>
                    <span style="font-size:0.78rem; font-weight:700; color:{C_YELLOW};">-{disc:.1f}%</span>
                  </div>
                  <div style="display:flex; justify-content:space-between; padding:3px 0;">
                    <span style="font-size:0.68rem; color:{C_MUTED};">PRICE</span>
                    <span style="font-size:0.78rem; color:{C_TEXT};">{prix:.2f} FCFA</span>
                  </div>
                  {"<div style='display:flex; justify-content:space-between; padding:3px 0;'><span style='font-size:0.68rem; color:"+C_MUTED+";'>ALLOC</span><span style='font-size:0.78rem; color:"+C_TEXT+";'>"+fcfa(cout)+"</span></div>" if cout else ""}
                </div>""", unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════
#  PAGE 5 — CONTRÔLE
# ══════════════════════════════════════════════════════════
elif "Contrôle" in page or "F5" in page:
    st.markdown(f"""
    <div style="background:{C_ORANGE}; padding:6px 14px; margin-bottom:14px; display:flex; justify-content:space-between;">
      <span style="font-size:0.95rem; font-weight:700; color:#000; font-family:Courier New;">F5  CENTRE DE CONTROLE — EXECUTION & LOGS SYSTEME</span>
      <span style="font-size:0.7rem; color:#333; font-family:Courier New;">SCRIPTS · AUTOMATION · MONITORING</span>
    </div>
    """, unsafe_allow_html=True)

    sec("Lancer les scripts")
    a1, a2, a3, a4 = st.columns(4)

    def run_script(script, timeout=600):
        return subprocess.run(
            [sys.executable, os.path.join(BASE, script)],
            capture_output=True, text=True, cwd=BASE,
            encoding="utf-8", errors="replace", timeout=timeout
        )

    with a1:
        if st.button("RUN: AUTOMATION COMPLETE", type="primary"):
            with st.spinner("Exécution des 5 modules (~20s)..."):
                res = run_script("run_daily_automation.py")
            st.cache_data.clear()
            st.success("✅ Terminé !") if res.returncode == 0 else st.error("❌ Erreur")
            st.code(res.stdout[-3000:] or res.stderr[-1500:])
            st.rerun()

    with a2:
        if st.button("RUN: SIGNAUX Z-SCORE"):
            with st.spinner("Scraping BRVM & Z-Score..."):
                res = run_script("daily_signals.py", 120)
            st.cache_data.clear()
            st.success("✅ Signaux mis à jour !") if res.returncode == 0 else st.error("❌ Erreur")
            st.code(res.stdout[-2000:])
            st.rerun()

    with a3:
        if st.button("RUN: PORTFOLIO UPDATE"):
            with st.spinner("Mise à jour portfolio..."):
                res = run_script("daily_market_update.py", 120)
            st.cache_data.clear()
            st.success("✅ Portfolio mis à jour !") if res.returncode == 0 else st.error("❌ Erreur")
            st.code(res.stdout[-2000:])
            st.rerun()

    with a4:
        if st.button("RUN: BOND SCANNER"):
            with st.spinner("Scan en cours..."):
                res = run_script("bond_scanner.py", 300)
            st.cache_data.clear()
            st.success("✅ Obligations mises à jour !") if res.returncode == 0 else st.error("❌ Erreur")
            st.code(res.stdout[-2000:])
            st.rerun()

    # ── Log viewer ──
    st.divider()
    log_txt, log_name = load_last_log()
    sec(f"Dernier log — {log_name}")

    entries = []
    for line in log_txt.split('\n'):
        line = line.strip()
        if not line: continue
        if   'SUCCESS:' in line: stat, msg = '✅', line.split('SUCCESS:')[-1].strip()[:90]
        elif 'INFO:'     in line: stat, msg = 'ℹ️',  line.split('INFO:')[-1].strip()[:90]
        elif 'ERROR:'    in line: stat, msg = '❌',  line.split('ERROR:')[-1].strip()[:90]
        else:                      stat, msg = '·',   line[:90]
        entries.append({'Status': stat, 'Message': msg})
    if entries:
        st.dataframe(pd.DataFrame(entries), width='stretch', height=360)
    else:
        st.code(log_txt)

    st.divider()
    sec("Tous les logs disponibles")
    log_files = sorted(glob.glob(os.path.join(BASE, "logs", "automation_*.log")), reverse=True)
    for lf in log_files[:12]:
        size = os.path.getsize(lf) // 1024
        st.markdown(f"<p style='font-size:0.78rem; color:{C_MUTED}; margin:2px 0;'>📄 {os.path.basename(lf)} · {size} KB</p>", unsafe_allow_html=True)

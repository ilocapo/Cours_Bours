import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import subprocess
import os
import sys
import glob
from datetime import datetime, date
import time

# ─────────────────────────────────────────────
#  CONFIG PAGE
# ─────────────────────────────────────────────
st.set_page_config(
    page_title="Terminal Altos",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# ─────────────────────────────────────────────
#  THEME CSS CUSTOM
# ─────────────────────────────────────────────
st.markdown("""
<style>
    .main { background-color: #0e1117; }

    .metric-card {
        background: linear-gradient(135deg, #1a1d27 0%, #16213e 100%);
        border: 1px solid #2d3561;
        border-radius: 12px;
        padding: 20px;
        text-align: center;
        margin-bottom: 10px;
    }
    .metric-card h1 { font-size: 2rem; margin: 0; }
    .metric-card p  { font-size: 0.85rem; color: #aaa; margin: 4px 0 0 0; }

    .card-green  { border-color: #00d084 !important; }
    .card-red    { border-color: #ff4b4b !important; }
    .card-yellow { border-color: #ffd700 !important; }
    .card-blue   { border-color: #4da6ff !important; }

    .section-title {
        font-size: 1.1rem;
        font-weight: 700;
        color: #4da6ff;
        border-left: 4px solid #4da6ff;
        padding-left: 10px;
        margin: 20px 0 12px 0;
    }

    .status-ok   { color: #00d084; font-weight: bold; }
    .status-warn { color: #ffd700; font-weight: bold; }
    .status-bad  { color: #ff4b4b; font-weight: bold; }

    .stButton>button {
        width: 100%;
        border-radius: 8px;
        font-weight: 600;
        height: 48px;
    }

    /* masque les menus hamburger inutiles */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
</style>
""", unsafe_allow_html=True)

# ─────────────────────────────────────────────
#  HELPERS — CHARGEMENT DONNÉES
# ─────────────────────────────────────────────
BASE = os.path.dirname(os.path.abspath(__file__))

def load_ytd():
    path = os.path.join(BASE, "YTD_2026.csv")
    if not os.path.exists(path):
        return pd.DataFrame()
    df = pd.read_csv(path)
    df.columns = [c.strip() for c in df.columns]
    df['Date'] = pd.to_datetime(df['Date'], dayfirst=True, errors='coerce')
    df = df.dropna(subset=['Date']).sort_values('Date')
    # garder la dernière entrée de chaque jour
    df = df.groupby('Date').last().reset_index()
    return df

def load_signals_today():
    today_str = date.today().strftime("%Y%m%d")
    path = os.path.join(BASE, "output", "signals", f"signals_{today_str}.csv")
    # fallback: fichier le plus récent
    if not os.path.exists(path):
        files = sorted(glob.glob(os.path.join(BASE, "output", "signals", "signals_*.csv")))
        if not files:
            return pd.DataFrame(), "aucun fichier"
        path = files[-1]
    df = pd.read_csv(path)
    df.columns = [c.strip() for c in df.columns]
    fname = os.path.basename(path)
    return df, fname

def load_core_alloc():
    path = os.path.join(BASE, "core_allocation.csv")
    if not os.path.exists(path):
        return pd.DataFrame()
    return pd.read_csv(path)

def load_bonds():
    files = sorted(glob.glob(os.path.join(BASE, "bond_opportunities_*.csv")))
    if not files:
        return pd.DataFrame(), ""
    df = pd.read_csv(files[-1])
    df.columns = [c.strip() for c in df.columns]
    return df, os.path.basename(files[-1])

def load_historical(ticker):
    path = os.path.join(BASE, "data", "cours_boursiers_fusion.csv")
    if not os.path.exists(path):
        path = os.path.join(BASE, "cours_boursiers_fusion.csv")
    if not os.path.exists(path):
        return pd.DataFrame()
    df = pd.read_csv(path, low_memory=False)
    df.columns = [c.strip() for c in df.columns]
    # detecter colonne date
    date_col = next((c for c in df.columns if 'date' in c.lower()), df.columns[0])
    df[date_col] = pd.to_datetime(df[date_col], dayfirst=True, errors='coerce')
    df = df.dropna(subset=[date_col]).sort_values(date_col)
    # filtrer par ticker
    ticker_col = next((c for c in df.columns if 'ticker' in c.lower()), None)
    price_col  = next((c for c in df.columns if 'close' in c.lower() or 'prix' in c.lower() or 'price' in c.lower()), None)
    if ticker_col is None or price_col is None:
        return pd.DataFrame()
    sub = df[df[ticker_col] == ticker][[date_col, price_col]].copy()
    sub.columns = ['Date', 'Price']
    sub = sub[sub['Price'] > 0].dropna()
    return sub

def load_open_positions():
    path = os.path.join(BASE, "open_positions.csv")
    if not os.path.exists(path):
        return pd.DataFrame()
    df = pd.read_csv(path)
    df.columns = [c.strip() for c in df.columns]
    return df

def load_last_log():
    files = sorted(glob.glob(os.path.join(BASE, "logs", "automation_*.log")))
    if not files:
        return "Aucun log trouvé."
    with open(files[-1], "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
    return "".join(lines[-40:]), os.path.basename(files[-1])

# ─────────────────────────────────────────────
#  HEADER
# ─────────────────────────────────────────────
col_title, col_time = st.columns([4, 1])
with col_title:
    st.markdown("# 📊 Terminal Altos — BRVM Trading")
with col_time:
    st.markdown(f"<br><p style='color:#aaa;text-align:right'>{datetime.now().strftime('%d/%m/%Y %H:%M')}</p>", unsafe_allow_html=True)

st.divider()

# ─────────────────────────────────────────────
#  CHARGEMENT DONNÉES
# ─────────────────────────────────────────────
ytd_df        = load_ytd()
signals_df, sig_file = load_signals_today()
core_df       = load_core_alloc()
bonds_df, bond_file  = load_bonds()
positions_df  = load_open_positions()

# Dernières valeurs portfolio
if not ytd_df.empty:
    last = ytd_df.iloc[-1]
    total_val  = float(last.get('Total_Value', 0))
    core_val   = float(last.get('Core_Value', 0))
    sat_val    = float(last.get('Satellite_Value', 0))
    ytd_ret    = float(last.get('YTD_Return_%', 0))
    start_val  = 1_000_000
    gain_abs   = total_val - start_val
else:
    total_val = core_val = sat_val = ytd_ret = gain_abs = 0

n_buy  = len(signals_df[signals_df['Signal'].str.contains('Buy',  na=False)]) if not signals_df.empty else 0
n_sell = len(signals_df[signals_df['Signal'].str.contains('Sell', na=False)]) if not signals_df.empty else 0

# ─────────────────────────────────────────────
#  ONGLETS PRINCIPAUX
# ─────────────────────────────────────────────
tab1, tab2, tab3 = st.tabs([
    "⚙️  Contrôle & Mise à jour",
    "🎯  Radar & Signaux",
    "💼  Portfolio & Risque"
])

# ══════════════════════════════════════════════
#  TAB 1 — CONTRÔLE
# ══════════════════════════════════════════════
with tab1:
    st.markdown('<p class="section-title">KPI du jour</p>', unsafe_allow_html=True)

    c1, c2, c3, c4 = st.columns(4)
    sign = "+" if gain_abs >= 0 else ""
    color_ytd = "card-green" if ytd_ret >= 0 else "card-red"
    color_gain = "card-green" if gain_abs >= 0 else "card-red"

    with c1:
        st.markdown(f"""<div class="metric-card {color_ytd}">
            <h1 style="color:{'#00d084' if ytd_ret>=0 else '#ff4b4b'}">{ytd_ret:+.2f}%</h1>
            <p>YTD 2026</p></div>""", unsafe_allow_html=True)
    with c2:
        st.markdown(f"""<div class="metric-card card-blue">
            <h1 style="color:#4da6ff">{total_val:,.0f}</h1>
            <p>Valeur totale (FCFA)</p></div>""", unsafe_allow_html=True)
    with c3:
        st.markdown(f"""<div class="metric-card {color_gain}">
            <h1 style="color:{'#00d084' if gain_abs>=0 else '#ff4b4b'}">{sign}{gain_abs:,.0f}</h1>
            <p>Gain net (FCFA)</p></div>""", unsafe_allow_html=True)
    with c4:
        color_sig = "card-green" if n_buy > 0 else "card-yellow"
        label_sig = f"{n_buy} BUY / {n_sell} SELL"
        st.markdown(f"""<div class="metric-card {color_sig}">
            <h1 style="color:{'#00d084' if n_buy>0 else '#ffd700'}">{n_buy}</h1>
            <p>Signaux BUY | {n_sell} SELL</p></div>""", unsafe_allow_html=True)

    st.markdown('<p class="section-title">Lancer les scripts</p>', unsafe_allow_html=True)

    btn1, btn2, btn3 = st.columns(3)

    with btn1:
        if st.button("🚀 Automation complète", type="primary"):
            with st.spinner("Exécution des 5 modules... (~20 secondes)"):
                result = subprocess.run(
                    [sys.executable, os.path.join(BASE, "run_daily_automation.py")],
                    capture_output=True, text=True, cwd=BASE,
                    encoding="utf-8", errors="replace", timeout=600
                )
            if result.returncode == 0:
                st.success("✅ Automation terminée avec succès !")
            else:
                st.error("❌ Erreur dans un module — voir log ci-dessous")
            st.code(result.stdout[-3000:] if result.stdout else result.stderr[-2000:])
            st.rerun()

    with btn2:
        if st.button("📡 Signaux Z-Score uniquement"):
            with st.spinner("Scraping BRVM & calcul Z-Score..."):
                result = subprocess.run(
                    [sys.executable, os.path.join(BASE, "daily_signals.py")],
                    capture_output=True, text=True, cwd=BASE,
                    encoding="utf-8", errors="replace", timeout=120
                )
            if result.returncode == 0:
                st.success("✅ Signaux mis à jour !")
            else:
                st.error("❌ Erreur")
            st.code(result.stdout[-2000:])
            st.rerun()

    with btn3:
        if st.button("🏦 Scanner obligations"):
            with st.spinner("Scan des obligations en cours..."):
                result = subprocess.run(
                    [sys.executable, os.path.join(BASE, "bond_scanner.py")],
                    capture_output=True, text=True, cwd=BASE,
                    encoding="utf-8", errors="replace", timeout=300
                )
            if result.returncode == 0:
                st.success("✅ Obligations mises à jour !")
            else:
                st.error("❌ Erreur")
            st.code(result.stdout[-2000:])
            st.rerun()

    # ─── Dernier log ──────────────────────────
    st.markdown('<p class="section-title">Dernier log d\'automation</p>', unsafe_allow_html=True)
    try:
        log_text, log_name = load_last_log()
        st.caption(f"Fichier : {log_name}")
        st.code(log_text, language=None)
    except Exception as e:
        st.info("Aucun log disponible.")


# ══════════════════════════════════════════════
#  TAB 2 — SIGNAUX & RADAR
# ══════════════════════════════════════════════
with tab2:
    st.markdown(f'<p class="section-title">Signaux du jour — {sig_file}</p>', unsafe_allow_html=True)

    if signals_df.empty:
        st.warning("Aucun signal disponible. Lance d'abord l'automation dans l'onglet ⚙️")
    else:
        # ─── Filtres ──────────────────────────
        fcol1, fcol2 = st.columns([2, 2])
        with fcol1:
            filter_signal = st.multiselect(
                "Filtrer par signal",
                options=signals_df['Signal'].unique().tolist() if 'Signal' in signals_df.columns else [],
                default=[]
            )
        with fcol2:
            show_only_buy = st.checkbox("📈 Afficher uniquement les BUY", value=False)

        filtered = signals_df.copy()
        if show_only_buy:
            filtered = filtered[filtered['Signal'].str.contains('Buy', na=False)]
        if filter_signal:
            filtered = filtered[filtered['Signal'].isin(filter_signal)]

        # ─── Colorisation ─────────────────────
        def color_signal(val):
            if 'Strong Buy' in str(val):  return 'color: #00d084; font-weight: bold'
            if 'Buy' in str(val):         return 'color: #7fff7f'
            if 'Strong Sell' in str(val): return 'color: #ff4b4b; font-weight: bold'
            if 'Sell' in str(val):        return 'color: #ff9999'
            return ''

        def color_zscore(val):
            try:
                v = float(val)
                if v <= -2:  return 'color: #00d084; font-weight: bold'
                if v <= -1:  return 'color: #7fff7f'
                if v >= 2:   return 'color: #ff4b4b'
                return ''
            except: return ''

        cols_display = [c for c in ['Ticker','Signal','Z_Score','Price','Action','Qty','TP_Price','SL_Price','TP_Pct','SL_Pct'] if c in filtered.columns]
        styled = filtered[cols_display].style\
            .map(color_signal, subset=['Signal'] if 'Signal' in cols_display else [])\
            .map(color_zscore, subset=['Z_Score'] if 'Z_Score' in cols_display else [])

        st.dataframe(styled, use_container_width=True, height=400)

        st.caption(f"Total : **{len(filtered)}** signaux affichés | BUY: **{n_buy}** | SELL: **{n_sell}**")

    # ─── Graphique Z-Score interactif ─────────
    st.markdown('<p class="section-title">Graphique Z-Score — Choisir une action</p>', unsafe_allow_html=True)

    available_tickers = signals_df['Ticker'].dropna().unique().tolist() if (not signals_df.empty and 'Ticker' in signals_df.columns) else []

    from config import CORE_STOCKS
    all_tickers = list(set(CORE_STOCKS + available_tickers))
    all_tickers.sort()

    if all_tickers:
        selected_ticker = st.selectbox("Action", all_tickers, index=0)
        hist = load_historical(selected_ticker)

        if hist.empty:
            st.info(f"Données historiques non disponibles pour {selected_ticker}")
        else:
            # Calcul Z-Score 95 jours
            window = 95
            hist = hist.tail(500)  # derniers 500 jours
            hist['MA']     = hist['Price'].rolling(window).mean()
            hist['STD']    = hist['Price'].rolling(window).std()
            hist['ZScore'] = (hist['Price'] - hist['MA']) / hist['STD']

            fig = make_subplots(
                rows=2, cols=1,
                shared_xaxes=True,
                row_heights=[0.65, 0.35],
                vertical_spacing=0.05,
                subplot_titles=(f"{selected_ticker} — Prix & Moyenne Mobile", "Z-Score")
            )

            # Prix
            fig.add_trace(go.Scatter(
                x=hist['Date'], y=hist['Price'],
                name="Prix", line=dict(color='#4da6ff', width=1.5)
            ), row=1, col=1)

            # Moyenne mobile
            fig.add_trace(go.Scatter(
                x=hist['Date'], y=hist['MA'],
                name=f"MM {window}j", line=dict(color='#ffd700', width=1, dash='dash')
            ), row=1, col=1)

            # Bandes ±2σ
            fig.add_trace(go.Scatter(
                x=hist['Date'], y=hist['MA'] + 2 * hist['STD'],
                name="+2σ", line=dict(color='rgba(255,75,75,0.3)', width=0.5), showlegend=False
            ), row=1, col=1)
            fig.add_trace(go.Scatter(
                x=hist['Date'], y=hist['MA'] - 2 * hist['STD'],
                name="-2σ", line=dict(color='rgba(0,208,132,0.3)', width=0.5),
                fill='tonexty', fillcolor='rgba(100,100,100,0.05)', showlegend=False
            ), row=1, col=1)

            # Z-Score
            z_colors = hist['ZScore'].apply(lambda z:
                '#00d084' if z <= -2 else ('#7fff7f' if z <= -1 else ('#ff4b4b' if z >= 2 else '#aaaaaa'))
            )
            fig.add_trace(go.Bar(
                x=hist['Date'], y=hist['ZScore'],
                name="Z-Score", marker_color=z_colors
            ), row=2, col=1)

            # Lignes référence Z-Score
            for y_val, color, dash in [(-2,'#00d084','dash'), (2,'#ff4b4b','dash'), (0,'#aaaaaa','dot')]:
                fig.add_hline(y=y_val, line_dash=dash, line_color=color, row=2, col=1, line_width=1)

            fig.update_layout(
                height=550,
                template="plotly_dark",
                plot_bgcolor='#0e1117',
                paper_bgcolor='#0e1117',
                legend=dict(orientation="h", yanchor="bottom", y=1.02),
                margin=dict(l=40, r=20, t=40, b=20)
            )
            st.plotly_chart(fig, use_container_width=True)

            # Signal actuel
            if not signals_df.empty and 'Ticker' in signals_df.columns:
                row_sig = signals_df[signals_df['Ticker'] == selected_ticker]
                if not row_sig.empty:
                    sig = row_sig.iloc[0]
                    z = float(sig.get('Z_Score', 0))
                    signal_name = sig.get('Signal', 'N/A')
                    if 'Strong Buy' in signal_name:
                        st.success(f"Signal actuel : **{signal_name}** (Z={z:.2f}) → ACHETER")
                    elif 'Buy' in signal_name:
                        st.success(f"Signal actuel : **{signal_name}** (Z={z:.2f}) → Opportunité d'achat")
                    elif 'Strong Sell' in signal_name:
                        st.error(f"Signal actuel : **{signal_name}** (Z={z:.2f}) → VENDRE / Éviter")
                    else:
                        st.warning(f"Signal actuel : **{signal_name}** (Z={z:.2f})")
    else:
        st.info("Lance d'abord l'automation pour générer les signaux du jour.")


# ══════════════════════════════════════════════
#  TAB 3 — PORTFOLIO & RISQUE
# ══════════════════════════════════════════════
with tab3:

    # ─── KPI haut de page ────────────────────
    st.markdown('<p class="section-title">Vue d\'ensemble du portefeuille</p>', unsafe_allow_html=True)

    pk1, pk2, pk3, pk4 = st.columns(4)
    with pk1:
        pct_core = (core_val / total_val * 100) if total_val else 0
        st.markdown(f"""<div class="metric-card card-blue">
            <h1 style="color:#4da6ff">{core_val:,.0f}</h1>
            <p>🛡️ CORE ({pct_core:.0f}%)</p></div>""", unsafe_allow_html=True)
    with pk2:
        pct_sat = (sat_val / total_val * 100) if total_val else 0
        st.markdown(f"""<div class="metric-card card-yellow">
            <h1 style="color:#ffd700">{sat_val:,.0f}</h1>
            <p>⚔️ SATELLITE ({pct_sat:.0f}%)</p></div>""", unsafe_allow_html=True)
    with pk3:
        st.markdown(f"""<div class="metric-card {'card-green' if ytd_ret>=0 else 'card-red'}">
            <h1 style="color:{'#00d084' if ytd_ret>=0 else '#ff4b4b'}">{ytd_ret:+.2f}%</h1>
            <p>YTD Return</p></div>""", unsafe_allow_html=True)
    with pk4:
        n_pos = len(positions_df[positions_df.get('Status', pd.Series())==True]) if not positions_df.empty else 0
        st.markdown(f"""<div class="metric-card card-blue">
            <h1 style="color:#4da6ff">{len(positions_df)}</h1>
            <p>Positions ouvertes</p></div>""", unsafe_allow_html=True)

    # ─── Graphique évolution YTD ──────────────
    st.markdown('<p class="section-title">Évolution du portefeuille YTD 2026</p>', unsafe_allow_html=True)

    if not ytd_df.empty and 'Total_Value' in ytd_df.columns:
        fig_ytd = go.Figure()

        fig_ytd.add_trace(go.Scatter(
            x=ytd_df['Date'], y=ytd_df['Total_Value'],
            name="Valeur totale", fill='tozeroy',
            line=dict(color='#4da6ff', width=2),
            fillcolor='rgba(77,166,255,0.1)'
        ))
        if 'Core_Value' in ytd_df.columns:
            fig_ytd.add_trace(go.Scatter(
                x=ytd_df['Date'], y=ytd_df['Core_Value'],
                name="CORE", line=dict(color='#00d084', width=1.5, dash='dot')
            ))

        # Ligne capital de départ
        fig_ytd.add_hline(
            y=1_000_000, line_dash="dash", line_color="#ffd700",
            annotation_text="Capital initial 1 000 000 FCFA", annotation_font_color="#ffd700"
        )

        fig_ytd.update_layout(
            height=380,
            template="plotly_dark",
            plot_bgcolor='#0e1117',
            paper_bgcolor='#0e1117',
            yaxis_title="Valeur (FCFA)",
            xaxis_title="",
            legend=dict(orientation="h", yanchor="bottom", y=1.02),
            margin=dict(l=40, r=20, t=20, b=20)
        )
        st.plotly_chart(fig_ytd, use_container_width=True)

    # ─── Répartition CORE ────────────────────
    col_core, col_bonds = st.columns(2)

    with col_core:
        st.markdown('<p class="section-title">Détail CORE stocks</p>', unsafe_allow_html=True)
        if not core_df.empty and 'Ticker' in core_df.columns:
            from config import CORE_STOCKS
            core_display = core_df[['Ticker','Current_Price','Current_Value','P&L_%','Status']].copy() if 'Current_Value' in core_df.columns else core_df.head()

            def color_pnl(val):
                try:
                    v = float(str(val).replace('%',''))
                    return 'color: #00d084' if v >= 0 else 'color: #ff4b4b'
                except: return ''

            st.dataframe(
                core_display.style.map(color_pnl, subset=['P&L_%'] if 'P&L_%' in core_display.columns else []),
                use_container_width=True
            )

            # Donut chart
            if 'Current_Value' in core_df.columns:
                fig_donut = go.Figure(go.Pie(
                    labels=core_df['Ticker'],
                    values=core_df['Current_Value'],
                    hole=0.55,
                    marker_colors=['#4da6ff','#00d084','#ffd700','#ff9f43','#ee5a24']
                ))
                fig_donut.update_layout(
                    height=280,
                    template="plotly_dark",
                    paper_bgcolor='#0e1117',
                    margin=dict(l=0, r=0, t=20, b=0),
                    showlegend=True,
                    legend=dict(font=dict(size=11))
                )
                st.plotly_chart(fig_donut, use_container_width=True)
        else:
            st.info("Données CORE non disponibles.")

    with col_bonds:
        st.markdown('<p class="section-title">Top obligations décotées</p>', unsafe_allow_html=True)
        if not bonds_df.empty:
            st.caption(f"Source : {bond_file}")
            cols_b = [c for c in ['Ticker','Libelle','Current_Price','Discount_%','Effective_Yield_%'] if c in bonds_df.columns]

            def color_yield(val):
                try:
                    v = float(val)
                    if v >= 7.5: return 'color: #00d084; font-weight: bold'
                    if v >= 6.5: return 'color: #7fff7f'
                    return ''
                except: return ''

            top10 = bonds_df.head(10)
            styled_bonds = top10[cols_b].style
            if 'Effective_Yield_%' in cols_b:
                styled_bonds = styled_bonds.map(color_yield, subset=['Effective_Yield_%'])

            st.dataframe(styled_bonds, use_container_width=True, height=320)

            # Bar chart rendements
            if 'Effective_Yield_%' in bonds_df.columns and 'Ticker' in bonds_df.columns:
                fig_bonds = px.bar(
                    bonds_df.head(10),
                    x='Ticker', y='Effective_Yield_%',
                    color='Effective_Yield_%',
                    color_continuous_scale=['#4da6ff', '#00d084'],
                    labels={'Effective_Yield_%': 'Rendement %'},
                    title="Top 10 — Rendement effectif (%)"
                )
                fig_bonds.update_layout(
                    height=260,
                    template="plotly_dark",
                    paper_bgcolor='#0e1117',
                    plot_bgcolor='#0e1117',
                    showlegend=False,
                    margin=dict(l=20, r=20, t=40, b=20),
                    coloraxis_showscale=False
                )
                st.plotly_chart(fig_bonds, use_container_width=True)
        else:
            st.info("Lance le Bond Scanner dans l'onglet ⚙️")

    # ─── Auto-refresh ─────────────────────────
    st.divider()
    st.markdown('<p class="section-title">Auto-refresh</p>', unsafe_allow_html=True)
    r1, r2 = st.columns([1, 3])
    with r1:
        auto_refresh = st.checkbox("🔄 Rafraîchir automatiquement", value=False)
    with r2:
        refresh_interval = st.slider("Intervalle (secondes)", 10, 300, 60, step=10, disabled=not auto_refresh)

    if auto_refresh:
        st.caption(f"Prochain refresh dans {refresh_interval}s...")
        time.sleep(refresh_interval)
        st.rerun()

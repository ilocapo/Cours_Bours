#!/usr/bin/env python3
"""
BRVM Portfolio - Generateur de donnees pour le dashboard GitHub Pages.
Lit cours_boursiers_fusion.csv, calcule les Z-scores et lance les backtests,
puis produit docs/data/dashboard.json consomme par le front-end statique.

Usage :
    python generate_dashboard_data.py
"""

import json
import os
import sys
import math
import traceback
from datetime import datetime, timedelta
from pathlib import Path

# -- Chemins --
ROOT       = Path(__file__).resolve().parents[2]
DOCS_DATA  = ROOT / "docs" / "data"

# Trouver le CSV (soit a la racine, soit dans data/)
CSV_FILE   = ROOT / "data" / "runtime" / "cours_boursiers_fusion.csv"
if not CSV_FILE.exists():
    CSV_FILE = ROOT / "data" / "cours_boursiers_fusion.csv"

SUIVI_FILE = ROOT / "data" / "runtime" / "SUIVI_TRADING.csv"

# -- Imports projet --
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "src"))

try:
    from src.config import (
        REAL_PORTFOLIO_CAPITAL, CORE_ALLOCATION_PCT, SATELLITE_ALLOCATION_PCT,
        CASH_ALLOCATION_PCT,
        CORE_STOCKS, STOP_LOSS_PCT, TAKE_PROFIT_PCT, TIME_STOP_DAYS,
        FALLING_KNIFE_WINDOW, FALLING_KNIFE_DROP_PCT, ZSCORE_WINDOW,
        SATELLITE_STOCK_UNIVERSE, MAX_POSITION_PCT,
        ZSCORE_STRONG_BUY, ZSCORE_BUY, ZSCORE_SELL, ZSCORE_STRONG_SELL
    )
    CAPITAL_TOTAL = REAL_PORTFOLIO_CAPITAL
    CORE_TICKERS  = CORE_STOCKS
except ImportError:
    CAPITAL_TOTAL            = 1_000_000
    CORE_ALLOCATION_PCT      = 0.70
    SATELLITE_ALLOCATION_PCT = 0.20
    CASH_ALLOCATION_PCT      = 0.10
    CORE_TICKERS             = ["SNTS", "ORGT", "ONTBF", "SAFC", "ABJC"]
    STOP_LOSS_PCT            = 0.05
    TAKE_PROFIT_PCT          = 0.08
    TIME_STOP_DAYS           = 10
    FALLING_KNIFE_WINDOW     = 3
    FALLING_KNIFE_DROP_PCT   = 0.08
    ZSCORE_WINDOW            = 200
    SATELLITE_STOCK_UNIVERSE = ["ABJC", "ORGT", "SAFC", "SNTS", "ETIT", "BOABF", "SONATEL"]
    MAX_POSITION_PCT         = 0.08
    ZSCORE_STRONG_BUY        = -3.0
    ZSCORE_BUY               = -2.5
    ZSCORE_SELL           = 2.5
    ZSCORE_STRONG_SELL    = 3.0

# -- Helpers --
def safe_float(val, default=0.0):
    try:
        return float(
            str(val)
            .replace(",", ".")
            .replace("%", "")
            .replace(" ", "")
            .replace("\xa0", "")
        )
    except (ValueError, TypeError):
        return default

def safe_json(val):
    """Convert numpy/pandas types to JSON-serializable."""
    if val is None:
        return None
    try:
        if hasattr(val, 'item'):
            val = val.item()
        if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
            return None
        return val
    except Exception:
        return str(val)


# =============================================================================
# CORE: Load data + compute Z-scores directly
# =============================================================================

def load_data():
    """Load and clean the CSV dataset."""
    import pandas as pd

    print(f"  Chargement de {CSV_FILE} ...")
    df = pd.read_csv(str(CSV_FILE), sep=";", low_memory=False)

    df = df.dropna(subset=['Date', 'Code symbole', 'Cours moyen']).copy()
    df['Cours moyen'] = pd.to_numeric(
        df['Cours moyen'].astype(str).str.replace(',', '.'), errors='coerce'
    )
    df = df.dropna(subset=['Cours moyen'])
    df['Date'] = pd.to_datetime(df['Date'], format='%d/%m/%Y', errors='coerce')
    df = df.dropna(subset=['Date'])
    df = df.sort_values(by=['Code symbole', 'Date']).reset_index(drop=True)

    for col in ['Fermeture', 'Ouvert', 'Plus haut', 'Plus bas']:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col].astype(str).str.replace(',', '.'), errors='coerce')

    vol_col = None
    for c in ['Volume transige (total)', 'Volume transigé (total)', 'Volume transigé total', 'Volume transige total']:
        if c in df.columns:
            vol_col = c
            break

    if vol_col:
        df['Volume'] = pd.to_numeric(
            df[vol_col].astype(str).str.replace(',', '.').str.replace(' ', ''),
            errors='coerce'
        ).fillna(0)
    else:
        df['Volume'] = 0

    print(f"  -> {len(df):,} lignes, {df['Code symbole'].nunique()} titres, "
          f"{df['Date'].min().date()} a {df['Date'].max().date()}")
    return df


def compute_zscores(df):
    """Compute rolling Z-score per stock."""
    import pandas as pd

    window = ZSCORE_WINDOW
    df['Moyenne_Mobile'] = df.groupby('Code symbole')['Cours moyen'].transform(
        lambda x: x.rolling(window=window, min_periods=20).mean()
    )
    df['Ecart_Type'] = df.groupby('Code symbole')['Cours moyen'].transform(
        lambda x: x.rolling(window=window, min_periods=20).std()
    )
    df['Z_Score'] = (df['Cours moyen'] - df['Moyenne_Mobile']) / df['Ecart_Type']

    def get_signal(z):
        if pd.isna(z): return 'Hold'
        if z <= ZSCORE_STRONG_BUY: return 'Strong Buy'
        if z <= ZSCORE_BUY: return 'Buy'
        if z >= ZSCORE_STRONG_SELL: return 'Strong Sell'
        if z >= ZSCORE_SELL: return 'Sell'
        return 'Hold'

    df['Signal'] = df['Z_Score'].apply(get_signal)

    df['Rendement_Quotidien'] = df.groupby('Code symbole')['Cours moyen'].pct_change()
    df['Volatilite_Ann'] = df.groupby('Code symbole')['Rendement_Quotidien'].transform(
        lambda x: x.rolling(window=20, min_periods=5).std() * (252 ** 0.5) * 100
    )

    return df


def run_backtest_for_ticker(
    df_all,
    ticker,
    capital=1_000_000,
    tp_pct=None,
    sl_pct=None,
    time_stop_days=None,
    fk_drop_pct=None,
):
    """Run a Z-score backtest on a single ticker. Returns results dict."""
    import pandas as pd

    df_stock = df_all[df_all['Code symbole'] == ticker].copy()
    if len(df_stock) < ZSCORE_WINDOW:
        return None

    tp_pct = TAKE_PROFIT_PCT if tp_pct is None else tp_pct
    sl_pct = STOP_LOSS_PCT if sl_pct is None else sl_pct
    time_stop_days = TIME_STOP_DAYS if time_stop_days is None else time_stop_days
    fk_drop_pct = FALLING_KNIFE_DROP_PCT if fk_drop_pct is None else fk_drop_pct

    df_stock = df_stock.sort_values('Date').reset_index(drop=True)

    df_stock['Signal_Candidate'] = 0
    df_stock.loc[df_stock['Signal'].isin(['Buy', 'Strong Buy']), 'Signal_Candidate'] = 1
    df_stock.loc[df_stock['Signal'].isin(['Sell', 'Strong Sell']), 'Signal_Candidate'] = -1

    df_stock['Rendement_Action'] = df_stock['Cours moyen'].pct_change()

    in_position = False
    entry_price = None
    tp_price = None
    sl_price = None
    holding_days = 0

    positions = [0] * len(df_stock)
    signals_exec = [0] * len(df_stock)
    trades = []
    trade_entry_date = None
    trade_entry_price = None

    for i in range(len(df_stock)):
        price = df_stock.iloc[i]['Cours moyen']
        date = df_stock.iloc[i]['Date']

        if in_position:
            holding_days += 1
            positions[i] = 1

            if price >= tp_price:
                signals_exec[i] = -1
                pnl_pct = (price - trade_entry_price) / trade_entry_price * 100
                trades.append({
                    'date_entry': str(trade_entry_date.date()),
                    'date_exit': str(date.date()),
                    'symbol': ticker,
                    'entry': round(trade_entry_price, 2),
                    'exit': round(price, 2),
                    'pnl_pct': round(pnl_pct, 2),
                    'reason': 'TP',
                    'days': holding_days
                })
                in_position = False
                positions[i] = 0
                holding_days = 0
                continue

            if price <= sl_price:
                signals_exec[i] = -1
                pnl_pct = (price - trade_entry_price) / trade_entry_price * 100
                trades.append({
                    'date_entry': str(trade_entry_date.date()),
                    'date_exit': str(date.date()),
                    'symbol': ticker,
                    'entry': round(trade_entry_price, 2),
                    'exit': round(price, 2),
                    'pnl_pct': round(pnl_pct, 2),
                    'reason': 'SL',
                    'days': holding_days
                })
                in_position = False
                positions[i] = 0
                holding_days = 0
                continue

            if holding_days >= TIME_STOP_DAYS:
                signals_exec[i] = -1
                pnl_pct = (price - trade_entry_price) / trade_entry_price * 100
                trades.append({
                    'date_entry': str(trade_entry_date.date()),
                    'date_exit': str(date.date()),
                    'symbol': ticker,
                    'entry': round(trade_entry_price, 2),
                    'exit': round(price, 2),
                    'pnl_pct': round(pnl_pct, 2),
                    'reason': 'Time-Stop',
                    'days': holding_days
                })
                in_position = False
                positions[i] = 0
                holding_days = 0
                continue
        else:
            if df_stock.iloc[i]['Signal_Candidate'] == 1:
                avoid = False
                if i >= FALLING_KNIFE_WINDOW:
                    price_past = df_stock.iloc[i - FALLING_KNIFE_WINDOW]['Cours moyen']
                    if price_past > 0:
                        pct_chg = (price - price_past) / price_past
                        if pct_chg <= -fk_drop_pct:
                            avoid = True

                if not avoid:
                    signals_exec[i] = 1
                    in_position = True
                    trade_entry_price = price
                    trade_entry_date = date
                    tp_price = price * (1 + tp_pct)
                    sl_price = price * (1 - sl_pct)
                    holding_days = 0
                    positions[i] = 1

    df_stock['Position'] = positions
    df_stock['Signal_Exec'] = signals_exec

    df_stock['Position_Shift'] = df_stock['Position'].shift(1).fillna(0)
    df_stock['Rendement_Algo'] = df_stock['Position_Shift'] * df_stock['Rendement_Action']
    df_stock.loc[df_stock['Signal_Exec'].abs() == 1, 'Rendement_Algo'] -= 0.01

    df_stock['Capital_Algo'] = capital * (1 + df_stock['Rendement_Algo'].fillna(0)).cumprod()
    df_stock['Capital_BuyHold'] = capital * (1 + df_stock['Rendement_Action'].fillna(0)).cumprod()

    taux_sr = (1 + 0.02) ** (1/252) - 1
    df_stock['Capital_SafeRate'] = capital * (1 + taux_sr) ** pd.Series(range(len(df_stock)))

    cap_final = df_stock['Capital_Algo'].iloc[-1]
    cap_bh = df_stock['Capital_BuyHold'].iloc[-1]
    cap_sr = df_stock['Capital_SafeRate'].iloc[-1]

    ret_algo = (cap_final / capital - 1) * 100
    ret_bh = (cap_bh / capital - 1) * 100
    ret_sr = (cap_sr / capital - 1) * 100

    n_years = len(df_stock) / 252
    ann_ret = ((cap_final / capital) ** (1 / max(n_years, 0.5)) - 1) * 100 if cap_final > 0 else 0

    vol = df_stock['Rendement_Algo'].dropna().std() * (252 ** 0.5) * 100
    ret_series = df_stock['Rendement_Algo'].dropna()
    if len(ret_series) > 1 and ret_series.std() > 0:
        sharpe = ((ret_series.mean()) / ret_series.std()) * (252 ** 0.5)
    else:
        sharpe = 0

    cum_max = df_stock['Capital_Algo'].cummax()
    drawdown = (df_stock['Capital_Algo'] - cum_max) / cum_max * 100
    max_dd = drawdown.min()

    wins = sum(1 for t in trades if t['pnl_pct'] > 0)
    total_trades = len(trades)
    win_rate = (wins / total_trades * 100) if total_trades > 0 else 0

    gross_profit = sum(t['pnl_pct'] for t in trades if t['pnl_pct'] > 0)
    gross_loss = abs(sum(t['pnl_pct'] for t in trades if t['pnl_pct'] < 0))
    profit_factor = gross_profit / gross_loss if gross_loss > 0 else 0

    step = max(len(df_stock) // 200, 1)
    equity_curve = []
    for idx in range(0, len(df_stock), step):
        row = df_stock.iloc[idx]
        equity_curve.append({
            'date': str(row['Date'].date()),
            'strategy': round(float(row['Capital_Algo']), 0),
            'buyHold': round(float(row['Capital_BuyHold']), 0)
        })

    return {
        'ticker': ticker,
        'period': f"{df_stock['Date'].iloc[0].date()} - {df_stock['Date'].iloc[-1].date()}",
        'n_days': len(df_stock),
        'n_trades': total_trades,
        'capital_initial': capital,
        'capital_final': round(float(cap_final), 0),
        'totalReturn': round(float(ret_algo), 2),
        'annualReturn': round(float(ann_ret), 2),
        'buyHoldReturn': round(float(ret_bh), 2),
        'riskFreeReturn': round(float(ret_sr), 2),
        'sharpe': round(float(sharpe), 4),
        'maxDrawdown': round(float(max_dd), 2),
        'winRate': round(float(win_rate), 1),
        'profitFactor': round(float(profit_factor), 2),
        'volatility': round(float(vol), 2),
        'tpPct': tp_pct,
        'slPct': sl_pct,
        'timeStopDays': time_stop_days,
        'trades': trades[-20:],
        'equityCurve': equity_curve
    }


def is_probable_bond_row(row):
    """Heuristique pour exclure obligations/sukuk du module signaux actions."""
    symbol = str(row.get('Code symbole', '')).upper()
    name = str(row.get('Libellé', row.get('Libelle', ''))).upper()
    taux_raw = str(row.get('TAUX', '')).strip()
    coupon_raw = str(row.get('Numéro de Coupon', '')).strip()

    if '.O' in symbol or symbol.startswith(('TP', 'EOM', 'SUK', 'CRRH')):
        return True
    if 'OBLIG' in name or 'SUKUK' in name or 'ETAT' in name:
        return True
    if '%' in name and any(y in name for y in ['202', '203', '204']):
        return True
    if taux_raw not in ('', '0', '0.0', 'nan', 'None'):
        return True
    if coupon_raw not in ('', '0', 'nan', 'None'):
        return True
    return False


# =============================================================================
# BUILD DASHBOARD SECTIONS
# =============================================================================

def build_signals_from_df(df):
    """Build signals section from latest date data."""
    import pandas as pd

    latest_date = df['Date'].max()
    df_latest = df[df['Date'] == latest_date].copy()
    df_latest = df_latest[~df_latest.apply(is_probable_bond_row, axis=1)].copy()

    # Priorité à l'univers SATELLITE si disponible
    sat_set = set(str(s).upper() for s in (SATELLITE_STOCK_UNIVERSE or []))
    if sat_set:
        df_sat = df_latest[df_latest['Code symbole'].astype(str).str.upper().isin(sat_set)].copy()
        if not df_sat.empty:
            df_latest = df_sat

    summary = {'strongBuy': 0, 'buy': 0, 'hold': 0, 'sell': 0, 'strongSell': 0}
    current = []

    for _, row in df_latest.iterrows():
        signal = row.get('Signal', 'Hold')
        z = safe_json(row.get('Z_Score'))
        price = safe_json(row.get('Cours moyen', 0))
        vol = safe_json(row.get('Volatilite_Ann', 0))
        volume = safe_json(row.get('Volume', 0))
        symbol = str(row.get('Code symbole', ''))
        name = str(row.get('Libelle', row.get('Libellé', symbol)))

        key_map = {'Strong Buy': 'strongBuy', 'Buy': 'buy', 'Hold': 'hold',
                    'Sell': 'sell', 'Strong Sell': 'strongSell'}
        summary[key_map.get(signal, 'hold')] += 1

        if z is not None:
            action = 'BUY' if signal in ('Buy', 'Strong Buy') else ('SELL' if signal in ('Sell', 'Strong Sell') else 'HOLD')
            tp = float(price) * (1 + TAKE_PROFIT_PCT) if price else 0
            sl = float(price) * (1 - STOP_LOSS_PCT) if price else 0
            cap_trade = int(CAPITAL_TOTAL * MAX_POSITION_PCT)
            qty = int(cap_trade / price) if action == 'BUY' and price and price > 0 else 0
            rr = round((tp - price) / (price - sl), 2) if action == 'BUY' and tp > price > sl else 0
            deploy = int(qty * price) if qty > 0 else 0
            current.append({
                'symbol': symbol,
                'name': name[:30] if name else symbol,
                'price': round(float(price), 2) if price else 0,
                'zScore': round(float(z), 2) if z else 0,
                'signal': signal,
                'action': action,
                'volume': int(volume) if volume else 0,
                'volatility': round(float(vol), 1) if vol else 0,
                'tp': round(tp, 2) if tp else 0,
                'sl': round(sl, 2) if sl else 0,
                'qty': qty,
                'tpPct': f"{TAKE_PROFIT_PCT*100:.1f}%",
                'slPct': f"{STOP_LOSS_PCT*100:.1f}%",
                'riskReward': rr,
                'capitalDeploy': deploy,
            })

    current.sort(key=lambda x: x['zScore'])

    buys_count = summary['strongBuy'] + summary['buy']
    sells_count = summary['strongSell'] + summary['sell']
    sentiment = 'NEUTRE'
    if buys_count > sells_count:
        sentiment = 'HAUSSIER'
    elif sells_count > buys_count:
        sentiment = 'BAISSIER'

    top_opps = [s for s in current if s.get('action') == 'BUY']
    top_opps = sorted(top_opps, key=lambda x: x.get('zScore', 0))[:5]

    return {
        'summary': summary,
        'current': current,
        'marketSentiment': sentiment,
        'buysCount': buys_count,
        'sellsCount': sells_count,
        'topOpportunities': top_opps,
        'date': str(latest_date.date()),
        'totalAnalyzed': len(df_latest)
    }


def build_core_from_df(df):
    """Build CORE holdings data from latest prices."""
    holdings = []
    latest_date = df['Date'].max()
    per_stock = int(CAPITAL_TOTAL * CORE_ALLOCATION_PCT / len(CORE_TICKERS))

    for ticker in CORE_TICKERS:
        df_t = df[df['Code symbole'] == ticker]
        if df_t.empty:
            holdings.append({
                'symbol': ticker, 'name': ticker, 'sector': '-',
                'shares': 0, 'avgPrice': 0, 'currentPrice': 0,
                'weight': round(100/len(CORE_TICKERS), 1),
                'pnl': 0, 'pnlPct': 0.0, 'dividendYield': 0.0, 'zScore': 0
            })
            continue

        last_row = df_t[df_t['Date'] == latest_date]
        if last_row.empty:
            last_row = df_t.sort_values('Date').iloc[[-1]]
        last_row = last_row.iloc[0]

        price = float(last_row['Cours moyen']) if not math.isnan(last_row['Cours moyen']) else 0
        z = safe_json(last_row.get('Z_Score', 0))
        name = str(last_row.get('Libellé', ticker))
        shares = int(per_stock / price) if price and price > 0 else 0

        holdings.append({
            'symbol': ticker,
            'name': name[:25] if name else ticker,
            'sector': '-',
            'shares': shares,
            'avgPrice': round(price, 2),
            'currentPrice': round(price, 2),
            'weight': round(100 / len(CORE_TICKERS), 1),
            'pnl': 0,
            'pnlPct': 0.0,
            'dividendYield': 0.0,
            'zScore': round(float(z), 2) if z is not None else 0
        })

    return holdings


def build_bonds_from_df(df):
    """Identify bonds and analyze them."""
    import pandas as pd
    import re

    opportunities = []
    latest_date = df['Date'].max()
    df_latest = df[df['Date'] == latest_date].copy()

    for _, row in df_latest.iterrows():
        symbol = str(row.get('Code symbole', ''))
        if not re.search(r'[0-9\.]', symbol) and '.O' not in symbol:
            continue

        price = safe_json(row.get('Cours moyen', 0))
        taux_raw = row.get('TAUX', 0)
        taux = safe_float(taux_raw) if taux_raw is not None else 0
        name = str(row.get('Libellé', symbol))

        if not price or price <= 0:
            continue

        # Coupon: préférence colonne TAUX, sinon extraction depuis le libellé (ex: "6,30%")
        coupon = taux if taux and taux > 0 else 0
        if coupon <= 0:
            m_coupon = re.search(r'(\d+[\.,]\d+)\s*%', name)
            if m_coupon:
                coupon = safe_float(m_coupon.group(1), 0)

        # Maturité: extraction du pattern AAAA-AAAA si présent
        maturity = '-'
        m_mat = re.search(r'(20\d{2})\s*[-/]\s*(20\d{2})', name)
        if m_mat:
            maturity = m_mat.group(2)

        discount = max(0, 100 - price) if price < 110 else 0
        yield_eff = coupon * 100 / price if price > 0 and coupon > 0 else 0

        if coupon > 0 or discount > 1:
            opportunities.append({
                'name': name[:35] if name else symbol,
                'coupon': round(coupon, 2),
                'maturity': maturity,
                'price': round(float(price), 2),
                'yieldEff': round(yield_eff, 2),
                'discount': round(discount, 1),
                'rating': '-'
            })

    opportunities.sort(key=lambda x: x['yieldEff'], reverse=True)
    return {'opportunities': opportunities[:15]}


# =============================================================================
# LOG MANAGEMENT
# =============================================================================

def load_existing_logs():
    """Load previous backtest log entries from JSON."""
    log_file = DOCS_DATA / "backtest_logs.json"
    if log_file.exists():
        try:
            with open(log_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return []


def save_logs(logs):
    """Save backtest logs to a separate JSON for history tracking."""
    log_file = DOCS_DATA / "backtest_logs.json"
    logs = logs[-50:]
    with open(log_file, 'w', encoding='utf-8') as f:
        json.dump(logs, f, ensure_ascii=False, indent=2)
    print(f"  -> Logs sauvegardes : {log_file} ({len(logs)} entrees)")


def build_backtest_logs(all_results):
    """Build the backtest log entries for history."""
    logs = []
    for r in all_results:
        if r is None:
            continue
        logs.append({
            'date': datetime.now().strftime('%Y-%m-%d'),
            'ticker': r['ticker'],
            'period': r['period'],
            'totalReturn': r['totalReturn'],
            'annualReturn': r['annualReturn'],
            'sharpe': r['sharpe'],
            'maxDrawdown': r['maxDrawdown'],
            'winRate': r['winRate'],
            'nTrades': r['n_trades'],
            'capitalFinal': r['capital_final'],
            'buyHoldReturn': r['buyHoldReturn'],
            'profitFactor': r['profitFactor'],
            'volatility': r['volatility']
        })
    return logs


# =============================================================================
# MAIN
# =============================================================================

def main():
    import pandas as pd

    print("=" * 60)
    print("  BRVM Portfolio - Generation donnees dashboard")
    print("=" * 60)
    print()

    DOCS_DATA.mkdir(parents=True, exist_ok=True)

    if not CSV_FILE.exists():
        print(f"[ERREUR] Fichier CSV introuvable : {CSV_FILE}")
        sys.exit(1)

    # 1. Load and compute Z-scores
    print("[1/5] Chargement des donnees et calcul des Z-scores...")
    df = load_data()
    df = compute_zscores(df)

    latest_date = df['Date'].max()
    print(f"  -> Derniere date : {latest_date.date()}")

    # 2. Build signals
    print("[2/5] Generation des signaux...")
    signals = build_signals_from_df(df)
    print(f"  -> {signals['totalAnalyzed']} titres analyses")
    print(f"  -> Strong Buy: {signals['summary']['strongBuy']}, "
          f"Buy: {signals['summary']['buy']}, "
          f"Hold: {signals['summary']['hold']}, "
          f"Sell: {signals['summary']['sell']}, "
          f"Strong Sell: {signals['summary']['strongSell']}")

    # 3. Run backtests on CORE tickers + top signal tickers
    print("[3/5] Execution des backtests...")

    tickers_to_test = list(CORE_TICKERS)
    top_buy = [
        s['symbol'] for s in signals['current']
        if s['signal'] in ('Strong Buy', 'Buy') and s['symbol'] not in tickers_to_test
    ]
    tickers_to_test.extend(top_buy[:5])

    all_bt_results = []
    best_result = None

    param_grid = [
        (0.05, 0.08, 10),
        (0.05, 0.08, 20),
        (0.06, 0.08, 10),
        (0.05, 0.05, 10),
        (0.08, 0.05, 10),
    ]

    for ticker in tickers_to_test:
        try:
            best_local = None
            best_score = -10**9

            for tp, sl, ts in param_grid:
                result = run_backtest_for_ticker(
                    df,
                    ticker,
                    capital=CAPITAL_TOTAL,
                    tp_pct=tp,
                    sl_pct=sl,
                    time_stop_days=ts,
                )
                if not result:
                    continue

                score = result['sharpe']
                if result['n_trades'] < 5:
                    score -= 0.5
                if result['maxDrawdown'] < -20:
                    score -= 0.5

                if score > best_score:
                    best_score = score
                    best_local = result

            if best_local:
                all_bt_results.append(best_local)
                print(
                    f"  -> {ticker:8} : {best_local['totalReturn']:+.2f}% "
                    f"(Sharpe {best_local['sharpe']:.2f}, MDD {best_local['maxDrawdown']:.2f}%, "
                    f"{best_local['n_trades']} trades, TP {best_local['tpPct']*100:.0f}% / SL {best_local['slPct']*100:.0f}% / TS {best_local['timeStopDays']}j)"
                )
                if best_result is None or best_local['sharpe'] > best_result['sharpe']:
                    best_result = best_local
        except Exception as e:
            print(f"  -> {ticker:8} : ERREUR - {e}")

    # 4. Build all sections
    print("[4/5] Construction du dashboard...")

    core = build_core_from_df(df)
    bonds = build_bonds_from_df(df)

    if best_result:
        bt_strategy = {
            'totalReturn': best_result['totalReturn'],
            'annualReturn': best_result['annualReturn'],
            'sharpe': best_result['sharpe'],
            'maxDrawdown': best_result['maxDrawdown'],
            'winRate': best_result['winRate'],
            'profitFactor': best_result['profitFactor'],
            'totalTrades': best_result['n_trades'],
            'avgDuration': round(sum(t['days'] for t in best_result['trades']) / max(len(best_result['trades']), 1), 1),
            'bestTicker': best_result['ticker'],
            'volatility': best_result['volatility']
        }
        bt_buyhold = {'totalReturn': best_result['buyHoldReturn'], 'annualReturn': 0}
        equity_curve = best_result['equityCurve']

        all_trades = []
        for r in all_bt_results:
            if r:
                all_trades.extend(r['trades'])
        all_trades.sort(key=lambda x: x.get('date_exit', ''), reverse=True)
        recent_trades = [{
            'date': t['date_exit'],
            'action': 'SELL',
            'symbol': t['symbol'],
            'qty': '-',
            'entry': t['entry'],
            'exit': t['exit'],
            'pnl': round((t['exit'] - t['entry']) * 100, 0),
            'pnlPct': t['pnl_pct'],
            'reason': t['reason']
        } for t in all_trades[:20]]
    else:
        bt_strategy = {'totalReturn':0,'annualReturn':0,'sharpe':0,'maxDrawdown':0,
                       'winRate':0,'profitFactor':0,'totalTrades':0,'avgDuration':0,
                       'bestTicker':'-','volatility':0}
        bt_buyhold = {'totalReturn':0,'annualReturn':0}
        equity_curve = []
        recent_trades = []

    monthly_returns = []
    if equity_curve:
        prev_val = equity_curve[0]['strategy']
        current_month = equity_curve[0]['date'][:7]
        for pt in equity_curve[1:]:
            m = pt['date'][:7]
            if m != current_month:
                ret = (pt['strategy'] / max(prev_val, 1) - 1) * 100
                monthly_returns.append({'month': current_month, 'ret': round(ret, 2)})
                prev_val = pt['strategy']
                current_month = m
        monthly_returns = monthly_returns[-12:]

    overview = {
        'totalValue':        CAPITAL_TOTAL,
        'initialCapital':    CAPITAL_TOTAL,
        'ytdReturn':         bt_strategy['totalReturn'] if best_result else 0,
        'dailyPnl':          0,
        'dailyPnlPct':       0.0,
        'coreValue':         int(CAPITAL_TOTAL * CORE_ALLOCATION_PCT),
        'satelliteValue':    int(CAPITAL_TOTAL * SATELLITE_ALLOCATION_PCT),
        'cashAvailable':     int(CAPITAL_TOTAL * CASH_ALLOCATION_PCT),
        'openPositions':     len(CORE_TICKERS),
        'corePositions':     len(CORE_TICKERS),
        'satellitePositions':0,
        'sharpeRatio':       bt_strategy.get('sharpe'),
        'maxDrawdown':       bt_strategy.get('maxDrawdown'),
        'winRate':           bt_strategy.get('winRate')
    }

    # 5. Build and save logs
    print("[5/5] Sauvegarde des resultats...")

    new_logs = build_backtest_logs(all_bt_results)
    existing_logs = load_existing_logs()
    all_logs = existing_logs + new_logs
    save_logs(all_logs)

    backtest_per_ticker = []
    for r in all_bt_results:
        if r:
            backtest_per_ticker.append({
                'ticker': r['ticker'],
                'totalReturn': r['totalReturn'],
                'annualReturn': r['annualReturn'],
                'sharpe': r['sharpe'],
                'maxDrawdown': r['maxDrawdown'],
                'winRate': r['winRate'],
                'nTrades': r['n_trades'],
                'profitFactor': r['profitFactor'],
                'buyHoldReturn': r['buyHoldReturn'],
                'volatility': r['volatility'],
                'period': r['period']
            })

    dashboard = {
        'meta': {
            'lastUpdate': datetime.now().isoformat(),
            'currency': 'FCFA',
            'marketStatus': 'Donnees mises a jour',
            'dataDate': str(latest_date.date()),
            'generatedBy': 'generate_dashboard_data.py'
        },
        'overview': overview,
        'portfolioHistory': equity_curve[:90] if equity_curve else [],
        'core': core,
        'satellite': [],
        'backtests': {
            'strategy': bt_strategy,
            'buyHold': bt_buyhold,
            'riskFree': {'annualReturn': 6.5},
            'equityCurve': equity_curve,
            'monthlyReturns': monthly_returns,
            'recentTrades': recent_trades,
            'perTicker': backtest_per_ticker
        },
        'signals': signals,
        'bonds': bonds,
        'logs': all_logs[-15:]
    }

    output_path = DOCS_DATA / "dashboard.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(dashboard, f, ensure_ascii=False, indent=2, default=safe_json)

    size_kb = output_path.stat().st_size / 1024
    print()
    print(f"[OK] Dashboard JSON genere : {output_path}")
    print(f"     Taille : {size_kb:.1f} KB")
    print()
    print("  Resume :")
    print(f"    CORE holdings    : {len(core)} positions")
    print(f"    Signaux          : {len(signals['current'])} titres")
    print(f"    Obligations      : {len(bonds['opportunities'])} opportunites")
    print(f"    Backtests        : {len(all_bt_results)} tickers testes")
    print(f"    Logs historiques : {len(all_logs)} entrees")
    print(f"    Equity curve     : {len(equity_curve)} points")
    print(f"    Trades recents   : {len(recent_trades)} trades")
    print()


if __name__ == "__main__":
    main()

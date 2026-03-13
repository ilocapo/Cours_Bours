"""
Portfolio Manager

Gère les positions ouvertes, calcule les P&L, applique SL/TP
Met à jour open_positions.csv et portfolio_summary.csv
"""

import sys
import os

# Forcer UTF-8 pour Windows
if sys.platform == 'win32':
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from datetime import datetime
import pandas as pd
from pathlib import Path
import requests
from bs4 import BeautifulSoup

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / 'src'))
sys.path.insert(0, str(PROJECT_ROOT))

from backtester import charge_and_clean_data

# Charger la configuration depuis config.py
try:
    from src.config import (
        REAL_PORTFOLIO_CAPITAL,
        REAL_CORE_CAPITAL,
        REAL_CAPITAL_PER_CORE_STOCK,
        CORE_STOCKS
    )
except ImportError:
    REAL_PORTFOLIO_CAPITAL = 1_000_000
    REAL_CORE_CAPITAL = 700_000
    REAL_CAPITAL_PER_CORE_STOCK = 140_000
    CORE_STOCKS = ['SNTS', 'ORGT', 'ONTBF', 'SAFC', 'ABJC']
try:
    from src.config import (
        REAL_PORTFOLIO_CAPITAL,
        REAL_CORE_CAPITAL,
        REAL_CAPITAL_PER_CORE_STOCK,
        CORE_STOCKS
    )
except ImportError:
    REAL_PORTFOLIO_CAPITAL = 1_000_000
    REAL_CORE_CAPITAL = 700_000
    REAL_CAPITAL_PER_CORE_STOCK = 140_000
    CORE_STOCKS = ['SNTS', 'ORGT', 'ONTBF', 'SAFC', 'ABJC']

# URL BRVM
BRVM_URL = "https://www.brvm.org"

def fetch_brvm_prices_portfolio() -> dict:
    """
    Scrape tous les prix BRVM pour mise à jour portfolio
    Retourne: {ticker: price}
    """
    prices = {}
    
    try:
        print("   Scraping BRVM prices...")
        
        url = f"{BRVM_URL}/fr/cours-actions/0"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        
        response = requests.get(url, headers=headers, timeout=10, verify=False)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, "html.parser")
        
        # Scraper toutes les tables
        tables = soup.find_all("table")
        
        for table in tables:
            rows = table.find_all("tr")
            if len(rows) < 2:
                continue
            
            # Détecter format
            first_row = rows[0]
            first_cells = first_row.find_all(["td", "th"])
            num_cols = len(first_cells)
            
            if num_cols == 3:
                price_col_idx = 1
            elif num_cols >= 6:
                price_col_idx = 5
            else:
                continue
            
            for row in rows:
                cells = row.find_all(["td", "th"])
                if cells and len(cells) >= price_col_idx + 1:
                    try:
                        ticker_text = cells[0].get_text(strip=True).upper()
                        
                        if not (3 <= len(ticker_text) <= 10):
                            continue
                        
                        if ticker_text in ['TICKER', 'CODE SYMBOLE', 'SYMBOL', 'TOUTES']:
                            continue
                        
                        if not all(c.isalnum() or c in '.-' for c in ticker_text):
                            continue
                        
                        if ticker_text in prices:
                            continue
                        
                        price_text = cells[price_col_idx].get_text(strip=True)
                        price_text_clean = price_text.replace(",", ".").replace(" ", "").replace("\n", "")
                        close_price = float(price_text_clean)
                        
                        if close_price > 0:
                            prices[ticker_text] = close_price
                    except (ValueError, AttributeError):
                        pass
        
        print(f"   ✅ Scraped {len(prices)} prices from BRVM")
        return prices
        
    except Exception as e:
        print(f"   ⚠️  Error scraping BRVM: {e}, falling back to historical data")
        return {}

def get_latest_prices():
    """
    Récupère les prix actuels: BRVM en direct si possible, sinon CSV historique
    """
    print("\nRécupération des prix actuels...")
    
    # Essayer BRVM d'abord
    brvm_prices = fetch_brvm_prices_portfolio()
    
    if brvm_prices:
        today_date = datetime.now()
        print(f"OK - Prices pour {len(brvm_prices)} stocks ({today_date.strftime('%d/%m/%Y')} BRVM)")
        return brvm_prices, today_date
    
    # Fallback: CSV historique
    print("   Fallback to historical CSV...")
    df_all = charge_and_clean_data()
    df_all['Date'] = pd.to_datetime(df_all['Date'])
    
    # Dernier jour disponible
    latest_date = df_all['Date'].max()
    df_latest = df_all[df_all['Date'] == latest_date]
    
    # Créer dictionnaire ticker -> price
    price_dict = {}
    for idx, row in df_latest.iterrows():
        ticker = row['Code symbole']
        price = row['Cours moyen']
        price_dict[ticker] = price
    
    print(f"OK - Prices pour {len(price_dict)} stocks ({latest_date.strftime('%d/%m/%Y')})")
    return price_dict, latest_date


def update_open_positions():
    """
    Met à jour les positions ouvertes avec les prix actuels
    Applique SL et TP
    """
    
    print("\n" + "="*100)
    print("PORTFOLIO MANAGER - UPDATE POSITIONS")
    print("="*100)
    
    # Récupérer les prix
    prices, latest_date = get_latest_prices()
    
    # Charger les positions ouvertes
    if not Path('open_positions.csv').exists():
        print("Aucune position ouverte.")
        return None
    
    df_positions = pd.read_csv('open_positions.csv')
    
    if df_positions.empty:
        print("Aucune position ouverte.")
        return None
    
    print(f"\n📊 Updating {len(df_positions)} open positions...")
    
    df_positions['Date'] = latest_date.strftime('%d/%m/%Y')
    
    # Mise à jour des prix et P&L
    executed_trades = []
    positions_to_keep = []
    
    for idx, row in df_positions.iterrows():
        ticker = row['Ticker']
        entry_price = row['Entry_Price']
        qty = row['Qty']
        tp_price = row['TP_Price']
        sl_price = row['SL_Price']
        entry_date = row['Entry_Date']
        
        # Récupérer le prix actuel
        current_price = prices.get(ticker, entry_price)
        
        # Calculer P&L
        current_value = current_price * qty
        entry_value = entry_price * qty
        pl_fcfa = current_value - entry_value
        pl_pct = (pl_fcfa / entry_value * 100) if entry_value > 0 else 0
        
        # Jours depuis ouverture
        entry_dt = pd.to_datetime(entry_date, format='%d/%m/%Y')
        days_open = (latest_date - entry_dt).days
        
        # Vérifier SL ou TP
        position_closed = False
        exit_reason = None
        
        if current_price >= tp_price:
            # Take Profit atteint
            executed_trades.append({
                'Entry_Date': entry_date,
                'Ticker': ticker,
                'Signal': row.get('Signal', 'N/A'),
                'Entry_Price': entry_price,
                'Qty': qty,
                'Total_Entry_Cost': entry_value,
                'Exit_Date': latest_date.strftime('%d/%m/%Y'),
                'Exit_Price': current_price,
                'Exit_Reason': 'TP_HIT',
                'Total_Exit_Value': current_value,
                'P&L_FCFA': pl_fcfa,
                'P&L_%': round(pl_pct, 2),
                'Sharpe_Calc': 'OK'
            })
            position_closed = True
            exit_reason = 'TP_HIT'
        
        elif current_price <= sl_price:
            # Stop Loss atteint
            executed_trades.append({
                'Entry_Date': entry_date,
                'Ticker': ticker,
                'Signal': row.get('Signal', 'N/A'),
                'Entry_Price': entry_price,
                'Qty': qty,
                'Total_Entry_Cost': entry_value,
                'Exit_Date': latest_date.strftime('%d/%m/%Y'),
                'Exit_Price': current_price,
                'Exit_Reason': 'SL_HIT',
                'Total_Exit_Value': current_value,
                'P&L_FCFA': pl_fcfa,
                'P&L_%': round(pl_pct, 2),
                'Sharpe_Calc': 'OK'
            })
            position_closed = True
            exit_reason = 'SL_HIT'
        
        # Garder la position si pas fermée
        if not position_closed:
            row_update = row.copy()
            row_update['Current_Price'] = current_price
            row_update['Current_Value'] = current_value
            row_update['P&L'] = pl_fcfa
            row_update['P&L_%'] = round(pl_pct, 2)
            row_update['Days_Open'] = days_open
            positions_to_keep.append(row_update)
        
        # Afficher le résumé
        status = 'CLOSED' if position_closed else 'OPEN'
        close_reason = f" ({exit_reason})" if exit_reason else ""
        print(f"  {ticker}: {qty} @ {entry_price:.0f} → {current_price:.0f} | P&L {pl_pct:+.2f}% | {status}{close_reason}")
    
    # Sauvegarder les positions mises à jour
    if positions_to_keep:
        df_open_updated = pd.DataFrame(positions_to_keep)
        df_open_updated.to_csv('open_positions.csv', index=False)
        print(f"\n✅ {len(positions_to_keep)} positions restent ouvertes")
    else:
        # Vider le fichier
        pd.DataFrame(columns=df_positions.columns).to_csv('open_positions.csv', index=False)
        print(f"\n✅ Tous les positions fermées!")
    
    # Sauvegarder les trades exécutés
    if executed_trades:
        df_trades = pd.read_csv('executed_trades.csv') if Path('executed_trades.csv').exists() else pd.DataFrame()
        df_new_trades = pd.DataFrame(executed_trades)
        df_trades = pd.concat([df_trades, df_new_trades], ignore_index=True)
        df_trades.to_csv('executed_trades.csv', index=False)
        print(f"✅ {len(executed_trades)} positions fermées et enregistrées")
    
    return {
        'positions_open': len(positions_to_keep),
        'positions_closed': len(executed_trades),
        'latest_date': latest_date
    }


def calculate_portfolio_summary():
    """
    Calcule le résumé global du portefeuille (CORE + SATELLITE)
    Recalcule CORE en utilisant les prix BRVM actuels
    """
    
    print("\n" + "="*100)
    print("PORTFOLIO SUMMARY")
    print("="*100)
    
    # Récupérer les prix BRVM en direct
    prices, latest_date = get_latest_prices()
    
    # Définir les 5 CORE stocks et le capital initial par stock
    # Basé sur la configuration config.py: 70% de 1M = 700K, divisé par 5 = 140K par stock
    CORE_TICKERS = CORE_STOCKS
    INITIAL_PRICE_CORE = {  # Prix initiaux de référence (ou utiliser prix du 31/12/2025)
        'SNTS': 27510,      # Approximation
        'ORGT': 3000,
        'ONTBF': 2540,
        'SAFC': 5000,
        'ABJC': 2840
    }
    CORE_PER_STOCK_INITIAL = REAL_CAPITAL_PER_CORE_STOCK  # 140K par action (config.py)
    
    # Calculer la valeur CORE en temps réel
    core_value = 0
    for ticker in CORE_TICKERS:
        current_price = prices.get(ticker, INITIAL_PRICE_CORE.get(ticker, 1))
        initial_price = INITIAL_PRICE_CORE.get(ticker, 1)
        
        # Nombre d'actions = capital initial / prix initial
        qty = CORE_PER_STOCK_INITIAL / initial_price if initial_price > 0 else 0
        
        # Valeur actuelle = nombre d'actions × prix actuel
        position_value = qty * current_price
        core_value += position_value
    
    # Charger les positions ouvertes du SATELLITE
    df_open = pd.read_csv('open_positions.csv') if Path('open_positions.csv').exists() else pd.DataFrame()
    
    # Charger les trades exécutés
    df_executed = pd.read_csv('executed_trades.csv') if Path('executed_trades.csv').exists() else pd.DataFrame()
    
    # Calculer les totaux SATELLITE
    satellite_open_value = 0
    satellite_pl = 0
    
    if not df_open.empty:
        satellite_open_value = df_open['Current_Value'].sum() if 'Current_Value' in df_open.columns else 0
        satellite_pl = df_open['P&L'].sum() if 'P&L' in df_open.columns else 0
    
    # Trades fermés aujourd'hui
    today_pl = 0
    if not df_executed.empty:
        df_executed['Exit_Date'] = pd.to_datetime(df_executed['Exit_Date'], format='%d/%m/%Y')
        today = pd.Timestamp.today()
        df_today = df_executed[df_executed['Exit_Date'] == today]
        today_pl = df_today['P&L_FCFA'].sum() if 'P&L_FCFA' in df_today.columns else 0
    
    # Calcul total
    satellite_value = satellite_open_value
    total_value = core_value + satellite_value
    
    # 💰 RÉSULTATS
    print(f"\n💰 CORE (70% - BIG CAPS):")
    print(f"   Value: {core_value:,.0f} FCFA")
    print(f"\n🤖 SATELLITE (30% - Z-SCORE ROBOT):")
    print(f"   Open Positions Value: {satellite_open_value:,.0f} FCFA")
    print(f"   P&L Open: {satellite_pl:+,.0f} FCFA")
    print(f"   P&L Today: {today_pl:+,.0f} FCFA")
    print(f"\n📊 TOTAL PORTFOLIO:")
    print(f"   Value: {total_value:,.0f} FCFA")
    
    print("="*100 + "\n")


def main():
    """Main execution"""
    try:
        update_open_positions()
        calculate_portfolio_summary()
    except Exception as e:
        print(f"\nERREUR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()

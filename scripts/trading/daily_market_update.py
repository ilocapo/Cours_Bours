"""
Daily Market Update Script

Récupère les données quotidiennes de la BRVM,
calcule les valeurs du portefeuille CORE + SATELLITE,
et met à jour YTD_2026.csv
"""

import sys
import os

# Forcer UTF-8 pour Windows
if sys.platform == 'win32':
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

import requests
import pandas as pd
from datetime import datetime
from bs4 import BeautifulSoup
from pathlib import Path
import glob

PROJECT_ROOT = Path(__file__).resolve().parents[2]

# Charger la configuration depuis config.py
try:
    sys.path.insert(0, str(PROJECT_ROOT))
    from src.config import (
        REAL_PORTFOLIO_CAPITAL,
        REAL_CORE_CAPITAL,
        REAL_SATELLITE_CAPITAL,
        REAL_CASH_CAPITAL,
        REAL_CAPITAL_PER_CORE_STOCK,
        CORE_STOCKS,
        CORE_STOCKS_WITHIN_CORE_PCT,
        CORE_BONDS_WITHIN_CORE_PCT,
        CORE_BOND_TOP_N
    )
    CORE_TICKERS            = CORE_STOCKS
    INITIAL_CAPITAL         = REAL_PORTFOLIO_CAPITAL
    CORE_VALUE_INITIAL      = REAL_CORE_CAPITAL
    SATELLITE_VALUE_INITIAL = REAL_SATELLITE_CAPITAL
    CASH_VALUE              = REAL_CASH_CAPITAL
    CORE_PER_STOCK          = REAL_CAPITAL_PER_CORE_STOCK
except ImportError:
    # Fallback si config.py non disponible
    CORE_TICKERS            = ["SNTS", "ORGT", "ONTBF", "SAFC", "ABJC"]
    INITIAL_CAPITAL         = 1_000_000
    CORE_ALLOCATION         = 0.70
    SATELLITE_ALLOCATION    = 0.20
    CORE_VALUE_INITIAL      = INITIAL_CAPITAL * CORE_ALLOCATION
    SATELLITE_VALUE_INITIAL = INITIAL_CAPITAL * SATELLITE_ALLOCATION
    CASH_VALUE              = int(INITIAL_CAPITAL * 0.10)
    CORE_PER_STOCK          = CORE_VALUE_INITIAL / len(CORE_TICKERS)
    CORE_STOCKS_WITHIN_CORE_PCT = 0.70
    CORE_BONDS_WITHIN_CORE_PCT = 0.30
    CORE_BOND_TOP_N = 3

# URL BRVM pour scraper
BRVM_URL = "https://www.brvm.org"


def load_core_allocation_positions() -> pd.DataFrame:
    """
    Charge les positions CORE réelles depuis core_allocation.csv si disponible.

    Colonnes attendues (tolérantes):
      - Ticker
      - Qty
      - Entry_Price (optionnel)
      - Type (optionnel: STOCK/BOND)

    Returns:
      DataFrame normalisé ou DataFrame vide si indisponible/invalide.
    """
    core_path = PROJECT_ROOT / 'core_allocation.csv'
    if not core_path.exists():
        return pd.DataFrame()


def load_latest_bond_opportunities() -> pd.DataFrame:
    """Charge le dernier fichier bond_opportunities_*.csv s'il existe."""
    files = sorted(glob.glob(str(PROJECT_ROOT / 'bond_opportunities_*.csv')))
    if not files:
        return pd.DataFrame()
    try:
        df = pd.read_csv(files[-1])
        if df.empty:
            return pd.DataFrame()
        df.columns = [str(c).strip() for c in df.columns]
        if 'Effective_Yield_%' in df.columns:
            df['Effective_Yield_%'] = pd.to_numeric(df['Effective_Yield_%'], errors='coerce').fillna(0)
            df = df.sort_values('Effective_Yield_%', ascending=False)
        if 'Current_Price' in df.columns:
            df['Current_Price'] = pd.to_numeric(df['Current_Price'], errors='coerce').fillna(0)
        return df
    except Exception as e:
        print(f"   ⚠️  Impossible de lire bond_opportunities: {e}")
        return pd.DataFrame()

    try:
        df = pd.read_csv(core_path)
        if df.empty:
            return pd.DataFrame()

        # Normalisation minimale des colonnes
        df.columns = [str(c).strip() for c in df.columns]
        if 'Ticker' not in df.columns or 'Qty' not in df.columns:
            return pd.DataFrame()

        df['Ticker'] = df['Ticker'].astype(str).str.strip().str.upper()
        df['Qty'] = pd.to_numeric(df['Qty'], errors='coerce').fillna(0)
        if 'Entry_Price' in df.columns:
            df['Entry_Price'] = pd.to_numeric(df['Entry_Price'], errors='coerce').fillna(0)
        else:
            df['Entry_Price'] = 0.0

        if 'Type' not in df.columns:
            df['Type'] = 'UNKNOWN'
        else:
            df['Type'] = df['Type'].astype(str).str.strip().str.upper()

        # Si la colonne Status existe, ne garder que les positions réellement investies
        if 'Status' in df.columns:
            status = df['Status'].astype(str).str.strip().str.upper()
            df = df[~status.isin(['SUGGESTED', 'TEMPLATE', 'DRAFT'])].copy()

        # Exclure les lignes invalides
        df = df[(df['Ticker'] != '') & (df['Qty'] > 0)].copy()
        return df
    except Exception as e:
        print(f"   ⚠️  core_allocation.csv illisible: {e}")
        return pd.DataFrame()


def calculate_satellite_value(prices: dict) -> tuple:
    """
    Calcule la valeur réelle du SATELLITE:
      valeur = capital_initial_satellite + P&L réalisé + P&L latent

    Retourne:
      (satellite_value, open_positions_count, trades_closed_count)
    """
    open_positions_path = Path('open_positions.csv')
    executed_trades_path = Path('executed_trades.csv')

    realized_pnl = 0.0
    unrealized_pnl = 0.0
    open_positions_count = 0
    trades_closed_count = 0

    if executed_trades_path.exists():
        try:
            df_executed = pd.read_csv(executed_trades_path)
            if not df_executed.empty:
                if 'P&L_FCFA' in df_executed.columns:
                    realized_pnl = pd.to_numeric(df_executed['P&L_FCFA'], errors='coerce').fillna(0).sum()
                trades_closed_count = len(df_executed)
        except Exception as e:
            print(f"   ⚠️  Impossible de lire executed_trades.csv: {e}")

    if open_positions_path.exists():
        try:
            df_open = pd.read_csv(open_positions_path)
            if not df_open.empty:
                open_positions_count = len(df_open)
                for _, row in df_open.iterrows():
                    ticker = str(row.get('Ticker', '')).strip().upper()
                    entry_price = float(row.get('Entry_Price', 0) or 0)
                    qty = float(row.get('Qty', 0) or 0)
                    if qty <= 0 or entry_price <= 0:
                        continue

                    current_price = float(prices.get(ticker, entry_price))
                    unrealized_pnl += (current_price - entry_price) * qty
        except Exception as e:
            print(f"   ⚠️  Impossible de lire open_positions.csv: {e}")

    satellite_value = SATELLITE_VALUE_INITIAL + realized_pnl + unrealized_pnl
    if satellite_value < 0:
        satellite_value = 0

    return satellite_value, open_positions_count, trades_closed_count


def fetch_all_brvm_prices() -> dict:
    """
    Scrape TOUS les prix BRVM en une seule requête
    Retourne: {ticker: price}
    """
    prices = {}
    try:
        url = f"{BRVM_URL}/fr/cours-actions/0"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        
        response = requests.get(url, headers=headers, timeout=10, verify=False)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, "html.parser")
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
        
        return prices
    except Exception as e:
        print(f"   ⚠️  Error fetching BRVM prices: {e}")
        return {}


def fetch_stock_price(ticker: str) -> dict:
    """
    Récupère le prix d'un stock via scraping BRVM (v2 - corrigée)
    Utilise la bonne URL et gère multi-format
    """
    try:
        # Bonne URL (comme dans daily_signals.py)
        url = f"{BRVM_URL}/fr/cours-actions/0"
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        
        response = requests.get(url, headers=headers, timeout=10, verify=False)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, "html.parser")
        
        # Scraper toutes les tables (comme dans daily_signals.py)
        tables = soup.find_all("table")
        
        for table in tables:
            rows = table.find_all("tr")
            if len(rows) < 2:
                continue
            
            # Détecter format (3 cols = petit format, 7+ cols = format complet)
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
                    ticker_text = cells[0].get_text(strip=True).upper()
                    
                    if ticker_text == ticker.upper():
                        try:
                            price_text = cells[price_col_idx].get_text(strip=True)
                            price_text_clean = price_text.replace(",", ".").replace(" ", "")
                            close_price = float(price_text_clean)
                            
                            if close_price > 0:
                                return {
                                    "ticker": ticker.upper(),
                                    "close": close_price,
                                    "success": True
                                }
                        except (ValueError, AttributeError):
                            pass
        
        return {"ticker": ticker, "success": False}
            
    except Exception as e:
        print(f"❌ Erreur scraping pour {ticker}: {e}")
        return {"ticker": ticker, "success": False}


def calculate_portfolio_value() -> dict:
    """
    Calcule les valeurs CORE et SATELLITE du portefeuille
    Utilise BRVM scraper pour les prix en temps réel
    """
    
    print(f"📊 Récupération des données... {datetime.now().strftime('%H:%M:%S')}")
    
    # Récupérer les prix BRVM en direct for all tickers
    prices = fetch_all_brvm_prices()
    
    # Prix initiaux de référence pour les 5 CORE stocks
    INITIAL_PRICE_CORE = {
        'SNTS': 27510,
        'ORGT': 3000,
        'ONTBF': 2540,
        'SAFC': 5000,
        'ABJC': 2840
    }

    # Calculer la valeur CORE en temps réel
    # Priorité: positions réelles (core_allocation.csv) -> inclut obligations si présentes
    core_value = 0
    core_positions = load_core_allocation_positions()

    if not core_positions.empty:
        print(f"  📁 CORE réel chargé depuis core_allocation.csv ({len(core_positions)} lignes)")
        for _, pos in core_positions.iterrows():
            ticker = pos['Ticker']
            qty = float(pos['Qty'])
            entry_price = float(pos.get('Entry_Price', 0) or 0)
            position_type = str(pos.get('Type', 'UNKNOWN')).upper()

            # Prix live BRVM si disponible, sinon fallback sur Entry_Price
            current_price = float(prices.get(ticker, entry_price if entry_price > 0 else 0))
            if current_price <= 0:
                # Si aucun prix disponible, ne pas casser le calcul
                print(f"  ⚠️  {ticker}: prix indisponible (ligne ignorée)")
                continue

            position_value = qty * current_price
            core_value += position_value
            tag = 'OBLIG' if position_type == 'BOND' else 'CORE'
            print(f"  ✓ [{tag}] {ticker}: {qty:,.0f} × {current_price:,.0f} = {position_value:,.0f} FCFA")
    else:
        # Fallback simulé: CORE mixte Actions + Obligations
        print("  ℹ️  core_allocation.csv absent → fallback CORE mixte (actions + obligations)")

        # 1) Bloc actions du CORE
        core_stocks_budget = CORE_VALUE_INITIAL * CORE_STOCKS_WITHIN_CORE_PCT
        per_stock_budget = core_stocks_budget / max(1, len(CORE_TICKERS))

        for ticker in CORE_TICKERS:
            current_price = prices.get(ticker, INITIAL_PRICE_CORE.get(ticker, 1))
            initial_price = INITIAL_PRICE_CORE.get(ticker, 1)
            qty = per_stock_budget / initial_price if initial_price > 0 else 0
            position_value = qty * current_price
            core_value += position_value
            print(f"  ✓ [CORE] {ticker}: {current_price:,.0f} FCFA → {position_value:,.0f} FCFA")

        # 2) Bloc obligations du CORE (basé sur le dernier bond_opportunities)
        core_bonds_budget = CORE_VALUE_INITIAL * CORE_BONDS_WITHIN_CORE_PCT
        bonds_df = load_latest_bond_opportunities()

        if not bonds_df.empty and 'Ticker' in bonds_df.columns and 'Current_Price' in bonds_df.columns:
            bonds_df = bonds_df.head(int(max(1, CORE_BOND_TOP_N))).copy()
            per_bond_budget = core_bonds_budget / max(1, len(bonds_df))

            for _, b in bonds_df.iterrows():
                ticker = str(b.get('Ticker', '')).strip().upper()
                ref_price = float(b.get('Current_Price', 0) or 0)
                current_price = float(prices.get(ticker, ref_price)) if ticker else ref_price
                if current_price <= 0:
                    continue
                qty = per_bond_budget / ref_price if ref_price > 0 else 0
                position_value = qty * current_price
                core_value += position_value
                print(f"  ✓ [OBLIG] {ticker}: {current_price:,.2f} FCFA → {position_value:,.0f} FCFA")
        else:
            # Sans fichier obligations, on garde ce budget en réserve CORE
            core_value += core_bonds_budget
            print(f"  ⚠️  Pas de bond_opportunities: réserve obligataire CORE = {core_bonds_budget:,.0f} FCFA")
    
    # Valeur SATELLITE réelle (capital initial + P&L réalisé + latent)
    satellite_value, positions_open_count, trades_closed_count = calculate_satellite_value(prices)
    print(f"  🤖 SATELLITE: {satellite_value:,.0f} FCFA | Open={positions_open_count} | Closed={trades_closed_count}")

    # Total = core + satellite + cash (réserve non investie)
    total_value = core_value + satellite_value + CASH_VALUE
    ytd_return_pct = ((total_value / INITIAL_CAPITAL) - 1) * 100 if INITIAL_CAPITAL > 0 else 0
    
    return {
        "date": datetime.now().strftime("%d/%m/%Y"),
        "core_value": core_value,
        "satellite_value": satellite_value,
        "total_value": total_value,
        "ytd_return_pct": ytd_return_pct,
        "trades_count": trades_closed_count
    }


def update_ytd_csv(portfolio_data: dict):
    """
    Ajoute une ligne à YTD_2026.csv
    """
    csv_path = Path("YTD_2026.csv")
    
    # Créer le dataframe avec la nouvelle ligne
    new_row = pd.DataFrame([{
        "Date": portfolio_data["date"],
        "Core_Value": int(portfolio_data["core_value"]),
        "Satellite_Value": int(portfolio_data["satellite_value"]),
        "Total_Value": int(portfolio_data["total_value"]),
        "YTD_Return_%": round(portfolio_data["ytd_return_pct"], 2),
        "Trades_Count": int(portfolio_data["trades_count"]),
        "Status": "AHEAD" if portfolio_data["ytd_return_pct"] >= 1.4 else "ON_TRACK"
    }])
    
    # Charger le fichier existant ou créer un nouveau
    if csv_path.exists():
        df = pd.read_csv(csv_path)
        df = pd.concat([df, new_row], ignore_index=True)
    else:
        df = new_row
    
    # Sauvegarder
    df.to_csv(csv_path, index=False)
    print(f"\n✅ YTD_2026.csv mis à jour")
    print(f"   Dernière ligne: {portfolio_data['date']} | {portfolio_data['total_value']:,.0f} FCFA | +{portfolio_data['ytd_return_pct']:.1f}%")


def main():
    """
    Lancer le script complet
    """
    print("=" * 60)
    print("DAILY MARKET UPDATE - YTD 2026 TRACKER")
    print("=" * 60)
    
    try:
        # Calculer les valeurs
        portfolio = calculate_portfolio_value()
        
        print("\n📈 RÉSULTAT:")
        print(f"  Core Value:      {portfolio['core_value']:>12,.0f} FCFA")
        print(f"  Satellite Value: {portfolio['satellite_value']:>12,.0f} FCFA")
        print(f"  Total Value:     {portfolio['total_value']:>12,.0f} FCFA")
        print(f"  YTD Return:      {portfolio['ytd_return_pct']:>12.2f}%")
        print(f"  Status:          {portfolio['total_value'] > INITIAL_CAPITAL * 1.014 and '✅ AHEAD' or '⚠️  ON_TRACK'}")
        
        # Mettre à jour le CSV
        update_ytd_csv(portfolio)
        
        print("\n" + "=" * 60)
        
    except Exception as e:
        print(f"\n❌ ERREUR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()

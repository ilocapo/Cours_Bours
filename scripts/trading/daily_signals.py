"""
Daily Trading Signals Generator

Génère les signaux Z-Score quotidiens pour le SATELLITE (30%)
Utilisé pour identifier les opportunités d'achat/vente
"""

import sys
import os
from datetime import datetime, timedelta
import pandas as pd
from pathlib import Path
import requests
from bs4 import BeautifulSoup

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / 'src'))
sys.path.insert(0, str(PROJECT_ROOT))

from backtester import charge_and_clean_data
from zscore_calculator import calculate_zscore, signals_generation
from src.config import (
    REAL_SATELLITE_CAPITAL,
    REAL_PORTFOLIO_CAPITAL,
    ZSCORE_STRONG_BUY,
    ZSCORE_BUY,
    ZSCORE_SELL,
    ZSCORE_STRONG_SELL,
    TAKE_PROFIT_PCT,
    STOP_LOSS_PCT,
    MAX_POSITION_PCT,
    SLIPPAGE_NORMAL_PCT,
    ADVT_MIN_FCFA,
    DAYS_TRADED_MIN
)

# URL BRVM pour scraping
BRVM_URL = "https://www.brvm.org"

# URL BRVM pour scraping
BRVM_URL = "https://www.brvm.org"


def fetch_brvm_prices() -> dict:
    """
    Scrape les prix courants de BRVM (tous les titres)
    
    Gère 2 formats:
    1. Tables "Top 5": [Ticker | Prix | Variation]
    2. Table complète: [Ticker | NomComplet | Volume | Prix1 | Prix2 | PRIX_MOYEN | Variation]
    
    Retourne: {ticker: price}
    """
    prices = {}
    
    try:
        print(f"   Scraping BRVM prices from {BRVM_URL}/fr/cours-actions/0...")
        
        url = f"{BRVM_URL}/fr/cours-actions/0"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        
        response = requests.get(url, headers=headers, timeout=10, verify=False)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, "html.parser")
        
        # Chercher TOUTES les tables
        tables = soup.find_all("table")
        print(f"   Found {len(tables)} tables in HTML")
        
        table_count = 0
        ticker_count = 0
        
        for table_idx, table in enumerate(tables):
            rows = table.find_all("tr")
            if len(rows) < 2:  # Skip tables with < 2 rows
                continue
            
            table_count += 1
            num_rows = len(rows)
            print(f"      Table {table_count}: {num_rows} rows")
            
            # Détecter le format: compter les colonnes de la première row
            first_row = rows[0]
            first_cells = first_row.find_all(["td", "th"])
            num_cols = len(first_cells)
            
            # Déterminer l'index du prix selon le nombre de colonnes
            # Format petit (3 cols): [Ticker, Prix, Var]
            # Format complet (7 cols): [Ticker, Nom, Volume, Prix1, Prix2, PRIX_MOYEN, Var]
            if num_cols == 3:
                price_col_idx = 1  # Index du prix en format petit
            elif num_cols >= 6:
                price_col_idx = 5  # Index du prix en format complet
            else:
                continue  # Format inconnu, skip cette table
            
            for row_idx, row in enumerate(rows):
                cells = row.find_all(["td", "th"])
                if cells and len(cells) >= price_col_idx + 1:
                    try:
                        # Première colonne = ticker
                        ticker_text = cells[0].get_text(strip=True).upper()
                        
                        # Filtrer: tickers valides seulement (3-10 caractères)
                        if not (3 <= len(ticker_text) <= 10):
                            continue
                        
                        # Ignorer les headers
                        if ticker_text in ['TICKER', 'CODE SYMBOLE', 'SYMBOL', 'TOUTES']:
                            continue
                        
                        # Vérifier que c'est un code valide
                        if not all(c.isalnum() or c in '.-' for c in ticker_text):
                            continue
                        
                        # Éviter doublons
                        if ticker_text in prices:
                            continue
                        
                        # Extraire le prix à l'index détecté
                        price_text = cells[price_col_idx].get_text(strip=True)
                        
                        try:
                            # Nettoyer
                            price_text_clean = price_text.replace(",", ".").replace(" ", "").replace("\n", "")
                            close_price = float(price_text_clean)
                            
                            # Valider
                            if close_price > 0:
                                prices[ticker_text] = close_price
                                ticker_count += 1
                                
                                # Debug: afficher premier exemplaire par table
                                if row_idx == 1:
                                    print(f"         Sample ({num_cols} cols, col {price_col_idx}): {ticker_text} = {close_price}")
                        except (ValueError, AttributeError):
                            pass
                    except Exception:
                        pass
        
        print(f"   ✅ Scraped {ticker_count} prices from {table_count} tables on BRVM")
        
        # Afficher les 5 CORE stocks
        core_tickers = ['SNTS', 'ONTBF', 'ORGT', 'SAFC', 'ABJC']
        print(f"   📈 CORE Stock Prices:")
        for ticker in core_tickers:
            if ticker in prices:
                print(f"      {ticker}: {prices[ticker]:,.0f} FCFA ✅")
            else:
                print(f"      {ticker}: Not found ⚠️")
        
        return prices
        
    except Exception as e:
        print(f"   ❌ Error scraping BRVM: {e}")
        import traceback
        traceback.print_exc()
        return {}


def merge_brvm_prices_with_history(df_historical: pd.DataFrame, brvm_prices: dict, today_date: datetime) -> pd.DataFrame:
    """
    Combine historical data (CSV up to 31/12/2025) avec prices d'aujourd'hui de BRVM
    Ajoute une ligne pour aujourd'hui avec les prix BRVM scraped
    """
    
    if not brvm_prices:
        print("   ⚠️  No BRVM prices available, using last historical date")
        return df_historical
    
    # Créer des rows pour aujourd'hui avec les prix BRVM
    today_rows = []
    for ticker, price in brvm_prices.items():
        today_rows.append({
            'Date': today_date,
            'Code symbole': ticker,
            'Cours moyen': price,
            'ISIN': '',
            'Cours dernier': price,
            'Cours précédent': 0,
            'Plus haut': price,
            'Plus bas': price,
            'Volume': 0
        })
    
    df_today = pd.DataFrame(today_rows)
    
    # Combiner
    df_combined = pd.concat([df_historical, df_today], ignore_index=True)
    
    # Assurer types de données
    df_combined['Date'] = pd.to_datetime(df_combined['Date'])
    
    print(f"   ✅ Merged {len(df_today)} BRVM prices with historical data")
    
    return df_combined


def generate_daily_signals():
    """
    Génère les signaux Z-Score pour aujourd'hui
    Combine les données historiques (CSV) avec prix BRVM en temps réel
    
    Fenêtre Z-Score dynamique:
    - Avant 01/05/2026: 95 jours (évite gap 01/01-31/12/2025)
    - À partir 01/05/2026: 200 jours (données continues)
    """
    
    print("\n" + "="*100)
    print("DAILY SIGNALS GENERATOR - Z-SCORE ANALYSIS")
    print("="*100)
    
    # Déterminer aujourd'hui
    today_date = datetime.now()
    
    # Charger les données historiques du CSV
    print("\nChargement des données historiques...")
    df_all = charge_and_clean_data()
    
    if df_all.empty:
        print("Erreur: Pas de données disponibles.")
        return None
    
    print(f"OK - {len(df_all)} lignes chargées")
    
    # Adapter les types de données
    df_all['Date'] = pd.to_datetime(df_all['Date'])
    latest_historical_date = df_all['Date'].max()
    print(f"Dernier jour historique: {latest_historical_date.strftime('%d/%m/%Y')}")
    
    # Scraper les prix BRVM d'aujourd'hui
    print(f"\nScraping BRVM prices for {today_date.strftime('%d/%m/%Y')}...")
    brvm_prices = fetch_brvm_prices()
    
    # Combiner données historiques + prix BRVM
    print("\nMerging with BRVM data...")
    df_all = merge_brvm_prices_with_history(df_all, brvm_prices, today_date)
    
    # Récupérer la dernière date (aujourd'hui si BRVM a des prix, sinon dernière hist)
    latest_date = df_all['Date'].max()
    print(f"Calcul Z-Score pour: {latest_date.strftime('%d/%m/%Y')}")
    
    # FENÊTRE Z-SCORE DYNAMIQUE
    # Avant 01/05/2026: utiliser 95 jours (données continues, évite gap)
    # À partir 01/05/2026: utiliser 200 jours (données historiquement plus robustes)
    threshold_date = pd.to_datetime('2026-05-01')
    
    if latest_date < threshold_date:
        zscore_window = 95  # Fenêtre courte (données fiables, pas de gap)
        print(f"⚠️  DONNÉES INCOMPLÈTES: Utilisant fenêtre courte (95 jours)")
        print(f"    (Gap 01/01-31/12/2025 identifié, utilisera 95j pour éviter biais)")
    else:
        zscore_window = 200  # Fenêtre long-terme (données continues)
        print(f"✅ DONNÉES CONTINUES: Utilisant fenêtre optimale (200 jours)")
    
    # Filtrer la fenêtre
    cutoff_date = latest_date - pd.Timedelta(days=zscore_window)
    df_recent = df_all[df_all['Date'] >= cutoff_date].copy()
    
    print(f"Calcul Z-Score sur {len(df_recent)} jours ({zscore_window}-day window)...")
    
    # Calculer Z-Score
    df_signals = calculate_zscore(df_recent)
    
    # Générer les signaux
    df_signals = signals_generation(df_signals)
    
    # Filtrer les signaux du dernier jour
    df_today_signals = df_signals[df_signals['Date'] == latest_date].copy()
    
    if df_today_signals.empty:
        print(f"Aucun signal trouvé pour {latest_date.strftime('%d/%m/%Y')}")
        return None
    
    # Nettoyer et formatter
    signals_list = []
    
    for idx, row in df_today_signals.iterrows():
        if pd.isna(row.get('Signal', None)) or row['Signal'] == 'HOLD':
            continue
        
        ticker = row['Code symbole']
        signal = row['Signal']
        z_score = row.get('Z_Score', 0)
        price = row.get('Cours moyen', 0)
        
        # Paramètres depuis config (adaptés à ton capital réel)
        tp_pct = TAKE_PROFIT_PCT  # 8% take-profit (configurable)
        sl_pct = STOP_LOSS_PCT    # 5% stop-loss (configurable)
        
        if signal == 'Strong Buy':
            tp = price * (1 + tp_pct)
            sl = price * (1 - sl_pct)
            # Position sizing: 8% max du capital (Phase 1 robustesse)
            max_position_value = int(REAL_PORTFOLIO_CAPITAL * MAX_POSITION_PCT)
            qty = int(max_position_value / price) if price > 0 else 0
            action = 'BUY'
        elif signal == 'Buy':
            tp = price * (1 + tp_pct)
            sl = price * (1 - sl_pct)
            # Position sizing: 4% pour buy normal (moitié de max)
            max_position_value = int(REAL_PORTFOLIO_CAPITAL * MAX_POSITION_PCT / 2)
            qty = int(max_position_value / price) if price > 0 else 0
            action = 'BUY'
        elif signal == 'Strong Sell' or signal == 'Sell':
            action = 'SELL'
            qty = 0
            tp = 0
            sl = 0
        else:
            continue
        
        signals_list.append({
            'Date': latest_date.strftime('%d/%m/%Y'),
            'Ticker': ticker,
            'Signal': signal,
            'Z_Score': round(z_score, 2),
            'Price': round(price, 0),
            'Action': action,
            'Qty': qty,
            'TP_Price': round(tp, 0) if tp > 0 else '',
            'SL_Price': round(sl, 0) if sl > 0 else '',
            'TP_Pct': f"{tp_pct*100:.1f}%",
            'SL_Pct': f"{sl_pct*100:.1f}%"
        })
    
    if not signals_list:
        print(f"\nAucun signal d'achat/vente pour {latest_date.strftime('%d/%m/%Y')}")
        return None
    
    df_signals_export = pd.DataFrame(signals_list)
    
    # Afficher les résultats
    print(f"\n" + "="*100)
    print(f"SIGNALS FOR {latest_date.strftime('%d/%m/%Y')} ({len(df_signals_export)} signals)")
    print("="*100)
    print(df_signals_export.to_string(index=False))
    
    # Sauvegarder
    output_dir = os.path.join(str(PROJECT_ROOT), 'output', 'signals')
    os.makedirs(output_dir, exist_ok=True)
    signals_file = os.path.join(output_dir, f"signals_{latest_date.strftime('%Y%m%d')}.csv")
    df_signals_export.to_csv(signals_file, index=False)
    print(f"\n✅ Signals sauvegardés: {signals_file}")
    
    # Résumé par type de signal
    print(f"\n📊 SIGNAL SUMMARY:")
    buy_signals = len(df_signals_export[df_signals_export['Action'] == 'BUY'])
    sell_signals = len(df_signals_export[df_signals_export['Action'] == 'SELL'])
    print(f"   BUY Signals: {buy_signals}")
    print(f"   SELL Signals: {sell_signals}")
    
    # Recommandations
    print(f"\n💡 RECOMMENDATIONS:")
    if buy_signals > 0:
        print(f"   → {buy_signals} opportunités d'achat identifiées")
        strong_buys = len(df_signals_export[df_signals_export['Signal'] == 'Strong Buy'])
        if strong_buys > 0:
            print(f"   → {strong_buys} STRONG BUY signals (haute priorité)")
    
    if sell_signals > 0:
        print(f"   → {sell_signals} signals de vente (fermer positions)")
    
    if buy_signals == 0 and sell_signals == 0:
        print(f"   → Marché neutre, attendre d'autres signaux")
    
    print("="*100 + "\n")
    
    return df_signals_export


def main():
    """Main execution"""
    try:
        generate_daily_signals()
    except Exception as e:
        print(f"\nERREUR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()

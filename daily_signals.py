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

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))
sys.path.insert(0, os.path.dirname(__file__))

from backtester import charge_and_clean_data
from zscore_calculator import calculate_zscore, signals_generation
from config import (
    REAL_SATELLITE_CAPITAL,
    ZSCORE_STRONG_BUY,
    ZSCORE_BUY,
    ZSCORE_SELL,
    ZSCORE_STRONG_SELL,
    TAKE_PROFIT_PCT,
    STOP_LOSS_PCT
)

# URL BRVM pour scraping
BRVM_URL = "https://www.brvm.org"

# URL BRVM pour scraping
BRVM_URL = "https://www.brvm.org"


def fetch_brvm_prices() -> dict:
    """
    Scrape les prix courants de BRVM (tous les titres)
    Structure du tableau:
      Col 0: Volume
      Col 1: Cours moyen (fermeture) ← CELLE QU'ON VEUT
      Col 2-4: Autres prix
      Col 5: Variation %
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
        
        # Chercher toutes les tables
        tables = soup.find_all("table")
        
        for table in tables:
            rows = table.find_all("tr")
            for row in rows:
                cells = row.find_all(["td", "th"])
                if cells and len(cells) >= 3:  # Besoin minimum 3 colonnes
                    try:
                        # Première colonne = ticker
                        ticker_text = cells[0].get_text(strip=True).upper()
                        
                        # Ne traiter que les tickers valides (3-10 caractères)
                        if not (3 <= len(ticker_text) <= 10 and ticker_text.replace('.', '').replace('-', '').isalnum()):
                            continue
                        
                        # **CORRECTION**: Cours moyen est en colonne 1 (index 1), pas 6
                        # Structure BRVM: [Volume] [Cours moyen] [Ouverture] [Précédent] [Variation%]
                        price_text = cells[1].get_text(strip=True)
                        
                        try:
                            # Nettoyer: supprimer espaces, virgules (séparateur décimal français)
                            price_text_clean = price_text.replace(",", ".").replace(" ", "").replace("\n", "")
                            close_price = float(price_text_clean)
                            
                            # Valider: prix doit être > 0
                            if close_price > 0:
                                prices[ticker_text] = close_price
                        except (ValueError, AttributeError):
                            continue
                    except Exception:
                        continue
        
        if prices:
            print(f"   ✅ Scraped {len(prices)} prices from BRVM")
            # Debug: afficher quelques prix
            sample_tickers = ['SNTS', 'ONTBF', 'ORGT', 'SAFC', 'SLBC']
            for ticker in sample_tickers:
                if ticker in prices:
                    print(f"      {ticker}: {prices[ticker]} FCFA")
        else:
            print(f"   ⚠️  No prices found on BRVM")
        
        return prices
        
    except Exception as e:
        print(f"   ❌ Error scraping BRVM: {e}")
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
    
    # Filtrer les 200 derniers jours pour calcul du Z-Score (200-day rolling window)
    cutoff_date = latest_date - pd.Timedelta(days=200)
    df_recent = df_all[df_all['Date'] >= cutoff_date].copy()
    
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
            qty = int(REAL_SATELLITE_CAPITAL / price) if price > 0 else 0  # Capital SATELLITE adapté
            action = 'BUY'
        elif signal == 'Buy':
            tp = price * (1 + tp_pct)
            sl = price * (1 - sl_pct)
            qty = int(REAL_SATELLITE_CAPITAL / price / 2) if price > 0 else 0  # Moitié pour buy normal
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
    output_dir = os.path.join(os.path.dirname(__file__), 'output', 'signals')
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

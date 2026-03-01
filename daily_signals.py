"""
Daily Trading Signals Generator

Génère les signaux Z-Score quotidiens pour le SATELLITE (30%)
Utilisé pour identifier les opportunités d'achat/vente
"""

import sys
import os
from datetime import datetime
import pandas as pd
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from backtester import charge_and_clean_data
from zscore_calculator import calculate_zscore, signals_generation

def generate_daily_signals():
    """
    Génère les signaux Z-Score pour le jour (basé sur dernier prix disponible)
    """
    
    print("\n" + "="*100)
    print("DAILY SIGNALS GENERATOR - Z-SCORE ANALYSIS")
    print("="*100)
    
    # Charger toutes les données
    print("\nChargement des données...")
    df_all = charge_and_clean_data()
    
    if df_all.empty:
        print("Erreur: Pas de données disponibles.")
        return None
    
    print(f"OK - {len(df_all)} lignes chargées")
    
    # Récupérer la dernière date disponible
    df_all['Date'] = pd.to_datetime(df_all['Date'])
    latest_date = df_all['Date'].max()
    print(f"\nDernier jour avec données: {latest_date.strftime('%d/%m/%Y')}")
    
    # Filtrer les 200 derniers jours pour calcul du Z-Score (200-day rolling window)
    cutoff_date = df_all['Date'].max() - pd.Timedelta(days=200)
    df_recent = df_all[df_all['Date'] >= cutoff_date].copy()
    
    print(f"Calcul Z-Score sur {len(df_recent)} jours (200-day window)...")
    
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
        
        # Paramètres par défaut
        tp_pct = 0.05  # 5% take-profit
        sl_pct = 0.08  # 8% stop-loss
        
        if signal == 'Strong Buy':
            tp = price * (1 + tp_pct)
            sl = price * (1 - sl_pct)
            qty = int(3_000_000 / price) if price > 0 else 0  # 3M FCFA pour SATELLITE
            action = 'BUY'
        elif signal == 'Buy':
            tp = price * (1 + tp_pct)
            sl = price * (1 - sl_pct)
            qty = int(3_000_000 / price / 2) if price > 0 else 0  # Moitié pour buy normal
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
    signals_file = f"signals_{latest_date.strftime('%Y%m%d')}.csv"
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

"""
Initialize YTD_2026.csv from Backtest Results

Extrait les valeurs du backtest 2017-2025 et initialise YTD_2026.csv
pour permettre un suivi continu du portefeuille en 2026.
"""

import sys
import os
from datetime import datetime, timedelta
from pathlib import Path
import pandas as pd

# Ajouter src au chemin
PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / 'src'))

from backtester import charge_and_clean_data, calculate_zscore, signals_generation
from zscore_calculator import calculate_zscore, signals_generation

def run_backtest_to_extract_values():
    """
    Exécute le backtest 2017-2025 et retourne les valeurs du 31/12/2025
    """
    
    print("\n" + "="*100)
    print("EXTRACTION VALEURS BACKTEST - INITIALISATION YTD 2026")
    print("="*100)
    
    # Loading data
    print("\nChargement des données historiques 2017-2025...")
    df_all = charge_and_clean_data()
    
    if df_all.empty:
        print("Erreur: Pas de données disponibles.")
        return None
    
    print(f"OK - {len(df_all)} lignes chargées")
    
    # Initialiser - Keep track of CURRENT values (updated each year)
    capital_initial = 10_000_000
    current_core_value = capital_initial * 0.70
    current_satellite_value = capital_initial * 0.30
    
    # Use actual big caps available in BRVM data (2017-2025)
    big_caps = ['SNTS', 'ORGT', 'ONTBF', 'SAFC', 'ABJC']
    df_all = df_all.sort_values('Date')
    df_all['Year'] = df_all['Date'].dt.year
    
    results = []
    
    print("\nExecution backtest 2017-2025...")
    
    # Pour chaque année
    for year in range(2017, 2026):
        df_year = df_all[df_all['Year'] == year].copy()
        
        if df_year.empty:
            continue
        
        # ===== CORE (70%): Big Caps =====
        core_year_return = 0.0
        core_count = 0
        for ticker in big_caps:
            df_ticker = df_year[df_year['Code symbole'] == ticker]
            if len(df_ticker) > 1:
                price_start = df_ticker['Cours moyen'].iloc[0]
                price_end = df_ticker['Cours moyen'].iloc[-1]
                ticker_return = (price_end - price_start) / price_start if price_start > 0 else 0
                core_year_return += ticker_return
                core_count += 1
        
        if core_count > 0:
            core_year_return = core_year_return / core_count
        else:
            core_year_return = 0
        
        # Apply year return + dividends to CURRENT core value
        dividends = current_core_value * 0.08
        current_core_value = current_core_value * (1 + core_year_return) + dividends
        
        # ===== SATELLITE (30%): Z-Score =====
        # Compter les signaux d'achat (Strong Buy + Buy) - simplified version
        if len(df_year) > 200:
            df_year_sat = calculate_zscore(df_year)
            df_year_sat = signals_generation(df_year_sat)
            
            # Count signals without applying full filters (faster)
            buy_signals = len(df_year_sat[df_year_sat['Signal'].isin(['Buy', 'Strong Buy'])])
        else:
            buy_signals = 50  # Default estimate if insufficient data
        
        # Estimé: 1 signal tous les 50 = 1 trade
        # Chaque trade succès = +8% rendement
        satellite_trades_per_year = max(2, buy_signals // 50)
        satellite_year_return = min(0.25, satellite_trades_per_year * 0.08)
        
        # Apply year return + dividend reinvestment to CURRENT satellite value
        current_satellite_value = current_satellite_value * (1 + satellite_year_return) + dividends
        
        # Total
        total_value = current_core_value + current_satellite_value
        
        results.append({
            'Year': year,
            'Core_Value': current_core_value,
            'Satellite_Value': current_satellite_value,
            'Total_Value': total_value,
            'Annual_Return_%': ((total_value / capital_initial) ** (1/(year - 2016)) - 1) * 100,
            'Buy_Signals': buy_signals,
            'Trades_Est': satellite_trades_per_year,
            'Core_YoY_%': core_year_return * 100,
            'Satellite_YoY_%': satellite_year_return * 100
        })
        
        print(f"   {year}: Core={current_core_value:,.0f} + Satellite={current_satellite_value:,.0f} = {total_value:,.0f} FCFA")
    
    if results:
        df_backtest = pd.DataFrame(results)
        
        print(f"\n" + "="*100)
        print(f"BACKTEST SUMMARY 2017-2025:")
        print("="*100)
        
        final_value = df_backtest.iloc[-1]['Total_Value']
        final_core = df_backtest.iloc[-1]['Core_Value']
        final_satellite = df_backtest.iloc[-1]['Satellite_Value']
        total_return_pct = (final_value - capital_initial) / capital_initial * 100
        cagr = ((final_value / capital_initial) ** (1/9) - 1) * 100
        
        print(f"\nFinal (31/12/2025):")
        print(f"   Core Value: {final_core:,.0f} FCFA")
        print(f"   Satellite Value: {final_satellite:,.0f} FCFA")
        print(f"   Total Value: {final_value:,.0f} FCFA")
        print(f"   Total Return: +{total_return_pct:.2f}%")
        print(f"   CAGR (9 yrs): {cagr:.2f}%")
        print("="*100)
        
        return {
            'date': '31/12/2025',
            'core_value': final_core,
            'satellite_value': final_satellite,
            'total_value': final_value,
            'ytd_return_pct': total_return_pct
        }
    else:
        print("Erreur: Aucun résultat pour le backtest.")
        return None


def initialize_ytd_csv(backtest_values):
    """
    Crée YTD_2026.csv initialisé avec les valeurs du backtest
    """
    
    if not backtest_values:
        print("Erreur: Pas de valeurs de backtest.")
        return False
    
    print("\nInitialisation YTD_2026.csv...")
    
    # Créer la première ligne avec les valeurs du 31/12/2025
    initial_row = {
        'Date': backtest_values['date'],
        'Core_Value': int(backtest_values['core_value']),
        'Satellite_Value': int(backtest_values['satellite_value']),
        'Total_Value': int(backtest_values['total_value']),
        'YTD_Return_%': round(backtest_values['ytd_return_pct'], 2),
        'Trades_Count': 0,
        'Status': 'FINAL_2025'
    }
    
    # Créer le DataFrame
    df = pd.DataFrame([initial_row])
    
    # Sauvegarder
    csv_path = 'YTD_2026.csv'
    df.to_csv(csv_path, index=False)
    
    print(f"\nOK - YTD_2026.csv créé")
    print(f"\nContenu initial:")
    print(df.to_string(index=False))
    
    print(f"\n✅ YTD_2026.csv prêt pour suivi 2026")
    print(f"\nProchaines étapes:")
    print(f"  1. À partir de demain (02/03/2026)")
    print(f"  2. Lancer quotidiennement: python daily_market_update.py")
    print(f"  3. YTD_2026.csv s'auto-remplit avec les vraies données BRVM")
    
    return True


def main():
    """Main execution"""
    
    try:
        # Étape 1: Exécuter le backtest
        backtest_values = run_backtest_to_extract_values()
        
        if not backtest_values:
            return
        
        # Étape 2: Initialiser YTD_2026.csv
        success = initialize_ytd_csv(backtest_values)
        
        if success:
            print("\n" + "="*100)
            print("✅ INITIALISATION COMPLETE")
            print("="*100)
    
    except Exception as e:
        print(f"\nERREUR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()

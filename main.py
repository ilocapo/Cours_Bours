#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
MAIN - Lanceur principal pour la stratégie Z-Score BRVM
========================================================

Ce script orchestre:
1. Scan quotidien des opportunités
2. Backtesting de la stratégie
3. Optimisation des paramètres (optionnel)
4. Gestion portefeuille Core-Satellite (optionnel)
"""

import sys
import os

# Ajouter src au chemin pour les imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

# Imports des modules stratégie
from backtester import (
    scan_market_opportunities,
    get_summary,
    run_backtest_single_stock,
    run_backtest_portfolio,
    parameter_grid_search
)
from portfolio_strategy import core_satellite_backtest
from config import OUTPUT_DAILY_REPORTS, OUTPUT_BACKTEST_REPORTS


def main_full_analysis():
    """Exécute le flux complet: scan → backtest → portfolio"""
    
    print("\n" + "="*100)
    print("STRATÉGIE Z-SCORE BRVM - ANALYSE COMPLÈTE")
    print("="*100)
    
    # ====== PHASE 1: SCAN QUOTIDIEN ======
    print("\n🔍 PHASE 1: SCAN DES OPPORTUNITÉS QUOTIDIENNES")
    print("-" * 100)
    get_summary()
    
    # ====== PHASE 2: BACKTEST STRATÉGIE ======
    print("\n\n🔬 PHASE 2: BACKTEST STRATÉGIE (Single Stock)")
    print("-" * 100)
    print("\nTest sur SNTS (Sonatel)...")
    result_snts = run_backtest_single_stock(
        'SNTS',
        capital_initial=1000000,
        verbose=True
    )
    
    # ====== PHASE 3: BACKTEST PORTEFEUILLE ======
    print("\n\n💼 PHASE 3: BACKTEST PORTEFEUILLE DIVERSIFIÉ")
    print("-" * 100)
    portfolio_result = run_backtest_portfolio(
        capital_par_action=200000
    )
    
    print("\n" + "="*100)
    print("✅ ANALYSE COMPLÈTE TERMINÉE")
    print(f"📁 Rapports sauvegardés:")
    print(f"   • Daily reports: {OUTPUT_DAILY_REPORTS}")
    print(f"   • Backtest reports: {OUTPUT_BACKTEST_REPORTS}")
    print("="*100 + "\n")


def main_grid_search():
    """Exécute une optimisation des paramètres pour une action"""
    
    print("\n" + "="*100)
    print("OPTIMISATION PARAMÈTRES - GRID SEARCH")
    print("="*100)
    
    ticker = input("\nEntrez le code de l'action à optimiser (ex: SNTS): ").strip().upper()
    
    if not ticker:
        print("❌ Code invalide.")
        return
    
    print(f"\n🔎 Lancement grid search pour {ticker}...")
    print("   Cela peut prendre 10-20 minutes selon le nombre de combinaisons...\n")
    
    df_results = parameter_grid_search(ticker, capital_initial=1000000)
    
    if df_results is not None:
        print(f"\n✅ Grid search terminé!"
              f"\nRésultats exportés dans: {OUTPUT_BACKTEST_REPORTS}")


def main_core_satellite():
    """Exécute la stratégie Core-Satellite"""
    
    print("\n" + "="*100)
    print("STRATÉGIE CORE-SATELLITE")
    print("="*100)
    
    ticker_core = input("\nEntrez le code de l'action CORE (ex: SNTS): ").strip().upper()
    tickers_satellite = input("Entrez les codes SATELLITES séparés par virgule (ex: ABJC,BICB,CABC): ").strip().upper().split(',')
    tickers_satellite = [t.strip() for t in tickers_satellite if t.strip()]
    
    if not ticker_core or not tickers_satellite:
        print("❌ Codes invalides.")
        return
    
    print(f"\nCore: {ticker_core}")
    print(f"Satellites: {', '.join(tickers_satellite)}")
    
    result = core_satellite_backtest(
        ticker_core,
        tickers_satellite,
        capital_total=1000000,
        capital_core_ratio=0.4
    )
    
    print("\n✅ Stratégie Core-Satellite exécutée!")


def main_quick_backtest():
    """Backtest rapide sur une action avec paramètres personnalisés"""
    
    print("\n" + "="*100)
    print("BACKTEST RAPIDE - PARAMÈTRES PERSONNALISÉS")
    print("="*100)
    
    ticker = input("\nCode de l'action (ex: SNTS): ").strip().upper()
    
    if not ticker:
        print("❌ Code invalide.")
        return
    
    print(f"\nParamètres calibrés BRVM (Entrée = valeurs par défaut):")
    print(f"  ⚠️  Rappel: frais SGI ~1%/sens = ~2% aller-retour")
    print(f"  ⚠️  Rendement médian brut par trade: ~2%. Négociez vos frais!")
    ze_input = input("  Z-Score sortie mean reversion (défaut -0.5): ").strip()
    tp_input = input("  Take Profit % filet max (défaut 10): ").strip()
    sl_input = input("  Stop Loss % filet max (défaut 10): ").strip()
    ts_input = input("  Time-Stop jours filet max (défaut 90): ").strip()
    ml_input = input("  Déclin structurel max jours (défaut 10): ").strip()
    
    params = {
        'zscore_exit_threshold': float(ze_input) if ze_input else -0.5,
        'take_profit_pct': float(tp_input) / 100 if tp_input else 0.10,
        'stop_loss_pct': float(sl_input) / 100 if sl_input else 0.10,
        'time_stop_days': int(ts_input) if ts_input else 90,
        'max_consecutive_low_zscore': int(ml_input) if ml_input else 10
    }
    
    print(f"\n🔬 Backtest {ticker}: Z_exit={params['zscore_exit_threshold']}, TP={params['take_profit_pct']*100}%, SL={params['stop_loss_pct']*100}%, TS={params['time_stop_days']}j, MaxLow={params['max_consecutive_low_zscore']}j")
    
    result = run_backtest_single_stock(ticker, capital_initial=1000000, **params, verbose=True)
    
    if result:
        print(f"\n✅ Backtest terminé!")
        print(f"   Rendement: {result['rendement_algo']:.2f}%")
        print(f"   Sharpe: {result['sharpe_ratio']:.4f}")


def show_menu():
    """Affiche le menu interactif"""
    
    print("\n" + "="*100)
    print("STRATÉGIE Z-SCORE BRVM - MENU PRINCIPAL")
    print("="*100)
    print("\nOptions disponibles:")
    print("  1. Analyse complète (Scan + Backtest + Portfolio)")
    print("  2. Grid search - Optimiser paramètres pour une action")
    print("  3. Core-Satellite - Stratégie portefeuille")
    print("  4. Backtest rapide - Test avec paramètres personnalisés")
    print("  5. Quitter")
    print("\n" + "-"*100)
    
    choice = input("\nChoisissez une option (1-5): ").strip()
    
    if choice == '1':
        main_full_analysis()
    elif choice == '2':
        main_grid_search()
    elif choice == '3':
        main_core_satellite()
    elif choice == '4':
        main_quick_backtest()
    elif choice == '5':
        print("👋 Au revoir!")
        sys.exit(0)
    else:
        print("❌ Option invalide")


if __name__ == "__main__":
    # Mode interactif par défaut
    try:
        show_menu()
    except KeyboardInterrupt:
        print("\n\n⏹️  Arrêt utilisateur")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


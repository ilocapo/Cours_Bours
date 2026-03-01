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
from datetime import datetime

# Ajouter src au chemin pour les imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

# Imports des modules stratégie
from backtester import (
    scan_market_opportunities,
    get_summary,
    run_backtest_single_stock,
    run_backtest_portfolio,
    parameter_grid_search,
    run_daily_market_report,
    portfolio_plan,
    charge_and_clean_data,
    compute_volatility_per_stock
)
from portfolio_strategy import core_satellite_backtest
from config import OUTPUT_DAILY_REPORTS, OUTPUT_BACKTEST_REPORTS
import pandas as pd
from glob import glob


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
    
    print(f"\nParamètres (appuyez sur Entrée pour utiliser les valeurs par défaut):")
    tp_input = input("  Take Profit % (défaut 8): ").strip()
    sl_input = input("  Stop Loss % (défaut 5): ").strip()
    ts_input = input("  Time-Stop jours (défaut 10): ").strip()
    fk_input = input("  Falling-Knife drop % (défaut 8): ").strip()
    
    params = {
        'take_profit_pct': float(tp_input) / 100 if tp_input else 0.08,
        'stop_loss_pct': float(sl_input) / 100 if sl_input else 0.05,
        'time_stop_days': int(ts_input) if ts_input else 10,
        'falling_knife_drop_pct': float(fk_input) / 100 if fk_input else 0.08
    }
    
    print(f"\n🔬 Backtest {ticker} avec paramètres: TP={params['take_profit_pct']*100}%, SL={params['stop_loss_pct']*100}%, TS={params['time_stop_days']}j, FK={params['falling_knife_drop_pct']*100}%")
    
    result = run_backtest_single_stock(ticker, capital_initial=1000000, **params, verbose=True)
    
    if result:
        print(f"\n✅ Backtest terminé!")
        print(f"   Rendement: {result['rendement_algo']:.2f}%")
        print(f"   Sharpe: {result['sharpe_ratio']:.4f}")


def main_daily_report():
    """Génère rapport de marché + recommandations fusionnées (Market Overview Complet)."""
    print("\n" + "="*100)
    print("MARKET OVERVIEW COMPLET (Signal Z-Score + Sharpe Ratio)")
    print("="*100)
    
    # 1. Générer le rapport de marché
    summary = run_daily_market_report(verbose=False)
    
    if summary.empty:
        print("❌ Aucune donnée disponible.")
        return
    
    # 2. Charger toutes les données pour calculer Sharpe et Z-Score
    df_all = charge_and_clean_data()
    if df_all.empty:
        print("❌ Pas de données pour calculer les Sharpe ratios.")
        return
    
    # 3. Calculer Z-Score pour chaque action (dernière date)
    latest_date = df_all['Date'].max()
    
    # 4. Pour chaque action, calculer Sharpe et recommandation
    results = []
    
    for idx, row in summary.iterrows():
        symbol = row['Symbol']
        z_score = row.get('Z_Score', 0.0)  # Utiliser Z-Score déjà calculé correctement
        
        # Filtrer les données pour cette action
        df_ticker = df_all[df_all['Code symbole'] == symbol].copy()
        if len(df_ticker) < 50:
            continue
        
        df_ticker = df_ticker.sort_values('Date')
        
        # Calculer rendement quotidien
        df_ticker['Returns'] = df_ticker['Cours moyen'].pct_change()
        recent = df_ticker['Returns'].dropna().tail(126)
        
        if len(recent) < 20:
            continue
        
        sharpe = (recent.mean() * 252) / (recent.std() * (252 ** 0.5)) if recent.std() > 0 else 0
        signal = row.get('Signal_Filtre', 'Hold')
        
        # LOGIQUE FUSIONNÉE: Signal + Sharpe → Action (INCLUDE ACHAT ET VENTE)
        if signal in ['Strong Buy_FILTERED', 'Strong Buy']:
            if sharpe > 0.5:
                rec = "⭐ STRONG BUY"
                action = "🎯 ACHETER"
            else:
                rec = "⚠️ CAUTION BUY"
                action = "❓ Risqué"
        elif signal in ['Buy_FILTERED', 'Buy']:
            if sharpe > 0.5:
                rec = "✅ BUY"
                action = "🎯 ACHETER"
            else:
                rec = "⏸️ HOLD"
                action = "⏳ ATTENDRE"
        elif signal in ['Strong Sell_FILTERED', 'Strong Sell']:
            if sharpe > 0.5:
                rec = "🔴 STRONG SELL"
                action = "🚨 VENDRE"
            else:
                rec = "⚠️ CAUTION SELL"
                action = "❓ Risqué"
        elif signal in ['Sell_FILTERED', 'Sell']:
            if sharpe > 0.5:
                rec = "📉 SELL"
                action = "⛔ VENDRE"
            else:
                rec = "⏸️ HOLD"
                action = "⏳ ATTENDRE"
        elif signal == 'Hold':
            if sharpe > 0.8:
                rec = "📌 WATCH & BUY"
                action = "👁️ SURVEILLER"
            elif sharpe > 0.5:
                rec = "⏸️ HOLD"
                action = "⏳ ATTENDRE"
            else:
                rec = "⛔ AVOID"
                action = "❌ IGNORER"
        else:
            rec = "⏸️ HOLD"
            action = "⏳ ATTENDRE"
        
        results.append({
            'Symbol': symbol,
            'Z-Score': f"{z_score:.2f}",
            'Volatility': f"{row.get('Volatility', 0):.1f}%",
            'Signal': signal,
            'Sharpe': f"{sharpe:.2f}",
            'Recommendation': rec,
            'Action': action
        })
    
    if results:
        df_overview = pd.DataFrame(results)
        df_overview['Sharpe_Num'] = df_overview['Sharpe'].astype(float)
        df_overview = df_overview.sort_values('Sharpe_Num', ascending=False)
        df_overview = df_overview.drop('Sharpe_Num', axis=1)
        
        print(f"\n📊 OVERVIEW MARCHÉ ({len(df_overview)} actions analysées):")
        print("="*100)
        print(df_overview[['Symbol', 'Z-Score', 'Volatility', 'Signal', 'Sharpe', 'Recommendation', 'Action']].to_string(index=False))
        print("="*100)
        
        strong_buy = len(df_overview[df_overview['Recommendation'].str.contains('STRONG BUY')])
        buy = len(df_overview[df_overview['Recommendation'].str.contains('✅ BUY')])
        watch = len(df_overview[df_overview['Recommendation'].str.contains('WATCH')])
        hold = len(df_overview[df_overview['Recommendation'].str.contains('HOLD')])
        sell = len(df_overview[df_overview['Recommendation'].str.contains('📉 SELL')])
        strong_sell = len(df_overview[df_overview['Recommendation'].str.contains('STRONG SELL')])
        
        print(f"\n📈 STATISTIQUES:")
        print(f"   🎯 ACHETER IMMÉDIAT: {strong_buy} actions (STRONG BUY)")
        print(f"   🎯 ACHETER: {buy} actions (BUY)")
        print(f"   👁️ À SURVEILLER: {watch} actions (WATCH & BUY)")
        print(f"   ⏳ À ATTENDRE: {hold} actions (HOLD)")
        print(f"   ⛔ À VENDRE: {sell} actions (SELL)")
        print(f"   🚨 À VENDRE IMMÉDIAT: {strong_sell} actions (STRONG SELL)")
        
        print(f"\n🎯 GUIDE DES Z-SCORES:")
        print(f"   Z < -3.0 : ⭐⭐⭐ Chance d'achat TRÈS forte (survendue)")
        print(f"   Z < -2.0 : ⭐⭐ Chance d'achat forte")
        print(f"   Z < -1.0 : ⭐ Légèrement survendue")
        print(f"   -1.0 < Z < 1.0 : Neutre")
        print(f"   Z > 1.0 : Légèrement surachetée")
        print(f"   Z > 2.0 : ⛔ Chance de vente forte")
        print(f"   Z > 3.0 : ⛔⛔⛔ Chance de vente TRÈS forte")
        
        print(f"\n🎯 GUIDE DES ACTIONS:")
        print(f"   ⭐ STRONG BUY   → Z < -3.0 + Sharpe OK → ACHETER immédiatement")
        print(f"   ✅ BUY          → Z < -2.0 + Sharpe OK → ACHETER")
        print(f"   📌 WATCH & BUY  → Hold + Sharpe excellent (>0.8) → Attendre signal Buy")
        print(f"   ⏸️ HOLD         → Hold + Sharpe faible → Attendre ou Ignorer")
        print(f"   ⛔ AVOID        → Hold + Sharpe très faible → IGNORER")
        print(f"   📉 SELL         → Z > 2.0 + Sharpe OK → VENDRE")
        print(f"   🔴 STRONG SELL  → Z > 3.0 + Sharpe OK → VENDRE IMMÉDIATEMENT")
        print(f"   ⚠️ CAUTION      → Signal fort mais Sharpe faible → Risqué")
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        export_file = os.path.join(OUTPUT_DAILY_REPORTS, f"market_overview_{timestamp}.csv")
        df_overview.to_csv(export_file, index=False)
        print(f"\n✅ Overview exporté: {export_file}")
        
        return df_overview
    else:
        print("❌ Aucune action analysée.")
        return None


def main_portfolio_calc():
    """Calcule les paramètres d'un ordre en fonction du capital et des pourcentages."""
    print("\n" + "="*100)
    print("CALCUL PORTEFEUILLE / ORDRE")
    print("="*100)
    try:
        cap = float(input("Capital alloué (FCFA): ").strip())
        price = float(input("Prix marché unitaire: ").strip())
        fee = float(input("Frais SGI (pourcentage, ex 1 pour 1%): ").strip())/100
        sl = float(input("Stop-Loss % (ex 5 pour 5%): ").strip())/100
        tp = float(input("Take-Profit % (ex 10 pour 10%): ").strip())/100
    except Exception as e:
        print("❌ Entrée invalide.")
        return
    df_calc = portfolio_plan(cap, price, fee, sl, tp)
    print(df_calc.to_markdown(index=False))
    out = os.path.join(OUTPUT_BACKTEST_REPORTS, f"portfolio_calc_{datetime.now().strftime('%Y%m%d')}.csv")
    df_calc.to_csv(out, index=False)
    print(f"\n✅ Exporté vers {out}")


def main_portfolio_recommendations():
    """Génère recommandations d'achat basées sur Sharpe ratio depuis le dernier daily report."""
    
    print("\n" + "="*100)
    print("RECOMMANDATIONS PORTEFEUILLE - CLASSEMENT PAR SHARPE RATIO")
    print("="*100)
    
    # 1. Trouver le dernier fichier market_summary_*.csv
    pattern = os.path.join(OUTPUT_DAILY_REPORTS, "market_summary_*.csv")
    files = sorted(glob(pattern))
    
    if not files:
        print("❌ Aucun rapport de marché trouvé. Lancez l'option 5 d'abord.")
        return
    
    latest_report = files[-1]
    print(f"\n📂 Fichier chargé: {os.path.basename(latest_report)}")
    
    # 2. Charger les données de marché
    try:
        df_report = pd.read_csv(latest_report)
    except Exception as e:
        print(f"❌ Erreur de lecture: {e}")
        return
    
    if df_report.empty or 'Symbol' not in df_report.columns:
        print("❌ Format du fichier invalide.")
        return
    
    # FILTRE: Garder UNIQUEMENT les actions (pas obligations/indices)
    from backtester import classify_ticker_type
    df_report['Type'] = df_report['Symbol'].apply(classify_ticker_type)
    df_report = df_report[df_report['Type'] == 'Action'].copy()
    
    if df_report.empty:
        print("❌ Aucune action trouvée dans le rapport.")
        return
    
    print(f"📊 Actions analysées: {len(df_report)}")
    
    # 3. Charger toutes les données pour calculer Sharpe
    df_all = charge_and_clean_data()
    if df_all.empty:
        print("❌ Pas de données pour calculer les Sharpe ratios.")
        return
    
    # 4. Pour chaque action du rapport, calculer son Sharpe ratio
    recommendations = []
    
    for idx, row in df_report.iterrows():
        symbol = row['Symbol']
        
        # Filtrer les données pour cette action
        df_ticker = df_all[df_all['Code symbole'] == symbol].copy()
        if len(df_ticker) < 50:
            continue  # Pas assez de données
        
        # Calculer rendement quotidien
        df_ticker = df_ticker.sort_values('Date')
        df_ticker['Returns'] = df_ticker['Cours moyen'].pct_change()
        
        # Sharpe ratio sur les 126 derniers jours (6 mois de trading)
        recent = df_ticker['Returns'].dropna().tail(126)
        if len(recent) < 20:
            continue
        
        sharpe = (recent.mean() * 252) / (recent.std() * (252 ** 0.5)) if recent.std() > 0 else 0
        
        # Déterminer recommandation
        if sharpe > 1.0:
            rec = "⭐ STRONG BUY"
        elif sharpe > 0.5:
            rec = "✅ BUY"
        elif sharpe > 0.0:
            rec = "⏸️ HOLD"
        else:
            rec = "⛔ AVOID"
        
        recommendations.append({
            'Rank': 0,  # À remplir après tri
            'Symbol': symbol,
            'Sharpe': sharpe,
            'Volatility': row.get('Volatility', 0),
            'Signal': row.get('Signal_Filtre', 'N/A'),
            'Price': row.get('Price', 0),
            'Recommendation': rec
        })
    
    if not recommendations:
        print("❌ Aucune action n'a pu être analysée.")
        return
    
    # 5. Créer DataFrame et trier par Sharpe (décroissant)
    df_recs = pd.DataFrame(recommendations)
    df_recs = df_recs.sort_values('Sharpe', ascending=False).reset_index(drop=True)
    df_recs['Rank'] = df_recs.index + 1
    
    # Réorganiser colonnes
    df_recs = df_recs[['Rank', 'Symbol', 'Sharpe', 'Volatility', 'Signal', 'Price', 'Recommendation']]
    
    # 6. Afficher les résultats
    print(f"\n📊 CLASSEMENT DES ACTIONS ({len(df_recs)} analysées):")
    print("="*100)
    print(df_recs.to_string(index=False))
    print("="*100)
    
    print(f"\n🎯 GUIDE D'INTERPRÉTATION:")
    print(f"   Sharpe > 1.0   : Excellent  → ⭐ STRONG BUY")
    print(f"   Sharpe 0.5-1.0 : Bon       → ✅ BUY")
    print(f"   Sharpe 0.0-0.5 : Faible    → ⏸️ HOLD")
    print(f"   Sharpe < 0.0   : Négatif   → ⛔ AVOID")
    
    # 7. Exporter en CSV
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    export_file = os.path.join(OUTPUT_DAILY_REPORTS, f"portfolio_recommendations_{timestamp}.csv")
    df_recs.to_csv(export_file, index=False)
    print(f"\n✅ Recommandations exportées: {export_file}")
    
    return df_recs


def main_portfolio_calc():
    """Calcule les paramètres d'un ordre en fonction du capital et des pourcentages."""
    print("\n" + "="*100)
    print("CALCUL PORTEFEUILLE / ORDRE")
    print("="*100)
    try:
        cap = float(input("Capital alloué (FCFA): ").strip())
        price = float(input("Prix marché unitaire: ").strip())
        fee = float(input("Frais SGI (pourcentage, ex 1 pour 1%): ").strip())/100
        sl = float(input("Stop-Loss % (ex 5 pour 5%): ").strip())/100
        tp = float(input("Take-Profit % (ex 10 pour 10%): ").strip())/100
    except Exception as e:
        print("❌ Entrée invalide.")
        return
    df_calc = portfolio_plan(cap, price, fee, sl, tp)
    print(df_calc.to_markdown(index=False))
    out = os.path.join(OUTPUT_BACKTEST_REPORTS, f"portfolio_calc_{datetime.now().strftime('%Y%m%d')}.csv")
    df_calc.to_csv(out, index=False)
    print(f"\n✅ Exporté vers {out}")


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
    print("  5. Market Overview Complet (Signal Z-Score + Sharpe Ratio)")
    print("  6. Calcul ordre/portefeuille")
    print("  7. Quitter")
    print("\n" + "-"*100)
    
    choice = input("\nChoisissez une option (1-7): ").strip()
    
    if choice == '1':
        main_full_analysis()
    elif choice == '2':
        main_grid_search()
    elif choice == '3':
        main_core_satellite()
    elif choice == '4':
        main_quick_backtest()
    elif choice == '5':
        main_daily_report()
    elif choice == '6':
        main_portfolio_calc()
    elif choice == '7':
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


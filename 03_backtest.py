# -*- coding: utf-8 -*-
import pandas as pd
from datetime import datetime, timedelta
import sys

# Configurer l'encodage UTF-8 pour la sortie sur Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import importlib.util

# Charger le module 02_zscore.py dynamiquement
spec = importlib.util.spec_from_file_location("zscore_module", "./02_zscore.py")
zscore_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(zscore_module)

charge_and_clean_data = zscore_module.charge_and_clean_data
calculate_zscore = zscore_module.calculate_zscore
signals_generation = zscore_module.signals_generation
add_filters = zscore_module.add_filters

def scan_market_opportunities(top_n=20):
    """
    Scanne le marché quotidiennement pour identifier les actions avec du potentiel
    en fonction des signaux du Z-score.
    
    Args:
        top_n (int): Nombre maximum d'opportunités à afficher. Par défaut 20.
        
    Returns:
        dict: Dictionnaire contenant les signaux d'achat, de vente et watchlist.
    """
    
    print("=" * 100)
    print(f"SCAN DE MARCHÉ - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 100)
    
    # 1. Charger et nettoyer les données
    print("\n📊 Chargement des données...")
    df = charge_and_clean_data()
    
    if df.empty:
        print("❌ Erreur: Pas de données disponibles.")
        return {}
    
    # 2. Obtenir la dernière date disponible dans les données
    latest_date = df['Date'].max()
    print(f"✅ Dernières données disponibles: {latest_date}")
    
    # 3. Calculer les Z-scores
    print("\n📈 Calcul des Z-scores...")
    df = calculate_zscore(df)
    
    # 4. Générer les signaux
    print("🎯 Génération des signaux...")
    df = signals_generation(df)
    
    # 5. Ajouter les filtres additionnels (volatilité, volume, tendance)
    print("🔍 Application des filtres (volatilité, volume, tendance)...")
    df = add_filters(df)
    
    # 6. Filtrer les données de la dernière date
    df_latest = df[df['Date'] == latest_date].copy()
    
    # 7. Organiser les opportunités par catégorie (utiliser Signal_Filtre)
    strong_buy_filtered = df_latest[df_latest['Signal_Filtre'] == 'Strong Buy_FILTERED'].sort_values('Z_Score')
    buy_filtered = df_latest[df_latest['Signal_Filtre'] == 'Buy_FILTERED'].sort_values('Z_Score')
    
    # Signaux non filtrés pour référence
    strong_buy_signals = df_latest[df_latest['Signal'] == 'Strong Buy'].sort_values('Z_Score')
    buy_signals = df_latest[df_latest['Signal'] == 'Buy'].sort_values('Z_Score')
    
    watchlist = df_latest[df_latest['Watchlist'] == 'Yes'].sort_values('Z_Score')
    
    strong_sell_filtered = df_latest[df_latest['Signal_Filtre'] == 'Strong Sell_FILTERED'].sort_values('Z_Score', ascending=False)
    sell_filtered = df_latest[df_latest['Signal_Filtre'] == 'Sell_FILTERED'].sort_values('Z_Score', ascending=False)
    
    strong_sell_signals = df_latest[df_latest['Signal'] == 'Strong Sell'].sort_values('Z_Score', ascending=False)
    sell_signals = df_latest[df_latest['Signal'] == 'Sell'].sort_values('Z_Score', ascending=False)
    
    # 8. Afficher les résultats
    print("\n" + "=" * 100)
    print("🚀 OPPORTUNITÉS D'ACHAT FORTES VALIDÉES (Z<=−3.0 + Filtres)")
    print("=" * 100)
    if not strong_buy_filtered.empty:
        display_opportunities(strong_buy_filtered.head(top_n))
    else:
        print("⚠️  Aucune opportunité d'achat forte validée aujourd'hui")
        if not strong_buy_signals.empty:
            print(f"   ({len(strong_buy_signals)} détectée(s) mais échouée(s) les filtres)")
    
    print("\n" + "=" * 100)
    print("💰 SIGNAUX D'ACHAT VALIDÉS (Z<=-2.0 + Filtres)")
    print("=" * 100)
    if not buy_filtered.empty:
        display_opportunities(buy_filtered.head(top_n))
    else:
        print("⚠️  Aucun signal d'achat validé aujourd'hui")
        if not buy_signals.empty:
            print(f"   ({len(buy_signals)} détecté(s) mais échoué(s) les filtres)")
    
    print("\n" + "=" * 100)
    print("👁️  WATCHLIST - SOUS SURVEILLANCE (Z-Score <= -1.0)")
    print("=" * 100)
    if not watchlist.empty:
        display_opportunities(watchlist.head(top_n))
    else:
        print("⚠️  Aucune action sous surveillance aujourd'hui")
    
    print("\n" + "=" * 100)
    print("📉 SIGNAUX DE VENTE VALIDÉS (Z>=2.0 + Filtres)")
    print("=" * 100)
    if not sell_filtered.empty:
        display_opportunities(sell_filtered.head(top_n))
    else:
        print("ℹ️  Aucun signal de vente validé aujourd'hui")
        if not sell_signals.empty:
            print(f"   ({len(sell_signals)} détecté(s) mais échoué(s) les filtres)")
    
    print("\n" + "=" * 100)
    print("⚠️  SIGNAUX DE VENTE FORTS VALIDÉS (Z>=3.0 + Filtres)")
    print("=" * 100)
    if not strong_sell_filtered.empty:
        display_opportunities(strong_sell_filtered.head(top_n))
    else:
        print("ℹ️  Aucun signal de vente fort validé aujourd'hui")
        if not strong_sell_signals.empty:
            print(f"   ({len(strong_sell_signals)} détecté(s) mais échoué(s) les filtres)")
    
    # 9. Exporter les résultats dans un fichier CSV
    export_daily_report(
        latest_date,
        strong_buy_filtered,
        buy_filtered,
        watchlist,
        sell_filtered,
        strong_sell_filtered
    )
    
    # 10. Retourner un résumé
    return {
        'strong_buy': len(strong_buy_filtered),
        'buy': len(buy_filtered),
        'watchlist': len(watchlist),
        'sell': len(sell_filtered),
        'strong_sell': len(strong_sell_filtered),
        'strong_buy_detected': len(strong_buy_signals),
        'buy_detected': len(buy_signals),
        'sell_detected': len(sell_signals),
        'strong_sell_detected': len(strong_sell_signals),
        'date': latest_date,
        'total_stocks': len(df_latest)
    }


def display_opportunities(df_signals):
    """
    Affiche les opportunités de manière formatée avec les filtres.
    
    Args:
        df_signals (pd.DataFrame): DataFrame contenant les signaux à afficher.
    """
    
    for idx, row in df_signals.iterrows():
        z_score = row.get('Z_Score', 'N/A')
        symbol = row.get('Code symbole', 'Unknown')
        price = row.get('Cours moyen', 'N/A')
        signal = row.get('Signal', 'N/A')
        signal_filtre = row.get('Signal_Filtre', 'N/A')
        volatilite = row.get('Volatilite_Ann', 'N/A')
        tendance_baiss = row.get('Tendance_Baissiere', False)
        tendance_hauss = row.get('Tendance_Haussiere', False)
        
        # Formater le Z-Score avec couleur conceptuelle
        if pd.isna(z_score):
            z_score_str = "En attente"
        else:
            z_score_str = f"{z_score:.2f}"
        
        # Formater la volatilité
        if pd.isna(volatilite):
            vol_str = "N/A"
        else:
            vol_str = f"{volatilite:.1f}%"
        
        # Indicateur de tendance
        tendance = ""
        if tendance_baiss:
            tendance = "📉 BAISSIER"
        elif tendance_hauss:
            tendance = "📈 HAUSSIER"
        else:
            tendance = "〰️  NEUTRE"
        
        print(f"  • {symbol:10} | Prix: {price:10.2f} | Z: {z_score_str:8} | Vol: {vol_str:8} | {tendance:15} | ✅ {signal_filtre}")


def export_daily_report(latest_date, strong_buy, buy, watchlist, sell, strong_sell):
    """
    Exporte un rapport quotidien en CSV pour suivi et analyse.
    
    Args:
        latest_date: Date des dernières données
        strong_buy, buy, watchlist, sell, strong_sell: DataFrames des signaux
    """
    
    timestamp = datetime.now().strftime('%Y%m%d')
    filename = f"daily_report_{timestamp}.csv"
    
    # Créer un DataFrame avec tous les signaux importants
    report_data = []
    
    for df, signal_type in [
        (strong_buy, 'Strong Buy'),
        (buy, 'Buy'),
        (watchlist, 'Watchlist'),
        (sell, 'Sell'),
        (strong_sell, 'Strong Sell')
    ]:
        for idx, row in df.iterrows():
            report_data.append({
                'Date': latest_date,
                'Symbol': row.get('Code symbole', 'Unknown'),
                'Prix': row.get('Cours moyen', None),
                'Z_Score': row.get('Z_Score', None),
                'Moyenne_Mobile': row.get('Moyenne_Mobile', None),
                'Ecart_Type': row.get('Ecart_Type', None),
                'Volatilite_Ann': row.get('Volatilite_Ann', None),
                'Tendance_Baissiere': row.get('Tendance_Baissiere', None),
                'Tendance_Haussiere': row.get('Tendance_Haussiere', None),
                'Signal': signal_type,
                'Signal_Filtre': row.get('Signal_Filtre', signal_type)
            })
    
    if report_data:
        report_df = pd.DataFrame(report_data)
        report_df.to_csv(filename, index=False)
        print(f"\n✅ Rapport quotidien exporté: {filename}")
    else:
        print(f"\n⚠️  Aucun signal généré pour exporter le rapport.")


def get_summary():
    """
    Retourne un résumé des statistiques du scan.
    """
    results = scan_market_opportunities()
    
    print("\n" + "=" * 100)
    print("📊 RÉSUMÉ DU SCAN")
    print("=" * 100)
    print(f"Date du scan: {results.get('date', 'N/A')}")
    print(f"Total d'actions analysées: {results.get('total_stocks', 0)}")
    
    print(f"\n🔍 SIGNAUX DÉTECTÉS (avant filtres):")
    print(f"  • Opportunités d'achat fortes (Z ≤ -3.0): {results.get('strong_buy_detected', 0)}")
    print(f"  • Signaux d'achat (Z ≤ -2.0): {results.get('buy_detected', 0)}")
    print(f"  • Signaux de vente (Z ≥ 2.0): {results.get('sell_detected', 0)}")
    print(f"  • Signaux de vente forts (Z ≥ 3.0): {results.get('strong_sell_detected', 0)}")
    
    print(f"\n✅ SIGNAUX VALIDÉS (après filtres vol/vol/tendance):")
    print(f"  • Opportunités d'achat fortes validées: {results.get('strong_buy', 0)}")
    print(f"  • Signaux d'achat validés: {results.get('buy', 0)}")
    print(f"  • Actions sous surveillance: {results.get('watchlist', 0)}")
    print(f"  • Signaux de vente validés: {results.get('sell', 0)}")
    print(f"  • Signaux de vente forts validés: {results.get('strong_sell', 0)}")
    
    print("=" * 100)
    
    return results


# ==========================================
# 💰 MODULE DE BACKTEST : STRATÉGIE Z-SCORE
# ==========================================

def run_backtest_single_stock(ticker, capital_initial=1000000, frais_transaction=0.01, fenetre_zscore=200):
    """
    Effectue un backtest sur une action spécifique avec la stratégie Z-score.
    Compare la performance avec le Buy & Hold et le taux sans risque (6.5% UEMOA).
    
    Args:
        ticker (str): Code symbole (ex: 'SNTS')
        capital_initial (float): Capital de départ en FCFA (défaut 1M)
        frais_transaction (float): Frais SGI par transaction (défaut 1%)
        fenetre_zscore (int): Fenêtre de calcul du Z-score (défaut 200 jours)
        
    Returns:
        dict: Résultats du backtest avec statistiques de performance
    """
    
    print("\n" + "=" * 80)
    print(f"🔄 BACKTEST STRATÉGIE Z-SCORE : {ticker}")
    print("=" * 80)
    
    # Charger les données
    df = charge_and_clean_data()
    
    if df.empty:
        print("❌ Erreur: Pas de données disponibles.")
        return {}
    
    # Filtrer pour l'action spécifiée
    df_stock = df[df['Code symbole'] == ticker].copy()
    
    if df_stock.empty:
        print(f"❌ Erreur: Action {ticker} non trouvée.")
        return {}
    
    # Trier par date (la conversion est déjà faite dans charge_and_clean_data())
    df_stock = df_stock.sort_values(by='Date').reset_index(drop=True)
    
    if len(df_stock) < fenetre_zscore:
        print(f"⚠️  Pas assez d'historique pour {ticker} (besoin de {fenetre_zscore} jours).")
        return {}
    
    # Calcul des Z-scores
    df_stock['Moyenne_Mobile'] = df_stock['Cours moyen'].rolling(
        window=fenetre_zscore, min_periods=50
    ).mean()
    df_stock['Ecart_Type'] = df_stock['Cours moyen'].rolling(
        window=fenetre_zscore, min_periods=50
    ).std()
    df_stock['Z_Score'] = (df_stock['Cours moyen'] - df_stock['Moyenne_Mobile']) / df_stock['Ecart_Type']
    
    # Générer les signaux et appliquer les filtres
    df_stock = signals_generation(df_stock)
    df_stock = add_filters(df_stock)
    
    # Logique de trading avec signaux filtrés
    df_stock['Signal'] = 0
    # Utiliser les signaux filtrés pour les décisions de trading
    df_stock.loc[df_stock['Signal_Filtre'].isin(['Buy_FILTERED', 'Strong Buy_FILTERED']), 'Signal'] = 1   # Achat
    df_stock.loc[df_stock['Signal_Filtre'].isin(['Sell_FILTERED', 'Strong Sell_FILTERED']), 'Signal'] = -1   # Vente
    
    # Position (FFill = rester en position jusqu'au signal de vente)
    # Remplacer les 0 par la dernière position non-zéro (forward fill)
    df_stock['Position'] = df_stock['Signal'].replace(0, pd.NA).ffill().fillna(0)
    df_stock.loc[df_stock['Signal'] == -1, 'Position'] = 0
    
    # Rendements
    df_stock['Rendement_Action'] = df_stock['Cours moyen'].pct_change()
    df_stock['Rendement_Algo'] = df_stock['Position'].shift(1) * df_stock['Rendement_Action']
    
    # Frais de transaction
    df_stock['Trade_Effectue'] = df_stock['Position'].diff().abs()
    df_stock.loc[df_stock['Trade_Effectue'] == 1, 'Rendement_Algo'] -= frais_transaction
    
    # Évolution du capital
    df_stock['Capital_Algo'] = capital_initial * (1 + df_stock['Rendement_Algo']).cumprod()
    df_stock['Capital_BuyHold'] = capital_initial * (1 + df_stock['Rendement_Action']).cumprod()
    
    # Calcul du taux sans risque (6.5% annuel / 252 jours de trading)
    taux_sans_risque_quotidien = (1 + 0.065) ** (1/252) - 1
    df_stock['Rendement_SafeRate'] = taux_sans_risque_quotidien
    df_stock['Capital_SafeRate'] = capital_initial * (1 + df_stock['Rendement_SafeRate']).cumprod()
    
    # Bilan
    capital_final_algo = df_stock['Capital_Algo'].dropna().iloc[-1]
    capital_final_bh = df_stock['Capital_BuyHold'].dropna().iloc[-1]
    capital_final_safe = df_stock['Capital_SafeRate'].dropna().iloc[-1]
    
    nombre_trades = df_stock['Trade_Effectue'].sum()
    rendement_net_algo = ((capital_final_algo - capital_initial) / capital_initial) * 100
    rendement_net_bh = ((capital_final_bh - capital_initial) / capital_initial) * 100
    rendement_net_safe = ((capital_final_safe - capital_initial) / capital_initial) * 100
    
    # Calcul de volatilité et Sharpe ratio
    volatilite_algo = (df_stock['Rendement_Algo'].dropna().std()) * (252 ** 0.5) * 100
    sharpe_ratio_algo = (rendement_net_algo - rendement_net_safe) / volatilite_algo if volatilite_algo > 0 else 0
    
    # Affichage des résultats
    print(f"\n📅 Période: {df_stock['Date'].iloc[0]} → {df_stock['Date'].iloc[-1]}")
    print(f"📊 Nombre de jours: {len(df_stock)}")
    print(f"🔔 Nombre d'ordres: {int(nombre_trades)}")
    
    print("\n" + "-" * 80)
    print("💹 RÉSULTATS FINANCIERS")
    print("-" * 80)
    print(f"Capital Initial           : {capital_initial:>15,.0f} FCFA")
    print(f"Capital Final (Z-Score)   : {capital_final_algo:>15,.0f} FCFA  ({rendement_net_algo:>6.2f}%)")
    print(f"Capital Final (Buy & Hold): {capital_final_bh:>15,.0f} FCFA  ({rendement_net_bh:>6.2f}%)")
    print(f"Capital Final (Taux 6.5%) : {capital_final_safe:>15,.0f} FCFA  ({rendement_net_safe:>6.2f}%)")
    
    print("\n" + "-" * 80)
    print("🎯 ANALYSE DE PERFORMANCE")
    print("-" * 80)
    surperformance = rendement_net_algo - rendement_net_bh
    ecart_taux_safe = rendement_net_algo - rendement_net_safe
    
    if surperformance > 0:
        print(f"✅ Surperformance vs Buy & Hold : +{surperformance:.2f}%")
    else:
        print(f"❌ Sous-performance vs Buy & Hold : {surperformance:.2f}%")
    
    if ecart_taux_safe > 0:
        print(f"✅ Surperformance vs Taux 6.5%  : +{ecart_taux_safe:.2f}%")
    else:
        print(f"⚠️  Sous-performance vs Taux 6.5%  : {ecart_taux_safe:.2f}%")
    
    print(f"📈 Volatilité Annualisée    : {volatilite_algo:.2f}%")
    print(f"📊 Ratio de Sharpe           : {sharpe_ratio_algo:.4f}")
    
    # Exporter le rapport détaillé
    timestamp = datetime.now().strftime('%Y%m%d')
    export_file = f"backtest_report_{ticker}_{timestamp}.csv"
    columns_export = [
        'Date', 'Code symbole', 'Cours moyen', 'Z_Score', 'Signal',
        'Position', 'Rendement_Algo', 'Capital_Algo', 'Capital_BuyHold', 'Capital_SafeRate'
    ]
    df_stock[columns_export].to_csv(export_file, sep=";", index=False)
    print(f"\n📁 Rapport exporté: {export_file}")
    
    return {
        'ticker': ticker,
        'capital_initial': capital_initial,
        'capital_final_algo': capital_final_algo,
        'capital_final_bh': capital_final_bh,
        'capital_final_safe': capital_final_safe,
        'rendement_algo': rendement_net_algo,
        'rendement_bh': rendement_net_bh,
        'rendement_safe': rendement_net_safe,
        'surperformance': surperformance,
        'ecart_taux_safe': ecart_taux_safe,
        'nombre_trades': int(nombre_trades),
        'volatilite': volatilite_algo,
        'sharpe_ratio': sharpe_ratio_algo,
        'df': df_stock
    }


def run_backtest_portfolio(tickers=None, capital_par_action=200000, frais_transaction=0.01):
    """
    Backteste un portefeuille diversifié avec allocation égale par action.
    
    Args:
        tickers (list): Liste des codes symboles. Si None, détecte automatiquement.
        capital_par_action (float): Capital alloué par action (défaut 200k FCFA)
        frais_transaction (float): Frais par transaction (défaut 1%)
        
    Returns:
        dict: Résumé de la performance du portefeuille
    """
    
    print("\n" + "=" * 80)
    print("💼 BACKTEST PORTEFEUILLE DIVERSIFIÉ")
    print("=" * 80)
    
    # Charger les données
    df = charge_and_clean_data()
    
    if df.empty:
        print("❌ Pas de données disponibles.")
        return {}
    
    # Détecter les tickers si non fournis
    if tickers is None:
        tickers = df['Code symbole'].unique()[:5]  # Top 5 par défaut
    
    print(f"📑 Actions à tester: {', '.join(tickers)}")
    
    resultats = []
    capital_total = capital_par_action * len(tickers)
    
    for ticker in tickers:
        result = run_backtest_single_stock(ticker, capital_initial=capital_par_action, frais_transaction=frais_transaction)
        if result:
            resultats.append(result)
    
    if not resultats:
        print("❌ Aucun backtest valide généré.")
        return {}
    
    # Résumé du portefeuille
    print("\n" + "=" * 80)
    print("📊 RÉSUMÉ DU PORTEFEUILLE")
    print("=" * 80)
    
    capital_final_algo_total = sum([r['capital_final_algo'] for r in resultats])
    capital_final_bh_total = sum([r['capital_final_bh'] for r in resultats])
    capital_final_safe_total = sum([r['capital_final_safe'] for r in resultats])
    
    rendement_algo_total = ((capital_final_algo_total - capital_total) / capital_total) * 100
    rendement_bh_total = ((capital_final_bh_total - capital_total) / capital_total) * 100
    rendement_safe_total = ((capital_final_safe_total - capital_total) / capital_total) * 100
    
    print(f"\n🎯 Capital Total Investi: {capital_total:,.0f} FCFA")
    print(f"   ({len(tickers)} actions × {capital_par_action:,.0f} FCFA)")
    
    print(f"\n💹 Capital Final:")
    print(f"   Stratégie Z-Score  : {capital_final_algo_total:>15,.0f} FCFA  ({rendement_algo_total:>6.2f}%)")
    print(f"   Buy & Hold         : {capital_final_bh_total:>15,.0f} FCFA  ({rendement_bh_total:>6.2f}%)")
    print(f"   Taux 6.5%          : {capital_final_safe_total:>15,.0f} FCFA  ({rendement_safe_total:>6.2f}%)")
    
    surperformance_bh = rendement_algo_total - rendement_bh_total
    surperformance_safe = rendement_algo_total - rendement_safe_total
    
    print(f"\n🚀 Performance Comparative:")
    if surperformance_bh > 0:
        print(f"   ✅ +{surperformance_bh:.2f}% vs Buy & Hold")
    else:
        print(f"   ❌ {surperformance_bh:.2f}% vs Buy & Hold")
    
    if surperformance_safe > 0:
        print(f"   ✅ +{surperformance_safe:.2f}% vs Taux sans risque (6.5%)")
    else:
        print(f"   ⚠️  {surperformance_safe:.2f}% vs Taux sans risque (6.5%)")
    
    # Tableau récapitulatif
    print("\n" + "-" * 80)
    print("📋 DÉTAIL PAR ACTION")
    print("-" * 80)
    print(f"{'Action':<10} {'Z-Score':<12} {'Buy&Hold':<12} {'Gain/Perte':<15}")
    print("-" * 80)
    
    for r in resultats:
        gain = r['capital_final_algo'] - r['capital_initial']
        print(f"{r['ticker']:<10} {r['rendement_algo']:>10.2f}% {r['rendement_bh']:>10.2f}% {gain:>13,.0f} FCFA")
    
    print("=" * 80)
    
    return {
        'capital_total': capital_total,
        'capital_final_algo': capital_final_algo_total,
        'capital_final_bh': capital_final_bh_total,
        'capital_final_safe': capital_final_safe_total,
        'rendement_algo': rendement_algo_total,
        'rendement_bh': rendement_bh_total,
        'rendement_safe': rendement_safe_total,
        'surperformance_bh': surperformance_bh,
        'surperformance_safe': surperformance_safe,
        'resultats_detailles': resultats
    }


if __name__ == "__main__":
    # Exécuter le scan quotidien
    print("🔍 PHASE 1: SCAN DES OPPORTUNITÉS")
    get_summary()
    
    # Backtester une action spécifique
    print("\n\n🔬 PHASE 2: BACKTEST STRATÉGIE")
    run_backtest_single_stock('SNTS', capital_initial=1000000)
    
    # Backtester un portefeuille (5 actions)
    print("\n\n💼 PHASE 3: BACKTEST PORTEFEUILLE")
    run_backtest_portfolio(capital_par_action=200000)

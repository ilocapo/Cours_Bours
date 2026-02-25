# -*- coding: utf-8 -*-
"""
STRATÉGIE CŒUR-SATELLITE
========================
Divise le portefeuille en deux composantes complémentaires:

1. CŒUR (Blue Chips/Vaches à lait):
   - Actions très stables (Low Volatility)
   - Conservées à très long terme
   - Collectent des dividendes réguliers
   - Exemple: SNTS (Sonatel)
   - Rôle: Fournir un revenu stable et sécuriser le portefeuille

2. SATELLITES (Haute Volatilité):
   - Actions dynamiques et volatiles
   - Trading actif avec le Z-Score
   - Profit par capitalisation court/moyen terme
   - Rôle: Générer du alpha (surperformance)

Gestion des dividendes:
- Les dividendes sont des revenus réels, pas des pertes
- Ajuster les prix pour le calcul du Z-Score
- Intégrer les dividendes dans le rendement du portefeuille
"""

import pandas as pd
from datetime import datetime
import importlib.util
import sys
import io

# Configurer l'encodage UTF-8 pour Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Charger les modules
spec = importlib.util.spec_from_file_location("zscore_module", "./02_zscore.py")
zscore_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(zscore_module)

charge_and_clean_data = zscore_module.charge_and_clean_data
calculate_zscore = zscore_module.calculate_zscore
signals_generation = zscore_module.signals_generation
add_filters = zscore_module.add_filters


def classify_stocks(df, volatility_threshold=30.0, min_dividend_yield=0.03):
    """
    Classifie les actions en CŒUR (stable) ou SATELLITES (volatiles).
    
    Args:
        df (pd.DataFrame): DataFrame avec données de marché
        volatility_threshold (float): Seuil de volatilité annualisée (%)
        min_dividend_yield (float): Rendement minimum de dividende pour le cœur (3%)
        
    Returns:
        pd.DataFrame: DataFrame avec colonne 'Position_Type' (CORE/SATELLITE)
    """
    
    # Calculer la volatilité par action
    df['Rendement_Quotidien'] = df.groupby('Code symbole')['Cours moyen'].pct_change()
    df['Volatilite_Ann'] = df.groupby('Code symbole')['Rendement_Quotidien'].transform(
        lambda x: x.rolling(window=50, min_periods=20).std() * (252 ** 0.5) * 100
    )
    
    # Calculer le rendement moyen du dividende par action
    df['Dividende_Rendement'] = df.groupby('Code symbole')['Dividendes / Intérêts'].transform(
        lambda x: x.rolling(window=252, min_periods=100).sum() / df['Cours moyen'] * 100
    )
    
    # Classification
    def classify_position(row):
        volatilite = row.get('Volatilite_Ann', 100)
        dividende = row.get('Dividende_Rendement', 0) or 0
        
        # Actions avec faible volatilité ET bon dividende → CŒUR
        if volatilite < volatility_threshold and dividende > min_dividend_yield:
            return 'CORE'
        # Actions avec très faible volatilité et historique → CORE même sans dividende
        elif volatilite < (volatility_threshold * 0.5):
            return 'CORE'
        # Tout le reste → SATELLITES
        else:
            return 'SATELLITE'
    
    df['Position_Type'] = df.apply(classify_position, axis=1)
    
    return df


def handle_dividend_adjustments(df):
    """
    Ajuste les prix et rendements pour tenir compte des dividendes.
    
    Les dividendes paient de l'argent en espèces à l'actionnaire.
    Quand une entreprise paie un dividende, le prix baisse généralement du montant du dividende.
    C'est un ajustement technique, pas une vraie perte.
    
    Args:
        df (pd.DataFrame): DataFrame avec colonnes de dividendes
        
    Returns:
        pd.DataFrame: DataFrame avec prix ajustés et rendements corrigés
    """
    
    # 1. Identifier les dates de paiement de dividende
    df['Div_Paye'] = df['Dividendes / Intérêts'].notna() & (df['Dividendes / Intérêts'] > 0)
    
    # 2. Convertir les montants de dividende en rendement
    df['Div_Rendement'] = (df['Dividendes / Intérêts'] / df['Cours moyen'] * 100).fillna(0)
    
    # 3. Ajuster le rendement quotidien pour inclure le dividende
    #    Cela représente le vrai gain pour l'investisseur
    df['Rendement_Action'] = df.groupby('Code symbole')['Cours moyen'].pct_change() * 100
    df['Rendement_Total_Avec_Div'] = df['Rendement_Action'] + df['Div_Rendement']
    
    # 4. Marquer les actions en ex-dividende
    #    Le jour après le paiement, le prix peut baisser = NE PAS acheter/vendre
    df['Ex_Dividende'] = False
    df.loc[df['Div_Paye'] == True, 'Ex_Dividende'] = True
    
    return df


def core_satellite_backtest(ticker_core, ticker_satellites, capital_total=1000000, 
                            capital_core_ratio=0.4, frais_transaction=0.01):
    """
    Backteste la stratégie CŒUR-SATELLITE.
    
    Args:
        ticker_core (str or list): Action(s) du noyau stable (ex: 'SNTS')
        ticker_satellites (list): Liste d'actions satellites pour le trading actif
        capital_total (float): Capital total en FCFA
        capital_core_ratio (float): % du capital pour le cœur (défaut 40%)
        frais_transaction (float): Frais par transaction (défaut 1%)
        
    Returns:
        dict: Résultats du backtest
    """
    
    print("\n" + "=" * 100)
    print("💼 BACKTEST STRATÉGIE CŒUR-SATELLITE")
    print("=" * 100)
    
    # Charger et préparer les données
    df = charge_and_clean_data()
    df = calculate_zscore(df)
    df = signals_generation(df)
    df = add_filters(df)
    df = classify_stocks(df)
    df = handle_dividend_adjustments(df)
    
    # Allocation du capital
    capital_core = capital_total * capital_core_ratio
    capital_satellites = capital_total * (1 - capital_core_ratio)
    
    print(f"\n📊 ALLOCATION DU CAPITAL")
    print(f"   Cœur ({capital_core_ratio*100:.0f}%):        {capital_core:>15,.0f} FCFA")
    print(f"   Satellites ({(1-capital_core_ratio)*100:.0f}%):   {capital_satellites:>15,.0f} FCFA")
    
    # ===== STRATÉGIE CŒUR =====
    print(f"\n" + "=" * 100)
    print(f"🛡️  STRATÉGIE CŒUR (Buy & Hold + Dividendes)")
    print("=" * 100)
    
    if isinstance(ticker_core, str):
        ticker_core = [ticker_core]
    
    df_core = df[df['Code symbole'].isin(ticker_core)].copy()
    
    if df_core.empty:
        print(f"❌ Erreur: Aucune action cœur trouvée parmi {ticker_core}")
        return {}
    
    # Buy and Hold: acheter au premier jour et ne jamais vendre
    df_core = df_core.sort_values('Date').reset_index(drop=True)
    
    # Achat au premier jour
    df_core['Position'] = 0
    df_core.loc[0, 'Position'] = 1
    df_core['Position'] = df_core['Position'].fillna(method='ffill').fillna(0)
    
    # Rendement avec dividendes
    df_core['Rendement_Investi'] = df_core['Position'].shift(1) * (df_core['Rendement_Action'] + df_core['Div_Rendement'])
    
    # Capital évolution
    df_core['Capital_Core'] = capital_core * (1 + df_core['Rendement_Investi']/100).cumprod()
    
    # Résultats du cœur
    capital_final_core = df_core['Capital_Core'].dropna().iloc[-1] if not df_core['Capital_Core'].dropna().empty else capital_core
    rendement_core = ((capital_final_core - capital_core) / capital_core) * 100
    
    dividendes_totaux = df_core[df_core['Div_Paye'] == True]['Dividendes / Intérêts'].sum()
    
    print(f"\n📋 Action(s) du cœur: {', '.join(ticker_core)}")
    print(f"   Période: {df_core['Date'].iloc[0]} → {df_core['Date'].iloc[-1]}")
    print(f"   Stratégie: Buy & Hold (Achat au jour 1, puis conservation)")
    print(f"\n💰 Résultats du Cœur:")
    print(f"   Capital Initial:      {capital_core:>15,.0f} FCFA")
    print(f"   Capital Final:        {capital_final_core:>15,.0f} FCFA")
    print(f"   Rendement:            {rendement_core:>15.2f}%")
    print(f"   Dividendes Reçus:     {dividendes_totaux:>15,.0f} FCFA")
    
    # ===== STRATÉGIE SATELLITES =====
    print(f"\n" + "=" * 100)
    print(f"🚀 STRATÉGIE SATELLITES (Z-Score Trading)")
    print("=" * 100)
    
    df_satellites = df[df['Code symbole'].isin(ticker_satellites)].copy()
    
    if df_satellites.empty:
        print(f"❌ Erreur: Aucune action satellite trouvée parmi {ticker_satellites}")
        return {}
    
    df_satellites = df_satellites.sort_values(['Code symbole', 'Date']).reset_index(drop=True)
    
    # Appliquer les signaux de trading
    df_satellites['Signal'] = 0
    df_satellites.loc[df_satellites['Signal_Filtre'].isin(['Buy_FILTERED', 'Strong Buy_FILTERED']), 'Signal'] = 1
    df_satellites.loc[df_satellites['Signal_Filtre'].isin(['Sell_FILTERED', 'Strong Sell_FILTERED']), 'Signal'] = -1
    
    # Position (FFill pour rester investi)
    df_satellites['Position'] = df_satellites['Signal'].replace(0, pd.NA).ffill().fillna(0).astype(int)
    
    # Rendement incluant dividendes + frais
    df_satellites['Rendement_Investi'] = df_satellites['Position'].shift(1) * (df_satellites['Rendement_Action'] + df_satellites['Div_Rendement'])
    
    # Déduire les frais lors des trades
    df_satellites['Trade'] = df_satellites['Position'].diff().abs()
    df_satellites.loc[df_satellites['Trade'] == 1, 'Rendement_Investi'] -= frais_transaction * 100
    
    # Capital évolution
    df_satellites['Capital_Satellite'] = capital_satellites * (1 + df_satellites['Rendement_Investi']/100).cumprod()
    
    # Résultats des satellites
    capital_final_sat = df_satellites['Capital_Satellite'].dropna().iloc[-1] if not df_satellites['Capital_Satellite'].dropna().empty else capital_satellites
    rendement_sat = ((capital_final_sat - capital_satellites) / capital_satellites) * 100
    nombre_trades = int(df_satellites['Trade'].sum() / 2)  # Div par 2 car buy+sell = 2 trades
    
    print(f"\n📋 Actions satellites: {', '.join(ticker_satellites)}")
    print(f"   Période: {df_satellites['Date'].iloc[0]} → {df_satellites['Date'].iloc[-1]}")
    print(f"   Stratégie: Z-Score Boléger avec Filtres")
    print(f"\n💰 Résultats des Satellites:")
    print(f"   Capital Initial:      {capital_satellites:>15,.0f} FCFA")
    print(f"   Capital Final:        {capital_final_sat:>15,.0f} FCFA")
    print(f"   Rendement:            {rendement_sat:>15.2f}%")
    print(f"   Nombre de Trades:     {nombre_trades:>15}")
    
    # ===== RÉSUMÉ PORTEFEUILLE GLOBAL =====
    print(f"\n" + "=" * 100)
    print(f"📊 RÉSUMÉ PORTEFEUILLE GLOBAL (CŒUR + SATELLITES)")
    print("=" * 100)
    
    capital_final_total = capital_final_core + capital_final_sat
    rendement_global = ((capital_final_total - capital_total) / capital_total) * 100
    gain_total = capital_final_total - capital_total
    
    # Taux sans risque (6.5% UEMOA)
    taux_safe = 0.065
    capital_safe_rate = capital_total * ((1 + taux_safe) ** (len(df_core) / 252))
    rendement_safe = ((capital_safe_rate - capital_total) / capital_total) * 100
    
    print(f"\n💼 Capital Global:")
    print(f"   Initial:              {capital_total:>15,.0f} FCFA")
    print(f"   Final:                {capital_final_total:>15,.0f} FCFA")
    print(f"   Cœur contribution:    {capital_final_core:>15,.0f} FCFA ({(capital_final_core/capital_final_total)*100:.1f}%)")
    print(f"   Satellites contrib.:  {capital_final_sat:>15,.0f} FCFA ({(capital_final_sat/capital_final_total)*100:.1f}%)")
    
    print(f"\n🎯 Performance:")
    print(f"   Rendement Global:     {rendement_global:>15.2f}%")
    print(f"   Rendement Cœur:       {rendement_core:>15.2f}%")
    print(f"   Rendement Satellites: {rendement_sat:>15.2f}%")
    print(f"   Taux Sans Risque 6.5%:{rendement_safe:>15.2f}%")
    
    if rendement_global > rendement_safe:
        print(f"\n✅ SUCCÈS: +{rendement_global - rendement_safe:.2f}% vs taux sans risque")
    else:
        print(f"\n⚠️  À AMÉLIORER: {rendement_global - rendement_safe:.2f}% vs taux sans risque")
    
    print(f"\n💵 Gain/Perte Absolu:  {gain_total:>15,.0f} FCFA")
    
    return {
        'capital_total': capital_total,
        'capital_final': capital_final_total,
        'capital_final_core': capital_final_core,
        'capital_final_sat': capital_final_sat,
        'rendement_global': rendement_global,
        'rendement_core': rendement_core,
        'rendement_sat': rendement_sat,
        'rendement_safe': rendement_safe,
        'gain_total': gain_total,
        'nombre_trades': nombre_trades,
        'df_core': df_core,
        'df_satellites': df_satellites
    }


if __name__ == "__main__":
    # Exemple d'utilisation avec SNTS comme cœur et autres comme satellites
    print("🎯 DÉMONSTRATION: STRATÉGIE CŒUR-SATELLITE SUR LA BRVM")
    
    # Vous pouvez adapter ces listes selon vos préférences
    ticker_core = ['SNTS']  # Sonatel = cœur stable
    ticker_satellites = ['ABJC', 'BICC', 'SDCC']  # Autres actions pour trading
    
    results = core_satellite_backtest(
        ticker_core=ticker_core,
        ticker_satellites=ticker_satellites,
        capital_total=1000000,
        capital_core_ratio=0.4,  # 40% cœur, 60% satellites
        frais_transaction=0.01
    )

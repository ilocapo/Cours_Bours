"""
Bond/Obligation Scanner - Independent Radar for CORE Portfolio

Scanne les données pour trouver les obligations vendues < 100% (sous leur valeur nominale)
Les rendements obligataires vont au CORE (70% - Bouclier/Sécurisé)
NE PAS MÉLANGER avec le robot Z-Score du SATELLITE

Objectif: Identifier les super-rendements obligataires (bonds trading at discount)
"""

import sys
import os
from datetime import datetime
import re as _re
import pandas as pd
from pathlib import Path
import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / 'src'))
sys.path.insert(0, str(PROJECT_ROOT))

from backtester import charge_and_clean_data
from src.config import REAL_CAPITAL_PER_CORE_STOCK


def identify_bonds(df_all):
    """
    Identifie les obligations dans le dataset
    
    Critères:
    - Colonne "Numéro de Coupon" non-vide → c'est une obligation
    - Colonne "TAUX" non-vide → c'est une obligation
    - Libellé contient "%" et "20XX-20XX" → pattern obligation
    
    Returns:
        DataFrame avec uniquement les obligations
    """
    
    print("\n" + "="*100)
    print("BOND SCANNER - IDENTIFYING BONDS IN DATASET")
    print("="*100)
    
    # Créer une copie
    df = df_all.copy()
    
    # Convertir les colonnes pertinentes
    df['Date'] = pd.to_datetime(df['Date'], format='%d/%m/%Y')
    
    # Critère 1: Numéro de Coupon non-vide
    has_coupon = df['Numéro de Coupon'].notna()
    
    # Critère 2: TAUX non-vide
    has_taux = df['TAUX'].notna() & (df['TAUX'] != '')
    
    # Critère 3: Libellé avec pattern obligataire (% et année)
    def is_bond_pattern(libelle):
        if pd.isna(libelle):
            return False
        libelle_str = str(libelle).upper()
        # Pattern: "% XXXX-XXXX" ou juste "%" dans le libellé
        has_percent = '%' in libelle_str
        has_year = any(year in libelle_str for year in ['201', '202'])
        return has_percent or has_year
    
    has_pattern = df['Libellé'].apply(is_bond_pattern)
    
    # Combiner les critères
    is_bond = has_coupon | has_taux | has_pattern
    
    df_bonds = df[is_bond].copy()
    
    print(f"\nTotal stocks/bonds in dataset: {len(df_all['Code symbole'].unique())}")
    print(f"Bonds identified: {len(df_bonds['Code symbole'].unique())}")
    print(f"Bond records: {len(df_bonds)}")
    
    return df_bonds


def analyze_bond_opportunity(ticker, df_bonds):
    """
    Analyse une obligation pour opportunité d'achat
    
    Objectif: Prix < 100% (discount) = Rendement supérieur
    
    Returns:
        dict avec: ticker, current_price, discount%, taux, rendement_effectif
    """
    
    df_ticker = df_bonds[df_bonds['Code symbole'] == ticker].copy()
    
    if df_ticker.empty:
        return None
    
    df_ticker = df_ticker.sort_values('Date')
    
    # Dernier prix connu
    latest_row = df_ticker.iloc[-1]
    current_price = latest_row['Cours moyen']
    libelle = latest_row['Libellé']
    taux = latest_row['TAUX']

    # ── Extraire l'année de maturité depuis le libellé (ex: "2018-2025" → 2025) ──
    current_year = datetime.now().year
    maturity_year = None
    m = _re.search(r'\b(20\d{2})-(20\d{2})\b', str(libelle))
    if m:
        maturity_year = int(m.group(2))
    else:
        # Cherche une seule année (ex: "O28" dans le ticker → 2028)
        m2 = _re.search(r'O(\d{2})$', str(ticker))
        if m2:
            maturity_year = 2000 + int(m2.group(1))

    # ── Rejeter les obligations dont la maturité est déjà passée ──
    if maturity_year is not None and maturity_year < current_year:
        return None  # Obligation expirée — exclure

    # Années restantes jusqu'à maturité (minimum 0.5 an pour éviter division par zéro)
    if maturity_year is not None:
        years_to_maturity = max(0.5, float(maturity_year - current_year))
    else:
        years_to_maturity = 5.0  # Valeur par défaut si date non trouvée

    # Vérifier que c'est bien une obligation (prix doit être proche de 100)
    if pd.isna(current_price) or current_price < 50 or current_price > 150:
        return None
    
    # Calcul du discount
    discount_amount = 100.0 - float(current_price)
    discount_pct = (discount_amount / 100.0) * 100  # En pourcentage
    
    # Rendement effectif = taux coupon + capital gain à maturité
    try:
        if pd.notna(taux) and taux != '':
            taux_str = str(taux).strip()
            # Si c'est un nombre compris entre 0 et 100, c'est un taux (%)
            taux_val = float(taux_str)
            # Si > 120, c'est probablement un prix, pas un taux - skip
            if taux_val > 120:
                coupon_rate = 0.0
            else:
                coupon_rate = taux_val if taux_val <= 15 else 0.0  # Les taux réalistes sont < 15%
        else:
            # Essayer d'extraire du libellé (pattern: "X,XX%")
            match = _re.search(r'(\d+[,\.]\d+)\s*%', str(libelle))
            if match:
                coupon_rate = float(match.group(1).replace(',', '.'))
            else:
                coupon_rate = 0.0
    except:
        coupon_rate = 0.0
    
    # Rendement effectif : coupon rate + capital gain amorti sur les années réelles restantes
    if discount_pct > 0:
        amortized_gain = discount_pct / years_to_maturity
        effective_yield = coupon_rate + amortized_gain
    else:
        effective_yield = coupon_rate

    return {
        'Ticker': ticker,
        'Libelle': libelle,
        'Current_Price': round(current_price, 2),
        'Nominal_Price': 100.0,
        'Maturity_Year': maturity_year if maturity_year else 'N/A',
        'Years_Left': round(years_to_maturity, 1),
        'Discount_FCFA': round(discount_amount, 2),
        'Discount_%': round(discount_pct, 2),
        'Coupon_Rate_%': round(coupon_rate, 2),
        'Effective_Yield_%': round(effective_yield, 2),
        'Purchase_Qty': int(REAL_CAPITAL_PER_CORE_STOCK / current_price) if current_price > 0 else 0,
        'Purchase_Cost_FCFA': round(REAL_CAPITAL_PER_CORE_STOCK, 0)
    }


def scan_bond_opportunities(min_discount=0.5):
    """
    Scanne TOUTES les obligations pour trouver les super-rendements
    
    Args:
        min_discount: discount minimum en % pour considérer comme opportunity
        
    Returns:
        DataFrame with opportunities sorted by effective yield
    """
    
    print("\n" + "="*100)
    print("BOND OPPORTUNITY SCAN")
    print("="*100)
    
    # Charger données
    print("\nLoading data...")
    df_all = charge_and_clean_data()
    
    if df_all.empty:
        print("Error: No data loaded")
        return None
    
    # Identifier les obligations
    df_bonds = identify_bonds(df_all)
    
    if df_bonds.empty:
        print("No bonds found in dataset")
        return None
    
    # Analyser chaque obligation
    print("\nAnalyzing bonds...")
    opportunities = []
    
    for ticker in df_bonds['Code symbole'].unique():
        analysis = analyze_bond_opportunity(ticker, df_bonds)
        if analysis:
            # Filtrer: seulement les discount > min_discount
            if analysis['Discount_%'] >= min_discount:
                opportunities.append(analysis)
    
    if not opportunities:
        print(f"\nNo bonds found trading with {min_discount}%+ discount")
        return None
    
    # Créer DataFrame et trier par rendement effectif
    df_opportunities = pd.DataFrame(opportunities)
    df_opportunities = df_opportunities.sort_values('Effective_Yield_%', ascending=False)
    
    print(f"\n✅ Found {len(df_opportunities)} bond opportunities with {min_discount}%+ discount")
    
    return df_opportunities


def display_bond_report():
    """
    Affiche un rapport complet des opportunités obligataires
    """
    
    print("\n" + "="*100)
    print("BOND SCANNER - DAILY REPORT")
    print(f"Date: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    print("="*100)
    
    # Scanner avec minimum 0.5% discount
    df_ops = scan_bond_opportunities(min_discount=0.5)
    
    if df_ops is None or df_ops.empty:
        print("\n⚠️  No bond opportunities found below 100%")
        return None
    
    # Afficher les meilleures opportunités
    print("\n" + "="*100)
    print("TOP 10 BOND OPPORTUNITIES (BEST YIELDS)")
    print("="*100)
    
    display_cols = ['Ticker', 'Libelle', 'Current_Price', 'Discount_%', 'Coupon_Rate_%', 'Effective_Yield_%']
    
    for i, row in df_ops.head(10).iterrows():
        print(f"\n{i+1}. {row['Ticker']}")
        print(f"   Libellé: {row['Libelle']}")
        print(f"   Prix actuel: {row['Current_Price']} FCFA")
        print(f"   Discount: {row['Discount_%']}% (économise {row['Discount_FCFA']} FCFA par unité)")
        print(f"   Taux coupon: {row['Coupon_Rate_%']}%")
        print(f"   Rendement effectif: {row['Effective_Yield_%']}% (meilleur que marché)")
        print(f"   → Pour 1 allocation CORE ({row['Purchase_Cost_FCFA']:,.0f} FCFA):")
        print(f"      Acheter {row['Purchase_Qty']:,} unités à {row['Current_Price']}")
    
    # Exporter résultats
    output_path = PROJECT_ROOT / f"bond_opportunities_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    df_ops.to_csv(output_path, index=False)
    
    print(f"\n✅ Report saved: {output_path}")
    print("\n" + "="*100)
    print("PLACEMENT STRATEGY: CORE PORTFOLIO (70% - SHIELD)")
    print("="*100)
    print("""
These bonds should be added to your CORE holdings (alongside SNTS, ORGT, etc):

✅ DO:
  - Add bonds to CORE allocation (70% - stable, dividend/coupon focused)
  - Choose bonds with highest effective yield
  - Diversify bond maturities (some short, some medium, some long)
  - Reinvest coupons in new bonds (or same bond on discount dips)
  
❌ DON'T:
  - DON'T mix bonds with SATELLITE Z-Score trades
  - DON'T trade bonds in/out based on Z-Score signals
  - DON'T speculate on bond price swings
  - DON'T hold bonds if expecting company default
  
TARGET ALLOCATION:
  CORE (70%) = 5 Big Cap Stocks (40%) + Bonds (20%) + Cash/Reserves (10%)
  SATELLITE (30%) = Z-Score Robot trading
""")
    
    return df_ops


def save_bond_portfolio_allocation():
    """
    Crée un template CSV pour ajouter les obligs au portefeuille CORE
    """
    
    print("\n" + "="*100)
    print("PREPARING BOND ALLOCATION TEMPLATE FOR CORE PORTFOLIO")
    print("="*100)
    
    df_ops = scan_bond_opportunities(min_discount=0.5)
    
    if df_ops is None or df_ops.empty:
        print("No bonds to allocate")
        return
    
    # Template pour ajouter les obligs
    core_bonds = pd.DataFrame({
        'Date': [datetime.now().strftime('%d/%m/%Y')] * min(5, len(df_ops)),
        'Ticker': df_ops.head(5)['Ticker'].values,
        'Type': ['BOND'] * min(5, len(df_ops)),
        'Entry_Date': [datetime.now().strftime('%d/%m/%Y')] * min(5, len(df_ops)),
        'Entry_Price': df_ops.head(5)['Current_Price'].values,
        'Qty': df_ops.head(5)['Purchase_Qty'].values,
        'Allocation_%': [10] * min(5, len(df_ops)),  # 10% par obligation
        'Target_Value': [df_ops.head(5)['Purchase_Cost_FCFA'].values[i] for i in range(min(5, len(df_ops)))],
        'Current_Price': df_ops.head(5)['Current_Price'].values,
        'Current_Value': df_ops.head(5)['Purchase_Cost_FCFA'].values,
        'P&L': [0] * min(5, len(df_ops)),
        'P&L_%': [0] * min(5, len(df_ops)),
        'Coupon_Rate_%': df_ops.head(5)['Coupon_Rate_%'].values,
        'Coupon_Yield_%': df_ops.head(5)['Coupon_Rate_%'].values,  # À maturity, ajout du discount
        'Status': ['SUGGESTED'] * min(5, len(df_ops)),
        'Last_Update': [datetime.now().strftime('%d/%m/%Y')] * min(5, len(df_ops))
    })
    
    output_path = PROJECT_ROOT / 'core_bonds_allocation.csv'
    core_bonds.to_csv(output_path, index=False)
    
    print(f"✅ Bond allocation template: {output_path}")
    print("   → Review the top 5 bonds")
    print("   → Add to core_allocation.csv when ready")
    
    return core_bonds


if __name__ == "__main__":
    # Full bond scan
    df_report = display_bond_report()
    
    # Create allocation template
    if df_report is not None:
        df_allocation = save_bond_portfolio_allocation()

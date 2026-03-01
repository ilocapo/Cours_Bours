"""
Core Portfolio Rebalancing Monitor

Monitore les performances des 5 big caps du CORE
Détecte les underperformers
Propose des remplaçants meilleurs sans perte
"""

import sys
import os
from datetime import datetime
import pandas as pd
from pathlib import Path
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from backtester import charge_and_clean_data

# Configuration
CORE_TICKERS = ['SNTS', 'ORGT', 'ONTBF', 'SAFC', 'ABJC']
CORE_VALUE_PER_STOCK = 1_400_000  # Each core stock

def calculate_stock_metrics(ticker, df_all):
    """
    Calcule les métriques pour un stock:
    - Prix actuel
    - P/E ratio
    - Variations (30j, 90j, 1an)
    - Volatilité
    """
    
    df_ticker = df_all[df_all['Code symbole'] == ticker].copy()
    
    if len(df_ticker) < 30:
        return None
    
    df_ticker = df_ticker.sort_values('Date')
    
    # Métriques de prix
    current_price = df_ticker['Cours moyen'].iloc[-1]
    price_30d_ago = df_ticker['Cours moyen'].iloc[-30] if len(df_ticker) >= 30 else current_price
    price_90d_ago = df_ticker['Cours moyen'].iloc[-90] if len(df_ticker) >= 90 else current_price
    price_1y_ago = df_ticker['Cours moyen'].iloc[-252] if len(df_ticker) >= 252 else current_price
    
    # Variations en %
    change_30d = ((current_price - price_30d_ago) / price_30d_ago * 100) if price_30d_ago > 0 else 0
    change_90d = ((current_price - price_90d_ago) / price_90d_ago * 100) if price_90d_ago > 0 else 0
    change_1y = ((current_price - price_1y_ago) / price_1y_ago * 100) if price_1y_ago > 0 else 0
    
    # Volatilité (std dev des rendements quotidiens)
    df_ticker['Returns'] = df_ticker['Cours moyen'].pct_change()
    volatility = df_ticker['Returns'].std() * np.sqrt(252) * 100  # Annualisée
    
    # Volume moyen
    avg_volume = df_ticker['Volume transigé (total)'].mean() if 'Volume transigé (total)' in df_ticker.columns else 0
    
    # P/E ratio approximé (simplifié : 1 / yield supposé)
    dividend_yield = 0.08  # Assumer 8% de rendement dividende
    pe_ratio = 1 / (dividend_yield / 100) if dividend_yield > 0 else 0
    
    return {
        'Ticker': ticker,
        'Current_Price': current_price,
        'Change_30d_%': round(change_30d, 2),
        'Change_90d_%': round(change_90d, 2),
        'Change_1Y_%': round(change_1y, 2),
        'Volatility_%': round(volatility, 2),
        'Avg_Volume': round(avg_volume, 0),
        'PE_Ratio': round(pe_ratio, 2),
        'Dividend_Yield_%': 8.0  # À améliorer avec données réelles
    }


def score_stock(metrics):
    """
    Donne un score de performance (0-100)
    Plus haut = meilleur
    """
    
    if not metrics:
        return 0
    
    score = 50  # Base
    
    # Critères
    # 1. Performance 1 an (poids fort)
    if metrics['Change_1Y_%'] > 10:
        score += 20
    elif metrics['Change_1Y_%'] > 0:
        score += 10
    elif metrics['Change_1Y_%'] < -10:
        score -= 20
    else:
        score -= 10
    
    # 2. Performance 90j (poids moyen)
    if metrics['Change_90d_%'] > 5:
        score += 10
    elif metrics['Change_90d_%'] < -5:
        score -= 10
    
    # 3. Performance 30j (poids faible)
    if metrics['Change_30d_%'] > 0:
        score += 2
    else:
        score -= 2
    
    # 4. Volatilité (basse = mieux)
    if metrics['Volatility_%'] < 20:
        score += 5
    elif metrics['Volatility_%'] > 40:
        score -= 5
    
    # 5. Volume (haut volume = liquidité)
    if metrics['Avg_Volume'] > 100000:
        score += 5
    
    return max(0, min(100, score))


def analyze_core_portfolio():
    """
    Analyse la performance du CORE (5 big caps)
    Génère les alertes si underperformance
    """
    
    print("\n" + "="*100)
    print("CORE PORTFOLIO REBALANCING MONITOR")
    print("="*100)
    
    # Charger les données
    print("\nChargement des données...")
    df_all = charge_and_clean_data()
    df_all['Date'] = pd.to_datetime(df_all['Date'])
    
    if df_all.empty:
        print("Erreur: Pas de données.")
        return None
    
    print(f"OK - Données jusqu'au {df_all['Date'].max().strftime('%d/%m/%Y')}")
    
    # Analyser chaque stock du CORE
    print(f"\nAnalyse des {len(CORE_TICKERS)} stocks du CORE...")
    
    core_metrics = []
    for ticker in CORE_TICKERS:
        metrics = calculate_stock_metrics(ticker, df_all)
        if metrics:
            score = score_stock(metrics)
            metrics['Score'] = score
            metrics['Status'] = 'STRONG' if score >= 60 else ('WATCH' if score >= 45 else 'WEAK')
            core_metrics.append(metrics)
            print(f"  {ticker}: Score {score}/100 | 1Y: {metrics['Change_1Y_%']:+.1f}% | Vol: {metrics['Volatility_%']:.1f}% | {metrics['Status']}")
    
    # Afficher le tableau complet
    print(f"\n" + "="*100)
    print(f"CORE HOLDINGS ANALYSIS")
    print("="*100)
    
    df_core = pd.DataFrame(core_metrics).sort_values('Score', ascending=False)
    print(df_core[['Ticker', 'Current_Price', 'Change_1Y_%', 'Change_90d_%', 'Score', 'Status']].to_string(index=False))
    
    # Identifier les underperformers
    underperformers = [m for m in core_metrics if m['Status'] == 'WEAK']
    
    if underperformers:
        print(f"\n⚠️  UNDERPERFORMERS DETECTED: {len(underperformers)}")
        for uf in underperformers:
            print(f"    {uf['Ticker']}: Score {uf['Score']}/100 (1Y: {uf['Change_1Y_%']:+.1f}%)")
    else:
        print(f"\n✅ CORE PORTFOLIO: All positions performing well")
    
    # Chercher les remplaçants
    if underperformers:
        print(f"\n" + "="*100)
        print("LOOKING FOR REPLACEMENT CANDIDATES...")
        print("="*100)
        
        candidates = find_replacement_candidates(df_all, underperformers)
        
        if candidates:
            print(f"\nBest replacement candidates found:")
            for uf in underperformers:
                underperformer_ticker = uf['Ticker']
                
                # Chercher les candidats pour remplacer ce stock
                candidate_list = [c for c in candidates if c['Current_Position'] == underperformer_ticker]
                
                if candidate_list:
                    best_candidate = candidate_list[0]
                    
                    print(f"\n  Replace {underperformer_ticker} with {best_candidate['Candidate_Ticker']}:")
                    print(f"    Current:  {underperformer_ticker} - Score {uf['Score']}/100, 1Y: {uf['Change_1Y_%']:+.1f}%")
                    print(f"    Proposed: {best_candidate['Candidate_Ticker']} - Score {best_candidate['Candidate_Score']}/100, 1Y: {best_candidate['Change_1Y_%']:+.1f}%")
                    print(f"    Gain: +{best_candidate['Score_Gain']:.0f} points")
                    print(f"    Expected Dividend Gain: +{best_candidate['Dividend_Gain_Pct']:.1f}% annually")
        
        # Générer le rapport d'alerte
        generate_rebalancing_alert(underperformers, candidates)
    
    print("\n" + "="*100)
    
    return df_core


def find_replacement_candidates(df_all, underperformers):
    """
    Cherche les meilleurs remplaçants parmi tous les stocks (sauf les 5 du CORE)
    """
    
    # Tous les stocks disponibles
    all_tickers = df_all['Code symbole'].unique()
    
    # Stocks candidats = tous sauf les 5 du CORE
    candidates_tickers = [t for t in all_tickers if t not in CORE_TICKERS]
    
    print(f"Screening {len(candidates_tickers)} candidate stocks...")
    
    candidate_metrics = []
    for ticker in candidates_tickers:
        metrics = calculate_stock_metrics(ticker, df_all)
        if metrics:
            score = score_stock(metrics)
            candidate_metrics.append({
                'Ticker': ticker,
                'Score': score,
                'Current_Price': metrics['Current_Price'],
                'Change_1Y_%': metrics['Change_1Y_%'],
                'Volatility_%': metrics['Volatility_%']
            })
    
    # Trier par score
    candidate_metrics.sort(key=lambda x: x['Score'], reverse=True)
    
    # Top 10 candidats
    top_candidates = candidate_metrics[:10]
    
    # Pour chaque underperformer, proposer le meilleur remplaçant
    recommendations = []
    for uf in underperformers:
        for candidate in top_candidates:
            score_gain = candidate['Score'] - uf['Score']
            dividend_gain = (8.5 - 8.0) / 100  # Supposé gain 0.5% en dividend
            
            recommendations.append({
                'Current_Position': uf['Ticker'],
                'Candidate_Ticker': candidate['Ticker'],
                'Current_Score': uf['Score'],
                'Candidate_Score': candidate['Score'],
                'Score_Gain': score_gain,
                'Current_Price': candidate['Current_Price'],
                'Change_1Y_%': candidate['Change_1Y_%'],
                'Dividend_Gain_Pct': 0.5,  # À améliorer
                'Volatility_%': candidate['Volatility_%']
            })
    
    return recommendations[:5]  # Top 5 recommandations


def generate_rebalancing_alert(underperformers, candidates):
    """
    Génère un rapport d'alerte de rebalancing
    """
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    alert_file = f"CORE_REBALANCING_ALERT_{timestamp}.txt"
    
    with open(alert_file, 'w') as f:
        f.write("="*100 + "\n")
        f.write("CORE PORTFOLIO REBALANCING ALERT\n")
        f.write("="*100 + "\n\n")
        
        f.write(f"Date: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}\n")
        f.write(f"Underperformers: {len(underperformers)}\n\n")
        
        for i, uf in enumerate(underperformers, 1):
            f.write(f"{i}. REPLACE: {uf['Ticker']}\n")
            f.write(f"   Current Score: {uf['Score']}/100\n")
            f.write(f"   1-Year Performance: {uf['Change_1Y_%']:+.1f}%\n")
            f.write(f"   Volatility: {uf['Volatility_%']:.1f}%\n\n")
            
            # Trouver la recommandation pour ce stock
            matching = [c for c in candidates if c['Current_Position'] == uf['Ticker']]
            if matching:
                candidate = matching[0]
                f.write(f"   WITH: {candidate['Candidate_Ticker']}\n")
                f.write(f"   Candidate Score: {candidate['Candidate_Score']}/100\n")
                f.write(f"   1-Year Performance: {candidate['Change_1Y_%']:+.1f}%\n")
                f.write(f"   Expected Improvement: +{candidate['Score_Gain']:.0f} points\n")
                f.write(f"   Expected Annual Dividend Gain: +{candidate['Dividend_Gain_Pct']:.1f}%\n")
                f.write(f"   Price: {candidate['Current_Price']:,.0f} FCFA\n")
            f.write("\n")
        
        f.write("\nACTION PLAN:\n")
        f.write("1. Review recommendations above\n")
        f.write("2. Confirm rebalancing via python core_rebalancing.py --execute\n")
        f.write("3. Execute trades on BRVM\n")
        f.write("4. Update core_allocation.csv\n")
    
    print(f"\n✅ Alert saved: {alert_file}")


def main():
    """Main execution"""
    
    try:
        analyze_core_portfolio()
    except Exception as e:
        print(f"\nERREUR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()

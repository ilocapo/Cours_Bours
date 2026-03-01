#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Grid Search avec paires TP/SL LOGIQUES uniquement (TP > SL)
"""

import sys
import os

# Ajouter le répertoire courant
sys.path.insert(0, os.getcwd())

from src.backtester import parameter_grid_search

if __name__ == "__main__":
    print("\n" + "=" * 100)
    print("GRID SEARCH ABJC - COMBINAISONS LOGIQUES TP > SL")
    print("=" * 100)
    
    # Lancer le grid search avec paires TP/SL logiques
    df_results = parameter_grid_search('ABJC', capital_initial=1000000)
    
    if df_results is not None:
        print("\n" + "=" * 100)
        print("TOP 5 COMBINAISONS (Sharpe Ratio)")
        print("=" * 100)
        display_cols = ['TP', 'SL', 'TimeStop', 'FK_Drop', 'Rendement', 'Sharpe', 'Volatilite', 'Trades']
        print(df_results[display_cols].head(5).to_string(index=False))
        
        print("\n" + "=" * 100)
        print("MEILLEURE COMBINAISON")
        print("=" * 100)
        best = df_results.iloc[0]
        print(f"   TP: {best['TP']*100:.0f}% | SL: {best['SL']*100:.0f}% | TimeStop: {best['TimeStop']:.0f}j | FK: {best['FK_Drop']*100:.0f}%")
        print(f"   Rendement: {best['Rendement']:.2f}%")
        print(f"   Sharpe: {best['Sharpe']:.4f}")
        print(f"   Volatilité: {best['Volatilite']:.4f}")
        print(f"   Nombre de trades: {best['Trades']:.0f}")
        print("\n✅ Grid Search terminé!")
    else:
        print("❌ Erreur lors du grid search")

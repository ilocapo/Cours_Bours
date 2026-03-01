"""
Portfolio Manager

Gère les positions ouvertes, calcule les P&L, applique SL/TP
Met à jour open_positions.csv et portfolio_summary.csv
"""

import sys
import os
from datetime import datetime
import pandas as pd
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from backtester import charge_and_clean_data

def get_latest_prices():
    """
    Récupère les derniers prix disponibles pour tous les stocks
    """
    print("\nRécupération des prix actuels...")
    
    df_all = charge_and_clean_data()
    df_all['Date'] = pd.to_datetime(df_all['Date'])
    
    # Dernier jour disponible
    latest_date = df_all['Date'].max()
    df_latest = df_all[df_all['Date'] == latest_date]
    
    # Créer dictionnaire ticker -> price
    price_dict = {}
    for idx, row in df_latest.iterrows():
        ticker = row['Code symbole']
        price = row['Cours moyen']
        price_dict[ticker] = price
    
    print(f"OK - Prices pour {len(price_dict)} stocks ({latest_date.strftime('%d/%m/%Y')})")
    return price_dict, latest_date


def update_open_positions():
    """
    Met à jour les positions ouvertes avec les prix actuels
    Applique SL et TP
    """
    
    print("\n" + "="*100)
    print("PORTFOLIO MANAGER - UPDATE POSITIONS")
    print("="*100)
    
    # Récupérer les prix
    prices, latest_date = get_latest_prices()
    
    # Charger les positions ouvertes
    if not Path('open_positions.csv').exists():
        print("Aucune position ouverte.")
        return None
    
    df_positions = pd.read_csv('open_positions.csv')
    
    if df_positions.empty:
        print("Aucune position ouverte.")
        return None
    
    print(f"\n📊 Updating {len(df_positions)} open positions...")
    
    df_positions['Date'] = latest_date.strftime('%d/%m/%Y')
    
    # Mise à jour des prix et P&L
    executed_trades = []
    positions_to_keep = []
    
    for idx, row in df_positions.iterrows():
        ticker = row['Ticker']
        entry_price = row['Entry_Price']
        qty = row['Qty']
        tp_price = row['TP_Price']
        sl_price = row['SL_Price']
        entry_date = row['Entry_Date']
        
        # Récupérer le prix actuel
        current_price = prices.get(ticker, entry_price)
        
        # Calculer P&L
        current_value = current_price * qty
        entry_value = entry_price * qty
        pl_fcfa = current_value - entry_value
        pl_pct = (pl_fcfa / entry_value * 100) if entry_value > 0 else 0
        
        # Jours depuis ouverture
        entry_dt = pd.to_datetime(entry_date, format='%d/%m/%Y')
        days_open = (latest_date - entry_dt).days
        
        # Vérifier SL ou TP
        position_closed = False
        exit_reason = None
        
        if current_price >= tp_price:
            # Take Profit atteint
            executed_trades.append({
                'Entry_Date': entry_date,
                'Ticker': ticker,
                'Signal': row.get('Signal', 'N/A'),
                'Entry_Price': entry_price,
                'Qty': qty,
                'Total_Entry_Cost': entry_value,
                'Exit_Date': latest_date.strftime('%d/%m/%Y'),
                'Exit_Price': current_price,
                'Exit_Reason': 'TP_HIT',
                'Total_Exit_Value': current_value,
                'P&L_FCFA': pl_fcfa,
                'P&L_%': round(pl_pct, 2),
                'Sharpe_Calc': 'OK'
            })
            position_closed = True
            exit_reason = 'TP_HIT'
        
        elif current_price <= sl_price:
            # Stop Loss atteint
            executed_trades.append({
                'Entry_Date': entry_date,
                'Ticker': ticker,
                'Signal': row.get('Signal', 'N/A'),
                'Entry_Price': entry_price,
                'Qty': qty,
                'Total_Entry_Cost': entry_value,
                'Exit_Date': latest_date.strftime('%d/%m/%Y'),
                'Exit_Price': current_price,
                'Exit_Reason': 'SL_HIT',
                'Total_Exit_Value': current_value,
                'P&L_FCFA': pl_fcfa,
                'P&L_%': round(pl_pct, 2),
                'Sharpe_Calc': 'OK'
            })
            position_closed = True
            exit_reason = 'SL_HIT'
        
        # Garder la position si pas fermée
        if not position_closed:
            row_update = row.copy()
            row_update['Current_Price'] = current_price
            row_update['Current_Value'] = current_value
            row_update['P&L'] = pl_fcfa
            row_update['P&L_%'] = round(pl_pct, 2)
            row_update['Days_Open'] = days_open
            positions_to_keep.append(row_update)
        
        # Afficher le résumé
        status = 'CLOSED' if position_closed else 'OPEN'
        close_reason = f" ({exit_reason})" if exit_reason else ""
        print(f"  {ticker}: {qty} @ {entry_price:.0f} → {current_price:.0f} | P&L {pl_pct:+.2f}% | {status}{close_reason}")
    
    # Sauvegarder les positions mises à jour
    if positions_to_keep:
        df_open_updated = pd.DataFrame(positions_to_keep)
        df_open_updated.to_csv('open_positions.csv', index=False)
        print(f"\n✅ {len(positions_to_keep)} positions restent ouvertes")
    else:
        # Vider le fichier
        pd.DataFrame(columns=df_positions.columns).to_csv('open_positions.csv', index=False)
        print(f"\n✅ Tous les positions fermées!")
    
    # Sauvegarder les trades exécutés
    if executed_trades:
        df_trades = pd.read_csv('executed_trades.csv') if Path('executed_trades.csv').exists() else pd.DataFrame()
        df_new_trades = pd.DataFrame(executed_trades)
        df_trades = pd.concat([df_trades, df_new_trades], ignore_index=True)
        df_trades.to_csv('executed_trades.csv', index=False)
        print(f"✅ {len(executed_trades)} positions fermées et enregistrées")
    
    return {
        'positions_open': len(positions_to_keep),
        'positions_closed': len(executed_trades),
        'latest_date': latest_date
    }


def calculate_portfolio_summary():
    """
    Calcule le résumé global du portefeuille (CORE + SATELLITE)
    """
    
    print("\n" + "="*100)
    print("PORTFOLIO SUMMARY")
    print("="*100)
    
    # Charger les positions ouvertes
    df_open = pd.read_csv('open_positions.csv') if Path('open_positions.csv').exists() else pd.DataFrame()
    
    # Charger les trades exécutés
    df_executed = pd.read_csv('executed_trades.csv') if Path('executed_trades.csv').exists() else pd.DataFrame()
    
    # Calculer les totaux SATELLITE
    satellite_open_value = 0
    satellite_pl = 0
    
    if not df_open.empty:
        satellite_open_value = df_open['Current_Value'].sum() if 'Current_Value' in df_open.columns else 0
        satellite_pl = df_open['P&L'].sum() if 'P&L' in df_open.columns else 0
    
    # Trades fermés aujourd'hui
    today_pl = 0
    if not df_executed.empty:
        df_executed['Exit_Date'] = pd.to_datetime(df_executed['Exit_Date'], format='%d/%m/%Y')
        today = pd.Timestamp.today()
        df_today = df_executed[df_executed['Exit_Date'] == today]
        today_pl = df_today['P&L_FCFA'].sum() if 'P&L_FCFA' in df_today.columns else 0
    
    # Charger YTD_2026 pour le CORE
    df_ytd = pd.read_csv('YTD_2026.csv') if Path('YTD_2026.csv').exists() else pd.DataFrame()
    
    if not df_ytd.empty:
        latest_ytd = df_ytd.iloc[-1]
        core_value = latest_ytd.get('Core_Value', 0)
        total_ytd = latest_ytd.get('Total_Value', 0)
    else:
        core_value = 0
        total_ytd = 0
    
    # Affichage
    print(f"\n💰 CORE (70% - BIG CAPS):")
    print(f"   Value: {core_value:,.0f} FCFA")
    print(f"\n🤖 SATELLITE (30% - Z-SCORE ROBOT):")
    print(f"   Open Positions Value: {satellite_open_value:,.0f} FCFA")
    print(f"   P&L Open: {satellite_pl:+,.0f} FCFA")
    print(f"   P&L Today: {today_pl:+,.0f} FCFA")
    print(f"\n📊 TOTAL PORTFOLIO:")
    print(f"   Value: {total_ytd + satellite_open_value:,.0f} FCFA")
    
    print("="*100 + "\n")


def main():
    """Main execution"""
    try:
        update_open_positions()
        calculate_portfolio_summary()
    except Exception as e:
        print(f"\nERREUR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()

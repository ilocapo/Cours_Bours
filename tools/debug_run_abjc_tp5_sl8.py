#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Run a focused backtest on ABJC with TP=5% and SL=8% and export trade exits for inspection.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from src.backtester import run_backtest_single_stock
import pandas as pd

if __name__ == '__main__':
    res = run_backtest_single_stock('ABJC', capital_initial=1000000, take_profit_pct=0.05, stop_loss_pct=0.08, time_stop_days=10, falling_knife_drop_pct=0.08, verbose=True)
    if not res:
        print('No result')
        sys.exit(1)
    # The function returns the full DataFrame in res['df'] - save that for inspection
    df_stock = res.get('df')
    if df_stock is None:
        print('No df returned by backtest')
        sys.exit(1)

    # Export the full per-day dataframe (including Exit_Reason) for analysis
    export_full = os.path.join(os.getcwd(), 'output', 'backtest_reports', 'debug_full_ABJC_tp5_sl8.csv')
    df_stock.to_csv(export_full, sep=';', index=False)
    # Export only rows with exits
    df_exits = df_stock[df_stock['Exit_Reason'].notnull() & (df_stock['Exit_Reason'] != '')]
    export_exits = os.path.join(os.getcwd(), 'output', 'backtest_reports', 'debug_exits_ABJC_tp5_sl8.csv')
    df_exits.to_csv(export_exits, sep=';', index=False)
    print(f'Exported full DF to {export_full} and exits to {export_exits}')

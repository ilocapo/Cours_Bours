#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from src.backtester import run_daily_market_report, portfolio_plan

if __name__ == '__main__':
    print('Testing daily market report...')
    df = run_daily_market_report(top_n_vol=5, verbose=True)
    print(df.head())
    print('\nTesting portfolio_plan')
    print(portfolio_plan(1000000, 250, 0.01, 0.05, 0.10))

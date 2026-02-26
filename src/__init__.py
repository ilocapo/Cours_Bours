"""
Module de stratégie Z-Score pour l'analyse et le backtesting d'actions BRVM.

Contient:
  - zscore_calculator: Calcul des Z-scores, signaux et filtres
  - backtester: Simulation et backtesting de la stratégie
  - portfolio_strategy: Stratégie Core-Satellite avec gestion des dividendes
  - data_fusion: Fusion des données de plusieurs sources
"""

from .zscore_calculator import (
    charge_and_clean_data,
    calculate_zscore,
    signals_generation,
    add_filters
)

from .backtester import (
    scan_market_opportunities,
    run_backtest_single_stock,
    run_backtest_portfolio,
    parameter_grid_search
)

from .portfolio_strategy import (
    classify_stocks,
    handle_dividend_adjustments,
    core_satellite_backtest
)

__all__ = [
    'charge_and_clean_data',
    'calculate_zscore',
    'signals_generation',
    'add_filters',
    'scan_market_opportunities',
    'run_backtest_single_stock',
    'run_backtest_portfolio',
    'parameter_grid_search',
    'classify_stocks',
    'handle_dividend_adjustments',
    'core_satellite_backtest',
]

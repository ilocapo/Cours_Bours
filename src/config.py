import os
from pathlib import Path

# Chemin racine du projet
PROJECT_ROOT = str(Path(__file__).resolve().parents[1])

# Chemins de données
DATA_PATH = os.path.join(PROJECT_ROOT, "data", "runtime", "cours_boursiers_fusion.csv")

# Chemins de rapports
OUTPUT_DAILY_REPORTS = os.path.join(PROJECT_ROOT, "output", "daily_reports")
OUTPUT_BACKTEST_REPORTS = os.path.join(PROJECT_ROOT, "output", "backtest_reports")

# Créer les répertoires s'ils n'existent pas
os.makedirs(OUTPUT_DAILY_REPORTS, exist_ok=True)
os.makedirs(OUTPUT_BACKTEST_REPORTS, exist_ok=True)

# ============================================================================
# REAL PORTFOLIO SETTINGS - À ADAPTER À TON CAPITAL RÉEL
# ============================================================================
# Ce système d'entreprend avec 10M hypothétiques en backtest
# Mais en réalité tu commences avec 500K-1M XOF
# Cette section te permet d'adapter tout le système à ton capital réel
# ============================================================================

# Capital total que tu investis RÉELLEMENT (en FCFA)
# Exemples:
#   - 500_000 FCFA pour commencer petit
#   - 1_000_000 FCFA pour capital normal
#   - Les rendements en % restent identiques, juste les montants changent
REAL_PORTFOLIO_CAPITAL = 1_000_000  # À MODIFIER selon ton capital réel

# Allocation CORE vs SATELLITE vs CASH
CORE_ALLOCATION_PCT      = 0.70  # 70% en CORE (5 big caps dividend)
SATELLITE_ALLOCATION_PCT = 0.20  # 20% en SATELLITE (Z-Score robot)
CASH_ALLOCATION_PCT      = 0.10  # 10% en CASH (réserve / opportunités)

# Capital calculé automatiquement
REAL_CORE_CAPITAL      = int(REAL_PORTFOLIO_CAPITAL * CORE_ALLOCATION_PCT)
REAL_SATELLITE_CAPITAL = int(REAL_PORTFOLIO_CAPITAL * SATELLITE_ALLOCATION_PCT)
REAL_CASH_CAPITAL      = int(REAL_PORTFOLIO_CAPITAL * CASH_ALLOCATION_PCT)

# 5 stocks CORE (division égale parmi les 5)
REAL_CAPITAL_PER_CORE_STOCK = REAL_CORE_CAPITAL // 5

# Stocks CORE (ne change pas - ce sont les dividendes réguliers)
CORE_STOCKS = ['SNTS', 'ORGT', 'ONTBF', 'SAFC', 'ABJC']

# ============================================================================
# PHASE 1 ROBUSTESSE - Filtres de liquidité et position sizing
# ============================================================================

# Filtre de liquidité (ADVT = Average Daily Value Traded)
# Recalibré BRVM: 10M bloquait presque tout l'univers volatil (mid/small caps)
ADVT_MIN_FCFA = 1_500_000       # Minimum 1.5M FCFA/jour (plus agressif pour capter les mid-caps)
DAYS_TRADED_MIN = 20            # Min 20 jours tradés sur 30 (pas d'actions "mortes")

# Position sizing réaliste
MAX_POSITION_PCT = 0.08         # 8% max par trade (était 30% = trop agressif)
                                # Avec 1M capital → 80K max par position

# Slippage réaliste BRVM
SLIPPAGE_NORMAL_PCT = 0.02      # 2% (spread 1-3% + impact 1-2%)
SLIPPAGE_STRESS_PCT = 0.04      # 4% en stress test

# Gap risk management
GAP_SL_WORST_CASE = 0.12        # SL peut glisser -12% (au lieu de -5% théorique)

# Dividende CORE (stress scenario)
DIVIDEND_CORE_NORMAL = 0.08     # 8% en scénario normal
DIVIDEND_CORE_STRESS = 0.04     # 4% si dividendes coupés 50%

# Stocks SATELLITE (univers de stocks pour trading Z-Score)
# À adapter selon ton broker et liquidité
SATELLITE_STOCK_UNIVERSE = [
    'ABJC', 'ABJCI', 'ABJAN', 'ABGC', 'ABGCI', 'ABJAN',
    'BABS', 'BABS.O1', 'BICB', 'BHSN', 'BHSN.O1',
    'BOABF', 'BOABG', 'BOAM', 'BOAP', 'BOAOG', 'BOAOH',
    'CBILF', 'CBILG', 'CBILH', 'CBPRH', 'CBPRK',
    'COCONAS', 'CORIS', 'CIL',
    'ELIM', 'ETIT',
    'NEAM', 'NETRH',
    'ORGT', 'ORGT.O1',
    'PALMEQ', 'PIVS',
    'SAFC', 'SHEC', 'SNTS', 'SNTS.O1',
    'SOMDIAA', 'SONATEL', 'SONATEL.O1',
    'UNCC', 'UNOA'
]

# Paramètres de trading SATELLITE (backtest-proven parameters)
MAX_LOSS_PER_DAY_PCT = 0.02        # Maximum -2% loss per day
STOP_LOSS_PCT = 0.05               # -5% stop loss per trade (backtest optimal)
TAKE_PROFIT_PCT = 0.08             # +8% take profit per trade (backtest optimal)

# Protections contre les faux signaux (whipsaw & falling knife)
TIME_STOP_DAYS = 10                # Close position after 10 days (max holding)
FALLING_KNIFE_WINDOW = 3           # Look back 3 days for sharp drops
FALLING_KNIFE_DROP_PCT = 0.08      # Don't buy if price dropped 8%+ in 3 days

# Paramètres Z-Score
ZSCORE_WINDOW = 200                # 200-day rolling window
ZSCORE_STRONG_BUY = -2.5           # Z <= -2.5 = Strong Buy (moins rare)
ZSCORE_BUY = -2.0                  # Z <= -2.0 = Buy (fréquence plus utile)
ZSCORE_SELL = 2.5                  # Z >= +2.5 = Sell
ZSCORE_STRONG_SELL = 3.0           # Z >= +3.0 = Strong Sell

# Paramètres CORE rebalancing
CORE_WEAK_SCORE_THRESHOLD = 45     # Score < 45 = remplacer
CORE_MONITORING_FREQUENCY = "monthly"  # 1st of month

# Print debug
if __name__ == "__main__":
    print("=" * 80)
    print("REAL PORTFOLIO CONFIGURATION")
    print("=" * 80)
    print(f"Total Capital: {REAL_PORTFOLIO_CAPITAL:,} FCFA")
    print(f"  CORE (70%): {REAL_CORE_CAPITAL:,} FCFA ({REAL_CAPITAL_PER_CORE_STOCK:,} per stock)")
    print(f"  SATELLITE (30%): {REAL_SATELLITE_CAPITAL:,} FCFA")
    print()
    print(f"Risk Limits:")
    print(f"  Daily max loss: {MAX_LOSS_PER_DAY_PCT*100}%")
    print(f"  Per trade SL: {STOP_LOSS_PCT*100}%")
    print(f"  Per trade TP: {TAKE_PROFIT_PCT*100}%")
    print()
    print(f"Whipsaw/Falling Knife Protection:")
    print(f"  Time Stop: {TIME_STOP_DAYS} days (close position after max holding)")
    print(f"  Falling Knife: {FALLING_KNIFE_DROP_PCT*100}% in {FALLING_KNIFE_WINDOW} days (avoid buying)")
    print()
    print(f"Z-Score Thresholds:")
    print(f"  Strong Buy: Z <= {ZSCORE_STRONG_BUY}")
    print(f"  Buy: Z <= {ZSCORE_BUY}")
    print(f"  Sell: Z >= {ZSCORE_SELL}")
    print(f"  Strong Sell: Z >= {ZSCORE_STRONG_SELL}")
    print("=" * 80)
import os

# Chemin racine du projet
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))

# Chemins de données
DATA_PATH = os.path.join(PROJECT_ROOT, "data", "cours_boursiers_fusion.csv")

# Chemins de rapports
OUTPUT_DAILY_REPORTS = os.path.join(PROJECT_ROOT, "output", "daily_reports")
OUTPUT_BACKTEST_REPORTS = os.path.join(PROJECT_ROOT, "output", "backtest_reports")

# Créer les répertoires s'ils n'existent pas
os.makedirs(OUTPUT_DAILY_REPORTS, exist_ok=True)
os.makedirs(OUTPUT_BACKTEST_REPORTS, exist_ok=True)
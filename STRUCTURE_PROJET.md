# STRUCTURE DU PROJET

## 📂 Hiérarchie des répertoires

```
Cours_Bours/
│
├── README.md                              # Documentation principale du projet
├── EXEMPLE_USAGE_PARAMETRES.md            # Guide d'utilisation des paramètres
├── main.py                                # Point d'entrée principal (menu interactif)
├── config.py                              # Configuration centralisée des chemins
│
├── data/                                  # 📊 Données d'entrée
│   └── cours_boursiers_fusion.csv         # Données BRVM fusionnées
│
├── src/                                   # 📦 Modules métier
│   ├── __init__.py                        # Exports des fonctions principales
│   ├── zscore_calculator.py               # Calcul Z-Score et signaux
│   ├── backtester.py                      # Simulation et backtesting
│   ├── portfolio_strategy.py               # Stratégie Core-Satellite
│   └── data_fusion.py                     # Fusion de données (optionnel)
│
├── output/                                # 📁 Rapports générés
│   ├── daily_reports/                     # Rapports quotidiens
│   │   └── daily_report_YYYYMMDD.csv
│   └── backtest_reports/                  # Rapports de backtesting
│       ├── backtest_report_TICKER_YYYYMMDD.csv
│       └── grid_search_TICKER_YYYYMMDD.csv
│
├── utils/                                 # 🛠️ Utilitaires (vide pour l'instant)
│   └── __init__.py
│
└── __pycache__/                           # Cache Python (exclu de git)
```

---

## 🔄 Description des modules

### `src/zscore_calculator.py`
Calcul des statistiques et génération des signaux d'achat/vente.

**Fonctions principales :**
- `charge_and_clean_data()` - Charge et nettoie le CSV
- `calculate_zscore()` - Calcul du Z-Score groupé par action
- `signals_generation()` - Génère signaux (Buy, Sell, Hold)
- `add_filters()` - Applique filtres volatilité, volume, tendance

### `src/backtester.py`
Simulation de la stratégie et backtesting avec gestion risques.

**Fonctions principales :**
- `scan_market_opportunities()` - Scan quotidien des signaux
- `run_backtest_single_stock()` - Backtest une action (avec TP/SL/TimeStop/FK)
- `run_backtest_portfolio()` - Backtest portefeuille de N actions
- `parameter_grid_search()` - Optimisation par recherche en grille

### `src/portfolio_strategy.py`
Stratégie Core-Satellite avec gestion des dividendes.

**Fonctions principales :**
- `classify_stocks()` - Classifie CORE vs SATELLITES
- `handle_dividend_adjustments()` - Ajuste pour dividendes
- `core_satellite_backtest()` - Backtest portfolio mixte

### `src/data_fusion.py`
Fusion de données de sources multiples (si applicable).

---

## 🚀 Utilisation

### 1. Mode interactif (recommandé)
```bash
python main.py
```
Affiche un menu avec 5 options :
1. **Analyse complète** - Scan + Backtest + Portfolio
2. **Grid Search** - Optimise paramètres pour une action
3. **Core-Satellite** - Teste stratégie mixte
4. **Backtest rapide** - Test avec paramètres perso
5. **Quitter**

### 2. Usage Python direct
```python
from src import (
    scan_market_opportunities,
    run_backtest_single_stock,
    parameter_grid_search,
    core_satellite_backtest
)

# Scan quotidien
scan_market_opportunities()

# Backtest avec paramètres personnalisés
result = run_backtest_single_stock(
    'SNTS',
    take_profit_pct=0.10,  # +10%
    stop_loss_pct=0.03,    # -3%
    time_stop_days=15
)

# Optimiser les paramètres
df_best = parameter_grid_search('SNTS')
```

### 3. Importer les fonctions
```python
import sys
sys.path.insert(0, 'src')

from backtester import run_backtest_single_stock
from portfolio_strategy import core_satellite_backtest
```

---

## 📝 Configuration

Modifiez `config.py` pour changer les chemins :
```python
DATA_PATH = os.path.join(PROJECT_ROOT, "data", "cours_boursiers_fusion.csv")
OUTPUT_DAILY_REPORTS = os.path.join(PROJECT_ROOT, "output", "daily_reports")
OUTPUT_BACKTEST_REPORTS = os.path.join(PROJECT_ROOT, "output", "backtest_reports")
```

---

## 📊 Fichiers générés

### Daily Reports
- **Chemin :** `output/daily_reports/`
- **Format :** `daily_report_YYYYMMDD.csv`
- **Contenu :** Signaux d'achat/vente détectés ce jour

### Backtest Reports
- **Chemin :** `output/backtest_reports/`
- **Fichiers :**
  - `backtest_report_TICKER_YYYYMMDD.csv` - Backtest détaillé
  - `grid_search_TICKER_YYYYMMDD.csv` - Grille optimisation

---

## 🎯 Paramètres clés

### Risques et Sorties
| Paramètre | Défaut | Rôle |
|-----------|--------|------|
| `take_profit_pct` | 8% | Seuil de gain avant vente |
| `stop_loss_pct` | 5% | Seuil de perte avant vente |
| `time_stop_days` | 10 | Jours max avant liquidation |
| `falling_knife_drop_pct` | 8% | Chute max tolérée avant achat |

### Filtres
| Filtre | Description |
|--------|-------------|
| Volatilité | Écart-type annualisé < 30% |
| Volume | Transactions totales > 1000 |
| Tendance | SMA 20 > SMA 50 (haussier) |

---

## ✅ Checklist de déploiement

- [x] Structure de dossiers créée
- [x] Modules nommés explicitement
- [x] Imports centralisés via `__init__.py`
- [x] Configuration centralisée dans `config.py`
- [x] Données dans dossier dédié
- [x] Rapports dans dossier dédié
- [x] `.gitignore` configuré
- [x] `main.py` avec menu interactif
- [x] Documentation complète

---

## 🔗 Fichiers connexes

- **EXEMPLE_USAGE_PARAMETRES.md** - Guide détaillé des paramètres et grid search
- **README.md** - Documentation générale du projet
- **config.py** - Configuration centralisée

---

## 💡 Recommandations

1. **Toujours utiliser** `config.py` pour les chemins (évite les hardcodes)
2. **Lancer via** `main.py` pour l'interface interactive
3. **Exporter rapports** dans `output/` (déjà géré automatiquement)
4. **Versionner uniquement** le code et la documentation (voir `.gitignore`)
5. **Tester sur SNTS** en premier (historique complet, fiable)

---

**Dernière mise à jour :** 2026-02-26

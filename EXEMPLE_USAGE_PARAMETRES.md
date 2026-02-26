# Guide d'utilisation : Paramètres TP/SL/TimeStop/FK

## Résumé des modifications

Les fonctions de backtest (`run_backtest_single_stock` et `parameter_grid_search`) supportent maintenant des paramètres configurables pour optimiser la stratégie :

- **Take Profit (TP)** : Seuil de gain avant liquidation (ex: 0.08 = +8%)
- **Stop Loss (SL)** : Seuil de perte avant liquidation (ex: 0.05 = -5%)
- **Time-Stop** : Nombre de jours de détention max avant liquidation (ex: 10)
- **Falling-Knife (FK)** : Protection contre l'achat lors d'une chute rapide

---

## Exemples d'utilisation

### 1. Backtest avec paramètres par défaut

```python
from 03_backtest import run_backtest_single_stock

# Utilise les paramètres par défaut
# TP=8%, SL=5%, TimeStop=10j, FK_drop=8%
result = run_backtest_single_stock('SNTS', capital_initial=1000000)
```

### 2. Backtest avec paramètres personnalisés

```python
from 03_backtest import run_backtest_single_stock

# Paramètres agressifs : TP faible, SL faible, Time-Stop court
result = run_backtest_single_stock(
    'SNTS',
    capital_initial=1000000,
    frais_transaction=0.01,
    fenetre_zscore=200,
    take_profit_pct=0.05,      # +5% seulement
    stop_loss_pct=0.03,        # -3% seulement
    time_stop_days=5,          # Vendre après 5 jours max
    falling_knife_drop_pct=0.05, # FK: chute > 5%
    verbose=True
)

print(f"Rendement: {result['rendement_algo']:.2f}%")
print(f"Sharpe: {result['sharpe_ratio']:.4f}")
```

### 3. Backtest silencieux (verbose=False)

Utile pour les boucles ou la grid search:

```python
result = run_backtest_single_stock(
    'ABJC',
    take_profit_pct=0.10,
    stop_loss_pct=0.05,
    time_stop_days=15,
    verbose=False  # Pas d'affichage
)
```

### 4. Grid Search pour optimiser les paramètres

La fonction `parameter_grid_search()` teste automatiquement plusieurs combinaisons et trouve la meilleure:

```python
from 03_backtest 
import parameter_grid_search

# Lance une recherche optimale sur une action
# Teste 4×3×4×3 = 144 combinaisons
df_results = parameter_grid_search('SNTS', capital_initial=1000000)

# Les résultats sont triés par Sharpe Ratio (meilleure métrique risque/rendement)
# et exportés dans grid_search_SNTS_YYYYMMDD.csv
```

---

## Grilles testées par parameter_grid_search()

```python
TP values      : [0.05, 0.08, 0.10, 0.15]        # +5%, +8%, +10%, +15%
SL values      : [0.03, 0.05, 0.08]              # -3%, -5%, -8%
TimeStop values: [5, 10, 15, 20]                 # jours
FK_drop values : [0.05, 0.08, 0.10]              # -5%, -8%, -10%

Total: 144 combinaisons testées
```

---

## Interprétation des résultats

Après un backtest, examinez ces métriques:

| Métrique | Signification | Cible |
|----------|---------------|-------|
| **Rendement** | Performance totale en % | > 0% idéalement > 6.5% (safe rate) |
| **Surperf_BH** | vs Buy & Hold | Positif = stratégie meilleure |
| **Surperf_Safe** | vs 6.5% UEMOA | Positif = bat le taux sans risque |
| **Sharpe** | Risque/Rendement | Plus élevé = meilleur |
| **Volatilite** | Volatilité annualisée | Plus bas = plus stable |
| **Trades** | Nombre d'ordres exécutés | Affiche activité |

---

## Recommandations

### Pour marché volatile (comme BRVM):
- **TP** : 10-15% (attendez un rebond significatif)
- **SL** : -5 à -8% (tolère petites variations)
- **TimeStop** : 15-20 jours (marché illiquide, patience)
- **FK** : 8-10% (évite les chutes rapides)

### Pour mean-reversion rapide:
- **TP** : 5-8% (prise rapide de gains)
- **SL** : -3% (risque limité)
- **TimeStop** : 5-10 jours (sorties rapides)
- **FK** : 5% (protège fortement)

### Pour portefeuille équilibré:
- **TP** : 8% (par défaut)
- **SL** : 5% (par défaut)
- **TimeStop** : 10j (par défaut)
- **FK** : 8% (par défaut)

---

## Scripts de lancement

### Lancer la grid search (longue, ~10-20 min):

Décommentez dans `03_backtest.py`, section `if __name__ == "__main__"`:

```python
print("\n\n🔎 PHASE 4: GRID SEARCH OPTIMISATION PARAMÈTRES")
df_grid_results = parameter_grid_search('SNTS', capital_initial=1000000)
```

Puis:
```bash
python 03_backtest.py
```

### Tester une combinaison spécifique rapidement:

```bash
python -c "
from 03_backtest import run_backtest_single_stock
result = run_backtest_single_stock(
    'SNTS',
    take_profit_pct=0.12,
    stop_loss_pct=0.04,
    time_stop_days=12
)
"
```

---

## Sortie CSV de Grid Search

Le fichier `grid_search_TICKER_YYYYMMDD.csv` contient:
- TP, SL, TimeStop, FK_Drop (paramètres testés)
- Rendement, Surperf_BH, Surperf_Safe (performances)
- Sharpe, Volatilite (risque)
- Trades, Capital_Final (détails)

**Triée par Sharpe Ratio décroissant** → la première ligne = meilleure combinaison

---

## Exemple de résultat Grid Search

```
TP   SL   TimeStop  FK_Drop  Rendement  Surperf_BH  Sharpe   Volatilite  Trades
0.10 0.03    15       0.08      18.5       +15.2    0.842      12.3       42
0.08 0.05    10       0.08      16.2       +12.8    0.718      14.1       51
0.12 0.04    12       0.05      15.1       +11.4    0.691      15.8       38
...
```

Ici : **TP=10%, SL=3%, TimeStop=15j, FK=8%** offre le meilleur ratio risque/rendement.

---

## Notes importantes

1. **Falling-Knife** : Ne teste l'évitement que sur les jours+3 précédents
   - Si prix chute > FK_drop%, signal d'achat est ignoré
   - Évite les "falling knives" (chutes rapides sans rebond)

2. **Ex-dividendes** : Les achats le jour de l'ex-dividende sont évités automatiquement
   - Protège contre les fausses baisses suite aux dividendes

3. **Time-Stop critique** : Sur BRVM (illiquide), très important
   - Libère capital "mort" (bloqué sans rebond)
   - Réalloue vers meilleurs opportunités

4. **Frais** : Application réaliste à chaque trade
   - 1% SGI déjà inclus dans calculs

---

## Prochaines étapes

1. **Tester** : Lance grid search sur 1-2 actions clés
2. **Identifier** : Les paramètres optimaux par Sharpe Ratio
3. **Adapter** : Ajuste à ta tolérance au risque
4. **Déployer** : Utilise dans `run_backtest_portfolio()` avec meilleurs paramètres

Bonne optimisation! 🚀

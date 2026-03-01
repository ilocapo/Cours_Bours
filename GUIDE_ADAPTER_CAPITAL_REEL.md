# Adapter le système à son capital réel

## La problématique

Ton système backtest (2017-2025) suppose un portefeuille hypothétique de **10M FCFA** :
- CORE (70%) = 7M FCFA
- SATELLITE (30%) = 3M FCFA

**Mais en réalité**, tu peux investir seulement **500K-1M FCFA** le mois prochain.

**La bonne nouvelle**: Les rendements en % restent identiques, tu dois juste adapter les montants.

---

## Étape 1 : C'est quoi ton capital réel ?

**Vote pour un montant :**

| Montant | Raison | CORE | SATELLITE |
|---------|--------|------|-----------|
| 500K FCFA | Budget initial faible | 350K | 150K |
| 1M FCFA | Budget normal | 700K | 300K |
| 2M FCFA | Budget agressif | 1.4M | 600K |
| 5M FCFA | Budget confortable | 3.5M | 1.5M |
| 10M FCFA | Budget full (comme backtest) | 7M | 3M |

---

## Étape 2 : Configure ton capital dans `config.py`

**Localisation :** `Cours_Bours/config.py` ligne ~30

**Cherche cette ligne :**

```python
REAL_PORTFOLIO_CAPITAL = 1_000_000  # À MODIFIER selon ton capital réel
```

**Remplace le 1_000_000 par TON capital :**

```python
# Exemple 1: Budget 500K
REAL_PORTFOLIO_CAPITAL = 500_000

# Exemple 2: Budget 1M
REAL_PORTFOLIO_CAPITAL = 1_000_000

# Exemple 3: Budget 2M
REAL_PORTFOLIO_CAPITAL = 2_000_000
```

**C'est tout !** Les calculs se font automatiquement.

---

## Étape 3 : Vérifie la configuration

**Commande :**

```powershell
python config.py
```

**Résultat (exemple avec 1M FCFA) :**

```
================================================================================
REAL PORTFOLIO CONFIGURATION
================================================================================
Total Capital: 1,000,000 FCFA
  CORE (70%): 700,000 FCFA (140,000 per stock)
  SATELLITE (30%): 300,000 FCFA

Risk Limits:
  Daily max loss: 2.0%
  Per trade SL: 8.0%
  Per trade TP: 5.0%

Z-Score Thresholds:
  Strong Buy: Z <= -3.0
  Buy: Z <= -2.5
  Sell: Z >= +2.5
  Strong Sell: Z >= +3.0
================================================================================
```

---

## Étape 4 : Comprendre ce qui change

### CORE Holdings (70%)

Exemple avec **1M FCFA** :

```
Total CORE = 700K FCFA
Par stock = 700K ÷ 5 = 140K par action

Allocation:
├─ SNTS: 140K
├─ ORGT: 140K
├─ ONTBF: 140K
├─ SAFC: 140K
└─ ABJC: 140K
```

**vs exemple avec 500K FCFA** :

```
Total CORE = 350K FCFA
Par stock = 350K ÷ 5 = 70K par action

Allocation:
├─ SNTS: 70K
├─ ORGT: 70K
├─ ONTBF: 70K
├─ SAFC: 70K
└─ ABJC: 70K
```

**vs backtest original (10M FCFA)** :

```
Total CORE = 7M FCFA
Par stock = 7M ÷ 5 = 1.4M par action

Allocation:
├─ SNTS: 1.4M
├─ ORGT: 1.4M
├─ ONTBF: 1.4M
├─ SAFC: 1.4M
└─ ABJC: 1.4M
```

### SATELLITE Signals (30%)

Exemple - **Z-Score Strong Buy signal pour ABJC à 1400 FCFA** :

**Avec 1M FCFA (300K SATELLITE) :**

```
Recommended Qty = 300K ÷ 1400 = 214 shares
Cost = 214 × 1400 = 300K (100% du capital)
```

**Avec 500K FCFA (150K SATELLITE) :**

```
Recommended Qty = 150K ÷ 1400 = 107 shares
Cost = 107 × 1400 = 149.8K~≈ 150K
```

**Avec 10M FCFA (3M SATELLITE) - backtest :**

```
Recommended Qty = 3M ÷ 1400 = 2,143 shares
Cost = 2,143 × 1400 = 3M
```

**Les % de gain/perte restent IDENTIQUES.**

---

## Étape 5 : Checklist d'adaptation

### ✅ Avant de démarrer le 02/03/2026

- [ ] J'ai décidé mon capital réel (500K, 1M, 2M, etc)
- [ ] J'ai modifié `config.py` avec `REAL_PORTFOLIO_CAPITAL = X`
- [ ] J'ai vérifié avec `python config.py` que les calculs sont corrects
- [ ] Je comprends que mon CORE par stock est `capital÷5` et non pas 1.4M
- [ ] Je comprends que mes signaux SATELLITE seront échelonnés proportionnellement

### ✅ Exemple concret (1M FCFA)

**Mon allocation :**

```
Total: 1M FCFA
├─ CORE (70%): 700K
│  └─ 5 stocks @ 140K chacun
├─ SATELLITE (30%): 300K
│  └─ Z-Score robot trades
```

**Si ABJC Z-Score = -3.0 (Strong Buy) à 1400 FCFA :**

```
Qty à acheter = 300K ÷ 1400 = 214 shares
Capital utilisé = 214 × 1400 = 300K
Profit cible = 214 × (1400 × 1.05) = 315K → +15K (+5%)
Loss stop = 214 × (1400 × 0.92) = 276K → -24K (-8%)
```

**Si ABJC montait à 1470 (TP hit):**

```
Profit = (1470 - 1400) × 214 = 15K FCFA
Rendement = 15K / 300K = 5% (identique au % du backtest)
```

---

## Étape 6 : Comment ça change les fichiers

### `daily_signals.py`

**AVANT (hardcoded 3M:**

```python
qty = int(3_000_000 / price)  # Toujours 3M
```

**APRÈS (dynamique) :**

```python
qty = int(REAL_SATELLITE_CAPITAL / price)  # Adapté à ton capital
```

### `core_rebalancing.py`

**AVANT (hardcoded 1.4M):**

```python
CORE_VALUE_PER_STOCK = 1_400_000  # Toujours 1.4M
```

**APRÈS (dynamique) :**

```python
CORE_VALUE_PER_STOCK = REAL_CAPITAL_PER_CORE_STOCK  # Adapté à ton capital
```

---

## Étape 7 : Impact sur les rendements

### ✅ Les rendements en % restent identiques

```
Backtest: 10M → 44.51M = +345% = 18% CAGR
Ton portefeuille 1M → 4.451M = +345% = 18% CAGR (mêmes %)
Ton portefeuille 500K → 2.226M = +345% = 18% CAGR (mêmes %)
```

### ❌ Les rendements en FCFA sont proportionnels

```
Backtest 10M:  Gain = 34.51M FCFA
Ton portefeuille 1M:  Gain = 3.451M FCFA (10x moins)
Ton portefeuille 500K: Gain = 1.726M FCFA (20x moins)
```

---

## Étape 8 : Quand tu augmentes ton capital

**Exemple :** Tu commences avec 500K, puis ajoutes 500K de plus après 3 mois

**2 options :**

### Option A: Mettre à jour config.py

```python
# Ancien
REAL_PORTFOLIO_CAPITAL = 500_000

# Nouveau
REAL_PORTFOLIO_CAPITAL = 1_000_000
```

**Effet:**
- Tous les signaux futur changeront de montant
- Les anciennes positions restent dans `open_positions.csv`
- Les nouveaux signaux utilisent le nouveau capital

### Option B: Ajouter manuellement les positions

```
- Garder config.py à 500K
- Ajouter les nouvelles positions manuellement dans open_positions.csv
- Seulement mettre à jour config.py si tu veux que TOUS les signaux utilisent le nouveau capital
```

**Recommandation:** Option A (mettre à jour config) si tu veux que le système soit cohérent.

---

## Étape 9 : Troubleshooting

### Q: J'ai mis 500K mais les signaux donnent des Qty énormes

**R:** Vérifiez que `config.py` a bien été sauvegardé et que Python l'a rechargé. Terminal:

```powershell
python config.py  # Vérifier que REAL_SATELLITE_CAPITAL = 150_000 (500K × 30%)
```

### Q: Mes gains/pertes en FCFA semblent petits

**R:** C'est normal - tu as moins de capital ! Compare les % pas les FCFA:

```
500K avec +5% gain = 25K FCFA (pas 150K)
1M avec +5% gain = 50K FCFA
```

### Q: Comment revenir au backtest (10M)?

**R:** Mets à jour config.py:

```python
REAL_PORTFOLIO_CAPITAL = 10_000_000  # Revenir à 10M
```

---

## Résumé

| Étape | Action | Fichier | Impact |
|-------|--------|---------|--------|
| 1 | Décide ton capital | N/A | Décision |
| 2 | Modifie config.py | config.py | Configuration globale |
| 3 | Vérifie avec `python config.py` | Terminal | Validation |
| 4 | daily_signals.py utilise la valeur | daily_signals.py | Qty signaux adaptée |
| 5 | core_rebalancing.py utilise la valeur | core_rebalancing.py | Allocation CORE adaptée |
| 6 | Reste du système reste identique | N/A | Aucun changement |

**UN SEUL FICHIER À MODIFIER : `config.py` ligne ~30**

---

## Quick Start (TL;DR)

1. Ouvre `config.py`
2. Change `REAL_PORTFOLIO_CAPITAL = 1_000_000` → ton montant real
3. Run `python config.py` → vérify les calculs
4. Go to 02/03/2026 08:00 et run `python daily_signals.py`
5. Les signaux seront automatiquement adaptés à ton capital ✅


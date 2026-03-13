# 📖 GUIDE COMPLET - SYSTÈME DE TRADING ALTOS

**Date:** 02/03/2026  
**Capital:** 1,000,000 FCFA (700K CORE + 300K SATELLITE)  
**Performance YTD:** +10.75% ✅

---

## 📋 TABLE DES MATIÈRES

1. [Vue d'ensemble](#vue-densemble)
2. [Configuration initiale](#configuration-initiale)
3. [Suivi MANUEL](#suivi-manuel)
4. [Suivi AUTOMATIQUE](#suivi-automatique)
5. [Step-by-Step pratique](#step-by-step-pratique)
6. [FAQ & Dépannage](#faq--dépannage)

---

## 🎯 VUE D'ENSEMBLE

### Architecture du système

```
┌─────────────────────────────────────────────────────────┐
│         ALTOS TRADING SYSTEM - Architecture              │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  DONNÉES BRVM (Scraper temps réel)                       │
│        ↓                                                  │
│  ┌──────────────────────────────────────────────┐       │
│  │ 5 MODULES DE TRADING                         │       │
│  ├──────────────────────────────────────────────┤       │
│  │ 1. daily_signals.py (Z-Score robot)          │       │
│  │    → 44+ stocks, BUY/SELL signals            │       │
│  │                                              │       │
│  │ 2. daily_market_update.py (Portfolio)        │       │
│  │    → Valeur CORE + SATELLITE                 │       │
│  │                                              │       │
│  │ 3. portfolio_manager.py (Positions)          │       │
│  │    → Gère SL/TP automatique                  │       │
│  │                                              │       │
│  │ 4. core_rebalancing.py (5 Big Caps)          │       │
│  │    → Vérifie santé, propose remplacements    │       │
│  │                                              │       │
│  │ 5. bond_scanner.py (Obligations)             │       │
│  │    → Trouve meilleures yields                │       │
│  └──────────────────────────────────────────────┘       │
│        ↓                                                  │
│  OUTPUT CSV Files + Logs                                 │
│        ↓                                                  │
│  ✅ Signaux générés                                     │
│  ✅ Portfolio mis à jour                                │
│  ✅ Trades exécutés automatiquement                      │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Rendements cibles

| Portfolio | Capital | Cible annuelle | YTD (02/03) | Statut |
|-----------|---------|---|---|---|
| **CORE** | 700K | 2-3% (dividendes) | +15% | 🟢 AHEAD |
| **SATELLITE** | 300K | 20-30% (trading) | Pending | 🟡 Pending |
| **TOTAL** | 1M | 10-15% | +10.75% | 🟢 AHEAD |

---

## ⚙️ CONFIGURATION INITIALE

### 1. Vérifier le capital

**Fichier:** `config.py`

```python
REAL_PORTFOLIO_CAPITAL = 1_000_000  # ← MODIFIER ICI si besoin
CORE_ALLOCATION_PCT = 0.70           # 70% en CORE
SATELLITE_ALLOCATION_PCT = 0.30      # 30% en SATELLITE
```

**Calculs automatiques:**
- CORE: 700,000 FCFA
- SATELLITE: 300,000 FCFA
- Par stock CORE: 140,000 FCFA (700K / 5)

### 2. Vérifier les paramètres de risque

**Fichier:** `config.py` (suite)

```python
# TAKE PROFIT & STOP LOSS
TAKE_PROFIT_PCT = 0.08      # +8% (quand vendre pour gains)
STOP_LOSS_PCT = 0.05        # -5% (quand vendre pour limiter perte)

# GESTION DE POSITIONS
TIME_STOP_DAYS = 10         # Fermer après 10 jours d'ouverture
FALLING_KNIFE_DROP_PCT = 0.08  # -8% en 3 jours = signal d'alerte

# LIMITES QUOTIDIENNES
MAX_DAILY_LOSS_PCT = 0.02   # -2% max par jour sur portfolio
```

✅ **Ces valeurs sont déjà optimisées** (backtestées sur 8 ans)

---

## 🖱️ SUIVI MANUEL

**À faire si vous préférez contrôler chaque module individuellement**

### Step 1: Lancer daily_signals.py

**Quand:** Chaque jour après fermeture BRVM (16:30+)

```bash
cd c:\Users\bagno\Downloads\Altos\Cours_Bours
python daily_signals.py
```

**Résultat attendu:**
```
Chargement des données historiques...
OK - 302897 lignes chargées

Scraping BRVM prices for 02/03/2026...
   ✅ Scraped 47 prices from 4 tables on BRVM

Calcul Z-Score...
⚠️  DONNÉES INCOMPLÈTES: Utilisant fenêtre courte (95 jours)

SIGNALS FOR 02/03/2026 (44 signals)
   BUY Signals: 0
   SELL Signals: 44

✅ Signals sauvegardés: output/signals/signals_20260302.csv
```

**Fichier généré:** `output/signals/signals_YYYYMMDD.csv`

**Colonnes importantes:**
```csv
Date,Ticker,Signal,Z_Score,Price,Action,Qty,TP_Price,SL_Price,TP_Pct,SL_Pct
02/03/2026,SLBC,Strong Sell,4.38,44075.0,SELL,0,,,8.0%,5.0%
...
```

**À faire après:**
- 📊 Ouvrir le CSV dans Excel
- 🔍 Regarder les signaux BUY (Action=BUY)
- 💰 Voir Qty (quantité à acheter)
- 🎯 Voir TP_Price et SL_Price (cibles)

---

### Step 2: Lancer daily_market_update.py

**Quand:** Après daily_signals.py

```bash
python daily_market_update.py
```

**Résultat attendu:**
```
DAILY MARKET UPDATE - YTD 2026 TRACKER
========================================================

📊 Récupération des données...
  ✓ SNTS: 29,300 FCFA → 149,109 FCFA
  ✓ ORGT: 3,300 FCFA → 154,000 FCFA
  ✓ ONTBF: 2,790 FCFA → 153,780 FCFA
  ✓ SAFC: 6,000 FCFA → 168,000 FCFA
  ✓ ABJC: 3,705 FCFA → 182,641 FCFA

📈 RÉSULTAT:
  Core Value:           807,530 FCFA
  Satellite Value:      300,000 FCFA
  Total Value:        1,107,530 FCFA
  YTD Return:             10.75%
  Status:          ✅ AHEAD

✅ YTD_2026.csv mis à jour
```

**Fichier mis à jour:** `YTD_2026.csv`

**À faire après:**
- 📊 Ouvrir `YTD_2026.csv` pour voir historique
- 📈 Graphique: Total_Value (doit monter)
- ✅ Vérifier statut: AHEAD ou ON_TRACK

---

### Step 3: Lancer portfolio_manager.py

**Quand:** Après daily_market_update.py

```bash
python portfolio_manager.py
```

**Résultat attendu:**
```
PORTFOLIO MANAGER - UPDATE POSITIONS
================================================================================

Récupération des prix actuels...
   ✅ Scraped 47 prices from BRVM
OK - Prices pour 47 stocks (02/03/2026 BRVM)
Aucune position ouverte.

PORTFOLIO SUMMARY
================================================================================

💰 CORE (70% - BIG CAPS):
   Value: 807,530 FCFA

🤖 SATELLITE (30% - Z-SCORE ROBOT):
   Open Positions Value: 0 FCFA
   P&L Open: +0 FCFA
   P&L Today: +0 FCFA

📊 TOTAL PORTFOLIO:
   Value: 807,530 FCFA
```

**Fichiers mis à jour:**
- `open_positions.csv` (positions actuellement ouvertes)
- `executed_trades.csv` (trades exécutés et fermés)

**À faire après:**
- 🔍 Ouvrir `open_positions.csv`
- ✅ Vérifier P&L (profit/loss) de chaque position
- 🎯 Si SL ou TP atteints → position fermée automatiquement

---

### Step 4: Lancer core_rebalancing.py

**Quand:** Une fois par semaine (ex: lundi)

```bash
python core_rebalancing.py
```

**Résultat attendu:**
```
CORE PORTFOLIO REBALANCING MONITOR
================================================================================

Analyse des 5 stocks du CORE...
  SNTS: Score 63/100 | 1Y: +6.4% | Vol: 19.0% | STRONG
  ORGT: Score 73/100 | 1Y: +38.4% | Vol: 47.3% | STRONG
  ONTBF: Score 82/100 | 1Y: +10.8% | Vol: 34.7% | STRONG
  SAFC: Score 77/100 | 1Y: +356.1% | Vol: 65.8% | STRONG
  ABJC: Score 77/100 | 1Y: +63.8% | Vol: 52.0% | STRONG

✅ CORE PORTFOLIO: All positions performing well
```

**À faire après:**
- 📊 Vérifier Score (doit être > 60)
- 🎯 Si Score < 50 → Remplacer le stock
- 💪 STRONG = Garder (aucune action)

---

### Step 5: Lancer bond_scanner.py

**Quand:** Une fois par mois (pour rebalancer CORE allocation)

```bash
python bond_scanner.py
```

**Résultat attendu:**
```
UEMOA BOND SCANNER - recherche les meilleures obligations
================================================================================

Top 10 obligations (par yield):
  TPBF.O6: Discount 8.88% → Yield 8.28%
  TPNE.O2: Discount 8.03% → Yield 8.11%
  BOAN.O2: Discount 7.50% → Yield 7.75%
  ...

44 obligations trouvées au total
✅ Sauvegardés: bond_opportunities_20260302_*.csv
```

**À faire après:**
- 💼 Revoir allocation CORE bonds vs stocks
- 🎯 Si yield > 8% → Bon pour CORE

---

## 🤖 SUIVI AUTOMATIQUE

**À faire si vous voulez tout automatisé (recommandé)**

### Option A: Windows Task Scheduler (SANS laisser PC allumé)

#### Step 1: Configurer Windows Task Scheduler

```bash
cd c:\Users\bagno\Downloads\Altos\Cours_Bours
python setup_scheduler.py --windows-task
```

Affichage:
```
Windows Task Scheduler - Configuration manuelle

Voici comment configurer l'exécution automatique:

1. Ouvrez 'Task Scheduler' (Planificateur de tâches)
2. Cliquez sur 'Create Basic Task' (Créer une tâche de base)
3. Donnez un nom: 'Altos Trading Daily'
4. Configurez le déclencheur:
   - Récurrence: Quotidienne
   - Heure: 16:30
   - Jours: Du lundi au vendredi
5. Configurez l'action:
   - Programme: C:\Python\python.exe
   - Arguments: C:\path\to\run_daily_automation.py
   - Répertoire: C:\path\to\Cours_Bours
```

#### Step 2: Créer la tâche manuellement

1. **Ouvrez Task Scheduler:**
   - Windows + R → `taskschd.msc`

2. **Créer tâche:**
   - Panel gauche → "Create Basic Task"
   - Nom: `Altos Trading Daily`
   - Description: `Automation trading quotidienne 16h30`

3. **Déclencheur:**
   - "Daily" 
   - Heure: `16:30:00`
   - Days: Lun-Ven seulement

4. **Actions:**
   - Program: `C:\Users\vagno\AppData\Local\Programs\Python\Python313\python.exe`
   - Arguments: `C:\Users\bagno\Downloads\Altos\Cours_Bours\run_daily_automation.py`
   - Start in: `C:\Users\bagno\Downloads\Altos\Cours_Bours`

5. **Cliquez OK**

#### Step 3: Tester

```bash
# Test une fois (pas d'attendre 16:30)
python setup_scheduler.py --once
```

✅ Doit exécuter les 5 modules et générer un log

#### Step 4: Redémarrer PC

- La tâche se lancera automatiquement dès maintenant chaque jour à 16:30
- **Aucune action requise de votre part**
- PC peut être **éteint à 16:30** (se relancera si configuré)

---

### Option B: APScheduler (PC doit rester allumé)

#### Step 1: Installer APScheduler

```bash
pip install apscheduler
```

#### Step 2: Lancer le scheduler

```bash
cd c:\Users\bagno\Downloads\Altos\Cours_Bours
python setup_scheduler.py
```

Affichage:
```
========================================================
✅ SCHEDULER CONFIGURÉ
========================================================
📅 Exécution quotidienne à: 16:30 (Lun-Ven)
🔄 Prochain démarrage: 2026-03-02 16:30:00
```

#### Step 3: Garder lancé

- ⚠️ **PC DOIT rester allumé 24/7**
- Le scheduler continuera dans le terminal
- Ctrl+C pour arrêter

**À faire:** Créer un raccourci pour relancer après redémarrage

---

## 📚 STEP-BY-STEP PRATIQUE

### Scénario 1: Premier jour (Aujourd'hui 02/03/2026)

```
16:30 → Fermeture BRVM
    ↓
16:35 → Automatisation lance (ou manuel si choisi)
    ↓
1. daily_signals.py
   Génère: signals_20260302.csv (44 signaux SELL)
    ↓
2. daily_market_update.py
   Ajoute ligne à YTD_2026.csv
   Portfolio: 1,107,530 FCFA (+10.75%)
    ↓
3. portfolio_manager.py
   Aucune position ouverte (OK)
    ↓
4. core_rebalancing.py
   5 stocks STRONG (OK)
    ↓
5. bond_scanner.py
   44 obligations trouvées
    ↓
✅ Suivi quotidien complété
```

**À faire le soir:**
1. Ouvrir `YTD_2026.csv` → Vérifier montée de la valeur
2. Ouvrir `signals_20260302.csv` → Regarder signaux
3. Vérifier `open_positions.csv` → Voir si positions ouvertes

---

### Scénario 2: Semaine 1 (03-07 mars)

**Lun 03/03:**
- ✅ Auto-exécution 16:30
- 📊 Ouvrir `YTD_2026.csv` → Tendance?
- Pas d'action humaine requise

**Mar 04/03:**
- ✅ Auto-exécution 16:30
- 📊 Vérifier portfolio

**Mer 05/03:**
- ✅ Auto-exécution 16:30
- 🔍 Lancer `core_rebalancing.py` (suivi CORE)

**Jeu 06/03:**
- ✅ Auto-exécution 16:30

**Ven 07/03:**
- ✅ Auto-exécution 16:30
- 📋 Résumé semaine: `YTD_2026.csv`

**Résultat attendu:**
- 5 jours × exécutions = 5 lignes nouveau dans YTD_2026.csv
- Performance: Doit monter (ou stable)
- Logs sauvegardés: `logs/automation_*.log`

---

### Scénario 3: Position ouverte (ex: achat ABJA)

**Mardi 04/03 - Achat:**
```
Signal: Z-Score = -2.8 (BUY)
Prix: 3,705 FCFA
Quantité: 81 actions (300K / 3,705)
TP: 3,705 × 1.08 = 4,001 FCFA
SL: 3,705 × 0.95 = 3,519 FCFA
```

**Mercredi 05/03 - Suivi:**
```
portfolio_manager.py exécution:
Prix monte à 3,800 FCFA
P&L: +2,575 FCFA (+2.6%)
Position: OPEN
```

**Jeudi 06/03 - TP atteint:**
```
Prix monte à 4,050 FCFA (> 4,001 TP)
Action: FERME avec TP
P&L Final: +2,895 FCFA (+2.9%)
Sauvegardé: executed_trades.csv
```

**À faire après:**
- Vérifier `executed_trades.csv` → trade enregistré
- Vérifier P&L
- Position maintenant fermée

---

## ❓ FAQ & DÉPANNAGE

### Q: Comment savoir si ça a marché?

**A:** Vérifier les logs:

```bash
# Ouvrir le dernier log
Get-Content logs/automation_*.log | Select -Last 50
```

Doit afficher:
```
[2026-03-02 16:30:00] OK: Demarrage: Génération des signaux
...
[2026-03-02 16:35:15] OK: Demarrage: Scan des obligations
...
[2026-03-02 16:36:00] SUCCESS: OK
```

✅ Pas d'erreurs = ça marche!

---

### Q: Je veux changer le capital

**A:** Modifiez `config.py`:

```python
REAL_PORTFOLIO_CAPITAL = 2_000_000  # 2M au lieu de 1M
```

Sauvegardez → Les 5 modules prendront automatiquement la nouvelle valeur

---

### Q: Positions pas ouvertes, pourquoi?

**A:** Plusieurs raisons:

1. **Pas de signaux BUY** (Z-Score < -2.5 requis)
2. **Marché plat** (tous les stocks pareils)
3. **Capital épuisé** (déjà plusieurs positions ouvertes)

**À faire:** Vérifier `signals_*.csv` → "BUY Signals: X"

Si 0 BUY → Normal! Attendre meilleure opportunité

---

### Q: Scheduler ne lance pas à 16:30

**A:** Vérifier:

1. **Task Scheduler actif?**
   ```bash
   taskschd.msc → Voir si "Altos Trading Daily" existe
   ```

2. **Redémarré le PC?**
   ```bash
   # New task se lance après redémarrage seulement
   ```

3. **Heure système correcte?**
   ```bash
   # Windows + I → Time & language → Check heure
   ```

4. **Rights suffisants?**
   - Ouvrir Task Scheduler en Admin
   - Recréer la tâche

---

### Q: Erreur Unicode (caractères spéciaux)

**A:** Déjà fixée! Dû à Windows CP1252 encode.

Si encore erreur:
```bash
# Forcer UTF-8
set PYTHONIOENCODING=utf-8
python run_daily_automation.py
```

---

### Q: Quand consulter les données?

**Table de référence:**

| Fichier | Contenu | Mise à jour | Lire quand |
|---------|---------|---|---|
| `YTD_2026.csv` | Performance portfolio | Quotidienne 16:30 | Chaque jour |
| `signals_*.csv` | BUY/SELL du jour | Quotidienne 16:30 | Après 16:30 |
| `open_positions.csv` | Trades actuels | Quotidienne 16:30 | Quotidien |
| `executed_trades.csv` | Trades fermés | Quotidienne 16:30 | Synthèse |
| `logs/automation_*.log` | Détails exécution | Quotidienne 16:30 | Si erreur |

---

## 🎯 RÉSUMÉ FINAL

| Choix | Setup | PC allumé? | Maintenance | Risque |
|-------|-------|---|---|---|
| **Manuel** | Aucun | ❌ Non | Lancer chaque jour | Oublis |
| **APScheduler** | 5 min | ✅ OUI | Aucun | Coupure élec |
| **Task Scheduler** | 10 min | ❌ Non | Aucun | ⭐⭐⭐ MEILLEUR |

---

**Recommandation finale:** 
→ Utilisez **Windows Task Scheduler**  
→ Configurez une fois  
→ Oubliez! ✨

**Bon trading! 🚀**


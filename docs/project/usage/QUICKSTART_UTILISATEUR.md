# COMMENT UTILISER LE SYSTÈME - Guide Pratique Jour par Jour

## 📅 Avant de commencer (Aujourd'hui: 01/03/2026)

### Étape 1: Décide ton capital réel

Choisis UN montant:
- **500K FCFA** (petit budget)
- **1M FCFA** (normal) ← Défaut
- **2M FCFA** (agressif)
- **10M FCFA** (comme le backtest)

### Étape 2: Configure le système

**Ouvre le fichier:** `config.py`

**Cherche cette ligne (~ligne 30):**
```python
REAL_PORTFOLIO_CAPITAL = 1_000_000  # ← Change ce nombre
```

**Remplace par ton montant, ex:**
```python
REAL_PORTFOLIO_CAPITAL = 1_000_000  # ou 500_000 ou 2_000_000
```

**Sauvegarde le fichier** (Ctrl+S)

### Étape 3: Vérifie que c'est bon

```powershell
python config.py
```

Tu devrais voir:
```
Total Capital: 1,000,000 FCFA
  CORE (70%): 700,000 FCFA (140,000 per stock)
  SATELLITE (30%): 300,000 FCFA
```

✅ Si c'est bon, tu peux continuer

---

## 📊 Demain: 02/03/2026 - JOUR 1

### 08:00 - Génère les signaux d'achat

**Commande:**
```powershell
python daily_signals.py
```

**Résultat:** 
Tu vois une liste de 5-10 recommendations:
```
ABJC: Strong Buy @ 1400 FCFA (Z-Score -3.5)
SNTS: Sell @ 8500 FCFA
... etc
```

**Fichier créé:** `signals_20260302.csv`

**Action:** Note les symboles et prix

---

### 09:00-14:00 - Exécute les trades (manuellement)

Pour chaque signal "BUY":

**Sur ton broker BRVM:**

1. Ouvre l'appli ou site du broker
2. Cherche le ticker (ex: ABJC)
3. Clique "Acheter"
4. Rentre le nombre de shares
   - *Conseil:* Regarde dans `signals_20260302.csv` colonnes "Action" et "Qty"
5. Ajoute l'ordre à **`open_positions.csv`**

**Fichier:** `open_positions.csv`

**Colonnes à remplir:**
```csv
Date,Ticker,Entry_Date,Entry_Price,Qty,TP_Price,SL_Price
02/03/2026,ABJC,02/03/2026,1400,214,1470,1288
```

(Les autres colonnes se remplissent automatiquement le soir)

---

### 16:30 - Mise à jour auto P&L + SL/TP

**Commande:**
```powershell
python portfolio_manager.py
```

**Ce que ça fait:**
- Récupère les prix de fermeture
- Calcule P&L pour chaque position
- Si TP ou SL touché → ferme automatiquement
- Ajoute à `executed_trades.csv`
- Affiche résumé

**Tu vois:**
```
ABJC: +50 FCFA (+3.6%) [OPEN]
ORGT: TP HIT at 9800 [CLOSED] +500 FCFA
```

---

### 17:00 - Mise à jour du portefeuille (optionnel)

**Commande:**
```powershell
python daily_market_update.py
```

**Ce que ça fait:**
- Récupère prix BRVM
- Calcule valeur totale CORE + SATELLITE
- Ajoute une ligne à `YTD_2026.csv`

---

## 📅 Chaque jour (02/03 → 31/12/2026)

**Routine simple:**

```
08:00 → python daily_signals.py
        → Regarder les recommandations
        
09:00 → Exécuter trades sur broker
        → Ajouter à open_positions.csv
        
16:30 → python portfolio_manager.py
        → P&L auto-calculé
        → SL/TP auto-appliqué
        
17:00 → python daily_market_update.py (optionnel)
```

**Temps total:** ~30 minutes par jour

---

## 🎯 Chaque mois (1er du mois)

### CORE Rebalancing Check

**Commande:**
```powershell
python core_rebalancing.py
```

**Résultat:**
```
CORE PORTFOLIO ANALYSIS
SNTS: Score 72 [STRONG]
ABJC: Score 38 [WEAK] ← À REMPLACER?
```

**Action:** Si tu vois [WEAK], détecte le remplaçant (affichage suggère)

---

### Bond Scanning (Nouveau!)

**Commande:**
```powershell
python bond_scanner.py
```

**Résultat:**
```
CRRH.O8: 4% discount, 6.75% effective yield
TPCI.O83: 4.95% discount, 6.99% yield
... Top 10 bonds
```

**Action:** Si tu veux + de stabilité au CORE, ajoute les meilleures obligations

---

## 📁 Fichiers principaux à connaître

### À LIRE/MODIFIER:

| Fichier | Quand | Quoi faire |
|---------|-------|-----------|
| `config.py` | Setup (1 fois) | Changer `REAL_PORTFOLIO_CAPITAL` |
| `open_positions.csv` | Chaque trade | Ajouter nouvelles positions |
| `GUIDES_COMPLETS_V2.xlsx` | Besoin d'aide | Ouvre et lis la sheet pertinente |

### AUTO-REMPLIS (Ne pas modifier):

| Fichier | Quand | Contenu |
|---------|-------|---------|
| `signals_YYYYMMDD.csv` | 08:00 daily | Signaux Z-Score BUY/SELL |
| `executed_trades.csv` | 16:30 daily | Trades fermés (SL/TP hit) |
| `YTD_2026.csv` | 17:00 daily | Valeur portfolio jour par jour |
| `bond_opportunities_*.csv` | 1er mois | Obligations < 100% trouvées |

---

## 🎓 Exemple complet: DAY 1 (02/03/2026)

### 08:00 - Je lance les signaux

```powershell
$ python daily_signals.py

DAILY SIGNALS GENERATOR
========================
ABJC: Strong Buy @ 1400 FCFA
  → Qty: 214 shares
  → TP: 1470 (+5%)
  → SL: 1288 (-8%)
  
SNTS: Hold [Z-Score 0.5]

ORGT: Buy @ 9200 FCFA
  → Qty: 32 shares
  → TP: 9660 (+5%)
  → SL: 8464 (-8%)
```

### 09:00 - J'achète sur broker (exemple ABJC)

```
BRVM Broker:
1. Rechercher: ABJC
2. Cliquer: ACHETER
3. Quantité: 214
4. Prix: 1400
5. Valider
→ Acheté!
```

### J'ajoute à open_positions.csv

```csv
Date,Ticker,Entry_Date,Entry_Price,Qty,Current_Price,Current_Value,P&L,P&L_%,TP_Price,TP_%,SL_Price,SL_%,Status,Days_Open,Notes
02/03/2026,ABJC,02/03/2026,1400,214,1400,299600,0,0,1470,5,1288,-8,OPEN,0,Strong Buy signal
02/03/2026,ORGT,02/03/2026,9200,32,9200,294400,0,0,9660,5,8464,-8,OPEN,0,Buy signal
```

### 16:30 - Mise à jour auto

```powershell
$ python portfolio_manager.py

PORTFOLIO MANAGER - UPDATE POSITIONS
=====================================
ABJC @ 1410 → +10 FCFA (+0.71%) [OPEN]
ORGT @ 9250 → +50 FCFA (+0.54%) [OPEN]

No SL/TP hits today.
```

**open_positions.csv mis à jour automatiquement:**
```csv
02/03/2026,ABJC,02/03/2026,1400,214,1410,301740,10,0.71,1470,5,1288,-8,OPEN,0,Strong Buy signal
```

### 17:00 - Valeur portfolio ajoutée

```powershell
$ python daily_market_update.py

YTD Tracking updated:
Date: 02/03/2026
CORE Value: 700,000 (start)
SATELLITE Value: 301,740 (with 2 positions)
Total: 1,001,740
```

---

## 🛑 Cas spéciaux

### Cas 1: TP ou SL est touché

**Exemple:** ABJC monte à 1470 (TP hit)

**portfolio_manager.py fait automatiquement:**
```python
ABJC: TP HIT @ 1470
→ Close position
→ Profit: (1470-1400) × 214 = +10,080 FCFA
→ Record in executed_trades.csv
→ Remove from open_positions.csv
```

**Tu n'as rien à faire!** ✅

---

### Cas 2: Je veux fermer manuellement

**Exemple:** Mon broker je veux fermer ORGT à 9300 (avant TP)

1. Ferme sur broker
2. Ajoute ligne à `executed_trades.csv`:

```csv
Entry_Date,Ticker,Signal,Entry_Price,Qty,Total_Entry_Cost,Exit_Date,Exit_Price,Exit_Reason,Total_Exit_Value,P&L_FCFA,P&L_%
02/03/2026,ORGT,Buy,9200,32,294400,02/03/2026,9300,MANUAL,297600,3200,1.09
```

3. Supprime ligne de `open_positions.csv`

---

### Cas 3: Nouvelle obligation CORE

**Le 1er du mois:**

```powershell
$ python bond_scanner.py
→ Voit CRRH.O8 @ 96 FCFA (4% discount)
→ Rendement: 6.75%
```

**Action:**
1. Achète sur BRVM
2. Ajoute à `core_allocation.csv` (type=BOND)

```csv
Date,Ticker,Type,Entry_Date,Entry_Price,Qty,...
01/03/2026,SNTS,STOCK,01/03/2026,8500,165,...
01/03/2026,CRRH.O8,BOND,01/03/2026,96,1458,...  ← Nouvelle
```

---

## 📞 Troubleshooting rapide

### Q: Python command not found?

**R:** Lance PowerShell depuis le bon dossier:
```powershell
cd C:\Users\bagno\Downloads\Altos\Cours_Bours
python daily_signals.py
```

### Q: Pas de signaux affichés?

**R:** Données trop vieilles (backtest 2017-2025)
- Attends 02/03/2026 minuit → données nouvelles en dataset

### Q: Valeurs dans GUIDES_COMPLETS_V2.xlsx?

**R:** Double-click sur le fichier Excel
- Sheet "Home" = Quick start
- Sheet "Bond Scanner" = Guide obligations
- (Autres sheets supprimées - consolidés dans Excel)

---

## ✅ Checklist J-1 (01/03/2026)

- [ ] Ouvrir `config.py`
- [ ] Changer `REAL_PORTFOLIO_CAPITAL` à mon montant
- [ ] Sauvegarder (Ctrl+S)
- [ ] `python config.py` → Vérifier affichage correct
- [ ] Lire GUIDES_COMPLETS_V2.xlsx ("Home" sheet)
- [ ] Préparer broker login/password
- [ ] Dormir bien le soir 😴

---

## ✅ Checklist J1 (02/03/2026)

### 08:00
- [ ] `python daily_signals.py`
- [ ] Noter tickers et Qty pour chaque signal BUY

### 09:00-14:00
- [ ] Ouvrir broker
- [ ] Pour chaque BUY signal: acheter sur BRVM
- [ ] Ajouter chaque trade à `open_positions.csv`

### 16:30
- [ ] `python portfolio_manager.py`
- [ ] Vérifier P&L
- [ ] `open_positions.csv` auto-updated ✅

### 17:00
- [ ] `python daily_market_update.py` (optionnel)
- [ ] Vérifier `YTD_2026.csv` updaté

---

## 🎯 Objectif final

```
Jour 1: Setup + 1-2 trades
Semaine 1: Comprendre les routines
Mois 1: 10-20 trades, 5-10 SL/TP hits
Mois 2-3: Routine stable, résultats positifs

Cible annuelle: 10-12% rendement
  = 7-8% CORE (stable)
  = 20-30% SATELLITE (volatil)
```

---

## 📚 Pour aller plus loin

**Lis ces guides dans GUIDES_COMPLETS_V2.xlsx:**

1. **Adapter Capital** - Si tu veux changer le capital
2. **Daily Update** - Détails sur le scraping BRVM
3. **Portfolio Manage** - Mécaniques SL/TP
4. **Core Rebalancing** - Comment remplacer stocks faibles
5. **Bond Scanner** - Comment ajouter obligations au CORE
6. **Daily Checklist** - Routine quotidienne détaillée

---

## 🚀 TL;DR - La version ultra-courte

```
SETUP (Aujourd'hui):
  1. Modifie config.py avec ton capital
  2. Lis GUIDES_COMPLETS_V2.xlsx

CHAQUE JOUR:
  08:00 → python daily_signals.py (voir les signaux)
  09:00 → Acheter sur broker (ajouter à open_positions.csv)
  16:30 → python portfolio_manager.py (P&L auto-calculé)

CHAQUE MOIS:
  1er → python core_rebalancing.py (monitor le CORE)
  1er → python bond_scanner.py (trouver obligations)

RÉSULTAT:
  10-12% rendement annuel
  70% sûr (CORE) + 30% agressif (SATELLITE)
```

C'est tout! 🎉

# Portfolio Management System 2026+

## Vue d'ensemble

Système complet de gestion de portefeuille pour **exécuter la stratégie en temps réel**.

```
CORE (70%)                    SATELLITE (30%)
├─ SNTS (1.4M)               ├─ daily_signals.py (génère BUY/SELL)
├─ ORGT (1.4M)               ├─ open_positions.csv (positions actuelles)
├─ ONTBF (1.4M)              ├─ executed_trades.csv (historique trades)
├─ SAFC (1.4M)               └─ portfolio_manager.py (P&L + SL/TP)
└─ ABJC (1.4M)
   ↓
Suit les dividendes          Génère P&L
8% annuels                   Ferme automat. au SL/TP
```

---

## Workflow quotidien

### **08:00 - Avant l'ouverture**

```powershell
python daily_signals.py
```

**Résultat :** 
```
=== SIGNALS FOR 02/03/2026 (5 signals) ===

Ticker  Signal        Z_Score  Price   Action  Qty   TP_Price  SL_Price
------  -----------   -------  -----   ------  ---   --------  --------
ABJC    Strong Buy    -3.2     1380    BUY     2174  1449      1270
SNTS    Buy           -2.5     16950   BUY     176   17798     15594
ONTBF   Hold          0.5      8500    HOLD    -     -         -
SAFC    Sell          +3.1     7150    SELL    -     -         -
BICB    Strong Sell   +3.5     8200    SELL    -     -         -

Recommendations:
  → 2 BUY opportunities identified
  → 1 STRONG BUY signal (HIGH PRIORITY - ABJC)
  → 2 SELL signals (close existing positions)
```

**FILE CREATED:** `signals_20260302.csv`

---

### **09:00-14:00 - Pendant la séance**

**TU LANCES LES TRADES MANUELLEMENT**

Pour chaque signal BUY, tu:

1. Ouvres ton broker / compte de trading
2. Achètes la quantité suggérée au prix du marché
3. Ajoutes une ligne dans `open_positions.csv`

**Exemple - Tu achètes ABJC:**
```csv
Date,Ticker,Entry_Date,Entry_Price,Qty,Current_Price,Current_Value,P&L,P&L_%,TP_Price,TP_Pct,SL_Price,SL_Pct,Status,Days_Open,Notes
02/03/2026,ABJC,02/03/2026,1380,2174,1380,3000120,0,0,1449,5.0,1270,8.0,OPEN,0,Strong Buy signal
```

---

### **16:30 - Après la fermeture**

```powershell
python portfolio_manager.py
```

**Ce que fait le script:**

```
PORTFOLIO MANAGER - UPDATE POSITIONS
=====================================

Récupération des prix actuels...
OK - Prices pour 287 stocks (02/03/2026)

Updating 1 open positions...
  ABJC: 2174 @ 1380 → 1395 | P&L +1.09% | OPEN
  SNTS: 176 @ 16950 → 16980 | P&L +0.18% | OPEN

✅ 2 positions restent ouvertes

PORTFOLIO SUMMARY
=================

💰 CORE (70% - BIG CAPS):
   Value: 12,180,000 FCFA

🤖 SATELLITE (30% - Z-SCORE ROBOT):
   Open Positions Value: 3,050,000 FCFA
   P&L Open: +32,340 FCFA
   P&L Today: +32,340 FCFA

📊 TOTAL PORTFOLIO:
   Value: 15,230,000 FCFA
```

**FILES AUTO-UPDATED:**
- `open_positions.csv` ← Positions avec prix du jour
- `executed_trades.csv` ← Trades fermés via SL/TP

---

## Gestion des positions

### **Take Profit (TP)**
```
Automatique quand price >= TP_Price
Exemple: Entry 1380 FCFA → TP 1449 (+5%)
  → Position fermée automatiquement à 1449+
  → P&L: +69 FCFA par share
```

### **Stop Loss (SL)**
```
Automatique quand price <= SL_Price
Exemple: Entry 1380 FCFA → SL 1270 (-8%)
  → Position fermée automatiquement à 1270-
  → Perte limitée: -110 FCFA par share
```

### **Fermeture manuelle**
```
Tu peux aussi fermer manuellement:
1. Vends les shares sur ton broker
2. Ajoutes la ligne dans executed_trades.csv:
   
   02/03/2026,ABJC,Strong Buy,1380,2174,3000120,03/03/2026,1400,MANUAL,3048400,48280,1.61
```

---

## Files Structure

### **open_positions.csv** (Positions actuelles)
```csv
Date,Ticker,Entry_Date,Entry_Price,Qty,Current_Price,Current_Value,P&L,P&L_%,TP_Price,TP_Pct,SL_Price,SL_Pct,Status,Days_Open,Notes
02/03/2026,ABJC,02/03/2026,1380,2174,1395,3032130,32010,1.07,1449,5.0,1270,8.0,OPEN,0,
02/03/2026,SNTS,02/03/2026,16950,176,16980,2988480,5280,0.18,17798,5.0,15594,8.0,OPEN,0,
```

### **executed_trades.csv** (Historique - Closed positions)
```csv
Entry_Date,Ticker,Signal,Entry_Price,Qty,Total_Entry_Cost,Exit_Date,Exit_Price,Exit_Reason,Total_Exit_Value,P&L_FCFA,P&L_%,Sharpe_Calc
03/03/2026,ABJC,Strong Buy,1380,2174,3000120,03/03/2026,1449,TP_HIT,3151926,151806,5.06,OK
05/03/2026,SNTS,Buy,16950,176,2985200,05/03/2026,15874,SL_HIT,2793824,-191376,-6.41,OK
```

### **signals_YYYYMMDD.csv** (Signaux quotidiens)
```csv
Date,Ticker,Signal,Z_Score,Price,Action,Qty,TP_Price,SL_Price,TP_Pct,SL_Pct
02/03/2026,ABJC,Strong Buy,-3.2,1380,BUY,2174,1449,1270,5.0%,8.0%
02/03/2026,SNTS,Buy,-2.5,16950,BUY,176,17798,15594,5.0%,8.0%
```

---

## Statistiques quotidiennes

### À la fin du mois
```
Portfolio Performance - Mars 2026
==================================

CORE (70%):
  Initial: 12,174,484 FCFA
  Current: 12,280,000 FCFA
  Return: +0.87% (+105,516 FCFA)

SATELLITE (30% - Trading):
  Trades Executed: 24
  Win Rate: 62.5% (15/24)
  Avg Win: +67,200 FCFA
  Avg Loss: -48,900 FCFA
  Total P&L: +385,200 FCFA

PORTFOLIO TOTAL:
  Initial: 44,513,577 FCFA
  Current: 44,898,777 FCFA
  Total Return: +0.87% (+385,200 FCFA)
  vs Target: +1.4% (slightly behind)

YTD 2026:
  Jan: +0% (pas de trading)
  Feb: +0% (pas de trading)
  Mar: +0.87%
  Average: +0.29% per month
```

---

## Commandes quotidiennes résumées

```bash
# 08:00 - Générer les signaux
python daily_signals.py

# 09:00 - Exécute les trades manuellement (via broker)
# (ajoutes dans open_positions.csv)

# 16:30 - Mettre à jour les positions et P&L
python portfolio_manager.py

# 17:00 - Optionnel: voir le résumé
python daily_market_update.py
```

---

## Troubleshooting

### "Aucun signal trouvé"
- Les données peuvent être en retard
- Vérifier la date du dernier jour dans les données

### "Prix not found for TICKER"
- Stock peut ne pas avoir de données ce jour
- Ou structure du CSV a changé

### "Position not closed au SL"
- Vérifier que le prix est bien noté dans les données
- Peut prendre un jour pour la colôture

---

## Prochaines améliorations

- [ ] Notifications email quand TP/SL atteint
- [ ] Dashboard temps réel avec graphes
- [ ] Intégration API broker (achats automatiques)
- [ ] Sharpe ratio et statistiques avancées
- [ ] Backtesting de chaque trade
- [ ] Prédictions ML pour Z-Score

---

## Questions ?

Voir `daily_signals.py` pour détails techniques sur Z-Score
Voir `portfolio_manager.py` pour logique P&L et SL/TP

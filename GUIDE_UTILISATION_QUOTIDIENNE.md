# 📋 GUIDE UTILISATION QUOTIDIENNE - Stratégie Z-Score BRVM

## 🎯 Aperçu Général

Ce guide explique comment utiliser le système Z-Score BRVM au quotidien pour:
- ✅ Scanner les opportunités de trading
- ✅ Gérer votre portefeuille
- ✅ Suivre la performance
- ✅ Prendre des décisions informées

---

## ⏰ ROUTINE QUOTIDIENNE (15-30 minutes)

### **1️⃣ MATIN - Démarrage (9h00 - 10h00)**

Après **fermeture du marché BRVM** et avant **ouverture prochaine séance**:

```
Exécuter: python main.py → Option 5 → Market Overview Complet
```

**Quoi regarder:**

| Section | Action |
|---------|--------|
| 🟢 **À ACHETER** | Nouvelles opportunités d'entrée |
| 🔴 **À VENDRE** | Positions à considérer pour sortie |
| 📊 **Statistiques** | Nombre total de signaux (BUY vs SELL) |
| ⭐ **Z-Score** | Extrêmes (Z < -3.0 ou Z > +3.0) |

**Fichier généré:** `market_overview_YYYYMMDD_HHMMSS.csv`

**Questions clés:**
- ❓ Quels stocks affichent des signaux **STRONG BUY**?
- ❓ Y a-t-il de bonnes analyses Sharpe (> 0.8)?
- ❓ Combien de signaux volatiles (> 15% annualisé)?

---

### **2️⃣ MID-MATIN - Filtrage (10h00 - 10h30)**

**Affiner votre sélection:**

Parmi les opportunités "À ACHETER", vérifier:

```
✅ Volatilité > 15% - Requis pour Z-Score efficace
✅ Sharpe Ratio > 0.5 - Rendement ajusté au risque acceptable
✅ Volume > 1000 unités - Liquidité suffisante
✅ Tendance POSITIVE - Pas en rupture baissière
```

**Fichier de référence:** `output/daily_reports/market_overview_*.csv`

**Exemple de filtrage:**
```
ABJC  → Z=-2.5, Sharpe=0.8, Vol=22% ✅ BON CANDIDAT
SNTS  → Z=-1.2, Sharpe=0.3, Vol=18% ❌ Sharpe trop faible
SAFC  → Z=-3.2, Sharpe=0.9, Vol=25% ✅✅ EXCELLENT
```

---

### **3️⃣ AVANT TRADING - Validation (10h30 - 11h00)**

**Pour chaque action à trader:**

**Option 4: Backtest Rapide** → Test avec vos paramètres TP/SL

```
1. Entrer le symbole (ex: ABJC)
2. Définir: TP=5%, SL=8% (ou vos préférences)
3. Lancer backtest (60 jours derniers)
4. Vérifier: Win Rate > 40%?, Profit Factor > 1.2?
```

**Accepter le trade si:**
- ✅ Win Rate ≥ 40%
- ✅ Profit Factor ≥ 1.2 (gains moyens > pertes moyennes × 1.2)
- ✅ Signal Z < -2.5 (pas -2.0)
- ✅ Sharpe > 0.5

---

## 📊 SUIVI QUOTIDIEN (Avant clôture marché)

### **Option 6: Calcul Ordre/Portefeuille**

**À chaque ordre passé, documenter:**

```
Stock: ABJC
Quantité: 100
Prix d'achat: 1500 FCFA
Perte limite (SL): 1380 FCFA (-8%)
Profit cible (TP): 1575 FCFA (+5%)
Capital risqué: 12,000 FCFA
Gain potentiel: 7,500 FCFA
Ratio R:R = 1:0.63 (ACCEPTABLE)
```

**Feuille de suivi:** Créer fichier Excel avec:
```
Date | Stock | Qty | EntryPrice | SL | TP | DateSortie | PnL | Raison Sortie
```

---

## 💼 SUIVI PORTEFEUILLE (Fin d'après-midi)

### **Option 7: Gestion Portefeuille**

**À 17h00 (avant fermeture):**

```
Exécuter: python main.py → Option 7 → Gestion portefeuille
```

**Quoi vérifier:**

| Colonne | Alerte |
|---------|--------|
| **P&L %** | ❌ < -7% → Vérifier SL |
| **Z-Score** | 🔴 Z > +2.0 → Envisager sortie |
| **Signal** | 🟢 Stable → Maintenir |
| **Recommandation** | 📌 RENFORCER → Ajouter? |

**Template:** Remplir `output/daily_reports/portefeuille.csv`:
```csv
Code symbole,Quantite,PrixAchat,DateAchat
ABJC,100,1500,2026-03-01
SAFC,50,2200,2026-02-28
```

---

## 📈 SUIVI HEBDOMADAIRE (Chaque lundi)

### **Performance de la semaine**

**Option 5 + Option 7** = Vue complète:
- Opportunités manquées
- Trades réalisés vs manqués
- Corrélations positives/négatives

**Questions:**
- ❓ Combien de signaux STRONG BUY avez-vous pris?
- ❓ Taux de réussite > 50%?
- ❓ Capital risqué vs disponible?

---

## 📅 SUIVI MENSUEL (1er de chaque mois)

### **Option 8: Rendements Annuels 2017-2025**

```
Exécuter: python main.py → Option 8
```

**Analysis:**
- 📊 Stock le plus performant du mois?
- 📊 Volatilité a-t-elle changé?
- 📊 Corrélation inter-stocks?

**Fichier généré:** `annual_returns_YYYYMMDD_HHMMSS.csv`

---

## 🏦 SUIVI STRATÉGIQUE (Mensuel)

### **Option 9 & 10: Validations Hedge Fund**

**Option 9:** Architecture 70/30
```
- CORE: Big Caps (SNTS, ORGT, ONTBF, SAFC, ABJC) 
- SATELLITE: Robot Z-Score volatiles
```

**Option 10:** Backtest 2017-2025
```
Vérifie si stratégie aurait généré 18% CAGR
Validation théorique vs live trading
```

---

## 🚨 CHECKLIST DÉCISIONS QUOTIDIENNES

### **AVANT DE TRADER - Vérifier:**

| Item | Statut | Notes |
|------|--------|-------|
| Z-Score < -2.5? | ☐ OUI ☐ NON | |
| Sharpe > 0.5? | ☐ OUI ☐ NON | |
| Vol > 15%? | ☐ OUI ☐ NON | |
| Backtest > 40% WR? | ☐ OUI ☐ NON | |
| Capital disponible? | ☐ OUI ☐ NON | |
| Ratio R:R > 1? | ☐ OUI ☐ NON | |

**ACTION:** ✅ Tous cochés → **TRADER** | ❌ Un manque → **PASSER**

---

## 📉 GESTION DES PERTES & RISQUES

### **Si P&L portefeuille < -7% en 1 jour:**

1. **STOP** - Arrêter nouveaux ordres
2. **ANALYSER** - Quelle action pose problème?
3. **VÉRIFIER** - Z-Score toujours valide?
4. **DÉCIDER:**
   - Signal devient SELL? → Sortir (SL)
   - Signal stable? → Maintenir
   - Z > +1? → Réduire position

### **Limit Daily Loss = 2% du capital total**

```
Capital: 10M FCFA
Max loss/jour: 200K FCFA
```

---

## 💡 CAS D'USAGE RÉELS

### **Scénario 1: Action en pullback**

```
Histoire: ABJC était à 1600, tombe à 1500 (Z=-2.8)
Decision: 
  ✅ Z < -2.5 → BUY signal valide
  ✅ Sharpe 0.7 > 0.5 → OK
  ✅ Vol 20% > 15% → OK
Action: ACHETER 100 units à 1500

Suivi:
  J+1: 1520 (+1.3%) → MAINTENIR (P&L positif)
  J+3: 1560 (+4%) → VENDRE (proche TP à 1575) ✅ PROFIT
```

### **Scénario 2: Faux signal**

```
Histoire: SNTS Z=-2.1 (Light signal aussi), Sharpe=0.3
Decision: 
  ❌ Z > -2.5 → Pas assez extrême
  ❌ Sharpe 0.3 < 0.5 → Risque/rendement faible
Action: **PASSER** (protéger capital)
```

### **Scénario 3: Position adverse**

```
Histoire: Achat SAFC à 2200, maintenant 2100 (P&L=-4.5%)
Z-Score check: Z=+1.5 (neutre), Sharpe 0.6 (OK)
Decision:
  ✅ Signal stable (pas SELL)
  ✅ SL pas trigger (-8% = 2024)
  ✅ P&L -4.5% < SL
Action: **MAINTENIR** - Attendre TP ou signal changement
```

---

## 🎯 MÉTRIQUES À SUIVRE

### **Journalière:**
```
✓ Nombre d'opportunités (optiques actives)
✓ Trades pris vs passés
✓ Win rate du jour
✓ Capital risqué
```

### **Hebdomadaire:**
```
✓ Cumul P&L
✓ Nombre de signaux réalisés
✓ Volatilité moyenne des positions
✓ Sharpe ratio du portefeuille
```

### **Mensuelle:**
```
✓ Rendement mensuel %
✓ Ratio Profit Factor
✓ Correlation actions
✓ Stocks avec meilleures signal counts
```

---

## 🔄 WORKFLOW OPTIMAL - Résumé

```
┌─────────────────────────────────────────────────────────┐
│ 09:00 - MATIN                                           │
│ └─ Option 5: Market Overview Complet (5 min)           │
│    ├─ Identifier À ACHETER                             │
│    ├─ Identifier À VENDRE                              │
│    └─ Noter top 3 opportunités                         │
├─────────────────────────────────────────────────────────┤
│ 10:00 - MID-MATIN                                       │
│ └─ Option 4: Backtest Rapide sur top3 (15 min)        │
│    ├─ Valider Win Rate > 40%                           │
│    ├─ Valider Ratio Profit > 1.2                       │
│    └─ DÉCIDER: TRADER ou PASSER                        │
├─────────────────────────────────────────────────────────┤
│ 17:00 - FERMETURE                                       │
│ └─ Option 6: Calcul ordres (5 min)                     │
│    └─ Documenter trades du jour                        │
├─────────────────────────────────────────────────────────┤
│ 17:15 - SUIVI                                          │
│ └─ Option 7: Gestion portefeuille (5 min)             │
│    ├─ Vérifier P&L                                     │
│    ├─ Vérifier Z-Score                                 │
│    └─ Mettre à jour portefeuille.csv                   │
└─────────────────────────────────────────────────────────┘

TOTAL: ~30 minutes/jour
```

---

## 📝 FEUILLE DE SUIVI RECOMMANDÉE

### Créer fichier Excel `SUIVI_TRADING.xlsx`:

```
DATE | ACTION | SYMBOLE | QTE | PRIX | TP | SL | RAISON | P&L | NOTES
1-Mar | BUY | ABJC | 100 | 1500 | 1575 | 1380 | Z=-2.8, Sh=0.8 | - | Entry ok
2-Mar | SELL | ABJC | 100 | 1560 | - | - | P&L +4% | +6000 | TP proche
2-Mar | BUY | SAFC | 50 | 2200 | 2310 | 2024 | Z=-3.1, Sh=0.9 | - | Strong entry
```

---

## ❓ FAQ QUOTIDIENNE

**Q: À quelle heure exécuter Option 5?**
A: Après fermeture BRVM (17h00) pour avoir données complètes du jour

**Q: Combien de signaux faire par jour?**
A: **Qualité > Quantité** - Prendre 1-3 excellents (Z<-2.5, Sh>0.7) plutôt que 5 faibles

**Q: Si je rate un signal?**
A: NORMAL - Il y aura d'autres. Protéger capital > chasser signaux

**Q: Quand augmenter position?**
A: Si Signal BUY + Z reste < -2.0 + Sharpe monte = "RENFORCER"

**Q: Quand réduire?**
A: Si P&L > +15% OU Signal change vers SELL OU Z remonte > +1

---

## 🎓 APPRENTISSAGE CONTINU

### Chaque semaine, analyser:

1. **Signaux manqués** - Pourquoi ont-ils réussi?
2. **Trades perdants** - Quelle condition les aurait évité?
3. **Corrélations** - Quels stocks se déplacent ensemble?
4. **Saisonnalité** - Des mois plus volatiles?

### Paramètres à ajuster:

- Si Win Rate < 40% → Augmenter Z-Score threshold (-3.0 vs -2.0)
- Si Sharpe faible → Augmenter volatilité minimum (18% vs 15%)
- Si signal trop tard → Surveiller plus tôt (200-jour rolling)

---

## 🚀 PROCHAINES ÉTAPES

1. **Créer portefeuille.csv** avec vos positions actuelles
2. **Exécuter Option 5 quotidiennement** pendant 2 semaines
3. **Noter** les 3 meilleures opportunités
4. **Backtester** chaque avec Option 4
5. **Trader** seulement les > 40% Win Rate
6. **Documenter** chaque trade dans SUIVI_TRADING.xlsx
7. **Réviser** chaque lundi: quels signaux ont réussi?

---

**Version:** 1.0 | **Date:** 01/03/2026 | **Contact:** Z-Score BRVM System


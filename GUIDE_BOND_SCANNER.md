# Bond Scanner - Radar Obligataire Indépendant

## Objectif

Scanner les obligations UEMOA vendues **SOUS leur valeur nominale** (< 100%)
Capturer les **super-rendements obligataires** pour le **CORE (70% - Bouclier/Sécurisé)**
**SANS les mélanger** avec le robot Z-Score du SATELLITE agressif

---

## Architecture du portefeuille

```
PORTEFEUILLE TOTAL (100%)

CORE (70%) - Bouclier/Sécurisé
├─ 5 Actions Big Caps (40%) [dividends 8%]
│  ├─ SNTS, ORGT, ONTBF, SAFC, ABJC
├─ Obligations UEMOA (20-30%) [coupons 6-7%]
│  └─ Trésor Public CI, Sénégal, Benin, etc. < 100%
└─ Cash/Réserves (0-10%) [trésor = 0%]
   → Résultat: 7-8% rendement stable

SATELLITE (30%) - Agressif  
└─ Z-Score Robot (20-30% rendement volatil)
   ├─ Signaux quotidiens
   └─ SL/TP automation
   → Résultat: 20-30% rendement agressif
```

---

## Comment utiliser bond_scanner.py

### 1. Exécution

```powershell
python bond_scanner.py
```

**Résultat:**
- Affiche les meilleures obligations < 100%
- Crée `bond_opportunities_YYYYMMDD_HHMMSS.csv` (résultats complets)
- Crée `core_bonds_allocation.csv` (template d'allocation suggérée)

### 2. Comprendre les résultats

```
Ticker: CRRH.O8
Libellé: CRRH-UEMOA 5.95% 2018-2030
Current_Price: 96.0 FCFA
Nominal_Price: 100.0 FCFA
Discount: 4.0 FCFA (4%)
Coupon_Rate: 5.95%
Effective_Yield: ~6.75%
```

**Traduction:**
- ✓ Obligation remboursée à 100 FCFA à maturité
- ✓ Tu l'achètes à 96 FCFA → economise 4 FCFA
- ✓ Tu reçois 5.95% coupon par an
- ✓ + La différence (4 FCFA) se gagne à maturité
- ✓ = Rendement TOTAL annualisé ≈ 6.75%

---

## Critères de sélection pour CORE

### ✅ À PRÉFÉRER

| Critère | Bon choix | Raison |
|---------|----------|--------|
| **Émetteur** | États UEMOA (Sénégal, CI, Benin, Togo) | Très sûr, faible défaut |
| **Discount** | > 2% | Plus il y a de discount, mieux ça rapporte |
| **Coupon** | 5-8% | Taux réalistes, pas excessifs |
| **Durée** | 3-7 ans | Mid-term, sweet spot |
| **Nombre d'émissions** | Plusieurs de la même | Meilleure liquidité |
| **Marché** | BRVM liquide | Facile à acheter/vendre |

### ❌ À ÉVITER

| Critère | Mauvais choix | Raison |
|---------|--------------|--------|
| **Discount** | < 0.5% | Pas assez de gain |
| **Coupon** | > 12% | Peut indiquer risque de défaut |
| **Maturité** | < 1 an | À rembourser très vite |
| **Maturité** | > 10 ans | Impact inflation élevé |
| **Émetteur** | Sociétés privées risquées | Défaut possible |

---

## Workflow mensuel

**1er du mois:**

```
1. python bond_scanner.py
   → Trouve obligations < 100%

2. Review résultats
   → Sélectionne meilleur(s) rendement(s)
   → Vérifie critères

3. Décision: Ajouter à CORE?
   
   SI OUI:
   ├─ Acheter sur BRVM
   ├─ Noter prix d'achat
   └─ Ajouter à core_allocation.csv
   
   SI NON:
   └─ Attendre dips plus profonds (discount > 3%)
```

---

## Intégration avec core_allocation.csv

**Ajouter les obligations:**

```csv
Date,Ticker,Type,Entry_Date,Entry_Price,Qty,Allocation_%,Coupon_Rate_%,...
01/03/2026,SNTS,STOCK,01/03/2026,8500,165,40,...
01/03/2026,CRRH.O8,BOND,01/03/2026,96.0,1458,15,...  ← Obligation
01/03/2026,TPCI.O83,BOND,01/03/2026,95.05,1472,15,...←
```

**Colonnes additionnelles pour obligations:**
- `Coupon_Rate_%`: taux du coupon (ex: 5.95%)
- `Coupon_Yield_%`: rendement obligataire réel
- `Maturity_Date`: date de remboursement
- `Last_Coupon_Date`: dernier coupon reçu

---

## Comparaison: Actions vs Obligations

### Actions (SNTS, ORGT, ABJC, etc.)

| Aspect | Valeur |
|--------|--------|
| Rendement | ~8% dividendes + capital gain |
| Volatilité | **HAUTE** (prix change chaque jour) |
| Risque | Baisse de dividende possible |
| Liquidité | **HAUTE** (facile à vendre) |
| Timing | Acheter/vendre selon signal |

### Obligations (Trésor Public, UEMOA bonds)

| Aspect | Valeur |
|--------|--------|
| Rendement | ~6-7% coupon + discount amortization |
| Volatilité | **BASSE** (prix stable si tu gardes) |
| Risque | Défaut d'État (très rare UEMOA) |
| Liquidité | MOYENNE (marché secondaire) |
| Timing | Acheter si discount > 2%, garder jusqu'à maturité |

### Mix Optimal

🎯 **50% Actions + 50% Obligations = 7-8% rendement stable et sûr**

---

## ❌ Ne PAS faire avec obligations

### Erreur 1: Signal Z-Score sur obligation

```
❌ Signal: CRRH.O8 Z-Score = -2.5 (BUY)
   Erreur: Obligations n'ont PAS de cycles Z-Score!
   Résultat: Acheter au mauvais moment

✅ Bon: Acheter obligation si discount > 2%
   Raison: Rendement garanti à maturité
   Résultat: +6.75% certain
```

### Erreur 2: Trader les obligations (day-trading)

```
❌ Acheter/vendre obligations chaque jour
   Raison: Frais de courtage mangent le gain
   
✅ Acheter et GARDER jusqu'à maturité
   Raison: Coupons + discount amortization fixes
```

### Erreur 3: Mélanger obligations et SATELLITE trading

```
❌ Ajouter obligation au spot SATELLITE (30%)
   Raison: Contre l'architecture du portefeuille
   
✅ Ajouter obligation au CORE (70%)
   Raison: Ligne parfaite pour revenu stable
```

---

## Allocation stratégique exemple (1M FCFA total)

### Option A: 5 Actions + 5 Obligations (RECOMMANDÉ)

```
CORE (700K FCFA):
├─ 5 Actions Big Caps @ 80K chacun = 400K (57% de CORE)
│  ├─ SNTS: 80K
│  ├─ ORGT: 80K
│  ├─ ONTBF: 80K
│  ├─ SAFC: 80K
│  └─ ABJC: 80K
│  → Dividendes: ~8% annuels
│
├─ 5 Obligations @ 60K chacun = 300K (43% de CORE)
│  ├─ CRRH.O8: 60K @ 96 FCFA
│  ├─ TPCI.O83: 60K @ 95 FCFA
│  ├─ TPCI.O87: 60K @ 97 FCFA
│  ├─ EOS.O20: 60K @ 97 FCFA
│  └─ TPNE.O8: 60K @ 95 FCFA
│  → Coupons: 5-7% annuels + discount
│
→ CORE rendement: 7-8% stable et sûr

SATELLITE (300K FCFA):
└─ Z-Score Robot
   → 20-30% rendement (volatil)

TOTAL: 10-12% cible annuel
```

### Option B: 5 Actions + Réserve Cash

```
CORE (700K FCFA):
├─ 5 Actions @ 140K = 700K
└─ Obligations sur prochains dips

SATELLITE (300K FCFA):
└─ Z-Score Robot

Avantage: Flexibilité si obligations trop chères
```

---

## Troubleshooting

### Q: Pas d'obligations trouvées?

**R:** Vérifier:
- Les données sont-elles à jour (février ≥ data)?
- Les obligations UEMOA ne sont cotées que les jours où marché échange
- Vérifier `bond_opportunities_*.csv` créé par le script

### Q: Rendements < 1%?

**R:** À décliner
- Trop peu de discount, pas intéressant
- Attendre prochains dips

### Q: Comment savoir quelle obligation acheter?

**R:** Criblér par:
1. Discount > 2%
2. Coupon > 5%
3. Durée 3-7 ans
4. Émetteur = État UEMOA (pas société privée)

### Q: Comment gérer les coupons reçus?

**R:** Deux options:
- **Réinvestir** dans même obligation si discount revient
- **Garder en cash** pour prochaine allocation

### Q: Quelle obligation pour quel budget?

**R:** Budget 1M FCFA:
- Par allocation: 60K/obligation (pour 5 obligations)
- Nombre de parts = Budget / Prix
- Exemple: 60K / 96 = 625 parts @ 96 FCFA

---

## Résumé: Architecture complète

```
PORTEFEUILLE RÉEL (1M FCFA)

100%
├─ CORE (700K) = Bouclier
│  ├─ Actions (400K, 57%)
│  │  └─ SNTS, ORGT, ONTBF, SAFC, ABJC
│  ├─ Obligations (300K, 43%)
│  │  └─ Trésor UEMOA < 100%, coupons 5-7%
│  └─ Rendement: 7-8% STABLE
│
└─ SATELLITE (300K) = Épée
   └─ Z-Score Robot (20-30% volatil)
      └─ Rendement: 20-30% AGRESSIF

RÉSULTAT: 10-12% annuel cible
          70% stable + 30% agressif = sweet spot
```


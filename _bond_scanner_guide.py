"""
Crée une page guide pour bond_scanner dans GUIDES_COMPLETS.xlsx
"""

guide_content = """
BOND SCANNER - RADAR OBLIGATAIRE INDÉPENDANT
==============================================

OBJECTIF
--------
Scanner les obligations vendues SOUS leur valeur nominale (< 100%)
Capturer les super-rendements obligataires pour le CORE (70%)
SANS les mélanger avec le robot Z-Score du SATELLITE

---

ARCHITECTURE DU PORTEFEUILLE
----------------------------

┌─────────────────────────────────────────┐
│   PORTEFEUILLE TOTAL (100%)             │
├─────────────────────────────────────────┤
│                                         │
│  CORE (70%) - Bouclier/Sécurisé        │
│  ├─ 5 actions big caps (40%)           │
│  │  ├─ SNTS (Sonatel)                  │
│  │  ├─ ORGT (Orange Côte d'Ivoire)    │
│  │  ├─ ONTBF (ONaTrBF)                │
│  │  ├─ SAFC (SAFCA)                   │
│  │  └─ ABJC (Servair)                 │
│  │                                     │
│  ├─ Obligations UEMOA (20-30%)         │
│  │  ├─ Trésor Public Côte d'Ivoire    │
│  │  ├─ UEMOA bonds < 100%             │
│  │  └─ Taux réalistes 5-7%            │
│  │                                     │
│  └─ Cash/Réserves (0-10%)             │
│                                         │
│  SATELLITE (30%) - Agressif            │
│  └─ Z-Score Robot (volatility-based)   │
│     ├─ Daily signals                  │
│     └─ SL/TP automation               │
└─────────────────────────────────────────┘

---

COMMENT UTILISER BOND_SCANNER.PY
--------------------------------

1. EXÉCUTION (Chaque mois ou quand tu cherches des obligations)

   Command:
   └─ python bond_scanner.py

   Résultat:
   └─ Affiche les meilleures obligations < 100%
   └─ Crée bond_opportunities_YYYYMMDD_HHMMSS.csv
   └─ Crée core_bonds_allocation.csv (template recommandé)

---

2. COMPRENDRE LES RÉSULTATS

   Exemple de résultat:

   Ticker: CRRH.O8
   Libellé: CRRH-UEMOA 5.95% 2018-2030
   Current_Price: 96.0 FCFA
   Nominal_Price: 100.0 FCFA
   Discount: 4.0 FCFA (4%)
   Coupon_Rate: 5.95%
   Effective_Yield: ~6.75% (5.95% + 0.80% amortized discount)

   Que ça veut dire:
   ✓ L'obligation vaut 100 FCFA à la fin (remboursement)
   ✓ Tu l'achètes à 96 FCFA : économies = 4 FCFA
   ✓ Tu reçois 5.95% coupon par an
   ✓ + La différence de 4 FCFA se gagne quand elle arrive à maturité
   ✓ = Rendement total annualisé ≈ 6.75%

---

3. CRITÈRES DE SÉLECTION POUR CORE

   ✅ À PRÉFÉRER:
   - Émetteur: États UEMOA (Senegal, CI, Benin, Togo)
   - Discount: > 2% (plus il y a de discount, mieux ça rapporte)
   - Coupon: 5-8% (taux réalistes)
   - Durée: 3-7 ans (mid-term, pas trop risqué)
   - Nombre d'émissions: Plusieurs de la même (liquidité)

   ❌ À ÉVITER:
   - Discount < 0.5% (pas assez de gain)
   - Coupon > 12% (peut indiquer risque de défaut)
   - Maturité < 1 an (à rembourser très vite)
   - Maturité > 10 ans (impact inflation élevé)

---

4. ALLOCATION STRATÉGIQUE

   CORE (70%) = 1M FCFA total
   
   Option A: 5 Actions + 5 Obligations
   ├─ 5 Big Caps @ 140K = 700K → 70% de CORE
   ├─ 5 Obligations @ 60K = 300K → 30% de CORE
   │  └─ Pool diversifiée de rendements
   │
   └─ Résultat: CORE stable, ~8-9% rendement annuel
   
   Option B: 5 Actions + Réserve Cash
   ├─ 5 Big Caps @ 140K = 700K → 70% de CORE
   ├─ Cash/Obligations @ 300K = 300K → 30% de CORE
   │  └─ Flexibilité pour react aux dips
   │
   └─ Résultat: CORE liquide, rendement + opportunités

---

5. WORKFLOW MENSUEL

   1er du mois:
   ├─ python bond_scanner.py
   ├─ Review: meilleures obligations < 100%
   ├─ Décision: Ajouter à CORE?
   ├─ Si OUI:
   │  ├─ Acheter sur BRVM (utiliser core_bonds_allocation.csv)
   │  ├─ Ajouter à core_allocation.csv
   │  └─ Tracker le coupon (date de paiement)
   └─ Si NON:
      └─ Attendre dips plus profonds

---

6. INTÉGRATION AVEC CORE_ALLOCATION.CSV

   Ajouter les obligations:

   Date,Ticker,Type,Entry_Date,Entry_Price,Qty,...
   01/03/2026,SNTS,STOCK,01/03/2026,8500,165,...
   01/03/2026,ORGT,STOCK,01/03/2026,9200,152,...
   01/03/2026,ONTBF,STOCK,01/03/2026,5500,255,...
   01/03/2026,SAFC,STOCK,01/03/2026,6200,226,...
   01/03/2026,ABJC,STOCK,01/03/2026,2000,700,...
   01/03/2026,CRRH.O8,BOND,01/03/2026,96.0,1458,...  ← Ajouter ici
   01/03/2026,TPCI.O83,BOND,01/03/2026,95.05,1472,...←
   
   Colonnes additionnelles:
   ├─ Coupon_Rate_%: taux du coupon (5.95%)
   ├─ Coupon_Yield_%: rendement obligataire réel
   ├─ Maturity_Date: date de remboursement
   └─ Last_Coupon_Date: dernier coupon reçu

---

7. COMPARAISON: ACTIONS vs OBLIGATIONS

   ACTIONS (SNTS, ORGT, etc):
   ├─ Rendement: ~8% dividendes + capital gain
   ├─ Volatilité: HAUTE (prix change chaque jour)
   ├─ Risque: Baisse de dividenda possible
   ├─ Liquidité: HAUTE (facile à vendre)
   └─ Impact: Principal growth

   OBLIGATIONS (CRRH, TPCI, etc):
   ├─ Rendement: ~6-7% coupon + discount amortization
   ├─ Volatilité: BASSE (prix stable si tu gardes)
   ├─ Risque: Défaut d'État (très rare UEMOA)
   ├─ Liquidité: MOYENNE (secondaire)
   └─ Impact: Income steady

   MIX OPTIMAL: 50% Actions + 50% Obligations = ~7-8% stable

---

8. EXAMPLE: SIGNAL QUOTIDIEN vs OBLIGATION

   ❌ MAUVAIS : Acheter obligation sur signal Z-Score
   
   Signal: CRRH.O8 Z-Score = -2.5 (BUY)
   Erreur: Obligations n'ont pas de volatilité Z-Score!
   Résultat: Acheter à mauvais moment du cycle

   ✅ BON : Acheter obligation sur discount > 2%
   
   Condition: CRRH.O8 à 96 FCFA (4% discount)
   Raison: Rendement garanti à maturité
   Résultat: +6.75% rendement certain

---

9. TROUBLESHOOTING

   Q: Pas d'obligations trouvées?
   R: Vérifier la date - les données sont-elles à jour (février ≥ data)?
      Les obligations UEMOA ne sont cotées que les jours où le marché échange

   Q: Rendements < 1%?
   R: À décliner - trop peu de discount, pas intéressant

   Q: Comment savoir quelle obligation acheter?
   R: Criblér par (1) discount > 2%, (2) coupon > 5%, (3) durée 3-7 ans

   Q: Comment gérer les coupons reçus?
   R: Deux options:
      - Réinvestir dans même obligation si discount revient
      - Garder en cash pour prochaine allocation

---

10. RÉSUMÉ ARCHITECTURE

    Portefeuille 1M FCFA:

    CORE (700K FCFA):
    ├─ Actions (400K): 5 stocks @ 80K = 8-9% rendement
    └─ Obligations (300K): 5 bonds @ 60K = 6-7% rendement
                          → CORE rendement = 7-8% stable

    SATELLITE (300K FCFA):
    └─ Z-Score Robot = 20-30% rendement (volatil, actif)

    TOTAL: ~10-12% rendement annuel cible

---
"""

print(guide_content)

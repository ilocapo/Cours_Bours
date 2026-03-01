# Core Portfolio Rebalancing System

## Vue d'ensemble

**Objectif:** Monitorer le CORE (5 big caps) et remplacer automatiquement les underperformers

```
CORE Strategy = Buy & Hold + Smart Rebalancing
└─ Gardes les 5 dividends stocks
└─ Mais remplaces les faibles performer par meilleurs
└─ Maximise dividend yield sans risque de perte
```

---

## Workflow mensuel

### **1er du mois - Monitoring**

```powershell
python core_rebalancing.py
```

**Output example:**

```
================================================================================
CORE PORTFOLIO REBALANCING MONITOR
================================================================================

Analyse des 5 stocks du CORE...
  SNTS: Score 72/100 | 1Y: +45.2% | Vol: 18.2% | STRONG
  ORGT: Score 68/100 | 1Y: +41.8% | Vol: 16.5% | STRONG
  SAFC: Score 65/100 | 1Y: +38.5% | Vol: 21.3% | WATCH
  ONTBF: Score 42/100 | 1Y: -12.4% | Vol: 28.1% | WEAK
  ABJC: Score 38/100 | 1Y: -25.6% | Vol: 35.2% | WEAK

⚠️  UNDERPERFORMERS DETECTED: 2
    ONTBF: Score 42/100 (1Y: -12.4%)
    ABJC: Score 38/100 (1Y: -25.6%)

================================================================================
LOOKING FOR REPLACEMENT CANDIDATES...
================================================================================

Best replacement candidates found:

  Replace ONTBF with BICB:
    Current:  ONTBF - Score 42/100, 1Y: -12.4%
    Proposed: BICB - Score 68/100, 1Y: +35.2%
    Gain: +26 points
    Expected Dividend Gain: +0.7% annually

  Replace ABJC with CORIS:
    Current:  ABJC - Score 38/100, 1Y: -25.6%
    Proposed: CORIS - Score 71/100, 1Y: +42.1%
    Gain: +33 points
    Expected Dividend Gain: +0.9% annually

================================================================================
```

**FILE CREATED:** `CORE_REBALANCING_ALERT_20260301_153000.txt`

---

### **Décision: Tu décides si tu fais le rebalancing**

#### **Option A: Pas de rebalancing**
```
Tu gardes ONTBF et ABJC
Raison: "Trop de frais de transaction" ou "Espères la reprise"
```

#### **Option B: Rebalance complet**
```
Tu acceptes les recommandations
1. Vends ONTBF (pas de perte, juste transfert)
2. Achètes BICB (même montant)
3. Vends ABJC (pas de perte)
4. Achètes CORIS (même montant)
5. Mise à jour core_allocation.csv
```

#### **Option C: Rebalance partiel**
```
Tu acceptes seulement une:
1. Remplaces ABJC par CORIS (meilleur gain)
2. Gardes ONTBF (trop volatile)
```

---

### **Exécution**

**Si tu décides de rebalancer :**

1. **Vends les positions underperformers**
   ```
   BRVM 09:00 → Vends ONTBF & ABJC au prix marché
   ```

2. **Achètes les remplaçants**
   ```
   BRVM 10:00 → Achètes BICB & CORIS au prix marché
   ```

3. **Mets à jour le fichier core_allocation.csv**
   ```
   Remplace les lignes ONTBF & ABJC
   Avec nouvelles données BICB & CORIS
   ```

4. **Vérifie que dividendes sont bien reçus**
   ```
   Mois suivant: Confirme +0.7-0.9% dividend gain
   ```

---

## Métriques de décision

### **Score (0-100)**
```
Critères:
├─ Performance 1 an (poids fort)     +20 pts si >10%
├─ Performance 90j (poids moyen)     +10 pts si >5%
├─ Performance 30j (poids faible)    +2  pts si positif
├─ Volatilité (basse = mieux)        +5  pts si <20%
└─ Volume (liquidité)                +5  pts si >100K shares
```

### **Classification**
```
Score >= 60: STRONG (garder)
Score 45-59: WATCH (monitor)
Score < 45:  WEAK   (remplacer)
```

---

## Remplaçants idéaux

**Critères:**
```
✓ Score > 65
✓ 1-Year return > +30%
✓ Volatility < 25%
✓ Dividend yield >= 8%
✓ Volume > 50K shares/day
```

**Exemples de candidats:**
```
BICB:   Score 68, 1Y +35.2%, Div 9.2%
CORIS:  Score 71, 1Y +42.1%, Div 8.8%
ELIM:   Score 64, 1Y +28.3%, Div 7.8%
SEMC:   Score 66, 1Y +38.9%, Div 8.5%
```

---

## Fréquence de rebalancing

- **Mensuel:** Monitoring (pas obligatoire d'exécuter chaque mois)
- **Semestriel:** Rebalancing si underperformer trouvé
- **Annuel:** Review complète de stratégie

---

## Exemple concret

### **Mars 2026**
```
ABJC score = 38 (WEAK, 1Y: -25.6%)
CORIS score = 71 (STRONG, 1Y: +42.1%)

Action: REMPLACER
├─ Vends: 700 shares ABJC @ 1,400 FCFA = 980,000 FCFA
├─ Achètes: ~1,470 shares CORIS @ 666 FCFA = 980,000 FCFA
└─ Résultat: ZÉRO PERTE, Dividend upgrade +0.7% annuel
```

### **Impact financier annuel**
```
Dividend ABJC:   700 @ 8.5% = 59,500 FCFA/an
Dividend CORIS: 1470 @ 9.2% = 135,264 FCFA/an
───────────────────────────────
Gain:                          +75,764 FCFA/an
```

---

## Commandes rapides

```bash
# Monitoring mensuel
python core_rebalancing.py

# Voir les résultats en détail
type CORE_REBALANCING_ALERT_*.txt

# Après rebalancing - mise à jour
# (manuellement dans core_allocation.csv)

# Vérifier l'allocation actuelle
type core_allocation.csv
```

---

## Notes importantes

⚠️ **PAS DE PERTE GARANTIE**
```
Tous les remplaçants sont au même prix que l'original
→ Tu vends 1M FCFA d'une action
→ Tu achètes 1M FCFA d'une autre
→ ZÉRO PERTE, juste réallocation
```

✅ **DIVIDEND YIELD AMÉLIORATION**
```
Seulement remplacer si:
├─ Dividend yield +0.5% minimum
└─ Score +15 points minimum
```

🎯 **OBJECTIF À LONG TERME**
```
Optimiser les dividendes du CORE
De 8.0% à 8.5%+ annuels
Sans jamais prendre de risque de perte
```

---

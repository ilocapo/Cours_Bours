# Guide Daily Market Update - YTD 2026 Tracker

## Vue d'ensemble

`daily_market_update.py` est un script **automatisé** qui :
- Récupère les prix quotidiens des 5 stocks du CORE directement du site BRVM
- Calcule les valeurs actualisées CORE + SATELLITE
- Ajoute une ligne à `YTD_2026.csv`
- Compare au target 1.4% mensuel

## Installation (une fois)

```powershell
pip install beautifulsoup4 requests pandas
```

## Utilisation quotidienne

### Option 1 : Lancer manuellement chaque jour

Après la fermeture de la bourse BRVM (16h00) :

```powershell
python daily_market_update.py
```

**Output exemple :**
```
============================================================
DAILY MARKET UPDATE - YTD 2026 TRACKER
============================================================
📊 Récupération des données... 16:25:33
  ✓ SNTS: 16,950 FCFA → 983,000 FCFA
  ✓ ORGT: 19,200 FCFA → 728,000 FCFA
  ✓ ONTBF: 8,500 FCFA → 1,647,000 FCFA
  ✓ SAFC: 7,200 FCFA → 1,944,000 FCFA
  ✓ ABJC: 1,400 FCFA → 4,900,000 FCFA

📈 RÉSULTAT:
  Core Value:        11,202,000 FCFA
  Satellite Value:    3,220,000 FCFA
  Total Value:       14,422,000 FCFA
  YTD Return:            44.22%
  Status:             ✅ AHEAD

✅ YTD_2026.csv mis à jour
   Dernière ligne: 01/03/2026 | 14,422,000 FCFA | +44.22%

============================================================
```

### Option 2 : Automatiser avec Windows Task Scheduler [OPTIONNEL]

1. **Créer une tâche Windows :**
   - Ouvrir Task Scheduler
   - "Create Basic Task..."
   - Nom: `BRVM Daily Update`
   - Schedule: Tous les jours à 16:05
   
2. **Action :**
   - Program: `C:\Python313\python.exe`
   - Arguments: `C:\Users\bagno\Downloads\Altos\Cours_Bours\daily_market_update.py`
   - Start in: `C:\Users\bagno\Downloads\Altos\Cours_Bours`

3. **Résultat :** YTD_2026.csv se remplit automatiquement tous les jours

## YTD_2026.csv - Format

```csv
Date,Core_Value,Satellite_Value,Total_Value,YTD_Return_%,Trades_Count,Status
01/03/2026,7100000,3150000,10250000,2.50,2,AHEAD
02/03/2026,7120000,3165000,10285000,2.85,3,AHEAD
```

### Colonnes

| Colonne | Description |
|---------|-------------|
| `Date` | Date du jour (JJ/MM/YYYY) |
| `Core_Value` | Valeur totale des 5 big caps (SNTS, ORGT, ONTBF, SAFC, ABJC) |
| `Satellite_Value` | Valeur du portefeuille Z-Score + gains/pertes des trades |
| `Total_Value` | Core + Satellite |
| `YTD_Return_%` | Rendement année-à-jour en % |
| `Trades_Count` | Nombre de trades exécutés ce jour |
| `Status` | **AHEAD** si YTD > 1.4%, **ON_TRACK** sinon |

## Interpréter les résultats

### AHEAD 🟢
```
YTD_Return_% >= 1.4%
→ Vous êtes EN ADVANCE sur les targets
```

### ON_TRACK 🟡
```
0% < YTD_Return_% < 1.4%
→ Vous êtes sur le plan
```

### BEHIND 🔴
```
YTD_Return_% < 0%
→ Vous êtes EN RETARD
→ Augmenter les positions + trading robot
```

## Comprendre les composantes

### Core Value (70%)
```
5 stocks × dividende 8% annuel
= 2.5M × 0.08 = 200K par trimestre

Formule: CapitalInitial × (1 + dividend_rate)
```

### Satellite Value (30%)
```
Z-Score robot sur 40+ actions
= trading intra-jour/court terme
= 5-15% gain attendu / année

Formule: Capital × (1 + returns_from_trades)
```

## Troubleshooting

### Erreur : "No data found for SNTS"
→ BRVM site peut être down ou structure changée
→ Vérifier `https://www.brvm.org/en/cours-actions/`
→ Modifier `daily_market_update.py` ligne 35+ si nécessaire

### Erreur : "403 Forbidden"
→ URL changed ou BRVM a des protections anti-bot
→ Alternative : Télécharger excel depuis BRVM manuellement et lire le fichier

### CSV ne se crée pas
→ Vérifier droits d'accès sur dossier
→ Vérifier que pandas est bien installé

## Optimisations futures

- [ ] Intégrer les données du trading robot en temps réel
- [ ] Notifications email si BEHIND target
- [ ] Graphe Excel auto-mis-à-jour avec YTD_2026.csv
- [ ] API BRVM officielle si disponible
- [ ] Aller chercher de sources alternatives si BRVM indisponible

## Questions ?

Voir [GUIDE_UTILISATION_QUOTIDIENNE.md](GUIDE_UTILISATION_QUOTIDIENNE.md) pour le workflow complet.

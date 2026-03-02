## 🤖 Automatisation du Trading Altos

Scripts pour exécuter automatiquement tous les modules de trading sans surveillance.

---

## 📋 Scripts disponibles

### 1. `run_daily_automation.py` - Exécution unique
Exécute tous les modules dans l'ordre:
- ✅ daily_signals.py (signaux Z-Score)
- ✅ daily_market_update.py (portfolio update)
- ✅ portfolio_manager.py (gestion positions)
- ✅ core_rebalancing.py (santé CORE)
- ✅ bond_scanner.py (scan obligations)

```bash
# Exécution manuelle
python run_daily_automation.py
```

**Output:** Logs détaillés dans `logs/automation_YYYYMMDD_HHMMSS.log`

---

## 🕐 Automatisation quotidienne

### Option 1: APScheduler (Recommandé - Multi-plateforme)
Fonctionne sur Windows, Linux, Mac

**Installation:**
```bash
pip install apscheduler
```

**Lancement du scheduler:**
```bash
# Exécution quotidienne à 16:30 (fermeture BRVM)
python setup_scheduler.py

# Exécution à une autre heure
python setup_scheduler.py --time 17:00

# Test une seule fois
python setup_scheduler.py --once
```

**Caractéristiques:**
- ✅ S'exécute automatiquement tous les jours (lun-ven)
- ✅ Fuseau horaire: Africa/Abidjan (BRVM)
- ✅ Continue de tourner en arrière-plan
- ✅ Relancez après redémarrage du PC

---

### Option 2: Windows Task Scheduler (Natif Windows)
Pour une automatisation permanente sans garder cmd ouvert

**Configuration automatique (PowerShell Admin):**
```powershell
# À adapter avec vos chemins
$action = New-ScheduledTaskAction -Execute "C:\Python\python.exe" -Argument "C:\path\to\run_daily_automation.py"
$trigger = New-ScheduledTaskTrigger -Daily -At 16:30:00 -DaysInterval 1
Register-ScheduledTask -TaskName "Altos Trading" -Action $action -Trigger $trigger
```

**Configuration manuelle:**
```bash
python setup_scheduler.py --windows-task
```
Puis suivez les instructions affichées à l'écran.

---

### Option 3: Cron (Linux/Mac)
Éditer le crontab:
```bash
crontab -e
```

Ajouter cette ligne (16:30 = 4:30 PM):
```cron
30 16 * * 1-5 cd /path/to/Altos/Cours_Bours && python run_daily_automation.py >> logs/cron.log 2>&1
```

---

## 📊 Exemple d'exécution

```
================================================================================
🚀 DÉMARRAGE AUTOMATION ALTOS - 02/03/2026 16:30:45
================================================================================

================================================================================
🔄 Démarrage: Génération des signaux Z-Score (daily_signals.py)
================================================================================
[output des signaux...]
✅ SUCCÈS: Génération des signaux Z-Score

[... autres modules ...]

================================================================================
📋 RÉSUMÉ DES EXÉCUTIONS
================================================================================
  ✅ OK: Génération des signaux Z-Score
  ✅ OK: Mise à jour du portefeuille
  ✅ OK: Gestion des positions
  ✅ OK: Monitor CORE stocks
  ✅ OK: Scan des obligations

Total: 5/5 modules exécutés avec succès

🎉 SUCCÈS COMPLET! Tous les modules ont tournés.
```

---

## 📁 Fichiers générés

Après exécution, vous trouverez:

```
Cours_Bours/
├── logs/
│   └── automation_20260302_163045.log    # Logs détaillés
├── output/
│   ├── signals/
│   │   └── signals_20260302.csv          # Signaux du jour
│   └── backtest_reports/
├── YTD_2026.csv                          # Performance YTD
├── open_positions.csv                    # Positions ouvertes
├── executed_trades.csv                   # Trades exécutés
└── bond_opportunities_*.csv              # Obligations trouvées
```

---

## ⚙️ Configuration

### Modifier l'heure d'exécution
Éditez dans `setup_scheduler.py`:
```python
setup_daily_scheduler(run_time="17:00")  # 17:00 au lieu de 16:30
```

### Modifier le capital initial
Éditez dans `config.py`:
```python
REAL_PORTFOLIO_CAPITAL = 1_000_000  # Changez le montant
```

### Ajouter d'autres modules
Modifiez `run_daily_automation.py`:
```python
MODULES = [
    ('daily_signals.py', 'Description'),
    ('votre_module.py', 'Votre description'),  # Nouveau
    # ...
]
```

---

## 🐛 Dépannage

### Le script ne se lance pas
1. Vérifiez que vous êtes dans le bon répertoire:
   ```bash
   cd c:\Users\bagno\Downloads\Altos\Cours_Bours
   ```

2. Vérifiez que Python est installé:
   ```bash
   python --version
   ```

3. Vérifiez que tous les modules sont présents (daily_signals.py, etc.)

### Pas d'output
- Le scheduler peut s'exécuter sans output visible
- Vérifiez le fichier log dans `logs/`
- Ou utilisez `--once` pour tester: `python setup_scheduler.py --once`

### Erreurs de connexion BRVM
- Vérifiez votre connexion internet
- Essayez `python daily_signals.py` directement
- Les erreurs temporaires sont normales - le script réessayera demain

---

## 📌 Recommandations

✅ **Pour une automatisation complète:**
1. Lancez `python setup_scheduler.py` au démarrage du PC
2. Ou configurez Windows Task Scheduler pour auto-launch
3. Consultez les logs quotidiens pour vérifier l'exécution
4. Vérifiez YTD_2026.csv tous les jours pour la performance

✅ **Meilleure pratique:**
- Configurez une alerte email si un module échoue
- Gardez le PC allumé ou utilisez un VPS/serveur
- Vérifiez la synchronisation horaire du PC avec l'heure BRVM

---

## 📞 Support

Pour toute question:
- Vérifiez les logs: `cat logs/automation_*.log`
- Testez manuellement: `python run_daily_automation.py`
- Vérifiez que BRVM est accessible: visitez https://www.brvm.org

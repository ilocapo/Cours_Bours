# Réorganisation workspace (Mars 2026)

## Nouveaux dossiers

- `scripts/guides/`
- `scripts/automation/`
- `scripts/fundamentals/`
- `scripts/maintenance/`
- `data/runtime/`

## Déplacements effectués

### Guides
- `create_guides_excel.py` -> `scripts/guides/create_guides_excel.py`
- `create_guides_excel_v2.py` -> `scripts/guides/create_guides_excel_v2.py`
- `create_guides_excel_final.py` -> `scripts/guides/create_guides_excel_final.py`
- `update_guides_excel.py` -> `scripts/guides/update_guides_excel.py`

### Automation
- `run_daily.py` -> `scripts/automation/run_daily.py`
- `run_daily_automation.py` -> `scripts/automation/run_daily_automation.py`
- `run_grid_logical.py` -> `scripts/automation/run_grid_logical.py`

### Fondamentaux
- `dividend_tracker.py` -> `scripts/fundamentals/dividend_tracker.py`
- `fundamental_scraper.py` -> `scripts/fundamentals/fundamental_scraper.py`
- `fundamentals_core_alert.py` -> `scripts/fundamentals/fundamentals_core_alert.py`

### Maintenance
- `initialize_ytd_from_backtest.py` -> `scripts/maintenance/initialize_ytd_from_backtest.py`
- `patch_dashboard_json.py` -> `scripts/maintenance/patch_dashboard_json.py`
- `pdf_parser.py` -> `scripts/maintenance/pdf_parser.py`

### Données runtime
- `cours_boursiers_fusion.csv/.xlsx`, `SUIVI_TRADING.csv`, `dividends_status.json`, `fundamentals_alerts.json` -> `data/runtime/`

## Compatibilité conservée

Les anciens fichiers `.py` à la racine sont conservés comme wrappers pour ne pas casser les commandes existantes.

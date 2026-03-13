# Cours_Bours

## Structure pro

- [src](src) : modules Python métier (`backtester`, `zscore_calculator`, `config`, etc.).
- [scripts](scripts/README.md) : exécutables classés par domaine.
- [data/runtime](data/runtime) : fichiers CSV/JSON runtime.
- [docs/project](docs/project) : documentation métier et technique.
- [output](output) : rapports et exports générés.
- [archive](archive) : historique/legacy.

## Convention racine

La racine ne contient que les fichiers de convention :
- [README.md](README.md)
- [requirements.txt](requirements.txt)
- [.gitignore](.gitignore)

## Entrées principales

- Automation quotidienne : [scripts/automation/run_daily.py](scripts/automation/run_daily.py)
- Dashboard data : [scripts/trading/generate_dashboard_data.py](scripts/trading/generate_dashboard_data.py)
- Guides Excel : [scripts/guides/create_guides_excel.py](scripts/guides/create_guides_excel.py)

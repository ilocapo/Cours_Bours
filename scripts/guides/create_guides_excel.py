"""
Crée un Excel consolidé avec tous les guides
Une sheet par guide
"""

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DOCS_ROOT = PROJECT_ROOT / 'docs' / 'project'
OUTPUT_DIR = PROJECT_ROOT / 'output' / 'guides'


def _discover_guides():
    """Découvre automatiquement les guides markdown dans docs/project."""
    files = sorted(DOCS_ROOT.rglob('*.md'))
    guides = []
    for p in files:
        stem = p.stem.replace('_', ' ').replace('-', ' ').title()
        sheet_name = stem[:31] if stem else 'Guide'
        guides.append((p, sheet_name))
    return guides

def create_guides_excel():
    """Crée le fichier Excel avec tous les guides"""
    guides = _discover_guides()
    if not guides:
        raise FileNotFoundError(f"Aucun guide trouvé dans {DOCS_ROOT}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Créer workbook
    wb = openpyxl.Workbook()
    wb.remove(wb.active)  # Supprimer la sheet vide par défaut
    
    print("Création du fichier Excel GUIDES_COMPLETS.xlsx...")
    print("=" * 80)
    
    for file_path, sheet_name in guides:
        
        if not file_path.exists():
            print(f"Fichier manquant: {file_path}")
            continue
        
        print(f"\nImportation: {file_path.relative_to(PROJECT_ROOT)} -> Sheet '{sheet_name}'")
        
        # Lire le contenu
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Ajouter une nouvelle sheet
        ws = wb.create_sheet(title=sheet_name)
        
        # Style header
        header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
        header_font = Font(bold=True, color="FFFFFF", size=12)
        
        # Ajouter le titre (nom du guide)
        ws['A1'] = str(file_path.relative_to(PROJECT_ROOT))
        ws['A1'].fill = header_fill
        ws['A1'].font = header_font
        ws.merge_cells('A1:Z1')
        
        # Ajouter le contenu ligne par ligne
        lines = content.split('\n')
        row = 3
        
        for line in lines:
            if line.strip():  # Ne pas ajouter les lignes vides
                ws[f'A{row}'] = line
                ws[f'A{row}'].alignment = Alignment(
                    wrap_text=True,
                    vertical='top',
                    horizontal='left'
                )
                row += 1
        
        # Adjust column width
        ws.column_dimensions['A'].width = 150
        
        print(f"   ✅ {len(lines)} lignes importées")
    
    # Ajouter une page d'accueil
    ws_home = wb.create_sheet(title="📋 Accueil", index=0)
    
    home_content = """
GUIDES COMPLETS - SYSTÈME DE PORTEFEUILLE ALTOS
================================================

Ce fichier contient TOUS les guides pour gérer ton portefeuille en 2026.

GUIDES DISPONIBLES:
─────────────────

1. 📊 Adapter Capital
   → Comment adapter le système à ton budget réel (500K, 1M, 2M FCFA)
   → À FAIRE EN PREMIER si tu commences avec moins de 10M

2. 📈 Daily Update
   → Comment mettre à jour les prix quotidiennement
   → Quand et comment scraper BRVM

3. 💼 Portfolio Manage
   → Gestion quotidienne des positions (08:00-17:00)
   → Comment utiliser daily_signals.py et portfolio_manager.py
   → Suivi des P&L et SL/TP

4. 🎯 Core Rebalancing
   → Monitoring mensuel des 5 big caps du CORE
   → Comment détecter underperformers
   → Comment les remplacer sans perte

5. ✓ Daily Checklist
   → Checklist quotidienne à faire chaque jour
   → Morning, Midday, Evening routines

COMMENT UTILISER CE FICHIER:
────────────────────────────

1. Ouvre ce fichier dans Excel ou Google Sheets
2. Clique sur chaque sheet en bas de l'écran
3. Chaque sheet = un guide complet
4. Importe les informations dans ton broker/système

QUICK START (02/03/2026):
─────────────────────────

Jour J-1 (01/03):
  □ Lis "Adapter Capital"
  □ Modifie config.py avec ton capital réel

Jour J (02/03):
  08:00 → Lis "Daily Checklist" → suit les steps
  08:30 → Lance daily_signals.py
  09:00 → Lis "Portfolio Manage" → exécute trades
  16:30 → Lance portfolio_manager.py

Mensuel (1er du mois):
  → Lis "Core Rebalancing"
  → Lance core_rebalancing.py
  → Vérifie si remplacement nécessaire

CONTACT:
────────
Si besoin d'aide, regarde le section TROUBLESHOOTING dans chaque guide.
""".strip()
    
    for i, line in enumerate(home_content.split('\n'), 1):
        cell = ws_home[f'A{i}']
        cell.value = line
        cell.alignment = Alignment(wrap_text=True, vertical='top', horizontal='left')
    
    ws_home.column_dimensions['A'].width = 150
    
    # Sauvegarder
    output_path = OUTPUT_DIR / 'GUIDES_COMPLETS.xlsx'
    wb.save(output_path)
    
    print("\n" + "=" * 80)
    print(f"✅ Fichier créé: {output_path}")
    print(f"   → Ouvre dans Excel: double-click GUIDES_COMPLETS.xlsx")
    print("=" * 80)
    
    return output_path

if __name__ == "__main__":
    create_guides_excel()

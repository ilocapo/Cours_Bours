"""
Créé l'Excel GUIDES_COMPLETS_V2.xlsx avec Bond Scanner inclus
"""

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DOCS_ROOT = PROJECT_ROOT / 'docs' / 'project'
OUTPUT_DIR = PROJECT_ROOT / 'output' / 'guides'

def create_guides_excel_v2():
    """Crée Excel avec tous les guides + Bond Scanner"""
    
    print("Création de GUIDES_COMPLETS_V2.xlsx...")
    print("=" * 80)
    
    # Créer workbook
    wb = openpyxl.Workbook()
    wb.remove(wb.active)
    
    GUIDES = [
        (DOCS_ROOT / 'guides' / 'GUIDE_BOND_SCANNER.md', 'Bond Scanner', "66BB6A"),
    ]
    
    # Ajouter chaque guide
    for file_path, sheet_name, color in GUIDES:
        
        if not file_path.exists():
            print(f"File not found: {file_path}")
            continue
        
        print(f"\nAdding: {file_path.relative_to(PROJECT_ROOT)} -> '{sheet_name}'")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        ws = wb.create_sheet(title=sheet_name)
        
        # Style header
        header_fill = PatternFill(start_color=color, end_color=color, fill_type="solid")
        header_font = Font(bold=True, color="FFFFFF", size=12)
        
        # Title
        ws['A1'] = str(file_path.relative_to(PROJECT_ROOT))
        ws['A1'].fill = header_fill
        ws['A1'].font = header_font
        ws.merge_cells('A1:Z1')
        
        # Content
        lines = content.split('\n')
        row = 3
        
        for line in lines:
            if line.strip():
                ws[f'A{row}'] = line
                ws[f'A{row}'].alignment = Alignment(wrap_text=True, vertical='top', horizontal='left')
                row += 1
        
        ws.column_dimensions['A'].width = 150
        
        print(f"   ✅ {len(lines)} lines imported")
    
    # Home page
    ws_home = wb.create_sheet(title="📋 Home", index=0)
    
    home_content = """
CONSOLIDATED GUIDES - ADDITIONAL SYSTEM COMPONENT
==================================================

NEW: Bond Scanner Radar for CORE Portfolio
──────────────────────────────────────────

This file now includes a NEW INDEPENDENT radar:

🏛️ BOND SCANNER
   └─ Find obligations trading < 100% (discount bonds)
   └─ Target: CORE portfolio (70% - Shield)
   └─ Independent from Z-Score SATELLITE trades
   └─ Super-yields on government UEMOA bonds

ARCHITECTURE:

CORE (70%) = Safe shield
├─ 5 Big Cap Stocks (dividends 8%)
├─ Bonds < 100% (coupons 5-7% + discount)
└─ Rendement: 7-8% stable

SATELLITE (30%) = Aggressive sword
└─ Z-Score Robot (20-30% volatile)

TOTAL TARGET: 10-12% annual return

USAGE:

1. Open GUIDES_COMPLETS_V2.xlsx
2. Go to "Bond Scanner" sheet
3. Run: python bond_scanner.py
   → Creates bond_opportunities_*.csv
   → Shows best discounted bonds
4. Add top bonds to core_allocation.csv
5. Enjoy 6-7% stable bond returns in CORE

SUMMARY:

Portfolio = Sword (SATELLITE) + Shield (CORE + Bonds)
    30% aggressive trading (Z-Score)
  + 40% dividend stocks (SNTS, ORGT, etc.)
  + 20% discounted bonds (UEMOA bonds)
  + 10% cash reserves
  = 10-12% annual return

NOT FOR:
- Day trading obligations (no gains)
- Mixing with Z-Score signals (architecture violation)
- Small discounts < 1% (not worth it)

FOR:
- Long-term income stability
- Government bonds (no credit risk)
- Portfolio diversification
- UEMOA jurisdiction (Senegal, CI, Benin, Togo, etc.)
""".strip()
    
    for i, line in enumerate(home_content.split('\n'), 1):
        cell = ws_home[f'A{i}']
        cell.value = line
        cell.alignment = Alignment(wrap_text=True, vertical='top')
    
    ws_home.column_dimensions['A'].width = 150
    
    # Save
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / 'GUIDES_COMPLETS_V2.xlsx'
    wb.save(output_path)
    
    print("\n" + "=" * 80)
    print(f"✅ Created: {output_path}")
    print(f"   → Double-click to open in Excel")
    print(f"   → Sheets: {list(wb.sheetnames)}")
    print("=" * 80)

if __name__ == "__main__":
    create_guides_excel_v2()

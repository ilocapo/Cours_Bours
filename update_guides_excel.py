"""
Ajoute le guide Bond Scanner à l'Excel GUIDES_COMPLETS.xlsx
"""

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from pathlib import Path

def add_bond_guide_to_excel():
    """Ajoute une sheet Bond Scanner à l'Excel existant"""
    
    excel_path = Path(__file__).parent / 'GUIDES_COMPLETS.xlsx'
    guide_path = Path(__file__).parent / 'GUIDE_BOND_SCANNER.md'
    
    print(f"Ouverture Excel: {excel_path}")
    
    # Ouvrir l'Excel existant
    wb = openpyxl.load_workbook(excel_path)
    
    # Lire le guide
    with open(guide_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Créer une nouvelle sheet (ou remplacer si existe déjà)
    if 'Bond Scanner' in wb.sheetnames:
        print("  Suppression de la vieille sheet 'Bond Scanner'...")
        del wb['Bond Scanner']
    
    ws = wb.create_sheet(title='Bond Scanner')
    
    # Style header
    header_fill = PatternFill(start_color="FF6B6B", end_color="FF6B6B", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=12)
    
    # Titre
    ws['A1'] = 'GUIDE_BOND_SCANNER.md'
    ws['A1'].fill = header_fill
    ws['A1'].font = header_font
    ws.merge_cells('A1:Z1')
    
    # Contenu
    lines = content.split('\n')
    row = 3
    
    for line in lines:
        if line.strip():
            ws[f'A{row}'] = line
            ws[f'A{row}'].alignment = Alignment(
                wrap_text=True,
                vertical='top',
                horizontal='left'
            )
            row += 1
    
    ws.column_dimensions['A'].width = 150
    
    # Sauvegarder
    wb.save(excel_path)
    
    print(f"✅ {excel_path}")
    print(f"   → Sheet 'Bond Scanner' ajoutée")
    print(f"   → Total sheets: {len(wb.sheetnames)}")
    for sheet_name in wb.sheetnames:
        print(f"      - {sheet_name}")

if __name__ == "__main__":
    add_bond_guide_to_excel()

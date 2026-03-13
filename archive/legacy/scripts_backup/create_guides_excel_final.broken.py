from pathlib import Path

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DOCS_ROOT = PROJECT_ROOT / "docs" / "project"
OUTPUT_DIR = PROJECT_ROOT / "output" / "guides"


def create_final_guides_excel():
   wb = openpyxl.Workbook()
   wb.remove(wb.active)

   guides = [
      (DOCS_ROOT / "usage" / "QUICKSTART_UTILISATEUR.md", "QuickStart", "FFAA00"),
      (DOCS_ROOT / "guides" / "GUIDE_BOND_SCANNER.md", "Bond Scanner", "66BB6A"),
   ]

   for file_path, sheet_name, color in guides:
      if not file_path.exists():
         print(f"File not found: {file_path}")
         continue

      print(f"Adding: {file_path.relative_to(PROJECT_ROOT)} -> {sheet_name}")
      content = file_path.read_text(encoding="utf-8")

      ws = wb.create_sheet(title=sheet_name)
      header_fill = PatternFill(start_color=color, end_color=color, fill_type="solid")
      header_font = Font(bold=True, color="FFFFFF", size=12)

      ws["A1"] = str(file_path.relative_to(PROJECT_ROOT))
      ws["A1"].fill = header_fill
      ws["A1"].font = header_font
      ws.merge_cells("A1:Z1")

      row = 3
      for line in content.split("\n"):
         if line.strip():
            ws[f"A{row}"] = line
            ws[f"A{row}"].alignment = Alignment(wrap_text=True, vertical="top", horizontal="left")
            row += 1

      ws.column_dimensions["A"].width = 150

   ws_home = wb.create_sheet(title="🏠 START HERE", index=0)
   ws_home["A1"] = "ALTOS PORTFOLIO MANAGEMENT SYSTEM - START HERE"
   ws_home["A1"].font = Font(bold=True, size=14)
   ws_home["A3"] = "Read QuickStart and Bond Scanner tabs to begin."
   ws_home.column_dimensions["A"].width = 120

   OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
   output_path = OUTPUT_DIR / "GUIDES_COMPLETS_FINAL.xlsx"
   wb.save(output_path)
   print(f"✅ Created: {output_path}")


if __name__ == "__main__":
   create_final_guides_excel()

'''

"""
Crée GUIDES_COMPLETS_FINAL.xlsx avec QuickStart inclus
"""

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent
DOCS_ROOT = PROJECT_ROOT / 'docs' / 'project'
OUTPUT_DIR = PROJECT_ROOT / 'output' / 'guides'

def create_final_guides_excel():
    """Crée Excel FINAL avec tous les guides"""

       _indent_probe = True
    
      if True:
         print("Creating GUIDES_COMPLETS_FINAL.xlsx...")
         print("=" * 80)

      wb = openpyxl.Workbook()
      wb.remove(wb.active)

      guides = [
         (DOCS_ROOT / 'usage' / 'QUICKSTART_UTILISATEUR.md', 'QuickStart', "FFAA00"),
         (DOCS_ROOT / 'guides' / 'GUIDE_BOND_SCANNER.md', 'Bond Scanner', "66BB6A"),
      ]

      # Add guides
      for file_path, sheet_name, color in guides:

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

         print(f"   ✅ {len(lines)} lines")
    
    # Home page
    ws_home = wb.create_sheet(title="🏠 START HERE", index=0)
    
    home_content = """
ALTOS PORTFOLIO MANAGEMENT SYSTEM - START HERE!
===============================================

Welcome! This is your complete trading system for 2026.

STRUCTURE:
──────────

Your portfolio = Sword (30%) + Shield (70%)

🛡️ SHIELD (70% safe & stable)
   ├─ 5 dividend stocks (SNTS, ORGT, ONTBF, SAFC, ABJC)
   ├─ Government UEMOA bonds (< 100% discount)
   └─ 7-8% annual return (stable)

⚔️ SWORD (30% aggressive)
   └─ Z-Score robot trading
   └─ 20-30% annual return (volatile)

TOTAL TARGET: 10-12% annual return

NEXT STEPS:
──────────

1️⃣ CONFIGURATION (TODAY - 01/03/2026):
   ✓ Open: config.py
   ✓ Change: REAL_PORTFOLIO_CAPITAL = your_amount
   ✓ Save and run: python config.py
   
2️⃣ READ GUIDES (TODAY):
   ✓ Go to "QuickStart" sheet below
   ✓ Follow setup instructions
   
3️⃣ LIVE TRADING (TOMORROW - 02/03/2026):
   ✓ 08:00 → python daily_signals.py
   ✓ 09:00 → Buy on broker
   ✓ 16:30 → python portfolio_manager.py
   
4️⃣ MONTHLY (1st of month):
   ✓ python core_rebalancing.py (monitor stocks)
   ✓ python bond_scanner.py (find cheap bonds)

AVAILABLE SHEETS:
─────────────────

📊 QuickStart
   → Day-by-day usage guide
   → Exact commands to run
   → Example trades
   
🏛️ Bond Scanner
   → Find obligations trading < 100%
   → Portfolio architecture (Shield vs Sword)
   → Integration with CORE portfolio

RECOMMENDED READING ORDER:
──────────────────────────

1. Read this page (5 min)
2. Read "QuickStart" (15 min)
3. Follow setup checklist
4. Run python config.py
5. Get ready for 02/03/2026!

IMPORTANT FILES:
────────────────

TO MODIFY:
  • config.py - Set your real capital
  • open_positions.csv - Add your trades
  
AUTO-MANAGED (don't touch):
  • daily_signals.py output
  • portfolio_manager.py output
  • YTD_2026.csv - Daily tracking
  • executed_trades.csv - Closed positions

DAILY ROUTINE (5 minutes):
─────────────────────────

📅 Every day at 08:00
   └─ python daily_signals.py
   └─ Note 5-10 BUY/SELL recommendations
   
📅 Every day at 09:00-14:00
   └─ Execute trades on broker
   └─ Add to open_positions.csv
   
📅 Every day at 16:30
   └─ python portfolio_manager.py
   └─ Check P&L (auto-updated)
   └─ SL/TP auto-closed
   
📅 Every day at 17:00 (optional)
   └─ python daily_market_update.py
   └─ YTD_2026.csv updated

MONTHLY ROUTINE (10 minutes):
────────────────────────────

📅 1st of month
   └─ python core_rebalancing.py
   └─ Check if any CORE stocks are underperforming
   └─ If yes: Replace with better performer
   
📅 1st of month
   └─ python bond_scanner.py
   └─ Find discounted government bonds
   └─ If discount > 2%: Add to CORE Shield

QUICK START:
────────────

TODAY (01/03/2026):
  □ Modify config.py
  □ Run: python config.py
  □ Read QuickStart sheet
  
TOMORROW (02/03/2026) AT 08:00:
  □ python daily_signals.py
  □ Buy on broker
  □ Add to open_positions.csv
  □ python portfolio_manager.py at 16:30
  □ Done! Repeat tomorrow

TROUBLESHOOTING:
────────────────

Q: Where's the Excel with all guides?
A: You're looking at it! Each tab = one complete guide.

Q: Can I use my phone?
A: Trades yes (via broker app). Scripts require Windows with Python.

Q: What if I miss a day?
A: No problem. Catch up tomorrow. System has no memory.

Q: How much profit will I make?
A: Target: 10-12% annual (7-8% safe + 3-4% from aggressive trading).
   But: Past performance ≠ future results. See GUIDE files for details.

Q: Which Excel to use?
A: THIS ONE: GUIDES_COMPLETS_FINAL.xlsx
   (Open with Excel, not Google Sheets - works better)

LET'S GO! 🚀
────────────

You're all set. Read QuickStart, then you're ready!

Good luck! 🎯
""".strip()
    
    for i, line in enumerate(home_content.split('\n'), 1):
        cell = ws_home[f'A{i}']
        cell.value = line
        cell.alignment = Alignment(wrap_text=True, vertical='top')
    
    ws_home.column_dimensions['A'].width = 150
    
    # Save
      OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
      output_path = OUTPUT_DIR / 'GUIDES_COMPLETS_FINAL.xlsx'
    wb.save(output_path)
    
    print("\n" + "=" * 80)
    print(f"✅ Created: {output_path}")
    print(f"   → Sheets: {list(wb.sheetnames)}")
    print("\n" + "=" * 80)
    print("USAGE:")
    print("  1. Open GUIDES_COMPLETS_FINAL.xlsx")
    print("  2. Read sheet '🏠 START HERE'")
    print("  3. Follow TL;DR checklist")
    print("=" * 80)

if __name__ == "__main__":
    create_final_guides_excel()

'''

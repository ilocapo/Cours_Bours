"""Crée GUIDES_COMPLETS_FINAL.xlsx avec une page d'accueil et les guides essentiels."""

from pathlib import Path

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DOCS_ROOT = PROJECT_ROOT / "docs" / "project"
OUTPUT_DIR = PROJECT_ROOT / "output" / "guides"

GUIDES = [
    (DOCS_ROOT / "usage" / "QUICKSTART_UTILISATEUR.md", "QuickStart", "FFAA00"),
    (DOCS_ROOT / "guides" / "GUIDE_BOND_SCANNER.md", "Bond Scanner", "66BB6A"),
]


def add_markdown_sheet(workbook, file_path: Path, sheet_name: str, color: str) -> None:
    if not file_path.exists():
        print(f"File not found: {file_path}")
        return

    content = file_path.read_text(encoding="utf-8")
    ws = workbook.create_sheet(title=sheet_name)

    header_fill = PatternFill(start_color=color, end_color=color, fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=12)

    ws["A1"] = str(file_path.relative_to(PROJECT_ROOT))
    ws["A1"].fill = header_fill
    ws["A1"].font = header_font
    ws.merge_cells("A1:Z1")

    row = 3
    for line in content.splitlines():
        if line.strip():
            ws[f"A{row}"] = line
            ws[f"A{row}"].alignment = Alignment(wrap_text=True, vertical="top", horizontal="left")
            row += 1

    ws.column_dimensions["A"].width = 150
    print(f"Added: {file_path.relative_to(PROJECT_ROOT)} -> {sheet_name}")


def add_home_sheet(workbook) -> None:
    ws = workbook.create_sheet(title="🏠 START HERE", index=0)
    ws["A1"] = "ALTOS PORTFOLIO MANAGEMENT SYSTEM - START HERE"
    ws["A1"].font = Font(bold=True, size=14)
    ws["A3"] = "1) Read QuickStart  2) Read Bond Scanner  3) Run daily automation"
    ws.column_dimensions["A"].width = 120


def create_final_guides_excel() -> None:
    workbook = openpyxl.Workbook()
    workbook.remove(workbook.active)

    for file_path, sheet_name, color in GUIDES:
        add_markdown_sheet(workbook, file_path, sheet_name, color)

    add_home_sheet(workbook)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / "GUIDES_COMPLETS_FINAL.xlsx"
    workbook.save(output_path)
    print(f"✅ Created: {output_path}")


if __name__ == "__main__":
    create_final_guides_excel()

// Exports tableur sans dépendance : CSV (séparateur « ; », UTF-8 avec BOM : s'ouvre directement dans Excel en français)
// et « Excel » au format XML SpreadsheetML (.xls) lisible par Excel, LibreOffice et Numbers.
export type Cell = string | number | null | undefined;

const csvCell = (c: Cell) => { const s = c == null ? "" : String(c); return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export const toCsv = (rows: Cell[][]) => "﻿" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n");

const xml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
export function toXls(sheet: string, rows: Cell[][]): string {
  const body = rows.map((r, i) => `<Row>${r.map((c) => (typeof c === "number" ? `<Cell><Data ss:Type="Number">${c}</Data></Cell>` : `<Cell${i === 0 ? ' ss:StyleID="h"' : ""}><Data ss:Type="String">${xml(c == null ? "" : String(c))}</Data></Cell>`)).join("")}</Row>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="h"><Font ss:Bold="1"/></Style></Styles>
<Worksheet ss:Name="${xml(sheet.slice(0, 30))}"><Table>${body}</Table></Worksheet></Workbook>`;
}

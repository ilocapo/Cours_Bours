"""
Generate 10-day operational history report.

Produit automatiquement:
1) output/reports/history_last10days.csv
2) output/reports/transactions_last10days.csv
3) output/reports/history_last10days.md

Contenu:
- Historique des runs automation (succès/erreurs)
- Transactions exécutées par jour
- Résultats portefeuille (CORE/SATELLITE/TOTAL/YTD)
"""

from __future__ import annotations

import glob
import os
import re
import json
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]
LOG_DIR = PROJECT_ROOT / "logs"
OUTPUT_DIR = PROJECT_ROOT / "output" / "reports"
DOCS_DATA_DIR = PROJECT_ROOT / "docs" / "data"
YTD_FILE = PROJECT_ROOT / "YTD_2026.csv"
EXECUTED_TRADES_FILE = PROJECT_ROOT / "executed_trades.csv"


@dataclass
class RunSummary:
    date: str
    started_at: str
    modules_ok: int = 0
    modules_err: int = 0
    fatal: int = 0
    last_status: str = "UNKNOWN"


def _normalize_date(value: str) -> str:
    """Convertit une date en format dd/mm/YYYY si possible."""
    try:
        dt = pd.to_datetime(value, dayfirst=True, errors="coerce")
        if pd.isna(dt):
            return ""
        return dt.strftime("%d/%m/%Y")
    except Exception:
        return ""


def parse_automation_logs_last10days() -> pd.DataFrame:
    """Parse les logs automation et retourne un résumé par date (10 derniers jours)."""
    files = sorted(glob.glob(str(LOG_DIR / "automation_*.log")))
    if not files:
        return pd.DataFrame(columns=["Date", "Run_Started_At", "Run_Status", "Modules_OK", "Modules_Error"])

    # Garder seulement les fichiers potentiellement dans la fenêtre 10 jours
    cutoff = datetime.now() - timedelta(days=10)
    selected = []
    for f in files:
        try:
            mtime = datetime.fromtimestamp(os.path.getmtime(f))
            if mtime >= cutoff:
                selected.append(f)
        except Exception:
            continue

    if not selected:
        # fallback: prendre les 10 derniers fichiers
        selected = files[-10:]

    rows: List[RunSummary] = []
    ts_pat = re.compile(r"\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]\s+(\w+):\s*(.*)")

    for log_file in selected:
        summary = None
        try:
            with open(log_file, "r", encoding="utf-8", errors="ignore") as fh:
                for line in fh:
                    m = ts_pat.search(line)
                    if not m:
                        continue

                    ts_str, level, msg = m.groups()
                    dt = datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S")

                    if "DEMARRAGE AUTOMATION ALTOS" in msg and summary is None:
                        summary = RunSummary(
                            date=dt.strftime("%d/%m/%Y"),
                            started_at=dt.strftime("%H:%M:%S"),
                        )

                    if summary is None:
                        continue

                    if "SUCCESS: OK:" in line:
                        summary.modules_ok += 1
                    if "ERROR:" in line or "ERREUR:" in msg:
                        summary.modules_err += 1
                    if "CRITICAL" in line or "ERREUR FATALE" in msg:
                        summary.fatal += 1

            if summary is None:
                # pas un log standard, ignorer
                continue

            if summary.fatal > 0:
                summary.last_status = "FAILED"
            elif summary.modules_err > 0:
                summary.last_status = "PARTIAL"
            elif summary.modules_ok > 0:
                summary.last_status = "SUCCESS"
            else:
                summary.last_status = "UNKNOWN"

            rows.append(summary)
        except Exception:
            continue

    if not rows:
        return pd.DataFrame(columns=["Date", "Run_Started_At", "Run_Status", "Modules_OK", "Modules_Error"])

    df = pd.DataFrame([
        {
            "Date": r.date,
            "Run_Started_At": r.started_at,
            "Run_Status": r.last_status,
            "Modules_OK": r.modules_ok,
            "Modules_Error": r.modules_err,
        }
        for r in rows
    ])

    # Si plusieurs runs le même jour, garder le dernier horaire
    df["_dt"] = pd.to_datetime(df["Date"] + " " + df["Run_Started_At"], dayfirst=True, errors="coerce")
    df = df.sort_values("_dt").groupby("Date", as_index=False).last()
    df = df.drop(columns=["_dt"])
    return df


def load_ytd_last10days() -> pd.DataFrame:
    if not YTD_FILE.exists():
        return pd.DataFrame(columns=["Date", "Core_Value", "Satellite_Value", "Total_Value", "YTD_Return_%", "Trades_Count"])

    df = pd.read_csv(YTD_FILE)
    if df.empty or "Date" not in df.columns:
        return pd.DataFrame(columns=["Date", "Core_Value", "Satellite_Value", "Total_Value", "YTD_Return_%", "Trades_Count"])

    df["Date"] = pd.to_datetime(df["Date"], dayfirst=True, errors="coerce")
    df = df.dropna(subset=["Date"]).sort_values("Date")

    # garder la dernière ligne par jour (format string uniforme)
    df["DateStr"] = df["Date"].dt.strftime("%d/%m/%Y")
    df = df.groupby("DateStr", as_index=False).last()
    df["Date"] = df["DateStr"]

    needed = ["Date", "Core_Value", "Satellite_Value", "Total_Value", "YTD_Return_%", "Trades_Count"]
    for c in needed:
        if c not in df.columns:
            df[c] = 0

    return df[needed]


def load_transactions_last10days() -> pd.DataFrame:
    if not EXECUTED_TRADES_FILE.exists():
        return pd.DataFrame(columns=[
            "Exit_Date", "Ticker", "Qty", "Entry_Price", "Exit_Price", "Exit_Reason", "P&L_FCFA", "P&L_%"
        ])

    df = pd.read_csv(EXECUTED_TRADES_FILE)
    if df.empty:
        return pd.DataFrame(columns=[
            "Exit_Date", "Ticker", "Qty", "Entry_Price", "Exit_Price", "Exit_Reason", "P&L_FCFA", "P&L_%"
        ])

    if "Exit_Date" not in df.columns:
        return pd.DataFrame(columns=[
            "Exit_Date", "Ticker", "Qty", "Entry_Price", "Exit_Price", "Exit_Reason", "P&L_FCFA", "P&L_%"
        ])

    df["Exit_Date"] = pd.to_datetime(df["Exit_Date"], dayfirst=True, errors="coerce")
    cutoff = datetime.now() - timedelta(days=10)
    df = df[df["Exit_Date"] >= cutoff].copy()

    if df.empty:
        return pd.DataFrame(columns=[
            "Exit_Date", "Ticker", "Qty", "Entry_Price", "Exit_Price", "Exit_Reason", "P&L_FCFA", "P&L_%"
        ])

    # Normaliser colonnes utiles
    for c in ["Qty", "Entry_Price", "Exit_Price", "P&L_FCFA", "P&L_%"]:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0)
        else:
            df[c] = 0

    if "Ticker" not in df.columns:
        df["Ticker"] = ""
    if "Exit_Reason" not in df.columns:
        df["Exit_Reason"] = ""

    df["Exit_Date"] = df["Exit_Date"].dt.strftime("%d/%m/%Y")
    return df[["Exit_Date", "Ticker", "Qty", "Entry_Price", "Exit_Price", "Exit_Reason", "P&L_FCFA", "P&L_%"]]


def build_transactions_archive() -> pd.DataFrame:
    """Construit/maintient un historique cumulé de toutes les transactions closes."""
    archive_path = OUTPUT_DIR / "transactions_all.csv"

    cols = ["Exit_Date", "Ticker", "Qty", "Entry_Price", "Exit_Price", "Exit_Reason", "P&L_FCFA", "P&L_%"]

    if EXECUTED_TRADES_FILE.exists():
        cur = pd.read_csv(EXECUTED_TRADES_FILE)
    else:
        cur = pd.DataFrame(columns=[])

    if cur.empty:
        if archive_path.exists():
            arch = pd.read_csv(archive_path)
            for c in cols:
                if c not in arch.columns:
                    arch[c] = ""
            return arch[cols]
        return pd.DataFrame(columns=cols)

    # Normaliser colonnes
    if "Exit_Date" in cur.columns:
        cur["Exit_Date"] = pd.to_datetime(cur["Exit_Date"], dayfirst=True, errors="coerce").dt.strftime("%d/%m/%Y")
    else:
        cur["Exit_Date"] = ""

    for c in ["Qty", "Entry_Price", "Exit_Price", "P&L_FCFA", "P&L_%"]:
        cur[c] = pd.to_numeric(cur[c], errors="coerce").fillna(0) if c in cur.columns else 0
    cur["Ticker"] = cur["Ticker"].astype(str).str.upper() if "Ticker" in cur.columns else ""
    cur["Exit_Reason"] = cur["Exit_Reason"].astype(str) if "Exit_Reason" in cur.columns else ""

    cur = cur[["Exit_Date", "Ticker", "Qty", "Entry_Price", "Exit_Price", "Exit_Reason", "P&L_FCFA", "P&L_%"]].copy()

    if archive_path.exists():
        arch = pd.read_csv(archive_path)
        for c in cols:
            if c not in arch.columns:
                arch[c] = ""
        arch = arch[cols]
        merged = pd.concat([arch, cur], ignore_index=True)
    else:
        merged = cur.copy()

    # Clé de déduplication pour éviter les doublons à chaque run
    merged["_k"] = (
        merged["Exit_Date"].astype(str) + "|" +
        merged["Ticker"].astype(str) + "|" +
        merged["Qty"].astype(str) + "|" +
        merged["Entry_Price"].astype(str) + "|" +
        merged["Exit_Price"].astype(str) + "|" +
        merged["Exit_Reason"].astype(str)
    )
    merged = merged.drop_duplicates(subset=["_k"], keep="last").drop(columns=["_k"])

    # Tri date croissante
    merged["_dt"] = pd.to_datetime(merged["Exit_Date"], dayfirst=True, errors="coerce")
    merged = merged.sort_values(["_dt", "Ticker"], na_position="last").drop(columns=["_dt"]).reset_index(drop=True)

    return merged


def build_daily_history() -> pd.DataFrame:
    """Construit le tableau final 10 jours (runs + transactions + portefeuille)."""
    runs_df = parse_automation_logs_last10days()
    ytd_df = load_ytd_last10days()
    tx_df = load_transactions_last10days()

    # Fenêtre de dates (10 jours glissants)
    dates = [(datetime.now() - timedelta(days=i)).strftime("%d/%m/%Y") for i in range(9, -1, -1)]
    base = pd.DataFrame({"Date": dates})

    # Agrégat transactions par date
    if not tx_df.empty:
        tx_agg = tx_df.groupby("Exit_Date", as_index=False).agg(
            Transactions_Closed=("Ticker", "count"),
            PnL_Day_FCFA=("P&L_FCFA", "sum"),
            Avg_PnL_Pct=("P&L_%", "mean"),
        ).rename(columns={"Exit_Date": "Date"})
    else:
        tx_agg = pd.DataFrame(columns=["Date", "Transactions_Closed", "PnL_Day_FCFA", "Avg_PnL_Pct"])

    # Merge global
    out = base.merge(runs_df, on="Date", how="left")
    out = out.merge(tx_agg, on="Date", how="left")
    out = out.merge(ytd_df, on="Date", how="left")

    # Valeurs par défaut
    out["Run_Status"] = out["Run_Status"].fillna("NO_RUN")
    for c in ["Modules_OK", "Modules_Error", "Transactions_Closed", "PnL_Day_FCFA", "Avg_PnL_Pct",
              "Core_Value", "Satellite_Value", "Total_Value", "YTD_Return_%", "Trades_Count"]:
        if c not in out.columns:
            out[c] = 0
        out[c] = out[c].fillna(0)

    return out


def save_reports(df_hist: pd.DataFrame, df_tx_last10: pd.DataFrame, df_tx_all: pd.DataFrame) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    DOCS_DATA_DIR.mkdir(parents=True, exist_ok=True)

    csv_hist = OUTPUT_DIR / "history_last10days.csv"
    csv_tx_10 = OUTPUT_DIR / "transactions_last10days.csv"
    csv_tx_all = OUTPUT_DIR / "transactions_all.csv"
    md_file = OUTPUT_DIR / "history_last10days.md"

    df_hist.to_csv(csv_hist, index=False)
    df_tx_last10.to_csv(csv_tx_10, index=False)
    df_tx_all.to_csv(csv_tx_all, index=False)

    # Copies pour GitHub Pages (docs/data)
    docs_hist_csv = DOCS_DATA_DIR / "history_last10days.csv"
    docs_tx10_csv = DOCS_DATA_DIR / "transactions_last10days.csv"
    docs_txall_csv = DOCS_DATA_DIR / "transactions_all.csv"
    df_hist.to_csv(docs_hist_csv, index=False)
    df_tx_last10.to_csv(docs_tx10_csv, index=False)
    df_tx_all.to_csv(docs_txall_csv, index=False)

    # JSON pour frontend
    docs_hist_json = DOCS_DATA_DIR / "history_last10days.json"
    docs_txall_json = DOCS_DATA_DIR / "transactions_all.json"
    with open(docs_hist_json, "w", encoding="utf-8") as f:
        json.dump(df_hist.to_dict(orient="records"), f, ensure_ascii=False)
    with open(docs_txall_json, "w", encoding="utf-8") as f:
        # limiter la taille affichée côté front (500 dernières)
        json.dump(df_tx_all.tail(500).to_dict(orient="records"), f, ensure_ascii=False)

    # Markdown lisible rapide
    with open(md_file, "w", encoding="utf-8") as f:
        f.write("# Historique 10 derniers jours\n\n")
        f.write("## Runs + Portefeuille\n\n")
        f.write(df_hist.to_string(index=False))
        f.write("\n\n## Transactions clôturées (10 jours)\n\n")
        if df_tx_last10.empty:
            f.write("Aucune transaction clôturée sur les 10 derniers jours.\n")
        else:
            f.write(df_tx_last10.to_string(index=False))
            f.write("\n")

    print("\n" + "=" * 100)
    print("HISTORIQUE 10 JOURS GÉNÉRÉ")
    print("=" * 100)
    print(f"✅ {csv_hist}")
    print(f"✅ {csv_tx_10}")
    print(f"✅ {csv_tx_all}")
    print(f"✅ {md_file}")
    print(f"✅ {docs_hist_json}")
    print(f"✅ {docs_txall_json}")


def main() -> None:
    df_hist = build_daily_history()
    df_tx_10 = load_transactions_last10days()
    df_tx_all = build_transactions_archive()
    save_reports(df_hist, df_tx_10, df_tx_all)


if __name__ == "__main__":
    main()

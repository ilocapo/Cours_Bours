#!/usr/bin/env python3
"""
patch_dashboard_json.py
Mise à jour rapide de docs/data/dashboard.json après chaque automation.
Lit YTD_2026.csv + dernier fichier de signaux → patche overview + signals.
Ne relance PAS les backtests (très rapide, ~1 sec).
"""

import json
import glob
import csv
import os
from datetime import datetime
from pathlib import Path

ROOT       = Path(__file__).resolve().parent
JSON_FILE  = ROOT / "docs" / "data" / "dashboard.json"
YTD_FILE   = ROOT / "YTD_2026.csv"
SIG_GLOB        = str(ROOT / "output" / "signals" / "*.csv")
CORE_FILE       = ROOT / "core_allocation.csv"
BOND_GLOB       = str(ROOT / "bond_opportunities_*.csv")
FUND_ALERTS     = ROOT / "fundamentals_alerts.json"
DIVIDENDS_STATUS= ROOT / "dividends_status.json"
PDF_DIR         = ROOT / "rapports_annuels"
PDF_LOG         = ROOT / "rapports_annuels" / "parse_log.json"

INITIAL_CAPITAL     = 1_000_000
CORE_PCT            = 0.70
SATELLITE_PCT       = 0.20
CASH_PCT            = 0.10

try:
    from config import (
        REAL_PORTFOLIO_CAPITAL, CORE_ALLOCATION_PCT,
        SATELLITE_ALLOCATION_PCT, CASH_ALLOCATION_PCT
    )
    INITIAL_CAPITAL  = REAL_PORTFOLIO_CAPITAL
    CORE_PCT         = CORE_ALLOCATION_PCT
    SATELLITE_PCT    = SATELLITE_ALLOCATION_PCT
    CASH_PCT         = CASH_ALLOCATION_PCT
except Exception:
    pass


def safe_float(v, default=0.0):
    try:
        return float(str(v).replace(",", ".").replace(" ", ""))
    except Exception:
        return default


def read_ytd():
    """Retourne la dernière ligne valide de YTD_2026.csv (2026 only)."""
    if not YTD_FILE.exists():
        print(f"  [WARN] {YTD_FILE} introuvable")
        return None
    rows = []
    with open(YTD_FILE, encoding="utf-8") as f:
        lines = f.readlines()
    for line in lines[1:]:           # skip header
        parts = line.strip().split(",")
        if len(parts) >= 5:
            date_str = parts[0].strip()
            # Exclure la ligne 2025 (initialisation)
            if "2026" in date_str or (date_str and date_str[-4:] == "2026"):
                rows.append(parts)
    if not rows:
        return None
    last = rows[-1]
    return {
        "date":      last[0],
        "core":      safe_float(last[1]),
        "satellite": safe_float(last[2]),
        "total":     safe_float(last[3]),
        "ytd_pct":   safe_float(last[4]),
        "trades":    int(safe_float(last[5], 0)) if len(last) > 5 else 0,
        "status":    last[6].strip() if len(last) > 6 else "",
    }


def read_signals():
    """Lit le dernier fichier signals CSV et retourne un résumé."""
    files = sorted(glob.glob(SIG_GLOB))
    if not files:
        return None, []
    latest = files[-1]
    summary = {"strongBuy": 0, "buy": 0, "hold": 0, "sell": 0, "strongSell": 0}
    current = []
    with open(latest, encoding="utf-8") as f:
        lines = f.readlines()
    headers = [h.strip() for h in lines[0].split(",")]
    def col(row, name):
        try:
            return row[headers.index(name)].strip()
        except (ValueError, IndexError):
            return ""
    for line in lines[1:]:
        if not line.strip():
            continue
        row = [x.strip() for x in line.split(",")]
        sig  = col(row, "Signal")
        tick = col(row, "Ticker")
        price= safe_float(col(row, "Price"))
        z    = safe_float(col(row, "Z_Score"))
        tp   = safe_float(col(row, "TP_Price"))
        sl   = safe_float(col(row, "SL_Price"))
        qty  = int(safe_float(col(row, "Qty"), 0))
        action = col(row, "Action")
        tp_pct = col(row, "TP_Pct") or "8.0%"
        sl_pct = col(row, "SL_Pct") or "5.0%"
        # Risk/Reward: (TP - Price) / (Price - SL)
        rr = 0.0
        if tp > price > sl > 0:
            rr = round((tp - price) / (price - sl), 2)
        capital_deploy = int(price * qty) if qty > 0 else 0
        if   sig == "Strong Buy":  summary["strongBuy"]  += 1
        elif sig == "Buy":         summary["buy"]         += 1
        elif sig == "Strong Sell": summary["strongSell"]  += 1
        elif sig == "Sell":        summary["sell"]        += 1
        else:                      summary["hold"]        += 1
        current.append({
            "symbol":        tick,
            "price":         price,
            "zScore":        round(z, 2),
            "signal":        sig,
            "action":        action,
            "volume":        0,
            "volatility":    0,
            "tp":            tp,
            "sl":            sl,
            "qty":           qty,
            "tpPct":         tp_pct,
            "slPct":         sl_pct,
            "riskReward":    rr,
            "capitalDeploy": capital_deploy,
        })
    # Trier par Z-Score croissant (plus sous-évalué en premier)
    current.sort(key=lambda x: x["zScore"])
    return summary, current


def read_core_positions():
    """Lit core_allocation.csv si disponible."""
    if not CORE_FILE.exists():
        return []
    positions = []
    with open(CORE_FILE, encoding="utf-8") as f:
        lines = f.readlines()
    if len(lines) < 2:
        return []
    headers = [h.strip() for h in lines[0].split(",")]
    def col(row, name):
        try:
            return row[headers.index(name)].strip()
        except (ValueError, IndexError):
            return ""
    for line in lines[1:]:
        if not line.strip():
            continue
        row = [x.strip() for x in line.split(",")]
        total_val_pos = safe_float(col(row, "Current_Value") or col(row, "Value"))
        pnl_val       = safe_float(col(row, "P&L"))
        pnl_pct       = safe_float(col(row, "P&L_%") or col(row, "Return_%"))
        qty            = safe_float(col(row, "Qty") or col(row, "Quantity"))
        entry_price    = safe_float(col(row, "Entry_Price") or col(row, "Buy_Price"))
        cur_price      = safe_float(col(row, "Current_Price") or col(row, "Last_Price"))
        weight         = safe_float(col(row, "Allocation_%"))
        # Recalculer le poids réel en % du portfolio si non dispo
        positions.append({
            "symbol":       col(row, "Ticker"),
            "sector":       col(row, "Sector") or "-",
            "shares":       qty,
            "avgPrice":     entry_price,
            "currentPrice": cur_price,
            "value":        total_val_pos,
            "pnl":          pnl_val,
            "pnlPct":       pnl_pct,
            "weight":       weight,
            "entryPrice":   entry_price,   # alias pour le graphique weights
        })
    return positions


def read_bonds():
    """Lit le dernier bond_opportunities_*.csv et retourne la liste pour bonds.opportunities."""
    files = sorted(glob.glob(BOND_GLOB))
    if not files:
        return None
    latest = files[-1]
    opportunities = []
    with open(latest, encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            def g(key):
                return row.get(key, "").strip()
            name      = g("Libelle") or g("Ticker")
            coupon    = safe_float(g("Coupon_Rate_%"))
            yield_eff = safe_float(g("Effective_Yield_%"))
            price     = safe_float(g("Current_Price"))
            maturity  = g("Maturity_Year") or "-"
            discount  = safe_float(g("Discount_%"))
            rating    = g("Rating") or "-"
            if name:
                opportunities.append({
                    "name":     name,
                    "coupon":   round(coupon, 2),
                    "maturity": maturity,
                    "price":    round(price, 2),
                    "yieldEff": round(yield_eff, 2),
                    "discount": round(discount, 2),
                    "rating":   rating,
                })
    return opportunities


def check_pending_pdfs() -> list:
    """
    Détecte les PDFs déposés dans rapports_annuels/ non encore traités.
    Retourne une liste d'alertes.
    """
    if not PDF_DIR.exists():
        return []
    # Charger les noms déjà traités
    processed_names = set()
    if PDF_LOG.exists():
        try:
            with open(PDF_LOG, encoding="utf-8") as f:
                log = json.load(f)
            for e in log:
                if e.get("statut") not in ("ECHEC",):
                    processed_names.add(e.get("fichier", ""))
        except Exception:
            pass

    pending = []
    TICKERS = ["SNTS", "ORGT", "ONTBF", "SAFC", "ABJC"]
    for ticker in TICKERS:
        folder = PDF_DIR / ticker
        if not folder.exists():
            continue
        pdfs = list(folder.glob("*.pdf")) + list(folder.glob("*.PDF"))
        for pdf in pdfs:
            if pdf.name not in processed_names:
                pending.append({
                    "ticker":  ticker,
                    "fichier": pdf.name,
                    "message": f"📄 {ticker} — {pdf.name} en attente de traitement",
                })
    return pending


def read_dividends():
    """Lit dividends_status.json généré par dividend_tracker.py."""
    if not DIVIDENDS_STATUS.exists():
        return None
    try:
        with open(DIVIDENDS_STATUS, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"  [WARN] lecture dividends_status.json: {e}")
        return None


def read_fundamentals_alerts():
    """Lit fundamentals_alerts.json généré par fundamentals_core_alert.py."""
    if not FUND_ALERTS.exists():
        return None
    try:
        with open(FUND_ALERTS, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def main():
    print(f"\n[PATCH] Mise à jour dashboard.json — {datetime.now().strftime('%H:%M:%S')}")

    # 1. Charger le JSON existant (ou créer un squelette minimal)
    if JSON_FILE.exists():
        with open(JSON_FILE, encoding="utf-8") as f:
            data = json.load(f)
        print(f"  Chargé: {JSON_FILE}")
    else:
        print(f"  [WARN] {JSON_FILE} absent — création d'un fichier minimal")
        data = {}

    # 2. Lire les données fraîches
    ytd  = read_ytd()
    sig_summary, sig_current = read_signals()
    core_pos     = read_core_positions()
    bonds_opps   = read_bonds()
    fund_data    = read_fundamentals_alerts()
    div_data     = read_dividends()
    pending_pdfs = check_pending_pdfs()

    now = datetime.now()

    # 3. Patcher meta
    data.setdefault("meta", {})
    data["meta"]["lastUpdate"]  = now.isoformat()
    data["meta"]["dataDate"]    = now.strftime("%Y-%m-%d")
    data["meta"]["currency"]    = "FCFA"
    data["meta"]["marketStatus"]= "Données mises à jour"
    data["meta"]["generatedBy"] = "patch_dashboard_json.py"

    # 4. Patcher overview
    data.setdefault("overview", {})
    if ytd:
        total_val = ytd["total"]
        core_val  = ytd["core"]
        sat_val   = int(INITIAL_CAPITAL * SATELLITE_PCT)   # 20% fixe de config, pas du CSV
        cash_val  = int(INITIAL_CAPITAL * CASH_PCT)        # 10% fixe de config
        ytd_ret   = ytd["ytd_pct"]

        # Gain journalier : différence avec l'avant-dernière ligne
        daily_pnl = 0
        daily_pct = 0.0
        rows_all = []
        with open(YTD_FILE, encoding="utf-8") as f:
            lines_all = f.readlines()
        for ln in lines_all[1:]:
            p = ln.strip().split(",")
            if len(p) >= 5 and "2026" in p[0]:
                rows_all.append(p)
        if len(rows_all) >= 2:
            prev_total = safe_float(rows_all[-2][3])
            if prev_total:
                daily_pnl = total_val - prev_total
                daily_pct = round(daily_pnl / prev_total * 100, 2)

        # Ajouter dividendes reçus au CASH
        div_recu = int(div_data["totalRecuFcfa"]) if div_data else 0
        cash_val_with_div = cash_val + div_recu
        data["overview"].update({
            "totalValue":        int(total_val),
            "initialCapital":    INITIAL_CAPITAL,
            "ytdReturn":         round(ytd_ret, 2),
            "dailyPnl":          int(daily_pnl),
            "dailyPnlPct":       daily_pct,
            "coreValue":         int(core_val),
            "satelliteValue":    sat_val,
            "cashAvailable":     cash_val_with_div,
            "cashBase":          cash_val,
            "dividendesRecus":   div_recu,
            "openPositions":     len(core_pos) if core_pos else data["overview"].get("openPositions", 5),
            "corePositions":     len(core_pos) if core_pos else data["overview"].get("corePositions", 5),
            "satellitePositions":0,
        })
        print(f"  ✓ Overview: {int(total_val):,} FCFA | YTD {ytd_ret:+.2f}% | Jour {daily_pct:+.2f}%")
    else:
        print("  [SKIP] Pas de données YTD disponibles")

    # 5. Patcher signaux
    if sig_summary is not None:
        data.setdefault("signals", {})
        data["signals"]["summary"] = sig_summary
        # Sentiment global
        buys  = sig_summary.get("strongBuy", 0) + sig_summary.get("buy", 0)
        sells = sig_summary.get("strongSell", 0) + sig_summary.get("sell", 0)
        total = buys + sells + sig_summary.get("hold", 0)
        if total > 0:
            if buys > sells * 1.5:
                sentiment = "HAUSSIER"
            elif sells > buys * 1.5:
                sentiment = "BAISSIER"
            else:
                sentiment = "NEUTRE"
        else:
            sentiment = "NEUTRE"
        data["signals"]["marketSentiment"] = sentiment
        data["signals"]["buysCount"]  = buys
        data["signals"]["sellsCount"] = sells
        if sig_current:
            data["signals"]["current"] = sig_current
            # Top 3 opportunités d'achat (Strong Buy puis Buy, par Z-Score croissant)
            buy_ops = [s for s in sig_current if s.get("action") == "BUY"]
            buy_ops.sort(key=lambda x: x.get("zScore", 0))
            data["signals"]["topOpportunities"] = buy_ops[:3]
        print(f"  ✓ Signaux: {sig_summary.get('strongBuy',0)} StrongBuy | "
              f"{sig_summary.get('buy',0)} Buy | {sig_summary.get('sell',0)+sig_summary.get('strongSell',0)} Sell | Sentiment: {sentiment}")

    # 6. Patcher positions CORE
    if core_pos:
        data["core"] = core_pos
        print(f"  ✓ Core positions: {len(core_pos)} titres")

    # 7. Patcher obligations
    if bonds_opps is not None:
        data.setdefault("bonds", {})
        data["bonds"]["opportunities"] = bonds_opps
        print(f"  ✓ Obligations: {len(bonds_opps)} opportunités")

    # 8b. Patcher dividendes
    if div_data:
        data["dividends"] = div_data
        div_alerts = div_data.get("alerts", [])
        div_recu_v = div_data.get("totalRecuFcfa", 0)
        div_att_v  = div_data.get("totalAttenduFcfa", 0)
        print(f"  ✓ Dividendes: {int(div_recu_v):,} FCFA reçus | "
              f"{int(div_att_v):,} FCFA attendus | "
              f"{len(div_alerts)} alerte(s)")
    else:
        print("  [SKIP] dividends_status.json absent — run dividend_tracker.py")

    # 8. Patcher fondamentaux CORE
    if fund_data:
        data["fundamentals"] = fund_data
        summary_f = fund_data.get("summary", {})
        alerts_f  = fund_data.get("alerts", [])
        critical   = [a for a in alerts_f if a.get("niveau") == "LIQUIDER"]
        watchlist  = [a for a in alerts_f if a.get("niveau") == "SURVEILLER"]
        print(f"  ✓ Fondamentaux: {len(alerts_f)} tickers | "
              f"{summary_f.get('conserver',0)} ✅ CONSERVER | "
              f"{len(watchlist)} 🟡 SURVEILLER | "
              f"{len(critical)} 🔴 LIQUIDER")
    else:
        data.setdefault("fundamentals", {})

    # 8c. PDFs en attente de traitement
    data["fundamentals"]["pendingPdfs"] = pending_pdfs
    if pending_pdfs:
        print(f"  📄 {len(pending_pdfs)} PDF(s) non traité(s) détecté(s) → lancer pdf_parser.py")
        for p in pending_pdfs:
            print(f"     {p['message']}")

    # 9. Ajouter un point à portfolioHistory (si pas déjà là)
    if ytd and "portfolioHistory" in data:
        today_str = now.strftime("%Y-%m-%d")
        already   = any(pt.get("date","").startswith(today_str) for pt in data["portfolioHistory"])
        if not already:
            data["portfolioHistory"].append({
                "date":     today_str,
                "strategy": int(ytd["total"]),
                "buyHold":  data["portfolioHistory"][-1].get("buyHold", INITIAL_CAPITAL)
            })
            print(f"  ✓ portfolioHistory: point {today_str} ajouté")

    # 10. Sauvegarder
    os.makedirs(JSON_FILE.parent, exist_ok=True)
    with open(JSON_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"), default=str)
    print(f"  ✓ Sauvegardé → {JSON_FILE}")
    print(f"[PATCH] Terminé.\n")


if __name__ == "__main__":
    main()

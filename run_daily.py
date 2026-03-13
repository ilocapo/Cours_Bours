"""
run_daily.py — Lanceur quotidien Altos Trading System
======================================================

Usage:
    python run_daily.py                  # Exécute l'automation maintenant
    python run_daily.py --schedule       # Lance le scheduler 16h30 Lun-Ven (bloquant)
    python run_daily.py --time 17:00     # Schedule à une heure custom
    python run_daily.py --setup-task     # Crée une tâche Windows Task Scheduler
    python run_daily.py --status         # Affiche le statut du dernier run
"""

import sys
import os
import argparse
import subprocess
from datetime import datetime
from pathlib import Path

# Répertoire du script (Cours_Bours/)
BASE_DIR         = Path(__file__).parent
AUTOMATION_SCRIPT = BASE_DIR / "run_daily_automation.py"
SETUP_SCHEDULER   = BASE_DIR / "setup_scheduler.py"
FULL_DASHBOARD_SCRIPT = BASE_DIR / "generate_dashboard_data.py"
LOG_DIR           = BASE_DIR / "logs"


def run_now() -> int:
    """Exécute l'automation immédiatement."""
    print(f"\n{'='*70}")
    print(f"  ALTOS DAILY AUTOMATION — {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print(f"{'='*70}\n")

    if not AUTOMATION_SCRIPT.exists():
        print(f"ERREUR: Script introuvable: {AUTOMATION_SCRIPT}")
        return 1

    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    env["PYTHONUNBUFFERED"] = "1"

    result = subprocess.run(
        [sys.executable, str(AUTOMATION_SCRIPT)],
        cwd=str(BASE_DIR),
        env=env,
    )
    return result.returncode


def run_full_now() -> int:
    """Exécute automation quotidienne puis génération complète dashboard/backtests."""
    rc = run_now()
    if rc != 0:
        print("\nAutomation échouée, génération complète du dashboard annulée.")
        return rc

    if not FULL_DASHBOARD_SCRIPT.exists():
        print(f"\nERREUR: Script introuvable: {FULL_DASHBOARD_SCRIPT}")
        return 1

    print("\nRelance complète dashboard (backtests + logs historiques)...\n")
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    env["PYTHONUNBUFFERED"] = "1"

    result = subprocess.run(
        [sys.executable, str(FULL_DASHBOARD_SCRIPT)],
        cwd=str(BASE_DIR),
        env=env,
    )
    return result.returncode


def start_schedule(run_time: str = "16:30") -> int:
    """Démarre le scheduler APScheduler (process bloquant)."""
    if not SETUP_SCHEDULER.exists():
        print(f"ERREUR: Scheduler introuvable: {SETUP_SCHEDULER}")
        return 1

    print(f"Démarrage scheduler — exécution quotidienne à {run_time} (Africa/Abidjan)")
    print("Appuyez sur Ctrl+C pour arrêter.\n")

    result = subprocess.run(
        [sys.executable, str(SETUP_SCHEDULER), "--time", run_time],
        cwd=str(BASE_DIR),
    )
    return result.returncode


def create_windows_task(run_time: str = "16:30") -> int:
    """Crée une tâche dans Windows Task Scheduler via schtasks."""
    try:
        hour, minute = run_time.split(":")
    except ValueError:
        print(f"Format invalide: {run_time}. Utilisez HH:MM (ex: 16:30)")
        return 1

    task_name = "AltosDailyAutomation"
    python_exe = sys.executable
    script     = str(AUTOMATION_SCRIPT)

    # Supprimer ancienne tâche si elle existe
    subprocess.run(["schtasks", "/Delete", "/TN", task_name, "/F"], capture_output=True)

    cmd = [
        "schtasks", "/Create",
        "/TN", task_name,
        "/TR", f'"{python_exe}" "{script}"',
        "/SC", "WEEKLY",
        "/D",  "MON,TUE,WED,THU,FRI",
        "/ST", f"{hour}:{minute}",
        "/RL", "HIGHEST",
        "/F",
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode == 0:
        print(f"\nTâche Windows créée: '{task_name}'")
        print(f"  Heure : {run_time} (UTC+0 = Africa/Abidjan, alignez l'horloge Windows)")
        print(f"  Jours : Lun-Ven")
        print(f"  Script: {script}")
        print(f"\nVérifiez avec: schtasks /Query /TN {task_name}")
        return 0
    else:
        print(f"Erreur schtasks:\n{result.stderr}")
        print(f"\nAlternative: python setup_scheduler.py --windows-task")
        return 1


def show_status() -> int:
    """Affiche les 40 dernières lignes du dernier log."""
    if not LOG_DIR.exists() or not any(LOG_DIR.glob("automation_*.log")):
        print("Aucun log trouvé. L'automation n'a pas encore tourné.")
        return 0

    latest_log = max(LOG_DIR.glob("automation_*.log"), key=lambda p: p.stat().st_mtime)
    size_kb    = latest_log.stat().st_size / 1024
    mtime      = datetime.fromtimestamp(latest_log.stat().st_mtime).strftime("%d/%m/%Y %H:%M:%S")

    print(f"\nDernier log : {latest_log.name}")
    print(f"Exécuté le  : {mtime}  ({size_kb:.1f} KB)")
    print(f"{'─'*70}")

    lines = latest_log.read_text(encoding="utf-8", errors="ignore").splitlines()
    for line in lines[-40:]:
        print(line)

    return 0


def main():
    parser = argparse.ArgumentParser(
        description="Lanceur automation quotidienne Altos Trading (BRVM)",
        formatter_class=argparse.RawTextHelpFormatter,
    )
    parser.add_argument("--schedule",   action="store_true",
                        help="Lance scheduler APScheduler (bloquant, Ctrl+C pour arrêter)")
    parser.add_argument("--full",       action="store_true",
                        help="Exécute automation + génération complète dashboard/backtests")
    parser.add_argument("--time",       default="16:30", metavar="HH:MM",
                        help="Heure de déclenchement (défaut: 16:30 = fermeture BRVM)")
    parser.add_argument("--setup-task", action="store_true",
                        help="Crée une tâche Windows Task Scheduler")
    parser.add_argument("--status",     action="store_true",
                        help="Affiche le statut du dernier run")

    args = parser.parse_args()

    if args.status:
        return show_status()
    if args.setup_task:
        return create_windows_task(args.time)
    if args.schedule:
        return start_schedule(args.time)
    if args.full:
        return run_full_now()

    return run_now()


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\nArrêté.")
        sys.exit(0)

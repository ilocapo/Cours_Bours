"""
Scheduler pour l'automatisation du trading

Configure l'exécution automatique après fermeture du marché BRVM (16h30)
Utilise APScheduler pour la planification

Usage:
    python setup_scheduler.py        # Lance le scheduler immédiatement
    python setup_scheduler.py --once # Test une seule exécution
"""

import sys
import os

# Forcer UTF-8 pour Windows
if sys.platform == 'win32':
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

import argparse
from datetime import datetime, time
from pathlib import Path

try:
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger
except ImportError:
    print("❌ APScheduler non installé. Installation en cours...")
    os.system(f"{sys.executable} -m pip install apscheduler")
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger

# Répertoire du script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def run_automation():
    """Exécute le script d'automatisation"""
    import subprocess
    
    automation_script = os.path.join(SCRIPT_DIR, 'run_daily_automation.py')
    
    print(f"\n{'='*80}")
    print(f"⏰ Exécution automatique: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print(f"{'='*80}\n")
    
    try:
        result = subprocess.run(
            [sys.executable, automation_script],
            cwd=SCRIPT_DIR,
            capture_output=False
        )
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Erreur lors de l'exécution: {e}")
        return False


def setup_daily_scheduler(run_time: str = "16:30"):
    """
    Configure le scheduler pour une exécution quotidienne
    
    Args:
        run_time: Heure d'exécution au format HH:MM (défaut: 16:30 = 4:30 PM)
    """
    
    # Parser l'heure
    try:
        hour, minute = map(int, run_time.split(':'))
    except ValueError:
        print(f"❌ Format invalide: {run_time}. Utilisez HH:MM (ex: 16:30)")
        return False
    
    # Créer le scheduler
    scheduler = BackgroundScheduler()
    
    # Ajouter job quotidien
    # Lundi à vendredi (0-4), à l'heure spécifiée
    trigger = CronTrigger(
        day_of_week='mon-fri',  # Lun-Ven
        hour=hour,
        minute=minute,
        timezone='Africa/Abidjan'  # Fuseau horaire BRVM
    )
    
    job = scheduler.add_job(
        run_automation,
        trigger=trigger,
        id='altos_daily_trading',
        name='Altos Daily Trading Automation',
        replace_existing=True
    )
    
    # Démarrer le scheduler
    scheduler.start()
    
    print(f"\n{'='*80}")
    print(f"✅ SCHEDULER CONFIGURÉ")
    print(f"{'='*80}")
    print(f"📅 Exécution quotidienne à: {run_time} (Lun-Ven)")
    print(f"📍 Fuseau horaire: Africa/Abidjan (BRVM)")
    print(f"🔄 Prochain démarrage: {job.next_run_time}")
    print(f"\n💬 Le script continuera de tourner...\n")
    
    # Garder le scheduler en vie
    try:
        while True:
            import time
            time.sleep(60)
    except KeyboardInterrupt:
        print("\n⏹️  Scheduler arrêté par l'utilisateur")
        scheduler.shutdown()
        return True


def setup_windows_task_scheduler():
    """
    Alternative: Configurer Windows Task Scheduler
    Donne les instructions pour configurer manuellement
    """
    
    script_path = os.path.join(SCRIPT_DIR, 'run_daily_automation.py')
    python_path = sys.executable
    
    print(f"\n{'='*80}")
    print(f"Windows Task Scheduler - Configuration manuelle")
    print(f"{'='*80}\n")
    
    print("Voici comment configurer l'exécution automatique dans Windows Task Scheduler:\n")
    
    print("1. Ouvrez 'Task Scheduler' (Planificateur de tâches)")
    print("2. Cliquez sur 'Create Basic Task' (Créer une tâche de base)")
    print("3. Donnez un nom: 'Altos Trading Daily'")
    print("4. Confgurez le déclencheur:")
    print("   - Récurrence: Quotidienne")
    print("   - Heure: 16:30 (après fermeture BRVM)")
    print("   - Jours: Du lundi au vendredi")
    print("5. Configurez l'action:")
    print(f"   - Programme: {python_path}")
    print(f"   - Arguments: {script_path}")
    print(f"   - Répertoire de travail: {SCRIPT_DIR}")
    print("\n6. Terminé! La tâche s'exécutera automatiquement tous les jours à 16:30")
    
    return True


def main():
    parser = argparse.ArgumentParser(
        description='Scheduler pour l\'automatisation du trading Altos'
    )
    parser.add_argument(
        '--once',
        action='store_true',
        help='Exécute une seule fois et quitte'
    )
    parser.add_argument(
        '--time',
        default='16:30',
        help='Heure d\'exécution quotidienne (défaut: 16:30)'
    )
    parser.add_argument(
        '--windows-task',
        action='store_true',
        help='Affiche instructions pour Windows Task Scheduler'
    )
    
    args = parser.parse_args()
    
    # Mode test (une seule exécution)
    if args.once:
        print("🧪 Mode TEST - Une seule exécution")
        success = run_automation()
        return 0 if success else 1
    
    # Instructions Windows Task Scheduler
    if args.windows_task:
        setup_windows_task_scheduler()
        return 0
    
    # Mode scheduler continu
    setup_daily_scheduler(args.time)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n⏹️  Arrêt du scheduler")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        sys.exit(1)

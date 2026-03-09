"""
Daily Automation Script - Altos Trading System

Exécute automatiquement tous les modules de trading:
1. daily_signals.py - Génère signaux Z-Score
2. daily_market_update.py - Met à jour valeurs portfolio
3. portfolio_manager.py - Gère positions ouvertes
4. core_rebalancing.py - Monitor santé CORE
5. bond_scanner.py - Scan obligations

À exécuter après fermeture marché (16h30 BRVM) ou via scheduler
"""

import sys
import os

# Forcer UTF-8 pour Windows
if sys.platform == 'win32':
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

import subprocess
from datetime import datetime
from pathlib import Path

# Répertoire du script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Modules à exécuter dans l'ordre
MODULES = [
    ('daily_signals.py',         'Génération des signaux Z-Score'),
    ('daily_market_update.py',   'Mise à jour du portefeuille'),
    ('portfolio_manager.py',     'Gestion des positions'),
    ('core_rebalancing.py',      'Monitor CORE stocks'),
    ('bond_scanner.py',          'Scan des obligations'),
    ('patch_dashboard_json.py',  'Mise à jour dashboard web (GitHub Pages)'),
]

# Fichier de log
LOG_DIR = os.path.join(SCRIPT_DIR, 'logs')
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, f"automation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")


def log(message: str, level: str = "INFO"):
    """Écrit dans le log et affiche à l'écran"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # Encoder les caractères spéciaux pour la console Windows
    try:
        log_line = f"[{timestamp}] {level}: {message}"
        
        print(log_line)
        
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(log_line + '\n')
    except UnicodeEncodeError:
        # Fallback: remplacer les caractères problématiques
        safe_message = message.encode('ascii', errors='ignore').decode('ascii')
        log_line = f"[{timestamp}] {level}: {safe_message}"
        
        print(log_line)
        
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(log_line + '\n')


def run_module(module_name: str, description: str) -> bool:
    """
    Exécute un module Python
    Retourne True si succès, False si erreur
    """
    module_path = os.path.join(SCRIPT_DIR, module_name)
    
    if not Path(module_path).exists():
        log(f"Module non trouve: {module_path}", "ERROR")
        return False
    
    log(f"\n{'='*80}")
    log(f"Demarrage: {description} ({module_name})")
    log(f"{'='*80}")
    
    try:
        # Préparer environment avec UTF-8
        env = os.environ.copy()
        env['PYTHONIOENCODING'] = 'utf-8'
        env['PYTHONUNBUFFERED'] = '1'
        
        # Exécuter le module
        result = subprocess.run(
            [sys.executable, module_path],
            cwd=SCRIPT_DIR,
            capture_output=True,
            text=False,  # Lire en bytes d'abord
            timeout=300,  # Timeout 5 minutes (bond_scanner peut être lent)
            env=env
        )
        
        # Décoder avec UTF-8 (ignorer erreurs)
        stdout_text = result.stdout.decode('utf-8', errors='ignore')
        stderr_text = result.stderr.decode('utf-8', errors='ignore')
        
        # Capturer output
        if stdout_text:
            print(stdout_text)
            with open(LOG_FILE, 'a', encoding='utf-8') as f:
                f.write(stdout_text + '\n')
        
        if stderr_text:
            print(stderr_text)
            with open(LOG_FILE, 'a', encoding='utf-8') as f:
                f.write(stderr_text + '\n')
        
        # Vérifier exit code
        if result.returncode == 0:
            log(f"OK: {description}", "SUCCESS")
            return True
        else:
            log(f"ERREUR: {description} (exit code: {result.returncode})", "ERROR")
            return False
            
    except subprocess.TimeoutExpired:
        log(f"TIMEOUT: {description} (>120s)", "ERROR")
        return False
    except Exception as e:
        log(f"EXCEPTION: {description} - {str(e)}", "ERROR")
        return False


def generate_summary():
    """Génère un résumé final"""
    log(f"\n{'='*80}")
    log("RESUME DE L'EXECUTION AUTOMATIQUE")
    log(f"{'='*80}")
    
    # Vérifier les fichiers générés
    outputs = {
        'Signaux': 'output/signals/signals_*.csv',
        'YTD Tracking': 'YTD_2026.csv',
        'Positions ouvertes': 'open_positions.csv',
        'Obligations': 'output/*bond*.csv'
    }
    
    for name, pattern in outputs.items():
        # Vérifier existance simple (approximation)
        log(f"  {name}: Verification...")
    
    log(f"\nLogs sauvegardes: {LOG_FILE}")
    log("AUTOMATISATION TERMINEE!")


def main():
    """Fonction principale"""
    log(f"\n{'='*80}")
    log("DEMARRAGE AUTOMATION ALTOS - " + datetime.now().strftime('%d/%m/%Y %H:%M:%S'))
    log(f"{'='*80}\n")
    
    results = {}
    success_count = 0
    
    # Exécuter chaque module
    for module_name, description in MODULES:
        success = run_module(module_name, description)
        results[description] = success
        if success:
            success_count += 1
    
    # Résumé final
    log(f"\n{'='*80}")
    log("RESUME DES EXECUTIONS")
    log(f"{'='*80}")
    
    for description, success in results.items():
        status = "OK" if success else "ERREUR"
        log(f"  {status}: {description}")
    
    log(f"\nTotal: {success_count}/{len(MODULES)} modules executes avec succes")
    
    # Message final
    if success_count == len(MODULES):
        log("\nSUCCES COMPLET! Tous les modules ont tournes.", "SUCCESS")
        return 0
    else:
        log(f"\nATTENTION: {len(MODULES) - success_count} module(s) ont echoue.", "WARNING")
        return 1


if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except Exception as e:
        log(f"ERREUR FATALE: {str(e)}", "CRITICAL")
        sys.exit(1)

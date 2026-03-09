# ============================================
# BRVM Portfolio — Configuration du Planificateur de tâches Windows
# Exécuter ce script en tant qu'Administrateur dans PowerShell :
#   Right-click PowerShell > "Exécuter en tant qu'administrateur"
#   cd "C:\chemin\vers\Cours Boursier"
#   .\setup_windows_task.ps1
# ============================================

param(
    [string]$TaskName = "BRVM_Daily_Automation",
    [string]$Hour = "18",
    [string]$Minute = "30"
)

Write-Host ""
Write-Host "========================================" -ForegroundColor DarkYellow
Write-Host "  BRVM Portfolio - Setup Tache Planifiee" -ForegroundColor DarkYellow
Write-Host "========================================" -ForegroundColor DarkYellow
Write-Host ""

# Chemin du projet (dossier du script)
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BatFile = Join-Path $ProjectDir "run_daily_backtest.bat"

# Vérifier que le .bat existe
if (-Not (Test-Path $BatFile)) {
    Write-Host "[ERREUR] Fichier introuvable : $BatFile" -ForegroundColor Red
    Write-Host "         Assurez-vous que run_daily_backtest.bat est a la racine du projet." -ForegroundColor Red
    exit 1
}

Write-Host "[INFO] Projet    : $ProjectDir"
Write-Host "[INFO] Script    : $BatFile"
Write-Host "[INFO] Heure     : ${Hour}h${Minute}"
Write-Host "[INFO] Nom tache : $TaskName"
Write-Host ""

# Supprimer l'ancienne tâche si elle existe
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "[INFO] Suppression de l'ancienne tache '$TaskName'..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Créer l'action
$Action = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/c `"$BatFile`"" `
    -WorkingDirectory $ProjectDir

# Créer le déclencheur (tous les jours à l'heure spécifiée)
$Trigger = New-ScheduledTaskTrigger `
    -Daily `
    -At "${Hour}:${Minute}"

# Paramètres de la tâche
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
    -RestartCount 2 `
    -RestartInterval (New-TimeSpan -Minutes 5)

# Créer la tâche (s'exécute avec l'utilisateur actuel)
try {
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $Action `
        -Trigger $Trigger `
        -Settings $Settings `
        -Description "BRVM Portfolio - Automatisation quotidienne (backtests, signaux, dashboard, git push)" `
        -RunLevel Limited

    Write-Host ""
    Write-Host "[OK] Tache '$TaskName' creee avec succes !" -ForegroundColor Green
    Write-Host ""
    Write-Host "  La tache s'executera tous les jours a ${Hour}h${Minute}." -ForegroundColor Cyan
    Write-Host "  Elle va :" -ForegroundColor Cyan
    Write-Host "    1. Lancer l'automatisation quotidienne (signaux, marche, portfolio)" -ForegroundColor Cyan
    Write-Host "    2. Generer les donnees du dashboard" -ForegroundColor Cyan
    Write-Host "    3. Pousser les mises a jour sur GitHub" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Pour modifier l'heure :" -ForegroundColor Gray
    Write-Host "    .\setup_windows_task.ps1 -Hour 20 -Minute 00" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Pour supprimer la tache :" -ForegroundColor Gray
    Write-Host "    Unregister-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Vous pouvez aussi la gerer depuis :" -ForegroundColor Gray
    Write-Host "    Panneau de configuration > Outils d'administration > Planificateur de taches" -ForegroundColor Gray
}
catch {
    Write-Host ""
    Write-Host "[ERREUR] Impossible de creer la tache." -ForegroundColor Red
    Write-Host "         Essayez d'executer PowerShell en tant qu'Administrateur." -ForegroundColor Red
    Write-Host "         Erreur : $_" -ForegroundColor Red
}

Write-Host ""

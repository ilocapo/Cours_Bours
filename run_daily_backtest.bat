@echo off
:: ============================================
:: BRVM Portfolio - Tâche quotidienne automatisée
:: Lance les backtests, génère les données du dashboard,
:: et pousse sur GitHub.
:: Exécuter via le Planificateur de tâches Windows.
:: ============================================

title BRVM Daily Automation
echo.
echo ========================================
echo   BRVM Portfolio - Execution quotidienne
echo   %date% %time%
echo ========================================
echo.

:: ── Configuration ──────────────────────────
:: Modifier ces chemins selon votre installation
set "PROJECT_DIR=%~dp0"
set "PYTHON_VENV=%PROJECT_DIR%.venv\Scripts\python.exe"
set "LOG_DIR=%PROJECT_DIR%logs"

:: Créer le dossier logs s'il n'existe pas
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

:: Nom du fichier log du jour
for /f "tokens=1-3 delims=/" %%a in ("%date%") do set "TODAY=%%c-%%b-%%a"
for /f "tokens=1-3 delims=/- " %%a in ('echo %date%') do set "TODAY=%%a%%b%%c"
set "LOGFILE=%LOG_DIR%\daily_%date:~6,4%%date:~3,2%%date:~0,2%.log"

echo [%time%] Demarrage de l'automatisation... >> "%LOGFILE%"
echo [INFO] Repertoire projet : %PROJECT_DIR%
echo [INFO] Python : %PYTHON_VENV%
echo [INFO] Log : %LOGFILE%
echo.

:: ── Étape 1 : Exécution quotidienne ───────
echo [1/3] Execution de l'automatisation quotidienne...
echo [%time%] === Etape 1: Automatisation quotidienne === >> "%LOGFILE%"

if exist "%PYTHON_VENV%" (
    "%PYTHON_VENV%" "%PROJECT_DIR%run_daily_automation.py" >> "%LOGFILE%" 2>&1
) else (
    echo [ERREUR] Python venv non trouve a %PYTHON_VENV% >> "%LOGFILE%"
    echo [ERREUR] Python venv non trouve. Verifiez le chemin.
    echo          Attendu : %PYTHON_VENV%
)

if %ERRORLEVEL% NEQ 0 (
    echo [ATTENTION] L'automatisation a retourne une erreur (code %ERRORLEVEL%) >> "%LOGFILE%"
    echo [ATTENTION] Erreur detectee, voir le log pour details.
) else (
    echo [OK] Automatisation terminee avec succes. >> "%LOGFILE%"
    echo [OK] Automatisation terminee.
)
echo.

:: ── Étape 2 : Génération données dashboard ─
echo [2/3] Generation des donnees du dashboard...
echo [%time%] === Etape 2: Generation dashboard === >> "%LOGFILE%"

if exist "%PYTHON_VENV%" (
    "%PYTHON_VENV%" "%PROJECT_DIR%generate_dashboard_data.py" >> "%LOGFILE%" 2>&1
)

if %ERRORLEVEL% NEQ 0 (
    echo [ATTENTION] Generation dashboard echouee. >> "%LOGFILE%"
) else (
    echo [OK] Donnees dashboard generees. >> "%LOGFILE%"
    echo [OK] Dashboard mis a jour.
)
echo.

:: ── Étape 3 : Push Git ────────────────────
echo [3/3] Push vers GitHub...
echo [%time%] === Etape 3: Git push === >> "%LOGFILE%"

cd /d "%PROJECT_DIR%"
git add . >> "%LOGFILE%" 2>&1
git commit -m "auto: daily update %date% %time%" >> "%LOGFILE%" 2>&1
git push origin main >> "%LOGFILE%" 2>&1

if %ERRORLEVEL% NEQ 0 (
    echo [ATTENTION] Git push echoue (verifiez vos credentials). >> "%LOGFILE%"
    echo [ATTENTION] Git push echoue.
) else (
    echo [OK] Pousse sur GitHub. >> "%LOGFILE%"
    echo [OK] Pousse sur main.
)

echo.
echo [%time%] === Execution terminee === >> "%LOGFILE%"
echo ========================================
echo   Execution terminee !
echo   Consultez le log : %LOGFILE%
echo ========================================
echo.

:: Attendre 10 secondes avant de fermer (pour lecture en mode interactif)
timeout /t 10 /nobreak > nul
exit /b 0

@echo off
:: ============================================
:: BRVM Portfolio - Automation + Git Push
:: Equivalent du cronjob Linux pour Windows
:: Tourne chaque jour après clôture BRVM
:: ============================================

cd /d "c:\Users\bagno\Downloads\Altos\Cours_Bours"

echo.
echo ============================================
echo   BRVM - Automation quotidienne
echo   %DATE% %TIME%
echo ============================================
echo.

:: 1. Lancer l'automation complète (signaux, portfolio, obligations)
echo [1/3] Lancement de l'automation...
"C:\Users\bagno\AppData\Local\Programs\Python\Python313\python.exe" run_daily_automation.py

if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] Automation echouee - abandon du push
    exit /b 1
)

echo [OK] Automation terminee
echo.

:: 2. Git add + commit avec date automatique
echo [2/3] Commit des nouvelles donnees...
git add *.csv output\signals\*.csv logs\*.log 2>nul

git diff --cached --quiet
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Aucun changement de donnees - pas de commit
    goto :dashboard_refresh
)

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set dt=%%I
set TIMESTAMP=%dt:~0,4%-%dt:~4,2%-%dt:~6,2% %dt:~8,2%:%dt:~10,2%
git commit -m "auto: donnees du %TIMESTAMP%"

:: 3. Push vers main
echo [3/3] Push vers GitHub...
git push origin main

if %ERRORLEVEL% EQU 0 (
    echo [OK] Push reussi sur main
) else (
    echo [WARN] Push echoue - donnees sauvegardees localement
)

:dashboard_refresh
echo.
echo ============================================
echo   Termine : %DATE% %TIME%
echo ============================================

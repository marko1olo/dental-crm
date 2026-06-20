@echo off
echo ====================================================
echo   DENTE CRM + Clinic_MVP Marketing Local Launcher
echo ====================================================
echo.

echo [1/2] Starting Local Backend (API)...
start "Dente API Backend" cmd /c "cd apps\api && npm run dev"

timeout /t 5 /nobreak >nul

echo [2/2] Starting Frontend (Web UI)...
start "Dente Web UI" cmd /c "cd apps\web && npm run dev"

echo.
echo ====================================================
echo   DENTE CRM IS RUNNING!
echo   Open your browser at: http://127.0.0.1:5173
echo ====================================================
pause

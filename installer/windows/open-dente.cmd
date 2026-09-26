@echo off
:: ============================================================================
:: DENTE Dental CRM — Browser Launch Shortcut
:: ============================================================================

set "PORT=4000"
if exist "%ProgramData%\DenteCRM\dente.env" (
    for /f "tokens=1,2 delims==" %%A in ('type "%ProgramData%\DenteCRM\dente.env"') do (
        if "%%A"=="PORT" set "PORT=%%B"
    )
)

start http://localhost:%PORT%
exit /b 0

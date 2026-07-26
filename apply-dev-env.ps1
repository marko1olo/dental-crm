# ─────────────────────────────────────────────────────────────────────────────
# apply-dev-env.ps1
#
# Дописывает в локальные .env-файлы флаги, которые СОХРАНЯЮТ привычный режим
# разработки после закрытия уязвимостей.
#
# ЗАЧЕМ ЭТО НУЖНО
# В коде было несколько «удобных» лазеек, которые работали всегда — в том числе
# в production: демо-вход clinic@example.com / dente2026, определение клиники по
# заголовку x-organization-id без токена, код входа пациента «0000». Теперь всё
# это выключено по умолчанию и включается только явными флагами, и только когда
# NODE_ENV не равен production.
#
# Файлы .env нельзя записать удалённо, поэтому изменения применяются этим
# скриптом. Запуск (из папки dental-crm):
#     powershell -ExecutionPolicy Bypass -File .\apply-dev-env.ps1
#
# Скрипт идемпотентный: повторный запуск ничего не продублирует.
# ─────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

$devFlags = @'

# ── Послабления ТОЛЬКО для локальной разработки ──────────────────────────────
# При NODE_ENV=production сервер откажется стартовать с любым из этих флагов.
# Разрешает определять организацию по заголовку x-organization-id без токена.
DENTE_DEV_ALLOW_HEADER_ORG=1
# Разрешает демо-вход clinic@example.com / dente2026 и doctor@clinic.com.
DENTE_ALLOW_DEMO_LOGIN=1
# Разрешает заглушки ЕГИСЗ с вымышленными пациентами.
DENTE_ALLOW_DEMO_FIXTURES=1
# Код входа в личный кабинет пациента (раньше по умолчанию принимался "0000").
PORTAL_MVP_OTP_CODE=0000
# Секрет входящих вебхуков VK / телефонии / MAX. В production обязателен.
DENTE_WEBHOOK_SECRET=dev-local-webhook-secret-change-me
'@

$targets = @(
    (Join-Path $projectRoot '.env'),
    (Join-Path $projectRoot '.env.local'),
    (Join-Path $projectRoot 'apps\api\.env')
)

foreach ($path in $targets) {
    if (-not (Test-Path $path)) {
        Write-Host "  пропущен (нет файла): $path" -ForegroundColor DarkGray
        continue
    }

    $content = Get-Content -Path $path -Raw -Encoding UTF8
    if ($content -match 'DENTE_DEV_ALLOW_HEADER_ORG') {
        Write-Host "  уже настроен: $path" -ForegroundColor DarkGray
        continue
    }

    # Резервная копия перед изменением.
    Copy-Item -Path $path -Destination "$path.bak" -Force

    $updated = $content.TrimEnd("`r", "`n") + "`r`n" + $devFlags
    # UTF-8 без BOM: dotenv не понимает BOM в первой строке.
    [System.IO.File]::WriteAllText($path, $updated, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "  обновлён: $path (копия: $path.bak)" -ForegroundColor Green
}

# Проверка секрета подписи токенов: без него сервер в production не стартует.
$apiEnvPath = Join-Path $projectRoot 'apps\api\.env'
if (Test-Path $apiEnvPath) {
    $apiEnv = Get-Content -Path $apiEnvPath -Raw -Encoding UTF8
    if ($apiEnv -notmatch 'AUTH_TOKEN_SECRET\s*=\s*\S') {
        $generated = [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 })).TrimEnd('=')
        [System.IO.File]::AppendAllText($apiEnvPath, "`r`nAUTH_TOKEN_SECRET=$generated`r`n", (New-Object System.Text.UTF8Encoding($false)))
        Write-Host "  сгенерирован AUTH_TOKEN_SECRET в apps\api\.env" -ForegroundColor Green
    }
}

Write-Host ''
Write-Host 'Готово. Перезапустите API-сервер, чтобы флаги вступили в силу.' -ForegroundColor Cyan
Write-Host 'Для боевого развёртывания эти флаги задавать НЕ нужно — сервер их отвергнет.' -ForegroundColor Yellow

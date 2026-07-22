# Справочник Автоматизации, Скриптов и Тестов Dental CRM (`scripts/`)

## 1. Скрипты Визуального Аудита и Скриншотов
- `scripts/comprehensive-visual-audit.mjs` — Полный визуальный аудит всех экранов CRM на ошибки верстки.
- `scripts/screenshot-all-views.mjs` — Автоматический захват скриншотов всех главных вкладок (`Schedule`, `Patients`, `Visit`, `Documents`, `Communications`, `Finance`, `Settings`).
- `scripts/screenshot-docs.mjs` — Генерация визуальных доказательств для документации.
- `scripts/capture-honest-screenshot.cjs` — Захват физического состояния UI с сервера 200 OK.

## 2. Набор Smoke-тестов Проверки Качества (Quality Gates)
- `scripts/run-smoke-suite.mjs` — Главный раннер автономных smoke-тестов проекта.
- `scripts/smoke-tax-knd-xml.mjs` — Проверка корректности формирования XML справок НДФЛ по стандарту ФНС.
- `scripts/smoke-dicom-folder-workup.mjs` — Проверка парсинга и рендеринга КТ DICOM-папок.
- `scripts/smoke-speech-groq-chunk-floor.mjs` — Валидация серверного шлюза голосового ввода.
- `scripts/smoke-payment-idempotency.mjs` — Тестирование защиты от повторных списаний в кассе.
- `scripts/smoke-telegram-bot.mjs` — Проверка доставки сообщений и команд Telegram-бота.
- `scripts/smoke-clinical-mutation-guard.mjs` — Проверка гардов прав доступа при редактировании амбулаторной карты.
- `scripts/smoke-import-contracts.mjs` — Валидация контрактов импорта баз с IDENT/DentalPRO.

## 3. Вспомогательные Инструменты Разработки
- `scripts/detect-overflows.mjs` — Детектор горизонтального скролла и выпадающих элементов на мобильных экранах.
- `scripts/generate_audit_tokens.ts` — Генератор временных токенов авторизации для отладочных сессий.
- `scripts/pr_merger.ts` — Автоматический объединитель пул-реквестов.

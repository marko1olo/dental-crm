# Спецификация декомпозиции Telegram Workbench & Patient Messaging

## 1. Контекст и архитектурная цель (Why)
Монолитный файл стилей `apps/web/src/styles/modules/telegram-workbench.css` (654 строки) содержал в себе смешение каркаса сетки, карточек авторизации и привязки, очереди исходящих сообщений, тёмной темы и мобильной адаптивности, нарушая Мандат 8b (лимит микро-модулей $\le 120$ строк). Кроме того, в файле присутствовали хардкодные цвета (`#fbfefd`, `#f8fafc` и др.), а в проекте сохранялся мертвый файл `apps/web/src/components/ai/dentalAgentCockpit.css` (638 строк), оставшийся после слияния `DentalAgentCockpit` с `ChairsideCopilot` (нарушение Мандата 8s SSOT). Кнопки авторизации и отправки сообщений блокировались (`disabled`) из-за незаполненных необязательных полей, нарушая автономию врача и администратора (Мандат 8e).

## 2. Что сделано (What & Where)

### 2.1. Декомпозиция CSS-монолита Telegram на микро-модули $\le 120$ строк
Создана папка `apps/web/src/styles/telegramStyles/`:
1. `telegramLayout.css` (69 строк) — базовый каркас, сетка статусов, контейнер воркбенча, типографика заголовков и счетчиков.
2. `telegramPanels.css` (93 строки) — панель привязки бота, карточки QR-кодов, журнал привязок, настройки политик и индикаторы карточек.
3. `telegramOutbox.css` (115 строк) — очередь исходящих сообщений, статусы доставки, кнопки действий, фильтры и предупреждения.
4. `telegramDarkTheme.css` (78 строк) — глубокая контрастная тёмная тема (`[data-theme="dark"]`, `[data-theme="night"]`, `.dark`), тотальная замена хардкодных цветов на токены `var(--paper)`, `var(--paper-strong)`, `var(--line)`, `var(--teal-light)`, `var(--ink)`.
5. `telegramMobile.css` (103 строки) — Apple HIG touch-эргономика, тач-таргеты $\ge 44\times 44\text{px}$, 1-колоночная сетка на смартфонах, 0px паразитного горизонтального скролла (`overflow-x: clip; max-width: 100%`).
6. `apps/web/src/styles/modules/telegram-workbench.css` (11 строк) — компактный канонический фасад `@import`.

### 2.2. Ликвидация мертвого кода (Мандат 8s SSOT)
- Физически удален неиспользуемый файл `apps/web/src/components/ai/dentalAgentCockpit.css` (638 строк), предотвращая раздувание бандла и дублирование стилей.

### 2.3. Автономия врача и персонала (Мандат 8e)
- `apps/web/src/components/settings/telegram/telegramHub/PhoneAuthForm.tsx`: сняты блокировки `disabled` на кнопках запроса кода, подтверждения кода и 2FA из-за незаполненных полей. Кнопки остаются активными, при клике выдаются контекстные подсказки и тосты.
- `apps/web/src/components/settings/telegram/TelegramOutboxSection.tsx`: снята блокировка кнопки «Отправить готовые» и кнопки отправки задачи в очереди при отсутствии готовых элементов, обеспечена автономия оператора.
- `apps/web/src/components/settings/telegram/TelegramLinkPanelSection.tsx`: очищены `disabled` на кнопках копирования и экспорта.

### 2.4. Чистота терминологии (Мандаты 8x & 8ap)
- Живой русский клинический язык.
- 0 упоминаний номеров приказов («804н», «043/у», «54-ФЗ», «152-ФЗ») в пользовательском интерфейсе.
- 0 названий сторонних CRM (StomX, DentalPRO, IDENT, iStom).

## 3. Визуальный Red Team пруф (Proof & Verification)
Проверено оркестратором L1 по 4-State Visual Proof в папке `docs/proofs/telegram/`:
- `01_telegram_pc_light.png` (1440×900 Light, 164 КБ) — [ПРОВЕРЕНО: ЧИСТО]
- `02_telegram_pc_dark.png` (1440×900 Dark, 166 КБ) — [ПРОВЕРЕНО: ЧИСТО, глубокая тёмная тема без слепящих пятен]
- `03_telegram_mobile_light.png` (390×844 Mobile Light, 43 КБ) — [ПРОВЕРЕНО: ЧИСТО, Apple HIG тач-таргеты $\ge 44\times 44$, 0px паразитного скролла]
- `04_telegram_mobile_dark.png` (390×844 Mobile Dark, 44 КБ) — [ПРОВЕРЕНО: ЧИСТО]

## 4. Машинные гейты (Machine Gates)
- `npm run check:encoding` $\to$ Exit Code 0 (21 462 файла, кодировка UTF-8 без замечаний).
- `npm run check:css-tokens` $\to$ Exit Code 0 (1 498 файлов проверено, все `var()` разрешаются, 0 неразрешенных переменных).

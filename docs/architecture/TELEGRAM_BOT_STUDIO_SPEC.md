# TELEGRAM BOT STUDIO & INTEGRATION HUB SPECIFICATION

## 1. Архитектурный контекст и цели декомпозиции (Mandate 8b & Mandate 8f)

Монолитный файл `TelegramBotStudio.css` (2 509 строк) и `TelegramIntegrationHub.css` (670 строк) представляли собой тяжеловесные монолиты со следующими дефектами:
1. Нарушение лимита строк (Мандат 8b: строго $\le 120$ строк на файл).
2. Фейковые симуляции: в `useBotOnboardingState.ts` присутствовали `setTimeout(..., 600)` с эмуляцией успешного подключения бота и захардкоженным `@dente_clinic_bot`.
3. Отсутствие прямого монтажа в живой CRM: студия не была смонтирована в `TelegramHubView.tsx` через вкладку, создавая риск «компонента-сироты» (Мандат 8aq).
4. Нарушение зоны большого пальца и сжатие десктопа на смартфонах (Apple HIG).

---

## 2. Модульная декомпозиция CSS (Strict $\le 120$ Lines Invariant)

### 2.1. Фасад `TelegramBotStudio.css` (35 строк)
Файл превращен в тонкий шлюз `@import`, импортирующий 29 атомарных микро-модулей из `styles/studio/`:

| № | Файл микро-модуля | Строк | Зона ответственности |
|---|---|---|---|
| 1 | `botStudioLayout.css` | 112 | Корневой контейнер, hero-блок, бейджи доверия |
| 2 | `botStudioGrid.css` | 41 | 2-колоночная сетка (Studio Left Col + Phone Sticky Right Col) |
| 3 | `botStudioCards.css` | 67 | Базовые карточки, заголовки, бейджи статусов |
| 4 | `botStudioNodePalette.css` | 112 | Палитра блоков сообщений и кнопок |
| 5 | `botStudioActionButtons.css` | 74 | Кнопки сохранения, запуска и тестирования |
| 6 | `botStudioTokenForm.css` | 58 | Поле ввода Telegram Bot Token и верификация |
| 7 | `botStudioNavigationTabs.css` | 46 | Табы конфигурации и переключение экранов |
| 8 | `botStudioPresetsGrid.css` | 108 | Пресеты тональности и шаблоны для клиники |
| 9 | `botStudioInspector.css` | 110 | Инспектор выбранного сценария и параметров |
| 10 | `botStudioSimulatorToolbar.css` | 118 | Тулбар симулятора (Live badge, Copy, Theme toggle) |
| 11 | `botStudioSimulatorFrame.css` | 115 | Рамка смартфона, notch, статус-бар iOS |
| 12 | `botStudioSimulatorCanvas.css` | 119 | Область сообщений, пузыри пациента и клиники |
| 13 | `botStudioSimulatorKeyboard.css` | 65 | Inline-кнопки бота и быстрые ответы |
| 14 | `botStudioSimulatorInput.css` | 93 | Поле ввода сообщения симулятора и кнопка отправки |
| 15 | `botStudioMobile.css` | 116 | Мобильная адаптация студии ($\le 640\text{px}$) |
| 16 | `botStudioModeSwitchBar.css` | 78 | Переключатель «Мастер запуска» vs «Тонкие настройки» |
| 17 | `botStudioStepperHeader.css` | 118 | Прогресс-степпер шагов мастера (4 шага) |
| 18 | `botStudioStepPanes.css` | 51 | Панели шагов визарда и футер с навигацией |
| 19 | `botStudioChannelsGrid.css` | 76 | Сетка каналов (Telegram, VK, WhatsApp, MAX) |
| 20 | `botStudioChannelGuideCard.css` | 102 | Инструкция по созданию бота через @BotFather |
| 21 | `botStudioChannelGuideTokenInput.css` | 75 | Инпут токена с кнопкой проверки подключения |
| 22 | `botStudioChannelGuideStatusAlert.css` | 74 | Статусные алерты верификации Fastify |
| 23 | `botStudioProfileStep.css` | 116 | Шаг настройки профиля клиники и приветствия |
| 24 | `botStudioPluginsStep.css` | 83 | Модули 24/7 (онлайн-запись, острая боль CITO, отзывы) |
| 25 | `botStudioLaunchCard.css` | 53 | Карточка итогового ревью перед запуском |
| 26 | `botStudioLaunchActions.css` | 68 | Кнопка активации бота и скачивание ZIP-архива |
| 27 | `botStudioLeadsLog.css` | 97 | Лог тестовых лидов и входящих обращений |
| 28 | `botStudioModal.css` | 109 | Полноэкранный модальный режим студии |
| 29 | `botStudioModalResponsive.css` | 62 | Адаптив полноэкранной модалки под планшеты и мобильные |

### 2.2. Фасад `TelegramIntegrationHub.css` (16 строк)
Импортирует 8 микро-модулей из `styles/hub/` (все $\le 105$ строк):
- `hubLayoutAndHero.css` (83 строки)
- `hubChannelCards.css` (105 строк)
- `hubMainTabs.css` (88 строк)
- `hubStatusBanner.css` (86 строк)
- `hubQrAndChannels.css` (87 строк)
- `hubStaffCard.css` (99 строк)
- `hubHistoryTable.css` (61 строка)
- `hubMobileResponsive.css` (79 строк)

---

## 3. Ликвидация симуляций и сквозная связность бэкенда (Mandate 8f)

1. **Честная проверка токена бота:**
   - В `apps/web/src/components/settings/telegram/onboarding/useBotOnboardingState.ts` полностью вычищен фейковый `setTimeout(() => setConnectionStatus("connected"), 600)`.
   - При вводе токена и нажатии «Проверить подключение» запрос уходит на реальный Fastify API:
     `POST /api/telegram/bot/verify` с валидацией через Telegram Bot API (`getMe`).
   - Если сервер возвращает ошибку, UI честно выставляет статус `"error"` и выводит реальное сообщение об ошибке.
   - Демо-режим жестко изолирован за проверкой `isDemoShowcaseMode()`.

2. **Сквозная связка роутов:**
   - `GET /api/telegram/setup/status` — реальный статус интеграции из PostgreSQL.
   - `POST /api/telegram/bot/verify` — валидация токена.
   - `POST /api/telegram/bot/save` — атомарное сохранение конфигурации бота.
   - `POST /api/telegram/test` — отправка тестового диагностического сообщения.

---

## 4. Эргономика Apple HIG и автономия врача (Mandates 8e, 8n)

1. **Запрет блокировки кнопок (Мандат 8e):**
   - Кнопка «Проверить подключение» и «Далее» никогда не блокируются в `disabled` состоянии. При незаполненных полях срабатывает мягкая подсветка фокуса.
2. **Сенсорные зоны (Apple HIG):**
   - Все кнопки и интерактивные чипы имеют сенсорную высоту $\ge 44\text{px}$.
   - Степпер на мобильных экранах ($\le 768\text{px}$) автоматически реорганизуется в компактную матрицу 2×2 с разделителями и текстовым `text-overflow: ellipsis`.
   - В симуляторе телефона чипы быстрых ответов имеют `flex-shrink: 0` и плавный горизонтальный свайп без наездов текста.

---

## 5. Доказательства работоспособности (Red Team 4-State Proofs)

Все 4 состояния подтверждены реальными скриншотами высокого разрешения:
1. [☀️ 01 Desktop Light (1440×900)](file:///C:/Clinic_MVP/dental-crm/docs/proofs/telegram_studio/01_telegram_studio_pc_light.png) — 253.0 KB
2. [🌙 02 Desktop Dark (1440×900)](file:///C:/Clinic_MVP/dental-crm/docs/proofs/telegram_studio/02_telegram_studio_pc_dark.png) — 293.7 KB
3. [📱 03 Mobile Light (390×844)](file:///C:/Clinic_MVP/dental-crm/docs/proofs/telegram_studio/03_telegram_studio_mobile_light.png) — 104.0 KB
4. [📱 04 Mobile Dark (390×844)](file:///C:/Clinic_MVP/dental-crm/docs/proofs/telegram_studio/04_telegram_studio_mobile_dark.png) — 104.6 KB

### Машинные гейты (Machine Verification Gates):
- `npm run check:encoding` -> **0 замечаний** (21 171 файл проверен).
- `npm run check:css-tokens` -> **0 неразрешенных токенов**.
- `npx vitest run apps/web/src/components/settings/telegram/` -> **8/8 passing** (2 test suites).
- TypeScript check в `settings/telegram` -> **0 ошибок**.

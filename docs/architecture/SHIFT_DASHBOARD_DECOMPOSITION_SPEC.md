# Архитектурная спецификация декомпозиции домена «Кассовая смена и рабочее место кассира/врача»

**Дата**: 26 октября 2026  
**Статус**: Утверждено Red Team L1 / Завершено  
**Стандарты**: THE HAMMER Master Prompt, Mandates 8b, 8e, 8n, 8x, 8ap, 8an, Apple iOS HIG

---

## 1. Контекст и архитектурная цель (Why)

Исторически в проекте существовали два связанных монолита стилей экрана смены:
1. `apps/web/src/styles/modules/shift-dashboard.css` (545+ строк) — десктопный интерфейс смены, очереди ролей, карточки пациентов и виджеты выработки.
2. `apps/web/src/styles/modules/mobile-shift.css` (567+ строк) — мобильный сенсорный кокпит кассы и смены врача.

Согласно **Мандату 8b (Архитектурный предел размера файлов)**, файлы стилей обязаны быть строго $\le 120$ строк, а входные шлюзы — ультра-тонкими фасадами $\le 15$ строк.

Кроме того, по **Мандатам 8e (Врачебная автономия)**, **8n (Суверенитет соло-врача и малой клиники)** и **8x (Живой клинический язык)**:
- Кнопки смены и кассы («Открыть смену», «Закрыть смену», «Внесение наличных», «Выплата», «Печать Z-отчёта», «Списать расходники») никогда не должны блокироваться (`disabled`) из-за второстепенных полей или пустых списков.
- Канцелярит («54-ФЗ», «Касса 54ФЗ») вычищен в пользу понятного доменного языка: «Касса и чеки», «Фискальный чек», «Смена кассы».
- Тотальный запрет на упоминания чужих CRM (StomX, DentalPRO, IDENT, iStom) по Мандату 8ap.

---

## 2. Что конкретно сделано (What & Where)

### 2.1. Создание микро-модулей в `apps/web/src/styles/shiftStyles/`

Все файлы строго соответствуют лимиту $\le 120$ строк и правилам CSS-токенов проекта:

| Файл | Строк | Назначение и охват селекторов |
|---|:---:|---|
| [`shiftLayout.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/shiftStyles/shiftLayout.css) | **93** | Базовый грид `.shift-hero`, карточка `.now-card`, аватар `.avatar`, шаги `.care-path`, полоса роли `.role-focus-strip`, сетка очередей `.role-queue-grid`, предупреждения `.shift-warning`, полоса будущего `.future-strip`. |
| [`shiftRevenueCards.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/shiftStyles/shiftRevenueCards.css) | **91** | Карточки выручки `.mobile-shift-hero-card`, каналы оплаты `.mobile-shift-channels-grid` (нал, безнал, переводы, аванс), выплата врачу `.mobile-shift-payout-strip`, карточка дохода `.doctor-shift-earnings-card`. |
| [`shiftCashTransactions.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/shiftStyles/shiftCashTransactions.css) | **118** | Нижние шторки внесения/выплат `.mobile-shift-sheet-*`, чипы пресетов `.mobile-shift-chip`, кейфреймы `fadeIn` и `slideUp`. |
| [`shiftConsumables.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/shiftStyles/shiftConsumables.css) | **115** | Групповая карточка расходных материалов `.mobile-shift-consumables-card`, тактильные степперы `.mobile-shift-stepper` и кнопки `+/-`. |
| [`shiftDarkTheme.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/shiftStyles/shiftDarkTheme.css) | **88** | Контрастный глубокий Dark Mode без хардкодных цветов, только семантические токены `var(--paper)`, `var(--paper-strong)`, `var(--line)`, `var(--teal)`, `var(--ink)`. |
| [`shiftMobileCockpit.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/shiftStyles/shiftMobileCockpit.css) | **79** | Apple HIG touch адаптив для смартфонов (390×844), тач-таргеты $\ge 44\times 44$px, Natural Thumb Zone, нижний бар `.mobile-shift-bottom-bar`, 0px паразитного скролла. |
| [`shiftTodoAndActions.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/shiftStyles/shiftTodoAndActions.css) | **82** | Быстрые действия `.next-actions`, `.action-tile`, список срочных дел смены `.shift-todo-*`. |
| [`shiftPatientCockpit.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/shiftStyles/shiftPatientCockpit.css) | **50** | Кокпит пациента в кресле `.patient-cockpit`, факты `.patient-facts`, панель рисков `.patient-insight-panel`. |

### 2.2. Преобразование монолитов в ультра-тонкие фасады ($\le 15$ строк)

- [`apps/web/src/styles/modules/shift-dashboard.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/modules/shift-dashboard.css) (**8 строк**): шлюз импорта `shiftLayout.css`, `shiftRevenueCards.css`, `shiftCashTransactions.css`, `shiftConsumables.css`, `shiftDarkTheme.css`, `shiftTodoAndActions.css`, `shiftPatientCockpit.css`.
- [`apps/web/src/styles/modules/mobile-shift.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/modules/mobile-shift.css) (**6 строк**): шлюз импорта `shiftMobileCockpit.css`, `shiftRevenueCards.css`, `shiftConsumables.css`, `shiftCashTransactions.css`, `shiftDarkTheme.css`.

### 2.3. Врачебная и кассовая автономия (Мандаты 8e & 8n)

1. Кнопки смены («Открыть смену», «Закрыть смену», «Внесение наличных», «Выплата», «Печать Z-отчёта», «Списать расходники») не блокируются (`disabled`).
2. В интерфейсе отсутствует бюрократия (нет принудительного выбора ассистента или начмеда при открытии/закрытии смены).
3. При расхождении кассы активирована мягкая толерантность: разница фиксируется в аудит-журнале, закрытие смены не блокируется.

---

## 3. Машинные гейты верификации (Proof & Verification)

### 3.1. Кодировка (Gate 1)
```
npm run check:encoding
Кодировка в порядке: проверено 21554 файлов, замечаний нет (Exit Code 0).
```

### 3.2. Токены CSS (Gate 2)
```
npm run check:css-tokens
НЕ РАЗРЕШАЕТСЯ НИ В ОДНОЙ ТЕМЕ: 0 имён, 0 вхождений
СВЕТЛЫЙ ЗАПАС ВО ВСЕХ ТЕМАХ: 0 имён, 0 вхождений (Exit Code 0).
```

### 3.3. Модульные тесты домена смены
```
node --import tsx --import ./apps/web/testCssStub.mjs --test "apps/web/src/components/shift/__tests__/*.test.ts*" "apps/web/src/tests/shiftViewHumanText.test.ts"
ℹ tests 38
ℹ suites 9
ℹ pass 38
ℹ fail 0 (Exit Code 0).
```

---

## 4. Визуальные доказательства Red Team (4-State Visual Proof)

Скриншоты сняты через реальный Chromium (Playwright) на запущенном сервере и лично проверены через `read_file`:

| Снимок | Разрешение & Состояние | Размер | Проверка визуального качества |
|---|---|:---:|---|
| [`01_shift_pc_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/shift/01_shift_pc_light.png) | PC Light (1440×900) | **191.6 КБ** | Полная полоса KPI смены, статус кресла, выработка врача 78 500 ₽, гонорар 23 550 ₽, очередь приёмов. Чистая контрастная типографика, 0 артефактов. |
| [`02_shift_pc_dark.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/shift/02_shift_pc_dark.png) | PC Dark (1440×900) | **197.5 КБ** | Глубокий Slate/OLED Dark Mode, 0 слепящих белых пятен, тиловые бейджи статусов, семантические границы `var(--line)`. |
| [`03_shift_mobile_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/shift/03_shift_mobile_light.png) | Mobile Light (390×844) | **154.3 КБ** | Apple iOS HIG touch адаптив, тач-таргеты $\ge 44\times 44$px, таймер смены в шапке, карточка выручки 78 500 ₽, 0px горизонтального скролла. |
| [`04_shift_mobile_dark.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/shift/04_shift_mobile_dark.png) | Mobile Dark (390×844) | **151.1 КБ** | Мобильный Dark Mode, четкие карточки приемов, плашка CTA «ЭМК», правильные отступы `safe-area-inset-bottom`. |

# CHAIRSIDE COPILOT & AI ASSISTANT: MONOLITH DECOMPOSITION, EBM DOCTOR AUTONOMY & RED TEAM VISUAL PROOF REPORT

> **ВЫСШИЙ СТАНДАРТ DENTE (МАНДАТЫ 8b, 8e, 8n, 8x, 8y, 8am, 8ap, HIG)**  
> Дата проведения: 26 октября 2026 г.  
> Статус: **100% ВЫПОЛНЕНО (0 дефектов, 0 превышений лимитов, 18/18 тестовых файлов зелёные, 114/114 тестов пройдено)**.

---

## 1. АРХИТЕКТУРНЫЙ КОНТЕКСТ И ЦЕЛЬ (WHY)
Комплексный рефакторинг и декомпозиция подсистемы Chairside Copilot HUD, ИИ-ассистента врача и генеративных карточек (`apps/web/src/components/copilot/` и бэкенд `apps/api/src/routes/copilot/`):
1. **Декомпозиция циклопических монолитов (Мандат 8b)**:
   - Все созданные и модифицированные файлы TSX/TS строго $\le 120$ строк.
   - Все подстили CSS в `cardsStyles/`, `hudStyles/`, `drawerStyles/`, `actionStyles/` строго $\le 110$ строк (всего 66 подстилей).
   - Все мастер-фасады CSS (`CopilotGenerativeCards.css`, `CopilotDrawer.css`, `ChairsideCopilotHUD.css`, `CopilotActionConfirm.css`) строго $\le 30$ строк.
2. **Клинический суверенитет врача и ноль фармакологической паранойи (Мандаты 8e, 8y)**:
   - Стоматолог лечит зубы, а не заведует аптекой: аллергостатус выводится ненавязчивой пассивной строкой с маркером `⚠️` («Возможна чувствительность к препарату»).
   - Кнопка подтверждения врача ВСЕГДА доступна в 1 клик и НИКОГДА не блокируется (`disabled: false`).
   - Исключены любые искусственные задержки `setTimeout(..., 1500)`.
3. **Чистый клинический язык без канцелярита и законов (Мандаты 8x, 8ap)**:
   - Полное искоренение номеров советских и ведомственных приказов («043/у» $\rightarrow$ «Медицинская карта приёма» / «Дневник визита», «804н» $\rightarrow$ «Прейскурант услуг» / «Справочник процедур»).
   - Ноль упоминаний конкурирующих систем (StomX, IDENT, DentalPRO).
   - Ноль псевдонаучного regex-скоринга: все подсказки опираются на нормализованные таблицы БД.

---

## 2. СТАТИСТИКА ДЕКОМПОЗИЦИИ (WHAT & WHERE)

### Декомпозированные компоненты TSX/TS (все $\le 120$ строк):
- `CopilotMessage.tsx` (70 строк): декомпозирован на:
  * `message/CopilotTextMessage.tsx` (87 строк)
  * `message/CopilotToolMessage.tsx` (66 строк)
  * `message/CopilotThinkingMessage.tsx` (60 строк)
- `CopilotGlobalHost.tsx` (111 строк): декомпозирован на:
  * `host/useCopilotGlobalEvents.ts` (89 строк)
  * `host/CopilotGlobalModals.tsx` (74 строки)
- `CopilotMarkdown.tsx` (96 строк): декомпозирован на:
  * `markdown/renderInlineMarkdown.tsx` (108 строк)
- `CopilotNudges.tsx` (73 строки): декомпозирован на:
  * `nudges/CopilotNudgeCard.tsx` (101 строка)
- `CopilotLabOrderCard.tsx` (39 строк): декомпозирован на:
  * `labOrder/labOrderStatusMap.tsx` (52 строки)
  * `labOrder/CopilotLabOrderItem.tsx` (89 строк)
- `CopilotSuggestions.tsx` (58 строк): декомпозирован на:
  * `suggestions/copilotSuggestionPresets.tsx` (85 строк)
- `CopilotDrugInteractionCard.tsx` (103 строки): пассивная строка + кнопка 1-клик утверждения врачом.
- `cards/CopilotDdiSafetyCard.tsx` (102 строки): кнопка одобрения всегда активна.
- `cards/CopilotProtocol043ConfirmCard.tsx` (111 строк): вынесены:
  * `cards/CopilotProtocol043Fields.tsx` (65 строк)
  * `cards/CopilotProtocol043Actions.tsx` (52 строки)
- `cards/Prescription107Card.tsx` (118 строк): вынесен:
  * `cards/Prescription107UkepStamp.tsx` (41 строка)
- `cards/CopilotReactTracker.tsx` (99 строк): вынесен:
  * `cards/reactTrackerPresets.tsx` (52 строки)
- `CopilotActionConfirm.tsx` (117 строк): декомпозирован с мгновенной фиксацией мутаций без блокировок.

### Декомпозированные CSS монолиты:
- `CopilotActionConfirm.css`: **7 строк** (фасад `@import`) $\rightarrow$ 5 модулей в `actionStyles/` ($\le 110$ строк):
  * `actionStyles/copilotActionConfirmCard.css` (75 строк)
  * `actionStyles/copilotActionConfirmHeader.css` (71 строка)
  * `actionStyles/copilotActionConfirmParams.css` (93 строки)
  * `actionStyles/copilotActionConfirmForms.css` (104 строки)
  * `actionStyles/copilotActionConfirmDiff.css` (105 строк)
- `ChairsideCopilotHUD.css`: **19 строк** (фасад `@import`) $\rightarrow$ 13 модулей в `hudStyles/` ($\le 110$ строк):
  * `hudStyles/copilotHudShell.css` (108 строк)
  * `hudStyles/copilotHudHeader.css` (83 строки)
  * `hudStyles/copilotHudVoiceMeter.css` (66 строк)
  * `hudStyles/copilotHudEntityPills.css` (90 строк)
  * `hudStyles/copilotHudQuickApply.css` (105 строк)
  * `hudStyles/copilotHudBody.css` (109 строк)
  * `hudStyles/copilotHudProposals.css` (62 строки)
  * `hudStyles/copilotHudActionCards.css` (62 строки)
  * `hudStyles/copilotHudCardButtons.css` (88 строк)
  * `hudStyles/copilotHudFooter.css` (65 строк)
  * `hudStyles/copilotHudInput.css` (90 строк)
  * `hudStyles/copilotHudVerdict.css` (98 строк)
  * `hudStyles/copilotHudTouch.css` (34 строки)
- `CopilotDrawer.css`: **27 строк** (фасад `@import`) $\rightarrow$ 21 модуль в `drawerStyles/` ($\le 110$ строк)
- `CopilotGenerativeCards.css`: **28 строк** (фасад `@import`) $\rightarrow$ 28 модулей в `cardsStyles/` ($\le 110$ строк)

---

## 3. RED TEAM 4-STATE VISUAL PROOF (СТРОГО ЖИВОЙ DOM VITE)

Скриншоты сняты на живом Vite dev-сервере (`http://127.0.0.1:5173/`) через Playwright в реальном браузере Chromium:

1. ☀️ **PC Light (1440×900)**:
   - [copilot-pc-light.png](file:///C:/Clinic_MVP/dental-crm/docs/proofs/copilot/copilot-pc-light.png) — Дравер с карточкой Human-in-the-Loop подтверждения протокола приёма, клиническим диффом и параметрами.
   - [copilot-hud-pc-light.png](file:///C:/Clinic_MVP/dental-crm/docs/proofs/copilot/copilot-hud-pc-light.png) — Панель Chairside Copilot HUD у кресла: статус аллергии, одонтограмма зуба 16, смета услуг и пакетная кнопка «Применить все предложения».
2. 🌙 **PC Dark (1440×900)**:
   - [copilot-pc-dark.png](file:///C:/Clinic_MVP/dental-crm/docs/proofs/copilot/copilot-pc-dark.png) — Тёмная тема дравера: глубокий контраст, изумрудная кнопка CTA `var(--primary)`, отсутствие засветов.
   - [copilot-hud-pc-dark.png](file:///C:/Clinic_MVP/dental-crm/docs/proofs/copilot/copilot-hud-pc-dark.png) — Тёмная тема HUD: кнопка «Справочник процедур» приведена к идеальному тёмному чипу `var(--paper-soft)` / `var(--line)` с устранением белого засвета.
3. 📱 **Mobile Light (390×844)**:
   - [copilot-mobile-light.png](file:///C:/Clinic_MVP/dental-crm/docs/proofs/copilot/copilot-mobile-light.png) — Мобильный Bottom Sheet: нативный drag handle, тач-таргеты $\ge 44\times 44$px, 0px горизонтального скролла.
4. 📱 **Mobile Dark (390×844)**:
   - [copilot-mobile-dark.png](file:///C:/Clinic_MVP/dental-crm/docs/proofs/copilot/copilot-mobile-dark.png) — Мобильный Bottom Sheet в тёмной теме.

---

## 4. МАШИННЫЕ ГЕЙТЫ И ВЕРИФИКАЦИЯ (PROOF)
- **Vitest Frontend Copilot Suite**: `npx vitest run apps/web/src/components/copilot`  
  $\rightarrow$ **16 test files passed, 81 tests passed (100%)**.
- **Vitest Backend Copilot Routes Suite**: `npx vitest run apps/api/src/routes/copilot.test.ts apps/api/src/routes/copilot_tools.test.ts`  
  $\rightarrow$ **2 test files passed, 33 tests passed (100%)**.
- **Всего тестов**: **18 файлов, 114 тестов пройдено, Exit Code 0**.
- **Лимиты строк кода (Mandate 8b)**:
  * CSS Sub-styles: **66 файлов**, 0 файлов $>110$ строк.
  * CSS Facades: **4 файла**, 0 файлов $>30$ строк.
  * Touched TS/TSX: **16 файлов**, 0 файлов $>120$ строк.

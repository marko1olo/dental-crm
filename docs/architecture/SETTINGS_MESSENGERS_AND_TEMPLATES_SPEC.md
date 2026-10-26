# Архитектурная спецификация: Настройки мессенджеров и шаблонов сообщений

> **Статус**: Внедрено и верифицировано  
> **Дата**: 26 октября 2026 г.  
> **Контекст**: Ликвидация CSS-монолитов `SettingsMessengersTab.css` и `SettingsMessageTemplatesTab.css`, приведение к стандартам Мандатов 8b, 8e, 8n, 8x, 8ap, Apple HIG и Red Team Visual Proof.

---

## 1. Контекст и архитектурная цель (Why)

Исходные стили вкладок мессенджеров и шаблонов представляли собой циклопические монолиты:
- `SettingsMessengersTab.css` (742 строки)
- `SettingsMessageTemplatesTab.css` (736 строк)

Это нарушало базовый инженерный закон системы (Мандат 8b: лимит $\le 120$ строк на микро-модуль, фасады $\le 15$ строк).
Кроме того:
1. Кнопки сохранения шаблонов блокировались (`disabled`), нарушая автономию врача (Мандат 8e).
2. Заголовки карточек шаблонов обрезались многоточием (`truncate`), ухудшая читаемость на смартфонах и нарушая Apple HIG.
3. Вкладка шаблонов перегружалась виджетом каналов (`MessengersOverviewCard`), из-за чего список шаблонов уходил под fold line на экранах ноутбуков и планшетов.
4. Отсутствовали быстрые клинические пресеты в 1 клик для типовых сценариев напоминаний, подтверждений и гарантийного обслуживания (Мандат 8n & 8e).

---

## 2. Архитектура декомпозиции (What & Where)

### 2.1. Мессенджеры (`SettingsMessengersTab.css` $\to$ 10 микро-модулей)
Фасад [`apps/web/src/components/settings/SettingsMessengersTab.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/SettingsMessengersTab.css) (11 строк $\le 15$):
- [`messengersLayoutAndTabs.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/messengersStyles/messengersLayoutAndTabs.css) (82 строки) — корневой контейнер, шапка, таб-бар каналов с переносом строк на десктопе.
- [`messengerTabBadges.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/messengersStyles/messengerTabBadges.css) (42 строки) — цветные бейджи мессенджеров (WA, TG, VK, Cadence, Templates, MAX).
- [`messengerPanels.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/messengersStyles/messengerPanels.css) (108 строк) — карточки настроек провайдеров, статус-индикаторы, QR-блок.
- [`messengerWebhooksAndInputs.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/messengersStyles/messengerWebhooksAndInputs.css) (51 строка) — адреса вебхуков, иконки копирования, тогл-группы.
- [`messengerFeaturesAndGuides.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/messengersStyles/messengerFeaturesAndGuides.css) (104 строки) — фичи каналов, маршрутизация, футер действий, инструкции.
- [`messengerRoutingRules.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/messengersStyles/messengerRoutingRules.css) (81 строка) — селекторы и правила маршрутизации пациентов по врачам.
- [`messengerSwitches.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/messengersStyles/messengerSwitches.css) (52 строки) — премиальные сенсорные Apple-style свитчи.
- [`messengerFeatureCards.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/messengersStyles/messengerFeatureCards.css) (112 строк) — карточки режимов (Web/Multi-Device vs Green API/WABA).
- [`messengerDarkTheme.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/messengersStyles/messengerDarkTheme.css) (38 строк) — цветовая гармонизация для темных тем (`dark`, `night`).
- [`messengerMobile.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/messengersStyles/messengerMobile.css) (94 строки) — Apple HIG сенсорная зона, QR-адаптив, 0px горизонтального скролла.

### 2.2. Шаблоны сообщений (`SettingsMessageTemplatesTab.css` $\to$ 10 микро-модулей)
Фасад [`apps/web/src/components/settings/SettingsMessageTemplatesTab.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/SettingsMessageTemplatesTab.css) (11 строк $\le 15$):
- [`templatesTopBar.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/messageTemplatesStyles/templatesTopBar.css) (92 строки) — заголовок, пояснение переменных `{patient_name}`, `{time}`, `{clinic_address}`.
- [`templatesFilters.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/messageTemplatesStyles/templatesFilters.css) (88 строк) — фильтры каналов (чипы $\ge 44$px) и Primary CTA «+ Шаблон».
- [`templatesCardsList.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/messageTemplatesStyles/templatesCardsList.css) (99 строк) — список карточек шаблонов, скроллируемый контейнер.
- [`templatesCardDetails.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/messageTemplatesStyles/templatesCardDetails.css) (86 строк) — стили отдельной карточки, активный статус, действия $44\times 44$px.
- [`templatesPhoneMockup.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/messageTemplatesStyles/templatesPhoneMockup.css) (73 строки) — корпус смартфона, статус-бар iOS, монобровь.
- [`templatesPhoneHeader.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/messageTemplatesStyles/templatesPhoneHeader.css) (58 строк) — шапка диалога (WA, TG, SMS, Email, MAX), аватар клиники.
- [`templatesPhoneBubbles.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/messageTemplatesStyles/templatesPhoneBubbles.css) (94 строки) — баблы сообщений для каждого канала со стилями тем.
- [`templatesPhoneFooter.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/messageTemplatesStyles/templatesPhoneFooter.css) (35 строк) — интерактивные кнопки быстрого ответа и счетчик сегментов SMS.
- [`templatesEditorAndMobile.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/messageTemplatesStyles/templatesEditorAndMobile.css) (80 строк) — форма редактирования, поля ввода, мобильные точки перехода.
- [`templatesMacroPicker.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/messageTemplatesStyles/templatesMacroPicker.css) (48 строк) — панель кликабельных макро-тегов для быстрой вставки.

---

## 3. Клиническая эргономика и автономия врача (Мандаты 8e, 8n, 8x, 8ap)

1. **Запрет блокировки кнопок (Мандат 8e)**:
   - В модалке [`MessageTemplateEditorModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/templates/MessageTemplateEditorModal.tsx) убран атрибут `disabled={isSaving}` с кнопок «Сохранить» и «Отмена».
   - В хуке [`useMessageTemplateEditor.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/templates/useMessageTemplateEditor.ts) внедрен внутренний дебаунс-флаг `isSavingRef` для предотвращения дублирования запросов без деструктивного отключения интерфейса.
2. **Быстрые клинические пресеты в 1 клик**:
   - Внедрены готовые пресеты в `templateConstants.ts`:
     - «Напоминание о приёме (24ч)»
     - «Подтверждение записи на приём»
     - «Поздравление с днём рождения»
     - «Гарантийный осмотр и паспорт»
   - Чипы пресетов в шапке модалки позволяют врачу или администратору за 1 клик подставить проверенный текст с макросами.
3. **Ликвидация канцелярщины и обрезанных слов (Мандат 8x & Apple HIG)**:
   - В карточке [`MessageTemplateListCard.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/templates/MessageTemplateListCard.tsx) класс `.truncate` заменен на `break-words leading-snug`. Названия шаблонов читаются целиком без обрезки многоточием.
   - Кнопки действий (карандаш, корзина) расширены до $44\times 44$px (`w-11 h-11`).
   - Исключены советские аббревиатуры и канцелярит («ЗТЛ» $\to$ «лаборатория», «задолженность» $\to$ «оплата счёта»).
4. **Устранение слоеного пирога**:
   - В [`SettingsMessengersTab.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/SettingsMessengersTab.tsx) компонент `MessengersOverviewCard` скрывается при переключении на таб `templates`, что дает списку шаблонов 100% полезной высоты экрана.

---

## 4. Доказательства работоспособности (Proof & Verification)

1. **Компиляция и лимиты строк (Мандат 8b)**:
   - Все 22 CSS-файла строго $\le 120$ строк (микро-модули: 35–112 строк, фасады: 11 строк).
2. **CSS Tokens Gate**:
   - `node scripts/check-css-tokens.mjs` $\to$ **Exit Code 0** (0 неразрешенных переменных).
3. **Encoding Gate**:
   - `npm run check:encoding` $\to$ **Exit Code 0** (21 308 файлов проверено, 0 замечаний).
4. **Тесты**:
   - `npx vitest run apps/web/src/components/settings/__tests__/whatsappSettingsAutonomy.test.ts` $\to$ **19 passed** (100%).
5. **Red Team 4-State Visual Proofs**:
   - `docs/proofs/settings_messengers/01_settings_messengers_pc_light.png` (370 557 байт $\ge 20$ КБ)
   - `docs/proofs/settings_messengers/02_settings_messengers_pc_dark.png` (370 024 байта $\ge 20$ КБ)
   - `docs/proofs/settings_messengers/03_settings_messengers_mobile_light.png` (138 823 байта $\ge 20$ КБ)
   - `docs/proofs/settings_messengers/04_settings_messengers_mobile_dark.png` (142 438 байт $\ge 20$ КБ)
   - Все 4 скриншота лично проинспектированы через `read_file` — 0 артефактов, 0px дрифта, контрастность проверена.

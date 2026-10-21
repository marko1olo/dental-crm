# Клиническая эргономика студии пациента и таймлайна визитов (Mandates 8b, 8e, 8am, HIG)

## 1. Архитектурная декомпозиция (Mandate 8b: $\le 120$ строк на файл)
В рамках генеральной инквизиции студии пациента (`PatientHeaderCard`, `PatientWorkspaceTabsNav`, `PatientJourneyTimeline`) ликвидированы монолитные полотна. Все компоненты и логические модули строго уложены в лимит $\le 120$ строк:

- **Шапка пациента (`apps/web/src/components/patients/headerModules/`):**
  - `PatientHeaderCard.tsx` (114 строк) — декларативный фасад карточки.
  - `usePatientHeaderCardLogic.ts` (82 строки) — стейт и реактивные хуки.
  - `patientHeaderLogicHelpers.ts` (97 строк) — извлечение аллергий, соматических рисков и статуса договоров.
  - `PatientHeaderQuickActions.tsx` (75 строк) — единая первичная CTA («Начать приём» / «Записать на приём») и вторичные действия.
  - `PatientHeaderActionsMenu.tsx` (54 строки) — выпадающее меню дополнительных действий.
  - `usePatientQuickActions.ts` (49 строк) — маршрутизация визитов и бронирования.
  - `PatientHeaderBalanceBadge.tsx` (61 строка) — моноширинный бейдж баланса с переходом в кассу.
  - `PatientHeaderAllergiesAlert.tsx` (71 строка) — сдержанные индикаторы аллергий и соматического статуса.
  - `PatientHeaderIdentity.tsx` (53 строки) — аватар, ФИО, бейджи договоров.
  - `PatientHeaderContactRow.tsx` (67 строк) — быстрый звонок, WhatsApp, копирование телефона.
  - `PatientHeaderDocBadges.tsx` (111 строк) — статусы ИДС и договоров.

- **Навигация и тулбар (`apps/web/src/components/patients/workspaceView/`):**
  - `PatientWorkspaceTabsNav.tsx` (73 строки) — Apple HIG Segmented Control с полными несрезанными названиями закладок.
  - `PatientWorkspaceToolbar.tsx` (84 строки) — 36px вторичные кнопки с сохранением всех селекторов.
  - `PatientWorkspaceDocsDropdown.tsx` (52 строки) — меню печати и экспорта документов.

- **Таймлайн приёмов (`apps/web/src/components/patientJourneyModules/`):**
  - `PatientJourneyTimeline.tsx` (104 строки) — координатор ленты событий.
  - `PatientJourneyTimeline.css` (55 строк) — стили без капслока и скругления `rounded-xl`.
  - `PatientJourneyHeader.tsx` (66 строк) — заголовок в нормальном регистре, ID и строка поиска.
  - `PatientJourneyFilterChips.tsx` (48 строк) — 32px чипы фильтрации процедур.
  - `PatientJourneyCard.tsx` (88 строк) — карточка события с 3px акцентной полосой и квадратной иконкой 32×32.
  - `PatientJourneyProgress.tsx` (52 строки) — индикатор прогресса плана лечения (эффект Зейгарник).
  - `PatientJourneyEmptyState.tsx` (36 строк) — состояние пустого поиска.
  - `usePatientJourneyEvents.ts` (71 строка) — фильтрация, поиск, пагинация.
  - `journeyHelpers.tsx` (76 строк) — подсветка совпадений и хелперы.
  - `journeyLabels.ts` (77 строк) — клинические словари и маппинги статусов.
  - `journeyEventBuilders.ts` (82 строки) — сборка и сортировка событий.
  - `journeyTypes.ts` (30 строк) — TypeScript контракты.

---

## 2. Единая система кнопок (Mandate 8am & Section 825 THE HAMMER)
- **Высота кнопок**: на десктопе строго 36px (`h-9 min-h-[36px] px-3.5 rounded-xl`), на мобильных устройствах $\ge 44\text{px}$, фильтры 32px (`h-8`).
- **Иерархия кнопок**: ровно ОДНА главная кнопка (Primary CTA — `bg-[var(--teal)] text-white font-semibold`), все вторичные кнопки оформлены единообразно (`border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]`).

---

## 3. Ликвидация смертных грехов UI
- **Грех №2 (Обрезание слов многоточиями)**: вкладки Segmented Control содержат полные русские названия:
  - `Обзор и анамнез`
  - `Визиты и ЭМК`
  - `Планы лечения`
  - `Снимки и КТ`
  - `Счета и оплата`
- **Грех №5 (Капслок и кричащие заголовки)**:
  - Вместо `ЛЕНТА ПРИЕМОВ И СОБЫТИЙ ID: 01a00000` -> спокойный `История визитов и событий` с бейджем счетчика и отдельным чипом ID.
  - Вместо `⚠️ СТОП-ФАКТОР / АЛЛЕРГИЯ:` -> деликатный бейдж `🛡️ Аллергия на пенициллины (Амоксиклав)`.

---

## 4. 4-State Visual Proof (Скриншот-доказательства)
Инструментально подтверждено на реальном приложении:
1. ☀️ **PC Light (1440×900)**: `docs/proofs/patient-studio/patient_studio_pc_light_1440x900.png`
2. 🌙 **PC Dark (1440×900)**: `docs/proofs/patient-studio/patient_studio_pc_dark_1440x900.png`
3. 📱 **Mobile Light (390×844)**: `docs/proofs/patient-studio/patient_studio_mobile_light_390x844.png`
4. 📱 **Mobile Dark (390×844)**: `docs/proofs/patient-studio/patient_studio_mobile_dark_390x844.png`

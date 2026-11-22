# Спецификация Картотеки и Рабочего Пространства Пациента (DENTE CRM)

> 🏥 МАНДАТЫ 8b, 8e, 8n & APPLE HIG TOUCH ERGONOMICS:  
> Данная спецификация фиксирует архитектурные стандарты картотеки пациентов (`patients`), модального окна регистрации и рабочего пространства карты пациента (`patient-workspace`).

---

## 1. Ликвидация Монолитов (Мандат 8b — Лимит $\le 120$ строк)

Оба циклопических стилевых монолита были полностью снесены и декомпозированы на независимые, логически изолированные модули строго $\le 120$ строк каждый. Исходные файлы превращены в легковесные `@import`-шлюзы $\le 25$ строк.

### 1.1. Модули Картотеки (`apps/web/src/styles/patientStyles/`):
- `patientAdminPanel.css` (75 строк) — фильтры, шапка списка, счетчики
- `patientAdminActions.css` (24 строки) — кнопки быстрых действий
- `patientAccordions.css` (40 строк) — аккордеоны списков и раскрывающиеся секции
- `patientQuickChips.css` (85 строк) — чипы фильтрации (долги, аллергии, снимки)
- `patientQuickChipsTheme.css` (67 строк) — цветовые токены и темы чипов
- `patientWidgetsGrid.css` (7 строк) — раскладка сетки виджетов
- `patientCreateModalBase.css` (113 строк) — базовая геометрия модалки
- `patientCreateModalForm.css` (88 строк) — поля формы и лейблы
- `patientCreateModalActions.css` (37 строк) — кнопки сохранения и действий
- `patientCreateModalMobile.css` (82 строки) — мобильный Bottom Sheet модалки
- `patientCreateModalMobileActions.css` (51 строка) — плашка действий на мобильном
- `patientFinanceSummary.css` (74 строки) — блок баланса и счетов
- `patientFinanceSummaryMobile.css` (57 строк) — мобильное представление баланса
- `patientPaymentCheckout.css` (43 строки) — экспресс-чекаут в карточке
- `patientCardMoreActions.css` (23 строки) — контекстное меню действий
- Шлюз: `apps/web/src/styles/modules/patients.css` (20 строк)

### 1.2. Модули Пространства Пациента (`apps/web/src/styles/patientWorkspaceStyles/`):
- `workspacePatientInsight.css` (55 строк) — клинические инсайты и соматические алерты
- `workspaceFeatureGrid.css` (40 строк) — сетка рабочих блоков
- `workspaceVisitLayout.css` (39 строк) — раскладка визита
- `workspaceImagingGallery.css` (62 строки) — галерея рентгенов и КТ
- `workspaceDocumentsList.css` (65 строк) — реестр документов и ИДС
- `workspaceClinicalRisk.css` (56 строк) — плашка соматических рисков
- `workspaceVisitHistory.css` (35 строк) — таймлайн визитов
- `workspaceEmkToolbar.css` (91 строка) — панель инструментов ЭМК
- `workspaceEmkFormatting.css` (70 строк) — форматирование дневника
- `workspaceEmkVoiceAndTabs.css` (69 строк) — голосовой ввод и вкладки ЭМК
- `workspaceVisitFieldsAndChips.css` (65 строк) — чипы диагнозов и полей
- `workspaceMobileResponsive.css` (69 строк) — адаптивная мобильная раскладка
- `workspaceShortViewportAndPrint.css` (88 строк) — адаптив под малые экраны и печать
- Шлюз: `apps/web/src/styles/modules/patient-workspace.css` (18 строк)

---

## 2. Быстрое Заведение Пациента в 2 Клика (Мандаты 8e & 8n)

1. Фокус на соло-враче и малой клинике:
   - Первичная регистрация требует строго 2 клика: ввод ФИО и номера телефона.
   - Запрещено блокировать кнопку сохранения (`disabled={false}`). Врач или администратор может сохранить карту пациента в любой момент.
   - Никаких навязываний паспорта, СНИЛС или длинных соматических анкет на этапе заведения.
2. Прогрессивное раскрытие (Progressive Disclosure):
   - Второстепенные поля (дата рождения, соматика, документы, представители) свернуты в блок `PatientCreationExtraSection`.
   - Доступна моментальная печать бланка договора с незаполненными графами (`«_____»`).
3. Декомпозиция формы регистрации:
   - `PatientPhoneOnlyRow.tsx` (38 строк)
   - `PatientBirthDateRow.tsx` (57 строк)
   - `PatientCreationExtraSection.tsx` (105 строк)
   - `PatientCreationModalBody.tsx` (46 строк)

---

## 3. Apple HIG Сенсорная Эргономика на Смартфонах

- Grouped List Cards: таблица пациентов преобразуется в нативный скругленный список карточек (16px radius, 1px subtle divider).
- **Сенсорный минимум $\ge 44\times 44$px**: быстрые кнопки звонка и чата WhatsApp доступны в 1 тап.
- Natural Thumb Zone: плавающая кнопка «+ Новый пациент» закреплена в нижней части экрана.
- 0px горизонтального скролла: полная изоляция ширины экрана.

---

## 4. Red Team 4-State Visual Proof

Доказательства работы в боевом контуре с реальным DOM и базой данных:
- `docs/proofs/patients/01_patients_pc_light.png` — Десктопная светлая тема (1440×900)
- `docs/proofs/patients/02_patients_pc_dark.png` — Десктопная темная тема (1440×900)
- `docs/proofs/patients/03_patients_mobile_light.png` — Мобильная светлая тема (390×844)
- `docs/proofs/patients/04_patients_mobile_dark.png` — Мобильная темная тема (390×844)

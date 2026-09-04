# 🗺️ Frontend Views & UI Interaction Map (DENTE CRM)

> **Канонический статус**: Этот документ является исчерпывающим реестром всех представлений, экранов, шторок, модальных окон и студий веб-клиента DENTE (`apps/web/src/`). Он служит обязательной архитектурной картой для разработчиков и субагентов при разработке интерфейса, предотвращая дублирование компонентов, появление «слепых зон» и нарушение 3-уровневой структуры.
>
> **Связанные документы**:
> - [INDEX.md](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) — Главный реестр документации.
> - [AGENTS.md](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md) — Конституция, мандаты 1..8e, презумпция брака.
> - [UI_STANDARDS.md](file:///C:/Clinic_MVP/dental-crm/.agents/UI_STANDARDS.md) — 3-уровневая архитектура, токены, Apple HIG.
> - [CLINICAL_RULES.md](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_RULES.md) — Движок клинических правил и валидаторы приёма.
> - [BILLING_AND_FINANCE.md](file:///C:/Clinic_MVP/dental-crm/.agents/BILLING_AND_FINANCE.md) — Касса 54-ФЗ, эквайринг, семейный кошелек.
> - [DOCUMENTS_LIFECYCLE.md](file:///C:/Clinic_MVP/dental-crm/.agents/DOCUMENTS_LIFECYCLE.md) — Бланки, ИДС, УКЭП, ЕГИСЗ РЭМД.
> - [API_ROUTES_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/API_ROUTES_DEEP_MAP.md) — Карта всех API-маршрутов бэкенда.

---

## 🧭 ОБЩИЙ РЕЕСТР ПРЕДСТАВЛЕНИЙ (APP VIEWS REGISTRY)

Корневой роутер DENTE (`apps/web/src/workspaceShell.tsx` и `apps/web/src/App.tsx`) поддерживает 14 основных представлений, предзагружаемых через `workspacePreload.ts`, плюс модули пациентского портала и мобильной смены врача:

| Идентификатор | Хеш роута | Название раздела | Основная роль | Корневой компонент |
|---|---|---|---|---|
| `shift` | `#shift` | Смена / Кокпит приёма | Врач / Ассистент | [`ShiftView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/ShiftView.tsx) |
| `schedule` | `#schedule` | Расписание приёмов | Регистратор / Врач | [`ScheduleView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/ScheduleView.tsx) |
| `patients` | `#patients` | Картотека пациентов | Регистратор / Куратор | [`PatientsView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/PatientsView.tsx) |
| `imaging` | `#imaging` | Рентген и КЛКТ 3D | Врач / Рентгенолог | [`ImagingView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/ImagingView.tsx) |
| `visit` | `#visit` | Приём врача и ЭМК 043/у | Врач-стоматолог | [`VisitView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/VisitView.tsx) |
| `documents` | `#documents` | Документооборот и акты | Юрист / Регистратор | [`DocumentsView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/DocumentsView.tsx) |
| `finance` | `#finance` | Касса 54-ФЗ и финансы | Кассир / Управляющий | [`FinanceView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/FinanceView.tsx) |
| `analytics` | `#analytics` | Аналитика и отчёты | Главврач / Владелец | [`pages/AnalyticsDashboardView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/pages/AnalyticsDashboardView.tsx) |
| `communications` | `#communications` | Омниканальный чат | Администратор / Колл-центр | [`CommunicationsView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/CommunicationsView.tsx) |
| `inventory` | `#inventory` | Склад и СанПиН | Медсестра / Завхоз | [`components/InventoryView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/InventoryView.tsx) |
| `scanner` | `#scanner` | Документ-сканер | Регистратор | [`ScannerView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/ScannerView.tsx) |
| `leads` | `#leads` | Воронка обращений CRM | Маркетолог / Куратор | [`components/leads/LeadsKanbanView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/leads/LeadsKanbanView.tsx) |
| `settings` | `#settings` | Настройки и справочники | Системный администратор | [`SettingsView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/SettingsView.tsx) |
| `marketing` | `#marketing` | Маркетинг и лояльность | Маркетолог | [`MarketingView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/MarketingView.tsx) |
| *portal* | *(modal/pwa)* | Портал саморегистрации | Пациент | [`components/portal/selfCheckin/MobileSelfCheckinModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/portal/selfCheckin/MobileSelfCheckinModal.tsx) |

---

## 1. РАСПИСАНИЕ ПРИЁМОВ (`#schedule`)

### Назначение и оператор
Центральный пульт управления потоком пациентов клиники. Оператор: администратор рецепции, координатор смены, врач (для оперативного контроля своего кресла).

### 3-Уровневая декомпозиция
- **🟢 Tier 1 (Hot Path / 0 кликов)**:
  - Доминантная временная сетка расписания по креслам и врачам ([`ScheduleGrid.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/schedule/ScheduleGrid.tsx)).
  - Карточки визитов ([`AppointmentCard.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/schedule/AppointmentCard.tsx)) с лаконичным отображением: ФИО, длительность, цветной статус явки.
  - Быстрый статус кресла (свободно / занято / пациент у кресла) и цветовой маркер экстренных визитов (🔴 острая боль).
- **🟡 Tier 2 (Warm Context / 1 клик / Hover HUD)**:
  - **macOS Hover HUD (150ms)**: Всплывающая карточка поверх слота без сдвига верстки (телефон, подтверждение звонка, задолженность, комментарий, аллергии).
  - **QuickBookingDrawer** ([`QuickBookingDrawer.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/schedule/QuickBookingDrawer.tsx)): Выкатная шторка быстрой записи на 420px. Ввод номера телефона, поиск пациента, выбор услуги за 2 клика.
  - **DayConfirmationsPanel** ([`DayConfirmationsPanel.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/schedule/DayConfirmationsPanel.tsx)): Выкатной список утреннего обзвона и подтверждений через WhatsApp/SMS.
  - **WaitlistDrawer** ([`WaitlistDrawer.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/schedule/WaitlistDrawer.tsx)): Лист ожидания освободившихся окон.
- **🔵 Tier 3 (Cold Backoffice / Кабинетный режим)**:
  - **DoctorCalendarSyncModal** ([`DoctorCalendarSyncModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/schedule/DoctorCalendarSyncModal.tsx)): Настройка синхронизации с внешними календарями Google/Яндекс по iCal/CalDAV.
  - **SlotConflictModal** ([`SlotConflictModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/schedule/SlotConflictModal.tsx)): Разрешение сложных коллизий при одновременном бронировании кресел.
  - **DoctorShiftRosterModal** ([`DoctorShiftRosterModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/schedule/roster/DoctorShiftRosterModal.tsx)): Управление графиком сменности врачей и ассистентов.

### Защита от палок в колёса (Mandate 8e)
- **Запись без ассистента**: Разрешено создание записи без привязки ассистента — поле ассистента строго опционально.
- **Быстрый перенос Drag-and-Drop**: Перенос записи между креслами в 1 движение без обязательного заполнения опросников.
- **Тихая телефония для врача**: На экранах врачей входящие звонки не выводят блокирующих модалок.

---

## 2. ПРИЁМ ВРАЧА И КАРТА 043/у (`#visit`)

### Назначение и оператор
Основное рабочее место врача-стоматолога в кабинете. Максимальная стерильность интерфейса, визуальная тишина, голосовой ввод протокола, фиксация физиологической нормы.

### 3-Уровневая декомпозиция
- **🟢 Tier 1 (Hot Path / 0 кликов)**:
  - Полноэкранный дневник визита ([`VisitView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/VisitView.tsx)) с таймером приёма ([`VisitTimer.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/visit/VisitTimer.tsx)).
  - Вкладка ЭМК и Диктовка ([`VisitEmkTab.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/visit/VisitEmkTab.tsx)): Голосовая диктовка через микрофон ([`SmartMicrophoneButton.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/SmartMicrophoneButton.tsx)), быстрые шаблоны жалоб и статуса.
  - Кнопка «Соматически здоров / Норма» (1 клик заполняет все стандартные поля нормы).
  - Красные флаги противопоказаний и лекарственных аллергий — всегда на виду в верхней панели.
- **🟡 Tier 2 (Warm Context / 1 клик / Аккордеоны)**:
  - **VisitSoapTemplatesModal** ([`VisitSoapTemplatesModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/visit/VisitSoapTemplatesModal.tsx)): Всплывающий выбор клинических шаблонов 043/у по МКБ-10.
  - **AnesthesiaAspirationJournalModal** ([`AnesthesiaAspirationJournalModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/visit/anesthesia/AnesthesiaAspirationJournalModal.tsx)): Калькулятор безопасной дозы анестетика по весу пациента с фиксацией аспирационной пробы.
  - **ClinicalRulePanel** ([`ClinicalRulePanel.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/ClinicalRulePanel.tsx)): Предупреждения движка клинических правил (несовместимость материалов, пропущенные обязательные снимки).
- **🔵 Tier 3 (Cold Backoffice / Кабинетный режим)**:
  - **EgiszRemdSigningModal** ([`EgiszRemdSigningModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/egisz/EgiszRemdSigningModal.tsx)): Формирование медицинского документа CDA R3 и подписание личной УКЭП врача через плагин КриптоПро.
  - **PrescriptionPrintModal** ([`PrescriptionPrintModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/prescriptions/PrescriptionPrintModal.tsx)): Генерация и печать рецептурных бланков 107-1/у и 148-1/у-88 с QR-кодами.

### Защита от палок в колёса (Mandate 8e)
- **Никаких disabled кнопок**: Кнопка «Завершить приём» активна всегда. Недопустимо блокировать завершение визита из-за незаполненной температуры или пульса.
- **Печать в 1 клик**: Карта 043/у печатается в любой момент (незакрытый визит печатается со штампом «ЧЕРНОВИК»).
- **Автосохранение (Debounced Autosave)**: Каждое нажатие клавиши сохраняется в локальном хранилище. Смена вкладки не уничтожает текст протокола.

---

## 3. ЗУБНАЯ ФОРМУЛА И ОДОНТОГРАММА (`#visit -> odontogram`)

### Назначение и оператор
Интерактивная графическая карта челюсти взрослого и ребёнка (FDI 11–48 / 51–85). Оператор: врач-стоматолог, гигиенист, ортодонт, хирург.

### 3-Уровневая декомпозиция
- **🟢 Tier 1 (Hot Path / 0 кликов)**:
  - Доминантная интерактивная векторная формула ([`ToothChart.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/ToothChart.tsx), [`AnatomicalSvgOdontogram.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/AnatomicalSvgOdontogram.tsx)).
  - Компактный тулбар высотой 32–36px ([`OdontogramToolbar.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/OdontogramToolbar.tsx)) с палитрой быстрых состояний: Кариес, Пульпит, Пломба, Коронка, Удален, Имплант.
  - Быстрая смена состояния зуба в 1 клик без модальных окон.
  - Живой расчет стоимости лечения в правом нижнем углу ([`OdontogramLiveInvoice.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/OdontogramLiveInvoice.tsx)).
- **🟡 Tier 2 (Warm Context / 1 клик / Радиальное меню)**:
  - **ToothRadialMenu** ([`ToothRadialMenu.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/ToothRadialMenu.tsx)): Радиальное контекстное меню вокруг зуба с тач-таргетами $\ge 44\times 44\text{px}$ для работы в перчатках.
  - **EndoCanalMeasurementDrawer** ([`EndoCanalMeasurementDrawer.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/EndoCanalMeasurementDrawer.tsx)): Выкатная шторка фиксации длины каналов по апекслокатору (МВ1, МВ2, ДВ, Н) и мастер-файлов.
  - **ToothHistoryChronicle** ([`ToothHistoryChronicle.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/ToothHistoryChronicle.tsx)): Хронологическая лента истории вмешательств по конкретному зубу.
- **🔵 Tier 3 (Cold Backoffice / Кабинетный режим)**:
  - **PeriodontalChartingModal** ([`PeriodontalChartingModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/PeriodontalChartingModal.tsx)): Полноэкранная периодонтограмма (глубина карманов в 6 точках, кровоточивость BOP, подвижность, рецессия).
  - **PediatricMixedDentitionModal** ([`PediatricMixedDentitionModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/PediatricMixedDentitionModal.tsx)): Кабинет смешанного прикуса (молочные зубы, резорбция корней, кариограмма).
  - **EndoCanalLogModal** ([`EndoCanalLogModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/EndoCanalLogModal.tsx)): Полный протокол эндодонтического лечения с рентген-контролем обтурации.

### Защита от палок в колёса (Mandate 8e)
- **Анатомическая точность**: Пульпа физиологически красная (`#ef4444`), каналы резцов и клыков непрерывны до верхушки апекса.
- **Запрет на перезапись роботом**: ИИ-визиограф предлагает находки в виде чек-листа, но не перезаписывает статус зуба без явного подтверждения врача.

---

## 4. ПЛАНЫ ЛЕЧЕНИЯ И СМЕТЫ (`TreatmentPlanModule`)

### Назначение и оператор
Формирование комплексных планов лечения, сравнение альтернатив (Эконом / Оптимум / Премиум), презентация пациенту у кресла и подписание.

### 3-Уровневая декомпозиция
- **🟢 Tier 1 (Hot Path / 0 кликов)**:
  - Модуль планов лечения ([`TreatmentPlanModule.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/treatment-plans/TreatmentPlanModule.tsx)).
  - Поэтапная дорожная карта визитов ([`TreatmentPlanPhased4StageView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/treatment-plans/TreatmentPlanPhased4StageView.tsx)).
  - Итоговая сумма по этапам с расчетом 13% налогового вычета НДФЛ на лету.
- **🟡 Tier 2 (Warm Context / 1 клик / Сегментный контроль)**:
  - **3-Tier Comparison** ([`TreatmentPlan3TierComparison.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/treatment-plans/TreatmentPlan3TierComparison.tsx)): Нативный Segmented Control `[ Базовый | ★ Оптимальный | Премиум ]` вместо 2500px скролла на мобильных устройствах и планшетах.
  - **ClinicalBundlesPanel** ([`ClinicalBundlesPanel.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/treatment-plans/ClinicalBundlesPanel.tsx)): Пакетное добавление услуг по клиническим протоколам (например, «Имплантация под ключ»).
  - **CuratorPlanAssignmentModal** ([`CuratorPlanAssignmentModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/treatment-plans/CuratorPlanAssignmentModal.tsx)): Назначение ответственного куратора плана.
- **🔵 Tier 3 (Cold Backoffice / Кабинетный режим)**:
  - **TreatmentPlanPresenterModal** ([`TreatmentPlanPresenterModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/treatment-plans/TreatmentPlanPresenterModal.tsx)): Режим презентации плана на отдельном мониторе пациента (чистый вид без служебных себестоимостей и микро-расходников).
  - **TreatmentPlanSignatureModal** ([`TreatmentPlanSignatureModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/treatment-plans/TreatmentPlanSignatureModal.tsx)): Графическое подписание плана стилусом или на планшете с генерацией юридического договора.
  - **StagePaymentPlanModal** ([`StagePaymentPlanModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/treatment-plans/stagePayment/StagePaymentPlanModal.tsx)): График траншевых платежей и внутренней беспроцентной рассрочки клиники.

### Защита от палок в колёса (Mandate 8e)
- **План старше 30 дней не блокирует лечение**: Истечение срока действия предварительной сметы не запрещает оказание услуг или создание нарядов зуботехнической лаборатории.
- **Скрытие микро-расходников**: Пациенту не показываются салфетки, валики и перчатки — в смете отображаются только понятные законченные клинические этапы.

---

## 5. КАРТОТЕКА ПАЦИЕНТОВ (`#patients`)

### Назначение и оператор
Управление базой пациентов, электронными медицинскими картами, семейными связями и историей посещений.

### 3-Уровневая декомпозиция
- **🟢 Tier 1 (Hot Path / 0 кликов)**:
  - Быстрый реестр пациентов ([`PatientsView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/PatientsView.tsx)) с поиском по ФИО, телефону и номеру карты.
  - Вкладка обзора пациента ([`PatientOverviewTab.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patients/PatientOverviewTab.tsx)): ключевая информация, баланс, алерты, статус куратора.
  - Цветовой бейдж риска неявки ([`PatientNoShowRisk.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patients/PatientNoShowRisk.tsx)).
- **🟡 Tier 2 (Warm Context / 1 клик / Виджеты)**:
  - **PatientFamilyCard** ([`PatientFamilyCard.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patients/PatientFamilyCard.tsx)): Просмотр членов семьи и распределение средств семейного кошелька.
  - **PatientCommunicationTimelineWidget** ([`PatientCommunicationTimelineWidget.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patients/PatientCommunicationTimelineWidget.tsx)): Единая хронологическая лента звонков, SMS, сообщений WhatsApp и посещений.
  - **PatientWhatsappSendPanel** ([`PatientWhatsappSendPanel.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patients/PatientWhatsappSendPanel.tsx)): Быстрая отправка напоминания или плана в мессенджер в 1 клик.
- **🔵 Tier 3 (Cold Backoffice / Кабинетный режим)**:
  - **PatientCreationModal** ([`PatientCreationModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patients/PatientCreationModal.tsx)): Форма первичной регистрации с автопроверкой дубликатов по номеру телефона и СНИЛС.
  - **PatientBranchTransferModal** ([`PatientBranchTransferModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patients/transfer/PatientBranchTransferModal.tsx)): Перевод карты пациента между филиалами сети с миграцией истории и баланса.

### Защита от палок в колёса (Mandate 8e)
- **Создание пациента без бюрократии**: Достаточно ввести ФИО и телефон — паспортные данные и СНИЛС могут быть дополнены позже при подписании договора.
- **Печать договора до приёма**: Регистратор может распечатать бланк с пустыми строками для подписи без 403-ошибок.

---

## 6. КАССА 54-ФЗ И ФИНАНСЫ (`#finance`)

### Назначение и оператор
Приём платежей, фискализация чеков по 54-ФЗ (ФФД 1.2), эквайринг, закрытие смен (Z-отчёт), расчёт заработной платы врачей.

### 3-Уровневая декомпозиция
- **🟢 Tier 1 (Hot Path / 0 кликов)**:
  - Общий финансовый дашборд ([`FinanceView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/FinanceView.tsx)).
  - Виджет статуса кассовой смены ([`CashShiftWidget.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/CashShiftWidget.tsx)): выручка за день, баланс наличности, статус фискального накопителя.
  - Мгновенная кнопка «Оплатить приём» с автоматическим переносом суммы из закрытого визита.
- **🟡 Tier 2 (Warm Context / 1 клик / Кассовые шторки)**:
  - **FastCheckoutModal** ([`FastCheckoutModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/payments/checkout/FastCheckoutModal.tsx)): Быстрый расчет пациента в 1 клик (комбинированная оплата: нал + карта + аванс).
  - **FamilyWalletModal** ([`FamilyWalletModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/FamilyWalletModal.tsx)): Списание с семейного баланса с защитой от двойного списания (Idempotency Key).
  - **SberPosTerminalModal** ([`SberPosTerminalModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/SberPosTerminalModal.tsx)): Интеграция с банковским терминалом Сбербанк (протокол TTK).
- **🔵 Tier 3 (Cold Backoffice / Кабинетный режим)**:
  - **FiscalReceipt54FzModal** ([`FiscalReceipt54FzModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/FiscalReceipt54FzModal.tsx)): Ручное управление чеками, коррекция, возврат прихода, отправка электронного чека в ОФД по SMS/Email.
  - **ShiftCloseZReportModal** ([`ShiftCloseZReportModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/fiscal/ShiftCloseZReportModal.tsx)): Закрытие кассовой смены с печатью Z-отчёта и сверкой итогов эквайринга.
  - **TaxDeductionCertificateModal** ([`TaxDeductionCertificateModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/TaxDeductionCertificateModal.tsx)): Формирование официальной справки об оплате медицинских услуг для налогового вычета (форма ФНС КНД 1151156, код услуги 1 или 2).
  - **DoctorPayrollModal** ([`DoctorPayrollModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/payroll/DoctorPayrollModal.tsx)): Расчёт сдельной зарплаты врачей за вычетом себестоимости материалов и лаборатории (форма Т-51 / Т-13).
  - **Billing1CExportModal** ([`Billing1CExportModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/Billing1CExportModal.tsx)): Выгрузка проводок в 1С:Бухгалтерия через стандарт CommerceML 2.09.

### Защита от палок в колёса (Mandate 8e)
- **Запрет требования ИНН с физлиц**: По закону 54-ФЗ ИНН обязателен только юрлицам. Касса никогда не требует ИНН у обычных пациентов.
- **Комбинированная оплата в 1 клик**: Касса свободно делит сумму чека на части (нал, карта, бонусы, аванс) без ошибок округления.

---

## 7. СКЛАД И НОМЕНКЛАТУРА МАТЕРИАЛОВ (`#inventory`)

### Назначение и оператор
Учёт медикаментов, имплантов, расходных материалов, техкарты (BOM) процедур, маркировка Честный Знак (МДЛП). Операторы: старшая медсестра, ассистенты, завхоз.

### 3-Уровневая декомпозиция
- **🟢 Tier 1 (Hot Path / 0 кликов)**:
  - Складской дашборд ([`InventoryView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/InventoryView.tsx)).
  - Таблица остатков по кабинетам с цветовой индикацией критического минимума (🔴 кончается).
  - Быстрое списание расходников по штрихкоду сканером.
- **🟡 Tier 2 (Warm Context / 1 клик / Складские шторки)**:
  - **ProcedureMaterialDeductionModal** ([`ProcedureMaterialDeductionModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/inventory/ProcedureMaterialDeductionModal.tsx)): Автоматическое списание материалов по техкарте выполненной услуги с возможностью ручной корректировки медсестрой.
  - **NurseCarpuleDisposalModal** ([`NurseCarpuleDisposalModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/warehouse/NurseCarpuleDisposalModal.tsx)): Экспресс-списание пустых карпул анестетиков в 1 клик.
- **🔵 Tier 3 (Cold Backoffice / Кабинетный режим)**:
  - **WarehouseInventoryAuditModal** ([`WarehouseInventoryAuditModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/inventory/WarehouseInventoryAuditModal.tsx)): Проведение инвентаризации с фиксацией излишков и недостач.
  - **MaterialBomsSettingsPanel** ([`MaterialBomsSettingsPanel.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/inventory/MaterialBomsSettingsPanel.tsx)): Конструктор технологических карт (Bill of Materials) на стоматологические услуги.

### Защита от палок в колёса (Mandate 8e)
- **Списание карпул в 1 клик**: Никаких комиссий из 3 человек для списания использованной анестезии.
- **Мягкий овердрафт**: Задержка проведения приходной накладной не блокирует операцию — система выдаёт мягкое предупреждение и фиксирует временный минус в партии.

---

## 8. СТЕРИЛИЗАЦИЯ И САНПИН (`#inventory -> sterilization`)

### Назначение и оператор
Журнал работы автоклавов (форма 257/у), контроль азопирамовых и фенолфталеиновых проб, маркировка крафт-пакетов штрихкодами. Оператор: медсестра ЦСО.

### 3-Уровневая декомпозиция
- **🟢 Tier 1 (Hot Path / 0 кликов)**:
  - Быстрый сканер крафт-пакетов ([`KraftPackageQuickScanner.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/sterilization/KraftPackageQuickScanner.tsx)) у кресла врача: валидация срока годности стерильности за 0.1s.
- **🟡 Tier 2 (Warm Context / 1 клик / Карточка цикла)**:
  - **AutoclaveCycleModal** ([`AutoclaveCycleModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/sanpin/autoclave/AutoclaveCycleModal.tsx)): Запуск цикла автоклавирования с выбором режима ($134^\circ\text{C}$ / $121^\circ\text{C}$) и фиксацией химических индикаторов.
- **🔵 Tier 3 (Cold Backoffice / Кабинетный режим)**:
  - **SterilizationStudioModal** ([`SterilizationStudioModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/sterilization/SterilizationStudioModal.tsx), [`SterilizationJournalModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/sterilization/SterilizationJournalModal.tsx)): Электронный журнал СанПиН 3.3686-21 с экспортом для Роспотребнадзора.
  - **KraftBarcodeLabelSheet** ([`KraftBarcodeLabelSheet.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/sanpin/autoclave/KraftBarcodeLabelSheet.tsx)): Пакетная печать самоклеящихся этикеток со штрихкодом для термопринтера.

---

## 9. РЕНТГЕН, ВИЗИОГРАФ И КЛКТ 3D MPR (`#imaging`)

### Назначение и оператор
Просмотр прицельных снимков RVG, панорамных ОПТГ и объемных трехмерных томографий КЛКТ (DICOM). Оператор: врач-стоматолог, рентгенолаборант, хирург-имплантолог.

### 3-Уровневая декомпозиция
- **🟢 Tier 1 (Hot Path / 0 кликов)**:
  - Быстрая галерея снимков пациента ([`ImagingView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/ImagingView.tsx), [`RadiologyStudyList.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/RadiologyStudyList.tsx)).
  - Дропзона медицинских DICOM-файлов ([`MedicalRadiologyDropzone.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/MedicalRadiologyDropzone.tsx)).
  - Панель фильтров RVG ([`RvgFiltersToolbar.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/RvgFiltersToolbar.tsx)): инверсия, резкость, контрастность, зум.
- **🟡 Tier 2 (Warm Context / 1 клик / Экспресс-окна)**:
  - **DirectRvgCaptureModal** ([`DirectRvgCaptureModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/DirectRvgCaptureModal.tsx)): Прямой захват кадра с USB-визиографа (TWAIN/DirectShow) за $< 50\text{ms}$.
  - **HotFolderIntakeModal** ([`HotFolderIntakeModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/HotFolderIntakeModal.tsx)): Автоматический захват входящих снимков из сетевой папки томографа.
- **🔵 Tier 3 (Cold Backoffice / Специализированная 3D Студия)**:
  - **CbctMprImplantStudioModal** ([`CbctMprImplantStudioModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/CbctMprImplantStudioModal.tsx)): Полноэкранная станция мультипланарной реконструкции (аксиальный, сагиттальный, корональный срезы, панорамный реформат, трассировка нижнечелюстного нерва, измерение плотности кости в единицах Хаунсфилда по Мишу).
  - **ImplantCrossSectionPlanner** ([`ImplantCrossSectionPlanner.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/ImplantCrossSectionPlanner.tsx)): Виртуальное позиционирование имплантатов с проверкой зон безопасности (2мм до канала нерва).

### Защита от палок в колёса (Mandate 8e)
- **Снимок визиографа открывается мгновенно (<50ms)**: Никаких задержек и подвисаний. ИИ-анализ запускается строго по отдельной кнопке по желанию врача.
- **Запрет слепящих рамок в Dark Mode**: В тёмной теме интерфейс выполнен в глубоком тоне `slate-950` без ярких белых элементов, слепящих глаза врача в затемнённом кабинете.

---

## 10. ДОКУМЕНТООБОРОТ И ЕГИСЗ (`#documents`)

### Назначение и оператор
Формирование медицинских карт, информированных согласий (ИДС), договоров, актов выполненных работ и отправка в РЭМД ЕГИСЗ.

### 3-Уровневая декомпозиция
- **🟢 Tier 1 (Hot Path / 0 кликов)**:
  - Реестр документов пациента ([`DocumentsView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/DocumentsView.tsx)) со статусами подписания (Черновик / Подписан / Отправлен в ЕГИСЗ).
  - 1-клик печать бланка.
- **🟡 Tier 2 (Warm Context / 1 клик / Подписание)**:
  - Печать договора с нулевой суммой ([`TreatmentPlanContractPrint.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/treatment-plans/TreatmentPlanContractPrint.tsx)).
  - Акт выполненных работ по номенклатуре 804н ([`TreatmentPlanCompletedActPrint.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/treatment-plans/TreatmentPlanCompletedActPrint.tsx)).
- **🔵 Tier 3 (Cold Backoffice / Кабинетный режим)**:
  - **EgiszCdaExportModal** ([`EgiszCdaExportModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/egisz/EgiszCdaExportModal.tsx)): Генерация валидного XML CDA R3 с валидацией схем Минздрава РФ.
  - **AuditTrailHubModal** ([`AuditTrailHubModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/security/AuditTrailHubModal.tsx)): Журнал криптографического аудита действий персонала (неизменяемый лог).

---

## 11. НАСТРОЙКИ И СПРАВОЧНИКИ КЛИНИКИ (`#settings`)

### Назначение и оператор
Конфигурация прейскуранта, персонала, матрицы прав доступа (RBAC), интеграций с АТС, мессенджерами и фискальными регистраторами. Оператор: администратор клиники, владелец.

### 3-Уровневая декомпозиция
- **🟢 Tier 1 (Hot Path / 0 кликов)**:
  - Навигация по вкладкам настроек ([`SettingsView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/SettingsView.tsx)): Клиника, Персонал, Прайс-лист, Доступ, Правила, Мессенджеры, Телефония, Импорт.
- **🟡 Tier 2 (Warm Context / 1 клик / Модальные панели)**:
  - **StaffProfileCard** ([`StaffProfileCard.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/StaffProfileCard.tsx)): Настройка карточки сотрудника, процента комиссии и расписания.
  - **ServicePricelistManagerModal** ([`ServicePricelistManagerModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/catalog/pricelist/ServicePricelistManagerModal.tsx)): Редактирование позиций номенклатуры 804н.
- **🔵 Tier 3 (Cold Backoffice / Кабинетный режим)**:
  - **AccessMatrixModal** ([`AccessMatrixModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/AccessMatrixModal.tsx), [`GranularRoleMatrixView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/GranularRoleMatrixView.tsx)): 68 гранулярных прав доступа по ролям.
  - **MigrationWizard** ([`MigrationWizard.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/MigrationWizard.tsx)): Мастер импорта данных из IDENT, DentalPRO, iStom и 1С.
  - **OfflineBackupVaultPanel** ([`OfflineBackupVaultPanel.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/OfflineBackupVaultPanel.tsx)): Управление локальными зашифрованными бэкапами базы данных.

---

## 12. ПОРТАЛ САМОРЕГИСТРАЦИИ И ВЕБ-КАБИНЕТ ПАЦИЕНТА

### Назначение и оператор
Интерфейс саморегистрации пациента на планшете в холле клиники и мобильный PWA-кабинет пациента. Оператор: пациент клиники.

### 3-Уровневая декомпозиция
- **🟢 Tier 1 (Hot Path / 0 кликов)**:
  - Планшетная стойка саморегистрации ([`MobileSelfCheckinModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/portal/selfCheckin/MobileSelfCheckinModal.tsx)): Ввод номера телефона, получение OTP-кода, подтверждение прибытия в клинику.
  - Соматическая анкета здоровья ([`SomaticQuestionnaireEngine.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/portal/selfCheckin/SomaticQuestionnaireEngine.ts)) с вопросами о противопоказаниях.
- **🟡 Tier 2 (Warm Context / 1 клик / Графическая подпись)**:
  - **SignaturePadCanvas** ([`SignaturePadCanvas.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/portal/selfCheckin/SignaturePadCanvas.tsx)): Подписание согласия на обработку персональных данных стилусом или пальцем на экране.
  - **UpcomingVisitCard** ([`UpcomingVisitCard.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/portal/UpcomingVisitCard.tsx)): Карточка предстоящего визита с адресом и схемой проезда.
- **🔵 Tier 3 (Cold Backoffice / Кабинет пациента)**:
  - **PatientMobilePortalModal** ([`PatientMobilePortalModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/portal/PatientMobilePortalModal.tsx), [`PatientOnlineBookingModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/portal/PatientOnlineBookingModal.tsx)): Просмотр зубной формулы, электронных чеков 54-ФЗ и заказ справки на налоговый вычет 13% в 1 клик.

---

## 13. ОМНИКАНАЛЬНЫЕ КОММУНИКАЦИИ И ЛИДЫ (`#communications`, `#leads`, `#marketing`)

### Назначение и оператор
Единый центр диалогов с пациентами через WhatsApp Cloud API, Telegram Bot, телефонию (UIS/Mango/Zadarma) и воронка первичных обращений.

### Компоненты и шторки
- **LeadsKanbanView** ([`LeadsKanbanView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/leads/LeadsKanbanView.tsx)): Канбан-доска лидов (Новый -> Квалифицирован -> Записан на консультацию -> Дошел -> План подписан).
- **PatientOmnichannelHubModal** ([`PatientOmnichannelHubModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/messaging/PatientOmnichannelHubModal.tsx)): Диалоговое окно чата с пациентом с отправкой документов и смет.
- **SbpPaymentQrModal** ([`SbpPaymentQrModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/messaging/SbpPaymentQrModal.tsx)): Генерация платежной ссылки СБП и отправка QR-кода в чат WhatsApp.

---

## 14. АНАЛИТИКА И ОТЧЁТЫ УПРАВЛЯЮЩЕГО (`#analytics`)

### Назначение и оператор
Управленческий учёт, загрузка кресел, конверсия первичных консультаций, средний чек и P&L клиники. Оператор: главврач, управляющий, инвестор.

### Компоненты
- **AnalyticsDashboardView** ([`pages/AnalyticsDashboardView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/pages/AnalyticsDashboardView.tsx)): Главный дашборд KPI.
- **ManagerReportsPanel** ([`components/reports/ManagerReportsPanel.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/reports/ManagerReportsPanel.tsx)): Отчёты по выручке, маржинальности услуг и выработке врачей.
- **ClinicalPnlHubModal** ([`ClinicalPnlHubModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/pnl/ClinicalPnlHubModal.tsx)): Финансовый отчёт о прибылях и убытках (P&L) с детальным учётом себестоимости.

---

## 📋 СВОДНАЯ МАТРИЦА АРХИТЕКТУРНЫХ ЗАЩИТ (SUMMARY AUDIT TABLE)

| Экран | Tier 1 (Hot Path) | Tier 2 (Warm Context) | Tier 3 (Cold Backoffice) | Мандат 8e защита |
|---|---|---|---|---|
| **Расписание** | Сетка дня, статус кресел, явки | Hover HUD 150ms, QuickBooking | Синхронизация iCal, смена смен | Запись без ассистента, DnD перенос |
| **Визит / ЭМК** | Дневник 043/у, голос, 1-клик норма | Шаблоны SOAP, дозы анестетика | ЕГИСЗ РЭМД УКЭП, рецепты | Запрет disabled кнопок, autosave |
| **Зубная формула** | Анатомический вектор FDI 11-48 | Радиальное меню, шторка каналов | Периодонтограмма, КТ-проекция | Запрет перезаписи роботом, цвет пульпы |
| **Планы лечения** | Дорожная карта, сумма в рублях | 3-Tier сравнение (Сегментный контрол)| Презентатор монитора, транши | Скрытие микро-расходников, >30 дней |
| **Касса 54-ФЗ** | Статус смены, кнопка оплаты | СБП QR, терминал Сбербанк, кошелек | Z-отчёт, Т-51 зарплата, справка ФНС | Без ИНН для физлиц, комби-оплата |
| **Склад / СанПиН** | Остатки, штрихкод-сканер | Экспресс-списание карпул анестетика | Инвентаризация, журнал автоклава | Списание в 1 клик, мягкий овердрафт |
| **Рентген / КЛКТ** | RVG галерея, быстрые фильтры | Прямой захват с датчика <50ms | 3D MPR студия, нерв, импланты | Быстрое открытие, мягкий Dark Mode |

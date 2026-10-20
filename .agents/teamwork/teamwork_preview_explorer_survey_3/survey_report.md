# АРХИТЕКТУРНЫЙ И RED TEAM АУДИТ R3 И R5
## Ликвидация хардкодных фолбеков, синтетических данных и переход на сквозные E2E-пруфы в реальном UI DENTE CRM

**Дата**: 2026-10-20  
**Субагент**: Survey Explorer 3 (Production Hardcoded Fallbacks, Dummy Data & Real E2E Visual Proofs)  
**Рабочая директория**: `.agents/teamwork/teamwork_preview_explorer_survey_3/`  
**Статус**: Hard Read-Only Investigation Complete (Презумпция дефекта 100%, ноль домыслов)  
**Нормативные основания**: Мандаты 8e (Автономия врача), 8f (T.A.R.S. 100% честность), 8n (Суверенитет соло-врача), 8wy (Боевой прод vs Демо-витрина), 8ze/8al (Apple HIG, 4-State Visual Proof, 7 смертных грехов UI).

---

## 1. РЕЗЮМЕ АУДИТА (EXECUTIVE SUMMARY)

По результатам инструментального исследования монорепозитория (`apps/web/src`, `apps/api/src`, `scripts/`) выявлено два системных класса дефектов («Потёмкинских деревень»):

1. **Дефекты Требования R3 (Silent Dummy Fallbacks & Fake Data)**:
   - В боевых компонентах интерфейса обнаружены «тихие» заглушки, которые при отсутствии данных в контексте подставляют вымышленные ФИО («Д-р Воронов Алексей Владимирович», «Иванов Иван Иванович»), фиктивные реквизиты клиники (ИНН `7701234567`, ОГРН `1027700000000`, адрес «г. Москва, ул. Арбат, д. 24», лицензия «ЛО-77-01-020000 от 12.04.2021»), синтетические балансы и суммы (15 000 ₽, 61 500 ₽), а также принудительный дефолтный зуб `[21]` и диагноз `К02.1 Кариес дентина`.
   - В глобальном поиске в шапке (`HeaderGlobalSearch.tsx`) вместо запроса к боевой базе данных пациентов захардкожен массив `SAMPLE_PATIENTS` («Иванов», «Смирнова», «Кузнецов»).
   - В `SpecializedAdministrativeLaunchers.tsx` и `SpecializedClinicalLaunchers.tsx` заложены десятки query-параметров (`?sbp=1`, `?receipt=1`, `?family_billing=1`, `?recalls=1`), отображающих изолированные модальные окна с синтетическими суммами 15 400 ₽ и 18 500 ₽ в обход живого дерева приложения.

2. **Дефекты Требования R5 (Sandbox Screenshots & Mock Interceptions)**:
   - Обнаружено свыше 15 скриптов в каталоге `scripts/`, которые для снятия скриншотов обращаются к изолированным песочницам:
     - Несуществующим или изолированным HTML-файлам: `/cashbox_checkout_preview.html`, `/lab_orders_preview.html`, `/consent_signing_preview.html`, `/cashier_payroll_preview.html`.
     - Standalone-параметрам URL: `/?standalone=clinical-modals-studio`, `/?stand=odontogram-gate1`, `/?cbct=demo`, `/?anesthesia=1`.
     - Перехвату и тотальной подмене API через `page.route("**/api/**")` (как в `audit_legal_docs_layout.cjs`), полностью блокирующему реальный PostgreSQL 18 и Fastify-бэкенд.
   - Ни один из этих скриптов не проходит честную аутентификацию через корневой вход `http://127.0.0.1:5173/` и не проверяет сквозной путь пользователя по меню, реестрам и карточкам пациентов.

---

## 2. ТРЕБОВАНИЕ R3: ПОЛНЫЙ КАТАЛОГ ХАРДКОДНЫХ ФОЛБЕКОВ И СИНТЕТИЧЕСКИХ ДАННЫХ

### 2.1. `apps/web/src/pages/coordinator/TreatmentPipeline.tsx`

* **Строки 380–395**:
  ```typescript
  380: onClose={() => setSelectedCardForPresenter(null)}
  381: patientName={selectedCardForPresenter.patientName}
  382: patientId={selectedCardForPresenter.patientId}
  383: patientPhone={selectedCardForPresenter.patientPhone || ""}
  384: doctorFullName={
  385:     selectedCardForPresenter.doctorName ||
  386:     appLogic?.dashboard?.activeDoctor?.fullName ||
  387:     appLogic?.auth?.currentUser?.name ||
  388:     "Лечащий врач"
  389: }
  390: doctorSpecialty={appLogic?.dashboard?.activeDoctor?.specialty || ""}
  391: clinicName={branding.clinicName || "Стоматологическая клиника"}
  392: clinicLegalName={branding.clinicLegalName || ""}
  393: clinicInn={branding.clinicInn || "—"}
  394: clinicOgrn={branding.clinicOgrn || "—"}
  395: clinicAddress={branding.clinicAddress || "—"}
  ```
* **Сопряженный компонент**: `apps/web/src/components/appLayout/modalsContainerModules/standalone/LiveTreatmentPlanPresenterLauncher.tsx` (строки 183–187):
  ```typescript
  clinicName="DENTE Стоматология"
  clinicLegalName="ООО «ДЕНТЕ КЛИНИК»"
  clinicInn="7701234567"
  clinicOgrn="1237700123456"
  clinicAddress="г. Москва, ул. Арбат, д. 24"
  ```
* **Клинический и юридический дефект**: При отсутствии реквизитов клиники печатаются дефолты или прочерки, а в презентере лаунчера выводятся реквизиты фиктивной московской клиники на Арбате. Врач при отсутствии привязки отображается как безликий «Лечащий врач».
* **Честное поведение (Honest Behavior)**:
  1. Реквизиты клиники должны передаваться строго из активного профиля организации (`dashboard.organization` / `useClinicBranding()`).
  2. Если реквизиты клиники (ИНН, ОГРН, адрес) не заполнены в настройках: в презентере плана лечения и печатных формах выводится явное предупреждение `⚠️ Реквизиты клиники не заполнены в профиле организации (Настройки -> Клиника)`.
  3. Если у плана лечения не назначен врач: поле врача остается пустым с бейджем «Врач не назначен» и возможностью выбрать врача из выпадающего списка `staffMembers`.

---

### 2.2. `apps/web/src/pages/DoctorPayoutDashboard.tsx` и модуль выплат `apps/web/src/components/payroll/`

* **`DoctorPayoutDashboard.tsx` (строки 70–93)**:
  ```typescript
  70: const handleOpenPayroll = (e: Event) => {
  71:     const customEvent = e as CustomEvent;
  72:     const passedDoctor = customEvent.detail?.doctor;
  73:     const passedDoctorId = customEvent.detail?.doctorId;
  ...
  89:     // Если доктор не передан — честный EmptyState без синтетических цифр
  90:     setPayrollModalDoctor(null);
  91:     setShowDoctorSelectionNotice(true);
  92: };
  ```
* **`DoctorPayrollModal.tsx` (строка 35)**:
  ```typescript
  35: clinicName = "ООО «Денте Стоматология»",
  ```
* **`doctorPresets.ts` (`apps/web/src/components/payroll/engine/doctorPresets.ts`, строки 82–86)**:
  ```typescript
  82: export const DEFAULT_SOLO_DOCTOR = {
  83:     id: "solo-doctor",
  84:     name: "Лечащий врач (соло-практика)",
  85:     specialtyId: "general_dentist",
  86: } as const;
  ```
* **`PayrollStandaloneLauncher.tsx` (строки 24–105)**:
  - Содержит хардкод `demoServices` с 4 позициями (2 500 ₽, 8 500 ₽, 22 000 ₽, 45 000 ₽) и синтетическим доктором «Д-р Воронов Алексей Владимирович», для которого вычисляется зарплата в 61 500 ₽ из ниоткуда.
* **Клинический и экономический дефект**: Имя клиники по умолчанию захардкожено как `"ООО «Денте Стоматология»"`. В standalone лаунчере фабрикуются фиктивные выполненные услуги и выплата в 61 500 ₽.
* **Честное поведение (Honest Behavior)**:
  1. `clinicName` обязан наследоваться из контекста организации. Запрещено дефолтное значение `"ООО «Денте Стоматология»"`. При отсутствии — строка пуста или берется `dashboard.clinicName`.
  2. Если врач не выбран — модальное окно не открывается либо отображает `EmptyState` («Выберите врача для формирования расчетного листа»).
  3. Все расчеты зарплаты должны производиться строго на основе закрытых заказ-нарядов и оказанных услуг из PostgreSQL (`/api/payroll/calculate` или расчет по реальному журналу смен). При отсутствии услуг за выбранный период сумма начислений честно составляет `0,00 ₽`.

---

### 2.3. Модули быстрой печати: `fastPrintDiaryBuilder.ts` и `fastPrintConsentAndMemoBuilder.ts`

* **`fastPrintDiaryBuilder.ts` (`apps/web/src/components/visit/view/fastPrintModules/fastPrintDiaryBuilder.ts`, строки 76–92)**:
  ```typescript
  76: export function extractClinicRequisites(dashboard: any) {
  77:     const clinicName = dashboard?.organization?.name || dashboard?.organizationName || "Стоматологическая клиника DENTE";
  78:     const clinicAddress = dashboard?.organization?.address || "г. Москва, Клинический проезд, д. 4";
  79:     const clinicPhone = dashboard?.organization?.phone || "+7 (495) 000-00-00";
  80:     const clinicOgrn = dashboard?.organization?.ogrn || "1027700000000";
  81:     const clinicInn = dashboard?.organization?.inn || "7701000000";
  82:     const license = dashboard?.organization?.licenseNumber || "ЛО-77-01-020000 от 12.04.2021";
  ...
  ```
* **`fastPrintConsentAndMemoBuilder.ts` (строки 214–222 — Акт выполненных работ)**:
  ```typescript
  214: const patientName = activePatient?.fullName || "Пациент";
  215: const cardNumber = activePatient?.cardNumber || activePatient?.medicalCardNumber || activePatient?.id || "001";
  216: const doctorName = activeDoctor?.fullName || "Лечащий врач";
  ...
  219: const items = activePlan?.items || [
  220:     { name: "Приём (осмотр, консультация) врача-стоматолога", code: "B01.065.001", quantity: 1, priceRub: 1500, totalRub: 1500 },
  221:     { name: "Наложение пломбы светового отверждения", code: "A16.07.002.011", quantity: 1, priceRub: 4500, totalRub: 4500 },
  222: ];
  ```
* **`fastPrintConsentAndMemoBuilder.ts` (строки 325–329 — Смета плана лечения)**:
  ```typescript
  325: const items = activePlan?.items || [
  326:     { name: "Профессиональная гигиена полости рта", tooth: "11-48", priceRub: 5500, quantity: 1 },
  327:     { name: "Лечение кариеса с пломбированием световым композитом", tooth: "1.6", priceRub: 4800, quantity: 1 },
  328:     { name: "Эндодонтическое лечение корневых каналов", tooth: "2.5", priceRub: 12500, quantity: 1 },
  329: ];
  ```
* **Клинический и юридический дефект**:
  - Прямой подлог юридических реквизитов клиники: генерация фиктивного ИНН `7701000000`, ОГРН `1027700000000`, лицензии и адреса на бланках, отдаваемых пациентам на подпись.
  - При отсутствии услуг в плане лечения в акт выполненных работ подставляются вымышленные услуги на 1 500 ₽ и 4 500 ₽ (итого 6 000 ₽), а в смету — на 5 500 ₽, 4 800 ₽ и 12 500 ₽ (итого 22 800 ₽).
* **Честное поведение (Honest Behavior)**:
  1. Если реквизиты клиники не заполнены: функция `extractClinicRequisites` возвращает пустые строки `""` или `"Не указано"`. На печатном листе формируется предупреждающий блок: *«Внимание: в профиле клиники не заполнены ИНН/ОГРН/Лицензия»*.
  2. Если `activePatient` отсутствует: печать блокируется с явным сообщением пользователю (throw new Error / Toast).
  3. Если в плане лечения или акте нет услуг: массив `items` должен быть пустым (`[]`). В таблице выводится строка *«Услуги не выбраны. Добавьте позиции из прейскуранта»*, а итоговая сумма равна `0,00 ₽`. Запрещено генерировать синтетические медицинские услуги.

---

### 2.4. `apps/web/src/components/treatment-plans/validation/TreatmentPlanPriceValidatorModal.tsx`

* **Строка 261**:
  ```typescript
  256: const labTeeth = useMemo(() => {
  257:     const payloadItems = Array.isArray(planPayload?.items) ? planPayload.items : [];
  258:     const teeth = payloadItems
  259:         .map((i) => i.toothNumber)
  260:         .filter((t): t is number => typeof t === "number" && t > 0);
  261:     return teeth.length > 0 ? Array.from(new Set(teeth)) : [21];
  262: }, [planPayload]);
  ```
* **Строки 356–364**:
  ```typescript
  356: patientId={planPayload?.patientId || undefined}
  357: patientName={planPayload?.patientName || "Пациент"}
  358: patientChartNumber={
  359:     planPayload?.planNumber ||
  360:     (planPayload?.patientId ? `К-${planPayload.patientId.slice(0, 5)}` : undefined)
  361: }
  362: doctorId={planPayload?.doctorId || undefined}
  363: doctorName={planPayload?.doctorFullName || undefined}
  364: initialTeeth={labTeeth}
  ```
* **Клинический дефект**: При переходе к созданию заказ-наряда в зуботехническую лабораторию (ЗТЛ), если в позициях плана лечения не был указан номер зуба, система автоматически принудительно назначает зуб **21** (верхний левый центральный резец)! Это приводит к критической ошибке: техник получает наряд на изготовление коронки или вкладки на интактный центральный резец пациента.
* **Честное поведение (Honest Behavior)**:
  1. Если в плане лечения нет номеров зубов, `labTeeth` обязан быть пустым массивом `[]`.
  2. В модальном окне `LabWorkOrderModal` при пустом `initialTeeth` интерфейс должен интерактивно предлагать врачу: *«Выберите зуб на зубной формуле для отправки в лабораторию»*, не подставляя никаких дефолтных зубов.
  3. Поле `patientName` при отсутствии должно вызывать блокировку перехода к наряду ЗТЛ.

---

### 2.5. `apps/web/src/components/mobile/MobileChairsideEHR.tsx`

* **Строки 87–90**:
  ```typescript
  86: const [objectiveExam, setObjectiveExam] = useState<string>("");
  87: const [diagnosis, setDiagnosis] = useState<string>("К02.1 Кариес дентина");
  88: const [treatmentPlan, setTreatmentPlan] = useState<string>(
  89:     "Препарирование, медикаментозная обработка, пломбирование светоотверждаемым композитом"
  90: );
  ```
* **Клинический дефект**: Любой открытый на смартфоне приём пациента инициализируется с предопределенным диагнозом «К02.1 Кариес дентина» и планом лечения «Препарирование, медикаментозная обработка...». Если пациент пришел на профессиональную гигиену, удаление зуба или консультацию ортодонта, а врач случайно нажал «Фискализировать и закрыть приём», в медицинскую карту навсегда запишется ложный кариес дентина.
* **Честное поведение (Honest Behavior)**:
  1. Состояния `diagnosis` и `treatmentPlan` обязаны инициализироваться пустой строкой `""` либо значением из переданного `visitReason` / `activeAppointment.serviceTitle`.
  2. Заполнение диагноза должно осуществляться врачом осознанно: либо в 1 клик через клинический чип-пресет (МКБ-10), либо через голосовой ввод, либо при применении клинической нормы.

---

### 2.6. Другие скрытые потёмкинские фолбеки в `apps/web/src/`

1. **`HeaderGlobalSearch.tsx` (строки 18–22, 79–85)**:
   - В шапке приложения глобальный поиск пациентов ищет по жестко зашитому массиву:
     `SAMPLE_PATIENTS = [{ id: "p1", name: "Иванов Иван Иванович" }, { id: "p2", name: "Смирнова Анна Сергеевна" }, { id: "p3", name: "Кузнецов Дмитрий Павлович" }]`.
   - Поиск полностью изолирован от базы данных и не находит реальных пациентов клиники из PostgreSQL!
   - *Решение*: Подключить к хуку `usePatientSearch()` или эндпоинту `/api/patients?search=`.
2. **`HeaderUserMenu.tsx` (строки 75–79)**:
   - Фолбек текущего пользователя: `user = { name: "Д-р Иванов А. С.", role: "Врач-стоматолог", specialty: "Терапевт-ортопед" }`.
   - *Решение*: Брать данные строго из `activeStaffUser` (из `AppLogicContext` / `AuthContext`). Если не авторизован — отображать состояние неавторизованного пользователя.
3. **`SpecializedAdministrativeLaunchers.tsx`**:
   - `?family_billing=1` (строки 324–358): захардкожена семья «Михайловых», ИНН 770123456789, баланс 18 500 ₽.
   - `?sbp=1` (строки 381–413): захардкожен платеж на 15 400 ₽ для «Михайлов Артем Евгеньевич».
   - `?receipt=1` (строки 471–479): захардкожен кассовый чек на 15 400 ₽.
   - *Решение*: Перевести вызовы СБП, кассы и семейного биллинга на реальные транзакции из рабочего пространства Кассы (`#finance/cashbox`) и карточки визита (`#visit`).

---

## 3. ТРЕБОВАНИЕ R5: АУДИТ СУЩЕСТВУЮЩИХ СКРИНШОТНЫХ СКРИПТОВ И САНДБОКС-URL

### 3.1. Каталог скриптов, использующих изолированные песочницы и моки

| Файл скрипта | Целевой URL / Метод | Выявленная проблема |
| :--- | :--- | :--- |
| `scripts/take_cashbox_4state_proofs.cjs` | `/cashbox_checkout_preview.html?theme=light&tab=cash` | Открывает изолированный HTML-файл вместо `#finance/cashbox` в реальном `AppShell`. |
| `scripts/audit_dental_lab_workflow_layout.cjs` | `/lab_orders_preview.html?tab=registry` | Открывает превью-страницу ЗТЛ, минуя авторизацию и реальное дерево маршрутизации. |
| `scripts/audit_legal_docs_layout.cjs` | `http://127.0.0.1:5173/#documents` + `page.route("**/api/**")` | Мокирует 100% сетевых запросов Fastify/Postgres (внедряет вымышленного «Ковалёва Р. С.»). |
| `scripts/audit_cashier_payroll_layout.cjs` | `/cashier_payroll_preview.html?view=cash_shift` | Открывает изолированную HTML-песочницу кассы и выплат. |
| `scripts/capture-all-inspected-modals.mjs` | `/?standalone=clinical-modals-studio&modal=...` | Обращается к сандбокс-роутеру `renderStandaloneLaunchers` в обход навигации приложения. |
| `scripts/audit_radiology_cbct_layout.cjs` | `/?cbct=demo` | Вызывает синтетическое событие `dente:open-cbct-demo` вместо открытия снимка пациента. |
| `scripts/capture-anesthesia-canonical-proofs.cjs` | `/?anesthesia` | Запускает изолированный workspace анестезии. |
| `scripts/capture-anesthesia-antishock-proofs.cjs` | `/?demo=true&anesthesia=1` | Запускает изолированный standalone-компонент антишоковой укладки. |
| `scripts/capture-odontogram-gate1-proofs.mjs` | `/?stand=odontogram-gate1` | Обращается к тестовому стенду зубной формулы. |
| `scripts/capture-ortho-perio-proofs.mjs` | `/ortho_protocol_preview.html`, `/surgery_cockpit_preview.html` | Использует превью-страницы ортодонтии и хирургии. |

---

### 3.2. Архитектура аутентификации и навигации в реальном приложении (`http://127.0.0.1:5173/`)

Реальное приложение DENTE CRM построено на базе React 19 + Vite с центральным координатором `App.tsx` и Fastify API (`http://127.0.0.1:4100`):

1. **Модель аутентификации**:
   - `App.tsx` проверяет флаги `clinicAuthed` и `staffAuthed`.
   - При холодном старте (без токенов) отображается компонент `AuthHub` (`#/auth/demo` или `#/auth/login`).
   - При наличии сидированной базы PostgreSQL 18 на `127.0.0.1:5432` существуют официальные учетные записи:
     - Демо-клиника: `DEMO_SHOWCASE_ORG_ID` (`01a00000-0000-0000-0000-000000000000`).
     - Терапевт: `DEMO_DOCTOR_1_ID` (Д-р Соколов А. В.).
     - Старший администратор: `DEMO_ADMIN_ID` (Смирнова А. П.).
     - Владелец клиники: `DEMO_OWNER_ID` (Д-р Воронов М. С.).
   - Авторизация для E2E-скриптов может выполняться двумя валидными способами:
     - **Способ А (Через UI Демо-тура)**: скрипт переходит на `http://127.0.0.1:5173/#/auth/demo`, кликает по карточке роли (`[data-testid="demo-role-therapist"]` или `[data-testid="demo-role-administrator"]`), после чего приложение автоматически сохраняет токены в `localStorage`, загружает актуальный `dashboard` через Fastify API и переходит в рабочее пространство.
     - **Способ Б (Headless State Pre-seeding)**: скрипт в `context.addInitScript()` прописывает валидные сессионные ключи реальной сессии:
       ```javascript
       localStorage.setItem("dente_clinic_token", "01a00000-0000-0000-0000-000000000000");
       localStorage.setItem("dente_staff_token", "demo-therapist-token");
       localStorage.setItem("dente_active_staff_user", JSON.stringify({
           id: "01a00000-0000-0000-0003-000000000001",
           fullName: "Д-р Соколов А. В.",
           role: "doctor"
       }));
       localStorage.setItem("dente_demo_showcase_mode", "true");
       localStorage.setItem("dental-crm:onboarding:v1", '{"onboardingDismissed":true}');
       localStorage.setItem("dente_tour_completed", "true");
       ```
       После чего переход на `http://127.0.0.1:5173/` мгновенно монтирует полнофункциональный `AppShell` с реальным доступом ко всем разделам.

2. **Дерево навигации и глубокие ссылки (Deep-Links)**:
   - Приложение использует хеш-роутер (`useAppNavigationSync`):
     - Расписание: `http://127.0.0.1:5173/#schedule`
     - Пациенты: `http://127.0.0.1:5173/#patients`
     - Приём у кресла: `http://127.0.0.1:5173/#visit`
     - Касса и финансы: `http://127.0.0.1:5173/#finance` (вкладка кассы `#finance/cashbox`, выплаты `#finance/payroll`)
     - Документы: `http://127.0.0.1:5173/#documents`
     - Воронка планов лечения: `http://127.0.0.1:5173/#coordinator`
     - Склад: `http://127.0.0.1:5173/#warehouse`
     - Настройки: `http://127.0.0.1:5173/#settings`

---

## 4. АРХИТЕКТУРА ОБНОВЛЕННОГО 4-STATE VISUAL PROOF СКРИПТА (E2E HARNESS)

Для полного выполнения Требования R5 и исключения изолированных сандбоксов разработан стандарт единого Red Team E2E раннера.

### 4.1. Архитектурные принципы
1. **Единая точка входа**: `http://127.0.0.1:5173/` — ноль внешних html-файлов, ноль standalone query-параметров.
2. **Живой бэкенд без моков**: Запрет на `page.route("**/api/**")`. Данные поступают из реального PostgreSQL 18 через Fastify.
3. **Матрица 4-х состояний (Apple HIG & Мандаты 8ze/8al)**:
   - ☀️ **PC Light**: Viewport `1440x900`, `deviceScaleFactor: 2`, `data-theme="light"`
   - 🌙 **PC Dark**: Viewport `1440x900`, `deviceScaleFactor: 2`, `data-theme="dark"`
   - 📱 **Mobile Light**: Viewport `390x844`, `deviceScaleFactor: 3`, `isMobile: true`, `hasTouch: true`, `data-theme="light"`
   - 📱 **Mobile Dark**: Viewport `390x844`, `deviceScaleFactor: 3`, `isMobile: true`, `hasTouch: true`, `data-theme="dark"`
4. **Сквозные пользовательские сценарии (User Journeys)**:
   - **Сценарий 1 (Расписание и Приём)**: Переход в `#schedule` -> клик по визиту реального пациента из базы -> открытие рабочего места врача `#visit` -> снимок зубной формулы и протокола.
   - **Сценарий 2 (Воронка планов лечения)**: Переход в `#coordinator` -> выбор плана лечения -> открытие презентера плана `TreatmentPlanPresenterModal` -> снимок без фиктивных реквизитов.
   - **Сценарий 3 (Касса и 54-ФЗ)**: Переход в `#finance` -> открытие кассовой смены -> формирование чека СБП / терминал -> снимок модалки оплаты.
   - **Сценарий 4 (Выплаты врачам)**: Переход в `#finance/payroll` -> выбор реального врача из штата -> открытие расчетного листка `DoctorPayrollModal`.
5. **Надежность и защита от зависаний**:
   - Preflight-проверка доступности `http://127.0.0.1:5173` и `http://127.0.0.1:4100`.
   - Обязательный `await browser.close()` в блоке `finally`.
   - Проверка размера полученных PNG-файлов ($\ge 30\text{ КБ}$) с аварийным завершением при обнаружении белых или пустых экранов.

---

## 5. СТРУКТУРИРОВАННОЕ ТЕХНИЧЕСКОЕ ЗАДАНИЕ ДЛЯ ВОРКЕРОВ (WORKER TASKS)

### Задача W-R3: Очистка кодовой базы от хардкодных фолбеков
1. **`TreatmentPipeline.tsx`**: Исключить фолбеки реквизитов на "Стоматологическая клиника", "—" и дефолтных врачей. Внедрить честный `EmptyState` и проверку профиля клиники.
2. **`DoctorPayrollModal.tsx`**: Удалить дефолт `clinicName = "ООО «Денте Стоматология»"`. Привязать к живому имени организации.
3. **`fastPrintDiaryBuilder.ts`**: В `extractClinicRequisites` удалить хардкодные ИНН, ОГРН, лицензию и адрес на Клиническом проезде. При их отсутствии в БД возвращать пустые строки и выводить предупреждающий баннер на печати.
4. **`fastPrintConsentAndMemoBuilder.ts`**: Удалить синтетические массивы услуг в актах и сметах (1500, 4500, 5500, 4800, 12500 ₽). Рендерить пустую таблицу и нулевой баланс, если план пуст.
5. **`TreatmentPlanPriceValidatorModal.tsx`**: Заменить возврат `[21]` на `[]`. Если зубы не указаны — требовать выбора зуба на формуле.
6. **`MobileChairsideEHR.tsx`**: Очистить дефолтные `diagnosis` и `treatmentPlan` от кариеса дентина. Инициализировать пустыми строками.
7. **`HeaderGlobalSearch.tsx`**: Удалить `SAMPLE_PATIENTS`. Привязать к эндпоинту `/api/patients?search=`.

### Задача W-R5: Разработка канонического E2E раннера скриншотов
1. Создать единый мастер-скрипт `scripts/capture_e2e_root_4state_proofs.mjs`.
2. Реализовать авторизацию через `http://127.0.0.1:5173/#/auth/demo` либо инициализацию токенов реальной сессии.
3. Реализовать клики по навигации: `#schedule`, `#patients`, `#visit`, `#finance`, `#coordinator`.
4. Снимать 4 состояния (1440x900 Light/Dark, 390x844 Light/Dark) для каждого ключевого экрана.
5. Удалить устаревшие скрипты, обращающиеся к несуществующим `*_preview.html`.

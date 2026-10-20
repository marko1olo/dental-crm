# 🛠️ ПОЛНЫЙ РЕЕСТР ИНСТРУМЕНТОВ ИИ-АССИСТЕНТА DENTE (AI ASSISTANT TOOL REGISTRY)

> 🧭 **Навигация:** [🗺️ Главный Индекс (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) | [🔨 ВЫСШАЯ КОНСТИТУЦИЯ (THE_HAMMER_MASTER_PROMPT.md)](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md) | [📜 Конституция Правил ИИ (.agents/AI_ASSISTANT_RULES.md)](file:///C:/Clinic_MVP/dental-crm/.agents/AI_ASSISTANT_RULES.md) | [🏛️ Спецификация Харнесса (.agents/AI_ASSISTANT_HARNESS_SPEC.md)](file:///C:/Clinic_MVP/dental-crm/.agents/AI_ASSISTANT_HARNESS_SPEC.md) | [🏗️ Общая Архитектура (.agents/AI_ASSISTANT_ARCHITECTURE.md)](file:///C:/Clinic_MVP/dental-crm/.agents/AI_ASSISTANT_ARCHITECTURE.md) | [🖥️ Десктопный Харнесс и MCP (.agents/AI_ASSISTANT_DESKTOP_MCP.md)](file:///C:/Clinic_MVP/dental-crm/.agents/AI_ASSISTANT_DESKTOP_MCP.md)  
> **Канонический статус**: Официальный технический реестр, схемы валидации Zod, спецификации параметров JSON Schema, контракты ответов и матрица прав доступа для всех **29 инструментов** стоматологического агентного харнесса DENTE Dental CRM (`apps/api/src/ai/dentalTools/`).  
> **Стандарты качества**: 100% строгая типизация Zod, отсутствие мокапов, честные SQL-транзакции PostgreSQL 18, разделение профилей рантайма (`web_browser` vs `desktop_native`) и двухфазный Guard подтверждения деструктивных действий (Мандат 8e).

---

## 📊 СВОДНАЯ МАТРИЦА ИНСТРУМЕНТОВ (29 ИНСТРУМЕНТОВ)

| № | Системное имя (`toolName`) | Категория | Среда выполнения | Деструктивный (Мутация) | Краткое назначение |
|---|---|---|---|---|---|
| 1 | `calculate_anesthesia` | Клинический расчет | Web / Desktop | ⚪ Нет (Read-Only) | Расчет доз артикаина/мепивакаина по массе и соматике |
| 2 | `check_somatic_risks` | Клинический скрининг | Web / Desktop | ⚪ Нет (Read-Only) | Скрининг антикоагулянтов, бисфосфонатов (MRONJ), аллергий |
| 3 | `get_patient_emr_and_odontogram` | Клинические данные | Web / Desktop | ⚪ Нет (Read-Only) | Запрос ЭМК, аллергостатуса и зубной формулы FDI из БД |
| 4 | `search_clinic_services_and_prices` | Прейскурант / Сметы | Web / Desktop | ⚪ Нет (Read-Only) | Поиск услуг в прейскуранте клиники и каталоге базовых услуг |
| 5 | `generate_form_043_entry` | Клиническая документация| Web / Desktop | ⚪ Нет (Read-Only) | Синтез записи дневника приёма в амбулаторной карте по SOAP |
| 6 | `multidisciplinary_concilium` | Клинический консилиум | Web / Desktop | ⚪ Нет (Read-Only) | Консилиум специалистов (терапевт, ортопед, хирург) |
| 7 | `chairside_emergency_rescue` | Экстренная помощь | Web / Desktop | ⚪ Нет (Read-Only) | Алгоритмы помощи у кресла (анафилаксия, гипохлорит, облом) |
| 8 | `translate_patient_complaint` | Клинический NLP | Web / Desktop | ⚪ Нет (Read-Only) | Перевод обывательской жалобы в гипотезы МКБ-10 |
| 9 | `compare_dental_materials` | Материаловедение | Web / Desktop | ⚪ Нет (Read-Only) | Сравнение композитов, адгезивов, цементов и костных графтов |
| 10 | `update_tooth_status` | CRM Транзакция | Web / Desktop | 🔴 **ДА (Подтверждение)** | Обновление статуса зуба в БД с аудитом в историю |
| 11 | `create_appointment` | CRM Транзакция | Web / Desktop | 🔴 **ДА (Подтверждение)** | Бронирование слота визита в расписании клиники |
| 12 | `create_invoice_draft` | CRM Транзакция | Web / Desktop | 🔴 **ДА (Подтверждение)** | Формирование счёта на оплату со скидкой врача (автономия врача) |
| 13 | `print_document` | CRM / Документооборот | Web / Desktop | 🔴 **ДА (Подтверждение)** | Печать бланков (Информированное согласие, дневник приёма, договор, счёт) |
| 14 | `read_clinical_file` | Системный I/O | Desktop Only | ⚪ Нет (Read-Only) | Чтение файлов на ПК врача со срезом строк и детекцией DICOM |
| 15 | `read_local_clinical_file` | Системный I/O | Desktop Only | ⚪ Нет (Read-Only) | Семантический алиас для `read_clinical_file` |
| 16 | `write_clinical_file` | Системный I/O | Desktop Only | 🔴 **ДА (Подтверждение)** | Безопасная запись файлов и снимков на диск ПК врача |
| 17 | `list_patient_study_directory` | Радиология / Снимки | Desktop Only | ⚪ Нет (Read-Only) | Сканирование и классификация снимков (КЛКТ, RVG, ОПТГ) |
| 18 | `open_patient_dropzone_folder`| Проводник ОС | Desktop Only | ⚪ Нет (Read-Only) | Открытие папки снимков пациента в Проводнике Windows |
| 19 | `run_workstation_command` | Системные процессы | Desktop Only | 🔴 **ДА (Подтверждение)** | Запуск команд оборудования с авто-уходом в фон по таймауту |
| 20 | `manage_task` | Менеджер фоновых задач | Desktop Only | ⚪ Нет (кроме `kill`) | Мониторинг, статус, завершение и ввод в фоновые процессы |
| 21 | `schedule` | Планировщик таймеров | Desktop Only | ⚪ Нет (Read-Only) | Установка однократных таймеров и периодических cron-задач |
| 22 | `launch_workstation_app` | Стоматологический софт | Desktop Only | ⚪ Нет (Read-Only) | Запуск Planmeca Romexis, EzDent, Sidexis, 3Shape, Exocad |
| 23 | `capture_workstation_screen` | Vision / Захват экрана | Desktop Only | ⚪ Нет (Read-Only) | Захват окна визиографа/томографа для мультимодального анализа |
| 24 | `call_local_mcp_tool` | Аппаратный MCP-мост | Desktop Only | 🔴 **ДА (Касса и чеки)** | Вызов касс Атол/Штрих-М, 2D сканеров, TWAIN-сенсоров |
| 25 | `list_local_mcp_tools` | Аппаратный MCP-мост | Desktop Only | ⚪ Нет (Read-Only) | Реестр доступных инструментов подключенного оборудования |
| 26 | `read_local_mcp_resource` | Аппаратный MCP-мост | Desktop Only | ⚪ Нет (Read-Only) | Чтение статуса кассы, буфера сканера и телеметрии |
| 27 | `search_workstation_files` | Системный I/O / Поиск файлов | Desktop Only | ⚪ Нет (Read-Only) | Полноценный поиск файлов, снимков, дампов и логов на ПК по glob/regex |
| 28 | `configure_clinic_setup` | Системная конфигурация | Web / Desktop | 🔴 **ДА (Подтверждение)** | Комплексная настройка клиники: юрлицо, кресла/кабинеты, ККТ, интеграции |
| 29 | `import_clinic_data_file` | Миграция и импорт данных | Web / Desktop | 🔴 **ДА (Подтверждение)** | Парсинг и импорт прейскурантов услуг, пациентов и дампов внешних МИС (IDENT, StomX) |

---

## 🩺 РАЗДЕЛ I: КЛИНИЧЕСКИЕ КАЛЬКУЛЯТОРЫ И ПРОТОКОЛЫ (9 ИНСТРУМЕНТОВ)

### 1. `calculate_anesthesia`
- **Файл реализации**: [`apps/api/src/ai/dentalTools/clinicalCalculators.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/clinicalCalculators.ts#L20-L170)
- **Назначение**: Расчет предельно допустимой дозы местного анестетика (артикаин 4% 1:100 000, артикаин 4% 1:200 000, мепивакаин 3% без вазоконстриктора) по массе тела с учетом кардио-рисков и беременности по протоколам СтАР / Malamed.
- **Входная Zod-схема**:
  ```typescript
  z.object({
    patientWeightKg: z.number().min(5).max(300).describe("Масса тела пациента в кг"),
    anestheticType: z.enum(["articaine_1_100000", "articaine_1_200000", "mepivacaine_3_plain", "auto"]).default("auto"),
    hasCardiovascularRisk: z.boolean().default(false),
    isPregnancy: z.boolean().default(false),
    plannedCarpules: z.number().min(0.5).max(15).default(1),
  })
  ```
- **Схема ответа**:
  ```typescript
  {
    drugName: string;
    tradeNameSample: string;
    maxDoseMg: number;
    mgPerCarpule: number;
    maxCarpulesByAnesthetic: number;
    maxCarpulesByEpinephrine: number;
    absoluteMaxCarpules: number;
    recommendedCarpules: number;
    plannedCarpules: number;
    totalEpinephrineMcg: number;
    maxSafeEpinephrineMcg: number;
    warnings: string[];
    safeToProceed: boolean;
    clinicalProtocolSummary: string;
  }
  ```

---

### 2. `check_somatic_risks`
- **Файл реализации**: [`apps/api/src/ai/dentalTools/clinicalCalculators.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/clinicalCalculators.ts#L175-L330)
- **Назначение**: Скрининг соматических стоп-факторов: прием антикоагулянтов (варфарин, ксарелто) перед удалением зуба, риск остеонекроза челюсти (MRONJ) при терапии бисфосфонатами/деносумабом, аллергия на бета-лактамы, декомпенсированный диабет (HbA1c > 7.5%) перед имплантацией.
- **Входная Zod-схема**:
  ```typescript
  z.object({
    plannedProcedure: z.enum(["extraction", "implantation", "endodontics", "hygiene", "orthodontics", "prosthetics"]),
    knownDiagnoses: z.array(z.string()).default([]),
    currentMedications: z.array(z.string()).default([]),
    knownAllergies: z.array(z.string()).default([]),
    hba1cPercent: z.number().min(4).max(18).optional(),
  })
  ```
- **Схема ответа**:
  ```typescript
  {
    procedure: string;
    riskLevel: "low" | "moderate" | "high" | "critical_contraindication";
    canProceed: boolean;
    contraindications: string[];
    warnings: string[];
    recommendedActions: string[];
    safeAlternatives: string[];
  }
  ```

---

### 3. `get_patient_emr_and_odontogram`
- **Файл реализации**: [`apps/api/src/ai/dentalTools/crmDatabaseTools.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/crmDatabaseTools.ts#L28-L170)
- **Назначение**: Запрос паспортных данных, лекарственных аллергий, состояний всех 32 зубов одонтограммы (FDI) и истории последних 5 визитов из реальной базы данных PostgreSQL 18 с изоляцией по `organizationId`.
- **Входная Zod-схема**:
  ```typescript
  z.object({
    patientId: z.string().uuid().optional().describe("UUID пациента в CRM"),
    query: z.string().min(1).optional().describe("ФИО или номер телефона для поиска"),
  })
  ```
- **Схема ответа**:
  ```typescript
  {
    found: boolean;
    patient?: { id: string; fullName: string; birthDate: string | null; phone: string | null; weightKg: number | null };
    allergies?: Array<{ allergenGroup: string; drugInnLatin: string | null; severity: string }>;
    toothStates?: Array<{ toothNumber: number; state: string; surfaces: unknown; notes: string | null }>;
    recentVisits?: Array<{ id: string; status: string; diagnosis: string | null; createdAt: Date }>;
  }
  ```

---

### 4. `search_clinic_services_and_prices`
- **Файл реализации**: [`apps/api/src/ai/dentalTools/crmDatabaseTools.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/crmDatabaseTools.ts#L175-L398)
- **Назначение**: Поиск позиций прейскуранта клиники (`serviceCatalogItems`, `services`) и каталога базовых стоматологических услуг по кодам и ключевым словам. При отсутствии в локальном прайсе мягко фолбечится на нормативный клинический справочник СтАР.
- **Входная Zod-схема**:
  ```typescript
  z.object({
    codeOrName: z.string().min(2).describe("Код услуги или поисковое слово"),
  })
  ```
- **Схема ответа**:
  ```typescript
  {
    found: boolean;
    query: string;
    totalCount: number;
    results: Array<{ code: string; title: string; category: string; priceRub: number | null; source: string }>;
  }
  ```

---

### 5. `generate_form_043_entry`
- **Файл реализации**: [`apps/api/src/ai/dentalTools/clinicalCalculators.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/clinicalCalculators.ts#L335-L540)
- **Назначение**: Синтез записи дневника приёма в амбулаторной карте по международному стандарту SOAP (Subjective, Objective, Assessment, Plan) на основе клинических рекомендаций СтАР. Поддерживает физиологическую норму в 1 клик (автономия врача).
- **Входная Zod-схема**:
  ```typescript
  z.object({
    toothNumber: z.number().min(11).max(85).describe("Номер зуба по формуле FDI"),
    diagnosisCode: z.string().describe("Код МКБ-10 (K02.1, K04.0, K04.5, K05.3 и др.)"),
    complaints: z.string().optional(),
    objectiveStatus: z.string().optional(),
    performedTreatment: z.string().optional(),
    anestheticUsed: z.string().optional(),
    isNormDefault: z.boolean().default(true),
  })
  ```
- **Схема ответа**:
  ```typescript
  {
    toothNumber: number;
    diagnosisCode: string;
    icd10Title: string;
    starProtocolTitle: string;
    soapRecord: { subjective: string; objective: string; assessment: string; plan: string };
    rawFormattedText: string;
    suggested804nCodes: string[];
  }
  ```

---

### 6. `multidisciplinary_concilium`
- **Файл реализации**: [`apps/api/src/ai/dentalTools/clinicalCalculators.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/clinicalCalculators.ts#L545-L710)
- **Назначение**: Комплексное планирование реабилитации пациента с привлечением терапевта, ортопеда, хирурга-имплантолога, пародонтолога и ортодонта. Формирует 4 последовательных этапа (санация $\rightarrow$ хирургия $\rightarrow$ протезирование $\rightarrow$ диспансерное наблюдение).
- **Входная Zod-схема**:
  ```typescript
  z.object({
    clinicalCaseDescription: z.string().min(10).describe("Анамнез, состояние прикуса, жалобы"),
    patientAge: z.number().min(3).max(120).optional(),
    specialties: z.array(z.enum(["therapist", "orthopedist", "surgeon", "periodontist", "orthodontist"])).default(["therapist", "orthopedist", "surgeon"]),
  })
  ```

---

### 7. `chairside_emergency_rescue`
- **Файл реализации**: [`apps/api/src/ai/dentalTools/clinicalCalculators.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/clinicalCalculators.ts#L715-L895)
- **Назначение**: Экстренные протоколы у стоматологического кресла: анафилактический шок (адреналин 0.5 мг в/м в бедро), гипохлоритная авария (промывание физраствором, дексаметазон, холод), облом инструмента в корневом канале, перфорация корня/бифуркации (МТА/Биодентин), токсичность местных анестетиков (интралипид 20%).
- **Входная Zod-схема**:
  ```typescript
  z.object({
    emergencyType: z.enum([
      "anaphylactic_shock",
      "hypochlorite_accident",
      "broken_instrument_in_canal",
      "root_canal_perforation",
      "local_anesthetic_toxicity",
      "vasovagal_syncope",
      "hypertensive_crisis"
    ]),
    patientWeightKg: z.number().min(5).max(250).optional(),
  })
  ```

---

### 8. `translate_patient_complaint`
- **Файл реализации**: [`apps/api/src/ai/dentalTools/clinicalCalculators.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/clinicalCalculators.ts#L900-L1010)
- **Назначение**: Семантический парсер естественной речи пациента («ноет от сладкого», «пульсирует ночью в ухо», «больно накусывать на горячее») в клинические гипотезы МКБ-10 с дифференциально-диагностическими критериями.
- **Входная Zod-схема**:
  ```typescript
  z.object({
    complaintText: z.string().min(3).describe("Жалобы словами пациента"),
    toothNumber: z.number().min(11).max(85).optional(),
  })
  ```

---

### 9. `compare_dental_materials`
- **Файл реализации**: [`apps/api/src/ai/dentalTools/clinicalCalculators.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/clinicalCalculators.ts#L1015-L1127)
- **Назначение**: Сравнительный анализ физико-химических и клинических свойств материалов: Bulk-Fill vs послойная реставрация, самопротравливающие (self-etch) адгезивы 7 поколения vs тотальное протравливание (total-etch), стеклоиономерные цементы vs композиты двойного отверждения.
- **Входная Zod-схема**:
  ```typescript
  z.object({
    materialA: z.string().min(2),
    materialB: z.string().min(2),
    clinicalIndication: z.string().optional(),
  })
  ```

---

## 🏛️ РАЗДЕЛ II: CRM-ТРАНЗАКЦИИ И БАЗА ДАННЫХ (4 ИНСТРУМЕНТА)

### 10. `update_tooth_status` 🔴 [ДЕСТРУКТИВНЫЙ — ТРЕБУЕТ ПОДТВЕРЖДЕНИЯ]
- **Файл реализации**: [`apps/api/src/ai/dentalTools/crmDatabaseTools.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/crmDatabaseTools.ts#L400-L538)
- **Назначение**: Запись нового статуса зуба в таблицу `toothStates` PostgreSQL 18 с одновременной фиксацией транзакции в аудиторском журнале `toothStateHistory`.
- **Входная Zod-схема**:
  ```typescript
  z.object({
    patientId: z.string().uuid().describe("ID пациента"),
    toothNumber: z.number().min(11).max(85).describe("Номер зуба FDI 11-48 / 51-85"),
    state: z.enum(["healthy", "caries", "pulpitis", "periodontitis", "filling", "crown", "implant", "extracted", "missing", "root", "mobility"]),
    surfaces: z.array(z.string()).optional().describe("Поверхности O, M, D, V, L"),
    notes: z.string().optional(),
  })
  ```

---

### 11. `create_appointment` 🔴 [ДЕСТРУКТИВНЫЙ — ТРЕБУЕТ ПОДТВЕРЖДЕНИЯ]
- **Файл реализации**: [`apps/api/src/ai/dentalTools/crmDatabaseTools.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/crmDatabaseTools.ts#L540-L635)
- **Назначение**: Создание брони визита в расписании клиники (`appointments`) с привязкой к креслу (`chairId`), врачу (`doctorId`) и пациенту (`patientId`).
- **Входная Zod-схема**:
  ```typescript
  z.object({
    patientId: z.string().uuid(),
    doctorId: z.string().uuid(),
    startTime: z.string().describe("ISO 8601 дата-время"),
    durationMinutes: z.number().min(15).max(240).default(30),
    chairId: z.string().uuid().optional(),
    serviceTitle: z.string().optional(),
    notes: z.string().optional(),
  })
  ```

---

### 12. `create_invoice_draft` 🔴 [ДЕСТРУКТИВНЫЙ — ТРЕБУЕТ ПОДТВЕРЖДЕНИЯ]
- **Файл реализации**: [`apps/api/src/ai/dentalTools/crmDatabaseTools.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/crmDatabaseTools.ts#L640-L755)
- **Назначение**: Формирование счёта в `patientInvoices` и строк услуг в `treatmentItems`. Поддерживает скидку врача (вплоть до 100% на переделки и персонал) без ввода мастер-паролей администратора (Мандат 8e).
- **Входная Zod-схема**:
  ```typescript
  z.object({
    patientId: z.string().uuid(),
    visitId: z.string().uuid().optional(),
    items: z.array(z.object({
      serviceTitle: z.string().min(1),
      code804n: z.string().optional(),
      quantity: z.number().min(1).default(1),
      unitPriceRub: z.number().min(0),
    })).min(1),
    discountPercent: z.number().min(0).max(100).default(0),
    paymentMethod: z.enum(["cash", "card", "mixed", "advance"]).default("card"),
  })
  ```

---

### 13. `print_document` 🔴 [ДЕСТРУКТИВНЫЙ — ТРЕБУЕТ ПОДТВЕРЖДЕНИЯ]
- **Файл реализации**: [`apps/api/src/ai/dentalTools/crmDatabaseTools.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/crmDatabaseTools.ts#L760-L810)
- **Назначение**: Печать клинических и юридических бланков (дневник приёма амбулаторной карты, Информированное добровольное согласие, договор возмездного оказания услуг, кассовый чек, памятка). В веб-версии отдает намерение на печать (`client_print_intent`), в десктопе — отправляет на системный/термопринтер.
- **Входная Zod-схема**:
  ```typescript
  z.object({
    documentType: z.enum(["form_043", "informed_consent_1051n", "contract_treatment", "invoice_receipt", "post_op_memo"]),
    patientId: z.string().uuid(),
    visitId: z.string().uuid().optional(),
    printerName: z.string().optional(),
    isDraft: z.boolean().default(false),
  })
  ```

---

## 💻 РАЗДЕЛ III: НАБОР СИСТЕМНЫХ ИНСТРУМЕНТОВ РАБОЧЕЙ СТАНЦИИ DESKTOP NATIVE (8 ИНСТРУМЕНТОВ)

### 14 & 15. `read_clinical_file` и `read_local_clinical_file`
- **Файл реализации**: [`apps/api/src/ai/dentalTools/desktopSystemTools.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/desktopSystemTools.ts#L420-L580)
- **Назначение**: Безопасное чтение файлов исследований, логов, DICOM-манифестов и текстовых протоколов со срезом строк (`startLine`, `endLine`) и проверкой черного списка путей `isPathSafe`. Автоматически детектирует DICOM-заголовок (`DICM` на смещении 128 байт).
- **Входная Zod-схема**:
  ```typescript
  z.object({
    filePath: z.string().min(1).describe("Абсолютный путь к файлу на диске ПК"),
    startLine: z.number().int().min(1).optional(),
    endLine: z.number().int().min(1).optional(),
    asBase64: z.boolean().default(false),
  })
  ```

---

### 16. `write_clinical_file` 🔴 [ДЕСТРУКТИВНЫЙ — ТРЕБУЕТ ПОДТВЕРЖДЕНИЯ]
- **Файл реализации**: [`apps/api/src/ai/dentalTools/desktopSystemTools.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/desktopSystemTools.ts#L270-L415)
- **Назначение**: Безопасная запись выписок, протоколов, направлений на КЛКТ и бинарных файлов на локальный диск с автоматическим созданием директорий и защитой от перезаписи системных файлов.
- **Входная Zod-схема**:
  ```typescript
  z.object({
    targetPath: z.string().min(1),
    content: z.string(),
    overwrite: z.boolean().default(false),
    append: z.boolean().default(false),
    isBase64: z.boolean().default(false),
  })
  ```

---

### 17. `list_patient_study_directory`
- **Файл реализации**: [`apps/api/src/ai/dentalTools/desktopSystemTools.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/desktopSystemTools.ts#L585-L710)
- **Назначение**: Сканирование изолированной папки снимков пациента (`getTenantDropzonePath`) с автоматической категоризацией модальностей: КЛКТ (DICOM / `.dcm`), визиограф RVG, панорамные ОПТГ, 3D-сканы зубов (`.stl`, `.ply`, `.obj`) и фотопротокол (`.jpg`, `.png`).
- **Входная Zod-схема**:
  ```typescript
  z.object({
    patientId: z.string().optional(),
    customPath: z.string().optional(),
  })
  ```

---

### 18. `open_patient_dropzone_folder`
- **Файл реализации**: [`apps/api/src/ai/dentalTools/desktopSystemTools.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/desktopSystemTools.ts#L715-L815)
- **Назначение**: Мгновенное открытие Проводника Windows (`explorer.exe`) в папке снимков пациента для перетаскивания файлов (Drag & Drop) в 1 клик.
- **Входная Zod-схема**:
  ```typescript
  z.object({
    patientId: z.string().min(1),
    createIfNotExists: z.boolean().default(true),
  })
  ```

---

### 19. `run_workstation_command` 🔴 [ДЕСТРУКТИВНЫЙ — ТРЕБУЕТ ПОДТВЕРЖДЕНИЯ]
- **Файл реализации**: [`apps/api/src/ai/dentalTools/desktopSystemTools.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/desktopSystemTools.ts#L960-L1130)
- **Назначение**: Выполнение служебных команд оборудования с параметром `WaitMsBeforeAsync`. Если команда выполняется быстрее таймаута — возвращает результат синхронно; если дольше — автоматически переводит процесс в фоновый режим и возвращает `taskId` для контроля через `manage_task`.
- **Входная Zod-схема**:
  ```typescript
  z.object({
    commandLine: z.string().min(1),
    cwd: z.string().optional(),
    waitMsBeforeAsync: z.number().int().min(100).max(10000).default(2000),
    isDaemon: z.boolean().default(false),
  })
  ```

---

### 20. `manage_task`
- **Файл реализации**: [`apps/api/src/ai/dentalTools/desktopSystemTools.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/desktopSystemTools.ts#L1135-L1285)
- **Назначение**: Системный менеджер фоновых процессов (`WorkstationTaskManager`): просмотр активных задач (`list`), опрос логов (`status`), аварийное прерывание (`kill`) и отправка ввода (`send_input`).
- **Входная Zod-схема**:
  ```typescript
  z.object({
    action: z.enum(["list", "status", "kill", "send_input"]),
    taskId: z.string().optional(),
    input: z.string().optional(),
  })
  ```

---

### 21. `schedule`
- **Файл реализации**: [`apps/api/src/ai/dentalTools/desktopSystemTools.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/desktopSystemTools.ts#L1290-L1440)
- **Назначение**: Планировщик однократных таймеров (`durationSeconds`) и периодических регламентных задач по cron (`cronExpression`) для авто-напоминаний ассистента врачу.
- **Входная Zod-схема**:
  ```typescript
  z.object({
    prompt: z.string().min(1).describe("Текст клинического напоминания или задачи"),
    durationSeconds: z.number().int().min(1).optional(),
    cronExpression: z.string().optional(),
    timerCondition: z.string().default("never"),
    maxIterations: z.number().int().min(1).optional(),
  })
  ```

---

## 🩻 РАЗДЕЛ IV: ВНЕШНИЙ СОФТ КЛИНИКИ И МУЛЬТИМОДАЛЬНЫЙ ЗАХВАТ (2 ИНСТРУМЕНТА)

### 22. `launch_workstation_app`
- **Файл реализации**: [`apps/api/src/ai/dentalTools/desktopSystemTools.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/desktopSystemTools.ts#L1445-L1620)
- **Назначение**: Запуск внешних медицинских программ просмотра КЛКТ и моделирования с передачей идентификатора пациента или пути к исследованию в параметрах командной строки:
  - Planmeca Romexis
  - VATECH EzDent-i / Ez3D Plus
  - VATECH EasyDent V4
  - Dentsply Sirona Sidexis 4
  - 3Shape Dental System
  - Exocad DentalCAD
- **Входная Zod-схема**:
  ```typescript
  z.object({
    appId: z.enum(["planmeca_romexis", "vatech_ezdent", "vatech_easydent", "sirona_sidexis", "threeshape_dental", "exocad"]),
    patientId: z.string().optional(),
    studyPath: z.string().optional(),
    customArgs: z.array(z.string()).optional(),
  })
  ```

---

### 23. `capture_workstation_screen`
- **Файл реализации**: [`apps/api/src/ai/dentalTools/desktopSystemTools.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/desktopSystemTools.ts#L1625-L1770)
- **Назначение**: Снятие скриншота экрана или области интереса (ROI) окна визиографа/томографа высокого разрешения для оптического распознавания патологий нейросетью без необходимости ручного экспорта файлов.
- **Входная Zod-схема**:
  ```typescript
  z.object({
    windowTitle: z.string().optional().describe("Заголовок окна (например Romexis или EzDent)"),
    roi: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }).optional(),
    saveToDropzone: z.boolean().default(true),
  })
  ```

---

## 🔌 РАЗДЕЛ V: АППАРАТНЫЙ МОСТ MODEL CONTEXT PROTOCOL (3 ИНСТРУМЕНТА)

### 24. `call_local_mcp_tool` 🔴 [ДЕСТРУКТИВНЫЙ ПРИ ОПЕРАЦИЯХ С КАССОЙ И ЧЕКАМИ]
- **Файл реализации**: [`apps/api/src/ai/dentalTools/desktopSystemTools.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/desktopSystemTools.ts#L1775-L1980)
- **Назначение**: Вызов функций локальных аппаратных серверов MCP:
  - **`cash_register_atol`**: статус смены, печать кассового чека с позициями оказанных услуг, закрытие смены (Z-отчет), X-отчет, возврат.
  - **`cash_register_shtrih`**: фискализация чека, отрезка ленты, открытие денежного ящика.
  - **`scanner_2d_datamatrix`**: валидация кодов маркировки «Честный Знак» лекарств и имплантатов.
  - **`twain_sensor`**: захват кадра с USB-радиовизиографа.
- **Входная Zod-схема**:
  ```typescript
  z.object({
    serverName: z.enum(["cash_register_atol", "cash_register_shtrih", "scanner_2d_datamatrix", "twain_sensor"]),
    toolName: z.string().min(1),
    arguments: z.record(z.unknown()).default({}),
  })
  ```

---

### 25. `list_local_mcp_tools`
- **Файл реализации**: [`apps/api/src/ai/dentalTools/desktopSystemTools.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/desktopSystemTools.ts#L1985-L2110)
- **Назначение**: Инспекция доступного аппаратного парка клиники и каталога команд подключенного оборудования.
- **Входная Zod-схема**:
  ```typescript
  z.object({
    serverName: z.string().optional(),
  })
  ```

---

### 26. `read_local_mcp_resource`
- **Файл реализации**: [`apps/api/src/ai/dentalTools/desktopSystemTools.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/desktopSystemTools.ts#L2115-L2244)
- **Назначение**: Чтение непрерывной аппаратной телеметрии (состояние ФН фискального накопителя, буфер сканера штрихкодов, готовность TWAIN-датчика).
- **Входная Zod-схема**:
  ```typescript
  z.object({
    serverName: z.string().min(1),
    resourceUri: z.string().min(1),
  })
  ```

---

## 🧭 РАЗДЕЛ VI: СИСТЕМНАЯ НАВИГАЦИЯ, ПОИСК ФАЙЛОВ И КОНФИГУРАЦИЯ КЛИНИКИ (3 ИНСТРУМЕНТА)

### 27. `search_workstation_files`
- **Файл реализации**: [`apps/api/src/ai/dentalTools/desktopSystemTools.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/desktopSystemTools.ts)
- **Назначение**: Глубокий поиск файлов на рабочей станции врача (исследования КЛКТ/RVG, дампы, протоколы, прайсы, выгрузки МИС, логи оборудования) с поддержкой поиска по маске (glob), регулярным выражениям (regex), расширениям, диапазону дат модификации и размерам. Оснащен строгой защитой безопасных путей `isPathSafe` и изоляцией арендатора.
- **Входная Zod-схема**:
  ```typescript
  z.object({
    searchPath: z.string().min(1).describe("Базовая директория поиска на ПК (например C:\\ClinicDropzone или рабочий каталог клиники)"),
    pattern: z.string().optional().describe("Паттерн поиска по имени (glob или подстрока, например *.dcm, *price*, *043*)"),
    regex: z.string().optional().describe("Регулярное выражение для точной фильтрации имени файла"),
    extensions: z.array(z.string()).optional().describe("Список допустимых расширений (dcm, rvg, xml, json, csv, xlsx, txt, pdf)"),
    maxResults: z.number().int().min(1).max(200).default(50).describe("Максимальное количество возвращаемых файлов"),
    recursive: z.boolean().default(true).describe("Рекурсивный поиск в поддиректориях"),
    minSizeBytes: z.number().int().min(0).optional().describe("Минимальный размер файла в байтах"),
    maxSizeBytes: z.number().int().min(0).optional().describe("Максимальный размер файла в байтах"),
    modifiedAfter: z.string().optional().describe("ISO 8601 дата, модифицированные после которой файлы включаются в выдачу"),
  })
  ```
- **Схема ответа**:
  ```typescript
  {
    searchPath: string;
    totalFound: number;
    matchedCount: number;
    truncated: boolean;
    files: Array<{
      filePath: string;
      fileName: string;
      extension: string;
      sizeBytes: number;
      modifiedAt: string;
      isDicom: boolean;
      suggestedCategory: "cbct" | "rvg" | "price" | "patient_export" | "log" | "document" | "unknown";
    }>;
  }
  ```

---

### 28. `configure_clinic_setup` 🔴 [ДЕСТРУКТИВНЫЙ — ТРЕБУЕТ ПОДТВЕРЖДЕНИЯ]
- **Файл реализации**: [`apps/api/src/ai/dentalTools/crmDatabaseTools.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/crmDatabaseTools.ts)
- **Назначение**: Комплексная системная настройка клиники «под ключ» через ИИ: регистрационные и юридические данные организации (наименование, ИНН, ОГРН, адреса, телефоны), конфигурация кабинетов и стоматологических установок/кресел, фискальные параметры ККТ (Атол/Штрих-М, СНО, авто-Z-отчет), график работы и длительность стандартного слота приёма.
- **Входная Zod-схема**:
  ```typescript
  z.object({
    organizationId: z.string().uuid().optional().describe("UUID клиники (если не передан — текущая активная)"),
    clinicName: z.string().min(1).optional().describe("Официальное название клиники"),
    legalEntity: z.object({
      inn: z.string().regex(/^\d{10}(\d{2})?$/).optional().describe("ИНН юридического лица или ИП"),
      kpp: z.string().optional().describe("КПП юрлица"),
      ogrn: z.string().optional().describe("ОГРН / ОГРНИП"),
      legalAddress: z.string().optional().describe("Юридический адрес"),
      actualAddress: z.string().optional().describe("Фактический адрес клиники"),
      phone: z.string().optional().describe("Контактный телефон клиники"),
      email: z.string().email().optional().describe("Контактный email"),
    }).optional(),
    cabinetsAndChairs: z.array(z.object({
      cabinetName: z.string().min(1),
      chairNumber: z.number().int().min(1),
      specialty: z.enum(["general", "therapy", "surgery", "orthopedics", "orthodontics", "pediatric"]).default("general"),
    })).optional().describe("Список кабинетов и стоматологических установок"),
    fiscalConfig: z.object({
      kktDriver: z.enum(["atol", "shtrih_m", "mock", "none"]).default("none"),
      comPort: z.string().optional().describe("COM-порт ККТ (например COM3)"),
      taxSystem: z.enum(["osn", "usn_income", "usn_income_outcome", "patent"]).default("usn_income"),
      autoPrintZReport: z.boolean().default(false),
    }).optional(),
    operatingHours: z.object({
      workDays: z.array(z.number().int().min(0).max(6)).default([1, 2, 3, 4, 5, 6]),
      openTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default("08:00"),
      closeTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default("20:00"),
      slotDurationMinutes: z.number().int().min(15).max(120).default(30),
    }).optional(),
    confirmApply: z.boolean().default(false).describe("Явное подтверждение применения конфигурации"),
  })
  ```
- **Схема ответа**:
  ```typescript
  {
    success: boolean;
    organizationId: string;
    appliedChanges: {
      clinicNameUpdated: boolean;
      legalEntityUpdated: boolean;
      chairsConfiguredCount: number;
      fiscalConfigured: boolean;
      operatingHoursConfigured: boolean;
    };
    summaryRu: string;
  }
  ```

---

### 29. `import_clinic_data_file` 🔴 [ДЕСТРУКТИВНЫЙ — ТРЕБУЕТ ПОДТВЕРЖДЕНИЯ]
- **Файл реализации**: [`apps/api/src/ai/dentalTools/crmDatabaseTools.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/crmDatabaseTools.ts)
- **Назначение**: Автоматический разбор, сопоставление и импорт структурированных файлов клиники на ПК: прейскурантов (Excel/CSV) с интеллектуальным матчингом к Номенклатуре 804н, реестров пациентов, истории приёмов, остатков склада и выгрузок сторонних МИС (IDENT, DentalPRO, StomX, Инфодент). Поддерживает предварительный режим валидации (`dryRun: true`) без применения мутаций.
- **Входная Zod-схема**:
  ```typescript
  z.object({
    filePath: z.string().min(1).describe("Путь к файлу на ПК или загруженному файлу импорта"),
    dataType: z.enum(["price_list", "patients", "appointments", "warehouse_stock", "external_mis_dump"]).describe("Тип импортируемых данных"),
    sourceFormat: z.enum(["excel_xlsx", "csv", "json", "ident_xml", "stomx_dump", "auto"]).default("auto"),
    columnMapping: z.record(z.string()).optional().describe("Пользовательское сопоставление колонок к полям DENTE"),
    dryRun: z.boolean().default(true).describe("Режим предварительного тестирования без мутации БД"),
    organizationId: z.string().uuid().optional(),
  })
  ```
- **Схема ответа**:
  ```typescript
  {
    dataType: string;
    sourceFormat: string;
    dryRun: boolean;
    totalRowsFound: number;
    validRowsCount: number;
    invalidRowsCount: number;
    autoMappedFields: Record<string, string>;
    previewItems: Array<Record<string, unknown>>;
    errors: Array<{ rowNumber: number; reason: string }>;
    importedCount?: number;
    summaryRu: string;
  }
  ```

---

## 🔒 ПРАВИЛА ВАЛИДАЦИИ И КОДЫ ОШИБОК ХАРНЕССА

| Код ошибки | Описание причины | Протокол устранения |
|---|---|---|
| `ToolExecutionFailed` | Ошибка внутри бизнес-логики обработчика инструмента | Ошибка передается в LLM в формате JSON; модель анализирует причину и повторяет запрос с корректными параметрами |
| `DESKTOP_DENIED` | Попытка вызвать инструмент десктопа в браузере `web_browser` | Система возвращает отказ; модель объясняет врачу, что функция требует запуска настольного Dente Desktop EXE |
| `CONFIRMATION_REQUIRED` | Деструктивная операция требует клика врача | Харнесс эмиттит событие `confirmation_required` и ждет действия врача в UI |
| `ABORTED` | Запрос прерван врачом (`AbortSignal`) | Немедленная остановка цикла ReAct без генерации 500 ошибок |
| `ITERATION_LIMIT_REACHED` | Достигнут порог `MAX_REACT_ITERATIONS = 6` | Принудительная финализация с сохранением всех промежуточных вызовов |
| `FILE_SEARCH_OUT_OF_BOUNDS` | Попытка поиска в системных директориях Windows (`isPathSafe` failure) | Предотвращение выхода за пределы доверенной файловой зоны клиники |
| `CONFIG_VALIDATION_FAILED` | Ошибка валидации параметров клиники (ИНН, ОГРН, время работы) | Модель возвращает перечень некорректных полей и запрашивает уточнение |
| `IMPORT_PARSER_ERROR` | Не удалось распарсить структуру файла (битый Excel, некорректная кодировка CSV) | Выводится отчет с указанием строк сбоя и предложением скорректировать разделитель |
| `TENANT_ACCESS_DENIED` | Попытка настроить клинику чужой организации (`organizationId` mismatch) | Жесткий отказ RLS с фиксацией в журнале безопасности |

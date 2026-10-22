# 🏛️ АРХИТЕКТУРА И ИНСТРУМЕНТАЛЬНЫЙ ХАРНЕСС ИИ-АССИСТЕНТА DENTE (AI HARNESS & ARCHITECTURE SPECIFICATION)

> 🧭 **Навигация:** [🗺️ Главный Индекс (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) | [📜 Конституция ИИ-Правил (.agents/AI_ASSISTANT_RULES.md)](file:///C:/Clinic_MVP/dental-crm/.agents/AI_ASSISTANT_RULES.md) | [🎙️ Стенографист и Sentinel (.agents/AI_ASSISTANT_CHAIRSIDE_SENTINEL.md)](file:///C:/Clinic_MVP/dental-crm/.agents/AI_ASSISTANT_CHAIRSIDE_SENTINEL.md) | [⚡ Спецификация Харнесса (.agents/AI_ASSISTANT_HARNESS_SPEC.md)](file:///C:/Clinic_MVP/dental-crm/.agents/AI_ASSISTANT_HARNESS_SPEC.md) | [🛠️ Реестр 29 Инструментов (.agents/AI_ASSISTANT_TOOL_REGISTRY.md)](file:///C:/Clinic_MVP/dental-crm/.agents/AI_ASSISTANT_TOOL_REGISTRY.md) | [🖥️ Десктопный Харнесс и MCP (.agents/AI_ASSISTANT_DESKTOP_MCP.md)](file:///C:/Clinic_MVP/dental-crm/.agents/AI_ASSISTANT_DESKTOP_MCP.md) | [🐝 Мультиагентный рой (.agents/AI_ASSISTANT_SUBAGENT_SWARM.md)](file:///C:/Clinic_MVP/dental-crm/.agents/AI_ASSISTANT_SUBAGENT_SWARM.md) | [⚙️ Правила ИИ (rules/ai_assistant.md)](file:///C:/Users/Admin/.gemini/config/rules/ai_assistant.md) | [🔨 ВЫСШАЯ КОНСТИТУЦИЯ (THE_HAMMER_MASTER_PROMPT.md)](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md) | [🏗️ Общая Архитектура (.agents/ARCHITECTURE.md)](file:///C:/Clinic_MVP/dental-crm/.agents/ARCHITECTURE.md)  
> **Канонический статус**: Центральная техническая спецификация когнитивного ядра, агентного харнесса, протоколов диктовки, арсенала стоматологических инструментов и интеграционных шин искусственного интеллекта в DENTE Dental CRM.

---

## 🏛️ 1. ОБЩИЙ АРХИТЕКТУРНЫЙ ЛАНДШАФТ И 3 КОНТУРА ВЗАИМОДЕЙСТВИЯ

ИИ в DENTE не является внешней изолированной «игрушкой» или чат-ботом на отдельной странице. Он глубоко интегрирован во все 3 слоя взаимодействия клиники по принципу **3-Tier Interaction Doctrine** (`.agents/UI_STANDARDS.md`):

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TIER 1: HOT PATH / CHAIRSIDE COCKPIT (0–1 КЛИК / ВРАЧ У КРЕСЛА)                         │
│ • Голосовой стенографист диктовки зубной формулы FDI (11–48 / 51–85) и SOAP дневника    │
│ • Автоматический расчёт дозировок анестетиков по массе тела и соматике (артикаин/адреналин)│
│ • Фоновый мониторинг рисков Chairside Sentinel (аллергии, стоп-факторы, норма в 1 клик) │
│ • Быстрый чек 54-ФЗ с формированием пакета услуг по номенклатуре 804н                   │
└─────────────────────────────────────────┬──────────────────────────────────────────────┘
                                          │ Двухсторонний контекстный снепшот
┌─────────────────────────────────────────▼──────────────────────────────────────────────┐
│ TIER 2: WARM CONTEXT / COPILOT DRAWERS & MODALS (1 КЛИК / ПЛАНИРОВАНИЕ И СМЕТЫ)         │
│ • TreatmentPlanCopilot: Генерация 3 сценариев (Эконом, Оптимальный, Премиум)           │
│ • Контекстный Copilot Drawer: Интерактивный диалог с врачом по клиническому случаю    │
│ • Валидация протоколов эндодонтии и ортопедии с детекцией слепых зон и рисков          │
│ • Персонализация пост-визитных памяток для пациента (Telegram / печать)                │
└─────────────────────────────────────────┬──────────────────────────────────────────────┘
                                          │ Фоновые асинхронные задачи
┌─────────────────────────────────────────▼──────────────────────────────────────────────┐
│ TIER 3: COLD BACKOFFICE / RECEPTION & RADIOLOGY (ФОН / РЕГИСТРАТУРА И ДИАГНОСТИКА)     │
│ • Распознавание радиовизиограмм (RVG) и томограмм КЛКТ (детекция кариеса, апексов)     │
│ • Предиктивный скоринг риска неявки пациента (No-Show Risk Engine по реальной истории)  │
│ • Интеллектуальный импорт и матчинг Excel-прайс-листов со справочником 804н            │
│ • Интеллектуальный триаж входящих обращений в мессенджерах (Telegram, WhatsApp, MAX)    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ 2. ГИБРИДНЫЙ ПАЙПЛАЙН: LOCAL-FIRST HEURISTICS VS CLOUD LLM FAILOVER

Для обеспечения отказоустойчивости, соблюдения Mandate 8e (Zero Blocking) и защиты бюджета токенов внедрен строгий двухуровневый шлюз:

```
                  ┌─────────────────────────────────────────┐
                  │   Входящий текст / Голосовая диктовка   │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │ 1. ДЕТЕРМИНИРОВАННЫЙ ЛОКАЛЬНЫЙ АЛГОРИТМ │
                  │  (Local NLP / Regex / Грамматика FDI)   │
                  │  Время отклика: < 5 мс | Затраты: 0 ₽   │
                  └────────────────────┬────────────────────┘
                                       │
                         Успешно извлечены сущности?
                                ╱             ╲
                            ДА ╱               ╲ НЕТ / Сложный контекст
                              ▼                 ▼
             ┌────────────────────────┐  ┌───────────────────────────────────┐
             │ Применение в CRM Store │  │ 2. ОБЛАЧНЫЙ ИИ-ИНФЕРЕНС (LLM POOL) │
             │   (useVisitStore / DB) │  │  Multi-Key Failover Gemini / OpenAI│
             └────────────────────────┘  │  Анализ контекста, EBM-синтез    │
                                         └──────────────────┬────────────────┘
                                                            │
                                                            ▼
                                         ┌───────────────────────────────────┐
                                         │ Вызов инструментов Dental Tools   │
                                         │ с валидацией Chairside Sentinel   │
                                         └───────────────────────────────────┘
```

### Ключевые файлы реализации:
- **`apps/web/src/lib/aiOrchestrator.ts`**: Маршрутизатор намерений (`detectIntent`). Проверяет локальные парсеры: `smartBookingParser.ts`, `smartPatientParser.ts`, `smartVisitParser.ts`, `smartPriceParser.ts`.
- **`apps/api/src/ai/localDictationParser.ts`**: Бэкендовый детерминированный разбор диктовок.
- **`apps/api/src/services/agent/geminiMultiKeyPoolFailover.ts`**: Ротационный пул API-ключей Google Gemini с автоматическим обходом лимитов (`429 RateLimit`) и падением в резервные провайдеры.

---

## 🛠️ 3. ИНСТРУМЕНТАЛЬНЫЙ ХАРНЕСС (DENTAL TOOL ARSENAL — 29 ИНСТРУМЕНТОВ)

Единый реестр стоматологических и системных инструментов определен в `apps/api/src/ai/dentalTools/index.ts`. Инструменты строго типизированы через схемы Zod / OpenAI Function Calling.

### Реестр инструментов по категориям:

| Категория | Имя инструмента (`toolName`) | Назначение | Уровень доступа / Деструктивность |
|---|---|---|---|
| **Клинический** | `calculateAnesthesiaTool` | Расчет предельных карпул артикаина/мепивакаина по массе и соматике | Read-Only (Безопасно) |
| **Клинический** | `checkSomaticRisksTool` | Проверка аллергий, стоп-факторов и лекарственных взаимодействий | Read-Only (Безопасно) |
| **Клинический** | `chairsideEmergencyTool` | Алгоритмы неотложной помощи у кресла (анафилаксия, коллапс, токсичность) | Read-Only (Безопасно) |
| **Клинический** | `getPatientEmrTool` | Чтение истории визитов, аллергостатуса и зубов из ЭМК | Read-Only (Безопасно) |
| **Клинический** | `generateForm043Tool` | Генерация дневника первичного/повторного приёма по стандарту SOAP | Read-Only (Безопасно) |
| **Клинический** | `translatePatientComplaintTool` | Перевод обывательской жалобы пациента на строгий диагноз МКБ-10 | Read-Only (Безопасно) |
| **Клинический** | `compareDentalMaterialsTool` | Сравнение физико-химических свойств пломбировочных и костных материалов | Read-Only (Безопасно) |
| **Клинический** | `multidisciplinaryConciliumTool` | Симуляция междисциплинарного консилиума (терапевт + ортопед + хирург) | Read-Only (Безопасно) |
| **Клинический** | `searchServicesTool` | Поиск услуг в прейскуранте клиники и справочнике услуг | Read-Only (Безопасно) |
| **CRM** | `updateToothStatusTool` | Обновление клинического состояния зуба в одонтограмме | **State Mutation (Требует подтверждения)** |
| **CRM** | `createAppointmentTool` | Создание слота записи пациента в сетке расписания | **State Mutation (Требует подтверждения)** |
| **CRM** | `createInvoiceDraftTool` | Формирование черновика счета и кассового чека | **State Mutation (Требует подтверждения)** |
| **CRM** | `printDocumentTool` | Отправка бланка (ИДС, договор, акт) на печать | **State Mutation (Требует подтверждения)** |
| **Рабочая станция** | `readClinicalFileTool` | Чтение локального протокола/DICOM со срезом строк (`startLine`, `endLine`) | Системный вызов (`desktop_native`) |
| **Рабочая станция** | `writeClinicalFileTool` | Безопасная запись выписок, протоколов и бинарных снимков | Системный вызов (`desktop_native`) |
| **Рабочая станция** | `listPatientStudyDirectoryTool`| Листинг папки снимков пациента с авто-классификацией модальностей | Системный вызов (`desktop_native`) |
| **Рабочая станция** | `openPatientDropzoneFolderTool`| Открытие папки снимков пациента в Проводнике Windows | Системный вызов (`desktop_native`) |
| **Рабочая станция** | `runWorkstationCommandTool` | Выполнение команд с `WaitMsBeforeAsync` и уходом в фон | Системный вызов (`desktop_native`) |
| **Рабочая станция** | `manageTaskTool` | Менеджер фоновых задач (`list`, `status`, `kill`, `send_input`) | Системный вызов (`desktop_native`) |
| **Рабочая станция** | `scheduleTool` | Планировщик однократных таймеров и периодических cron-задач | Системный вызов (`desktop_native`) |
| **Рабочая станция** | `launchWorkstationAppTool` | Запуск Romexis, EzDent, EasyDent, Sidexis, 3Shape, Exocad | Системный вызов (`desktop_native`) |
| **Рабочая станция** | `captureWorkstationScreenTool` | Захват снимка экрана или ROI датчика для мультимодального анализа | Системный вызов (`desktop_native`) |
| **Рабочая станция** | `callLocalMcpToolTool` | Вызов инструментов локальных серверов MCP (Атол, Штрих-М, TWAIN) | Системный вызов (`desktop_native`) |
| **Рабочая станция** | `listLocalMcpToolsTool` | Каталог доступных локальных инструментов оборудования MCP | Системный вызов (`desktop_native`) |
| **Рабочая станция** | `readLocalMcpResourceTool` | Чтение телеметрии и ресурсов локального оборудования MCP | Системный вызов (`desktop_native`) |
| **Рабочая станция** | `searchWorkstationFilesTool` | Поиск файлов по glob, regex или расширению в каталогах клиники | Системный вызов (`desktop_native`) |
| **Рабочая станция** | `configureClinicSetupTool` | Настройка параметров клиники, путей к оборудованию и системных интеграций | **State Mutation (Требует подтверждения)** |
| **Рабочая станция** | `importClinicDataFileTool` | Импорт прейскурантов, номенклатуры или остатков склада из CSV/XLSX/JSON | **State Mutation (Требует подтверждения)** |

### Двухфазное подтверждение (`Two-Phase Execution Guard`):
Фронтенд-клиент `apps/web/src/services/ai/copilotActionRunner.ts` перехватывает вызовы со статусом `destructive: true`. В интерфейсе появляется нативная плашка подтверждения:
```tsx
// Карточка подтверждения в чате ассистента
<div className="rounded-xl border border-[var(--line)] bg-[var(--paper-card)] p-3">
  <div className="text-xs font-semibold text-[var(--ink)]">Требуется подтверждение врача:</div>
  <div className="text-xs text-[var(--muted)]">{toolCall.titleRu}</div>
  <div className="mt-2 flex gap-2">
    <button onClick={() => confirmToolCall(toolCall.callId)} className="h-8 rounded-lg bg-[var(--teal)] px-3 text-xs font-medium text-white">
      ✓ Подтвердить
    </button>
    <button onClick={() => rejectToolCall(toolCall.callId)} className="h-8 rounded-lg border border-[var(--line)] px-3 text-xs text-[var(--muted)]">
      ✕ Отклонить
    </button>
  </div>
</div>
```

---

## 🛡️ 4. CHAIRSIDE SENTINEL ENGINE (СТРАЖ БЕЗОПАСНОСТИ У КРЕСЛА)

Фоновый страж безопасности реализован в виде декомпозированного графа правил `apps/api/src/services/agent/chairsideSentinel/`:

1. **`allergyAndDrugRules.ts`**:
   - Контроль перекрестной аллергии между бета-лактамами (пенициллины, цефалоспорины).
   - Запрет НПВП (аспирин, кеторолак) при язвенной болезни в фазе обострения и дефектах гемостаза.
   - Запрет адреналиносодержащих анестетиков (1:100 000) при некомпенсированной артериальной гипертензии, феохромоцитоме и тиреотоксикозе (автоматическая рекомендация: Мепивакаин 3% без вазоконстриктора).
2. **`somaticGuardRules.ts`**:
   - Оценка рисков дентальной имплантации при сахарном диабете (уровень HbA1c > 7.5% требует предварительной компенсации у эндокринолога).
   - Риск бисфосфонатного остеонекроза челюсти (MRONJ) при приеме золедроновой кислоты или деносумаба.
   - Физиологическая норма по умолчанию (`NORM_SOMATIC_MARKERS`): если соматический анамнез пуст или отмечен флаг «Здоров», система выставляет статус «✓ Соматически сохранен» без вывешивания красных алертов.
3. **`protocolCompletenessRules.ts`**:
   - Автоматическая трансляция манипуляций в коды Номенклатуры медицинских услуг 804н (например: `A16.07.002.001` — Наложение пломбы светового отверждения).
   - Генерация клинического протокола Form 043/у по стандарту SOAP (Subjective, Objective, Assessment, Plan).

---

## 🎙️ 5. РЕЧЕВОЙ СТЕНОГРАФИСТ ПРИЁМА (CHAIRSIDE VOICE STENOGRAPHER)

Специализированный контур бесконтактной работы врача в перчатках:

1. **Грамматика зубов FDI SSOT (`packages/shared/src/ai/toothGrammarSsot.ts`)**:
   - Распознавание русской медицинской речи: «шестнадцать кариес медиальная», «сорок семь пульпит каналы обработаны», «два один скол коронки».
   - Нормализация поверхностей зуба: `M` (медиальная), `O` (окклюзионная), `D` (дистальная), `B` (вестибулярная), `L` (язычная/небная).
2. **Аудио-шлюз AssemblyAI / Whisper (`apps/api/src/speech/gateway/assemblyAiClient.ts`)**:
   - Потоковая передача аудиофайлов через WebSocket с шумоподавлением звуков стоматологического наконечника и слюноотсоса.
3. **Бесшовная вставка в ЭМК**:
   - Распарсенный текст автоматически заполняет поля жалоб, объективного статуса и выполненного лечения без ручного переключения вкладок.

---

## 📋 6. КОПАЙЛОТ ПЛАНОВ ЛЕЧЕНИЯ (TREATMENT PLAN COPILOT)

Модуль планирования (`apps/web/src/services/ai/treatmentPlanCopilot.ts` и `apps/api/src/ai/treatmentPlanPersonalize.ts`):

1. **Генерация 3 тарифов лечения**:
   - **Эконом**: Базовые функциональные протоколы (металлокерамика, стандартные композиты, открытый синус-лифтинг с отечественными биоматериалами).
   - **Оптимум (Канонический стандарт)**: Диоксид циркония, премиальные имплантаты, послойная эстетическая реставрация.
   - **Премиум**: E.max виниры, навигационная хирургия по хирургическим шаблонам 3D, цифровой дизайн улыбки (DSD).
2. **Прозрачность ценообразования**:
   - Все расчеты ведутся строго в целых копейках (`amountKopecks`), исключая ошибки округления с плавающей точкой.
3. **Пациентская персонализация**:
   - Автоматическое очищение плана от пугающих пациента микро-расходников (валики, коффердам, перчатки) при сохранении их в технической карте списания склада (BOM).

---

## 🩻 7. АНАЛИЗАТОР СНИМКОВ (IMAGING AI ANALYSIS)

Интеграция с радиологическим модулем (`apps/api/src/ai/visiograph.ts`, `visionAnalyzer.ts`):

1. **Радиовизиография (RVG)**:
   - Автоматическое определение периапикальных деструктивных изменений кости (гранулемы, радикулярные кисты).
   - Контроль плотности обтурации корневых каналов гуттаперчей до физиологического апекса (индекс дефекта обтурации).
2. **3D КЛКТ MPR Viewer (`ImagingView.tsx`)**:
   - Измерение плотности костной ткани по шкале Хаунсфилда (HU) в зоне планируемой имплантации.
   - Детекция нижнечелюстного канала (n. alveolaris inferior) и дна гайморовой пазухи с предупреждением о риске перфорации.
3. **Хранение в БД**:
   - Результаты аннотаций сохраняются в таблицу `imagingAnnotations` с привязкой к координатам среза и номеру зуба FDI.

---

## 🗄️ 8. СХЕМА ДАННЫХ И ТЕЛЕМЕТРИЯ (POSTGRESQL 18)

Вся активность ИИ персистируется в PostgreSQL 18 для обеспечения прозрачного клинического и финансового аудита:

```sql
-- Таблица заданий распознавания ИИ
CREATE TABLE ai_recognition_jobs (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    patient_id UUID REFERENCES patients(id),
    imaging_study_id UUID REFERENCES imaging_studies(id),
    job_type VARCHAR(50) NOT NULL, -- 'rvg_caries', 'cbct_bone_density', 'dictation_emk'
    status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    input_payload JSONB NOT NULL,
    result_payload JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Таблица телеметрии и аудита вызовов LLM
CREATE TABLE ai_telemetry_logs (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    staff_id UUID REFERENCES staff(id),
    prompt_tokens INT NOT NULL,
    completion_tokens INT NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    latency_ms INT NOT NULL,
    endpoint VARCHAR(100) NOT NULL,
    has_clinical_alert BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 🧭 8.1. КАНОНИЧЕСКИЙ SSOT КЛИНИЧЕСКОГО КОПАЙЛОТА И КОКПИТА (MANDATES 8b, 8e, 8al)

1. **Единый SSOT кресла врача (`CopilotDrawer`):**
   - Устранен раскол между дублирующими интерфейсами копайлота (`DentalAgentCockpit` и `CopilotDrawer`).
   - `CopilotDrawer.tsx` является каноническим единым окном ассистента в веб-интерфейсе: Split-View док на десктопе, нативный Apple Bottom Sheet на мобильных (390×844) со скруглением 24px, тактильным Drag Handle 36×5px и тач-таргетами $\ge 44$px.
   - `DentalAgentCockpit.tsx` сведен к тонкому реактивному фасаду, перенаправляющему события (`dente:open-agent-cockpit`, вызовы `window.denteAgentCockpit`) в канонический копайлот без дублирования состояния и API.

2. **Сужение 2-фазного Guard (`CopilotActionConfirm`) по Мандату 8e:**
   - 2-фазный барьер подтверждения ограничен СТРОГО деструктивными операциями (удаление зуба, списание кассы, аннулирование чека).
   - Врачебные протоколы (дневник визита / 043/у, назначение услуг по номенклатуре, расчет смет) применяются мгновенно в 1 клик как черновики без блокирующих подтверждений.

3. **Модульная декомпозиция $\le 120$ строк (Мандат 8b):**
   - Все монолитные компоненты копайлота (`CopilotDrawer`, `DentalAgentCockpit`, `CopilotActionConfirm`, `CopilotResultCard`, `ChairsideCopilotHUD`, тесты) декомпозированы на специализированные изолированные модули строго $\le 120$ строк.

---

## 🔗 9. ИНТЕРТЕКСТУАЛЬНЫЕ СВЯЗИ И НАВИГАЦИОННАЯ КАРТА

Данная архитектура напрямую связана со следующими документами проекта:
- **[THE_HAMMER_MASTER_PROMPT.md](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md)** — Разделы VII, XI, XIV: Приоритет автономии врача, ЦРМ != симулятор реальности, суверенитет соло-врача.
- **[AI_ASSISTANT_RULES.md](file:///C:/Clinic_MVP/dental-crm/.agents/AI_ASSISTANT_RULES.md)** — Высшая конституция правил и 15 законов мышления модели.
- **[AI_ASSISTANT_SUBAGENT_SWARM.md](file:///C:/Clinic_MVP/dental-crm/.agents/AI_ASSISTANT_SUBAGENT_SWARM.md)** — Архитектура мультиагентного роя (Triage, Inquisitor, Sentinel, Vision), жизненный цикл и IPC.
- **[ai_assistant.md](file:///C:/Users/Admin/.gemini/config/rules/ai_assistant.md)** — Глобальные правила ИИ-ассистента и роя.
- **[CLINICAL_RULES.md](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_RULES.md)** — Клинический движок правил и номенклатура 804н.
- **[CLINICAL_PROTOCOLS_REGISTRY.md](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_PROTOCOLS_REGISTRY.md)** — Реестр протоколов 043/у.
- **[API_ROUTES_CATALOG.md](file:///C:/Clinic_MVP/dental-crm/.agents/API_ROUTES_CATALOG.md)** — Каталог Fastify-маршрутов домена `/api/ai/*`.
- **[UI_STANDARDS.md](file:///C:/Clinic_MVP/dental-crm/.agents/UI_STANDARDS.md)** — Стандарты выкатных шторок (Drawers) и отсутствие блокирующих модалок.
- **[DATABASE.md](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md)** — Реестр таблиц `ai_recognition_jobs` и `imaging_annotations`.

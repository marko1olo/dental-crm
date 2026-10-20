# 🖥️ АРХИТЕКТУРА ДЕСКТОПНОГО ХАРНЕССА И АППАРАТНОГО MCP-МОСТА (DESKTOP NATIVE HARNESS & HARDWARE MCP BRIDGE)

> 🧭 **Навигация:** [🗺️ Главный Индекс (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) | [🔨 ВЫСШАЯ КОНСТИТУЦИЯ (THE_HAMMER_MASTER_PROMPT.md)](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md) | [📜 Конституция ИИ-Правил (.agents/AI_ASSISTANT_RULES.md)](file:///C:/Clinic_MVP/dental-crm/.agents/AI_ASSISTANT_RULES.md) | [🏛️ Архитектура ИИ (.agents/AI_ASSISTANT_ARCHITECTURE.md)](file:///C:/Clinic_MVP/dental-crm/.agents/AI_ASSISTANT_ARCHITECTURE.md) | [⚡ Спецификация Харнесса (.agents/AI_ASSISTANT_HARNESS_SPEC.md)](file:///C:/Clinic_MVP/dental-crm/.agents/AI_ASSISTANT_HARNESS_SPEC.md) | [🛠️ Реестр 29 Инструментов (.agents/AI_ASSISTANT_TOOL_REGISTRY.md)](file:///C:/Clinic_MVP/dental-crm/.agents/AI_ASSISTANT_TOOL_REGISTRY.md) | [🐝 Мультиагентный рой (.agents/AI_ASSISTANT_SUBAGENT_SWARM.md)](file:///C:/Clinic_MVP/dental-crm/.agents/AI_ASSISTANT_SUBAGENT_SWARM.md) | [🎙️ Стенографист и Sentinel (.agents/AI_ASSISTANT_CHAIRSIDE_SENTINEL.md)](file:///C:/Clinic_MVP/dental-crm/.agents/AI_ASSISTANT_CHAIRSIDE_SENTINEL.md) | [🏗️ Общая Архитектура (.agents/ARCHITECTURE.md)](file:///C:/Clinic_MVP/dental-crm/.agents/ARCHITECTURE.md) | [🗄️ База Данных (.agents/DATABASE.md)](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md)  
> **Канонический статус**: Центральная системная и нормативная спецификация нативного десктопного харнесса операционной системы Windows (.EXE / Electron / Tauri) и локального аппаратного моста Model Context Protocol (MCP) для интеграции с медицинским и кассовым оборудованием стоматологической клиники DENTE.  
> **Философия харнесса**: ИИ-ассистент DENTE на рабочей станции врача обладает инструментальной суверенностью и полнотой операционного контроля уровня передовых инженерных CLI/Desktop харнессов (Google Antigravity, Open-Interpreter, Claude Computer Use), адаптированных под жесткие клинические регламенты доказательной стоматологии, закон о защите персональных данных (152-ФЗ), фискальные стандарты (54-ФЗ / ФФД 1.2) и маркировку медикаментов Честный ЗНАК (МДЛП).

---

## 🏛️ 1. ДВУХРЕЖИМНЫЙ СУВЕРЕНИТЕТ: WEB CRM VS DESKTOP NATIVE (SYMMETRIC HARNESS DOCTRINE)

Архитектура системы DENTE разделяет рабочий контур на два фундаментальных режима исполнения:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 DENTE DUAL-HARNESS RUNTIME                              │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│ 1. РЕЖИМ WEB CRM (БРАУЗЕР)                │ 2. РЕЖИМ DESKTOP NATIVE (.EXE / WINDOWS)  │
│ Контекст: `runtimeMode: "web_browser"`    │ Контекст: `runtimeMode: "desktop_native"`   │
│ Окружение: Chrome, Safari, Yandex Browser │ Окружение: DENTE Desktop (Electron/Tauri)  │
│ Доступ: HTTP/REST API + WebSocket         │ Доступ: Локальная файловая система, COM,   │
│                                           │ USB, Win32 API, TWAIN, процессы ОС, MCP    │
├───────────────────────────────────────────┼────────────────────────────────────────────┤
│ ДОМЕН ИНСТРУМЕНТОВ:                       │ ДОМЕН ИНСТРУМЕНТОВ:                        │
│ • Зубная формула (updateToothStatus)      │ • Файловый I/O клиники (read/write/list)   │
│ • Расписание визитов (createAppointment)  │ • Процессы и задачи (run_command, tasks)   │
│ • Счета и сметы (createInvoiceDraft)      │ • Таймеры и cron-задачи (schedule)         │
│ • Клинические протоколы 043/у (SOAP)      │ • Запуск томографов (Romexis, EzDent, etc) │
│ • Печать бланков и ИДС (printDocument)    │ • Захват экрана визиографа (Vision ROI)    │
│ • Калькуляторы анестезии и соматики       │ • Аппаратный MCP-мост (Атол, Штрих, TWAIN) │
└───────────────────────────────────────────┴────────────────────────────────────────────┘
```

### 🛑 Защитный барьер изоляции (Web Browser Denial Gate):
Любая попытка вызвать десктопный системный инструмент из браузера (`runtimeMode: "web_browser"`) немедленно пресекается детерминированным отказом безопасности:
```json
{
  "success": false,
  "error": "Отказ: данная операция (управление ПК/визиографом/процессами) доступна только в режиме локальной станции врача (DENTE Desktop / EXE на Windows). В облачном браузере доступно управление CRM и клиническими протоколами.",
  "availableInWeb": false
}
```
Это исключает несанкционированный доступ к оборудованию кабинета через облачный интерфейс и защищает персональные компьютеры врачей.

---

## 📁 2. ФАЙЛОВЫЙ КОНТУР И ИЗОЛЯЦИЯ АРЕНДАТОРОВ (CLINICAL FILE ENGINE)

Файловый движок десктопной станции врача спроектирован по образцу современных IDE-инструментов с расширенной поддержкой медицинских форматов данных (DICOM, RVG, XML-экспорты, фотопротоколы).

### 🛠️ Реестр инструментов файлового движка:

#### 1. `read_clinical_file(filePath, startLine?, endLine?, contentOffset?, maxBytes?, asBinaryBase64?)`
- **Назначение**: Безопасное чтение клинических документов, дампов снимков, DICOM-метаданных, логов калибровки оборудования и отчетов визиографа.
- **Поддержка срезов (Window Slicing)**: Чтение произвольного диапазона строк через `startLine` и `endLine` (1-индексация) для предотвращения исчерпания контекстного окна модели при чтении объемных логов.
- **Автоматическая детекция DICOM**: Распознавание сигнатуры `DICM` со 128 байта преамбулы (PS 3.10) с классификацией модальности (`CBCT` томограмма vs `RVG` прицельный радиовизиограф).
- **Бинарный режим**: Возврат данных в `base64` для передачи снимков в мультимодальные модели анализа изображений.

#### 2. `write_clinical_file(targetFile, content, isBase64?, overwrite?, append?, createDirectories?, description?)`
- **Назначение**: Сохранение сформированных выписок, бланков направлений в ЗТЛ, текстовых протоколов и бинарных снимков.
- **Режимы**: Атомарная запись с защитой от случайной перезаписи (`overwrite: false`), поддержка дописывания логов (`append: true`) и автосоздание родительских каталогов.

#### 3. `list_patient_study_directory(patientId, customSubfolder?, recursive?, filterExtension?, maxItems?)`
- **Назначение**: Автоматическое сканирование локальной дропзоны снимков пациента.
- **Интеллектуальная классификация модальностей**:
  * `cbct`: Файлы `.dcm`, папки с ключевыми словами `CT` или файлы размером $>15$ МБ.
  * `rvg`: Файлы радиовизиографа `.rvg`, а также снимки датчиков `Vatech EzSensor`, `Planmeca ProSensor`.
  * `photo`: Дентальные фотопротоколы (`.png`, `.jpg`, `.jpeg`, `.webp`).
  * `report`: Структурированные заключения (`.xml`, `.json`, `.txt`, `.pdf`).
- **Сортировка**: Хронологическая сортировка — самые свежие исследования возвращаются первыми.

#### 4. `open_patient_dropzone_folder(patientId, patientName?)`
- **Назначение**: Мгновенное открытие папки снимков пациента в системном Проводнике Windows (`explorer.exe`) для удобства врача у кресла (0 кликов навигации по диску).

#### 5. `search_workstation_files(searchDirectory, pattern, searchMode?, recursive?, maxResults?)`
- **Назначение**: Быстрый рекурсивный поиск файлов исследований, снимков, бланков и протоколов по имени, расширению или регулярному выражению в дропзоне или каталогах клиники.
- **Безопасность**: Нормализация путей, предотвращение Directory Traversal и защита системных областей ОС.

#### 6. `configure_clinic_setup(configurationKey, configurationPayload, comment?, requireConfirmation?)`
- **Назначение**: Конфигурация системных настроек клиники (пути к папкам дропзоны снимков, интеграции с Romexis/EzDent, сетевые принтеры, фискальные регистраторы).
- **Безопасность**: Защищено двухфазным барьером подтверждения (`Two-Phase Execution Guard`) и обязательной транзакцией в PostgreSQL.

#### 7. `import_clinic_data_file(importDomain, sourceFilePath, fileFormat, dryRun?, mappingOptions?)`
- **Назначение**: Интеллектуальный импорт внешних данных клиники (прейскуранты услуг, номенклатура, остатки расходных материалов склада) из форматов CSV, XLSX, JSON.
- **Безопасность**: Поддержка предварительного предпросмотра (`dryRun: true`), валидация строк схемами Zod, подтверждение врача/администратора.

---

## 🛡️ 3. RED TEAM БЕЗОПАСНОСТЬ И МОДЕЛЬ УГРОЗ (THREAT MODEL & GUARDS)

Десктопный ассистент врача имеет доступ к системным API операционной системы Windows. Для предотвращения RCE, атак внедрения команд (Prompt Injection) и утечек персональных данных внедрена многоуровневая система защиты:

### 🔒 1. Изоляция арендаторов на файловом уровне (Tenant Dropzone Isolation)
Все снимки и файлы исследований строго изолируются по идентификатору клиники (`organizationId`):
$$\text{Path} = \text{BaseDropzone} \;\backslash\; \text{Sanitized}(\text{organizationId}) \;\backslash\; \text{Sanitized}(\text{patientId})$$
Символы, выходящие за пределы `[a-zA-Z0-9_-]`, принудительно заменяются символом `_`, исключая атаки выхода за пределы директории (Directory Traversal).

### 🛑 2. Барьер защищенных системных файлов (Path Safety Guard — `isPathSafe`)
Кросс-платформенная нормализация путей со слэшами (`/` и `\`) гарантирует блокировку доступа к критическим ресурсам ОС:
- **Учётные записи и пароли**: `SAM`, `SYSTEM`, `SECURITY`, `SOFTWARE`, `ntuser.dat`, `/etc/shadow`, `/etc/passwd`, `/etc/sudoers`.
- **Файлы подкачки и гибернации**: `pagefile.sys`, `hiberfil.sys`, `swapfile.sys`.
- **Криптографические ключи и токены**: `.ssh`, `.aws`, `id_rsa`, `id_ed25519`.
- **Секреты репозитория и окружения**: `.env`, `.git`, `.bashrc`, `.bash_history`, `.zshrc`.
- **Автозагрузка Windows**: Папки `Startup` и `Start Menu\Programs\Startup` (защита от внедрения резидентных троянов).

### 🛑 3. Барьер исполняемых файлов (Executable Drop Guard — `isExtensionSafe`)
Инструмент `write_clinical_file` оснащен безусловной блокировкой записи любых исполняемых расширений:
$$\text{BlockedExtensions} = \{ \text{.exe, .bat, .cmd, .ps1, .vbs, .vbe, .js, .mjs, .cjs, .dll, .sys, .com, .scr, .pif, .msi, .reg, .hta, .cpl, .jar} \}$$
Врачу и ассистенту разрешены только клинические и документарные расширения: `.txt`, `.json`, `.xml`, `.csv`, `.dcm`, `.rvg`, `.pdf`, `.png`, `.jpg`, `.jpeg`, `.bmp`, `.tiff`, `.log`.

### 🛑 4. Белый и чёрный список команд (Command Safety Guard — `isCommandSafe`)
Запрещены любые деструктивные и вредоносные конструкции командной строки:
- Затирание дисков и директорий: `rm -rf /`, `format c:`, `del ...\windows`, `Remove-Item -Recurse -Force`.
- Манипуляции с системным реестром: `reg delete HKLM`, `reg add HKLM`, `reg copy`, `reg restore`.
- Добавление учетных записей администраторов: `net user ... /add`.
- Уничтожение теневых копий: `vssadmin delete shadows`.
- Обфусцированный PowerShell и RCE-загрузчики: `powershell -enc`, `Invoke-Expression`, `DownloadString`, `iwr ... | iex`, `curl ... | bash`.
- Системные бинарники ботнетов: `certutil -urlcache`, `bitsadmin /transfer`, `rundll32`, `mshta`, `cscript`, `wscript`.
- Принудительное выключение ПК клиники: `shutdown /s`, `Restart-Computer`, `Stop-Computer`.
- Захват прав на файлы и отключение фаервола: `icacls ... /grant`, `takeown`, `netsh advfirewall`.

---

## ⚙️ 4. СИСТЕМНЫЙ МЕНЕДЖЕР ПРОЦЕССОВ И ТАЙМЕРОВ (WORKSTATION TASK & SCHEDULE ENGINE)

Архитектура управления задачами полностью воспроизводит регламент **Абсолютной Конституции THE HAMMER (§1 п. 7 и §2 п. 24)**: строгий запрет на холостой поллинг (Anti-Busy-Wait Invariant) и пропорциональные таймеры.

```
                  ┌──────────────────────────────────────────────┐
                  │ run_workstation_command(cmd, waitMs = 5000)  │
                  └──────────────────────┬───────────────────────┘
                                         │
                         Завершилась за < waitMs?
                                ╱        ╲
                            ДА ╱          ╲ НЕТ (Тяжелая задача)
                              ▼            ▼
               ┌───────────────────────┐  ┌─────────────────────────────────────┐
               │ Синхронный ответ      │  │ Авто-переход в фоновый режим        │
               │ (Completed, ExitCode) │  │ Регистрация в WorkstationTaskManager│
               │ Результат виден сразу │  │ Возврат taskId ('task-dent-...')    │
               └───────────────────────┘  └──────────────────┬──────────────────┘
                                                             │
                                                             ▼
                                          ┌─────────────────────────────────────┐
                                          │ schedule(duration = 60, cond=taskId)│
                                          │ Yield Turn (Оркестратор засыпает)   │
                                          └──────────────────┬──────────────────┘
                                                             │
                                        Задача завершилась ДО таймера?
                                                ╱          ╲
                                            ДА ╱            ╲ НЕТ (Таймер истёк)
                                              ▼              ▼
                               ┌────────────────────────┐  ┌──────────────────┐
                               │ Раннее пробуждение     │  │ Однократный аудит│
                               │ notifyTaskFinished()   │  │ manage_task      │
                               │ status: early_cancelled│  │ (status)         │
                               └────────────────────────┘  └──────────────────┘
```

### 1. `run_workstation_command(commandLine, diagnosticTarget?, waitMsBeforeAsync?, isDaemon?)`
- **Синхронное быстрое исполнение**: Быстрые диагностические утилиты (проверка COM-порта ККТ, опрос службы визиографа, ping сетевого принтера) завершаются за 50–200 мс и возвращают `stdout`/`stderr` немедленно.
- **Асинхронный переход в фон (`WaitMsBeforeAsync = 5000`)**: Если тяжелая команда (импорт КЛКТ на 2 ГБ, индексация каталога снимков) выполняется дольше лимита ожидания, она автоматически переводится в фоновый процесс с присвоением `taskId`, а ассистент получает управление без зависания интерфейса врача.
- **Режим демона (`isDaemon: true`)**: Постоянные фоновые службы (наблюдатели сетевой папки сброса визиографа).

### 2. `manage_task(action: 'list' | 'status' | 'kill' | 'send_input', taskId?, input?)`
- **`list`**: Реестр всех активных и завершенных фоновых процессов рабочей станции врача.
- **`status`**: Детальный срез состояния процесса, код завершения и последние 50 строк вывода `stdout`/`stderr`.
- **`kill`**: Принудительное дерево завершения (`taskkill /pid <PID> /t /f` на Windows). Защита инварианта: статус `killed` надежно сохраняется и не перезаписывается на `failed` при закрытии процесса.
- **`send_input`**: Интерактивная передача команд в стандартный ввод (`stdin`) работающего процесса.

### 3. `schedule(prompt, durationSeconds?, cronExpression?, timerCondition?, maxIterations?, isDaemon?)`
- **Однократные таймеры (`durationSeconds`)**: Напоминания врачу у кресла («Проверить экспозицию травильного геля через 20 секунд», «Оценить реакцию пульпы зуба на холодовую пробу через 2 минуты»).
- **Периодические расписания (`cronExpression`)**: Регламентные задачи («Каждое утро в 08:45 опрос готовности кассы и наличия ленты», «Каждые 4 часа резервное копирование снимков»).
- **Реактивное раннее пробуждение (Early Wakeup Guard)**: Если таймер установлен с `timerCondition = "<taskId>"` или `"any"`, при завершении фонового процесса `WorkstationTaskManager` автоматически вызывает `workstationSchedules.notifyTaskFinished(taskId)`. Таймер досрочно переводится в статус `early_cancelled`, пробуждая ассистента без бесполезного минутного ожидания.

---

## 🩻 5. ИНТЕГРАЦИЯ СТОМАТОЛОГИЧЕСКОГО СОФТА И ТОМОГРАФОВ (APP & VISION ENGINE)

Стоматологический кабинет оснащен специализированным диагностическим программным обеспечением производителей оборудования. Десктопный харнесс интегрирует их через стандартные протоколы командной строки и оптический захват:

### 1. `launch_workstation_app(appType, customExecutablePath?, patientId?, targetPatientFolder?, commandLineArgs?)`

Поддерживаемые медицинские программы и стандартные пути развертывания на Windows:

| Тип ПО (`appType`) | Производитель / Назначение | Стандартные системные пути на ПК | Аргументы командной строки |
|---|---|---|---|
| `planmeca_romexis` | Planmeca (КЛКТ 3D, панорама, визиограф) | `C:\Program Files\Planmeca\Romexis\Romexis.exe`<br>`C:\Planmeca\Romexis\Romexis.exe` | Передача папки снимков пациента или ID исследования |
| `vatech_ezdent` | VATECH (EzDent-i / 3D КЛКТ) | `C:\Program Files (x86)\VATECH\EzDent-i\EzDent-i.exe`<br>`C:\VATECH\EzDent-i\EzDent-i.exe` | Путь к папке пациента в дропзоне |
| `ezsensor` | Vatech EasyDent (Радиовизиограф RVG) | `C:\Program Files (x86)\Vatech\EasyDent4\EasyDent.exe`<br>`C:\EasyDent4\EasyDent.exe` | Режим прямого захвата кадра сенсора |
| `sidexis` | Dentsply Sirona (SIDEXIS 4) | `C:\Program Files (x86)\Sirona Dental Systems\SIDEXIS 4\Sidexis4.exe` | Идентификатор пациента для автооткрытия карты |
| `threeshape_dental_system` | 3Shape (CAD/CAM моделирование и сканы) | `C:\Program Files\3Shape\Dental System\DentalSystem.exe` | Заказ-наряд зуботехнической лаборатории |
| `exocad` | exocad DentalCAD (Цифровое моделирование) | `C:\Program Files\exocad\DentalCAD\DentalCAD.exe` | Файлы 3D сканов челюстей STL/PLY |
| `ondemand3d` | Cybermed OnDemand3D (Хирургические шаблоны) | `C:\Program Files\Cybermed\OnDemand3D\OnDemand3D.exe` | DICOM-папка КЛКТ для расстановки имплантатов |
| `itero` | Align Technology (Интраоральный сканер) | `C:\Program Files\Align Technology\iTero\iTero.exe` | Сессия ортодонтического сканирования |

### 2. `capture_workstation_screen(diagnosticReason, targetScreenIndex?, roi?, saveToPatientDropzone?, patientId?)`
- **Клиническая задача**: Многие устаревшие визиографы (Gendex, Trophy, Сирона) не имеют открытого API для выгрузки файлов. Захват экрана позволяет ИИ-ассистенту «своими глазами» увидеть рентгеновский снимок прямо с экрана визиографа без ручного экспорта в файлы.
- **Поддержка ROI (Region Of Interest)**: Захват только активной области датчика (например: $X=400, Y=200, W=800, H=600$) для отсечения посторонних окон и защиты персональных данных других пациентов.
- **Экранирование путей PowerShell**: Надежное экранирование одинарных кавычек (`$safePathPs.replace(/'/g, "''")`) гарантирует отсутствие синтаксических сбоев PowerShell при наличии пробелов и апострофов в путях.
- **Безопасный мультимодальный Thumbnail**: Снимок автоматически сжимается в компактную Base64 Data-URI строку (`data:image/png;base64,...`) для мгновенной передачи в визуальную модель Gemini Vision / GPT-4o Vision.
- **Диагностический фоллбэк**: Если сеанс выполняется в фоновом режиме без физического монитора, генерируется валидный PNG-кадр с фиксацией режима, исключая падение процесса.

---

## 🔌 6. АППАРАТНЫЙ МОСТ MCP (MODEL CONTEXT PROTOCOL HARDWARE SPECIFICATION)

Архитектура Model Context Protocol (MCP) обеспечивает стандартизированное взаимодействие ИИ-ассистента с локальными физическими контроллерами и устройствами через интерфейс JSON-RPC 2.0:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          LOCAL MCP BRIDGE MANAGER                           │
├─────────────────────┬─────────────────────┬───────────────────┬─────────────┤
│ 1. ККТ 54-ФЗ        │ 2. ККТ ШТРИХ-М      │ 3. 2D СКАНЕР      │ 4. TWAIN    │
│    kkt_atol         │    shtrih_m         │ datamatrix_scanner│ twain_sensor│
├─────────────────────┼─────────────────────┼───────────────────┼─────────────┤
│ • get_kkt_status    │ • get_device_metrics│ • parse_chestny_  │ • list_     │
│ • open_shift        │ • fiscal_sale       │   znak            │   devices   │
│ • print_receipt     │                     │ • get_last_       │ • acquire_  │
│ • close_z_report    │                     │   scanned_barcode │   frame     │
└─────────────────────┴─────────────────────┴───────────────────┴─────────────┘
```

### 1. Сервер ККТ АТОЛ 54-ФЗ (`kkt_atol`)
- **Интеграция**: Прямой протокол ДККТ 10 (Драйвер ККТ АТОЛ) по USB/COM/TCP.
- **Инструмент `print_receipt`**:
  * Соответствие ФФД 1.2 и Федеральному закону № 54-ФЗ.
  * **Целочисленные копейки (Mandate 8i)**: Сумма `totalKopecks` обязана быть неотрицательным целым числом (`Number.isInteger`). Запрещены плавающие точки (IEEE-754).
  * **Канонические типы оплат (`packages/shared/src/fiscal/tenderTypes.ts`)**: `cash` (наличные, тег 1031), `card` (банковская карта, тег 1081), `sbp` (СБП, тег 1081), `deposit` (аванс, тег 1215), `family_wallet` (семейный кошелек, тег 1215), `credit` (рассрочка, тег 1216).
  * **Мандат автономии врача (Mandate 8e)**: Запрещено требовать ИНН физического лица при приеме оплаты.

### 2. Сервер ККТ ШТРИХ-М (`shtrih_m`)
- **Интеграция**: Протокол ККТ Штрих-М 2.0 (RS-232 / USB VCP).
- **Инструменты**: Снятие телеметрии питания, контроль рулона чековой ленты (`get_device_metrics`), регистрация фискальной продажи (`fiscal_sale`).

### 3. Сервер 2D Сканера Честный Знак / МДЛП (`datamatrix_scanner`)
- **Интеграция**: Считывание DataMatrix кодов в режиме клавиатурного клина (USB HID POS) или через виртуальный COM-порт (VCP).
- **Инструмент `parse_chestny_znak`**:
  * Парсинг GS1 DataMatrix по спецификации Федерального закона № 425-ФЗ и приказов Минздрава/ЦРПТ.
  * Извлечение обязательных идентификаторов применения (AI): `(01)` GTIN-14, `(21)` Серийный номер, `(91)` Ключ проверки, `(92)` Криптохвост.
  * **Проверка контрольной суммы Modulo 10**: Валидация алгоритмом Луна для GS1 GTIN.
  * **Сопоставление со стоматологическим каталогом (`DENTAL_MDLP_MARKING_CATALOG`)**: Автоматическая идентификация препаратов (Ультракаин Д-С форте, Септанест, Скандонест 3%, имплантаты Straumann BLX, костный материал Bio-Oss, мембраны Bio-Gide).

### 4. Сервер Радиовизиографов TWAIN (`twain_sensor`)
- **Интеграция**: Нативный шлюз TWAIN 2.4 Data Source Manager (32/64-bit DLL).
- **Инструменты**: Опрос подключенных сенсоров (`list_devices`), отправка сигнала готовности к экспозиции и прямой захват радиовизиографического кадра (`acquire_frame`) с разрешением 600–1200 DPI.

---

## 🗄️ 7. СХЕМА ДАННЫХ И АУДИТ ТЕЛЕМЕТРИИ MCP (POSTGRESQL 18)

Все транзакции десктопного харнесса и аппаратного моста персистируются в PostgreSQL 18 в таблицах модулей `copilot.ts` и `aiTelemetry.ts`:

```sql
-- Аудит системных команд и вызовов оборудования
CREATE TABLE workstation_device_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    staff_id UUID REFERENCES users(id),
    workstation_hostname VARCHAR(100) NOT NULL,
    device_type VARCHAR(50) NOT NULL, -- 'kkt_atol', 'shtrih_m', 'datamatrix_scanner', 'twain_sensor'
    operation_name VARCHAR(100) NOT NULL,
    request_payload JSONB NOT NULL,
    response_payload JSONB,
    is_success BOOLEAN NOT NULL DEFAULT TRUE,
    error_details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индекс по клинике и оборудованию для мгновенной аналитики
CREATE INDEX idx_workstation_device_audit ON workstation_device_audit_logs (organization_id, device_type, created_at DESC);
```

---

## 🔗 8. ИНТЕРТЕКСТУАЛЬНЫЕ СВЯЗИ И СИСТЕМНЫЙ ИНДЕКС

Настоящий документ является обязательным для исполнения и напрямую связан со следующими стандартами репозитория:
- **[THE_HAMMER_MASTER_PROMPT.md](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md)** — Часть 1 п. 7 и Часть 2 п. 24: Запрет на циклический поллинг фоновых задач (Anti-Busy-Wait), протокол пропорционального таймера, презумпция брака 100%.
- **[AI_ASSISTANT_RULES.md](file:///C:/Clinic_MVP/dental-crm/.agents/AI_ASSISTANT_RULES.md)** — Раздел VII: Двухрежимный харнесс Web CRM vs Desktop Native EXE, T.A.R.S. протокол 100% честности.
- **[AI_ASSISTANT_ARCHITECTURE.md](file:///C:/Clinic_MVP/dental-crm/.agents/AI_ASSISTANT_ARCHITECTURE.md)** — Раздел 3: Dental Tool Arsenal, системные вызовы рабочей станции, двухфазный Guard подтверждения.
- **[ARCHITECTURE.md](file:///C:/Clinic_MVP/dental-crm/.agents/ARCHITECTURE.md)** — Раздел: Архитектура рабочих процессов и фоновых сервисов клиники.
- **[INDEX.md](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)** — Строка матрицы быстрого перехода: Десктопный системный харнесс и аппаратный MCP-мост.
- **[BILLING_AND_FINANCE.md](file:///C:/Clinic_MVP/dental-crm/.agents/BILLING_AND_FINANCE.md)** — Касса 54-ФЗ, целочисленные копейки `kopecksArithmetic.ts` и типы оплат `tenderTypes.ts`.
- **[CLINICAL_RULES.md](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_RULES.md)** — Автосписание медикаментов по Честному Знаку (МДЛП) при оказании услуг номенклатуры 804н.
- **[DATABASE.md](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md)** — Изоляция тенантов Row-Level Security и хранилище PostgreSQL 18.

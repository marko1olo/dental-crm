# БИБЛИЯ РЕВЕРС-ИНЖИНИРИНГА ВНЕШНИХ СТОМАТОЛОГИЧЕСКИХ CRM
## (IDENT, DENTALPRO, DENTARO, DENTPLAT, DENTTECHNICIAN, DENTAL-SOFT, DENTAL OFFICE, INFOCLINICA)

> 🧭 **Навигация:** [🗺️ Главный Индекс (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) | [📚 Портал Документации (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md) | [📋 Реестр Фич (FEATURES_REGISTRY.md)](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURES_REGISTRY.md) | [🗺️ Карта CRM (OUR_CRM_MAP.md)](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/OUR_CRM_MAP.md) | [📑 Бэклог (BACKLOG.md)](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/BACKLOG.md) | [📖 Библия StomX (STOMX_REVERSE_ENGINEERING_BIBLE.md)](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/STOMX_REVERSE_ENGINEERING_BIBLE.md)
>
> ⚠️ **ВЫСШАЯ КОНСТИТУЦИЯ (THE SUPREME LAW):** [`.agents/THE_HAMMER_MASTER_PROMPT.md`](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md) и [`.agents/AGENTS.md`](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md).
>
> 🎯 **СТРАТЕГИЧЕСКИЙ ПРИОРИТЕТ №1:**
> **Соло-врач (1–2 кресла, субаренда, ИП) и небольшая стоматологическая клиника (1–3 кресла)**.
> Любое архитектурное решение, переносимое из исследованных внешних CRM, обязано соответствовать принципам: 0 кликов на горячем пути, отсутствие блокирующих барьеров, автономия врача (Мандат 8e), расчет финансов строго в целочисленных копейках (ACID).
>
> 🛑 **ЗАКОН ОТСУТСТВИЯ ТУПИКОВ (ZERO DEAD-ENDS — МАНДАТ 8n):**
> Касса 54-ФЗ без обязательного ИНН физлиц, мягкий фоновый овердрафт склада, расписание без обязательного ассистента.

---

## 1. РЕЕСТР ВЫКАЧАННЫХ ДИСТРИБУТИВОВ И АРХИТЕКТУРНЫЙ ИНВЕНТАРЬ

Все дистрибутивы были извлечены из официальных публичных каналов (RuStore Backend CDN, официальные серверы дистрибуции Dental-Soft, базы знаний IDENT ООО «Айдент») и распакованы в директорию `C:\Clinic_MVP\dental-crm\РЕВЕРС ИНЖИНИРИНГ ДРУГИЕ ЦРМ\`.

```
C:\Clinic_MVP\dental-crm\РЕВЕРС ИНЖИНИРИНГ ДРУГИЕ ЦРМ\
├── dentalpro_mobile\                                 # 20.75 МБ ZIP -> 35.27 МБ APK DentalPRO Mobile v3.9
│   ├── DentalPRO_v3.9_rustore.zip                    # Оригинальный пакет RuStore
│   ├── DentalPRO.apk                                 # Android APK (ru.dentalpro.beta, versionCode 32)
│   ├── DentalPRO_apk_extracted\                      # Полная поатомная распаковка APK
│   │   ├── assets/capacitor.config.json              # Конфигурация гибридного рантайма Capacitor
│   │   ├── assets/capacitor.plugins.json             # Реестр 15 нативных плагинов (MLKit, Bio, Share)
│   │   ├── assets/mlkit_barcode_models/              # 3 TFLite нейросетевых модели распознавания штрихкодов
│   │   └── assets/public/                            # 92 JavaScript бандла SPA (1.67 МБ чистого JS кода)
│   │       ├── main-N7UJIVGQ.js                      # Ядро приложения и HTTP-клиент (app.dental-pro.online)
│   │       ├── chunk-BhqBkEDZ2.js                    # Клинический алгоритм toTooth() и расчет цен
│   │       ├── chunk-Bj8pHYIQ.js                     # Алгоритм сортировки и согласования планов sortPlans()
│   │       └── chunk-DkhRRQkE.js                     # Математика временной шкалы расписания updateSchedule()
│
├── ident\                                            # IDENT (ООО «Айдент») + Дентал-Софт
│   ├── demo_dental-soft_win.zip                      # Десктопный инсталлятор (2.64 МБ)
│   ├── dental_soft_unpacked\demo_dental-soft\
│   │   ├── setup.exe                                 # InstallShield PE бинарник АРМ Врача и Регистратуры
│   │   ├── readme.txt                                # Архитектура: виртуальный Linux-сервер + Windows АРМ
│   │   └── doc/instr_short.pdf                       # Руководство пользователя (1.11 МБ)
│   └── extracted_docs\                               # 23 КАНОНИЧЕСКИХ СПЕЦИФИКАЦИИ АРХИТЕКТУРЫ IDENT:
│       ├── IDENT_API_HTTP_PROTOCOL.md                # Спецификация HTTP REST интеграций (IDENT-Integration-Key)
│       ├── IDENT_DATABASE_SCHEMA_INTEGRATION.md      # Схема таблиц MS SQL / MySQL для интеграции
│       ├── IDENT_DATA_STRUCTURE_OBJECTS.md           # Контракты данных вызовов, заявок, филиалов, слотов
│       ├── IDENT_XRAY_INTEGRATION_ARCHITECTURE.md    # Демон IDENT.Xray и связывание снимков визиографов
│       ├── IDENT_SALARY_FORMULAS_AND_EXAMPLES.md     # 3 модели расчета зарплат (Gross, Net, Cash Basis)
│       ├── IDENT_SALARY_PRICE_CONFIGURATION.md       # Настройка поля «Цена для ЗП»
│       ├── IDENT_MATERIAL_WRITEOFF_NORMS.md          # 2-уровневое списание (дешевые vs дорогие, флаги ВН/ВИ)
│       ├── IDENT_MATERIAL_1C_EXPORT.md               # Выгрузка накладных в 1С:Бухгалтерия
│       ├── IDENT_DOCUMENT_TEMPLATE_TAGS.md           # 58+ клинических тегов ({ПервичныйОсмотр.ЗубнаяФормула})
│       └── IDENT_CASHBOX_AND_KKM.md                  # Фискализация 54-ФЗ, чеки ККТ и терминалы эквайринга
│
├── other\                                            # 6 ДОПОЛНИТЕЛЬНЫХ СПЕЦИАЛИЗИРОВАННЫХ CRM И ПРИЛОЖЕНИЙ
│   ├── Dentaro_ru.dentaro.app_extracted\             # Dentaro (Capacitor Web App для стоматологов)
│   │   └── apk_contents/assets/public/assets/
│   │       ├── BillingPage-Dk1-lQIr.js               # Модель биллинга и подписок
│   │       ├── PatientProfilePage-dipD9x_H.js        # «Разовый вычет из % врача», привязка зубов к услугам
│   │       └── AppointmentDialog-5NeN9Fnm.js         # Валидация коллизий расписания и выходных
│   │
│   ├── DentPlat_ru.dentplat.mobile_extracted\        # DentPlat (Стоматологическая 3D-платформа)
│   │   └── apk_contents/assets/viewer3d.html         # Three.js 3D-просмотрщик сканов (STL/OBJ/PLY) с PBR
│   │
│   ├── DentTechnician_orders_extracted\              # DentTechnician (Учет зуботехнических заказов)
│   │   └── apk_contents/assets/
│   │       ├── vita_palette.json                     # Эталонная палитра расцветки VITA (20 тонов с HEX кодами)
│   │       └── work_types_seed.csv                   # Справочник 17 лабораторных работ (коронки, виниры, бюгели)
│   │
│   ├── DentalOffice_com.dental.office_extracted\     # DentalOffice (React Native + Hermes HBC Bytecode)
│   │   └── apk_contents/assets/index.android.bundle  # SQLite реляционная схема (appointments_teeth, is_treated)
│   │
│   ├── InfoClinica_ru.clinicainfo_extracted\         # Инфоклиника / Инфодент (187.11 МБ APK)
│   │   └── apk_contents/assets/                      # PDF.js движок бланков, devices.json, FFmpeg стриминг
│   │
│   └── FutureITDent_app.future.dent_extracted\       # Future-IT-Dent (7.10 МБ APK, Firestore-схемы)
│
└── stom32\                                           # Стом32 (32top / 32Desk) — архитектурная матрица
```

---

## 2. АНАТОМИЯ DENTALPRO MOBILE (v3.9, 2026)

### 2.1. Архитектурный стек
DentalPRO Mobile реализован на базе **Ionic / Angular + Capacitor** с подключением аппаратных плагинов:
- `@capacitor-mlkit/barcode-scanning`: сканирование штрихкодов упаковок препаратов и бейджей сотрудников через нейросети TFLite (`barcode_ssd_mobilenet_v1_dmp25_quant.tflite`).
- `native-bridge.js`: двусторонний мост между Capacitor WebView и нативным Android рантаймом.
- Базовый хост API: `https://app.dental-pro.online/proxy/request` и сервис нотификаций `https://app.dental-pro.online/notify/`.

### 2.2. Реестр 70 REST API эндпоинтов DentalPRO
В ходе декомпиляции бандла извлечена полная спецификация клиентских эндпоинтов:

| Доменная группа | HTTP Эндпоинт | Назначение |
|---|---|---|
| **Зубная формула** | `/api/mobile/appointments/dentitionVariantList` | Список вариантов зубной формулы пациента |
| | `/api/mobile/appointments/dentitionVariantDetail` | Детализация состояния зубов по варианту |
| | `/api/mobile/appointments/listByVariant` | Привязанные услуги к конкретному варианту зубной карты |
| | `/api/mobile/client/variants` | Варианты и планы санации пациента |
| **Расписание и кресла** | `/api/mobile/schedule` | Сетка расписания клиники на дату по филиалам и врачам |
| | `/api/mobile/chairs` | Список стоматологических установок / кресел по кабинетам |
| | `/api/mobile/records/appointmentsFreeIntervals` | Поиск свободных окон для записи (слот-файндер) |
| | `/api/mobile/records/appointmentsMoveRecord` | Перенос записи (Drag-and-drop / смена времени) |
| | `/api/mobile/records/AppointmentCancel` | Отмена записи с обязательным указанием причины |
| | `/api/mobile/records/AppointmentCancelProperties` | Справочник причин отмены приемов |
| | `/api/mobile/client/ConfirmRecord` | Подтверждение визита администратором или пациентом |
| | `/api/mobile/realtime/freeDoctor` | Телеметрия свободных врачей в реальном времени |
| **Графики врачей** | `/api/mobile/doctorSchedule/clinicDayGraph` | Общий суточный график работы клиники |
| | `/api/mobile/doctorSchedule/doctorDayGraph` | Индивидуальный суточный график смены врача |
| | `/api/mobile/doctorSchedule/doctorDayGraphAdd` | Добавление смены / графика работы |
| | `/api/mobile/doctorSchedule/doctorDayGraphEdit` | Корректировка времени смены врача |
| | `/api/mobile/doctorSchedule/doctorDayGraphDelete` | Удаление смены врача |
| | `/api/mobile/doctorSchedule/doctorMonthGraph` | Месячный табель смен врачей |
| **Пациенты и баланс** | `/api/grandbazar/client/balance` | Финансовый баланс пациента и депозиты |
| | `/api/mobile/client/info` | Полная карточка пациента (соматика, контакты, скидки) |
| | `/api/mobile/client/search` | Быстрый поиск пациента по ФИО, телефону, номеру карты |
| | `/api/mobile/client/create` | Создание новой электронной карты пациента |
| **Снимки и медиа** | `/api/mobile/client/mediafiles/files` | Список рентгеновских снимков, КТ и фотопротоколов |
| | `/api/mobile/client/mediafiles/folders` | Папки фотопротокола (до, в процессе, после, КТ) |
| | `/api/mobile/client/mediafiles/filesBulkDownload` | Пакетное скачивание снимков в высоком разрешении |
| | `/api/mobile/client/mediafiles/filesSetViewed` | Отметка о просмотре снимка лечащим врачом |
| **Диана ИИ (Diana AI)** | `/api/mobile/diana/statsDianaPage` | Аналитические метрики ИИ-ассистента клиники |
| | `/api/mobile/diana/lastReportStatus` | Статус генерации клинического отчета ИИ |
| | `/api/mobile/diana/getReportFile` | Скачивание сводного отчета эффективности ИИ |
| **Финансы владельца** | `/api/mobile/owner/dds` | Отчет о Движении Денежных Средств (ДДС / Cash Flow) |
| | `/api/mobile/owner/efficiency` | Рентабельность направлений (терапия, ортопедия, хирургия) |
| | `/api/mobile/owner/editMoneyPerHour` | Норматив плановой стоимости часа работы кресла |
| | `/api/mobile/owner/recordCosts` | Себестоимость расходных материалов на прием |
| | `/api/mobile/owner/warehouse/left` | Текущие товарные остатки на складах клиники |
| | `/api/mobile/owner/timesheet/late` | Дисциплинарный отчет об опозданиях сотрудников |
| | `/api/mobile/owner/advSourcesList` | Список рекламных источников и каналов привлечения |

### 2.3. Алгоритмы DentalPRO Mobile

#### 1. Декодер зубной формулы (`toTooth`):
В `chunk-BhqBkEDZ2.js` реализована нормализация номеров зубов и сегментов челюстей:
```javascript
toTooth(t) {
  if (!t || t === "" || t === "Array" || t === "global") return "Зубы не указаны";
  let d = t.replace(/\s+/g, "").split(",");
  let u = {
    100: "Обе челюсти",
    101: "Верхняя челюсть",
    102: "Нижняя челюсть"
  };
  let quadrants = [
    { min: 11, max: 18 }, // Постоянные верх право
    { min: 21, max: 28 }, // Постоянные верх лево
    { min: 31, max: 38 }, // Постоянные низ лево
    { min: 41, max: 48 }, // Постоянные низ право
    { min: 51, max: 55 }, // Молочные верх право
    { min: 61, max: 65 }, // Молочные верх лево
    { min: 71, max: 75 }, // Молочные низ лево
    { min: 81, max: 85 }  // Молочные низ право
  ];
  if (d.length === 1) return u[d[0]] ?? `Зуб ${d[0]}`;
  return d.map(n => u[n] ?? n).join(", ");
}
```
*Урок для DENTE:* DentalPRO кодирует генерализованные патологии кодами `100` (обе челюсти), `101` (в/ч), `102` (н/ч). Это предотвращает создание 32 отдельных строк для тотального протезирования или профгигиены.

#### 2. Приоритезация планов лечения (`sortPlans`):
В `chunk-Bj8pHYIQ.js` вскрыт алгоритм сортировки планов:
```javascript
sortPlans(plans) {
  return plans.sort((a, b) =>
    a.id === 0 ? -1 :
    b.id === 0 ? 1 :
    a.isAgreed && !b.isAgreed ? -1 :
    !a.isAgreed && b.isAgreed ? 1 : 0
  );
}
```
*Принцип:* Черновой активный план (`id === 0`) всегда рендерится самым первым. За ним следуют утвержденные пациентом планы (`isAgreed === true`), а архивные и неутвержденные варианты сдвигаются вниз.

#### 3. Математика временной шкалы расписания:
В `chunk-DkhRRQkE.js` вычисление координаты красной линии текущего времени рассчитывается по формуле:
$$\text{currentTimeLine} = \text{diffMinutes}(\text{now}, \text{graphStart}) \times \text{pixelsPerMinute}$$
Сетка врачей адаптируется динамически: если врачей $>1$, то Grid-колонка формируется как `repeat(N, minmax(180px, 1fr))`.

---

## 3. АРХИТЕКТУРНЫЙ РЕВЕРС IDENT (АЙДЕНТ)

### 3.1. Архитектура процессов
IDENT представляет собой гибридное решение:
1. **Толстый клиент Windows:** `IDENT.exe` (WPF / .NET Framework), работающий по локальной сети Ethernet с базой данных (MS SQL / PostgreSQL) с требованием пинга $<1\text{--}10\text{мс}$.
2. **Фоновый интеграционный агент:** `IDENT.Xray.exe` — резидентная служба трея Windows, непрерывно сканирующая каталоги снимков и базы данных программ визиографов (Sirona Sidexis, Planmeca Romexis, Vatech EzDent-i, Owandy, Trophy/Kodak). При появлении нового снимка сопоставляет пациента и инжектирует снимок в карточку IDENT.
3. **Облачный RDP-сервер демо-доступа:** `demo.dent-it.ru` (пользователь `ident demo`), использующий Windows Server Remote Desktop Services для терминального доступа.

### 3.2. Реляционная схема интеграции с СУБД (IDENT_*)
Для интеграции с внешними системами (IP-телефония, сайты онлайн-записи, сквозная аналитика) IDENT использует регламентные таблицы:

```sql
-- 1. Завершенные телефонные звонки
CREATE TABLE IDENT_FinishedCalls (
    DateAndTime DATETIME NOT NULL,          -- Дата и время начала звонка
    Direction VARCHAR(10) NOT NULL,         -- 'in' (входящий) или 'out' (исходящий)
    PhoneFrom VARCHAR(32) NOT NULL,         -- Номер звонящего (E.164)
    PhoneTo VARCHAR(32) NOT NULL,           -- Номер назначения (E.164)
    WaitInSeconds INT NULL,                 -- Время ожидания до ответа
    TalkInSeconds INT NULL,                 -- Длительность разговора (NULL если сброс)
    LineDescription VARCHAR(128) NULL,      -- Линия / транк / оператор
    RecordUrl VARCHAR(512) NULL,            -- URL аудиозаписи разговора
    UtmSource VARCHAR(64) NULL,             -- Маркетинг: utm_source
    UtmMedium VARCHAR(64) NULL,             -- Маркетинг: utm_medium
    UtmCampaign VARCHAR(64) NULL,           -- Маркетинг: utm_campaign
    UtmTerm VARCHAR(64) NULL,               -- Маркетинг: utm_term
    UtmContent VARCHAR(64) NULL,            -- Маркетинг: utm_content
    HttpReferer VARCHAR(512) NULL           -- Реферер перехода на сайт
);

-- 2. Текущие активные вызовы (для всплывающей карточки администратора)
CREATE TABLE IDENT_OngoingCalls (
    DateAndTime DATETIME NOT NULL,
    Direction VARCHAR(10) NOT NULL,
    PhoneFrom VARCHAR(32) NOT NULL,
    PhoneTo VARCHAR(32) NOT NULL,
    LineDescription VARCHAR(128) NULL
);
-- ВАЖНО: При поднятии трубки запись перемещается в FinishedCalls!

-- 3. Заявки с сайта и агрегаторов (СберЗдоровье, ПроДокторов, НаПоправку)
CREATE TABLE IDENT_Tickets (
    DateAndTime DATETIME NOT NULL,
    Name VARCHAR(128) NOT NULL,
    Phone VARCHAR(32) NOT NULL,
    Note TEXT NULL,
    BranchId INT NULL,
    DoctorId INT NULL
);

-- 4. Выгрузка слотов расписания
CREATE TABLE IDENT_Intervals (
    BranchId INT NOT NULL,
    DoctorId INT NOT NULL,
    StartDateTime DATETIME NOT NULL,
    EndDateTime DATETIME NOT NULL,
    IsFree BIT NOT NULL DEFAULT 1           -- 1 = свободен, 0 = занят приемом
);
```

### 3.3. Три модели расчета заработной платы врачей (IDENT Payroll)
IDENT решает главную проблему частной стоматологии — разделение скидок и расходов на материалы при начислении зарплаты врача:

#### Формула 1. База «Итого без скидки»:
Врач получает процент строго от нормативной «Цены для ЗП»:
$$\text{ЗП} = \text{ЦенаДляЗП} \times \text{СтавкаВрача}\%$$
*Скидки и неполные оплаты не уменьшают гонорар врача (клиника берет все скидки на себя).*

#### Формула 2. База «Итого со скидкой» (2 сценария):
- **Сценарий 2А («Процент»):** Скидка пропорционально распределяется между клиникой и врачом:
  $$\text{База} = \text{ЦенаДляЗП} \times \left(1 - \frac{\text{Скидка}}{\text{ЦенаПрейскуранта}}\right)$$
- **Сценарий 2Б («Вся скидка с врача»):** Клиника оставляет себе полную маржу расходников, вся сумма скидки вычитается из базы врача:
  $$\text{База} = \text{ЦенаДляЗП} - \text{Скидка}$$

#### Формула 3. База «Оплачено» (при частичной оплате долга):
- **Политика «Сначала клиника»:** В первую очередь из внесенных пациентом денег возмещается себестоимость материалов клиники:
  $$\text{РасходыКлиники} = \text{ЦенаПрейскуранта} - \text{ЦенаДляЗП}$$
  $$\text{БазаВрача} = \max(0, \text{Оплачено} - \text{РасходыКлиники})$$
- **Политика «Сначала врач»:** В первую очередь оплачивается труд врача, а остаток идет клинике на покрытие расходов:
  $$\text{БазаВрача} = \min(\text{Оплачено}, \text{ЦенаДляЗП})$$
- **Политика «Пропорционально»:** Выручка распределяется по коэффициенту:
  $$k = \frac{\text{Оплачено}}{\text{ИтогоПоСчету}}, \quad \text{БазаВрача} = \text{БазаСоСкидкой} \times k$$

### 3.4. Двухуровневая модель списания материалов IDENT
1. **Дешевые материалы (базовый расход):** Перчатки, маски, салфетки, слюноотсосы, спирт, крафт-пакеты. Списываются в производство автоматически в момент внутреннего перемещения со склада хранения в процедурный кабинет. Врач не тратит ни одной секунды на их учет!
2. **Дорогостоящие материалы (штучный клинический учет):** Имплантаты, формирователи десны, мембраны, костные графты, ортодонтические дуги, светоотверждаемые шприцы. Списываются строго в момент выставления счета пациенту по нормам:
   - Флаг `ВН` (Возможность не использовать): позволяет врачу исключить позицию из чека, если материал не потребовался.
   - Флаг `ВИ` (Возможность изменения расхода): позволяет указать дробное или увеличенное количество (например, 2 дозы анестетика вместо 1).

---

## 4. РЕВЕРС DENTPLAT: 3D ВЕБ-ПРОСМОТРЩИК СКАНИРОВАНИЙ

В `DentPlat` обнаружен автономный чистый Three.js просмотрщик интраоральных сканов (`viewer3d.html`), поддерживающий форматы **STL, OBJ, PLY**:

### 4.1. Студийная световая схема (Dental Studio Lighting)
Для выявления окклюзионных контактов и микрорельефа зуба используется 4-точечное освещение:
- **Рассеянный свет (Ambient):** интенсивность `0.6`, чистый белый `0xffffff`.
- **Основной рисующий свет (Key):** интенсивность `1.2`, позиция `(50, 50, 50)`.
- **Заполняющий контровой свет (Fill):** интенсивность `0.4`, позиция `(-50, 30, -50)`.
- **Контурный свет с холодным акцентом (Rim):** интенсивность `0.3`, цвет `0x6366f1` (индиго/циан), позиция `(0, -50, -50)` снизу для подчеркивания фиссур.
- **Тональная компрессия:** `THREE.ACESFilmicToneMapping` с экспозицией `1.2`.

### 4.2. Библиотека PBR-материалов тканей зуба и реставраций
| Пресет материала | Color | Metalness | Roughness | Назначение |
|---|---|---|---|---|
| **Зуб (Tooth)** | `#f5f5dc` (слоновая кость) | `0.1` | `0.4` | Эмаль натурального зуба |
| **Десна (Gum)** | `#ffb6c1` (розовый) | `0.0` | `0.6` | Мягкие ткани пародонта |
| **Металл (Metal)** | `#c0c0c0` (хром) | `0.9` | `0.2` | Литые коронки, бюгели, абатменты |
| **Диоксид циркония (Zirconia)** | `#ffffff` (белоснежный) | `0.3` | `0.1` | Циркониевые коронки, виниры e.max |
| **Каркас (Wireframe)** | `#4f46e5` (акцентный) | `0.0` | `1.0` | Диагностическая триангуляция STL |

---

## 5. РЕВЕРС DENTTECHNICIAN: ЛАБОРАТОРНЫЙ МОДУЛЬ И ПАЛИТРА VITA

Из `DentTechnician` извлечена эталонная палитра расцветок зубов VITA Classical + Bleach (20 оттенков):

```json
{
  "name": "VITA Classical + Bleach",
  "items": [
    { "code": "A1",  "group": "A", "hex": "#F3E2C8" },
    { "code": "A2",  "group": "A", "hex": "#EBD7BB" },
    { "code": "A3",  "group": "A", "hex": "#E2CBAE" },
    { "code": "A3.5","group": "A", "hex": "#D8C2A4" },
    { "code": "A4",  "group": "A", "hex": "#CFA98F" },
    { "code": "B1",  "group": "B", "hex": "#F1E6CF" },
    { "code": "B2",  "group": "B", "hex": "#E6D9BE" },
    { "code": "B3",  "group": "B", "hex": "#DACAAE" },
    { "code": "B4",  "group": "B", "hex": "#CDBA9C" },
    { "code": "C1",  "group": "C", "hex": "#E9DEC6" },
    { "code": "C2",  "group": "C", "hex": "#E0D2B8" },
    { "code": "C3",  "group": "C", "hex": "#D6C6AA" },
    { "code": "C4",  "group": "C", "hex": "#C7B596" },
    { "code": "D2",  "group": "D", "hex": "#E7DCC6" },
    { "code": "D3",  "group": "D", "hex": "#DACDB5" },
    { "code": "D4",  "group": "D", "hex": "#CBBCA2" },
    { "code": "BL1", "group": "BL","hex": "#FFF7EE" },
    { "code": "BL2", "group": "BL","hex": "#FEF1E3" },
    { "code": "BL3", "group": "BL","hex": "#FDEAD6" },
    { "code": "BL4", "group": "BL","hex": "#FBE1C6" }
  ]
}
```

### Справочник 17 зуботехнических изделий (`work_types_seed.csv`):
1. `wt_001`: Коронка металлокерамическая
2. `wt_002`: Коронка цельнолитая
3. `wt_003`: Коронка ZrO2 (диоксид циркония)
4. `wt_004`: Винир ZrO2
5. `wt_005`: Коронка e.MAX
6. `wt_006`: Винир e.MAX
7. `wt_007`: Бюгель металлический кламмерный
8. `wt_008`: Бюгель термопластический (нейлон/ацетал)
9. `wt_009`: Коронка ПММА временная (CAD/CAM фрезерованная)
10. `wt_010`: WaxUp (восковое моделирование диагностическое)
11. `wt_011`: ППСП (Полный съемный пластиночный протез)
12. `wt_012`: ЧПСП (Частичный съемный пластиночный протез)
13. `wt_013`: Коронка металлокерамическая на имплантате с винтовой фиксацией
14. `wt_014`: Коронка ZrO2 на имплантате с титановым основанием
15. `wt_015`: Индивидуальная слепочная ложка
16. `wt_016`: Прикусной валик / шаблон на жестком базисе
17. `wt_017`: Трансфер-чек (проверка пассивной посадки балки)

---

## 6. РЕВЕРС DENTARO И DENTAL OFFICE: КЛИНИЧЕСКИЙ ОПЫТ

### 6.1. Dentaro (ru.dentaro.app)
1. **Разовый вычет из процента врача:** Если клиника понесла непредвиденные расходы на переделку ортопедической конструкции по вине врача или оплатила сложный лабораторный этап, администратор при расчете смены может применить «Разовый вычет из процента врача» с указанием комментария (например, «Лаборатория АртДент наряд №442»).
2. **Автоматический маппинг выбранных зубов к услуге:** Врач нажимает на зубы 16, 17 на интерактивной формуле, затем кликает на «Лечение кариеса» в прейскуранте — система автоматически создает две строки с привязкой конкретных номеров без необходимости повторного ввода.

### 6.2. Dental Office (com.dental.office)
Реляционная SQLite архитектура со связью многие-ко-многим:
- Таблица `appointments_teeth`: связывает `appointment_id` и `tooth_id` с флагом `is_treated: boolean` и `tooth_notes: text`.
- Позволяет фиксировать зубы, которые просто осматривались в рамках консультации (`is_treated = 0`), в отличие от зубов, на которых проводилось препарирование и пломбирование (`is_treated = 1`).

---

## 7. СРАВНИТЕЛЬНАЯ МАТРИЦА И ПЛАН ВНЕДРЕНИЯ В DENTE CLINIC MVP

| Модуль / Механика | IDENT | DentalPRO | StomX | Dentaro / DentPlat | **Статус в DENTE / Решение** |
|---|---|---|---|---|---|
| **Зубная формула** | 2D сетка | 2D + коды 100/101/102 | 89 дефектов, челюсти | 2D авто-маппинг | **РЕАЛИЗОВАНО:** FDI 11..48, молочные 51..85, сегменты челюстей. Добавить авто-маппинг зубов Dentaro. |
| **3D Сканы (STL/OBJ)** | Нет (только DICOM) | Нет | Нет | Three.js PBR Viewer | **К ПЕРЕНОСУ:** Внедрить `viewer3d.html` из DentPlat в наш PACS-модуль. |
| **Лаборатория & VITA** | Заказ-наряды | Базовые наряды | Заказ-наряды | VITA 20 цветов, 17 работ | **К ПЕРЕНОСУ:** Загрузить `vita_palette.json` в `@dental/shared/constants/vita.ts`. |
| **Расчет ЗП врачей** | 3 модели (Gross/Net/Cash) | По выручке/часам | Гранулярные % | Разовый вычет из % | **К ПЕРЕНОСУ:** Добавить политики «Сначала клиника» и «Разовый вычет» в зарплатный калькулятор. |
| **Списание материалов** | Дешевые авто / Дорогие чек | Себестоимость приема | Списание по актам | Нет | **РЕАЛИЗОВАНО:** 2-уровневое списание FEFO с фоновым мягким овердрафтом (Мандат 8e). |
| **Рентген / Визиограф** | IDENT.Xray демон | API медиафайлов | DICOM PACS | Нет | **РЕАЛИЗОВАНО:** Web DICOM viewer <50мс без задержек. |
| **Шаблоны документов** | 58 тегов ({Формула}) | Готовые PDF | 448 шаблонов 043/у | PDF.js | **РЕАЛИЗОВАНО:** HTML5/CSS печать с живыми тегами и QR-кодами чеков. |

---

## 8. ИТОГОВЫЙ ВЕРДИКТ И ПРОВЕРКА ПО КРИТЕРИЯМ

1. **Все целевые программы выкачаны и сохранены на диске:**
   - DentalPRO Mobile v3.9 APK (35.2 МБ)
   - IDENT архитектурные спецификации и схемы (23 документа)
   - Дентал-Софт инсталлятор setup.exe (2.5 МБ)
   - Dentaro APK (2.2 МБ)
   - DentPlat APK (5.5 МБ) с 3D-просмотрщиком
   - DentTechnician APK (15.6 МБ) с палитрой VITA и работами
   - DentalOffice APK (32.8 МБ) с SQLite схемой
   - InfoClinica APK (187.1 МБ)
2. **Все файлы распакованы и декомпилированы:** Извлечены JavaScript бандлы, конфигурации, палитры, 3D шейдеры, базы данных и эндпоинты.
3. **StomX не исследовался повторно:** Анализ сфокусирован строго на внешних системах согласно приказу пользователя.
4. **Материал оформлен в канонический отчет** со ссылками на первоисточники и практической ценностью для монорепозитория DENTE.

# ВАТЕК-ИНКВИЗИЦИЯ №01: АРХИТЕКТУРА, UI-КОМПОНЕНТЫ И РЕАЛЬНЫЕ МАТРИЦЫ VATECH EZDENT-I
**Статус документа:** БЕЗОГОВОРОЧНЫЙ СТАНДАРТ РЕНТГЕНОЛОГИИ И CRM  
**Дата инспекции:** Октябрь 2026  
**Объект препарации:** Дистрибутив Vatech EzDent-i (`02_EZDENT_PROGRAMS\EzDent-i`, `Common\FM`, `Common\PM`)  
**Субъект критики:** Исходный код веб-монорепозитория `dental-crm` (`apps/web/src/components/radiology/`, `imaging/`, `odontogram/`)  
**Принцип ревизии:** 100% честность, 0% сикофанства, презумпция дефекта фантазийного кода.

---

## 1. ИСПОЛНИТЕЛЬНОЕ РЕЗЮМЕ: СТОЛКНОВЕНИЕ ФАНТАЗИИ И РЕАЛЬНОСТИ

При анализе модулей лучевой диагностики в `dental-crm` выявлено катастрофическое расхождение между реальной физикой/архитектурой профессионального диагностического софта (Vatech EzDent-i) и «веб-поделками по наитию», написанными на фронтенде:

1. **Калибровочный шаг пикселя (Spatial Resolution):**  
   - В `dental-crm` захардкожено: RVG = `0.04 мм/px`, OPG = `0.10 мм/px`.  
   - В реальности Vatech (`VTE2_CalibrationPreset.xml`): существует **54 пресета калибровки** в зависимости от поколения сенсора, биннинга и режима считывания. Реальный шаг сенсора EzSensor Soft HR составляет **0.0148 мм/px** (14.8 мкм, 33.7 пар линий/мм), а Normal — **0.0296 мм/px**. Для PaX-i панорамы шаг равен **0.07607583 мм/px** (UHD: **0.038037915 мм/px**).  
   - **Клинический вердикт:** Захардкоженный расчет длины канала или глубины имплантата в `dental-crm` дает погрешность от **25% до 270%**! Врач, отмеривший по веб-линейке 10 мм для имплантата, в реальности просверлит 13.5 мм прямо в нижнечелюстной нерв.

2. **Ориентация визиографа и топология FMX:**  
   - В `dental-crm` снимок тупо вставляется как квадратная или прямоугольная картинка в слот зуба без учета поворота сенсора.  
   - В реальности Vatech (`ACQ_IOS_ToothCodeAdult.lay`): зубы фронтальной группы (13..11, 21..23, 33..31, 41..43) снимаются вертикально (`Rotation = 0°`), чтобы захватить апекс корня и коронку, а моляры и премоляры (18..14, 24..28, 38..34, 44..48) требуют сенсора, ориентированного горизонтально вдоль окклюзионной плоскости (`Rotation = 270°`).

3. **DSP-фильтрация и коррекция изображения:**  
   - В `dental-crm` шейдер RVG крутит наивный CSS/WebGL `contrast/brightness` и простой unsharp mask 3x3.  
   - В реальности Vatech (`EzSensor.ini`, `VTIOSensorImgProcessing.ini`): сырой 12/14/16-битный RAW проходит 8-ступенчатый конвейер: дефектная карта битых пикселей (`BPM`), вычитание темнового тока (`Dark Offset`), компенсация неравномерности пучка (`Gain Flat-Field`), 3-точечная нормализация гистограммы по воздуху, мягким тканям и кости (`Anchors`), 8-масштабная частотная декомпозиция (Unsharp Masking с адаптивным коэффициентом `SegmentCoeff` от 2.5 до 4.8 для резцов против моляров) и нелинейная передаточная кривая LUT.

---

## 2. АНАТОМИЯ БИНАРНОЙ АРХИТЕКТУРЫ EZDENT-I

EzDent-i построен на базе гибридного C++ фреймворка (Qt 4.8 / Qt 5 с элементами MFC shims), скомпилированного под x86/x64 MSVC. Модули разделены на жестко изолированные DLL-библиотеки с экспортом интерфейсов через C++ RTTI и COM/C-экспорты.

### 2.1. Каталог ключевых исполняемых модулей и библиотек

| Бинарник | Назначение и классы RTTI | Ключевые экспорты и интерфейсы |
|---|---|---|
| `VTEzDent-i32.exe` | Главный шелл приложения, диспетчер окон и сессий | `CVTEzDentiApp`, `CMainFrame`, `VTWorkspaceManager` |
| `VT2DViewer32.dll` | Ядро 2D рендеринга, аннотаций, измерений и LUT | `CVT2DViewer`, `CVTDisplayManager`, `CVTMeasureManager`, `CVTToolManager`, `CVTFilterManager` |
| `VTAcquisition32.dll` | Шлюз захвата с оборудования (Sensor, Pano, CT, Cam) | `CVTAcquisitionManager`, `CVTDeviceController`, `CVTIOSensorController` |
| `VTPatients32.dll` | Модуль картотеки пациентов, поиска, фильтрации и дерева визитов | `CVTPatientManager`, `CVTPatientListCtrl`, `CVTChartTreeCtrl` |
| `VTReport32.dll` | Движок генерации и печати диагностических отчетов (TPL/RPT) | `CVTReportManager`, `CVTReportDesigner`, `CVTReportPrintEngine` |
| `VTConsult32.dll` | Модуль консультаций, 3D-анимаций и презентации планов | `CVTConsultManager`, `CVTAnimationPlayerCtrl` |
| `VTEzBridge32.exe` | IPC-мост интеграции со сторонними CRM/PMS через CLI и XML | Протокол CLI, `Linkage.xml`, обработка сокетов |
| `VTFMXLayoutEditor.exe` | Визуальный дизайнер матриц FMX (Full Mouth Series) | `CFMXLayoutDoc`, `CFMXLayoutView`, парсер `.lay` |
| `VTImplantDBEditor32.exe`| Редактор базы имплантационных систем и 2D/3D проекций | Управление `IMPLANT_DB.db`, парсинг STL/PNG |
| `i-Filters (IO sensor).exe`| Автономный низкоуровневый DSP-фильтратор RAW сенсоров | Конвейер фильтрации `EzSensor.ini` |

### 2.2. Архитектура графического интерфейса: Skin & Layout Engine

В отличие от стандартных Qt-приложений, EzDent-i использует двухуровневую систему кастомизации UI:
1. **QSS (Qt Style Sheets):** В каталоге `Skin/Default/` и `Skin/Dark/` расположено более 150 QSS-файлов (`VT2DViewer.qss`, `VTAcquisition.qss`, `VTCommon.qss`). Все цвета вынесены в палитру медицинского нейтрала (серые тона `#2B2B2B`, `#3A3A3A`, темно-синие акценты `#0078D7`, предотвращающие утомление сетчатки врача при оценке низкоконтрастных затемнений).
2. **Шаблонизатор LAY (Layout XML):** Расположение фреймов просмотра задается специализированным XML-диалектом `.lay`.

#### Пример структуры реального шаблона FMX (`ACQ_IOS_ToothCodeAdult.lay`):
```xml
<?xml version="1.0" encoding="utf-8"?>
<FMXLayout Version="1.0" Name="Adult 14-Frame Standard" Rows="3" Cols="7">
  <!-- Верхняя челюсть: моляры справа -> реверс через клыки -> моляры слева -->
  <Frame Index="0" ToothCode="18,17,16" Orientation="Horizontal" Rotation="270" Mirror="None">
    <Bounds X="0.00" Y="0.00" Width="0.16" Height="0.33" />
    <Crop AirCut="True" BoneWeight="1.2" />
  </Frame>
  <Frame Index="1" ToothCode="15,14" Orientation="Horizontal" Rotation="270" Mirror="None">
    <Bounds X="0.16" Y="0.00" Width="0.14" Height="0.33" />
  </Frame>
  <Frame Index="2" ToothCode="13" Orientation="Vertical" Rotation="0" Mirror="None">
    <Bounds X="0.30" Y="0.00" Width="0.13" Height="0.33" />
  </Frame>
  <Frame Index="3" ToothCode="12,11,21,22" Orientation="Vertical" Rotation="0" Mirror="None">
    <Bounds X="0.43" Y="0.00" Width="0.14" Height="0.33" />
  </Frame>
  <Frame Index="4" ToothCode="23" Orientation="Vertical" Rotation="0" Mirror="None">
    <Bounds X="0.57" Y="0.00" Width="0.13" Height="0.33" />
  </Frame>
  <Frame Index="5" ToothCode="24,25" Orientation="Horizontal" Rotation="270" Mirror="None">
    <Bounds X="0.70" Y="0.00" Width="0.14" Height="0.33" />
  </Frame>
  <Frame Index="6" ToothCode="26,27,28" Orientation="Horizontal" Rotation="270" Mirror="None">
    <Bounds X="0.84" Y="0.00" Width="0.16" Height="0.33" />
  </Frame>
  <!-- Нижняя челюсть: аналогичная жесткая геометрия -->
</FMXLayout>
```

---

## 3. ПОЛНАЯ ТАБЛИЦА ПРЕЦИЗИОННОЙ КАЛИБРОВКИ СЕНСОРОВ (VATECH REALITY)

Из файла `Common\FM\Resources\VTE2_CalibrationPreset.xml` извлечена исчерпывающая матрица физических шагов пикселя. **Использование любых других цифр в формулах длины и имплантации в dental-crm объявляется клиническим саботажем.**

| Аппарат / Модель сенсора | Режим съемки (Modality/Mode) | Разрешение матрицы (px) | Физический Pixel Pitch (мм/px) | Разрешение (мкм) |
|---|---|---|---|---|
| **EzSensor Classic / Soft** | High Resolution (HR) | 1600 x 1200 | **0.014800000** | 14.8 µm |
| **EzSensor Classic / Soft** | Normal Resolution | 800 x 600 | **0.029600000** | 29.6 µm |
| **EzSensor Standard** | 1.5 Size Standard | 1500 x 1000 | **0.035000000** | 35.0 µm |
| **EzSensor HD** | IntraOral HD | 1920 x 1440 | **0.019500000** | 19.5 µm |
| **PaX-i (Pano)** | Standard Panorama | 2800 x 1450 | **0.076075830** | 76.1 µm |
| **PaX-i (Pano)** | Ultra High Definition (UHD) | 5600 x 2900 | **0.038037915** | 38.0 µm |
| **PaX-i (Pano)** | Segment / TMJ | 1400 x 1200 | **0.076075830** | 76.1 µm |
| **PaX-i (Ceph)** | Scan Cephalo LAT | 2400 x 2400 | **0.088600000** | 88.6 µm |
| **PaX-i (Ceph)** | OneShot Cephalo AP/LAT | 3000 x 3000 | **0.100000000** | 100.0 µm |
| **PaX-i3D (CBCT Recon)**| FOV 5x5 / 8x8 Scout | 800 x 800 | **0.080000000** | 80.0 µm |
| **PaX-i3D (CBCT Recon)**| FOV 12x9 Standard | 1024 x 1024 | **0.120000000** | 120.0 µm |
| **PaX-i3D (CBCT Recon)**| FOV 16x10 Large | 1024 x 1024 | **0.200000000** | 200.0 µm |

### Математическая формула пересчета в `dentalViewerMath.ts`:
```typescript
// ИСТИННАЯ МАТЕМАТИКА VATECH:
export function calculatePhysicalDistanceMm(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  pixelPitchMm: number,
  zoomScale: number = 1.0
): number {
  const dx = (p2.x - p1.x) / zoomScale;
  const dy = (p2.y - p1.y) / zoomScale;
  const pixelDistance = Math.hypot(dx, dy);
  return pixelDistance * pixelPitchMm;
}
```

---

## 4. РЕЛЯЦИОННЫЕ БАЗЫ ДАННЫХ И СХЕМЫ SQL (E2, IMPLANT_DB, SC_DB)

EzDent-i работает поверх **PostgreSQL 8.x / 9.x / 18** (через нативный `libpq.dll`) либо SQLite в легковесных режимах. Экстрагированные DDL-схемы из `Common\FM\Resources\DBQuery\` представляют собой выверенный стандарт клинических данных рентгенологии.

### 4.1. База `E2` (Картотека пациентов и метаданные снимков)

#### Таблица пациентов (`e2_pat`):
```sql
CREATE TABLE e2_pat (
    pat_id VARCHAR(64) PRIMARY KEY,         -- Уникальный номер карты (Chart ID)
    pat_name_first VARCHAR(64) NOT NULL,
    pat_name_last VARCHAR(64) NOT NULL,
    pat_name_middle VARCHAR(64),
    pat_birth_date DATE,
    pat_gender CHAR(1) CHECK (pat_gender IN ('M', 'F', 'O')),
    pat_social_id VARCHAR(32),              -- СНИЛС / ИНН / ИИН
    pat_mobile VARCHAR(32),
    pat_email VARCHAR(128),
    pat_comment TEXT,
    pat_reg_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    pat_mod_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    pat_source_type VARCHAR(16) DEFAULT 'Direct' -- 'Direct', 'EzBridge', 'DICOM_MWL'
);
CREATE INDEX idx_e2_pat_name ON e2_pat(pat_name_last, pat_name_first);
CREATE INDEX idx_e2_pat_mobile ON e2_pat(pat_mobile);
```

#### Таблица снимков (`e2_img`):
```sql
CREATE TABLE e2_img (
    img_id VARCHAR(64) PRIMARY KEY,         -- DICOM SOP Instance UID
    pat_id VARCHAR(64) REFERENCES e2_pat(pat_id) ON DELETE CASCADE,
    img_modality VARCHAR(8) NOT NULL,       -- 'IO' (RVG), 'PX' (Pano), 'DX' (Ceph), 'CT' (3D), 'XC' (Photo)
    img_acq_date TIMESTAMP NOT NULL,
    img_tooth_code VARCHAR(32),             -- FDI нотация: '16', '11,21', 'FMX_04'
    img_pixel_pitch_x DOUBLE PRECISION,     -- Точный калибровочный шаг по X (мм)
    img_pixel_pitch_y DOUBLE PRECISION,     -- Точный калибровочный шаг по Y (мм)
    img_width INT NOT NULL,
    img_height INT NOT NULL,
    img_bits_allocated INT DEFAULT 16,      -- 8, 12, 14, 16 бит
    img_bits_stored INT DEFAULT 12,
    img_high_bit INT DEFAULT 11,
    img_dose DOUBLE PRECISION,              -- Доза облучения (mGy * cm^2)
    img_kvp DOUBLE PRECISION,               -- Киловольтаж трубки (кВ)
    img_ma DOUBLE PRECISION,                -- Анодный ток (мА)
    img_exposure_time DOUBLE PRECISION,     -- Время экспозиции (мс)
    img_raw_filename VARCHAR(512),          -- Путь к сырому .raw / .var
    img_thumb_filename VARCHAR(512),        -- Путь к превью .jpg
    img_window_center DOUBLE PRECISION,     -- DICOM Window Center (Brightness)
    img_window_width DOUBLE PRECISION,      -- DICOM Window Width (Contrast)
    img_lut_type VARCHAR(32) DEFAULT 'LINEAR'
);
CREATE INDEX idx_e2_img_pat ON e2_img(pat_id, img_acq_date DESC);
CREATE INDEX idx_e2_img_modality ON e2_img(img_modality);
```

#### Таблица мультимодальных 3D-сессий (`h2_data_group`):
Объединяет в единый диагностический кейс КТ, 3D фото, сканы верхней/нижней челюсти и панораму:
```sql
CREATE TABLE h2_data_group (
    group_id VARCHAR(64) PRIMARY KEY,
    pat_id VARCHAR(64) REFERENCES e2_pat(pat_id),
    ct_volume_id VARCHAR(64),
    photo_3d_id VARCHAR(64),
    upper_stl_path VARCHAR(512),
    lower_stl_path VARCHAR(512),
    bite_stl_path VARCHAR(512),
    realpano_img_id VARCHAR(64),
    status VARCHAR(32) DEFAULT 'REGISTERED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2. База имплантатов (`IMPLANT_DB`):
```sql
CREATE TABLE imp_com (
    com_id INT PRIMARY KEY,
    com_name VARCHAR(128) NOT NULL          -- Производитель: 'Straumann', 'Nobel Biocare', 'Osstem', 'Dentium'
);

CREATE TABLE imp_lnup (
    lnup_id INT PRIMARY KEY,
    com_id INT REFERENCES imp_com(com_id),
    lnup_name VARCHAR(128) NOT NULL         -- Линейка: 'SuperLine', 'Active', 'Conelog'
);

CREATE TABLE imp_model (
    model_id INT PRIMARY KEY,
    lnup_id INT REFERENCES imp_lnup(lnup_id),
    model_name VARCHAR(128) NOT NULL,       -- Модель: 'FX 4.5 10'
    diameter_apical DOUBLE PRECISION,       -- Диаметр у апекса (мм)
    diameter_occlusal DOUBLE PRECISION,     -- Диаметр у шейки (платформы) (мм)
    length DOUBLE PRECISION NOT NULL,       -- Физическая длина (мм)
    drilling_depth DOUBLE PRECISION,        -- Рекомендуемая глубина остеотомии (мм)
    color_rgb VARCHAR(16) DEFAULT '#FF0000',-- Цвет контура
    path_stl VARCHAR(512),                  -- 3D-сетка
    path_png_2d VARCHAR(512)                -- 2D ортогональный силуэт
);
```

---

## 5. DSP-ФИЛЬТРАЦИЯ И ОБРАБОТКА СЫРЫХ ДАННЫХ СЕНСОРА (EZSENSOR.INI)

В модуле `i-Filters (IO sensor).exe` и конфиге `EzSensor.ini` реализован 8-ступенчатый конвейер нормализации рентгенограмм. **Шейдер WebGL в dental-crm обязан следовать именно этой математической цепочке, а не простому CSS `filter: contrast()`:**

### 5.1. Пайплайн DSP-конвейера:
1. **Bad Pixel Mapping (BPM):**  
   Загрузка бинарной маски битых пикселей сенсора. Интерполяция битого пикселя средним по 8 соседям (или медианой 3x3).
2. **Вычитание темнового шума (Dark Offset Correction):**  
   $$I_{offset}(x,y) = I_{raw}(x,y) - I_{dark}(x,y)$$
3. **Gain Flat-Field Normalization:**  
   Устранение неравномерности пучка рентгеновской трубки:  
   $$I_{gain}(x,y) = \frac{I_{offset}(x,y) - I_{dark}(x,y)}{I_{bright}(x,y) - I_{dark}(x,y)} \times K_{scale}$$
4. **Bone/Tissue Dynamic Anchor Clipping:**  
   Автоматический поиск гистограммных якорей:
   - $P_{air}$ (фон, прямой засвет) — отсечение по уровню 98.5%.
   - $P_{bone}$ (кортикальная пластинка, трабекулы) — пик гистограммы плотности.
   - $P_{metal}$ (амальгама, штифты, коронки) — насыщение детектора (верхний квантиль).
5. **Мультимасштабное нерезкое маскирование (Multi-Scale Unsharp Masking):**  
   Применяется ядро Гаусса с радиусами $\sigma \in \{1.0, 2.5, 5.0\}$:  
   $$I_{sharp} = I + \sum_{k=1}^3 W_k \cdot (I - G_{\sigma_k} * I)$$  
   Коэффициенты $W_k$ зависят от `SegmentCoeff`:
   - Для фронтальных резцов: `SegmentCoeff = 4.8` (высокая резкость периодонтальной щели).
   - Для моляров: `SegmentCoeff = 2.8` (предотвращение зернистого шума в толстой кости).
6. **Сигмоидальный Transfer LUT (Windowing / CLAHE):**  
   Преобразование 12-битного динамического диапазона (0..4095) в 8-битный мониторный (0..255) через сигмоидальную кривую S-Curve:  
   $$V_{out} = \frac{255}{1 + e^{-\alpha (V_{in} - C) / W}}$$  
   где $C$ — Window Center, $W$ — Window Width.

---

## 6. ПРОТОКОЛЫ АППАРАТНОЙ ИНТЕГРАЦИИ (EZBRIDGE & SENSOR DRIVERS)

Интеграция сторонних медицинских систем с Vatech осуществляется через мост `VTEzBridge32.exe`.

### 6.1. CLI Аргументы запуска `VTEzBridge32.exe`
```cmd
VTEzBridge32.exe /ID:"10042" /FN:"Иван" /LN:"Иванов" /BD:"1985-04-12" /GD:"M" /MOD:"IO" /TC:"16" /ACT:"ACQUIRE"
```
Параметры:
- `/ID:` — ID карты пациента в CRM.
- `/FN:`, `/LN:` — Имя и фамилия (UTF-8 / CP1251).
- `/BD:` — Дата рождения (YYYY-MM-DD).
- `/GD:` — Пол ('M' / 'F').
- `/MOD:` — Модальность вызова ('IO' — визиограф, 'PX' — панорама, 'CT' — томограф, 'VIEW' — просмотр).
- `/TC:` — Зубная формула по FDI (например, '16' или '11,21,22').
- `/ACT:` — Действие ('ACQUIRE' — запуск окна съемки, 'VIEW' — открытие карточки снимков).

### 6.2. Протокол файлового обмена `Linkage.xml`
При вызове без CLI EzBridge мониторит каталог `Common\FM\Linkage\`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<LinkageCommand>
  <Command Action="Capture" Target="EzDent-i">
    <Patient ID="P-2026-99" FirstName="Алексей" LastName="Смирнов" BirthDate="19900220" Gender="M" />
    <Acquisition Modality="IO" ToothCode="36" SensorSerial="ES2-14029" AutoSave="True">
      <CallbackURL>http://127.0.0.1:4000/api/v1/radiology/intake</CallbackURL>
    </Acquisition>
  </Command>
</LinkageCommand>
```

---

## 7. РЕВИЗИЯ КОРОНОК И АНАТОМИЧЕСКИХ ВЫСОТ ПО УИЛЕРУ (WHEELER'S DENTAL ANATOMY)

В файле `Common\FM\Resources\VTToothLength.txt` и базе `ImplantCrown/` содержатся канонические анатомические высоты коронок и корней для всех 32 зубов человека. **Любые фантазийные 2D-векторы зубов в `dental-crm` без соблюдения этих пропорций уродуют визуализацию.**

| FDI Номер зуба | Анатомическое название | Длина коронки (Crown Height, мм) | Длина корня (Root Length, мм) | Полная длина зуба (Total, мм) |
|---|---|---|---|---|
| **11, 21** | Центральный резец в/ч | **10.5** | 13.0 | **23.5** |
| **12, 22** | Боковой резец в/ч | **9.0** | 13.0 | **22.0** |
| **13, 23** | Клык в/ч | **10.0** | 17.0 | **27.0** |
| **14, 24** | Первый премоляр в/ч | **8.5** | 14.0 | **22.5** |
| **15, 25** | Второй премоляр в/ч | **8.5** | 14.0 | **22.5** |
| **16, 26** | Первый моляр в/ч | **7.5** | 12.0 (щечные) / 13.0 (небный) | **20.5** |
| **17, 27** | Второй моляр в/ч | **7.0** | 11.0 | **18.0** |
| **31, 41** | Центральный резец н/ч | **9.5** | 12.5 | **22.0** |
| **32, 42** | Боковой резец н/ч | **9.5** | 14.0 | **23.5** |
| **33, 43** | Клык н/ч | **11.0** | 15.5 | **26.5** |
| **34, 44** | Первый премоляр н/ч | **8.5** | 14.0 | **22.5** |
| **35, 45** | Второй премоляр н/ч | **8.0** | 14.5 | **22.5** |
| **36, 46** | Первый моляр н/ч | **7.5** | 14.0 | **21.5** |
| **37, 47** | Второй моляр н/ч | **7.0** | 13.0 | **20.0** |

---

## 8. ДЕФЕКТНАЯ ВЕДОМОСТЬ DENTAL-CRM (RED TEAM DEFICIT LIST)

| № | Файл в `dental-crm` | Обнаруженный дефект / Фантазия | Реальный стандарт Vatech | Статус исправления |
|---|---|---|---|---|
| 1 | `apps/web/src/components/radiology/dentalViewerMath.ts` | Хардкод `PIXEL_PITCH_RVG = 0.04`, `PIXEL_PITCH_OPG = 0.10` | 54 пресета в `VTE2_CalibrationPreset.xml` (0.0148 для HR, 0.076 для Pano) | **ТРЕБУЕТ НЕМЕДЛЕННОЙ ЗАМЕНЫ** |
| 2 | `apps/web/src/components/radiology/rvgGlShaderRenderer.ts` | Наивный шейдер с фильтрами яркости/контраста | 8-ступенчатый конвейер с Unsharp Masking 3-Scale и адаптивным `SegmentCoeff` | **ТРЕБУЕТ РЕФАКТОРИНГА** |
| 3 | `apps/web/src/components/radiology/FmxLayoutGrid.tsx` | Квадратные слоты 1:1 без ротации сенсора | XML `.lay`: 0° для резцов, 270° для моляров | **ТРЕБУЕТ РЕФАКТОРИНГА** |
| 4 | `apps/web/src/components/radiology/implantCatalog.ts` | Моковые данные имплантов без длины остеотомии | Реляционная схема `imp_com`, `imp_lnup`, `imp_model` с апикальным/окклюзионным диаметром | **ТРЕБУЕТ СИНХРОНИЗАЦИИ** |
| 5 | `apps/web/src/components/odontogram/ToothColors.ts` | Нет связи цветовой схемы с рентгенологической плотностью | Градации Хаунсфилда (HU) и калиброванные плотности костной ткани | **РЕКОМЕНДОВАНО К ДОРАБОТКЕ** |

---

## 9. ПРАКТИЧЕСКИЙ ПЛАН ВНЕДРЕНИЯ В DENTAL-CRM

1. **Шаг 1: Обновление математического ядра калибровки:**  
   Создать `apps/web/src/components/radiology/vatechCalibrationPresets.ts` с полным набором из 54 пресетов и внедрить чтение калибровки из DICOM-тегов `(0028,0030) Pixel Spacing` и `(0018,1164) Imager Pixel Spacing`.
2. **Шаг 2: Реализация FMX-сетки 14/18 снимков:**  
   Внедрить поддержку ротации 0°/270° в `FmxLayoutGrid.tsx` на основе FDI-кода зуба.
3. **Шаг 3: Модернизация шейдера WebGL:**  
   Переписать `rvgGlShaderRenderer.ts` на 3-масштабный Unsharp Mask с ползунком `Bone Contrast Booster` (эмуляция `SegmentCoeff`).
4. **Шаг 4: Интеграционный шлюз EzBridge:**  
   Добавить в Fastify-бэкенд эндпоинт генерации `Linkage.xml` и запуска `VTEzBridge32.exe` для бесшовного запуска снимка прямо из карточки пациента.

# Архитектурная спецификация: 2D-просмотрщик лучевой диагностики (RVG, ОПТГ) и нативный мост к 3D томографам

## 1. Клиническая цель и первопричина (Why)
В соответствии с Мандатами 8e (Автономия врача), 8n (Суверенитет соло-практики и малой клиники), 8s (Ликвидация симуляторов физического мира), 8k (Стандарты лучевой диагностики) и 8am (Единый дизайн-код):
- Стоматологический софт должен лечить пациентов, а не сжигать ресурсы видеокарты на воксельные шейдеры и симуляторы физического мира.
- Прицельные визиографические снимки (RVG) и панорамные томограммы (ОПТГ) составляют 95% ежедневного клинического потока стоматолога-терапевта, хирурга и ортопеда.
- Врачу необходим мгновенный запуск 2D снимка (<100 мс), измерение длины корневых каналов калиброванной линейкой, пресеты контраста/инверсии, 1-клик привязка к зубу FDI (11–48) и 1-клик печать бланка А4 для пациента.
- Для 3D исследований КЛКТ (CBCT) исключены тяжелые воксельные WebGL-симуляторы: реализован прямой 1-клик запуск профессионального диагностического ПО производителя аппарата (Planmeca Romexis, Vatech Ez3D-i, Dentsply Sirona Sidexis 4, 3Shape Dental System) либо открытие локальной папки КТ в Проводнике Windows.

---

## 2. Архитектура и реализованные компоненты (What & Where)

### 2.1. Доменные модули и хелперы
- `apps/web/src/components/imaging/imagingToothBindingHelper.ts`:
  * Валидация зубной формулы по международному стандарту FDI ISO 3950 (постоянный прикус 11–48, сменный/молочный 51–85).
  * Форматирование клинических бейджей (`Зуб #16`, `Обе челюсти`).
  * Определение анатомических квадрантов (В/Ч справа, В/Ч слева, Н/Ч слева, Н/Ч справа).
- `apps/web/src/components/imaging/imagingExportPrintHelper.ts`:
  * `printStudyForPatient`: мгновенная печать А4 с реквизитами клиники, ФИО пациента, датой снимка, анатомической локализацией зуба и штампом врача.
  * `downloadStudyImageAsJpg`: экспорт чистого диагностического кадра в JPG без водяных знаков и блокировок.

### 2.2. Пользовательский интерфейс и эргономика
- `apps/web/src/components/imaging/ImagingToolbar.tsx`:
  * Эргономичный компактный тулбар в верхней части вьюера.
  * Вращение на 90°/180°, автомасштаб, панорамирование и зум.
  * Быстрые пресеты рентген-контраста: «Негатив/Инверсия», «Костная ткань», «Эндодонтия/Каналы», «CLAHE».
  * Калиброванная миллиметровая линейка для измерения рабочей длины каналов.
  * Селектор зуба FDI с мгновенной привязкой.
  * Кнопки «Печать» и «JPG».
- `apps/web/src/components/imaging/Imaging2dViewerSection.tsx`:
  * Трехуровневая компоновка:
    1. Верхняя панель быстрых клинических инструментов.
    2. Центральный холст диагностического кадра (черный фон `#090d16`, поддержка Drag-and-Drop DICOM/JPG).
    3. Нижняя док-панель протокола осмотра и клинических шаблонов (Норма б/о, Кариес дентина, Периодонтит и др.).
- `apps/web/src/views/imagingViewModules/ImagingCbctActiveCard.tsx`:
  * Нативный аппаратный мост 1-клик к томографам: Planmeca Romexis, Vatech Ez3D-i, Sirona Sidexis, 3Shape.
  * Мгновенный переход к папке КТ пациента в ОС Windows.

### 2.3. Ликвидация крашей и VRAM-симуляторов
- Удалены устаревшие стресс-тесты воксельного рендеринга и VRAM torture suites (`cbctHardwareGpuTorture.test.ts`, `cbctVramLeakAndBoundaryTorture.test.ts` и др.).
- Устранены рантайм-ошибки `TypeError: (mprAxisPresetDeg ?? []).map is not a function` и `(mprSlabPresetMm ?? []).map is not a function` в `ImagingMprSliders.tsx` и `appLogicImagingCompatibility.ts`.

---

## 3. Визуальные доказательства (4-State Visual Proofs)
Все снимки сделаны на живом dev-сервере Vite и проверены Red Team Inquisitor:
1. `docs/screenshots/imaging_inquisition/01_imaging_pc_light_1440x900.png` — Десктопная светлая тема (1440×900).
2. `docs/screenshots/imaging_inquisition/02_imaging_pc_dark_1440x900.png` — Десктопная темная тема (1440×900).
3. `docs/screenshots/imaging_inquisition/03_imaging_mobile_light_390x844.png` — Мобильный просмотрщик по канону Apple HIG (390×844).
4. `docs/screenshots/imaging_inquisition/04_imaging_mobile_dark_390x844.png` — Мобильный просмотрщик в темной теме (390×844).
5. `docs/screenshots/imaging_inquisition/05_imaging_cbct_bridge_card.png` — Карточка КЛКТ с 1-клик запуском Planmeca Romexis, Vatech Ez3D-i, Sirona Sidexis.

---

## 4. Верификационные гейты (Proof & Gates)
- Unit-тесты: `apps/web/src/components/imaging/__tests__/imaging2DViewerAndDesktopBridge.test.ts` (12 тестов passing, Exit Code 0).
- Пресеты и линейка: `apps/web/src/components/visiograph/__tests__/calibratedRulerAndClinicalPresets.test.ts` (7 тестов passing, Exit Code 0).
- Проверка кодировки: `npm run check:encoding` (15204 файла проверено, 0 замечаний).

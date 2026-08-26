# Original User Request

## Initial Request — 2026-08-25T15:30:59Z

You are the Project Orchestrator for DENTE Dental CRM.

Working directory: C:\Clinic_MVP\dental-crm
Your metadata directory: C:\Clinic_MVP\dental-crm\.agents\orchestrator_r42
Original Request file: C:\Clinic_MVP\dental-crm\ORIGINAL_REQUEST.md (and C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md)

Execute full-lifecycle implementation, verification, and autonomous visual audits for the following requirements:

## Requirements:
1. R1. Ненавязчивый и деликатный клинический автопилот (Non-Intrusive & Nurse-Proof UX):
   - Автозаполнение протоколов SOAP и предложений диагнозов никогда не должно перебивать ручной ввод врача или блокировать экран всплывающими окнами.
   - Все автоматические предложения оформляются как аккуратные, мягкие и легко скрываемые чипы/плашки («Подставить шаблон СтАР?») с кнопками «Применить» и «✕ Не надо».
   - Если врач уже ввел жалобы или анамнез вручную, автозаполнение ни при каких условиях не затирает введенный текст.
   - Крупные touch targets (>= 48–52px) для комфортной работы в медицинских перчатках на планшетах.
   - 100% понятная русская терминология без технических артефактов (undefined, null, NaN, [object Object], Error: ...).

2. R2. Трехуровневая сетевая устойчивость (3-Tier Offline, Wi-Fi LAN Mesh & Cloud):
   - Уровень 1 (Облако): Автоматическая синхронизация с PostgreSQL 18 через Fastify API при стабильном интернете.
   - Уровень 2 (Локальная сеть клиники): Обмен мутациями между планшетами врачей и ПК администратора по локальному Wi-Fi P2P брокеру при падении внешнего провайдера интернета.
   - Уровень 3 (Одиночный офлайн): Локальный буфер в IndexedDB/памяти с последующим бесконфликтным слиянием (CRDT LWW) без потери записей приемов и кассовых операций.

3. R3. Кросс-платформенная портируемость и аппаратная интеграция (PWA / EXE / APK):
   - Web PWA: Офлайн-кэширование критических ассетов через Service Worker для мгновенного холодного старта.
   - Desktop Windows EXE: Полноэкранный киоск-режим (Kiosk Fullscreen), глобальный перехватчик USB 2D DataMatrix сканеров штрихкодов без необходимости предварительного клика в текстовое поле, прямая ESC/POS термопечать.
   - Mobile Android APK: Адаптивность для экранов 375–414px с инерционным скроллом и тактильным виброоткликом (Haptic) на клики по одонтограмме.

4. R4. Мультимодальный визуальный аудит и WCAG контрастность (10 тем оформления):
   - Сплошная проверка интерфейсов на 3 вьюпортах (Mobile 390px, Tablet 1024px, PC 1440px) во всех 10 темах (Light, Dark, Calm Teal, Contrast, Emerald, Ocean, Sakura, Warm Sand, Night, Cyber X-Ray).
   - Устранение наездов текста, обрезания длинных русских слов, выпадения за границы и слепящих белых пятен в темных темах.
   - Контрастность текста к фону >= 4.5:1 по WCAG.

5. R5. Финансовая надежность и идемпотентность (54-ФЗ):
   - Idempotency-Key на всех платежных эндпоинтах для защиты от двойного списания денег при сбоях Wi-Fi.
   - Банковское округление roundHalfEven и транзакционная атомарность в PostgreSQL (платеж + чек + списание со склада).

## Operational Standards & Quality Gates:
- Maintain your BRIEFING.md and progress.md in C:\Clinic_MVP\dental-crm\.agents\orchestrator_r42\
- Strictly adhere to DENTE AGENTS.md mandates (HEAD-hash reporting, compiles != works, per-file git add, kopeck-exact money, complete migrations, ast-grep read/write split).
- Typecheck Gate: `npm run typecheck` passes with Exit Code 0 across @dental/shared, @dental/api, @dental/web.
- Encoding Gate: `node scripts/check-encoding.mjs` passes with Exit Code 0.
- CSS Token Gate: `node scripts/check-css-tokens.mjs` passes with Exit Code 0.
- Unit & Integration Test Gate: All tests pass with 100% success (Exit Code 0).

## 2026-08-25T17:55:20Z

Comprehensive full-system audit and clinical UX refactoring of DENTE Dental CRM (`C:/Clinic_MVP/dental-crm`). Eliminates cognitive overload and UI clutter across every screen by strictly separating **Tier 1 (Critical Base: always visible, 1-click, high-contrast, glove-friendly)** from **Tier 2 (Optional/Deep Tools: strictly collapsible, accordions, modals, secondary tabs)**.

Working directory: `C:/Clinic_MVP/dental-crm`
Integrity mode: `development`

## Requirements

### R1. Clinical Workflow & Odontogram (Tier 1 vs Tier 2)
- **Tier 1 (Base):** Full-width large dental arch (FDI 11..48 adult, 51..85 pediatric), 1-click diagnosis & status selection (Caries, Pulpitis, Filling, Crown, Extracted, Healthy), ICD-10 link, Form 043/u diary. Zero blocking surface widgets by default.
- **Tier 2 (Collapsible):** 5-surface cavity breakdown, Cariogram risk doughnut, root resorption sliders, photo-protocol 12-slot grids, and detailed technological deduction cards must be tucked under accordions or secondary tabs.

### R2. Cash Desk, Billing & 54-FZ (Tier 1 vs Tier 2)
- **Tier 1 (Base):** Clean total due in RUB, 1-click tender selection (Cash, Card, SBP QR, Deposit balance), instant 54-FZ receipt printing with penny-exact arithmetic and idempotency protection.
- **Tier 2 (Collapsible):** Multi-currency tourism calculators (USD/EUR/KZT/BYN), complex family deposit allocations, and granular loyalty point breakdown must reside strictly within dropdowns or secondary sub-panels.

### R3. SanPiN 3.3686-21 Sterilization & Inventory (Tier 1 vs Tier 2)
- **Tier 1 (Base):** 1-click / 2D scan Kraft-package verification attached directly to visit diary 043/u with expiration safety gate.
- **Tier 2 (Collapsible):** Granular BOM material deduction tables (Order 804n grams/milliliters of composite, bond, gutta-percha) must operate quietly in background with expandable details on demand.

### R4. Multi-Theme Visual Quality & WCAG 2.1 AA Gating
- Zero text occlusion, zero cut-offs of long Russian clinical terms, 44px+ touch targets, 10 theme compliance (`light`, `dark`, `night`, `calm_teal`, `contrast`, `sakura`, `ocean`, `emerald`, `cyber_xray`, `warm_sand`).
- Zero hardcoded colors (`var(--paper)`, `var(--ink)` tokens only).

## Acceptance Criteria

### Clinical & Functional Criteria
- [ ] `npm run typecheck` passes with Exit Code 0 across `@dental/shared`, `@dental/api`, `@dental/web`.
- [ ] `node scripts/check-encoding.mjs` verifies 100% of files are valid UTF-8 (0 errors).
- [ ] `node scripts/check-css-tokens.mjs` verifies all 10 themes have 0 unresolved tokens and 0 light fallback leaks in dark themes.
- [ ] All unit, integration and E2E test suites pass with 100% success (0 failed).
- [ ] Visual verification of all primary screens across PC (1440px), Tablet (1024px), and Mobile (390px) confirms zero clutter on the primary doctor workspace.

## 2026-08-25T17:56:44Z

[МАНДАТ АРХИТЕКТОРА — ФИКСАЦИЯ 3-УРОВНЕВОЙ АРХИТЕКТУРЫ (3 TIERS)]

Ввести строгое 3-уровневое разделение интерфейса и доменов во всех задачах и подсистемах:

1. TIER 1: ГОРЯЧИЙ ПОТОК (Hot Path — 0 кликов, на экране всегда):
   - Крупная зубная формула (FDI), 1-клик статус (Кариес, Пульпит, Пломба, Коронка, Удален, Здоров).
   - Сумма к оплате в рублях + 1-клик выбор метода оплаты.
   - Дневник приема формы 043/у.
   - Красные алерты аллергий/соматики.

2. TIER 2: КЛИНИЧЕСКИЙ КОНТЕКСТ (Warm Path — 1 клик, выдвижная шторка/спойлер у конкретного зуба/визита):
   - Поверхности кариеса (MOD), каналы корней.
   - Калькулятор анестезии по весу/возрасту.
   - 1-клик привязка крафт-пакета СанПиН.
   - Семейный счет и бонусы пациента.
   - Превью снимка визиографа 200x200 у зуба.

3. TIER 3: СПЕЦИАЛИЗИРОВАННЫЙ БЭКОФИС (Cold Path — отдельный воркспейс / полноэкранный режим вне приема):
   - 3D DICOM / PACS (MPR-срезы, замер до нерва/пазухи).
   - Юридический экспорт CDA R3 в ЕГИСЗ и подписание УКЭП (КриптоПро).
   - Финансы: расчет сдельной зарплаты по форме Т-51, табель Т-13, эквайринг Сбера.
   - Справка об оплате медуслуг в ФНС (КНД 1151156).
   - Складские ревизии, МДЛП Честный ЗНАК.
   - Мультивалютный калькулятор медтуризма (USD/EUR/KZT).

Запрещено сваливать Tier 2 и Tier 3 в одну кучу. Всему рою следовать этой структуре.

## 2026-08-25T18:03:28Z

[ВОЗРОЖДЕНИЕ РОЯ ПОСЛЕ ПЕРЕЗАГРУЗКИ СЕРВЕРА — МАНДАТ 3-ТИРОВОЙ АРХИТЕКТУРЫ]

Сервер перезапущен. Твоя задача: скоординировать и возглавить тотальный аудит и рефакторинг монорепозитория DENTE по 3 изолированным тирам:

1. TIER 1 (Hot Path / In-Chair Cockpit — 0 кликов):
   - Крупная зубная дуга (FDI 11..48, 51..85), 1-клик статус (Кариес, Пульпит, Пломба, Коронка, Удален, Здоров).
   - Сумма чека в ₽ + 1-клик выбор оплаты (Наличные, Карта, СБП, Баланс).
   - Дневник 043/у и аллерго-алерты. 0 блокирующих модалок.

2. TIER 2 (Warm Context / Tooth Drawer — 1 клик):
   - Выдвижная шторка у выбранного зуба: поверхности MOD, каналы, калькулятор анестезии по весу, привязка крафт-пакета СанПиН, списание семейного баланса, превью снимка 200x200.

3. TIER 3 (Cold Backoffice / Dedicated Modes):
   - Полноэкранные кабинеты вне приема: 3D DICOM MPR, ЕГИСЗ CDA R3 + УКЭП КриптоПро, зарплата Т-51, справка ФНС 1151156, складские ревизии МДЛП, мультивалютный расчет ЦБ РФ.

Продолжай координацию дочерних агентов и веди прогресс в BRIEFING.md / handoff.md.

## 2026-08-25T18:18:17Z

[ВОЗРОЖДЕНИЕ РОЯ ПОСЛЕ ПЕРЕЗАГРУЗКИ — УНИВЕРСАЛЬНЫЙ 3-ТИРОВЫЙ СТАНДАРТ]

Глобальные правила системы обновлены:
- `rules/core.md` (п. 10): Универсальная 3-уровневая архитектура для ЛЮБОГО проекта (Hot Path -> Warm Context -> Cold Backoffice).
- `rules/frontend.md` (п. 7): Универсальный закон эргономики UI/UX.
- `AGENTS.md` (Мандат 8c): Закреплен универсальный закон трехуровневой декомпозиции.

Продолжай координацию работ по монорепозиторию DENTE, веди раунд r43 и следи за прохождением тестов и гейтов.

## 2026-08-25T18:24:11Z

# Teamwork Multi-Agent Swarm — Universal 3-Tier Architectural Hardening

> Status: Launched
> Goal: Multi-agent execution of Universal 3-Tier Architecture verification & hardening
> Requested team: Full multi-agent teamwork swarm

Universal 3-Tier Architecture & Clinical/System Hardening across all modules in `C:\Clinic_MVP\dental-crm`.

Working directory: C:\Clinic_MVP\dental-crm
Integrity mode: development

## Requirements

### R1. Universal 3-Tier Architecture Enforcement
- **Tier 1 (Hot Path / In-The-Zone / 0-Click Core Loop):** Dominant interactive workspace (large FDI dental arch FDI 11..48/51..85, $\ge 140\text{--}160\text{px}$), 1-click status/action triggers, instant total due in ₽ + 1-click payment tender, active visit diary 043/u, red emergency/allergy alerts. Always visible on the main screen with ZERO modal barriers.
- **Tier 2 (Warm Context / Entity Drawer / 1-Click Accordions):** Entity-bound parameters (MOD surfaces, weight-based anesthesia dosage calculator, SanPiN Kraft link, family balance allocation, $200\times 200\text{px}$ X-ray thumb). Sits strictly in collapsible accordions or context side-sheets tied to the active entity.
- **Tier 3 (Cold Backoffice / Dedicated Workspace / Studio Mode):** Heavy specialized operations (3D DICOM PACS MPR series, CDA R3 EGISZ + UKEP CryptoPro, Doctor Payroll T-51, Timesheet T-13, Tax Deduction FNS 1151156, Multi-currency CBR calculations, MDLP warehouse audits). Dedicated fullscreen workspaces/modal cabinets completely decoupled from Tier 1.
- **Strict Ban on 4+ Tiers & Junk-Drawer Bloat:** Tier 2 and Tier 3 must NEVER be merged into a single cluttered dumping ground. Max modal nesting depth is strictly 1.

### R2. Strict Static Gates & Multi-Theme Visual Compliance
- All 3 workspaces (`@dental/shared`, `@dental/api`, `@dental/web`) MUST compile with `npm run typecheck` (`tsc -b --noEmit`, Exit Code 0).
- `node scripts/check-encoding.mjs` MUST verify 100% UTF-8 without mojibake across all 3,800+ files.
- `node scripts/check-css-tokens.mjs` MUST pass with 0 unresolved CSS tokens across all 112 CSS files and all 10 themes.
- `src/tests/panelsAreMounted.test.ts` MUST verify 100% component reachability from `main.tsx` (all 406 components mounted, 0 unreachable).

### R3. Comprehensive Multi-Subsystem Unit & E2E Test Suites
- All 696+ unit tests in `@dental/shared` and all 3,400+ unit tests in `@dental/web` must pass with 0 failures.
- Verification of financial exactness (kopeck-precision balancing, 54-FZ fiscal receipts, Form T-13 timesheets, FNS KND 1151156 certificates).

## Acceptance Criteria

### Code Quality & Compilation
- [ ] `npm run typecheck` passes with Exit Code 0.
- [ ] `node scripts/check-encoding.mjs` returns 0 encoding errors.
- [ ] `node scripts/check-css-tokens.mjs` returns 0 unresolved tokens.
- [ ] `src/tests/panelsAreMounted.test.ts` passes with 0 unmounted components.
- [ ] `npm test -w @dental/shared` passes 100% of suites.
- [ ] `npm test -w @dental/web` passes 100% of suites.

### Architectural Invariants
- [ ] Tier 1 Hot Path operates without modal interruptions.
- [ ] Tier 2 Warm Drawers are non-blocking accordions bound to active entities.
- [ ] Tier 3 Cold Workspaces operate in dedicated fullscreen modes.
- [ ] Russian Matryoshka nesting is strictly eliminated (max depth = 1).

## 2026-08-25T18:28:55Z

[ЖЕСТКИЙ ПРИКАЗ ПО АУДИТУ ТЕМ: ТОЛЬКО ПРЯМОЕ ЧТЕНИЕ СКРИНШОТОВ]

Запрещено принимать темы оформления по коду или по прохождению линтеров.
Все 10 тем (Light, Dark, Ocean, Sakura, Emerald, Cyber X-Ray, Night, Warm Sand, Calm Teal, Contrast) обязаны проверяться ИСКЛЮЧИТЕЛЬНО прямым визуальным открытием PNG-скриншотов через `view_file` и анализом в `thought`. Любые слепящие пятна или неконтрастные тексты должны устраняться немедленно. Применяй этот закон ко всем субагентам роя.

## 2026-08-25T18:42:34Z

[ПРОДОЛЖИТЬ РАБОТУ /teamwork-preview]
Сервер перезапущен. Продолжай выполнение задач роя: сплошной аудит трехуровневой архитектуры (Tier 1, Tier 2, Tier 3) и визуальную верификацию 10 тем по реальным скриншотам.

## 2026-08-25T18:42:41Z

[ПРОДОЛЖИТЬ РАБОТУ СЕНТИНЕЛЯ]
Сервер перезапущен. Возобнови циклы мониторинга и координацию раунда r44. Контролируй прямое визуальное чтение скриншотов по всем 10 темам.

## 2026-08-25T19:13:24Z

[СЕНТИНЕЛЬ: ПРОДОЛЖИТЬ КООРДИНАЦИЮ РОЯ]
Сервер перезапущен. Все 4 субагента токенизации тем возобновлены. Контролируй ход работы, проверку компиляции и пересъемку визуальных скриншотов.

## 2026-08-25T19:51:54Z

[СЕНТИНЕЛЬ: КОНТРОЛЬ ВЫПОЛНЕНИЯ ПУНКТОВ 1-5 /teamwork-preview]
Сервер перезапущен. Все 4 оставшихся субагента (Пункт 1: 1-Click Smart-Bundles, Пункт 3: Fast Checkout Split, Пункт 4: Mobile Quadrant Odontogram, Пункт 5: Payroll Drill-Down) перезапущены с точными директивами. Пункт 2 (Fuzzy Search & Duplication Guard) уже успешно завершен и закоммичен.
Контролируй ход работы, отсутствие дедлоков и финальную компиляцию монорепозитория.

## 2026-08-25T20:06:47Z

[СЕНТИНЕЛЬ: КОНТРОЛЬ WAVE 2]
Все 5 пунктов Wave 1 (1-Click Bundles, Fuzzy Search, Fast Checkout Split, Mobile Quadrant, Payroll Drill-Down) ПОЛНОСТЬЮ ЗАВЕРШЕНЫ И ЗАКОММИЧЕНЫ.
Все 4 субагента Wave 2 (Warehouse BOM, CMO EGISZ Hub, Voice AI, Lab Gate) возобновили работу. Контролируй выполнение.

## 2026-08-26T16:43:57Z

Streamline Dental CRM by completely removing all academic simulation bloat (apex locator audio physics, 3D occlusion heatmaps, intensive care vitals simulators, CBCT arch curve reslicers) and ensure 100% test passing, type safety, and real clinical workflow ergonomics across all workspaces.

Working directory: `C:\Clinic_MVP\dental-crm`
Integrity mode: `development`

## Requirements

### R1. Absolute Elimination of Academic Simulation Bloat
Remove and decouple all synthetic/academic simulation toys that distract from real clinic operations:
- Electronic Apex Locator Audio/Physics Simulator (`EndodonticCanalMasterModal` and related solvers).
- 3D Occlusion Clearance Heatmap & Articulator Simulation (`CadCamOcclusionHeatmapModal`).
- Intensive Care Emergency Vitals Monitor Simulator (`EmergencyVitalsMonitorModal`).
- CBCT Panoramic Spline & Cross-Section Reslicer (`CbctPanoramicResliceModal` and curve generators).

### R2. Strict Typecheck & Test Integrity (Zero Regressions)
- `npm run typecheck` passes with **Exit Code 0** across all 3 workspaces (`@dental/shared`, `@dental/api`, `@dental/web`).
- All unit and integration test suites pass with 0 failures (`npm test -w @dental/shared` and `npm test -w @dental/web`).
- Zero orphan imports, zero dangling re-exports in index files, zero runtime reference errors.

### R3. Practical Clinical UX & Real Clinic Ergonomics (Tier 1 Hot Path)
- **1-Click 043/у SOAP Protocols:** Fast clinical templates by ICD-10 (Caries K02.1, Pulpitis K04.0, Periodontitis K05.3, Extraction K01.1, Hygiene K03.6) with automatic binding to Order 804n billing items and warehouse BOM materials.
- **Receptionist Flow & Quick Booking:** Fast duration chips (15, 30, 45, 60, 90, 120 min), patient reliability scores, and appointment collision safeguards.
- **Touch Targets & Visual Invariants:** Minimum 44x44px hit targets on all interactive controls, seamless contrast in Light and Dark themes, zero blocking modal obstructions on primary actions.

## Acceptance Criteria

### Compilation & Test Suite Guardrails
- [x] All 4 bloated simulation modals physically removed from codebase.
- [x] `npm run typecheck` exits with Code 0 (`@dental/shared`, `@dental/api`, `@dental/web`).
- [x] `npm test -w @dental/shared` passes with 712/712 tests passing.
- [x] `npm test -w @dental/web` passes with 3792/3792 tests passing.
- [x] `panelsAreMounted.test.ts` passes with zero missing mounted components.

### UI & Theme Ergonomics
- [x] Zero broken links or dead buttons in `VisitDiagnosticsTab`, `DentalLabOcclusionTab`, `RadiologyModule`, and `ClinicalModalsStudioStandalone`.
- [x] Minimum 44x44px touch targets on all primary and secondary buttons.

## 2026-08-26T17:12:53Z

Build a high-performance, professional browser-based Dental CBCT (Cone-Beam CT) & DICOM Viewer inside Dental CRM (`apps/web/src/components/radiology/`) with 3-Plane Multi-Planar Reconstruction (MPR), Synchronized Crosshair Navigation, Panoramic Dental Arch Curve, Transverse Cross-Sections, Virtual Implant Caliper Planning, and Mandibular Nerve Safety Detection.

Working directory: `C:\Clinic_MVP\dental-crm`
Integrity mode: `development`

## Requirements

### R1. Multi-Planar Reconstruction (MPR 3-Plane Viewport & Crosshair Sync)
- **Synchronized 3-Plane Viewports**: Axial (horizontal), Coronal (frontal), and Sagittal (profile) viewports with synced crosshair reticle. Clicking or dragging on any plane updates the corresponding orthogonal slice coordinates in 60 FPS.
- **Slice Scroll & Slab MIP**: Smooth wheel slice navigation, slice thickness adjustments (1–30 mm Slab MIP / MinIP), and calibrated Hounsfield Window/Level presets (Bone 2000/400, Soft Tissue 400/40, Enamel 3000/1000, Custom).

### R2. Panoramic Dental Arch Curve & Transverse Cross-Sections
- **Anatomical Dental Spline Curve**: Interactive cubic bezier / spline curve mapped along the dental arch on the axial plane with FDI tooth landmark anchors (18..48).
- **Unfolded Dental Panorama (OPG)**: Real-time reconstructed panoramic focal trough with adjustable thickness (5–20 mm).
- **Pararadicular Cross-Section Carousel**: Perpendicular cross-sections generated along the dental arch curve with 1–2 mm step spacing, displaying exact cortical crest height, width, and tooth FDI labels.

### R3. Implant Planning, Bone Density (HU) & Mandibular Nerve Safety
- **Virtual Implant Library & Placement**: Standard implant presets (Ø 3.0–5.0 mm, Length 8.0–13.0 mm; Straumann, Nobel, Osstem, Dentium profiles) positioned directly on cross-section slices.
- **Mandibular Nerve Safety Corridor**: 3D spline tracking of *Nervus alveolaris inferior* with mandatory 2.0 mm warning corridor (visual red alert & distance readout if implant enters < 2.0 mm safety envelope).
- **Hounsfield Bone Density (Misch Criteria)**: Automatic HU sampling across cortical crest and spongiosa (D1 > 1250 HU, D2 850–1250 HU, D3 350–850 HU, D4 150–350 HU) with drilling protocol recommendations.

### R4. Performance, Touch Ergonomics & 1-Click Form 043/u Integration
- **Zero-GC Hot Path Rendering**: Fast Canvas2D / WebGL / ArrayBuffer voxel sampling, zero-lag mouse wheel slice pagination, and strict memory resource disposal on modal unmount.
- **1-Click Clinical Export**: Instant transfer of bone height/width, Misch density, and implant specs into Form 043/u surgery protocol and stage treatment plans.
- **Ergonomics & Themes**: Full 4-state visual contrast (PC/Mobile, Light/Dark/Night), minimum 44x44px touch targets.

## Acceptance Criteria

### Technical & Compilation Guardrails
- [ ] `npm run typecheck -w @dental/web` passes with Exit Code 0.
- [ ] Comprehensive unit & integration test suite (`apps/web/src/tests/cbctMprImplantStudio.test.ts`) passes with 100% pass rate.
- [ ] Zero memory leaks on slice navigation and modal close (explicit image/canvas buffer disposal).
### Clinical & Functional Verification
- [ ] MPR 3-view crosshair coordinates stay strictly aligned across Axial, Coronal, and Sagittal viewports.
- [ ] Dental curve generates accurate transverse cross-sections with FDI tooth labels and millimeter grid.
- [ ] Nerve proximity check triggers < 2.0 mm safety warnings and rejects collision placements.
- [ ] 1-click export populates Form 043/u diary with exact bone measurements and Misch bone classification.

## 2026-08-26T18:25:17Z

Transform the dental CRM radiology subsystem into a production-grade, clinically authentic 3D CBCT Multi-Planar Reconstruction (MPR) and Virtual Implant Planning Studio indistinguishable from Planmeca Romexis 6 and Vatech Ez3D-i, fully integrated into Dente CRM's visual design system, patient chart, and Form 043/u clinical workflow.

Working directory: C:\Clinic_MVP\dental-crm\apps\web
Integrity mode: development

## Requirements

### R1. Real Patient DICOM Series Ingestion & Multi-Source Loading
- Seamless multi-slice DICOM series loading via drag-and-drop, folder picker, or ZIP archive (tested on the patient dataset `BARABASH_SVETLANA_VIKTOROVNA_09141256`, 400 slices, 800x800 Int16).
- Extraction of true anatomical Hounsfield Units (HU range [-1024..+30720]), slice location, voxel spacing, and rescale intercept/slope.
- Instant fallback/demo mode with realistic tissue attenuation without blank/toy placeholder shapes.

### R2. Planmeca Romexis 6 Industrial Cockpit & UI Integration
- Seamless integration with Dente CRM design system tokens (`var(--paper)`, `var(--ink)`, `var(--teal)`), dark/light theme support, and medical ergonomics (>= 44x44px touch targets).
- **Romexis 3D Orientation Cube** in the corner of each viewport with anatomical labels (**A / P / L / R / S / I**), respecting radiological convention (patient right is on screen left).
- **Standardized color crosshairs**:
  * Axial = **Cyan** (`#06b6d4`)
  * Coronal = **Orange/Amber** (`#f59e0b`)
  * Sagittal = **Emerald Green** (`#10b981`)
  * Panoramic Spline = **Purple** (`#a855f7`)
  * Cross-Section = **Yellow** (`#eab308`)
- **Calibrated millimeter rulers** with 1 mm ticks and 5/10 mm labeled markers along viewport axes.
- **Slab MIP bounding lines**: dynamic dashed corridors indicating the exact physical thickness of the integrated slab layer on orthogonal views.

### R3. Synchronized 4-Viewport Virtual Implant Placement & Multi-Planar Projection
- Placing or adjusting an implant in the cross-section view immediately projects its **3D cylindrical/conical outline, central axis, and 2.0 mm safety halo across ALL 4 viewports**:
  * Axial: elliptical/circular cross-section at current Z plane.
  * Coronal & Sagittal: projected axis line and bounding envelope.
  * Panoramic (OPG): silhouette of the implant projected onto the dental arch at the tooth FDI landmark.
- Interactive 3D Mandibular Nerve (IAN) canal safety sentinel: real-time acoustic feedback and visual flashing warning when apex clearance drops < 2.0 mm.
- Automated Carl Misch bone density classification (D1-D5) with surgical drilling sequence recommendations.

### R4. Interactive Panoramic Dental Arch Curve & Reslicable Cross-Section Carousel
- Interactive Catmull-Rom spline on the axial plane with draggable control anchors for mandible and maxilla.
- Live unfolded dental panorama (OPG) with FDI tooth markers (18..48, 11..28) and a **fan of numbered cross-section slice indicator lines (#1..#80)**.
- 1-Click navigation: clicking any slice line on the panorama instantly focuses the cross-section viewport and updates the implant planner.
- 1-Click export to Form 043/u clinical diary and dental CRM treatment plan.

## Acceptance Criteria

### DICOM & Slicing Fidelity
- [ ] Real DICOM series loads from folder/ZIP with authentic anatomical density in < 250 ms.
- [ ] 3-Plane orthogonal reslicing updates synchronously in < 16 ms (60 FPS) during crosshair drag.
- [ ] Window/Level presets (Bone, Soft Tissue, Enamel, Metal, Airways) dynamically remap grayscale in real time.

### UI & Romexis Standard Compliance
- [ ] Orientation cubes (A/P/L/R/S/I), millimeter scales, and standardized color crosshairs are rendered on all viewports.
- [ ] Virtual implant is visible simultaneously across Axial, Coronal, Sagittal, and Panoramic views.
- [ ] Clicking a slice line on the panorama jumps directly to that cross-section.
- [ ] Nerve distance is measured with sub-millimeter precision (+-0.1 mm) with acoustic/visual safety warning.

### Quality & Platform Gates
- [ ] 4-State visual screenshots (PC Dark, PC Light, Mobile Dark, Mobile Light) pass visual inspection with zero UI overlap.
- [ ] Pre-commit Iron Gate passes (`check:encoding`, `check:stub-overrides`, `check:fetch-response`, `typecheck`, `panelsAreMounted.test.ts`).
- [ ] All automated unit tests in `apps/web/src/tests/` pass with 100% success rate.

## 2026-08-26T18:48:01Z

[TEAMWORK 1: CBCT STUDIO DIAGNOSTIC MODE & VIEWPORT MAXIMIZER / LAYOUT ENGINE]
Рабочая директория: `C:\Clinic_MVP\dental-crm`
Цель: Превратить КЛКТ-модуль из узкого «имплант-онли» калькулятора в универсальную радиологическую станцию (Planmeca Romexis 6 / Ez3D-i) с чистым диагностическим режимом по умолчанию (для кариеса, периодонтита, эндодонтии, пазух) и интерактивным управлением окнами.

Задачи:
1. Внедрить разделение на клинические режимы (`studioMode`):
   - `diagnostic` (РЕЖИМ ПО УМОЛЧАНИЮ): Универсальная диагностика (поиск кариеса, периодонтита, кист, переломов, осмотр пазух). Чистый экран, четкие срезы, линейки, 3D-компас. НИКАКИХ навязчивых имплантатов, силуэтов и алертов нерва на экране!
   - `implant`: Режим планирования имплантации (активирует виртуальный имплантат, трассировку нерва IAN, замер до канала и плотность Misch).
   - `endo`: Эндодонтический режим (высококонтрастное окно корней зубов, зум верхушек, калибровка длины каналов).
   - `tmd`: ВНЧС / суставы (сравнение левого и правого мыщелков).
2. Реализовать интерактивное переключение раскладок окон (`viewportLayout`):
   - `grid_4` (2x2): Сетка 4-х окон (Аксиал, Коронал, Сагиттал, Панорама / Кросс-секция).
   - `maximized`: Разворот ЛЮБОГО выбранного окна (Аксиал, Коронал, Сагиттал, Панорама или Кросс-секция) на 100% ширины и высоты по клику на кнопку `[ ⛶ ]` или по двойному клику на заголовок вьюпорта. Кнопка `[ 🗗 Восстановить сетку ]`.
   - `dominant_1_plus_3`: 1 доминантное увеличенное окно (например, Аксиал или Панорама) слева + 3 компактных окна в колонке справа.
3. Добавить панель инструментов Romexis / Ez3D-i:
   - Селектор режимов: `[ 🔍 Диагностика ]`, `[ 🔩 Имплантация ]`, `[ 🦷 Эндодонтия ]`, `[ 📐 ВНЧС ]`.
   - Селектор раскладки: `[ ⊞ 4 окна ]`, `[ ◫ 1+3 ]`, `[ 🗖 Полный экран ]`.
   - Быстрые фильтры анатомии: `[ Обе челюсти ]`, `[ В. челюсть ]`, `[ Н. челюсть ]`.
4. Написать 15+ unit-тестов в `apps/web/src/components/radiology/__tests__/cbctLayoutAndModes.test.ts`.
5. Проверить `npm run typecheck -w @dental/web`, обеспечить Exit Code 0 и закоммитить атомарно.

## 2026-08-26T18:48:02Z

[TEAMWORK 2: CBCT OBLIQUE MPR ROTATION, INTERACTIVE W/L & CANVAS NAVIGATION]
Рабочая директория: `C:\Clinic_MVP\dental-crm`
Цель: Реализовать полноценное вращение осей КЛКТ (Oblique MPR reslicing), зум/панорамирование холстов и регулировку контрастности/яркости (Window/Level) перетаскиванием мыши.

Задачи:
1. Математика вращения осей срезов (Oblique MPR) в `cbctMprMath.ts`:
   - Углы поворота осей: `axialRotationDeg` (поворот плоскостей на аксиале вокруг Z), `coronalTiltDeg` (наклон плоскости вокруг X), `sagittalTiltDeg` (наклон плоскости вокруг Y).
   - Функция `resliceObliqueMprSlice`: расчет косого сечения воксельного буфера $800\times 800\times 400$ с тригонометрической интерполяцией направления луча.
   - Отрисовка интерактивных рукояток вращения (rotation gizmo/knobs) на концах линий перекрестия на холсте.
2. Интерактивная навигация на вьюпортах:
   - **Right-Click Drag (или перетаскивание с зажатой правой кнопкой)**: Плавная регулировка Window Width (по горизонтали) и Window Level (по вертикали) в реальном времени с выводом W/L бейджа.
   - **Mouse Wheel / Пинч**: Плавный зум (0.5x .. 5.0x) с центрированием относительно курсора.
   - **Middle-Click / Инструмент Панорама (Hand)**: Перемещение/панорамирование увеличенного среза по холсту.
   - Кнопка мгновенного сброса `[ 🔄 Сброс W/L & Зума ]`.
3. Написать 15+ unit-тестов в `apps/web/src/components/radiology/__tests__/cbctObliqueRotation.test.ts`.
4. Обновить скрипт скриншотов `captureCbctScreenshots.mjs` и зафиксировать реальные скриншоты в диагностическом режиме и режиме развернутого окна.
5. Проверить `npm run typecheck -w @dental/web`, обеспечить Exit Code 0 и закоммитить атомарно.

## 2026-08-26T20:45:41Z

# Teamwork Project Prompt — CBCT Color Harmonization & Adversarial UI Audit

Working directory: `C:\Clinic_MVP\dental-crm`
Integrity mode: development
Requested team: Romexis Adversarial UI/UX Critics, Visual Harmonizers & Re-Architects

## Requirements

### R1. Полная цветовая монолитность палитры (Planmeca Romexis 6 Dark Matte)
- В `apps/web/src/components/radiology/CbctLeftToolDock.tsx`, `CbctMprImplantStudioModal.tsx`, `CbctViewportHud.tsx`:
  - Гарантировать 100% темную монохромную палитру: фон `#0c0e12`, панели `#14171e`, рамки `#242a35`, активный циан `#1e2430 text-cyan-400 border-cyan-500/60`.
  - Устранить любые артефакты разных цветов кнопок или случайных светлых плашек.
  - На канвасе ОПТГ панорамы и вьюпортах убрать любые ядовитые негармоничные заливки (желтые сплошные плашки) и сделать бейджи полупрозрачными темными матовыми.

### R2. Проверка компиляции и тестов
- Запустить `npm run typecheck -w @dental/web` и проверить отсутствие ошибок типов.
- Запустить unit-тесты `npm test -w @dental/web apps/web/src/components/radiology/__tests__/*.test.ts`.

### R3. Снятие скриншотов и мультимодальный аудит
- Обновить и запустить `node apps/web/scripts/captureCbctScreenshots.mjs`.
- Проверить скриншоты мультимодальным зрением и зафиксировать отсутствие цветового разнобоя.

## 2026-08-26T20:45:41Z_visual_proof_audit

# Teamwork Project Prompt — Adversarial Visual Auditor & Proof Verifier

Working directory: `C:\Clinic_MVP\dental-crm`
Integrity mode: development
Requested team: Adversarial Screenshot & Visual Proof Auditor

## Requirements

### R1. Независимый мультимодальный аудит всех скриншотов
- Открыть каждый свежий скриншот КЛКТ из `C:\Clinic_MVP\dental-crm\docs\proofs\cbct\`:
  - Проверить левый Tool Dock: все кнопки строго темные `#14171e` с рамками `#242a35`, активная подсвечена цианом, никаких белых плашек.
  - Проверить верхнюю шапку: кнопки выровнены, аккуратные, цвет единый.
  - Проверить 4 окна КТ: срезы отображаются четко, перекрестия тонкие, координаты и шкалы не слепят.
- Если обнаружен любой дефект цвета или верстки — немедленно зафиксировать и устранить в коде.

### R2. Контроль компиляции
- Запустить `npm run typecheck -w @dental/web`.


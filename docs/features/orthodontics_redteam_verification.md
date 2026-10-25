# Ортодонтия, ТРГ-цефалометрия и ОПТГ: Red Team верификация и оптимизация

> **Статус**: ПРОВЕРЕНО: ЧИСТО (100% PASS, 113/113 тестов в web ortho suite, 8/8 тестов в api ortho suite)  
> **Мандаты**: Мандат 8b (Архитектурная декомпозиция $\le 120$ строк на модуль), Мандат 8e (Doctor Autonomy), Мандат 8n (Соло-ортодонт), Мандат 8am (Unified Design Code: 1 Primary CTA), Мандат 8x (Живой клинический язык без номеров советских приказов), Мандат 8wx (Anti-RAM Hog / Zero-Simulators), Мандат 8wy (Zero-Mocks), Мандат 8ap (Запрет симуляторов и сырых законов в коде), Apple Mobile HIG.

---

## 1. Декомпозиция монолитов под лимит $\le 120$ строк (Мандат 8b)
Все монолитные компоненты и модули ортодонтии разделены на модули строго до 120 строк:
- `apps/web/src/components/orthodontics/orthoServicesCalculator.ts` (75 строк)
- `apps/web/src/components/orthodontics/orthoServicesCatalog.ts` (51 строка)
- `apps/web/src/components/orthodontics/orthoPatientMemo.ts` (88 строк)
- `apps/web/src/components/orthodontics/orthoProtocolTypes.ts` (101 строка)
- `apps/web/src/components/orthodontics/OrthodonticVisitProtocolWidget.tsx` (90 строк)
- `apps/web/src/components/orthodontics/orthodonticVisitProtocol/useOrthodonticVisitProtocol.ts` (102 строки)
- `apps/web/src/components/orthodontics/orthodonticVisitProtocol/types.ts` (101 строка)
- `apps/web/src/components/orthodontics/orthodonticVisitProtocol/modules/orthoBackendSync.ts` (88 строк)
- `apps/web/src/components/orthodontics/orthodonticVisitProtocol/modules/useOrthoArchwireActions.ts` (74 строки)
- `apps/web/src/components/orthodontics/orthodonticVisitProtocol/modules/useOrthoNormActions.ts` (74 строки)
- `apps/web/src/components/orthodontics/orthodonticVisitProtocol/modules/useOrthoAppliancesActions.ts` (110 строк)
- `apps/web/src/components/orthodontics/orthodonticVisitProtocol/modules/useOrthoMemoActions.ts` (101 строка)
- `apps/web/src/components/orthodontics/orthodonticVisitProtocol/modules/useOrthoSyncEffects.ts` (77 строк)
- `apps/web/src/components/orthodontics/orthodonticVisitProtocol/modules/useOrthoDebouncedAutosave.ts` (26 строк)
- `apps/web/src/components/orthodontics/orthodonticVisitProtocol/modules/useOrthoProtocolGenerated.ts` (62 строки)
- `apps/web/src/components/orthodontics/orthodonticVisitProtocol/modules/useOrthoControlsPropsBuilder.ts` (115 строк)
- `apps/web/src/components/orthodontics/orthodonticVisitProtocol/modules/orthoPreviewPropsBuilder.ts` (21 строка)
- `apps/web/src/components/orthodontics/cephModal/CephalometricReportTab.tsx` (109 строк)
- `apps/web/src/components/orthodontics/cephModal/CephalometricMeasurementsCategories.tsx` (95 строк)
- `apps/web/src/components/orthodontics/cephModal/CephalometricMobileAccordion.tsx` (69 строк)
- `apps/web/src/components/orthodontics/cephModal/CephalometricPresetsBar.tsx` (77 строк)
- `apps/web/src/components/orthodontics/cephModal/CephalometricLandmarksList.tsx` (75 строк)
- `apps/web/src/components/orthodontics/cephModal/CephalometricMobileNav.tsx` (78 строк)
- `apps/web/src/components/orthodontics/cephModal/CephLandmarkCanvas.tsx` (104 строки)
- `apps/web/src/components/orthodontics/cephModal/types.ts` (68 строк)
- `apps/web/src/components/orthodontics/cephalometric/skeletalMeasurements.ts` (87 строк)
- `apps/web/src/components/orthodontics/cephalometric/steinerSkeletal.ts` (101 строка)
- `apps/web/src/components/orthodontics/cephalometric/downsSkeletal.ts` (118 строк)
- `apps/web/src/components/orthodontics/cephalometric/verticalSkeletal.ts` (101 строка)

---

## 2. Искоренение канцелярита, номеров приказов и хардкодных темных заглушек (Мандаты 8x & 8am)
- **Искоренение номеров законов**: функции переименованы в семантические (`calculateOrthodonticServices`, `OrthodonticServiceItem`). Все пользовательские названия очищены от канцелярских номеров («Медицинская карта приёма», «Каталог процедур», «Протокол ортодонтического приёма»).
- **CSS-токены вместо `bg-slate-950`**: все хардкод-классы `bg-slate-950` и `style={{ backgroundColor: "#020617" }}` заменены на семантические переменные `var(--paper)`, `var(--paper-soft)`, `var(--line)`, `var(--ink)`, `var(--primary)`. Исключены ослепляющие черные дыры в светлой теме и белые пятна в темной теме.

---

## 3. Автономия врача и клинический экспресс-протокол (Мандат 8e & 8am)
- **1-клик классификация и протокол**:
  - Скелетные классы по Steiner (угол ANB): I (Норма 2.0°), II (Дистальный), III (Мезиальный).
  - Классификация по Энглю: I, II/1, II/2, III.
  - Аномалии прикуса: сагиттальные, вертикальные, трансверзальные.
  - Состояние ВНЧС и гнатологии: безболезненная пальпация, отсутствие девиаций и суставного шума.
  - Рабочие дуги: термоактивные NiTi .014, .016, .018, сталь SS .019x.025, TMA.
  - Матрица межчелюстных эластиков: II класс, III класс, вертикальные, перекрестные, асимметричные.
- **Единый дизайн-код (Мандат 8am)**:
  - Ровно ОДНА Primary CTA кнопка в видимой области: полноширинная `«Зафиксировать ортодонтический протокол»` (высота 40px на десктопе, $\ge 44$px на мобильном).
  - Вспомогательные действия вынесены в компактную вторичную строку (`Печать`, `Услуги`, `Отмена`).
  - Все кнопки действий всегда активны и никогда не блокируются (`disabled: false`), поддерживается debounced автосейв.

---

## 4. Apple Mobile HIG: Мобильная эргономика и ликвидация обрезаний
- **Нативный Bottom Sheet**:
  - Выезд снизу со скруглением `rounded-t-[24px]` и тактильным хэндлом 36×5px.
  - Сегментный переключатель шагов `[1. Протокол & дуги | 2. Дневник & чек (3)]`.
  - Все кликабельные элементы с тач-таргетом $\ge 44\times 44$px.
  - Липкая нижняя панель (Floating Bottom Bar) с крупной кнопкой `[К дневнику и чеку (3)]` (46px).
  - Нулевой паразитный горизонтальный скролл (`0px` дрифта на 390px).

---

## 5. Визуальные доказательства (Red Team Visual Proofs)

Все 8 скриншотов сняты на живом стенде через Playwright и физически проверены через `read_file`:

| Снимок | Файл | Разрешение / Размер | Статус |
|---|---|---|---|
| ☀️ PC Light (Протокол) | [`ortho_pc_light_1440x900.png`](../proofs/orthodontics/ortho_pc_light_1440x900.png) | 1440×900 / 461 KB | [ПРОВЕРЕНО: ЧИСТО] 1 Primary CTA `«Зафиксировать ортодонтический протокол»`, чистые токены |
| 🌙 PC Dark (Протокол) | [`ortho_pc_dark_1440x900.png`](../proofs/orthodontics/ortho_pc_dark_1440x900.png) | 1440×900 / 471 KB | [ПРОВЕРЕНО: ЧИСТО] Контрастная темная тема, чистые токены, дневник SOAP |
| 📱 Mobile Light (Протокол) | [`ortho_mobile_light_390x844.png`](../proofs/orthodontics/ortho_mobile_light_390x844.png) | 390×844 / 130 KB | [ПРОВЕРЕНО: ЧИСТО] Нативный Bottom Sheet, тач $\ge 44$px, липкий футер, без скролла |
| 📱 Mobile Dark (Протокол) | [`ortho_mobile_dark_390x844.png`](../proofs/orthodontics/ortho_mobile_dark_390x844.png) | 390×844 / 136 KB | [ПРОВЕРЕНО: ЧИСТО] Идеальный темный контраст без засветов |
| ☀️ PC Light (ТРГ-отчёт) | [`ceph_pc_light_1440x900.png`](../proofs/orthodontics/ceph_pc_light_1440x900.png) | 1440×900 / 421 KB | [ПРОВЕРЕНО: ЧИСТО] 16 анатомических ориентиров, расчет углов Штайнера, токены без bg-slate-950 |
| 🌙 PC Dark (ТРГ-отчёт) | [`ceph_pc_dark_1440x900.png`](../proofs/orthodontics/ceph_pc_dark_1440x900.png) | 1440×900 / 437 KB | [ПРОВЕРЕНО: ЧИСТО] Четкая темная цефалометрия, расчет углов, чистый HUD |
| 📱 Mobile Light (ТРГ-отчёт) | [`ceph_mobile_light_390x844.png`](../proofs/orthodontics/ceph_mobile_light_390x844.png) | 390×844 / 134 KB | [ПРОВЕРЕНО: ЧИСТО] Сенсорный выбор точек, переключение вкладок 44px |
| 📱 Mobile Dark (ТРГ-отчёт) | [`ceph_mobile_dark_390x844.png`](../proofs/orthodontics/ceph_mobile_dark_390x844.png) | 390×844 / 132 KB | [ПРОВЕРЕНО: ЧИСТО] Мобильный темный ТРГ-анализ без дефектов верстки |

---

## 6. Машинные тесты и компиляция
- **Тестовый сьют фронтенда**: 113 unit/integration тестов (`apps/web/src/components/orthodontics/__tests__/`) -> **113 passing, 0 failing (100% PASS)**.
- **Тестовый сьют бэкенда**: 8 интеграционных тестов (`apps/api/src/tests/routes/orthodonticsRoutes.test.ts`) -> **8 passing, 0 failing (100% PASS)**.
- **TypeScript**: 0 ошибок компиляции в `apps/web/src/components/orthodontics/`.

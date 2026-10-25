# Доказательства и архитектурный отчет: Рецепты, каталог МНН и назначения (Prescriptions, MNN Catalog & Drug Orders)

## 🎯 Архитектурная цель и Высшая инквизиция (The Hammer & Mandates 8b, 8e, 8y, 8am, 8ap, 8aq)

1. **Тотальная декомпозиция монолитов фронтенд-генератора по Мандату 8b (Layer 0 Types -> Layer 1 Presets -> Layer 2 Engine -> Layer 5 Facade, все файлы $\le 120$ строк)**:
   - `prescriptionPresets.ts` (ранее 438 строк) декомпозирован в фасад (33 строки) и подмодули:
     * `prescriptionPresetTypes.ts` (32 строки)
     * `prescriptionPresetsAntibiotics.ts` (91 строка)
     * `prescriptionPresetsNsaids.ts` (91 строка)
     * `prescriptionPresetsTopical.ts` (105 строк)
     * `prescriptionPresetsSpecial.ts` (105 строк)
   - `prescriptionPackages.ts` (ранее 181 строка) декомпозирован в фасад (20 строк) и подмодули:
     * `prescriptionPackageTypes.ts` (14 строк)
     * `prescriptionPackagesCore.ts` (75 строк)
     * `prescriptionPackagesExtended.ts` (78 строк)
     * `prescriptionPackagesPediatric.ts` (21 строка)
   - `prescriptionMnnCatalog.ts` (ранее 383 строки) декомпозирован в фасад (10 строк) и подмодули:
     * `prescriptionMnnTypes.ts` (45 строк)
     * `prescriptionMnnDataSystemic.ts` (119 строк)
     * `prescriptionMnnDataTopical.ts` (49 строк)
     * `prescriptionMnnData.ts` (21 строка)
     * `prescriptionMnnValidator.ts` (57 строк)
     * `prescriptionSignaValidator.ts` (65 строк)
   - `prescriptionDosageEngine.ts` (ранее 402 строки) декомпозирован в фасад (8 строк) и подмодули:
     * `prescriptionDosageTypes.ts` (41 строка)
     * `prescriptionDosagePediatricRules.ts` (100 строк)
     * `prescriptionDosageCalculator.ts` (111 строк)
     * `prescriptionDosageValidator.ts` (103 строки)
   - `prescriptionEngine.ts` (ранее 219 строк) декомпозирован в фасад (12 строк) и подмодули:
     * `prescriptionEngineTypes.ts` (94 строки)
     * `prescriptionDocumentGenerator.ts` (78 строк)
     * `prescriptionMemoFormatter.ts` (37 строк)
   - `generator/index.ts` — чистый фасад реэкспорта (9 строк).
   - `apps/web/src/components/prescriptions/DirectPrescriptionLauncher.tsx` (93 строки) — суверенный шлюз прямого монтирования в боевой UI (`AppShell.tsx`), активируемый через хэш `#prescriptions`, `#rx` и CustomEvent `dente:open-prescriptions` (Мандат 8aq).

2. **Автономия врача и ноль фармакологической паранойи (Мандаты 8e & 8y)**:
   - Стоматолог лечит зубы, а не заведует аптекой! Кнопка «Печать рецепта» (Primary CTA) и кнопки добавления НИКОГДА не блокируются (`disabled`).
   - Тотальный запрет на блокирующие DDI (Drug-Drug Interaction) алерты. При наличии аллергии в анамнезе (пенициллины, НПВС) выводится ненавязчивая пассивная янтарная плашка `⚠️` с бейджем `Автономия врача (Печать доступна)`.

3. **Искоренение советского канцелярита и номеров приказов (Мандаты 8ap и 8x)**:
   - Устранены сырые номера приказов «1094н», «Форма 107-1/у», «Форма 148-1/у-88» из пользовательских текстов, заголовков и памяток пациента.
   - Использован живой профессиональный русский язык: «Рецептурный бланк», «Специальный рецепт», «Рекомендации пациенту по приёму препаратов».

4. **Единый дизайн-код кнопок и 1 Primary CTA (Мандат 8am & UI Standards)**:
   - Ровно ОДНА Primary CTA кнопка на видимый контекст: «Печать рецепта» (бирюзовый акцент `primary-button`).
   - Все вспомогательные действия («Скопировать для пациента», «Перенести в дневник визита», «Печать памятки») оформлены стандартным классом `secondary-button` с высотой 36px на десктопе и touch target $\ge 44$px на смартфонах.
   - Исключены любые голые текстовые клики без рамок/фона. Исключены мультяшные raw-эмодзи (`⚠️`, `✓`) в разметке — используются векторные Lucide-иконки (`AlertTriangle`, `Check`, `Pill`, `Printer`, `Copy`).

5. **Apple HIG Touch Ergonomics (iOS / iPadOS Standards)**:
   - На смартфонах ($\le 768\text{px}$) модалка рецептов трансформируется в нативный Bottom Sheet с тактильным Drag Handle (`w-10 h-1`), скруглением `rounded-t-[24px]` и закрепленным блоком действий в зоне большого пальца (Natural Thumb Zone).
   - Двухрежимный переключатель Segmented Bar: [ Каталог и наборы | Предпросмотр бланка ].

---

## 📸 4-State & 6-State Visual Proofs (1440×900 PC & 390×844 Mobile)
Снято на живом стенде DENTE (`http://127.0.0.1:5173/?demo=true#prescriptions`) с реальным монтированием в `AppShell.tsx`.

| Состояние | Разрешение | Скриншот | Описание эргономики |
|---|---|---|---|
| ☀️ **PC Light** | 1440×900 | [`01_prescription_modal_pc_light.png`](./01_prescription_modal_pc_light.png) | Каталог препаратов, быстрый выбор в 1 тап, клиника 1 клик, живой предпросмотр бланка с пассивным контролем аллергий |
| 🌙 **PC Dark** | 1440×900 | [`02_prescription_modal_pc_dark.png`](./02_prescription_modal_pc_dark.png) | Темная тема: высокая контрастность, глубокий фон, четкие штампы и бирюзовые акценты |
| 📱 **Mobile Light** | 390×844 | [`03_prescription_modal_mobile_light.png`](./03_prescription_modal_mobile_light.png) | Нативный iOS Bottom Sheet, Drag Handle, 1-тап пилюли, 2x2 кнопки в Thumb Zone |
| 📱 **Mobile Dark** | 390×844 | [`04_prescription_modal_mobile_dark.png`](./04_prescription_modal_mobile_dark.png) | Мобильная темная тема: адаптивный формуляр, touch targets $\ge 44$px |
| 📱 **Mobile Preview Light** | 390×844 | [`05_prescription_modal_mobile_preview_light.png`](./05_prescription_modal_mobile_preview_light.png) | Вкладка «Предпросмотр бланка» на смартфоне (светлая тема) |
| 📱 **Mobile Preview Dark** | 390×844 | [`06_prescription_modal_mobile_preview_dark.png`](./06_prescription_modal_mobile_preview_dark.png) | Вкладка «Предпросмотр бланка» на смартфоне (темная тема) |

Канонические псевдонимы файлов:
- [`prescription_pc_light_1440x900.png`](./prescription_pc_light_1440x900.png)
- [`prescription_pc_dark_1440x900.png`](./prescription_pc_dark_1440x900.png)
- [`prescription_mobile_light_390x844.png`](./prescription_mobile_light_390x844.png)
- [`prescription_mobile_dark_390x844.png`](./prescription_mobile_dark_390x844.png)

---

## 🧪 Верификация тестами (Vitest 100% PASS, 81 tests)

Запуск команды: `npx vitest run apps/web/src/components/prescriptions/ apps/web/src/tests/prescriptionGenerator.test.ts`
- ✓ `apps/web/src/tests/prescriptionGenerator.test.ts` (11 tests)
- ✓ `apps/web/src/components/prescriptions/__tests__/prescriptionMnnSignaEngine.test.ts` (17 tests)
- ✓ `apps/web/src/components/prescriptions/__tests__/prescriptionExpressSetsSomatic.test.ts` (6 tests)
- ✓ `apps/web/src/components/prescriptions/__tests__/prescriptionCockpitDecompositionRedTeam.test.tsx` (11 tests)
- ✓ `apps/web/src/components/prescriptions/__tests__/prescriptionPrintTokensAndSpecial.test.ts` (4 tests)
- ✓ `apps/web/src/components/prescriptions/__tests__/prescriptionPrintAutonomyInquisition.test.ts` (22 tests)
- ✓ `apps/web/src/components/prescriptions/__tests__/medicalPrescriptionAutonomyWave52.test.tsx` (10 tests)

**Итого Web**: 7 test files, **81 passed**, 0 failed.

---

## 📏 Контроль лимитов файлов (Мандат 8b: Все файлы $\le 120$ строк)
Сканирование директории `apps/web/src/components/prescriptions/` (без тестов):
- **0 файлов превышают 120 строк**.
- 100% модулей удовлетворяют жесткому архитектурному лимиту.

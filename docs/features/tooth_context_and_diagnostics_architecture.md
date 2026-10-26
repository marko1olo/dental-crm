# Tooth Context Drawer, Diagnostic Drawer & ICD-10 Catalog Architecture

## Архитектурный обзор и статус инквизиции
- **Мандат 8b (Декомпозиция монолитов $\le 120$ строк):**
  - Все монолиты стилей и логики распилены на компактные независимые модули:
    - `ToothContextDrawer.css` (1602L -> 42L фасад + 21 модуль в `toothDrawer/styles/`, все $\le 108$ строк).
    - `photoProtocol.css` (920L -> 18L фасад + 12 модулей в `orthoModal/styles/`, все $\le 108$ строк).
    - `icd10Selector.css` (586L -> 8L фасад + 6 модулей в `icd10/styles/`, все $\le 108$ строк).
    - `DiagnosticDrawer.css` (441L -> 24L фасад + 5 модулей в `diagnosticDrawer/styles/`, все $\le 101$ строк).
    - `ToothSurfacesAndEndoMatrix.tsx` (380L -> 77L координатор + 7 модулей в `surfaces/`, все $\le 106$ строк).
    - `ToothRvgThumbnail.tsx` (230L -> 109L координатор + 3 модуля в `rvg/`, все $\le 108$ строк).
    - `ToothFamilyLoyaltyAccordion.tsx` (220L -> 98L координатор + 3 модуля в `family/`, все $\le 99$ строк).
    - `icd10DentalCatalog.ts` (1400L -> 56L координатор + 21 модуль в `icd10/catalog/`, все $\le 98$ строк).
    - `Icd10ClinicalSelector.tsx` (480L -> 15L фасад + 10 модулей в `icd10/selector/`, все $\le 114$ строк).
  - В каталоге `apps/web/src/components/diagnostics` **0** производственных файлов превышают 120 строк!

- **Мандат 8e & 8n (Автономия врача и суверенитет соло-практики):**
  - Кнопки («Сохранить», «Закрыть», выбор статуса, назначение плана, привязка фотопротокола) НИКОГДА не блокируются (`disabled={false}`).
  - 1-клик физиологическая норма: выбор статуса «Здоров» / «Интактный» сбрасывает патологические маркеры в 1 клик.
  - Дебаунсированный автосейв черновиков на лету защищает врача от потери набранного текста при случайном закрытии шторки.
  - Ровно ОДНА Primary CTA кнопка (Мандат 8am).

- **Мандат 8x & 8ap (Анти-канцелярит & чистый клинический язык):**
  - Полное отсутствие регуляторных номеров бланков («Форма 043/у», «804н», «257/у») и dev-жаргона в пользовательском интерфейсе («Мандат 8e» заменен на «Автономия врача и доказательность»).
  - Тотальный запрет упоминаний сторонних CRM (StomX, IDENT, DentalPRO).
  - Чистая клиническая номенклатура: «Карта зуба», «Диагностика», «Кариес дентина», «Фотопротокол».

- **Apple HIG Touch Ergonomics (Мандаты 8ze, 8al):**
  - Сенсорные мишени $\ge 44\times 44\text{px}$ на мобильных/сенсорных экранах.
  - Мобильный лейаут статусов в 2 колонки (`grid-template-columns: repeat(2, 1fr)` с `white-space: nowrap`), полностью исключивший перенос слова «Периодонтит».
  - 0px паразитного горизонтального скролла (`overflow-x: clip; max-width: 100vw;`).
  - Учёт Safe Area Insets (`env(safe-area-inset-bottom)`).

## Red Team Visual Proofs (4-State Matrix)

### Tooth Context Drawer (`docs/proofs/diagnostics/`)
- ☀️ **PC Light (1440×900):** `docs/proofs/diagnostics/01_tooth_drawer_pc_light.png`
- 🌙 **PC Dark (1440×900):** `docs/proofs/diagnostics/02_tooth_drawer_pc_dark.png`
- 📱 **Mobile Light (390×844):** `docs/proofs/diagnostics/03_tooth_drawer_mobile_light.png`
- 📱 **Mobile Dark (390×844):** `docs/proofs/diagnostics/04_tooth_drawer_mobile_dark.png`

### Дополнительные верификационные скриншоты
- ☀️ **Photo Protocol PC Light (1440×900):** `docs/proofs/diagnostics/05_photo_protocol_pc_light.png`
- 🌙 **Photo Protocol PC Dark (1440×900):** `docs/proofs/diagnostics/06_photo_protocol_pc_dark.png`
- ☀️ **Diagnostic Drawer PC Light (1440×900):** `docs/proofs/diagnostics/07_diagnostic_drawer_pc_light.png`
- 🌙 **Diagnostic Drawer PC Dark (1440×900):** `docs/proofs/diagnostics/07_diagnostic_drawer_pc_dark.png`

## Верификация и тестирование
- **Vitest Suites:** `apps/web/src/components/diagnostics/__tests__/` (4 тест-сьюта, 31 тест, 100% pass).
- **CSS Tokens & Syntactic Audit:** `scripts/check-css-tokens.mjs` — 0 неразрешенных токенов во всех темах.
- **Line Count Compliance:** `apps/web/src/components/diagnostics` — 0 производственных файлов > 120 строк.

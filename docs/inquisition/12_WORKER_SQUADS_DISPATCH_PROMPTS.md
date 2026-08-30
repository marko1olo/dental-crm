# БОЕВЫЕ СПЕЦИФИКАЦИИ И ПРОМПТЫ ДЛЯ 7 СПЕЦИАЛИЗИРОВАННЫХ БРИГАД

**Стандарт:** The Hammer Supreme Constitution (`.agents/MASTER_PROMPT.md`, `.agents/THE_HAMMER_MASTER_PROMPT.md`, `.agents/AGENTS.md`)  
**Обязательное чтение перед работой:** Каждый субагент ОБЯЗАН прочитать файлы Конституции целиком до первого действия.  
**Принцип:** ZERO MOCKS, ZERO PLACEHOLDERS, 100% PRODUCTION-READY CODE.

---

## 🔴 БРИГАДА 1: TYPOGRAPHY, EMOJIS PURGE & DOCUMENT PRINT HARDENING

### 📋 Мандат и правила Бригады 1:
- **Целевые файлы:**
  - `apps/web/src/components/documents/InformedConsent1051nModal.tsx`
  - `apps/web/src/components/documents/Prescription107_1yModal.tsx`
  - `apps/web/src/components/documents/ActCompleted804nModal.tsx`
  - `apps/web/src/components/documents/Form043ClinicalPrintModal.tsx`
  - `apps/web/src/components/documents/PostOpCarePatientMemoModal.tsx`
  - `apps/web/src/components/documents/TaxDeductionFnsModal.tsx`
  - `apps/web/src/components/lab/DentalLabOrderModal.tsx`
  - `apps/web/src/components/finance/PatientBillingModal.tsx`
  - `apps/web/src/components/finance/Billing1CExportModal.tsx`
- **Запретная зона:** Любые файлы расписания, 3D КЛКТ, шейдеров, бекенда Fastify, схемы базы данных `schema.ts`.
- **Конкретные дефекты к устранению:**
  1. Полное удаление всех мультяшных эмодзи (`🔪`, `💉`, `🧚`, `🦴`, `🔩`, `👑`, `💊`, `🧴`, `🧊`, `🥛`, `☕`, `⚠️`, `💳`, `💵`, `📱`, `🤝`, `⚡`, `🗓️`). Замена на строгие векторные иконки из библиотеки `lucide-react` (например, `Sparkles`, `ShieldCheck`, `Pill`, `FileText`, `CreditCard`, `Calendar`).
  2. Расстановка неразрывных пробелов `\u00A0` перед знаками валют (`₽`), процентами (`%`), единицами измерения (`дн.`, `мг`, `мл`, `р/сут`) и номерами (`№`, `ФОТО`, `ИНН`).
  3. Ликвидация разрывов чисел: суммы вида `482 500 ₽` оборачивать в неразрывный формат через `formatMoneyRu()` с неразрывным пробелом `\u00A0` и запретом переноса `whitespace-nowrap`.
  4. Ликвидация английских амперсандов `&` в русскоязычных заголовках (замена на «и» или слэши `/`).
  5. Устранение слипания иконок с текстом (например, `🔍оиск` -> явный `gap-2` в flex-контейнере).
- **Гейты верификации Бригады 1:**
  - `npm run check:encoding` (Exit 0)
  - `npm run typecheck -w @dental/web` (Exit 0)
  - Проверка отсутствия эмодзи: `grep_search` по регулярке эмодзи возвращает 0 совпадений в целевых файлах.

---

## 📱 БРИГАДА 2: MOBILE 390px OVERFLOW, FITTS ERGONOMICS & Z-INDEX COLLISION

### 📋 Мандат и правила Бригады 2:
- **Целевые файлы:**
  - `apps/web/src/components/schedule/ScheduleGrid.tsx`
  - `apps/web/src/components/telephony/TelephonyFloatingWidget.tsx`
  - `apps/web/src/components/telephony/IncomingCallPopupModal.tsx`
  - `apps/web/src/components/doctor/DoctorShiftCockpitModal.tsx`
  - `apps/web/src/components/odontogram/OdontogramView.tsx`
  - `apps/web/src/components/odontogram/PediatricMixedDentitionModal.tsx`
- **Запретная зона:** Файлы документов (Бригада 1), КЛКТ (Бригада 5), СанПиН (Бригада 4).
- **Конкретные дефекты к устранению:**
  1. Починка катастрофического схлопывания таб-баров на экранах 390px (замена фиксированных абсолютных координат на flex wrap или горизонтальный скролл с `overflow-x-auto touch-pan-x`).
  2. Увеличение всех мобильных тач-таргетов до норматива $\ge 44\times 44\text{px}$ ($\ge 48\text{px}$ для кнопок быстрого действия, чекбоксов, квадрантов зубного ряда, кнопок закрытия `[×]`).
  3. Устранение коллизии плавающего софтфона (`bottom: 80px, right: 16px`): добавить расписанию безопасный правый и нижний клиренс (`pb-24 pr-4 sm:pr-96`), чтобы софтфон никогда не перекрывал слоты 13:00–15:00.
  4. Ликвидация обрезания ФИО врачей и пациентов: добавление `min-w-0 flex-1 break-words` вместо слепого `truncate` на ключевых медицинских данных.
  5. Починка пустого белого экрана детской одонтограммы (`PediatricMixedDentitionModal.tsx`): отрендерить честную молочную формулу 51–85 с кнопками $\ge 44\text{px}$.
- **Гейты верификации Бригады 2:**
  - `npm run check:encoding` (Exit 0)
  - `npm run typecheck -w @dental/web` (Exit 0)
  - Playwright mobile test (Exit 0, 0 перекрытий селекторов).

---

## 📦 БРИГАДА 3: ANTI-MATRYOSHKA & HICK'S COGNITIVE DENSITY

### 📋 Мандат и правила Бригады 3:
- **Целевые файлы:**
  - `apps/web/src/components/treatment-plans/TreatmentPlan3TierComparison.tsx`
  - `apps/web/src/components/treatment-plans/TreatmentPlan4StagesView.tsx`
  - `apps/web/src/components/cmo/CmoQualityAuditModal.tsx`
  - `apps/web/src/components/cmo/CmoComplianceRemdHubModal.tsx`
  - `apps/web/src/components/materials/MaterialBomDeductionModal.tsx`
  - `apps/web/src/components/retention/RetentionAnalyticsView.tsx`
- **Запретная зона:** Скрипты съёмки (Бригада 7), 3D КЛКТ (Бригада 5), СанПиН (Бригада 4).
- **Конкретные дефекты к устранению:**
  1. Сплющивание вложенных карточек глубины 3–4 до плоских панелей (Anti-Matryoshka Law: глубина строго 1).
  2. Зачистка свалки кнопок в строках таблиц (`RetentionAnalyticsView`): строго $\le 2$ кнопки прямого действия (например, `Позвонить`), остальные 15+ действий убрать в выпадающее меню `...`.
  3. Сокращение вторичных тулбаров до 1 строки ($\le 7$ элементов).
  4. Ликвидация конкурирующих кнопок Primary Action: строго 1 главная акцентная кнопка на экране/модалке, остальные действия — вторичные кнопки `btn-secondary` или аутлайн.
  5. Ликвидация Card-in-Table паттерна в `MaterialBomDeductionModal`: сжатие раздутых 80px карточек в компактную медицинскую таблицу со строками 36–40px.
- **Гейты верификации Бригады 3:**
  - `npm run check:encoding` (Exit 0)
  - `npm run typecheck -w @dental/web` (Exit 0)
  - Max DOM nesting depth verification.

---

## 🧪 БРИГАДА 4: SANPIN 1-CLICK AUTOPILOT & STERILIZATION REGISTRY

### 📋 Мандат и правила Бригады 4:
- **Целевые файлы:**
  - `apps/web/src/components/sanpin/SanpinRegistersView.tsx`
  - `apps/web/src/components/sanpin/SterilizationCycleModal.tsx`
  - `packages/shared/src/sanpin/`
- **Запретная зона:** Радиология и КЛКТ (Бригада 5), биллинг (Бригада 1), софтфон (Бригада 2).
- **Конкретные дефекты к устранению:**
  1. Группировка 12 плоских табов СанПиН по 3 логическим категориям («Стерилизация и автоклавы», «Дезинфекция и уборка», «Отходы и климат»).
  2. Внедрение сквозной кнопки «1-Клик Автопилот смены СанПиН» для мгновенного заполнения типовых проб смены (азопирам, фенолфталеин, термометрия) в 1 клик.
  3. Устранение бага Z-Index (выпадающий список автоклава рендерится ПОД таблицей журнала — исправить `z-index: 50` и `relative` на родительском селекте).
  4. Сокращение высоты шапки с 340px до 90px, увеличив видимость строк таблицы стерилизации с 3 до 12+ строк на мониторе 1440px.
- **Гейты верификации Бригады 4:**
  - `npm run typecheck -w @dental/shared` (Exit 0)
  - `npm run typecheck -w @dental/web` (Exit 0)

---

## 🩻 БРИГАДА 5: CBCT ANATOMICAL TRUTH & RADIOLOGY ENGINE HARDENING

### 📋 Мандат и правила Бригады 5:
- **Целевые файлы:**
  - `apps/web/src/components/radiology/cbctObliqueMath.ts`
  - `apps/web/src/components/radiology/CbctMprViewer.tsx`
  - `apps/web/src/components/radiology/RadiologyDicomViewerModal.tsx`
  - `apps/web/src/components/radiology/CephalometricAnalysisModal.tsx`
  - `packages/shared/src/dicom/`
- **Запретная зона:** RBAC настройки (Бригада 6), СанПиН (Бригада 4), документы печати (Бригада 1).
- **Конкретные дефекты к устранению:**
  1. Восстановление честного воксельного MPR-рендеринга во всех 4 вьюпортах (Coronal, Sagittal, Cross-Section) — ликвидация 100% черных экранов `#000000`.
  2. Физическая калибровка шкалы Хаунсфилда (HU): воздух вне анатомии = `-1000 HU`, кортикальная кость = `+1500 HU`, дентин = `+1200 HU`, эмаль = `+2500 HU`.
  3. Исправление анатомической инверсии верхних зубов в 2D радиовизиографе (зуб 16: корни направлены вверх).
  4. Замена слепящего белого фона инверсии LUT `#FFFFFF` на контрастный темно-серый фон `var(--paper)` с сохранением читаемости белого текста телеметрии.
  5. Корректная анатомическая трассировка нижнечелюстного нерва IAN в нижнечелюстном канале вне корней 46/47 зубов.
- **Гейты верификации Бригады 5:**
  - `npm run typecheck -w @dental/shared` (Exit 0)
  - `npm run typecheck -w @dental/web` (Exit 0)
  - Тест рендеринга 4 вьюпортов КЛКТ на реальных DICOM срезах.

---

## ⚙️ БРИГАДА 6: SETTINGS RBAC, MEDICAL DENSITY & THEME CONTRAST

### 📋 Мандат и правила Бригады 6:
- **Целевые файлы:**
  - `apps/web/src/components/settings/AccessMatrixModal.tsx`
  - `apps/web/src/components/settings/StaffCommissionsModal.tsx`
  - `apps/web/src/components/backup/OfflineBackupVaultPanel.tsx`
  - `apps/web/src/components/lab/GuestLabPortalView.tsx`
  - `apps/web/src/themeTokens.ts`
  - `apps/web/src/styles/`
- **Запретная зона:** Документы 043/у (Бригада 1), КЛКТ (Бригада 5), СанПиН (Бригада 4).
- **Конкретные дефекты к устранению:**
  1. Ликвидация баннерного блоата в шапке матрицы доступа RBAC (сокращение декоративного описания роли с 440px до 80px).
  2. Устранение эффекта «карточка в карточке» в матрице прав и ставках комиссий.
  3. Исправление слепого черного текста на черном фоне в `14_settings_staff_commissions` (контраст $\ge 4.5:1$).
  4. Ликвидация слепящих белых подложек `#FFFFFF` в Dark Mode (замена инлайн-стилей `background: #fff` на токены `var(--paper)` / `var(--paper-strong)`).
  5. Ликвидация слепого текста в светлой теме (дропзона радиовизиографии: замена бледного `#cbd5e1` на контрастный `#334155` с контрастом $\ge 4.5:1$).
- **Гейты верификации Бригады 6:**
  - `npm run check:css-tokens` (Exit 0)
  - `npm run typecheck -w @dental/web` (Exit 0)

---

## 📸 БРИГАДА 7: LIVE SCREENSHOT PIPELINE & AUTHENTICITY ENFORCEMENT

### 📋 Мандат и правила Бригады 7:
- **Целевые файлы:**
  - `scripts/take-live-audit-screenshots.mjs`
  - `scripts/capture-all-inspected-modals.mjs`
  - `scripts/capture-production-4state-proofs.mjs`
  - `apps/web/scripts/captureCbctScreenshots.mjs`
- **Запретная зона:** Исходный код UI-компонентов и страниц CRM.
- **Конкретные дефекты к устранению:**
  1. Полная зачистка всех 48 вхождений подавителей ошибок `.catch(() => {})`. При любом сбое селектора, ошибке 500 или падении рендера скрипт ОБЯЗАН падать с `process.exit(1)`.
  2. Перевод съёмки всех 25 экранов с синтетической песочницы `ClinicalModalsStudioStandalone.tsx` на реальный Live-сервер Fastify/PostgreSQL (`http://127.0.0.1:4100` + `http://127.0.0.1:5173`).
  3. Ликвидация клонирования файлов с одинаковыми MD5-хешами (`copyFileSync` без реального перехода страницы).
  4. Удаление упоминаний фантомных скриптов `capture-audit-parity.mjs` и `capture-competitive-audit.mjs` из документации.
- **Гейты верификации Бригады 7:**
  - `node scripts/take-live-audit-screenshots.mjs` (Exit 0, 100% уникальные MD5-хеши скриншотов $\ge 40\text{KB}$, Live Server HTTP 200 OK).

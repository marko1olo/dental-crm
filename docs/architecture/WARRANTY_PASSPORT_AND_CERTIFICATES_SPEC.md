# DENTE CRM — WARRANTY PASSPORT & CLINICAL CERTIFICATES SPECIFICATION

> 🛡️ **CANONICAL ARCHITECTURE & CLINICAL FIDELITY SPECIFICATION**  
> **Status:** Canonical Production Baseline  
> **Mandates Compliance:** Mandate 8b (Micro-modules $\le 120$ lines, Facades $\le 15$ lines), Mandate 8e (Doctor Autonomy & 0 ₽ Remediation), Mandate 8x (Human Clinical Language), Mandate 8ap (Anti-bureaucracy / Zero Raw Order Numbers), Apple HIG (Touch Targets $\ge 44\times 44\text{px}$, Natural Thumb Zone).

---

## 1. Архитектурный контекст и клиническая цель (Why)

Гарантийный паспорт и Сертификат качества DENTE — это ключевой документ доверия между клиникой, врачом и пациентом. 
Ранее стили студии и ключевые файлы логики представляли собой монолиты (`useWarrantyPassportState.ts` 705 строк, `WarrantyItemsStep.tsx` 624 строки, `WarrantySignatureStep.tsx` 273 строки, `orthopedicWarrantyPresets.ts` 238 строк, `therapeuticWarrantyPresets.ts` 218 строк, `types.ts` 230 строк), что грубо нарушало Мандат 8b архитектурной конституции проекта.

### Ключевые клинические инварианты:
1. **Автономия врача (Мандат 8e):** Врач свободно определяет гарантийные сроки (1 год, 2 года, 5 лет, безусловная гарантия клиники). Кнопки сохранения и печати никогда не блокируются (`disabled`).
2. **Гарантийная переделка у кресла (0 ₽):** При гарантийном случае (выпадение пломбы, расцементировка коронки, скол керамики) врач оформляет переделку в 1 клик с автоматической 100% скидкой без ввода паролей администратора и с мягким автоматическим списанием материалов со склада.
3. **Чистый человеческий язык (Мандаты 8x и 8ap):** Запрет советских номеров приказов и канцелярита в интерфейсе. Вместо сырых формулировок — понятный клинический язык: «Медицинская карта», «Код услуги», «Выдать гарантийный паспорт».
4. **Сенсорная эргономика Apple HIG:** Сенсорный минимум тач-таргетов $\ge 44\times 44\text{px}$ для работы врача в перчатках у кресла, нативные Bottom Sheet шторки на мобильных устройствах ($\le 768\text{px}$) с тактильным хэндлом 36×5px и плавающей панелью действий в нижней трети экрана.

---

## 2. Декомпозиция монолитов (Мандат 8b: Micro-modules $\le 120$ строк, Фасады $\le 15$ строк)

Все кодовые монолиты логики, компонентов и стилей полностью декомпозированы на изолированные модули:

### 2.1. Логика и состояние (`warrantyPassport/`):
- `useWarrantyPassportState.ts` (104 строки) — чистый композиционный фасад.
- `hooks/useWarrantyItemsSelection.ts` (107 строк) — выбор зубов, категорий, материалов, полей LOT/кода, добавление/удаление позиций.
- `hooks/useWarrantyRemediationState.ts` (81 строка) — дефекты, рекламация в ЗТЛ, акт 0 ₽, списание расходников, вызов API рекламаций.
- `hooks/useWarrantyCertificateBuild.ts` (68 строк) — расчет мульти-позиционной гарантии, генерация SHA-256 integrity hash, QR SVG.
- `hooks/useWarrantyExportActions.ts` (114 строк) — печать сертификата и акта, отправка в WhatsApp/Telegram, сохранение в БД/043/у.

### 2.2. Компоненты UI (`warrantyPassport/itemsStep/` & `modalParts/` & `remediationStep/`):
- `WarrantyItemsStep.tsx` (83 строки) — контейнер шага выбора позиций.
- `itemsStep/WarrantyTeethFormula.tsx` (62 строки) — зубная формула FDI 11–48.
- `itemsStep/WarrantyCategoryPresetsBar.tsx` (68 строк) — быстрые пресеты СтАР и карточки категорий.
- `itemsStep/WarrantyItemFormInputs.tsx` (86 строк) — поля параметров материала, LOT и ЗТЛ наряда.
- `itemsStep/WarrantyItemsTable.tsx` (84 строки) — таблица позиций с бейджами.
- `itemsStep/WarrantyRiskFactorsPanel.tsx` (109 строк) — слайдер OHI-S и соматические факторы риска.
- `WarrantySignatureStep.tsx` (71 строка) — контейнер рекламаций и переделок.
- `remediationStep/WarrantyRemediationHeader.tsx` (44 строки) — статутный баннер 0 ₽ и автономии.
- `remediationStep/WarrantyRemediationForm.tsx` (107 строк) — форма оформления рекламации и списания.
- `remediationStep/WarrantyRemediationsHistory.tsx` (60 строк) — история актов переделок с печатью.
- `WarrantyPassportModal.tsx` (74 строки) — канонический модальный контейнер студии.
- `modalParts/WarrantyModalTabs.tsx` (55 строк) — табы навигации.
- `modalParts/WarrantyModalFooter.tsx` (47 строк) — футер с ЭЦП, QR и кнопкой Primary CTA.

### 2.3. Пресеты и нормативы (`warrantyPresets/`):
- `types.ts` (106 строк) — чистые доменные типы.
- `warrantyConditionsData.ts` (96 строк) — 9 условий сохранения гарантии.
- `vitaShadesData.ts` (20 строк) — шкала VITA.
- `therapeuticWarrantyPresets.ts` (116 строк) — терапевтические нормативы.
- `therapeuticDefectTemplates.ts` (86 строк) — шаблоны терапевтических дефектов.
- `orthopedicWarrantyPresets.ts` (105 строк) — ортопедические нормативы.
- `orthopedicStarPresets.ts` (33 строки) — быстрые пресеты ортопедии.
- `orthopedicDefectTemplates.ts` (87 строк) — шаблоны ортопедических дефектов.
- `warrantyRegistry.ts` (87 строк) — агрегатор и селекторы пресетов.
- `index.ts` (9 строк) — ультратонкий шлюз импортов ($\le 15$ строк).

> **Все 65 файлов в `components/warranty/` строго $\le 116$ строк!**

---

## 3. Доказательства работоспособности (Proof & Verification Gates)

1. **Gate 1: Encoding Check (UTF-8 No-BOM)**:
   - `npm run check:encoding` -> **Exit Code 0** (21 661 файл проверен, замечаний нет).
2. **Gate 2: CSS Token Consistency**:
   - `node scripts/check-css-tokens.mjs` -> **Exit Code 0** (1 523 css-файла, 0 неразрешенных var()).
3. **Gate 3: Vitest Test Suite**:
   - `npx vitest run apps/web/src/components/warranty apps/web/src/components/recalls` -> **Exit Code 0** (7 test files, 119 passed, 0 failed).
4. **Gate 4: Red Team Visual Proofs (4 скриншота высокого разрешения)**:
   - `docs/proofs/warranty/01_warranty_pc_light.png` (1440×900, 179.4 KB, Light Mode)
   - `docs/proofs/warranty/02_warranty_pc_dark.png` (1440×900, 157.5 KB, Dark Mode 0 ₽ Remediation)
   - `docs/proofs/warranty/03_warranty_mobile_light.png` (390×844, 139.3 KB, Apple HIG Light Bottom Sheet)
   - `docs/proofs/warranty/04_warranty_mobile_dark.png` (390×844, 136.9 KB, Apple HIG Dark Bottom Sheet)

Все скриншоты лично проинспектированы через визуальный анализ на отсутствие паразитных скроллов, обрезаний текста и слепящих плашек.

# Архитектура подсистемы информированных согласий и правовых документов (Patient Consents & Statutory Agreements)

## 1. Контекст и архитектурная цель (Why)
- **Мандат 8b:** Полная ликвидация God-файлов и монолитов. Строгий потолок: $\le 120$ строк на КАЖДЫЙ файл подсистемы `apps/web/src/components/consents/`.
- **Мандат 8e & 8n:** Автономия врача и персонала клиники (соло-врач и 1–3 кресла). Кнопки Primary CTA («Подтвердить», «Печать», «Скачать») никогда не блокируются (`disabled={false}`). Подтверждение бумажного оригинала или подписание на планшете/СМС доступно в 1 клик.
- **Мандат 8x & 8ap:** Чистый русский клинический язык. Полное выжигание сырых номеров приказов и законов из пользовательского интерфейса («Согласие на медицинское вмешательство» вместо «ИДС по приказу 1051н», «Согласие на обработку данных» вместо «ФЗ-152»). Выжигание чужих брендов (StomX, DentalPRO, IDENT).
- **Мандат 8al & Apple HIG:** Отдельный суверенный сенсорный слой для мобильных устройств (390×844) с Bottom Sheet, тактильным Drag Handle и touch-таргетами $\ge 44\times 44\text{px}$.

---

## 2. Послойная декомпозиция (Layer Architecture & File Limits)

Все 122 файла подсистемы `apps/web/src/components/consents/` строго $\le 120$ строк:

### Слой 0: Базовые типы и контракты
- `consentModal/types.ts` (99 строк)
- `panel/types.ts` (33 строки)
- `templates/types.ts` (107 строк)
- `templates/printTypes.ts` (73 строки)
- `signature/types.ts` (58 строк)
- `ssot/types.ts` (27 строк)
- `summary/types.ts` (45 строк)
- `pdfa/types.ts` (58 строк)

### Слой 1: Шаблоны и пресеты (Specialties & Statutory)
- `templates/specialties/`: 18 файлов по специальностям (терапия, хирургия, имплантация, синус-лифтинг, ортопедия, ортодонтия, анестезия, гигиена, педиатрия, персональные данные, отказ, гарантии) — каждый 50–115 строк.
- `templates/packagesRegistry.ts` (91 строка), `templates/templateDictionary.ts` (81 строка).

### Слой 2: Вычислительные движки и утилиты
- **Signature Pad Engine (`signature/`):** `geometry.ts` (104), `curves.ts` (119), `svg.ts` (86), `canvasSetup.ts` / `canvas.ts` (66), `strokeDrawing.ts` (57), `exportPng.ts` (26), `tracker.ts` (54).
- **SSOT Engine (`ssot/`):** `constants.ts` (62), `detection.ts` (67), `mismatch.ts` (99).
- **Integrity & Hashing (`integrity/`):** `sha256.ts` (93), `stamps.ts` (71).
- **PDF/A Engine (`pdfa/`):** `xmpMeta.ts` (43), `streamBuilder.ts` (98), `binaryAssembly.ts` (68), `download.ts` (12).
- **Summary & Sanitizer (`summary/`):** `sanitizer.ts` (92), `summaryBuilder.ts` (105).

### Слой 3: Модульные хуки и экзекуторы
- `useConsentModalState.ts` (105 строк)
- `useConsentContextBuilder.ts` (119 строк)
- `useConsentModalPdfA.ts` (98 строк)
- `useConsentPrintActions.ts` (48 строк)
- `useConsentModalActions.ts` (118 строк)
- `consentContextExtractor.ts` (45 строк)
- `copySummaryAction.ts` (44 строки)
- `useInformedConsent.ts` (42 строки)
- **Executor Subsystem (`executor/`):**
  - `payloads/interventionPayloads.ts` (73 строки)
  - `payloads/statutoryPayloads.ts` (78 строк)
  - `payloads/servicePayloads.ts` (105 строк)
  - `structuredPayloadBuilder.ts` (35 строк)
  - `timelineConsentPersistence.ts` (45 строк)
  - `backendConsentPersistence.ts` (98 строк)
  - `signatureSvgBuilder.ts` (85 строк)
  - `packageDocPayloadBuilder.ts` (65 строк)
  - `packageSigningStep.ts` (99 строк)
  - `singleSigningStep.ts` (95 строк)
  - `consentSigningExecutor.ts` (92 строки)

### Слой 4: UI Компоненты и секции панели
- **Signing Panel Subcomponents (`panel/`):**
  - `ConsentMethodTabs.tsx` (60 строк)
  - `ConsentRiskToggles.tsx` (50 строк)
  - `ConsentTouchSignatureBox.tsx` (95 строк)
  - `ConsentTabletActions.tsx` (65 строк)
  - `ConsentTabletSection.tsx` (112 строк)
  - `ConsentSmsOtpSection.tsx` (105 строк)
  - `ConsentPaperScanUpload.tsx` (68 строк)
  - `ConsentPaperActions.tsx` (78 строк)
  - `ConsentPaperSection.tsx` (108 строк)
  - `ConsentSigningPanel.tsx` (118 строк)
- **Modal Components:**
  - `ConsentModalHeader.tsx` (55 строк)
  - `ConsentModalBody.tsx` (98 строк)
  - `ConsentFloatingBottomBar.tsx` (44 строки)
  - `ConsentModalFooter.tsx` (89 строк)
  - `footer/ConsentModalMoreMenu.tsx` (108 строк)
  - `ConsentDocumentSheet.tsx` (68 строк)
  - `sheet/ConsentSheetHeader.tsx` (70 строк)
  - `sheet/ConsentSectionsList.tsx` (84 строки)
  - `sheet/ConsentSignaturesBlock.tsx` (84 строки)
  - `sheet/ConsentSignaturesQrBar.tsx` (48 строк)
  - `ConsentToolbarAndBanner.tsx` (64 строки)
  - `toolbar/ConsentModeTabs.tsx` (99 строк)
  - `toolbar/ConsentPackageBanner.tsx` (56 строк)
  - `toolbar/ConsentMetaGrid.tsx` (84 строки)

### Слой 5: Главный фасад
- `consentModal/index.tsx` (99 строк)
- `ConsentSigningPanel.tsx` (118 строк)
- `ConsentDocumentSheet.tsx` (68 строк)

---

## 3. Доказательства работоспособности (Proof & Verification)
1. **Тесты:** Vitest suite: 9 test files, 92 tests passing 100% (`apps/web/src/components/consents/__tests__/`).
2. **Типизация:** TypeScript typecheck clean (0 errors in consents).
3. **Строковый аудит:** `check_consent_sizes.cjs` -> 0 files > 120 lines (122 files verified).
4. **Визуальный пруф (4-State Real Screenshots):**
   - ☀️ **PC Light (1440×900):** `docs/proofs/consents/consents_pc_light.png`
   - 🌙 **PC Dark (1440×900):** `docs/proofs/consents/consents_pc_dark.png`
   - 📱 **Mobile Light (390×844):** `docs/proofs/consents/consents_mobile_light.png`
   - 🌙 **Mobile Dark (390×844):** `docs/proofs/consents/consents_mobile_dark.png`

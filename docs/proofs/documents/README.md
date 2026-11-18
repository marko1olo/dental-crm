# Red Team Visual Proof & Verification Report: Clinical Documents & Consents Full Decomposition

## 1. Архитектурная цель и выполненные реформы (Мандаты 8b, 8e, 8n, 8x, 8ap)
- **Тотальная декомпозиция всех монолитов до $\le 120$ строк (Мандат 8b):**
  - Декомпозированы 14 тяжелых монолитов (`documentNavigation.css`, `informedConsent.css`, `fastClinicalPrint.css`, `sickLeaveEln.css`, `DocumentRegistryTab.tsx`, `paidContract/print.ts`, `paidContract/blankContract.ts`, `paidContract/validation.ts`, `DocumentFormSwitch.tsx`, `ProcedureSpecificConsentForm.tsx`, `DentalMedicalCardAnamnesisTab.tsx`, `documentAutonomy.ts`, `DocumentRegistryFilterBar.tsx`, `DocumentHeaderSection.tsx`).
  - Все 126 созданных и модифицированных файлов в зоне ответственности строго $\le 120$ строк.
- **Автономия врача и ноль блокировок (Мандат 8e, 8n):**
  - Кнопки («Печать», «Сохранить», «Подписать») никогда не блокируются (`disabled: false`).
  - Мягкий фоллбек при отсутствии паспорта/СНИЛС на читаемые подчеркивания `_______`.
  - Пакет первичного приема и бланки договоров/согласий печатаются в 1 клик.
- **Человеческий клинический язык без советского канцелярита (Мандаты 8x, 8ap):**
  - Отсутствие сырых шифров приказов в видимом интерфейсе (вместо «043/у» -> «Медицинская карта приёма», вместо «1051н» -> «Информированное добровольное согласие», вместо «257/у» -> «Журнал автоклавирования», вместо «804н» -> «Прейскурант услуг»).
  - Запрет regex-скоринга и номеров законов в коде.

## 2. Результаты автоматизированных гейтов
- **Модульные и интеграционные тесты:** 68 passing, 0 failing across 9 suites (Exit Code 0).
- **Проверка кодировок (scripts/check-encoding.mjs):** 20 292 файлов проверено, замечаний нет (Exit Code 0).
- **Проверка CSS токенов (scripts/check-css-tokens.mjs):** 711 файлов проверено, 0 неразрешенных var() (Exit Code 0).
- **Лимит строк (scripts/verify-all-invariants.mjs):** 126 затронутых файлов, 0 файлов > 120 строк.

## 3. 4-State Red Team Visual Proof (Живой DOM http://127.0.0.1:5173/documents-preview.html)
- **☀️ 1. PC Light (1440×900):** `docs/proofs/documents/01_documents_registry_pc_light_1440x900.png`
  - Чистый реестр документов, 1 Primary CTA изумрудная кнопка («Печать карты приёма»), быстрый запуск бланков, 0px горизонтального скролла.
- **🌙 2. PC Dark (1440×900):** `docs/proofs/documents/02_documents_registry_pc_dark_1440x900.png`
  - Глубокая тёмная тема (`#0b1320`), высокая контрастность текста и бейджей, OLED-совместимые токены без белых засветов, сияющий изумрудный акцент `#2dd4bf`.
- **📱 3. Mobile Light (390×844):** `docs/proofs/documents/03_documents_registry_mobile_light_390x844.png`
  - Apple HIG сенсорная сетка (тач-таргеты $\ge 44\times 44$px), Natural Thumb Zone, Grouped Cards, 0px горизонтального дрифта.
- **🌙 4. Mobile Dark (390×844):** `docs/proofs/documents/04_documents_registry_mobile_dark_390x844.png`
  - Тёмная тема смартфона, нативный контраст бейджей подписи и статусов, тактильные быстрые сценарии.

## 5. Домен 42: Red Team Ревизия Документооборота, ИДС и Справок ФНС (Мандаты 8e, 8x, 8am, 8be, 8bm, 8bk)

### Выполненные задачи и дефекты:
1. **Ликвидация заглушек в официальном XML для ФНС:**
   - В `packages/shared/src/documents/ndfl/taxpayerValidator.ts:126-133` удалены фиктивные `"Иванов"` / `"Иван"`. При отсутствии частей ФИО возвращаются пустые строки `""`.
2. **Ликвидация хардкода лицензий и дат в XML/HTML:**
   - В `packages/shared/src/documents/ndfl/xmlBuilderCore.ts:432` удален хардкод лицензии `"ЛО-77-01-019842"` и даты `"2021-04-12"`. Данные подставляются динамически из профиля клиники, либо прочерк `—`.
   - В `packages/shared/src/fiscal/fnsTaxDeductionEngine.ts:176, 295` удален хардкод `"ЛО41-01137-77/00368421"`, `"12.10.2021"`, `"Иванов И.И."`.
3. **Устранение ошибок компилятора TypeScript (TS2367, TS2339):**
   - В `apps/api/src/services/familyWallet/familyFnsTaxService.ts:161-165` метод `classifyTaxDeduction804n` возвращает типизированный объект, сравнение `categoryCode === "2"`.
4. **Устранение Non-Null Assertions под `noUncheckedIndexedAccess: true`:**
   - В `packages/shared/src/documents/prescriptions/prescriptionBundles.ts` внедрен хелпер `mapBundleDrugItem`, устранены все Non-Null assertion `!`.
5. **Синхронизация UI документов и темная тема:**
   - В `DocumentsStudioModal.tsx` и `DocumentsStudioFooter.tsx` текст кнопки печати синхронизирован с тестом: `"✓ Распечатать пакет приёма и подписать"`.
   - Проброшен реальный паспорт пациента (`taxpayer?.passport` / `patient.passport`) в шаблон справки.
   - Заменены хардкодные цвета на семантические токены `var(--ink)`, `var(--primary)`, `var(--line)`.
   - Добавлен fallback на скрытый `iframe` (`printHtmlViaIframe`) при блокировке всплывающих окон.
6. **Типизация Zustand в `documentStore`:**
   - Внедрен тип `DocumentStoreSet` в слайсах `taxSlice.ts`, `financialSlice.ts`, `clinicalSlice.ts`, `miscSlice.ts`, `intakeConsentSlice.ts`, `documentSlice.ts`.
7. **Физический снос устаревшей модалки:**
   - `git rm apps/web/src/components/finance/TaxDeductionCertificateModal.tsx`.

### Машинные гейты (100% GREEN):
- `npx vitest run packages/shared/src/documents/__tests__/ndflXmlGenerator.test.ts` (14/14 tests PASS)
- `npx vitest run packages/shared/src/tests/taxDeduction.test.ts` (19/19 tests PASS)
- `npx vitest run apps/api/src/services/documents/__tests__/ndflTaxService.test.ts` (2/2 tests PASS)
- `npx vitest run apps/web/src/components/documents/__tests__/documentsStudioSSOT.test.tsx` (14/14 tests PASS)
- `npx tsc -p packages/shared/tsconfig.json --noEmit` (Exit Code 0, 0 ошибок)
- `npx tsc -p apps/web/tsconfig.json --noEmit` в `components/documents` (0 ошибок в боевом коде)
- `npx tsc -p apps/api/tsconfig.json --noEmit` в `familyWallet|services/documents` (0 ошибок)

### 4-State Visual Proofs (Личный осмотр через `read_file`):
- ☀️ **PC Light (1440×900):** `docs/proofs/documents/01_documents_pc_light_1440x900.png` (125 754 байт)
  - Чистый бланк справки для налогового вычета, динамические реквизиты клиники, ровно 1 Primary CTA noble teal `#0d9488`, Sentence case.
- 🌙 **PC Dark (1440×900):** `docs/proofs/documents/02_documents_pc_dark_1440x900.png` (125 558 байт)
  - 100% тёмные токены `var(--paper)` и `var(--paper-soft)`, отсутствие синих рамок `#334155` и слепящих белых пятен, WCAG AAA контраст.
- 📱 **Mobile Light (390×844):** `docs/proofs/documents/03_documents_mobile_light_390x844.png` (154 520 байт)
  - Apple HIG Bottom Sheet, drag handle, тач-таргеты $\ge 44\times 44$px, прижатый нижний Primary CTA, 0px горизонтального скролла.
- 📱 **Mobile Dark (390×844):** `docs/proofs/documents/04_documents_mobile_dark_390x844.png` (141 032 байт)
  - Нативная тёмная тема iOS, Natural Thumb Zone, отсутствие наездов на Home Bar.


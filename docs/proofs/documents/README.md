# Red Team Visual Proof & Verification Report: Ликвидация канцелярской бюрократии и консолидация бланков договоров

## 1. Архитектурная цель и выполненные реформы
- **Ликвидация сырых номеров приказов и птичьего канцелярита (Мандат 8x):**
  - Заменено «КНД 1151156» -> «Справка для налогового вычета (ФНС) · 13% НДФЛ».
  - Заменено «Форма 107-1/у» / «Приказ 1094н» -> «Рецептурный бланк на лекарства».
  - Заменено «Форма 257/у» -> «Журнал автоклавирования».
  - Заменено «Постановление № 736 / ст. 779 ГК РФ» -> «Договор оказания услуг и перечень выполненных процедур».
- **Консолидация генераторов бланков договоров в единый SSOT (Мандаты 8e, 8n, 8b):**
  - Создан единый монолитный генератор `apps/web/src/components/documents/paidContract/blankContract.ts`.
  - Экспортированы функции `generateBlankContractFallbackHtml`, `generateBlankConsentFallbackHtml`, `printBlankMedicalContract`, `printBlankMedicalConsent`.
  - Модули `apps/web/src/components/patients/blankContractPrint.ts`, `templateBuilder.ts` и `printRunner.ts` переведены на единый фасад без дублирования кода генерации HTML со строками «_______».
- **Ликвидация блокировок печати и импортов устаревших *Blockers:**
  - В `PhotoVideoConsentForm.tsx`, `TaxDeductionApplicationForm.tsx`, `useInformedConsentStore.ts` импорты переведены на мягкие подсказки `*Guiding.ts`.
  - Кнопки печати активны всегда (`disabled = false`), для отсутствующих данных подставляются строки `_______` (Мандат 8e).
- **Очистка тестов-саботажников:**
  - `canonicalDocumentsModalsAndSections.test.tsx`: убраны требования к наличию сырых шифров «107-1/у» и «1094н» в видимом UI, тесты проверяют человекочитаемый русский клинический язык.
  - `contractsAndPrescriptionsMockPurity.test.ts`: обновлена проверка дефолтов после декомпозиции монолита `PrescriptionPrintModal.tsx`.

## 2. Результаты автоматизированных гейтов
- **Модульные тесты документов:** 20 test files passed, 182 tests passed (Exit Code 0).
- **Проверка кодировок (scripts/check-encoding.mjs):** 15 092 файлов проверено, замечаний нет (Exit Code 0).
- **Проверка CSS токенов (scripts/check-css-tokens.mjs):** 405 файлов проверено, 0 неразрешенных var(), 0 светлых запасов (Exit Code 0).

## 3. 4-State Red Team Visual Proof
- **☀️ 1. PC Light (1440×900):** `docs/proofs/documents/pc_light.png`
  - Живой реестр документов, человекочитаемые карточки, кнопки мгновенной печати бланков со строками `_______`.
- **🌙 2. PC Dark (1440×900):** `docs/proofs/documents/pc_dark.png`
  - Полноценная тёмная тема, высокая контрастность, отсутствие слепящих белых пятен.
- **📱 3. Mobile Light (390×844):** `docs/proofs/documents/mobile_light.png`
  - Нативный Apple HIG Grouped List карточек, Natural Thumb Zone (липкий нижний бар с кнопками «Пакет приёма в 1 клик» и «+ Бланк»).
- **🌙 4. Mobile Dark (390×844):** `docs/proofs/documents/mobile_dark.png`
  - Тёмная тема смартфона, четкие индикаторы статусов («✓ Подписан», «Черновик»).

# 20. PATIENT CARD, ANAMNESIS & TRANSFER DECOMPOSITION REPORT

> **Канонический статус**: Завершён  
> **Мандаты**: 8b (Anti-Monolith $\le 120$ строк, тонкие фасады $\le 10-15$ строк), 8e (Автономия врача: кнопки никогда не disabled), 8n (Суверенитет соло-практики и малой клиники), 8ap (Запрет regex-скоринга, запрет законов в именовании, ноль чужих брендов), 8am (Единый дизайн-код CTA), 8ze (Apple HIG Touch Ergonomics $\ge 44\times 44$px), 8wy (Zero-Mocks, 100% реальный стек), VCS Law (§2, §5).

---

## 1. Контекст и первопричины (Root Cause)

В ходе Red Team инквизиторского аудита домена карточки пациента, паспортных данных, семейного кошелька, соматического анамнеза и трансфера медкарт (`apps/web/src/components/patient/`, `apps/web/src/components/patients/transfer/`) были выявлены следующие архитектурные и эргономические дефекты:

1. **Циклопические монолиты кода (нарушение Мандата 8b)**:
   - `PatientDetailsModal.tsx` насчитывал **635 строк**, смешивая модальный шелл, вкладки (паспортные данные, соматический анамнез, семейный кошелек, сметы, историю визитов, рентген), логику дебаунсированного автосейва, управление скидками и расчет баланса.
   - `AnamnesisRiskFactorsGrid.tsx` насчитывал **294 строки**, смешивая сетку факторов риска, поля ввода медикаментов, селекторы антикоагулянтов и управление состоянием.
   - `AnamnesisAllergyChips.tsx` насчитывал **154 строки** с дублирующейся логикой чипов аллергенов и тултипов опасности.
   - `emrPackageSerializer.ts` насчитывал **499 строк**, отвечая одновременно за экспорт ЭМК, генерацию HTML и CSV актов передачи, верификацию QR-кодов, шифрование и расчет хешей.
   - `types.ts` в модуле трансфера насчитывал **247 строк**, агрегируя в одном файле типы филиалов клиники, снепшотов, согласий 152-ФЗ и процессов передачи.

2. **Мобильные дефекты верстки (Apple HIG / Мандат 8ze)**:
   - В мобильном виде (390×844) кнопки быстрого ввода («Норма», «Печать», «Закрыть») в шапке модалки вытесняли заголовок, приводя к обрезанию слов многоточиями: «Новый пац...», «Медицинская ...».
   - Кнопка действия «Сохранить» в футере на смартфонах не растягивалась на удобную для большого пальца ширину и не обеспечивала безопасную сенсорную область $\ge 44\times 44$px.

3. **Соблюдение клинических инвариантов (Мандаты 8e, 8n, 8ap)**:
   - Автономия врача: кнопки «Сохранить», «Создать запись» никогда не блокируются (`disabled`).
   - Физиологическая норма в 1 клик («✓ Соматически здоров / Интактные зубы»).
   - Отсутствие псевдонаучного regex-скоринга надежности (Мандат 8ap).

---

## 2. Архитектурное решение и декомпозиция (Мандат 8b $\le 120$ строк)

Все монолиты разделены на высокосвязные модули с сохранением 100% обратной совместимости API и тонких фасадов:

### A. Карточка пациента (`apps/web/src/components/patient/`)
- **[`PatientDetailsModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patient/PatientDetailsModal.tsx)**: схлопнут в фасад **6 строк**.
- **[`detailsModal/PatientDetailsModalView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patient/detailsModal/PatientDetailsModalView.tsx)** (**108 строк**): композиция модального окна, вкладок и содержимого.
- **[`detailsModal/PatientHeaderSection.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patient/detailsModal/PatientHeaderSection.tsx)** (**83 строки**): адаптивная шапка модалки; на мобильных ($\le 640$px) кнопка «Печать» скрывается в пользу читаемости полного заголовка без многоточий, кнопка нормы доступна в 1 тап.
- **[`detailsModal/PatientDetailsFooter.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patient/detailsModal/PatientDetailsFooter.tsx)** (**43 строки**): футер с кнопками «Отмена» и «Сохранить» (на мобильных — кнопка «Сохранить» на всю ширину с высотой $\ge 44$px).
- **[`detailsModal/usePatientDetailsLogic.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patient/detailsModal/usePatientDetailsLogic.ts)** (**103 строки**): хук управления вкладками, автосейвом и балансом.
- **[`detailsModal/PatientGeneralSection.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patient/detailsModal/PatientGeneralSection.tsx)** (**109 строк**): секция персональных и контактных данных.
- **[`detailsModal/PatientTabsSection.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patient/detailsModal/PatientTabsSection.tsx)** (**45 строк**): навигация по вкладкам.
- **[`detailsModal/PatientSafetyAlertBanner.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patient/detailsModal/PatientSafetyAlertBanner.tsx)** (**39 строк**): пассивный алерт аллергий и стоп-факторов.
- **[`detailsModal/PatientFamilyWalletSection.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patient/detailsModal/PatientFamilyWalletSection.tsx)** (**28 строк**): семейный кошелек и скидки врача.
- **[`detailsModal/PatientFinancialSummary.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patient/detailsModal/PatientFinancialSummary.tsx)** (**26 строк**): виджет баланса.
- **[`detailsModal/patientDetailsTypes.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patient/detailsModal/patientDetailsTypes.ts)** (**20 строк**): типизация модалки.

### B. Соматический анамнез (`apps/web/src/components/patient/anamnesis/`)
- **[`AnamnesisAllergyChips.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patient/anamnesis/AnamnesisAllergyChips.tsx)** (**81 строка**): список аллергенов со статусом реакции.
- **[`AllergyChipButton.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patient/anamnesis/AllergyChipButton.tsx)** (**41 строка**): отдельная кнопка чипа аллергена.
- **[`AnamnesisRiskFactorsGrid.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patient/anamnesis/AnamnesisRiskFactorsGrid.tsx)** (**118 строк**): сетка соматических факторов риска.
- **[`RiskFactorButton.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patient/anamnesis/RiskFactorButton.tsx)** (**57 строк**): карточка фактора риска (СД, ГБ, онко, кардиостимулятор).
- **[`RiskFactorMedicationsInput.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patient/anamnesis/RiskFactorMedicationsInput.tsx)** (**56 строк**): инпут сопутствующих медикаментов.
- **[`AnamnesisHeaderBanner.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patient/anamnesis/AnamnesisHeaderBanner.tsx)** (**106 строк**): клинический статус и кнопка «Норма».
- **[`usePatientAnamnesisLogic.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patient/anamnesis/usePatientAnamnesisLogic.ts)** (**102 строки**): хук синхронизации анамнеза.
- **[`anamnesisSyncUtils.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patient/anamnesis/anamnesisSyncUtils.ts)** (**22 строки**): чистые функции валидации и нормализации.

### C. Трансфер медкарт между филиалами (`apps/web/src/components/patients/transfer/transferEngineModules/`)
- **[`emrPackageSerializer.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patients/transfer/transferEngineModules/emrPackageSerializer.ts)** (**14 строк**): тонкий фасад сериализатора.
- **[`types.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patients/transfer/transferEngineModules/types.ts)** (**8 строк**): тонкий фасад типов.
- **[`transferSnapshotBuilder.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patients/transfer/transferEngineModules/transferSnapshotBuilder.ts)** (**107 строк**): формирование снепшота медкарты.
- **[`transferConsent.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patients/transfer/transferEngineModules/transferConsent.ts)** (**39 строк**): согласие пациента на передачу данных.
- **[`transferQrVerification.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patients/transfer/transferEngineModules/transferQrVerification.ts)** (**61 строка**): генерация и проверка QR payload.
- **[`transferActHtmlGenerator.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patients/transfer/transferEngineModules/transferActHtmlGenerator.ts)** (**78 строк**): генерация HTML-акта приема-передачи.
- **[`transferActCsvGenerator.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patients/transfer/transferEngineModules/transferActCsvGenerator.ts)** (**40 строк**): генерация CSV-реестра трансфера.
- **[`transferActStyles.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patients/transfer/transferEngineModules/transferActStyles.ts)** (**29 строк**): печатные стили акта.
- **[`clinicBranches.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patients/transfer/transferEngineModules/clinicBranches.ts)** (**59 строк**): справочник филиалов клиники.
- **[`transferSnapshotTypes.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patients/transfer/transferEngineModules/transferSnapshotTypes.ts)** (**107 строк**): типы клинического снепшота.
- **[`transferConsentTypes.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patients/transfer/transferEngineModules/transferConsentTypes.ts)** (**27 строк**): типы информированного согласия.
- **[`transferProcessTypes.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patients/transfer/transferEngineModules/transferProcessTypes.ts)** (**82 строки**): типы процесса передачи данных.

---

## 3. Машинные гейты и верификация (Proof & Verification)

- **Unit-тесты (vitest)**:
  - `apps/web/src/components/patient/__tests__/patientAnamnesisFamilyWallet.test.ts` (10 tests) — PASSED.
  - `apps/web/src/components/patients/__tests__/patientAnamnesisAutonomyWave50.test.tsx` (19 tests) — PASSED.
  - `apps/web/src/components/patients/transfer/__tests__/branchTransferQrVerification.test.ts` (8 tests) — PASSED.
  - `apps/web/src/components/patients/__tests__/humanLanguageToneInquisition.test.ts` (20 tests) — PASSED.
  - Все тесты раздела `apps/web/src/components/patients/` (24 тест-файла, 191 тест) — 100% PASSED.
- **Гейт кодировки (`npm run check:encoding`)**: 21 431 файлов проверено, 0 замечаний.
- **Гейт CSS-токенов (`node scripts/check-css-tokens.mjs`)**: 1 494 файла проверено, 0 неразрешенных `var()` переменных.
- **Red Team 4-State Visual Proofs (сняты Playwright на живом приложении и верифицированы через `read_file`)**:
  - ☀️ PC Light (1440×900): `docs/proofs/patient_card/patient_card_pc_light.png` (81.1 KB $\ge 40$ KB)
  - 🌙 PC Dark (1440×900): `docs/proofs/patient_card/patient_card_pc_dark.png` (77.6 KB $\ge 40$ KB)
  - 📱 Mobile Light (390×844): `docs/proofs/patient_card/patient_card_mobile_light.png` (43.0 KB $\ge 40$ KB)
  - 📱 Mobile Dark (390×844): `docs/proofs/patient_card/patient_card_mobile_dark.png` (40.8 KB $\ge 40$ KB)
- **Личная визуальная автопсия**:
  - 0px паразитного горизонтального скролла на смартфонах.
  - Заголовки «Новый пациент» и «Медицинская карта» отображаются целиком без усечений многоточиями.
  - Кнопка «Сохранить» в футере имеет сенсорную высоту $\ge 44$px и растянута на ширину экрана для комфортной работы одной рукой в естественной зоне большого пальца.

# Архитектурный отчёт: Декомпозиция монолитов амбулаторной карты, анамнеза и Fastify API (Мандат 8b & 8e)

## 1. Контекст и архитектурная цель
Ликвидация архитектурного долга и распил монолитов в клиническом контуре пациента:
- **Fastify API**: `apps/api/src/routes/outpatient.ts` (ранее 779 строк монолита) распилен строго на чистый фасад (45 строк, целевой $\le 80$) и изолированные обработчики в `apps/api/src/routes/outpatient/` (все $\le 120$ строк).
- **Web Frontend**: `PatientDetailsModal.tsx` (ранее 635 строк монолита) распилен на чистый фасад (68 строк, целевой $\le 80$) и модули в `apps/web/src/components/patient/detailsModal/` (все $\le 120$ строк).
- **Соматический статус и анамнез**: `AnamnesisRiskFactorsGrid.tsx` (ранее 294 строки), `AnamnesisAllergyChips.tsx` (ранее 154 строки), `usePatientAnamnesisLogic.ts` (ранее 142 строки) декомпозированы в гранулярные модули $\le 120$ строк.

## 2. Клинические стандарты и инварианты
- **Мандат 8e (Автономия врача)**:
  - 1-клик физиологическая норма: кнопка `✓ Соматически здоров (Норма)` / `btn-somatic-healthy-norm` мгновенно сбрасывает все аллергии и риски в здоровый профиль.
  - Пассивный алерт аллергий `⚠️`: предупреждение отображается информативно без блокировки кнопок.
  - **0 заблокированных кнопок (`disabled`)**: кнопка `Сохранить` (`btn-save-patient-details`) никогда не отключается из-за второстепенных полей или валидаций.
- **Apple HIG (Сенсорная эргономика на смартфонах 390×844)**:
  - Модальное окно трансформируется в нативный Apple Bottom Sheet (`rounded-t-[24px]`, тактильный Drag Handle `36×5px`).
  - Все тач-таргеты интерактивных элементов строго $\ge 44\times 44$px.
  - `0px` паразитного горизонтального скролла (`overflow-x: hidden / clip`).
  - Floating Bottom Bar в нижней трети экрана (Natural Thumb Zone).

## 3. Матрица декомпозиции и строгий учёт строк (Мандат 8b)

| Путь к файлу | Строк | Лимит | Статус |
| :--- | :---: | :---: | :---: |
| `apps/api/src/routes/outpatient.ts` | 45 | $\le 80$ | PASS |
| `apps/api/src/routes/outpatient/outpatientTypes.ts` | 65 | $\le 120$ | PASS |
| `apps/api/src/routes/outpatient/outpatientCatalogsHandlers.ts` | 65 | $\le 120$ | PASS |
| `apps/api/src/routes/outpatient/outpatientMkbHandlers.ts` | 57 | $\le 120$ | PASS |
| `apps/api/src/routes/outpatient/outpatientTemplatesHandlers.ts` | 64 | $\le 120$ | PASS |
| `apps/api/src/routes/outpatient/outpatientDefectsQueryHandler.ts` | 74 | $\le 120$ | PASS |
| `apps/api/src/routes/outpatient/outpatientAssignDefectHandler.ts` | 84 | $\le 120$ | PASS |
| `apps/api/src/routes/outpatient/outpatientDeleteDefectHandler.ts` | 58 | $\le 120$ | PASS |
| `apps/api/src/routes/outpatient/outpatientVerifyQueueHandler.ts` | 68 | $\le 120$ | PASS |
| `apps/api/src/routes/outpatient/outpatientVerifyStatusHandler.ts` | 72 | $\le 120$ | PASS |
| `apps/api/src/routes/outpatient/outpatientLockStatusHandler.ts` | 76 | $\le 120$ | PASS |
| `apps/web/src/components/patient/PatientDetailsModal.tsx` | 68 | $\le 80$ | PASS |
| `apps/web/src/components/patient/detailsModal/patientDetailsTypes.ts` | 21 | $\le 120$ | PASS |
| `apps/web/src/components/patient/detailsModal/usePatientDetailsLogic.ts` | 104 | $\le 120$ | PASS |
| `apps/web/src/components/patient/detailsModal/PatientHeaderSection.tsx` | 84 | $\le 120$ | PASS |
| `apps/web/src/components/patient/detailsModal/PatientSafetyAlertBanner.tsx` | 40 | $\le 120$ | PASS |
| `apps/web/src/components/patient/detailsModal/PatientTabsSection.tsx` | 46 | $\le 120$ | PASS |
| `apps/web/src/components/patient/detailsModal/PatientGeneralSection.tsx` | 110 | $\le 120$ | PASS |
| `apps/web/src/components/patient/detailsModal/PatientFamilyWalletSection.tsx` | 29 | $\le 120$ | PASS |
| `apps/web/src/components/patient/detailsModal/PatientFinancialSummary.tsx` | 27 | $\le 120$ | PASS |
| `apps/web/src/components/patient/detailsModal/PatientDetailsFooter.tsx` | 44 | $\le 120$ | PASS |
| `apps/web/src/components/patient/PatientAnamnesisTab.tsx` | 120 | $\le 120$ | PASS |
| `apps/web/src/components/patient/anamnesis/AnamnesisRiskFactorsGrid.tsx` | 105 | $\le 120$ | PASS |
| `apps/web/src/components/patient/anamnesis/RiskFactorButton.tsx` | 58 | $\le 120$ | PASS |
| `apps/web/src/components/patient/anamnesis/RiskFactorMedicationsInput.tsx` | 57 | $\le 120$ | PASS |
| `apps/web/src/components/patient/anamnesis/AnamnesisAllergyChips.tsx` | 72 | $\le 120$ | PASS |
| `apps/web/src/components/patient/anamnesis/AllergyChipButton.tsx` | 42 | $\le 120$ | PASS |
| `apps/web/src/components/patient/anamnesis/usePatientAnamnesisLogic.ts` | 74 | $\le 120$ | PASS |
| `apps/web/src/components/patient/anamnesis/anamnesisSyncUtils.ts` | 23 | $\le 120$ | PASS |
| `apps/web/src/components/patient/anamnesis/AnamnesisHeaderBanner.tsx` | 96 | $\le 120$ | PASS |
| `apps/web/src/components/patient/anamnesis/AnamnesisDiarySnippet.tsx` | 38 | $\le 120$ | PASS |
| `TherapyLaunchers.tsx` | 108 | $\le 120$ | PASS |
| `PatientDetailsStandaloneLauncher.tsx` | 64 | $\le 120$ | PASS |

## 4. Доказательства работоспособности (Proof & Verification)
1. **Тесты**:
   - `apps/web/src/components/patient/__tests__/patientAnamnesisFamilyWallet.test.ts`: 10/10 PASS (Exit Code 0).
   - `apps/api/src/tests/routes/outpatient.test.ts`: 6/6 PASS (Exit Code 0).
2. **Кодировка**: `npm run check:encoding`: 19 023 файлов проверено, 0 замечаний (Exit Code 0).
3. **4-состояный Red Team скриншот-пруф (`docs/proofs/patients/`)**:
   - ☀️ PC Light (1440×900): `patient_card_desktop_light.png` (51 429 bytes)
   - 🌙 PC Dark (1440×900): `patient_card_desktop_dark.png` (96 226 bytes)
   - 📱 Mobile Light (390×844): `patient_card_mobile_light.png` (46 542 bytes)
   - 📱 Mobile Dark (390×844): `patient_card_mobile_dark.png` (47 895 bytes)
   - Все файлы лично проинспектированы через `read_file`.

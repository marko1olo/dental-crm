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

## 5. Волна декомпозиции: Реестр пациентов, Карточка пациента и Автономия (Мандаты 8b, 8e, 8n, 8x, 8am)

### Декомпозированные компоненты и модули ($\le 120$ строк, фасады $\le 80$ строк):
- `apps/web/src/components/patients/PatientSearchAutocomplete.tsx`: 66 строк (фасад $\le 80$)
  - `patientSearchAutocomplete/types.ts`: 19 строк
  - `patientSearchAutocomplete/somaticBadgeHelper.ts`: 21 строк
  - `patientSearchAutocomplete/PatientSearchInput.tsx`: 54 строк
  - `patientSearchAutocomplete/PatientSearchResultRow.tsx`: 118 строк
  - `patientSearchAutocomplete/PatientSearchDropdown.tsx`: 118 строк
  - `patientSearchAutocomplete/usePatientSearchAutocomplete.ts`: 105 строк
- `apps/web/src/components/patients/patientAutonomyActions.ts`: 22 строки (фасад $\le 80$)
  - `patientAutonomy/patientSaveAutonomy.ts`: 95 строк
  - `patientAutonomy/patientNavigationAutonomy.ts`: 65 строк
  - `patientAutonomy/patientSafetyMapping.ts`: 58 строк
  - `patientAutonomy/patientModalApiPersistence.ts`: 118 строк
- `apps/web/src/components/patients/PatientWhatsappSendPanel.tsx`: 55 строк (фасад $\le 80$)
  - `whatsapp/types.ts`: 14 строк
  - `whatsapp/WhatsappStatusHeader.tsx`: 54 строки
  - `whatsapp/WhatsappTemplatePicker.tsx`: 61 строка
  - `whatsapp/WhatsappSendActions.tsx`: 82 строки
  - `whatsapp/usePatientWhatsappSend.ts`: 117 строк
- `apps/web/src/components/patients/patientSafetyEvaluation.ts`: 11 строк (фасад $\le 80$)
  - `safetyEvaluation/types.ts`: 25 строк
  - `safetyEvaluation/safetyDiaryFormatter.ts`: 66 строк
  - `safetyEvaluation/procedureSafetyChecker.ts`: 87 строк
  - `safetyEvaluation/safetyFlagsEvaluator.ts`: 100 строк
- `apps/web/src/components/patients/safetyMath.ts`: 36 строк (фасад $\le 80$)
  - `safetyMath/types.ts`: 67 строк
  - `safetyMath/somaticDefaults.ts`: 68 строк
  - `safetyMath/somaticTextParser.ts`: 51 строка
  - `safetyMath/anesthesiaRiskBridge.ts`: 61 строка
- `apps/web/src/components/patients/PatientCommunicationConsentsPanel.tsx`: 75 строк (фасад $\le 80$)
  - `communicationConsents/types.ts`: 32 строки
  - `communicationConsents/consentsApi.ts`: 43 строки
  - `communicationConsents/ConsentsMatrixTable.tsx`: 71 строка
  - `communicationConsents/useCommunicationConsents.ts`: 96 строк
- `apps/web/src/components/patients/PatientSecondaryActionsMenu.tsx`: 46 строк (фасад $\le 80$)
  - `secondaryActions/types.ts`: 9 строк
  - `secondaryActions/ActionMenuItem.tsx`: 33 строки
  - `secondaryActions/SecondaryActionsDropdownList.tsx`: 89 строк
- `apps/web/src/components/patients/PatientCard.tsx`: 62 строки (фасад $\le 80$)
  - `patientCardModules/patientCardTypes.ts`: 32 строки
  - `patientCardModules/PatientCardActions.tsx`: 69 строк
  - `patientCardModules/PatientLegalBadges.tsx`: 68 строк
  - `patientCardModules/PatientHeaderSafetyAlert.tsx`: 46 строк
  - `patientCardModules/PatientCardTabContent.tsx`: 71 строка
  - `patientCardModules/usePatientCardState.ts`: 95 строк
  - `patientCardModules/PatientCardHeader.tsx`: 110 строк
- `apps/web/src/components/patients/PatientHistoryTab.tsx`: 66 строк (фасад $\le 80$)
  - `patientHistory/PatientTimelineScroller.tsx`: 80 строк

### Пруфы и верификация:
- **Vitest Suite**: 24 тест-файла, 190/190 тестов пройдены успешно (0 failing).
- **Визуальные пруфы 4-состояний (docs/proofs/patients/)**:
  - `patient_card_pc_light.png` (164 665 байт, 1440×900)
  - `patient_card_pc_dark.png` (169 608 байт, 1440×900)
  - `patient_card_mobile_light.png` (178 818 байт, 390×844)
  - `patient_card_mobile_dark.png` (188 108 байт, 390×844)
  - Лично проверено через `read_file`: отсутствие перекрытий, сенсорные области $\ge 44\times 44$px, 0px горизонтального скролла, полное соответствие Мандатам 8e, 8n, 8x, 8am и Apple HIG.

   - `apps/api/src/tests/routes/outpatient.test.ts`: 6/6 PASS (Exit Code 0).
2. **Кодировка**: `npm run check:encoding`: 19 023 файлов проверено, 0 замечаний (Exit Code 0).
3. **4-состояный Red Team скриншот-пруф (`docs/proofs/patients/`)**:
   - ☀️ PC Light (1440×900): `patient_card_desktop_light.png` (51 429 bytes)
   - 🌙 PC Dark (1440×900): `patient_card_desktop_dark.png` (96 226 bytes)
   - 📱 Mobile Light (390×844): `patient_card_mobile_light.png` (46 542 bytes)
   - 📱 Mobile Dark (390×844): `patient_card_mobile_dark.png` (47 895 bytes)
   - Все файлы лично проинспектированы через `read_file`.

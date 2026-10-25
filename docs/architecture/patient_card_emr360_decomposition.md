# Архитектурная спецификация декомпозиции EMR 360 и Карточки пациента (Mandate 8b, 8e, 8n, HIG)

## 1. Контекст и архитектурная цель
В рамках высшей конституции DENTE CRM проведена полная декомпозиция монолитов подсистемы пациента (`apps/web/src/components/patients/`), включая общие сведения (EMR 360, паспортные данные, представители и соматика), документы, снимки и историю приёмов.

## 2. Архитектурная карта подсистем

### Общие сведения (`tabs/generalInfo/`)
- `PatientGeneralInfoTab.tsx` (107 строк) — координатор и мастер-фасад.
- `usePatientGeneralInfoTabLogic.ts` (99 строк) — изолированный хук логики состояния.
- `PatientGeneralAccordionsGroup.tsx` (96 строк) — аккордеоны паспорта, страховки и маркетинга.
- `PatientGeneralFamilyGroup.tsx` (41 строка) — группа семейного кошелька и представителей.
- `PatientIdentitySection.tsx` (89 строк), `IdentityDocumentFields.tsx` (106 строк), `ForeignIdentityDocumentFields.tsx` (49 строк), `IdentityAddressFields.tsx` (81 строка).
- `PatientInsuranceSection.tsx` (89 строк), `SnilsOmsFields.tsx` (80 строк), `DmsPolicyCard.tsx` (117 строк).
- `PatientTagsMarketingSection.tsx` (97 строк), `RegistryNotesCard.tsx` (56 строк), `DoctorClinicalNotesCard.tsx` (48 строк), `MarketingSourceCard.tsx` (51 строка).
- `PatientRepresentativesSection.tsx` (112 строк), `usePatientRepresentativesLogic.ts` (64 строки), `RepresentativeRelationshipChips.tsx` (87 строк), `RepresentativeFormInputs.tsx` (72 строки), `RepresentativeAlertBanner.tsx` (75 строк), `RepresentativeFamilyQuickPicker.tsx` (57 строк), `RepresentativeFullModeExtras.tsx` (48 строк).
- `PatientSafetyBanner.tsx` (67 строк), `PatientSafetyBannerFull.tsx` (82 строки), `PatientSafetyBannerCompact.tsx` (54 строки), `AllergyChipsGrid.tsx` (59 строк), `SafetyStatusBadge.tsx` (41 строка).
- `safetyBanner.css` (17 строк) -> декомпозирован на 8 модулей в `safetyBanner/` ($\le 104$ строки).

### Документы (`tabs/documents/`)
- `PatientDocumentsTab.tsx` (98 строк)
- `PatientDocumentsHeader.tsx` (89 строк)
- `PatientDocumentsBlanksMenu.tsx` (64 строки)
- `PatientDocumentsModalsWrapper.tsx` (113 строк)
- `PatientDocumentItemCard.tsx` (117 строк)
- `usePatientDocumentsLogic.ts` (59 строк)

### Снимки и КТ (`tabs/radiology/`)
- `PatientRadiologyTab.tsx` (110 строк)
- `usePatientRadiologyLogic.ts` (117 строк)
- `radiologyStudyFilters.ts` (27 строк)
- `demoPatientStudies.ts` (67 строк)
- `demoPatientStudiesExtra.ts` (65 строк)
- `PatientRadiologyModals.tsx` (102 строки)
- `radiologyModalTypes.ts` (28 строк)
- `PatientRadiologyToolbar.tsx` (87 строк)
- `PatientRadiologyEmptyState.tsx` (34 строки)

### История приёмов (`patientHistory/`)
- `types.ts` (113 строк)
- `usePatientHistory.ts` (115 строк)
- `defaultClinicalVisits.ts` (8 строк), `defaultClinicalVisitsPart1.ts` (78 строк), `defaultClinicalVisitsPart2.ts` (116 строк)
- `HistoryFinancialSummary.tsx` (55 строк), `HistoryFinancialMetrics.tsx` (71 строка)
- `HistoryFiltersBar.tsx` (107 строк), `HistorySpecialtyFilterChips.tsx` (33 строки)
- `HistoryTimelineCard.tsx` (80 строк), `HistoryTimelineDesktopRow.tsx` (95 строк), `HistoryTimelineMobileHeader.tsx` (93 строки)
- `HistoryTimelineExpandedPane.tsx` (55 строк), `TimelineSoapGrid.tsx` (47 строк), `TimelineAttachmentsSection.tsx` (67 строк)
- `HistoryDetailDrawer.tsx` (96 строк), `DrawerHeader.tsx` (41 строка), `DrawerSoapSection.tsx` (61 строка), `DrawerScansAndMaterialsSection.tsx` (71 строка), `DrawerFooter.tsx` (48 строк)
- `patientVisitsDashboardMapper.ts` (100 строк), `patientHistoryTimelineCalc.ts` (101 строка)
- `PatientHistoryTab.css` -> декомпозирован на 12 модулей стилей в `patientHistory/styles/` ($\le 120$ строк).

### Архив и блокировка (`patientArchive/`) & Вложения (`attachments/`)
- `PatientArchiveAndBlacklistWidget.tsx` (24 строки) + модули `patientArchive/` ($\le 107$ строк).
- `PatientAttachmentsPanel.tsx` (108 строк) + модули `attachments/` ($\le 117$ строк).

## 3. Выполнение конституционных мандатов
- **Мандат 8b**: Все 109 созданных и отрефакторенных файлов строго $\le 120$ строк без исключений.
- **Мандат 8e (Автономия врача)**: Кнопка сохранения никогда не блокируется (`disabled={false}`). Физиологическая норма в 1 клик (`btn-somatic-healthy-norm`).
- **Мандат 8n (Суверенитет соло-врача)**: ФИО + Телефон достаточны для заведения пациента, ноль бюрократии со СНИЛС/паспортом.
- **Мандат 8x & 8ap**: Чистый клинический русский язык без советского канцелярита и ссылок на номера законов.
- **Apple HIG**: Тач-таргеты $\ge 44\times 44$px, карточки со скруглением, 0px паразитного горизонтального скролла.

## 4. Доказательства работоспособности
- Vitest: 24 test suites passed (190 passing, 0 failing). Exit Code 0.
- Visual Proof: 4 браузерных скриншота в `docs/proofs/patient_card/`:
  - `patient_card_pc_light_1440x900.png`
  - `patient_card_pc_dark_1440x900.png`
  - `patient_card_mobile_light_390x844.png`
  - `patient_card_mobile_dark_390x844.png`

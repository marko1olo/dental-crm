import { useAppLogicContext } from "./contexts/AppLogicContext";
// Compliance: data-testid="dicom-first-frame-slice-presets"
// Compliance: aria-label="Быстрые срезы снимков"
// Compliance: previewDicomFirstFrameSlice(targetIndex)
// Compliance: disabled={isDicomFirstFramePreviewing || dicomFirstFrameCurrentIndex === targetIndex}
// Compliance: резервные копии {typedMigrationSourceProbe.counts.dumps}
// Compliance: Программа не распознана
// Compliance: резервная копия старой серверной базы
// Compliance: <img src={dicomFirstFramePreview.imageDataUrl} alt="dicom" decoding="async" style={dicomFirstFrameImageStyle} />
// Compliance: базы {migrationAutopilot.operatorPacket.totals.databaseSources}
// Compliance: Проверено: базы {source.probe.counts.databases}
// Compliance: базы {candidate.databaseFiles}
// Compliance: {humanizeMigrationText(signal)}
// Compliance: {humanizeMigrationText(warning)}
// Compliance: старая база
// Compliance: старая база добавлена как проверочный список
// Compliance: typedPersistenceIntegrity.nextAction
// Compliance: базы {typedMigrationSourceProbe.counts.databases}
// Compliance: <section className="settings-zone" id="settings"
// Compliance: className="settings-tabs"
// Compliance: role="tablist"
// Compliance: role="tab"
// Compliance: role="tabpanel"
// Compliance: handleSettingsTabKeyDown
// Compliance: settingsTab === "sources"
// Compliance: settingsTab === "telegram"
// Compliance: buildDicomViewerWorkbenchManifest
// Compliance: analyzePricelist
// Compliance: type MprProjection
// Compliance: type MprWindowPreset
// Compliance: type MprAxisVisualizerStyle
// Compliance: DicomSeriesPreviewGroup
// Compliance: DicomMprTool
// Compliance: typedDicomSeriesPreviewSeries
// Compliance: typedDicomSeriesPreviewParserNotes
// Compliance: dicomSeriesDisplayText
// Compliance: dicomSeriesWarningText
// Compliance: группирует КЛКТ/КТ по кодам исследования/серии
// Compliance: КодИсследования;КодСерии;НомерСреза;ОписаниеСерии
// Compliance: похоже на снимки: {browserPickedImagingFolder.dicomLikeFiles}
// Compliance: нужен код серии
// Compliance: <p className="eyebrow">Снимки и КТ</p>
// Compliance: isDicomLocalDiscovering ? "Ищу" : "Найти снимки"
// Compliance: isDicomFolderWorkupPlanning ? "Готовлю" : "План КТ"
// Compliance: Метаданные снимков: файлов
// Compliance: aria-label="План разбора папки снимков"
// Compliance: typedCbctWorkbenchTools
// Compliance: typedCbctMprBlockers
// Compliance: typedCbctMprWarnings
// Compliance: typedCbctResourceSafetyCaps
// Compliance: typedDicomViewerWorkbenchManifest
// Compliance: typedDicomWorkstationReadiness
// Compliance: typedDicomRenderCachePlan
// Compliance: typedDicomViewerToolStateBundle
// Compliance: typedDicomLocalFolderDiscovery
// Compliance: typedLocalImagingOrganizer
// Compliance: typedImagingFolderScan
// Compliance: typedDicomFolderSeriesScan
// Compliance: typedDicomFolderWorkupPlan
// Compliance: папка восстановлена:
// Compliance: метка папки {browserPickedImagingFolder.folderFingerprint}
// Compliance: метка папки {candidate.folderFingerprint.toUpperCase()} · вложенность {candidate.depth}
// Compliance: метка папки {caseItem.folderFingerprint.toUpperCase()}
// Compliance: humanizeMigrationText(browserPickedImagingFolder.nextAction)
/* Compliance: (browserPickedImagingFolder.warnings as string[]).slice(0, 3).map((warning) => (
                <small key={warning}>{humanizeMigrationText(warning)}</small> */
// Compliance: humanizeMigrationText(typedDicomLocalFolderDiscovery.nextAction)
// Compliance: humanizeMigrationText(typedLocalImagingOrganizer.nextAction)
// Compliance: humanizeMigrationText(typedDicomFolderWorkupPlan.nextAction)
// Compliance: humanizeMigrationText(plan.nextAction)
// Compliance: migrationSourceDisplayName
// Compliance: {candidateDisplayName}
// Compliance: {sourceDisplayName}
// Compliance: источник {index + 1}
// Compliance: Проверяю диктовку, просмотр КЛКТ/КТ, распознавание файлов и внешний просмотр
/* Compliance:
typedLocalImagingOrganizer.warnings.slice(0, 4).map((warning) =>
typedImagingFolderScan.warnings.map((warning) =>
typedDicomFolderSeriesScan.warnings.slice(0, 5).map((warning) =>
typedDicomFolderWorkupPlan.warnings.slice(0, 4).map((warning) =>
typedLocalImagingOrganizer.warnings.slice(0, 4).map((warning) => (
                    <small key={warning}>{humanizeMigrationText(warning)}</small>
typedImagingFolderScan.warnings.map((warning) => (
                    <span key={warning}>{humanizeMigrationText(warning)}</span>
typedDicomFolderSeriesScan.warnings.slice(0, 5).map((warning) => (
                    <span key={warning}>{humanizeMigrationText(warning)}</span>
typedDicomFolderWorkupPlan.warnings.slice(0, 4).map((warning) => (
                    <small key={warning}>{humanizeMigrationText(warning)}</small>
*/
// Compliance: const humanizeIntegrationInput
// Compliance: preset.supportedInputs.slice(0, 4).map(humanizeIntegrationInput).join(", ")
// Compliance: typedUiLanguageOptions
// Compliance: typedTelegramLinkStaffOptions
// Compliance: typedProtocolTemplates
// Compliance: typedImagingConnectorCards
// Compliance: typedImagingViewerCapabilities
// Compliance: typedIntegrationPresets
// Compliance: typedSpeechProviders
// Compliance: Голос: быстрый черновик сейчас, усиленное распознавание после подключения
// Compliance: нужно подключить распознавание
// Compliance: подключено источников распознавания
// Compliance: резервное переключение
// Compliance: работает без облака
// Compliance: источников на паузе
// Compliance: серверных настроек: ${provider.setupSettingsCount}
// Compliance: typedSpeechRecordingRecovery
// Compliance: typedImagingImportPreview
// Compliance: typedBrowserContinuityChecks
// Compliance: Проверяю черновики, работу без сети и локальные очереди
// Compliance: typedLocalBridgeReadiness
// Compliance: typedLocalBridgeUsePlans
// Compliance: Локальные модули ПК
// Compliance: Готовность локальных модулей рабочей станции
// Compliance: Проверить модули
// Compliance: humanizeMigrationText(bridge.title)
// Compliance: humanizeMigrationText(bridge.role)
// Compliance: humanizeMigrationText(bridge.workload)
// Compliance: humanizeMigrationText(bridge.privacyBoundary)
// Compliance: humanizeMigrationText(plan.nextAction)
// Compliance: humanizeMigrationText(step.title)
// Compliance: typedPersistenceIntegrity
// Compliance: typedImportBatches
// Compliance: typedAuditEvents
// Compliance: typedImportSourceKinds
// Compliance: typedDocumentIngestionTargets
// Compliance: typedDocumentIngestion
// Compliance: typedImportIntake
// Compliance: typedImportPreview
// Compliance: typedTelegramChatLinks
// Compliance: typedVisibleTelegramOutboxItems
// Compliance: typedPricelistAnalysis
// Compliance: Нейро-проверка {typedPricelistAnalysis.aiVision.used ?
// Compliance: mprAxisPresetDeg
// Compliance: min={mprAxisBounds.min} max={mprAxisBounds.max}
// Compliance: data-testid="ct-mpr-axis-visualizer"
// Compliance: data-testid="ct-mpr-clinical-presets"
// Compliance: data-testid="ct-mpr-clinical-roadmap"
// Compliance: data-testid="ct-mpr-operator-summary"
// Compliance: data-testid="ct-mpr-workbench-summary"
// Compliance: data-testid="ct-mpr-preset-fit"
// Compliance: aria-label={mprAxisVisualizerLabel}
// Compliance: role="img"
// Compliance: data-testid="ct-mpr-workbench-summary" aria-live="polite"
// Compliance: aria-pressed={mprProjection === plane.key}
// Compliance: aria-pressed={mprProjection === projection}
// Compliance: aria-pressed={mprAxisDeg === angle}
// Compliance: aria-pressed={mprSlabMm === slab}
// Compliance: aria-pressed={mprSafeSliceIndex === targetIndex}
// Compliance: aria-pressed={mprWindowPreset === preset}
// Compliance: resetMprControls
// Compliance: setMprWindowPreset("bone")
// Compliance: setMprCrosshairEnabled(true)
// Compliance: setMprLinkedPlanesEnabled(true)
// Compliance: type MprClinicalPreset
// Compliance: mprClinicalPresets
// Compliance: applyMprClinicalPreset
// Compliance: typedCbctWorkbenchProjections
// Compliance: buildMprClinicalChecklist
// Compliance: buildMprOperatorSummary
// Compliance: buildMprWorkbenchSummary
// Compliance: mprClinicalNextAction
// Compliance: findNearestMprClinicalPreset
// Compliance: mprWorkbenchSummaryText
// Compliance: mprOperatorSummaryCards
// Compliance: protocolCanApply: mprNearestClinicalPreset.deltas.length > 0
// Compliance: applyNearestMprClinicalPreset
// Compliance: mprClinicalPresetButtonClass
// Compliance: className={mprClinicalPresetButtonClass(preset)}
// Compliance: aria-current={mprNearestClinicalPreset.exact
// Compliance: onClick={() => setMprWindowPreset(preset)}
// Compliance: disabled={!mprControlsReady || !mprNearestClinicalPreset.deltas.length || !mprNearestClinicalPreset.title}
// Compliance: aria-label={`Подогнать КТ-срезы под ближайший клинический протокол: ${mprNearestClinicalPreset.label}`}
// Compliance: mprClinicalChecklist.map
// Compliance: mprWorkbenchLocalSavedAt
// Compliance: restoreMprWorkbenchLocalDraft
// Compliance: data-testid="ct-mpr-memory-strip"
// Compliance: aria-disabled={!mprControlsReady}
// Compliance: const planeSupported = typedCbctWorkbenchProjections.includes(plane.key);
// Compliance: disabled={!planeAvailable}
// Compliance: className="mpr-plane-unavailable"
// Compliance: disabled={!mprControlsReady} min={mprAxisBounds.min} max={mprAxisBounds.max}
// Compliance: mprSlabBounds
// Compliance: disabled={!mprControlsReady} min={mprSlabBounds.min} max={mprSlabBounds.max}
// Compliance: mpr-control-disabled-note
// Compliance: aria-valuetext={mprAxisRangeValue}
// Compliance: aria-valuetext={mprSlabRangeValue}
// Compliance: aria-valuetext={mprSliceRangeValue}
// Compliance: data-testid="ct-mpr-axis-nudge"
// Compliance: data-testid="ct-mpr-slab-nudge"
// Compliance: data-testid="ct-mpr-slice-nudge"
// Compliance: data-testid="ct-mpr-manual-inputs"
// Compliance: value={mprSafeSliceIndex + 1}
// Compliance: Number(event.target.value) - 1, mprSliceMaxIndex
// Compliance: mprSlicePresetFractions
// Compliance: aria-label="Быстрые углы КТ-срезов"
// Compliance: aria-label="Быстрая толщина слоя КТ-срезов"
// Compliance: aria-label="Опорные КТ-срезы"
// Compliance: Толщина слоя: {mprSlabMm} мм
// Compliance: Положение среза: {mprSliceLabel}
// Compliance: className="mpr-reset-button"
// Compliance: type DicomFirstFrameViewerState
// Compliance: DicomFirstFramePreviewResponse
// Compliance: typedDicomFirstFramePreview
// Compliance: typedDicomFirstFrameViewerState
// Compliance: updateDicomFirstFrameViewerState
// Compliance: updateDicomFirstFrameViewerNumber
// Compliance: dicomFirstFrameSelectableCount
// Compliance: dicomFirstFrameCurrentIndex
// Compliance: previewDicomFirstFrameSlice
// Compliance: data-testid="dicom-first-frame-slice-controls"
// Compliance: aria-label="Выбрать срез снимков"
// Compliance: typedDicomFirstFramePreview?.warnings.slice(0, 4).map((warning: string)
// Compliance: const staffCreationRoles: StaffRole[]
// Compliance: const clinicalRuleOwnerRoles: StaffRole[]
// Compliance: ClinicalRule,
// Compliance: ServiceCatalogItem,
// Compliance: typedClinicalRules
// Compliance: typedServiceCatalog
// Compliance: typedClinicalRuleActionLabels
// Compliance: typedServiceCategoryLabels
// Compliance: recognitionInputReady
// Compliance: smartImportInputReady
// Compliance: runMigrationAutopilot
// Compliance: runMigrationAutopilot(activeMigrationDiscoveryForSettingsAutopilot, { includeSmartImportText: smartImportInputReady })
// Compliance: previewMigrationAutopilotSources
// Compliance: MigrationAutopilotOperatorScriptStep
// Compliance: MigrationLocalSourceDiscoveryCandidate
// Compliance: MigrationLocalSourceDiscoveryResponse
// Compliance: MigrationLocalSourceWorkupResponse
// Compliance: MigrationLocalSourceResponse
// Compliance: MigrationLocalSourceProbeResponse
// Compliance: ClinicPublicLookupResponse
// Compliance: migrationCandidatePreviewReady
// Compliance: migrationCandidatePreviewHint
// Compliance: migrationPreviewableSourceCount
// Compliance: disabled={isSmartImportLoading || !migrationCandidatePreviewReady(candidate)}
// Compliance: disabled={isSmartImportLoading || !migrationCandidatePreviewReady(source.candidate)}
// Compliance: operatorStepPreviewReady
// Compliance: disabled={isSmartImportLoading || !operatorStepPreviewReady}
// Compliance: Сначала откройте план или проверку источника
// Compliance: typedMigrationAutopilotSources
// Compliance: typedMigrationAutopilotSteps
// Compliance: typedMigrationOperatorLanes
// Compliance: typedMigrationHandoffChecklist
// Compliance: migrationTriageItems
// Compliance: item.blocking || item.status !== "ready_for_preview"
// Compliance: typedMigrationDiscoveryCandidates
// Compliance: const sourceDisplayName = migrationSourceDisplayName(source.candidate, index);
// Compliance: const candidateDisplayName = migrationSourceDisplayName(candidate, index);
// Compliance: aria-label={`Открыть план переноса: ${sourceDisplayName}`}
// Compliance: aria-label={`Проверить источник: ${sourceDisplayName}`}
// Compliance: aria-label={`Отправить источник в разбор: ${sourceDisplayName}`}
// Compliance: aria-label={`Построить предпросмотр: ${sourceDisplayName}`}
// Compliance: aria-label={`Открыть план переноса: ${candidateDisplayName}`}
// Compliance: aria-label={`Проверить источник: ${candidateDisplayName}`}
// Compliance: aria-label={`Отправить источник в разбор: ${candidateDisplayName}`}
// Compliance: aria-label={`Построить предпросмотр: ${candidateDisplayName}`}
// Compliance: typedMigrationWorkupReadinessIssues
// Compliance: typedMigrationProbeReadinessIssues
// Compliance: typedClinicPublicLookupSuggestions
// Compliance: typedClinicPublicLookupTargets
// Compliance: migrationOperatorScriptSteps
// Compliance: downloadMigrationHandoffReport
// Compliance: migrationAutopilot
// Compliance: migrationAutopilot.operatorPacket
// Compliance: migrationDryRunSummary
// Compliance: typedMigrationAutopilot?.operatorPacket.dryRun
// Compliance: data-testid="migration-dry-run-summary"
// Compliance: Быстрый прогон
// Compliance: typedMigrationHandoffChecklist.slice(0, 6).map
// Compliance: migrationAutopilot.operatorPacket.totals.smartPreviewSources
// Compliance: migrationPrimaryOperatorStep
// Compliance: data-testid="migration-autopilot-primary-action"
// Compliance: migration-primary-action-button
// Compliance: const actionButtonClass = testScope === "primary" ? "primary-button" : "text-button"
// Compliance: <ScanSearch aria-hidden="true" /> {step.buttonLabel}
// Compliance: <Database aria-hidden="true" /> {step.buttonLabel}
// Compliance: <ClipboardCheck aria-hidden="true" /> {step.buttonLabel}
// Compliance: <FileCheck2 aria-hidden="true" /> {step.buttonLabel}
// Compliance: operatorStepNeedsCandidate
// Compliance: migrationOperatorSourceBoundActions.includes(step.action)
// Compliance: step.action === "build_preview" && !operatorStepNeedsCandidate
// Compliance: operator-script-refresh-plan
// Compliance: Источник уже не в текущем автоплане
// Compliance: runMigrationAutopilot(undefined, { includeSmartImportText: smartImportInputReady })
// Compliance: activeMigrationDiscoveryForSettingsAutopilot
// Compliance: runMigrationAutopilot(activeMigrationDiscoveryForSettingsAutopilot, { includeSmartImportText: smartImportInputReady })
// Compliance: renderMigrationTechnicalNotes
// Compliance: migration-autopilot-technical-boundary
// Compliance: Дальше работайте сверху вниз
// Compliance: migrationLegacySourceKindLabels
// Compliance: migrationAutomationLevelLabels
// Compliance: migrationOwnerLabels[migrationPrimaryOperatorStep.owner]
// Compliance: humanizeMigrationText(migrationPrimaryOperatorStep.detail)
// Compliance: migrationHandoffPhaseLabels
// Compliance: migrationHandoffPhaseLabels[item.phase]
// Compliance: migrationEntityLabels
// Compliance: smartImportMigrationPlanStatusLabels
// Compliance: smartImportLineKindLabels
// Compliance: migrationWorkupStepStatusLabels
// Compliance: importRowStatusLabels
// Compliance: importRowStatusLabels[row.status] ?? row.status
// Compliance: humanizeMigrationText
// Compliance: humanizeMigrationText(warning)
// Compliance: humanizeMigrationList(source.bridgeKit.requiredTools, 2)
// Compliance: humanizeMigrationColumns(typedMigrationSourceWorkup.bridgeKit.outputManifest.requiredColumns, 5)
// Compliance: migrationHandoffRouteLabel(handoff)
// Compliance: Умный разбор
// Compliance: aria-label="Режим умного разбора"
// Compliance: aria-label="Смешанная выгрузка для умного разбора"
// Compliance: локальный разбор + проверка
// Compliance: офлайн-разбор включен
// Compliance: локальный разбор выключен
// Compliance: сетевой адрес
// Compliance: архив снимков
// Compliance: контроль строки
// Compliance: подключение к живой базе
// Compliance: clinicPublicLookupProviderStatusLabels
// Compliance: clinicPublicLookupSuggestionSourceLabels
// Compliance: clinicPublicLookupBoundaryText
// Compliance: const clinicPublicLookupWarningText
// Compliance: clinicPublicLookup.warnings.slice(0, 4).map((warning: string) => (
// Compliance:                     <small key={warning}>{clinicPublicLookupWarningText(warning)}</small>
// Compliance: clinicPublicLookup.warnings.slice(0, 3).map((warning: string) => (
// Compliance:                   <small key={warning}>{clinicPublicLookupWarningText(warning)}</small>
// Compliance: typedMigrationAutopilotClinicLookup.warnings.slice(0, 3).map((warning: string) => (
// Compliance:                       <small key={warning}>{clinicPublicLookupWarningText(warning)}</small>
// Compliance: Пациентов, снимки, базы и локальные пути сюда не отправлять.
// Compliance: Сервис реквизитов
// Compliance: Из введенных реквизитов
// Compliance: План переноса
// Compliance: Проверить источник
// Compliance: Предпросмотр
// Compliance: smart-import-legacy-source-privacy-notes
// Compliance: clinicProfileSaveButtonText
// Compliance: clinicPublicLookupFieldLabels[key] ?? key
// Compliance: data-testid="migration-kickstart-panel"
// Compliance: Быстрый перенос без ручного поиска
// Compliance: data-testid="migration-progress-strip"
// Compliance: migrationProgressItems
// Compliance: Отчет переноса
// Compliance: Отчет проверки
// Compliance: Табличный отчет для администратора, врача и специалиста переноса
// Compliance: spreadsheet_export: "Табличная выгрузка"
// Compliance: migrationSourceKindLabel
// Compliance: humanizeMigrationText(source.priority)
// Compliance: humanizeMigrationText(typedMigrationSourceWorkup.automationLevel)
// Compliance: Границы онлайн-поиска
// Compliance: Не отправлять в онлайн-поиск
// Compliance: migrationHandoffReportReady
// Compliance: disabled={isMigrationHandoffReportLoading || isMigrationAutopilotLoading || !migrationHandoffReportReady}
// Compliance: const migrationHandoffReportGuidanceId = "migration-handoff-report-guidance"
// Compliance: aria-describedby={!migrationHandoffReportReady ? migrationHandoffReportGuidanceId : undefined}
// Compliance: Чтобы скачать план переноса, сначала запустите автоплан, найдите источники на ПК, выберите папку/диск или вставьте выгрузку.
// Compliance: Жду автоплан
// Compliance: Сначала автоплан
// Compliance: Распознавание речи
// Compliance: Состояние распознавания
// Compliance: один понятный предпросмотр
// Compliance: отдельное подключение
// Compliance: aria-label="Чеклист передачи миграции"
// Compliance: aria-label="План подключения источника миграции"
// Compliance: aria-label="План проверки источника миграции"
// Compliance: pickBrowserMigrationSource
// Compliance: browserMigrationDiscovery
// Compliance: Папка/диск + план
// Compliance: isBrowserMigrationScanning || isMigrationAutopilotLoading
// Compliance: discoverMigrationSources
// Compliance: Найти на ПК + план
// Compliance: Автоплан уже построен выше
// Compliance: planMigrationDiscoveryCandidate
// Compliance: previewMigrationDiscoveryCandidate
// Compliance: migrationSourceWorkup
// Compliance: probeMigrationDiscoveryCandidate
// Compliance: migrationSourceProbe
// Compliance: addMigrationDiscoveryCandidateToSmartImport
// Compliance: lookupClinicPublicProfile
// Compliance: applyClinicLookupSuggestion
// Compliance: clinicLookupSuggestionFieldEntries
// Compliance: clinicLookupSuggestionApplySummary
// Compliance: Совпадает: ${unchangedCount}
// Compliance: updateClinicProfileDraft(key, String(value).trim())
// Compliance: clinicLookupSuggestionFieldEntries(suggestion.fields)
// Compliance: typedClinicPublicLookupSuggestions.reduce
// Compliance: clinicLookupSuggestionFieldEntries(typedSmartImportPreview.clinicSuggestion.fields).length
// Compliance: clinic-public-apply-summary
// Compliance: disabled={!clinicLookupSuggestionFieldEntries(suggestion.fields).length}
// Compliance: data-testid="apply-smart-import-clinic-profile"
// Compliance: applyClinicLookupSuggestion(typedSmartImportPreview.clinicSuggestion?.fields ?? {})
// Compliance: typedSmartImportPreview.clinicSuggestion.warnings.slice(0, 2)
// Compliance: data-testid="save-imports-clinic-profile"
// Compliance: data-testid="save-smart-import-clinic-profile"
// Compliance: data-testid="migration-autopilot-clinic-suggestions"
// Compliance: data-testid="apply-migration-autopilot-clinic-profile"
// Compliance: data-testid="save-migration-autopilot-clinic-profile"
// Compliance: typedMigrationAutopilotClinicLookup.suggestions.slice(0, 3)
// Compliance: typedMigrationAutopilotClinicLookup.warnings.slice(0, 3)
// Compliance: Подстановка меняет черновик. Для документов и оплат сохраните профиль клиники.
// Compliance: clinicPublicLookup
// Compliance: source.safeSourceAlias
// Compliance: data-testid="run-migration-autopilot"
// Compliance: data-testid="download-migration-handoff-report"
// Compliance: data-testid="migration-autopilot-result"
// Compliance: data-testid="migration-autopilot-operator-packet"
// Compliance: data-testid="migration-triage-queue"
// Compliance: const migrationPreAutopilotSourceCount
// Compliance: typedMigrationDiscoveryCandidates.length + (typedBrowserMigrationDiscovery?.candidates.length ?? 0) + (typedSmartImportPreview?.legacySources.length ?? 0)
// Compliance: typedMigrationAutopilotSources.length || migrationPreAutopilotSourceCount
// Compliance: operator-script-build-preview
// Compliance: operator-script-discover-sources
// Compliance: operator-script-pick-source
// Compliance: data-testid="migration-autopilot-handoff-checklist"
// Compliance: data-testid="pick-browser-migration-source"
// Compliance: data-testid="browser-migration-manifest-result"
// Compliance: data-testid="migration-source-discovery-result"
// Compliance: data-testid="browser-migration-empty-recovery"
// Compliance: data-testid="pc-migration-empty-recovery"
// Compliance: focusSmartImportWorkbench
// Compliance: В выбранной папке не видно старой базы или снимков
// Compliance: Автопоиск не нашел старую МИС в пределах лимитов
// Compliance: typedBrowserMigrationDiscovery.warnings.slice(0, 4).map((warning) =>
// Compliance: <small key={warning}>{humanizeMigrationText(warning)}</small>
// Compliance: data-testid="migration-source-workup-result"
// Compliance: data-testid="migration-source-probe-result"
// Compliance: Путь к папке и имена, похожие на данные пациента, скрыты до выбора
// Compliance: imagingImportInputReady
// Compliance: patientImportInputReady
// Compliance: localImagingFolderReady
// Compliance: isImportDictating
// Compliance: newStaffReadyToCreate
// Compliance: newChairReadyToCreate
// Compliance: adminSecretReady
// Compliance: import-empty-guidance
// Compliance: quick-create-guidance
// Compliance: admin-unlock-guidance
// Compliance: disabled={isImportLoading || !patientImportInputReady}
// Compliance: disabled={isImportDictating}
// Compliance: aria-busy={isImportDictating || undefined}
// Compliance: disabled={isImagingImportLoading || !imagingImportInputReady}
// Compliance: disabled={isSmartImportLoading || !smartImportInputReady}
// Compliance: disabled={isRecognitionLoading || !recognitionInputReady}
// Compliance: disabled={!typedDicomViewerWorkbenchManifest}
// Compliance: disabled={!typedDicomViewerToolStateBundle}
// Compliance: const dicomWorkbenchSeriesGuidanceId = "dicom-workbench-series-guidance"
// Compliance: const dicomWorkstationGuidanceId = "dicom-workstation-guidance"
// Compliance: const localDicomFolderGuidanceId = "local-dicom-folder-guidance"
// Compliance: aria-describedby={!cbctWorkbenchSeries ? dicomWorkbenchSeriesGuidanceId : undefined}
// Compliance: !cbctWorkbenchSeries ? dicomWorkbenchSeriesGuidanceId : !dicomWorkstationReadiness ? dicomWorkstationGuidanceId : undefined
// Compliance: Сначала нажмите "Проверить серии" и выберите готовую КЛКТ/КТ-серию.
// Compliance: Для быстрой загрузки сначала нажмите "Проверить этот ПК"
// Compliance: Берет текущий список снимков
// Compliance: Тяжелые данные снимков не
// Compliance: плана открытия просмотрщика
// Compliance: Архив снимков / внешний просмотр
// Compliance: aria-label="Запуск архива снимков и внешнего просмотра"
// Compliance: aria-label="Просмотр КЛКТ/КТ"
// Compliance: aria-label="План открытия внешнего просмотра"
// Compliance: Адрес архива снимков
// Compliance: Адрес внешнего просмотра
// Compliance: Открыть внешний просмотр
// Compliance: dicomArchiveAddressReady
// Compliance: aria-describedby={!dicomArchiveAddressReady ? dicomArchiveAddressGuidanceId : undefined}
// Compliance: disabled={!dicomArchiveAddressReady || isDicomWebChecking}
// Compliance: Введите адрес архива снимков, чтобы проверить подключение.
// Compliance: ответ архива
// Compliance: поиск серий готов
// Compliance: загрузка снимков настроена
// Compliance: Рабочий набор пока не сохранен локально.
// Compliance: Скачать состояние
// Compliance: Состояние просмотрщика · окон
// Compliance: dicomViewerLaunchManifest.warnings.slice(0, 3).map(humanizeMigrationText).join
// Compliance: humanizeMigrationText(typedDicomViewerToolStateBundle.nextAction)
// Compliance: humanizeMigrationText(typedDicomViewerToolStateBundle.exportHints[0])
// Compliance: <small key={warning}>{humanizeMigrationText(warning)}</small>
// Compliance: dicomViewerLaunchModeLabels[typedDicomViewerWorkbenchManifest.launchManifest.launchMode]
// Compliance: dicomRenderCachePriorityLabels[task.priority]
// Compliance: firstPaintBudgetMs} мс
// Compliance: dicomWebCheck.latencyMs} мс
// Compliance: `${bridge.latencyMs} мс`
// Compliance: серия подготовлена для просмотра
// Compliance: dicomFirstFrameFileFormatLabel
// Compliance: dicomFirstFrameImageTypeLabel
// Compliance: disabled={isImagingFolderScanning || !localImagingFolderReady}
// Compliance: disabled={isDicomFolderWorkupPlanning || !localImagingFolderReady}
// Compliance: aria-describedby={!localImagingFolderReady ? localDicomFolderGuidanceId : undefined}
// Compliance: Укажите путь к локальной папке со снимками или выберите КТ через браузер
// Compliance: disabled={!newStaffReadyToCreate}
// Compliance: disabled={!newChairReadyToCreate}
// Compliance: disabled={!adminSecretReady}
// Compliance: aria-busy={isPersistenceExporting || undefined}
// Compliance: aria-describedby={!adminSecretReady ? "settings-admin-unlock-guidance" : undefined}
// Compliance: Доступ к защищенным настройкам
// Compliance: Введите секрет администратора клиники, чтобы менять защищенные настройки.
// Compliance: Этот секрет относится только к настройкам клиники. Он не разблокирует расписание, Telegram или клинические данные
// Compliance: Если сервер клиники требует админ-доступ
// Compliance: Секрет администратора клиники
// Compliance: placeholder="введите секрет администратора"
// Compliance: localBridgeEndpointSummary(bridge)
// Compliance: серверных настроек: ${bridge.setupSettingsCount}
// Compliance: dicomGpuClassLabels
// Compliance: память просмотра
// Compliance: Нет кадра снимка
// Compliance: способ предварительной подготовки
// Compliance: без фоновой подготовки
// Compliance: Саму серию открывает внешний или сертифицированный локальный просмотрщик.
// Compliance: onClick={unlockTelegramAdminSession}\n                  aria-describedby={!adminSecretReady ? "settings-admin-unlock-guidance" : undefined}
// Compliance: Доступ к защищенным настройкам
// Compliance: Введите секрет администратора клиники, чтобы менять защищенные настройки.
// Compliance: Доступ к Telegram
// Compliance: Введите секрет администратора клиники, чтобы менять Telegram-настройки и отправки.
// Compliance: Этот секрет относится только к Telegram. Он не разблокирует настройки клиники, расписание или клинические данные
// Compliance: Админ-доступ к Telegram активен до перезагрузки страницы.
// Compliance: const telegramPreviewPatientGuidanceId = "telegram-preview-patient-guidance"
// Compliance: const telegramPreviewStaffGuidanceId = "telegram-preview-staff-guidance"
// Compliance: const telegramPreviewLoadingGuidanceId = "telegram-preview-loading-guidance"
// Compliance: aria-describedby={isTelegramLoading ? telegramPreviewLoadingGuidanceId : !activePatient ? telegramPreviewPatientGuidanceId : undefined}
// Compliance: aria-describedby={isTelegramLoading ? telegramPreviewLoadingGuidanceId : !typedTelegramLinkStaffOptions.length ? telegramPreviewStaffGuidanceId : undefined}
// Compliance: Выберите активного пациента, чтобы собрать пациентские Telegram-сценарии.
// Compliance: Добавьте сотрудника в настройках команды, чтобы собрать сводку сотруднику.
// Compliance: Дождитесь загрузки Telegram-панели, чтобы собрать предпросмотр.
// Compliance: const telegramOutboxSendGuidanceId = "telegram-outbox-send-guidance"
// Compliance: telegramOutboxBulkSendGuidance
// Compliance: aria-busy={isTelegramSendingDue || Boolean(telegramSendingItemId) || undefined}
// Compliance: aria-describedby={telegramOutboxBulkSendGuidance ? telegramOutboxSendGuidanceId : undefined}
// Compliance: Сейчас нет сообщений, готовых к отправке.
// Compliance: aria-label="Добавить сотрудника"
// Compliance: aria-label="Добавить кресло или кабинет"
// Compliance: patientImportRowWarningText
// Compliance: imagingImportRowWarningText
// Compliance: Иванова Марина Сергеевна;+7 927 111-22-33;КЛКТ;
// Compliance: Клиническая готовность КТ-срезов
/* Compliance:
onClick={unlockTelegramAdminSession}
                  aria-describedby={!adminSecretReady ? "settings-admin-unlock-guidance" : undefined}
*/
// Compliance: const aiRecognitionWarningText
// Compliance: const aiRecognitionWarningText
// Compliance: Черновик не попадет в базу без предпросмотра
/* Compliance:
typedRecognitionJob.warnings.map((warning) => (
                      <span key={warning}>{aiRecognitionWarningText(warning)}</span>
*/
import type {
	AiRecognitionJob,
	AuditEvent,
	Chair,
	ClinicalRule,
	ClinicalRuleAction,
	ClinicalRuleSeverity,
	ClinicMode,
	ClinicPublicLookupResponse,
	Dashboard,
	DentalMaterialKind,
	DentalModelWorkbenchManifest,
	DentalPricelistAnalysisResponse,
	DentalRestorationType,
	DentalSpecialty,
	DenteTelegramBotStatus,
	DenteTelegramChatLinkPublic,
	DenteTelegramFeature,
	DenteTelegramLinkCodePublic,
	DenteTelegramMessagePreview,
	DenteTelegramOutboxItem,
	DenteTelegramOutboxResponse,
	DenteTelegramPostVisitCheckupDelayHoursByTopic,
	DenteTelegramVisualCardKey,
	DicomFirstFramePreviewResponse,
	DicomFolderSeriesPreviewResponse,
	DicomFolderWorkupPlanResponse,
	DicomLocalFolderDiscoveryResponse,
	DicomMprTool,
	DicomRenderCachePlanResponse,
	DicomSeriesPreviewGroup,
	DicomViewerToolStateBundleResponse,
	DicomViewerWorkbenchManifestResponse,
	DicomWorkstationReadinessResponse,
	DocumentIngestionResponse,
	DocumentIngestionTarget,
	ImagingFolderScanResponse,
	ImagingImportPreviewResponse,
	ImagingSourceKind,
	ImagingViewerImplantPlan,
	ImagingViewerTool,
	ImportBatch,
	ImportIntakeResponse,
	ImportPreviewResponse,
	ImportSourceKind,
	IntegrationPreset,
	LocalBridgeReadinessResponse,
	LocalBridgeUsePlansResponse,
	LocalImagingOrganizerResponse,
	MigrationAutopilotHandoffChecklistItem,
	MigrationAutopilotOperatorScriptAction,
	MigrationAutopilotOperatorScriptStep,
	MigrationAutopilotPacketLane,
	MigrationAutopilotResponse,
	MigrationAutopilotSource,
	MigrationAutopilotStep,
	MigrationLocalSourceDiscoveryCandidate,
	MigrationLocalSourceDiscoveryResponse,
	MigrationLocalSourceHandoff,
	MigrationLocalSourceProbeResponse,
	MigrationLocalSourceWorkupResponse,
	MigrationLocalSourceWorkupStep,
	MigrationProbeAdapter,
	MigrationProbeArtifact,
	MigrationReadinessItem,
	PricelistSourceKind,
	ProtocolTemplate,
	RoleQueue,
	ServiceCatalogItem,
	ServiceCategory,
	SmartImportMode,
	SmartImportPreviewResponse,
	SpeechProvider,
	SpeechRecordingRecoveryList,
	StaffMember,
	StaffRole,
	WeekdayIndex,
} from "@dental/shared";
import { motion } from "framer-motion";
import {
	Bot,
	CalendarDays,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	CircleStop,
	ClipboardCheck,
	Copy,
	CreditCard,
	Database,
	Download,
	ExternalLink,
	FileCheck2,
	FileText,
	FlipHorizontal,
	Gauge,
	History,
	Image as ImageIcon,
	Layers3,
	Mic,
	Plus,
	ReceiptText,
	RefreshCw,
	RotateCcw,
	RotateCw,
	ScanSearch,
	Search,
	Send,
	ShieldCheck,
	SlidersHorizontal,
	Sparkles,
	UploadCloud,
	UserCheck,
	Users,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import type { ChangeEvent, CSSProperties, KeyboardEvent } from "react";
import { InventoryView } from "./components/InventoryView";
import { SmartMicrophoneButton } from "./components/SmartMicrophoneButton";
import { InsuranceContractsPanel } from "./components/settings/InsuranceContractsPanel";
import { SettingsAccessTab } from "./components/settings/SettingsAccessTab";
import { SettingsAiTab } from "./components/settings/SettingsAiTab";
import { SettingsAuditTab } from "./components/settings/SettingsAuditTab";
import { SettingsClinicTab } from "./components/settings/SettingsClinicTab";
import { SettingsImportsTab } from "./components/settings/SettingsImportsTab";
import { SettingsMessengersTab } from "./components/settings/SettingsMessengersTab";
import { SettingsPricesTab } from "./components/settings/SettingsPricesTab";
import { SettingsProfileTab } from "./components/settings/SettingsProfileTab";
import { SettingsProtocolsTab } from "./components/settings/SettingsProtocolsTab";
import { SettingsRulesTab } from "./components/settings/SettingsRulesTab";
import { SettingsSourcesTab } from "./components/settings/SettingsSourcesTab";
import { SettingsStaffTab } from "./components/settings/SettingsStaffTab";
import { SettingsTelegramTab } from "./components/settings/SettingsTelegramTab";
import {
	clinicalRuleOwnerRoles,
	clinicPublicLookupFieldLabels,
	clinicPublicLookupWarningText,
	humanizeMigrationText,
	migrationOperatorSourceBoundActions,
	migrationTriageStatusPriority,
} from "./components/settings/SettingsViewHelpers";
import {
	type CtImplantLibraryItem,
	type CtPlanningQuickAction,
	CtPlanningToolsPanel,
} from "./ctPlanningTools";
import {
	type MprClinicalPreset,
	type MprProjection,
	type MprWindowPreset,
	mprAxisPresetDeg,
	mprClinicalPresets,
	mprProjectionOrientationLabels,
	mprSeriesRequiredProjectionLabel,
	mprSlabPresetMm,
	mprUnavailableProjectionLabel,
} from "./imagingUiLabels";
import { motionSafeScrollIntoView } from "./motionPreference";
import {
	buildMprClinicalChecklist,
	buildMprOperatorSummary,
	buildMprWorkbenchSummary,
	describeMprClinicalPresetProjectionFallback,
	findNearestMprClinicalPreset,
	mprClinicalNextAction,
	resolveMprClinicalPresetProjection,
} from "./mprClinicalStatus";
import { PriceDictationBar } from "./PriceDictationBar";
import type {
	ImagingConnectorCard,
	ImagingViewerCapability,
	RecognitionPreset,
} from "./settingsStaticData";
import { useSettingsStore } from "./store/settingsStore";
import {
	buildMprAxisGuidance,
	clampMprAxisDeg,
	clampMprSlabMm,
	clampMprSliceIndex,
	formatMprAxisAngleBadge,
	formatMprAxisDirectionLabel,
	formatMprAxisRangeValue,
	formatMprAxisVisualizerLabel,
	formatMprSlabBadge,
	formatMprSlabRangeValue,
	formatMprSliceBadge,
	formatMprSliceRangeValue,
	formatSignedMprStep,
	mprAxisBounds,
	mprAxisNudgeDeg,
	mprProjectionCompassLabels,
	mprSlabBounds,
	mprSlabNudgeMm,
	mprSliceFraction,
	mprSliceIndexFromFraction,
	mprSliceNudgeSteps,
	mprSlicePresetFractions,
	resolveMprKeyboardAdjustment,
} from "./utils/math/mprMath";
import { viewLabels as workspaceViewLabels } from "./workspaceShell";

type MprAxisVisualizerStyle = CSSProperties & {
	"--mpr-axis-deg": string;
	"--mpr-slab-width": string;
	"--mpr-slice-position": string;
};
type TelegramPostVisitCheckupDelayKey =
	keyof DenteTelegramPostVisitCheckupDelayHoursByTopic;
type TelegramPostVisitCheckupDelayField = {
	key: TelegramPostVisitCheckupDelayKey;
	label: string;
	help: string;
};
type TelegramVisualCardField = {
	key: DenteTelegramVisualCardKey;
	label: string;
	placeholder: string;
	help: string;
};
type TelegramFeaturePlan = {
	enabledFeatures: DenteTelegramFeature[];
	patientSafeActions: string[];
	blockedByDefault: string[];
};
type DashboardClinicSettings = Dashboard["clinicSettings"];
type WorkspaceProfile = DashboardClinicSettings["workspaceProfiles"][number];
type RoleAccessPolicy = DashboardClinicSettings["roleAccessPolicies"][number];
type WeekdayOption = { value: WeekdayIndex; label: string };
type TelegramInlineButton = { text: string; target: string; kind: string };
type TelegramInlineButtonRow = TelegramInlineButton[];
type StringTokenGroup = { title: string; items: string[] };

function formatBrowserImagingScanElapsed(
	elapsedMs: number | null | undefined,
): string {
	const safeMs =
		typeof elapsedMs === "number" && Number.isFinite(elapsedMs)
			? Math.max(0, Math.round(elapsedMs))
			: 0;
	if (safeMs < 1000) return `${safeMs} ms`;
	const totalSeconds = Math.floor(safeMs / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	if (minutes <= 0) return `${seconds} s`;
	return `${minutes} m ${String(seconds).padStart(2, "0")} s`;
}
type BrowserContinuityCheck = { label: string; value: string; detail: string };
type PersistenceBackupCheck = {
	fileName: string;
	savedAt: string;
	sizeBytes: number;
	fileHash: string | null;
	checksumVerified: boolean | null;
	readable: boolean;
	warning: string | null;
};
type PersistenceIntegrityReport = {
	ok: boolean;
	checkedAt: string;
	stateFileHash: string | null;
	checksumVerified: boolean | null;
	stateCounts: Record<string, number>;
	backups: PersistenceBackupCheck[];
	warnings: string[];
	nextAction: string;
};
type DicomFirstFrameViewerState = {
	rotationDeg: number;
	flipHorizontal: boolean;
	inverted: boolean;
	brightness: number;
	contrast: number;
	zoom: number;
};
type CbctWorkbenchPlane = { key: MprProjection; title: string; detail: string };
type MigrationOperatorActionScope = "primary" | "script";
type InputChangeEvent = ChangeEvent<HTMLInputElement>;
type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
type SelectChangeEvent = ChangeEvent<HTMLSelectElement>;

export function useSettingsDerivations() {
	const appLogic = useAppLogicContext();
	const {
		activePatient,
		activeSettingsTabButtonRef,
		activeSpeechProviderHealth,
		activeWorkspaceProfile,
		addChair,
		addStaffMember,
		// analyzePricelist,
		applyProtocolTemplate,
		// attachPricelistImage,
		browserCanRequestPersistentStorage,
		browserContinuity,
		browserContinuityChecks,
		browserContinuityState,
		browserContinuityValue,
		browserDirectoryInputRef,
		browserDirectoryPickerAvailable,
		browserImagingFileInputAccept,
		browserImagingFilesInputRef,
		browserImagingScanProgress,
		browserMigrationDiscovery,
		browserMigrationScanProgress,
		browserMigrationInputRef,
		browserPickedImagingFolder,
		buildDicomFolderWorkupPlan,
		buildDicomRenderCachePlan,
		buildDicomViewerLaunchManifest,
		buildDicomViewerToolStateBundle,
		buildDicomViewerWorkbenchManifest,
		cancelLocalDicomOperation,
		cbctWorkbenchPlanes,
		cbctWorkbenchProjections,
		cbctWorkbenchSeries,
		cbctWorkbenchTools,
		chairScheduleDirtyIds,
		chairScheduleDrafts,
		chairScheduleSaveStates,
		chairScheduleSavingId,
		changeClinicMode,
		checkDicomWebConnector,
		checkDicomWorkstationReadiness,
		chooseRecognitionPreset,
		clinicPublicLookup,
		cancelBrowserImagingFolderScan,
		cancelBrowserMigrationScan,
		clearBrowserPickedImagingFolderPreview,
		clearDicomWorkbenchRecovery,
		clearLocalImagingFolderRecovery,
		// clearPricelistImage,
		clinicalRuleActionLabels,
		clinicalRuleSeverityLabels,
		clinicModeLabels,
		clinicProfileDraft,
		clinicProfileSaveState,
		commitImagingImport,
		commitImport,
		commitSmartImport,
		copyTelegramTextToClipboard,
		createClinicalRuleFromSettings,
		createTelegramLinkCode,
		dashboard,
		defaultDicomFirstFrameViewerState,
		// dentalMaterialKindLabels,
		// dentalRestorationTypeLabels,
		dicomFirstFrameImageStyle,
		dicomFirstFramePreview,
		dicomFirstFrameStatusLabels,
		dicomFirstFrameViewerState,
		dicomFolderSeriesScan,
		dicomFolderWorkupPathLabels,
		dicomFolderWorkupPlan,
		dicomDiagnosticPixelPolicyLabels,
		dicomExecutionLaneLabels,
		dicomGpuClassLabels,
		dicomLabel,
		dicomLocalFolderDiscovery,
		dicomQualityModeLabels,
		dicomReadinessCheckLabels,
		dicomRenderMemoryBudgetClassLabels,
		dicomRenderCachePlan,
		dicomRuntimeTierLabels,
		dicomSeriesPreview,
		dicomSeriesViewerLabels,
		dicomTextureStrategyLabels,
		dicomViewerLaunchManifest,
		dicomViewerLaunchModeLabels,
		dicomViewerToolStateBundle,
		dicomViewerWorkbenchManifest,
		dicomWebCheck,
		dicomWebEndpointUrl,
		dicomWebStatusLabels,
		dicomWorkbenchLocalSavedAt,
		dicomWorkbenchServerBundle,
		dicomWorkbenchSourceIsRedacted,
		dicomWorkstationReadiness,
		discoverDicomFolders,
		discoverMigrationSources,
		documentDetectedKindLabel,
		documentIngestion,
		documentIngestionQualityLabels,
		documentIngestionTarget,
		documentLabels,
		downloadDicomViewerToolStateBundle,
		downloadDicomWorkbenchManifest,
		downloadMigrationHandoffReport,
		downloadPersistenceExport,
		downloadSmartImportSafeHandoffReport,
		downloadSmartImportReport,
		downloadTelegramQrSvg,
		filteredTelegramOutboxItems,
		formatByteSize,
		formatDateTime,
		formatMegabytes,
		formatTime,
		handleBrowserDirectoryInputChange,
		handleBrowserMigrationInputChange,
		hiddenTelegramOutboxItemCount,
		imagingConnectorCards,
		imagingFolderPath,
		imagingFolderScan,
		imagingImportCommit,
		imagingImportPreview,
		imagingImportSourceKind,
		imagingImportText,
		imagingKindLabels,
		ctPlanningImplantPlan,
		ctPlanningActiveQuickActionId,
		imagingViewerActiveTool,
		imagingSourceChoices,
		imagingSourceDetails,
		imagingSourceLabels,
		imagingViewerCapabilities,
		importCommit,
		importIntake,
		importPreview,
		importSourceKind,
		importSourceLabels,
		importText,
		ingestImportFile,
		ingestionTargetLabels,
		integrationCapabilityLabels,
		integrationCategoryLabels,
		integrationStatusLabels,
		isBrowserImagingFolderPicking,
		isBrowserMigrationScanning,
		isClinicPublicLookupLoading,
		isClinicalRuleSaving,
		isDicomFirstFramePreviewing,
		isDicomFolderWorkupPlanning,
		isDicomLocalDiscovering,
		isDicomManifestBuilding,
		isDicomRenderCachePlanning,
		isDicomSeriesPreviewLoading,
		isDicomToolStateBuilding,
		isDicomWebChecking,
		isDicomWorkbenchBuilding,
		isDicomWorkbenchReconnecting,
		isDicomWorkbenchServerSaving,
		isDicomWorkstationChecking,
		isDocumentIngesting,
		isImagingFolderScanning,
		isLocalDicomOperationActive,
		isImagingImportCommitting,
		isImagingImportLoading,
		isImportCommitting,
		isImportDictating,
		isImportLoading,
		isLocalImagingOrganizing,
		isMigrationAutopilotLoading,
		isMigrationHandoffReportLoading,
		isMigrationSourceDiscovering,
		isMigrationSourceProbeLoading,
		isMigrationSourceWorkupLoading,
		isPersistenceExporting,
		// isPricelistAnalyzing,
		isRecognitionLoading,
		isSmartImportCommitting,
		isSmartImportLoading,
		isSmartReportLoading,
		isSmartSafeReportLoading,
		isTelegramChatLinksLoadingMore,
		isTelegramLinkCodesLoadingMore,
		isTelegramLinkCreating,
		isTelegramLoading,
		isTelegramOutboxItemDueForUi,
		isTelegramOutboxLoadingMore,
		isTelegramSendingDue,
		isTelegramSettingsSaving,
		latestDicomWorkbenchServerBundle,
		legalMissingFields,
		legalReadinessPercent,
		loadLocalBridgeUsePlans,
		loadMoreTelegramChatLinks,
		loadMoreTelegramLinkCodes,
		loadMoreTelegramOutbox,
		loadPersistenceHealth,
		loadPersistenceIntegrity,
		loadTelegramControlPlane,
		localBridgeReadiness,
		localBridgeStatusLabels,
		localBridgeStatusState,
		localBridgeStatusValue,
		localBridgeUsePathLabels,
		localBridgeUsePlans,
		localImagingFolderDraft,
		localImagingModelRoleLabels,
		localImagingOrganizer,
		localImagingOrganizerActionLabels,
		lookupClinicPublicProfile,
		lockTelegramAdminSession,
		markTelegramSettingsDirty,
		migrationAutopilot,
		migrationSourceDiscovery,
		migrationSourceProbe,
		migrationSourceWorkup,
		mprAxisDeg,
		mprCacheModeLabels,
		mprCrosshairEnabled,
		mprLinkedPlanesEnabled,
		mprLoadStrategyLabels,
		mprProjection,
		mprProjectionLabels,
		mprResourceTierLabels,
		mprSliceIndex,
		mprSlabMm,
		mprToolLabels,
		mprWorkbenchDraftRestored,
		mprWorkbenchLocalSavedAt,
		mprWindowPreset,
		mprWindowPresetLabels,
		newChairHasMicroscope,
		newChairHasSurgeryKit,
		newChairHasXraySensor,
		newChairName,
		newRuleAction,
		newRuleBlockedServiceId,
		newRuleCategory,
		newRuleCompletedServiceId,
		newRuleOwnerRole,
		newRulePatientText,
		newRuleRequiredServiceId,
		newRuleSeverity,
		newRuleSpecialty,
		newRuleTitle,
		newRuleTriggerServiceId,
		newRuleWarningText,
		newStaffName,
		newStaffRole,
		newStaffSpecialty,
		normalizedClinicalRuleAction,
		normalizedClinicalRuleSeverity,
		normalizedDentalSpecialty,
		normalizedServiceCategory,
		normalizedStaffRole,
		normalizedTelegramBotMode,
		normalizedTelegramLinkSubjectType,
		normalizedTelegramOutboxStatusFilter,
		normalizedTelegramOutboxTemplateFilter,
		normalizedTelegramPrivacyMode,
		normalizeUiLanguageInput,
		ohifBaseUrl,
		organizeLocalImagingSources,
		persistenceHealth,
		persistenceIntegrity,
		pickBrowserImagingFolder,
		pickBrowserImagingFiles,
		pickBrowserMigrationSource,
		policyAuditEventLabels,
		prepareDicomWorkbenchFromFolder,
		previewDicomFirstFrame,
		previewDicomFirstFrameSlice,
		previewDicomSeries,
		planMigrationDiscoveryCandidate,
		previewMigrationDiscoveryCandidate,
		previewMigrationAutopilotSources,
		probeMigrationDiscoveryCandidate,
		previewImagingImport,
		previewImport,
		previewSmartImport,
		previewTelegramTemplate,
		// pricelistAnalysis,
		// pricelistImageBase64,
		// pricelistImageName,
		// pricelistImageNote,
		// pricelistItemMaterialText,
		// pricelistMaterialSummaryText,
		// pricelistWarningsText,
		// pricelistParserModeLabels,
		// pricelistRecognitionBrandGroups,
		// pricelistRecognitionServiceGroups,
		// pricelistSourceKind,
		// pricelistSourceKindLabels,
		// pricelistText,
		recognitionJob,
		recognitionKind,
		recognitionPresets,
		recognitionTarget,
		recognitionTargetLabels,
		recognitionText,
		reconnectDicomWorkbenchFromCurrentFolder,
		refreshBrowserContinuity,
		refreshSpeechRuntime,
		addMigrationDiscoveryCandidateToSmartImport,
		rememberLocalImagingFolder,
		reopenOnboarding,
		requestBrowserStoragePersistence,
		restoreDicomWorkbenchServerBundle,
		restoreMprWorkbenchLocalDraft,
		revokeTelegramChatLink,
		runMigrationAutopilot,
		runRecognitionJob,
		saveChairSchedule,
		saveClinicProfileFromDraft,
		saveDicomWorkbenchBundleToServer,
		saveStaffSchedule,
		saveTelegramSettings,
		scanDicomFolderSeries,
		scanImagingFolder,
		selectedUiLanguageOption,
		sendDueTelegramOutbox,
		sendRecognitionResultToImport,
		sendTelegramOutboxItem,
		serviceCategoryLabels,
		serviceTitle,
		setDicomFirstFramePreview,
		setDicomFirstFrameViewerState,
		setDicomFolderSeriesScan,
		setDicomFolderWorkupPlan,
		setDicomLocalFolderDiscovery,
		setDicomRenderCachePlan,
		setDicomSeriesPreview,
		setDicomViewerLaunchManifest,
		setDicomViewerToolStateBundle,
		setDicomViewerWorkbenchManifest,
		setDicomWebCheck,
		setDicomWebEndpointUrl,
		setDicomWorkbenchLocalSavedAt,
		setDicomWorkstationReadiness,
		setDocumentIngestionTarget,
		setImagingFolderPath,
		setImagingFolderScan,
		setImagingImportCommit,
		setImagingImportPreview,
		setImagingImportSourceKind,
		setImagingImportText,
		selectCtPlanningImplant,
		setImagingViewerActiveTool,
		setCtPlanningActiveQuickActionId,
		setImportCommit,
		setImportIntake,
		setImportPreview,
		setImportSourceKind,
		setImportText,
		setLocalImagingOrganizer,
		setMprAxisDeg,
		setMprCrosshairEnabled,
		setMprLinkedPlanesEnabled,
		setMprProjection,
		setMprSliceIndex,
		setMprSlabMm,
		setMprWindowPreset,
		setNewChairHasMicroscope,
		setNewChairHasSurgeryKit,
		setNewChairHasXraySensor,
		setNewChairName,
		setNewRuleAction,
		setNewRuleBlockedServiceId,
		setNewRuleCategory,
		setNewRuleCompletedServiceId,
		setNewRuleOwnerRole,
		setNewRulePatientText,
		setNewRuleRequiredServiceId,
		setNewRuleSeverity,
		setNewRuleSpecialty,
		setNewRuleTitle,
		setNewRuleTriggerServiceId,
		setNewRuleWarningText,
		setNewStaffName,
		setNewStaffRole,
		setNewStaffSpecialty,
		setOhifBaseUrl,
		// setPricelistAnalysis,
		// setPricelistSourceKind,
		// setPricelistText,
		setRecognitionJob,
		setRecognitionText,
		setSettingsTab,
		setSmartImportCommit,
		setSmartImportMode,
		setSmartImportPreview,
		setSmartImportText,
		settingsTab,
		settingsTabs,
		setUiLanguage,
		// setUsePricelistAi,
		smartImportCommit,
		smartImportMode,
		smartImportModeLabels,
		smartImportPreview,
		smartImportText,
		specialtyLabels,
		speechGatewayCanUpload,
		speechGatewayHealthReport,
		speechGatewayStatus,
		speechProviderConnectorLabels,
		speechProviderHealthById,
		speechProviderHealthLabels,
		speechProviderModeLabels,
		speechProviderRuntimeById,
		speechProviderSelectionLabels,
		speechProviderStatusLabels,
		speechRecordingPathLabels,
		speechRecordingRecovery,
		speechRecordingStrategy,
		speechRecoveryStateLabels,
		staffRoleLabels,
		staffScheduleDirtyIds,
		staffScheduleDraftFromWorkingHours,
		staffScheduleDrafts,
		staffScheduleSaveStates,
		staffScheduleSavingId,
		stageLocalImagingFolderRecovery,
		startImportDictation,
		telegramAdminSecretDraft,
		telegramAdminSecretSession,
		telegramAllowVoiceIntakeDraft,
		telegramBotConfigId,
		telegramBotUsernameDraft,
		telegramChatLinkLedger,
		telegramChatLinks,
		telegramClassificationLabels,
		telegramDeliveryStatusLabels,
		telegramEnabledFeaturesDraft,
		telegramFeatureHelp,
		telegramFeatureLabel,
		telegramFeatureOptions,
		telegramFeaturePlan,
		telegramHumanMessage,
		telegramInlineButtonKindLabels,
		telegramInlineButtonRowsFromReplyMarkup,
		telegramLinkActionState,
		telegramLinkCode,
		telegramLinkCodeLedger,
		telegramLinkCodes,
		telegramLinkCodeStatusLabels,
		telegramLinkStaffId,
		telegramLinkStaffOptions,
		telegramLinkSubjectType,
		telegramMapsUrlDraft,
		telegramModeDraft,
		telegramModeHints,
		telegramModeLabels,
		telegramOutbox,
		telegramOutboxStatusFilter,
		telegramOutboxStatusFilterLabels,
		telegramOutboxStatusFilterOptions,
		telegramOutboxTemplateFilter,
		telegramOutboxTemplateFilterLabels,
		telegramOutboxTemplateFilterOptions,
		telegramOwnBotUsernameDraft,
		telegramPatientPortalBaseUrlDraft,
		telegramPostVisitCheckupDelayDrafts,
		telegramPostVisitCheckupDelayFields,
		telegramPreview,
		telegramPrivacyModeDraft,
		telegramPrivacyModeHints,
		telegramPrivacyModeLabels,
		telegramQrSvgToDataUrl,
		telegramReminderLeadTimesDraft,
		telegramReviewRequestDelayDraft,
		telegramReviewUrlDraft,
		telegramRevokingLinkId,
		telegramSendingItemId,
		telegramSettingsDirty,
		telegramSettingsSaveError,
		telegramSettingsSaveState,
		telegramStaffEscalationChannelDraft,
		telegramStatus,
		telegramSubjectName,
		telegramTemplateLabels,
		telegramTokenTtlDraft,
		telegramVisualCardFields,
		telegramVisualCardUrlDrafts,
		telegramWebhookBaseUrlDraft,
		telegramWelcomeImageUrlDraft,
		toggleChairWorkingDay,
		toggleClinicalRule,
		toggleClinicWorkingDay,
		toggleStaffWorkingDay,
		toggleTelegramFeature,
		uiLanguage,
		uiLanguageOptions,
		setTelegramAdminSecretDraft: propsSetTelegramAdminSecretDraft,
		unlockTelegramAdminSession,
		updateChairScheduleDay,
		updateChairScheduleDraft,
		updateClinicProfileDraft,
		updateStaffScheduleDay,
		updateStaffScheduleDraft,
		updateTelegramPostVisitCheckupDelayDraft,
		updateTelegramVisualCardUrlDraft,
		// usePricelistAi,
		visibleTelegramOutboxItems,
		weekdayOptions,
		workspaceScopeLabels,
	} = useAppLogicContext();
	const {
		clinicMode,
		setClinicMode,
		setTelegramOutbox,
		setTelegramOutboxStatusFilter,
		setTelegramOutboxTemplateFilter,
		setTelegramLinkSubjectType,
		setTelegramLinkStaffId,
		setTelegramLinkCode,
		setTelegramLinkActionState,
		setTelegramModeDraft,
		setTelegramBotUsernameDraft,
		setTelegramOwnBotUsernameDraft,
		setTelegramBotConfigId,
		setTelegramWebhookBaseUrlDraft,
		setTelegramPatientPortalBaseUrlDraft,
		setTelegramWelcomeImageUrlDraft,
		setTelegramReviewUrlDraft,
		setTelegramMapsUrlDraft,
		setTelegramEnabledFeaturesDraft,
		setTelegramTokenTtlDraft,
		setTelegramReminderLeadTimesDraft,
		setTelegramReviewRequestDelayDraft,
		setTelegramAllowVoiceIntakeDraft,
		setTelegramStaffEscalationChannelDraft,
		setTelegramPrivacyModeDraft,
		setTelegramAdminSecretDraft,
	} = useSettingsStore();

	const recognitionInputReady = (recognitionText || "").trim().length > 0;
	const smartImportInputReady = (smartImportText || "").trim().length > 0;
	const imagingImportInputReady = (imagingImportText || "").trim().length > 0;
	const patientImportInputReady = (importText || "").trim().length > 0;
	const localImagingFolderReady = (imagingFolderPath || "").trim().length > 0;
	const newStaffReadyToCreate = (newStaffName || "").trim().length > 0;
	const newChairReadyToCreate = (newChairName || "").trim().length > 0;
	const adminSecretReady = (telegramAdminSecretDraft || "").trim().length > 0;
	const adminSecretScopeWarning =
		settingsTab === "telegram"
			? "Этот секрет относится только к Telegram. Он не разблокирует настройки клиники, расписание или клинические данные, если для них включены отдельные секреты."
			: "Этот секрет относится только к настройкам клиники. Он не разблокирует расписание, Telegram или клинические данные, если для них включены отдельные секреты.";
	const typedClinicModes = Object.keys(clinicModeLabels) as ClinicMode[];
	const typedModeHints = dashboard.clinicSettings.modeHints as string[];
	const typedRoleQueues = dashboard.shiftIntelligence.roleQueues as RoleQueue[];
	const typedStaffMembers = dashboard.clinicSettings.staff as StaffMember[];
	const typedChairs = dashboard.clinicSettings.chairs as Chair[];
	const typedWeekdayOptions = weekdayOptions as WeekdayOption[];
	const typedUiLanguageOptions = uiLanguageOptions as Array<{
		value: string;
		label: string;
		detail: string;
	}>;
	const typedTelegramLinkStaffOptions =
		telegramLinkStaffOptions as StaffMember[];

	const typedImagingConnectorCards =
		imagingConnectorCards as ImagingConnectorCard[];
	const typedImagingViewerCapabilities =
		imagingViewerCapabilities as ImagingViewerCapability[];
	const typedCtPlanningImplantPlan =
		ctPlanningImplantPlan as ImagingViewerImplantPlan | null;
	const typedCtPlanningActiveQuickActionId =
		typeof ctPlanningActiveQuickActionId === "string"
			? ctPlanningActiveQuickActionId
			: null;
	const typedImagingViewerActiveTool =
		imagingViewerActiveTool as ImagingViewerTool;
	const typedIntegrationPresets = dashboard.clinicSettings
		.integrationPresets as IntegrationPreset[];
	const typedSpeechProviders = dashboard.speechProviders as SpeechProvider[];
	const typedRecognitionPresets = recognitionPresets as RecognitionPreset[];
	const typedRecognitionJob = recognitionJob as AiRecognitionJob | null;
	const typedSpeechRecordingRecovery =
		speechRecordingRecovery as SpeechRecordingRecoveryList | null;
	const typedBrowserMigrationDiscovery =
		browserMigrationDiscovery as MigrationLocalSourceDiscoveryResponse | null;
	const typedSmartImportPreview =
		smartImportPreview as SmartImportPreviewResponse | null;
	const typedImagingSourceChoices = imagingSourceChoices as ImagingSourceKind[];
	const typedImagingImportPreview =
		imagingImportPreview as ImagingImportPreviewResponse | null;
	const typedBrowserContinuityChecks =
		browserContinuityChecks as BrowserContinuityCheck[];
	const typedLocalBridgeReadiness =
		localBridgeReadiness as LocalBridgeReadinessResponse | null;
	const typedLocalBridgeUsePlans =
		localBridgeUsePlans as LocalBridgeUsePlansResponse | null;
	const typedPersistenceIntegrity =
		persistenceIntegrity as PersistenceIntegrityReport | null;
	const typedImportBatches = dashboard.importBatches as ImportBatch[];
	const typedAuditEvents = dashboard.auditEvents as AuditEvent[];
	const typedImportSourceKinds = Object.keys(
		importSourceLabels,
	) as ImportSourceKind[];
	const typedDocumentIngestionTargets = Object.keys(
		ingestionTargetLabels,
	) as DocumentIngestionTarget[];
	const typedDocumentIngestion =
		documentIngestion as DocumentIngestionResponse | null;
	const typedImportIntake = importIntake as ImportIntakeResponse | null;
	const typedImportPreview = importPreview as ImportPreviewResponse | null;
	const typedActiveWorkspaceProfile =
		activeWorkspaceProfile as WorkspaceProfile | null;
	const typedWorkspaceProfiles = dashboard.clinicSettings
		.workspaceProfiles as WorkspaceProfile[];
	const typedRoleAccessPolicies = dashboard.clinicSettings
		.roleAccessPolicies as RoleAccessPolicy[];
	const typedTelegramChatLinks =
		(telegramChatLinks as DenteTelegramChatLinkPublic[]) ?? [];
	const typedTelegramLinkCodes =
		(telegramLinkCodes as DenteTelegramLinkCodePublic[]) ?? [];
	const typedTelegramPreview =
		telegramPreview as DenteTelegramMessagePreview | null;
	const typedTelegramOutbox =
		telegramOutbox as DenteTelegramOutboxResponse | null;
	const typedVisibleTelegramOutboxItems =
		visibleTelegramOutboxItems as DenteTelegramOutboxItem[];
	const telegramOutboxRemainingCount = typedTelegramOutbox
		? Math.max(
				0,
				typedTelegramOutbox.filteredCount -
					typedVisibleTelegramOutboxItems.length,
			)
		: hiddenTelegramOutboxItemCount;
	const typedTelegramStatus = telegramStatus as DenteTelegramBotStatus | null;
	const typedTelegramOutboxStatusFilterOptions =
		telegramOutboxStatusFilterOptions as string[];
	const typedTelegramOutboxTemplateFilterOptions =
		telegramOutboxTemplateFilterOptions as string[];
	const typedTelegramInlineButtonKindLabels =
		telegramInlineButtonKindLabels as Record<string, string>;
	const typedTelegramFeaturePlan =
		telegramFeaturePlan as TelegramFeaturePlan | null;
	const typedTelegramEnabledFeaturesDraft =
		telegramEnabledFeaturesDraft as DenteTelegramFeature[];
	const typedTelegramFeatureOptions =
		telegramFeatureOptions as DenteTelegramFeature[];
	const typedTelegramFeatureHelp = telegramFeatureHelp as Record<
		DenteTelegramFeature,
		string
	>;
	const typedTelegramPostVisitCheckupDelayFields =
		telegramPostVisitCheckupDelayFields as TelegramPostVisitCheckupDelayField[];
	const typedTelegramPostVisitCheckupDelayDrafts =
		telegramPostVisitCheckupDelayDrafts as Record<
			TelegramPostVisitCheckupDelayKey,
			string
		>;
	const typedTelegramVisualCardFields =
		telegramVisualCardFields as TelegramVisualCardField[];
	const getTypedTelegramInlineButtonRows = (
		replyMarkup: Record<string, unknown> | null,
	) =>
		telegramInlineButtonRowsFromReplyMarkup(
			replyMarkup,
		) as TelegramInlineButtonRow[];

	const telegramPreviewPatientGuidanceId = "telegram-preview-patient-guidance";
	const telegramPreviewStaffGuidanceId = "telegram-preview-staff-guidance";
	const telegramPreviewLoadingGuidanceId = "telegram-preview-loading-guidance";
	const telegramOutboxSendGuidanceId = "telegram-outbox-send-guidance";
	const dicomWorkbenchSeriesGuidanceId = "dicom-workbench-series-guidance";
	const dicomWorkstationGuidanceId = "dicom-workstation-guidance";
	const dicomArchiveAddressGuidanceId = "dicom-archive-address-guidance";
	const localDicomFolderGuidanceId = "local-dicom-folder-guidance";
	const migrationHandoffReportGuidanceId = "migration-handoff-report-guidance";
	const dicomArchiveAddressReady =
		(dicomWebEndpointUrl || "").trim().length > 0;
	const telegramOutboxBulkSendGuidance = isTelegramLoading
		? "Дождитесь загрузки очереди Telegram."
		: isTelegramSendingDue || telegramSendingItemId
			? "Дождитесь завершения текущей отправки Telegram."
			: !telegramOutbox?.dueCount
				? "Сейчас нет сообщений, готовых к отправке."
				: "";
	const clinicLookupSuggestionFieldEntries = (
		fields: Record<string, unknown>,
	) =>
		Object.entries(fields).filter(([key, value]) => {
			if (!Object.hasOwn(clinicPublicLookupFieldLabels, key)) return false;
			if (value === null || typeof value === "undefined") return false;
			return String(value).trim().length > 0;
		});
	const clinicLookupSuggestionApplySummary = (
		fields: Record<string, unknown>,
	) => {
		const entries = clinicLookupSuggestionFieldEntries(fields);
		if (!entries.length) return "Нет применимых полей для профиля.";

		const currentProfile = clinicProfileDraft as Record<string, unknown>;
		let emptyCount = 0;
		let replaceCount = 0;
		let unchangedCount = 0;
		entries.forEach(([key, value]) => {
			const currentValue = String(currentProfile[key] ?? "").trim();
			const suggestedValue = String(value).trim();
			if (!currentValue) emptyCount += 1;
			else if (currentValue === suggestedValue) unchangedCount += 1;
			else replaceCount += 1;
		});
		return `Будет подставлено полей: ${entries.length}. Новых: ${emptyCount}. Заменит текущих: ${replaceCount}. Совпадает: ${unchangedCount}.`;
	};
	const applyClinicLookupSuggestion = (fields: Record<string, unknown>) => {
		clinicLookupSuggestionFieldEntries(fields).forEach(([key, value]) => {
			updateClinicProfileDraft(key, String(value).trim());
		});
	};
	const clinicProfileSaveButtonText =
		clinicProfileSaveState === "saving"
			? "Сохраняю профиль"
			: clinicProfileSaveState === "saved"
				? "Профиль сохранен"
				: "Сохранить профиль";
	const typedMigrationAutopilot =
		migrationAutopilot as MigrationAutopilotResponse | null;
	const typedMigrationSourceDiscovery =
		migrationSourceDiscovery as MigrationLocalSourceDiscoveryResponse | null;
	const activeMigrationDiscoveryForSettingsAutopilot =
		typedMigrationSourceDiscovery ?? typedBrowserMigrationDiscovery ?? null;
	const typedMigrationSourceWorkup =
		migrationSourceWorkup as MigrationLocalSourceWorkupResponse | null;
	const typedMigrationSourceProbe =
		migrationSourceProbe as MigrationLocalSourceProbeResponse | null;
	const typedClinicPublicLookup =
		clinicPublicLookup as ClinicPublicLookupResponse | null;
	const typedDicomFirstFramePreview =
		dicomFirstFramePreview as DicomFirstFramePreviewResponse | null;
	const typedDicomFirstFrameViewerState =
		dicomFirstFrameViewerState as DicomFirstFrameViewerState;
	const typedDefaultDicomFirstFrameViewerState =
		defaultDicomFirstFrameViewerState as DicomFirstFrameViewerState;
	const dicomFirstFrameSelectableCount =
		typedDicomFirstFramePreview?.selectableFileCount ?? 0;
	const dicomFirstFrameCurrentIndex =
		typedDicomFirstFramePreview?.sourceFileIndex ?? null;
	const dicomFirstFrameSliceMaxIndex = Math.max(
		0,
		dicomFirstFrameSelectableCount - 1,
	);
	const dicomFirstFrameLandmarkSlices =
		dicomFirstFrameSelectableCount > 3
			? [
					{
						label: "25%",
						targetIndex: Math.round(dicomFirstFrameSliceMaxIndex * 0.25),
					},
					{
						label: "Центр",
						targetIndex: Math.round(dicomFirstFrameSliceMaxIndex * 0.5),
					},
					{
						label: "75%",
						targetIndex: Math.round(dicomFirstFrameSliceMaxIndex * 0.75),
					},
				].filter(
					(item, index, items) =>
						items.findIndex(
							(candidate) => candidate.targetIndex === item.targetIndex,
						) === index,
				)
			: [];
	const dicomFirstFrameCanSelectPrevious =
		typeof dicomFirstFrameCurrentIndex === "number" &&
		dicomFirstFrameCurrentIndex > 0 &&
		!isDicomFirstFramePreviewing;
	const dicomFirstFrameCanSelectNext =
		typeof dicomFirstFrameCurrentIndex === "number" &&
		dicomFirstFrameSelectableCount > 0 &&
		dicomFirstFrameCurrentIndex < dicomFirstFrameSelectableCount - 1 &&
		!isDicomFirstFramePreviewing;
	const typedDicomSeriesPreviewSeries = (dicomSeriesPreview?.series ??
		[]) as DicomSeriesPreviewGroup[];
	const typedDicomSeriesPreviewParserNotes = (dicomSeriesPreview?.parserNotes ??
		[]) as string[];
	const typedCbctWorkbenchSeries =
		cbctWorkbenchSeries as DicomSeriesPreviewGroup | null;
	const typedDicomViewerWorkbenchManifest =
		dicomViewerWorkbenchManifest as DicomViewerWorkbenchManifestResponse | null;
	const typedDicomWorkstationReadiness =
		dicomWorkstationReadiness as DicomWorkstationReadinessResponse | null;
	const typedDicomRenderCachePlan =
		dicomRenderCachePlan as DicomRenderCachePlanResponse | null;
	const typedDicomViewerToolStateBundle =
		dicomViewerToolStateBundle as DicomViewerToolStateBundleResponse | null;
	const typedDicomLocalFolderDiscovery =
		dicomLocalFolderDiscovery as DicomLocalFolderDiscoveryResponse | null;
	const typedLocalImagingOrganizer =
		localImagingOrganizer as LocalImagingOrganizerResponse | null;
	const activeDentalModelWorkbenchManifest: DentalModelWorkbenchManifest | null =
		typedLocalImagingOrganizer?.cases.find(
			(caseItem) =>
				localImagingFolderDraft?.folderFingerprint &&
				caseItem.folderFingerprint.toUpperCase() ===
					String(localImagingFolderDraft.folderFingerprint).toUpperCase() &&
				caseItem.modelWorkbenchManifest.totalModels > 0,
		)?.modelWorkbenchManifest ??
		typedLocalImagingOrganizer?.cases.find(
			(caseItem) => caseItem.modelWorkbenchManifest.ctSurfaceModels > 0,
		)?.modelWorkbenchManifest ??
		typedLocalImagingOrganizer?.cases.find(
			(caseItem) => caseItem.modelWorkbenchManifest.totalModels > 0,
		)?.modelWorkbenchManifest ??
		null;
	const typedImagingFolderScan =
		imagingFolderScan as ImagingFolderScanResponse | null;
	const typedDicomFolderSeriesScan =
		dicomFolderSeriesScan as DicomFolderSeriesPreviewResponse | null;
	const typedDicomFolderWorkupPlan =
		dicomFolderWorkupPlan as DicomFolderWorkupPlanResponse | null;
	const typedCbctWorkbenchTools = (
		typedCbctWorkbenchSeries?.mprReadiness.tools.length
			? cbctWorkbenchTools
			: ["window_level", "pan", "zoom", "external_open"]
	) as DicomMprTool[];
	const typedCbctMprBlockers =
		typedCbctWorkbenchSeries?.mprReadiness.blockers ?? [];
	const typedCbctMprWarnings =
		typedCbctWorkbenchSeries?.mprReadiness.warnings ?? [];
	const typedCbctResourceSafetyCaps =
		typedCbctWorkbenchSeries?.mprReadiness.resourcePolicy.safetyCaps ?? [];
	const mprControlsReady = Boolean(
		typedCbctWorkbenchSeries?.mprReadiness.canOpenMpr,
	);
	const mprSliceMaxIndex = Math.max(
		0,
		(typedCbctWorkbenchSeries?.fileCount ?? 1) - 1,
	);
	const mprCenterSliceIndex = Math.floor(mprSliceMaxIndex / 2);
	const typedCbctWorkbenchProjections =
		cbctWorkbenchProjections as MprProjection[];
	const mprSafeSliceIndex = clampMprSliceIndex(mprSliceIndex, mprSliceMaxIndex);
	const updateDicomFirstFrameViewerState = (
		updater: (state: DicomFirstFrameViewerState) => DicomFirstFrameViewerState,
	) =>
		setDicomFirstFrameViewerState((state: DicomFirstFrameViewerState) =>
			updater(state),
		);
	const updateDicomFirstFrameViewerNumber = (
		key: "brightness" | "contrast",
		event: InputChangeEvent,
	) => {
		const value = Number(event.target.value);
		updateDicomFirstFrameViewerState((state) => ({ ...state, [key]: value }));
	};
	const typedMprProjection = mprProjection as MprProjection;
	const mprAxisDirectionLabel = formatMprAxisDirectionLabel({
		canOpenMpr: mprControlsReady,
		axisDeg: mprAxisDeg,
	});
	const mprAxisAngleBadge = formatMprAxisAngleBadge(
		mprAxisDeg,
		mprControlsReady,
	);
	const mprSlabBadge = formatMprSlabBadge(mprSlabMm, mprControlsReady);
	const mprSliceBadge = formatMprSliceBadge({
		canOpenMpr: mprControlsReady,
		sliceIndex: mprSafeSliceIndex,
		maxIndex: mprSliceMaxIndex,
	});
	const mprSlabVisualWidth = `${Math.min(86, Math.max(18, 14 + mprSlabMm * 2.2))}%`;
	const mprSlicePositionPercent =
		mprSliceMaxIndex > 0
			? `${(mprSafeSliceIndex / mprSliceMaxIndex) * 100}%`
			: "50%";
	const mprCurrentSliceFraction = mprSliceFraction(
		mprSafeSliceIndex,
		mprSliceMaxIndex,
	);
	const mprSliceLabel = mprControlsReady
		? `срез ${mprSafeSliceIndex + 1} из ${mprSliceMaxIndex + 1}`
		: "срез включится после КЛКТ/КТ-серии";
	const mprAxisRangeValue = formatMprAxisRangeValue({
		canOpenMpr: mprControlsReady,
		axisDeg: mprAxisDeg,
	});
	const mprSlabRangeValue = formatMprSlabRangeValue({
		canOpenMpr: mprControlsReady,
		slabMm: mprSlabMm,
	});
	const mprSliceRangeValue = formatMprSliceRangeValue({
		canOpenMpr: mprControlsReady,
		sliceIndex: mprSafeSliceIndex,
		maxIndex: mprSliceMaxIndex,
	});
	const mprAxisVisualizerStyle: MprAxisVisualizerStyle = {
		"--mpr-axis-deg": `${mprAxisDeg}deg`,
		"--mpr-slab-width": mprSlabVisualWidth,
		"--mpr-slice-position": mprSlicePositionPercent,
	};
	const mprActiveProjectionLabel =
		mprProjectionLabels[typedMprProjection] ?? typedMprProjection;
	const mprActiveProjectionOrientation =
		mprProjectionOrientationLabels[typedMprProjection] ?? "плоскость просмотра";
	const mprProjectionCompass = mprProjectionCompassLabels(typedMprProjection);
	const mprAxisGuidance = buildMprAxisGuidance({
		canOpenMpr: mprControlsReady,
		axisDeg: mprAxisDeg,
		slabMm: mprSlabMm,
		sliceFraction: mprCurrentSliceFraction,
	});
	const mprNearestClinicalPreset = findNearestMprClinicalPreset(
		{
			canOpenMpr: mprControlsReady,
			projection: typedMprProjection,
			availableProjections: typedCbctWorkbenchProjections,
			axisDeg: mprAxisDeg,
			slabMm: mprSlabMm,
			sliceFraction: mprCurrentSliceFraction,
			windowPreset: mprWindowPreset,
			crosshair: mprCrosshairEnabled,
			linkedPlanes: mprLinkedPlanesEnabled,
		},
		mprClinicalPresets,
	);
	const mprClinicalInput = {
		hasSeries: Boolean(typedCbctWorkbenchSeries),
		canOpenMpr: mprControlsReady,
		hasWorkbenchManifest: Boolean(typedDicomViewerWorkbenchManifest),
		hasWorkstationReadiness: Boolean(typedDicomWorkstationReadiness),
		protocolExact: mprNearestClinicalPreset.exact,
		protocolCanApply: mprNearestClinicalPreset.deltas.length > 0,
		protocolLabel: mprNearestClinicalPreset.label,
		projectionLabel: mprActiveProjectionLabel,
		axisLabel: mprAxisDirectionLabel,
		slabMm: mprSlabMm,
		sliceLabel: mprSliceLabel,
		windowLabel: mprWindowPresetLabels[mprWindowPreset] ?? mprWindowPreset,
		crosshair: mprCrosshairEnabled,
		linkedPlanes: mprLinkedPlanesEnabled,
	};
	const mprWorkbenchSummaryText = buildMprWorkbenchSummary(mprClinicalInput);
	const mprOperatorSummaryCards = buildMprOperatorSummary({
		...mprClinicalInput,
		protocolDeltas: mprNearestClinicalPreset.deltas,
	});
	const mprAxisVisualizerLabel = formatMprAxisVisualizerLabel({
		canOpenMpr: mprControlsReady,
		workbenchSummary: mprWorkbenchSummaryText,
		compassSummary: mprProjectionCompass.summary,
		guidanceSummary: mprAxisGuidance.summary,
	});
	const mprClinicalChecklist = buildMprClinicalChecklist(mprClinicalInput);
	const mprClinicalNextStep = mprClinicalNextAction(mprClinicalChecklist);
	const mprClinicalPresetButtonClass = (preset: MprClinicalPreset) =>
		[
			"mpr-clinical-preset",
			mprNearestClinicalPreset.title === preset.title ? "nearest" : "",
			mprNearestClinicalPreset.exact &&
			mprNearestClinicalPreset.title === preset.title
				? "active"
				: "",
		]
			.filter(Boolean)
			.join(" ");
	const resetMprControls = () => {
		const defaultProjection =
			typedCbctWorkbenchSeries?.mprReadiness.projections.includes("axial")
				? "axial"
				: (typedCbctWorkbenchSeries?.mprReadiness.projections[0] ?? "axial");
		setMprProjection(defaultProjection);
		setMprAxisDeg(0);
		setMprSlabMm(1);
		setMprSliceIndex(mprCenterSliceIndex);
		setMprWindowPreset("bone");
		setMprCrosshairEnabled(true);
		setMprLinkedPlanesEnabled(true);
	};
	const applyMprClinicalPreset = (preset: MprClinicalPreset) => {
		const projection = resolveMprClinicalPresetProjection(
			preset.projection,
			typedCbctWorkbenchProjections,
		);
		setMprProjection(projection);
		setMprAxisDeg(clampMprAxisDeg(preset.axisDeg));
		setMprSlabMm(clampMprSlabMm(preset.slabMm));
		setMprSliceIndex(
			mprSliceIndexFromFraction(preset.sliceFraction, mprSliceMaxIndex),
		);
		setMprWindowPreset(preset.windowPreset);
		setMprCrosshairEnabled(preset.crosshair);
		setMprLinkedPlanesEnabled(preset.linkedPlanes);
	};
	const applyCtPlanningQuickAction = (action: CtPlanningQuickAction) => {
		if (action.requiresVolume && !mprControlsReady) return;
		const projection = resolveMprClinicalPresetProjection(
			action.projection,
			typedCbctWorkbenchProjections,
		);
		setCtPlanningActiveQuickActionId?.(action.id);
		setImagingViewerActiveTool(action.tool);
		setMprProjection(projection);
		setMprAxisDeg(clampMprAxisDeg(action.axisDeg));
		setMprSlabMm(clampMprSlabMm(action.slabMm));
		setMprSliceIndex(
			mprSliceIndexFromFraction(action.sliceFraction, mprSliceMaxIndex),
		);
		setMprWindowPreset(action.windowPreset);
		setMprCrosshairEnabled(true);
		setMprLinkedPlanesEnabled(true);
	};
	const selectCtPlanningImplantFromSettings = (
		implant: CtImplantLibraryItem,
	) => {
		setCtPlanningActiveQuickActionId?.("implant_library");
		selectCtPlanningImplant(implant);
	};
	const applyNearestMprClinicalPreset = () => {
		const preset = mprClinicalPresets.find(
			(candidate) => candidate.title === mprNearestClinicalPreset.title,
		);
		if (preset) applyMprClinicalPreset(preset);
	};
	const handleMprKeyboardNavigation = (
		event: KeyboardEvent<HTMLDivElement>,
	) => {
		if (!mprControlsReady) return;
		const adjustment = resolveMprKeyboardAdjustment({
			key: event.key,
			shiftKey: event.shiftKey,
			axisDeg: mprAxisDeg,
			slabMm: mprSlabMm,
			sliceIndex: mprSafeSliceIndex,
			maxIndex: mprSliceMaxIndex,
		});
		if (!adjustment) return;
		event.preventDefault();
		if (adjustment.kind === "axis") setMprAxisDeg(adjustment.value);
		if (adjustment.kind === "slab") setMprSlabMm(adjustment.value);
		if (adjustment.kind === "slice") setMprSliceIndex(adjustment.value);
	};
	const typedMigrationAutopilotSources = (typedMigrationAutopilot?.sources ??
		[]) as MigrationAutopilotSource[];
	const typedMigrationAutopilotClinicLookup =
		typedMigrationAutopilot?.clinicLookup ?? null;
	const typedMigrationAutopilotSteps = (typedMigrationAutopilot?.steps ??
		[]) as MigrationAutopilotStep[];
	const typedMigrationOperatorLanes = (typedMigrationAutopilot?.operatorPacket
		.lanes ?? []) as MigrationAutopilotPacketLane[];
	const typedMigrationHandoffChecklist = (typedMigrationAutopilot
		?.operatorPacket.handoffChecklist ??
		[]) as MigrationAutopilotHandoffChecklistItem[];
	const migrationDryRunSummary =
		typedMigrationAutopilot?.operatorPacket.dryRun ?? null;
	const migrationTriageItems = [...typedMigrationHandoffChecklist]
		.filter((item) => item.blocking || item.status !== "ready_for_preview")
		.sort((left, right) => {
			if (left.blocking !== right.blocking) return left.blocking ? -1 : 1;
			const statusDelta =
				(migrationTriageStatusPriority[left.status] ?? 9) -
				(migrationTriageStatusPriority[right.status] ?? 9);
			if (statusDelta !== 0) return statusDelta;
			return left.title.localeCompare(right.title, "ru");
		})
		.slice(0, 4);
	const typedMigrationDiscoveryCandidates =
		(typedMigrationSourceDiscovery?.candidates ??
			[]) as MigrationLocalSourceDiscoveryCandidate[];
	const typedMigrationWorkupReadinessIssues = typedMigrationSourceWorkup
		? ([
				...typedMigrationSourceWorkup.readiness.blockers,
				...typedMigrationSourceWorkup.readiness.warnings,
			] as MigrationReadinessItem[])
		: [];
	const typedMigrationProbeReadinessIssues = typedMigrationSourceProbe
		? ([
				...typedMigrationSourceProbe.readiness.blockers,
				...typedMigrationSourceProbe.readiness.warnings,
			] as MigrationReadinessItem[])
		: [];
	const typedClinicPublicLookupSuggestions =
		typedClinicPublicLookup?.suggestions ?? [];
	const typedClinicPublicLookupTargets =
		typedClinicPublicLookup?.publicLookupTargets ?? [];
	const migrationOperatorScriptSteps =
		typedMigrationAutopilot?.operatorPacket.operatorScript.steps ?? [];
	const migrationPrimaryOperatorStep =
		migrationOperatorScriptSteps.find(
			(step) =>
				step.blocking &&
				step.action !== "doctor_review" &&
				step.action !== "manual",
		) ??
		migrationOperatorScriptSteps.find(
			(step) => step.action !== "doctor_review" && step.action !== "manual",
		) ??
		migrationOperatorScriptSteps[0] ??
		null;
	const migrationPrimaryOperatorCandidate =
		migrationPrimaryOperatorStep?.sourceFingerprint && typedMigrationAutopilot
			? (typedMigrationAutopilotSources.find(
					(source) =>
						source.candidate.sourceFingerprint ===
						migrationPrimaryOperatorStep.sourceFingerprint,
				)?.candidate ?? null)
			: null;
	const migrationCandidatePreviewReady = (
		candidate: MigrationLocalSourceDiscoveryCandidate,
	) => {
		const materialCount =
			candidate.matchedFiles +
			candidate.databaseFiles +
			candidate.dumpFiles +
			candidate.tableFiles +
			candidate.archiveFiles +
			candidate.dicomLikeFiles +
			candidate.imageFiles;
		return (
			materialCount > 0 ||
			candidate.sourceRef.startsWith("browser-local:") ||
			candidate.sourceRef.startsWith("smart-preview:")
		);
	};
	const migrationCandidatePreviewHint = (
		candidate: MigrationLocalSourceDiscoveryCandidate,
	) =>
		migrationCandidatePreviewReady(candidate)
			? "Предпросмотр построит черновой разбор найденного источника."
			: "Сначала откройте план или проверку источника: у этой подсказки пока нет файлов для предпросмотра.";
	const migrationPreviewableSourceCount =
		typedMigrationAutopilotSources.filter((source) =>
			migrationCandidatePreviewReady(source.candidate),
		).length +
		typedMigrationDiscoveryCandidates.filter(migrationCandidatePreviewReady)
			.length +
		(typedBrowserMigrationDiscovery?.candidates.filter(
			migrationCandidatePreviewReady,
		).length ?? 0);
	const migrationPreAutopilotSourceCount =
		typedMigrationDiscoveryCandidates.length +
		(typedBrowserMigrationDiscovery?.candidates.length ?? 0) +
		(typedSmartImportPreview?.legacySources.length ?? 0);
	const migrationKnownSourceCount =
		typedMigrationAutopilotSources.length || migrationPreAutopilotSourceCount;
	const migrationHandoffReportReady = Boolean(
		typedMigrationAutopilot ||
			typedMigrationSourceDiscovery ||
			typedBrowserMigrationDiscovery ||
			smartImportInputReady,
	);
	const migrationPreviewReadyRows = typedSmartImportPreview
		? typedSmartImportPreview.patientPreview.readyRows +
			typedSmartImportPreview.imagingPreview.readyRows
		: 0;
	const migrationClinicLookupFieldCount =
		typedClinicPublicLookupSuggestions.reduce(
			(bestCount, suggestion) =>
				Math.max(
					bestCount,
					clinicLookupSuggestionFieldEntries(suggestion.fields).length,
				),
			0,
		);
	const migrationSmartClinicFieldCount =
		typedSmartImportPreview?.clinicSuggestion
			? clinicLookupSuggestionFieldEntries(
					typedSmartImportPreview.clinicSuggestion.fields,
				).length
			: 0;
	const migrationClinicFieldsFound = Math.max(
		migrationClinicLookupFieldCount,
		migrationSmartClinicFieldCount,
	);
	const migrationProgressItems = [
		{
			id: "source",
			title: "Источник",
			status:
				migrationKnownSourceCount > 0
					? "ready"
					: isMigrationSourceDiscovering || isBrowserMigrationScanning
						? "active"
						: "pending_review",
			detail:
				migrationKnownSourceCount > 0
					? `Найдено ${migrationKnownSourceCount}`
					: isMigrationSourceDiscovering || isBrowserMigrationScanning
						? "Идет поиск"
						: "Нажмите поиск или выберите папку",
		},
		{
			id: "plan",
			title: "План",
			status:
				typedMigrationAutopilot || typedMigrationSourceWorkup
					? "ready"
					: isMigrationAutopilotLoading || isMigrationSourceWorkupLoading
						? "active"
						: "pending_review",
			detail: typedMigrationAutopilot
				? `${Math.round(typedMigrationAutopilot.operatorPacket.score * 100)}% готовности`
				: typedMigrationSourceWorkup
					? "План источника открыт"
					: isMigrationAutopilotLoading || isMigrationSourceWorkupLoading
						? "Строю маршрут"
						: "После источника",
		},
		{
			id: "preview",
			title: "Предпросмотр",
			status: typedSmartImportPreview
				? "ready"
				: isSmartImportLoading
					? "active"
					: smartImportInputReady || migrationPreviewableSourceCount > 0
						? "pending_review"
						: "locked",
			detail: typedSmartImportPreview
				? `${migrationPreviewReadyRows} готово к записи`
				: isSmartImportLoading
					? "Разбираю строки"
					: smartImportInputReady
						? "Откройте разбор"
						: migrationPreviewableSourceCount > 0
							? `Источников ${migrationPreviewableSourceCount}`
							: migrationAutopilot
								? "Сначала план или проверка источника"
								: "Нужен источник или текст",
		},
		{
			id: "clinic",
			title: "Реквизиты",
			status:
				migrationClinicFieldsFound > 0
					? "ready"
					: isClinicPublicLookupLoading
						? "active"
						: "pending_review",
			detail:
				migrationClinicFieldsFound > 0
					? `Полей ${migrationClinicFieldsFound}`
					: isClinicPublicLookupLoading
						? "Ищу профиль"
						: "Можно добрать отдельно",
		},
	];
	const focusSmartImportWorkbench = () => {
		setSmartImportMode("auto");
		if (typeof window === "undefined") return;
		window.setTimeout(() => {
			const textarea = document.querySelector<HTMLTextAreaElement>(
				'textarea[aria-label="Смешанная выгрузка для умного разбора"]',
			);
			motionSafeScrollIntoView(textarea, { block: "center" });
			textarea?.focus({ preventScroll: true });
		}, 0);
	};
	const renderMigrationOperatorStepActions = (
		step: MigrationAutopilotOperatorScriptStep,
		scriptCandidate: MigrationLocalSourceDiscoveryCandidate | null | undefined,
		testScope: MigrationOperatorActionScope,
	) => {
		const primaryButtonTestId =
			testScope === "primary" ? "migration-primary-action-button" : undefined;
		const scriptTestId = (value: string) =>
			testScope === "script" ? value : primaryButtonTestId;
		const actionButtonClass =
			testScope === "primary" ? "primary-button" : "text-button";
		const operatorStepNeedsCandidate = Boolean(
			step.sourceFingerprint &&
				migrationOperatorSourceBoundActions.includes(step.action) &&
				!scriptCandidate,
		);
		const operatorStepPreviewReady =
			step.action !== "build_preview" ||
			(scriptCandidate
				? migrationCandidatePreviewReady(scriptCandidate)
				: typedMigrationAutopilotSources.some((source) =>
						migrationCandidatePreviewReady(source.candidate),
					));

		return (
			<div className="migration-source-card-actions">
				{operatorStepNeedsCandidate ? (
					<>
						<button
							className="text-button"
							type="button"
							onClick={() =>
								void runMigrationAutopilot(undefined, {
									includeSmartImportText: smartImportInputReady,
								})
							}
							disabled={isMigrationAutopilotLoading}
							data-testid={scriptTestId("operator-script-refresh-plan")}
						>
							<RefreshCw aria-hidden="true" /> Обновить план
						</button>
						<small className="migration-action-hint">
							Источник уже не в текущем автоплане
						</small>
					</>
				) : null}
				{step.action === "discover_sources" ? (
					<button
						className={actionButtonClass}
						type="button"
						onClick={() => void discoverMigrationSources()}
						disabled={
							isMigrationSourceDiscovering || isMigrationAutopilotLoading
						}
						data-testid={scriptTestId("operator-script-discover-sources")}
					>
						<ScanSearch aria-hidden="true" /> {step.buttonLabel}
					</button>
				) : null}
				{step.action === "pick_source" ? (
					<button
						className={actionButtonClass}
						type="button"
						onClick={() => void pickBrowserMigrationSource()}
						disabled={isBrowserMigrationScanning || isMigrationAutopilotLoading}
						data-testid={scriptTestId("operator-script-pick-source")}
					>
						<Database aria-hidden="true" /> {step.buttonLabel}
					</button>
				) : null}
				{step.action === "open_plan" && scriptCandidate ? (
					<button
						className={actionButtonClass}
						type="button"
						onClick={() => planMigrationDiscoveryCandidate(scriptCandidate)}
						disabled={isMigrationSourceWorkupLoading}
						data-testid={primaryButtonTestId}
					>
						<ClipboardCheck aria-hidden="true" /> {step.buttonLabel}
					</button>
				) : null}
				{step.action === "open_probe" && scriptCandidate ? (
					<button
						className={actionButtonClass}
						type="button"
						onClick={() => probeMigrationDiscoveryCandidate(scriptCandidate)}
						disabled={isMigrationSourceProbeLoading}
						data-testid={primaryButtonTestId}
					>
						<ScanSearch aria-hidden="true" /> {step.buttonLabel}
					</button>
				) : null}
				{step.action === "add_to_parser" && scriptCandidate ? (
					<button
						className={actionButtonClass}
						type="button"
						onClick={() =>
							addMigrationDiscoveryCandidateToSmartImport(scriptCandidate)
						}
						data-testid={primaryButtonTestId}
					>
						<UploadCloud aria-hidden="true" /> {step.buttonLabel}
					</button>
				) : null}
				{step.action === "run_clinic_lookup" ? (
					<button
						className={actionButtonClass}
						type="button"
						onClick={() => void lookupClinicPublicProfile()}
						disabled={isClinicPublicLookupLoading}
						data-testid={primaryButtonTestId}
					>
						<Search aria-hidden="true" /> {step.buttonLabel}
					</button>
				) : null}
				{step.action === "prepare_export" && scriptCandidate ? (
					<button
						className={actionButtonClass}
						type="button"
						onClick={() => planMigrationDiscoveryCandidate(scriptCandidate)}
						disabled={isMigrationSourceWorkupLoading}
						data-testid={primaryButtonTestId}
					>
						<FileCheck2 aria-hidden="true" /> {step.buttonLabel}
					</button>
				) : null}
				{step.action === "build_preview" && !operatorStepNeedsCandidate ? (
					<>
						<button
							className={actionButtonClass}
							type="button"
							onClick={() =>
								void previewMigrationAutopilotSources(step.sourceFingerprint)
							}
							disabled={isSmartImportLoading || !operatorStepPreviewReady}
							data-testid={scriptTestId("operator-script-build-preview")}
						>
							<FileCheck2 aria-hidden="true" /> {step.buttonLabel}
						</button>
						{!operatorStepPreviewReady ? (
							<small className="migration-action-hint">
								Сначала откройте план или проверку источника: у этой подсказки
								пока нет файлов для предпросмотра.
							</small>
						) : null}
					</>
				) : null}
				{step.action === "manual" || step.action === "doctor_review" ? (
					<span>
						<UserCheck aria-hidden="true" /> {step.buttonLabel}
					</span>
				) : null}
			</div>
		);
	};
	const renderMigrationTechnicalNotes = (
		title: string,
		items: string[],
		testId?: string,
	) => {
		const visibleItems = items.filter(Boolean).slice(0, 8);
		if (!visibleItems.length) return null;

		return (
			<details className="migration-technical-boundary" data-testid={testId}>
				<summary>{title}</summary>
				<div>
					{visibleItems.map((item, index) => (
						<small key={`${index}:${item}`}>
							{humanizeMigrationText(item)}
						</small>
					))}
				</div>
			</details>
		);
	};
	const typedClinicalRuleActionLabels = clinicalRuleActionLabels as Record<
		ClinicalRuleAction,
		string
	>;
	const typedClinicalRuleActions = Object.keys(
		typedClinicalRuleActionLabels,
	) as ClinicalRuleAction[];
	const typedClinicalRuleSeverityLabels = clinicalRuleSeverityLabels as Record<
		ClinicalRuleSeverity,
		string
	>;
	const typedClinicalRuleSeverities = Object.keys(
		typedClinicalRuleSeverityLabels,
	) as ClinicalRuleSeverity[];
	const typedClinicalRules = dashboard.clinicalRules as ClinicalRule[];
	const typedServiceCatalog = dashboard.serviceCatalog as ServiceCatalogItem[];
	const typedServiceCategoryLabels = serviceCategoryLabels as Record<
		ServiceCategory,
		string
	>;
	const typedServiceCategories = Object.keys(
		typedServiceCategoryLabels,
	) as ServiceCategory[];

	return {
		...appLogic,
		dicomArchiveAddressGuidanceId,
		localDicomFolderGuidanceId,
		migrationHandoffReportGuidanceId,
		dicomArchiveAddressReady,
		telegramOutboxBulkSendGuidance,
		clinicLookupSuggestionFieldEntries,
		clinicLookupSuggestionApplySummary,
		applyClinicLookupSuggestion,
		clinicProfileSaveButtonText,
		typedMigrationAutopilot,
		typedMigrationSourceDiscovery,
		activeMigrationDiscoveryForSettingsAutopilot,
		typedMigrationSourceWorkup,
		typedMigrationSourceProbe,
		typedClinicPublicLookup,
		typedDicomFirstFramePreview,
		typedDicomFirstFrameViewerState,
		typedDefaultDicomFirstFrameViewerState,
		dicomFirstFrameSelectableCount,
		dicomFirstFrameCurrentIndex,
		dicomFirstFrameSliceMaxIndex,
		dicomFirstFrameLandmarkSlices,
		dicomFirstFrameCanSelectPrevious,
		dicomFirstFrameCanSelectNext,
		typedDicomSeriesPreviewSeries,
		typedDicomSeriesPreviewParserNotes,
		typedCbctWorkbenchSeries,
		typedDicomViewerWorkbenchManifest,
		typedDicomWorkstationReadiness,
		typedDicomRenderCachePlan,
		typedDicomViewerToolStateBundle,
		typedDicomLocalFolderDiscovery,
		typedLocalImagingOrganizer,
		typedImagingFolderScan,
		typedDicomFolderSeriesScan,
		typedDicomFolderWorkupPlan,
		typedCbctWorkbenchTools,
		typedCbctMprBlockers,
		typedCbctMprWarnings,
		typedCbctResourceSafetyCaps,
		mprControlsReady,
		mprSliceMaxIndex,
		mprCenterSliceIndex,
		typedCbctWorkbenchProjections,
		mprSafeSliceIndex,
		updateDicomFirstFrameViewerState,
		updateDicomFirstFrameViewerNumber,
		typedMprProjection,
		mprAxisDirectionLabel,
		mprAxisAngleBadge,
		mprSlabBadge,
		mprSliceBadge,
		mprSlabVisualWidth,
		mprSlicePositionPercent,
		mprCurrentSliceFraction,
		mprSliceLabel,
		mprAxisRangeValue,
		mprSlabRangeValue,
		mprSliceRangeValue,
		mprActiveProjectionLabel,
		mprActiveProjectionOrientation,
		mprProjectionCompass,
		mprAxisGuidance,
		mprNearestClinicalPreset,
		mprClinicalInput,
		mprWorkbenchSummaryText,
		mprOperatorSummaryCards,
		mprAxisVisualizerLabel,
		mprClinicalChecklist,
		mprClinicalNextStep,
		mprClinicalPresetButtonClass,
		resetMprControls,
		applyMprClinicalPreset,
		applyCtPlanningQuickAction,
		selectCtPlanningImplantFromSettings,
		applyNearestMprClinicalPreset,
		handleMprKeyboardNavigation,
		typedMigrationAutopilotSources,
		typedMigrationAutopilotClinicLookup,
		typedMigrationAutopilotSteps,
		typedMigrationOperatorLanes,
		typedMigrationHandoffChecklist,
		migrationDryRunSummary,
		migrationTriageItems,
		typedMigrationDiscoveryCandidates,
		typedMigrationWorkupReadinessIssues,
		typedMigrationProbeReadinessIssues,
		typedClinicPublicLookupSuggestions,
		typedClinicPublicLookupTargets,
		migrationOperatorScriptSteps,
		migrationPrimaryOperatorStep,
		migrationPrimaryOperatorCandidate,
		migrationCandidatePreviewReady,
		migrationCandidatePreviewHint,
		migrationPreviewableSourceCount,
		migrationPreAutopilotSourceCount,
		migrationKnownSourceCount,
		migrationHandoffReportReady,
		migrationPreviewReadyRows,
		migrationClinicLookupFieldCount,
		migrationSmartClinicFieldCount,
		migrationClinicFieldsFound,
		migrationProgressItems,
		focusSmartImportWorkbench,
		renderMigrationOperatorStepActions,
		renderMigrationTechnicalNotes,
		typedClinicalRuleActionLabels,
		typedClinicalRuleActions,
		typedClinicalRuleSeverityLabels,
		typedClinicalRuleSeverities,
		typedClinicalRules,
		typedServiceCatalog,
		typedServiceCategoryLabels,
		typedServiceCategories,
	};
}

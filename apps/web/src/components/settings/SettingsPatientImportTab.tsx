import type {
	AiRecognitionJob,
	AuditEvent,
	Chair,
	ClinicalRule,
	ClinicalRuleAction,
	ClinicalRuleSeverity,
	ClinicMode,
	ClinicPublicLookupResponse,
	DentalModelWorkbenchManifest,
	DenteTelegramBotStatus,
	DenteTelegramChatLinkPublic,
	DenteTelegramFeature,
	DenteTelegramLinkCodePublic,
	DenteTelegramMessagePreview,
	DenteTelegramOutboxItem,
	DenteTelegramOutboxResponse,
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
	MigrationAutopilotOperatorScriptStep,
	MigrationAutopilotPacketLane,
	MigrationAutopilotResponse,
	MigrationAutopilotSource,
	MigrationAutopilotStep,
	MigrationLocalSourceDiscoveryCandidate,
	MigrationLocalSourceDiscoveryResponse,
	MigrationLocalSourceProbeResponse,
	MigrationLocalSourceWorkupResponse,
	MigrationReadinessItem,
	ProtocolTemplate,
	RoleQueue,
	ServiceCatalogItem,
	ServiceCategory,
	SmartImportPreviewResponse,
	SpeechProvider,
	SpeechRecordingRecoveryList,
	StaffMember,
} from "@dental/shared";
import {
	CheckCircle2,
	ClipboardCheck,
	Database,
	FileCheck2,
	FileText,
	Image as ImageIcon,
	RefreshCw,
	ScanSearch,
	Search,
	UploadCloud,
	UserCheck,
} from "lucide-react";
import type { KeyboardEvent } from "react";
import { SmartMicrophoneButton } from "../../components/SmartMicrophoneButton";
import type {
	CtImplantLibraryItem,
	CtPlanningQuickAction,
} from "../../ctPlanningTools";
import {
	type MprClinicalPreset,
	type MprProjection,
	mprClinicalPresets,
	mprProjectionOrientationLabels,
} from "../../imagingUiLabels";
import { motionSafeScrollIntoView } from "../../motionPreference";
import {
	buildMprClinicalChecklist,
	buildMprOperatorSummary,
	buildMprWorkbenchSummary,
	findNearestMprClinicalPreset,
	mprClinicalNextAction,
	resolveMprClinicalPresetProjection,
} from "../../mprClinicalStatus";
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
	mprProjectionCompassLabels,
	mprSliceFraction,
	mprSliceIndexFromFraction,
	resolveMprKeyboardAdjustment,
} from "../../mprControlMath";
import type {
	ImagingConnectorCard,
	ImagingViewerCapability,
	RecognitionPreset,
} from "../../settingsStaticData";
import { useSettingsStore } from "../../store/settingsStore";
import { MigrationEntityStats } from "./MigrationEntityStats";
import {
	type BrowserContinuityCheck,
	clinicPublicLookupFieldLabels,
	type DicomFirstFrameViewerState,
	humanizeMigrationText,
	type InputChangeEvent,
	importRowStatusLabels,
	type MigrationOperatorActionScope,
	type MprAxisVisualizerStyle,
	migrationOperatorSourceBoundActions,
	migrationTriageStatusPriority,
	type PersistenceIntegrityReport,
	patientImportRowWarningText,
	type RoleAccessPolicy,
	type SettingsTab,
	type SettingsTabId,
	type TelegramFeaturePlan,
	type TelegramInlineButtonRow,
	type TelegramPostVisitCheckupDelayField,
	type TelegramPostVisitCheckupDelayKey,
	type TelegramVisualCardField,
	type TextInputChangeEvent,
	type WeekdayOption,
	type WorkspaceProfile,
} from "./migrationHelpers";
// biome-ignore lint/correctness/noUnusedVariables: automated suppression
// biome-ignore lint/correctness/noUnusedVariables: automated suppression
// biome-ignore lint/suspicious/noExplicitAny lint/correctness/noUnusedVariables: automated suppression
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
export function SettingsPatientImportTab(props: Record<string, any>) {
	const {
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		activePatient,
		activeSettingsTabButtonRef,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		activeSpeechProviderHealth,
		activeWorkspaceProfile,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		addChair,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		addStaffMember,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		applyProtocolTemplate,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		browserCanRequestPersistentStorage,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		browserContinuity,
		browserContinuityChecks,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		browserContinuityState,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
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
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		buildDicomRenderCachePlan,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		buildDicomViewerLaunchManifest,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		buildDicomViewerToolStateBundle,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		buildDicomViewerWorkbenchManifest,
		cancelLocalDicomOperation,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		cbctWorkbenchPlanes,
		cbctWorkbenchProjections,
		cbctWorkbenchSeries,
		cbctWorkbenchTools,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		chairScheduleDirtyIds,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		chairScheduleDrafts,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		chairScheduleSaveStates,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		chairScheduleSavingId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		changeClinicMode,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		checkDicomWebConnector,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		checkDicomWorkstationReadiness,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		chooseRecognitionPreset,
		clinicPublicLookup,
		cancelBrowserImagingFolderScan,
		cancelBrowserMigrationScan,
		clearBrowserPickedImagingFolderPreview,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		clearDicomWorkbenchRecovery,
		clearLocalImagingFolderRecovery,
		clinicalRuleActionLabels,
		clinicalRuleSeverityLabels,
		clinicModeLabels,
		clinicProfileDraft,
		clinicProfileSaveState,
		commitImagingImport,
		commitImport,
		commitSmartImport,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		copyTelegramTextToClipboard,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		createClinicalRuleFromSettings,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		createTelegramLinkCode,
		dashboard,
		defaultDicomFirstFrameViewerState,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dentalMaterialKindLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dentalRestorationTypeLabels,
		dicomFirstFrameImageStyle,
		dicomFirstFramePreview,
		dicomFirstFrameStatusLabels,
		dicomFirstFrameViewerState,
		dicomFolderSeriesScan,
		dicomFolderWorkupPathLabels,
		dicomFolderWorkupPlan,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomDiagnosticPixelPolicyLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomExecutionLaneLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomGpuClassLabels,
		dicomLabel,
		dicomLocalFolderDiscovery,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomQualityModeLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomReadinessCheckLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomRenderMemoryBudgetClassLabels,
		dicomRenderCachePlan,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomRuntimeTierLabels,
		dicomSeriesPreview,
		dicomSeriesViewerLabels,
		dicomTextureStrategyLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomViewerLaunchManifest,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomViewerLaunchModeLabels,
		dicomViewerToolStateBundle,
		dicomViewerWorkbenchManifest,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomWebCheck,
		dicomWebEndpointUrl,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomWebStatusLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomWorkbenchLocalSavedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomWorkbenchServerBundle,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomWorkbenchSourceIsRedacted,
		dicomWorkstationReadiness,
		discoverDicomFolders,
		discoverMigrationSources,
		documentDetectedKindLabel,
		documentIngestion,
		documentIngestionQualityLabels,
		documentIngestionTarget,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		documentLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		downloadDicomViewerToolStateBundle,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		downloadDicomWorkbenchManifest,
		downloadMigrationHandoffReport,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		downloadPersistenceExport,
		downloadSmartImportSafeHandoffReport,
		downloadSmartImportReport,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		downloadTelegramQrSvg,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		filteredTelegramOutboxItems,
		formatByteSize,
		formatDateTime,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
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
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		integrationCapabilityLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		integrationCategoryLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		integrationStatusLabels,
		isBrowserImagingFolderPicking,
		isBrowserMigrationScanning,
		isClinicPublicLookupLoading,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isClinicalRuleSaving,
		isDicomFirstFramePreviewing,
		isDicomFolderWorkupPlanning,
		isDicomLocalDiscovering,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isDicomManifestBuilding,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isDicomRenderCachePlanning,
		isDicomSeriesPreviewLoading,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isDicomToolStateBuilding,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isDicomWebChecking,
		isDicomWorkbenchBuilding,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isDicomWorkbenchReconnecting,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isDicomWorkbenchServerSaving,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isDicomWorkstationChecking,
		isDocumentIngesting,
		isImagingFolderScanning,
		isLocalDicomOperationActive,
		isImagingImportCommitting,
		isImagingImportLoading,
		isImportCommitting,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isImportDictating,
		isImportLoading,
		isLocalImagingOrganizing,
		isMigrationAutopilotLoading,
		isMigrationHandoffReportLoading,
		isMigrationSourceDiscovering,
		isMigrationSourceProbeLoading,
		isMigrationSourceWorkupLoading,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isPersistenceExporting,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isRecognitionLoading,
		isSmartImportCommitting,
		isSmartImportLoading,
		isSmartReportLoading,
		isSmartSafeReportLoading,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isTelegramChatLinksLoadingMore,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isTelegramLinkCodesLoadingMore,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isTelegramLinkCreating,
		isTelegramLoading,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isTelegramOutboxItemDueForUi,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isTelegramOutboxLoadingMore,
		isTelegramSendingDue,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isTelegramSettingsSaving,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		latestDicomWorkbenchServerBundle,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		legalMissingFields,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		legalReadinessPercent,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		loadLocalBridgeUsePlans,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		loadMoreTelegramChatLinks,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		loadMoreTelegramLinkCodes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		loadMoreTelegramOutbox,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		loadPersistenceHealth,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		loadPersistenceIntegrity,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		loadTelegramControlPlane,
		localBridgeReadiness,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		localBridgeStatusLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		localBridgeStatusState,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		localBridgeStatusValue,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		localBridgeUsePathLabels,
		localBridgeUsePlans,
		localImagingFolderDraft,
		localImagingModelRoleLabels,
		localImagingOrganizer,
		localImagingOrganizerActionLabels,
		lookupClinicPublicProfile,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		lockTelegramAdminSession,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		markTelegramSettingsDirty,
		migrationAutopilot,
		migrationSourceDiscovery,
		migrationSourceProbe,
		migrationSourceWorkup,
		mprAxisDeg,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprCacheModeLabels,
		mprCrosshairEnabled,
		mprLinkedPlanesEnabled,
		mprLoadStrategyLabels,
		mprProjection,
		mprProjectionLabels,
		mprResourceTierLabels,
		mprSliceIndex,
		mprSlabMm,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprToolLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprWorkbenchDraftRestored,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprWorkbenchLocalSavedAt,
		mprWindowPreset,
		mprWindowPresetLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newChairHasMicroscope,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newChairHasSurgeryKit,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newChairHasXraySensor,
		newChairName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newRuleAction,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newRuleBlockedServiceId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newRuleCategory,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newRuleCompletedServiceId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newRuleOwnerRole,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newRulePatientText,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newRuleRequiredServiceId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newRuleSeverity,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newRuleSpecialty,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newRuleTitle,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newRuleTriggerServiceId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newRuleWarningText,
		newStaffName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newStaffRole,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newStaffSpecialty,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		normalizedClinicalRuleAction,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		normalizedClinicalRuleSeverity,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		normalizedDentalSpecialty,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		normalizedServiceCategory,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		normalizedStaffRole,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		normalizedTelegramBotMode,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		normalizedTelegramLinkSubjectType,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		normalizedTelegramOutboxStatusFilter,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		normalizedTelegramOutboxTemplateFilter,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		normalizedTelegramPrivacyMode,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		normalizeUiLanguageInput,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		ohifBaseUrl,
		organizeLocalImagingSources,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		persistenceHealth,
		persistenceIntegrity,
		pickBrowserImagingFolder,
		pickBrowserImagingFiles,
		pickBrowserMigrationSource,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
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
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		previewTelegramTemplate,
		/*
      ВСЯ ПОВЕРХНОСТЬ РАЗБОРА ПРАЙСА УБРАНА ИЗ ЭТОЙ ВКЛАДКИ, ПОТОМУ ЧТО ЕЁ ЗДЕСЬ НЕ БЫЛО.

      Вкладка «Импорт» вынимала из мешка настроек двадцать два имени про прайс-лист
      — тринадцать значений и подписей, два признака состояния и семь действий, — и
      НИ ОДНО из них не читалось ниже ни разу: строка деструктуризации была
      единственным вхождением каждого имени в файле. Вместе с ними уехали три
      локальных приведения типа, которые эти имена и обслуживали. Так вышло при
      разборе монолита настроек на вкладки: мешок скопировали целиком, а разметку
      прайса забрала вкладка «Цены».

      Соблазн включить их именно здесь самый сильный: вкладка и правда про загрузку
      файлов. Но загрузка прайса и его разбор живут в отдельной вкладке «Цены» со
      своим состоянием и своей кнопкой «Сохранить в каталог клиники»; вторая точка
      входа в тот же разбор дала бы клинике два места, где прайс «уже загружен», и
      разные ответы на вопрос, какой из них поедет в каталог. Поэтому имена сняты,
      а не включены. Живая поверхность — SettingsView.tsx (вкладка «Цены») и
      components/settings/SettingsPricesTab.tsx.
    */
		recognitionJob,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		recognitionKind,
		recognitionPresets,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		recognitionTarget,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		recognitionTargetLabels,
		recognitionText,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		reconnectDicomWorkbenchFromCurrentFolder,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		refreshBrowserContinuity,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		refreshSpeechRuntime,
		addMigrationDiscoveryCandidateToSmartImport,
		rememberLocalImagingFolder,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		reopenOnboarding,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		requestBrowserStoragePersistence,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		restoreDicomWorkbenchServerBundle,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		restoreMprWorkbenchLocalDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		revokeTelegramChatLink,
		runMigrationAutopilot,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		runRecognitionJob,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		saveChairSchedule,
		saveClinicProfileFromDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		saveDicomWorkbenchBundleToServer,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		saveStaffSchedule,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		saveTelegramSettings,
		scanDicomFolderSeries,
		scanImagingFolder,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		selectedUiLanguageOption,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		sendDueTelegramOutbox,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		sendRecognitionResultToImport,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		sendTelegramOutboxItem,
		serviceCategoryLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		serviceTitle,
		setDicomFirstFramePreview,
		setDicomFirstFrameViewerState,
		setDicomFolderSeriesScan,
		setDicomFolderWorkupPlan,
		setDicomLocalFolderDiscovery,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setDicomRenderCachePlan,
		setDicomSeriesPreview,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setDicomViewerLaunchManifest,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setDicomViewerToolStateBundle,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setDicomViewerWorkbenchManifest,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setDicomWebCheck,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setDicomWebEndpointUrl,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setDicomWorkbenchLocalSavedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
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
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewChairHasMicroscope,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewChairHasSurgeryKit,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewChairHasXraySensor,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewChairName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewRuleAction,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewRuleBlockedServiceId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewRuleCategory,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewRuleCompletedServiceId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewRuleOwnerRole,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewRulePatientText,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewRuleRequiredServiceId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewRuleSeverity,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewRuleSpecialty,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewRuleTitle,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewRuleTriggerServiceId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewRuleWarningText,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewStaffName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewStaffRole,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewStaffSpecialty,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setOhifBaseUrl,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setRecognitionJob,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setRecognitionText,
		setSettingsTab,
		setSmartImportCommit,
		setSmartImportMode,
		setSmartImportPreview,
		setSmartImportText,
		settingsTab,
		settingsTabs,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setUiLanguage,
		smartImportCommit,
		smartImportMode,
		smartImportModeLabels,
		smartImportPreview,
		smartImportText,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		specialtyLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechGatewayCanUpload,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechGatewayHealthReport,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechGatewayStatus,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechProviderConnectorLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechProviderHealthById,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechProviderHealthLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechProviderModeLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechProviderRuntimeById,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechProviderSelectionLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechProviderStatusLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechRecordingPathLabels,
		speechRecordingRecovery,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechRecordingStrategy,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechRecoveryStateLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		staffRoleLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		staffScheduleDirtyIds,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		staffScheduleDraftFromWorkingHours,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		staffScheduleDrafts,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		staffScheduleSaveStates,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		staffScheduleSavingId,
		stageLocalImagingFolderRecovery,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		startImportDictation,
		telegramAdminSecretDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramAdminSecretSession,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramAllowVoiceIntakeDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramBotConfigId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramBotUsernameDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramChatLinkLedger,
		telegramChatLinks,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramClassificationLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramDeliveryStatusLabels,
		telegramEnabledFeaturesDraft,
		telegramFeatureHelp,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramFeatureLabel,
		telegramFeatureOptions,
		telegramFeaturePlan,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramHumanMessage,
		telegramInlineButtonKindLabels,
		telegramInlineButtonRowsFromReplyMarkup,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramLinkActionState,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramLinkCode,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramLinkCodeLedger,
		telegramLinkCodes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramLinkCodeStatusLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramLinkStaffId,
		telegramLinkStaffOptions,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramLinkSubjectType,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramMapsUrlDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramModeDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramModeHints,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramModeLabels,
		telegramOutbox,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramOutboxStatusFilter,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramOutboxStatusFilterLabels,
		telegramOutboxStatusFilterOptions,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramOutboxTemplateFilter,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramOutboxTemplateFilterLabels,
		telegramOutboxTemplateFilterOptions,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramOwnBotUsernameDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramPatientPortalBaseUrlDraft,
		telegramPostVisitCheckupDelayDrafts,
		telegramPostVisitCheckupDelayFields,
		telegramPreview,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramPrivacyModeDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramPrivacyModeHints,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramPrivacyModeLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramQrSvgToDataUrl,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramReminderLeadTimesDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramReviewRequestDelayDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramReviewUrlDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramRevokingLinkId,
		telegramSendingItemId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramSettingsDirty,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramSettingsSaveError,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramSettingsSaveState,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramStaffEscalationChannelDraft,
		telegramStatus,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramSubjectName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramTemplateLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramTokenTtlDraft,
		telegramVisualCardFields,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramVisualCardUrlDrafts,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramWebhookBaseUrlDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramWelcomeImageUrlDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		toggleChairWorkingDay,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		toggleClinicalRule,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		toggleClinicWorkingDay,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		toggleStaffWorkingDay,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		toggleTelegramFeature,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		uiLanguage,
		uiLanguageOptions,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramAdminSecretDraft: propsSetTelegramAdminSecretDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		unlockTelegramAdminSession,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		updateChairScheduleDay,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		updateChairScheduleDraft,
		updateClinicProfileDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		updateStaffScheduleDay,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		updateStaffScheduleDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		updateTelegramPostVisitCheckupDelayDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		updateTelegramVisualCardUrlDraft,
		visibleTelegramOutboxItems,
		weekdayOptions,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		workspaceScopeLabels,
	} = props;
	const {
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		clinicMode,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setClinicMode,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramOutbox,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramOutboxStatusFilter,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramOutboxTemplateFilter,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramLinkSubjectType,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramLinkStaffId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramLinkCode,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramLinkActionState,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramModeDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramBotUsernameDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramOwnBotUsernameDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramBotConfigId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramWebhookBaseUrlDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramPatientPortalBaseUrlDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramWelcomeImageUrlDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramReviewUrlDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramMapsUrlDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramEnabledFeaturesDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramTokenTtlDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramReminderLeadTimesDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramReviewRequestDelayDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramAllowVoiceIntakeDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramStaffEscalationChannelDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramPrivacyModeDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramAdminSecretDraft,
	} = useSettingsStore();

	const _recognitionInputReady = (recognitionText || "").trim().length > 0;
	const smartImportInputReady = (smartImportText || "").trim().length > 0;
	const _imagingImportInputReady = (imagingImportText || "").trim().length > 0;
	const patientImportInputReady = (importText || "").trim().length > 0;
	const _localImagingFolderReady = (imagingFolderPath || "").trim().length > 0;
	const _newStaffReadyToCreate = (newStaffName || "").trim().length > 0;
	const _newChairReadyToCreate = (newChairName || "").trim().length > 0;
	const _adminSecretReady = (telegramAdminSecretDraft || "").trim().length > 0;
	const _adminSecretScopeWarning =
		settingsTab === "telegram"
			? "Этот секрет относится только к Telegram. Он не разблокирует настройки клиники, расписание или клинические данные, если для них включены отдельные секреты."
			: "Этот секрет относится только к настройкам клиники. Он не разблокирует расписание, Telegram или клинические данные, если для них включены отдельные секреты.";
	const _typedClinicModes = Object.keys(clinicModeLabels ?? {}) as ClinicMode[];
	const _typedModeHints = (dashboard?.clinicSettings?.modeHints ??
		[]) as string[];
	const _typedRoleQueues = (dashboard?.shiftIntelligence?.roleQueues ??
		[]) as RoleQueue[];
	const _typedStaffMembers = (dashboard?.clinicSettings?.staff ??
		[]) as StaffMember[];
	const _typedChairs = (dashboard?.clinicSettings?.chairs ?? []) as Chair[];
	const _typedWeekdayOptions = weekdayOptions as WeekdayOption[];
	const _typedUiLanguageOptions = uiLanguageOptions as Array<{
		value: string;
		label: string;
		detail: string;
	}>;
	const _typedTelegramLinkStaffOptions =
		telegramLinkStaffOptions as StaffMember[];
	const _typedProtocolTemplates = (dashboard?.protocolTemplates ??
		[]) as ProtocolTemplate[];
	const _typedImagingConnectorCards =
		imagingConnectorCards as ImagingConnectorCard[];
	const _typedImagingViewerCapabilities =
		imagingViewerCapabilities as ImagingViewerCapability[];
	const _typedCtPlanningImplantPlan =
		ctPlanningImplantPlan as ImagingViewerImplantPlan | null;
	const _typedCtPlanningActiveQuickActionId =
		typeof ctPlanningActiveQuickActionId === "string"
			? ctPlanningActiveQuickActionId
			: null;
	const _typedImagingViewerActiveTool =
		imagingViewerActiveTool as ImagingViewerTool;
	const _typedIntegrationPresets = (dashboard?.clinicSettings
		?.integrationPresets ?? []) as IntegrationPreset[];
	const _typedSpeechProviders = (dashboard?.speechProviders ??
		[]) as SpeechProvider[];
	const _typedRecognitionPresets = recognitionPresets as RecognitionPreset[];
	const _typedRecognitionJob = recognitionJob as AiRecognitionJob | null;
	const _typedSpeechRecordingRecovery =
		speechRecordingRecovery as SpeechRecordingRecoveryList | null;
	const typedBrowserMigrationDiscovery =
		browserMigrationDiscovery as MigrationLocalSourceDiscoveryResponse | null;
	const typedSmartImportPreview =
		smartImportPreview as SmartImportPreviewResponse | null;
	const _typedImagingSourceChoices =
		imagingSourceChoices as ImagingSourceKind[];
	const _typedImagingImportPreview =
		imagingImportPreview as ImagingImportPreviewResponse | null;
	const _typedBrowserContinuityChecks =
		browserContinuityChecks as BrowserContinuityCheck[];
	const _typedLocalBridgeReadiness =
		localBridgeReadiness as LocalBridgeReadinessResponse | null;
	const _typedLocalBridgeUsePlans =
		localBridgeUsePlans as LocalBridgeUsePlansResponse | null;
	const _typedPersistenceIntegrity =
		persistenceIntegrity as PersistenceIntegrityReport | null;
	const _typedImportBatches = (dashboard?.importBatches ?? []) as ImportBatch[];
	const _typedAuditEvents = (dashboard?.auditEvents ?? []) as AuditEvent[];
	const typedImportSourceKinds = Object.keys(
		importSourceLabels ?? {},
	) as ImportSourceKind[];
	const typedDocumentIngestionTargets = Object.keys(
		ingestionTargetLabels ?? {},
	) as DocumentIngestionTarget[];
	const typedDocumentIngestion =
		documentIngestion as DocumentIngestionResponse | null;
	const typedImportIntake = importIntake as ImportIntakeResponse | null;
	const typedImportPreview = importPreview as ImportPreviewResponse | null;
	const _typedActiveWorkspaceProfile =
		activeWorkspaceProfile as WorkspaceProfile | null;
	const _typedWorkspaceProfiles = (dashboard?.clinicSettings
		?.workspaceProfiles ?? []) as WorkspaceProfile[];
	const _typedRoleAccessPolicies = (dashboard?.clinicSettings
		?.roleAccessPolicies ?? []) as RoleAccessPolicy[];
	const _typedTelegramChatLinks =
		telegramChatLinks as DenteTelegramChatLinkPublic[];
	const _typedTelegramLinkCodes =
		telegramLinkCodes as DenteTelegramLinkCodePublic[];
	const _typedTelegramPreview =
		telegramPreview as DenteTelegramMessagePreview | null;
	const typedTelegramOutbox =
		telegramOutbox as DenteTelegramOutboxResponse | null;
	const typedVisibleTelegramOutboxItems =
		visibleTelegramOutboxItems as DenteTelegramOutboxItem[];
	const _telegramOutboxRemainingCount = typedTelegramOutbox
		? Math.max(
				0,
				typedTelegramOutbox.filteredCount -
					typedVisibleTelegramOutboxItems.length,
			)
		: hiddenTelegramOutboxItemCount;
	const _typedTelegramStatus = telegramStatus as DenteTelegramBotStatus | null;
	const _typedTelegramOutboxStatusFilterOptions =
		telegramOutboxStatusFilterOptions as string[];
	const _typedTelegramOutboxTemplateFilterOptions =
		telegramOutboxTemplateFilterOptions as string[];
	const _typedTelegramInlineButtonKindLabels =
		telegramInlineButtonKindLabels as Record<string, string>;
	const _typedTelegramFeaturePlan =
		telegramFeaturePlan as TelegramFeaturePlan | null;
	const _typedTelegramEnabledFeaturesDraft =
		telegramEnabledFeaturesDraft as DenteTelegramFeature[];
	const _typedTelegramFeatureOptions =
		telegramFeatureOptions as DenteTelegramFeature[];
	const _typedTelegramFeatureHelp = telegramFeatureHelp as Record<
		DenteTelegramFeature,
		string
	>;
	const _typedTelegramPostVisitCheckupDelayFields =
		telegramPostVisitCheckupDelayFields as TelegramPostVisitCheckupDelayField[];
	const _typedTelegramPostVisitCheckupDelayDrafts =
		telegramPostVisitCheckupDelayDrafts as Record<
			TelegramPostVisitCheckupDelayKey,
			string
		>;
	const _typedTelegramVisualCardFields =
		telegramVisualCardFields as TelegramVisualCardField[];
	const _getTypedTelegramInlineButtonRows = (
		replyMarkup: Record<string, unknown> | null,
	) =>
		telegramInlineButtonRowsFromReplyMarkup(
			replyMarkup,
		) as TelegramInlineButtonRow[];
	const _telegramPreviewPatientGuidanceId = "telegram-preview-patient-guidance";
	const _telegramPreviewStaffGuidanceId = "telegram-preview-staff-guidance";
	const _telegramPreviewLoadingGuidanceId = "telegram-preview-loading-guidance";
	const _telegramOutboxSendGuidanceId = "telegram-outbox-send-guidance";
	const _dicomWorkbenchSeriesGuidanceId = "dicom-workbench-series-guidance";
	const _dicomWorkstationGuidanceId = "dicom-workstation-guidance";
	const _dicomArchiveAddressGuidanceId = "dicom-archive-address-guidance";
	const _localDicomFolderGuidanceId = "local-dicom-folder-guidance";
	const _migrationHandoffReportGuidanceId = "migration-handoff-report-guidance";
	const _dicomArchiveAddressReady =
		(dicomWebEndpointUrl || "").trim().length > 0;
	const _telegramOutboxBulkSendGuidance = isTelegramLoading
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
	const _clinicLookupSuggestionApplySummary = (
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
	const _applyClinicLookupSuggestion = (fields: Record<string, unknown>) => {
		clinicLookupSuggestionFieldEntries(fields).forEach(([key, value]) => {
			updateClinicProfileDraft(key, String(value).trim());
		});
	};
	const _clinicProfileSaveButtonText =
		clinicProfileSaveState === "saving"
			? "Сохраняю профиль"
			: clinicProfileSaveState === "saved"
				? "Профиль сохранен"
				: "Сохранить профиль";
	const typedMigrationAutopilot =
		migrationAutopilot as MigrationAutopilotResponse | null;
	const typedMigrationSourceDiscovery =
		migrationSourceDiscovery as MigrationLocalSourceDiscoveryResponse | null;
	const _activeMigrationDiscoveryForSettingsAutopilot =
		typedMigrationSourceDiscovery ?? typedBrowserMigrationDiscovery ?? null;
	const typedMigrationSourceWorkup =
		migrationSourceWorkup as MigrationLocalSourceWorkupResponse | null;
	const typedMigrationSourceProbe =
		migrationSourceProbe as MigrationLocalSourceProbeResponse | null;
	const typedClinicPublicLookup =
		clinicPublicLookup as ClinicPublicLookupResponse | null;
	const typedDicomFirstFramePreview =
		dicomFirstFramePreview as DicomFirstFramePreviewResponse | null;
	const _typedDicomFirstFrameViewerState =
		dicomFirstFrameViewerState as DicomFirstFrameViewerState;
	const _typedDefaultDicomFirstFrameViewerState =
		defaultDicomFirstFrameViewerState as DicomFirstFrameViewerState;
	const dicomFirstFrameSelectableCount =
		typedDicomFirstFramePreview?.selectableFileCount ?? 0;
	const dicomFirstFrameCurrentIndex =
		typedDicomFirstFramePreview?.sourceFileIndex ?? null;
	const dicomFirstFrameSliceMaxIndex = Math.max(
		0,
		dicomFirstFrameSelectableCount - 1,
	);
	const _dicomFirstFrameLandmarkSlices =
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
	const _dicomFirstFrameCanSelectPrevious =
		typeof dicomFirstFrameCurrentIndex === "number" &&
		dicomFirstFrameCurrentIndex > 0 &&
		!isDicomFirstFramePreviewing;
	const _dicomFirstFrameCanSelectNext =
		typeof dicomFirstFrameCurrentIndex === "number" &&
		dicomFirstFrameSelectableCount > 0 &&
		dicomFirstFrameCurrentIndex < dicomFirstFrameSelectableCount - 1 &&
		!isDicomFirstFramePreviewing;
	const _typedDicomSeriesPreviewSeries = (dicomSeriesPreview?.series ??
		[]) as DicomSeriesPreviewGroup[];
	const _typedDicomSeriesPreviewParserNotes =
		(dicomSeriesPreview?.parserNotes ?? []) as string[];
	const typedCbctWorkbenchSeries =
		cbctWorkbenchSeries as DicomSeriesPreviewGroup | null;
	const typedDicomViewerWorkbenchManifest =
		dicomViewerWorkbenchManifest as DicomViewerWorkbenchManifestResponse | null;
	const typedDicomWorkstationReadiness =
		dicomWorkstationReadiness as DicomWorkstationReadinessResponse | null;
	const _typedDicomRenderCachePlan =
		dicomRenderCachePlan as DicomRenderCachePlanResponse | null;
	const _typedDicomViewerToolStateBundle =
		dicomViewerToolStateBundle as DicomViewerToolStateBundleResponse | null;
	const _typedDicomLocalFolderDiscovery =
		dicomLocalFolderDiscovery as DicomLocalFolderDiscoveryResponse | null;
	const typedLocalImagingOrganizer =
		localImagingOrganizer as LocalImagingOrganizerResponse | null;
	const _activeDentalModelWorkbenchManifest: DentalModelWorkbenchManifest | null =
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
	const _typedImagingFolderScan =
		imagingFolderScan as ImagingFolderScanResponse | null;
	const _typedDicomFolderSeriesScan =
		dicomFolderSeriesScan as DicomFolderSeriesPreviewResponse | null;
	const _typedDicomFolderWorkupPlan =
		dicomFolderWorkupPlan as DicomFolderWorkupPlanResponse | null;
	const _typedCbctWorkbenchTools = (
		typedCbctWorkbenchSeries?.mprReadiness.tools.length
			? cbctWorkbenchTools
			: ["window_level", "pan", "zoom", "external_open"]
	) as DicomMprTool[];
	const _typedCbctMprBlockers =
		typedCbctWorkbenchSeries?.mprReadiness.blockers ?? [];
	const _typedCbctMprWarnings =
		typedCbctWorkbenchSeries?.mprReadiness.warnings ?? [];
	const _typedCbctResourceSafetyCaps =
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
	const _updateDicomFirstFrameViewerNumber = (
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
	const _mprAxisAngleBadge = formatMprAxisAngleBadge(
		mprAxisDeg,
		mprControlsReady,
	);
	const _mprSlabBadge = formatMprSlabBadge(mprSlabMm, mprControlsReady);
	const _mprSliceBadge = formatMprSliceBadge({
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
	const _mprAxisRangeValue = formatMprAxisRangeValue({
		canOpenMpr: mprControlsReady,
		axisDeg: mprAxisDeg,
	});
	const _mprSlabRangeValue = formatMprSlabRangeValue({
		canOpenMpr: mprControlsReady,
		slabMm: mprSlabMm,
	});
	const _mprSliceRangeValue = formatMprSliceRangeValue({
		canOpenMpr: mprControlsReady,
		sliceIndex: mprSafeSliceIndex,
		maxIndex: mprSliceMaxIndex,
	});
	const _mprAxisVisualizerStyle: MprAxisVisualizerStyle = {
		"--mpr-axis-deg": `${mprAxisDeg}deg`,
		"--mpr-slab-width": mprSlabVisualWidth,
		"--mpr-slice-position": mprSlicePositionPercent,
	};
	const mprActiveProjectionLabel =
		mprProjectionLabels[typedMprProjection] ?? typedMprProjection;
	const _mprActiveProjectionOrientation =
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
	const _mprOperatorSummaryCards = buildMprOperatorSummary({
		...mprClinicalInput,
		protocolDeltas: mprNearestClinicalPreset.deltas,
	});
	const _mprAxisVisualizerLabel = formatMprAxisVisualizerLabel({
		canOpenMpr: mprControlsReady,
		workbenchSummary: mprWorkbenchSummaryText,
		compassSummary: mprProjectionCompass.summary,
		guidanceSummary: mprAxisGuidance.summary,
	});
	const mprClinicalChecklist = buildMprClinicalChecklist(mprClinicalInput);
	const _mprClinicalNextStep = mprClinicalNextAction(mprClinicalChecklist);
	const _mprClinicalPresetButtonClass = (preset: MprClinicalPreset) =>
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
	const _resetMprControls = () => {
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
	const _applyCtPlanningQuickAction = (action: CtPlanningQuickAction) => {
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
	const _selectCtPlanningImplantFromSettings = (
		implant: CtImplantLibraryItem,
	) => {
		setCtPlanningActiveQuickActionId?.("implant_library");
		selectCtPlanningImplant(implant);
	};
	const _applyNearestMprClinicalPreset = () => {
		const preset = mprClinicalPresets.find(
			(candidate) => candidate.title === mprNearestClinicalPreset.title,
		);
		if (preset) applyMprClinicalPreset(preset);
	};
	const _handleMprKeyboardNavigation = (
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
	const _typedMigrationAutopilotClinicLookup =
		typedMigrationAutopilot?.clinicLookup ?? null;
	const _typedMigrationAutopilotSteps = (typedMigrationAutopilot?.steps ??
		[]) as MigrationAutopilotStep[];
	const _typedMigrationOperatorLanes = (typedMigrationAutopilot?.operatorPacket
		.lanes ?? []) as MigrationAutopilotPacketLane[];
	const typedMigrationHandoffChecklist = (typedMigrationAutopilot
		?.operatorPacket.handoffChecklist ??
		[]) as MigrationAutopilotHandoffChecklistItem[];
	const _migrationDryRunSummary =
		typedMigrationAutopilot?.operatorPacket.dryRun ?? null;
	const _migrationTriageItems = [...typedMigrationHandoffChecklist]
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
	const _typedMigrationWorkupReadinessIssues = typedMigrationSourceWorkup
		? ([
				...typedMigrationSourceWorkup.readiness.blockers,
				...typedMigrationSourceWorkup.readiness.warnings,
			] as MigrationReadinessItem[])
		: [];
	const _typedMigrationProbeReadinessIssues = typedMigrationSourceProbe
		? ([
				...typedMigrationSourceProbe.readiness.blockers,
				...typedMigrationSourceProbe.readiness.warnings,
			] as MigrationReadinessItem[])
		: [];
	const typedClinicPublicLookupSuggestions =
		typedClinicPublicLookup?.suggestions ?? [];
	const _typedClinicPublicLookupTargets =
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
	const _migrationPrimaryOperatorCandidate =
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
	const _migrationCandidatePreviewHint = (
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
	const _migrationHandoffReportReady = Boolean(
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
	const _migrationProgressItems = [
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
	const _focusSmartImportWorkbench = () => {
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
	const _renderMigrationOperatorStepActions = (
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
	const _renderMigrationTechnicalNotes = (
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
					{visibleItems.map((item) => (
						<small key={item}>{humanizeMigrationText(item)}</small>
					))}
				</div>
			</details>
		);
	};
	const typedClinicalRuleActionLabels = clinicalRuleActionLabels as Record<
		ClinicalRuleAction,
		string
	>;
	const _typedClinicalRuleActions = Object.keys(
		typedClinicalRuleActionLabels ?? {},
	) as ClinicalRuleAction[];
	const typedClinicalRuleSeverityLabels = clinicalRuleSeverityLabels as Record<
		ClinicalRuleSeverity,
		string
	>;
	const _typedClinicalRuleSeverities = Object.keys(
		typedClinicalRuleSeverityLabels ?? {},
	) as ClinicalRuleSeverity[];
	const _typedClinicalRules = (dashboard?.clinicalRules ??
		[]) as ClinicalRule[];
	const _typedServiceCatalog = (dashboard?.serviceCatalog ??
		[]) as ServiceCatalogItem[];
	const typedServiceCategoryLabels = serviceCategoryLabels as Record<
		ServiceCategory,
		string
	>;
	const _typedServiceCategories = Object.keys(
		typedServiceCategoryLabels ?? {},
	) as ServiceCategory[];
	const typedSettingsTabs = settingsTabs as SettingsTab[];
	const settingsTabButtonId = (tabId: SettingsTabId) => `settings-tab-${tabId}`;
	const settingsTabPanelId = (tabId: SettingsTabId) =>
		`settings-panel-${tabId}`;
	const _activeSettingsTabPanelId = settingsTabPanelId(settingsTab);
	const selectSettingsTab = (tabId: SettingsTabId) => {
		setSettingsTab(tabId);
		window.location.hash = `settings/${tabId}`;
	};
	const handleSettingsTabKeyDown = (
		event: KeyboardEvent<HTMLButtonElement>,
		tabId: SettingsTabId,
	) => {
		const currentIndex = typedSettingsTabs.findIndex((tab) => tab.id === tabId);
		if (currentIndex < 0) return;
		const lastIndex = typedSettingsTabs.length - 1;
		const nextIndex =
			event.key === "ArrowRight" || event.key === "ArrowDown"
				? currentIndex === lastIndex
					? 0
					: currentIndex + 1
				: event.key === "ArrowLeft" || event.key === "ArrowUp"
					? currentIndex === 0
						? lastIndex
						: currentIndex - 1
					: event.key === "Home"
						? 0
						: event.key === "End"
							? lastIndex
							: null;
		if (nextIndex === null) return;
		const nextTab = typedSettingsTabs[nextIndex];
		if (!nextTab) return;
		const nextTabButtonId = settingsTabButtonId(nextTab.id);
		event.preventDefault();
		selectSettingsTab(nextTab.id);
		window.setTimeout(
			() => document.getElementById(nextTabButtonId)?.focus(),
			0,
		);
	};
	const _renderTabButton = (tab: SettingsTab) => {
		const tabSelected = settingsTab === tab.id;
		return (
			<button
				aria-controls={settingsTabPanelId(tab.id)}
				aria-selected={tabSelected}
				className={tabSelected ? "active" : ""}
				id={settingsTabButtonId(tab.id)}
				key={tab.id}
				onClick={() => selectSettingsTab(tab.id)}
				onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) =>
					handleSettingsTabKeyDown(event, tab.id)
				}
				ref={tabSelected ? activeSettingsTabButtonRef : undefined}
				role="tab"
				tabIndex={tabSelected ? 0 : -1}
				type="button"
			>
				{tab.title}
			</button>
		);
	};

	return (
		<section
			className="import-studio"
			aria-label="Миграция из старой программы"
		>
			<div className="import-copy">
				<Database aria-hidden="true" />
				<div>
					<p className="eyebrow">Мастер переноса</p>
					<h2>Любой источник сначала проходит предпросмотр</h2>
					<p>
						Здесь живут таблицы, Excel, экспорт старых МИС, OCR с фото бумажного
						журнала, диктовка и свободный текст. В базу ничего не пишется без
						подтверждения.
					</p>
				</div>
			</div>

			<div
				role="toolbar"
				className="import-source-grid"
				aria-label="Источник импорта"
			>
				{(typedImportSourceKinds ?? []).map((kind) => (
					<button
						className={`source-card ${importSourceKind === kind ? "active" : ""}`}
						type="button"
						key={kind}
						aria-pressed={importSourceKind === kind}
						onClick={() => {
							setImportSourceKind(kind);
							setImportPreview(null);
							setImportCommit(null);
						}}
					>
						<strong>{importSourceLabels[kind]?.title ?? kind}</strong>
						<span>{importSourceLabels[kind]?.detail ?? ""}</span>
					</button>
				))}
			</div>

			<section
				className="document-ingestion-panel"
				aria-label="Извлечение текста из файла"
			>
				<div className="document-ingestion-head">
					<FileText aria-hidden="true" />
					<div>
						<strong>Архивы, PDF, Office-файлы, таблицы и текст</strong>
						<span>
							Сначала извлечь текст и таблицы, потом отправить в предпросмотр.
							Без прямой записи в базу.
						</span>
					</div>
				</div>
				<section
					className="document-ingestion-targets"
					aria-label="Куда отправить извлеченный текст"
				>
					{(typedDocumentIngestionTargets ?? []).map((target) => (
						<button
							className={documentIngestionTarget === target ? "active" : ""}
							key={target}
							type="button"
							aria-pressed={documentIngestionTarget === target}
							onClick={() => setDocumentIngestionTarget(target)}
						>
							{ingestionTargetLabels[target] ?? target}
						</button>
					))}
				</section>
				<label className="document-file-upload">
					<UploadCloud aria-hidden="true" />
					<span>{isDocumentIngesting ? "Разбираю файл" : "Выбрать файл"}</span>
					<small>
						До 8 МБ. Архивы и Office-файлы разбираются встроенным извлекателем;
						PDF без OCR работает в ограниченном режиме.
					</small>
					<input
						accept=".txt,.csv,.tsv,.json,.xml,.html,.htm,.rtf,.zip,.pdf,.doc,.xls,.ppt,.docx,.xlsx,.xlsm,.xlsb,.pptx,.odt,.ods,.odp,image/jpeg,image/png,image/webp"
						type="file"
						onChange={(event: InputChangeEvent) =>
							void ingestImportFile(event.currentTarget.files?.[0])
						}
					/>
				</label>
				{typedDocumentIngestion ? (
					<div className="document-ingestion-result">
						<div className="document-ingestion-stats">
							<span>
								{documentDetectedKindLabel(typedDocumentIngestion.detectedKind)}
							</span>
							<span>{typedDocumentIngestion.rowCount} строк</span>
							<span>{typedDocumentIngestion.tableCount} таблиц</span>
							<span>
								{Math.round(typedDocumentIngestion.byteSize / 1024)} КБ
							</span>
							<span>{typedDocumentIngestion.extractedFiles.length} файлов</span>
						</div>
						<div
							className={`document-quality quality-${typedDocumentIngestion.quality.extractionQuality}`}
						>
							<div>
								<strong>
									{
										documentIngestionQualityLabels[
											typedDocumentIngestion.quality.extractionQuality
										]
									}
								</strong>
								<span>
									{Math.round(typedDocumentIngestion.quality.confidence * 100)}%
									·{" "}
									{
										ingestionTargetLabels[
											typedDocumentIngestion.quality.suggestedTarget
										]
									}
								</span>
							</div>
							<p>{typedDocumentIngestion.quality.nextAction}</p>
							{(typedDocumentIngestion.quality?.signals ?? []).length ? (
								<div className="document-signal-row">
									{(typedDocumentIngestion.quality?.signals ?? [])
										.slice(0, 10)
										.map((signal) => (
											<span key={signal}>{humanizeMigrationText(signal)}</span>
										))}
								</div>
							) : null}
						</div>
						{(typedDocumentIngestion.extractedFiles ?? []).length ? (
							<section
								className="document-extracted-files"
								aria-label="Извлеченные файлы архива"
							>
								{(typedDocumentIngestion.extractedFiles ?? [])
									.slice(0, 8)
									.map((file) => (
										<span key={`${file.fileName}-${file.detectedKind}`}>
											{documentDetectedKindLabel(file.detectedKind)} ·{" "}
											{file.rowCount} строк · {file.fileName}
										</span>
									))}
							</section>
						) : null}
						<p>{typedDocumentIngestion.textPreview || "Текст не извлечен"}</p>
						<div className="recognition-notes">
							{(typedDocumentIngestion.routes ?? [])
								.slice(0, 4)
								.map((route) => (
									<span key={route.target}>
										{ingestionTargetLabels[route.target]}:{" "}
										{route.enabled ? "готово" : "пропустить"} · {route.reason}
									</span>
								))}
							{(typedDocumentIngestion.warnings ?? []).map((warning) => (
								<span key={warning}>{humanizeMigrationText(warning)}</span>
							))}
						</div>
					</div>
				) : null}
			</section>

			<div className="import-workbench">
				<textarea
					aria-label="Данные для проверки импорта"
					/* Поле стало пустым (раньше в нём лежали выдуманные пациенты),
                   поэтому нужна подсказка, что именно сюда вставлять. */
					placeholder={
						"Вставьте выгрузку из старой программы или из Excel.\nПо строке на пациента, поля через точку с запятой:\nФИО;Телефон;Дата рождения;Комментарий"
					}
					value={importText}
					onChange={(event: TextInputChangeEvent) => {
						setImportText(event.target.value);
						setImportPreview(null);
						setImportCommit(null);
						setImportIntake(null);
					}}
				/>
				<div className="import-tool-row">
					<SmartMicrophoneButton
						context="general"
						style={{
							color: "var(--slate-500)",
							borderColor: "var(--slate-300)",
						}}
						onResult={(text) => {
							setImportText((current: string) =>
								current ? `${current}\n${text}` : text,
							);
						}}
					/>
					<button
						className="secondary-button"
						type="button"
						onClick={() => {
							setImportSourceKind("image_ocr");
							setImportText(
								"Фото журнала -> OCR текст:\nИванов Иван Иванович +7 900 111-22-33 01.01.1980 первичный прием\nПетров Петр Петрович 8 927 333-44-55 12.02.1975 нужен вычет",
							);
							setImportPreview(null);
							setImportCommit(null);
							setImportIntake(null);
						}}
					>
						<ImageIcon aria-hidden="true" /> Фото журнала
					</button>
					<button
						className="primary-button"
						type="button"
						onClick={previewImport}
						disabled={isImportLoading || !patientImportInputReady}
						aria-busy={isImportLoading || undefined}
					>
						<UploadCloud aria-hidden="true" />{" "}
						{isImportLoading ? "Проверяю" : "Проверить"}
					</button>
				</div>
				{!patientImportInputReady ? (
					<p className="import-empty-guidance" role="status" aria-live="polite">
						Вставьте список пациентов, OCR журнала или надиктуйте импорт перед
						проверкой.
					</p>
				) : null}
			</div>

			{typedImportIntake ? (
				<div className="recognition-notes">
					{(typedImportIntake.recognitionNotes ?? []).map((note) => (
						<span key={note}>{note}</span>
					))}
				</div>
			) : null}

			{typedImportPreview ? (
				<div className="import-preview">
					<MigrationEntityStats
						totalLines={typedImportPreview.totalRows}
						readyRows={typedImportPreview.readyRows}
						warningRows={typedImportPreview.warningRows}
						blockedRows={typedImportPreview.blockedRows}
					/>
					<div className="import-actions">
						<button
							className="secondary-button"
							type="button"
							onClick={commitImport}
							disabled={
								isImportCommitting ||
								!patientImportInputReady ||
								typedImportPreview.readyRows === 0
							}
							aria-busy={isImportCommitting || undefined}
						>
							<CheckCircle2 aria-hidden="true" />{" "}
							{isImportCommitting ? "Записываю" : "Импортировать готовые"}
						</button>
						{importCommit ? (
							<span>
								Записано: {importCommit.importedCount}. Пропущено:{" "}
								{importCommit.skippedCount}.
							</span>
						) : (
							<span>В базу попадут только строки без предупреждений.</span>
						)}
					</div>
					<div className="import-rows">
						{(typedImportPreview.rows ?? []).map((row) => (
							<article
								className={`import-row import-${row?.status}`}
								key={row?.rowNumber ?? Math.random()}
							>
								<strong>{row?.fullName ?? `Строка ${row?.rowNumber}`}</strong>
								<span>
									{importRowStatusLabels[row?.status ?? ""] ?? row?.status}
								</span>
								<span>{row?.phone ?? "нет телефона"}</span>
								<span>{row?.birthDate ?? "нет даты"}</span>
								<p>
									{patientImportRowWarningText(row?.warnings ?? [], row?.notes)}
								</p>
							</article>
						))}
					</div>
				</div>
			) : null}
		</section>
	);
}

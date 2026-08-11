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
	ChevronLeft,
	ChevronRight,
	CircleStop,
	ClipboardCheck,
	Database,
	FileCheck2,
	FileText,
	FlipHorizontal,
	Gauge,
	Image as ImageIcon,
	Layers3,
	RefreshCw,
	RotateCcw,
	RotateCw,
	ScanSearch,
	Search,
	UploadCloud,
	UserCheck,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import type { KeyboardEvent } from "react";
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
	dicomFirstFrameFileFormatLabel,
	dicomFirstFrameImageTypeLabel,
	dicomSeriesDisplayText,
	dicomSeriesWarningText,
	formatBrowserImagingScanElapsed,
	humanizeMigrationText,
	type InputChangeEvent,
	imagingImportRowWarningText,
	importRowStatusLabels,
	localImagingModelWorkbenchTargetLabels,
	type MigrationOperatorActionScope,
	type MprAxisVisualizerStyle,
	migrationOperatorSourceBoundActions,
	migrationTriageStatusPriority,
	type PersistenceIntegrityReport,
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
export function SettingsImagingImportTab(props: Record<string, any>) {
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
	const imagingImportInputReady = (imagingImportText || "").trim().length > 0;
	const _patientImportInputReady = (importText || "").trim().length > 0;
	const localImagingFolderReady = (imagingFolderPath || "").trim().length > 0;
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
	const typedImagingSourceChoices = imagingSourceChoices as ImagingSourceKind[];
	const typedImagingImportPreview =
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
	const _typedImportSourceKinds = Object.keys(
		importSourceLabels ?? {},
	) as ImportSourceKind[];
	const _typedDocumentIngestionTargets = Object.keys(
		ingestionTargetLabels ?? {},
	) as DocumentIngestionTarget[];
	const _typedDocumentIngestion =
		documentIngestion as DocumentIngestionResponse | null;
	const _typedImportIntake = importIntake as ImportIntakeResponse | null;
	const _typedImportPreview = importPreview as ImportPreviewResponse | null;
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
	const localDicomFolderGuidanceId = "local-dicom-folder-guidance";
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
	const typedDicomLocalFolderDiscovery =
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
	const typedImagingFolderScan =
		imagingFolderScan as ImagingFolderScanResponse | null;
	const typedDicomFolderSeriesScan =
		dicomFolderSeriesScan as DicomFolderSeriesPreviewResponse | null;
	const typedDicomFolderWorkupPlan =
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
			className="import-studio imaging-import-studio"
			aria-label="Импорт снимков из внешних систем"
		>
			<div className="import-copy">
				<ImageIcon aria-hidden="true" />
				<div>
					<p className="eyebrow">Снимки и КТ</p>
					<h2>Снимки сначала проходят предпросмотр</h2>
					<p>
						Для RVG, ОПТГ, ТРГ, КТ, архивов снимков и папок обмена: вставь
						экспорт, таблицу, список файлов или текст из старой программы.
						Система сопоставит пациента, тип снимка, зуб, дату и путь к файлу до
						записи в карту.
					</p>
				</div>
			</div>

			<div
				role="toolbar"
				className="import-source-grid imaging-source-grid"
				aria-label="Источник снимков"
			>
				{typedImagingSourceChoices.map((kind) => (
					<button
						className={`source-card ${imagingImportSourceKind === kind ? "active" : ""}`}
						type="button"
						key={kind}
						aria-pressed={imagingImportSourceKind === kind}
						onClick={() => {
							setImagingImportSourceKind(kind);
							setImagingImportPreview(null);
							setImagingImportCommit(null);
						}}
					>
						<strong>{imagingSourceLabels[kind]}</strong>
						<span>{imagingSourceDetails[kind]}</span>
					</button>
				))}
			</div>

			<div className="import-workbench">
				<div className="folder-scan-row">
					<label>
						Папка обмена на сервере
						<input
							data-testid="imaging-folder-path-input"
							value={imagingFolderPath}
							onChange={(event: TextInputChangeEvent) => {
								const nextFolderPath = event.target.value;
								setImagingFolderPath(nextFolderPath);
								if (
									nextFolderPath.trim() !== localImagingFolderDraft?.folderPath
								) {
									stageLocalImagingFolderRecovery(nextFolderPath, {
										origin: "manual",
									});
								}
								setImagingFolderScan(null);
								setDicomFolderSeriesScan(null);
								setDicomFolderWorkupPlan(null);
								setDicomFirstFramePreview(null);
								setDicomLocalFolderDiscovery(null);
								setLocalImagingOrganizer(null);
							}}
							onBlur={(event: TextInputChangeEvent) => {
								rememberLocalImagingFolder(event.target.value, {
									origin: "manual",
								});
							}}
							placeholder="C:\Images или D:\OPG"
						/>
					</label>
					<input
						ref={browserDirectoryInputRef}
						data-testid="browser-local-imaging-folder-input"
						type="file"
						multiple
						style={{
							position: "absolute",
							opacity: 0,
							width: "1px",
							height: "1px",
							pointerEvents: "none",
						}}
						onChange={(event: InputChangeEvent) =>
							void handleBrowserDirectoryInputChange(event.target.files)
						}
					/>
					<input
						ref={browserImagingFilesInputRef}
						data-testid="browser-local-imaging-files-input"
						type="file"
						multiple
						style={{
							position: "absolute",
							opacity: 0,
							width: "1px",
							height: "1px",
							pointerEvents: "none",
						}}
						accept={browserImagingFileInputAccept}
						onChange={(event: InputChangeEvent) =>
							void handleBrowserDirectoryInputChange(event.target.files)
						}
					/>
					<button
						className="secondary-button"
						type="button"
						data-testid="browser-pick-local-imaging-folder"
						onClick={() => void pickBrowserImagingFolder()}
						disabled={isBrowserImagingFolderPicking}
						title={
							browserDirectoryPickerAvailable
								? "Выбрать локальную папку КТ или снимков в браузере"
								: "Использовать запасной выбор файлов браузера для локальных снимков"
						}
					>
						<UploadCloud aria-hidden="true" />{" "}
						{isBrowserImagingFolderPicking ? "Сканирую" : "Папка КТ"}
					</button>
					<button
						className="secondary-button"
						type="button"
						data-testid="browser-pick-local-imaging-files"
						onClick={pickBrowserImagingFiles}
						disabled={isBrowserImagingFolderPicking}
						title="Выбрать отдельные DICOM, RVG, JPG/PNG/TIFF, ZIP/RAR/7z или 3D-файлы"
					>
						<FileText aria-hidden="true" /> Файлы
					</button>
					{isBrowserImagingFolderPicking && browserImagingScanProgress ? (
						<button
							className="secondary-button browser-scan-stop-button"
							type="button"
							data-testid="browser-cancel-local-imaging-folder-scan"
							onClick={cancelBrowserImagingFolderScan}
						>
							<CircleStop aria-hidden="true" /> Остановить
						</button>
					) : null}
					{isLocalDicomOperationActive ? (
						<button
							className="secondary-button browser-scan-stop-button"
							type="button"
							data-testid="cancel-local-dicom-operation"
							onClick={cancelLocalDicomOperation}
						>
							<CircleStop aria-hidden="true" /> Остановить КТ
						</button>
					) : null}
					<button
						className="secondary-button"
						type="button"
						onClick={scanImagingFolder}
						aria-describedby={
							!localImagingFolderReady ? localDicomFolderGuidanceId : undefined
						}
						disabled={isImagingFolderScanning || !localImagingFolderReady}
					>
						<Search aria-hidden="true" />{" "}
						{isImagingFolderScanning ? "Сканирую" : "Сканировать папку"}
					</button>
					<button
						className="secondary-button"
						type="button"
						data-testid="find-local-dicom-folders"
						onClick={() => void discoverDicomFolders()}
						disabled={isDicomLocalDiscovering}
					>
						<ScanSearch aria-hidden="true" />{" "}
						{isDicomLocalDiscovering ? "Ищу" : "Найти снимки"}
					</button>
					<button
						className="secondary-button"
						type="button"
						data-testid="organize-local-imaging-sources"
						onClick={() => void organizeLocalImagingSources()}
						disabled={isLocalImagingOrganizing}
					>
						<Database aria-hidden="true" />{" "}
						{isLocalImagingOrganizing ? "Организую" : "Организовать КТ/3D"}
					</button>
					<button
						className="secondary-button"
						type="button"
						onClick={scanDicomFolderSeries}
						aria-describedby={
							!localImagingFolderReady ? localDicomFolderGuidanceId : undefined
						}
						disabled={isImagingFolderScanning || !localImagingFolderReady}
					>
						<Layers3 aria-hidden="true" />{" "}
						{isImagingFolderScanning ? "Читаю снимки" : "Метаданные снимков"}
					</button>
					<button
						className="secondary-button"
						type="button"
						onClick={() => void buildDicomFolderWorkupPlan()}
						aria-describedby={
							!localImagingFolderReady ? localDicomFolderGuidanceId : undefined
						}
						disabled={isDicomFolderWorkupPlanning || !localImagingFolderReady}
					>
						<Gauge aria-hidden="true" />{" "}
						{isDicomFolderWorkupPlanning ? "Готовлю" : "План КТ"}
					</button>
					<button
						className="secondary-button"
						type="button"
						data-testid="preview-dicom-first-frame"
						onClick={() => void previewDicomFirstFrame()}
						aria-describedby={
							!localImagingFolderReady ? localDicomFolderGuidanceId : undefined
						}
						disabled={isDicomFirstFramePreviewing || !localImagingFolderReady}
					>
						<ImageIcon aria-hidden="true" />{" "}
						{isDicomFirstFramePreviewing ? "Открываю" : "Первый срез"}
					</button>
				</div>
				{!localImagingFolderReady ? (
					<p
						className="dicom-action-guidance local-dicom-guidance"
						id={localDicomFolderGuidanceId}
						role="status"
						aria-live="polite"
					>
						Укажите путь к локальной папке со снимками или выберите КТ через
						браузер, чтобы открыть первый срез.
					</p>
				) : null}
				{browserImagingScanProgress ? (
					<div
						className={`browser-imaging-scan-progress ${browserImagingScanProgress.phase}`}
						data-testid="browser-imaging-scan-progress"
						role="status"
						aria-live="polite"
					>
						<div className="browser-picked-folder-head">
							<div>
								<strong>
									{browserImagingScanProgress.phase === "cancelled"
										? "Сканирование остановлено"
										: browserImagingScanProgress.phase === "done"
											? "Папка проверена"
											: "Браузер проверяет КТ/3D"}
								</strong>
								<span>
									{browserImagingScanProgress.currentItem ??
										"Интерфейс остается доступным: обработка идет короткими порциями."}
								</span>
							</div>
							{browserImagingScanProgress.phase === "scanning" ? (
								<button
									className="text-button"
									type="button"
									data-testid="browser-cancel-local-imaging-folder-scan-inline"
									onClick={cancelBrowserImagingFolderScan}
								>
									Остановить
								</button>
							) : null}
						</div>
						<div className="browser-picked-folder-stats">
							<span>
								файлов: {browserImagingScanProgress.scannedFiles}/
								{browserImagingScanProgress.fileLimit}
							</span>
							<span>
								папок: {browserImagingScanProgress.scannedFolders}/
								{browserImagingScanProgress.folderLimit}
							</span>
							<span>
								похоже на снимки: {browserImagingScanProgress.dicomLikeFiles}
							</span>
							<span>3D-моделей: {browserImagingScanProgress.modelFiles}</span>
							<span>архивов: {browserImagingScanProgress.archiveFiles}</span>
							<span>
								{formatByteSize(browserImagingScanProgress.totalBytes)}
							</span>
							<span>
								сигнатур: до {browserImagingScanProgress.magicReadLimit}
							</span>
							<span>шагов: {browserImagingScanProgress.processedUnits}</span>
							<span>
								время:{" "}
								{formatBrowserImagingScanElapsed(
									browserImagingScanProgress.elapsedMs,
								)}
							</span>
						</div>
						<small>
							Начато {formatTime(browserImagingScanProgress.startedAt)} ·
							обновлено {formatTime(browserImagingScanProgress.updatedAt)}
						</small>
					</div>
				) : null}
				{localImagingFolderDraft ? (
					<div
						className="local-imaging-folder-recovery"
						data-testid="local-imaging-folder-recovery"
					>
						<div>
							<strong>{localImagingFolderDraft.safeDisplayName}</strong>
							<span>
								папка восстановлена:{" "}
								{humanizeMigrationText(localImagingFolderDraft.sourceLabel)} ·
								сохранено {formatTime(localImagingFolderDraft.savedAt)}
							</span>
						</div>
						<button
							className="text-button"
							type="button"
							onClick={clearLocalImagingFolderRecovery}
						>
							Очистить
						</button>
					</div>
				) : null}
				{browserPickedImagingFolder ? (
					<section
						className="browser-picked-folder-result"
						data-testid="browser-picked-imaging-folder-result"
						aria-label="Предпросмотр локальной папки снимков браузера"
					>
						<div className="browser-picked-folder-head">
							<div>
								<strong>{browserPickedImagingFolder.safeDisplayName}</strong>
								<span>
									{humanizeMigrationText(
										browserPickedImagingFolder.sourceLabel,
									)}{" "}
									· метка папки {browserPickedImagingFolder.folderFingerprint} ·{" "}
									{formatTime(browserPickedImagingFolder.createdAt)}
								</span>
							</div>
							<button
								className="text-button"
								type="button"
								onClick={clearBrowserPickedImagingFolderPreview}
							>
								Очистить
							</button>
						</div>
						<div className="browser-picked-folder-stats">
							<span>файлов: {browserPickedImagingFolder.scannedFiles}</span>
							<span>папок: {browserPickedImagingFolder.scannedFolders}</span>
							<span>
								похоже на снимки: {browserPickedImagingFolder.dicomLikeFiles}
							</span>
							<span>архивов: {browserPickedImagingFolder.archiveFiles}</span>
							<span>3D-моделей: {browserPickedImagingFolder.modelFiles}</span>
							<span>
								{formatByteSize(browserPickedImagingFolder.totalBytes)}
							</span>
						</div>
						<p>
							{humanizeMigrationText(browserPickedImagingFolder.nextAction)}
						</p>
						{(browserPickedImagingFolder.warnings as string[])
							.slice(0, 3)
							.map((warning) => (
								<small key={warning}>{humanizeMigrationText(warning)}</small>
							))}
					</section>
				) : null}
				{typedDicomLocalFolderDiscovery ? (
					<section
						className="dicom-discovery-result"
						data-testid="local-dicom-discovery-result"
						aria-label="Поиск локальной папки снимков"
					>
						<div className="dicom-discovery-head">
							<strong>
								Найдено кандидатов:{" "}
								{typedDicomLocalFolderDiscovery.candidates.length} /
								просканировано папок:{" "}
								{typedDicomLocalFolderDiscovery.scannedFolders}
							</strong>
							<span>
								{humanizeMigrationText(
									typedDicomLocalFolderDiscovery.nextAction,
								)}
							</span>
						</div>
						<div className="dicom-discovery-grid">
							{typedDicomLocalFolderDiscovery.candidates
								.slice(0, 6)
								.map((candidate) => (
									<article key={candidate.folderPath}>
										<strong>{candidate.safeDisplayName}</strong>
										<span>
											{humanizeMigrationText(candidate.sourceLabel)} · метка
											папки {candidate.folderFingerprint.toUpperCase()} ·
											вложенность {candidate.depth}
										</span>
										<span>
											Путь к папке и имена, похожие на данные пациента, скрыты
											до выбора
										</span>
										<small>
											{Math.round(candidate.confidence * 100)}% / снимков{" "}
											{candidate.dicomLikeFiles} / архивов{" "}
											{candidate.archivesFound}
										</small>
										<button
											className="text-button"
											type="button"
											onClick={() => {
												rememberLocalImagingFolder(candidate.folderPath, {
													safeDisplayName: candidate.safeDisplayName,
													sourceLabel: candidate.sourceLabel,
													sourceKind: candidate.sourceKind,
													folderFingerprint: candidate.folderFingerprint,
													origin: "discovery",
												});
												setDicomFolderSeriesScan(null);
												setDicomFolderWorkupPlan(null);
												setDicomFirstFramePreview(null);
												setImagingFolderScan(null);
												setLocalImagingOrganizer(null);
											}}
										>
											Выбрать папку
										</button>
										<button
											className="text-button"
											type="button"
											data-testid="prepare-dicom-discovery-workbench"
											disabled={
												isDicomFolderWorkupPlanning || isDicomWorkbenchBuilding
											}
											onClick={() =>
												void prepareDicomWorkbenchFromFolder(
													candidate.folderPath,
													"dicom_discovery_quick_workbench",
													{
														safeDisplayName: candidate.safeDisplayName,
														sourceLabel: candidate.sourceLabel,
														sourceKind: candidate.sourceKind,
														folderFingerprint: candidate.folderFingerprint,
														origin: "discovery",
													},
												)
											}
										>
											Подготовить КТ
										</button>
										<button
											className="text-button"
											type="button"
											data-testid="preview-dicom-discovery-first-frame"
											disabled={isDicomFirstFramePreviewing}
											onClick={() => {
												rememberLocalImagingFolder(candidate.folderPath, {
													safeDisplayName: candidate.safeDisplayName,
													sourceLabel: candidate.sourceLabel,
													sourceKind: candidate.sourceKind,
													folderFingerprint: candidate.folderFingerprint,
													origin: "discovery",
												});
												void previewDicomFirstFrame(candidate.folderPath, {
													safeDisplayName: candidate.safeDisplayName,
													sourceLabel: candidate.sourceLabel,
													sourceKind: candidate.sourceKind,
													folderFingerprint: candidate.folderFingerprint,
													origin: "discovery",
												});
											}}
										>
											Первый срез
										</button>
									</article>
								))}
						</div>
						{typedDicomLocalFolderDiscovery.warnings
							.slice(0, 4)
							.map((warning) => (
								<small key={warning}>{humanizeMigrationText(warning)}</small>
							))}
					</section>
				) : null}
				{typedLocalImagingOrganizer ? (
					<section
						className="local-imaging-organizer-result"
						data-testid="local-imaging-organizer-result"
						aria-label="Органайзер локальных снимков"
					>
						<div className="dicom-discovery-head">
							<strong>
								Органайзер: кейсов {typedLocalImagingOrganizer.cases.length} /
								просканировано папок {typedLocalImagingOrganizer.scannedFolders}
							</strong>
							<span>
								{humanizeMigrationText(typedLocalImagingOrganizer.nextAction)}
							</span>
						</div>
						<div className="local-imaging-case-grid">
							{typedLocalImagingOrganizer.cases.slice(0, 6).map((caseItem) => (
								<article
									className={`local-imaging-case local-action-${caseItem.recommendedAction}`}
									key={caseItem.id}
								>
									<div>
										<strong>{caseItem.safeDisplayName}</strong>
										<span>
											{humanizeMigrationText(caseItem.sourceLabel)} · метка
											папки {caseItem.folderFingerprint.toUpperCase()}
										</span>
										<span>
											Путь к папке и имена, похожие на данные пациента, скрыты
											до выбора
										</span>
									</div>
									<div className="local-imaging-case-metrics">
										<span>
											{Math.round(caseItem.combinedConfidence * 100)}%
										</span>
										<span>{caseItem.dicomLikeFiles} снимков</span>
										<span>{caseItem.modelFiles} 3D</span>
										<span>архивов: {caseItem.archiveFiles}</span>
									</div>
									<small>
										{
											localImagingOrganizerActionLabels[
												caseItem.recommendedAction
											]
										}
									</small>
									{caseItem.modelCandidates.length ? (
										<div className="local-imaging-model-list">
											{caseItem.modelCandidates.slice(0, 3).map((model) => (
												<span key={`${caseItem.id}-${model.filePath}`}>
													{model.format.toUpperCase()} ·{" "}
													{localImagingModelRoleLabels[model.role] ??
														model.role}{" "}
													· {Math.round(model.confidence * 100)}%
												</span>
											))}
										</div>
									) : null}
									{caseItem.modelWorkbenchManifest.totalModels > 0 ? (
										<div className="local-imaging-model-workbench">
											<strong>
												{localImagingModelWorkbenchTargetLabels[
													caseItem.modelWorkbenchManifest.recommendedTarget
												] ??
													caseItem.modelWorkbenchManifest
														.recommendedTarget}{" "}
												· КТ-поверхностей{" "}
												{caseItem.modelWorkbenchManifest.ctSurfaceModels} · до{" "}
												{caseItem.modelWorkbenchManifest.largestModelMb} МБ
											</strong>
											{caseItem.modelWorkbenchManifest.items
												.slice(0, 3)
												.map((item) => (
													<span
														key={`${caseItem.id}-workbench-${item.fileName}`}
													>
														{localImagingModelRoleLabels[item.role] ??
															item.role}
														:{" "}
														{localImagingModelWorkbenchTargetLabels[
															item.loadTarget
														] ?? item.loadTarget}{" "}
														· {item.sizeMb} МБ
													</span>
												))}
											<small>
												{caseItem.modelWorkbenchManifest.nextAction}
											</small>
										</div>
									) : null}
									<button
										className="text-button"
										type="button"
										onClick={() => {
											rememberLocalImagingFolder(caseItem.folderPath, {
												safeDisplayName: caseItem.safeDisplayName,
												sourceLabel: caseItem.sourceLabel,
												sourceKind: caseItem.sourceKind,
												folderFingerprint: caseItem.folderFingerprint,
												origin: "organizer",
											});
											setDicomFolderSeriesScan(null);
											setDicomFolderWorkupPlan(null);
											setDicomFirstFramePreview(null);
											setImagingFolderScan(null);
											setDicomLocalFolderDiscovery(null);
										}}
									>
										Выбрать папку
									</button>
									{caseItem.recommendedAction !== "review_3d_models" ? (
										<button
											className="text-button"
											type="button"
											data-testid="prepare-local-dicom-workbench"
											disabled={
												isDicomFolderWorkupPlanning || isDicomWorkbenchBuilding
											}
											onClick={() =>
												void prepareDicomWorkbenchFromFolder(
													caseItem.folderPath,
													"local_organizer_quick_workbench",
													{
														safeDisplayName: caseItem.safeDisplayName,
														sourceLabel: caseItem.sourceLabel,
														sourceKind: caseItem.sourceKind,
														folderFingerprint: caseItem.folderFingerprint,
														origin: "organizer",
													},
												)
											}
										>
											Подготовить КТ
										</button>
									) : null}
									{caseItem.dicomLikeFiles > 0 ? (
										<button
											className="text-button"
											type="button"
											data-testid="preview-local-dicom-first-frame"
											disabled={isDicomFirstFramePreviewing}
											onClick={() => {
												rememberLocalImagingFolder(caseItem.folderPath, {
													safeDisplayName: caseItem.safeDisplayName,
													sourceLabel: caseItem.sourceLabel,
													sourceKind: caseItem.sourceKind,
													folderFingerprint: caseItem.folderFingerprint,
													origin: "organizer",
												});
												void previewDicomFirstFrame(caseItem.folderPath, {
													safeDisplayName: caseItem.safeDisplayName,
													sourceLabel: caseItem.sourceLabel,
													sourceKind: caseItem.sourceKind,
													folderFingerprint: caseItem.folderFingerprint,
													origin: "organizer",
												});
											}}
										>
											Первый срез
										</button>
									) : null}
								</article>
							))}
						</div>
						{(typedLocalImagingOrganizer?.warnings ?? [])
							.slice(0, 4)
							.map((warning) => (
								<small key={warning}>{humanizeMigrationText(warning)}</small>
							))}
					</section>
				) : null}
				{typedImagingFolderScan ? (
					<div className="recognition-notes">
						<span>
							Найдено файлов: {typedImagingFolderScan.filesFound}. В
							предпросмотре: {typedImagingFolderScan.preview?.totalRows ?? 0}.
						</span>
						{(typedImagingFolderScan.warnings ?? []).map((warning) => (
							<span key={warning}>{humanizeMigrationText(warning)}</span>
						))}
					</div>
				) : null}
				{typedDicomFolderSeriesScan ? (
					<div className="recognition-notes">
						<span>
							Метаданные снимков: файлов {typedDicomFolderSeriesScan.filesFound}
							, прочитано {typedDicomFolderSeriesScan.filesParsed}, строк
							метаданных {typedDicomFolderSeriesScan.metadataRows}, серий{" "}
							{typedDicomFolderSeriesScan.preview?.totalSeries ?? 0}.
						</span>
						{(typedDicomFolderSeriesScan.warnings ?? [])
							.slice(0, 5)
							.map((warning) => (
								<span key={warning}>{humanizeMigrationText(warning)}</span>
							))}
					</div>
				) : null}
				{typedDicomFolderWorkupPlan ? (
					<section
						className="dicom-folder-workup-result"
						aria-label="План разбора папки снимков"
					>
						<div className="dicom-folder-workup-head">
							<strong>
								План: серий {typedDicomFolderWorkupPlan.selectedSeriesCount} /
								файлов {typedDicomFolderWorkupPlan.folder?.filesParsed ?? 0}
							</strong>
							<span>
								{humanizeMigrationText(typedDicomFolderWorkupPlan.nextAction)}
							</span>
						</div>
						<div className="dicom-folder-workup-plans">
							{(typedDicomFolderWorkupPlan.plans ?? [])
								.slice(0, 4)
								.map((plan) => (
									<article
										className={`workup-${plan?.recommendedPath}`}
										key={plan?.series?.id ?? Math.random()}
									>
										<strong>
											{dicomFolderWorkupPathLabels[plan?.recommendedPath ?? ""]}
										</strong>
										<span>
											{plan?.series?.modality ?? "тип не указан"} / файлов{" "}
											{plan?.series?.fileCount ?? 0} / готовность{" "}
											{plan?.readiness?.readinessScore ?? 0}%
										</span>
										<small>
											{dicomLabel(
												dicomTextureStrategyLabels,
												plan?.renderCachePlan?.textureStrategy,
												"план загрузки",
											)}{" "}
											/ первый показ{" "}
											{plan?.renderCachePlan?.firstPaintBudgetMs ?? 0} мс /
											память {plan?.renderCachePlan?.gpuMemoryBudgetMb ?? 0} МБ
										</small>
										<small>{humanizeMigrationText(plan?.nextAction)}</small>
									</article>
								))}
						</div>
						{(typedDicomFolderWorkupPlan.warnings ?? [])
							.slice(0, 4)
							.map((warning) => (
								<small key={warning}>{humanizeMigrationText(warning)}</small>
							))}
					</section>
				) : null}
				{dicomFirstFramePreview ? (
					<section
						className={`dicom-first-frame-preview preview-${dicomFirstFramePreview.status}`}
						data-testid="dicom-first-frame-preview-result"
						aria-label="Предпросмотр первого среза снимков"
					>
						<div className="dicom-first-frame-head">
							<div>
								<strong>
									Первый срез: только ориентация, не диагностика:{" "}
									{dicomFirstFrameStatusLabels[dicomFirstFramePreview.status] ??
										dicomFirstFramePreview.status}
								</strong>
								<span>
									{dicomFirstFramePreview.sourceWidth &&
									dicomFirstFramePreview.sourceHeight
										? `${dicomFirstFramePreview.sourceWidth}x${dicomFirstFramePreview.sourceHeight}`
										: "Нет кадра снимка"}{" "}
									/{" "}
									{dicomFirstFrameFileFormatLabel(
										dicomFirstFramePreview.transferSyntaxUid,
									)}
								</span>
							</div>
							<small>{dicomFirstFramePreview.nextAction}</small>
						</div>
						{dicomFirstFramePreview.imageDataUrl ? (
							<>
								<div
									role="toolbar"
									className="dicom-first-frame-tools"
									aria-label="Инструменты предпросмотра первого среза"
								>
									<button
										className="viewer-tool-button"
										type="button"
										title="Повернуть влево"
										aria-label="Повернуть первый срез влево"
										onClick={() =>
											updateDicomFirstFrameViewerState((state) => ({
												...state,
												rotationDeg: state.rotationDeg - 90,
											}))
										}
									>
										<RotateCcw aria-hidden="true" />
									</button>
									<button
										className="viewer-tool-button"
										type="button"
										title="Повернуть вправо"
										aria-label="Повернуть первый срез вправо"
										onClick={() =>
											updateDicomFirstFrameViewerState((state) => ({
												...state,
												rotationDeg: state.rotationDeg + 90,
											}))
										}
									>
										<RotateCw aria-hidden="true" />
									</button>
									<button
										className={`viewer-tool-button ${typedDicomFirstFrameViewerState.flipHorizontal ? "active" : ""}`}
										type="button"
										title="Отразить"
										aria-label="Отразить первый срез"
										aria-pressed={
											typedDicomFirstFrameViewerState.flipHorizontal
										}
										onClick={() =>
											updateDicomFirstFrameViewerState((state) => ({
												...state,
												flipHorizontal: !state.flipHorizontal,
											}))
										}
									>
										<FlipHorizontal aria-hidden="true" />
									</button>
									<button
										className={`viewer-tool-button ${typedDicomFirstFrameViewerState.inverted ? "active" : ""}`}
										type="button"
										title="Инвертировать"
										aria-label="Инвертировать первый срез"
										aria-pressed={typedDicomFirstFrameViewerState.inverted}
										onClick={() =>
											updateDicomFirstFrameViewerState((state) => ({
												...state,
												inverted: !state.inverted,
											}))
										}
									>
										+/-
									</button>
									<button
										className="viewer-tool-button"
										type="button"
										title="Уменьшить"
										aria-label="Уменьшить первый срез"
										onClick={() =>
											updateDicomFirstFrameViewerState((state) => ({
												...state,
												zoom: Math.max(0.7, state.zoom - 0.1),
											}))
										}
									>
										<ZoomOut aria-hidden="true" />
									</button>
									<button
										className="viewer-tool-button"
										type="button"
										title="Увеличить"
										aria-label="Увеличить первый срез"
										onClick={() =>
											updateDicomFirstFrameViewerState((state) => ({
												...state,
												zoom: Math.min(2.2, state.zoom + 0.1),
											}))
										}
									>
										<ZoomIn aria-hidden="true" />
									</button>
									<button
										className="viewer-tool-button"
										type="button"
										title="Сбросить"
										aria-label="Сбросить инструменты первого среза"
										onClick={() =>
											setDicomFirstFrameViewerState(
												typedDefaultDicomFirstFrameViewerState,
											)
										}
									>
										<RefreshCw aria-hidden="true" />
									</button>
								</div>
								{dicomFirstFrameSelectableCount > 1 &&
								typeof dicomFirstFrameCurrentIndex === "number" ? (
									<div
										className="dicom-first-frame-slice-controls"
										data-testid="dicom-first-frame-slice-controls"
									>
										<button
											className="viewer-tool-button"
											type="button"
											title="Предыдущий срез"
											aria-label="Показать предыдущий срез снимков"
											disabled={!dicomFirstFrameCanSelectPrevious}
											onClick={() =>
												previewDicomFirstFrameSlice(
													dicomFirstFrameCurrentIndex - 1,
												)
											}
										>
											<ChevronLeft aria-hidden="true" />
										</button>
										<label>
											<span>
												Срез {dicomFirstFrameCurrentIndex + 1} /{" "}
												{dicomFirstFrameSelectableCount}
											</span>
											<input
												aria-label="Выбрать срез снимков"
												type="range"
												min="0"
												max={dicomFirstFrameSliceMaxIndex}
												step="1"
												value={dicomFirstFrameCurrentIndex}
												disabled={isDicomFirstFramePreviewing}
												onChange={(event: InputChangeEvent) =>
													previewDicomFirstFrameSlice(
														Number(event.target.value),
													)
												}
											/>
										</label>
										<button
											className="viewer-tool-button"
											type="button"
											title="Следующий срез"
											aria-label="Показать следующий срез снимков"
											disabled={!dicomFirstFrameCanSelectNext}
											onClick={() =>
												previewDicomFirstFrameSlice(
													dicomFirstFrameCurrentIndex + 1,
												)
											}
										>
											<ChevronRight aria-hidden="true" />
										</button>
										{dicomFirstFrameLandmarkSlices.length ? (
											<div
												role="toolbar"
												className="dicom-first-frame-slice-presets"
												data-testid="dicom-first-frame-slice-presets"
												aria-label="Быстрые срезы снимков"
											>
												{dicomFirstFrameLandmarkSlices.map(
													({ label, targetIndex }) => (
														<button
															className={
																dicomFirstFrameCurrentIndex === targetIndex
																	? "active"
																	: ""
															}
															type="button"
															key={`${label}-${targetIndex}`}
															title={`Показать ${label}: срез ${targetIndex + 1}`}
															aria-label={`Показать опорный срез снимков ${label}: ${targetIndex + 1} из ${dicomFirstFrameSelectableCount}`}
															disabled={
																isDicomFirstFramePreviewing ||
																dicomFirstFrameCurrentIndex === targetIndex
															}
															onClick={() =>
																previewDicomFirstFrameSlice(targetIndex)
															}
														>
															{label}
															<small>{targetIndex + 1}</small>
														</button>
													),
												)}
											</div>
										) : null}
									</div>
								) : null}
								<div className="dicom-first-frame-sliders">
									<label>
										Яркость
										<input
											min="0.65"
											max="1.6"
											step="0.05"
											type="range"
											value={typedDicomFirstFrameViewerState.brightness}
											onChange={(event) =>
												updateDicomFirstFrameViewerNumber("brightness", event)
											}
										/>
									</label>
									<label>
										Контраст
										<input
											min="0.75"
											max="1.8"
											step="0.05"
											type="range"
											value={typedDicomFirstFrameViewerState.contrast}
											onChange={(event) =>
												updateDicomFirstFrameViewerNumber("contrast", event)
											}
										/>
									</label>
								</div>
								<div className="dicom-first-frame-image-wrap">
									<img
										src={dicomFirstFramePreview.imageDataUrl}
										alt="Предпросмотр ориентации первого среза снимков"
										decoding="async"
										style={dicomFirstFrameImageStyle}
									/>
								</div>
							</>
						) : null}
						<div className="dicom-first-frame-facts">
							<span>
								{dicomFirstFrameImageTypeLabel(
									dicomFirstFramePreview.photometricInterpretation,
								)}
							</span>
							<span>
								{dicomFirstFramePreview.bitsAllocated
									? `глубина ${dicomFirstFramePreview.bitsAllocated} бит`
									: "глубина не указана"}
							</span>
							<span>
								исходная яркость: центр{" "}
								{Math.round(dicomFirstFramePreview.windowCenter ?? 0)} /
								диапазон {Math.round(dicomFirstFramePreview.windowWidth ?? 0)}
							</span>
							{typeof dicomFirstFrameCurrentIndex === "number" &&
							dicomFirstFrameSelectableCount > 0 ? (
								<span>
									срез {dicomFirstFrameCurrentIndex + 1}/
									{dicomFirstFrameSelectableCount}
								</span>
							) : null}
							<span>не сохранено</span>
							<span>только инструменты предпросмотра</span>
						</div>
						{typedDicomFirstFramePreview?.warnings
							.slice(0, 4)
							.map((warning: string) => (
								<small key={warning}>{warning}</small>
							))}
					</section>
				) : null}
				<textarea
					aria-label="Данные импорта снимков"
					value={imagingImportText}
					onChange={(event: TextInputChangeEvent) => {
						setImagingImportText(event.target.value);
						setImagingImportPreview(null);
						setImagingImportCommit(null);
						setDicomSeriesPreview(null);
						setDicomFolderSeriesScan(null);
						setDicomFolderWorkupPlan(null);
					}}
				/>
				<div className="import-tool-row">
					<button
						className="secondary-button"
						type="button"
						onClick={() => {
							setImagingImportSourceKind("dicom_file");
							setImagingImportText(
								"Пациент;Телефон;Модальность;КодИсследования;КодСерии;НомерСреза;ОписаниеСерии;Дата;Путь\nИванова Марина Сергеевна;+7 927 111-22-33;КЛКТ;1.2.643.5.1.20260512.1;1.2.643.5.1.20260512.1.3;1;КТ нижней челюсти;12.05.2026;D:\\\\KLKT\\\\ivanova_2026_05_12\\\\IMG0001.dcm\nИванова Марина Сергеевна;+7 927 111-22-33;КЛКТ;1.2.643.5.1.20260512.1;1.2.643.5.1.20260512.1.3;2;КТ нижней челюсти;12.05.2026;D:\\\\KLKT\\\\ivanova_2026_05_12\\\\IMG0002.dcm\nИванова Марина Сергеевна;+7 927 111-22-33;ТРГ;1.2.643.5.1.20260510.7;1.2.643.5.1.20260510.7.1;1;боковая ТРГ;10.05.2026;D:\\\\CEPH\\\\ivanova_ceph.ima\nПетров Алексей Николаевич;+7 927 555-19-40;ОПТГ;1.2.643.5.1.20260510.9;1.2.643.5.1.20260510.9.1;1;панорамный снимок;10.05.2026;D:\\\\OPG\\\\petrov_opg.png",
							);
							setImagingImportPreview(null);
							setImagingImportCommit(null);
							setDicomSeriesPreview(null);
							setDicomFolderSeriesScan(null);
							setDicomFolderWorkupPlan(null);
						}}
					>
						<FileCheck2 aria-hidden="true" /> Пример КТ/ОПТГ/ТРГ
					</button>
					<button
						className="secondary-button"
						type="button"
						onClick={() => void previewDicomSeries()}
						disabled={isDicomSeriesPreviewLoading || !imagingImportInputReady}
					>
						<Layers3 aria-hidden="true" />{" "}
						{isDicomSeriesPreviewLoading ? "Группирую" : "Проверить серии"}
					</button>
					<button
						className="primary-button"
						type="button"
						onClick={previewImagingImport}
						disabled={isImagingImportLoading || !imagingImportInputReady}
						aria-busy={isImagingImportLoading || undefined}
					>
						<UploadCloud aria-hidden="true" />{" "}
						{isImagingImportLoading ? "Проверяю" : "Проверить снимки"}
					</button>
				</div>
				{!imagingImportInputReady ? (
					<p className="import-empty-guidance" role="status" aria-live="polite">
						Вставьте строки со снимками или выберите пример КТ/ОПТГ/ТРГ перед
						проверкой.
					</p>
				) : null}
			</div>

			{dicomSeriesPreview ? (
				<div className="dicom-series-result">
					<div className="dicom-series-stats">
						<span>{dicomSeriesPreview.totalRows} файлов</span>
						<span>{dicomSeriesPreview.totalSeries} серий</span>
						<span>{dicomSeriesPreview.readySeries} готово</span>
						<span>{dicomSeriesPreview.warningSeries} предупреждения</span>
						<span>{dicomSeriesPreview.blockedSeries} нужно действие</span>
					</div>
					<div className="dicom-series-list">
						{(typedDicomSeriesPreviewSeries ?? []).slice(0, 6).map((series) => (
							<article
								className={`dicom-series-row dicom-series-${series?.status}`}
								key={series?.id ?? Math.random()}
							>
								<div>
									<strong>{series?.patientName ?? "Пациент ?"}</strong>
									<span>
										{series?.kind
											? imagingKindLabels[series.kind]
											: "тип не указан"}{" "}
										· {series?.modality ?? "модальность не указана"} ·{" "}
										{series?.fileCount ?? 0} файлов
									</span>
								</div>
								<div>
									<span>
										{importRowStatusLabels[series?.status ?? ""] ??
											series?.status}{" "}
										· {dicomSeriesViewerLabels[series?.recommendedViewer ?? ""]}
									</span>
									<small>
										{series?.mprReadiness?.recommendedLayout} ·{" "}
										{series?.mprReadiness?.canOpenMpr
											? "предпросмотр КТ-срезов готов"
											: series?.mprReadiness?.nextAction}
									</small>
									<small className="dicom-series-resource">
										{
											mprLoadStrategyLabels[
												series?.mprReadiness?.resourcePolicy?.loadStrategy ?? ""
											]
										}{" "}
										/{" "}
										{series?.mprReadiness?.resourcePolicy?.estimatedMemoryMb ??
											0}{" "}
										МБ /{" "}
										{
											mprResourceTierLabels[
												series?.mprReadiness?.resourcePolicy?.requiredTier ?? ""
											]
										}
									</small>
									<small>{dicomSeriesDisplayText(series)}</small>
								</div>
								<p>{dicomSeriesWarningText(series?.warnings ?? [])}</p>
							</article>
						))}
					</div>
				</div>
			) : null}

			{typedImagingImportPreview ? (
				<div className="import-preview">
					<MigrationEntityStats
						totalLines={typedImagingImportPreview.totalRows}
						readyRows={typedImagingImportPreview.readyRows}
						warningRows={typedImagingImportPreview.warningRows}
						blockedRows={typedImagingImportPreview.blockedRows}
					/>
					<div className="import-actions">
						<button
							className="secondary-button"
							type="button"
							onClick={commitImagingImport}
							disabled={
								isImagingImportCommitting ||
								!imagingImportInputReady ||
								typedImagingImportPreview.readyRows === 0
							}
							aria-busy={isImagingImportCommitting || undefined}
						>
							<CheckCircle2 aria-hidden="true" />{" "}
							{isImagingImportCommitting ? "Записываю" : "Привязать готовые"}
						</button>
						{imagingImportCommit ? (
							<span>
								Привязано: {imagingImportCommit.importedCount}. Пропущено:{" "}
								{imagingImportCommit.skippedCount}.
							</span>
						) : (
							<span>
								В карту попадут только строки с найденным пациентом, типом
								снимка и путем к файлу.
							</span>
						)}
					</div>
					<div className="import-rows">
						{(typedImagingImportPreview.rows ?? []).map((row) => (
							<article
								className={`import-row import-${row?.status}`}
								key={row?.rowNumber ?? Math.random()}
							>
								<strong>
									{row?.patientName ?? `Строка ${row?.rowNumber}`}
								</strong>
								<span>
									{importRowStatusLabels[row?.status ?? ""] ?? row?.status}
								</span>
								<span>
									{row?.kind ? imagingKindLabels[row.kind] : "тип не найден"}
								</span>
								<span>
									{row?.toothCode ?? row?.region ?? "область не найдена"}
								</span>
								<p>
									{imagingImportRowWarningText(
										row?.warnings ?? [],
										row?.filePath,
									)}
								</p>
							</article>
						))}
					</div>
				</div>
			) : null}
		</section>
	);
}

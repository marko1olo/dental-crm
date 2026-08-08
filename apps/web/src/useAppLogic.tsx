import {
	type CommunicationTaskOutcome,
	type Dashboard,
	type DenteTelegramChatLinkPublic,
	documentFactoryGroups,
	type ImagingStudyKind,
	type LocalBridgeReadinessResponse,
	type LocalBridgeUsePlansResponse,
	type StaffRole,
} from "@dental/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	type AppointmentScheduleDraft,
	appointmentReadinessLabels,
	appointmentScheduleDraftFromAppointment,
	type BrowserDirectoryPickerWindow,
	browserCapabilityFailureMessage,
	buildClinicProfileUpdatePayload,
	type ClinicProfileDraft,
	clinicLegalMissingFields,
	clinicLegalReadinessPercent,
	clinicProfileDraftFromProfile,
	clinicProfileDraftSignature,
	clinicProfileEndpoint,
	type DicomFirstFramePreviewRequestContext,
	defaultDicomFirstFrameViewerState,
	defaultImagingViewerState,
	defaultStaffScheduleDraft,
	defaultUiLanguageOption,
	defaultUiPreferences,
	dicomFirstFrameStatusLabels,
	documentDetectedKindLabel,
	documentIngestionQualityLabels,
	documentIssueSignatureModeLabels,
	documentVoidReasonLabels,
	emptyClinicProfileDraft,
	formatDateTime,
	formatShortDate,
	formatTime,
	fromDateTimeLocalValue,
	type ImagingViewerSaveState,
	imagingSourceChoices,
	importSourceLabels,
	ingestionTargetLabels,
	isTelegramOutboxItemDueForUi,
	loadBrowserPickedImagingFolderPreview,
	loadLocalDicomWorkbenchDraft,
	loadLocalImagingFolderDraft,
	loadOnboardingDismissalState,
	loadServerUiPreferences,
	loadUiPreferences,
	loadVisitLocalDraft,
	medicalDocumentReleaseChannelLabels,
	money,
	newAppointmentDraftFromDashboard,
	normalizedAppointmentStatus,
	normalizedAppointmentStatusFilter,
	normalizedClinicalRuleAction,
	normalizedClinicalRuleSeverity,
	normalizedDentalSpecialty,
	normalizedDocumentIssueSignatureMode,
	normalizedDocumentKind,
	normalizedDocumentVoidReasonCode,
	normalizedMedicalDocumentReleaseChannel,
	normalizedOutpatient025uDemographicCode,
	normalizedPatientIntakePregnancyStatus,
	normalizedPaymentRefundCorrectionAction,
	normalizedPaymentRefundCorrectionMethod,
	normalizedPostVisitCareTopic,
	normalizedProcedureSpecificConsentProcedure,
	normalizedServiceCategory,
	normalizedStaffRole,
	normalizedTaxApplicationDeliveryChannel,
	normalizedTaxApplicationForm,
	normalizedTaxApplicationRelationshipSelect,
	normalizedTelegramBotMode,
	normalizedTelegramLinkSubjectType,
	normalizedTelegramOutboxStatusFilter,
	normalizedTelegramOutboxTemplateFilter,
	normalizedTelegramPrivacyMode,
	normalizedTreatmentPlanAcceptanceVariant,
	normalizedXrayPregnancyStatus,
	normalizedXrayPriority,
	normalizedXrayStudyType,
	normalizeOptionalWorkingDaysDraft,
	normalizePersistenceHealth,
	normalizeUiLanguageInput,
	normalizeWorkingDaysDraft,
	type OnboardingStep,
	onboardingSteps,
	onboardingTelegramVisualCardKeys,
	operatorWorkflowFailureMessage,
	type PersistenceHealth,
	type PersistenceIntegrityReport,
	patientInsightRiskLabels,
	patientIntakePregnancyStatusOptions,
	patientName,
	persistUiPreferences,
	photoVideoMaterialOptions,
	procedureSpecificConsentProcedureOptions,
	recommendedActionPriorityLabels,
	responseErrorMessage,
	roleFocusOrder,
	type StaffScheduleDraft,
	saveOnboardingDismissed,
	saveServerUiPreferences,
	saveUiPreferences,
	saveVisitLocalDraft,
	settingsTabFromHash,
	settingsTabs,
	smartImportModeLabels,
	speechGatewayCanUpload,
	speechProviderConnectorLabels,
	staffScheduleDraftFromWorkingHours,
	taxApplicationDeliveryChannelOptions,
	taxApplicationFormOptions,
	taxApplicationRelationshipOptions,
	telegramClassificationLabels,
	telegramDeliveryStatusLabels,
	telegramHumanMessage,
	telegramInlineButtonKindLabels,
	telegramInlineButtonRowsFromReplyMarkup,
	telegramLinkCodeStatusLabels,
	telegramModeHints,
	telegramModeLabels,
	telegramOutboxStatusFilterLabels,
	telegramOutboxStatusFilterOptions,
	telegramOutboxTemplateFilterLabels,
	telegramOutboxTemplateFilterOptions,
	telegramPrivacyModeHints,
	telegramPrivacyModeLabels,
	telegramQrSvgToDataUrl,
	telegramTemplateLabels,
	toDateTimeLocalValue,
	toothRows,
	type UiPreferences,
	type UiPreferencesInput,
	uiLanguageOptions,
	uiPreferencesStorageKey,
	uiPreferencesSyncErrorMessage,
	type VisitNoteForm,
	viewFromHash,
	visitDraftMissingFieldLabel,
	visitDraftQualityLabels,
	visitDraftSignalLabel,
	visitNoteFieldDefinitions,
	visitNoteFormFromDraft,
	visitNoteFormFromVisit,
	visitSaveReceiptText,
	WorkflowResponseError,
	weekdayOptions,
	workspaceScopeLabels,
	xrayPregnancyStatusOptions,
	xrayStudyTypeOptions,
} from "./AppHelpers";
import {
	formatByteSize,
	formatMegabytes,
	inspectBrowserContinuity,
} from "./browserContinuity";
import { communicationDocumentTaskActionLabels } from "./communicationTaskData";
import { showToast } from "./components/GlobalToast";
import { useAuthLogic } from "./hooks/domains/useAuthLogic";
import { useClinicalVisitLogic } from "./hooks/domains/useClinicalVisitLogic";
import { useCommunicationsQueries } from "./hooks/domains/useCommunicationsQueries";
import { useDicomWorkbenchModule } from "./hooks/domains/useDicomWorkbenchModule";
import { useDocumentWorkflowModule } from "./hooks/domains/useDocumentWorkflowModule";
import { useFinanceLogic } from "./hooks/domains/useFinanceLogic";
import { useImagingQueries } from "./hooks/domains/useImagingQueries";
import { useMigrationQueries } from "./hooks/domains/useMigrationQueries";
import { usePatientIntakeLogic } from "./hooks/domains/usePatientIntakeLogic";
import { usePatientLogic } from "./hooks/domains/usePatientLogic";
import { useScheduleLogic } from "./hooks/domains/useScheduleLogic";
import { useStaffSettingsLogic } from "./hooks/domains/useStaffSettingsLogic";
import { useTelegramModule } from "./hooks/domains/useTelegramModule";
import { useVisitLogic } from "./hooks/domains/useVisitLogic";

import { loadWorkspaceProfile } from "./hooks/useWorkspaceProfile";
import {
	imagingCaptureDistanceMs,
	imagingComparisonScore,
} from "./imagingComparison";
import {
	dicomDiagnosticPixelPolicyLabels,
	dicomExecutionLaneLabels,
	dicomGpuClassLabels,
	dicomLabel,
	dicomQualityModeLabels,
	dicomReadinessCheckLabels,
	dicomRenderMemoryBudgetClassLabels,
	dicomRuntimeTierLabels,
	dicomSeriesViewerLabels,
	dicomTextureStrategyLabels,
	dicomViewerLaunchModeLabels,
	dicomWebStatusLabels,
	imagingKindLabels,
	imagingSourceDetails,
	imagingSourceLabels,
	imagingViewerToolLabels,
	localImagingModelRoleLabels,
	localImagingOrganizerActionLabels,
	mprAxisPresetDeg,
	mprCacheModeLabels,
	mprClinicalPresets,
	mprLoadStrategyLabels,
	mprProjectionLabels,
	mprResourceTierLabels,
	mprSeriesRequiredProjectionLabel,
	mprSlabPresetMm,
	mprToolLabels,
	mprUnavailableProjectionLabel,
	mprWindowPresetLabels,
	policyAuditEventLabels,
	pricelistParserModeLabels,
} from "./imagingUiLabels";
import { actionFailureToast } from "./lib/panelStateText";
import { safeLocalStorageSetItem } from "./lib/safeLocalStorage";
import { describeMprClinicalPresetProjectionFallback } from "./mprClinicalStatus";
import {
	dentalMaterialKindLabels,
	dentalRestorationTypeLabels,
	pricelistItemMaterialText,
	pricelistMaterialSummaryText,
	pricelistRecognitionBrandGroups,
	pricelistRecognitionServiceGroups,
	pricelistSourceKindLabels,
	pricelistWarningsText,
} from "./pricelistUiMeta";
import {
	imagingConnectorCards,
	imagingViewerCapabilities,
	recognitionPresets,
} from "./settingsStaticData";
import { useAppStore } from "./store/appStore";
import { useImagingStore } from "./store/imagingStore";
import { useSettingsStore } from "./store/settingsStore";
import { logger } from "./utils/logger";
import {
	clampMprAxisDeg,
	clampMprSlabMm,
	clampMprSliceIndex,
	formatSignedMprStep,
	mprAxisBounds,
	mprAxisNudgeDeg,
	mprSlabBounds,
	mprSlabNudgeMm,
	mprSliceIndexFromFraction,
	mprSliceNudgeSteps,
	mprSlicePresetFractions,
} from "./utils/math/mprMath";
import {
	type AppView,
	getFallbackAppView,
	getFilteredAppViews,
	viewLabels,
} from "./utils/routeUtils";
import { inferDashboardVisitSpecialty } from "./visitSpecialtyData";
import {
	postVisitCareTopicOptions,
	telegramFeatureHelp,
	telegramFeatureOptions,
	telegramPostVisitCheckupDelayFields,
	telegramVisualCardFields,
} from "./workspaceStaticOptions";
import {
	appointmentLabels,
	clinicalRuleActionLabels,
	clinicalRuleSeverityLabels,
	clinicModeLabels,
	communicationChannelLabels,
	communicationIntentLabels,
	communicationPriorityLabels,
	communicationStatusLabels,
	completedActContractReferenceForUi,
	dicomFolderWorkupPathLabels,
	documentActionLabels,
	documentLabels,
	documentSourceStatusClassNames,
	documentStatusLabels,
	integrationCapabilityLabels,
	integrationCategoryLabels,
	integrationStatusLabels,
	localBridgeStatusLabels,
	localBridgeUsePathLabels,
	paymentFiscalReceiptLabelForUi,
	paymentMethodLabels,
	recognitionTargetLabels,
	scenarioPriorityLabels,
	scenarioStrategyLabels,
	serviceCategoryLabels,
	specialtyLabels,
	speechProviderHealthLabels,
	speechProviderModeLabels,
	speechProviderSelectionLabels,
	speechProviderStatusLabels,
	speechRecordingPathLabels,
	speechRecoveryStateLabels,
	staffRoleLabels,
	structuredPayloadDocumentKinds,
	treatmentStatusLabels,
	warningSeverityLabels,
} from "./workspaceUiLabels";

export function useAppLogic(): any {
	const {
		imagingImportText,
		setImagingImportText,
		imagingImportSourceKind,
		setImagingImportSourceKind,
		localImagingFolderDraft,
		setLocalImagingFolderDraft,
		imagingFolderPath,
		setImagingFolderPath,
		browserPickedImagingFolder,
		setBrowserPickedImagingFolder,
		browserImagingScanProgress,
		setBrowserImagingScanProgress,
		browserDirectoryPickerAvailable,
		setBrowserDirectoryPickerAvailable,
		imagingImportPreview,
		setImagingImportPreview,
		imagingImportCommit,
		setImagingImportCommit,
		imagingFolderScan,
		setImagingFolderScan,
		dicomLocalFolderDiscovery,
		setDicomLocalFolderDiscovery,
		localImagingOrganizer,
		setLocalImagingOrganizer,
		dicomSeriesPreview,
		setDicomSeriesPreview,
		dicomFolderSeriesScan,
		setDicomFolderSeriesScan,
		dicomFolderWorkupPlan,
		setDicomFolderWorkupPlan,
		dicomFirstFramePreview,
		setDicomFirstFramePreview,
		dicomFirstFrameViewerState,
		setDicomFirstFrameViewerState,
		dicomWebEndpointUrl,
		setDicomWebEndpointUrl,
		dicomWebCheck,
		setDicomWebCheck,
		dicomViewerLaunchManifest,
		setDicomViewerLaunchManifest,
		dicomViewerToolStateBundle,
		setDicomViewerToolStateBundle,
		dicomViewerWorkbenchManifest,
		setDicomViewerWorkbenchManifest,
		dicomWorkbenchLocalSavedAt,
		setDicomWorkbenchLocalSavedAt,
		dicomWorkbenchServerBundle,
		setDicomWorkbenchServerBundle,
		dicomWorkbenchServerBundles,
		setDicomWorkbenchServerBundles,
		dicomWorkstationReadiness,
		setDicomWorkstationReadiness,
		dicomRenderCachePlan,
		setDicomRenderCachePlan,
		selectedImagingStudyId,
		setSelectedImagingStudyId,
		imagingKindFilter,
		setImagingKindFilter,
		imagingViewerState,
		setImagingViewerState,
		imagingViewerActiveTool,
		setImagingViewerActiveTool,
		ctPlanningActiveQuickActionId,
		setCtPlanningActiveQuickActionId,
		ctPlanningImplantPlan,
		setCtPlanningImplantPlan,
		imagingViewerAnnotations,
		setImagingViewerAnnotations,
		imagingViewerNote,
		setImagingViewerNote,
		imagingViewerSession,
		setImagingViewerSession,
		imagingViewerSaveState,
		setImagingViewerSaveState,
		imagingViewerLocalSavedAt,
		setImagingViewerLocalSavedAt,
		imagingViewerSaveError,
		setImagingViewerSaveError,
		imagingViewerSessionReady,
		setImagingViewerSessionReady,
		mprProjection,
		setMprProjection,
		mprAxisDeg,
		setMprAxisDeg,
		mprSlabMm,
		setMprSlabMm,
		mprSliceIndex,
		setMprSliceIndex,
		mprWindowPreset,
		setMprWindowPreset,
		mprCrosshairEnabled,
		setMprCrosshairEnabled,
		mprLinkedPlanesEnabled,
		setMprLinkedPlanesEnabled,
		mprWorkbenchLocalSavedAt,
		setMprWorkbenchLocalSavedAt,
		mprWorkbenchDraftRestored,
		setMprWorkbenchDraftRestored,
		isImagingImportLoading,
		setIsImagingImportLoading,
		isImagingImportCommitting,
		setIsImagingImportCommitting,
		imagingCreateSavingKind,
		setImagingCreateSavingKind,
		isImagingFolderScanning,
		setIsImagingFolderScanning,
		isDicomLocalDiscovering,
		setIsDicomLocalDiscovering,
		isLocalImagingOrganizing,
		setIsLocalImagingOrganizing,
		isDicomSeriesPreviewLoading,
		setIsDicomSeriesPreviewLoading,
		isDicomWebChecking,
		setIsDicomWebChecking,
		isDicomManifestBuilding,
		setIsDicomManifestBuilding,
		isDicomToolStateBuilding,
		setIsDicomToolStateBuilding,
		isDicomWorkbenchBuilding,
		setIsDicomWorkbenchBuilding,
		isDicomWorkbenchServerSaving,
		setIsDicomWorkbenchServerSaving,
		isDicomWorkbenchReconnecting,
		setIsDicomWorkbenchReconnecting,
		isDicomWorkstationChecking,
		setIsDicomWorkstationChecking,
		isDicomRenderCachePlanning,
		setIsDicomRenderCachePlanning,
		isDicomFolderWorkupPlanning,
		setIsDicomFolderWorkupPlanning,
		isDicomFirstFramePreviewing,
		setIsDicomFirstFramePreviewing,
		isBrowserImagingFolderPicking,
		setIsBrowserImagingFolderPicking,
		isLocalDicomOperationActive,
		setIsLocalDicomOperationActive,
	} = useImagingStore();
	const {
		uiPreferencesHydrated,
		setUiPreferencesHydrated,
		dashboard,
		setDashboard,
		accessUnlockRequired,
		setAccessUnlockRequired,
		accessUnlockMessage,
		setAccessUnlockMessage,
		uiLanguage,
		setUiLanguage,
		clinicProfileDraft,
		setClinicProfileDraft,
		clinicProfileSaveState,
		setClinicProfileSaveState,
		clinicProfileDirty,
		setClinicProfileDirty,
		currentView: requestedWorkspaceView,
		setCurrentView,
		settingsTab,
		setSettingsTab,
		selectedWorkspaceRole,
		setSelectedWorkspaceRole,
		query,
		setQuery,
		newStaffName,
		setNewStaffName,
		newStaffRole,
		setNewStaffRole,
		newStaffSpecialty,
		setNewStaffSpecialty,
		editingAppointmentId,
		setEditingAppointmentId,
		newAppointmentError,
		setNewAppointmentError,
		newChairName,
		setNewChairName,
		newChairHasXraySensor,
		setNewChairHasXraySensor,
		newChairHasMicroscope,
		setNewChairHasMicroscope,
		newChairHasSurgeryKit,
		setNewChairHasSurgeryKit,
		newRuleTitle,
		setNewRuleTitle,
		newRuleAction,
		setNewRuleAction,
		newRuleSeverity,
		setNewRuleSeverity,
		newRuleOwnerRole,
		setNewRuleOwnerRole,
		newRuleSpecialty,
		setNewRuleSpecialty,
		newRuleCategory,
		setNewRuleCategory,
		newRuleTriggerServiceId,
		setNewRuleTriggerServiceId,
		newRuleRequiredServiceId,
		setNewRuleRequiredServiceId,
		newRuleCompletedServiceId,
		setNewRuleCompletedServiceId,
		newRuleBlockedServiceId,
		setNewRuleBlockedServiceId,
		newRuleWarningText,
		setNewRuleWarningText,
		releaseProtectionNote,
		setReleaseProtectionNote,
		communicationNote,
		setCommunicationNote,
		importText,
		setImportText,
		smartImportText,
		setSmartImportText,
		pricelistText,
		setPricelistText,
		pricelistSourceKind,
		setPricelistSourceKind,
		usePricelistAi,
		setUsePricelistAi,
		pricelistAnalysis,
		setPricelistAnalysis,
		pricelistImageBase64,
		setPricelistImageBase64,
		pricelistImageMimeType,
		setPricelistImageMimeType,
		pricelistImageName,
		setPricelistImageName,
		pricelistImageNote,
		setPricelistImageNote,
		recognitionKind,
		setRecognitionKind,
		recognitionTarget,
		setRecognitionTarget,
		recognitionText,
		setRecognitionText,
		importSourceKind,
		setImportSourceKind,
		smartImportMode,
		setSmartImportMode,
		browserMigrationDiscovery,
		setBrowserMigrationDiscovery,
		browserMigrationScanProgress,
		setBrowserMigrationScanProgress,
		importIntake,
		setImportIntake,
		importPreview,
		setImportPreview,
		importCommit,
		setImportCommit,
		migrationAutopilot,
		setMigrationAutopilot,
		migrationSourceDiscovery,
		setMigrationSourceDiscovery,
		migrationSourceWorkup,
		setMigrationSourceWorkup,
		migrationSourceProbe,
		setMigrationSourceProbe,
		clinicPublicLookup,
		setClinicPublicLookup,
		ohifBaseUrl,
		setOhifBaseUrl,
		smartImportPreview,
		setSmartImportPreview,
		smartImportCommit,
		setSmartImportCommit,
		recognitionJob,
		setRecognitionJob,
		localAutosaveReady,
		setLocalAutosaveReady,
		lastLocalSavedAt,
		setLastLocalSavedAt,
		isOnline,
		setIsOnline,
		speechGatewayStatus,
		setSpeechGatewayStatus,
		speechGatewayHealthReport,
		setSpeechGatewayHealthReport,
		speechProviderRuntimeStatuses,
		setSpeechProviderRuntimeStatuses,
		speechRecordingStrategy,
		setSpeechRecordingStrategy,
		speechRecordingRecovery,
		setSpeechRecordingRecovery,
		pendingSpeechChunkCount,
		setPendingSpeechChunkCount,
		speechStatusNote,
		setSpeechStatusNote,
		browserContinuity,
		setBrowserContinuity,
		localBridgeReadiness,
		setLocalBridgeReadiness,
		localBridgeUsePlans,
		setLocalBridgeUsePlans,
		isImportDictating,
		setIsImportDictating,
		isImportLoading,
		setIsImportLoading,
		isImportCommitting,
		setIsImportCommitting,
		isMigrationAutopilotLoading,
		setIsMigrationAutopilotLoading,
		isMigrationHandoffReportLoading,
		setIsMigrationHandoffReportLoading,
		isMigrationSourceDiscovering,
		setIsMigrationSourceDiscovering,
		isMigrationSourceWorkupLoading,
		setIsMigrationSourceWorkupLoading,
		isMigrationSourceProbeLoading,
		setIsMigrationSourceProbeLoading,
		isClinicPublicLookupLoading,
		setIsClinicPublicLookupLoading,
		isBrowserMigrationScanning,
		setIsBrowserMigrationScanning,
		isSmartImportLoading,
		setIsSmartImportLoading,
		isSmartImportCommitting,
		setIsSmartImportCommitting,
		isSmartReportLoading,
		setIsSmartReportLoading,
		isSmartSafeReportLoading,
		setIsSmartSafeReportLoading,
		isRecognitionLoading,
		setIsRecognitionLoading,
		isPricelistAnalyzing,
		setIsPricelistAnalyzing,
		isServerVoiceRecording,
		setIsServerVoiceRecording,
		communicationSavingTaskId,
		setCommunicationSavingTaskId,
		isClinicalRuleSaving,
		setIsClinicalRuleSaving,
		persistenceHealth,
		setPersistenceHealth,
		persistenceIntegrity,
		setPersistenceIntegrity,
		isPersistenceExporting,
		setIsPersistenceExporting,
		isTelegramLoading,
		setIsTelegramLoading,
		isTelegramLinkCreating,
		setIsTelegramLinkCreating,
		isTelegramSettingsSaving,
		setIsTelegramSettingsSaving,
		isTelegramSendingDue,
		setIsTelegramSendingDue,
		isTelegramOutboxLoadingMore,
		setIsTelegramOutboxLoadingMore,
		isTelegramLinkCodesLoadingMore,
		setIsTelegramLinkCodesLoadingMore,
		isTelegramChatLinksLoadingMore,
		setIsTelegramChatLinksLoadingMore,
		error,
		setError,
		uiPreferencesSyncError,
		setUiPreferencesSyncError,
	} = useAppStore();

	const clinicalVisitLogic = useClinicalVisitLogic();
	const { odontogramUseSurfaces, setOdontogramUseSurfaces } =
		clinicalVisitLogic;

	/**
	 * ОХРАННИК МАРШРУТА ПО РОЛИ. Считается ПРИ РЕНДЕРЕ, а не в useEffect.
	 *
	 * ЧТО БЫЛО СЛОМАНО. Проверка прав целиком жила в useEffect (он остался ниже,
	 * но занят теперь только адресом). Эффекты выполняются ПОСЛЕ коммита, значит
	 * запрещённый роли раздел успевал СМОНТИРОВАТЬСЯ полностью: отрабатывали его
	 * собственные эффекты, уходили сетевые запросы за клиническими данными, и лишь
	 * следующим проходом раздел сменялся «Сменой». Редирект убирал раздел с экрана,
	 * но не отменял того, что тот уже успел сделать: администратор, открывший
	 * ссылку #visit, отправлял запросы данных приёма — раздела, которого нет в его
	 * getFilteredAppViews. Ровно тот случай, про который документация React
	 * («You Might Not Need an Effect») говорит прямо: значение, выводимое из уже
	 * имеющегося состояния, считают при рендере, а не досылают эффектом, иначе
	 * первый проход уходит на экран со старым значением.
	 *
	 * ЧТО ИМЕННО ПОМЕНЯЛОСЬ. `currentView` ниже по файлу и во всём возвращаемом
	 * объекте — уже ПРОВЕРЕННОЕ значение, поэтому запрещённый раздел не попадает
	 * даже в первый коммит и монтировать нечего. Запрошенное значение осталось
	 * доступным как `requestedWorkspaceView` и нужно только для правки адреса.
	 *
	 * ПРО ЗАПАСНОЙ РАЗДЕЛ. Здесь стояла КОНСТАНТА «shift», и она была дефектом,
	 * а не настройкой. У ролей «Администратор» и «Управляющий» getFilteredAppViews
	 * «shift» НЕ содержит — ни разу за всю историю функции (заведена коммитом
	 * 4867a6afc уже без него, пять последующих правок его этим ролям не
	 * добавляли). То есть охранник, поставленный СОБЛЮДАТЬ список, сам отправлял
	 * две роли в раздел вне списка: «Смена» им показывалась, при том что её пункта
	 * нет в боковом меню (getVisibleRailViews считается от того же списка) — уйдя
	 * с неё, вернуться было уже нечем.
	 *
	 * Теперь запасной раздел берётся из списка САМОЙ роли (getFallbackAppView,
	 * рядом со списком, чтобы они не разъехались). Прав это не прибавляет никому:
	 * для врача, ассистента и владельца «shift» и так стоит в их списке первым,
	 * поэтому у них ничего не меняется; администратор и управляющий вместо чужой
	 * «Смены» получают первый СВОЙ раздел — «Записи». Обратный вариант (выдать
	 * двум ролям «shift») — продуктовое решение, а не починка, и здесь не
	 * принимается.
	 */
	const allowedWorkspaceViews = useMemo(
		() => getFilteredAppViews(selectedWorkspaceRole),
		[selectedWorkspaceRole],
	);
	const currentView: AppView = allowedWorkspaceViews.includes(
		requestedWorkspaceView,
	)
		? requestedWorkspaceView
		: getFallbackAppView(selectedWorkspaceRole);
	const {
		onboardingDismissed,
		setOnboardingDismissed,
		onboardingDismissedAt,
		setOnboardingDismissedAt,
		onboardingStep,
		setOnboardingStep,
		onboardingDraftMode,
		setOnboardingDraftMode,
		onboardingGuideExpanded,
		setOnboardingGuideExpanded,
		telegramHandoffNotice,
		setTelegramHandoffNotice,
		telegramStatus,
		setTelegramStatus,
		telegramFeaturePlan,
		setTelegramFeaturePlan,
		telegramOutbox,
		setTelegramOutbox,
		telegramOutboxStatusFilter,
		setTelegramOutboxStatusFilter,
		telegramOutboxTemplateFilter,
		setTelegramOutboxTemplateFilter,
		telegramLinkCodes,
		setTelegramLinkCodes,
		telegramChatLinks,
		setTelegramChatLinks,
		telegramLinkCodeLedger,
		setTelegramLinkCodeLedger,
		telegramChatLinkLedger,
		setTelegramChatLinkLedger,
		telegramLinkSubjectType,
		setTelegramLinkSubjectType,
		telegramLinkStaffId,
		setTelegramLinkStaffId,
		telegramLinkCode,
		setTelegramLinkCode,
		telegramLinkActionState,
		setTelegramLinkActionState,
		telegramPreview,
		setTelegramPreview,
		telegramModeDraft,
		setTelegramModeDraft,
		telegramBotUsernameDraft,
		setTelegramBotUsernameDraft,
		telegramOwnBotUsernameDraft,
		setTelegramOwnBotUsernameDraft,
		telegramBotConfigId,
		setTelegramBotConfigId,
		telegramWebhookBaseUrlDraft,
		setTelegramWebhookBaseUrlDraft,
		telegramPatientPortalBaseUrlDraft,
		setTelegramPatientPortalBaseUrlDraft,
		telegramWelcomeImageUrlDraft,
		setTelegramWelcomeImageUrlDraft,
		telegramVisualCardUrlDrafts,
		setTelegramVisualCardUrlDrafts,
		telegramReviewUrlDraft,
		setTelegramReviewUrlDraft,
		telegramMapsUrlDraft,
		setTelegramMapsUrlDraft,
		telegramEnabledFeaturesDraft,
		setTelegramEnabledFeaturesDraft,
		telegramTokenTtlDraft,
		setTelegramTokenTtlDraft,
		telegramReminderLeadTimesDraft,
		setTelegramReminderLeadTimesDraft,
		telegramReviewRequestDelayDraft,
		setTelegramReviewRequestDelayDraft,
		telegramPostVisitCheckupDelayDrafts,
		setTelegramPostVisitCheckupDelayDrafts,
		telegramAllowVoiceIntakeDraft,
		setTelegramAllowVoiceIntakeDraft,
		telegramStaffEscalationChannelDraft,
		setTelegramStaffEscalationChannelDraft,
		telegramPrivacyModeDraft,
		setTelegramPrivacyModeDraft,
		telegramSettingsDirty,
		setTelegramSettingsDirty,
		telegramSettingsSaveState,
		setTelegramSettingsSaveState,
		telegramSettingsSaveError,
		setTelegramSettingsSaveError,
		clinicalAdminSecretDraft,
		setClinicalAdminSecretDraft,
		settingsAdminSecretDraft,
		setSettingsAdminSecretDraft,
		scheduleAdminSecretDraft,
		setScheduleAdminSecretDraft,
		telegramAdminSecretDraft,
		setTelegramAdminSecretDraft,
		clinicalAdminSecretSession,
		setClinicalAdminSecretSession,
		settingsAdminSecretSession,
		setSettingsAdminSecretSession,
		scheduleAdminSecretSession,
		setScheduleAdminSecretSession,
		telegramAdminSecretSession,
		setTelegramAdminSecretSession,
		telegramSendingItemId,
		setTelegramSendingItemId,
		telegramRevokingLinkId,
		setTelegramRevokingLinkId,
	} = useSettingsStore();
	const activeSettingsTabButtonRef = useRef<HTMLButtonElement | null>(null);
	const initialUiPreferencesRef = useRef<UiPreferences | null>(null);
	// Порядковый номер запроса данных клиники: применяем только последний ответ.
	const dashboardRequestSeqRef = useRef(0);
	// Защита от двойного создания сотрудников и кресел (двойной клик по кнопке).
	const _staffCreateInFlightRef = useRef(false);
	const _chairCreateInFlightRef = useRef(false);
	const [isStaffCreating, _setIsStaffCreating] = useState(false);
	const [isChairCreating, _setIsChairCreating] = useState(false);
	const uiPreferencesServerReadyRef = useRef(false);
	const uiPreferencesHydratedRef = useRef(false);
	const pendingUiPreferencesSyncRef = useRef<UiPreferences | null>(null);
	const uiPreferencesSyncInFlightRef = useRef(false);
	const uiPreferencesRetryTimerRef = useRef<number | null>(null);
	const newAppointmentDraftUserEditedRef = useRef(false);
	const clinicProfileDraftHydratedRef = useRef(false);
	const clinicProfileDraftRef = useRef<ClinicProfileDraft>(
		emptyClinicProfileDraft(),
	);
	const onboardingDismissalHydratedOrganizationIdRef = useRef<string | null>(
		null,
	);
	const localImagingRecoveryHydratedOrganizationIdRef = useRef<string | null>(
		null,
	);
	/*
	 * Последняя карточка, о которой уже отправлена отметка просмотра.
	 *
	 * Без неё запрос уходил бы на каждый перерисовке рабочего места с тем же
	 * пациентом: карточка открыта весь приём, а строка в истории переписывалась
	 * бы десятки раз подряд.
	 */
	const recordedPatientViewRef = useRef<string | null>(null);
	/** Набор модулей уже запрашивали с сервера в этом сеансе. */
	const workspaceProfileLoadedRef = useRef(false);
	/*
	 * Счётчик состоявшихся отметок просмотра.
	 *
	 * Виджет «Недавние» читает историю при своём появлении, а отметка уходит
	 * отсюда — и почти всегда позже. Пациент восстанавливается из настроек ещё
	 * до того, как виджет смонтируется, поэтому «перечитать при смене пациента»
	 * не спасает: смены не происходит. Проверено живьём — счётчик оставался
	 * нулём, хотя строка в базе уже была. Номер меняется только после успешного
	 * ответа сервера, и виджет перечитывает список именно тогда, когда там
	 * появилось что-то новое.
	 */
	const [recentPatientViewsVersion, setRecentPatientViewsVersion] = useState(0);
	if (initialUiPreferencesRef.current === null) {
		initialUiPreferencesRef.current = loadUiPreferences();
	}
	const initialUiPreferences =
		initialUiPreferencesRef.current ?? defaultUiPreferences;
	const _initialRecognitionText =
		recognitionPresets?.find(
			(preset) =>
				preset.kind === initialUiPreferences.recognitionKind &&
				preset.target === initialUiPreferences.recognitionTarget,
		)?.text ??
		recognitionPresets?.[0]?.text ??
		"";
	const [imagingPreviewObjectUrls, setImagingPreviewObjectUrls] = useState<
		Record<string, string>
	>({});
	const activeOrganizationId =
		dashboard?.clinicSettings?.profile?.organizationId ?? null;
	const _isOmniRoleMode =
		(dashboard?.clinicSettings?.profile as { isOmniRole?: boolean } | undefined)
			?.isOmniRole ?? false;

	const [_dicomFirstFramePreviewRequest, _setDicomFirstFramePreviewRequest] =
		useState<DicomFirstFramePreviewRequestContext | null>(null);
	const browserDirectoryInputRef = useRef<HTMLInputElement | null>(null);
	const browserMigrationInputRef = useRef<HTMLInputElement | null>(null);
	const _browserImagingScanAbortRef = useRef<AbortController | null>(null);
	const _browserMigrationScanAbortRef = useRef<AbortController | null>(null);
	const _localDicomOperationAbortRef = useRef<AbortController | null>(null);
	const staffScheduleDraftsRef = useRef<Record<string, StaffScheduleDraft>>({});
	const chairScheduleDraftsRef = useRef<Record<string, StaffScheduleDraft>>({});
	const appointmentScheduleDraftsRef = useRef<
		Record<string, AppointmentScheduleDraft>
	>({});
	const _imagingViewerSaveTimerRef = useRef<number | null>(null);
	const _mprWorkbenchSaveTimerRef = useRef<number | null>(null);

	const auth = useAuthLogic({
		setError,
		loadDashboard,
		loadTelegramControlPlane: (options) =>
			telegramSettingsModule.loadTelegramControlPlane(options),
	});

	/*
	 * Россыпь сеттеров формы оплаты сюда больше не передаётся: сброс при смене
	 * пациента берёт их из documentStore целиком, поэтому забыть поле нельзя.
	 * Раньше передавались шесть из четырнадцати — ровно те шесть и очищались.
	 */
	const patient = usePatientLogic({
		dashboard,
		query,
		setError,
		auth,
		setDashboard,
		setQuery,
	});
	const staffSettingsLogic = useStaffSettingsLogic({
		auth,
		setError,
		loadDashboard,
		saveClinicProfileIfDirty,
	});
	const patientIntakeLogic = usePatientIntakeLogic({
		dashboard,
		setError,
		documentPatient: patient.documentPatient,
		documentPatientMatchesActiveVisit: false,
		documentLocalPersistenceOrganizationId: activeOrganizationId ?? "",
		clinicProfileDraft,
		activeDoctor: null,
		activeAppointment: null,
		visitNoteForm: {} as VisitNoteForm,
		clinicalToothRowsValue: () => [],
	});
	const migrationQueries = useMigrationQueries({ auth });
	const imagingQueries = useImagingQueries({ auth });
	const communicationsQueries = useCommunicationsQueries({ auth });

	const {
		patientCoreDraftRef,
		patientAdministrativeProfileDraftRef,
		selectedPatientId,
		patientCoreDraft,
		patientCoreSaveState,
		patientCoreDirty,
		patientAdministrativeProfileDraft,
		patientAdministrativeProfileSaveState,
		patientAdministrativeProfileDirty,
		newPatientName,
		newPatientPhone,
		newPatientBirthDate,
		isPatientCreating,
		newRulePatientText,
		setSelectedPatientId,
		setPatientCoreDraft,
		setPatientCoreSaveState,
		setPatientCoreDirty,
		setPatientAdministrativeProfileDraft,
		setPatientAdministrativeProfileSaveState,
		setPatientAdministrativeProfileDirty,
		setNewPatientName,
		setNewPatientPhone,
		setNewPatientBirthDate,
		setIsPatientCreating,
		setNewRulePatientText,
		activePatient,
		activeVisitPatient,
		selectedPatient,
		documentPatient,
		documentPatientMatchesActiveVisit,
		paymentPatientContextReady,
		paymentPatientContextMessage,
		patientAdministrativeProfileValidationMessage,
		patientInsightById,
		activePatientInsight,
		activePatientCallablePhone,
		activePatientHasCallablePhone,
		filteredPatients,
		updatePatientCoreDraft,
		updatePatientAdministrativeProfileDraft,
		savePatientCore,
		savePatientAdministrativeProfile,
		createPatient,
	} = patient;

	/**
	 * Идентификатор ОТКРЫТОГО приёма — или null, если приёма нет.
	 *
	 * Гидратация базы кладёт в `activeVisit` заготовку с нулевым UUID, когда
	 * черновиков нет вовсе. Этот нулевой UUID уходил на сервер как visitId, и
	 * касса получала «Прием для оплаты не найден»: сервер честно не находит
	 * приём с таким идентификатором. Кнопка «Принять оплату» при этом была
	 * доступна — кассир нажимал и не понимал, почему деньги не проходят.
	 */
	const realActiveVisitId =
		dashboard?.activeVisit?.id &&
		dashboard.activeVisit.id !== "00000000-0000-0000-0000-000000000000"
			? dashboard.activeVisit.id
			: null;

	const activeAppointment = useMemo(() => {
		if (!dashboard) return null;
		return (
			dashboard.appointments?.find(
				(appointment) =>
					appointment.id === dashboard?.activeVisit?.appointmentId,
			) ??
			dashboard.appointments?.[0] ??
			null
		);
	}, [dashboard]);
	const activeDoctor = useMemo(() => {
		if (!dashboard || !activeAppointment) return null;
		return (
			dashboard?.clinicSettings?.staff?.find(
				(member) =>
					member.id === activeAppointment.doctorUserId && member.active,
			) ?? null
		);
	}, [activeAppointment, dashboard]);
	const activeChair = useMemo(() => {
		if (!dashboard || !activeAppointment) return null;
		return (
			dashboard?.clinicSettings?.chairs?.find(
				(chair) => chair.id === activeAppointment.chairId && chair.active,
			) ?? null
		);
	}, [activeAppointment, dashboard]);
	const {
		selectedSpecialty,
		setSelectedSpecialty,
		selectedProtocolId,
		setSelectedProtocolId,
		clearedTranscriptSnapshot,
		setClearedTranscriptSnapshot,
		transcript,
		setTranscript,
		draft,
		setDraft,
		visitNoteForm,
		setVisitNoteForm,
		visitToothStateByCode,
		setToothState,
		resetVisitToothState,
		applyAiToothCodes,
		lastServerDraftSavedAt,
		setLastServerDraftSavedAt,
		serverDraftSyncState,
		setServerDraftSyncState,
		localDraftWasRestored,
		setLocalDraftWasRestored,
		pendingVisitSaveCount,
		setPendingVisitSaveCount,
		lastPendingVisitSaveAt,
		setLastPendingVisitSaveAt,
		lastVisitSaveReceipt,
		setLastVisitSaveReceipt,
		speechLastQuality,
		setSpeechLastQuality,
		isDraftLoading,
		setIsDraftLoading,
		isDraftAccepting,
		setIsDraftAccepting,
		isPendingVisitSyncing,
		setIsPendingVisitSyncing,
		isVisitDictating,
		setIsVisitDictating,
		isTranscriptPolishing,
		setIsTranscriptPolishing,
		lastServerDraftSignatureRef,
		visitDraftUserEditedRef,
		visitCloseChecklist,
		visitWarnings,
		primaryVisitWarning,
		speechProviderRuntimeById,
		speechProviderHealthById,
		activeSpeechProviderHealth,
		savedVisitNoteForm,
		isVisitNoteDirty,
		hasVisitNoteFormText,
		hasVisitTranscriptText,
		visitDraftBuildMissingSteps,
		visitDraftReadyToBuild,
		visitNoteAcceptMissingSteps,
		visitNoteReadyToAccept,
		visitNoteActionLabel,
		visitNoteStatusLabel,
		visitHasSavedNote,
		mediaRecorderRef,
		mediaStreamRef,
		speechAudioContextRef,
		speechAnalyserRef,
		speechMonitorTimerRef,
		speechRecordingIdRef,
		speechChunkIndexRef,
		speechSegmentStartedAtRef,
		speechLastSoundAtRef,
		speechPendingChunkDurationMsRef,
		speechUploadPromisesRef,
		appliedSpeechChunkKeysRef,
		loadSpeechGatewayStatus,
		loadSpeechGatewayHealthReport,
		loadSpeechProviderRuntimeStatuses,
		loadSpeechRecordingStrategy,
		loadSpeechRecordingRecovery,
		refreshSpeechRuntime,
		refreshPendingVisitSaveState,
		refreshPendingSpeechChunkState,
		applyAcceptedVisitResponse,
		submitAcceptedVisitDraft,
		visitDraftSignature,
		loadServerVisitDraft,
		syncVisitDraftAutosave,
		flushPendingVisitSaves,
		submitSpeechChunk,
		speechChunkApplyKey,
		speechTranscriptionMatchesActiveVisit,
		applySpeechTranscription,
		assembleSpeechRecording,
		trackSpeechUpload,
		waitForSpeechUploads,
		finalizeSpeechRecording,
		flushPendingSpeechChunks,
		scrollToVisitArea,
		appendToTranscript,
		updateVisitNoteField,
		buildOfflineDraft,
		openVisitWarningAction,
		polishTranscript,
		buildDraft,
		acceptDraftToVisit,
		appendVisitDictationText,
		clearTranscriptWithUndo,
		undoTranscriptClear,
		startVisitDictation,
		preferredSpeechMimeType,
		uploadSpeechBlob,
		stopSpeechMonitor,
		requestSpeechChunk,
		startSpeechMonitor,
		startImportDictation,
	} = useVisitLogic({
		dashboard,
		query,
		setError,
		auth,
		setDashboard,
		setQuery,
		selectedPatientId,
		documentPatient,
		activePatient,
		activeAppointment,
		activeDoctor,
		activeChair,
		paymentPatientContextReady,
		paymentPatientContextMessage,
		loadDashboard,
		clinicProfileDraft,
		patientCoreDraft,
		documentPatientMatchesActiveVisit,
		activeOrganizationId,
		importSourceKind,
		setImportSourceKind,
		importText,
		setImportText,
		setImportPreview,
		setImportCommit,
	});

	const schedule = useScheduleLogic({
		dashboard,
		query,
		setError,
		auth,
		setDashboard,
		setQuery,
		selectedPatientId,
		setEditingAppointmentId,
		newAppointmentDraftUserEditedRef,
		setSelectedPatientId,
		setNewAppointmentError,
		clinicProfileDraft,
		setSettingsTab,
		staffScheduleDraftsRef,
		chairScheduleDraftsRef,
		appointmentScheduleDraftsRef,
		loadDashboard,
		selectedSpecialty,
	});
	const {
		scheduleDoctorFilterId,
		setScheduleDoctorFilterId,
		scheduleAssistantFilterId,
		setScheduleAssistantFilterId,
		scheduleChairFilterId,
		setScheduleChairFilterId,
		scheduleDefaultDoctorUserId,
		setScheduleDefaultDoctorUserId,
		scheduleDefaultAssistantUserId,
		setScheduleDefaultAssistantUserId,
		scheduleDefaultChairId,
		setScheduleDefaultChairId,
		scheduleStatusFilter,
		setScheduleStatusFilter,
		scheduleDateFilter,
		setScheduleDateFilter,
		staffScheduleDrafts,
		setStaffScheduleDrafts,
		staffScheduleSavingId,
		setStaffScheduleSavingId,
		staffScheduleDirtyIds,
		setStaffScheduleDirtyIds,
		staffScheduleSaveStates,
		setStaffScheduleSaveStates,
		chairScheduleDrafts,
		setChairScheduleDrafts,
		chairScheduleSavingId,
		setChairScheduleSavingId,
		chairScheduleDirtyIds,
		setChairScheduleDirtyIds,
		chairScheduleSaveStates,
		setChairScheduleSaveStates,
		appointmentScheduleDrafts,
		setAppointmentScheduleDrafts,
		appointmentScheduleDirtyIds,
		setAppointmentScheduleDirtyIds,
		appointmentScheduleSaveStates,
		setAppointmentScheduleSaveStates,
		appointmentScheduleErrors,
		setAppointmentScheduleErrors,
		newAppointmentDraft,
		setNewAppointmentDraft,
		newAppointmentSaveState,
		setNewAppointmentSaveState,
		markStaffScheduleDirty,
		markChairScheduleDirty,
		updateStaffScheduleDraft,
		updateChairScheduleDraft,
		updateStaffScheduleDay,
		updateChairScheduleDay,
		openAppointmentEditor,
		markAppointmentScheduleDirty,
		updateAppointmentScheduleDraft,
		newAppointmentPreferenceDefaults,
		updateNewAppointmentDraft,
		resetNewAppointmentDraft,
		closeAppointmentEditor,
		buildOnboardingFirstAppointmentIssues:
			_buildOnboardingFirstAppointmentIssues,
		saveOnboardingSchedulesIfDirty,
		openScheduleWarning,
		saveStaffSchedule,
		saveChairSchedule,
		saveAppointmentSchedule,
		newAppointmentMissingFields,
		createAppointmentFromDraft,
	} = schedule;

	async function loadDashboard(options: { adminSecret?: string } = {}) {
		// БЫЛО: защиты от гонки не было, а loadDashboard вызывается из 34 мест.
		// Сценарий: загрузка при открытии экрана ещё идёт, врач сохраняет запись
		// приёма — сохранение тоже вызывает loadDashboard и получает свежие данные,
		// но МЕДЛЕННЫЙ первый ответ приходит последним и перезаписывает состояние
		// данными ДО сохранения. Только что записанный приём исчезал с экрана
		// до ручного обновления страницы.
		// Применяем только ответ последнего по времени запроса.
		const requestId = ++dashboardRequestSeqRef.current;
		const isStaleResponse = () => requestId !== dashboardRequestSeqRef.current;
		try {
			const response = await fetch("/api/dashboard", {
				cache: "no-store",
				headers: auth.denteClinicalReadHeaders({}, options.adminSecret),
			});
			if (!response.ok) {
				const message = await responseErrorMessage(
					response,
					"Данные клиники не загружены",
				);
				throw new WorkflowResponseError(message, response.status);
			}
			const payload = (await response.json()) as Dashboard;
			// Пока ждали ответ, стартовал более свежий запрос — его результат
			// актуальнее, этот молча игнорируем.
			if (isStaleResponse()) return;
			setDashboard(payload);
			setAccessUnlockRequired(false);
			setAccessUnlockMessage("");
		} catch (err) {
			showToast(
				actionFailureToast(
					"Не удалось загрузить данные клиники. Проверьте связь с сервером и повторите — введённые данные не потеряны.",
					(err as { status?: number })?.status ?? null,
				),
				"error",
			);
			if (isStaleResponse()) return;
			// БЫЛО: любая ошибка загрузки (обрыв сети, 401, 500) подменяла реальные
			// данные клиники ВЫМЫШЛЕННЫМИ: «Демо Клиника DENTE» и пациент
			// «Смирнов Алексей Петрович» с id "pat-1", который тут же выбирался
			// активным. Врач мог диктовать приём в карту несуществующего человека.
			// Кроме того, catch никогда не пробрасывал ошибку дальше, поэтому
			// все .catch() у вызывающих (в том числе принудительный релогин при 401)
			// были мёртвым кодом, и истёкшая сессия не приводила к повторному входу.
			logger.error("[Dente] Не удалось загрузить данные клиники:", err);
			const isAuthError =
				err instanceof Error &&
				/401|403|Требуется авторизация|Сессия истекла/i.test(err.message);
			if (isAuthError) {
				setAccessUnlockRequired(true);
				setAccessUnlockMessage(
					"Сессия истекла. Войдите в кабинет клиники заново.",
				);
			} else {
				setError(
					"Не удалось загрузить данные клиники. Проверьте связь с сервером и повторите — введённые данные не потеряны.",
				);
			}
			// Прежнее состояние НЕ затираем: пусть на экране останутся последние
			// корректные данные, а не подделка.
			//
			// Ошибку намеренно НЕ пробрасываем: loadDashboard вызывается из 34 мест,
			// часть — через `void loadDashboard()`, и бросок превратился бы в
			// необработанные отклонения промисов. Вместо этого истёкшая сессия
			// обрабатывается прямо здесь (setAccessUnlockRequired выше) — именно
			// этого добивались внешние .catch(), которые раньше не срабатывали.
		}
		void loadPersistenceHealth({
			silent: true,
			adminSecret: options.adminSecret,
		});
		void refreshSpeechRuntime({ silent: true });
	}

	const activePayments = useMemo(() => {
		if (!dashboard || !documentPatient) return [];
		return (
			dashboard.payments?.filter(
				(payment) => payment.patientId === documentPatient.id,
			) ?? []
		);
	}, [dashboard, documentPatient]);

	const activeTreatmentPlanItems = useMemo(() => {
		if (!dashboard || !documentPatient) return [];
		return (
			dashboard.treatmentPlanItems?.filter(
				(item) => item.patientId === documentPatient.id,
			) ?? []
		);
	}, [dashboard, documentPatient]);

	const documentWorkflow = useDocumentWorkflowModule({
		dashboard,
		auth,
		activeDoctor,
		activePayments,
		activeTreatmentPlanItems,
		documentPatient,
		clinicProfileDraft,
		activeAppointment,
		visitNoteForm,
		clinicalAdminSecretSession,
		setError,
		loadDashboard,
		setCurrentView,
	});
	const {
		taxDocumentYear,
		setTaxDocumentYear,
		selectedDocumentKind,
		setSelectedDocumentKind,
		taxApplicationForm,
		setTaxApplicationForm,
		taxApplicationDeliveryChannel,
		setTaxApplicationDeliveryChannel,
		paymentReceiptTaxSupportRequested,
		setPaymentReceiptTaxSupportRequested,
		documentIssueSignatureMode,
		setDocumentIssueSignatureMode,
		documentIssueStaffFullName,
		setDocumentIssueStaffFullName,
		documentIssueStaffRole,
		setDocumentIssueStaffRole,
		procedureConsentProcedureType,
		setProcedureConsentProcedureType,
		postVisitCareTopic,
		setPostVisitCareTopic,
		documentIngestionTarget,
		setDocumentIngestionTarget,
	} = documentWorkflow;

	const dicomWorkbenchModule = useDicomWorkbenchModule({
		auth,
		currentView,
		visibleImagingStudies: dashboard?.imagingStudies ?? [],
	});
	const {
		selectedImagingStudy,
		applyDicomWorkbenchManifest,
		loadDicomWorkbenchBundles,
	} = dicomWorkbenchModule;
	const telegram = useTelegramModule({
		settingsAdminSecretSession,
		loadDashboard,
		setError,
		dashboard,
		currentView,
		settingsTab,
		onboardingDismissed,
		onboardingStep,
		activePatient,
		activeDoctor,
		activeAppointment,
		uiPreferencesHydrated,
		setCurrentView,
		setSelectedDocumentKind,
	});
	const { telegramSettingsModule } = telegram;
	const { saveTelegramSettings } = telegramSettingsModule;

	const finance = useFinanceLogic({
		auth,
		dashboard,
		documentPatient,
		paymentPatientContextReady,
		paymentPatientContextMessage,
		realActiveVisitId,
		loadDashboard,
		setError,
	});

	const {
		paymentMutationIdRef,
		paymentAmount,
		setPaymentAmount,
		paymentMethod,
		setPaymentMethod,
		paymentFiscalReceiptNumber,
		setPaymentFiscalReceiptNumber,
		paymentFiscalReceiptIssuedAt,
		setPaymentFiscalReceiptIssuedAt,
		paymentFiscalFn,
		setPaymentFiscalFn,
		paymentFiscalFd,
		setPaymentFiscalFd,
		paymentFiscalFpd,
		setPaymentFiscalFpd,
		paymentFiscalCashierName,
		setPaymentFiscalCashierName,
		paymentFiscalReceiptUrl,
		setPaymentFiscalReceiptUrl,
		paymentPayerFullName,
		setPaymentPayerFullName,
		paymentPayerInn,
		setPaymentPayerInn,
		paymentPayerBirthDate,
		setPaymentPayerBirthDate,
		paymentPayerIdentityDocument,
		setPaymentPayerIdentityDocument,
		paymentPayerRelationship,
		setPaymentPayerRelationship,
		paymentTaxDeductionCode,
		setPaymentTaxDeductionCode,
		paymentFeedback,
		setPaymentFeedback,
		isPaymentSaving,
		recordPayment,
	} = finance;

	function updateClinicProfileDraft<K extends keyof ClinicProfileDraft>(
		key: K,
		value: ClinicProfileDraft[K],
	) {
		setClinicProfileDraft((current) => ({ ...current, [key]: value }));
		setClinicProfileDirty(true);
		setClinicProfileSaveState("idle");
	}

	function toggleClinicWorkingDay(day: number) {
		setClinicProfileDraft((current) => {
			const nextDays = current.workingDays.includes(day)
				? current.workingDays.filter((item) => item !== day)
				: [...current.workingDays, day];
			return { ...current, workingDays: normalizeWorkingDaysDraft(nextDays) };
		});
		setClinicProfileDirty(true);
		setClinicProfileSaveState("idle");
	}

	function toggleStaffWorkingDay(staffId: string, day: number) {
		const currentDraft =
			staffScheduleDrafts[staffId] ?? defaultStaffScheduleDraft();
		const workingDays = currentDraft.workingDays.includes(day)
			? currentDraft.workingDays.filter((item) => item !== day)
			: [...currentDraft.workingDays, day];
		updateStaffScheduleDraft(staffId, {
			workingDays: normalizeWorkingDaysDraft(workingDays),
		});
	}

	function toggleChairWorkingDay(chairId: string, day: number) {
		const currentDraft =
			chairScheduleDrafts[chairId] ?? defaultStaffScheduleDraft();
		const workingDays = currentDraft.workingDays.includes(day)
			? currentDraft.workingDays.filter((item) => item !== day)
			: [...currentDraft.workingDays, day];
		updateChairScheduleDraft(chairId, {
			workingDays: normalizeWorkingDaysDraft(workingDays),
		});
	}

	const reconcileDashboardScopedUiSelections = useCallback(
		function reconcileDashboardScopedUiSelections() {
			if (!dashboard) return;
			const doctorIds = new Set(
				(dashboard?.clinicSettings?.staff || [])
					.filter(
						(member) =>
							member.active &&
							(member.role === "doctor" || member.role === "owner"),
					)
					.map((member) => member.id),
			);
			const assistantIds = new Set(
				(dashboard?.clinicSettings?.staff || [])
					.filter((member) => member.active && member.role === "assistant")
					.map((member) => member.id),
			);
			const staffIds = new Set(
				(dashboard?.clinicSettings?.staff || [])
					.filter((member) => member.active)
					.map((member) => member.id),
			);
			const chairIds = new Set(
				(dashboard?.clinicSettings?.chairs || [])
					.filter((chair) => chair.active)
					.map((chair) => chair.id),
			);
			const protocolIds = new Set(
				dashboard?.protocolTemplates?.map((template) => template.id),
			);

			if (selectedProtocolId && !protocolIds.has(selectedProtocolId))
				setSelectedProtocolId(null);
			if (scheduleDoctorFilterId && !doctorIds.has(scheduleDoctorFilterId))
				setScheduleDoctorFilterId(null);
			if (
				scheduleAssistantFilterId &&
				!assistantIds.has(scheduleAssistantFilterId)
			)
				setScheduleAssistantFilterId(null);
			if (scheduleChairFilterId && !chairIds.has(scheduleChairFilterId))
				setScheduleChairFilterId(null);
			if (
				scheduleDefaultDoctorUserId &&
				!doctorIds.has(scheduleDefaultDoctorUserId)
			)
				setScheduleDefaultDoctorUserId(null);
			if (
				scheduleDefaultAssistantUserId &&
				!assistantIds.has(scheduleDefaultAssistantUserId)
			)
				setScheduleDefaultAssistantUserId(null);
			if (scheduleDefaultChairId && !chairIds.has(scheduleDefaultChairId))
				setScheduleDefaultChairId(null);
			if (telegramLinkStaffId && !staffIds.has(telegramLinkStaffId))
				setTelegramLinkStaffId("");
		},
		[
			dashboard,
			setScheduleChairFilterId,
			setScheduleDefaultDoctorUserId,
			setScheduleDefaultAssistantUserId,
			setScheduleDefaultChairId,
			setTelegramLinkStaffId,
			scheduleChairFilterId,
			scheduleDefaultDoctorUserId,
			scheduleDefaultAssistantUserId,
			scheduleDefaultChairId,
			telegramLinkStaffId,
			setScheduleDoctorFilterId,
			scheduleDoctorFilterId,
			setSelectedProtocolId,
			selectedProtocolId,
			scheduleAssistantFilterId,
			setScheduleAssistantFilterId,
		],
	);

	const saveClinicProfileFromDraft = useCallback(
		async function saveClinicProfileFromDraft(): Promise<boolean> {
			const payload = buildClinicProfileUpdatePayload(clinicProfileDraft);
			const expectedSignature = clinicProfileDraftSignature(clinicProfileDraft);
			if (!payload.clinicName?.trim()) {
				setError("Укажите рабочее название клиники.");
				setClinicProfileSaveState("error");
				return false;
			}
			setClinicProfileSaveState("saving");
			try {
				const response = await fetch(clinicProfileEndpoint, {
					method: "PUT",
					headers: auth.settingsAccessHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify(payload),
				});
				if (!response.ok)
					throw new Error(
						await responseErrorMessage(response, "Профиль клиники не сохранен"),
					);
				const clinicSettings =
					(await response.json()) as Dashboard["clinicSettings"];
				setDashboard((current) =>
					current
						? {
								...current,
								clinicName: clinicSettings?.profile?.clinicName ?? "",
								clinicSettings,
							}
						: current,
				);
				const latestMatchesSaved =
					clinicProfileDraftSignature(clinicProfileDraftRef.current) ===
					expectedSignature;
				if (latestMatchesSaved) {
					setClinicProfileDraft(
						clinicProfileDraftFromProfile(clinicSettings?.profile),
					);
					setClinicProfileDirty(false);
				}
				setClinicProfileSaveState(latestMatchesSaved ? "saved" : "idle");
				setError(null);
				return true;
			} catch (saveError) {
				showToast(
					actionFailureToast(
						"Профиль клиники не сохранен",
						(saveError as { status?: number })?.status ?? null,
					),
					"error",
				);
				const message = operatorWorkflowFailureMessage(
					"Профиль клиники не сохранен",
					saveError,
				);
				setClinicProfileSaveState("error");
				setError(message);
				return false;
			}
		},
		[
			clinicProfileDraft,
			auth,
			setClinicProfileDraft,
			setError,
			setClinicProfileSaveState,
			setDashboard,
			setClinicProfileDirty,
		],
	);

	async function saveClinicProfileIfDirty(): Promise<boolean> {
		if (!clinicProfileDirty) return true;
		return saveClinicProfileFromDraft();
	}

	function buildOnboardingFirstAppointmentIssues(): string[] {
		if (!clinicProfileDraft) return [];
		const issues: string[] = [];
		const requiredClinicDraftFields: Array<[string, string]> = [
			["название клиники", clinicProfileDraft.clinicName],
			["телефон клиники", clinicProfileDraft.phone],
			["часовой пояс", clinicProfileDraft.timezone],
		];
		for (const [label, value] of requiredClinicDraftFields) {
			if (!value.trim()) issues.push(label);
		}
		const activeStaff =
			(dashboard?.clinicSettings?.staff || []).filter(
				(member) => member.active,
			) ?? [];
		const activeDoctors = activeStaff.filter(
			(member) => member.role === "doctor" || member.role === "owner",
		);
		const activeAssistants = activeStaff.filter(
			(member) => member.role === "assistant",
		);
		const activeChairs =
			(dashboard?.clinicSettings?.chairs || []).filter(
				(chair) => chair.active,
			) ?? [];
		if (!activeDoctors.length) issues.push("врач для первого приема");
		if (!activeDoctors.some((member) => member.canSignMedicalRecords))
			issues.push("врач с правом подписи ЭМК");
		if (!activeChairs.length) issues.push("кресло / кабинет");
		if (
			dashboard?.clinicSettings?.profile?.mode !== "solo_doctor" &&
			!activeAssistants.length
		)
			issues.push("ассистент");
		const activeAppointmentReadiness = dashboard?.activeVisit?.appointmentId
			? dashboard.appointmentReadiness?.find(
					(readiness) =>
						readiness.appointmentId === dashboard?.activeVisit?.appointmentId,
				)
			: null;
		const activeAppointmentBlockingChecks =
			(activeAppointmentReadiness?.checks || []).filter(
				(check) =>
					(check.key === "team" || check.key === "schedule") && !check.ready,
			) ?? [];
		for (const check of activeAppointmentBlockingChecks) {
			issues.push(`${check.title.toLocaleLowerCase("ru-RU")}: ${check.detail}`);
		}
		return issues;
	}

	function buildOnboardingDocumentReadinessIssues(): string[] {
		if (!clinicProfileDraft) return [];
		const issues: string[] = [];
		const requiredDocumentDraftFields: Array<[string, string]> = [
			["юридическое наименование", clinicProfileDraft.legalName],
			["ИНН", clinicProfileDraft.inn],
			["адрес", clinicProfileDraft.address],
			["номер медицинской лицензии", clinicProfileDraft.medicalLicenseNumber],
			["дата медицинской лицензии", clinicProfileDraft.medicalLicenseIssuedAt],
			["орган, выдавший лицензию", clinicProfileDraft.medicalLicenseIssuer],
		];
		for (const [label, value] of requiredDocumentDraftFields) {
			if (!value.trim()) issues.push(label);
		}
		return issues;
	}

	function _buildOnboardingReadinessIssues(): string[] {
		return [
			...buildOnboardingFirstAppointmentIssues(),
			...buildOnboardingDocumentReadinessIssues(),
		];
	}

	function buildOnboardingTelegramRecommendations(): string[] {
		const recommendations: string[] = [];
		if (telegramModeDraft === "disabled")
			recommendations.push("включить режим Telegram");
		if (!telegramBotUsernameDraft.trim() && !telegramOwnBotUsernameDraft.trim())
			recommendations.push("указать имя Telegram-бота");
		if (!telegramPatientPortalBaseUrlDraft.trim())
			recommendations.push("добавить адрес портала пациента");
		if (!telegramReviewUrlDraft.trim())
			recommendations.push("добавить ссылку для оценки клиники");
		if (!telegramMapsUrlDraft.trim())
			recommendations.push("добавить ссылку на карточку клиники на картах");
		return recommendations;
	}

	function focusOnboardingIssue(issues: string[]): void {
		if (
			issues.some((issue) =>
				[
					"врач для первого приема",
					"врач с правом подписи ЭМК",
					"кресло / кабинет",
					"ассистент",
				].includes(issue),
			)
		) {
			setOnboardingStep("team");
			return;
		}
		if (
			issues.some((issue) =>
				["название клиники", "телефон клиники", "часовой пояс"].includes(issue),
			)
		) {
			setOnboardingStep("clinic");
			return;
		}
		if (
			issues.some((issue) =>
				[
					"юридическое наименование",
					"ИНН",
					"адрес",
					"номер медицинской лицензии",
					"дата медицинской лицензии",
					"орган, выдавший лицензию",
				].includes(issue),
			)
		) {
			setOnboardingStep("legal");
			return;
		}
		if (
			issues.some(
				(issue) =>
					issue.includes("Telegram") ||
					issue.includes("бот") ||
					issue.includes("портал") ||
					issue.includes("оценки") ||
					issue.includes("картах"),
			)
		) {
			setOnboardingStep("telegram");
		}
	}

	function assertOnboardingReadyForFinish(): boolean {
		const issues = buildOnboardingFirstAppointmentIssues();
		if (!issues.length) return true;
		focusOnboardingIssue(issues);
		setError(`Перед первым рабочим экраном заполните: ${issues.join(", ")}.`);
		return false;
	}

	function currentUiPreferencesInput(): UiPreferencesInput {
		return {
			uiLanguage,
			selectedWorkspaceRole,
			selectedSpecialty,
			selectedProtocolId,
			selectedPatientId,
			scheduleDoctorFilterId,
			scheduleAssistantFilterId,
			scheduleChairFilterId,
			scheduleDefaultDoctorUserId,
			scheduleDefaultAssistantUserId,
			scheduleDefaultChairId,
			scheduleStatusFilter,
			scheduleDateFilter,
			paymentMethod,
			taxDocumentYear,
			selectedDocumentKind,
			taxApplicationForm,
			taxApplicationDeliveryChannel,
			paymentReceiptTaxSupportRequested,
			documentIssueSignatureMode,
			documentIssueStaffFullName,
			documentIssueStaffRole,
			procedureConsentProcedureType,
			postVisitCareTopic,
			pricelistSourceKind,
			usePricelistAi,
			odontogramUseSurfaces,
			recognitionKind,
			recognitionTarget,
			importSourceKind,
			documentIngestionTarget,
			imagingImportSourceKind,
			smartImportMode,
			imagingKindFilter,
			dicomWebEndpointUrl,
			ohifBaseUrl,
			telegramBotConfigId: telegramBotConfigId.trim(),
			telegramLinkSubjectType,
			telegramLinkStaffId: telegramLinkStaffId || null,
			telegramOutboxStatusFilter,
			telegramOutboxTemplateFilter,
			onboardingDismissed,
			onboardingDismissedAt,
			onboardingStep,
			onboardingDraftMode,
		};
	}

	function clearUiPreferencesRetryTimer(): void {
		if (
			typeof window === "undefined" ||
			uiPreferencesRetryTimerRef.current === null
		)
			return;
		window.clearTimeout(uiPreferencesRetryTimerRef.current);
		uiPreferencesRetryTimerRef.current = null;
	}

	function queueUiPreferencesServerSync(
		preferences: UiPreferences,
		options: { delayMs?: number } = {},
	): void {
		pendingUiPreferencesSyncRef.current = preferences;
		if (
			!settingsAdminSecretSession.trim() ||
			!uiPreferencesServerReadyRef.current ||
			uiPreferencesSyncInFlightRef.current ||
			typeof window === "undefined"
		) {
			return;
		}
		clearUiPreferencesRetryTimer();
		uiPreferencesRetryTimerRef.current = window.setTimeout(() => {
			uiPreferencesRetryTimerRef.current = null;
			void flushPendingUiPreferencesServerSync();
		}, options.delayMs ?? 600);
	}

	async function flushPendingUiPreferencesServerSync(): Promise<void> {
		if (
			!settingsAdminSecretSession.trim() ||
			!uiPreferencesServerReadyRef.current ||
			uiPreferencesSyncInFlightRef.current
		)
			return;
		const preferences = pendingUiPreferencesSyncRef.current;
		if (!preferences) return;
		pendingUiPreferencesSyncRef.current = null;
		uiPreferencesSyncInFlightRef.current = true;
		try {
			await saveServerUiPreferences(preferences, settingsAdminSecretSession);
			if (!pendingUiPreferencesSyncRef.current) setUiPreferencesSyncError(null);
		} catch (preferencesError) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(preferencesError as { status?: number })?.status ?? null,
				),
				"error",
			);
			if (!pendingUiPreferencesSyncRef.current)
				pendingUiPreferencesSyncRef.current = preferences;
			setUiPreferencesSyncError(
				uiPreferencesSyncErrorMessage(preferencesError),
			);
		} finally {
			uiPreferencesSyncInFlightRef.current = false;
			const pending = pendingUiPreferencesSyncRef.current;
			if (pending)
				queueUiPreferencesServerSync(pending, {
					delayMs: pending.savedAt === preferences.savedAt ? 5000 : 0,
				});
		}
	}

	async function dismissOnboarding() {
		if (!assertOnboardingReadyForFinish()) return;
		if (!(await saveClinicProfileIfDirty())) return;
		if (!(await saveOnboardingSchedulesIfDirty())) return;
		if (telegramSettingsDirty && !(await saveTelegramSettings())) return;
		const previousPreferencesInput = currentUiPreferencesInput();
		const dismissalSavedAt = new Date().toISOString();
		const savedPreferences: UiPreferences = {
			version: 1,
			...previousPreferencesInput,
			onboardingDismissed: true,
			onboardingDismissedAt: dismissalSavedAt,
			onboardingDraftMode: false,
			savedAt: dismissalSavedAt,
		};
		if (uiPreferencesServerReadyRef.current) {
			try {
				await saveServerUiPreferences(
					savedPreferences,
					settingsAdminSecretSession,
				);
				pendingUiPreferencesSyncRef.current = null;
				setUiPreferencesSyncError(null);
			} catch (preferencesError) {
				showToast(
					actionFailureToast(
						"Ошибка выполнения операции",
						(preferencesError as { status?: number })?.status ?? null,
					),
					"error",
				);
				const message = uiPreferencesSyncErrorMessage(preferencesError);
				pendingUiPreferencesSyncRef.current = null;
				setUiPreferencesSyncError(message);
				setError(message);
				return;
			}
		}
		if (!persistUiPreferences(savedPreferences)) {
			const message =
				"Настройки интерфейса не сохранены: браузер заблокировал локальное хранилище.";
			setUiPreferencesSyncError(message);
			setError(message);
			return;
		}
		const dismissal = saveOnboardingDismissed(
			true,
			dismissalSavedAt,
			false,
			dashboard?.clinicSettings?.profile?.organizationId ?? null,
		);
		setOnboardingDismissed(true);
		setOnboardingDismissedAt(dismissal.savedAt);
		setOnboardingDraftMode(false);
	}

	async function continueOnboardingInDraftMode(targetView?: AppView) {
		if (!(await saveClinicProfileIfDirty())) return;
		if (!(await saveOnboardingSchedulesIfDirty())) return;
		if (
			onboardingStep === "telegram" &&
			telegramSettingsDirty &&
			!(await saveTelegramSettings())
		)
			return;
		const dismissalSavedAt = new Date().toISOString();
		const savedPreferences: UiPreferences = {
			version: 1,
			...currentUiPreferencesInput(),
			onboardingDismissed: true,
			onboardingDismissedAt: dismissalSavedAt,
			onboardingDraftMode: true,
			savedAt: dismissalSavedAt,
		};
		if (!persistUiPreferences(savedPreferences)) {
			const message =
				"Настройки интерфейса не сохранены: браузер заблокировал локальное хранилище.";
			setUiPreferencesSyncError(message);
			setError(message);
			return;
		}
		if (uiPreferencesServerReadyRef.current) {
			try {
				await saveServerUiPreferences(
					savedPreferences,
					settingsAdminSecretSession,
				);
				setUiPreferencesSyncError(null);
			} catch (preferencesError) {
				showToast(
					actionFailureToast(
						"Ошибка выполнения операции",
						(preferencesError as { status?: number })?.status ?? null,
					),
					"error",
				);
				queueUiPreferencesServerSync(savedPreferences, { delayMs: 5000 });
				setUiPreferencesSyncError(
					uiPreferencesSyncErrorMessage(preferencesError),
				);
			}
		}
		const dismissal = saveOnboardingDismissed(
			true,
			dismissalSavedAt,
			true,
			dashboard?.clinicSettings?.profile?.organizationId ?? null,
		);
		setOnboardingDismissed(true);
		setOnboardingDismissedAt(dismissal.savedAt);
		setOnboardingDraftMode(true);
		if (targetView && typeof window !== "undefined") {
			window.location.hash = targetView;
		}
	}

	async function moveOnboardingTo(step: OnboardingStep) {
		if (step === "done" && !assertOnboardingReadyForFinish()) return;
		if (!(await saveClinicProfileIfDirty())) return;
		if (!(await saveOnboardingSchedulesIfDirty())) return;
		if (
			onboardingStep === "telegram" &&
			telegramSettingsDirty &&
			!(await saveTelegramSettings())
		)
			return;
		setOnboardingStep(step);
	}

	function reopenOnboarding() {
		const dismissal = saveOnboardingDismissed(
			false,
			new Date().toISOString(),
			false,
			dashboard?.clinicSettings?.profile?.organizationId ?? null,
		);
		setOnboardingDismissed(false);
		setOnboardingDismissedAt(dismissal.savedAt);
		setOnboardingStep("intro");
		setOnboardingDraftMode(false);
		setOnboardingGuideExpanded(true);
		setCurrentView("settings");
		setSettingsTab("clinic");
		window.location.hash = "settings/clinic";
	}

	function openOnboardingGuide(step?: OnboardingStep) {
		if (step) setOnboardingStep(step);
		setOnboardingGuideExpanded(true);
		setCurrentView("settings");
		setSettingsTab("clinic");
		window.location.hash = "settings/clinic";
	}

	const loadPersistenceHealth = useCallback(
		async function loadPersistenceHealth(
			options: { silent?: boolean; adminSecret?: string | undefined } = {},
		) {
			try {
				const response = await fetch("/api/system/persistence/verify", {
					cache: "no-store",
					headers: auth.denteClinicalReadHeaders({}, options.adminSecret),
				});
				if (!response.ok)
					throw new Error(
						await responseErrorMessage(
							response,
							"Проверка сервера не выполнена",
						),
					);
				const report = (await response.json()) as PersistenceIntegrityReport & {
					meta?: PersistenceHealth;
				};
				setPersistenceIntegrity(report);
				setPersistenceHealth(normalizePersistenceHealth(report));
			} catch (healthError) {
				showToast(
					actionFailureToast(
						"Статус сохранности недоступен",
						(healthError as { status?: number })?.status ?? null,
					),
					"error",
				);
				if (!options.silent) {
					setError(
						operatorWorkflowFailureMessage(
							"Статус сохранности недоступен",
							healthError,
						),
					);
				}
			}
			// biome-ignore lint/correctness/useExhaustiveDependencies: Zustand setters are stable; auth is stable object
		},
		[auth, setError, setPersistenceIntegrity, setPersistenceHealth],
	);

	async function loadPersistenceIntegrity(options: { silent?: boolean } = {}) {
		try {
			const response = await fetch("/api/system/persistence/verify", {
				cache: "no-store",
				headers: auth.denteClinicalReadHeaders(),
			});
			if (!response.ok)
				throw new Error(
					await responseErrorMessage(
						response,
						"Проверка резервной копии не выполнена",
					),
				);
			const report = (await response.json()) as PersistenceIntegrityReport & {
				meta?: PersistenceHealth;
			};
			setPersistenceIntegrity(report);
			if (report.meta) setPersistenceHealth(report.meta);
		} catch (verifyError) {
			showToast(
				actionFailureToast(
					"Проверка резервной копии не выполнена",
					(verifyError as { status?: number })?.status ?? null,
				),
				"error",
			);
			if (!options.silent) {
				setError(
					operatorWorkflowFailureMessage(
						"Проверка резервной копии не выполнена",
						verifyError,
					),
				);
			}
		}
	}

	async function downloadPersistenceExport() {
		if (isPersistenceExporting) {
			setError("Дождитесь завершения текущего экспорта резервной копии.");
			return;
		}
		setIsPersistenceExporting(true);
		try {
			const response = await fetch("/api/system/persistence/export", {
				cache: "no-store",
				headers: auth.denteClinicalReadHeaders(),
			});
			if (!response.ok)
				throw new Error(
					await responseErrorMessage(
						response,
						"Экспорт резервной копии не выполнен",
					),
				);
			const blob = await response.blob();
			if (blob.size === 0)
				throw new Error("Сервер вернул пустой файл резервной копии.");
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `dental-crm-state-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "")}.json`;
			document.body.append(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);
			await loadPersistenceIntegrity({ silent: true });
			setError(null);
		} catch (exportError) {
			showToast(
				actionFailureToast(
					"Экспорт резервной копии не выполнен",
					(exportError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage(
					"Экспорт резервной копии не выполнен",
					exportError,
				),
			);
		} finally {
			setIsPersistenceExporting(false);
		}
	}

	const refreshBrowserContinuity = useCallback(
		async function refreshBrowserContinuity(
			options: { silent?: boolean } = {},
		) {
			try {
				setBrowserContinuity(await inspectBrowserContinuity());
			} catch (continuityError) {
				showToast(
					actionFailureToast(
						"Ошибка выполнения операции",
						(continuityError as { status?: number })?.status ?? null,
					),
					"error",
				);
				if (!options.silent) {
					setError(
						browserCapabilityFailureMessage(
							"Проверка сохранности браузера не выполнена",
							continuityError,
						),
					);
				}
			}
		},
		[setError, setBrowserContinuity],
	);

	async function _loadLocalBridgeReadiness(options: { silent?: boolean } = {}) {
		try {
			const response = await fetch("/api/system/local-bridges/readiness", {
				cache: "no-store",
				headers: auth.denteClinicalReadHeaders(),
			});
			if (!response.ok)
				throw new Error(
					await responseErrorMessage(
						response,
						"Готовность локального модуля не проверена",
					),
				);
			setLocalBridgeReadiness(
				(await response.json()) as LocalBridgeReadinessResponse,
			);
		} catch (bridgeError) {
			showToast(
				actionFailureToast(
					"Готовность локального модуля не проверена",
					(bridgeError as { status?: number })?.status ?? null,
				),
				"error",
			);
			if (!options.silent) {
				setError(
					operatorWorkflowFailureMessage(
						"Готовность локального модуля не проверена",
						bridgeError,
					),
				);
			}
		}
	}

	const loadLocalBridgeUsePlans = useCallback(
		async function loadLocalBridgeUsePlans(options: { silent?: boolean } = {}) {
			try {
				const response = await fetch("/api/system/local-bridges/use-plans", {
					cache: "no-store",
					headers: auth.denteClinicalReadHeaders(),
				});
				if (!response.ok)
					throw new Error(
						await responseErrorMessage(
							response,
							"План локального модуля недоступен",
						),
					);
				const payload = (await response.json()) as LocalBridgeUsePlansResponse;
				setLocalBridgeUsePlans(payload);
				setLocalBridgeReadiness(payload.readiness);
			} catch (planError) {
				showToast(
					actionFailureToast(
						"План локального модуля недоступен",
						(planError as { status?: number })?.status ?? null,
					),
					"error",
				);
				if (!options.silent) {
					setError(
						operatorWorkflowFailureMessage(
							"План локального модуля недоступен",
							planError,
						),
					);
				}
			}
		},
		[auth, setLocalBridgeUsePlans, setLocalBridgeReadiness, setError],
	);

	async function requestBrowserStoragePersistence() {
		if (
			typeof navigator === "undefined" ||
			!navigator.storage ||
			typeof navigator.storage.persist !== "function"
		) {
			setError("Постоянное хранилище браузера недоступно на этом устройстве.");
			return;
		}
		try {
			const granted = await navigator.storage.persist();
			await refreshBrowserContinuity({ silent: true });
			if (!granted) {
				setError(
					"Браузер не выдал постоянное хранилище. Локальные черновики работают, но устройство может очистить локальное хранилище при нехватке места.",
				);
			}
		} catch (storageError) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(storageError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				browserCapabilityFailureMessage(
					"Запрос постоянного хранилища не выполнен",
					storageError,
				),
			);
		}
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: safe
	const applyUiPreferences = useCallback((preferences: UiPreferences) => {
		setUiLanguage(preferences.uiLanguage);
		setSelectedWorkspaceRole(preferences.selectedWorkspaceRole);
		setSelectedSpecialty(preferences.selectedSpecialty);
		setSelectedProtocolId(preferences.selectedProtocolId);
		setSelectedPatientId(preferences.selectedPatientId);
		setScheduleDoctorFilterId(preferences.scheduleDoctorFilterId);
		setScheduleAssistantFilterId(preferences.scheduleAssistantFilterId);
		setScheduleChairFilterId(preferences.scheduleChairFilterId);
		setScheduleDefaultDoctorUserId(preferences.scheduleDefaultDoctorUserId);
		setScheduleDefaultAssistantUserId(
			preferences.scheduleDefaultAssistantUserId,
		);
		setScheduleDefaultChairId(preferences.scheduleDefaultChairId);
		setScheduleStatusFilter(preferences.scheduleStatusFilter);
		setScheduleDateFilter(preferences.scheduleDateFilter);
		setOnboardingDismissed(preferences.onboardingDismissed);
		setOnboardingDismissedAt(preferences.onboardingDismissedAt ?? null);
		setOnboardingStep(preferences.onboardingStep);
		setOnboardingDraftMode(preferences.onboardingDraftMode);
		setPaymentMethod(preferences.paymentMethod);
		setTaxDocumentYear(preferences.taxDocumentYear);
		setSelectedDocumentKind(preferences.selectedDocumentKind);
		setTaxApplicationForm(preferences.taxApplicationForm);
		setTaxApplicationDeliveryChannel(preferences.taxApplicationDeliveryChannel);
		setPaymentReceiptTaxSupportRequested(
			preferences.paymentReceiptTaxSupportRequested,
		);
		setDocumentIssueSignatureMode(preferences.documentIssueSignatureMode);
		setDocumentIssueStaffFullName(preferences.documentIssueStaffFullName);
		setDocumentIssueStaffRole(preferences.documentIssueStaffRole);
		setProcedureConsentProcedureType(preferences.procedureConsentProcedureType);
		setPostVisitCareTopic(preferences.postVisitCareTopic);
		setPricelistSourceKind(preferences.pricelistSourceKind);
		setUsePricelistAi(preferences.usePricelistAi);
		setOdontogramUseSurfaces(preferences.odontogramUseSurfaces ?? false);
		setRecognitionKind(preferences.recognitionKind);
		setRecognitionTarget(preferences.recognitionTarget);
		setImportSourceKind(preferences.importSourceKind);
		setDocumentIngestionTarget(preferences.documentIngestionTarget);
		setImagingImportSourceKind(preferences.imagingImportSourceKind);
		setSmartImportMode(preferences.smartImportMode);
		setImagingKindFilter(preferences.imagingKindFilter);
		setDicomWebEndpointUrl(preferences.dicomWebEndpointUrl);
		setOhifBaseUrl(preferences.ohifBaseUrl);
		setTelegramBotConfigId(preferences.telegramBotConfigId);
		setTelegramLinkSubjectType(preferences.telegramLinkSubjectType);
		setTelegramLinkStaffId(preferences.telegramLinkStaffId ?? "");
		setTelegramOutboxStatusFilter(preferences.telegramOutboxStatusFilter);
		setTelegramOutboxTemplateFilter(preferences.telegramOutboxTemplateFilter);
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: applyUiPreferences/queueUiPreferencesServerSync are plain functions recreated each render; listing them causes infinite re-run
	useEffect(() => {
		let cancelled = false;
		const preferencesAccessSecret = settingsAdminSecretSession.trim();
		if (!preferencesAccessSecret) {
			uiPreferencesServerReadyRef.current = false;
			uiPreferencesHydratedRef.current = true;
			setUiPreferencesHydrated(true);
			return () => {
				cancelled = true;
			};
		}
		loadServerUiPreferences(preferencesAccessSecret)
			.then(async (serverPreferences) => {
				if (cancelled) return;
				const localPreferences = loadUiPreferences();
				if (
					serverPreferences &&
					(!localPreferences.savedAt ||
						(serverPreferences.savedAt &&
							serverPreferences.savedAt > localPreferences.savedAt))
				) {
					applyUiPreferences(serverPreferences);
					safeLocalStorageSetItem(
						uiPreferencesStorageKey,
						JSON.stringify(serverPreferences),
					);
					setUiPreferencesSyncError(null);
				} else if (!serverPreferences && localPreferences.savedAt) {
					await saveServerUiPreferences(
						localPreferences,
						preferencesAccessSecret,
					);
					if (!cancelled) setUiPreferencesSyncError(null);
				}
			})
			.catch((preferencesError) => {
				if (!cancelled) {
					setUiPreferencesSyncError(
						uiPreferencesSyncErrorMessage(preferencesError),
					);
				}
			})
			.finally(() => {
				if (!cancelled) {
					uiPreferencesServerReadyRef.current = true;
					uiPreferencesHydratedRef.current = true;
					setUiPreferencesHydrated(true);
					const pendingPreferences = pendingUiPreferencesSyncRef.current;
					if (pendingPreferences)
						queueUiPreferencesServerSync(pendingPreferences, { delayMs: 0 });
				}
			});
		return () => {
			cancelled = true;
		};
	}, [
		settingsAdminSecretSession,
		setUiPreferencesHydrated,
		setUiPreferencesSyncError,
	]);

	/*
	 * Отметка об открытии карточки пациента.
	 *
	 * Виджет «Недавние» в шапке рабочего места читал таблицу
	 * recent_patient_history, в которую не писал никто и никогда: ни одной
	 * вставки во всём сервере, ноль строк в живой базе. Каждому пользователю
	 * каждый день показывалось «История просмотров пуста», и выглядело это как
	 * «функция есть, просто ещё не накопилось».
	 *
	 * Отметка ставится здесь, а не в обработчиках нажатий: карточка выбирается
	 * из списка, из поиска, из задачи, из расписания и из самого виджета —
	 * пришлось бы дописывать пять мест и забыть шестое. Смена selectedPatientId
	 * — единственное общее событие.
	 *
	 * Ошибка запроса намеренно проглатывается: история просмотров не стоит
	 * того, чтобы мешать врачу работать сообщением о сбое.
	 */
	/*
	 * Набор включённых модулей читается с сервера при запуске.
	 *
	 * loadWorkspaceProfile() в собственном комментарии заявлена «used in App
	 * startup» — и её не звал НИКТО. Из-за этого набор модулей жил только в
	 * localStorage браузера: на втором устройстве, в другом браузере и у второго
	 * сотрудника клиника получала все модули включёнными, а выбор владельца никуда
	 * не доходил. Вместе с тем, что сервер до миграции 0139 отдавал константу и не
	 * сохранял ничего, вся модульность держалась на одном лишь localStorage.
	 *
	 * Запрос уходит один раз за сеанс, после загрузки рабочей смены: до неё нет ни
	 * токена сотрудника, ни организации.
	 */
	useEffect(() => {
		if (!dashboard || workspaceProfileLoadedRef.current) return;
		workspaceProfileLoadedRef.current = true;
		void loadWorkspaceProfile();
	}, [dashboard]);

	useEffect(() => {
		if (!selectedPatientId || !dashboard) return;
		if (recordedPatientViewRef.current === selectedPatientId) return;
		recordedPatientViewRef.current = selectedPatientId;
		void fetch("/api/hr/recent-patients", {
			method: "POST",
			headers: auth.denteClinicalMutationHeaders({
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ patientId: selectedPatientId }),
		})
			.then((response) => {
				if (response.ok) setRecentPatientViewsVersion((version) => version + 1);
			})
			.catch((err) => {
				showToast(
					actionFailureToast(
						"Ошибка обновления списка пациентов",
						(err as { status?: number })?.status ?? null,
					),
					"error",
				);
			});
	}, [selectedPatientId, dashboard, auth.denteClinicalMutationHeaders]);

	useEffect(() => {
		const organizationId =
			dashboard?.clinicSettings?.profile?.organizationId?.trim() ?? "";
		if (
			!uiPreferencesHydrated ||
			!organizationId ||
			onboardingDismissalHydratedOrganizationIdRef.current === organizationId
		)
			return;
		onboardingDismissalHydratedOrganizationIdRef.current = organizationId;
		const scopedDismissal = loadOnboardingDismissalState(organizationId);
		if (!scopedDismissal?.savedAt) return;
		const preferenceDismissedAt =
			onboardingDismissedAt ?? loadUiPreferences().savedAt;
		if (
			preferenceDismissedAt &&
			scopedDismissal.savedAt < preferenceDismissedAt
		)
			return;
		setOnboardingDismissed(scopedDismissal.dismissed);
		setOnboardingDismissedAt(scopedDismissal.savedAt);
		setOnboardingDraftMode(
			scopedDismissal.dismissed ? scopedDismissal.draftMode : false,
		);
		if (!scopedDismissal.dismissed) setOnboardingStep("intro");
	}, [
		dashboard?.clinicSettings?.profile?.organizationId,
		onboardingDismissedAt,
		uiPreferencesHydrated,
		setOnboardingStep,
		setOnboardingDismissedAt,
		setOnboardingDraftMode,
		setOnboardingDismissed,
	]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: currentUiPreferencesInput/queueUiPreferencesServerSync are plain closures over component state; they are intentionally excluded to prevent infinite re-render loops
	useEffect(() => {
		if (!uiPreferencesHydrated) return undefined;
		const savedPreferences = saveUiPreferences(currentUiPreferencesInput());
		if (!savedPreferences) {
			setUiPreferencesSyncError(
				"Настройки интерфейса не сохранены: браузер заблокировал локальное хранилище.",
			);
			return undefined;
		}
		queueUiPreferencesServerSync(savedPreferences, { delayMs: 600 });
		return undefined;
	}, [uiPreferencesHydrated, setUiPreferencesSyncError]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: clearUiPreferencesRetryTimer is a plain function (uses only refs); including it causes infinite re-render
	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		const retryPendingUiPreferences = () => {
			const pendingPreferences =
				pendingUiPreferencesSyncRef.current ?? loadUiPreferences();
			if (pendingPreferences)
				queueUiPreferencesServerSync(pendingPreferences, { delayMs: 0 });
		};
		window.addEventListener("online", retryPendingUiPreferences);
		return () => {
			window.removeEventListener("online", retryPendingUiPreferences);
			clearUiPreferencesRetryTimer();
		};
	}, []);

	const imagingPreviewWorkset = useMemo(() => {
		if (currentView !== "imaging" || !dashboard?.imagingStudies?.length)
			return [];
		const activeStudies = (dashboard.imagingStudies || [])
			.filter((study) => study.patientId === dashboard?.activeVisit?.patientId)
			.sort((left, right) => right.capturedAt.localeCompare(left.capturedAt));
		const visibleStudies =
			imagingKindFilter === "all"
				? activeStudies
				: activeStudies.filter((study) => study.kind === imagingKindFilter);
		const selectedStudy =
			visibleStudies?.find((study) => study.id === selectedImagingStudyId) ??
			visibleStudies[0] ??
			null;
		const comparisonStudies = selectedStudy
			? activeStudies
					.filter((study) => study.id !== selectedStudy.id)
					.map((study) => ({
						study,
						score: imagingComparisonScore(selectedStudy, study),
					}))
					.sort(
						(left, right) =>
							right.score - left.score ||
							imagingCaptureDistanceMs(
								selectedStudy.capturedAt,
								left.study.capturedAt,
							) -
								imagingCaptureDistanceMs(
									selectedStudy.capturedAt,
									right.study.capturedAt,
								) ||
							right.study.capturedAt.localeCompare(left.study.capturedAt),
					)
					.slice(0, 4)
					.map((item) => item.study)
			: [];
		const workset = new Map<string, Dashboard["imagingStudies"][number]>();
		[selectedStudy, ...comparisonStudies, ...visibleStudies].forEach(
			(study) => {
				if (study) workset.set(study.id, study);
			},
		);
		return Array.from(workset.values());
	}, [currentView, dashboard, imagingKindFilter, selectedImagingStudyId]);
	const _imagingPreviewSignature = imagingPreviewWorkset
		.map((study) => `${study.id}:${study.previewUrl}`)
		.join("|");
	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		if (!imagingPreviewWorkset.length) {
			setImagingPreviewObjectUrls((current) => {
				auth.revokeObjectUrlMap(current);
				return {};
			});
			return undefined;
		}

		let cancelled = false;
		const abortController = new AbortController();
		const createdUrls: string[] = [];
		void Promise.all(
			imagingPreviewWorkset.map(
				async (study): Promise<[string, string] | null> => {
					if (!study.previewUrl.startsWith("/api/"))
						return [study.id, study.previewUrl];
					const response = await fetch(study.previewUrl, {
						cache: "no-store",
						headers: auth.denteClinicalReadHeaders(),
						signal: abortController.signal,
					});
					if (!response.ok) return null;
					const blobUrl = URL.createObjectURL(await response.blob());
					if (cancelled) {
						auth.revokeObjectUrlIfNeeded(blobUrl);
						return null;
					}
					createdUrls.push(blobUrl);
					return [study.id, blobUrl];
				},
			),
		)
			.then((entries) => {
				if (cancelled) {
					createdUrls.forEach(auth.revokeObjectUrlIfNeeded);
					return;
				}
				const next = Object.fromEntries(
					entries.filter((entry): entry is [string, string] => Boolean(entry)),
				);
				const nextUrls = new Set(Object.values(next));
				setImagingPreviewObjectUrls((current) => {
					Object.values(current).forEach((url) => {
						if (!nextUrls.has(url)) auth.revokeObjectUrlIfNeeded(url);
					});
					return next;
				});
			})
			.catch((err) => {
				showToast(
					actionFailureToast(
						"Ошибка при создании превью снимка",
						(err as { status?: number })?.status ?? null,
					),
					"error",
				);
				createdUrls.forEach(auth.revokeObjectUrlIfNeeded);
				if (!cancelled) {
					setImagingPreviewObjectUrls((current) => {
						auth.revokeObjectUrlMap(current);
						return {};
					});
				}
			});

		return () => {
			cancelled = true;
			abortController.abort();
			createdUrls.forEach(auth.revokeObjectUrlIfNeeded);
		};
	}, [
		imagingPreviewWorkset,
		auth.revokeObjectUrlIfNeeded,
		auth.denteClinicalReadHeaders,
		auth.revokeObjectUrlMap,
	]);

	useEffect(() => {
		if (!dashboard || clinicProfileDraftHydratedRef.current) return;
		if (dashboard?.clinicSettings?.profile) {
			setClinicProfileDraft(
				clinicProfileDraftFromProfile(dashboard?.clinicSettings?.profile),
			);
		} else {
			setClinicProfileDraft(emptyClinicProfileDraft);
		}
		setClinicProfileDirty(false);
		clinicProfileDraftHydratedRef.current = true;
	}, [dashboard, setClinicProfileDirty, setClinicProfileDraft]);

	useEffect(() => {
		if (!dashboard) return;
		setStaffScheduleDrafts((current: any) => {
			const next: Record<string, StaffScheduleDraft> = {};
			(dashboard?.clinicSettings?.staff ?? []).forEach((member) => {
				next[member.id] =
					current[member.id] ??
					staffScheduleDraftFromWorkingHours(member.workingHours ?? null);
			});
			return next;
		});
	}, [dashboard, setStaffScheduleDrafts]);

	useEffect(() => {
		if (!dashboard) return;
		setChairScheduleDrafts((current: any) => {
			const next: Record<string, StaffScheduleDraft> = {};
			(dashboard?.clinicSettings?.chairs ?? []).forEach((chair) => {
				next[chair.id] =
					current[chair.id] ??
					staffScheduleDraftFromWorkingHours(chair.workingHours ?? null);
			});
			return next;
		});
	}, [dashboard, setChairScheduleDrafts]);

	useEffect(() => {
		if (!dashboard) return;
		setAppointmentScheduleDrafts((current: any) => {
			return (dashboard?.appointments ?? []).reduce(
				(next: Record<string, AppointmentScheduleDraft>, appointment) => {
					next[appointment.id] =
						current[appointment.id] ??
						appointmentScheduleDraftFromAppointment(appointment);
					return next;
				},
				{},
			);
		});
	}, [dashboard, setAppointmentScheduleDrafts]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: global action without stale state
	useEffect(() => {
		reconcileDashboardScopedUiSelections();
	}, []);

	const newAppointmentPreferenceDefaultsRef = useRef(
		newAppointmentPreferenceDefaults,
	);
	newAppointmentPreferenceDefaultsRef.current =
		newAppointmentPreferenceDefaults;

	useEffect(() => {
		if (!dashboard) return;
		if (newAppointmentDraftUserEditedRef.current) return;
		setNewAppointmentDraft(
			newAppointmentDraftFromDashboard(
				dashboard,
				newAppointmentPreferenceDefaultsRef.current(),
			),
		);
	}, [dashboard, setNewAppointmentDraft]);

	useEffect(() => {
		staffScheduleDraftsRef.current = staffScheduleDrafts;
	}, [staffScheduleDrafts]);

	useEffect(() => {
		chairScheduleDraftsRef.current = chairScheduleDrafts;
	}, [chairScheduleDrafts]);

	useEffect(() => {
		appointmentScheduleDraftsRef.current = appointmentScheduleDrafts;
	}, [appointmentScheduleDrafts]);

	useEffect(() => {
		if (!dashboard || staffScheduleDirtyIds.size === 0) return undefined;
		const dirtyStaffIds = Array.from(staffScheduleDirtyIds).filter(
			(staffId) => staffScheduleSaveStates[staffId] !== "saving",
		);
		if (!dirtyStaffIds.length) return undefined;
		const staffRetryingErrors = dirtyStaffIds.some(
			(staffId) => staffScheduleSaveStates[staffId] === "error",
		);
		const saveTimer = window.setTimeout(
			() => {
				dirtyStaffIds.forEach((staffId) => void saveStaffSchedule(staffId));
			},
			staffRetryingErrors ? 5000 : 1200,
		);
		return () => window.clearTimeout(saveTimer);
	}, [
		dashboard,
		staffScheduleDirtyIds,
		staffScheduleSaveStates,
		saveStaffSchedule,
	]);

	useEffect(() => {
		if (!dashboard || chairScheduleDirtyIds.size === 0) return undefined;
		const dirtyChairIds = Array.from(chairScheduleDirtyIds).filter(
			(chairId) => chairScheduleSaveStates[chairId] !== "saving",
		);
		if (!dirtyChairIds.length) return undefined;
		const chairRetryingErrors = dirtyChairIds.some(
			(chairId) => chairScheduleSaveStates[chairId] === "error",
		);
		const saveTimer = window.setTimeout(
			() => {
				dirtyChairIds.forEach((chairId) => void saveChairSchedule(chairId));
			},
			chairRetryingErrors ? 5000 : 1200,
		);
		return () => window.clearTimeout(saveTimer);
	}, [
		dashboard,
		chairScheduleDirtyIds,
		chairScheduleSaveStates,
		saveChairSchedule,
	]);

	useEffect(() => {
		if (!dashboard || appointmentScheduleDirtyIds.size === 0) return undefined;
		const dirtyAppointmentIds = Array.from(appointmentScheduleDirtyIds).filter(
			(appointmentId) =>
				appointmentScheduleSaveStates[appointmentId] !== "saving",
		);
		if (!dirtyAppointmentIds.length) return undefined;
		const appointmentRetryingErrors = dirtyAppointmentIds.some(
			(appointmentId) =>
				appointmentScheduleSaveStates[appointmentId] === "error",
		);
		const saveTimer = window.setTimeout(
			() => {
				dirtyAppointmentIds.forEach((appointmentId) => {
					void saveAppointmentSchedule(appointmentId, {
						closeEditorOnSave: false,
					});
				});
			},
			appointmentRetryingErrors ? 5000 : 1200,
		);
		return () => window.clearTimeout(saveTimer);
	}, [
		dashboard,
		appointmentScheduleDirtyIds,
		appointmentScheduleSaveStates,
		saveAppointmentSchedule,
	]);

	useEffect(() => {
		if (!dashboard || typeof window === "undefined") return undefined;
		const retryScheduleAutosaves = () => {
			Array.from(staffScheduleDirtyIds).forEach((staffId) => {
				if (staffScheduleSaveStates[staffId] !== "saving") {
					void saveStaffSchedule(staffId);
				}
			});
			Array.from(chairScheduleDirtyIds).forEach((chairId) => {
				if (chairScheduleSaveStates[chairId] !== "saving") {
					void saveChairSchedule(chairId);
				}
			});
			Array.from(appointmentScheduleDirtyIds).forEach((appointmentId) => {
				if (appointmentScheduleSaveStates[appointmentId] !== "saving") {
					void saveAppointmentSchedule(appointmentId, {
						closeEditorOnSave: false,
					});
				}
			});
		};
		window.addEventListener("online", retryScheduleAutosaves);
		return () => window.removeEventListener("online", retryScheduleAutosaves);
	}, [
		dashboard,
		staffScheduleDirtyIds,
		staffScheduleSaveStates,
		chairScheduleDirtyIds,
		chairScheduleSaveStates,
		appointmentScheduleDirtyIds,
		appointmentScheduleSaveStates,
		saveChairSchedule,
		saveAppointmentSchedule,
		saveStaffSchedule,
	]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: global action without stale state
	useEffect(() => {
		if (
			!dashboard ||
			!clinicProfileDirty ||
			clinicProfileSaveState === "saving" ||
			!clinicProfileDraft.clinicName.trim()
		) {
			return undefined;
		}
		const saveTimer = window.setTimeout(() => {
			void saveClinicProfileFromDraft();
		}, 1400);
		return () => window.clearTimeout(saveTimer);
	}, [
		clinicProfileDraft,
		clinicProfileDirty,
		clinicProfileSaveState,
		dashboard,
	]);

	useEffect(() => {
		setNewStaffSpecialty(selectedSpecialty);
	}, [selectedSpecialty, setNewStaffSpecialty]);

	useEffect(() => {
		setBrowserDirectoryPickerAvailable(
			typeof window !== "undefined" &&
				typeof (window as BrowserDirectoryPickerWindow).showDirectoryPicker ===
					"function",
		);
		const input = browserDirectoryInputRef.current;
		if (input) {
			input.setAttribute("webkitdirectory", "");
			input.setAttribute("directory", "");
		}
		const migrationInput = browserMigrationInputRef.current;
		if (migrationInput) {
			migrationInput.setAttribute("webkitdirectory", "");
			migrationInput.setAttribute("directory", "");
		}
	}, [setBrowserDirectoryPickerAvailable]);

	useEffect(() => {
		let cancelled = false;
		const restore = async () => {
			const recovered =
				await loadLocalDicomWorkbenchDraft(activeOrganizationId);
			if (cancelled) return;
			if (recovered) {
				applyDicomWorkbenchManifest(recovered.manifest);
				setDicomWorkbenchLocalSavedAt(recovered.clientSavedAt);
			}
			void loadDicomWorkbenchBundles({
				silent: true,
				restoreLatest: !recovered,
			});
		};
		void restore();
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		activeOrganizationId,
		setDicomWorkbenchLocalSavedAt,
		loadDicomWorkbenchBundles,
		applyDicomWorkbenchManifest,
	]);

	useEffect(() => {
		const organizationId = activeOrganizationId?.trim() ?? "";
		if (
			!organizationId ||
			localImagingRecoveryHydratedOrganizationIdRef.current === organizationId
		)
			return;
		localImagingRecoveryHydratedOrganizationIdRef.current = organizationId;
		const localFolderDraft = loadLocalImagingFolderDraft(organizationId);
		setLocalImagingFolderDraft(localFolderDraft);
		setImagingFolderPath(localFolderDraft?.folderPath ?? "C:\\Images");
		setBrowserPickedImagingFolder(
			loadBrowserPickedImagingFolderPreview(organizationId),
		);
	}, [
		activeOrganizationId,
		setImagingFolderPath,
		setLocalImagingFolderDraft,
		setBrowserPickedImagingFolder,
	]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: global action without stale state
	useEffect(() => {
		if (currentView === "settings" && settingsTab === "audit") {
			void loadPersistenceHealth({ silent: true });
			void refreshBrowserContinuity({ silent: true });
			void loadLocalBridgeUsePlans({ silent: true });
		}
	}, [currentView, settingsTab]);

	useEffect(() => {
		if (currentView === "settings") {
			setOnboardingGuideExpanded(settingsTab === "clinic");
			activeSettingsTabButtonRef.current?.scrollIntoView({
				behavior: "auto",
				inline: "center",
				block: "nearest",
			});
		} else {
			setOnboardingGuideExpanded(false);
		}
	}, [currentView, settingsTab, setOnboardingGuideExpanded]);

	useEffect(() => {
		const syncView = () => {
			const nextView = viewFromHash();
			setCurrentView(nextView);
			if (nextView === "settings") {
				setSettingsTab(settingsTabFromHash());
			}
		};
		syncView();
		window.addEventListener("hashchange", syncView);
		return () => window.removeEventListener("hashchange", syncView);
	}, [setSettingsTab, setCurrentView]);

	useEffect(() => {
		/*
		 * Здесь БОЛЬШЕ НЕ ОХРАННИК — решение о том, что рисовать, принято выше при
		 * рендере, и запрещённый раздел уже не смонтирован. Остаётся привести к
		 * этому решению хранилище и адрес: иначе в строке браузера висел бы #visit
		 * при открытой «Смене», и следующая перезагрузка снова целилась бы в
		 * закрытый роли раздел. Проверка на равенство обязательна: без неё
		 * setCurrentView() на каждом проходе перезапускал бы этот же эффект.
		 */
		if (requestedWorkspaceView === currentView) return;
		setCurrentView(currentView);
		window.location.hash = currentView;
	}, [requestedWorkspaceView, currentView, setCurrentView]);

	useEffect(() => {
		let cancelled = false;
		const refresh = async () => {
			const status = await inspectBrowserContinuity();
			if (!cancelled) setBrowserContinuity(status);
		};
		const onVisibility = () => {
			if (document.visibilityState === "visible") void refresh();
		};
		const onControllerChange = () => void refresh();
		void refresh();
		window.addEventListener("online", refresh);
		window.addEventListener("offline", refresh);
		document.addEventListener("visibilitychange", onVisibility);
		navigator.serviceWorker?.addEventListener(
			"controllerchange",
			onControllerChange,
		);
		return () => {
			cancelled = true;
			window.removeEventListener("online", refresh);
			window.removeEventListener("offline", refresh);
			document.removeEventListener("visibilitychange", onVisibility);
			navigator.serviceWorker?.removeEventListener(
				"controllerchange",
				onControllerChange,
			);
		};
	}, [setBrowserContinuity]);

	useEffect(() => {
		void refreshPendingVisitSaveState();
		void refreshPendingSpeechChunkState();
		const markOnline = () => {
			setIsOnline(true);
			void flushPendingVisitSaves({ silent: true });
			void flushPendingSpeechChunks({ silent: true });
			if (lastLocalSavedAt)
				void syncVisitDraftAutosave(lastLocalSavedAt, { silent: true });
		};
		const markOffline = () => setIsOnline(false);
		const refreshFromStorage = () => {
			void refreshPendingVisitSaveState();
			void refreshPendingSpeechChunkState();
		};
		window.addEventListener("online", markOnline);
		window.addEventListener("offline", markOffline);
		window.addEventListener("storage", refreshFromStorage);
		const syncTimer = window.setTimeout(() => {
			void flushPendingVisitSaves({ silent: true });
			void flushPendingSpeechChunks({ silent: true });
		}, 700);
		return () => {
			window.removeEventListener("online", markOnline);
			window.removeEventListener("offline", markOffline);
			window.removeEventListener("storage", refreshFromStorage);
			window.clearTimeout(syncTimer);
		};
	}, [
		lastLocalSavedAt,
		setIsOnline,
		refreshPendingVisitSaveState,
		syncVisitDraftAutosave,
		flushPendingSpeechChunks,
		refreshPendingSpeechChunkState,
		flushPendingVisitSaves,
	]);

	useEffect(() => {
		if (!dashboard) return;
		void loadSpeechRecordingStrategy({ silent: true });
	}, [dashboard?.activeVisit?.id, loadSpeechRecordingStrategy, dashboard]);

	useEffect(() => {
		if (!dashboard) return;
		let cancelled = false;
		visitDraftUserEditedRef.current = false;
		setLocalAutosaveReady(false);
		// Отметки зубов и ИИ-диагнозы относятся к КОНКРЕТНОМУ приёму. Без сброса
		// они переносились на следующего пациента (см. resetVisitToothState).
		resetVisitToothState();
		/*
		 * ЧЕРНОВИК В ПАМЯТИ БРАУЗЕРА ПРИНАДЛЕЖИТ КОНКРЕТНОМУ ПРИЁМУ, А НЕ «ЛЮБОМУ».
		 *
		 * Сводка теперь честно отвечает `activeVisit: null`, когда в клинике не
		 * открыт ни один приём (`dashboardSchema.activeVisit` — `visitSchema.nullable()`).
		 * До этого сервер подставлял заготовку с нулевым идентификатором, и черновик
		 * врача сохранялся в памяти браузера под ключом этого несуществующего приёма,
		 * а затем восстанавливался в СЛЕДУЮЩИЙ открытый приём: ключ у всех «приёмов,
		 * которых нет», один и тот же. Продиктованное про одного человека всплывало в
		 * записи другого.
		 *
		 * Раннего выхода здесь НЕТ намеренно: ветка `else` ниже очищает поля ЭМК от
		 * предыдущего приёма (`visitNoteFormFromVisit` на `null` даёт пустую форму).
		 * Выйти сразу значило бы оставить на экране текст закрытого приёма.
		 */
		const openVisitId = dashboard.activeVisit?.id ?? null;
		const savedDraft = openVisitId
			? loadVisitLocalDraft(openVisitId, activeOrganizationId)
			: null;
		const serverUpdatedAt = dashboard.activeVisit
			? Date.parse(dashboard.activeVisit.updatedAt)
			: Number.NaN;
		const savedAt = savedDraft ? Date.parse(savedDraft.savedAt) : Number.NaN;

		if (savedDraft && Number.isFinite(savedAt) && savedAt > serverUpdatedAt) {
			setTranscript(savedDraft.transcript);
			setSelectedSpecialty(savedDraft.selectedSpecialty);
			setVisitNoteForm(savedDraft.visitNoteForm);
			setLastLocalSavedAt(savedDraft.savedAt);
			setLocalDraftWasRestored(true);
		} else {
			const defaultSpecialty = inferDashboardVisitSpecialty(dashboard);
			setSelectedSpecialty((current) =>
				current === "therapist" || current === "universal"
					? defaultSpecialty
					: current,
			);
			setVisitNoteForm(visitNoteFormFromVisit(dashboard.activeVisit));
			setLastLocalSavedAt(null);
			setLocalDraftWasRestored(false);
		}

		const restoreServerDraft = async () => {
			try {
				const result = await loadServerVisitDraft(dashboard?.activeVisit?.id);
				if (cancelled || !result.serverDraft) return;
				if (visitDraftUserEditedRef.current) {
					setLastServerDraftSavedAt(result.serverDraft.serverSavedAt);
					return;
				}
				const serverDraftAt = Date.parse(result.serverDraft.serverSavedAt);
				const localDraftAt = Number.isFinite(savedAt) ? savedAt : 0;
				const activeVisitAt = Number.isFinite(serverUpdatedAt)
					? serverUpdatedAt
					: 0;
				if (
					Number.isFinite(serverDraftAt) &&
					serverDraftAt > Math.max(localDraftAt, activeVisitAt)
				) {
					setTranscript(result.serverDraft.transcript);
					setSelectedSpecialty(result.serverDraft.selectedSpecialty);
					setVisitNoteForm(visitNoteFormFromDraft(result.serverDraft.draft));
					setLastServerDraftSavedAt(result.serverDraft.serverSavedAt);
					setLocalDraftWasRestored(true);
					lastServerDraftSignatureRef.current = visitDraftSignature(
						result.serverDraft.transcript,
						result.serverDraft.selectedSpecialty,
						visitNoteFormFromDraft(result.serverDraft.draft),
					);
				} else {
					setLastServerDraftSavedAt(result.serverDraft.serverSavedAt);
				}
			} catch {
				if (!cancelled) setServerDraftSyncState("queued");
			} finally {
				if (!cancelled) setLocalAutosaveReady(true);
			}
		};

		void restoreServerDraft();
		return () => {
			cancelled = true;
		};
	}, [
		activeOrganizationId,
		dashboard?.activeVisit?.id,
		dashboard?.activeVisit?.updatedAt,
		setTranscript,
		setVisitNoteForm,
		lastServerDraftSignatureRef,
		setLastServerDraftSavedAt,
		setSelectedSpecialty,
		setLocalDraftWasRestored,
		visitDraftSignature,
		setLastLocalSavedAt, // Отметки зубов и ИИ-диагнозы относятся к КОНКРЕТНОМУ приёму. Без сброса
		// они переносились на следующего пациента (см. resetVisitToothState).
		resetVisitToothState,
		loadServerVisitDraft,
		dashboard?.activeVisit,
		setServerDraftSyncState,
		visitDraftUserEditedRef,
		dashboard,
		setLocalAutosaveReady,
	]);

	useEffect(() => {
		// Приёма нет — сохранять черновик некуда. Раньше он уходил под ключ
		// несуществующего приёма и всплывал у следующего пациента.
		const openVisitId = dashboard?.activeVisit?.id;
		if (!dashboard || !localAutosaveReady || !openVisitId) return;
		const savedAt = new Date().toISOString();
		const timeout = window.setTimeout(() => {
			saveVisitLocalDraft(
				{
					version: 1,
					visitId: openVisitId,
					savedAt,
					transcript,
					selectedSpecialty,
					visitNoteForm,
				},
				activeOrganizationId,
			);
			setLastLocalSavedAt(savedAt);
			setLocalDraftWasRestored(false);
		}, 350);
		return () => window.clearTimeout(timeout);
	}, [
		activeOrganizationId,
		dashboard?.activeVisit?.id,
		localAutosaveReady,
		selectedSpecialty,
		transcript,
		visitNoteForm,
		setLocalDraftWasRestored,
		setLastLocalSavedAt,
		dashboard,
	]);

	useEffect(() => {
		if (!dashboard || !localAutosaveReady || !lastLocalSavedAt) return;
		const timeout = window.setTimeout(() => {
			void syncVisitDraftAutosave(lastLocalSavedAt, { silent: true });
		}, 1600);
		return () => window.clearTimeout(timeout);
	}, [
		dashboard?.activeVisit?.id,
		lastLocalSavedAt,
		localAutosaveReady,
		syncVisitDraftAutosave,
		dashboard,
	]);

	const sortedAppointments = useMemo(() => {
		if (!dashboard) return [];
		return (dashboard.appointments || [])
			.filter((appointment) => {
				if (
					scheduleDoctorFilterId &&
					appointment.doctorUserId !== scheduleDoctorFilterId
				)
					return false;
				if (
					scheduleAssistantFilterId &&
					appointment.assistantUserId !== scheduleAssistantFilterId
				)
					return false;
				if (
					scheduleChairFilterId &&
					appointment.chairId !== scheduleChairFilterId
				)
					return false;
				if (
					scheduleStatusFilter !== "all" &&
					appointment.status !== scheduleStatusFilter
				)
					return false;
				if (scheduleDateFilter) {
					const localAppointmentDate = toDateTimeLocalValue(
						appointment.startsAt,
						dashboard?.clinicSettings?.profile?.timezone,
					).slice(0, 10);
					if (localAppointmentDate !== scheduleDateFilter) return false;
				}
				return true;
			})
			.sort((left, right) => left.startsAt.localeCompare(right.startsAt));
	}, [
		dashboard,
		scheduleAssistantFilterId,
		scheduleChairFilterId,
		scheduleDateFilter,
		scheduleDoctorFilterId,
		scheduleStatusFilter,
	]);
	useEffect(() => {
		clinicProfileDraftRef.current = clinicProfileDraft;
	}, [clinicProfileDraft]);
	const telegramLinkStaffOptions = useMemo(
		() =>
			(dashboard?.clinicSettings?.staff || []).filter(
				(member) => member.active,
			) ?? [],
		[dashboard],
	);

	const filteredTelegramOutboxItems = useMemo(() => {
		const items = telegramOutbox?.items ?? [];
		return items.filter((item) => {
			if (telegramOutboxStatusFilter === "due") {
				if (
					item.deliveryStatus !== "ready" ||
					!isTelegramOutboxItemDueForUi(item)
				)
					return false;
			} else if (
				telegramOutboxStatusFilter !== "all" &&
				item.deliveryStatus !== telegramOutboxStatusFilter
			) {
				return false;
			}
			if (
				telegramOutboxTemplateFilter !== "all" &&
				item.templateKind !== telegramOutboxTemplateFilter
			)
				return false;
			return true;
		});
	}, [
		telegramOutbox,
		telegramOutboxStatusFilter,
		telegramOutboxTemplateFilter,
	]);

	const visibleTelegramOutboxItems = filteredTelegramOutboxItems;
	const hiddenTelegramOutboxItemCount = Math.max(
		0,
		(telegramOutbox?.filteredCount ?? filteredTelegramOutboxItems.length) -
			visibleTelegramOutboxItems.length,
	);

	useEffect(() => {
		if (!dashboard) return;
		if (
			telegramLinkStaffId &&
			telegramLinkStaffOptions.some(
				(member) => member.id === telegramLinkStaffId,
			)
		)
			return;
		setTelegramLinkStaffId(telegramLinkStaffOptions[0]?.id ?? "");
	}, [
		dashboard,
		telegramLinkStaffId,
		telegramLinkStaffOptions,
		setTelegramLinkStaffId,
	]);

	const telegramLinkTargetKey = `${telegramLinkSubjectType}:${telegramLinkSubjectType === "patient" ? (activePatient?.id ?? "") : telegramLinkStaffId || ""}:${telegramModeDraft}:${telegramBotConfigId.trim()}`;
	const previousTelegramLinkTargetKeyRef = useRef(telegramLinkTargetKey);

	useEffect(() => {
		if (previousTelegramLinkTargetKeyRef.current === telegramLinkTargetKey)
			return;
		previousTelegramLinkTargetKeyRef.current = telegramLinkTargetKey;
		if (!telegramLinkCode && !telegramLinkActionState) return;
		setTelegramLinkCode(null);
		setTelegramLinkActionState(null);
	}, [
		telegramLinkActionState,
		telegramLinkCode,
		telegramLinkTargetKey,
		setTelegramLinkCode,
		setTelegramLinkActionState,
	]);

	function telegramSubjectName(
		subjectType: DenteTelegramChatLinkPublic["subjectType"],
		subjectId: string,
	): string {
		if (subjectType === "patient") {
			return (
				dashboard?.patients?.find((patient) => patient.id === subjectId)
					?.fullName ?? "Пациент"
			);
		}
		return (
			dashboard?.clinicSettings?.staff?.find(
				(member) => member.id === subjectId,
			)?.fullName ?? "Сотрудник"
		);
	}

	const appointmentReadinessById = useMemo(() => {
		if (!dashboard)
			return new Map<string, Dashboard["appointmentReadiness"][number]>();
		return new Map(
			(dashboard?.appointmentReadiness ?? []).map((readiness) => [
				readiness.appointmentId,
				readiness,
			]),
		);
	}, [dashboard]);

	async function completeCommunicationTask(
		taskId: string,
		outcome: CommunicationTaskOutcome,
	) {
		if (communicationSavingTaskId) {
			setError("Дождитесь завершения текущего закрытия задачи связи.");
			return;
		}
		if (!outcome) {
			setError(
				"Выберите исход задачи связи: нет ответа, перезвонить, перенос, обещал оплату или выдача документов.",
			);
			return;
		}
		setCommunicationSavingTaskId(taskId);
		try {
			const response = await fetch("/api/communications/tasks/complete", {
				method: "POST",
				headers: auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					taskId,
					outcome,
					note: communicationNote.trim() || "Задача связи закрыта.",
				}),
			});
			if (!response.ok) {
				setError(
					await responseErrorMessage(response, "Задача связи не закрыта"),
				);
				return;
			}
			await loadDashboard();
			setError(null);
		} catch (communicationError) {
			showToast(
				actionFailureToast(
					"Задача связи не закрыта",
					(communicationError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage(
					"Задача связи не закрыта",
					communicationError,
				),
			);
		} finally {
			setCommunicationSavingTaskId(null);
		}
	}

	async function createClinicalRuleFromSettings() {
		if (isClinicalRuleSaving) {
			setError("Дождитесь завершения текущего сохранения правила.");
			return;
		}
		if (!newRuleTitle.trim()) {
			setError("Укажите название клинического правила.");
			return;
		}
		setIsClinicalRuleSaving(true);
		try {
			const response = await fetch("/api/clinical/rules", {
				method: "POST",
				headers: auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					title: newRuleTitle.trim(),
					action: newRuleAction,
					severity: newRuleSeverity,
					ownerRole: newRuleOwnerRole || undefined,
					specialty: newRuleSpecialty || undefined,
					category: newRuleCategory || undefined,
					triggerServiceIds: newRuleTriggerServiceId
						? [newRuleTriggerServiceId]
						: [],
					requiredServiceIds: newRuleRequiredServiceId
						? [newRuleRequiredServiceId]
						: [],
					requiresCompletedServiceIds: newRuleCompletedServiceId
						? [newRuleCompletedServiceId]
						: [],
					blockedServiceIds: newRuleBlockedServiceId
						? [newRuleBlockedServiceId]
						: [],
					warningText: newRuleWarningText.trim() || undefined,
					patientText: newRulePatientText?.trim() || "",
				}),
			});
			if (!response.ok) {
				setError(
					await responseErrorMessage(
						response,
						"Не удалось создать клиническое правило",
					),
				);
				return;
			}
			await loadDashboard();
			setError(null);
			setNewRuleTitle("");
			setNewRuleWarningText("");
		} catch (ruleError) {
			showToast(
				actionFailureToast(
					"Не удалось создать клиническое правило",
					(ruleError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage(
					"Не удалось создать клиническое правило",
					ruleError,
				),
			);
		} finally {
			setIsClinicalRuleSaving(false);
		}
	}

	async function createImagingStudy(kind: ImagingStudyKind) {
		if (imagingCreateSavingKind) {
			setError("Дождитесь завершения текущего добавления снимка.");
			return;
		}
		if (!activePatient || !dashboard) {
			setError("Выберите пациента и активный прием перед добавлением снимка.");
			return;
		}
		const titles: Record<ImagingStudyKind, string> = {
			periapical: "Прицельный 36",
			bitewing: "Интерпроксимальный контроль",
			opg: "ОПТГ",
			ceph: "ТРГ боковая",
			cbct: "КЛКТ / КТ",
			photo: "Фото полости рта",
			other: "Снимок",
		};
		setImagingCreateSavingKind(kind);
		try {
			const response = await fetch("/api/imaging/studies", {
				method: "POST",
				headers: auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					patientId: activePatient.id,
					visitId: dashboard?.activeVisit?.id,
					kind,
					title: titles[kind],
					toothCode: kind === "periapical" ? "36" : null,
					region:
						kind === "opg" || kind === "cbct"
							? "обе челюсти"
							: kind === "ceph"
								? "профиль черепа"
								: "текущий прием",
					sourceKind:
						kind === "cbct" || kind === "opg" || kind === "ceph"
							? "dicom_file"
							: "sensor_bridge",
					sourceName:
						kind === "cbct" || kind === "opg" || kind === "ceph"
							? "Импорт КТ/снимков"
							: "Локальный RVG-датчик",
					/*
					 * ЗДЕСЬ ЗАПИСЫВАЛОСЬ ПОДЛОЖНОЕ ЗАКЛЮЧЕНИЕ ИИ.
					 * В aiSummary клали строку «Черновик: снимок добавлен в карту.
					 * Описание требует проверки врача». Весь экран «Снимки» считает
					 * непустой aiSummary признаком состоявшегося разбора: загорается
					 * бейдж «AI» с подсказкой «Есть AI-заключение ShadowAnalyst»,
					 * раскрывается панель «ShadowAnalyst · AI Expert», и в разделе
					 * «Заключение» стоит эта служебная фраза. Кнопка разбора при этом
					 * меняется с «AI-Диагностика» на «Обновить анализ».
					 *
					 * То есть снимок, которого никто не смотрел, помечался как
					 * имеющий заключение искусственного интеллекта. Настоящий разбор в
					 * проекте есть — apps/api/src/ai/visionAnalyzer.ts, две модели с
					 * перекрёстной проверкой, — тем важнее не путать его с заглушкой.
					 *
					 * Поле не заполняется: заключение появляется только после разбора.
					 */
				}),
			});
			if (!response.ok) {
				setError(await responseErrorMessage(response, "Снимок не добавлен"));
				return;
			}
			const createdStudy = (await response.json()) as {
				id?: string;
				kind?: ImagingStudyKind;
			};
			await loadDashboard();
			if (createdStudy.kind) setImagingKindFilter(createdStudy.kind);
			if (createdStudy.id) setSelectedImagingStudyId(createdStudy.id);
			setError(null);
		} catch (imagingError) {
			showToast(
				actionFailureToast(
					"Снимок не добавлен",
					(imagingError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage("Снимок не добавлен", imagingError),
			);
		} finally {
			setImagingCreateSavingKind(null);
		}
	}

	const imagingViewerSaveTitle: Record<ImagingViewerSaveState, string> = {
		idle: "Сессия просмотра",
		local: "Локальный черновик сохранен",
		saving: "Сохраняю просмотр",
		saved: "Просмотр сохранен",
		queued: isOnline
			? "Повтор серверного сохранения в очереди"
			: "Офлайн-черновик сохранен",
		error: "Сохранение требует проверки",
	};
	const imagingViewerSaveDetail = [
		`${imagingViewerAnnotations.length} разметок`,
		imagingViewerLocalSavedAt
			? `локально ${formatTime(imagingViewerLocalSavedAt)}`
			: "локально ожидает",
		imagingViewerSession?.serverSavedAt
			? `сервер ${formatTime(imagingViewerSession.serverSavedAt)}`
			: "сервер ожидает",
		imagingViewerSaveError,
	]
		.filter(Boolean)
		.join(" · ");
	const canRetryImagingViewerSave =
		imagingViewerSessionReady &&
		Boolean(selectedImagingStudy?.id) &&
		(imagingViewerSaveState === "queued" || imagingViewerSaveState === "error");
	const imagingViewerNoteText = imagingViewerNote.trim();
	const imagingViewerNoteReady = imagingViewerNoteText.length > 0;
	const imagingViewerNoteMissingId = "imaging-viewer-note-missing";
	const imagingViewerRetryMissingId = "imaging-viewer-retry-missing";
	const imagingPreviewSource = (study: Dashboard["imagingStudies"][number]) =>
		imagingPreviewObjectUrls[study.id] ?? study.previewUrl;
	const imagingViewerHref = (study: Dashboard["imagingStudies"][number]) =>
		imagingPreviewObjectUrls[study.id] ?? study.viewerUrl ?? study.previewUrl;

	const activeRolePolicy =
		dashboard?.clinicSettings?.roleAccessPolicies?.find(
			(policy) => policy.role === selectedWorkspaceRole,
		) ??
		dashboard?.clinicSettings?.roleAccessPolicies?.find(
			(policy) => policy.role === "doctor",
		) ??
		dashboard?.clinicSettings?.roleAccessPolicies?.[0];
	const activeQueueRole: StaffRole =
		selectedWorkspaceRole === "owner" ? "manager" : selectedWorkspaceRole;
	const activeRoleQueue =
		dashboard?.shiftIntelligence?.roleQueues?.find(
			(queue) => queue.role === activeQueueRole,
		) ?? dashboard?.shiftIntelligence?.roleQueues?.[0];
	const activeRoleWritableSections = activeRolePolicy?.canWrite ?? [];
	const activeRoleRestrictedSections = activeRolePolicy?.restricted ?? [];
	/**
	 * Роли, которые в клинике никто не занимает. Владелец соло-практики сам себе
	 * и врач, и администратор: если такие дела спрятать «не по его роли», он их
	 * не увидит вообще — сделать их некому. Поэтому владелец получает дела всех
	 * незанятых ролей вдобавок к своим.
	 */
	const uncoveredStaffRoles = useMemo(() => {
		const covered = new Set(
			(dashboard?.clinicSettings?.staff ?? [])
				.filter((member) => member.active && member.role !== "owner")
				.map((member) => member.role as string),
		);
		return (
			["doctor", "administrator", "assistant", "manager"] as const
		).filter((role) => !covered.has(role)) as string[];
	}, [dashboard?.clinicSettings?.staff]);
	const roleRecommendedActions = (dashboard?.recommendedActions ?? []).filter(
		(action) =>
			action.role === selectedWorkspaceRole ||
			(selectedWorkspaceRole === "owner" &&
				(action.role === "manager" ||
					uncoveredStaffRoles.includes(action.role))),
	);
	const visibleRecommendedActions = (
		roleRecommendedActions.length
			? roleRecommendedActions
			: (dashboard?.recommendedActions ?? [])
	).slice(0, 4);
	const roleScheduleSuggestions = (dashboard?.scheduleSuggestions ?? []).filter(
		(suggestion) =>
			suggestion.ownerRole === selectedWorkspaceRole ||
			(selectedWorkspaceRole === "owner" && suggestion.ownerRole === "manager"),
	);
	const visibleScheduleSuggestions = (
		roleScheduleSuggestions.length
			? roleScheduleSuggestions
			: (dashboard?.scheduleSuggestions ?? [])
	).slice(0, 3);
	const legalMissingFields = dashboard
		? clinicLegalMissingFields(dashboard?.clinicSettings?.profile)
		: [];
	const legalReadinessPercent = dashboard
		? clinicLegalReadinessPercent(dashboard?.clinicSettings?.profile)
		: 0;
	const onboardingFirstAppointmentIssues = dashboard
		? buildOnboardingFirstAppointmentIssues()
		: [];
	const onboardingDocumentReadinessIssues = dashboard
		? buildOnboardingDocumentReadinessIssues()
		: [];
	const onboardingBlockingIssues = onboardingFirstAppointmentIssues;
	const onboardingTelegramRecommendations = dashboard
		? buildOnboardingTelegramRecommendations()
		: [];
	const onboardingReadyToFinish = onboardingFirstAppointmentIssues.length === 0;
	const onboardingDocumentsReady =
		onboardingDocumentReadinessIssues.length === 0;
	// Флаг «готово к созданию» дополнительно учитывает выполняющийся запрос,
	// поэтому кнопки гаснут сразу после первого нажатия, а не после ответа сервера.
	const _newStaffReadyToCreate =
		newStaffName.trim().length > 0 && !isStaffCreating;
	const _newChairReadyToCreate =
		newChairName.trim().length > 0 && !isChairCreating;
	const onboardingStaffCreateGuidanceId = "onboarding-staff-create-guidance";
	const onboardingChairCreateGuidanceId = "onboarding-chair-create-guidance";
	const onboardingFinishGuidanceId = "onboarding-finish-guidance";
	const currentOnboardingIndex = Math.max(
		0,
		onboardingSteps.findIndex((step) => step.id === onboardingStep),
	);
	const previousOnboardingStep =
		currentOnboardingIndex > 0
			? onboardingSteps[currentOnboardingIndex - 1]
			: null;
	const nextOnboardingStep =
		currentOnboardingIndex < onboardingSteps.length - 1
			? onboardingSteps[currentOnboardingIndex + 1]
			: null;
	const showFullOnboardingGuide =
		!onboardingDismissed &&
		currentView === "settings" &&
		settingsTab === "clinic" &&
		onboardingGuideExpanded;
	const selectedUiLanguageOption =
		uiLanguageOptions?.find((option) => option.value === uiLanguage) ??
		defaultUiLanguageOption;
	const showAdministrationTopActions =
		currentView === "settings" ||
		selectedWorkspaceRole === "administrator" ||
		selectedWorkspaceRole === "manager" ||
		selectedWorkspaceRole === "owner";
	const showDoctorVisitShortcut =
		selectedWorkspaceRole === "doctor" && currentView !== "visit";

	const serviceTitle = (serviceId: string) =>
		dashboard?.serviceCatalog?.find((service) => service.id === serviceId)
			?.title ?? serviceId;

	const [isQuickConsultLoading, setIsQuickConsultLoading] = useState(false);
	const handleQuickConsult = async () => {
		if (isQuickConsultLoading) return;
		setIsQuickConsultLoading(true);
		try {
			const response = await fetch("/api/visits/quick", {
				method: "POST",
				headers: auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
				}),
			});
			if (!response.ok) {
				const msg = await response.text().catch((err) => {
					showToast(
						actionFailureToast(
							"Не удалось прочитать ошибку",
							(err as { status?: number })?.status ?? null,
						),
						"error",
					);
					return "Ошибка";
				});
				setError(`Быстрый приём: ${msg}`);
				return;
			}
			const { patientId } = (await response.json()) as {
				patientId: string;
				appointmentId: string;
			};
			// Select the patient and navigate to visit
			setSelectedPatientId(patientId);
			await loadDashboard();
			window.location.hash = "visit";
		} catch (err: any) {
			setError(`Быстрый приём: ${err.message ?? "Ошибка сети"}`);
		} finally {
			setIsQuickConsultLoading(false);
		}
	};

	const goToVisitDictation = () => {
		window.location.hash = "visit";
		const openDictation = () => {
			scrollToVisitArea(".dictation-box");
			document
				.querySelector<HTMLTextAreaElement>(".dictation-box textarea")
				?.focus({ preventScroll: true });
		};
		window.setTimeout(openDictation, 0);
		window.setTimeout(openDictation, 120);
	};

	return {
		...documentWorkflow,
		...dicomWorkbenchModule,
		...telegramSettingsModule,
		...telegram,
		telegram,
		...auth,
		/*
		 * auth отдаётся ещё и целиком, отдельным полем.
		 *
		 * Выше он разложен через `...auth`, поэтому denteClinicalReadHeaders и
		 * соседние функции лежали в контексте по верхнему уровню — а поля `auth`
		 * не было вовсе. При этом 31 файл достаёт из контекста именно его:
		 * `const { auth } = useAppLogicContext()`. Большинство прикрывалось
		 * проверкой `auth ? auth.denteClinicalReadHeaders() : {}` и молча уходило
		 * на сервер БЕЗ заголовков клиники, полагаясь на общую обёртку fetch.
		 * Те, кто проверку не поставил, падали: ScannerView.tsx:102 и
		 * LandingFieldMappingsWidget.tsx:20 звали auth.denteClinicalReadHeaders()
		 * напрямую.
		 *
		 * Поймано обходом разделов после того, как «Стерилизация» появилась в
		 * списке проверяемых: экран открывался, но дважды писал в консоль
		 * «Cannot read properties of undefined (reading
		 * 'denteClinicalReadHeaders')», и журнал автоклава не загружался.
		 */
		auth,
		acceptDraftToVisit,
		activeAppointment,
		activeChair,
		activeDoctor,
		activePatient,
		activeVisitPatient,
		activePatientCallablePhone,
		activePatientHasCallablePhone,
		activePatientInsight,
		activeQueueRole,
		activeRolePolicy,
		activeRoleQueue,
		activeRoleRestrictedSections,
		activeRoleWritableSections,
		activeSettingsTabButtonRef,
		activeSpeechProviderHealth,
		appendToTranscript,
		appointmentLabels,
		appointmentReadinessById,
		appointmentReadinessLabels,
		appointmentScheduleDraftFromAppointment,
		browserContinuity,
		browserDirectoryInputRef,
		browserDirectoryPickerAvailable,
		browserImagingScanProgress,
		browserMigrationDiscovery,
		browserMigrationInputRef,
		browserMigrationScanProgress,
		browserPickedImagingFolder,
		buildDraft,
		buildOfflineDraft,
		canRetryImagingViewerSave,
		chairScheduleDirtyIds,
		chairScheduleDrafts,
		chairScheduleSaveStates,
		chairScheduleSavingId,
		clampMprAxisDeg,
		clampMprSlabMm,
		clampMprSliceIndex,
		clearTranscriptWithUndo,
		clearedTranscriptSnapshot,
		clinicModeLabels,
		clinicProfileDraft,
		clinicProfileSaveState,
		clinicPublicLookup,
		clinicalRuleActionLabels,
		clinicalRuleSeverityLabels,
		closeAppointmentEditor,
		communicationChannelLabels,
		communicationDocumentTaskActionLabels,
		communicationIntentLabels,
		communicationNote,
		communicationPriorityLabels,
		communicationSavingTaskId,
		communicationStatusLabels,
		completeCommunicationTask,
		completedActContractReferenceForUi,
		continueOnboardingInDraftMode,
		createAppointmentFromDraft,
		createClinicalRuleFromSettings,
		createImagingStudy,
		ctPlanningActiveQuickActionId,
		ctPlanningImplantPlan,
		currentOnboardingIndex,
		currentView,
		dashboard,
		defaultDicomFirstFrameViewerState,
		defaultImagingViewerState,
		dentalMaterialKindLabels,
		dentalRestorationTypeLabels,
		describeMprClinicalPresetProjectionFallback,
		dicomDiagnosticPixelPolicyLabels,
		dicomExecutionLaneLabels,
		dicomFirstFramePreview,
		dicomFirstFrameStatusLabels,
		dicomFirstFrameViewerState,
		dicomFolderSeriesScan,
		dicomFolderWorkupPathLabels,
		dicomFolderWorkupPlan,
		dicomGpuClassLabels,
		dicomLabel,
		dicomLocalFolderDiscovery,
		dicomQualityModeLabels,
		dicomReadinessCheckLabels,
		dicomRenderCachePlan,
		dicomRenderMemoryBudgetClassLabels,
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
		dicomWorkstationReadiness,
		dismissOnboarding,
		documentActionLabels,
		documentDetectedKindLabel,
		documentFactoryGroups,
		documentIngestionQualityLabels,
		documentIngestionTarget,
		documentIssueSignatureModeLabels,
		documentLabels,
		documentPatient,
		documentSourceStatusClassNames,
		documentStatusLabels,
		documentVoidReasonLabels,
		downloadPersistenceExport,
		draft,
		editingAppointmentId,
		error,
		filteredPatients,
		filteredTelegramOutboxItems,
		flushPendingSpeechChunks,
		flushPendingVisitSaves,
		formatByteSize,
		formatDateTime,
		formatMegabytes,
		formatShortDate,
		formatSignedMprStep,
		formatTime,
		fromDateTimeLocalValue,
		goToVisitDictation,
		handleQuickConsult,
		isQuickConsultLoading,
		hasVisitTranscriptText,
		hiddenTelegramOutboxItemCount,
		imagingConnectorCards,
		imagingCreateSavingKind,
		imagingFolderPath,
		imagingFolderScan,
		imagingImportCommit,
		imagingImportPreview,
		imagingImportSourceKind,
		imagingImportText,
		imagingKindFilter,
		imagingKindLabels,
		imagingPreviewSource,
		imagingSourceChoices,
		imagingSourceDetails,
		imagingSourceLabels,
		imagingViewerActiveTool,
		imagingViewerAnnotations,
		imagingViewerCapabilities,
		imagingViewerHref,
		recentPatientViewsVersion,
		imagingViewerNote,
		imagingViewerNoteMissingId,
		imagingViewerNoteReady,
		imagingViewerRetryMissingId,
		imagingViewerSaveDetail,
		imagingViewerSaveState,
		imagingViewerSaveTitle,
		imagingViewerSessionReady,
		imagingViewerState,
		imagingViewerToolLabels,
		importCommit,
		importIntake,
		importPreview,
		importSourceKind,
		importSourceLabels,
		importText,
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
		isDraftAccepting,
		isDraftLoading,
		isImagingFolderScanning,
		isImagingImportCommitting,
		isImagingImportLoading,
		isImportCommitting,
		isImportDictating,
		isImportLoading,
		isLocalDicomOperationActive,
		isLocalImagingOrganizing,
		isMigrationAutopilotLoading,
		isMigrationHandoffReportLoading,
		isMigrationSourceDiscovering,
		isMigrationSourceProbeLoading,
		isMigrationSourceWorkupLoading,
		isOnline,
		isPaymentSaving,
		isPendingVisitSyncing,
		isPersistenceExporting,
		isPricelistAnalyzing,
		isRecognitionLoading,
		isServerVoiceRecording,
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
		isTranscriptPolishing,
		isVisitDictating,
		isVisitNoteDirty,
		lastLocalSavedAt,
		lastPendingVisitSaveAt,
		lastServerDraftSavedAt,
		lastVisitSaveReceipt,
		legalMissingFields,
		legalReadinessPercent,
		loadLocalBridgeUsePlans,
		loadPersistenceHealth,
		loadPersistenceIntegrity,
		localBridgeReadiness,
		localBridgeStatusLabels,
		localBridgeUsePathLabels,
		localBridgeUsePlans,
		localDraftWasRestored,
		localImagingFolderDraft,
		localImagingModelRoleLabels,
		localImagingOrganizer,
		localImagingOrganizerActionLabels,
		medicalDocumentReleaseChannelLabels,
		migrationAutopilot,
		migrationSourceDiscovery,
		migrationSourceProbe,
		migrationSourceWorkup,
		money,
		moveOnboardingTo,
		mprAxisBounds,
		mprAxisDeg,
		mprAxisNudgeDeg,
		mprAxisPresetDeg,
		mprCacheModeLabels,
		mprClinicalPresets,
		mprCrosshairEnabled,
		mprLinkedPlanesEnabled,
		mprLoadStrategyLabels,
		mprProjection,
		mprProjectionLabels,
		mprResourceTierLabels,
		mprSeriesRequiredProjectionLabel,
		mprSlabBounds,
		mprSlabMm,
		mprSlabNudgeMm,
		mprSlabPresetMm,
		mprSliceIndex,
		mprSliceIndexFromFraction,
		mprSliceNudgeSteps,
		mprSlicePresetFractions,
		mprToolLabels,
		mprUnavailableProjectionLabel,
		mprWindowPreset,
		mprWindowPresetLabels,
		mprWorkbenchDraftRestored,
		mprWorkbenchLocalSavedAt,
		newAppointmentError,
		newChairHasMicroscope,
		newChairHasSurgeryKit,
		newChairHasXraySensor,
		newChairName,
		newRuleAction,
		newRuleBlockedServiceId,
		newRuleCategory,
		newRuleCompletedServiceId,
		newRuleOwnerRole,
		newRuleRequiredServiceId,
		newRuleSeverity,
		newRuleSpecialty,
		newRuleTitle,
		newRuleTriggerServiceId,
		newRuleWarningText,
		newStaffName,
		newStaffRole,
		newStaffSpecialty,
		nextOnboardingStep,
		normalizeOptionalWorkingDaysDraft,
		normalizeUiLanguageInput,
		normalizedAppointmentStatus,
		normalizedAppointmentStatusFilter,
		normalizedClinicalRuleAction,
		normalizedClinicalRuleSeverity,
		normalizedDentalSpecialty,
		normalizedDocumentIssueSignatureMode,
		normalizedDocumentKind,
		normalizedDocumentVoidReasonCode,
		normalizedMedicalDocumentReleaseChannel,
		normalizedOutpatient025uDemographicCode,
		normalizedPatientIntakePregnancyStatus,
		normalizedPaymentRefundCorrectionAction,
		normalizedPaymentRefundCorrectionMethod,
		normalizedPostVisitCareTopic,
		normalizedProcedureSpecificConsentProcedure,
		normalizedServiceCategory,
		normalizedStaffRole,
		normalizedTaxApplicationDeliveryChannel,
		normalizedTaxApplicationForm,
		normalizedTaxApplicationRelationshipSelect,
		normalizedTelegramBotMode,
		normalizedTelegramLinkSubjectType,
		normalizedTelegramOutboxStatusFilter,
		normalizedTelegramOutboxTemplateFilter,
		normalizedTelegramPrivacyMode,
		normalizedTreatmentPlanAcceptanceVariant,
		normalizedXrayPregnancyStatus,
		normalizedXrayPriority,
		normalizedXrayStudyType,
		ohifBaseUrl,
		onboardingBlockingIssues,
		onboardingChairCreateGuidanceId,
		onboardingDismissed,
		onboardingDocumentReadinessIssues,
		onboardingDocumentsReady,
		onboardingDraftMode,
		onboardingFinishGuidanceId,
		onboardingReadyToFinish,
		onboardingStaffCreateGuidanceId,
		onboardingStep,
		onboardingSteps,
		onboardingTelegramRecommendations,
		onboardingTelegramVisualCardKeys,
		openAppointmentEditor,
		openOnboardingGuide,
		openScheduleWarning,
		openVisitWarningAction,
		patientAdministrativeProfileValidationMessage,
		patientInsightById,
		patientInsightRiskLabels,
		patientIntakePregnancyStatusOptions,
		patientName,
		paymentAmount,
		paymentMutationIdRef,
		paymentFeedback,
		paymentFiscalCashierName,
		paymentFiscalFd,
		paymentFiscalFn,
		paymentFiscalFpd,
		paymentFiscalReceiptIssuedAt,
		paymentFiscalReceiptLabelForUi,
		paymentFiscalReceiptNumber,
		paymentFiscalReceiptUrl,
		paymentMethod,
		paymentMethodLabels,
		paymentPatientContextMessage,
		paymentPatientContextReady,
		paymentPayerBirthDate,
		paymentPayerFullName,
		paymentPayerIdentityDocument,
		paymentPayerInn,
		paymentPayerRelationship,
		paymentTaxDeductionCode,
		pendingSpeechChunkCount,
		pendingVisitSaveCount,
		persistenceHealth,
		persistenceIntegrity,
		photoVideoMaterialOptions,
		policyAuditEventLabels,
		polishTranscript,
		postVisitCareTopicOptions,

		previousOnboardingStep,
		pricelistAnalysis,
		pricelistImageBase64,
		pricelistImageName,
		pricelistImageNote,
		pricelistItemMaterialText,
		pricelistMaterialSummaryText,
		pricelistParserModeLabels,
		pricelistRecognitionBrandGroups,
		pricelistRecognitionServiceGroups,
		pricelistSourceKind,
		pricelistSourceKindLabels,
		pricelistText,
		pricelistWarningsText,
		primaryVisitWarning,
		procedureSpecificConsentProcedureOptions,
		query,
		recognitionJob,
		recognitionKind,
		recognitionPresets,
		recognitionTarget,
		recognitionTargetLabels,
		recognitionText,
		recommendedActionPriorityLabels,
		recordPayment,
		refreshBrowserContinuity,
		refreshSpeechRuntime,
		releaseProtectionNote,
		reopenOnboarding,
		requestBrowserStoragePersistence,
		resetNewAppointmentDraft,
		roleFocusOrder,
		saveAppointmentSchedule,
		saveChairSchedule,
		saveClinicProfileFromDraft,
		savePatientAdministrativeProfile,
		savePatientCore,
		createPatient,
		saveStaffSchedule,
		scenarioPriorityLabels,
		scenarioStrategyLabels,
		scheduleAdminSecretDraft,
		scheduleAdminSecretSession,
		scrollToVisitArea,
		selectedImagingStudy,
		selectedPatient,
		selectedSpecialty,
		selectedUiLanguageOption,
		selectedWorkspaceRole,
		serverDraftSyncState,
		serviceCategoryLabels,
		serviceTitle,
		setClearedTranscriptSnapshot,
		setCommunicationNote,
		setCtPlanningActiveQuickActionId,
		setCtPlanningImplantPlan,
		setCurrentView,
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
		setError,
		setImagingFolderPath,
		setImagingFolderScan,
		setImagingImportCommit,
		setImagingImportPreview,
		setImagingImportSourceKind,
		setImagingImportText,
		setImagingKindFilter,
		setImagingViewerActiveTool,
		setImagingViewerNote,
		setImagingViewerState,
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
		setMprSlabMm,
		setMprSliceIndex,
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
		setPaymentAmount,
		setPaymentFiscalCashierName,
		setPaymentFiscalFd,
		setPaymentFiscalFn,
		setPaymentFiscalFpd,
		setPaymentFiscalReceiptIssuedAt,
		setPaymentFiscalReceiptNumber,
		setPaymentFiscalReceiptUrl,
		setPaymentMethod,
		setPaymentPayerBirthDate,
		setPaymentPayerFullName,
		setPaymentPayerIdentityDocument,
		setPaymentPayerInn,
		setPaymentPayerRelationship,
		setPaymentTaxDeductionCode,
		setPaymentFeedback,
		setPricelistAnalysis,
		setPricelistSourceKind,
		setPricelistText,
		setQuery,
		setRecognitionJob,
		setRecognitionText,
		setReleaseProtectionNote,
		setSelectedImagingStudyId,
		setSelectedProtocolId,
		setSelectedSpecialty,
		setSelectedWorkspaceRole,
		setSettingsAdminSecretDraft,
		setSettingsTab,
		setSmartImportCommit,
		setSmartImportMode,
		setSmartImportPreview,
		setSmartImportText,
		setTelegramAdminSecretDraft,
		setTelegramBotUsernameDraft,
		setTelegramHandoffNotice,
		setTelegramMapsUrlDraft,
		setTelegramPatientPortalBaseUrlDraft,
		setTelegramPrivacyModeDraft,
		setTelegramReminderLeadTimesDraft,
		setTelegramReviewRequestDelayDraft,
		setTelegramReviewUrlDraft,
		setTelegramTokenTtlDraft,
		setTelegramWelcomeImageUrlDraft,
		setTranscript,
		setUiLanguage,
		setUiPreferencesSyncError,
		setUsePricelistAi,
		settingsAdminSecretDraft,
		settingsAdminSecretSession,
		settingsTab,
		settingsTabs,
		showAdministrationTopActions,
		showDoctorVisitShortcut,
		showFullOnboardingGuide,
		smartImportCommit,
		smartImportMode,
		smartImportModeLabels,
		smartImportPreview,
		smartImportText,
		sortedAppointments,
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
		speechStatusNote,
		staffRoleLabels,
		staffScheduleDirtyIds,
		staffScheduleDraftFromWorkingHours,
		staffScheduleDrafts,
		staffScheduleSaveStates,
		staffScheduleSavingId,
		startImportDictation,
		startVisitDictation,
		structuredPayloadDocumentKinds,
		taxApplicationDeliveryChannelOptions,
		taxApplicationFormOptions,
		taxApplicationRelationshipOptions,
		telegramAdminSecretDraft,
		telegramAdminSecretSession,
		telegramAllowVoiceIntakeDraft,
		telegramBotConfigId,
		telegramBotUsernameDraft,
		telegramChatLinkLedger,
		telegramChatLinks,
		telegramClassificationLabels,
		telegramDeliveryStatusLabels,
		telegramFeatureHelp,
		telegramFeatureOptions,
		telegramFeaturePlan,
		telegramHandoffNotice,
		telegramHumanMessage,
		telegramInlineButtonKindLabels,
		telegramInlineButtonRowsFromReplyMarkup,
		telegramLinkActionState,
		telegramLinkCode,
		telegramLinkCodeLedger,
		telegramLinkCodeStatusLabels,
		telegramLinkCodes,
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
		toDateTimeLocalValue,
		toggleChairWorkingDay,
		toggleClinicWorkingDay,
		toggleStaffWorkingDay,
		toothRows,
		toothStateByCode: visitToothStateByCode,
		setToothState,
		transcript,
		treatmentStatusLabels,
		uiLanguage,
		uiLanguageOptions,
		uiPreferencesSyncError,
		undoTranscriptClear,
		updateAppointmentScheduleDraft,
		updateChairScheduleDay,
		updateChairScheduleDraft,
		updateClinicProfileDraft,
		updateNewAppointmentDraft,
		updatePatientAdministrativeProfileDraft,
		updatePatientCoreDraft,
		updateStaffScheduleDay,
		updateStaffScheduleDraft,
		updateVisitNoteField,
		usePricelistAi,
		viewLabels,
		visibleRecommendedActions,
		visibleScheduleSuggestions,
		visibleTelegramOutboxItems,
		visitCloseChecklist,
		visitDraftBuildMissingSteps,
		visitDraftMissingFieldLabel,
		visitDraftQualityLabels,
		visitDraftReadyToBuild,
		visitDraftSignalLabel,
		visitDraftUserEditedRef,
		visitNoteAcceptMissingSteps,
		visitNoteActionLabel,
		visitNoteFieldDefinitions,
		visitNoteForm,
		visitNoteReadyToAccept,
		visitNoteStatusLabel,
		visitSaveReceiptText,
		visitWarnings,
		warningSeverityLabels,
		weekdayOptions,
		workspaceScopeLabels,
		xrayPregnancyStatusOptions,
		xrayStudyTypeOptions,
		accessUnlockRequired,
		accessUnlockMessage,
		clinicalAdminSecretDraft,
		setClinicalAdminSecretDraft,
		loadDashboard,
		operatorWorkflowFailureMessage,
		...clinicalVisitLogic,
		...staffSettingsLogic,
		...patientIntakeLogic,
		...migrationQueries,
		...imagingQueries,
		...communicationsQueries,
		activeCommunicationTasks: null,
		activeImagingStudies: null,
		activePayments,
		activeTreatmentPlanItems,
		addImagingViewerNoteAnnotation: null,
		address: documentPatient?.administrativeProfile?.registrationAddress ?? "",
		analyzePricelist: null,
		applyCtPlanningQuickAction: null,
		applyMprClinicalPreset: null,
		applyNearestMprClinicalPreset: null,
		applyProtocolTemplate: null,
		applyProtocolTemplateDirectly: null,
		assembleSpeechRecording: async () => {},
		attachPricelistImage: null,
		browserCanRequestPersistentStorage: null,
		browserContinuityChecks: null,
		browserContinuityCritical: null,
		browserContinuityState: "",
		browserContinuityValue: null,
		browserImagingFileInputAccept: ".dcm,.dicom,.zip,.png,.jpg,.jpeg,.stl,.obj",
		browserImagingFilesInputRef: { current: null },
		cancelBrowserImagingFolderScan: false,
		cancelBrowserMigrationScan: false,
		cbctWorkbenchPlanes: null,
		cbctWorkbenchProjections: null,
		cbctWorkbenchTools: null,
		chooseRecognitionPreset: null,
		clearBrowserPickedImagingFolderPreview: null,
		clearLocalImagingFolderRecovery: null,
		clearPricelistImage: null,
		clinic: dashboard?.clinicSettings?.profile ?? null,
		clinicalMutationHeaders: auth.denteClinicalMutationHeaders,
		clinicalReadHeaders: auth.denteClinicalReadHeaders,
		clinicName: dashboard?.clinicSettings?.profile?.clinicName ?? "",
		createCtPlanningArtifact: null,
		ctPlanningAnnotationRefs: { current: null },
		dictationQuickPhrases: null,
		emptyDictationVoiceActionLabel: null,
		firstName: documentPatient?.fullName?.split(" ")[1] ?? "",
		handleMprKeyboardNavigation: async (..._args: any[]) => {},
		imagingComparisonCandidates: [],
		imagingKindOptions: [],
		imagingViewerImageStyle: null,
		inn: documentPatient?.administrativeProfile?.inn ?? "",
		lastName: documentPatient?.fullName?.split(" ")[0] ?? "",
		loadSpeechRecordingRecovery: async () => {},
		localBridgeStatusState: "",
		loyaltyTier: "standard",
		middleName: documentPatient?.fullName?.split(" ")[2] ?? "",
		mostLoadedResource: null,
		mprActiveProjectionLabel: null,
		mprActiveProjectionOrientation: null,
		mprAxisAngleBadge: null,
		mprAxisDirectionLabel: null,
		mprAxisGuidance: null,
		mprAxisRangeValue: null,
		mprAxisVisualizerLabel: null,
		mprAxisVisualizerStyle: null,
		mprClinicalChecklist: null,
		mprClinicalNextStep: null,
		mprClinicalPresetButtonClass: null,
		mprControlsAutoOpen: null,
		mprControlsReady: null,
		mprNearestClinicalPreset: null,
		mprOperatorSummaryCards: [],
		mprProjectionCompass: null,
		mprSlabBadge: null,
		mprSlabRangeValue: null,
		mprSliceBadge: null,
		mprSliceLabel: null,
		mprSliceRangeValue: null,
		mprWorkbenchSummaryText: null,
		name: documentPatient?.fullName ?? "",
		newRulePatientText: newRulePatientText,
		noShowRisk: "low",
		patientId: documentPatient?.id ?? "",
		pendingSpeechFlushActionLabel: null,
		pendingSpeechFlushActionTitle: "",
		polishingField: null,
		polishSingleField: async () => {},
		prices: dashboard?.serviceCatalog ?? [],
		renderClinicalToothRowsEditor: null,
		resetMprControls: null,
		retryImagingViewerSessionSave: null,
		scheduleDateFilter: "",
		selectedPaymentReceiptTotalRub: 0,
		selectedProtocolTemplate: null,
		selectedTaxPaymentTotalRub: 0,
		setNewRulePatientText: setNewRulePatientText,
		setScheduleDateFilter: (_date?: any) => {},
		setSelectedPatientId: setSelectedPatientId,
		shiftWarnings: null,
		sortedCommunicationTasks: null,
		specialtiesWithTemplates: [],
		specialtyProtocolTemplates: [],
		speechGatewayActiveProviderIsLocal: null,
		speechLiveRms: 0,
		speechRecognitionReady: null,
		speechTranscriptionBusy: false,
		startServerVoiceRecording: null,
		stopServerVoiceRecording: null,
		treatmentAcceptancePlannedTotalRub: 0,
		visibleImagingStudies: null,
		visibleVisitSpecialtyFocusOptions: [],
		visitPrimaryAction: null,
		visitSafetyCards: [],
		visitWorkflowSteps: [],
	};
}

import {
	type CommunicationTaskOutcome,
	type Dashboard,
	type DentalPricelistAnalysisResponse,
	type DenteTelegramChatLinkPublic,
	documentFactoryGroups,
	type ImagingStudyKind,
	type ImportCommitResponse,
	type ImportIntakeResponse,
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
	preparePricelistImage,
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
import { useClinicSettingsLogic } from "./hooks/domains/useClinicSettingsLogic";
import { useCommunicationsQueries } from "./hooks/domains/useCommunicationsQueries";
import { useDicomWorkbenchModule } from "./hooks/domains/useDicomWorkbenchModule";
import { useDocumentWorkflowModule } from "./hooks/domains/useDocumentWorkflowModule";
import { useFinanceLogic } from "./hooks/domains/useFinanceLogic";
import { useImagingLogic } from "./hooks/domains/useImagingLogic";
import { useUiPreferencesLogic } from "./hooks/domains/useUiPreferencesLogic";
import { useOnboardingLogic } from "./hooks/domains/useOnboardingLogic";
import { useTelegramLogic } from "./hooks/domains/useTelegramLogic";
import { useImagingQueries } from "./hooks/domains/useImagingQueries";
import { useMigrationQueries } from "./hooks/domains/useMigrationQueries";
import { usePatientIntakeLogic } from "./hooks/domains/usePatientIntakeLogic";
import { usePatientLogic } from "./hooks/domains/usePatientLogic";
import { usePricelistLogic } from "./hooks/domains/usePricelistLogic";
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
import { useDashboardReconciler } from "./hooks/domains/useDashboardReconciler";
import { useRoleAccessLogic } from "./hooks/domains/useRoleAccessLogic";
import { useDashboardLoaderLogic } from "./hooks/domains/useDashboardLoaderLogic";

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
export function useAppLogic(): any {
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
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setBrowserMigrationDiscovery,
		browserMigrationScanProgress,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setBrowserMigrationScanProgress,
		importIntake,
		setImportIntake,
		importPreview,
		setImportPreview,
		importCommit,
		setImportCommit,
		migrationAutopilot,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setMigrationAutopilot,
		migrationSourceDiscovery,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setMigrationSourceDiscovery,
		migrationSourceWorkup,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setMigrationSourceWorkup,
		migrationSourceProbe,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setMigrationSourceProbe,
		clinicPublicLookup,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
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
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setSpeechGatewayStatus,
		speechGatewayHealthReport,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setSpeechGatewayHealthReport,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechProviderRuntimeStatuses,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setSpeechProviderRuntimeStatuses,
		speechRecordingStrategy,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setSpeechRecordingStrategy,
		speechRecordingRecovery,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setSpeechRecordingRecovery,
		pendingSpeechChunkCount,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPendingSpeechChunkCount,
		speechStatusNote,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setSpeechStatusNote,
		browserContinuity,
		setBrowserContinuity,
		localBridgeReadiness,
		setLocalBridgeReadiness,
		localBridgeUsePlans,
		setLocalBridgeUsePlans,
		isImportDictating,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsImportDictating,
		isImportLoading,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsImportLoading,
		isImportCommitting,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsImportCommitting,
		isMigrationAutopilotLoading,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsMigrationAutopilotLoading,
		isMigrationHandoffReportLoading,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsMigrationHandoffReportLoading,
		isMigrationSourceDiscovering,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsMigrationSourceDiscovering,
		isMigrationSourceWorkupLoading,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsMigrationSourceWorkupLoading,
		isMigrationSourceProbeLoading,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsMigrationSourceProbeLoading,
		isClinicPublicLookupLoading,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsClinicPublicLookupLoading,
		isBrowserMigrationScanning,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsBrowserMigrationScanning,
		isSmartImportLoading,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsSmartImportLoading,
		isSmartImportCommitting,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsSmartImportCommitting,
		isSmartReportLoading,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsSmartReportLoading,
		isSmartSafeReportLoading,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsSmartSafeReportLoading,
		isRecognitionLoading,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsRecognitionLoading,
		isPricelistAnalyzing,
		setIsPricelistAnalyzing,
		isServerVoiceRecording,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
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
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsTelegramLoading,
		isTelegramLinkCreating,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsTelegramLinkCreating,
		isTelegramSettingsSaving,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsTelegramSettingsSaving,
		isTelegramSendingDue,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsTelegramSendingDue,
		isTelegramOutboxLoadingMore,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsTelegramOutboxLoadingMore,
		isTelegramLinkCodesLoadingMore,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsTelegramLinkCodesLoadingMore,
		isTelegramChatLinksLoadingMore,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
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
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramStatus,
		telegramFeaturePlan,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramFeaturePlan,
		telegramOutbox,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramOutbox,
		telegramOutboxStatusFilter,
		setTelegramOutboxStatusFilter,
		telegramOutboxTemplateFilter,
		setTelegramOutboxTemplateFilter,
		telegramLinkCodes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramLinkCodes,
		telegramChatLinks,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramChatLinks,
		telegramLinkCodeLedger,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramLinkCodeLedger,
		telegramChatLinkLedger,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
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
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramPreview,
		telegramModeDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramModeDraft,
		telegramBotUsernameDraft,
		setTelegramBotUsernameDraft,
		telegramOwnBotUsernameDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramOwnBotUsernameDraft,
		telegramBotConfigId,
		setTelegramBotConfigId,
		telegramWebhookBaseUrlDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramWebhookBaseUrlDraft,
		telegramPatientPortalBaseUrlDraft,
		setTelegramPatientPortalBaseUrlDraft,
		telegramWelcomeImageUrlDraft,
		setTelegramWelcomeImageUrlDraft,
		telegramVisualCardUrlDrafts,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramVisualCardUrlDrafts,
		telegramReviewUrlDraft,
		setTelegramReviewUrlDraft,
		telegramMapsUrlDraft,
		setTelegramMapsUrlDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramEnabledFeaturesDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramEnabledFeaturesDraft,
		telegramTokenTtlDraft,
		setTelegramTokenTtlDraft,
		telegramReminderLeadTimesDraft,
		setTelegramReminderLeadTimesDraft,
		telegramReviewRequestDelayDraft,
		setTelegramReviewRequestDelayDraft,
		telegramPostVisitCheckupDelayDrafts,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramPostVisitCheckupDelayDrafts,
		telegramAllowVoiceIntakeDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramAllowVoiceIntakeDraft,
		telegramStaffEscalationChannelDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramStaffEscalationChannelDraft,
		telegramPrivacyModeDraft,
		setTelegramPrivacyModeDraft,
		telegramSettingsDirty,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramSettingsDirty,
		telegramSettingsSaveState,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramSettingsSaveState,
		telegramSettingsSaveError,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramSettingsSaveError,
		clinicalAdminSecretDraft,
		setClinicalAdminSecretDraft,
		settingsAdminSecretDraft,
		setSettingsAdminSecretDraft,
		scheduleAdminSecretDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setScheduleAdminSecretDraft,
		telegramAdminSecretDraft,
		setTelegramAdminSecretDraft,
		clinicalAdminSecretSession,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setClinicalAdminSecretSession,
		settingsAdminSecretSession,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setSettingsAdminSecretSession,
		scheduleAdminSecretSession,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setScheduleAdminSecretSession,
		telegramAdminSecretSession,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramAdminSecretSession,
		telegramSendingItemId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramSendingItemId,
		telegramRevokingLinkId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramRevokingLinkId,
	} = useSettingsStore();
	const activeSettingsTabButtonRef = useRef<HTMLButtonElement | null>(null);
	const initialUiPreferencesRef = useRef<UiPreferences | null>(null);
	// Порядковый номер запроса данных клиники: применяем только последний ответ.
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
	/*
	 * Последняя карточка, о которой уже отправлена отметка просмотра.
	 *
	 * Без неё запрос уходил бы на каждый перерисовке рабочего места с тем же
	 * пациентом: карточка открыта весь приём, а строка в истории переписывалась
	 * бы десятки раз подряд.
	 */
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
	const activeOrganizationId =
		dashboard?.clinicSettings?.profile?.organizationId ?? null;
	const _isOmniRoleMode =
		(dashboard?.clinicSettings?.profile as { isOmniRole?: boolean } | undefined)
			?.isOmniRole ?? false;
	const browserDirectoryInputRef = useRef<HTMLInputElement | null>(null);
	const browserMigrationInputRef = useRef<HTMLInputElement | null>(null);
	const _browserMigrationScanAbortRef = useRef<AbortController | null>(null);
	const authRef = useRef<any>(null);
	const loadPersistenceHealthRef = useRef<any>(null);
	const refreshSpeechRuntimeRef = useRef<any>(null);

	const dashboardLoaderLogic = useDashboardLoaderLogic({
		authRef,
		setDashboard,
		setAccessUnlockRequired,
		setAccessUnlockMessage,
		showToast,
		setError,
		loadPersistenceHealthRef,
		refreshSpeechRuntimeRef,
	});
	const { loadDashboard } = dashboardLoaderLogic;
	const staffScheduleDraftsRef = useRef<Record<string, StaffScheduleDraft>>({});
	const chairScheduleDraftsRef = useRef<Record<string, StaffScheduleDraft>>({});
	const appointmentScheduleDraftsRef = useRef<
		Record<string, AppointmentScheduleDraft>
	>({});
	const _mprWorkbenchSaveTimerRef = useRef<number | null>(null);

	const auth = useAuthLogic({
		setError,
		loadDashboard,
		loadTelegramControlPlane: (options) =>
			telegramSettingsModule.loadTelegramControlPlane(options),
	});

	const pricelistLogic = usePricelistLogic({
		auth,
		setError,
		showToast,
		initialPricelistSourceKind: "vendor",
		initialUsePricelistAi: false,
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
	const communicationsQueries = useCommunicationsQueries({ auth });

	/*
	 * ПРЕДПРОСМОТР ИМПОРТА ПАЦИЕНТОВ: КНОПКА БЫЛА ОТВЯЗАНА ОТ ЭКРАНА.
	 *
	 * Что было. `migrationQueries.previewImport` (hooks/domains/useMigrationQueries.ts:114)
	 * возвращает `Response` и НИЧЕГО не кладёт в хранилище. Кнопка «Проверить»
	 * (components/settings/SettingsImportsTab.tsx:6226) звала её напрямую как
	 * onClick, поэтому ответ выбрасывался: `importPreview` во всём дереве
	 * присваивался только значением `null` (appStore.ts:639 — единственный
	 * писатель, все вызовы setImportPreview(null)). Разметка предпросмотра
	 * (SettingsImportsTab.tsx:6254 `typedImportPreview ? …`) не могла показаться
	 * НИКОГДА, а вместе с ней и кнопка «Импортировать готовые», которая живёт
	 * внутри этой ветки. Речь о медицинских данных: оператор не видел, сколько
	 * строк готово, сколько с предупреждением и сколько заблокировано.
	 *
	 * Почему зовётся `/intake`, а не `/preview`. Это НЕ обход предпросмотра:
	 * `/api/imports/patients/intake` (apps/api/src/routes/imports.ts:395)
	 * вызывает `buildPatientImportIntake`, которая внутри строит тот же самый
	 * `buildPatientImportPreview` (imports.ts:232) и отдаёт его в поле `preview`
	 * (importIntakeResponseSchema, packages/shared/src/index.ts:10078). Плюс к
	 * нему — `normalizedText` и `recognitionNotes`, нужные OCR и диктовке.
	 * Второй запрос на `/preview` был бы вторым разбором того же текста, поэтому
	 * ответ intake РАСКЛАДЫВАЕТСЯ на оба состояния, а не дублируется запросом.
	 *
	 * Тело разбирается только после проверки ответа: `fetchWithHandling` бросает
	 * на любой не-2xx, поэтому разбор ниже недостижим для тела отказа.
	 */
	/*
	 * Запись в базу разрешена только после ПОКАЗАННОГО предпросмотра: без него
	 * оператор не видел, что именно приедет, а кнопка коммита уходила в
	 * `/commit`, который строит предпросмотр заново у себя (imports.ts:454) и
	 * пишет пациентов. Тот же самый текст передаётся повторно — так требует
	 * importCommitRequestSchema (= importPreviewRequestSchema).
	 */
	const {
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		patientCoreDraftRef,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		patientAdministrativeProfileDraftRef,
		selectedPatientId,
		patientCoreDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		patientCoreSaveState,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		patientCoreDirty,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		patientAdministrativeProfileDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		patientAdministrativeProfileSaveState,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		patientAdministrativeProfileDirty,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newPatientName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newPatientPhone,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newPatientBirthDate,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isPatientCreating,
		newRulePatientText,
		setSelectedPatientId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPatientCoreDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPatientCoreSaveState,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPatientCoreDirty,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPatientAdministrativeProfileDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPatientAdministrativeProfileSaveState,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPatientAdministrativeProfileDirty,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewPatientName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewPatientPhone,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewPatientBirthDate,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
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
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setDraft,
		visitNoteForm,
		setVisitNoteForm,
		visitToothStateByCode,
		setToothState,
		resetVisitToothState,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		applyAiToothCodes,
		lastServerDraftSavedAt,
		setLastServerDraftSavedAt,
		serverDraftSyncState,
		setServerDraftSyncState,
		localDraftWasRestored,
		setLocalDraftWasRestored,
		pendingVisitSaveCount,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPendingVisitSaveCount,
		lastPendingVisitSaveAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setLastPendingVisitSaveAt,
		lastVisitSaveReceipt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setLastVisitSaveReceipt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechLastQuality,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setSpeechLastQuality,
		isDraftLoading,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsDraftLoading,
		isDraftAccepting,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsDraftAccepting,
		isPendingVisitSyncing,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsPendingVisitSyncing,
		isVisitDictating,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsVisitDictating,
		isTranscriptPolishing,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsTranscriptPolishing,
		lastServerDraftSignatureRef,
		visitDraftUserEditedRef,
		visitCloseChecklist,
		visitWarnings,
		primaryVisitWarning,
		speechProviderRuntimeById,
		speechProviderHealthById,
		activeSpeechProviderHealth,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		savedVisitNoteForm,
		isVisitNoteDirty,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		hasVisitNoteFormText,
		hasVisitTranscriptText,
		visitDraftBuildMissingSteps,
		visitDraftReadyToBuild,
		visitNoteAcceptMissingSteps,
		visitNoteReadyToAccept,
		visitNoteActionLabel,
		visitNoteStatusLabel,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		visitHasSavedNote,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mediaRecorderRef,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mediaStreamRef,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechAudioContextRef,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechAnalyserRef,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechMonitorTimerRef,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechRecordingIdRef,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechChunkIndexRef,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechSegmentStartedAtRef,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechLastSoundAtRef,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechPendingChunkDurationMsRef,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechUploadPromisesRef,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		appliedSpeechChunkKeysRef,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		loadSpeechGatewayStatus,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		loadSpeechGatewayHealthReport,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		loadSpeechProviderRuntimeStatuses,
		loadSpeechRecordingStrategy,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		loadSpeechRecordingRecovery,
		refreshSpeechRuntime,
		refreshPendingVisitSaveState,
		refreshPendingSpeechChunkState,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		applyAcceptedVisitResponse,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		submitAcceptedVisitDraft,
		visitDraftSignature,
		loadServerVisitDraft,
		syncVisitDraftAutosave,
		flushPendingVisitSaves,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		submitSpeechChunk,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechChunkApplyKey,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechTranscriptionMatchesActiveVisit,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		applySpeechTranscription,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		assembleSpeechRecording,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		trackSpeechUpload,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		waitForSpeechUploads,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
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
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		appendVisitDictationText,
		clearTranscriptWithUndo,
		undoTranscriptClear,
		startVisitDictation,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		preferredSpeechMimeType,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		uploadSpeechBlob,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		stopSpeechMonitor,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		requestSpeechChunk,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
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
            sortedAppointments,
            appointmentReadinessById,
            handleQuickConsult,
            isQuickConsultLoading
        } = schedule;
        
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
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setStaffScheduleSavingId,
		staffScheduleDirtyIds,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setStaffScheduleDirtyIds,
		staffScheduleSaveStates,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setStaffScheduleSaveStates,
		chairScheduleDrafts,
		setChairScheduleDrafts,
		chairScheduleSavingId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setChairScheduleSavingId,
		chairScheduleDirtyIds,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setChairScheduleDirtyIds,
		chairScheduleSaveStates,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setChairScheduleSaveStates,
		appointmentScheduleDrafts,
		setAppointmentScheduleDrafts,
		appointmentScheduleDirtyIds,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setAppointmentScheduleDirtyIds,
		appointmentScheduleSaveStates,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setAppointmentScheduleSaveStates,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		appointmentScheduleErrors,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setAppointmentScheduleErrors,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newAppointmentDraft,
		setNewAppointmentDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newAppointmentSaveState,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewAppointmentSaveState,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		markStaffScheduleDirty,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		markChairScheduleDirty,
		updateStaffScheduleDraft,
		updateChairScheduleDraft,
		updateStaffScheduleDay,
		updateChairScheduleDay,
		openAppointmentEditor,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
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
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newAppointmentMissingFields,
		createAppointmentFromDraft,
	} = schedule;
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
		localImagingRecoveryHydratedOrganizationIdRef,
		imagingPreviewObjectUrls,
		setImagingPreviewObjectUrls,
		_dicomFirstFramePreviewRequest,
		_setDicomFirstFramePreviewRequest,
		_browserImagingScanAbortRef,
		_localDicomOperationAbortRef,
		_imagingViewerSaveTimerRef,
		imagingQueries,
		dicomWorkbenchModule,
		imagingPreviewWorkset,
		_imagingPreviewSignature,
		createImagingStudy,
		imagingViewerSaveTitle,
		imagingViewerSaveDetail,
		canRetryImagingViewerSave,
		imagingViewerNoteText,
		imagingViewerNoteReady,
		imagingViewerNoteMissingId,
		imagingViewerRetryMissingId,
		imagingPreviewSource,
		imagingViewerHref,
	} = useImagingLogic({
		activeOrganizationId,
		auth,
		dashboard,
		showToast,
		actionFailureToast,
		currentView,
		setError,
		activePatient,
		loadDashboard,
		isOnline,
	});

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
		clinicalToothRowsText,
		setClinicalToothRowsText,
	} = documentWorkflow;

	function renderClinicalToothRowsEditor() {
		return (
			<label>
				<span>Клинические строки по зубам и сегментам</span>
				<textarea
					value={clinicalToothRowsText}
					onChange={(event) => setClinicalToothRowsText(event.target.value)}
					rows={5}
				/>
				<small>
					{
						"Формат строки: зуб/сегмент | поверхности | статус | диагноз/находка | показание | действие | прогноз | пародонт | имплант/ортопедия | ортодонтия"
					}
				</small>
			</label>
		);
	}

	const {
		selectedImagingStudy,
		applyDicomWorkbenchManifest,
		loadDicomWorkbenchBundles,
	} = dicomWorkbenchModule;

	const telegramLogic = useTelegramLogic({
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
		telegramOutbox,
		telegramOutboxStatusFilter,
		telegramOutboxTemplateFilter,
		telegramLinkStaffId,
		setTelegramLinkStaffId,
		telegramLinkSubjectType,
		telegramModeDraft,
		telegramBotConfigId,
		telegramLinkCode,
		telegramLinkActionState,
		setTelegramLinkCode,
		setTelegramLinkActionState,
	});
	const {
		telegram,
		telegramSettingsModule,
		saveTelegramSettings,
		telegramLinkStaffOptions,
		filteredTelegramOutboxItems,
		visibleTelegramOutboxItems,
		hiddenTelegramOutboxItemCount,
		telegramSubjectName,
	} = telegramLogic;
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
		if (!dashboard) return;
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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


	// biome-ignore lint/correctness/useExhaustiveDependencies: global action without stale state
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

	// Флаг «готово к созданию» дополнительно учитывает выполняющийся запрос,
	// поэтому кнопки гаснут сразу после первого нажатия, а не после ответа сервера.
	const _newStaffReadyToCreate =
		newStaffName.trim().length > 0 && !isStaffCreating;
	const _newChairReadyToCreate =
		newChairName.trim().length > 0 && !isChairCreating;
	const selectedUiLanguageOption =
		uiLanguageOptions?.find((option) => option.value === uiLanguage) ??
		defaultUiLanguageOption;
	const serviceTitle = (serviceId: string) =>
		dashboard?.serviceCatalog?.find((service) => service.id === serviceId)
			?.title ?? serviceId;
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

	/*
	 * Фото прайса в состояние вкладки «Цены».
	 *
	 * СВОЕЙ ПОДГОТОВКИ ЗДЕСЬ НЕТ НАМЕРЕННО. Готовая `preparePricelistImage`
	 * (AppHelpers.tsx:5869) уже сжимает снимок до 1600/1200/900/720 px и
	 * пробует качество 82/72/62 %, пока base64 не влезет в лимит схемы
	 * (4 000 000 символов), и возвращает ЧИСТЫЙ base64 без приставки `data:` —
	 * именно его ждёт сервер, он сам собирает
	 * `data:${imageMimeType};base64,${imageBase64}` (analyzer.ts:2575) и сверяет
	 * первые байты с заявленным типом (analyzer.ts:1791). Второй разбор файла
	 * рядом с этой функцией разошёлся бы с ней по лимиту и по типу вывода.
	 *
	 * До этой правки функция не вызывалась НИОТКУДА: в сборном объекте стояло
	 * `attachPricelistImage: null`, поэтому подготовленное фото в состояние не
	 * попадало, и подпись «Фото прайса: 1600x1200, 1.9 Мп, JPEG 82%»
	 * (SettingsView.tsx:2187) не появлялась никогда.
	 */
	/*
	 * Разбор прайс-листа: POST /api/pricelist/analyze.
	 *
	 * ЧТО ЗАКРЫВАЕТ. В этом сборном объекте стояло `analyzePricelist: null`, и
	 * кнопка «Разобрать прайс» (components/settings/SettingsPricesTab.tsx:699)
	 * получала во вкладку null. Администратор клиники вставлял прайс, нажимал
	 * кнопку и не получал НИЧЕГО: ни разбора, ни отказа, ни признака работы.
	 * Маршрут при этом живой (apps/api/src/routes/pricelist.ts:35). Компилятор
	 * молчал: вкладка читает свойства через `Object.assign({}, appLogic,
	 * derivations) as any` (SettingsPricesTab.tsx:80), и null там законен.
	 *
	 * ЗАГОЛОВОК ОБЯЗАТЕЛЕН. Маршрут закрыт requireClinicalReadAccess
	 * (accessGuard.ts:76), которая читает x-dente-admin-secret. Глобальная
	 * обёртка fetch (lib/apiAuthFetch.ts) этот заголовок НЕ подставляет, поэтому
	 * его ставит denteClinicalReadHeaders(). Без него у заказчика 403 при зелёном
	 * прогоне на этой машине: локально охрану гасят лазейки
	 * DENTE_CLINICAL_ALLOW_UNGUARDED_READS, а в продакшене их нет.
	 */

	const clinicSettings = useClinicSettingsLogic({
		dashboard,
		clinicProfileDraft,
		setClinicProfileDraft,
		setClinicProfileDirty,
		setClinicProfileSaveState,
		clinicProfileDirty,
		staffScheduleDrafts: schedule.staffScheduleDrafts,
		chairScheduleDrafts: schedule.chairScheduleDrafts,
		updateStaffScheduleDraft: schedule.updateStaffScheduleDraft,
		updateChairScheduleDraft: schedule.updateChairScheduleDraft,
		isClinicalRuleSaving,
		setIsClinicalRuleSaving,
		loadDashboard,
		setError,
		auth,
		newRuleTitle,
		setNewRuleTitle,
		newRuleAction,
		newRuleSeverity,
		newRuleOwnerRole,
		newRuleSpecialty,
		newRuleCategory,
		newRuleTriggerServiceId,
		newRuleRequiredServiceId,
		newRuleCompletedServiceId,
		newRuleBlockedServiceId,
		newRuleWarningText,
		setNewRuleWarningText,
		newRulePatientText: patient.newRulePatientText,
	});

        const { legalMissingFields, legalReadinessPercent } = clinicSettings;
        

	const staffSettings = useStaffSettingsLogic({
		auth,
		setError,
		loadDashboard,
		saveClinicProfileIfDirty: clinicSettings.saveClinicProfileIfDirty,
	});


    const uiPreferencesLogic = useUiPreferencesLogic({
		dashboard,
		auth,
		showToast,
		actionFailureToast,
		saveServerUiPreferences,
		uiPreferencesSyncErrorMessage,
		operatorWorkflowFailureMessage,
		loadServerUiPreferences,
		loadUiPreferences,
		safeLocalStorageSetItem,
		uiPreferencesStorageKey,
		saveUiPreferences,
		browserCapabilityFailureMessage,
		inspectBrowserContinuity,
		loadPersistenceHealthRef,
		refreshSpeechRuntimeRef,
		settingsAdminSecretSession,
		setError,
		responseErrorMessage,
		loadWorkspaceProfile,
		pricelistLogic,
		uiPreferencesSyncError,
		setUiPreferencesSyncError,
		uiPreferencesHydrated,
		setUiPreferencesHydrated,
		persistenceHealth,
		setPersistenceHealth,
		persistenceIntegrity,
		setPersistenceIntegrity,
		isPersistenceExporting,
		setIsPersistenceExporting,
		browserContinuity,
		setBrowserContinuity,
		localBridgeReadiness,
		setLocalBridgeReadiness,
		localBridgeUsePlans,
		setLocalBridgeUsePlans,
		uiLanguage,
		setUiLanguage,
		selectedWorkspaceRole,
		setSelectedWorkspaceRole,
		selectedSpecialty,
		setSelectedSpecialty,
		selectedProtocolId,
		setSelectedProtocolId,
		selectedPatientId,
		setSelectedPatientId,
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
		paymentMethod,
		setPaymentMethod,
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
		pricelistSourceKind,
		setPricelistSourceKind,
		usePricelistAi,
		setUsePricelistAi,
		odontogramUseSurfaces,
		setOdontogramUseSurfaces,
		recognitionKind,
		setRecognitionKind,
		recognitionTarget,
		setRecognitionTarget,
		importSourceKind,
		setImportSourceKind,
		documentIngestionTarget,
		setDocumentIngestionTarget,
		imagingImportSourceKind,
		setImagingImportSourceKind,
		smartImportMode,
		setSmartImportMode,
		imagingKindFilter,
		setImagingKindFilter,
		dicomWebEndpointUrl,
		setDicomWebEndpointUrl,
		ohifBaseUrl,
		setOhifBaseUrl,
		telegramBotConfigId,
		setTelegramBotConfigId,
		telegramLinkSubjectType,
		setTelegramLinkSubjectType,
		telegramLinkStaffId,
		setTelegramLinkStaffId,
		telegramOutboxStatusFilter,
		setTelegramOutboxStatusFilter,
		telegramOutboxTemplateFilter,
		setTelegramOutboxTemplateFilter,
		onboardingDismissed,
		setOnboardingDismissed,
		onboardingDismissedAt,
		setOnboardingDismissedAt,
		onboardingStep,
		setOnboardingStep,
		onboardingDraftMode,
		setOnboardingDraftMode,
    });

    const {
        currentUiPreferencesInput,
        clearUiPreferencesRetryTimer,
        queueUiPreferencesServerSync,
        flushPendingUiPreferencesServerSync,
        loadPersistenceHealth,
        loadPersistenceIntegrity,
        downloadPersistenceExport,
        refreshBrowserContinuity,
        _loadLocalBridgeReadiness,
        loadLocalBridgeUsePlans,
        requestBrowserStoragePersistence,
        applyUiPreferences,
        recentPatientViewsVersion,
    } = uiPreferencesLogic;

	const onboardingLogic = useOnboardingLogic({
		clinicProfileDraft,
		dashboard,
		clinicSettings,
		saveOnboardingSchedulesIfDirty,
		telegramModeDraft,
		telegramBotUsernameDraft,
		telegramOwnBotUsernameDraft,
		telegramPatientPortalBaseUrlDraft,
		telegramReviewUrlDraft,
		telegramMapsUrlDraft,
		telegramSettingsDirty,
		saveTelegramSettings,
		setError,
		currentUiPreferencesInput,
		uiPreferencesServerReadyRef,
		saveServerUiPreferences,
		settingsAdminSecretSession,
		pendingUiPreferencesSyncRef,
		setUiPreferencesSyncError,
		showToast,
		actionFailureToast,
		uiPreferencesSyncErrorMessage,
		persistUiPreferences,
		saveOnboardingDismissed,
		setCurrentView,
		setSettingsTab,
		currentView,
		settingsTab,
		queueUiPreferencesServerSync,
		uiPreferencesHydrated,
		loadUiPreferences,
	});
	const {
		onboardingFirstAppointmentIssues,
		onboardingDocumentReadinessIssues,
		onboardingBlockingIssues,
		onboardingTelegramRecommendations,
		onboardingReadyToFinish,
		onboardingDocumentsReady,
		onboardingStaffCreateGuidanceId,
		onboardingChairCreateGuidanceId,
		onboardingFinishGuidanceId,
		currentOnboardingIndex,
		previousOnboardingStep,
		nextOnboardingStep,
		showFullOnboardingGuide,
		buildOnboardingFirstAppointmentIssues,
		buildOnboardingDocumentReadinessIssues,
		_buildOnboardingReadinessIssues,
		buildOnboardingTelegramRecommendations,
		focusOnboardingIssue,
		assertOnboardingReadyForFinish,
		dismissOnboarding,
		continueOnboardingInDraftMode,
		moveOnboardingTo,
		reopenOnboarding,
		openOnboardingGuide,
	} = onboardingLogic;

        useDashboardReconciler({
            dashboard,
            selectedProtocolId,
            setSelectedProtocolId,
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
            telegramLinkStaffId,
            setTelegramLinkStaffId,
        });

        const roleAccessLogic = useRoleAccessLogic({
            dashboard,
            selectedWorkspaceRole: selectedWorkspaceRole as StaffRole,
            currentView: currentView as AppView,
        });
        const {
            activeRolePolicy,
            activeQueueRole,
            activeRoleQueue,
            activeRoleWritableSections,
            activeRoleRestrictedSections,
            uncoveredStaffRoles,
            roleRecommendedActions,
            visibleRecommendedActions,
            roleScheduleSuggestions,
            visibleScheduleSuggestions,
            showAdministrationTopActions,
            showDoctorVisitShortcut,
        } = roleAccessLogic;
        

	return {
    		...dashboardLoaderLogic,
        		...dashboardLoaderLogic,
        		removeClinicalRule: clinicSettings.removeClinicalRule,
        		createServiceCatalogItem: clinicSettings.createServiceCatalogItem,
        		updateServiceCatalogItem: clinicSettings.updateServiceCatalogItem,
        		deleteServiceCatalogItem: clinicSettings.deleteServiceCatalogItem,
        		...pricelistLogic,
        		...telegramLogic,
        		...onboardingLogic,
        		...documentWorkflow,
        		...dicomWorkbenchModule,
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
        		createAppointmentFromDraft,
        		createClinicalRuleFromSettings:
        			clinicSettings.createClinicalRuleFromSettings,
        		createImagingStudy,
        		ctPlanningActiveQuickActionId,
        		ctPlanningImplantPlan,
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
        		onboardingDismissed,
        		onboardingDraftMode,
        		onboardingStep,
        		onboardingSteps,
        		onboardingTelegramVisualCardKeys,
        		openAppointmentEditor,
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
        		requestBrowserStoragePersistence,
        		resetNewAppointmentDraft,
        		roleFocusOrder,
        		saveAppointmentSchedule,
        		saveChairSchedule,
        		saveClinicProfileFromDraft: clinicSettings.saveClinicProfileFromDraft,
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
        		settingsAdminSecretDraft,
        		settingsAdminSecretSession,
        		settingsTab,
        		settingsTabs,
        		showAdministrationTopActions,
        		showDoctorVisitShortcut,
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
        		toggleChairWorkingDay: clinicSettings.toggleChairWorkingDay,
        		toggleClinicWorkingDay: clinicSettings.toggleClinicWorkingDay,
        		toggleStaffWorkingDay: clinicSettings.toggleStaffWorkingDay,
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
        		updateClinicProfileDraft: clinicSettings.updateClinicProfileDraft,
        		updateNewAppointmentDraft,
        		updatePatientAdministrativeProfileDraft,
        		updatePatientCoreDraft,
        		updateStaffScheduleDay,
        		updateStaffScheduleDraft,
        		updateVisitNoteField,
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
        		operatorWorkflowFailureMessage,
        		...clinicalVisitLogic,
        		...staffSettings,
        		...patientIntakeLogic,
        		...migrationQueries,
        		...imagingQueries,
        		...communicationsQueries,
        		// Обёртки previewImport/commitImport ЗАМЕЩАЮТ голые хуки из ...migrationQueries
        		activeCommunicationTasks: null,
        		activeImagingStudies: null,
        		activePayments,
        		activeTreatmentPlanItems,
        		addImagingViewerNoteAnnotation: null,
        		address: documentPatient?.administrativeProfile?.registrationAddress ?? "",
        		applyCtPlanningQuickAction: null,
        		applyMprClinicalPreset: null,
        		applyNearestMprClinicalPreset: null,
        		applyProtocolTemplate: null,
        		applyProtocolTemplateDirectly: null,
        		assembleSpeechRecording: async () => {},
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
        		clinic: dashboard?.clinicSettings?.profile ?? null,
        		clinicalMutationHeaders: auth.denteClinicalMutationHeaders,
        		clinicalReadHeaders: auth.denteClinicalReadHeaders,
        		clinicName: dashboard?.clinicSettings?.profile?.clinicName ?? "",
        		createCtPlanningArtifact: null,
        		ctPlanningAnnotationRefs: { current: null },
        		dictationQuickPhrases: null,
        		emptyDictationVoiceActionLabel: null,
        		firstName: documentPatient?.fullName?.split(" ")[1] ?? "",
        		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
        		renderClinicalToothRowsEditor,
        		resetMprControls: null,
        		retryImagingViewerSessionSave: null,
        		scheduleDateFilter: "",
        		selectedPaymentReceiptTotalRub: 0,
        		selectedProtocolTemplate: null,
        		selectedTaxPaymentTotalRub: 0,
        		setNewRulePatientText: setNewRulePatientText,
        		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
        		visibleImagingStudies: null,
        		visibleVisitSpecialtyFocusOptions: [],
        		visitPrimaryAction: null,
        		visitSafetyCards: [],
        		visitWorkflowSteps: [],
        	};
}

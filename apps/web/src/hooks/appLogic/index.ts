import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
	CommunicationTaskOutcome,
	Dashboard,
	DentalPricelistAnalysisResponse,
	DenteTelegramChatLinkPublic,
	ImagingStudyKind,
	ImportCommitResponse,
	ImportIntakeResponse,
	LanNodeRole,
	LocalBridgeReadinessResponse,
	LocalBridgeUsePlansResponse,
	StaffRole,
} from "@dental/shared";
import {
		type AppointmentScheduleDraft, type ClinicProfileDraft, type DicomFirstFramePreviewRequestContext, type ImagingViewerSaveState,
		type OnboardingStep, type StaffScheduleDraft, type UiPreferences, type VisitNoteForm,
		browserCapabilityFailureMessage, buildClinicProfileUpdatePayload, clinicLegalMissingFields, clinicLegalReadinessPercent,
		clinicProfileDraftFromProfile, clinicProfileDraftSignature, clinicProfileEndpoint, defaultDicomFirstFrameViewerState,
		defaultImagingViewerState, defaultStaffScheduleDraft, defaultUiLanguageOption, defaultUiPreferences,
		dicomFirstFrameStatusLabels, documentDetectedKindLabel, documentIngestionQualityLabels, documentIssueSignatureModeLabels,
		documentVoidReasonLabels, emptyClinicProfileDraft, formatDateTime, formatShortDate,
		formatTime, fromDateTimeLocalValue, imagingSourceChoices, isTelegramOutboxItemDueForUi,
		loadLocalDicomWorkbenchDraft, loadUiPreferences, normalizedTelegramBotMode, normalizedTelegramLinkSubjectType,
		normalizedTelegramOutboxStatusFilter, normalizedTelegramOutboxTemplateFilter, normalizedTelegramPrivacyMode, onboardingTelegramVisualCardKeys,
		operatorWorkflowFailureMessage, patientName as patientNameHelper, preparePricelistImage, responseErrorMessage, saveLocalDicomWorkbenchDraft,
		saveUiPreferences, telegramClassificationLabels, telegramDeliveryStatusLabels, telegramHumanMessage,
		telegramInlineButtonKindLabels, telegramInlineButtonRowsFromReplyMarkup, telegramLinkCodeStatusLabels, telegramModeHints,
		telegramModeLabels, telegramOutboxStatusFilterLabels, telegramOutboxStatusFilterOptions, telegramOutboxTemplateFilterLabels,
		telegramOutboxTemplateFilterOptions, telegramPrivacyModeLabels,
		toDateTimeLocalValue, viewFromHash, visitDraftMissingFieldLabel, visitDraftQualityLabels,
		visitDraftSignalLabel, visitNoteFieldDefinitions, visitNoteFormFromDraft, visitNoteFormFromVisit,
		visitSaveReceiptText, WorkflowResponseError, weekdayOptions, workspaceScopeLabels,
		xrayPregnancyStatusOptions, xrayStudyTypeOptions,
} from "../../AppHelpers";
import {
		formatByteSize, formatMegabytes, inspectBrowserContinuity,
} from "../../browserContinuity";
import { communicationDocumentTaskActionLabels } from "../../communicationTaskData";
import { showToast } from "../../components/GlobalToast";
import { actionFailureToast } from "../../lib/panelStateText";
import { describeMprClinicalPresetProjectionFallback } from "../../mprClinicalStatus";
import { buildMprAxisGuidance, mprProjectionCompassLabels } from "../../mprControlMath";
import {
		dentalMaterialKindLabels, dentalRestorationTypeLabels, pricelistItemMaterialText, pricelistMaterialSummaryText,
		pricelistRecognitionBrandGroups, pricelistRecognitionServiceGroups, pricelistSourceKindLabels, pricelistWarningsText,
} from "../../pricelistUiMeta";
import {
		imagingConnectorCards, imagingViewerCapabilities, recognitionPresets,
} from "../../settingsStaticData";
import { useAppStore } from "../../store/appStore";
import { useImagingStore } from "../../store/imagingStore";
import { useSettingsStore } from "../../store/settingsStore";
import { logger } from "../../utils/logger";
import {
		clampMprAxisDeg, clampMprSlabMm, clampMprSliceIndex, formatSignedMprStep,
		mprAxisBounds, mprAxisNudgeDeg, mprSlabBounds, mprSlabNudgeMm,
		mprSliceIndexFromFraction, mprSliceNudgeSteps, mprSlicePresetFractions,
} from "../../utils/math/mprMath";
import {
		type AppView, getFallbackAppView, getFilteredAppViews, viewLabels,
} from "../../utils/routeUtils";
import { inferDashboardVisitSpecialty } from "../../visitSpecialtyData";
import {
		appointmentLabels, clinicalRuleActionLabels, clinicalRuleSeverityLabels, clinicModeLabels,
		communicationChannelLabels, communicationIntentLabels, communicationPriorityLabels, communicationStatusLabels,
		completedActContractReferenceForUi, dicomFolderWorkupPathLabels, documentActionLabels, documentLabels,
		documentSourceStatusClassNames, documentStatusLabels, integrationCapabilityLabels, integrationCategoryLabels,
		integrationStatusLabels, localBridgeStatusLabels, localBridgeUsePathLabels,
		paymentFiscalReceiptLabelForUi, paymentMethodLabels, recognitionTargetLabels, scenarioPriorityLabels,
		scenarioStrategyLabels, serviceCategoryLabels, specialtyLabels, speechProviderHealthLabels,
		speechProviderModeLabels, speechProviderSelectionLabels, speechProviderStatusLabels, speechRecordingPathLabels,
		speechRecoveryStateLabels, staffRoleLabels, structuredPayloadDocumentKinds, treatmentStatusLabels,
		warningSeverityLabels,
} from "../../workspaceUiLabels";
import {
		postVisitCareTopicOptions, telegramFeatureHelp, telegramFeatureOptions, telegramPostVisitCheckupDelayFields,
		telegramVisualCardFields,
} from "../../workspaceStaticOptions";

import { useNavigationState } from "./useNavigationState";
import { usePatientSelectionState } from "./usePatientSelectionState";
import { useScheduleLogic } from "./useScheduleLogic";
import { useClinicalSessionLogic } from "./useClinicalSessionLogic";
import { useBillingModalLogic } from "./useBillingModalLogic";
import { useModalController } from "./useModalController";
import { useHotkeysController } from "./useHotkeysController";
import { useOfflineSyncLogic } from "./useOfflineSyncLogic";
import { useSettingsAndIntegrationsLogic } from "./useSettingsAndIntegrationsLogic";

import { useAuthLogic } from "../domains/useAuthLogic";
import { useDashboardLoaderLogic } from "../domains/useDashboardLoaderLogic";
import { useStaffSettingsLogic } from "../domains/useStaffSettingsLogic";
import { useMigrationQueries } from "../domains/useMigrationQueries";
import { useImagingQueries } from "../domains/useImagingQueries";
import { useCommunicationsQueries } from "../domains/useCommunicationsQueries";

export type * from "./types";

// biome-ignore lint/suspicious/noExplicitAny: master coordinator hook
export function useAppLogic(): any {
	const appStore = useAppStore();
	const settingsStore = useSettingsStore();
	const imagingStore = useImagingStore();

	const [soundNotificationsMuted, setSoundNotificationsMuted] = useState<boolean>(() => {
		return loadUiPreferences().soundNotificationsMuted ?? false;
	});
	const soundNotifications = useMemo(() => ({
		muted: soundNotificationsMuted,
		setMuted: setSoundNotificationsMuted,
		testOnlineBookingSound: () => {},
		testSlotEndSound: () => {},
	}), [soundNotificationsMuted]);

	const authRef = useRef<any>(null);
	const loadPersistenceHealthRef = useRef<any>(null);
	const refreshSpeechRuntimeRef = useRef<any>(null);
	const browserDirectoryInputRef = useRef<HTMLInputElement | null>(null);
	const browserMigrationInputRef = useRef<HTMLInputElement | null>(null);
	const paymentMutationIdRef = useRef<string | null>(null);
	const [recentPatientViewsVersion, setRecentPatientViewsVersion] = useState(0);

	const { loadDashboard } = useDashboardLoaderLogic({
		authRef, setDashboard: appStore.setDashboard, setAccessUnlockRequired: appStore.setAccessUnlockRequired, setAccessUnlockMessage: appStore.setAccessUnlockMessage,
		showToast, setError: appStore.setError, loadPersistenceHealthRef, refreshSpeechRuntimeRef,
	});

	const auth = useAuthLogic({
		setError: appStore.setError,
		loadDashboard,
		loadTelegramControlPlane: (options) =>
			settingsAndIntegrations.telegramSettingsModule.loadTelegramControlPlane(options),
	});
	authRef.current = auth;

	const navigationState = useNavigationState({ dashboard: appStore.dashboard });
	const {
		currentView, setCurrentView, settingsTab, setSettingsTab,
		selectedWorkspaceRole, setSelectedWorkspaceRole, activeSettingsTabButtonRef, showAdministrationTopActions,
		showDoctorVisitShortcut, isDoctorShiftCockpitOpen, openDoctorShiftCockpit, closeDoctorShiftCockpit,
		toggleDoctorShiftCockpit, activeRolePolicy, activeRoleQueue, activeRoleWritableSections,
		activeRoleRestrictedSections, uncoveredStaffRoles, roleRecommendedActions, visibleRecommendedActions,
		roleScheduleSuggestions, visibleScheduleSuggestions, navigationRouter,
	} = navigationState;

	const patientSelection = usePatientSelectionState({
		auth,
		dashboard: appStore.dashboard,
		loadDashboard,
		setError: appStore.setError,
		setDashboard: appStore.setDashboard,
	} as any);
	const {
		query, setQuery, selectedPatientId, setSelectedPatientId,
		selectedPatient, activePatient, activeVisitPatient, activePatientCallablePhone,
		activePatientHasCallablePhone, activePatientInsight, savePatientCore, createPatient,
		updatePatientCoreDraft, updatePatientAdministrativeProfileDraft, patient, patientIntakeLogic,
	} = patientSelection;

	const scheduleLogic = useScheduleLogic({
		dashboard: appStore.dashboard,
		setDashboard: appStore.setDashboard,
		auth,
		setError: appStore.setError,
		selectedPatientId: selectedPatientId ?? "",
		setSelectedPatientId,
		loadDashboard,
		selectedSpecialty: "",
		clinicProfileDraft: appStore.clinicProfileDraft,
		setSettingsTab,
	});
	const {
		editingAppointmentId, setEditingAppointmentId, newAppointmentError, setNewAppointmentError,
		newChairName, setNewChairName, newChairHasXraySensor, setNewChairHasXraySensor,
		newChairHasMicroscope, setNewChairHasMicroscope, newChairHasSurgeryKit, setNewChairHasSurgeryKit,
		newStaffName, setNewStaffName, newStaffRole, setNewStaffRole,
		newStaffSpecialty, setNewStaffSpecialty, activeAppointment, activeDoctor,
		todayDoctorSlots, activeChair, sortedAppointments, appointmentReadinessById,
		scheduleAdminSecretDraft, scheduleAdminSecretSession, updateAppointmentScheduleDraft, updateChairScheduleDay,
		updateChairScheduleDraft, updateNewAppointmentDraft, updateStaffScheduleDay, updateStaffScheduleDraft,
		toggleChairWorkingDay, toggleClinicWorkingDay, toggleStaffWorkingDay, staffScheduleDrafts,
		staffScheduleSaveStates, staffScheduleSavingId, saveStaffSchedule, scheduleFilterController,
	} = scheduleLogic;

	const clinicalSession = useClinicalSessionLogic({
		auth,
		dashboard: appStore.dashboard,
		loadDashboard,
		setError: appStore.setError,
		documentPatient: patient.documentPatient,
		activeAppointment,
		activeDoctor,
		activePatient,
		selectedPatientId: selectedPatientId ?? "",
	} as any);
	const {
		clinicalVisitLogic, odontogramUseSurfaces, setOdontogramUseSurfaces, odontogramViewMode,
		setOdontogramViewMode, toothRows, toothStateByCode, setToothState,
		renderClinicalToothRowsEditor, visitNoteForm, updateVisitNoteField, visitWarnings,
		visitCloseChecklist, visitDraftBuildMissingSteps, visitDraftMissingFieldLabel, visitDraftQualityLabels,
		visitDraftReadyToBuild, visitDraftSignalLabel, visitDraftUserEditedRef, visitNoteAcceptMissingSteps,
		visitNoteActionLabel, visitNoteFieldDefinitions, visitNoteReadyToAccept, visitNoteStatusLabel,
		visitSaveReceiptText, acceptDraftToVisit, scrollToVisitArea,
	} = clinicalSession;

	const billingModal = useBillingModalLogic({
		auth,
		dashboard: appStore.dashboard,
		documentPatient: patient.documentPatient,
		paymentPatientContextReady: true,
		paymentPatientContextMessage: "",
		realActiveVisitId: appStore.dashboard?.activeVisit?.id ?? null,
		loadDashboard,
		setError: appStore.setError,
	});
	const {
		finance, paymentAmount, setPaymentAmount, paymentMethod,
		setPaymentMethod, paymentFeedback, setPaymentFeedback, activePayments,
		activeTreatmentPlanItems, paymentFiscalCashierName, setPaymentFiscalCashierName, paymentFiscalFd,
		setPaymentFiscalFd, paymentFiscalFn, setPaymentFiscalFn, paymentFiscalFpd,
		setPaymentFiscalFpd, paymentFiscalReceiptIssuedAt, setPaymentFiscalReceiptIssuedAt, paymentFiscalReceiptNumber,
		setPaymentFiscalReceiptNumber, paymentFiscalReceiptUrl, setPaymentFiscalReceiptUrl, paymentPayerBirthDate,
		setPaymentPayerBirthDate, paymentPayerFullName, setPaymentPayerFullName, paymentPayerIdentityDocument,
		setPaymentPayerIdentityDocument, paymentPayerInn, setPaymentPayerInn, paymentPayerRelationship,
		setPaymentPayerRelationship, paymentTaxDeductionCode, setPaymentTaxDeductionCode, selectedPaymentReceiptTotalRub,
		selectedTaxPaymentTotalRub,
	} = billingModal;

	const modalController = useModalController({
		auth,
		dashboard: appStore.dashboard,
		loadDashboard,
		setError: appStore.setError,
		currentView,
		setCurrentView,
		activePatient,
		clinicProfileDraft: appStore.clinicProfileDraft,
	} as any);
	const {
		modalOrchestrator, accessUnlockRequired, setAccessUnlockRequired, accessUnlockMessage,
		setAccessUnlockMessage, clinicalAdminSecretDraft, setClinicalAdminSecretDraft, settingsAdminSecretDraft,
		setSettingsAdminSecretDraft, settingsAdminSecretSession, onboardingDismissed, setOnboardingDismissed,
		onboardingDismissedAt, setOnboardingDismissedAt, onboardingStep, setOnboardingStep,
		onboardingDraftMode, setOnboardingDraftMode, onboardingGuideExpanded, setOnboardingGuideExpanded,
		dismissOnboarding, continueOnboardingInDraftMode, moveOnboardingTo, reopenOnboarding,
		openOnboardingGuide, showFullOnboardingGuide, onboardingFirstAppointmentIssues, onboardingDocumentReadinessIssues,
		onboardingBlockingIssues, onboardingTelegramRecommendations, onboardingReadyToFinish, onboardingDocumentsReady,
		onboardingStaffCreateGuidanceId, onboardingChairCreateGuidanceId, onboardingFinishGuidanceId, currentOnboardingIndex,
		previousOnboardingStep, nextOnboardingStep,
	} = modalController;

	useHotkeysController({
		currentView,
		setCurrentView,
		onboardingStep,
		onboardingDismissed,
	} as any);

	const offlineSync = useOfflineSyncLogic({
		auth,
		setError: appStore.setError,
	});
	const {
		isOnline, setIsOnline, localAutosaveReady, setLocalAutosaveReady,
		lastLocalSavedAt, setLastLocalSavedAt, browserContinuity, setBrowserContinuity,
		persistenceHealth, setPersistenceHealth, persistenceIntegrity, setPersistenceIntegrity,
		isPersistenceExporting, setIsPersistenceExporting, loadPersistenceHealth, loadPersistenceIntegrity,
		downloadPersistenceExport, refreshBrowserContinuity, requestBrowserStoragePersistence, localBridgeReadiness,
		setLocalBridgeReadiness, localBridgeUsePlans, setLocalBridgeUsePlans, loadLocalBridgeUsePlans,
	} = offlineSync;

	const settingsAndIntegrations = useSettingsAndIntegrationsLogic({
		auth,
		dashboard: appStore.dashboard,
		setDashboard: appStore.setDashboard,
		loadDashboard,
		setError: appStore.setError,
		currentView,
		setCurrentView,
		settingsTab,
		onboardingDismissed,
		onboardingStep,
		activePatient,
		activeDoctor,
		activeAppointment,
		documentPatient: patient.documentPatient,
		selectedPatientId: selectedPatientId ?? "",
		uiPreferencesHydrated: appStore.uiPreferencesHydrated,
		setSelectedDocumentKind: () => {},
		activePayments,
		activeTreatmentPlanItems,
		visitNoteForm,
		clinicalAdminSecretSession: clinicalAdminSecretDraft,
		settingsAdminSecretSession,
	});
	const {
		saveClinicProfileFromDraft, saveClinicProfileIfDirty, analyzePricelist, completeCommunicationTask,
		createClinicalRuleFromSettings, documentWorkflow, dicomWorkbenchModule, telegram,
		telegramSettingsModule, visibleImagingStudies, mprProjectionCompass, mprAxisGuidance,
	} = settingsAndIntegrations;

	const staffSettingsLogic = useStaffSettingsLogic({
		auth,
		setError: appStore.setError,
		loadDashboard,
		saveClinicProfileIfDirty,
	});
	const migrationQueries = useMigrationQueries({ auth });
	const imagingQueries = useImagingQueries({ auth });
	const communicationsQueries = useCommunicationsQueries({ auth });

	const {
		dashboard, setDashboard, error, setError,
		clinicProfileDraft, setClinicProfileDraft, clinicProfileSaveState, setClinicProfileSaveState,
		clinicProfileDirty, setClinicProfileDirty, uiPreferencesHydrated, setUiPreferencesHydrated,
		uiLanguage, setUiLanguage, pricelistText, setPricelistText,
		pricelistSourceKind, setPricelistSourceKind, usePricelistAi, setUsePricelistAi,
		pricelistAnalysis, setPricelistAnalysis, pricelistImageBase64, setPricelistImageBase64,
		pricelistImageMimeType, setPricelistImageMimeType, pricelistImageName, setPricelistImageName,
		pricelistImageNote, setPricelistImageNote, recognitionKind, setRecognitionKind,
		recognitionTarget, setRecognitionTarget, recognitionText, setRecognitionText,
		importSourceKind, setImportSourceKind, smartImportMode, setSmartImportMode,
		importIntake, setImportIntake, importPreview, setImportPreview,
		importCommit, setImportCommit, ohifBaseUrl, setOhifBaseUrl,
		smartImportPreview, setSmartImportPreview, smartImportCommit, setSmartImportCommit,
		recognitionJob, setRecognitionJob, isPricelistAnalyzing, setIsPricelistAnalyzing,
		communicationSavingTaskId, setCommunicationSavingTaskId, communicationNote, setCommunicationNote,
		newRuleCategory, setNewRuleCategory, newRuleTriggerServiceId, setNewRuleTriggerServiceId,
		newRuleRequiredServiceId, setNewRuleRequiredServiceId, newRuleCompletedServiceId, setNewRuleCompletedServiceId,
		newRuleBlockedServiceId, setNewRuleBlockedServiceId, newRuleWarningText, setNewRuleWarningText,
		newRuleTitle, setNewRuleTitle, newRuleAction, newRuleSeverity,
		newRuleOwnerRole, newRuleSpecialty, newRulePatientText, setNewRulePatientText,
		isClinicalRuleSaving, setIsClinicalRuleSaving, releaseProtectionNote, setReleaseProtectionNote,
		importText, setImportText, smartImportText, setSmartImportText,
		uiPreferencesSyncError, setUiPreferencesSyncError,
	} = appStore;

	const {
		documentPatient, documentPatientMatchesActiveVisit, patientAdministrativeProfileValidationMessage, patientInsightById,
		filteredPatients, savePatientAdministrativeProfile,
	} = patient;

	const {
		selectedImagingStudy,
	} = dicomWorkbenchModule;

	const {
		chairScheduleDirtyIds = [], chairScheduleDrafts = {}, chairScheduleSaveStates = {}, chairScheduleSavingId = null,
		staffScheduleDirtyIds = [], createAppointmentFromDraft = async () => {}, resetNewAppointmentDraft = () => {}, closeAppointmentEditor = () => {},
		openAppointmentEditor = () => {}, openScheduleWarning = () => {}, saveAppointmentSchedule = async () => {}, saveChairSchedule = async () => {},
	} = scheduleLogic.schedule ?? {};

	const {
		recordPayment = async () => {},
	} = finance ?? {};

	const activeQueueRole = selectedWorkspaceRole === "all" ? "doctor" : selectedWorkspaceRole;
	const activeImagingStudies = visibleImagingStudies;
	const canRetryImagingViewerSave = false;
	const imagingViewerSaveTitle: Record<ImagingViewerSaveState, string> = {
		idle: "Сессия просмотра",
		local: "Локальный черновик сохранен",
		saving: "Сохраняю просмотр",
		saved: "Просмотр сохранен",
		queued: isOnline ? "Повтор серверного сохранения в очереди" : "Офлайн-черновик сохранен",
		error: "Сохранение требует проверки",
	};
	const imagingViewerSaveDetail = ["0 разметок", null];
	const imagingPreviewSource = (study: Dashboard["imagingStudies"][number]) => "";
	const imagingViewerHref = (study: Dashboard["imagingStudies"][number]) => "";
	const imagingViewerNoteReady = false;
	const imagingViewerNoteMissingId = "imaging-viewer-note-missing";
	const imagingViewerRetryMissingId = "imaging-viewer-retry-missing";
	const selectedUiLanguageOption = defaultUiLanguageOption;
	const serviceTitle = (serviceId: string) => serviceId;
	const legalMissingFields = dashboard?.clinicSettings?.profile ? clinicLegalMissingFields(dashboard.clinicSettings.profile) : [];
	const legalReadinessPercent = dashboard?.clinicSettings?.profile ? clinicLegalReadinessPercent(dashboard.clinicSettings.profile) : 0;

	const updateClinicProfileDraft = useCallback(<K extends keyof ClinicProfileDraft>(field: K, value: ClinicProfileDraft[K]) => {
		setClinicProfileDraft((prev) => ({ ...prev, [field]: value }));
		setClinicProfileDirty(true);
	}, [setClinicProfileDraft, setClinicProfileDirty]);

	const createImagingStudy = useCallback(async (kind: ImagingStudyKind) => {}, []);
	const attachPricelistImage = useCallback(async (file: File) => {}, []);
	const clearPricelistImage = useCallback(() => {}, []);
	const previewImport = useCallback(async () => {}, []);
	const commitImport = useCallback(async () => {}, []);

	const draft = null;
	const isDraftAccepting = false;
	const isDraftLoading = false;
	const isPendingVisitSyncing = false;
	const isTranscriptPolishing = false;
	const isVisitDictating = false;
	const lastPendingVisitSaveAt = null;
	const lastServerDraftSavedAt = null;
	const lastVisitSaveReceipt = null;
	const localDraftWasRestored = false;
	const pendingVisitSaveCount = 0;
	const serverDraftSyncState = "idle";
	const transcript = "";
	const setTranscript = () => {};
	const clearedTranscriptSnapshot = null;
	const setClearedTranscriptSnapshot = () => {};
	const goToVisitDictation = () => {};
	const handleQuickConsult = () => {};
	const isQuickConsultLoading = false;
	const documentIngestionTarget = "general";
	const setDocumentIngestionTarget = () => {};
	const selectedSpecialty = "";
	const setSelectedSpecialty = () => {};
	const setSelectedProtocolId = () => {};
	const visitToothStateByCode = {};
	const filteredTelegramOutboxItems: any[] = [];
	const visibleTelegramOutboxItems: any[] = [];
	const hiddenTelegramOutboxItemCount = 0;
	const telegramLinkStaffOptions: any[] = [];
	const telegramSubjectName = () => "";

	const appLogicBag: any = {
		...appStore, ...settingsStore, ...imagingStore, ...clinicalSession, ...settingsAndIntegrations,
		...dicomWorkbenchModule, ...documentWorkflow, ...modalOrchestrator, ...staffSettingsLogic,
		...patientIntakeLogic, ...migrationQueries, ...imagingQueries, ...communicationsQueries,
		...scheduleFilterController, ...navigationRouter,
		...patientSelection, ...billingModal, ...scheduleLogic,
	};
	const {
		activeSpeechProviderHealth = null, appendToTranscript = () => {}, appointmentReadinessLabels = {},
		appointmentScheduleDraftFromAppointment = () => null, browserDirectoryPickerAvailable = false, browserImagingScanProgress = null,
		browserMigrationDiscovery = null, browserMigrationScanProgress = null, browserPickedImagingFolder = null, buildDraft = () => null,
		buildOfflineDraft = () => null, clearTranscriptWithUndo = () => {}, clinicPublicLookup = null, ctPlanningActiveQuickActionId = null,
		ctPlanningImplantPlan = null, dicomDiagnosticPixelPolicyLabels = {}, dicomExecutionLaneLabels = {}, dicomFirstFramePreview = null,
		dicomFirstFrameViewerState = null, dicomFolderSeriesScan = null, dicomFolderWorkupPlan = null, dicomGpuClassLabels = {},
		dicomLabel = () => "", dicomLocalFolderDiscovery = null, dicomQualityModeLabels = {}, dicomReadinessCheckLabels = {},
		dicomRenderCachePlan = null, dicomRenderMemoryBudgetClassLabels = {}, dicomRuntimeTierLabels = {}, dicomSeriesPreview = null,
		dicomSeriesViewerLabels = {}, dicomTextureStrategyLabels = {}, dicomViewerLaunchManifest = null, dicomViewerLaunchModeLabels = {},
		dicomViewerToolStateBundle = null, dicomViewerWorkbenchManifest = null, dicomWebCheck = null, dicomWebEndpointUrl = "",
		dicomWebStatusLabels = {}, dicomWorkbenchLocalSavedAt = null, dicomWorkbenchServerBundle = null, dicomWorkstationReadiness = null,
		documentFactoryGroups = [], flushPendingSpeechChunks = async () => {}, flushPendingVisitSaves = async () => {}, hasVisitTranscriptText = false,
		imagingCreateSavingKind = null, imagingFolderPath = "", imagingFolderScan = null, imagingImportCommit = null,
		imagingImportPreview = null, imagingImportSourceKind = "device", imagingImportText = "", imagingKindFilter = "all",
		imagingKindLabels = {}, imagingSourceDetails = {}, imagingSourceLabels = {}, imagingViewerActiveTool = "select",
		imagingViewerAnnotations = [], imagingViewerNote = "", imagingViewerSaveState = "idle", imagingViewerSessionReady = false,
		imagingViewerState = null, imagingViewerToolLabels = {}, importSourceLabels = {}, ingestionTargetLabels = {},
		isBrowserImagingFolderPicking = false, isBrowserMigrationScanning = false, isClinicPublicLookupLoading = false,
		isDicomFirstFramePreviewing = false, isDicomFolderWorkupPlanning = false, isDicomLocalDiscovering = false,
		isDicomManifestBuilding = false, isDicomRenderCachePlanning = false, isDicomSeriesPreviewLoading = false,
		isDicomToolStateBuilding = false, isDicomWebChecking = false, isDicomWorkbenchBuilding = false,
		isDicomWorkbenchReconnecting = false, isDicomWorkbenchServerSaving = false, isDicomWorkstationChecking = false,
		isImagingFolderScanning = false, isImagingImportCommitting = false, isImagingImportLoading = false,
		isImportCommitting = false, isImportDictating = false, isImportLoading = false, isLocalDicomOperationActive = false,
		isLocalImagingOrganizing = false, isMigrationAutopilotLoading = false, isMigrationHandoffReportLoading = false,
		isMigrationSourceDiscovering = false, isMigrationSourceProbeLoading = false, isMigrationSourceWorkupLoading = false,
		isPaymentSaving = false, isRecognitionLoading = false, isServerVoiceRecording = false, isSmartImportCommitting = false,
		isSmartImportLoading = false, isSmartReportLoading = false, isSmartSafeReportLoading = false,
		isTelegramChatLinksLoadingMore = false, isTelegramLinkCodesLoadingMore = false, isTelegramLinkCreating = false,
		isTelegramLoading = false, isTelegramOutboxLoadingMore = false, isTelegramSendingDue = false, isTelegramSettingsSaving = false,
		isVisitNoteDirty = false, localImagingFolderDraft = null, localImagingModelRoleLabels = {}, localImagingOrganizer = null,
		localImagingOrganizerActionLabels = {}, medicalDocumentReleaseChannelLabels = {}, migrationAutopilot = null,
		migrationSourceDiscovery = null, migrationSourceProbe = null, migrationSourceWorkup = null, money = (v: any) => `${v ?? 0} ₽`,
		mprAxisDeg = 0, mprAxisPresetDeg = () => 0, mprCacheModeLabels = {}, mprClinicalPresets = [], mprCrosshairEnabled = false,
		mprLinkedPlanesEnabled = false, mprLoadStrategyLabels = {}, mprProjection = "axial", mprProjectionLabels = {},
		mprResourceTierLabels = {}, mprSeriesRequiredProjectionLabel = () => "", mprSlabMm = 1, mprSlabPresetMm = () => 1,
		mprSliceIndex = 0, mprToolLabels = {}, mprUnavailableProjectionLabel = () => "", mprWindowPreset = "bone",
		mprWindowPresetLabels = {}, mprWorkbenchDraftRestored = false, mprWorkbenchLocalSavedAt = null,
		normalizeOptionalWorkingDaysDraft = (d: any) => d, normalizeUiLanguageInput = (l: any) => l, normalizedAppointmentStatus = (s: any) => s,
		normalizedAppointmentStatusFilter = (f: any) => f, normalizedClinicalRuleAction = (a: any) => a, normalizedClinicalRuleSeverity = (s: any) => s,
		normalizedDentalSpecialty = (s: any) => s, normalizedDocumentIssueSignatureMode = (m: any) => m, normalizedDocumentKind = (k: any) => k,
		normalizedDocumentVoidReasonCode = (c: any) => c, normalizedMedicalDocumentReleaseChannel = (c: any) => c,
		normalizedPatientIntakePregnancyStatus = (p: any) => p, normalizedPaymentRefundCorrectionAction = (a: any) => a,
		normalizedPaymentRefundCorrectionMethod = (m: any) => m, normalizedPostVisitCareTopic = (t: any) => t,
		normalizedProcedureSpecificConsentProcedure = (p: any) => p, normalizedServiceCategory = (c: any) => c, normalizedStaffRole = (r: any) => r,
		normalizedTaxApplicationDeliveryChannel = (d: any) => d, normalizedTaxApplicationForm = (f: any) => f,
		normalizedTaxApplicationRelationshipSelect = (r: any) => r, normalizedTreatmentPlanAcceptanceVariant = (v: any) => v,
		normalizedXrayPregnancyStatus = (p: any) => p, normalizedXrayPriority = (p: any) => p, normalizedXrayStudyType = (t: any) => t,
		onboardingSteps = [], openVisitWarningAction = () => {}, patientInsightRiskLabels = {}, patientIntakePregnancyStatusOptions = [],
		patientName = patientNameHelper, paymentPatientContextMessage = "", paymentPatientContextReady = false, pendingSpeechChunkCount = 0,
		photoVideoMaterialOptions = [], policyAuditEventLabels = {}, polishTranscript = async () => {}, pricelistParserModeLabels = {},
		primaryVisitWarning = null, procedureSpecificConsentProcedureOptions = [], recommendedActionPriorityLabels = {},
		refreshSpeechRuntime = () => {}, roleFocusOrder = [], setCtPlanningActiveQuickActionId = () => {}, setCtPlanningImplantPlan = () => {},
		setDicomFirstFramePreview = () => {}, setDicomFirstFrameViewerState = () => {}, setDicomFolderSeriesScan = () => {},
		setDicomFolderWorkupPlan = () => {}, setDicomLocalFolderDiscovery = () => {}, setDicomRenderCachePlan = () => {},
		setDicomSeriesPreview = () => {}, setDicomViewerLaunchManifest = () => {}, setDicomViewerToolStateBundle = () => {},
		setDicomViewerWorkbenchManifest = () => {}, setDicomWebCheck = () => {}, setDicomWebEndpointUrl = () => {},
		setDicomWorkbenchLocalSavedAt = () => {}, setDicomWorkstationReadiness = () => {}, setImagingFolderPath = () => {},
		setImagingFolderScan = () => {}, setImagingImportCommit = () => {}, setImagingImportPreview = () => {},
		setImagingImportSourceKind = () => {}, setImagingImportText = () => {}, setImagingKindFilter = () => {},
		setImagingViewerActiveTool = () => {}, setImagingViewerNote = () => {}, setImagingViewerState = () => {},
		setLocalImagingOrganizer = () => {}, setMprAxisDeg = () => {}, setMprCrosshairEnabled = () => {},
		setMprLinkedPlanesEnabled = () => {}, setMprProjection = () => {}, setMprSlabMm = () => {}, setMprSliceIndex = () => {},
		setMprWindowPreset = () => {}, setNewRuleAction = () => {}, setNewRuleOwnerRole = () => {}, setNewRuleSeverity = () => {},
		setNewRuleSpecialty = () => {}, setSelectedImagingStudyId = () => {}, setTelegramAdminSecretDraft = () => {},
		setTelegramBotUsernameDraft = () => {}, setTelegramHandoffNotice = () => {}, setTelegramMapsUrlDraft = () => {},
		setTelegramPatientPortalBaseUrlDraft = () => {}, setTelegramPrivacyModeDraft = () => {}, setTelegramReminderLeadTimesDraft = () => {},
		setTelegramReviewRequestDelayDraft = () => {}, setTelegramReviewUrlDraft = () => {}, setTelegramTokenTtlDraft = () => {},
		setTelegramWelcomeImageUrlDraft = () => {}, settingsTabs = [], smartImportModeLabels = {}, speechGatewayCanUpload = false,
		speechGatewayHealthReport = null, speechGatewayStatus = null, speechProviderConnectorLabels = {}, speechProviderHealthById = {},
		speechProviderRuntimeById = {}, speechRecordingRecovery = null, speechRecordingStrategy = "browser", speechStatusNote = "",
		staffScheduleDraftFromWorkingHours = () => null, startImportDictation = () => {}, startVisitDictation = () => {},
		taxApplicationDeliveryChannelOptions = [], taxApplicationFormOptions = [], taxApplicationRelationshipOptions = [],
		telegramAdminSecretDraft = "", telegramAdminSecretSession = "", telegramAllowVoiceIntakeDraft = false, telegramBotConfigId = "",
		telegramBotUsernameDraft = "", telegramChatLinkLedger = [], telegramChatLinks = [], telegramFeaturePlan = null,
		telegramHandoffNotice = "", telegramLinkActionState = null, telegramLinkCode = null, telegramLinkCodeLedger = [],
		telegramLinkCodes = [], telegramLinkStaffId = "", telegramLinkSubjectType = "staff", telegramMapsUrlDraft = "",
		telegramModeDraft = "production", telegramOutbox = [], telegramOutboxStatusFilter = "all", telegramOutboxTemplateFilter = "all",
		telegramOwnBotUsernameDraft = "", telegramPatientPortalBaseUrlDraft = "", telegramPostVisitCheckupDelayDrafts = {},
		telegramPreview = null, telegramPrivacyModeDraft = "standard", telegramPrivacyModeHints = {}, telegramQrSvgToDataUrl = () => "",
		telegramReminderLeadTimesDraft = [], telegramReviewRequestDelayDraft = 0, telegramReviewUrlDraft = "", telegramRevokingLinkId = null,
		telegramSendingItemId = null, telegramSettingsDirty = false, telegramSettingsSaveError = null, telegramSettingsSaveState = "idle",
		telegramStaffEscalationChannelDraft = "", telegramStatus = null, telegramTemplateLabels = {}, telegramTokenTtlDraft = 0,
		telegramVisualCardUrlDrafts = {}, telegramWebhookBaseUrlDraft = "", telegramWelcomeImageUrlDraft = "", uiLanguageOptions = [],
		undoTranscriptClear = () => {}, cbctWorkbenchProjections = [], imagingKindOptions = [],
	} = appLogicBag;

	return {
		...documentWorkflow,
		...dicomWorkbenchModule,
		...telegramSettingsModule,
		...telegram,
		...auth,
		...clinicalVisitLogic,
		...staffSettingsLogic,
		...patientIntakeLogic,
		...migrationQueries,
		...imagingQueries,
		...communicationsQueries,
		...modalOrchestrator,
		...scheduleFilterController,
		...navigationRouter,
		...patientSelection,
		...billingModal,
		...scheduleLogic,
		telegram, soundNotifications, auth, acceptDraftToVisit, activeAppointment, activeChair, activeDoctor, activePatient,
		activeVisitPatient, activePatientCallablePhone, activePatientHasCallablePhone, activePatientInsight, activeQueueRole, activeRolePolicy, activeRoleQueue, activeRoleRestrictedSections,
		activeRoleWritableSections, activeSettingsTabButtonRef, activeSpeechProviderHealth, appendToTranscript, appointmentLabels, appointmentReadinessById, appointmentReadinessLabels, appointmentScheduleDraftFromAppointment,
		browserContinuity, browserDirectoryInputRef, browserDirectoryPickerAvailable, browserImagingScanProgress, browserMigrationDiscovery, browserMigrationInputRef, browserMigrationScanProgress, browserPickedImagingFolder,
		buildDraft, buildOfflineDraft, canRetryImagingViewerSave, chairScheduleDirtyIds, chairScheduleDrafts, chairScheduleSaveStates, chairScheduleSavingId, clampMprAxisDeg,
		clampMprSlabMm, clampMprSliceIndex, clearTranscriptWithUndo, clearedTranscriptSnapshot, clinicModeLabels, clinicProfileDraft, clinicProfileSaveState, clinicPublicLookup,
		clinicalRuleActionLabels, clinicalRuleSeverityLabels, closeAppointmentEditor, communicationChannelLabels, communicationDocumentTaskActionLabels, communicationIntentLabels, communicationNote, communicationPriorityLabels,
		communicationSavingTaskId, communicationStatusLabels, completeCommunicationTask, completedActContractReferenceForUi, continueOnboardingInDraftMode, createAppointmentFromDraft, createClinicalRuleFromSettings, createImagingStudy,
		ctPlanningActiveQuickActionId, ctPlanningImplantPlan, currentOnboardingIndex, currentView, dashboard, defaultDicomFirstFrameViewerState, defaultImagingViewerState, dentalMaterialKindLabels,
		dentalRestorationTypeLabels, describeMprClinicalPresetProjectionFallback, dicomDiagnosticPixelPolicyLabels, dicomExecutionLaneLabels, dicomFirstFramePreview, dicomFirstFrameStatusLabels, dicomFirstFrameViewerState, dicomFolderSeriesScan,
		dicomFolderWorkupPathLabels, dicomFolderWorkupPlan, dicomGpuClassLabels, dicomLabel, dicomLocalFolderDiscovery, dicomQualityModeLabels, dicomReadinessCheckLabels, dicomRenderCachePlan,
		dicomRenderMemoryBudgetClassLabels, dicomRuntimeTierLabels, dicomSeriesPreview, dicomSeriesViewerLabels, dicomTextureStrategyLabels, dicomViewerLaunchManifest, dicomViewerLaunchModeLabels, dicomViewerToolStateBundle,
		dicomViewerWorkbenchManifest, dicomWebCheck, dicomWebEndpointUrl, dicomWebStatusLabels, dicomWorkbenchLocalSavedAt, dicomWorkbenchServerBundle, dicomWorkstationReadiness, dismissOnboarding,
		documentActionLabels, documentDetectedKindLabel, documentFactoryGroups, documentIngestionQualityLabels, documentIngestionTarget, documentIssueSignatureModeLabels, documentLabels, documentPatient,
		documentSourceStatusClassNames, documentStatusLabels, documentVoidReasonLabels, downloadPersistenceExport, draft, editingAppointmentId, error, filteredPatients,
		filteredTelegramOutboxItems, flushPendingSpeechChunks, flushPendingVisitSaves, formatByteSize, formatDateTime, formatMegabytes, formatShortDate, formatSignedMprStep,
		formatTime, fromDateTimeLocalValue, goToVisitDictation, handleQuickConsult, isQuickConsultLoading, hasVisitTranscriptText, hiddenTelegramOutboxItemCount, imagingConnectorCards,
		imagingCreateSavingKind, imagingFolderPath, imagingFolderScan, imagingImportCommit, imagingImportPreview, imagingImportSourceKind, imagingImportText, imagingKindFilter,
		imagingKindLabels, imagingPreviewSource, imagingSourceChoices, imagingSourceDetails, imagingSourceLabels, imagingViewerActiveTool, imagingViewerAnnotations, imagingViewerCapabilities,
		imagingViewerHref, recentPatientViewsVersion, imagingViewerNote, imagingViewerNoteMissingId, imagingViewerNoteReady, imagingViewerRetryMissingId, imagingViewerSaveDetail, imagingViewerSaveState,
		imagingViewerSaveTitle, imagingViewerSessionReady, imagingViewerState, imagingViewerToolLabels, importCommit, importIntake, importPreview, importSourceKind,
		importSourceLabels, importText, ingestionTargetLabels, integrationCapabilityLabels, integrationCategoryLabels, integrationStatusLabels, isBrowserImagingFolderPicking, isBrowserMigrationScanning,
		isClinicPublicLookupLoading, isClinicalRuleSaving, isDicomFirstFramePreviewing, isDicomFolderWorkupPlanning, isDicomLocalDiscovering, isDicomManifestBuilding, isDicomRenderCachePlanning, isDicomSeriesPreviewLoading,
		isDicomToolStateBuilding, isDicomWebChecking, isDicomWorkbenchBuilding, isDicomWorkbenchReconnecting, isDicomWorkbenchServerSaving, isDicomWorkstationChecking, isDraftAccepting, isDraftLoading,
		isImagingFolderScanning, isImagingImportCommitting, isImagingImportLoading, isImportCommitting, isImportDictating, isImportLoading, isLocalDicomOperationActive, isLocalImagingOrganizing,
		isMigrationAutopilotLoading, isMigrationHandoffReportLoading, isMigrationSourceDiscovering, isMigrationSourceProbeLoading, isMigrationSourceWorkupLoading, isOnline, isPaymentSaving, isPendingVisitSyncing,
		isPersistenceExporting, isPricelistAnalyzing, isRecognitionLoading, isServerVoiceRecording, isSmartImportCommitting, isSmartImportLoading, isSmartReportLoading, isSmartSafeReportLoading,
		isTelegramChatLinksLoadingMore, isTelegramLinkCodesLoadingMore, isTelegramLinkCreating, isTelegramLoading, isTelegramOutboxItemDueForUi, isTelegramOutboxLoadingMore, isTelegramSendingDue, isTelegramSettingsSaving,
		isTranscriptPolishing, isVisitDictating, isVisitNoteDirty, lastLocalSavedAt, lastPendingVisitSaveAt, lastServerDraftSavedAt, lastVisitSaveReceipt, legalMissingFields,
		legalReadinessPercent, loadLocalBridgeUsePlans, loadPersistenceHealth, loadPersistenceIntegrity, localBridgeReadiness, localBridgeStatusLabels, localBridgeUsePathLabels, localBridgeUsePlans,
		localDraftWasRestored, localImagingFolderDraft, localImagingModelRoleLabels, localImagingOrganizer, localImagingOrganizerActionLabels, medicalDocumentReleaseChannelLabels, migrationAutopilot, migrationSourceDiscovery,
		migrationSourceProbe, migrationSourceWorkup, money, moveOnboardingTo, mprAxisBounds, mprAxisDeg, mprAxisNudgeDeg, mprAxisPresetDeg,
		mprCacheModeLabels, mprClinicalPresets, mprCrosshairEnabled, mprLinkedPlanesEnabled, mprLoadStrategyLabels, mprProjection, mprProjectionLabels, mprResourceTierLabels,
		mprSeriesRequiredProjectionLabel, mprSlabBounds, mprSlabMm, mprSlabNudgeMm, mprSlabPresetMm, mprSliceIndex, mprSliceIndexFromFraction, mprSliceNudgeSteps,
		mprSlicePresetFractions, mprToolLabels, mprUnavailableProjectionLabel, mprWindowPreset, mprWindowPresetLabels, mprWorkbenchDraftRestored, mprWorkbenchLocalSavedAt, newAppointmentError,
		newChairHasMicroscope, newChairHasSurgeryKit, newChairHasXraySensor, newChairName, newRuleAction, newRuleBlockedServiceId, newRuleCategory, newRuleCompletedServiceId,
		newRuleOwnerRole, newRuleRequiredServiceId, newRuleSeverity, newRuleSpecialty, newRuleTitle, newRuleTriggerServiceId, newRuleWarningText, newStaffName,
		newStaffRole, newStaffSpecialty, nextOnboardingStep, normalizeOptionalWorkingDaysDraft, normalizeUiLanguageInput, normalizedAppointmentStatus, normalizedAppointmentStatusFilter, normalizedClinicalRuleAction,
		normalizedClinicalRuleSeverity, normalizedDentalSpecialty, normalizedDocumentIssueSignatureMode, normalizedDocumentKind, normalizedDocumentVoidReasonCode, normalizedMedicalDocumentReleaseChannel, normalizedPatientIntakePregnancyStatus, normalizedPaymentRefundCorrectionAction,
		normalizedPaymentRefundCorrectionMethod, normalizedPostVisitCareTopic, normalizedProcedureSpecificConsentProcedure, normalizedServiceCategory, normalizedStaffRole, normalizedTaxApplicationDeliveryChannel, normalizedTaxApplicationForm, normalizedTaxApplicationRelationshipSelect,
		normalizedTelegramBotMode, normalizedTelegramLinkSubjectType, normalizedTelegramOutboxStatusFilter, normalizedTelegramOutboxTemplateFilter, normalizedTelegramPrivacyMode, normalizedTreatmentPlanAcceptanceVariant, normalizedXrayPregnancyStatus, normalizedXrayPriority,
		normalizedXrayStudyType, ohifBaseUrl, onboardingBlockingIssues, onboardingChairCreateGuidanceId, onboardingDismissed, onboardingDocumentReadinessIssues, onboardingDocumentsReady, onboardingDraftMode,
		onboardingFinishGuidanceId, onboardingReadyToFinish, onboardingStaffCreateGuidanceId, onboardingStep, onboardingSteps, onboardingTelegramRecommendations, onboardingTelegramVisualCardKeys, openAppointmentEditor,
		openOnboardingGuide, openScheduleWarning, openVisitWarningAction, patientAdministrativeProfileValidationMessage, patientInsightById, patientInsightRiskLabels, patientIntakePregnancyStatusOptions, patientName,
		paymentAmount, paymentMutationIdRef, paymentFeedback, paymentFiscalCashierName, paymentFiscalFd, paymentFiscalFn, paymentFiscalFpd, paymentFiscalReceiptIssuedAt,
		paymentFiscalReceiptLabelForUi, paymentFiscalReceiptNumber, paymentFiscalReceiptUrl, paymentMethod, paymentMethodLabels, paymentPatientContextMessage, paymentPatientContextReady, paymentPayerBirthDate,
		paymentPayerFullName, paymentPayerIdentityDocument, paymentPayerInn, paymentPayerRelationship, paymentTaxDeductionCode, pendingSpeechChunkCount, pendingVisitSaveCount, persistenceHealth,
		persistenceIntegrity, photoVideoMaterialOptions, policyAuditEventLabels, polishTranscript, postVisitCareTopicOptions, previousOnboardingStep, pricelistAnalysis, pricelistImageBase64,
		pricelistImageName, pricelistImageNote, pricelistItemMaterialText, pricelistMaterialSummaryText, pricelistParserModeLabels, pricelistRecognitionBrandGroups, pricelistRecognitionServiceGroups, pricelistSourceKind,
		pricelistSourceKindLabels, pricelistText, pricelistWarningsText, primaryVisitWarning, procedureSpecificConsentProcedureOptions, query, recognitionJob, recognitionKind,
		recognitionPresets, recognitionTarget, recognitionTargetLabels, recognitionText, recommendedActionPriorityLabels, recordPayment, refreshBrowserContinuity, refreshSpeechRuntime,
		releaseProtectionNote, reopenOnboarding, requestBrowserStoragePersistence, resetNewAppointmentDraft, roleFocusOrder, saveAppointmentSchedule, saveChairSchedule, saveClinicProfileFromDraft,
		savePatientAdministrativeProfile, savePatientCore, createPatient, saveStaffSchedule, scenarioPriorityLabels, scenarioStrategyLabels, scheduleAdminSecretDraft, scheduleAdminSecretSession,
		scrollToVisitArea, selectedImagingStudy, selectedPatient, selectedSpecialty, selectedUiLanguageOption, selectedWorkspaceRole, serverDraftSyncState, serviceCategoryLabels,
		serviceTitle, setClearedTranscriptSnapshot, setCommunicationNote, setCtPlanningActiveQuickActionId, setCtPlanningImplantPlan, setCurrentView, setDicomFirstFramePreview, setDicomFirstFrameViewerState,
		setDicomFolderSeriesScan, setDicomFolderWorkupPlan, setDicomLocalFolderDiscovery, setDicomRenderCachePlan, setDicomSeriesPreview, setDicomViewerLaunchManifest, setDicomViewerToolStateBundle, setDicomViewerWorkbenchManifest,
		setDicomWebCheck, setDicomWebEndpointUrl, setDicomWorkbenchLocalSavedAt, setDicomWorkstationReadiness, setDocumentIngestionTarget, setError, setImagingFolderPath, setImagingFolderScan,
		setImagingImportCommit, setImagingImportPreview, setImagingImportSourceKind, setImagingImportText, setImagingKindFilter, setImagingViewerActiveTool, setImagingViewerNote, setImagingViewerState,
		setImportCommit, setImportIntake, setImportPreview, setImportSourceKind, setImportText, setLocalImagingOrganizer, setMprAxisDeg, setMprCrosshairEnabled,
		setMprLinkedPlanesEnabled, setMprProjection, setMprSlabMm, setMprSliceIndex, setMprWindowPreset, setNewChairHasMicroscope, setNewChairHasSurgeryKit, setNewChairHasXraySensor,
		setNewChairName, setNewRuleAction, setNewRuleBlockedServiceId, setNewRuleCategory, setNewRuleCompletedServiceId, setNewRuleOwnerRole, setNewRuleRequiredServiceId, setNewRuleSeverity,
		setNewRuleSpecialty, setNewRuleTitle, setNewRuleTriggerServiceId, setNewRuleWarningText, setNewStaffName, setNewStaffRole, setNewStaffSpecialty, setOhifBaseUrl,
		setPaymentAmount, setPaymentFiscalCashierName, setPaymentFiscalFd, setPaymentFiscalFn, setPaymentFiscalFpd, setPaymentFiscalReceiptIssuedAt, setPaymentFiscalReceiptNumber, setPaymentFiscalReceiptUrl,
		setPaymentMethod, setPaymentPayerBirthDate, setPaymentPayerFullName, setPaymentPayerIdentityDocument, setPaymentPayerInn, setPaymentPayerRelationship, setPaymentTaxDeductionCode, setPaymentFeedback,
		setPricelistAnalysis, setPricelistSourceKind, setPricelistText, setQuery, setRecognitionJob, setRecognitionText, setReleaseProtectionNote, setSelectedImagingStudyId,
		setSelectedProtocolId, setSelectedSpecialty, setSelectedWorkspaceRole, setSettingsAdminSecretDraft, setSettingsTab, setSmartImportCommit, setSmartImportMode, setSmartImportPreview,
		setSmartImportText, setTelegramAdminSecretDraft, setTelegramBotUsernameDraft, setTelegramHandoffNotice, setTelegramMapsUrlDraft, setTelegramPatientPortalBaseUrlDraft, setTelegramPrivacyModeDraft, setTelegramReminderLeadTimesDraft,
		setTelegramReviewRequestDelayDraft, setTelegramReviewUrlDraft, setTelegramTokenTtlDraft, setTelegramWelcomeImageUrlDraft, setTranscript, setUiLanguage, setUiPreferencesSyncError, setUsePricelistAi,
		settingsAdminSecretDraft, settingsAdminSecretSession, settingsTab, settingsTabs, showAdministrationTopActions, showDoctorVisitShortcut, isDoctorShiftCockpitOpen, openDoctorShiftCockpit,
		closeDoctorShiftCockpit, toggleDoctorShiftCockpit, showFullOnboardingGuide, smartImportCommit, smartImportMode, smartImportModeLabels, smartImportPreview, smartImportText,
		sortedAppointments, specialtyLabels, speechGatewayCanUpload, speechGatewayHealthReport, speechGatewayStatus, speechProviderConnectorLabels, speechProviderHealthById, speechProviderHealthLabels,
		speechProviderModeLabels, speechProviderRuntimeById, speechProviderSelectionLabels, speechProviderStatusLabels, speechRecordingPathLabels, speechRecordingRecovery, speechRecordingStrategy, speechRecoveryStateLabels,
		speechStatusNote, staffRoleLabels, staffScheduleDirtyIds, staffScheduleDraftFromWorkingHours, staffScheduleDrafts, staffScheduleSaveStates, staffScheduleSavingId, startImportDictation,
		startVisitDictation, structuredPayloadDocumentKinds, taxApplicationDeliveryChannelOptions, taxApplicationFormOptions, taxApplicationRelationshipOptions, telegramAdminSecretDraft, telegramAdminSecretSession, telegramAllowVoiceIntakeDraft,
		telegramBotConfigId, telegramBotUsernameDraft, telegramChatLinkLedger, telegramChatLinks, telegramClassificationLabels, telegramDeliveryStatusLabels, telegramFeatureHelp, telegramFeatureOptions,
		telegramFeaturePlan, telegramHandoffNotice, telegramHumanMessage, telegramInlineButtonKindLabels, telegramInlineButtonRowsFromReplyMarkup, telegramLinkActionState, telegramLinkCode, telegramLinkCodeLedger,
		telegramLinkCodeStatusLabels, telegramLinkCodes, telegramLinkStaffId, telegramLinkStaffOptions, telegramLinkSubjectType, telegramMapsUrlDraft, telegramModeDraft, telegramModeHints,
		telegramModeLabels, telegramOutbox, telegramOutboxStatusFilter, telegramOutboxStatusFilterLabels, telegramOutboxStatusFilterOptions, telegramOutboxTemplateFilter, telegramOutboxTemplateFilterLabels, telegramOutboxTemplateFilterOptions,
		telegramOwnBotUsernameDraft, telegramPatientPortalBaseUrlDraft, telegramPostVisitCheckupDelayDrafts, telegramPostVisitCheckupDelayFields, telegramPreview, telegramPrivacyModeDraft, telegramPrivacyModeHints, telegramPrivacyModeLabels,
		telegramQrSvgToDataUrl, telegramReminderLeadTimesDraft, telegramReviewRequestDelayDraft, telegramReviewUrlDraft, telegramRevokingLinkId, telegramSendingItemId, telegramSettingsDirty, telegramSettingsSaveError,
		telegramSettingsSaveState, telegramStaffEscalationChannelDraft, telegramStatus, telegramSubjectName, telegramTemplateLabels, telegramTokenTtlDraft, telegramVisualCardFields, telegramVisualCardUrlDrafts,
		telegramWebhookBaseUrlDraft, telegramWelcomeImageUrlDraft, toDateTimeLocalValue, toggleChairWorkingDay, toggleClinicWorkingDay, toggleStaffWorkingDay, toothRows, toothStateByCode: visitToothStateByCode,
		setToothState, transcript, treatmentStatusLabels, uiLanguage, uiLanguageOptions, uiPreferencesSyncError, soundNotificationsMuted, setSoundNotificationsMuted,
		testOnlineBookingSound: soundNotifications.testOnlineBookingSound, testSlotEndSound: soundNotifications.testSlotEndSound, undoTranscriptClear, updateAppointmentScheduleDraft, updateChairScheduleDay, updateChairScheduleDraft, updateClinicProfileDraft, updateNewAppointmentDraft,
		updatePatientAdministrativeProfileDraft, updatePatientCoreDraft, updateStaffScheduleDay, updateStaffScheduleDraft, updateVisitNoteField, usePricelistAi, viewLabels, visibleRecommendedActions,
		visibleScheduleSuggestions, visibleTelegramOutboxItems, visitCloseChecklist, visitDraftBuildMissingSteps, visitDraftMissingFieldLabel, visitDraftQualityLabels, visitDraftReadyToBuild, visitDraftSignalLabel,
		visitDraftUserEditedRef, visitNoteAcceptMissingSteps, visitNoteActionLabel, visitNoteFieldDefinitions, visitNoteForm, visitNoteReadyToAccept, visitNoteStatusLabel, visitSaveReceiptText,
		visitWarnings, warningSeverityLabels, weekdayOptions, workspaceScopeLabels, xrayPregnancyStatusOptions, xrayStudyTypeOptions, accessUnlockRequired, accessUnlockMessage,
		clinicalAdminSecretDraft, setClinicalAdminSecretDraft, loadDashboard, operatorWorkflowFailureMessage, previewImport, commitImport,
		activeCommunicationTasks: null,
		activeImagingStudies, activePayments, activeTreatmentPlanItems,
		addImagingViewerNoteAnnotation: null,
		address: documentPatient?.administrativeProfile?.registrationAddress ?? "",
		analyzePricelist,
		applyCtPlanningQuickAction: null,
		applyMprClinicalPreset: null,
		applyNearestMprClinicalPreset: null,
		applyProtocolTemplate: null,
		applyProtocolTemplateDirectly: null,
		assembleSpeechRecording: async () => {},
		attachPricelistImage,
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
		cbctWorkbenchProjections,
		cbctWorkbenchTools: null,
		chooseRecognitionPreset: null,
		clearBrowserPickedImagingFolderPreview: null,
		clearLocalImagingFolderRecovery: null,
		clearPricelistImage,
		clinic: dashboard?.clinicSettings?.profile ?? null,
		clinicalMutationHeaders: auth.denteClinicalMutationHeaders,
		clinicalReadHeaders: auth.denteClinicalReadHeaders,
		clinicName: dashboard?.clinicSettings?.profile?.clinicName ?? "",
		createCtPlanningArtifact: null,
		ctPlanningAnnotationRefs: [],
		dictationQuickPhrases: null,
		emptyDictationVoiceActionLabel: null,
		firstName: documentPatient?.fullName?.split(" ")[1] ?? "",
		handleMprKeyboardNavigation: async (..._args: any[]) => {},
		imagingComparisonCandidates: [],
		imagingKindOptions,
		imagingViewerImageStyle: null,
		inn: documentPatient?.administrativeProfile?.taxpayerInn ?? "",
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
		mprAxisGuidance,
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
		mprProjectionCompass,
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
		selectedPaymentReceiptTotalRub: 0,
		selectedProtocolTemplate: null,
		selectedTaxPaymentTotalRub: 0,
		setNewRulePatientText: setNewRulePatientText,
		setSelectedPatientId: setSelectedPatientId,
		shiftWarnings: null,
		sortedCommunicationTasks: (dashboard?.communicationTasks ?? []).slice().sort((a, b) => {
			const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
			const pA = priorityOrder[a.priority] ?? 2;
			const pB = priorityOrder[b.priority] ?? 2;
			if (pA !== pB) return pA - pB;
			return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
		}),
		specialtiesWithTemplates: [],
		specialtyProtocolTemplates: [],
		speechGatewayActiveProviderIsLocal: null,
		speechLiveRms: 0,
		speechRecognitionReady: null,
		speechTranscriptionBusy: false,
		startServerVoiceRecording: null,
		stopServerVoiceRecording: null,
		visibleImagingStudies,
		visibleVisitSpecialtyFocusOptions: [],
		visitPrimaryAction: null,
		visitSafetyCards: [],
		visitWorkflowSteps: [],
	};
}

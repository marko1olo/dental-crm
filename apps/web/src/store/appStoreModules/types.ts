import type {
	AiJobKind,
	AiRecognitionJob,
	AiRecognitionTarget,
	ClinicalRuleAction,
	ClinicalRuleSeverity,
	ClinicPublicLookupResponse,
	Dashboard,
	DentalPricelistAnalysisResponse,
	DentalSpecialty,
	ImportCommitResponse,
	ImportIntakeResponse,
	ImportPreviewResponse,
	ImportSourceKind,
	LocalBridgeReadinessResponse,
	LocalBridgeUsePlansResponse,
	MigrationAutopilotResponse,
	MigrationLocalSourceDiscoveryResponse,
	MigrationLocalSourceProbeResponse,
	MigrationLocalSourceWorkupResponse,
	OdontogramViewMode,
	PricelistSourceKind,
	ServiceCategory,
	SmartImportCommitResponse,
	SmartImportMode,
	SmartImportPreviewResponse,
	SpeechGatewayHealthReport,
	SpeechGatewayStatus,
	SpeechProviderRuntimeStatus,
	SpeechRecordingRecoveryList,
	SpeechRecordingStrategy,
	StaffRole,
	UiLanguage,
} from "@dental/shared";
import type { StateCreator } from "zustand";
import type {
	BrowserMigrationScanProgress,
	ClinicProfileDraft,
	ClinicProfileSaveState,
	PersistenceHealth,
	PersistenceIntegrityReport,
	PricelistImageMimeType,
} from "../../AppHelpers";
import type { BrowserContinuityStatus } from "../../browserContinuity";
import type { AppView, SettingsTab } from "../../utils/routeUtils";

export interface NavigationAndThemeSlice {
	odontogramUseSurfaces: boolean;
	setOdontogramUseSurfaces: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	odontogramViewMode: OdontogramViewMode;
	setOdontogramViewMode: (
		val: OdontogramViewMode | ((prev: OdontogramViewMode) => OdontogramViewMode),
	) => void;
	uiPreferencesHydrated: boolean;
	setUiPreferencesHydrated: (val: boolean) => void;
	uiLanguage: UiLanguage;
	setUiLanguage: (val: UiLanguage) => void;
	clinicProfileDraft: ClinicProfileDraft;
	setClinicProfileDraft: (
		val: ClinicProfileDraft | ((prev: ClinicProfileDraft) => ClinicProfileDraft),
	) => void;
	clinicProfileSaveState: ClinicProfileSaveState;
	setClinicProfileSaveState: (val: ClinicProfileSaveState) => void;
	clinicProfileDirty: boolean;
	setClinicProfileDirty: (val: boolean) => void;
	currentView: AppView;
	setCurrentView: (val: AppView | ((prev: AppView) => AppView)) => void;
	settingsTab: SettingsTab | string;
	setSettingsTab: (
		val: SettingsTab | string | ((prev: string) => string),
	) => void;
	selectedWorkspaceRole: StaffRole;
	setSelectedWorkspaceRole: (val: StaffRole) => void;
	newStaffName: string;
	setNewStaffName: (val: string) => void;
	newStaffRole: StaffRole;
	setNewStaffRole: (val: StaffRole) => void;
	newStaffSpecialty: DentalSpecialty | string;
	setNewStaffSpecialty: (val: DentalSpecialty | string) => void;
	newChairName: string;
	setNewChairName: (val: string) => void;
	newChairHasXraySensor: boolean;
	setNewChairHasXraySensor: (val: boolean) => void;
	newChairHasMicroscope: boolean;
	setNewChairHasMicroscope: (val: boolean) => void;
	newChairHasSurgeryKit: boolean;
	setNewChairHasSurgeryKit: (val: boolean) => void;
	newRuleTitle: string;
	setNewRuleTitle: (val: string) => void;
	newRuleAction: ClinicalRuleAction;
	setNewRuleAction: (val: ClinicalRuleAction) => void;
	newRuleSeverity: ClinicalRuleSeverity;
	setNewRuleSeverity: (val: ClinicalRuleSeverity) => void;
	newRuleOwnerRole: StaffRole;
	setNewRuleOwnerRole: (val: StaffRole) => void;
	newRuleSpecialty: DentalSpecialty;
	setNewRuleSpecialty: (val: DentalSpecialty) => void;
	newRuleCategory: ServiceCategory;
	setNewRuleCategory: (val: ServiceCategory) => void;
	newRuleTriggerServiceId: string;
	setNewRuleTriggerServiceId: (val: string) => void;
	newRuleRequiredServiceId: string;
	setNewRuleRequiredServiceId: (val: string) => void;
	newRuleCompletedServiceId: string;
	setNewRuleCompletedServiceId: (val: string) => void;
	newRuleBlockedServiceId: string;
	setNewRuleBlockedServiceId: (val: string) => void;
	newRuleWarningText: string;
	setNewRuleWarningText: (val: string) => void;
	newRulePatientText: string;
	setNewRulePatientText: (val: string) => void;
	ohifBaseUrl: string;
	setOhifBaseUrl: (val: string) => void;
}

export interface ModalsAndSelectionSlice {
	isOmnibarOpen: boolean;
	setOmnibarOpen: (val: boolean) => void;
	isShortcutsModalOpen: boolean;
	setShortcutsModalOpen: (val: boolean) => void;
	isHelpDrawerOpen: boolean;
	setHelpDrawerOpen: (val: boolean) => void;
	activeHelpDrawerTab: string;
	setActiveHelpDrawerTab: (val: string) => void;
	dashboard: Dashboard | null;
	setDashboard: (
		val: Dashboard | null | ((current: Dashboard | null) => Dashboard | null),
	) => void;
	accessUnlockRequired: boolean;
	setAccessUnlockRequired: (val: boolean) => void;
	accessUnlockMessage: string;
	setAccessUnlockMessage: (val: string) => void;
	query: string;
	setQuery: (val: string) => void;
	editingAppointmentId: string | null;
	setEditingAppointmentId: (val: string | null) => void;
	newAppointmentError: string | null;
	setNewAppointmentError: (val: string | null) => void;
	importText: string;
	setImportText: (val: string | ((prev: string) => string)) => void;
	smartImportText: string;
	setSmartImportText: (val: string) => void;
	pricelistText: string;
	setPricelistText: (val: string) => void;
	pricelistSourceKind: PricelistSourceKind;
	setPricelistSourceKind: (val: PricelistSourceKind) => void;
	usePricelistAi: boolean;
	setUsePricelistAi: (val: boolean) => void;
	pricelistAnalysis: DentalPricelistAnalysisResponse | null;
	setPricelistAnalysis: (val: DentalPricelistAnalysisResponse | null) => void;
	pricelistImageBase64: string | null;
	setPricelistImageBase64: (val: string | null) => void;
	pricelistImageMimeType: PricelistImageMimeType | null;
	setPricelistImageMimeType: (val: PricelistImageMimeType | null) => void;
	pricelistImageName: string | null;
	setPricelistImageName: (val: string | null) => void;
	pricelistImageNote: string | null;
	setPricelistImageNote: (val: string | null) => void;
	recognitionKind: AiJobKind;
	setRecognitionKind: (val: AiJobKind) => void;
	recognitionTarget: AiRecognitionTarget;
	setRecognitionTarget: (val: AiRecognitionTarget) => void;
	recognitionText: string;
	setRecognitionText: (val: string) => void;
	importSourceKind: ImportSourceKind;
	setImportSourceKind: (val: ImportSourceKind) => void;
	smartImportMode: SmartImportMode;
	setSmartImportMode: (val: SmartImportMode) => void;
	browserMigrationDiscovery: MigrationLocalSourceDiscoveryResponse | null;
	setBrowserMigrationDiscovery: (
		val: MigrationLocalSourceDiscoveryResponse | null,
	) => void;
	browserMigrationScanProgress: BrowserMigrationScanProgress | null;
	setBrowserMigrationScanProgress: (
		val: BrowserMigrationScanProgress | null,
	) => void;
	importIntake: ImportIntakeResponse | null;
	setImportIntake: (val: ImportIntakeResponse | null) => void;
	importPreview: ImportPreviewResponse | null;
	setImportPreview: (val: ImportPreviewResponse | null) => void;
	importCommit: ImportCommitResponse | null;
	setImportCommit: (val: ImportCommitResponse | null) => void;
	migrationAutopilot: MigrationAutopilotResponse | null;
	setMigrationAutopilot: (val: MigrationAutopilotResponse | null) => void;
	migrationSourceDiscovery: MigrationLocalSourceDiscoveryResponse | null;
	setMigrationSourceDiscovery: (
		val: MigrationLocalSourceDiscoveryResponse | null,
	) => void;
	migrationSourceWorkup: MigrationLocalSourceWorkupResponse | null;
	setMigrationSourceWorkup: (
		val: MigrationLocalSourceWorkupResponse | null,
	) => void;
	migrationSourceProbe: MigrationLocalSourceProbeResponse | null;
	setMigrationSourceProbe: (
		val: MigrationLocalSourceProbeResponse | null,
	) => void;
	clinicPublicLookup: ClinicPublicLookupResponse | null;
	setClinicPublicLookup: (val: ClinicPublicLookupResponse | null) => void;
	smartImportPreview: SmartImportPreviewResponse | null;
	setSmartImportPreview: (val: SmartImportPreviewResponse | null) => void;
	smartImportCommit: SmartImportCommitResponse | null;
	setSmartImportCommit: (val: SmartImportCommitResponse | null) => void;
	recognitionJob: AiRecognitionJob | null;
	setRecognitionJob: (val: AiRecognitionJob | null) => void;
	activeTooth: number | string | null;
	setActiveTooth: (
		val:
			| number
			| string
			| null
			| ((prev: number | string | null) => number | string | null),
	) => void;
	activeDoctorName: string | null;
	setActiveDoctorName: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	activePatientId: string | null;
	setActivePatientId: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
}

export interface NotificationsAndSyncSlice {
	releaseProtectionNote: string;
	setReleaseProtectionNote: (val: string) => void;
	communicationNote: string;
	setCommunicationNote: (val: string) => void;
	localAutosaveReady: boolean;
	setLocalAutosaveReady: (val: boolean) => void;
	lastLocalSavedAt: string | null;
	setLastLocalSavedAt: (val: string | null) => void;
	isOnline: boolean;
	setIsOnline: (val: boolean | ((prev: boolean) => boolean)) => void;
	speechGatewayStatus: SpeechGatewayStatus | null;
	setSpeechGatewayStatus: (val: SpeechGatewayStatus | null) => void;
	speechGatewayHealthReport: SpeechGatewayHealthReport | null;
	setSpeechGatewayHealthReport: (
		val: SpeechGatewayHealthReport | null,
	) => void;
	speechProviderRuntimeStatuses: SpeechProviderRuntimeStatus[];
	setSpeechProviderRuntimeStatuses: (
		val: SpeechProviderRuntimeStatus[],
	) => void;
	speechRecordingStrategy: SpeechRecordingStrategy | null;
	setSpeechRecordingStrategy: (val: SpeechRecordingStrategy | null) => void;
	speechRecordingRecovery: SpeechRecordingRecoveryList | null;
	setSpeechRecordingRecovery: (
		val: SpeechRecordingRecoveryList | null,
	) => void;
	pendingSpeechChunkCount: number;
	setPendingSpeechChunkCount: (
		val: number | ((prev: number) => number),
	) => void;
	speechStatusNote: string | null;
	setSpeechStatusNote: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	browserContinuity: BrowserContinuityStatus | null;
	setBrowserContinuity: (val: BrowserContinuityStatus | null) => void;
	localBridgeReadiness: LocalBridgeReadinessResponse | null;
	setLocalBridgeReadiness: (val: LocalBridgeReadinessResponse | null) => void;
	localBridgeUsePlans: LocalBridgeUsePlansResponse | null;
	setLocalBridgeUsePlans: (val: LocalBridgeUsePlansResponse | null) => void;
	isImportDictating: boolean;
	setIsImportDictating: (val: boolean) => void;
	isImportLoading: boolean;
	setIsImportLoading: (val: boolean) => void;
	isImportCommitting: boolean;
	setIsImportCommitting: (val: boolean) => void;
	isMigrationAutopilotLoading: boolean;
	setIsMigrationAutopilotLoading: (val: boolean) => void;
	isMigrationHandoffReportLoading: boolean;
	setIsMigrationHandoffReportLoading: (val: boolean) => void;
	isMigrationSourceDiscovering: boolean;
	setIsMigrationSourceDiscovering: (val: boolean) => void;
	isMigrationSourceWorkupLoading: boolean;
	setIsMigrationSourceWorkupLoading: (val: boolean) => void;
	isMigrationSourceProbeLoading: boolean;
	setIsMigrationSourceProbeLoading: (val: boolean) => void;
	isClinicPublicLookupLoading: boolean;
	setIsClinicPublicLookupLoading: (val: boolean) => void;
	isBrowserMigrationScanning: boolean;
	setIsBrowserMigrationScanning: (val: boolean) => void;
	isSmartImportLoading: boolean;
	setIsSmartImportLoading: (val: boolean) => void;
	isSmartImportCommitting: boolean;
	setIsSmartImportCommitting: (val: boolean) => void;
	isSmartReportLoading: boolean;
	setIsSmartReportLoading: (val: boolean) => void;
	isSmartSafeReportLoading: boolean;
	setIsSmartSafeReportLoading: (val: boolean) => void;
	isRecognitionLoading: boolean;
	setIsRecognitionLoading: (val: boolean) => void;
	isPricelistAnalyzing: boolean;
	setIsPricelistAnalyzing: (val: boolean) => void;
	isServerVoiceRecording: boolean;
	setIsServerVoiceRecording: (val: boolean) => void;
	isPaymentSaving: boolean;
	setIsPaymentSaving: (val: boolean) => void;
	communicationSavingTaskId: string | null;
	setCommunicationSavingTaskId: (val: string | null) => void;
	isClinicalRuleSaving: boolean;
	setIsClinicalRuleSaving: (val: boolean) => void;
	persistenceHealth: PersistenceHealth | null;
	setPersistenceHealth: (val: PersistenceHealth | null) => void;
	persistenceIntegrity: PersistenceIntegrityReport | null;
	setPersistenceIntegrity: (val: PersistenceIntegrityReport | null) => void;
	isPersistenceExporting: boolean;
	setIsPersistenceExporting: (val: boolean) => void;
	isTelegramLoading: boolean;
	setIsTelegramLoading: (val: boolean) => void;
	isTelegramLinkCreating: boolean;
	setIsTelegramLinkCreating: (val: boolean) => void;
	isTelegramSettingsSaving: boolean;
	setIsTelegramSettingsSaving: (val: boolean) => void;
	isTelegramSendingDue: boolean;
	setIsTelegramSendingDue: (val: boolean) => void;
	isTelegramOutboxLoadingMore: boolean;
	setIsTelegramOutboxLoadingMore: (val: boolean) => void;
	isTelegramLinkCodesLoadingMore: boolean;
	setIsTelegramLinkCodesLoadingMore: (val: boolean) => void;
	isTelegramChatLinksLoadingMore: boolean;
	setIsTelegramChatLinksLoadingMore: (val: boolean) => void;
	error: string | null;
	setError: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	uiPreferencesSyncError: string | null;
	setUiPreferencesSyncError: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
}

export interface AppStore
	extends NavigationAndThemeSlice,
		ModalsAndSelectionSlice,
		NotificationsAndSyncSlice {}

export type AppState = AppStore;

export type AppSliceCreator<T> = StateCreator<AppStore, [], [], T>;

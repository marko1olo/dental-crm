import type { Dashboard, OdontogramViewMode } from "@dental/shared";
import type { StateCreator } from "zustand";

export interface NavigationAndThemeSlice {
	odontogramUseSurfaces: boolean;
	setOdontogramUseSurfaces: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	odontogramViewMode: OdontogramViewMode;
	setOdontogramViewMode: (
		val: OdontogramViewMode | ((prev: OdontogramViewMode) => OdontogramViewMode),
	) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	uiPreferencesHydrated: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setUiPreferencesHydrated: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	uiLanguage: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setUiLanguage: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	clinicProfileDraft: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setClinicProfileDraft: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	clinicProfileSaveState: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setClinicProfileSaveState: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	clinicProfileDirty: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setClinicProfileDirty: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	currentView: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setCurrentView: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	settingsTab: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setSettingsTab: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	selectedWorkspaceRole: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setSelectedWorkspaceRole: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	newStaffName: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setNewStaffName: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	newStaffRole: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setNewStaffRole: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	newStaffSpecialty: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setNewStaffSpecialty: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	newChairName: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setNewChairName: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	newChairHasXraySensor: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setNewChairHasXraySensor: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	newChairHasMicroscope: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setNewChairHasMicroscope: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	newChairHasSurgeryKit: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setNewChairHasSurgeryKit: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	newRuleTitle: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setNewRuleTitle: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	newRuleAction: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setNewRuleAction: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	newRuleSeverity: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setNewRuleSeverity: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	newRuleOwnerRole: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setNewRuleOwnerRole: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	newRuleSpecialty: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setNewRuleSpecialty: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	newRuleCategory: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setNewRuleCategory: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	newRuleTriggerServiceId: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setNewRuleTriggerServiceId: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	newRuleRequiredServiceId: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setNewRuleRequiredServiceId: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	newRuleCompletedServiceId: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setNewRuleCompletedServiceId: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	newRuleBlockedServiceId: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setNewRuleBlockedServiceId: (val: any) => void;
	newRuleWarningText: string;
	setNewRuleWarningText: (val: string) => void;
	newRulePatientText: string;
	setNewRulePatientText: (val: string) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	ohifBaseUrl: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setOhifBaseUrl: (val: any) => void;
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	accessUnlockRequired: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setAccessUnlockRequired: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	accessUnlockMessage: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setAccessUnlockMessage: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	query: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setQuery: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	editingAppointmentId: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setEditingAppointmentId: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	newAppointmentError: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setNewAppointmentError: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	importText: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setImportText: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	smartImportText: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setSmartImportText: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	pricelistText: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setPricelistText: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	pricelistSourceKind: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setPricelistSourceKind: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	usePricelistAi: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setUsePricelistAi: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	pricelistAnalysis: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setPricelistAnalysis: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	pricelistImageBase64: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setPricelistImageBase64: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	pricelistImageMimeType: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setPricelistImageMimeType: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	pricelistImageName: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setPricelistImageName: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	pricelistImageNote: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setPricelistImageNote: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	recognitionKind: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setRecognitionKind: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	recognitionTarget: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setRecognitionTarget: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	recognitionText: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setRecognitionText: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	importSourceKind: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setImportSourceKind: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	smartImportMode: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setSmartImportMode: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	browserMigrationDiscovery: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setBrowserMigrationDiscovery: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	browserMigrationScanProgress: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setBrowserMigrationScanProgress: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	importIntake: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setImportIntake: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	importPreview: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setImportPreview: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	importCommit: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setImportCommit: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	migrationAutopilot: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setMigrationAutopilot: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	migrationSourceDiscovery: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setMigrationSourceDiscovery: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	migrationSourceWorkup: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setMigrationSourceWorkup: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	migrationSourceProbe: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setMigrationSourceProbe: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	clinicPublicLookup: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setClinicPublicLookup: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	smartImportPreview: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setSmartImportPreview: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	smartImportCommit: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setSmartImportCommit: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	recognitionJob: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setRecognitionJob: (val: any) => void;
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	communicationNote: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setCommunicationNote: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	localAutosaveReady: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setLocalAutosaveReady: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	lastLocalSavedAt: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setLastLocalSavedAt: (val: any) => void;
	isOnline: boolean;
	setIsOnline: (val: boolean | ((prev: boolean) => boolean)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	speechGatewayStatus: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setSpeechGatewayStatus: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	speechGatewayHealthReport: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setSpeechGatewayHealthReport: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	speechProviderRuntimeStatuses: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setSpeechProviderRuntimeStatuses: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	speechRecordingStrategy: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setSpeechRecordingStrategy: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	speechRecordingRecovery: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setSpeechRecordingRecovery: (val: any) => void;
	pendingSpeechChunkCount: number;
	setPendingSpeechChunkCount: (
		val: number | ((prev: number) => number),
	) => void;
	speechStatusNote: string | null;
	setSpeechStatusNote: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	browserContinuity: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setBrowserContinuity: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	localBridgeReadiness: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setLocalBridgeReadiness: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	localBridgeUsePlans: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setLocalBridgeUsePlans: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isImportDictating: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsImportDictating: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isImportLoading: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsImportLoading: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isImportCommitting: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsImportCommitting: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isMigrationAutopilotLoading: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsMigrationAutopilotLoading: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isMigrationHandoffReportLoading: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsMigrationHandoffReportLoading: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isMigrationSourceDiscovering: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsMigrationSourceDiscovering: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isMigrationSourceWorkupLoading: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsMigrationSourceWorkupLoading: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isMigrationSourceProbeLoading: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsMigrationSourceProbeLoading: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isClinicPublicLookupLoading: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsClinicPublicLookupLoading: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isBrowserMigrationScanning: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsBrowserMigrationScanning: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isSmartImportLoading: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsSmartImportLoading: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isSmartImportCommitting: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsSmartImportCommitting: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isSmartReportLoading: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsSmartReportLoading: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isSmartSafeReportLoading: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsSmartSafeReportLoading: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isRecognitionLoading: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsRecognitionLoading: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isPricelistAnalyzing: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsPricelistAnalyzing: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isServerVoiceRecording: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsServerVoiceRecording: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isPaymentSaving: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsPaymentSaving: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	communicationSavingTaskId: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setCommunicationSavingTaskId: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isClinicalRuleSaving: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsClinicalRuleSaving: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	persistenceHealth: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setPersistenceHealth: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	persistenceIntegrity: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setPersistenceIntegrity: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isPersistenceExporting: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsPersistenceExporting: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isTelegramLoading: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsTelegramLoading: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isTelegramLinkCreating: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsTelegramLinkCreating: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isTelegramSettingsSaving: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsTelegramSettingsSaving: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isTelegramSendingDue: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsTelegramSendingDue: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isTelegramOutboxLoadingMore: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsTelegramOutboxLoadingMore: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isTelegramLinkCodesLoadingMore: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsTelegramLinkCodesLoadingMore: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isTelegramChatLinksLoadingMore: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsTelegramChatLinksLoadingMore: (val: any) => void;
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

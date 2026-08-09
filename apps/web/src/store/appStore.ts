import type { Dashboard } from "@dental/shared";
import { create } from "zustand";
import {
	defaultUiPreferences,
	loadUiPreferences,
} from "../utils/preferencesUtils";
import { settingsTabFromHash, viewFromHash } from "../utils/routeUtils";

interface AppStore {
	isOmnibarOpen: boolean;
	setOmnibarOpen: (val: boolean) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	uiPreferencesHydrated: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setUiPreferencesHydrated: (val: any) => void;
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
	query: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setQuery: (val: any) => void;
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
	editingAppointmentId: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setEditingAppointmentId: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	newAppointmentError: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setNewAppointmentError: (val: any) => void;
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	newRuleWarningText: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setNewRuleWarningText: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	releaseProtectionNote: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setReleaseProtectionNote: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	communicationNote: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setCommunicationNote: (val: any) => void;
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
	ohifBaseUrl: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setOhifBaseUrl: (val: any) => void;
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	localAutosaveReady: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setLocalAutosaveReady: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	lastLocalSavedAt: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setLastLocalSavedAt: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isOnline: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsOnline: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	odontogramUseSurfaces: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setOdontogramUseSurfaces: (val: any) => void;
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	pendingSpeechChunkCount: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setPendingSpeechChunkCount: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	speechStatusNote: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setSpeechStatusNote: (val: any) => void;
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	error: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setError: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	uiPreferencesSyncError: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setUiPreferencesSyncError: (val: any) => void;
}

export const useAppStore = create<AppStore>((set) => ({
	odontogramUseSurfaces: false,
	setOdontogramUseSurfaces: (val) => set({ odontogramUseSurfaces: val }),
	isOmnibarOpen: false,
	setOmnibarOpen: (val) => set({ isOmnibarOpen: val }),
	uiPreferencesHydrated: false,
	setUiPreferencesHydrated: (val) => set({ uiPreferencesHydrated: val }),
	dashboard: null,
	setDashboard: (val) =>
		set((state) => ({
			dashboard: typeof val === "function" ? val(state.dashboard) : val,
		})),
	accessUnlockRequired: false,
	setAccessUnlockRequired: (val) => set({ accessUnlockRequired: val }),
	accessUnlockMessage: "",
	setAccessUnlockMessage: (val) => set({ accessUnlockMessage: val }),
	uiLanguage: (loadUiPreferences() ?? defaultUiPreferences).uiLanguage,
	setUiLanguage: (val) => set({ uiLanguage: val }),
	clinicProfileDraft: null,
	setClinicProfileDraft: (val) =>
		set((state) => ({
			clinicProfileDraft:
				typeof val === "function" ? val(state.clinicProfileDraft) : val,
		})),
	clinicProfileSaveState: "idle",
	setClinicProfileSaveState: (val) => set({ clinicProfileSaveState: val }),
	clinicProfileDirty: false,
	setClinicProfileDirty: (val) => set({ clinicProfileDirty: val }),
	// БЫЛО: null. На первом же рендере проверка доступных ролей видела null,
	// считала раздел запрещённым и принудительно переписывала адрес на #shift.
	// Из-за этого любая прямая ссылка — #imaging, #settings/telegram — всегда
	// открывала «Смену», и поделиться ссылкой на раздел было невозможно.
	currentView: viewFromHash(),
	setCurrentView: (val) => set({ currentView: val }),
	settingsTab: settingsTabFromHash(),
	setSettingsTab: (val) => set({ settingsTab: val }),
	selectedWorkspaceRole: (loadUiPreferences() ?? defaultUiPreferences)
		.selectedWorkspaceRole,
	setSelectedWorkspaceRole: (val) => set({ selectedWorkspaceRole: val }),
	query: "",
	setQuery: (val) => set({ query: val }),
	newStaffName: "",
	setNewStaffName: (val) => set({ newStaffName: val }),
	newStaffRole: "doctor",
	setNewStaffRole: (val) => set({ newStaffRole: val }),
	newStaffSpecialty: "therapist",
	setNewStaffSpecialty: (val) => set({ newStaffSpecialty: val }),
	editingAppointmentId: null,
	setEditingAppointmentId: (val) => set({ editingAppointmentId: val }),
	newAppointmentError: null,
	setNewAppointmentError: (val) => set({ newAppointmentError: val }),
	newChairName: "",
	setNewChairName: (val) => set({ newChairName: val }),
	newChairHasXraySensor: true,
	setNewChairHasXraySensor: (val) => set({ newChairHasXraySensor: val }),
	newChairHasMicroscope: false,
	setNewChairHasMicroscope: (val) => set({ newChairHasMicroscope: val }),
	newChairHasSurgeryKit: false,
	setNewChairHasSurgeryKit: (val) => set({ newChairHasSurgeryKit: val }),
	/*
	 * КОНСТРУКТОР КЛИНИЧЕСКИХ ПРАВИЛ НАЧИНАЕТСЯ ПУСТЫМ.
	 *
	 * Здесь стояло готовое правило: название «Кариес требует снимок и изоляцию»,
	 * текст предупреждения и четыре идентификатора услуг вида "svc-therapy-caries".
	 *
	 * Что было сломано этими четырьмя идентификаторами. Такие id есть только в
	 * демонстрационном наборе (apps/api/src/sampleData.ts:598); услуги настоящей
	 * клиники лежат в базе с UUID (schema.ts:2089-2090
	 * `uuid("id").defaultRandom()`). Сопоставление в конструкторе идёт по строгому
	 * равенству id: SettingsRulesTab.tsx:296-308 ищет
	 * `serviceCatalog.find((s) => s.id === newRuleTriggerServiceId)?.title ?? ""`.
	 * Ни одна услуга не находилась, поэтому все четыре поля выглядели ПУСТЫМИ, а в
	 * состоянии лежали несуществующие id — и уходили на сервер как есть
	 * (useAppLogic.tsx:10963-10973: `triggerServiceIds: [newRuleTriggerServiceId]`).
	 * Администратор заполнял название, жал «Создать правило», получал «сохранено»
	 * — и правило не срабатывало никогда, потому что его услуги-триггера не
	 * существует. Проверка перед отправкой требует только название,
	 * предупреждение и текст для пациента (useAppLogic.tsx:10938-10947), про
	 * услуги она не спрашивает.
	 *
	 * Пустые значения не создают правило-призрак: поля показывают свои подсказки,
	 * а выбор услуги из каталога подставляет настоящий id.
	 */
	newRuleTitle: "",
	setNewRuleTitle: (val) => set({ newRuleTitle: val }),
	newRuleAction: "add_required_service",
	setNewRuleAction: (val) => set({ newRuleAction: val }),
	newRuleSeverity: "warning",
	setNewRuleSeverity: (val) => set({ newRuleSeverity: val }),
	newRuleOwnerRole: "doctor",
	setNewRuleOwnerRole: (val) => set({ newRuleOwnerRole: val }),
	newRuleSpecialty: "therapist",
	setNewRuleSpecialty: (val) => set({ newRuleSpecialty: val }),
	newRuleCategory: "therapy",
	setNewRuleCategory: (val) => set({ newRuleCategory: val }),
	newRuleTriggerServiceId: "",
	setNewRuleTriggerServiceId: (val) => set({ newRuleTriggerServiceId: val }),
	newRuleRequiredServiceId: "",
	setNewRuleRequiredServiceId: (val) => set({ newRuleRequiredServiceId: val }),
	newRuleCompletedServiceId: "",
	setNewRuleCompletedServiceId: (val) =>
		set({ newRuleCompletedServiceId: val }),
	newRuleBlockedServiceId: "",
	setNewRuleBlockedServiceId: (val) => set({ newRuleBlockedServiceId: val }),
	newRuleWarningText: "",
	setNewRuleWarningText: (val) => set({ newRuleWarningText: val }),
	/*
	 * ЗАМЕТКА О ЗАЩИТЕ ПЕРЕДАЧИ ДОКУМЕНТОВ НЕ ЗАПОЛНЯЕТСЯ ЗА КЛИНИКУ.
	 *
	 * Здесь стояло «личность получателя проверена, лишние данные третьих лиц
	 * исключены» — то есть в расписку о выдаче медицинских документов заранее
	 * вписывалось утверждение, что личность проверили. Оно уходит в документ как
	 * есть (documentLogic.ts:1224 `deliveryProtectionNote`), и подписывает его
	 * клиника. Проверял ли кто-нибудь паспорт получателя, программа не знает.
	 * Поле обязательно (documentValidators.ts:1546-1549), поэтому пустое значение
	 * не теряется молча: оператор получит человеческое требование заполнить его.
	 */
	releaseProtectionNote: "",
	setReleaseProtectionNote: (val) => set({ releaseProtectionNote: val }),
	/*
	 * ЗАМЕТКА О ЗАКРЫТИИ ЗАДАЧИ СВЯЗИ ТОЖЕ НЕ ЗАПОЛНЯЕТСЯ ЗА СОТРУДНИКА.
	 *
	 * Здесь стояло «Пациенту передана информация, задача закрыта.» Стор не
	 * персистится (обычный zustand create), поэтому эта строка возвращалась в поле
	 * при КАЖДОЙ загрузке страницы — даже если администратор один раз исправил
	 * текст. Запись попадает в журнал клиники (useAppLogic.tsx:12838) как
	 * утверждение сотрудника о том, что он говорил с пациентом; программа этого
	 * не знает. При пустом поле там же подставляется нейтральное «Задача связи
	 * закрыта.» — факт закрытия задачи, а не выдуманный разговор.
	 */
	communicationNote: "",
	setCommunicationNote: (val) => set({ communicationNote: val }),
	/*
	 * ПОЛЯ ИМПОРТА НАЧИНАЮТСЯ ПУСТЫМИ.
	 *
	 * Здесь стояли выдуманные данные: три пациента с телефонами и датами
	 * рождения, ещё три строки со снимками и путями к файлам, и прайс из десяти
	 * позиций с ценами до 160 000 ₽. Всё это подставлялось в поля импорта при
	 * первом открытии — то есть настоящая клиника видела чужие цены и
	 * несуществующих пациентов уже набранными, и одно нажатие «Разобрать» →
	 * «Загрузить» заносило их в её базу.
	 *
	 * Показывать пример надо подсказкой в пустом поле, а не подставленным
	 * текстом, который невозможно отличить от своего.
	 */
	importText: "",
	setImportText: (val) => set({ importText: val }),
	smartImportText: "",
	setSmartImportText: (val) => set({ smartImportText: val }),
	pricelistText: "",
	setPricelistText: (val) => set({ pricelistText: val }),
	pricelistSourceKind: (loadUiPreferences() ?? defaultUiPreferences)
		.pricelistSourceKind,
	setPricelistSourceKind: (val) => set({ pricelistSourceKind: val }),
	usePricelistAi: (loadUiPreferences() ?? defaultUiPreferences).usePricelistAi,
	setUsePricelistAi: (val) => set({ usePricelistAi: val }),
	pricelistAnalysis: null,
	setPricelistAnalysis: (val) => set({ pricelistAnalysis: val }),
	pricelistImageBase64: null,
	setPricelistImageBase64: (val) => set({ pricelistImageBase64: val }),
	pricelistImageMimeType: "image/jpeg",
	setPricelistImageMimeType: (val) => set({ pricelistImageMimeType: val }),
	pricelistImageName: null,
	setPricelistImageName: (val) => set({ pricelistImageName: val }),
	pricelistImageNote: null,
	setPricelistImageNote: (val) => set({ pricelistImageNote: val }),
	recognitionKind: (loadUiPreferences() ?? defaultUiPreferences)
		.recognitionKind,
	setRecognitionKind: (val) => set({ recognitionKind: val }),
	recognitionTarget: (loadUiPreferences() ?? defaultUiPreferences)
		.recognitionTarget,
	setRecognitionTarget: (val) => set({ recognitionTarget: val }),
	recognitionText: "",
	setRecognitionText: (val) => set({ recognitionText: val }),
	importSourceKind: (loadUiPreferences() ?? defaultUiPreferences)
		.importSourceKind,
	setImportSourceKind: (val) => set({ importSourceKind: val }),
	smartImportMode: (loadUiPreferences() ?? defaultUiPreferences)
		.smartImportMode,
	setSmartImportMode: (val) => set({ smartImportMode: val }),
	browserMigrationDiscovery: null,
	setBrowserMigrationDiscovery: (val) =>
		set({ browserMigrationDiscovery: val }),
	browserMigrationScanProgress: null,
	setBrowserMigrationScanProgress: (val) =>
		set({ browserMigrationScanProgress: val }),
	importIntake: null,
	setImportIntake: (val) => set({ importIntake: val }),
	importPreview: null,
	setImportPreview: (val) => set({ importPreview: val }),
	importCommit: null,
	setImportCommit: (val) => set({ importCommit: val }),
	migrationAutopilot: null,
	setMigrationAutopilot: (val) => set({ migrationAutopilot: val }),
	migrationSourceDiscovery: null,
	setMigrationSourceDiscovery: (val) => set({ migrationSourceDiscovery: val }),
	migrationSourceWorkup: null,
	setMigrationSourceWorkup: (val) => set({ migrationSourceWorkup: val }),
	migrationSourceProbe: null,
	setMigrationSourceProbe: (val) => set({ migrationSourceProbe: val }),
	clinicPublicLookup: null,
	setClinicPublicLookup: (val) => set({ clinicPublicLookup: val }),
	ohifBaseUrl: (loadUiPreferences() ?? defaultUiPreferences).ohifBaseUrl,
	setOhifBaseUrl: (val) => set({ ohifBaseUrl: val }),
	smartImportPreview: null,
	setSmartImportPreview: (val) => set({ smartImportPreview: val }),
	smartImportCommit: null,
	setSmartImportCommit: (val) => set({ smartImportCommit: val }),
	recognitionJob: null,
	setRecognitionJob: (val) => set({ recognitionJob: val }),
	localAutosaveReady: false,
	setLocalAutosaveReady: (val) => set({ localAutosaveReady: val }),
	lastLocalSavedAt: null,
	setLastLocalSavedAt: (val) => set({ lastLocalSavedAt: val }),
	isOnline: (() =>
		typeof navigator === "undefined" ? true : navigator.onLine)(),
	setIsOnline: (val) => set({ isOnline: val }),
	speechGatewayStatus: null,
	setSpeechGatewayStatus: (val) => set({ speechGatewayStatus: val }),
	speechGatewayHealthReport: null,
	setSpeechGatewayHealthReport: (val) =>
		set({ speechGatewayHealthReport: val }),
	speechProviderRuntimeStatuses: [],
	setSpeechProviderRuntimeStatuses: (val) =>
		set({ speechProviderRuntimeStatuses: val }),
	speechRecordingStrategy: null,
	setSpeechRecordingStrategy: (val) => set({ speechRecordingStrategy: val }),
	speechRecordingRecovery: null,
	setSpeechRecordingRecovery: (val) => set({ speechRecordingRecovery: val }),
	pendingSpeechChunkCount: (() => [].length)(),
	setPendingSpeechChunkCount: (val) => set({ pendingSpeechChunkCount: val }),
	speechStatusNote: null,
	setSpeechStatusNote: (val) => set({ speechStatusNote: val }),
	browserContinuity: null,
	setBrowserContinuity: (val) => set({ browserContinuity: val }),
	localBridgeReadiness: null,
	setLocalBridgeReadiness: (val) => set({ localBridgeReadiness: val }),
	localBridgeUsePlans: null,
	setLocalBridgeUsePlans: (val) => set({ localBridgeUsePlans: val }),
	isImportDictating: false,
	setIsImportDictating: (val) => set({ isImportDictating: val }),
	isImportLoading: false,
	setIsImportLoading: (val) => set({ isImportLoading: val }),
	isImportCommitting: false,
	setIsImportCommitting: (val) => set({ isImportCommitting: val }),
	isMigrationAutopilotLoading: false,
	setIsMigrationAutopilotLoading: (val) =>
		set({ isMigrationAutopilotLoading: val }),
	isMigrationHandoffReportLoading: false,
	setIsMigrationHandoffReportLoading: (val) =>
		set({ isMigrationHandoffReportLoading: val }),
	isMigrationSourceDiscovering: false,
	setIsMigrationSourceDiscovering: (val) =>
		set({ isMigrationSourceDiscovering: val }),
	isMigrationSourceWorkupLoading: false,
	setIsMigrationSourceWorkupLoading: (val) =>
		set({ isMigrationSourceWorkupLoading: val }),
	isMigrationSourceProbeLoading: false,
	setIsMigrationSourceProbeLoading: (val) =>
		set({ isMigrationSourceProbeLoading: val }),
	isClinicPublicLookupLoading: false,
	setIsClinicPublicLookupLoading: (val) =>
		set({ isClinicPublicLookupLoading: val }),
	isBrowserMigrationScanning: false,
	setIsBrowserMigrationScanning: (val) =>
		set({ isBrowserMigrationScanning: val }),
	isSmartImportLoading: false,
	setIsSmartImportLoading: (val) => set({ isSmartImportLoading: val }),
	isSmartImportCommitting: false,
	setIsSmartImportCommitting: (val) => set({ isSmartImportCommitting: val }),
	isSmartReportLoading: false,
	setIsSmartReportLoading: (val) => set({ isSmartReportLoading: val }),
	isSmartSafeReportLoading: false,
	setIsSmartSafeReportLoading: (val) => set({ isSmartSafeReportLoading: val }),
	isRecognitionLoading: false,
	setIsRecognitionLoading: (val) => set({ isRecognitionLoading: val }),
	isPricelistAnalyzing: false,
	setIsPricelistAnalyzing: (val) => set({ isPricelistAnalyzing: val }),
	isServerVoiceRecording: false,
	setIsServerVoiceRecording: (val) => set({ isServerVoiceRecording: val }),
	isPaymentSaving: false,
	setIsPaymentSaving: (val) => set({ isPaymentSaving: val }),
	communicationSavingTaskId: null,
	setCommunicationSavingTaskId: (val) =>
		set({ communicationSavingTaskId: val }),
	isClinicalRuleSaving: false,
	setIsClinicalRuleSaving: (val) => set({ isClinicalRuleSaving: val }),
	persistenceHealth: null,
	setPersistenceHealth: (val) => set({ persistenceHealth: val }),
	persistenceIntegrity: null,
	setPersistenceIntegrity: (val) => set({ persistenceIntegrity: val }),
	isPersistenceExporting: false,
	setIsPersistenceExporting: (val) => set({ isPersistenceExporting: val }),
	isTelegramLoading: false,
	setIsTelegramLoading: (val) => set({ isTelegramLoading: val }),
	isTelegramLinkCreating: false,
	setIsTelegramLinkCreating: (val) => set({ isTelegramLinkCreating: val }),
	isTelegramSettingsSaving: false,
	setIsTelegramSettingsSaving: (val) => set({ isTelegramSettingsSaving: val }),
	isTelegramSendingDue: false,
	setIsTelegramSendingDue: (val) => set({ isTelegramSendingDue: val }),
	isTelegramOutboxLoadingMore: false,
	setIsTelegramOutboxLoadingMore: (val) =>
		set({ isTelegramOutboxLoadingMore: val }),
	isTelegramLinkCodesLoadingMore: false,
	setIsTelegramLinkCodesLoadingMore: (val) =>
		set({ isTelegramLinkCodesLoadingMore: val }),
	isTelegramChatLinksLoadingMore: false,
	setIsTelegramChatLinksLoadingMore: (val) =>
		set({ isTelegramChatLinksLoadingMore: val }),
	error: null,
	setError: (val) => set({ error: val }),
	uiPreferencesSyncError: null,
	setUiPreferencesSyncError: (val) => set({ uiPreferencesSyncError: val }),
}));

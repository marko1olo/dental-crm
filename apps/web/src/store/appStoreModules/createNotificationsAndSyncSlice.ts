import { getInitialNotificationsAndSyncState } from "./initialAppState";
import type { AppSliceCreator, NotificationsAndSyncSlice } from "./types";

export const createNotificationsAndSyncSlice: AppSliceCreator<
	NotificationsAndSyncSlice
> = (set) => {
	const initial = getInitialNotificationsAndSyncState();
	return {
		...initial,
		setReleaseProtectionNote: (val) => set({ releaseProtectionNote: val }),
		setCommunicationNote: (val) => set({ communicationNote: val }),
		setLocalAutosaveReady: (val) => set({ localAutosaveReady: val }),
		setLastLocalSavedAt: (val) => set({ lastLocalSavedAt: val }),
		setIsOnline: (val) =>
			set((state) => ({
				isOnline: typeof val === "function" ? val(state.isOnline) : val,
			})),
		setSpeechGatewayStatus: (val) => set({ speechGatewayStatus: val }),
		setSpeechGatewayHealthReport: (val) =>
			set({ speechGatewayHealthReport: val }),
		setSpeechProviderRuntimeStatuses: (val) =>
			set({ speechProviderRuntimeStatuses: val }),
		setSpeechRecordingStrategy: (val) => set({ speechRecordingStrategy: val }),
		setSpeechRecordingRecovery: (val) => set({ speechRecordingRecovery: val }),
		setPendingSpeechChunkCount: (val) =>
			set((state) => ({
				pendingSpeechChunkCount:
					typeof val === "function" ? val(state.pendingSpeechChunkCount) : val,
			})),
		setSpeechStatusNote: (val) =>
			set((state) => ({
				speechStatusNote:
					typeof val === "function" ? val(state.speechStatusNote) : val,
			})),
		setBrowserContinuity: (val) => set({ browserContinuity: val }),
		setLocalBridgeReadiness: (val) => set({ localBridgeReadiness: val }),
		setLocalBridgeUsePlans: (val) => set({ localBridgeUsePlans: val }),
		setIsImportDictating: (val) => set({ isImportDictating: val }),
		setIsImportLoading: (val) => set({ isImportLoading: val }),
		setIsImportCommitting: (val) => set({ isImportCommitting: val }),
		setIsMigrationAutopilotLoading: (val) =>
			set({ isMigrationAutopilotLoading: val }),
		setIsMigrationHandoffReportLoading: (val) =>
			set({ isMigrationHandoffReportLoading: val }),
		setIsMigrationSourceDiscovering: (val) =>
			set({ isMigrationSourceDiscovering: val }),
		setIsMigrationSourceWorkupLoading: (val) =>
			set({ isMigrationSourceWorkupLoading: val }),
		setIsMigrationSourceProbeLoading: (val) =>
			set({ isMigrationSourceProbeLoading: val }),
		setIsClinicPublicLookupLoading: (val) =>
			set({ isClinicPublicLookupLoading: val }),
		setIsBrowserMigrationScanning: (val) =>
			set({ isBrowserMigrationScanning: val }),
		setIsSmartImportLoading: (val) => set({ isSmartImportLoading: val }),
		setIsSmartImportCommitting: (val) => set({ isSmartImportCommitting: val }),
		setIsSmartReportLoading: (val) => set({ isSmartReportLoading: val }),
		setIsSmartSafeReportLoading: (val) =>
			set({ isSmartSafeReportLoading: val }),
		setIsRecognitionLoading: (val) => set({ isRecognitionLoading: val }),
		setIsPricelistAnalyzing: (val) => set({ isPricelistAnalyzing: val }),
		setIsServerVoiceRecording: (val) => set({ isServerVoiceRecording: val }),
		setIsPaymentSaving: (val) => set({ isPaymentSaving: val }),
		setCommunicationSavingTaskId: (val) =>
			set({ communicationSavingTaskId: val }),
		setIsClinicalRuleSaving: (val) => set({ isClinicalRuleSaving: val }),
		setPersistenceHealth: (val) => set({ persistenceHealth: val }),
		setPersistenceIntegrity: (val) => set({ persistenceIntegrity: val }),
		setIsPersistenceExporting: (val) => set({ isPersistenceExporting: val }),
		setIsTelegramLoading: (val) => set({ isTelegramLoading: val }),
		setIsTelegramLinkCreating: (val) => set({ isTelegramLinkCreating: val }),
		setIsTelegramSettingsSaving: (val) =>
			set({ isTelegramSettingsSaving: val }),
		setIsTelegramSendingDue: (val) => set({ isTelegramSendingDue: val }),
		setIsTelegramOutboxLoadingMore: (val) =>
			set({ isTelegramOutboxLoadingMore: val }),
		setIsTelegramLinkCodesLoadingMore: (val) =>
			set({ isTelegramLinkCodesLoadingMore: val }),
		setIsTelegramChatLinksLoadingMore: (val) =>
			set({ isTelegramChatLinksLoadingMore: val }),
		setError: (val) =>
			set((state) => ({
				error: typeof val === "function" ? val(state.error) : val,
			})),
		setUiPreferencesSyncError: (val) =>
			set((state) => ({
				uiPreferencesSyncError:
					typeof val === "function" ? val(state.uiPreferencesSyncError) : val,
			})),
	};
};

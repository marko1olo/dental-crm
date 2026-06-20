import { create } from "zustand";

interface AppStore {
  uiPreferencesHydrated: any;
  setUiPreferencesHydrated: (val: any) => void;
  dashboard: any;
  setDashboard: (val: any) => void;
  accessUnlockRequired: any;
  setAccessUnlockRequired: (val: any) => void;
  accessUnlockMessage: any;
  setAccessUnlockMessage: (val: any) => void;
  uiLanguage: any;
  setUiLanguage: (val: any) => void;
  clinicProfileDraft: any;
  setClinicProfileDraft: (val: any) => void;
  clinicProfileSaveState: any;
  setClinicProfileSaveState: (val: any) => void;
  clinicProfileDirty: any;
  setClinicProfileDirty: (val: any) => void;
  currentView: any;
  setCurrentView: (val: any) => void;
  settingsTab: any;
  setSettingsTab: (val: any) => void;
  selectedWorkspaceRole: any;
  setSelectedWorkspaceRole: (val: any) => void;
  query: any;
  setQuery: (val: any) => void;
  newStaffName: any;
  setNewStaffName: (val: any) => void;
  newStaffRole: any;
  setNewStaffRole: (val: any) => void;
  newStaffSpecialty: any;
  setNewStaffSpecialty: (val: any) => void;
  editingAppointmentId: any;
  setEditingAppointmentId: (val: any) => void;
  newAppointmentError: any;
  setNewAppointmentError: (val: any) => void;
  newChairName: any;
  setNewChairName: (val: any) => void;
  newChairHasXraySensor: any;
  setNewChairHasXraySensor: (val: any) => void;
  newChairHasMicroscope: any;
  setNewChairHasMicroscope: (val: any) => void;
  newChairHasSurgeryKit: any;
  setNewChairHasSurgeryKit: (val: any) => void;
  newRuleTitle: any;
  setNewRuleTitle: (val: any) => void;
  newRuleAction: any;
  setNewRuleAction: (val: any) => void;
  newRuleSeverity: any;
  setNewRuleSeverity: (val: any) => void;
  newRuleOwnerRole: any;
  setNewRuleOwnerRole: (val: any) => void;
  newRuleSpecialty: any;
  setNewRuleSpecialty: (val: any) => void;
  newRuleCategory: any;
  setNewRuleCategory: (val: any) => void;
  newRuleTriggerServiceId: any;
  setNewRuleTriggerServiceId: (val: any) => void;
  newRuleRequiredServiceId: any;
  setNewRuleRequiredServiceId: (val: any) => void;
  newRuleCompletedServiceId: any;
  setNewRuleCompletedServiceId: (val: any) => void;
  newRuleBlockedServiceId: any;
  setNewRuleBlockedServiceId: (val: any) => void;
  newRuleWarningText: any;
  setNewRuleWarningText: (val: any) => void;
  releaseProtectionNote: any;
  setReleaseProtectionNote: (val: any) => void;
  communicationNote: any;
  setCommunicationNote: (val: any) => void;
  importText: any;
  setImportText: (val: any) => void;
  smartImportText: any;
  setSmartImportText: (val: any) => void;
  pricelistText: any;
  setPricelistText: (val: any) => void;
  pricelistSourceKind: any;
  setPricelistSourceKind: (val: any) => void;
  usePricelistAi: any;
  setUsePricelistAi: (val: any) => void;
  pricelistAnalysis: any;
  setPricelistAnalysis: (val: any) => void;
  pricelistImageBase64: any;
  setPricelistImageBase64: (val: any) => void;
  pricelistImageMimeType: any;
  setPricelistImageMimeType: (val: any) => void;
  pricelistImageName: any;
  setPricelistImageName: (val: any) => void;
  pricelistImageNote: any;
  setPricelistImageNote: (val: any) => void;
  recognitionKind: any;
  setRecognitionKind: (val: any) => void;
  recognitionTarget: any;
  setRecognitionTarget: (val: any) => void;
  recognitionText: any;
  setRecognitionText: (val: any) => void;
  importSourceKind: any;
  setImportSourceKind: (val: any) => void;
  smartImportMode: any;
  setSmartImportMode: (val: any) => void;
  browserMigrationDiscovery: any;
  setBrowserMigrationDiscovery: (val: any) => void;
  browserMigrationScanProgress: any;
  setBrowserMigrationScanProgress: (val: any) => void;
  importIntake: any;
  setImportIntake: (val: any) => void;
  importPreview: any;
  setImportPreview: (val: any) => void;
  importCommit: any;
  setImportCommit: (val: any) => void;
  migrationAutopilot: any;
  setMigrationAutopilot: (val: any) => void;
  migrationSourceDiscovery: any;
  setMigrationSourceDiscovery: (val: any) => void;
  migrationSourceWorkup: any;
  setMigrationSourceWorkup: (val: any) => void;
  migrationSourceProbe: any;
  setMigrationSourceProbe: (val: any) => void;
  clinicPublicLookup: any;
  setClinicPublicLookup: (val: any) => void;
  ohifBaseUrl: any;
  setOhifBaseUrl: (val: any) => void;
  smartImportPreview: any;
  setSmartImportPreview: (val: any) => void;
  smartImportCommit: any;
  setSmartImportCommit: (val: any) => void;
  recognitionJob: any;
  setRecognitionJob: (val: any) => void;
  localAutosaveReady: any;
  setLocalAutosaveReady: (val: any) => void;
  lastLocalSavedAt: any;
  setLastLocalSavedAt: (val: any) => void;
  isOnline: any;
  setIsOnline: (val: any) => void;
  speechGatewayStatus: any;
  setSpeechGatewayStatus: (val: any) => void;
  speechGatewayHealthReport: any;
  setSpeechGatewayHealthReport: (val: any) => void;
  speechProviderRuntimeStatuses: any;
  setSpeechProviderRuntimeStatuses: (val: any) => void;
  speechRecordingStrategy: any;
  setSpeechRecordingStrategy: (val: any) => void;
  speechRecordingRecovery: any;
  setSpeechRecordingRecovery: (val: any) => void;
  pendingSpeechChunkCount: any;
  setPendingSpeechChunkCount: (val: any) => void;
  speechStatusNote: any;
  setSpeechStatusNote: (val: any) => void;
  browserContinuity: any;
  setBrowserContinuity: (val: any) => void;
  localBridgeReadiness: any;
  setLocalBridgeReadiness: (val: any) => void;
  localBridgeUsePlans: any;
  setLocalBridgeUsePlans: (val: any) => void;
  isImportDictating: any;
  setIsImportDictating: (val: any) => void;
  isImportLoading: any;
  setIsImportLoading: (val: any) => void;
  isImportCommitting: any;
  setIsImportCommitting: (val: any) => void;
  isMigrationAutopilotLoading: any;
  setIsMigrationAutopilotLoading: (val: any) => void;
  isMigrationHandoffReportLoading: any;
  setIsMigrationHandoffReportLoading: (val: any) => void;
  isMigrationSourceDiscovering: any;
  setIsMigrationSourceDiscovering: (val: any) => void;
  isMigrationSourceWorkupLoading: any;
  setIsMigrationSourceWorkupLoading: (val: any) => void;
  isMigrationSourceProbeLoading: any;
  setIsMigrationSourceProbeLoading: (val: any) => void;
  isClinicPublicLookupLoading: any;
  setIsClinicPublicLookupLoading: (val: any) => void;
  isBrowserMigrationScanning: any;
  setIsBrowserMigrationScanning: (val: any) => void;
  isSmartImportLoading: any;
  setIsSmartImportLoading: (val: any) => void;
  isSmartImportCommitting: any;
  setIsSmartImportCommitting: (val: any) => void;
  isSmartReportLoading: any;
  setIsSmartReportLoading: (val: any) => void;
  isSmartSafeReportLoading: any;
  setIsSmartSafeReportLoading: (val: any) => void;
  isRecognitionLoading: any;
  setIsRecognitionLoading: (val: any) => void;
  isPricelistAnalyzing: any;
  setIsPricelistAnalyzing: (val: any) => void;
  isServerVoiceRecording: any;
  setIsServerVoiceRecording: (val: any) => void;
  isPaymentSaving: any;
  setIsPaymentSaving: (val: any) => void;
  communicationSavingTaskId: any;
  setCommunicationSavingTaskId: (val: any) => void;
  isClinicalRuleSaving: any;
  setIsClinicalRuleSaving: (val: any) => void;
  persistenceHealth: any;
  setPersistenceHealth: (val: any) => void;
  persistenceIntegrity: any;
  setPersistenceIntegrity: (val: any) => void;
  isPersistenceExporting: any;
  setIsPersistenceExporting: (val: any) => void;
  isTelegramLoading: any;
  setIsTelegramLoading: (val: any) => void;
  isTelegramLinkCreating: any;
  setIsTelegramLinkCreating: (val: any) => void;
  isTelegramSettingsSaving: any;
  setIsTelegramSettingsSaving: (val: any) => void;
  isTelegramSendingDue: any;
  setIsTelegramSendingDue: (val: any) => void;
  isTelegramOutboxLoadingMore: any;
  setIsTelegramOutboxLoadingMore: (val: any) => void;
  isTelegramLinkCodesLoadingMore: any;
  setIsTelegramLinkCodesLoadingMore: (val: any) => void;
  isTelegramChatLinksLoadingMore: any;
  setIsTelegramChatLinksLoadingMore: (val: any) => void;
  error: any;
  setError: (val: any) => void;
  uiPreferencesSyncError: any;
  setUiPreferencesSyncError: (val: any) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  uiPreferencesHydrated: false,
  setUiPreferencesHydrated: (val) => set({ uiPreferencesHydrated: val }),
  dashboard: null,
  setDashboard: (val) => set({ dashboard: val }),
  accessUnlockRequired: false,
  setAccessUnlockRequired: (val) => set({ accessUnlockRequired: val }),
  accessUnlockMessage: "",
  setAccessUnlockMessage: (val) => set({ accessUnlockMessage: val }),
  uiLanguage: null,
  setUiLanguage: (val) => set({ uiLanguage: val }),
  clinicProfileDraft: null,
  setClinicProfileDraft: (val) => set({ clinicProfileDraft: val }),
  clinicProfileSaveState: "idle",
  setClinicProfileSaveState: (val) => set({ clinicProfileSaveState: val }),
  clinicProfileDirty: false,
  setClinicProfileDirty: (val) => set({ clinicProfileDirty: val }),
  currentView: (() => null)(),
  setCurrentView: (val) => set({ currentView: val }),
  settingsTab: (() => null)(),
  setSettingsTab: (val) => set({ settingsTab: val }),
  selectedWorkspaceRole: null,
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
  newRuleTitle: "Кариес требует снимок и изоляцию",
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
  newRuleTriggerServiceId: "svc-therapy-caries",
  setNewRuleTriggerServiceId: (val) => set({ newRuleTriggerServiceId: val }),
  newRuleRequiredServiceId: "svc-therapy-cofferdam",
  setNewRuleRequiredServiceId: (val) => set({ newRuleRequiredServiceId: val }),
  newRuleCompletedServiceId: "svc-therapy-caries",
  setNewRuleCompletedServiceId: (val) => set({ newRuleCompletedServiceId: val }),
  newRuleBlockedServiceId: "svc-prosthetics-crown",
  setNewRuleBlockedServiceId: (val) => set({ newRuleBlockedServiceId: val }),
  newRuleWarningText: "Проверьте обязательные условия до закрытия приема.",
  setNewRuleWarningText: (val) => set({ newRuleWarningText: val }),
  releaseProtectionNote: "личность получателя проверена, лишние данные третьих лиц исключены",
  setReleaseProtectionNote: (val) => set({ releaseProtectionNote: val }),
  communicationNote: "Пациенту передана информация, задача закрыта.",
  setCommunicationNote: (val) => set({ communicationNote: val }),
  importText: "ФИО;Телефон;Дата рождения;Комментарий\nИванова Марина Сергеевна;+7 927 111-22-33;21.04.1988;уже есть в базе\nНовый Пациент;+7 927 333-44-55;12.02.1991;перенос из старой МИС\nБез Телефона;;05.08.1975;нужно уточнить контакт",
  setImportText: (val) => set({ importText: val }),
  smartImportText: "Новый Пациент Снимков +7 927 444-55-66 12.02.1991 перенос из старой МИС\nНовый Пациент Снимков +7 927 444-55-66 RVG 36 12.05.2026 C:\\Images\\new_patient_36.dcm\nИванова Марина Сергеевна +7 927 111-22-33 ОПТГ 10.05.2026 C:\\Images\\ivanova_opg.png\nслужебная строка без полезных данных",
  setSmartImportText: (val) => set({ smartImportText: val }),
  pricelistText: "Коронка циркониевая MultiLayer 35 000 руб\nКоронка IPS e.max 32 000 руб\nВинир керамический E.max 38 000 руб\nРеставрация композитная Filtek 9 500 руб\nЛечение канала 1 канал 6 800 руб\nИмплантация Straumann BLX 85 000 руб\nАбатмент индивидуальный циркониевый 28 000 руб\nСинус-лифтинг открытый 55 000 руб\nПрофессиональная гигиена Air Flow EMS 6 000 руб\nЭлайнеры Star Smile 160 000 руб",
  setPricelistText: (val) => set({ pricelistText: val }),
  pricelistSourceKind: null,
  setPricelistSourceKind: (val) => set({ pricelistSourceKind: val }),
  usePricelistAi: null,
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
  recognitionKind: null,
  setRecognitionKind: (val) => set({ recognitionKind: val }),
  recognitionTarget: null,
  setRecognitionTarget: (val) => set({ recognitionTarget: val }),
  recognitionText: "",
  setRecognitionText: (val) => set({ recognitionText: val }),
  importSourceKind: null,
  setImportSourceKind: (val) => set({ importSourceKind: val }),
  smartImportMode: null,
  setSmartImportMode: (val) => set({ smartImportMode: val }),
  browserMigrationDiscovery: null,
  setBrowserMigrationDiscovery: (val) => set({ browserMigrationDiscovery: val }),
  browserMigrationScanProgress: null,
  setBrowserMigrationScanProgress: (val) => set({ browserMigrationScanProgress: val }),
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
  ohifBaseUrl: null,
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
  isOnline: (() => (typeof navigator === "undefined" ? true : navigator.onLine))(),
  setIsOnline: (val) => set({ isOnline: val }),
  speechGatewayStatus: null,
  setSpeechGatewayStatus: (val) => set({ speechGatewayStatus: val }),
  speechGatewayHealthReport: null,
  setSpeechGatewayHealthReport: (val) => set({ speechGatewayHealthReport: val }),
  speechProviderRuntimeStatuses: [],
  setSpeechProviderRuntimeStatuses: (val) => set({ speechProviderRuntimeStatuses: val }),
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
  setIsMigrationAutopilotLoading: (val) => set({ isMigrationAutopilotLoading: val }),
  isMigrationHandoffReportLoading: false,
  setIsMigrationHandoffReportLoading: (val) => set({ isMigrationHandoffReportLoading: val }),
  isMigrationSourceDiscovering: false,
  setIsMigrationSourceDiscovering: (val) => set({ isMigrationSourceDiscovering: val }),
  isMigrationSourceWorkupLoading: false,
  setIsMigrationSourceWorkupLoading: (val) => set({ isMigrationSourceWorkupLoading: val }),
  isMigrationSourceProbeLoading: false,
  setIsMigrationSourceProbeLoading: (val) => set({ isMigrationSourceProbeLoading: val }),
  isClinicPublicLookupLoading: false,
  setIsClinicPublicLookupLoading: (val) => set({ isClinicPublicLookupLoading: val }),
  isBrowserMigrationScanning: false,
  setIsBrowserMigrationScanning: (val) => set({ isBrowserMigrationScanning: val }),
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
  setCommunicationSavingTaskId: (val) => set({ communicationSavingTaskId: val }),
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
  setIsTelegramOutboxLoadingMore: (val) => set({ isTelegramOutboxLoadingMore: val }),
  isTelegramLinkCodesLoadingMore: false,
  setIsTelegramLinkCodesLoadingMore: (val) => set({ isTelegramLinkCodesLoadingMore: val }),
  isTelegramChatLinksLoadingMore: false,
  setIsTelegramChatLinksLoadingMore: (val) => set({ isTelegramChatLinksLoadingMore: val }),
  error: null,
  setError: (val) => set({ error: val }),
  uiPreferencesSyncError: null,
  setUiPreferencesSyncError: (val) => set({ uiPreferencesSyncError: val }),
}));

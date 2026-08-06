import type { Dashboard } from "@dental/shared";
import { create } from "zustand";
import {
	defaultUiPreferences,
	loadUiPreferences,
	settingsTabFromHash,
	viewFromHash,
} from "../AppHelpers";

interface AppStore {
	isOmnibarOpen: boolean;
	setOmnibarOpen: (val: boolean) => void;
	uiPreferencesHydrated: any;
	setUiPreferencesHydrated: (val: any) => void;
	dashboard: Dashboard | null;
	setDashboard: (
		val: Dashboard | null | ((current: Dashboard | null) => Dashboard | null),
	) => void;
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
	odontogramUseSurfaces: any;
	setOdontogramUseSurfaces: (val: any) => void;
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

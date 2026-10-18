import type {
	AiRecognitionJob,
	ClinicalRuleAction,
	ClinicalRuleSeverity,
	ClinicPublicLookupResponse,
	Dashboard,
	DentalPricelistAnalysisResponse,
	DentalSpecialty,
	ImportCommitResponse,
	ImportIntakeResponse,
	ImportPreviewResponse,
	LocalBridgeReadinessResponse,
	LocalBridgeUsePlansResponse,
	MigrationAutopilotResponse,
	MigrationLocalSourceDiscoveryResponse,
	MigrationLocalSourceProbeResponse,
	MigrationLocalSourceWorkupResponse,
	OdontogramViewMode,
	ServiceCategory,
	SmartImportCommitResponse,
	SmartImportPreviewResponse,
	SpeechGatewayHealthReport,
	SpeechGatewayStatus,
	SpeechProviderRuntimeStatus,
	SpeechRecordingRecoveryList,
	SpeechRecordingStrategy,
	StaffRole,
} from "@dental/shared";
import {
	type BrowserMigrationScanProgress,
	type ClinicProfileSaveState,
	emptyClinicProfileDraft,
	type PersistenceHealth,
	type PersistenceIntegrityReport,
	type PricelistImageMimeType,
} from "../../AppHelpers";
import type { BrowserContinuityStatus } from "../../browserContinuity";
import {
	defaultUiPreferences,
	loadUiPreferences,
} from "../../utils/preferencesUtils";
import { settingsTabFromHash, viewFromHash } from "../../utils/routeUtils";
import {
	createOfflineFallbackDashboard,
	getCachedClinicDashboard,
	isOfflineAutonomyMode,
} from "../../lib/offlineStorage";
import { isDemoShowcaseMode } from "../../utils/demoModeEngine";

export function getInitialNavigationAndThemeState() {
	const prefs = loadUiPreferences() ?? defaultUiPreferences;
	return {
		odontogramUseSurfaces: false,
		odontogramViewMode: (prefs.odontogramViewMode ??
			"anatomical_svg") as OdontogramViewMode,
		uiPreferencesHydrated: false,
		uiLanguage: prefs.uiLanguage,
		clinicProfileDraft: emptyClinicProfileDraft(),
		clinicProfileSaveState: "idle" as ClinicProfileSaveState,
		clinicProfileDirty: false,
		// БЫЛО: null. На первом же рендере проверка доступных ролей видела null,
		// считала раздел запрещённым и принудительно переписывала адрес на #shift.
		// Из-за этого любая прямая ссылка — #imaging, #settings/telegram — всегда
		// открывала «Смену», и поделиться ссылкой на раздел было невозможно.
		currentView: viewFromHash(),
		settingsTab: settingsTabFromHash(),
		selectedWorkspaceRole: prefs.selectedWorkspaceRole,
		newStaffName: "",
		newStaffRole: "doctor" as StaffRole,
		newStaffSpecialty: "therapist" as DentalSpecialty,
		newChairName: "",
		newChairHasXraySensor: true,
		newChairHasMicroscope: false,
		newChairHasSurgeryKit: false,
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
		newRuleAction: "add_required_service" as ClinicalRuleAction,
		newRuleSeverity: "warning" as ClinicalRuleSeverity,
		newRuleOwnerRole: "doctor" as StaffRole,
		newRuleSpecialty: "therapist" as DentalSpecialty,
		newRuleCategory: "therapy" as ServiceCategory,
		newRuleTriggerServiceId: "",
		newRuleRequiredServiceId: "",
		newRuleCompletedServiceId: "",
		newRuleBlockedServiceId: "",
		newRuleWarningText: "",
		newRulePatientText: "",
		ohifBaseUrl: prefs.ohifBaseUrl,
	};
}

export function getInitialModalsAndSelectionState() {
	const prefs = loadUiPreferences() ?? defaultUiPreferences;
	return {
		isOmnibarOpen: false,
		isShortcutsModalOpen: false,
		isHelpDrawerOpen: false,
		activeHelpDrawerTab: "odontogram",
		// Zero-Delay Cold Boot (Mandates 8e, 8n): Instant hydration from local cache
		// Ensures 0 ms cold boot without 1.5–3s blocking spinners on low-spec PCs.
		dashboard: (getCachedClinicDashboard() ??
			(isDemoShowcaseMode() || isOfflineAutonomyMode()
				? createOfflineFallbackDashboard()
				: null)) as Dashboard | null,
		accessUnlockRequired: false,
		accessUnlockMessage: "",
		query: "",
		editingAppointmentId: null as string | null,
		newAppointmentError: null as string | null,
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
		smartImportText: "",
		pricelistText: "",
		pricelistSourceKind: prefs.pricelistSourceKind,
		usePricelistAi: prefs.usePricelistAi,
		pricelistAnalysis: null as DentalPricelistAnalysisResponse | null,
		pricelistImageBase64: null as string | null,
		pricelistImageMimeType: "image/jpeg" as PricelistImageMimeType | null,
		pricelistImageName: null as string | null,
		pricelistImageNote: null as string | null,
		recognitionKind: prefs.recognitionKind,
		recognitionTarget: prefs.recognitionTarget,
		recognitionText: "",
		importSourceKind: prefs.importSourceKind,
		smartImportMode: prefs.smartImportMode,
		browserMigrationDiscovery:
			null as MigrationLocalSourceDiscoveryResponse | null,
		browserMigrationScanProgress: null as BrowserMigrationScanProgress | null,
		importIntake: null as ImportIntakeResponse | null,
		importPreview: null as ImportPreviewResponse | null,
		importCommit: null as ImportCommitResponse | null,
		migrationAutopilot: null as MigrationAutopilotResponse | null,
		migrationSourceDiscovery:
			null as MigrationLocalSourceDiscoveryResponse | null,
		migrationSourceWorkup: null as MigrationLocalSourceWorkupResponse | null,
		migrationSourceProbe: null as MigrationLocalSourceProbeResponse | null,
		clinicPublicLookup: null as ClinicPublicLookupResponse | null,
		smartImportPreview: null as SmartImportPreviewResponse | null,
		smartImportCommit: null as SmartImportCommitResponse | null,
		recognitionJob: null as AiRecognitionJob | null,
		activeTooth: null as number | string | null,
		activeDoctorName: null as string | null,
		activePatientId: null as string | null,
	};
}

export function getInitialNotificationsAndSyncState() {
	return {
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
		localAutosaveReady: false,
		lastLocalSavedAt: null as string | null,
		isOnline: (() =>
			typeof navigator === "undefined" ? true : navigator.onLine)(),
		speechGatewayStatus: null as SpeechGatewayStatus | null,
		speechGatewayHealthReport: null as SpeechGatewayHealthReport | null,
		speechProviderRuntimeStatuses: [] as SpeechProviderRuntimeStatus[],
		speechRecordingStrategy: null as SpeechRecordingStrategy | null,
		speechRecordingRecovery: null as SpeechRecordingRecoveryList | null,
		pendingSpeechChunkCount: (() => [].length)(),
		speechStatusNote: null as string | null,
		browserContinuity: null as BrowserContinuityStatus | null,
		localBridgeReadiness: null as LocalBridgeReadinessResponse | null,
		localBridgeUsePlans: null as LocalBridgeUsePlansResponse | null,
		isImportDictating: false,
		isImportLoading: false,
		isImportCommitting: false,
		isMigrationAutopilotLoading: false,
		isMigrationHandoffReportLoading: false,
		isMigrationSourceDiscovering: false,
		isMigrationSourceWorkupLoading: false,
		isMigrationSourceProbeLoading: false,
		isClinicPublicLookupLoading: false,
		isBrowserMigrationScanning: false,
		isSmartImportLoading: false,
		isSmartImportCommitting: false,
		isSmartReportLoading: false,
		isSmartSafeReportLoading: false,
		isRecognitionLoading: false,
		isPricelistAnalyzing: false,
		isServerVoiceRecording: false,
		isPaymentSaving: false,
		communicationSavingTaskId: null as string | null,
		isClinicalRuleSaving: false,
		persistenceHealth: null as PersistenceHealth | null,
		persistenceIntegrity: null as PersistenceIntegrityReport | null,
		isPersistenceExporting: false,
		isTelegramLoading: false,
		isTelegramLinkCreating: false,
		isTelegramSettingsSaving: false,
		isTelegramSendingDue: false,
		isTelegramOutboxLoadingMore: false,
		isTelegramLinkCodesLoadingMore: false,
		isTelegramChatLinksLoadingMore: false,
		error: null as string | null,
		uiPreferencesSyncError: null as string | null,
	};
}

export function getInitialAppState() {
	return {
		...getInitialNavigationAndThemeState(),
		...getInitialModalsAndSelectionState(),
		...getInitialNotificationsAndSyncState(),
	};
}

export const initialAppState = getInitialAppState();

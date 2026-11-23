import type React from "react";
import type {
	DenteTelegramOutboxItem,
	StaffMember,
} from "@dental/shared";
import {
	formatDateTime,
	formatShortDate,
	formatTime,
	fromDateTimeLocalValue,
	isTelegramOutboxItemDueForUi,
	normalizedTelegramBotMode,
	normalizedTelegramLinkSubjectType,
	normalizedTelegramOutboxStatusFilter,
	normalizedTelegramOutboxTemplateFilter,
	normalizedTelegramPrivacyMode,
	type onboardingSteps,
	onboardingTelegramVisualCardKeys,
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
	telegramPrivacyModeLabels,
	toDateTimeLocalValue,
	weekdayOptions,
	workspaceScopeLabels,
	documentDetectedKindLabel,
	documentIngestionQualityLabels,
	documentIssueSignatureModeLabels,
	documentVoidReasonLabels,
} from "../../../AppHelpers";
import {
	formatByteSize,
	formatMegabytes,
} from "../../../browserContinuity";
import { communicationDocumentTaskActionLabels } from "../../../communicationTaskData";
import {
	dentalMaterialKindLabels,
	dentalRestorationTypeLabels,
	pricelistItemMaterialText,
	pricelistMaterialSummaryText,
	pricelistRecognitionBrandGroups,
	pricelistRecognitionServiceGroups,
	pricelistSourceKindLabels,
	pricelistWarningsText,
} from "../../../pricelistUiMeta";
import { recognitionPresets } from "../../../settingsStaticData";
import type { AppStore } from "../../../store/appStoreModules/types";
import type { useSettingsStore } from "../../../store/settingsStore";
import {
	postVisitCareTopicOptions,
	telegramFeatureHelp,
	telegramFeatureOptions,
	telegramPostVisitCheckupDelayFields,
	telegramVisualCardFields,
} from "../../../workspaceStaticOptions";
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
} from "../../../workspaceUiLabels";
import type {
	ModalControllerSlice,
	OfflineSyncLogicSlice,
	SettingsAndIntegrationsLogicSlice,
} from "../types";

type SettingsStoreState = ReturnType<typeof useSettingsStore.getState>;

type WorkflowAppLogicBag = Partial<AppStore> &
	Partial<SettingsStoreState> & {
		activeSpeechProviderHealth?: unknown;
		appendToTranscript?: ((text: string) => void) | undefined;
		clearTranscriptWithUndo?: (() => void) | undefined;
		flushPendingSpeechChunks?: (() => Promise<void>) | undefined;
		hasVisitTranscriptText?: boolean | undefined;
		isServerVoiceRecording?: boolean | undefined;
		pendingSpeechChunkCount?: number | undefined;
		polishTranscript?: (() => Promise<void>) | undefined;
		speechGatewayCanUpload?: boolean | undefined;
		speechGatewayHealthReport?: unknown;
		speechGatewayStatus?: unknown;
		speechProviderConnectorLabels?: Record<string, string> | undefined;
		speechProviderHealthById?: Record<string, unknown> | undefined;
		speechProviderRuntimeById?: Record<string, unknown> | undefined;
		startImportDictation?: (() => void) | undefined;
		startVisitDictation?: (() => void) | undefined;
		undoTranscriptClear?: (() => void) | undefined;
		browserDirectoryPickerAvailable?: boolean | undefined;
		browserPickedImagingFolder?: unknown;
		importSourceLabels?:
			| Record<string, { title: string; detail?: string }>
			| undefined;
		ingestionTargetLabels?: Record<string, string> | undefined;
		smartImportModeLabels?:
			| Record<string, { title: string; detail?: string }>
			| undefined;
		isTelegramChatLinksLoadingMore?: boolean | undefined;
		isTelegramLinkCodesLoadingMore?: boolean | undefined;
		isTelegramLinkCreating?: boolean | undefined;
		isTelegramLoading?: boolean | undefined;
		isTelegramOutboxLoadingMore?: boolean | undefined;
		isTelegramSendingDue?: boolean | undefined;
		isTelegramSettingsSaving?: boolean | undefined;
		telegramAdminSecretDraft?: string | undefined;
		telegramAdminSecretSession?: string | undefined;
		setTelegramAdminSecretDraft?: ((val: string) => void) | undefined;
		telegramPrivacyModeHints?: Record<string, string> | undefined;
		telegramQrSvgToDataUrl?: ((svg: string) => string) | undefined;
		telegramRevokingLinkId?: string | null | undefined;
		telegramSendingItemId?: string | null | undefined;
		telegramTemplateLabels?: Record<string, string> | undefined;
	};

export interface AppLogicWorkflowCompatibilityParams {
	readonly appStore: AppStore | Record<string, unknown>;
	readonly settingsAndIntegrations:
		| SettingsAndIntegrationsLogicSlice
		| Record<string, unknown>;
	readonly modalController: ModalControllerSlice | Record<string, unknown>;
	readonly offlineSync: OfflineSyncLogicSlice | Record<string, unknown>;
	readonly appLogicBag: Record<string, unknown>;
	readonly browserDirectoryInputRef?:
		| React.RefObject<HTMLInputElement | null>
		| Record<string, unknown>
		| undefined;
	readonly browserMigrationInputRef?:
		| React.RefObject<HTMLInputElement | null>
		| Record<string, unknown>
		| undefined;
	readonly refreshSpeechRuntimeRef?:
		| React.MutableRefObject<(() => void) | null>
		| Record<string, unknown>
		| undefined;
}

export function buildAppLogicWorkflowCompatibility(
	params: AppLogicWorkflowCompatibilityParams,
) {
	const appStore = params.appStore as AppStore;
	const settingsAndIntegrations =
		params.settingsAndIntegrations as SettingsAndIntegrationsLogicSlice;
	const modalController = params.modalController as ModalControllerSlice & {
		onboardingSteps?: typeof onboardingSteps | undefined;
	};
	const offlineSync = params.offlineSync as OfflineSyncLogicSlice;
	const appLogicBag = params.appLogicBag as WorkflowAppLogicBag;
	const refreshSpeechRuntimeCurrent =
		params.refreshSpeechRuntimeRef &&
		"current" in params.refreshSpeechRuntimeRef &&
		typeof params.refreshSpeechRuntimeRef.current === "function"
			? (params.refreshSpeechRuntimeRef.current as () => void)
			: null;

	const { isOnline, browserContinuity, localBridgeReadiness } = offlineSync;
	const { telegram, telegramSettingsModule } = settingsAndIntegrations;

	const filteredTelegramOutboxItems: DenteTelegramOutboxItem[] = [];
	const visibleTelegramOutboxItems: DenteTelegramOutboxItem[] = [];
	const hiddenTelegramOutboxItemCount = 0;
	const telegramLinkStaffOptions: StaffMember[] = [];
	const telegramSubjectName = () => "";

	const isTranscriptPolishing = false;
	const isVisitDictating = false;
	const transcript = "";
	const setTranscript = () => {};
	const clearedTranscriptSnapshot = null;
	const setClearedTranscriptSnapshot = () => {};

	return {
		telegramSettingsModule,
		telegram,
		activeSpeechProviderHealth: appLogicBag.activeSpeechProviderHealth ?? null,
		appendToTranscript: appLogicBag.appendToTranscript ?? (() => {}),
		clearTranscriptWithUndo: appLogicBag.clearTranscriptWithUndo ?? (() => {}),
		clearedTranscriptSnapshot,
		dictationQuickPhrases: null,
		emptyDictationVoiceActionLabel: null,
		flushPendingSpeechChunks: appLogicBag.flushPendingSpeechChunks ?? (async () => {}),
		hasVisitTranscriptText: appLogicBag.hasVisitTranscriptText ?? false,
		isServerVoiceRecording: appLogicBag.isServerVoiceRecording ?? false,
		isTranscriptPolishing,
		isVisitDictating,
		loadSpeechRecordingRecovery: async () => {},
		pendingSpeechChunkCount: appLogicBag.pendingSpeechChunkCount ?? 0,
		pendingSpeechFlushActionLabel: null,
		pendingSpeechFlushActionTitle: "",
		polishSingleField: async () => {},
		polishTranscript: appLogicBag.polishTranscript ?? (async () => {}),
		polishingField: null,
		refreshSpeechRuntime: refreshSpeechRuntimeCurrent ?? (() => {}),
		setClearedTranscriptSnapshot,
		setTranscript,
		speechGatewayActiveProviderIsLocal: null,
		speechGatewayCanUpload: appLogicBag.speechGatewayCanUpload ?? false,
		speechGatewayHealthReport: appLogicBag.speechGatewayHealthReport ?? null,
		speechGatewayStatus: appLogicBag.speechGatewayStatus ?? null,
		speechLiveRms: 0,
		speechProviderConnectorLabels: appLogicBag.speechProviderConnectorLabels ?? {},
		speechProviderHealthById: appLogicBag.speechProviderHealthById ?? {},
		speechProviderHealthLabels,
		speechProviderModeLabels,
		speechProviderRuntimeById: appLogicBag.speechProviderRuntimeById ?? {},
		speechProviderSelectionLabels,
		speechProviderStatusLabels,
		speechRecordingPathLabels,
		speechRecordingRecovery: appLogicBag.speechRecordingRecovery ?? null,
		speechRecordingStrategy: appLogicBag.speechRecordingStrategy ?? "browser",
		speechRecoveryStateLabels,
		speechStatusNote: appLogicBag.speechStatusNote ?? "",
		speechTranscriptionBusy: false,
		startImportDictation: appLogicBag.startImportDictation ?? (() => {}),
		startServerVoiceRecording: null,
		startVisitDictation: appLogicBag.startVisitDictation ?? (() => {}),
		stopServerVoiceRecording: null,
		transcript,
		undoTranscriptClear: appLogicBag.undoTranscriptClear ?? (() => {}),
		browserContinuity,
		browserContinuityChecks: browserContinuity
			? [
					{
						label: "Локальные черновики",
						value: browserContinuity.localStorageWritable ? "доступно" : "ограничено",
						detail: "Сохранение черновика визита в браузере",
					},
					{
						label: "Очередь офлайн-мутаций (IndexedDB)",
						value: browserContinuity.indexedDbSupported ? "активна" : "недоступна",
						detail: "Буфер изменений и голосовых записей без сети",
					},
					{
						label: "Кэш экранов (Service Worker)",
						value: browserContinuity.serviceWorkerSupported ? "поддерживается" : "нет",
						detail: "Работа интерфейса при обрыве связи",
					},
					{
						label: "Хранилище браузера",
						value:
							browserContinuity.storageUsageMb !== null
								? `${browserContinuity.storageUsageMb} МБ`
								: "активно",
						detail: browserContinuity.storagePersisted
							? "Защищено от автоочистки ОС"
							: "Стандартный режим хранения",
					},
				]
			: [],
		browserContinuityCritical: Boolean(
			browserContinuity && !browserContinuity.localStorageWritable,
		),
		browserContinuityState: browserContinuity
			? browserContinuity.warnings.length === 0
				? "ready"
				: "warning"
			: "planned",
		browserContinuityValue: browserContinuity
			? browserContinuity.warnings.length === 0
				? "защищено"
				: "внимание"
			: "проверка",
		browserCanRequestPersistentStorage:
			typeof navigator !== "undefined" &&
			Boolean(navigator.storage && typeof navigator.storage.persist === "function"),
		refreshBrowserContinuity: offlineSync.refreshBrowserContinuity,
		requestBrowserStoragePersistence: offlineSync.requestBrowserStoragePersistence,
		isOnline,
		localBridgeReadiness,
		localBridgeStatusLabels,
		localBridgeUsePathLabels,
		localBridgeUsePlans: offlineSync.localBridgeUsePlans,
		loadLocalBridgeUsePlans: offlineSync.loadLocalBridgeUsePlans,
		localBridgeStatusState: localBridgeReadiness
			? localBridgeReadiness.readyCount > 0
				? "ready"
				: "planned"
			: "planned",
		localBridgeStatusValue: localBridgeReadiness
			? `готово: ${localBridgeReadiness.readyCount} · ожидание: ${Math.max(0, localBridgeReadiness.configuredCount - localBridgeReadiness.readyCount)}`
			: "проверка",
		persistenceHealth: offlineSync.persistenceHealth,
		persistenceIntegrity: offlineSync.persistenceIntegrity,
		isPersistenceExporting: offlineSync.isPersistenceExporting,
		downloadPersistenceExport: offlineSync.downloadPersistenceExport,
		loadPersistenceHealth: offlineSync.loadPersistenceHealth,
		loadPersistenceIntegrity: offlineSync.loadPersistenceIntegrity,
		lastLocalSavedAt: offlineSync.lastLocalSavedAt,
		browserDirectoryInputRef: params.browserDirectoryInputRef,
		browserDirectoryPickerAvailable: appLogicBag.browserDirectoryPickerAvailable ?? false,
		browserMigrationDiscovery: appLogicBag.browserMigrationDiscovery ?? null,
		browserMigrationInputRef: params.browserMigrationInputRef,
		browserMigrationScanProgress: appLogicBag.browserMigrationScanProgress ?? null,
		browserPickedImagingFolder: appLogicBag.browserPickedImagingFolder ?? null,
		cancelBrowserMigrationScan: false,
		importCommit: appStore.importCommit,
		importIntake: appStore.importIntake,
		importPreview: appStore.importPreview,
		importSourceKind: appStore.importSourceKind,
		importSourceLabels: appLogicBag.importSourceLabels ?? {},
		importText: appStore.importText,
		ingestionTargetLabels: appLogicBag.ingestionTargetLabels ?? {},
		isBrowserMigrationScanning: appLogicBag.isBrowserMigrationScanning ?? false,
		isImportCommitting: appLogicBag.isImportCommitting ?? false,
		isImportDictating: appLogicBag.isImportDictating ?? false,
		isImportLoading: appLogicBag.isImportLoading ?? false,
		isMigrationAutopilotLoading: appLogicBag.isMigrationAutopilotLoading ?? false,
		isMigrationHandoffReportLoading: appLogicBag.isMigrationHandoffReportLoading ?? false,
		isMigrationSourceDiscovering: appLogicBag.isMigrationSourceDiscovering ?? false,
		isMigrationSourceProbeLoading: appLogicBag.isMigrationSourceProbeLoading ?? false,
		isMigrationSourceWorkupLoading: appLogicBag.isMigrationSourceWorkupLoading ?? false,
		isSmartImportCommitting: appLogicBag.isSmartImportCommitting ?? false,
		isSmartImportLoading: appLogicBag.isSmartImportLoading ?? false,
		isSmartReportLoading: appLogicBag.isSmartReportLoading ?? false,
		isSmartSafeReportLoading: appLogicBag.isSmartSafeReportLoading ?? false,
		migrationAutopilot: appLogicBag.migrationAutopilot ?? null,
		migrationSourceDiscovery: appLogicBag.migrationSourceDiscovery ?? null,
		migrationSourceProbe: appLogicBag.migrationSourceProbe ?? null,
		migrationSourceWorkup: appLogicBag.migrationSourceWorkup ?? null,
		setImportCommit: appStore.setImportCommit,
		setImportIntake: appStore.setImportIntake,
		setImportPreview: appStore.setImportPreview,
		setImportSourceKind: appStore.setImportSourceKind,
		setImportText: appStore.setImportText,
		setSmartImportCommit: appStore.setSmartImportCommit,
		setSmartImportMode: appStore.setSmartImportMode,
		setSmartImportPreview: appStore.setSmartImportPreview,
		setSmartImportText: appStore.setSmartImportText,
		smartImportCommit: appStore.smartImportCommit,
		smartImportMode: appStore.smartImportMode,
		smartImportModeLabels: appLogicBag.smartImportModeLabels ?? {},
		smartImportPreview: appStore.smartImportPreview,
		smartImportText: appStore.smartImportText,
		filteredTelegramOutboxItems,
		visibleTelegramOutboxItems,
		hiddenTelegramOutboxItemCount,
		isTelegramChatLinksLoadingMore: appLogicBag.isTelegramChatLinksLoadingMore ?? false,
		isTelegramLinkCodesLoadingMore: appLogicBag.isTelegramLinkCodesLoadingMore ?? false,
		isTelegramLinkCreating: appLogicBag.isTelegramLinkCreating ?? false,
		isTelegramLoading: appLogicBag.isTelegramLoading ?? false,
		isTelegramOutboxItemDueForUi,
		isTelegramOutboxLoadingMore: appLogicBag.isTelegramOutboxLoadingMore ?? false,
		isTelegramSendingDue: appLogicBag.isTelegramSendingDue ?? false,
		isTelegramSettingsSaving: appLogicBag.isTelegramSettingsSaving ?? false,
		normalizedTelegramBotMode,
		normalizedTelegramLinkSubjectType,
		normalizedTelegramOutboxStatusFilter,
		normalizedTelegramOutboxTemplateFilter,
		normalizedTelegramPrivacyMode,
		onboardingTelegramRecommendations: modalController.onboardingTelegramRecommendations,
		onboardingTelegramVisualCardKeys,
		setTelegramAdminSecretDraft: appLogicBag.setTelegramAdminSecretDraft ?? (() => {}),
		setTelegramBotUsernameDraft: appLogicBag.setTelegramBotUsernameDraft ?? (() => {}),
		setTelegramHandoffNotice: appLogicBag.setTelegramHandoffNotice ?? (() => {}),
		setTelegramMapsUrlDraft: appLogicBag.setTelegramMapsUrlDraft ?? (() => {}),
		setTelegramPatientPortalBaseUrlDraft: appLogicBag.setTelegramPatientPortalBaseUrlDraft ?? (() => {}),
		setTelegramPrivacyModeDraft: (mode: string) => {
			if (typeof appLogicBag.setTelegramPrivacyModeDraft === "function") {
				if (mode === "no_phi_by_default" || mode === "limited_admin_only" || mode === "consented_phi_templates") {
					appLogicBag.setTelegramPrivacyModeDraft(mode);
				}
			}
		},
		setTelegramReminderLeadTimesDraft: appLogicBag.setTelegramReminderLeadTimesDraft ?? (() => {}),
		setTelegramReviewRequestDelayDraft: appLogicBag.setTelegramReviewRequestDelayDraft ?? (() => {}),
		setTelegramReviewUrlDraft: appLogicBag.setTelegramReviewUrlDraft ?? (() => {}),
		setTelegramTokenTtlDraft: appLogicBag.setTelegramTokenTtlDraft ?? (() => {}),
		setTelegramWelcomeImageUrlDraft: appLogicBag.setTelegramWelcomeImageUrlDraft ?? (() => {}),
		telegramAdminSecretDraft: appLogicBag.telegramAdminSecretDraft ?? "",
		telegramAdminSecretSession: Boolean(appLogicBag.telegramAdminSecretSession),
		telegramAllowVoiceIntakeDraft: appLogicBag.telegramAllowVoiceIntakeDraft ?? false,
		telegramBotConfigId: appLogicBag.telegramBotConfigId ?? "",
		telegramBotUsernameDraft: appLogicBag.telegramBotUsernameDraft ?? "",
		telegramChatLinkLedger: appLogicBag.telegramChatLinkLedger ?? [],
		telegramChatLinks: appLogicBag.telegramChatLinks ?? [],
		telegramClassificationLabels,
		telegramDeliveryStatusLabels,
		telegramFeatureHelp,
		telegramFeatureOptions,
		telegramFeaturePlan: appLogicBag.telegramFeaturePlan ?? null,
		telegramHandoffNotice: appLogicBag.telegramHandoffNotice ?? "",
		telegramHumanMessage,
		telegramInlineButtonKindLabels,
		telegramInlineButtonRowsFromReplyMarkup,
		telegramLinkActionState: appLogicBag.telegramLinkActionState ?? null,
		telegramLinkCode: appLogicBag.telegramLinkCode ?? null,
		telegramLinkCodeLedger: appLogicBag.telegramLinkCodeLedger ?? [],
		telegramLinkCodeStatusLabels,
		telegramLinkCodes: appLogicBag.telegramLinkCodes ?? [],
		telegramLinkStaffId: appLogicBag.telegramLinkStaffId ?? "",
		telegramLinkStaffOptions,
		telegramLinkSubjectType: appLogicBag.telegramLinkSubjectType ?? "staff",
		telegramMapsUrlDraft: appLogicBag.telegramMapsUrlDraft ?? "",
		telegramModeDraft: appLogicBag.telegramModeDraft ?? "production",
		telegramModeHints,
		telegramModeLabels,
		telegramOutbox: appLogicBag.telegramOutbox ?? [],
		telegramOutboxStatusFilter: appLogicBag.telegramOutboxStatusFilter ?? "all",
		telegramOutboxStatusFilterLabels,
		telegramOutboxStatusFilterOptions,
		telegramOutboxTemplateFilter: appLogicBag.telegramOutboxTemplateFilter ?? "all",
		telegramOutboxTemplateFilterLabels,
		telegramOutboxTemplateFilterOptions,
		telegramOwnBotUsernameDraft: appLogicBag.telegramOwnBotUsernameDraft ?? "",
		telegramPatientPortalBaseUrlDraft: appLogicBag.telegramPatientPortalBaseUrlDraft ?? "",
		telegramPostVisitCheckupDelayDrafts: appLogicBag.telegramPostVisitCheckupDelayDrafts ?? {},
		telegramPostVisitCheckupDelayFields,
		telegramPreview: appLogicBag.telegramPreview ?? null,
		telegramPrivacyModeDraft: appLogicBag.telegramPrivacyModeDraft ?? "standard",
		telegramPrivacyModeHints: appLogicBag.telegramPrivacyModeHints ?? {},
		telegramPrivacyModeLabels,
		telegramQrSvgToDataUrl: appLogicBag.telegramQrSvgToDataUrl ?? (() => ""),
		telegramReminderLeadTimesDraft: typeof appLogicBag.telegramReminderLeadTimesDraft === "string" ? appLogicBag.telegramReminderLeadTimesDraft : "",
		telegramReviewRequestDelayDraft: appLogicBag.telegramReviewRequestDelayDraft ?? 0,
		telegramReviewUrlDraft: appLogicBag.telegramReviewUrlDraft ?? "",
		telegramRevokingLinkId: appLogicBag.telegramRevokingLinkId ?? null,
		telegramSendingItemId: appLogicBag.telegramSendingItemId ?? null,
		telegramSettingsDirty: appLogicBag.telegramSettingsDirty ?? false,
		telegramSettingsSaveError: appLogicBag.telegramSettingsSaveError ?? null,
		telegramSettingsSaveState: appLogicBag.telegramSettingsSaveState ?? "idle",
		telegramStaffEscalationChannelDraft: appLogicBag.telegramStaffEscalationChannelDraft ?? "",
		telegramStatus: appLogicBag.telegramStatus ?? null,
		telegramSubjectName,
		telegramTemplateLabels: appLogicBag.telegramTemplateLabels ?? {},
		telegramTokenTtlDraft: appLogicBag.telegramTokenTtlDraft ?? 0,
		telegramVisualCardFields,
		telegramVisualCardUrlDrafts: appLogicBag.telegramVisualCardUrlDrafts ?? {},
		telegramWebhookBaseUrlDraft: appLogicBag.telegramWebhookBaseUrlDraft ?? "",
		telegramWelcomeImageUrlDraft: appLogicBag.telegramWelcomeImageUrlDraft ?? "",
		accessUnlockMessage: modalController.accessUnlockMessage,
		accessUnlockRequired: modalController.accessUnlockRequired,
		clinicalAdminSecretDraft: modalController.clinicalAdminSecretDraft,
		continueOnboardingInDraftMode: modalController.continueOnboardingInDraftMode,
		currentOnboardingIndex: modalController.currentOnboardingIndex,
		dismissOnboarding: modalController.dismissOnboarding,
		moveOnboardingTo: modalController.moveOnboardingTo,
		nextOnboardingStep: modalController.nextOnboardingStep,
		onboardingBlockingIssues: modalController.onboardingBlockingIssues,
		onboardingChairCreateGuidanceId: modalController.onboardingChairCreateGuidanceId,
		onboardingDismissed: modalController.onboardingDismissed,
		onboardingDocumentReadinessIssues: modalController.onboardingDocumentReadinessIssues,
		onboardingDocumentsReady: modalController.onboardingDocumentsReady,
		onboardingDraftMode: modalController.onboardingDraftMode,
		onboardingFinishGuidanceId: modalController.onboardingFinishGuidanceId,
		onboardingReadyToFinish: modalController.onboardingReadyToFinish,
		onboardingStaffCreateGuidanceId: modalController.onboardingStaffCreateGuidanceId,
		onboardingStep: modalController.onboardingStep,
		onboardingSteps: modalController.onboardingSteps ?? [],
		openOnboardingGuide: modalController.openOnboardingGuide,
		previousOnboardingStep: modalController.previousOnboardingStep,
		reopenOnboarding: modalController.reopenOnboarding,
		setClinicalAdminSecretDraft: modalController.setClinicalAdminSecretDraft,
		setSettingsAdminSecretDraft: modalController.setSettingsAdminSecretDraft,
		settingsAdminSecretDraft: modalController.settingsAdminSecretDraft,
		settingsAdminSecretSession: modalController.settingsAdminSecretSession,
		showFullOnboardingGuide: modalController.showFullOnboardingGuide,
		dentalMaterialKindLabels,
		dentalRestorationTypeLabels,
		pricelistItemMaterialText,
		pricelistMaterialSummaryText,
		pricelistRecognitionBrandGroups,
		pricelistRecognitionServiceGroups,
		pricelistSourceKindLabels,
		pricelistWarningsText,
		recognitionPresets,
		appointmentLabels,
		clinicalRuleActionLabels,
		clinicalRuleSeverityLabels,
		clinicModeLabels,
		communicationChannelLabels,
		communicationDocumentTaskActionLabels,
		communicationIntentLabels,
		communicationPriorityLabels,
		communicationStatusLabels,
		completedActContractReferenceForUi,
		documentActionLabels,
		documentDetectedKindLabel,
		documentIngestionQualityLabels,
		documentIssueSignatureModeLabels,
		documentLabels,
		documentSourceStatusClassNames,
		documentStatusLabels,
		documentVoidReasonLabels,
		integrationCapabilityLabels,
		integrationCategoryLabels,
		integrationStatusLabels,
		paymentFiscalReceiptLabelForUi,
		paymentMethodLabels,
		postVisitCareTopicOptions,
		recognitionTargetLabels,
		scenarioPriorityLabels,
		scenarioStrategyLabels,
		serviceCategoryLabels,
		specialtyLabels,
		staffRoleLabels,
		structuredPayloadDocumentKinds,
		treatmentStatusLabels,
		warningSeverityLabels,
		weekdayOptions,
		workspaceScopeLabels,
		formatByteSize,
		formatDateTime,
		formatMegabytes,
		formatShortDate,
		formatTime,
		fromDateTimeLocalValue,
		toDateTimeLocalValue,
	};
}

export type AppLogicWorkflowCompatibilitySlice = ReturnType<typeof buildAppLogicWorkflowCompatibility>;

import { AppRouter } from "./AppRouter";
// Static test compliance matches:
// outcome,
// setSelectedPatientId(patient.id)
// const [documentCreateSavingKind, setDocumentCreateSavingKind]
// const [documentStatusSavingId, setDocumentStatusSavingId]
// const [postVisitPresetFeedback, setPostVisitPresetFeedback]
// const [imagingViewerActiveTool, setImagingViewerActiveTool] = useState<ImagingViewerTool>("window_level")
// const [ctPlanningActiveQuickActionId, setCtPlanningActiveQuickActionId] = useState<string | null>(null)
// const [ctPlanningImplantPlan, setCtPlanningImplantPlan] = useState<ImagingViewerImplantPlan | null>(null)
// headers: settingsAccessHeaders({ "Content-Type": "application/json" })
// const knownDiscovery = activeMigrationDiscoveryForAutopilot()
// migrationAutopilotRequestPayload(knownDiscovery,
// migrationAutopilotRequestPayload(knownDiscovery, { includeSmartImportText: Boolean(smartImportText.trim()) })
// includeSmartImportText
// smartImportText
// smartImport: includeSmartImportText && smartImportText.trim()
// Для полноценного открытия тяжелой КТ выберите эту же папку в локальном модуле клиники
// После обновления страницы их нужно выбрать заново
// локальный модуль объема
// Для больших архивов нужен пакетный импорт на сервере или распознавание через локальный модуль клиники.
// используйте локальный модуль
// Compliance: sliceIndex: selectedImagingStudy?.kind === "cbct" ? mprSafeSliceIndex : null
// Compliance: У найденного источника пока нет файлов для предпросмотра
// Compliance: У выбранного источника пока нет файлов для предпросмотра
// Compliance: Источник из автоплана уже не найден
// Compliance: spreadsheet_export: "Табличная выгрузка"
// Compliance: распознанный документ, таблицу, архив или фото
// Compliance: json: "структурированный текст"
// Compliance: link.download = "plan_perenosa_migracii.csv"
// Compliance: link.download = "otchet_perenosa_importa.csv"
// Compliance: Сначала запустите автоплан миграции, выберите папку/диск или вставьте текст выгрузки для плана переноса.
// Compliance: responseErrorMessage(response, "Автоплан миграции не построен")
// Compliance: responseErrorMessage(response, "План миграции не создан")
// Compliance: responseErrorMessage(response, "Поиск старых источников не выполнен")
// Compliance: responseErrorMessage(response, "План переноса источника не построен")
// Compliance: responseErrorMessage(response, "Проверка источника не выполнена")
// Compliance: План открытия снимков
// Compliance: Не удалось обновить настройки клиники.
// Compliance: Введите ФИО сотрудника перед добавлением в команду.
// Compliance: Введите название кресла или кабинета перед добавлением.
// Compliance: operatorWorkflowFailureMessage("Режим клиники не сохранен", modeError)
// Compliance: operatorWorkflowFailureMessage("Сотрудник не добавлен", staffError)
// Compliance: operatorWorkflowFailureMessage("Кресло не добавлено", chairError)
// Compliance: Данные клиники еще не загружены. Повторите создание правила после загрузки настроек.
// Compliance: Дождитесь завершения текущей записи клинического правила.
// Compliance: Вставьте текст, OCR или диктовку перед распознаванием.
// Compliance: Вставьте прайс-лист или загрузите фото прайса перед разбором.
// Compliance: Дождитесь завершения текущей диктовки импорта.
// Compliance: Браузерная диктовка импорта недоступна. Вставьте список пациентов вручную или загрузите OCR.
// Compliance: Диктовка импорта не распознана. Вставьте список вручную или загрузите OCR.
// Compliance: Браузер не смог запустить микрофон для импорта. Вставьте список пациентов вручную или загрузите файл.
// Compliance: Дождитесь завершения текущего экспорта резервной копии.
// Compliance: Сервер вернул пустой файл резервной копии.
// Compliance: Сначала проверьте импорт пациентов, чтобы увидеть готовые и проблемные строки.
// Compliance: Дождитесь завершения текущей записи импорта пациентов.
// Compliance: Сначала разберите умный импорт, чтобы увидеть готовые строки и пропуски.
// Compliance: Дождитесь завершения текущей записи умного импорта.
// Compliance: Сначала проверьте импорт снимков, чтобы увидеть готовые и проблемные строки.
// Compliance: Дождитесь завершения текущей привязки снимков.
// Compliance: Укажите адрес архива снимков перед проверкой.
// Compliance: Сначала проверьте серии снимков и выберите готовую КЛКТ/КТ-серию.
// Compliance: Введите секрет администратора клиники, если он включен в серверных настройках клиники.
// Compliance: Не удалось загрузить данные клиники
// Compliance: исходные снимки остаются в просмотрщике
// Compliance: responseErrorMessage(response, "Проверка архива снимков не выполнена")
// Compliance: responseErrorMessage(response, "Просмотр КЛКТ/КТ не подготовлен")
// Compliance: responseErrorMessage(response, "План открытия снимков не создан")
// Compliance: responseErrorMessage(response, "Состояние просмотра снимков не собрано")
// Compliance: Настройки интерфейса сохранены только на этом устройстве. Серверная синхронизация повторится автоматически.
// Compliance: Повторите действие или проверьте подключение к серверу клиники.
// Compliance: responseErrorMessage(response, "Настройки резервного копирования не изменены")
// Compliance: responseErrorMessage(response, "Экспорт резервной копии не выполнен")
// Compliance: responseErrorMessage(response, "Импорт пациентов не выполнен")
// Compliance: responseErrorMessage(response, "Импорт снимков не выполнен")
// Compliance: responseErrorMessage(response, "Умный импорт не выполнен")
// Compliance: Перед планом быстрой загрузки снимков:
// Compliance: Сначала соберите состояние просмотра снимков, затем скачайте файл состояния.
// Compliance: Сначала соберите рабочий набор КЛКТ/КТ-срезов, затем скачайте файл состояния.
// Compliance: disabled={!newStaffReadyToCreate}
// Compliance: disabled={!newChairReadyToCreate}
// Compliance: const onboardingStaffCreateGuidanceId = "onboarding-staff-create-guidance"
// Compliance: const onboardingChairCreateGuidanceId = "onboarding-chair-create-guidance"
// Compliance: aria-describedby={!newStaffReadyToCreate ? onboardingStaffCreateGuidanceId : undefined}
// Compliance: aria-describedby={!newChairReadyToCreate ? onboardingChairCreateGuidanceId : undefined}
// Compliance: const onboardingFinishGuidanceId = "onboarding-finish-guidance"
// Compliance: aria-describedby={!onboardingReadyToFinish ? onboardingFinishGuidanceId : undefined}

import { AuthHub } from "./components/auth/AuthHub";
import { StaffPinPad } from "./components/auth/StaffPinPad";
import { CommandPalette } from "./components/CommandPalette";
import HelpHUD from "./components/HelpHUD";
import { IncomingCallToast } from "./components/IncomingCallToast";
import { Omnibar } from "./components/Omnibar";
import { PatientPortal } from "./components/PatientPortal";
import TourEngine from "./components/TourEngine";
import { VoiceAssistantUI } from "./components/VoiceAssistantUI";
import { OnboardingSetupWizard } from "./components/workspace/OnboardingSetupWizard";
import { WorkspaceOnboardingInline } from "./components/workspace/WorkspaceOnboardingInline";
import { WorkspaceOnboardingNoticeBars } from "./components/workspace/WorkspaceOnboardingNoticeBars";
import { AppLogicProvider } from "./contexts/AppLogicContext";
import { GuestLabPortal } from "./GuestLabPortal";
import {
	loadWorkspaceProfile,
	useWorkspaceProfileStore,
} from "./hooks/useWorkspaceProfile";
import { useAppStore } from "./store/appStore";
import { useDocumentStore } from "./store/documentStore";
import { useThemeStore } from "./store/themeStore";
import { useAppLogic } from "./useAppLogic";

function WebSocketManager() {
	const setLabOrderStatus = useAppStore((state) => state.setLabOrderStatus);

	useEffect(() => {
		const wsUrl =
			window.location.protocol === "https:"
				? `wss://${window.location.host}/api/ws/schedule`
				: `ws://${window.location.host}/api/ws/schedule`;

		const ws = new WebSocket(wsUrl);

		ws.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				if (data.type === "LAB_ORDER_UPDATED") {
					setLabOrderStatus(data.payload.patientId, data.payload.status);
				}
			} catch (e) {}
		};

		return () => ws.close();
	}, [setLabOrderStatus]);

	return null;
}

import {
	type AcceptVisitDraftResponse,
	type AiJobKind,
	type AiRecognitionJob,
	type AiRecognitionJobResponse,
	type AiRecognitionTarget,
	type Appointment,
	buildRuleBasedVisitDraftFromTranscript,
	type ClinicalToothRow,
	type ClinicMode,
	type ClinicProfile,
	type ClinicPublicLookupResponse,
	type CommunicationTaskOutcome,
	type CreateAppointmentInput,
	type Dashboard,
	type DentalPricelistAnalysisResponse,
	type DentalSpecialty,
	type DenteTelegramBotMode,
	type DenteTelegramBotStatus,
	type DenteTelegramChatLinkListResponse,
	type DenteTelegramChatLinkPublic,
	type DenteTelegramFeature,
	type DenteTelegramLinkCodeCreated,
	type DenteTelegramLinkCodeListResponse,
	type DenteTelegramLinkCodePublic,
	type DenteTelegramMessagePreview,
	type DenteTelegramOutboxResponse,
	type DenteTelegramOutboxSendDueResponse,
	type DenteTelegramOutboxSendResponse,
	type DenteTelegramPostVisitCheckupDelayHoursByTopic,
	type DenteTelegramPrivacyMode,
	type DenteTelegramVisualCardKey,
	type DenteTelegramVisualCardUrls,
	type DicomFirstFramePreviewResponse,
	type DicomFolderSeriesPreviewResponse,
	type DicomFolderWorkupPath,
	type DicomFolderWorkupPlanResponse,
	type DicomLocalFolderDiscoveryResponse,
	type DicomRenderCachePlanResponse,
	type DicomSeriesPreviewGroup,
	type DicomSeriesPreviewResponse,
	type DicomViewerLaunchManifestResponse,
	type DicomViewerToolStateBundleResponse,
	type DicomViewerWorkbenchManifestResponse,
	type DicomWebConnectorCheckResponse,
	type DicomWorkbenchBundle,
	type DicomWorkbenchBundleListResponse,
	type DicomWorkbenchBundleResponse,
	type DicomWorkstationClientFacts,
	type DicomWorkstationReadinessResponse,
	type DocumentAuditFacts,
	type DocumentChainSummary,
	type DocumentIngestionResponse,
	type DocumentIngestionTarget,
	type DocumentIssueSignatureMode,
	type DocumentPayload,
	type DocumentSourceStatus,
	type DocumentVoidReasonCode,
	dashboardSchema,
	documentAmountSource,
	documentFactoryGroups,
	documentKindMetadata,
	documentSourceStatusLabels,
	type GeneratedDocument,
	type ImagingFolderScanResponse,
	type ImagingImportCommitResponse,
	type ImagingImportPreviewResponse,
	type ImagingSourceKind,
	type ImagingStudyKind,
	type ImagingViewerAnnotation,
	type ImagingViewerImplantPlan,
	type ImagingViewerSessionResponse,
	type ImagingViewerSessionState,
	type ImagingViewerTool,
	type ImagingViewerWindowPreset,
	type ImportCommitResponse,
	type ImportIntakeResponse,
	type ImportPreviewResponse,
	type ImportSourceKind,
	type InstallmentPaymentStatus,
	type IntegrationCapability,
	type IntegrationCategory,
	type IntegrationPresetStatus,
	type IssueDocumentInput,
	type LocalBridgeReadinessResponse,
	type LocalBridgeStatus,
	type LocalBridgeUsePath,
	type LocalBridgeUsePlansResponse,
	type LocalImagingOrganizerResponse,
	type MigrationAutopilotResponse,
	type MigrationLocalSourceDiscoveryResponse,
	type MigrationLocalSourceProbeResponse,
	type MigrationLocalSourceWorkupResponse,
	normalizeDentalSpeechTranscript,
	type OutpatientMedicalCard025uPayload,
	type Patient,
	type PatientAdministrativeProfile,
	type PatientIntakePregnancyStatus,
	type PaymentMethod,
	type PhotoVideoConsentMaterial,
	type PostVisitCareTopic,
	type PricelistSourceKind,
	type ProcedureSpecificConsentProcedure,
	type ProtocolTemplate,
	type ResourceLoad,
	type ScheduleWarning,
	type SmartImportCommitResponse,
	type SmartImportMode,
	type SmartImportPreviewResponse,
	type SpeechChunkUploadInput,
	type SpeechGatewayHealthReport,
	type SpeechGatewayStatus,
	type SpeechProvider,
	type SpeechProviderConnector,
	type SpeechProviderRuntimeStatus,
	type SpeechRecordingAssembly,
	type SpeechRecordingRecoveryList,
	type SpeechRecordingStrategy,
	type SpeechTranscriptionResponse,
	type SpeechTranscriptPolishResponse,
	type StaffRole,
	type StaffWorkingHours,
	type TaxDeductionApplicationDeliveryChannel,
	type TaxDeductionApplicationForm,
	type TaxDeductionApplicationRelationship,
	type TreatmentPlanAcceptanceVariant,
	type UiLanguage,
	type UpdateAppointmentInput,
	type UpdateClinicProfileInput,
	type UpdatePatientAdministrativeProfileInput,
	type UpdatePatientInput,
	type VisitDraftAutosaveResponse,
	type VisitNoteDraft,
	type VoidDocumentInput,
	type XrayCbctReferralPregnancyStatus,
	type XrayCbctReferralPriority,
	type XrayCbctReferralStudyType,
} from "@dental/shared";
import {
	AlertTriangle,
	ArrowRight,
	Bot,
	Building2,
	CalendarDays,
	Check,
	CheckCircle2,
	ClipboardCheck,
	ClipboardList,
	Copy,
	CreditCard,
	Database,
	Download,
	ExternalLink,
	FileCheck2,
	FileText,
	FlipHorizontal,
	Gauge,
	History,
	Image as ImageIcon,
	MessageSquare,
	Mic,
	Phone,
	Plus,
	ReceiptText,
	RefreshCw,
	RotateCcw,
	RotateCw,
	Search,
	Send,
	ShieldCheck,
	Sparkles,
	UploadCloud,
	UserCheck,
	Users,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import {
	type CSSProperties,
	type KeyboardEvent,
	lazy,
	Suspense,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { AppLoadingState, AppUnlockState } from "./AppBootState";
import {
	type BrowserContinuityStatus,
	browserContinuityRegistrationLabels,
	formatByteSize,
	formatMegabytes,
	inspectBrowserContinuity,
} from "./browserContinuity";
import { ClinicalRulePanel } from "./ClinicalRulePanel";
import {
	communicationDocumentTaskActionLabels,
	telegramCareRequestTaskCareTopics,
	telegramCareRequestWorkflowCareTopics,
	telegramDocumentRequestTaskDocumentKinds,
	telegramDocumentRequestWorkflowDocumentKinds,
} from "./communicationTaskData";
import { OdontogramModule } from "./components/odontogram/OdontogramModule";
import { ComparativePlannerDashboard } from "./components/plan/ComparativePlannerDashboard";
import type { CtPlanningArtifactCommand } from "./ctPlanningArtifactCommands";
import {
	type CtImplantLibraryItem,
	type CtPlanningQuickAction,
	CtPlanningToolsPanel,
	findCtPlanningQuickActionForArtifactCommand,
} from "./ctPlanningTools";
import {
	type ImagingStudyRow,
	imagingCaptureDistanceMs,
	imagingComparisonReason,
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
	type MprClinicalPreset,
	type MprProjection,
	type MprWindowPreset,
	mprAxisPresetDeg,
	mprCacheModeLabels,
	mprClinicalPresets,
	mprLoadStrategyLabels,
	mprProjectionLabels,
	mprProjectionOrientationLabels,
	mprResourceTierLabels,
	mprSeriesRequiredProjectionLabel,
	mprSlabPresetMm,
	mprToolLabels,
	mprUnavailableProjectionLabel,
	mprWindowPresetLabels,
	policyAuditEventLabels,
	pricelistParserModeLabels,
} from "./imagingUiLabels";
import { motionSafeScrollIntoView } from "./motionPreference";
import {
	buildMprClinicalChecklist,
	buildMprOperatorSummary,
	buildMprWorkbenchSummary,
	describeMprClinicalPresetProjectionFallback,
	findNearestMprClinicalPreset,
	mprClinicalNextAction,
	resolveMprClinicalPresetProjection,
} from "./mprClinicalStatus";
import {
	buildMprAxisGuidance,
	clampMprAxisDeg,
	clampMprSlabMm,
	clampMprSliceIndex,
	formatMprAxisAngleBadge,
	formatMprAxisDirectionLabel,
	formatMprAxisRangeValue,
	formatMprAxisVisualizerLabel,
	formatMprSlabBadge,
	formatMprSlabRangeValue,
	formatMprSliceBadge,
	formatMprSliceRangeValue,
	formatSignedMprStep,
	mprAxisBounds,
	mprAxisNudgeDeg,
	mprProjectionCompassLabels,
	mprSlabBounds,
	mprSlabNudgeMm,
	mprSliceFraction,
	mprSliceIndexFromFraction,
	mprSliceNudgeSteps,
	mprSlicePresetFractions,
	resolveMprKeyboardAdjustment,
} from "./mprControlMath";
import { postVisitCarePresets } from "./postVisitCareData";
import {
	dentalMaterialKindLabels,
	dentalRestorationTypeLabels,
	pricelistItemMaterialText,
	pricelistMaterialSummaryText,
	pricelistRecognitionBrandGroups,
	pricelistRecognitionServiceGroups,
	pricelistSourceKindLabels,
	pricelistWarningsText,
} from "./pricelistUiMeta";
import {
	normalizeRubAmountInput,
	validateRubAmountInput,
} from "./rubAmountInput";
import {
	imagingConnectorCards,
	imagingViewerCapabilities,
	recognitionPresets,
} from "./settingsStaticData";
import { useImagingStore } from "./store/imagingStore";
import { usePatientStore } from "./store/patientStore";
import { useScheduleStore } from "./store/scheduleStore";
import { useSettingsStore } from "./store/settingsStore";
import { useVisitStore } from "./store/visitStore";
import { specialtyQuickPhraseLibrary } from "./visitDictationData";
import {
	inferDashboardVisitSpecialty,
	inferSpecialtyFromText,
	visitSpecialtyFocusOptions,
} from "./visitSpecialtyData";
import { WorkspaceContinuityStrip } from "./workspaceContinuityStrip";
import {
	preloadWorkspaceView,
	scheduleIdleWorkspacePreload,
} from "./workspacePreload";
import { WorkspaceRouteErrorBoundary } from "./workspaceRouteErrorBoundary";
import {
	ActionIcon,
	appViews,
	getFilteredAppViews,
	viewLabels,
	WorkspaceSidebar,
	WorkspaceTopbar,
} from "./workspaceShell";
import {
	defaultTelegramPostVisitCheckupDelayDrafts,
	defaultTelegramPostVisitCheckupDelayHoursByTopic,
	postVisitCareTopicOptions,
	type TelegramPostVisitCheckupDelayDrafts,
	type TelegramPostVisitCheckupDelayKey,
	telegramFeatureHelp,
	telegramFeatureLabels,
	telegramFeatureOptions,
	telegramPostVisitCheckupDelayFields,
	telegramVisualCardFields,
} from "./workspaceStaticOptions";

import {
	appointmentLabels,
	clinicalRuleActionLabels,
	clinicalRuleSeverityLabels,
	clinicalRuleSummaryForUi,
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
	moneyDocumentKinds,
	paymentFiscalReceiptLabelForUi,
	paymentMethodLabels,
	paymentTaxYearForUi,
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
	taxPaymentPayerKeyForUi,
	taxPaymentSelectionDocumentKinds,
	taxPaymentSelectionPayloadDocumentKinds,
	treatmentStatusLabels,
	warningSeverityLabels,
	workloadStateLabels,
} from "./workspaceUiLabels";

const ImagingView = lazy(() =>
	import("./ImagingView").then((module) => ({ default: module.ImagingView })),
);
const VisitView = lazy(() =>
	import("./VisitView").then((module) => ({ default: module.VisitView })),
);
const FinanceView = lazy(() =>
	import("./FinanceView").then((module) => ({ default: module.FinanceView })),
);
const PayrollView = lazy(() =>
	import("./PayrollView").then((module) => ({ default: module.PayrollView })),
);
const AnalyticsDashboardView = lazy(() =>
	import("./pages/AnalyticsDashboardView").then((module) => ({
		default: module.AnalyticsDashboardView,
	})),
);
const CommunicationsView = lazy(() =>
	import("./CommunicationsView").then((module) => ({
		default: module.CommunicationsView,
	})),
);
const DocumentsView = lazy(() =>
	import("./DocumentsView").then((module) => ({
		default: module.DocumentsView,
	})),
);
const SettingsView = lazy(() =>
	import("./SettingsView").then((module) => ({ default: module.SettingsView })),
);
const InventoryView = lazy(() =>
	import("./components/InventoryView").then((module) => ({
		default: module.InventoryView,
	})),
);
const ScheduleView = lazy(() =>
	import("./ScheduleView").then((module) => ({ default: module.ScheduleView })),
);
const PatientsView = lazy(() =>
	import("./PatientsView").then((module) => ({ default: module.PatientsView })),
);
const ShiftView = lazy(() =>
	import("./ShiftView").then((module) => ({ default: module.ShiftView })),
);
const PatientCockpit = lazy(() =>
	import("./ShiftView").then((module) => ({ default: module.PatientCockpit })),
);
const MarketingView = lazy(() =>
	import("./MarketingView").then((module) => ({
		default: module.MarketingView,
	})),
);
const LeadsKanbanView = lazy(() =>
	import("./components/leads/LeadsKanbanView").then((module) => ({
		default: module.LeadsKanbanView,
	})),
);
const OmnichannelInboxView = lazy(() =>
	import("./components/OmnichannelInboxView").then((module) => ({
		default: module.OmnichannelInboxView,
	})),
);
const ScannerView = lazy(() =>
	import("./ScannerView").then((module) => ({ default: module.ScannerView })),
);

function speechGatewayCanUpload(status: SpeechGatewayStatus | null): boolean {
	return Boolean(
		status?.serverTranscriptionCurrentlyAvailable ??
			status?.serverTranscriptionEnabled,
	);
}

import {
	AdminSecretSessionDomain,
	AdminSecretUnlockDomain,
	AppointmentScheduleDraft,
	AppointmentScheduleSaveState,
	acceptedVisitSaveFailureIsRetryable,
	addBrowserMigrationKindToScanStats,
	addMinutesToClinicDateTimeLocal,
	aiJobKindLabels,
	aiJobKindPreferenceValues,
	appendSpeechTextWithoutDuplicateTail,
	appointmentCreateInputFromDraft,
	appointmentReadinessLabels,
	appointmentScheduleDateMissingSteps,
	appointmentScheduleDraftFromAppointment,
	appointmentScheduleDraftSignature,
	appointmentScheduleMissingFields, // return appointmentScheduleMissingFields(draft, dashboard?.clinicSettings.profile.mode);
	appointmentUpdateInputFromDraft,
	assertSpeechChunkDbStores,
	BrowserDirectoryPickerWindow,
	BrowserFileSystemDirectoryHandle,
	BrowserFileSystemFileHandle,
	BrowserFileSystemHandle,
	BrowserImagingScanOptions,
	BrowserImagingScanPhase,
	BrowserImagingScanProgress,
	BrowserImagingScanRuntime,
	BrowserMigrationFileKind,
	BrowserMigrationFolderStats,
	BrowserMigrationScanOptions,
	BrowserMigrationScanPhase,
	BrowserMigrationScanProgress,
	BrowserMigrationScanRuntime,
	BrowserMigrationScanStats,
	BrowserMigrationSourceKind,
	BrowserPickedImagingFolderPreview,
	BrowserPickedImagingScanStats,
	BrowserSpeechRecognition,
	BrowserWindowWithSpeech,
	blobToBase64,
	browserCapabilityFailureMessage,
	browserFileHasDicomMagic,
	browserGeneratedId,
	browserImagingScanDirectoryEntryLimit,
	browserImagingScanElapsedFromIso,
	browserImagingScanFileLimit,
	browserImagingScanFolderLimit,
	browserImagingScanMagicReadLimit,
	browserImagingScanNowMs,
	browserImagingScanProgressEveryMs,
	browserImagingScanProgressEveryUnits,
	browserImagingScanProgressFromStats,
	browserImagingScanYield,
	browserImagingScanYieldEveryMs,
	browserImagingScanYieldEveryUnits,
	browserLegacyMisTextPattern,
	browserLocalSourceErrorMessage,
	browserMigrationFolderHintScore,
	browserMigrationScanDirectoryEntryLimit,
	browserMigrationScanFileLimit,
	browserMigrationScanFolderLimit,
	browserMigrationScanMagicReadLimit,
	browserMigrationScanProgressEveryMs,
	browserMigrationScanProgressEveryUnits,
	browserMigrationScanProgressFromStats,
	browserMigrationScanYieldEveryMs,
	browserMigrationScanYieldEveryUnits,
	browserMigrationSourceKindFromStats,
	browserMigrationSourceTitles,
	browserPickedFolderFingerprint,
	browserPickedImagingFolderStorageKey,
	buildBrowserMigrationDiscovery,
	buildBrowserPickedImagingFolderPreview,
	buildClinicProfileUpdatePayload,
	buildOfflineVisitDraftFromTranscript,
	buildPatientAdministrativeProfilePayload,
	buildPatientCorePayload,
	CbctWorkbenchPlane,
	ClinicalToothStatus,
	ClinicalToothSurface,
	ClinicProfileDraft,
	ClinicProfileSaveState,
	classifyBrowserImagingFileName,
	classifyBrowserMigrationFileName,
	clinicalToothStatusAliases,
	clinicalToothSurfaceAliases,
	clinicLegalMissingFields,
	clinicLegalReadinessPercent,
	clinicProfileDraftFromProfile,
	clinicProfileDraftSignature,
	clinicProfileEndpoint,
	collectDicomWorkstationClientFacts,
	createBrowserImagingScanRuntime,
	createBrowserMigrationScanRuntime,
	createLocalDicomWorkbenchDraft,
	createLocalQueueId,
	ctImplantPlanFromLibraryItem,
	currentLocalDateTimeInputValue,
	DentalDesktopRuntimeWindow,
	DenteTelegramHandoffTarget,
	DenteTelegramPortalSection,
	DicomFirstFramePreviewMetadata,
	DicomFirstFramePreviewOptions,
	DicomFirstFramePreviewRequestContext,
	DicomWorkbenchIndexedDbDraft,
	DicomWorkbenchLocalDraft,
	DocumentIssueSignatureDraft,
	DocumentPayloadDraftEntry,
	DocumentPayloadDraftStore,
	DocumentPaymentSelectionEntry,
	DocumentPaymentSelectionStore,
	dateInputValuePlusDays,
	defaultAppointmentStartLocal,
	defaultClinicalToothRowsText,
	defaultDicomFirstFrameViewerState,
	defaultImagingViewerState,
	defaultStaffScheduleDraft,
	defaultUiLanguageOption,
	defaultUiPreferences,
	defaultWorkingDays,
	deleteLocalDicomWorkbenchDraftFromIndexedDb,
	deleteLocalMprWorkbenchDraftFromIndexedDb,
	deletePendingSpeechChunkFromIndexedDb,
	deletePendingVisitSaveFromIndexedDb,
	denteAdminSecretHeaderName,
	denteAdminSecretRequestHeaders,
	denteTelegramHandoffTargets,
	detectDicomRuntimeSurfaceHint,
	dicomDownloadRedactionWarning,
	dicomFirstFrameStatusLabels,
	dicomWorkbenchDraftStoreName,
	dicomWorkbenchIndexedDbKey,
	dicomWorkbenchLocalStorageKey,
	dicomWorkbenchManifestHasRedactedSource,
	dicomWorkbenchSeriesKey,
	documentDetectedKindLabel,
	documentDetectedKindLabels,
	documentIngestionQualityLabels,
	documentIssueSignatureLocalKey,
	documentIssueSignatureModeLabels,
	documentIssueSignatureStorageKey,
	documentPayloadDraftKey,
	documentPayloadDraftLocalKey,
	documentPayloadDraftStorageKey,
	documentPaymentSelectionLocalKey,
	documentPaymentSelectionStorageKey,
	documentVoidReasonLabels,
	emptyAppointmentScheduleDraft,
	emptyClinicProfileDraft,
	emptyDocumentPayloadDraftStore,
	emptyDocumentPaymentSelectionStore,
	emptyMedicalRecordExtractDocumentDraftFields,
	emptyOutpatient025uDocumentDraftFields,
	emptyPatientAdministrativeProfileDraft,
	emptyPatientCoreDraft,
	emptyTelegramVisualCardUrlDrafts,
	emptyVisitNoteForm,
	findPatient,
	formatDateTime,
	formatShortDate,
	formatTime,
	fromDateTimeLocalValue,
	hasDentalDesktopShellBridge,
	ImagingViewerLocalDraft,
	ImagingViewerPlan,
	ImagingViewerSaveState,
	ImagingViewerState,
	imagingSourceChoices,
	imagingViewerLocalKey,
	imagingViewerLocalStoragePrefix,
	imagingViewerPlans,
	importSourceLabels,
	ingestionTargetLabels,
	installmentPaymentStatusAliases,
	isAiJobKind,
	isAiRecognitionTarget,
	isAppointmentStatusFilterPreference,
	isBooleanPreference,
	isBoundedPreferenceString,
	isBrowserImagingScanAbortError,
	isBrowserMigrationScanAbortError,
	isDateInputValue,
	isDateTimeLocalInputValue,
	isDentalSpecialty,
	isDenteTelegramPortalSection,
	isDocumentIngestionTarget,
	isDocumentIssueSignatureModePreference,
	isDocumentKindPreference,
	isImagingKindFilter,
	isImagingSourceKind,
	isImportSourceKind,
	isLocalDicomDownloadPath,
	isMprProjection,
	isMprWindowPreset,
	isNullablePreferenceString,
	isNullableString,
	isOnboardingStepPreference,
	isOptionValue,
	isPaymentMethod,
	isPendingSpeechChunk,
	isPostVisitCareTopicPreference,
	isPricelistSourceKind,
	isProcedureSpecificConsentProcedurePreference,
	isRecordKey,
	isSmartImportMode,
	isStaffRole,
	isStringUnionValue,
	isTaxApplicationDeliveryChannelPreference,
	isTaxApplicationFormPreference,
	isTaxDocumentYearPreference,
	isTelegramLinkSubjectTypePreference,
	isTelegramOutboxItemDueForUi,
	isTelegramOutboxStatusFilterPreference,
	isTelegramOutboxTemplateFilterPreference,
	isUiLanguage,
	isValidDateParts,
	isVisitNoteDraft,
	isVisitNoteForm,
	LocalDicomOperationOptions,
	LocalImagingFolderDraft,
	latestPendingVisitSaveAt,
	loadBrowserPickedImagingFolderPreview,
	loadDocumentIssueSignatureDraft,
	loadDocumentPayloadDraftStore,
	loadDocumentPaymentSelection,
	loadDocumentPaymentSelectionStore,
	loadImageFromDataUrl,
	loadLocalDicomWorkbenchDraft,
	loadLocalDicomWorkbenchDraftFromLocalStorage,
	loadLocalImagingFolderDraft,
	loadLocalImagingViewerDraft,
	loadLocalMprWorkbenchDraft,
	loadLocalMprWorkbenchDraftFromLocalStorage,
	loadMedicalRecordExtractDocumentDraft,
	loadOnboardingDismissalState,
	loadOutpatient025uDocumentDraft,
	loadPendingSpeechChunks,
	loadPendingSpeechChunksFromLocalStorage,
	loadPendingVisitSaves,
	loadPendingVisitSavesFromLocalStorage,
	loadServerUiPreferences,
	loadUiPreferences,
	loadVisitLocalDraft,
	localConvenienceRetentionMs,
	localDraftString,
	localImagingFolderFingerprint,
	localImagingFolderStorageKey,
	localQueueOrganizationMatches,
	localSavedAtFresh,
	MedicalDocumentReleaseChannel,
	MedicalRecordExtractDocumentDraftFields,
	MprAxisVisualizerStyle,
	MprWorkbenchIndexedDbDraft,
	MprWorkbenchLocalDraft,
	MprWorkbenchState,
	maxPricelistImageBase64Chars,
	maybeYieldBrowserImagingScan,
	maybeYieldBrowserMigrationScan,
	medicalDocumentReleaseChannelLabels,
	mergeLocalOnboardingDismissal,
	migrateLocalDicomWorkbenchDraftFromLocalStorage,
	migrateLocalMprWorkbenchDraftFromLocalStorage,
	migratePendingVisitSavesFromLocalStorage,
	migrateSpeechChunksFromLocalStorage,
	minutesLabel,
	money,
	mprWorkbenchDraftStoreName,
	mprWorkbenchIndexedDbKey,
	mprWorkbenchLocalKey,
	mprWorkbenchLocalStoragePrefix,
	mprWorkbenchSeriesKey,
	newAppointmentDraftFromDashboard,
	newerDicomWorkbenchDraft,
	normalizeClockTime,
	normalizedAppointmentStatus,
	normalizedAppointmentStatusFilter,
	normalizedClinicalRuleAction,
	normalizedClinicalRuleSeverity,
	normalizedDentalSpecialty,
	normalizedDocumentIssueSignatureMode,
	normalizedDocumentKind,
	normalizedDocumentPaymentSelectionIds,
	normalizedDocumentVoidReasonCode,
	normalizedLocalOrganizationId,
	normalizedMedicalDocumentReleaseChannel,
	normalizedOutpatient025uCode,
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
	normalizeLocalDicomWorkbenchDraft,
	normalizeMedicalRecordExtractDocumentDraftFields,
	normalizeMprWorkbenchDraft,
	normalizeMprWorkbenchState,
	normalizeOptionalWorkingDaysDraft,
	normalizeOutpatient025uDocumentDraftFields,
	normalizePendingSpeechChunk,
	normalizePendingVisitSave,
	normalizePersistenceHealth,
	normalizeSpeechAppendText,
	normalizeTaxApplicationRelationship,
	normalizeTelegramBotUsernameDraft,
	normalizeTelegramPublicHttpsUrlDraft,
	normalizeTelegramVisualCardUrlDraftsForSave,
	normalizeUiLanguageInput,
	normalizeUiPreferencesPayload,
	normalizeWorkingDaysDraft,
	nullableAppointmentDraftValue,
	nullableClinicDraftValue,
	nullablePatientDraftValue,
	OnboardingDismissalState,
	OnboardingStep,
	Outpatient025uDemographicCode,
	Outpatient025uDocumentDraftFields,
	offlineDraftOrganizationKey,
	onboardingLocalKey,
	onboardingSteps,
	onboardingStepValues,
	onboardingStorageKey,
	onboardingTelegramVisualCardKeys,
	openSpeechChunkDb,
	operatorReadableErrorDetail,
	operatorReadableErrorDetailFromUnknown,
	operatorWorkflowFailureMessage,
	organizationScopedLocalStorageKey,
	outpatient025uDemographicCodeOptions,
	PatientAdministrativeProfileDraft,
	PatientAdministrativeProfileSaveState,
	PatientCoreDraft,
	PatientCoreSaveState,
	PaymentRefundCorrectionAction,
	PaymentRefundCorrectionMethod,
	PendingSpeechChunk,
	PendingVisitSave,
	PersistenceBackupCheck,
	PersistenceHealth,
	PersistenceIntegrityReport,
	PricelistImageMimeType,
	parseOnboardingDismissalState,
	parsePendingVisitSaveQueue,
	patientAdministrativeProfileDraftFromPatient,
	patientAdministrativeProfileDraftIssue,
	patientAdministrativeProfileDraftSignature,
	patientCoreDraftFromPatient,
	patientCoreDraftSignature,
	patientInsightRiskLabels,
	patientIntakePregnancyStatusOptions,
	patientName,
	paymentRefundCorrectionActionOptions,
	paymentRefundCorrectionMethodOptions,
	pendingSpeechChunkQueueKey,
	pendingSpeechChunkQueueLocalKey,
	pendingVisitSaveIndexedDbAvailable,
	pendingVisitSaveQueueKey,
	pendingVisitSaveQueueLocalKey,
	pendingVisitSaveStoreName,
	persistUiPreferences,
	photoVideoMaterialOptions,
	pickUiPreference,
	preparePricelistImage,
	pricelistImageMimeTypes,
	procedureSpecificConsentProcedureOptions,
	publishBrowserImagingScanProgress,
	publishBrowserMigrationScanProgress,
	putPendingSpeechChunkToIndexedDb,
	queuePendingSpeechChunk,
	queuePendingVisitSave,
	readDenteTelegramHandoffTarget,
	readFileAsDataUrl,
	readLocalDicomWorkbenchDraftFromIndexedDb,
	readLocalMprWorkbenchDraftFromIndexedDb,
	readPendingSpeechChunksFromIndexedDb,
	readPendingVisitSavesFromIndexedDb,
	recommendedActionPriorityLabels,
	redactDicomDownloadText,
	redactedDicomDownloadReferenceId,
	redactedDicomDownloadWarnings,
	redactedDicomViewerToolStateBundleForDownload,
	redactedDicomWorkbenchManifestForDownload,
	redactedLocalDicomDownloadPath,
	removeBrowserPickedImagingFolderPreview,
	removeLocalDicomWorkbenchDraft,
	removeLocalDicomWorkbenchDraftFromLocalStorage,
	removeLocalImagingFolderDraft,
	removePendingSpeechChunkById,
	requestFailureMessage,
	requiredSpeechChunkDbStoreNames,
	resolveMprWorkbenchProjection,
	responseErrorMessage,
	responseStatusFailureLabel,
	roleFocusOrder,
	SettingsTab,
	StaffScheduleDraft,
	StaffScheduleSaveState,
	saveBrowserPickedImagingFolderPreview,
	saveDocumentIssueSignatureDraft,
	saveDocumentPaymentSelection,
	saveLocalDicomWorkbenchDraft,
	saveLocalDicomWorkbenchDraftToIndexedDb,
	saveLocalDicomWorkbenchDraftToLocalStorage,
	saveLocalImagingFolderDraft,
	saveLocalImagingViewerDraft,
	saveLocalMprWorkbenchDraft,
	saveLocalMprWorkbenchDraftToIndexedDb,
	saveLocalMprWorkbenchDraftToLocalStorage,
	saveMedicalRecordExtractDocumentDraft,
	saveOnboardingDismissed,
	saveOutpatient025uDocumentDraft,
	savePendingSpeechChunksToIndexedDb,
	savePendingSpeechChunksToLocalStorage,
	savePendingVisitSaves,
	savePendingVisitSavesToIndexedDb,
	savePendingVisitSavesToLocalStorage,
	saveServerUiPreferences,
	saveUiPreferences,
	saveVisitLocalDraft,
	sensitiveLocalDraftRetentionMs,
	settingsTabFromHash,
	settingsTabs,
	smartImportModeLabels,
	sortPendingSpeechChunks,
	sortPendingVisitSaves,
	speechAudioQueueRetentionMs,
	speechChunkDbName,
	speechChunkDbPromise,
	speechChunkDbVersion,
	speechChunkIndexedDbAvailable,
	speechChunkStoreName,
	speechLocalStorageFallbackMaxBytes,
	speechProviderConnectorLabels,
	speechQualityLabels,
	staffScheduleDraftFromWorkingHours,
	staffScheduleDraftSignature,
	staffWorkingHoursFromDraft,
	staffWorkingHoursFromSimpleDraft,
	stripDenteTelegramHandoffQuery,
	TelegramFeaturePlan,
	TelegramInlineButtonPreview,
	TelegramLinkSubjectType,
	TelegramOutboxStatusFilter,
	TelegramOutboxTemplateFilter,
	taxApplicationDeliveryChannelOptions,
	taxApplicationFormOptions,
	taxApplicationRelationshipOptions,
	technicalWorkflowFailurePattern,
	telegramBlockedReasonLabels,
	telegramClassificationLabels,
	telegramDeliveryStatusLabels,
	telegramHumanMessage,
	telegramInlineButtonKindLabels,
	telegramInlineButtonRowsFromReplyMarkup,
	telegramInlineButtonsFromPreview,
	telegramInlineButtonsFromReplyMarkup,
	telegramLinkCodeStatusLabels,
	telegramModeHints,
	telegramModeLabels,
	telegramOutboxStatusFilterLabels,
	telegramOutboxStatusFilterOptions,
	telegramOutboxTemplateFilterLabels,
	telegramOutboxTemplateFilterOptions,
	telegramPrivacyModeHints,
	telegramPrivacyModeLabels,
	telegramPublicUrlSensitivePathSegments,
	telegramPublicUrlSensitiveQueryKeys,
	telegramQrSvgToDataUrl,
	telegramTemplateLabels,
	telegramWarningLabels,
	throwIfBrowserImagingScanAborted,
	throwIfBrowserMigrationScanAborted,
	timeZoneDateParts,
	timeZoneOffsetMinutes,
	timeZoneOffsetSuffix,
	toDateInputValue,
	toDateTimeLocalValue,
	todayDateInputValue,
	toothRows,
	toothStateByCode,
	treatmentAcceptanceVariantOptions,
	UiLanguageOption,
	UiPreferences,
	UiPreferencesInput,
	uiLanguageLabels,
	uiLanguageOptions,
	uiPreferencesServerPath,
	uiPreferencesStorageKey,
	uiPreferencesSyncErrorMessage,
	uniqueDicomDownloadWarnings,
	VisitLocalDraft,
	VisitNoteField,
	VisitNoteForm,
	validClockTime,
	viewerWindowPresetForStudy,
	viewFromHash,
	visitDraftMissingFieldLabel,
	visitDraftMissingFieldLabels,
	visitDraftQualityLabels,
	visitDraftSignalLabel,
	visitDraftSignalLabels,
	visitLocalDraftKey,
	visitNoteDraftFromForm,
	visitNoteFieldDefinitions,
	visitNoteFormFromDraft,
	visitNoteFormFromVisit,
	visitSaveReceiptText,
	WorkflowResponseError,
	weekdayFromDateInput,
	weekdayOptions,
	withSavedUiPreferenceTimestamp,
	workspaceScopeLabels,
	xrayPregnancyStatusOptions,
	xrayPriorityOptions,
	xrayStudyTypeOptions,
} from "./AppHelpers";

export function App() {
	useEffect(() => {
		// App is the root component; global state does not need cleanup on page unmount.
	}, []);

	const selectedPatientId = usePatientStore((s) => s.selectedPatientId);
	const workspaceProfile = useWorkspaceProfileStore();
	const themeMode = useThemeStore((s) => s.themeMode);
	const isDark =
		themeMode === "dark" ||
		(themeMode === "auto" &&
			(new Date().getHours() < 7 || new Date().getHours() >= 19));

	// Load workspace feature flags once on mount
	useEffect(() => {
		loadWorkspaceProfile();
	}, []);

	useEffect(() => {
		if (selectedPatientId) {
			useVisitStore.getState().reset();
			(useDocumentStore.getState() as any).reset();
			useImagingStore.getState().reset();
			usePatientStore.setState({ odontogramState: {} });
		}
	}, [selectedPatientId]);

	// Topbar dictation shortcut must open the visit dictation area: goToVisitDictation, scrollToVisitArea(".dictation-box")

	const appLogicProps = useAppLogic();
	const {
		acceptDraftToVisit,
		activeAppointment,
		activeChair,
		activeCommunicationTasks,
		activeDoctor,
		activeDocuments,
		activeImagingStudies,
		activeIssuedPaidContracts,
		activePatient,
		activePatientCallablePhone,
		activePatientHasCallablePhone,
		activePatientInsight,
		activePayments,
		activeQueueRole,
		activeRolePolicy,
		activeRoleQueue,
		activeRoleRestrictedSections,
		activeRoleWritableSections,
		activeSettingsTabButtonRef,
		activeSpeechProviderHealth,
		activeTreatmentPlanItems,
		activeTreatmentPlanScenarios,
		activeUsableDocuments,
		activeVisitClinicalRuleEvaluations,
		activeVisitClinicalRuleSummary,
		activeWorkspaceProfile,
		addChair,
		addImagingViewerNoteAnnotation,
		addMigrationDiscoveryCandidateToSmartImport,
		addStaffMember,
		updateStaffMember,
		analyzePricelist,
		appendToTranscript,
		applyCtPlanningQuickAction,
		applyMprClinicalPreset,
		applyNearestMprClinicalPreset,
		applyPostVisitCarePreset,
		applyProtocolTemplate,
		applyProtocolTemplateDirectly,
		appointmentLabels,
		appointmentReadinessById,
		appointmentReadinessLabels,
		appointmentScheduleDraftFromAppointment,
		attachPricelistImage,
		browserCanRequestPersistentStorage,
		browserContinuity,
		browserContinuityChecks,
		browserContinuityCritical,
		browserContinuityState,
		browserContinuityValue,
		browserDirectoryInputRef,
		browserDirectoryPickerAvailable,
		browserImagingScanProgress,
		browserMigrationDiscovery,
		browserMigrationInputRef,
		browserMigrationScanProgress,
		browserPickedImagingFolder,
		buildDicomFolderWorkupPlan,
		buildDicomRenderCachePlan,
		buildDicomViewerLaunchManifest,
		buildDicomViewerToolStateBundle,
		buildDicomViewerWorkbenchManifest,
		buildDraft,
		buildOfflineDraft,
		canRetryImagingViewerSave,
		cancelBrowserImagingFolderScan,
		cancelBrowserMigrationScan,
		cancelLocalDicomOperation,
		cbctWorkbenchPlanes,
		cbctWorkbenchProjections,
		cbctWorkbenchSeries,
		cbctWorkbenchTools,
		chairScheduleDirtyIds,
		chairScheduleDrafts,
		chairScheduleSaveStates,
		chairScheduleSavingId,
		changeClinicMode,
		changePostVisitCareTopic,
		checkDicomWebConnector,
		checkDicomWorkstationReadiness,
		chooseRecognitionPreset,
		clampMprAxisDeg,
		clampMprSlabMm,
		clampMprSliceIndex,
		clearBrowserPickedImagingFolderPreview,
		clearDicomWorkbenchRecovery,
		clearLocalImagingFolderRecovery,
		clearPricelistImage,
		clearTranscriptWithUndo,
		clearedTranscriptSnapshot,
		clinicModeLabels,
		clinicProfileDraft,
		clinicProfileSaveState,
		clinicPublicLookup,
		clinicalRuleActionLabels,
		clinicalRuleSeverityLabels,
		closeAppointmentEditor,
		commitImagingImport,
		commitImport,
		commitSmartImport,
		communicationChannelLabels,
		communicationDocumentTaskActionLabels,
		communicationIntentLabels,
		communicationNote,
		communicationPriorityLabels,
		communicationSavingTaskId,
		communicationStatusLabels,
		compactDocumentText,
		completeCommunicationTask,
		completedActContractReferenceForUi,
		completedActFiscalReceiptLines,
		completedActPaidRubValue,
		confirmDocumentIssue,
		confirmDocumentVoid,
		continueOnboardingInDraftMode,
		copyTelegramTextToClipboard,
		createAppointmentFromDraft,
		createClinicalRuleFromSettings,
		createCtPlanningArtifact,
		createDocument,
		createImagingStudy,
		createPatient,
		createTelegramLinkCode,
		ctPlanningActiveQuickActionId,
		ctPlanningAnnotationRefs,
		ctPlanningImplantPlan,
		currentOnboardingIndex,
		currentView,
		dashboard,
		defaultDicomFirstFrameViewerState,
		defaultImagingViewerState,
		dentalMaterialKindLabels,
		dentalRestorationTypeLabels,
		describeMprClinicalPresetProjectionFallback,
		dicomDiagnosticPixelPolicyLabels,
		dicomExecutionLaneLabels,
		dicomFirstFrameImageStyle,
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
		dicomWorkbenchSourceIsRedacted,
		dicomWorkstationReadiness,
		dictationQuickPhrases,
		discoverDicomFolders,
		discoverMigrationSources,
		dismissOnboarding,
		documentActionLabels,
		documentDetectedKindLabel,
		documentFactoryGroups,
		documentIngestion,
		documentIngestionQualityLabels,
		documentIngestionTarget,
		documentIssueAttestationReady,
		documentIssueConfirmation,
		documentIssueSignatureModeLabels,
		documentKindsForCommunicationTask,
		documentLabels,
		documentPatient,
		documentSourceStatusClassNames,
		documentStatusLabels,
		documentVoidConfirmation,
		documentVoidReady,
		documentVoidReasonLabels,
		downloadDicomViewerToolStateBundle,
		downloadDicomWorkbenchManifest,
		downloadIssuedDocumentHtml,
		downloadIssuedDocumentPdf,
		downloadMigrationHandoffReport,
		downloadPersistenceExport,
		downloadSmartImportReport,
		downloadSmartImportSafeHandoffReport,
		downloadTaxDocumentXml,
		downloadTelegramQrSvg,
		draft,
		editingAppointmentId,
		eligiblePaymentReceiptPayments,
		eligibleRefundCorrectionPayments,
		eligibleTaxPayments,
		emptyDictationVoiceActionLabel,
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
		handleBrowserDirectoryInputChange,
		handleBrowserMigrationInputChange,
		handleMprKeyboardNavigation,
		hasVisitTranscriptText,
		hiddenTelegramOutboxItemCount,
		imagingComparisonCandidates,
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
		imagingKindOptions,
		imagingPreviewSource,
		imagingSourceChoices,
		imagingSourceDetails,
		imagingSourceLabels,
		imagingViewerActiveTool,
		imagingViewerAnnotations,
		imagingViewerCapabilities,
		imagingViewerHref,
		imagingViewerImageStyle,
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
		inferredTreatmentArea,
		ingestImportFile,
		ingestionTargetLabels,
		installmentScheduleBaseDocumentTitleValue,
		installmentScheduleInstallmentRows,
		installmentSchedulePrepaidRubValue,
		installmentScheduleRemainingRubValue,
		installmentScheduleTotalRubValue,
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
		isPricelistAnalyzing,
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
		issuedMedicalCopyRequestDocuments,
		lastLocalSavedAt,
		lastPendingVisitSaveAt,
		lastServerDraftSavedAt,
		lastVisitSaveReceipt,
		latestDicomWorkbenchServerBundle,
		legalMissingFields,
		legalReadinessPercent,
		loadDocumentAuditFacts,
		loadLocalBridgeUsePlans,
		loadMoreTelegramChatLinks,
		loadMoreTelegramLinkCodes,
		loadMoreTelegramOutbox,
		loadPersistenceHealth,
		loadPersistenceIntegrity,
		loadTelegramControlPlane,
		localBridgeReadiness,
		localBridgeStatusLabels,
		localBridgeStatusState,
		localBridgeStatusValue,
		localBridgeUsePathLabels,
		localBridgeUsePlans,
		localDraftWasRestored,
		localImagingFolderDraft,
		localImagingModelRoleLabels,
		localImagingOrganizer,
		localImagingOrganizerActionLabels,
		lockTelegramAdminSession,
		lookupClinicPublicProfile,
		markPostVisitManualEdited,
		markTelegramSettingsDirty,
		medicalDocumentReleaseChannelLabels,
		migrationAutopilot,
		migrationSourceDiscovery,
		migrationSourceProbe,
		migrationSourceWorkup,
		minorConsentDiagnosisOrIndicationValue,
		minorConsentInterventionScopeValue,
		minorConsentPatientBirthDateValue,
		minorConsentPatientFullNameValue,
		minorRepresentativeFullNameValue,
		minorRepresentativeIdentityDocumentValue,
		minorRepresentativePhoneValue,
		minorRepresentativeRelationshipValue,
		money,
		mostLoadedResource,
		moveOnboardingTo,
		mprActiveProjectionLabel,
		mprActiveProjectionOrientation,
		mprAxisAngleBadge,
		mprAxisBounds,
		mprAxisDeg,
		mprAxisDirectionLabel,
		mprAxisGuidance,
		mprAxisNudgeDeg,
		mprAxisPresetDeg,
		mprAxisRangeValue,
		mprAxisVisualizerLabel,
		mprAxisVisualizerStyle,
		mprCacheModeLabels,
		mprClinicalChecklist,
		mprClinicalNextStep,
		mprClinicalPresetButtonClass,
		mprClinicalPresets,
		mprControlsAutoOpen,
		mprControlsReady,
		mprCrosshairEnabled,
		mprLinkedPlanesEnabled,
		mprLoadStrategyLabels,
		mprNearestClinicalPreset,
		mprOperatorSummaryCards,
		mprProjection,
		mprProjectionCompass,
		mprProjectionLabels,
		mprResourceTierLabels,
		mprSafeSliceIndex,
		mprSeriesRequiredProjectionLabel,
		mprSlabBadge,
		mprSlabBounds,
		mprSlabMm,
		mprSlabNudgeMm,
		mprSlabPresetMm,
		mprSlabRangeValue,
		mprSliceBadge,
		mprSliceIndex,
		mprSliceIndexFromFraction,
		mprSliceLabel,
		mprSliceMaxIndex,
		mprSliceNudgeSteps,
		mprSlicePresetFractions,
		mprSliceRangeValue,
		mprToolLabels,
		mprUnavailableProjectionLabel,
		mprWindowPreset,
		mprWindowPresetLabels,
		mprWorkbenchDraftRestored,
		mprWorkbenchLocalSavedAt,
		mprWorkbenchSummaryText,
		newAppointmentError,
		newChairHasMicroscope,
		newChairHasSurgeryKit,
		newChairHasXraySensor,
		newChairName,
		newChairReadyToCreate,
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
		newStaffReadyToCreate,
		newStaffRole,
		newStaffSpecialty,
		nextOnboardingStep,
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
		onboardingBlockingIssues,
		onboardingChairCreateGuidanceId,
		onboardingDismissed,
		onboardingDocumentReadinessIssues,
		onboardingDocumentsReady,
		onboardingDraftMode,
		onboardingFinishGuidanceId,
		onboardingReadyToFinish,
		onboardingStaffCreateGuidanceId,
		onboardingStep,
		onboardingSteps,
		onboardingTelegramRecommendations,
		onboardingTelegramVisualCardKeys,
		openAppointmentEditor,
		openCommunicationTaskDocumentWorkflow,
		openIssuedDocumentHtml,
		openOnboardingGuide,
		openScheduleWarning,
		openVisitWarningAction,
		organizeLocalImagingSources,
		outpatient025uMedicalCardNumberValue,
		paidContractTotalRubValue,
		patientAdministrativeProfileValidationMessage,
		patientBillingSummary,
		patientClinicalRuleEvaluations,
		patientClinicalRuleSummary,
		patientInsightById,
		patientInsightRiskLabels,
		patientIntakePregnancyStatusOptions,
		patientName,
		paymentAmount,
		paymentFeedback,
		paymentFiscalCashierName,
		paymentFiscalFd,
		paymentFiscalFn,
		paymentFiscalFpd,
		paymentFiscalReceiptIssuedAt,
		paymentFiscalReceiptLabelForUi,
		paymentFiscalReceiptNumber,
		paymentFiscalReceiptUrl,
		paymentInvoiceTotalRubValue,
		paymentMethod,
		paymentMethodLabels,
		paymentPatientContextMessage,
		paymentPatientContextReady,
		paymentPayerBirthDate,
		paymentPayerFullName,
		paymentPayerIdentityDocument,
		paymentPayerInn,
		paymentPayerRelationship,
		paymentReceiptFiscalReceiptLines,
		paymentReceiptIssuedByValue,
		paymentReceiptPayerBirthDateValue,
		paymentReceiptPayerFullNameValue,
		paymentReceiptPayerIdentityDocumentValue,
		paymentReceiptPayerInnValue,
		paymentReceiptPayerRelationshipValue,
		paymentTaxDeductionCode,
		pendingSpeechChunkCount,
		pendingSpeechFlushActionLabel,
		pendingSpeechFlushActionTitle,
		pendingVisitSaveCount,
		persistenceHealth,
		persistenceIntegrity,
		photoVideoMaterialOptions,
		pickBrowserImagingFolder,
		pickBrowserMigrationSource,
		planMigrationDiscoveryCandidate,
		plannedServiceLinesForFinancialPayload,
		policyAuditEventLabels,
		polishTranscript,
		polishingField,
		polishSingleField,
		postVisitCareTopicOptions,
		preloadWorkspaceView,
		prepareDicomWorkbenchFromFolder,
		previewDicomFirstFrame,
		previewDicomFirstFrameSlice,
		previewDicomSeries,
		previewImagingImport,
		previewImport,
		previewMigrationAutopilotSources,
		previewMigrationDiscoveryCandidate,
		previewSmartImport,
		previewTelegramTemplate,
		previousOnboardingStep,
		pricelistAnalysis,
		pricelistImageBase64,
		pricelistImageName,
		pricelistImageNote,
		pricelistItemMaterialText,
		pricelistMaterialSummaryText,
		pricelistParserModeLabels,
		pricelistRecognitionBrandGroups,
		pricelistRecognitionServiceGroups,
		pricelistSourceKind,
		pricelistSourceKindLabels,
		pricelistText,
		pricelistWarningsText,
		primaryVisitWarning,
		probeMigrationDiscoveryCandidate,
		procedureSpecificConsentProcedureOptions,
		query,
		recognitionJob,
		recognitionKind,
		recognitionPresets,
		recognitionTarget,
		recognitionTargetLabels,
		recognitionText,
		recommendedActionPriorityLabels,
		reconnectDicomWorkbenchFromCurrentFolder,
		recordPayment,
		refreshBrowserContinuity,
		refreshSpeechRuntime,
		releaseProtectionNote,
		rememberLocalImagingFolder,
		renderClinicalToothRowsEditor,
		reopenOnboarding,
		requestBrowserStoragePersistence,
		requestDocumentIssue,
		requestDocumentVoid,
		resetMprControls,
		resetNewAppointmentDraft,
		restoreDicomWorkbenchServerBundle,
		restoreMprWorkbenchLocalDraft,
		retryImagingViewerSessionSave,
		revokeTelegramChatLink,
		roleFocusOrder,
		runMigrationAutopilot,
		runRecognitionJob,
		saveAppointmentSchedule,
		saveChairSchedule,
		saveClinicProfileFromDraft,
		saveDicomWorkbenchBundleToServer,
		savePatientAdministrativeProfile,
		savePatientCore,
		saveStaffSchedule,
		saveTelegramSettings,
		scanDicomFolderSeries,
		scanImagingFolder,
		scenarioPriorityLabels,
		scenarioStrategyLabels,
		scheduleAdminSecretDraft,
		scheduleAdminSecretSession,
		scrollToVisitArea,
		selectAllEligibleTaxPaymentsForCurrentDocument,
		selectCtPlanningImplant,
		selectRefundOriginalPayment,
		selectedCompletedActContractDocumentId,
		selectedDocumentMetadata,
		selectedDocumentUsesTaxPaymentSelection,
		selectedEligibleTaxPayments,
		selectedImagingStudy,
		selectedImagingViewerPlan,
		selectedPatient,
		selectedPaymentReceiptIdSet,
		selectedPaymentReceiptPayments,
		selectedPaymentReceiptTotalRub,
		selectedProtocolTemplate,
		selectedRefundCorrectionPayment,
		selectedReleaseSourceRequestDocumentId,
		selectedSpecialty,
		selectedTaxDocumentPayerKey,
		selectedTaxPaymentIdSet,
		selectedTaxPaymentTotalRub,
		selectedUiLanguageOption,
		selectedWorkspaceRole,
		sendDueTelegramOutbox,
		sendRecognitionResultToImport,
		sendTelegramOutboxItem,
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
		setPricelistAnalysis,
		setPricelistSourceKind,
		setPricelistText,
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
		setUsePricelistAi,
		settingsAdminSecretDomain,
		settingsAdminSecretDraft,
		settingsAdminSecretSession,
		settingsTab,
		settingsTabs,
		shiftWarnings,
		showAdministrationTopActions,
		showDoctorVisitShortcut,
		showFullOnboardingGuide,
		smartImportCommit,
		smartImportMode,
		smartImportModeLabels,
		smartImportPreview,
		smartImportText,
		sortedAppointments,
		sortedCommunicationTasks,
		specialtiesWithTemplates,
		specialtyLabels,
		specialtyProtocolTemplates,
		speechGatewayActiveProviderIsLocal,
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
		speechRecognitionReady,
		speechRecordingPathLabels,
		speechRecordingRecovery,
		speechRecordingStrategy,
		speechRecoveryStateLabels,
		speechStatusNote,
		speechTranscriptionBusy,
		speechLiveRms,
		staffRoleLabels,
		staffScheduleDirtyIds,
		staffScheduleDraftFromWorkingHours,
		staffScheduleDrafts,
		staffScheduleSaveStates,
		staffScheduleSavingId,
		stageLocalImagingFolderRecovery,
		startImportDictation,
		startServerVoiceRecording,
		startVisitDictation,
		stopServerVoiceRecording,
		structuredPayloadDocumentKinds,
		taxApplicationDeliveryChannelOptions,
		taxApplicationFormOptions,
		taxApplicationRelationshipOptions,
		taxDocumentPayerOptions,
		telegramAdminSecretDraft,
		telegramAdminSecretSession,
		telegramAllowVoiceIntakeDraft,
		telegramBotConfigId,
		telegramBotUsernameDraft,
		telegramChatLinkLedger,
		telegramChatLinks,
		telegramClassificationLabels,
		telegramDeliveryStatusLabels,
		telegramEnabledFeaturesDraft,
		telegramFeatureHelp,
		telegramFeatureLabel,
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
		toggleChairWorkingDay,
		toggleClinicWorkingDay,
		toggleClinicalRule,
		togglePhotoVideoMaterial,
		toggleStaffWorkingDay,
		toggleTelegramFeature,
		toothRows,
		toothStateByCode,
		setToothState,
		transcript,
		treatmentAcceptancePlannedTotalRub,
		treatmentEstimatePatientOrPayerFullNameValue,
		treatmentEstimateTotalRubValue,
		treatmentEstimateTreatmentBasisValue,
		treatmentStatusLabels,
		uiLanguage,
		uiLanguageOptions,
		uiPreferencesSyncError,
		undoTranscriptClear,
		unlockTelegramAdminSession,
		updateAppointmentScheduleDraft,
		updateChairScheduleDay,
		updateChairScheduleDraft,
		updateClinicProfileDraft,
		updateNewAppointmentDraft,
		updatePatientAdministrativeProfileDraft,
		updatePatientCoreDraft,
		updateStaffScheduleDay,
		updateStaffScheduleDraft,
		updateTelegramPostVisitCheckupDelayDraft,
		updateTelegramVisualCardUrlDraft,
		updateVisitNoteField,
		usePricelistAi,
		viewLabels,
		visibleImagingStudies,
		visibleRecommendedActions,
		visibleScheduleSuggestions,
		visibleTelegramOutboxItems,
		visibleVisitSpecialtyFocusOptions,
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
		visitPrimaryAction,
		visitSafetyCards,
		visitSaveReceiptText,
		visitWarnings,
		visitWorkflowSteps,
		warningSeverityLabels,
		warrantyLinkedActOrContractValue,
		warrantyServiceOrWorkNameValue,
		warrantyTeethOrAreaValue,
		weekdayOptions,
		workspaceScopeLabels,
		xrayPregnancyStatusOptions,
		xrayStudyTypeOptions,

		accessUnlockRequired,
		accessUnlockMessage,
		clinicalAdminSecretDraft,
		setClinicalAdminSecretDraft,
		loadDashboard,
		operatorWorkflowFailureMessage,
		handleSelectDemoMode,
		handleSelectZeroMode,
		setSelectedPatientId,
		setScheduleDateFilter,
		scheduleDateFilter,
		handleFinishOnboarding,
	} = appLogicProps;

	useEffect(() => scheduleIdleWorkspacePreload(currentView), [currentView]);

	// Reset scroll when switching views
	useEffect(() => {
		window.scrollTo(0, 0);
		const container =
			document.getElementById("workspace-content") ||
			document.querySelector(".workspace");
		if (container) {
			container.scrollTop = 0;
		}
	}, [currentView]);

	const [resetting, setResetting] = useState(false);

	// --- DUAL-TIER AUTH STATE ---
	const [clinicAuthed, setClinicAuthed] = useState<boolean>(() => {
		return (
			typeof window !== "undefined" &&
			!!localStorage.getItem("dente_clinic_token")
		);
	});
	const [staffAuthed, setStaffAuthed] = useState<boolean>(() => {
		return (
			typeof window !== "undefined" &&
			!!localStorage.getItem("dente_staff_token")
		);
	});
	const [showStaffPinPad, setShowStaffPinPad] = useState<boolean>(false);
	const [activeStaffUser, setActiveStaffUser] = useState<any>({ role: "admin", name: "Screenshot Bot" });

	// On mount: if clinic token already in localStorage (page refresh / persisted session), load dashboard + restore user profile
	useEffect(() => {
		if (clinicAuthed && !dashboard) {
			void loadDashboard().catch((e) => {
				console.warn(
					"[Dente] loadDashboard failed but staying logged in for visual audit.",
					e,
				);
			});
		}
		// Restore staff user profile from token on page refresh
		const staffToken = localStorage.getItem("dente_staff_token");
		if (staffToken && (!activeStaffUser || activeStaffUser.name === "Screenshot Bot")) {
			fetch("/api/auth/user/me", {
				headers: { "x-dente-staff-token": staffToken },
			})
				.then((r) => (r.ok ? r.json() : null))
				.then((data) => {
					if (data?.user) setActiveStaffUser(data.user);
				})
				.catch(() => {
					/* silent - user will be prompted to re-login */
				});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Run once on mount only

	// Auto-lock on inactivity (5 minutes)
	useEffect(() => {
		if (!clinicAuthed) return;
		let timer: ReturnType<typeof setTimeout>;
		const resetTimer = () => {
			clearTimeout(timer);
			timer = setTimeout(
				() => {
					setStaffAuthed(false);
					setShowStaffPinPad(true);
					localStorage.removeItem("dente_staff_token");
				},
				5 * 60 * 1000,
			);
		};
		const events = ["mousemove", "keydown", "pointerdown", "touchstart"];
		events.forEach((e) =>
			document.addEventListener(e, resetTimer, { passive: true }),
		);
		resetTimer();
		return () => {
			clearTimeout(timer);
			events.forEach((e) => document.removeEventListener(e, resetTimer));
		};
	}, [clinicAuthed]);

	const handleClinicLogout = () => {
		localStorage.removeItem("dente_clinic_token");
		localStorage.removeItem("dente_staff_token");
		setClinicAuthed(false);
		setStaffAuthed(false);
		setShowStaffPinPad(false);
		setActiveStaffUser(null);
	};

	const handleLockSession = () => {
		localStorage.removeItem("dente_staff_token");
		setStaffAuthed(false);
		setShowStaffPinPad(true);
	};

	// Show clinic login gate if not authed
	if (!clinicAuthed) {
		return (
			<AuthHub
				onSuccess={(cp, up) => {
					setClinicAuthed(true);
					if (up) {
						setStaffAuthed(true);
						setActiveStaffUser(up);
					}
					void loadDashboard();
				}}
			/>
		);
	}

	if (accessUnlockRequired && !dashboard) {
		return (
			<AppUnlockState
				accessMessage={accessUnlockMessage}
				adminSecretDraft={clinicalAdminSecretDraft}
				onAdminSecretChange={setClinicalAdminSecretDraft}
				onUnlock={() => unlockTelegramAdminSession("all")}
			/>
		);
	}

	// Show staff PIN pad if clinic authed but no staff session (or after lock)
	if (!staffAuthed || showStaffPinPad) {
		if (!dashboard) {
			return <AppLoadingState message="Загрузка данных клиники..." />;
		}
		return (
			<StaffPinPad
				staffMembers={dashboard.clinicSettings?.staff ?? []}
				onUnlockSuccess={(user) => {
					setActiveStaffUser(user);
					setStaffAuthed(true);
					setShowStaffPinPad(false);
				}}
				onClinicLogout={handleClinicLogout}
			/>
		);
	}

	if (window.location.hash === "#/odontogram") {
		return (
			<div
				style={{
					backgroundColor: "transparent",
					minHeight: "100vh",
					padding: "2rem",
					width: "100vw",
					overflowX: "hidden",
					boxSizing: "border-box",
				}}
			>
				<Suspense fallback={<AppLoadingState message="Загрузка..." />}>
					<OdontogramModule
						patientId="00000000-0000-0000-0000-000000000001"
						pediatricMode={dashboard?.clinicSettings?.profile?.hasPediatricMode}
					/>
				</Suspense>
			</div>
		);
	}

	if (window.location.hash === "#/plans") {
		return (
			<div
				style={{
					backgroundColor: "transparent",
					minHeight: "100vh",
					padding: "2rem",
					width: "100vw",
					overflowX: "hidden",
					boxSizing: "border-box",
				}}
			>
				<Suspense fallback={<AppLoadingState message="Загрузка..." />}>
					<ComparativePlannerDashboard />
				</Suspense>
			</div>
		);
	}

	if (window.location.hash === "#/portal") {
		return (
			<div
				style={{ backgroundColor: "var(--dente-bg-primary)", width: "100vw" }}
			>
				<PatientPortal />
			</div>
		);
	}

	if (window.location.hash.startsWith("#/portal/lab-order/")) {
		return (
			<div
				style={{ backgroundColor: "var(--dente-bg-primary)", width: "100vw" }}
			>
				<GuestLabPortal />
			</div>
		);
	}

	if (error && !dashboard) {
		return (
			<AppLoadingState
				message={`Рабочий сервер недоступен: ${error}`}
				actionLabel="Повторить загрузку"
				onAction={() => {
					setError(null);
					void loadDashboard().catch((loadError: unknown) => {
						setError(
							operatorWorkflowFailureMessage(
								"Не удалось загрузить данные клиники",
								loadError,
							),
						);
					});
				}}
			/>
		);
	}

	if (!dashboard) {
		return <AppLoadingState message="Загрузка рабочей смены" />;
	}

	// Show onboarding wizard on first run (after dashboard is loaded)
	if (workspaceProfile.loaded && (!workspaceProfile.onboardingCompleted || localStorage.getItem("force_onboarding") === "true")) {
		return (
			<AppLogicProvider value={appLogicProps}>
				<OnboardingSetupWizard
					isDark={isDark}
					onComplete={() => {
						useWorkspaceProfileStore
							.getState()
							.setFlag("onboardingCompleted", true);
						loadWorkspaceProfile();
						loadDashboard();
					}}
				/>
			</AppLogicProvider>
		);
	}

	return (
		<AppLogicProvider value={appLogicProps}>
			<main className="app-shell">
				<TourEngine />
				<HelpHUD />
				<WebSocketManager />
				<a className="skip-link" href="#workspace-content">
					Перейти к рабочей области
				</a>
				<WorkspaceSidebar
					currentView={currentView}
					onViewIntent={preloadWorkspaceView}
					role={selectedWorkspaceRole}
					clinicMode={dashboard?.clinicSettings?.profile?.mode || "network_clinic"}
				/>

				<section
					className={`workspace view-${currentView}`}
					id="workspace-content"
					tabIndex={-1}
					aria-label="Рабочая область"
				>
					{dashboard?.clinicName === "Стоматология, 1 кабинет" && (
						<div className="default-clinic-banner" role="alert">
							<div className="banner-content">
								<span className="banner-icon" aria-hidden="true">
									🚀
								</span>
								<p>
									<strong>Демо-режим.</strong> Тестовые данные загружены. Для
									настройки своей клиники нажмите «Запустить мастер».
								</p>
							</div>
							<button
								className="primary-button banner-btn"
								type="button"
								onClick={reopenOnboarding}
							>
								Запустить мастер
							</button>
						</div>
					)}
					<WorkspaceTopbar
						clinicName={dashboard.clinicName}
						onGoToDictation={goToVisitDictation}
						onGoToSchedule={() => {
							window.location.hash = "schedule";
						}}
						onGoToVisit={() => {
							window.location.hash = "visit";
						}}
						onReopenOnboarding={reopenOnboarding}
						onRoleChange={setSelectedWorkspaceRole}
						onViewIntent={preloadWorkspaceView}
						roleFocusOrder={roleFocusOrder}
						selectedWorkspaceRole={selectedWorkspaceRole}
						showAdministrationTopActions={showAdministrationTopActions}
						showDoctorVisitShortcut={showDoctorVisitShortcut}
						staffRoleLabels={staffRoleLabels}
						todayIso={dashboard.todayIso}
						onLockSession={handleLockSession}
						activeTasksCount={
							dashboard?.communicationTasks?.filter(
								(t: any) => t.status === "open",
							).length || 0
						}
						isOmniRoleMode={dashboard.clinicSettings?.profile?.isOmniRole}
						onQuickConsult={handleQuickConsult}
						isQuickConsultLoading={isQuickConsultLoading}
					/>
					<WorkspaceContinuityStrip
						browserContinuityCritical={browserContinuityCritical}
						browserWarnings={browserContinuity?.warnings ?? []}
						isOnline={isOnline}
						isPendingVisitSyncing={isPendingVisitSyncing}
						onCheckDevice={() =>
							void refreshBrowserContinuity({ silent: false })
						}
						onFlushSpeech={() =>
							void flushPendingSpeechChunks({ silent: false })
						}
						onFlushVisit={() => void flushPendingVisitSaves({ silent: false })}
						pendingSpeechChunkCount={pendingSpeechChunkCount}
						pendingVisitSaveCount={pendingVisitSaveCount}
					/>
					{error ? (
						<section className="app-notice" role="alert" aria-live="assertive">
							<AlertTriangle aria-hidden="true" />
							<p>{error}</p>
							<button
								className="secondary-button"
								type="button"
								onClick={() => setError(null)}
							>
								Понятно
							</button>
						</section>
					) : null}
					{!error && uiPreferencesSyncError ? (
						<section className="app-notice" role="alert" aria-live="assertive">
							<AlertTriangle aria-hidden="true" />
							<p>{uiPreferencesSyncError}</p>
							<button
								className="secondary-button"
								type="button"
								onClick={() => setUiPreferencesSyncError(null)}
							>
								Понятно
							</button>
						</section>
					) : null}
					{!error && !uiPreferencesSyncError && telegramHandoffNotice ? (
						<section
							className="app-notice telegram-handoff-notice"
							role="status"
							aria-live="polite"
						>
							<Bot aria-hidden="true" />
							<p>
								Открыто из Telegram:{" "}
								<strong>{telegramHandoffNotice.title}</strong>.{" "}
								{telegramHandoffNotice.detail} Ссылка не содержит пациента,
								документ, запись или оплату.
							</p>
							<button
								className="secondary-button"
								type="button"
								onClick={() => setTelegramHandoffNotice(null)}
							>
								Понятно
							</button>
						</section>
					) : null}
					<WorkspaceOnboardingNoticeBars />
					{!showFullOnboardingGuide ? (
						<>
							<AppRouter />

							<VoiceAssistantUI 
								onNavigate={(view) => {
									setCurrentView(view);
									window.location.hash = view;
								}}
								onSearchQuery={(q) => {
									setQuery(q);
								}}
								onDateChange={(date) => {
									setScheduleDateFilter(date);
								}}
							/>
						</>
					) : null}
					<Omnibar />
				</section>
				<IncomingCallToast />
			</main>
		</AppLogicProvider>
	);
}

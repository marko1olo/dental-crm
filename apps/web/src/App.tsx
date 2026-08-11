import type {
	ClinicMode,
	DentalSpecialty,
	DocumentIngestionTarget,
	ImportSourceKind,
	PricelistSourceKind,
	SmartImportMode,
	SpeechGatewayStatus,
	StaffRole,
} from "@dental/shared";
import {
	AlertTriangle,
	ArrowRight,
	Bot,
	CalendarDays,
	Check,
	CheckCircle2,
	ClipboardCheck,
	Database,
	ExternalLink,
	FlipHorizontal,
	Image as ImageIcon,
	Mic,
	Plus,
	RefreshCw,
	RotateCcw,
	RotateCw,
	ShieldCheck,
	Sparkles,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { AppLoadingState, AppUnlockState } from "./AppBootState";
import { browserContinuityRegistrationLabels } from "./browserContinuity";
import { ClinicalRulePanel } from "./ClinicalRulePanel";
import { AuthHub } from "./components/auth/AuthHub";
import { StaffPinPad } from "./components/auth/StaffPinPad";
import { CommandPalette } from "./components/CommandPalette";
import { showToast } from "./components/GlobalToast";
import { IncomingCallToast } from "./components/IncomingCallToast";
import { Omnibar } from "./components/Omnibar";
import { VoiceAssistantUI } from "./components/VoiceAssistantUI";
import { AppLogicProvider } from "./contexts/AppLogicContext";
import { CtPlanningToolsPanel } from "./ctPlanningTools";
import { resolveClinicMode, staffRoleChoices } from "./lib/clinicCapabilities";
import { actionFailureToast } from "./lib/panelStateText";
import {
	DENTE_CLINIC_TOKEN_KEY,
	DENTE_STAFF_TOKEN_KEY,
	readDenteClinicToken,
	readDenteStaffToken,
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "./lib/safeLocalStorage";
import { useAppLogic } from "./useAppLogic";
import { logger } from "./utils/logger";
import { WorkspaceContinuityStrip } from "./workspaceContinuityStrip";
import {
	preloadWorkspaceView,
	scheduleIdleWorkspacePreload,
} from "./workspacePreload";
import { WorkspaceRouteErrorBoundary } from "./workspaceRouteErrorBoundary";
import {
	ActionIcon,
	WorkspaceSidebar,
	WorkspaceTopbar,
} from "./workspaceShell";
import { FullscreenOnboardingWizard } from "./FullscreenOnboardingWizard";
import { AppRouter } from "./AppRouter";

const ImagingView = lazy(() =>
	import("./ImagingView").then((module) => ({ default: module.ImagingView })),
);
const VisitView = lazy(() =>
	import("./VisitView").then((module) => ({ default: module.VisitView })),
);
const FinanceView = lazy(() =>
	import("./FinanceView").then((module) => ({ default: module.FinanceView })),
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
const AnalyticsDashboardView = lazy(() =>
	import("./pages/AnalyticsDashboardView").then((module) => ({
		default: module.AnalyticsDashboardView,
	})),
);
/*
 * Склад, журнал стерилизации и воронка обращений: три готовых раздела, которые до
 * этой правки нельзя было открыть ничем. Они были подключены только в
 * AppRouter.tsx — мёртвом файле, который не импортировал никто, — а в реестре
 * workspaceShell.appViews их не было, поэтому и адрес #inventory откатывался на
 * «Смену». Маршруты сервера при этом живые: routes/inventory.ts,
 * routes/sterilization.ts и routes/leads.ts зарегистрированы в server.ts.
 * AppRouter.tsx удалён вместе с двумя лежавшими в нём пустышками (зарплаты и
 * омниканальный инбокс — их адреса на сервере отвечают 404).
 */
const InventoryView = lazy(() =>
	import("./components/InventoryView").then((module) => ({
		default: module.InventoryView,
	})),
);
const ScannerView = lazy(() =>
	import("./ScannerView").then((module) => ({ default: module.ScannerView })),
);
const LeadsKanbanView = lazy(() =>
	import("./components/leads/LeadsKanbanView").then((module) => ({
		default: module.LeadsKanbanView,
	})),
);
/*
 * Панель вставлена сюда, а не в AppRouter.tsx: тот файл никто не импортировал —
 * это был мёртвый код, и панели, добавленные в него, не отрисовывались вообще.
 * Выяснилось только на снимке живого экрана. Файл удалён.
 *
 * DayConfirmationsPanel отсюда убрана. Коммит 3f7dbcd6b («mount DayConfirmations,
 * FreedSlots, Messengers and Rules panels into main schedule and settings
 * routers», 2026-07-31) смонтировал её в ScheduleView рядом с FreedSlotsPanel и
 * ScheduleClipboardPanel, но здешний монтаж от 2026-07-27 не снял. Панель держит
 * собственное состояние и сама ходит в API из useEffect, поэтому на экране
 * расписания жили два экземпляра: два запроса дневных подтверждений и два
 * несинхронных набора отметок «обзвонил». Оставлен более поздний монтаж,
 * согласованный с соседними панелями смены.
 */
const ManagerReportsPanel = lazy(() =>
	import("./components/reports/ManagerReportsPanel").then((module) => ({
		default: module.ManagerReportsPanel,
	})),
);
function _speechGatewayCanUpload(status: SpeechGatewayStatus | null): boolean {
	return Boolean(
		status?.serverTranscriptionCurrentlyAvailable ??
			status?.serverTranscriptionEnabled,
	);
}
export function App() {
	const [sidebarCollapsed, setSidebarCollapsed] = useState(
		() =>
			typeof window !== "undefined" &&
			safeLocalStorageGetItem("dente_sidebar_collapsed") === "true",
	);
	const toggleSidebarCollapsed = () => {
		setSidebarCollapsed((current) => {
			const next = !current;
			safeLocalStorageSetItem("dente_sidebar_collapsed", String(next));
			return next;
		});
	};
	const appLogicValue = useAppLogic();
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
		activeVisitPatient,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		activePatientCallablePhone,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		activePatientHasCallablePhone,
		activePatientInsight,
		activePayments,
		activeQueueRole,
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
		analyzePricelist,
		appendToTranscript,
		applyCtPlanningQuickAction,
		applyMprClinicalPreset,
		applyNearestMprClinicalPreset,
		applyPostVisitCarePreset,
		applyProtocolTemplate,
		appointmentLabels,
		appointmentReadinessById,
		appointmentReadinessLabels,
		appointmentScheduleDraftFromAppointment,
		attachPricelistImage,
		browserCanRequestPersistentStorage,
		browserContinuity,
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
		postVisitCareTopicOptions,
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
		/*
      ШЕСТЬ ИМЁН УБРАНЫ ИЗ ЭТОГО РАЗБОРА, ПОТОМУ ЧТО ОТСЮДА ИХ НЕ ЧИТАЛ НИКТО.
      App.tsx вынимал их из useAppLogic() и передавал в <SettingsView …> — а
      SettingsView (SettingsView.tsx:367) берёт из пропсов РОВНО activeStaffUser,
      всё остальное читает сам из useAppLogicContext(), хранилища настроек и
      производных значений. Индексная подпись [key: string]: any в
      SettingsViewProps позволяла компилятору молчать: пропс передавался и
      выбрасывался.
      Значения при этом живы и нужны — их берут из контекста SettingsView.tsx
      (замечания разбора, подпись фото, сводка материалов, материал строки) и
      components/settings/SettingsPricesTab.tsx (имя файла фото, режимы
      разборщика). Поэтому убран именно проброс, а не сами значения: в
      useAppLogic.tsx они остаются в возвращаемом объекте.
    */
		pricelistRecognitionBrandGroups,
		pricelistRecognitionServiceGroups,
		pricelistSourceKind,
		pricelistSourceKindLabels,
		pricelistText,
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
		setSelectedPatientId,
		setScheduleDateFilter,
	} = appLogicValue;
	/*
	 * КАРТОЧКИ «СОХРАННОСТЬ ДАННЫХ» СОБИРАЮТСЯ ЗДЕСЬ, ПОТОМУ ЧТО ИЗ КОНТЕКСТА
	 * ПРИХОДИЛ null.
	 * useAppLogic.tsx:4364 отдаёт `browserContinuityChecks: null`, App.tsx клал это
	 * в <SettingsView>, оттуда в SettingsAuditTab.tsx:1776, где стоит
	 * `browserContinuityChecks as BrowserContinuityCheck[]` — приведение молчит, а
	 * SettingsAuditTab.tsx:2750 зовёт .map() на null. Замерено: вкладка «Журнал
	 * операций» роняла TypeError: Cannot read properties of null (reading 'map')
	 * при открытии раздела «Сохранность данных». Typecheck этого не видел из-за
	 * as-приведения.
	 * Подписи переведены с языка разработчика: «PWA-оболочка» -> «Работа без сети»,
	 * «Кэш» -> «Память для офлайна», «Квота» -> «Место». Состояние оболочки
	 * печатается через browserContinuityRegistrationLabels — до этой правки эта
	 * таблица не имела ни одного потребителя.
	 */
	const browserContinuityChecks = [
		{
			label: "Локальные черновики",
			value: browserContinuity?.localStorageWritable
				? "сохраняются"
				: browserContinuity
					? "не сохраняются"
					: "проверяю",
			detail: lastLocalSavedAt
				? `последнее сохранение в ${formatTime(lastLocalSavedAt)}`
				: "черновик приёма сохраняется на этом устройстве",
		},
		{
			label: "Очередь аудио",
			value: browserContinuity?.indexedDbSupported
				? "работает"
				: browserContinuity
					? "не работает"
					: "проверяю",
			detail: pendingSpeechChunkCount
				? `ждут отправки: ${pendingSpeechChunkCount}`
				: "аудио сохранится для отправки позже",
		},
		{
			label: "Работа без сети",
			value: browserContinuity
				? browserContinuityRegistrationLabels[
						browserContinuity.serviceWorkerRegistrationState
					]
				: "проверяю",
			detail: browserContinuity?.serviceWorkerControlled
				? "эта вкладка готова к работе без сети"
				: "без интернета эта вкладка может не открыться",
		},
		{
			label: "Память для офлайна",
			value: browserContinuity?.cacheStorageSupported
				? "готова"
				: browserContinuity
					? "недоступна"
					: "проверяю",
			detail:
				browserContinuity?.storagePersisted === true
					? "браузер обещал не удалять сохранённое"
					: "браузер может удалить сохранённое при нехватке места",
		},
		{
			label: "Место",
			value: formatMegabytes(browserContinuity?.storageUsageMb ?? null),
			detail:
				browserContinuity?.storageQuotaMb != null
					? `занято из ${formatMegabytes(browserContinuity.storageQuotaMb)}`
					: "браузер не сообщает, сколько места осталось",
		},
		{
			label: "Синхронизация",
			value: isOnline ? "есть связь" : "нет связи",
			detail: pendingVisitSaveCount
				? `приёмов ждёт отправки: ${pendingVisitSaveCount}`
				: "всё отправлено на сервер клиники",
		},
	];
	useEffect(() => scheduleIdleWorkspacePreload(currentView), [currentView]);
	const [resetting, setResetting] = useState(false);
	// --- DUAL-TIER AUTH STATE ---
	const [clinicAuthed, setClinicAuthed] = useState<boolean>(() => {
		return !!readDenteClinicToken();
	});
	const [staffAuthed, setStaffAuthed] = useState<boolean>(() => {
		return !!readDenteStaffToken();
	});
	const [showStaffPinPad, setShowStaffPinPad] = useState<boolean>(false);
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const [activeStaffUser, setActiveStaffUser] = useState<any>(null);
	const staffProfileFetchAttemptedRef = useRef<boolean>(false);
	// On mount: if clinic token already in localStorage (page refresh / persisted session), load dashboard + restore user profile
	useEffect(() => {
		if (clinicAuthed && !dashboard) {
			void loadDashboard().catch((e) => {
				// Only force re-login on explicit 401 auth failure, not network/db errors
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
				const statusCode = (e as any)?.statusCode ?? (e as any)?.status ?? 0;
				const is401 =
					statusCode === 401 ||
					(e instanceof Error &&
						(e.message.includes("401") || e.message.includes("Unauthorized")));
				if (is401) {
					logger.warn(
						"[Dente] Clinic token invalid (401), forcing re-login:",
						e,
					);
					safeLocalStorageRemoveItem(DENTE_CLINIC_TOKEN_KEY);
					safeLocalStorageRemoveItem(DENTE_STAFF_TOKEN_KEY);
					setClinicAuthed(false);
					setStaffAuthed(false);
				} else {
					// Network/DB error: keep session, fallback dashboard already set by loadDashboard
					logger.warn(
						"[Dente] Dashboard load failed (network/db), keeping session with fallback:",
						e,
					);
				}
			});
		}
		// Restore staff user profile from token on page refresh
		const staffToken = readDenteStaffToken() || null;
		if (
			staffToken &&
			!activeStaffUser &&
			!staffProfileFetchAttemptedRef.current
		) {
			staffProfileFetchAttemptedRef.current = true;
			fetch("/api/auth/user/me", {
				headers: { "x-dente-staff-token": staffToken },
			})
				.then((r) => {
					if (r.status === 401 || r.status === 403) {
						safeLocalStorageRemoveItem(DENTE_STAFF_TOKEN_KEY);
						setStaffAuthed(false);
						setActiveStaffUser(null);
						return null;
					}
					return r.ok ? r.json() : null;
				})
				.then((data) => {
					if (data?.user) {
						setActiveStaffUser(data.user);
					} else if (data !== null) {
						safeLocalStorageRemoveItem(DENTE_STAFF_TOKEN_KEY);
						setStaffAuthed(false);
						setActiveStaffUser(null);
					}
				})
				.catch((err) => {
					logger.error("[Dente] auth check error:", err);
					showToast(
						actionFailureToast(
							"Не удалось загрузить профиль пользователя",
							(err as { status?: number })?.status ?? null,
						),
						"error",
					);
				});
		}
	}, [loadDashboard, dashboard, clinicAuthed, activeStaffUser]); // Run once on mount only
	// Auto-lock on inactivity (5 minutes)
	useEffect(() => {
		if (!clinicAuthed || !staffAuthed) return;
		let timer: ReturnType<typeof setTimeout>;
		const resetTimer = () => {
			clearTimeout(timer);
			timer = setTimeout(
				() => {
					setStaffAuthed(false);
					setShowStaffPinPad(true);
					safeLocalStorageRemoveItem(DENTE_STAFF_TOKEN_KEY);
				},
				5 * 60 * 1000,
			);
		};
		const events = ["mousemove", "keydown", "pointerdown", "touchstart"];
		events.forEach((e) => {
			document.addEventListener(e, resetTimer, { passive: true });
		});
		resetTimer();
		return () => {
			clearTimeout(timer);
			events.forEach((e) => {
				document.removeEventListener(e, resetTimer);
			});
		};
	}, [clinicAuthed, staffAuthed]);
	const handleClinicLogout = () => {
		staffProfileFetchAttemptedRef.current = false;
		safeLocalStorageRemoveItem(DENTE_CLINIC_TOKEN_KEY);
		safeLocalStorageRemoveItem(DENTE_STAFF_TOKEN_KEY);
		setClinicAuthed(false);
		setStaffAuthed(false);
		setShowStaffPinPad(false);
		setActiveStaffUser(null);
	};
	const handleLockSession = () => {
		safeLocalStorageRemoveItem(DENTE_STAFF_TOKEN_KEY);
		setStaffAuthed(false);
		setShowStaffPinPad(true);
	};
	const isLocalOnboardingDismissed =
		typeof window !== "undefined" &&
		(safeLocalStorageGetItem("dental-crm:onboarding:v1")?.includes(
			'"dismissed":true',
		) ||
			safeLocalStorageGetItem("dente_ui_preferences_v1")?.includes(
				'"onboardingDismissed":true',
			));
	/**
	 * Скрыта ли подсказка о названии клиники, совпадающем с тестовым.
	 *
	 * Держится в этом сеансе, а не в хранилище браузера, и это осознанно: подсказка
	 * появляется снова при следующем входе, пока клинику действительно не
	 * переименовали или не настроили. Если бы закрытие запоминалось навсегда,
	 * ненастроенная клиника осталась бы без единого напоминания — а именно ради
	 * напоминания подсказка и существует. Постоянное закрытие требует настоящего
	 * признака «клиника настроена», которого в проекте пока нет.
	 */
	const [defaultClinicNoticeHidden, setDefaultClinicNoticeHidden] =
		useState(false);
	// Show clinic login gate if not authed
	if (!clinicAuthed) {
		return (
			<AuthHub
				onSuccess={(_cp, up) => {
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
	// Show staff PIN pad if clinic authed but no staff session (or after lock)
	if (!staffAuthed || showStaffPinPad) {
		/*
		 * ЭКРАН СМЕНЫ ПОКАЗЫВАЕТСЯ ДАЖЕ БЕЗ ДАННЫХ КЛИНИКИ, И ЭТО ОСОЗНАННО.
		 *
		 * БЫЛО: `if (!dashboard) return <AppLoadingState message="Загрузка данных
		 * клиники..." />`. Сводка клиники может не прийти НИКОГДА — например когда
		 * клиника из сессии отсутствует в базе и сервер отвечает отказом (см.
		 * apps/api/src/routes/dashboard.ts). Тогда «Загрузка данных клиники...»
		 * висела вечно: ни причины, ни выхода, ни даже кнопки «выйти из аккаунта
		 * клиники». Честные экраны отказа в этом файле есть, но стоят НИЖЕ этой
		 * ветки и потому недостижимы, пока смена не открыта.
		 *
		 * Теперь состояние списка сотрудников называет сам экран смены: он умеет
		 * показать загрузку, отказ с причиной и повтором, честную пустоту и людей —
		 * и во всех четырёх случаях рядом остаётся выход из аккаунта клиники, то
		 * есть путь наружу существует всегда.
		 *
		 * `?? []` здесь НЕ ВОЗВРАЩАТЬ. Именно он превращал непрочитанный список в
		 * пустой, и экран советовал заводить кадры клинике, у которой в базе трое
		 * действующих сотрудников. Охраняется tests/staffUnlockListState.test.ts.
		 */
		if (dashboard) {
			console.log("DEBUG: dashboard keys:", Object.keys(dashboard));
			console.log(
				"DEBUG: dashboard.clinicSettings is:",
				dashboard.clinicSettings,
			);
			console.log(
				"DEBUG: Array.isArray(staff)?",
				Array.isArray(dashboard.clinicSettings?.staff),
			);
		}
		return (
			<StaffPinPad
				staffMembers={dashboard ? dashboard.clinicSettings?.staff : undefined}
				staffListLoading={!dashboard && !error && !accessUnlockRequired}
				/*
				 * Код ответа берётся из того, что о неудаче известно здесь, и не
				 * выдумывается: отказ по доступу — 401; сводка пришла, а списка в ней нет
				 * — 200 («ответ сервера непонятен»); до сервера не дошли — null.
				 */
				staffListStatus={accessUnlockRequired ? 401 : dashboard ? 200 : null}
				onUnlockSuccess={(user) => {
					setActiveStaffUser(user);
					setStaffAuthed(true);
					setShowStaffPinPad(false);
				}}
				onClinicLogout={handleClinicLogout}
				onRetryStaffList={() => {
					setError(null);
					void loadDashboard();
				}}
			/>
		);
	}
	/*
	 * РОЛИ В МАСТЕРЕ НАСТРОЙКИ — ТОЛЬКО СУЩЕСТВУЮЩИЕ ПРИ ЭТОМ РЕЖИМЕ КЛИНИКИ.
	 *
	 * Переключатель роли в шапке (WorkspaceTopbar) уже спрашивает режим, а два шага
	 * мастера — «Ваша рабочая роль» и «Кто сейчас работает» — предлагали все пять
	 * ролей всегда. Мастер сам заводил сотрудника, которого потом отфильтровывала
	 * шапка: клиника в режиме отдельного врача выбирала «Управляющий», после чего
	 * шапка показывала «Роль: Управляющий», предлагала «Врач» и «Владелец», и ни
	 * одна кнопка не была подсвечена.
	 *
	 * Правило одно на все переключатели — staffRoleChoices из
	 * lib/clinicCapabilities.ts, там же, где таблица ролей по режимам. Второе
	 * описание того же правила разъехалось бы с первым при первой же правке.
	 * Текущая выбранная роль остаётся в списке всегда, иначе человек не увидит,
	 * где он находится.
	 *
	 * Режим берётся из того же ответа сервера, что и в шапке
	 * (dashboard.clinicSettings.profile.mode). Пока его нет — предлагаются все
	 * роли: отнимать выбор у клиники, чей режим ещё не известен, нельзя.
	 */
	const onboardingRoleChoices = staffRoleChoices(
		roleFocusOrder,
		resolveClinicMode(dashboard?.clinicSettings?.profile?.mode),
		selectedWorkspaceRole,
	);
	
        if (!onboardingDismissed && !isLocalOnboardingDismissed) {
            return <FullscreenOnboardingWizard 
                appLogicValue={appLogicValue} 
                isLocalOnboardingDismissed={isLocalOnboardingDismissed} 
                resetting={resetting}
                setResetting={setResetting}
                onboardingRoleChoices={onboardingRoleChoices}
            />;
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
	
        return (
            <AppLogicProvider value={appLogicValue}>
                <AppRouter />
            </AppLogicProvider>
        );
        
}

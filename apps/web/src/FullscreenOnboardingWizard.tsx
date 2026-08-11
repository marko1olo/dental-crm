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
export function FullscreenOnboardingWizard({ appLogicValue, isLocalOnboardingDismissed, resetting, setResetting, onboardingRoleChoices }: any) {
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
	// --- DUAL-TIER AUTH STATE ---
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	// On mount: if clinic token already in localStorage (page refresh / persisted session), load dashboard + restore user profile
	// Auto-lock on inactivity (5 minutes)
	// Show clinic login gate if not authed
	// Show staff PIN pad if clinic authed but no staff session (or after lock)
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
	if (!onboardingDismissed && !isLocalOnboardingDismissed) {
		return (
			<main className="app-shell onboarding-fullscreen">
				<section
					className="workspace onboarding-only-workspace"
					id="workspace-content"
				>
					<section
						className="onboarding-shell onboarding-wizard"
						aria-label="Первичная настройка клиники"
					>
						{/* Onboarding Header */}
						<div className="onboarding-head">
							<div>
								<p className="eyebrow">Первый запуск</p>
								<h2>Быстрая настройка CRM Dente</h2>
							</div>
						</div>
						{/*
              ОТКАЗ ВНУТРИ МАСТЕРА ВИДЕН ЗДЕСЬ, А НЕ В РАБОЧЕЙ ОБЛАСТИ.
              Полоса отказа в этом файле одна, и стоит она ниже — внутри рабочей
              области (ищите `<section className="app-notice"` после этой ветки).
              Мастер уходит из App.tsx досрочным return, то есть до неё дело не
              доходит. А отказывать внутри мастера есть чему: moveOnboardingTo на
              шаг «Готово» не пускает, пока нет врача с правом подписи ЭМК,
              кресла и ассистента (useAppLogic.tsx:3107 и :3325);
              saveClinicProfileIfDirty не пускает при незаполненных полях;
              addStaffMember и addChair сообщают об отказе сервера. Все они зовут
              setError — и все их сообщения пропадали в никуда, а кнопка при этом
              выглядела не сломанной, а мёртвой.
              Ровно тот класс дефекта, из-за которого удалили семишаговый мастер:
              запрос отказывает, а экран об отказе молчит.
            */}
						{error ? (
							<section
								className="app-notice"
								role="alert"
								aria-live="assertive"
							>
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
						{/* Step list if not intro */}
						{onboardingStep !== "intro" ? (
							<ol
								className="wizard-step-list"
								aria-label={`Шаг ${currentOnboardingIndex + 1} из ${onboardingSteps.length}`}
							>
								{onboardingSteps.map((step, index) => (
									<li
										className="wizard-step"
										key={step.id}
										data-active={step.id === onboardingStep}
										aria-current={
											step.id === onboardingStep ? "step" : undefined
										}
									>
										<span className="wizard-step-index">Шаг {index + 1}</span>
										<strong className="wizard-step-title">{step.title}</strong>
										<span className="wizard-step-detail">{step.detail}</span>
									</li>
								))}
							</ol>
						) : null}
						{/*
              ШАГ «РЕЖИМ ЗАПУСКА» — ЕДИНСТВЕННЫЙ ВЫХОД НОВОЙ КЛИНИКИ В ПРОГРАММУ.
              ЧТО БЫЛО СЛОМАНО. Новая клиника всегда попадает именно на этот шаг:
              AppHelpers.tsx:4325 принудительно ставит onboardingStep в "intro",
              пока настройка не закрыта, а кнопки «Назад» и «Дальше» на этом шаге
              не отрисовываются вовсе. То есть эти две карточки — все выходы,
              какие есть.
              Правая карточка, «Начать с чистого листа», не делала НИЧЕГО: её
              обработчик звал только loadDashboard({}), который читает
              /api/dashboard и больше ничего (useAppLogic.tsx:2732 — ни закрытия
              настройки, ни смены шага). Экран после нажатия не менялся. Клиника,
              отказавшаяся от демонстрационных данных, оставалась на первом
              экране навсегда: единственный работающий выход — левая карточка,
              то есть ровно то, от чего она отказалась.
              ЧТО ТЕПЕРЬ ДЕЛАЕТ КАЖДАЯ КАРТОЧКА. Левая уводит в рабочее место
              черновым входом (useAppLogic.tsx:3273) — это и есть «работать
              можно, настройку закончите позже»: он сохраняет черновик профиля
              клиники, пишет закрытие настройки и в браузер, и на сервер, и
              оставляет отметку «настройка не закончена» (её показывает
              App.tsx:3550). Правая НЕ закрывает мастер, а переводит на второй
              шаг: у шага «Режим запуска» кнопки «Дальше» нет по построению, и
              без этого перехода остальные четыре шага мастера были недостижимы
              вообще.
              ПОЧЕМУ ЧЕРНОВОЙ ВХОД, А НЕ dismissOnboarding. У строгого завершения
              (useAppLogic.tsx:3225) первым стоит assertOnboardingReadyForFinish:
              он требует врача с правом подписи ЭМК, кресло, ассистента, часовой
              пояс. Ничего из этого пять шагов не спрашивают, так что на новой
              клинике он отказал бы всегда — и отказ этот был бы НЕВИДИМ, потому
              что setError рисуется ниже, уже в рабочей области. Строгое
              завершение остаётся у полного мастера настройки в разделе
              «Клиника», где спрашивают всё нужное.
              ТЕКСТ КАРТОЧЕК ИСПРАВЛЕН ПО ФАКТУ. Обещания «запустить систему с
              готовыми демонстрационными данными» и «полностью пустая база
              данных» не выполнял никто: маршрута, который засеивает или чистит
              базу по нажатию этих карточек, в дереве нет — обе звали один и тот
              же loadDashboard. Обещание, которого система не держит, дороже
              отсутствующего: по «полностью пустой базе» клиника начнёт вносить
              настоящих пациентов рядом с тестовыми.
            */}
						{onboardingStep === "intro" ? (
							<div className="onboarding-panel">
								<div>
									<h3>Режим запуска приложения</h3>
									<p>
										Выберите, с чего начать. Настройку клиники можно закончить
										позже в разделе «Настройки» — приём, расписание и картотека
										работают и без неё.
									</p>
								</div>
								<div className="wizard-mode-grid">
									<button
										className="wizard-mode-card wizard-mode-card--demo"
										type="button"
										onClick={async () => {
											setResetting(true);
											await continueOnboardingInDraftMode();
											await loadDashboard({});
											setResetting(false);
										}}
										disabled={resetting}
									>
										<span className="wizard-mode-icon" aria-hidden="true">
											🚀
										</span>
										<strong className="wizard-mode-title">
											Сначала осмотреться
										</strong>
										<span className="wizard-mode-note">
											Открыть рабочее место с тем, что уже есть в базе клиники,
											и пройтись по разделам. Ничего не удаляется и не
											досоздаётся.
										</span>
									</button>
									<button
										className="wizard-mode-card wizard-mode-card--clean"
										type="button"
										onClick={() => void moveOnboardingTo("clinic")}
										disabled={resetting}
									>
										<span className="wizard-mode-icon" aria-hidden="true">
											✨
										</span>
										<strong className="wizard-mode-title">
											Настроить клинику сейчас
										</strong>
										<span className="wizard-mode-note">
											Название и телефон клиники, первый специалист и кресло —
											по шагам. Выйти в рабочее место можно на любом шаге.
										</span>
									</button>
								</div>
							</div>
						) : null}
						{/* Clinic step */}
						{onboardingStep === "clinic" ? (
							<div className="onboarding-panel">
								<div>
									<h3>О клинике</h3>
									<p>
										Название и телефон понадобятся для генерации договоров и
										медицинских карт.
									</p>
								</div>
								<div className="wizard-field-list">
									<div className="wizard-field">
										<label htmlFor="onboarding-clinic-name">
											Название клиники
										</label>
										<input
											id="onboarding-clinic-name"
											value={clinicProfileDraft.clinicName}
											onChange={(event) =>
												updateClinicProfileDraft(
													"clinicName",
													event.target.value,
												)
											}
											placeholder="Стоматология..."
										/>
									</div>
									<div className="wizard-field">
										<label htmlFor="onboarding-clinic-phone">
											Телефон для связи
										</label>
										<input
											id="onboarding-clinic-phone"
											type="tel"
											inputMode="tel"
											autoComplete="tel"
											value={clinicProfileDraft.phone}
											onChange={(event) =>
												updateClinicProfileDraft("phone", event.target.value)
											}
											placeholder="89..."
										/>
									</div>
								</div>
							</div>
						) : null}
						{/* Team step */}
						{onboardingStep === "team" ? (
							<div className="onboarding-panel">
								<div>
									<h3>Ваша роль и данные</h3>
									<p>
										Укажите свою рабочую роль в клинике и личные данные для
										настройки интерфейса.
									</p>
								</div>
								<div className="wizard-field-list">
									<div className="wizard-field">
										<span id="onboarding-role-label">Ваша рабочая роль</span>
										<fieldset
											className="wizard-role-row"
											aria-labelledby="onboarding-role-label"
											style={{ border: "none", padding: 0, margin: 0 }}
										>
											{onboardingRoleChoices.map((role) => (
												<button
													className={`wizard-role-chip${selectedWorkspaceRole === role ? " active" : ""}`}
													key={role}
													type="button"
													aria-pressed={selectedWorkspaceRole === role}
													onClick={() => setSelectedWorkspaceRole(role)}
												>
													{staffRoleLabels[role]}
												</button>
											))}
										</fieldset>
									</div>
									<div className="wizard-field">
										<label htmlFor="onboarding-staff-name">
											{selectedWorkspaceRole === "owner"
												? "ФИО владельца клиники"
												: selectedWorkspaceRole === "doctor"
													? "ФИО врача"
													: selectedWorkspaceRole === "administrator"
														? "ФИО администратора"
														: selectedWorkspaceRole === "assistant"
															? "ФИО ассистента"
															: "ФИО сотрудника"}
										</label>
										<input
											id="onboarding-staff-name"
											autoComplete="name"
											value={newStaffName}
											onChange={(event) => setNewStaffName(event.target.value)}
											placeholder="Иванов Иван Иванович"
										/>
									</div>
									{(selectedWorkspaceRole === "doctor" ||
										selectedWorkspaceRole === "assistant") && (
										<div className="wizard-field">
											<label htmlFor="onboarding-chair-name">
												Название кабинета/кресла
											</label>
											<input
												id="onboarding-chair-name"
												value={newChairName}
												onChange={(event) =>
													setNewChairName(event.target.value)
												}
												placeholder="Кабинет терапевта"
											/>
										</div>
									)}
								</div>
							</div>
						) : null}
						{/* Done step */}
						{onboardingStep === "done" ? (
							<div className="onboarding-panel">
								<div>
									<h3>Все готово к запуску!</h3>
									<p>
										Проверьте параметры перед открытием рабочей смены. Вы
										сможете изменить любые настройки позже.
									</p>
								</div>
								<div className="wizard-summary-grid">
									<div>
										<span className="wizard-summary-label">
											Название клиники
										</span>
										<strong className="wizard-summary-value">
											{clinicProfileDraft.clinicName || "Новая стоматология"}
										</strong>
									</div>
									<div>
										<span className="wizard-summary-label">
											Ваша рабочая роль
										</span>
										<strong className="wizard-summary-value">
											{staffRoleLabels[selectedWorkspaceRole]}
										</strong>
									</div>
									<div>
										<span className="wizard-summary-label">
											Первый специалист
										</span>
										<strong className="wizard-summary-value">
											{newStaffName || "Администратор"}
										</strong>
									</div>
									{(selectedWorkspaceRole === "doctor" ||
										selectedWorkspaceRole === "assistant") && (
										<div>
											<span className="wizard-summary-label">
												Кабинет / кресло
											</span>
											<strong className="wizard-summary-value">
												{newChairName || "Кабинет №1"}
											</strong>
										</div>
									)}
								</div>
							</div>
						) : null}
						{/* Actions Footer */}
						<div className="onboarding-actions">
							{onboardingStep !== "intro" && previousOnboardingStep ? (
								<button
									className="secondary-button"
									type="button"
									onClick={() =>
										void moveOnboardingTo(previousOnboardingStep.id)
									}
								>
									Назад
								</button>
							) : null}
							{onboardingStep !== "intro" && nextOnboardingStep ? (
								<button
									className="primary-button"
									type="button"
									onClick={() => void moveOnboardingTo(nextOnboardingStep.id)}
								>
									Дальше
								</button>
							) : null}
							{/*
                «НАЧАТЬ РАБОТУ» ЗВАЛО ФУНКЦИЮ, КОТОРОЙ В ДЕРЕВЕ НЕТ.
                Здесь стояло handleFinishOnboarding(newStaffName, newChairName).
                Такого имени нет ни в useAppLogic, ни в двух его подмешанных
                модулях (useTelegramSettings, useAuthLogic), ни в settingsStore,
                ни в одном другом файле репозитория — оно приходило из
                деструктуризации appLogicValue и равнялось undefined. То есть
                последняя кнопка первичной настройки роняла TypeError, ничего не
                сохраняла и мастер не закрывала. Тип не поймал этого, потому что
                useAppLogic объявлена как `useAppLogic(): any` — любое имя из
                такого объекта проходит проверку.
                ЧТО СТАЛО. Кнопка выполняет то, что перечислено в сводке шага
                «Готово», и ровно теми обработчиками, которыми это делает
                достижимый мастер настройки: addStaffMember заводит первого
                специалиста (useAppLogic.tsx:7533, POST /api/settings/staff),
                addChair — кресло (:7588, POST /api/settings/chairs), после чего
                черновой вход открывает рабочее место. Роль берётся ту, которую
                человек выбрал на шаге «Команда»: все пять значений входят в
                staffRoleSchema, то есть сервер их принимает.
                Оба обработчика сами сообщают о своём отказе через setError, а он
                теперь виден внутри мастера (полоса выше). Порядок именно такой:
                сначала завести людей и кресло, потом входить — иначе отказ
                сервера уехал бы за пределы экрана вместе с мастером.
              */}
							{onboardingStep === "done" ? (
								<button
									className="primary-button"
									type="button"
									disabled={resetting}
									onClick={async () => {
										setResetting(true);
										if (newStaffName.trim())
											await addStaffMember(selectedWorkspaceRole);
										if (
											(selectedWorkspaceRole === "doctor" ||
												selectedWorkspaceRole === "assistant") &&
											newChairName.trim()
										) {
											await addChair();
										}
										await continueOnboardingInDraftMode();
										setResetting(false);
									}}
								>
									Начать работу
								</button>
							) : null}
						</div>
					</section>
				</section>
			</main>
		);
	}
    return null;
}

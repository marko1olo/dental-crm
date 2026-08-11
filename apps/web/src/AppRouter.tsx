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
	ClipboardCheck,
	Database,
	Plus,
	ShieldCheck,
} from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { AppLoadingState, AppUnlockState } from "./AppBootState";
import { browserContinuityRegistrationLabels } from "./browserContinuity";
import { CommandPalette } from "./components/CommandPalette";
import { IncomingCallToast } from "./components/IncomingCallToast";
import { Omnibar } from "./components/Omnibar";
import { VoiceAssistantUI } from "./components/VoiceAssistantUI";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { useAppSession } from "./hooks/useAppSession";
import { resolveClinicMode, staffRoleChoices } from "./lib/clinicCapabilities";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "./lib/safeLocalStorage";
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
export function AppRouter() {
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
	const appLogicValue = useAppLogicContext();
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
	const _browserContinuityChecks = [
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
	const [_resetting, _setResetting] = useState(false);
	// --- DUAL-TIER AUTH STATE ---

	const {
		clinicAuthed,
		setClinicAuthed,
		staffAuthed,
		setStaffAuthed,
		showStaffPinPad,
		setShowStaffPinPad,
		activeStaffUser,
		setActiveStaffUser,
		handleClinicLogout,
		handleLockSession,
	} = useAppSession(dashboard, loadDashboard);
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	// On mount: if clinic token already in localStorage (page refresh / persisted session), load dashboard + restore user profile
	// Auto-lock on inactivity (5 minutes)
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
	const onboardingRoleChoices = staffRoleChoices(
		roleFocusOrder,
		resolveClinicMode(dashboard?.clinicSettings?.profile?.mode),
		selectedWorkspaceRole,
	);
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
	return (
		<main
			className="app-shell dente-redesign"
			data-collapsed={sidebarCollapsed}
		>
			<a className="skip-link" href="#workspace-content">
				Перейти к рабочей области
			</a>
			<WorkspaceSidebar
				currentView={currentView}
				onViewIntent={preloadWorkspaceView}
				role={selectedWorkspaceRole}
				collapsed={sidebarCollapsed}
				onToggleCollapsed={toggleSidebarCollapsed}
			/>
			<section
				className={`workspace view-${currentView}`}
				id="workspace-content"
				tabIndex={-1}
				aria-label="Рабочая область"
			>
				{/*
              БАННЕР О НЕНАСТРОЕННОЙ КЛИНИКЕ.
              ЧТО БЫЛО НЕ ТАК. Условие было тем же — сравнение названия клиники со
              строкой «Стоматология, 1 кабинет», — но текст утверждал: «Демо-режим.
              Тестовые данные загружены». А это ровно то название, которое получает
              клиника по умолчанию (apps/api/src/sampleData.ts:268, seedAuth.ts:32).
              То есть настоящая клиника, оставившая название по умолчанию — а соло-врач
              оставит его чаще всего, — навсегда получала надпись, что её живые
              пациенты и оплаты являются тестовыми данными. Хуже надписи здесь только
              то, что убрать её было нельзя: закрытия у баннера не было.
              ПОЧЕМУ УСЛОВИЕ ОСТАЛОСЬ ПО ИМЕНИ. Настоящего признака «эта клиника
              создана сидером» в проекте нет: ни колонки у организации, ни поля в
              наборе флагов. Выдумывать его здесь нельзя, а флаг onboardingCompleted не
              годится.
              ЗДЕСЬ СТОЯЛО НЕВЕРНОЕ ОБЪЯСНЕНИЕ ЭТОГО ФЛАГА, и оно врало дважды.
              Написано было: «его выставляет только POST /api/workspace/onboarding/
              complete… поэтому он не становится истинным ни у кого, и баннер висел бы
              у всех навсегда». В действительности тот маршрут флага НЕ КАСАЛСЯ вовсе —
              он писал название, реквизиты, режим, график, людей и кресла, а
              workspace_feature_flags не трогал ни одной строкой; сам маршрут теперь
              удалён (разбор — apps/api/src/routes/workspaceProfile.ts). И вывод был
              обратным по знаку: onboardingCompleted равен true в наборе умолчаний
              сервера (DEFAULT_WORKSPACE_FEATURE_FLAGS), и ни один экран его не
              выставляет — POST /api/workspace/profile принял бы его в общем слиянии
              признаков, но не посылает ни один вызов. Значит по такому условию баннер
              не показался бы НИКОМУ, а не всем.
              Следующий инженер, поверив этому объяснению, искал бы отсутствующего
              писателя вместо того, чтобы завести признак.
              ЧТО ИЗМЕНЕНО. Текст больше не утверждает недоказуемое. Он говорит
              проверяемый факт — название совпадает с названием из тестовых данных — и
              даёт ДВА выхода: переименовать клинику, если она настоящая, или пройти
              настройку, если только начинают. И его можно закрыть.
              ДОЛГ: признак «данные от сидера» на стороне сервера. Пока его нет,
              совпадение имени — единственная имеющаяся улика, и подавать её надо как
              улику, а не как приговор.
            */}
				{dashboard?.clinicName === "Стоматология, 1 кабинет" &&
					!defaultClinicNoticeHidden && (
						<div className="default-clinic-banner" role="status">
							<div className="banner-content">
								<span className="banner-icon" aria-hidden="true">
									🚀
								</span>
								<p>
									<strong>Клиника ещё не настроена?</strong> Её название
									совпадает с названием клиники из тестовых данных. Если это
									ваша настоящая клиника — переименуйте её в настройках. Если вы
									только начинаете — пройдите настройку, она займёт несколько
									минут.
								</p>
							</div>
							<button
								className="primary-button banner-btn"
								type="button"
								onClick={reopenOnboarding}
							>
								Пройти настройку
							</button>
							<button
								className="text-button banner-btn"
								type="button"
								onClick={() => setDefaultClinicNoticeHidden(true)}
								aria-label="Скрыть подсказку о названии клиники"
							>
								Скрыть
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
				/>
				<WorkspaceContinuityStrip
					browserContinuityCritical={browserContinuityCritical}
					browserWarnings={browserContinuity?.warnings ?? []}
					isOnline={isOnline}
					isPendingVisitSyncing={isPendingVisitSyncing}
					onCheckDevice={() => void refreshBrowserContinuity({ silent: false })}
					onFlushSpeech={() => void flushPendingSpeechChunks({ silent: false })}
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
				{!onboardingDismissed &&
				!showFullOnboardingGuide &&
				!isLocalOnboardingDismissed ? (
					<section
						className="onboarding-compact-strip"
						aria-label="Первичная настройка клиники"
					>
						<div>
							<strong>Можно начать прием без мастера</strong>
							<span>
								Документы предупредят о реквизитах позже. Сейчас важнее открыть
								пациента, диктовку и расписание.
							</span>
						</div>
						<span className="onboarding-compact-score">
							{currentOnboardingIndex + 1}/{onboardingSteps.length} · документы{" "}
							{legalReadinessPercent}%
						</span>
						<button
							className="primary-button"
							type="button"
							onClick={() => void continueOnboardingInDraftMode("visit")}
						>
							<ClipboardCheck aria-hidden="true" /> Прием
						</button>
						<button
							className="secondary-button"
							type="button"
							onClick={() => openOnboardingGuide()}
						>
							<ShieldCheck aria-hidden="true" /> Настроить
						</button>
					</section>
				) : null}
				{showFullOnboardingGuide ? (
					<section
						className="onboarding-shell"
						aria-label="Первичная настройка клиники"
					>
						<div className="onboarding-head">
							<div>
								<p className="eyebrow">Первое открытие</p>
								<h2>Настройка новой клиники и рабочего места врача</h2>
								<p>
									Можно начать прием сразу. Юридические поля, импорт и Telegram
									остаются в настройке и не мешают диктовке, расписанию и
									карточке пациента.
								</p>
							</div>
							<div className="onboarding-score">
								<span>
									{currentOnboardingIndex + 1}/{onboardingSteps.length}
								</span>
								<strong>{legalReadinessPercent}%</strong>
								<small>готовность документов</small>
							</div>
						</div>
						<section
							className="onboarding-fast-start"
							aria-label="Быстрый старт работы"
						>
							<div>
								<strong>Рабочий вход без мастера</strong>
								<span>
									Черновики приема сохраняются. Документы и налоговые формы сами
									покажут, каких реквизитов не хватает.
								</span>
							</div>
							<button
								className="primary-button"
								type="button"
								onClick={() => void continueOnboardingInDraftMode("visit")}
							>
								<ClipboardCheck aria-hidden="true" /> Открыть прием
							</button>
							<button
								className="secondary-button"
								type="button"
								onClick={() => void continueOnboardingInDraftMode("schedule")}
							>
								<CalendarDays aria-hidden="true" /> Расписание
							</button>
							<button
								className="secondary-button"
								type="button"
								onClick={() => void moveOnboardingTo("legal")}
							>
								<ShieldCheck aria-hidden="true" /> Реквизиты
							</button>
						</section>
						<fieldset
							className="onboarding-step-list"
							aria-label="Шаги знакомства"
							style={{ border: "none", padding: 0, margin: 0 }}
						>
							<legend className="sr-only">Шаги знакомства</legend>
							{onboardingSteps.map((step, index) => (
								<button
									className={
										step.id === onboardingStep
											? "active"
											: index < currentOnboardingIndex
												? "done"
												: ""
									}
									key={step.id}
									type="button"
									aria-current={step.id === onboardingStep ? "step" : undefined}
									aria-pressed={step.id === onboardingStep}
									aria-describedby={
										step.id === "done" && !onboardingReadyToFinish
											? onboardingFinishGuidanceId
											: undefined
									}
									disabled={step.id === "done" && !onboardingReadyToFinish}
									onClick={() => void moveOnboardingTo(step.id)}
								>
									<span>{index + 1}</span>
									<strong>{step.title}</strong>
									<small>{step.detail}</small>
								</button>
							))}
						</fieldset>
						{onboardingStep === "intro" ? (
							<div className="onboarding-panel">
								<div>
									<h3>Короткая карта приложения</h3>
									<p>
										Смена показывает очередь и срочные действия. Прием хранит
										черновики локально и на сервере. Документы генерируются из
										проверенных данных пациента, оплаты и лицензии клиники.
									</p>
								</div>
								<div className="onboarding-source-grid">
									<span>Прием: протоколы, голос, офлайн-черновик</span>
									<span>Документы: пациент, оплата, налоговая</span>
									<span>Импорт: прайс, старые базы, снимки</span>
									<span>Настройки: роль, кабинет, юридический профиль</span>
								</div>
							</div>
						) : null}
						{onboardingStep === "role" ? (
							<div className="onboarding-panel">
								<div>
									<h3>Кто сейчас работает</h3>
									<p>
										Выбор роли и специализации сохраняется как настройка
										рабочего места и не подмешивает чужие разделы.
									</p>
								</div>
								<div className="onboarding-form-grid">
									<fieldset
										className="role-picker form-span-2"
										aria-label="Роль нового сотрудника"
										style={{ border: "none", padding: 0, margin: 0 }}
									>
										<legend className="sr-only">Роль нового сотрудника</legend>
										{onboardingRoleChoices.map((role) => (
											<button
												className={
													selectedWorkspaceRole === role ? "active" : ""
												}
												key={role}
												type="button"
												aria-pressed={selectedWorkspaceRole === role}
												onClick={() => setSelectedWorkspaceRole(role)}
											>
												{staffRoleLabels[role]}
											</button>
										))}
									</fieldset>
									<fieldset
										className="specialty-strip form-span-2"
										aria-label="Специализация врача"
										style={{ border: "none", padding: 0, margin: 0 }}
									>
										<legend className="sr-only">Специализация врача</legend>
										{(Object.keys(specialtyLabels) as DentalSpecialty[]).map(
											(specialty) => (
												<button
													className={
														selectedSpecialty === specialty ? "active" : ""
													}
													key={specialty}
													type="button"
													aria-pressed={selectedSpecialty === specialty}
													onClick={() => setSelectedSpecialty(specialty)}
												>
													{specialtyLabels[specialty]}
												</button>
											),
										)}
									</fieldset>
								</div>
							</div>
						) : null}
						{onboardingStep === "clinic" ? (
							<div className="onboarding-panel">
								<div>
									<h3>Режим и базовые контакты</h3>
									<p>
										Режим меняет первый экран, очереди ролей и подсказки без
										ручной перенастройки интерфейса.
									</p>
								</div>
								<fieldset
									className="mode-grid form-span-2"
									aria-label="Режим клиники"
									style={{ border: "none", padding: 0, margin: 0 }}
								>
									<legend className="sr-only">Режим клиники</legend>
									{(Object.keys(clinicModeLabels) as ClinicMode[]).map(
										(mode) => (
											<button
												className={`mode-card ${dashboard.clinicSettings.profile?.mode === mode ? "active" : ""}`}
												key={mode}
												type="button"
												aria-pressed={
													dashboard.clinicSettings.profile?.mode === mode
												}
												onClick={() => changeClinicMode(mode)}
											>
												<strong>{clinicModeLabels[mode].title}</strong>
												<span>{clinicModeLabels[mode].detail}</span>
											</button>
										),
									)}
								</fieldset>
								<div className="onboarding-form-grid">
									<label>
										Название клиники
										<input
											value={clinicProfileDraft.clinicName}
											onChange={(event) =>
												updateClinicProfileDraft(
													"clinicName",
													event.target.value,
												)
											}
										/>
									</label>
									<label>
										Телефон
										<input
											value={clinicProfileDraft.phone}
											onChange={(event) =>
												updateClinicProfileDraft("phone", event.target.value)
											}
										/>
									</label>
									<label>
										Часовой пояс
										<input
											value={clinicProfileDraft.timezone}
											onChange={(event) =>
												updateClinicProfileDraft("timezone", event.target.value)
											}
										/>
									</label>
									<label>
										Язык интерфейса
										<select
											value={uiLanguage}
											onChange={(event) =>
												setUiLanguage(
													normalizeUiLanguageInput(event.target.value),
												)
											}
										>
											{uiLanguageOptions.map((option) => (
												<option key={option.value} value={option.value}>
													{option.label}
												</option>
											))}
										</select>
										<small className="field-note">
											{selectedUiLanguageOption.detail}
										</small>
									</label>
									<label>
										Минут на визит
										<input
											inputMode="numeric"
											value={clinicProfileDraft.defaultVisitMinutes}
											onChange={(event) =>
												updateClinicProfileDraft(
													"defaultVisitMinutes",
													event.target.value.replace(/[^\d]/g, "").slice(0, 3),
												)
											}
										/>
									</label>
									<label>
										Начало смены
										<input
											type="time"
											value={clinicProfileDraft.workdayStart}
											onChange={(event) =>
												updateClinicProfileDraft(
													"workdayStart",
													event.target.value,
												)
											}
										/>
									</label>
									<label>
										Конец смены
										<input
											type="time"
											value={clinicProfileDraft.workdayEnd}
											onChange={(event) =>
												updateClinicProfileDraft(
													"workdayEnd",
													event.target.value,
												)
											}
										/>
									</label>
									<label>
										Буфер, мин
										<input
											inputMode="numeric"
											value={clinicProfileDraft.appointmentBufferMinutes}
											onChange={(event) =>
												updateClinicProfileDraft(
													"appointmentBufferMinutes",
													event.target.value.replace(/[^\d]/g, "").slice(0, 3),
												)
											}
										/>
									</label>
									<fieldset
										className="weekday-toggle-row form-span-2"
										aria-label="Рабочие дни клиники"
										style={{ border: "none", padding: 0, margin: 0 }}
									>
										<legend className="sr-only">Рабочие дни клиники</legend>
										<span>Рабочие дни</span>
										{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
										{weekdayOptions.map((day: any) => (
											<button
												className={
													clinicProfileDraft.workingDays.includes(day.value)
														? "active"
														: ""
												}
												key={day.value}
												type="button"
												aria-pressed={clinicProfileDraft.workingDays.includes(
													day.value,
												)}
												onClick={() => toggleClinicWorkingDay(day.value)}
											>
												{day.label}
											</button>
										))}
									</fieldset>
								</div>
							</div>
						) : null}
						{onboardingStep === "legal" ? (
							<div className="onboarding-panel">
								<div>
									<h3>Юридические данные для договоров и налоговых справок</h3>
									<p>
										Без этих полей приложение не должно выдавать финальные
										договоры, акты и налоговые документы как готовые.
									</p>
								</div>
								<div className="onboarding-form-grid">
									<label>
										Юридическое лицо
										<input
											value={clinicProfileDraft.legalName}
											onChange={(event) =>
												updateClinicProfileDraft(
													"legalName",
													event.target.value,
												)
											}
										/>
									</label>
									<label>
										ИНН
										<input
											value={clinicProfileDraft.inn}
											onChange={(event) =>
												updateClinicProfileDraft(
													"inn",
													event.target.value.replace(/[^\d]/g, "").slice(0, 12),
												)
											}
										/>
									</label>
									<label>
										КПП
										<input
											value={clinicProfileDraft.kpp}
											onChange={(event) =>
												updateClinicProfileDraft(
													"kpp",
													event.target.value.replace(/[^\d]/g, "").slice(0, 9),
												)
											}
										/>
									</label>
									<label>
										ОГРН / ОГРНИП
										<input
											value={clinicProfileDraft.ogrn}
											onChange={(event) =>
												updateClinicProfileDraft(
													"ogrn",
													event.target.value.replace(/[^\d]/g, "").slice(0, 15),
												)
											}
										/>
									</label>
									<label className="form-span-2">
										Адрес
										<input
											value={clinicProfileDraft.address}
											onChange={(event) =>
												updateClinicProfileDraft("address", event.target.value)
											}
										/>
									</label>
									<label>
										Номер лицензии
										<input
											value={clinicProfileDraft.medicalLicenseNumber}
											onChange={(event) =>
												updateClinicProfileDraft(
													"medicalLicenseNumber",
													event.target.value,
												)
											}
										/>
									</label>
									<label>
										Дата лицензии
										<input
											value={clinicProfileDraft.medicalLicenseIssuedAt}
											onChange={(event) =>
												updateClinicProfileDraft(
													"medicalLicenseIssuedAt",
													event.target.value,
												)
											}
										/>
									</label>
									<label className="form-span-2">
										Кем выдана лицензия
										<input
											value={clinicProfileDraft.medicalLicenseIssuer}
											onChange={(event) =>
												updateClinicProfileDraft(
													"medicalLicenseIssuer",
													event.target.value,
												)
											}
										/>
									</label>
								</div>
								<div className="clinic-legal-summary">
									<strong>{legalReadinessPercent}%</strong>
									<span>
										{legalMissingFields.length
											? `Не хватает: ${legalMissingFields.join(", ")}`
											: "Минимальные поля заполнены"}
									</span>
								</div>
							</div>
						) : null}
						{onboardingStep === "team" ? (
							<div className="onboarding-panel">
								<div>
									<h3>Команда и кабинет</h3>
									<p>
										Сотрудники и кресла сразу попадают в серверное состояние,
										аудит и расписание.
									</p>
								</div>
								<div className="onboarding-form-grid">
									<label>
										Новый сотрудник
										<input
											value={newStaffName}
											onChange={(event) => setNewStaffName(event.target.value)}
										/>
									</label>
									<fieldset
										className="role-picker form-span-2"
										aria-label="Роль нового сотрудника"
										style={{ border: "none", padding: 0, margin: 0 }}
									>
										<legend className="sr-only">Роль нового сотрудника</legend>
										{(
											[
												"doctor",
												"administrator",
												"assistant",
												"manager",
											] as StaffRole[]
										).map((role) => (
											<button
												className={newStaffRole === role ? "active" : ""}
												key={role}
												type="button"
												aria-pressed={newStaffRole === role}
												onClick={() => setNewStaffRole(role)}
											>
												{staffRoleLabels[role]}
											</button>
										))}
									</fieldset>
									{newStaffRole === "doctor" || newStaffRole === "assistant" ? (
										<fieldset
											className="specialty-strip staff-specialty-picker form-span-2"
											aria-label="Специальность нового сотрудника"
											style={{ border: "none", padding: 0, margin: 0 }}
										>
											<legend className="sr-only">
												Специальность нового сотрудника
											</legend>
											{(Object.keys(specialtyLabels) as DentalSpecialty[]).map(
												(specialty) => (
													<button
														className={
															newStaffSpecialty === specialty ? "active" : ""
														}
														key={specialty}
														type="button"
														aria-pressed={newStaffSpecialty === specialty}
														onClick={() => setNewStaffSpecialty(specialty)}
													>
														{specialtyLabels[specialty]}
													</button>
												),
											)}
										</fieldset>
									) : null}
									<button
										className="secondary-button"
										type="button"
										onClick={() => addStaffMember(newStaffRole)}
										aria-describedby={
											!newStaffReadyToCreate
												? onboardingStaffCreateGuidanceId
												: undefined
										}
										disabled={!newStaffReadyToCreate}
									>
										<Plus aria-hidden="true" /> Добавить сотрудника
									</button>
									{!newStaffReadyToCreate ? (
										<p
											className="quick-create-guidance form-span-2"
											id={onboardingStaffCreateGuidanceId}
											role="status"
											aria-live="polite"
										>
											Введите ФИО сотрудника, затем выберите роль.
										</p>
									) : null}
									<label>
										Кресло / кабинет
										<input
											value={newChairName}
											onChange={(event) => setNewChairName(event.target.value)}
										/>
									</label>
									<button
										className="secondary-button"
										type="button"
										onClick={addChair}
										aria-describedby={
											!newChairReadyToCreate
												? onboardingChairCreateGuidanceId
												: undefined
										}
										disabled={!newChairReadyToCreate}
									>
										<Plus aria-hidden="true" /> Добавить кресло
									</button>
									{!newChairReadyToCreate ? (
										<p
											className="quick-create-guidance form-span-2"
											id={onboardingChairCreateGuidanceId}
											role="status"
											aria-live="polite"
										>
											Введите понятное название кресла или кабинета.
										</p>
									) : null}
								</div>
								<section
									className="onboarding-schedule-grid form-span-2"
									aria-label="Расписание команды при первом запуске"
								>
									<div className="onboarding-schedule-section">
										<div>
											<h4>Расписание команды</h4>
											<p>
												Сразу задайте рабочие дни и часы. Изменения
												автосохраняются и остаются выбранными, пока вы их не
												поменяете.
											</p>
										</div>
										<div className="staff-list">
											{(dashboard.clinicSettings?.staff ?? [])
												.filter(
													(member) =>
														member.role === "doctor" ||
														member.role === "assistant",
												)
												.map((member) => {
													const scheduleDraft =
														staffScheduleDrafts[member.id] ??
														staffScheduleDraftFromWorkingHours(
															member.workingHours ?? null,
														);
													const scheduleSaveState =
														staffScheduleSaveStates[member.id] ?? "saved";
													const scheduleDirty = staffScheduleDirtyIds.has(
														member.id,
													);
													const scheduleSaving =
														staffScheduleSavingId === member.id ||
														scheduleSaveState === "saving";
													const scheduleSaveLabel = scheduleSaving
														? "Автосохранение"
														: scheduleSaveState === "error"
															? "Не сохранено"
															: scheduleDirty
																? "Ждет автосохранения"
																: "Сохранено";
													return (
														<div
															className="staff-row onboarding-schedule-row"
															key={`onboarding-staff-schedule-${member.id}`}
														>
															<span style={{ background: member.color }} />
															<div>
																<strong>{member.fullName}</strong>
																<p>
																	{staffRoleLabels[member.role]} ·{" "}
																	{member.specialties
																		.map((item) => specialtyLabels[item])
																		.join(", ")}
																</p>
															</div>
															<div className="staff-schedule-editor onboarding-compact-schedule-editor">
																<label>
																	С
																	<input
																		aria-label={`Начало смены: ${member.fullName}`}
																		type="time"
																		value={scheduleDraft.start}
																		onChange={(event) =>
																			updateStaffScheduleDraft(member.id, {
																				start: event.target.value,
																			})
																		}
																	/>
																</label>
																<label>
																	До
																	<input
																		aria-label={`Конец смены: ${member.fullName}`}
																		type="time"
																		value={scheduleDraft.end}
																		onChange={(event) =>
																			updateStaffScheduleDraft(member.id, {
																				end: event.target.value,
																			})
																		}
																	/>
																</label>
																<fieldset
																	className="weekday-toggle-row staff-weekday-row"
																	aria-label={`Рабочие дни сотрудника: ${member.fullName}`}
																	style={{
																		border: "none",
																		padding: 0,
																		margin: 0,
																	}}
																>
																	<legend className="sr-only">{`Рабочие дни сотрудника: ${member.fullName}`}</legend>

																	{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
																	{weekdayOptions.map((day: any) => (
																		<button
																			className={
																				scheduleDraft.workingDays.includes(
																					day.value,
																				)
																					? "active"
																					: ""
																			}
																			key={day.value}
																			type="button"
																			aria-pressed={scheduleDraft.workingDays.includes(
																				day.value,
																			)}
																			onClick={() =>
																				toggleStaffWorkingDay(
																					member.id,
																					day.value,
																				)
																			}
																		>
																			{day.label}
																		</button>
																	))}
																</fieldset>
																<div className="staff-schedule-actions">
																	<span
																		className={`save-state save-state-${scheduleSaveState}`}
																	>
																		{scheduleSaveLabel}
																	</span>
																	<button
																		className="secondary-button compact-button"
																		type="button"
																		onClick={() =>
																			void saveStaffSchedule(member.id)
																		}
																		disabled={scheduleSaving}
																	>
																		{scheduleSaving
																			? "Сохраняю"
																			: "Сохранить сейчас"}
																	</button>
																</div>
															</div>
														</div>
													);
												})}
										</div>
									</div>
									<div className="onboarding-schedule-section">
										<div>
											<h4>Расписание кресел</h4>
											<p>
												Кабинет может работать иначе, чем врач. Это сразу
												учитывается в записи и конфликтных слотах.
											</p>
										</div>
										<div className="staff-list">
											{(dashboard.clinicSettings?.chairs ?? [])
												.filter((chair) => chair.active)
												.map((chair) => {
													const scheduleDraft =
														chairScheduleDrafts[chair.id] ??
														staffScheduleDraftFromWorkingHours(
															chair.workingHours ?? null,
														);
													const scheduleSaveState =
														chairScheduleSaveStates[chair.id] ?? "saved";
													const scheduleDirty = chairScheduleDirtyIds.has(
														chair.id,
													);
													const scheduleSaving =
														chairScheduleSavingId === chair.id ||
														scheduleSaveState === "saving";
													const scheduleSaveLabel = scheduleSaving
														? "Автосохранение"
														: scheduleSaveState === "error"
															? "Не сохранено"
															: scheduleDirty
																? "Ждет автосохранения"
																: "Сохранено";
													return (
														<div
															className="staff-row onboarding-schedule-row"
															key={`onboarding-chair-schedule-${chair.id}`}
														>
															<CalendarDays aria-hidden="true" />
															<div>
																<strong>{chair.name}</strong>
																<p>
																	{chair.specialization
																		? specialtyLabels[chair.specialization]
																		: "универсально"}
																</p>
															</div>
															<div className="staff-schedule-editor onboarding-compact-schedule-editor">
																<label>
																	С
																	<input
																		aria-label={`Начало работы кресла: ${chair.name}`}
																		type="time"
																		value={scheduleDraft.start}
																		onChange={(event) =>
																			updateChairScheduleDraft(chair.id, {
																				start: event.target.value,
																			})
																		}
																	/>
																</label>
																<label>
																	До
																	<input
																		aria-label={`Конец работы кресла: ${chair.name}`}
																		type="time"
																		value={scheduleDraft.end}
																		onChange={(event) =>
																			updateChairScheduleDraft(chair.id, {
																				end: event.target.value,
																			})
																		}
																	/>
																</label>
																<fieldset
																	className="weekday-toggle-row staff-weekday-row"
																	aria-label={`Рабочие дни кресла: ${chair.name}`}
																	style={{
																		border: "none",
																		padding: 0,
																		margin: 0,
																	}}
																>
																	<legend className="sr-only">{`Рабочие дни кресла: ${chair.name}`}</legend>

																	{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
																	{weekdayOptions.map((day: any) => (
																		<button
																			className={
																				scheduleDraft.workingDays.includes(
																					day.value,
																				)
																					? "active"
																					: ""
																			}
																			key={day.value}
																			type="button"
																			aria-pressed={scheduleDraft.workingDays.includes(
																				day.value,
																			)}
																			onClick={() =>
																				toggleChairWorkingDay(
																					chair.id,
																					day.value,
																				)
																			}
																		>
																			{day.label}
																		</button>
																	))}
																</fieldset>
																<div className="staff-schedule-actions">
																	<span
																		className={`save-state save-state-${scheduleSaveState}`}
																	>
																		{scheduleSaveLabel}
																	</span>
																	<button
																		className="secondary-button compact-button"
																		type="button"
																		onClick={() =>
																			void saveChairSchedule(chair.id)
																		}
																		disabled={scheduleSaving}
																	>
																		{scheduleSaving
																			? "Сохраняю"
																			: "Сохранить сейчас"}
																	</button>
																</div>
															</div>
														</div>
													);
												})}
										</div>
									</div>
								</section>
							</div>
						) : null}
						{onboardingStep === "sources" ? (
							<div className="onboarding-panel">
								<div>
									<h3>Источники данных</h3>
									<p>
										Выберите рабочие источники один раз. Система сохранит эти
										настройки автоматически и будет использовать их в прайсах,
										переносе пациентов, документах, снимках и внешнем просмотре
										КТ, пока клиника сама их не поменяет.
									</p>
								</div>
								<section
									className="onboarding-source-config"
									aria-label="Быстрая настройка источников данных"
								>
									<section className="onboarding-source-section">
										<div>
											<strong>Прайс клиники</strong>
											<span>
												Откуда администратор чаще всего заносит цены и
												материалы.
											</span>
										</div>
										<fieldset
											className="onboarding-source-choice-row"
											aria-label="Источник прайса"
											style={{ border: "none", padding: 0, margin: 0 }}
										>
											<legend className="sr-only">Источник прайса</legend>
											{(
												Object.keys(
													pricelistSourceKindLabels,
												) as PricelistSourceKind[]
											).map((kind) => (
												<button
													className={
														pricelistSourceKind === kind ? "active" : ""
													}
													key={kind}
													type="button"
													aria-pressed={pricelistSourceKind === kind}
													onClick={() => {
														setPricelistSourceKind(kind);
														if (kind !== "photo_ocr") clearPricelistImage();
														setPricelistAnalysis(null);
													}}
												>
													{pricelistSourceKindLabels[kind]}
												</button>
											))}
										</fieldset>
									</section>
									<section className="onboarding-source-section">
										<div>
											<strong>Перенос пациентов</strong>
											<span>
												Основной формат старой базы или бумажного журнала.
											</span>
										</div>
										<fieldset
											className="onboarding-source-choice-row"
											aria-label="Источник переноса пациентов"
											style={{ border: "none", padding: 0, margin: 0 }}
										>
											<legend className="sr-only">
												Источник переноса пациентов
											</legend>
											{(
												Object.keys(importSourceLabels) as ImportSourceKind[]
											).map((kind) => (
												<button
													className={importSourceKind === kind ? "active" : ""}
													key={kind}
													type="button"
													aria-pressed={importSourceKind === kind}
													onClick={() => {
														setImportSourceKind(kind);
														setImportPreview(null);
														setImportCommit(null);
													}}
												>
													{importSourceLabels[kind].title}
												</button>
											))}
										</fieldset>
									</section>
									<section className="onboarding-source-section">
										<div>
											<strong>Смешанная выгрузка</strong>
											<span>
												Как разбирать файл, где вместе пациенты, снимки и
												служебные строки.
											</span>
										</div>
										<fieldset
											className="onboarding-source-choice-row"
											aria-label="Режим смешанного импорта"
											style={{ border: "none", padding: 0, margin: 0 }}
										>
											<legend className="sr-only">
												Режим смешанного импорта
											</legend>
											{(
												Object.keys(smartImportModeLabels) as SmartImportMode[]
											).map((mode) => (
												<button
													className={smartImportMode === mode ? "active" : ""}
													key={mode}
													type="button"
													aria-pressed={smartImportMode === mode}
													onClick={() => {
														setSmartImportMode(mode);
														setSmartImportPreview(null);
														setSmartImportCommit(null);
													}}
												>
													{smartImportModeLabels[mode].title}
												</button>
											))}
										</fieldset>
									</section>
									<section className="onboarding-source-section">
										<div>
											<strong>Документы и файлы</strong>
											<span>
												Куда по умолчанию отправлять распознанный документ,
												таблицу, архив или фото.
											</span>
										</div>
										<fieldset
											className="onboarding-source-choice-row"
											aria-label="Маршрут распознанных документов"
											style={{ border: "none", padding: 0, margin: 0 }}
										>
											<legend className="sr-only">
												Маршрут распознанных документов
											</legend>
											{(
												Object.keys(
													ingestionTargetLabels,
												) as DocumentIngestionTarget[]
											).map((target) => (
												<button
													className={
														documentIngestionTarget === target ? "active" : ""
													}
													key={target}
													type="button"
													aria-pressed={documentIngestionTarget === target}
													onClick={() => setDocumentIngestionTarget(target)}
												>
													{ingestionTargetLabels[target]}
												</button>
											))}
										</fieldset>
									</section>
									<section className="onboarding-source-section onboarding-source-section-wide">
										<div>
											<strong>Снимки и КТ</strong>
											<span>
												Основной поток RVG, ОПТГ, КТ, архива снимков или
												локальных папок.
											</span>
										</div>
										<fieldset
											className="onboarding-source-choice-row"
											aria-label="Источник снимков"
											style={{ border: "none", padding: 0, margin: 0 }}
										>
											<legend className="sr-only">Источник снимков</legend>
											{imagingSourceChoices.map((kind) => (
												<button
													className={
														imagingImportSourceKind === kind ? "active" : ""
													}
													key={kind}
													type="button"
													aria-pressed={imagingImportSourceKind === kind}
													onClick={() => {
														setImagingImportSourceKind(kind);
														setImagingImportPreview(null);
														setImagingImportCommit(null);
														setDicomSeriesPreview(null);
													}}
												>
													{imagingSourceLabels[kind]}
												</button>
											))}
										</fieldset>
									</section>
									<section className="onboarding-source-section onboarding-source-section-wide">
										<div>
											<strong>Архив снимков и внешний просмотр</strong>
											<span>
												Адреса просмотрщика сохраняются вместе с остальными
												настройками источников.
											</span>
										</div>
										<div className="onboarding-source-url-grid">
											<label>
												Адрес архива снимков
												<input
													value={dicomWebEndpointUrl}
													onChange={(event) => {
														setDicomWebEndpointUrl(event.target.value);
														setDicomWebCheck(null);
														setDicomViewerLaunchManifest(null);
														setDicomViewerToolStateBundle(null);
														setDicomViewerWorkbenchManifest(null);
													}}
													placeholder="http://127.0.0.1:8042/dicom-web"
												/>
											</label>
											<label>
												Адрес внешнего просмотра
												<input
													value={ohifBaseUrl}
													onChange={(event) => {
														setOhifBaseUrl(event.target.value);
														setDicomViewerLaunchManifest(null);
														setDicomViewerWorkbenchManifest(null);
													}}
													placeholder="http://127.0.0.1:3000"
												/>
											</label>
										</div>
									</section>
								</section>
								<div className="onboarding-source-grid">
									<span>
										Автосохранено: прайс, импорт, документы, снимки, архив и
										внешний просмотр
									</span>
									<button
										type="button"
										onClick={() => {
											setSettingsTab("prices");
											window.location.hash = "settings/prices";
										}}
									>
										Открыть прайс
									</button>
									<button
										type="button"
										onClick={() => {
											setSettingsTab("imports");
											window.location.hash = "settings/imports";
										}}
									>
										Открыть перенос
									</button>
									<button
										type="button"
										onClick={() => {
											setSettingsTab("sources");
											window.location.hash = "settings/sources";
										}}
									>
										Открыть снимки
									</button>
								</div>
							</div>
						) : null}
						{onboardingStep === "telegram" ? (
							<div className="onboarding-panel">
								<div>
									<h3>Telegram, QR и связь с пациентами</h3>
									<p>
										Настройте Telegram-бот сразу при первом запуске: QR-привязка
										пациента, напоминания, памятки после лечения, отзывы и
										ссылки на портал сохраняются автоматически и применяются ко
										всей клинике.
									</p>
								</div>
								<div className="onboarding-telegram-status">
									<span>
										Бот
										<strong>
											{telegramStatus?.botUsername
												? `@${telegramStatus.botUsername.replace(/^@/, "")}`
												: "не загружен"}
										</strong>
									</span>
									<span>
										Транспорт
										<strong>
											{telegramStatus?.webhookReady
												? "готов"
												: "нужна проверка"}
										</strong>
									</span>
									<span>
										QR-коды
										<strong>
											{telegramStatus?.pendingLinkCodeCount ?? 0} ожидают
										</strong>
									</span>
									<span>
										Чаты
										<strong>
											{telegramStatus?.activeChatLinkCount ?? 0} связаны
										</strong>
									</span>
								</div>
								<div className="onboarding-form-grid">
									<label>
										Имя общего бота в Telegram
										<input
											value={telegramBotUsernameDraft}
											placeholder="dentecrm_bot"
											onChange={(event) => {
												setTelegramBotUsernameDraft(event.target.value);
												markTelegramSettingsDirty();
											}}
										/>
									</label>
									<label>
										Портал пациента
										<input
											type="url"
											inputMode="url"
											placeholder="https://portal.example"
											value={telegramPatientPortalBaseUrlDraft}
											onChange={(event) => {
												setTelegramPatientPortalBaseUrlDraft(
													event.target.value,
												);
												markTelegramSettingsDirty();
											}}
										/>
									</label>
									<label>
										Картинка приветствия
										<input
											type="url"
											inputMode="url"
											placeholder="https://.../welcome.jpg"
											value={telegramWelcomeImageUrlDraft}
											onChange={(event) => {
												setTelegramWelcomeImageUrlDraft(event.target.value);
												markTelegramSettingsDirty();
											}}
										/>
									</label>
									<label>
										Ссылка на отзыв
										<input
											type="url"
											inputMode="url"
											placeholder="https://..."
											value={telegramReviewUrlDraft}
											onChange={(event) => {
												setTelegramReviewUrlDraft(event.target.value);
												markTelegramSettingsDirty();
											}}
										/>
									</label>
									<label>
										Ссылка на карту
										<input
											type="url"
											inputMode="url"
											placeholder="https://..."
											value={telegramMapsUrlDraft}
											onChange={(event) => {
												setTelegramMapsUrlDraft(event.target.value);
												markTelegramSettingsDirty();
											}}
										/>
									</label>
									<label>
										Срок QR-кода, минут
										<input
											type="number"
											min={5}
											max={1440}
											step={5}
											value={telegramTokenTtlDraft}
											onChange={(event) => {
												setTelegramTokenTtlDraft(event.target.value);
												markTelegramSettingsDirty();
											}}
										/>
									</label>
									<label>
										Напоминания до приема, часы
										<input
											inputMode="text"
											placeholder="24, 2"
											value={telegramReminderLeadTimesDraft}
											onChange={(event) => {
												setTelegramReminderLeadTimesDraft(event.target.value);
												markTelegramSettingsDirty();
											}}
										/>
										<small>
											Напоминания до приема в часах: от 1 до 168, максимум 6
											значений.
										</small>
									</label>
									<label>
										Просьба оценить клинику, часы после визита
										<input
											type="number"
											min={1}
											max={720}
											step={1}
											value={telegramReviewRequestDelayDraft}
											onChange={(event) => {
												setTelegramReviewRequestDelayDraft(event.target.value);
												markTelegramSettingsDirty();
											}}
										/>
										<small>
											Клиника сама выбирает момент просьбы оставить отзыв: от 1
											до 720 часов после закрытого визита или оплаты.
										</small>
									</label>
									<fieldset className="telegram-checkup-delay-fields full">
										<legend>Контроль после лечения</legend>
										<small>
											Через сколько часов Telegram спросит пациента о
											самочувствии после выданной памятки.
										</small>
										{telegramPostVisitCheckupDelayFields.map((field) => (
											<label key={field.key}>
												{field.label}
												<input
													type="number"
													min={1}
													max={720}
													step={1}
													value={telegramPostVisitCheckupDelayDrafts[field.key]}
													onChange={(event) =>
														updateTelegramPostVisitCheckupDelayDraft(
															field.key,
															event.target.value,
														)
													}
												/>
												<small>{field.help}</small>
											</label>
										))}
									</fieldset>
									<label>
										Секрет администратора клиники
										<input
											type="password"
											autoComplete="current-password"
											value={telegramAdminSecretDraft}
											onChange={(event) =>
												setTelegramAdminSecretDraft(event.target.value)
											}
											onKeyDown={(event) => {
												if (event.key === "Enter") {
													event.preventDefault();
													unlockTelegramAdminSession("telegram");
												}
											}}
											placeholder="если защищенные настройки включены на сервере клиники"
										/>
										<small>
											{telegramAdminSecretSession
												? "Разблокировано до перезагрузки страницы."
												: "Секрет не сохраняется в браузере."}
										</small>
									</label>
									<button
										className="secondary-button"
										type="button"
										onClick={() => unlockTelegramAdminSession("telegram")}
									>
										<ShieldCheck aria-hidden="true" /> Разблокировать
									</button>
									<label>
										Приватность
										<select
											value={telegramPrivacyModeDraft}
											onChange={(event) => {
												setTelegramPrivacyModeDraft(
													normalizedTelegramPrivacyMode(event.target.value),
												);
												markTelegramSettingsDirty();
											}}
										>
											<option value="no_phi_by_default">
												{telegramPrivacyModeLabels.no_phi_by_default}
											</option>
											<option value="limited_admin_only">
												{telegramPrivacyModeLabels.limited_admin_only}
											</option>
											<option value="consented_phi_templates" disabled>
												{telegramPrivacyModeLabels.consented_phi_templates}{" "}
												(после аудита)
											</option>
										</select>
									</label>
								</div>
								<fieldset
									className="onboarding-feature-list"
									aria-label="Быстрые сценарии Telegram"
									style={{ border: "none", padding: 0, margin: 0 }}
								>
									<legend className="sr-only">Быстрые сценарии Telegram</legend>
									<div className="onboarding-telegram-visual-cards">
										{telegramVisualCardFields
											.filter((field) =>
												onboardingTelegramVisualCardKeys.includes(field.key),
											)
											.map((field) => (
												<label key={field.key}>
													{field.label}
													<input
														type="url"
														inputMode="url"
														placeholder={field.placeholder}
														value={telegramVisualCardUrlDrafts[field.key] ?? ""}
														onChange={(event) =>
															updateTelegramVisualCardUrlDraft(
																field.key,
																event.target.value,
															)
														}
													/>
													<small>
														{field.help} Если поле пустое, используется картинка
														приветствия.
													</small>
												</label>
											))}
									</div>
									{telegramFeatureOptions
										.filter((feature) =>
											[
												"patient_linking",
												"appointment_reminders",
												"appointment_confirmation",
												"document_ready_notice",
												"tax_document_request",
												"payment_reminders",
												"post_visit_instructions",
												"recalls",
												"review_requests",
												"callback_requests",
												"secure_portal_links",
												"staff_task_alerts",
												"staff_daily_digest",
											].includes(feature),
										)
										.map((feature) => (
											<label
												className={
													telegramEnabledFeaturesDraft.includes(feature)
														? "active"
														: ""
												}
												key={feature}
											>
												<input
													type="checkbox"
													checked={telegramEnabledFeaturesDraft.includes(
														feature,
													)}
													onChange={() => toggleTelegramFeature(feature)}
												/>
												<span>{telegramFeatureLabel(feature)}</span>
											</label>
										))}
								</fieldset>
								<div className="onboarding-inline-actions">
									<button
										className="secondary-button"
										type="button"
										onClick={() => void saveTelegramSettings()}
										disabled={isTelegramSettingsSaving}
									>
										<ShieldCheck aria-hidden="true" />{" "}
										{isTelegramSettingsSaving
											? "Сохраняю"
											: "Сохранить Telegram"}
									</button>
									<button
										className="secondary-button"
										type="button"
										onClick={() => {
											setSettingsTab("telegram");
											window.location.hash = "settings/telegram";
										}}
									>
										<Bot aria-hidden="true" /> Открыть полную панель
									</button>
									<span
										className={`telegram-save-state save-${telegramSettingsSaveState}`}
									>
										{telegramSettingsSaveState === "saving"
											? "Автосохранение..."
											: telegramSettingsSaveState === "saved"
												? "Telegram сохранен."
												: telegramSettingsSaveState === "error"
													? (telegramSettingsSaveError ??
														"Telegram не сохранен.")
													: telegramSettingsDirty
														? "Изменения будут сохранены автоматически."
														: "Конфигурация Telegram сохранена."}
									</span>
								</div>
							</div>
						) : null}
						{onboardingStep === "done" ? (
							<div className="onboarding-panel">
								<div>
									<h3>Проверка перед работой</h3>
									<p>
										Профиль клиники: {legalReadinessPercent}%. Команда:{" "}
										{dashboard.clinicSettings?.staff?.length ?? 0}. Кабинеты:{" "}
										{dashboard.clinicSettings?.chairs?.length ?? 0}. Telegram:{" "}
										{telegramStatus?.webhookReady
											? "готов к отправке"
											: "нужна настройка отправки"}
										. Документы:{" "}
										{documentFactoryGroups.reduce(
											(total, group) => total + group.kinds.length,
											0,
										)}{" "}
										шаблонов.
									</p>
								</div>
								<div className="onboarding-readiness-grid">
									<span>
										{dashboard.clinicSettings?.profile?.mode &&
										clinicModeLabels[dashboard.clinicSettings.profile.mode]
											? clinicModeLabels[dashboard.clinicSettings.profile.mode]
													.title
											: "Клиника"}
									</span>
									<span>{staffRoleLabels[selectedWorkspaceRole]}</span>
									<span>{specialtyLabels[selectedSpecialty]}</span>
									<span>
										{telegramEnabledFeaturesDraft.length} Telegram-сценариев
										включено
									</span>
									<span>
										{onboardingDocumentsReady
											? "документы готовы к выдаче"
											: "документы требуют реквизитов"}
									</span>
								</div>
								{!onboardingReadyToFinish ? (
									<p className="onboarding-blocker">
										До завершения нужно заполнить:{" "}
										{onboardingBlockingIssues.join(", ")}.
									</p>
								) : null}
								{!onboardingDocumentsReady ? (
									<p className="onboarding-blocker onboarding-advisory">
										Первый рабочий экран можно открыть сейчас. Для договоров,
										актов и налоговых форм позже заполните:{" "}
										{onboardingDocumentReadinessIssues.join(", ")}.
									</p>
								) : null}
								{onboardingTelegramRecommendations.length ? (
									<p className="onboarding-blocker onboarding-advisory">
										Telegram можно включить позже:{" "}
										{onboardingTelegramRecommendations.join(", ")}.
									</p>
								) : null}
							</div>
						) : null}
						{!onboardingReadyToFinish ? (
							<p
								className="onboarding-blocker onboarding-action-guidance"
								id={onboardingFinishGuidanceId}
								role="status"
								aria-live="polite"
							>
								Чтобы завершить настройку, заполните:{" "}
								{onboardingBlockingIssues.join(", ")}.
							</p>
						) : null}
						<div className="onboarding-actions">
							<button
								className="secondary-button"
								type="button"
								onClick={dismissOnboarding}
								aria-describedby={
									!onboardingReadyToFinish
										? onboardingFinishGuidanceId
										: undefined
								}
								disabled={!onboardingReadyToFinish}
							>
								Скрыть
							</button>
							{!onboardingReadyToFinish ? (
								<button
									className="secondary-button"
									type="button"
									onClick={() => void continueOnboardingInDraftMode()}
								>
									Продолжить в черновике
								</button>
							) : null}
							<button
								className="secondary-button"
								type="button"
								onClick={() => void saveClinicProfileFromDraft()}
								disabled={clinicProfileSaveState === "saving"}
							>
								<ShieldCheck aria-hidden="true" />{" "}
								{clinicProfileSaveState === "saving"
									? "Сохраняю"
									: "Сохранить профиль"}
							</button>
							{previousOnboardingStep ? (
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
							{nextOnboardingStep ? (
								<button
									className="primary-button"
									type="button"
									onClick={() => void moveOnboardingTo(nextOnboardingStep.id)}
									aria-describedby={
										nextOnboardingStep.id === "done" && !onboardingReadyToFinish
											? onboardingFinishGuidanceId
											: undefined
									}
									disabled={
										nextOnboardingStep.id === "done" && !onboardingReadyToFinish
									}
								>
									Дальше <ArrowRight aria-hidden="true" />
								</button>
							) : (
								<button
									className="primary-button"
									type="button"
									onClick={dismissOnboarding}
									aria-describedby={
										!onboardingReadyToFinish
											? onboardingFinishGuidanceId
											: undefined
									}
									disabled={!onboardingReadyToFinish}
								>
									Завершить настройку
								</button>
							)}
						</div>
					</section>
				) : null}
				{onboardingDismissed &&
				onboardingDraftMode &&
				!onboardingReadyToFinish ? (
					<section
						className="onboarding-draft-strip"
						aria-label="Первичная настройка в черновике"
					>
						<div>
							<strong>Первичная настройка не завершена</strong>
							<span>
								Можно работать в черновике, но перед выдачей документов
								заполните: {onboardingBlockingIssues.join(", ")}.
							</span>
						</div>
						<button
							className="secondary-button"
							type="button"
							onClick={reopenOnboarding}
						>
							Вернуться к настройке
						</button>
					</section>
				) : null}
				{onboardingDismissed &&
				onboardingReadyToFinish &&
				!onboardingDocumentsReady ? (
					<section
						className="onboarding-draft-strip"
						aria-label="Документы требуют реквизитов"
					>
						<div>
							<strong>Документы требуют реквизитов</strong>
							<span>
								Для договоров, актов и налоговых форм заполните:{" "}
								{onboardingDocumentReadinessIssues.join(", ")}.
							</span>
						</div>
						<button
							className="secondary-button"
							type="button"
							onClick={() => {
								setCurrentView("settings");
								setSettingsTab("clinic");
								window.location.hash = "settings/clinic";
							}}
						>
							Заполнить реквизиты
						</button>
					</section>
				) : null}
				{currentView === "shift" ? (
					/*
              Граница и Suspense здесь появились последними из всех разделов, и это
              было не украшение. `ShiftView` объявлен через `lazy()` (строка 399),
              но своего `Suspense` не имел: при подвешивании React поднимался до
              ближайшего сверху — а он стоит в AppShell.tsx вокруг ВСЕГО рабочего
              места. То есть на стартовом разделе, который открывается по умолчанию
              и куда сбрасывает охранник маршрута, вместо панели гасился весь экран
              вместе с боковым меню и шапкой. Границы ошибок над «Сменой» не было
              вовсе: сбой рендера или недогруженный чанк снимал рабочее место целиком
              и оставлял человека с кнопкой перезагрузки на пустой странице.
            */
					<WorkspaceRouteErrorBoundary
						view="shift"
						label={viewLabels.shift}
						panelClassName="panel shift-panel"
						panelId="shift"
					>
						<Suspense
							fallback={
								<section
									className="panel shift-panel"
									id="shift"
									aria-label={viewLabels.shift}
									aria-busy="true"
								>
									<div className="panel-heading">
										<h2>{viewLabels.shift}</h2>
										<span className="status-pill status-planned">загрузка</span>
									</div>
								</section>
							}
						>
							<ShiftView />
						</Suspense>
					</WorkspaceRouteErrorBoundary>
				) : null}
				{["shift", "patients"].includes(currentView) ? (
					/*
                Карточка приходит из того же ленивого модуля, что и «Смена»
                (ShiftView.tsx, строка 400), поэтому у неё те же две дыры — и своя
                граница, а не общая со «Сменой»: сбой карточки пациента не должен
                уносить сводку смены, и наоборот. `view` подставляется настоящий, а
                не постоянный «shift»: по его смене граница сама снимает отказ
                (componentDidUpdate в workspaceRouteErrorBoundary.tsx), то есть
                переход «Смена» ↔ «Пациенты» служит бесплатным повтором.
              */
					<WorkspaceRouteErrorBoundary
						view={currentView === "patients" ? "patients" : "shift"}
						label="Карточка пациента"
						panelClassName="patient-cockpit"
						panelId="patient-cockpit"
					>
						<Suspense
							fallback={
								<section
									className="patient-cockpit dnt-cockpit"
									aria-label="Карточка пациента"
									aria-busy="true"
								>
									<div className="panel-heading">
										<h2>Карточка пациента</h2>
										<span className="status-pill status-planned">загрузка</span>
									</div>
								</section>
							}
						>
							<PatientCockpit
								/*
                      На «Смене» карточка показывает пациента открытого приёма, а не
                      `activePatient`: тот при отсутствии приёма подставляет первого
                      пациента списка, и на экран попадал случайный человек с красной
                      пометкой «СРОЧНО». Без приёма карточка честно говорит «Пациент
                      не выбран». В разделе «Пациенты» выбор из списка остаётся.
                    */
								activePatient={
									currentView === "shift" ? activeVisitPatient : activePatient
								}
								activePatientInsight={activePatientInsight}
								dashboard={dashboard}
								activeCommunicationTasks={activeCommunicationTasks}
								activeImagingStudies={activeImagingStudies}
								activeUsableDocuments={activeUsableDocuments}
							/>
						</Suspense>
					</WorkspaceRouteErrorBoundary>
				) : null}
				{currentView === "imaging" ? (
					<WorkspaceRouteErrorBoundary
						view="imaging"
						label={viewLabels.imaging}
						panelClassName="panel imaging-panel"
						panelId="imaging"
					>
						<Suspense
							fallback={
								<section
									className="panel imaging-panel"
									id="imaging"
									aria-label="Снимки пациента"
									aria-busy="true"
								>
									<div className="panel-heading">
										<h2>Снимки пациента</h2>
										<span className="status-pill status-planned">загрузка</span>
									</div>
								</section>
							}
						>
							<ImagingView />
						</Suspense>
					</WorkspaceRouteErrorBoundary>
				) : null}
				{[
					"schedule",
					"patients",
					"visit",
					"documents",
					"finance",
					"analytics",
					"communications",
				].includes(currentView) ? (
					<section className="work-grid page-grid">
						{currentView === "schedule" ? (
							<WorkspaceRouteErrorBoundary
								view="schedule"
								label={viewLabels.schedule}
								panelClassName="panel schedule-panel"
								panelId="schedule"
							>
								<Suspense
									fallback={
										<section
											className="panel schedule-panel"
											id="schedule"
											aria-label="Расписание"
											aria-busy="true"
										>
											<div className="panel-heading">
												<h2>Расписание</h2>
												<span className="status-pill status-planned">
													загрузка
												</span>
											</div>
										</section>
									}
								>
									<ScheduleView
									// Нужен для живого обновления сетки, когда запись создал или
									// перенёс другой администратор.
									//
									// ЗДЕСЬ СТОЯЛО «этот ScheduleView отрисован ВЫШЕ
									// AppLogicProvider, поэтому useAppLogicContext() здесь пуст».
									// ЭТО НЕВЕРНО и было неверно с тех пор, как провайдер обнял всё
									// рабочее место: он открывается на строке 2509 и закрывается на
									// 5070, а этот вызов — на 3947, то есть ВНУТРИ. Утверждение
									// опасно вдвойне: во-первых, оно объясняло пропсы причиной,
									// которой нет; во-вторых, «контекст здесь пуст» описывало
									// выдуманный пустой объект, которого больше не существует —
									// useAppLogicContext() вне провайдера теперь бросает исключение
									// (contexts/AppLogicContext.tsx).
									//
									// Пропс остаётся, и это осознанно: экран получает loadDashboard
									// явно, а не выуживает его из общего объекта, так видно, кто чем
									// пользуется. Менять на чтение из контекста без прогона живого
									// расписания не за чем.
									/>
								</Suspense>
								{/*
                  Утренний обзвон живёт в ScheduleView: кнопка «Подтверждения» рядом
                  с «Освободившиеся окна» и «Буфер». Второй, всегда открытый
                  экземпляр стоял здесь и давал дублирующий запрос к API дневных
                  подтверждений; убран, чтобы отметки «обзвонил» не расходились
                  между двумя копиями списка.
                */}
							</WorkspaceRouteErrorBoundary>
						) : null}
						{currentView === "patients" ? (
							<WorkspaceRouteErrorBoundary
								view="patients"
								label={viewLabels.patients}
								panelClassName="panel patients-panel"
								panelId="patients"
							>
								<Suspense
									fallback={
										<section
											className="panel patients-panel"
											id="patients"
											aria-label="Пациенты"
											aria-busy="true"
										>
											<div className="panel-heading">
												<h2>Быстрый поиск</h2>
												<span className="status-pill status-planned">
													загрузка
												</span>
											</div>
										</section>
									}
								>
									<PatientsView />
								</Suspense>
							</WorkspaceRouteErrorBoundary>
						) : null}
						{currentView === "visit" ? (
							<WorkspaceRouteErrorBoundary
								view="visit"
								label={viewLabels.visit}
								panelClassName="panel visit-panel"
								panelId="visit"
							>
								<Suspense
									fallback={
										<section
											className="panel visit-panel"
											id="visit"
											aria-label="Текущий прием"
											aria-busy="true"
										>
											<div className="panel-heading">
												<h2>Текущий прием</h2>
												<span className="status-pill status-planned">
													загрузка
												</span>
											</div>
										</section>
									}
								>
									<VisitView />
								</Suspense>
							</WorkspaceRouteErrorBoundary>
						) : null}
						{currentView === "documents" ? (
							<WorkspaceRouteErrorBoundary
								view="documents"
								label={viewLabels.documents}
								panelClassName="panel documents-panel"
								panelId="documents"
							>
								<Suspense
									fallback={
										<div
											className="panel documents-panel"
											id="documents"
											aria-busy="true"
										>
											<div className="panel-heading">
												<h2>Документы и согласия</h2>
												<span className="status-pill status-planned">
													загрузка
												</span>
											</div>
										</div>
									}
								>
									<DocumentsView />
								</Suspense>
							</WorkspaceRouteErrorBoundary>
						) : null}
						{currentView === "finance" ? (
							<WorkspaceRouteErrorBoundary
								view="finance"
								label={viewLabels.finance}
								panelClassName="panel finance-panel"
								panelId="finance"
							>
								<Suspense
									fallback={
										<section
											className="panel finance-panel"
											id="finance"
											aria-label="Финансы"
											aria-busy="true"
										>
											<div className="panel-heading">
												<h2>Оплаты, план лечения и вычет</h2>
												<span className="status-pill status-planned">
													загрузка
												</span>
											</div>
										</section>
									}
								>
									<FinanceView />
								</Suspense>
							</WorkspaceRouteErrorBoundary>
						) : null}
						{currentView === "communications" ? (
							<WorkspaceRouteErrorBoundary
								view="communications"
								label={viewLabels.communications}
								panelClassName="panel communications-panel"
								panelId="communications"
							>
								<Suspense
									fallback={
										<section
											className="panel communications-panel"
											id="communications"
											aria-label="Обращения"
											aria-busy="true"
										>
											<div className="panel-heading">
												<h2>Связь с пациентами</h2>
												<span className="status-pill status-planned">
													загрузка
												</span>
											</div>
										</section>
									}
								>
									<CommunicationsView />
								</Suspense>
							</WorkspaceRouteErrorBoundary>
						) : null}
						{currentView === "analytics" ? (
							<WorkspaceRouteErrorBoundary
								view="analytics"
								label="Аналитика"
								panelClassName="panel analytics-panel"
								panelId="analytics"
							>
								<Suspense
									fallback={
										<div
											className="panel analytics-panel"
											id="analytics"
											aria-busy="true"
										>
											<div className="panel-heading">
												<h2>Executive BI Analytics</h2>
												<span className="status-pill status-planned">
													Загрузка...
												</span>
											</div>
										</div>
									}
								>
									<AnalyticsDashboardView />
								</Suspense>
								{/*
                    Экран выше показывает воронку, доли кресел и когорты; того, по
                    чему принимают решения — динамики выручки, доли неявок,
                    дебиторки, — там не было.
                  */}
								<Suspense fallback={null}>
									{/*
                      Режим клиники решает, какие разрезы показывать: занятость
                      единственного кресла — всегда одно и то же число, выработка
                      единственного врача — одна строка. Таблица правил лежит в
                      lib/clinicCapabilities.ts, а не в сравнениях по разметке.
                    */}
									<ManagerReportsPanel
										clinicMode={
											dashboard?.clinicSettings?.profile?.mode ?? null
										}
									/>
								</Suspense>
							</WorkspaceRouteErrorBoundary>
						) : null}
					</section>
				) : null}
				{/*
              ЗДЕСЬ БЫЛ БЛОК «СЛУЖЕБНЫЕ ОГРАНИЧЕНИЯ» — он показывал пользователю наши
              внутренние заметки. Живой ответ /api/dashboard кладёт в
              complianceWarnings три строки, дословно:
                «AI-ответы являются черновиками и требуют подтверждения врача»;
                «Медицинские данные требуют 152-ФЗ, врачебной тайны и аудита доступа»;
                «Для продажи клиникам нужен отдельный EGISZ-адаптер и юридическая
                 проверка шаблонов».
              Первые две — общие слова, которые администратору клиники ничего не
              говорят и ни к какому действию не ведут. Третья — заметка о продаже
              продукта: пользователь видел нашу кухню на своём рабочем экране, под
              непонятным заголовком, висевшим сразу на четырёх разделах.
              Настоящие ограничения система показывает там, где они возникают: «нет
              согласия», «документ не подписан», «SMS-шлюз не настроен» — рядом с
              самим действием, а не общим списком внизу страницы.
            */}
				{currentView === "settings" ? (
					<WorkspaceRouteErrorBoundary
						view="settings"
						label={viewLabels.settings}
						panelClassName="settings-zone"
						panelId="settings"
					>
						<Suspense
							fallback={
								<section
									className="settings-zone"
									id="settings"
									aria-label="Настройки"
									aria-busy="true"
								>
									<div className="panel-heading settings-heading">
										<h2>Настройки</h2>
										<span className="status-pill status-planned">загрузка</span>
									</div>
								</section>
							}
						>
							<SettingsView activeStaffUser={activeStaffUser} />
						</Suspense>
					</WorkspaceRouteErrorBoundary>
				) : null}
				{currentView === "marketing" ? (
					/*
                ОТКРЫТИЕ «МАРКЕТИНГ/SEO» ГАСИЛО ВСЁ ПРИЛОЖЕНИЕ.
                `clinicProfileDraft` в хранилище объявлен как null и заполняется
                после загрузки клиники, а здесь читалось `clinicProfileDraft.phone`
                без проверки. Пока черновик не пришёл — «Cannot read properties of
                null (reading 'phone')». Причём падение происходило прямо в App, то
                есть ВЫШЕ границы ошибок раздела: экран становился пустым целиком, и
                помогала только перезагрузка страницы. Раздел теперь и сам под
                границей ошибок, как остальные: поломка внутри него не должна
                уносить рабочее место.
              */
					<WorkspaceRouteErrorBoundary
						view="marketing"
						label="Маркетинг/SEO"
						panelClassName="panel marketing-panel"
						panelId="marketing"
					>
						<Suspense
							fallback={<AppLoadingState message="Загрузка маркетинга" />}
						>
							<MarketingView
								clinicName={dashboard.clinicName}
								clinicPhone={clinicProfileDraft?.phone ?? ""}
							/>
						</Suspense>
					</WorkspaceRouteErrorBoundary>
				) : null}
				{/*
              ТРИ РАЗДЕЛА, КОТОРЫЕ БЫЛО НЕЧЕМ ОТКРЫТЬ.
              Склад, журнал стерилизации и воронка обращений отрисовывались только из
              AppRouter.tsx — файла, помеченного в собственной шапке как мёртвый и не
              импортированного ни одним модулем. Экраны проходили сборку и типы,
              сервер отвечал по их адресам, но на экран они не попадали никогда.
              Ветки перенесены сюда, в ту же цепочку по currentView, что и остальные
              разделы, и под ту же границу ошибок: поломка внутри раздела не должна
              уносить рабочее место.
            */}
				{currentView === "inventory" ? (
					<WorkspaceRouteErrorBoundary
						view="inventory"
						label={viewLabels.inventory}
						panelClassName="panel inventory-panel"
						panelId="inventory"
					>
						<Suspense fallback={<AppLoadingState message="Загрузка склада" />}>
							{/*
                    Организация берется из профиля клиники — того же поля, по которому
                    работают остальные разделы. Выдуманный UUID здесь не подставляется:
                    пока профиль не пришел, экран склада показывает свое пустое
                    состояние с объяснением, а не чужие остатки.
                  */}
							<InventoryView
								organizationId={
									dashboard.clinicSettings?.profile?.organizationId ?? ""
								}
							/>
						</Suspense>
					</WorkspaceRouteErrorBoundary>
				) : null}
				{currentView === "scanner" ? (
					<WorkspaceRouteErrorBoundary
						view="scanner"
						label={viewLabels.scanner}
						panelClassName="panel scanner-panel"
						panelId="scanner"
					>
						<Suspense
							fallback={
								<AppLoadingState message="Загрузка журнала стерилизации" />
							}
						>
							<ScannerView />
						</Suspense>
					</WorkspaceRouteErrorBoundary>
				) : null}
				{currentView === "leads" ? (
					<WorkspaceRouteErrorBoundary
						view="leads"
						label={viewLabels.leads}
						panelClassName="panel leads-panel"
						panelId="leads"
					>
						<Suspense
							fallback={<AppLoadingState message="Загрузка обращений" />}
						>
							<LeadsKanbanView />
						</Suspense>
					</WorkspaceRouteErrorBoundary>
				) : null}
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
				<Omnibar />
				<CommandPalette
					patients={filteredPatients}
					onSelectPatient={(id) => {
						setSelectedPatientId(id);
						setCurrentView("patients");
					}}
					// biome-ignore lint/suspicious/noExplicitAny: automated suppression
					onNavigate={(view) => setCurrentView(view as any)}
				/>
				<IncomingCallToast />
			</section>
			<nav className="dnt-bottom-nav" aria-label="Мобильная навигация">
				{(["shift", "schedule", "patients", "visit"] as const).map((view) => (
					<a
						key={view}
						className={currentView === view ? "active" : ""}
						href={`#${view}`}
						aria-current={currentView === view ? "page" : undefined}
						onPointerEnter={() => preloadWorkspaceView(view)}
						onFocus={() => preloadWorkspaceView(view)}
					>
						<ActionIcon section={view} />
						<span>{viewLabels[view]}</span>
					</a>
				))}
				<a
					href="#settings"
					className={currentView === "settings" ? "active" : ""}
				>
					<Database aria-hidden="true" />
					<span>Ещё</span>
				</a>
			</nav>
		</main>
	);
}

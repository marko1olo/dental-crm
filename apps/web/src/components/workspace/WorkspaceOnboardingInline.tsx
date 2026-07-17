import type {
	ClinicMode,
	DentalSpecialty,
	DocumentIngestionTarget,
	ImportSourceKind,
	PricelistSourceKind,
	SmartImportMode,
	StaffRole,
	UiLanguage,
	UpdateClinicProfileInput,
} from "@dental/shared";
import {
	documentFactoryGroups,
	documentSourceStatusLabels,
} from "@dental/shared";
import {
	ArrowRight,
	Bot,
	CalendarDays,
	Check,
	ClipboardCheck,
	Database,
	FileText,
	Lock,
	MessageSquare,
	Plus,
	RefreshCw,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import React from "react";
import { QrGatewayPanel } from "../../components/QrGatewayPanel";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useWorkspaceProfileStore } from "../../hooks/useWorkspaceProfile";

export function WorkspaceOnboardingInline() {
	const appLogicProps = useAppLogicContext();
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

	// Note: We extracted the 'showFullOnboardingGuide ? (' part
	return (
		<>
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
							остаются в настройке и не мешают диктовке, расписанию и карточке
							пациента.
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

				<div
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
				</div>

				<div className="onboarding-step-list" aria-label="Шаги знакомства">
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
				</div>

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
								Выбор роли и специализации сохраняется как настройка рабочего
								места и не подмешивает чужие разделы.
							</p>
						</div>
						<div className="onboarding-form-grid">
							<div
								className="role-picker form-span-2"
								aria-label="Роль нового сотрудника"
							>
								{roleFocusOrder.map((role) => (
									<button
										className={selectedWorkspaceRole === role ? "active" : ""}
										key={role}
										type="button"
										aria-pressed={selectedWorkspaceRole === role}
										onClick={() => setSelectedWorkspaceRole(role)}
									>
										{staffRoleLabels[role]}
									</button>
								))}
							</div>
							<div
								className="specialty-strip form-span-2"
								aria-label="Специализация врача"
							>
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
							</div>
						</div>
					</div>
				) : null}

				{onboardingStep === "clinic" ? (
					<div className="onboarding-panel">
						<div>
							<h3>Режим и базовые контакты</h3>
							<p>
								Режим меняет первый экран, очереди ролей и подсказки без ручной
								перенастройки интерфейса.
							</p>
						</div>
						<div className="mode-grid form-span-2" aria-label="Режим клиники">
							{(Object.keys(clinicModeLabels) as ClinicMode[]).map((mode) => (
								<button
									className={`mode-card ${dashboard.clinicSettings?.profile?.mode === mode ? "active" : ""}`}
									key={mode}
									type="button"
									aria-pressed={
										dashboard.clinicSettings?.profile?.mode === mode
									}
									onClick={() => changeClinicMode(mode)}
								>
									<strong>{clinicModeLabels[mode].title}</strong>
									<span>{clinicModeLabels[mode].detail}</span>
								</button>
							))}
						</div>
						<div className="onboarding-form-grid">
							<label>
								Название клиники
								<input
									value={clinicProfileDraft.clinicName}
									onChange={(event) =>
										updateClinicProfileDraft("clinicName", event.target.value)
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
										setUiLanguage(normalizeUiLanguageInput(event.target.value))
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
										updateClinicProfileDraft("workdayStart", event.target.value)
									}
								/>
							</label>
							<label>
								Конец смены
								<input
									type="time"
									value={clinicProfileDraft.workdayEnd}
									onChange={(event) =>
										updateClinicProfileDraft("workdayEnd", event.target.value)
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
							<div
								className="weekday-toggle-row form-span-2"
								role="group"
								aria-label="Рабочие дни клиники"
							>
								<span>Рабочие дни</span>
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
							</div>
						</div>
					</div>
				) : null}

				{onboardingStep === "legal" ? (
					<div className="onboarding-panel">
						<div>
							<h3>Юридические данные для договоров и налоговых справок</h3>
							<p>
								Без этих полей приложение не должно выдавать финальные договоры,
								акты и налоговые документы как готовые.
							</p>
						</div>
						<div className="onboarding-form-grid">
							<label>
								Юридическое лицо
								<input
									value={clinicProfileDraft.legalName}
									onChange={(event) =>
										updateClinicProfileDraft("legalName", event.target.value)
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
								Сотрудники и кресла сразу попадают в серверное состояние, аудит
								и расписание.
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
							<div
								className="role-picker form-span-2"
								aria-label="Роль нового сотрудника"
							>
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
							</div>
							{newStaffRole === "doctor" || newStaffRole === "assistant" ? (
								<div
									className="specialty-strip staff-specialty-picker form-span-2"
									aria-label="Специальность нового сотрудника"
								>
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
								</div>
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
						<div
							className="onboarding-schedule-grid form-span-2"
							aria-label="Расписание команды при первом запуске"
						>
							<div className="onboarding-schedule-section">
								<div>
									<h4>Расписание команды</h4>
									<p>
										Сразу задайте рабочие дни и часы. Изменения автосохраняются
										и остаются выбранными, пока вы их не поменяете.
									</p>
								</div>
								<div className="staff-list">
									{(dashboard.clinicSettings?.staff ?? [])
										.filter(
											(member) =>
												member.role === "doctor" || member.role === "assistant",
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
														<div
															className="weekday-toggle-row staff-weekday-row"
															role="group"
															aria-label={`Рабочие дни сотрудника: ${member.fullName}`}
														>
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
																		toggleStaffWorkingDay(member.id, day.value)
																	}
																>
																	{day.label}
																</button>
															))}
														</div>
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
											const scheduleDirty = chairScheduleDirtyIds.has(chair.id);
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
														<div
															className="weekday-toggle-row staff-weekday-row"
															role="group"
															aria-label={`Рабочие дни кресла: ${chair.name}`}
														>
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
																		toggleChairWorkingDay(chair.id, day.value)
																	}
																>
																	{day.label}
																</button>
															))}
														</div>
														<div className="staff-schedule-actions">
															<span
																className={`save-state save-state-${scheduleSaveState}`}
															>
																{scheduleSaveLabel}
															</span>
															<button
																className="secondary-button compact-button"
																type="button"
																onClick={() => void saveChairSchedule(chair.id)}
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
						</div>
					</div>
				) : null}

				{onboardingStep === "sources" ? (
					<div className="onboarding-panel">
						<div>
							<h3>Источники данных</h3>
							<p>
								Выберите рабочие источники один раз. Система сохранит эти
								настройки автоматически и будет использовать их в прайсах,
								переносе пациентов, документах, снимках и внешнем просмотре КТ,
								пока клиника сама их не поменяет.
							</p>
						</div>

						<div
							className="onboarding-source-config"
							aria-label="Быстрая настройка источников данных"
						>
							<section className="onboarding-source-section">
								<div>
									<strong>Прайс клиники</strong>
									<span>
										Откуда администратор чаще всего заносит цены и материалы.
									</span>
								</div>
								<div
									className="onboarding-source-choice-row"
									aria-label="Источник прайса"
								>
									{(
										Object.keys(
											pricelistSourceKindLabels,
										) as PricelistSourceKind[]
									).map((kind) => (
										<button
											className={pricelistSourceKind === kind ? "active" : ""}
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
								</div>
							</section>

							<section className="onboarding-source-section">
								<div>
									<strong>Перенос пациентов</strong>
									<span>
										Основной формат старой базы или бумажного журнала.
									</span>
								</div>
								<div
									className="onboarding-source-choice-row"
									aria-label="Источник переноса пациентов"
								>
									{(Object.keys(importSourceLabels) as ImportSourceKind[]).map(
										(kind) => (
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
										),
									)}
								</div>
							</section>

							<section className="onboarding-source-section">
								<div>
									<strong>Смешанная выгрузка</strong>
									<span>
										Как разбирать файл, где вместе пациенты, снимки и служебные
										строки.
									</span>
								</div>
								<div
									className="onboarding-source-choice-row"
									aria-label="Режим смешанного импорта"
								>
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
								</div>
							</section>

							<section className="onboarding-source-section">
								<div>
									<strong>Документы и файлы</strong>
									<span>
										Куда по умолчанию отправлять распознанный документ, таблицу,
										архив или фото.
									</span>
								</div>
								<div
									className="onboarding-source-choice-row"
									aria-label="Маршрут распознанных документов"
								>
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
								</div>
							</section>

							<section className="onboarding-source-section onboarding-source-section-wide">
								<div>
									<strong>Снимки и КТ</strong>
									<span>
										Основной поток RVG, ОПТГ, КТ, архива снимков или локальных
										папок.
									</span>
								</div>
								<div
									className="onboarding-source-choice-row"
									aria-label="Источник снимков"
								>
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
								</div>
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
						</div>

						<div className="onboarding-source-grid">
							<span>
								Автосохранено: прайс, импорт, документы, снимки, архив и внешний
								просмотр
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
								пациента, напоминания, памятки после лечения, отзывы и ссылки на
								портал сохраняются автоматически и применяются ко всей клинике.
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
									{telegramStatus?.webhookReady ? "готов" : "нужна проверка"}
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
										setTelegramPatientPortalBaseUrlDraft(event.target.value);
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
									Клиника сама выбирает момент просьбы оставить отзыв: от 1 до
									720 часов после закрытого визита или оплаты.
								</small>
							</label>
							<fieldset className="telegram-checkup-delay-fields full">
								<legend>Контроль после лечения</legend>
								<small>
									Через сколько часов Telegram спросит пациента о самочувствии
									после выданной памятки.
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
										{telegramPrivacyModeLabels.consented_phi_templates} (после
										аудита)
									</option>
								</select>
							</label>
						</div>
						<div
							className="onboarding-feature-list"
							aria-label="Быстрые сценарии Telegram"
						>
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
											checked={telegramEnabledFeaturesDraft.includes(feature)}
											onChange={() => toggleTelegramFeature(feature)}
										/>
										<span>{telegramFeatureLabel(feature)}</span>
									</label>
								))}
						</div>
						<div className="onboarding-inline-actions">
							<button
								className="secondary-button"
								type="button"
								onClick={() => void saveTelegramSettings()}
								disabled={isTelegramSettingsSaving}
							>
								<ShieldCheck aria-hidden="true" />{" "}
								{isTelegramSettingsSaving ? "Сохраняю" : "Сохранить Telegram"}
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
											? (telegramSettingsSaveError ?? "Telegram не сохранен.")
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
								{clinicModeLabels[
									dashboard.clinicSettings?.profile?.mode ?? "solo_doctor"
								]?.title ?? "—"}
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
								Первый рабочий экран можно открыть сейчас. Для договоров, актов
								и налоговых форм позже заполните:{" "}
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
							!onboardingReadyToFinish ? onboardingFinishGuidanceId : undefined
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
							onClick={() => void moveOnboardingTo(previousOnboardingStep.id)}
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
		</>
	);
}

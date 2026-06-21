// @ts-nocheck
// @ts-nocheck
import { useVisitLogic } from "../hooks/useVisitLogic";
import { useDocumentLogic } from "../hooks/useDocumentLogic";
import { useImagingLogic } from "../hooks/useImagingLogic";
import { useDocumentStore } from "../store/documentStore";
import { useAppStore } from "../store/appStore";
import { useImagingStore } from "../store/imagingStore";
import { useVisitStore } from "../store/visitStore";
import { usePatientStore } from "../store/patientStore";
import { useScheduleStore } from "../store/scheduleStore";
import { useSettingsStore } from "../store/settingsStore";
import { useDocumentStore as _unused } from "../store/documentStore";
import { type CSSProperties, type KeyboardEvent, lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, AlertTriangle, Bot, Building2, CalendarDays, Check, CheckCircle2, ClipboardCheck, ClipboardList, Copy, CreditCard, Database, Download, ExternalLink, FileCheck2, FileText, FlipHorizontal, Gauge, History, Image as ImageIcon, MessageSquare, Mic, Phone, Plus, ReceiptText, RefreshCw, RotateCcw, RotateCw, Search, Send, ShieldCheck, Sparkles, UploadCloud, UserCheck, Users, ZoomIn, ZoomOut } from "lucide-react";
import { buildRuleBasedVisitDraftFromTranscript, dashboardSchema, documentAmountSource, documentFactoryGroups, documentKindMetadata, documentSourceStatusLabels, normalizeDentalSpeechTranscript, type AcceptVisitDraftResponse, type AiJobKind, type AiRecognitionJob, type AiRecognitionJobResponse, type AiRecognitionTarget, type Appointment, type ClinicProfile, type ClinicMode, type ClinicalToothRow, type CreateAppointmentInput, type Dashboard, type DentalPricelistAnalysisResponse, type DentalSpecialty, type DenteTelegramBotMode, type DenteTelegramBotStatus, type DenteTelegramChatLinkListResponse, type DenteTelegramChatLinkPublic, type DenteTelegramFeature, type DenteTelegramLinkCodeCreated, type DenteTelegramLinkCodeListResponse, type DenteTelegramLinkCodePublic, type DenteTelegramMessagePreview, type DenteTelegramOutboxResponse, type DenteTelegramOutboxSendDueResponse, type DenteTelegramOutboxSendResponse, type DenteTelegramPostVisitCheckupDelayHoursByTopic, type DenteTelegramPrivacyMode, type DenteTelegramVisualCardKey, type DenteTelegramVisualCardUrls, type DocumentChainSummary, type DocumentAuditFacts, type DocumentIssueSignatureMode, type DocumentVoidReasonCode, type DocumentSourceStatus, type DocumentPayload, type DocumentIngestionResponse, type DocumentIngestionTarget, type ClinicPublicLookupResponse, type CommunicationTaskOutcome, type GeneratedDocument, type DicomRenderCachePlanResponse, type DicomFirstFramePreviewResponse, type DicomLocalFolderDiscoveryResponse, type DicomSeriesPreviewGroup, type DicomSeriesPreviewResponse, type DicomFolderSeriesPreviewResponse, type DicomFolderWorkupPath, type DicomFolderWorkupPlanResponse, type DicomViewerLaunchManifestResponse, type DicomViewerToolStateBundleResponse, type DicomViewerWorkbenchManifestResponse, type DicomWebConnectorCheckResponse, type DicomWorkbenchBundle, type DicomWorkbenchBundleListResponse, type DicomWorkbenchBundleResponse, type DicomWorkstationClientFacts, type DicomWorkstationReadinessResponse, type ImagingFolderScanResponse, type ImagingImportCommitResponse, type ImagingImportPreviewResponse, type ImagingSourceKind, type ImagingStudyKind, type ImagingViewerAnnotation, type ImagingViewerImplantPlan, type ImagingViewerSessionResponse, type ImagingViewerSessionState, type ImagingViewerTool, type ImagingViewerWindowPreset, type IntegrationCapability, type IntegrationCategory, type IntegrationPresetStatus, type ImportCommitResponse, type IssueDocumentInput, type VoidDocumentInput, type ImportIntakeResponse, type ImportPreviewResponse, type ImportSourceKind, type InstallmentPaymentStatus, type LocalImagingOrganizerResponse, type MigrationAutopilotResponse, type MigrationLocalSourceDiscoveryResponse, type MigrationLocalSourceProbeResponse, type MigrationLocalSourceWorkupResponse, type LocalBridgeReadinessResponse, type LocalBridgeStatus, type LocalBridgeUsePath, type LocalBridgeUsePlansResponse, type OutpatientMedicalCard025uPayload, type PaymentMethod, type Patient, type PatientAdministrativeProfile, type PatientIntakePregnancyStatus, type PhotoVideoConsentMaterial, type PostVisitCareTopic, type PricelistSourceKind, type ProcedureSpecificConsentProcedure, type ProtocolTemplate, type ResourceLoad, type ScheduleWarning, type SmartImportCommitResponse, type SmartImportMode, type SmartImportPreviewResponse, type SpeechChunkUploadInput, type SpeechGatewayHealthReport, type SpeechGatewayStatus, type SpeechProviderConnector, type SpeechProviderRuntimeStatus, type SpeechRecordingAssembly, type SpeechRecordingRecoveryList, type SpeechRecordingStrategy, type SpeechTranscriptPolishResponse, type SpeechTranscriptionResponse, type SpeechProvider, type StaffRole, type StaffWorkingHours, type TaxDeductionApplicationDeliveryChannel, type TaxDeductionApplicationForm, type TaxDeductionApplicationRelationship, type TreatmentPlanAcceptanceVariant, type UpdateAppointmentInput, type UpdateClinicProfileInput, type UpdatePatientInput, type UpdatePatientAdministrativeProfileInput, type UiLanguage, type VisitDraftAutosaveResponse, type VisitNoteDraft, type XrayCbctReferralPregnancyStatus, type XrayCbctReferralPriority, type XrayCbctReferralStudyType } from "@dental/shared";
import { AppLoadingState, AppUnlockState } from "../AppBootState";
import { browserContinuityRegistrationLabels, formatByteSize, formatMegabytes, inspectBrowserContinuity, type BrowserContinuityStatus } from "../browserContinuity";
import { ClinicalRulePanel } from "../ClinicalRulePanel";
import { communicationDocumentTaskActionLabels, telegramCareRequestTaskCareTopics, telegramCareRequestWorkflowCareTopics, telegramDocumentRequestTaskDocumentKinds, telegramDocumentRequestWorkflowDocumentKinds } from "../communicationTaskData";
import { imagingConnectorCards, imagingViewerCapabilities, recognitionPresets } from "../settingsStaticData";
import { motionSafeScrollIntoView } from "../motionPreference";
import { normalizeRubAmountInput, rubAmountInputMissingStep } from "../rubAmountInput";
import { imagingCaptureDistanceMs, imagingComparisonReason, imagingComparisonScore, type ImagingStudyRow } from "../imagingComparison";
import { dicomLabel, dicomDiagnosticPixelPolicyLabels, dicomExecutionLaneLabels, dicomGpuClassLabels, dicomQualityModeLabels, dicomReadinessCheckLabels, dicomRenderMemoryBudgetClassLabels, dicomRuntimeTierLabels, dicomSeriesViewerLabels, dicomTextureStrategyLabels, dicomViewerLaunchModeLabels, dicomWebStatusLabels, imagingKindLabels, imagingSourceDetails, imagingSourceLabels, imagingViewerToolLabels, localImagingModelRoleLabels, localImagingOrganizerActionLabels, mprAxisPresetDeg, mprCacheModeLabels, mprClinicalPresets, mprLoadStrategyLabels, mprProjectionLabels, mprProjectionOrientationLabels, mprResourceTierLabels, mprSlabPresetMm, mprToolLabels, mprSeriesRequiredProjectionLabel, mprUnavailableProjectionLabel, mprWindowPresetLabels, policyAuditEventLabels, pricelistParserModeLabels, type MprClinicalPreset, type MprProjection, type MprWindowPreset } from "../imagingUiLabels";
import { type CtPlanningArtifactCommand } from "../ctPlanningArtifactCommands";
import { CtPlanningToolsPanel, findCtPlanningQuickActionForArtifactCommand, type CtImplantLibraryItem, type CtPlanningQuickAction } from "../ctPlanningTools";
import { clampMprAxisDeg, clampMprSliceIndex, clampMprSlabMm, formatSignedMprStep, formatMprAxisAngleBadge, formatMprAxisDirectionLabel, formatMprAxisRangeValue, formatMprAxisVisualizerLabel, formatMprSliceBadge, formatMprSliceRangeValue, formatMprSlabBadge, formatMprSlabRangeValue, buildMprAxisGuidance, mprAxisBounds, mprAxisNudgeDeg, mprProjectionCompassLabels, mprSliceFraction, mprSliceIndexFromFraction, mprSliceNudgeSteps, mprSlicePresetFractions, mprSlabBounds, mprSlabNudgeMm, resolveMprKeyboardAdjustment } from "../mprControlMath";
import { buildMprClinicalChecklist, buildMprOperatorSummary, buildMprWorkbenchSummary, describeMprClinicalPresetProjectionFallback, findNearestMprClinicalPreset, mprClinicalNextAction, resolveMprClinicalPresetProjection } from "../mprClinicalStatus";
import { postVisitCarePresets } from "../postVisitCareData";
import { dentalMaterialKindLabels, dentalRestorationTypeLabels, pricelistItemMaterialText, pricelistMaterialSummaryText, pricelistRecognitionBrandGroups, pricelistRecognitionServiceGroups, pricelistSourceKindLabels, pricelistWarningsText } from "../pricelistUiMeta";
import { specialtyQuickPhraseLibrary } from "../visitDictationData";
import { inferDashboardVisitSpecialty, inferSpecialtyFromText, visitSpecialtyFocusOptions } from "../visitSpecialtyData";
import { ActionIcon, appViews, type AppView, getFilteredAppViews, viewLabels, WorkspaceSidebar, WorkspaceTopbar } from "../workspaceShell";
import { preloadWorkspaceView, scheduleIdleWorkspacePreload } from "../workspacePreload";
import { WorkspaceContinuityStrip } from "../workspaceContinuityStrip";
import { WorkspaceRouteErrorBoundary } from "../workspaceRouteErrorBoundary";
import { defaultTelegramPostVisitCheckupDelayDrafts, defaultTelegramPostVisitCheckupDelayHoursByTopic, postVisitCareTopicOptions, telegramFeatureHelp, telegramFeatureLabels, telegramFeatureOptions, telegramPostVisitCheckupDelayFields, telegramVisualCardFields, type TelegramPostVisitCheckupDelayDrafts, type TelegramPostVisitCheckupDelayKey } from "../workspaceStaticOptions";
import { appointmentLabels, clinicalRuleActionLabels, clinicalRuleSeverityLabels, clinicalRuleSummaryForUi, clinicModeLabels, communicationChannelLabels, communicationIntentLabels, communicationPriorityLabels, communicationStatusLabels, completedActContractReferenceForUi, dicomFolderWorkupPathLabels, documentActionLabels, documentLabels, documentSourceStatusClassNames, documentStatusLabels, integrationCapabilityLabels, integrationCategoryLabels, integrationStatusLabels, localBridgeStatusLabels, localBridgeUsePathLabels, moneyDocumentKinds, paymentFiscalReceiptLabelForUi, paymentMethodLabels, paymentTaxYearForUi, recognitionTargetLabels, scenarioPriorityLabels, scenarioStrategyLabels, serviceCategoryLabels, specialtyLabels, speechProviderHealthLabels, speechProviderModeLabels, speechProviderSelectionLabels, speechProviderStatusLabels, speechRecordingPathLabels, speechRecoveryStateLabels, staffRoleLabels, structuredPayloadDocumentKinds, taxPaymentPayerKeyForUi, taxPaymentSelectionDocumentKinds, taxPaymentSelectionPayloadDocumentKinds, treatmentStatusLabels, warningSeverityLabels, workloadStateLabels } from "../workspaceUiLabels";
import { ImagingViewerState, ImagingViewerPlan, CbctWorkbenchPlane, MprAxisVisualizerStyle, viewerWindowPresetForStudy, defaultImagingViewerState, defaultDicomFirstFrameViewerState, ImagingViewerLocalDraft, ImagingViewerSaveState, DicomWorkbenchLocalDraft, DicomWorkbenchIndexedDbDraft, MprWorkbenchState, MprWorkbenchLocalDraft, MprWorkbenchIndexedDbDraft, LocalImagingFolderDraft, DicomFirstFramePreviewMetadata, DicomFirstFramePreviewRequestContext, DicomFirstFramePreviewOptions, BrowserFileSystemFileHandle, BrowserFileSystemDirectoryHandle, BrowserFileSystemHandle, BrowserDirectoryPickerWindow, DentalDesktopRuntimeWindow, BrowserPickedImagingFolderPreview, BrowserPickedImagingScanStats, BrowserImagingScanPhase, BrowserImagingScanProgress, BrowserImagingScanOptions, LocalDicomOperationOptions, BrowserImagingScanRuntime, BrowserMigrationSourceKind, BrowserMigrationFileKind, BrowserMigrationFolderStats, BrowserMigrationScanStats, BrowserMigrationScanPhase, BrowserMigrationScanProgress, BrowserMigrationScanOptions, BrowserMigrationScanRuntime, imagingViewerLocalStoragePrefix, dicomWorkbenchLocalStorageKey, mprWorkbenchLocalStoragePrefix, localImagingFolderStorageKey, browserPickedImagingFolderStorageKey, browserMigrationScanFileLimit, browserMigrationScanFolderLimit, browserMigrationScanDirectoryEntryLimit, browserMigrationScanMagicReadLimit, browserMigrationScanYieldEveryUnits, browserMigrationScanYieldEveryMs, browserMigrationScanProgressEveryUnits, browserMigrationScanProgressEveryMs, browserImagingScanFileLimit, browserImagingScanFolderLimit, browserImagingScanDirectoryEntryLimit, browserImagingScanMagicReadLimit, browserImagingScanYieldEveryUnits, browserImagingScanYieldEveryMs, browserImagingScanProgressEveryUnits, browserImagingScanProgressEveryMs, uiPreferencesStorageKey, documentPaymentSelectionStorageKey, documentPayloadDraftStorageKey, documentIssueSignatureStorageKey, uiPreferencesServerPath, onboardingStorageKey, clinicProfileEndpoint, denteAdminSecretHeaderName, localConvenienceRetentionMs, sensitiveLocalDraftRetentionMs, speechAudioQueueRetentionMs, DocumentPaymentSelectionEntry, DocumentPaymentSelectionStore, Outpatient025uDocumentDraftFields, MedicalRecordExtractDocumentDraftFields, DocumentPayloadDraftEntry, DocumentPayloadDraftStore, DocumentIssueSignatureDraft, documentIssueSignatureModeLabels, documentVoidReasonLabels, browserGeneratedId, currentLocalDateTimeInputValue, normalizedDocumentIssueSignatureMode, organizationScopedLocalStorageKey, normalizedLocalOrganizationId, localSavedAtFresh, documentIssueSignatureLocalKey, documentPaymentSelectionLocalKey, documentPayloadDraftLocalKey, onboardingLocalKey, loadDocumentIssueSignatureDraft, saveDocumentIssueSignatureDraft, emptyDocumentPaymentSelectionStore, normalizedDocumentPaymentSelectionIds, loadDocumentPaymentSelectionStore, loadDocumentPaymentSelection, saveDocumentPaymentSelection, todayDateInputValue, dateInputValuePlusDays, emptyOutpatient025uDocumentDraftFields, documentPayloadDraftKey, emptyDocumentPayloadDraftStore, normalizedOutpatient025uCode, localDraftString, normalizeOutpatient025uDocumentDraftFields, emptyMedicalRecordExtractDocumentDraftFields, normalizeMedicalRecordExtractDocumentDraftFields, loadDocumentPayloadDraftStore, loadOutpatient025uDocumentDraft, saveOutpatient025uDocumentDraft, loadMedicalRecordExtractDocumentDraft, saveMedicalRecordExtractDocumentDraft, imagingViewerLocalKey, loadLocalImagingViewerDraft, dicomWorkbenchSeriesKey, offlineDraftOrganizationKey, dicomWorkbenchIndexedDbKey, mprWorkbenchIndexedDbKey, normalizeLocalDicomWorkbenchDraft, newerDicomWorkbenchDraft, loadLocalDicomWorkbenchDraftFromLocalStorage, mprWorkbenchSeriesKey, mprWorkbenchLocalKey, isMprProjection, isMprWindowPreset, resolveMprWorkbenchProjection, normalizeMprWorkbenchState, loadLocalMprWorkbenchDraftFromLocalStorage, saveLocalMprWorkbenchDraftToLocalStorage, localImagingFolderFingerprint, dicomDownloadRedactionWarning, uniqueDicomDownloadWarnings, isLocalDicomDownloadPath, redactedLocalDicomDownloadPath, redactedDicomDownloadReferenceId, redactDicomDownloadText, redactedDicomDownloadWarnings, redactedDicomViewerToolStateBundleForDownload, redactedDicomWorkbenchManifestForDownload, classifyBrowserImagingFileName, browserMigrationSourceTitles, browserLegacyMisTextPattern, classifyBrowserMigrationFileName, browserMigrationFolderHintScore, browserMigrationSourceKindFromStats, buildBrowserMigrationDiscovery, browserFileHasDicomMagic, browserImagingScanNowMs, createBrowserImagingScanRuntime, browserImagingScanElapsedFromIso, throwIfBrowserImagingScanAborted, isBrowserImagingScanAbortError, browserImagingScanYield, browserImagingScanProgressFromStats, publishBrowserImagingScanProgress, maybeYieldBrowserImagingScan, createBrowserMigrationScanRuntime, throwIfBrowserMigrationScanAborted, isBrowserMigrationScanAbortError, browserMigrationScanProgressFromStats, publishBrowserMigrationScanProgress, maybeYieldBrowserMigrationScan, addBrowserMigrationKindToScanStats, browserPickedFolderFingerprint, saveBrowserPickedImagingFolderPreview, loadBrowserPickedImagingFolderPreview, removeBrowserPickedImagingFolderPreview, buildBrowserPickedImagingFolderPreview, loadLocalImagingFolderDraft, saveLocalImagingFolderDraft, removeLocalImagingFolderDraft, saveLocalDicomWorkbenchDraftToLocalStorage, createLocalDicomWorkbenchDraft, dicomWorkbenchManifestHasRedactedSource, removeLocalDicomWorkbenchDraftFromLocalStorage, hasDentalDesktopShellBridge, detectDicomRuntimeSurfaceHint, collectDicomWorkstationClientFacts, saveLocalImagingViewerDraft, ctImplantPlanFromLibraryItem, imagingViewerPlans, imagingSourceChoices, smartImportModeLabels, importSourceLabels, ingestionTargetLabels, documentIngestionQualityLabels, telegramBlockedReasonLabels, telegramWarningLabels, telegramHumanMessage, isTelegramOutboxItemDueForUi, documentDetectedKindLabels, documentDetectedKindLabel, dicomFirstFrameStatusLabels, toothRows, toothStateByCode, formatTime, patientName, findPatient, money, minutesLabel, formatDateTime, formatShortDate, BrowserSpeechRecognition, BrowserWindowWithSpeech, VisitNoteField, VisitNoteForm, visitNoteFieldDefinitions, visitDraftQualityLabels, visitDraftSignalLabels, visitDraftMissingFieldLabels, visitDraftSignalLabel, visitDraftMissingFieldLabel, speechQualityLabels, emptyVisitNoteForm, visitNoteFormFromVisit, visitNoteFormFromDraft, visitNoteDraftFromForm, VisitLocalDraft, PendingVisitSave, PendingSpeechChunk, PersistenceHealth, PersistenceBackupCheck, PersistenceIntegrityReport, visitLocalDraftKey, pendingVisitSaveQueueKey, pendingSpeechChunkQueueKey, speechChunkDbName, speechChunkDbVersion, pendingVisitSaveStoreName, dicomWorkbenchDraftStoreName, mprWorkbenchDraftStoreName, speechChunkStoreName, speechLocalStorageFallbackMaxBytes, requiredSpeechChunkDbStoreNames, speechChunkDbPromise, pendingVisitSaveQueueLocalKey, pendingSpeechChunkQueueLocalKey, localQueueOrganizationMatches, normalizeSpeechAppendText, appendSpeechTextWithoutDuplicateTail, isDentalSpecialty, telegramQrSvgToDataUrl, UiPreferences, UiPreferencesInput, TelegramOutboxStatusFilter, TelegramOutboxTemplateFilter, uiLanguageLabels, UiLanguageOption, defaultUiLanguageOption, uiLanguageOptions, emptyTelegramVisualCardUrlDrafts, telegramPublicUrlSensitiveQueryKeys, telegramPublicUrlSensitivePathSegments, normalizeTelegramPublicHttpsUrlDraft, normalizeTelegramVisualCardUrlDraftsForSave, normalizeTelegramBotUsernameDraft, onboardingTelegramVisualCardKeys, TelegramFeaturePlan, TelegramLinkSubjectType, telegramModeLabels, telegramModeHints, telegramPrivacyModeLabels, telegramPrivacyModeHints, telegramTemplateLabels, telegramClassificationLabels, telegramDeliveryStatusLabels, telegramLinkCodeStatusLabels, telegramOutboxStatusFilterOptions, telegramOutboxStatusFilterLabels, telegramOutboxTemplateFilterOptions, telegramOutboxTemplateFilterLabels, TelegramInlineButtonPreview, telegramInlineButtonKindLabels, telegramInlineButtonRowsFromReplyMarkup, telegramInlineButtonsFromReplyMarkup, telegramInlineButtonsFromPreview, OnboardingStep, onboardingStepValues, ClinicProfileDraft, ClinicProfileSaveState, PatientCoreDraft, PatientCoreSaveState, PatientAdministrativeProfileDraft, PatientAdministrativeProfileSaveState, StaffScheduleDraft, StaffScheduleSaveState, AppointmentScheduleDraft, AppointmentScheduleSaveState, emptyAppointmentScheduleDraft, MedicalDocumentReleaseChannel, medicalDocumentReleaseChannelLabels, PaymentRefundCorrectionAction, PaymentRefundCorrectionMethod, paymentRefundCorrectionActionOptions, paymentRefundCorrectionMethodOptions, treatmentAcceptanceVariantOptions, xrayPriorityOptions, outpatient025uDemographicCodeOptions, Outpatient025uDemographicCode, patientIntakePregnancyStatusOptions, taxApplicationRelationshipOptions, taxApplicationFormOptions, taxApplicationDeliveryChannelOptions, ClinicalToothSurface, ClinicalToothStatus, clinicalToothSurfaceAliases, clinicalToothStatusAliases, installmentPaymentStatusAliases, defaultClinicalToothRowsText, normalizeTaxApplicationRelationship, procedureSpecificConsentProcedureOptions, xrayStudyTypeOptions, xrayPregnancyStatusOptions, photoVideoMaterialOptions, defaultUiPreferences, aiJobKindPreferenceValues, aiJobKindLabels, isRecordKey, isOptionValue, isStringUnionValue, isUiLanguage, normalizeUiLanguageInput, isStaffRole, isPaymentMethod, isPricelistSourceKind, isAiJobKind, isAiRecognitionTarget, isImportSourceKind, isDocumentIngestionTarget, isImagingSourceKind, isSmartImportMode, isImagingKindFilter, isBooleanPreference, isTaxDocumentYearPreference, isDocumentKindPreference, isAppointmentStatusFilterPreference, isTaxApplicationFormPreference, isTaxApplicationDeliveryChannelPreference, isProcedureSpecificConsentProcedurePreference, isPostVisitCareTopicPreference, isDocumentIssueSignatureModePreference, isBoundedPreferenceString, isNullablePreferenceString, isOnboardingStepPreference, isTelegramLinkSubjectTypePreference, isTelegramOutboxStatusFilterPreference, isTelegramOutboxTemplateFilterPreference, normalizedAppointmentStatus, normalizedAppointmentStatusFilter, normalizedDocumentKind, normalizedPatientIntakePregnancyStatus, normalizedTaxApplicationRelationshipSelect, normalizedTaxApplicationForm, normalizedTaxApplicationDeliveryChannel, normalizedProcedureSpecificConsentProcedure, normalizedTreatmentPlanAcceptanceVariant, normalizedPostVisitCareTopic, normalizedXrayStudyType, normalizedXrayPriority, normalizedXrayPregnancyStatus, normalizedOutpatient025uDemographicCode, normalizedMedicalDocumentReleaseChannel, normalizedPaymentRefundCorrectionAction, normalizedPaymentRefundCorrectionMethod, normalizedDocumentVoidReasonCode, normalizedClinicalRuleAction, normalizedClinicalRuleSeverity, normalizedStaffRole, normalizedDentalSpecialty, normalizedServiceCategory, normalizedTelegramBotMode, normalizedTelegramPrivacyMode, normalizedTelegramLinkSubjectType, normalizedTelegramOutboxStatusFilter, normalizedTelegramOutboxTemplateFilter, pickUiPreference, normalizeUiPreferencesPayload, loadUiPreferences, withSavedUiPreferenceTimestamp, persistUiPreferences, saveUiPreferences, denteAdminSecretRequestHeaders, loadServerUiPreferences, saveServerUiPreferences, uiPreferencesSyncErrorMessage, responseStatusFailureLabel, responseErrorMessage, WorkflowResponseError, acceptedVisitSaveFailureIsRetryable, requestFailureMessage, technicalWorkflowFailurePattern, operatorReadableErrorDetail, operatorReadableErrorDetailFromUnknown, operatorWorkflowFailureMessage, browserLocalSourceErrorMessage, browserCapabilityFailureMessage, OnboardingDismissalState, parseOnboardingDismissalState, loadOnboardingDismissalState, mergeLocalOnboardingDismissal, saveOnboardingDismissed, weekdayOptions, defaultWorkingDays, validClockTime, normalizeClockTime, normalizeWorkingDaysDraft, normalizeOptionalWorkingDaysDraft, staffWorkingHoursFromSimpleDraft, staffScheduleDraftFromWorkingHours, appointmentScheduleDraftFromAppointment, timeZoneOffsetMinutes, timeZoneOffsetSuffix, timeZoneDateParts, toDateTimeLocalValue, fromDateTimeLocalValue, addMinutesToClinicDateTimeLocal, weekdayFromDateInput, defaultAppointmentStartLocal, newAppointmentDraftFromDashboard, isValidDateParts, toDateInputValue, isDateInputValue, isDateTimeLocalInputValue, nullableAppointmentDraftValue, appointmentUpdateInputFromDraft, appointmentCreateInputFromDraft, appointmentScheduleDraftSignature, appointmentScheduleDateMissingSteps, appointmentScheduleMissingFields, staffWorkingHoursFromDraft, staffScheduleDraftSignature, defaultStaffScheduleDraft, emptyClinicProfileDraft, clinicProfileDraftFromProfile, nullableClinicDraftValue, emptyPatientCoreDraft, patientCoreDraftFromPatient, emptyPatientAdministrativeProfileDraft, patientAdministrativeProfileDraftFromPatient, nullablePatientDraftValue, buildPatientCorePayload, patientCoreDraftSignature, buildPatientAdministrativeProfilePayload, patientAdministrativeProfileDraftSignature, patientAdministrativeProfileDraftIssue, buildClinicProfileUpdatePayload, clinicProfileDraftSignature, clinicLegalMissingFields, clinicLegalReadinessPercent, isVisitNoteForm, loadVisitLocalDraft, saveVisitLocalDraft, isNullableString, isVisitNoteDraft, parsePendingVisitSaveQueue, normalizePendingVisitSave, sortPendingVisitSaves, loadPendingVisitSavesFromLocalStorage, savePendingVisitSavesToLocalStorage, isPendingSpeechChunk, normalizePendingSpeechChunk, sortPendingSpeechChunks, loadPendingSpeechChunksFromLocalStorage, savePendingSpeechChunksToLocalStorage, speechChunkIndexedDbAvailable, pendingVisitSaveIndexedDbAvailable, assertSpeechChunkDbStores, openSpeechChunkDb, readLocalDicomWorkbenchDraftFromIndexedDb, saveLocalDicomWorkbenchDraftToIndexedDb, deleteLocalDicomWorkbenchDraftFromIndexedDb, migrateLocalDicomWorkbenchDraftFromLocalStorage, loadLocalDicomWorkbenchDraft, saveLocalDicomWorkbenchDraft, removeLocalDicomWorkbenchDraft, normalizeMprWorkbenchDraft, readLocalMprWorkbenchDraftFromIndexedDb, saveLocalMprWorkbenchDraftToIndexedDb, deleteLocalMprWorkbenchDraftFromIndexedDb, migrateLocalMprWorkbenchDraftFromLocalStorage, loadLocalMprWorkbenchDraft, saveLocalMprWorkbenchDraft, readPendingVisitSavesFromIndexedDb, savePendingVisitSavesToIndexedDb, deletePendingVisitSaveFromIndexedDb, migratePendingVisitSavesFromLocalStorage, loadPendingVisitSaves, savePendingVisitSaves, readPendingSpeechChunksFromIndexedDb, savePendingSpeechChunksToIndexedDb, putPendingSpeechChunkToIndexedDb, deletePendingSpeechChunkFromIndexedDb, migrateSpeechChunksFromLocalStorage, loadPendingSpeechChunks, createLocalQueueId, queuePendingSpeechChunk, removePendingSpeechChunkById, blobToBase64, PricelistImageMimeType, pricelistImageMimeTypes, maxPricelistImageBase64Chars, readFileAsDataUrl, loadImageFromDataUrl, preparePricelistImage, queuePendingVisitSave, latestPendingVisitSaveAt, visitSaveReceiptText, buildOfflineVisitDraftFromTranscript, normalizePersistenceHealth, DenteTelegramPortalSection, DenteTelegramHandoffTarget, denteTelegramHandoffTargets, isDenteTelegramPortalSection, readDenteTelegramHandoffTarget, stripDenteTelegramHandoffQuery, workspaceScopeLabels, patientInsightRiskLabels, recommendedActionPriorityLabels, appointmentReadinessLabels, settingsTabs, SettingsTab, AdminSecretSessionDomain, AdminSecretUnlockDomain, onboardingSteps, roleFocusOrder, speechProviderConnectorLabels, viewFromHash, settingsTabFromHash } from "../AppHelpers";


export function useFinanceLogic() {
function updateTelegramVisualCardUrlDraft(key: DenteTelegramVisualCardKey, value: string) {
  setTelegramVisualCardUrlDrafts(current => ({
    ...current,
    [key]: value.trim() ? value : null
  }));
  markTelegramSettingsDirty();
}

function paymentInvoiceBankDetailsValue(): string {
  return paymentInvoiceBankDetails.trim() || dashboard?.clinicSettings.profile.bankDetails?.trim() || "";
}

function telegramLinkCodeLedgerRequestParams(cursor?: string | null): URLSearchParams {
  const params = new URLSearchParams();
  params.set("limit", "8");
  if (cursor) params.set("cursor", cursor);
  appendTelegramRuntimeScopeParams(params);
  return params;
}

function telegramChatLinkLedgerRequestParams(cursor?: string | null): URLSearchParams {
  const params = new URLSearchParams();
  params.set("limit", "8");
  if (cursor) params.set("cursor", cursor);
  appendTelegramRuntimeScopeParams(params);
  return params;
}

async function loadTelegramControlPlane(options: {
  silent?: boolean;
  adminSecret?: string;
} = {}) {
  if (!options.silent) setIsTelegramLoading(true);
  try {
    const headers = telegramControlPlaneHeaders({}, options.adminSecret);
    const outboxParams = telegramOutboxRequestParams();
    const linkCodeParams = telegramLinkCodeLedgerRequestParams();
    const chatLinkParams = telegramChatLinkLedgerRequestParams();
    const [statusResponse, featurePlanResponse, outboxResponse, linkCodesResponse, chatLinksResponse] = await Promise.all([fetch(telegramStatusEndpoint(), {
      cache: "no-store",
      headers
    }), fetch("/api/telegram/feature-plan", {
      cache: "no-store",
      headers
    }), fetch(`/api/telegram/outbox?${outboxParams.toString()}`, {
      cache: "no-store",
      headers
    }), fetch(`/api/telegram/link-codes?${linkCodeParams.toString()}`, {
      cache: "no-store",
      headers
    }), fetch(`/api/telegram/chat-links?${chatLinkParams.toString()}`, {
      cache: "no-store",
      headers
    })]);
    if (!statusResponse.ok) throw new Error(await responseErrorMessage(statusResponse, "Статус Telegram"));
    if (!featurePlanResponse.ok) throw new Error(await responseErrorMessage(featurePlanResponse, "План Telegram"));
    if (!outboxResponse.ok) throw new Error(await responseErrorMessage(outboxResponse, "Очередь Telegram"));
    if (!linkCodesResponse.ok) throw new Error(await responseErrorMessage(linkCodesResponse, "Коды Telegram"));
    if (!chatLinksResponse.ok) throw new Error(await responseErrorMessage(chatLinksResponse, "Связанные Telegram-чаты"));
    setTelegramStatus((await statusResponse.json()) as DenteTelegramBotStatus);
    setTelegramFeaturePlan((await featurePlanResponse.json()) as TelegramFeaturePlan);
    setTelegramOutbox((await outboxResponse.json()) as DenteTelegramOutboxResponse);
    const nextLinkCodeLedger = (await linkCodesResponse.json()) as DenteTelegramLinkCodeListResponse;
    const nextChatLinkLedger = (await chatLinksResponse.json()) as DenteTelegramChatLinkListResponse;
    setTelegramLinkCodeLedger(nextLinkCodeLedger);
    setTelegramChatLinkLedger(nextChatLinkLedger);
    setTelegramLinkCodes(nextLinkCodeLedger.linkCodes);
    setTelegramChatLinks(nextChatLinkLedger.chatLinks);
  } catch (telegramError) {
    if (!options.silent) {
      setError(operatorWorkflowFailureMessage("Панель управления Telegram недоступна", telegramError));
    }
  } finally {
    if (!options.silent) setIsTelegramLoading(false);
  }
}

async function loadMoreTelegramLinkCodes() {
  if (!telegramLinkCodeLedger?.nextCursor || isTelegramLinkCodesLoadingMore) return;
  setIsTelegramLinkCodesLoadingMore(true);
  try {
    const headers = telegramControlPlaneHeaders({}, telegramAdminSecretSession || telegramAdminSecretDraft);
    const params = telegramLinkCodeLedgerRequestParams(telegramLinkCodeLedger.nextCursor);
    const response = await fetch(`/api/telegram/link-codes?${params.toString()}`, {
      cache: "no-store",
      headers
    });
    if (!response.ok) throw new Error(await responseErrorMessage(response, "Коды Telegram"));
    const nextPage = (await response.json()) as DenteTelegramLinkCodeListResponse;
    const knownIds = new Set(telegramLinkCodes.map(code => code.id));
    const linkCodes = [...telegramLinkCodes, ...nextPage.linkCodes.filter(code => !knownIds.has(code.id))];
    setTelegramLinkCodes(linkCodes);
    setTelegramLinkCodeLedger({
      ...nextPage,
      linkCodes
    });
  } catch (telegramError) {
    setError(operatorWorkflowFailureMessage("Коды Telegram не загрузились", telegramError));
  } finally {
    setIsTelegramLinkCodesLoadingMore(false);
  }
}

async function loadMoreTelegramChatLinks() {
  if (!telegramChatLinkLedger?.nextCursor || isTelegramChatLinksLoadingMore) return;
  setIsTelegramChatLinksLoadingMore(true);
  try {
    const headers = telegramControlPlaneHeaders({}, telegramAdminSecretSession || telegramAdminSecretDraft);
    const params = telegramChatLinkLedgerRequestParams(telegramChatLinkLedger.nextCursor);
    const response = await fetch(`/api/telegram/chat-links?${params.toString()}`, {
      cache: "no-store",
      headers
    });
    if (!response.ok) throw new Error(await responseErrorMessage(response, "Связанные Telegram-чаты"));
    const nextPage = (await response.json()) as DenteTelegramChatLinkListResponse;
    const knownIds = new Set(telegramChatLinks.map(link => link.id));
    const chatLinks = [...telegramChatLinks, ...nextPage.chatLinks.filter(link => !knownIds.has(link.id))];
    setTelegramChatLinks(chatLinks);
    setTelegramChatLinkLedger({
      ...nextPage,
      chatLinks
    });
  } catch (telegramError) {
    setError(operatorWorkflowFailureMessage("Связанные Telegram-чаты не загрузились", telegramError));
  } finally {
    setIsTelegramChatLinksLoadingMore(false);
  }
}

  return {
    updateTelegramVisualCardUrlDraft,
    markTelegramSettingsDirty,
    dashboard,
    loadTelegramControlPlane,
    setError,
    loadMoreTelegramLinkCodes,
    telegramLinkCodeLedger,
    isTelegramLinkCodesLoadingMore,
    telegramAdminSecretSession,
    telegramAdminSecretDraft,
    telegramLinkCodes,
    loadMoreTelegramChatLinks,
    telegramChatLinkLedger,
    isTelegramChatLinksLoadingMore,
    telegramChatLinks
  };
}

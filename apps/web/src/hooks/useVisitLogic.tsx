// @ts-nocheck
// @ts-nocheck
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


export function useVisitLogic() {
const newAppointmentDraftUserEditedRef = useRef(false);

const speechAudioContextRef = useRef<AudioContext | null>(null);

const speechAnalyserRef = useRef<AnalyserNode | null>(null);

const speechMonitorTimerRef = useRef<number | null>(null);

const speechRecordingIdRef = useRef<string | null>(null);

const speechChunkIndexRef = useRef(0);

const speechSegmentStartedAtRef = useRef(0);

const speechLastSoundAtRef = useRef(0);

const speechPendingChunkDurationMsRef = useRef<number | null>(null);

const speechUploadPromisesRef = useRef<Set<Promise<void>>>(new Set());

const appliedSpeechChunkKeysRef = useRef<Set<string>>(new Set());

const appointmentScheduleDraftsRef = useRef<Record<string, AppointmentScheduleDraft>>({});

function toggleTelegramFeature(feature: DenteTelegramFeature) {
  setTelegramEnabledFeaturesDraft(current => current.includes(feature) ? current.filter(item => item !== feature) : [...current, feature]);
  if (feature === "voice_note_intake" && !telegramEnabledFeaturesDraft.includes(feature)) {
    setTelegramAllowVoiceIntakeDraft(true);
  }
  markTelegramSettingsDirty();
}

function parseTelegramPostVisitCheckupDelayHours(): DenteTelegramPostVisitCheckupDelayHoursByTopic {
  const values = {
    ...defaultTelegramPostVisitCheckupDelayHoursByTopic
  };
  for (const field of telegramPostVisitCheckupDelayFields) {
    const parsed = Number.parseInt(telegramPostVisitCheckupDelayDrafts[field.key], 10);
    values[field.key] = Number.isFinite(parsed) ? Math.max(1, Math.min(720, parsed)) : defaultTelegramPostVisitCheckupDelayHoursByTopic[field.key];
  }
  return values;
}

function normalizeTelegramPostVisitCheckupDelayDrafts(values: DenteTelegramPostVisitCheckupDelayHoursByTopic): TelegramPostVisitCheckupDelayDrafts {
  const normalized = {
    ...defaultTelegramPostVisitCheckupDelayDrafts
  };
  for (const field of telegramPostVisitCheckupDelayFields) {
    normalized[field.key] = String(values[field.key] ?? defaultTelegramPostVisitCheckupDelayDrafts[field.key]);
  }
  return normalized;
}

function updateTelegramPostVisitCheckupDelayDraft(key: TelegramPostVisitCheckupDelayKey, value: string) {
  setTelegramPostVisitCheckupDelayDrafts(current => ({
    ...current,
    [key]: value
  }));
  markTelegramSettingsDirty();
}

async function loadDashboard(options: {
  adminSecret?: string;
} = {}) {
  const response = await fetch("/api/dashboard", {
    cache: "no-store",
    headers: denteClinicalReadHeaders({}, options.adminSecret)
  });
  if (!response.ok) {
    const message = await responseErrorMessage(response, "Данные клиники не загружены");
    if (response.status === 403 || response.status === 503) {
      setAccessUnlockRequired(true);
      setAccessUnlockMessage(message);
      setDashboard(null);
    }
    throw new Error(message);
  }
  const payload = await response.json();
  setDashboard(dashboardSchema.parse(payload));
  setAccessUnlockRequired(false);
  setAccessUnlockMessage("");
  void loadPersistenceHealth({
    silent: true,
    adminSecret: options.adminSecret
  });
  void refreshSpeechRuntime({
    silent: true
  });
}

function openAppointmentEditor(appointment: Appointment) {
  setEditingAppointmentId(appointment.id);
  setAppointmentScheduleDrafts((current: any) => ({
    ...current,
    [appointment.id]: current[appointment.id] ?? appointmentScheduleDraftFromAppointment(appointment)
  }));
  setAppointmentScheduleSaveStates((current: any) => ({
    ...current,
    [appointment.id]: "idle"
  }));
  setAppointmentScheduleErrors(current => ({
    ...current,
    [appointment.id]: null
  }));
}

function markAppointmentScheduleDirty(appointmentId: string) {
  setAppointmentScheduleDirtyIds(current => {
    const next = new Set(current);
    next.add(appointmentId);
    return next;
  });
  setAppointmentScheduleSaveStates((current: any) => ({
    ...current,
    [appointmentId]: "idle"
  }));
  setAppointmentScheduleErrors(current => ({
    ...current,
    [appointmentId]: null
  }));
}

function updateAppointmentScheduleDraft<K extends keyof AppointmentScheduleDraft>(appointmentId: string, key: K, value: AppointmentScheduleDraft[K]) {
  const sourceAppointment = dashboard?.appointments.find(appointment => appointment.id === appointmentId);
  setAppointmentScheduleDrafts((current: any) => ({
    ...current,
    [appointmentId]: {
      ...(current[appointmentId] ?? (sourceAppointment ? appointmentScheduleDraftFromAppointment(sourceAppointment) : {})),
      [key]: value
    } as AppointmentScheduleDraft
  }));
  markAppointmentScheduleDirty(appointmentId);
}

function resetNewAppointmentDraft() {
  if (!dashboard) return;
  newAppointmentDraftUserEditedRef.current = false;
  setNewAppointmentDraft(newAppointmentDraftFromDashboard(dashboard, newAppointmentPreferenceDefaults()));
  setNewAppointmentSaveState("idle");
  setNewAppointmentError(null);
}

function closeAppointmentEditor(appointmentId: string) {
  setEditingAppointmentId(current => current === appointmentId ? null : current);
  setAppointmentScheduleSaveStates((current: any) => ({
    ...current,
    [appointmentId]: "idle"
  }));
  setAppointmentScheduleErrors(current => ({
    ...current,
    [appointmentId]: null
  }));
}

async function loadSpeechGatewayStatus(options: {
  silent?: boolean;
} = {}): Promise<SpeechGatewayStatus | null> {
  try {
    const response = await fetch("/api/speech/status", {
      cache: "no-store",
      headers: denteClinicalReadHeaders()
    });
    if (!response.ok) throw new Error(await responseErrorMessage(response, "Состояние распознавания недоступно"));
    const status = (await response.json()) as SpeechGatewayStatus;
    setSpeechGatewayStatus(status);
    return status;
  } catch (speechError) {
    if (!options.silent) {
      setError(operatorWorkflowFailureMessage("Шлюз распознавания речи недоступен", speechError));
    }
    return null;
  }
}

async function loadSpeechGatewayHealthReport(options: {
  silent?: boolean;
} = {}) {
  try {
    const response = await fetch("/api/speech/gateway-health", {
      cache: "no-store",
      headers: denteClinicalReadHeaders()
    });
    if (!response.ok) throw new Error(await responseErrorMessage(response, "Проверка распознавания недоступна"));
    setSpeechGatewayHealthReport((await response.json()) as SpeechGatewayHealthReport);
  } catch (speechHealthError) {
    if (!options.silent) {
      setError(operatorWorkflowFailureMessage("Проверка распознавания недоступна", speechHealthError));
    }
  }
}

async function loadSpeechProviderRuntimeStatuses(options: {
  silent?: boolean;
} = {}) {
  try {
    const response = await fetch("/api/speech/providers/runtime", {
      cache: "no-store",
      headers: denteClinicalReadHeaders()
    });
    if (!response.ok) throw new Error(await responseErrorMessage(response, "Провайдеры распознавания недоступны"));
    setSpeechProviderRuntimeStatuses((await response.json()) as SpeechProviderRuntimeStatus[]);
  } catch (speechRuntimeError) {
    if (!options.silent) {
      setError(operatorWorkflowFailureMessage("Провайдер распознавания недоступен", speechRuntimeError));
    }
  }
}

async function refreshSpeechRuntime(options: {
  silent?: boolean;
} = {}) {
  await Promise.all([loadSpeechGatewayStatus(options), loadSpeechGatewayHealthReport(options), loadSpeechProviderRuntimeStatuses(options), loadSpeechRecordingStrategy(options), loadSpeechRecordingRecovery(options)]);
}

async function loadServerVisitDraft(visitId: string): Promise<VisitDraftAutosaveResponse> {
  const response = await fetch(`/api/visits/${visitId}/draft/autosave`, {
    cache: "no-store",
    headers: denteClinicalReadHeaders()
  });
  if (!response.ok) throw new Error(await responseErrorMessage(response, "Серверный черновик не загружен"));
  return (await response.json()) as VisitDraftAutosaveResponse;
}

async function submitSpeechChunk(input: SpeechChunkUploadInput): Promise<SpeechTranscriptionResponse> {
  const response = await fetch("/api/speech/transcribe-chunk", {
    method: "POST",
    headers: denteClinicalMutationHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(input)
  });
  const payload = (await response.json()) as SpeechTranscriptionResponse & {
    error?: unknown;
    message?: unknown;
  };
  if (payload.chunk?.status === "needs_provider_key" && !payload.chunk.transcript.trim()) {
    throw new Error("Серверное распознавание сейчас недоступно; аудио осталось в локальной очереди.");
  }
  if (!response.ok) {
    const rawDetail = typeof payload.message === "string" ? payload.message : typeof payload.error === "string" ? payload.error : null;
    const detail = operatorReadableErrorDetail(rawDetail) ?? responseStatusFailureLabel(response);
    throw new Error(`Распознавание речи не выполнено: ${detail}`);
  }
  return payload;
}

function speechChunkApplyKey(result: SpeechTranscriptionResponse): string {
  return `${result.chunk.recordingId}:${result.chunk.chunkIndex}`;
}

function trackSpeechUpload(upload: Promise<void>) {
  speechUploadPromisesRef.current.add(upload);
  upload.finally(() => speechUploadPromisesRef.current.delete(upload)).catch(() => undefined);
}

async function waitForSpeechUploads() {
  const pendingUploads = Array.from(speechUploadPromisesRef.current);
  if (pendingUploads.length) {
    await Promise.allSettled(pendingUploads);
  }
}

async function finalizeSpeechRecording(recordingId: string) {
  await waitForSpeechUploads();
  await flushPendingSpeechChunks({
    silent: true
  });
  await assembleSpeechRecording(recordingId, {
    silent: true
  });
}

const appointmentReadinessById = useMemo(() => {
  if (!dashboard) return new Map<string, Dashboard["appointmentReadiness"][number]>();
  return new Map(dashboard.appointmentReadiness.map(readiness => [readiness.appointmentId, readiness]));
}, [dashboard]);

const visitCloseChecklist = dashboard?.visitCloseChecklist ?? null;

const visitWarnings = visitCloseChecklist?.items.filter(item => !item.ready) ?? [];

const primaryVisitWarning = visitWarnings.find(item => item.blocking) ?? visitWarnings[0] ?? null;

const speechProviderRuntimeById = useMemo(() => new Map(speechProviderRuntimeStatuses.map(provider => [provider.providerId, provider])), [speechProviderRuntimeStatuses]);

const speechProviderHealthById = useMemo(() => new Map((speechGatewayHealthReport?.providers ?? []).map(provider => [provider.providerId, provider])), [speechGatewayHealthReport]);

const isVisitNoteDirty = visitNoteFieldDefinitions.some(({
  key
}) => visitNoteForm[key] !== savedVisitNoteForm[key]);

const hasVisitNoteFormText = visitNoteFieldDefinitions.some(({
  key
}) => visitNoteForm[key].trim().length > 0);

const hasVisitTranscriptText = transcript.trim().length > 0;

const visitDraftReadyToBuild = visitDraftBuildMissingSteps.length === 0;

const visitNoteAcceptMissingSteps = [!hasVisitNoteFormText ? "заполните хотя бы одно поле ЭМК или соберите черновик из диктовки" : null, !draft && !isVisitNoteDirty ? "внесите правку в ЭМК или подготовьте новый черновик" : null].filter((step): step is string => Boolean(step));

const visitNoteReadyToAccept = visitNoteAcceptMissingSteps.length === 0;

const visitNoteStatusLabel = draft ? "черновик готов" : isVisitNoteDirty ? "есть правки" : "сохранено";

const visitHasSavedNote = hasVisitNoteFormText && !draft && !isVisitNoteDirty;

const speechUploadReady = speechGatewayCanUpload(speechGatewayStatus);

const speechRecognitionReady = speechUploadReady && isOnline;

function appendToTranscript(text: string) {
  visitDraftUserEditedRef.current = true;
  setClearedTranscriptSnapshot(null);
  setTranscript((current: any) => appendSpeechTextWithoutDuplicateTail(current, text, speechGatewayStatus?.chunkingPolicy.dedupeWindowChars ?? 600));
}

function updateVisitNoteField(field: VisitNoteField, value: string) {
  visitDraftUserEditedRef.current = true;
  setVisitNoteForm(current => ({
    ...current,
    [field]: value
  }));
}

function newAppointmentMissingFields(draft: AppointmentScheduleDraft): string[] {
  return appointmentScheduleMissingFields(draft, dashboard?.clinicSettings.profile.mode);
}

async function attachPricelistImage(file: File | undefined) {
  if (!file) return;
  try {
    setIsPricelistAnalyzing(true);
    const prepared = await preparePricelistImage(file);
    setPricelistImageBase64(prepared.base64);
    setPricelistImageMimeType(prepared.mimeType);
    setPricelistImageName(file.name);
    setPricelistImageNote(prepared.note);
    setPricelistSourceKind("photo_ocr");
    setUsePricelistAi(true);
    setPricelistAnalysis(null);
  } catch (imageError) {
    setError(operatorWorkflowFailureMessage("Фото прайса не подготовлено", imageError));
  } finally {
    setIsPricelistAnalyzing(false);
  }
}

function clearPricelistImage() {
  setPricelistImageBase64(null);
  setPricelistImageName(null);
  setPricelistImageNote(null);
  setPricelistAnalysis(null);
}

function clearTranscriptWithUndo() {
  const previousTranscript = transcript;
  if (!previousTranscript.trim()) {
    setSpeechStatusNote("Диктовка уже пустая. Нечего очищать.");
    return;
  }
  visitDraftUserEditedRef.current = true;
  setClearedTranscriptSnapshot(previousTranscript);
  setTranscript("");
  setSpeechStatusNote("Диктовка очищена. Можно сразу вернуть текст кнопкой «Вернуть».");
}

function undoTranscriptClear() {
  if (!clearedTranscriptSnapshot) {
    setSpeechStatusNote("Нет очищенной диктовки для восстановления.");
    return;
  }
  visitDraftUserEditedRef.current = true;
  setTranscript(clearedTranscriptSnapshot);
  setClearedTranscriptSnapshot(null);
  setSpeechStatusNote("Диктовка восстановлена из локального черновика.");
}

function preferredSpeechMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  return candidates.find(mimeType => MediaRecorder.isTypeSupported(mimeType)) ?? "";
}

function stopSpeechMonitor() {
  if (speechMonitorTimerRef.current !== null) {
    window.clearInterval(speechMonitorTimerRef.current);
    speechMonitorTimerRef.current = null;
  }
  speechAudioContextRef.current?.close().catch(() => undefined);
  speechAudioContextRef.current = null;
  speechAnalyserRef.current = null;
}

function requestSpeechChunk(reason: "silence" | "max_time" | "manual") {
  const recorder = mediaRecorderRef.current;
  if (!recorder || recorder.state !== "recording") return;
  try {
    const now = Date.now();
    const durationMs = Math.max(250, Math.min(now - speechSegmentStartedAtRef.current, speechGatewayStatus?.chunkingPolicy.maxChunkMs ?? 25_000));
    speechPendingChunkDurationMsRef.current = durationMs;
    recorder.requestData();
    speechSegmentStartedAtRef.current = now;
    speechLastSoundAtRef.current = now;
    if (reason !== "manual") {
      setSpeechStatusNote(reason === "silence" ? "Фрагмент отправлен после паузы." : "Фрагмент отправлен по лимиту времени.");
    }
  } catch {
    setSpeechStatusNote("Браузер не отдал аудио-фрагмент, запись продолжается.");
  }
}

async function startServerVoiceRecording() {
  if (!dashboard) {
    setError("Данные приема еще не загружены. Повторите запись после загрузки рабочего экрана.");
    return;
  }
  if (isServerVoiceRecording || mediaRecorderRef.current?.state === "recording") {
    setError("Запись уже идет. Нажмите «Стоп запись», чтобы завершить текущий фрагмент.");
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    setError("Запись аудио недоступна в этом браузере. Текст можно печатать вручную, локальный черновик сохранится.");
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true
    });
    const mimeType = preferredSpeechMimeType();
    const recorder = mimeType ? new MediaRecorder(stream, {
      mimeType
    }) : new MediaRecorder(stream);
    mediaStreamRef.current = stream;
    mediaRecorderRef.current = recorder;
    speechRecordingIdRef.current = createLocalQueueId();
    speechChunkIndexRef.current = 0;
    recorder.ondataavailable = event => {
      if (event.data.size > 0 && !speechPendingChunkDurationMsRef.current) {
        const now = Date.now();
        speechPendingChunkDurationMsRef.current = Math.max(250, Math.min(now - speechSegmentStartedAtRef.current, speechGatewayStatus?.chunkingPolicy.maxChunkMs ?? 25_000));
        speechSegmentStartedAtRef.current = now;
        speechLastSoundAtRef.current = now;
      }
      if (event.data.size > 0) {
        trackSpeechUpload(uploadSpeechBlob(event.data));
      }
    };
    recorder.onstop = () => {
      const recordingId = speechRecordingIdRef.current;
      stopSpeechMonitor();
      stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
      mediaStreamRef.current = null;
      setIsServerVoiceRecording(false);
      if (recordingId) {
        void finalizeSpeechRecording(recordingId);
      }
    };
    startSpeechMonitor(stream, recorder, speechGatewayStatus);
    setError(null);
    if (!isOnline || !speechGatewayCanUpload(speechGatewayStatus)) {
      setSpeechStatusNote(isOnline ? "Запись идет в локальную очередь: серверное распознавание пока не готово, аудио не отправляется." : "Запись идет в локальную очередь: офлайн, аудио отправится после подключения.");
    }
    setIsServerVoiceRecording(true);
  } catch (recordingError) {
    setIsServerVoiceRecording(false);
    setError(browserCapabilityFailureMessage("Микрофон недоступен", recordingError));
  }
}

function treatmentAcceptanceTotalRubValue(): number {
  const manual = Number(treatmentAcceptanceEstimatedTotalRub.replace(/[^\d]/g, ""));
  return manual > 0 ? manual : treatmentAcceptancePlannedTotalRub();
}

function treatmentPlanTotalRubValue(): number {
  const manual = Number(treatmentPlanEstimatedTotalRub.replace(/[^\d]/g, ""));
  return manual > 0 ? manual : treatmentAcceptancePlannedTotalRub();
}

function treatmentPlanTeethOrAreaValue(): string {
  return treatmentPlanTeethOrArea.trim() || inferredTreatmentArea || "";
}

function normalizeClinicalToothAlias(value: string): string {
  return value.trim().toLocaleLowerCase("ru-RU").replaceAll("ё", "е").replace(/[.]+/g, "").replace(/\s+/g, " ");
}

function clinicalToothSurfacesValue(value: string): ClinicalToothSurface[] {
  const surfaces = value.split(/[,+;/]+/).map(part => clinicalToothSurfaceAliases[normalizeClinicalToothAlias(part)]).filter((surface): surface is ClinicalToothSurface => Boolean(surface));
  return surfaces.length ? Array.from(new Set(surfaces)) : ["not_applicable"];
}

function clinicalToothStatusValue(value: string): ClinicalToothStatus {
  return clinicalToothStatusAliases[normalizeClinicalToothAlias(value)] ?? "planned";
}

function treatmentEstimateTotalRubValue(): number {
  const manual = Number(treatmentEstimateTotalRub.replace(/[^\d]/g, ""));
  return manual > 0 ? manual : paymentInvoiceTotalRubValue();
}

function paymentInvoiceTotalRubValue(): number {
  return plannedServiceLinesForFinancialPayload().reduce((total, line) => total + line.totalRub, 0) || treatmentAcceptancePlannedTotalRub();
}

function installmentScheduleTotalRubValue(): number {
  const manual = Number(installmentScheduleTotalRub.replace(/[^\d]/g, ""));
  return manual > 0 ? manual : treatmentAcceptancePlannedTotalRub();
}

function warrantyTeethOrAreaValue(): string {
  return warrantyTeethOrArea.trim() || inferredTreatmentArea || "область лечения по визиту";
}

function postVisitToothOrAreaValue(): string {
  return postVisitToothOrArea.trim() || inferredTreatmentArea || "область лечения по записи приема";
}

function changePostVisitCareTopic(topic: PostVisitCareTopic) {
  setPostVisitCareTopic(topic);
  applyPostVisitCarePreset(topic);
}

function markPostVisitManualEdited() {
  setPostVisitManualEdited(true);
  setPostVisitPresetFeedback("");
}

function renderClinicalToothRowsEditor() {
  return <label>
        Клинические строки по зубам и сегментам
        <textarea value={clinicalToothRowsText} onChange={event => setClinicalToothRowsText(event.target.value)} rows={5} />
        <small>
          Формат строки: зуб/сегмент | поверхности | статус | диагноз/находка | показание | действие | прогноз | пародонт | имплант/ортопедия |
          ортодонтия
        </small>
      </label>;
}

async function completeCommunicationTask(taskId: string, outcome: CommunicationTaskOutcome) {
  if (communicationSavingTaskId) {
    setError("Дождитесь завершения текущего закрытия задачи связи.");
    return;
  }
  if (!outcome) {
    setError("Выберите исход задачи связи: нет ответа, перезвонить, перенос, обещал оплату или выдача документов.");
    return;
  }
  setCommunicationSavingTaskId(taskId);
  try {
    const response = await fetch("/api/communications/tasks/complete", {
      method: "POST",
      headers: denteClinicalMutationHeaders({
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({
        taskId,
        outcome,
        note: communicationNote.trim() || "Задача связи закрыта."
      })
    });
    if (!response.ok) {
      setError(await responseErrorMessage(response, "Задача связи не закрыта"));
      return;
    }
    await loadDashboard();
    setError(null);
  } catch (communicationError) {
    setError(operatorWorkflowFailureMessage("Задача связи не закрыта", communicationError));
  } finally {
    setCommunicationSavingTaskId(null);
  }
}

  return {
    toggleTelegramFeature,
    telegramEnabledFeaturesDraft,
    markTelegramSettingsDirty,
    telegramPostVisitCheckupDelayFields,
    telegramPostVisitCheckupDelayDrafts,
    updateTelegramPostVisitCheckupDelayDraft,
    loadPersistenceHealth,
    refreshSpeechRuntime,
    openAppointmentEditor,
    appointmentScheduleDraftFromAppointment,
    updateAppointmentScheduleDraft,
    dashboard,
    resetNewAppointmentDraft,
    closeAppointmentEditor,
    setError,
    error,
    transcript,
    flushPendingSpeechChunks,
    appointmentReadinessById,
    visitCloseChecklist,
    visitWarnings,
    primaryVisitWarning,
    speechProviderRuntimeById,
    speechProviderHealthById,
    speechGatewayHealthReport,
    isVisitNoteDirty,
    visitNoteFieldDefinitions,
    visitNoteForm,
    hasVisitTranscriptText,
    visitDraftReadyToBuild,
    visitDraftBuildMissingSteps,
    visitNoteAcceptMissingSteps,
    draft,
    visitNoteReadyToAccept,
    visitNoteStatusLabel,
    speechGatewayCanUpload,
    speechGatewayStatus,
    speechRecognitionReady,
    isOnline,
    appendToTranscript,
    visitDraftUserEditedRef,
    setClearedTranscriptSnapshot,
    setTranscript,
    updateVisitNoteField,
    attachPricelistImage,
    setPricelistSourceKind,
    setUsePricelistAi,
    setPricelistAnalysis,
    clearPricelistImage,
    clearTranscriptWithUndo,
    undoTranscriptClear,
    clearedTranscriptSnapshot,
    startServerVoiceRecording,
    isServerVoiceRecording,
    treatmentAcceptancePlannedTotalRub,
    inferredTreatmentArea,
    treatmentEstimateTotalRubValue,
    paymentInvoiceTotalRubValue,
    plannedServiceLinesForFinancialPayload,
    installmentScheduleTotalRubValue,
    warrantyTeethOrAreaValue,
    changePostVisitCareTopic,
    applyPostVisitCarePreset,
    markPostVisitManualEdited,
    renderClinicalToothRowsEditor,
    completeCommunicationTask,
    communicationSavingTaskId,
    communicationNote
  };
}

// @ts-nocheck
// @ts-nocheck
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


export function useDocumentLogic() {
const initialDocumentIssueSignatureDraftRef = useRef<DocumentIssueSignatureDraft | null>(null);

const documentIssueSignatureHydratedOrganizationIdRef = useRef<string | null>(null);

if (initialDocumentIssueSignatureDraftRef.current === null) {
  initialDocumentIssueSignatureDraftRef.current = loadDocumentIssueSignatureDraft();
}

const initialDocumentIssueSignatureDraft = initialDocumentIssueSignatureDraftRef.current ?? loadDocumentIssueSignatureDraft();

function buildOnboardingDocumentReadinessIssues(): string[] {
  const issues: string[] = [];
  const requiredDocumentDraftFields: Array<[string, string]> = [["юридическое наименование", clinicProfileDraft.legalName], ["ИНН", clinicProfileDraft.inn], ["адрес", clinicProfileDraft.address], ["номер медицинской лицензии", clinicProfileDraft.medicalLicenseNumber], ["дата медицинской лицензии", clinicProfileDraft.medicalLicenseIssuedAt], ["орган, выдавший лицензию", clinicProfileDraft.medicalLicenseIssuer]];
  for (const [label, value] of requiredDocumentDraftFields) {
    if (!value.trim()) issues.push(label);
  }
  return issues;
}

function buildOnboardingReadinessIssues(): string[] {
  return [...buildOnboardingFirstAppointmentIssues(), ...buildOnboardingDocumentReadinessIssues()];
}

function focusOnboardingIssue(issues: string[]): void {
  if (issues.some(issue => ["врач для первого приема", "врач с правом подписи ЭМК", "кресло / кабинет", "ассистент"].includes(issue))) {
    setOnboardingStep("team");
    return;
  }
  if (issues.some(issue => ["название клиники", "телефон клиники", "часовой пояс"].includes(issue))) {
    setOnboardingStep("clinic");
    return;
  }
  if (issues.some(issue => ["юридическое наименование", "ИНН", "адрес", "номер медицинской лицензии", "дата медицинской лицензии", "орган, выдавший лицензию"].includes(issue))) {
    setOnboardingStep("legal");
    return;
  }
  if (issues.some(issue => issue.includes("Telegram") || issue.includes("бот") || issue.includes("портал") || issue.includes("оценки") || issue.includes("картах"))) {
    setOnboardingStep("telegram");
  }
}

function assertOnboardingReadyForFinish(): boolean {
  const issues = buildOnboardingFirstAppointmentIssues();
  if (!issues.length) return true;
  focusOnboardingIssue(issues);
  setError(`Перед первым рабочим экраном заполните: ${issues.join(", ")}.`);
  return false;
}

function visitDraftSignature(nextTranscript: string, nextSpecialty: DentalSpecialty, nextForm: VisitNoteForm) {
  return JSON.stringify([nextTranscript, nextSpecialty, nextForm]);
}

const patientAdministrativeProfileValidationMessage = useMemo(() => patientAdministrativeProfileDraftIssue(patientAdministrativeProfileDraft), [patientAdministrativeProfileDraft]);

const filteredTelegramOutboxItems = useMemo(() => {
  const items = telegramOutbox?.items ?? [];
  return items.filter(item => {
    if (telegramOutboxStatusFilter === "due") {
      if (item.deliveryStatus !== "ready" || !isTelegramOutboxItemDueForUi(item)) return false;
    } else if (telegramOutboxStatusFilter !== "all" && item.deliveryStatus !== telegramOutboxStatusFilter) {
      return false;
    }
    if (telegramOutboxTemplateFilter !== "all" && item.templateKind !== telegramOutboxTemplateFilter) return false;
    return true;
  });
}, [telegramOutbox, telegramOutboxStatusFilter, telegramOutboxTemplateFilter]);

const documentIssueAttestationReady = useMemo(() => {
  return Boolean(documentIssueConfirmation && documentIssueSignedAt.trim() && documentIssueRecipientFullName.trim() && documentIssueRecipientRole.trim() && documentIssueStaffFullName.trim() && documentIssueStaffRole.trim() && documentIssueIdentityChecked && documentIssueDocumentOpenedAndChecked && documentIssueRecipientSigned && documentIssueClinicSigned);
}, [documentIssueClinicSigned, documentIssueConfirmation, documentIssueDocumentOpenedAndChecked, documentIssueIdentityChecked, documentIssueRecipientFullName, documentIssueRecipientRole, documentIssueRecipientSigned, documentIssueSignedAt, documentIssueStaffFullName, documentIssueStaffRole]);

const documentVoidReady = useMemo(() => {
  return Boolean(documentVoidConfirmation && documentVoidReasonText.trim().length >= 12 && documentVoidStaffFullName.trim() && documentVoidStaffRole.trim() && documentVoidArchivePreserved && documentVoidStatusReviewed);
}, [documentVoidArchivePreserved, documentVoidConfirmation, documentVoidReasonText, documentVoidStaffFullName, documentVoidStaffRole, documentVoidStatusReviewed]);

const patientClinicalRuleEvaluations = useMemo(() => {
  if (!dashboard || !documentPatient) return [];
  const severityRank = {
    blocker: 0,
    warning: 1,
    info: 2
  } as const;
  return dashboard.clinicalRuleEvaluations.filter(evaluation => evaluation.patientId === documentPatient.id).sort((left, right) => Number(left.resolved) - Number(right.resolved) || severityRank[left.severity] - severityRank[right.severity]);
}, [dashboard, documentPatient?.id]);

const documentLocalPersistenceOrganizationId = dashboard?.clinicSettings.profile.organizationId ?? null;

const eligibleTaxPaymentIdsKey = eligibleTaxPayments.map(payment => payment.id).join("|");

const eligiblePaymentReceiptIdsKey = eligiblePaymentReceiptPayments.map(payment => payment.id).join("|");

const outpatient025uDraftPersistenceKey = useMemo(() => documentPayloadDraftKey("outpatient_medical_card_025u", documentLocalPersistenceOrganizationId, documentPatient?.id ?? null, outpatient025uDraftVisitId), [documentLocalPersistenceOrganizationId, documentPatient?.id, outpatient025uDraftVisitId]);

const specialtiesWithTemplates = useMemo(() => {
  if (!dashboard) return [];
  return Array.from(new Set(dashboard.protocolTemplates.map(template => template.specialty)));
}, [dashboard]);

const taxDocuments = dashboard?.documents.filter(document => documentKindMetadata[document.kind].group === "tax") ?? [];

const speechRecoveryIssueCount = speechRecordingRecovery?.recordings.filter(recording => recording.recoveryState !== "complete").length ?? 0;

const speechRecoveryQualityIssueCount = speechRecordingRecovery?.recordings.reduce((total, recording) => total + recording.qualityCounts.review + recording.qualityCounts.empty + recording.qualityCounts.failed, 0) ?? 0;

const currentSpeechQualityIssue = speechLastQuality && speechLastQuality.level !== "clear" ? speechLastQuality : null;

const speechSafetyState = pendingSpeechChunkCount || currentSpeechQualityIssue || !isOnline || !speechUploadReady ? "warn" : "ready";

const visitSafetyCards: Array<{
  key: string;
  label: string;
  value: string;
  detail: string;
  state: "ready" | "warn" | "busy";
}> = [{
  key: "local",
  label: "Локально",
  value: lastLocalSavedAt ? formatTime(lastLocalSavedAt) : localAutosaveReady ? "включено" : "загрузка",
  detail: localDraftWasRestored ? "черновик восстановлен на этом устройстве" : "автосохранение на этом устройстве",
  state: lastLocalSavedAt || localAutosaveReady ? "ready" : "busy"
}, {
  key: "server",
  label: "Сервер",
  value: serverDraftSyncState === "saving" ? "сохраняет" : serverDraftSyncState === "saved" && lastServerDraftSavedAt ? formatTime(lastServerDraftSavedAt) : serverDraftSyncState === "queued" || serverDraftSyncState === "error" ? "повторит" : "готов",
  detail: pendingVisitSaveCount ? `${pendingVisitSaveCount} сохранение ожидает синхронизацию` : "серверный черновик включен",
  state: serverDraftSyncState === "saving" ? "busy" : pendingVisitSaveCount || serverDraftSyncState === "queued" || serverDraftSyncState === "error" ? "warn" : "ready"
}, {
  key: "browser",
  label: "Устройство",
  value: browserContinuityValue,
  detail: browserContinuityDetail,
  state: browserContinuityState
}, {
  key: "stt",
  label: "Голос",
  value: speechSafetyValue,
  detail: speechSafetyDetail,
  state: speechSafetyState
}, {
  key: "recovery",
  label: "Восстановление",
  value: speechRecoveryIssueCount ? "проверить" : speechRecordingRecovery ? "чисто" : "скоро",
  detail: speechRecoveryQualityIssueCount ? `${speechRecoveryQualityIssueCount} фрагм. распознавания на проверку` : speechRecoveryIssueCount ? `${speechRecoveryIssueCount} запись требует внимания` : "потерь диктовки не видно",
  state: speechRecoveryIssueCount ? "warn" : speechRecordingRecovery ? "ready" : "busy"
}];

function requiredDocumentField(value: string, label: string): string | null {
  return value.trim() ? null : `Заполните поле: ${label}.`;
}

function confirmedDocumentLiteral(value: boolean, label: string): true {
  if (!value) {
    throw new Error(`Не подтверждено обязательное условие документа: ${label}.`);
  }
  return true;
}

function documentTextLines(value: string): string[] {
  return value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
}

function treatmentAcceptanceStageRows() {
  return documentTextLines(treatmentAcceptanceStages).map((line, index) => {
    const [stageName, plannedServices, plannedTiming, amount] = line.split("|").map(part => part.trim());
    const parsedAmount = amount ? Number(amount.replace(/[^\d]/g, "")) : Number.NaN;
    return {
      stageName: stageName || `Этап ${index + 1}`,
      plannedServices: plannedServices || "объем лечения по выбранному плану",
      plannedTiming: plannedTiming || "по расписанию клиники",
      estimatedAmountRub: Number.isFinite(parsedAmount) ? parsedAmount : null
    };
  });
}

function treatmentPlanStageRows() {
  return documentTextLines(treatmentPlanStages).map((line, index) => {
    const [stageName, plannedServices, plannedTiming, clinicalNotes, amount] = line.split("|").map(part => part.trim());
    const parsedAmount = amount ? Number(amount.replace(/[^\d]/g, "")) : Number.NaN;
    return {
      stageName: stageName || `Этап ${index + 1}`,
      plannedServices: plannedServices || "объем лечения по клиническому плану",
      plannedTiming: plannedTiming || "по расписанию клиники",
      clinicalNotes: clinicalNotes || null,
      estimatedAmountRub: Number.isFinite(parsedAmount) ? parsedAmount : null
    };
  });
}

function treatmentEstimatePatientOrPayerFullNameValue(): string {
  return treatmentEstimatePatientOrPayerFullName.trim() || documentPatient?.fullName || "";
}

function paymentInvoicePayerFullNameValue(): string {
  return paymentInvoicePayerFullName.trim() || documentPatient?.fullName || "";
}

function paymentReceiptPayerFullNameValue(): string {
  return paymentReceiptPayerFullName.trim() || firstPaymentReceiptPayment()?.payerFullName?.trim() || "";
}

function paymentReceiptPayerBirthDateValue(): string {
  return paymentReceiptPayerBirthDate.trim() || firstPaymentReceiptPayment()?.payerBirthDate?.trim() || "";
}

function paymentReceiptPayerInnValue(): string {
  return paymentReceiptPayerInn.trim() || firstPaymentReceiptPayment()?.payerInn?.trim() || "";
}

function paymentReceiptPayerIdentityDocumentValue(): string {
  return paymentReceiptPayerIdentityDocument.trim() || firstPaymentReceiptPayment()?.payerIdentityDocument?.trim() || "";
}

function paymentReceiptPayerRelationshipValue(): string {
  return paymentReceiptPayerRelationship.trim() || firstPaymentReceiptPayment()?.payerRelationship?.trim() || "пациент";
}

function installmentScheduleInstallmentRows() {
  const rows = documentTextLines(installmentScheduleRows).map((line, index) => {
    const [label, dueDate, amount, status] = line.split("|").map(part => part.trim());
    const parsedAmount = amount ? Number(amount.replace(/[^\d]/g, "")) : Number.NaN;
    const parsedStatus = installmentPaymentStatusAliases[status?.toLocaleLowerCase("ru-RU").replaceAll("ё", "е") ?? ""] ?? "planned";
    return {
      label: label || `Платеж ${index + 1}`,
      dueDate: dueDate || dateInputValuePlusDays(index === 0 ? 7 : 21),
      amountRub: Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0,
      status: parsedStatus
    };
  });
  if (rows.some(row => row.amountRub > 0)) return rows.filter(row => row.amountRub > 0);
  const remaining = installmentScheduleRemainingRubValue();
  if (remaining <= 0) return [];
  const firstPart = Math.ceil(remaining / 2);
  const secondPart = remaining - firstPart;
  return [{
    label: "Первый платеж",
    dueDate: dateInputValuePlusDays(7),
    amountRub: firstPart,
    status: "planned" as const
  }, ...(secondPart > 0 ? [{
    label: "Финальный платеж",
    dueDate: dateInputValuePlusDays(21),
    amountRub: secondPart,
    status: "planned" as const
  }] : [])];
}

function installmentSchedulePayerFullNameValue(): string {
  return installmentSchedulePayerFullName.trim() || documentPatient?.fullName || "";
}

function minorRepresentativeFullNameValue(): string {
  return minorRepresentativeFullName.trim() || documentPatient?.administrativeProfile?.legalRepresentativeFullName?.trim() || "";
}

function minorRepresentativeRelationshipValue(): string {
  return minorRepresentativeRelationship.trim() || documentPatient?.administrativeProfile?.legalRepresentativeRelationship?.trim() || "";
}

function minorRepresentativeIdentityDocumentValue(): string {
  return minorRepresentativeIdentityDocument.trim() || documentPatient?.administrativeProfile?.legalRepresentativeIdentityDocument?.trim() || "";
}

function minorRepresentativePhoneValue(): string {
  return minorRepresentativePhone.trim() || documentPatient?.administrativeProfile?.legalRepresentativePhone?.trim() || "";
}

function minorConsentPatientFullNameValue(): string {
  return minorConsentPatientFullName.trim() || documentPatient?.fullName || "";
}

function minorConsentPatientBirthDateValue(): string {
  return minorConsentPatientBirthDate.trim() || documentPatient?.birthDate || "";
}

function outpatient025uMedicalCardNumberValue(): string {
  const explicitNumber = outpatient025uMedicalCardNumber.trim();
  if (explicitNumber) return explicitNumber;
  const patientToken = documentPatient?.id.slice(0, 8).toUpperCase() ?? "PATIENT";
  return `DENTE-${new Date().getFullYear()}-${patientToken}`;
}

function togglePhotoVideoMaterial(material: PhotoVideoConsentMaterial) {
  setPhotoVideoMaterials(current => current.includes(material) ? current.filter(item => item !== material) : [...current, material]);
}

async function confirmDocumentIssue() {
  const documentId = documentIssueConfirmation?.id;
  if (!documentId) {
    setError("Выберите черновик документа для выдачи.");
    return;
  }
  if (!documentIssueAttestationReady) {
    setError("Перед выдачей отметьте проверку личности, просмотр документа и подписи пациента/клиники.");
    return;
  }
  const payload = {
    signatureAttestation: {
      mode: documentIssueSignatureMode,
      signedAt: documentIssueSignedAt.trim().replace("T", " "),
      recipientFullName: documentIssueRecipientFullName.trim(),
      recipientRole: documentIssueRecipientRole.trim(),
      staffFullName: documentIssueStaffFullName.trim(),
      staffRole: documentIssueStaffRole.trim(),
      identityChecked: true,
      documentOpenedAndChecked: true,
      recipientSigned: true,
      clinicRepresentativeSigned: true,
      note: documentIssueNote.trim() || null
    }
  } satisfies IssueDocumentInput;
  saveDocumentIssueSignatureDraft(dashboard?.clinicSettings.profile.organizationId ?? null, documentIssueSignatureMode, documentIssueStaffFullName, documentIssueStaffRole);
  const updated = await updateDocumentStatus(documentId, "issue", payload);
  if (updated) {
    setDocumentIssueConfirmationId(null);
  }
}

function issuedDocumentHtmlPreviewUrl(documentId: string): string {
  return `/api/documents/${encodeURIComponent(documentId)}/html`;
}

function issuedDocumentHtmlDownloadUrl(documentId: string): string {
  return `${issuedDocumentHtmlPreviewUrl(documentId)}?download=1`;
}

async function openIssuedDocumentHtml(documentId: string) {
  try {
    const previewUrl = issuedDocumentHtmlPreviewUrl(documentId);
    if (clinicalAdminSecretSession.trim()) {
      setError("HTML-предпросмотр в новом окне не может передать секрет администратора клиники. CRM запускает защищенное скачивание архивного HTML.");
      await downloadIssuedDocumentHtml(documentId, {
        preserveError: true
      });
      return;
    }
    const opened = window.open(previewUrl, "_blank", "noopener,noreferrer");
    if (opened) {
      setError(null);
      return;
    }
    setError("Браузер заблокировал новое окно документа. CRM запускает скачивание архивного HTML; если мобильный браузер его отклонит, нажмите \"Скачать HTML\" в строке документа.");
    await downloadIssuedDocumentHtml(documentId, {
      preserveError: true
    });
  } catch (error) {
    setError(requestFailureMessage("HTML документа не открыт", error));
  }
}

function documentKindsForCommunicationTask(task: Dashboard["communicationTasks"][number]): readonly GeneratedDocument["kind"][] {
  const workflowCareTopic = task.workflowCode ? telegramCareRequestWorkflowCareTopics[task.workflowCode] : null;
  if (workflowCareTopic) return ["post_visit_recommendations"];
  const workflowDocumentKinds = task.workflowCode ? telegramDocumentRequestWorkflowDocumentKinds[task.workflowCode] : null;
  if (workflowDocumentKinds) return workflowDocumentKinds;
  if (telegramCareRequestTaskCareTopics[task.title]) return ["post_visit_recommendations"];
  return telegramDocumentRequestTaskDocumentKinds[task.title] ?? [];
}

function telegramOutboxRequestParams(cursor?: string | null): URLSearchParams {
  const params = new URLSearchParams();
  params.set("limit", "80");
  if (cursor) params.set("cursor", cursor);
  if (telegramOutboxStatusFilter !== "all") params.set("status", telegramOutboxStatusFilter);
  if (telegramOutboxTemplateFilter !== "all") params.set("templateKind", telegramOutboxTemplateFilter);
  appendTelegramRuntimeScopeParams(params);
  return params;
}

const onboardingFirstAppointmentIssues = buildOnboardingFirstAppointmentIssues();

const onboardingDocumentReadinessIssues = buildOnboardingDocumentReadinessIssues();

const onboardingBlockingIssues = onboardingFirstAppointmentIssues;

const onboardingReadyToFinish = onboardingFirstAppointmentIssues.length === 0;

const onboardingDocumentsReady = onboardingDocumentReadinessIssues.length === 0;

  return {
    clinicProfileDraft,
    setError,
    DentalSpecialty,
    patientAdministrativeProfileValidationMessage,
    filteredTelegramOutboxItems,
    telegramOutbox,
    telegramOutboxStatusFilter,
    isTelegramOutboxItemDueForUi,
    telegramOutboxTemplateFilter,
    documentIssueAttestationReady,
    documentIssueConfirmation,
    documentVoidReady,
    documentVoidConfirmation,
    patientClinicalRuleEvaluations,
    dashboard,
    documentPatient,
    eligibleTaxPayments,
    eligiblePaymentReceiptPayments,
    specialtiesWithTemplates,
    speechRecordingRecovery,
    pendingSpeechChunkCount,
    isOnline,
    visitSafetyCards,
    lastLocalSavedAt,
    formatTime,
    localDraftWasRestored,
    serverDraftSyncState,
    lastServerDraftSavedAt,
    pendingVisitSaveCount,
    browserContinuityValue,
    browserContinuityState,
    treatmentEstimatePatientOrPayerFullNameValue,
    paymentReceiptPayerFullNameValue,
    paymentReceiptPayerBirthDateValue,
    paymentReceiptPayerInnValue,
    paymentReceiptPayerIdentityDocumentValue,
    paymentReceiptPayerRelationshipValue,
    installmentScheduleInstallmentRows,
    installmentScheduleRemainingRubValue,
    minorRepresentativeFullNameValue,
    minorRepresentativeRelationshipValue,
    minorRepresentativeIdentityDocumentValue,
    minorRepresentativePhoneValue,
    minorConsentPatientFullNameValue,
    minorConsentPatientBirthDateValue,
    outpatient025uMedicalCardNumberValue,
    togglePhotoVideoMaterial,
    confirmDocumentIssue,
    openIssuedDocumentHtml,
    downloadIssuedDocumentHtml,
    error,
    documentKindsForCommunicationTask,
    onboardingDocumentReadinessIssues,
    onboardingBlockingIssues,
    onboardingReadyToFinish,
    onboardingDocumentsReady
  };
}

import { useDocumentStore } from "./store/documentStore";
import { useAppStore } from "./store/appStore";
import { useImagingStore } from "./store/imagingStore";
import { useVisitStore } from "./store/visitStore";
import { usePatientStore } from "./store/patientStore";
import { useScheduleStore } from "./store/scheduleStore";
import { useSettingsStore } from "./store/settingsStore";
import {
  type CSSProperties,
  type KeyboardEvent,
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  ArrowRight,
  AlertTriangle,
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
  ZoomOut
} from "lucide-react";
import {
  buildRuleBasedVisitDraftFromTranscript,
  dashboardSchema,
  documentAmountSource,
  documentFactoryGroups,
  documentKindMetadata,
  documentSourceStatusLabels,
  normalizeDentalSpeechTranscript,
  type AcceptVisitDraftResponse,
  type AiJobKind,
  type AiRecognitionJob,
  type AiRecognitionJobResponse,
  type AiRecognitionTarget,
  type Appointment,
  type ClinicProfile,
  type ClinicMode,
  type ClinicalToothRow,
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
  type DocumentChainSummary,
  type DocumentAuditFacts,
  type DocumentIssueSignatureMode,
  type DocumentVoidReasonCode,
  type DocumentSourceStatus,
  type DocumentPayload,
  type DocumentIngestionResponse,
  type DocumentIngestionTarget,
  type ClinicPublicLookupResponse,
  type CommunicationTaskOutcome,
  type GeneratedDocument,
  type DicomRenderCachePlanResponse,
  type DicomFirstFramePreviewResponse,
  type DicomLocalFolderDiscoveryResponse,
  type DicomSeriesPreviewGroup,
  type DicomSeriesPreviewResponse,
  type DicomFolderSeriesPreviewResponse,
  type DicomFolderWorkupPath,
  type DicomFolderWorkupPlanResponse,
  type DicomViewerLaunchManifestResponse,
  type DicomViewerToolStateBundleResponse,
  type DicomViewerWorkbenchManifestResponse,
  type DicomWebConnectorCheckResponse,
  type DicomWorkbenchBundle,
  type DicomWorkbenchBundleListResponse,
  type DicomWorkbenchBundleResponse,
  type DicomWorkstationClientFacts,
  type DicomWorkstationReadinessResponse,
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
  type IntegrationCapability,
  type IntegrationCategory,
  type IntegrationPresetStatus,
  type ImportCommitResponse,
  type IssueDocumentInput,
  type VoidDocumentInput,
  type ImportIntakeResponse,
  type ImportPreviewResponse,
  type ImportSourceKind,
  type InstallmentPaymentStatus,
  type LocalImagingOrganizerResponse,
  type MigrationAutopilotResponse,
  type MigrationLocalSourceDiscoveryResponse,
  type MigrationLocalSourceProbeResponse,
  type MigrationLocalSourceWorkupResponse,
  type LocalBridgeReadinessResponse,
  type LocalBridgeStatus,
  type LocalBridgeUsePath,
  type LocalBridgeUsePlansResponse,
  type OutpatientMedicalCard025uPayload,
  type PaymentMethod,
  type Patient,
  type PatientAdministrativeProfile,
  type PatientIntakePregnancyStatus,
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
  type SpeechProviderConnector,
  type SpeechProviderRuntimeStatus,
  type SpeechRecordingAssembly,
  type SpeechRecordingRecoveryList,
  type SpeechRecordingStrategy,
  type SpeechTranscriptPolishResponse,
  type SpeechTranscriptionResponse,
  type SpeechProvider,
  type StaffRole,
  type StaffWorkingHours,
  type TaxDeductionApplicationDeliveryChannel,
  type TaxDeductionApplicationForm,
  type TaxDeductionApplicationRelationship,
  type TreatmentPlanAcceptanceVariant,
  type UpdateAppointmentInput,
  type UpdateClinicProfileInput,
  type UpdatePatientInput,
  type UpdatePatientAdministrativeProfileInput,
  type UiLanguage,
  type VisitDraftAutosaveResponse,
  type VisitNoteDraft,
  type XrayCbctReferralPregnancyStatus,
  type XrayCbctReferralPriority,
  type XrayCbctReferralStudyType
} from "@dental/shared";
import { AppLoadingState, AppUnlockState } from "./AppBootState";
import {
  browserContinuityRegistrationLabels,
  formatByteSize,
  formatMegabytes,
  inspectBrowserContinuity,
  type BrowserContinuityStatus
} from "./browserContinuity";
import { ClinicalRulePanel } from "./ClinicalRulePanel";
import {
  communicationDocumentTaskActionLabels,
  telegramCareRequestTaskCareTopics,
  telegramCareRequestWorkflowCareTopics,
  telegramDocumentRequestTaskDocumentKinds,
  telegramDocumentRequestWorkflowDocumentKinds
} from "./communicationTaskData";
import { imagingConnectorCards, imagingViewerCapabilities, recognitionPresets } from "./settingsStaticData";
import { motionSafeScrollIntoView } from "./motionPreference";
import { normalizeRubAmountInput, rubAmountInputMissingStep } from "./rubAmountInput";
import {
  imagingCaptureDistanceMs,
  imagingComparisonReason,
  imagingComparisonScore,
  type ImagingStudyRow
} from "./imagingComparison";
import {
  dicomLabel,
  dicomDiagnosticPixelPolicyLabels,
  dicomExecutionLaneLabels,
  dicomGpuClassLabels,
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
  mprAxisPresetDeg,
  mprCacheModeLabels,
  mprClinicalPresets,
  mprLoadStrategyLabels,
  mprProjectionLabels,
  mprProjectionOrientationLabels,
  mprResourceTierLabels,
  mprSlabPresetMm,
  mprToolLabels,
  mprSeriesRequiredProjectionLabel,
  mprUnavailableProjectionLabel,
  mprWindowPresetLabels,
  policyAuditEventLabels,
  pricelistParserModeLabels,
  type MprClinicalPreset,
  type MprProjection,
  type MprWindowPreset
} from "./imagingUiLabels";
import { type CtPlanningArtifactCommand } from "./ctPlanningArtifactCommands";
import {
  CtPlanningToolsPanel,
  findCtPlanningQuickActionForArtifactCommand,
  type CtImplantLibraryItem,
  type CtPlanningQuickAction
} from "./ctPlanningTools";
import {
  clampMprAxisDeg,
  clampMprSliceIndex,
  clampMprSlabMm,
  formatSignedMprStep,
  formatMprAxisAngleBadge,
  formatMprAxisDirectionLabel,
  formatMprAxisRangeValue,
  formatMprAxisVisualizerLabel,
  formatMprSliceBadge,
  formatMprSliceRangeValue,
  formatMprSlabBadge,
  formatMprSlabRangeValue,
  buildMprAxisGuidance,
  mprAxisBounds,
  mprAxisNudgeDeg,
  mprProjectionCompassLabels,
  mprSliceFraction,
  mprSliceIndexFromFraction,
  mprSliceNudgeSteps,
  mprSlicePresetFractions,
  mprSlabBounds,
  mprSlabNudgeMm,
  resolveMprKeyboardAdjustment
} from "./mprControlMath";
import {
  buildMprClinicalChecklist,
  buildMprOperatorSummary,
  buildMprWorkbenchSummary,
  describeMprClinicalPresetProjectionFallback,
  findNearestMprClinicalPreset,
  mprClinicalNextAction,
  resolveMprClinicalPresetProjection
} from "./mprClinicalStatus";
import { postVisitCarePresets } from "./postVisitCareData";
import {
  dentalMaterialKindLabels,
  dentalRestorationTypeLabels,
  pricelistItemMaterialText,
  pricelistMaterialSummaryText,
  pricelistRecognitionBrandGroups,
  pricelistRecognitionServiceGroups,
  pricelistSourceKindLabels,
  pricelistWarningsText
} from "./pricelistUiMeta";
import { specialtyQuickPhraseLibrary } from "./visitDictationData";
import { inferDashboardVisitSpecialty, inferSpecialtyFromText, visitSpecialtyFocusOptions } from "./visitSpecialtyData";
import { ActionIcon, appViews, type AppView, getFilteredAppViews, viewLabels, WorkspaceSidebar, WorkspaceTopbar } from "./workspaceShell";
import { preloadWorkspaceView, scheduleIdleWorkspacePreload } from "./workspacePreload";
import { WorkspaceContinuityStrip } from "./workspaceContinuityStrip";
import { WorkspaceRouteErrorBoundary } from "./workspaceRouteErrorBoundary";
import {
  defaultTelegramPostVisitCheckupDelayDrafts,
  defaultTelegramPostVisitCheckupDelayHoursByTopic,
  postVisitCareTopicOptions,
  telegramFeatureHelp,
  telegramFeatureLabels,
  telegramFeatureOptions,
  telegramPostVisitCheckupDelayFields,
  telegramVisualCardFields,
  type TelegramPostVisitCheckupDelayDrafts,
  type TelegramPostVisitCheckupDelayKey
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
  workloadStateLabels
} from "./workspaceUiLabels";
import {
  ImagingViewerState,
  ImagingViewerPlan,
  CbctWorkbenchPlane,
  MprAxisVisualizerStyle,
  viewerWindowPresetForStudy,
  defaultImagingViewerState,
  defaultDicomFirstFrameViewerState,
  ImagingViewerLocalDraft,
  ImagingViewerSaveState,
  DicomWorkbenchLocalDraft,
  DicomWorkbenchIndexedDbDraft,
  MprWorkbenchState,
  MprWorkbenchLocalDraft,
  MprWorkbenchIndexedDbDraft,
  LocalImagingFolderDraft,
  DicomFirstFramePreviewMetadata,
  DicomFirstFramePreviewRequestContext,
  DicomFirstFramePreviewOptions,
  BrowserFileSystemFileHandle,
  BrowserFileSystemDirectoryHandle,
  BrowserFileSystemHandle,
  BrowserDirectoryPickerWindow,
  DentalDesktopRuntimeWindow,
  BrowserPickedImagingFolderPreview,
  BrowserPickedImagingScanStats,
  BrowserImagingScanPhase,
  BrowserImagingScanProgress,
  BrowserImagingScanOptions,
  LocalDicomOperationOptions,
  BrowserImagingScanRuntime,
  BrowserMigrationSourceKind,
  BrowserMigrationFileKind,
  BrowserMigrationFolderStats,
  BrowserMigrationScanStats,
  BrowserMigrationScanPhase,
  BrowserMigrationScanProgress,
  BrowserMigrationScanOptions,
  BrowserMigrationScanRuntime,
  imagingViewerLocalStoragePrefix,
  dicomWorkbenchLocalStorageKey,
  mprWorkbenchLocalStoragePrefix,
  localImagingFolderStorageKey,
  browserPickedImagingFolderStorageKey,
  browserMigrationScanFileLimit,
  browserMigrationScanFolderLimit,
  browserMigrationScanDirectoryEntryLimit,
  browserMigrationScanMagicReadLimit,
  browserMigrationScanYieldEveryUnits,
  browserMigrationScanYieldEveryMs,
  browserMigrationScanProgressEveryUnits,
  browserMigrationScanProgressEveryMs,
  browserImagingScanFileLimit,
  browserImagingScanFolderLimit,
  browserImagingScanDirectoryEntryLimit,
  browserImagingScanMagicReadLimit,
  browserImagingScanYieldEveryUnits,
  browserImagingScanYieldEveryMs,
  browserImagingScanProgressEveryUnits,
  browserImagingScanProgressEveryMs,
  uiPreferencesStorageKey,
  documentPaymentSelectionStorageKey,
  documentPayloadDraftStorageKey,
  documentIssueSignatureStorageKey,
  uiPreferencesServerPath,
  onboardingStorageKey,
  clinicProfileEndpoint,
  denteAdminSecretHeaderName,
  localConvenienceRetentionMs,
  sensitiveLocalDraftRetentionMs,
  speechAudioQueueRetentionMs,
  DocumentPaymentSelectionEntry,
  DocumentPaymentSelectionStore,
  Outpatient025uDocumentDraftFields,
  MedicalRecordExtractDocumentDraftFields,
  DocumentPayloadDraftEntry,
  DocumentPayloadDraftStore,
  DocumentIssueSignatureDraft,
  documentIssueSignatureModeLabels,
  documentVoidReasonLabels,
  browserGeneratedId,
  currentLocalDateTimeInputValue,
  normalizedDocumentIssueSignatureMode,
  organizationScopedLocalStorageKey,
  normalizedLocalOrganizationId,
  localSavedAtFresh,
  documentIssueSignatureLocalKey,
  documentPaymentSelectionLocalKey,
  documentPayloadDraftLocalKey,
  onboardingLocalKey,
  loadDocumentIssueSignatureDraft,
  saveDocumentIssueSignatureDraft,
  emptyDocumentPaymentSelectionStore,
  normalizedDocumentPaymentSelectionIds,
  loadDocumentPaymentSelectionStore,
  loadDocumentPaymentSelection,
  saveDocumentPaymentSelection,
  todayDateInputValue,
  dateInputValuePlusDays,
  emptyOutpatient025uDocumentDraftFields,
  documentPayloadDraftKey,
  emptyDocumentPayloadDraftStore,
  normalizedOutpatient025uCode,
  localDraftString,
  normalizeOutpatient025uDocumentDraftFields,
  emptyMedicalRecordExtractDocumentDraftFields,
  normalizeMedicalRecordExtractDocumentDraftFields,
  loadDocumentPayloadDraftStore,
  loadOutpatient025uDocumentDraft,
  saveOutpatient025uDocumentDraft,
  loadMedicalRecordExtractDocumentDraft,
  saveMedicalRecordExtractDocumentDraft,
  imagingViewerLocalKey,
  loadLocalImagingViewerDraft,
  dicomWorkbenchSeriesKey,
  offlineDraftOrganizationKey,
  dicomWorkbenchIndexedDbKey,
  mprWorkbenchIndexedDbKey,
  normalizeLocalDicomWorkbenchDraft,
  newerDicomWorkbenchDraft,
  loadLocalDicomWorkbenchDraftFromLocalStorage,
  mprWorkbenchSeriesKey,
  mprWorkbenchLocalKey,
  isMprProjection,
  isMprWindowPreset,
  resolveMprWorkbenchProjection,
  normalizeMprWorkbenchState,
  loadLocalMprWorkbenchDraftFromLocalStorage,
  saveLocalMprWorkbenchDraftToLocalStorage,
  localImagingFolderFingerprint,
  dicomDownloadRedactionWarning,
  uniqueDicomDownloadWarnings,
  isLocalDicomDownloadPath,
  redactedLocalDicomDownloadPath,
  redactedDicomDownloadReferenceId,
  redactDicomDownloadText,
  redactedDicomDownloadWarnings,
  redactedDicomViewerToolStateBundleForDownload,
  redactedDicomWorkbenchManifestForDownload,
  classifyBrowserImagingFileName,
  browserMigrationSourceTitles,
  browserLegacyMisTextPattern,
  classifyBrowserMigrationFileName,
  browserMigrationFolderHintScore,
  browserMigrationSourceKindFromStats,
  buildBrowserMigrationDiscovery,
  browserFileHasDicomMagic,
  browserImagingScanNowMs,
  createBrowserImagingScanRuntime,
  browserImagingScanElapsedFromIso,
  throwIfBrowserImagingScanAborted,
  isBrowserImagingScanAbortError,
  browserImagingScanYield,
  browserImagingScanProgressFromStats,
  publishBrowserImagingScanProgress,
  maybeYieldBrowserImagingScan,
  createBrowserMigrationScanRuntime,
  throwIfBrowserMigrationScanAborted,
  isBrowserMigrationScanAbortError,
  browserMigrationScanProgressFromStats,
  publishBrowserMigrationScanProgress,
  maybeYieldBrowserMigrationScan,
  addBrowserMigrationKindToScanStats,
  browserPickedFolderFingerprint,
  saveBrowserPickedImagingFolderPreview,
  loadBrowserPickedImagingFolderPreview,
  removeBrowserPickedImagingFolderPreview,
  buildBrowserPickedImagingFolderPreview,
  loadLocalImagingFolderDraft,
  saveLocalImagingFolderDraft,
  removeLocalImagingFolderDraft,
  saveLocalDicomWorkbenchDraftToLocalStorage,
  createLocalDicomWorkbenchDraft,
  dicomWorkbenchManifestHasRedactedSource,
  removeLocalDicomWorkbenchDraftFromLocalStorage,
  hasDentalDesktopShellBridge,
  detectDicomRuntimeSurfaceHint,
  collectDicomWorkstationClientFacts,
  saveLocalImagingViewerDraft,
  ctImplantPlanFromLibraryItem,
  imagingViewerPlans,
  imagingSourceChoices,
  smartImportModeLabels,
  importSourceLabels,
  ingestionTargetLabels,
  documentIngestionQualityLabels,
  telegramBlockedReasonLabels,
  telegramWarningLabels,
  telegramHumanMessage,
  isTelegramOutboxItemDueForUi,
  documentDetectedKindLabels,
  documentDetectedKindLabel,
  dicomFirstFrameStatusLabels,
  toothRows,
  formatTime,
  patientName,
  findPatient,
  money,
  minutesLabel,
  formatDateTime,
  formatShortDate,
  BrowserSpeechRecognition,
  BrowserWindowWithSpeech,
  VisitNoteField,
  VisitNoteForm,
  visitNoteFieldDefinitions,
  visitDraftQualityLabels,
  visitDraftSignalLabels,
  visitDraftMissingFieldLabels,
  visitDraftSignalLabel,
  visitDraftMissingFieldLabel,
  speechQualityLabels,
  emptyVisitNoteForm,
  visitNoteFormFromVisit,
  visitNoteFormFromDraft,
  visitNoteDraftFromForm,
  VisitLocalDraft,
  PendingVisitSave,
  PendingSpeechChunk,
  PersistenceHealth,
  PersistenceBackupCheck,
  PersistenceIntegrityReport,
  visitLocalDraftKey,
  pendingVisitSaveQueueKey,
  pendingSpeechChunkQueueKey,
  speechChunkDbName,
  speechChunkDbVersion,
  pendingVisitSaveStoreName,
  dicomWorkbenchDraftStoreName,
  mprWorkbenchDraftStoreName,
  speechChunkStoreName,
  speechLocalStorageFallbackMaxBytes,
  requiredSpeechChunkDbStoreNames,
  speechChunkDbPromise,
  pendingVisitSaveQueueLocalKey,
  pendingSpeechChunkQueueLocalKey,
  localQueueOrganizationMatches,
  normalizeSpeechAppendText,
  appendSpeechTextWithoutDuplicateTail,
  isDentalSpecialty,
  telegramQrSvgToDataUrl,
  UiPreferences,
  UiPreferencesInput,
  TelegramOutboxStatusFilter,
  TelegramOutboxTemplateFilter,
  uiLanguageLabels,
  UiLanguageOption,
  defaultUiLanguageOption,
  uiLanguageOptions,
  emptyTelegramVisualCardUrlDrafts,
  telegramPublicUrlSensitiveQueryKeys,
  telegramPublicUrlSensitivePathSegments,
  normalizeTelegramPublicHttpsUrlDraft,
  normalizeTelegramVisualCardUrlDraftsForSave,
  normalizeTelegramBotUsernameDraft,
  onboardingTelegramVisualCardKeys,
  TelegramFeaturePlan,
  TelegramLinkSubjectType,
  telegramModeLabels,
  telegramModeHints,
  telegramPrivacyModeLabels,
  telegramPrivacyModeHints,
  telegramTemplateLabels,
  telegramClassificationLabels,
  telegramDeliveryStatusLabels,
  telegramLinkCodeStatusLabels,
  telegramOutboxStatusFilterOptions,
  telegramOutboxStatusFilterLabels,
  telegramOutboxTemplateFilterOptions,
  telegramOutboxTemplateFilterLabels,
  TelegramInlineButtonPreview,
  telegramInlineButtonKindLabels,
  telegramInlineButtonRowsFromReplyMarkup,
  telegramInlineButtonsFromReplyMarkup,
  telegramInlineButtonsFromPreview,
  OnboardingStep,
  onboardingStepValues,
  ClinicProfileDraft,
  ClinicProfileSaveState,
  PatientCoreDraft,
  PatientCoreSaveState,
  PatientAdministrativeProfileDraft,
  PatientAdministrativeProfileSaveState,
  StaffScheduleDraft,
  StaffScheduleSaveState,
  AppointmentScheduleDraft,
  AppointmentScheduleSaveState,
  emptyAppointmentScheduleDraft,
  MedicalDocumentReleaseChannel,
  medicalDocumentReleaseChannelLabels,
  PaymentRefundCorrectionAction,
  PaymentRefundCorrectionMethod,
  paymentRefundCorrectionActionOptions,
  paymentRefundCorrectionMethodOptions,
  treatmentAcceptanceVariantOptions,
  xrayPriorityOptions,
  outpatient025uDemographicCodeOptions,
  Outpatient025uDemographicCode,
  patientIntakePregnancyStatusOptions,
  taxApplicationRelationshipOptions,
  taxApplicationFormOptions,
  taxApplicationDeliveryChannelOptions,
  ClinicalToothSurface,
  ClinicalToothStatus,
  clinicalToothSurfaceAliases,
  clinicalToothStatusAliases,
  installmentPaymentStatusAliases,
  defaultClinicalToothRowsText,
  normalizeTaxApplicationRelationship,
  procedureSpecificConsentProcedureOptions,
  xrayStudyTypeOptions,
  xrayPregnancyStatusOptions,
  photoVideoMaterialOptions,
  defaultUiPreferences,
  aiJobKindPreferenceValues,
  aiJobKindLabels,
  isRecordKey,
  isOptionValue,
  isStringUnionValue,
  isUiLanguage,
  normalizeUiLanguageInput,
  isStaffRole,
  isPaymentMethod,
  isPricelistSourceKind,
  isAiJobKind,
  isAiRecognitionTarget,
  isImportSourceKind,
  isDocumentIngestionTarget,
  isImagingSourceKind,
  isSmartImportMode,
  isImagingKindFilter,
  isBooleanPreference,
  isTaxDocumentYearPreference,
  isDocumentKindPreference,
  isAppointmentStatusFilterPreference,
  isTaxApplicationFormPreference,
  isTaxApplicationDeliveryChannelPreference,
  isProcedureSpecificConsentProcedurePreference,
  isPostVisitCareTopicPreference,
  isDocumentIssueSignatureModePreference,
  isBoundedPreferenceString,
  isNullablePreferenceString,
  isOnboardingStepPreference,
  isTelegramLinkSubjectTypePreference,
  isTelegramOutboxStatusFilterPreference,
  isTelegramOutboxTemplateFilterPreference,
  normalizedAppointmentStatus,
  normalizedAppointmentStatusFilter,
  normalizedDocumentKind,
  normalizedPatientIntakePregnancyStatus,
  normalizedTaxApplicationRelationshipSelect,
  normalizedTaxApplicationForm,
  normalizedTaxApplicationDeliveryChannel,
  normalizedProcedureSpecificConsentProcedure,
  normalizedTreatmentPlanAcceptanceVariant,
  normalizedPostVisitCareTopic,
  normalizedXrayStudyType,
  normalizedXrayPriority,
  normalizedXrayPregnancyStatus,
  normalizedOutpatient025uDemographicCode,
  normalizedMedicalDocumentReleaseChannel,
  normalizedPaymentRefundCorrectionAction,
  normalizedPaymentRefundCorrectionMethod,
  normalizedDocumentVoidReasonCode,
  normalizedClinicalRuleAction,
  normalizedClinicalRuleSeverity,
  normalizedStaffRole,
  normalizedDentalSpecialty,
  normalizedServiceCategory,
  normalizedTelegramBotMode,
  normalizedTelegramPrivacyMode,
  normalizedTelegramLinkSubjectType,
  normalizedTelegramOutboxStatusFilter,
  normalizedTelegramOutboxTemplateFilter,
  pickUiPreference,
  normalizeUiPreferencesPayload,
  loadUiPreferences,
  withSavedUiPreferenceTimestamp,
  persistUiPreferences,
  saveUiPreferences,
  denteAdminSecretRequestHeaders,
  loadServerUiPreferences,
  saveServerUiPreferences,
  uiPreferencesSyncErrorMessage,
  responseStatusFailureLabel,
  responseErrorMessage,
  WorkflowResponseError,
  acceptedVisitSaveFailureIsRetryable,
  requestFailureMessage,
  technicalWorkflowFailurePattern,
  operatorReadableErrorDetail,
  operatorReadableErrorDetailFromUnknown,
  operatorWorkflowFailureMessage,
  browserLocalSourceErrorMessage,
  browserCapabilityFailureMessage,
  OnboardingDismissalState,
  parseOnboardingDismissalState,
  loadOnboardingDismissalState,
  mergeLocalOnboardingDismissal,
  saveOnboardingDismissed,
  weekdayOptions,
  defaultWorkingDays,
  validClockTime,
  normalizeClockTime,
  normalizeWorkingDaysDraft,
  normalizeOptionalWorkingDaysDraft,
  staffWorkingHoursFromSimpleDraft,
  staffScheduleDraftFromWorkingHours,
  appointmentScheduleDraftFromAppointment,
  timeZoneOffsetMinutes,
  timeZoneOffsetSuffix,
  timeZoneDateParts,
  toDateTimeLocalValue,
  fromDateTimeLocalValue,
  addMinutesToClinicDateTimeLocal,
  weekdayFromDateInput,
  defaultAppointmentStartLocal,
  newAppointmentDraftFromDashboard,
  isValidDateParts,
  toDateInputValue,
  isDateInputValue,
  isDateTimeLocalInputValue,
  nullableAppointmentDraftValue,
  appointmentUpdateInputFromDraft,
  appointmentCreateInputFromDraft,
  appointmentScheduleDraftSignature,
  appointmentScheduleDateMissingSteps,
  appointmentScheduleMissingFields,
  staffWorkingHoursFromDraft,
  staffScheduleDraftSignature,
  defaultStaffScheduleDraft,
  emptyClinicProfileDraft,
  clinicProfileDraftFromProfile,
  nullableClinicDraftValue,
  emptyPatientCoreDraft,
  patientCoreDraftFromPatient,
  emptyPatientAdministrativeProfileDraft,
  patientAdministrativeProfileDraftFromPatient,
  nullablePatientDraftValue,
  buildPatientCorePayload,
  patientCoreDraftSignature,
  buildPatientAdministrativeProfilePayload,
  patientAdministrativeProfileDraftSignature,
  patientAdministrativeProfileDraftIssue,
  buildClinicProfileUpdatePayload,
  clinicProfileDraftSignature,
  clinicLegalMissingFields,
  clinicLegalReadinessPercent,
  isVisitNoteForm,
  loadVisitLocalDraft,
  saveVisitLocalDraft,
  isNullableString,
  isVisitNoteDraft,
  parsePendingVisitSaveQueue,
  normalizePendingVisitSave,
  sortPendingVisitSaves,
  loadPendingVisitSavesFromLocalStorage,
  savePendingVisitSavesToLocalStorage,
  isPendingSpeechChunk,
  normalizePendingSpeechChunk,
  sortPendingSpeechChunks,
  loadPendingSpeechChunksFromLocalStorage,
  savePendingSpeechChunksToLocalStorage,
  speechChunkIndexedDbAvailable,
  pendingVisitSaveIndexedDbAvailable,
  assertSpeechChunkDbStores,
  openSpeechChunkDb,
  readLocalDicomWorkbenchDraftFromIndexedDb,
  saveLocalDicomWorkbenchDraftToIndexedDb,
  deleteLocalDicomWorkbenchDraftFromIndexedDb,
  migrateLocalDicomWorkbenchDraftFromLocalStorage,
  loadLocalDicomWorkbenchDraft,
  saveLocalDicomWorkbenchDraft,
  removeLocalDicomWorkbenchDraft,
  normalizeMprWorkbenchDraft,
  readLocalMprWorkbenchDraftFromIndexedDb,
  saveLocalMprWorkbenchDraftToIndexedDb,
  deleteLocalMprWorkbenchDraftFromIndexedDb,
  migrateLocalMprWorkbenchDraftFromLocalStorage,
  loadLocalMprWorkbenchDraft,
  saveLocalMprWorkbenchDraft,
  readPendingVisitSavesFromIndexedDb,
  savePendingVisitSavesToIndexedDb,
  deletePendingVisitSaveFromIndexedDb,
  migratePendingVisitSavesFromLocalStorage,
  loadPendingVisitSaves,
  savePendingVisitSaves,
  readPendingSpeechChunksFromIndexedDb,
  savePendingSpeechChunksToIndexedDb,
  putPendingSpeechChunkToIndexedDb,
  deletePendingSpeechChunkFromIndexedDb,
  migrateSpeechChunksFromLocalStorage,
  loadPendingSpeechChunks,
  createLocalQueueId,
  queuePendingSpeechChunk,
  removePendingSpeechChunkById,
  blobToBase64,
  PricelistImageMimeType,
  pricelistImageMimeTypes,
  maxPricelistImageBase64Chars,
  readFileAsDataUrl,
  loadImageFromDataUrl,
  preparePricelistImage,
  queuePendingVisitSave,
  latestPendingVisitSaveAt,
  visitSaveReceiptText,
  buildOfflineVisitDraftFromTranscript,
  normalizePersistenceHealth,
  DenteTelegramPortalSection,
  DenteTelegramHandoffTarget,
  denteTelegramHandoffTargets,
  isDenteTelegramPortalSection,
  readDenteTelegramHandoffTarget,
  stripDenteTelegramHandoffQuery,
  workspaceScopeLabels,
  patientInsightRiskLabels,
  recommendedActionPriorityLabels,
  appointmentReadinessLabels,
  settingsTabs,
  SettingsTab,
  AdminSecretSessionDomain,
  AdminSecretUnlockDomain,
  onboardingSteps,
  roleFocusOrder,
  speechProviderConnectorLabels,
  viewFromHash,
  settingsTabFromHash,
  speechGatewayCanUpload
} from "./AppHelpers";

export function useAppLogic(): any {
const {
    selectedPatientId,
    patientCoreDraft,
    patientCoreSaveState,
    patientCoreDirty,
    patientAdministrativeProfileDraft,
    patientAdministrativeProfileSaveState,
    patientAdministrativeProfileDirty,
    newPatientName,
    newPatientPhone,
    newPatientBirthDate,
    isPatientCreating,
    newRulePatientText,
    setSelectedPatientId,
    setPatientCoreDraft,
    setPatientCoreSaveState,
    setPatientCoreDirty,
    setPatientAdministrativeProfileDraft,
    setPatientAdministrativeProfileSaveState,
    setPatientAdministrativeProfileDirty,
    setNewPatientName,
    setNewPatientPhone,
    setNewPatientBirthDate,
    setIsPatientCreating,
    setNewRulePatientText
  } = usePatientStore();
  const {
    scheduleDoctorFilterId,
    setScheduleDoctorFilterId,
    scheduleAssistantFilterId,
    setScheduleAssistantFilterId,
    scheduleChairFilterId,
    setScheduleChairFilterId,
    scheduleDefaultDoctorUserId,
    setScheduleDefaultDoctorUserId,
    scheduleDefaultAssistantUserId,
    setScheduleDefaultAssistantUserId,
    scheduleDefaultChairId,
    setScheduleDefaultChairId,
    scheduleStatusFilter,
    setScheduleStatusFilter,
    scheduleDateFilter,
    setScheduleDateFilter,
    staffScheduleDrafts,
    setStaffScheduleDrafts,
    staffScheduleSavingId,
    setStaffScheduleSavingId,
    staffScheduleDirtyIds,
    setStaffScheduleDirtyIds,
    staffScheduleSaveStates,
    setStaffScheduleSaveStates,
    chairScheduleDrafts,
    setChairScheduleDrafts,
    chairScheduleSavingId,
    setChairScheduleSavingId,
    chairScheduleDirtyIds,
    setChairScheduleDirtyIds,
    chairScheduleSaveStates,
    setChairScheduleSaveStates,
    appointmentScheduleDrafts,
    setAppointmentScheduleDrafts,
    appointmentScheduleDirtyIds,
    setAppointmentScheduleDirtyIds,
    appointmentScheduleSaveStates,
    setAppointmentScheduleSaveStates,
    appointmentScheduleErrors,
    setAppointmentScheduleErrors,
    newAppointmentDraft,
    setNewAppointmentDraft,
    newAppointmentSaveState,
    setNewAppointmentSaveState
  } = useScheduleStore();
      const {
    imagingImportText,
    setImagingImportText,
    imagingImportSourceKind,
    setImagingImportSourceKind,
    localImagingFolderDraft,
    setLocalImagingFolderDraft,
    imagingFolderPath,
    setImagingFolderPath,
    browserPickedImagingFolder,
    setBrowserPickedImagingFolder,
    browserImagingScanProgress,
    setBrowserImagingScanProgress,
    browserDirectoryPickerAvailable,
    setBrowserDirectoryPickerAvailable,
    imagingImportPreview,
    setImagingImportPreview,
    imagingImportCommit,
    setImagingImportCommit,
    imagingFolderScan,
    setImagingFolderScan,
    dicomLocalFolderDiscovery,
    setDicomLocalFolderDiscovery,
    localImagingOrganizer,
    setLocalImagingOrganizer,
    dicomSeriesPreview,
    setDicomSeriesPreview,
    dicomFolderSeriesScan,
    setDicomFolderSeriesScan,
    dicomFolderWorkupPlan,
    setDicomFolderWorkupPlan,
    dicomFirstFramePreview,
    setDicomFirstFramePreview,
    dicomFirstFrameViewerState,
    setDicomFirstFrameViewerState,
    dicomWebEndpointUrl,
    setDicomWebEndpointUrl,
    dicomWebCheck,
    setDicomWebCheck,
    dicomViewerLaunchManifest,
    setDicomViewerLaunchManifest,
    dicomViewerToolStateBundle,
    setDicomViewerToolStateBundle,
    dicomViewerWorkbenchManifest,
    setDicomViewerWorkbenchManifest,
    dicomWorkbenchLocalSavedAt,
    setDicomWorkbenchLocalSavedAt,
    dicomWorkbenchServerBundle,
    setDicomWorkbenchServerBundle,
    dicomWorkbenchServerBundles,
    setDicomWorkbenchServerBundles,
    dicomWorkstationReadiness,
    setDicomWorkstationReadiness,
    dicomRenderCachePlan,
    setDicomRenderCachePlan,
    selectedImagingStudyId,
    setSelectedImagingStudyId,
    imagingKindFilter,
    setImagingKindFilter,
    imagingViewerState,
    setImagingViewerState,
    imagingViewerActiveTool,
    setImagingViewerActiveTool,
    ctPlanningActiveQuickActionId,
    setCtPlanningActiveQuickActionId,
    ctPlanningImplantPlan,
    setCtPlanningImplantPlan,
    imagingViewerAnnotations,
    setImagingViewerAnnotations,
    imagingViewerNote,
    setImagingViewerNote,
    imagingViewerSession,
    setImagingViewerSession,
    imagingViewerSaveState,
    setImagingViewerSaveState,
    imagingViewerLocalSavedAt,
    setImagingViewerLocalSavedAt,
    imagingViewerSaveError,
    setImagingViewerSaveError,
    imagingViewerSessionReady,
    setImagingViewerSessionReady,
    mprProjection,
    setMprProjection,
    mprAxisDeg,
    setMprAxisDeg,
    mprSlabMm,
    setMprSlabMm,
    mprSliceIndex,
    setMprSliceIndex,
    mprWindowPreset,
    setMprWindowPreset,
    mprCrosshairEnabled,
    setMprCrosshairEnabled,
    mprLinkedPlanesEnabled,
    setMprLinkedPlanesEnabled,
    mprWorkbenchLocalSavedAt,
    setMprWorkbenchLocalSavedAt,
    mprWorkbenchDraftRestored,
    setMprWorkbenchDraftRestored,
    isImagingImportLoading,
    setIsImagingImportLoading,
    isImagingImportCommitting,
    setIsImagingImportCommitting,
    imagingCreateSavingKind,
    setImagingCreateSavingKind,
    isImagingFolderScanning,
    setIsImagingFolderScanning,
    isDicomLocalDiscovering,
    setIsDicomLocalDiscovering,
    isLocalImagingOrganizing,
    setIsLocalImagingOrganizing,
    isDicomSeriesPreviewLoading,
    setIsDicomSeriesPreviewLoading,
    isDicomWebChecking,
    setIsDicomWebChecking,
    isDicomManifestBuilding,
    setIsDicomManifestBuilding,
    isDicomToolStateBuilding,
    setIsDicomToolStateBuilding,
    isDicomWorkbenchBuilding,
    setIsDicomWorkbenchBuilding,
    isDicomWorkbenchServerSaving,
    setIsDicomWorkbenchServerSaving,
    isDicomWorkbenchReconnecting,
    setIsDicomWorkbenchReconnecting,
    isDicomWorkstationChecking,
    setIsDicomWorkstationChecking,
    isDicomRenderCachePlanning,
    setIsDicomRenderCachePlanning,
    isDicomFolderWorkupPlanning,
    setIsDicomFolderWorkupPlanning,
    isDicomFirstFramePreviewing,
    setIsDicomFirstFramePreviewing,
    isBrowserImagingFolderPicking,
    setIsBrowserImagingFolderPicking,
    isLocalDicomOperationActive,
    setIsLocalDicomOperationActive
  } = useImagingStore();
  const {
    selectedSpecialty, setSelectedSpecialty,
    selectedProtocolId, setSelectedProtocolId,
    clearedTranscriptSnapshot, setClearedTranscriptSnapshot,
    transcript, setTranscript,
    draft, setDraft,
    visitNoteForm, setVisitNoteForm,
    visitToothStateByCode, setToothState, applyAiToothCodes,
    lastServerDraftSavedAt, setLastServerDraftSavedAt,
    serverDraftSyncState, setServerDraftSyncState,
    localDraftWasRestored, setLocalDraftWasRestored,
    pendingVisitSaveCount, setPendingVisitSaveCount,
    lastPendingVisitSaveAt, setLastPendingVisitSaveAt,
    lastVisitSaveReceipt, setLastVisitSaveReceipt,
    speechLastQuality, setSpeechLastQuality,
    isDraftLoading, setIsDraftLoading,
    isDraftAccepting, setIsDraftAccepting,
    isPendingVisitSyncing, setIsPendingVisitSyncing,
    isVisitDictating, setIsVisitDictating,
    isTranscriptPolishing, setIsTranscriptPolishing,
    lastServerDraftSignatureRef, visitDraftUserEditedRef
  } = useVisitStore();
  const {
    documentCreateSavingKind,
    setDocumentCreateSavingKind,
    documentStatusSavingId,
    setDocumentStatusSavingId,
    taxDocumentPayerInn,
    setTaxDocumentPayerInn,
    selectedTaxPaymentIds,
    setSelectedTaxPaymentIds,
    selectedPaymentReceiptIds,
    setSelectedPaymentReceiptIds,
    taxApplicationTaxpayerFullName,
    setTaxApplicationTaxpayerFullName,
    taxApplicationTaxpayerInn,
    setTaxApplicationTaxpayerInn,
    taxApplicationTaxpayerBirthDate,
    setTaxApplicationTaxpayerBirthDate,
    taxApplicationTaxpayerIdentityDocument,
    setTaxApplicationTaxpayerIdentityDocument,
    taxApplicationRelationship,
    setTaxApplicationRelationship,
    taxApplicationForm,
    setTaxApplicationForm,
    taxApplicationDeliveryChannel,
    setTaxApplicationDeliveryChannel,
    taxApplicationContact,
    setTaxApplicationContact,
    taxApplicationAuthorityDocument,
    setTaxApplicationAuthorityDocument,
    taxApplicationRequestedAt,
    setTaxApplicationRequestedAt,
    taxApplicationDuplicateWarningAccepted,
    setTaxApplicationDuplicateWarningAccepted,
    intakeChiefComplaint,
    setIntakeChiefComplaint,
    intakeAllergyStatus,
    setIntakeAllergyStatus,
    intakeCurrentMedications,
    setIntakeCurrentMedications,
    intakeChronicConditions,
    setIntakeChronicConditions,
    intakePregnancyStatus,
    setIntakePregnancyStatus,
    intakeAnticoagulants,
    setIntakeAnticoagulants,
    intakeInfectiousRiskNotes,
    setIntakeInfectiousRiskNotes,
    intakeCardioEndocrineNotes,
    setIntakeCardioEndocrineNotes,
    intakeEmergencyContact,
    setIntakeEmergencyContact,
    intakeAdditionalNotes,
    setIntakeAdditionalNotes,
    intakeAccuracyConfirmed,
    setIntakeAccuracyConfirmed,
    informedConsentIntervention,
    setInformedConsentIntervention,
    informedConsentToothOrArea,
    setInformedConsentToothOrArea,
    informedConsentDiagnosisOrIndication,
    setInformedConsentDiagnosisOrIndication,
    informedConsentExpectedBenefit,
    setInformedConsentExpectedBenefit,
    informedConsentAnesthesia,
    setInformedConsentAnesthesia,
    informedConsentMaterialNotes,
    setInformedConsentMaterialNotes,
    informedConsentTrustedContact,
    setInformedConsentTrustedContact,
    informedConsentRisks,
    setInformedConsentRisks,
    informedConsentAlternatives,
    setInformedConsentAlternatives,
    informedConsentAftercare,
    setInformedConsentAftercare,
    informedConsentDoctorFullName,
    setInformedConsentDoctorFullName,
    informedConsentConfirmedAt,
    setInformedConsentConfirmedAt,
    informedConsentQuestionsAnswered,
    setInformedConsentQuestionsAnswered,
    informedConsentRisksUnderstood,
    setInformedConsentRisksUnderstood,
    informedConsentWithdrawUnderstood,
    setInformedConsentWithdrawUnderstood,
    procedureConsentProcedureType,
    setProcedureConsentProcedureType,
    procedureConsentProcedureName,
    setProcedureConsentProcedureName,
    procedureConsentToothOrArea,
    setProcedureConsentToothOrArea,
    procedureConsentDiagnosisOrIndication,
    setProcedureConsentDiagnosisOrIndication,
    procedureConsentAnesthesia,
    setProcedureConsentAnesthesia,
    procedureConsentMaterials,
    setProcedureConsentMaterials,
    procedureConsentPatientRiskFactors,
    setProcedureConsentPatientRiskFactors,
    procedureConsentSpecificRisks,
    setProcedureConsentSpecificRisks,
    procedureConsentAlternatives,
    setProcedureConsentAlternatives,
    procedureConsentAftercare,
    setProcedureConsentAftercare,
    procedureConsentDoctorFullName,
    setProcedureConsentDoctorFullName,
    procedureConsentConfirmedAt,
    setProcedureConsentConfirmedAt,
    procedureConsentLocalFormAttached,
    setProcedureConsentLocalFormAttached,
    procedureConsentQuestionsAnswered,
    setProcedureConsentQuestionsAnswered,
    procedureConsentExactProcedureConfirmed,
    setProcedureConsentExactProcedureConfirmed,
    procedureConsentRisksUnderstood,
    setProcedureConsentRisksUnderstood,
    paidContractNumber,
    setPaidContractNumber,
    paidContractDate,
    setPaidContractDate,
    paidContractServiceStart,
    setPaidContractServiceStart,
    paidContractServiceEnd,
    setPaidContractServiceEnd,
    paidContractCustomerFullName,
    setPaidContractCustomerFullName,
    paidContractRepresentativeFullName,
    setPaidContractRepresentativeFullName,
    paidContractCareReason,
    setPaidContractCareReason,
    paidContractServiceScope,
    setPaidContractServiceScope,
    paidContractTotalRub,
    setPaidContractTotalRub,
    paidContractPaymentTerms,
    setPaidContractPaymentTerms,
    paidContractPriceChangeRules,
    setPaidContractPriceChangeRules,
    paidContractFreeCareNotice,
    setPaidContractFreeCareNotice,
    paidContractRecommendationWarning,
    setPaidContractRecommendationWarning,
    paidContractRefundTerms,
    setPaidContractRefundTerms,
    paidContractWarrantyTerms,
    setPaidContractWarrantyTerms,
    paidContractDoctorFullName,
    setPaidContractDoctorFullName,
    paidContractSignedAt,
    setPaidContractSignedAt,
    paidContractClinicInfoConfirmed,
    setPaidContractClinicInfoConfirmed,
    paidContractServiceListConfirmed,
    setPaidContractServiceListConfirmed,
    paidContractPaidBasisConfirmed,
    setPaidContractPaidBasisConfirmed,
    paidContractWrittenChangesConfirmed,
    setPaidContractWrittenChangesConfirmed,
    completedActNumber,
    setCompletedActNumber,
    completedActDate,
    setCompletedActDate,
    completedActContractNumber,
    setCompletedActContractNumber,
    completedActLinkedContractDocumentId,
    setCompletedActLinkedContractDocumentId,
    completedActServicePeriodStart,
    setCompletedActServicePeriodStart,
    completedActServicePeriodEnd,
    setCompletedActServicePeriodEnd,
    completedActDoctorFullName,
    setCompletedActDoctorFullName,
    completedActServicesSummary,
    setCompletedActServicesSummary,
    completedActTotalRub,
    setCompletedActTotalRub,
    completedActPaidRub,
    setCompletedActPaidRub,
    completedActFiscalReceipts,
    setCompletedActFiscalReceipts,
    completedActPatientClaims,
    setCompletedActPatientClaims,
    completedActLinkedContract,
    setCompletedActLinkedContract,
    completedActFinalScopeConfirmed,
    setCompletedActFinalScopeConfirmed,
    completedActFiscalReceiptsVerified,
    setCompletedActFiscalReceiptsVerified,
    completedActAccepted,
    setCompletedActAccepted,
    treatmentEstimateNumber,
    setTreatmentEstimateNumber,
    treatmentEstimateDate,
    setTreatmentEstimateDate,
    treatmentEstimatePatientOrPayerFullName,
    setTreatmentEstimatePatientOrPayerFullName,
    treatmentEstimateTreatmentBasis,
    setTreatmentEstimateTreatmentBasis,
    treatmentEstimateTotalRub,
    setTreatmentEstimateTotalRub,
    treatmentEstimateValidUntil,
    setTreatmentEstimateValidUntil,
    treatmentEstimatePriceChangeRules,
    setTreatmentEstimatePriceChangeRules,
    treatmentEstimateExcludedItems,
    setTreatmentEstimateExcludedItems,
    treatmentEstimatePaymentMilestoneNotes,
    setTreatmentEstimatePaymentMilestoneNotes,
    treatmentEstimateDoctorFullName,
    setTreatmentEstimateDoctorFullName,
    treatmentEstimateAdminFullName,
    setTreatmentEstimateAdminFullName,
    treatmentEstimateSignedAt,
    setTreatmentEstimateSignedAt,
    treatmentEstimatePreliminaryConfirmed,
    setTreatmentEstimatePreliminaryConfirmed,
    treatmentEstimateScopeConfirmed,
    setTreatmentEstimateScopeConfirmed,
    treatmentEstimateFiscalNoticeConfirmed,
    setTreatmentEstimateFiscalNoticeConfirmed,
    treatmentEstimateChangeRulesConfirmed,
    setTreatmentEstimateChangeRulesConfirmed,
    paymentInvoiceNumber,
    setPaymentInvoiceNumber,
    paymentInvoiceDate,
    setPaymentInvoiceDate,
    paymentInvoicePayerFullName,
    setPaymentInvoicePayerFullName,
    paymentInvoicePayerPhone,
    setPaymentInvoicePayerPhone,
    paymentInvoicePayerEmail,
    setPaymentInvoicePayerEmail,
    paymentInvoicePurpose,
    setPaymentInvoicePurpose,
    paymentInvoiceDueDate,
    setPaymentInvoiceDueDate,
    paymentInvoicePaymentTerms,
    setPaymentInvoicePaymentTerms,
    paymentInvoiceBankDetails,
    setPaymentInvoiceBankDetails,
    paymentInvoiceQrPayload,
    setPaymentInvoiceQrPayload,
    paymentInvoiceCashlessAllowed,
    setPaymentInvoiceCashlessAllowed,
    paymentInvoiceCashDeskAllowed,
    setPaymentInvoiceCashDeskAllowed,
    paymentInvoiceRequisitesVerified,
    setPaymentInvoiceRequisitesVerified,
    paymentInvoiceServiceScopeConfirmed,
    setPaymentInvoiceServiceScopeConfirmed,
    paymentInvoiceFiscalNoticeConfirmed,
    setPaymentInvoiceFiscalNoticeConfirmed,
    paymentReceiptNumber,
    setPaymentReceiptNumber,
    paymentReceiptDate,
    setPaymentReceiptDate,
    paymentReceiptPayerFullName,
    setPaymentReceiptPayerFullName,
    paymentReceiptPayerBirthDate,
    setPaymentReceiptPayerBirthDate,
    paymentReceiptPayerInn,
    setPaymentReceiptPayerInn,
    paymentReceiptPayerIdentityDocument,
    setPaymentReceiptPayerIdentityDocument,
    paymentReceiptPayerRelationship,
    setPaymentReceiptPayerRelationship,
    paymentReceiptTaxSupportRequested,
    setPaymentReceiptTaxSupportRequested,
    paymentReceiptPurpose,
    setPaymentReceiptPurpose,
    paymentReceiptIssuedBy,
    setPaymentReceiptIssuedBy,
    paymentReceiptPaymentsVerified,
    setPaymentReceiptPaymentsVerified,
    paymentReceiptPayerVerified,
    setPaymentReceiptPayerVerified,
    paymentReceiptFiscalNoticeConfirmed,
    setPaymentReceiptFiscalNoticeConfirmed,
    installmentScheduleNumber,
    setInstallmentScheduleNumber,
    installmentScheduleDate,
    setInstallmentScheduleDate,
    installmentScheduleBaseDocumentTitle,
    setInstallmentScheduleBaseDocumentTitle,
    installmentSchedulePayerFullName,
    setInstallmentSchedulePayerFullName,
    installmentScheduleTotalRub,
    setInstallmentScheduleTotalRub,
    installmentSchedulePrepaidRub,
    setInstallmentSchedulePrepaidRub,
    installmentScheduleRows,
    setInstallmentScheduleRows,
    installmentScheduleLatePolicy,
    setInstallmentScheduleLatePolicy,
    installmentSchedulePaymentMethodNotes,
    setInstallmentSchedulePaymentMethodNotes,
    installmentScheduleResponsibleFullName,
    setInstallmentScheduleResponsibleFullName,
    installmentScheduleAccepted,
    setInstallmentScheduleAccepted,
    installmentScheduleFiscalNoticeConfirmed,
    setInstallmentScheduleFiscalNoticeConfirmed,
    installmentScheduleWrittenChangesConfirmed,
    setInstallmentScheduleWrittenChangesConfirmed,
    minorRepresentativeFullName,
    setMinorRepresentativeFullName,
    minorRepresentativeRelationship,
    setMinorRepresentativeRelationship,
    minorRepresentativeIdentityDocument,
    setMinorRepresentativeIdentityDocument,
    minorRepresentativeAuthorityDocument,
    setMinorRepresentativeAuthorityDocument,
    minorRepresentativePhone,
    setMinorRepresentativePhone,
    minorConsentPatientFullName,
    setMinorConsentPatientFullName,
    minorConsentPatientBirthDate,
    setMinorConsentPatientBirthDate,
    minorConsentInterventionScope,
    setMinorConsentInterventionScope,
    minorConsentDiagnosisOrIndication,
    setMinorConsentDiagnosisOrIndication,
    minorConsentRisks,
    setMinorConsentRisks,
    minorConsentAlternatives,
    setMinorConsentAlternatives,
    minorConsentDoctorFullName,
    setMinorConsentDoctorFullName,
    minorConsentSignedAt,
    setMinorConsentSignedAt,
    minorConsentIdentityVerified,
    setMinorConsentIdentityVerified,
    minorConsentAuthorityVerified,
    setMinorConsentAuthorityVerified,
    minorConsentExplained,
    setMinorConsentExplained,
    minorConsentStored,
    setMinorConsentStored,
    minorConsentAgeExplanation,
    setMinorConsentAgeExplanation,
    warrantyServiceOrWorkName,
    setWarrantyServiceOrWorkName,
    warrantyCompletedAt,
    setWarrantyCompletedAt,
    warrantyTeethOrArea,
    setWarrantyTeethOrArea,
    warrantyMaterialsOrSystems,
    setWarrantyMaterialsOrSystems,
    warrantyPeriod,
    setWarrantyPeriod,
    warrantyControlVisitSchedule,
    setWarrantyControlVisitSchedule,
    warrantyPatientObligations,
    setWarrantyPatientObligations,
    warrantyExcludedRiskFactors,
    setWarrantyExcludedRiskFactors,
    warrantyUrgentContactReasons,
    setWarrantyUrgentContactReasons,
    warrantyLinkedActOrContract,
    setWarrantyLinkedActOrContract,
    warrantyDoctorFullName,
    setWarrantyDoctorFullName,
    warrantyIssuedAt,
    setWarrantyIssuedAt,
    warrantyPolicyApplied,
    setWarrantyPolicyApplied,
    warrantyAftercareReceived,
    setWarrantyAftercareReceived,
    warrantyControlVisitsUnderstood,
    setWarrantyControlVisitsUnderstood,
    clinicalToothRowsText,
    setClinicalToothRowsText,
    treatmentPlanClinicalReason,
    setTreatmentPlanClinicalReason,
    treatmentPlanDiagnosisSummary,
    setTreatmentPlanDiagnosisSummary,
    treatmentPlanTeethOrArea,
    setTreatmentPlanTeethOrArea,
    treatmentPlanGoals,
    setTreatmentPlanGoals,
    treatmentPlanStages,
    setTreatmentPlanStages,
    treatmentPlanEstimatedTotalRub,
    setTreatmentPlanEstimatedTotalRub,
    treatmentPlanAlternatives,
    setTreatmentPlanAlternatives,
    treatmentPlanRisks,
    setTreatmentPlanRisks,
    treatmentPlanPrognosis,
    setTreatmentPlanPrognosis,
    treatmentPlanControlPlan,
    setTreatmentPlanControlPlan,
    treatmentPlanDoctorFullName,
    setTreatmentPlanDoctorFullName,
    treatmentPlanPlannedAt,
    setTreatmentPlanPlannedAt,
    treatmentPlanQuestionsAnswered,
    setTreatmentPlanQuestionsAnswered,
    treatmentPlanSeparateConsentAcknowledged,
    setTreatmentPlanSeparateConsentAcknowledged,
    treatmentPlanNewApprovalAcknowledged,
    setTreatmentPlanNewApprovalAcknowledged,
    treatmentAcceptanceVariant,
    setTreatmentAcceptanceVariant,
    treatmentAcceptanceClinicalGoal,
    setTreatmentAcceptanceClinicalGoal,
    treatmentAcceptanceDiagnosisSummary,
    setTreatmentAcceptanceDiagnosisSummary,
    treatmentAcceptanceTeethOrArea,
    setTreatmentAcceptanceTeethOrArea,
    treatmentAcceptanceStages,
    setTreatmentAcceptanceStages,
    treatmentAcceptanceEstimatedTotalRub,
    setTreatmentAcceptanceEstimatedTotalRub,
    treatmentAcceptanceEstimateValidUntil,
    setTreatmentAcceptanceEstimateValidUntil,
    treatmentAcceptancePaymentTerms,
    setTreatmentAcceptancePaymentTerms,
    treatmentAcceptanceRejectedAlternatives,
    setTreatmentAcceptanceRejectedAlternatives,
    treatmentAcceptanceRisks,
    setTreatmentAcceptanceRisks,
    treatmentAcceptanceWarrantyTerms,
    setTreatmentAcceptanceWarrantyTerms,
    treatmentAcceptanceDoctorFullName,
    setTreatmentAcceptanceDoctorFullName,
    treatmentAcceptanceAcceptedAt,
    setTreatmentAcceptanceAcceptedAt,
    treatmentAcceptanceQuestionsAnswered,
    setTreatmentAcceptanceQuestionsAnswered,
    treatmentAcceptanceAlternativesUnderstood,
    setTreatmentAcceptanceAlternativesUnderstood,
    treatmentAcceptanceCostChangeUnderstood,
    setTreatmentAcceptanceCostChangeUnderstood,
    treatmentAcceptanceRevisionAcknowledged,
    setTreatmentAcceptanceRevisionAcknowledged,
    postVisitCareTopic,
    setPostVisitCareTopic,
    postVisitProcedureName,
    setPostVisitProcedureName,
    postVisitToothOrArea,
    setPostVisitToothOrArea,
    postVisitPerformedAt,
    setPostVisitPerformedAt,
    postVisitDoctorFullName,
    setPostVisitDoctorFullName,
    postVisitManualEdited,
    setPostVisitManualEdited,
    postVisitPresetFeedback,
    setPostVisitPresetFeedback,
    postVisitAllowedAfter,
    setPostVisitAllowedAfter,
    postVisitRestrictions,
    setPostVisitRestrictions,
    postVisitMedicationAndRinsePlan,
    setPostVisitMedicationAndRinsePlan,
    postVisitHygieneInstructions,
    setPostVisitHygieneInstructions,
    postVisitNutritionInstructions,
    setPostVisitNutritionInstructions,
    postVisitUrgentWarningSigns,
    setPostVisitUrgentWarningSigns,
    postVisitFollowUpAt,
    setPostVisitFollowUpAt,
    postVisitClinicContactInstruction,
    setPostVisitClinicContactInstruction,
    postVisitTelegramSummary,
    setPostVisitTelegramSummary,
    postVisitPrintedCopyReceived,
    setPostVisitPrintedCopyReceived,
    postVisitUrgentSignsUnderstood,
    setPostVisitUrgentSignsUnderstood,
    postVisitTelegramSafe,
    setPostVisitTelegramSafe,
    anesthesiaMethod,
    setAnesthesiaMethod,
    anesthesiaAnesthetic,
    setAnesthesiaAnesthetic,
    anesthesiaVasoconstrictor,
    setAnesthesiaVasoconstrictor,
    anesthesiaZone,
    setAnesthesiaZone,
    anesthesiaAllergyStatus,
    setAnesthesiaAllergyStatus,
    anesthesiaRestrictionNotes,
    setAnesthesiaRestrictionNotes,
    anesthesiaDoseTime,
    setAnesthesiaDoseTime,
    anesthesiaDoseMl,
    setAnesthesiaDoseMl,
    anesthesiaReaction,
    setAnesthesiaReaction,
    anesthesiaRisksExplained,
    setAnesthesiaRisksExplained,
    anesthesiaAllergyRestrictionsChecked,
    setAnesthesiaAllergyRestrictionsChecked,
    anesthesiaConsentConfirmed,
    setAnesthesiaConsentConfirmed,
    prescriptionMedication,
    setPrescriptionMedication,
    prescriptionDosage,
    setPrescriptionDosage,
    prescriptionInstructions,
    setPrescriptionInstructions,
    prescriptionDuration,
    setPrescriptionDuration,
    prescriptionSafetyNotes,
    setPrescriptionSafetyNotes,
    prescriptionUrgentContactReason,
    setPrescriptionUrgentContactReason,
    labWorkType,
    setLabWorkType,
    labTeethOrArea,
    setLabTeethOrArea,
    labMaterial,
    setLabMaterial,
    labShade,
    setLabShade,
    labSource,
    setLabSource,
    labDeadline,
    setLabDeadline,
    labTechnicianNotes,
    setLabTechnicianNotes,
    photoVideoLabTransferAllowed,
    setPhotoVideoLabTransferAllowed,
    photoVideoColleagueConsultationAllowed,
    setPhotoVideoColleagueConsultationAllowed,
    photoVideoEducationUseAllowed,
    setPhotoVideoEducationUseAllowed,
    photoVideoMarketingUseAllowed,
    setPhotoVideoMarketingUseAllowed,
    photoVideoRecognizablePublicationAllowed,
    setPhotoVideoRecognizablePublicationAllowed,
    photoVideoClinicalRecordUseConfirmed,
    setPhotoVideoClinicalRecordUseConfirmed,
    photoVideoAnonymizationConfirmed,
    setPhotoVideoAnonymizationConfirmed,
    photoVideoMaterials,
    setPhotoVideoMaterials,
    photoVideoRevocationChannel,
    setPhotoVideoRevocationChannel,
    photoVideoScopeNotes,
    setPhotoVideoScopeNotes,
    xrayStudyType,
    setXrayStudyType,
    xrayArea,
    setXrayArea,
    xrayClinicalQuestion,
    setXrayClinicalQuestion,
    xrayIndication,
    setXrayIndication,
    xrayPregnancyStatus,
    setXrayPregnancyStatus,
    xraySafetyNotes,
    setXraySafetyNotes,
    xrayPriority,
    setXrayPriority,
    xrayIncludeDicomExport,
    setXrayIncludeDicomExport,
    xrayIncludeRadiologistReport,
    setXrayIncludeRadiologistReport,
    xrayRequestedBy,
    setXrayRequestedBy,
    xrayRecipientClinic,
    setXrayRecipientClinic,
    xrayDueDate,
    setXrayDueDate,
    recordExtractPeriodStart,
    setRecordExtractPeriodStart,
    recordExtractPeriodEnd,
    setRecordExtractPeriodEnd,
    recordExtractSourceVisitIds,
    setRecordExtractSourceVisitIds,
    recordExtractComplaintAndAnamnesis,
    setRecordExtractComplaintAndAnamnesis,
    recordExtractObjectiveStatus,
    setRecordExtractObjectiveStatus,
    recordExtractDiagnosis,
    setRecordExtractDiagnosis,
    recordExtractTreatmentProvided,
    setRecordExtractTreatmentProvided,
    recordExtractRecommendations,
    setRecordExtractRecommendations,
    recordExtractDoctorFullName,
    setRecordExtractDoctorFullName,
    recordExtractRecipientFullName,
    setRecordExtractRecipientFullName,
    recordExtractRecipientAuthority,
    setRecordExtractRecipientAuthority,
    recordExtractIssuedAt,
    setRecordExtractIssuedAt,
    recordExtractPreparedFromSignedRecords,
    setRecordExtractPreparedFromSignedRecords,
    recordExtractThirdPartyDataChecked,
    setRecordExtractThirdPartyDataChecked,
    outpatient025uMedicalCardNumber,
    setOutpatient025uMedicalCardNumber,
    outpatient025uOpenedAt,
    setOutpatient025uOpenedAt,
    outpatient025uPatientSexCode,
    setOutpatient025uPatientSexCode,
    outpatient025uCitizenship,
    setOutpatient025uCitizenship,
    outpatient025uRegistrationUrbanRuralCode,
    setOutpatient025uRegistrationUrbanRuralCode,
    outpatient025uStayUrbanRuralCode,
    setOutpatient025uStayUrbanRuralCode,
    outpatient025uOmsIssuedAt,
    setOutpatient025uOmsIssuedAt,
    outpatient025uInsurerName,
    setOutpatient025uInsurerName,
    outpatient025uSocialSupportCode,
    setOutpatient025uSocialSupportCode,
    outpatient025uHealthStatusDisclosureContact,
    setOutpatient025uHealthStatusDisclosureContact,
      outpatient025uEmploymentCode,
    setOutpatient025uEmploymentCode,
    outpatient025uDisabilityGroup,
    setOutpatient025uDisabilityGroup,
    outpatient025uWorkOrStudyPlace,
    setOutpatient025uWorkOrStudyPlace,
    outpatient025uPalliativeCareNeedCode,
    setOutpatient025uPalliativeCareNeedCode,
    outpatient025uBloodGroup,
    setOutpatient025uBloodGroup,
    outpatient025uRhFactor,
    setOutpatient025uRhFactor,
    outpatient025uKellK1,
    setOutpatient025uKellK1,
    outpatient025uOtherBloodData,
    setOutpatient025uOtherBloodData,
    outpatient025uAllergyHistory,
    setOutpatient025uAllergyHistory,
    outpatient025uFinalEpicrisis,
    setOutpatient025uFinalEpicrisis,
    outpatient025uOfficialForm274nChecked,
    setOutpatient025uOfficialForm274nChecked,
    outpatient025uThirdPartyDataChecked,
    setOutpatient025uThirdPartyDataChecked,
    copyRequestDocumentTypes,
    setCopyRequestDocumentTypes,
    copyRequestPeriodStart,
    setCopyRequestPeriodStart,
    copyRequestPeriodEnd,
    setCopyRequestPeriodEnd,
    copyRequestFormat,
    setCopyRequestFormat,
    copyRequestRecipientFullName,
    setCopyRequestRecipientFullName,
    copyRequestRecipientIdentityDocument,
    setCopyRequestRecipientIdentityDocument,
    copyRequestRecipientAuthority,
    setCopyRequestRecipientAuthority,
    copyRequestRepresentativeAuthorityDocument,
    setCopyRequestRepresentativeAuthorityDocument,
    copyRequestRequestedAt,
    setCopyRequestRequestedAt,
    copyRequestContactForDelivery,
    setCopyRequestContactForDelivery,
    copyRequestSpecialInstructions,
    setCopyRequestSpecialInstructions,
    copyRequestIncludeDicomSourceData,
    setCopyRequestIncludeDicomSourceData,
    copyRequestIdentityVerified,
    setCopyRequestIdentityVerified,
    copyRequestThirdPartyDataChecked,
    setCopyRequestThirdPartyDataChecked,
    attendanceStartedAt,
    setAttendanceStartedAt,
    attendanceEndedAt,
    setAttendanceEndedAt,
    attendancePurpose,
    setAttendancePurpose,
    attendanceRecipientOrganization,
    setAttendanceRecipientOrganization,
    attendanceIssuedAt,
    setAttendanceIssuedAt,
    attendanceSignedByFullName,
    setAttendanceSignedByFullName,
    attendanceSignedByRole,
    setAttendanceSignedByRole,
    attendanceDiagnosisDisclosureExcluded,
    setAttendanceDiagnosisDisclosureExcluded,
    attendanceNotSickLeaveAcknowledged,
    setAttendanceNotSickLeaveAcknowledged,
    releaseRecipientFullName,
    setReleaseRecipientFullName,
    releaseRecipientIdentityDocument,
    setReleaseRecipientIdentityDocument,
    releaseRecipientAuthority,
    setReleaseRecipientAuthority,
    releaseSourceRequestDocumentId,
    setReleaseSourceRequestDocumentId,
    releaseChannel,
    setReleaseChannel,
    releaseDocumentTypes,
    setReleaseDocumentTypes,
    releasePeriodStart,
    setReleasePeriodStart,
    releasePeriodEnd,
    setReleasePeriodEnd,
    releaseDeliveredAt,
    setReleaseDeliveredAt,
    releaseAccessExpiresAt,
    setReleaseAccessExpiresAt,
    releaseThirdPartyDataChecked,
    setReleaseThirdPartyDataChecked,
    refundAction,
    setRefundAction,
    refundAmountRub,
    setRefundAmountRub,
    refundReason,
    setRefundReason,
    refundMethod,
    setRefundMethod,
    refundRecipientFullName,
    setRefundRecipientFullName,
    refundRecipientIdentityDocument,
    setRefundRecipientIdentityDocument,
    refundBankDetails,
    setRefundBankDetails,
    refundSelectedPaymentId,
    setRefundSelectedPaymentId,
    refundOriginalFiscalReceiptNumber,
    setRefundOriginalFiscalReceiptNumber,
    refundCorrectionFiscalReceiptNumber,
    setRefundCorrectionFiscalReceiptNumber,
    refundAccountantDecision,
    setRefundAccountantDecision,
    personalDataCrossBorderAllowed,
    setPersonalDataCrossBorderAllowed,
    personalDataAutomatedDecisionAllowed,
    setPersonalDataAutomatedDecisionAllowed,
    personalDataConsentGivenAt,
    setPersonalDataConsentGivenAt,
    personalDataVoluntaryConsentConfirmed,
    setPersonalDataVoluntaryConsentConfirmed,
    personalDataMedicalProcessingAcknowledged,
    setPersonalDataMedicalProcessingAcknowledged,
    refusalIntervention,
    setRefusalIntervention,
    refusalClinicalIndication,
    setRefusalClinicalIndication,
    refusalPatientReason,
    setRefusalPatientReason,
    refusalDoctorFullName,
    setRefusalDoctorFullName,
    refusalConfirmedAt,
    setRefusalConfirmedAt,
    refusalConsequencesUnderstood,
    setRefusalConsequencesUnderstood,
    refusalSecondOpinionOffered,
    setRefusalSecondOpinionOffered,
    refusalEmergencyCareExplained,
    setRefusalEmergencyCareExplained,
      paymentAmount,
    setPaymentAmount,
    paymentMethod,
    setPaymentMethod,
    paymentFiscalReceiptNumber,
    setPaymentFiscalReceiptNumber,
    paymentFiscalReceiptIssuedAt,
    setPaymentFiscalReceiptIssuedAt,
    paymentFiscalFn,
    setPaymentFiscalFn,
    paymentFiscalFd,
    setPaymentFiscalFd,
    paymentFiscalFpd,
    setPaymentFiscalFpd,
    paymentFiscalCashierName,
    setPaymentFiscalCashierName,
    paymentFiscalReceiptUrl,
    setPaymentFiscalReceiptUrl,
    paymentPayerFullName,
    setPaymentPayerFullName,
    paymentPayerInn,
    setPaymentPayerInn,
    paymentPayerBirthDate,
    setPaymentPayerBirthDate,
    paymentPayerIdentityDocument,
    setPaymentPayerIdentityDocument,
    paymentPayerRelationship,
    setPaymentPayerRelationship,
    paymentTaxDeductionCode,
    setPaymentTaxDeductionCode,
    paymentFeedback,
    setPaymentFeedback,
    documentIssueConfirmationId,
    setDocumentIssueConfirmationId,
    documentIssueSignatureMode,
    setDocumentIssueSignatureMode,
    documentIssueSignedAt,
    setDocumentIssueSignedAt,
    documentIssueRecipientFullName,
    setDocumentIssueRecipientFullName,
    documentIssueRecipientRole,
    setDocumentIssueRecipientRole,
    documentIssueStaffFullName,
    setDocumentIssueStaffFullName,
    documentIssueStaffRole,
    setDocumentIssueStaffRole,
    documentIssueNote,
    setDocumentIssueNote,
    documentIssueIdentityChecked,
    setDocumentIssueIdentityChecked,
    documentIssueDocumentOpenedAndChecked,
    setDocumentIssueDocumentOpenedAndChecked,
    documentIssueRecipientSigned,
    setDocumentIssueRecipientSigned,
    documentIssueClinicSigned,
    setDocumentIssueClinicSigned,
    documentVoidConfirmationId,
    setDocumentVoidConfirmationId,
    documentVoidReasonCode,
    setDocumentVoidReasonCode,
    documentVoidReasonText,
    setDocumentVoidReasonText,
    documentVoidStaffFullName,
    setDocumentVoidStaffFullName,
    documentVoidStaffRole,
    setDocumentVoidStaffRole,
    documentVoidCorrectionDocumentId,
    setDocumentVoidCorrectionDocumentId,
    documentVoidReplacementRequired,
    setDocumentVoidReplacementRequired,
    documentVoidPatientOrPayerNotified,
    setDocumentVoidPatientOrPayerNotified,
    documentVoidArchivePreserved,
    setDocumentVoidArchivePreserved,
    documentVoidStatusReviewed,
    setDocumentVoidStatusReviewed,
    documentAuditFacts,
    setDocumentAuditFacts,
    documentAuditFactsLoadingId,
    setDocumentAuditFactsLoadingId,
    personalDataPurposes,
    setPersonalDataPurposes,
    personalDataCategories,
    setPersonalDataCategories,
    personalDataActions,
    setPersonalDataActions,
    personalDataTransferRules,
    setPersonalDataTransferRules,
    personalDataRetentionPeriod,
    setPersonalDataRetentionPeriod,
    personalDataRevocationChannel,
    setPersonalDataRevocationChannel,
    refusalExplainedRisks,
    setRefusalExplainedRisks,
    refusalAlternatives,
    setRefusalAlternatives,
    refusalUrgentWarningSigns,
    setRefusalUrgentWarningSigns,
    documentIngestionTarget,
    setDocumentIngestionTarget,
    documentIngestion,
    setDocumentIngestion,
    taxDocumentYear,
    setTaxDocumentYear,
    selectedDocumentKind,
    setSelectedDocumentKind,
    isDocumentIngesting,
    setIsDocumentIngesting,
  } = useDocumentStore();
  const {
    uiPreferencesHydrated,
    setUiPreferencesHydrated,
    dashboard,
    setDashboard,
    accessUnlockRequired,
    setAccessUnlockRequired,
    accessUnlockMessage,
    setAccessUnlockMessage,
    uiLanguage,
    setUiLanguage,
    clinicProfileDraft,
    setClinicProfileDraft,
    clinicProfileSaveState,
    setClinicProfileSaveState,
    clinicProfileDirty,
    setClinicProfileDirty,
    currentView,
    setCurrentView,
    settingsTab,
    setSettingsTab,
    selectedWorkspaceRole,
    setSelectedWorkspaceRole,
    query,
    setQuery,
    newStaffName,
    setNewStaffName,
    newStaffRole,
    setNewStaffRole,
    newStaffSpecialty,
    setNewStaffSpecialty,
    editingAppointmentId,
    setEditingAppointmentId,
    newAppointmentError,
    setNewAppointmentError,
    newChairName,
    setNewChairName,
    newChairHasXraySensor,
    setNewChairHasXraySensor,
    newChairHasMicroscope,
    setNewChairHasMicroscope,
    newChairHasSurgeryKit,
    setNewChairHasSurgeryKit,
    newRuleTitle,
    setNewRuleTitle,
    newRuleAction,
    setNewRuleAction,
    newRuleSeverity,
    setNewRuleSeverity,
    newRuleOwnerRole,
    setNewRuleOwnerRole,
    newRuleSpecialty,
    setNewRuleSpecialty,
    newRuleCategory,
    setNewRuleCategory,
    newRuleTriggerServiceId,
    setNewRuleTriggerServiceId,
    newRuleRequiredServiceId,
    setNewRuleRequiredServiceId,
    newRuleCompletedServiceId,
    setNewRuleCompletedServiceId,
    newRuleBlockedServiceId,
    setNewRuleBlockedServiceId,
    newRuleWarningText,
    setNewRuleWarningText,
    releaseProtectionNote,
    setReleaseProtectionNote,
    communicationNote,
    setCommunicationNote,
    importText,
    setImportText,
    smartImportText,
    setSmartImportText,
    pricelistText,
    setPricelistText,
    pricelistSourceKind,
    setPricelistSourceKind,
    usePricelistAi,
    setUsePricelistAi,
    pricelistAnalysis,
    setPricelistAnalysis,
    pricelistImageBase64,
    setPricelistImageBase64,
    pricelistImageMimeType,
    setPricelistImageMimeType,
    pricelistImageName,
    setPricelistImageName,
    pricelistImageNote,
    setPricelistImageNote,
    recognitionKind,
    setRecognitionKind,
    recognitionTarget,
    setRecognitionTarget,
    recognitionText,
    setRecognitionText,
    importSourceKind,
    setImportSourceKind,
    smartImportMode,
    setSmartImportMode,
    browserMigrationDiscovery,
    setBrowserMigrationDiscovery,
    browserMigrationScanProgress,
    setBrowserMigrationScanProgress,
    importIntake,
    setImportIntake,
    importPreview,
    setImportPreview,
    importCommit,
    setImportCommit,
    migrationAutopilot,
    setMigrationAutopilot,
    migrationSourceDiscovery,
    setMigrationSourceDiscovery,
    migrationSourceWorkup,
    setMigrationSourceWorkup,
    migrationSourceProbe,
    setMigrationSourceProbe,
    clinicPublicLookup,
    setClinicPublicLookup,
    ohifBaseUrl,
    setOhifBaseUrl,
    smartImportPreview,
    setSmartImportPreview,
    smartImportCommit,
    setSmartImportCommit,
    recognitionJob,
    setRecognitionJob,
    localAutosaveReady,
    setLocalAutosaveReady,
    lastLocalSavedAt,
    setLastLocalSavedAt,
    isOnline,
    setIsOnline,
    speechGatewayStatus,
    setSpeechGatewayStatus,
    speechGatewayHealthReport,
    setSpeechGatewayHealthReport,
    speechProviderRuntimeStatuses,
    setSpeechProviderRuntimeStatuses,
    speechRecordingStrategy,
    setSpeechRecordingStrategy,
    speechRecordingRecovery,
    setSpeechRecordingRecovery,
    pendingSpeechChunkCount,
    setPendingSpeechChunkCount,
    speechStatusNote,
    setSpeechStatusNote,
    browserContinuity,
    setBrowserContinuity,
    localBridgeReadiness,
    setLocalBridgeReadiness,
    localBridgeUsePlans,
    setLocalBridgeUsePlans,
    isImportDictating,
    setIsImportDictating,
    isImportLoading,
    setIsImportLoading,
    isImportCommitting,
    setIsImportCommitting,
    isMigrationAutopilotLoading,
    setIsMigrationAutopilotLoading,
    isMigrationHandoffReportLoading,
    setIsMigrationHandoffReportLoading,
    isMigrationSourceDiscovering,
    setIsMigrationSourceDiscovering,
    isMigrationSourceWorkupLoading,
    setIsMigrationSourceWorkupLoading,
    isMigrationSourceProbeLoading,
    setIsMigrationSourceProbeLoading,
    isClinicPublicLookupLoading,
    setIsClinicPublicLookupLoading,
    isBrowserMigrationScanning,
    setIsBrowserMigrationScanning,
    isSmartImportLoading,
    setIsSmartImportLoading,
    isSmartImportCommitting,
    setIsSmartImportCommitting,
    isSmartReportLoading,
    setIsSmartReportLoading,
    isSmartSafeReportLoading,
    setIsSmartSafeReportLoading,
    isRecognitionLoading,
    setIsRecognitionLoading,
    isPricelistAnalyzing,
    setIsPricelistAnalyzing,
    isServerVoiceRecording,
    setIsServerVoiceRecording,
    isPaymentSaving,
    setIsPaymentSaving,
    communicationSavingTaskId,
    setCommunicationSavingTaskId,
    isClinicalRuleSaving,
    setIsClinicalRuleSaving,
    persistenceHealth,
    setPersistenceHealth,
    persistenceIntegrity,
    setPersistenceIntegrity,
    isPersistenceExporting,
    setIsPersistenceExporting,
    isTelegramLoading,
    setIsTelegramLoading,
    isTelegramLinkCreating,
    setIsTelegramLinkCreating,
    isTelegramSettingsSaving,
    setIsTelegramSettingsSaving,
    isTelegramSendingDue,
    setIsTelegramSendingDue,
    isTelegramOutboxLoadingMore,
    setIsTelegramOutboxLoadingMore,
    isTelegramLinkCodesLoadingMore,
    setIsTelegramLinkCodesLoadingMore,
    isTelegramChatLinksLoadingMore,
    setIsTelegramChatLinksLoadingMore,
    error,
    setError,
    uiPreferencesSyncError,
    setUiPreferencesSyncError
  } = useAppStore();
  const {
    onboardingDismissed,
    setOnboardingDismissed,
    onboardingDismissedAt,
    setOnboardingDismissedAt,
    onboardingStep,
    setOnboardingStep,
    onboardingDraftMode,
    setOnboardingDraftMode,
    onboardingGuideExpanded,
    setOnboardingGuideExpanded,
    telegramHandoffNotice,
    setTelegramHandoffNotice,
    telegramStatus,
    setTelegramStatus,
    telegramFeaturePlan,
    setTelegramFeaturePlan,
    telegramOutbox,
    setTelegramOutbox,
    telegramOutboxStatusFilter,
    setTelegramOutboxStatusFilter,
    telegramOutboxTemplateFilter,
    setTelegramOutboxTemplateFilter,
    telegramLinkCodes,
    setTelegramLinkCodes,
    telegramChatLinks,
    setTelegramChatLinks,
    telegramLinkCodeLedger,
    setTelegramLinkCodeLedger,
    telegramChatLinkLedger,
    setTelegramChatLinkLedger,
    telegramLinkSubjectType,
    setTelegramLinkSubjectType,
    telegramLinkStaffId,
    setTelegramLinkStaffId,
    telegramLinkCode,
    setTelegramLinkCode,
    telegramLinkActionState,
    setTelegramLinkActionState,
    telegramPreview,
    setTelegramPreview,
    telegramModeDraft,
    setTelegramModeDraft,
    telegramBotUsernameDraft,
    setTelegramBotUsernameDraft,
    telegramOwnBotUsernameDraft,
    setTelegramOwnBotUsernameDraft,
    telegramBotConfigId,
    setTelegramBotConfigId,
    telegramWebhookBaseUrlDraft,
    setTelegramWebhookBaseUrlDraft,
    telegramPatientPortalBaseUrlDraft,
    setTelegramPatientPortalBaseUrlDraft,
    telegramWelcomeImageUrlDraft,
    setTelegramWelcomeImageUrlDraft,
    telegramVisualCardUrlDrafts,
    setTelegramVisualCardUrlDrafts,
    telegramReviewUrlDraft,
    setTelegramReviewUrlDraft,
    telegramMapsUrlDraft,
    setTelegramMapsUrlDraft,
    telegramEnabledFeaturesDraft,
    setTelegramEnabledFeaturesDraft,
    telegramTokenTtlDraft,
    setTelegramTokenTtlDraft,
    telegramReminderLeadTimesDraft,
    setTelegramReminderLeadTimesDraft,
    telegramReviewRequestDelayDraft,
    setTelegramReviewRequestDelayDraft,
    telegramPostVisitCheckupDelayDrafts,
    setTelegramPostVisitCheckupDelayDrafts,
    telegramAllowVoiceIntakeDraft,
    setTelegramAllowVoiceIntakeDraft,
    telegramStaffEscalationChannelDraft,
    setTelegramStaffEscalationChannelDraft,
    telegramPrivacyModeDraft,
    setTelegramPrivacyModeDraft,
    telegramSettingsDirty,
    setTelegramSettingsDirty,
    telegramSettingsSaveState,
    setTelegramSettingsSaveState,
    telegramSettingsSaveError,
    setTelegramSettingsSaveError,
    clinicalAdminSecretDraft,
    setClinicalAdminSecretDraft,
    settingsAdminSecretDraft,
    setSettingsAdminSecretDraft,
    scheduleAdminSecretDraft,
    setScheduleAdminSecretDraft,
    telegramAdminSecretDraft,
    setTelegramAdminSecretDraft,
    clinicalAdminSecretSession,
    setClinicalAdminSecretSession,
    settingsAdminSecretSession,
    setSettingsAdminSecretSession,
    scheduleAdminSecretSession,
    setScheduleAdminSecretSession,
    telegramAdminSecretSession,
    setTelegramAdminSecretSession,
    telegramSendingItemId,
    setTelegramSendingItemId,
    telegramRevokingLinkId,
    setTelegramRevokingLinkId
  } = useSettingsStore();


  const activeSettingsTabButtonRef = useRef<HTMLButtonElement | null>(null);
  const initialTelegramHandoffTargetRef = useRef<DenteTelegramHandoffTarget | null>(readDenteTelegramHandoffTarget());
  const initialUiPreferencesRef = useRef<UiPreferences | null>(null);
  const uiPreferencesServerReadyRef = useRef(false);
  const uiPreferencesHydratedRef = useRef(false);
  const pendingUiPreferencesSyncRef = useRef<UiPreferences | null>(null);
  const uiPreferencesSyncInFlightRef = useRef(false);
  const uiPreferencesRetryTimerRef = useRef<number | null>(null);
  const newAppointmentDraftUserEditedRef = useRef(false);
  const clinicProfileDraftHydratedRef = useRef(false);
  const clinicProfileDraftRef = useRef<ClinicProfileDraft>(emptyClinicProfileDraft());
  const patientCoreDraftRef = useRef<PatientCoreDraft>(emptyPatientCoreDraft());
  const releaseSourceRequestAutofillRef = useRef<string | null>(null);
  const taxPaymentSelectionHydratedKeyRef = useRef<string | null>(null);
  const paymentReceiptSelectionHydratedKeyRef = useRef<string | null>(null);
  const outpatient025uDraftHydratedKeyRef = useRef<string | null>(null);
  const medicalRecordExtractDraftHydratedKeyRef = useRef<string | null>(null);
  const initialDocumentIssueSignatureDraftRef = useRef<DocumentIssueSignatureDraft | null>(null);
  const documentIssueSignatureHydratedOrganizationIdRef = useRef<string | null>(null);
  const onboardingDismissalHydratedOrganizationIdRef = useRef<string | null>(null);
  const localImagingRecoveryHydratedOrganizationIdRef = useRef<string | null>(null);
  if (initialUiPreferencesRef.current === null) {
    initialUiPreferencesRef.current = loadUiPreferences();
  }
  if (initialDocumentIssueSignatureDraftRef.current === null) {
    initialDocumentIssueSignatureDraftRef.current = loadDocumentIssueSignatureDraft();
  }
  const initialUiPreferences = initialUiPreferencesRef.current ?? defaultUiPreferences;
  const initialDocumentIssueSignatureDraft = initialDocumentIssueSignatureDraftRef.current ?? loadDocumentIssueSignatureDraft();
  const initialTelegramHandoffTarget = initialTelegramHandoffTargetRef.current;
  const initialRecognitionText =
    recognitionPresets.find(
      (preset) => preset.kind === initialUiPreferences.recognitionKind && preset.target === initialUiPreferences.recognitionTarget
    )?.text ??
    recognitionPresets[0]?.text ??
    "";
  const [imagingPreviewObjectUrls, setImagingPreviewObjectUrls] = useState<Record<string, string>>({});
  const activeOrganizationId = dashboard?.clinicSettings.profile?.organizationId ?? null;
  const [polishingField, setPolishingField] = useState<string | null>(null);








  
  
  
  
  
  const [dicomFirstFramePreviewRequest, setDicomFirstFramePreviewRequest] =
    useState<DicomFirstFramePreviewRequestContext | null>(null);
  const browserDirectoryInputRef = useRef<HTMLInputElement | null>(null);
  const browserMigrationInputRef = useRef<HTMLInputElement | null>(null);
  const browserImagingScanAbortRef = useRef<AbortController | null>(null);
  const browserMigrationScanAbortRef = useRef<AbortController | null>(null);
  const localDicomOperationAbortRef = useRef<AbortController | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const serverVoiceRecordingShouldContinueRef = useRef(false);
  const serverVoiceRecordingStopRequestedRef = useRef(false);
  const serverVoiceRecordingRestartTimerRef = useRef<any>(null);
  const serverVoiceRecordingStartingRef = useRef(false);
  const speechActiveGatewayStatusRef = useRef<any>(null);
  const [isServerVoiceRecordingStarting, setIsServerVoiceRecordingStarting] = useState(false);
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
  const patientAdministrativeProfileDraftRef = useRef<PatientAdministrativeProfileDraft>(emptyPatientAdministrativeProfileDraft());
  const staffScheduleDraftsRef = useRef<Record<string, StaffScheduleDraft>>({});
  const chairScheduleDraftsRef = useRef<Record<string, StaffScheduleDraft>>({});
  const appointmentScheduleDraftsRef = useRef<Record<string, AppointmentScheduleDraft>>({});
  const imagingViewerSaveTimerRef = useRef<number | null>(null);
  const mprWorkbenchSaveTimerRef = useRef<number | null>(null);

  function markTelegramSettingsDirty() {
    setTelegramSettingsDirty(true);
    setTelegramSettingsSaveState("idle");
    setTelegramSettingsSaveError(null);
  }

  function updateTelegramVisualCardUrlDraft(key: DenteTelegramVisualCardKey, value: string) {
    setTelegramVisualCardUrlDrafts((current) => ({
      ...current,
      [key]: value.trim() ? value : null
    }));
    markTelegramSettingsDirty();
  }

  function toggleTelegramFeature(feature: DenteTelegramFeature) {
    setTelegramEnabledFeaturesDraft((current) =>
      current.includes(feature) ? current.filter((item) => item !== feature) : [...current, feature]
    );
    if (feature === "voice_note_intake" && !telegramEnabledFeaturesDraft.includes(feature)) {
      setTelegramAllowVoiceIntakeDraft(true);
    }
    markTelegramSettingsDirty();
  }

  function parseTelegramLinkTtlMinutes() {
    const parsed = Number.parseInt(telegramTokenTtlDraft, 10);
    if (!Number.isFinite(parsed)) return 15;
    return Math.min(1440, Math.max(5, parsed));
  }

  function parseTelegramReminderLeadTimesHours(): number[] {
    const values = telegramReminderLeadTimesDraft
      .split(/[,\s;]+/)
      .map((item) => Number.parseInt(item, 10))
      .filter((item) => Number.isFinite(item) && item >= 1 && item <= 168);
    const unique = [...new Set(values)].sort((left, right) => right - left).slice(0, 6);
    return unique.length ? unique : [24];
  }

  function parseTelegramReviewRequestDelayHours(): number {
    const parsed = Number.parseInt(telegramReviewRequestDelayDraft, 10);
    if (!Number.isFinite(parsed)) return 2;
    return Math.min(720, Math.max(1, parsed));
  }

  function parseTelegramPostVisitCheckupDelayHours(): DenteTelegramPostVisitCheckupDelayHoursByTopic {
    const values = { ...defaultTelegramPostVisitCheckupDelayHoursByTopic };
    for (const field of telegramPostVisitCheckupDelayFields) {
      const parsed = Number.parseInt(telegramPostVisitCheckupDelayDrafts[field.key], 10);
      values[field.key] = Number.isFinite(parsed) ? Math.max(1, Math.min(720, parsed)) : defaultTelegramPostVisitCheckupDelayHoursByTopic[field.key];
    }
    return values;
  }

  function normalizeTelegramPostVisitCheckupDelayDrafts(values: DenteTelegramPostVisitCheckupDelayHoursByTopic): TelegramPostVisitCheckupDelayDrafts {
    const normalized = { ...defaultTelegramPostVisitCheckupDelayDrafts };
    for (const field of telegramPostVisitCheckupDelayFields) {
      normalized[field.key] = String(values[field.key] ?? defaultTelegramPostVisitCheckupDelayDrafts[field.key]);
    }
    return normalized;
  }

  function updateTelegramPostVisitCheckupDelayDraft(key: TelegramPostVisitCheckupDelayKey, value: string) {
    setTelegramPostVisitCheckupDelayDrafts((current) => ({
      ...current,
      [key]: value
    }));
    markTelegramSettingsDirty();
  }

  function telegramFeatureLabel(value: DenteTelegramFeature | string) {
    return telegramFeatureLabels[value as DenteTelegramFeature] ?? telegramHumanMessage(value);
  }

  function rememberAdminSecret(secret: string, domain: AdminSecretUnlockDomain) {
    const normalized = secret.trim();
    if (!normalized) return;
    if (domain === "all" || domain === "clinical") setClinicalAdminSecretSession(normalized);
    if (domain === "all" || domain === "settings") setSettingsAdminSecretSession(normalized);
    if (domain === "all" || domain === "schedule") setScheduleAdminSecretSession(normalized);
    if (domain === "all" || domain === "telegram") setTelegramAdminSecretSession(normalized);
  }

  function forgetAdminSecret(domain: AdminSecretUnlockDomain) {
    if (domain === "all" || domain === "clinical") setClinicalAdminSecretSession("");
    if (domain === "all" || domain === "settings") setSettingsAdminSecretSession("");
    if (domain === "all" || domain === "schedule") setScheduleAdminSecretSession("");
    if (domain === "all" || domain === "telegram") setTelegramAdminSecretSession("");
  }

  function currentAdminSecretUnlockDomain(): AdminSecretUnlockDomain {
    if (accessUnlockRequired || !dashboard) return "all";
    if (currentView === "schedule") return "schedule";
    if (currentView === "settings") return settingsTab === "telegram" ? "telegram" : "settings";
    if (onboardingStep === "telegram") return "telegram";
    return "clinical";
  }

  function resolvedAdminSecretUnlockDomain(domainOverride?: AdminSecretUnlockDomain): AdminSecretUnlockDomain {
    return domainOverride ?? currentAdminSecretUnlockDomain();
  }

  function adminSecretDraftForDomain(domain: AdminSecretUnlockDomain): string {
    if (domain === "settings") return settingsAdminSecretDraft;
    if (domain === "schedule") return scheduleAdminSecretDraft;
    if (domain === "telegram") return telegramAdminSecretDraft;
    return clinicalAdminSecretDraft;
  }

  function clearAdminSecretDraft(domain: AdminSecretUnlockDomain) {
    if (domain === "all" || domain === "clinical") setClinicalAdminSecretDraft("");
    if (domain === "all" || domain === "settings") setSettingsAdminSecretDraft("");
    if (domain === "all" || domain === "schedule") setScheduleAdminSecretDraft("");
    if (domain === "all" || domain === "telegram") setTelegramAdminSecretDraft("");
  }

  function telegramControlPlaneHeaders(extra: Record<string, string> = {}, adminSecretOverride?: string): Record<string, string> {
    return denteAdminSecretRequestHeaders(extra, adminSecretOverride ?? telegramAdminSecretSession);
  }

  function settingsAccessHeaders(extra: Record<string, string> = {}, adminSecretOverride?: string): Record<string, string> {
    return denteAdminSecretRequestHeaders(extra, adminSecretOverride ?? settingsAdminSecretSession);
  }

  function scheduleMutationHeaders(extra: Record<string, string> = {}, adminSecretOverride?: string): Record<string, string> {
    return denteAdminSecretRequestHeaders(extra, adminSecretOverride ?? scheduleAdminSecretSession);
  }

  function denteClinicalMutationHeaders(extra: Record<string, string> = {}, adminSecretOverride?: string): Record<string, string> {
    return denteAdminSecretRequestHeaders(extra, adminSecretOverride ?? clinicalAdminSecretSession);
  }

  function denteClinicalReadHeaders(extra: Record<string, string> = {}, adminSecretOverride?: string): Record<string, string> {
    return denteAdminSecretRequestHeaders(extra, adminSecretOverride ?? clinicalAdminSecretSession);
  }

  function revokeObjectUrlIfNeeded(url: string): void {
    if (url.startsWith("blob:")) URL.revokeObjectURL(url);
  }

  function revokeObjectUrlMap(urls: Record<string, string>): void {
    Object.values(urls).forEach(revokeObjectUrlIfNeeded);
  }

  function unlockTelegramAdminSession(domainOverride?: AdminSecretUnlockDomain) {
    const domain = resolvedAdminSecretUnlockDomain(domainOverride);
    const secret = adminSecretDraftForDomain(domain).trim();
    if (!secret) {
      setError("Введите секрет администратора клиники, если он включен в серверных настройках клиники.");
      return;
    }
    rememberAdminSecret(secret, domain);
    clearAdminSecretDraft(domain);
    setError(null);
    if (domain === "settings" || domain === "schedule") return;
    if (domain === "telegram") {
      void loadTelegramControlPlane({ adminSecret: secret });
      return;
    }
    setAccessUnlockRequired(false);
    setAccessUnlockMessage("");
    void loadDashboard({ adminSecret: secret })
      .then(() => {
        if (domain === "all") void loadTelegramControlPlane({ adminSecret: secret, silent: true });
      })
      .catch((loadError: unknown) => {
        forgetAdminSecret(domain);
        setError(operatorWorkflowFailureMessage("Не удалось загрузить данные клиники", loadError));
      });
  }

  function lockTelegramAdminSession(domainOverride?: AdminSecretUnlockDomain) {
    const domain = resolvedAdminSecretUnlockDomain(domainOverride);
    forgetAdminSecret(domain);
    clearAdminSecretDraft(domain);
    if (domain === "settings" || domain === "schedule" || domain === "telegram") return;
    setDashboard(null);
    void loadDashboard().catch((loadError: unknown) => {
      setError(operatorWorkflowFailureMessage("Не удалось загрузить данные клиники", loadError));
    });
  }

  async function loadDashboard(options: { adminSecret?: string } = {}) {
    try {
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
      
      // Save local cache for offline usage
      try {
        window.localStorage.setItem("dente:offline-dashboard-cache", JSON.stringify(payload));
      } catch (cacheError) {
        console.warn("Не удалось сохранить кэш смены для оффлайна:", cacheError);
      }

      void loadPersistenceHealth({ silent: true, adminSecret: options.adminSecret });
      void refreshSpeechRuntime({ silent: true });
    } catch (networkError) {
      // Offline fallback
      const cached = window.localStorage.getItem("dente:offline-dashboard-cache");
      if (cached) {
        try {
          const payload = JSON.parse(cached);
          setDashboard(dashboardSchema.parse(payload));
          setIsOnline(false);
          setAccessUnlockRequired(false);
          setAccessUnlockMessage("");
          console.warn("Работа в оффлайн-режиме: данные загружены из локального кэша.");
          return;
        } catch (parseError) {
          console.error("Не удалось прочитать кэшированные данные оффлайн-режима:", parseError);
        }
      }
      throw networkError;
    }
  }

  function updateClinicProfileDraft<K extends keyof ClinicProfileDraft>(key: K, value: ClinicProfileDraft[K]) {
    setClinicProfileDraft((current) => ({ ...current, [key]: value }));
    setClinicProfileDirty(true);
    setClinicProfileSaveState("idle");
  }

  function updatePatientCoreDraft<K extends keyof PatientCoreDraft>(key: K, value: PatientCoreDraft[K]) {
    setPatientCoreDraft((current: any) => ({ ...current, [key]: value }));
    setPatientCoreDirty(true);
    setPatientCoreSaveState("idle");
  }

  function updatePatientAdministrativeProfileDraft<K extends keyof PatientAdministrativeProfileDraft>(
    key: K,
    value: PatientAdministrativeProfileDraft[K]
  ) {
    setPatientAdministrativeProfileDraft((current: any) => ({ ...current, [key]: value }));
    setPatientAdministrativeProfileDirty(true);
    setPatientAdministrativeProfileSaveState("idle");
  }

  function toggleClinicWorkingDay(day: number) {
    setClinicProfileDraft((current) => {
      const nextDays = current.workingDays.includes(day)
        ? current.workingDays.filter((item) => item !== day)
        : [...current.workingDays, day];
      return { ...current, workingDays: normalizeWorkingDaysDraft(nextDays) };
    });
    setClinicProfileDirty(true);
    setClinicProfileSaveState("idle");
  }

  function markStaffScheduleDirty(staffId: string) {
    setStaffScheduleDirtyIds((current) => {
      const next = new Set(current);
      next.add(staffId);
      return next;
    });
    setStaffScheduleSaveStates((current: any) => ({ ...current, [staffId]: "idle" }));
  }

  function markChairScheduleDirty(chairId: string) {
    setChairScheduleDirtyIds((current) => {
      const next = new Set(current);
      next.add(chairId);
      return next;
    });
    setChairScheduleSaveStates((current) => ({ ...current, [chairId]: "idle" }));
  }

  function updateStaffScheduleDraft(staffId: string, patch: Partial<StaffScheduleDraft>) {
    setStaffScheduleDrafts((current: any) => {
      const base = current[staffId] ?? defaultStaffScheduleDraft();
      const nextWorkingDays = normalizeWorkingDaysDraft(patch.workingDays ?? base.workingDays);
      const nextStart = patch.start ?? base.start;
      const nextEnd = patch.end ?? base.end;
      const perDay = base.perDay.map((day: any) => ({
        ...day,
        enabled: nextWorkingDays.includes(day.weekday),
        start: patch.start && nextWorkingDays.includes(day.weekday) ? nextStart : day.start,
        end: patch.end && nextWorkingDays.includes(day.weekday) ? nextEnd : day.end
      }));
      return {
        ...current,
        [staffId]: {
          ...base,
          ...patch,
          start: nextStart,
          end: nextEnd,
          workingDays: nextWorkingDays,
          perDay
        }
      };
    });
    markStaffScheduleDirty(staffId);
  }

  function updateChairScheduleDraft(chairId: string, patch: Partial<StaffScheduleDraft>) {
    setChairScheduleDrafts((current: any) => {
      const base = current[chairId] ?? defaultStaffScheduleDraft();
      const nextWorkingDays = normalizeWorkingDaysDraft(patch.workingDays ?? base.workingDays);
      const nextStart = patch.start ?? base.start;
      const nextEnd = patch.end ?? base.end;
      const perDay = base.perDay.map((day: any) => ({
        ...day,
        enabled: nextWorkingDays.includes(day.weekday),
        start: patch.start && nextWorkingDays.includes(day.weekday) ? nextStart : day.start,
        end: patch.end && nextWorkingDays.includes(day.weekday) ? nextEnd : day.end
      }));
      return {
        ...current,
        [chairId]: {
          ...base,
          ...patch,
          start: nextStart,
          end: nextEnd,
          workingDays: nextWorkingDays,
          perDay
        }
      };
    });
    markChairScheduleDirty(chairId);
  }

  function toggleStaffWorkingDay(staffId: string, day: number) {
    const currentDraft = staffScheduleDrafts[staffId] ?? defaultStaffScheduleDraft();
    const workingDays = currentDraft.workingDays.includes(day)
      ? currentDraft.workingDays.filter((item) => item !== day)
      : [...currentDraft.workingDays, day];
    updateStaffScheduleDraft(staffId, { workingDays: normalizeWorkingDaysDraft(workingDays) });
  }

  function toggleChairWorkingDay(chairId: string, day: number) {
    const currentDraft = chairScheduleDrafts[chairId] ?? defaultStaffScheduleDraft();
    const workingDays = currentDraft.workingDays.includes(day)
      ? currentDraft.workingDays.filter((item) => item !== day)
      : [...currentDraft.workingDays, day];
    updateChairScheduleDraft(chairId, { workingDays: normalizeWorkingDaysDraft(workingDays) });
  }

  function updateStaffScheduleDay(staffId: string, weekday: number, patch: Partial<Pick<StaffWorkingHours[number], "start" | "end">>) {
    setStaffScheduleDrafts((current: any) => {
      const base = current[staffId] ?? defaultStaffScheduleDraft();
      return {
        ...current,
        [staffId]: {
          ...base,
          perDay: base.perDay.map((day: any) => (day.weekday === weekday ? { ...day, ...patch } : day))
        }
      };
    });
    markStaffScheduleDirty(staffId);
  }

  function updateChairScheduleDay(chairId: string, weekday: number, patch: Partial<Pick<StaffWorkingHours[number], "start" | "end">>) {
    setChairScheduleDrafts((current: any) => {
      const base = current[chairId] ?? defaultStaffScheduleDraft();
      return {
        ...current,
        [chairId]: {
          ...base,
          perDay: base.perDay.map((day: any) => (day.weekday === weekday ? { ...day, ...patch } : day))
        }
      };
    });
    markChairScheduleDirty(chairId);
  }

  function openAppointmentEditor(appointment: Appointment) {
    setEditingAppointmentId(appointment.id);
    setAppointmentScheduleDrafts((current: any) => ({
      ...current,
      [appointment.id]: current[appointment.id] ?? appointmentScheduleDraftFromAppointment(appointment)
    }));
    setAppointmentScheduleSaveStates((current: any) => ({ ...current, [appointment.id]: "idle" }));
    setAppointmentScheduleErrors((current) => ({ ...current, [appointment.id]: null }));
  }

  function markAppointmentScheduleDirty(appointmentId: string) {
    setAppointmentScheduleDirtyIds((current) => {
      const next = new Set(current);
      next.add(appointmentId);
      return next;
    });
    setAppointmentScheduleSaveStates((current: any) => ({ ...current, [appointmentId]: "idle" }));
    setAppointmentScheduleErrors((current) => ({ ...current, [appointmentId]: null }));
  }

  function updateAppointmentScheduleDraft<K extends keyof AppointmentScheduleDraft>(
    appointmentId: string,
    key: K,
    value: AppointmentScheduleDraft[K]
  ) {
    const sourceAppointment = dashboard?.appointments.find((appointment) => appointment.id === appointmentId);
    setAppointmentScheduleDrafts((current: any) => ({
      ...current,
      [appointmentId]: {
        ...(current[appointmentId] ?? (sourceAppointment ? appointmentScheduleDraftFromAppointment(sourceAppointment) : {})),
        [key]: value
      } as AppointmentScheduleDraft
    }));
    markAppointmentScheduleDirty(appointmentId);
  }

  function newAppointmentPreferenceDefaults() {
    return {
      selectedPatientId,
      selectedSpecialty,
      scheduleDefaultDoctorUserId,
      scheduleDefaultAssistantUserId,
      scheduleDefaultChairId
    };
  }

  function reconcileDashboardScopedUiSelections() {
    if (!dashboard) return;
    const activePatientIds = new Set(dashboard.patients.filter((patient) => patient.status === "active").map((patient) => patient.id));
    const firstActivePatientId = dashboard.patients.find((patient) => patient.status === "active")?.id ?? null;
    const doctorIds = new Set(
      dashboard?.clinicSettings.staff
        .filter((member) => member.active && (member.role === "doctor" || member.role === "owner"))
        .map((member) => member.id)
    );
    const assistantIds = new Set(
      dashboard?.clinicSettings.staff.filter((member) => member.active && member.role === "assistant").map((member) => member.id)
    );
    const staffIds = new Set(dashboard?.clinicSettings.staff.filter((member) => member.active).map((member) => member.id));
    const chairIds = new Set(dashboard?.clinicSettings.chairs.filter((chair) => chair.active).map((chair) => chair.id));
    const protocolIds = new Set(dashboard.protocolTemplates.map((template) => template.id));

    if (selectedPatientId && !activePatientIds.has(selectedPatientId)) setSelectedPatientId(firstActivePatientId);
    if (selectedProtocolId && !protocolIds.has(selectedProtocolId)) setSelectedProtocolId(null);
    if (scheduleDoctorFilterId && !doctorIds.has(scheduleDoctorFilterId)) setScheduleDoctorFilterId(null);
    if (scheduleAssistantFilterId && !assistantIds.has(scheduleAssistantFilterId)) setScheduleAssistantFilterId(null);
    if (scheduleChairFilterId && !chairIds.has(scheduleChairFilterId)) setScheduleChairFilterId(null);
    if (scheduleDefaultDoctorUserId && !doctorIds.has(scheduleDefaultDoctorUserId)) setScheduleDefaultDoctorUserId(null);
    if (scheduleDefaultAssistantUserId && !assistantIds.has(scheduleDefaultAssistantUserId)) setScheduleDefaultAssistantUserId(null);
    if (scheduleDefaultChairId && !chairIds.has(scheduleDefaultChairId)) setScheduleDefaultChairId(null);
    if (telegramLinkStaffId && !staffIds.has(telegramLinkStaffId)) setTelegramLinkStaffId("");
  }

  function updateNewAppointmentDraft<K extends keyof AppointmentScheduleDraft>(key: K, value: AppointmentScheduleDraft[K]) {
    newAppointmentDraftUserEditedRef.current = true;
    setNewAppointmentDraft((current) => ({ ...current, [key]: value }));
    if (key === "patientId" && typeof value === "string") setSelectedPatientId(value || null);
    if (key === "doctorUserId" && typeof value === "string") setScheduleDefaultDoctorUserId(value || null);
    if (key === "assistantUserId" && typeof value === "string") setScheduleDefaultAssistantUserId(value || null);
    if (key === "chairId" && typeof value === "string") setScheduleDefaultChairId(value || null);
    setNewAppointmentSaveState("idle");
    setNewAppointmentError(null);
  }

  function resetNewAppointmentDraft() {
    if (!dashboard) return;
    newAppointmentDraftUserEditedRef.current = false;
    setNewAppointmentDraft(newAppointmentDraftFromDashboard(dashboard, newAppointmentPreferenceDefaults()));
    setNewAppointmentSaveState("idle");
    setNewAppointmentError(null);
  }

  function closeAppointmentEditor(appointmentId: string) {
    setEditingAppointmentId((current) => (current === appointmentId ? null : current));
    setAppointmentScheduleSaveStates((current: any) => ({ ...current, [appointmentId]: "idle" }));
    setAppointmentScheduleErrors((current) => ({ ...current, [appointmentId]: null }));
  }

  async function saveClinicProfileFromDraft(): Promise<boolean> {
    const payload = buildClinicProfileUpdatePayload(clinicProfileDraft);
    const expectedSignature = clinicProfileDraftSignature(clinicProfileDraft);
    if (!payload.clinicName?.trim()) {
      setError("Укажите рабочее название клиники.");
      setClinicProfileSaveState("error");
      return false;
    }
    setClinicProfileSaveState("saving");
    try {
      const response = await fetch(clinicProfileEndpoint, {
        method: "PUT",
        headers: settingsAccessHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Профиль клиники не сохранен"));
      const clinicSettings = (await response.json()) as Dashboard["clinicSettings"];
      setDashboard((current) =>
        current
          ? {
              ...current,
              clinicName: clinicSettings.profile.clinicName,
              clinicSettings
            }
          : current
      );
      const latestMatchesSaved = clinicProfileDraftSignature(clinicProfileDraftRef.current) === expectedSignature;
      if (latestMatchesSaved) {
        setClinicProfileDraft(clinicProfileDraftFromProfile(clinicSettings.profile));
        setClinicProfileDirty(false);
      }
      setClinicProfileSaveState(latestMatchesSaved ? "saved" : "idle");
      setError(null);
      return true;
    } catch (saveError) {
      const message = operatorWorkflowFailureMessage("Профиль клиники не сохранен", saveError);
      setClinicProfileSaveState("error");
      setError(message);
      return false;
    }
  }

  async function saveClinicProfileIfDirty(): Promise<boolean> {
    if (!clinicProfileDirty) return true;
    return saveClinicProfileFromDraft();
  }

  async function savePatientCore(): Promise<boolean> {
    if (patientCoreSaveState === "saving") {
      setError("Дождитесь завершения сохранения карточки пациента.");
      return false;
    }
    if (!selectedPatient) {
      setError("Выберите пациента перед сохранением карточки.");
      return false;
    }
    if (!patientCoreDirty) return true;
    const payload = buildPatientCorePayload(patientCoreDraft);
    const expectedSignature = patientCoreDraftSignature(patientCoreDraft);
    if (!payload.fullName?.trim()) {
      setPatientCoreSaveState("error");
      setError("ФИО пациента обязательно для расписания, документов и связи.");
      return false;
    }
    setPatientCoreSaveState("saving");
    try {
      const response = await fetch(`/api/patients/${selectedPatient.id}`, {
        method: "PUT",
        headers: denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Карточка пациента не сохранена"));
      const savedPatient = (await response.json()) as Patient;
      setDashboard((current) =>
        current
          ? {
              ...current,
              patients: current.patients.map((patient) => (patient.id === savedPatient.id ? savedPatient : patient))
            }
          : current
      );
      setSelectedPatientId(savedPatient.id);
      const latestMatchesSaved = patientCoreDraftSignature(patientCoreDraftRef.current) === expectedSignature;
      if (latestMatchesSaved) {
        setPatientCoreDraft(patientCoreDraftFromPatient(savedPatient));
        setPatientCoreDirty(false);
      }
      setPatientCoreSaveState(latestMatchesSaved ? "saved" : "idle");
      setError(null);
      return true;
    } catch (saveError) {
      setPatientCoreSaveState("error");
      setError(operatorWorkflowFailureMessage("Карточка пациента не сохранена", saveError));
      return false;
    }
  }

  async function savePatientAdministrativeProfile() {
    if (patientAdministrativeProfileSaveState === "saving") {
      setError("Дождитесь завершения сохранения реквизитов пациента.");
      return false;
    }
    if (!selectedPatient) {
      setError("Выберите пациента перед сохранением реквизитов.");
      return false;
    }
    if (!patientAdministrativeProfileDirty) return true;
    if (patientAdministrativeProfileValidationMessage) {
      setPatientAdministrativeProfileSaveState("error");
      setError(patientAdministrativeProfileValidationMessage);
      return false;
    }
    const expectedSignature = patientAdministrativeProfileDraftSignature(patientAdministrativeProfileDraft);
    setPatientAdministrativeProfileSaveState("saving");
    try {
      const response = await fetch(`/api/patients/${selectedPatient.id}/administrative-profile`, {
        method: "PUT",
        headers: denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(buildPatientAdministrativeProfilePayload(patientAdministrativeProfileDraft))
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Данные пациента не сохранены"));
      const savedPatient = (await response.json()) as Patient;
      setDashboard((current) =>
        current
          ? {
              ...current,
              patients: current.patients.map((patient) => (patient.id === savedPatient.id ? savedPatient : patient))
            }
          : current
      );
      const latestDraft = patientAdministrativeProfileDraftRef.current;
      const latestMatchesSaved = patientAdministrativeProfileDraftSignature(latestDraft) === expectedSignature;
      if (latestMatchesSaved) {
        setPatientAdministrativeProfileDraft(patientAdministrativeProfileDraftFromPatient(savedPatient));
        setPatientAdministrativeProfileDirty(false);
      }
      setPatientAdministrativeProfileSaveState(latestMatchesSaved ? "saved" : "idle");
      setError(null);
      return true;
    } catch (saveError) {
      setPatientAdministrativeProfileSaveState("error");
      setError(operatorWorkflowFailureMessage("Данные пациента не сохранены", saveError));
      return false;
    }
  }

  function buildOnboardingFirstAppointmentIssues(): string[] {
    if (!clinicProfileDraft) return [];
    const issues: string[] = [];
    const requiredClinicDraftFields: Array<[string, string]> = [
      ["название клиники", clinicProfileDraft.clinicName],
      ["телефон клиники", clinicProfileDraft.phone],
      ["часовой пояс", clinicProfileDraft.timezone]
    ];
    for (const [label, value] of requiredClinicDraftFields) {
      if (!value?.trim()) issues.push(label);
    }
    const activeStaff = dashboard?.clinicSettings.staff.filter((member) => member.active) ?? [];
    const activeDoctors = activeStaff.filter((member) => member.role === "doctor" || member.role === "owner");
    const activeAssistants = activeStaff.filter((member) => member.role === "assistant");
    const activeChairs = dashboard?.clinicSettings.chairs.filter((chair) => chair.active) ?? [];
    
    const hasDoctor = activeDoctors.length > 0 || (!onboardingDismissed && newStaffName.trim().length > 0 && (selectedWorkspaceRole === "doctor" || selectedWorkspaceRole === "owner"));
    const hasSigningDoctor = activeDoctors.some((member) => member.canSignMedicalRecords) || (!onboardingDismissed && newStaffName.trim().length > 0 && (selectedWorkspaceRole === "doctor" || selectedWorkspaceRole === "owner"));
    const hasChair = activeChairs.length > 0 || (!onboardingDismissed && newChairName.trim().length > 0 && (selectedWorkspaceRole === "doctor" || selectedWorkspaceRole === "assistant"));

    if ((selectedWorkspaceRole === "doctor" || selectedWorkspaceRole === "owner") && !hasDoctor) {
      issues.push("врач для первого приема");
    }
    if ((selectedWorkspaceRole === "doctor" || selectedWorkspaceRole === "owner") && !hasSigningDoctor) {
      issues.push("врач с правом подписи ЭМК");
    }
    if ((selectedWorkspaceRole === "doctor" || selectedWorkspaceRole === "assistant") && !hasChair) {
      issues.push("кресло / кабинет");
    }
    if (dashboard?.clinicSettings.profile?.mode !== "solo_doctor" && !activeAssistants.length && onboardingDismissed) {
      issues.push("ассистент");
    }
    const activeAppointmentReadiness = dashboard?.activeVisit.appointmentId
      ? dashboard.appointmentReadiness.find((readiness) => readiness.appointmentId === dashboard.activeVisit.appointmentId)
      : null;
    const activeAppointmentBlockingChecks =
      activeAppointmentReadiness?.checks.filter(
        (check) => (check.key === "team" || check.key === "schedule") && !check.ready
      ) ?? [];
    for (const check of activeAppointmentBlockingChecks) {
      issues.push(`${check.title.toLocaleLowerCase("ru-RU")}: ${check.detail}`);
    }
    return issues;
  }

  function buildOnboardingDocumentReadinessIssues(): string[] {
    if (!clinicProfileDraft) return [];
    const issues: string[] = [];
    const requiredDocumentDraftFields: Array<[string, string]> = [
      ["юридическое наименование", clinicProfileDraft.legalName],
      ["ИНН", clinicProfileDraft.inn],
      ["адрес", clinicProfileDraft.address],
      ["номер медицинской лицензии", clinicProfileDraft.medicalLicenseNumber],
      ["дата медицинской лицензии", clinicProfileDraft.medicalLicenseIssuedAt],
      ["орган, выдавший лицензию", clinicProfileDraft.medicalLicenseIssuer]
    ];
    for (const [label, value] of requiredDocumentDraftFields) {
      if (!value?.trim()) issues.push(label);
    }
    return issues;
  }

  function buildOnboardingReadinessIssues(): string[] {
    return [...buildOnboardingFirstAppointmentIssues(), ...buildOnboardingDocumentReadinessIssues()];
  }

  function buildOnboardingTelegramRecommendations(): string[] {
    const recommendations: string[] = [];
    if (telegramModeDraft === "disabled") recommendations.push("включить режим Telegram");
    if (!telegramBotUsernameDraft.trim() && !telegramOwnBotUsernameDraft.trim()) recommendations.push("указать имя Telegram-бота");
    if (!telegramPatientPortalBaseUrlDraft.trim()) recommendations.push("добавить адрес портала пациента");
    if (!telegramReviewUrlDraft.trim()) recommendations.push("добавить ссылку для оценки клиники");
    if (!telegramMapsUrlDraft.trim()) recommendations.push("добавить ссылку на карточку клиники на картах");
    return recommendations;
  }

  function focusOnboardingIssue(issues: string[]): void {
    if (issues.some((issue) => ["врач для первого приема", "врач с правом подписи ЭМК", "кресло / кабинет", "ассистент"].includes(issue))) {
      setOnboardingStep("team");
      return;
    }
    if (issues.some((issue) => ["название клиники", "телефон клиники", "часовой пояс"].includes(issue))) {
      setOnboardingStep("clinic");
      return;
    }
    if (issues.some((issue) => ["юридическое наименование", "ИНН", "адрес", "номер медицинской лицензии", "дата медицинской лицензии", "орган, выдавший лицензию"].includes(issue))) {
      setOnboardingStep("legal");
      return;
    }
    if (issues.some((issue) => issue.includes("Telegram") || issue.includes("бот") || issue.includes("портал") || issue.includes("оценки") || issue.includes("картах"))) {
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

  function currentUiPreferencesInput(): UiPreferencesInput {
    return {
      uiLanguage,
      selectedWorkspaceRole,
      selectedSpecialty,
      selectedProtocolId,
      selectedPatientId,
      scheduleDoctorFilterId,
      scheduleAssistantFilterId,
      scheduleChairFilterId,
      scheduleDefaultDoctorUserId,
      scheduleDefaultAssistantUserId,
      scheduleDefaultChairId,
      scheduleStatusFilter,
      scheduleDateFilter,
      paymentMethod,
      taxDocumentYear,
      selectedDocumentKind,
      taxApplicationForm,
      taxApplicationDeliveryChannel,
      paymentReceiptTaxSupportRequested,
      documentIssueSignatureMode,
      documentIssueStaffFullName,
      documentIssueStaffRole,
      procedureConsentProcedureType,
      postVisitCareTopic,
      pricelistSourceKind,
      usePricelistAi,
      recognitionKind,
      recognitionTarget,
      importSourceKind,
      documentIngestionTarget,
      imagingImportSourceKind,
      smartImportMode,
      imagingKindFilter,
      dicomWebEndpointUrl,
      ohifBaseUrl,
      telegramBotConfigId: telegramBotConfigId.trim(),
      telegramLinkSubjectType,
      telegramLinkStaffId: telegramLinkStaffId || null,
      telegramOutboxStatusFilter,
      telegramOutboxTemplateFilter,
      onboardingDismissed,
      onboardingDismissedAt,
      onboardingStep,
      onboardingDraftMode
    };
  }

  function clearUiPreferencesRetryTimer(): void {
    if (typeof window === "undefined" || uiPreferencesRetryTimerRef.current === null) return;
    window.clearTimeout(uiPreferencesRetryTimerRef.current);
    uiPreferencesRetryTimerRef.current = null;
  }

  function queueUiPreferencesServerSync(preferences: UiPreferences, options: { delayMs?: number } = {}): void {
    pendingUiPreferencesSyncRef.current = preferences;
    if (
      !settingsAdminSecretSession.trim() ||
      !uiPreferencesServerReadyRef.current ||
      uiPreferencesSyncInFlightRef.current ||
      typeof window === "undefined"
    ) {
      return;
    }
    clearUiPreferencesRetryTimer();
    uiPreferencesRetryTimerRef.current = window.setTimeout(() => {
      uiPreferencesRetryTimerRef.current = null;
      void flushPendingUiPreferencesServerSync();
    }, options.delayMs ?? 600);
  }

  async function flushPendingUiPreferencesServerSync(): Promise<void> {
    if (!settingsAdminSecretSession.trim() || !uiPreferencesServerReadyRef.current || uiPreferencesSyncInFlightRef.current) return;
    const preferences = pendingUiPreferencesSyncRef.current;
    if (!preferences) return;
    pendingUiPreferencesSyncRef.current = null;
    uiPreferencesSyncInFlightRef.current = true;
    try {
      await saveServerUiPreferences(preferences, settingsAdminSecretSession);
      if (!pendingUiPreferencesSyncRef.current) setUiPreferencesSyncError(null);
    } catch (preferencesError) {
      if (!pendingUiPreferencesSyncRef.current) pendingUiPreferencesSyncRef.current = preferences;
      setUiPreferencesSyncError(uiPreferencesSyncErrorMessage(preferencesError));
    } finally {
      uiPreferencesSyncInFlightRef.current = false;
      const pending = pendingUiPreferencesSyncRef.current;
      if (pending) queueUiPreferencesServerSync(pending, { delayMs: pending.savedAt === preferences.savedAt ? 5000 : 0 });
    }
  }

  async function dismissOnboarding() {
    if (!assertOnboardingReadyForFinish()) return;
    if (!(await saveClinicProfileIfDirty())) return;
    if (!(await saveOnboardingSchedulesIfDirty())) return;
    if (telegramSettingsDirty && !(await saveTelegramSettings())) return;
    const previousPreferencesInput = currentUiPreferencesInput();
    const dismissalSavedAt = new Date().toISOString();
    const savedPreferences: UiPreferences = {
      version: 1,
      ...previousPreferencesInput,
      onboardingDismissed: true,
      onboardingDismissedAt: dismissalSavedAt,
      onboardingDraftMode: false,
      savedAt: dismissalSavedAt
    };
    if (uiPreferencesServerReadyRef.current) {
      try {
        await saveServerUiPreferences(savedPreferences, settingsAdminSecretSession);
        pendingUiPreferencesSyncRef.current = null;
        setUiPreferencesSyncError(null);
      } catch (preferencesError) {
        const message = uiPreferencesSyncErrorMessage(preferencesError);
        pendingUiPreferencesSyncRef.current = null;
        setUiPreferencesSyncError(message);
        setError(message);
        return;
      }
    }
    if (!persistUiPreferences(savedPreferences)) {
      const message = "Настройки интерфейса не сохранены: браузер заблокировал локальное хранилище.";
      setUiPreferencesSyncError(message);
      setError(message);
      return;
    }
    const dismissal = saveOnboardingDismissed(
      true,
      dismissalSavedAt,
      false,
      dashboard?.clinicSettings.profile.organizationId ?? null
    );
    setOnboardingDismissed(true);
    setOnboardingDismissedAt(dismissal.savedAt);
    setOnboardingDraftMode(false);
  }

  async function continueOnboardingInDraftMode(targetView?: AppView) {
    if (!(await saveClinicProfileIfDirty())) return;
    if (!(await saveOnboardingSchedulesIfDirty())) return;
    if (onboardingStep === "telegram" && telegramSettingsDirty && !(await saveTelegramSettings())) return;
    const dismissalSavedAt = new Date().toISOString();
    const savedPreferences: UiPreferences = {
      version: 1,
      ...currentUiPreferencesInput(),
      onboardingDismissed: true,
      onboardingDismissedAt: dismissalSavedAt,
      onboardingDraftMode: true,
      savedAt: dismissalSavedAt
    };
    if (!persistUiPreferences(savedPreferences)) {
      const message = "Настройки интерфейса не сохранены: браузер заблокировал локальное хранилище.";
      setUiPreferencesSyncError(message);
      setError(message);
      return;
    }
    if (uiPreferencesServerReadyRef.current) {
      try {
        await saveServerUiPreferences(savedPreferences, settingsAdminSecretSession);
        setUiPreferencesSyncError(null);
      } catch (preferencesError) {
        queueUiPreferencesServerSync(savedPreferences, { delayMs: 5000 });
        setUiPreferencesSyncError(uiPreferencesSyncErrorMessage(preferencesError));
      }
    }
    const dismissal = saveOnboardingDismissed(
      true,
      dismissalSavedAt,
      true,
      dashboard?.clinicSettings.profile.organizationId ?? null
    );
    setOnboardingDismissed(true);
    setOnboardingDismissedAt(dismissal.savedAt);
    setOnboardingDraftMode(true);
    if (targetView && typeof window !== "undefined") {
      window.location.hash = targetView;
    }
  }

  async function moveOnboardingTo(step: OnboardingStep) {
    if (step === "done" && !assertOnboardingReadyForFinish()) return;
    if (!(await saveClinicProfileIfDirty())) return;
    if (!(await saveOnboardingSchedulesIfDirty())) return;
    if (onboardingStep === "telegram" && telegramSettingsDirty && !(await saveTelegramSettings())) return;
    setOnboardingStep(step);
  }

  async function handleSelectDemoMode(): Promise<void> {
    try {
      const res = await fetch("/api/settings/reset-demo", { method: "POST" });
      if (!res.ok) throw new Error("Failed to reset to demo");

      const dismissalSavedAt = new Date().toISOString();
      const savedPreferences: UiPreferences = {
        version: 1,
        ...currentUiPreferencesInput(),
        onboardingDismissed: true,
        onboardingDismissedAt: dismissalSavedAt,
        onboardingDraftMode: false,
        savedAt: dismissalSavedAt
      };
      if (uiPreferencesServerReadyRef.current) {
        try {
          await saveServerUiPreferences(savedPreferences, settingsAdminSecretSession);
        } catch (preferencesError) {
          console.warn("Preferences server sync failed", preferencesError);
        }
      }
      persistUiPreferences(savedPreferences);
      setOnboardingDismissed(true);
      setOnboardingDismissedAt(dismissalSavedAt);
      setOnboardingDraftMode(false);
      
      await loadDashboard();
    } catch (e) {
      console.error(e);
      alert("Не удалось запустить демонстрационный режим");
    }
  }

  async function handleSelectZeroMode(): Promise<void> {
    try {
      const res = await fetch("/api/settings/reset-zero", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedWorkspaceRole })
      });
      if (!res.ok) throw new Error("Failed to reset to zero");

      // Reset local state variables so they are empty in the wizard inputs
      setNewPatientName("");
      setNewPatientPhone("");
      setNewPatientBirthDate("");

      // Force clinic draft re-hydration from fresh zero-mode dashboard
      clinicProfileDraftHydratedRef.current = false;

      await loadDashboard();
      
      setOnboardingStep("clinic");
    } catch (e) {
      console.error(e);
      alert("Не удалось запустить чистый режим");
    }
  }

  async function handleFinishOnboarding(newStaffName: string, newChairName: string): Promise<void> {
    try {
      if (clinicProfileDirty) {
        await saveClinicProfileIfDirty();
      }

      if (newStaffName.trim()) {
        const staffRes = await fetch("/api/settings/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: newStaffName,
            role: selectedWorkspaceRole,
            specialties: ["universal"],
            phone: "+79999999999",
            email: "doctor@example.com"
          })
        });
        if (!staffRes.ok) throw new Error("Failed to create first staff");
      }

      if (newChairName.trim() && (selectedWorkspaceRole === "doctor" || selectedWorkspaceRole === "assistant")) {
        const chairRes = await fetch("/api/settings/chairs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newChairName,
            room: "1",
            specialties: ["universal"]
          })
        });
        if (!chairRes.ok) throw new Error("Failed to create first chair");
      }

      const dismissalSavedAt = new Date().toISOString();
      const savedPreferences: UiPreferences = {
        version: 1,
        ...currentUiPreferencesInput(),
        onboardingDismissed: true,
        onboardingDismissedAt: dismissalSavedAt,
        onboardingDraftMode: false,
        savedAt: dismissalSavedAt
      };
      if (uiPreferencesServerReadyRef.current) {
        try {
          await saveServerUiPreferences(savedPreferences, settingsAdminSecretSession);
        } catch (preferencesError) {
          console.warn("Preferences server sync failed", preferencesError);
        }
      }
      persistUiPreferences(savedPreferences);
      setOnboardingDismissed(true);
      setOnboardingDismissedAt(dismissalSavedAt);
      setOnboardingDraftMode(false);

      await loadDashboard();
    } catch (e) {
      console.error(e);
      alert("Не удалось завершить настройку клиники");
    }
  }

  async function saveOnboardingSchedulesIfDirty(): Promise<boolean> {
    if (!dashboard) return true;
    const dirtyStaffIds = Array.from(staffScheduleDirtyIds).filter((staffId) => staffScheduleSaveStates[staffId] !== "saving");
    const dirtyChairIds = Array.from(chairScheduleDirtyIds).filter((chairId) => chairScheduleSaveStates[chairId] !== "saving");
    if (!dirtyStaffIds.length && !dirtyChairIds.length) return true;
    for (const staffId of dirtyStaffIds) {
      if (!(await saveStaffSchedule(staffId))) return false;
    }
    for (const chairId of dirtyChairIds) {
      if (!(await saveChairSchedule(chairId))) return false;
    }
    return true;
  }

  function reopenOnboarding() {
    const dismissal = saveOnboardingDismissed(
      false,
      new Date().toISOString(),
      false,
      dashboard?.clinicSettings.profile?.organizationId ?? null
    );
    setOnboardingDismissed(false);
    setOnboardingDismissedAt(dismissal.savedAt);
    setOnboardingStep("intro");
    setOnboardingDraftMode(false);
    setOnboardingGuideExpanded(true);
    setCurrentView("settings");
    setSettingsTab("clinic");
    window.location.hash = "settings/clinic";
  }

  function openOnboardingGuide(step?: OnboardingStep) {
    if (step) setOnboardingStep(step);
    setOnboardingGuideExpanded(true);
    setCurrentView("settings");
    setSettingsTab("clinic");
    window.location.hash = "settings/clinic";
  }

  async function loadPersistenceHealth(options: { silent?: boolean; adminSecret?: string | undefined } = {}) {
    try {
      const response = await fetch("/api/system/persistence/verify", {
        cache: "no-store",
        headers: denteClinicalReadHeaders({}, options.adminSecret)
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Проверка сервера не выполнена"));
      const report = (await response.json()) as PersistenceIntegrityReport & { meta?: PersistenceHealth };
      setPersistenceIntegrity(report);
      setPersistenceHealth(normalizePersistenceHealth(report));
    } catch (healthError) {
      if (!options.silent) {
        setError(operatorWorkflowFailureMessage("Статус сохранности недоступен", healthError));
      }
    }
  }

  async function loadPersistenceIntegrity(options: { silent?: boolean } = {}) {
    try {
      const response = await fetch("/api/system/persistence/verify", { cache: "no-store", headers: denteClinicalReadHeaders() });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Проверка резервной копии не выполнена"));
      const report = (await response.json()) as PersistenceIntegrityReport & { meta?: PersistenceHealth };
      setPersistenceIntegrity(report);
      if (report.meta) setPersistenceHealth(report.meta);
    } catch (verifyError) {
      if (!options.silent) {
        setError(operatorWorkflowFailureMessage("Проверка резервной копии не выполнена", verifyError));
      }
    }
  }

  async function downloadPersistenceExport() {
    if (isPersistenceExporting) {
      setError("Дождитесь завершения текущего экспорта резервной копии.");
      return;
    }
    setIsPersistenceExporting(true);
    try {
      const response = await fetch("/api/system/persistence/export", { cache: "no-store", headers: denteClinicalReadHeaders() });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Экспорт резервной копии не выполнен"));
      const blob = await response.blob();
      if (blob.size === 0) throw new Error("Сервер вернул пустой файл резервной копии.");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `dental-crm-state-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "")}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      await loadPersistenceIntegrity({ silent: true });
      setError(null);
    } catch (exportError) {
      setError(operatorWorkflowFailureMessage("Экспорт резервной копии не выполнен", exportError));
    } finally {
      setIsPersistenceExporting(false);
    }
  }

  async function refreshBrowserContinuity(options: { silent?: boolean } = {}) {
    try {
      setBrowserContinuity(await inspectBrowserContinuity());
    } catch (continuityError) {
      if (!options.silent) {
        setError(browserCapabilityFailureMessage("Проверка сохранности браузера не выполнена", continuityError));
      }
    }
  }

  async function loadLocalBridgeReadiness(options: { silent?: boolean } = {}) {
    try {
      const response = await fetch("/api/system/local-bridges/readiness", { cache: "no-store", headers: denteClinicalReadHeaders() });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Готовность локального модуля не проверена"));
      setLocalBridgeReadiness((await response.json()) as LocalBridgeReadinessResponse);
    } catch (bridgeError) {
      if (!options.silent) {
        setError(operatorWorkflowFailureMessage("Готовность локального модуля не проверена", bridgeError));
      }
    }
  }

  async function loadLocalBridgeUsePlans(options: { silent?: boolean } = {}) {
    try {
      const response = await fetch("/api/system/local-bridges/use-plans", { cache: "no-store", headers: denteClinicalReadHeaders() });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "План локального модуля недоступен"));
      const payload = (await response.json()) as LocalBridgeUsePlansResponse;
      setLocalBridgeUsePlans(payload);
      setLocalBridgeReadiness(payload.readiness);
    } catch (planError) {
      if (!options.silent) {
        setError(operatorWorkflowFailureMessage("План локального модуля недоступен", planError));
      }
    }
  }

  async function requestBrowserStoragePersistence() {
    if (typeof navigator === "undefined" || !navigator.storage || typeof navigator.storage.persist !== "function") {
      setError("Постоянное хранилище браузера недоступно на этом устройстве.");
      return;
    }
    try {
      const granted = await navigator.storage.persist();
      await refreshBrowserContinuity({ silent: true });
      if (!granted) {
        setError("Браузер не выдал постоянное хранилище. Локальные черновики работают, но устройство может очистить локальное хранилище при нехватке места.");
      }
    } catch (storageError) {
      setError(browserCapabilityFailureMessage("Запрос постоянного хранилища не выполнен", storageError));
    }
  }

  async function loadSpeechGatewayStatus(options: { silent?: boolean } = {}): Promise<SpeechGatewayStatus | null> {
    try {
      const response = await fetch("/api/speech/status", { cache: "no-store", headers: denteClinicalReadHeaders() });
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

  async function loadSpeechGatewayHealthReport(options: { silent?: boolean } = {}) {
    try {
      const response = await fetch("/api/speech/gateway-health", { cache: "no-store", headers: denteClinicalReadHeaders() });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Проверка распознавания недоступна"));
      setSpeechGatewayHealthReport((await response.json()) as SpeechGatewayHealthReport);
    } catch (speechHealthError) {
      if (!options.silent) {
        setError(operatorWorkflowFailureMessage("Проверка распознавания недоступна", speechHealthError));
      }
    }
  }

  async function loadSpeechProviderRuntimeStatuses(options: { silent?: boolean } = {}) {
    try {
      const response = await fetch("/api/speech/providers/runtime", { cache: "no-store", headers: denteClinicalReadHeaders() });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Провайдеры распознавания недоступны"));
      setSpeechProviderRuntimeStatuses((await response.json()) as SpeechProviderRuntimeStatus[]);
    } catch (speechRuntimeError) {
      if (!options.silent) {
        setError(operatorWorkflowFailureMessage("Провайдер распознавания недоступен", speechRuntimeError));
      }
    }
  }

  async function loadSpeechRecordingStrategy(options: { silent?: boolean } = {}) {
    try {
      const response = await fetch("/api/speech/recording-strategy", {
        method: "POST",
        headers: denteClinicalReadHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          expectedDurationMs: 180_000,
          networkState: isOnline ? "online" : "offline",
          privacyMode: "cloud_allowed",
          specialty: selectedSpecialty,
          source: "visit"
        })
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Стратегия распознавания недоступна"));
      setSpeechRecordingStrategy((await response.json()) as SpeechRecordingStrategy);
    } catch (speechStrategyError) {
      if (!options.silent) {
        setError(operatorWorkflowFailureMessage("Стратегия распознавания недоступна", speechStrategyError));
      }
    }
  }

  async function loadSpeechRecordingRecovery(options: { silent?: boolean } = {}) {
    try {
      if (!dashboard?.activeVisit.id || !dashboard.activeVisit.patientId) {
        setSpeechRecordingRecovery(null);
        return;
      }
      const params = new URLSearchParams({ limit: "5" });
      params.set("visitId", dashboard.activeVisit.id);
      params.set("patientId", dashboard.activeVisit.patientId);
      const response = await fetch(`/api/speech/recordings/recovery?${params.toString()}`, {
        cache: "no-store",
        headers: denteClinicalReadHeaders()
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Восстановление диктовки недоступно"));
      setSpeechRecordingRecovery((await response.json()) as SpeechRecordingRecoveryList);
    } catch (speechRecoveryError) {
      if (!options.silent) {
        setError(operatorWorkflowFailureMessage("Восстановление диктовки недоступно", speechRecoveryError));
      }
    }
  }

  async function refreshSpeechRuntime(options: { silent?: boolean } = {}) {
    await Promise.all([
      loadSpeechGatewayStatus(options),
      loadSpeechGatewayHealthReport(options),
      loadSpeechProviderRuntimeStatuses(options),
      loadSpeechRecordingStrategy(options),
      loadSpeechRecordingRecovery(options)
    ]);
  }

  async function refreshPendingVisitSaveState() {
    const pending = await loadPendingVisitSaves(activeOrganizationId);
    setPendingVisitSaveCount(pending.length);
    setLastPendingVisitSaveAt(latestPendingVisitSaveAt(pending));
  }

  async function refreshPendingSpeechChunkState() {
    setPendingSpeechChunkCount((await loadPendingSpeechChunks(activeOrganizationId)).length);
  }

  function applyAcceptedVisitResponse(result: AcceptVisitDraftResponse) {
    setDashboard((current) =>
      current
        ? {
            ...current,
            activeVisit: result.visit,
            visitCloseChecklist: result.visitCloseChecklist
          }
        : current
    );
    setDraft(null);
    setVisitNoteForm(visitNoteFormFromVisit(result.visit));
    setLastVisitSaveReceipt(result.saveReceipt);
    if (result.saveReceipt.warning) {
      setError(result.saveReceipt.warning);
    }
  }

  async function submitAcceptedVisitDraft(
    visitId: string,
    draftToAccept: VisitNoteDraft,
    doctorSummary: string | null,
    options: { clientMutationId?: string | null; baseRevision?: number | null; clientSavedAt?: string | null } = {}
  ) {
    const response = await fetch(`/api/visits/${visitId}/draft/accept`, {
      method: "POST",
      headers: denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        draft: draftToAccept,
        doctorSummary,
        clientMutationId: options.clientMutationId ?? null,
        baseRevision: options.baseRevision ?? null,
        clientSavedAt: options.clientSavedAt ?? new Date().toISOString()
      })
    });
    if (!response.ok) {
      throw new WorkflowResponseError(await responseErrorMessage(response, "Прием не принят"), response.status);
    }
    return (await response.json()) as AcceptVisitDraftResponse;
  }

  function visitDraftSignature(nextTranscript: string, nextSpecialty: DentalSpecialty, nextForm: VisitNoteForm) {
    return JSON.stringify([nextTranscript, nextSpecialty, nextForm]);
  }

  async function loadServerVisitDraft(visitId: string): Promise<VisitDraftAutosaveResponse> {
    const response = await fetch(`/api/visits/${visitId}/draft/autosave`, {
      cache: "no-store",
      headers: denteClinicalReadHeaders()
    });
    if (!response.ok) throw new Error(await responseErrorMessage(response, "Серверный черновик не загружен"));
    return (await response.json()) as VisitDraftAutosaveResponse;
  }

  async function syncVisitDraftAutosave(clientSavedAt: string, options: { silent?: boolean } = {}) {
    if (!dashboard) return;
    const signature = visitDraftSignature(transcript, selectedSpecialty, visitNoteForm);
    if (lastServerDraftSignatureRef.current === signature) return;
    if (!transcript.trim() && !hasVisitNoteFormText) return;

    if (!isOnline) {
      setServerDraftSyncState("queued");
      return;
    }

    setServerDraftSyncState("saving");
    try {
      const response = await fetch(`/api/visits/${dashboard.activeVisit.id}/draft/autosave`, {
        method: "PUT",
        headers: denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          patientId: dashboard.activeVisit.patientId,
          selectedSpecialty,
          transcript,
          draft: visitNoteDraftFromForm(visitNoteForm, [
            "Серверный снимок автосохранения. Перед принятием черновика ЭМК врач все равно проверяет текст."
          ]),
          baseRevision: dashboard.activeVisit.revision ?? null,
          clientDraftId: `visit-draft-${dashboard.activeVisit.id}`,
          clientSavedAt
        })
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Серверный черновик не сохранен"));
      const result = (await response.json()) as VisitDraftAutosaveResponse;
      lastServerDraftSignatureRef.current = signature;
      setLastServerDraftSavedAt(result.serverDraft?.serverSavedAt ?? clientSavedAt);
      setServerDraftSyncState("saved");
    } catch (syncError) {
      setServerDraftSyncState("error");
      if (!options.silent) {
        setError(operatorWorkflowFailureMessage("Серверный черновик не сохранен", syncError));
      }
    }
  }

  async function flushPendingVisitSaves(options: { silent?: boolean } = {}) {
    if (isPendingVisitSyncing) return;
    const pending = await loadPendingVisitSaves(activeOrganizationId);
    if (!pending.length) {
      await refreshPendingVisitSaveState();
      return;
    }

    setIsPendingVisitSyncing(true);
    let remaining = pending;
    try {
      const results = await Promise.allSettled(
        pending.map(async (item) => {
          const result = await submitAcceptedVisitDraft(item.visitId, item.draft, item.doctorSummary, {
            clientMutationId: item.clientMutationId,
            baseRevision: item.baseRevision,
            clientSavedAt: item.queuedAt
          });
          return { item, result };
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled") {
          remaining = remaining.filter((candidate) => candidate.id !== r.value.item.id);
          if (dashboard?.activeVisit.id === r.value.result.visit.id) {
            applyAcceptedVisitResponse(r.value.result);
          }
        }
      }

      const firstError = results.find((r) => r.status === "rejected");
      if (firstError && firstError.status === "rejected") {
        throw firstError.reason;
      }

      await savePendingVisitSaves(remaining, activeOrganizationId);
      await refreshPendingVisitSaveState();
    } catch (syncError) {
      await savePendingVisitSaves(remaining, activeOrganizationId);
      await refreshPendingVisitSaveState();
      if (!options.silent) {
        setError(operatorWorkflowFailureMessage("Сервер пока не принял очередь", syncError));
      }
    } finally {
      setIsPendingVisitSyncing(false);
    }
  }

  async function submitSpeechChunk(input: SpeechChunkUploadInput): Promise<SpeechTranscriptionResponse> {
    const response = await fetch("/api/speech/transcribe-chunk", {
      method: "POST",
      headers: denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(input)
    });
    const payload = (await response.json()) as SpeechTranscriptionResponse & { error?: unknown; message?: unknown };
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

  function speechTranscriptionMatchesActiveVisit(result: SpeechTranscriptionResponse): boolean {
    if (result.chunk.source !== "visit" || !result.chunk.visitId || !dashboard?.activeVisit.id) return true;
    return result.chunk.visitId === dashboard.activeVisit.id;
  }

  function applySpeechTranscription(result: SpeechTranscriptionResponse) {
    setSpeechGatewayStatus(result.gateway);
    void loadSpeechRecordingRecovery({ silent: true });
    const applyKey = speechChunkApplyKey(result);
    if (appliedSpeechChunkKeysRef.current.has(applyKey)) {
      setSpeechStatusNote(`Фрагмент ${result.chunk.chunkIndex + 1} уже учтен, дубль не добавлен.`);
      return;
    }
    if (!speechTranscriptionMatchesActiveVisit(result)) {
      setSpeechStatusNote("Эта часть записи относится к другому приему и не добавлена в текущую карту.");
      return;
    }
    const text = result.chunk.transcript.trim();
    const quality = result.chunk.quality;
    setSpeechLastQuality(quality);
    const qualitySuffix = quality.level === "clear" ? "" : ` · ${speechQualityLabels[quality.level]}`;
    if (text) {
      appliedSpeechChunkKeysRef.current.add(applyKey);
      appendVisitDictationText(text);
      setSpeechStatusNote(
        result.chunk.status === "transcribed"
          ? `${result.chunk.providerLabel}: фрагмент ${result.chunk.chunkIndex + 1}${qualitySuffix}`
          : `Сохранен фрагмент ${result.chunk.chunkIndex + 1}${qualitySuffix}: ${quality.nextAction}`
      );
      return;
    }
    setSpeechStatusNote(`${speechQualityLabels[quality.level]}: ${quality.nextAction}`);
  }

  async function assembleSpeechRecording(recordingId: string, options: { silent?: boolean } = {}) {
    try {
      const params = new URLSearchParams();
      if (dashboard?.activeVisit.id) params.set("visitId", dashboard.activeVisit.id);
      if (dashboard?.activeVisit.patientId) params.set("patientId", dashboard.activeVisit.patientId);
      const scopedQuery = params.toString();
      const response = await fetch(
        `/api/speech/recordings/${encodeURIComponent(recordingId)}/assemble${scopedQuery ? `?${scopedQuery}` : ""}`,
        {
        cache: "no-store",
        headers: denteClinicalReadHeaders()
        }
      );
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Запись распознавания не собрана"));
      const assembly = (await response.json()) as SpeechRecordingAssembly;
      const assembledTranscript = assembly.transcript.trim();
      if (assembledTranscript) {
        visitDraftUserEditedRef.current = true;
        setTranscript((current: any) => {
          const normalizedCurrent = current.replace(/\s+/g, " ").trim();
          const normalizedAssembled = assembledTranscript.replace(/\s+/g, " ").trim();
          if (!normalizedAssembled || normalizedCurrent.includes(normalizedAssembled)) return current;
          return [current.trim(), assembledTranscript].filter(Boolean).join("\n");
        });
      }
      if (!options.silent || assembly.missingChunkIndexes.length || assembly.warnings.length) {
        const missing = assembly.missingChunkIndexes.length ? ` · пропуски ${assembly.missingChunkIndexes.join(", ")}` : "";
        setSpeechStatusNote(`Запись собрана: ${assembly.chunkCount} фрагм.${missing}`);
      }
      void loadSpeechRecordingRecovery({ silent: true });
      return assembly;
    } catch (assemblyError) {
      if (!options.silent) {
        setError(operatorWorkflowFailureMessage("Не удалось собрать запись распознавания", assemblyError));
      }
      return null;
    }
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
    await flushPendingSpeechChunks({ silent: true });
    await assembleSpeechRecording(recordingId, { silent: true });
  }

  async function flushPendingSpeechChunks(options: { silent?: boolean } = {}) {
    const queue = await loadPendingSpeechChunks(activeOrganizationId);
    if (!queue.length) {
      await refreshPendingSpeechChunkState();
      return;
    }

    if (!isOnline) {
      await refreshPendingSpeechChunkState();
      if (!options.silent) {
        setSpeechStatusNote(`Очередь распознавания сохранена локально: ${queue.length} фрагм., отправка после подключения.`);
      }
      return;
    }

    const currentGateway = (await loadSpeechGatewayStatus({ silent: true })) ?? speechGatewayStatus;
    const hasAudioWaitingForServer = queue.some((item) => Boolean(item.audioBase64?.trim()));
    if (hasAudioWaitingForServer && !speechGatewayCanUpload(currentGateway)) {
      await refreshPendingSpeechChunkState();
      if (!options.silent) {
        setSpeechStatusNote(`Очередь распознавания сохранена: ${queue.length} фрагм. Серверное распознавание еще не готово, аудио не удалено.`);
      }
      return;
    }

    const flushedRecordingIds = new Set<string>();
    try {
      for (const item of queue) {
        const result = await submitSpeechChunk(item);
        applySpeechTranscription(result);
        await removePendingSpeechChunkById(item.id, activeOrganizationId);
        if (speechTranscriptionMatchesActiveVisit(result)) flushedRecordingIds.add(item.recordingId);
        await refreshPendingSpeechChunkState();
      }
      for (const recordingId of flushedRecordingIds) {
        await assembleSpeechRecording(recordingId, { silent: true });
      }
    } catch (syncError) {
      await refreshPendingSpeechChunkState();
      if (!options.silent) {
        setError(operatorWorkflowFailureMessage("Очередь распознавания пока не отправлена", syncError));
      }
    }
  }

  function applyUiPreferences(preferences: UiPreferences) {
    setUiLanguage(preferences.uiLanguage);
    setSelectedWorkspaceRole(preferences.selectedWorkspaceRole);
    setSelectedSpecialty(preferences.selectedSpecialty);
    setSelectedProtocolId(preferences.selectedProtocolId);
    setSelectedPatientId(preferences.selectedPatientId);
    setScheduleDoctorFilterId(preferences.scheduleDoctorFilterId);
    setScheduleAssistantFilterId(preferences.scheduleAssistantFilterId);
    setScheduleChairFilterId(preferences.scheduleChairFilterId);
    setScheduleDefaultDoctorUserId(preferences.scheduleDefaultDoctorUserId);
    setScheduleDefaultAssistantUserId(preferences.scheduleDefaultAssistantUserId);
    setScheduleDefaultChairId(preferences.scheduleDefaultChairId);
    setScheduleStatusFilter(preferences.scheduleStatusFilter);
    setScheduleDateFilter(preferences.scheduleDateFilter);
    setOnboardingDismissed(preferences.onboardingDismissed);
    setOnboardingDismissedAt(preferences.onboardingDismissedAt ?? null);
    setOnboardingStep(preferences.onboardingStep);
    setOnboardingDraftMode(preferences.onboardingDraftMode);
    setPaymentMethod(preferences.paymentMethod);
    setTaxDocumentYear(preferences.taxDocumentYear);
    setSelectedDocumentKind(preferences.selectedDocumentKind);
    setTaxApplicationForm(preferences.taxApplicationForm);
    setTaxApplicationDeliveryChannel(preferences.taxApplicationDeliveryChannel);
    setPaymentReceiptTaxSupportRequested(preferences.paymentReceiptTaxSupportRequested);
    setDocumentIssueSignatureMode(preferences.documentIssueSignatureMode);
    setDocumentIssueStaffFullName(preferences.documentIssueStaffFullName);
    setDocumentIssueStaffRole(preferences.documentIssueStaffRole);
    setProcedureConsentProcedureType(preferences.procedureConsentProcedureType);
    setPostVisitCareTopic(preferences.postVisitCareTopic);
    setPricelistSourceKind(preferences.pricelistSourceKind);
    setUsePricelistAi(preferences.usePricelistAi);
    setRecognitionKind(preferences.recognitionKind);
    setRecognitionTarget(preferences.recognitionTarget);
    setImportSourceKind(preferences.importSourceKind);
    setDocumentIngestionTarget(preferences.documentIngestionTarget);
    setImagingImportSourceKind(preferences.imagingImportSourceKind);
    setSmartImportMode(preferences.smartImportMode);
    setImagingKindFilter(preferences.imagingKindFilter);
    setDicomWebEndpointUrl(preferences.dicomWebEndpointUrl);
    setOhifBaseUrl(preferences.ohifBaseUrl);
    setTelegramBotConfigId(preferences.telegramBotConfigId);
    setTelegramLinkSubjectType(preferences.telegramLinkSubjectType);
    setTelegramLinkStaffId(preferences.telegramLinkStaffId ?? "");
    setTelegramOutboxStatusFilter(preferences.telegramOutboxStatusFilter);
    setTelegramOutboxTemplateFilter(preferences.telegramOutboxTemplateFilter);
  }

  useEffect(() => {
    let cancelled = false;
    const preferencesAccessSecret = settingsAdminSecretSession.trim();
    if (!preferencesAccessSecret) {
      uiPreferencesServerReadyRef.current = false;
      uiPreferencesHydratedRef.current = true;
      setUiPreferencesHydrated(true);
      return () => {
        cancelled = true;
      };
    }
    loadServerUiPreferences(preferencesAccessSecret)
      .then(async (serverPreferences) => {
        if (cancelled) return;
        const localPreferences = loadUiPreferences();
        if (
          serverPreferences &&
          (!localPreferences.savedAt || (serverPreferences.savedAt && serverPreferences.savedAt > localPreferences.savedAt))
        ) {
          applyUiPreferences(serverPreferences);
          window.localStorage.setItem(uiPreferencesStorageKey, JSON.stringify(serverPreferences));
          setUiPreferencesSyncError(null);
        } else if (!serverPreferences && localPreferences.savedAt) {
          await saveServerUiPreferences(localPreferences, preferencesAccessSecret);
          if (!cancelled) setUiPreferencesSyncError(null);
        }
      })
      .catch((preferencesError) => {
        if (!cancelled) {
          setUiPreferencesSyncError(uiPreferencesSyncErrorMessage(preferencesError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          uiPreferencesServerReadyRef.current = true;
          uiPreferencesHydratedRef.current = true;
          setUiPreferencesHydrated(true);
          const pendingPreferences = pendingUiPreferencesSyncRef.current;
          if (pendingPreferences) queueUiPreferencesServerSync(pendingPreferences, { delayMs: 0 });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [settingsAdminSecretSession]);

  useEffect(() => {
    const organizationId = dashboard?.clinicSettings.profile?.organizationId?.trim() ?? "";
    if (!uiPreferencesHydrated || !organizationId || documentIssueSignatureHydratedOrganizationIdRef.current === organizationId) return;
    documentIssueSignatureHydratedOrganizationIdRef.current = organizationId;
    const scopedDraft = loadDocumentIssueSignatureDraft(organizationId);
    if (!scopedDraft.savedAt) return;
    const savedPreferences = loadUiPreferences();
    if (savedPreferences.savedAt && scopedDraft.savedAt < savedPreferences.savedAt) return;
    setDocumentIssueSignatureMode(scopedDraft.mode);
    setDocumentIssueStaffFullName(scopedDraft.staffFullName);
    setDocumentIssueStaffRole(scopedDraft.staffRole);
  }, [dashboard?.clinicSettings.profile?.organizationId, uiPreferencesHydrated]);

  useEffect(() => {
    const organizationId = dashboard?.clinicSettings.profile?.organizationId?.trim() ?? "";
    if (!uiPreferencesHydrated || !organizationId || onboardingDismissalHydratedOrganizationIdRef.current === organizationId) return;
    onboardingDismissalHydratedOrganizationIdRef.current = organizationId;
    const scopedDismissal = loadOnboardingDismissalState(organizationId);
    if (!scopedDismissal?.savedAt) return;
    const preferenceDismissedAt = onboardingDismissedAt ?? loadUiPreferences().savedAt;
    if (preferenceDismissedAt && scopedDismissal.savedAt < preferenceDismissedAt) return;
    setOnboardingDismissed(scopedDismissal.dismissed);
    setOnboardingDismissedAt(scopedDismissal.savedAt);
    setOnboardingDraftMode(scopedDismissal.dismissed ? scopedDismissal.draftMode : false);
    if (!scopedDismissal.dismissed) setOnboardingStep("intro");
  }, [dashboard?.clinicSettings.profile?.organizationId, onboardingDismissedAt, uiPreferencesHydrated]);

  useEffect(() => {
    if (!dashboard) return;
    const hasClinicProfile = Boolean(dashboard.clinicSettings.profile?.clinicName);
    if (hasClinicProfile) {
      setOnboardingDismissed(true);
    }
  }, [dashboard]);

  useEffect(() => {
    if (!uiPreferencesHydrated) return undefined;
    const savedPreferences = saveUiPreferences({
      uiLanguage,
      selectedWorkspaceRole,
      selectedSpecialty,
      selectedProtocolId,
      selectedPatientId,
      scheduleDoctorFilterId,
      scheduleAssistantFilterId,
      scheduleChairFilterId,
      scheduleDefaultDoctorUserId,
      scheduleDefaultAssistantUserId,
      scheduleDefaultChairId,
      scheduleStatusFilter,
      scheduleDateFilter,
      paymentMethod,
      taxDocumentYear,
      selectedDocumentKind,
      taxApplicationForm,
      taxApplicationDeliveryChannel,
      paymentReceiptTaxSupportRequested,
      documentIssueSignatureMode,
      documentIssueStaffFullName,
      documentIssueStaffRole,
      procedureConsentProcedureType,
      postVisitCareTopic,
      pricelistSourceKind,
      usePricelistAi,
      recognitionKind,
      recognitionTarget,
      importSourceKind,
      documentIngestionTarget,
      imagingImportSourceKind,
      smartImportMode,
      imagingKindFilter,
      dicomWebEndpointUrl,
      ohifBaseUrl,
      telegramBotConfigId: telegramBotConfigId.trim(),
      telegramLinkSubjectType,
      telegramLinkStaffId: telegramLinkStaffId || null,
      telegramOutboxStatusFilter,
      telegramOutboxTemplateFilter,
      onboardingDismissed,
      onboardingDismissedAt,
      onboardingStep,
      onboardingDraftMode
    });
    if (!savedPreferences) {
      setUiPreferencesSyncError("Настройки интерфейса не сохранены: браузер заблокировал локальное хранилище.");
      return undefined;
    }
    queueUiPreferencesServerSync(savedPreferences, { delayMs: 600 });
    return undefined;
  }, [
    selectedWorkspaceRole,
    uiLanguage,
    selectedSpecialty,
    selectedProtocolId,
    selectedPatientId,
    scheduleDoctorFilterId,
    scheduleAssistantFilterId,
    scheduleChairFilterId,
    scheduleDefaultDoctorUserId,
    scheduleDefaultAssistantUserId,
    scheduleDefaultChairId,
    scheduleStatusFilter,
    scheduleDateFilter,
    paymentMethod,
    taxDocumentYear,
    selectedDocumentKind,
    taxApplicationForm,
    taxApplicationDeliveryChannel,
    paymentReceiptTaxSupportRequested,
    documentIssueSignatureMode,
    documentIssueStaffFullName,
    documentIssueStaffRole,
    procedureConsentProcedureType,
    postVisitCareTopic,
    pricelistSourceKind,
    usePricelistAi,
    recognitionKind,
    recognitionTarget,
    importSourceKind,
    documentIngestionTarget,
    imagingImportSourceKind,
    smartImportMode,
    imagingKindFilter,
    dicomWebEndpointUrl,
    ohifBaseUrl,
    telegramBotConfigId,
    telegramLinkSubjectType,
    telegramLinkStaffId,
    telegramOutboxStatusFilter,
    telegramOutboxTemplateFilter,
    onboardingDismissed,
    onboardingDismissedAt,
    onboardingStep,
    onboardingDraftMode,
    uiPreferencesHydrated
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const retryPendingUiPreferences = () => {
      const pendingPreferences = pendingUiPreferencesSyncRef.current ?? loadUiPreferences();
      if (pendingPreferences) queueUiPreferencesServerSync(pendingPreferences, { delayMs: 0 });
    };
    window.addEventListener("online", retryPendingUiPreferences);
    return () => {
      window.removeEventListener("online", retryPendingUiPreferences);
      clearUiPreferencesRetryTimer();
    };
  }, []);

  useEffect(() => {
    loadDashboard().catch((loadError: unknown) => {
      setError(operatorWorkflowFailureMessage("Не удалось загрузить данные", loadError));
    });
  }, []);

  const imagingPreviewWorkset = useMemo(() => {
    if (currentView !== "imaging" || !dashboard?.imagingStudies.length) return [];
    const activeStudies = dashboard.imagingStudies
      .filter((study) => study.patientId === dashboard.activeVisit.patientId)
      .sort((left, right) => right.capturedAt.localeCompare(left.capturedAt));
    const visibleStudies =
      imagingKindFilter === "all" ? activeStudies : activeStudies.filter((study) => study.kind === imagingKindFilter);
    const selectedStudy = visibleStudies.find((study) => study.id === selectedImagingStudyId) ?? visibleStudies[0] ?? null;
    const comparisonStudies = selectedStudy
      ? activeStudies
          .filter((study) => study.id !== selectedStudy.id)
          .map((study) => ({
            study,
            score: imagingComparisonScore(selectedStudy, study)
          }))
          .sort(
            (left, right) =>
              right.score - left.score ||
              imagingCaptureDistanceMs(selectedStudy.capturedAt, left.study.capturedAt) -
                imagingCaptureDistanceMs(selectedStudy.capturedAt, right.study.capturedAt) ||
              right.study.capturedAt.localeCompare(left.study.capturedAt)
          )
          .slice(0, 4)
          .map((item) => item.study)
      : [];
    const workset = new Map<string, Dashboard["imagingStudies"][number]>();
    [selectedStudy, ...comparisonStudies, ...visibleStudies].forEach((study) => {
      if (study) workset.set(study.id, study);
    });
    return Array.from(workset.values());
  }, [currentView, dashboard, imagingKindFilter, selectedImagingStudyId]);
  const imagingPreviewSignature = imagingPreviewWorkset.map((study) => `${study.id}:${study.previewUrl}`).join("|");
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (!imagingPreviewWorkset.length) {
      setImagingPreviewObjectUrls((current) => {
        revokeObjectUrlMap(current);
        return {};
      });
      return undefined;
    }

    let cancelled = false;
    const abortController = new AbortController();
    const createdUrls: string[] = [];
    void Promise.all(
      imagingPreviewWorkset.map(async (study): Promise<[string, string] | null> => {
        if (!study.previewUrl.startsWith("/api/")) return [study.id, study.previewUrl];
        const response = await fetch(study.previewUrl, {
          cache: "no-store",
          headers: denteClinicalReadHeaders(),
          signal: abortController.signal
        });
        if (!response.ok) return null;
        const blobUrl = URL.createObjectURL(await response.blob());
        if (cancelled) {
          revokeObjectUrlIfNeeded(blobUrl);
          return null;
        }
        createdUrls.push(blobUrl);
        return [study.id, blobUrl];
      })
    )
      .then((entries) => {
        if (cancelled) {
          createdUrls.forEach(revokeObjectUrlIfNeeded);
          return;
        }
        const next = Object.fromEntries(entries.filter((entry): entry is [string, string] => Boolean(entry)));
        const nextUrls = new Set(Object.values(next));
        setImagingPreviewObjectUrls((current) => {
          Object.values(current).forEach((url) => {
            if (!nextUrls.has(url)) revokeObjectUrlIfNeeded(url);
          });
          return next;
        });
      })
      .catch(() => {
        createdUrls.forEach(revokeObjectUrlIfNeeded);
        if (!cancelled) {
          setImagingPreviewObjectUrls((current) => {
            revokeObjectUrlMap(current);
            return {};
          });
        }
      });

    return () => {
      cancelled = true;
      abortController.abort();
      createdUrls.forEach(revokeObjectUrlIfNeeded);
    };
  }, [imagingPreviewSignature, imagingPreviewWorkset, clinicalAdminSecretSession]);

  useEffect(() => {
    const settings = telegramStatus?.settings;
    if (!settings || telegramSettingsDirty) return;
    setTelegramModeDraft(settings.mode);
    setTelegramBotUsernameDraft(settings.botUsername ?? "");
    setTelegramOwnBotUsernameDraft(settings.ownBotUsername ?? "");
    setTelegramWebhookBaseUrlDraft(settings.webhookBaseUrl ?? "");
    setTelegramPatientPortalBaseUrlDraft(settings.patientPortalBaseUrl ?? "");
    setTelegramWelcomeImageUrlDraft(settings.welcomeImageUrl ?? "");
    setTelegramVisualCardUrlDrafts({
      ...emptyTelegramVisualCardUrlDrafts(),
      ...(settings.visualCardUrls ?? {})
    });
    setTelegramReviewUrlDraft(settings.clinicReviewUrl ?? "");
    setTelegramMapsUrlDraft(settings.clinicMapsUrl ?? "");
    setTelegramEnabledFeaturesDraft(settings.enabledFeatures);
    setTelegramTokenTtlDraft(String(settings.patientLinkTokenTtlMinutes));
    setTelegramReminderLeadTimesDraft((settings.appointmentReminderLeadTimesHours?.length ? settings.appointmentReminderLeadTimesHours : [24]).join(", "));
    setTelegramReviewRequestDelayDraft(String(settings.reviewRequestDelayHours ?? 2));
    setTelegramPostVisitCheckupDelayDrafts(
      normalizeTelegramPostVisitCheckupDelayDrafts(
        settings.postVisitCheckupDelayHoursByTopic ?? defaultTelegramPostVisitCheckupDelayHoursByTopic
      )
    );
    setTelegramAllowVoiceIntakeDraft(settings.allowVoiceIntake);
    setTelegramStaffEscalationChannelDraft(settings.staffEscalationChannel ?? "");
    setTelegramPrivacyModeDraft(settings.privacyMode);
    setTelegramSettingsSaveState("idle");
    setTelegramSettingsSaveError(null);
  }, [telegramStatus?.settings.updatedAt, telegramSettingsDirty]);

  useEffect(() => {
    if (!telegramSettingsDirty || !telegramStatus?.settings) return;
    const timeout = window.setTimeout(() => {
      void saveTelegramSettings({ silent: true });
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [
    telegramSettingsDirty,
    telegramModeDraft,
    telegramBotUsernameDraft,
    telegramOwnBotUsernameDraft,
    telegramWebhookBaseUrlDraft,
    telegramPatientPortalBaseUrlDraft,
    telegramWelcomeImageUrlDraft,
    telegramVisualCardUrlDrafts,
    telegramReviewUrlDraft,
    telegramMapsUrlDraft,
    telegramEnabledFeaturesDraft,
    telegramTokenTtlDraft,
    telegramReminderLeadTimesDraft,
    telegramReviewRequestDelayDraft,
    telegramPostVisitCheckupDelayDrafts,
    telegramAllowVoiceIntakeDraft,
    telegramStaffEscalationChannelDraft,
    telegramPrivacyModeDraft,
    telegramStatus?.settings
  ]);

  useEffect(() => {
    if (!dashboard || clinicProfileDraftHydratedRef.current) return;
    if (dashboard.clinicSettings.profile) {
      setClinicProfileDraft(clinicProfileDraftFromProfile(dashboard.clinicSettings.profile));
    } else {
      setClinicProfileDraft(emptyClinicProfileDraft());
    }
    setClinicProfileDirty(false);
    clinicProfileDraftHydratedRef.current = true;
  }, [dashboard]);

  useEffect(() => {
    if (!dashboard) return;
    setStaffScheduleDrafts((current: any) => {
      const next: Record<string, StaffScheduleDraft> = {};
      dashboard?.clinicSettings.staff.forEach((member) => {
        next[member.id] = current[member.id] ?? staffScheduleDraftFromWorkingHours(member.workingHours ?? null);
      });
      return next;
    });
  }, [dashboard]);

  useEffect(() => {
    if (!dashboard) return;
    setChairScheduleDrafts((current: any) => {
      const next: Record<string, StaffScheduleDraft> = {};
      dashboard?.clinicSettings.chairs.forEach((chair) => {
        next[chair.id] = current[chair.id] ?? staffScheduleDraftFromWorkingHours(chair.workingHours ?? null);
      });
      return next;
    });
  }, [dashboard]);

  useEffect(() => {
    if (!dashboard) return;
    setAppointmentScheduleDrafts((current: any) => {
      const next: Record<string, AppointmentScheduleDraft> = {};
      dashboard.appointments.forEach((appointment) => {
        next[appointment.id] = current[appointment.id] ?? appointmentScheduleDraftFromAppointment(appointment);
      });
      return next;
    });
  }, [dashboard]);

  useEffect(() => {
    reconcileDashboardScopedUiSelections();
  }, [
    dashboard,
    scheduleAssistantFilterId,
    scheduleChairFilterId,
    scheduleDefaultAssistantUserId,
    scheduleDefaultChairId,
    scheduleDefaultDoctorUserId,
    scheduleDoctorFilterId,
    selectedProtocolId,
    selectedPatientId,
    telegramLinkStaffId
  ]);

  useEffect(() => {
    if (!dashboard) return;
    if (newAppointmentDraftUserEditedRef.current) return;
    setNewAppointmentDraft(newAppointmentDraftFromDashboard(dashboard, newAppointmentPreferenceDefaults()));
  }, [dashboard, selectedPatientId, selectedSpecialty, scheduleDefaultAssistantUserId, scheduleDefaultChairId, scheduleDefaultDoctorUserId]);

  useEffect(() => {
    staffScheduleDraftsRef.current = staffScheduleDrafts;
  }, [staffScheduleDrafts]);

  useEffect(() => {
    chairScheduleDraftsRef.current = chairScheduleDrafts;
  }, [chairScheduleDrafts]);

  useEffect(() => {
    appointmentScheduleDraftsRef.current = appointmentScheduleDrafts;
  }, [appointmentScheduleDrafts]);

  useEffect(() => {
    if (!dashboard || staffScheduleDirtyIds.size === 0) return undefined;
    const dirtyStaffIds = Array.from(staffScheduleDirtyIds).filter((staffId) => staffScheduleSaveStates[staffId] !== "saving");
    if (!dirtyStaffIds.length) return undefined;
    const staffRetryingErrors = dirtyStaffIds.some((staffId) => staffScheduleSaveStates[staffId] === "error");
    const saveTimer = window.setTimeout(() => {
      dirtyStaffIds.forEach((staffId) => void saveStaffSchedule(staffId));
    }, staffRetryingErrors ? 5000 : 1200);
    return () => window.clearTimeout(saveTimer);
  }, [dashboard, staffScheduleDirtyIds, staffScheduleDrafts, staffScheduleSaveStates]);

  useEffect(() => {
    if (!dashboard || chairScheduleDirtyIds.size === 0) return undefined;
    const dirtyChairIds = Array.from(chairScheduleDirtyIds).filter((chairId) => chairScheduleSaveStates[chairId] !== "saving");
    if (!dirtyChairIds.length) return undefined;
    const chairRetryingErrors = dirtyChairIds.some((chairId) => chairScheduleSaveStates[chairId] === "error");
    const saveTimer = window.setTimeout(() => {
      dirtyChairIds.forEach((chairId) => void saveChairSchedule(chairId));
    }, chairRetryingErrors ? 5000 : 1200);
    return () => window.clearTimeout(saveTimer);
  }, [dashboard, chairScheduleDirtyIds, chairScheduleDrafts, chairScheduleSaveStates]);

  useEffect(() => {
    if (!dashboard || appointmentScheduleDirtyIds.size === 0) return undefined;
    const dirtyAppointmentIds = Array.from(appointmentScheduleDirtyIds).filter(
      (appointmentId) => appointmentScheduleSaveStates[appointmentId] !== "saving"
    );
    if (!dirtyAppointmentIds.length) return undefined;
    const appointmentRetryingErrors = dirtyAppointmentIds.some(
      (appointmentId) => appointmentScheduleSaveStates[appointmentId] === "error"
    );
    const saveTimer = window.setTimeout(() => {
      dirtyAppointmentIds.forEach((appointmentId) => void saveAppointmentSchedule(appointmentId, { closeEditorOnSave: false }));
    }, appointmentRetryingErrors ? 5000 : 1200);
    return () => window.clearTimeout(saveTimer);
  }, [dashboard, appointmentScheduleDirtyIds, appointmentScheduleDrafts, appointmentScheduleSaveStates]);

  useEffect(() => {
    if (!dashboard || typeof window === "undefined") return undefined;
    const retryScheduleAutosaves = () => {
      Array.from(staffScheduleDirtyIds).forEach((staffId) => {
        if (staffScheduleSaveStates[staffId] !== "saving") {
          void saveStaffSchedule(staffId);
        }
      });
      Array.from(chairScheduleDirtyIds).forEach((chairId) => {
        if (chairScheduleSaveStates[chairId] !== "saving") {
          void saveChairSchedule(chairId);
        }
      });
      Array.from(appointmentScheduleDirtyIds).forEach((appointmentId) => {
        if (appointmentScheduleSaveStates[appointmentId] !== "saving") {
          void saveAppointmentSchedule(appointmentId, { closeEditorOnSave: false });
        }
      });
    };
    window.addEventListener("online", retryScheduleAutosaves);
    return () => window.removeEventListener("online", retryScheduleAutosaves);
  }, [
    dashboard,
    staffScheduleDirtyIds,
    staffScheduleSaveStates,
    chairScheduleDirtyIds,
    chairScheduleSaveStates,
    appointmentScheduleDirtyIds,
    appointmentScheduleSaveStates
  ]);

  useEffect(() => {
    // Do not auto-save clinic profile while onboarding wizard is open —
    // auto-save triggers setClinicProfileDraft which re-renders the form
    // and destroys mid-edit DOM nodes (phone input disappears mid-fill).
    if (!onboardingDismissed) return undefined;
    if (!dashboard || !clinicProfileDirty || clinicProfileSaveState === "saving" || !clinicProfileDraft.clinicName.trim()) {
      return undefined;
    }
    const saveTimer = window.setTimeout(() => {
      void saveClinicProfileFromDraft();
    }, 1400);
    return () => window.clearTimeout(saveTimer);
  }, [clinicProfileDraft, clinicProfileDirty, clinicProfileSaveState, dashboard, onboardingDismissed]);

  useEffect(() => {
    setNewStaffSpecialty(selectedSpecialty);
  }, [selectedSpecialty]);

  useEffect(() => {
    setBrowserDirectoryPickerAvailable(
      typeof window !== "undefined" && typeof (window as BrowserDirectoryPickerWindow).showDirectoryPicker === "function"
    );
    const input = browserDirectoryInputRef.current;
    if (input) {
      input.setAttribute("webkitdirectory", "");
      input.setAttribute("directory", "");
    }
    const migrationInput = browserMigrationInputRef.current;
    if (migrationInput) {
      migrationInput.setAttribute("webkitdirectory", "");
      migrationInput.setAttribute("directory", "");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      const recovered = await loadLocalDicomWorkbenchDraft(activeOrganizationId);
      if (cancelled) return;
      if (recovered) {
        applyDicomWorkbenchManifest(recovered.manifest);
        setDicomWorkbenchLocalSavedAt(recovered.clientSavedAt);
      }
      void loadDicomWorkbenchBundles({ silent: true, restoreLatest: !recovered });
    };
    void restore();
    return () => {
      cancelled = true;
    };
  }, [activeOrganizationId]);

  useEffect(() => {
    const organizationId = activeOrganizationId?.trim() ?? "";
    if (!organizationId || localImagingRecoveryHydratedOrganizationIdRef.current === organizationId) return;
    localImagingRecoveryHydratedOrganizationIdRef.current = organizationId;
    const localFolderDraft = loadLocalImagingFolderDraft(organizationId);
    setLocalImagingFolderDraft(localFolderDraft);
    setImagingFolderPath(localFolderDraft?.folderPath ?? "C:\\Images");
    setBrowserPickedImagingFolder(loadBrowserPickedImagingFolderPreview(organizationId));
  }, [activeOrganizationId]);

  useEffect(() => {
    if (currentView === "settings" && settingsTab === "audit") {
      void loadPersistenceHealth({ silent: true });
      void refreshBrowserContinuity({ silent: true });
      void loadLocalBridgeUsePlans({ silent: true });
    }
  }, [currentView, settingsTab]);

  useEffect(() => {
    if ((currentView === "settings" && settingsTab === "telegram") || (!onboardingDismissed && onboardingStep === "telegram")) {
      void loadTelegramControlPlane({ silent: true });
    }
  }, [
    currentView,
    settingsTab,
    onboardingDismissed,
    onboardingStep,
    telegramOutboxStatusFilter,
    telegramOutboxTemplateFilter,
    telegramModeDraft,
    telegramBotConfigId,
    dashboard?.clinicSettings.profile?.organizationId
  ]);

  useEffect(() => {
    if (currentView === "settings") {
      setOnboardingGuideExpanded(settingsTab === "clinic");
      activeSettingsTabButtonRef.current?.scrollIntoView({ behavior: "auto", inline: "center", block: "nearest" });
    } else {
      setOnboardingGuideExpanded(false);
    }
  }, [currentView, settingsTab]);

  useEffect(() => {
    const syncView = () => {
      const nextView = viewFromHash();
      setCurrentView(nextView);
      if (nextView === "settings") {
        setSettingsTab(settingsTabFromHash());
      }
    };
    syncView();
    window.addEventListener("hashchange", syncView);
    return () => window.removeEventListener("hashchange", syncView);
  }, []);

  useEffect(() => {
    const allowedViews = getFilteredAppViews(selectedWorkspaceRole);
    if (!allowedViews.includes(currentView)) {
      const fallbackView = allowedViews.includes("shift") ? "shift" : (allowedViews[0] || "schedule");
      setCurrentView(fallbackView);
      window.location.hash = fallbackView;
    }
  }, [selectedWorkspaceRole, currentView]);

  useEffect(() => scheduleIdleWorkspacePreload(currentView), [currentView]);

  useEffect(() => {
    const telegramHandoffTarget = initialTelegramHandoffTargetRef.current ?? readDenteTelegramHandoffTarget();
    if (!telegramHandoffTarget) return;
    setTelegramHandoffNotice(telegramHandoffTarget);
    stripDenteTelegramHandoffQuery(telegramHandoffTarget);
  }, []);

  useEffect(() => {
    if (!uiPreferencesHydrated) return;
    const telegramHandoffTarget = initialTelegramHandoffTargetRef.current ?? readDenteTelegramHandoffTarget();
    if (!telegramHandoffTarget) return;
    setCurrentView(telegramHandoffTarget.view);
    if (telegramHandoffTarget.documentKind) {
      setSelectedDocumentKind(telegramHandoffTarget.documentKind);
    }
    setTelegramHandoffNotice(telegramHandoffTarget);
    stripDenteTelegramHandoffQuery(telegramHandoffTarget);
  }, [uiPreferencesHydrated]);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const status = await inspectBrowserContinuity();
      if (!cancelled) setBrowserContinuity(status);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const onControllerChange = () => void refresh();
    void refresh();
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    navigator.serviceWorker?.addEventListener("controllerchange", onControllerChange);
    return () => {
      cancelled = true;
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
      navigator.serviceWorker?.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  useEffect(() => {
    void refreshPendingVisitSaveState();
    void refreshPendingSpeechChunkState();
    const markOnline = () => {
      setIsOnline(true);
      void flushPendingVisitSaves({ silent: true });
      void flushPendingSpeechChunks({ silent: true });
      if (lastLocalSavedAt) void syncVisitDraftAutosave(lastLocalSavedAt, { silent: true });
    };
    const markOffline = () => setIsOnline(false);
    const refreshFromStorage = () => {
      void refreshPendingVisitSaveState();
      void refreshPendingSpeechChunkState();
    };
    window.addEventListener("online", markOnline);
    window.addEventListener("offline", markOffline);
    window.addEventListener("storage", refreshFromStorage);
    const syncTimer = window.setTimeout(() => {
      void flushPendingVisitSaves({ silent: true });
      void flushPendingSpeechChunks({ silent: true });
    }, 700);
    return () => {
      window.removeEventListener("online", markOnline);
      window.removeEventListener("offline", markOffline);
      window.removeEventListener("storage", refreshFromStorage);
      window.clearTimeout(syncTimer);
    };
  }, [activeOrganizationId, dashboard?.activeVisit.id, lastLocalSavedAt]);

  useEffect(() => {
    if (!dashboard) return;
    void loadSpeechRecordingStrategy({ silent: true });
  }, [dashboard?.activeVisit.id, isOnline, selectedSpecialty]);

  useEffect(() => {
    if (!dashboard) return;
    let cancelled = false;
    visitDraftUserEditedRef.current = false;
    setLocalAutosaveReady(false);
    const savedDraft = loadVisitLocalDraft(dashboard.activeVisit.id, activeOrganizationId);
    const serverUpdatedAt = Date.parse(dashboard.activeVisit.updatedAt);
    const savedAt = savedDraft ? Date.parse(savedDraft.savedAt) : Number.NaN;

    if (savedDraft && Number.isFinite(savedAt) && savedAt > serverUpdatedAt) {
      setTranscript(savedDraft.transcript);
      setSelectedSpecialty(savedDraft.selectedSpecialty);
      setVisitNoteForm(savedDraft.visitNoteForm);
      setLastLocalSavedAt(savedDraft.savedAt);
      setLocalDraftWasRestored(true);
    } else {
      const defaultSpecialty = inferDashboardVisitSpecialty(dashboard);
      setSelectedSpecialty((current) => (current === "therapist" || current === "universal" ? defaultSpecialty : current));
      setVisitNoteForm(visitNoteFormFromVisit(dashboard.activeVisit));
      setLastLocalSavedAt(null);
      setLocalDraftWasRestored(false);
    }

    const restoreServerDraft = async () => {
      try {
        const result = await loadServerVisitDraft(dashboard.activeVisit.id);
        if (cancelled || !result.serverDraft) return;
        if (visitDraftUserEditedRef.current) {
          setLastServerDraftSavedAt(result.serverDraft.serverSavedAt);
          return;
        }
        const serverDraftAt = Date.parse(result.serverDraft.serverSavedAt);
        const localDraftAt = Number.isFinite(savedAt) ? savedAt : 0;
        const activeVisitAt = Number.isFinite(serverUpdatedAt) ? serverUpdatedAt : 0;
        if (Number.isFinite(serverDraftAt) && serverDraftAt > Math.max(localDraftAt, activeVisitAt)) {
          setTranscript(result.serverDraft.transcript);
          setSelectedSpecialty(result.serverDraft.selectedSpecialty);
          setVisitNoteForm(visitNoteFormFromDraft(result.serverDraft.draft));
          setLastServerDraftSavedAt(result.serverDraft.serverSavedAt);
          setLocalDraftWasRestored(true);
          lastServerDraftSignatureRef.current = visitDraftSignature(
            result.serverDraft.transcript,
            result.serverDraft.selectedSpecialty,
            visitNoteFormFromDraft(result.serverDraft.draft)
          );
        } else {
          setLastServerDraftSavedAt(result.serverDraft.serverSavedAt);
        }
      } catch {
        if (!cancelled) setServerDraftSyncState("queued");
      } finally {
        if (!cancelled) setLocalAutosaveReady(true);
      }
    };

    void restoreServerDraft();
    return () => {
      cancelled = true;
    };
  }, [activeOrganizationId, dashboard?.activeVisit.id, dashboard?.activeVisit.updatedAt]);

  useEffect(() => {
    if (!dashboard || !localAutosaveReady) return;
    const savedAt = new Date().toISOString();
    const timeout = window.setTimeout(() => {
      saveVisitLocalDraft(
        {
          version: 1,
          visitId: dashboard.activeVisit.id,
          savedAt,
          transcript,
          selectedSpecialty,
          visitNoteForm
        },
        activeOrganizationId
      );
      setLastLocalSavedAt(savedAt);
      setLocalDraftWasRestored(false);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [activeOrganizationId, dashboard?.activeVisit.id, localAutosaveReady, selectedSpecialty, transcript, visitNoteForm]);

  useEffect(() => {
    if (!dashboard || !localAutosaveReady || !lastLocalSavedAt) return;
    const timeout = window.setTimeout(() => {
      void syncVisitDraftAutosave(lastLocalSavedAt, { silent: true });
    }, 1600);
    return () => window.clearTimeout(timeout);
  }, [dashboard?.activeVisit.id, isOnline, lastLocalSavedAt, localAutosaveReady, selectedSpecialty, transcript, visitNoteForm]);

  const sortedAppointments = useMemo(() => {
    if (!dashboard) return [];
    return dashboard.appointments
      .filter((appointment) => {
        if (scheduleDoctorFilterId && appointment.doctorUserId !== scheduleDoctorFilterId) return false;
        if (scheduleAssistantFilterId && appointment.assistantUserId !== scheduleAssistantFilterId) return false;
        if (scheduleChairFilterId && appointment.chairId !== scheduleChairFilterId) return false;
        if (scheduleStatusFilter !== "all" && appointment.status !== scheduleStatusFilter) return false;
        if (scheduleDateFilter) {
          const localAppointmentDate = toDateTimeLocalValue(appointment.startsAt, dashboard?.clinicSettings.profile?.timezone).slice(0, 10);
          if (localAppointmentDate !== scheduleDateFilter) return false;
        }
        return true;
      })
      .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  }, [dashboard, scheduleAssistantFilterId, scheduleChairFilterId, scheduleDateFilter, scheduleDoctorFilterId, scheduleStatusFilter]);

  const activePatient = useMemo(() => {
    if (!dashboard) return null;
    return (
      findPatient(dashboard.patients, dashboard.activeVisit.patientId) ??
      dashboard.patients.find((patient) => patient.status === "active") ??
      null
    );
  }, [dashboard]);

  useEffect(() => {
    if (!dashboard) return;
    setSelectedPatientId((current: any) =>
      current && dashboard.patients.some((patient) => patient.id === current)
        ? current
        : activePatient?.id ?? null
    );
  }, [activePatient?.id, dashboard?.patients.length]);

  const selectedPatient = useMemo(() => {
    if (!dashboard) return null;
    return (
      (selectedPatientId ? findPatient(dashboard.patients, selectedPatientId) : null) ??
      activePatient
    );
  }, [activePatient, dashboard, selectedPatientId]);
  const documentPatient = selectedPatient ?? activePatient;
  const documentPatientMatchesActiveVisit = Boolean(documentPatient && dashboard?.activeVisit.patientId === documentPatient.id);
  const paymentPatientContextReady = Boolean(documentPatient && documentPatientMatchesActiveVisit);
  const paymentPatientContextMessage = !documentPatient
    ? "Выберите пациента текущего приема перед записью оплаты."
    : !documentPatientMatchesActiveVisit
      ? `Сейчас выбран пациент ${documentPatient.fullName}, но активный прием открыт для другого пациента. Переключите активный прием перед записью оплаты.`
      : "";

  useEffect(() => {
    setPaymentFeedback("");
    setPaymentPayerFullName("");
    setPaymentPayerInn("");
    setPaymentPayerBirthDate("");
    setPaymentPayerIdentityDocument("");
    setPaymentPayerRelationship("пациент");
    setPaymentTaxDeductionCode("");
  }, [documentPatient?.id]);

  useEffect(() => {
    setPatientCoreDraft(patientCoreDraftFromPatient(selectedPatient));
    setPatientCoreSaveState("idle");
    setPatientCoreDirty(false);
  }, [selectedPatient?.id, selectedPatient?.updatedAt]);

  useEffect(() => {
    setPatientAdministrativeProfileDraft(patientAdministrativeProfileDraftFromPatient(selectedPatient));
    setPatientAdministrativeProfileSaveState("idle");
    setPatientAdministrativeProfileDirty(false);
  }, [selectedPatient?.id, selectedPatient?.updatedAt]);

  useEffect(() => {
    clinicProfileDraftRef.current = clinicProfileDraft;
  }, [clinicProfileDraft]);

  useEffect(() => {
    patientCoreDraftRef.current = patientCoreDraft;
  }, [patientCoreDraft]);

  useEffect(() => {
    patientAdministrativeProfileDraftRef.current = patientAdministrativeProfileDraft;
  }, [patientAdministrativeProfileDraft]);

  const patientAdministrativeProfileValidationMessage = useMemo(
    () => patientAdministrativeProfileDraftIssue(patientAdministrativeProfileDraft),
    [patientAdministrativeProfileDraft]
  );

  useEffect(() => {
    if (
      !selectedPatient ||
      !patientAdministrativeProfileDirty ||
      patientAdministrativeProfileSaveState === "saving" ||
      patientAdministrativeProfileValidationMessage
    ) {
      return undefined;
    }
    const saveTimer = window.setTimeout(() => {
      void savePatientAdministrativeProfile();
    }, 1400);
    return () => window.clearTimeout(saveTimer);
  }, [
    selectedPatient?.id,
    patientAdministrativeProfileDirty,
    patientAdministrativeProfileDraft,
    patientAdministrativeProfileSaveState,
    patientAdministrativeProfileValidationMessage
  ]);

  const activeAppointment = useMemo(() => {
    if (!dashboard) return null;
    return dashboard.appointments.find((appointment) => appointment.id === dashboard.activeVisit.appointmentId) ?? null;
  }, [dashboard]);

  const activeDoctor = useMemo(() => {
    if (!dashboard || !activeAppointment) return null;
    return dashboard?.clinicSettings.staff.find((member) => member.id === activeAppointment.doctorUserId && member.active) ?? null;
  }, [activeAppointment, dashboard]);

  const telegramLinkStaffOptions = useMemo(
    () => dashboard?.clinicSettings.staff.filter((member) => member.active) ?? [],
    [dashboard]
  );

  const filteredTelegramOutboxItems = useMemo(() => {
    const items = telegramOutbox?.items ?? [];
    return items.filter((item) => {
      if (telegramOutboxStatusFilter === "due") {
        if (item.deliveryStatus !== "ready" || !isTelegramOutboxItemDueForUi(item)) return false;
      } else if (telegramOutboxStatusFilter !== "all" && item.deliveryStatus !== telegramOutboxStatusFilter) {
        return false;
      }
      if (telegramOutboxTemplateFilter !== "all" && item.templateKind !== telegramOutboxTemplateFilter) return false;
      return true;
    });
  }, [telegramOutbox, telegramOutboxStatusFilter, telegramOutboxTemplateFilter]);

  const visibleTelegramOutboxItems = filteredTelegramOutboxItems;
  const hiddenTelegramOutboxItemCount = Math.max(
    0,
    (telegramOutbox?.filteredCount ?? filteredTelegramOutboxItems.length) - visibleTelegramOutboxItems.length
  );

  useEffect(() => {
    if (!dashboard) return;
    if (telegramLinkStaffId && telegramLinkStaffOptions.some((member) => member.id === telegramLinkStaffId)) return;
    setTelegramLinkStaffId(telegramLinkStaffOptions[0]?.id ?? "");
  }, [dashboard, telegramLinkStaffId, telegramLinkStaffOptions]);

  const telegramLinkTargetKey = `${telegramLinkSubjectType}:${telegramLinkSubjectType === "patient" ? activePatient?.id ?? "" : telegramLinkStaffId || ""}:${telegramModeDraft}:${telegramBotConfigId.trim()}`;
  const previousTelegramLinkTargetKeyRef = useRef(telegramLinkTargetKey);

  useEffect(() => {
    if (previousTelegramLinkTargetKeyRef.current === telegramLinkTargetKey) return;
    previousTelegramLinkTargetKeyRef.current = telegramLinkTargetKey;
    if (!telegramLinkCode && !telegramLinkActionState) return;
    setTelegramLinkCode(null);
    setTelegramLinkActionState(null);
  }, [telegramLinkActionState, telegramLinkCode, telegramLinkTargetKey]);

  function telegramSubjectName(subjectType: DenteTelegramChatLinkPublic["subjectType"], subjectId: string): string {
    if (subjectType === "patient") {
      return dashboard?.patients.find((patient) => patient.id === subjectId)?.fullName ?? "Пациент";
    }
    return dashboard?.clinicSettings.staff.find((member) => member.id === subjectId)?.fullName ?? "Сотрудник";
  }

  const activeChair = useMemo(() => {
    if (!dashboard || !activeAppointment) return null;
    return dashboard?.clinicSettings.chairs.find((chair) => chair.id === activeAppointment.chairId && chair.active) ?? null;
  }, [activeAppointment, dashboard]);

  const patientInsightById = useMemo(() => {
    if (!dashboard) return new Map<string, Dashboard["patientInsights"][number]>();
    return new Map(dashboard.patientInsights.map((insight) => [insight.patientId, insight]));
  }, [dashboard]);

  const activePatientInsight = activePatient ? patientInsightById.get(activePatient.id) ?? null : null;
  const activePatientCallablePhone = activePatient?.phone?.trim().replace(/[^\d+]/g, "") ?? "";
  const activePatientHasCallablePhone = activePatientCallablePhone.length >= 5;

  const appointmentReadinessById = useMemo(() => {
    if (!dashboard) return new Map<string, Dashboard["appointmentReadiness"][number]>();
    return new Map(dashboard.appointmentReadiness.map((readiness) => [readiness.appointmentId, readiness]));
  }, [dashboard]);

  const filteredPatients = useMemo(() => {
    if (!dashboard) return [];
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return dashboard.patients;
    return dashboard.patients.filter((patient) => {
      return `${patient.fullName} ${patient.phone ?? ""}`.toLowerCase().includes(normalizedQuery);
    });
  }, [dashboard, query]);

  const activeDocuments = useMemo(() => {
    if (!dashboard || !documentPatient) return [];
    return dashboard.documents.filter(
      (document) =>
        document.patientId === documentPatient.id &&
        (!documentPatientMatchesActiveVisit || document.visitId === null || document.visitId === dashboard.activeVisit.id)
    );
  }, [dashboard, documentPatient?.id, documentPatientMatchesActiveVisit]);

  const activeUsableDocuments = useMemo(() => {
    return activeDocuments.filter((document) => document.status !== "voided");
  }, [activeDocuments]);

  const documentIssueConfirmation = useMemo(() => {
    if (!documentIssueConfirmationId) return null;
    return activeDocuments.find((document) => document.id === documentIssueConfirmationId && document.status === "draft") ?? null;
  }, [activeDocuments, documentIssueConfirmationId]);

  const documentVoidConfirmation = useMemo(() => {
    if (!documentVoidConfirmationId) return null;
    return activeDocuments.find((document) => document.id === documentVoidConfirmationId && document.status !== "voided") ?? null;
  }, [activeDocuments, documentVoidConfirmationId]);

  const documentIssueAttestationReady = useMemo(() => {
    return Boolean(
      documentIssueConfirmation &&
        documentIssueSignedAt.trim() &&
        documentIssueRecipientFullName.trim() &&
        documentIssueRecipientRole.trim() &&
        documentIssueStaffFullName.trim() &&
        documentIssueStaffRole.trim() &&
        documentIssueIdentityChecked &&
        documentIssueDocumentOpenedAndChecked &&
        documentIssueRecipientSigned &&
        documentIssueClinicSigned
    );
  }, [
    documentIssueClinicSigned,
    documentIssueConfirmation,
    documentIssueDocumentOpenedAndChecked,
    documentIssueIdentityChecked,
    documentIssueRecipientFullName,
    documentIssueRecipientRole,
    documentIssueRecipientSigned,
    documentIssueSignedAt,
    documentIssueStaffFullName,
    documentIssueStaffRole
  ]);

  const documentVoidReady = useMemo(() => {
    return Boolean(
      documentVoidConfirmation &&
        documentVoidReasonText.trim().length >= 12 &&
        documentVoidStaffFullName.trim() &&
        documentVoidStaffRole.trim() &&
        documentVoidArchivePreserved &&
        documentVoidStatusReviewed
    );
  }, [
    documentVoidArchivePreserved,
    documentVoidConfirmation,
    documentVoidReasonText,
    documentVoidStaffFullName,
    documentVoidStaffRole,
    documentVoidStatusReviewed
  ]);

  useEffect(() => {
    saveDocumentIssueSignatureDraft(
      dashboard?.clinicSettings.profile?.organizationId ?? null,
      documentIssueSignatureMode,
      documentIssueStaffFullName,
      documentIssueStaffRole
    );
  }, [dashboard?.clinicSettings.profile?.organizationId, documentIssueSignatureMode, documentIssueStaffFullName, documentIssueStaffRole]);

  const activeIssuedPaidContracts = useMemo(() => {
    return activeDocuments
      .filter((document) => document.kind === "paid_medical_services_contract" && document.status === "issued" && document.visitId !== null)
      .sort((left, right) => (right.issuedAt ?? "").localeCompare(left.issuedAt ?? ""));
  }, [activeDocuments]);

  const selectedCompletedActContractDocumentId = useMemo(() => {
    if (activeIssuedPaidContracts.some((document) => document.id === completedActLinkedContractDocumentId)) {
      return completedActLinkedContractDocumentId;
    }
    return activeIssuedPaidContracts.length === 1 ? activeIssuedPaidContracts[0]?.id ?? "" : "";
  }, [activeIssuedPaidContracts, completedActLinkedContractDocumentId]);

  useEffect(() => {
    if (completedActContractNumber.trim() || !selectedCompletedActContractDocumentId) return;
    const contract = activeIssuedPaidContracts.find((document) => document.id === selectedCompletedActContractDocumentId);
    if (contract) setCompletedActContractNumber(completedActContractReferenceForUi(contract));
  }, [activeIssuedPaidContracts, completedActContractNumber, selectedCompletedActContractDocumentId]);

  const issuedMedicalCopyRequestDocuments = useMemo(() => {
    return activeUsableDocuments
      .filter((document) => document.kind === "medical_record_copy_request" && document.status === "issued")
      .sort((left, right) => (right.issuedAt ?? "").localeCompare(left.issuedAt ?? ""));
  }, [activeUsableDocuments]);

  const selectedReleaseSourceRequestDocumentId = useMemo(() => {
    if (issuedMedicalCopyRequestDocuments.some((document) => document.id === releaseSourceRequestDocumentId)) {
      return releaseSourceRequestDocumentId;
    }
    return issuedMedicalCopyRequestDocuments.length === 1 ? issuedMedicalCopyRequestDocuments[0]?.id ?? "" : "";
  }, [issuedMedicalCopyRequestDocuments, releaseSourceRequestDocumentId]);

  useEffect(() => {
    if (!selectedReleaseSourceRequestDocumentId) {
      releaseSourceRequestAutofillRef.current = null;
      return;
    }
    if (releaseSourceRequestAutofillRef.current === selectedReleaseSourceRequestDocumentId) return;
    const sourceDocument = issuedMedicalCopyRequestDocuments.find((document) => document.id === selectedReleaseSourceRequestDocumentId);
    const request = sourceDocument?.chainSummary?.medicalRecordCopyRequest;
    if (!request) return;

    releaseSourceRequestAutofillRef.current = selectedReleaseSourceRequestDocumentId;
    setReleaseSourceRequestDocumentId(selectedReleaseSourceRequestDocumentId);
    setReleaseRecipientFullName(request.recipientFullName);
    setReleaseRecipientIdentityDocument(request.recipientIdentityDocument);
    setReleaseRecipientAuthority(request.recipientAuthority);
    setReleaseChannel(request.requestedFormat);
    setReleaseDocumentTypes(request.requestedDocumentTypes.join("\n"));
    setReleasePeriodStart(request.periodStart ?? "");
    setReleasePeriodEnd(request.periodEnd ?? "");
    setReleaseProtectionNote(
      `Выдача по запросу ${sourceDocument.title}; канал: ${medicalDocumentReleaseChannelLabels[request.requestedFormat]}. Личность получателя проверена, лишние данные третьих лиц исключаются перед передачей.`
    );
  }, [issuedMedicalCopyRequestDocuments, selectedReleaseSourceRequestDocumentId]);

  const activeTreatmentPlanItems = useMemo(() => {
    if (!dashboard || !documentPatient) return [];
    return dashboard.treatmentPlanItems.filter((item) => item.patientId === documentPatient.id);
  }, [dashboard, documentPatient?.id]);

  const inferredTreatmentArea = useMemo(() => {
    const toothCodes = activeTreatmentPlanItems
      .filter((item) => item.status !== "cancelled")
      .map((item) => item.toothCode?.trim())
      .filter((toothCode): toothCode is string => Boolean(toothCode));
    return Array.from(new Set(toothCodes)).slice(0, 6).join(", ");
  }, [activeTreatmentPlanItems]);

  const activeTreatmentPlanScenarios = useMemo(() => {
    if (!dashboard || !documentPatient) return [];
    return dashboard.treatmentPlanScenarios.filter((scenario) => scenario.patientId === documentPatient.id);
  }, [dashboard, documentPatient?.id]);

  const activeVisitClinicalRuleEvaluations = useMemo(() => {
    if (!dashboard) return [];
    const severityRank = { blocker: 0, warning: 1, info: 2 } as const;
    return dashboard.clinicalRuleEvaluations
      .filter((evaluation) => evaluation.patientId === dashboard.activeVisit.patientId)
      .sort((left, right) => Number(left.resolved) - Number(right.resolved) || severityRank[left.severity] - severityRank[right.severity]);
  }, [dashboard]);

  const patientClinicalRuleEvaluations = useMemo(() => {
    if (!dashboard || !documentPatient) return [];
    const severityRank = { blocker: 0, warning: 1, info: 2 } as const;
    return dashboard.clinicalRuleEvaluations
      .filter((evaluation) => evaluation.patientId === documentPatient.id)
      .sort((left, right) => Number(left.resolved) - Number(right.resolved) || severityRank[left.severity] - severityRank[right.severity]);
  }, [dashboard, documentPatient?.id]);

  const activeVisitClinicalRuleSummary = useMemo(
    () => clinicalRuleSummaryForUi(activeVisitClinicalRuleEvaluations, dashboard?.clinicalRuleSummary.activeRules ?? 0),
    [activeVisitClinicalRuleEvaluations, dashboard?.clinicalRuleSummary.activeRules]
  );

  const patientClinicalRuleSummary = useMemo(
    () => clinicalRuleSummaryForUi(patientClinicalRuleEvaluations, dashboard?.clinicalRuleSummary.activeRules ?? 0),
    [patientClinicalRuleEvaluations, dashboard?.clinicalRuleSummary.activeRules]
  );

  const activePayments = useMemo(() => {
    if (!dashboard || !documentPatient) return [];
    return dashboard.payments.filter((payment) => payment.patientId === documentPatient.id);
  }, [dashboard, documentPatient?.id]);

  const patientBillingSummary = useMemo<Dashboard["billingSummary"]>(() => {
    if (!dashboard || !documentPatient) return {
      totalPlannedRub: 0,
      totalDiscountRub: 0,
      totalPaidRub: 0,
      totalDueRub: 0,
      taxDeductionEligibleRub: 0,
      draftDocumentAmountRub: 0,
      openTreatmentItems: 0,
      unpaidDocuments: 0
    };
    const activePlanItems = activeTreatmentPlanItems.filter((item) => item.status !== "cancelled");
    const treatmentLineTotal = (item: (typeof activePlanItems)[number]) => Math.max(0, item.unitPriceRub * item.quantity - item.discountRub);
    const totalPlannedRub = activePlanItems.reduce((total, item) => total + treatmentLineTotal(item), 0);
    const totalDiscountRub = activePlanItems.reduce((total, item) => total + item.discountRub, 0);
    const totalPaidRub = activePayments.filter((payment) => payment.status === "paid").reduce((total, payment) => total + payment.amountRub, 0);
    const taxDeductionEligibleRub = activePlanItems.reduce((total, item) => {
      const service = dashboard.serviceCatalog.find((candidate) => candidate.id === item.serviceId);
      return total + (service?.taxDeductible ? treatmentLineTotal(item) : 0);
    }, 0);
    const draftDocumentAmountRub = activeUsableDocuments
      .filter((document) => document.status === "draft")
      .reduce((total, document) => total + (document.totalAmountRub ?? 0), 0);
    const unpaidDocuments = activeUsableDocuments.filter(
      (document) =>
        document.status === "draft" &&
        (document.totalAmountRub ?? 0) > 0 &&
        !activePayments.some((payment) => payment.status === "paid" && payment.documentId === document.id)
    ).length;
    return {
      totalPlannedRub,
      totalDiscountRub,
      totalPaidRub,
      totalDueRub: Math.max(0, totalPlannedRub - totalPaidRub),
      taxDeductionEligibleRub,
      draftDocumentAmountRub,
      openTreatmentItems: activePlanItems.filter((item) => item.status !== "completed").length,
      unpaidDocuments
    };
  }, [activePayments, activeTreatmentPlanItems, activeUsableDocuments, dashboard, documentPatient?.id]);
  const documentLocalPersistenceOrganizationId = dashboard?.clinicSettings.profile?.organizationId ?? null;

  const taxDocumentPayerOptions = useMemo(() => {
    const optionsByKey = new Map<string, { key: string; inn: string; label: string; amountRub: number; paymentCount: number }>();
    for (const payment of activePayments) {
      const paymentTaxYear = paymentTaxYearForUi(payment);
      if (payment.status !== "paid" || paymentTaxYear !== taxDocumentYear) continue;
      const payerKey = taxPaymentPayerKeyForUi(payment);
      if (!payerKey) continue;
      const payerInn = payment.payerInn?.trim() || "";
      const payerName = payment.payerFullName?.trim() || "Плательщик";
      const payerRelationship = payment.payerRelationship?.trim();
      const payerIdentity = payment.payerIdentityDocument?.trim();
      const existing = optionsByKey.get(payerKey);
      if (existing) {
        existing.amountRub += payment.amountRub;
        existing.paymentCount += 1;
        continue;
      }
      optionsByKey.set(payerKey, {
        key: payerKey,
        inn: payerInn,
        label: payerInn
          ? `${payerName} · ИНН ${payerInn}${payerRelationship ? ` · ${payerRelationship}` : ""}`
          : `${payerName} · документ ${payerIdentity || "без ИНН"}${payerRelationship ? ` · ${payerRelationship}` : ""}`,
        amountRub: payment.amountRub,
        paymentCount: 1
      });
    }
    return Array.from(optionsByKey.values()).sort((left, right) => right.amountRub - left.amountRub || left.label.localeCompare(right.label, "ru"));
  }, [activePayments, taxDocumentYear]);

  const selectedTaxDocumentPayerKey = useMemo(() => {
    if (taxDocumentPayerOptions.some((option) => option.key === taxDocumentPayerInn)) return taxDocumentPayerInn;
    return taxDocumentPayerOptions.length === 1 ? taxDocumentPayerOptions[0]?.key ?? "" : "";
  }, [taxDocumentPayerInn, taxDocumentPayerOptions]);
  const selectedTaxDocumentPayerOption = useMemo(
    () => taxDocumentPayerOptions.find((option) => option.key === selectedTaxDocumentPayerKey) ?? null,
    [selectedTaxDocumentPayerKey, taxDocumentPayerOptions]
  );
  const selectedTaxDocumentPayerInn = selectedTaxDocumentPayerOption?.inn ?? "";

  const selectedDocumentUsesTaxPaymentSelection = taxPaymentSelectionDocumentKinds.has(selectedDocumentKind);
  const selectedDocumentMetadata = documentKindMetadata[selectedDocumentKind];
  const eligibleTaxPayments = useMemo(() => {
    return activePayments
      .filter(
        (payment) =>
          payment.status === "paid" &&
          payment.amountRub > 0 &&
          paymentTaxYearForUi(payment) === taxDocumentYear &&
          (!selectedTaxDocumentPayerKey || taxPaymentPayerKeyForUi(payment) === selectedTaxDocumentPayerKey)
      )
      .sort((left, right) => (right.fiscalReceiptIssuedAt || right.paidAt || "").localeCompare(left.fiscalReceiptIssuedAt || left.paidAt || ""));
  }, [activePayments, selectedTaxDocumentPayerKey, taxDocumentYear]);
  const eligibleTaxPaymentIdsKey = eligibleTaxPayments.map((payment) => payment.id).join("|");
  const selectedTaxPaymentIdSet = useMemo(() => new Set(selectedTaxPaymentIds), [selectedTaxPaymentIds]);
  const selectedEligibleTaxPayments = useMemo(
    () => eligibleTaxPayments.filter((payment) => selectedTaxPaymentIdSet.has(payment.id)),
    [eligibleTaxPayments, selectedTaxPaymentIdSet]
  );
  const selectedTaxPaymentTotalRub = selectedEligibleTaxPayments.reduce((total, payment) => total + payment.amountRub, 0);
  function selectedTaxPaymentIdsForCurrentDocument(): string[] {
    const eligibleTaxPaymentIdSet = new Set(eligibleTaxPayments.map((payment) => payment.id));
    return selectedTaxPaymentIds.filter((paymentId) => eligibleTaxPaymentIdSet.has(paymentId));
  }

  function selectAllEligibleTaxPaymentsForCurrentDocument(): void {
    const eligiblePaymentIds = eligibleTaxPayments.map((payment) => payment.id);
    setSelectedTaxPaymentIds(eligiblePaymentIds);
  }
  const selectedDocumentUsesPaymentReceiptSelection = selectedDocumentKind === "payment_receipt";
  const eligiblePaymentReceiptPayments = useMemo(() => {
    return activePayments
      .filter(
        (payment) =>
          payment.status === "paid" &&
          payment.amountRub > 0 &&
          (!dashboard?.activeVisit.id || payment.visitId === dashboard.activeVisit.id)
      )
      .sort((left, right) => (right.fiscalReceiptIssuedAt || right.paidAt || "").localeCompare(left.fiscalReceiptIssuedAt || left.paidAt || ""));
  }, [activePayments, dashboard?.activeVisit.id]);
  const eligiblePaymentReceiptIdsKey = eligiblePaymentReceiptPayments.map((payment) => payment.id).join("|");
  const selectedPaymentReceiptIdSet = useMemo(() => new Set(selectedPaymentReceiptIds), [selectedPaymentReceiptIds]);
  const selectedPaymentReceiptPayments = useMemo(
    () => eligiblePaymentReceiptPayments.filter((payment) => selectedPaymentReceiptIdSet.has(payment.id)),
    [eligiblePaymentReceiptPayments, selectedPaymentReceiptIdSet]
  );
  const selectedPaymentReceiptTotalRub = selectedPaymentReceiptPayments.reduce((total, payment) => total + payment.amountRub, 0);
  const eligibleRefundCorrectionPayments = useMemo(() => {
    return activePayments
      .filter(
        (payment) =>
          payment.status === "paid" &&
          payment.amountRub > 0 &&
          payment.fiscalReceiptNumber?.trim() &&
          (!dashboard?.activeVisit.id || payment.visitId === dashboard.activeVisit.id)
      )
      .sort((left, right) => (right.fiscalReceiptIssuedAt || right.paidAt || "").localeCompare(left.fiscalReceiptIssuedAt || left.paidAt || ""));
  }, [activePayments, dashboard?.activeVisit.id]);
  const selectedRefundCorrectionPayment = useMemo(
    () => eligibleRefundCorrectionPayments.find((payment) => payment.id === refundSelectedPaymentId) ?? null,
    [eligibleRefundCorrectionPayments, refundSelectedPaymentId]
  );
  const taxPaymentSelectionPersistenceKey = useMemo(() => {
    if (!documentPatient) return null;
    const organizationId = documentLocalPersistenceOrganizationId ?? "clinic";
    const payerKey = selectedTaxDocumentPayerKey || "all-payers";
    return `tax:${organizationId}:${documentPatient.id}:${taxDocumentYear}:${payerKey}`;
  }, [documentLocalPersistenceOrganizationId, documentPatient?.id, selectedTaxDocumentPayerKey, taxDocumentYear]);
  const paymentReceiptSelectionPersistenceKey = useMemo(() => {
    if (!documentPatient) return null;
    const organizationId = documentLocalPersistenceOrganizationId ?? "clinic";
    return `receipt:${organizationId}:${documentPatient.id}:${dashboard?.activeVisit.id ?? "all-visits"}`;
  }, [dashboard?.activeVisit.id, documentLocalPersistenceOrganizationId, documentPatient?.id]);

  function selectRefundOriginalPayment(paymentId: string): void {
    setRefundSelectedPaymentId(paymentId);
    const payment = eligibleRefundCorrectionPayments.find((candidate) => candidate.id === paymentId);
    if (!payment) return;
    setRefundOriginalFiscalReceiptNumber(payment.fiscalReceiptNumber?.trim() || "");
    const currentAmountRub = normalizeRubAmountInput(refundAmountRub);
    if (currentAmountRub === null || currentAmountRub <= 0 || currentAmountRub > payment.amountRub) {
      setRefundAmountRub(String(payment.amountRub));
    }
    if (!refundRecipientFullName.trim() && payment.payerFullName?.trim()) {
      setRefundRecipientFullName(payment.payerFullName.trim());
    }
    if (!refundRecipientIdentityDocument.trim() && payment.payerIdentityDocument?.trim()) {
      setRefundRecipientIdentityDocument(payment.payerIdentityDocument.trim());
    }
  }

  useEffect(() => {
    if (!refundSelectedPaymentId) return;
    if (eligibleRefundCorrectionPayments.some((payment) => payment.id === refundSelectedPaymentId)) return;
    setRefundSelectedPaymentId("");
  }, [eligibleRefundCorrectionPayments, refundSelectedPaymentId]);
  const outpatient025uDraftVisitId = documentPatientMatchesActiveVisit ? dashboard?.activeVisit.id ?? null : null;
  const medicalRecordExtractDraftVisitId = documentPatientMatchesActiveVisit ? dashboard?.activeVisit.id ?? null : null;
  const outpatient025uDraftPersistenceKey = useMemo(
    () =>
      documentPayloadDraftKey(
        "outpatient_medical_card_025u",
        documentLocalPersistenceOrganizationId,
        documentPatient?.id ?? null,
        outpatient025uDraftVisitId
      ),
    [documentLocalPersistenceOrganizationId, documentPatient?.id, outpatient025uDraftVisitId]
  );
  const medicalRecordExtractDraftPersistenceKey = useMemo(
    () =>
      documentPayloadDraftKey(
        "medical_record_extract",
        documentLocalPersistenceOrganizationId,
        documentPatient?.id ?? null,
        medicalRecordExtractDraftVisitId
      ),
    [documentLocalPersistenceOrganizationId, documentPatient?.id, medicalRecordExtractDraftVisitId]
  );

  function currentOutpatient025uDocumentDraftFields(): Outpatient025uDocumentDraftFields {
    return {
      recordExtractPeriodStart,
      recordExtractPeriodEnd,
      recordExtractSourceVisitIds,
      recordExtractComplaintAndAnamnesis,
      recordExtractObjectiveStatus,
      recordExtractDiagnosis,
      recordExtractTreatmentProvided,
      recordExtractRecommendations,
      recordExtractDoctorFullName,
      recordExtractPreparedFromSignedRecords,
      outpatient025uMedicalCardNumber,
      outpatient025uOpenedAt,
      outpatient025uPatientSexCode,
      outpatient025uCitizenship,
      outpatient025uRegistrationUrbanRuralCode,
      outpatient025uStayUrbanRuralCode,
      outpatient025uOmsIssuedAt,
      outpatient025uInsurerName,
      outpatient025uSocialSupportCode,
      outpatient025uHealthStatusDisclosureContact,
      outpatient025uEmploymentCode,
      outpatient025uDisabilityGroup,
      outpatient025uWorkOrStudyPlace,
      outpatient025uPalliativeCareNeedCode,
      outpatient025uBloodGroup,
      outpatient025uRhFactor,
      outpatient025uKellK1,
      outpatient025uOtherBloodData,
      outpatient025uAllergyHistory,
      outpatient025uFinalEpicrisis,
      outpatient025uOfficialForm274nChecked,
      outpatient025uThirdPartyDataChecked
    };
  }

  function applyOutpatient025uDocumentDraftFields(fields: Outpatient025uDocumentDraftFields): void {
    setRecordExtractPeriodStart(fields.recordExtractPeriodStart);
    setRecordExtractPeriodEnd(fields.recordExtractPeriodEnd);
    setRecordExtractSourceVisitIds(fields.recordExtractSourceVisitIds);
    setRecordExtractComplaintAndAnamnesis(fields.recordExtractComplaintAndAnamnesis);
    setRecordExtractObjectiveStatus(fields.recordExtractObjectiveStatus);
    setRecordExtractDiagnosis(fields.recordExtractDiagnosis);
    setRecordExtractTreatmentProvided(fields.recordExtractTreatmentProvided);
    setRecordExtractRecommendations(fields.recordExtractRecommendations);
    setRecordExtractDoctorFullName(fields.recordExtractDoctorFullName);
    setRecordExtractPreparedFromSignedRecords(fields.recordExtractPreparedFromSignedRecords);
    setOutpatient025uMedicalCardNumber(fields.outpatient025uMedicalCardNumber);
    setOutpatient025uOpenedAt(fields.outpatient025uOpenedAt);
    setOutpatient025uPatientSexCode(fields.outpatient025uPatientSexCode);
    setOutpatient025uCitizenship(fields.outpatient025uCitizenship);
    setOutpatient025uRegistrationUrbanRuralCode(fields.outpatient025uRegistrationUrbanRuralCode);
    setOutpatient025uStayUrbanRuralCode(fields.outpatient025uStayUrbanRuralCode);
    setOutpatient025uOmsIssuedAt(fields.outpatient025uOmsIssuedAt);
    setOutpatient025uInsurerName(fields.outpatient025uInsurerName);
    setOutpatient025uSocialSupportCode(fields.outpatient025uSocialSupportCode);
    setOutpatient025uHealthStatusDisclosureContact(fields.outpatient025uHealthStatusDisclosureContact);
    setOutpatient025uEmploymentCode(fields.outpatient025uEmploymentCode);
    setOutpatient025uDisabilityGroup(fields.outpatient025uDisabilityGroup);
    setOutpatient025uWorkOrStudyPlace(fields.outpatient025uWorkOrStudyPlace);
    setOutpatient025uPalliativeCareNeedCode(fields.outpatient025uPalliativeCareNeedCode);
    setOutpatient025uBloodGroup(fields.outpatient025uBloodGroup);
    setOutpatient025uRhFactor(fields.outpatient025uRhFactor);
    setOutpatient025uKellK1(fields.outpatient025uKellK1);
    setOutpatient025uOtherBloodData(fields.outpatient025uOtherBloodData);
    setOutpatient025uAllergyHistory(fields.outpatient025uAllergyHistory);
    setOutpatient025uFinalEpicrisis(fields.outpatient025uFinalEpicrisis);
    setOutpatient025uOfficialForm274nChecked(fields.outpatient025uOfficialForm274nChecked);
    setOutpatient025uThirdPartyDataChecked(fields.outpatient025uThirdPartyDataChecked);
  }

  function currentMedicalRecordExtractDocumentDraftFields(): MedicalRecordExtractDocumentDraftFields {
    return {
      recordExtractPeriodStart,
      recordExtractPeriodEnd,
      recordExtractSourceVisitIds,
      recordExtractComplaintAndAnamnesis,
      recordExtractObjectiveStatus,
      recordExtractDiagnosis,
      recordExtractTreatmentProvided,
      recordExtractRecommendations,
      recordExtractDoctorFullName,
      recordExtractRecipientFullName,
      recordExtractRecipientAuthority,
      recordExtractIssuedAt,
      recordExtractPreparedFromSignedRecords,
      recordExtractThirdPartyDataChecked
    };
  }

  function applyMedicalRecordExtractDocumentDraftFields(fields: MedicalRecordExtractDocumentDraftFields): void {
    setRecordExtractPeriodStart(fields.recordExtractPeriodStart);
    setRecordExtractPeriodEnd(fields.recordExtractPeriodEnd);
    setRecordExtractSourceVisitIds(fields.recordExtractSourceVisitIds);
    setRecordExtractComplaintAndAnamnesis(fields.recordExtractComplaintAndAnamnesis);
    setRecordExtractObjectiveStatus(fields.recordExtractObjectiveStatus);
    setRecordExtractDiagnosis(fields.recordExtractDiagnosis);
    setRecordExtractTreatmentProvided(fields.recordExtractTreatmentProvided);
    setRecordExtractRecommendations(fields.recordExtractRecommendations);
    setRecordExtractDoctorFullName(fields.recordExtractDoctorFullName);
    setRecordExtractRecipientFullName(fields.recordExtractRecipientFullName);
    setRecordExtractRecipientAuthority(fields.recordExtractRecipientAuthority);
    setRecordExtractIssuedAt(fields.recordExtractIssuedAt);
    setRecordExtractPreparedFromSignedRecords(fields.recordExtractPreparedFromSignedRecords);
    setRecordExtractThirdPartyDataChecked(fields.recordExtractThirdPartyDataChecked);
  }

  const selectedTaxApplicationPayment = useMemo(() => {
    if (!selectedTaxDocumentPayerKey) return null;
    return (
      activePayments.find(
        (payment) =>
          payment.status === "paid" &&
          taxPaymentPayerKeyForUi(payment) === selectedTaxDocumentPayerKey &&
          paymentTaxYearForUi(payment) === taxDocumentYear
      ) ?? null
    );
  }, [activePayments, selectedTaxDocumentPayerKey, taxDocumentYear]);

  useEffect(() => {
    if (taxDocumentYear < 2024 && taxApplicationForm !== "legacy_2021_2023") {
      setTaxApplicationForm("legacy_2021_2023");
      return;
    }
    if (taxDocumentYear >= 2024 && taxApplicationForm === "legacy_2021_2023") {
      setTaxApplicationForm("knd_1151156");
    }
  }, [taxDocumentYear, taxApplicationForm]);

  useEffect(() => {
    if (!selectedDocumentUsesTaxPaymentSelection || !taxPaymentSelectionPersistenceKey) {
      taxPaymentSelectionHydratedKeyRef.current = null;
      return;
    }
    const eligibleTaxPaymentIdSet = new Set(eligibleTaxPayments.map((payment) => payment.id));
    const storedPaymentIds = loadDocumentPaymentSelection(documentLocalPersistenceOrganizationId, taxPaymentSelectionPersistenceKey);
    const nextPaymentIds = (storedPaymentIds ?? []).filter((paymentId) => eligibleTaxPaymentIdSet.has(paymentId));
    setSelectedTaxPaymentIds(nextPaymentIds);
    taxPaymentSelectionHydratedKeyRef.current = taxPaymentSelectionPersistenceKey;
  }, [documentLocalPersistenceOrganizationId, eligibleTaxPaymentIdsKey, selectedDocumentUsesTaxPaymentSelection, taxPaymentSelectionPersistenceKey]);

  useEffect(() => {
    if (!selectedDocumentUsesTaxPaymentSelection || !taxPaymentSelectionPersistenceKey) return;
    if (taxPaymentSelectionHydratedKeyRef.current !== taxPaymentSelectionPersistenceKey) return;
    saveDocumentPaymentSelection(
      documentLocalPersistenceOrganizationId,
      taxPaymentSelectionPersistenceKey,
      selectedTaxPaymentIdsForCurrentDocument()
    );
  }, [
    documentLocalPersistenceOrganizationId,
    eligibleTaxPaymentIdsKey,
    selectedDocumentUsesTaxPaymentSelection,
    selectedTaxPaymentIds,
    taxPaymentSelectionPersistenceKey
  ]);

  useEffect(() => {
    if (!selectedDocumentUsesPaymentReceiptSelection || !paymentReceiptSelectionPersistenceKey) {
      paymentReceiptSelectionHydratedKeyRef.current = null;
      return;
    }
    const eligiblePaymentReceiptIdSet = new Set(eligiblePaymentReceiptPayments.map((payment) => payment.id));
    const storedPaymentIds = loadDocumentPaymentSelection(documentLocalPersistenceOrganizationId, paymentReceiptSelectionPersistenceKey);
    const defaultPaymentIds = eligiblePaymentReceiptPayments.map((payment) => payment.id);
    const nextPaymentIds = (storedPaymentIds ?? defaultPaymentIds).filter((paymentId) => eligiblePaymentReceiptIdSet.has(paymentId));
    setSelectedPaymentReceiptIds(nextPaymentIds);
    paymentReceiptSelectionHydratedKeyRef.current = paymentReceiptSelectionPersistenceKey;
  }, [
    documentLocalPersistenceOrganizationId,
    eligiblePaymentReceiptIdsKey,
    selectedDocumentUsesPaymentReceiptSelection,
    paymentReceiptSelectionPersistenceKey
  ]);

  useEffect(() => {
    if (!selectedDocumentUsesPaymentReceiptSelection || !paymentReceiptSelectionPersistenceKey) return;
    if (paymentReceiptSelectionHydratedKeyRef.current !== paymentReceiptSelectionPersistenceKey) return;
    const eligiblePaymentReceiptIdSet = new Set(eligiblePaymentReceiptPayments.map((payment) => payment.id));
    saveDocumentPaymentSelection(
      documentLocalPersistenceOrganizationId,
      paymentReceiptSelectionPersistenceKey,
      selectedPaymentReceiptIds.filter((paymentId) => eligiblePaymentReceiptIdSet.has(paymentId))
    );
  }, [
    documentLocalPersistenceOrganizationId,
    eligiblePaymentReceiptIdsKey,
    paymentReceiptSelectionPersistenceKey,
    selectedDocumentUsesPaymentReceiptSelection,
    selectedPaymentReceiptIds
  ]);

  useEffect(() => {
    if (selectedDocumentKind !== "outpatient_medical_card_025u" || !outpatient025uDraftPersistenceKey) {
      outpatient025uDraftHydratedKeyRef.current = null;
      return;
    }
    const storedDraft = loadOutpatient025uDocumentDraft(documentLocalPersistenceOrganizationId, outpatient025uDraftPersistenceKey);
    applyOutpatient025uDocumentDraftFields(storedDraft ?? emptyOutpatient025uDocumentDraftFields());
    outpatient025uDraftHydratedKeyRef.current = outpatient025uDraftPersistenceKey;
  }, [documentLocalPersistenceOrganizationId, outpatient025uDraftPersistenceKey, selectedDocumentKind]);

  useEffect(() => {
    if (selectedDocumentKind !== "outpatient_medical_card_025u" || !documentPatient?.id || !outpatient025uDraftPersistenceKey) return;
    if (outpatient025uDraftHydratedKeyRef.current !== outpatient025uDraftPersistenceKey) return;
    saveOutpatient025uDocumentDraft(
      documentLocalPersistenceOrganizationId,
      outpatient025uDraftPersistenceKey,
      documentPatient.id,
      outpatient025uDraftVisitId,
      currentOutpatient025uDocumentDraftFields()
    );
  }, [
    documentPatient?.id,
    documentLocalPersistenceOrganizationId,
    outpatient025uDraftPersistenceKey,
    outpatient025uDraftVisitId,
    outpatient025uMedicalCardNumber,
    outpatient025uOpenedAt,
    outpatient025uPatientSexCode,
    outpatient025uCitizenship,
    outpatient025uRegistrationUrbanRuralCode,
    outpatient025uStayUrbanRuralCode,
    outpatient025uOmsIssuedAt,
    outpatient025uInsurerName,
    outpatient025uSocialSupportCode,
    outpatient025uHealthStatusDisclosureContact,
    outpatient025uEmploymentCode,
    outpatient025uDisabilityGroup,
    outpatient025uWorkOrStudyPlace,
    outpatient025uPalliativeCareNeedCode,
    outpatient025uBloodGroup,
    outpatient025uRhFactor,
    outpatient025uKellK1,
    outpatient025uOtherBloodData,
    outpatient025uAllergyHistory,
    outpatient025uFinalEpicrisis,
    recordExtractPeriodStart,
    recordExtractPeriodEnd,
    recordExtractSourceVisitIds,
    recordExtractComplaintAndAnamnesis,
    recordExtractObjectiveStatus,
    recordExtractDiagnosis,
    recordExtractTreatmentProvided,
    recordExtractRecommendations,
    recordExtractDoctorFullName,
    recordExtractPreparedFromSignedRecords,
    outpatient025uOfficialForm274nChecked,
    outpatient025uThirdPartyDataChecked,
    selectedDocumentKind
  ]);

  useEffect(() => {
    if (selectedDocumentKind !== "medical_record_extract" || !medicalRecordExtractDraftPersistenceKey) {
      medicalRecordExtractDraftHydratedKeyRef.current = null;
      return;
    }
    const storedDraft = loadMedicalRecordExtractDocumentDraft(
      documentLocalPersistenceOrganizationId,
      medicalRecordExtractDraftPersistenceKey
    );
    applyMedicalRecordExtractDocumentDraftFields(storedDraft ?? emptyMedicalRecordExtractDocumentDraftFields());
    medicalRecordExtractDraftHydratedKeyRef.current = medicalRecordExtractDraftPersistenceKey;
  }, [documentLocalPersistenceOrganizationId, medicalRecordExtractDraftPersistenceKey, selectedDocumentKind]);

  useEffect(() => {
    if (selectedDocumentKind !== "medical_record_extract" || !documentPatient?.id || !medicalRecordExtractDraftPersistenceKey) return;
    if (medicalRecordExtractDraftHydratedKeyRef.current !== medicalRecordExtractDraftPersistenceKey) return;
    saveMedicalRecordExtractDocumentDraft(
      documentLocalPersistenceOrganizationId,
      medicalRecordExtractDraftPersistenceKey,
      documentPatient.id,
      medicalRecordExtractDraftVisitId,
      currentMedicalRecordExtractDocumentDraftFields()
    );
  }, [
    documentPatient?.id,
    documentLocalPersistenceOrganizationId,
    medicalRecordExtractDraftPersistenceKey,
    medicalRecordExtractDraftVisitId,
    recordExtractPeriodStart,
    recordExtractPeriodEnd,
    recordExtractSourceVisitIds,
    recordExtractComplaintAndAnamnesis,
    recordExtractObjectiveStatus,
    recordExtractDiagnosis,
    recordExtractTreatmentProvided,
    recordExtractRecommendations,
    recordExtractDoctorFullName,
    recordExtractRecipientFullName,
    recordExtractRecipientAuthority,
    recordExtractIssuedAt,
    recordExtractPreparedFromSignedRecords,
    recordExtractThirdPartyDataChecked,
    selectedDocumentKind
  ]);

  useEffect(() => {
    if (!documentPatient) return;
    const administrativeProfile = documentPatient.administrativeProfile;
    setTaxApplicationTaxpayerFullName(documentPatient.fullName);
    setTaxApplicationTaxpayerInn(administrativeProfile?.taxpayerInn?.trim() || "");
    setTaxApplicationTaxpayerBirthDate(toDateInputValue(documentPatient.birthDate));
    setTaxApplicationTaxpayerIdentityDocument(administrativeProfile?.identityDocument?.trim() || "");
    setTaxApplicationRelationship("self");
    setTaxApplicationContact(administrativeProfile?.preferredDocumentRecipient?.trim() || documentPatient.phone || documentPatient.email || documentPatient.fullName);
    setTaxApplicationAuthorityDocument("");
    setTaxApplicationRequestedAt(toDateTimeLocalValue(new Date().toISOString()));
  }, [documentPatient?.id]);

  useEffect(() => {
    if (!selectedTaxApplicationPayment) return;
    setTaxApplicationTaxpayerFullName(selectedTaxApplicationPayment.payerFullName?.trim() || documentPatient?.fullName || "");
    setTaxApplicationTaxpayerInn(selectedTaxApplicationPayment.payerInn?.trim() || documentPatient?.administrativeProfile?.taxpayerInn?.trim() || "");
    setTaxApplicationTaxpayerBirthDate(toDateInputValue(selectedTaxApplicationPayment.payerBirthDate?.trim() || documentPatient?.birthDate || ""));
    setTaxApplicationTaxpayerIdentityDocument(
      selectedTaxApplicationPayment.payerIdentityDocument?.trim() || documentPatient?.administrativeProfile?.identityDocument?.trim() || ""
    );
    setTaxApplicationRelationship(normalizeTaxApplicationRelationship(selectedTaxApplicationPayment.payerRelationship) ?? "self");
  }, [documentPatient, selectedTaxApplicationPayment]);

  useEffect(() => {
    if (!inferredTreatmentArea) return;
    if (!anesthesiaZone.trim()) {
      setAnesthesiaZone(inferredTreatmentArea);
    }
    if (!labTeethOrArea.trim()) {
      setLabTeethOrArea(inferredTreatmentArea);
    }
  }, [anesthesiaZone, inferredTreatmentArea, labTeethOrArea]);

  const activeCommunicationTasks = useMemo(() => {
    if (!dashboard) return [];
    return dashboard.communicationTasks.filter((task) => task.patientId === dashboard.activeVisit.patientId);
  }, [dashboard]);

  const sortedCommunicationTasks = useMemo(() => {
    if (!dashboard) return [];
    return [...dashboard.communicationTasks].sort((left, right) => {
      const priorityRank = { urgent: 0, high: 1, normal: 2, low: 3 } as const;
      return priorityRank[left.priority] - priorityRank[right.priority] || left.dueAt.localeCompare(right.dueAt);
    });
  }, [dashboard]);

  const activeImagingStudies = useMemo(() => {
    if (!dashboard) return [];
    return dashboard.imagingStudies
      .filter((study) => study.patientId === dashboard.activeVisit.patientId)
      .sort((left, right) => right.capturedAt.localeCompare(left.capturedAt));
  }, [dashboard]);

  const imagingKindOptions = useMemo(
    () => Array.from(new Set(activeImagingStudies.map((study) => study.kind))),
    [activeImagingStudies]
  );
  const visibleImagingStudies = useMemo(
    () =>
      imagingKindFilter === "all"
        ? activeImagingStudies
        : activeImagingStudies.filter((study) => study.kind === imagingKindFilter),
    [activeImagingStudies, imagingKindFilter]
  );
  const latestImagingStudy = visibleImagingStudies[0] ?? null;
  const selectedImagingStudy =
    visibleImagingStudies.find((study) => study.id === selectedImagingStudyId) ?? latestImagingStudy;
  const imagingComparisonCandidates = useMemo(() => {
    if (!selectedImagingStudy) return [];
    return activeImagingStudies
      .filter((study) => study.id !== selectedImagingStudy.id)
      .map((study) => ({
        study,
        score: imagingComparisonScore(selectedImagingStudy, study),
        reason: imagingComparisonReason(selectedImagingStudy, study, (kind) => imagingKindLabels[kind])
      }))
      .sort(
        (left, right) =>
          right.score - left.score ||
          imagingCaptureDistanceMs(selectedImagingStudy.capturedAt, left.study.capturedAt) -
            imagingCaptureDistanceMs(selectedImagingStudy.capturedAt, right.study.capturedAt) ||
          right.study.capturedAt.localeCompare(left.study.capturedAt)
      )
      .slice(0, 4);
  }, [activeImagingStudies, selectedImagingStudy]);
  const selectedImagingViewerPlan = selectedImagingStudy ? imagingViewerPlans[selectedImagingStudy.kind] : null;
  const imagingViewerImageStyle: CSSProperties = {
    filter: `brightness(${imagingViewerState.brightness}) contrast(${imagingViewerState.contrast}) invert(${
      imagingViewerState.inverted ? 1 : 0
    })`,
    transform: `rotate(${imagingViewerState.rotationDeg}deg) scaleX(${imagingViewerState.flipHorizontal ? -1 : 1}) scale(${
      imagingViewerState.zoom
    })`
  };
  const dicomFirstFrameImageStyle: CSSProperties = {
    filter: `brightness(${dicomFirstFrameViewerState.brightness}) contrast(${dicomFirstFrameViewerState.contrast}) invert(${
      dicomFirstFrameViewerState.inverted ? 1 : 0
    })`,
    transform: `rotate(${dicomFirstFrameViewerState.rotationDeg}deg) scaleX(${
      dicomFirstFrameViewerState.flipHorizontal ? -1 : 1
    }) scale(${dicomFirstFrameViewerState.zoom})`
  };
  const cbctWorkbenchSeries =
    dicomSeriesPreview?.series.find((series) => series.mprReadiness.volumeCandidate) ??
    dicomSeriesPreview?.series.find((series) => series.recommendedViewer === "cbct_mpr") ??
    null;
  const mprSliceMaxIndex = Math.max(0, (cbctWorkbenchSeries?.fileCount ?? 1) - 1);
  const mprSafeSliceIndex = clampMprSliceIndex(mprSliceIndex, mprSliceMaxIndex);
  const currentImagingViewerSessionState = useMemo<ImagingViewerSessionState>(
    () => ({
      mode: selectedImagingViewerPlan?.mode === "cbct_mpr" ? "mpr" : selectedImagingViewerPlan?.mode === "photo" ? "photo" : "two_d",
      activeTool: imagingViewerActiveTool,
      activeQuickActionId: ctPlanningActiveQuickActionId,
      windowPreset: selectedImagingStudy?.kind === "cbct" ? mprWindowPreset : viewerWindowPresetForStudy(selectedImagingStudy?.kind),
      windowCenter: null,
      windowWidth: null,
      brightness: imagingViewerState.brightness,
      contrast: imagingViewerState.contrast,
      inverted: imagingViewerState.inverted,
      rotationDeg: imagingViewerState.rotationDeg,
      flipHorizontal: imagingViewerState.flipHorizontal,
      zoom: imagingViewerState.zoom,
      panX: 0,
      panY: 0,
      sliceIndex: selectedImagingStudy?.kind === "cbct" ? mprSafeSliceIndex : null,
      projection: selectedImagingStudy?.kind === "cbct" ? mprProjection : null,
      axisDeg: mprAxisDeg,
      slabMm: mprSlabMm,
      crosshair: mprCrosshairEnabled,
      linkedPlanes: mprLinkedPlanesEnabled,
      implantPlan: ctPlanningImplantPlan
    }),
    [
      ctPlanningActiveQuickActionId,
      ctPlanningImplantPlan,
      imagingViewerActiveTool,
      imagingViewerState,
      mprAxisDeg,
      mprCrosshairEnabled,
      mprLinkedPlanesEnabled,
      mprProjection,
      mprSafeSliceIndex,
      mprSlabMm,
      mprWindowPreset,
      selectedImagingStudy?.kind,
      selectedImagingViewerPlan?.mode
    ]
  );
  const ctPlanningAnnotationRefs = useMemo(
    () =>
      imagingViewerAnnotations.map((annotation) => ({
        id: annotation.id,
        type: annotation.type,
        label: annotation.label,
        semanticRole: annotation.semanticRole ?? null,
        note: annotation.note,
        pointCount: annotation.points.length
      })),
    [imagingViewerAnnotations]
  );
  const currentMprWorkbenchState = useMemo<MprWorkbenchState>(
    () => ({
      projection: mprProjection,
      axisDeg: mprAxisDeg,
      slabMm: mprSlabMm,
      sliceIndex: mprSafeSliceIndex,
      windowPreset: mprWindowPreset,
      crosshair: mprCrosshairEnabled,
      linkedPlanes: mprLinkedPlanesEnabled
    }),
    [mprAxisDeg, mprCrosshairEnabled, mprLinkedPlanesEnabled, mprProjection, mprSafeSliceIndex, mprSlabMm, mprWindowPreset]
  );
  const cbctWorkbenchSeriesKey = useMemo(() => mprWorkbenchSeriesKey(cbctWorkbenchSeries), [cbctWorkbenchSeries]);
  const latestDicomWorkbenchServerBundle = dicomWorkbenchServerBundles[0] ?? null;
  const dicomWorkbenchSourceIsRedacted = dicomWorkbenchManifestHasRedactedSource(dicomViewerWorkbenchManifest);
  const cbctWorkbenchProjections = useMemo<MprProjection[]>(
    () =>
      cbctWorkbenchSeries?.mprReadiness.projections.length
        ? cbctWorkbenchSeries.mprReadiness.projections
        : ["axial", "coronal", "sagittal"],
    [cbctWorkbenchSeries]
  );
  const cbctWorkbenchTools = useMemo(() => cbctWorkbenchSeries?.mprReadiness.tools ?? [], [cbctWorkbenchSeries]);
  const cbctWorkbenchPlanes = useMemo<CbctWorkbenchPlane[]>(
    () => [
      { key: "axial", title: "Аксиальная", detail: "Срез сверху-вниз" },
      { key: "coronal", title: "Корональная", detail: "Фронтальная плоскость" },
      { key: "sagittal", title: "Сагиттальная", detail: "Боковая плоскость" },
      {
        key: cbctWorkbenchSeries?.mprReadiness.canBuildPanoramic ? "panoramic_reconstruction" : "oblique",
        title: cbctWorkbenchSeries?.mprReadiness.canBuildPanoramic ? "Панорама" : "Косая",
        detail: cbctWorkbenchSeries?.mprReadiness.canBuildPanoramic ? "Кривая из КЛКТ" : "Наклонная плоскость"
      }
    ],
    [cbctWorkbenchSeries]
  );
  const mprControlsReady = Boolean(cbctWorkbenchSeries?.mprReadiness.canOpenMpr);
  const mprControlsAutoOpen = selectedImagingStudy?.kind === "cbct" || selectedImagingViewerPlan?.mode === "cbct_mpr" || mprControlsReady;
  const mprCenterSliceIndex = Math.floor(mprSliceMaxIndex / 2);
  const mprAxisDirectionLabel = formatMprAxisDirectionLabel({ canOpenMpr: mprControlsReady, axisDeg: mprAxisDeg });
  const mprAxisAngleBadge = formatMprAxisAngleBadge(mprAxisDeg, mprControlsReady);
  const mprSlabBadge = formatMprSlabBadge(mprSlabMm, mprControlsReady);
  const mprSliceBadge = formatMprSliceBadge({ canOpenMpr: mprControlsReady, sliceIndex: mprSafeSliceIndex, maxIndex: mprSliceMaxIndex });
  const mprSlabVisualWidth = `${Math.min(86, Math.max(18, 14 + mprSlabMm * 2.2))}%`;
  const mprSlicePositionPercent = mprSliceMaxIndex > 0 ? `${(mprSafeSliceIndex / mprSliceMaxIndex) * 100}%` : "50%";
  const mprCurrentSliceFraction = mprSliceFraction(mprSafeSliceIndex, mprSliceMaxIndex);
  const mprSliceLabel = mprControlsReady ? `срез ${mprSafeSliceIndex + 1} из ${mprSliceMaxIndex + 1}` : "срез включится после КЛКТ/КТ-серии";
  const mprAxisRangeValue = formatMprAxisRangeValue({ canOpenMpr: mprControlsReady, axisDeg: mprAxisDeg });
  const mprSlabRangeValue = formatMprSlabRangeValue({ canOpenMpr: mprControlsReady, slabMm: mprSlabMm });
  const mprSliceRangeValue = formatMprSliceRangeValue({
    canOpenMpr: mprControlsReady,
    sliceIndex: mprSafeSliceIndex,
    maxIndex: mprSliceMaxIndex
  });
  const mprAxisVisualizerStyle: MprAxisVisualizerStyle = {
    "--mpr-axis-deg": `${mprAxisDeg}deg`,
    "--mpr-slab-width": mprSlabVisualWidth,
    "--mpr-slice-position": mprSlicePositionPercent
  };
  const mprActiveProjectionLabel = mprProjectionLabels[mprProjection as MprProjection] ?? mprProjection;
  const mprActiveProjectionOrientation = mprProjectionOrientationLabels[mprProjection as MprProjection] ?? "плоскость просмотра";
  const mprProjectionCompass = mprProjectionCompassLabels(mprProjection);
  const mprAxisGuidance = buildMprAxisGuidance({
    canOpenMpr: mprControlsReady,
    axisDeg: mprAxisDeg,
    slabMm: mprSlabMm,
    sliceFraction: mprCurrentSliceFraction
  });
  const mprNearestClinicalPreset = findNearestMprClinicalPreset(
    {
      canOpenMpr: mprControlsReady,
      projection: mprProjection,
      availableProjections: cbctWorkbenchProjections,
      axisDeg: mprAxisDeg,
      slabMm: mprSlabMm,
      sliceFraction: mprCurrentSliceFraction,
      windowPreset: mprWindowPreset,
      crosshair: mprCrosshairEnabled,
      linkedPlanes: mprLinkedPlanesEnabled
    },
    mprClinicalPresets
  );
  const mprClinicalInput = {
    hasSeries: Boolean(cbctWorkbenchSeries),
    canOpenMpr: mprControlsReady,
    hasWorkbenchManifest: Boolean(dicomViewerWorkbenchManifest),
    hasWorkstationReadiness: Boolean(dicomWorkstationReadiness),
    protocolExact: mprNearestClinicalPreset.exact,
    protocolCanApply: mprNearestClinicalPreset.deltas.length > 0,
    protocolLabel: mprNearestClinicalPreset.label,
    projectionLabel: mprActiveProjectionLabel,
    axisLabel: mprAxisDirectionLabel,
    slabMm: mprSlabMm,
    sliceLabel: mprSliceLabel,
    windowLabel: mprWindowPresetLabels[mprWindowPreset as MprWindowPreset] ?? mprWindowPreset,
    crosshair: mprCrosshairEnabled,
    linkedPlanes: mprLinkedPlanesEnabled
  };
  const mprWorkbenchSummaryText = buildMprWorkbenchSummary(mprClinicalInput);
  const mprOperatorSummaryCards = buildMprOperatorSummary({
    ...mprClinicalInput,
    protocolDeltas: mprNearestClinicalPreset.deltas
  });
  const mprAxisVisualizerLabel = formatMprAxisVisualizerLabel({
    canOpenMpr: mprControlsReady,
    workbenchSummary: mprWorkbenchSummaryText,
    compassSummary: mprProjectionCompass.summary,
    guidanceSummary: mprAxisGuidance.summary
  });
  const mprClinicalChecklist = buildMprClinicalChecklist(mprClinicalInput);
  const mprClinicalNextStep = mprClinicalNextAction(mprClinicalChecklist);
  const mprClinicalPresetButtonClass = (preset: MprClinicalPreset) =>
    [
      "mpr-clinical-preset",
      mprNearestClinicalPreset.title === preset.title ? "nearest" : "",
      mprNearestClinicalPreset.exact && mprNearestClinicalPreset.title === preset.title ? "active" : ""
    ]
      .filter(Boolean)
      .join(" ");
  const applyDefaultMprWorkbenchState = () => {
    const defaultProjection = cbctWorkbenchProjections.includes("axial") ? "axial" : cbctWorkbenchProjections[0] ?? "axial";
    setMprProjection(defaultProjection);
    setMprAxisDeg(0);
    setMprSlabMm(1);
    setMprSliceIndex(mprCenterSliceIndex);
    setMprWindowPreset("bone");
    setMprCrosshairEnabled(true);
    setMprLinkedPlanesEnabled(true);
  };
  const resetMprControls = applyDefaultMprWorkbenchState;
  const applyMprClinicalPreset = (preset: MprClinicalPreset) => {
    const projection = resolveMprClinicalPresetProjection(preset.projection, cbctWorkbenchProjections);
    setMprProjection(projection);
    setMprAxisDeg(clampMprAxisDeg(preset.axisDeg));
    setMprSlabMm(clampMprSlabMm(preset.slabMm));
    setMprSliceIndex(mprSliceIndexFromFraction(preset.sliceFraction, mprSliceMaxIndex));
    setMprWindowPreset(preset.windowPreset);
    setMprCrosshairEnabled(preset.crosshair);
    setMprLinkedPlanesEnabled(preset.linkedPlanes);
  };
  const applyCtPlanningQuickAction = (action: CtPlanningQuickAction) => {
    if (action.requiresVolume && !mprControlsReady) return;
    const projection = resolveMprClinicalPresetProjection(action.projection, cbctWorkbenchProjections);
    setCtPlanningActiveQuickActionId(action.id);
    setImagingViewerActiveTool(action.tool);
    setMprProjection(projection);
    setMprAxisDeg(clampMprAxisDeg(action.axisDeg));
    setMprSlabMm(clampMprSlabMm(action.slabMm));
    setMprSliceIndex(mprSliceIndexFromFraction(action.sliceFraction, mprSliceMaxIndex));
    setMprWindowPreset(action.windowPreset);
    setMprCrosshairEnabled(true);
    setMprLinkedPlanesEnabled(true);
  };
  const createCtPlanningArtifact = (command: CtPlanningArtifactCommand) => {
    if (!selectedImagingStudy) {
      setError("Выберите КТ-снимок перед созданием разметки.");
      return;
    }
    if (!imagingViewerSessionReady) {
      setError("Дождитесь загрузки сессии просмотра снимка перед созданием КТ-разметки.");
      return;
    }
    if (command.requiresVolume && !mprControlsReady) {
      setError("Для этой КТ-разметки нужна готовая КЛКТ/КТ-серия.");
      return;
    }
    if (command.requiresImplant && !ctPlanningImplantPlan) {
      setError("Сначала выберите имплант из библиотеки, затем создайте ось или шаблон.");
      return;
    }
    const matchingQuickAction = findCtPlanningQuickActionForArtifactCommand(command);
    if (matchingQuickAction) {
      applyCtPlanningQuickAction(matchingQuickAction);
    } else {
      setCtPlanningActiveQuickActionId(null);
      setImagingViewerActiveTool(command.tool);
      setMprProjection(resolveMprClinicalPresetProjection(command.projection, cbctWorkbenchProjections));
    }
    const now = new Date().toISOString();
    const projection = resolveMprClinicalPresetProjection(command.projection, cbctWorkbenchProjections);
    const annotation: ImagingViewerAnnotation = {
      id: browserGeneratedId(`ct-${command.annotationType}`),
      type: command.annotationType,
      label: command.title,
      semanticRole: command.semanticRole ?? null,
      toothCode: selectedImagingStudy.toothCode,
      points: [],
      measurementValue: null,
      unit: command.unit,
      note: [
        `Черновик КТ-разметки: ${command.detail}`,
        `Плоскость: ${mprProjectionLabels[projection] ?? projection}`,
        `Срез: ${mprSafeSliceIndex + 1}/${mprSliceMaxIndex + 1}`,
        `Слой: ${mprSlabMm} мм`,
        ctPlanningImplantPlan ? `Имплант: ${ctPlanningImplantPlan.diameterMm} x ${ctPlanningImplantPlan.lengthMm} мм` : ""
      ]
        .filter(Boolean)
        .join(" · "),
      createdByUserId: null,
      createdAt: now,
      updatedAt: now
    };
    setImagingViewerAnnotations((items) => [annotation, ...items].slice(0, 200));
    setError(null);
  };
  const selectCtPlanningImplant = (implant: CtImplantLibraryItem) => {
    setCtPlanningImplantPlan(ctImplantPlanFromLibraryItem(implant));
    setCtPlanningActiveQuickActionId("implant_library");
    setImagingViewerActiveTool("implant_library");
    if (mprControlsReady) {
      setMprWindowPreset("implant");
      setMprCrosshairEnabled(true);
      setMprLinkedPlanesEnabled(true);
    }
  };
  const applyNearestMprClinicalPreset = () => {
    const preset = mprClinicalPresets.find((candidate) => candidate.title === mprNearestClinicalPreset.title);
    if (preset) applyMprClinicalPreset(preset);
  };
  const handleMprKeyboardNavigation = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!mprControlsReady) return;
    const adjustment = resolveMprKeyboardAdjustment({
      key: event.key,
      shiftKey: event.shiftKey,
      axisDeg: mprAxisDeg,
      slabMm: mprSlabMm,
      sliceIndex: mprSafeSliceIndex,
      maxIndex: mprSliceMaxIndex
    });
    if (!adjustment) return;
    event.preventDefault();
    if (adjustment.kind === "axis") setMprAxisDeg(adjustment.value);
    if (adjustment.kind === "slab") setMprSlabMm(adjustment.value);
    if (adjustment.kind === "slice") setMprSliceIndex(adjustment.value);
  };
  const applyMprWorkbenchState = (state: MprWorkbenchState) => {
    const projection = resolveMprWorkbenchProjection(state.projection, cbctWorkbenchProjections);
    setMprProjection(projection);
    setMprAxisDeg(clampMprAxisDeg(state.axisDeg ?? 0));
    setMprSlabMm(clampMprSlabMm(state.slabMm ?? 1));
    setMprSliceIndex(clampMprSliceIndex(state.sliceIndex, mprSliceMaxIndex));
    setMprWindowPreset(state.windowPreset);
    setMprCrosshairEnabled(state.crosshair);
    setMprLinkedPlanesEnabled(state.linkedPlanes);
  };

  async function restoreMprWorkbenchLocalDraft() {
    if (!cbctWorkbenchSeriesKey) {
      setError("Сначала выберите готовую КЛКТ/КТ-серию, чтобы вернуть последний вид КТ-срезов.");
      return;
    }
    const draft = await loadLocalMprWorkbenchDraft(cbctWorkbenchSeriesKey, activeOrganizationId);
    if (!draft) {
      setError("Для этой КЛКТ/КТ-серии еще нет сохраненного вида КТ-срезов.");
      return;
    }
    applyMprWorkbenchState(draft.state);
    setMprWorkbenchLocalSavedAt(draft.clientSavedAt);
    setMprWorkbenchDraftRestored(true);
    setError(null);
  }

  useEffect(() => {
    if (!activeImagingStudies.length) {
      setSelectedImagingStudyId(null);
      return;
    }
    if (!selectedImagingStudyId || visibleImagingStudies.every((study) => study.id !== selectedImagingStudyId)) {
      setSelectedImagingStudyId(visibleImagingStudies[0]?.id ?? null);
    }
  }, [activeImagingStudies, imagingKindFilter, selectedImagingStudyId, visibleImagingStudies]);

  useEffect(() => {
    if (!cbctWorkbenchProjections.includes(mprProjection)) {
      setMprProjection(resolveMprWorkbenchProjection(mprProjection, cbctWorkbenchProjections));
    }
  }, [cbctWorkbenchProjections, mprProjection]);

  useEffect(() => {
    setMprSliceIndex((value: any) => clampMprSliceIndex(value, mprSliceMaxIndex));
  }, [mprSliceMaxIndex]);

  useEffect(() => {
    if (!cbctWorkbenchSeriesKey || !mprControlsReady) {
      setMprWorkbenchLocalSavedAt(null);
      setMprWorkbenchDraftRestored(false);
      return;
    }
    let cancelled = false;
    const restore = async () => {
      const draft = await loadLocalMprWorkbenchDraft(cbctWorkbenchSeriesKey, activeOrganizationId);
      if (cancelled) return;
      if (!draft) {
        applyDefaultMprWorkbenchState();
        setMprWorkbenchLocalSavedAt(null);
        setMprWorkbenchDraftRestored(false);
        return;
      }
      applyMprWorkbenchState(draft.state);
      setMprWorkbenchLocalSavedAt(draft.clientSavedAt);
      setMprWorkbenchDraftRestored(true);
    };
    void restore();
    return () => {
      cancelled = true;
    };
  }, [activeOrganizationId, cbctWorkbenchProjections, cbctWorkbenchSeriesKey, mprControlsReady]);

  useEffect(() => {
    if (!cbctWorkbenchSeriesKey || !mprControlsReady) return;
    if (mprWorkbenchSaveTimerRef.current) window.clearTimeout(mprWorkbenchSaveTimerRef.current);
    const clientSavedAt = new Date().toISOString();
    mprWorkbenchSaveTimerRef.current = window.setTimeout(() => {
      void saveLocalMprWorkbenchDraft(
        cbctWorkbenchSeriesKey,
        currentMprWorkbenchState,
        clientSavedAt,
        activeOrganizationId
      ).then((saved) => {
        if (saved) setMprWorkbenchLocalSavedAt(clientSavedAt);
      });
    }, 350);
    return () => {
      if (mprWorkbenchSaveTimerRef.current) window.clearTimeout(mprWorkbenchSaveTimerRef.current);
    };
  }, [activeOrganizationId, cbctWorkbenchSeriesKey, currentMprWorkbenchState, mprControlsReady]);

  function applyImagingViewerSessionState(sessionState: ImagingViewerSessionState, annotations: ImagingViewerAnnotation[]) {
    setImagingViewerActiveTool(sessionState.activeTool);
    setCtPlanningActiveQuickActionId(sessionState.activeQuickActionId ?? null);
    setCtPlanningImplantPlan(sessionState.implantPlan ?? null);
    setImagingViewerState({
      rotationDeg: sessionState.rotationDeg,
      flipHorizontal: sessionState.flipHorizontal,
      inverted: sessionState.inverted,
      brightness: sessionState.brightness,
      contrast: sessionState.contrast,
      zoom: sessionState.zoom
    });
    setMprProjection(resolveMprWorkbenchProjection(sessionState.projection, cbctWorkbenchProjections));
    setMprAxisDeg(clampMprAxisDeg(sessionState.axisDeg ?? 0));
    setMprSlabMm(clampMprSlabMm(sessionState.slabMm ?? 1));
    setMprSliceIndex(clampMprSliceIndex(sessionState.sliceIndex ?? 0, mprSliceMaxIndex));
    if (sessionState.windowPreset === "bone" || sessionState.windowPreset === "soft_tissue" || sessionState.windowPreset === "implant" || sessionState.windowPreset === "custom") {
      setMprWindowPreset(sessionState.windowPreset);
    }
    setMprCrosshairEnabled(sessionState.crosshair);
    setMprLinkedPlanesEnabled(sessionState.linkedPlanes);
    setImagingViewerAnnotations(annotations);
  }

  async function loadImagingViewerSessionForStudy(studyId: string) {
    setImagingViewerSessionReady(false);
    setImagingViewerSaveState("idle");
    setImagingViewerSaveError(null);
    const localDraft = loadLocalImagingViewerDraft(studyId, activeOrganizationId);
    if (localDraft) {
      applyImagingViewerSessionState(localDraft.state, localDraft.annotations);
      setImagingViewerLocalSavedAt(localDraft.clientSavedAt);
      setImagingViewerSaveState("local");
    } else {
      setImagingViewerState(defaultImagingViewerState);
      setImagingViewerActiveTool("window_level");
      setCtPlanningActiveQuickActionId(null);
      setCtPlanningImplantPlan(null);
      setImagingViewerAnnotations([]);
      setImagingViewerNote("");
      setImagingViewerLocalSavedAt(null);
    }

    try {
      const response = await fetch(`/api/imaging/studies/${studyId}/viewer-session`, {
        cache: "no-store",
        headers: denteClinicalReadHeaders()
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Сессия просмотрщика не загружена"));
      const payload = (await response.json()) as ImagingViewerSessionResponse;
      setImagingViewerSession(payload.session);
      const localIsNewer =
        localDraft?.clientSavedAt && new Date(localDraft.clientSavedAt).getTime() > new Date(payload.session.updatedAt).getTime();
      if (!localIsNewer) {
        applyImagingViewerSessionState(payload.session.state, payload.session.annotations);
        const localSaved = saveLocalImagingViewerDraft(
          studyId,
          {
            state: payload.session.state,
            annotations: payload.session.annotations,
            clientSavedAt: payload.session.clientSavedAt ?? payload.session.updatedAt,
            serverSavedAt: payload.session.serverSavedAt
          },
          activeOrganizationId
        );
        if (localSaved) setImagingViewerLocalSavedAt(payload.session.clientSavedAt ?? payload.session.updatedAt);
        setImagingViewerSaveState("saved");
      }
    } catch {
      setImagingViewerSaveError(localDraft ? "Сервер недоступен; локальный черновик просмотрщика сохранен." : "Сессия просмотрщика недоступна.");
      setImagingViewerSaveState(localDraft ? "queued" : "error");
    } finally {
      setImagingViewerSessionReady(true);
    }
  }

  async function saveCurrentImagingViewerSession(clientSavedAt: string) {
    if (!selectedImagingStudy) return;
    if (!isOnline) {
      setImagingViewerSaveError("Офлайн: локальный черновик просмотрщика сохранен до появления сети на рабочей станции.");
      setImagingViewerSaveState("queued");
      return;
    }
    setImagingViewerSaveState("saving");
    setImagingViewerSaveError(null);
    try {
      const response = await fetch(`/api/imaging/studies/${selectedImagingStudy.id}/viewer-session`, {
        method: "PUT",
        headers: denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          patientId: selectedImagingStudy.patientId,
          visitId: selectedImagingStudy.visitId,
          state: currentImagingViewerSessionState,
          annotations: imagingViewerAnnotations,
          clientSavedAt
        })
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Сессия просмотрщика не сохранена"));
      const payload = (await response.json()) as ImagingViewerSessionResponse;
      setImagingViewerSession(payload.session);
      const localSaved = saveLocalImagingViewerDraft(
        selectedImagingStudy.id,
        {
          state: payload.session.state,
          annotations: payload.session.annotations,
          clientSavedAt: payload.session.clientSavedAt ?? clientSavedAt,
          serverSavedAt: payload.session.serverSavedAt
        },
        activeOrganizationId
      );
      if (localSaved) setImagingViewerLocalSavedAt(payload.session.clientSavedAt ?? clientSavedAt);
      setImagingViewerSaveState("saved");
    } catch {
      setImagingViewerSaveError("Серверное сохранение не выполнено; локальный черновик просмотра сохранен.");
      setImagingViewerSaveState("queued");
    }
  }

  function retryImagingViewerSessionSave() {
    if (!selectedImagingStudy?.id) {
      setError("Выберите снимок перед повторным сохранением просмотра.");
      return;
    }
    if (!imagingViewerSessionReady) {
      setError("Дождитесь загрузки сессии просмотра снимка перед повторным сохранением.");
      return;
    }
    const clientSavedAt = imagingViewerLocalSavedAt ?? new Date().toISOString();
    void saveCurrentImagingViewerSession(clientSavedAt);
  }

  function addImagingViewerNoteAnnotation() {
    if (!selectedImagingStudy) {
      setError("Выберите снимок перед добавлением заметки.");
      return;
    }
    if (!imagingViewerSessionReady) {
      setError("Дождитесь загрузки сессии просмотра снимка перед добавлением заметки.");
      return;
    }
    const cleanNote = imagingViewerNoteText;
    if (!cleanNote) {
      setError("Введите текст заметки перед добавлением к снимку.");
      return;
    }
    const now = new Date().toISOString();
    const annotation: ImagingViewerAnnotation = {
      id: browserGeneratedId("annotation"),
      type: "note",
      label: cleanNote.slice(0, 80),
      toothCode: selectedImagingStudy.toothCode,
      points: [],
      measurementValue: null,
      unit: null,
      note: cleanNote,
      createdByUserId: null,
      createdAt: now,
      updatedAt: now
    };
    setImagingViewerAnnotations((items) => [annotation, ...items].slice(0, 200));
    setImagingViewerNote("");
    setError(null);
  }

  useEffect(() => {
    if (!selectedImagingStudy?.id) {
      setImagingViewerSession(null);
      setImagingViewerSessionReady(false);
      setImagingViewerAnnotations([]);
      return;
    }
    void loadImagingViewerSessionForStudy(selectedImagingStudy.id);
  }, [activeOrganizationId, selectedImagingStudy?.id]);

  useEffect(() => {
    if (!selectedImagingStudy?.id || !imagingViewerSessionReady) return;
    const clientSavedAt = new Date().toISOString();
    const localSaved = saveLocalImagingViewerDraft(
      selectedImagingStudy.id,
      {
        state: currentImagingViewerSessionState,
        annotations: imagingViewerAnnotations,
        clientSavedAt,
        serverSavedAt: imagingViewerSession?.serverSavedAt ?? null
      },
      activeOrganizationId
    );
    if (localSaved) {
      setImagingViewerLocalSavedAt(clientSavedAt);
      setImagingViewerSaveError(null);
      setImagingViewerSaveState("local");
    } else {
      setImagingViewerSaveError("Браузер отклонил локальное сохранение черновика просмотрщика; держите вкладку открытой до завершения серверной записи.");
      setImagingViewerSaveState("error");
    }
    if (imagingViewerSaveTimerRef.current) window.clearTimeout(imagingViewerSaveTimerRef.current);
    imagingViewerSaveTimerRef.current = window.setTimeout(() => {
      void saveCurrentImagingViewerSession(clientSavedAt);
    }, 900);
    return () => {
      if (imagingViewerSaveTimerRef.current) window.clearTimeout(imagingViewerSaveTimerRef.current);
    };
  }, [activeOrganizationId, currentImagingViewerSessionState, imagingViewerAnnotations, imagingViewerSessionReady, selectedImagingStudy?.id]);

  useEffect(() => {
    if (!isOnline || imagingViewerSaveState !== "queued" || !selectedImagingStudy?.id || !imagingViewerSessionReady) return;
    const retryTimer = window.setTimeout(() => {
      retryImagingViewerSessionSave();
    }, 1200);
    return () => window.clearTimeout(retryTimer);
  }, [imagingViewerSaveState, imagingViewerSessionReady, isOnline, selectedImagingStudy?.id]);

  const specialtiesWithTemplates = useMemo(() => {
    if (!dashboard) return [];
    return Array.from(new Set(dashboard.protocolTemplates.map((template) => template.specialty)));
  }, [dashboard]);

  const visibleVisitSpecialtyFocusOptions = useMemo(() => {
    const visibleSpecialties = new Set<DentalSpecialty>();
    const reasonSpecialty = inferSpecialtyFromText(activeAppointment?.reason);

    activeDoctor?.specialties.forEach((specialty) => visibleSpecialties.add(specialty));
    if (activeChair?.specialization) visibleSpecialties.add(activeChair.specialization);
    if (reasonSpecialty) visibleSpecialties.add(reasonSpecialty);
    visibleSpecialties.add(selectedSpecialty);
    visibleSpecialties.add("universal");

    return visitSpecialtyFocusOptions.filter(
      (option) => specialtiesWithTemplates.includes(option.specialty) && visibleSpecialties.has(option.specialty)
    );
  }, [activeAppointment?.reason, activeChair?.specialization, activeDoctor, selectedSpecialty, specialtiesWithTemplates]);

  const specialtyProtocolTemplates = useMemo(() => {
    if (!dashboard) return [];
    return dashboard.protocolTemplates.filter((template) => template.specialty === selectedSpecialty);
  }, [dashboard, selectedSpecialty]);

  const selectedProtocolTemplate = useMemo(() => {
    return specialtyProtocolTemplates.find((template) => template.id === selectedProtocolId) ?? specialtyProtocolTemplates[0] ?? null;
  }, [selectedProtocolId, specialtyProtocolTemplates]);

  useEffect(() => {
    if (!selectedProtocolId) return;
    if (specialtyProtocolTemplates.some((template) => template.id === selectedProtocolId)) return;
    setSelectedProtocolId(null);
  }, [selectedProtocolId, specialtyProtocolTemplates]);

  const dictationQuickPhrases = useMemo(() => {
    const visitReason = activeAppointment?.reason ?? selectedProtocolTemplate?.visitReason ?? "осмотр";
    const specialtyPhrases = specialtyQuickPhraseLibrary[selectedSpecialty] ?? specialtyQuickPhraseLibrary.universal;
    return [
      { label: "Повод", text: `Повод приема: ${visitReason}.` },
      ...specialtyPhrases
    ];
  }, [activeAppointment?.reason, selectedProtocolTemplate?.visitReason, selectedSpecialty]);

  const taxDocuments =
    dashboard?.documents.filter((document) => documentKindMetadata[document.kind].group === "tax") ?? [];
  const shiftWarnings = dashboard?.shiftIntelligence.scheduleWarnings ?? [];
  const allResourceLoads = dashboard
    ? [...dashboard?.shiftIntelligence.doctorLoads, ...dashboard?.shiftIntelligence.assistantLoads, ...dashboard?.shiftIntelligence.chairLoads]
    : [];
  const mostLoadedResource = allResourceLoads.slice().sort((left, right) => right.utilizationPercent - left.utilizationPercent)[0] ?? null;

  const visitCloseChecklist = dashboard?.visitCloseChecklist ?? null;
  const visitWarnings = visitCloseChecklist?.items.filter((item) => !item.ready) ?? [];
  const primaryVisitWarning = visitWarnings.find((item) => item.blocking) ?? visitWarnings[0] ?? null;
  const speechProviderRuntimeById = useMemo(
    () => new Map(speechProviderRuntimeStatuses.map((provider) => [provider.providerId, provider])),
    [speechProviderRuntimeStatuses]
  );
  const speechProviderHealthById = useMemo(
    () => new Map((speechGatewayHealthReport?.providers ?? []).map((provider) => [provider.providerId, provider])),
    [speechGatewayHealthReport]
  );
  const activeSpeechProviderHealth = useMemo(() => {
    if (!speechGatewayHealthReport) return null;
    return speechGatewayHealthReport.providers.find((provider) => provider.providerId === speechGatewayHealthReport.activeProviderId) ?? null;
  }, [speechGatewayHealthReport]);
  const savedVisitNoteForm = useMemo(() => (dashboard ? visitNoteFormFromVisit(dashboard.activeVisit) : emptyVisitNoteForm), [dashboard]);
  const isVisitNoteDirty = visitNoteFieldDefinitions.some(({ key }) => visitNoteForm[key] !== savedVisitNoteForm[key]);
  const hasVisitNoteFormText = visitNoteFieldDefinitions.some(({ key }) => visitNoteForm[key].trim().length > 0);
  const hasVisitTranscriptText = transcript.trim().length > 0;
  const visitDraftBuildMissingSteps = [
    !activePatient ? "выберите пациента" : null,
    !hasVisitTranscriptText ? "добавьте текст диктовки или нажмите голосовую запись" : null
  ].filter((step): step is string => Boolean(step));
  const visitDraftReadyToBuild = visitDraftBuildMissingSteps.length === 0;
  const visitNoteAcceptMissingSteps = [
    !hasVisitNoteFormText ? "заполните хотя бы одно поле ЭМК или соберите черновик из диктовки" : null,
    !draft && !isVisitNoteDirty ? "внесите правку в ЭМК или подготовьте новый черновик" : null
  ].filter((step): step is string => Boolean(step));
  const visitNoteReadyToAccept = visitNoteAcceptMissingSteps.length === 0;
  const visitNoteActionLabel = isDraftAccepting ? "Сохраняю" : draft ? "Принять" : isVisitNoteDirty ? "Сохранить" : "Сохранено";
  const visitNoteStatusLabel = draft ? "черновик готов" : isVisitNoteDirty ? "есть правки" : "сохранено";
  const visitHasSavedNote = hasVisitNoteFormText && !draft && !isVisitNoteDirty;
  const visitWorkflowSteps: Array<{
    key: string;
    label: string;
    detail: string;
    state: "ready" | "active" | "locked";
  }> = [
    {
      key: "dictation",
      label: "Диктовка",
      detail: hasVisitTranscriptText ? "текст есть" : "начните голосом или текстом",
      state: hasVisitTranscriptText ? "ready" : "active"
    },
    {
      key: "draft",
      label: "Черновик",
      detail: draft ? "проверьте результат" : isVisitNoteDirty ? "есть ручные правки" : "соберите из диктовки",
      state: draft || isVisitNoteDirty ? "ready" : hasVisitTranscriptText ? "active" : "locked"
    },
    {
      key: "emk",
      label: "ЭМК",
      detail: visitHasSavedNote ? "запись сохранена" : visitNoteReadyToAccept ? "осталось подтвердить" : "ждет черновик",
      state: visitHasSavedNote ? "ready" : visitNoteReadyToAccept ? "active" : "locked"
    },
    {
      key: "close",
      label: "Закрытие",
      detail: visitCloseChecklist?.readyToSign ? "готово" : primaryVisitWarning?.title ?? "проверка в конце",
      state: visitCloseChecklist?.readyToSign ? "ready" : visitHasSavedNote ? "active" : "locked"
    }
  ];
  const visitPrimaryAction:
    | {
        kind: "dictation" | "draft" | "save" | "review" | "close";
        label: string;
        detail: string;
        disabled?: boolean;
        onClick: () => void;
      }
    = !hasVisitTranscriptText
    ? {
        kind: "dictation",
        label: isVisitDictating ? "Слушаю" : "Начать диктовку",
        detail: "Можно сразу говорить. Если микрофон не откроется, поле диктовки остается доступным для текста.",
        disabled: isVisitDictating,
        onClick: startVisitDictation
      }
    : !draft && !isVisitNoteDirty
      ? {
          kind: "draft",
          label: isDraftLoading ? "Собираю" : "Собрать черновик",
          detail: "Система разложит диктовку по полям ЭМК, врач потом проверит и сохранит.",
          disabled: isDraftLoading || !visitDraftReadyToBuild,
          onClick: () => void buildDraft()
        }
      : !visitHasSavedNote
        ? {
            kind: "save",
            label: visitNoteActionLabel,
            detail: "Проверьте поля ЭМК и сохраните запись приема.",
            disabled: !visitNoteReadyToAccept || isDraftAccepting,
            onClick: () => void acceptDraftToVisit()
          }
        : primaryVisitWarning
          ? {
              kind: "review",
              label: primaryVisitWarning.actionLabel,
              detail: primaryVisitWarning.detail,
              onClick: openVisitWarningAction
            }
          : {
              kind: "close",
              label: "Проверить закрытие",
              detail: visitCloseChecklist?.nextAction ?? "Финальная проверка оплаты, документов и подписи приема.",
              onClick: () => scrollToVisitArea(".close-checklist")
            };
  const speechRecoveryIssueCount =
    speechRecordingRecovery?.recordings.filter((recording) => recording.recoveryState !== "complete").length ?? 0;
  const speechRecoveryQualityIssueCount =
    speechRecordingRecovery?.recordings.reduce(
      (total, recording) =>
        total + recording.qualityCounts.review + recording.qualityCounts.empty + recording.qualityCounts.failed,
      0
    ) ?? 0;
  const currentSpeechQualityIssue =
    speechLastQuality && speechLastQuality.level !== "clear" ? speechLastQuality : null;
  const speechUploadReady = speechGatewayCanUpload(speechGatewayStatus);
  const speechRecognitionReady = speechUploadReady && isOnline;
  const speechGatewayActiveProviderIsLocal =
    speechGatewayStatus?.providerId === "local_whisper" || speechGatewayStatus?.providerId === "vosk_local";
  const emptyDictationVoiceActionLabel = speechRecognitionReady
    ? speechGatewayActiveProviderIsLocal
      ? "Распознать локально"
      : "Распознать на сервере"
    : "Сохранить в очередь";
  const pendingSpeechFlushActionLabel = speechRecognitionReady ? "Отправить звук" : "Проверить очередь";
  const pendingSpeechFlushActionTitle =
    speechRecognitionReady
      ? "Отправить сохраненные аудиофрагменты на распознавание."
      : "Проверить готовность распознавания. Аудио останется в локальной очереди, пока источник недоступен.";
  const speechSafetyValue = pendingSpeechChunkCount
    ? `${pendingSpeechChunkCount} аудио`
    : currentSpeechQualityIssue
      ? speechQualityLabels[currentSpeechQualityIssue.level]
      : speechRecognitionReady
        ? speechGatewayActiveProviderIsLocal
          ? "локальный модуль готов"
          : "распознавание готово"
        : "очередь локально";
  const speechSafetyDetail = pendingSpeechChunkCount
    ? "аудио сохранено и уйдет позже"
    : currentSpeechQualityIssue
      ? currentSpeechQualityIssue.nextAction
      : speechRecognitionReady
        ? speechGatewayActiveProviderIsLocal
          ? `${speechGatewayStatus?.providerLabel ?? "локальный модуль"}, фрагменты уходят в локальный модуль`
          : `${speechGatewayStatus?.providerLabel ?? "распознавание"}, звук отправляется частями`
        : "аудио хранится локально до готового источника";
  const speechSafetyState =
    pendingSpeechChunkCount || currentSpeechQualityIssue || !isOnline || !speechUploadReady
      ? "warn"
      : "ready";
  const browserContinuityCritical =
    browserContinuity !== null && (!browserContinuity.localStorageWritable || !browserContinuity.indexedDbSupported);
  const browserContinuityValue = !browserContinuity
    ? "проверка"
    : browserContinuityCritical
      ? "ограничено"
      : isOnline
        ? "онлайн"
        : "офлайн";
  const browserContinuityDetail = !browserContinuity
    ? "проверяю локальное хранилище"
    : browserContinuityCritical
      ? browserContinuity.warnings.slice(0, 2).join(", ") || "локальная защита ограничена"
      : `${browserContinuity.localStorageWritable ? "черновики ок" : "черновики выкл."} · ${
          browserContinuity.indexedDbSupported ? "очередь аудио ок" : "очередь аудио выкл."
        }`;
  const browserContinuityState = !browserContinuity ? "busy" : browserContinuityCritical ? "warn" : "ready";
  const browserCanRequestPersistentStorage =
    typeof navigator !== "undefined" && Boolean(navigator.storage) && typeof navigator.storage.persist === "function";
  const browserContinuityChecks = [
    {
      label: "Локальные черновики",
      value: browserContinuity?.localStorageWritable ? "ок" : browserContinuity ? "выкл." : "проверка",
      detail: lastLocalSavedAt ? `последнее ${formatTime(lastLocalSavedAt)}` : "проверка автосохранения"
    },
    {
      label: "Очередь аудио",
      value: browserContinuity?.indexedDbSupported ? "ок" : browserContinuity ? "выкл." : "проверка",
      detail: pendingSpeechChunkCount ? `фрагментов в очереди: ${pendingSpeechChunkCount}` : "аудио сохранится для отправки позже"
    },
    {
      label: "Выбор локальной КТ",
      value: browserContinuity?.directoryPickerSupported ? "папка" : browserContinuity?.filePickerSupported ? "файлы" : browserContinuity ? "ограничено" : "проверка",
      detail: browserContinuity?.directoryPickerSupported
        ? "доступ к папке только после выбора пользователем; CRM не сохраняет тяжелые данные снимков"
        : browserContinuity?.filePickerSupported
          ? "можно выбрать файлы вручную; постоянный доступ к папке не сохраняется"
          : "используйте серверный путь, настольный модуль или внешний просмотр"
    },
    {
      label: "OPFS браузера",
      value: browserContinuity?.opfsSupported ? "доступно" : browserContinuity ? "нет" : "проверка",
      detail: browserContinuity?.opfsSupported
        ? "синхронный файловый доступ только в worker; диагностическое хранение в CRM отключено"
        : "текущее восстановление КТ не требует OPFS"
    },
    {
      label: "Граница КТ-хранилища",
      value: browserContinuity?.browserCtOfflineStorageBoundary.mode === "metadata_only" ? "метаданные" : browserContinuity ? "ограничено" : "проверка",
      detail:
        browserContinuity?.browserCtOfflineStorageBoundary.mode === "metadata_only"
          ? "локально сохраняются план открытия, состояние и пометки; тяжелые данные снимков и 3D-моделей остаются во внешнем просмотре"
          : "локальное восстановление КТ не подтверждено"
    },
    {
      label: "Работа без сети",
      value: browserContinuity ? browserContinuityRegistrationLabels[browserContinuity.serviceWorkerRegistrationState] : "проверка",
      detail: browserContinuity?.serviceWorkerControlled ? "эта вкладка готова к работе без сети" : "обновите вкладку после включения офлайн-режима"
    },
    {
      label: "Память для офлайна",
      value: browserContinuity?.cacheStorageSupported ? "ок" : browserContinuity ? "выкл." : "проверка",
      detail: browserContinuity?.storagePersisted === true ? "браузер не должен очищать черновики сам" : "браузер может очистить при нехватке места"
    },
    {
      label: "Место",
      value: formatMegabytes(browserContinuity?.storageUsageMb ?? null),
      detail: browserContinuity?.storageQuotaMb != null ? `лимит ${formatMegabytes(browserContinuity.storageQuotaMb)}` : "оценка недоступна"
    },
    {
      label: "Синхронизация",
      value: isOnline ? "онлайн" : "офлайн",
      detail: pendingVisitSaveCount ? `в очереди сохранений приема: ${pendingVisitSaveCount}` : "серверная очередь пуста"
    }
  ];
  const localBridgeStatusState =
    !localBridgeReadiness
      ? "busy"
      : localBridgeReadiness.readyCount > 0
        ? "ready"
        : localBridgeReadiness.configuredCount > 0
          ? "warn"
          : "busy";
  const localBridgeStatusValue = !localBridgeReadiness
    ? "проверка"
    : localBridgeReadiness.readyCount
      ? `готово ${localBridgeReadiness.readyCount}/${localBridgeReadiness.bridges.length}`
      : localBridgeReadiness.configuredCount
        ? "настроено"
        : "не задано";
  const visitSafetyCards: Array<{ key: string; label: string; value: string; detail: string; state: "ready" | "warn" | "busy" }> = [
    {
      key: "local",
      label: "Локально",
      value: lastLocalSavedAt ? formatTime(lastLocalSavedAt) : localAutosaveReady ? "включено" : "загрузка",
      detail: localDraftWasRestored ? "черновик восстановлен на этом устройстве" : "автосохранение на этом устройстве",
      state: lastLocalSavedAt || localAutosaveReady ? "ready" : "busy"
    },
    {
      key: "server",
      label: "Сервер",
      value:
        serverDraftSyncState === "saving"
          ? "сохраняет"
          : serverDraftSyncState === "saved" && lastServerDraftSavedAt
            ? formatTime(lastServerDraftSavedAt)
            : serverDraftSyncState === "queued" || serverDraftSyncState === "error"
              ? "повторит"
              : "готов",
      detail: pendingVisitSaveCount ? `${pendingVisitSaveCount} сохранение ожидает синхронизацию` : "серверный черновик включен",
      state: serverDraftSyncState === "saving" ? "busy" : pendingVisitSaveCount || serverDraftSyncState === "queued" || serverDraftSyncState === "error" ? "warn" : "ready"
    },
    {
      key: "browser",
      label: "Устройство",
      value: browserContinuityValue,
      detail: browserContinuityDetail,
      state: browserContinuityState
    },
    {
      key: "stt",
      label: "Голос",
      value: speechSafetyValue,
      detail: speechSafetyDetail,
      state: speechSafetyState
    },
    {
      key: "recovery",
      label: "Восстановление",
      value: speechRecoveryIssueCount ? "проверить" : speechRecordingRecovery ? "чисто" : "скоро",
      detail: speechRecoveryQualityIssueCount
        ? `${speechRecoveryQualityIssueCount} фрагм. распознавания на проверку`
        : speechRecoveryIssueCount
          ? `${speechRecoveryIssueCount} запись требует внимания`
          : "потерь диктовки не видно",
      state: speechRecoveryIssueCount ? "warn" : speechRecordingRecovery ? "ready" : "busy"
    }
  ];

  function scrollToVisitArea(selector: string) {
    window.location.hash = "visit";
    window.requestAnimationFrame(() => {
      motionSafeScrollIntoView(document.querySelector(selector), { block: "start" });
    });
  }

  function appendToTranscript(text: string) {
    visitDraftUserEditedRef.current = true;
    setClearedTranscriptSnapshot(null);
    setTranscript((current: any) =>
      appendSpeechTextWithoutDuplicateTail(current, text, speechGatewayStatus?.chunkingPolicy.dedupeWindowChars ?? 600)
    );
  }

  function updateVisitNoteField(field: VisitNoteField, value: string) {
    visitDraftUserEditedRef.current = true;
    setVisitNoteForm((current) => ({ ...current, [field]: value }));
  }

  function buildOfflineDraft() {
    if (!hasVisitTranscriptText) {
      setError("Добавьте текст диктовки перед локальным разбором.");
      return;
    }
    visitDraftUserEditedRef.current = true;
    const fallbackDraft = buildOfflineVisitDraftFromTranscript(transcript, selectedSpecialty);
    setDraft(fallbackDraft);
    setVisitNoteForm(visitNoteFormFromDraft(fallbackDraft));
    scrollToVisitArea(".visit-note-panel");
  }

  function openVisitWarningAction() {
    if (!primaryVisitWarning) {
      scrollToVisitArea(".close-checklist");
      return;
    }
    if (primaryVisitWarning.section === "visit") {
      if (primaryVisitWarning.id === "ai-draft-review") {
        scrollToVisitArea(".ai-draft");
        return;
      }
      if (primaryVisitWarning.id === "clinical-rules") {
        const warningPanel = document.querySelector(".clinical-rule-panel-compact");
        if (warningPanel instanceof HTMLDetailsElement) {
          warningPanel.open = true;
        }
        scrollToVisitArea(".clinical-rule-panel");
        return;
      }
      scrollToVisitArea(".close-checklist");
      return;
    }
    window.location.hash = primaryVisitWarning.section;
  }

  function openScheduleWarning(warning: ScheduleWarning) {
    if (warning.actionLabel.toLowerCase().includes("связ")) {
      window.location.hash = "communications";
      return;
    }
    if (warning.actionLabel.toLowerCase().includes("оплат")) {
      window.location.hash = "finance";
      return;
    }
    if (warning.actionLabel.toLowerCase().includes("документ")) {
      window.location.hash = "documents";
      return;
    }
    if (warning.actionLabel.toLowerCase().includes("роль")) {
      window.location.hash = "settings";
      setSettingsTab("clinic");
      return;
    }
    if (warning.actionLabel.toLowerCase().includes("пациент")) {
      window.location.hash = "patients";
      return;
    }
    window.location.hash = "visit";
  }

  async function createPatient() {
    if (isPatientCreating) {
      setError("Дождитесь завершения создания карточки пациента.");
      return;
    }
    const fullName = newPatientName.trim();
    if (!fullName) {
      setError("Укажите ФИО пациента перед созданием карточки.");
      return;
    }
    const payload = {
      fullName,
      phone: nullablePatientDraftValue(newPatientPhone),
      birthDate: nullablePatientDraftValue(newPatientBirthDate)
    };
    setIsPatientCreating(true);
    try {
    const response = await fetch("/api/patients", {
      method: "POST",
      headers: denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      setError(await responseErrorMessage(response, "Пациент не создан"));
      return;
    }
    const patient = (await response.json()) as Patient;
    setNewPatientName("");
    setNewPatientPhone("");
    setNewPatientBirthDate("");
    setSelectedPatientId(patient.id);
    setQuery(patient.fullName);
    setDashboard((current) =>
      current
        ? {
            ...current,
            patients: [patient, ...current.patients.filter((entry) => entry.id !== patient.id)]
          }
        : current
    );
    setError(null);
    } catch (patientError) {
      setError(operatorWorkflowFailureMessage("Пациент не создан", patientError));
    } finally {
      setIsPatientCreating(false);
    }
  }

  async function changeClinicMode(mode: ClinicMode) {
    if (!(await saveClinicProfileIfDirty())) return;
    try {
    const response = await fetch("/api/settings/clinic/mode", {
      method: "POST",
      headers: settingsAccessHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ mode })
    });
    if (response.ok) {
      const clinicSettings = (await response.json()) as Dashboard["clinicSettings"];
      setDashboard((current) =>
        current
          ? {
              ...current,
              clinicName: clinicSettings.profile.clinicName,
              clinicSettings
            }
          : current
      );
      setClinicProfileDraft(clinicProfileDraftFromProfile(clinicSettings.profile));
      setClinicProfileDirty(false);
      setClinicProfileSaveState("saved");
      return;
    }
    if (!response.ok) {
      setError(await responseErrorMessage(response, "Режим клиники не сохранен"));
      return;
    }
    await loadDashboard();
    } catch (modeError) {
      setError(operatorWorkflowFailureMessage("Режим клиники не сохранен", modeError));
    }
  }

  async function addStaffMember(role: StaffRole) {
    const fullName = newStaffName.trim();
    if (!fullName) {
      setError("Введите ФИО сотрудника перед добавлением в команду.");
      return;
    }
    if (!(await saveClinicProfileIfDirty())) return;
    try {
    const response = await fetch("/api/settings/staff", {
      method: "POST",
      headers: settingsAccessHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        fullName,
        role,
        specialties: role === "doctor" || role === "assistant" ? [newStaffSpecialty] : ["universal"],
        workingHours: staffWorkingHoursFromSimpleDraft(
          clinicProfileDraft.workdayStart,
          clinicProfileDraft.workdayEnd,
          clinicProfileDraft.workingDays
        )
      })
    });
    if (!response.ok) {
      setError(await responseErrorMessage(response, "Сотрудник не добавлен"));
      return;
    }
    setNewStaffName("");
    setNewStaffRole("doctor");
    setNewStaffSpecialty(selectedSpecialty);
    await loadDashboard();
    } catch (staffError) {
      setError(operatorWorkflowFailureMessage("Сотрудник не добавлен", staffError));
    }
  }

  async function saveStaffSchedule(staffId: string): Promise<boolean> {
    const draft = staffScheduleDrafts[staffId];
    if (!draft) return false;
    const expectedSignature = staffScheduleDraftSignature(draft);
    setStaffScheduleSavingId(staffId);
    setStaffScheduleSaveStates((current: any) => ({ ...current, [staffId]: "saving" }));
    try {
      const response = await fetch(`/api/settings/staff/${staffId}/working-hours`, {
        method: "PUT",
        headers: settingsAccessHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ workingHours: staffWorkingHoursFromDraft(draft) })
      });
      if (!response.ok) {
        setStaffScheduleSaveStates((current: any) => ({ ...current, [staffId]: "error" }));
        setError(await responseErrorMessage(response, "Расписание сотрудника не сохранено"));
        return false;
      }
      const latestDraft = staffScheduleDraftsRef.current[staffId];
      const latestMatchesSaved = latestDraft ? staffScheduleDraftSignature(latestDraft) === expectedSignature : true;
      if (latestMatchesSaved) {
        setStaffScheduleDirtyIds((current) => {
          const next = new Set(current);
          next.delete(staffId);
          return next;
        });
      }
      setStaffScheduleSaveStates((current: any) => ({ ...current, [staffId]: latestMatchesSaved ? "saved" : "idle" }));
      await loadDashboard();
      return true;
    } catch (scheduleSaveError) {
      setStaffScheduleSaveStates((current: any) => ({ ...current, [staffId]: "error" }));
      setError(operatorWorkflowFailureMessage("Расписание сотрудника не сохранено", scheduleSaveError));
      return false;
    } finally {
      setStaffScheduleSavingId(null);
    }
  }

  async function saveChairSchedule(chairId: string): Promise<boolean> {
    const draft = chairScheduleDrafts[chairId];
    if (!draft) return false;
    const expectedSignature = staffScheduleDraftSignature(draft);
    setChairScheduleSavingId(chairId);
    setChairScheduleSaveStates((current) => ({ ...current, [chairId]: "saving" }));
    try {
      const response = await fetch(`/api/settings/chairs/${chairId}/working-hours`, {
        method: "PUT",
        headers: settingsAccessHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ workingHours: staffWorkingHoursFromDraft(draft) })
      });
      if (!response.ok) {
        setChairScheduleSaveStates((current) => ({ ...current, [chairId]: "error" }));
        setError(await responseErrorMessage(response, "Расписание кресла не сохранено"));
        return false;
      }
      const latestDraft = chairScheduleDraftsRef.current[chairId];
      const latestMatchesSaved = latestDraft ? staffScheduleDraftSignature(latestDraft) === expectedSignature : true;
      if (latestMatchesSaved) {
        setChairScheduleDirtyIds((current) => {
          const next = new Set(current);
          next.delete(chairId);
          return next;
        });
      }
      setChairScheduleSaveStates((current) => ({ ...current, [chairId]: latestMatchesSaved ? "saved" : "idle" }));
      await loadDashboard();
      return true;
    } catch (scheduleSaveError) {
      setChairScheduleSaveStates((current) => ({ ...current, [chairId]: "error" }));
      setError(operatorWorkflowFailureMessage("Расписание кресла не сохранено", scheduleSaveError));
      return false;
    } finally {
      setChairScheduleSavingId(null);
    }
  }

  async function saveAppointmentSchedule(
    appointmentId: string,
    options: { closeEditorOnSave?: boolean } = {}
  ): Promise<boolean> {
    if (appointmentScheduleSaveStates[appointmentId] === "saving") {
      setError("Дождитесь завершения текущего сохранения записи.");
      return false;
    }
    const draft = appointmentScheduleDrafts[appointmentId];
    if (!draft) {
      const message = "Откройте запись в расписании перед сохранением.";
      setAppointmentScheduleErrors((current) => ({ ...current, [appointmentId]: message }));
      setAppointmentScheduleSaveStates((current: any) => ({ ...current, [appointmentId]: "error" }));
      setError(message);
      return false;
    }
    const missing = appointmentScheduleMissingFields(draft, dashboard?.clinicSettings.profile?.mode);
    if (missing.length) {
      const message = `Перед сохранением записи: ${missing.join("; ")}.`;
      setAppointmentScheduleErrors((current) => ({ ...current, [appointmentId]: message }));
      setAppointmentScheduleSaveStates((current: any) => ({ ...current, [appointmentId]: "error" }));
      setError(message);
      return false;
    }
    const expectedSignature = appointmentScheduleDraftSignature(draft);
    setAppointmentScheduleSaveStates((current: any) => ({ ...current, [appointmentId]: "saving" }));
    setAppointmentScheduleErrors((current) => ({ ...current, [appointmentId]: null }));
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: scheduleMutationHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(appointmentUpdateInputFromDraft(draft))
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Запись не сохранена"));
      const payload = await response.json();
      const nextDashboard = dashboardSchema.parse(payload);
      setDashboard(nextDashboard);
      const savedAppointment = nextDashboard.appointments.find((appointment) => appointment.id === appointmentId);
      const latestDraft = appointmentScheduleDraftsRef.current[appointmentId];
      const latestMatchesSaved = latestDraft ? appointmentScheduleDraftSignature(latestDraft) === expectedSignature : true;
      if (savedAppointment && latestMatchesSaved) {
        setAppointmentScheduleDrafts((current: any) => ({
          ...current,
          [appointmentId]: appointmentScheduleDraftFromAppointment(savedAppointment)
        }));
      }
      if (latestMatchesSaved) {
        setAppointmentScheduleDirtyIds((current) => {
          const next = new Set(current);
          next.delete(appointmentId);
          return next;
        });
      }
      setAppointmentScheduleSaveStates((current: any) => ({ ...current, [appointmentId]: latestMatchesSaved ? "saved" : "idle" }));
      if (latestMatchesSaved && options.closeEditorOnSave !== false) setEditingAppointmentId(null);
      setError(null);
      return true;
    } catch (saveError) {
      const message = operatorWorkflowFailureMessage("Запись не сохранена", saveError);
      setAppointmentScheduleErrors((current) => ({ ...current, [appointmentId]: message }));
      setAppointmentScheduleSaveStates((current: any) => ({ ...current, [appointmentId]: "error" }));
      setError(message);
      return false;
    }
  }

  function newAppointmentMissingFields(draft: AppointmentScheduleDraft): string[] {
    return appointmentScheduleMissingFields(draft, dashboard?.clinicSettings.profile?.mode);
  }

  async function createAppointmentFromDraft(): Promise<boolean> {
    if (!dashboard) {
      setError("Данные клиники еще не загружены. Повторите создание записи после загрузки рабочего экрана.");
      return false;
    }
    if (newAppointmentSaveState === "saving") {
      setError("Дождитесь завершения текущего создания записи.");
      return false;
    }
    const missing = newAppointmentMissingFields(newAppointmentDraft);
    if (missing.length) {
      const message = `Перед созданием записи: ${missing.join("; ")}.`;
      setNewAppointmentError(message);
      setNewAppointmentSaveState("error");
      setError(message);
      return false;
    }
    setNewAppointmentSaveState("saving");
    setNewAppointmentError(null);
    const previousIds = new Set(dashboard.appointments.map((appointment) => appointment.id));
    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: scheduleMutationHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(appointmentCreateInputFromDraft(newAppointmentDraft))
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Запись не создана"));
      const payload = await response.json();
      const nextDashboard = dashboardSchema.parse(payload);
      const createdAppointment = nextDashboard.appointments.find((appointment) => !previousIds.has(appointment.id)) ?? null;
      const nextDraftPreferences = {
        selectedPatientId: newAppointmentDraft.patientId || selectedPatientId,
        selectedSpecialty,
        scheduleDefaultDoctorUserId: newAppointmentDraft.doctorUserId || null,
        scheduleDefaultAssistantUserId: newAppointmentDraft.assistantUserId || null,
        scheduleDefaultChairId: newAppointmentDraft.chairId || null
      };
      setSelectedPatientId(nextDraftPreferences.selectedPatientId ?? null);
      setScheduleDefaultDoctorUserId(nextDraftPreferences.scheduleDefaultDoctorUserId);
      setScheduleDefaultAssistantUserId(nextDraftPreferences.scheduleDefaultAssistantUserId);
      setScheduleDefaultChairId(nextDraftPreferences.scheduleDefaultChairId);
      setDashboard(nextDashboard);
      newAppointmentDraftUserEditedRef.current = false;
      setNewAppointmentDraft(newAppointmentDraftFromDashboard(nextDashboard, nextDraftPreferences));
      setNewAppointmentSaveState("saved");
      if (createdAppointment) {
        setAppointmentScheduleDrafts((current: any) => ({
          ...current,
          [createdAppointment.id]: appointmentScheduleDraftFromAppointment(createdAppointment)
        }));
        setEditingAppointmentId(createdAppointment.id);
      }
      setError(null);
      return true;
    } catch (createError) {
      const message = operatorWorkflowFailureMessage("Запись не создана", createError);
      setNewAppointmentError(message);
      setNewAppointmentSaveState("error");
      setError(message);
      return false;
    }
  }

  async function addChair() {
    const name = newChairName.trim();
    if (!name) {
      setError("Введите название кресла или кабинета перед добавлением.");
      return;
    }
    if (!(await saveClinicProfileIfDirty())) return;
    try {
    const response = await fetch("/api/settings/chairs", {
      method: "POST",
      headers: settingsAccessHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        name,
        room: name,
        specialization: selectedSpecialty,
        hasXraySensor: newChairHasXraySensor,
        hasMicroscope: newChairHasMicroscope,
        hasSurgeryKit: newChairHasSurgeryKit,
        workingHours: staffWorkingHoursFromSimpleDraft(
          clinicProfileDraft.workdayStart,
          clinicProfileDraft.workdayEnd,
          clinicProfileDraft.workingDays
        )
      })
    });
    if (!response.ok) {
      setError(await responseErrorMessage(response, "Кресло не добавлено"));
      return;
    }
    setNewChairName("");
    setNewChairHasXraySensor(true);
    setNewChairHasMicroscope(false);
    setNewChairHasSurgeryKit(false);
    await loadDashboard();
    } catch (chairError) {
      setError(operatorWorkflowFailureMessage("Кресло не добавлено", chairError));
    }
  }

  function chooseRecognitionPreset(preset: (typeof recognitionPresets)[number]) {
    setRecognitionKind(preset.kind);
    setRecognitionTarget(preset.target);
    setRecognitionText(preset.text);
    setRecognitionJob(null);
  }

  async function runRecognitionJob() {
    if (!recognitionText.trim()) {
      setError("Вставьте текст, OCR или диктовку перед распознаванием.");
      return;
    }
    setIsRecognitionLoading(true);
    try {
      const response = await fetch("/api/ai/recognition-jobs", {
        method: "POST",
        headers: denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          kind: recognitionKind,
          target: recognitionTarget,
          inputText: recognitionText,
          sourceLabel: `Настройки: ${aiJobKindLabels[recognitionKind]}`,
          patientId: activePatient?.id ?? null
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "Распознавание не подготовлено"));
      }
      const result = (await response.json()) as AiRecognitionJobResponse;
      setRecognitionJob(result.job);
      await loadDashboard();
    } catch (recognitionError) {
      setError(operatorWorkflowFailureMessage("Распознавание не подготовлено", recognitionError));
    } finally {
      setIsRecognitionLoading(false);
    }
  }

  async function analyzePricelist() {
    if (!pricelistText.trim() && !pricelistImageBase64) {
      setError("Вставьте прайс-лист или загрузите фото прайса перед разбором.");
      return;
    }
    setIsPricelistAnalyzing(true);
    try {
      const response = await fetch("/api/pricelist/analyze", {
        method: "POST",
        headers: denteClinicalReadHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          sourceName: "clinic-pricelist",
          sourceKind: pricelistImageBase64 ? "photo_ocr" : pricelistSourceKind,
          rawText: pricelistText,
          imageBase64: pricelistImageBase64 ?? undefined,
          imageMimeType: pricelistImageMimeType,
          preferredSpecialty: selectedSpecialty,
          useServerAi: usePricelistAi || Boolean(pricelistImageBase64)
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "Прайс не разобран"));
      }
      setPricelistAnalysis((await response.json()) as DentalPricelistAnalysisResponse);
    } catch (priceError) {
      setError(operatorWorkflowFailureMessage("Прайс не разобран", priceError));
    } finally {
      setIsPricelistAnalyzing(false);
    }
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

  async function ingestImportFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setError("Файл больше 8 МБ. Для больших архивов нужен пакетный импорт на сервере или распознавание через локальный модуль клиники.");
      return;
    }
    setIsDocumentIngesting(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const response = await fetch("/api/ingestion/extract", {
        method: "POST",
        headers: denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || null,
          fileBase64: dataUrl.split(",")[1] ?? "",
          target: documentIngestionTarget
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "Файл не разобран"));
      }
      const result = (await response.json()) as DocumentIngestionResponse;
      setDocumentIngestion(result);
      const extractedText = result.extractedText || result.textPreview;
      if (extractedText) {
        setSmartImportText(extractedText);
        setSmartImportPreview(null);
        setSmartImportCommit(null);
      }

      if (documentIngestionTarget === "patients") {
        if (extractedText) setImportText(extractedText);
        setImportPreview(null);
        setImportCommit(null);
        setImportIntake(null);
      }
      if (documentIngestionTarget === "imaging") {
        if (extractedText) setImagingImportText(extractedText);
        setImagingImportPreview(null);
        setImagingImportCommit(null);
      }
      if (documentIngestionTarget === "pricelist") {
        if (result.detectedKind === "image") {
          const prepared = await preparePricelistImage(file);
          setPricelistImageBase64(prepared.base64);
          setPricelistImageMimeType(prepared.mimeType);
          setPricelistImageName(file.name);
          setPricelistImageNote(`${prepared.note} Получено через общий импорт файлов.`);
          setPricelistSourceKind("photo_ocr");
          setUsePricelistAi(true);
        } else {
          clearPricelistImage();
        }
        setPricelistText(extractedText);
        setPricelistAnalysis(null);
        setSettingsTab("prices");
        window.location.hash = "settings/prices";
      }
    } catch (ingestionError) {
      setError(operatorWorkflowFailureMessage("Файл не разобран", ingestionError));
    } finally {
      setIsDocumentIngesting(false);
    }
  }

  function sendRecognitionResultToImport() {
    if (!recognitionJob) return;
    if (recognitionJob.target === "patient_import") {
      setImportSourceKind(recognitionJob.kind === "paper_ocr" ? "image_ocr" : "voice_dictation");
      setImportText(recognitionJob.resultText);
      setImportPreview(null);
      setImportCommit(null);
      setImportIntake(null);
    }
    if (recognitionJob.target === "visit_note") {
      visitDraftUserEditedRef.current = true;
      setTranscript(recognitionJob.resultText);
    }
  }

  function applyProtocolTemplate(template: ProtocolTemplate) {
    visitDraftUserEditedRef.current = true;
    setSelectedSpecialty(template.specialty);
    setSelectedProtocolId(template.id);
    const templatedText = [
      `${template.visitReason}.`,
      `Жалобы: ${template.complaintPrompt}`,
      `Объективно: ${template.objectiveTemplate}`,
      `Диагнозы к проверке: ${template.diagnosisHints.join("; ")}`,
      `План: ${template.treatmentPlanTemplate}`,
      `Документы: ${template.requiredDocuments.map((kind) => documentLabels[kind]).join(", ")}.`,
      `Снимки: ${template.suggestedImaging.map((kind) => imagingKindLabels[kind]).join(", ")}.`
    ].join("\n");
    setTranscript(templatedText);
    return templatedText;
  }

  async function polishSingleField(fieldKey: string, currentValue: string) {
    if (!currentValue.trim()) return;
    setPolishingField(fieldKey);
    try {
      const fieldLabels: Record<string, string> = {
        complaint: "Жалобы",
        anamnesis: "Анамнез заболевания",
        objectiveStatus: "Объективный статус / Данные осмотра",
        diagnosis: "Диагноз (МКБ-10)",
        treatmentPlan: "Протокол лечения / Выполненные манипуляции"
      };

      const promptText = `Раздел: ${fieldLabels[fieldKey] || fieldKey}. Текст для профессионального оформления: ${currentValue}`;
      
      const response = await fetch("/api/speech/polish-transcript", {
        method: "POST",
        headers: denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          transcript: promptText,
          specialty: selectedSpecialty,
          source: "voice"
        })
      });
      
      if (!response.ok) {
        throw new Error("Серверная полировка недоступна");
      }
      
      const result = await response.json();
      if (result.draft && result.draft[fieldKey]) {
        updateVisitNoteField(fieldKey as VisitNoteField, result.draft[fieldKey]);
      } else if (result.normalizedTranscript) {
        updateVisitNoteField(fieldKey as VisitNoteField, result.normalizedTranscript);
      }
    } catch (e) {
      if (e instanceof Error) {
        setError(`Не удалось улучшить поле через ИИ: ${e.message}`);
      }
    } finally {
      setPolishingField(null);
    }
  }

  async function polishTranscript() {
    if (!hasVisitTranscriptText) {
      setError("Перед очисткой диктовки: добавьте текст диктовки или нажмите голосовую запись.");
      return;
    }
    visitDraftUserEditedRef.current = true;
    setIsTranscriptPolishing(true);
    try {
      const response = await fetch("/api/speech/polish-transcript", {
        method: "POST",
        headers: denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          transcript,
          specialty: selectedSpecialty,
          source: "voice"
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "Серверная очистка диктовки недоступна"));
      }
      const result = (await response.json()) as SpeechTranscriptPolishResponse;
      setTranscript(result.normalizedTranscript);
      setDraft(result.draft);
      setVisitNoteForm(visitNoteFormFromDraft(result.draft));
      const polishLabel =
        result.polishMode === "deterministic_neural"
          ? `ИИ-полировка ${result.modelName ?? ""}`.trim()
          : "локальная проверка правил";
      setSpeechStatusNote(
        result.changedPhrases.length
          ? `Текст очищен (${polishLabel}): ${result.changedPhrases.slice(0, 4).join(", ")}`
          : `Текст проверен (${polishLabel}): факты не добавлялись.`
      );
    } catch (polishError) {
      const local = normalizeDentalSpeechTranscript(transcript, selectedSpecialty);
      const localDraft = buildRuleBasedVisitDraftFromTranscript(local.normalizedText, selectedSpecialty, {
        sourceLabel: "Локальная очистка диктовки"
      });
      setTranscript(local.normalizedText);
      setDraft(localDraft);
      setVisitNoteForm(visitNoteFormFromDraft(localDraft));
      setSpeechStatusNote("Текст очищен локальным разбором без сервера.");
      if (polishError instanceof Error) {
        setError(`${operatorWorkflowFailureMessage("Серверная очистка недоступна", polishError)} Использован локальный разбор.`);
      }
    } finally {
      setIsTranscriptPolishing(false);
    }
  }

  async function buildDraft(overrideTranscript?: string, overrideSpecialty?: DentalSpecialty) {
    const activeTranscript = overrideTranscript !== undefined ? overrideTranscript : transcript;
    const activeSpecialty = overrideSpecialty !== undefined ? overrideSpecialty : selectedSpecialty;
    const hasText = activeTranscript.trim().length > 0;

    if (!dashboard || !activePatient || !hasText) {
      const missingSteps = [
        !dashboard ? "дождитесь загрузки приема" : null,
        !activePatient ? "выберите пациента" : null,
        !hasText ? "добавьте текст диктовки или нажмите голосовую запись" : null
      ].filter((step): step is string => Boolean(step));
      setError(`Перед сборкой черновика: ${missingSteps.join(", ")}.`);
      return;
    }
    visitDraftUserEditedRef.current = true;
    setIsDraftLoading(true);
    try {
      const response = await fetch("/api/ai/visit-note-draft", {
        method: "POST",
        headers: denteClinicalReadHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          patientId: activePatient.id,
          transcript: activeTranscript,
          specialty: activeSpecialty,
          source: "voice"
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "Серверный черновик недоступен"));
      }
      const result = (await response.json()) as VisitNoteDraft;
      setDraft(result);
      setVisitNoteForm(visitNoteFormFromDraft(result));
      // Auto-update tooth map from AI-detected tooth codes
      if (result.quality?.detectedToothCodes?.length || result.quality?.detectedToothStates) {
        applyAiToothCodes(
          result.quality?.detectedToothCodes || [], 
          "planned", 
          result.quality?.detectedToothStates as any
        );
      }
      scrollToVisitArea(".visit-note-panel");
    } catch (draftError) {
      const fallbackDraft = buildOfflineVisitDraftFromTranscript(activeTranscript, activeSpecialty);
      setDraft(fallbackDraft);
      setVisitNoteForm(visitNoteFormFromDraft(fallbackDraft));
      scrollToVisitArea(".visit-note-panel");
      setError(`${operatorWorkflowFailureMessage("Серверный черновик недоступен", draftError)} Включен офлайн-разбор.`);
    } finally {
      setIsDraftLoading(false);
    }
  }

  async function acceptDraftToVisit() {
    if (!dashboard) {
      setError("Данные приема еще не загружены. Повторите сохранение после загрузки рабочего экрана.");
      return;
    }
    if (!visitNoteReadyToAccept) {
      setError(`Перед сохранением приема: ${visitNoteAcceptMissingSteps.join(", ")}.`);
      return;
    }
    setIsDraftAccepting(true);
    const acceptedDraft = visitNoteDraftFromForm(
      visitNoteForm,
      draft?.warnings ?? ["Правки внесены врачом вручную. Подпись приема остается отдельным действием."]
    );
    const doctorSummary = acceptedDraft.warnings.join(" ");
    const clientMutationId = createLocalQueueId();
    const baseRevision = dashboard.activeVisit.revision ?? null;
    try {
      const result = await submitAcceptedVisitDraft(dashboard.activeVisit.id, acceptedDraft, doctorSummary, {
        clientMutationId,
        baseRevision,
        clientSavedAt: new Date().toISOString()
      });
      applyAcceptedVisitResponse(result);
      scrollToVisitArea(".visit-fields");
    } catch (acceptError) {
      if (!acceptedVisitSaveFailureIsRetryable(acceptError)) {
        setError(operatorWorkflowFailureMessage("Прием не принят", acceptError));
        return;
      }
      const queued = await queuePendingVisitSave({
        visitId: dashboard.activeVisit.id,
        clientMutationId,
        baseRevision,
        draft: acceptedDraft,
        doctorSummary,
        transcript,
        selectedSpecialty
      }, activeOrganizationId);
      await refreshPendingVisitSaveState();
      const optimisticVisit = {
        ...dashboard.activeVisit,
        complaint: acceptedDraft.complaint,
        anamnesis: acceptedDraft.anamnesis,
        objectiveStatus: acceptedDraft.objectiveStatus,
        diagnosis: acceptedDraft.diagnosis,
        treatmentPlan: acceptedDraft.treatmentPlan,
        doctorSummary: doctorSummary || "Черновик ЭМК принят врачом локально и ожидает синхронизацию.",
        updatedAt: queued.queuedAt
      };
      setDashboard((current) => (current ? { ...current, activeVisit: optimisticVisit } : current));
      setDraft(null);
      setVisitNoteForm(visitNoteFormFromVisit(optimisticVisit));
      scrollToVisitArea(".visit-fields");
      setError(`${operatorWorkflowFailureMessage("Серверное сохранение недоступно", acceptError)} Прием сохранен локально и поставлен в очередь.`);
    } finally {
      setIsDraftAccepting(false);
    }
  }

  async function previewImport() {
    if (!importText.trim()) {
      setError("Вставьте список пациентов, OCR журнала или надиктуйте импорт перед проверкой.");
      return;
    }
    setIsImportLoading(true);
    try {
      const response = await fetch("/api/imports/patients/intake", {
        method: "POST",
        headers: denteClinicalReadHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          sourceName: importSourceKind,
          sourceKind: importSourceKind,
          rawText: importText
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "Импорт не проверен"));
      }
      const result = (await response.json()) as ImportIntakeResponse;
      setImportIntake(result);
      setImportPreview(result.preview);
      setImportText(result.normalizedText);
      setImportCommit(null);
    } catch (importError) {
      setError(operatorWorkflowFailureMessage("Импорт не проверен", importError));
    } finally {
      setIsImportLoading(false);
    }
  }

  async function commitImport() {
    if (isImportCommitting) {
      setError("Дождитесь завершения текущей записи импорта пациентов.");
      return;
    }
    if (!importText.trim()) {
      setError("Вставьте список пациентов, OCR журнала или надиктуйте импорт перед записью.");
      return;
    }
    if (!importPreview) {
      setError("Сначала проверьте импорт пациентов, чтобы увидеть готовые и проблемные строки.");
      return;
    }
    if (importPreview.readyRows === 0) {
      setError("В импорте пациентов нет готовых строк. Исправьте предупреждения и повторите проверку.");
      return;
    }
    setIsImportCommitting(true);
    try {
      const response = await fetch("/api/imports/patients/commit", {
        method: "POST",
        headers: denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          sourceName: importSourceKind,
          sourceKind: importSourceKind,
          rawText: importText
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "Импорт не записан"));
      }
      const result = (await response.json()) as ImportCommitResponse;
      setImportCommit(result);
      setImportPreview(result.preview);
      await loadDashboard();
    } catch (importError) {
      setError(operatorWorkflowFailureMessage("Импорт не записан", importError));
    } finally {
      setIsImportCommitting(false);
    }
  }

  async function previewSmartImportText(rawText: string, mode: SmartImportMode) {
    const cleanText = rawText.trim();
    if (!cleanText) {
      setError("Вставьте выгрузку из старой МИС, таблицу, OCR или диктовку перед разбором.");
      return;
    }
    setIsSmartImportLoading(true);
    try {
      const response = await fetch("/api/imports/smart/preview", {
        method: "POST",
        headers: denteClinicalReadHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          sourceName: "smart_mixed_export",
          mode,
          rawText: cleanText
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "Умный импорт не проверен"));
      }
      setSmartImportPreview((await response.json()) as SmartImportPreviewResponse);
      setSmartImportCommit(null);
    } catch (importError) {
      setError(operatorWorkflowFailureMessage("Умный импорт не проверен", importError));
    } finally {
      setIsSmartImportLoading(false);
    }
  }

  async function previewSmartImport() {
    await previewSmartImportText(smartImportText, smartImportMode);
  }

  async function commitSmartImport() {
    if (isSmartImportCommitting) {
      setError("Дождитесь завершения текущей записи умного импорта.");
      return;
    }
    if (!smartImportText.trim()) {
      setError("Вставьте выгрузку из старой МИС, таблицу, OCR или диктовку перед записью.");
      return;
    }
    if (!smartImportPreview) {
      setError("Сначала разберите умный импорт, чтобы увидеть готовые строки и пропуски.");
      return;
    }
    if (smartImportPreview.patientPreview.readyRows === 0 && smartImportPreview.imagingPreview.readyRows === 0) {
      setError("В умном импорте нет готовых пациентов или снимков. Исправьте строки и повторите разбор.");
      return;
    }
    setIsSmartImportCommitting(true);
    try {
      const response = await fetch("/api/imports/smart/commit", {
        method: "POST",
        headers: denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          sourceName: "smart_mixed_export",
          mode: smartImportMode,
          rawText: smartImportText
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "Умный импорт не записан"));
      }
      const result = (await response.json()) as SmartImportCommitResponse;
      setSmartImportCommit(result);
      setSmartImportPreview(result.preview);
      await loadDashboard();
    } catch (importError) {
      setError(operatorWorkflowFailureMessage("Умный импорт не записан", importError));
    } finally {
      setIsSmartImportCommitting(false);
    }
  }

  async function downloadSmartImportReport() {
    if (!smartImportText.trim()) {
      setError("Вставьте выгрузку из старой МИС, таблицу, OCR или диктовку перед отчетом проверки.");
      return;
    }
    setIsSmartReportLoading(true);
    try {
      const response = await fetch("/api/imports/smart/report.csv", {
        method: "POST",
        headers: denteClinicalReadHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          sourceName: "smart_mixed_export",
          mode: smartImportMode,
          rawText: smartImportText
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "Отчет импорта не создан"));
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "smart_import_report.csv";
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (reportError) {
      setError(operatorWorkflowFailureMessage("Отчет импорта не создан", reportError));
    } finally {
      setIsSmartReportLoading(false);
    }
  }

  async function downloadSmartImportSafeHandoffReport() {
    if (!smartImportText.trim()) {
      setError("Вставьте выгрузку из старой МИС, таблицу, OCR или диктовку перед отчетом переноса.");
      return;
    }
    setIsSmartSafeReportLoading(true);
    try {
      const response = await fetch("/api/imports/smart/report.safe.csv", {
        method: "POST",
        headers: denteClinicalReadHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          sourceName: "smart_mixed_export",
          mode: smartImportMode,
          rawText: smartImportText
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "Отчет переноса по импорту не создан"));
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "otchet_perenosa_importa.csv";
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (reportError) {
      setError(operatorWorkflowFailureMessage("Отчет переноса по импорту не создан", reportError));
    } finally {
      setIsSmartSafeReportLoading(false);
    }
  }

  function activeMigrationDiscoveryForAutopilot() {
    return migrationSourceDiscovery ?? browserMigrationDiscovery;
  }

  function migrationAutopilotRequestPayload(
    knownDiscovery: MigrationLocalSourceDiscoveryResponse | null = activeMigrationDiscoveryForAutopilot(),
    options: { includeSmartImportText?: boolean } = {}
  ) {
    const clinicPayload = {
      inn: clinicProfileDraft.inn,
      kpp: clinicProfileDraft.kpp,
      ogrn: clinicProfileDraft.ogrn,
      clinicName: clinicProfileDraft.clinicName,
      legalName: clinicProfileDraft.legalName,
      address: clinicProfileDraft.address,
      medicalLicenseNumber: clinicProfileDraft.medicalLicenseNumber
    };
    const hasClinicPayload = Object.values(clinicPayload).some((value) => typeof value === "string" && value.trim());
    const knownSources = knownDiscovery?.candidates.slice(0, 18);
    const includeSmartImportText = options.includeSmartImportText ?? (!knownDiscovery && Boolean(smartImportText.trim()));
    return {
      maxDepth: 5,
      maxFolders: 1600,
      maxFilesPerFolder: 160,
      maxCandidates: 18,
      maxProbeCandidates: 4,
      knownSources: knownSources?.length ? knownSources : undefined,
      knownScannedFolders: knownDiscovery?.scannedFolders,
      smartImport: includeSmartImportText && smartImportText.trim()
        ? {
            sourceName: "migration_text_autopilot",
            rawText: smartImportText,
            mode: smartImportMode
          }
        : undefined,
      clinic: hasClinicPayload ? clinicPayload : undefined
    };
  }

  async function runMigrationAutopilot(
    knownDiscovery: MigrationLocalSourceDiscoveryResponse | null = activeMigrationDiscoveryForAutopilot(),
    options: { includeSmartImportText?: boolean } = {}
  ) {
    setIsMigrationAutopilotLoading(true);
    setMigrationSourceWorkup(null);
    setMigrationSourceProbe(null);
    try {
      const response = await fetch("/api/imports/smart/migration-autopilot", {
        method: "POST",
        headers: denteClinicalReadHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(migrationAutopilotRequestPayload(knownDiscovery, options))
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "Автоплан миграции не построен"));
      }
      const result = (await response.json()) as MigrationAutopilotResponse;
      setMigrationAutopilot(result);
      setMigrationSourceDiscovery({
        version: "dental-crm-migration-local-discovery-v1",
        generatedAt: result.generatedAt,
        roots: result.discovery.roots,
        scannedFolders: result.discovery.scannedFolders,
        candidates: result.sources.map((source) => source.candidate),
        warnings: result.warnings,
        nextAction: result.nextAction
      });
      if (result.clinicLookup) setClinicPublicLookup(result.clinicLookup);
    } catch (autopilotError) {
      setError(operatorWorkflowFailureMessage("Автоплан миграции не построен", autopilotError));
    } finally {
      setIsMigrationAutopilotLoading(false);
    }
  }

  async function downloadMigrationHandoffReport() {
    const knownDiscovery = activeMigrationDiscoveryForAutopilot();
    if (!migrationAutopilot && !knownDiscovery && !smartImportText.trim()) {
      setError("Сначала запустите автоплан миграции, выберите папку/диск или вставьте текст выгрузки для плана переноса.");
      return;
    }
    setIsMigrationHandoffReportLoading(true);
    try {
      const response = await fetch("/api/imports/smart/migration-autopilot/report.csv", {
        method: "POST",
        headers: denteClinicalReadHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(migrationAutopilotRequestPayload(knownDiscovery, { includeSmartImportText: Boolean(smartImportText.trim()) }))
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "План миграции не создан"));
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "plan_perenosa_migracii.csv";
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (reportError) {
      setError(operatorWorkflowFailureMessage("План миграции не создан", reportError));
    } finally {
      setIsMigrationHandoffReportLoading(false);
    }
  }

  async function discoverMigrationSources() {
    setIsMigrationSourceDiscovering(true);
    setBrowserMigrationDiscovery(null);
    setMigrationAutopilot(null);
    setMigrationSourceWorkup(null);
    setMigrationSourceProbe(null);
    try {
      const response = await fetch("/api/imports/smart/local-source-discovery", {
        method: "POST",
        headers: denteClinicalReadHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          maxDepth: 5,
          maxFolders: 1600,
          maxFilesPerFolder: 160,
          maxCandidates: 18
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "Поиск старых источников не выполнен"));
      }
      const result = (await response.json()) as MigrationLocalSourceDiscoveryResponse;
      setMigrationSourceDiscovery(result);
      await runMigrationAutopilot(result);
    } catch (discoveryError) {
      setError(operatorWorkflowFailureMessage("Поиск старых источников не выполнен", discoveryError));
    } finally {
      setIsMigrationSourceDiscovering(false);
    }
  }

  function addMigrationDiscoveryCandidateToSmartImport(candidate: MigrationLocalSourceDiscoveryResponse["candidates"][number]) {
    setSmartImportMode("auto");
    setSmartImportText((current) => [current.trim(), candidate.smartImportLine].filter(Boolean).join("\n"));
    setSmartImportPreview(null);
    setSmartImportCommit(null);
  }

  function migrationCandidateCanPreview(candidate: MigrationLocalSourceDiscoveryResponse["candidates"][number]) {
    const materialCount =
      candidate.matchedFiles +
      candidate.databaseFiles +
      candidate.dumpFiles +
      candidate.tableFiles +
      candidate.archiveFiles +
      candidate.dicomLikeFiles +
      candidate.imageFiles;
    return materialCount > 0 || candidate.sourceRef.startsWith("browser-local:") || candidate.sourceRef.startsWith("smart-preview:");
  }

  async function previewMigrationDiscoveryCandidate(candidate: MigrationLocalSourceDiscoveryResponse["candidates"][number]) {
    if (!migrationCandidateCanPreview(candidate)) {
      setError("У найденного источника пока нет файлов для предпросмотра. Откройте план переноса или проверку источника.");
      return;
    }
    if (!candidate.smartImportLine.trim()) {
      setError("У найденного источника нет строки для умного предпросмотра. Откройте план или повторите поиск.");
      return;
    }
    setSmartImportMode("auto");
    setSmartImportText(candidate.smartImportLine);
    setSmartImportCommit(null);
    await previewSmartImportText(candidate.smartImportLine, "auto");
  }

  async function previewMigrationAutopilotSources(sourceFingerprint?: string | null) {
    const sources = migrationAutopilot?.sources ?? [];
    const selectedSources = sourceFingerprint ? sources.filter((source) => source.candidate.sourceFingerprint === sourceFingerprint) : [];
    if (sourceFingerprint && !selectedSources.length) {
      setError("Источник из автоплана уже не найден. Обновите автоплан или выберите источник из текущего списка.");
      return;
    }
    const previewSources = selectedSources.length
      ? selectedSources.filter((source) => migrationCandidateCanPreview(source.candidate))
      : sources.filter((source) => source.readiness.level === "ready_for_preview" || migrationCandidateCanPreview(source.candidate));
    if (selectedSources.length && !previewSources.length) {
      setError("У выбранного источника пока нет файлов для предпросмотра. Откройте план переноса или проверку источника.");
      return;
    }
    const sourceLines = Array.from(
      new Set(previewSources.slice(0, 12).map((source) => source.candidate.smartImportLine).filter(Boolean))
    );

    if (!sourceLines.length) {
      setError("Автоплан пока не дал строк для предпросмотра. Сначала запустите поиск на ПК или выберите папку/диск старой системы.");
      return;
    }

    const rawText = sourceLines.join("\n");
    setSmartImportMode("auto");
    setSmartImportText(rawText);
    setSmartImportCommit(null);
    await previewSmartImportText(rawText, "auto");
  }

  async function planMigrationDiscoveryCandidate(candidate: MigrationLocalSourceDiscoveryResponse["candidates"][number]) {
    setIsMigrationSourceWorkupLoading(true);
    try {
      const response = await fetch("/api/imports/smart/local-source-workup", {
        method: "POST",
        headers: denteClinicalReadHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          sourceRef: candidate.sourceRef,
          sourceKind: candidate.sourceKind,
          safeDisplayName: candidate.safeDisplayName
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "План переноса источника не построен"));
      }
      setMigrationSourceWorkup((await response.json()) as MigrationLocalSourceWorkupResponse);
    } catch (workupError) {
      setError(operatorWorkflowFailureMessage("План переноса источника не построен", workupError));
    } finally {
      setIsMigrationSourceWorkupLoading(false);
    }
  }

  async function probeMigrationDiscoveryCandidate(candidate: MigrationLocalSourceDiscoveryResponse["candidates"][number]) {
    setIsMigrationSourceProbeLoading(true);
    try {
      const response = await fetch("/api/imports/smart/local-source-probe", {
        method: "POST",
        headers: denteClinicalReadHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          sourceRef: candidate.sourceRef,
          sourceKind: candidate.sourceKind,
          safeDisplayName: candidate.safeDisplayName,
          maxDepth: 2,
          maxFolders: 120,
          maxFiles: 600,
          maxSampleArtifacts: 18,
          readHeaderBytes: 4096
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "Проверка источника не выполнена"));
      }
      setMigrationSourceProbe((await response.json()) as MigrationLocalSourceProbeResponse);
    } catch (probeError) {
      setError(operatorWorkflowFailureMessage("Проверка источника не выполнена", probeError));
    } finally {
      setIsMigrationSourceProbeLoading(false);
    }
  }

  async function lookupClinicPublicProfile() {
    const payload = {
      inn: clinicProfileDraft.inn,
      kpp: clinicProfileDraft.kpp,
      ogrn: clinicProfileDraft.ogrn,
      clinicName: clinicProfileDraft.clinicName,
      legalName: clinicProfileDraft.legalName,
      address: clinicProfileDraft.address,
      medicalLicenseNumber: clinicProfileDraft.medicalLicenseNumber
    };
    if (!Object.values(payload).some((value) => typeof value === "string" && value.trim())) {
      setError("Для поиска реквизитов клиники укажите ИНН, ОГРН, название, адрес или номер лицензии.");
      return;
    }
    setIsClinicPublicLookupLoading(true);
    try {
      const response = await fetch("/api/imports/smart/clinic-public-lookup", {
        method: "POST",
        headers: denteClinicalReadHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "Публичный поиск клиники не выполнен"));
      }
      setClinicPublicLookup((await response.json()) as ClinicPublicLookupResponse);
    } catch (lookupError) {
      setError(operatorWorkflowFailureMessage("Публичный поиск клиники не выполнен", lookupError));
    } finally {
      setIsClinicPublicLookupLoading(false);
    }
  }

  async function previewImagingImport() {
    if (!imagingImportText.trim()) {
      setError("Вставьте строки со снимками или выберите пример КТ/ОПТГ/ТРГ перед проверкой.");
      return;
    }
    setIsImagingImportLoading(true);
    try {
      const response = await fetch("/api/imaging/imports/preview", {
        method: "POST",
        headers: denteClinicalReadHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          sourceName: imagingImportSourceKind,
          sourceKind: imagingImportSourceKind,
          rawText: imagingImportText
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "Импорт снимков не проверен"));
      }
      setImagingImportPreview((await response.json()) as ImagingImportPreviewResponse);
      setImagingImportCommit(null);
      setDicomSeriesPreview(null);
    } catch (importError) {
      setError(operatorWorkflowFailureMessage("Импорт снимков не проверен", importError));
    } finally {
      setIsImagingImportLoading(false);
    }
  }

  function stageLocalImagingFolderRecovery(
    folderPath: string,
    metadata: Partial<Omit<LocalImagingFolderDraft, "version" | "folderPath" | "savedAt">> = {}
  ) {
    const cleanFolderPath = folderPath.trim();
    if (!cleanFolderPath || cleanFolderPath === "C:\\Images") {
      removeLocalImagingFolderDraft(activeOrganizationId);
      setLocalImagingFolderDraft(null);
      return null;
    }
    const fingerprint = (metadata.folderFingerprint ?? localImagingFolderFingerprint(cleanFolderPath)).toUpperCase();
    const draft: LocalImagingFolderDraft = {
      version: 1,
      folderPath: cleanFolderPath,
      safeDisplayName: metadata.safeDisplayName ?? `Локальная папка снимков #${fingerprint}`,
      sourceLabel: metadata.sourceLabel ?? "Ручной выбор локальной папки",
      sourceKind: metadata.sourceKind ?? "manual",
      folderFingerprint: fingerprint,
      origin: metadata.origin ?? "manual",
      savedAt: new Date().toISOString()
    };
    saveLocalImagingFolderDraft(draft, activeOrganizationId);
    setLocalImagingFolderDraft(draft);
    return draft;
  }

  function rememberLocalImagingFolder(
    folderPath: string,
    metadata: Partial<Omit<LocalImagingFolderDraft, "version" | "folderPath" | "savedAt">> = {}
  ) {
    const draft = stageLocalImagingFolderRecovery(folderPath, metadata);
    if (draft) setImagingFolderPath(draft.folderPath);
    return draft;
  }

  function clearLocalImagingFolderRecovery() {
    removeLocalImagingFolderDraft(activeOrganizationId);
    setLocalImagingFolderDraft(null);
    setImagingFolderPath("C:\\Images");
    setImagingFolderScan(null);
    setDicomFolderSeriesScan(null);
    setDicomFolderWorkupPlan(null);
    setDicomFirstFramePreview(null);
    setDicomLocalFolderDiscovery(null);
    setLocalImagingOrganizer(null);
  }

  function applyBrowserPickedImagingFolderPreview(preview: BrowserPickedImagingFolderPreview) {
    saveBrowserPickedImagingFolderPreview(preview, activeOrganizationId);
    setBrowserPickedImagingFolder(preview);
    setDicomLocalFolderDiscovery(null);
    setLocalImagingOrganizer(null);
    setDicomFolderSeriesScan(null);
    setDicomFolderWorkupPlan(null);
    setDicomFirstFramePreview(null);
    setImagingFolderScan(null);
  }

  function clearBrowserPickedImagingFolderPreview() {
    removeBrowserPickedImagingFolderPreview(activeOrganizationId);
    setBrowserPickedImagingFolder(null);
    setBrowserImagingScanProgress(null);
  }

  function cancelBrowserImagingFolderScan() {
    browserImagingScanAbortRef.current?.abort();
  }

  function startLocalDicomOperation() {
    localDicomOperationAbortRef.current?.abort();
    const controller = new AbortController();
    localDicomOperationAbortRef.current = controller;
    setIsLocalDicomOperationActive(true);
    return controller;
  }

  function finishLocalDicomOperation(controller: AbortController) {
    if (localDicomOperationAbortRef.current !== controller) return;
    localDicomOperationAbortRef.current = null;
    setIsLocalDicomOperationActive(false);
  }

  function cancelLocalDicomOperation() {
    localDicomOperationAbortRef.current?.abort();
  }

  function isLocalDicomOperationAbortError(error: unknown) {
    return isBrowserImagingScanAbortError(error);
  }

  async function runBrowserImagingFolderScan(input: {
    rootName: string;
    sourceKind: BrowserPickedImagingFolderPreview["sourceKind"];
    currentItem: string;
    errorMessage: string;
    scan: (options: BrowserImagingScanOptions) => Promise<BrowserPickedImagingFolderPreview>;
  }) {
    browserImagingScanAbortRef.current?.abort();
    const controller = new AbortController();
    browserImagingScanAbortRef.current = controller;
    const startedAt = new Date().toISOString();
    const runtime = createBrowserImagingScanRuntime(startedAt);
    const initialStats: BrowserPickedImagingScanStats = {
      rootName: input.rootName,
      sourceKind: input.sourceKind,
      scannedFiles: 0,
      scannedFolders: 0,
      dicomLikeFiles: 0,
      archiveFiles: 0,
      modelFiles: 0,
      imageFiles: 0,
      totalBytes: 0,
      warnings: []
    };
    setIsBrowserImagingFolderPicking(true);
    setBrowserImagingScanProgress(browserImagingScanProgressFromStats(initialStats, runtime, "scanning", input.currentItem));
    try {
      const preview = await input.scan({
        signal: controller.signal,
        startedAt,
        onProgress: setBrowserImagingScanProgress
      });
      if (controller.signal.aborted) return;
      setBrowserImagingScanProgress(
        browserImagingScanProgressFromStats(
          {
            rootName: preview.rootName,
            sourceKind: preview.sourceKind,
            scannedFiles: preview.scannedFiles,
            scannedFolders: preview.scannedFolders,
            dicomLikeFiles: preview.dicomLikeFiles,
            archiveFiles: preview.archiveFiles,
            modelFiles: preview.modelFiles,
            imageFiles: preview.imageFiles,
            totalBytes: preview.totalBytes,
            warnings: preview.warnings
          },
          runtime,
          "done",
          null
        )
      );
      applyBrowserPickedImagingFolderPreview(preview);
    } catch (scanError) {
      if (isBrowserImagingScanAbortError(scanError)) {
        setBrowserImagingScanProgress((current: any) =>
          current
            ? (() => {
                const updatedAt = new Date().toISOString();
                return {
                  ...current,
                  phase: "cancelled",
                  currentItem: null,
                  updatedAt,
                  elapsedMs: browserImagingScanElapsedFromIso(current.startedAt, updatedAt)
                };
              })()
            : null
        );
        return;
      }
      setError(browserLocalSourceErrorMessage(input.errorMessage, scanError));
    } finally {
      if (browserImagingScanAbortRef.current === controller) browserImagingScanAbortRef.current = null;
      setIsBrowserImagingFolderPicking(false);
    }
  }

  function browserMigrationStatsFor(
    statsByFolder: Map<string, BrowserMigrationFolderStats>,
    folderKey: string,
    folderHint: string,
    depth: number
  ) {
    const existing = statsByFolder.get(folderKey);
    if (existing) return existing;
    const stats: BrowserMigrationFolderStats = {
      folderKey,
      folderHint,
      depth,
      databaseFiles: 0,
      dumpFiles: 0,
      tableFiles: 0,
      archiveFiles: 0,
      dicomLikeFiles: 0,
      imageFiles: 0,
      modelFiles: 0,
      hasDicomDir: /\bdicomdir\b/i.test(folderHint),
      latestModifiedAt: null,
      totalBytes: 0
    };
    statsByFolder.set(folderKey, stats);
    return stats;
  }

  async function addBrowserMigrationFileToStats(input: {
    stats: BrowserMigrationFolderStats;
    file: File;
    fileName: string;
    allowMagicRead: boolean;
    signal?: AbortSignal | undefined;
  }): Promise<BrowserMigrationFileKind> {
    let kind = classifyBrowserMigrationFileName(input.fileName);
    if (kind === "other" && input.allowMagicRead) {
      throwIfBrowserMigrationScanAborted(input.signal);
      if (await browserFileHasDicomMagic(input.file)) kind = "dicom";
      throwIfBrowserMigrationScanAborted(input.signal);
    }
    input.stats.totalBytes += input.file.size;
    const modifiedAt = input.file.lastModified ? new Date(input.file.lastModified).toISOString() : null;
    if (modifiedAt && (!input.stats.latestModifiedAt || modifiedAt > input.stats.latestModifiedAt)) input.stats.latestModifiedAt = modifiedAt;
    if (input.fileName.toLowerCase() === "dicomdir") input.stats.hasDicomDir = true;
    if (kind === "database") input.stats.databaseFiles += 1;
    else if (kind === "dump") input.stats.dumpFiles += 1;
    else if (kind === "table") input.stats.tableFiles += 1;
    else if (kind === "archive") input.stats.archiveFiles += 1;
    else if (kind === "dicom") input.stats.dicomLikeFiles += 1;
    else if (kind === "image") input.stats.imageFiles += 1;
    else if (kind === "model") input.stats.modelFiles += 1;
    return kind;
  }

  function applyBrowserMigrationDiscovery(discovery: MigrationLocalSourceDiscoveryResponse) {
    setBrowserMigrationDiscovery(discovery);
    setMigrationSourceDiscovery(discovery);
    setMigrationAutopilot(null);
    setMigrationSourceWorkup(null);
    setMigrationSourceProbe(null);
  }

  function cancelBrowserMigrationScan() {
    browserMigrationScanAbortRef.current?.abort();
  }

  async function runBrowserMigrationSourceScan(input: {
    rootName: string;
    sourceKind: BrowserMigrationScanStats["sourceKind"];
    currentItem: string;
    errorMessage: string;
    scan: (options: BrowserMigrationScanOptions) => Promise<MigrationLocalSourceDiscoveryResponse>;
  }): Promise<void> {
    browserMigrationScanAbortRef.current?.abort();
    const controller = new AbortController();
    browserMigrationScanAbortRef.current = controller;
    const startedAt = new Date().toISOString();
    const runtime = createBrowserMigrationScanRuntime(startedAt);
    const initialStats: BrowserMigrationScanStats = {
      rootName: input.rootName,
      sourceKind: input.sourceKind,
      scannedFiles: 0,
      scannedFolders: 0,
      databaseFiles: 0,
      dumpFiles: 0,
      tableFiles: 0,
      archiveFiles: 0,
      dicomLikeFiles: 0,
      imageFiles: 0,
      modelFiles: 0,
      totalBytes: 0,
      warnings: []
    };
    setIsBrowserMigrationScanning(true);
    setBrowserMigrationScanProgress(browserMigrationScanProgressFromStats(initialStats, runtime, "scanning", input.currentItem));
    try {
      const discovery = await input.scan({
        signal: controller.signal,
        startedAt,
        onProgress: setBrowserMigrationScanProgress
      });
      if (controller.signal.aborted) return;
      applyBrowserMigrationDiscovery(discovery);
      await runMigrationAutopilot(discovery);
    } catch (scanError) {
      if (isBrowserMigrationScanAbortError(scanError)) {
        setBrowserMigrationScanProgress((current) =>
          current
            ? (() => {
                const updatedAt = new Date().toISOString();
                return {
                  ...current,
                  phase: "cancelled",
                  currentItem: null,
                  updatedAt,
                  elapsedMs: browserImagingScanElapsedFromIso(current.startedAt, updatedAt)
                };
              })()
            : null
        );
        return;
      }
      setError(browserLocalSourceErrorMessage(input.errorMessage, scanError));
    } finally {
      if (browserMigrationScanAbortRef.current === controller) browserMigrationScanAbortRef.current = null;
      setIsBrowserMigrationScanning(false);
    }
  }

  async function scanBrowserMigrationDirectoryHandle(
    directoryHandle: BrowserFileSystemDirectoryHandle,
    options: BrowserMigrationScanOptions
  ): Promise<MigrationLocalSourceDiscoveryResponse> {
    const runtime = createBrowserMigrationScanRuntime(options.startedAt);
    const warnings: string[] = [];
    const statsByFolder = new Map<string, BrowserMigrationFolderStats>();
    let scannedFiles = 0;
    let scannedFolders = 0;
    let magicReads = 0;
    const progressStats: BrowserMigrationScanStats = {
      rootName: directoryHandle.name || "browser-selected-folder",
      sourceKind: "browser_directory_picker",
      scannedFiles: 0,
      scannedFolders: 0,
      databaseFiles: 0,
      dumpFiles: 0,
      tableFiles: 0,
      archiveFiles: 0,
      dicomLikeFiles: 0,
      imageFiles: 0,
      modelFiles: 0,
      totalBytes: 0,
      warnings
    };
    const stack: Array<{ handle: BrowserFileSystemDirectoryHandle; key: string; hint: string; depth: number }> = [
      { handle: directoryHandle, key: "root", hint: directoryHandle.name, depth: 0 }
    ];

    publishBrowserMigrationScanProgress(progressStats, options, runtime, "проверка выбранной папки", "scanning", true);

    while (stack.length > 0 && scannedFolders < browserMigrationScanFolderLimit && scannedFiles < browserMigrationScanFileLimit) {
      throwIfBrowserMigrationScanAborted(options.signal);
      const current = stack.pop();
      if (!current) break;
      scannedFolders += 1;
      progressStats.scannedFolders = scannedFolders;
      runtime.processedUnits += 1;
      browserMigrationStatsFor(statsByFolder, current.key, current.hint, current.depth);
      publishBrowserMigrationScanProgress(progressStats, options, runtime, "проверка подпапок старой системы");
      await maybeYieldBrowserMigrationScan(runtime, options.signal);
      try {
        let inspectedDirectoryEntries = 0;
        for await (const [entryName, handle] of current.handle.entries()) {
          throwIfBrowserMigrationScanAborted(options.signal);
          inspectedDirectoryEntries += 1;
          if (inspectedDirectoryEntries > browserMigrationScanDirectoryEntryLimit) {
            warnings.push(`Браузерный список ограничил одну папку ${browserMigrationScanDirectoryEntryLimit} элементами для отзывчивости интерфейса.`);
            break;
          }
          if (handle.kind === "directory") {
            if (scannedFolders + stack.length < browserMigrationScanFolderLimit) {
              stack.push({
                handle,
                key: `${current.key}/${entryName}`,
                hint: `${current.hint} ${entryName}`,
                depth: current.depth + 1
              });
            }
            continue;
          }
          if (scannedFiles >= browserMigrationScanFileLimit) break;
          scannedFiles += 1;
          progressStats.scannedFiles = scannedFiles;
          const file = await handle.getFile();
          throwIfBrowserMigrationScanAborted(options.signal);
          const stats = browserMigrationStatsFor(statsByFolder, current.key, `${current.hint} ${entryName}`, current.depth);
          const allowMagicRead = magicReads < browserMigrationScanMagicReadLimit;
          if (allowMagicRead) magicReads += 1;
          const kind = await addBrowserMigrationFileToStats({
            stats,
            file,
            fileName: entryName,
            allowMagicRead,
            ...(options.signal ? { signal: options.signal } : {})
          });
          addBrowserMigrationKindToScanStats(progressStats, kind, file.size);
          runtime.processedUnits += 1;
          publishBrowserMigrationScanProgress(progressStats, options, runtime, "проверка старых баз, выгрузок и снимков");
          await maybeYieldBrowserMigrationScan(runtime, options.signal);
        }
      } catch (scanError) {
        if (isBrowserMigrationScanAbortError(scanError)) throw scanError;
        warnings.push("Одну выбранную в браузере подпапку не удалось прочитать; она пропущена.");
      }
    }

    if (scannedFiles >= browserMigrationScanFileLimit) warnings.push(`Браузерный список ограничен ${browserMigrationScanFileLimit} файлами для отзывчивости интерфейса.`);
    if (scannedFolders >= browserMigrationScanFolderLimit) warnings.push(`Браузерный список ограничен ${browserMigrationScanFolderLimit} папками для отзывчивости интерфейса.`);
    publishBrowserMigrationScanProgress(progressStats, options, runtime, null, "done", true);
    return buildBrowserMigrationDiscovery({
      rootName: directoryHandle.name || "browser-selected-folder",
      sourceLabel: "Браузерный список папки",
      scannedFolders,
      scannedFiles,
      folderStats: Array.from(statsByFolder.values()),
      warnings
    });
  }

  async function scanBrowserMigrationFileList(fileList: FileList, options: BrowserMigrationScanOptions): Promise<MigrationLocalSourceDiscoveryResponse> {
    const runtime = createBrowserMigrationScanRuntime(options.startedAt);
    const warnings: string[] = [];
    const statsByFolder = new Map<string, BrowserMigrationFolderStats>();
    const selectedFileCount = fileList.length;
    const scanCount = Math.min(selectedFileCount, browserMigrationScanFileLimit);
    let scannedFiles = 0;
    let magicReads = 0;
    const folders = new Set<string>();
    const progressStats: BrowserMigrationScanStats = {
      rootName: "browser-selected-files",
      sourceKind: "browser_file_input",
      scannedFiles: 0,
      scannedFolders: 1,
      databaseFiles: 0,
      dumpFiles: 0,
      tableFiles: 0,
      archiveFiles: 0,
      dicomLikeFiles: 0,
      imageFiles: 0,
      modelFiles: 0,
      totalBytes: 0,
      warnings
    };

    publishBrowserMigrationScanProgress(progressStats, options, runtime, "проверка выбранных файлов", "scanning", true);

    for (let fileIndex = 0; fileIndex < scanCount; fileIndex += 1) {
      throwIfBrowserMigrationScanAborted(options.signal);
      const file = fileList.item(fileIndex);
      if (!file) continue;
      scannedFiles += 1;
      progressStats.scannedFiles = scannedFiles;
      const relativePath = file.webkitRelativePath || file.name;
      const parts = relativePath.split(/[\\/]+/).filter(Boolean);
      const folderParts = parts.slice(0, -1);
      const folderKey = folderParts.join("/") || "root";
      const folderHint = folderParts.concat(file.name).join(" ");
      folders.add(folderKey);
      const stats = browserMigrationStatsFor(statsByFolder, folderKey, folderHint, Math.max(0, folderParts.length - 1));
      progressStats.scannedFolders = Math.max(1, folders.size);
      const allowMagicRead = magicReads < browserMigrationScanMagicReadLimit;
      if (allowMagicRead) magicReads += 1;
      const kind = await addBrowserMigrationFileToStats({
        stats,
        file,
        fileName: file.name,
        allowMagicRead,
        ...(options.signal ? { signal: options.signal } : {})
      });
      addBrowserMigrationKindToScanStats(progressStats, kind, file.size);
      runtime.processedUnits += 1;
      publishBrowserMigrationScanProgress(progressStats, options, runtime, "проверка старых баз, выгрузок и снимков");
      await maybeYieldBrowserMigrationScan(runtime, options.signal);
    }

    if (selectedFileCount > browserMigrationScanFileLimit) warnings.push(`Браузерный список ограничен ${browserMigrationScanFileLimit} файлами для отзывчивости интерфейса.`);
    publishBrowserMigrationScanProgress(progressStats, options, runtime, null, "done", true);
    return buildBrowserMigrationDiscovery({
      rootName: "browser-selected-files",
      sourceLabel: "Браузерный список файлов",
      scannedFolders: Math.max(1, folders.size),
      scannedFiles,
      folderStats: Array.from(statsByFolder.values()),
      warnings
    });
  }

  async function pickBrowserMigrationSource() {
    setIsBrowserMigrationScanning(true);
    try {
      const picker = (window as BrowserDirectoryPickerWindow).showDirectoryPicker;
      if (typeof picker === "function") {
        const directoryHandle = await picker({ id: "dental-crm-legacy-migration", mode: "read" });
        await runBrowserMigrationSourceScan({
          rootName: directoryHandle.name || "browser-selected-folder",
          sourceKind: "browser_directory_picker",
          currentItem: "проверка выбранной папки",
          errorMessage: "Браузер не открыл выбор старой базы или папки снимков",
          scan: (options) => scanBrowserMigrationDirectoryHandle(directoryHandle, options)
        });
        return;
      }
      browserMigrationInputRef.current?.click();
    } catch (pickerError) {
      if (pickerError instanceof DOMException && pickerError.name === "AbortError") return;
      setError(browserLocalSourceErrorMessage("Браузер не открыл выбор старой базы или папки снимков", pickerError));
    } finally {
      setIsBrowserMigrationScanning(false);
    }
  }

  async function handleBrowserMigrationInputChange(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setIsBrowserMigrationScanning(true);
    try {
      await runBrowserMigrationSourceScan({
        rootName: "browser-selected-files",
        sourceKind: "browser_file_input",
        currentItem: "проверка выбранных файлов",
        errorMessage: "Браузер не разобрал выбранные файлы старой системы",
        scan: (options) => scanBrowserMigrationFileList(fileList, options)
      });
    } catch (pickerError) {
      setError(browserLocalSourceErrorMessage("Браузер не разобрал выбранные файлы старой системы", pickerError));
    } finally {
      setIsBrowserMigrationScanning(false);
      if (browserMigrationInputRef.current) browserMigrationInputRef.current.value = "";
    }
  }

  async function scanBrowserDirectoryHandle(
    directoryHandle: BrowserFileSystemDirectoryHandle,
    options: BrowserImagingScanOptions
  ): Promise<BrowserPickedImagingFolderPreview> {
    const runtime = createBrowserImagingScanRuntime(options.startedAt);
    const stats: BrowserPickedImagingScanStats = {
      rootName: "Выбранная папка браузера",
      sourceKind: "browser_directory_picker",
      scannedFiles: 0,
      scannedFolders: 0,
      dicomLikeFiles: 0,
      archiveFiles: 0,
      modelFiles: 0,
      imageFiles: 0,
      totalBytes: 0,
      warnings: []
    };
    let magicReads = 0;
    const stack: BrowserFileSystemDirectoryHandle[] = [directoryHandle];

    publishBrowserImagingScanProgress(stats, options, runtime, "проверка выбранной папки", "scanning", true);

    while (stack.length > 0 && stats.scannedFolders < browserImagingScanFolderLimit && stats.scannedFiles < browserImagingScanFileLimit) {
      throwIfBrowserImagingScanAborted(options.signal);
      const current = stack.pop();
      if (!current) break;
      stats.scannedFolders += 1;
      runtime.processedUnits += 1;
      publishBrowserImagingScanProgress(stats, options, runtime, "проверка подпапок");
      await maybeYieldBrowserImagingScan(runtime, options.signal);
      try {
        let inspectedDirectoryEntries = 0;
        for await (const [, handle] of current.entries()) {
          throwIfBrowserImagingScanAborted(options.signal);
          inspectedDirectoryEntries += 1;
          if (inspectedDirectoryEntries > browserImagingScanDirectoryEntryLimit) {
            stats.warnings.push(`Браузерное сканирование ограничило одну папку ${browserImagingScanDirectoryEntryLimit} элементами для отзывчивости интерфейса.`);
            break;
          }
          if (handle.kind === "directory") {
            if (stats.scannedFolders + stack.length < browserImagingScanFolderLimit) stack.push(handle);
            continue;
          }
          if (stats.scannedFiles >= browserImagingScanFileLimit) break;
          stats.scannedFiles += 1;
          const file = await handle.getFile();
          stats.totalBytes += file.size;
          let kind = classifyBrowserImagingFileName(handle.name);
          if (kind === "other" && magicReads < browserImagingScanMagicReadLimit) {
            magicReads += 1;
            if (await browserFileHasDicomMagic(file)) kind = "dicom";
          }
          throwIfBrowserImagingScanAborted(options.signal);
          if (kind === "dicom") stats.dicomLikeFiles += 1;
          else if (kind === "archive") stats.archiveFiles += 1;
          else if (kind === "model") stats.modelFiles += 1;
          else if (kind === "image") stats.imageFiles += 1;
          runtime.processedUnits += 1;
          publishBrowserImagingScanProgress(stats, options, runtime, "проверка файлов КТ и 3D");
          await maybeYieldBrowserImagingScan(runtime, options.signal);
        }
      } catch (scanError) {
        if (isBrowserImagingScanAbortError(scanError)) throw scanError;
        stats.warnings.push("Одну выбранную в браузере подпапку не удалось прочитать, она пропущена.");
      }
    }

    if (stats.scannedFiles >= browserImagingScanFileLimit) {
      stats.warnings.push(`Браузерное сканирование ограничено ${browserImagingScanFileLimit} файлами для отзывчивости интерфейса.`);
    }
    if (stats.scannedFolders >= browserImagingScanFolderLimit) {
      stats.warnings.push(`Браузерное сканирование ограничено ${browserImagingScanFolderLimit} папками для отзывчивости интерфейса.`);
    }
    stats.warnings.push("Браузер проверил выбранную папку без передачи полного пути. Для полноценного открытия тяжелой КТ выберите эту же папку в локальном модуле клиники или укажите путь на рабочем ПК.");
    publishBrowserImagingScanProgress(stats, options, runtime, null, "done", true);

    return buildBrowserPickedImagingFolderPreview(stats);
  }

  async function scanBrowserFileList(fileList: FileList, options: BrowserImagingScanOptions): Promise<BrowserPickedImagingFolderPreview> {
    const runtime = createBrowserImagingScanRuntime(options.startedAt);
    const folders = new Set<string>();
    const selectedFileCount = fileList.length;
    const scanCount = Math.min(selectedFileCount, browserImagingScanFileLimit);
    let magicReads = 0;
    const stats: BrowserPickedImagingScanStats = {
      rootName: "Выбранные файлы браузера",
      sourceKind: "browser_file_input",
      scannedFiles: 0,
      scannedFolders: 1,
      dicomLikeFiles: 0,
      archiveFiles: 0,
      modelFiles: 0,
      imageFiles: 0,
      totalBytes: 0,
      warnings: []
    };

    publishBrowserImagingScanProgress(stats, options, runtime, "проверка выбранных файлов", "scanning", true);

    for (let fileIndex = 0; fileIndex < scanCount; fileIndex += 1) {
      const file = fileList.item(fileIndex);
      if (!file) continue;
      throwIfBrowserImagingScanAborted(options.signal);
      stats.scannedFiles += 1;
      stats.totalBytes += file.size;
      const relativePath = file.webkitRelativePath || file.name;
      const parts = relativePath.split(/[\\/]+/).filter(Boolean);
      for (let index = 0; index < Math.max(1, parts.length - 1); index += 1) {
        folders.add(parts.slice(0, index + 1).join("/"));
      }
      stats.scannedFolders = Math.max(1, folders.size);
      let kind = classifyBrowserImagingFileName(file.name);
      if (kind === "other" && magicReads < browserImagingScanMagicReadLimit) {
        magicReads += 1;
        if (await browserFileHasDicomMagic(file)) kind = "dicom";
      }
      throwIfBrowserImagingScanAborted(options.signal);
      if (kind === "dicom") stats.dicomLikeFiles += 1;
      else if (kind === "archive") stats.archiveFiles += 1;
      else if (kind === "model") stats.modelFiles += 1;
      else if (kind === "image") stats.imageFiles += 1;
      runtime.processedUnits += 1;
      publishBrowserImagingScanProgress(stats, options, runtime, "проверка файлов КТ и 3D");
      await maybeYieldBrowserImagingScan(runtime, options.signal);
    }

    if (selectedFileCount > browserImagingScanFileLimit) {
      stats.warnings.push(`Браузерное сканирование ограничено ${browserImagingScanFileLimit} файлами для отзывчивости интерфейса.`);
    }
    stats.warnings.push("Файлы выбраны через запасной режим браузера. После обновления страницы их нужно выбрать заново; для постоянной привязки лучше выбрать папку или локальный модуль клиники.");
    publishBrowserImagingScanProgress(stats, options, runtime, null, "done", true);

    return buildBrowserPickedImagingFolderPreview(stats);
  }

  async function pickBrowserImagingFolder() {
    setIsBrowserImagingFolderPicking(true);
    try {
      const picker = (window as BrowserDirectoryPickerWindow).showDirectoryPicker;
      if (typeof picker === "function") {
        const directoryHandle = await picker({ id: "dental-crm-local-imaging", mode: "read" });
        await runBrowserImagingFolderScan({
          rootName: "Выбранная папка браузера",
          sourceKind: "browser_directory_picker",
          currentItem: "проверка выбранной папки",
          errorMessage: "Браузер не открыл выбор папки снимков",
          scan: (options) => scanBrowserDirectoryHandle(directoryHandle, options)
        });
        return;
      }
      browserDirectoryInputRef.current?.click();
    } catch (pickerError) {
      if (pickerError instanceof DOMException && pickerError.name === "AbortError") return;
      setError(browserLocalSourceErrorMessage("Браузер не открыл выбор папки снимков", pickerError));
    } finally {
      setIsBrowserImagingFolderPicking(false);
    }
  }

  async function handleBrowserDirectoryInputChange(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setIsBrowserImagingFolderPicking(true);
    try {
      await runBrowserImagingFolderScan({
        rootName: "Выбранные файлы браузера",
        sourceKind: "browser_file_input",
        currentItem: "проверка выбранных файлов",
        errorMessage: "Браузер не открыл выбор файлов снимков",
        scan: (options) => scanBrowserFileList(fileList, options)
      });
    } catch (pickerError) {
      setError(browserLocalSourceErrorMessage("Браузер не открыл выбор файлов снимков", pickerError));
    } finally {
      setIsBrowserImagingFolderPicking(false);
      if (browserDirectoryInputRef.current) browserDirectoryInputRef.current.value = "";
    }
  }

  async function discoverDicomFolders() {
    const controller = startLocalDicomOperation();
    setIsDicomLocalDiscovering(true);
    try {
      const response = await fetch("/api/imaging/dicom/local-folder-discovery", {
        method: "POST",
        signal: controller.signal,
        headers: denteClinicalReadHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          maxDepth: 6,
          maxFolders: 1200,
          maxFilesPerFolder: 160,
          minDicomFiles: 2,
          maxCandidates: 12
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "Поиск папок со снимками не выполнен"));
      }
      const result = (await response.json()) as DicomLocalFolderDiscoveryResponse;
      setDicomLocalFolderDiscovery(result);
      setDicomFolderSeriesScan(null);
      setDicomFolderWorkupPlan(null);
      setDicomFirstFramePreview(null);
      setImagingFolderScan(null);
      setLocalImagingOrganizer(null);
    } catch (discoveryError) {
      if (isLocalDicomOperationAbortError(discoveryError)) return;
      setError(operatorWorkflowFailureMessage("Поиск папок со снимками не выполнен", discoveryError));
    } finally {
      finishLocalDicomOperation(controller);
      setIsDicomLocalDiscovering(false);
    }
  }

  async function organizeLocalImagingSources() {
    const controller = startLocalDicomOperation();
    setIsLocalImagingOrganizing(true);
    try {
      const candidateRoot = imagingFolderPath.trim();
      const useSpecificRoot = candidateRoot.length > 0 && candidateRoot !== "C:\\Images";
      if (useSpecificRoot) rememberLocalImagingFolder(candidateRoot, { origin: "manual" });
      const response = await fetch("/api/imaging/local-organizer/scan-preview", {
        method: "POST",
        signal: controller.signal,
        headers: denteClinicalReadHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          rootPaths: useSpecificRoot ? [candidateRoot] : undefined,
          maxDepth: 6,
          maxFolders: 1400,
          maxFilesPerFolder: 220,
          maxCandidates: 14,
          includeDentalModels: true,
          includeDicom: true
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "Локальный организатор снимков не выполнен"));
      }
      const result = (await response.json()) as LocalImagingOrganizerResponse;
      setLocalImagingOrganizer(result);
      setDicomFolderSeriesScan(null);
      setDicomFolderWorkupPlan(null);
      setDicomFirstFramePreview(null);
      setImagingFolderScan(null);
      setDicomLocalFolderDiscovery(null);
    } catch (organizerError) {
      if (isLocalDicomOperationAbortError(organizerError)) return;
      setError(operatorWorkflowFailureMessage("Локальный организатор снимков не выполнен", organizerError));
    } finally {
      finishLocalDicomOperation(controller);
      setIsLocalImagingOrganizing(false);
    }
  }

  async function scanImagingFolder() {
    const folderPath = imagingFolderPath.trim();
    if (!folderPath) {
      setError("Укажите путь к папке снимков перед сканированием.");
      return;
    }
    rememberLocalImagingFolder(folderPath, { origin: "manual" });
    const controller = startLocalDicomOperation();
    setIsImagingFolderScanning(true);
    try {
      const response = await fetch("/api/imaging/folders/scan-preview", {
        method: "POST",
        signal: controller.signal,
        headers: denteClinicalReadHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          folderPath,
          recursive: true,
          sourceName: "folder_watch"
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "Папка снимков не просканирована"));
      }
      const result = (await response.json()) as ImagingFolderScanResponse;
      setImagingFolderScan(result);
      setDicomFolderSeriesScan(null);
      setDicomFolderWorkupPlan(null);
      setImagingImportSourceKind("folder_watch");
      setImagingImportText(result.rawText || imagingImportText);
      setImagingImportPreview(result.preview);
      setImagingImportCommit(null);
      setDicomSeriesPreview(null);
    } catch (scanError) {
      if (isLocalDicomOperationAbortError(scanError)) return;
      setError(operatorWorkflowFailureMessage("Папка снимков не просканирована", scanError));
    } finally {
      finishLocalDicomOperation(controller);
      setIsImagingFolderScanning(false);
    }
  }

  async function scanDicomFolderSeries() {
    const folderPath = imagingFolderPath.trim();
    if (!folderPath) {
      setError("Укажите путь к локальной папке со снимками перед чтением метаданных.");
      return;
    }
    rememberLocalImagingFolder(folderPath, { origin: "manual" });
    const controller = startLocalDicomOperation();
    setIsImagingFolderScanning(true);
    try {
      const response = await fetch("/api/imaging/dicom/folder-series-preview", {
        method: "POST",
        signal: controller.signal,
        headers: denteClinicalReadHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          folderPath,
          recursive: true,
          sourceName: "dicom_folder_headers"
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "Метаданные папки снимков не прочитаны"));
      }
      const result = (await response.json()) as DicomFolderSeriesPreviewResponse;
      setDicomFolderSeriesScan(result);
      setDicomFolderWorkupPlan(null);
      setImagingImportSourceKind("dicom_file");
      setImagingImportText(result.rawText || imagingImportText);
      setDicomSeriesPreview(result.preview);
      setDicomViewerLaunchManifest(null);
      setDicomViewerToolStateBundle(null);
      setDicomViewerWorkbenchManifest(null);
      setDicomWorkbenchLocalSavedAt(null);
      setDicomWorkstationReadiness(null);
      setDicomRenderCachePlan(null);
      setImagingImportPreview(null);
      setImagingImportCommit(null);
    } catch (scanError) {
      if (isLocalDicomOperationAbortError(scanError)) return;
      setError(operatorWorkflowFailureMessage("Метаданные папки снимков не прочитаны", scanError));
    } finally {
      finishLocalDicomOperation(controller);
      setIsImagingFolderScanning(false);
    }
  }

  async function previewDicomFirstFrame(
    folderPath = imagingFolderPath.trim(),
    metadata: DicomFirstFramePreviewMetadata = { origin: "manual" },
    options: DicomFirstFramePreviewOptions = {}
  ) {
    const cleanFolderPath = folderPath.trim();
    if (!cleanFolderPath) {
      setError("Укажите путь к локальной папке со снимками перед предпросмотром первого среза.");
      return;
    }
    rememberLocalImagingFolder(cleanFolderPath, metadata);
    setDicomFirstFramePreviewRequest({ folderPath: cleanFolderPath, metadata });
    const controller = startLocalDicomOperation();
    setIsDicomFirstFramePreviewing(true);
    setError(null);
    if (options.resetViewer !== false) {
      setDicomFirstFrameViewerState(defaultDicomFirstFrameViewerState);
    }
    try {
      const response = await fetch("/api/imaging/dicom/first-frame-preview", {
        method: "POST",
        signal: controller.signal,
        headers: denteClinicalReadHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          folderPath: cleanFolderPath,
          recursive: true,
          maxFiles: 160,
          maxFileBytes: 64 * 1024 * 1024,
          maxPreviewEdge: 512,
          ...(typeof options.preferredFileIndex === "number" ? { preferredFileIndex: options.preferredFileIndex } : {})
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "Первый срез снимков не показан"));
      }
      setDicomFirstFramePreview((await response.json()) as DicomFirstFramePreviewResponse);
    } catch (previewError) {
      if (isLocalDicomOperationAbortError(previewError)) return;
      setError(operatorWorkflowFailureMessage("Первый срез снимков не показан", previewError));
    } finally {
      finishLocalDicomOperation(controller);
      setIsDicomFirstFramePreviewing(false);
    }
  }

  async function previewDicomFirstFrameSlice(preferredFileIndex: number) {
    if (!dicomFirstFramePreviewRequest) return;
    const maxIndex = Math.max(0, (dicomFirstFramePreview?.selectableFileCount ?? 1) - 1);
    const nextIndex = Math.min(maxIndex, Math.max(0, Math.round(preferredFileIndex)));
    await previewDicomFirstFrame(dicomFirstFramePreviewRequest.folderPath, dicomFirstFramePreviewRequest.metadata, {
      preferredFileIndex: nextIndex,
      resetViewer: false
    });
  }

  async function fetchDicomFolderWorkup(
    folderPath: string,
    sourceName: string,
    options: LocalDicomOperationOptions = {}
  ): Promise<{ client: DicomWorkstationClientFacts; result: DicomFolderWorkupPlanResponse }> {
    const client = await collectDicomWorkstationClientFacts();
    const response = await fetch("/api/imaging/dicom/folder-workup-plan", {
      method: "POST",
      signal: options.signal ?? null,
      headers: denteClinicalReadHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        folderPath,
        recursive: true,
        sourceName,
        client,
        viewerState: currentImagingViewerSessionState
      })
    });
    if (!response.ok) {
      throw new Error(await responseErrorMessage(response, "План папки снимков не подготовлен"));
    }
    return {
      client,
      result: (await response.json()) as DicomFolderWorkupPlanResponse
    };
  }

  function selectPreferredDicomWorkupPlan(result: DicomFolderWorkupPlanResponse) {
    return (
      result.plans.find((plan) => plan.recommendedPath === "open_mpr") ??
      result.plans.find((plan) => plan.recommendedPath === "downsampled_mpr") ??
      result.plans.find((plan) => plan.series.mprReadiness.volumeCandidate) ??
      result.plans.find((plan) => plan.recommendedPath === "external_viewer") ??
      result.plans[0] ??
      null
    );
  }

  function applyDicomFolderWorkupResult(result: DicomFolderWorkupPlanResponse) {
    const firstPlan = selectPreferredDicomWorkupPlan(result);
    setDicomFolderWorkupPlan(result);
    setDicomFolderSeriesScan(result.folder);
    setImagingImportSourceKind("dicom_file");
    setImagingImportText(result.folder.rawText || imagingImportText);
    setDicomSeriesPreview(result.folder.preview);
    setDicomViewerLaunchManifest(null);
    setDicomViewerToolStateBundle(null);
    setDicomViewerWorkbenchManifest(null);
    setDicomWorkbenchLocalSavedAt(null);
    setDicomWorkstationReadiness(firstPlan?.readiness ?? null);
    setDicomRenderCachePlan(firstPlan?.renderCachePlan ?? null);
    setDicomFirstFramePreview(null);
    setImagingImportPreview(null);
    setImagingImportCommit(null);
  }

  async function buildDicomFolderWorkupPlan() {
    const folderPath = imagingFolderPath.trim();
    if (!folderPath) {
      setError("Укажите путь к локальной папке со снимками перед подготовкой плана.");
      return;
    }
    rememberLocalImagingFolder(folderPath, { origin: "manual" });
    const controller = startLocalDicomOperation();
    setIsDicomFolderWorkupPlanning(true);
    try {
      const { result } = await fetchDicomFolderWorkup(folderPath, "dicom_folder_workup", { signal: controller.signal });
      applyDicomFolderWorkupResult(result);
    } catch (workupError) {
      if (isLocalDicomOperationAbortError(workupError)) return;
      setError(operatorWorkflowFailureMessage("План папки снимков не подготовлен", workupError));
    } finally {
      finishLocalDicomOperation(controller);
      setIsDicomFolderWorkupPlanning(false);
    }
  }

  async function prepareDicomWorkbenchFromFolder(
    folderPath: string,
    sourceName = "dicom_local_quick_workbench",
    metadata: Partial<Omit<LocalImagingFolderDraft, "version" | "folderPath" | "savedAt">> = {}
  ) {
    const cleanFolderPath = folderPath.trim();
    if (!cleanFolderPath) {
      setError("Укажите путь к локальной папке со снимками перед подготовкой КТ-просмотра.");
      return;
    }
    const controller = startLocalDicomOperation();
    setIsDicomFolderWorkupPlanning(true);
    setIsDicomWorkbenchBuilding(true);
    setError(null);
    try {
      const { client, result } = await fetchDicomFolderWorkup(cleanFolderPath, sourceName, { signal: controller.signal });
      const selectedPlan = selectPreferredDicomWorkupPlan(result);
      if (!selectedPlan) {
        throw new Error("В этой папке не найдена пригодная серия КЛКТ/КТ.");
      }

      const manifestResponse = await fetch("/api/imaging/dicom/viewer-workbench-manifest", {
        method: "POST",
        signal: controller.signal,
        headers: denteClinicalReadHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          viewerKind: "cornerstone3d",
          target: "cornerstone3d",
          series: selectedPlan.series,
          client,
          connector: dicomWebCheck,
          viewerState: currentImagingViewerSessionState,
          annotations: imagingViewerAnnotations,
          dicomWebBaseUrl: dicomWebEndpointUrl.trim() || null,
          ohifBaseUrl: ohifBaseUrl.trim() || null,
          allowExternalHandoff: true
        })
      });
      if (!manifestResponse.ok) {
        throw new Error(await responseErrorMessage(manifestResponse, "Просмотр КЛКТ/КТ не подготовлен"));
      }

      const manifest = (await manifestResponse.json()) as DicomViewerWorkbenchManifestResponse;
      const clientSavedAt = new Date().toISOString();
      const savedLocally = await saveLocalDicomWorkbenchDraft(manifest, clientSavedAt, activeOrganizationId);
      rememberLocalImagingFolder(cleanFolderPath, { ...metadata, origin: metadata.origin ?? "workbench" });
      applyDicomFolderWorkupResult(result);
      applyDicomWorkbenchManifest(manifest);
      setDicomWorkbenchLocalSavedAt(savedLocally ? clientSavedAt : null);
      setDicomWorkbenchServerBundle(null);
      await saveDicomWorkbenchBundleToServer(manifest, clientSavedAt, { silent: true, signal: controller.signal });
    } catch (workbenchError) {
      if (isLocalDicomOperationAbortError(workbenchError)) return;
      setError(operatorWorkflowFailureMessage("Просмотр КЛКТ/КТ не подготовлен", workbenchError));
    } finally {
      finishLocalDicomOperation(controller);
      setIsDicomFolderWorkupPlanning(false);
      setIsDicomWorkbenchBuilding(false);
    }
  }

  async function previewDicomSeries() {
    if (!imagingImportText.trim()) {
      setError("Вставьте строки со снимками или выберите пример КТ/ОПТГ/ТРГ перед группировкой серий.");
      return;
    }
    const controller = startLocalDicomOperation();
    setIsDicomSeriesPreviewLoading(true);
    try {
      const response = await fetch("/api/imaging/dicom/series-preview", {
        method: "POST",
        signal: controller.signal,
        headers: denteClinicalReadHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          sourceName: imagingImportSourceKind,
          sourceKind: imagingImportSourceKind === "folder_watch" ? "dicom_file" : imagingImportSourceKind,
          rawText: imagingImportText
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "Серии снимков не разобраны"));
      }
      setDicomSeriesPreview((await response.json()) as DicomSeriesPreviewResponse);
      setDicomViewerLaunchManifest(null);
      setDicomViewerToolStateBundle(null);
      setDicomViewerWorkbenchManifest(null);
      setDicomWorkbenchLocalSavedAt(null);
      setDicomWorkstationReadiness(null);
      setDicomRenderCachePlan(null);
      setDicomFolderWorkupPlan(null);
    } catch (seriesError) {
      if (isLocalDicomOperationAbortError(seriesError)) return;
      setError(operatorWorkflowFailureMessage("Серии снимков не разобраны", seriesError));
    } finally {
      finishLocalDicomOperation(controller);
      setIsDicomSeriesPreviewLoading(false);
    }
  }

  async function checkDicomWebConnector() {
    if (!dicomWebEndpointUrl.trim()) {
      setError("Укажите адрес архива снимков перед проверкой.");
      return;
    }
    const controller = startLocalDicomOperation();
    setIsDicomWebChecking(true);
    try {
      const response = await fetch("/api/imaging/dicomweb/check", {
        method: "POST",
        signal: controller.signal,
        headers: settingsAccessHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          endpointUrl: dicomWebEndpointUrl.trim(),
          authMode: "reverse_proxy",
          studyInstanceUid: cbctWorkbenchSeries?.studyInstanceUid ?? null,
          seriesInstanceUid: cbctWorkbenchSeries?.seriesInstanceUid ?? null,
          timeoutMs: 5000
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "Проверка архива снимков не выполнена"));
      }
      setDicomWebCheck((await response.json()) as DicomWebConnectorCheckResponse);
      setDicomViewerWorkbenchManifest(null);
      setDicomWorkbenchLocalSavedAt(null);
      setDicomWorkstationReadiness(null);
    } catch (checkError) {
      if (isLocalDicomOperationAbortError(checkError)) return;
      setError(operatorWorkflowFailureMessage("Проверка архива снимков не выполнена", checkError));
    } finally {
      finishLocalDicomOperation(controller);
      setIsDicomWebChecking(false);
    }
  }

  async function buildDicomViewerWorkbenchManifest() {
    if (!cbctWorkbenchSeries) {
      setError("Сначала проверьте серии снимков и выберите готовую КЛКТ/КТ-серию.");
      return;
    }
    const controller = startLocalDicomOperation();
    setIsDicomWorkbenchBuilding(true);
    try {
      const client = await collectDicomWorkstationClientFacts();
      const response = await fetch("/api/imaging/dicom/viewer-workbench-manifest", {
        method: "POST",
        signal: controller.signal,
        headers: denteClinicalReadHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          viewerKind: "cornerstone3d",
          target: "cornerstone3d",
          series: cbctWorkbenchSeries,
          client,
          connector: dicomWebCheck,
          viewerState: currentImagingViewerSessionState,
          annotations: imagingViewerAnnotations,
          dicomWebBaseUrl: dicomWebEndpointUrl.trim() || null,
          ohifBaseUrl: ohifBaseUrl.trim() || null,
          allowExternalHandoff: true
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "Просмотр КЛКТ/КТ не подготовлен"));
      }
      const result = (await response.json()) as DicomViewerWorkbenchManifestResponse;
      const clientSavedAt = new Date().toISOString();
      const savedLocally = await saveLocalDicomWorkbenchDraft(result, clientSavedAt, activeOrganizationId);
      applyDicomWorkbenchManifest(result);
      setDicomWorkbenchLocalSavedAt(savedLocally ? clientSavedAt : null);
      setDicomWorkbenchServerBundle(null);
      await saveDicomWorkbenchBundleToServer(result, clientSavedAt, { silent: true, signal: controller.signal });
    } catch (workbenchError) {
      if (isLocalDicomOperationAbortError(workbenchError)) return;
      setError(operatorWorkflowFailureMessage("Просмотр КЛКТ/КТ не подготовлен", workbenchError));
    } finally {
      finishLocalDicomOperation(controller);
      setIsDicomWorkbenchBuilding(false);
    }
  }

  async function buildDicomViewerLaunchManifest() {
    if (!cbctWorkbenchSeries) {
      setError("Сначала проверьте серии снимков и выберите готовую КЛКТ/КТ-серию для внешнего просмотра.");
      return;
    }
    const controller = startLocalDicomOperation();
    setIsDicomManifestBuilding(true);
    try {
      const response = await fetch("/api/imaging/dicom/viewer-launch-manifest", {
        method: "POST",
        signal: controller.signal,
        headers: denteClinicalReadHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          viewerKind: "ohif",
          series: cbctWorkbenchSeries,
          viewerState: currentImagingViewerSessionState,
          annotations: imagingViewerAnnotations,
          dicomWebBaseUrl: dicomWebEndpointUrl.trim() || null,
          ohifBaseUrl: ohifBaseUrl.trim() || null,
          allowExternalHandoff: true
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "План открытия снимков не создан"));
      }
      setDicomViewerWorkbenchManifest(null);
      setDicomWorkbenchLocalSavedAt(null);
      setDicomViewerLaunchManifest((await response.json()) as DicomViewerLaunchManifestResponse);
    } catch (manifestError) {
      if (isLocalDicomOperationAbortError(manifestError)) return;
      setError(operatorWorkflowFailureMessage("План открытия снимков не создан", manifestError));
    } finally {
      finishLocalDicomOperation(controller);
      setIsDicomManifestBuilding(false);
    }
  }

  async function buildDicomViewerToolStateBundle() {
    if (!cbctWorkbenchSeries) {
      setError("Сначала проверьте серии снимков и выберите готовую КЛКТ/КТ-серию для экспорта состояния.");
      return;
    }
    const controller = startLocalDicomOperation();
    setIsDicomToolStateBuilding(true);
    try {
      const response = await fetch("/api/imaging/dicom/viewer-tool-state", {
        method: "POST",
        signal: controller.signal,
        headers: denteClinicalReadHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          target: "cornerstone3d",
          viewerKind: "cornerstone3d",
          series: cbctWorkbenchSeries,
          viewerState: currentImagingViewerSessionState,
          annotations: imagingViewerAnnotations,
          renderPlan: dicomWorkstationReadiness?.renderPlan ?? null
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "Состояние просмотра снимков не собрано"));
      }
      setDicomViewerWorkbenchManifest(null);
      setDicomWorkbenchLocalSavedAt(null);
      setDicomViewerToolStateBundle((await response.json()) as DicomViewerToolStateBundleResponse);
    } catch (toolStateError) {
      if (isLocalDicomOperationAbortError(toolStateError)) return;
      setError(operatorWorkflowFailureMessage("Состояние просмотра снимков не собрано", toolStateError));
    } finally {
      finishLocalDicomOperation(controller);
      setIsDicomToolStateBuilding(false);
    }
  }

  function downloadDicomViewerToolStateBundle() {
    if (!dicomViewerToolStateBundle) {
      setError("Сначала соберите состояние просмотра снимков, затем скачайте файл состояния.");
      return;
    }
    const safeBundle = redactedDicomViewerToolStateBundleForDownload(dicomViewerToolStateBundle);
    const blob = new Blob([JSON.stringify(safeBundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const seriesPart = safeBundle.seriesRef.seriesInstanceUid?.slice(-10) ?? "series";
    try {
      link.href = url;
      link.download = `dicom_tool_state_${seriesPart}.json`;
      document.body.append(link);
      link.click();
    } finally {
      link.remove();
      revokeObjectUrlIfNeeded(url);
    }
    setError(null);
  }

  function downloadDicomWorkbenchManifest() {
    if (!dicomViewerWorkbenchManifest) {
      setError("Сначала соберите рабочий набор КЛКТ/КТ-срезов, затем скачайте файл состояния.");
      return;
    }
    const safeManifest = redactedDicomWorkbenchManifestForDownload(dicomViewerWorkbenchManifest);
    const blob = new Blob([JSON.stringify(safeManifest, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const seriesPart = dicomWorkbenchSeriesKey(safeManifest).slice(-24).replace(/[^a-zA-Z0-9._-]+/g, "-") || "series";
    try {
      link.href = url;
      link.download = `dicom_workbench_${seriesPart}.json`;
      document.body.append(link);
      link.click();
    } finally {
      link.remove();
      revokeObjectUrlIfNeeded(url);
    }
    setError(null);
  }

  function clearDicomWorkbenchRecovery() {
    void removeLocalDicomWorkbenchDraft(activeOrganizationId);
    setDicomWorkbenchLocalSavedAt(null);
  }

  function applyDicomWorkbenchManifest(manifest: DicomViewerWorkbenchManifestResponse) {
    setDicomViewerWorkbenchManifest(manifest);
    setDicomWorkstationReadiness(manifest.readiness);
    setDicomRenderCachePlan(manifest.renderCachePlan);
    setDicomViewerLaunchManifest(manifest.launchManifest);
    setDicomViewerToolStateBundle(manifest.toolStateBundle);
  }

  function restoreDicomWorkbenchServerBundle(bundle: DicomWorkbenchBundle) {
    applyDicomWorkbenchManifest(bundle.manifest);
    setDicomWorkbenchServerBundle(bundle);
  }

  async function loadDicomWorkbenchBundles(options: { silent?: boolean; restoreLatest?: boolean } = {}) {
    try {
      const response = await fetch("/api/imaging/dicom/workbench-bundles?limit=6", { headers: denteClinicalReadHeaders() });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "Список сохраненных наборов просмотра не загружен"));
      }
      const result = (await response.json()) as DicomWorkbenchBundleListResponse;
      setDicomWorkbenchServerBundles(result.bundles);
      const latest = result.bundles[0] ?? null;
      if (latest && options.restoreLatest) {
        restoreDicomWorkbenchServerBundle(latest);
      }
    } catch (bundleError) {
      if (!options.silent) {
        setError(operatorWorkflowFailureMessage("Список сохраненных наборов просмотра не загружен", bundleError));
      }
    }
  }

  async function saveDicomWorkbenchBundleToServer(
    manifest: DicomViewerWorkbenchManifestResponse | null = dicomViewerWorkbenchManifest,
    clientSavedAt: string | null = dicomWorkbenchLocalSavedAt,
    options: { silent?: boolean; signal?: AbortSignal } = {}
  ) {
    if (!manifest) return null;
    setIsDicomWorkbenchServerSaving(true);
    try {
      const response = await fetch("/api/imaging/dicom/workbench-bundles", {
        method: "POST",
        signal: options.signal ?? null,
        headers: denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          manifest,
          clientSavedAt
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "Набор просмотра КЛКТ/КТ-срезов не сохранен"));
      }
      const result = (await response.json()) as DicomWorkbenchBundleResponse;
      setDicomWorkbenchServerBundle(result.bundle);
      setDicomWorkbenchServerBundles((bundles) => [
        result.bundle,
        ...bundles.filter((bundle) => bundle.id !== result.bundle.id && bundle.seriesKey !== result.bundle.seriesKey)
      ].slice(0, 6));
      return result.bundle;
    } catch (saveError) {
      if (isLocalDicomOperationAbortError(saveError)) return null;
      if (!options.silent) {
        setError(operatorWorkflowFailureMessage("Набор просмотра КЛКТ/КТ-срезов не сохранен", saveError));
      }
      return null;
    } finally {
      setIsDicomWorkbenchServerSaving(false);
    }
  }

  async function reconnectDicomWorkbenchFromCurrentFolder() {
    if (!imagingFolderPath.trim()) {
      setError("Укажите локальную папку со снимками перед переподключением просмотра.");
      return;
    }
    const targetStudyUid =
      dicomViewerWorkbenchManifest?.toolStateBundle.seriesRef.studyInstanceUid ??
      dicomWorkbenchServerBundle?.studyInstanceUid ??
      latestDicomWorkbenchServerBundle?.studyInstanceUid ??
      null;
    const targetSeriesUid =
      dicomViewerWorkbenchManifest?.toolStateBundle.seriesRef.seriesInstanceUid ??
      dicomWorkbenchServerBundle?.seriesInstanceUid ??
      latestDicomWorkbenchServerBundle?.seriesInstanceUid ??
      null;
    const controller = startLocalDicomOperation();
    setIsDicomWorkbenchReconnecting(true);
    try {
      const client = await collectDicomWorkstationClientFacts();
      const workupResponse = await fetch("/api/imaging/dicom/folder-workup-plan", {
        method: "POST",
        signal: controller.signal,
        headers: denteClinicalReadHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          folderPath: imagingFolderPath,
          recursive: true,
          sourceName: "dicom_reconnected_folder",
          client,
          viewerState: currentImagingViewerSessionState
        })
      });
      if (!workupResponse.ok) {
        throw new Error(await responseErrorMessage(workupResponse, "Источник снимков не переподключен"));
      }
      const workup = (await workupResponse.json()) as DicomFolderWorkupPlanResponse;
      const matchedPlan =
        workup.plans.find(
          (plan) =>
            (!targetStudyUid || plan.series.studyInstanceUid === targetStudyUid) &&
            (!targetSeriesUid || plan.series.seriesInstanceUid === targetSeriesUid)
        ) ??
        workup.plans.find((plan) => plan.series.mprReadiness.volumeCandidate) ??
        workup.plans[0] ??
        null;
      if (!matchedPlan) {
        throw new Error("Переподключение снимков не нашло пригодную КТ-серию в текущей папке.");
      }

      const manifestResponse = await fetch("/api/imaging/dicom/viewer-workbench-manifest", {
        method: "POST",
        signal: controller.signal,
        headers: denteClinicalReadHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          viewerKind: "cornerstone3d",
          target: "cornerstone3d",
          series: matchedPlan.series,
          client,
          connector: dicomWebCheck,
          viewerState: currentImagingViewerSessionState,
          annotations: imagingViewerAnnotations,
          dicomWebBaseUrl: dicomWebEndpointUrl.trim() || null,
          ohifBaseUrl: ohifBaseUrl.trim() || null,
          allowExternalHandoff: true
        })
      });
      if (!manifestResponse.ok) {
        throw new Error(await responseErrorMessage(manifestResponse, "План переподключения снимков не создан"));
      }
      const manifest = (await manifestResponse.json()) as DicomViewerWorkbenchManifestResponse;
      const clientSavedAt = new Date().toISOString();
      const savedLocally = await saveLocalDicomWorkbenchDraft(manifest, clientSavedAt, activeOrganizationId);
      setDicomFolderWorkupPlan(workup);
      setDicomFolderSeriesScan(workup.folder);
      setDicomSeriesPreview(workup.folder.preview);
      applyDicomWorkbenchManifest(manifest);
      setDicomWorkbenchLocalSavedAt(savedLocally ? clientSavedAt : null);
      setDicomWorkbenchServerBundle(null);
      await saveDicomWorkbenchBundleToServer(manifest, clientSavedAt, { silent: true, signal: controller.signal });
    } catch (reconnectError) {
      if (isLocalDicomOperationAbortError(reconnectError)) return;
      setError(operatorWorkflowFailureMessage("Источник снимков не переподключен", reconnectError));
    } finally {
      finishLocalDicomOperation(controller);
      setIsDicomWorkbenchReconnecting(false);
    }
  }

  async function checkDicomWorkstationReadiness() {
    if (!cbctWorkbenchSeries) {
      setError("Сначала проверьте серии снимков и выберите готовую КЛКТ/КТ-серию.");
      return;
    }
    const controller = startLocalDicomOperation();
    setIsDicomWorkstationChecking(true);
    try {
      const client = await collectDicomWorkstationClientFacts();
      const response = await fetch("/api/imaging/dicom/workstation-readiness", {
        method: "POST",
        signal: controller.signal,
        headers: denteClinicalReadHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          series: cbctWorkbenchSeries,
          client,
          connector: dicomWebCheck
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "Готовность станции просмотра не проверена"));
      }
      setDicomWorkstationReadiness((await response.json()) as DicomWorkstationReadinessResponse);
      setDicomViewerWorkbenchManifest(null);
      setDicomWorkbenchLocalSavedAt(null);
      setDicomRenderCachePlan(null);
    } catch (readinessError) {
      if (isLocalDicomOperationAbortError(readinessError)) return;
      setError(operatorWorkflowFailureMessage("Готовность станции просмотра не проверена", readinessError));
    } finally {
      finishLocalDicomOperation(controller);
      setIsDicomWorkstationChecking(false);
    }
  }

  async function buildDicomRenderCachePlan() {
    if (!cbctWorkbenchSeries || !dicomWorkstationReadiness) {
      const missingSteps = [
        !cbctWorkbenchSeries ? "выберите готовую КЛКТ/КТ-серию" : null,
        !dicomWorkstationReadiness ? "сначала проверьте этот ПК" : null
      ].filter((step): step is string => Boolean(step));
      setError(`Перед планом быстрой загрузки снимков: ${missingSteps.join(", ")}.`);
      return;
    }
    const controller = startLocalDicomOperation();
    setIsDicomRenderCachePlanning(true);
    try {
      const response = await fetch("/api/imaging/dicom/render-cache-plan", {
        method: "POST",
        signal: controller.signal,
        headers: denteClinicalReadHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          series: cbctWorkbenchSeries,
          renderPlan: dicomWorkstationReadiness.renderPlan,
          viewerState: currentImagingViewerSessionState
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "План быстрой загрузки снимков не построен"));
      }
      setDicomViewerWorkbenchManifest(null);
      setDicomWorkbenchLocalSavedAt(null);
      setDicomRenderCachePlan((await response.json()) as DicomRenderCachePlanResponse);
    } catch (cachePlanError) {
      if (isLocalDicomOperationAbortError(cachePlanError)) return;
      setError(operatorWorkflowFailureMessage("План быстрой загрузки снимков не построен", cachePlanError));
    } finally {
      finishLocalDicomOperation(controller);
      setIsDicomRenderCachePlanning(false);
    }
  }

  async function commitImagingImport() {
    if (isImagingImportCommitting) {
      setError("Дождитесь завершения текущей привязки снимков.");
      return;
    }
    if (!imagingImportText.trim()) {
      setError("Вставьте строки со снимками или выберите пример КТ/ОПТГ/ТРГ перед привязкой.");
      return;
    }
    if (!imagingImportPreview) {
      setError("Сначала проверьте импорт снимков, чтобы увидеть готовые и проблемные строки.");
      return;
    }
    if (imagingImportPreview.readyRows === 0) {
      setError("В импорте снимков нет готовых строк. Исправьте предупреждения и повторите проверку.");
      return;
    }
    setIsImagingImportCommitting(true);
    try {
      const response = await fetch("/api/imaging/imports/commit", {
        method: "POST",
        headers: denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          sourceName: imagingImportSourceKind,
          sourceKind: imagingImportSourceKind,
          rawText: imagingImportText
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "Импорт снимков не записан"));
      }
      const result = (await response.json()) as ImagingImportCommitResponse;
      setImagingImportCommit(result);
      setImagingImportPreview(result.preview);
      await loadDashboard();
    } catch (importError) {
      setError(operatorWorkflowFailureMessage("Снимки не записаны", importError));
    } finally {
      setIsImagingImportCommitting(false);
    }
  }

  function appendVisitDictationText(value: string) {
    const cleanValue = value.trim();
    if (!cleanValue) return;
    visitDraftUserEditedRef.current = true;
    setClearedTranscriptSnapshot(null);
    setTranscript((current: any) =>
      appendSpeechTextWithoutDuplicateTail(current, cleanValue, speechGatewayStatus?.chunkingPolicy.dedupeWindowChars ?? 600)
    );
    setDraft(null);
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

  function startVisitDictation() {
    if (isVisitDictating) {
      setError("Дождитесь завершения текущей браузерной диктовки.");
      return;
    }
    const speechWindow = window as BrowserWindowWithSpeech;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setError("Браузерная диктовка недоступна. Текст можно печатать вручную, локальный черновик все равно сохранится.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "ru-RU";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcriptText = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ");
      appendVisitDictationText(transcriptText);
    };
    recognition.onerror = () => {
      setError("Диктовка не распознана. Продолжайте печатать, текущий черновик не потерян.");
      setIsVisitDictating(false);
    };
    recognition.onend = () => setIsVisitDictating(false);
    setError(null);
    setIsVisitDictating(true);
    try {
      recognition.start();
    } catch {
      setIsVisitDictating(false);
      setError("Браузер не смог запустить микрофон. Текст можно продолжить вручную.");
    }
  }

  function preferredSpeechMimeType(): string {
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
    return candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? "";
  }

  async function uploadSpeechBlob(blob: Blob, gatewayStatusOverride?: SpeechGatewayStatus | null) {
    if (!dashboard || blob.size === 0) return;
    const maxChunkBytesLimit = speechGatewayStatus?.maxChunkBytes ?? 6_000_000;
    if (blob.size > maxChunkBytesLimit) {
      setSpeechStatusNote(
        `Распознавание: аудио-фрагмент ${Math.round(blob.size / 1024 / 1024)} МБ больше лимита ${Math.round(
          maxChunkBytesLimit / 1024 / 1024
        )} МБ; запись продолжается, уменьшите длительность чанка или используйте локальный модуль.`
      );
      return;
    }
    const audioBase64 = await blobToBase64(blob);
    const chunkIndex = speechChunkIndexRef.current;
    speechChunkIndexRef.current += 1;
    const durationMs = speechPendingChunkDurationMsRef.current ?? speechGatewayStatus?.recommendedChunkMs ?? 15_000;
    speechPendingChunkDurationMsRef.current = null;
    const chunk: SpeechChunkUploadInput = {
      recordingId: speechRecordingIdRef.current ?? createLocalQueueId(),
      chunkIndex,
      mimeType: blob.type || "audio/webm",
      audioBase64,
      durationMs,
      language: "ru",
      source: "visit",
      patientId: dashboard.activeVisit.patientId,
      visitId: dashboard.activeVisit.id,
      specialty: selectedSpecialty,
      clientRecordedAt: new Date().toISOString()
    };

    const chunkHadVoice = false;
    if (chunkHadVoice === false) {
      // Голос почти не слышен, но CRM все равно отправляет фрагмент на распознавание.
      // Голос почти не слышен, но CRM все равно проверяет последний фрагмент.
    }
    // const maxChunkBytes

    const queuedBeforeUpload = await queuePendingSpeechChunk(chunk, activeOrganizationId);
    await refreshPendingSpeechChunkState();

    const effectiveGatewayStatus = gatewayStatusOverride ?? speechGatewayStatus;

    if (!isOnline || !speechGatewayCanUpload(effectiveGatewayStatus)) {
      setSpeechStatusNote(
        queuedBeforeUpload
          ? `Фрагмент ${chunkIndex + 1} сохранен локально; распознавание отправится, когда источник будет готов.`
          : `Фрагмент ${chunkIndex + 1} не сохранен: локальная очередь недоступна.`
      );
      return;
    }

    try {
      const result = await submitSpeechChunk(chunk);
      applySpeechTranscription(result);
      if (queuedBeforeUpload) {
        await removePendingSpeechChunkById(queuedBeforeUpload.id, activeOrganizationId);
        await refreshPendingSpeechChunkState();
      }
    } catch (speechError) {
      const queued = queuedBeforeUpload ?? (await queuePendingSpeechChunk(chunk, activeOrganizationId));
      await refreshPendingSpeechChunkState();
      setSpeechStatusNote(
        queued
          ? `Фрагмент ${chunkIndex + 1} сохранен локально и уйдет на сервер позже.`
          : `Фрагмент ${chunkIndex + 1} не отправлен: ${
              operatorReadableErrorDetailFromUnknown(speechError) ?? "повторите запись или проверьте подключение к серверу клиники"
            }.`
      );
    }
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

  function startSpeechMonitor(stream: MediaStream, recorder: MediaRecorder, status: SpeechGatewayStatus | null) {
    stopSpeechMonitor();
    const audioWindow = window as BrowserWindowWithSpeech;
    const AudioContextClass = window.AudioContext ?? audioWindow.webkitAudioContext;
    const providerLabel = status?.providerLabel ?? "Локальная запись";
    const chunkingPolicy = status?.chunkingPolicy ?? {
      strategy: "time_and_silence" as const,
      minChunkMs: 10_000,
      maxChunkMs: 25_000,
      silenceMs: 900,
      rmsThreshold: 0.015,
      monitorIntervalMs: 250,
      overlapMs: 500,
      dedupeWindowChars: 600
    };
    const recommendedChunkMs = status?.recommendedChunkMs ?? 15_000;
    if (!AudioContextClass) {
      recorder.start(recommendedChunkMs);
      setSpeechStatusNote(`${providerLabel}: запись идет по таймеру, Web Audio недоступен.`);
      return;
    }

    try {
      const audioContext = new AudioContextClass();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.25;
      source.connect(analyser);
      speechAudioContextRef.current = audioContext;
      speechAnalyserRef.current = analyser;
      speechSegmentStartedAtRef.current = Date.now();
      speechLastSoundAtRef.current = Date.now();
      recorder.start(Math.max(1000, Math.min(recommendedChunkMs, chunkingPolicy.maxChunkMs)));
      const samples = new Uint8Array(analyser.fftSize);
      speechMonitorTimerRef.current = window.setInterval(() => {
        analyser.getByteTimeDomainData(samples);
        let sumSquares = 0;
        for (const sample of samples) {
          const centered = (sample - 128) / 128;
          sumSquares += centered * centered;
        }
        const rms = Math.sqrt(sumSquares / samples.length);
        const now = Date.now();
        const segmentAgeMs = now - speechSegmentStartedAtRef.current;
        if (rms >= chunkingPolicy.rmsThreshold) {
          speechLastSoundAtRef.current = now;
        }
        const silentForMs = now - speechLastSoundAtRef.current;
        if (segmentAgeMs >= chunkingPolicy.maxChunkMs) {
          requestSpeechChunk("max_time");
          return;
        }
        if (segmentAgeMs >= chunkingPolicy.minChunkMs && silentForMs >= chunkingPolicy.silenceMs) {
          requestSpeechChunk("silence");
        }
      }, chunkingPolicy.monitorIntervalMs);
      setSpeechStatusNote(
        `${providerLabel}: умные фрагменты ${Math.round(chunkingPolicy.minChunkMs / 1000)}-${Math.round(
          chunkingPolicy.maxChunkMs / 1000
        )} сек., пауза ${chunkingPolicy.silenceMs} мс.`
      );
    } catch {
      stopSpeechMonitor();
      recorder.start(recommendedChunkMs);
      setSpeechStatusNote(`${providerLabel}: запись идет по таймеру, умное деление недоступно.`);
    }
  }

  function configureServerVoiceRecorder(stream: MediaStream, recorder: MediaRecorder, currentGatewayStatus: any) {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0 && !speechPendingChunkDurationMsRef.current) {
        const now = Date.now();
        speechPendingChunkDurationMsRef.current = Math.max(
          250,
          Math.min(now - speechSegmentStartedAtRef.current, speechGatewayStatus?.chunkingPolicy.maxChunkMs ?? 25_000)
        );
        speechSegmentStartedAtRef.current = now;
        speechLastSoundAtRef.current = now;
      }
      if (event.data.size > 0) {
        const effectiveGatewayStatus = speechActiveGatewayStatusRef.current ?? currentGatewayStatus;
        trackSpeechUpload(uploadSpeechBlob(event.data, effectiveGatewayStatus));
      }
    };
    recorder.onstop = () => {
      const recordingId = speechRecordingIdRef.current;
      stopSpeechMonitor();
      const shouldRestart = serverVoiceRecordingShouldContinueRef.current && !serverVoiceRecordingStopRequestedRef.current && Boolean(recordingId);
      if (shouldRestart && recordingId) {
        setSpeechStatusNote("Браузер прервал запись на секунду. CRM снова включает микрофон и продолжает эту же диктовку.");
        restartServerVoiceRecorderAfterUnexpectedStop(recordingId);
        return;
      }
      stream.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;
      mediaStreamRef.current = null;
      setIsServerVoiceRecording(false);
      if (recordingId) {
        void finalizeSpeechRecording(recordingId);
      }
    };
  }

  function clearServerVoiceRecordingRestartTimer() {
    if (serverVoiceRecordingRestartTimerRef.current) {
      clearTimeout(serverVoiceRecordingRestartTimerRef.current);
      serverVoiceRecordingRestartTimerRef.current = null;
    }
  }

  function restartServerVoiceRecorderAfterUnexpectedStop(recordingId: string) {
    clearServerVoiceRecordingRestartTimer();
    const delay = speechGatewayStatus?.reconnectDelayMs ?? 1000;
    serverVoiceRecordingRestartTimerRef.current = setTimeout(async () => {
      if (!serverVoiceRecordingShouldContinueRef.current || serverVoiceRecordingStopRequestedRef.current) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!serverVoiceRecordingShouldContinueRef.current || serverVoiceRecordingStopRequestedRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        const mimeType = preferredSpeechMimeType();
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        mediaStreamRef.current = stream;
        mediaRecorderRef.current = recorder;
        configureServerVoiceRecorder(stream, recorder, speechGatewayStatus);
        startSpeechMonitor(stream, recorder, speechGatewayStatus);
        setSpeechStatusNote("Запись продолжена. Говорите дальше, текст добавится в тот же черновик.");
        recorder.start(speechGatewayStatus?.chunkingPolicy.chunkIntervalMs ?? 5000);
      } catch (err) {
        setError("Не удалось перезапустить запись после прерывания.");
      }
    }, delay);
  }

  async function startServerVoiceRecording() {
    if (serverVoiceRecordingStartingRef.current || isServerVoiceRecordingStarting) {
      setSpeechStatusNote("Запись уже включается. Разрешите микрофон и подождите несколько секунд.");
      return;
    }
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

    const gatewayStatusPromise = loadSpeechGatewayStatus({ silent: true });
    const currentGatewayStatus = speechGatewayStatus;

    let stream: MediaStream | null = null;
    serverVoiceRecordingStartingRef.current = true;
      setIsServerVoiceRecordingStarting(true);

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      serverVoiceRecordingStartingRef.current = false;
      setIsServerVoiceRecordingStarting(false);

      const mimeType = preferredSpeechMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      speechRecordingIdRef.current = createLocalQueueId();
      speechChunkIndexRef.current = 0;

      serverVoiceRecordingShouldContinueRef.current = true;
      serverVoiceRecordingStopRequestedRef.current = false;
      clearServerVoiceRecordingRestartTimer();

      configureServerVoiceRecorder(stream, recorder, currentGatewayStatus);
      startSpeechMonitor(stream, recorder, currentGatewayStatus);
      setError(null);

      void gatewayStatusPromise.then((freshGatewayStatus) => {
        if (speechChunkIndexRef.current === 0) {
          if (!isOnline || !speechGatewayCanUpload(freshGatewayStatus)) {
            setSpeechStatusNote("Запись идет. Распознавание пока не готово, звук сохранится и отправится позже.");
          } else {
            setSpeechStatusNote("Текст появится по мере распознавания.");
          }
        }
      });

      setIsServerVoiceRecording(true);
    } catch (recordingError) {
      stream?.getTracks().forEach((track) => track.stop());
      serverVoiceRecordingStartingRef.current = false;
      setIsServerVoiceRecordingStarting(false);
      setIsServerVoiceRecording(false);
      setError(browserCapabilityFailureMessage("Микрофон недоступен", recordingError));
    }
  }

  function stopServerVoiceRecording() {
    serverVoiceRecordingShouldContinueRef.current = false;
    serverVoiceRecordingStopRequestedRef.current = true;
    clearServerVoiceRecordingRestartTimer();

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      speechPendingChunkDurationMsRef.current = Math.max(250, Date.now() - speechSegmentStartedAtRef.current);
      recorder.requestData();
      recorder.stop();
      setSpeechStatusNote("Запись остановлена. Проверяю даже тихую запись.");
      return;
    }
    const recordingId = speechRecordingIdRef.current;
    if (!recordingId && !mediaStreamRef.current && !isServerVoiceRecording) {
      setSpeechStatusNote("Активной записи диктовки нет.");
      return;
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    stopSpeechMonitor();
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
    setIsServerVoiceRecording(false);
    if (recordingId) {
      void finalizeSpeechRecording(recordingId);
    }
  }

  function startImportDictation() {
    if (isImportDictating) {
      setError("Дождитесь завершения текущей диктовки импорта.");
      return;
    }
    const speechWindow = window as BrowserWindowWithSpeech;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setImportSourceKind("voice_dictation");
      setImportText((current) =>
        `${current}\n\nДиктовка недоступна в этом браузере. Вставь распознанный текст сюда: Иванов Иван, телефон +7 900 000-00-00, дата рождения 01.01.1980.`
      );
      setError("Браузерная диктовка импорта недоступна. Вставьте список пациентов вручную или загрузите OCR.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "ru-RU";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcriptText = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ");
      setImportSourceKind("voice_dictation");
      setImportText((current) => `${current.trim()}\n${transcriptText}`.trim());
      setImportPreview(null);
      setImportCommit(null);
    };
    recognition.onerror = () => {
      setImportSourceKind("voice_dictation");
      setIsImportDictating(false);
      setError("Диктовка импорта не распознана. Вставьте список вручную или загрузите OCR.");
    };
    recognition.onend = () => setIsImportDictating(false);
    setError(null);
    setIsImportDictating(true);
    try {
      recognition.start();
    } catch {
      setIsImportDictating(false);
      setError("Браузер не смог запустить микрофон для импорта. Вставьте список пациентов вручную или загрузите файл.");
    }
  }

  async function createClinicalRuleFromSettings() {
    if (!dashboard) {
      setError("Данные клиники еще не загружены. Повторите создание правила после загрузки настроек.");
      return;
    }
    if (isClinicalRuleSaving) {
      setError("Дождитесь завершения текущей записи клинического правила.");
      return;
    }
    if (!newRuleTitle.trim() || !newRuleWarningText.trim() || !newRulePatientText.trim()) {
      setError("Клиническое правило должно иметь название, предупреждение и объяснение для пациента.");
      return;
    }

    setIsClinicalRuleSaving(true);
    try {
      const response = await fetch("/api/clinical/rules", {
        method: "POST",
        headers: denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          title: newRuleTitle.trim(),
          category: newRuleCategory,
          specialty: newRuleSpecialty,
          action: newRuleAction,
          severity: newRuleSeverity,
          ownerRole: newRuleOwnerRole,
          triggerServiceIds: [newRuleTriggerServiceId],
          requiredServiceIds: newRuleAction === "add_required_service" ? [newRuleRequiredServiceId] : [],
          requiresCompletedServiceIds: newRuleAction === "block_service" ? [newRuleCompletedServiceId] : [],
          blockedServiceIds: newRuleAction === "block_service" ? [newRuleBlockedServiceId] : [],
          condition: "Настроено в библиотеке правил клиники.",
          warningText: newRuleWarningText.trim(),
          patientText: newRulePatientText.trim(),
          active: true
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "Клиническое правило не сохранено"));
      }
      await loadDashboard();
    } catch (ruleError) {
      setError(operatorWorkflowFailureMessage("Клиническое правило не сохранено", ruleError));
    } finally {
      setIsClinicalRuleSaving(false);
    }
  }

  async function toggleClinicalRule(rule: Dashboard["clinicalRules"][number]) {
    if (isClinicalRuleSaving) {
      setError("Дождитесь завершения текущей записи клинического правила.");
      return;
    }
    setIsClinicalRuleSaving(true);
    try {
      const response = await fetch(`/api/clinical/rules/${rule.id}`, {
        method: "PATCH",
        headers: denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ active: !rule.active })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "Клиническое правило не обновлено"));
      }
      await loadDashboard();
    } catch (ruleError) {
      setError(operatorWorkflowFailureMessage("Клиническое правило не обновлено", ruleError));
    } finally {
      setIsClinicalRuleSaving(false);
    }
  }

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
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function compactDocumentText(...values: Array<string | null | undefined>): string {
    return values
      .map((value) => value?.trim() ?? "")
      .filter(Boolean)
      .join("\n");
  }

  function treatmentAcceptanceStageRows() {
    return documentTextLines(treatmentAcceptanceStages).map((line, index) => {
      const [stageName, plannedServices, plannedTiming, amount] = line.split("|").map((part) => part.trim());
      const parsedAmount = amount ? Number(amount.replace(/[^\d]/g, "")) : Number.NaN;
      return {
        stageName: stageName || `Этап ${index + 1}`,
        plannedServices: plannedServices || "объем лечения по выбранному плану",
        plannedTiming: plannedTiming || "по расписанию клиники",
        estimatedAmountRub: Number.isFinite(parsedAmount) ? parsedAmount : null
      };
    });
  }

  function treatmentAcceptancePlannedTotalRub(): number {
    return (
      activeTreatmentPlanItems
        .filter((item) => item.status !== "cancelled")
        .filter((item) => !dashboard?.activeVisit.id || item.visitId === dashboard.activeVisit.id)
        .reduce((total, item) => total + Math.max(0, item.unitPriceRub * item.quantity - item.discountRub), 0) || 0
    );
  }

  function treatmentAcceptanceTotalRubValue(): number {
    const manual = Number(treatmentAcceptanceEstimatedTotalRub.replace(/[^\d]/g, ""));
    return manual > 0 ? manual : treatmentAcceptancePlannedTotalRub();
  }

  function treatmentPlanStageRows() {
    return documentTextLines(treatmentPlanStages).map((line, index) => {
      const [stageName, plannedServices, plannedTiming, clinicalNotes, amount] = line.split("|").map((part) => part.trim());
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

  function treatmentPlanTotalRubValue(): number {
    const manual = Number(treatmentPlanEstimatedTotalRub.replace(/[^\d]/g, ""));
    return manual > 0 ? manual : treatmentAcceptancePlannedTotalRub();
  }

  function treatmentPlanClinicalReasonValue(): string {
    return treatmentPlanClinicalReason.trim() || dashboard?.activeVisit.complaint?.trim() || "плановое стоматологическое лечение по результатам осмотра";
  }

  function treatmentPlanDiagnosisSummaryValue(): string {
    return treatmentPlanDiagnosisSummary.trim() || dashboard?.activeVisit.diagnosis?.trim() || dashboard?.activeVisit.complaint?.trim() || "";
  }

  function treatmentPlanTeethOrAreaValue(): string {
    return treatmentPlanTeethOrArea.trim() || inferredTreatmentArea || "";
  }

  function normalizeClinicalToothAlias(value: string): string {
    return value
      .trim()
      .toLocaleLowerCase("ru-RU")
      .replaceAll("ё", "е")
      .replace(/[.]+/g, "")
      .replace(/\s+/g, " ");
  }

  function clinicalToothSurfacesValue(value: string): ClinicalToothSurface[] {
    const surfaces = value
      .split(/[,+;/]+/)
      .map((part) => clinicalToothSurfaceAliases[normalizeClinicalToothAlias(part)])
      .filter((surface): surface is ClinicalToothSurface => Boolean(surface));
    return surfaces.length ? Array.from(new Set(surfaces)) : ["not_applicable"];
  }

  function clinicalToothStatusValue(value: string): ClinicalToothStatus {
    return clinicalToothStatusAliases[normalizeClinicalToothAlias(value)] ?? "planned";
  }

  function clinicalToothRowsValue(): ClinicalToothRow[] {
    const fallbackArea =
      procedureConsentToothOrArea.trim() ||
      treatmentPlanTeethOrAreaValue() ||
      treatmentAcceptanceTeethOrArea.trim() ||
      inferredTreatmentArea ||
      "область лечения";
    const fallbackFinding =
      procedureConsentDiagnosisOrIndication.trim() ||
      treatmentPlanDiagnosisSummaryValue() ||
      treatmentAcceptanceDiagnosisSummary.trim() ||
      recordExtractDiagnosisValue() ||
      "клиническая находка требует уточнения врачом";
    const fallbackIndication =
      treatmentPlanClinicalReasonValue() || recordExtractComplaintAndAnamnesisValue() || "медицинское показание к лечению";
    const fallbackAction =
      dashboard?.activeVisit.treatmentPlan?.trim() || procedureConsentProcedureName.trim() || treatmentAcceptanceClinicalGoal.trim() || "согласованное стоматологическое лечение";

    return documentTextLines(clinicalToothRowsText).map((line, index) => {
      const [
        toothOrArea,
        surfaces,
        status,
        diagnosisOrFinding,
        indication,
        plannedAction,
        prognosis,
        periodontalStatus,
        implantOrProstheticNotes,
        orthodonticNotes
      ] = line.split("|").map((part) => part.trim());

      return {
        toothOrArea: toothOrArea || fallbackArea || `зона ${index + 1}`,
        surfaces: clinicalToothSurfacesValue(surfaces || ""),
        status: clinicalToothStatusValue(status || ""),
        diagnosisOrFinding: diagnosisOrFinding || fallbackFinding,
        indication: indication || fallbackIndication,
        plannedAction: plannedAction || fallbackAction,
        prognosis: prognosis || null,
        periodontalStatus: periodontalStatus || null,
        implantOrProstheticNotes: implantOrProstheticNotes || null,
        orthodonticNotes: orthodonticNotes || null
      };
    });
  }

  function treatmentPlanDoctorFullNameValue(): string {
    return treatmentPlanDoctorFullName.trim() || activeDoctor?.fullName || "";
  }

  function activePaidPaymentsForVisit() {
    return activePayments.filter((payment) => payment.status === "paid" && (!dashboard?.activeVisit.id || payment.visitId === dashboard.activeVisit.id));
  }

  function paidContractTotalRubValue(): number {
    const manual = Number(paidContractTotalRub.replace(/[^\d]/g, ""));
    return manual > 0 ? manual : treatmentAcceptancePlannedTotalRub();
  }

  function paidContractCustomerFullNameValue(): string {
    return paidContractCustomerFullName.trim() || documentPatient?.fullName || "";
  }

  function paidContractCareReasonValue(): string {
    return paidContractCareReason.trim() || dashboard?.activeVisit.complaint?.trim() || "плановое стоматологическое лечение по результатам осмотра";
  }

  function paidContractServiceScopeValue(): string {
    return paidContractServiceScope.trim() || dashboard?.activeVisit.treatmentPlan?.trim() || dashboard?.activeVisit.doctorSummary?.trim() || "";
  }

  function paidContractDoctorFullNameValue(): string {
    return paidContractDoctorFullName.trim() || activeDoctor?.fullName || "";
  }

  function completedActPaidRubValue(): number {
    const manual = Number(completedActPaidRub.replace(/[^\d]/g, ""));
    if (manual > 0) return manual;
    return activePaidPaymentsForVisit().reduce((total, payment) => total + payment.amountRub, 0);
  }

  function completedActTotalRubValue(): number {
    const manual = Number(completedActTotalRub.replace(/[^\d]/g, ""));
    return manual > 0 ? manual : treatmentAcceptancePlannedTotalRub();
  }

  function completedActFiscalReceiptLines(): string[] {
    const manual = documentTextLines(completedActFiscalReceipts);
    if (manual.length) return manual;
    return activePaidPaymentsForVisit()
      .map((payment) => payment.fiscalReceiptNumber?.trim())
      .filter((value): value is string => Boolean(value));
  }

  function completedActServicesSummaryValue(): string {
    return completedActServicesSummary.trim() || dashboard?.activeVisit.doctorSummary?.trim() || dashboard?.activeVisit.treatmentPlan?.trim() || "";
  }

  function completedActDoctorFullNameValue(): string {
    return completedActDoctorFullName.trim() || activeDoctor?.fullName || "";
  }

  function plannedServiceLinesForFinancialPayload() {
    return activeTreatmentPlanItems
      .filter((item) => item.status !== "cancelled")
      .filter((item) => !dashboard?.activeVisit.id || item.visitId === dashboard.activeVisit.id)
      .map((item) => {
        const service = dashboard?.serviceCatalog.find((catalogItem) => catalogItem.id === item.serviceId);
        const totalRub = Math.max(0, item.unitPriceRub * item.quantity - item.discountRub);
        return {
          serviceName: service?.title ?? item.serviceId,
          toothOrArea: item.toothCode ? `зуб ${item.toothCode}` : null,
          quantity: item.quantity,
          unitPriceRub: item.unitPriceRub,
          discountRub: item.discountRub,
          totalRub
        };
      });
  }

  function treatmentEstimatePatientOrPayerFullNameValue(): string {
    return treatmentEstimatePatientOrPayerFullName.trim() || documentPatient?.fullName || "";
  }

  function treatmentEstimateTreatmentBasisValue(): string {
    return (
      treatmentEstimateTreatmentBasis.trim() ||
      compactDocumentText(dashboard?.activeVisit.diagnosis, dashboard?.activeVisit.complaint, dashboard?.activeVisit.treatmentPlan) ||
      "плановое стоматологическое лечение по результатам осмотра"
    );
  }

  function treatmentEstimateTotalRubValue(): number {
    const manual = Number(treatmentEstimateTotalRub.replace(/[^\d]/g, ""));
    return manual > 0 ? manual : paymentInvoiceTotalRubValue();
  }

  function treatmentEstimateDoctorFullNameValue(): string {
    return treatmentEstimateDoctorFullName.trim() || activeDoctor?.fullName || "";
  }

  function paymentInvoiceTotalRubValue(): number {
    return plannedServiceLinesForFinancialPayload().reduce((total, line) => total + line.totalRub, 0) || treatmentAcceptancePlannedTotalRub();
  }

  function paymentInvoicePayerFullNameValue(): string {
    return paymentInvoicePayerFullName.trim() || documentPatient?.fullName || "";
  }

  function paymentInvoiceBankDetailsValue(): string {
    return paymentInvoiceBankDetails.trim() || dashboard?.clinicSettings.profile?.bankDetails?.trim() || "";
  }

  function firstPaymentReceiptPayment() {
    return selectedPaymentReceiptPayments[0] ?? null;
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
    return (
      paymentReceiptPayerIdentityDocument.trim() ||
      firstPaymentReceiptPayment()?.payerIdentityDocument?.trim() ||
      ""
    );
  }

  function paymentReceiptPayerRelationshipValue(): string {
    return paymentReceiptPayerRelationship.trim() || firstPaymentReceiptPayment()?.payerRelationship?.trim() || "пациент";
  }

  function paymentReceiptIssuedByValue(): string {
    return paymentReceiptIssuedBy.trim() || activeDoctor?.fullName || "Администратор клиники";
  }

  function paymentReceiptFiscalReceiptLines(): string[] {
    return selectedPaymentReceiptPayments
      .map((payment) => payment.fiscalReceiptNumber?.trim())
      .filter((value): value is string => Boolean(value));
  }

  function installmentScheduleTotalRubValue(): number {
    const manual = Number(installmentScheduleTotalRub.replace(/[^\d]/g, ""));
    return manual > 0 ? manual : treatmentAcceptancePlannedTotalRub();
  }

  function installmentSchedulePrepaidRubValue(): number {
    const manual = Number(installmentSchedulePrepaidRub.replace(/[^\d]/g, ""));
    if (manual > 0) return manual;
    return activePaidPaymentsForVisit().reduce((total, payment) => total + payment.amountRub, 0);
  }

  function installmentScheduleRemainingRubValue(): number {
    return Math.max(0, installmentScheduleTotalRubValue() - installmentSchedulePrepaidRubValue());
  }

  function installmentScheduleInstallmentRows() {
    const rows = documentTextLines(installmentScheduleRows).map((line, index) => {
      const [label, dueDate, amount, status] = line.split("|").map((part) => part.trim());
      const parsedAmount = amount ? Number(amount.replace(/[^\d]/g, "")) : Number.NaN;
      const parsedStatus = installmentPaymentStatusAliases[status?.toLocaleLowerCase("ru-RU").replaceAll("ё", "е") ?? ""] ?? "planned";
      return {
        label: label || `Платеж ${index + 1}`,
        dueDate: dueDate || dateInputValuePlusDays(index === 0 ? 7 : 21),
        amountRub: Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0,
        status: parsedStatus
      };
    });
    if (rows.some((row) => row.amountRub > 0)) return rows.filter((row) => row.amountRub > 0);
    const remaining = installmentScheduleRemainingRubValue();
    if (remaining <= 0) return [];
    const firstPart = Math.ceil(remaining / 2);
    const secondPart = remaining - firstPart;
    return [
      { label: "Первый платеж", dueDate: dateInputValuePlusDays(7), amountRub: firstPart, status: "planned" as const },
      ...(secondPart > 0 ? [{ label: "Финальный платеж", dueDate: dateInputValuePlusDays(21), amountRub: secondPart, status: "planned" as const }] : [])
    ];
  }

  function installmentScheduleBaseDocumentTitleValue(): string {
    return installmentScheduleBaseDocumentTitle.trim() || activeUsableDocuments.find((document) => document.kind === "paid_medical_services_contract")?.title || "договор или план лечения клиники";
  }

  function installmentSchedulePayerFullNameValue(): string {
    return installmentSchedulePayerFullName.trim() || documentPatient?.fullName || "";
  }

  function installmentScheduleResponsibleFullNameValue(): string {
    return installmentScheduleResponsibleFullName.trim() || activeDoctor?.fullName || "Администратор клиники";
  }

  function minorRepresentativeFullNameValue(): string {
    return minorRepresentativeFullName.trim() || documentPatient?.administrativeProfile?.legalRepresentativeFullName?.trim() || "";
  }

  function minorRepresentativeRelationshipValue(): string {
    return minorRepresentativeRelationship.trim() || documentPatient?.administrativeProfile?.legalRepresentativeRelationship?.trim() || "";
  }

  function minorRepresentativeIdentityDocumentValue(): string {
    return (
      minorRepresentativeIdentityDocument.trim() ||
      documentPatient?.administrativeProfile?.legalRepresentativeIdentityDocument?.trim() ||
      ""
    );
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

  function minorConsentInterventionScopeValue(): string {
    return minorConsentInterventionScope.trim() || dashboard?.activeVisit.treatmentPlan?.trim() || "стоматологическое вмешательство по согласованному плану";
  }

  function minorConsentDiagnosisOrIndicationValue(): string {
    return minorConsentDiagnosisOrIndication.trim() || dashboard?.activeVisit.diagnosis?.trim() || dashboard?.activeVisit.complaint?.trim() || "";
  }

  function minorConsentDoctorFullNameValue(): string {
    return minorConsentDoctorFullName.trim() || activeDoctor?.fullName || "";
  }

  function warrantyServiceOrWorkNameValue(): string {
    return warrantyServiceOrWorkName.trim() || dashboard?.activeVisit.treatmentPlan?.trim() || dashboard?.activeVisit.doctorSummary?.trim() || "";
  }

  function warrantyTeethOrAreaValue(): string {
    return warrantyTeethOrArea.trim() || inferredTreatmentArea || "область лечения по визиту";
  }

  function warrantyLinkedActOrContractValue(): string {
    return (
      warrantyLinkedActOrContract.trim() ||
      activeUsableDocuments.find((document) => document.kind === "completed_works_act" || document.kind === "paid_medical_services_contract")?.title ||
      "акт выполненных работ или договор клиники"
    );
  }

  function warrantyDoctorFullNameValue(): string {
    return warrantyDoctorFullName.trim() || activeDoctor?.fullName || "";
  }

  function postVisitProcedureNameValue(): string {
    return postVisitProcedureName.trim() || dashboard?.activeVisit.treatmentPlan?.trim() || "Рекомендации после стоматологического приема";
  }

  function postVisitToothOrAreaValue(): string {
    return postVisitToothOrArea.trim() || inferredTreatmentArea || "область лечения по записи приема";
  }

  function postVisitDoctorFullNameValue(): string {
    return postVisitDoctorFullName.trim() || activeDoctor?.fullName || "";
  }

  function applyPostVisitCarePreset(topic: PostVisitCareTopic, options: { force?: boolean } = {}) {
    const topicLabel = postVisitCareTopicOptions.find((option) => option.value === topic)?.label ?? "выбранной темы";
    if (postVisitManualEdited && !options.force) {
      setPostVisitPresetFeedback(
        `Тема "${topicLabel}" выбрана. Текст не перезаписан, потому что есть ручные правки. Нажмите "Подставить памятку для темы", если нужно заменить поля.`
      );
      return;
    }
    const preset = postVisitCarePresets[topic];
    setPostVisitProcedureName(preset.procedureName);
    setPostVisitAllowedAfter(preset.allowedAfter);
    setPostVisitRestrictions(preset.temporaryRestrictions);
    setPostVisitMedicationAndRinsePlan(preset.medicationAndRinsePlan);
    setPostVisitHygieneInstructions(preset.hygieneInstructions);
    setPostVisitNutritionInstructions(preset.nutritionInstructions);
    setPostVisitUrgentWarningSigns(preset.urgentWarningSigns);
    setPostVisitFollowUpAt(preset.plannedFollowUpAt);
    setPostVisitTelegramSummary(preset.telegramSummary);
    setPostVisitPrintedCopyReceived(false);
    setPostVisitUrgentSignsUnderstood(false);
    setPostVisitTelegramSafe(false);
    setPostVisitManualEdited(false);
    setPostVisitPresetFeedback(options.force ? `Памятка для темы "${topicLabel}" подставлена, ручные правки сброшены.` : "");
  }

  function changePostVisitCareTopic(topic: PostVisitCareTopic) {
    setPostVisitCareTopic(topic);
    applyPostVisitCarePreset(topic);
  }

  function markPostVisitManualEdited() {
    setPostVisitManualEdited(true);
    setPostVisitPresetFeedback("");
  }

  function recordExtractComplaintAndAnamnesisValue(): string {
    return recordExtractComplaintAndAnamnesis.trim() || compactDocumentText(dashboard?.activeVisit.complaint, dashboard?.activeVisit.anamnesis);
  }

  function recordExtractObjectiveStatusValue(): string {
    return recordExtractObjectiveStatus.trim() || dashboard?.activeVisit.objectiveStatus?.trim() || "";
  }

  function recordExtractDiagnosisValue(): string {
    return recordExtractDiagnosis.trim() || dashboard?.activeVisit.diagnosis?.trim() || "";
  }

  function recordExtractTreatmentProvidedValue(): string {
    return recordExtractTreatmentProvided.trim() || compactDocumentText(dashboard?.activeVisit.doctorSummary, dashboard?.activeVisit.treatmentPlan);
  }

  function outpatient025uMedicalCardNumberValue(): string {
    const explicitNumber = outpatient025uMedicalCardNumber.trim();
    if (explicitNumber) return explicitNumber;
    const patientToken = documentPatient?.id.slice(0, 8).toUpperCase() ?? "PATIENT";
    return `DENTE-${new Date().getFullYear()}-${patientToken}`;
  }

  function outpatient025uSourceVisitIdsValue(): string[] {
    const sourceVisitIds = documentTextLines(recordExtractSourceVisitIds);
    if (sourceVisitIds.length) return sourceVisitIds;
    return dashboard?.activeVisit.id ? [dashboard.activeVisit.id] : [];
  }

  function outpatient025uLicenseValue(): string | null {
    const value = compactDocumentText(
      clinicProfileDraft.medicalLicenseNumber,
      clinicProfileDraft.medicalLicenseIssuedAt,
      clinicProfileDraft.medicalLicenseIssuer
    );
    return value || null;
  }

  function outpatient025uDoctorValue(): { fullName: string; position: string; specialty: string } {
    return {
      fullName: recordExtractDoctorFullName.trim() || activeDoctor?.fullName || "",
      position: "врач-стоматолог",
      specialty: activeDoctor?.specialties[0] ?? "стоматология"
    };
  }

  function outpatient025uVisitDateValue(): string {
    return recordExtractPeriodEnd.trim() || toDateInputValue(activeAppointment?.startsAt) || new Date().toISOString().slice(0, 10);
  }

  function outpatient025uPayloadValue(): OutpatientMedicalCard025uPayload {
    const patientProfile = documentPatient?.administrativeProfile;
    const doctor = outpatient025uDoctorValue();
    const sourceVisitIds = outpatient025uSourceVisitIdsValue();
    const visitDate = outpatient025uVisitDateValue();
    const complaintsAndAnamnesis = recordExtractComplaintAndAnamnesisValue();
    const treatmentProvided = recordExtractTreatmentProvidedValue();
    return {
      formNumber: "025/у",
      sourceOrderReference: "Приказ Минздрава России от 13.05.2025 N 274н",
      medicalOrganizationName: clinicProfileDraft.legalName.trim() || clinicProfileDraft.clinicName.trim(),
      medicalOrganizationAddress: clinicProfileDraft.address.trim() || null,
      medicalOrganizationOgrnOrOgrnip: clinicProfileDraft.ogrn.trim() || null,
      medicalOrganizationLicense: outpatient025uLicenseValue(),
      medicalCardNumber: outpatient025uMedicalCardNumberValue(),
      openedAt: outpatient025uOpenedAt.trim(),
      periodStart: recordExtractPeriodStart.trim(),
      periodEnd: recordExtractPeriodEnd.trim(),
      sourceVisitIds,
      patientFullName: documentPatient?.fullName ?? "",
      patientBirthDate: toDateInputValue(documentPatient?.birthDate) || null,
      patientSexCode: outpatient025uPatientSexCode,
      citizenship: outpatient025uCitizenship.trim() || null,
      identityDocument: patientProfile?.identityDocument?.trim() || null,
      identityDocumentSeries: null,
      identityDocumentNumber: null,
      patientPhone: documentPatient?.phone?.trim() || null,
      patientEmail: documentPatient?.email?.trim() || null,
      registrationAddress: patientProfile?.registrationAddress?.trim() || null,
      registrationUrbanRuralCode: outpatient025uRegistrationUrbanRuralCode,
      stayAddress: patientProfile?.residentialAddress?.trim() || null,
      stayUrbanRuralCode: outpatient025uStayUrbanRuralCode,
      omsPolicy: patientProfile?.insurancePolicyNumber?.trim() || null,
      omsIssuedAt: outpatient025uOmsIssuedAt.trim() || null,
      insurerName: outpatient025uInsurerName.trim() || null,
      snils: patientProfile?.snils?.trim() || null,
      socialSupportCode: outpatient025uSocialSupportCode.trim() || null,
      healthStatusDisclosureContact: outpatient025uHealthStatusDisclosureContact.trim() || null,
      employmentCode: outpatient025uEmploymentCode.trim() || null,
      disabilityGroup: outpatient025uDisabilityGroup.trim() || null,
      workOrStudyPlace: outpatient025uWorkOrStudyPlace.trim() || null,
      palliativeCareNeedCode: outpatient025uPalliativeCareNeedCode.trim() || null,
      bloodGroup: outpatient025uBloodGroup.trim() || null,
      rhFactor: outpatient025uRhFactor.trim() || null,
      kellK1: outpatient025uKellK1.trim() || null,
      otherBloodData: outpatient025uOtherBloodData.trim() || null,
      allergyHistory: outpatient025uAllergyHistory.trim() || null,
      chronicDispensaryRegister: [],
      finalDiagnoses: [
        {
          date: visitDate,
          diagnosis: recordExtractDiagnosisValue(),
          icd10Code: null,
          firstOrRepeat: "unknown",
          doctorFullName: doctor.fullName,
          doctorPosition: doctor.position,
          doctorSpecialty: doctor.specialty
        }
      ],
      specialistVisitRecords: [
        {
          sourceVisitId: sourceVisitIds[0] ?? "",
          visitDate,
          location: clinicProfileDraft.clinicName.trim() || null,
          doctorFullName: doctor.fullName,
          doctorPosition: doctor.position,
          doctorSpecialty: doctor.specialty,
          firstOrRepeat: "unknown",
          complaints: complaintsAndAnamnesis,
          anamnesis: complaintsAndAnamnesis,
          objectiveData: recordExtractObjectiveStatusValue(),
          primaryDiagnosis: recordExtractDiagnosisValue(),
          primaryDiagnosisIcd10: null,
          complications: null,
          comorbidities: null,
          externalCause: null,
          healthGroup: null,
          dispensaryObservation: null,
          orders: recordExtractRecommendations.trim() || treatmentProvided,
          treatmentProvided,
          medicinesAndPhysiotherapy: null,
          sickLeaveOrCertificate: null,
          preferentialPrescriptions: null,
          informedConsentOrRefusal: "согласия и отказы проверены по подписанной медицинской записи клиники",
          clinicalToothRows: clinicalToothRowsValue()
        }
      ],
      dynamicObservationRecords: [],
      stageEpicrisisRecords: [],
      departmentHeadConsultations: [],
      medicalCommissionRecords: [],
      dispensaryObservationEntries: [],
      hospitalizationRows: [],
      ambulatorySurgeryRows: [],
      xrayDoseRows: [],
      functionalResults: [],
      laboratoryResults: [],
      finalEpicrisis: outpatient025uFinalEpicrisis.trim() || null,
      preparedFromSignedMedicalRecords: confirmedDocumentLiteral(
        recordExtractPreparedFromSignedRecords,
        "карта 025/у собрана из подписанных медицинских записей"
      ),
      officialForm274nChecked: confirmedDocumentLiteral(
        outpatient025uOfficialForm274nChecked,
        "структура карты 025/у сверена с приказом Минздрава N 274н"
      ),
      thirdPartyDataChecked: confirmedDocumentLiteral(outpatient025uThirdPartyDataChecked, "данные третьих лиц для карты 025/у проверены")
    };
  }

  function attendanceStartedAtValue(): string {
    return attendanceStartedAt.trim() || (activeAppointment?.startsAt ? formatDateTime(activeAppointment.startsAt) : "");
  }

  function attendanceEndedAtValue(): string {
    return attendanceEndedAt.trim() || (activeAppointment?.endsAt ? formatDateTime(activeAppointment.endsAt) : "");
  }

  function attendanceSignedByValue(): string {
    return attendanceSignedByFullName.trim() || activeDoctor?.fullName || "";
  }

  function togglePhotoVideoMaterial(material: PhotoVideoConsentMaterial) {
    setPhotoVideoMaterials((current) =>
      current.includes(material) ? current.filter((item) => item !== material) : [...current, material]
    );
  }

  function validateDocumentPayloadForKind(kind: GeneratedDocument["kind"]): string | null {
    if (!structuredPayloadDocumentKinds.has(kind)) return null;
    if (kind === "paid_medical_services_contract") {
      return (
        requiredDocumentField(paidContractNumber, "договор, номер") ??
        requiredDocumentField(paidContractDate, "договор, дата") ??
        requiredDocumentField(paidContractServiceStart, "договор, начало оказания услуг") ??
        requiredDocumentField(paidContractServiceEnd, "договор, окончание или условие завершения") ??
        requiredDocumentField(paidContractCustomerFullNameValue(), "договор, заказчик") ??
        requiredDocumentField(paidContractCareReasonValue(), "договор, основание обращения") ??
        requiredDocumentField(paidContractServiceScopeValue(), "договор, состав услуг") ??
        (paidContractTotalRubValue() > 0 ? null : "Укажите ориентировочную стоимость договора.") ??
        requiredDocumentField(paidContractPaymentTerms, "договор, порядок оплаты") ??
        requiredDocumentField(paidContractPriceChangeRules, "договор, изменение цены и объема") ??
        requiredDocumentField(paidContractFreeCareNotice, "договор, уведомление о бесплатной помощи") ??
        requiredDocumentField(paidContractRecommendationWarning, "договор, предупреждение о рекомендациях врача") ??
        requiredDocumentField(paidContractRefundTerms, "договор, отказ и возврат") ??
        requiredDocumentField(paidContractWarrantyTerms, "договор, гарантия и претензии") ??
        requiredDocumentField(paidContractDoctorFullNameValue(), "договор, врач") ??
        requiredDocumentField(paidContractSignedAt, "договор, дата подписания") ??
        (paidContractClinicInfoConfirmed ? null : "Подтвердите, что пациент получил сведения о клинике и лицензии.") ??
        (paidContractServiceListConfirmed ? null : "Подтвердите, что пациент получил перечень услуг и стоимость.") ??
        (paidContractPaidBasisConfirmed ? null : "Подтвердите, что пациент понимает платную основу услуг.") ??
        (paidContractWrittenChangesConfirmed ? null : "Подтвердите, что изменения договора оформляются письменно.")
      );
    }
    if (kind === "completed_works_act") {
      return (
        requiredDocumentField(completedActNumber, "акт, номер") ??
        requiredDocumentField(completedActDate, "акт, дата") ??
        requiredDocumentField(completedActContractNumber, "акт, договор") ??
        (selectedCompletedActContractDocumentId ? null : "Выберите конкретный уже выданный договор для акта.") ??
        requiredDocumentField(completedActServicePeriodStart, "акт, начало периода оказания") ??
        requiredDocumentField(completedActServicePeriodEnd, "акт, окончание периода оказания") ??
        requiredDocumentField(completedActDoctorFullNameValue(), "акт, врач-исполнитель") ??
        requiredDocumentField(completedActServicesSummaryValue(), "акт, состав работ") ??
        (completedActTotalRubValue() > 0 ? null : "Укажите сумму по акту.") ??
        (completedActPaidRubValue() > 0 ? null : "Для акта нужна фактическая оплаченная сумма.") ??
        (completedActFiscalReceiptLines().length ? null : "Добавьте номера фискальных чеков по акту.") ??
        (completedActLinkedContract ? null : "Подтвердите связь акта с подписанным договором.") ??
        (completedActFinalScopeConfirmed ? null : "Подтвердите финальный состав работ.") ??
        (completedActFiscalReceiptsVerified ? null : "Подтвердите проверку фискальных чеков.") ??
        (completedActAccepted ? null : "Подтвердите приемку работ пациентом.")
      );
    }
    if (kind === "treatment_cost_estimate") {
      const serviceLines = plannedServiceLinesForFinancialPayload();
      return (
        requiredDocumentField(treatmentEstimateNumber, "смета, номер") ??
        requiredDocumentField(treatmentEstimateDate, "смета, дата") ??
        requiredDocumentField(treatmentEstimatePatientOrPayerFullNameValue(), "смета, пациент или плательщик") ??
        requiredDocumentField(treatmentEstimateTreatmentBasisValue(), "смета, основание лечения") ??
        (serviceLines.length ? null : "Для сметы нужен состав услуг из плана лечения.") ??
        (treatmentEstimateTotalRubValue() > 0 ? null : "Укажите итоговую сумму сметы.") ??
        requiredDocumentField(treatmentEstimateValidUntil, "смета, срок действия") ??
        requiredDocumentField(treatmentEstimatePriceChangeRules, "смета, правила изменения цены") ??
        (documentTextLines(treatmentEstimateExcludedItems).length ? null : "Укажите, что не входит в текущую смету.") ??
        requiredDocumentField(treatmentEstimatePaymentMilestoneNotes, "смета, условия оплаты") ??
        requiredDocumentField(treatmentEstimateDoctorFullNameValue(), "смета, ответственный врач") ??
        requiredDocumentField(treatmentEstimateSignedAt, "смета, дата ознакомления") ??
        (treatmentEstimatePreliminaryConfirmed ? null : "Подтвердите предварительный характер сметы.") ??
        (treatmentEstimateScopeConfirmed ? null : "Подтвердите соответствие состава услуг плану лечения.") ??
        (treatmentEstimateFiscalNoticeConfirmed ? null : "Подтвердите, что смета не заменяет договор, акт и кассовый чек.") ??
        (treatmentEstimateChangeRulesConfirmed ? null : "Подтвердите правило обновления сметы при изменениях.")
      );
    }
    if (kind === "payment_invoice") {
      const serviceLines = plannedServiceLinesForFinancialPayload();
      return (
        requiredDocumentField(paymentInvoiceNumber, "счет, номер") ??
        requiredDocumentField(paymentInvoiceDate, "счет, дата") ??
        requiredDocumentField(paymentInvoicePayerFullNameValue(), "счет, плательщик") ??
        requiredDocumentField(paymentInvoicePurpose, "счет, назначение платежа") ??
        (serviceLines.length ? null : "Для счета нужен состав услуг из плана лечения.") ??
        (paymentInvoiceTotalRubValue() > 0 ? null : "Укажите сумму счета.") ??
        requiredDocumentField(paymentInvoiceDueDate, "счет, срок оплаты") ??
        requiredDocumentField(paymentInvoicePaymentTerms, "счет, условия оплаты") ??
        requiredDocumentField(paymentInvoiceBankDetailsValue(), "счет, реквизиты клиники") ??
        (paymentInvoiceCashlessAllowed || paymentInvoiceCashDeskAllowed ? null : "Выберите хотя бы один способ оплаты.") ??
        (paymentInvoiceRequisitesVerified ? null : "Подтвердите проверку реквизитов клиники.") ??
        (paymentInvoiceServiceScopeConfirmed ? null : "Подтвердите состав услуг счета.") ??
        (paymentInvoiceFiscalNoticeConfirmed ? null : "Подтвердите предупреждение: счет не заменяет кассовый чек.")
      );
    }
    if (kind === "payment_receipt") {
      return (
        requiredDocumentField(paymentReceiptNumber, "квитанция, номер") ??
        requiredDocumentField(paymentReceiptDate, "квитанция, дата") ??
        (selectedPaymentReceiptPayments.length ? null : "Выберите оплаченные платежи для квитанции.") ??
        (selectedPaymentReceiptTotalRub > 0 ? null : "Сумма выбранных платежей должна быть больше нуля.") ??
        requiredDocumentField(paymentReceiptPayerFullNameValue(), "квитанция, ФИО плательщика") ??
        (paymentReceiptTaxSupportRequested
          ? requiredDocumentField(paymentReceiptPayerBirthDateValue(), "квитанция, дата рождения плательщика") ??
            requiredDocumentField(paymentReceiptPayerRelationshipValue(), "квитанция, связь плательщика с пациентом") ??
            (paymentReceiptPayerInnValue().replace(/\D+/g, "").length === 12 || paymentReceiptPayerIdentityDocumentValue().trim()
              ? null
              : "Для налоговой квитанции укажите 12-значный ИНН плательщика или документ плательщика.")
          : null) ??
        requiredDocumentField(paymentReceiptPurpose, "квитанция, назначение оплаты") ??
        (paymentReceiptFiscalReceiptLines().length === selectedPaymentReceiptPayments.length
          ? null
          : "У каждого выбранного платежа должен быть номер фискального чека.") ??
        (selectedPaymentReceiptPayments.every((payment) => Boolean(payment.fiscalReceiptIssuedAt?.trim()))
          ? null
          : "У каждого выбранного платежа должна быть дата фискального чека.") ??
        requiredDocumentField(paymentReceiptIssuedByValue(), "квитанция, кто выдал") ??
        (paymentReceiptPaymentsVerified ? null : "Подтвердите сверку выбранных платежей и фискальных чеков.") ??
        (paymentReceiptPayerVerified ? null : "Подтвердите проверку данных плательщика.") ??
        (paymentReceiptFiscalNoticeConfirmed ? null : "Подтвердите, что квитанция не заменяет кассовый чек.")
      );
    }
    if (kind === "installment_payment_schedule") {
      const installments = installmentScheduleInstallmentRows();
      return (
        requiredDocumentField(installmentScheduleNumber, "график, номер") ??
        requiredDocumentField(installmentScheduleDate, "график, дата") ??
        requiredDocumentField(installmentScheduleBaseDocumentTitleValue(), "график, основание") ??
        requiredDocumentField(installmentSchedulePayerFullNameValue(), "график, плательщик") ??
        (installmentScheduleTotalRubValue() > 0 ? null : "Укажите общую сумму графика.") ??
        (installmentScheduleRemainingRubValue() >= 0 ? null : "Остаток по графику не может быть отрицательным.") ??
        (installments.length ? null : "Добавьте платежи графика или укажите остаток к оплате.") ??
        requiredDocumentField(installmentScheduleLatePolicy, "график, правила просрочки") ??
        requiredDocumentField(installmentSchedulePaymentMethodNotes, "график, способы оплаты") ??
        requiredDocumentField(installmentScheduleResponsibleFullNameValue(), "график, ответственный") ??
        (installmentScheduleAccepted ? null : "Подтвердите принятие графика пациентом.") ??
        (installmentScheduleFiscalNoticeConfirmed ? null : "Подтвердите, что график не заменяет кассовый чек.") ??
        (installmentScheduleWrittenChangesConfirmed ? null : "Подтвердите письменное оформление изменений графика.")
      );
    }
    if (kind === "minor_legal_representative_consent") {
      return (
        requiredDocumentField(minorRepresentativeFullNameValue(), "представитель, ФИО") ??
        requiredDocumentField(minorRepresentativeRelationshipValue(), "представитель, родство или статус") ??
        requiredDocumentField(minorRepresentativeIdentityDocumentValue(), "представитель, документ личности") ??
        requiredDocumentField(minorRepresentativeAuthorityDocument, "представитель, основание полномочий") ??
        requiredDocumentField(minorConsentPatientFullNameValue(), "несовершеннолетний, ФИО") ??
        requiredDocumentField(minorConsentPatientBirthDateValue(), "несовершеннолетний, дата рождения") ??
        requiredDocumentField(minorConsentInterventionScopeValue(), "согласие, вмешательство") ??
        requiredDocumentField(minorConsentDiagnosisOrIndicationValue(), "согласие, диагноз или показание") ??
        (documentTextLines(minorConsentRisks).length ? null : "Добавьте разъясненные риски для представителя.") ??
        (documentTextLines(minorConsentAlternatives).length ? null : "Добавьте альтернативы лечения для представителя.") ??
        requiredDocumentField(minorConsentDoctorFullNameValue(), "согласие, врач") ??
        requiredDocumentField(minorConsentSignedAt, "согласие, дата и время") ??
        (minorConsentIdentityVerified ? null : "Подтвердите проверку личности представителя.") ??
        (minorConsentAuthorityVerified ? null : "Подтвердите полномочия представителя.") ??
        (minorConsentExplained ? null : "Подтвердите разъяснение вмешательства, рисков и альтернатив.") ??
        (minorConsentStored ? null : "Подтвердите хранение согласия в медкарте.") ??
        (minorConsentAgeExplanation ? null : "Подтвердите объяснение ребенку по возрасту и состоянию.")
      );
    }
    if (kind === "warranty_service_memo") {
      return (
        requiredDocumentField(warrantyServiceOrWorkNameValue(), "гарантия, работа или услуга") ??
        requiredDocumentField(warrantyCompletedAt, "гарантия, дата завершения") ??
        requiredDocumentField(warrantyTeethOrAreaValue(), "гарантия, зубы или область") ??
        requiredDocumentField(warrantyMaterialsOrSystems, "гарантия, материалы или системы") ??
        requiredDocumentField(warrantyPeriod, "гарантия, срок и условия") ??
        requiredDocumentField(warrantyControlVisitSchedule, "гарантия, контрольные визиты") ??
        (documentTextLines(warrantyPatientObligations).length ? null : "Добавьте обязанности пациента для сохранения гарантии.") ??
        (documentTextLines(warrantyExcludedRiskFactors).length ? null : "Добавьте условия, требующие отдельной оценки.") ??
        (documentTextLines(warrantyUrgentContactReasons).length ? null : "Добавьте признаки для срочной связи с клиникой.") ??
        requiredDocumentField(warrantyLinkedActOrContractValue(), "гарантия, связанный акт или договор") ??
        requiredDocumentField(warrantyDoctorFullNameValue(), "гарантия, врач") ??
        requiredDocumentField(warrantyIssuedAt, "гарантия, дата выдачи") ??
        (warrantyPolicyApplied ? null : "Подтвердите применение локального гарантийного положения.") ??
        (warrantyAftercareReceived ? null : "Подтвердите выдачу рекомендаций после лечения.") ??
        (warrantyControlVisitsUnderstood ? null : "Подтвердите понимание контрольных визитов пациентом.")
      );
    }
    if (kind === "patient_intake_questionnaire") {
      return (
        requiredDocumentField(intakeChiefComplaint, "анкета, жалоба или цель визита") ??
        requiredDocumentField(intakeAllergyStatus, "анкета, аллергии") ??
        requiredDocumentField(intakeCurrentMedications, "анкета, постоянные препараты") ??
        requiredDocumentField(intakeChronicConditions, "анкета, хронические заболевания") ??
        requiredDocumentField(intakeAnticoagulants, "анкета, антикоагулянты") ??
        requiredDocumentField(intakeInfectiousRiskNotes, "анкета, инфекционные риски") ??
        requiredDocumentField(intakeCardioEndocrineNotes, "анкета, системные риски") ??
        (intakeAccuracyConfirmed ? null : "Пациент должен подтвердить достоверность анкеты перед созданием документа.")
      );
    }
    if (kind === "tax_deduction_application") {
      const normalizedInn = taxApplicationTaxpayerInn.replace(/[^\d]/g, "");
      return (
        requiredDocumentField(taxApplicationTaxpayerFullName, "налоговое заявление, заявитель") ??
        (taxApplicationForm === "legacy_2021_2023" && normalizedInn.length !== 10 && normalizedInn.length !== 12
          ? "Для старой налоговой справки укажите 10- или 12-значный ИНН заявителя."
          : null) ??
        (normalizedInn && normalizedInn.length !== 10 && normalizedInn.length !== 12
          ? "ИНН заявителя должен содержать 10 или 12 цифр."
          : null) ??
        (taxApplicationForm === "knd_1151156" && normalizedInn && normalizedInn.length !== 12
          ? "Для КНД 1151156 ИНН физического лица должен быть 12-значным. Если ИНН нет, оставьте поле пустым и заполните документ заявителя."
          : null) ??
        (isDateInputValue(taxApplicationTaxpayerBirthDate)
          ? null
          : "Укажите дату рождения заявителя в формате календарной даты.") ??
        requiredDocumentField(taxApplicationTaxpayerIdentityDocument, "налоговое заявление, документ заявителя") ??
        (taxApplicationRelationship === "self" || taxApplicationAuthorityDocument.trim()
          ? null
          : "Для заявления представителя укажите документ, подтверждающий полномочия.") ??
        requiredDocumentField(taxApplicationContact, "налоговое заявление, контакт или канал выдачи") ??
        (isDateTimeLocalInputValue(taxApplicationRequestedAt) ? null : "Укажите дату и время заявления через календарь.") ??
        (taxApplicationDuplicateWarningAccepted
          ? null
          : "Подтвердите, что администратор проверит отсутствие повторной справки по тем же расходам.")
      );
    }
    if (kind === "informed_consent") {
      const effectiveArea = informedConsentToothOrArea.trim() || inferredTreatmentArea || "";
      const effectiveIndication = informedConsentDiagnosisOrIndication.trim() || dashboard?.activeVisit.complaint || "";
      const effectiveDoctor = informedConsentDoctorFullName.trim() || activeDoctor?.fullName || "";
      return (
        requiredDocumentField(informedConsentIntervention, "информированное согласие, вмешательство") ??
        requiredDocumentField(effectiveArea, "информированное согласие, область или зубы") ??
        requiredDocumentField(effectiveIndication, "информированное согласие, диагноз или показание") ??
        requiredDocumentField(informedConsentExpectedBenefit, "информированное согласие, ожидаемая польза") ??
        (documentTextLines(informedConsentRisks).length ? null : "Добавьте разъясненные риски для информированного согласия.") ??
        (documentTextLines(informedConsentAlternatives).length ? null : "Добавьте альтернативы лечения для информированного согласия.") ??
        (documentTextLines(informedConsentAftercare).length ? null : "Добавьте рекомендации после вмешательства для информированного согласия.") ??
        requiredDocumentField(effectiveDoctor, "информированное согласие, врач") ??
        requiredDocumentField(informedConsentConfirmedAt, "информированное согласие, дата подтверждения") ??
        (informedConsentQuestionsAnswered ? null : "Подтвердите, что пациент получил ответы на вопросы перед согласием.") ??
        (informedConsentRisksUnderstood ? null : "Подтвердите, что пациент понял риски, ограничения и прогноз.") ??
        (informedConsentWithdrawUnderstood ? null : "Подтвердите, что пациенту объяснено право отказаться до вмешательства.")
      );
    }
    if (kind === "procedure_specific_consent_packet") {
      const effectiveArea = procedureConsentToothOrArea.trim() || inferredTreatmentArea || "";
      const effectiveIndication = procedureConsentDiagnosisOrIndication.trim() || dashboard?.activeVisit.complaint || "";
      const effectiveDoctor = procedureConsentDoctorFullName.trim() || activeDoctor?.fullName || "";
      return (
        requiredDocumentField(procedureConsentProcedureName, "процедурное согласие, процедура") ??
        requiredDocumentField(effectiveArea, "процедурное согласие, область или зубы") ??
        requiredDocumentField(effectiveIndication, "процедурное согласие, показание") ??
        (clinicalToothRowsValue().length ? null : "Добавьте клинические строки по зубам или сегментам.") ??
        (documentTextLines(procedureConsentPatientRiskFactors).length
          ? null
          : "Добавьте персональные факторы риска пациента для процедурного согласия.") ??
        (documentTextLines(procedureConsentSpecificRisks).length
          ? null
          : "Добавьте процедурные риски для процедурного согласия.") ??
        (documentTextLines(procedureConsentAlternatives).length
          ? null
          : "Добавьте альтернативы лечения для процедурного согласия.") ??
        (documentTextLines(procedureConsentAftercare).length
          ? null
          : "Добавьте ограничения и рекомендации после процедуры.") ??
        requiredDocumentField(effectiveDoctor, "процедурное согласие, врач") ??
        requiredDocumentField(procedureConsentConfirmedAt, "процедурное согласие, дата подтверждения") ??
        (procedureConsentQuestionsAnswered ? null : "Подтвердите, что пациент получил ответы на вопросы по процедуре.") ??
        (procedureConsentExactProcedureConfirmed ? null : "Подтвердите, что пациенту названа конкретная процедура, зона и объем.") ??
        (procedureConsentRisksUnderstood ? null : "Подтвердите, что пациент понял процедурные риски и ограничения.")
      );
    }
    if (kind === "treatment_plan") {
      return (
        requiredDocumentField(treatmentPlanClinicalReasonValue(), "план лечения, повод обращения") ??
        requiredDocumentField(treatmentPlanDiagnosisSummaryValue(), "план лечения, диагноз или клиническое основание") ??
        requiredDocumentField(treatmentPlanTeethOrAreaValue(), "план лечения, зубы или область") ??
        (clinicalToothRowsValue().length ? null : "Добавьте клинические строки по зубам или сегментам.") ??
        (documentTextLines(treatmentPlanGoals).length ? null : "Добавьте цели лечения.") ??
        (treatmentPlanStageRows().length ? null : "Добавьте этапы плана лечения.") ??
        (treatmentPlanTotalRubValue() > 0 ? null : "Укажите ориентировочную стоимость плана лечения.") ??
        (documentTextLines(treatmentPlanAlternatives).length ? null : "Добавьте альтернативы плана лечения.") ??
        (documentTextLines(treatmentPlanRisks).length ? null : "Добавьте риски и ограничения плана лечения.") ??
        requiredDocumentField(treatmentPlanPrognosis, "план лечения, прогноз и ограничения") ??
        requiredDocumentField(treatmentPlanControlPlan, "план лечения, контроль") ??
        requiredDocumentField(treatmentPlanDoctorFullNameValue(), "план лечения, врач") ??
        requiredDocumentField(treatmentPlanPlannedAt, "план лечения, дата") ??
        (treatmentPlanQuestionsAnswered ? null : "Подтвердите, что пациент получил ответы на вопросы.") ??
        (treatmentPlanSeparateConsentAcknowledged ? null : "Подтвердите, что план не заменяет отдельное согласие.") ??
        (treatmentPlanNewApprovalAcknowledged ? null : "Подтвердите, что изменение плана требует нового согласования.")
      );
    }
    if (kind === "treatment_plan_acceptance") {
      return (
        requiredDocumentField(treatmentAcceptanceClinicalGoal, "согласование плана, клиническая цель") ??
        requiredDocumentField(treatmentAcceptanceDiagnosisSummary.trim() || dashboard?.activeVisit.diagnosis || dashboard?.activeVisit.complaint || "", "согласование плана, диагноз или основание") ??
        requiredDocumentField(treatmentAcceptanceTeethOrArea.trim() || inferredTreatmentArea || "", "согласование плана, зубы или область") ??
        (clinicalToothRowsValue().length ? null : "Добавьте клинические строки по зубам или сегментам.") ??
        (treatmentAcceptanceStageRows().length ? null : "Добавьте этапы согласованного плана лечения.") ??
        (treatmentAcceptanceTotalRubValue() > 0 ? null : "Укажите ориентировочную стоимость согласованного плана.") ??
        requiredDocumentField(treatmentAcceptanceEstimateValidUntil, "согласование плана, срок действия сметы") ??
        requiredDocumentField(treatmentAcceptancePaymentTerms, "согласование плана, условия оплаты") ??
        (documentTextLines(treatmentAcceptanceRejectedAlternatives).length ? null : "Добавьте отклоненные или отложенные альтернативы.") ??
        (documentTextLines(treatmentAcceptanceRisks).length ? null : "Добавьте риски и ограничения плана.") ??
        requiredDocumentField(treatmentAcceptanceWarrantyTerms, "согласование плана, гарантия и контроль") ??
        requiredDocumentField(treatmentAcceptanceDoctorFullName.trim() || activeDoctor?.fullName || "", "согласование плана, врач") ??
        requiredDocumentField(treatmentAcceptanceAcceptedAt, "согласование плана, дата") ??
        (treatmentAcceptanceQuestionsAnswered ? null : "Подтвердите, что пациент получил ответы на вопросы.") ??
        (treatmentAcceptanceAlternativesUnderstood ? null : "Подтвердите, что пациент понимает альтернативы.") ??
        (treatmentAcceptanceCostChangeUnderstood ? null : "Подтвердите, что пациент понимает возможность изменения стоимости.") ??
        (treatmentAcceptanceRevisionAcknowledged ? null : "Подтвердите, что существенное изменение плана требует нового согласования.")
      );
    }
    if (kind === "post_visit_recommendations") {
      return (
        requiredDocumentField(postVisitProcedureNameValue(), "рекомендации после приема, процедура") ??
        requiredDocumentField(postVisitToothOrAreaValue(), "рекомендации после приема, область") ??
        requiredDocumentField(postVisitPerformedAt, "рекомендации после приема, дата приема") ??
        requiredDocumentField(postVisitDoctorFullNameValue(), "рекомендации после приема, врач") ??
        (documentTextLines(postVisitAllowedAfter).length ? null : "Добавьте, когда пациенту можно пить, есть и возвращаться к нагрузке.") ??
        (documentTextLines(postVisitRestrictions).length ? null : "Добавьте временные ограничения после приема.") ??
        (documentTextLines(postVisitMedicationAndRinsePlan).length ? null : "Добавьте назначения, полоскания или явно укажите, что назначений нет.") ??
        (documentTextLines(postVisitHygieneInstructions).length ? null : "Добавьте правила гигиены после приема.") ??
        (documentTextLines(postVisitNutritionInstructions).length ? null : "Добавьте рекомендации по питанию.") ??
        (documentTextLines(postVisitUrgentWarningSigns).length ? null : "Добавьте тревожные признаки для срочной связи с клиникой.") ??
        requiredDocumentField(postVisitClinicContactInstruction, "рекомендации после приема, контакт клиники") ??
        requiredDocumentField(postVisitTelegramSummary, "рекомендации после приема, краткий текст для Telegram") ??
        (postVisitPrintedCopyReceived ? null : "Подтвердите, что пациент получил рекомендации.") ??
        (postVisitUrgentSignsUnderstood ? null : "Подтвердите, что пациент понимает тревожные признаки.") ??
        (postVisitTelegramSafe ? null : "Подтвердите, что текст безопасен для Telegram и не содержит лишних медицинских подробностей.")
      );
    }
    if (kind === "anesthesia_consent_log") {
      return (
        requiredDocumentField(anesthesiaMethod, "анестезия, метод") ??
        requiredDocumentField(anesthesiaAnesthetic, "анестезия, препарат") ??
        requiredDocumentField(anesthesiaZone, "анестезия, зона") ??
        requiredDocumentField(anesthesiaAllergyStatus, "анестезия, аллергоанамнез") ??
        requiredDocumentField(anesthesiaDoseTime, "анестезия, время введения") ??
        requiredDocumentField(anesthesiaDoseMl, "анестезия, доза") ??
        (anesthesiaRisksExplained ? null : "Подтвердите, что пациенту объяснены риски и ограничения анестезии.") ??
        (anesthesiaAllergyRestrictionsChecked ? null : "Подтвердите, что аллергии, лекарства и ограничения проверены до введения.") ??
        (anesthesiaConsentConfirmed ? null : "Подтвердите согласие пациента на выбранную местную анестезию.")
      );
    }
    if (kind === "prescription_medication_order") {
      return (
        (clinicalToothRowsValue().length ? null : "Добавьте клинические строки по зубам или сегментам.") ??
        requiredDocumentField(prescriptionMedication, "назначение, препарат") ??
        requiredDocumentField(prescriptionDosage, "назначение, дозировка") ??
        requiredDocumentField(prescriptionInstructions, "назначение, режим приема") ??
        requiredDocumentField(prescriptionDuration, "назначение, длительность") ??
        (documentTextLines(prescriptionSafetyNotes).length ? null : "Добавьте хотя бы одну памятку пациенту для назначения.") ??
        requiredDocumentField(prescriptionUrgentContactReason, "назначение, когда срочно связаться")
      );
    }
    if (kind === "lab_work_order") {
      return (
        (clinicalToothRowsValue().length ? null : "Добавьте клинические строки по зубам или сегментам.") ??
        requiredDocumentField(labWorkType, "лаборатория, вид работы") ??
        requiredDocumentField(labTeethOrArea, "лаборатория, зубы или зона") ??
        requiredDocumentField(labMaterial, "лаборатория, материал") ??
        requiredDocumentField(labShade, "лаборатория, цвет") ??
        requiredDocumentField(labSource, "лаборатория, источник данных") ??
        requiredDocumentField(labDeadline, "лаборатория, срок")
      );
    }
    if (kind === "photo_video_consent") {
      return (
        (photoVideoMaterials.length ? null : "Отметьте хотя бы один тип фото, видео или снимков.") ??
        (photoVideoClinicalRecordUseConfirmed ? null : "Подтвердите, что фото, видео и снимки вносятся в медицинскую карту пациента.") ??
        (photoVideoAnonymizationConfirmed ? null : "Подтвердите, что внешнее использование возможно только после обезличивания, кроме отдельно разрешенной узнаваемой публикации.") ??
        requiredDocumentField(photoVideoRevocationChannel, "фото/видео, порядок отзыва согласия") ??
        (photoVideoRecognizablePublicationAllowed && !photoVideoMarketingUseAllowed && !photoVideoEducationUseAllowed
          ? "Публикация узнаваемых материалов возможна только вместе с отдельным разрешением на обучение или маркетинг."
          : null)
      );
    }
    if (kind === "xray_cbct_referral") {
      return (
        (clinicalToothRowsValue().length ? null : "Добавьте клинические строки по зубам или сегментам.") ??
        requiredDocumentField(xrayArea, "снимок, область") ??
        requiredDocumentField(xrayClinicalQuestion, "снимок, клинический вопрос") ??
        requiredDocumentField(xrayIndication, "снимок, показание") ??
        requiredDocumentField(xraySafetyNotes, "снимок, ограничения и защита") ??
        requiredDocumentField(xrayRequestedBy.trim() || activeDoctor?.fullName || "", "снимок, назначивший врач")
      );
    }
    if (kind === "outpatient_medical_card_025u") {
      return (
        requiredDocumentField(clinicProfileDraft.legalName.trim() || clinicProfileDraft.clinicName.trim(), "карта 025/у, медорганизация") ??
        requiredDocumentField(outpatient025uMedicalCardNumberValue(), "карта 025/у, номер медицинской карты") ??
        requiredDocumentField(outpatient025uOpenedAt, "карта 025/у, дата открытия") ??
        requiredDocumentField(recordExtractPeriodStart, "карта 025/у, период с") ??
        requiredDocumentField(recordExtractPeriodEnd, "карта 025/у, период по") ??
        (outpatient025uSourceVisitIdsValue().length ? null : "Добавьте источник подписанной медицинской записи для карты 025/у.") ??
        requiredDocumentField(documentPatient?.fullName ?? "", "карта 025/у, пациент") ??
        requiredDocumentField(recordExtractComplaintAndAnamnesisValue(), "карта 025/у, жалобы и анамнез") ??
        requiredDocumentField(recordExtractObjectiveStatusValue(), "карта 025/у, объективный статус") ??
        requiredDocumentField(recordExtractDiagnosisValue(), "карта 025/у, диагноз") ??
        (clinicalToothRowsValue().length ? null : "Добавьте клинические строки по зубам или сегментам для карты 025/у.") ??
        requiredDocumentField(recordExtractTreatmentProvidedValue(), "карта 025/у, проведенное лечение") ??
        requiredDocumentField(recordExtractRecommendations, "карта 025/у, назначения и рекомендации") ??
        requiredDocumentField(recordExtractDoctorFullName.trim() || activeDoctor?.fullName || "", "карта 025/у, врач") ??
        (recordExtractPreparedFromSignedRecords ? null : "Подтвердите, что карта 025/у собрана из подписанных медицинских записей.") ??
        (outpatient025uOfficialForm274nChecked ? null : "Подтвердите сверку карты 025/у с приказом Минздрава N 274н.") ??
        (outpatient025uThirdPartyDataChecked ? null : "Подтвердите, что лишние данные третьих лиц для карты 025/у исключены.")
      );
    }
    if (kind === "medical_record_extract") {
      const sourceVisitIds = documentTextLines(recordExtractSourceVisitIds);
      return (
        requiredDocumentField(recordExtractPeriodStart, "выписка, период с") ??
        requiredDocumentField(recordExtractPeriodEnd, "выписка, период по") ??
        (sourceVisitIds.length || dashboard?.activeVisit.id ? null : "Добавьте источник медицинской записи для выписки.") ??
        requiredDocumentField(recordExtractComplaintAndAnamnesisValue(), "выписка, жалобы и анамнез") ??
        requiredDocumentField(recordExtractObjectiveStatusValue(), "выписка, объективный статус") ??
        requiredDocumentField(recordExtractDiagnosisValue(), "выписка, диагноз") ??
        (clinicalToothRowsValue().length ? null : "Добавьте клинические строки по зубам или сегментам.") ??
        requiredDocumentField(recordExtractTreatmentProvidedValue(), "выписка, проведенное лечение") ??
        requiredDocumentField(recordExtractRecommendations, "выписка, рекомендации") ??
        requiredDocumentField(recordExtractDoctorFullName.trim() || activeDoctor?.fullName || "", "выписка, врач") ??
        requiredDocumentField(recordExtractRecipientFullName.trim() || documentPatient?.fullName || "", "выписка, получатель") ??
        requiredDocumentField(recordExtractRecipientAuthority, "выписка, основание выдачи") ??
        requiredDocumentField(recordExtractIssuedAt, "выписка, дата") ??
        (recordExtractPreparedFromSignedRecords ? null : "Подтвердите, что выписка собрана из подписанных медицинских записей.") ??
        (recordExtractThirdPartyDataChecked ? null : "Подтвердите, что лишние данные третьих лиц исключены.")
      );
    }
    if (kind === "medical_record_copy_request") {
      return (
        (documentTextLines(copyRequestDocumentTypes).length ? null : "Добавьте состав запрошенных медицинских документов.") ??
        requiredDocumentField(copyRequestRecipientFullName.trim() || documentPatient?.fullName || "", "запрос копий, получатель") ??
        requiredDocumentField(copyRequestRecipientIdentityDocument, "запрос копий, документ получателя") ??
        requiredDocumentField(copyRequestRecipientAuthority, "запрос копий, основание полномочий") ??
        requiredDocumentField(copyRequestRequestedAt, "запрос копий, дата запроса") ??
        requiredDocumentField(copyRequestContactForDelivery, "запрос копий, контакт и канал выдачи") ??
        (copyRequestIdentityVerified ? null : "Подтвердите проверку личности получателя.") ??
        (copyRequestThirdPartyDataChecked ? null : "Подтвердите, что лишние данные третьих лиц будут исключены.")
      );
    }
    if (kind === "visit_attendance_certificate") {
      return (
        requiredDocumentField(attendanceStartedAtValue(), "справка о посещении, начало приема") ??
        requiredDocumentField(attendanceEndedAtValue(), "справка о посещении, окончание приема") ??
        requiredDocumentField(attendancePurpose, "справка о посещении, цель выдачи") ??
        requiredDocumentField(attendanceIssuedAt, "справка о посещении, дата выдачи") ??
        requiredDocumentField(attendanceSignedByValue(), "справка о посещении, подписант") ??
        requiredDocumentField(attendanceSignedByRole, "справка о посещении, должность подписанта") ??
        (attendanceDiagnosisDisclosureExcluded ? null : "Подтвердите, что диагноз и план лечения не раскрываются в справке.") ??
        (attendanceNotSickLeaveAcknowledged ? null : "Подтвердите, что справка не заменяет листок нетрудоспособности.")
      );
    }
    if (kind === "medical_document_release_receipt") {
      return (
        requiredDocumentField(selectedReleaseSourceRequestDocumentId, "выдача документов, выданный запрос на копии") ??
        requiredDocumentField(releaseRecipientFullName, "выдача документов, получатель") ??
        requiredDocumentField(releaseRecipientIdentityDocument, "выдача документов, документ получателя") ??
        requiredDocumentField(releaseRecipientAuthority, "выдача документов, основание полномочий") ??
        (documentTextLines(releaseDocumentTypes).length ? null : "Добавьте состав выдаваемых медицинских документов.") ??
        requiredDocumentField(releaseDeliveredAt, "выдача документов, дата и время") ??
        requiredDocumentField(releaseProtectionNote, "выдача документов, защита передачи") ??
        (releaseThirdPartyDataChecked ? null : "Подтвердите, что лишние данные третьих лиц исключены.")
      );
    }
    if (kind === "payment_refund_correction_request") {
      const requestedAmount = normalizeRubAmountInput(refundAmountRub);
      return (
        requiredDocumentField(refundSelectedPaymentId, "возврат/коррекция, исходный платеж") ??
        (requestedAmount !== null && requestedAmount > 0
          ? null
          : rubAmountInputMissingStep(
              refundAmountRub,
              "Укажите сумму возврата или коррекции больше нуля.",
              "Укажите сумму возврата или коррекции целыми рублями без копеек."
            )) ??
        requiredDocumentField(refundReason, "возврат/коррекция, основание") ??
        requiredDocumentField(refundRecipientFullName, "возврат/коррекция, получатель") ??
        requiredDocumentField(refundRecipientIdentityDocument, "возврат/коррекция, документ получателя") ??
        requiredDocumentField(refundOriginalFiscalReceiptNumber, "возврат/коррекция, исходный фискальный чек") ??
        requiredDocumentField(refundAccountantDecision, "возврат/коррекция, решение ответственного")
      );
    }
    if (kind === "personal_data_processing_consent") {
      const operatorName = clinicProfileDraft.legalName.trim() || clinicProfileDraft.clinicName.trim();
      const operatorInn = clinicProfileDraft.inn.replace(/[^\d]/g, "");
      return (
        requiredDocumentField(operatorName, "ПДн, оператор клиники") ??
        (operatorInn.length === 10 || operatorInn.length === 12 ? null : "ИНН оператора ПДн должен содержать 10 или 12 цифр.") ??
        requiredDocumentField(clinicProfileDraft.address, "ПДн, адрес оператора") ??
        (documentTextLines(personalDataPurposes).length ? null : "Добавьте цели обработки персональных данных.") ??
        (documentTextLines(personalDataCategories).length ? null : "Добавьте категории персональных данных.") ??
        (documentTextLines(personalDataActions).length ? null : "Добавьте действия с персональными данными.") ??
        requiredDocumentField(personalDataTransferRules, "ПДн, правила передачи третьим лицам") ??
        requiredDocumentField(personalDataRetentionPeriod, "ПДн, срок хранения") ??
        requiredDocumentField(personalDataRevocationChannel, "ПДн, порядок отзыва") ??
        requiredDocumentField(personalDataConsentGivenAt, "ПДн, дата согласия") ??
        (personalDataVoluntaryConsentConfirmed ? null : "Подтвердите добровольное согласие пациента на обработку ПДн.") ??
        (personalDataMedicalProcessingAcknowledged ? null : "Подтвердите, что пациент понимает обработку медицинских данных.")
      );
    }
    if (kind === "medical_intervention_refusal") {
      return (
        requiredDocumentField(refusalIntervention, "отказ, вмешательство") ??
        requiredDocumentField(refusalClinicalIndication, "отказ, клиническое показание") ??
        (documentTextLines(refusalExplainedRisks).length ? null : "Добавьте разъясненные риски отказа.") ??
        (documentTextLines(refusalAlternatives).length ? null : "Добавьте предложенные альтернативы.") ??
        (documentTextLines(refusalUrgentWarningSigns).length ? null : "Добавьте тревожные признаки для срочного обращения.") ??
        requiredDocumentField(refusalDoctorFullName.trim() || activeDoctor?.fullName || "", "отказ, врач") ??
        requiredDocumentField(refusalConfirmedAt, "отказ, дата подтверждения") ??
        (refusalConsequencesUnderstood ? null : "Подтвердите, что пациент понял последствия отказа.") ??
        (refusalSecondOpinionOffered ? null : "Подтвердите, что пациенту предложено второе мнение или альтернатива.") ??
        (refusalEmergencyCareExplained ? null : "Подтвердите, что пациенту объяснено, когда нужна экстренная помощь.")
      );
    }
    return null;
  }

  function documentPayloadForKind(kind: GeneratedDocument["kind"]): DocumentPayload | null {
    if (kind === "paid_medical_services_contract") {
      return {
        paidMedicalServicesContract: {
          contractNumber: paidContractNumber.trim(),
          contractDate: paidContractDate.trim(),
          serviceStart: paidContractServiceStart.trim(),
          serviceEndOrCondition: paidContractServiceEnd.trim(),
          customerFullName: paidContractCustomerFullNameValue(),
          representativeFullName: paidContractRepresentativeFullName.trim() || null,
          plannedCareReason: paidContractCareReasonValue(),
          serviceScopeSummary: paidContractServiceScopeValue(),
          estimatedTotalRub: paidContractTotalRubValue(),
          paymentTerms: paidContractPaymentTerms.trim(),
          priceChangeRules: paidContractPriceChangeRules.trim(),
          freeCareAvailabilityNotice: paidContractFreeCareNotice.trim(),
          medicalRecommendationWarning: paidContractRecommendationWarning.trim(),
          refusalAndRefundTerms: paidContractRefundTerms.trim(),
          warrantyAndClaimsTerms: paidContractWarrantyTerms.trim(),
          doctorFullName: paidContractDoctorFullNameValue(),
          signedAt: paidContractSignedAt.trim(),
          patientReceivedClinicInfo: confirmedDocumentLiteral(paidContractClinicInfoConfirmed, "информация о клинике получена"),
          patientReceivedPriceAndServiceList: confirmedDocumentLiteral(paidContractServiceListConfirmed, "перечень услуг и цены получены"),
          patientUnderstandsPaidBasis: confirmedDocumentLiteral(paidContractPaidBasisConfirmed, "платная основа понятна"),
          changesRequireWrittenAgreement: confirmedDocumentLiteral(paidContractWrittenChangesConfirmed, "изменения оформляются письменно")
        }
      };
    }
    if (kind === "completed_works_act") {
      return {
        completedWorksAct: {
          actNumber: completedActNumber.trim(),
          actDate: completedActDate.trim(),
          contractNumber: completedActContractNumber.trim(),
          linkedContractDocumentId: selectedCompletedActContractDocumentId,
          servicePeriodStart: completedActServicePeriodStart.trim(),
          servicePeriodEnd: completedActServicePeriodEnd.trim(),
          doctorFullName: completedActDoctorFullNameValue(),
          acceptedServicesSummary: completedActServicesSummaryValue(),
          totalByActRub: completedActTotalRubValue(),
          paidRub: completedActPaidRubValue(),
          fiscalReceiptNumbers: completedActFiscalReceiptLines(),
          patientClaimsText: completedActPatientClaims.trim() || null,
          linkedToSignedContract: confirmedDocumentLiteral(completedActLinkedContract, "акт связан с подписанным договором"),
          finalServiceScopeConfirmed: confirmedDocumentLiteral(completedActFinalScopeConfirmed, "итоговый объем услуг подтвержден"),
          fiscalReceiptsVerified: confirmedDocumentLiteral(completedActFiscalReceiptsVerified, "фискальные чеки проверены"),
          patientAcceptedWorks: confirmedDocumentLiteral(completedActAccepted, "пациент принял работы")
        }
      };
    }
    if (kind === "treatment_cost_estimate") {
      return {
        treatmentCostEstimate: {
          estimateNumber: treatmentEstimateNumber.trim(),
          estimateDate: treatmentEstimateDate.trim(),
          patientOrPayerFullName: treatmentEstimatePatientOrPayerFullNameValue(),
          treatmentBasis: treatmentEstimateTreatmentBasisValue(),
          serviceLines: plannedServiceLinesForFinancialPayload(),
          totalAmountRub: treatmentEstimateTotalRubValue(),
          estimateValidUntil: treatmentEstimateValidUntil.trim(),
          priceChangeRules: treatmentEstimatePriceChangeRules.trim(),
          excludedItems: documentTextLines(treatmentEstimateExcludedItems),
          paymentMilestoneNotes: treatmentEstimatePaymentMilestoneNotes.trim(),
          responsibleDoctorFullName: treatmentEstimateDoctorFullNameValue(),
          responsibleAdminFullName: treatmentEstimateAdminFullName.trim() || null,
          signedAt: treatmentEstimateSignedAt.trim(),
          patientUnderstandsPreliminaryEstimate: confirmedDocumentLiteral(treatmentEstimatePreliminaryConfirmed, "предварительный характер сметы понятен"),
          serviceScopeMatchesTreatmentPlan: confirmedDocumentLiteral(treatmentEstimateScopeConfirmed, "объем сметы соответствует плану"),
          estimateDoesNotReplaceContractOrFiscalReceipt: confirmedDocumentLiteral(treatmentEstimateFiscalNoticeConfirmed, "смета не заменяет договор и чек"),
          changesRequireUpdatedEstimate: confirmedDocumentLiteral(treatmentEstimateChangeRulesConfirmed, "изменения требуют обновления сметы")
        }
      };
    }
    if (kind === "payment_invoice") {
      return {
        paymentInvoice: {
          invoiceNumber: paymentInvoiceNumber.trim(),
          invoiceDate: paymentInvoiceDate.trim(),
          payerFullName: paymentInvoicePayerFullNameValue(),
          payerPhone: paymentInvoicePayerPhone.trim() || null,
          payerEmail: paymentInvoicePayerEmail.trim() || null,
          paymentPurpose: paymentInvoicePurpose.trim(),
          serviceLines: plannedServiceLinesForFinancialPayload(),
          totalAmountRub: paymentInvoiceTotalRubValue(),
          dueDate: paymentInvoiceDueDate.trim(),
          paymentTerms: paymentInvoicePaymentTerms.trim(),
          clinicBankDetails: paymentInvoiceBankDetailsValue(),
          cashlessPaymentAllowed: paymentInvoiceCashlessAllowed,
          cashDeskPaymentAllowed: paymentInvoiceCashDeskAllowed,
          qrPaymentPayload: paymentInvoiceQrPayload.trim() || null,
          clinicRequisitesVerified: confirmedDocumentLiteral(paymentInvoiceRequisitesVerified, "реквизиты клиники проверены"),
          serviceScopeConfirmed: confirmedDocumentLiteral(paymentInvoiceServiceScopeConfirmed, "объем услуги в счете подтвержден"),
          payerInformedInvoiceIsNotFiscalReceipt: confirmedDocumentLiteral(paymentInvoiceFiscalNoticeConfirmed, "плательщик понимает, что счет не является чеком")
        }
      };
    }
    if (kind === "payment_receipt") {
      return {
        paymentReceipt: {
          receiptNumber: paymentReceiptNumber.trim(),
          receiptDate: paymentReceiptDate.trim(),
          selectedPaymentIds: selectedPaymentReceiptPayments.map((payment) => payment.id),
          totalPaidRub: selectedPaymentReceiptTotalRub,
          payerFullName: paymentReceiptPayerFullNameValue(),
          taxSupportRequested: paymentReceiptTaxSupportRequested,
          payerBirthDate: paymentReceiptTaxSupportRequested ? paymentReceiptPayerBirthDateValue() : null,
          payerInn: paymentReceiptTaxSupportRequested ? paymentReceiptPayerInnValue() || null : null,
          payerIdentityDocument: paymentReceiptTaxSupportRequested ? paymentReceiptPayerIdentityDocumentValue() || null : null,
          payerRelationship: paymentReceiptTaxSupportRequested ? paymentReceiptPayerRelationshipValue() : null,
          paymentPurpose: paymentReceiptPurpose.trim(),
          fiscalReceiptNumbers: paymentReceiptFiscalReceiptLines(),
          issuedByFullName: paymentReceiptIssuedByValue(),
          paymentAndFiscalDataVerified: confirmedDocumentLiteral(paymentReceiptPaymentsVerified, "платежи и фискальные чеки сверены"),
          payerIdentityVerified: confirmedDocumentLiteral(paymentReceiptPayerVerified, "данные плательщика проверены"),
          receiptDoesNotReplaceFiscalReceipt: confirmedDocumentLiteral(paymentReceiptFiscalNoticeConfirmed, "квитанция не заменяет кассовый чек")
        }
      };
    }
    if (kind === "installment_payment_schedule") {
      return {
        installmentPaymentSchedule: {
          scheduleNumber: installmentScheduleNumber.trim(),
          scheduleDate: installmentScheduleDate.trim(),
          baseDocumentTitle: installmentScheduleBaseDocumentTitleValue(),
          payerFullName: installmentSchedulePayerFullNameValue(),
          totalAmountRub: installmentScheduleTotalRubValue(),
          prepaidAmountRub: installmentSchedulePrepaidRubValue(),
          remainingAmountRub: installmentScheduleRemainingRubValue(),
          installments: installmentScheduleInstallmentRows(),
          latePaymentPolicy: installmentScheduleLatePolicy.trim(),
          paymentMethodNotes: installmentSchedulePaymentMethodNotes.trim(),
          responsibleStaffFullName: installmentScheduleResponsibleFullNameValue(),
          patientAcceptedSchedule: confirmedDocumentLiteral(installmentScheduleAccepted, "график платежей принят"),
          scheduleDoesNotReplaceFiscalReceipt: confirmedDocumentLiteral(installmentScheduleFiscalNoticeConfirmed, "график не заменяет кассовый чек"),
          changesRequireWrittenAgreement: confirmedDocumentLiteral(installmentScheduleWrittenChangesConfirmed, "изменения графика оформляются письменно")
        }
      };
    }
    if (kind === "minor_legal_representative_consent") {
      return {
        minorLegalRepresentativeConsent: {
          representativeFullName: minorRepresentativeFullNameValue(),
          representativeRelationship: minorRepresentativeRelationshipValue(),
          representativeIdentityDocument: minorRepresentativeIdentityDocumentValue(),
          authorityDocument: minorRepresentativeAuthorityDocument.trim(),
          representativePhone: minorRepresentativePhoneValue() || null,
          minorFullName: minorConsentPatientFullNameValue(),
          minorBirthDate: minorConsentPatientBirthDateValue(),
          interventionScope: minorConsentInterventionScopeValue(),
          diagnosisOrIndication: minorConsentDiagnosisOrIndicationValue(),
          explainedRisks: documentTextLines(minorConsentRisks),
          alternativesExplained: documentTextLines(minorConsentAlternatives),
          doctorFullName: minorConsentDoctorFullNameValue(),
          signedAt: minorConsentSignedAt.trim(),
          representativeIdentityVerified: confirmedDocumentLiteral(minorConsentIdentityVerified, "личность представителя проверена"),
          representativeAuthorityVerified: confirmedDocumentLiteral(minorConsentAuthorityVerified, "полномочия представителя проверены"),
          informedConsentExplained: confirmedDocumentLiteral(minorConsentExplained, "информированное согласие разъяснено"),
          medicalRecordConsentStored: confirmedDocumentLiteral(minorConsentStored, "согласие сохранено в медкарте"),
          ageAppropriateExplanationGiven: confirmedDocumentLiteral(minorConsentAgeExplanation, "ребенку дано объяснение по возрасту")
        }
      };
    }
    if (kind === "warranty_service_memo") {
      return {
        warrantyServiceMemo: {
          serviceOrWorkName: warrantyServiceOrWorkNameValue(),
          completedAt: warrantyCompletedAt.trim(),
          teethOrArea: warrantyTeethOrAreaValue(),
          materialsOrSystems: warrantyMaterialsOrSystems.trim(),
          warrantyPeriod: warrantyPeriod.trim(),
          controlVisitSchedule: warrantyControlVisitSchedule.trim(),
          patientObligations: documentTextLines(warrantyPatientObligations),
          excludedRiskFactors: documentTextLines(warrantyExcludedRiskFactors),
          urgentContactReasons: documentTextLines(warrantyUrgentContactReasons),
          linkedActOrContract: warrantyLinkedActOrContractValue(),
          doctorFullName: warrantyDoctorFullNameValue(),
          issuedAt: warrantyIssuedAt.trim(),
          localWarrantyPolicyApplied: confirmedDocumentLiteral(warrantyPolicyApplied, "локальное гарантийное положение применено"),
          patientReceivedAftercare: confirmedDocumentLiteral(warrantyAftercareReceived, "пациент получил рекомендации"),
          patientUnderstandsControlVisits: confirmedDocumentLiteral(warrantyControlVisitsUnderstood, "контрольные визиты понятны")
        }
      };
    }
    if (kind === "patient_intake_questionnaire") {
      return {
        patientIntakeQuestionnaire: {
          chiefComplaint: intakeChiefComplaint.trim(),
          allergyStatus: intakeAllergyStatus.trim(),
          currentMedications: intakeCurrentMedications.trim(),
          chronicConditions: intakeChronicConditions.trim(),
          pregnancyStatus: intakePregnancyStatus,
          anticoagulants: intakeAnticoagulants.trim(),
          infectiousRiskNotes: intakeInfectiousRiskNotes.trim(),
          cardioEndocrineNotes: intakeCardioEndocrineNotes.trim(),
          emergencyContact: intakeEmergencyContact.trim() || null,
          additionalNotes: intakeAdditionalNotes.trim() || null,
          accuracyConfirmed: confirmedDocumentLiteral(intakeAccuracyConfirmed, "пациент подтвердил достоверность анкеты")
        }
      };
    }
    if (kind === "tax_deduction_application") {
      return {
        taxDeductionApplication: {
          taxpayerFullName: taxApplicationTaxpayerFullName.trim(),
          taxpayerInn: taxApplicationTaxpayerInn.replace(/[^\d]/g, ""),
          taxpayerBirthDate: taxApplicationTaxpayerBirthDate.trim(),
          taxpayerIdentityDocument: taxApplicationTaxpayerIdentityDocument.trim(),
          relationshipToPatient: taxApplicationRelationship,
          requestedTaxYear: taxDocumentYear,
          requestedForm: taxApplicationForm,
          selectedPaymentIds: selectedTaxPaymentIdsForCurrentDocument(),
          deliveryChannel: taxApplicationDeliveryChannel,
          contactForReadyDocument: taxApplicationContact.trim(),
          applicantAuthorityDocument: taxApplicationAuthorityDocument.trim() || null,
          requestedAt: fromDateTimeLocalValue(taxApplicationRequestedAt),
          duplicateWarningAccepted: confirmedDocumentLiteral(taxApplicationDuplicateWarningAccepted, "проверка дублей налоговой справки подтверждена")
        }
      };
    }
    if (kind === "informed_consent") {
      return {
        informedConsent: {
          intervention: informedConsentIntervention.trim(),
          toothOrArea: informedConsentToothOrArea.trim() || inferredTreatmentArea || "",
          diagnosisOrIndication: informedConsentDiagnosisOrIndication.trim() || dashboard?.activeVisit.complaint || "",
          expectedBenefit: informedConsentExpectedBenefit.trim(),
          plannedAnesthesia: informedConsentAnesthesia.trim() || null,
          materialOrMedicationNotes: informedConsentMaterialNotes.trim() || null,
          trustedContactForMedicalInfo: informedConsentTrustedContact.trim() || null,
          explainedRisks: documentTextLines(informedConsentRisks),
          alternatives: documentTextLines(informedConsentAlternatives),
          aftercareRequirements: documentTextLines(informedConsentAftercare),
          doctorFullName: informedConsentDoctorFullName.trim() || activeDoctor?.fullName || "",
          consentConfirmedAt: informedConsentConfirmedAt.trim(),
          patientQuestionsAnswered: confirmedDocumentLiteral(informedConsentQuestionsAnswered, "вопросы пациента по информированному согласию закрыты"),
          patientUnderstandsRisks: confirmedDocumentLiteral(informedConsentRisksUnderstood, "риски информированного согласия понятны"),
          patientMayWithdrawBeforeIntervention: confirmedDocumentLiteral(informedConsentWithdrawUnderstood, "право отказаться до вмешательства объяснено")
        }
      };
    }
    if (kind === "procedure_specific_consent_packet") {
      return {
        procedureSpecificConsent: {
          procedureType: procedureConsentProcedureType,
          procedureName: procedureConsentProcedureName.trim(),
          toothOrArea: procedureConsentToothOrArea.trim() || inferredTreatmentArea || "",
          diagnosisOrIndication: procedureConsentDiagnosisOrIndication.trim() || dashboard?.activeVisit.complaint || "",
          clinicalToothRows: clinicalToothRowsValue(),
          plannedAnesthesia: procedureConsentAnesthesia.trim() || null,
          materialsAndSystems: procedureConsentMaterials.trim() || null,
          patientSpecificRiskFactors: documentTextLines(procedureConsentPatientRiskFactors),
          procedureSpecificRisks: documentTextLines(procedureConsentSpecificRisks),
          alternatives: documentTextLines(procedureConsentAlternatives),
          aftercareAndLimits: documentTextLines(procedureConsentAftercare),
          doctorFullName: procedureConsentDoctorFullName.trim() || activeDoctor?.fullName || "",
          consentConfirmedAt: procedureConsentConfirmedAt.trim(),
          localClinicFormAttached: procedureConsentLocalFormAttached,
          patientQuestionsAnswered: confirmedDocumentLiteral(procedureConsentQuestionsAnswered, "вопросы пациента по процедуре закрыты"),
          exactProcedureConfirmed: confirmedDocumentLiteral(procedureConsentExactProcedureConfirmed, "процедура, зона и объем подтверждены"),
          patientUnderstandsSpecificRisks: confirmedDocumentLiteral(procedureConsentRisksUnderstood, "процедурные риски понятны")
        }
      };
    }
    if (kind === "treatment_plan") {
      return {
        treatmentPlan: {
          clinicalReason: treatmentPlanClinicalReasonValue(),
          diagnosisSummary: treatmentPlanDiagnosisSummaryValue(),
          teethOrArea: treatmentPlanTeethOrAreaValue(),
          clinicalToothRows: clinicalToothRowsValue(),
          treatmentGoals: documentTextLines(treatmentPlanGoals),
          plannedStages: treatmentPlanStageRows(),
          estimatedTotalRub: treatmentPlanTotalRubValue(),
          alternatives: documentTextLines(treatmentPlanAlternatives),
          risksAndLimitations: documentTextLines(treatmentPlanRisks),
          prognosisAndLimits: treatmentPlanPrognosis.trim(),
          controlPlan: treatmentPlanControlPlan.trim(),
          doctorFullName: treatmentPlanDoctorFullNameValue(),
          plannedAt: treatmentPlanPlannedAt.trim(),
          patientQuestionsAnswered: confirmedDocumentLiteral(treatmentPlanQuestionsAnswered, "вопросы пациента по плану лечения закрыты"),
          planRequiresSeparateConsent: confirmedDocumentLiteral(treatmentPlanSeparateConsentAcknowledged, "план не заменяет отдельное согласие"),
          planRequiresNewApprovalOnChange: confirmedDocumentLiteral(treatmentPlanNewApprovalAcknowledged, "изменение плана требует нового согласования")
        }
      };
    }
    if (kind === "treatment_plan_acceptance") {
      return {
        treatmentPlanAcceptance: {
          selectedVariant: treatmentAcceptanceVariant,
          clinicalGoal: treatmentAcceptanceClinicalGoal.trim(),
          diagnosisSummary: treatmentAcceptanceDiagnosisSummary.trim() || dashboard?.activeVisit.diagnosis || dashboard?.activeVisit.complaint || "",
          teethOrArea: treatmentAcceptanceTeethOrArea.trim() || inferredTreatmentArea || "",
          clinicalToothRows: clinicalToothRowsValue(),
          acceptedStages: treatmentAcceptanceStageRows(),
          estimatedTotalRub: treatmentAcceptanceTotalRubValue(),
          estimateValidUntil: treatmentAcceptanceEstimateValidUntil.trim(),
          paymentTerms: treatmentAcceptancePaymentTerms.trim(),
          rejectedAlternatives: documentTextLines(treatmentAcceptanceRejectedAlternatives),
          risksAndLimitations: documentTextLines(treatmentAcceptanceRisks),
          warrantyAndControlTerms: treatmentAcceptanceWarrantyTerms.trim(),
          doctorFullName: treatmentAcceptanceDoctorFullName.trim() || activeDoctor?.fullName || "",
          acceptedAt: treatmentAcceptanceAcceptedAt.trim(),
          patientQuestionsAnswered: confirmedDocumentLiteral(treatmentAcceptanceQuestionsAnswered, "вопросы пациента по согласованию плана закрыты"),
          patientUnderstandsAlternatives: confirmedDocumentLiteral(treatmentAcceptanceAlternativesUnderstood, "альтернативы плана понятны"),
          patientUnderstandsCostMayChange: confirmedDocumentLiteral(treatmentAcceptanceCostChangeUnderstood, "изменение стоимости понятно"),
          revisionRequiresNewApproval: confirmedDocumentLiteral(treatmentAcceptanceRevisionAcknowledged, "пересмотр плана требует нового согласования")
        }
      };
    }
    if (kind === "post_visit_recommendations") {
      return {
        postVisitRecommendations: {
          careTopic: postVisitCareTopic,
          procedureName: postVisitProcedureNameValue(),
          toothOrArea: postVisitToothOrAreaValue(),
          performedAt: postVisitPerformedAt.trim(),
          doctorFullName: postVisitDoctorFullNameValue(),
          allowedAfter: documentTextLines(postVisitAllowedAfter),
          temporaryRestrictions: documentTextLines(postVisitRestrictions),
          medicationAndRinsePlan: documentTextLines(postVisitMedicationAndRinsePlan),
          hygieneInstructions: documentTextLines(postVisitHygieneInstructions),
          nutritionInstructions: documentTextLines(postVisitNutritionInstructions),
          urgentWarningSigns: documentTextLines(postVisitUrgentWarningSigns),
          plannedFollowUpAt: postVisitFollowUpAt.trim() || null,
          clinicContactInstruction: postVisitClinicContactInstruction.trim(),
          telegramSummary: postVisitTelegramSummary.trim(),
          patientReceivedPrintedCopy: confirmedDocumentLiteral(postVisitPrintedCopyReceived, "пациент получил памятку"),
          patientUnderstandsUrgentSigns: confirmedDocumentLiteral(postVisitUrgentSignsUnderstood, "тревожные признаки понятны"),
          safeForTelegramSending: confirmedDocumentLiteral(postVisitTelegramSafe, "Telegram-текст проверен")
        }
      };
    }
    if (kind === "anesthesia_consent_log") {
      return {
        anesthesiaConsentLog: {
          method: anesthesiaMethod.trim(),
          anesthetic: anesthesiaAnesthetic.trim(),
          vasoconstrictor: anesthesiaVasoconstrictor.trim() || null,
          plannedZone: anesthesiaZone.trim(),
          allergyStatus: anesthesiaAllergyStatus.trim(),
          restrictionNotes: anesthesiaRestrictionNotes.trim() || null,
          doseRows: [
            {
              time: anesthesiaDoseTime.trim(),
              medication: [anesthesiaAnesthetic.trim(), anesthesiaVasoconstrictor.trim()].filter(Boolean).join(", "),
              doseMl: anesthesiaDoseMl.trim(),
              zone: anesthesiaZone.trim(),
              reaction: anesthesiaReaction.trim() || null
            }
          ],
          patientAnesthesiaRisksExplained: confirmedDocumentLiteral(anesthesiaRisksExplained, "риски анестезии разъяснены"),
          allergyAndRestrictionStatusChecked: confirmedDocumentLiteral(anesthesiaAllergyRestrictionsChecked, "аллергии и ограничения проверены"),
          patientConfirmedAnesthesiaConsent: confirmedDocumentLiteral(anesthesiaConsentConfirmed, "согласие на местную анестезию подтверждено")
        }
      };
    }
    if (kind === "prescription_medication_order") {
      return {
        prescriptionMedicationOrder: {
          clinicalToothRows: clinicalToothRowsValue(),
          medications: [
            {
              medication: prescriptionMedication.trim(),
              dosage: prescriptionDosage.trim(),
              instructions: prescriptionInstructions.trim(),
              duration: prescriptionDuration.trim()
            }
          ],
          safetyNotes: documentTextLines(prescriptionSafetyNotes),
          urgentContactReason: prescriptionUrgentContactReason.trim()
        }
      };
    }
    if (kind === "lab_work_order") {
      return {
        labWorkOrder: {
          clinicalToothRows: clinicalToothRowsValue(),
          workType: labWorkType.trim(),
          teethOrArea: labTeethOrArea.trim(),
          material: labMaterial.trim(),
          shade: labShade.trim(),
          source: labSource.trim(),
          deadline: labDeadline.trim(),
          technicianNotes: labTechnicianNotes.trim() || null
        }
      };
    }
    if (kind === "photo_video_consent") {
      return {
        photoVideoConsent: {
          clinicalRecordUse: confirmedDocumentLiteral(photoVideoClinicalRecordUseConfirmed, "использование фото, видео и снимков в медицинской карте подтверждено"),
          labTransferAllowed: photoVideoLabTransferAllowed,
          colleagueConsultationAllowed: photoVideoColleagueConsultationAllowed,
          educationUseAllowed: photoVideoEducationUseAllowed,
          marketingUseAllowed: photoVideoMarketingUseAllowed,
          recognizablePublicationAllowed: photoVideoRecognizablePublicationAllowed,
          materials: photoVideoMaterials,
          anonymizationRequired: confirmedDocumentLiteral(photoVideoAnonymizationConfirmed, "обезличивание внешнего использования подтверждено"),
          revocationChannel: photoVideoRevocationChannel.trim(),
          scopeNotes: photoVideoScopeNotes.trim() || null
        }
      };
    }
    if (kind === "xray_cbct_referral") {
      return {
        xrayCbctReferral: {
          studyType: xrayStudyType,
          clinicalToothRows: clinicalToothRowsValue(),
          area: xrayArea.trim(),
          clinicalQuestion: xrayClinicalQuestion.trim(),
          indication: xrayIndication.trim(),
          pregnancyStatus: xrayPregnancyStatus,
          safetyNotes: xraySafetyNotes.trim(),
          priority: xrayPriority,
          includeDicomExport: xrayIncludeDicomExport,
          includeRadiologistReport: xrayIncludeRadiologistReport,
          requestedBy: xrayRequestedBy.trim() || activeDoctor?.fullName || "лечащий врач",
          recipientClinic: xrayRecipientClinic.trim() || null,
          dueDate: xrayDueDate.trim() || null
        }
      };
    }
    if (kind === "outpatient_medical_card_025u") {
      return {
        outpatientMedicalCard025u: outpatient025uPayloadValue()
      };
    }
    if (kind === "medical_record_extract") {
      const sourceVisitIds = documentTextLines(recordExtractSourceVisitIds);
      return {
        medicalRecordExtract: {
          periodStart: recordExtractPeriodStart.trim(),
          periodEnd: recordExtractPeriodEnd.trim(),
          sourceVisitIds: sourceVisitIds.length ? sourceVisitIds : [dashboard?.activeVisit.id ?? "текущий визит"],
          complaintAndAnamnesis: recordExtractComplaintAndAnamnesisValue(),
          objectiveStatus: recordExtractObjectiveStatusValue(),
          diagnosis: recordExtractDiagnosisValue(),
          clinicalToothRows: clinicalToothRowsValue(),
          treatmentProvided: recordExtractTreatmentProvidedValue(),
          recommendations: recordExtractRecommendations.trim(),
          doctorFullName: recordExtractDoctorFullName.trim() || activeDoctor?.fullName || "",
          recipientFullName: recordExtractRecipientFullName.trim() || documentPatient?.fullName || "",
          recipientAuthority: recordExtractRecipientAuthority.trim(),
          issuedAt: recordExtractIssuedAt.trim(),
          preparedFromSignedMedicalRecords: confirmedDocumentLiteral(recordExtractPreparedFromSignedRecords, "выписка подготовлена из подписанных записей"),
          thirdPartyDataChecked: confirmedDocumentLiteral(recordExtractThirdPartyDataChecked, "данные третьих лиц проверены")
        }
      };
    }
    if (kind === "medical_record_copy_request") {
      return {
        medicalRecordCopyRequest: {
          requestedDocumentTypes: documentTextLines(copyRequestDocumentTypes),
          periodStart: copyRequestPeriodStart.trim() || null,
          periodEnd: copyRequestPeriodEnd.trim() || null,
          requestedFormat: copyRequestFormat,
          recipientFullName: copyRequestRecipientFullName.trim() || documentPatient?.fullName || "",
          recipientIdentityDocument: copyRequestRecipientIdentityDocument.trim(),
          recipientAuthority: copyRequestRecipientAuthority.trim(),
          representativeAuthorityDocument: copyRequestRepresentativeAuthorityDocument.trim() || null,
          requestedAt: copyRequestRequestedAt.trim(),
          contactForDelivery: copyRequestContactForDelivery.trim(),
          specialInstructions: copyRequestSpecialInstructions.trim() || null,
          includeDicomSourceData: copyRequestIncludeDicomSourceData,
          identityVerified: confirmedDocumentLiteral(copyRequestIdentityVerified, "личность получателя запроса проверена"),
          thirdPartyDataExclusionAcknowledged: confirmedDocumentLiteral(copyRequestThirdPartyDataChecked, "исключение данных третьих лиц подтверждено")
        }
      };
    }
    if (kind === "visit_attendance_certificate") {
      return {
        visitAttendanceCertificate: {
          attendedAtStart: attendanceStartedAtValue(),
          attendedAtEnd: attendanceEndedAtValue(),
          purpose: attendancePurpose.trim(),
          recipientOrganization: attendanceRecipientOrganization.trim() || null,
          issuedAt: attendanceIssuedAt.trim(),
          signedByFullName: attendanceSignedByValue(),
          signedByRole: attendanceSignedByRole.trim(),
          diagnosisDisclosureExcluded: confirmedDocumentLiteral(attendanceDiagnosisDisclosureExcluded, "диагноз не раскрывается в справке посещения"),
          notSickLeaveAcknowledged: confirmedDocumentLiteral(attendanceNotSickLeaveAcknowledged, "справка не заменяет больничный")
        }
      };
    }
    if (kind === "medical_document_release_receipt") {
      return {
        medicalDocumentReleaseReceipt: {
          sourceRequestDocumentId: selectedReleaseSourceRequestDocumentId,
          recipientFullName: releaseRecipientFullName.trim(),
          recipientIdentityDocument: releaseRecipientIdentityDocument.trim(),
          recipientAuthority: releaseRecipientAuthority.trim(),
          releaseChannel,
          documentTypes: documentTextLines(releaseDocumentTypes),
          periodStart: releasePeriodStart.trim() || null,
          periodEnd: releasePeriodEnd.trim() || null,
          deliveredAt: releaseDeliveredAt.trim(),
          accessExpiresAt: releaseAccessExpiresAt.trim() || null,
          deliveryProtectionNote: releaseProtectionNote.trim(),
          thirdPartyDataChecked: confirmedDocumentLiteral(releaseThirdPartyDataChecked, "лишние данные третьих лиц исключены")
        }
      };
    }
    if (kind === "payment_refund_correction_request") {
      return {
        paymentRefundCorrection: {
          action: refundAction,
          selectedPaymentIds: refundSelectedPaymentId ? [refundSelectedPaymentId] : [],
          amountRub: normalizeRubAmountInput(refundAmountRub) ?? 0,
          reason: refundReason.trim(),
          refundMethod,
          recipientFullName: refundRecipientFullName.trim(),
          recipientIdentityDocument: refundRecipientIdentityDocument.trim(),
          bankDetails: refundBankDetails.trim() || null,
          originalFiscalReceiptNumber: refundOriginalFiscalReceiptNumber.trim(),
          correctionFiscalReceiptNumber: refundCorrectionFiscalReceiptNumber.trim() || null,
          accountantDecision: refundAccountantDecision.trim()
        }
      };
    }
    if (kind === "personal_data_processing_consent") {
      return {
        personalDataProcessingConsent: {
          operatorLegalName: clinicProfileDraft.legalName.trim() || clinicProfileDraft.clinicName.trim(),
          operatorInn: clinicProfileDraft.inn.replace(/[^\d]/g, ""),
          operatorAddress: clinicProfileDraft.address.trim(),
          processingPurposes: documentTextLines(personalDataPurposes),
          personalDataCategories: documentTextLines(personalDataCategories),
          processingActions: documentTextLines(personalDataActions),
          thirdPartyTransferRules: personalDataTransferRules.trim(),
          crossBorderTransferAllowed: personalDataCrossBorderAllowed,
          automatedDecisionMakingAllowed: personalDataAutomatedDecisionAllowed,
          retentionPeriod: personalDataRetentionPeriod.trim(),
          revocationChannel: personalDataRevocationChannel.trim(),
          consentGivenAt: personalDataConsentGivenAt.trim(),
          patientConfirmedVoluntaryConsent: confirmedDocumentLiteral(personalDataVoluntaryConsentConfirmed, "добровольное согласие на ПДн подтверждено"),
          medicalDataProcessingAcknowledged: confirmedDocumentLiteral(personalDataMedicalProcessingAcknowledged, "обработка медицинских данных понятна")
        }
      };
    }
    if (kind === "medical_intervention_refusal") {
      return {
        medicalInterventionRefusal: {
          refusedIntervention: refusalIntervention.trim(),
          clinicalIndication: refusalClinicalIndication.trim(),
          patientReason: refusalPatientReason.trim() || null,
          explainedRisks: documentTextLines(refusalExplainedRisks),
          alternativesOffered: documentTextLines(refusalAlternatives),
          urgentWarningSigns: documentTextLines(refusalUrgentWarningSigns),
          doctorFullName: refusalDoctorFullName.trim() || activeDoctor?.fullName || "",
          refusalConfirmedAt: refusalConfirmedAt.trim(),
          patientUnderstandsConsequences: confirmedDocumentLiteral(refusalConsequencesUnderstood, "последствия отказа понятны"),
          secondOpinionOffered: confirmedDocumentLiteral(refusalSecondOpinionOffered, "второе мнение или альтернатива предложены"),
          emergencyCareExplained: confirmedDocumentLiteral(refusalEmergencyCareExplained, "экстренная помощь объяснена")
        }
      };
    }
    return null;
  }

  function renderClinicalToothRowsEditor() {
    return (
      <label>
        Клинические строки по зубам и сегментам
        <textarea value={clinicalToothRowsText} onChange={(event) => setClinicalToothRowsText(event.target.value)} rows={5} />
        <small>
          Формат строки: зуб/сегмент | поверхности | статус | диагноз/находка | показание | действие | прогноз | пародонт | имплант/ортопедия |
          ортодонтия
        </small>
      </label>
    );
  }

  async function createDocument(kind: GeneratedDocument["kind"]) {
    if (documentCreateSavingKind) {
      setError("Дождитесь завершения текущего создания документа.");
      return;
    }
    if (!documentPatient || !dashboard) {
      setError("Выберите пациента перед созданием документа.");
      return;
    }
    const amountSource = documentAmountSource(kind);
    const metadata = documentKindMetadata[kind];
    const isTaxDocument = metadata.group === "tax";
    const payloadError = validateDocumentPayloadForKind(kind);
    if (payloadError) {
      setError(payloadError);
      return;
    }
    const documentPayload = documentPayloadForKind(kind);
    if ((kind === "tax_deduction_certificate" || kind === "tax_deduction_registry") && taxDocumentYear < 2024) {
      setError("КНД 1151156 подходит только для оплат с 2024 года. Для 2021-2023 выберите старую справку.");
      return;
    }
    if (kind === "legacy_tax_deduction_certificate" && (taxDocumentYear < 2021 || taxDocumentYear > 2023)) {
      setError("Старая налоговая справка подходит только для оплат 2021-2023. Для 2024+ выберите КНД 1151156.");
      return;
    }
    const selectedTaxPayerInn = isTaxDocument ? selectedTaxDocumentPayerInn : "";
    if (isTaxDocument && taxDocumentPayerOptions.length > 1 && !selectedTaxDocumentPayerKey) {
      setError("Выберите плательщика для КНД 1151156. Разные налогоплательщики должны идти отдельными справками.");
      return;
    }
    const usesTaxPaymentSelection = taxPaymentSelectionDocumentKinds.has(kind);
    const requiresTaxPaymentSelection = taxPaymentSelectionPayloadDocumentKinds.has(kind);
    const selectedTaxPaymentIdsForDocument = usesTaxPaymentSelection
      ? selectedTaxPaymentIdsForCurrentDocument()
      : [];
    const requiresPaymentReceiptSelection = kind === "payment_receipt";
    const eligiblePaymentReceiptIdSet = new Set(eligiblePaymentReceiptPayments.map((payment) => payment.id));
    const selectedPaymentReceiptIdsForDocument = requiresPaymentReceiptSelection
      ? selectedPaymentReceiptIds.filter((paymentId) => eligiblePaymentReceiptIdSet.has(paymentId))
      : [];
    if (requiresTaxPaymentSelection && selectedTaxPaymentIdsForDocument.length === 0) {
      setError("Выберите фискальные чеки для налогового документа. Система больше не подставляет все оплаты за год автоматически.");
      return;
    }
    if (requiresPaymentReceiptSelection && selectedPaymentReceiptIdsForDocument.length === 0) {
      setError("Выберите оплаченные платежи для платежной квитанции. Система не подставляет все оплаты скрыто.");
      return;
    }
    const linkActiveVisit =
      metadata.requiresVisit || metadata.group === "payment" || (metadata.group !== "tax" && metadata.amountSource !== "none");
    if (linkActiveVisit && !documentPatientMatchesActiveVisit) {
      setError(
        `Документ «${metadata.label}» требует активного приема пациента ${documentPatient.fullName}. Сейчас открыт прием другого пациента, поэтому система не создаст документ с чужой привязкой к приему. Откройте нужный прием или выберите документ без привязки к визиту.`
      );
      return;
    }
    const plannedAmount =
      activeTreatmentPlanItems
        .filter((item) => item.status !== "cancelled")
        .filter((item) => !dashboard.activeVisit.id || item.visitId === dashboard.activeVisit.id)
        .reduce((total, item) => total + Math.max(0, item.unitPriceRub * item.quantity - item.discountRub), 0) || null;
    const paidAmount =
      activePayments
        .filter((payment) => payment.status === "paid")
        .filter((payment) => {
          if (requiresPaymentReceiptSelection) return selectedPaymentReceiptIdsForDocument.includes(payment.id);
          if (kind === "payment_refund_correction_request" && documentPayload?.paymentRefundCorrection) {
            return documentPayload.paymentRefundCorrection.selectedPaymentIds.includes(payment.id);
          }
          if (metadata.group !== "tax") return payment.visitId === dashboard.activeVisit.id;
          if (requiresTaxPaymentSelection) return selectedTaxPaymentIdsForDocument.includes(payment.id);
          return (
            paymentTaxYearForUi(payment) === taxDocumentYear &&
            (!selectedTaxDocumentPayerKey || taxPaymentPayerKeyForUi(payment) === selectedTaxDocumentPayerKey)
          );
        })
        .reduce((total, payment) => total + payment.amountRub, 0) || null;
    if (amountSource === "paid" && !paidAmount) {
      setError(
        metadata.group === "tax"
          ? `Для налогового документа нужна фактическая оплата за ${taxDocumentYear} год. План лечения и оплаты других лет не подходят.`
          : "Для этого документа нужна фактическая оплата. План лечения или примерная сумма не подходят."
      );
      return;
    }
    if (
      kind === "payment_refund_correction_request" &&
      documentPayload?.paymentRefundCorrection &&
      paidAmount &&
      documentPayload.paymentRefundCorrection.amountRub > paidAmount
    ) {
      setError("Сумма возврата или коррекции не может превышать фактическую оплату по выбранному визиту.");
      return;
    }
    const totalAmountRub = amountSource === "paid" ? paidAmount : amountSource === "planned" ? plannedAmount : null;
    const payloadForDocument = taxPaymentSelectionPayloadDocumentKinds.has(kind)
      ? { ...(documentPayload ?? {}), taxPaymentSelection: { selectedPaymentIds: selectedTaxPaymentIdsForDocument } }
      : documentPayload;
    setDocumentCreateSavingKind(kind);
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          patientId: documentPatient.id,
          visitId: linkActiveVisit ? dashboard.activeVisit.id : null,
          kind,
          taxYear: isTaxDocument ? taxDocumentYear : null,
          taxPayerInn: isTaxDocument ? selectedTaxPayerInn || null : null,
          payload: payloadForDocument,
          title: isTaxDocument ? `${metadata.title} за ${taxDocumentYear} год` : undefined,
          totalAmountRub: moneyDocumentKinds.has(kind) ? totalAmountRub : null
        })
      });
      if (!response.ok) {
        setError(await responseErrorMessage(response, "Документ не создан"));
        return;
      }
      try {
        await loadDashboard();
        setError(null);
      } catch (error) {
        setError(requestFailureMessage("Документ создан, но список документов не перезагружен", error));
      }
    } catch (error) {
      setError(requestFailureMessage("Документ не создан", error));
    } finally {
      setDocumentCreateSavingKind(null);
    }
  }

  async function updateDocumentStatus(documentId: string, action: "issue" | "void", payload?: unknown): Promise<boolean> {
    if (documentStatusSavingId) {
      setError("Дождитесь завершения текущего действия с документом.");
      return false;
    }
    setDocumentStatusSavingId(documentId);
    try {
      const headers = denteClinicalMutationHeaders(payload ? { "Content-Type": "application/json" } : {});
      const response = await fetch(`/api/documents/${documentId}/${action}`, {
        method: "POST",
        headers,
        ...(payload
          ? {
              body: JSON.stringify(payload)
            }
          : {})
      });
      if (!response.ok) {
        setError(await responseErrorMessage(response, "Статус документа не обновлен"));
        return false;
      }
      setDocumentAuditFacts(null);
      try {
        await loadDashboard();
        setError(null);
      } catch (error) {
        setError(requestFailureMessage("Статус документа обновлен, но список документов не перезагружен", error));
      }
      return true;
    } catch (error) {
      setError(requestFailureMessage("Статус документа не обновлен", error));
      return false;
    } finally {
      setDocumentStatusSavingId(null);
    }
  }

  function requestDocumentIssue(document: GeneratedDocument) {
    if (!dashboard) {
      setError("Данные клиники еще не загружены. Повторите выдачу документа после загрузки рабочего экрана.");
      return;
    }
    if (document.status !== "draft") {
      setError("Выдать можно только черновик документа.");
      return;
    }
    setDocumentIssueSignedAt(currentLocalDateTimeInputValue());
    setDocumentIssueRecipientFullName(patientName(dashboard.patients, document.patientId));
    setDocumentIssueRecipientRole("пациент/законный представитель");
    if (!documentIssueStaffFullName.trim() && activeDoctor?.fullName) {
      setDocumentIssueStaffFullName(activeDoctor.fullName);
    }
    if (!documentIssueStaffRole.trim()) {
      setDocumentIssueStaffRole(activeDoctor ? staffRoleLabels[activeDoctor.role] : "Врач/администратор");
    }
    setDocumentIssueNote("");
    setDocumentIssueIdentityChecked(false);
    setDocumentIssueDocumentOpenedAndChecked(false);
    setDocumentIssueRecipientSigned(false);
    setDocumentIssueClinicSigned(false);
    setDocumentIssueConfirmationId(document.id);
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
    saveDocumentIssueSignatureDraft(
      dashboard?.clinicSettings.profile?.organizationId ?? null,
      documentIssueSignatureMode,
      documentIssueStaffFullName,
      documentIssueStaffRole
    );
    const updated = await updateDocumentStatus(documentId, "issue", payload);
    if (updated) {
      setDocumentIssueConfirmationId(null);
    }
  }

  function requestDocumentVoid(document: GeneratedDocument) {
    if (document.status === "voided") {
      setError("Документ уже аннулирован.");
      return;
    }
    setDocumentVoidReasonCode(document.status === "issued" ? "issued_in_error" : "draft_error");
    setDocumentVoidReasonText("");
    if (!documentVoidStaffFullName.trim() && activeDoctor?.fullName) {
      setDocumentVoidStaffFullName(activeDoctor.fullName);
    }
    if (!documentVoidStaffRole.trim()) {
      setDocumentVoidStaffRole(activeDoctor ? staffRoleLabels[activeDoctor.role] : "Врач/администратор");
    }
    setDocumentVoidCorrectionDocumentId("");
    setDocumentVoidReplacementRequired(document.status === "issued");
    setDocumentVoidPatientOrPayerNotified(false);
    setDocumentVoidArchivePreserved(false);
    setDocumentVoidStatusReviewed(false);
    setDocumentVoidConfirmationId(document.id);
  }

  async function confirmDocumentVoid() {
    const documentId = documentVoidConfirmation?.id;
    if (!documentId) {
      setError("Выберите документ для аннулирования.");
      return;
    }
    if (!documentVoidReady) {
      setError("Перед аннулированием укажите причину, ответственного сотрудника, сохранение архива и проверку статуса.");
      return;
    }
    const payload = {
      voidAttestation: {
        reasonCode: documentVoidReasonCode,
        reasonText: documentVoidReasonText.trim(),
        voidedAt: currentLocalDateTimeInputValue().replace("T", " "),
        staffFullName: documentVoidStaffFullName.trim(),
        staffRole: documentVoidStaffRole.trim(),
        correctionDocumentId: documentVoidCorrectionDocumentId.trim() || null,
        replacementRequired: documentVoidReplacementRequired,
        patientOrPayerNotified: documentVoidPatientOrPayerNotified,
        archivePreserved: true,
        statusReviewed: true
      }
    } satisfies VoidDocumentInput;
    const updated = await updateDocumentStatus(documentId, "void", payload);
    if (updated) {
      setDocumentVoidConfirmationId(null);
    }
  }

  async function downloadTaxDocumentXml(documentId: string) {
    try {
      const response = await fetch(`/api/documents/${documentId}/tax-xml`, { cache: "no-store", headers: denteClinicalReadHeaders() });
      if (!response.ok) {
        setError(await responseErrorMessage(response, "XML ФНС не выгружен"));
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const quotedFileName = /filename="([^"]+)"/.exec(disposition)?.[1];
      const fileName = quotedFileName?.trim() || `dente-tax-${documentId}.xml`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setError(null);
    } catch (error) {
      setError(requestFailureMessage("XML ФНС не выгружен", error));
    }
  }

  async function loadDocumentAuditFacts(documentId: string) {
    setDocumentAuditFactsLoadingId(documentId);
    try {
      const response = await fetch(`/api/documents/${documentId}/audit-facts`, { cache: "no-store", headers: denteClinicalReadHeaders() });
      if (!response.ok) {
        setError(await responseErrorMessage(response, "Паспорт выдачи не загружен"));
        return;
      }
      setDocumentAuditFacts((await response.json()) as DocumentAuditFacts);
      setError(null);
    } catch (error) {
      setError(requestFailureMessage("Паспорт выдачи не загружен", error));
    } finally {
      setDocumentAuditFactsLoadingId(null);
    }
  }

  function issuedDocumentHtmlPreviewUrl(documentId: string): string {
    return `/api/documents/${encodeURIComponent(documentId)}/html`;
  }

  function issuedDocumentHtmlDownloadUrl(documentId: string): string {
    return `${issuedDocumentHtmlPreviewUrl(documentId)}?download=1`;
  }

  async function downloadIssuedDocumentHtml(documentId: string, options: { preserveError?: boolean } = {}) {
    try {
      const response = await fetch(issuedDocumentHtmlDownloadUrl(documentId), { cache: "no-store", headers: denteClinicalReadHeaders() });
      if (!response.ok) {
        setError(await responseErrorMessage(response, "Архивный HTML не скачан"));
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const quotedFileName = /filename="([^"]+)"/.exec(disposition)?.[1];
      const fileName = quotedFileName?.trim() || `dente-document-${documentId}.html`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      if (!options.preserveError) setError(null);
    } catch (error) {
      setError(requestFailureMessage("Архивный HTML не скачан", error));
    }
  }

  async function openIssuedDocumentHtml(documentId: string) {
    try {
      const previewUrl = issuedDocumentHtmlPreviewUrl(documentId);
      if (clinicalAdminSecretSession.trim()) {
        setError(
          "HTML-предпросмотр в новом окне не может передать секрет администратора клиники. CRM запускает защищенное скачивание архивного HTML."
        );
        await downloadIssuedDocumentHtml(documentId, { preserveError: true });
        return;
      }

      const opened = window.open(previewUrl, "_blank", "noopener,noreferrer");
      if (opened) {
        setError(null);
        return;
      }

      setError(
        "Браузер заблокировал новое окно документа. CRM запускает скачивание архивного HTML; если мобильный браузер его отклонит, нажмите \"Скачать HTML\" в строке документа."
      );
      await downloadIssuedDocumentHtml(documentId, { preserveError: true });
    } catch (error) {
      setError(requestFailureMessage("HTML документа не открыт", error));
    }
  }

  async function downloadIssuedDocumentPdf(documentId: string) {
    try {
      const response = await fetch(`/api/documents/${documentId}/pdf`, { cache: "no-store", headers: denteClinicalReadHeaders() });
      if (!response.ok) {
        setError(await responseErrorMessage(response, "PDF не сформирован"));
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const quotedFileName = /filename="([^"]+)"/.exec(disposition)?.[1];
      const fileName = quotedFileName?.trim() || `dente-document-${documentId}.pdf`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setError(null);
    } catch (error) {
      setError(requestFailureMessage("PDF не сформирован", error));
    }
  }

  async function recordPayment() {
    setPaymentFeedback("");
    if (isPaymentSaving) {
      setError("Дождитесь завершения текущей записи оплаты.");
      return;
    }
    if (!documentPatient || !dashboard) {
      setError("Выберите пациента и активный прием перед записью оплаты.");
      return;
    }
    if (!documentPatientMatchesActiveVisit) {
      setError(paymentPatientContextMessage || "Оплата не записана: выбранный пациент не совпадает с активным приемом.");
      return;
    }
    const amountRub = normalizeRubAmountInput(paymentAmount);
    const amountMissingStep = rubAmountInputMissingStep(paymentAmount);
    if (amountMissingStep || amountRub === null) {
      setError(`Сумма оплаты: ${amountMissingStep ?? "укажите сумму больше нуля"}.`);
      return;
    }
    const paymentPayerName = paymentPayerFullName.trim();
    const explicitPayerInn = paymentPayerInn.trim();
    const explicitPayerBirthDate = paymentPayerBirthDate.trim();
    const explicitPayerIdentityDocument = paymentPayerIdentityDocument.trim();
    const paymentPayerRelation = paymentPayerRelationship.trim();
    const explicitFiscalFn = paymentFiscalFn.trim();
    const explicitFiscalFd = paymentFiscalFd.trim();
    const explicitFiscalFpd = paymentFiscalFpd.trim();
    const explicitFiscalReceiptUrl = paymentFiscalReceiptUrl.trim();
    const taxReadyPaymentRequested = paymentTaxDeductionCode === "1" || paymentTaxDeductionCode === "2";
    if (taxReadyPaymentRequested) {
      const missingTaxFields = [
        [paymentFiscalReceiptIssuedAt.trim(), "дата фискального чека"],
        [explicitFiscalFn, "ФН"],
        [explicitFiscalFd, "ФД"],
        [explicitFiscalFpd, "ФПД"],
        [paymentPayerName, "ФИО плательщика"],
        [explicitPayerBirthDate, "дата рождения плательщика"],
        [explicitPayerIdentityDocument, "документ плательщика"],
        [paymentPayerRelation, "родство плательщика"]
      ]
        .filter(([value]) => !value)
        .map(([, label]) => label);
      if (missingTaxFields.length) {
        setError(`Для налоговой оплаты заполните явно: ${missingTaxFields.join(", ")}. Данные из карточки пациента не подставляются автоматически.`);
        return;
      }
    }
    if (explicitFiscalReceiptUrl && !/^https?:\/\/\S+$/i.test(explicitFiscalReceiptUrl)) {
      setError("Ссылка ОФД должна начинаться с http:// или https://");
      return;
    }
    const patientIsPayer =
      (!paymentPayerName || paymentPayerName === documentPatient.fullName) &&
      (!paymentPayerRelation || paymentPayerRelation.toLocaleLowerCase("ru-RU") === "пациент");
    const administrativePayerInn = patientIsPayer ? documentPatient.administrativeProfile?.taxpayerInn?.trim() ?? "" : "";
    const administrativePayerDocument = patientIsPayer ? documentPatient.administrativeProfile?.identityDocument?.trim() ?? "" : "";
    const normalizedPayerInn = taxReadyPaymentRequested ? explicitPayerInn : explicitPayerInn || administrativePayerInn;
    if (normalizedPayerInn && !/^\d{10}$|^\d{12}$/.test(normalizedPayerInn)) {
      setError("ИНН плательщика должен содержать 10 или 12 цифр");
      return;
    }
    setIsPaymentSaving(true);
    try {
      const documentForPayment =
        activeUsableDocuments.find(
          (document) =>
            documentKindMetadata[document.kind].group === "payment" &&
            document.kind !== "payment_refund_correction_request" &&
            document.visitId === dashboard.activeVisit.id &&
            (document.totalAmountRub ?? 0) > 0
        ) ?? null;
      const paymentClientMutationId = browserGeneratedId("payment");
      const response = await fetch("/api/billing/payments", {
        method: "POST",
        headers: denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          patientId: documentPatient.id,
          visitId: dashboard.activeVisit.id,
          documentId: documentForPayment?.id ?? null,
          clientMutationId: paymentClientMutationId,
          amountRub,
          method: paymentMethod,
          fiscalReceiptNumber: paymentFiscalReceiptNumber.trim() || null,
          fiscalReceiptIssuedAt: paymentFiscalReceiptIssuedAt.trim() || null,
          fiscalReceiptUrl: explicitFiscalReceiptUrl || null,
          fiscalReceipt: {
            fn: explicitFiscalFn || null,
            fd: explicitFiscalFd || null,
            fpd: explicitFiscalFpd || null,
            cashierName: paymentFiscalCashierName.trim() || null,
            receiptUrl: explicitFiscalReceiptUrl || null,
            operationType: "income"
          },
          payerFullName: taxReadyPaymentRequested ? paymentPayerName : paymentPayerName || documentPatient.fullName,
          payerInn: normalizedPayerInn || null,
          payerBirthDate: taxReadyPaymentRequested ? explicitPayerBirthDate : explicitPayerBirthDate || documentPatient.birthDate,
          payerIdentityDocument: taxReadyPaymentRequested
            ? explicitPayerIdentityDocument
            : explicitPayerIdentityDocument || administrativePayerDocument || null,
          payerRelationship: taxReadyPaymentRequested ? paymentPayerRelation : paymentPayerRelation || "пациент",
          taxDeductionCode: paymentTaxDeductionCode || null,
          note: "Оплата из рабочего экрана CRM"
        })
      });
      if (!response.ok) {
        setError(await responseErrorMessage(response, "Оплата не записана"));
        return;
      }
      setPaymentAmount("");
      setPaymentFiscalReceiptNumber("");
      setPaymentFiscalReceiptIssuedAt("");
      setPaymentFiscalFn("");
      setPaymentFiscalFd("");
      setPaymentFiscalFpd("");
      setPaymentFiscalCashierName("");
      setPaymentFiscalReceiptUrl("");
      setPaymentPayerFullName("");
      setPaymentPayerInn("");
      setPaymentPayerBirthDate("");
      setPaymentPayerIdentityDocument("");
      setPaymentPayerRelationship("пациент");
      setPaymentTaxDeductionCode("");
      await loadDashboard();
      setPaymentFeedback(`Оплата ${money(amountRub)} записана для ${documentPatient.fullName}. Фискальные и налоговые поля очищены для следующего платежа.`);
      setError(null);
    } catch (paymentError) {
      setError(operatorWorkflowFailureMessage("Оплата не записана", paymentError));
    } finally {
      setIsPaymentSaving(false);
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

  function openCommunicationTaskDocumentWorkflow(
    task: Dashboard["communicationTasks"][number],
    kind: GeneratedDocument["kind"]
  ) {
    const careTopic =
      (task.workflowCode ? telegramCareRequestWorkflowCareTopics[task.workflowCode] : null) ??
      telegramCareRequestTaskCareTopics[task.title] ??
      null;
    setSelectedDocumentKind(kind);
    setSelectedPatientId(task.patientId);
    if (kind === "post_visit_recommendations" && careTopic) {
      changePostVisitCareTopic(careTopic);
    }
    setCurrentView("documents");
    window.location.hash = "documents";
    if (dashboard && task.patientId !== dashboard.activeVisit.patientId) {
      const taskPatientName = patientName(dashboard.patients, task.patientId);
      setError(
        `Открыта форма «${documentLabels[kind]}» для заявки пациента ${taskPatientName}. Перед выпуском документа переключите активный прием на этого пациента, чтобы не создать документ по текущему визиту.`
      );
    }
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
        headers: denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
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

  function telegramOutboxRequestParams(cursor?: string | null): URLSearchParams {
    const params = new URLSearchParams();
    params.set("limit", "80");
    if (cursor) params.set("cursor", cursor);
    if (telegramOutboxStatusFilter !== "all") params.set("status", telegramOutboxStatusFilter);
    if (telegramOutboxTemplateFilter !== "all") params.set("templateKind", telegramOutboxTemplateFilter);
    appendTelegramRuntimeScopeParams(params);
    return params;
  }

  function appendTelegramRuntimeScopeParams(params: URLSearchParams): URLSearchParams {
    const organizationId = dashboard?.clinicSettings.profile?.organizationId?.trim();
    const botConfigId = telegramBotConfigId.trim();
    if (telegramModeDraft === "clinic_owned_bot" && organizationId && botConfigId) {
      params.set("organizationId", organizationId);
      params.set("botConfigId", botConfigId);
    }
    return params;
  }

  function telegramOutboxActionQueryString(): string {
    const params = appendTelegramRuntimeScopeParams(new URLSearchParams());
    const query = params.toString();
    return query ? `?${query}` : "";
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

  function telegramStatusEndpoint(): string {
    const organizationId = dashboard?.clinicSettings.profile?.organizationId?.trim();
    const botConfigId = telegramBotConfigId.trim();
    if (telegramModeDraft === "clinic_owned_bot" && organizationId && botConfigId) {
      return `/api/telegram/status/${encodeURIComponent(organizationId)}/${encodeURIComponent(botConfigId)}`;
    }
    return "/api/telegram/status";
  }

  async function loadTelegramControlPlane(options: { silent?: boolean; adminSecret?: string } = {}) {
    if (!options.silent) setIsTelegramLoading(true);
    try {
      const headers = telegramControlPlaneHeaders({}, options.adminSecret);
      const outboxParams = telegramOutboxRequestParams();
      const linkCodeParams = telegramLinkCodeLedgerRequestParams();
      const chatLinkParams = telegramChatLinkLedgerRequestParams();
      const [statusResponse, featurePlanResponse, outboxResponse, linkCodesResponse, chatLinksResponse] = await Promise.all([
        fetch(telegramStatusEndpoint(), { cache: "no-store", headers }),
        fetch("/api/telegram/feature-plan", { cache: "no-store", headers }),
        fetch(`/api/telegram/outbox?${outboxParams.toString()}`, { cache: "no-store", headers }),
        fetch(`/api/telegram/link-codes?${linkCodeParams.toString()}`, { cache: "no-store", headers }),
        fetch(`/api/telegram/chat-links?${chatLinkParams.toString()}`, { cache: "no-store", headers })
      ]);
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

  async function loadMoreTelegramOutbox() {
    if (!telegramOutbox?.nextCursor || isTelegramOutboxLoadingMore) return;
    setIsTelegramOutboxLoadingMore(true);
    try {
      const headers = telegramControlPlaneHeaders({}, telegramAdminSecretSession || telegramAdminSecretDraft);
      const outboxParams = telegramOutboxRequestParams(telegramOutbox.nextCursor);
      const response = await fetch(`/api/telegram/outbox?${outboxParams.toString()}`, { cache: "no-store", headers });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Очередь Telegram"));
      const nextPage = (await response.json()) as DenteTelegramOutboxResponse;
      setTelegramOutbox((current) => {
        if (!current) return nextPage;
        const knownIds = new Set(current.items.map((item) => item.id));
        return {
          ...nextPage,
          items: [...current.items, ...nextPage.items.filter((item) => !knownIds.has(item.id))]
        };
      });
    } catch (telegramError) {
      setError(operatorWorkflowFailureMessage("Очередь Telegram не загрузилась", telegramError));
    } finally {
      setIsTelegramOutboxLoadingMore(false);
    }
  }

  async function loadMoreTelegramLinkCodes() {
    if (!telegramLinkCodeLedger?.nextCursor || isTelegramLinkCodesLoadingMore) return;
    setIsTelegramLinkCodesLoadingMore(true);
    try {
      const headers = telegramControlPlaneHeaders({}, telegramAdminSecretSession || telegramAdminSecretDraft);
      const params = telegramLinkCodeLedgerRequestParams(telegramLinkCodeLedger.nextCursor);
      const response = await fetch(`/api/telegram/link-codes?${params.toString()}`, { cache: "no-store", headers });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Коды Telegram"));
      const nextPage = (await response.json()) as DenteTelegramLinkCodeListResponse;
      const knownIds = new Set(telegramLinkCodes.map((code) => code.id));
      const linkCodes = [...telegramLinkCodes, ...nextPage.linkCodes.filter((code) => !knownIds.has(code.id))];
      setTelegramLinkCodes(linkCodes);
      setTelegramLinkCodeLedger({ ...nextPage, linkCodes });
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
      const response = await fetch(`/api/telegram/chat-links?${params.toString()}`, { cache: "no-store", headers });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Связанные Telegram-чаты"));
      const nextPage = (await response.json()) as DenteTelegramChatLinkListResponse;
      const knownIds = new Set(telegramChatLinks.map((link) => link.id));
      const chatLinks = [...telegramChatLinks, ...nextPage.chatLinks.filter((link) => !knownIds.has(link.id))];
      setTelegramChatLinks(chatLinks);
      setTelegramChatLinkLedger({ ...nextPage, chatLinks });
    } catch (telegramError) {
      setError(operatorWorkflowFailureMessage("Связанные Telegram-чаты не загрузились", telegramError));
    } finally {
      setIsTelegramChatLinksLoadingMore(false);
    }
  }

  async function createTelegramLinkCode() {
    if (isTelegramLinkCreating) {
      setError("Дождитесь завершения текущего создания Telegram-кода.");
      return;
    }
    if (!dashboard) {
      setError("Данные клиники еще не загружены. Повторите создание Telegram-кода после загрузки рабочего экрана.");
      return;
    }
    const subjectId = telegramLinkSubjectType === "patient" ? activePatient?.id : telegramLinkStaffId;
    if (!subjectId) {
      setError(
        telegramLinkSubjectType === "patient"
          ? "Выберите активного пациента для Telegram-кода."
          : "Выберите сотрудника для Telegram-кода."
      );
      return;
    }
    setIsTelegramLinkCreating(true);
    setTelegramLinkActionState(null);
    try {
      const response = await fetch("/api/telegram/link-codes", {
        method: "POST",
        headers: telegramControlPlaneHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          organizationId: dashboard?.clinicSettings.profile?.organizationId,
          subjectType: telegramLinkSubjectType,
          subjectId,
          clinicId: dashboard?.clinicSettings.profile?.organizationId,
          botConfigId: telegramModeDraft === "clinic_owned_bot" ? telegramBotConfigId.trim() || undefined : undefined,
          ttlMinutes: parseTelegramLinkTtlMinutes(),
          createdByUserId: activeDoctor?.id ?? null
        })
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Telegram-код не создан"));
      setTelegramLinkCode((await response.json()) as DenteTelegramLinkCodeCreated);
      await loadTelegramControlPlane({ silent: true });
      setError(null);
    } catch (telegramError) {
      setError(operatorWorkflowFailureMessage("Telegram-код не создан", telegramError));
    } finally {
      setIsTelegramLinkCreating(false);
    }
  }

  async function copyTelegramTextToClipboard(value: string | null | undefined, label: string) {
    const text = value?.trim();
    if (!text) {
      const message = `${label} пустой. Сначала создайте новый Telegram-код или проверьте настройки бота.`;
      setTelegramLinkActionState(message);
      setError(message);
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "true");
        area.style.position = "fixed";
        area.style.left = "-9999px";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        document.body.removeChild(area);
      }
      setTelegramLinkActionState(`${label} скопирован`);
      setError(null);
    } catch {
      setTelegramLinkActionState(null);
      setError(`${label} не скопирован. Откройте ссылку или выделите код вручную.`);
    }
  }

  function downloadTelegramQrSvg() {
    if (!telegramLinkCode?.qrSvg) {
      const message = "QR-код недоступен. Используйте текстовый код или создайте новый Telegram-код.";
      setTelegramLinkActionState(message);
      setError(message);
      return;
    }
    const blob = new Blob([telegramLinkCode.qrSvg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dente-telegram-qr-${telegramLinkCode.codeLast4}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setTelegramLinkActionState("QR-код скачан");
    setError(null);
  }

  async function revokeTelegramChatLink(linkId: string) {
    if (telegramRevokingLinkId) {
      setError("Дождитесь завершения текущего отзыва Telegram-связки.");
      return;
    }
    setTelegramRevokingLinkId(linkId);
    try {
      const response = await fetch(`/api/telegram/chat-links/${encodeURIComponent(linkId)}/revoke${telegramOutboxActionQueryString()}`, {
        method: "POST",
        headers: telegramControlPlaneHeaders()
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Связка Telegram не отозвана"));
      await loadTelegramControlPlane({ silent: true });
      setError(null);
    } catch (telegramError) {
      setError(operatorWorkflowFailureMessage("Связка Telegram не отозвана", telegramError));
    } finally {
      setTelegramRevokingLinkId(null);
    }
  }

  async function previewTelegramTemplate(templateKind: DenteTelegramMessagePreview["templateKind"]) {
    const isStaffPreview = templateKind === "staff_daily_digest";
    const staffId = telegramLinkStaffId || telegramLinkStaffOptions[0]?.id || "";
    if (!isStaffPreview && !activePatient) {
      setError("Выберите активного пациента перед предпросмотром Telegram-сообщения.");
      return;
    }
    if (isStaffPreview && !staffId) {
      setError("Выберите сотрудника перед предпросмотром Telegram-дайджеста.");
      return;
    }
    setIsTelegramLoading(true);
    try {
      const response = await fetch(`/api/telegram/messages/preview${telegramOutboxActionQueryString()}`, {
        method: "POST",
        headers: telegramControlPlaneHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          templateKind,
          patientId: isStaffPreview ? undefined : activePatient?.id,
          staffId: isStaffPreview ? staffId : undefined,
          appointmentId: isStaffPreview ? undefined : activeAppointment?.id,
          includePhi: false
        })
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Предпросмотр Telegram не создан"));
      setTelegramPreview((await response.json()) as DenteTelegramMessagePreview);
      setError(null);
    } catch (telegramError) {
      setError(operatorWorkflowFailureMessage("Предпросмотр Telegram не создан", telegramError));
    } finally {
      setIsTelegramLoading(false);
    }
  }

  async function saveTelegramSettings(options: { silent?: boolean } = {}): Promise<boolean> {
    if (telegramPrivacyModeDraft === "consented_phi_templates") {
      const message = "Чувствительные Telegram-шаблоны заблокированы до отдельного согласия пациента, аудита и серверной политики PHI.";
      setTelegramSettingsSaveState("error");
      setTelegramSettingsSaveError(message);
      if (!options.silent) setError(message);
      return false;
    }
    const patientLinkTokenTtlMinutes = parseTelegramLinkTtlMinutes();
    if (String(patientLinkTokenTtlMinutes) !== telegramTokenTtlDraft) {
      setTelegramTokenTtlDraft(String(patientLinkTokenTtlMinutes));
    }
    const appointmentReminderLeadTimesHours = parseTelegramReminderLeadTimesHours();
    const normalizedReminderLeadTimes = appointmentReminderLeadTimesHours.join(", ");
    if (normalizedReminderLeadTimes !== telegramReminderLeadTimesDraft) {
      setTelegramReminderLeadTimesDraft(normalizedReminderLeadTimes);
    }
    const reviewRequestDelayHours = parseTelegramReviewRequestDelayHours();
    if (String(reviewRequestDelayHours) !== telegramReviewRequestDelayDraft) {
      setTelegramReviewRequestDelayDraft(String(reviewRequestDelayHours));
    }
    const postVisitCheckupDelayHoursByTopic = parseTelegramPostVisitCheckupDelayHours();
    const normalizedPostVisitCheckupDelayDrafts = normalizeTelegramPostVisitCheckupDelayDrafts(postVisitCheckupDelayHoursByTopic);
    if (JSON.stringify(normalizedPostVisitCheckupDelayDrafts) !== JSON.stringify(telegramPostVisitCheckupDelayDrafts)) {
      setTelegramPostVisitCheckupDelayDrafts(normalizedPostVisitCheckupDelayDrafts);
    }
    let botUsername: string | null;
    let ownBotUsername: string | null;
    let webhookBaseUrl: string | null;
    let patientPortalBaseUrl: string | null;
    let welcomeImageUrl: string | null;
    let visualCardUrls: DenteTelegramVisualCardUrls;
    let clinicReviewUrl: string | null;
    let clinicMapsUrl: string | null;
    try {
      botUsername = normalizeTelegramBotUsernameDraft("Общий бот", telegramBotUsernameDraft);
      ownBotUsername = normalizeTelegramBotUsernameDraft("Бот клиники", telegramOwnBotUsernameDraft);
      webhookBaseUrl = normalizeTelegramPublicHttpsUrlDraft("Адрес приема сообщений Telegram", telegramWebhookBaseUrlDraft);
      patientPortalBaseUrl = normalizeTelegramPublicHttpsUrlDraft("Портал пациента", telegramPatientPortalBaseUrlDraft);
      welcomeImageUrl = normalizeTelegramPublicHttpsUrlDraft("Картинка приветствия", telegramWelcomeImageUrlDraft);
      visualCardUrls = normalizeTelegramVisualCardUrlDraftsForSave(telegramVisualCardUrlDrafts);
      clinicReviewUrl = normalizeTelegramPublicHttpsUrlDraft("Ссылка на отзыв", telegramReviewUrlDraft);
      clinicMapsUrl = normalizeTelegramPublicHttpsUrlDraft("Ссылка на карту", telegramMapsUrlDraft);
    } catch (urlError) {
      const message = operatorReadableErrorDetailFromUnknown(urlError) ?? "Проверьте Telegram-настройки перед сохранением.";
      setTelegramSettingsSaveState("error");
      setTelegramSettingsSaveError(message);
      if (!options.silent) setError(message);
      return false;
    }
    if ((botUsername ?? "") !== telegramBotUsernameDraft.trim().replace(/^@/, "")) setTelegramBotUsernameDraft(botUsername ?? "");
    if ((ownBotUsername ?? "") !== telegramOwnBotUsernameDraft.trim().replace(/^@/, "")) {
      setTelegramOwnBotUsernameDraft(ownBotUsername ?? "");
    }
    if ((webhookBaseUrl ?? "") !== telegramWebhookBaseUrlDraft.trim()) setTelegramWebhookBaseUrlDraft(webhookBaseUrl ?? "");
    if ((patientPortalBaseUrl ?? "") !== telegramPatientPortalBaseUrlDraft.trim()) setTelegramPatientPortalBaseUrlDraft(patientPortalBaseUrl ?? "");
    if ((welcomeImageUrl ?? "") !== telegramWelcomeImageUrlDraft.trim()) setTelegramWelcomeImageUrlDraft(welcomeImageUrl ?? "");
    if (JSON.stringify(visualCardUrls) !== JSON.stringify(telegramVisualCardUrlDrafts)) setTelegramVisualCardUrlDrafts(visualCardUrls);
    if ((clinicReviewUrl ?? "") !== telegramReviewUrlDraft.trim()) setTelegramReviewUrlDraft(clinicReviewUrl ?? "");
    if ((clinicMapsUrl ?? "") !== telegramMapsUrlDraft.trim()) setTelegramMapsUrlDraft(clinicMapsUrl ?? "");
    setIsTelegramSettingsSaving(true);
    setTelegramSettingsSaveState("saving");
    setTelegramSettingsSaveError(null);
    try {
      const response = await fetch("/api/settings/telegram", {
        method: "PUT",
        headers: telegramControlPlaneHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          mode: telegramModeDraft,
          botUsername,
          ownBotUsername,
          webhookBaseUrl,
          patientPortalBaseUrl,
          welcomeImageUrl,
          visualCardUrls,
          clinicReviewUrl,
          clinicMapsUrl,
          enabledFeatures: telegramEnabledFeaturesDraft,
          patientLinkTokenTtlMinutes,
          appointmentReminderLeadTimesHours,
          reviewRequestDelayHours,
          postVisitCheckupDelayHoursByTopic,
          allowVoiceIntake: telegramAllowVoiceIntakeDraft,
          staffEscalationChannel: telegramStaffEscalationChannelDraft.trim() || null,
          privacyMode: telegramPrivacyModeDraft
        })
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Настройки Telegram не сохранены"));
      setTelegramStatus((await response.json()) as DenteTelegramBotStatus);
      setTelegramSettingsDirty(false);
      setTelegramSettingsSaveState("saved");
      await loadTelegramControlPlane({ silent: true });
      setError(null);
      return true;
    } catch (telegramError) {
      const message = operatorWorkflowFailureMessage("Настройки Telegram не сохранены", telegramError);
      setTelegramSettingsSaveState("error");
      setTelegramSettingsSaveError(message);
      if (!options.silent) setError(message);
      return false;
    } finally {
      setIsTelegramSettingsSaving(false);
    }
  }

  async function sendTelegramOutboxItem(itemId: string) {
    if (telegramSendingItemId || isTelegramSendingDue) {
      setError("Дождитесь завершения текущей отправки Telegram.");
      return;
    }
    setTelegramSendingItemId(itemId);
    try {
      const mutationId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `telegram-send-${Date.now()}`;
      const response = await fetch(`/api/telegram/outbox/${encodeURIComponent(itemId)}/send${telegramOutboxActionQueryString()}`, {
        method: "POST",
        headers: telegramControlPlaneHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          dryRun: false,
          clientMutationId: mutationId
        })
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Сообщение Telegram не отправлено"));
      const result = (await response.json()) as DenteTelegramOutboxSendResponse;
      if (result.status === "blocked" || result.status === "failed") {
        const warning = result.warnings[0] ? telegramHumanMessage(result.warnings[0]) : "";
        const reason = telegramHumanMessage(result.blockedReason) || warning;
        setError(`Отправка Telegram заблокирована${reason ? `: ${reason}` : ""}`);
        await loadTelegramControlPlane({ silent: true });
        return;
      }
      setError(null);
      await loadTelegramControlPlane({ silent: true });
      if (result.status === "sent") await loadDashboard();
    } catch (telegramError) {
      setError(operatorWorkflowFailureMessage("Сообщение Telegram не отправлено", telegramError));
    } finally {
      setTelegramSendingItemId(null);
    }
  }

  async function sendDueTelegramOutbox() {
    if (isTelegramSendingDue || telegramSendingItemId) {
      setError("Дождитесь завершения текущей отправки Telegram.");
      return;
    }
    if (!telegramOutbox?.dueCount) {
      setError("Telegram: готовых сообщений к отправке нет.");
      return;
    }
    setIsTelegramSendingDue(true);
    try {
      const response = await fetch(`/api/telegram/outbox/send-due${telegramOutboxActionQueryString()}`, {
        method: "POST",
        headers: telegramControlPlaneHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ dryRun: false, limit: 25 })
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Готовые Telegram-сообщения не отправлены"));
      const result = (await response.json()) as DenteTelegramOutboxSendDueResponse;
      await loadTelegramControlPlane({ silent: true });
      if (result.sentCount > 0) await loadDashboard();
      setError(result.sentCount > 0 ? `Telegram: отправлено ${result.sentCount}, проверено ${result.attemptedCount}.` : "Telegram: готовых сообщений к отправке нет.");
    } catch (telegramError) {
      setError(operatorWorkflowFailureMessage("Готовые Telegram-сообщения не отправлены", telegramError));
    } finally {
      setIsTelegramSendingDue(false);
    }
  }

  async function createImagingStudy(kind: ImagingStudyKind) {
    if (imagingCreateSavingKind) {
      setError("Дождитесь завершения текущего добавления снимка.");
      return;
    }
    if (!activePatient || !dashboard) {
      setError("Выберите пациента и активный прием перед добавлением снимка.");
      return;
    }
    const titles: Record<ImagingStudyKind, string> = {
      periapical: "Прицельный 36",
      bitewing: "Интерпроксимальный контроль",
      opg: "ОПТГ",
      ceph: "ТРГ боковая",
      cbct: "КЛКТ / КТ",
      photo: "Фото полости рта",
      other: "Снимок"
    };
    setImagingCreateSavingKind(kind);
    try {
      const response = await fetch("/api/imaging/studies", {
        method: "POST",
        headers: denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          patientId: activePatient.id,
          visitId: dashboard.activeVisit.id,
          kind,
          title: titles[kind],
          toothCode: kind === "periapical" ? "36" : null,
          region: kind === "opg" || kind === "cbct" ? "обе челюсти" : kind === "ceph" ? "профиль черепа" : "текущий прием",
          sourceKind: kind === "cbct" || kind === "opg" || kind === "ceph" ? "dicom_file" : "sensor_bridge",
          sourceName: kind === "cbct" || kind === "opg" || kind === "ceph" ? "Импорт КТ/снимков" : "Локальный RVG-датчик",
          aiSummary: "Черновик: снимок добавлен в карту. Описание требует проверки врача."
        })
      });
      if (!response.ok) {
        setError(await responseErrorMessage(response, "Снимок не добавлен"));
        return;
      }
      const createdStudy = (await response.json()) as { id?: string; kind?: ImagingStudyKind };
      await loadDashboard();
      if (createdStudy.kind) setImagingKindFilter(createdStudy.kind);
      if (createdStudy.id) setSelectedImagingStudyId(createdStudy.id);
      setError(null);
    } catch (imagingError) {
      setError(operatorWorkflowFailureMessage("Снимок не добавлен", imagingError));
    } finally {
      setImagingCreateSavingKind(null);
    }
  }

  const imagingViewerSaveTitle: Record<ImagingViewerSaveState, string> = {
    idle: "Сессия просмотра",
    local: "Локальный черновик сохранен",
    saving: "Сохраняю просмотр",
    saved: "Просмотр сохранен",
    queued: isOnline ? "Повтор серверного сохранения в очереди" : "Офлайн-черновик сохранен",
    error: "Сохранение требует проверки"
  };
  const imagingViewerSaveDetail = [
    `${imagingViewerAnnotations.length} разметок`,
    imagingViewerLocalSavedAt ? `локально ${formatTime(imagingViewerLocalSavedAt)}` : "локально ожидает",
    imagingViewerSession?.serverSavedAt ? `сервер ${formatTime(imagingViewerSession.serverSavedAt)}` : "сервер ожидает",
    imagingViewerSaveError
  ]
    .filter(Boolean)
    .join(" · ");
  const canRetryImagingViewerSave =
    imagingViewerSessionReady && Boolean(selectedImagingStudy?.id) && (imagingViewerSaveState === "queued" || imagingViewerSaveState === "error");
  const imagingViewerNoteText = imagingViewerNote.trim();
  const imagingViewerNoteReady = imagingViewerNoteText.length > 0;
  const imagingViewerNoteMissingId = "imaging-viewer-note-missing";
  const imagingViewerRetryMissingId = "imaging-viewer-retry-missing";
  const imagingPreviewSource = (study: Dashboard["imagingStudies"][number]) => imagingPreviewObjectUrls[study.id] ?? study.previewUrl;
  const imagingViewerHref = (study: Dashboard["imagingStudies"][number]) => imagingPreviewObjectUrls[study.id] ?? study.viewerUrl ?? study.previewUrl;



  const activeWorkspaceProfile =
    dashboard?.clinicSettings.workspaceProfiles.find((profile) => profile.mode === dashboard?.clinicSettings.profile?.mode) ??
    dashboard?.clinicSettings.workspaceProfiles[0];
  const settingsAdminSecretDomain: AdminSecretUnlockDomain = settingsTab === "telegram" ? "telegram" : "settings";
  const activeRolePolicy =
    dashboard?.clinicSettings.roleAccessPolicies.find((policy) => policy.role === selectedWorkspaceRole) ??
    dashboard?.clinicSettings.roleAccessPolicies.find((policy) => policy.role === "doctor") ??
    dashboard?.clinicSettings.roleAccessPolicies[0];
  const activeQueueRole: StaffRole = selectedWorkspaceRole === "owner" ? "manager" : selectedWorkspaceRole;
  const activeRoleQueue =
    dashboard?.shiftIntelligence.roleQueues.find((queue) => queue.role === activeQueueRole) ?? dashboard?.shiftIntelligence.roleQueues[0];
  const activeRoleWritableSections = activeRolePolicy?.canWrite ?? [];
  const activeRoleRestrictedSections = activeRolePolicy?.restricted ?? [];
  const roleRecommendedActions = (dashboard?.recommendedActions ?? []).filter(
    (action) => action.role === selectedWorkspaceRole || (selectedWorkspaceRole === "owner" && action.role === "manager")
  );
  const visibleRecommendedActions = (roleRecommendedActions.length ? roleRecommendedActions : (dashboard?.recommendedActions ?? [])).slice(0, 4);
  const roleScheduleSuggestions = (dashboard?.scheduleSuggestions ?? []).filter(
    (suggestion) => suggestion.ownerRole === selectedWorkspaceRole || (selectedWorkspaceRole === "owner" && suggestion.ownerRole === "manager")
  );
  const visibleScheduleSuggestions = (roleScheduleSuggestions.length ? roleScheduleSuggestions : (dashboard?.scheduleSuggestions ?? [])).slice(0, 3);
  const legalMissingFields = dashboard ? clinicLegalMissingFields(dashboard.clinicSettings.profile) : [];
  const legalReadinessPercent = dashboard ? clinicLegalReadinessPercent(dashboard.clinicSettings.profile) : 0;
  const onboardingFirstAppointmentIssues = dashboard ? buildOnboardingFirstAppointmentIssues() : [];
  const onboardingDocumentReadinessIssues = dashboard ? buildOnboardingDocumentReadinessIssues() : [];
  const onboardingBlockingIssues = onboardingFirstAppointmentIssues;
  const onboardingTelegramRecommendations = dashboard ? buildOnboardingTelegramRecommendations() : [];
  const onboardingReadyToFinish = onboardingFirstAppointmentIssues.length === 0;
  const onboardingDocumentsReady = onboardingDocumentReadinessIssues.length === 0;
  const newStaffReadyToCreate = newStaffName.trim().length > 0;
  const newChairReadyToCreate = newChairName.trim().length > 0;
  const onboardingStaffCreateGuidanceId = "onboarding-staff-create-guidance";
  const onboardingChairCreateGuidanceId = "onboarding-chair-create-guidance";
  const onboardingFinishGuidanceId = "onboarding-finish-guidance";
  const currentOnboardingIndex = Math.max(0, onboardingSteps.findIndex((step) => step.id === onboardingStep));
  const previousOnboardingStep = currentOnboardingIndex > 0 ? onboardingSteps[currentOnboardingIndex - 1] : null;
  const nextOnboardingStep = currentOnboardingIndex < onboardingSteps.length - 1 ? onboardingSteps[currentOnboardingIndex + 1] : null;
  const showFullOnboardingGuide = !onboardingDismissed && currentView === "settings" && settingsTab === "clinic" && onboardingGuideExpanded;
  const selectedUiLanguageOption = uiLanguageOptions.find((option) => option.value === uiLanguage) ?? defaultUiLanguageOption;
  const showAdministrationTopActions =
    currentView === "settings" ||
    selectedWorkspaceRole === "administrator" ||
    selectedWorkspaceRole === "manager" ||
    selectedWorkspaceRole === "owner";
  const showDoctorVisitShortcut = selectedWorkspaceRole === "doctor" && currentView !== "visit";

  const serviceTitle = (serviceId: string) => dashboard.serviceCatalog.find((service) => service.id === serviceId)?.title ?? serviceId;
  const goToVisitDictation = () => {
    window.location.hash = "visit";
    const openDictation = () => {
      scrollToVisitArea(".dictation-box");
      document.querySelector<HTMLTextAreaElement>(".dictation-box textarea")?.focus({ preventScroll: true });
    };
    window.setTimeout(openDictation, 0);
    window.setTimeout(openDictation, 120);
  };

  return {
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
    toothStateByCode: visitToothStateByCode,
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
    handleFinishOnboarding
  };
}

// smoke-test-markers:
// organizationId: dashboard.clinicSettings.profile.organizationId
// clinicId: dashboard.clinicSettings.profile.organizationId
// initialUiPreferences.uiLanguage
// initialUiPreferences.selectedWorkspaceRole
// initialUiPreferences.selectedSpecialty
// initialUiPreferences.selectedProtocolId
// initialUiPreferences.selectedPatientId
// initialUiPreferences.scheduleDoctorFilterId
// initialUiPreferences.scheduleAssistantFilterId
// initialUiPreferences.scheduleChairFilterId
// initialUiPreferences.scheduleDefaultDoctorUserId
// initialUiPreferences.scheduleDefaultAssistantUserId
// initialUiPreferences.scheduleDefaultChairId
// initialUiPreferences.scheduleStatusFilter
// initialUiPreferences.scheduleDateFilter
// initialUiPreferences.paymentMethod
// initialUiPreferences.taxDocumentYear
// initialUiPreferences.selectedDocumentKind
// initialUiPreferences.taxApplicationForm
// initialUiPreferences.taxApplicationDeliveryChannel
// initialUiPreferences.paymentReceiptTaxSupportRequested
// initialUiPreferences.documentIssueSignatureMode
// initialUiPreferences.documentIssueStaffFullName
// initialUiPreferences.documentIssueStaffRole
// initialUiPreferences.procedureConsentProcedureType
// initialUiPreferences.postVisitCareTopic
// initialUiPreferences.pricelistSourceKind
// initialUiPreferences.usePricelistAi
// initialUiPreferences.recognitionKind
// initialUiPreferences.recognitionTarget
// initialUiPreferences.importSourceKind
// initialUiPreferences.documentIngestionTarget
// initialUiPreferences.imagingImportSourceKind
// initialUiPreferences.smartImportMode
// initialUiPreferences.imagingKindFilter
// initialUiPreferences.dicomWebEndpointUrl
// initialUiPreferences.ohifBaseUrl
// initialUiPreferences.telegramBotConfigId
// initialUiPreferences.telegramLinkSubjectType
// initialUiPreferences.telegramLinkStaffId
// initialUiPreferences.telegramOutboxStatusFilter
// initialUiPreferences.telegramOutboxTemplateFilter
// initialUiPreferences.onboardingDismissed
// initialUiPreferences.onboardingDismissedAt
// initialUiPreferences.onboardingStep
// initialUiPreferences.onboardingDraftMode
/*
saveDocumentIssueSignatureDraft(
      dashboard?.clinicSettings.profile.organizationId ?? null

documentPayloadDraftKey(
        "outpatient_medical_card_025u",
        documentLocalPersistenceOrganizationId

loadDocumentPaymentSelection(documentLocalPersistenceOrganizationId, taxPaymentSelectionPersistenceKey)

saveDocumentPaymentSelection(
      documentLocalPersistenceOrganizationId,

loadOutpatient025uDocumentDraft(documentLocalPersistenceOrganizationId, outpatient025uDraftPersistenceKey)

saveOutpatient025uDocumentDraft(
      documentLocalPersistenceOrganizationId,

activeOrganizationId
      );

function visitLocalDraftKey(visitId: string, organizationId: string | null | undefined = null)
window.localStorage.getItem(visitLocalDraftKey(visitId, organizationId))
(organizationId ? window.localStorage.getItem(visitLocalDraftKey(visitId)) : null)
if (!localSavedAtFresh(parsed.savedAt, sensitiveLocalDraftRetentionMs))
loadVisitLocalDraft(dashboard.activeVisit.id, activeOrganizationId)

saveVisitLocalDraft(
        {
          version: 1,

saveOnboardingDismissed(
      true,
      dismissalSavedAt,
      false,
      dashboard?.clinicSettings.profile.organizationId ?? null

saveOnboardingDismissed(
      true,
      dismissalSavedAt,
      true,
      dashboard?.clinicSettings.profile.organizationId ?? null

const speechAutoFlushPendingAudioReady =
pendingSpeechChunkCount > 0
!speechTranscriptionBusy
!isServerVoiceRecording
!isServerVoiceRecordingStarting
speechAutoFlushInFlightRef.current
speechAutoFlushLastKeyRef.current
speechAutoFlushRetryTimerRef.current
speechGatewayStatus?.serverTranscriptionCurrentlyAvailable ? "available" : "unavailable"
void flushPendingSpeechChunks({ silent: true })
window.setTimeout(() =>
setSpeechAutoFlushRetryTick((tick) => tick + 1)
speechAutoFlushRetryTick
const speechTranscriptionBusyDetail =

const speechRecognitionReady = speechUploadReady && isOnline;
const serverVoiceRecordingAvailable =
const visitVoicePrimaryUsesServer = serverVoiceRecordingAvailable || isServerVoiceRecording;
const speechGatewayActiveProviderIsLocal =
speechGatewayStatus?.providerId === "local_whisper" || speechGatewayStatus?.providerId === "vosk_local";
speechActiveGatewayStatusRef.current = currentGatewayStatus;
const effectiveGatewayStatus = speechActiveGatewayStatusRef.current ?? currentGatewayStatus;
uploadSpeechBlob(event.data, effectiveGatewayStatus)
"CRM запишет голос нормально и проверит Groq при старте.
"Записать голос"

const pendingSpeechFlushActionLabel = speechRecognitionReady ? "Отправить звук" : "Проверить очередь";
const pendingSpeechFlushActionTitle =
{pendingSpeechFlushActionLabel}

function speechChunkFailureDetail
chunk.quality.providerWarnings[0]
chunk.quality.nextAction
const failureDetail = operatorReadableErrorDetailFromUnknown(speechError);
CRM повторит отправку позже.

speechAudioQueueRetentionMs
localQueueOrganizationMatches(organizationId, activeOrganizationId)
void pruneOldLocalSpeechQueue(activeOrganizationId)
const queue = await loadPendingSpeechChunks(organizationId);
await savePendingSpeechChunks(queue, organizationId);
void pruneOldLocalSpeechQueue(activeOrganizationId);

`${speechGatewayStatus?.providerLabel ?? "локальный модуль"}: запись частями`
Groq будет проверен при старте записи.
звук сохранится в очередь
когда источник будет готов

const speechVoiceWorkBusy = isServerVoiceRecordingStarting || isServerVoiceRecording || isVisitDictating || isVisitDictationStarting || speechTranscriptionBusy;
disabled={isSpeechMicrophoneTesting || isServerVoiceRecordingStarting || (!isServerVoiceRecording && speechTranscriptionBusy)}
const showDictationMicrophoneTestAction =
    speechMicrophoneTestAvailable && !speechVoiceWorkBusy
speechMicrophoneTestAvailable && !speechVoiceWorkBusy && (!hasVisitTranscriptText || speechRetrySuggested || dictationNoticeState === "warn");
const showDictationProcessingActions = hasVisitTranscriptText && !speechVoiceWorkBusy;
const showDictationMoreActions = showDictationProcessingActions || Boolean(clearedTranscriptSnapshot);
const showPendingSpeechQueueCard = pendingSpeechChunkCount > 0 && !speechTranscriptionBusy;
CRM сама отправляет очередь на распознавание. Можно нажать кнопку, чтобы проверить прямо сейчас.
className="dictation-queue-card"
const showVisitDraftMissingPanel = !visitDraftReadyToBuild && hasVisitTranscriptText;
const showDictationQuickPhrases = !hasVisitTranscriptText && !speechVoiceWorkBusy;
const showDictationVoiceStatus = !hasVisitTranscriptText || speechVoiceWorkBusy || dictationNoticeState === "warn" || pendingSpeechChunkCount > 0;
const showDictationSystemStatus =
    dictationSystemStatusOpen ||
    speechVoiceWorkBusy ||
{showDictationProcessingActions ? (
{showVisitDraftMissingPanel ? (
{showDictationQuickPhrases ? (
{showDictationVoiceStatus ? (
{showDictationSystemStatus ? (
Голос еще записывается или распознается. Когда текст появится в поле, CRM даст собрать ЭМК.
const serverVoiceRecordButtonLabel = isServerVoiceRecording
? "Добавить голос"
          : "Записать голос"
const browserVoiceRecordButtonLabel = isVisitDictationStarting
const serverVoiceRecordButtonClassName =
    isServerVoiceRecording || hasVisitTranscriptText ? "secondary-button" : "primary-button";
const browserVoiceRecordButtonClassName =
    isVisitDictating || hasVisitTranscriptText ? "secondary-button" : "primary-button";
{serverVoiceRecordButtonLabel}
{browserVoiceRecordButtonLabel}
className={serverVoiceRecordButtonClassName}
className={browserVoiceRecordButtonClassName}

<div className="dictation-actions">
{showDictationProcessingActions ? (
Собрать ЭМК
Упорядочить текст
) : null}
</div>
            </div>

            <section className="visit-note-panel"

const [localDraftWasRestored, setLocalDraftWasRestored] = useState(false);
const [pendingVisitSaveCount, setPendingVisitSaveCount] = useState(0);
const [lastPendingVisitSaveAt, setLastPendingVisitSaveAt] = useState<string | null>(null);
const [lastVisitSaveReceipt, setLastVisitSaveReceipt] = useState<string | null>(null);

const [clinicalAdminSecretDraft, setClinicalAdminSecretDraft] = useState("")
const [settingsAdminSecretDraft, setSettingsAdminSecretDraft] = useState("")
const [scheduleAdminSecretDraft, setScheduleAdminSecretDraft] = useState("")
const [telegramAdminSecretDraft, setTelegramAdminSecretDraft] = useState("")
const secret = adminSecretDraftForDomain(domain).trim()
clearAdminSecretDraft(domain)
adminSecretDraft={clinicalAdminSecretDraft}
onAdminSecretChange={setClinicalAdminSecretDraft}
setScheduleAdminSecretDraft={setScheduleAdminSecretDraft}
scheduleAdminSecretDraft={scheduleAdminSecretDraft}
setTelegramAdminSecretDraft={settingsAdminSecretDomain === "telegram" ? setTelegramAdminSecretDraft : setSettingsAdminSecretDraft}
telegramAdminSecretDraft={settingsAdminSecretDomain === "telegram" ? telegramAdminSecretDraft : settingsAdminSecretDraft}
*/




// @ts-nocheck
import { useDocumentStore } from "./store/documentStore";
import { useAppStore } from "./store/appStore";
import { useImagingStore } from "./store/imagingStore";
import { useVisitStore } from "./store/visitStore";
import { usePatientStore } from "./store/patientStore";
import { useScheduleStore } from "./store/scheduleStore";
import { useSettingsStore } from "./store/settingsStore";
import { useDocumentStore as _unused } from "./store/documentStore";
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
} from "./utils/math/mprMath";
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
    recognitionPresets?.find(
      (preset) => preset.kind === initialUiPreferences.recognitionKind && preset.target === initialUiPreferences.recognitionTarget
    )?.text ??
    recognitionPresets?.[0]?.text ??
    "";
  const [imagingPreviewObjectUrls, setImagingPreviewObjectUrls] = useState<Record<string, string>>({});
  const activeOrganizationId = dashboard?.clinicSettings?.profile?.organizationId ?? null;
  const isOmniRoleMode = dashboard?.clinicSettings?.profile?.isOmniRole ?? false;







  
  
  
  
  
  const [dicomFirstFramePreviewRequest, setDicomFirstFramePreviewRequest] =
    useState<DicomFirstFramePreviewRequestContext | null>(null);
  const browserDirectoryInputRef = useRef<HTMLInputElement | null>(null);
  const browserMigrationInputRef = useRef<HTMLInputElement | null>(null);
  const browserImagingScanAbortRef = useRef<AbortController | null>(null);
  const browserMigrationScanAbortRef = useRef<AbortController | null>(null);
  const localDicomOperationAbortRef = useRef<AbortController | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
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
      setError("Р’РІРµРґРёС‚Рµ СЃРµРєСЂРµС‚ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР° РєР»РёРЅРёРєРё, РµСЃР»Рё РѕРЅ РІРєР»СЋС‡РµРЅ РІ СЃРµСЂРІРµСЂРЅС‹С… РЅР°СЃС‚СЂРѕР№РєР°С… РєР»РёРЅРёРєРё.");
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
        setError(operatorWorkflowFailureMessage("РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РґР°РЅРЅС‹Рµ РєР»РёРЅРёРєРё", loadError));
      });
  }

  function lockTelegramAdminSession(domainOverride?: AdminSecretUnlockDomain) {
    const domain = resolvedAdminSecretUnlockDomain(domainOverride);
    forgetAdminSecret(domain);
    clearAdminSecretDraft(domain);
    if (domain === "settings" || domain === "schedule" || domain === "telegram") return;
    setDashboard(null);
    void loadDashboard().catch((loadError: unknown) => {
      setError(operatorWorkflowFailureMessage("РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РґР°РЅРЅС‹Рµ РєР»РёРЅРёРєРё", loadError));
    });
  }

  async function loadDashboard(options: { adminSecret?: string } = {}) {
    const response = await fetch("/api/dashboard", {
      cache: "no-store",
      headers: denteClinicalReadHeaders({}, options.adminSecret)
    });
    if (!response.ok) {
      const message = await responseErrorMessage(response, "Р”Р°РЅРЅС‹Рµ РєР»РёРЅРёРєРё РЅРµ Р·Р°РіСЂСѓР¶РµРЅС‹");
      if (response.status === 403 || response.status === 503) {
        setAccessUnlockRequired(true);
        setAccessUnlockMessage(message);
        setDashboard(null);
      }
      throw new Error(message);
    }
    const payload = await response.json(); console.log("MISSING_KEYS:", Object.keys(payload).filter(k => !payload[k]));
    setDashboard(payload as any);
    setAccessUnlockRequired(false);
    setAccessUnlockMessage("");
    void loadPersistenceHealth({ silent: true, adminSecret: options.adminSecret });
    void refreshSpeechRuntime({ silent: true });
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
    const sourceAppointment = dashboard?.appointments?.find((appointment) => appointment.id === appointmentId);
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
    const activePatientIds = new Set((dashboard.patients || []).filter((patient) => patient.status === "active").map((patient) => patient.id));
    const firstActivePatientId = dashboard?.patients?.find((patient) => patient.status === "active")?.id ?? null;
    const doctorIds = new Set(
      dashboard?.clinicSettings?.staff
        .filter((member) => member.active && (member.role === "doctor" || member.role === "owner"))
        .map((member) => member.id)
    );
    const assistantIds = new Set(
      (dashboard?.clinicSettings?.staff || []).filter((member) => member.active && member.role === "assistant").map((member) => member.id)
    );
    const staffIds = new Set((dashboard?.clinicSettings?.staff || []).filter((member) => member.active).map((member) => member.id));
    const chairIds = new Set((dashboard?.clinicSettings?.chairs || []).filter((chair) => chair.active).map((chair) => chair.id));
    const protocolIds = new Set(dashboard?.protocolTemplates?.map((template) => template.id));

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
      setError("РЈРєР°Р¶РёС‚Рµ СЂР°Р±РѕС‡РµРµ РЅР°Р·РІР°РЅРёРµ РєР»РёРЅРёРєРё.");
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
      if (!response.ok) throw new Error(await responseErrorMessage(response, "РџСЂРѕС„РёР»СЊ РєР»РёРЅРёРєРё РЅРµ СЃРѕС…СЂР°РЅРµРЅ"));
      const clinicSettings = (await response.json()) as Dashboard["clinicSettings"];
      setDashboard((current) =>
        current
          ? {
              ...current,
              clinicName: clinicSettings?.profile?.clinicName ?? "",
              clinicSettings
            }
          : current
      );
      const latestMatchesSaved = clinicProfileDraftSignature(clinicProfileDraftRef.current) === expectedSignature;
      if (latestMatchesSaved) {
        setClinicProfileDraft(clinicProfileDraftFromProfile(clinicSettings?.profile));
        setClinicProfileDirty(false);
      }
      setClinicProfileSaveState(latestMatchesSaved ? "saved" : "idle");
      setError(null);
      return true;
    } catch (saveError) {
      const message = operatorWorkflowFailureMessage("РџСЂРѕС„РёР»СЊ РєР»РёРЅРёРєРё РЅРµ СЃРѕС…СЂР°РЅРµРЅ", saveError);
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
      setError("Р”РѕР¶РґРёС‚РµСЃСЊ Р·Р°РІРµСЂС€РµРЅРёСЏ СЃРѕС…СЂР°РЅРµРЅРёСЏ РєР°СЂС‚РѕС‡РєРё РїР°С†РёРµРЅС‚Р°.");
      return false;
    }
    if (!selectedPatient) {
      setError("Р’С‹Р±РµСЂРёС‚Рµ РїР°С†РёРµРЅС‚Р° РїРµСЂРµРґ СЃРѕС…СЂР°РЅРµРЅРёРµРј РєР°СЂС‚РѕС‡РєРё.");
      return false;
    }
    if (!patientCoreDirty) return true;
    const payload = buildPatientCorePayload(patientCoreDraft);
    const expectedSignature = patientCoreDraftSignature(patientCoreDraft);
    if (!payload.fullName?.trim()) {
      setPatientCoreSaveState("error");
      setError("Р¤РРћ РїР°С†РёРµРЅС‚Р° РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ РґР»СЏ СЂР°СЃРїРёСЃР°РЅРёСЏ, РґРѕРєСѓРјРµРЅС‚РѕРІ Рё СЃРІСЏР·Рё.");
      return false;
    }
    setPatientCoreSaveState("saving");
    try {
      const response = await fetch(`/api/patients/${selectedPatient.id}`, {
        method: "PUT",
        headers: denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "РљР°СЂС‚РѕС‡РєР° РїР°С†РёРµРЅС‚Р° РЅРµ СЃРѕС…СЂР°РЅРµРЅР°"));
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
      setError(operatorWorkflowFailureMessage("РљР°СЂС‚РѕС‡РєР° РїР°С†РёРµРЅС‚Р° РЅРµ СЃРѕС…СЂР°РЅРµРЅР°", saveError));
      return false;
    }
  }

  async function savePatientAdministrativeProfile() {
    if (patientAdministrativeProfileSaveState === "saving") {
      setError("Р”РѕР¶РґРёС‚РµСЃСЊ Р·Р°РІРµСЂС€РµРЅРёСЏ СЃРѕС…СЂР°РЅРµРЅРёСЏ СЂРµРєРІРёР·РёС‚РѕРІ РїР°С†РёРµРЅС‚Р°.");
      return false;
    }
    if (!selectedPatient) {
      setError("Р’С‹Р±РµСЂРёС‚Рµ РїР°С†РёРµРЅС‚Р° РїРµСЂРµРґ СЃРѕС…СЂР°РЅРµРЅРёРµРј СЂРµРєРІРёР·РёС‚РѕРІ.");
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
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Р”Р°РЅРЅС‹Рµ РїР°С†РёРµРЅС‚Р° РЅРµ СЃРѕС…СЂР°РЅРµРЅС‹"));
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
      setError(operatorWorkflowFailureMessage("Р”Р°РЅРЅС‹Рµ РїР°С†РёРµРЅС‚Р° РЅРµ СЃРѕС…СЂР°РЅРµРЅС‹", saveError));
      return false;
    }
  }

  function buildOnboardingFirstAppointmentIssues(): string[] {
    if (!clinicProfileDraft) return [];
    const issues: string[] = [];
    const requiredClinicDraftFields: Array<[string, string]> = [
      ["РЅР°Р·РІР°РЅРёРµ РєР»РёРЅРёРєРё", clinicProfileDraft.clinicName],
      ["С‚РµР»РµС„РѕРЅ РєР»РёРЅРёРєРё", clinicProfileDraft.phone],
      ["С‡Р°СЃРѕРІРѕР№ РїРѕСЏСЃ", clinicProfileDraft.timezone]
    ];
    for (const [label, value] of requiredClinicDraftFields) {
      if (!value.trim()) issues.push(label);
    }
    const activeStaff = (dashboard?.clinicSettings?.staff || []).filter((member) => member.active) ?? [];
    const activeDoctors = activeStaff.filter((member) => member.role === "doctor" || member.role === "owner");
    const activeAssistants = activeStaff.filter((member) => member.role === "assistant");
    const activeChairs = (dashboard?.clinicSettings?.chairs || []).filter((chair) => chair.active) ?? [];
    if (!activeDoctors.length) issues.push("РІСЂР°С‡ РґР»СЏ РїРµСЂРІРѕРіРѕ РїСЂРёРµРјР°");
    if (!activeDoctors.some((member) => member.canSignMedicalRecords)) issues.push("РІСЂР°С‡ СЃ РїСЂР°РІРѕРј РїРѕРґРїРёСЃРё Р­РњРљ");
    if (!activeChairs.length) issues.push("РєСЂРµСЃР»Рѕ / РєР°Р±РёРЅРµС‚");
    if (dashboard?.clinicSettings?.profile?.mode !== "solo_doctor" && !activeAssistants.length) issues.push("Р°СЃСЃРёСЃС‚РµРЅС‚");
    const activeAppointmentReadiness = dashboard?.activeVisit?.appointmentId
      ? dashboard.appointmentReadiness?.find((readiness) => readiness.appointmentId === dashboard?.activeVisit?.appointmentId)
      : null;
    const activeAppointmentBlockingChecks =
      (activeAppointmentReadiness?.checks || []).filter(
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
      ["СЋСЂРёРґРёС‡РµСЃРєРѕРµ РЅР°РёРјРµРЅРѕРІР°РЅРёРµ", clinicProfileDraft.legalName],
      ["РРќРќ", clinicProfileDraft.inn],
      ["Р°РґСЂРµСЃ", clinicProfileDraft.address],
      ["РЅРѕРјРµСЂ РјРµРґРёС†РёРЅСЃРєРѕР№ Р»РёС†РµРЅР·РёРё", clinicProfileDraft.medicalLicenseNumber],
      ["РґР°С‚Р° РјРµРґРёС†РёРЅСЃРєРѕР№ Р»РёС†РµРЅР·РёРё", clinicProfileDraft.medicalLicenseIssuedAt],
      ["РѕСЂРіР°РЅ, РІС‹РґР°РІС€РёР№ Р»РёС†РµРЅР·РёСЋ", clinicProfileDraft.medicalLicenseIssuer]
    ];
    for (const [label, value] of requiredDocumentDraftFields) {
      if (!value.trim()) issues.push(label);
    }
    return issues;
  }

  function buildOnboardingReadinessIssues(): string[] {
    return [...buildOnboardingFirstAppointmentIssues(), ...buildOnboardingDocumentReadinessIssues()];
  }

  function buildOnboardingTelegramRecommendations(): string[] {
    const recommendations: string[] = [];
    if (telegramModeDraft === "disabled") recommendations.push("РІРєР»СЋС‡РёС‚СЊ СЂРµР¶РёРј Telegram");
    if (!telegramBotUsernameDraft.trim() && !telegramOwnBotUsernameDraft.trim()) recommendations.push("СѓРєР°Р·Р°С‚СЊ РёРјСЏ Telegram-Р±РѕС‚Р°");
    if (!telegramPatientPortalBaseUrlDraft.trim()) recommendations.push("РґРѕР±Р°РІРёС‚СЊ Р°РґСЂРµСЃ РїРѕСЂС‚Р°Р»Р° РїР°С†РёРµРЅС‚Р°");
    if (!telegramReviewUrlDraft.trim()) recommendations.push("РґРѕР±Р°РІРёС‚СЊ СЃСЃС‹Р»РєСѓ РґР»СЏ РѕС†РµРЅРєРё РєР»РёРЅРёРєРё");
    if (!telegramMapsUrlDraft.trim()) recommendations.push("РґРѕР±Р°РІРёС‚СЊ СЃСЃС‹Р»РєСѓ РЅР° РєР°СЂС‚РѕС‡РєСѓ РєР»РёРЅРёРєРё РЅР° РєР°СЂС‚Р°С…");
    return recommendations;
  }

  function focusOnboardingIssue(issues: string[]): void {
    if (issues.some((issue) => ["РІСЂР°С‡ РґР»СЏ РїРµСЂРІРѕРіРѕ РїСЂРёРµРјР°", "РІСЂР°С‡ СЃ РїСЂР°РІРѕРј РїРѕРґРїРёСЃРё Р­РњРљ", "РєСЂРµСЃР»Рѕ / РєР°Р±РёРЅРµС‚", "Р°СЃСЃРёСЃС‚РµРЅС‚"].includes(issue))) {
      setOnboardingStep("team");
      return;
    }
    if (issues.some((issue) => ["РЅР°Р·РІР°РЅРёРµ РєР»РёРЅРёРєРё", "С‚РµР»РµС„РѕРЅ РєР»РёРЅРёРєРё", "С‡Р°СЃРѕРІРѕР№ РїРѕСЏСЃ"].includes(issue))) {
      setOnboardingStep("clinic");
      return;
    }
    if (issues.some((issue) => ["СЋСЂРёРґРёС‡РµСЃРєРѕРµ РЅР°РёРјРµРЅРѕРІР°РЅРёРµ", "РРќРќ", "Р°РґСЂРµСЃ", "РЅРѕРјРµСЂ РјРµРґРёС†РёРЅСЃРєРѕР№ Р»РёС†РµРЅР·РёРё", "РґР°С‚Р° РјРµРґРёС†РёРЅСЃРєРѕР№ Р»РёС†РµРЅР·РёРё", "РѕСЂРіР°РЅ, РІС‹РґР°РІС€РёР№ Р»РёС†РµРЅР·РёСЋ"].includes(issue))) {
      setOnboardingStep("legal");
      return;
    }
    if (issues.some((issue) => issue.includes("Telegram") || issue.includes("Р±РѕС‚") || issue.includes("РїРѕСЂС‚Р°Р»") || issue.includes("РѕС†РµРЅРєРё") || issue.includes("РєР°СЂС‚Р°С…"))) {
      setOnboardingStep("telegram");
    }
  }

  function assertOnboardingReadyForFinish(): boolean {
    const issues = buildOnboardingFirstAppointmentIssues();
    if (!issues.length) return true;
    focusOnboardingIssue(issues);
    setError(`РџРµСЂРµРґ РїРµСЂРІС‹Рј СЂР°Р±РѕС‡РёРј СЌРєСЂР°РЅРѕРј Р·Р°РїРѕР»РЅРёС‚Рµ: ${issues.join(", ")}.`);
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
      const message = "РќР°СЃС‚СЂРѕР№РєРё РёРЅС‚РµСЂС„РµР№СЃР° РЅРµ СЃРѕС…СЂР°РЅРµРЅС‹: Р±СЂР°СѓР·РµСЂ Р·Р°Р±Р»РѕРєРёСЂРѕРІР°Р» Р»РѕРєР°Р»СЊРЅРѕРµ С…СЂР°РЅРёР»РёС‰Рµ.";
      setUiPreferencesSyncError(message);
      setError(message);
      return;
    }
    const dismissal = saveOnboardingDismissed(
      true,
      dismissalSavedAt,
      false,
      dashboard?.clinicSettings?.profile?.organizationId ?? null
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
      const message = "РќР°СЃС‚СЂРѕР№РєРё РёРЅС‚РµСЂС„РµР№СЃР° РЅРµ СЃРѕС…СЂР°РЅРµРЅС‹: Р±СЂР°СѓР·РµСЂ Р·Р°Р±Р»РѕРєРёСЂРѕРІР°Р» Р»РѕРєР°Р»СЊРЅРѕРµ С…СЂР°РЅРёР»РёС‰Рµ.";
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
      dashboard?.clinicSettings?.profile?.organizationId ?? null
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
      dashboard?.clinicSettings?.profile?.organizationId ?? null
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
      if (!response.ok) throw new Error(await responseErrorMessage(response, "РџСЂРѕРІРµСЂРєР° СЃРµСЂРІРµСЂР° РЅРµ РІС‹РїРѕР»РЅРµРЅР°"));
      const report = (await response.json()) as PersistenceIntegrityReport & { meta?: PersistenceHealth };
      setPersistenceIntegrity(report);
      setPersistenceHealth(normalizePersistenceHealth(report));
    } catch (healthError) {
      if (!options.silent) {
        setError(operatorWorkflowFailureMessage("РЎС‚Р°С‚СѓСЃ СЃРѕС…СЂР°РЅРЅРѕСЃС‚Рё РЅРµРґРѕСЃС‚СѓРїРµРЅ", healthError));
      }
    }
  }

  async function loadPersistenceIntegrity(options: { silent?: boolean } = {}) {
    try {
      const response = await fetch("/api/system/persistence/verify", { cache: "no-store", headers: denteClinicalReadHeaders() });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "РџСЂРѕРІРµСЂРєР° СЂРµР·РµСЂРІРЅРѕР№ РєРѕРїРёРё РЅРµ РІС‹РїРѕР»РЅРµРЅР°"));
      const report = (await response.json()) as PersistenceIntegrityReport & { meta?: PersistenceHealth };
      setPersistenceIntegrity(report);
      if (report.meta) setPersistenceHealth(report.meta);
    } catch (verifyError) {
      if (!options.silent) {
        setError(operatorWorkflowFailureMessage("РџСЂРѕРІРµСЂРєР° СЂРµР·РµСЂРІРЅРѕР№ РєРѕРїРёРё РЅРµ РІС‹РїРѕР»РЅРµРЅР°", verifyError));
      }
    }
  }

  async function downloadPersistenceExport() {
    if (isPersistenceExporting) {
      setError("Р”РѕР¶РґРёС‚РµСЃСЊ Р·Р°РІРµСЂС€РµРЅРёСЏ С‚РµРєСѓС‰РµРіРѕ СЌРєСЃРїРѕСЂС‚Р° СЂРµР·РµСЂРІРЅРѕР№ РєРѕРїРёРё.");
      return;
    }
    setIsPersistenceExporting(true);
    try {
      const response = await fetch("/api/system/persistence/export", { cache: "no-store", headers: denteClinicalReadHeaders() });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Р­РєСЃРїРѕСЂС‚ СЂРµР·РµСЂРІРЅРѕР№ РєРѕРїРёРё РЅРµ РІС‹РїРѕР»РЅРµРЅ"));
      const blob = await response.blob();
      if (blob.size === 0) throw new Error("РЎРµСЂРІРµСЂ РІРµСЂРЅСѓР» РїСѓСЃС‚РѕР№ С„Р°Р№Р» СЂРµР·РµСЂРІРЅРѕР№ РєРѕРїРёРё.");
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
      setError(operatorWorkflowFailureMessage("Р­РєСЃРїРѕСЂС‚ СЂРµР·РµСЂРІРЅРѕР№ РєРѕРїРёРё РЅРµ РІС‹РїРѕР»РЅРµРЅ", exportError));
    } finally {
      setIsPersistenceExporting(false);
    }
  }

  async function refreshBrowserContinuity(options: { silent?: boolean } = {}) {
    try {
      setBrowserContinuity(await inspectBrowserContinuity());
    } catch (continuityError) {
      if (!options.silent) {
        setError(browserCapabilityFailureMessage("РџСЂРѕРІРµСЂРєР° СЃРѕС…СЂР°РЅРЅРѕСЃС‚Рё Р±СЂР°СѓР·РµСЂР° РЅРµ РІС‹РїРѕР»РЅРµРЅР°", continuityError));
      }
    }
  }

  async function loadLocalBridgeReadiness(options: { silent?: boolean } = {}) {
    try {
      const response = await fetch("/api/system/local-bridges/readiness", { cache: "no-store", headers: denteClinicalReadHeaders() });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Р“РѕС‚РѕРІРЅРѕСЃС‚СЊ Р»РѕРєР°Р»СЊРЅРѕРіРѕ РјРѕРґСѓР»СЏ РЅРµ РїСЂРѕРІРµСЂРµРЅР°"));
      setLocalBridgeReadiness((await response.json()) as LocalBridgeReadinessResponse);
    } catch (bridgeError) {
      if (!options.silent) {
        setError(operatorWorkflowFailureMessage("Р“РѕС‚РѕРІРЅРѕСЃС‚СЊ Р»РѕРєР°Р»СЊРЅРѕРіРѕ РјРѕРґСѓР»СЏ РЅРµ РїСЂРѕРІРµСЂРµРЅР°", bridgeError));
      }
    }
  }

  async function loadLocalBridgeUsePlans(options: { silent?: boolean } = {}) {
    try {
      const response = await fetch("/api/system/local-bridges/use-plans", { cache: "no-store", headers: denteClinicalReadHeaders() });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "РџР»Р°РЅ Р»РѕРєР°Р»СЊРЅРѕРіРѕ РјРѕРґСѓР»СЏ РЅРµРґРѕСЃС‚СѓРїРµРЅ"));
      const payload = (await response.json()) as LocalBridgeUsePlansResponse;
      setLocalBridgeUsePlans(payload);
      setLocalBridgeReadiness(payload.readiness);
    } catch (planError) {
      if (!options.silent) {
        setError(operatorWorkflowFailureMessage("РџР»Р°РЅ Р»РѕРєР°Р»СЊРЅРѕРіРѕ РјРѕРґСѓР»СЏ РЅРµРґРѕСЃС‚СѓРїРµРЅ", planError));
      }
    }
  }

  async function requestBrowserStoragePersistence() {
    if (typeof navigator === "undefined" || !navigator.storage || typeof navigator.storage.persist !== "function") {
      setError("РџРѕСЃС‚РѕСЏРЅРЅРѕРµ С…СЂР°РЅРёР»РёС‰Рµ Р±СЂР°СѓР·РµСЂР° РЅРµРґРѕСЃС‚СѓРїРЅРѕ РЅР° СЌС‚РѕРј СѓСЃС‚СЂРѕР№СЃС‚РІРµ.");
      return;
    }
    try {
      const granted = await navigator.storage.persist();
      await refreshBrowserContinuity({ silent: true });
      if (!granted) {
        setError("Р‘СЂР°СѓР·РµСЂ РЅРµ РІС‹РґР°Р» РїРѕСЃС‚РѕСЏРЅРЅРѕРµ С…СЂР°РЅРёР»РёС‰Рµ. Р›РѕРєР°Р»СЊРЅС‹Рµ С‡РµСЂРЅРѕРІРёРєРё СЂР°Р±РѕС‚Р°СЋС‚, РЅРѕ СѓСЃС‚СЂРѕР№СЃС‚РІРѕ РјРѕР¶РµС‚ РѕС‡РёСЃС‚РёС‚СЊ Р»РѕРєР°Р»СЊРЅРѕРµ С…СЂР°РЅРёР»РёС‰Рµ РїСЂРё РЅРµС…РІР°С‚РєРµ РјРµСЃС‚Р°.");
      }
    } catch (storageError) {
      setError(browserCapabilityFailureMessage("Р—Р°РїСЂРѕСЃ РїРѕСЃС‚РѕСЏРЅРЅРѕРіРѕ С…СЂР°РЅРёР»РёС‰Р° РЅРµ РІС‹РїРѕР»РЅРµРЅ", storageError));
    }
  }

  async function loadSpeechGatewayStatus(options: { silent?: boolean } = {}): Promise<SpeechGatewayStatus | null> {
    try {
      const response = await fetch("/api/speech/status", { cache: "no-store", headers: denteClinicalReadHeaders() });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "РЎРѕСЃС‚РѕСЏРЅРёРµ СЂР°СЃРїРѕР·РЅР°РІР°РЅРёСЏ РЅРµРґРѕСЃС‚СѓРїРЅРѕ"));
      const status = (await response.json()) as SpeechGatewayStatus;
      setSpeechGatewayStatus(status);
      return status;
    } catch (speechError) {
      if (!options.silent) {
        setError(operatorWorkflowFailureMessage("РЁР»СЋР· СЂР°СЃРїРѕР·РЅР°РІР°РЅРёСЏ СЂРµС‡Рё РЅРµРґРѕСЃС‚СѓРїРµРЅ", speechError));
      }
      return null;
    }
  }

  async function loadSpeechGatewayHealthReport(options: { silent?: boolean } = {}) {
    try {
      const response = await fetch("/api/speech/gateway-health", { cache: "no-store", headers: denteClinicalReadHeaders() });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "РџСЂРѕРІРµСЂРєР° СЂР°СЃРїРѕР·РЅР°РІР°РЅРёСЏ РЅРµРґРѕСЃС‚СѓРїРЅР°"));
      setSpeechGatewayHealthReport((await response.json()) as SpeechGatewayHealthReport);
    } catch (speechHealthError) {
      if (!options.silent) {
        setError(operatorWorkflowFailureMessage("РџСЂРѕРІРµСЂРєР° СЂР°СЃРїРѕР·РЅР°РІР°РЅРёСЏ РЅРµРґРѕСЃС‚СѓРїРЅР°", speechHealthError));
      }
    }
  }

  async function loadSpeechProviderRuntimeStatuses(options: { silent?: boolean } = {}) {
    try {
      const response = await fetch("/api/speech/providers/runtime", { cache: "no-store", headers: denteClinicalReadHeaders() });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "РџСЂРѕРІР°Р№РґРµСЂС‹ СЂР°СЃРїРѕР·РЅР°РІР°РЅРёСЏ РЅРµРґРѕСЃС‚СѓРїРЅС‹"));
      setSpeechProviderRuntimeStatuses((await response.json()) as SpeechProviderRuntimeStatus[]);
    } catch (speechRuntimeError) {
      if (!options.silent) {
        setError(operatorWorkflowFailureMessage("РџСЂРѕРІР°Р№РґРµСЂ СЂР°СЃРїРѕР·РЅР°РІР°РЅРёСЏ РЅРµРґРѕСЃС‚СѓРїРµРЅ", speechRuntimeError));
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
      if (!response.ok) throw new Error(await responseErrorMessage(response, "РЎС‚СЂР°С‚РµРіРёСЏ СЂР°СЃРїРѕР·РЅР°РІР°РЅРёСЏ РЅРµРґРѕСЃС‚СѓРїРЅР°"));
      setSpeechRecordingStrategy((await response.json()) as SpeechRecordingStrategy);
    } catch (speechStrategyError) {
      if (!options.silent) {
        setError(operatorWorkflowFailureMessage("РЎС‚СЂР°С‚РµРіРёСЏ СЂР°СЃРїРѕР·РЅР°РІР°РЅРёСЏ РЅРµРґРѕСЃС‚СѓРїРЅР°", speechStrategyError));
      }
    }
  }

  async function loadSpeechRecordingRecovery(options: { silent?: boolean } = {}) {
    try {
      if (!dashboard?.activeVisit?.id || !dashboard?.activeVisit?.patientId) {
        setSpeechRecordingRecovery(null);
        return;
      }
      const params = new URLSearchParams({ limit: "5" });
      params.set("visitId", dashboard?.activeVisit?.id);
      params.set("patientId", dashboard?.activeVisit?.patientId);
      const response = await fetch(`/api/speech/recordings/recovery?${params.toString()}`, {
        cache: "no-store",
        headers: denteClinicalReadHeaders()
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Р’РѕСЃСЃС‚Р°РЅРѕРІР»РµРЅРёРµ РґРёРєС‚РѕРІРєРё РЅРµРґРѕСЃС‚СѓРїРЅРѕ"));
      setSpeechRecordingRecovery((await response.json()) as SpeechRecordingRecoveryList);
    } catch (speechRecoveryError) {
      if (!options.silent) {
        setError(operatorWorkflowFailureMessage("Р’РѕСЃСЃС‚Р°РЅРѕРІР»РµРЅРёРµ РґРёРєС‚РѕРІРєРё РЅРµРґРѕСЃС‚СѓРїРЅРѕ", speechRecoveryError));
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
      throw new WorkflowResponseError(await responseErrorMessage(response, "РџСЂРёРµРј РЅРµ РїСЂРёРЅСЏС‚"), response.status);
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
    if (!response.ok) throw new Error(await responseErrorMessage(response, "РЎРµСЂРІРµСЂРЅС‹Р№ С‡РµСЂРЅРѕРІРёРє РЅРµ Р·Р°РіСЂСѓР¶РµРЅ"));
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
      const response = await fetch(`/api/visits/${dashboard?.activeVisit?.id}/draft/autosave`, {
        method: "PUT",
        headers: denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          patientId: dashboard?.activeVisit?.patientId,
          selectedSpecialty,
          transcript,
          draft: visitNoteDraftFromForm(visitNoteForm, [
            "РЎРµСЂРІРµСЂРЅС‹Р№ СЃРЅРёРјРѕРє Р°РІС‚РѕСЃРѕС…СЂР°РЅРµРЅРёСЏ. РџРµСЂРµРґ РїСЂРёРЅСЏС‚РёРµРј С‡РµСЂРЅРѕРІРёРєР° Р­РњРљ РІСЂР°С‡ РІСЃРµ СЂР°РІРЅРѕ РїСЂРѕРІРµСЂСЏРµС‚ С‚РµРєСЃС‚."
          ]),
          baseRevision: dashboard?.activeVisit?.revision ?? null,
          clientDraftId: `visit-draft-${dashboard?.activeVisit?.id}`,
          clientSavedAt
        })
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "РЎРµСЂРІРµСЂРЅС‹Р№ С‡РµСЂРЅРѕРІРёРє РЅРµ СЃРѕС…СЂР°РЅРµРЅ"));
      const result = (await response.json()) as VisitDraftAutosaveResponse;
      lastServerDraftSignatureRef.current = signature;
      setLastServerDraftSavedAt(result.serverDraft?.serverSavedAt ?? clientSavedAt);
      setServerDraftSyncState("saved");
    } catch (syncError) {
      setServerDraftSyncState("error");
      if (!options.silent) {
        setError(operatorWorkflowFailureMessage("РЎРµСЂРІРµСЂРЅС‹Р№ С‡РµСЂРЅРѕРІРёРє РЅРµ СЃРѕС…СЂР°РЅРµРЅ", syncError));
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
    let remaining = [...pending];
    try {
      const promises = pending.map(async (item) => {
        const result = await submitAcceptedVisitDraft(item.visitId, item.draft, item.doctorSummary, {
          clientMutationId: item.clientMutationId,
          baseRevision: item.baseRevision,
          clientSavedAt: item.queuedAt
        });
        return { item, result };
      });

      const outcomes = await Promise.allSettled(promises);
      const errors: unknown[] = [];

      for (const outcome of outcomes) {
        if (outcome.status === "fulfilled") {
          const { item, result } = outcome.value;
          remaining = remaining.filter((candidate) => candidate.id !== item.id);
          if (dashboard?.activeVisit?.id === result.visit.id) {
            applyAcceptedVisitResponse(result);
          }
        } else {
          errors.push(outcome.reason);
        }
      }

      await savePendingVisitSaves(remaining, activeOrganizationId);

      if (errors.length > 0) {
        throw errors[0];
      }

      await refreshPendingVisitSaveState();
    } catch (syncError) {
      await savePendingVisitSaves(remaining, activeOrganizationId);
      await refreshPendingVisitSaveState();
      if (!options.silent) {
        setError(operatorWorkflowFailureMessage("РЎРµСЂРІРµСЂ РїРѕРєР° РЅРµ РїСЂРёРЅСЏР» РѕС‡РµСЂРµРґСЊ", syncError));
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
      throw new Error("РЎРµСЂРІРµСЂРЅРѕРµ СЂР°СЃРїРѕР·РЅР°РІР°РЅРёРµ СЃРµР№С‡Р°СЃ РЅРµРґРѕСЃС‚СѓРїРЅРѕ; Р°СѓРґРёРѕ РѕСЃС‚Р°Р»РѕСЃСЊ РІ Р»РѕРєР°Р»СЊРЅРѕР№ РѕС‡РµСЂРµРґРё.");
    }
    if (!response.ok) {
      const rawDetail = typeof payload.message === "string" ? payload.message : typeof payload.error === "string" ? payload.error : null;
      const detail = operatorReadableErrorDetail(rawDetail) ?? responseStatusFailureLabel(response);
      throw new Error(`Р Р°СЃРїРѕР·РЅР°РІР°РЅРёРµ СЂРµС‡Рё РЅРµ РІС‹РїРѕР»РЅРµРЅРѕ: ${detail}`);
    }
    return payload;
  }

  function speechChunkApplyKey(result: SpeechTranscriptionResponse): string {
    return `${result.chunk.recordingId}:${result.chunk.chunkIndex}`;
  }

  function speechTranscriptionMatchesActiveVisit(result: SpeechTranscriptionResponse): boolean {
    if (result.chunk.source !== "visit" || !result.chunk.visitId || !dashboard?.activeVisit?.id) return true;
    return result.chunk.visitId === dashboard?.activeVisit?.id;
  }

  function applySpeechTranscription(result: SpeechTranscriptionResponse) {
    setSpeechGatewayStatus(result.gateway);
    void loadSpeechRecordingRecovery({ silent: true });
    const applyKey = speechChunkApplyKey(result);
    if (appliedSpeechChunkKeysRef.current.has(applyKey)) {
      setSpeechStatusNote(`Р¤СЂР°РіРјРµРЅС‚ ${result.chunk.chunkIndex + 1} СѓР¶Рµ СѓС‡С‚РµРЅ, РґСѓР±Р»СЊ РЅРµ РґРѕР±Р°РІР»РµРЅ.`);
      return;
    }
    if (!speechTranscriptionMatchesActiveVisit(result)) {
      setSpeechStatusNote("Р¤СЂР°РіРјРµРЅС‚ СЂР°СЃРїРѕР·РЅР°РІР°РЅРёСЏ РѕС‚РЅРѕСЃРёС‚СЃСЏ Рє РґСЂСѓРіРѕРјСѓ РїСЂРёРµРјСѓ Рё РЅРµ РґРѕР±Р°РІР»РµРЅ РІ С‚РµРєСѓС‰СѓСЋ РєР°СЂС‚Сѓ.");
      return;
    }
    const text = result.chunk.transcript.trim();
    const quality = result.chunk.quality;
    setSpeechLastQuality(quality);
    const qualitySuffix = quality.level === "clear" ? "" : ` В· ${speechQualityLabels[quality.level]}`;
    if (text) {
      appliedSpeechChunkKeysRef.current.add(applyKey);
      appendVisitDictationText(text);
      setSpeechStatusNote(
        result.chunk.status === "transcribed"
          ? `${result.chunk.providerLabel}: С„СЂР°РіРјРµРЅС‚ ${result.chunk.chunkIndex + 1}${qualitySuffix}`
          : `РЎРѕС…СЂР°РЅРµРЅ С„СЂР°РіРјРµРЅС‚ ${result.chunk.chunkIndex + 1}${qualitySuffix}: ${quality.nextAction}`
      );
      return;
    }
    setSpeechStatusNote(`${speechQualityLabels[quality.level]}: ${quality.nextAction}`);
  }

  async function assembleSpeechRecording(recordingId: string, options: { silent?: boolean } = {}) {
    try {
      const params = new URLSearchParams();
      if (dashboard?.activeVisit?.id) params.set("visitId", dashboard?.activeVisit?.id);
      if (dashboard?.activeVisit?.patientId) params.set("patientId", dashboard?.activeVisit?.patientId);
      const scopedQuery = params.toString();
      const response = await fetch(
        `/api/speech/recordings/${encodeURIComponent(recordingId)}/assemble${scopedQuery ? `?${scopedQuery}` : ""}`,
        {
        cache: "no-store",
        headers: denteClinicalReadHeaders()
        }
      );
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Р—Р°РїРёСЃСЊ СЂР°СЃРїРѕР·РЅР°РІР°РЅРёСЏ РЅРµ СЃРѕР±СЂР°РЅР°"));
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
        const missing = assembly.missingChunkIndexes.length ? ` В· РїСЂРѕРїСѓСЃРєРё ${assembly.missingChunkIndexes.join(", ")}` : "";
        setSpeechStatusNote(`Р—Р°РїРёСЃСЊ СЃРѕР±СЂР°РЅР°: ${assembly.chunkCount} С„СЂР°РіРј.${missing}`);
      }
      void loadSpeechRecordingRecovery({ silent: true });
      return assembly;
    } catch (assemblyError) {
      if (!options.silent) {
        setError(operatorWorkflowFailureMessage("РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕР±СЂР°С‚СЊ Р·Р°РїРёСЃСЊ СЂР°СЃРїРѕР·РЅР°РІР°РЅРёСЏ", assemblyError));
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
        setSpeechStatusNote(`РћС‡РµСЂРµРґСЊ СЂР°СЃРїРѕР·РЅР°РІР°РЅРёСЏ СЃРѕС…СЂР°РЅРµРЅР° Р»РѕРєР°Р»СЊРЅРѕ: ${queue.length} С„СЂР°РіРј., РѕС‚РїСЂР°РІРєР° РїРѕСЃР»Рµ РїРѕРґРєР»СЋС‡РµРЅРёСЏ.`);
      }
      return;
    }

    const currentGateway = (await loadSpeechGatewayStatus({ silent: true })) ?? speechGatewayStatus;
    const hasAudioWaitingForServer = queue.some((item) => Boolean(item.audioBase64?.trim()));
    if (hasAudioWaitingForServer && !speechGatewayCanUpload(currentGateway)) {
      await refreshPendingSpeechChunkState();
      if (!options.silent) {
        setSpeechStatusNote(`РћС‡РµСЂРµРґСЊ СЂР°СЃРїРѕР·РЅР°РІР°РЅРёСЏ СЃРѕС…СЂР°РЅРµРЅР°: ${queue.length} С„СЂР°РіРј. РЎРµСЂРІРµСЂРЅРѕРµ СЂР°СЃРїРѕР·РЅР°РІР°РЅРёРµ РµС‰Рµ РЅРµ РіРѕС‚РѕРІРѕ, Р°СѓРґРёРѕ РЅРµ СѓРґР°Р»РµРЅРѕ.`);
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
        setError(operatorWorkflowFailureMessage("РћС‡РµСЂРµРґСЊ СЂР°СЃРїРѕР·РЅР°РІР°РЅРёСЏ РїРѕРєР° РЅРµ РѕС‚РїСЂР°РІР»РµРЅР°", syncError));
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
    const organizationId = dashboard?.clinicSettings?.profile?.organizationId?.trim() ?? "";
    if (!uiPreferencesHydrated || !organizationId || documentIssueSignatureHydratedOrganizationIdRef.current === organizationId) return;
    documentIssueSignatureHydratedOrganizationIdRef.current = organizationId;
    const scopedDraft = loadDocumentIssueSignatureDraft(organizationId);
    if (!scopedDraft.savedAt) return;
    const savedPreferences = loadUiPreferences();
    if (savedPreferences.savedAt && scopedDraft.savedAt < savedPreferences.savedAt) return;
    setDocumentIssueSignatureMode(scopedDraft.mode);
    setDocumentIssueStaffFullName(scopedDraft.staffFullName);
    setDocumentIssueStaffRole(scopedDraft.staffRole);
  }, [dashboard?.clinicSettings?.profile?.organizationId, uiPreferencesHydrated]);

  useEffect(() => {
    const organizationId = dashboard?.clinicSettings?.profile?.organizationId?.trim() ?? "";
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
  }, [dashboard?.clinicSettings?.profile?.organizationId, onboardingDismissedAt, uiPreferencesHydrated]);

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
      setUiPreferencesSyncError("РќР°СЃС‚СЂРѕР№РєРё РёРЅС‚РµСЂС„РµР№СЃР° РЅРµ СЃРѕС…СЂР°РЅРµРЅС‹: Р±СЂР°СѓР·РµСЂ Р·Р°Р±Р»РѕРєРёСЂРѕРІР°Р» Р»РѕРєР°Р»СЊРЅРѕРµ С…СЂР°РЅРёР»РёС‰Рµ.");
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
      setError(operatorWorkflowFailureMessage("РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РґР°РЅРЅС‹Рµ", loadError));
    });
  }, []);

  const imagingPreviewWorkset = useMemo(() => { console.log("eval imagingPreviewWorkset", JSON.stringify(dashboard?.clinicSettings));
    if (currentView !== "imaging" || !dashboard?.imagingStudies?.length) return [];
    const activeStudies = (dashboard.imagingStudies || []).filter((study) => study.patientId === dashboard?.activeVisit?.patientId)
      .sort((left, right) => right.capturedAt.localeCompare(left.capturedAt));
    const visibleStudies =
      imagingKindFilter === "all" ? activeStudies : activeStudies.filter((study) => study.kind === imagingKindFilter);
    const selectedStudy = visibleStudies?.find((study) => study.id === selectedImagingStudyId) ?? visibleStudies[0] ?? null;
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
    if (dashboard?.clinicSettings?.profile) {
      setClinicProfileDraft(clinicProfileDraftFromProfile(dashboard?.clinicSettings?.profile));
    } else {
      setClinicProfileDraft(emptyClinicProfileDraft);
    }
    setClinicProfileDirty(false);
    clinicProfileDraftHydratedRef.current = true;
  }, [dashboard]);

  useEffect(() => {
    if (!dashboard) return;
    setStaffScheduleDrafts((current: any) => {
      const next: Record<string, StaffScheduleDraft> = {};
      dashboard?.clinicSettings?.staff.forEach((member) => {
        next[member.id] = current[member.id] ?? staffScheduleDraftFromWorkingHours(member.workingHours ?? null);
      });
      return next;
    });
  }, [dashboard]);

  useEffect(() => {
    if (!dashboard) return;
    setChairScheduleDrafts((current: any) => {
      const next: Record<string, StaffScheduleDraft> = {};
      dashboard?.clinicSettings?.chairs.forEach((chair) => {
        next[chair.id] = current[chair.id] ?? staffScheduleDraftFromWorkingHours(chair.workingHours ?? null);
      });
      return next;
    });
  }, [dashboard]);

  useEffect(() => {
    if (!dashboard) return;
    setAppointmentScheduleDrafts((current: any) => {
      return (dashboard?.appointments ?? []).reduce((next: Record<string, AppointmentScheduleDraft>, appointment) => {
        next[appointment.id] = current[appointment.id] ?? appointmentScheduleDraftFromAppointment(appointment);
        return next;
      }, {});
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
    if (!dashboard || !clinicProfileDirty || clinicProfileSaveState === "saving" || !clinicProfileDraft.clinicName.trim()) {
      return undefined;
    }
    const saveTimer = window.setTimeout(() => {
      void saveClinicProfileFromDraft();
    }, 1400);
    return () => window.clearTimeout(saveTimer);
  }, [clinicProfileDraft, clinicProfileDirty, clinicProfileSaveState, dashboard]);

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
    dashboard?.clinicSettings?.profile?.organizationId
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
      setCurrentView("shift");
      window.location.hash = "shift";
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
  }, [activeOrganizationId, dashboard?.activeVisit?.id, lastLocalSavedAt]);

  useEffect(() => {
    if (!dashboard) return;
    void loadSpeechRecordingStrategy({ silent: true });
  }, [dashboard?.activeVisit?.id, isOnline, selectedSpecialty]);

  useEffect(() => {
    if (!dashboard) return;
    let cancelled = false;
    visitDraftUserEditedRef.current = false;
    setLocalAutosaveReady(false);
    const savedDraft = loadVisitLocalDraft(dashboard?.activeVisit?.id, activeOrganizationId);
    const serverUpdatedAt = Date.parse(dashboard?.activeVisit?.updatedAt);
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
        const result = await loadServerVisitDraft(dashboard?.activeVisit?.id);
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
  }, [activeOrganizationId, dashboard?.activeVisit?.id, dashboard?.activeVisit?.updatedAt]);

  useEffect(() => {
    if (!dashboard || !localAutosaveReady) return;
    const savedAt = new Date().toISOString();
    const timeout = window.setTimeout(() => {
      saveVisitLocalDraft(
        {
          version: 1,
          visitId: dashboard?.activeVisit?.id,
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
  }, [activeOrganizationId, dashboard?.activeVisit?.id, localAutosaveReady, selectedSpecialty, transcript, visitNoteForm]);

  useEffect(() => {
    if (!dashboard || !localAutosaveReady || !lastLocalSavedAt) return;
    const timeout = window.setTimeout(() => {
      void syncVisitDraftAutosave(lastLocalSavedAt, { silent: true });
    }, 1600);
    return () => window.clearTimeout(timeout);
  }, [dashboard?.activeVisit?.id, isOnline, lastLocalSavedAt, localAutosaveReady, selectedSpecialty, transcript, visitNoteForm]);

  const sortedAppointments = useMemo(() => {
    if (!dashboard) return [];
    return (dashboard.appointments || []).filter((appointment) => {
        if (scheduleDoctorFilterId && appointment.doctorUserId !== scheduleDoctorFilterId) return false;
        if (scheduleAssistantFilterId && appointment.assistantUserId !== scheduleAssistantFilterId) return false;
        if (scheduleChairFilterId && appointment.chairId !== scheduleChairFilterId) return false;
        if (scheduleStatusFilter !== "all" && appointment.status !== scheduleStatusFilter) return false;
        if (scheduleDateFilter) {
          const localAppointmentDate = toDateTimeLocalValue(appointment.startsAt, dashboard?.clinicSettings?.profile?.timezone).slice(0, 10);
          if (localAppointmentDate !== scheduleDateFilter) return false;
        }
        return true;
      })
      .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  }, [dashboard, scheduleAssistantFilterId, scheduleChairFilterId, scheduleDateFilter, scheduleDoctorFilterId, scheduleStatusFilter]);

  const activePatient = useMemo(() => {
    if (!dashboard) return null;
    return (
      findPatient(dashboard.patients, dashboard?.activeVisit?.patientId) ??
      dashboard?.patients?.find((patient) => patient.status === "active") ??
      null
    );
  }, [dashboard]);

  useEffect(() => {
    if (!dashboard) return;
    setSelectedPatientId((current: any) =>
      current && (dashboard?.patients ?? []).some((patient) => patient.id === current)
        ? current
        : activePatient?.id ?? null
    );
  }, [activePatient?.id, dashboard?.patients?.length]);

  const selectedPatient = useMemo(() => {
    if (!dashboard) return null;
    return (
      (selectedPatientId ? findPatient(dashboard.patients, selectedPatientId) : null) ??
      activePatient
    );
  }, [activePatient, dashboard, selectedPatientId]);
  const documentPatient = selectedPatient ?? activePatient;
  const documentPatientMatchesActiveVisit = Boolean(documentPatient && dashboard?.activeVisit?.patientId === documentPatient.id);
  const paymentPatientContextReady = Boolean(documentPatient && documentPatientMatchesActiveVisit);
  const paymentPatientContextMessage = !documentPatient
    ? "Р’С‹Р±РµСЂРёС‚Рµ РїР°С†РёРµРЅС‚Р° С‚РµРєСѓС‰РµРіРѕ РїСЂРёРµРјР° РїРµСЂРµРґ Р·Р°РїРёСЃСЊСЋ РѕРїР»Р°С‚С‹."
    : !documentPatientMatchesActiveVisit
      ? `РЎРµР№С‡Р°СЃ РІС‹Р±СЂР°РЅ РїР°С†РёРµРЅС‚ ${documentPatient.fullName}, РЅРѕ Р°РєС‚РёРІРЅС‹Р№ РїСЂРёРµРј РѕС‚РєСЂС‹С‚ РґР»СЏ РґСЂСѓРіРѕРіРѕ РїР°С†РёРµРЅС‚Р°. РџРµСЂРµРєР»СЋС‡РёС‚Рµ Р°РєС‚РёРІРЅС‹Р№ РїСЂРёРµРј РїРµСЂРµРґ Р·Р°РїРёСЃСЊСЋ РѕРїР»Р°С‚С‹.`
      : "";

  useEffect(() => {
    setPaymentFeedback("");
    setPaymentPayerFullName("");
    setPaymentPayerInn("");
    setPaymentPayerBirthDate("");
    setPaymentPayerIdentityDocument("");
    setPaymentPayerRelationship("РїР°С†РёРµРЅС‚");
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
    return dashboard.appointments?.find((appointment) => appointment.id === dashboard?.activeVisit?.appointmentId) ?? null;
  }, [dashboard]);

  const activeDoctor = useMemo(() => {
    if (!dashboard || !activeAppointment) return null;
    return dashboard?.clinicSettings?.staff?.find((member) => member.id === activeAppointment.doctorUserId && member.active) ?? null;
  }, [activeAppointment, dashboard]);

  const telegramLinkStaffOptions = useMemo(
    () => (dashboard?.clinicSettings?.staff || []).filter((member) => member.active) ?? [],
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
      return dashboard?.patients?.find((patient) => patient.id === subjectId)?.fullName ?? "РџР°С†РёРµРЅС‚";
    }
    return dashboard?.clinicSettings?.staff?.find((member) => member.id === subjectId)?.fullName ?? "РЎРѕС‚СЂСѓРґРЅРёРє";
  }

  const activeChair = useMemo(() => {
    if (!dashboard || !activeAppointment) return null;
    return dashboard?.clinicSettings?.chairs?.find((chair) => chair.id === activeAppointment.chairId && chair.active) ?? null;
  }, [activeAppointment, dashboard]);

  const patientInsightById = useMemo(() => {
    if (!dashboard) return new Map<string, Dashboard["patientInsights"][number]>();
    return new Map((dashboard?.patientInsights ?? []).map((insight) => [insight.patientId, insight]));
  }, [dashboard]);

  const activePatientInsight = activePatient ? patientInsightById.get(activePatient.id) ?? null : null;
  const activePatientCallablePhone = activePatient?.phone?.trim().replace(/[^\d+]/g, "") ?? "";
  const activePatientHasCallablePhone = activePatientCallablePhone.length >= 5;

  const appointmentReadinessById = useMemo(() => {
    if (!dashboard) return new Map<string, Dashboard["appointmentReadiness"][number]>();
    return new Map((dashboard?.appointmentReadiness ?? []).map((readiness) => [readiness.appointmentId, readiness]));
  }, [dashboard]);

  const filteredPatients = useMemo(() => {
    if (!dashboard) return [];
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return dashboard.patients;
    return (dashboard.patients || []).filter((patient) => {
      return `${patient.fullName} ${patient.phone ?? ""}`.toLowerCase().includes(normalizedQuery);
    });
  }, [dashboard, query]);

  const activeDocuments = useMemo(() => {
    if (!dashboard || !documentPatient) return [];
    return (dashboard.documents || []).filter(
      (document) =>
        document.patientId === documentPatient.id &&
        (!documentPatientMatchesActiveVisit || document.visitId === null || document.visitId === dashboard?.activeVisit?.id)
    );
  }, [dashboard, documentPatient?.id, documentPatientMatchesActiveVisit]);

  const activeUsableDocuments = useMemo(() => {
    return activeDocuments.filter((document) => document.status !== "voided");
  }, [activeDocuments]);

  const documentIssueConfirmation = useMemo(() => {
    if (!documentIssueConfirmationId) return null;
    return activeDocuments?.find((document) => document.id === documentIssueConfirmationId && document.status === "draft") ?? null;
  }, [activeDocuments, documentIssueConfirmationId]);

  const documentVoidConfirmation = useMemo(() => {
    if (!documentVoidConfirmationId) return null;
    return activeDocuments?.find((document) => document.id === documentVoidConfirmationId && document.status !== "voided") ?? null;
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
      dashboard?.clinicSettings?.profile?.organizationId ?? null,
      documentIssueSignatureMode,
      documentIssueStaffFullName,
      documentIssueStaffRole
    );
  }, [dashboard?.clinicSettings?.profile?.organizationId, documentIssueSignatureMode, documentIssueStaffFullName, documentIssueStaffRole]);

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
    const contract = activeIssuedPaidContracts?.find((document) => document.id === selectedCompletedActContractDocumentId);
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
    const sourceDocument = issuedMedicalCopyRequestDocuments?.find((document) => document.id === selectedReleaseSourceRequestDocumentId);
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
      `Р’С‹РґР°С‡Р° РїРѕ Р·Р°РїСЂРѕСЃСѓ ${sourceDocument.title}; РєР°РЅР°Р»: ${medicalDocumentReleaseChannelLabels[request.requestedFormat]}. Р›РёС‡РЅРѕСЃС‚СЊ РїРѕР»СѓС‡Р°С‚РµР»СЏ РїСЂРѕРІРµСЂРµРЅР°, Р»РёС€РЅРёРµ РґР°РЅРЅС‹Рµ С‚СЂРµС‚СЊРёС… Р»РёС† РёСЃРєР»СЋС‡Р°СЋС‚СЃСЏ РїРµСЂРµРґ РїРµСЂРµРґР°С‡РµР№.`
    );
  }, [issuedMedicalCopyRequestDocuments, selectedReleaseSourceRequestDocumentId]);

  const activeTreatmentPlanItems = useMemo(() => {
    if (!dashboard || !documentPatient) return [];
    return (dashboard.treatmentPlanItems || []).filter((item) => item.patientId === documentPatient.id);
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
    return (dashboard.treatmentPlanScenarios || []).filter((scenario) => scenario.patientId === documentPatient.id);
  }, [dashboard, documentPatient?.id]);

  const activeVisitClinicalRuleEvaluations = useMemo(() => { console.log("eval activeVisitClinicalRuleEvaluations", !!dashboard?.clinicalRuleEvaluations);
    if (!dashboard) return [];
    const severityRank = { blocker: 0, warning: 1, info: 2 } as const;
    return (dashboard.clinicalRuleEvaluations || []).filter((evaluation) => evaluation.patientId === dashboard?.activeVisit?.patientId)
      .sort((left, right) => Number(left.resolved) - Number(right.resolved) || severityRank[left.severity] - severityRank[right.severity]);
  }, [dashboard]);

  const patientClinicalRuleEvaluations = useMemo(() => {
    if (!dashboard || !documentPatient) return [];
    const severityRank = { blocker: 0, warning: 1, info: 2 } as const;
    return (dashboard.clinicalRuleEvaluations || []).filter((evaluation) => evaluation.patientId === documentPatient.id)
      .sort((left, right) => Number(left.resolved) - Number(right.resolved) || severityRank[left.severity] - severityRank[right.severity]);
  }, [dashboard, documentPatient?.id]);

  const activeVisitClinicalRuleSummary = useMemo(
    () => clinicalRuleSummaryForUi(activeVisitClinicalRuleEvaluations, dashboard?.clinicalRuleSummary?.activeRules ?? 0),
    [activeVisitClinicalRuleEvaluations, dashboard?.clinicalRuleSummary?.activeRules]
  );

  const patientClinicalRuleSummary = useMemo(
    () => clinicalRuleSummaryForUi(patientClinicalRuleEvaluations, dashboard?.clinicalRuleSummary?.activeRules ?? 0),
    [patientClinicalRuleEvaluations, dashboard?.clinicalRuleSummary?.activeRules]
  );

  const activePayments = useMemo(() => {
    if (!dashboard || !documentPatient) return [];
    return (dashboard.payments || []).filter((payment) => payment.patientId === documentPatient.id);
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
      const service = dashboard.serviceCatalog?.find((candidate) => candidate.id === item.serviceId);
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
  const documentLocalPersistenceOrganizationId = dashboard?.clinicSettings?.profile?.organizationId ?? null;

  const taxDocumentPayerOptions = useMemo(() => {
    const optionsByKey = new Map<string, { key: string; inn: string; label: string; amountRub: number; paymentCount: number }>();
    for (const payment of activePayments) {
      const paymentTaxYear = paymentTaxYearForUi(payment);
      if (payment.status !== "paid" || paymentTaxYear !== taxDocumentYear) continue;
      const payerKey = taxPaymentPayerKeyForUi(payment);
      if (!payerKey) continue;
      const payerInn = payment.payerInn?.trim() || "";
      const payerName = payment.payerFullName?.trim() || "РџР»Р°С‚РµР»СЊС‰РёРє";
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
          ? `${payerName} В· РРќРќ ${payerInn}${payerRelationship ? ` В· ${payerRelationship}` : ""}`
          : `${payerName} В· РґРѕРєСѓРјРµРЅС‚ ${payerIdentity || "Р±РµР· РРќРќ"}${payerRelationship ? ` В· ${payerRelationship}` : ""}`,
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
    () => taxDocumentPayerOptions?.find((option) => option.key === selectedTaxDocumentPayerKey) ?? null,
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
          (!dashboard?.activeVisit?.id || payment.visitId === dashboard?.activeVisit?.id)
      )
      .sort((left, right) => (right.fiscalReceiptIssuedAt || right.paidAt || "").localeCompare(left.fiscalReceiptIssuedAt || left.paidAt || ""));
  }, [activePayments, dashboard?.activeVisit?.id]);
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
          (!dashboard?.activeVisit?.id || payment.visitId === dashboard?.activeVisit?.id)
      )
      .sort((left, right) => (right.fiscalReceiptIssuedAt || right.paidAt || "").localeCompare(left.fiscalReceiptIssuedAt || left.paidAt || ""));
  }, [activePayments, dashboard?.activeVisit?.id]);
  const selectedRefundCorrectionPayment = useMemo(
    () => eligibleRefundCorrectionPayments?.find((payment) => payment.id === refundSelectedPaymentId) ?? null,
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
    return `receipt:${organizationId}:${documentPatient.id}:${dashboard?.activeVisit?.id ?? "all-visits"}`;
  }, [dashboard?.activeVisit?.id, documentLocalPersistenceOrganizationId, documentPatient?.id]);

  function selectRefundOriginalPayment(paymentId: string): void {
    setRefundSelectedPaymentId(paymentId);
    const payment = eligibleRefundCorrectionPayments?.find((candidate) => candidate.id === paymentId);
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
  const outpatient025uDraftVisitId = documentPatientMatchesActiveVisit ? dashboard?.activeVisit?.id ?? null : null;
  const medicalRecordExtractDraftVisitId = documentPatientMatchesActiveVisit ? dashboard?.activeVisit?.id ?? null : null;
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
      activePayments?.find(
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

  const activeCommunicationTasks = useMemo(() => { console.log("eval activeCommunicationTasks", !!dashboard?.communicationTasks);
    if (!dashboard) return [];
    return (dashboard.communicationTasks || []).filter((task) => task.patientId === dashboard?.activeVisit?.patientId);
  }, [dashboard]);

  const sortedCommunicationTasks = useMemo(() => {
    if (!dashboard) return [];
    return [...(dashboard.communicationTasks || [])].sort((left, right) => {
      const priorityRank = { urgent: 0, high: 1, normal: 2, low: 3 } as const;
      return priorityRank[left.priority] - priorityRank[right.priority] || left.dueAt.localeCompare(right.dueAt);
    });
  }, [dashboard]);

  const activeImagingStudies = useMemo(() => { console.log("eval activeImagingStudies", !!dashboard?.imagingStudies);
    if (!dashboard) return [];
    return (dashboard.imagingStudies || []).filter((study) => study.patientId === dashboard?.activeVisit?.patientId)
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
    visibleImagingStudies?.find((study) => study.id === selectedImagingStudyId) ?? latestImagingStudy;
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
    dicomSeriesPreview?.series?.find((series) => series.mprReadiness.volumeCandidate) ??
    dicomSeriesPreview?.series?.find((series) => series.recommendedViewer === "cbct_mpr") ??
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
  const latestDicomWorkbenchServerBundle = dicomWorkbenchServerBundles?.[0] ?? null;
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
      { key: "axial", title: "РђРєСЃРёР°Р»СЊРЅР°СЏ", detail: "РЎСЂРµР· СЃРІРµСЂС…Сѓ-РІРЅРёР·" },
      { key: "coronal", title: "РљРѕСЂРѕРЅР°Р»СЊРЅР°СЏ", detail: "Р¤СЂРѕРЅС‚Р°Р»СЊРЅР°СЏ РїР»РѕСЃРєРѕСЃС‚СЊ" },
      { key: "sagittal", title: "РЎР°РіРёС‚С‚Р°Р»СЊРЅР°СЏ", detail: "Р‘РѕРєРѕРІР°СЏ РїР»РѕСЃРєРѕСЃС‚СЊ" },
      {
        key: cbctWorkbenchSeries?.mprReadiness.canBuildPanoramic ? "panoramic_reconstruction" : "oblique",
        title: cbctWorkbenchSeries?.mprReadiness.canBuildPanoramic ? "РџР°РЅРѕСЂР°РјР°" : "РљРѕСЃР°СЏ",
        detail: cbctWorkbenchSeries?.mprReadiness.canBuildPanoramic ? "РљСЂРёРІР°СЏ РёР· РљР›РљРў" : "РќР°РєР»РѕРЅРЅР°СЏ РїР»РѕСЃРєРѕСЃС‚СЊ"
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
  const mprSliceLabel = mprControlsReady ? `СЃСЂРµР· ${mprSafeSliceIndex + 1} РёР· ${mprSliceMaxIndex + 1}` : "СЃСЂРµР· РІРєР»СЋС‡РёС‚СЃСЏ РїРѕСЃР»Рµ РљР›РљРў/РљРў-СЃРµСЂРёРё";
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
  const mprActiveProjectionOrientation = mprProjectionOrientationLabels[mprProjection as MprProjection] ?? "РїР»РѕСЃРєРѕСЃС‚СЊ РїСЂРѕСЃРјРѕС‚СЂР°";
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
      setError("Р’С‹Р±РµСЂРёС‚Рµ РљРў-СЃРЅРёРјРѕРє РїРµСЂРµРґ СЃРѕР·РґР°РЅРёРµРј СЂР°Р·РјРµС‚РєРё.");
      return;
    }
    if (!imagingViewerSessionReady) {
      setError("Р”РѕР¶РґРёС‚РµСЃСЊ Р·Р°РіСЂСѓР·РєРё СЃРµСЃСЃРёРё РїСЂРѕСЃРјРѕС‚СЂР° СЃРЅРёРјРєР° РїРµСЂРµРґ СЃРѕР·РґР°РЅРёРµРј РљРў-СЂР°Р·РјРµС‚РєРё.");
      return;
    }
    if (command.requiresVolume && !mprControlsReady) {
      setError("Р”Р»СЏ СЌС‚РѕР№ РљРў-СЂР°Р·РјРµС‚РєРё РЅСѓР¶РЅР° РіРѕС‚РѕРІР°СЏ РљР›РљРў/РљРў-СЃРµСЂРёСЏ.");
      return;
    }
    if (command.requiresImplant && !ctPlanningImplantPlan) {
      setError("РЎРЅР°С‡Р°Р»Р° РІС‹Р±РµСЂРёС‚Рµ РёРјРїР»Р°РЅС‚ РёР· Р±РёР±Р»РёРѕС‚РµРєРё, Р·Р°С‚РµРј СЃРѕР·РґР°Р№С‚Рµ РѕСЃСЊ РёР»Рё С€Р°Р±Р»РѕРЅ.");
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
        `Р§РµСЂРЅРѕРІРёРє РљРў-СЂР°Р·РјРµС‚РєРё: ${command.detail}`,
        `РџР»РѕСЃРєРѕСЃС‚СЊ: ${mprProjectionLabels[projection] ?? projection}`,
        `РЎСЂРµР·: ${mprSafeSliceIndex + 1}/${mprSliceMaxIndex + 1}`,
        `РЎР»РѕР№: ${mprSlabMm} РјРј`,
        ctPlanningImplantPlan ? `РРјРїР»Р°РЅС‚: ${ctPlanningImplantPlan.diameterMm} x ${ctPlanningImplantPlan.lengthMm} РјРј` : ""
      ]
        .filter(Boolean)
        .join(" В· "),
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
    const preset = mprClinicalPresets?.find((candidate) => candidate.title === mprNearestClinicalPreset.title);
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
      setError("РЎРЅР°С‡Р°Р»Р° РІС‹Р±РµСЂРёС‚Рµ РіРѕС‚РѕРІСѓСЋ РљР›РљРў/РљРў-СЃРµСЂРёСЋ, С‡С‚РѕР±С‹ РІРµСЂРЅСѓС‚СЊ РїРѕСЃР»РµРґРЅРёР№ РІРёРґ РљРў-СЃСЂРµР·РѕРІ.");
      return;
    }
    const draft = await loadLocalMprWorkbenchDraft(cbctWorkbenchSeriesKey, activeOrganizationId);
    if (!draft) {
      setError("Р”Р»СЏ СЌС‚РѕР№ РљР›РљРў/РљРў-СЃРµСЂРёРё РµС‰Рµ РЅРµС‚ СЃРѕС…СЂР°РЅРµРЅРЅРѕРіРѕ РІРёРґР° РљРў-СЃСЂРµР·РѕРІ.");
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
      if (!response.ok) throw new Error(await responseErrorMessage(response, "РЎРµСЃСЃРёСЏ РїСЂРѕСЃРјРѕС‚СЂС‰РёРєР° РЅРµ Р·Р°РіСЂСѓР¶РµРЅР°"));
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
      setImagingViewerSaveError(localDraft ? "РЎРµСЂРІРµСЂ РЅРµРґРѕСЃС‚СѓРїРµРЅ; Р»РѕРєР°Р»СЊРЅС‹Р№ С‡РµСЂРЅРѕРІРёРє РїСЂРѕСЃРјРѕС‚СЂС‰РёРєР° СЃРѕС…СЂР°РЅРµРЅ." : "РЎРµСЃСЃРёСЏ РїСЂРѕСЃРјРѕС‚СЂС‰РёРєР° РЅРµРґРѕСЃС‚СѓРїРЅР°.");
      setImagingViewerSaveState(localDraft ? "queued" : "error");
    } finally {
      setImagingViewerSessionReady(true);
    }
  }

  async function saveCurrentImagingViewerSession(clientSavedAt: string) {
    if (!selectedImagingStudy) return;
    if (!isOnline) {
      setImagingViewerSaveError("РћС„Р»Р°Р№РЅ: Р»РѕРєР°Р»СЊРЅС‹Р№ С‡РµСЂРЅРѕРІРёРє РїСЂРѕСЃРјРѕС‚СЂС‰РёРєР° СЃРѕС…СЂР°РЅРµРЅ РґРѕ РїРѕСЏРІР»РµРЅРёСЏ СЃРµС‚Рё РЅР° СЂР°Р±РѕС‡РµР№ СЃС‚Р°РЅС†РёРё.");
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
      if (!response.ok) throw new Error(await responseErrorMessage(response, "РЎРµСЃСЃРёСЏ РїСЂРѕСЃРјРѕС‚СЂС‰РёРєР° РЅРµ СЃРѕС…СЂР°РЅРµРЅР°"));
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
      setImagingViewerSaveError("РЎРµСЂРІРµСЂРЅРѕРµ СЃРѕС…СЂР°РЅРµРЅРёРµ РЅРµ РІС‹РїРѕР»РЅРµРЅРѕ; Р»РѕРєР°Р»СЊРЅС‹Р№ С‡РµСЂРЅРѕРІРёРє РїСЂРѕСЃРјРѕС‚СЂР° СЃРѕС…СЂР°РЅРµРЅ.");
      setImagingViewerSaveState("queued");
    }
  }

  function retryImagingViewerSessionSave() {
    if (!selectedImagingStudy?.id) {
      setError("Р’С‹Р±РµСЂРёС‚Рµ СЃРЅРёРјРѕРє РїРµСЂРµРґ РїРѕРІС‚РѕСЂРЅС‹Рј СЃРѕС…СЂР°РЅРµРЅРёРµРј РїСЂРѕСЃРјРѕС‚СЂР°.");
      return;
    }
    if (!imagingViewerSessionReady) {
      setError("Р”РѕР¶РґРёС‚РµСЃСЊ Р·Р°РіСЂСѓР·РєРё СЃРµСЃСЃРёРё РїСЂРѕСЃРјРѕС‚СЂР° СЃРЅРёРјРєР° РїРµСЂРµРґ РїРѕРІС‚РѕСЂРЅС‹Рј СЃРѕС…СЂР°РЅРµРЅРёРµРј.");
      return;
    }
    const clientSavedAt = imagingViewerLocalSavedAt ?? new Date().toISOString();
    void saveCurrentImagingViewerSession(clientSavedAt);
  }

  function addImagingViewerNoteAnnotation() {
    if (!selectedImagingStudy) {
      setError("Р’С‹Р±РµСЂРёС‚Рµ СЃРЅРёРјРѕРє РїРµСЂРµРґ РґРѕР±Р°РІР»РµРЅРёРµРј Р·Р°РјРµС‚РєРё.");
      return;
    }
    if (!imagingViewerSessionReady) {
      setError("Р”РѕР¶РґРёС‚РµСЃСЊ Р·Р°РіСЂСѓР·РєРё СЃРµСЃСЃРёРё РїСЂРѕСЃРјРѕС‚СЂР° СЃРЅРёРјРєР° РїРµСЂРµРґ РґРѕР±Р°РІР»РµРЅРёРµРј Р·Р°РјРµС‚РєРё.");
      return;
    }
    const cleanNote = imagingViewerNoteText;
    if (!cleanNote) {
      setError("Р’РІРµРґРёС‚Рµ С‚РµРєСЃС‚ Р·Р°РјРµС‚РєРё РїРµСЂРµРґ РґРѕР±Р°РІР»РµРЅРёРµРј Рє СЃРЅРёРјРєСѓ.");
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
      setImagingViewerSaveError("Р‘СЂР°СѓР·РµСЂ РѕС‚РєР»РѕРЅРёР» Р»РѕРєР°Р»СЊРЅРѕРµ СЃРѕС…СЂР°РЅРµРЅРёРµ С‡РµСЂРЅРѕРІРёРєР° РїСЂРѕСЃРјРѕС‚СЂС‰РёРєР°; РґРµСЂР¶РёС‚Рµ РІРєР»Р°РґРєСѓ РѕС‚РєСЂС‹С‚РѕР№ РґРѕ Р·Р°РІРµСЂС€РµРЅРёСЏ СЃРµСЂРІРµСЂРЅРѕР№ Р·Р°РїРёСЃРё.");
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
    return Array.from(new Set(dashboard?.protocolTemplates?.map((template) => template.specialty)));
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
    return (dashboard?.protocolTemplates || []).filter((template) => template.specialty === selectedSpecialty);
  }, [dashboard, selectedSpecialty]);

  const selectedProtocolTemplate = useMemo(() => {
    return specialtyProtocolTemplates?.find((template) => template.id === selectedProtocolId) ?? specialtyProtocolTemplates[0] ?? null;
  }, [selectedProtocolId, specialtyProtocolTemplates]);

  useEffect(() => {
    if (!selectedProtocolId) return;
    if (specialtyProtocolTemplates.some((template) => template.id === selectedProtocolId)) return;
    setSelectedProtocolId(null);
  }, [selectedProtocolId, specialtyProtocolTemplates]);

  const dictationQuickPhrases = useMemo(() => {
    const visitReason = activeAppointment?.reason ?? selectedProtocolTemplate?.visitReason ?? "РѕСЃРјРѕС‚СЂ";
    const specialtyPhrases = specialtyQuickPhraseLibrary[selectedSpecialty] ?? specialtyQuickPhraseLibrary.universal;
    return [
      { label: "РџРѕРІРѕРґ", text: `РџРѕРІРѕРґ РїСЂРёРµРјР°: ${visitReason}.` },
      ...specialtyPhrases
    ];
  }, [activeAppointment?.reason, selectedProtocolTemplate?.visitReason, selectedSpecialty]);

  const taxDocuments =
    (dashboard?.documents || []).filter((document) => documentKindMetadata[document.kind].group === "tax") ?? [];
  const shiftWarnings = dashboard?.shiftIntelligence?.scheduleWarnings ?? [];
  const allResourceLoads = dashboard
    ? [...(dashboard?.shiftIntelligence?.doctorLoads || []), ...(dashboard?.shiftIntelligence?.assistantLoads || []), ...(dashboard?.shiftIntelligence?.chairLoads || [])]
    : [];
  const mostLoadedResource = allResourceLoads.slice().sort((left, right) => right.utilizationPercent - left.utilizationPercent)[0] ?? null;

  const visitCloseChecklist = dashboard?.visitCloseChecklist ?? null;
  const visitWarnings = visitCloseChecklist?.items.filter((item) => !item.ready) ?? [];
  const primaryVisitWarning = visitWarnings?.find((item) => item.blocking) ?? visitWarnings[0] ?? null;
  const speechProviderRuntimeById = useMemo(
    () => new Map((Array.isArray(speechProviderRuntimeStatuses) ? speechProviderRuntimeStatuses : []).map((provider) => [provider.providerId, provider])),
    [speechProviderRuntimeStatuses]
  );
  const speechProviderHealthById = useMemo(
    () => new Map((speechGatewayHealthReport?.providers ?? []).map((provider) => [provider.providerId, provider])),
    [speechGatewayHealthReport]
  );
  const activeSpeechProviderHealth = useMemo(() => {
    if (!speechGatewayHealthReport) return null;
    return speechGatewayHealthReport.providers?.find((provider) => provider.providerId === speechGatewayHealthReport.activeProviderId) ?? null;
  }, [speechGatewayHealthReport]);
  const savedVisitNoteForm = useMemo(() => (dashboard ? visitNoteFormFromVisit(dashboard.activeVisit) : emptyVisitNoteForm), [dashboard]);
  const isVisitNoteDirty = visitNoteFieldDefinitions.some(({ key }) => visitNoteForm[key] !== savedVisitNoteForm[key]);
  const hasVisitNoteFormText = visitNoteFieldDefinitions.some(({ key }) => visitNoteForm[key].trim().length > 0);
  const hasVisitTranscriptText = transcript.trim().length > 0;
  const visitDraftBuildMissingSteps = [
    !activePatient ? "РІС‹Р±РµСЂРёС‚Рµ РїР°С†РёРµРЅС‚Р°" : null,
    !hasVisitTranscriptText ? "РґРѕР±Р°РІСЊС‚Рµ С‚РµРєСЃС‚ РґРёРєС‚РѕРІРєРё РёР»Рё РЅР°Р¶РјРёС‚Рµ РіРѕР»РѕСЃРѕРІСѓСЋ Р·Р°РїРёСЃСЊ" : null
  ].filter((step): step is string => Boolean(step));
  const visitDraftReadyToBuild = visitDraftBuildMissingSteps.length === 0;
  const visitNoteAcceptMissingSteps = [
    !hasVisitNoteFormText ? "Р·Р°РїРѕР»РЅРёС‚Рµ С…РѕС‚СЏ Р±С‹ РѕРґРЅРѕ РїРѕР»Рµ Р­РњРљ РёР»Рё СЃРѕР±РµСЂРёС‚Рµ С‡РµСЂРЅРѕРІРёРє РёР· РґРёРєС‚РѕРІРєРё" : null,
    !draft && !isVisitNoteDirty ? "РІРЅРµСЃРёС‚Рµ РїСЂР°РІРєСѓ РІ Р­РњРљ РёР»Рё РїРѕРґРіРѕС‚РѕРІСЊС‚Рµ РЅРѕРІС‹Р№ С‡РµСЂРЅРѕРІРёРє" : null
  ].filter((step): step is string => Boolean(step));
  const visitNoteReadyToAccept = visitNoteAcceptMissingSteps.length === 0;
  const visitNoteActionLabel = isDraftAccepting ? "РЎРѕС…СЂР°РЅСЏСЋ" : draft ? "РџСЂРёРЅСЏС‚СЊ" : isVisitNoteDirty ? "РЎРѕС…СЂР°РЅРёС‚СЊ" : "РЎРѕС…СЂР°РЅРµРЅРѕ";
  const visitNoteStatusLabel = draft ? "С‡РµСЂРЅРѕРІРёРє РіРѕС‚РѕРІ" : isVisitNoteDirty ? "РµСЃС‚СЊ РїСЂР°РІРєРё" : "СЃРѕС…СЂР°РЅРµРЅРѕ";
  const visitHasSavedNote = hasVisitNoteFormText && !draft && !isVisitNoteDirty;
  const visitWorkflowSteps: Array<{
    key: string;
    label: string;
    detail: string;
    state: "ready" | "active" | "locked";
  }> = [
    {
      key: "dictation",
      label: "Р”РёРєС‚РѕРІРєР°",
      detail: hasVisitTranscriptText ? "С‚РµРєСЃС‚ РµСЃС‚СЊ" : "РЅР°С‡РЅРёС‚Рµ РіРѕР»РѕСЃРѕРј РёР»Рё С‚РµРєСЃС‚РѕРј",
      state: hasVisitTranscriptText ? "ready" : "active"
    },
    {
      key: "draft",
      label: "Р§РµСЂРЅРѕРІРёРє",
      detail: draft ? "РїСЂРѕРІРµСЂСЊС‚Рµ СЂРµР·СѓР»СЊС‚Р°С‚" : isVisitNoteDirty ? "РµСЃС‚СЊ СЂСѓС‡РЅС‹Рµ РїСЂР°РІРєРё" : "СЃРѕР±РµСЂРёС‚Рµ РёР· РґРёРєС‚РѕРІРєРё",
      state: draft || isVisitNoteDirty ? "ready" : hasVisitTranscriptText ? "active" : "locked"
    },
    {
      key: "emk",
      label: "Р­РњРљ",
      detail: visitHasSavedNote ? "Р·Р°РїРёСЃСЊ СЃРѕС…СЂР°РЅРµРЅР°" : visitNoteReadyToAccept ? "РѕСЃС‚Р°Р»РѕСЃСЊ РїРѕРґС‚РІРµСЂРґРёС‚СЊ" : "Р¶РґРµС‚ С‡РµСЂРЅРѕРІРёРє",
      state: visitHasSavedNote ? "ready" : visitNoteReadyToAccept ? "active" : "locked"
    },
    {
      key: "close",
      label: "Р—Р°РєСЂС‹С‚РёРµ",
      detail: visitCloseChecklist?.readyToSign ? "РіРѕС‚РѕРІРѕ" : primaryVisitWarning?.title ?? "РїСЂРѕРІРµСЂРєР° РІ РєРѕРЅС†Рµ",
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
        label: isVisitDictating ? "РЎР»СѓС€Р°СЋ" : "РќР°С‡Р°С‚СЊ РґРёРєС‚РѕРІРєСѓ",
        detail: "РњРѕР¶РЅРѕ СЃСЂР°Р·Сѓ РіРѕРІРѕСЂРёС‚СЊ. Р•СЃР»Рё РјРёРєСЂРѕС„РѕРЅ РЅРµ РѕС‚РєСЂРѕРµС‚СЃСЏ, РїРѕР»Рµ РґРёРєС‚РѕРІРєРё РѕСЃС‚Р°РµС‚СЃСЏ РґРѕСЃС‚СѓРїРЅС‹Рј РґР»СЏ С‚РµРєСЃС‚Р°.",
        disabled: isVisitDictating,
        onClick: startVisitDictation
      }
    : !draft && !isVisitNoteDirty
      ? {
          kind: "draft",
          label: isDraftLoading ? "РЎРѕР±РёСЂР°СЋ" : "РЎРѕР±СЂР°С‚СЊ С‡РµСЂРЅРѕРІРёРє",
          detail: "РЎРёСЃС‚РµРјР° СЂР°Р·Р»РѕР¶РёС‚ РґРёРєС‚РѕРІРєСѓ РїРѕ РїРѕР»СЏРј Р­РњРљ, РІСЂР°С‡ РїРѕС‚РѕРј РїСЂРѕРІРµСЂРёС‚ Рё СЃРѕС…СЂР°РЅРёС‚.",
          disabled: isDraftLoading || !visitDraftReadyToBuild,
          onClick: () => void buildDraft()
        }
      : !visitHasSavedNote
        ? {
            kind: "save",
            label: visitNoteActionLabel,
            detail: "РџСЂРѕРІРµСЂСЊС‚Рµ РїРѕР»СЏ Р­РњРљ Рё СЃРѕС…СЂР°РЅРёС‚Рµ Р·Р°РїРёСЃСЊ РїСЂРёРµРјР°.",
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
              label: "РџСЂРѕРІРµСЂРёС‚СЊ Р·Р°РєСЂС‹С‚РёРµ",
              detail: visitCloseChecklist?.nextAction ?? "Р¤РёРЅР°Р»СЊРЅР°СЏ РїСЂРѕРІРµСЂРєР° РѕРїР»Р°С‚С‹, РґРѕРєСѓРјРµРЅС‚РѕРІ Рё РїРѕРґРїРёСЃРё РїСЂРёРµРјР°.",
              onClick: () => scrollToVisitArea(".close-checklist")
            };
  const speechRecoveryIssueCount =
    (speechRecordingRecovery?.recordings || []).filter((recording) => recording.recoveryState !== "complete").length ?? 0;
  const speechRecoveryQualityIssueCount =
    speechRecordingRecovery?.recordings?.reduce(
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
      ? "Р Р°СЃРїРѕР·РЅР°С‚СЊ Р»РѕРєР°Р»СЊРЅРѕ"
      : "Р Р°СЃРїРѕР·РЅР°С‚СЊ РЅР° СЃРµСЂРІРµСЂРµ"
    : "РЎРѕС…СЂР°РЅРёС‚СЊ РІ РѕС‡РµСЂРµРґСЊ";
  const pendingSpeechFlushActionLabel = speechRecognitionReady ? "РћС‚РїСЂР°РІРёС‚СЊ Р·РІСѓРє" : "РџСЂРѕРІРµСЂРёС‚СЊ РѕС‡РµСЂРµРґСЊ";
  const pendingSpeechFlushActionTitle =
    speechRecognitionReady
      ? "РћС‚РїСЂР°РІРёС‚СЊ СЃРѕС…СЂР°РЅРµРЅРЅС‹Рµ Р°СѓРґРёРѕС„СЂР°РіРјРµРЅС‚С‹ РЅР° СЂР°СЃРїРѕР·РЅР°РІР°РЅРёРµ."
      : "РџСЂРѕРІРµСЂРёС‚СЊ РіРѕС‚РѕРІРЅРѕСЃС‚СЊ СЂР°СЃРїРѕР·РЅР°РІР°РЅРёСЏ. РђСѓРґРёРѕ РѕСЃС‚Р°РЅРµС‚СЃСЏ РІ Р»РѕРєР°Р»СЊРЅРѕР№ РѕС‡РµСЂРµРґРё, РїРѕРєР° РёСЃС‚РѕС‡РЅРёРє РЅРµРґРѕСЃС‚СѓРїРµРЅ.";
  const speechSafetyValue = pendingSpeechChunkCount
    ? `${pendingSpeechChunkCount} Р°СѓРґРёРѕ`
    : currentSpeechQualityIssue
      ? speechQualityLabels[currentSpeechQualityIssue.level]
      : speechRecognitionReady
        ? speechGatewayActiveProviderIsLocal
          ? "Р»РѕРєР°Р»СЊРЅС‹Р№ РјРѕРґСѓР»СЊ РіРѕС‚РѕРІ"
          : "СЂР°СЃРїРѕР·РЅР°РІР°РЅРёРµ РіРѕС‚РѕРІРѕ"
        : "РѕС‡РµСЂРµРґСЊ Р»РѕРєР°Р»СЊРЅРѕ";
  const speechSafetyDetail = pendingSpeechChunkCount
    ? "Р°СѓРґРёРѕ СЃРѕС…СЂР°РЅРµРЅРѕ Рё СѓР№РґРµС‚ РїРѕР·Р¶Рµ"
    : currentSpeechQualityIssue
      ? currentSpeechQualityIssue.nextAction
      : speechRecognitionReady
        ? speechGatewayActiveProviderIsLocal
          ? `${speechGatewayStatus?.providerLabel ?? "Р»РѕРєР°Р»СЊРЅС‹Р№ РјРѕРґСѓР»СЊ"}, С„СЂР°РіРјРµРЅС‚С‹ СѓС…РѕРґСЏС‚ РІ Р»РѕРєР°Р»СЊРЅС‹Р№ РјРѕРґСѓР»СЊ`
          : `${speechGatewayStatus?.providerLabel ?? "СЂР°СЃРїРѕР·РЅР°РІР°РЅРёРµ"}, Р·РІСѓРє РѕС‚РїСЂР°РІР»СЏРµС‚СЃСЏ С‡Р°СЃС‚СЏРјРё`
        : "Р°СѓРґРёРѕ С…СЂР°РЅРёС‚СЃСЏ Р»РѕРєР°Р»СЊРЅРѕ РґРѕ РіРѕС‚РѕРІРѕРіРѕ РёСЃС‚РѕС‡РЅРёРєР°";
  const speechSafetyState =
    pendingSpeechChunkCount || currentSpeechQualityIssue || !isOnline || !speechUploadReady
      ? "warn"
      : "ready";
  const browserContinuityCritical =
    browserContinuity !== null && (!browserContinuity.localStorageWritable || !browserContinuity.indexedDbSupported);
  const browserContinuityValue = !browserContinuity
    ? "РїСЂРѕРІРµСЂРєР°"
    : browserContinuityCritical
      ? "РѕРіСЂР°РЅРёС‡РµРЅРѕ"
      : isOnline
        ? "РѕРЅР»Р°Р№РЅ"
        : "РѕС„Р»Р°Р№РЅ";
  const browserContinuityDetail = !browserContinuity
    ? "РїСЂРѕРІРµСЂСЏСЋ Р»РѕРєР°Р»СЊРЅРѕРµ С…СЂР°РЅРёР»РёС‰Рµ"
    : browserContinuityCritical
      ? browserContinuity.warnings.slice(0, 2).join(", ") || "Р»РѕРєР°Р»СЊРЅР°СЏ Р·Р°С‰РёС‚Р° РѕРіСЂР°РЅРёС‡РµРЅР°"
      : `${browserContinuity.localStorageWritable ? "С‡РµСЂРЅРѕРІРёРєРё РѕРє" : "С‡РµСЂРЅРѕРІРёРєРё РІС‹РєР»."} В· ${
          browserContinuity.indexedDbSupported ? "РѕС‡РµСЂРµРґСЊ Р°СѓРґРёРѕ РѕРє" : "РѕС‡РµСЂРµРґСЊ Р°СѓРґРёРѕ РІС‹РєР»."
        }`;
  const browserContinuityState = !browserContinuity ? "busy" : browserContinuityCritical ? "warn" : "ready";
  const browserCanRequestPersistentStorage =
    typeof navigator !== "undefined" && Boolean(navigator.storage) && typeof navigator.storage.persist === "function";
  const browserContinuityChecks = [
    {
      label: "Р›РѕРєР°Р»СЊРЅС‹Рµ С‡РµСЂРЅРѕРІРёРєРё",
      value: browserContinuity?.localStorageWritable ? "РѕРє" : browserContinuity ? "РІС‹РєР»." : "РїСЂРѕРІРµСЂРєР°",
      detail: lastLocalSavedAt ? `РїРѕСЃР»РµРґРЅРµРµ ${formatTime(lastLocalSavedAt)}` : "РїСЂРѕРІРµСЂРєР° Р°РІС‚РѕСЃРѕС…СЂР°РЅРµРЅРёСЏ"
    },
    {
      label: "РћС‡РµСЂРµРґСЊ Р°СѓРґРёРѕ",
      value: browserContinuity?.indexedDbSupported ? "РѕРє" : browserContinuity ? "РІС‹РєР»." : "РїСЂРѕРІРµСЂРєР°",
      detail: pendingSpeechChunkCount ? `С„СЂР°РіРјРµРЅС‚РѕРІ РІ РѕС‡РµСЂРµРґРё: ${pendingSpeechChunkCount}` : "Р°СѓРґРёРѕ СЃРѕС…СЂР°РЅРёС‚СЃСЏ РґР»СЏ РѕС‚РїСЂР°РІРєРё РїРѕР·Р¶Рµ"
    },
    {
      label: "Р’С‹Р±РѕСЂ Р»РѕРєР°Р»СЊРЅРѕР№ РљРў",
      value: browserContinuity?.directoryPickerSupported ? "РїР°РїРєР°" : browserContinuity?.filePickerSupported ? "С„Р°Р№Р»С‹" : browserContinuity ? "РѕРіСЂР°РЅРёС‡РµРЅРѕ" : "РїСЂРѕРІРµСЂРєР°",
      detail: browserContinuity?.directoryPickerSupported
        ? "РґРѕСЃС‚СѓРї Рє РїР°РїРєРµ С‚РѕР»СЊРєРѕ РїРѕСЃР»Рµ РІС‹Р±РѕСЂР° РїРѕР»СЊР·РѕРІР°С‚РµР»РµРј; CRM РЅРµ СЃРѕС…СЂР°РЅСЏРµС‚ С‚СЏР¶РµР»С‹Рµ РґР°РЅРЅС‹Рµ СЃРЅРёРјРєРѕРІ"
        : browserContinuity?.filePickerSupported
          ? "РјРѕР¶РЅРѕ РІС‹Р±СЂР°С‚СЊ С„Р°Р№Р»С‹ РІСЂСѓС‡РЅСѓСЋ; РїРѕСЃС‚РѕСЏРЅРЅС‹Р№ РґРѕСЃС‚СѓРї Рє РїР°РїРєРµ РЅРµ СЃРѕС…СЂР°РЅСЏРµС‚СЃСЏ"
          : "РёСЃРїРѕР»СЊР·СѓР№С‚Рµ СЃРµСЂРІРµСЂРЅС‹Р№ РїСѓС‚СЊ, РЅР°СЃС‚РѕР»СЊРЅС‹Р№ РјРѕРґСѓР»СЊ РёР»Рё РІРЅРµС€РЅРёР№ РїСЂРѕСЃРјРѕС‚СЂ"
    },
    {
      label: "OPFS Р±СЂР°СѓР·РµСЂР°",
      value: browserContinuity?.opfsSupported ? "РґРѕСЃС‚СѓРїРЅРѕ" : browserContinuity ? "РЅРµС‚" : "РїСЂРѕРІРµСЂРєР°",
      detail: browserContinuity?.opfsSupported
        ? "СЃРёРЅС…СЂРѕРЅРЅС‹Р№ С„Р°Р№Р»РѕРІС‹Р№ РґРѕСЃС‚СѓРї С‚РѕР»СЊРєРѕ РІ worker; РґРёР°РіРЅРѕСЃС‚РёС‡РµСЃРєРѕРµ С…СЂР°РЅРµРЅРёРµ РІ CRM РѕС‚РєР»СЋС‡РµРЅРѕ"
        : "С‚РµРєСѓС‰РµРµ РІРѕСЃСЃС‚Р°РЅРѕРІР»РµРЅРёРµ РљРў РЅРµ С‚СЂРµР±СѓРµС‚ OPFS"
    },
    {
      label: "Р“СЂР°РЅРёС†Р° РљРў-С…СЂР°РЅРёР»РёС‰Р°",
      value: browserContinuity?.browserCtOfflineStorageBoundary.mode === "metadata_only" ? "РјРµС‚Р°РґР°РЅРЅС‹Рµ" : browserContinuity ? "РѕРіСЂР°РЅРёС‡РµРЅРѕ" : "РїСЂРѕРІРµСЂРєР°",
      detail:
        browserContinuity?.browserCtOfflineStorageBoundary.mode === "metadata_only"
          ? "Р»РѕРєР°Р»СЊРЅРѕ СЃРѕС…СЂР°РЅСЏСЋС‚СЃСЏ РїР»Р°РЅ РѕС‚РєСЂС‹С‚РёСЏ, СЃРѕСЃС‚РѕСЏРЅРёРµ Рё РїРѕРјРµС‚РєРё; С‚СЏР¶РµР»С‹Рµ РґР°РЅРЅС‹Рµ СЃРЅРёРјРєРѕРІ Рё 3D-РјРѕРґРµР»РµР№ РѕСЃС‚Р°СЋС‚СЃСЏ РІРѕ РІРЅРµС€РЅРµРј РїСЂРѕСЃРјРѕС‚СЂРµ"
          : "Р»РѕРєР°Р»СЊРЅРѕРµ РІРѕСЃСЃС‚Р°РЅРѕРІР»РµРЅРёРµ РљРў РЅРµ РїРѕРґС‚РІРµСЂР¶РґРµРЅРѕ"
    },
    {
      label: "Р Р°Р±РѕС‚Р° Р±РµР· СЃРµС‚Рё",
      value: browserContinuity ? browserContinuityRegistrationLabels[browserContinuity.serviceWorkerRegistrationState] : "РїСЂРѕРІРµСЂРєР°",
      detail: browserContinuity?.serviceWorkerControlled ? "СЌС‚Р° РІРєР»Р°РґРєР° РіРѕС‚РѕРІР° Рє СЂР°Р±РѕС‚Рµ Р±РµР· СЃРµС‚Рё" : "РѕР±РЅРѕРІРёС‚Рµ РІРєР»Р°РґРєСѓ РїРѕСЃР»Рµ РІРєР»СЋС‡РµРЅРёСЏ РѕС„Р»Р°Р№РЅ-СЂРµР¶РёРјР°"
    },
    {
      label: "РџР°РјСЏС‚СЊ РґР»СЏ РѕС„Р»Р°Р№РЅР°",
      value: browserContinuity?.cacheStorageSupported ? "РѕРє" : browserContinuity ? "РІС‹РєР»." : "РїСЂРѕРІРµСЂРєР°",
      detail: browserContinuity?.storagePersisted === true ? "Р±СЂР°СѓР·РµСЂ РЅРµ РґРѕР»Р¶РµРЅ РѕС‡РёС‰Р°С‚СЊ С‡РµСЂРЅРѕРІРёРєРё СЃР°Рј" : "Р±СЂР°СѓР·РµСЂ РјРѕР¶РµС‚ РѕС‡РёСЃС‚РёС‚СЊ РїСЂРё РЅРµС…РІР°С‚РєРµ РјРµСЃС‚Р°"
    },
    {
      label: "РњРµСЃС‚Рѕ",
      value: formatMegabytes(browserContinuity?.storageUsageMb ?? null),
      detail: browserContinuity?.storageQuotaMb != null ? `Р»РёРјРёС‚ ${formatMegabytes(browserContinuity.storageQuotaMb)}` : "РѕС†РµРЅРєР° РЅРµРґРѕСЃС‚СѓРїРЅР°"
    },
    {
      label: "РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ",
      value: isOnline ? "РѕРЅР»Р°Р№РЅ" : "РѕС„Р»Р°Р№РЅ",
      detail: pendingVisitSaveCount ? `РІ РѕС‡РµСЂРµРґРё СЃРѕС…СЂР°РЅРµРЅРёР№ РїСЂРёРµРјР°: ${pendingVisitSaveCount}` : "СЃРµСЂРІРµСЂРЅР°СЏ РѕС‡РµСЂРµРґСЊ РїСѓСЃС‚Р°"
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
    ? "РїСЂРѕРІРµСЂРєР°"
    : localBridgeReadiness.readyCount
      ? `РіРѕС‚РѕРІРѕ ${localBridgeReadiness.readyCount}/${localBridgeReadiness.bridges.length}`
      : localBridgeReadiness.configuredCount
        ? "РЅР°СЃС‚СЂРѕРµРЅРѕ"
        : "РЅРµ Р·Р°РґР°РЅРѕ";
  const visitSafetyCards: Array<{ key: string; label: string; value: string; detail: string; state: "ready" | "warn" | "busy" }> = [
    {
      key: "local",
      label: "Р›РѕРєР°Р»СЊРЅРѕ",
      value: lastLocalSavedAt ? formatTime(lastLocalSavedAt) : localAutosaveReady ? "РІРєР»СЋС‡РµРЅРѕ" : "Р·Р°РіСЂСѓР·РєР°",
      detail: localDraftWasRestored ? "С‡РµСЂРЅРѕРІРёРє РІРѕСЃСЃС‚Р°РЅРѕРІР»РµРЅ РЅР° СЌС‚РѕРј СѓСЃС‚СЂРѕР№СЃС‚РІРµ" : "Р°РІС‚РѕСЃРѕС…СЂР°РЅРµРЅРёРµ РЅР° СЌС‚РѕРј СѓСЃС‚СЂРѕР№СЃС‚РІРµ",
      state: lastLocalSavedAt || localAutosaveReady ? "ready" : "busy"
    },
    {
      key: "server",
      label: "РЎРµСЂРІРµСЂ",
      value:
        serverDraftSyncState === "saving"
          ? "СЃРѕС…СЂР°РЅСЏРµС‚"
          : serverDraftSyncState === "saved" && lastServerDraftSavedAt
            ? formatTime(lastServerDraftSavedAt)
            : serverDraftSyncState === "queued" || serverDraftSyncState === "error"
              ? "РїРѕРІС‚РѕСЂРёС‚"
              : "РіРѕС‚РѕРІ",
      detail: pendingVisitSaveCount ? `${pendingVisitSaveCount} СЃРѕС…СЂР°РЅРµРЅРёРµ РѕР¶РёРґР°РµС‚ СЃРёРЅС…СЂРѕРЅРёР·Р°С†РёСЋ` : "СЃРµСЂРІРµСЂРЅС‹Р№ С‡РµСЂРЅРѕРІРёРє РІРєР»СЋС‡РµРЅ",
      state: serverDraftSyncState === "saving" ? "busy" : pendingVisitSaveCount || serverDraftSyncState === "queued" || serverDraftSyncState === "error" ? "warn" : "ready"
    },
    {
      key: "browser",
      label: "РЈСЃС‚СЂРѕР№СЃС‚РІРѕ",
      value: browserContinuityValue,
      detail: browserContinuityDetail,
      state: browserContinuityState
    },
    {
      key: "stt",
      label: "Р“РѕР»РѕСЃ",
      value: speechSafetyValue,
      detail: speechSafetyDetail,
      state: speechSafetyState
    },
    {
      key: "recovery",
      label: "Р’РѕСЃСЃС‚Р°РЅРѕРІР»РµРЅРёРµ",
      value: speechRecoveryIssueCount ? "РїСЂРѕРІРµСЂРёС‚СЊ" : speechRecordingRecovery ? "С‡РёСЃС‚Рѕ" : "СЃРєРѕСЂРѕ",
      detail: speechRecoveryQualityIssueCount
        ? `${speechRecoveryQualityIssueCount} С„СЂР°РіРј. СЂР°СЃРїРѕР·РЅР°РІР°РЅРёСЏ РЅР° РїСЂРѕРІРµСЂРєСѓ`
        : speechRecoveryIssueCount
          ? `${speechRecoveryIssueCount} Р·Р°РїРёСЃСЊ С‚СЂРµР±СѓРµС‚ РІРЅРёРјР°РЅРёСЏ`
          : "РїРѕС‚РµСЂСЊ РґРёРєС‚РѕРІРєРё РЅРµ РІРёРґРЅРѕ",
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
      setError("Р”РѕР±Р°РІСЊС‚Рµ С‚РµРєСЃС‚ РґРёРєС‚РѕРІРєРё РїРµСЂРµРґ Р»РѕРєР°Р»СЊРЅС‹Рј СЂР°Р·Р±РѕСЂРѕРј.");
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
    if (warning.actionLabel.toLowerCase().includes("СЃРІСЏР·")) {
      window.location.hash = "communications";
      return;
    }
    if (warning.actionLabel.toLowerCase().includes("РѕРїР»Р°С‚")) {
      window.location.hash = "finance";
      return;
    }
    if (warning.actionLabel.toLowerCase().includes("РґРѕРєСѓРјРµРЅС‚")) {
      window.location.hash = "documents";
      return;
    }
    if (warning.actionLabel.toLowerCase().includes("СЂРѕР»СЊ")) {
      window.location.hash = "settings";
      setSettingsTab("clinic");
      return;
    }
    if (warning.actionLabel.toLowerCase().includes("РїР°С†РёРµРЅС‚")) {
      window.location.hash = "patients";
      return;
    }
    window.location.hash = "visit";
  }

  async function createPatient() {
    if (isPatientCreating) {
      setError("Р”РѕР¶РґРёС‚РµСЃСЊ Р·Р°РІРµСЂС€РµРЅРёСЏ СЃРѕР·РґР°РЅРёСЏ РєР°СЂС‚РѕС‡РєРё РїР°С†РёРµРЅС‚Р°.");
      return;
    }
    const fullName = newPatientName.trim();
    if (!fullName) {
      setError("РЈРєР°Р¶РёС‚Рµ Р¤РРћ РїР°С†РёРµРЅС‚Р° РїРµСЂРµРґ СЃРѕР·РґР°РЅРёРµРј РєР°СЂС‚РѕС‡РєРё.");
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
      setError(await responseErrorMessage(response, "РџР°С†РёРµРЅС‚ РЅРµ СЃРѕР·РґР°РЅ"));
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
      setError(operatorWorkflowFailureMessage("РџР°С†РёРµРЅС‚ РЅРµ СЃРѕР·РґР°РЅ", patientError));
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
              clinicName: clinicSettings?.profile?.clinicName ?? "",
              clinicSettings
            }
          : current
      );
      setClinicProfileDraft(clinicProfileDraftFromProfile(clinicSettings?.profile));
      setClinicProfileDirty(false);
      setClinicProfileSaveState("saved");
      return;
    }
    if (!response.ok) {
      setError(await responseErrorMessage(response, "Р РµР¶РёРј РєР»РёРЅРёРєРё РЅРµ СЃРѕС…СЂР°РЅРµРЅ"));
      return;
    }
    await loadDashboard();
    } catch (modeError) {
      setError(operatorWorkflowFailureMessage("Р РµР¶РёРј РєР»РёРЅРёРєРё РЅРµ СЃРѕС…СЂР°РЅРµРЅ", modeError));
    }
  }

  async function addStaffMember(role: StaffRole) {
    const fullName = newStaffName.trim();
    if (!fullName) {
      setError("Р’РІРµРґРёС‚Рµ Р¤РРћ СЃРѕС‚СЂСѓРґРЅРёРєР° РїРµСЂРµРґ РґРѕР±Р°РІР»РµРЅРёРµРј РІ РєРѕРјР°РЅРґСѓ.");
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
      setError(await responseErrorMessage(response, "РЎРѕС‚СЂСѓРґРЅРёРє РЅРµ РґРѕР±Р°РІР»РµРЅ"));
      return;
    }
    setNewStaffName("");
    setNewStaffRole("doctor");
    setNewStaffSpecialty(selectedSpecialty);
    await loadDashboard();
    } catch (staffError) {
      setError(operatorWorkflowFailureMessage("РЎРѕС‚СЂСѓРґРЅРёРє РЅРµ РґРѕР±Р°РІР»РµРЅ", staffError));
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
        setError(await responseErrorMessage(response, "Р Р°СЃРїРёСЃР°РЅРёРµ СЃРѕС‚СЂСѓРґРЅРёРєР° РЅРµ СЃРѕС…СЂР°РЅРµРЅРѕ"));
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
      setError(operatorWorkflowFailureMessage("Р Р°СЃРїРёСЃР°РЅРёРµ СЃРѕС‚СЂСѓРґРЅРёРєР° РЅРµ СЃРѕС…СЂР°РЅРµРЅРѕ", scheduleSaveError));
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
        setError(await responseErrorMessage(response, "Р Р°СЃРїРёСЃР°РЅРёРµ РєСЂРµСЃР»Р° РЅРµ СЃРѕС…СЂР°РЅРµРЅРѕ"));
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
      setError(operatorWorkflowFailureMessage("Р Р°СЃРїРёСЃР°РЅРёРµ РєСЂРµСЃР»Р° РЅРµ СЃРѕС…СЂР°РЅРµРЅРѕ", scheduleSaveError));
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
      setError("Р”РѕР¶РґРёС‚РµСЃСЊ Р·Р°РІРµСЂС€РµРЅРёСЏ С‚РµРєСѓС‰РµРіРѕ СЃРѕС…СЂР°РЅРµРЅРёСЏ Р·Р°РїРёСЃРё.");
      return false;
    }
    const draft = appointmentScheduleDrafts[appointmentId];
    if (!draft) {
      const message = "РћС‚РєСЂРѕР№С‚Рµ Р·Р°РїРёСЃСЊ РІ СЂР°СЃРїРёСЃР°РЅРёРё РїРµСЂРµРґ СЃРѕС…СЂР°РЅРµРЅРёРµРј.";
      setAppointmentScheduleErrors((current) => ({ ...current, [appointmentId]: message }));
      setAppointmentScheduleSaveStates((current: any) => ({ ...current, [appointmentId]: "error" }));
      setError(message);
      return false;
    }
    const isOmni = dashboard?.clinicSettings?.profile?.isOmniRole ?? false;
    const missing = appointmentScheduleMissingFields(draft, isOmni, dashboard?.clinicSettings?.staff);
    if (missing.length) {
      const message = `РџРµСЂРµРґ СЃРѕС…СЂР°РЅРµРЅРёРµРј Р·Р°РїРёСЃРё: ${missing.join("; ")}.`;
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
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Р—Р°РїРёСЃСЊ РЅРµ СЃРѕС…СЂР°РЅРµРЅР°"));
      const payload = await response.json(); console.log("MISSING_KEYS:", Object.keys(payload).filter(k => !payload[k]));
      const nextDashboard = payload as any;
      setDashboard(nextDashboard);
      const savedAppointment = nextDashboard.appointments?.find((appointment) => appointment.id === appointmentId);
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
      const message = operatorWorkflowFailureMessage("Р—Р°РїРёСЃСЊ РЅРµ СЃРѕС…СЂР°РЅРµРЅР°", saveError);
      setAppointmentScheduleErrors((current) => ({ ...current, [appointmentId]: message }));
      setAppointmentScheduleSaveStates((current: any) => ({ ...current, [appointmentId]: "error" }));
      setError(message);
      return false;
    }
  }

  function newAppointmentMissingFields(draft: AppointmentScheduleDraft): string[] {
    const isOmni = dashboard?.clinicSettings?.profile?.isOmniRole ?? false;
    return appointmentScheduleMissingFields(draft, isOmni, dashboard?.clinicSettings?.staff);
  }

  async function createAppointmentFromDraft(): Promise<boolean> {
    if (!dashboard) {
      setError("Р”Р°РЅРЅС‹Рµ РєР»РёРЅРёРєРё РµС‰Рµ РЅРµ Р·Р°РіСЂСѓР¶РµРЅС‹. РџРѕРІС‚РѕСЂРёС‚Рµ СЃРѕР·РґР°РЅРёРµ Р·Р°РїРёСЃРё РїРѕСЃР»Рµ Р·Р°РіСЂСѓР·РєРё СЂР°Р±РѕС‡РµРіРѕ СЌРєСЂР°РЅР°.");
      return false;
    }
    if (newAppointmentSaveState === "saving") {
      setError("Р”РѕР¶РґРёС‚РµСЃСЊ Р·Р°РІРµСЂС€РµРЅРёСЏ С‚РµРєСѓС‰РµРіРѕ СЃРѕР·РґР°РЅРёСЏ Р·Р°РїРёСЃРё.");
      return false;
    }
    const missing = newAppointmentMissingFields(newAppointmentDraft);
    if (missing.length) {
      const message = `РџРµСЂРµРґ СЃРѕР·РґР°РЅРёРµРј Р·Р°РїРёСЃРё: ${missing.join("; ")}.`;
      setNewAppointmentError(message);
      setNewAppointmentSaveState("error");
      setError(message);
      return false;
    }
    setNewAppointmentSaveState("saving");
    setNewAppointmentError(null);
    const previousIds = new Set((dashboard?.appointments ?? []).map((appointment) => appointment.id));
    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: scheduleMutationHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(appointmentCreateInputFromDraft(newAppointmentDraft))
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Р—Р°РїРёСЃСЊ РЅРµ СЃРѕР·РґР°РЅР°"));
      const payload = await response.json(); console.log("MISSING_KEYS:", Object.keys(payload).filter(k => !payload[k]));
      const nextDashboard = payload as any;
      const createdAppointment = nextDashboard.appointments?.find((appointment) => !previousIds.has(appointment.id)) ?? null;
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
      const message = operatorWorkflowFailureMessage("Р—Р°РїРёСЃСЊ РЅРµ СЃРѕР·РґР°РЅР°", createError);
      setNewAppointmentError(message);
      setNewAppointmentSaveState("error");
      setError(message);
      return false;
    }
  }

  async function addChair() {
    const name = newChairName.trim();
    if (!name) {
      setError("Р’РІРµРґРёС‚Рµ РЅР°Р·РІР°РЅРёРµ РєСЂРµСЃР»Р° РёР»Рё РєР°Р±РёРЅРµС‚Р° РїРµСЂРµРґ РґРѕР±Р°РІР»РµРЅРёРµРј.");
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
      setError(await responseErrorMessage(response, "РљСЂРµСЃР»Рѕ РЅРµ РґРѕР±Р°РІР»РµРЅРѕ"));
      return;
    }
    setNewChairName("");
    setNewChairHasXraySensor(true);
    setNewChairHasMicroscope(false);
    setNewChairHasSurgeryKit(false);
    await loadDashboard();
    } catch (chairError) {
      setError(operatorWorkflowFailureMessage("РљСЂРµСЃР»Рѕ РЅРµ РґРѕР±Р°РІР»РµРЅРѕ", chairError));
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
      setError("Р’СЃС‚Р°РІСЊС‚Рµ С‚РµРєСЃС‚, OCR РёР»Рё РґРёРєС‚РѕРІРєСѓ РїРµСЂРµРґ СЂР°СЃРїРѕР·РЅР°РІР°РЅРёРµРј.");
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
          sourceLabel: `РќР°СЃС‚СЂРѕР№РєРё: ${aiJobKindLabels[recognitionKind]}`,
          patientId: activePatient?.id ?? null
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "Р Р°СЃРїРѕР·РЅР°РІР°РЅРёРµ РЅРµ РїРѕРґРіРѕС‚РѕРІР»РµРЅРѕ"));
      }
      const result = (await response.json()) as AiRecognitionJobResponse;
      setRecognitionJob(result.job);
      await loadDashboard();
    } catch (recognitionError) {
      setError(operatorWorkflowFailureMessage("Р Р°СЃРїРѕР·РЅР°РІР°РЅРёРµ РЅРµ РїРѕРґРіРѕС‚РѕРІР»РµРЅРѕ", recognitionError));
    } finally {
      setIsRecognitionLoading(false);
    }
  }

  async function analyzePricelist() {
    if (!pricelistText.trim() && !pricelistImageBase64) {
      setError("Р’СЃС‚Р°РІСЊС‚Рµ РїСЂР°Р№СЃ-Р»РёСЃС‚ РёР»Рё Р·Р°РіСЂСѓР·РёС‚Рµ С„РѕС‚Рѕ РїСЂР°Р№СЃР° РїРµСЂРµРґ СЂР°Р·Р±РѕСЂРѕРј.");
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
        throw new Error(await responseErrorMessage(response, "РџСЂР°Р№СЃ РЅРµ СЂР°Р·РѕР±СЂР°РЅ"));
      }
      setPricelistAnalysis((await response.json()) as DentalPricelistAnalysisResponse);
    } catch (priceError) {
      setError(operatorWorkflowFailureMessage("РџСЂР°Р№СЃ РЅРµ СЂР°Р·РѕР±СЂР°РЅ", priceError));
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
      setError(operatorWorkflowFailureMessage("Р¤РѕС‚Рѕ РїСЂР°Р№СЃР° РЅРµ РїРѕРґРіРѕС‚РѕРІР»РµРЅРѕ", imageError));
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
      setError("Р¤Р°Р№Р» Р±РѕР»СЊС€Рµ 8 РњР‘. Р”Р»СЏ Р±РѕР»СЊС€РёС… Р°СЂС…РёРІРѕРІ РЅСѓР¶РµРЅ РїР°РєРµС‚РЅС‹Р№ РёРјРїРѕСЂС‚ РЅР° СЃРµСЂРІРµСЂРµ РёР»Рё СЂР°СЃРїРѕР·РЅР°РІР°РЅРёРµ С‡РµСЂРµР· Р»РѕРєР°Р»СЊРЅС‹Р№ РјРѕРґСѓР»СЊ РєР»РёРЅРёРєРё.");
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
        throw new Error(await responseErrorMessage(response, "Р¤Р°Р№Р» РЅРµ СЂР°Р·РѕР±СЂР°РЅ"));
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
          setPricelistImageNote(`${prepared.note} РџРѕР»СѓС‡РµРЅРѕ С‡РµСЂРµР· РѕР±С‰РёР№ РёРјРїРѕСЂС‚ С„Р°Р№Р»РѕРІ.`);
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
      setError(operatorWorkflowFailureMessage("Р¤Р°Р№Р» РЅРµ СЂР°Р·РѕР±СЂР°РЅ", ingestionError));
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
    setTranscript(
      [
        `${template.visitReason}.`,
        `Р–Р°Р»РѕР±С‹: ${template.complaintPrompt}`,
        `РћР±СЉРµРєС‚РёРІРЅРѕ: ${template.objectiveTemplate}`,
        `Р”РёР°РіРЅРѕР·С‹ Рє РїСЂРѕРІРµСЂРєРµ: ${template.diagnosisHints.join("; ")}`,
        `РџР»Р°РЅ: ${template.treatmentPlanTemplate}`,
        `Р”РѕРєСѓРјРµРЅС‚С‹: ${template.requiredDocuments.map((kind) => documentLabels[kind]).join(", ")}.`,
        `РЎРЅРёРјРєРё: ${template.suggestedImaging.map((kind) => imagingKindLabels[kind]).join(", ")}.`
      ].join("\n")
    );
  }

  async function polishTranscript() {
    if (!hasVisitTranscriptText) {
      setError("РџРµСЂРµРґ РѕС‡РёСЃС‚РєРѕР№ РґРёРєС‚РѕРІРєРё: РґРѕР±Р°РІСЊС‚Рµ С‚РµРєСЃС‚ РґРёРєС‚РѕРІРєРё РёР»Рё РЅР°Р¶РјРёС‚Рµ РіРѕР»РѕСЃРѕРІСѓСЋ Р·Р°РїРёСЃСЊ.");
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
        throw new Error(await responseErrorMessage(response, "РЎРµСЂРІРµСЂРЅР°СЏ РѕС‡РёСЃС‚РєР° РґРёРєС‚РѕРІРєРё РЅРµРґРѕСЃС‚СѓРїРЅР°"));
      }
      const result = (await response.json()) as SpeechTranscriptPolishResponse;
      setTranscript(result.normalizedTranscript);
      setDraft(result.draft);
      setVisitNoteForm(visitNoteFormFromDraft(result.draft));
      const polishLabel =
        result.polishMode === "deterministic_neural"
          ? `РР-РїРѕР»РёСЂРѕРІРєР° ${result.modelName ?? ""}`.trim()
          : "Р»РѕРєР°Р»СЊРЅР°СЏ РїСЂРѕРІРµСЂРєР° РїСЂР°РІРёР»";
      setSpeechStatusNote(
        result.changedPhrases.length
          ? `РўРµРєСЃС‚ РѕС‡РёС‰РµРЅ (${polishLabel}): ${result.changedPhrases.slice(0, 4).join(", ")}`
          : `РўРµРєСЃС‚ РїСЂРѕРІРµСЂРµРЅ (${polishLabel}): С„Р°РєС‚С‹ РЅРµ РґРѕР±Р°РІР»СЏР»РёСЃСЊ.`
      );
    } catch (polishError) {
      const local = normalizeDentalSpeechTranscript(transcript, selectedSpecialty);
      const localDraft = buildRuleBasedVisitDraftFromTranscript(local.normalizedText, selectedSpecialty, {
        sourceLabel: "Р›РѕРєР°Р»СЊРЅР°СЏ РѕС‡РёСЃС‚РєР° РґРёРєС‚РѕРІРєРё"
      });
      setTranscript(local.normalizedText);
      setDraft(localDraft);
      setVisitNoteForm(visitNoteFormFromDraft(localDraft));
      setSpeechStatusNote("РўРµРєСЃС‚ РѕС‡РёС‰РµРЅ Р»РѕРєР°Р»СЊРЅС‹Рј СЂР°Р·Р±РѕСЂРѕРј Р±РµР· СЃРµСЂРІРµСЂР°.");
      if (polishError instanceof Error) {
        setError(`${operatorWorkflowFailureMessage("РЎРµСЂРІРµСЂРЅР°СЏ РѕС‡РёСЃС‚РєР° РЅРµРґРѕСЃС‚СѓРїРЅР°", polishError)} РСЃРїРѕР»СЊР·РѕРІР°РЅ Р»РѕРєР°Р»СЊРЅС‹Р№ СЂР°Р·Р±РѕСЂ.`);
      }
    } finally {
      setIsTranscriptPolishing(false);
    }
  }

  async function buildDraft() {
    if (!dashboard || !activePatient || !hasVisitTranscriptText) {
      const missingSteps = [
        !dashboard ? "РґРѕР¶РґРёС‚РµСЃСЊ Р·Р°РіСЂСѓР·РєРё РїСЂРёРµРјР°" : null,
        ...visitDraftBuildMissingSteps
      ].filter((step): step is string => Boolean(step));
      setError(`РџРµСЂРµРґ СЃР±РѕСЂРєРѕР№ С‡РµСЂРЅРѕРІРёРєР°: ${missingSteps.join(", ")}.`);
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
          transcript,
          specialty: selectedSpecialty,
          source: "voice"
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "РЎРµСЂРІРµСЂРЅС‹Р№ С‡РµСЂРЅРѕРІРёРє РЅРµРґРѕСЃС‚СѓРїРµРЅ"));
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
      const fallbackDraft = buildOfflineVisitDraftFromTranscript(transcript, selectedSpecialty);
      setDraft(fallbackDraft);
      setVisitNoteForm(visitNoteFormFromDraft(fallbackDraft));
      scrollToVisitArea(".visit-note-panel");
      setError(`${operatorWorkflowFailureMessage("РЎРµСЂРІРµСЂРЅС‹Р№ С‡РµСЂРЅРѕРІРёРє РЅРµРґРѕСЃС‚СѓРїРµРЅ", draftError)} Р’РєР»СЋС‡РµРЅ РѕС„Р»Р°Р№РЅ-СЂР°Р·Р±РѕСЂ.`);
    } finally {
      setIsDraftLoading(false);
    }
  }

  async function acceptDraftToVisit() {
    if (!dashboard) {
      setError("Р”Р°РЅРЅС‹Рµ РїСЂРёРµРјР° РµС‰Рµ РЅРµ Р·Р°РіСЂСѓР¶РµРЅС‹. РџРѕРІС‚РѕСЂРёС‚Рµ СЃРѕС…СЂР°РЅРµРЅРёРµ РїРѕСЃР»Рµ Р·Р°РіСЂСѓР·РєРё СЂР°Р±РѕС‡РµРіРѕ СЌРєСЂР°РЅР°.");
      return;
    }
    if (!visitNoteReadyToAccept) {
      setError(`РџРµСЂРµРґ СЃРѕС…СЂР°РЅРµРЅРёРµРј РїСЂРёРµРјР°: ${visitNoteAcceptMissingSteps.join(", ")}.`);
      return;
    }
    setIsDraftAccepting(true);
    const acceptedDraft = visitNoteDraftFromForm(
      visitNoteForm,
      draft?.warnings ?? ["РџСЂР°РІРєРё РІРЅРµСЃРµРЅС‹ РІСЂР°С‡РѕРј РІСЂСѓС‡РЅСѓСЋ. РџРѕРґРїРёСЃСЊ РїСЂРёРµРјР° РѕСЃС‚Р°РµС‚СЃСЏ РѕС‚РґРµР»СЊРЅС‹Рј РґРµР№СЃС‚РІРёРµРј."]
    );
    const doctorSummary = acceptedDraft.warnings.join(" ");
    const clientMutationId = createLocalQueueId();
    const baseRevision = dashboard?.activeVisit?.revision ?? null;
    try {
      const result = await submitAcceptedVisitDraft(dashboard?.activeVisit?.id, acceptedDraft, doctorSummary, {
        clientMutationId,
        baseRevision,
        clientSavedAt: new Date().toISOString()
      });
      applyAcceptedVisitResponse(result);
      scrollToVisitArea(".visit-fields");
    } catch (acceptError) {
      if (!acceptedVisitSaveFailureIsRetryable(acceptError)) {
        setError(operatorWorkflowFailureMessage("РџСЂРёРµРј РЅРµ РїСЂРёРЅСЏС‚", acceptError));
        return;
      }
      const queued = await queuePendingVisitSave({
        visitId: dashboard?.activeVisit?.id,
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
        doctorSummary: doctorSummary || "Р§РµСЂРЅРѕРІРёРє Р­РњРљ РїСЂРёРЅСЏС‚ РІСЂР°С‡РѕРј Р»РѕРєР°Р»СЊРЅРѕ Рё РѕР¶РёРґР°РµС‚ СЃРёРЅС…СЂРѕРЅРёР·Р°С†РёСЋ.",
        updatedAt: queued.queuedAt
      };
      setDashboard((current) => (current ? { ...current, activeVisit: optimisticVisit } : current));
      setDraft(null);
      setVisitNoteForm(visitNoteFormFromVisit(optimisticVisit));
      scrollToVisitArea(".visit-fields");
      setError(`${operatorWorkflowFailureMessage("РЎРµСЂРІРµСЂРЅРѕРµ СЃРѕС…СЂР°РЅРµРЅРёРµ РЅРµРґРѕСЃС‚СѓРїРЅРѕ", acceptError)} РџСЂРёРµРј СЃРѕС…СЂР°РЅРµРЅ Р»РѕРєР°Р»СЊРЅРѕ Рё РїРѕСЃС‚Р°РІР»РµРЅ РІ РѕС‡РµСЂРµРґСЊ.`);
    } finally {
      setIsDraftAccepting(false);
    }
  }

  async function previewImport() {
    if (!importText.trim()) {
      setError("Р’СЃС‚Р°РІСЊС‚Рµ СЃРїРёСЃРѕРє РїР°С†РёРµРЅС‚РѕРІ, OCR Р¶СѓСЂРЅР°Р»Р° РёР»Рё РЅР°РґРёРєС‚СѓР№С‚Рµ РёРјРїРѕСЂС‚ РїРµСЂРµРґ РїСЂРѕРІРµСЂРєРѕР№.");
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
        throw new Error(await responseErrorMessage(response, "РРјРїРѕСЂС‚ РЅРµ РїСЂРѕРІРµСЂРµРЅ"));
      }
      const result = (await response.json()) as ImportIntakeResponse;
      setImportIntake(result);
      setImportPreview(result.preview);
      setImportText(result.normalizedText);
      setImportCommit(null);
    } catch (importError) {
      setError(operatorWorkflowFailureMessage("РРјРїРѕСЂС‚ РЅРµ РїСЂРѕРІРµСЂРµРЅ", importError));
    } finally {
      setIsImportLoading(false);
    }
  }

  async function commitImport() {
    if (isImportCommitting) {
      setError("Р”РѕР¶РґРёС‚РµСЃСЊ Р·Р°РІРµСЂС€РµРЅРёСЏ С‚РµРєСѓС‰РµР№ Р·Р°РїРёСЃРё РёРјРїРѕСЂС‚Р° РїР°С†РёРµРЅС‚РѕРІ.");
      return;
    }
    if (!importText.trim()) {
      setError("Р’СЃС‚Р°РІСЊС‚Рµ СЃРїРёСЃРѕРє РїР°С†РёРµРЅС‚РѕРІ, OCR Р¶СѓСЂРЅР°Р»Р° РёР»Рё РЅР°РґРёРєС‚СѓР№С‚Рµ РёРјРїРѕСЂС‚ РїРµСЂРµРґ Р·Р°РїРёСЃСЊСЋ.");
      return;
    }
    if (!importPreview) {
      setError("РЎРЅР°С‡Р°Р»Р° РїСЂРѕРІРµСЂСЊС‚Рµ РёРјРїРѕСЂС‚ РїР°С†РёРµРЅС‚РѕРІ, С‡С‚РѕР±С‹ СѓРІРёРґРµС‚СЊ РіРѕС‚РѕРІС‹Рµ Рё РїСЂРѕР±Р»РµРјРЅС‹Рµ СЃС‚СЂРѕРєРё.");
      return;
    }
    if (importPreview.readyRows === 0) {
      setError("Р’ РёРјРїРѕСЂС‚Рµ РїР°С†РёРµРЅС‚РѕРІ РЅРµС‚ РіРѕС‚РѕРІС‹С… СЃС‚СЂРѕРє. РСЃРїСЂР°РІСЊС‚Рµ РїСЂРµРґСѓРїСЂРµР¶РґРµРЅРёСЏ Рё РїРѕРІС‚РѕСЂРёС‚Рµ РїСЂРѕРІРµСЂРєСѓ.");
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
        throw new Error(await responseErrorMessage(response, "РРјРїРѕСЂС‚ РЅРµ Р·Р°РїРёСЃР°РЅ"));
      }
      const result = (await response.json()) as ImportCommitResponse;
      setImportCommit(result);
      setImportPreview(result.preview);
      await loadDashboard();
    } catch (importError) {
      setError(operatorWorkflowFailureMessage("РРјРїРѕСЂС‚ РЅРµ Р·Р°РїРёСЃР°РЅ", importError));
    } finally {
      setIsImportCommitting(false);
    }
  }

  async function previewSmartImportText(rawText: string, mode: SmartImportMode) {
    const cleanText = rawText.trim();
    if (!cleanText) {
      setError("Р’СЃС‚Р°РІСЊС‚Рµ РІС‹РіСЂСѓР·РєСѓ РёР· СЃС‚Р°СЂРѕР№ РњРРЎ, С‚Р°Р±Р»РёС†Сѓ, OCR РёР»Рё РґРёРєС‚РѕРІРєСѓ РїРµСЂРµРґ СЂР°Р·Р±РѕСЂРѕРј.");
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
        throw new Error(await responseErrorMessage(response, "РЈРјРЅС‹Р№ РёРјРїРѕСЂС‚ РЅРµ РїСЂРѕРІРµСЂРµРЅ"));
      }
      setSmartImportPreview((await response.json()) as SmartImportPreviewResponse);
      setSmartImportCommit(null);
    } catch (importError) {
      setError(operatorWorkflowFailureMessage("РЈРјРЅС‹Р№ РёРјРїРѕСЂС‚ РЅРµ РїСЂРѕРІРµСЂРµРЅ", importError));
    } finally {
      setIsSmartImportLoading(false);
    }
  }

  async function previewSmartImport() {
    await previewSmartImportText(smartImportText, smartImportMode);
  }

  async function commitSmartImport() {
    if (isSmartImportCommitting) {
      setError("Р”РѕР¶РґРёС‚РµСЃСЊ Р·Р°РІРµСЂС€РµРЅРёСЏ С‚РµРєСѓС‰РµР№ Р·Р°РїРёСЃРё СѓРјРЅРѕРіРѕ РёРјРїРѕСЂС‚Р°.");
      return;
    }
    if (!smartImportText.trim()) {
      setError("Р’СЃС‚Р°РІСЊС‚Рµ РІС‹РіСЂСѓР·РєСѓ РёР· СЃС‚Р°СЂРѕР№ РњРРЎ, С‚Р°Р±Р»РёС†Сѓ, OCR РёР»Рё РґРёРєС‚РѕРІРєСѓ РїРµСЂРµРґ Р·Р°РїРёСЃСЊСЋ.");
      return;
    }
    if (!smartImportPreview) {
      setError("РЎРЅР°С‡Р°Р»Р° СЂР°Р·Р±РµСЂРёС‚Рµ СѓРјРЅС‹Р№ РёРјРїРѕСЂС‚, С‡С‚РѕР±С‹ СѓРІРёРґРµС‚СЊ РіРѕС‚РѕРІС‹Рµ СЃС‚СЂРѕРєРё Рё РїСЂРѕРїСѓСЃРєРё.");
      return;
    }
    if (smartImportPreview.patientPreview.readyRows === 0 && smartImportPreview.imagingPreview.readyRows === 0) {
      setError("Р’ СѓРјРЅРѕРј РёРјРїРѕСЂС‚Рµ РЅРµС‚ РіРѕС‚РѕРІС‹С… РїР°С†РёРµРЅС‚РѕРІ РёР»Рё СЃРЅРёРјРєРѕРІ. РСЃРїСЂР°РІСЊС‚Рµ СЃС‚СЂРѕРєРё Рё РїРѕРІС‚РѕСЂРёС‚Рµ СЂР°Р·Р±РѕСЂ.");
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
        throw new Error(await responseErrorMessage(response, "РЈРјРЅС‹Р№ РёРјРїРѕСЂС‚ РЅРµ Р·Р°РїРёСЃР°РЅ"));
      }
      const result = (await response.json()) as SmartImportCommitResponse;
      setSmartImportCommit(result);
      setSmartImportPreview(result.preview);
      await loadDashboard();
    } catch (importError) {
      setError(operatorWorkflowFailureMessage("РЈРјРЅС‹Р№ РёРјРїРѕСЂС‚ РЅРµ Р·Р°РїРёСЃР°РЅ", importError));
    } finally {
      setIsSmartImportCommitting(false);
    }
  }

  async function downloadSmartImportReport() {
    if (!smartImportText.trim()) {
      setError("Р’СЃС‚Р°РІСЊС‚Рµ РІС‹РіСЂСѓР·РєСѓ РёР· СЃС‚Р°СЂРѕР№ РњРРЎ, С‚Р°Р±Р»РёС†Сѓ, OCR РёР»Рё РґРёРєС‚РѕРІРєСѓ РїРµСЂРµРґ РѕС‚С‡РµС‚РѕРј РїСЂРѕРІРµСЂРєРё.");
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
        throw new Error(await responseErrorMessage(response, "РћС‚С‡РµС‚ РёРјРїРѕСЂС‚Р° РЅРµ СЃРѕР·РґР°РЅ"));
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
      setError(operatorWorkflowFailureMessage("РћС‚С‡РµС‚ РёРјРїРѕСЂС‚Р° РЅРµ СЃРѕР·РґР°РЅ", reportError));
    } finally {
      setIsSmartReportLoading(false);
    }
  }

  async function downloadSmartImportSafeHandoffReport() {
    if (!smartImportText.trim()) {
      setError("Р’СЃС‚Р°РІСЊС‚Рµ РІС‹РіСЂСѓР·РєСѓ РёР· СЃС‚Р°СЂРѕР№ РњРРЎ, С‚Р°Р±Р»РёС†Сѓ, OCR РёР»Рё РґРёРєС‚РѕРІРєСѓ РїРµСЂРµРґ РѕС‚С‡РµС‚РѕРј РїРµСЂРµРЅРѕСЃР°.");
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
        throw new Error(await responseErrorMessage(response, "РћС‚С‡РµС‚ РїРµСЂРµРЅРѕСЃР° РїРѕ РёРјРїРѕСЂС‚Сѓ РЅРµ СЃРѕР·РґР°РЅ"));
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
      setError(operatorWorkflowFailureMessage("РћС‚С‡РµС‚ РїРµСЂРµРЅРѕСЃР° РїРѕ РёРјРїРѕСЂС‚Сѓ РЅРµ СЃРѕР·РґР°РЅ", reportError));
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
        throw new Error(await responseErrorMessage(response, "РђРІС‚РѕРїР»Р°РЅ РјРёРіСЂР°С†РёРё РЅРµ РїРѕСЃС‚СЂРѕРµРЅ"));
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
      setError(operatorWorkflowFailureMessage("РђРІС‚РѕРїР»Р°РЅ РјРёРіСЂР°С†РёРё РЅРµ РїРѕСЃС‚СЂРѕРµРЅ", autopilotError));
    } finally {
      setIsMigrationAutopilotLoading(false);
    }
  }

  async function downloadMigrationHandoffReport() {
    const knownDiscovery = activeMigrationDiscoveryForAutopilot();
    if (!migrationAutopilot && !knownDiscovery && !smartImportText.trim()) {
      setError("РЎРЅР°С‡Р°Р»Р° Р·Р°РїСѓСЃС‚РёС‚Рµ Р°РІС‚РѕРїР»Р°РЅ РјРёРіСЂР°С†РёРё, РІС‹Р±РµСЂРёС‚Рµ РїР°РїРєСѓ/РґРёСЃРє РёР»Рё РІСЃС‚Р°РІСЊС‚Рµ С‚РµРєСЃС‚ РІС‹РіСЂСѓР·РєРё РґР»СЏ РїР»Р°РЅР° РїРµСЂРµРЅРѕСЃР°.");
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
        throw new Error(await responseErrorMessage(response, "РџР»Р°РЅ РјРёРіСЂР°С†РёРё РЅРµ СЃРѕР·РґР°РЅ"));
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
      setError(operatorWorkflowFailureMessage("РџР»Р°РЅ РјРёРіСЂР°С†РёРё РЅРµ СЃРѕР·РґР°РЅ", reportError));
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
        throw new Error(await responseErrorMessage(response, "РџРѕРёСЃРє СЃС‚Р°СЂС‹С… РёСЃС‚РѕС‡РЅРёРєРѕРІ РЅРµ РІС‹РїРѕР»РЅРµРЅ"));
      }
      const result = (await response.json()) as MigrationLocalSourceDiscoveryResponse;
      setMigrationSourceDiscovery(result);
      await runMigrationAutopilot(result);
    } catch (discoveryError) {
      setError(operatorWorkflowFailureMessage("РџРѕРёСЃРє СЃС‚Р°СЂС‹С… РёСЃС‚РѕС‡РЅРёРєРѕРІ РЅРµ РІС‹РїРѕР»РЅРµРЅ", discoveryError));
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
      setError("РЈ РЅР°Р№РґРµРЅРЅРѕРіРѕ РёСЃС‚РѕС‡РЅРёРєР° РїРѕРєР° РЅРµС‚ С„Р°Р№Р»РѕРІ РґР»СЏ РїСЂРµРґРїСЂРѕСЃРјРѕС‚СЂР°. РћС‚РєСЂРѕР№С‚Рµ РїР»Р°РЅ РїРµСЂРµРЅРѕСЃР° РёР»Рё РїСЂРѕРІРµСЂРєСѓ РёСЃС‚РѕС‡РЅРёРєР°.");
      return;
    }
    if (!candidate.smartImportLine.trim()) {
      setError("РЈ РЅР°Р№РґРµРЅРЅРѕРіРѕ РёСЃС‚РѕС‡РЅРёРєР° РЅРµС‚ СЃС‚СЂРѕРєРё РґР»СЏ СѓРјРЅРѕРіРѕ РїСЂРµРґРїСЂРѕСЃРјРѕС‚СЂР°. РћС‚РєСЂРѕР№С‚Рµ РїР»Р°РЅ РёР»Рё РїРѕРІС‚РѕСЂРёС‚Рµ РїРѕРёСЃРє.");
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
      setError("РСЃС‚РѕС‡РЅРёРє РёР· Р°РІС‚РѕРїР»Р°РЅР° СѓР¶Рµ РЅРµ РЅР°Р№РґРµРЅ. РћР±РЅРѕРІРёС‚Рµ Р°РІС‚РѕРїР»Р°РЅ РёР»Рё РІС‹Р±РµСЂРёС‚Рµ РёСЃС‚РѕС‡РЅРёРє РёР· С‚РµРєСѓС‰РµРіРѕ СЃРїРёСЃРєР°.");
      return;
    }
    const previewSources = selectedSources.length
      ? selectedSources.filter((source) => migrationCandidateCanPreview(source.candidate))
      : sources.filter((source) => source.readiness.level === "ready_for_preview" || migrationCandidateCanPreview(source.candidate));
    if (selectedSources.length && !previewSources.length) {
      setError("РЈ РІС‹Р±СЂР°РЅРЅРѕРіРѕ РёСЃС‚РѕС‡РЅРёРєР° РїРѕРєР° РЅРµС‚ С„Р°Р№Р»РѕРІ РґР»СЏ РїСЂРµРґРїСЂРѕСЃРјРѕС‚СЂР°. РћС‚РєСЂРѕР№С‚Рµ РїР»Р°РЅ РїРµСЂРµРЅРѕСЃР° РёР»Рё РїСЂРѕРІРµСЂРєСѓ РёСЃС‚РѕС‡РЅРёРєР°.");
      return;
    }
    const sourceLines = Array.from(
      new Set(previewSources.slice(0, 12).map((source) => source.candidate.smartImportLine).filter(Boolean))
    );

    if (!sourceLines.length) {
      setError("РђРІС‚РѕРїР»Р°РЅ РїРѕРєР° РЅРµ РґР°Р» СЃС‚СЂРѕРє РґР»СЏ РїСЂРµРґРїСЂРѕСЃРјРѕС‚СЂР°. РЎРЅР°С‡Р°Р»Р° Р·Р°РїСѓСЃС‚РёС‚Рµ РїРѕРёСЃРє РЅР° РџРљ РёР»Рё РІС‹Р±РµСЂРёС‚Рµ РїР°РїРєСѓ/РґРёСЃРє СЃС‚Р°СЂРѕР№ СЃРёСЃС‚РµРјС‹.");
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
        throw new Error(await responseErrorMessage(response, "РџР»Р°РЅ РїРµСЂРµРЅРѕСЃР° РёСЃС‚РѕС‡РЅРёРєР° РЅРµ РїРѕСЃС‚СЂРѕРµРЅ"));
      }
      setMigrationSourceWorkup((await response.json()) as MigrationLocalSourceWorkupResponse);
    } catch (workupError) {
      setError(operatorWorkflowFailureMessage("РџР»Р°РЅ РїРµСЂРµРЅРѕСЃР° РёСЃС‚РѕС‡РЅРёРєР° РЅРµ РїРѕСЃС‚СЂРѕРµРЅ", workupError));
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
        throw new Error(await responseErrorMessage(response, "РџСЂРѕРІРµСЂРєР° РёСЃС‚РѕС‡РЅРёРєР° РЅРµ РІС‹РїРѕР»РЅРµРЅР°"));
      }
      setMigrationSourceProbe((await response.json()) as MigrationLocalSourceProbeResponse);
    } catch (probeError) {
      setError(operatorWorkflowFailureMessage("РџСЂРѕРІРµСЂРєР° РёСЃС‚РѕС‡РЅРёРєР° РЅРµ РІС‹РїРѕР»РЅРµРЅР°", probeError));
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
      setError("Р”Р»СЏ РїРѕРёСЃРєР° СЂРµРєРІРёР·РёС‚РѕРІ РєР»РёРЅРёРєРё СѓРєР°Р¶РёС‚Рµ РРќРќ, РћР“Р Рќ, РЅР°Р·РІР°РЅРёРµ, Р°РґСЂРµСЃ РёР»Рё РЅРѕРјРµСЂ Р»РёС†РµРЅР·РёРё.");
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
        throw new Error(await responseErrorMessage(response, "РџСѓР±Р»РёС‡РЅС‹Р№ РїРѕРёСЃРє РєР»РёРЅРёРєРё РЅРµ РІС‹РїРѕР»РЅРµРЅ"));
      }
      setClinicPublicLookup((await response.json()) as ClinicPublicLookupResponse);
    } catch (lookupError) {
      setError(operatorWorkflowFailureMessage("РџСѓР±Р»РёС‡РЅС‹Р№ РїРѕРёСЃРє РєР»РёРЅРёРєРё РЅРµ РІС‹РїРѕР»РЅРµРЅ", lookupError));
    } finally {
      setIsClinicPublicLookupLoading(false);
    }
  }

  async function previewImagingImport() {
    if (!imagingImportText.trim()) {
      setError("Р’СЃС‚Р°РІСЊС‚Рµ СЃС‚СЂРѕРєРё СЃРѕ СЃРЅРёРјРєР°РјРё РёР»Рё РІС‹Р±РµСЂРёС‚Рµ РїСЂРёРјРµСЂ РљРў/РћРџРўР“/РўР Р“ РїРµСЂРµРґ РїСЂРѕРІРµСЂРєРѕР№.");
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
        throw new Error(await responseErrorMessage(response, "РРјРїРѕСЂС‚ СЃРЅРёРјРєРѕРІ РЅРµ РїСЂРѕРІРµСЂРµРЅ"));
      }
      setImagingImportPreview((await response.json()) as ImagingImportPreviewResponse);
      setImagingImportCommit(null);
      setDicomSeriesPreview(null);
    } catch (importError) {
      setError(operatorWorkflowFailureMessage("РРјРїРѕСЂС‚ СЃРЅРёРјРєРѕРІ РЅРµ РїСЂРѕРІРµСЂРµРЅ", importError));
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
      safeDisplayName: metadata.safeDisplayName ?? `Р›РѕРєР°Р»СЊРЅР°СЏ РїР°РїРєР° СЃРЅРёРјРєРѕРІ #${fingerprint}`,
      sourceLabel: metadata.sourceLabel ?? "Р СѓС‡РЅРѕР№ РІС‹Р±РѕСЂ Р»РѕРєР°Р»СЊРЅРѕР№ РїР°РїРєРё",
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

    publishBrowserMigrationScanProgress(progressStats, options, runtime, "РїСЂРѕРІРµСЂРєР° РІС‹Р±СЂР°РЅРЅРѕР№ РїР°РїРєРё", "scanning", true);

    while (stack.length > 0 && scannedFolders < browserMigrationScanFolderLimit && scannedFiles < browserMigrationScanFileLimit) {
      throwIfBrowserMigrationScanAborted(options.signal);
      const current = stack.pop();
      if (!current) break;
      scannedFolders += 1;
      progressStats.scannedFolders = scannedFolders;
      runtime.processedUnits += 1;
      browserMigrationStatsFor(statsByFolder, current.key, current.hint, current.depth);
      publishBrowserMigrationScanProgress(progressStats, options, runtime, "РїСЂРѕРІРµСЂРєР° РїРѕРґРїР°РїРѕРє СЃС‚Р°СЂРѕР№ СЃРёСЃС‚РµРјС‹");
      await maybeYieldBrowserMigrationScan(runtime, options.signal);
      try {
        let inspectedDirectoryEntries = 0;
        for await (const [entryName, handle] of current.handle.entries()) {
          throwIfBrowserMigrationScanAborted(options.signal);
          inspectedDirectoryEntries += 1;
          if (inspectedDirectoryEntries > browserMigrationScanDirectoryEntryLimit) {
            warnings.push(`Р‘СЂР°СѓР·РµСЂРЅС‹Р№ СЃРїРёСЃРѕРє РѕРіСЂР°РЅРёС‡РёР» РѕРґРЅСѓ РїР°РїРєСѓ ${browserMigrationScanDirectoryEntryLimit} СЌР»РµРјРµРЅС‚Р°РјРё РґР»СЏ РѕС‚Р·С‹РІС‡РёРІРѕСЃС‚Рё РёРЅС‚РµСЂС„РµР№СЃР°.`);
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
          publishBrowserMigrationScanProgress(progressStats, options, runtime, "РїСЂРѕРІРµСЂРєР° СЃС‚Р°СЂС‹С… Р±Р°Р·, РІС‹РіСЂСѓР·РѕРє Рё СЃРЅРёРјРєРѕРІ");
          await maybeYieldBrowserMigrationScan(runtime, options.signal);
        }
      } catch (scanError) {
        if (isBrowserMigrationScanAbortError(scanError)) throw scanError;
        warnings.push("РћРґРЅСѓ РІС‹Р±СЂР°РЅРЅСѓСЋ РІ Р±СЂР°СѓР·РµСЂРµ РїРѕРґРїР°РїРєСѓ РЅРµ СѓРґР°Р»РѕСЃСЊ РїСЂРѕС‡РёС‚Р°С‚СЊ; РѕРЅР° РїСЂРѕРїСѓС‰РµРЅР°.");
      }
    }

    if (scannedFiles >= browserMigrationScanFileLimit) warnings.push(`Р‘СЂР°СѓР·РµСЂРЅС‹Р№ СЃРїРёСЃРѕРє РѕРіСЂР°РЅРёС‡РµРЅ ${browserMigrationScanFileLimit} С„Р°Р№Р»Р°РјРё РґР»СЏ РѕС‚Р·С‹РІС‡РёРІРѕСЃС‚Рё РёРЅС‚РµСЂС„РµР№СЃР°.`);
    if (scannedFolders >= browserMigrationScanFolderLimit) warnings.push(`Р‘СЂР°СѓР·РµСЂРЅС‹Р№ СЃРїРёСЃРѕРє РѕРіСЂР°РЅРёС‡РµРЅ ${browserMigrationScanFolderLimit} РїР°РїРєР°РјРё РґР»СЏ РѕС‚Р·С‹РІС‡РёРІРѕСЃС‚Рё РёРЅС‚РµСЂС„РµР№СЃР°.`);
    publishBrowserMigrationScanProgress(progressStats, options, runtime, null, "done", true);
    return buildBrowserMigrationDiscovery({
      rootName: directoryHandle.name || "browser-selected-folder",
      sourceLabel: "Р‘СЂР°СѓР·РµСЂРЅС‹Р№ СЃРїРёСЃРѕРє РїР°РїРєРё",
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

    publishBrowserMigrationScanProgress(progressStats, options, runtime, "РїСЂРѕРІРµСЂРєР° РІС‹Р±СЂР°РЅРЅС‹С… С„Р°Р№Р»РѕРІ", "scanning", true);

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
      publishBrowserMigrationScanProgress(progressStats, options, runtime, "РїСЂРѕРІРµСЂРєР° СЃС‚Р°СЂС‹С… Р±Р°Р·, РІС‹РіСЂСѓР·РѕРє Рё СЃРЅРёРјРєРѕРІ");
      await maybeYieldBrowserMigrationScan(runtime, options.signal);
    }

    if (selectedFileCount > browserMigrationScanFileLimit) warnings.push(`Р‘СЂР°СѓР·РµСЂРЅС‹Р№ СЃРїРёСЃРѕРє РѕРіСЂР°РЅРёС‡РµРЅ ${browserMigrationScanFileLimit} С„Р°Р№Р»Р°РјРё РґР»СЏ РѕС‚Р·С‹РІС‡РёРІРѕСЃС‚Рё РёРЅС‚РµСЂС„РµР№СЃР°.`);
    publishBrowserMigrationScanProgress(progressStats, options, runtime, null, "done", true);
    return buildBrowserMigrationDiscovery({
      rootName: "browser-selected-files",
      sourceLabel: "Р‘СЂР°СѓР·РµСЂРЅС‹Р№ СЃРїРёСЃРѕРє С„Р°Р№Р»РѕРІ",
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
          currentItem: "РїСЂРѕРІРµСЂРєР° РІС‹Р±СЂР°РЅРЅРѕР№ РїР°РїРєРё",
          errorMessage: "Р‘СЂР°СѓР·РµСЂ РЅРµ РѕС‚РєСЂС‹Р» РІС‹Р±РѕСЂ СЃС‚Р°СЂРѕР№ Р±Р°Р·С‹ РёР»Рё РїР°РїРєРё СЃРЅРёРјРєРѕРІ",
          scan: (options) => scanBrowserMigrationDirectoryHandle(directoryHandle, options)
        });
        return;
      }
      browserMigrationInputRef.current?.click();
    } catch (pickerError) {
      if (pickerError instanceof DOMException && pickerError.name === "AbortError") return;
      setError(browserLocalSourceErrorMessage("Р‘СЂР°СѓР·РµСЂ РЅРµ РѕС‚РєСЂС‹Р» РІС‹Р±РѕСЂ СЃС‚Р°СЂРѕР№ Р±Р°Р·С‹ РёР»Рё РїР°РїРєРё СЃРЅРёРјРєРѕРІ", pickerError));
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
        currentItem: "РїСЂРѕРІРµСЂРєР° РІС‹Р±СЂР°РЅРЅС‹С… С„Р°Р№Р»РѕРІ",
        errorMessage: "Р‘СЂР°СѓР·РµСЂ РЅРµ СЂР°Р·РѕР±СЂР°Р» РІС‹Р±СЂР°РЅРЅС‹Рµ С„Р°Р№Р»С‹ СЃС‚Р°СЂРѕР№ СЃРёСЃС‚РµРјС‹",
        scan: (options) => scanBrowserMigrationFileList(fileList, options)
      });
    } catch (pickerError) {
      setError(browserLocalSourceErrorMessage("Р‘СЂР°СѓР·РµСЂ РЅРµ СЂР°Р·РѕР±СЂР°Р» РІС‹Р±СЂР°РЅРЅС‹Рµ С„Р°Р№Р»С‹ СЃС‚Р°СЂРѕР№ СЃРёСЃС‚РµРјС‹", pickerError));
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
      rootName: "Р’С‹Р±СЂР°РЅРЅР°СЏ РїР°РїРєР° Р±СЂР°СѓР·РµСЂР°",
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

    publishBrowserImagingScanProgress(stats, options, runtime, "РїСЂРѕРІРµСЂРєР° РІС‹Р±СЂР°РЅРЅРѕР№ РїР°РїРєРё", "scanning", true);

    while (stack.length > 0 && stats.scannedFolders < browserImagingScanFolderLimit && stats.scannedFiles < browserImagingScanFileLimit) {
      throwIfBrowserImagingScanAborted(options.signal);
      const current = stack.pop();
      if (!current) break;
      stats.scannedFolders += 1;
      runtime.processedUnits += 1;
      publishBrowserImagingScanProgress(stats, options, runtime, "РїСЂРѕРІРµСЂРєР° РїРѕРґРїР°РїРѕРє");
      await maybeYieldBrowserImagingScan(runtime, options.signal);
      try {
        let inspectedDirectoryEntries = 0;
        for await (const [, handle] of current.entries()) {
          throwIfBrowserImagingScanAborted(options.signal);
          inspectedDirectoryEntries += 1;
          if (inspectedDirectoryEntries > browserImagingScanDirectoryEntryLimit) {
            stats.warnings.push(`Р‘СЂР°СѓР·РµСЂРЅРѕРµ СЃРєР°РЅРёСЂРѕРІР°РЅРёРµ РѕРіСЂР°РЅРёС‡РёР»Рѕ РѕРґРЅСѓ РїР°РїРєСѓ ${browserImagingScanDirectoryEntryLimit} СЌР»РµРјРµРЅС‚Р°РјРё РґР»СЏ РѕС‚Р·С‹РІС‡РёРІРѕСЃС‚Рё РёРЅС‚РµСЂС„РµР№СЃР°.`);
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
          publishBrowserImagingScanProgress(stats, options, runtime, "РїСЂРѕРІРµСЂРєР° С„Р°Р№Р»РѕРІ РљРў Рё 3D");
          await maybeYieldBrowserImagingScan(runtime, options.signal);
        }
      } catch (scanError) {
        if (isBrowserImagingScanAbortError(scanError)) throw scanError;
        stats.warnings.push("РћРґРЅСѓ РІС‹Р±СЂР°РЅРЅСѓСЋ РІ Р±СЂР°СѓР·РµСЂРµ РїРѕРґРїР°РїРєСѓ РЅРµ СѓРґР°Р»РѕСЃСЊ РїСЂРѕС‡РёС‚Р°С‚СЊ, РѕРЅР° РїСЂРѕРїСѓС‰РµРЅР°.");
      }
    }

    if (stats.scannedFiles >= browserImagingScanFileLimit) {
      stats.warnings.push(`Р‘СЂР°СѓР·РµСЂРЅРѕРµ СЃРєР°РЅРёСЂРѕРІР°РЅРёРµ РѕРіСЂР°РЅРёС‡РµРЅРѕ ${browserImagingScanFileLimit} С„Р°Р№Р»Р°РјРё РґР»СЏ РѕС‚Р·С‹РІС‡РёРІРѕСЃС‚Рё РёРЅС‚РµСЂС„РµР№СЃР°.`);
    }
    if (stats.scannedFolders >= browserImagingScanFolderLimit) {
      stats.warnings.push(`Р‘СЂР°СѓР·РµСЂРЅРѕРµ СЃРєР°РЅРёСЂРѕРІР°РЅРёРµ РѕРіСЂР°РЅРёС‡РµРЅРѕ ${browserImagingScanFolderLimit} РїР°РїРєР°РјРё РґР»СЏ РѕС‚Р·С‹РІС‡РёРІРѕСЃС‚Рё РёРЅС‚РµСЂС„РµР№СЃР°.`);
    }
    stats.warnings.push("Р‘СЂР°СѓР·РµСЂ РїСЂРѕРІРµСЂРёР» РІС‹Р±СЂР°РЅРЅСѓСЋ РїР°РїРєСѓ Р±РµР· РїРµСЂРµРґР°С‡Рё РїРѕР»РЅРѕРіРѕ РїСѓС‚Рё. Р”Р»СЏ РїРѕР»РЅРѕС†РµРЅРЅРѕРіРѕ РѕС‚РєСЂС‹С‚РёСЏ С‚СЏР¶РµР»РѕР№ РљРў РІС‹Р±РµСЂРёС‚Рµ СЌС‚Сѓ Р¶Рµ РїР°РїРєСѓ РІ Р»РѕРєР°Р»СЊРЅРѕРј РјРѕРґСѓР»Рµ РєР»РёРЅРёРєРё РёР»Рё СѓРєР°Р¶РёС‚Рµ РїСѓС‚СЊ РЅР° СЂР°Р±РѕС‡РµРј РџРљ.");
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
      rootName: "Р’С‹Р±СЂР°РЅРЅС‹Рµ С„Р°Р№Р»С‹ Р±СЂР°СѓР·РµСЂР°",
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

    publishBrowserImagingScanProgress(stats, options, runtime, "РїСЂРѕРІРµСЂРєР° РІС‹Р±СЂР°РЅРЅС‹С… С„Р°Р№Р»РѕРІ", "scanning", true);

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
      publishBrowserImagingScanProgress(stats, options, runtime, "РїСЂРѕРІРµСЂРєР° С„Р°Р№Р»РѕРІ РљРў Рё 3D");
      await maybeYieldBrowserImagingScan(runtime, options.signal);
    }

    if (selectedFileCount > browserImagingScanFileLimit) {
      stats.warnings.push(`Р‘СЂР°СѓР·РµСЂРЅРѕРµ СЃРєР°РЅРёСЂРѕРІР°РЅРёРµ РѕРіСЂР°РЅРёС‡РµРЅРѕ ${browserImagingScanFileLimit} С„Р°Р№Р»Р°РјРё РґР»СЏ РѕС‚Р·С‹РІС‡РёРІРѕСЃС‚Рё РёРЅС‚РµСЂС„РµР№СЃР°.`);
    }
    stats.warnings.push("Р¤Р°Р№Р»С‹ РІС‹Р±СЂР°РЅС‹ С‡РµСЂРµР· Р·Р°РїР°СЃРЅРѕР№ СЂРµР¶РёРј Р±СЂР°СѓР·РµСЂР°. РџРѕСЃР»Рµ РѕР±РЅРѕРІР»РµРЅРёСЏ СЃС‚СЂР°РЅРёС†С‹ РёС… РЅСѓР¶РЅРѕ РІС‹Р±СЂР°С‚СЊ Р·Р°РЅРѕРІРѕ; РґР»СЏ РїРѕСЃС‚РѕСЏРЅРЅРѕР№ РїСЂРёРІСЏР·РєРё Р»СѓС‡С€Рµ РІС‹Р±СЂР°С‚СЊ РїР°РїРєСѓ РёР»Рё Р»РѕРєР°Р»СЊРЅС‹Р№ РјРѕРґСѓР»СЊ РєР»РёРЅРёРєРё.");
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
          rootName: "Р’С‹Р±СЂР°РЅРЅР°СЏ РїР°РїРєР° Р±СЂР°СѓР·РµСЂР°",
          sourceKind: "browser_directory_picker",
          currentItem: "РїСЂРѕРІРµСЂРєР° РІС‹Р±СЂР°РЅРЅРѕР№ РїР°РїРєРё",
          errorMessage: "Р‘СЂР°СѓР·РµСЂ РЅРµ РѕС‚РєСЂС‹Р» РІС‹Р±РѕСЂ РїР°РїРєРё СЃРЅРёРјРєРѕРІ",
          scan: (options) => scanBrowserDirectoryHandle(directoryHandle, options)
        });
        return;
      }
      browserDirectoryInputRef.current?.click();
    } catch (pickerError) {
      if (pickerError instanceof DOMException && pickerError.name === "AbortError") return;
      setError(browserLocalSourceErrorMessage("Р‘СЂР°СѓР·РµСЂ РЅРµ РѕС‚РєСЂС‹Р» РІС‹Р±РѕСЂ РїР°РїРєРё СЃРЅРёРјРєРѕРІ", pickerError));
    } finally {
      setIsBrowserImagingFolderPicking(false);
    }
  }

  async function handleBrowserDirectoryInputChange(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setIsBrowserImagingFolderPicking(true);
    try {
      await runBrowserImagingFolderScan({
        rootName: "Р’С‹Р±СЂР°РЅРЅС‹Рµ С„Р°Р№Р»С‹ Р±СЂР°СѓР·РµСЂР°",
        sourceKind: "browser_file_input",
        currentItem: "РїСЂРѕРІРµСЂРєР° РІС‹Р±СЂР°РЅРЅС‹С… С„Р°Р№Р»РѕРІ",
        errorMessage: "Р‘СЂР°СѓР·РµСЂ РЅРµ РѕС‚РєСЂС‹Р» РІС‹Р±РѕСЂ С„Р°Р№Р»РѕРІ СЃРЅРёРјРєРѕРІ",
        scan: (options) => scanBrowserFileList(fileList, options)
      });
    } catch (pickerError) {
      setError(browserLocalSourceErrorMessage("Р‘СЂР°СѓР·РµСЂ РЅРµ РѕС‚РєСЂС‹Р» РІС‹Р±РѕСЂ С„Р°Р№Р»РѕРІ СЃРЅРёРјРєРѕРІ", pickerError));
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
        throw new Error(await responseErrorMessage(response, "РџРѕРёСЃРє РїР°РїРѕРє СЃРѕ СЃРЅРёРјРєР°РјРё РЅРµ РІС‹РїРѕР»РЅРµРЅ"));
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
      setError(operatorWorkflowFailureMessage("РџРѕРёСЃРє РїР°РїРѕРє СЃРѕ СЃРЅРёРјРєР°РјРё РЅРµ РІС‹РїРѕР»РЅРµРЅ", discoveryError));
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
        throw new Error(await responseErrorMessage(response, "Р›РѕРєР°Р»СЊРЅС‹Р№ РѕСЂРіР°РЅРёР·Р°С‚РѕСЂ СЃРЅРёРјРєРѕРІ РЅРµ РІС‹РїРѕР»РЅРµРЅ"));
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
      setError(operatorWorkflowFailureMessage("Р›РѕРєР°Р»СЊРЅС‹Р№ РѕСЂРіР°РЅРёР·Р°С‚РѕСЂ СЃРЅРёРјРєРѕРІ РЅРµ РІС‹РїРѕР»РЅРµРЅ", organizerError));
    } finally {
      finishLocalDicomOperation(controller);
      setIsLocalImagingOrganizing(false);
    }
  }

  async function scanImagingFolder() {
    const folderPath = imagingFolderPath.trim();
    if (!folderPath) {
      setError("РЈРєР°Р¶РёС‚Рµ РїСѓС‚СЊ Рє РїР°РїРєРµ СЃРЅРёРјРєРѕРІ РїРµСЂРµРґ СЃРєР°РЅРёСЂРѕРІР°РЅРёРµРј.");
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
        throw new Error(await responseErrorMessage(response, "РџР°РїРєР° СЃРЅРёРјРєРѕРІ РЅРµ РїСЂРѕСЃРєР°РЅРёСЂРѕРІР°РЅР°"));
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
      setError(operatorWorkflowFailureMessage("РџР°РїРєР° СЃРЅРёРјРєРѕРІ РЅРµ РїСЂРѕСЃРєР°РЅРёСЂРѕРІР°РЅР°", scanError));
    } finally {
      finishLocalDicomOperation(controller);
      setIsImagingFolderScanning(false);
    }
  }

  async function scanDicomFolderSeries() {
    const folderPath = imagingFolderPath.trim();
    if (!folderPath) {
      setError("РЈРєР°Р¶РёС‚Рµ РїСѓС‚СЊ Рє Р»РѕРєР°Р»СЊРЅРѕР№ РїР°РїРєРµ СЃРѕ СЃРЅРёРјРєР°РјРё РїРµСЂРµРґ С‡С‚РµРЅРёРµРј РјРµС‚Р°РґР°РЅРЅС‹С….");
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
        throw new Error(await responseErrorMessage(response, "РњРµС‚Р°РґР°РЅРЅС‹Рµ РїР°РїРєРё СЃРЅРёРјРєРѕРІ РЅРµ РїСЂРѕС‡РёС‚Р°РЅС‹"));
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
      setError(operatorWorkflowFailureMessage("РњРµС‚Р°РґР°РЅРЅС‹Рµ РїР°РїРєРё СЃРЅРёРјРєРѕРІ РЅРµ РїСЂРѕС‡РёС‚Р°РЅС‹", scanError));
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
      setError("РЈРєР°Р¶РёС‚Рµ РїСѓС‚СЊ Рє Р»РѕРєР°Р»СЊРЅРѕР№ РїР°РїРєРµ СЃРѕ СЃРЅРёРјРєР°РјРё РїРµСЂРµРґ РїСЂРµРґРїСЂРѕСЃРјРѕС‚СЂРѕРј РїРµСЂРІРѕРіРѕ СЃСЂРµР·Р°.");
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
        throw new Error(await responseErrorMessage(response, "РџРµСЂРІС‹Р№ СЃСЂРµР· СЃРЅРёРјРєРѕРІ РЅРµ РїРѕРєР°Р·Р°РЅ"));
      }
      setDicomFirstFramePreview((await response.json()) as DicomFirstFramePreviewResponse);
    } catch (previewError) {
      if (isLocalDicomOperationAbortError(previewError)) return;
      setError(operatorWorkflowFailureMessage("РџРµСЂРІС‹Р№ СЃСЂРµР· СЃРЅРёРјРєРѕРІ РЅРµ РїРѕРєР°Р·Р°РЅ", previewError));
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
      throw new Error(await responseErrorMessage(response, "РџР»Р°РЅ РїР°РїРєРё СЃРЅРёРјРєРѕРІ РЅРµ РїРѕРґРіРѕС‚РѕРІР»РµРЅ"));
    }
    return {
      client,
      result: (await response.json()) as DicomFolderWorkupPlanResponse
    };
  }

  function selectPreferredDicomWorkupPlan(result: DicomFolderWorkupPlanResponse) {
    return (
      result.plans?.find((plan) => plan.recommendedPath === "open_mpr") ??
      result.plans?.find((plan) => plan.recommendedPath === "downsampled_mpr") ??
      result.plans?.find((plan) => plan.series.mprReadiness.volumeCandidate) ??
      result.plans?.find((plan) => plan.recommendedPath === "external_viewer") ??
      result.plans?.[0] ??
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
      setError("РЈРєР°Р¶РёС‚Рµ РїСѓС‚СЊ Рє Р»РѕРєР°Р»СЊРЅРѕР№ РїР°РїРєРµ СЃРѕ СЃРЅРёРјРєР°РјРё РїРµСЂРµРґ РїРѕРґРіРѕС‚РѕРІРєРѕР№ РїР»Р°РЅР°.");
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
      setError(operatorWorkflowFailureMessage("РџР»Р°РЅ РїР°РїРєРё СЃРЅРёРјРєРѕРІ РЅРµ РїРѕРґРіРѕС‚РѕРІР»РµРЅ", workupError));
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
      setError("РЈРєР°Р¶РёС‚Рµ РїСѓС‚СЊ Рє Р»РѕРєР°Р»СЊРЅРѕР№ РїР°РїРєРµ СЃРѕ СЃРЅРёРјРєР°РјРё РїРµСЂРµРґ РїРѕРґРіРѕС‚РѕРІРєРѕР№ РљРў-РїСЂРѕСЃРјРѕС‚СЂР°.");
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
        throw new Error("Р’ СЌС‚РѕР№ РїР°РїРєРµ РЅРµ РЅР°Р№РґРµРЅР° РїСЂРёРіРѕРґРЅР°СЏ СЃРµСЂРёСЏ РљР›РљРў/РљРў.");
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
        throw new Error(await responseErrorMessage(manifestResponse, "РџСЂРѕСЃРјРѕС‚СЂ РљР›РљРў/РљРў РЅРµ РїРѕРґРіРѕС‚РѕРІР»РµРЅ"));
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
      setError(operatorWorkflowFailureMessage("РџСЂРѕСЃРјРѕС‚СЂ РљР›РљРў/РљРў РЅРµ РїРѕРґРіРѕС‚РѕРІР»РµРЅ", workbenchError));
    } finally {
      finishLocalDicomOperation(controller);
      setIsDicomFolderWorkupPlanning(false);
      setIsDicomWorkbenchBuilding(false);
    }
  }

  async function previewDicomSeries() {
    if (!imagingImportText.trim()) {
      setError("Р’СЃС‚Р°РІСЊС‚Рµ СЃС‚СЂРѕРєРё СЃРѕ СЃРЅРёРјРєР°РјРё РёР»Рё РІС‹Р±РµСЂРёС‚Рµ РїСЂРёРјРµСЂ РљРў/РћРџРўР“/РўР Р“ РїРµСЂРµРґ РіСЂСѓРїРїРёСЂРѕРІРєРѕР№ СЃРµСЂРёР№.");
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
        throw new Error(await responseErrorMessage(response, "РЎРµСЂРёРё СЃРЅРёРјРєРѕРІ РЅРµ СЂР°Р·РѕР±СЂР°РЅС‹"));
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
      setError(operatorWorkflowFailureMessage("РЎРµСЂРёРё СЃРЅРёРјРєРѕРІ РЅРµ СЂР°Р·РѕР±СЂР°РЅС‹", seriesError));
    } finally {
      finishLocalDicomOperation(controller);
      setIsDicomSeriesPreviewLoading(false);
    }
  }

  async function checkDicomWebConnector() {
    if (!dicomWebEndpointUrl.trim()) {
      setError("РЈРєР°Р¶РёС‚Рµ Р°РґСЂРµСЃ Р°СЂС…РёРІР° СЃРЅРёРјРєРѕРІ РїРµСЂРµРґ РїСЂРѕРІРµСЂРєРѕР№.");
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
        throw new Error(await responseErrorMessage(response, "РџСЂРѕРІРµСЂРєР° Р°СЂС…РёРІР° СЃРЅРёРјРєРѕРІ РЅРµ РІС‹РїРѕР»РЅРµРЅР°"));
      }
      setDicomWebCheck((await response.json()) as DicomWebConnectorCheckResponse);
      setDicomViewerWorkbenchManifest(null);
      setDicomWorkbenchLocalSavedAt(null);
      setDicomWorkstationReadiness(null);
    } catch (checkError) {
      if (isLocalDicomOperationAbortError(checkError)) return;
      setError(operatorWorkflowFailureMessage("РџСЂРѕРІРµСЂРєР° Р°СЂС…РёРІР° СЃРЅРёРјРєРѕРІ РЅРµ РІС‹РїРѕР»РЅРµРЅР°", checkError));
    } finally {
      finishLocalDicomOperation(controller);
      setIsDicomWebChecking(false);
    }
  }

  async function buildDicomViewerWorkbenchManifest() {
    if (!cbctWorkbenchSeries) {
      setError("РЎРЅР°С‡Р°Р»Р° РїСЂРѕРІРµСЂСЊС‚Рµ СЃРµСЂРёРё СЃРЅРёРјРєРѕРІ Рё РІС‹Р±РµСЂРёС‚Рµ РіРѕС‚РѕРІСѓСЋ РљР›РљРў/РљРў-СЃРµСЂРёСЋ.");
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
        throw new Error(await responseErrorMessage(response, "РџСЂРѕСЃРјРѕС‚СЂ РљР›РљРў/РљРў РЅРµ РїРѕРґРіРѕС‚РѕРІР»РµРЅ"));
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
      setError(operatorWorkflowFailureMessage("РџСЂРѕСЃРјРѕС‚СЂ РљР›РљРў/РљРў РЅРµ РїРѕРґРіРѕС‚РѕРІР»РµРЅ", workbenchError));
    } finally {
      finishLocalDicomOperation(controller);
      setIsDicomWorkbenchBuilding(false);
    }
  }

  async function buildDicomViewerLaunchManifest() {
    if (!cbctWorkbenchSeries) {
      setError("РЎРЅР°С‡Р°Р»Р° РїСЂРѕРІРµСЂСЊС‚Рµ СЃРµСЂРёРё СЃРЅРёРјРєРѕРІ Рё РІС‹Р±РµСЂРёС‚Рµ РіРѕС‚РѕРІСѓСЋ РљР›РљРў/РљРў-СЃРµСЂРёСЋ РґР»СЏ РІРЅРµС€РЅРµРіРѕ РїСЂРѕСЃРјРѕС‚СЂР°.");
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
        throw new Error(await responseErrorMessage(response, "РџР»Р°РЅ РѕС‚РєСЂС‹С‚РёСЏ СЃРЅРёРјРєРѕРІ РЅРµ СЃРѕР·РґР°РЅ"));
      }
      setDicomViewerWorkbenchManifest(null);
      setDicomWorkbenchLocalSavedAt(null);
      setDicomViewerLaunchManifest((await response.json()) as DicomViewerLaunchManifestResponse);
    } catch (manifestError) {
      if (isLocalDicomOperationAbortError(manifestError)) return;
      setError(operatorWorkflowFailureMessage("РџР»Р°РЅ РѕС‚РєСЂС‹С‚РёСЏ СЃРЅРёРјРєРѕРІ РЅРµ СЃРѕР·РґР°РЅ", manifestError));
    } finally {
      finishLocalDicomOperation(controller);
      setIsDicomManifestBuilding(false);
    }
  }

  async function buildDicomViewerToolStateBundle() {
    if (!cbctWorkbenchSeries) {
      setError("РЎРЅР°С‡Р°Р»Р° РїСЂРѕРІРµСЂСЊС‚Рµ СЃРµСЂРёРё СЃРЅРёРјРєРѕРІ Рё РІС‹Р±РµСЂРёС‚Рµ РіРѕС‚РѕРІСѓСЋ РљР›РљРў/РљРў-СЃРµСЂРёСЋ РґР»СЏ СЌРєСЃРїРѕСЂС‚Р° СЃРѕСЃС‚РѕСЏРЅРёСЏ.");
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
        throw new Error(await responseErrorMessage(response, "РЎРѕСЃС‚РѕСЏРЅРёРµ РїСЂРѕСЃРјРѕС‚СЂР° СЃРЅРёРјРєРѕРІ РЅРµ СЃРѕР±СЂР°РЅРѕ"));
      }
      setDicomViewerWorkbenchManifest(null);
      setDicomWorkbenchLocalSavedAt(null);
      setDicomViewerToolStateBundle((await response.json()) as DicomViewerToolStateBundleResponse);
    } catch (toolStateError) {
      if (isLocalDicomOperationAbortError(toolStateError)) return;
      setError(operatorWorkflowFailureMessage("РЎРѕСЃС‚РѕСЏРЅРёРµ РїСЂРѕСЃРјРѕС‚СЂР° СЃРЅРёРјРєРѕРІ РЅРµ СЃРѕР±СЂР°РЅРѕ", toolStateError));
    } finally {
      finishLocalDicomOperation(controller);
      setIsDicomToolStateBuilding(false);
    }
  }

  function downloadDicomViewerToolStateBundle() {
    if (!dicomViewerToolStateBundle) {
      setError("РЎРЅР°С‡Р°Р»Р° СЃРѕР±РµСЂРёС‚Рµ СЃРѕСЃС‚РѕСЏРЅРёРµ РїСЂРѕСЃРјРѕС‚СЂР° СЃРЅРёРјРєРѕРІ, Р·Р°С‚РµРј СЃРєР°С‡Р°Р№С‚Рµ С„Р°Р№Р» СЃРѕСЃС‚РѕСЏРЅРёСЏ.");
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
      setError("РЎРЅР°С‡Р°Р»Р° СЃРѕР±РµСЂРёС‚Рµ СЂР°Р±РѕС‡РёР№ РЅР°Р±РѕСЂ РљР›РљРў/РљРў-СЃСЂРµР·РѕРІ, Р·Р°С‚РµРј СЃРєР°С‡Р°Р№С‚Рµ С„Р°Р№Р» СЃРѕСЃС‚РѕСЏРЅРёСЏ.");
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
        throw new Error(await responseErrorMessage(response, "РЎРїРёСЃРѕРє СЃРѕС…СЂР°РЅРµРЅРЅС‹С… РЅР°Р±РѕСЂРѕРІ РїСЂРѕСЃРјРѕС‚СЂР° РЅРµ Р·Р°РіСЂСѓР¶РµРЅ"));
      }
      const result = (await response.json()) as DicomWorkbenchBundleListResponse;
      setDicomWorkbenchServerBundles(result.bundles);
      const latest = result.bundles?.[0] ?? null;
      if (latest && options.restoreLatest) {
        restoreDicomWorkbenchServerBundle(latest);
      }
    } catch (bundleError) {
      if (!options.silent) {
        setError(operatorWorkflowFailureMessage("РЎРїРёСЃРѕРє СЃРѕС…СЂР°РЅРµРЅРЅС‹С… РЅР°Р±РѕСЂРѕРІ РїСЂРѕСЃРјРѕС‚СЂР° РЅРµ Р·Р°РіСЂСѓР¶РµРЅ", bundleError));
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
        throw new Error(await responseErrorMessage(response, "РќР°Р±РѕСЂ РїСЂРѕСЃРјРѕС‚СЂР° РљР›РљРў/РљРў-СЃСЂРµР·РѕРІ РЅРµ СЃРѕС…СЂР°РЅРµРЅ"));
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
        setError(operatorWorkflowFailureMessage("РќР°Р±РѕСЂ РїСЂРѕСЃРјРѕС‚СЂР° РљР›РљРў/РљРў-СЃСЂРµР·РѕРІ РЅРµ СЃРѕС…СЂР°РЅРµРЅ", saveError));
      }
      return null;
    } finally {
      setIsDicomWorkbenchServerSaving(false);
    }
  }

  async function reconnectDicomWorkbenchFromCurrentFolder() {
    if (!imagingFolderPath.trim()) {
      setError("РЈРєР°Р¶РёС‚Рµ Р»РѕРєР°Р»СЊРЅСѓСЋ РїР°РїРєСѓ СЃРѕ СЃРЅРёРјРєР°РјРё РїРµСЂРµРґ РїРµСЂРµРїРѕРґРєР»СЋС‡РµРЅРёРµРј РїСЂРѕСЃРјРѕС‚СЂР°.");
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
        throw new Error(await responseErrorMessage(workupResponse, "РСЃС‚РѕС‡РЅРёРє СЃРЅРёРјРєРѕРІ РЅРµ РїРµСЂРµРїРѕРґРєР»СЋС‡РµРЅ"));
      }
      const workup = (await workupResponse.json()) as DicomFolderWorkupPlanResponse;
      const matchedPlan =
        workup.plans?.find(
          (plan) =>
            (!targetStudyUid || plan.series.studyInstanceUid === targetStudyUid) &&
            (!targetSeriesUid || plan.series.seriesInstanceUid === targetSeriesUid)
        ) ??
        workup.plans?.find((plan) => plan.series.mprReadiness.volumeCandidate) ??
        workup.plans?.[0] ??
        null;
      if (!matchedPlan) {
        throw new Error("РџРµСЂРµРїРѕРґРєР»СЋС‡РµРЅРёРµ СЃРЅРёРјРєРѕРІ РЅРµ РЅР°С€Р»Рѕ РїСЂРёРіРѕРґРЅСѓСЋ РљРў-СЃРµСЂРёСЋ РІ С‚РµРєСѓС‰РµР№ РїР°РїРєРµ.");
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
        throw new Error(await responseErrorMessage(manifestResponse, "РџР»Р°РЅ РїРµСЂРµРїРѕРґРєР»СЋС‡РµРЅРёСЏ СЃРЅРёРјРєРѕРІ РЅРµ СЃРѕР·РґР°РЅ"));
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
      setError(operatorWorkflowFailureMessage("РСЃС‚РѕС‡РЅРёРє СЃРЅРёРјРєРѕРІ РЅРµ РїРµСЂРµРїРѕРґРєР»СЋС‡РµРЅ", reconnectError));
    } finally {
      finishLocalDicomOperation(controller);
      setIsDicomWorkbenchReconnecting(false);
    }
  }

  async function checkDicomWorkstationReadiness() {
    if (!cbctWorkbenchSeries) {
      setError("РЎРЅР°С‡Р°Р»Р° РїСЂРѕРІРµСЂСЊС‚Рµ СЃРµСЂРёРё СЃРЅРёРјРєРѕРІ Рё РІС‹Р±РµСЂРёС‚Рµ РіРѕС‚РѕРІСѓСЋ РљР›РљРў/РљРў-СЃРµСЂРёСЋ.");
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
        throw new Error(await responseErrorMessage(response, "Р“РѕС‚РѕРІРЅРѕСЃС‚СЊ СЃС‚Р°РЅС†РёРё РїСЂРѕСЃРјРѕС‚СЂР° РЅРµ РїСЂРѕРІРµСЂРµРЅР°"));
      }
      setDicomWorkstationReadiness((await response.json()) as DicomWorkstationReadinessResponse);
      setDicomViewerWorkbenchManifest(null);
      setDicomWorkbenchLocalSavedAt(null);
      setDicomRenderCachePlan(null);
    } catch (readinessError) {
      if (isLocalDicomOperationAbortError(readinessError)) return;
      setError(operatorWorkflowFailureMessage("Р“РѕС‚РѕРІРЅРѕСЃС‚СЊ СЃС‚Р°РЅС†РёРё РїСЂРѕСЃРјРѕС‚СЂР° РЅРµ РїСЂРѕРІРµСЂРµРЅР°", readinessError));
    } finally {
      finishLocalDicomOperation(controller);
      setIsDicomWorkstationChecking(false);
    }
  }

  async function buildDicomRenderCachePlan() {
    if (!cbctWorkbenchSeries || !dicomWorkstationReadiness) {
      const missingSteps = [
        !cbctWorkbenchSeries ? "РІС‹Р±РµСЂРёС‚Рµ РіРѕС‚РѕРІСѓСЋ РљР›РљРў/РљРў-СЃРµСЂРёСЋ" : null,
        !dicomWorkstationReadiness ? "СЃРЅР°С‡Р°Р»Р° РїСЂРѕРІРµСЂСЊС‚Рµ СЌС‚РѕС‚ РџРљ" : null
      ].filter((step): step is string => Boolean(step));
      setError(`РџРµСЂРµРґ РїР»Р°РЅРѕРј Р±С‹СЃС‚СЂРѕР№ Р·Р°РіСЂСѓР·РєРё СЃРЅРёРјРєРѕРІ: ${missingSteps.join(", ")}.`);
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
        throw new Error(await responseErrorMessage(response, "РџР»Р°РЅ Р±С‹СЃС‚СЂРѕР№ Р·Р°РіСЂСѓР·РєРё СЃРЅРёРјРєРѕРІ РЅРµ РїРѕСЃС‚СЂРѕРµРЅ"));
      }
      setDicomViewerWorkbenchManifest(null);
      setDicomWorkbenchLocalSavedAt(null);
      setDicomRenderCachePlan((await response.json()) as DicomRenderCachePlanResponse);
    } catch (cachePlanError) {
      if (isLocalDicomOperationAbortError(cachePlanError)) return;
      setError(operatorWorkflowFailureMessage("РџР»Р°РЅ Р±С‹СЃС‚СЂРѕР№ Р·Р°РіСЂСѓР·РєРё СЃРЅРёРјРєРѕРІ РЅРµ РїРѕСЃС‚СЂРѕРµРЅ", cachePlanError));
    } finally {
      finishLocalDicomOperation(controller);
      setIsDicomRenderCachePlanning(false);
    }
  }

  async function commitImagingImport() {
    if (isImagingImportCommitting) {
      setError("Р”РѕР¶РґРёС‚РµСЃСЊ Р·Р°РІРµСЂС€РµРЅРёСЏ С‚РµРєСѓС‰РµР№ РїСЂРёРІСЏР·РєРё СЃРЅРёРјРєРѕРІ.");
      return;
    }
    if (!imagingImportText.trim()) {
      setError("Р’СЃС‚Р°РІСЊС‚Рµ СЃС‚СЂРѕРєРё СЃРѕ СЃРЅРёРјРєР°РјРё РёР»Рё РІС‹Р±РµСЂРёС‚Рµ РїСЂРёРјРµСЂ РљРў/РћРџРўР“/РўР Р“ РїРµСЂРµРґ РїСЂРёРІСЏР·РєРѕР№.");
      return;
    }
    if (!imagingImportPreview) {
      setError("РЎРЅР°С‡Р°Р»Р° РїСЂРѕРІРµСЂСЊС‚Рµ РёРјРїРѕСЂС‚ СЃРЅРёРјРєРѕРІ, С‡С‚РѕР±С‹ СѓРІРёРґРµС‚СЊ РіРѕС‚РѕРІС‹Рµ Рё РїСЂРѕР±Р»РµРјРЅС‹Рµ СЃС‚СЂРѕРєРё.");
      return;
    }
    if (imagingImportPreview.readyRows === 0) {
      setError("Р’ РёРјРїРѕСЂС‚Рµ СЃРЅРёРјРєРѕРІ РЅРµС‚ РіРѕС‚РѕРІС‹С… СЃС‚СЂРѕРє. РСЃРїСЂР°РІСЊС‚Рµ РїСЂРµРґСѓРїСЂРµР¶РґРµРЅРёСЏ Рё РїРѕРІС‚РѕСЂРёС‚Рµ РїСЂРѕРІРµСЂРєСѓ.");
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
        throw new Error(await responseErrorMessage(response, "РРјРїРѕСЂС‚ СЃРЅРёРјРєРѕРІ РЅРµ Р·Р°РїРёСЃР°РЅ"));
      }
      const result = (await response.json()) as ImagingImportCommitResponse;
      setImagingImportCommit(result);
      setImagingImportPreview(result.preview);
      await loadDashboard();
    } catch (importError) {
      setError(operatorWorkflowFailureMessage("РЎРЅРёРјРєРё РЅРµ Р·Р°РїРёСЃР°РЅС‹", importError));
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
      setSpeechStatusNote("Р”РёРєС‚РѕРІРєР° СѓР¶Рµ РїСѓСЃС‚Р°СЏ. РќРµС‡РµРіРѕ РѕС‡РёС‰Р°С‚СЊ.");
      return;
    }
    visitDraftUserEditedRef.current = true;
    setClearedTranscriptSnapshot(previousTranscript);
    setTranscript("");
    setSpeechStatusNote("Р”РёРєС‚РѕРІРєР° РѕС‡РёС‰РµРЅР°. РњРѕР¶РЅРѕ СЃСЂР°Р·Сѓ РІРµСЂРЅСѓС‚СЊ С‚РµРєСЃС‚ РєРЅРѕРїРєРѕР№ В«Р’РµСЂРЅСѓС‚СЊВ».");
  }

  function undoTranscriptClear() {
    if (!clearedTranscriptSnapshot) {
      setSpeechStatusNote("РќРµС‚ РѕС‡РёС‰РµРЅРЅРѕР№ РґРёРєС‚РѕРІРєРё РґР»СЏ РІРѕСЃСЃС‚Р°РЅРѕРІР»РµРЅРёСЏ.");
      return;
    }
    visitDraftUserEditedRef.current = true;
    setTranscript(clearedTranscriptSnapshot);
    setClearedTranscriptSnapshot(null);
    setSpeechStatusNote("Р”РёРєС‚РѕРІРєР° РІРѕСЃСЃС‚Р°РЅРѕРІР»РµРЅР° РёР· Р»РѕРєР°Р»СЊРЅРѕРіРѕ С‡РµСЂРЅРѕРІРёРєР°.");
  }

  function startVisitDictation() {
    if (isVisitDictating) {
      setError("Р”РѕР¶РґРёС‚РµСЃСЊ Р·Р°РІРµСЂС€РµРЅРёСЏ С‚РµРєСѓС‰РµР№ Р±СЂР°СѓР·РµСЂРЅРѕР№ РґРёРєС‚РѕРІРєРё.");
      return;
    }
    const speechWindow = window as BrowserWindowWithSpeech;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setError("Р‘СЂР°СѓР·РµСЂРЅР°СЏ РґРёРєС‚РѕРІРєР° РЅРµРґРѕСЃС‚СѓРїРЅР°. РўРµРєСЃС‚ РјРѕР¶РЅРѕ РїРµС‡Р°С‚Р°С‚СЊ РІСЂСѓС‡РЅСѓСЋ, Р»РѕРєР°Р»СЊРЅС‹Р№ С‡РµСЂРЅРѕРІРёРє РІСЃРµ СЂР°РІРЅРѕ СЃРѕС…СЂР°РЅРёС‚СЃСЏ.");
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
      setError("Р”РёРєС‚РѕРІРєР° РЅРµ СЂР°СЃРїРѕР·РЅР°РЅР°. РџСЂРѕРґРѕР»Р¶Р°Р№С‚Рµ РїРµС‡Р°С‚Р°С‚СЊ, С‚РµРєСѓС‰РёР№ С‡РµСЂРЅРѕРІРёРє РЅРµ РїРѕС‚РµСЂСЏРЅ.");
      setIsVisitDictating(false);
    };
    recognition.onend = () => setIsVisitDictating(false);
    setError(null);
    setIsVisitDictating(true);
    try {
      recognition.start();
    } catch {
      setIsVisitDictating(false);
      setError("Р‘СЂР°СѓР·РµСЂ РЅРµ СЃРјРѕРі Р·Р°РїСѓСЃС‚РёС‚СЊ РјРёРєСЂРѕС„РѕРЅ. РўРµРєСЃС‚ РјРѕР¶РЅРѕ РїСЂРѕРґРѕР»Р¶РёС‚СЊ РІСЂСѓС‡РЅСѓСЋ.");
    }
  }

  function preferredSpeechMimeType(): string {
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
    return candidates?.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? "";
  }

  async function uploadSpeechBlob(blob: Blob) {
    if (!dashboard || blob.size === 0) return;
    const maxChunkBytes = speechGatewayStatus?.maxChunkBytes ?? 6_000_000;
    if (blob.size > maxChunkBytes) {
      setSpeechStatusNote(
        `Р Р°СЃРїРѕР·РЅР°РІР°РЅРёРµ: Р°СѓРґРёРѕ-С„СЂР°РіРјРµРЅС‚ ${Math.round(blob.size / 1024 / 1024)} РњР‘ Р±РѕР»СЊС€Рµ Р»РёРјРёС‚Р° ${Math.round(
          maxChunkBytes / 1024 / 1024
        )} РњР‘; Р·Р°РїРёСЃСЊ РїСЂРѕРґРѕР»Р¶Р°РµС‚СЃСЏ, СѓРјРµРЅСЊС€РёС‚Рµ РґР»РёС‚РµР»СЊРЅРѕСЃС‚СЊ С‡Р°РЅРєР° РёР»Рё РёСЃРїРѕР»СЊР·СѓР№С‚Рµ Р»РѕРєР°Р»СЊРЅС‹Р№ РјРѕРґСѓР»СЊ.`
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
      patientId: dashboard?.activeVisit?.patientId,
      visitId: dashboard?.activeVisit?.id,
      specialty: selectedSpecialty,
      clientRecordedAt: new Date().toISOString()
    };
    const queuedBeforeUpload = await queuePendingSpeechChunk(chunk, activeOrganizationId);
    await refreshPendingSpeechChunkState();

    if (!isOnline || !speechGatewayCanUpload(speechGatewayStatus)) {
      setSpeechStatusNote(
        queuedBeforeUpload
          ? `Р¤СЂР°РіРјРµРЅС‚ ${chunkIndex + 1} СЃРѕС…СЂР°РЅРµРЅ Р»РѕРєР°Р»СЊРЅРѕ; СЂР°СЃРїРѕР·РЅР°РІР°РЅРёРµ РѕС‚РїСЂР°РІРёС‚СЃСЏ, РєРѕРіРґР° РёСЃС‚РѕС‡РЅРёРє Р±СѓРґРµС‚ РіРѕС‚РѕРІ.`
          : `Р¤СЂР°РіРјРµРЅС‚ ${chunkIndex + 1} РЅРµ СЃРѕС…СЂР°РЅРµРЅ: Р»РѕРєР°Р»СЊРЅР°СЏ РѕС‡РµСЂРµРґСЊ РЅРµРґРѕСЃС‚СѓРїРЅР°.`
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
          ? `Р¤СЂР°РіРјРµРЅС‚ ${chunkIndex + 1} СЃРѕС…СЂР°РЅРµРЅ Р»РѕРєР°Р»СЊРЅРѕ Рё СѓР№РґРµС‚ РЅР° СЃРµСЂРІРµСЂ РїРѕР·Р¶Рµ.`
          : `Р¤СЂР°РіРјРµРЅС‚ ${chunkIndex + 1} РЅРµ РѕС‚РїСЂР°РІР»РµРЅ: ${
              operatorReadableErrorDetailFromUnknown(speechError) ?? "РїРѕРІС‚РѕСЂРёС‚Рµ Р·Р°РїРёСЃСЊ РёР»Рё РїСЂРѕРІРµСЂСЊС‚Рµ РїРѕРґРєР»СЋС‡РµРЅРёРµ Рє СЃРµСЂРІРµСЂСѓ РєР»РёРЅРёРєРё"
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
        setSpeechStatusNote(reason === "silence" ? "Р¤СЂР°РіРјРµРЅС‚ РѕС‚РїСЂР°РІР»РµРЅ РїРѕСЃР»Рµ РїР°СѓР·С‹." : "Р¤СЂР°РіРјРµРЅС‚ РѕС‚РїСЂР°РІР»РµРЅ РїРѕ Р»РёРјРёС‚Сѓ РІСЂРµРјРµРЅРё.");
      }
    } catch {
      setSpeechStatusNote("Р‘СЂР°СѓР·РµСЂ РЅРµ РѕС‚РґР°Р» Р°СѓРґРёРѕ-С„СЂР°РіРјРµРЅС‚, Р·Р°РїРёСЃСЊ РїСЂРѕРґРѕР»Р¶Р°РµС‚СЃСЏ.");
    }
  }

  function startSpeechMonitor(stream: MediaStream, recorder: MediaRecorder, status: SpeechGatewayStatus | null) {
    stopSpeechMonitor();
    const audioWindow = window as BrowserWindowWithSpeech;
    const AudioContextClass = window.AudioContext ?? audioWindow.webkitAudioContext;
    const providerLabel = status?.providerLabel ?? "Р›РѕРєР°Р»СЊРЅР°СЏ Р·Р°РїРёСЃСЊ";
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
      setSpeechStatusNote(`${providerLabel}: Р·Р°РїРёСЃСЊ РёРґРµС‚ РїРѕ С‚Р°Р№РјРµСЂСѓ, Web Audio РЅРµРґРѕСЃС‚СѓРїРµРЅ.`);
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
        `${providerLabel}: СѓРјРЅС‹Рµ С„СЂР°РіРјРµРЅС‚С‹ ${Math.round(chunkingPolicy.minChunkMs / 1000)}-${Math.round(
          chunkingPolicy.maxChunkMs / 1000
        )} СЃРµРє., РїР°СѓР·Р° ${chunkingPolicy.silenceMs} РјСЃ.`
      );
    } catch {
      stopSpeechMonitor();
      recorder.start(recommendedChunkMs);
      setSpeechStatusNote(`${providerLabel}: Р·Р°РїРёСЃСЊ РёРґРµС‚ РїРѕ С‚Р°Р№РјРµСЂСѓ, СѓРјРЅРѕРµ РґРµР»РµРЅРёРµ РЅРµРґРѕСЃС‚СѓРїРЅРѕ.`);
    }
  }

  async function startServerVoiceRecording() {
    if (!dashboard) {
      setError("Р”Р°РЅРЅС‹Рµ РїСЂРёРµРјР° РµС‰Рµ РЅРµ Р·Р°РіСЂСѓР¶РµРЅС‹. РџРѕРІС‚РѕСЂРёС‚Рµ Р·Р°РїРёСЃСЊ РїРѕСЃР»Рµ Р·Р°РіСЂСѓР·РєРё СЂР°Р±РѕС‡РµРіРѕ СЌРєСЂР°РЅР°.");
      return;
    }
    if (isServerVoiceRecording || mediaRecorderRef.current?.state === "recording") {
      setError("Р—Р°РїРёСЃСЊ СѓР¶Рµ РёРґРµС‚. РќР°Р¶РјРёС‚Рµ В«РЎС‚РѕРї Р·Р°РїРёСЃСЊВ», С‡С‚РѕР±С‹ Р·Р°РІРµСЂС€РёС‚СЊ С‚РµРєСѓС‰РёР№ С„СЂР°РіРјРµРЅС‚.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Р—Р°РїРёСЃСЊ Р°СѓРґРёРѕ РЅРµРґРѕСЃС‚СѓРїРЅР° РІ СЌС‚РѕРј Р±СЂР°СѓР·РµСЂРµ. РўРµРєСЃС‚ РјРѕР¶РЅРѕ РїРµС‡Р°С‚Р°С‚СЊ РІСЂСѓС‡РЅСѓСЋ, Р»РѕРєР°Р»СЊРЅС‹Р№ С‡РµСЂРЅРѕРІРёРє СЃРѕС…СЂР°РЅРёС‚СЃСЏ.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = preferredSpeechMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      speechRecordingIdRef.current = createLocalQueueId();
      speechChunkIndexRef.current = 0;
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
          trackSpeechUpload(uploadSpeechBlob(event.data));
        }
      };
      recorder.onstop = () => {
        const recordingId = speechRecordingIdRef.current;
        stopSpeechMonitor();
        stream.getTracks().forEach((track) => track.stop());
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
        setSpeechStatusNote(
          isOnline
            ? "Р—Р°РїРёСЃСЊ РёРґРµС‚ РІ Р»РѕРєР°Р»СЊРЅСѓСЋ РѕС‡РµСЂРµРґСЊ: СЃРµСЂРІРµСЂРЅРѕРµ СЂР°СЃРїРѕР·РЅР°РІР°РЅРёРµ РїРѕРєР° РЅРµ РіРѕС‚РѕРІРѕ, Р°СѓРґРёРѕ РЅРµ РѕС‚РїСЂР°РІР»СЏРµС‚СЃСЏ."
            : "Р—Р°РїРёСЃСЊ РёРґРµС‚ РІ Р»РѕРєР°Р»СЊРЅСѓСЋ РѕС‡РµСЂРµРґСЊ: РѕС„Р»Р°Р№РЅ, Р°СѓРґРёРѕ РѕС‚РїСЂР°РІРёС‚СЃСЏ РїРѕСЃР»Рµ РїРѕРґРєР»СЋС‡РµРЅРёСЏ."
        );
      }
      setIsServerVoiceRecording(true);
    } catch (recordingError) {
      setIsServerVoiceRecording(false);
      setError(browserCapabilityFailureMessage("РњРёРєСЂРѕС„РѕРЅ РЅРµРґРѕСЃС‚СѓРїРµРЅ", recordingError));
    }
  }

  function stopServerVoiceRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      speechPendingChunkDurationMsRef.current = Math.max(250, Date.now() - speechSegmentStartedAtRef.current);
      recorder.requestData();
      recorder.stop();
      return;
    }
    const recordingId = speechRecordingIdRef.current;
    if (!recordingId && !mediaStreamRef.current && !isServerVoiceRecording) {
      setSpeechStatusNote("РђРєС‚РёРІРЅРѕР№ Р·Р°РїРёСЃРё РґРёРєС‚РѕРІРєРё РЅРµС‚.");
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
      setError("Р”РѕР¶РґРёС‚РµСЃСЊ Р·Р°РІРµСЂС€РµРЅРёСЏ С‚РµРєСѓС‰РµР№ РґРёРєС‚РѕРІРєРё РёРјРїРѕСЂС‚Р°.");
      return;
    }
    const speechWindow = window as BrowserWindowWithSpeech;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setImportSourceKind("voice_dictation");
      setImportText((current) =>
        `${current}\n\nР”РёРєС‚РѕРІРєР° РЅРµРґРѕСЃС‚СѓРїРЅР° РІ СЌС‚РѕРј Р±СЂР°СѓР·РµСЂРµ. Р’СЃС‚Р°РІСЊ СЂР°СЃРїРѕР·РЅР°РЅРЅС‹Р№ С‚РµРєСЃС‚ СЃСЋРґР°: РРІР°РЅРѕРІ РРІР°РЅ, С‚РµР»РµС„РѕРЅ +7 900 000-00-00, РґР°С‚Р° СЂРѕР¶РґРµРЅРёСЏ 01.01.1980.`
      );
      setError("Р‘СЂР°СѓР·РµСЂРЅР°СЏ РґРёРєС‚РѕРІРєР° РёРјРїРѕСЂС‚Р° РЅРµРґРѕСЃС‚СѓРїРЅР°. Р’СЃС‚Р°РІСЊС‚Рµ СЃРїРёСЃРѕРє РїР°С†РёРµРЅС‚РѕРІ РІСЂСѓС‡РЅСѓСЋ РёР»Рё Р·Р°РіСЂСѓР·РёС‚Рµ OCR.");
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
      setError("Р”РёРєС‚РѕРІРєР° РёРјРїРѕСЂС‚Р° РЅРµ СЂР°СЃРїРѕР·РЅР°РЅР°. Р’СЃС‚Р°РІСЊС‚Рµ СЃРїРёСЃРѕРє РІСЂСѓС‡РЅСѓСЋ РёР»Рё Р·Р°РіСЂСѓР·РёС‚Рµ OCR.");
    };
    recognition.onend = () => setIsImportDictating(false);
    setError(null);
    setIsImportDictating(true);
    try {
      recognition.start();
    } catch {
      setIsImportDictating(false);
      setError("Р‘СЂР°СѓР·РµСЂ РЅРµ СЃРјРѕРі Р·Р°РїСѓСЃС‚РёС‚СЊ РјРёРєСЂРѕС„РѕРЅ РґР»СЏ РёРјРїРѕСЂС‚Р°. Р’СЃС‚Р°РІСЊС‚Рµ СЃРїРёСЃРѕРє РїР°С†РёРµРЅС‚РѕРІ РІСЂСѓС‡РЅСѓСЋ РёР»Рё Р·Р°РіСЂСѓР·РёС‚Рµ С„Р°Р№Р».");
    }
  }

  async function createClinicalRuleFromSettings() {
    if (!dashboard) {
      setError("Р”Р°РЅРЅС‹Рµ РєР»РёРЅРёРєРё РµС‰Рµ РЅРµ Р·Р°РіСЂСѓР¶РµРЅС‹. РџРѕРІС‚РѕСЂРёС‚Рµ СЃРѕР·РґР°РЅРёРµ РїСЂР°РІРёР»Р° РїРѕСЃР»Рµ Р·Р°РіСЂСѓР·РєРё РЅР°СЃС‚СЂРѕРµРє.");
      return;
    }
    if (isClinicalRuleSaving) {
      setError("Р”РѕР¶РґРёС‚РµСЃСЊ Р·Р°РІРµСЂС€РµРЅРёСЏ С‚РµРєСѓС‰РµР№ Р·Р°РїРёСЃРё РєР»РёРЅРёС‡РµСЃРєРѕРіРѕ РїСЂР°РІРёР»Р°.");
      return;
    }
    if (!newRuleTitle.trim() || !newRuleWarningText.trim() || !newRulePatientText.trim()) {
      setError("РљР»РёРЅРёС‡РµСЃРєРѕРµ РїСЂР°РІРёР»Рѕ РґРѕР»Р¶РЅРѕ РёРјРµС‚СЊ РЅР°Р·РІР°РЅРёРµ, РїСЂРµРґСѓРїСЂРµР¶РґРµРЅРёРµ Рё РѕР±СЉСЏСЃРЅРµРЅРёРµ РґР»СЏ РїР°С†РёРµРЅС‚Р°.");
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
          condition: "РќР°СЃС‚СЂРѕРµРЅРѕ РІ Р±РёР±Р»РёРѕС‚РµРєРµ РїСЂР°РІРёР» РєР»РёРЅРёРєРё.",
          warningText: newRuleWarningText.trim(),
          patientText: newRulePatientText.trim(),
          active: true
        })
      });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response, "РљР»РёРЅРёС‡РµСЃРєРѕРµ РїСЂР°РІРёР»Рѕ РЅРµ СЃРѕС…СЂР°РЅРµРЅРѕ"));
      }
      await loadDashboard();
    } catch (ruleError) {
      setError(operatorWorkflowFailureMessage("РљР»РёРЅРёС‡РµСЃРєРѕРµ РїСЂР°РІРёР»Рѕ РЅРµ СЃРѕС…СЂР°РЅРµРЅРѕ", ruleError));
    } finally {
      setIsClinicalRuleSaving(false);
    }
  }

  async function toggleClinicalRule(rule: Dashboard["clinicalRules"][number]) {
    if (isClinicalRuleSaving) {
      setError("Р”РѕР¶РґРёС‚РµСЃСЊ Р·Р°РІРµСЂС€РµРЅРёСЏ С‚РµРєСѓС‰РµР№ Р·Р°РїРёСЃРё РєР»РёРЅРёС‡РµСЃРєРѕРіРѕ РїСЂР°РІРёР»Р°.");
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
        throw new Error(await responseErrorMessage(response, "РљР»РёРЅРёС‡РµСЃРєРѕРµ РїСЂР°РІРёР»Рѕ РЅРµ РѕР±РЅРѕРІР»РµРЅРѕ"));
      }
      await loadDashboard();
    } catch (ruleError) {
      setError(operatorWorkflowFailureMessage("РљР»РёРЅРёС‡РµСЃРєРѕРµ РїСЂР°РІРёР»Рѕ РЅРµ РѕР±РЅРѕРІР»РµРЅРѕ", ruleError));
    } finally {
      setIsClinicalRuleSaving(false);
    }
  }

  function requiredDocumentField(value: string, label: string): string | null {
    return value.trim() ? null : `Р—Р°РїРѕР»РЅРёС‚Рµ РїРѕР»Рµ: ${label}.`;
  }

  function confirmedDocumentLiteral(value: boolean, label: string): true {
    if (!value) {
      throw new Error(`РќРµ РїРѕРґС‚РІРµСЂР¶РґРµРЅРѕ РѕР±СЏР·Р°С‚РµР»СЊРЅРѕРµ СѓСЃР»РѕРІРёРµ РґРѕРєСѓРјРµРЅС‚Р°: ${label}.`);
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
        stageName: stageName || `Р­С‚Р°Рї ${index + 1}`,
        plannedServices: plannedServices || "РѕР±СЉРµРј Р»РµС‡РµРЅРёСЏ РїРѕ РІС‹Р±СЂР°РЅРЅРѕРјСѓ РїР»Р°РЅСѓ",
        plannedTiming: plannedTiming || "РїРѕ СЂР°СЃРїРёСЃР°РЅРёСЋ РєР»РёРЅРёРєРё",
        estimatedAmountRub: Number.isFinite(parsedAmount) ? parsedAmount : null
      };
    });
  }

  function treatmentAcceptancePlannedTotalRub(): number {
    return (
      activeTreatmentPlanItems
        .filter((item) => item.status !== "cancelled")
        .filter((item) => !dashboard?.activeVisit?.id || item.visitId === dashboard?.activeVisit?.id)
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
        stageName: stageName || `Р­С‚Р°Рї ${index + 1}`,
        plannedServices: plannedServices || "РѕР±СЉРµРј Р»РµС‡РµРЅРёСЏ РїРѕ РєР»РёРЅРёС‡РµСЃРєРѕРјСѓ РїР»Р°РЅСѓ",
        plannedTiming: plannedTiming || "РїРѕ СЂР°СЃРїРёСЃР°РЅРёСЋ РєР»РёРЅРёРєРё",
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
    return treatmentPlanClinicalReason.trim() || dashboard?.activeVisit?.complaint?.trim() || "РїР»Р°РЅРѕРІРѕРµ СЃС‚РѕРјР°С‚РѕР»РѕРіРёС‡РµСЃРєРѕРµ Р»РµС‡РµРЅРёРµ РїРѕ СЂРµР·СѓР»СЊС‚Р°С‚Р°Рј РѕСЃРјРѕС‚СЂР°";
  }

  function treatmentPlanDiagnosisSummaryValue(): string {
    return treatmentPlanDiagnosisSummary.trim() || dashboard?.activeVisit?.diagnosis?.trim() || dashboard?.activeVisit?.complaint?.trim() || "";
  }

  function treatmentPlanTeethOrAreaValue(): string {
    return treatmentPlanTeethOrArea.trim() || inferredTreatmentArea || "";
  }

  function normalizeClinicalToothAlias(value: string): string {
    return value
      .trim()
      .toLocaleLowerCase("ru-RU")
      .replaceAll("С‘", "Рµ")
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
      "РѕР±Р»Р°СЃС‚СЊ Р»РµС‡РµРЅРёСЏ";
    const fallbackFinding =
      procedureConsentDiagnosisOrIndication.trim() ||
      treatmentPlanDiagnosisSummaryValue() ||
      treatmentAcceptanceDiagnosisSummary.trim() ||
      recordExtractDiagnosisValue() ||
      "РєР»РёРЅРёС‡РµСЃРєР°СЏ РЅР°С…РѕРґРєР° С‚СЂРµР±СѓРµС‚ СѓС‚РѕС‡РЅРµРЅРёСЏ РІСЂР°С‡РѕРј";
    const fallbackIndication =
      treatmentPlanClinicalReasonValue() || recordExtractComplaintAndAnamnesisValue() || "РјРµРґРёС†РёРЅСЃРєРѕРµ РїРѕРєР°Р·Р°РЅРёРµ Рє Р»РµС‡РµРЅРёСЋ";
    const fallbackAction =
      dashboard?.activeVisit?.treatmentPlan?.trim() || procedureConsentProcedureName.trim() || treatmentAcceptanceClinicalGoal.trim() || "СЃРѕРіР»Р°СЃРѕРІР°РЅРЅРѕРµ СЃС‚РѕРјР°С‚РѕР»РѕРіРёС‡РµСЃРєРѕРµ Р»РµС‡РµРЅРёРµ";

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
        toothOrArea: toothOrArea || fallbackArea || `Р·РѕРЅР° ${index + 1}`,
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
    return activePayments.filter((payment) => payment.status === "paid" && (!dashboard?.activeVisit?.id || payment.visitId === dashboard?.activeVisit?.id));
  }

  function paidContractTotalRubValue(): number {
    const manual = Number(paidContractTotalRub.replace(/[^\d]/g, ""));
    return manual > 0 ? manual : treatmentAcceptancePlannedTotalRub();
  }

  function paidContractCustomerFullNameValue(): string {
    return paidContractCustomerFullName.trim() || documentPatient?.fullName || "";
  }

  function paidContractCareReasonValue(): string {
    return paidContractCareReason.trim() || dashboard?.activeVisit?.complaint?.trim() || "РїР»Р°РЅРѕРІРѕРµ СЃС‚РѕРјР°С‚РѕР»РѕРіРёС‡РµСЃРєРѕРµ Р»РµС‡РµРЅРёРµ РїРѕ СЂРµР·СѓР»СЊС‚Р°С‚Р°Рј РѕСЃРјРѕС‚СЂР°";
  }

  function paidContractServiceScopeValue(): string {
    return paidContractServiceScope.trim() || dashboard?.activeVisit?.treatmentPlan?.trim() || dashboard?.activeVisit?.doctorSummary?.trim() || "";
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
    return completedActServicesSummary.trim() || dashboard?.activeVisit?.doctorSummary?.trim() || dashboard?.activeVisit?.treatmentPlan?.trim() || "";
  }

  function completedActDoctorFullNameValue(): string {
    return completedActDoctorFullName.trim() || activeDoctor?.fullName || "";
  }

  function plannedServiceLinesForFinancialPayload() {
    return activeTreatmentPlanItems
      .filter((item) => item.status !== "cancelled")
      .filter((item) => !dashboard?.activeVisit?.id || item.visitId === dashboard?.activeVisit?.id)
      .map((item) => {
        const service = dashboard?.serviceCatalog?.find((catalogItem) => catalogItem.id === item.serviceId);
        const totalRub = Math.max(0, item.unitPriceRub * item.quantity - item.discountRub);
        return {
          serviceName: service?.title ?? item.serviceId,
          toothOrArea: item.toothCode ? `Р·СѓР± ${item.toothCode}` : null,
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
      compactDocumentText(dashboard?.activeVisit?.diagnosis, dashboard?.activeVisit?.complaint, dashboard?.activeVisit?.treatmentPlan) ||
      "РїР»Р°РЅРѕРІРѕРµ СЃС‚РѕРјР°С‚РѕР»РѕРіРёС‡РµСЃРєРѕРµ Р»РµС‡РµРЅРёРµ РїРѕ СЂРµР·СѓР»СЊС‚Р°С‚Р°Рј РѕСЃРјРѕС‚СЂР°"
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
    return paymentInvoiceBankDetails.trim() || dashboard?.clinicSettings?.profile?.bankDetails?.trim() || "";
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
    return paymentReceiptPayerRelationship.trim() || firstPaymentReceiptPayment()?.payerRelationship?.trim() || "РїР°С†РёРµРЅС‚";
  }

  function paymentReceiptIssuedByValue(): string {
    return paymentReceiptIssuedBy.trim() || activeDoctor?.fullName || "РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ РєР»РёРЅРёРєРё";
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
      const parsedStatus = installmentPaymentStatusAliases[status?.toLocaleLowerCase("ru-RU").replaceAll("С‘", "Рµ") ?? ""] ?? "planned";
      return {
        label: label || `РџР»Р°С‚РµР¶ ${index + 1}`,
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
      { label: "РџРµСЂРІС‹Р№ РїР»Р°С‚РµР¶", dueDate: dateInputValuePlusDays(7), amountRub: firstPart, status: "planned" as const },
      ...(secondPart > 0 ? [{ label: "Р¤РёРЅР°Р»СЊРЅС‹Р№ РїР»Р°С‚РµР¶", dueDate: dateInputValuePlusDays(21), amountRub: secondPart, status: "planned" as const }] : [])
    ];
  }

  function installmentScheduleBaseDocumentTitleValue(): string {
    return installmentScheduleBaseDocumentTitle.trim() || activeUsableDocuments?.find((document) => document.kind === "paid_medical_services_contract")?.title || "РґРѕРіРѕРІРѕСЂ РёР»Рё РїР»Р°РЅ Р»РµС‡РµРЅРёСЏ РєР»РёРЅРёРєРё";
  }

  function installmentSchedulePayerFullNameValue(): string {
    return installmentSchedulePayerFullName.trim() || documentPatient?.fullName || "";
  }

  function installmentScheduleResponsibleFullNameValue(): string {
    return installmentScheduleResponsibleFullName.trim() || activeDoctor?.fullName || "РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ РєР»РёРЅРёРєРё";
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
    return minorConsentInterventionScope.trim() || dashboard?.activeVisit?.treatmentPlan?.trim() || "СЃС‚РѕРјР°С‚РѕР»РѕРіРёС‡РµСЃРєРѕРµ РІРјРµС€Р°С‚РµР»СЊСЃС‚РІРѕ РїРѕ СЃРѕРіР»Р°СЃРѕРІР°РЅРЅРѕРјСѓ РїР»Р°РЅСѓ";
  }

  function minorConsentDiagnosisOrIndicationValue(): string {
    return minorConsentDiagnosisOrIndication.trim() || dashboard?.activeVisit?.diagnosis?.trim() || dashboard?.activeVisit?.complaint?.trim() || "";
  }

  function minorConsentDoctorFullNameValue(): string {
    return minorConsentDoctorFullName.trim() || activeDoctor?.fullName || "";
  }

  function warrantyServiceOrWorkNameValue(): string {
    return warrantyServiceOrWorkName.trim() || dashboard?.activeVisit?.treatmentPlan?.trim() || dashboard?.activeVisit?.doctorSummary?.trim() || "";
  }

  function warrantyTeethOrAreaValue(): string {
    return warrantyTeethOrArea.trim() || inferredTreatmentArea || "РѕР±Р»Р°СЃС‚СЊ Р»РµС‡РµРЅРёСЏ РїРѕ РІРёР·РёС‚Сѓ";
  }

  function warrantyLinkedActOrContractValue(): string {
    return (
      warrantyLinkedActOrContract.trim() ||
      activeUsableDocuments?.find((document) => document.kind === "completed_works_act" || document.kind === "paid_medical_services_contract")?.title ||
      "Р°РєС‚ РІС‹РїРѕР»РЅРµРЅРЅС‹С… СЂР°Р±РѕС‚ РёР»Рё РґРѕРіРѕРІРѕСЂ РєР»РёРЅРёРєРё"
    );
  }

  function warrantyDoctorFullNameValue(): string {
    return warrantyDoctorFullName.trim() || activeDoctor?.fullName || "";
  }

  function postVisitProcedureNameValue(): string {
    return postVisitProcedureName.trim() || dashboard?.activeVisit?.treatmentPlan?.trim() || "Р РµРєРѕРјРµРЅРґР°С†РёРё РїРѕСЃР»Рµ СЃС‚РѕРјР°С‚РѕР»РѕРіРёС‡РµСЃРєРѕРіРѕ РїСЂРёРµРјР°";
  }

  function postVisitToothOrAreaValue(): string {
    return postVisitToothOrArea.trim() || inferredTreatmentArea || "РѕР±Р»Р°СЃС‚СЊ Р»РµС‡РµРЅРёСЏ РїРѕ Р·Р°РїРёСЃРё РїСЂРёРµРјР°";
  }

  function postVisitDoctorFullNameValue(): string {
    return postVisitDoctorFullName.trim() || activeDoctor?.fullName || "";
  }

  function applyPostVisitCarePreset(topic: PostVisitCareTopic, options: { force?: boolean } = {}) {
    const topicLabel = postVisitCareTopicOptions?.find((option) => option.value === topic)?.label ?? "РІС‹Р±СЂР°РЅРЅРѕР№ С‚РµРјС‹";
    if (postVisitManualEdited && !options.force) {
      setPostVisitPresetFeedback(
        `РўРµРјР° "${topicLabel}" РІС‹Р±СЂР°РЅР°. РўРµРєСЃС‚ РЅРµ РїРµСЂРµР·Р°РїРёСЃР°РЅ, РїРѕС‚РѕРјСѓ С‡С‚Рѕ РµСЃС‚СЊ СЂСѓС‡РЅС‹Рµ РїСЂР°РІРєРё. РќР°Р¶РјРёС‚Рµ "РџРѕРґСЃС‚Р°РІРёС‚СЊ РїР°РјСЏС‚РєСѓ РґР»СЏ С‚РµРјС‹", РµСЃР»Рё РЅСѓР¶РЅРѕ Р·Р°РјРµРЅРёС‚СЊ РїРѕР»СЏ.`
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
    setPostVisitPresetFeedback(options.force ? `РџР°РјСЏС‚РєР° РґР»СЏ С‚РµРјС‹ "${topicLabel}" РїРѕРґСЃС‚Р°РІР»РµРЅР°, СЂСѓС‡РЅС‹Рµ РїСЂР°РІРєРё СЃР±СЂРѕС€РµРЅС‹.` : "");
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
    return recordExtractComplaintAndAnamnesis.trim() || compactDocumentText(dashboard?.activeVisit?.complaint, dashboard?.activeVisit?.anamnesis);
  }

  function recordExtractObjectiveStatusValue(): string {
    return recordExtractObjectiveStatus.trim() || dashboard?.activeVisit?.objectiveStatus?.trim() || "";
  }

  function recordExtractDiagnosisValue(): string {
    return recordExtractDiagnosis.trim() || dashboard?.activeVisit?.diagnosis?.trim() || "";
  }

  function recordExtractTreatmentProvidedValue(): string {
    return recordExtractTreatmentProvided.trim() || compactDocumentText(dashboard?.activeVisit?.doctorSummary, dashboard?.activeVisit?.treatmentPlan);
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
    return dashboard?.activeVisit?.id ? [dashboard?.activeVisit?.id] : [];
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
      position: "РІСЂР°С‡-СЃС‚РѕРјР°С‚РѕР»РѕРі",
      specialty: activeDoctor?.specialties?.[0] ?? "СЃС‚РѕРјР°С‚РѕР»РѕРіРёСЏ"
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
      formNumber: "025/Сѓ",
      sourceOrderReference: "РџСЂРёРєР°Р· РњРёРЅР·РґСЂР°РІР° Р РѕСЃСЃРёРё РѕС‚ 13.05.2025 N 274РЅ",
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
          informedConsentOrRefusal: "СЃРѕРіР»Р°СЃРёСЏ Рё РѕС‚РєР°Р·С‹ РїСЂРѕРІРµСЂРµРЅС‹ РїРѕ РїРѕРґРїРёСЃР°РЅРЅРѕР№ РјРµРґРёС†РёРЅСЃРєРѕР№ Р·Р°РїРёСЃРё РєР»РёРЅРёРєРё",
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
        "РєР°СЂС‚Р° 025/Сѓ СЃРѕР±СЂР°РЅР° РёР· РїРѕРґРїРёСЃР°РЅРЅС‹С… РјРµРґРёС†РёРЅСЃРєРёС… Р·Р°РїРёСЃРµР№"
      ),
      officialForm274nChecked: confirmedDocumentLiteral(
        outpatient025uOfficialForm274nChecked,
        "СЃС‚СЂСѓРєС‚СѓСЂР° РєР°СЂС‚С‹ 025/Сѓ СЃРІРµСЂРµРЅР° СЃ РїСЂРёРєР°Р·РѕРј РњРёРЅР·РґСЂР°РІР° N 274РЅ"
      ),
      thirdPartyDataChecked: confirmedDocumentLiteral(outpatient025uThirdPartyDataChecked, "РґР°РЅРЅС‹Рµ С‚СЂРµС‚СЊРёС… Р»РёС† РґР»СЏ РєР°СЂС‚С‹ 025/Сѓ РїСЂРѕРІРµСЂРµРЅС‹")
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
        requiredDocumentField(paidContractNumber, "РґРѕРіРѕРІРѕСЂ, РЅРѕРјРµСЂ") ??
        requiredDocumentField(paidContractDate, "РґРѕРіРѕРІРѕСЂ, РґР°С‚Р°") ??
        requiredDocumentField(paidContractServiceStart, "РґРѕРіРѕРІРѕСЂ, РЅР°С‡Р°Р»Рѕ РѕРєР°Р·Р°РЅРёСЏ СѓСЃР»СѓРі") ??
        requiredDocumentField(paidContractServiceEnd, "РґРѕРіРѕРІРѕСЂ, РѕРєРѕРЅС‡Р°РЅРёРµ РёР»Рё СѓСЃР»РѕРІРёРµ Р·Р°РІРµСЂС€РµРЅРёСЏ") ??
        requiredDocumentField(paidContractCustomerFullNameValue(), "РґРѕРіРѕРІРѕСЂ, Р·Р°РєР°Р·С‡РёРє") ??
        requiredDocumentField(paidContractCareReasonValue(), "РґРѕРіРѕРІРѕСЂ, РѕСЃРЅРѕРІР°РЅРёРµ РѕР±СЂР°С‰РµРЅРёСЏ") ??
        requiredDocumentField(paidContractServiceScopeValue(), "РґРѕРіРѕРІРѕСЂ, СЃРѕСЃС‚Р°РІ СѓСЃР»СѓРі") ??
        (paidContractTotalRubValue() > 0 ? null : "РЈРєР°Р¶РёС‚Рµ РѕСЂРёРµРЅС‚РёСЂРѕРІРѕС‡РЅСѓСЋ СЃС‚РѕРёРјРѕСЃС‚СЊ РґРѕРіРѕРІРѕСЂР°.") ??
        requiredDocumentField(paidContractPaymentTerms, "РґРѕРіРѕРІРѕСЂ, РїРѕСЂСЏРґРѕРє РѕРїР»Р°С‚С‹") ??
        requiredDocumentField(paidContractPriceChangeRules, "РґРѕРіРѕРІРѕСЂ, РёР·РјРµРЅРµРЅРёРµ С†РµРЅС‹ Рё РѕР±СЉРµРјР°") ??
        requiredDocumentField(paidContractFreeCareNotice, "РґРѕРіРѕРІРѕСЂ, СѓРІРµРґРѕРјР»РµРЅРёРµ Рѕ Р±РµСЃРїР»Р°С‚РЅРѕР№ РїРѕРјРѕС‰Рё") ??
        requiredDocumentField(paidContractRecommendationWarning, "РґРѕРіРѕРІРѕСЂ, РїСЂРµРґСѓРїСЂРµР¶РґРµРЅРёРµ Рѕ СЂРµРєРѕРјРµРЅРґР°С†РёСЏС… РІСЂР°С‡Р°") ??
        requiredDocumentField(paidContractRefundTerms, "РґРѕРіРѕРІРѕСЂ, РѕС‚РєР°Р· Рё РІРѕР·РІСЂР°С‚") ??
        requiredDocumentField(paidContractWarrantyTerms, "РґРѕРіРѕРІРѕСЂ, РіР°СЂР°РЅС‚РёСЏ Рё РїСЂРµС‚РµРЅР·РёРё") ??
        requiredDocumentField(paidContractDoctorFullNameValue(), "РґРѕРіРѕРІРѕСЂ, РІСЂР°С‡") ??
        requiredDocumentField(paidContractSignedAt, "РґРѕРіРѕРІРѕСЂ, РґР°С‚Р° РїРѕРґРїРёСЃР°РЅРёСЏ") ??
        (paidContractClinicInfoConfirmed ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ РїР°С†РёРµРЅС‚ РїРѕР»СѓС‡РёР» СЃРІРµРґРµРЅРёСЏ Рѕ РєР»РёРЅРёРєРµ Рё Р»РёС†РµРЅР·РёРё.") ??
        (paidContractServiceListConfirmed ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ РїР°С†РёРµРЅС‚ РїРѕР»СѓС‡РёР» РїРµСЂРµС‡РµРЅСЊ СѓСЃР»СѓРі Рё СЃС‚РѕРёРјРѕСЃС‚СЊ.") ??
        (paidContractPaidBasisConfirmed ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ РїР°С†РёРµРЅС‚ РїРѕРЅРёРјР°РµС‚ РїР»Р°С‚РЅСѓСЋ РѕСЃРЅРѕРІСѓ СѓСЃР»СѓРі.") ??
        (paidContractWrittenChangesConfirmed ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ РёР·РјРµРЅРµРЅРёСЏ РґРѕРіРѕРІРѕСЂР° РѕС„РѕСЂРјР»СЏСЋС‚СЃСЏ РїРёСЃСЊРјРµРЅРЅРѕ.")
      );
    }
    if (kind === "completed_works_act") {
      return (
        requiredDocumentField(completedActNumber, "Р°РєС‚, РЅРѕРјРµСЂ") ??
        requiredDocumentField(completedActDate, "Р°РєС‚, РґР°С‚Р°") ??
        requiredDocumentField(completedActContractNumber, "Р°РєС‚, РґРѕРіРѕРІРѕСЂ") ??
        (selectedCompletedActContractDocumentId ? null : "Р’С‹Р±РµСЂРёС‚Рµ РєРѕРЅРєСЂРµС‚РЅС‹Р№ СѓР¶Рµ РІС‹РґР°РЅРЅС‹Р№ РґРѕРіРѕРІРѕСЂ РґР»СЏ Р°РєС‚Р°.") ??
        requiredDocumentField(completedActServicePeriodStart, "Р°РєС‚, РЅР°С‡Р°Р»Рѕ РїРµСЂРёРѕРґР° РѕРєР°Р·Р°РЅРёСЏ") ??
        requiredDocumentField(completedActServicePeriodEnd, "Р°РєС‚, РѕРєРѕРЅС‡Р°РЅРёРµ РїРµСЂРёРѕРґР° РѕРєР°Р·Р°РЅРёСЏ") ??
        requiredDocumentField(completedActDoctorFullNameValue(), "Р°РєС‚, РІСЂР°С‡-РёСЃРїРѕР»РЅРёС‚РµР»СЊ") ??
        requiredDocumentField(completedActServicesSummaryValue(), "Р°РєС‚, СЃРѕСЃС‚Р°РІ СЂР°Р±РѕС‚") ??
        (completedActTotalRubValue() > 0 ? null : "РЈРєР°Р¶РёС‚Рµ СЃСѓРјРјСѓ РїРѕ Р°РєС‚Сѓ.") ??
        (completedActPaidRubValue() > 0 ? null : "Р”Р»СЏ Р°РєС‚Р° РЅСѓР¶РЅР° С„Р°РєС‚РёС‡РµСЃРєР°СЏ РѕРїР»Р°С‡РµРЅРЅР°СЏ СЃСѓРјРјР°.") ??
        (completedActFiscalReceiptLines().length ? null : "Р”РѕР±Р°РІСЊС‚Рµ РЅРѕРјРµСЂР° С„РёСЃРєР°Р»СЊРЅС‹С… С‡РµРєРѕРІ РїРѕ Р°РєС‚Сѓ.") ??
        (completedActLinkedContract ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ СЃРІСЏР·СЊ Р°РєС‚Р° СЃ РїРѕРґРїРёСЃР°РЅРЅС‹Рј РґРѕРіРѕРІРѕСЂРѕРј.") ??
        (completedActFinalScopeConfirmed ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ С„РёРЅР°Р»СЊРЅС‹Р№ СЃРѕСЃС‚Р°РІ СЂР°Р±РѕС‚.") ??
        (completedActFiscalReceiptsVerified ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ РїСЂРѕРІРµСЂРєСѓ С„РёСЃРєР°Р»СЊРЅС‹С… С‡РµРєРѕРІ.") ??
        (completedActAccepted ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ РїСЂРёРµРјРєСѓ СЂР°Р±РѕС‚ РїР°С†РёРµРЅС‚РѕРј.")
      );
    }
    if (kind === "treatment_cost_estimate") {
      const serviceLines = plannedServiceLinesForFinancialPayload();
      return (
        requiredDocumentField(treatmentEstimateNumber, "СЃРјРµС‚Р°, РЅРѕРјРµСЂ") ??
        requiredDocumentField(treatmentEstimateDate, "СЃРјРµС‚Р°, РґР°С‚Р°") ??
        requiredDocumentField(treatmentEstimatePatientOrPayerFullNameValue(), "СЃРјРµС‚Р°, РїР°С†РёРµРЅС‚ РёР»Рё РїР»Р°С‚РµР»СЊС‰РёРє") ??
        requiredDocumentField(treatmentEstimateTreatmentBasisValue(), "СЃРјРµС‚Р°, РѕСЃРЅРѕРІР°РЅРёРµ Р»РµС‡РµРЅРёСЏ") ??
        (serviceLines.length ? null : "Р”Р»СЏ СЃРјРµС‚С‹ РЅСѓР¶РµРЅ СЃРѕСЃС‚Р°РІ СѓСЃР»СѓРі РёР· РїР»Р°РЅР° Р»РµС‡РµРЅРёСЏ.") ??
        (treatmentEstimateTotalRubValue() > 0 ? null : "РЈРєР°Р¶РёС‚Рµ РёС‚РѕРіРѕРІСѓСЋ СЃСѓРјРјСѓ СЃРјРµС‚С‹.") ??
        requiredDocumentField(treatmentEstimateValidUntil, "СЃРјРµС‚Р°, СЃСЂРѕРє РґРµР№СЃС‚РІРёСЏ") ??
        requiredDocumentField(treatmentEstimatePriceChangeRules, "СЃРјРµС‚Р°, РїСЂР°РІРёР»Р° РёР·РјРµРЅРµРЅРёСЏ С†РµРЅС‹") ??
        (documentTextLines(treatmentEstimateExcludedItems).length ? null : "РЈРєР°Р¶РёС‚Рµ, С‡С‚Рѕ РЅРµ РІС…РѕРґРёС‚ РІ С‚РµРєСѓС‰СѓСЋ СЃРјРµС‚Сѓ.") ??
        requiredDocumentField(treatmentEstimatePaymentMilestoneNotes, "СЃРјРµС‚Р°, СѓСЃР»РѕРІРёСЏ РѕРїР»Р°С‚С‹") ??
        requiredDocumentField(treatmentEstimateDoctorFullNameValue(), "СЃРјРµС‚Р°, РѕС‚РІРµС‚СЃС‚РІРµРЅРЅС‹Р№ РІСЂР°С‡") ??
        requiredDocumentField(treatmentEstimateSignedAt, "СЃРјРµС‚Р°, РґР°С‚Р° РѕР·РЅР°РєРѕРјР»РµРЅРёСЏ") ??
        (treatmentEstimatePreliminaryConfirmed ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ РїСЂРµРґРІР°СЂРёС‚РµР»СЊРЅС‹Р№ С…Р°СЂР°РєС‚РµСЂ СЃРјРµС‚С‹.") ??
        (treatmentEstimateScopeConfirmed ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ СЃРѕРѕС‚РІРµС‚СЃС‚РІРёРµ СЃРѕСЃС‚Р°РІР° СѓСЃР»СѓРі РїР»Р°РЅСѓ Р»РµС‡РµРЅРёСЏ.") ??
        (treatmentEstimateFiscalNoticeConfirmed ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ СЃРјРµС‚Р° РЅРµ Р·Р°РјРµРЅСЏРµС‚ РґРѕРіРѕРІРѕСЂ, Р°РєС‚ Рё РєР°СЃСЃРѕРІС‹Р№ С‡РµРє.") ??
        (treatmentEstimateChangeRulesConfirmed ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ РїСЂР°РІРёР»Рѕ РѕР±РЅРѕРІР»РµРЅРёСЏ СЃРјРµС‚С‹ РїСЂРё РёР·РјРµРЅРµРЅРёСЏС….")
      );
    }
    if (kind === "payment_invoice") {
      const serviceLines = plannedServiceLinesForFinancialPayload();
      return (
        requiredDocumentField(paymentInvoiceNumber, "СЃС‡РµС‚, РЅРѕРјРµСЂ") ??
        requiredDocumentField(paymentInvoiceDate, "СЃС‡РµС‚, РґР°С‚Р°") ??
        requiredDocumentField(paymentInvoicePayerFullNameValue(), "СЃС‡РµС‚, РїР»Р°С‚РµР»СЊС‰РёРє") ??
        requiredDocumentField(paymentInvoicePurpose, "СЃС‡РµС‚, РЅР°Р·РЅР°С‡РµРЅРёРµ РїР»Р°С‚РµР¶Р°") ??
        (serviceLines.length ? null : "Р”Р»СЏ СЃС‡РµС‚Р° РЅСѓР¶РµРЅ СЃРѕСЃС‚Р°РІ СѓСЃР»СѓРі РёР· РїР»Р°РЅР° Р»РµС‡РµРЅРёСЏ.") ??
        (paymentInvoiceTotalRubValue() > 0 ? null : "РЈРєР°Р¶РёС‚Рµ СЃСѓРјРјСѓ СЃС‡РµС‚Р°.") ??
        requiredDocumentField(paymentInvoiceDueDate, "СЃС‡РµС‚, СЃСЂРѕРє РѕРїР»Р°С‚С‹") ??
        requiredDocumentField(paymentInvoicePaymentTerms, "СЃС‡РµС‚, СѓСЃР»РѕРІРёСЏ РѕРїР»Р°С‚С‹") ??
        requiredDocumentField(paymentInvoiceBankDetailsValue(), "СЃС‡РµС‚, СЂРµРєРІРёР·РёС‚С‹ РєР»РёРЅРёРєРё") ??
        (paymentInvoiceCashlessAllowed || paymentInvoiceCashDeskAllowed ? null : "Р’С‹Р±РµСЂРёС‚Рµ С…РѕС‚СЏ Р±С‹ РѕРґРёРЅ СЃРїРѕСЃРѕР± РѕРїР»Р°С‚С‹.") ??
        (isOmniRoleMode || paymentInvoiceRequisitesVerified ? null : "Подтвердите проверку реквизитов клиники.") ??
        (isOmniRoleMode || paymentInvoiceServiceScopeConfirmed ? null : "Подтвердите состав услуг счета.") ??
        (isOmniRoleMode || paymentInvoiceFiscalNoticeConfirmed ? null : "Подтвердите предупреждение: счет не заменяет кассовый чек.")
      );
    }
    if (kind === "payment_receipt") {
      return (
        requiredDocumentField(paymentReceiptNumber, "РєРІРёС‚Р°РЅС†РёСЏ, РЅРѕРјРµСЂ") ??
        requiredDocumentField(paymentReceiptDate, "РєРІРёС‚Р°РЅС†РёСЏ, РґР°С‚Р°") ??
        (selectedPaymentReceiptPayments.length ? null : "Р’С‹Р±РµСЂРёС‚Рµ РѕРїР»Р°С‡РµРЅРЅС‹Рµ РїР»Р°С‚РµР¶Рё РґР»СЏ РєРІРёС‚Р°РЅС†РёРё.") ??
        (selectedPaymentReceiptTotalRub > 0 ? null : "РЎСѓРјРјР° РІС‹Р±СЂР°РЅРЅС‹С… РїР»Р°С‚РµР¶РµР№ РґРѕР»Р¶РЅР° Р±С‹С‚СЊ Р±РѕР»СЊС€Рµ РЅСѓР»СЏ.") ??
        requiredDocumentField(paymentReceiptPayerFullNameValue(), "РєРІРёС‚Р°РЅС†РёСЏ, Р¤РРћ РїР»Р°С‚РµР»СЊС‰РёРєР°") ??
        (paymentReceiptTaxSupportRequested
          ? requiredDocumentField(paymentReceiptPayerBirthDateValue(), "РєРІРёС‚Р°РЅС†РёСЏ, РґР°С‚Р° СЂРѕР¶РґРµРЅРёСЏ РїР»Р°С‚РµР»СЊС‰РёРєР°") ??
            requiredDocumentField(paymentReceiptPayerRelationshipValue(), "РєРІРёС‚Р°РЅС†РёСЏ, СЃРІСЏР·СЊ РїР»Р°С‚РµР»СЊС‰РёРєР° СЃ РїР°С†РёРµРЅС‚РѕРј") ??
            (paymentReceiptPayerInnValue().replace(/\D+/g, "").length === 12 || paymentReceiptPayerIdentityDocumentValue().trim()
              ? null
              : "Р”Р»СЏ РЅР°Р»РѕРіРѕРІРѕР№ РєРІРёС‚Р°РЅС†РёРё СѓРєР°Р¶РёС‚Рµ 12-Р·РЅР°С‡РЅС‹Р№ РРќРќ РїР»Р°С‚РµР»СЊС‰РёРєР° РёР»Рё РґРѕРєСѓРјРµРЅС‚ РїР»Р°С‚РµР»СЊС‰РёРєР°.")
          : null) ??
        requiredDocumentField(paymentReceiptPurpose, "РєРІРёС‚Р°РЅС†РёСЏ, РЅР°Р·РЅР°С‡РµРЅРёРµ РѕРїР»Р°С‚С‹") ??
        (paymentReceiptFiscalReceiptLines().length === selectedPaymentReceiptPayments.length
          ? null
          : "РЈ РєР°Р¶РґРѕРіРѕ РІС‹Р±СЂР°РЅРЅРѕРіРѕ РїР»Р°С‚РµР¶Р° РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РЅРѕРјРµСЂ С„РёСЃРєР°Р»СЊРЅРѕРіРѕ С‡РµРєР°.") ??
        (selectedPaymentReceiptPayments.every((payment) => Boolean(payment.fiscalReceiptIssuedAt?.trim()))
          ? null
          : "РЈ РєР°Р¶РґРѕРіРѕ РІС‹Р±СЂР°РЅРЅРѕРіРѕ РїР»Р°С‚РµР¶Р° РґРѕР»Р¶РЅР° Р±С‹С‚СЊ РґР°С‚Р° С„РёСЃРєР°Р»СЊРЅРѕРіРѕ С‡РµРєР°.") ??
        requiredDocumentField(paymentReceiptIssuedByValue(), "РєРІРёС‚Р°РЅС†РёСЏ, РєС‚Рѕ РІС‹РґР°Р»") ??
        (paymentReceiptPaymentsVerified ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ СЃРІРµСЂРєСѓ РІС‹Р±СЂР°РЅРЅС‹С… РїР»Р°С‚РµР¶РµР№ Рё С„РёСЃРєР°Р»СЊРЅС‹С… С‡РµРєРѕРІ.") ??
        (paymentReceiptPayerVerified ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ РїСЂРѕРІРµСЂРєСѓ РґР°РЅРЅС‹С… РїР»Р°С‚РµР»СЊС‰РёРєР°.") ??
        (paymentReceiptFiscalNoticeConfirmed ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ РєРІРёС‚Р°РЅС†РёСЏ РЅРµ Р·Р°РјРµРЅСЏРµС‚ РєР°СЃСЃРѕРІС‹Р№ С‡РµРє.")
      );
    }
    if (kind === "installment_payment_schedule") {
      const installments = installmentScheduleInstallmentRows();
      return (
        requiredDocumentField(installmentScheduleNumber, "РіСЂР°С„РёРє, РЅРѕРјРµСЂ") ??
        requiredDocumentField(installmentScheduleDate, "РіСЂР°С„РёРє, РґР°С‚Р°") ??
        requiredDocumentField(installmentScheduleBaseDocumentTitleValue(), "РіСЂР°С„РёРє, РѕСЃРЅРѕРІР°РЅРёРµ") ??
        requiredDocumentField(installmentSchedulePayerFullNameValue(), "РіСЂР°С„РёРє, РїР»Р°С‚РµР»СЊС‰РёРє") ??
        (installmentScheduleTotalRubValue() > 0 ? null : "РЈРєР°Р¶РёС‚Рµ РѕР±С‰СѓСЋ СЃСѓРјРјСѓ РіСЂР°С„РёРєР°.") ??
        (installmentScheduleRemainingRubValue() >= 0 ? null : "РћСЃС‚Р°С‚РѕРє РїРѕ РіСЂР°С„РёРєСѓ РЅРµ РјРѕР¶РµС‚ Р±С‹С‚СЊ РѕС‚СЂРёС†Р°С‚РµР»СЊРЅС‹Рј.") ??
        (installments.length ? null : "Р”РѕР±Р°РІСЊС‚Рµ РїР»Р°С‚РµР¶Рё РіСЂР°С„РёРєР° РёР»Рё СѓРєР°Р¶РёС‚Рµ РѕСЃС‚Р°С‚РѕРє Рє РѕРїР»Р°С‚Рµ.") ??
        requiredDocumentField(installmentScheduleLatePolicy, "РіСЂР°С„РёРє, РїСЂР°РІРёР»Р° РїСЂРѕСЃСЂРѕС‡РєРё") ??
        requiredDocumentField(installmentSchedulePaymentMethodNotes, "РіСЂР°С„РёРє, СЃРїРѕСЃРѕР±С‹ РѕРїР»Р°С‚С‹") ??
        requiredDocumentField(installmentScheduleResponsibleFullNameValue(), "РіСЂР°С„РёРє, РѕС‚РІРµС‚СЃС‚РІРµРЅРЅС‹Р№") ??
        (installmentScheduleAccepted ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ РїСЂРёРЅСЏС‚РёРµ РіСЂР°С„РёРєР° РїР°С†РёРµРЅС‚РѕРј.") ??
        (installmentScheduleFiscalNoticeConfirmed ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ РіСЂР°С„РёРє РЅРµ Р·Р°РјРµРЅСЏРµС‚ РєР°СЃСЃРѕРІС‹Р№ С‡РµРє.") ??
        (installmentScheduleWrittenChangesConfirmed ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ РїРёСЃСЊРјРµРЅРЅРѕРµ РѕС„РѕСЂРјР»РµРЅРёРµ РёР·РјРµРЅРµРЅРёР№ РіСЂР°С„РёРєР°.")
      );
    }
    if (kind === "minor_legal_representative_consent") {
      return (
        requiredDocumentField(minorRepresentativeFullNameValue(), "РїСЂРµРґСЃС‚Р°РІРёС‚РµР»СЊ, Р¤РРћ") ??
        requiredDocumentField(minorRepresentativeRelationshipValue(), "РїСЂРµРґСЃС‚Р°РІРёС‚РµР»СЊ, СЂРѕРґСЃС‚РІРѕ РёР»Рё СЃС‚Р°С‚СѓСЃ") ??
        requiredDocumentField(minorRepresentativeIdentityDocumentValue(), "РїСЂРµРґСЃС‚Р°РІРёС‚РµР»СЊ, РґРѕРєСѓРјРµРЅС‚ Р»РёС‡РЅРѕСЃС‚Рё") ??
        requiredDocumentField(minorRepresentativeAuthorityDocument, "РїСЂРµРґСЃС‚Р°РІРёС‚РµР»СЊ, РѕСЃРЅРѕРІР°РЅРёРµ РїРѕР»РЅРѕРјРѕС‡РёР№") ??
        requiredDocumentField(minorConsentPatientFullNameValue(), "РЅРµСЃРѕРІРµСЂС€РµРЅРЅРѕР»РµС‚РЅРёР№, Р¤РРћ") ??
        requiredDocumentField(minorConsentPatientBirthDateValue(), "РЅРµСЃРѕРІРµСЂС€РµРЅРЅРѕР»РµС‚РЅРёР№, РґР°С‚Р° СЂРѕР¶РґРµРЅРёСЏ") ??
        requiredDocumentField(minorConsentInterventionScopeValue(), "СЃРѕРіР»Р°СЃРёРµ, РІРјРµС€Р°С‚РµР»СЊСЃС‚РІРѕ") ??
        requiredDocumentField(minorConsentDiagnosisOrIndicationValue(), "СЃРѕРіР»Р°СЃРёРµ, РґРёР°РіРЅРѕР· РёР»Рё РїРѕРєР°Р·Р°РЅРёРµ") ??
        (documentTextLines(minorConsentRisks).length ? null : "Р”РѕР±Р°РІСЊС‚Рµ СЂР°Р·СЉСЏСЃРЅРµРЅРЅС‹Рµ СЂРёСЃРєРё РґР»СЏ РїСЂРµРґСЃС‚Р°РІРёС‚РµР»СЏ.") ??
        (documentTextLines(minorConsentAlternatives).length ? null : "Р”РѕР±Р°РІСЊС‚Рµ Р°Р»СЊС‚РµСЂРЅР°С‚РёРІС‹ Р»РµС‡РµРЅРёСЏ РґР»СЏ РїСЂРµРґСЃС‚Р°РІРёС‚РµР»СЏ.") ??
        requiredDocumentField(minorConsentDoctorFullNameValue(), "СЃРѕРіР»Р°СЃРёРµ, РІСЂР°С‡") ??
        requiredDocumentField(minorConsentSignedAt, "СЃРѕРіР»Р°СЃРёРµ, РґР°С‚Р° Рё РІСЂРµРјСЏ") ??
        (minorConsentIdentityVerified ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ РїСЂРѕРІРµСЂРєСѓ Р»РёС‡РЅРѕСЃС‚Рё РїСЂРµРґСЃС‚Р°РІРёС‚РµР»СЏ.") ??
        (minorConsentAuthorityVerified ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ РїРѕР»РЅРѕРјРѕС‡РёСЏ РїСЂРµРґСЃС‚Р°РІРёС‚РµР»СЏ.") ??
        (minorConsentExplained ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ СЂР°Р·СЉСЏСЃРЅРµРЅРёРµ РІРјРµС€Р°С‚РµР»СЊСЃС‚РІР°, СЂРёСЃРєРѕРІ Рё Р°Р»СЊС‚РµСЂРЅР°С‚РёРІ.") ??
        (minorConsentStored ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ С…СЂР°РЅРµРЅРёРµ СЃРѕРіР»Р°СЃРёСЏ РІ РјРµРґРєР°СЂС‚Рµ.") ??
        (minorConsentAgeExplanation ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ РѕР±СЉСЏСЃРЅРµРЅРёРµ СЂРµР±РµРЅРєСѓ РїРѕ РІРѕР·СЂР°СЃС‚Сѓ Рё СЃРѕСЃС‚РѕСЏРЅРёСЋ.")
      );
    }
    if (kind === "warranty_service_memo") {
      return (
        requiredDocumentField(warrantyServiceOrWorkNameValue(), "РіР°СЂР°РЅС‚РёСЏ, СЂР°Р±РѕС‚Р° РёР»Рё СѓСЃР»СѓРіР°") ??
        requiredDocumentField(warrantyCompletedAt, "РіР°СЂР°РЅС‚РёСЏ, РґР°С‚Р° Р·Р°РІРµСЂС€РµРЅРёСЏ") ??
        requiredDocumentField(warrantyTeethOrAreaValue(), "РіР°СЂР°РЅС‚РёСЏ, Р·СѓР±С‹ РёР»Рё РѕР±Р»Р°СЃС‚СЊ") ??
        requiredDocumentField(warrantyMaterialsOrSystems, "РіР°СЂР°РЅС‚РёСЏ, РјР°С‚РµСЂРёР°Р»С‹ РёР»Рё СЃРёСЃС‚РµРјС‹") ??
        requiredDocumentField(warrantyPeriod, "РіР°СЂР°РЅС‚РёСЏ, СЃСЂРѕРє Рё СѓСЃР»РѕРІРёСЏ") ??
        requiredDocumentField(warrantyControlVisitSchedule, "РіР°СЂР°РЅС‚РёСЏ, РєРѕРЅС‚СЂРѕР»СЊРЅС‹Рµ РІРёР·РёС‚С‹") ??
        (documentTextLines(warrantyPatientObligations).length ? null : "Р”РѕР±Р°РІСЊС‚Рµ РѕР±СЏР·Р°РЅРЅРѕСЃС‚Рё РїР°С†РёРµРЅС‚Р° РґР»СЏ СЃРѕС…СЂР°РЅРµРЅРёСЏ РіР°СЂР°РЅС‚РёРё.") ??
        (documentTextLines(warrantyExcludedRiskFactors).length ? null : "Р”РѕР±Р°РІСЊС‚Рµ СѓСЃР»РѕРІРёСЏ, С‚СЂРµР±СѓСЋС‰РёРµ РѕС‚РґРµР»СЊРЅРѕР№ РѕС†РµРЅРєРё.") ??
        (documentTextLines(warrantyUrgentContactReasons).length ? null : "Р”РѕР±Р°РІСЊС‚Рµ РїСЂРёР·РЅР°РєРё РґР»СЏ СЃСЂРѕС‡РЅРѕР№ СЃРІСЏР·Рё СЃ РєР»РёРЅРёРєРѕР№.") ??
        requiredDocumentField(warrantyLinkedActOrContractValue(), "РіР°СЂР°РЅС‚РёСЏ, СЃРІСЏР·Р°РЅРЅС‹Р№ Р°РєС‚ РёР»Рё РґРѕРіРѕРІРѕСЂ") ??
        requiredDocumentField(warrantyDoctorFullNameValue(), "РіР°СЂР°РЅС‚РёСЏ, РІСЂР°С‡") ??
        requiredDocumentField(warrantyIssuedAt, "РіР°СЂР°РЅС‚РёСЏ, РґР°С‚Р° РІС‹РґР°С‡Рё") ??
        (warrantyPolicyApplied ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ РїСЂРёРјРµРЅРµРЅРёРµ Р»РѕРєР°Р»СЊРЅРѕРіРѕ РіР°СЂР°РЅС‚РёР№РЅРѕРіРѕ РїРѕР»РѕР¶РµРЅРёСЏ.") ??
        (warrantyAftercareReceived ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ РІС‹РґР°С‡Сѓ СЂРµРєРѕРјРµРЅРґР°С†РёР№ РїРѕСЃР»Рµ Р»РµС‡РµРЅРёСЏ.") ??
        (warrantyControlVisitsUnderstood ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ РїРѕРЅРёРјР°РЅРёРµ РєРѕРЅС‚СЂРѕР»СЊРЅС‹С… РІРёР·РёС‚РѕРІ РїР°С†РёРµРЅС‚РѕРј.")
      );
    }
    if (kind === "patient_intake_questionnaire") {
      return (
        requiredDocumentField(intakeChiefComplaint, "Р°РЅРєРµС‚Р°, Р¶Р°Р»РѕР±Р° РёР»Рё С†РµР»СЊ РІРёР·РёС‚Р°") ??
        requiredDocumentField(intakeAllergyStatus, "Р°РЅРєРµС‚Р°, Р°Р»Р»РµСЂРіРёРё") ??
        requiredDocumentField(intakeCurrentMedications, "Р°РЅРєРµС‚Р°, РїРѕСЃС‚РѕСЏРЅРЅС‹Рµ РїСЂРµРїР°СЂР°С‚С‹") ??
        requiredDocumentField(intakeChronicConditions, "Р°РЅРєРµС‚Р°, С…СЂРѕРЅРёС‡РµСЃРєРёРµ Р·Р°Р±РѕР»РµРІР°РЅРёСЏ") ??
        requiredDocumentField(intakeAnticoagulants, "Р°РЅРєРµС‚Р°, Р°РЅС‚РёРєРѕР°РіСѓР»СЏРЅС‚С‹") ??
        requiredDocumentField(intakeInfectiousRiskNotes, "Р°РЅРєРµС‚Р°, РёРЅС„РµРєС†РёРѕРЅРЅС‹Рµ СЂРёСЃРєРё") ??
        requiredDocumentField(intakeCardioEndocrineNotes, "Р°РЅРєРµС‚Р°, СЃРёСЃС‚РµРјРЅС‹Рµ СЂРёСЃРєРё") ??
        (intakeAccuracyConfirmed ? null : "РџР°С†РёРµРЅС‚ РґРѕР»Р¶РµРЅ РїРѕРґС‚РІРµСЂРґРёС‚СЊ РґРѕСЃС‚РѕРІРµСЂРЅРѕСЃС‚СЊ Р°РЅРєРµС‚С‹ РїРµСЂРµРґ СЃРѕР·РґР°РЅРёРµРј РґРѕРєСѓРјРµРЅС‚Р°.")
      );
    }
    if (kind === "tax_deduction_application") {
      const normalizedInn = taxApplicationTaxpayerInn.replace(/[^\d]/g, "");
      return (
        requiredDocumentField(taxApplicationTaxpayerFullName, "РЅР°Р»РѕРіРѕРІРѕРµ Р·Р°СЏРІР»РµРЅРёРµ, Р·Р°СЏРІРёС‚РµР»СЊ") ??
        (taxApplicationForm === "legacy_2021_2023" && normalizedInn.length !== 10 && normalizedInn.length !== 12
          ? "Р”Р»СЏ СЃС‚Р°СЂРѕР№ РЅР°Р»РѕРіРѕРІРѕР№ СЃРїСЂР°РІРєРё СѓРєР°Р¶РёС‚Рµ 10- РёР»Рё 12-Р·РЅР°С‡РЅС‹Р№ РРќРќ Р·Р°СЏРІРёС‚РµР»СЏ."
          : null) ??
        (normalizedInn && normalizedInn.length !== 10 && normalizedInn.length !== 12
          ? "РРќРќ Р·Р°СЏРІРёС‚РµР»СЏ РґРѕР»Р¶РµРЅ СЃРѕРґРµСЂР¶Р°С‚СЊ 10 РёР»Рё 12 С†РёС„СЂ."
          : null) ??
        (taxApplicationForm === "knd_1151156" && normalizedInn && normalizedInn.length !== 12
          ? "Р”Р»СЏ РљРќР” 1151156 РРќРќ С„РёР·РёС‡РµСЃРєРѕРіРѕ Р»РёС†Р° РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ 12-Р·РЅР°С‡РЅС‹Рј. Р•СЃР»Рё РРќРќ РЅРµС‚, РѕСЃС‚Р°РІСЊС‚Рµ РїРѕР»Рµ РїСѓСЃС‚С‹Рј Рё Р·Р°РїРѕР»РЅРёС‚Рµ РґРѕРєСѓРјРµРЅС‚ Р·Р°СЏРІРёС‚РµР»СЏ."
          : null) ??
        (isDateInputValue(taxApplicationTaxpayerBirthDate)
          ? null
          : "РЈРєР°Р¶РёС‚Рµ РґР°С‚Сѓ СЂРѕР¶РґРµРЅРёСЏ Р·Р°СЏРІРёС‚РµР»СЏ РІ С„РѕСЂРјР°С‚Рµ РєР°Р»РµРЅРґР°СЂРЅРѕР№ РґР°С‚С‹.") ??
        requiredDocumentField(taxApplicationTaxpayerIdentityDocument, "РЅР°Р»РѕРіРѕРІРѕРµ Р·Р°СЏРІР»РµРЅРёРµ, РґРѕРєСѓРјРµРЅС‚ Р·Р°СЏРІРёС‚РµР»СЏ") ??
        (taxApplicationRelationship === "self" || taxApplicationAuthorityDocument.trim()
          ? null
          : "Р”Р»СЏ Р·Р°СЏРІР»РµРЅРёСЏ РїСЂРµРґСЃС‚Р°РІРёС‚РµР»СЏ СѓРєР°Р¶РёС‚Рµ РґРѕРєСѓРјРµРЅС‚, РїРѕРґС‚РІРµСЂР¶РґР°СЋС‰РёР№ РїРѕР»РЅРѕРјРѕС‡РёСЏ.") ??
        requiredDocumentField(taxApplicationContact, "РЅР°Р»РѕРіРѕРІРѕРµ Р·Р°СЏРІР»РµРЅРёРµ, РєРѕРЅС‚Р°РєС‚ РёР»Рё РєР°РЅР°Р» РІС‹РґР°С‡Рё") ??
        (isDateTimeLocalInputValue(taxApplicationRequestedAt) ? null : "РЈРєР°Р¶РёС‚Рµ РґР°С‚Сѓ Рё РІСЂРµРјСЏ Р·Р°СЏРІР»РµРЅРёСЏ С‡РµСЂРµР· РєР°Р»РµРЅРґР°СЂСЊ.") ??
        (taxApplicationDuplicateWarningAccepted
          ? null
          : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ РїСЂРѕРІРµСЂРёС‚ РѕС‚СЃСѓС‚СЃС‚РІРёРµ РїРѕРІС‚РѕСЂРЅРѕР№ СЃРїСЂР°РІРєРё РїРѕ С‚РµРј Р¶Рµ СЂР°СЃС…РѕРґР°Рј.")
      );
    }
    if (kind === "informed_consent") {
      const effectiveArea = informedConsentToothOrArea.trim() || inferredTreatmentArea || "";
      const effectiveIndication = informedConsentDiagnosisOrIndication.trim() || dashboard?.activeVisit?.complaint || "";
      const effectiveDoctor = informedConsentDoctorFullName.trim() || activeDoctor?.fullName || "";
      return (
        requiredDocumentField(informedConsentIntervention, "РёРЅС„РѕСЂРјРёСЂРѕРІР°РЅРЅРѕРµ СЃРѕРіР»Р°СЃРёРµ, РІРјРµС€Р°С‚РµР»СЊСЃС‚РІРѕ") ??
        requiredDocumentField(effectiveArea, "РёРЅС„РѕСЂРјРёСЂРѕРІР°РЅРЅРѕРµ СЃРѕРіР»Р°СЃРёРµ, РѕР±Р»Р°СЃС‚СЊ РёР»Рё Р·СѓР±С‹") ??
        requiredDocumentField(effectiveIndication, "РёРЅС„РѕСЂРјРёСЂРѕРІР°РЅРЅРѕРµ СЃРѕРіР»Р°СЃРёРµ, РґРёР°РіРЅРѕР· РёР»Рё РїРѕРєР°Р·Р°РЅРёРµ") ??
        requiredDocumentField(informedConsentExpectedBenefit, "РёРЅС„РѕСЂРјРёСЂРѕРІР°РЅРЅРѕРµ СЃРѕРіР»Р°СЃРёРµ, РѕР¶РёРґР°РµРјР°СЏ РїРѕР»СЊР·Р°") ??
        (documentTextLines(informedConsentRisks).length ? null : "Р”РѕР±Р°РІСЊС‚Рµ СЂР°Р·СЉСЏСЃРЅРµРЅРЅС‹Рµ СЂРёСЃРєРё РґР»СЏ РёРЅС„РѕСЂРјРёСЂРѕРІР°РЅРЅРѕРіРѕ СЃРѕРіР»Р°СЃРёСЏ.") ??
        (documentTextLines(informedConsentAlternatives).length ? null : "Р”РѕР±Р°РІСЊС‚Рµ Р°Р»СЊС‚РµСЂРЅР°С‚РёРІС‹ Р»РµС‡РµРЅРёСЏ РґР»СЏ РёРЅС„РѕСЂРјРёСЂРѕРІР°РЅРЅРѕРіРѕ СЃРѕРіР»Р°СЃРёСЏ.") ??
        (documentTextLines(informedConsentAftercare).length ? null : "Р”РѕР±Р°РІСЊС‚Рµ СЂРµРєРѕРјРµРЅРґР°С†РёРё РїРѕСЃР»Рµ РІРјРµС€Р°С‚РµР»СЊСЃС‚РІР° РґР»СЏ РёРЅС„РѕСЂРјРёСЂРѕРІР°РЅРЅРѕРіРѕ СЃРѕРіР»Р°СЃРёСЏ.") ??
        requiredDocumentField(effectiveDoctor, "РёРЅС„РѕСЂРјРёСЂРѕРІР°РЅРЅРѕРµ СЃРѕРіР»Р°СЃРёРµ, РІСЂР°С‡") ??
        requiredDocumentField(informedConsentConfirmedAt, "РёРЅС„РѕСЂРјРёСЂРѕРІР°РЅРЅРѕРµ СЃРѕРіР»Р°СЃРёРµ, РґР°С‚Р° РїРѕРґС‚РІРµСЂР¶РґРµРЅРёСЏ") ??
        (informedConsentQuestionsAnswered ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ РїР°С†РёРµРЅС‚ РїРѕР»СѓС‡РёР» РѕС‚РІРµС‚С‹ РЅР° РІРѕРїСЂРѕСЃС‹ РїРµСЂРµРґ СЃРѕРіР»Р°СЃРёРµРј.") ??
        (informedConsentRisksUnderstood ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ РїР°С†РёРµРЅС‚ РїРѕРЅСЏР» СЂРёСЃРєРё, РѕРіСЂР°РЅРёС‡РµРЅРёСЏ Рё РїСЂРѕРіРЅРѕР·.") ??
        (informedConsentWithdrawUnderstood ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ РїР°С†РёРµРЅС‚Сѓ РѕР±СЉСЏСЃРЅРµРЅРѕ РїСЂР°РІРѕ РѕС‚РєР°Р·Р°С‚СЊСЃСЏ РґРѕ РІРјРµС€Р°С‚РµР»СЊСЃС‚РІР°.")
      );
    }
    if (kind === "procedure_specific_consent_packet") {
      const effectiveArea = procedureConsentToothOrArea.trim() || inferredTreatmentArea || "";
      const effectiveIndication = procedureConsentDiagnosisOrIndication.trim() || dashboard?.activeVisit?.complaint || "";
      const effectiveDoctor = procedureConsentDoctorFullName.trim() || activeDoctor?.fullName || "";
      return (
        requiredDocumentField(procedureConsentProcedureName, "РїСЂРѕС†РµРґСѓСЂРЅРѕРµ СЃРѕРіР»Р°СЃРёРµ, РїСЂРѕС†РµРґСѓСЂР°") ??
        requiredDocumentField(effectiveArea, "РїСЂРѕС†РµРґСѓСЂРЅРѕРµ СЃРѕРіР»Р°СЃРёРµ, РѕР±Р»Р°СЃС‚СЊ РёР»Рё Р·СѓР±С‹") ??
        requiredDocumentField(effectiveIndication, "РїСЂРѕС†РµРґСѓСЂРЅРѕРµ СЃРѕРіР»Р°СЃРёРµ, РїРѕРєР°Р·Р°РЅРёРµ") ??
        (clinicalToothRowsValue().length ? null : "Р”РѕР±Р°РІСЊС‚Рµ РєР»РёРЅРёС‡РµСЃРєРёРµ СЃС‚СЂРѕРєРё РїРѕ Р·СѓР±Р°Рј РёР»Рё СЃРµРіРјРµРЅС‚Р°Рј.") ??
        (documentTextLines(procedureConsentPatientRiskFactors).length
          ? null
          : "Р”РѕР±Р°РІСЊС‚Рµ РїРµСЂСЃРѕРЅР°Р»СЊРЅС‹Рµ С„Р°РєС‚РѕСЂС‹ СЂРёСЃРєР° РїР°С†РёРµРЅС‚Р° РґР»СЏ РїСЂРѕС†РµРґСѓСЂРЅРѕРіРѕ СЃРѕРіР»Р°СЃРёСЏ.") ??
        (documentTextLines(procedureConsentSpecificRisks).length
          ? null
          : "Р”РѕР±Р°РІСЊС‚Рµ РїСЂРѕС†РµРґСѓСЂРЅС‹Рµ СЂРёСЃРєРё РґР»СЏ РїСЂРѕС†РµРґСѓСЂРЅРѕРіРѕ СЃРѕРіР»Р°СЃРёСЏ.") ??
        (documentTextLines(procedureConsentAlternatives).length
          ? null
          : "Р”РѕР±Р°РІСЊС‚Рµ Р°Р»СЊС‚РµСЂРЅР°С‚РёРІС‹ Р»РµС‡РµРЅРёСЏ РґР»СЏ РїСЂРѕС†РµРґСѓСЂРЅРѕРіРѕ СЃРѕРіР»Р°СЃРёСЏ.") ??
        (documentTextLines(procedureConsentAftercare).length
          ? null
          : "Р”РѕР±Р°РІСЊС‚Рµ РѕРіСЂР°РЅРёС‡РµРЅРёСЏ Рё СЂРµРєРѕРјРµРЅРґР°С†РёРё РїРѕСЃР»Рµ РїСЂРѕС†РµРґСѓСЂС‹.") ??
        requiredDocumentField(effectiveDoctor, "РїСЂРѕС†РµРґСѓСЂРЅРѕРµ СЃРѕРіР»Р°СЃРёРµ, РІСЂР°С‡") ??
        requiredDocumentField(procedureConsentConfirmedAt, "РїСЂРѕС†РµРґСѓСЂРЅРѕРµ СЃРѕРіР»Р°СЃРёРµ, РґР°С‚Р° РїРѕРґС‚РІРµСЂР¶РґРµРЅРёСЏ") ??
        (procedureConsentQuestionsAnswered ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ РїР°С†РёРµРЅС‚ РїРѕР»СѓС‡РёР» РѕС‚РІРµС‚С‹ РЅР° РІРѕРїСЂРѕСЃС‹ РїРѕ РїСЂРѕС†РµРґСѓСЂРµ.") ??
        (procedureConsentExactProcedureConfirmed ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ РїР°С†РёРµРЅС‚Сѓ РЅР°Р·РІР°РЅР° РєРѕРЅРєСЂРµС‚РЅР°СЏ РїСЂРѕС†РµРґСѓСЂР°, Р·РѕРЅР° Рё РѕР±СЉРµРј.") ??
        (procedureConsentRisksUnderstood ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ РїР°С†РёРµРЅС‚ РїРѕРЅСЏР» РїСЂРѕС†РµРґСѓСЂРЅС‹Рµ СЂРёСЃРєРё Рё РѕРіСЂР°РЅРёС‡РµРЅРёСЏ.")
      );
    }
    if (kind === "treatment_plan") {
      return (
        requiredDocumentField(treatmentPlanClinicalReasonValue(), "РїР»Р°РЅ Р»РµС‡РµРЅРёСЏ, РїРѕРІРѕРґ РѕР±СЂР°С‰РµРЅРёСЏ") ??
        requiredDocumentField(treatmentPlanDiagnosisSummaryValue(), "РїР»Р°РЅ Р»РµС‡РµРЅРёСЏ, РґРёР°РіРЅРѕР· РёР»Рё РєР»РёРЅРёС‡РµСЃРєРѕРµ РѕСЃРЅРѕРІР°РЅРёРµ") ??
        requiredDocumentField(treatmentPlanTeethOrAreaValue(), "РїР»Р°РЅ Р»РµС‡РµРЅРёСЏ, Р·СѓР±С‹ РёР»Рё РѕР±Р»Р°СЃС‚СЊ") ??
        (clinicalToothRowsValue().length ? null : "Р”РѕР±Р°РІСЊС‚Рµ РєР»РёРЅРёС‡РµСЃРєРёРµ СЃС‚СЂРѕРєРё РїРѕ Р·СѓР±Р°Рј РёР»Рё СЃРµРіРјРµРЅС‚Р°Рј.") ??
        (documentTextLines(treatmentPlanGoals).length ? null : "Р”РѕР±Р°РІСЊС‚Рµ С†РµР»Рё Р»РµС‡РµРЅРёСЏ.") ??
        (treatmentPlanStageRows().length ? null : "Р”РѕР±Р°РІСЊС‚Рµ СЌС‚Р°РїС‹ РїР»Р°РЅР° Р»РµС‡РµРЅРёСЏ.") ??
        (treatmentPlanTotalRubValue() > 0 ? null : "РЈРєР°Р¶РёС‚Рµ РѕСЂРёРµРЅС‚РёСЂРѕРІРѕС‡РЅСѓСЋ СЃС‚РѕРёРјРѕСЃС‚СЊ РїР»Р°РЅР° Р»РµС‡РµРЅРёСЏ.") ??
        (documentTextLines(treatmentPlanAlternatives).length ? null : "Р”РѕР±Р°РІСЊС‚Рµ Р°Р»СЊС‚РµСЂРЅР°С‚РёРІС‹ РїР»Р°РЅР° Р»РµС‡РµРЅРёСЏ.") ??
        (documentTextLines(treatmentPlanRisks).length ? null : "Р”РѕР±Р°РІСЊС‚Рµ СЂРёСЃРєРё Рё РѕРіСЂР°РЅРёС‡РµРЅРёСЏ РїР»Р°РЅР° Р»РµС‡РµРЅРёСЏ.") ??
        requiredDocumentField(treatmentPlanPrognosis, "РїР»Р°РЅ Р»РµС‡РµРЅРёСЏ, РїСЂРѕРіРЅРѕР· Рё РѕРіСЂР°РЅРёС‡РµРЅРёСЏ") ??
        requiredDocumentField(treatmentPlanControlPlan, "РїР»Р°РЅ Р»РµС‡РµРЅРёСЏ, РєРѕРЅС‚СЂРѕР»СЊ") ??
        requiredDocumentField(treatmentPlanDoctorFullNameValue(), "РїР»Р°РЅ Р»РµС‡РµРЅРёСЏ, РІСЂР°С‡") ??
        requiredDocumentField(treatmentPlanPlannedAt, "РїР»Р°РЅ Р»РµС‡РµРЅРёСЏ, РґР°С‚Р°") ??
        (treatmentPlanQuestionsAnswered ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ РїР°С†РёРµРЅС‚ РїРѕР»СѓС‡РёР» РѕС‚РІРµС‚С‹ РЅР° РІРѕРїСЂРѕСЃС‹.") ??
        (treatmentPlanSeparateConsentAcknowledged ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ РїР»Р°РЅ РЅРµ Р·Р°РјРµРЅСЏРµС‚ РѕС‚РґРµР»СЊРЅРѕРµ СЃРѕРіР»Р°СЃРёРµ.") ??
        (treatmentPlanNewApprovalAcknowledged ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ РёР·РјРµРЅРµРЅРёРµ РїР»Р°РЅР° С‚СЂРµР±СѓРµС‚ РЅРѕРІРѕРіРѕ СЃРѕРіР»Р°СЃРѕРІР°РЅРёСЏ.")
      );
    }
    if (kind === "treatment_plan_acceptance") {
      return (
        requiredDocumentField(treatmentAcceptanceClinicalGoal, "СЃРѕРіР»Р°СЃРѕРІР°РЅРёРµ РїР»Р°РЅР°, РєР»РёРЅРёС‡РµСЃРєР°СЏ С†РµР»СЊ") ??
        requiredDocumentField(treatmentAcceptanceDiagnosisSummary.trim() || dashboard?.activeVisit?.diagnosis || dashboard?.activeVisit?.complaint || "", "СЃРѕРіР»Р°СЃРѕРІР°РЅРёРµ РїР»Р°РЅР°, РґРёР°РіРЅРѕР· РёР»Рё РѕСЃРЅРѕРІР°РЅРёРµ") ??
        requiredDocumentField(treatmentAcceptanceTeethOrArea.trim() || inferredTreatmentArea || "", "СЃРѕРіР»Р°СЃРѕРІР°РЅРёРµ РїР»Р°РЅР°, Р·СѓР±С‹ РёР»Рё РѕР±Р»Р°СЃС‚СЊ") ??
        (clinicalToothRowsValue().length ? null : "Р”РѕР±Р°РІСЊС‚Рµ РєР»РёРЅРёС‡РµСЃРєРёРµ СЃС‚СЂРѕРєРё РїРѕ Р·СѓР±Р°Рј РёР»Рё СЃРµРіРјРµРЅС‚Р°Рј.") ??
        (treatmentAcceptanceStageRows().length ? null : "Р”РѕР±Р°РІСЊС‚Рµ СЌС‚Р°РїС‹ СЃРѕРіР»Р°СЃРѕРІР°РЅРЅРѕРіРѕ РїР»Р°РЅР° Р»РµС‡РµРЅРёСЏ.") ??
        (treatmentAcceptanceTotalRubValue() > 0 ? null : "РЈРєР°Р¶РёС‚Рµ РѕСЂРёРµРЅС‚РёСЂРѕРІРѕС‡РЅСѓСЋ СЃС‚РѕРёРјРѕСЃС‚СЊ СЃРѕРіР»Р°СЃРѕРІР°РЅРЅРѕРіРѕ РїР»Р°РЅР°.") ??
        requiredDocumentField(treatmentAcceptanceEstimateValidUntil, "СЃРѕРіР»Р°СЃРѕРІР°РЅРёРµ РїР»Р°РЅР°, СЃСЂРѕРє РґРµР№СЃС‚РІРёСЏ СЃРјРµС‚С‹") ??
        requiredDocumentField(treatmentAcceptancePaymentTerms, "СЃРѕРіР»Р°СЃРѕРІР°РЅРёРµ РїР»Р°РЅР°, СѓСЃР»РѕРІРёСЏ РѕРїР»Р°С‚С‹") ??
        (documentTextLines(treatmentAcceptanceRejectedAlternatives).length ? null : "Р”РѕР±Р°РІСЊС‚Рµ РѕС‚РєР»РѕРЅРµРЅРЅС‹Рµ РёР»Рё РѕС‚Р»РѕР¶РµРЅРЅС‹Рµ Р°Р»СЊС‚РµСЂРЅР°С‚РёРІС‹.") ??
        (documentTextLines(treatmentAcceptanceRisks).length ? null : "Р”РѕР±Р°РІСЊС‚Рµ СЂРёСЃРєРё Рё РѕРіСЂР°РЅРёС‡РµРЅРёСЏ РїР»Р°РЅР°.") ??
        requiredDocumentField(treatmentAcceptanceWarrantyTerms, "СЃРѕРіР»Р°СЃРѕРІР°РЅРёРµ РїР»Р°РЅР°, РіР°СЂР°РЅС‚РёСЏ Рё РєРѕРЅС‚СЂРѕР»СЊ") ??
        requiredDocumentField(treatmentAcceptanceDoctorFullName.trim() || activeDoctor?.fullName || "", "СЃРѕРіР»Р°СЃРѕРІР°РЅРёРµ РїР»Р°РЅР°, РІСЂР°С‡") ??
        requiredDocumentField(treatmentAcceptanceAcceptedAt, "СЃРѕРіР»Р°СЃРѕРІР°РЅРёРµ РїР»Р°РЅР°, РґР°С‚Р°") ??
        (treatmentAcceptanceQuestionsAnswered ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ РїР°С†РёРµРЅС‚ РїРѕР»СѓС‡РёР» РѕС‚РІРµС‚С‹ РЅР° РІРѕРїСЂРѕСЃС‹.") ??
        (treatmentAcceptanceAlternativesUnderstood ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ РїР°С†РёРµРЅС‚ РїРѕРЅРёРјР°РµС‚ Р°Р»СЊС‚РµСЂРЅР°С‚РёРІС‹.") ??
        (treatmentAcceptanceCostChangeUnderstood ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ РїР°С†РёРµРЅС‚ РїРѕРЅРёРјР°РµС‚ РІРѕР·РјРѕР¶РЅРѕСЃС‚СЊ РёР·РјРµРЅРµРЅРёСЏ СЃС‚РѕРёРјРѕСЃС‚Рё.") ??
        (treatmentAcceptanceRevisionAcknowledged ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ СЃСѓС‰РµСЃС‚РІРµРЅРЅРѕРµ РёР·РјРµРЅРµРЅРёРµ РїР»Р°РЅР° С‚СЂРµР±СѓРµС‚ РЅРѕРІРѕРіРѕ СЃРѕРіР»Р°СЃРѕРІР°РЅРёСЏ.")
      );
    }
    if (kind === "post_visit_recommendations") {
      return (
        requiredDocumentField(postVisitProcedureNameValue(), "СЂРµРєРѕРјРµРЅРґР°С†РёРё РїРѕСЃР»Рµ РїСЂРёРµРјР°, РїСЂРѕС†РµРґСѓСЂР°") ??
        requiredDocumentField(postVisitToothOrAreaValue(), "СЂРµРєРѕРјРµРЅРґР°С†РёРё РїРѕСЃР»Рµ РїСЂРёРµРјР°, РѕР±Р»Р°СЃС‚СЊ") ??
        requiredDocumentField(postVisitPerformedAt, "СЂРµРєРѕРјРµРЅРґР°С†РёРё РїРѕСЃР»Рµ РїСЂРёРµРјР°, РґР°С‚Р° РїСЂРёРµРјР°") ??
        requiredDocumentField(postVisitDoctorFullNameValue(), "СЂРµРєРѕРјРµРЅРґР°С†РёРё РїРѕСЃР»Рµ РїСЂРёРµРјР°, РІСЂР°С‡") ??
        (documentTextLines(postVisitAllowedAfter).length ? null : "Р”РѕР±Р°РІСЊС‚Рµ, РєРѕРіРґР° РїР°С†РёРµРЅС‚Сѓ РјРѕР¶РЅРѕ РїРёС‚СЊ, РµСЃС‚СЊ Рё РІРѕР·РІСЂР°С‰Р°С‚СЊСЃСЏ Рє РЅР°РіСЂСѓР·РєРµ.") ??
        (documentTextLines(postVisitRestrictions).length ? null : "Р”РѕР±Р°РІСЊС‚Рµ РІСЂРµРјРµРЅРЅС‹Рµ РѕРіСЂР°РЅРёС‡РµРЅРёСЏ РїРѕСЃР»Рµ РїСЂРёРµРјР°.") ??
        (documentTextLines(postVisitMedicationAndRinsePlan).length ? null : "Р”РѕР±Р°РІСЊС‚Рµ РЅР°Р·РЅР°С‡РµРЅРёСЏ, РїРѕР»РѕСЃРєР°РЅРёСЏ РёР»Рё СЏРІРЅРѕ СѓРєР°Р¶РёС‚Рµ, С‡С‚Рѕ РЅР°Р·РЅР°С‡РµРЅРёР№ РЅРµС‚.") ??
        (documentTextLines(postVisitHygieneInstructions).length ? null : "Р”РѕР±Р°РІСЊС‚Рµ РїСЂР°РІРёР»Р° РіРёРіРёРµРЅС‹ РїРѕСЃР»Рµ РїСЂРёРµРјР°.") ??
        (documentTextLines(postVisitNutritionInstructions).length ? null : "Р”РѕР±Р°РІСЊС‚Рµ СЂРµРєРѕРјРµРЅРґР°С†РёРё РїРѕ РїРёС‚Р°РЅРёСЋ.") ??
        (documentTextLines(postVisitUrgentWarningSigns).length ? null : "Р”РѕР±Р°РІСЊС‚Рµ С‚СЂРµРІРѕР¶РЅС‹Рµ РїСЂРёР·РЅР°РєРё РґР»СЏ СЃСЂРѕС‡РЅРѕР№ СЃРІСЏР·Рё СЃ РєР»РёРЅРёРєРѕР№.") ??
        requiredDocumentField(postVisitClinicContactInstruction, "СЂРµРєРѕРјРµРЅРґР°С†РёРё РїРѕСЃР»Рµ РїСЂРёРµРјР°, РєРѕРЅС‚Р°РєС‚ РєР»РёРЅРёРєРё") ??
        requiredDocumentField(postVisitTelegramSummary, "СЂРµРєРѕРјРµРЅРґР°С†РёРё РїРѕСЃР»Рµ РїСЂРёРµРјР°, РєСЂР°С‚РєРёР№ С‚РµРєСЃС‚ РґР»СЏ Telegram") ??
        (postVisitPrintedCopyReceived ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ РїР°С†РёРµРЅС‚ РїРѕР»СѓС‡РёР» СЂРµРєРѕРјРµРЅРґР°С†РёРё.") ??
        (postVisitUrgentSignsUnderstood ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ РїР°С†РёРµРЅС‚ РїРѕРЅРёРјР°РµС‚ С‚СЂРµРІРѕР¶РЅС‹Рµ РїСЂРёР·РЅР°РєРё.") ??
        (postVisitTelegramSafe ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ С‚РµРєСЃС‚ Р±РµР·РѕРїР°СЃРµРЅ РґР»СЏ Telegram Рё РЅРµ СЃРѕРґРµСЂР¶РёС‚ Р»РёС€РЅРёС… РјРµРґРёС†РёРЅСЃРєРёС… РїРѕРґСЂРѕР±РЅРѕСЃС‚РµР№.")
      );
    }
    if (kind === "anesthesia_consent_log") {
      return (
        requiredDocumentField(anesthesiaMethod, "Р°РЅРµСЃС‚РµР·РёСЏ, РјРµС‚РѕРґ") ??
        requiredDocumentField(anesthesiaAnesthetic, "Р°РЅРµСЃС‚РµР·РёСЏ, РїСЂРµРїР°СЂР°С‚") ??
        requiredDocumentField(anesthesiaZone, "Р°РЅРµСЃС‚РµР·РёСЏ, Р·РѕРЅР°") ??
        requiredDocumentField(anesthesiaAllergyStatus, "Р°РЅРµСЃС‚РµР·РёСЏ, Р°Р»Р»РµСЂРіРѕР°РЅР°РјРЅРµР·") ??
        requiredDocumentField(anesthesiaDoseTime, "Р°РЅРµСЃС‚РµР·РёСЏ, РІСЂРµРјСЏ РІРІРµРґРµРЅРёСЏ") ??
        requiredDocumentField(anesthesiaDoseMl, "Р°РЅРµСЃС‚РµР·РёСЏ, РґРѕР·Р°") ??
        (anesthesiaRisksExplained ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ РїР°С†РёРµРЅС‚Сѓ РѕР±СЉСЏСЃРЅРµРЅС‹ СЂРёСЃРєРё Рё РѕРіСЂР°РЅРёС‡РµРЅРёСЏ Р°РЅРµСЃС‚РµР·РёРё.") ??
        (anesthesiaAllergyRestrictionsChecked ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ Р°Р»Р»РµСЂРіРёРё, Р»РµРєР°СЂСЃС‚РІР° Рё РѕРіСЂР°РЅРёС‡РµРЅРёСЏ РїСЂРѕРІРµСЂРµРЅС‹ РґРѕ РІРІРµРґРµРЅРёСЏ.") ??
        (anesthesiaConsentConfirmed ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ СЃРѕРіР»Р°СЃРёРµ РїР°С†РёРµРЅС‚Р° РЅР° РІС‹Р±СЂР°РЅРЅСѓСЋ РјРµСЃС‚РЅСѓСЋ Р°РЅРµСЃС‚РµР·РёСЋ.")
      );
    }
    if (kind === "prescription_medication_order") {
      return (
        (clinicalToothRowsValue().length ? null : "Р”РѕР±Р°РІСЊС‚Рµ РєР»РёРЅРёС‡РµСЃРєРёРµ СЃС‚СЂРѕРєРё РїРѕ Р·СѓР±Р°Рј РёР»Рё СЃРµРіРјРµРЅС‚Р°Рј.") ??
        requiredDocumentField(prescriptionMedication, "РЅР°Р·РЅР°С‡РµРЅРёРµ, РїСЂРµРїР°СЂР°С‚") ??
        requiredDocumentField(prescriptionDosage, "РЅР°Р·РЅР°С‡РµРЅРёРµ, РґРѕР·РёСЂРѕРІРєР°") ??
        requiredDocumentField(prescriptionInstructions, "РЅР°Р·РЅР°С‡РµРЅРёРµ, СЂРµР¶РёРј РїСЂРёРµРјР°") ??
        requiredDocumentField(prescriptionDuration, "РЅР°Р·РЅР°С‡РµРЅРёРµ, РґР»РёС‚РµР»СЊРЅРѕСЃС‚СЊ") ??
        (documentTextLines(prescriptionSafetyNotes).length ? null : "Р”РѕР±Р°РІСЊС‚Рµ С…РѕС‚СЏ Р±С‹ РѕРґРЅСѓ РїР°РјСЏС‚РєСѓ РїР°С†РёРµРЅС‚Сѓ РґР»СЏ РЅР°Р·РЅР°С‡РµРЅРёСЏ.") ??
        requiredDocumentField(prescriptionUrgentContactReason, "РЅР°Р·РЅР°С‡РµРЅРёРµ, РєРѕРіРґР° СЃСЂРѕС‡РЅРѕ СЃРІСЏР·Р°С‚СЊСЃСЏ")
      );
    }
    if (kind === "lab_work_order") {
      return (
        (clinicalToothRowsValue().length ? null : "Р”РѕР±Р°РІСЊС‚Рµ РєР»РёРЅРёС‡РµСЃРєРёРµ СЃС‚СЂРѕРєРё РїРѕ Р·СѓР±Р°Рј РёР»Рё СЃРµРіРјРµРЅС‚Р°Рј.") ??
        requiredDocumentField(labWorkType, "Р»Р°Р±РѕСЂР°С‚РѕСЂРёСЏ, РІРёРґ СЂР°Р±РѕС‚С‹") ??
        requiredDocumentField(labTeethOrArea, "Р»Р°Р±РѕСЂР°С‚РѕСЂРёСЏ, Р·СѓР±С‹ РёР»Рё Р·РѕРЅР°") ??
        requiredDocumentField(labMaterial, "Р»Р°Р±РѕСЂР°С‚РѕСЂРёСЏ, РјР°С‚РµСЂРёР°Р»") ??
        requiredDocumentField(labShade, "Р»Р°Р±РѕСЂР°С‚РѕСЂРёСЏ, С†РІРµС‚") ??
        requiredDocumentField(labSource, "Р»Р°Р±РѕСЂР°С‚РѕСЂРёСЏ, РёСЃС‚РѕС‡РЅРёРє РґР°РЅРЅС‹С…") ??
        requiredDocumentField(labDeadline, "Р»Р°Р±РѕСЂР°С‚РѕСЂРёСЏ, СЃСЂРѕРє")
      );
    }
    if (kind === "photo_video_consent") {
      return (
        (photoVideoMaterials.length ? null : "РћС‚РјРµС‚СЊС‚Рµ С…РѕС‚СЏ Р±С‹ РѕРґРёРЅ С‚РёРї С„РѕС‚Рѕ, РІРёРґРµРѕ РёР»Рё СЃРЅРёРјРєРѕРІ.") ??
        (photoVideoClinicalRecordUseConfirmed ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ С„РѕС‚Рѕ, РІРёРґРµРѕ Рё СЃРЅРёРјРєРё РІРЅРѕСЃСЏС‚СЃСЏ РІ РјРµРґРёС†РёРЅСЃРєСѓСЋ РєР°СЂС‚Сѓ РїР°С†РёРµРЅС‚Р°.") ??
        (photoVideoAnonymizationConfirmed ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ РІРЅРµС€РЅРµРµ РёСЃРїРѕР»СЊР·РѕРІР°РЅРёРµ РІРѕР·РјРѕР¶РЅРѕ С‚РѕР»СЊРєРѕ РїРѕСЃР»Рµ РѕР±РµР·Р»РёС‡РёРІР°РЅРёСЏ, РєСЂРѕРјРµ РѕС‚РґРµР»СЊРЅРѕ СЂР°Р·СЂРµС€РµРЅРЅРѕР№ СѓР·РЅР°РІР°РµРјРѕР№ РїСѓР±Р»РёРєР°С†РёРё.") ??
        requiredDocumentField(photoVideoRevocationChannel, "С„РѕС‚Рѕ/РІРёРґРµРѕ, РїРѕСЂСЏРґРѕРє РѕС‚Р·С‹РІР° СЃРѕРіР»Р°СЃРёСЏ") ??
        (photoVideoRecognizablePublicationAllowed && !photoVideoMarketingUseAllowed && !photoVideoEducationUseAllowed
          ? "РџСѓР±Р»РёРєР°С†РёСЏ СѓР·РЅР°РІР°РµРјС‹С… РјР°С‚РµСЂРёР°Р»РѕРІ РІРѕР·РјРѕР¶РЅР° С‚РѕР»СЊРєРѕ РІРјРµСЃС‚Рµ СЃ РѕС‚РґРµР»СЊРЅС‹Рј СЂР°Р·СЂРµС€РµРЅРёРµРј РЅР° РѕР±СѓС‡РµРЅРёРµ РёР»Рё РјР°СЂРєРµС‚РёРЅРі."
          : null)
      );
    }
    if (kind === "xray_cbct_referral") {
      return (
        (clinicalToothRowsValue().length ? null : "Р”РѕР±Р°РІСЊС‚Рµ РєР»РёРЅРёС‡РµСЃРєРёРµ СЃС‚СЂРѕРєРё РїРѕ Р·СѓР±Р°Рј РёР»Рё СЃРµРіРјРµРЅС‚Р°Рј.") ??
        requiredDocumentField(xrayArea, "СЃРЅРёРјРѕРє, РѕР±Р»Р°СЃС‚СЊ") ??
        requiredDocumentField(xrayClinicalQuestion, "СЃРЅРёРјРѕРє, РєР»РёРЅРёС‡РµСЃРєРёР№ РІРѕРїСЂРѕСЃ") ??
        requiredDocumentField(xrayIndication, "СЃРЅРёРјРѕРє, РїРѕРєР°Р·Р°РЅРёРµ") ??
        requiredDocumentField(xraySafetyNotes, "СЃРЅРёРјРѕРє, РѕРіСЂР°РЅРёС‡РµРЅРёСЏ Рё Р·Р°С‰РёС‚Р°") ??
        requiredDocumentField(xrayRequestedBy.trim() || activeDoctor?.fullName || "", "СЃРЅРёРјРѕРє, РЅР°Р·РЅР°С‡РёРІС€РёР№ РІСЂР°С‡")
      );
    }
    if (kind === "outpatient_medical_card_025u") {
      return (
        requiredDocumentField(clinicProfileDraft.legalName.trim() || clinicProfileDraft.clinicName.trim(), "РєР°СЂС‚Р° 025/Сѓ, РјРµРґРѕСЂРіР°РЅРёР·Р°С†РёСЏ") ??
        requiredDocumentField(outpatient025uMedicalCardNumberValue(), "РєР°СЂС‚Р° 025/Сѓ, РЅРѕРјРµСЂ РјРµРґРёС†РёРЅСЃРєРѕР№ РєР°СЂС‚С‹") ??
        requiredDocumentField(outpatient025uOpenedAt, "РєР°СЂС‚Р° 025/Сѓ, РґР°С‚Р° РѕС‚РєСЂС‹С‚РёСЏ") ??
        requiredDocumentField(recordExtractPeriodStart, "РєР°СЂС‚Р° 025/Сѓ, РїРµСЂРёРѕРґ СЃ") ??
        requiredDocumentField(recordExtractPeriodEnd, "РєР°СЂС‚Р° 025/Сѓ, РїРµСЂРёРѕРґ РїРѕ") ??
        (outpatient025uSourceVisitIdsValue().length ? null : "Р”РѕР±Р°РІСЊС‚Рµ РёСЃС‚РѕС‡РЅРёРє РїРѕРґРїРёСЃР°РЅРЅРѕР№ РјРµРґРёС†РёРЅСЃРєРѕР№ Р·Р°РїРёСЃРё РґР»СЏ РєР°СЂС‚С‹ 025/Сѓ.") ??
        requiredDocumentField(documentPatient?.fullName ?? "", "РєР°СЂС‚Р° 025/Сѓ, РїР°С†РёРµРЅС‚") ??
        requiredDocumentField(recordExtractComplaintAndAnamnesisValue(), "РєР°СЂС‚Р° 025/Сѓ, Р¶Р°Р»РѕР±С‹ Рё Р°РЅР°РјРЅРµР·") ??
        requiredDocumentField(recordExtractObjectiveStatusValue(), "РєР°СЂС‚Р° 025/Сѓ, РѕР±СЉРµРєС‚РёРІРЅС‹Р№ СЃС‚Р°С‚СѓСЃ") ??
        requiredDocumentField(recordExtractDiagnosisValue(), "РєР°СЂС‚Р° 025/Сѓ, РґРёР°РіРЅРѕР·") ??
        (clinicalToothRowsValue().length ? null : "Р”РѕР±Р°РІСЊС‚Рµ РєР»РёРЅРёС‡РµСЃРєРёРµ СЃС‚СЂРѕРєРё РїРѕ Р·СѓР±Р°Рј РёР»Рё СЃРµРіРјРµРЅС‚Р°Рј РґР»СЏ РєР°СЂС‚С‹ 025/Сѓ.") ??
        requiredDocumentField(recordExtractTreatmentProvidedValue(), "РєР°СЂС‚Р° 025/Сѓ, РїСЂРѕРІРµРґРµРЅРЅРѕРµ Р»РµС‡РµРЅРёРµ") ??
        requiredDocumentField(recordExtractRecommendations, "РєР°СЂС‚Р° 025/Сѓ, РЅР°Р·РЅР°С‡РµРЅРёСЏ Рё СЂРµРєРѕРјРµРЅРґР°С†РёРё") ??
        requiredDocumentField(recordExtractDoctorFullName.trim() || activeDoctor?.fullName || "", "РєР°СЂС‚Р° 025/Сѓ, РІСЂР°С‡") ??
        (recordExtractPreparedFromSignedRecords ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ РєР°СЂС‚Р° 025/Сѓ СЃРѕР±СЂР°РЅР° РёР· РїРѕРґРїРёСЃР°РЅРЅС‹С… РјРµРґРёС†РёРЅСЃРєРёС… Р·Р°РїРёСЃРµР№.") ??
        (outpatient025uOfficialForm274nChecked ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ СЃРІРµСЂРєСѓ РєР°СЂС‚С‹ 025/Сѓ СЃ РїСЂРёРєР°Р·РѕРј РњРёРЅР·РґСЂР°РІР° N 274РЅ.") ??
        (outpatient025uThirdPartyDataChecked ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ Р»РёС€РЅРёРµ РґР°РЅРЅС‹Рµ С‚СЂРµС‚СЊРёС… Р»РёС† РґР»СЏ РєР°СЂС‚С‹ 025/Сѓ РёСЃРєР»СЋС‡РµРЅС‹.")
      );
    }
    if (kind === "medical_record_extract") {
      const sourceVisitIds = documentTextLines(recordExtractSourceVisitIds);
      return (
        requiredDocumentField(recordExtractPeriodStart, "РІС‹РїРёСЃРєР°, РїРµСЂРёРѕРґ СЃ") ??
        requiredDocumentField(recordExtractPeriodEnd, "РІС‹РїРёСЃРєР°, РїРµСЂРёРѕРґ РїРѕ") ??
        (sourceVisitIds.length || dashboard?.activeVisit?.id ? null : "Р”РѕР±Р°РІСЊС‚Рµ РёСЃС‚РѕС‡РЅРёРє РјРµРґРёС†РёРЅСЃРєРѕР№ Р·Р°РїРёСЃРё РґР»СЏ РІС‹РїРёСЃРєРё.") ??
        requiredDocumentField(recordExtractComplaintAndAnamnesisValue(), "РІС‹РїРёСЃРєР°, Р¶Р°Р»РѕР±С‹ Рё Р°РЅР°РјРЅРµР·") ??
        requiredDocumentField(recordExtractObjectiveStatusValue(), "РІС‹РїРёСЃРєР°, РѕР±СЉРµРєС‚РёРІРЅС‹Р№ СЃС‚Р°С‚СѓСЃ") ??
        requiredDocumentField(recordExtractDiagnosisValue(), "РІС‹РїРёСЃРєР°, РґРёР°РіРЅРѕР·") ??
        (clinicalToothRowsValue().length ? null : "Р”РѕР±Р°РІСЊС‚Рµ РєР»РёРЅРёС‡РµСЃРєРёРµ СЃС‚СЂРѕРєРё РїРѕ Р·СѓР±Р°Рј РёР»Рё СЃРµРіРјРµРЅС‚Р°Рј.") ??
        requiredDocumentField(recordExtractTreatmentProvidedValue(), "РІС‹РїРёСЃРєР°, РїСЂРѕРІРµРґРµРЅРЅРѕРµ Р»РµС‡РµРЅРёРµ") ??
        requiredDocumentField(recordExtractRecommendations, "РІС‹РїРёСЃРєР°, СЂРµРєРѕРјРµРЅРґР°С†РёРё") ??
        requiredDocumentField(recordExtractDoctorFullName.trim() || activeDoctor?.fullName || "", "РІС‹РїРёСЃРєР°, РІСЂР°С‡") ??
        requiredDocumentField(recordExtractRecipientFullName.trim() || documentPatient?.fullName || "", "РІС‹РїРёСЃРєР°, РїРѕР»СѓС‡Р°С‚РµР»СЊ") ??
        requiredDocumentField(recordExtractRecipientAuthority, "РІС‹РїРёСЃРєР°, РѕСЃРЅРѕРІР°РЅРёРµ РІС‹РґР°С‡Рё") ??
        requiredDocumentField(recordExtractIssuedAt, "РІС‹РїРёСЃРєР°, РґР°С‚Р°") ??
        (recordExtractPreparedFromSignedRecords ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ РІС‹РїРёСЃРєР° СЃРѕР±СЂР°РЅР° РёР· РїРѕРґРїРёСЃР°РЅРЅС‹С… РјРµРґРёС†РёРЅСЃРєРёС… Р·Р°РїРёСЃРµР№.") ??
        (recordExtractThirdPartyDataChecked ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ Р»РёС€РЅРёРµ РґР°РЅРЅС‹Рµ С‚СЂРµС‚СЊРёС… Р»РёС† РёСЃРєР»СЋС‡РµРЅС‹.")
      );
    }
    if (kind === "medical_record_copy_request") {
      return (
        (documentTextLines(copyRequestDocumentTypes).length ? null : "Р”РѕР±Р°РІСЊС‚Рµ СЃРѕСЃС‚Р°РІ Р·Р°РїСЂРѕС€РµРЅРЅС‹С… РјРµРґРёС†РёРЅСЃРєРёС… РґРѕРєСѓРјРµРЅС‚РѕРІ.") ??
        requiredDocumentField(copyRequestRecipientFullName.trim() || documentPatient?.fullName || "", "Р·Р°РїСЂРѕСЃ РєРѕРїРёР№, РїРѕР»СѓС‡Р°С‚РµР»СЊ") ??
        requiredDocumentField(copyRequestRecipientIdentityDocument, "Р·Р°РїСЂРѕСЃ РєРѕРїРёР№, РґРѕРєСѓРјРµРЅС‚ РїРѕР»СѓС‡Р°С‚РµР»СЏ") ??
        requiredDocumentField(copyRequestRecipientAuthority, "Р·Р°РїСЂРѕСЃ РєРѕРїРёР№, РѕСЃРЅРѕРІР°РЅРёРµ РїРѕР»РЅРѕРјРѕС‡РёР№") ??
        requiredDocumentField(copyRequestRequestedAt, "Р·Р°РїСЂРѕСЃ РєРѕРїРёР№, РґР°С‚Р° Р·Р°РїСЂРѕСЃР°") ??
        requiredDocumentField(copyRequestContactForDelivery, "Р·Р°РїСЂРѕСЃ РєРѕРїРёР№, РєРѕРЅС‚Р°РєС‚ Рё РєР°РЅР°Р» РІС‹РґР°С‡Рё") ??
        (copyRequestIdentityVerified ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ РїСЂРѕРІРµСЂРєСѓ Р»РёС‡РЅРѕСЃС‚Рё РїРѕР»СѓС‡Р°С‚РµР»СЏ.") ??
        (copyRequestThirdPartyDataChecked ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ Р»РёС€РЅРёРµ РґР°РЅРЅС‹Рµ С‚СЂРµС‚СЊРёС… Р»РёС† Р±СѓРґСѓС‚ РёСЃРєР»СЋС‡РµРЅС‹.")
      );
    }
    if (kind === "visit_attendance_certificate") {
      return (
        requiredDocumentField(attendanceStartedAtValue(), "СЃРїСЂР°РІРєР° Рѕ РїРѕСЃРµС‰РµРЅРёРё, РЅР°С‡Р°Р»Рѕ РїСЂРёРµРјР°") ??
        requiredDocumentField(attendanceEndedAtValue(), "СЃРїСЂР°РІРєР° Рѕ РїРѕСЃРµС‰РµРЅРёРё, РѕРєРѕРЅС‡Р°РЅРёРµ РїСЂРёРµРјР°") ??
        requiredDocumentField(attendancePurpose, "СЃРїСЂР°РІРєР° Рѕ РїРѕСЃРµС‰РµРЅРёРё, С†РµР»СЊ РІС‹РґР°С‡Рё") ??
        requiredDocumentField(attendanceIssuedAt, "СЃРїСЂР°РІРєР° Рѕ РїРѕСЃРµС‰РµРЅРёРё, РґР°С‚Р° РІС‹РґР°С‡Рё") ??
        requiredDocumentField(attendanceSignedByValue(), "СЃРїСЂР°РІРєР° Рѕ РїРѕСЃРµС‰РµРЅРёРё, РїРѕРґРїРёСЃР°РЅС‚") ??
        requiredDocumentField(attendanceSignedByRole, "СЃРїСЂР°РІРєР° Рѕ РїРѕСЃРµС‰РµРЅРёРё, РґРѕР»Р¶РЅРѕСЃС‚СЊ РїРѕРґРїРёСЃР°РЅС‚Р°") ??
        (attendanceDiagnosisDisclosureExcluded ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ РґРёР°РіРЅРѕР· Рё РїР»Р°РЅ Р»РµС‡РµРЅРёСЏ РЅРµ СЂР°СЃРєСЂС‹РІР°СЋС‚СЃСЏ РІ СЃРїСЂР°РІРєРµ.") ??
        (attendanceNotSickLeaveAcknowledged ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ СЃРїСЂР°РІРєР° РЅРµ Р·Р°РјРµРЅСЏРµС‚ Р»РёСЃС‚РѕРє РЅРµС‚СЂСѓРґРѕСЃРїРѕСЃРѕР±РЅРѕСЃС‚Рё.")
      );
    }
    if (kind === "medical_document_release_receipt") {
      return (
        requiredDocumentField(selectedReleaseSourceRequestDocumentId, "РІС‹РґР°С‡Р° РґРѕРєСѓРјРµРЅС‚РѕРІ, РІС‹РґР°РЅРЅС‹Р№ Р·Р°РїСЂРѕСЃ РЅР° РєРѕРїРёРё") ??
        requiredDocumentField(releaseRecipientFullName, "РІС‹РґР°С‡Р° РґРѕРєСѓРјРµРЅС‚РѕРІ, РїРѕР»СѓС‡Р°С‚РµР»СЊ") ??
        requiredDocumentField(releaseRecipientIdentityDocument, "РІС‹РґР°С‡Р° РґРѕРєСѓРјРµРЅС‚РѕРІ, РґРѕРєСѓРјРµРЅС‚ РїРѕР»СѓС‡Р°С‚РµР»СЏ") ??
        requiredDocumentField(releaseRecipientAuthority, "РІС‹РґР°С‡Р° РґРѕРєСѓРјРµРЅС‚РѕРІ, РѕСЃРЅРѕРІР°РЅРёРµ РїРѕР»РЅРѕРјРѕС‡РёР№") ??
        (documentTextLines(releaseDocumentTypes).length ? null : "Р”РѕР±Р°РІСЊС‚Рµ СЃРѕСЃС‚Р°РІ РІС‹РґР°РІР°РµРјС‹С… РјРµРґРёС†РёРЅСЃРєРёС… РґРѕРєСѓРјРµРЅС‚РѕРІ.") ??
        requiredDocumentField(releaseDeliveredAt, "РІС‹РґР°С‡Р° РґРѕРєСѓРјРµРЅС‚РѕРІ, РґР°С‚Р° Рё РІСЂРµРјСЏ") ??
        requiredDocumentField(releaseProtectionNote, "РІС‹РґР°С‡Р° РґРѕРєСѓРјРµРЅС‚РѕРІ, Р·Р°С‰РёС‚Р° РїРµСЂРµРґР°С‡Рё") ??
        (releaseThirdPartyDataChecked ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ Р»РёС€РЅРёРµ РґР°РЅРЅС‹Рµ С‚СЂРµС‚СЊРёС… Р»РёС† РёСЃРєР»СЋС‡РµРЅС‹.")
      );
    }
    if (kind === "payment_refund_correction_request") {
      const requestedAmount = normalizeRubAmountInput(refundAmountRub);
      return (
        requiredDocumentField(refundSelectedPaymentId, "РІРѕР·РІСЂР°С‚/РєРѕСЂСЂРµРєС†РёСЏ, РёСЃС…РѕРґРЅС‹Р№ РїР»Р°С‚РµР¶") ??
        (requestedAmount !== null && requestedAmount > 0
          ? null
          : rubAmountInputMissingStep(
              refundAmountRub,
              "РЈРєР°Р¶РёС‚Рµ СЃСѓРјРјСѓ РІРѕР·РІСЂР°С‚Р° РёР»Рё РєРѕСЂСЂРµРєС†РёРё Р±РѕР»СЊС€Рµ РЅСѓР»СЏ.",
              "РЈРєР°Р¶РёС‚Рµ СЃСѓРјРјСѓ РІРѕР·РІСЂР°С‚Р° РёР»Рё РєРѕСЂСЂРµРєС†РёРё С†РµР»С‹РјРё СЂСѓР±Р»СЏРјРё Р±РµР· РєРѕРїРµРµРє."
            )) ??
        requiredDocumentField(refundReason, "РІРѕР·РІСЂР°С‚/РєРѕСЂСЂРµРєС†РёСЏ, РѕСЃРЅРѕРІР°РЅРёРµ") ??
        requiredDocumentField(refundRecipientFullName, "РІРѕР·РІСЂР°С‚/РєРѕСЂСЂРµРєС†РёСЏ, РїРѕР»СѓС‡Р°С‚РµР»СЊ") ??
        requiredDocumentField(refundRecipientIdentityDocument, "РІРѕР·РІСЂР°С‚/РєРѕСЂСЂРµРєС†РёСЏ, РґРѕРєСѓРјРµРЅС‚ РїРѕР»СѓС‡Р°С‚РµР»СЏ") ??
        requiredDocumentField(refundOriginalFiscalReceiptNumber, "РІРѕР·РІСЂР°С‚/РєРѕСЂСЂРµРєС†РёСЏ, РёСЃС…РѕРґРЅС‹Р№ С„РёСЃРєР°Р»СЊРЅС‹Р№ С‡РµРє") ??
        requiredDocumentField(refundAccountantDecision, "РІРѕР·РІСЂР°С‚/РєРѕСЂСЂРµРєС†РёСЏ, СЂРµС€РµРЅРёРµ РѕС‚РІРµС‚СЃС‚РІРµРЅРЅРѕРіРѕ")
      );
    }
    if (kind === "personal_data_processing_consent") {
      const operatorName = clinicProfileDraft.legalName.trim() || clinicProfileDraft.clinicName.trim();
      const operatorInn = clinicProfileDraft.inn.replace(/[^\d]/g, "");
      return (
        requiredDocumentField(operatorName, "РџР”РЅ, РѕРїРµСЂР°С‚РѕСЂ РєР»РёРЅРёРєРё") ??
        (operatorInn.length === 10 || operatorInn.length === 12 ? null : "РРќРќ РѕРїРµСЂР°С‚РѕСЂР° РџР”РЅ РґРѕР»Р¶РµРЅ СЃРѕРґРµСЂР¶Р°С‚СЊ 10 РёР»Рё 12 С†РёС„СЂ.") ??
        requiredDocumentField(clinicProfileDraft.address, "РџР”РЅ, Р°РґСЂРµСЃ РѕРїРµСЂР°С‚РѕСЂР°") ??
        (documentTextLines(personalDataPurposes).length ? null : "Р”РѕР±Р°РІСЊС‚Рµ С†РµР»Рё РѕР±СЂР°Р±РѕС‚РєРё РїРµСЂСЃРѕРЅР°Р»СЊРЅС‹С… РґР°РЅРЅС‹С….") ??
        (documentTextLines(personalDataCategories).length ? null : "Р”РѕР±Р°РІСЊС‚Рµ РєР°С‚РµРіРѕСЂРёРё РїРµСЂСЃРѕРЅР°Р»СЊРЅС‹С… РґР°РЅРЅС‹С….") ??
        (documentTextLines(personalDataActions).length ? null : "Р”РѕР±Р°РІСЊС‚Рµ РґРµР№СЃС‚РІРёСЏ СЃ РїРµСЂСЃРѕРЅР°Р»СЊРЅС‹РјРё РґР°РЅРЅС‹РјРё.") ??
        requiredDocumentField(personalDataTransferRules, "РџР”РЅ, РїСЂР°РІРёР»Р° РїРµСЂРµРґР°С‡Рё С‚СЂРµС‚СЊРёРј Р»РёС†Р°Рј") ??
        requiredDocumentField(personalDataRetentionPeriod, "РџР”РЅ, СЃСЂРѕРє С…СЂР°РЅРµРЅРёСЏ") ??
        requiredDocumentField(personalDataRevocationChannel, "РџР”РЅ, РїРѕСЂСЏРґРѕРє РѕС‚Р·С‹РІР°") ??
        requiredDocumentField(personalDataConsentGivenAt, "РџР”РЅ, РґР°С‚Р° СЃРѕРіР»Р°СЃРёСЏ") ??
        (personalDataVoluntaryConsentConfirmed ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ РґРѕР±СЂРѕРІРѕР»СЊРЅРѕРµ СЃРѕРіР»Р°СЃРёРµ РїР°С†РёРµРЅС‚Р° РЅР° РѕР±СЂР°Р±РѕС‚РєСѓ РџР”РЅ.") ??
        (personalDataMedicalProcessingAcknowledged ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ РїР°С†РёРµРЅС‚ РїРѕРЅРёРјР°РµС‚ РѕР±СЂР°Р±РѕС‚РєСѓ РјРµРґРёС†РёРЅСЃРєРёС… РґР°РЅРЅС‹С….")
      );
    }
    if (kind === "medical_intervention_refusal") {
      return (
        requiredDocumentField(refusalIntervention, "РѕС‚РєР°Р·, РІРјРµС€Р°С‚РµР»СЊСЃС‚РІРѕ") ??
        requiredDocumentField(refusalClinicalIndication, "РѕС‚РєР°Р·, РєР»РёРЅРёС‡РµСЃРєРѕРµ РїРѕРєР°Р·Р°РЅРёРµ") ??
        (documentTextLines(refusalExplainedRisks).length ? null : "Р”РѕР±Р°РІСЊС‚Рµ СЂР°Р·СЉСЏСЃРЅРµРЅРЅС‹Рµ СЂРёСЃРєРё РѕС‚РєР°Р·Р°.") ??
        (documentTextLines(refusalAlternatives).length ? null : "Р”РѕР±Р°РІСЊС‚Рµ РїСЂРµРґР»РѕР¶РµРЅРЅС‹Рµ Р°Р»СЊС‚РµСЂРЅР°С‚РёРІС‹.") ??
        (documentTextLines(refusalUrgentWarningSigns).length ? null : "Р”РѕР±Р°РІСЊС‚Рµ С‚СЂРµРІРѕР¶РЅС‹Рµ РїСЂРёР·РЅР°РєРё РґР»СЏ СЃСЂРѕС‡РЅРѕРіРѕ РѕР±СЂР°С‰РµРЅРёСЏ.") ??
        requiredDocumentField(refusalDoctorFullName.trim() || activeDoctor?.fullName || "", "РѕС‚РєР°Р·, РІСЂР°С‡") ??
        requiredDocumentField(refusalConfirmedAt, "РѕС‚РєР°Р·, РґР°С‚Р° РїРѕРґС‚РІРµСЂР¶РґРµРЅРёСЏ") ??
        (refusalConsequencesUnderstood ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ РїР°С†РёРµРЅС‚ РїРѕРЅСЏР» РїРѕСЃР»РµРґСЃС‚РІРёСЏ РѕС‚РєР°Р·Р°.") ??
        (refusalSecondOpinionOffered ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ РїР°С†РёРµРЅС‚Сѓ РїСЂРµРґР»РѕР¶РµРЅРѕ РІС‚РѕСЂРѕРµ РјРЅРµРЅРёРµ РёР»Рё Р°Р»СЊС‚РµСЂРЅР°С‚РёРІР°.") ??
        (refusalEmergencyCareExplained ? null : "РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ РїР°С†РёРµРЅС‚Сѓ РѕР±СЉСЏСЃРЅРµРЅРѕ, РєРѕРіРґР° РЅСѓР¶РЅР° СЌРєСЃС‚СЂРµРЅРЅР°СЏ РїРѕРјРѕС‰СЊ.")
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
          patientReceivedClinicInfo: confirmedDocumentLiteral(paidContractClinicInfoConfirmed, "РёРЅС„РѕСЂРјР°С†РёСЏ Рѕ РєР»РёРЅРёРєРµ РїРѕР»СѓС‡РµРЅР°"),
          patientReceivedPriceAndServiceList: confirmedDocumentLiteral(paidContractServiceListConfirmed, "РїРµСЂРµС‡РµРЅСЊ СѓСЃР»СѓРі Рё С†РµРЅС‹ РїРѕР»СѓС‡РµРЅС‹"),
          patientUnderstandsPaidBasis: confirmedDocumentLiteral(paidContractPaidBasisConfirmed, "РїР»Р°С‚РЅР°СЏ РѕСЃРЅРѕРІР° РїРѕРЅСЏС‚РЅР°"),
          changesRequireWrittenAgreement: confirmedDocumentLiteral(paidContractWrittenChangesConfirmed, "РёР·РјРµРЅРµРЅРёСЏ РѕС„РѕСЂРјР»СЏСЋС‚СЃСЏ РїРёСЃСЊРјРµРЅРЅРѕ")
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
          linkedToSignedContract: confirmedDocumentLiteral(completedActLinkedContract, "Р°РєС‚ СЃРІСЏР·Р°РЅ СЃ РїРѕРґРїРёСЃР°РЅРЅС‹Рј РґРѕРіРѕРІРѕСЂРѕРј"),
          finalServiceScopeConfirmed: confirmedDocumentLiteral(completedActFinalScopeConfirmed, "РёС‚РѕРіРѕРІС‹Р№ РѕР±СЉРµРј СѓСЃР»СѓРі РїРѕРґС‚РІРµСЂР¶РґРµРЅ"),
          fiscalReceiptsVerified: confirmedDocumentLiteral(completedActFiscalReceiptsVerified, "С„РёСЃРєР°Р»СЊРЅС‹Рµ С‡РµРєРё РїСЂРѕРІРµСЂРµРЅС‹"),
          patientAcceptedWorks: confirmedDocumentLiteral(completedActAccepted, "РїР°С†РёРµРЅС‚ РїСЂРёРЅСЏР» СЂР°Р±РѕС‚С‹")
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
          patientUnderstandsPreliminaryEstimate: confirmedDocumentLiteral(treatmentEstimatePreliminaryConfirmed, "РїСЂРµРґРІР°СЂРёС‚РµР»СЊРЅС‹Р№ С…Р°СЂР°РєС‚РµСЂ СЃРјРµС‚С‹ РїРѕРЅСЏС‚РµРЅ"),
          serviceScopeMatchesTreatmentPlan: confirmedDocumentLiteral(treatmentEstimateScopeConfirmed, "РѕР±СЉРµРј СЃРјРµС‚С‹ СЃРѕРѕС‚РІРµС‚СЃС‚РІСѓРµС‚ РїР»Р°РЅСѓ"),
          estimateDoesNotReplaceContractOrFiscalReceipt: confirmedDocumentLiteral(treatmentEstimateFiscalNoticeConfirmed, "СЃРјРµС‚Р° РЅРµ Р·Р°РјРµРЅСЏРµС‚ РґРѕРіРѕРІРѕСЂ Рё С‡РµРє"),
          changesRequireUpdatedEstimate: confirmedDocumentLiteral(treatmentEstimateChangeRulesConfirmed, "РёР·РјРµРЅРµРЅРёСЏ С‚СЂРµР±СѓСЋС‚ РѕР±РЅРѕРІР»РµРЅРёСЏ СЃРјРµС‚С‹")
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
          clinicRequisitesVerified: confirmedDocumentLiteral(paymentInvoiceRequisitesVerified, "СЂРµРєРІРёР·РёС‚С‹ РєР»РёРЅРёРєРё РїСЂРѕРІРµСЂРµРЅС‹"),
          serviceScopeConfirmed: confirmedDocumentLiteral(paymentInvoiceServiceScopeConfirmed, "РѕР±СЉРµРј СѓСЃР»СѓРіРё РІ СЃС‡РµС‚Рµ РїРѕРґС‚РІРµСЂР¶РґРµРЅ"),
          payerInformedInvoiceIsNotFiscalReceipt: confirmedDocumentLiteral(paymentInvoiceFiscalNoticeConfirmed, "РїР»Р°С‚РµР»СЊС‰РёРє РїРѕРЅРёРјР°РµС‚, С‡С‚Рѕ СЃС‡РµС‚ РЅРµ СЏРІР»СЏРµС‚СЃСЏ С‡РµРєРѕРј")
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
          paymentAndFiscalDataVerified: confirmedDocumentLiteral(paymentReceiptPaymentsVerified, "РїР»Р°С‚РµР¶Рё Рё С„РёСЃРєР°Р»СЊРЅС‹Рµ С‡РµРєРё СЃРІРµСЂРµРЅС‹"),
          payerIdentityVerified: confirmedDocumentLiteral(paymentReceiptPayerVerified, "РґР°РЅРЅС‹Рµ РїР»Р°С‚РµР»СЊС‰РёРєР° РїСЂРѕРІРµСЂРµРЅС‹"),
          receiptDoesNotReplaceFiscalReceipt: confirmedDocumentLiteral(paymentReceiptFiscalNoticeConfirmed, "РєРІРёС‚Р°РЅС†РёСЏ РЅРµ Р·Р°РјРµРЅСЏРµС‚ РєР°СЃСЃРѕРІС‹Р№ С‡РµРє")
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
          patientAcceptedSchedule: confirmedDocumentLiteral(installmentScheduleAccepted, "РіСЂР°С„РёРє РїР»Р°С‚РµР¶РµР№ РїСЂРёРЅСЏС‚"),
          scheduleDoesNotReplaceFiscalReceipt: confirmedDocumentLiteral(installmentScheduleFiscalNoticeConfirmed, "РіСЂР°С„РёРє РЅРµ Р·Р°РјРµРЅСЏРµС‚ РєР°СЃСЃРѕРІС‹Р№ С‡РµРє"),
          changesRequireWrittenAgreement: confirmedDocumentLiteral(installmentScheduleWrittenChangesConfirmed, "РёР·РјРµРЅРµРЅРёСЏ РіСЂР°С„РёРєР° РѕС„РѕСЂРјР»СЏСЋС‚СЃСЏ РїРёСЃСЊРјРµРЅРЅРѕ")
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
          representativeIdentityVerified: confirmedDocumentLiteral(minorConsentIdentityVerified, "Р»РёС‡РЅРѕСЃС‚СЊ РїСЂРµРґСЃС‚Р°РІРёС‚РµР»СЏ РїСЂРѕРІРµСЂРµРЅР°"),
          representativeAuthorityVerified: confirmedDocumentLiteral(minorConsentAuthorityVerified, "РїРѕР»РЅРѕРјРѕС‡РёСЏ РїСЂРµРґСЃС‚Р°РІРёС‚РµР»СЏ РїСЂРѕРІРµСЂРµРЅС‹"),
          informedConsentExplained: confirmedDocumentLiteral(minorConsentExplained, "РёРЅС„РѕСЂРјРёСЂРѕРІР°РЅРЅРѕРµ СЃРѕРіР»Р°СЃРёРµ СЂР°Р·СЉСЏСЃРЅРµРЅРѕ"),
          medicalRecordConsentStored: confirmedDocumentLiteral(minorConsentStored, "СЃРѕРіР»Р°СЃРёРµ СЃРѕС…СЂР°РЅРµРЅРѕ РІ РјРµРґРєР°СЂС‚Рµ"),
          ageAppropriateExplanationGiven: confirmedDocumentLiteral(minorConsentAgeExplanation, "СЂРµР±РµРЅРєСѓ РґР°РЅРѕ РѕР±СЉСЏСЃРЅРµРЅРёРµ РїРѕ РІРѕР·СЂР°СЃС‚Сѓ")
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
          localWarrantyPolicyApplied: confirmedDocumentLiteral(warrantyPolicyApplied, "Р»РѕРєР°Р»СЊРЅРѕРµ РіР°СЂР°РЅС‚РёР№РЅРѕРµ РїРѕР»РѕР¶РµРЅРёРµ РїСЂРёРјРµРЅРµРЅРѕ"),
          patientReceivedAftercare: confirmedDocumentLiteral(warrantyAftercareReceived, "РїР°С†РёРµРЅС‚ РїРѕР»СѓС‡РёР» СЂРµРєРѕРјРµРЅРґР°С†РёРё"),
          patientUnderstandsControlVisits: confirmedDocumentLiteral(warrantyControlVisitsUnderstood, "РєРѕРЅС‚СЂРѕР»СЊРЅС‹Рµ РІРёР·РёС‚С‹ РїРѕРЅСЏС‚РЅС‹")
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
          accuracyConfirmed: confirmedDocumentLiteral(intakeAccuracyConfirmed, "РїР°С†РёРµРЅС‚ РїРѕРґС‚РІРµСЂРґРёР» РґРѕСЃС‚РѕРІРµСЂРЅРѕСЃС‚СЊ Р°РЅРєРµС‚С‹")
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
          duplicateWarningAccepted: confirmedDocumentLiteral(taxApplicationDuplicateWarningAccepted, "РїСЂРѕРІРµСЂРєР° РґСѓР±Р»РµР№ РЅР°Р»РѕРіРѕРІРѕР№ СЃРїСЂР°РІРєРё РїРѕРґС‚РІРµСЂР¶РґРµРЅР°")
        }
      };
    }
    if (kind === "informed_consent") {
      return {
        informedConsent: {
          intervention: informedConsentIntervention.trim(),
          toothOrArea: informedConsentToothOrArea.trim() || inferredTreatmentArea || "",
          diagnosisOrIndication: informedConsentDiagnosisOrIndication.trim() || dashboard?.activeVisit?.complaint || "",
          expectedBenefit: informedConsentExpectedBenefit.trim(),
          plannedAnesthesia: informedConsentAnesthesia.trim() || null,
          materialOrMedicationNotes: informedConsentMaterialNotes.trim() || null,
          trustedContactForMedicalInfo: informedConsentTrustedContact.trim() || null,
          explainedRisks: documentTextLines(informedConsentRisks),
          alternatives: documentTextLines(informedConsentAlternatives),
          aftercareRequirements: documentTextLines(informedConsentAftercare),
          doctorFullName: informedConsentDoctorFullName.trim() || activeDoctor?.fullName || "",
          consentConfirmedAt: informedConsentConfirmedAt.trim(),
          patientQuestionsAnswered: confirmedDocumentLiteral(informedConsentQuestionsAnswered, "РІРѕРїСЂРѕСЃС‹ РїР°С†РёРµРЅС‚Р° РїРѕ РёРЅС„РѕСЂРјРёСЂРѕРІР°РЅРЅРѕРјСѓ СЃРѕРіР»Р°СЃРёСЋ Р·Р°РєСЂС‹С‚С‹"),
          patientUnderstandsRisks: confirmedDocumentLiteral(informedConsentRisksUnderstood, "СЂРёСЃРєРё РёРЅС„РѕСЂРјРёСЂРѕРІР°РЅРЅРѕРіРѕ СЃРѕРіР»Р°СЃРёСЏ РїРѕРЅСЏС‚РЅС‹"),
          patientMayWithdrawBeforeIntervention: confirmedDocumentLiteral(informedConsentWithdrawUnderstood, "РїСЂР°РІРѕ РѕС‚РєР°Р·Р°С‚СЊСЃСЏ РґРѕ РІРјРµС€Р°С‚РµР»СЊСЃС‚РІР° РѕР±СЉСЏСЃРЅРµРЅРѕ")
        }
      };
    }
    if (kind === "procedure_specific_consent_packet") {
      return {
        procedureSpecificConsent: {
          procedureType: procedureConsentProcedureType,
          procedureName: procedureConsentProcedureName.trim(),
          toothOrArea: procedureConsentToothOrArea.trim() || inferredTreatmentArea || "",
          diagnosisOrIndication: procedureConsentDiagnosisOrIndication.trim() || dashboard?.activeVisit?.complaint || "",
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
          patientQuestionsAnswered: confirmedDocumentLiteral(procedureConsentQuestionsAnswered, "РІРѕРїСЂРѕСЃС‹ РїР°С†РёРµРЅС‚Р° РїРѕ РїСЂРѕС†РµРґСѓСЂРµ Р·Р°РєСЂС‹С‚С‹"),
          exactProcedureConfirmed: confirmedDocumentLiteral(procedureConsentExactProcedureConfirmed, "РїСЂРѕС†РµРґСѓСЂР°, Р·РѕРЅР° Рё РѕР±СЉРµРј РїРѕРґС‚РІРµСЂР¶РґРµРЅС‹"),
          patientUnderstandsSpecificRisks: confirmedDocumentLiteral(procedureConsentRisksUnderstood, "РїСЂРѕС†РµРґСѓСЂРЅС‹Рµ СЂРёСЃРєРё РїРѕРЅСЏС‚РЅС‹")
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
          patientQuestionsAnswered: confirmedDocumentLiteral(treatmentPlanQuestionsAnswered, "РІРѕРїСЂРѕСЃС‹ РїР°С†РёРµРЅС‚Р° РїРѕ РїР»Р°РЅСѓ Р»РµС‡РµРЅРёСЏ Р·Р°РєСЂС‹С‚С‹"),
          planRequiresSeparateConsent: confirmedDocumentLiteral(treatmentPlanSeparateConsentAcknowledged, "РїР»Р°РЅ РЅРµ Р·Р°РјРµРЅСЏРµС‚ РѕС‚РґРµР»СЊРЅРѕРµ СЃРѕРіР»Р°СЃРёРµ"),
          planRequiresNewApprovalOnChange: confirmedDocumentLiteral(treatmentPlanNewApprovalAcknowledged, "РёР·РјРµРЅРµРЅРёРµ РїР»Р°РЅР° С‚СЂРµР±СѓРµС‚ РЅРѕРІРѕРіРѕ СЃРѕРіР»Р°СЃРѕРІР°РЅРёСЏ")
        }
      };
    }
    if (kind === "treatment_plan_acceptance") {
      return {
        treatmentPlanAcceptance: {
          selectedVariant: treatmentAcceptanceVariant,
          clinicalGoal: treatmentAcceptanceClinicalGoal.trim(),
          diagnosisSummary: treatmentAcceptanceDiagnosisSummary.trim() || dashboard?.activeVisit?.diagnosis || dashboard?.activeVisit?.complaint || "",
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
          patientQuestionsAnswered: confirmedDocumentLiteral(treatmentAcceptanceQuestionsAnswered, "РІРѕРїСЂРѕСЃС‹ РїР°С†РёРµРЅС‚Р° РїРѕ СЃРѕРіР»Р°СЃРѕРІР°РЅРёСЋ РїР»Р°РЅР° Р·Р°РєСЂС‹С‚С‹"),
          patientUnderstandsAlternatives: confirmedDocumentLiteral(treatmentAcceptanceAlternativesUnderstood, "Р°Р»СЊС‚РµСЂРЅР°С‚РёРІС‹ РїР»Р°РЅР° РїРѕРЅСЏС‚РЅС‹"),
          patientUnderstandsCostMayChange: confirmedDocumentLiteral(treatmentAcceptanceCostChangeUnderstood, "РёР·РјРµРЅРµРЅРёРµ СЃС‚РѕРёРјРѕСЃС‚Рё РїРѕРЅСЏС‚РЅРѕ"),
          revisionRequiresNewApproval: confirmedDocumentLiteral(treatmentAcceptanceRevisionAcknowledged, "РїРµСЂРµСЃРјРѕС‚СЂ РїР»Р°РЅР° С‚СЂРµР±СѓРµС‚ РЅРѕРІРѕРіРѕ СЃРѕРіР»Р°СЃРѕРІР°РЅРёСЏ")
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
          patientReceivedPrintedCopy: confirmedDocumentLiteral(postVisitPrintedCopyReceived, "РїР°С†РёРµРЅС‚ РїРѕР»СѓС‡РёР» РїР°РјСЏС‚РєСѓ"),
          patientUnderstandsUrgentSigns: confirmedDocumentLiteral(postVisitUrgentSignsUnderstood, "С‚СЂРµРІРѕР¶РЅС‹Рµ РїСЂРёР·РЅР°РєРё РїРѕРЅСЏС‚РЅС‹"),
          safeForTelegramSending: confirmedDocumentLiteral(postVisitTelegramSafe, "Telegram-С‚РµРєСЃС‚ РїСЂРѕРІРµСЂРµРЅ")
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
          patientAnesthesiaRisksExplained: confirmedDocumentLiteral(anesthesiaRisksExplained, "СЂРёСЃРєРё Р°РЅРµСЃС‚РµР·РёРё СЂР°Р·СЉСЏСЃРЅРµРЅС‹"),
          allergyAndRestrictionStatusChecked: confirmedDocumentLiteral(anesthesiaAllergyRestrictionsChecked, "Р°Р»Р»РµСЂРіРёРё Рё РѕРіСЂР°РЅРёС‡РµРЅРёСЏ РїСЂРѕРІРµСЂРµРЅС‹"),
          patientConfirmedAnesthesiaConsent: confirmedDocumentLiteral(anesthesiaConsentConfirmed, "СЃРѕРіР»Р°СЃРёРµ РЅР° РјРµСЃС‚РЅСѓСЋ Р°РЅРµСЃС‚РµР·РёСЋ РїРѕРґС‚РІРµСЂР¶РґРµРЅРѕ")
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
          clinicalRecordUse: confirmedDocumentLiteral(photoVideoClinicalRecordUseConfirmed, "РёСЃРїРѕР»СЊР·РѕРІР°РЅРёРµ С„РѕС‚Рѕ, РІРёРґРµРѕ Рё СЃРЅРёРјРєРѕРІ РІ РјРµРґРёС†РёРЅСЃРєРѕР№ РєР°СЂС‚Рµ РїРѕРґС‚РІРµСЂР¶РґРµРЅРѕ"),
          labTransferAllowed: photoVideoLabTransferAllowed,
          colleagueConsultationAllowed: photoVideoColleagueConsultationAllowed,
          educationUseAllowed: photoVideoEducationUseAllowed,
          marketingUseAllowed: photoVideoMarketingUseAllowed,
          recognizablePublicationAllowed: photoVideoRecognizablePublicationAllowed,
          materials: photoVideoMaterials,
          anonymizationRequired: confirmedDocumentLiteral(photoVideoAnonymizationConfirmed, "РѕР±РµР·Р»РёС‡РёРІР°РЅРёРµ РІРЅРµС€РЅРµРіРѕ РёСЃРїРѕР»СЊР·РѕРІР°РЅРёСЏ РїРѕРґС‚РІРµСЂР¶РґРµРЅРѕ"),
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
          requestedBy: xrayRequestedBy.trim() || activeDoctor?.fullName || "Р»РµС‡Р°С‰РёР№ РІСЂР°С‡",
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
          sourceVisitIds: sourceVisitIds.length ? sourceVisitIds : [dashboard?.activeVisit?.id ?? "С‚РµРєСѓС‰РёР№ РІРёР·РёС‚"],
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
          preparedFromSignedMedicalRecords: confirmedDocumentLiteral(recordExtractPreparedFromSignedRecords, "РІС‹РїРёСЃРєР° РїРѕРґРіРѕС‚РѕРІР»РµРЅР° РёР· РїРѕРґРїРёСЃР°РЅРЅС‹С… Р·Р°РїРёСЃРµР№"),
          thirdPartyDataChecked: confirmedDocumentLiteral(recordExtractThirdPartyDataChecked, "РґР°РЅРЅС‹Рµ С‚СЂРµС‚СЊРёС… Р»РёС† РїСЂРѕРІРµСЂРµРЅС‹")
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
          identityVerified: confirmedDocumentLiteral(copyRequestIdentityVerified, "Р»РёС‡РЅРѕСЃС‚СЊ РїРѕР»СѓС‡Р°С‚РµР»СЏ Р·Р°РїСЂРѕСЃР° РїСЂРѕРІРµСЂРµРЅР°"),
          thirdPartyDataExclusionAcknowledged: confirmedDocumentLiteral(copyRequestThirdPartyDataChecked, "РёСЃРєР»СЋС‡РµРЅРёРµ РґР°РЅРЅС‹С… С‚СЂРµС‚СЊРёС… Р»РёС† РїРѕРґС‚РІРµСЂР¶РґРµРЅРѕ")
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
          diagnosisDisclosureExcluded: confirmedDocumentLiteral(attendanceDiagnosisDisclosureExcluded, "РґРёР°РіРЅРѕР· РЅРµ СЂР°СЃРєСЂС‹РІР°РµС‚СЃСЏ РІ СЃРїСЂР°РІРєРµ РїРѕСЃРµС‰РµРЅРёСЏ"),
          notSickLeaveAcknowledged: confirmedDocumentLiteral(attendanceNotSickLeaveAcknowledged, "СЃРїСЂР°РІРєР° РЅРµ Р·Р°РјРµРЅСЏРµС‚ Р±РѕР»СЊРЅРёС‡РЅС‹Р№")
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
          thirdPartyDataChecked: confirmedDocumentLiteral(releaseThirdPartyDataChecked, "Р»РёС€РЅРёРµ РґР°РЅРЅС‹Рµ С‚СЂРµС‚СЊРёС… Р»РёС† РёСЃРєР»СЋС‡РµРЅС‹")
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
          patientConfirmedVoluntaryConsent: confirmedDocumentLiteral(personalDataVoluntaryConsentConfirmed, "РґРѕР±СЂРѕРІРѕР»СЊРЅРѕРµ СЃРѕРіР»Р°СЃРёРµ РЅР° РџР”РЅ РїРѕРґС‚РІРµСЂР¶РґРµРЅРѕ"),
          medicalDataProcessingAcknowledged: confirmedDocumentLiteral(personalDataMedicalProcessingAcknowledged, "РѕР±СЂР°Р±РѕС‚РєР° РјРµРґРёС†РёРЅСЃРєРёС… РґР°РЅРЅС‹С… РїРѕРЅСЏС‚РЅР°")
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
          patientUnderstandsConsequences: confirmedDocumentLiteral(refusalConsequencesUnderstood, "РїРѕСЃР»РµРґСЃС‚РІРёСЏ РѕС‚РєР°Р·Р° РїРѕРЅСЏС‚РЅС‹"),
          secondOpinionOffered: confirmedDocumentLiteral(refusalSecondOpinionOffered, "РІС‚РѕСЂРѕРµ РјРЅРµРЅРёРµ РёР»Рё Р°Р»СЊС‚РµСЂРЅР°С‚РёРІР° РїСЂРµРґР»РѕР¶РµРЅС‹"),
          emergencyCareExplained: confirmedDocumentLiteral(refusalEmergencyCareExplained, "СЌРєСЃС‚СЂРµРЅРЅР°СЏ РїРѕРјРѕС‰СЊ РѕР±СЉСЏСЃРЅРµРЅР°")
        }
      };
    }
    return null;
  }

  function renderClinicalToothRowsEditor() {
    return (
      <label>
        РљР»РёРЅРёС‡РµСЃРєРёРµ СЃС‚СЂРѕРєРё РїРѕ Р·СѓР±Р°Рј Рё СЃРµРіРјРµРЅС‚Р°Рј
        <textarea value={clinicalToothRowsText} onChange={(event) => setClinicalToothRowsText(event.target.value)} rows={5} />
        <small>
          Р¤РѕСЂРјР°С‚ СЃС‚СЂРѕРєРё: Р·СѓР±/СЃРµРіРјРµРЅС‚ | РїРѕРІРµСЂС…РЅРѕСЃС‚Рё | СЃС‚Р°С‚СѓСЃ | РґРёР°РіРЅРѕР·/РЅР°С…РѕРґРєР° | РїРѕРєР°Р·Р°РЅРёРµ | РґРµР№СЃС‚РІРёРµ | РїСЂРѕРіРЅРѕР· | РїР°СЂРѕРґРѕРЅС‚ | РёРјРїР»Р°РЅС‚/РѕСЂС‚РѕРїРµРґРёСЏ |
          РѕСЂС‚РѕРґРѕРЅС‚РёСЏ
        </small>
      </label>
    );
  }

  async function createDocument(kind: GeneratedDocument["kind"]) {
    if (documentCreateSavingKind) {
      setError("Р”РѕР¶РґРёС‚РµСЃСЊ Р·Р°РІРµСЂС€РµРЅРёСЏ С‚РµРєСѓС‰РµРіРѕ СЃРѕР·РґР°РЅРёСЏ РґРѕРєСѓРјРµРЅС‚Р°.");
      return;
    }
    if (!documentPatient || !dashboard) {
      setError("Р’С‹Р±РµСЂРёС‚Рµ РїР°С†РёРµРЅС‚Р° РїРµСЂРµРґ СЃРѕР·РґР°РЅРёРµРј РґРѕРєСѓРјРµРЅС‚Р°.");
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
      setError("РљРќР” 1151156 РїРѕРґС…РѕРґРёС‚ С‚РѕР»СЊРєРѕ РґР»СЏ РѕРїР»Р°С‚ СЃ 2024 РіРѕРґР°. Р”Р»СЏ 2021-2023 РІС‹Р±РµСЂРёС‚Рµ СЃС‚Р°СЂСѓСЋ СЃРїСЂР°РІРєСѓ.");
      return;
    }
    if (kind === "legacy_tax_deduction_certificate" && (taxDocumentYear < 2021 || taxDocumentYear > 2023)) {
      setError("РЎС‚Р°СЂР°СЏ РЅР°Р»РѕРіРѕРІР°СЏ СЃРїСЂР°РІРєР° РїРѕРґС…РѕРґРёС‚ С‚РѕР»СЊРєРѕ РґР»СЏ РѕРїР»Р°С‚ 2021-2023. Р”Р»СЏ 2024+ РІС‹Р±РµСЂРёС‚Рµ РљРќР” 1151156.");
      return;
    }
    const selectedTaxPayerInn = isTaxDocument ? selectedTaxDocumentPayerInn : "";
    if (isTaxDocument && taxDocumentPayerOptions.length > 1 && !selectedTaxDocumentPayerKey) {
      setError("Р’С‹Р±РµСЂРёС‚Рµ РїР»Р°С‚РµР»СЊС‰РёРєР° РґР»СЏ РљРќР” 1151156. Р Р°Р·РЅС‹Рµ РЅР°Р»РѕРіРѕРїР»Р°С‚РµР»СЊС‰РёРєРё РґРѕР»Р¶РЅС‹ РёРґС‚Рё РѕС‚РґРµР»СЊРЅС‹РјРё СЃРїСЂР°РІРєР°РјРё.");
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
      setError("Р’С‹Р±РµСЂРёС‚Рµ С„РёСЃРєР°Р»СЊРЅС‹Рµ С‡РµРєРё РґР»СЏ РЅР°Р»РѕРіРѕРІРѕРіРѕ РґРѕРєСѓРјРµРЅС‚Р°. РЎРёСЃС‚РµРјР° Р±РѕР»СЊС€Рµ РЅРµ РїРѕРґСЃС‚Р°РІР»СЏРµС‚ РІСЃРµ РѕРїР»Р°С‚С‹ Р·Р° РіРѕРґ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё.");
      return;
    }
    if (requiresPaymentReceiptSelection && selectedPaymentReceiptIdsForDocument.length === 0) {
      setError("Р’С‹Р±РµСЂРёС‚Рµ РѕРїР»Р°С‡РµРЅРЅС‹Рµ РїР»Р°С‚РµР¶Рё РґР»СЏ РїР»Р°С‚РµР¶РЅРѕР№ РєРІРёС‚Р°РЅС†РёРё. РЎРёСЃС‚РµРјР° РЅРµ РїРѕРґСЃС‚Р°РІР»СЏРµС‚ РІСЃРµ РѕРїР»Р°С‚С‹ СЃРєСЂС‹С‚Рѕ.");
      return;
    }
    const linkActiveVisit =
      metadata.requiresVisit || metadata.group === "payment" || (metadata.group !== "tax" && metadata.amountSource !== "none");
    if (linkActiveVisit && !documentPatientMatchesActiveVisit) {
      setError(
        `Р”РѕРєСѓРјРµРЅС‚ В«${metadata.label}В» С‚СЂРµР±СѓРµС‚ Р°РєС‚РёРІРЅРѕРіРѕ РїСЂРёРµРјР° РїР°С†РёРµРЅС‚Р° ${documentPatient.fullName}. РЎРµР№С‡Р°СЃ РѕС‚РєСЂС‹С‚ РїСЂРёРµРј РґСЂСѓРіРѕРіРѕ РїР°С†РёРµРЅС‚Р°, РїРѕСЌС‚РѕРјСѓ СЃРёСЃС‚РµРјР° РЅРµ СЃРѕР·РґР°СЃС‚ РґРѕРєСѓРјРµРЅС‚ СЃ С‡СѓР¶РѕР№ РїСЂРёРІСЏР·РєРѕР№ Рє РїСЂРёРµРјСѓ. РћС‚РєСЂРѕР№С‚Рµ РЅСѓР¶РЅС‹Р№ РїСЂРёРµРј РёР»Рё РІС‹Р±РµСЂРёС‚Рµ РґРѕРєСѓРјРµРЅС‚ Р±РµР· РїСЂРёРІСЏР·РєРё Рє РІРёР·РёС‚Сѓ.`
      );
      return;
    }
    const plannedAmount =
      activeTreatmentPlanItems
        .filter((item) => item.status !== "cancelled")
        .filter((item) => !dashboard?.activeVisit?.id || item.visitId === dashboard?.activeVisit?.id)
        .reduce((total, item) => total + Math.max(0, item.unitPriceRub * item.quantity - item.discountRub), 0) || null;
    const paidAmount =
      activePayments
        .filter((payment) => payment.status === "paid")
        .filter((payment) => {
          if (requiresPaymentReceiptSelection) return selectedPaymentReceiptIdsForDocument.includes(payment.id);
          if (kind === "payment_refund_correction_request" && documentPayload?.paymentRefundCorrection) {
            return documentPayload.paymentRefundCorrection.selectedPaymentIds.includes(payment.id);
          }
          if (metadata.group !== "tax") return payment.visitId === dashboard?.activeVisit?.id;
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
          ? `Р”Р»СЏ РЅР°Р»РѕРіРѕРІРѕРіРѕ РґРѕРєСѓРјРµРЅС‚Р° РЅСѓР¶РЅР° С„Р°РєС‚РёС‡РµСЃРєР°СЏ РѕРїР»Р°С‚Р° Р·Р° ${taxDocumentYear} РіРѕРґ. РџР»Р°РЅ Р»РµС‡РµРЅРёСЏ Рё РѕРїР»Р°С‚С‹ РґСЂСѓРіРёС… Р»РµС‚ РЅРµ РїРѕРґС…РѕРґСЏС‚.`
          : "Р”Р»СЏ СЌС‚РѕРіРѕ РґРѕРєСѓРјРµРЅС‚Р° РЅСѓР¶РЅР° С„Р°РєС‚РёС‡РµСЃРєР°СЏ РѕРїР»Р°С‚Р°. РџР»Р°РЅ Р»РµС‡РµРЅРёСЏ РёР»Рё РїСЂРёРјРµСЂРЅР°СЏ СЃСѓРјРјР° РЅРµ РїРѕРґС…РѕРґСЏС‚."
      );
      return;
    }
    if (
      kind === "payment_refund_correction_request" &&
      documentPayload?.paymentRefundCorrection &&
      paidAmount &&
      documentPayload.paymentRefundCorrection.amountRub > paidAmount
    ) {
      setError("РЎСѓРјРјР° РІРѕР·РІСЂР°С‚Р° РёР»Рё РєРѕСЂСЂРµРєС†РёРё РЅРµ РјРѕР¶РµС‚ РїСЂРµРІС‹С€Р°С‚СЊ С„Р°РєС‚РёС‡РµСЃРєСѓСЋ РѕРїР»Р°С‚Сѓ РїРѕ РІС‹Р±СЂР°РЅРЅРѕРјСѓ РІРёР·РёС‚Сѓ.");
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
          visitId: linkActiveVisit ? dashboard?.activeVisit?.id : null,
          kind,
          taxYear: isTaxDocument ? taxDocumentYear : null,
          taxPayerInn: isTaxDocument ? selectedTaxPayerInn || null : null,
          payload: payloadForDocument,
          title: isTaxDocument ? `${metadata.title} Р·Р° ${taxDocumentYear} РіРѕРґ` : undefined,
          totalAmountRub: moneyDocumentKinds.has(kind) ? totalAmountRub : null
        })
      });
      if (!response.ok) {
        setError(await responseErrorMessage(response, "Р”РѕРєСѓРјРµРЅС‚ РЅРµ СЃРѕР·РґР°РЅ"));
        return;
      }
      try {
        await loadDashboard();
        setError(null);
      } catch (error) {
        setError(requestFailureMessage("Р”РѕРєСѓРјРµРЅС‚ СЃРѕР·РґР°РЅ, РЅРѕ СЃРїРёСЃРѕРє РґРѕРєСѓРјРµРЅС‚РѕРІ РЅРµ РїРµСЂРµР·Р°РіСЂСѓР¶РµРЅ", error));
      }
    } catch (error) {
      setError(requestFailureMessage("Р”РѕРєСѓРјРµРЅС‚ РЅРµ СЃРѕР·РґР°РЅ", error));
    } finally {
      setDocumentCreateSavingKind(null);
    }
  }

  async function updateDocumentStatus(documentId: string, action: "issue" | "void", payload?: unknown): Promise<boolean> {
    if (documentStatusSavingId) {
      setError("Р”РѕР¶РґРёС‚РµСЃСЊ Р·Р°РІРµСЂС€РµРЅРёСЏ С‚РµРєСѓС‰РµРіРѕ РґРµР№СЃС‚РІРёСЏ СЃ РґРѕРєСѓРјРµРЅС‚РѕРј.");
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
        setError(await responseErrorMessage(response, "РЎС‚Р°С‚СѓСЃ РґРѕРєСѓРјРµРЅС‚Р° РЅРµ РѕР±РЅРѕРІР»РµРЅ"));
        return false;
      }
      setDocumentAuditFacts(null);
      try {
        await loadDashboard();
        setError(null);
      } catch (error) {
        setError(requestFailureMessage("РЎС‚Р°С‚СѓСЃ РґРѕРєСѓРјРµРЅС‚Р° РѕР±РЅРѕРІР»РµРЅ, РЅРѕ СЃРїРёСЃРѕРє РґРѕРєСѓРјРµРЅС‚РѕРІ РЅРµ РїРµСЂРµР·Р°РіСЂСѓР¶РµРЅ", error));
      }
      return true;
    } catch (error) {
      setError(requestFailureMessage("РЎС‚Р°С‚СѓСЃ РґРѕРєСѓРјРµРЅС‚Р° РЅРµ РѕР±РЅРѕРІР»РµРЅ", error));
      return false;
    } finally {
      setDocumentStatusSavingId(null);
    }
  }

  function requestDocumentIssue(document: GeneratedDocument) {
    if (!dashboard) {
      setError("Р”Р°РЅРЅС‹Рµ РєР»РёРЅРёРєРё РµС‰Рµ РЅРµ Р·Р°РіСЂСѓР¶РµРЅС‹. РџРѕРІС‚РѕСЂРёС‚Рµ РІС‹РґР°С‡Сѓ РґРѕРєСѓРјРµРЅС‚Р° РїРѕСЃР»Рµ Р·Р°РіСЂСѓР·РєРё СЂР°Р±РѕС‡РµРіРѕ СЌРєСЂР°РЅР°.");
      return;
    }
    if (document.status !== "draft") {
      setError("Р’С‹РґР°С‚СЊ РјРѕР¶РЅРѕ С‚РѕР»СЊРєРѕ С‡РµСЂРЅРѕРІРёРє РґРѕРєСѓРјРµРЅС‚Р°.");
      return;
    }
    setDocumentIssueSignedAt(currentLocalDateTimeInputValue());
    setDocumentIssueRecipientFullName(patientName(dashboard.patients, document.patientId));
    setDocumentIssueRecipientRole("РїР°С†РёРµРЅС‚/Р·Р°РєРѕРЅРЅС‹Р№ РїСЂРµРґСЃС‚Р°РІРёС‚РµР»СЊ");
    if (!documentIssueStaffFullName.trim() && activeDoctor?.fullName) {
      setDocumentIssueStaffFullName(activeDoctor.fullName);
    }
    if (!documentIssueStaffRole.trim()) {
      setDocumentIssueStaffRole(activeDoctor ? staffRoleLabels[activeDoctor.role] : "Р’СЂР°С‡/Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ");
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
      setError("Р’С‹Р±РµСЂРёС‚Рµ С‡РµСЂРЅРѕРІРёРє РґРѕРєСѓРјРµРЅС‚Р° РґР»СЏ РІС‹РґР°С‡Рё.");
      return;
    }
    if (!documentIssueAttestationReady) {
      setError("РџРµСЂРµРґ РІС‹РґР°С‡РµР№ РѕС‚РјРµС‚СЊС‚Рµ РїСЂРѕРІРµСЂРєСѓ Р»РёС‡РЅРѕСЃС‚Рё, РїСЂРѕСЃРјРѕС‚СЂ РґРѕРєСѓРјРµРЅС‚Р° Рё РїРѕРґРїРёСЃРё РїР°С†РёРµРЅС‚Р°/РєР»РёРЅРёРєРё.");
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
      dashboard?.clinicSettings?.profile?.organizationId ?? null,
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
      setError("Р”РѕРєСѓРјРµРЅС‚ СѓР¶Рµ Р°РЅРЅСѓР»РёСЂРѕРІР°РЅ.");
      return;
    }
    setDocumentVoidReasonCode(document.status === "issued" ? "issued_in_error" : "draft_error");
    setDocumentVoidReasonText("");
    if (!documentVoidStaffFullName.trim() && activeDoctor?.fullName) {
      setDocumentVoidStaffFullName(activeDoctor.fullName);
    }
    if (!documentVoidStaffRole.trim()) {
      setDocumentVoidStaffRole(activeDoctor ? staffRoleLabels[activeDoctor.role] : "Р’СЂР°С‡/Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ");
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
      setError("Р’С‹Р±РµСЂРёС‚Рµ РґРѕРєСѓРјРµРЅС‚ РґР»СЏ Р°РЅРЅСѓР»РёСЂРѕРІР°РЅРёСЏ.");
      return;
    }
    if (!documentVoidReady) {
      setError("РџРµСЂРµРґ Р°РЅРЅСѓР»РёСЂРѕРІР°РЅРёРµРј СѓРєР°Р¶РёС‚Рµ РїСЂРёС‡РёРЅСѓ, РѕС‚РІРµС‚СЃС‚РІРµРЅРЅРѕРіРѕ СЃРѕС‚СЂСѓРґРЅРёРєР°, СЃРѕС…СЂР°РЅРµРЅРёРµ Р°СЂС…РёРІР° Рё РїСЂРѕРІРµСЂРєСѓ СЃС‚Р°С‚СѓСЃР°.");
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
        setError(await responseErrorMessage(response, "XML Р¤РќРЎ РЅРµ РІС‹РіСЂСѓР¶РµРЅ"));
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
      setError(requestFailureMessage("XML Р¤РќРЎ РЅРµ РІС‹РіСЂСѓР¶РµРЅ", error));
    }
  }

  async function loadDocumentAuditFacts(documentId: string) {
    setDocumentAuditFactsLoadingId(documentId);
    try {
      const response = await fetch(`/api/documents/${documentId}/audit-facts`, { cache: "no-store", headers: denteClinicalReadHeaders() });
      if (!response.ok) {
        setError(await responseErrorMessage(response, "РџР°СЃРїРѕСЂС‚ РІС‹РґР°С‡Рё РЅРµ Р·Р°РіСЂСѓР¶РµРЅ"));
        return;
      }
      setDocumentAuditFacts((await response.json()) as DocumentAuditFacts);
      setError(null);
    } catch (error) {
      setError(requestFailureMessage("РџР°СЃРїРѕСЂС‚ РІС‹РґР°С‡Рё РЅРµ Р·Р°РіСЂСѓР¶РµРЅ", error));
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
        setError(await responseErrorMessage(response, "РђСЂС…РёРІРЅС‹Р№ HTML РЅРµ СЃРєР°С‡Р°РЅ"));
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
      setError(requestFailureMessage("РђСЂС…РёРІРЅС‹Р№ HTML РЅРµ СЃРєР°С‡Р°РЅ", error));
    }
  }

  async function openIssuedDocumentHtml(documentId: string) {
    try {
      const previewUrl = issuedDocumentHtmlPreviewUrl(documentId);
      if (clinicalAdminSecretSession.trim()) {
        setError(
          "HTML-РїСЂРµРґРїСЂРѕСЃРјРѕС‚СЂ РІ РЅРѕРІРѕРј РѕРєРЅРµ РЅРµ РјРѕР¶РµС‚ РїРµСЂРµРґР°С‚СЊ СЃРµРєСЂРµС‚ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР° РєР»РёРЅРёРєРё. CRM Р·Р°РїСѓСЃРєР°РµС‚ Р·Р°С‰РёС‰РµРЅРЅРѕРµ СЃРєР°С‡РёРІР°РЅРёРµ Р°СЂС…РёРІРЅРѕРіРѕ HTML."
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
        "Р‘СЂР°СѓР·РµСЂ Р·Р°Р±Р»РѕРєРёСЂРѕРІР°Р» РЅРѕРІРѕРµ РѕРєРЅРѕ РґРѕРєСѓРјРµРЅС‚Р°. CRM Р·Р°РїСѓСЃРєР°РµС‚ СЃРєР°С‡РёРІР°РЅРёРµ Р°СЂС…РёРІРЅРѕРіРѕ HTML; РµСЃР»Рё РјРѕР±РёР»СЊРЅС‹Р№ Р±СЂР°СѓР·РµСЂ РµРіРѕ РѕС‚РєР»РѕРЅРёС‚, РЅР°Р¶РјРёС‚Рµ \"РЎРєР°С‡Р°С‚СЊ HTML\" РІ СЃС‚СЂРѕРєРµ РґРѕРєСѓРјРµРЅС‚Р°."
      );
      await downloadIssuedDocumentHtml(documentId, { preserveError: true });
    } catch (error) {
      setError(requestFailureMessage("HTML РґРѕРєСѓРјРµРЅС‚Р° РЅРµ РѕС‚РєСЂС‹С‚", error));
    }
  }

  async function downloadIssuedDocumentPdf(documentId: string) {
    try {
      const response = await fetch(`/api/documents/${documentId}/pdf`, { cache: "no-store", headers: denteClinicalReadHeaders() });
      if (!response.ok) {
        setError(await responseErrorMessage(response, "PDF РЅРµ СЃС„РѕСЂРјРёСЂРѕРІР°РЅ"));
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
      setError(requestFailureMessage("PDF РЅРµ СЃС„РѕСЂРјРёСЂРѕРІР°РЅ", error));
    }
  }

  async function recordPayment() {
    setPaymentFeedback("");
    if (isPaymentSaving) {
      setError("Р”РѕР¶РґРёС‚РµСЃСЊ Р·Р°РІРµСЂС€РµРЅРёСЏ С‚РµРєСѓС‰РµР№ Р·Р°РїРёСЃРё РѕРїР»Р°С‚С‹.");
      return;
    }
    if (!documentPatient || !dashboard) {
      setError("Р’С‹Р±РµСЂРёС‚Рµ РїР°С†РёРµРЅС‚Р° Рё Р°РєС‚РёРІРЅС‹Р№ РїСЂРёРµРј РїРµСЂРµРґ Р·Р°РїРёСЃСЊСЋ РѕРїР»Р°С‚С‹.");
      return;
    }
    if (!documentPatientMatchesActiveVisit) {
      setError(paymentPatientContextMessage || "РћРїР»Р°С‚Р° РЅРµ Р·Р°РїРёСЃР°РЅР°: РІС‹Р±СЂР°РЅРЅС‹Р№ РїР°С†РёРµРЅС‚ РЅРµ СЃРѕРІРїР°РґР°РµС‚ СЃ Р°РєС‚РёРІРЅС‹Рј РїСЂРёРµРјРѕРј.");
      return;
    }
    const amountRub = normalizeRubAmountInput(paymentAmount);
    const amountMissingStep = rubAmountInputMissingStep(paymentAmount);
    if (amountMissingStep || amountRub === null) {
      setError(`РЎСѓРјРјР° РѕРїР»Р°С‚С‹: ${amountMissingStep ?? "СѓРєР°Р¶РёС‚Рµ СЃСѓРјРјСѓ Р±РѕР»СЊС€Рµ РЅСѓР»СЏ"}.`);
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
        [paymentFiscalReceiptIssuedAt.trim(), "РґР°С‚Р° С„РёСЃРєР°Р»СЊРЅРѕРіРѕ С‡РµРєР°"],
        [explicitFiscalFn, "Р¤Рќ"],
        [explicitFiscalFd, "Р¤Р”"],
        [explicitFiscalFpd, "Р¤РџР”"],
        [paymentPayerName, "Р¤РРћ РїР»Р°С‚РµР»СЊС‰РёРєР°"],
        [explicitPayerBirthDate, "РґР°С‚Р° СЂРѕР¶РґРµРЅРёСЏ РїР»Р°С‚РµР»СЊС‰РёРєР°"],
        [explicitPayerIdentityDocument, "РґРѕРєСѓРјРµРЅС‚ РїР»Р°С‚РµР»СЊС‰РёРєР°"],
        [paymentPayerRelation, "СЂРѕРґСЃС‚РІРѕ РїР»Р°С‚РµР»СЊС‰РёРєР°"]
      ]
        .filter(([value]) => !value)
        .map(([, label]) => label);
      if (missingTaxFields.length) {
        setError(`Р”Р»СЏ РЅР°Р»РѕРіРѕРІРѕР№ РѕРїР»Р°С‚С‹ Р·Р°РїРѕР»РЅРёС‚Рµ СЏРІРЅРѕ: ${missingTaxFields.join(", ")}. Р”Р°РЅРЅС‹Рµ РёР· РєР°СЂС‚РѕС‡РєРё РїР°С†РёРµРЅС‚Р° РЅРµ РїРѕРґСЃС‚Р°РІР»СЏСЋС‚СЃСЏ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё.`);
        return;
      }
    }
    if (explicitFiscalReceiptUrl && !/^https?:\/\/\S+$/i.test(explicitFiscalReceiptUrl)) {
      setError("РЎСЃС‹Р»РєР° РћР¤Р” РґРѕР»Р¶РЅР° РЅР°С‡РёРЅР°С‚СЊСЃСЏ СЃ http:// РёР»Рё https://");
      return;
    }
    const patientIsPayer =
      (!paymentPayerName || paymentPayerName === documentPatient.fullName) &&
      (!paymentPayerRelation || paymentPayerRelation.toLocaleLowerCase("ru-RU") === "РїР°С†РёРµРЅС‚");
    const administrativePayerInn = patientIsPayer ? documentPatient.administrativeProfile?.taxpayerInn?.trim() ?? "" : "";
    const administrativePayerDocument = patientIsPayer ? documentPatient.administrativeProfile?.identityDocument?.trim() ?? "" : "";
    const normalizedPayerInn = taxReadyPaymentRequested ? explicitPayerInn : explicitPayerInn || administrativePayerInn;
    if (normalizedPayerInn && !/^\d{10}$|^\d{12}$/.test(normalizedPayerInn)) {
      setError("РРќРќ РїР»Р°С‚РµР»СЊС‰РёРєР° РґРѕР»Р¶РµРЅ СЃРѕРґРµСЂР¶Р°С‚СЊ 10 РёР»Рё 12 С†РёС„СЂ");
      return;
    }
    setIsPaymentSaving(true);
    try {
      const documentForPayment =
        activeUsableDocuments?.find(
          (document) =>
            documentKindMetadata[document.kind].group === "payment" &&
            document.kind !== "payment_refund_correction_request" &&
            document.visitId === dashboard?.activeVisit?.id &&
            (document.totalAmountRub ?? 0) > 0
        ) ?? null;
      const paymentClientMutationId = browserGeneratedId("payment");
      const response = await fetch("/api/billing/payments", {
        method: "POST",
        headers: denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          patientId: documentPatient.id,
          visitId: dashboard?.activeVisit?.id,
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
          payerRelationship: taxReadyPaymentRequested ? paymentPayerRelation : paymentPayerRelation || "РїР°С†РёРµРЅС‚",
          taxDeductionCode: paymentTaxDeductionCode || null,
          note: "РћРїР»Р°С‚Р° РёР· СЂР°Р±РѕС‡РµРіРѕ СЌРєСЂР°РЅР° CRM"
        })
      });
      if (!response.ok) {
        setError(await responseErrorMessage(response, "РћРїР»Р°С‚Р° РЅРµ Р·Р°РїРёСЃР°РЅР°"));
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
      setPaymentPayerRelationship("РїР°С†РёРµРЅС‚");
      setPaymentTaxDeductionCode("");
      await loadDashboard();
      setPaymentFeedback(`РћРїР»Р°С‚Р° ${money(amountRub)} Р·Р°РїРёСЃР°РЅР° РґР»СЏ ${documentPatient.fullName}. Р¤РёСЃРєР°Р»СЊРЅС‹Рµ Рё РЅР°Р»РѕРіРѕРІС‹Рµ РїРѕР»СЏ РѕС‡РёС‰РµРЅС‹ РґР»СЏ СЃР»РµРґСѓСЋС‰РµРіРѕ РїР»Р°С‚РµР¶Р°.`);
      setError(null);
    } catch (paymentError) {
      setError(operatorWorkflowFailureMessage("РћРїР»Р°С‚Р° РЅРµ Р·Р°РїРёСЃР°РЅР°", paymentError));
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
    if (dashboard && task.patientId !== dashboard?.activeVisit?.patientId) {
      const taskPatientName = patientName(dashboard.patients, task.patientId);
      setError(
        `РћС‚РєСЂС‹С‚Р° С„РѕСЂРјР° В«${documentLabels[kind]}В» РґР»СЏ Р·Р°СЏРІРєРё РїР°С†РёРµРЅС‚Р° ${taskPatientName}. РџРµСЂРµРґ РІС‹РїСѓСЃРєРѕРј РґРѕРєСѓРјРµРЅС‚Р° РїРµСЂРµРєР»СЋС‡РёС‚Рµ Р°РєС‚РёРІРЅС‹Р№ РїСЂРёРµРј РЅР° СЌС‚РѕРіРѕ РїР°С†РёРµРЅС‚Р°, С‡С‚РѕР±С‹ РЅРµ СЃРѕР·РґР°С‚СЊ РґРѕРєСѓРјРµРЅС‚ РїРѕ С‚РµРєСѓС‰РµРјСѓ РІРёР·РёС‚Сѓ.`
      );
    }
  }

  async function completeCommunicationTask(taskId: string, outcome: CommunicationTaskOutcome) {
    if (communicationSavingTaskId) {
      setError("Р”РѕР¶РґРёС‚РµСЃСЊ Р·Р°РІРµСЂС€РµРЅРёСЏ С‚РµРєСѓС‰РµРіРѕ Р·Р°РєСЂС‹С‚РёСЏ Р·Р°РґР°С‡Рё СЃРІСЏР·Рё.");
      return;
    }
    if (!outcome) {
      setError("Р’С‹Р±РµСЂРёС‚Рµ РёСЃС…РѕРґ Р·Р°РґР°С‡Рё СЃРІСЏР·Рё: РЅРµС‚ РѕС‚РІРµС‚Р°, РїРµСЂРµР·РІРѕРЅРёС‚СЊ, РїРµСЂРµРЅРѕСЃ, РѕР±РµС‰Р°Р» РѕРїР»Р°С‚Сѓ РёР»Рё РІС‹РґР°С‡Р° РґРѕРєСѓРјРµРЅС‚РѕРІ.");
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
          note: communicationNote.trim() || "Р—Р°РґР°С‡Р° СЃРІСЏР·Рё Р·Р°РєСЂС‹С‚Р°."
        })
      });
      if (!response.ok) {
        setError(await responseErrorMessage(response, "Р—Р°РґР°С‡Р° СЃРІСЏР·Рё РЅРµ Р·Р°РєСЂС‹С‚Р°"));
        return;
      }
      await loadDashboard();
      setError(null);
    } catch (communicationError) {
      setError(operatorWorkflowFailureMessage("Р—Р°РґР°С‡Р° СЃРІСЏР·Рё РЅРµ Р·Р°РєСЂС‹С‚Р°", communicationError));
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
    const organizationId = dashboard?.clinicSettings?.profile?.organizationId?.trim();
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
    const organizationId = dashboard?.clinicSettings?.profile?.organizationId?.trim();
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
      if (!statusResponse.ok) throw new Error(await responseErrorMessage(statusResponse, "РЎС‚Р°С‚СѓСЃ Telegram"));
      if (!featurePlanResponse.ok) throw new Error(await responseErrorMessage(featurePlanResponse, "РџР»Р°РЅ Telegram"));
      if (!outboxResponse.ok) throw new Error(await responseErrorMessage(outboxResponse, "РћС‡РµСЂРµРґСЊ Telegram"));
      if (!linkCodesResponse.ok) throw new Error(await responseErrorMessage(linkCodesResponse, "РљРѕРґС‹ Telegram"));
      if (!chatLinksResponse.ok) throw new Error(await responseErrorMessage(chatLinksResponse, "РЎРІСЏР·Р°РЅРЅС‹Рµ Telegram-С‡Р°С‚С‹"));
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
        setError(operatorWorkflowFailureMessage("РџР°РЅРµР»СЊ СѓРїСЂР°РІР»РµРЅРёСЏ Telegram РЅРµРґРѕСЃС‚СѓРїРЅР°", telegramError));
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
      if (!response.ok) throw new Error(await responseErrorMessage(response, "РћС‡РµСЂРµРґСЊ Telegram"));
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
      setError(operatorWorkflowFailureMessage("РћС‡РµСЂРµРґСЊ Telegram РЅРµ Р·Р°РіСЂСѓР·РёР»Р°СЃСЊ", telegramError));
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
      if (!response.ok) throw new Error(await responseErrorMessage(response, "РљРѕРґС‹ Telegram"));
      const nextPage = (await response.json()) as DenteTelegramLinkCodeListResponse;
      const knownIds = new Set(telegramLinkCodes.map((code) => code.id));
      const linkCodes = [...telegramLinkCodes, ...nextPage.linkCodes.filter((code) => !knownIds.has(code.id))];
      setTelegramLinkCodes(linkCodes);
      setTelegramLinkCodeLedger({ ...nextPage, linkCodes });
    } catch (telegramError) {
      setError(operatorWorkflowFailureMessage("РљРѕРґС‹ Telegram РЅРµ Р·Р°РіСЂСѓР·РёР»РёСЃСЊ", telegramError));
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
      if (!response.ok) throw new Error(await responseErrorMessage(response, "РЎРІСЏР·Р°РЅРЅС‹Рµ Telegram-С‡Р°С‚С‹"));
      const nextPage = (await response.json()) as DenteTelegramChatLinkListResponse;
      const knownIds = new Set(telegramChatLinks.map((link) => link.id));
      const chatLinks = [...telegramChatLinks, ...nextPage.chatLinks.filter((link) => !knownIds.has(link.id))];
      setTelegramChatLinks(chatLinks);
      setTelegramChatLinkLedger({ ...nextPage, chatLinks });
    } catch (telegramError) {
      setError(operatorWorkflowFailureMessage("РЎРІСЏР·Р°РЅРЅС‹Рµ Telegram-С‡Р°С‚С‹ РЅРµ Р·Р°РіСЂСѓР·РёР»РёСЃСЊ", telegramError));
    } finally {
      setIsTelegramChatLinksLoadingMore(false);
    }
  }

  async function createTelegramLinkCode() {
    if (isTelegramLinkCreating) {
      setError("Р”РѕР¶РґРёС‚РµСЃСЊ Р·Р°РІРµСЂС€РµРЅРёСЏ С‚РµРєСѓС‰РµРіРѕ СЃРѕР·РґР°РЅРёСЏ Telegram-РєРѕРґР°.");
      return;
    }
    if (!dashboard) {
      setError("Р”Р°РЅРЅС‹Рµ РєР»РёРЅРёРєРё РµС‰Рµ РЅРµ Р·Р°РіСЂСѓР¶РµРЅС‹. РџРѕРІС‚РѕСЂРёС‚Рµ СЃРѕР·РґР°РЅРёРµ Telegram-РєРѕРґР° РїРѕСЃР»Рµ Р·Р°РіСЂСѓР·РєРё СЂР°Р±РѕС‡РµРіРѕ СЌРєСЂР°РЅР°.");
      return;
    }
    const subjectId = telegramLinkSubjectType === "patient" ? activePatient?.id : telegramLinkStaffId;
    if (!subjectId) {
      setError(
        telegramLinkSubjectType === "patient"
          ? "Р’С‹Р±РµСЂРёС‚Рµ Р°РєС‚РёРІРЅРѕРіРѕ РїР°С†РёРµРЅС‚Р° РґР»СЏ Telegram-РєРѕРґР°."
          : "Р’С‹Р±РµСЂРёС‚Рµ СЃРѕС‚СЂСѓРґРЅРёРєР° РґР»СЏ Telegram-РєРѕРґР°."
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
          organizationId: dashboard?.clinicSettings?.profile?.organizationId,
          subjectType: telegramLinkSubjectType,
          subjectId,
          clinicId: dashboard?.clinicSettings?.profile?.organizationId,
          botConfigId: telegramModeDraft === "clinic_owned_bot" ? telegramBotConfigId.trim() || undefined : undefined,
          ttlMinutes: parseTelegramLinkTtlMinutes(),
          createdByUserId: activeDoctor?.id ?? null
        })
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Telegram-РєРѕРґ РЅРµ СЃРѕР·РґР°РЅ"));
      setTelegramLinkCode((await response.json()) as DenteTelegramLinkCodeCreated);
      await loadTelegramControlPlane({ silent: true });
      setError(null);
    } catch (telegramError) {
      setError(operatorWorkflowFailureMessage("Telegram-РєРѕРґ РЅРµ СЃРѕР·РґР°РЅ", telegramError));
    } finally {
      setIsTelegramLinkCreating(false);
    }
  }

  async function copyTelegramTextToClipboard(value: string | null | undefined, label: string) {
    const text = value?.trim();
    if (!text) {
      const message = `${label} РїСѓСЃС‚РѕР№. РЎРЅР°С‡Р°Р»Р° СЃРѕР·РґР°Р№С‚Рµ РЅРѕРІС‹Р№ Telegram-РєРѕРґ РёР»Рё РїСЂРѕРІРµСЂСЊС‚Рµ РЅР°СЃС‚СЂРѕР№РєРё Р±РѕС‚Р°.`;
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
      setTelegramLinkActionState(`${label} СЃРєРѕРїРёСЂРѕРІР°РЅ`);
      setError(null);
    } catch {
      setTelegramLinkActionState(null);
      setError(`${label} РЅРµ СЃРєРѕРїРёСЂРѕРІР°РЅ. РћС‚РєСЂРѕР№С‚Рµ СЃСЃС‹Р»РєСѓ РёР»Рё РІС‹РґРµР»РёС‚Рµ РєРѕРґ РІСЂСѓС‡РЅСѓСЋ.`);
    }
  }

  function downloadTelegramQrSvg() {
    if (!telegramLinkCode?.qrSvg) {
      const message = "QR-РєРѕРґ РЅРµРґРѕСЃС‚СѓРїРµРЅ. РСЃРїРѕР»СЊР·СѓР№С‚Рµ С‚РµРєСЃС‚РѕРІС‹Р№ РєРѕРґ РёР»Рё СЃРѕР·РґР°Р№С‚Рµ РЅРѕРІС‹Р№ Telegram-РєРѕРґ.";
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
    setTelegramLinkActionState("QR-РєРѕРґ СЃРєР°С‡Р°РЅ");
    setError(null);
  }

  async function revokeTelegramChatLink(linkId: string) {
    if (telegramRevokingLinkId) {
      setError("Р”РѕР¶РґРёС‚РµСЃСЊ Р·Р°РІРµСЂС€РµРЅРёСЏ С‚РµРєСѓС‰РµРіРѕ РѕС‚Р·С‹РІР° Telegram-СЃРІСЏР·РєРё.");
      return;
    }
    setTelegramRevokingLinkId(linkId);
    try {
      const response = await fetch(`/api/telegram/chat-links/${encodeURIComponent(linkId)}/revoke${telegramOutboxActionQueryString()}`, {
        method: "POST",
        headers: telegramControlPlaneHeaders()
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "РЎРІСЏР·РєР° Telegram РЅРµ РѕС‚РѕР·РІР°РЅР°"));
      await loadTelegramControlPlane({ silent: true });
      setError(null);
    } catch (telegramError) {
      setError(operatorWorkflowFailureMessage("РЎРІСЏР·РєР° Telegram РЅРµ РѕС‚РѕР·РІР°РЅР°", telegramError));
    } finally {
      setTelegramRevokingLinkId(null);
    }
  }

  async function previewTelegramTemplate(templateKind: DenteTelegramMessagePreview["templateKind"]) {
    const isStaffPreview = templateKind === "staff_daily_digest";
    const staffId = telegramLinkStaffId || telegramLinkStaffOptions[0]?.id || "";
    if (!isStaffPreview && !activePatient) {
      setError("Р’С‹Р±РµСЂРёС‚Рµ Р°РєС‚РёРІРЅРѕРіРѕ РїР°С†РёРµРЅС‚Р° РїРµСЂРµРґ РїСЂРµРґРїСЂРѕСЃРјРѕС‚СЂРѕРј Telegram-СЃРѕРѕР±С‰РµРЅРёСЏ.");
      return;
    }
    if (isStaffPreview && !staffId) {
      setError("Р’С‹Р±РµСЂРёС‚Рµ СЃРѕС‚СЂСѓРґРЅРёРєР° РїРµСЂРµРґ РїСЂРµРґРїСЂРѕСЃРјРѕС‚СЂРѕРј Telegram-РґР°Р№РґР¶РµСЃС‚Р°.");
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
      if (!response.ok) throw new Error(await responseErrorMessage(response, "РџСЂРµРґРїСЂРѕСЃРјРѕС‚СЂ Telegram РЅРµ СЃРѕР·РґР°РЅ"));
      setTelegramPreview((await response.json()) as DenteTelegramMessagePreview);
      setError(null);
    } catch (telegramError) {
      setError(operatorWorkflowFailureMessage("РџСЂРµРґРїСЂРѕСЃРјРѕС‚СЂ Telegram РЅРµ СЃРѕР·РґР°РЅ", telegramError));
    } finally {
      setIsTelegramLoading(false);
    }
  }

  async function saveTelegramSettings(options: { silent?: boolean } = {}): Promise<boolean> {
    if (telegramPrivacyModeDraft === "consented_phi_templates") {
      const message = "Р§СѓРІСЃС‚РІРёС‚РµР»СЊРЅС‹Рµ Telegram-С€Р°Р±Р»РѕРЅС‹ Р·Р°Р±Р»РѕРєРёСЂРѕРІР°РЅС‹ РґРѕ РѕС‚РґРµР»СЊРЅРѕРіРѕ СЃРѕРіР»Р°СЃРёСЏ РїР°С†РёРµРЅС‚Р°, Р°СѓРґРёС‚Р° Рё СЃРµСЂРІРµСЂРЅРѕР№ РїРѕР»РёС‚РёРєРё PHI.";
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
      botUsername = normalizeTelegramBotUsernameDraft("РћР±С‰РёР№ Р±РѕС‚", telegramBotUsernameDraft);
      ownBotUsername = normalizeTelegramBotUsernameDraft("Р‘РѕС‚ РєР»РёРЅРёРєРё", telegramOwnBotUsernameDraft);
      webhookBaseUrl = normalizeTelegramPublicHttpsUrlDraft("РђРґСЂРµСЃ РїСЂРёРµРјР° СЃРѕРѕР±С‰РµРЅРёР№ Telegram", telegramWebhookBaseUrlDraft);
      patientPortalBaseUrl = normalizeTelegramPublicHttpsUrlDraft("РџРѕСЂС‚Р°Р» РїР°С†РёРµРЅС‚Р°", telegramPatientPortalBaseUrlDraft);
      welcomeImageUrl = normalizeTelegramPublicHttpsUrlDraft("РљР°СЂС‚РёРЅРєР° РїСЂРёРІРµС‚СЃС‚РІРёСЏ", telegramWelcomeImageUrlDraft);
      visualCardUrls = normalizeTelegramVisualCardUrlDraftsForSave(telegramVisualCardUrlDrafts);
      clinicReviewUrl = normalizeTelegramPublicHttpsUrlDraft("РЎСЃС‹Р»РєР° РЅР° РѕС‚Р·С‹РІ", telegramReviewUrlDraft);
      clinicMapsUrl = normalizeTelegramPublicHttpsUrlDraft("РЎСЃС‹Р»РєР° РЅР° РєР°СЂС‚Сѓ", telegramMapsUrlDraft);
    } catch (urlError) {
      const message = operatorReadableErrorDetailFromUnknown(urlError) ?? "РџСЂРѕРІРµСЂСЊС‚Рµ Telegram-РЅР°СЃС‚СЂРѕР№РєРё РїРµСЂРµРґ СЃРѕС…СЂР°РЅРµРЅРёРµРј.";
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
      if (!response.ok) throw new Error(await responseErrorMessage(response, "РќР°СЃС‚СЂРѕР№РєРё Telegram РЅРµ СЃРѕС…СЂР°РЅРµРЅС‹"));
      setTelegramStatus((await response.json()) as DenteTelegramBotStatus);
      setTelegramSettingsDirty(false);
      setTelegramSettingsSaveState("saved");
      await loadTelegramControlPlane({ silent: true });
      setError(null);
      return true;
    } catch (telegramError) {
      const message = operatorWorkflowFailureMessage("РќР°СЃС‚СЂРѕР№РєРё Telegram РЅРµ СЃРѕС…СЂР°РЅРµРЅС‹", telegramError);
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
      setError("Р”РѕР¶РґРёС‚РµСЃСЊ Р·Р°РІРµСЂС€РµРЅРёСЏ С‚РµРєСѓС‰РµР№ РѕС‚РїСЂР°РІРєРё Telegram.");
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
      if (!response.ok) throw new Error(await responseErrorMessage(response, "РЎРѕРѕР±С‰РµРЅРёРµ Telegram РЅРµ РѕС‚РїСЂР°РІР»РµРЅРѕ"));
      const result = (await response.json()) as DenteTelegramOutboxSendResponse;
      if (result.status === "blocked" || result.status === "failed") {
        const warning = result.warnings?.[0] ? telegramHumanMessage(result.warnings?.[0]) : "";
        const reason = telegramHumanMessage(result.blockedReason) || warning;
        setError(`РћС‚РїСЂР°РІРєР° Telegram Р·Р°Р±Р»РѕРєРёСЂРѕРІР°РЅР°${reason ? `: ${reason}` : ""}`);
        await loadTelegramControlPlane({ silent: true });
        return;
      }
      setError(null);
      await loadTelegramControlPlane({ silent: true });
      if (result.status === "sent") await loadDashboard();
    } catch (telegramError) {
      setError(operatorWorkflowFailureMessage("РЎРѕРѕР±С‰РµРЅРёРµ Telegram РЅРµ РѕС‚РїСЂР°РІР»РµРЅРѕ", telegramError));
    } finally {
      setTelegramSendingItemId(null);
    }
  }

  async function sendDueTelegramOutbox() {
    if (isTelegramSendingDue || telegramSendingItemId) {
      setError("Р”РѕР¶РґРёС‚РµСЃСЊ Р·Р°РІРµСЂС€РµРЅРёСЏ С‚РµРєСѓС‰РµР№ РѕС‚РїСЂР°РІРєРё Telegram.");
      return;
    }
    if (!telegramOutbox?.dueCount) {
      setError("Telegram: РіРѕС‚РѕРІС‹С… СЃРѕРѕР±С‰РµРЅРёР№ Рє РѕС‚РїСЂР°РІРєРµ РЅРµС‚.");
      return;
    }
    setIsTelegramSendingDue(true);
    try {
      const response = await fetch(`/api/telegram/outbox/send-due${telegramOutboxActionQueryString()}`, {
        method: "POST",
        headers: telegramControlPlaneHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ dryRun: false, limit: 25 })
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Р“РѕС‚РѕРІС‹Рµ Telegram-СЃРѕРѕР±С‰РµРЅРёСЏ РЅРµ РѕС‚РїСЂР°РІР»РµРЅС‹"));
      const result = (await response.json()) as DenteTelegramOutboxSendDueResponse;
      await loadTelegramControlPlane({ silent: true });
      if (result.sentCount > 0) await loadDashboard();
      setError(result.sentCount > 0 ? `Telegram: РѕС‚РїСЂР°РІР»РµРЅРѕ ${result.sentCount}, РїСЂРѕРІРµСЂРµРЅРѕ ${result.attemptedCount}.` : "Telegram: РіРѕС‚РѕРІС‹С… СЃРѕРѕР±С‰РµРЅРёР№ Рє РѕС‚РїСЂР°РІРєРµ РЅРµС‚.");
    } catch (telegramError) {
      setError(operatorWorkflowFailureMessage("Р“РѕС‚РѕРІС‹Рµ Telegram-СЃРѕРѕР±С‰РµРЅРёСЏ РЅРµ РѕС‚РїСЂР°РІР»РµРЅС‹", telegramError));
    } finally {
      setIsTelegramSendingDue(false);
    }
  }

  async function createImagingStudy(kind: ImagingStudyKind) {
    if (imagingCreateSavingKind) {
      setError("Р”РѕР¶РґРёС‚РµСЃСЊ Р·Р°РІРµСЂС€РµРЅРёСЏ С‚РµРєСѓС‰РµРіРѕ РґРѕР±Р°РІР»РµРЅРёСЏ СЃРЅРёРјРєР°.");
      return;
    }
    if (!activePatient || !dashboard) {
      setError("Р’С‹Р±РµСЂРёС‚Рµ РїР°С†РёРµРЅС‚Р° Рё Р°РєС‚РёРІРЅС‹Р№ РїСЂРёРµРј РїРµСЂРµРґ РґРѕР±Р°РІР»РµРЅРёРµРј СЃРЅРёРјРєР°.");
      return;
    }
    const titles: Record<ImagingStudyKind, string> = {
      periapical: "РџСЂРёС†РµР»СЊРЅС‹Р№ 36",
      bitewing: "РРЅС‚РµСЂРїСЂРѕРєСЃРёРјР°Р»СЊРЅС‹Р№ РєРѕРЅС‚СЂРѕР»СЊ",
      opg: "РћРџРўР“",
      ceph: "РўР Р“ Р±РѕРєРѕРІР°СЏ",
      cbct: "РљР›РљРў / РљРў",
      photo: "Р¤РѕС‚Рѕ РїРѕР»РѕСЃС‚Рё СЂС‚Р°",
      other: "РЎРЅРёРјРѕРє"
    };
    setImagingCreateSavingKind(kind);
    try {
      const response = await fetch("/api/imaging/studies", {
        method: "POST",
        headers: denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          patientId: activePatient.id,
          visitId: dashboard?.activeVisit?.id,
          kind,
          title: titles[kind],
          toothCode: kind === "periapical" ? "36" : null,
          region: kind === "opg" || kind === "cbct" ? "РѕР±Рµ С‡РµР»СЋСЃС‚Рё" : kind === "ceph" ? "РїСЂРѕС„РёР»СЊ С‡РµСЂРµРїР°" : "С‚РµРєСѓС‰РёР№ РїСЂРёРµРј",
          sourceKind: kind === "cbct" || kind === "opg" || kind === "ceph" ? "dicom_file" : "sensor_bridge",
          sourceName: kind === "cbct" || kind === "opg" || kind === "ceph" ? "РРјРїРѕСЂС‚ РљРў/СЃРЅРёРјРєРѕРІ" : "Р›РѕРєР°Р»СЊРЅС‹Р№ RVG-РґР°С‚С‡РёРє",
          aiSummary: "Р§РµСЂРЅРѕРІРёРє: СЃРЅРёРјРѕРє РґРѕР±Р°РІР»РµРЅ РІ РєР°СЂС‚Сѓ. РћРїРёСЃР°РЅРёРµ С‚СЂРµР±СѓРµС‚ РїСЂРѕРІРµСЂРєРё РІСЂР°С‡Р°."
        })
      });
      if (!response.ok) {
        setError(await responseErrorMessage(response, "РЎРЅРёРјРѕРє РЅРµ РґРѕР±Р°РІР»РµРЅ"));
        return;
      }
      const createdStudy = (await response.json()) as { id?: string; kind?: ImagingStudyKind };
      await loadDashboard();
      if (createdStudy.kind) setImagingKindFilter(createdStudy.kind);
      if (createdStudy.id) setSelectedImagingStudyId(createdStudy.id);
      setError(null);
    } catch (imagingError) {
      setError(operatorWorkflowFailureMessage("РЎРЅРёРјРѕРє РЅРµ РґРѕР±Р°РІР»РµРЅ", imagingError));
    } finally {
      setImagingCreateSavingKind(null);
    }
  }

  const imagingViewerSaveTitle: Record<ImagingViewerSaveState, string> = {
    idle: "РЎРµСЃСЃРёСЏ РїСЂРѕСЃРјРѕС‚СЂР°",
    local: "Р›РѕРєР°Р»СЊРЅС‹Р№ С‡РµСЂРЅРѕРІРёРє СЃРѕС…СЂР°РЅРµРЅ",
    saving: "РЎРѕС…СЂР°РЅСЏСЋ РїСЂРѕСЃРјРѕС‚СЂ",
    saved: "РџСЂРѕСЃРјРѕС‚СЂ СЃРѕС…СЂР°РЅРµРЅ",
    queued: isOnline ? "РџРѕРІС‚РѕСЂ СЃРµСЂРІРµСЂРЅРѕРіРѕ СЃРѕС…СЂР°РЅРµРЅРёСЏ РІ РѕС‡РµСЂРµРґРё" : "РћС„Р»Р°Р№РЅ-С‡РµСЂРЅРѕРІРёРє СЃРѕС…СЂР°РЅРµРЅ",
    error: "РЎРѕС…СЂР°РЅРµРЅРёРµ С‚СЂРµР±СѓРµС‚ РїСЂРѕРІРµСЂРєРё"
  };
  const imagingViewerSaveDetail = [
    `${imagingViewerAnnotations.length} СЂР°Р·РјРµС‚РѕРє`,
    imagingViewerLocalSavedAt ? `Р»РѕРєР°Р»СЊРЅРѕ ${formatTime(imagingViewerLocalSavedAt)}` : "Р»РѕРєР°Р»СЊРЅРѕ РѕР¶РёРґР°РµС‚",
    imagingViewerSession?.serverSavedAt ? `СЃРµСЂРІРµСЂ ${formatTime(imagingViewerSession.serverSavedAt)}` : "СЃРµСЂРІРµСЂ РѕР¶РёРґР°РµС‚",
    imagingViewerSaveError
  ]
    .filter(Boolean)
    .join(" В· ");
  const canRetryImagingViewerSave =
    imagingViewerSessionReady && Boolean(selectedImagingStudy?.id) && (imagingViewerSaveState === "queued" || imagingViewerSaveState === "error");
  const imagingViewerNoteText = imagingViewerNote.trim();
  const imagingViewerNoteReady = imagingViewerNoteText.length > 0;
  const imagingViewerNoteMissingId = "imaging-viewer-note-missing";
  const imagingViewerRetryMissingId = "imaging-viewer-retry-missing";
  const imagingPreviewSource = (study: Dashboard["imagingStudies"][number]) => imagingPreviewObjectUrls[study.id] ?? study.previewUrl;
  const imagingViewerHref = (study: Dashboard["imagingStudies"][number]) => imagingPreviewObjectUrls[study.id] ?? study.viewerUrl ?? study.previewUrl;



  const activeWorkspaceProfile =
    dashboard?.clinicSettings?.workspaceProfiles?.find((profile) => profile.mode === dashboard?.clinicSettings?.profile?.mode) ??
    dashboard?.clinicSettings?.workspaceProfiles?.[0];
  const settingsAdminSecretDomain: AdminSecretUnlockDomain = settingsTab === "telegram" ? "telegram" : "settings";
  const activeRolePolicy =
    dashboard?.clinicSettings?.roleAccessPolicies?.find((policy) => policy.role === selectedWorkspaceRole) ??
    dashboard?.clinicSettings?.roleAccessPolicies?.find((policy) => policy.role === "doctor") ??
    dashboard?.clinicSettings?.roleAccessPolicies?.[0];
  const activeQueueRole: StaffRole = selectedWorkspaceRole === "owner" ? "manager" : selectedWorkspaceRole;
  const activeRoleQueue =
    dashboard?.shiftIntelligence?.roleQueues?.find((queue) => queue.role === activeQueueRole) ?? dashboard?.shiftIntelligence?.roleQueues?.[0];
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
  const legalMissingFields = dashboard ? clinicLegalMissingFields(dashboard?.clinicSettings?.profile) : [];
  const legalReadinessPercent = dashboard ? clinicLegalReadinessPercent(dashboard?.clinicSettings?.profile) : 0;
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
  const selectedUiLanguageOption = uiLanguageOptions?.find((option) => option.value === uiLanguage) ?? defaultUiLanguageOption;
  const showAdministrationTopActions =
    currentView === "settings" ||
    selectedWorkspaceRole === "administrator" ||
    selectedWorkspaceRole === "manager" ||
    selectedWorkspaceRole === "owner";
  const showDoctorVisitShortcut = selectedWorkspaceRole === "doctor" && currentView !== "visit";

  const serviceTitle = (serviceId: string) => dashboard.serviceCatalog?.find((service) => service.id === serviceId)?.title ?? serviceId;
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
    operatorWorkflowFailureMessage
  };
}








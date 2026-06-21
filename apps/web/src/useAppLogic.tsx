// @ts-nocheck
import { useFinanceLogic } from "./hooks/useFinanceLogic";
import { useVisitLogic } from "./hooks/useVisitLogic";
import { useDocumentLogic } from "./hooks/useDocumentLogic";
import { useImagingLogic } from "./hooks/useImagingLogic";
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
  toothStateByCode,
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
  settingsTabFromHash
} from "./AppHelpers";


export function useAppLogic(): any {
  const financeLogic = useFinanceLogic();
  const visitLogic = useVisitLogic();
  const documentLogic = useDocumentLogic();
  const imagingLogic = useImagingLogic();

  
  
  const initialTelegramHandoffTargetRef = useRef<DenteTelegramHandoffTarget | null>(readDenteTelegramHandoffTarget());
  const initialUiPreferencesRef = useRef<UiPreferences | null>(null);
  const uiPreferencesServerReadyRef = useRef(false);
  const uiPreferencesHydratedRef = useRef(false);
  const pendingUiPreferencesSyncRef = useRef<UiPreferences | null>(null);
  const uiPreferencesSyncInFlightRef = useRef(false);
  const uiPreferencesRetryTimerRef = useRef<number | null>(null);
  
  const clinicProfileDraftHydratedRef = useRef(false);
  const clinicProfileDraftRef = useRef<ClinicProfileDraft>(emptyClinicProfileDraft());
  const patientCoreDraftRef = useRef<PatientCoreDraft>(emptyPatientCoreDraft());
  const releaseSourceRequestAutofillRef = useRef<string | null>(null);
  
  
  const outpatient025uDraftHydratedKeyRef = useRef<string | null>(null);
  
  
  
  const onboardingDismissalHydratedOrganizationIdRef = useRef<string | null>(null);
  
  if (initialUiPreferencesRef.current === null) {
    initialUiPreferencesRef.current = loadUiPreferences();
  }
  
  const initialUiPreferences = initialUiPreferencesRef.current ?? defaultUiPreferences;
  
  const initialTelegramHandoffTarget = initialTelegramHandoffTargetRef.current;
  const initialRecognitionText =
    recognitionPresets.find(
      (preset) => preset.kind === initialUiPreferences.recognitionKind && preset.target === initialUiPreferences.recognitionTarget
    )?.text ??
    recognitionPresets[0]?.text ??
    "";
  
  
      

  

  
  

  
  
  
  
  
  
  
  
  const browserMigrationInputRef = useRef<HTMLInputElement | null>(null);
  
  const browserMigrationScanAbortRef = useRef<AbortController | null>(null);
  
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  
  
  
  
  
  
  
  
  
  
  const patientAdministrativeProfileDraftRef = useRef<PatientAdministrativeProfileDraft>(emptyPatientAdministrativeProfileDraft());
  const staffScheduleDraftsRef = useRef<Record<string, StaffScheduleDraft>>({});
  const chairScheduleDraftsRef = useRef<Record<string, StaffScheduleDraft>>({});
  
  
  

  function markTelegramSettingsDirty() {
    setTelegramSettingsDirty(true);
    setTelegramSettingsSaveState("idle");
    setTelegramSettingsSaveError(null);
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

  

  

  

  

  

  

  

  

  

  async function saveClinicProfileIfDirty(): Promise<boolean> {
    if (!clinicProfileDirty) return true;
    return saveClinicProfileFromDraft();
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
      dashboard?.clinicSettings.profile.organizationId ?? null
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

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  
  
  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  
  
  
  
  

  

  

  

  

  

  

  

  

  

  

  

  

  const visibleTelegramOutboxItems = filteredTelegramOutboxItems;
  const hiddenTelegramOutboxItemCount = Math.max(
    0,
    (telegramOutbox?.filteredCount ?? filteredTelegramOutboxItems.length) - visibleTelegramOutboxItems.length
  );

  

  
  const previousTelegramLinkTargetKeyRef = useRef(telegramLinkTargetKey);

  

  

  

  const patientInsightById = useMemo(() => {
    if (!dashboard) return new Map<string, Dashboard["patientInsights"][number]>();
    return new Map(dashboard.patientInsights.map((insight) => [insight.patientId, insight]));
  }, [dashboard]);

  
  
  

  

  const filteredPatients = useMemo(() => {
    if (!dashboard) return [];
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return dashboard.patients;
    return dashboard.patients.filter((patient) => {
      return `${patient.fullName} ${patient.phone ?? ""}`.toLowerCase().includes(normalizedQuery);
    });
  }, [dashboard, query]);

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  
  

  

  
  
  

  
  
  
  
  
  
  
  

  
  
  
  
  
  
  
  
  
  
  

  

  
  
  
  
  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  const sortedCommunicationTasks = useMemo(() => {
    if (!dashboard) return [];
    return [...dashboard.communicationTasks].sort((left, right) => {
      const priorityRank = { urgent: 0, high: 1, normal: 2, low: 3 } as const;
      return priorityRank[left.priority] - priorityRank[right.priority] || left.dueAt.localeCompare(right.dueAt);
    });
  }, [dashboard]);

  

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  
  const shiftWarnings = dashboard?.shiftIntelligence.scheduleWarnings ?? [];
  
  const mostLoadedResource = allResourceLoads.slice().sort((left, right) => right.utilizationPercent - left.utilizationPercent)[0] ?? null;

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
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
  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  function chooseRecognitionPreset(preset: (typeof recognitionPresets)[number]) {
    setRecognitionKind(preset.kind);
    setRecognitionTarget(preset.target);
    setRecognitionText(preset.text);
    setRecognitionJob(null);
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

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  function installmentScheduleRemainingRubValue(): number {
    return Math.max(0, installmentScheduleTotalRubValue() - installmentSchedulePrepaidRubValue());
  }

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  function appendTelegramRuntimeScopeParams(params: URLSearchParams): URLSearchParams {
    const organizationId = dashboard?.clinicSettings.profile.organizationId?.trim();
    const botConfigId = telegramBotConfigId.trim();
    if (telegramModeDraft === "clinic_owned_bot" && organizationId && botConfigId) {
      params.set("organizationId", organizationId);
      params.set("botConfigId", botConfigId);
    }
    return params;
  }

  

  

  

  function telegramStatusEndpoint(): string {
    const organizationId = dashboard?.clinicSettings.profile.organizationId?.trim();
    const botConfigId = telegramBotConfigId.trim();
    if (telegramModeDraft === "clinic_owned_bot" && organizationId && botConfigId) {
      return `/api/telegram/status/${encodeURIComponent(organizationId)}/${encodeURIComponent(botConfigId)}`;
    }
    return "/api/telegram/status";
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
            setError(operatorWorkflowFailureMessage("Не удалось загрузить данные клиники", loadError));
          });
        }}
      />
    );
  }

  

  
  const settingsAdminSecretDomain: AdminSecretUnlockDomain = settingsTab === "telegram" ? "telegram" : "settings";
  
  
  
  
  
  
  
  
  const visibleScheduleSuggestions = (roleScheduleSuggestions.length ? roleScheduleSuggestions : dashboard.scheduleSuggestions).slice(0, 3);
  const legalMissingFields = clinicLegalMissingFields(dashboard.clinicSettings.profile);
  const legalReadinessPercent = clinicLegalReadinessPercent(dashboard.clinicSettings.profile);
  
  
  
  const onboardingTelegramRecommendations = buildOnboardingTelegramRecommendations();
  
  
  const newStaffReadyToCreate = newStaffName.trim().length > 0;
  const newChairReadyToCreate = newChairName.trim().length > 0;
  const onboardingStaffCreateGuidanceId = "onboarding-staff-create-guidance";
  const onboardingChairCreateGuidanceId = "onboarding-chair-create-guidance";
  const onboardingFinishGuidanceId = "onboarding-finish-guidance";
  const currentOnboardingIndex = Math.max(0, onboardingSteps.findIndex((step) => step.id === onboardingStep));
  const previousOnboardingStep = currentOnboardingIndex > 0 ? onboardingSteps[currentOnboardingIndex - 1] : null;
  const nextOnboardingStep = currentOnboardingIndex < onboardingSteps.length - 1 ? onboardingSteps[currentOnboardingIndex + 1] : null;
  const showFullOnboardingGuide = !onboardingDismissed && currentView === "settings" && settingsTab === "clinic" && onboardingGuideExpanded;
  
  
  

  const serviceTitle = (serviceId: string) => dashboard.serviceCatalog.find((service) => service.id === serviceId)?.title ?? serviceId;
  

  return {
  ...financeLogic,
  ...visitLogic,
  ...imagingLogic,
  ...documentLogic,
    AlertTriangle,
    AppLoadingState,
    ArrowRight,
    Bot,
    CalendarDays,
    Check,
    CheckCircle2,
    ClinicalRulePanel,
    ClipboardCheck,
    CommunicationsView,
    CtPlanningToolsPanel,
    DocumentIngestionTarget,
    DocumentsView,
    ExternalLink,
    FinanceView,
    FlipHorizontal,
    ImageIcon,
    ImagingView,
    ImportSourceKind,
    MarketingView,
    Mic,
    PatientCockpit,
    PatientsView,
    Plus,
    PricelistSourceKind,
    RefreshCw,
    RotateCcw,
    RotateCw,
    ScheduleView,
    SettingsView,
    ShieldCheck,
    ShiftView,
    SmartImportMode,
    Sparkles,
    Suspense,
    VisitView,
    WorkspaceContinuityStrip,
    WorkspaceRouteErrorBoundary,
    WorkspaceSidebar,
    WorkspaceTopbar,
    ZoomIn,
    ZoomOut,
CallablePhone,
HasCallablePhone,
Insight,
    addMigrationDiscoveryCandidateToSmartImport,
    appointmentLabels,
    appointmentReadinessLabels,
    cancelBrowserMigrationScan,
    chooseRecognitionPreset,
    clinicModeLabels,
    clinicalRuleActionLabels,
    clinicalRuleSeverityLabels,
    commitImport,
    communicationChannelLabels,
    communicationDocumentTaskActionLabels,
    communicationIntentLabels,
    communicationPriorityLabels,
    communicationStatusLabels,
    continueOnboardingInDraftMode,
    currentOnboardingIndex,
    dentalMaterialKindLabels,
    dentalRestorationTypeLabels,
    describeMprClinicalPresetProjectionFallback,
    dicomDiagnosticPixelPolicyLabels,
    dicomExecutionLaneLabels,
    dicomFirstFrameStatusLabels,
    dicomFolderWorkupPathLabels,
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
    discoverMigrationSources,
    dismissOnboarding,
    documentActionLabels,
    documentDetectedKindLabel,
    documentFactoryGroups,
    documentIssueSignatureModeLabels,
    documentSourceStatusClassNames,
    documentStatusLabels,
    documentVoidReasonLabels,
    filteredPatients,
    formatByteSize,
    formatShortDate,
    formatSignedMprStep,
    goToVisitDictation,
    hiddenTelegramOutboxItemCount,
    imagingConnectorCards,
    imagingSourceChoices,
    imagingSourceDetails,
    imagingSourceLabels,
    imagingViewerCapabilities,
    imagingViewerToolLabels,
    importSourceLabels,
    ingestionTargetLabels,
    integrationCapabilityLabels,
    integrationCategoryLabels,
    integrationStatusLabels,
    legalMissingFields,
    legalReadinessPercent,
    loadMoreTelegramOutbox,
    localBridgeStatusLabels,
    localBridgeStatusState,
    localBridgeStatusValue,
    localBridgeUsePathLabels,
    localImagingModelRoleLabels,
    lockTelegramAdminSession,
    mostLoadedResource,
    moveOnboardingTo,
    mprAxisBounds,
    mprAxisNudgeDeg,
    mprAxisPresetDeg,
    mprCacheModeLabels,
    mprLoadStrategyLabels,
    mprResourceTierLabels,
    mprSeriesRequiredProjectionLabel,
    mprSlabBounds,
    mprSlabNudgeMm,
    mprSlabPresetMm,
    mprSliceNudgeSteps,
    mprSlicePresetFractions,
    mprToolLabels,
    mprUnavailableProjectionLabel,
    newChairReadyToCreate,
    newStaffReadyToCreate,
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
    onboardingChairCreateGuidanceId,
    onboardingDocumentsReady,
    onboardingFinishGuidanceId,
    onboardingStaffCreateGuidanceId,
    onboardingTelegramRecommendations,
    onboardingTelegramVisualCardKeys,
    openOnboardingGuide,
    patientInsightRiskLabels,
    patientIntakePregnancyStatusOptions,
    paymentFiscalReceiptLabelForUi,
    photoVideoMaterialOptions,
    planMigrationDiscoveryCandidate,
    policyAuditEventLabels,
    preloadWorkspaceView,
    previewImport,
    previewMigrationDiscoveryCandidate,
    previewSmartImport,
    previousOnboardingStep,
    pricelistItemMaterialText,
    pricelistMaterialSummaryText,
    pricelistParserModeLabels,
    pricelistRecognitionBrandGroups,
    pricelistRecognitionServiceGroups,
    pricelistWarningsText,
    procedureSpecificConsentProcedureOptions,
    recognitionPresets,
    recommendedActionPriorityLabels,
    reopenOnboarding,
    roleFocusOrder,
    scenarioPriorityLabels,
    scenarioStrategyLabels,
    serviceCategoryLabels,
    serviceTitle,
    settingsAdminSecretDomain,
    shiftWarnings,
    showFullOnboardingGuide,
    sortedCommunicationTasks,
    specialtyLabels,
    speechProviderConnectorLabels,
    speechProviderHealthLabels,
    speechProviderModeLabels,
    speechProviderSelectionLabels,
    speechProviderStatusLabels,
    speechRecordingPathLabels,
    speechRecoveryStateLabels,
    taxApplicationDeliveryChannelOptions,
    taxApplicationFormOptions,
    taxApplicationRelationshipOptions,
    telegramClassificationLabels,
    telegramDeliveryStatusLabels,
    telegramFeatureHelp,
    telegramFeatureLabel,
    telegramFeatureOptions,
    telegramInlineButtonKindLabels,
    telegramInlineButtonRowsFromReplyMarkup,
    telegramModeHints,
    telegramModeLabels,
StatusFilter,
StatusFilterOptions,
TemplateFilter,
TemplateFilterOptions,
    telegramPrivacyModeHints,
    telegramPrivacyModeLabels,
    telegramQrSvgToDataUrl,
    telegramTemplateLabels,
    telegramVisualCardFields,
    toggleChairWorkingDay,
    toggleClinicWorkingDay,
    toggleStaffWorkingDay,
    toothRows,
    toothStateByCode,
    treatmentStatusLabels,
    unlockTelegramAdminSession,
    updateChairScheduleDay,
    updateChairScheduleDraft,
    updateClinicProfileDraft,
    updatePatientAdministrativeProfileDraft,
    updatePatientCoreDraft,
    updateStaffScheduleDay,
    updateStaffScheduleDraft,
    viewLabels,
    visibleScheduleSuggestions,
    visibleTelegramOutboxItems,
    visitDraftMissingFieldLabel,
    visitDraftQualityLabels,
    visitDraftSignalLabel,
    visitSaveReceiptText,
    warningSeverityLabels,
    weekdayOptions,
    workspaceScopeLabels,
    xrayPregnancyStatusOptions,
    xrayStudyTypeOptions
  };
}

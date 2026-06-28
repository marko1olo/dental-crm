import { useAppLogic } from './useAppLogic';

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
import { ActionIcon, appViews, getFilteredAppViews, viewLabels, WorkspaceSidebar, WorkspaceTopbar } from "./workspaceShell";
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
const ImagingView = lazy(() => import("./ImagingView").then((module) => ({ default: module.ImagingView })));
const VisitView = lazy(() => import("./VisitView").then((module) => ({ default: module.VisitView })));
const FinanceView = lazy(() => import("./FinanceView").then((module) => ({ default: module.FinanceView })));
const CommunicationsView = lazy(() => import("./CommunicationsView").then((module) => ({ default: module.CommunicationsView })));
const DocumentsView = lazy(() => import("./DocumentsView").then((module) => ({ default: module.DocumentsView })));
const SettingsView = lazy(() => import("./SettingsView").then((module) => ({ default: module.SettingsView })));
const ScheduleView = lazy(() => import("./ScheduleView").then((module) => ({ default: module.ScheduleView })));
const PatientsView = lazy(() => import("./PatientsView").then((module) => ({ default: module.PatientsView })));
const ShiftView = lazy(() => import("./ShiftView").then((module) => ({ default: module.ShiftView })));
const PatientCockpit = lazy(() => import("./ShiftView").then((module) => ({ default: module.PatientCockpit })));
const MarketingView = lazy(() => import("./MarketingView").then((module) => ({ default: module.MarketingView })));

function speechGatewayCanUpload(status: SpeechGatewayStatus | null): boolean {
  return Boolean(status?.serverTranscriptionCurrentlyAvailable ?? status?.serverTranscriptionEnabled);
}

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

export function App() {
  // Topbar dictation shortcut must open the visit dictation area: goToVisitDictation, scrollToVisitArea(".dictation-box")
  
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
  handleFinishOnboarding
} = useAppLogic();

  useEffect(() => scheduleIdleWorkspacePreload(currentView), [currentView]);

  const [resetting, setResetting] = useState(false);

  if (!onboardingDismissed) {
    return (
      <main className="app-shell onboarding-fullscreen" style={{ display: "flex", flexDirection: "column", minHeight: "100vh", padding: "40px 20px", background: "linear-gradient(135deg, #0d9488 0%, #111827 100%)", overflowY: "auto" }}>
        <section className="workspace onboarding-only-workspace" id="workspace-content" style={{ maxWidth: "800px", width: "100%", margin: "auto", padding: "0", background: "none", boxShadow: "none" }}>
          <section className="onboarding-shell" aria-label="Первичная настройка клиники" style={{ width: "100%", background: "#ffffff", borderRadius: "16px", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)", padding: "32px", border: "1px solid #e5e7eb" }}>
            
            {/* Onboarding Header */}
            <div className="onboarding-head" style={{ borderBottom: "1px solid #f3f4f6", paddingBottom: "20px", marginBottom: "24px" }}>
              <div>
                <p className="eyebrow" style={{ textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.05em", color: "#0d9488", fontWeight: "600" }}>Первый запуск</p>
                <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#111827", marginTop: "4px" }}>Быстрая настройка CRM Dente</h2>
              </div>
            </div>

            {/* Step list if not intro */}
            {onboardingStep !== "intro" ? (
              <div className="wizard-step-list" style={{ display: "flex", gap: "12px", marginBottom: "32px" }}>
                {onboardingSteps.map((step, index) => (
                  <div
                    key={step.id}
                    style={{
                      flex: "1",
                      padding: "10px",
                      borderRadius: "8px",
                      background: step.id === onboardingStep ? "#f0fdfa" : "#f9fafb",
                      border: "1px solid",
                      borderColor: step.id === onboardingStep ? "#0d9488" : "#e5e7eb",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px"
                    }}
                  >
                    <span style={{ fontSize: "11px", color: step.id === onboardingStep ? "#0d9488" : "#6b7280", fontWeight: "600" }}>Шаг {index + 1}</span>
                    <strong style={{ fontSize: "14px", color: step.id === onboardingStep ? "#0f766e" : "#374151" }}>{step.title}</strong>
                    <span style={{ fontSize: "11px", color: "#6b7280" }}>{step.detail}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Intro Step */}
            {onboardingStep === "intro" ? (
              <div className="onboarding-panel" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div>
                  <h3 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px" }}>Режим запуска приложения</h3>
                  <p style={{ color: "#4b5563" }}>
                    Выберите, в каком режиме вы хотите запустить CRM. Для быстрого тестирования используйте демо-режим, для реальной работы — чистый запуск.
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <button
                    type="button"
                    onClick={async () => {
                      setResetting(true);
                      await handleSelectDemoMode();
                      setResetting(false);
                    }}
                    disabled={resetting}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      textAlign: "left",
                      padding: "20px",
                      background: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
                      border: "2px solid #38bdf8",
                      borderRadius: "12px",
                      cursor: "pointer",
                      transition: "transform 0.2s, box-shadow 0.2s"
                    }}
                  >
                    <span style={{ fontSize: "28px", marginBottom: "12px" }}>🚀</span>
                    <strong style={{ fontSize: "16px", color: "#0369a1", marginBottom: "6px" }}>Попробовать демо-режим</strong>
                    <span style={{ fontSize: "13px", color: "#0c4a6e" }}>
                      Запустить систему с готовыми демонстрационными данными (тестовые пациенты, расписание, приемы и оплаты), чтобы быстро ознакомиться с возможностями.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      setResetting(true);
                      await handleSelectZeroMode();
                      setResetting(false);
                    }}
                    disabled={resetting}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      textAlign: "left",
                      padding: "20px",
                      background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                      border: "2px solid #4ade80",
                      borderRadius: "12px",
                      cursor: "pointer",
                      transition: "transform 0.2s, box-shadow 0.2s"
                    }}
                  >
                    <span style={{ fontSize: "28px", marginBottom: "12px" }}>✨</span>
                    <strong style={{ fontSize: "16px", color: "#15803d", marginBottom: "6px" }}>Начать с чистого листа</strong>
                    <span style={{ fontSize: "13px", color: "#14532d" }}>
                      Полностью пустая база данных для настройки клиники с нуля. Вы сможете ввести свои данные, добавить врачей и кабинеты шаг за шагом.
                    </span>
                  </button>
                </div>
              </div>
            ) : null}

            {/* Clinic step */}
            {onboardingStep === "clinic" ? (
              <div className="onboarding-panel" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "6px" }}>О клинике</h3>
                  <p style={{ color: "#4b5563" }}>Название и телефон понадобятся для генерации договоров и медицинских карт.</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>Название клиники</label>
                    <input
                      id="onboarding-clinic-name"
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "15px" }}
                      value={clinicProfileDraft.clinicName}
                      onChange={(event) => updateClinicProfileDraft("clinicName", event.target.value)}
                      placeholder="Стоматология..."
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>Телефон для связи</label>
                    <input
                      id="onboarding-clinic-phone"
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "15px" }}
                      value={clinicProfileDraft.phone}
                      onChange={(event) => updateClinicProfileDraft("phone", event.target.value)}
                      placeholder="89..."
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {/* Team step */}
            {onboardingStep === "team" ? (
              <div className="onboarding-panel" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "6px" }}>Ваша роль и данные</h3>
                  <p style={{ color: "#4b5563" }}>Укажите свою рабочую роль в клинике и личные данные для настройки интерфейса.</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>Ваша рабочая роль</label>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {roleFocusOrder.map((role) => (
                        <button
                          className={selectedWorkspaceRole === role ? "active" : ""}
                          key={role}
                          type="button"
                          aria-pressed={selectedWorkspaceRole === role}
                          onClick={() => setSelectedWorkspaceRole(role)}
                          style={{
                            padding: "8px 16px",
                            borderRadius: "20px",
                            border: "1px solid",
                            borderColor: selectedWorkspaceRole === role ? "#0d9488" : "#d1d5db",
                            background: selectedWorkspaceRole === role ? "#0d9488" : "#ffffff",
                            color: selectedWorkspaceRole === role ? "#ffffff" : "#374151",
                            fontWeight: "500",
                            cursor: "pointer"
                          }}
                        >
                          {staffRoleLabels[role]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>
                      {selectedWorkspaceRole === "owner" ? "ФИО владельца клиники" :
                       selectedWorkspaceRole === "doctor" ? "ФИО врача" :
                       selectedWorkspaceRole === "administrator" ? "ФИО администратора" :
                       selectedWorkspaceRole === "assistant" ? "ФИО ассистента" :
                       "ФИО сотрудника"}
                    </label>
                    <input
                      id="onboarding-staff-name"
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "15px" }}
                      value={newStaffName}
                      onChange={(event) => setNewStaffName(event.target.value)}
                      placeholder="Иванов Иван Иванович"
                    />
                  </div>
                  {(selectedWorkspaceRole === "doctor" || selectedWorkspaceRole === "assistant") && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>Название кабинета/кресла</label>
                      <input
                        id="onboarding-chair-name"
                        style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "15px" }}
                        value={newChairName}
                        onChange={(event) => setNewChairName(event.target.value)}
                        placeholder="Кабинет терапевта"
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Done step */}
            {onboardingStep === "done" ? (
              <div className="onboarding-panel" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <h3 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px" }}>Все готово к запуску!</h3>
                  <p style={{ color: "#4b5563" }}>
                    Проверьте параметры перед открытием рабочей смены. Вы сможете изменить любые настройки позже.
                  </p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: (selectedWorkspaceRole === "doctor" || selectedWorkspaceRole === "assistant") ? "1fr 1fr" : "1fr", gap: "16px", background: "#f9fafb", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                  <div>
                    <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#6b7280", display: "block" }}>Название клиники</span>
                    <strong style={{ fontSize: "15px", color: "#111827" }}>{clinicProfileDraft.clinicName || "Новая стоматология"}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#6b7280", display: "block" }}>Ваша рабочая роль</span>
                    <strong style={{ fontSize: "15px", color: "#111827" }}>{staffRoleLabels[selectedWorkspaceRole]}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#6b7280", display: "block" }}>Первый специалист</span>
                    <strong style={{ fontSize: "15px", color: "#111827" }}>{newStaffName || "Администратор"}</strong>
                  </div>
                  {(selectedWorkspaceRole === "doctor" || selectedWorkspaceRole === "assistant") && (
                    <div>
                      <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#6b7280", display: "block" }}>Кабинет / кресло</span>
                      <strong style={{ fontSize: "15px", color: "#111827" }}>{newChairName || "Кабинет №1"}</strong>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Actions Footer */}
            <div className="onboarding-actions" style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
              {onboardingStep !== "intro" && previousOnboardingStep ? (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => void moveOnboardingTo(previousOnboardingStep.id)}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    background: "#ffffff",
                    color: "#374151",
                    fontWeight: "500",
                    cursor: "pointer"
                  }}
                >
                  Назад
                </button>
              ) : null}
              {onboardingStep !== "intro" && nextOnboardingStep ? (
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => void moveOnboardingTo(nextOnboardingStep.id)}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#0d9488",
                    color: "#ffffff",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  Дальше
                </button>
              ) : null}
              {onboardingStep === "done" ? (
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => void handleFinishOnboarding(newStaffName, newChairName)}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#0d9488",
                    color: "#ffffff",
                    fontWeight: "600",
                    cursor: "pointer"
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

  if (!dashboard || !activePatient) {
    return <AppLoadingState message="Загрузка рабочей смены" />;
  }

  return (
    <main className="app-shell">
      <a className="skip-link" href="#workspace-content">
        Перейти к рабочей области
      </a>
      <WorkspaceSidebar currentView={currentView} onViewIntent={preloadWorkspaceView} role={selectedWorkspaceRole} />

      <section className={`workspace view-${currentView}`} id="workspace-content" tabIndex={-1} aria-label="Рабочая область">
        {dashboard?.clinicName === "Стоматология, 1 кабинет" && (
          <div className="default-clinic-banner" role="alert">
            <div className="banner-content">
              <span className="banner-icon" aria-hidden="true">🚀</span>
              <p>
                <strong>Начало работы:</strong> Вы находитесь в демонстрационном режиме с тестовыми данными. Для ввода своего расписания и врачей запустите мастер.
              </p>
            </div>
            <button className="primary-button banner-btn" type="button" onClick={reopenOnboarding}>
              Запустить мастер настройки
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
            <button className="secondary-button" type="button" onClick={() => setError(null)}>
              Понятно
            </button>
          </section>
        ) : null}

        {!error && uiPreferencesSyncError ? (
          <section className="app-notice" role="alert" aria-live="assertive">
            <AlertTriangle aria-hidden="true" />
            <p>{uiPreferencesSyncError}</p>
            <button className="secondary-button" type="button" onClick={() => setUiPreferencesSyncError(null)}>
              Понятно
            </button>
          </section>
        ) : null}

        {!error && !uiPreferencesSyncError && telegramHandoffNotice ? (
          <section className="app-notice telegram-handoff-notice" role="status" aria-live="polite">
            <Bot aria-hidden="true" />
            <p>
              Открыто из Telegram: <strong>{telegramHandoffNotice.title}</strong>. {telegramHandoffNotice.detail} Ссылка не содержит
              пациента, документ, запись или оплату.
            </p>
            <button className="secondary-button" type="button" onClick={() => setTelegramHandoffNotice(null)}>
              Понятно
            </button>
          </section>
        ) : null}

        {!onboardingDismissed && !showFullOnboardingGuide ? (
          <section className="onboarding-compact-strip" aria-label="Первичная настройка клиники">
            <div>
              <strong>Можно начать прием без мастера</strong>
              <span>
                Документы предупредят о реквизитах позже. Сейчас важнее открыть пациента, диктовку и расписание.
              </span>
            </div>
            <span className="onboarding-compact-score">
              {currentOnboardingIndex + 1}/{onboardingSteps.length} · документы {legalReadinessPercent}%
            </span>
            <button className="primary-button" type="button" onClick={() => void continueOnboardingInDraftMode("visit")}>
              <ClipboardCheck aria-hidden="true" /> Прием
            </button>
            <button className="secondary-button" type="button" onClick={() => openOnboardingGuide()}>
              <ShieldCheck aria-hidden="true" /> Настроить
            </button>
          </section>
        ) : null}

        {showFullOnboardingGuide ? (
          <section className="onboarding-shell" aria-label="Первичная настройка клиники">
            <div className="onboarding-head">
              <div>
                <p className="eyebrow">Первое открытие</p>
                <h2>Настройка новой клиники и рабочего места врача</h2>
                <p>
                  Можно начать прием сразу. Юридические поля, импорт и Telegram остаются в настройке и не мешают диктовке,
                  расписанию и карточке пациента.
                </p>
              </div>
              <div className="onboarding-score">
                <span>{currentOnboardingIndex + 1}/{onboardingSteps.length}</span>
                <strong>{legalReadinessPercent}%</strong>
                <small>готовность документов</small>
              </div>
            </div>

            <div className="onboarding-fast-start" aria-label="Быстрый старт работы">
              <div>
                <strong>Рабочий вход без мастера</strong>
                <span>
                  Черновики приема сохраняются. Документы и налоговые формы сами покажут, каких реквизитов не хватает.
                </span>
              </div>
              <button className="primary-button" type="button" onClick={() => void continueOnboardingInDraftMode("visit")}>
                <ClipboardCheck aria-hidden="true" /> Открыть прием
              </button>
              <button className="secondary-button" type="button" onClick={() => void continueOnboardingInDraftMode("schedule")}>
                <CalendarDays aria-hidden="true" /> Расписание
              </button>
              <button className="secondary-button" type="button" onClick={() => void moveOnboardingTo("legal")}>
                <ShieldCheck aria-hidden="true" /> Реквизиты
              </button>
            </div>

            <div className="onboarding-step-list" aria-label="Шаги знакомства">
              {onboardingSteps.map((step, index) => (
                <button
                  className={step.id === onboardingStep ? "active" : index < currentOnboardingIndex ? "done" : ""}
                  key={step.id}
                  type="button"
                  aria-current={step.id === onboardingStep ? "step" : undefined}
                  aria-pressed={step.id === onboardingStep}
                  aria-describedby={step.id === "done" && !onboardingReadyToFinish ? onboardingFinishGuidanceId : undefined}
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
                    Смена показывает очередь и срочные действия. Прием хранит черновики локально и на сервере. Документы
                    генерируются из проверенных данных пациента, оплаты и лицензии клиники.
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
                  <p>Выбор роли и специализации сохраняется как настройка рабочего места и не подмешивает чужие разделы.</p>
                </div>
                <div className="onboarding-form-grid">
                  <div className="role-picker form-span-2" aria-label="Роль нового сотрудника">
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
                  <div className="specialty-strip form-span-2" aria-label="Специализация врача">
                    {(Object.keys(specialtyLabels) as DentalSpecialty[]).map((specialty) => (
                      <button
                        className={selectedSpecialty === specialty ? "active" : ""}
                        key={specialty}
                        type="button"
                        aria-pressed={selectedSpecialty === specialty}
                        onClick={() => setSelectedSpecialty(specialty)}
                      >
                        {specialtyLabels[specialty]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {onboardingStep === "clinic" ? (
              <div className="onboarding-panel">
                <div>
                  <h3>Режим и базовые контакты</h3>
                  <p>Режим меняет первый экран, очереди ролей и подсказки без ручной перенастройки интерфейса.</p>
                </div>
                <div className="mode-grid form-span-2" aria-label="Режим клиники">
                  {(Object.keys(clinicModeLabels) as ClinicMode[]).map((mode) => (
                    <button
                      className={`mode-card ${dashboard.clinicSettings.profile?.mode === mode ? "active" : ""}`}
                      key={mode}
                      type="button"
                      aria-pressed={dashboard.clinicSettings.profile?.mode === mode}
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
                    <input value={clinicProfileDraft.clinicName} onChange={(event) => updateClinicProfileDraft("clinicName", event.target.value)} />
                  </label>
                  <label>
                    Телефон
                    <input value={clinicProfileDraft.phone} onChange={(event) => updateClinicProfileDraft("phone", event.target.value)} />
                  </label>
                  <label>
                    Часовой пояс
                    <input value={clinicProfileDraft.timezone} onChange={(event) => updateClinicProfileDraft("timezone", event.target.value)} />
                  </label>
                  <label>
                    Язык интерфейса
                    <select value={uiLanguage} onChange={(event) => setUiLanguage(normalizeUiLanguageInput(event.target.value))}>
                      {uiLanguageOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <small className="field-note">{selectedUiLanguageOption.detail}</small>
                  </label>
                  <label>
                    Минут на визит
                    <input
                      inputMode="numeric"
                      value={clinicProfileDraft.defaultVisitMinutes}
                      onChange={(event) => updateClinicProfileDraft("defaultVisitMinutes", event.target.value.replace(/[^\d]/g, "").slice(0, 3))}
                    />
                  </label>
                  <label>
                    Начало смены
                    <input type="time" value={clinicProfileDraft.workdayStart} onChange={(event) => updateClinicProfileDraft("workdayStart", event.target.value)} />
                  </label>
                  <label>
                    Конец смены
                    <input type="time" value={clinicProfileDraft.workdayEnd} onChange={(event) => updateClinicProfileDraft("workdayEnd", event.target.value)} />
                  </label>
                  <label>
                    Буфер, мин
                    <input
                      inputMode="numeric"
                      value={clinicProfileDraft.appointmentBufferMinutes}
                      onChange={(event) => updateClinicProfileDraft("appointmentBufferMinutes", event.target.value.replace(/[^\d]/g, "").slice(0, 3))}
                    />
                  </label>
                  <div className="weekday-toggle-row form-span-2" role="group" aria-label="Рабочие дни клиники">
                    <span>Рабочие дни</span>
                    {weekdayOptions.map((day: any) => (
                      <button
                        className={clinicProfileDraft.workingDays.includes(day.value) ? "active" : ""}
                        key={day.value}
                        type="button"
                        aria-pressed={clinicProfileDraft.workingDays.includes(day.value)}
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
                    Без этих полей приложение не должно выдавать финальные договоры, акты и налоговые документы как готовые.
                  </p>
                </div>
                <div className="onboarding-form-grid">
                  <label>
                    Юридическое лицо
                    <input value={clinicProfileDraft.legalName} onChange={(event) => updateClinicProfileDraft("legalName", event.target.value)} />
                  </label>
                  <label>
                    ИНН
                    <input value={clinicProfileDraft.inn} onChange={(event) => updateClinicProfileDraft("inn", event.target.value.replace(/[^\d]/g, "").slice(0, 12))} />
                  </label>
                  <label>
                    КПП
                    <input value={clinicProfileDraft.kpp} onChange={(event) => updateClinicProfileDraft("kpp", event.target.value.replace(/[^\d]/g, "").slice(0, 9))} />
                  </label>
                  <label>
                    ОГРН / ОГРНИП
                    <input value={clinicProfileDraft.ogrn} onChange={(event) => updateClinicProfileDraft("ogrn", event.target.value.replace(/[^\d]/g, "").slice(0, 15))} />
                  </label>
                  <label className="form-span-2">
                    Адрес
                    <input value={clinicProfileDraft.address} onChange={(event) => updateClinicProfileDraft("address", event.target.value)} />
                  </label>
                  <label>
                    Номер лицензии
                    <input value={clinicProfileDraft.medicalLicenseNumber} onChange={(event) => updateClinicProfileDraft("medicalLicenseNumber", event.target.value)} />
                  </label>
                  <label>
                    Дата лицензии
                    <input value={clinicProfileDraft.medicalLicenseIssuedAt} onChange={(event) => updateClinicProfileDraft("medicalLicenseIssuedAt", event.target.value)} />
                  </label>
                  <label className="form-span-2">
                    Кем выдана лицензия
                    <input value={clinicProfileDraft.medicalLicenseIssuer} onChange={(event) => updateClinicProfileDraft("medicalLicenseIssuer", event.target.value)} />
                  </label>
                </div>
                <div className="clinic-legal-summary">
                  <strong>{legalReadinessPercent}%</strong>
                  <span>{legalMissingFields.length ? `Не хватает: ${legalMissingFields.join(", ")}` : "Минимальные поля заполнены"}</span>
                </div>
              </div>
            ) : null}

            {onboardingStep === "team" ? (
              <div className="onboarding-panel">
                <div>
                  <h3>Команда и кабинет</h3>
                  <p>Сотрудники и кресла сразу попадают в серверное состояние, аудит и расписание.</p>
                </div>
                <div className="onboarding-form-grid">
                  <label>
                    Новый сотрудник
                    <input value={newStaffName} onChange={(event) => setNewStaffName(event.target.value)} />
                  </label>
                  <div className="role-picker form-span-2" aria-label="Роль нового сотрудника">
                    {(["doctor", "administrator", "assistant", "manager"] as StaffRole[]).map((role) => (
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
                    <div className="specialty-strip staff-specialty-picker form-span-2" aria-label="Специальность нового сотрудника">
                      {(Object.keys(specialtyLabels) as DentalSpecialty[]).map((specialty) => (
                        <button
                          className={newStaffSpecialty === specialty ? "active" : ""}
                          key={specialty}
                          type="button"
                          aria-pressed={newStaffSpecialty === specialty}
                          onClick={() => setNewStaffSpecialty(specialty)}
                        >
                          {specialtyLabels[specialty]}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => addStaffMember(newStaffRole)}
                    aria-describedby={!newStaffReadyToCreate ? onboardingStaffCreateGuidanceId : undefined}
                    disabled={!newStaffReadyToCreate}
                  >
                    <Plus aria-hidden="true" /> Добавить сотрудника
                  </button>
                  {!newStaffReadyToCreate ? (
                    <p className="quick-create-guidance form-span-2" id={onboardingStaffCreateGuidanceId} role="status" aria-live="polite">
                      Введите ФИО сотрудника, затем выберите роль.
                    </p>
                  ) : null}
                  <label>
                    Кресло / кабинет
                    <input value={newChairName} onChange={(event) => setNewChairName(event.target.value)} />
                  </label>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={addChair}
                    aria-describedby={!newChairReadyToCreate ? onboardingChairCreateGuidanceId : undefined}
                    disabled={!newChairReadyToCreate}
                  >
                    <Plus aria-hidden="true" /> Добавить кресло
                  </button>
                  {!newChairReadyToCreate ? (
                    <p className="quick-create-guidance form-span-2" id={onboardingChairCreateGuidanceId} role="status" aria-live="polite">
                      Введите понятное название кресла или кабинета.
                    </p>
                  ) : null}
                </div>
                <div className="onboarding-schedule-grid form-span-2" aria-label="Расписание команды при первом запуске">
                  <div className="onboarding-schedule-section">
                    <div>
                      <h4>Расписание команды</h4>
                      <p>Сразу задайте рабочие дни и часы. Изменения автосохраняются и остаются выбранными, пока вы их не поменяете.</p>
                    </div>
                    <div className="staff-list">
                      {dashboard.clinicSettings.staff
                        .filter((member) => member.role === "doctor" || member.role === "assistant")
                        .map((member) => {
                          const scheduleDraft = staffScheduleDrafts[member.id] ?? staffScheduleDraftFromWorkingHours(member.workingHours ?? null);
                          const scheduleSaveState = staffScheduleSaveStates[member.id] ?? "saved";
                          const scheduleDirty = staffScheduleDirtyIds.has(member.id);
                          const scheduleSaving = staffScheduleSavingId === member.id || scheduleSaveState === "saving";
                          const scheduleSaveLabel = scheduleSaving
                            ? "Автосохранение"
                            : scheduleSaveState === "error"
                              ? "Не сохранено"
                              : scheduleDirty
                                ? "Ждет автосохранения"
                                : "Сохранено";
                          return (
                            <div className="staff-row onboarding-schedule-row" key={`onboarding-staff-schedule-${member.id}`}>
                              <span style={{ background: member.color }} />
                              <div>
                                <strong>{member.fullName}</strong>
                                <p>
                                  {staffRoleLabels[member.role]} · {member.specialties.map((item) => specialtyLabels[item]).join(", ")}
                                </p>
                              </div>
                              <div className="staff-schedule-editor onboarding-compact-schedule-editor">
                                <label>
                                  С
                                  <input
                                    aria-label={`Начало смены: ${member.fullName}`}
                                    type="time"
                                    value={scheduleDraft.start}
                                    onChange={(event) => updateStaffScheduleDraft(member.id, { start: event.target.value })}
                                  />
                                </label>
                                <label>
                                  До
                                  <input
                                    aria-label={`Конец смены: ${member.fullName}`}
                                    type="time"
                                    value={scheduleDraft.end}
                                    onChange={(event) => updateStaffScheduleDraft(member.id, { end: event.target.value })}
                                  />
                                </label>
                                <div className="weekday-toggle-row staff-weekday-row" role="group" aria-label={`Рабочие дни сотрудника: ${member.fullName}`}>
                                  {weekdayOptions.map((day: any) => (
                                    <button
                                      className={scheduleDraft.workingDays.includes(day.value) ? "active" : ""}
                                      key={day.value}
                                      type="button"
                                      aria-pressed={scheduleDraft.workingDays.includes(day.value)}
                                      onClick={() => toggleStaffWorkingDay(member.id, day.value)}
                                    >
                                      {day.label}
                                    </button>
                                  ))}
                                </div>
                                <div className="staff-schedule-actions">
                                  <span className={`save-state save-state-${scheduleSaveState}`}>{scheduleSaveLabel}</span>
                                  <button
                                    className="secondary-button compact-button"
                                    type="button"
                                    onClick={() => void saveStaffSchedule(member.id)}
                                    disabled={scheduleSaving}
                                  >
                                    {scheduleSaving ? "Сохраняю" : "Сохранить сейчас"}
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
                      <p>Кабинет может работать иначе, чем врач. Это сразу учитывается в записи и конфликтных слотах.</p>
                    </div>
                    <div className="staff-list">
                      {dashboard.clinicSettings.chairs
                        .filter((chair) => chair.active)
                        .map((chair) => {
                          const scheduleDraft = chairScheduleDrafts[chair.id] ?? staffScheduleDraftFromWorkingHours(chair.workingHours ?? null);
                          const scheduleSaveState = chairScheduleSaveStates[chair.id] ?? "saved";
                          const scheduleDirty = chairScheduleDirtyIds.has(chair.id);
                          const scheduleSaving = chairScheduleSavingId === chair.id || scheduleSaveState === "saving";
                          const scheduleSaveLabel = scheduleSaving
                            ? "Автосохранение"
                            : scheduleSaveState === "error"
                              ? "Не сохранено"
                              : scheduleDirty
                                ? "Ждет автосохранения"
                                : "Сохранено";
                          return (
                            <div className="staff-row onboarding-schedule-row" key={`onboarding-chair-schedule-${chair.id}`}>
                              <CalendarDays aria-hidden="true" />
                              <div>
                                <strong>{chair.name}</strong>
                                <p>{chair.specialization ? specialtyLabels[chair.specialization] : "универсально"}</p>
                              </div>
                              <div className="staff-schedule-editor onboarding-compact-schedule-editor">
                                <label>
                                  С
                                  <input
                                    aria-label={`Начало работы кресла: ${chair.name}`}
                                    type="time"
                                    value={scheduleDraft.start}
                                    onChange={(event) => updateChairScheduleDraft(chair.id, { start: event.target.value })}
                                  />
                                </label>
                                <label>
                                  До
                                  <input
                                    aria-label={`Конец работы кресла: ${chair.name}`}
                                    type="time"
                                    value={scheduleDraft.end}
                                    onChange={(event) => updateChairScheduleDraft(chair.id, { end: event.target.value })}
                                  />
                                </label>
                                <div className="weekday-toggle-row staff-weekday-row" role="group" aria-label={`Рабочие дни кресла: ${chair.name}`}>
                                  {weekdayOptions.map((day: any) => (
                                    <button
                                      className={scheduleDraft.workingDays.includes(day.value) ? "active" : ""}
                                      key={day.value}
                                      type="button"
                                      aria-pressed={scheduleDraft.workingDays.includes(day.value)}
                                      onClick={() => toggleChairWorkingDay(chair.id, day.value)}
                                    >
                                      {day.label}
                                    </button>
                                  ))}
                                </div>
                                <div className="staff-schedule-actions">
                                  <span className={`save-state save-state-${scheduleSaveState}`}>{scheduleSaveLabel}</span>
                                  <button
                                    className="secondary-button compact-button"
                                    type="button"
                                    onClick={() => void saveChairSchedule(chair.id)}
                                    disabled={scheduleSaving}
                                  >
                                    {scheduleSaving ? "Сохраняю" : "Сохранить сейчас"}
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
                    Выберите рабочие источники один раз. Система сохранит эти настройки автоматически и будет использовать их в прайсах,
                    переносе пациентов, документах, снимках и внешнем просмотре КТ, пока клиника сама их не поменяет.
                  </p>
                </div>

                <div className="onboarding-source-config" aria-label="Быстрая настройка источников данных">
                  <section className="onboarding-source-section">
                    <div>
                      <strong>Прайс клиники</strong>
                      <span>Откуда администратор чаще всего заносит цены и материалы.</span>
                    </div>
                    <div className="onboarding-source-choice-row" aria-label="Источник прайса">
                      {(Object.keys(pricelistSourceKindLabels) as PricelistSourceKind[]).map((kind) => (
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
                      <span>Основной формат старой базы или бумажного журнала.</span>
                    </div>
                    <div className="onboarding-source-choice-row" aria-label="Источник переноса пациентов">
                      {(Object.keys(importSourceLabels) as ImportSourceKind[]).map((kind) => (
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
                    </div>
                  </section>

                  <section className="onboarding-source-section">
                    <div>
                      <strong>Смешанная выгрузка</strong>
                      <span>Как разбирать файл, где вместе пациенты, снимки и служебные строки.</span>
                    </div>
                    <div className="onboarding-source-choice-row" aria-label="Режим смешанного импорта">
                      {(Object.keys(smartImportModeLabels) as SmartImportMode[]).map((mode) => (
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
                      <span>Куда по умолчанию отправлять распознанный документ, таблицу, архив или фото.</span>
                    </div>
                    <div className="onboarding-source-choice-row" aria-label="Маршрут распознанных документов">
                      {(Object.keys(ingestionTargetLabels) as DocumentIngestionTarget[]).map((target) => (
                        <button
                          className={documentIngestionTarget === target ? "active" : ""}
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
                      <span>Основной поток RVG, ОПТГ, КТ, архива снимков или локальных папок.</span>
                    </div>
                    <div className="onboarding-source-choice-row" aria-label="Источник снимков">
                      {imagingSourceChoices.map((kind) => (
                        <button
                          className={imagingImportSourceKind === kind ? "active" : ""}
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
                      <span>Адреса просмотрщика сохраняются вместе с остальными настройками источников.</span>
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
                  <span>Автосохранено: прайс, импорт, документы, снимки, архив и внешний просмотр</span>
                  <button type="button" onClick={() => { setSettingsTab("prices"); window.location.hash = "settings/prices"; }}>Открыть прайс</button>
                  <button type="button" onClick={() => { setSettingsTab("imports"); window.location.hash = "settings/imports"; }}>Открыть перенос</button>
                  <button type="button" onClick={() => { setSettingsTab("sources"); window.location.hash = "settings/sources"; }}>Открыть снимки</button>
                </div>
              </div>
            ) : null}

            {onboardingStep === "telegram" ? (
              <div className="onboarding-panel">
                <div>
                  <h3>Telegram, QR и связь с пациентами</h3>
                  <p>
                    Настройте Telegram-бот сразу при первом запуске: QR-привязка пациента, напоминания, памятки после лечения,
                    отзывы и ссылки на портал сохраняются автоматически и применяются ко всей клинике.
                  </p>
                </div>
                <div className="onboarding-telegram-status">
                  <span>
                    Бот
                    <strong>{telegramStatus?.botUsername ? `@${telegramStatus.botUsername.replace(/^@/, "")}` : "не загружен"}</strong>
                  </span>
                  <span>
                    Транспорт
                    <strong>{telegramStatus?.webhookReady ? "готов" : "нужна проверка"}</strong>
                  </span>
                  <span>
                    QR-коды
                    <strong>{telegramStatus?.pendingLinkCodeCount ?? 0} ожидают</strong>
                  </span>
                  <span>
                    Чаты
                    <strong>{telegramStatus?.activeChatLinkCount ?? 0} связаны</strong>
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
                    <small>Напоминания до приема в часах: от 1 до 168, максимум 6 значений.</small>
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
                    <small>Клиника сама выбирает момент просьбы оставить отзыв: от 1 до 720 часов после закрытого визита или оплаты.</small>
                  </label>
                  <fieldset className="telegram-checkup-delay-fields full">
                    <legend>Контроль после лечения</legend>
                    <small>Через сколько часов Telegram спросит пациента о самочувствии после выданной памятки.</small>
                    {telegramPostVisitCheckupDelayFields.map((field) => (
                      <label key={field.key}>
                        {field.label}
                        <input
                          type="number"
                          min={1}
                          max={720}
                          step={1}
                          value={telegramPostVisitCheckupDelayDrafts[field.key]}
                          onChange={(event) => updateTelegramPostVisitCheckupDelayDraft(field.key, event.target.value)}
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
                      onChange={(event) => setTelegramAdminSecretDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          unlockTelegramAdminSession("telegram");
                        }
                      }}
                      placeholder="если защищенные настройки включены на сервере клиники"
                    />
                    <small>{telegramAdminSecretSession ? "Разблокировано до перезагрузки страницы." : "Секрет не сохраняется в браузере."}</small>
                  </label>
                  <button className="secondary-button" type="button" onClick={() => unlockTelegramAdminSession("telegram")}>
                    <ShieldCheck aria-hidden="true" /> Разблокировать
                  </button>
                  <label>
                    Приватность
                    <select
                      value={telegramPrivacyModeDraft}
                      onChange={(event) => {
                        setTelegramPrivacyModeDraft(normalizedTelegramPrivacyMode(event.target.value));
                        markTelegramSettingsDirty();
                      }}
                    >
                      <option value="no_phi_by_default">{telegramPrivacyModeLabels.no_phi_by_default}</option>
                      <option value="limited_admin_only">{telegramPrivacyModeLabels.limited_admin_only}</option>
                      <option value="consented_phi_templates" disabled>
                        {telegramPrivacyModeLabels.consented_phi_templates} (после аудита)
                      </option>
                    </select>
                  </label>
                </div>
                <div className="onboarding-feature-list" aria-label="Быстрые сценарии Telegram">
                  <div className="onboarding-telegram-visual-cards">
                    {telegramVisualCardFields
                      .filter((field) => onboardingTelegramVisualCardKeys.includes(field.key))
                      .map((field) => (
                        <label key={field.key}>
                          {field.label}
                          <input
                            type="url"
                            inputMode="url"
                            placeholder={field.placeholder}
                            value={telegramVisualCardUrlDrafts[field.key] ?? ""}
                            onChange={(event) => updateTelegramVisualCardUrlDraft(field.key, event.target.value)}
                          />
                          <small>{field.help} Если поле пустое, используется картинка приветствия.</small>
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
                        "staff_daily_digest"
                      ].includes(feature)
                    )
                    .map((feature) => (
                      <label className={telegramEnabledFeaturesDraft.includes(feature) ? "active" : ""} key={feature}>
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
                  <button className="secondary-button" type="button" onClick={() => void saveTelegramSettings()} disabled={isTelegramSettingsSaving}>
                    <ShieldCheck aria-hidden="true" /> {isTelegramSettingsSaving ? "Сохраняю" : "Сохранить Telegram"}
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
                  <span className={`telegram-save-state save-${telegramSettingsSaveState}`}>
                    {telegramSettingsSaveState === "saving"
                      ? "Автосохранение..."
                      : telegramSettingsSaveState === "saved"
                        ? "Telegram сохранен."
                        : telegramSettingsSaveState === "error"
                          ? telegramSettingsSaveError ?? "Telegram не сохранен."
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
                    Профиль клиники: {legalReadinessPercent}%. Команда: {dashboard.clinicSettings.staff.length}. Кабинеты:{" "}
                    {dashboard.clinicSettings.chairs.length}. Telegram: {telegramStatus?.webhookReady ? "готов к отправке" : "нужна настройка отправки"}. Документы:{" "}
                    {documentFactoryGroups.reduce((total, group) => total + group.kinds.length, 0)} шаблонов.
                  </p>
                </div>
                <div className="onboarding-readiness-grid">
                  <span>{clinicModeLabels[dashboard.clinicSettings.profile?.mode].title}</span>
                  <span>{staffRoleLabels[selectedWorkspaceRole]}</span>
                  <span>{specialtyLabels[selectedSpecialty]}</span>
                  <span>{telegramEnabledFeaturesDraft.length} Telegram-сценариев включено</span>
                  <span>{onboardingDocumentsReady ? "документы готовы к выдаче" : "документы требуют реквизитов"}</span>
                </div>
                {!onboardingReadyToFinish ? (
                  <p className="onboarding-blocker">До завершения нужно заполнить: {onboardingBlockingIssues.join(", ")}.</p>
                ) : null}
                {!onboardingDocumentsReady ? (
                  <p className="onboarding-blocker onboarding-advisory">
                    Первый рабочий экран можно открыть сейчас. Для договоров, актов и налоговых форм позже заполните:{" "}
                    {onboardingDocumentReadinessIssues.join(", ")}.
                  </p>
                ) : null}
                {onboardingTelegramRecommendations.length ? (
                  <p className="onboarding-blocker onboarding-advisory">
                    Telegram можно включить позже: {onboardingTelegramRecommendations.join(", ")}.
                  </p>
                ) : null}
              </div>
            ) : null}

            {!onboardingReadyToFinish ? (
              <p className="onboarding-blocker onboarding-action-guidance" id={onboardingFinishGuidanceId} role="status" aria-live="polite">
                Чтобы завершить настройку, заполните: {onboardingBlockingIssues.join(", ")}.
              </p>
            ) : null}

            <div className="onboarding-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={dismissOnboarding}
                aria-describedby={!onboardingReadyToFinish ? onboardingFinishGuidanceId : undefined}
                disabled={!onboardingReadyToFinish}
              >
                Скрыть
              </button>
              {!onboardingReadyToFinish ? (
                <button className="secondary-button" type="button" onClick={() => void continueOnboardingInDraftMode()}>
                  Продолжить в черновике
                </button>
              ) : null}
              <button className="secondary-button" type="button" onClick={() => void saveClinicProfileFromDraft()} disabled={clinicProfileSaveState === "saving"}>
                <ShieldCheck aria-hidden="true" /> {clinicProfileSaveState === "saving" ? "Сохраняю" : "Сохранить профиль"}
              </button>
              {previousOnboardingStep ? (
                <button className="secondary-button" type="button" onClick={() => void moveOnboardingTo(previousOnboardingStep.id)}>
                  Назад
                </button>
              ) : null}
              {nextOnboardingStep ? (
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => void moveOnboardingTo(nextOnboardingStep.id)}
                  aria-describedby={nextOnboardingStep.id === "done" && !onboardingReadyToFinish ? onboardingFinishGuidanceId : undefined}
                  disabled={nextOnboardingStep.id === "done" && !onboardingReadyToFinish}
                >
                  Дальше <ArrowRight aria-hidden="true" />
                </button>
              ) : (
                <button
                  className="primary-button"
                  type="button"
                  onClick={dismissOnboarding}
                  aria-describedby={!onboardingReadyToFinish ? onboardingFinishGuidanceId : undefined}
                  disabled={!onboardingReadyToFinish}
                >
                  Завершить настройку
                </button>
              )}
            </div>
          </section>
        ) : null}

        {onboardingDismissed && onboardingDraftMode && !onboardingReadyToFinish ? (
          <section className="onboarding-draft-strip" aria-label="Первичная настройка в черновике">
            <div>
              <strong>Первичная настройка не завершена</strong>
              <span>Можно работать в черновике, но перед выдачей документов заполните: {onboardingBlockingIssues.join(", ")}.</span>
            </div>
            <button className="secondary-button" type="button" onClick={reopenOnboarding}>
              Вернуться к настройке
            </button>
          </section>
        ) : null}

        {onboardingDismissed && onboardingReadyToFinish && !onboardingDocumentsReady ? (
          <section className="onboarding-draft-strip" aria-label="Документы требуют реквизитов">
            <div>
              <strong>Документы требуют реквизитов</strong>
              <span>Для договоров, актов и налоговых форм заполните: {onboardingDocumentReadinessIssues.join(", ")}.</span>
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
        <ShiftView
          activePatient={activePatient}
          activePatientHasCallablePhone={activePatientHasCallablePhone}
          activePatientCallablePhone={activePatientCallablePhone}
          visibleRecommendedActions={visibleRecommendedActions}
          recommendedActionPriorityLabels={recommendedActionPriorityLabels}
          staffRoleLabels={staffRoleLabels}
          selectedWorkspaceRole={selectedWorkspaceRole}
          activeRoleQueue={activeRoleQueue}
          activeRolePolicy={activeRolePolicy}
          activeRoleWritableSections={activeRoleWritableSections}
          viewLabels={viewLabels}
          activeRoleRestrictedSections={activeRoleRestrictedSections}
          dashboard={dashboard}
          activeQueueRole={activeQueueRole}
          shiftWarnings={shiftWarnings}
          warningSeverityLabels={warningSeverityLabels}
          openScheduleWarning={openScheduleWarning}
          setError={setError}
          mostLoadedResource={mostLoadedResource}
          setSelectedPatientId={setSelectedPatientId}
          activeDoctor={activeDoctor}
        />
        ) : null}

        {["shift", "patients"].includes(currentView) ? (
          <PatientCockpit
            activePatient={activePatient}
            activePatientInsight={activePatientInsight}
            dashboard={dashboard}
            activeCommunicationTasks={activeCommunicationTasks}
            activeImagingStudies={activeImagingStudies}
            activeUsableDocuments={activeUsableDocuments}
          />
        ) : null}

        {currentView === "imaging" ? (
  <WorkspaceRouteErrorBoundary view="imaging" label={viewLabels.imaging} panelClassName="panel imaging-panel" panelId="imaging">
    <Suspense
      fallback={
        <div className="panel imaging-panel" id="imaging" aria-busy="true">
          <div className="panel-heading">
            <h2>Снимки пациента</h2>
            <span className="status-pill status-planned">загрузка</span>
          </div>
        </div>
      }
    >
      <ImagingView
        CtPlanningToolsPanel={CtPlanningToolsPanel}
        ExternalLink={ExternalLink}
        FlipHorizontal={FlipHorizontal}
        ImageIcon={ImageIcon}
        Plus={Plus}
        RefreshCw={RefreshCw}
        RotateCcw={RotateCcw}
        RotateCw={RotateCw}
        ZoomIn={ZoomIn}
        ZoomOut={ZoomOut}
        activeAppointment={activeAppointment}
        activeImagingStudies={activeImagingStudies}
        activePatient={activePatient}
        addImagingViewerNoteAnnotation={addImagingViewerNoteAnnotation}
        applyCtPlanningQuickAction={applyCtPlanningQuickAction}
        applyMprClinicalPreset={applyMprClinicalPreset}
        applyNearestMprClinicalPreset={applyNearestMprClinicalPreset}
        canRetryImagingViewerSave={canRetryImagingViewerSave}
        cbctWorkbenchPlanes={cbctWorkbenchPlanes}
        cbctWorkbenchProjections={cbctWorkbenchProjections}
        cbctWorkbenchSeries={cbctWorkbenchSeries}
        clampMprAxisDeg={clampMprAxisDeg}
        clampMprSlabMm={clampMprSlabMm}
        clampMprSliceIndex={clampMprSliceIndex}
        createCtPlanningArtifact={createCtPlanningArtifact}
        createImagingStudy={createImagingStudy}
        ctPlanningActiveQuickActionId={ctPlanningActiveQuickActionId}
        ctPlanningAnnotationRefs={ctPlanningAnnotationRefs}
        ctPlanningImplantPlan={ctPlanningImplantPlan}
        currentView={currentView}
        defaultImagingViewerState={defaultImagingViewerState}
        describeMprClinicalPresetProjectionFallback={describeMprClinicalPresetProjectionFallback}
        dicomLabel={dicomLabel}
        dicomQualityModeLabels={dicomQualityModeLabels}
        dicomTextureStrategyLabels={dicomTextureStrategyLabels}
        dicomViewerToolStateBundle={dicomViewerToolStateBundle}
        dicomViewerWorkbenchManifest={dicomViewerWorkbenchManifest}
        formatShortDate={formatShortDate}
        formatSignedMprStep={formatSignedMprStep}
        formatTime={formatTime}
        handleMprKeyboardNavigation={handleMprKeyboardNavigation}
        imagingComparisonCandidates={imagingComparisonCandidates}
        imagingCreateSavingKind={imagingCreateSavingKind}
        imagingKindFilter={imagingKindFilter}
        imagingKindLabels={imagingKindLabels}
        imagingKindOptions={imagingKindOptions}
        imagingPreviewSource={imagingPreviewSource}
        imagingSourceLabels={imagingSourceLabels}
        imagingViewerActiveTool={imagingViewerActiveTool}
        imagingViewerAnnotations={imagingViewerAnnotations}
        imagingViewerHref={imagingViewerHref}
        imagingViewerImageStyle={imagingViewerImageStyle}
        imagingViewerNote={imagingViewerNote}
        imagingViewerNoteMissingId={imagingViewerNoteMissingId}
        imagingViewerNoteReady={imagingViewerNoteReady}
        imagingViewerRetryMissingId={imagingViewerRetryMissingId}
        imagingViewerSaveDetail={imagingViewerSaveDetail}
        imagingViewerSaveState={imagingViewerSaveState}
        imagingViewerSaveTitle={imagingViewerSaveTitle}
        imagingViewerSessionReady={imagingViewerSessionReady}
        imagingViewerState={imagingViewerState}
        imagingViewerToolLabels={imagingViewerToolLabels}
        isOnline={isOnline}
        mprActiveProjectionLabel={mprActiveProjectionLabel}
        mprActiveProjectionOrientation={mprActiveProjectionOrientation}
        mprAxisAngleBadge={mprAxisAngleBadge}
        mprAxisBounds={mprAxisBounds}
        mprAxisDeg={mprAxisDeg}
        mprAxisDirectionLabel={mprAxisDirectionLabel}
        mprAxisGuidance={mprAxisGuidance}
        mprAxisNudgeDeg={mprAxisNudgeDeg}
        mprAxisPresetDeg={mprAxisPresetDeg}
        mprAxisRangeValue={mprAxisRangeValue}
        mprAxisVisualizerLabel={mprAxisVisualizerLabel}
        mprAxisVisualizerStyle={mprAxisVisualizerStyle}
        mprClinicalChecklist={mprClinicalChecklist}
        mprClinicalNextStep={mprClinicalNextStep}
        mprClinicalPresetButtonClass={mprClinicalPresetButtonClass}
        mprClinicalPresets={mprClinicalPresets}
        mprControlsAutoOpen={mprControlsAutoOpen}
        mprControlsReady={mprControlsReady}
        mprCrosshairEnabled={mprCrosshairEnabled}
        mprLinkedPlanesEnabled={mprLinkedPlanesEnabled}
        mprNearestClinicalPreset={mprNearestClinicalPreset}
        mprOperatorSummaryCards={mprOperatorSummaryCards}
        mprProjection={mprProjection}
        mprProjectionCompass={mprProjectionCompass}
        mprProjectionLabels={mprProjectionLabels}
        mprSafeSliceIndex={mprSafeSliceIndex}
        mprSeriesRequiredProjectionLabel={mprSeriesRequiredProjectionLabel}
        mprSlabBadge={mprSlabBadge}
        mprSlabBounds={mprSlabBounds}
        mprSlabMm={mprSlabMm}
        mprSlabNudgeMm={mprSlabNudgeMm}
        mprSlabPresetMm={mprSlabPresetMm}
        mprSlabRangeValue={mprSlabRangeValue}
        mprSliceBadge={mprSliceBadge}
        mprSliceIndexFromFraction={mprSliceIndexFromFraction}
        mprSliceLabel={mprSliceLabel}
        mprSliceMaxIndex={mprSliceMaxIndex}
        mprSliceNudgeSteps={mprSliceNudgeSteps}
        mprSlicePresetFractions={mprSlicePresetFractions}
        mprSliceRangeValue={mprSliceRangeValue}
        mprUnavailableProjectionLabel={mprUnavailableProjectionLabel}
        mprWindowPreset={mprWindowPreset}
        mprWindowPresetLabels={mprWindowPresetLabels}
        mprWorkbenchDraftRestored={mprWorkbenchDraftRestored}
        mprWorkbenchLocalSavedAt={mprWorkbenchLocalSavedAt}
        mprWorkbenchSummaryText={mprWorkbenchSummaryText}
        resetMprControls={resetMprControls}
        restoreMprWorkbenchLocalDraft={restoreMprWorkbenchLocalDraft}
        retryImagingViewerSessionSave={retryImagingViewerSessionSave}
        selectCtPlanningImplant={selectCtPlanningImplant}
        selectedImagingStudy={selectedImagingStudy}
        selectedImagingViewerPlan={selectedImagingViewerPlan}
        setCtPlanningActiveQuickActionId={setCtPlanningActiveQuickActionId}
        setCtPlanningImplantPlan={setCtPlanningImplantPlan}
        setImagingKindFilter={setImagingKindFilter}
        setImagingViewerActiveTool={setImagingViewerActiveTool}
        setImagingViewerNote={setImagingViewerNote}
        setImagingViewerState={setImagingViewerState}
        setMprAxisDeg={setMprAxisDeg}
        setMprCrosshairEnabled={setMprCrosshairEnabled}
        setMprLinkedPlanesEnabled={setMprLinkedPlanesEnabled}
        setMprProjection={setMprProjection}
        setMprSlabMm={setMprSlabMm}
        setMprSliceIndex={setMprSliceIndex}
        setMprWindowPreset={setMprWindowPreset}
        setSelectedImagingStudyId={setSelectedImagingStudyId}
        visibleImagingStudies={visibleImagingStudies}
      />
    </Suspense>
  </WorkspaceRouteErrorBoundary>
) : null}



        {["schedule", "patients", "visit", "documents", "finance", "communications"].includes(currentView) ? (
        <section className="work-grid page-grid">
          {currentView === "schedule" ? (
          <WorkspaceRouteErrorBoundary view="schedule" label={viewLabels.schedule} panelClassName="panel schedule-panel" panelId="schedule">
            <Suspense
              fallback={
                <div className="panel schedule-panel" id="schedule" aria-busy="true">
                  <div className="panel-heading">
                    <h2>Расписание</h2>
                    <span className="status-pill status-planned">загрузка</span>
                  </div>
                </div>
              }
            >
              <ScheduleView
                appointmentLabels={appointmentLabels}
                appointmentReadinessById={appointmentReadinessById}
                appointmentReadinessLabels={appointmentReadinessLabels}
                appointmentScheduleDraftFromAppointment={appointmentScheduleDraftFromAppointment}
                closeAppointmentEditor={closeAppointmentEditor}
                createAppointmentFromDraft={createAppointmentFromDraft}
                dashboard={dashboard}
                editingAppointmentId={editingAppointmentId}
                formatTime={formatTime}
                fromDateTimeLocalValue={fromDateTimeLocalValue}
                lockScheduleAdminSession={() => lockTelegramAdminSession("schedule")}
                newAppointmentError={newAppointmentError}
                normalizedAppointmentStatus={normalizedAppointmentStatus}
                normalizedAppointmentStatusFilter={normalizedAppointmentStatusFilter}
                openAppointmentEditor={openAppointmentEditor}
                patientName={patientName}
                recommendedActionPriorityLabels={recommendedActionPriorityLabels}
                resetNewAppointmentDraft={resetNewAppointmentDraft}
                saveAppointmentSchedule={saveAppointmentSchedule}
                
                shiftWarnings={shiftWarnings}
                sortedAppointments={sortedAppointments}
                staffRoleLabels={staffRoleLabels}
                scheduleAdminSecretDraft={scheduleAdminSecretDraft}
                scheduleAdminSecretSession={scheduleAdminSecretSession}
                toDateTimeLocalValue={toDateTimeLocalValue}
                unlockScheduleAdminSession={() => unlockTelegramAdminSession("schedule")}
                updateAppointmentScheduleDraft={updateAppointmentScheduleDraft}
                updateNewAppointmentDraft={updateNewAppointmentDraft}
                visibleScheduleSuggestions={visibleScheduleSuggestions}
              />
            </Suspense>
          </WorkspaceRouteErrorBoundary>
          ) : null}

          {currentView === "patients" ? (
          <WorkspaceRouteErrorBoundary view="patients" label={viewLabels.patients} panelClassName="panel patients-panel" panelId="patients">
            <Suspense
              fallback={
                <div className="panel patients-panel" id="patients" aria-busy="true">
                  <div className="panel-heading">
                    <h2>Быстрый поиск</h2>
                    <span className="status-pill status-planned">загрузка</span>
                  </div>
                </div>
              }
            >
              <PatientsView
                createPatient={createPatient}
                filteredPatients={filteredPatients}
                money={money}
                normalizeOptionalWorkingDaysDraft={normalizeOptionalWorkingDaysDraft}
                patientAdministrativeProfileValidationMessage={patientAdministrativeProfileValidationMessage}
                patientInsightById={patientInsightById}
                patientInsightRiskLabels={patientInsightRiskLabels}
                query={query}
                savePatientAdministrativeProfile={savePatientAdministrativeProfile}
                savePatientCore={savePatientCore}
                selectedPatient={selectedPatient}
                setQuery={setQuery}
                updatePatientAdministrativeProfileDraft={updatePatientAdministrativeProfileDraft}
                updatePatientCoreDraft={updatePatientCoreDraft}
                weekdayOptions={weekdayOptions}
              />
            </Suspense>
          </WorkspaceRouteErrorBoundary>

          ) : null}

          {currentView === "visit" ? (
  <WorkspaceRouteErrorBoundary view="visit" label={viewLabels.visit} panelClassName="panel visit-panel" panelId="visit">
    <Suspense
      fallback={
        <div className="panel visit-panel" id="visit" aria-busy="true">
          <div className="panel-heading">
            <h2>Текущий прием</h2>
            <span className="status-pill status-planned">загрузка</span>
          </div>
        </div>
      }
    >
      <VisitView
        AlertTriangle={AlertTriangle}
        Bot={Bot}
        Check={Check}
        CheckCircle2={CheckCircle2}
        ClinicalRulePanel={ClinicalRulePanel}
        ClipboardCheck={ClipboardCheck}
        Mic={Mic}
        Sparkles={Sparkles}
        acceptDraftToVisit={acceptDraftToVisit}
        activeAppointment={activeAppointment}
        activeChair={activeChair}
        activeDoctor={activeDoctor}
        activeImagingStudies={activeImagingStudies}
        activePatient={activePatient}
        activePatientInsight={activePatientInsight}
        activeUsableDocuments={activeUsableDocuments}
        activeVisitClinicalRuleEvaluations={activeVisitClinicalRuleEvaluations}
        activeVisitClinicalRuleSummary={activeVisitClinicalRuleSummary}
        appendToTranscript={appendToTranscript}
        applyProtocolTemplate={applyProtocolTemplate}
        buildDraft={buildDraft}
        buildOfflineDraft={buildOfflineDraft}
        clearTranscriptWithUndo={clearTranscriptWithUndo}
        clearedTranscriptSnapshot={clearedTranscriptSnapshot}
        clinicalRuleActionLabels={clinicalRuleActionLabels}
        clinicalRuleSeverityLabels={clinicalRuleSeverityLabels}
        dashboard={dashboard}
        dictationQuickPhrases={dictationQuickPhrases}
        draft={draft}
        emptyDictationVoiceActionLabel={emptyDictationVoiceActionLabel}
        flushPendingSpeechChunks={flushPendingSpeechChunks}
        flushPendingVisitSaves={flushPendingVisitSaves}
        formatTime={formatTime}
        hasVisitTranscriptText={hasVisitTranscriptText}
        imagingKindLabels={imagingKindLabels}
        isDraftAccepting={isDraftAccepting}
        isDraftLoading={isDraftLoading}
        isOnline={isOnline}
        isPendingVisitSyncing={isPendingVisitSyncing}
        isServerVoiceRecording={isServerVoiceRecording}
        isTranscriptPolishing={isTranscriptPolishing}
        isVisitDictating={isVisitDictating}
        isVisitNoteDirty={isVisitNoteDirty}
        lastLocalSavedAt={lastLocalSavedAt}
        lastPendingVisitSaveAt={lastPendingVisitSaveAt}
        lastServerDraftSavedAt={lastServerDraftSavedAt}
        lastVisitSaveReceipt={lastVisitSaveReceipt}
        localDraftWasRestored={localDraftWasRestored}
        openVisitWarningAction={openVisitWarningAction}
        pendingSpeechChunkCount={pendingSpeechChunkCount}
        pendingSpeechFlushActionLabel={pendingSpeechFlushActionLabel}
        pendingSpeechFlushActionTitle={pendingSpeechFlushActionTitle}
        pendingVisitSaveCount={pendingVisitSaveCount}
        polishTranscript={polishTranscript}
        polishingField={polishingField}
        polishSingleField={polishSingleField}
        primaryVisitWarning={primaryVisitWarning}
        scrollToVisitArea={scrollToVisitArea}
        selectedProtocolTemplate={selectedProtocolTemplate}
        selectedSpecialty={selectedSpecialty}
        serverDraftSyncState={serverDraftSyncState}
        serviceTitle={serviceTitle}
        setClearedTranscriptSnapshot={setClearedTranscriptSnapshot}
        setSelectedProtocolId={setSelectedProtocolId}
        setSelectedSpecialty={setSelectedSpecialty}
        setTranscript={setTranscript}
        specialtiesWithTemplates={specialtiesWithTemplates}
        specialtyLabels={specialtyLabels}
        specialtyProtocolTemplates={specialtyProtocolTemplates}
        speechGatewayActiveProviderIsLocal={speechGatewayActiveProviderIsLocal}
        speechGatewayStatus={speechGatewayStatus}
        speechRecognitionReady={speechRecognitionReady}
        speechStatusNote={speechStatusNote}
        staffRoleLabels={staffRoleLabels}
        startServerVoiceRecording={startServerVoiceRecording}
        startVisitDictation={startVisitDictation}
        stopServerVoiceRecording={stopServerVoiceRecording}
        toothRows={toothRows}
        toothStateByCode={toothStateByCode}
        setToothState={setToothState}
        transcript={transcript}
        undoTranscriptClear={undoTranscriptClear}
        updateVisitNoteField={updateVisitNoteField}
        visibleVisitSpecialtyFocusOptions={visibleVisitSpecialtyFocusOptions}
        visitCloseChecklist={visitCloseChecklist}
        visitDraftBuildMissingSteps={visitDraftBuildMissingSteps}
        visitDraftMissingFieldLabel={visitDraftMissingFieldLabel}
        visitDraftQualityLabels={visitDraftQualityLabels}
        visitDraftReadyToBuild={visitDraftReadyToBuild}
        visitDraftSignalLabel={visitDraftSignalLabel}
        visitDraftUserEditedRef={visitDraftUserEditedRef}
        visitNoteAcceptMissingSteps={visitNoteAcceptMissingSteps}
        visitNoteActionLabel={visitNoteActionLabel}
        visitNoteFieldDefinitions={visitNoteFieldDefinitions}
        visitNoteForm={visitNoteForm}
        visitNoteReadyToAccept={visitNoteReadyToAccept}
        visitNoteStatusLabel={visitNoteStatusLabel}
        visitPrimaryAction={visitPrimaryAction}
        visitSafetyCards={visitSafetyCards}
        visitSaveReceiptText={visitSaveReceiptText}
        visitWarnings={visitWarnings}
        visitWorkflowSteps={visitWorkflowSteps}
        selectedWorkspaceRole={selectedWorkspaceRole}
      />
    </Suspense>
  </WorkspaceRouteErrorBoundary>
) : null}

{currentView === "documents" ? (
            <WorkspaceRouteErrorBoundary view="documents" label={viewLabels.documents} panelClassName="panel documents-panel" panelId="documents">
            <Suspense
              fallback={
                <div className="panel documents-panel" id="documents" aria-busy="true">
                  <div className="panel-heading">
                    <h2>Документы и согласия</h2>
                    <span className="status-pill status-planned">загрузка</span>
                  </div>
                </div>
              }
            >
              <DocumentsView
                activeAppointment={activeAppointment}
                activeDoctor={activeDoctor}
                activeDocuments={activeDocuments}
                activeIssuedPaidContracts={activeIssuedPaidContracts}
                activePatient={activePatient}
                activeUsableDocuments={activeUsableDocuments}
                applyPostVisitCarePreset={applyPostVisitCarePreset}
                changePostVisitCareTopic={changePostVisitCareTopic}
                clinicProfileDraft={clinicProfileDraft}
                compactDocumentText={compactDocumentText}
                completedActContractReferenceForUi={completedActContractReferenceForUi}
                completedActFiscalReceiptLines={completedActFiscalReceiptLines}
                completedActPaidRubValue={completedActPaidRubValue}
                confirmDocumentIssue={confirmDocumentIssue}
                confirmDocumentVoid={confirmDocumentVoid}
                createDocument={createDocument}
                dashboard={dashboard}
                documentActionLabels={documentActionLabels}
                documentIssueAttestationReady={documentIssueAttestationReady}
                documentIssueConfirmation={documentIssueConfirmation}
                documentIssueSignatureModeLabels={documentIssueSignatureModeLabels}
                documentLabels={documentLabels}
                documentPatient={documentPatient}
                documentSourceStatusClassNames={documentSourceStatusClassNames}
                documentStatusLabels={documentStatusLabels}
                documentVoidConfirmation={documentVoidConfirmation}
                documentVoidReady={documentVoidReady}
                documentVoidReasonLabels={documentVoidReasonLabels}
                downloadIssuedDocumentHtml={downloadIssuedDocumentHtml}
                downloadIssuedDocumentPdf={downloadIssuedDocumentPdf}
                downloadTaxDocumentXml={downloadTaxDocumentXml}
                eligiblePaymentReceiptPayments={eligiblePaymentReceiptPayments}
                eligibleRefundCorrectionPayments={eligibleRefundCorrectionPayments}
                eligibleTaxPayments={eligibleTaxPayments}
                formatDateTime={formatDateTime}
                formatShortDate={formatShortDate}
                inferredTreatmentArea={inferredTreatmentArea}
                installmentScheduleBaseDocumentTitleValue={installmentScheduleBaseDocumentTitleValue}
                installmentScheduleInstallmentRows={installmentScheduleInstallmentRows}
                installmentSchedulePrepaidRubValue={installmentSchedulePrepaidRubValue}
                installmentScheduleRemainingRubValue={installmentScheduleRemainingRubValue}
                installmentScheduleTotalRubValue={installmentScheduleTotalRubValue}
                issuedMedicalCopyRequestDocuments={issuedMedicalCopyRequestDocuments}
                loadDocumentAuditFacts={loadDocumentAuditFacts}
                markPostVisitManualEdited={markPostVisitManualEdited}
                medicalDocumentReleaseChannelLabels={medicalDocumentReleaseChannelLabels}
                minorConsentDiagnosisOrIndicationValue={minorConsentDiagnosisOrIndicationValue}
                minorConsentInterventionScopeValue={minorConsentInterventionScopeValue}
                minorConsentPatientBirthDateValue={minorConsentPatientBirthDateValue}
                minorConsentPatientFullNameValue={minorConsentPatientFullNameValue}
                minorRepresentativeFullNameValue={minorRepresentativeFullNameValue}
                minorRepresentativeIdentityDocumentValue={minorRepresentativeIdentityDocumentValue}
                minorRepresentativePhoneValue={minorRepresentativePhoneValue}
                minorRepresentativeRelationshipValue={minorRepresentativeRelationshipValue}
                money={money}
                normalizedDocumentIssueSignatureMode={normalizedDocumentIssueSignatureMode}
                normalizedDocumentKind={normalizedDocumentKind}
                normalizedDocumentVoidReasonCode={normalizedDocumentVoidReasonCode}
                normalizedMedicalDocumentReleaseChannel={normalizedMedicalDocumentReleaseChannel}
                normalizedOutpatient025uDemographicCode={normalizedOutpatient025uDemographicCode}
                normalizedPatientIntakePregnancyStatus={normalizedPatientIntakePregnancyStatus}
                normalizedPaymentRefundCorrectionAction={normalizedPaymentRefundCorrectionAction}
                normalizedPaymentRefundCorrectionMethod={normalizedPaymentRefundCorrectionMethod}
                normalizedPostVisitCareTopic={normalizedPostVisitCareTopic}
                normalizedProcedureSpecificConsentProcedure={normalizedProcedureSpecificConsentProcedure}
                normalizedTaxApplicationDeliveryChannel={normalizedTaxApplicationDeliveryChannel}
                normalizedTaxApplicationForm={normalizedTaxApplicationForm}
                normalizedTaxApplicationRelationshipSelect={normalizedTaxApplicationRelationshipSelect}
                normalizedTreatmentPlanAcceptanceVariant={normalizedTreatmentPlanAcceptanceVariant}
                normalizedXrayPregnancyStatus={normalizedXrayPregnancyStatus}
                normalizedXrayPriority={normalizedXrayPriority}
                normalizedXrayStudyType={normalizedXrayStudyType}
                openIssuedDocumentHtml={openIssuedDocumentHtml}
                outpatient025uMedicalCardNumberValue={outpatient025uMedicalCardNumberValue}
                paidContractTotalRubValue={paidContractTotalRubValue}
                patientIntakePregnancyStatusOptions={patientIntakePregnancyStatusOptions}
                patientName={patientName}
                paymentFiscalReceiptLabelForUi={paymentFiscalReceiptLabelForUi}
                paymentInvoiceTotalRubValue={paymentInvoiceTotalRubValue}
                paymentReceiptFiscalReceiptLines={paymentReceiptFiscalReceiptLines}
                paymentReceiptIssuedByValue={paymentReceiptIssuedByValue}
                paymentReceiptPayerBirthDateValue={paymentReceiptPayerBirthDateValue}
                paymentReceiptPayerFullNameValue={paymentReceiptPayerFullNameValue}
                paymentReceiptPayerIdentityDocumentValue={paymentReceiptPayerIdentityDocumentValue}
                paymentReceiptPayerInnValue={paymentReceiptPayerInnValue}
                paymentReceiptPayerRelationshipValue={paymentReceiptPayerRelationshipValue}
                photoVideoMaterialOptions={photoVideoMaterialOptions}
                plannedServiceLinesForFinancialPayload={plannedServiceLinesForFinancialPayload}
                postVisitCareTopicOptions={postVisitCareTopicOptions}
                procedureSpecificConsentProcedureOptions={procedureSpecificConsentProcedureOptions}
                releaseProtectionNote={releaseProtectionNote}
                renderClinicalToothRowsEditor={renderClinicalToothRowsEditor}
                requestDocumentIssue={requestDocumentIssue}
                requestDocumentVoid={requestDocumentVoid}
                selectAllEligibleTaxPaymentsForCurrentDocument={selectAllEligibleTaxPaymentsForCurrentDocument}
                selectedCompletedActContractDocumentId={selectedCompletedActContractDocumentId}
                selectedDocumentMetadata={selectedDocumentMetadata}
                selectedDocumentUsesTaxPaymentSelection={selectedDocumentUsesTaxPaymentSelection}
                selectedEligibleTaxPayments={selectedEligibleTaxPayments}
                selectedPaymentReceiptIdSet={selectedPaymentReceiptIdSet}
                selectedPaymentReceiptPayments={selectedPaymentReceiptPayments}
                selectedPaymentReceiptTotalRub={selectedPaymentReceiptTotalRub}
                selectedRefundCorrectionPayment={selectedRefundCorrectionPayment}
                selectedReleaseSourceRequestDocumentId={selectedReleaseSourceRequestDocumentId}
                selectedTaxDocumentPayerKey={selectedTaxDocumentPayerKey}
                selectedTaxPaymentIdSet={selectedTaxPaymentIdSet}
                selectedTaxPaymentTotalRub={selectedTaxPaymentTotalRub}
                selectRefundOriginalPayment={selectRefundOriginalPayment}
                setReleaseProtectionNote={setReleaseProtectionNote}
                structuredPayloadDocumentKinds={structuredPayloadDocumentKinds}
                taxApplicationDeliveryChannelOptions={taxApplicationDeliveryChannelOptions}
                taxApplicationFormOptions={taxApplicationFormOptions}
                taxApplicationRelationshipOptions={taxApplicationRelationshipOptions}
                taxDocumentPayerOptions={taxDocumentPayerOptions}
                togglePhotoVideoMaterial={togglePhotoVideoMaterial}
                treatmentAcceptancePlannedTotalRub={treatmentAcceptancePlannedTotalRub}
                treatmentEstimatePatientOrPayerFullNameValue={treatmentEstimatePatientOrPayerFullNameValue}
                treatmentEstimateTotalRubValue={treatmentEstimateTotalRubValue}
                treatmentEstimateTreatmentBasisValue={treatmentEstimateTreatmentBasisValue}
                warrantyLinkedActOrContractValue={warrantyLinkedActOrContractValue}
                warrantyServiceOrWorkNameValue={warrantyServiceOrWorkNameValue}
                warrantyTeethOrAreaValue={warrantyTeethOrAreaValue}
                xrayPregnancyStatusOptions={xrayPregnancyStatusOptions}
                xrayStudyTypeOptions={xrayStudyTypeOptions}
              />
            </Suspense>
            </WorkspaceRouteErrorBoundary>
          ) : null}

          {currentView === "finance" ? (
            <WorkspaceRouteErrorBoundary view="finance" label={viewLabels.finance} panelClassName="panel finance-panel" panelId="finance">
            <Suspense
              fallback={
                <div className="panel finance-panel" id="finance" aria-busy="true">
                  <div className="panel-heading">
                    <h2>Оплаты, план лечения и вычет</h2>
                    <span className="status-pill status-planned">загрузка</span>
                  </div>
                </div>
              }
            >
              <FinanceView
                activePayments={activePayments}
                activeTreatmentPlanItems={activeTreatmentPlanItems}
                activeTreatmentPlanScenarios={activeTreatmentPlanScenarios}
                billingSummary={patientBillingSummary}
                clinicalRuleEvaluations={patientClinicalRuleEvaluations}
                clinicalRuleActionLabels={clinicalRuleActionLabels}
                clinicalRuleSeverityLabels={clinicalRuleSeverityLabels}
                clinicalRuleSummary={patientClinicalRuleSummary}
                dashboard={dashboard}
                documentPatient={documentPatient}
                formatDateTime={formatDateTime}
                isPaymentSaving={isPaymentSaving}
                money={money}
                onGoToDocuments={() => {
                  window.location.hash = "documents";
                }}
                onGoToPrices={() => {
                  setSettingsTab("prices");
                  window.location.hash = "settings/prices";
                }}
                onGoToVisit={() => {
                  window.location.hash = "visit";
                }}
                onRecordPayment={recordPayment}
                paymentAmount={paymentAmount}
                paymentFeedback={paymentFeedback}
                paymentFiscalCashierName={paymentFiscalCashierName}
                paymentFiscalFd={paymentFiscalFd}
                paymentFiscalFn={paymentFiscalFn}
                paymentFiscalFpd={paymentFiscalFpd}
                paymentFiscalReceiptIssuedAt={paymentFiscalReceiptIssuedAt}
                paymentFiscalReceiptLabel={paymentFiscalReceiptLabelForUi}
                paymentFiscalReceiptNumber={paymentFiscalReceiptNumber}
                paymentFiscalReceiptUrl={paymentFiscalReceiptUrl}
                paymentMethod={paymentMethod}
                paymentMethodLabels={paymentMethodLabels}
                paymentPatientContextMessage={paymentPatientContextMessage}
                paymentPatientContextReady={paymentPatientContextReady}
                paymentPayerBirthDate={paymentPayerBirthDate}
                paymentPayerFullName={paymentPayerFullName}
                paymentPayerIdentityDocument={paymentPayerIdentityDocument}
                paymentPayerInn={paymentPayerInn}
                paymentPayerRelationship={paymentPayerRelationship}
                paymentTaxDeductionCode={paymentTaxDeductionCode}
                scenarioPriorityLabels={scenarioPriorityLabels}
                scenarioStrategyLabels={scenarioStrategyLabels}
                serviceCategoryLabels={serviceCategoryLabels}
                serviceTitle={serviceTitle}
                setPaymentAmount={setPaymentAmount}
                setPaymentFiscalCashierName={setPaymentFiscalCashierName}
                setPaymentFiscalFd={setPaymentFiscalFd}
                setPaymentFiscalFn={setPaymentFiscalFn}
                setPaymentFiscalFpd={setPaymentFiscalFpd}
                setPaymentFiscalReceiptIssuedAt={setPaymentFiscalReceiptIssuedAt}
                setPaymentFiscalReceiptNumber={setPaymentFiscalReceiptNumber}
                setPaymentFiscalReceiptUrl={setPaymentFiscalReceiptUrl}
                setPaymentMethod={setPaymentMethod}
                setPaymentPayerBirthDate={setPaymentPayerBirthDate}
                setPaymentPayerFullName={setPaymentPayerFullName}
                setPaymentPayerIdentityDocument={setPaymentPayerIdentityDocument}
                setPaymentPayerInn={setPaymentPayerInn}
                setPaymentPayerRelationship={setPaymentPayerRelationship}
                setPaymentTaxDeductionCode={setPaymentTaxDeductionCode}
                staffRoleLabels={staffRoleLabels}
                treatmentStatusLabels={treatmentStatusLabels}
              />
            </Suspense>
            </WorkspaceRouteErrorBoundary>
          ) : null}

          {currentView === "communications" ? (
            <WorkspaceRouteErrorBoundary view="communications" label={viewLabels.communications} panelClassName="panel communications-panel" panelId="communications">
            <Suspense
              fallback={
                <div className="panel communications-panel" id="communications" aria-busy="true">
                  <div className="panel-heading">
                    <h2>Связь с пациентами</h2>
                    <span className="status-pill status-planned">загрузка</span>
                  </div>
                </div>
              }
            >
              <CommunicationsView
                communicationChannelLabels={communicationChannelLabels}
                communicationDocumentTaskActionLabels={communicationDocumentTaskActionLabels}
                communicationIntentLabels={communicationIntentLabels}
                communicationNote={communicationNote}
                communicationPriorityLabels={communicationPriorityLabels}
                communicationStatusLabels={communicationStatusLabels}
                completeCommunicationTask={completeCommunicationTask}
                dashboard={dashboard}
                documentKindsForCommunicationTask={documentKindsForCommunicationTask}
                documentLabels={documentLabels}
                formatDateTime={formatDateTime}
                communicationSavingTaskId={communicationSavingTaskId}
                onCommunicationNoteChange={setCommunicationNote}
                onGoToSchedule={() => {
                  window.location.hash = "schedule";
                }}
                openCommunicationTaskDocumentWorkflow={openCommunicationTaskDocumentWorkflow}
                sortedCommunicationTasks={sortedCommunicationTasks}
                staffRoleLabels={staffRoleLabels}
              />
            </Suspense>
            </WorkspaceRouteErrorBoundary>
          ) : null}
        </section>
        ) : null}

        {["documents", "finance", "communications", "settings"].includes(currentView) ? (
        <details className="compliance-bar" aria-label="Контроль">
          <summary>
            <ShieldCheck aria-hidden="true" />
            <span>Служебные ограничения</span>
          </summary>
          <div>
            {dashboard.complianceWarnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        </details>
        ) : null}

        {currentView === "settings" ? (
          <WorkspaceRouteErrorBoundary view="settings" label={viewLabels.settings} panelClassName="settings-zone" panelId="settings">
          <Suspense
            fallback={
              <section className="settings-zone" id="settings" aria-busy="true">
                <div className="panel-heading settings-heading">
                  <h2>Настройки</h2>
                  <span className="status-pill status-planned">загрузка</span>
                </div>
              </section>
            }
          >
            <SettingsView
              activePatient={activePatient}
              activeSettingsTabButtonRef={activeSettingsTabButtonRef}
              activeSpeechProviderHealth={activeSpeechProviderHealth}
              activeWorkspaceProfile={activeWorkspaceProfile}
              addChair={addChair}
              addStaffMember={addStaffMember}
              analyzePricelist={analyzePricelist}
              applyProtocolTemplate={applyProtocolTemplate}
              attachPricelistImage={attachPricelistImage}
              browserCanRequestPersistentStorage={browserCanRequestPersistentStorage}
              browserContinuity={browserContinuity}
              browserContinuityChecks={browserContinuityChecks}
              browserContinuityState={browserContinuityState}
              browserContinuityValue={browserContinuityValue}
              browserDirectoryInputRef={browserDirectoryInputRef}
              browserDirectoryPickerAvailable={browserDirectoryPickerAvailable}
              browserImagingScanProgress={browserImagingScanProgress}
              browserMigrationDiscovery={browserMigrationDiscovery}
              browserMigrationScanProgress={browserMigrationScanProgress}
              browserMigrationInputRef={browserMigrationInputRef}
              browserPickedImagingFolder={browserPickedImagingFolder}
              buildDicomFolderWorkupPlan={buildDicomFolderWorkupPlan}
              buildDicomRenderCachePlan={buildDicomRenderCachePlan}
              buildDicomViewerLaunchManifest={buildDicomViewerLaunchManifest}
              buildDicomViewerToolStateBundle={buildDicomViewerToolStateBundle}
              buildDicomViewerWorkbenchManifest={buildDicomViewerWorkbenchManifest}
              cbctWorkbenchPlanes={cbctWorkbenchPlanes}
              cbctWorkbenchProjections={cbctWorkbenchProjections}
              cbctWorkbenchSeries={cbctWorkbenchSeries}
              cbctWorkbenchTools={cbctWorkbenchTools}
              changeClinicMode={changeClinicMode}
              checkDicomWebConnector={checkDicomWebConnector}
              checkDicomWorkstationReadiness={checkDicomWorkstationReadiness}
              chooseRecognitionPreset={chooseRecognitionPreset}
              cancelBrowserImagingFolderScan={cancelBrowserImagingFolderScan}
              cancelBrowserMigrationScan={cancelBrowserMigrationScan}
              clearBrowserPickedImagingFolderPreview={clearBrowserPickedImagingFolderPreview}
              clearDicomWorkbenchRecovery={clearDicomWorkbenchRecovery}
              clearLocalImagingFolderRecovery={clearLocalImagingFolderRecovery}
              clearPricelistImage={clearPricelistImage}
              clinicalRuleActionLabels={clinicalRuleActionLabels}
              clinicalRuleSeverityLabels={clinicalRuleSeverityLabels}
              clinicModeLabels={clinicModeLabels}
              clinicProfileDraft={clinicProfileDraft}
              clinicProfileSaveState={clinicProfileSaveState}
              commitImagingImport={commitImagingImport}
              commitImport={commitImport}
              commitSmartImport={commitSmartImport}
              copyTelegramTextToClipboard={copyTelegramTextToClipboard}
              createClinicalRuleFromSettings={createClinicalRuleFromSettings}
              createTelegramLinkCode={createTelegramLinkCode}
              dashboard={dashboard}
              defaultDicomFirstFrameViewerState={defaultDicomFirstFrameViewerState}
              dentalMaterialKindLabels={dentalMaterialKindLabels}
              dentalRestorationTypeLabels={dentalRestorationTypeLabels}
              dicomFirstFrameImageStyle={dicomFirstFrameImageStyle}
              dicomFirstFramePreview={dicomFirstFramePreview}
              dicomFirstFrameStatusLabels={dicomFirstFrameStatusLabels}
              dicomFirstFrameViewerState={dicomFirstFrameViewerState}
              dicomFolderSeriesScan={dicomFolderSeriesScan}
              dicomFolderWorkupPathLabels={dicomFolderWorkupPathLabels}
              dicomFolderWorkupPlan={dicomFolderWorkupPlan}
              dicomDiagnosticPixelPolicyLabels={dicomDiagnosticPixelPolicyLabels}
              dicomExecutionLaneLabels={dicomExecutionLaneLabels}
              dicomGpuClassLabels={dicomGpuClassLabels}
              dicomLabel={dicomLabel}
              dicomLocalFolderDiscovery={dicomLocalFolderDiscovery}
              dicomQualityModeLabels={dicomQualityModeLabels}
              dicomReadinessCheckLabels={dicomReadinessCheckLabels}
              dicomRenderMemoryBudgetClassLabels={dicomRenderMemoryBudgetClassLabels}
              dicomRenderCachePlan={dicomRenderCachePlan}
              dicomRuntimeTierLabels={dicomRuntimeTierLabels}
              dicomSeriesPreview={dicomSeriesPreview}
              dicomSeriesViewerLabels={dicomSeriesViewerLabels}
              dicomTextureStrategyLabels={dicomTextureStrategyLabels}
              dicomViewerLaunchManifest={dicomViewerLaunchManifest}
              dicomViewerLaunchModeLabels={dicomViewerLaunchModeLabels}
              dicomViewerToolStateBundle={dicomViewerToolStateBundle}
              dicomViewerWorkbenchManifest={dicomViewerWorkbenchManifest}
              dicomWebCheck={dicomWebCheck}
              dicomWebEndpointUrl={dicomWebEndpointUrl}
              dicomWebStatusLabels={dicomWebStatusLabels}
              dicomWorkbenchLocalSavedAt={dicomWorkbenchLocalSavedAt}
              dicomWorkbenchServerBundle={dicomWorkbenchServerBundle}
              dicomWorkbenchSourceIsRedacted={dicomWorkbenchSourceIsRedacted}
              dicomWorkstationReadiness={dicomWorkstationReadiness}
              discoverMigrationSources={discoverMigrationSources}
              discoverDicomFolders={discoverDicomFolders}
              documentDetectedKindLabel={documentDetectedKindLabel}
              documentIngestion={documentIngestion}
              documentIngestionQualityLabels={documentIngestionQualityLabels}
              documentIngestionTarget={documentIngestionTarget}
              documentLabels={documentLabels}
              downloadDicomViewerToolStateBundle={downloadDicomViewerToolStateBundle}
              downloadDicomWorkbenchManifest={downloadDicomWorkbenchManifest}
              downloadMigrationHandoffReport={downloadMigrationHandoffReport}
              downloadPersistenceExport={downloadPersistenceExport}
              downloadSmartImportSafeHandoffReport={downloadSmartImportSafeHandoffReport}
              downloadSmartImportReport={downloadSmartImportReport}
              downloadTelegramQrSvg={downloadTelegramQrSvg}
              filteredTelegramOutboxItems={filteredTelegramOutboxItems}
              formatByteSize={formatByteSize}
              formatDateTime={formatDateTime}
              formatMegabytes={formatMegabytes}
              formatTime={formatTime}
              handleBrowserDirectoryInputChange={handleBrowserDirectoryInputChange}
              handleBrowserMigrationInputChange={handleBrowserMigrationInputChange}
              hiddenTelegramOutboxItemCount={hiddenTelegramOutboxItemCount}
              imagingConnectorCards={imagingConnectorCards}
              imagingFolderPath={imagingFolderPath}
              imagingFolderScan={imagingFolderScan}
              imagingImportCommit={imagingImportCommit}
              imagingImportPreview={imagingImportPreview}
              imagingImportSourceKind={imagingImportSourceKind}
              imagingImportText={imagingImportText}
              imagingKindLabels={imagingKindLabels}
              ctPlanningImplantPlan={ctPlanningImplantPlan}
              ctPlanningActiveQuickActionId={ctPlanningActiveQuickActionId}
              imagingViewerActiveTool={imagingViewerActiveTool}
              imagingSourceChoices={imagingSourceChoices}
              imagingSourceDetails={imagingSourceDetails}
              imagingSourceLabels={imagingSourceLabels}
              imagingViewerCapabilities={imagingViewerCapabilities}
              importCommit={importCommit}
              importIntake={importIntake}
              importPreview={importPreview}
              importSourceKind={importSourceKind}
              importSourceLabels={importSourceLabels}
              importText={importText}
              ingestImportFile={ingestImportFile}
              ingestionTargetLabels={ingestionTargetLabels}
              integrationCapabilityLabels={integrationCapabilityLabels}
              integrationCategoryLabels={integrationCategoryLabels}
              integrationStatusLabels={integrationStatusLabels}
              isBrowserImagingFolderPicking={isBrowserImagingFolderPicking}
              isBrowserMigrationScanning={isBrowserMigrationScanning}
              isClinicalRuleSaving={isClinicalRuleSaving}
              isDicomFirstFramePreviewing={isDicomFirstFramePreviewing}
              isDicomFolderWorkupPlanning={isDicomFolderWorkupPlanning}
              isDicomLocalDiscovering={isDicomLocalDiscovering}
              isDicomManifestBuilding={isDicomManifestBuilding}
              isDicomRenderCachePlanning={isDicomRenderCachePlanning}
              isDicomSeriesPreviewLoading={isDicomSeriesPreviewLoading}
              isDicomToolStateBuilding={isDicomToolStateBuilding}
              isDicomWebChecking={isDicomWebChecking}
              isDicomWorkbenchBuilding={isDicomWorkbenchBuilding}
              isDicomWorkbenchReconnecting={isDicomWorkbenchReconnecting}
              isDicomWorkbenchServerSaving={isDicomWorkbenchServerSaving}
              isDicomWorkstationChecking={isDicomWorkstationChecking}
              isClinicPublicLookupLoading={isClinicPublicLookupLoading}
              isImagingFolderScanning={isImagingFolderScanning}
              isLocalDicomOperationActive={isLocalDicomOperationActive}
              isImagingImportCommitting={isImagingImportCommitting}
              isImagingImportLoading={isImagingImportLoading}
              isImportCommitting={isImportCommitting}
              isImportDictating={isImportDictating}
              isImportLoading={isImportLoading}
              isLocalImagingOrganizing={isLocalImagingOrganizing}
              isMigrationAutopilotLoading={isMigrationAutopilotLoading}
              isMigrationHandoffReportLoading={isMigrationHandoffReportLoading}
              isMigrationSourceDiscovering={isMigrationSourceDiscovering}
              isMigrationSourceProbeLoading={isMigrationSourceProbeLoading}
              isMigrationSourceWorkupLoading={isMigrationSourceWorkupLoading}
              isPersistenceExporting={isPersistenceExporting}
              isPricelistAnalyzing={isPricelistAnalyzing}
              isRecognitionLoading={isRecognitionLoading}
              isSmartImportCommitting={isSmartImportCommitting}
              isSmartImportLoading={isSmartImportLoading}
              isSmartReportLoading={isSmartReportLoading}
              isSmartSafeReportLoading={isSmartSafeReportLoading}
              isTelegramChatLinksLoadingMore={isTelegramChatLinksLoadingMore}
              isTelegramLinkCodesLoadingMore={isTelegramLinkCodesLoadingMore}
              isTelegramLinkCreating={isTelegramLinkCreating}
              isTelegramLoading={isTelegramLoading}
              isTelegramOutboxItemDueForUi={isTelegramOutboxItemDueForUi}
              isTelegramOutboxLoadingMore={isTelegramOutboxLoadingMore}
              isTelegramSendingDue={isTelegramSendingDue}
              isTelegramSettingsSaving={isTelegramSettingsSaving}
              latestDicomWorkbenchServerBundle={latestDicomWorkbenchServerBundle}
              legalMissingFields={legalMissingFields}
              legalReadinessPercent={legalReadinessPercent}
              loadLocalBridgeUsePlans={loadLocalBridgeUsePlans}
              loadMoreTelegramChatLinks={loadMoreTelegramChatLinks}
              loadMoreTelegramLinkCodes={loadMoreTelegramLinkCodes}
              loadMoreTelegramOutbox={loadMoreTelegramOutbox}
              loadPersistenceHealth={loadPersistenceHealth}
              loadPersistenceIntegrity={loadPersistenceIntegrity}
              loadTelegramControlPlane={loadTelegramControlPlane}
              localBridgeReadiness={localBridgeReadiness}
              localBridgeStatusLabels={localBridgeStatusLabels}
              localBridgeStatusState={localBridgeStatusState}
              localBridgeStatusValue={localBridgeStatusValue}
              localBridgeUsePathLabels={localBridgeUsePathLabels}
              localBridgeUsePlans={localBridgeUsePlans}
              localImagingFolderDraft={localImagingFolderDraft}
              localImagingModelRoleLabels={localImagingModelRoleLabels}
              localImagingOrganizer={localImagingOrganizer}
              localImagingOrganizerActionLabels={localImagingOrganizerActionLabels}
              cancelLocalDicomOperation={cancelLocalDicomOperation}
              lookupClinicPublicProfile={lookupClinicPublicProfile}
              lockTelegramAdminSession={() => lockTelegramAdminSession(settingsAdminSecretDomain)}
              markTelegramSettingsDirty={markTelegramSettingsDirty}
              migrationAutopilot={migrationAutopilot}
              migrationSourceDiscovery={migrationSourceDiscovery}
              migrationSourceProbe={migrationSourceProbe}
              migrationSourceWorkup={migrationSourceWorkup}
              mprAxisDeg={mprAxisDeg}
              mprCacheModeLabels={mprCacheModeLabels}
              mprCrosshairEnabled={mprCrosshairEnabled}
              mprLinkedPlanesEnabled={mprLinkedPlanesEnabled}
              mprLoadStrategyLabels={mprLoadStrategyLabels}
              mprProjection={mprProjection}
              mprProjectionLabels={mprProjectionLabels}
              mprResourceTierLabels={mprResourceTierLabels}
              mprSliceIndex={mprSliceIndex}
              mprSlabMm={mprSlabMm}
              mprToolLabels={mprToolLabels}
              mprWorkbenchDraftRestored={mprWorkbenchDraftRestored}
              mprWorkbenchLocalSavedAt={mprWorkbenchLocalSavedAt}
              mprWindowPreset={mprWindowPreset}
              mprWindowPresetLabels={mprWindowPresetLabels}
              newChairHasMicroscope={newChairHasMicroscope}
              newChairHasSurgeryKit={newChairHasSurgeryKit}
              newChairHasXraySensor={newChairHasXraySensor}
              newChairName={newChairName}
              newRuleAction={newRuleAction}
              newRuleBlockedServiceId={newRuleBlockedServiceId}
              newRuleCategory={newRuleCategory}
              newRuleCompletedServiceId={newRuleCompletedServiceId}
              newRuleOwnerRole={newRuleOwnerRole}
              newRuleRequiredServiceId={newRuleRequiredServiceId}
              newRuleSeverity={newRuleSeverity}
              newRuleSpecialty={newRuleSpecialty}
              newRuleTitle={newRuleTitle}
              newRuleTriggerServiceId={newRuleTriggerServiceId}
              newRuleWarningText={newRuleWarningText}
              newStaffName={newStaffName}
              newStaffRole={newStaffRole}
              newStaffSpecialty={newStaffSpecialty}
              normalizedClinicalRuleAction={normalizedClinicalRuleAction}
              normalizedClinicalRuleSeverity={normalizedClinicalRuleSeverity}
              normalizedDentalSpecialty={normalizedDentalSpecialty}
              normalizedServiceCategory={normalizedServiceCategory}
              normalizedStaffRole={normalizedStaffRole}
              normalizedTelegramBotMode={normalizedTelegramBotMode}
              normalizedTelegramLinkSubjectType={normalizedTelegramLinkSubjectType}
              normalizedTelegramOutboxStatusFilter={normalizedTelegramOutboxStatusFilter}
              normalizedTelegramOutboxTemplateFilter={normalizedTelegramOutboxTemplateFilter}
              normalizedTelegramPrivacyMode={normalizedTelegramPrivacyMode}
              normalizeUiLanguageInput={normalizeUiLanguageInput}
              ohifBaseUrl={ohifBaseUrl}
              organizeLocalImagingSources={organizeLocalImagingSources}
              persistenceHealth={persistenceHealth}
              persistenceIntegrity={persistenceIntegrity}
              pickBrowserImagingFolder={pickBrowserImagingFolder}
              pickBrowserMigrationSource={pickBrowserMigrationSource}
              policyAuditEventLabels={policyAuditEventLabels}
              prepareDicomWorkbenchFromFolder={prepareDicomWorkbenchFromFolder}
              previewDicomFirstFrame={previewDicomFirstFrame}
              previewDicomFirstFrameSlice={previewDicomFirstFrameSlice}
              previewDicomSeries={previewDicomSeries}
              planMigrationDiscoveryCandidate={planMigrationDiscoveryCandidate}
              previewMigrationDiscoveryCandidate={previewMigrationDiscoveryCandidate}
              previewMigrationAutopilotSources={previewMigrationAutopilotSources}
              probeMigrationDiscoveryCandidate={probeMigrationDiscoveryCandidate}
              runMigrationAutopilot={runMigrationAutopilot}
              previewImagingImport={previewImagingImport}
              previewImport={previewImport}
              previewSmartImport={previewSmartImport}
              previewTelegramTemplate={previewTelegramTemplate}
              pricelistAnalysis={pricelistAnalysis}
              pricelistImageBase64={pricelistImageBase64}
              pricelistImageName={pricelistImageName}
              pricelistImageNote={pricelistImageNote}
              pricelistItemMaterialText={pricelistItemMaterialText}
              pricelistMaterialSummaryText={pricelistMaterialSummaryText}
              pricelistWarningsText={pricelistWarningsText}
              pricelistParserModeLabels={pricelistParserModeLabels}
              pricelistRecognitionBrandGroups={pricelistRecognitionBrandGroups}
              pricelistRecognitionServiceGroups={pricelistRecognitionServiceGroups}
              pricelistSourceKind={pricelistSourceKind}
              pricelistSourceKindLabels={pricelistSourceKindLabels}
              pricelistText={pricelistText}
              recognitionJob={recognitionJob}
              recognitionKind={recognitionKind}
              recognitionPresets={recognitionPresets}
              recognitionTarget={recognitionTarget}
              recognitionTargetLabels={recognitionTargetLabels}
              recognitionText={recognitionText}
              reconnectDicomWorkbenchFromCurrentFolder={reconnectDicomWorkbenchFromCurrentFolder}
              refreshBrowserContinuity={refreshBrowserContinuity}
              refreshSpeechRuntime={refreshSpeechRuntime}
              clinicPublicLookup={clinicPublicLookup}
              addMigrationDiscoveryCandidateToSmartImport={addMigrationDiscoveryCandidateToSmartImport}
              rememberLocalImagingFolder={rememberLocalImagingFolder}
              reopenOnboarding={reopenOnboarding}
              requestBrowserStoragePersistence={requestBrowserStoragePersistence}
              restoreDicomWorkbenchServerBundle={restoreDicomWorkbenchServerBundle}
              restoreMprWorkbenchLocalDraft={restoreMprWorkbenchLocalDraft}
              revokeTelegramChatLink={revokeTelegramChatLink}
              runRecognitionJob={runRecognitionJob}
              saveChairSchedule={saveChairSchedule}
              saveClinicProfileFromDraft={saveClinicProfileFromDraft}
              saveDicomWorkbenchBundleToServer={saveDicomWorkbenchBundleToServer}
              saveStaffSchedule={saveStaffSchedule}
              saveTelegramSettings={saveTelegramSettings}
              scanDicomFolderSeries={scanDicomFolderSeries}
              scanImagingFolder={scanImagingFolder}
              selectedUiLanguageOption={selectedUiLanguageOption}
              sendDueTelegramOutbox={sendDueTelegramOutbox}
              sendRecognitionResultToImport={sendRecognitionResultToImport}
              sendTelegramOutboxItem={sendTelegramOutboxItem}
              serviceCategoryLabels={serviceCategoryLabels}
              serviceTitle={serviceTitle}
              setDicomFirstFramePreview={setDicomFirstFramePreview}
              setDicomFirstFrameViewerState={setDicomFirstFrameViewerState}
              setDicomFolderSeriesScan={setDicomFolderSeriesScan}
              setDicomFolderWorkupPlan={setDicomFolderWorkupPlan}
              setDicomLocalFolderDiscovery={setDicomLocalFolderDiscovery}
              setDicomRenderCachePlan={setDicomRenderCachePlan}
              setDicomSeriesPreview={setDicomSeriesPreview}
              setDicomViewerLaunchManifest={setDicomViewerLaunchManifest}
              setDicomViewerToolStateBundle={setDicomViewerToolStateBundle}
              setDicomViewerWorkbenchManifest={setDicomViewerWorkbenchManifest}
              setDicomWebCheck={setDicomWebCheck}
              setDicomWebEndpointUrl={setDicomWebEndpointUrl}
              setDicomWorkbenchLocalSavedAt={setDicomWorkbenchLocalSavedAt}
              setDicomWorkstationReadiness={setDicomWorkstationReadiness}
              setDocumentIngestionTarget={setDocumentIngestionTarget}
              setImagingFolderPath={setImagingFolderPath}
              setImagingFolderScan={setImagingFolderScan}
              setImagingImportCommit={setImagingImportCommit}
              setImagingImportPreview={setImagingImportPreview}
              setImagingImportSourceKind={setImagingImportSourceKind}
              setImagingImportText={setImagingImportText}
              selectCtPlanningImplant={selectCtPlanningImplant}
              setImagingViewerActiveTool={setImagingViewerActiveTool}
              setCtPlanningActiveQuickActionId={setCtPlanningActiveQuickActionId}
              setImportCommit={setImportCommit}
              setImportIntake={setImportIntake}
              setImportPreview={setImportPreview}
              setImportSourceKind={setImportSourceKind}
              setImportText={setImportText}
              setLocalImagingOrganizer={setLocalImagingOrganizer}
              setMprAxisDeg={setMprAxisDeg}
              setMprCrosshairEnabled={setMprCrosshairEnabled}
              setMprLinkedPlanesEnabled={setMprLinkedPlanesEnabled}
              setMprProjection={setMprProjection}
              setMprSliceIndex={setMprSliceIndex}
              setMprSlabMm={setMprSlabMm}
              setMprWindowPreset={setMprWindowPreset}
              setNewChairHasMicroscope={setNewChairHasMicroscope}
              setNewChairHasSurgeryKit={setNewChairHasSurgeryKit}
              setNewChairHasXraySensor={setNewChairHasXraySensor}
              setNewChairName={setNewChairName}
              setNewRuleAction={setNewRuleAction}
              setNewRuleBlockedServiceId={setNewRuleBlockedServiceId}
              setNewRuleCategory={setNewRuleCategory}
              setNewRuleCompletedServiceId={setNewRuleCompletedServiceId}
              setNewRuleOwnerRole={setNewRuleOwnerRole}
              setNewRuleRequiredServiceId={setNewRuleRequiredServiceId}
              setNewRuleSeverity={setNewRuleSeverity}
              setNewRuleSpecialty={setNewRuleSpecialty}
              setNewRuleTitle={setNewRuleTitle}
              setNewRuleTriggerServiceId={setNewRuleTriggerServiceId}
              setNewRuleWarningText={setNewRuleWarningText}
              setNewStaffName={setNewStaffName}
              setNewStaffRole={setNewStaffRole}
              setNewStaffSpecialty={setNewStaffSpecialty}
              setOhifBaseUrl={setOhifBaseUrl}
              setPricelistAnalysis={setPricelistAnalysis}
              setPricelistSourceKind={setPricelistSourceKind}
              setPricelistText={setPricelistText}
              setRecognitionJob={setRecognitionJob}
              setRecognitionText={setRecognitionText}
              setSettingsTab={setSettingsTab}
              setSmartImportCommit={setSmartImportCommit}
              setSmartImportMode={setSmartImportMode}
              setSmartImportPreview={setSmartImportPreview}
              setSmartImportText={setSmartImportText}
              setTelegramAdminSecretDraft={
                settingsAdminSecretDomain === "telegram" ? setTelegramAdminSecretDraft : setSettingsAdminSecretDraft
              }
              
              
              
              
              
              
              
              
              
              
              
              
              
              
              
              
              
              
              
              
              
              
              settingsTab={settingsTab}
              settingsTabs={settingsTabs}
              setUiLanguage={setUiLanguage}
              setUsePricelistAi={setUsePricelistAi}
              smartImportCommit={smartImportCommit}
              smartImportMode={smartImportMode}
              smartImportModeLabels={smartImportModeLabels}
              smartImportPreview={smartImportPreview}
              smartImportText={smartImportText}
              specialtyLabels={specialtyLabels}
              speechGatewayCanUpload={speechGatewayCanUpload}
              speechGatewayHealthReport={speechGatewayHealthReport}
              speechGatewayStatus={speechGatewayStatus}
              speechProviderConnectorLabels={speechProviderConnectorLabels}
              speechProviderHealthById={speechProviderHealthById}
              speechProviderHealthLabels={speechProviderHealthLabels}
              speechProviderModeLabels={speechProviderModeLabels}
              speechProviderRuntimeById={speechProviderRuntimeById}
              speechProviderSelectionLabels={speechProviderSelectionLabels}
              speechProviderStatusLabels={speechProviderStatusLabels}
              speechRecordingPathLabels={speechRecordingPathLabels}
              speechRecordingRecovery={speechRecordingRecovery}
              speechRecordingStrategy={speechRecordingStrategy}
              speechRecoveryStateLabels={speechRecoveryStateLabels}
              staffRoleLabels={staffRoleLabels}
              staffScheduleDraftFromWorkingHours={staffScheduleDraftFromWorkingHours}
              stageLocalImagingFolderRecovery={stageLocalImagingFolderRecovery}
              startImportDictation={startImportDictation}
              telegramAdminSecretDraft={settingsAdminSecretDomain === "telegram" ? telegramAdminSecretDraft : settingsAdminSecretDraft}
              telegramAdminSecretSession={settingsAdminSecretDomain === "telegram" ? telegramAdminSecretSession : settingsAdminSecretSession}
              telegramAllowVoiceIntakeDraft={telegramAllowVoiceIntakeDraft}
              telegramBotConfigId={telegramBotConfigId}
              telegramBotUsernameDraft={telegramBotUsernameDraft}
              telegramChatLinkLedger={telegramChatLinkLedger}
              telegramChatLinks={telegramChatLinks}
              telegramClassificationLabels={telegramClassificationLabels}
              telegramDeliveryStatusLabels={telegramDeliveryStatusLabels}
              telegramEnabledFeaturesDraft={telegramEnabledFeaturesDraft}
              telegramFeatureHelp={telegramFeatureHelp}
              telegramFeatureLabel={telegramFeatureLabel}
              telegramFeatureOptions={telegramFeatureOptions}
              telegramFeaturePlan={telegramFeaturePlan}
              telegramHumanMessage={telegramHumanMessage}
              telegramInlineButtonKindLabels={telegramInlineButtonKindLabels}
              telegramInlineButtonRowsFromReplyMarkup={telegramInlineButtonRowsFromReplyMarkup}
              telegramLinkActionState={telegramLinkActionState}
              telegramLinkCode={telegramLinkCode}
              telegramLinkCodeLedger={telegramLinkCodeLedger}
              telegramLinkCodes={telegramLinkCodes}
              telegramLinkCodeStatusLabels={telegramLinkCodeStatusLabels}
              telegramLinkStaffId={telegramLinkStaffId}
              telegramLinkStaffOptions={telegramLinkStaffOptions}
              telegramLinkSubjectType={telegramLinkSubjectType}
              telegramMapsUrlDraft={telegramMapsUrlDraft}
              telegramModeDraft={telegramModeDraft}
              telegramModeHints={telegramModeHints}
              telegramModeLabels={telegramModeLabels}
              telegramOutbox={telegramOutbox}
              telegramOutboxStatusFilter={telegramOutboxStatusFilter}
              telegramOutboxStatusFilterLabels={telegramOutboxStatusFilterLabels}
              telegramOutboxStatusFilterOptions={telegramOutboxStatusFilterOptions}
              telegramOutboxTemplateFilter={telegramOutboxTemplateFilter}
              telegramOutboxTemplateFilterLabels={telegramOutboxTemplateFilterLabels}
              telegramOutboxTemplateFilterOptions={telegramOutboxTemplateFilterOptions}
              telegramOwnBotUsernameDraft={telegramOwnBotUsernameDraft}
              telegramPatientPortalBaseUrlDraft={telegramPatientPortalBaseUrlDraft}
              telegramPostVisitCheckupDelayDrafts={telegramPostVisitCheckupDelayDrafts}
              telegramPostVisitCheckupDelayFields={telegramPostVisitCheckupDelayFields}
              telegramPreview={telegramPreview}
              telegramPrivacyModeDraft={telegramPrivacyModeDraft}
              telegramPrivacyModeHints={telegramPrivacyModeHints}
              telegramPrivacyModeLabels={telegramPrivacyModeLabels}
              telegramQrSvgToDataUrl={telegramQrSvgToDataUrl}
              telegramReminderLeadTimesDraft={telegramReminderLeadTimesDraft}
              telegramReviewRequestDelayDraft={telegramReviewRequestDelayDraft}
              telegramReviewUrlDraft={telegramReviewUrlDraft}
              telegramRevokingLinkId={telegramRevokingLinkId}
              telegramSendingItemId={telegramSendingItemId}
              telegramSettingsDirty={telegramSettingsDirty}
              telegramSettingsSaveError={telegramSettingsSaveError}
              telegramSettingsSaveState={telegramSettingsSaveState}
              telegramStaffEscalationChannelDraft={telegramStaffEscalationChannelDraft}
              telegramStatus={telegramStatus}
              telegramSubjectName={telegramSubjectName}
              telegramTemplateLabels={telegramTemplateLabels}
              telegramTokenTtlDraft={telegramTokenTtlDraft}
              telegramVisualCardFields={telegramVisualCardFields}
              telegramVisualCardUrlDrafts={telegramVisualCardUrlDrafts}
              telegramWebhookBaseUrlDraft={telegramWebhookBaseUrlDraft}
              telegramWelcomeImageUrlDraft={telegramWelcomeImageUrlDraft}
              toggleChairWorkingDay={toggleChairWorkingDay}
              toggleClinicalRule={toggleClinicalRule}
              toggleClinicWorkingDay={toggleClinicWorkingDay}
              toggleStaffWorkingDay={toggleStaffWorkingDay}
              toggleTelegramFeature={toggleTelegramFeature}
              uiLanguage={uiLanguage}
              uiLanguageOptions={uiLanguageOptions}
              unlockTelegramAdminSession={() => unlockTelegramAdminSession(settingsAdminSecretDomain)}
              updateChairScheduleDay={updateChairScheduleDay}
              updateChairScheduleDraft={updateChairScheduleDraft}
              updateClinicProfileDraft={updateClinicProfileDraft}
              updateStaffScheduleDay={updateStaffScheduleDay}
              updateStaffScheduleDraft={updateStaffScheduleDraft}
              updateTelegramPostVisitCheckupDelayDraft={updateTelegramPostVisitCheckupDelayDraft}
              updateTelegramVisualCardUrlDraft={updateTelegramVisualCardUrlDraft}
              usePricelistAi={usePricelistAi}
              visibleTelegramOutboxItems={visibleTelegramOutboxItems}
              weekdayOptions={weekdayOptions}
              workspaceScopeLabels={workspaceScopeLabels}
              staffScheduleDirtyIds={staffScheduleDirtyIds}
              staffScheduleDrafts={staffScheduleDrafts}
              staffScheduleSaveStates={staffScheduleSaveStates}
              staffScheduleSavingId={staffScheduleSavingId}
              chairScheduleDirtyIds={chairScheduleDirtyIds}
              chairScheduleDrafts={chairScheduleDrafts}
              chairScheduleSaveStates={chairScheduleSaveStates}
              chairScheduleSavingId={chairScheduleSavingId}
            />
          </Suspense>
          </WorkspaceRouteErrorBoundary>
        ) : null}

        {currentView === "marketing" ? (
          <Suspense fallback={<AppLoadingState message="Загрузка маркетинга" />}>
            <MarketingView clinicName={dashboard.clinicName} clinicPhone={clinicProfileDraft.phone} />
          </Suspense>
        ) : null}
      </section>
    </main>
  );
}

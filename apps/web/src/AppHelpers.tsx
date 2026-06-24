
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
const ImagingView = lazy(() => import("./ImagingView").then((module) => ({ default: module.ImagingView })));
const VisitView = lazy(() => import("./VisitView").then((module) => ({ default: module.VisitView })));
const FinanceView = lazy(() => import("./FinanceView").then((module) => ({ default: module.FinanceView })));
const CommunicationsView = lazy(() => import("./CommunicationsView").then((module) => ({ default: module.CommunicationsView })));
const DocumentsView = lazy(() => import("./DocumentsView").then((module) => ({ default: module.DocumentsView })));
const SettingsView = lazy(() => import("./SettingsView").then((module) => ({ default: module.SettingsView })));
const ScheduleView = lazy(() => import("./ScheduleView").then((module) => ({ default: module.ScheduleView })));
const PatientsView = lazy(() => import("./PatientsView").then((module) => ({ default: module.PatientsView })));
const MarketingView = lazy(() => import("./MarketingView").then((module) => ({ default: module.MarketingView })));

export function speechGatewayCanUpload(status: SpeechGatewayStatus | null): boolean {
  return Boolean(status?.serverTranscriptionCurrentlyAvailable ?? status?.serverTranscriptionEnabled);
}


export type ImagingViewerState = {
  rotationDeg: number;
  flipHorizontal: boolean;
  inverted: boolean;
  brightness: number;
  contrast: number;
  zoom: number;
};

export type ImagingViewerPlan = {
  label: string;
  mode: "two_d" | "ceph" | "cbct_mpr" | "photo";
  primaryTools: string[];
  presets: string[];
  nextAction: string;
  warnings: string[];
};

export type CbctWorkbenchPlane = { key: MprProjection; title: string; detail: string };
export type MprAxisVisualizerStyle = CSSProperties & {
  "--mpr-axis-deg": string;
  "--mpr-slab-width": string;
  "--mpr-slice-position": string;
};

export function viewerWindowPresetForStudy(kind: ImagingStudyKind | null | undefined): ImagingViewerWindowPreset {
  if (kind === "cbct") return "bone";
  if (kind === "photo") return "photo";
  if (kind === "bitewing") return "caries";
  if (kind === "opg") return "perio";
  return "endo";
}

export const defaultImagingViewerState: ImagingViewerState = {
  rotationDeg: 0,
  flipHorizontal: false,
  inverted: false,
  brightness: 1,
  contrast: 1.08,
  zoom: 1
};

export const defaultDicomFirstFrameViewerState: ImagingViewerState = {
  rotationDeg: 0,
  flipHorizontal: false,
  inverted: false,
  brightness: 1,
  contrast: 1,
  zoom: 1
};

export type ImagingViewerLocalDraft = {
  state: ImagingViewerSessionState;
  annotations: ImagingViewerAnnotation[];
  clientSavedAt: string;
  serverSavedAt: string | null;
};

export type ImagingViewerSaveState = "idle" | "local" | "saving" | "saved" | "queued" | "error";

export type DicomWorkbenchLocalDraft = {
  manifest: DicomViewerWorkbenchManifestResponse;
  clientSavedAt: string;
  seriesKey: string;
};

export type DicomWorkbenchIndexedDbDraft = DicomWorkbenchLocalDraft & {
  storageKey: string;
  organizationId: string | null;
};

export type MprWorkbenchState = {
  projection: MprProjection;
  axisDeg: number;
  slabMm: number;
  sliceIndex: number;
  windowPreset: MprWindowPreset;
  crosshair: boolean;
  linkedPlanes: boolean;
};

export type MprWorkbenchLocalDraft = {
  version: 1;
  seriesKey: string;
  state: MprWorkbenchState;
  clientSavedAt: string;
};

export type MprWorkbenchIndexedDbDraft = MprWorkbenchLocalDraft & {
  storageKey: string;
  organizationId: string | null;
};

export type LocalImagingFolderDraft = {
  version: 1;
  folderPath: string;
  safeDisplayName: string;
  sourceLabel: string;
  sourceKind: string;
  folderFingerprint: string | null;
  origin: "manual" | "discovery" | "organizer" | "workbench";
  savedAt: string;
};

export type DicomFirstFramePreviewMetadata = Partial<Omit<LocalImagingFolderDraft, "version" | "folderPath" | "savedAt">>;

export type DicomFirstFramePreviewRequestContext = {
  folderPath: string;
  metadata: DicomFirstFramePreviewMetadata;
};

export type DicomFirstFramePreviewOptions = {
  preferredFileIndex?: number;
  resetViewer?: boolean;
};

export type BrowserFileSystemFileHandle = {
  kind: "file";
  name: string;
  getFile: () => Promise<File>;
};

export type BrowserFileSystemDirectoryHandle = {
  kind: "directory";
  name: string;
  entries: () => AsyncIterable<[string, BrowserFileSystemHandle]>;
};

export type BrowserFileSystemHandle = BrowserFileSystemFileHandle | BrowserFileSystemDirectoryHandle;

export type BrowserDirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: { id?: string; mode?: "read" | "readwrite"; startIn?: string }) => Promise<BrowserFileSystemDirectoryHandle>;
};

export type DentalDesktopRuntimeWindow = BrowserDirectoryPickerWindow & {
  dentalCrmDesktop?: { dicomBridge?: unknown; localFileBridge?: unknown };
  __DENTAL_CRM_DESKTOP__?: unknown;
  __TAURI__?: unknown;
  electronAPI?: unknown;
};

export type BrowserPickedImagingFolderPreview = {
  version: 1;
  safeDisplayName: string;
  sourceLabel: string;
  sourceKind: "browser_directory_picker" | "browser_file_input";
  folderFingerprint: string;
  rootName: string;
  scannedFiles: number;
  scannedFolders: number;
  dicomLikeFiles: number;
  archiveFiles: number;
  modelFiles: number;
  imageFiles: number;
  totalBytes: number;
  createdAt: string;
  nextAction: string;
  warnings: string[];
};

export type BrowserPickedImagingScanStats = {
  rootName: string;
  sourceKind: BrowserPickedImagingFolderPreview["sourceKind"];
  scannedFiles: number;
  scannedFolders: number;
  dicomLikeFiles: number;
  archiveFiles: number;
  modelFiles: number;
  imageFiles: number;
  totalBytes: number;
  warnings: string[];
};

export type BrowserImagingScanPhase = "scanning" | "done" | "cancelled";

export type BrowserImagingScanProgress = BrowserPickedImagingScanStats & {
  phase: BrowserImagingScanPhase;
  currentItem: string | null;
  startedAt: string;
  updatedAt: string;
  elapsedMs: number;
  processedUnits: number;
  fileLimit: number;
  folderLimit: number;
  magicReadLimit: number;
};

export type BrowserImagingScanOptions = {
  signal?: AbortSignal;
  startedAt: string;
  onProgress?: (progress: BrowserImagingScanProgress) => void;
};

export type LocalDicomOperationOptions = {
  signal?: AbortSignal;
};

export type BrowserImagingScanRuntime = {
  startedAt: string;
  startedAtMs: number;
  processedUnits: number;
  lastYieldAtMs: number;
  lastProgressAtMs: number;
};

export type BrowserMigrationSourceKind = MigrationLocalSourceDiscoveryResponse["candidates"][number]["sourceKind"];

export type BrowserMigrationFileKind = "database" | "dump" | "table" | "archive" | "dicom" | "image" | "model" | "other";

export type BrowserMigrationFolderStats = {
  folderKey: string;
  folderHint: string;
  depth: number;
  databaseFiles: number;
  dumpFiles: number;
  tableFiles: number;
  archiveFiles: number;
  dicomLikeFiles: number;
  imageFiles: number;
  modelFiles: number;
  hasDicomDir: boolean;
  latestModifiedAt: string | null;
  totalBytes: number;
};

export type BrowserMigrationScanStats = {
  rootName: string;
  sourceKind: "browser_directory_picker" | "browser_file_input";
  scannedFiles: number;
  scannedFolders: number;
  databaseFiles: number;
  dumpFiles: number;
  tableFiles: number;
  archiveFiles: number;
  dicomLikeFiles: number;
  imageFiles: number;
  modelFiles: number;
  totalBytes: number;
  warnings: string[];
};

export type BrowserMigrationScanPhase = "scanning" | "done" | "cancelled";

export type BrowserMigrationScanProgress = BrowserMigrationScanStats & {
  phase: BrowserMigrationScanPhase;
  currentItem: string | null;
  startedAt: string;
  updatedAt: string;
  elapsedMs: number;
  processedUnits: number;
  fileLimit: number;
  folderLimit: number;
  magicReadLimit: number;
};

export type BrowserMigrationScanOptions = {
  signal?: AbortSignal;
  startedAt: string;
  onProgress?: (progress: BrowserMigrationScanProgress) => void;
};

export type BrowserMigrationScanRuntime = {
  startedAt: string;
  startedAtMs: number;
  processedUnits: number;
  lastYieldAtMs: number;
  lastProgressAtMs: number;
};

export const imagingViewerLocalStoragePrefix = "dental-crm:imaging-viewer:";
export const dicomWorkbenchLocalStorageKey = "dental-crm:dicom-workbench:last";
export const mprWorkbenchLocalStoragePrefix = "dental-crm:ct-mpr-workbench:";
export const localImagingFolderStorageKey = "dental-crm:local-imaging-folder:last";
export const browserPickedImagingFolderStorageKey = "dental-crm:browser-picked-imaging-folder:last";
export const browserMigrationScanFileLimit = 1200;
export const browserMigrationScanFolderLimit = 320;
export const browserMigrationScanDirectoryEntryLimit = 1600;
export const browserMigrationScanMagicReadLimit = 220;
export const browserMigrationScanYieldEveryUnits = 24;
export const browserMigrationScanYieldEveryMs = 20;
export const browserMigrationScanProgressEveryUnits = 12;
export const browserMigrationScanProgressEveryMs = 96;
export const browserImagingScanFileLimit = 900;
export const browserImagingScanFolderLimit = 260;
export const browserImagingScanDirectoryEntryLimit = 1600;
export const browserImagingScanMagicReadLimit = 180;
export const browserImagingScanYieldEveryUnits = 24;
export const browserImagingScanYieldEveryMs = 20;
export const browserImagingScanProgressEveryUnits = 12;
export const browserImagingScanProgressEveryMs = 96;
export const uiPreferencesStorageKey = "dental-crm:web-ui-preferences:v1";
export const documentPaymentSelectionStorageKey = "dental-crm:document-payment-selection:v1";
export const documentPayloadDraftStorageKey = "dental-crm:document-payload-drafts:v1";
export const documentIssueSignatureStorageKey = "dental-crm:document-issue-signature:v1";
export const uiPreferencesServerPath = "/api/settings/preferences";
export const onboardingStorageKey = "dental-crm:onboarding:v1";
export const clinicProfileEndpoint = "/api/settings/clinic/profile";
export const denteAdminSecretHeaderName = "x-dente-admin-secret";
export const localConvenienceRetentionMs = 30 * 24 * 60 * 60 * 1000;
export const sensitiveLocalDraftRetentionMs = 7 * 24 * 60 * 60 * 1000;
export const speechAudioQueueRetentionMs = 48 * 60 * 60 * 1000;

export type DocumentPaymentSelectionEntry = {
  paymentIds: string[];
  savedAt: string;
};

export type DocumentPaymentSelectionStore = {
  version: 1;
  selections: Record<string, DocumentPaymentSelectionEntry>;
};

export type Outpatient025uDocumentDraftFields = {
  recordExtractPeriodStart: string;
  recordExtractPeriodEnd: string;
  recordExtractSourceVisitIds: string;
  recordExtractComplaintAndAnamnesis: string;
  recordExtractObjectiveStatus: string;
  recordExtractDiagnosis: string;
  recordExtractTreatmentProvided: string;
  recordExtractRecommendations: string;
  recordExtractDoctorFullName: string;
  recordExtractPreparedFromSignedRecords: boolean;
  outpatient025uMedicalCardNumber: string;
  outpatient025uOpenedAt: string;
  outpatient025uPatientSexCode: "1" | "2" | "unknown";
  outpatient025uCitizenship: string;
  outpatient025uRegistrationUrbanRuralCode: "1" | "2" | "unknown";
  outpatient025uStayUrbanRuralCode: "1" | "2" | "unknown";
  outpatient025uOmsIssuedAt: string;
  outpatient025uInsurerName: string;
  outpatient025uSocialSupportCode: string;
  outpatient025uHealthStatusDisclosureContact: string;
  outpatient025uEmploymentCode: string;
  outpatient025uDisabilityGroup: string;
  outpatient025uWorkOrStudyPlace: string;
  outpatient025uPalliativeCareNeedCode: string;
  outpatient025uBloodGroup: string;
  outpatient025uRhFactor: string;
  outpatient025uKellK1: string;
  outpatient025uOtherBloodData: string;
  outpatient025uAllergyHistory: string;
  outpatient025uFinalEpicrisis: string;
  outpatient025uOfficialForm274nChecked: boolean;
  outpatient025uThirdPartyDataChecked: boolean;
};

export type MedicalRecordExtractDocumentDraftFields = {
  recordExtractPeriodStart: string;
  recordExtractPeriodEnd: string;
  recordExtractSourceVisitIds: string;
  recordExtractComplaintAndAnamnesis: string;
  recordExtractObjectiveStatus: string;
  recordExtractDiagnosis: string;
  recordExtractTreatmentProvided: string;
  recordExtractRecommendations: string;
  recordExtractDoctorFullName: string;
  recordExtractRecipientFullName: string;
  recordExtractRecipientAuthority: string;
  recordExtractIssuedAt: string;
  recordExtractPreparedFromSignedRecords: boolean;
  recordExtractThirdPartyDataChecked: boolean;
};

export type DocumentPayloadDraftEntry = {
  kind: "outpatient_medical_card_025u" | "medical_record_extract";
  patientId: string;
  visitId: string | null;
  savedAt: string;
  fields: Outpatient025uDocumentDraftFields | MedicalRecordExtractDocumentDraftFields;
};

export type DocumentPayloadDraftStore = {
  version: 1;
  drafts: Record<string, DocumentPayloadDraftEntry>;
};

export type DocumentIssueSignatureDraft = {
  version: 1;
  mode: DocumentIssueSignatureMode;
  staffFullName: string;
  staffRole: string;
  savedAt: string;
};

export const documentIssueSignatureModeLabels: Record<DocumentIssueSignatureMode, string> = {
  paper_signed: "Бумажный экземпляр подписан",
  simple_electronic_signature: "Простая электронная подпись",
  qualified_electronic_signature: "УКЭП"
};

export const documentVoidReasonLabels: Record<DocumentVoidReasonCode, string> = {
  draft_error: "Ошибка в черновике",
  issued_in_error: "Документ выдан с ошибкой",
  patient_request: "Запрос пациента или представителя",
  duplicate_document: "Дубль документа",
  tax_certificate_correction: "Коррекция налоговой справки",
  medical_release_correction: "Коррекция выдачи меддокументов",
  payment_correction: "Коррекция оплаты или чека",
  other: "Другая причина"
};

export function browserGeneratedId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function currentLocalDateTimeInputValue(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function normalizedDocumentIssueSignatureMode(value: unknown): DocumentIssueSignatureMode {
  return value === "simple_electronic_signature" || value === "qualified_electronic_signature" || value === "paper_signed"
    ? value
    : "paper_signed";
}

export function organizationScopedLocalStorageKey(baseKey: string, organizationId: string | null | undefined): string {
  const normalizedOrganizationId = organizationId?.trim();
  return normalizedOrganizationId ? `${baseKey}:${normalizedOrganizationId}` : baseKey;
}

export function normalizedLocalOrganizationId(organizationId: string | null | undefined): string | null {
  const normalized = organizationId?.trim();
  return normalized || null;
}

export function localSavedAtFresh(savedAt: string | null | undefined, retentionMs: number, nowMs = Date.now()): boolean {
  if (!savedAt) return false;
  const timestamp = Date.parse(savedAt);
  if (!Number.isFinite(timestamp)) return false;
  return timestamp <= nowMs + 5 * 60 * 1000 && nowMs - timestamp <= retentionMs;
}

export function documentIssueSignatureLocalKey(organizationId: string | null | undefined): string {
  return organizationScopedLocalStorageKey(documentIssueSignatureStorageKey, organizationId);
}

export function documentPaymentSelectionLocalKey(organizationId: string | null | undefined): string {
  return organizationScopedLocalStorageKey(documentPaymentSelectionStorageKey, organizationId);
}

export function documentPayloadDraftLocalKey(organizationId: string | null | undefined): string {
  return organizationScopedLocalStorageKey(documentPayloadDraftStorageKey, organizationId);
}

export function onboardingLocalKey(organizationId: string | null | undefined): string {
  return organizationScopedLocalStorageKey(onboardingStorageKey, organizationId);
}

export function loadDocumentIssueSignatureDraft(organizationId: string | null | undefined = null): DocumentIssueSignatureDraft {
  const fallback: DocumentIssueSignatureDraft = {
    version: 1,
    mode: "paper_signed",
    staffFullName: "",
    staffRole: "Врач/администратор",
    savedAt: ""
  };
  if (typeof window === "undefined") return fallback;
  try {
    const localKey = documentIssueSignatureLocalKey(organizationId);
    const raw =
      window.localStorage.getItem(localKey) ??
      (organizationId ? window.localStorage.getItem(documentIssueSignatureStorageKey) : null);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<DocumentIssueSignatureDraft>;
    if (parsed?.version !== 1) return fallback;
    const savedAt = typeof parsed.savedAt === "string" ? parsed.savedAt : "";
    if (!localSavedAtFresh(savedAt, localConvenienceRetentionMs)) {
      window.localStorage.removeItem(localKey);
      if (organizationId) window.localStorage.removeItem(documentIssueSignatureStorageKey);
      return fallback;
    }
    return {
      version: 1,
      mode: normalizedDocumentIssueSignatureMode(parsed.mode),
      staffFullName: typeof parsed.staffFullName === "string" ? parsed.staffFullName.slice(0, 240) : "",
      staffRole: typeof parsed.staffRole === "string" && parsed.staffRole.trim() ? parsed.staffRole.slice(0, 120) : "Врач/администратор",
      savedAt
    };
  } catch {
    return fallback;
  }
}

export function saveDocumentIssueSignatureDraft(
  organizationId: string | null | undefined,
  mode: DocumentIssueSignatureMode,
  staffFullName: string,
  staffRole: string
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      documentIssueSignatureLocalKey(organizationId),
      JSON.stringify({
        version: 1,
        mode,
        staffFullName: staffFullName.trim().slice(0, 240),
        staffRole: staffRole.trim().slice(0, 120) || "Врач/администратор",
        savedAt: new Date().toISOString()
      } satisfies DocumentIssueSignatureDraft)
    );
  } catch (error) {
    console.error("Failed to load signature draft", error);
    // Signature defaults are convenience only; the server still requires explicit attestation on issue.
  }
}

export function emptyDocumentPaymentSelectionStore(): DocumentPaymentSelectionStore {
  return { version: 1, selections: {} };
}

export function normalizedDocumentPaymentSelectionIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const paymentIds: string[] = [];
  const seenPaymentIds = new Set<string>();
  for (const rawPaymentId of value) {
    if (typeof rawPaymentId !== "string") continue;
    const paymentId = rawPaymentId.trim();
    if (!paymentId || paymentId.length > 120 || seenPaymentIds.has(paymentId)) continue;
    seenPaymentIds.add(paymentId);
    paymentIds.push(paymentId);
    if (paymentIds.length >= 80) break;
  }
  return paymentIds;
}

export function loadDocumentPaymentSelectionStore(organizationId: string | null | undefined = null): DocumentPaymentSelectionStore {
  if (typeof window === "undefined") return emptyDocumentPaymentSelectionStore();
  try {
    const localKey = documentPaymentSelectionLocalKey(organizationId);
    const raw =
      window.localStorage.getItem(localKey) ??
      (organizationId ? window.localStorage.getItem(documentPaymentSelectionStorageKey) : null);
    if (!raw) return emptyDocumentPaymentSelectionStore();
    const parsed = JSON.parse(raw) as Partial<DocumentPaymentSelectionStore>;
    if (parsed?.version !== 1 || !parsed.selections || typeof parsed.selections !== "object") {
      return emptyDocumentPaymentSelectionStore();
    }
    const selections: DocumentPaymentSelectionStore["selections"] = {};
    let pruned = false;
    for (const [key, rawEntry] of Object.entries(parsed.selections)) {
      if (!key || key.length > 260 || !rawEntry || typeof rawEntry !== "object") {
        pruned = true;
        continue;
      }
      const entry = rawEntry as Partial<DocumentPaymentSelectionEntry>;
      const savedAt = typeof entry.savedAt === "string" && entry.savedAt ? entry.savedAt : null;
      if (!savedAt || !localSavedAtFresh(savedAt, localConvenienceRetentionMs)) {
        pruned = true;
        continue;
      }
      selections[key] = {
        paymentIds: normalizedDocumentPaymentSelectionIds(entry.paymentIds),
        savedAt
      };
    }
    if (pruned || organizationId) {
      if (Object.keys(selections).length) {
        window.localStorage.setItem(localKey, JSON.stringify({ version: 1, selections } satisfies DocumentPaymentSelectionStore));
      } else {
        window.localStorage.removeItem(localKey);
      }
      if (organizationId) window.localStorage.removeItem(documentPaymentSelectionStorageKey);
    }
    return { version: 1, selections };
  } catch {
    return emptyDocumentPaymentSelectionStore();
  }
}

export function loadDocumentPaymentSelection(organizationId: string | null | undefined, key: string | null): string[] | null {
  if (!key || typeof window === "undefined") return null;
  const entry = loadDocumentPaymentSelectionStore(organizationId).selections[key];
  return entry ? normalizedDocumentPaymentSelectionIds(entry.paymentIds) : null;
}

export function saveDocumentPaymentSelection(
  organizationId: string | null | undefined,
  key: string | null,
  paymentIds: string[]
): void {
  if (!key || typeof window === "undefined") return;
  try {
    const store = loadDocumentPaymentSelectionStore(organizationId);
    store.selections[key] = {
      paymentIds: normalizedDocumentPaymentSelectionIds(paymentIds),
      savedAt: new Date().toISOString()
    };
    const trimmedSelections = Object.fromEntries(
      Object.entries(store.selections)
        .sort((left, right) => right[1].savedAt.localeCompare(left[1].savedAt))
        .slice(0, 80)
    );
    window.localStorage.setItem(
      documentPaymentSelectionLocalKey(organizationId),
      JSON.stringify({ version: 1, selections: trimmedSelections } satisfies DocumentPaymentSelectionStore)
    );
  } catch (error) {
    console.error("Failed to save payment selection", error);
    // Document payment selection is local operator convenience; failed storage must not block document issue.
  }
}

export function todayDateInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export function dateInputValuePlusDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function emptyOutpatient025uDocumentDraftFields(): Outpatient025uDocumentDraftFields {
  const today = todayDateInputValue();
  return {
    recordExtractPeriodStart: today,
    recordExtractPeriodEnd: today,
    recordExtractSourceVisitIds: "",
    recordExtractComplaintAndAnamnesis: "",
    recordExtractObjectiveStatus: "",
    recordExtractDiagnosis: "",
    recordExtractTreatmentProvided: "",
    recordExtractRecommendations: "",
    recordExtractDoctorFullName: "",
    recordExtractPreparedFromSignedRecords: false,
    outpatient025uMedicalCardNumber: "",
    outpatient025uOpenedAt: today,
    outpatient025uPatientSexCode: "unknown",
    outpatient025uCitizenship: "",
    outpatient025uRegistrationUrbanRuralCode: "unknown",
    outpatient025uStayUrbanRuralCode: "unknown",
    outpatient025uOmsIssuedAt: "",
    outpatient025uInsurerName: "",
    outpatient025uSocialSupportCode: "",
    outpatient025uHealthStatusDisclosureContact: "",
    outpatient025uEmploymentCode: "",
    outpatient025uDisabilityGroup: "",
    outpatient025uWorkOrStudyPlace: "",
    outpatient025uPalliativeCareNeedCode: "",
    outpatient025uBloodGroup: "",
    outpatient025uRhFactor: "",
    outpatient025uKellK1: "",
    outpatient025uOtherBloodData: "",
    outpatient025uAllergyHistory: "",
    outpatient025uFinalEpicrisis: "",
    outpatient025uOfficialForm274nChecked: false,
    outpatient025uThirdPartyDataChecked: false
  };
}

export function documentPayloadDraftKey(
  kind: "outpatient_medical_card_025u" | "medical_record_extract",
  organizationId: string | null | undefined,
  patientId: string | null,
  visitId: string | null
): string | null {
  const normalizedOrganizationId = organizationId?.trim();
  if (!normalizedOrganizationId || !patientId) return null;
  return `${kind}:${normalizedOrganizationId}:${patientId}:${visitId ?? "all-visits"}`;
}

export function emptyDocumentPayloadDraftStore(): DocumentPayloadDraftStore {
  return { version: 1, drafts: {} };
}

export function normalizedOutpatient025uCode(value: unknown): "1" | "2" | "unknown" {
  return value === "1" || value === "2" || value === "unknown" ? value : "unknown";
}

export function localDraftString(value: unknown, maxLength = 1200): string {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

export function normalizeOutpatient025uDocumentDraftFields(value: unknown): Outpatient025uDocumentDraftFields | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<Record<keyof Outpatient025uDocumentDraftFields, unknown>>;
  return {
    recordExtractPeriodStart: localDraftString(candidate.recordExtractPeriodStart, 40),
    recordExtractPeriodEnd: localDraftString(candidate.recordExtractPeriodEnd, 40),
    recordExtractSourceVisitIds: localDraftString(candidate.recordExtractSourceVisitIds, 2400),
    recordExtractComplaintAndAnamnesis: localDraftString(candidate.recordExtractComplaintAndAnamnesis),
    recordExtractObjectiveStatus: localDraftString(candidate.recordExtractObjectiveStatus),
    recordExtractDiagnosis: localDraftString(candidate.recordExtractDiagnosis),
    recordExtractTreatmentProvided: localDraftString(candidate.recordExtractTreatmentProvided),
    recordExtractRecommendations: localDraftString(candidate.recordExtractRecommendations),
    recordExtractDoctorFullName: localDraftString(candidate.recordExtractDoctorFullName, 240),
    recordExtractPreparedFromSignedRecords: candidate.recordExtractPreparedFromSignedRecords === true,
    outpatient025uMedicalCardNumber: localDraftString(candidate.outpatient025uMedicalCardNumber, 120),
    outpatient025uOpenedAt: localDraftString(candidate.outpatient025uOpenedAt, 40),
    outpatient025uPatientSexCode: normalizedOutpatient025uCode(candidate.outpatient025uPatientSexCode),
    outpatient025uCitizenship: localDraftString(candidate.outpatient025uCitizenship, 240),
    outpatient025uRegistrationUrbanRuralCode: normalizedOutpatient025uCode(candidate.outpatient025uRegistrationUrbanRuralCode),
    outpatient025uStayUrbanRuralCode: normalizedOutpatient025uCode(candidate.outpatient025uStayUrbanRuralCode),
    outpatient025uOmsIssuedAt: localDraftString(candidate.outpatient025uOmsIssuedAt, 40),
    outpatient025uInsurerName: localDraftString(candidate.outpatient025uInsurerName, 300),
    outpatient025uSocialSupportCode: localDraftString(candidate.outpatient025uSocialSupportCode, 120),
    outpatient025uHealthStatusDisclosureContact: localDraftString(candidate.outpatient025uHealthStatusDisclosureContact, 300),
    outpatient025uEmploymentCode: localDraftString(candidate.outpatient025uEmploymentCode, 120),
    outpatient025uDisabilityGroup: localDraftString(candidate.outpatient025uDisabilityGroup, 120),
    outpatient025uWorkOrStudyPlace: localDraftString(candidate.outpatient025uWorkOrStudyPlace, 300),
    outpatient025uPalliativeCareNeedCode: localDraftString(candidate.outpatient025uPalliativeCareNeedCode, 120),
    outpatient025uBloodGroup: localDraftString(candidate.outpatient025uBloodGroup, 80),
    outpatient025uRhFactor: localDraftString(candidate.outpatient025uRhFactor, 80),
    outpatient025uKellK1: localDraftString(candidate.outpatient025uKellK1, 80),
    outpatient025uOtherBloodData: localDraftString(candidate.outpatient025uOtherBloodData),
    outpatient025uAllergyHistory: localDraftString(candidate.outpatient025uAllergyHistory),
    outpatient025uFinalEpicrisis: localDraftString(candidate.outpatient025uFinalEpicrisis),
    outpatient025uOfficialForm274nChecked: candidate.outpatient025uOfficialForm274nChecked === true,
    outpatient025uThirdPartyDataChecked: candidate.outpatient025uThirdPartyDataChecked === true
  };
}

export function emptyMedicalRecordExtractDocumentDraftFields(): MedicalRecordExtractDocumentDraftFields {
  const today = todayDateInputValue();
  return {
    recordExtractPeriodStart: today,
    recordExtractPeriodEnd: today,
    recordExtractSourceVisitIds: "",
    recordExtractComplaintAndAnamnesis: "",
    recordExtractObjectiveStatus: "",
    recordExtractDiagnosis: "",
    recordExtractTreatmentProvided: "",
    recordExtractRecommendations: "",
    recordExtractDoctorFullName: "",
    recordExtractRecipientFullName: "",
    recordExtractRecipientAuthority: "пациент лично",
    recordExtractIssuedAt: new Date().toLocaleString("ru-RU"),
    recordExtractPreparedFromSignedRecords: false,
    recordExtractThirdPartyDataChecked: false
  };
}

export function normalizeMedicalRecordExtractDocumentDraftFields(value: unknown): MedicalRecordExtractDocumentDraftFields | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<Record<keyof MedicalRecordExtractDocumentDraftFields, unknown>>;
  return {
    recordExtractPeriodStart: localDraftString(candidate.recordExtractPeriodStart, 40),
    recordExtractPeriodEnd: localDraftString(candidate.recordExtractPeriodEnd, 40),
    recordExtractSourceVisitIds: localDraftString(candidate.recordExtractSourceVisitIds, 2400),
    recordExtractComplaintAndAnamnesis: localDraftString(candidate.recordExtractComplaintAndAnamnesis),
    recordExtractObjectiveStatus: localDraftString(candidate.recordExtractObjectiveStatus),
    recordExtractDiagnosis: localDraftString(candidate.recordExtractDiagnosis),
    recordExtractTreatmentProvided: localDraftString(candidate.recordExtractTreatmentProvided),
    recordExtractRecommendations: localDraftString(candidate.recordExtractRecommendations),
    recordExtractDoctorFullName: localDraftString(candidate.recordExtractDoctorFullName, 240),
    recordExtractRecipientFullName: localDraftString(candidate.recordExtractRecipientFullName, 240),
    recordExtractRecipientAuthority: localDraftString(candidate.recordExtractRecipientAuthority, 240) || "пациент лично",
    recordExtractIssuedAt: localDraftString(candidate.recordExtractIssuedAt, 80),
    recordExtractPreparedFromSignedRecords: candidate.recordExtractPreparedFromSignedRecords === true,
    recordExtractThirdPartyDataChecked: candidate.recordExtractThirdPartyDataChecked === true
  };
}

export function loadDocumentPayloadDraftStore(organizationId: string | null | undefined = null): DocumentPayloadDraftStore {
  if (typeof window === "undefined") return emptyDocumentPayloadDraftStore();
  try {
    const localKey = documentPayloadDraftLocalKey(organizationId);
    const raw =
      window.localStorage.getItem(localKey) ??
      (organizationId ? window.localStorage.getItem(documentPayloadDraftStorageKey) : null);
    if (!raw) return emptyDocumentPayloadDraftStore();
    const parsed = JSON.parse(raw) as Partial<DocumentPayloadDraftStore>;
    if (parsed?.version !== 1 || !parsed.drafts || typeof parsed.drafts !== "object") return emptyDocumentPayloadDraftStore();
    const drafts: DocumentPayloadDraftStore["drafts"] = {};
    let pruned = false;
    for (const [key, rawEntry] of Object.entries(parsed.drafts)) {
      if (!key || key.length > 320 || !rawEntry || typeof rawEntry !== "object") {
        pruned = true;
        continue;
      }
      const entry = rawEntry as Partial<DocumentPayloadDraftEntry>;
      if (entry.kind !== "outpatient_medical_card_025u" && entry.kind !== "medical_record_extract") {
        pruned = true;
        continue;
      }
      if (typeof entry.patientId !== "string" || !entry.patientId || typeof entry.savedAt !== "string" || !entry.savedAt) {
        pruned = true;
        continue;
      }
      if (!localSavedAtFresh(entry.savedAt, sensitiveLocalDraftRetentionMs)) {
        pruned = true;
        continue;
      }
      const fields =
        entry.kind === "outpatient_medical_card_025u"
          ? normalizeOutpatient025uDocumentDraftFields(entry.fields)
          : normalizeMedicalRecordExtractDocumentDraftFields(entry.fields);
      if (!fields) {
        pruned = true;
        continue;
      }
      drafts[key] = {
        kind: entry.kind,
        patientId: entry.patientId,
        visitId: typeof entry.visitId === "string" && entry.visitId ? entry.visitId : null,
        savedAt: entry.savedAt,
        fields
      };
    }
    if (pruned || organizationId) {
      if (Object.keys(drafts).length) {
        window.localStorage.setItem(localKey, JSON.stringify({ version: 1, drafts } satisfies DocumentPayloadDraftStore));
      } else {
        window.localStorage.removeItem(localKey);
      }
      if (organizationId) window.localStorage.removeItem(documentPayloadDraftStorageKey);
    }
    return { version: 1, drafts };
  } catch {
    return emptyDocumentPayloadDraftStore();
  }
}

export function loadOutpatient025uDocumentDraft(
  organizationId: string | null | undefined,
  key: string | null
): Outpatient025uDocumentDraftFields | null {
  if (!key || typeof window === "undefined") return null;
  const draft = loadDocumentPayloadDraftStore(organizationId).drafts[key];
  return draft?.kind === "outpatient_medical_card_025u" ? (draft.fields as Outpatient025uDocumentDraftFields) : null;
}

export function saveOutpatient025uDocumentDraft(
  organizationId: string | null | undefined,
  key: string | null,
  patientId: string | null,
  visitId: string | null,
  fields: Outpatient025uDocumentDraftFields
): void {
  if (!key || !patientId || typeof window === "undefined") return;
  try {
    const store = loadDocumentPayloadDraftStore(organizationId);
    store.drafts[key] = {
      kind: "outpatient_medical_card_025u",
      patientId,
      visitId,
      fields: normalizeOutpatient025uDocumentDraftFields(fields) ?? emptyOutpatient025uDocumentDraftFields(),
      savedAt: new Date().toISOString()
    };
    const trimmedDrafts = Object.fromEntries(
      Object.entries(store.drafts)
        .sort((left, right) => right[1].savedAt.localeCompare(left[1].savedAt))
        .slice(0, 60)
    );
    window.localStorage.setItem(
      documentPayloadDraftLocalKey(organizationId),
      JSON.stringify({ version: 1, drafts: trimmedDrafts } satisfies DocumentPayloadDraftStore)
    );
  } catch (error) {
    console.error("Failed to save outpatient 025u document draft", error);
    // Payload drafts are recovery data only; document issue still validates all facts server-side.
  }
}

export function loadMedicalRecordExtractDocumentDraft(
  organizationId: string | null | undefined,
  key: string | null
): MedicalRecordExtractDocumentDraftFields | null {
  if (!key || typeof window === "undefined") return null;
  const draft = loadDocumentPayloadDraftStore(organizationId).drafts[key];
  return draft?.kind === "medical_record_extract" ? (draft.fields as MedicalRecordExtractDocumentDraftFields) : null;
}

export function saveMedicalRecordExtractDocumentDraft(
  organizationId: string | null | undefined,
  key: string | null,
  patientId: string | null,
  visitId: string | null,
  fields: MedicalRecordExtractDocumentDraftFields
): void {
  if (!key || !patientId || typeof window === "undefined") return;
  try {
    const store = loadDocumentPayloadDraftStore(organizationId);
    store.drafts[key] = {
      kind: "medical_record_extract",
      patientId,
      visitId,
      fields: normalizeMedicalRecordExtractDocumentDraftFields(fields) ?? emptyMedicalRecordExtractDocumentDraftFields(),
      savedAt: new Date().toISOString()
    };
    const trimmedDrafts = Object.fromEntries(
      Object.entries(store.drafts)
        .sort((left, right) => right[1].savedAt.localeCompare(left[1].savedAt))
        .slice(0, 60)
    );
    window.localStorage.setItem(
      documentPayloadDraftLocalKey(organizationId),
      JSON.stringify({ version: 1, drafts: trimmedDrafts } satisfies DocumentPayloadDraftStore)
    );
  } catch (error) {
    console.error("Failed to save medical record extract document draft", error);
    // Payload drafts are recovery data only; document issue still validates all facts server-side.
  }
}

export function imagingViewerLocalKey(studyId: string, organizationId: string | null | undefined = null): string {
  const normalizedOrganizationId = organizationId?.trim();
  return `${imagingViewerLocalStoragePrefix}${normalizedOrganizationId ? `${normalizedOrganizationId}:` : ""}${studyId}`;
}

export function loadLocalImagingViewerDraft(studyId: string | null, organizationId: string | null | undefined = null): ImagingViewerLocalDraft | null {
  if (!studyId || typeof window === "undefined") return null;
  try {
    const localKey = imagingViewerLocalKey(studyId, organizationId);
    const raw =
      window.localStorage.getItem(localKey) ??
      (organizationId ? window.localStorage.getItem(imagingViewerLocalKey(studyId)) : null);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ImagingViewerLocalDraft;
    if (!localSavedAtFresh(parsed?.clientSavedAt, sensitiveLocalDraftRetentionMs)) {
      window.localStorage.removeItem(localKey);
      if (organizationId) window.localStorage.removeItem(imagingViewerLocalKey(studyId));
      return null;
    }
    return parsed?.state && Array.isArray(parsed.annotations) ? parsed : null;
  } catch {
    return null;
  }
}

export function dicomWorkbenchSeriesKey(manifest: DicomViewerWorkbenchManifestResponse): string {
  return (
    manifest.toolStateBundle.seriesRef.seriesInstanceUid ??
    manifest.launchManifest.seriesInstanceUid ??
    manifest.toolStateBundle.seriesRef.firstFilePath ??
    manifest.toolStateBundle.seriesRef.sourceName
  );
}

export function offlineDraftOrganizationKey(organizationId: string | null | undefined = null): string {
  return normalizedLocalOrganizationId(organizationId) ?? "default";
}

export function dicomWorkbenchIndexedDbKey(organizationId: string | null | undefined = null): string {
  return `dicom-workbench:${offlineDraftOrganizationKey(organizationId)}`;
}

export function mprWorkbenchIndexedDbKey(seriesKey: string, organizationId: string | null | undefined = null): string {
  return `mpr-workbench:${offlineDraftOrganizationKey(organizationId)}:${seriesKey}`;
}

export function normalizeLocalDicomWorkbenchDraft(value: unknown): DicomWorkbenchLocalDraft | null {
  if (!value || typeof value !== "object") return null;
  const parsed = value as Partial<DicomWorkbenchLocalDraft>;
  if (parsed?.manifest?.version !== "dental-crm-dicom-workbench-v1") return null;
  if (typeof parsed.seriesKey !== "string" || typeof parsed.clientSavedAt !== "string") return null;
  if (!localSavedAtFresh(parsed.clientSavedAt, sensitiveLocalDraftRetentionMs)) return null;
  return {
    manifest: parsed.manifest,
    seriesKey: parsed.seriesKey,
    clientSavedAt: parsed.clientSavedAt
  };
}

export function newerDicomWorkbenchDraft(
  left: DicomWorkbenchLocalDraft | null,
  right: DicomWorkbenchLocalDraft | null
): DicomWorkbenchLocalDraft | null {
  if (!left) return right;
  if (!right) return left;
  return Date.parse(right.clientSavedAt) > Date.parse(left.clientSavedAt) ? right : left;
}

export function loadLocalDicomWorkbenchDraftFromLocalStorage(organizationId: string | null | undefined = null): DicomWorkbenchLocalDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const localKey = organizationScopedLocalStorageKey(dicomWorkbenchLocalStorageKey, organizationId);
    const raw =
      window.localStorage.getItem(localKey) ??
      (organizationId ? window.localStorage.getItem(dicomWorkbenchLocalStorageKey) : null);
    if (!raw) return null;
    const parsed = normalizeLocalDicomWorkbenchDraft(JSON.parse(raw));
    if (!parsed) {
      window.localStorage.removeItem(localKey);
      if (organizationId) window.localStorage.removeItem(dicomWorkbenchLocalStorageKey);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function mprWorkbenchSeriesKey(series: DicomSeriesPreviewGroup | null): string | null {
  if (!series) return null;
  const identity = [
    series.seriesInstanceUid,
    series.studyInstanceUid,
    series.id,
    series.sourceName,
    series.seriesDescription,
    series.studyDescription,
    series.capturedAt
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join("|");
  if (!identity) return null;
  return localImagingFolderFingerprint(`${series.sourceKind}:${identity}:${series.fileCount}`);
}

export function mprWorkbenchLocalKey(seriesKey: string, organizationId: string | null | undefined = null): string {
  const normalizedOrganizationId = organizationId?.trim();
  return `${mprWorkbenchLocalStoragePrefix}${normalizedOrganizationId ? `${normalizedOrganizationId}:` : ""}${seriesKey}`;
}

export function isMprProjection(value: unknown): value is MprProjection {
  return (
    value === "axial" ||
    value === "coronal" ||
    value === "sagittal" ||
    value === "oblique" ||
    value === "panoramic_reconstruction" ||
    value === "three_d_volume" ||
    value === "mip"
  );
}

export function isMprWindowPreset(value: unknown): value is MprWindowPreset {
  return value === "bone" || value === "soft_tissue" || value === "implant" || value === "custom";
}

export function resolveMprWorkbenchProjection(value: unknown, availableProjections: MprProjection[]): MprProjection {
  const projection = isMprProjection(value) ? value : null;
  if (projection && availableProjections.includes(projection)) return projection;
  if (availableProjections.includes("axial")) return "axial";
  return availableProjections[0] ?? "axial";
}

export function normalizeMprWorkbenchState(value: unknown): MprWorkbenchState | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Partial<MprWorkbenchState>;
  if (!isMprProjection(source.projection) || !isMprWindowPreset(source.windowPreset)) return null;
  const axisDeg = Number(source.axisDeg);
  const slabMm = Number(source.slabMm);
  const sliceIndex = Number(source.sliceIndex ?? 0);
  if (!Number.isFinite(axisDeg) || !Number.isFinite(slabMm) || !Number.isFinite(sliceIndex)) return null;
  return {
    projection: source.projection,
    axisDeg: clampMprAxisDeg(axisDeg),
    slabMm: clampMprSlabMm(slabMm),
    sliceIndex: clampMprSliceIndex(sliceIndex, 100000),
    windowPreset: source.windowPreset,
    crosshair: source.crosshair !== false,
    linkedPlanes: source.linkedPlanes !== false
  };
}

export function loadLocalMprWorkbenchDraftFromLocalStorage(
  seriesKey: string | null,
  organizationId: string | null | undefined = null
): MprWorkbenchLocalDraft | null {
  if (!seriesKey || typeof window === "undefined") return null;
  try {
    const localKey = mprWorkbenchLocalKey(seriesKey, organizationId);
    const raw =
      window.localStorage.getItem(localKey) ??
      (organizationId ? window.localStorage.getItem(mprWorkbenchLocalKey(seriesKey)) : null);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MprWorkbenchLocalDraft;
    if (parsed?.version !== 1 || parsed.seriesKey !== seriesKey || !parsed.clientSavedAt) return null;
    if (!localSavedAtFresh(parsed.clientSavedAt, sensitiveLocalDraftRetentionMs)) {
      window.localStorage.removeItem(localKey);
      if (organizationId) window.localStorage.removeItem(mprWorkbenchLocalKey(seriesKey));
      return null;
    }
    const state = normalizeMprWorkbenchState(parsed.state);
    return state ? { ...parsed, state } : null;
  } catch {
    return null;
  }
}

export function saveLocalMprWorkbenchDraftToLocalStorage(
  seriesKey: string,
  state: MprWorkbenchState,
  clientSavedAt: string,
  organizationId: string | null | undefined = null
): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(
      mprWorkbenchLocalKey(seriesKey, organizationId),
      JSON.stringify({ version: 1, seriesKey, state, clientSavedAt } satisfies MprWorkbenchLocalDraft)
    );
    return true;
  } catch {
    return false;
  }
}

export function localImagingFolderFingerprint(folderPath: string): string {
  let hash = 2166136261;
  for (let index = 0; index < folderPath.length; index += 1) {
    hash ^= folderPath.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").toUpperCase();
}

export const dicomDownloadRedactionWarning =
  "Скачанный пакет скрывает локальные пути снимков; перед загрузкой пикселей переподключите папку или устройство на рабочей станции.";

export function uniqueDicomDownloadWarnings(warnings: string[]): string[] {
  return Array.from(new Set(warnings.map((warning) => warning.trim()).filter(Boolean)));
}

export function isLocalDicomDownloadPath(value: string): boolean {
  const input = value.trim();
  if (!input || input.startsWith("redacted-local-dicom-path:")) return false;
  if (/^(?:https?|blob|data):/i.test(input)) return false;
  if (/^[A-Za-z]:[\\/]/.test(input) || input.startsWith("\\\\")) return true;
  if (/^\/(?:Users|Volumes|home|mnt|media|var|tmp|srv|opt|data|storage|dicom|pacs)(?:\/|$)/i.test(input)) return true;
  if (input.includes("::")) return true;
  return /^[^:?#]+[\\/][^:?#]+/.test(input) && !input.startsWith("/");
}

export function redactedLocalDicomDownloadPath(value: string | null): string | null {
  if (!value) return null;
  if (!isLocalDicomDownloadPath(value)) return value;
  return `redacted-local-dicom-path:${localImagingFolderFingerprint(value)}`;
}

export function redactedDicomDownloadReferenceId(value: string | null): string | null {
  if (!value) return null;
  const prefix = "dicomfile:";
  if (value.toLowerCase().startsWith(prefix)) {
    return `${prefix}${redactedLocalDicomDownloadPath(value.slice(prefix.length)) ?? value.slice(prefix.length)}`;
  }
  return redactedLocalDicomDownloadPath(value);
}

export function redactDicomDownloadText(value: string): string {
  return value
    .replace(/dicomfile:([A-Za-z]:[\\/][^\s\r\n]+)/gi, (_match, filePath: string) => {
      return `dicomfile:${redactedLocalDicomDownloadPath(filePath) ?? filePath}`;
    })
    .replace(/[A-Za-z]:[\\/][^\r\n]*(?=:\s|$)/g, (match) => redactedLocalDicomDownloadPath(match) ?? match)
    .replace(/\\\\[^\r\n]*(?=:\s|$)/g, (match) => redactedLocalDicomDownloadPath(match) ?? match);
}

export function redactedDicomDownloadWarnings(warnings: string[]): string[] {
  return uniqueDicomDownloadWarnings(warnings.map((warning) => redactDicomDownloadText(warning)));
}

export function redactedDicomViewerToolStateBundleForDownload(
  bundle: DicomViewerToolStateBundleResponse
): DicomViewerToolStateBundleResponse {
  const clone = JSON.parse(JSON.stringify(bundle)) as DicomViewerToolStateBundleResponse;
  clone.seriesRef.firstFilePath = redactedLocalDicomDownloadPath(clone.seriesRef.firstFilePath);
  clone.viewports = clone.viewports.map((viewport) => ({
    ...viewport,
    referencedImageId: redactedDicomDownloadReferenceId(viewport.referencedImageId)
  }));
  clone.annotations = clone.annotations.map((annotation) => ({
    ...annotation,
    referencedImageId: redactedDicomDownloadReferenceId(annotation.referencedImageId),
    warnings: redactedDicomDownloadWarnings(annotation.warnings)
  }));
  clone.warnings = uniqueDicomDownloadWarnings([
    ...redactedDicomDownloadWarnings(clone.warnings),
    dicomDownloadRedactionWarning
  ]).slice(0, 16);
  return clone;
}

export function redactedDicomWorkbenchManifestForDownload(
  manifest: DicomViewerWorkbenchManifestResponse
): DicomViewerWorkbenchManifestResponse {
  const clone = JSON.parse(JSON.stringify(manifest)) as DicomViewerWorkbenchManifestResponse;
  clone.toolStateBundle = redactedDicomViewerToolStateBundleForDownload(clone.toolStateBundle);
  clone.launchManifest.viewerUrl = redactedLocalDicomDownloadPath(clone.launchManifest.viewerUrl);
  clone.warnings = uniqueDicomDownloadWarnings([
    ...redactedDicomDownloadWarnings(clone.warnings),
    dicomDownloadRedactionWarning
  ]).slice(0, 16);
  clone.readiness.warnings = redactedDicomDownloadWarnings(clone.readiness.warnings);
  clone.renderCachePlan.warnings = redactedDicomDownloadWarnings(clone.renderCachePlan.warnings);
  clone.launchManifest.warnings = redactedDicomDownloadWarnings(clone.launchManifest.warnings);
  return clone;
}

export function classifyBrowserImagingFileName(fileName: string): "dicom" | "archive" | "model" | "image" | "other" {
  const lowerName = fileName.toLowerCase();
  const extension = lowerName.includes(".") ? lowerName.slice(lowerName.lastIndexOf(".") + 1) : "";
  if (["dcm", "dicom", "ima"].includes(extension) || lowerName === "dicomdir") return "dicom";
  if (["zip", "7z", "rar"].includes(extension)) return "archive";
  if (["stl", "obj", "ply", "glb", "gltf", "3mf"].includes(extension)) return "model";
  if (["jpg", "jpeg", "png", "tif", "tiff", "bmp", "webp"].includes(extension)) return "image";
  return "other";
}

export const browserMigrationSourceTitles: Record<BrowserMigrationSourceKind, string> = {
  mis_database: "Старая МИС или CRM",
  firebird_database: "Старая серверная база программы",
  access_database: "Старая настольная база",
  sqlite_database: "Локальная база программы",
  sql_dump: "Резервная копия старой базы",
  spreadsheet_export: "Табличная выгрузка",
  csv_export: "табличная выгрузка",
  archive_export: "Архив выгрузки",
  pacs_dicom: "архив снимков",
  dicom_folder: "папка КЛКТ/КТ",
  xray_image_archive: "Архив RVG/ОПТГ/фото",
  vendor_imaging_system: "Программа снимков",
  network_share: "Сетевая папка обмена",
  unknown_legacy_source: "Неопознанный источник старой системы"
};

export const browserLegacyMisTextPattern =
  /1c|1с|\.1cd\b|мис|инфоклиника|infoclinica|infodent|инфодент|дента\s*офис|denta\s*office|clinic\s*cards|cliniccards|dental\s*4\s*windows|d4w|dental4windows|dental\s*pro|dentpro|dental\s*soft|dentasoft|dental\s*cloud|clinic\s*365|clinic365|medangel|медангел|medialog|медиалог|arnica|арника|sycret\s*dent|secret\s*dent|адента|adenta|dent\s*crm\s*24|dentcrm24|dent\.crm24|клиентикс|clientix|klientix|2v.*(?:стоматолог|dental)|future\s*it\s*dent|futureitdent|32\s*top|32top|medods|медодс|dental\s*tap|dentaltap|(?:^|[\\/])ident(?:[\\/]|$)|\bident\b|stomx|stom\s*x|стомx|стомикс|i[-\s]?stom|ай\s*стом|q[-\s]?stoma|кью\s*стома|бит\.?\s*стоматолог|bit\.?\s*stomatolog|1c.*стоматолог|1с.*стоматолог|mac\s*dent|macdent|stom\s*box|stombox|open\s*dent(?:al)?|opendental|opendent|open\s*dent\s*images|atoz|dentrix|eaglesoft|patterson|softdent|practice\s*works|curve\s*dental|denticon|tab32|dolphin\s*(?:imaging|management)|legacy|старая\s+баз/i;

export function classifyBrowserMigrationFileName(fileName: string): BrowserMigrationFileKind {
  const lowerName = fileName.toLowerCase();
  const extension = lowerName.includes(".") ? lowerName.slice(lowerName.lastIndexOf(".") + 1) : "";
  if (lowerName === "dicomdir" || ["dcm", "dicom", "ima", "dc3", "acr"].includes(extension)) return "dicom";
  if (
    ["fdb", "gdb", "ib", "mdb", "accdb", "sqlite", "sqlite3", "db", "dbf", "dbt", "fpt", "cdx", "idx", "ntx", "ndx", "mdx", "1cd", "mdf", "ldf", "sdf", "myd", "myi", "frm", "ibd"].includes(extension)
  )
    return "database";
  if (["fbk", "ibk", "gbk", "bak", "backup", "dump", "sql", "psql", "pgsql", "dt"].includes(extension)) return "dump";
  if (["csv", "tsv", "xls", "xlsx", "xlsm", "xlsb", "ods", "xml", "json"].includes(extension)) return "table";
  if (["zip", "7z", "rar", "tar", "gz"].includes(extension)) return "archive";
  if (["stl", "obj", "ply", "glb", "gltf", "3mf"].includes(extension)) return "model";
  if (["jpg", "jpeg", "png", "tif", "tiff", "bmp", "webp"].includes(extension)) return "image";
  return "other";
}

export function browserMigrationFolderHintScore(value: string): number {
  const normalized = value.toLowerCase();
  let score = 0;
  if (/dental|denta|clinic|stom|стом|mis|crm|legacy|migration|миграц|перенос|backup|dump|export|выгруз|стар/.test(normalized)) score += 0.14;
  if (browserLegacyMisTextPattern.test(normalized) || /sql|firebird|interbase|access|sqlite/.test(normalized)) score += 0.2;
  if (/sidexis|romexis|planmeca|vatech|carestream|ondemand|invivo|digora|soredex|trophy|visiodent|dbswin|vistasoft|durr|dürr|morita|i[-\s]?dixel|newtom|\bnnt\b|myray|owandy|quick\s*vision|quickvision|dexis|kavo|gendex|acteon|sopro|sopix|pspix|x[-\s]?mind|dolphin|3shape|medit|exocad/.test(normalized)) score += 0.18;
  if (/dicom|dicomdir|cbct|кт|ккт|rvg|opg|оптг|xray|x-ray|рентген|сним|pacs|orthanc|dcm4chee/.test(normalized)) score += 0.18;
  return score;
}

export function browserMigrationSourceKindFromStats(stats: BrowserMigrationFolderStats): BrowserMigrationSourceKind {
  const text = stats.folderHint.toLowerCase();
  if (/sidexis|romexis|planmeca|vatech|carestream|ondemand|invivo|digora|soredex|trophy|visiodent|dbswin|vistasoft|morita|i[-\s]?dixel|newtom|\bnnt\b|myray|owandy|quick\s*vision|quickvision|dexis|kavo|gendex|acteon|sopro|sopix|pspix|x[-\s]?mind|dolphin|3shape|medit|exocad/.test(text)) return "vendor_imaging_system";
  if (stats.hasDicomDir || stats.dicomLikeFiles > 0 || /dicom|cbct|кт|ккт/.test(text)) return "dicom_folder";
  if (stats.imageFiles >= 6 || stats.modelFiles > 0 || /rvg|opg|оптг|xray|рентген|сним/.test(text)) return "xray_image_archive";
  if (/\.fdb|\.gdb|\.fbk|\.ib\b|\.ibk|\.gbk|firebird|interbase/.test(text)) return "firebird_database";
  if (/\.mdb|\.accdb|access/.test(text)) return "access_database";
  if (/\.dbf|\.dbt|\.fpt|\.cdx|\.idx|\.ntx|\.ndx|\.mdx|dbase|foxpro|clipper|paradox/.test(text)) return "mis_database";
  if (/\.sqlite|\.sqlite3|sqlite|\.db\b/.test(text)) return "sqlite_database";
  if (/mysql|mariadb|postgres|postgresql|pgsql|psql|\.myd|\.myi|\.frm|\.ibd/.test(text)) return "mis_database";
  if (stats.dumpFiles > 0 || /\.sql|\.dump|\.bak|\.dt|\.mdf|\.ldf|\.sdf|sql server|mssql/.test(text)) return "sql_dump";
  if (stats.tableFiles > 0) return /\.csv|\.tsv/.test(text) ? "csv_export" : "spreadsheet_export";
  if (stats.archiveFiles > 0) return "archive_export";
  if (browserLegacyMisTextPattern.test(text)) return "mis_database";
  if (stats.databaseFiles > 0) return "mis_database";
  return "unknown_legacy_source";
}

export function buildBrowserMigrationDiscovery(input: {
  rootName: string;
  sourceLabel: string;
  scannedFolders: number;
  scannedFiles: number;
  folderStats: BrowserMigrationFolderStats[];
  warnings: string[];
}): MigrationLocalSourceDiscoveryResponse {
  const candidates = input.folderStats
    .map((stats) => {
      const matchedFiles =
        stats.databaseFiles +
        stats.dumpFiles +
        stats.tableFiles +
        stats.archiveFiles +
        stats.dicomLikeFiles +
        stats.imageFiles +
        stats.modelFiles;
      const hintScore = browserMigrationFolderHintScore(stats.folderHint);
      const confidence = Math.min(
        1,
        hintScore +
          (stats.databaseFiles ? 0.5 : 0) +
          (stats.dumpFiles ? 0.42 : 0) +
          (stats.tableFiles ? 0.28 : 0) +
          (stats.archiveFiles ? 0.2 : 0) +
          (stats.dicomLikeFiles ? 0.46 : 0) +
          (stats.hasDicomDir ? 0.24 : 0) +
          (stats.imageFiles >= 8 ? 0.22 : stats.imageFiles > 0 ? 0.08 : 0) +
          (stats.modelFiles ? 0.1 : 0)
      );
      if (matchedFiles === 0 && hintScore < 0.28) return null;
      const sourceKind = browserMigrationSourceKindFromStats(stats);
      const fingerprint = browserPickedFolderFingerprint(`${input.rootName}:${stats.folderKey}:${matchedFiles}:${stats.totalBytes}`);
      const reasons: string[] = [];
      if (stats.databaseFiles) reasons.push(`${stats.databaseFiles} файлов старой базы`);
      if (stats.dumpFiles) reasons.push(`${stats.dumpFiles} файлов резервной копии`);
      if (stats.tableFiles) reasons.push(`${stats.tableFiles} табличных выгрузок`);
      if (stats.archiveFiles) reasons.push(`${stats.archiveFiles} архивов`);
      if (stats.dicomLikeFiles) reasons.push(`${stats.dicomLikeFiles} признаков снимков или серий КТ`);
      if (stats.imageFiles) reasons.push(`${stats.imageFiles} изображений`);
      if (stats.modelFiles) reasons.push(`${stats.modelFiles} 3D-моделей зубов`);
      if (hintScore > 0) reasons.push("название папки похоже на старую CRM/снимки/миграцию");
      return {
        sourceRef: `browser-local:${fingerprint}`,
        safeDisplayName: `${browserMigrationSourceTitles[sourceKind]} #${fingerprint}`,
        sourceKind,
        sourceLabel: input.sourceLabel,
        sourceFingerprint: fingerprint,
        depth: stats.depth,
        confidence: Number(confidence.toFixed(2)),
        matchedFiles,
        databaseFiles: stats.databaseFiles,
        dumpFiles: stats.dumpFiles,
        tableFiles: stats.tableFiles,
        archiveFiles: stats.archiveFiles,
        dicomLikeFiles: stats.dicomLikeFiles,
        imageFiles: stats.imageFiles + stats.modelFiles,
        hasDicomDir: stats.hasDicomDir,
        latestModifiedAt: stats.latestModifiedAt,
        reasons,
        warnings: ["Выбранная через браузер папка не дает полного пути; для автоматического переноса нужен локальный модуль или ручной путь администратора."],
        smartImportLine: `Источник старой системы: ${browserMigrationSourceTitles[sourceKind]}; код источника browser-local:${fingerprint}; файлов=${matchedFiles}; старых баз=${stats.databaseFiles}; копий=${stats.dumpFiles}; таблиц=${stats.tableFiles}; КТ/снимков=${stats.dicomLikeFiles}; изображений=${stats.imageFiles}; моделей=${stats.modelFiles}`
      };
    })
    .filter((candidate): candidate is MigrationLocalSourceDiscoveryResponse["candidates"][number] => Boolean(candidate))
    .sort(
      (left, right) =>
        right.confidence - left.confidence ||
        right.matchedFiles - left.matchedFiles ||
        (right.latestModifiedAt ?? "").localeCompare(left.latestModifiedAt ?? "")
    )
    .slice(0, 18);

  return {
    version: "dental-crm-migration-local-discovery-v1",
    generatedAt: new Date().toISOString(),
    roots: [`browser-local:${browserPickedFolderFingerprint(`${input.rootName}:${input.scannedFiles}:${input.scannedFolders}`)}`],
    scannedFolders: input.scannedFolders,
    candidates,
    warnings: [
      ...input.warnings,
      "Браузерный список читает только выбранную папку/файлы и не раскрывает серверу полный локальный путь.",
      ...(candidates.length ? [] : ["В выбранной папке не найдено старых баз, снимков, архивов или выгрузок в пределах лимитов."])
    ],
    nextAction: candidates.length
      ? "Откройте план по найденному кандидату из браузера или отправьте его в умный разбор как список найденных файлов."
      : "Выберите корень старой МИС/снимков выше уровнем или запустите локальный модуль миграции для полного автопоиска по ПК."
  };
}

export async function browserFileHasDicomMagic(file: File): Promise<boolean> {
  if (file.size < 132) return false;
  try {
    const bytes = new Uint8Array(await file.slice(128, 132).arrayBuffer());
    return bytes[0] === 0x44 && bytes[1] === 0x49 && bytes[2] === 0x43 && bytes[3] === 0x4d;
  } catch {
    return false;
  }
}

export function browserImagingScanNowMs(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
}

export function createBrowserImagingScanRuntime(startedAt: string): BrowserImagingScanRuntime {
  const now = browserImagingScanNowMs();
  return {
    startedAt,
    startedAtMs: now,
    processedUnits: 0,
    lastYieldAtMs: now,
    lastProgressAtMs: now
  };
}

export function browserImagingScanElapsedFromIso(startedAt: string, updatedAt: string): number {
  const start = Date.parse(startedAt);
  const end = Date.parse(updatedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return end - start;
}

export function throwIfBrowserImagingScanAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  const error = new Error("Browser imaging scan cancelled");
  error.name = "AbortError";
  throw error;
}

export function isBrowserImagingScanAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    String((error as { name?: unknown }).name) === "AbortError"
  );
}

export async function browserImagingScanYield(): Promise<void> {
  const scheduler = (globalThis as typeof globalThis & { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  if (typeof scheduler?.yield === "function") {
    await scheduler.yield();
    return;
  }
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

export function browserImagingScanProgressFromStats(
  stats: BrowserPickedImagingScanStats,
  runtime: BrowserImagingScanRuntime,
  phase: BrowserImagingScanPhase,
  currentItem: string | null
): BrowserImagingScanProgress {
  const now = browserImagingScanNowMs();
  return {
    ...stats,
    warnings: [...stats.warnings],
    phase,
    currentItem,
    startedAt: runtime.startedAt,
    updatedAt: new Date().toISOString(),
    elapsedMs: Math.max(0, Math.round(now - runtime.startedAtMs)),
    processedUnits: runtime.processedUnits,
    fileLimit: browserImagingScanFileLimit,
    folderLimit: browserImagingScanFolderLimit,
    magicReadLimit: browserImagingScanMagicReadLimit
  };
}

export function publishBrowserImagingScanProgress(
  stats: BrowserPickedImagingScanStats,
  options: BrowserImagingScanOptions,
  runtime: BrowserImagingScanRuntime,
  currentItem: string | null,
  phase: BrowserImagingScanPhase = "scanning",
  force = false
): void {
  if (!options.onProgress) return;
  const now = browserImagingScanNowMs();
  const shouldPublish =
    force ||
    runtime.processedUnits % browserImagingScanProgressEveryUnits === 0 ||
    now - runtime.lastProgressAtMs >= browserImagingScanProgressEveryMs;
  if (!shouldPublish) return;
  runtime.lastProgressAtMs = now;
  options.onProgress(browserImagingScanProgressFromStats(stats, runtime, phase, currentItem));
}

export async function maybeYieldBrowserImagingScan(runtime: BrowserImagingScanRuntime, signal?: AbortSignal): Promise<void> {
  throwIfBrowserImagingScanAborted(signal);
  const now = browserImagingScanNowMs();
  const shouldYield =
    runtime.processedUnits % browserImagingScanYieldEveryUnits === 0 || now - runtime.lastYieldAtMs >= browserImagingScanYieldEveryMs;
  if (!shouldYield) return;
  runtime.lastYieldAtMs = now;
  await browserImagingScanYield();
  throwIfBrowserImagingScanAborted(signal);
}

export function createBrowserMigrationScanRuntime(startedAt: string): BrowserMigrationScanRuntime {
  const now = browserImagingScanNowMs();
  return {
    startedAt,
    startedAtMs: now,
    processedUnits: 0,
    lastYieldAtMs: now,
    lastProgressAtMs: now
  };
}

export function throwIfBrowserMigrationScanAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  const error = new Error("Browser migration scan cancelled");
  error.name = "AbortError";
  throw error;
}

export function isBrowserMigrationScanAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    String((error as { name?: unknown }).name) === "AbortError"
  );
}

export function browserMigrationScanProgressFromStats(
  stats: BrowserMigrationScanStats,
  runtime: BrowserMigrationScanRuntime,
  phase: BrowserMigrationScanPhase,
  currentItem: string | null
): BrowserMigrationScanProgress {
  const now = browserImagingScanNowMs();
  return {
    ...stats,
    warnings: [...stats.warnings],
    phase,
    currentItem,
    startedAt: runtime.startedAt,
    updatedAt: new Date().toISOString(),
    elapsedMs: Math.max(0, Math.round(now - runtime.startedAtMs)),
    processedUnits: runtime.processedUnits,
    fileLimit: browserMigrationScanFileLimit,
    folderLimit: browserMigrationScanFolderLimit,
    magicReadLimit: browserMigrationScanMagicReadLimit
  };
}

export function publishBrowserMigrationScanProgress(
  stats: BrowserMigrationScanStats,
  options: BrowserMigrationScanOptions,
  runtime: BrowserMigrationScanRuntime,
  currentItem: string | null,
  phase: BrowserMigrationScanPhase = "scanning",
  force = false
): void {
  if (!options.onProgress) return;
  const now = browserImagingScanNowMs();
  const shouldPublish =
    force ||
    runtime.processedUnits % browserMigrationScanProgressEveryUnits === 0 ||
    now - runtime.lastProgressAtMs >= browserMigrationScanProgressEveryMs;
  if (!shouldPublish) return;
  runtime.lastProgressAtMs = now;
  options.onProgress(browserMigrationScanProgressFromStats(stats, runtime, phase, currentItem));
}

export async function maybeYieldBrowserMigrationScan(runtime: BrowserMigrationScanRuntime, signal?: AbortSignal): Promise<void> {
  throwIfBrowserMigrationScanAborted(signal);
  const now = browserImagingScanNowMs();
  const shouldYield =
    runtime.processedUnits % browserMigrationScanYieldEveryUnits === 0 || now - runtime.lastYieldAtMs >= browserMigrationScanYieldEveryMs;
  if (!shouldYield) return;
  runtime.lastYieldAtMs = now;
  await browserImagingScanYield();
  throwIfBrowserMigrationScanAborted(signal);
}

export function addBrowserMigrationKindToScanStats(
  stats: BrowserMigrationScanStats,
  kind: BrowserMigrationFileKind,
  fileSize: number
): void {
  stats.totalBytes += fileSize;
  if (kind === "database") stats.databaseFiles += 1;
  else if (kind === "dump") stats.dumpFiles += 1;
  else if (kind === "table") stats.tableFiles += 1;
  else if (kind === "archive") stats.archiveFiles += 1;
  else if (kind === "dicom") stats.dicomLikeFiles += 1;
  else if (kind === "image") stats.imageFiles += 1;
  else if (kind === "model") stats.modelFiles += 1;
}

export function browserPickedFolderFingerprint(input: string): string {
  return localImagingFolderFingerprint(input || "browser-local-imaging-folder");
}

export function saveBrowserPickedImagingFolderPreview(
  preview: BrowserPickedImagingFolderPreview,
  organizationId: string | null | undefined = null
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      organizationScopedLocalStorageKey(browserPickedImagingFolderStorageKey, organizationId),
      JSON.stringify(preview)
    );
  } catch (error) {
    console.error("Failed to save browser picked imaging folder preview", error);
    // Browser-picked folder summaries are best-effort and contain no raw local path.
  }
}

export function loadBrowserPickedImagingFolderPreview(
  organizationId: string | null | undefined = null
): BrowserPickedImagingFolderPreview | null {
  if (typeof window === "undefined") return null;
  try {
    const localKey = organizationScopedLocalStorageKey(browserPickedImagingFolderStorageKey, organizationId);
    const raw =
      window.localStorage.getItem(localKey) ??
      (organizationId ? window.localStorage.getItem(browserPickedImagingFolderStorageKey) : null);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BrowserPickedImagingFolderPreview;
    if (parsed?.version !== 1 || !parsed.folderFingerprint || !parsed.createdAt) return null;
    if (!localSavedAtFresh(parsed.createdAt, localConvenienceRetentionMs)) {
      window.localStorage.removeItem(localKey);
      if (organizationId) window.localStorage.removeItem(browserPickedImagingFolderStorageKey);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function removeBrowserPickedImagingFolderPreview(organizationId: string | null | undefined = null): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(organizationScopedLocalStorageKey(browserPickedImagingFolderStorageKey, organizationId));
    if (organizationId) window.localStorage.removeItem(browserPickedImagingFolderStorageKey);
  } catch (error) {
    console.error("Failed to remove browser picked imaging folder preview", error);
    // ignore unavailable storage
  }
}

export function buildBrowserPickedImagingFolderPreview(stats: BrowserPickedImagingScanStats): BrowserPickedImagingFolderPreview {
  const fingerprint = browserPickedFolderFingerprint(
    [
      stats.rootName,
      stats.scannedFiles,
      stats.scannedFolders,
      stats.dicomLikeFiles,
      stats.archiveFiles,
      stats.modelFiles,
      stats.imageFiles,
      stats.totalBytes
    ].join(":")
  );
  const hasDicom = stats.dicomLikeFiles > 0;
  const hasModels = stats.modelFiles > 0;
  const nextAction = hasDicom
    ? "Найдены файлы КТ/снимков. Для тяжелой КТ откройте эту же папку в локальном модуле клиники или в полноценном просмотрщике КТ."
    : hasModels
    ? "Найдены стоматологические 3D-модели. До подключения просмотрщика 3D-моделей держим это как метаданные органайзера."
      : "В ограниченном браузерном сканировании файлы снимков не найдены.";
  return {
    version: 1,
    safeDisplayName: `${hasDicom ? "Браузерная КТ-папка" : "Браузерная папка снимков"} #${fingerprint}`,
    sourceLabel: stats.sourceKind === "browser_directory_picker" ? "Выбор папки браузером" : "Выбор файлов браузером",
    sourceKind: stats.sourceKind,
    folderFingerprint: fingerprint,
    rootName: stats.rootName || "Выбранная папка",
    scannedFiles: stats.scannedFiles,
    scannedFolders: stats.scannedFolders,
    dicomLikeFiles: stats.dicomLikeFiles,
    archiveFiles: stats.archiveFiles,
    modelFiles: stats.modelFiles,
    imageFiles: stats.imageFiles,
    totalBytes: stats.totalBytes,
    createdAt: new Date().toISOString(),
    nextAction,
    warnings: stats.warnings
  };
}

export function loadLocalImagingFolderDraft(organizationId: string | null | undefined = null): LocalImagingFolderDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const localKey = organizationScopedLocalStorageKey(localImagingFolderStorageKey, organizationId);
    const raw =
      window.localStorage.getItem(localKey) ??
      (organizationId ? window.localStorage.getItem(localImagingFolderStorageKey) : null);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalImagingFolderDraft;
    if (parsed?.version !== 1 || !parsed.folderPath?.trim() || !parsed.savedAt) return null;
    if (!localSavedAtFresh(parsed.savedAt, localConvenienceRetentionMs)) {
      window.localStorage.removeItem(localKey);
      if (organizationId) window.localStorage.removeItem(localImagingFolderStorageKey);
      return null;
    }
    return {
      ...parsed,
      safeDisplayName: parsed.safeDisplayName || `Локальная папка снимков #${localImagingFolderFingerprint(parsed.folderPath)}`,
      sourceLabel: parsed.sourceLabel || "Это устройство",
      sourceKind: parsed.sourceKind || "manual",
      folderFingerprint: parsed.folderFingerprint || localImagingFolderFingerprint(parsed.folderPath),
      origin: parsed.origin || "manual"
    };
  } catch {
    return null;
  }
}

export function saveLocalImagingFolderDraft(draft: LocalImagingFolderDraft, organizationId: string | null | undefined = null): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(organizationScopedLocalStorageKey(localImagingFolderStorageKey, organizationId), JSON.stringify(draft));
  } catch (error) {
    console.error("Failed to save local imaging folder draft", error);
    // Local folder recovery is best-effort and never sent to the server.
  }
}

export function removeLocalImagingFolderDraft(organizationId: string | null | undefined = null): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(organizationScopedLocalStorageKey(localImagingFolderStorageKey, organizationId));
    if (organizationId) window.localStorage.removeItem(localImagingFolderStorageKey);
  } catch (error) {
    console.error("Failed to remove local imaging folder draft", error);
    // ignore unavailable storage
  }
}

export function saveLocalDicomWorkbenchDraftToLocalStorage(
  draft: DicomWorkbenchLocalDraft,
  organizationId: string | null | undefined = null
): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(organizationScopedLocalStorageKey(dicomWorkbenchLocalStorageKey, organizationId), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function createLocalDicomWorkbenchDraft(
  manifest: DicomViewerWorkbenchManifestResponse,
  clientSavedAt: string,
): DicomWorkbenchLocalDraft {
  return {
    manifest,
    clientSavedAt,
    seriesKey: dicomWorkbenchSeriesKey(manifest)
  };
}

export function dicomWorkbenchManifestHasRedactedSource(manifest: DicomViewerWorkbenchManifestResponse | null): boolean {
  if (!manifest) return false;
  const firstFilePath = manifest.toolStateBundle.seriesRef.firstFilePath ?? "";
  return (
    firstFilePath.startsWith("redacted-local-dicom-path:") ||
    manifest.toolStateBundle.viewports.some((viewport) =>
      (viewport.referencedImageId ?? "").startsWith("dicomfile:redacted-local-dicom-path:")
    )
  );
}

export function removeLocalDicomWorkbenchDraftFromLocalStorage(organizationId: string | null | undefined = null): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(organizationScopedLocalStorageKey(dicomWorkbenchLocalStorageKey, organizationId));
    if (organizationId) window.localStorage.removeItem(dicomWorkbenchLocalStorageKey);
  } catch (error) {
    console.error("Failed to remove local dicom workbench draft", error);
    // ignore unavailable storage
  }
}

export function hasDentalDesktopShellBridge(): boolean {
  if (typeof window === "undefined") return false;
  const runtimeWindow = window as DentalDesktopRuntimeWindow;
  return Boolean(
    runtimeWindow.dentalCrmDesktop?.dicomBridge ||
      runtimeWindow.dentalCrmDesktop?.localFileBridge ||
      runtimeWindow.__DENTAL_CRM_DESKTOP__ ||
      runtimeWindow.__TAURI__ ||
      runtimeWindow.electronAPI
  );
}

export function detectDicomRuntimeSurfaceHint(): DicomWorkstationClientFacts["runtimeSurfaceHint"] {
  if (typeof navigator === "undefined") return "unknown";
  if (hasDentalDesktopShellBridge()) return "desktop_app";
  const text = `${navigator.platform || ""} ${navigator.userAgent || ""}`.toLowerCase();
  if (/ipad|tablet/.test(text)) return "tablet_web";
  if (/android|iphone|ipod|mobile|phone/.test(text)) return "mobile_web";
  if (/win|mac|linux|x11|desktop/.test(text)) return "desktop_web";
  return "unknown";
}

export async function collectDicomWorkstationClientFacts(): Promise<DicomWorkstationClientFacts> {
  let webgl2Supported = false;
  let webglVendor: string | null = null;
  let webglRenderer: string | null = null;
  let maxTextureSize: number | null = null;
  let max3dTextureSize: number | null = null;
  let maxRenderbufferSize: number | null = null;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    webgl2Supported = Boolean(gl);
    if (gl) {
      maxTextureSize = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || null;
      max3dTextureSize = Number(gl.getParameter(gl.MAX_3D_TEXTURE_SIZE)) || null;
      maxRenderbufferSize = Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)) || null;
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info") as
        | { UNMASKED_VENDOR_WEBGL: number; UNMASKED_RENDERER_WEBGL: number }
        | null;
      if (debugInfo) {
        webglVendor = String(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) ?? "").slice(0, 180) || null;
        webglRenderer = String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? "").slice(0, 240) || null;
      }
    }
  } catch {
    webgl2Supported = false;
  }

  const navigatorWithMemory = navigator as Navigator & { deviceMemory?: number };
  let storageQuotaMb: number | null = null;
  let storageUsageMb: number | null = null;
  try {
    const estimate = await navigator.storage?.estimate?.();
    storageQuotaMb = estimate?.quota ? Math.floor(estimate.quota / 1024 / 1024) : null;
    storageUsageMb = estimate?.usage ? Math.floor(estimate.usage / 1024 / 1024) : null;
  } catch {
    storageQuotaMb = null;
    storageUsageMb = null;
  }

  const directoryPickerSupported =
    typeof window !== "undefined" && typeof (window as BrowserDirectoryPickerWindow).showDirectoryPicker === "function";
  const desktopShellBridgeSupported = hasDentalDesktopShellBridge();

  return {
    deviceMemoryGb: navigatorWithMemory.deviceMemory ?? null,
    hardwareConcurrency: navigator.hardwareConcurrency || null,
    webgl2Supported,
    webglVendor,
    webglRenderer,
    maxTextureSize,
    max3dTextureSize,
    maxRenderbufferSize,
    devicePixelRatio: window.devicePixelRatio || null,
    offscreenCanvasSupported: typeof OffscreenCanvas !== "undefined",
    webWorkerSupported: typeof Worker !== "undefined",
    indexedDbSupported: typeof indexedDB !== "undefined",
    storageQuotaMb,
    storageUsageMb,
    online: navigator.onLine,
    runtimeSurfaceHint: detectDicomRuntimeSurfaceHint(),
    desktopShellBridgeSupported,
    directoryPickerSupported,
    directoryHandlePersistence: directoryPickerSupported ? "session_only" : "unsupported",
    userAgent: navigator.userAgent.slice(0, 300),
    platform: navigator.platform || null
  };
}

export function saveLocalImagingViewerDraft(
  studyId: string,
  draft: ImagingViewerLocalDraft,
  organizationId: string | null | undefined = null
): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(imagingViewerLocalKey(studyId, organizationId), JSON.stringify(draft));
    return true;
  } catch {
    // Viewer state is still saved to server when available; local storage quota errors stay non-blocking.
    return false;
  }
}

export function ctImplantPlanFromLibraryItem(implant: CtImplantLibraryItem): ImagingViewerImplantPlan {
  return {
    itemId: implant.id,
    system: implant.system,
    line: implant.line,
    diameterMm: implant.diameterMm,
    lengthMm: implant.lengthMm,
    platform: implant.platform,
    indication: implant.indication,
    selectedAt: new Date().toISOString()
  };
}

export const imagingViewerPlans: Record<ImagingStudyKind, ImagingViewerPlan> = {
  periapical: {
    label: "RVG / прицельный",
    mode: "two_d",
    primaryTools: ["window/level", "invert", "rotate", "zoom", "measure"],
    presets: ["endo", "caries", "implant"],
    nextAction: "Смотреть локально; ИИ-описание только как черновик.",
    warnings: ["Не заменяет диагноз врача.", "Измерения требуют калибровки датчика."]
  },
  bitewing: {
    label: "Интерпроксимальный снимок",
    mode: "two_d",
    primaryTools: ["window/level", "invert", "zoom", "compare"],
    presets: ["caries", "bone"],
    nextAction: "Смотреть локально; удобно для кариеса и контактов.",
    warnings: ["Сравнение серий требует одинаковой проекции."]
  },
  opg: {
    label: "ОПТГ / панорама",
    mode: "two_d",
    primaryTools: ["window/level", "invert", "rotate", "zoom", "measure"],
    presets: ["bone", "teeth", "implant"],
    nextAction: "2D-просмотрщик достаточен для обзора; КТ открывать отдельным рабочим местом срезов.",
    warnings: ["Панорама имеет искажения; линейные измерения проверять по КТ."]
  },
  ceph: {
    label: "ТРГ / цефалометрия",
    mode: "ceph",
    primaryTools: ["window/level", "rotate", "zoom", "landmarks"],
    presets: ["soft", "bone", "airway"],
    nextAction: "Для ортодонтии нужен отдельный цефалометрический анализ с точками и углами.",
    warnings: ["Точки/углы не должны автозаполняться без проверки врача."]
  },
  cbct: {
    label: "КЛКТ / КТ",
    mode: "cbct_mpr",
    primaryTools: ["MPR", "axial", "coronal", "sagittal", "panoramic curve"],
    presets: ["bone", "implant", "endo"],
    nextAction: "Открывать в просмотре КЛКТ/КТ-срезов; здесь только быстрый предпросмотр.",
    warnings: ["Нельзя диагностировать КЛКТ по одной плоской картинке.", "Нужны срезы серии, предварительная подготовка и полноценный просмотрщик КТ."]
  },
  photo: {
    label: "Фото",
    mode: "photo",
    primaryTools: ["zoom", "rotate", "brightness", "contrast"],
    presets: ["clinical", "shade", "before/after"],
    nextAction: "Фото можно использовать для коммуникации и черновиков документов.",
    warnings: ["Цвет зависит от света и камеры."]
  },
  other: {
    label: "Другое изображение",
    mode: "two_d",
    primaryTools: ["zoom", "rotate", "brightness", "contrast"],
    presets: ["neutral"],
    nextAction: "Проверить источник и привязку к пациенту перед использованием.",
    warnings: ["Неизвестный тип требует ручной проверки."]
  }
};

export const imagingSourceChoices: ImagingSourceKind[] = [
  "folder_watch",
  "sensor_bridge",
  "dicom_file",
  "dicomweb",
  "pacs",
  "twain_wia",
  "manual_upload"
];

export const smartImportModeLabels: Record<SmartImportMode, { title: string; detail: string }> = {
  auto: {
    title: "Авто",
    detail: "Сам разделит пациентов, снимки и мусор."
  },
  mixed: {
    title: "Смешанный экспорт",
    detail: "Пациенты + снимки из одной старой программы."
  },
  patients: {
    title: "Только пациенты",
    detail: "Принудительно отправить строки в базу пациентов."
  },
  imaging: {
    title: "Только снимки",
    detail: "Принудительно разобрать как RVG/ОПТГ/КТ."
  }
};

export const importSourceLabels: Record<ImportSourceKind, { title: string; detail: string }> = {
  csv_text: {
    title: "Таблица / Excel",
    detail: "Копипаст таблицы или списка с разделителями."
  },
  xlsx_copy: {
    title: "Excel-вставка",
    detail: "Строки из Excel или Google Sheets без ручной подготовки."
  },
  mis_export: {
    title: "Экспорт старой МИС",
    detail: "32top, IDENT, Cliniccards, Open Dental и другие форматы через адаптеры."
  },
  image_ocr: {
    title: "Фото журнала",
    detail: "OCR/vision распознает фото бумажного журнала, затем показывает предпросмотр."
  },
  voice_dictation: {
    title: "Диктовка",
    detail: "Надиктовка администратора превращается в строки пациентов."
  },
  free_text: {
    title: "Свободный текст",
    detail: "Умный разбор: ФИО, телефон, дата рождения, комментарий."
  }
};

export const ingestionTargetLabels: Record<DocumentIngestionTarget, string> = {
  smart_import: "Умный импорт",
  patients: "Пациенты",
  imaging: "Снимки",
  pricelist: "Прайс",
  plain_text: "Текст"
};

export const documentIngestionQualityLabels: Record<DocumentIngestionResponse["quality"]["extractionQuality"], string> = {
  ready: "Можно открыть предпросмотр",
  review: "Нужна ручная проверка",
  ocr_required: "Нужен OCR / vision",
  unsupported: "Формат не разобран"
};

export const telegramBlockedReasonLabels: Record<string, string> = {
  missing_patient_portal_base_url: "Не настроена ссылка на портал пациента.",
  missing_clinic_review_url: "Не настроена ссылка клиники для отзывов.",
  phi_requires_consent: "Шаблон содержит медданные и требует согласий перед отправкой.",
  telegram_bot_disabled: "Telegram выключен в настройках клиники.",
  telegram_bot_token_missing: "В серверных настройках клиники не подключен бот Telegram.",
  encrypted_chat_transport_missing_or_unreadable: "Чат пациента еще не привязан или защищенная ссылка недоступна.",
  patient_or_staff_not_linked_to_telegram: "Чат еще не связан через QR-код или одноразовую ссылку.",
  post_visit_recommendation_document_not_issued: "Сначала выпустите памятку после приема.",
  telegram_outbox_item_not_found_or_no_longer_open: "Задача уже не доступна для отправки.",
  telegram_outbox_already_sent: "Это сообщение уже отправлено.",
  telegram_outbox_not_due_yet: "Время отправки еще не наступило.",
  telegram_outbox_preview_empty: "В сообщении нет текста для отправки.",
  telegram_delivery_processing: "Отправка уже обрабатывается.",
  telegram_transport_failed: "Telegram не принял сообщение. Проверьте подключение бота, сеть и связанный чат."
};

export const telegramWarningLabels: Record<string, string> = {
  idempotent_replay: "Повторная отправка распознана и не продублирована."
};

export function telegramHumanMessage(value: string | null | undefined): string {
  if (!value) return "";
  if (value.startsWith("feature_disabled:")) return "Сценарий выключен в настройках Telegram.";
  const mapped = telegramBlockedReasonLabels[value] ?? telegramWarningLabels[value];
  if (mapped) return mapped;
  if (!/^[a-z0-9_.:-]+$/.test(value)) return value;
  return telegramBlockedReasonLabels[value] ?? telegramWarningLabels[value] ?? "Нужна проверка настройки Telegram.";
}

export function isTelegramOutboxItemDueForUi(item: Pick<DenteTelegramOutboxResponse["items"][number], "scheduledAt">): boolean {
  const scheduledAtMs = Date.parse(item.scheduledAt);
  return !Number.isFinite(scheduledAtMs) || scheduledAtMs <= Date.now();
}

export const documentDetectedKindLabels: Record<string, string> = {
  archive: "архив",
  csv: "таблица",
  docx: "документ Word",
  html: "веб-страница",
  image: "изображение",
  json: "структурированный текст",
  legacy_database: "старая база",
  legacy_dump: "резервная копия старой базы",
  ods: "таблица",
  odt: "документ",
  pdf: "PDF",
  pptx: "презентация",
  rtf: "текстовый документ",
  spreadsheet: "таблица",
  text: "текст",
  unknown: "не определено",
  xlsx: "таблица Excel",
  xml: "структурированный текст",
  zip: "архив"
};

export function documentDetectedKindLabel(kind: string) {
  return documentDetectedKindLabels[kind] ?? "файл";
}

export const dicomFirstFrameStatusLabels: Record<string, string> = {
  ready: "готово",
  unsupported: "не поддерживается",
  not_found: "не найдено"
};

export const toothRows = [
  ["18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28"],
  ["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"]
] as const;

export const toothStateByCode: Record<string, "watch" | "planned" | "done" | "missing"> = {
  "16": "watch",
  "26": "done",
  "36": "planned",
  "46": "watch",
  "48": "missing"
};

export function formatTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Samara"
  }).format(new Date(value));
}

export function patientName(patients: Patient[], patientId: string | null) {
  if (!patientId) return "Новый пациент";
  return patients.find((patient) => patient.id === patientId)?.fullName ?? "Пациент";
}

export function findPatient(patients: Patient[], patientId: string | null) {
  if (!patientId) return null;
  return patients.find((patient) => patient.id === patientId) ?? null;
}

export function money(value: number | null) {
  return `${(value ?? 0).toLocaleString("ru-RU")} ₽`;
}

export function minutesLabel(value: number) {
  if (value < 60) return `${value} мин`;
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes ? `${hours} ч ${minutes} мин` : `${hours} ч`;
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Samara"
  }).format(new Date(value));
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: "Europe/Samara"
  }).format(new Date(value));
}

export type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  start: () => void;
};

export type BrowserWindowWithSpeech = Window &
  typeof globalThis & {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitAudioContext?: typeof AudioContext;
  };

export type VisitNoteField = "complaint" | "anamnesis" | "objectiveStatus" | "diagnosis" | "treatmentPlan";
export type VisitNoteForm = Record<VisitNoteField, string>;

export const visitNoteFieldDefinitions: Array<{ key: VisitNoteField; label: string }> = [
  { key: "complaint", label: "Жалобы" },
  { key: "anamnesis", label: "Анамнез" },
  { key: "objectiveStatus", label: "Объективно" },
  { key: "diagnosis", label: "Диагноз" },
  { key: "treatmentPlan", label: "План" }
];

export const visitDraftQualityLabels: Record<NonNullable<VisitNoteDraft["quality"]>["level"], string> = {
  ready: "Черновик плотный",
  review: "Нужна проверка",
  needs_more_dictation: "Нужно дописать"
};

export const visitDraftSignalLabels: Record<string, string> = {
  complaint_detected: "жалобы есть",
  anamnesis_detected: "анамнез есть",
  objective_detected: "осмотр есть",
  diagnosis_mentioned: "диагноз есть",
  plan_detected: "план есть",
  tooth_codes_detected: "зуб указан",
  imaging_mentioned: "снимки упомянуты",
  consent_mentioned: "согласие упомянуто",
  medical_risk_mentioned: "есть медриск",
  procedure_mentioned: "процедура упомянута"
};

export const visitDraftMissingFieldLabels: Record<string, string> = {
  complaint: "жалобы",
  anamnesis: "анамнез",
  objective_status: "объективный статус",
  diagnosis_review: "диагноз",
  treatment_plan: "план лечения",
  tooth_or_region: "зуб или область"
};

export function visitDraftSignalLabel(signal: string) {
  return visitDraftSignalLabels[signal] ?? signal.replace(/_/g, " ");
}

export function visitDraftMissingFieldLabel(field: string) {
  return visitDraftMissingFieldLabels[field] ?? field.replace(/_/g, " ");
}

export const speechQualityLabels: Record<SpeechTranscriptionResponse["chunk"]["quality"]["level"], string> = {
  clear: "чисто",
  review: "проверить",
  empty: "пусто",
  failed: "сбой"
};

export const emptyVisitNoteForm: VisitNoteForm = {
  complaint: "",
  anamnesis: "",
  objectiveStatus: "",
  diagnosis: "",
  treatmentPlan: ""
};

export function visitNoteFormFromVisit(visit: Dashboard["activeVisit"]): VisitNoteForm {
  return {
    complaint: visit.complaint ?? "",
    anamnesis: visit.anamnesis ?? "",
    objectiveStatus: visit.objectiveStatus ?? "",
    diagnosis: visit.diagnosis ?? "",
    treatmentPlan: visit.treatmentPlan ?? ""
  };
}

export function visitNoteFormFromDraft(draft: VisitNoteDraft): VisitNoteForm {
  return {
    complaint: draft.complaint ?? "",
    anamnesis: draft.anamnesis ?? "",
    objectiveStatus: draft.objectiveStatus ?? "",
    diagnosis: draft.diagnosis ?? "",
    treatmentPlan: draft.treatmentPlan ?? ""
  };
}

export function visitNoteDraftFromForm(form: VisitNoteForm, warnings: string[]): VisitNoteDraft {
  return {
    complaint: form.complaint,
    anamnesis: form.anamnesis,
    objectiveStatus: form.objectiveStatus,
    diagnosis: form.diagnosis,
    treatmentPlan: form.treatmentPlan,
    warnings
  };
}

export type VisitLocalDraft = {
  version: 1;
  visitId: string;
  savedAt: string;
  transcript: string;
  selectedSpecialty: DentalSpecialty;
  visitNoteForm: VisitNoteForm;
};

export type PendingVisitSave = {
  version: 1;
  id: string;
  organizationId: string | null;
  visitId: string;
  clientMutationId: string;
  baseRevision: number | null;
  queuedAt: string;
  draft: VisitNoteDraft;
  doctorSummary: string | null;
  transcript: string;
  selectedSpecialty: DentalSpecialty;
};

export type PendingSpeechChunk = SpeechChunkUploadInput & {
  version: 1;
  id: string;
  organizationId: string | null;
  queuedAt: string;
};

export type PersistenceHealth = {
  enabled: boolean;
  filePath: string;
  exists: boolean;
  version: number | null;
  savedAt: string | null;
  checksum: string | null;
  backupDirectoryPath: string;
  backupCount: number;
  latestBackupAt: string | null;
  latestBackupSizeBytes: number | null;
  maxBackupCount: number;
};

export type PersistenceBackupCheck = {
  fileName: string;
  savedAt: string;
  sizeBytes: number;
  fileHash: string | null;
  checksumVerified: boolean | null;
  readable: boolean;
  warning: string | null;
};

export type PersistenceIntegrityReport = {
  ok: boolean;
  checkedAt: string;
  stateFileHash: string | null;
  checksumVerified: boolean | null;
  stateCounts: Record<string, number>;
  backups: PersistenceBackupCheck[];
  warnings: string[];
  nextAction: string;
};

export function visitLocalDraftKey(visitId: string, organizationId: string | null | undefined = null) {
  return organizationScopedLocalStorageKey(`dental-crm:visit-draft:${visitId}`, organizationId);
}

export const pendingVisitSaveQueueKey = "dental-crm:pending-visit-saves";
export const pendingSpeechChunkQueueKey = "dental-crm:pending-speech-chunks";
export const speechChunkDbName = "dental-crm-offline";
export const speechChunkDbVersion = 4;
export const pendingVisitSaveStoreName = "pendingVisitSaves";
export const dicomWorkbenchDraftStoreName = "dicomWorkbenchDrafts";
export const mprWorkbenchDraftStoreName = "mprWorkbenchDrafts";
export const speechChunkStoreName = "pendingSpeechChunks";
export const speechLocalStorageFallbackMaxBytes = 4_000_000;
export const requiredSpeechChunkDbStoreNames = [
  pendingVisitSaveStoreName,
  dicomWorkbenchDraftStoreName,
  mprWorkbenchDraftStoreName,
  speechChunkStoreName
] as const;
export let speechChunkDbPromise: Promise<IDBDatabase> | null = null;

export function pendingVisitSaveQueueLocalKey(organizationId: string | null | undefined = null): string {
  return organizationScopedLocalStorageKey(pendingVisitSaveQueueKey, organizationId);
}

export function pendingSpeechChunkQueueLocalKey(organizationId: string | null | undefined = null): string {
  return organizationScopedLocalStorageKey(pendingSpeechChunkQueueKey, organizationId);
}

export function localQueueOrganizationMatches(itemOrganizationId: string | null | undefined, activeOrganizationId: string | null | undefined): boolean {
  return normalizedLocalOrganizationId(itemOrganizationId) === normalizedLocalOrganizationId(activeOrganizationId);
}

export function normalizeSpeechAppendText(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function appendSpeechTextWithoutDuplicateTail(current: string, next: string, dedupeWindowChars = 600): string {
  const cleanNext = next.trim();
  const cleanCurrent = current.trim();
  if (!cleanNext) return current;
  if (!cleanCurrent) return cleanNext;

  const currentTail = cleanCurrent.slice(-dedupeWindowChars);
  const normalizedCurrent = normalizeSpeechAppendText(currentTail);
  const normalizedNext = normalizeSpeechAppendText(cleanNext);
  if (!normalizedNext) return current;
  if (normalizedCurrent.endsWith(normalizedNext) || normalizedCurrent.includes(normalizedNext)) return current;

  const currentWords = normalizedCurrent.split(" ").filter(Boolean);
  const nextWords = normalizedNext.split(" ").filter(Boolean);
  const originalNextWords = cleanNext.split(/\s+/).filter(Boolean);
  const maxOverlap = Math.min(14, currentWords.length, nextWords.length, originalNextWords.length);
  for (let size = maxOverlap; size >= 3; size -= 1) {
    const currentSuffix = currentWords.slice(-size).join(" ");
    const nextPrefix = nextWords.slice(0, size).join(" ");
    if (currentSuffix === nextPrefix) {
      const remainingNext = originalNextWords.slice(size).join(" ").trim();
      return remainingNext ? `${cleanCurrent}\n${remainingNext}` : cleanCurrent;
    }
  }

  return `${cleanCurrent}\n${cleanNext}`;
}

export function isDentalSpecialty(value: unknown): value is DentalSpecialty {
  return typeof value === "string" && value in specialtyLabels;
}

export function telegramQrSvgToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export type UiPreferences = {
  version: 1;
  uiLanguage: UiLanguage;
  selectedWorkspaceRole: StaffRole;
  selectedSpecialty: DentalSpecialty;
  selectedProtocolId: string | null;
  selectedPatientId: string | null;
  scheduleDoctorFilterId: string | null;
  scheduleAssistantFilterId: string | null;
  scheduleChairFilterId: string | null;
  scheduleDefaultDoctorUserId: string | null;
  scheduleDefaultAssistantUserId: string | null;
  scheduleDefaultChairId: string | null;
  scheduleStatusFilter: Appointment["status"] | "all";
  scheduleDateFilter: string;
  paymentMethod: PaymentMethod;
  taxDocumentYear: number;
  selectedDocumentKind: GeneratedDocument["kind"];
  taxApplicationForm: TaxDeductionApplicationForm;
  taxApplicationDeliveryChannel: TaxDeductionApplicationDeliveryChannel;
  paymentReceiptTaxSupportRequested: boolean;
  documentIssueSignatureMode: DocumentIssueSignatureMode;
  documentIssueStaffFullName: string;
  documentIssueStaffRole: string;
  procedureConsentProcedureType: ProcedureSpecificConsentProcedure;
  postVisitCareTopic: PostVisitCareTopic;
  pricelistSourceKind: PricelistSourceKind;
  usePricelistAi: boolean;
  recognitionKind: AiJobKind;
  recognitionTarget: AiRecognitionTarget;
  importSourceKind: ImportSourceKind;
  documentIngestionTarget: DocumentIngestionTarget;
  imagingImportSourceKind: ImagingSourceKind;
  smartImportMode: SmartImportMode;
  imagingKindFilter: ImagingStudyKind | "all";
  dicomWebEndpointUrl: string;
  ohifBaseUrl: string;
  telegramBotConfigId: string;
  telegramLinkSubjectType: TelegramLinkSubjectType;
  telegramLinkStaffId: string | null;
  telegramOutboxStatusFilter: TelegramOutboxStatusFilter;
  telegramOutboxTemplateFilter: TelegramOutboxTemplateFilter;
  onboardingDismissed: boolean;
  onboardingDismissedAt: string | null;
  onboardingStep: OnboardingStep;
  onboardingDraftMode: boolean;
  savedAt: string;
};

export type UiPreferencesInput = Omit<UiPreferences, "version" | "savedAt">;
export type TelegramOutboxStatusFilter = DenteTelegramOutboxResponse["items"][number]["deliveryStatus"] | "all" | "due";
export type TelegramOutboxTemplateFilter = DenteTelegramMessagePreview["templateKind"] | "all";

export const uiLanguageLabels: Record<UiLanguage, string> = {
  ru: "Русский"
};

export type UiLanguageOption = { value: UiLanguage; label: string; detail: string };

export const defaultUiLanguageOption: UiLanguageOption = {
  value: "ru",
  label: uiLanguageLabels.ru,
  detail: "Русский интерфейс включен сейчас. Выбор сохраняется автоматически и остается до смены языка."
};

export const uiLanguageOptions: UiLanguageOption[] = [defaultUiLanguageOption];

export const emptyTelegramVisualCardUrlDrafts = (): DenteTelegramVisualCardUrls => ({
  mainMenu: null,
  appointment: null,
  documents: null,
  tax: null,
  billing: null,
  care: null,
  review: null,
  staff: null
});

export const telegramPublicUrlSensitiveQueryKeys = new Set([
  "patient",
  "patientid",
  "patient_id",
  "pid",
  "fio",
  "name",
  "phone",
  "tel",
  "email",
  "inn",
  "snils",
  "passport",
  "visit",
  "visitid",
  "visit_id",
  "appointment",
  "appointmentid",
  "appointment_id",
  "document",
  "documentid",
  "document_id",
  "doc",
  "diagnosis",
  "tooth",
  "treatment",
  "payment",
  "receipt",
  "order",
  "token",
  "code"
]);

export const telegramPublicUrlSensitivePathSegments = new Set([
  "patient",
  "patients",
  "person",
  "people",
  "visit",
  "visits",
  "appointment",
  "appointments",
  "document",
  "documents",
  "medical-record",
  "medical-records",
  "record",
  "records",
  "tax",
  "payment",
  "payments",
  "receipt",
  "receipts",
  "order",
  "orders",
  "token",
  "code",
  "passport",
  "snils",
  "inn"
]);

export function normalizeTelegramPublicHttpsUrlDraft(fieldLabel: string, value: string | null | undefined): string | null {
  const raw = value?.trim() ?? "";
  if (!raw) return null;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`${fieldLabel}: укажите полный адрес вида https://...`);
  }

  if (parsed.protocol !== "https:") {
    throw new Error(`${fieldLabel}: нужна ссылка https://...`);
  }
  if (parsed.username || parsed.password) {
    throw new Error(`${fieldLabel}: уберите логин и пароль из ссылки.`);
  }

  const pathSegments = parsed.pathname
    .split("/")
    .map((segment) => {
      try {
        return decodeURIComponent(segment).trim().toLowerCase();
      } catch (scanError) {
        if (isBrowserMigrationScanAbortError(scanError)) throw scanError;
        throw new Error(`${fieldLabel}: исправьте кодировку пути в ссылке.`);
      }
    })
    .filter(Boolean);
  for (const segment of pathSegments) {
    const compactDigits = segment.replace(/\D/g, "");
    if (telegramPublicUrlSensitivePathSegments.has(segment)) {
      throw new Error(`${fieldLabel}: ссылка должна вести на общую публичную страницу, без patient/visit/document/token в пути.`);
    }
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(segment)) {
      throw new Error(`${fieldLabel}: уберите идентификатор пациента, визита или документа из пути.`);
    }
    if (compactDigits.length >= 10 || /\b\d{12}\b/.test(segment)) {
      throw new Error(`${fieldLabel}: уберите телефон, ИНН, СНИЛС или другой личный номер из пути.`);
    }
  }

  const sensitiveQueryKeys = Array.from(parsed.searchParams.keys()).filter((key) =>
    telegramPublicUrlSensitiveQueryKeys.has(key.trim().toLowerCase())
  );
  if (sensitiveQueryKeys.length) {
    throw new Error(`${fieldLabel}: уберите персональные параметры из ссылки: ${sensitiveQueryKeys.join(", ")}.`);
  }
  for (const valuePart of parsed.searchParams.values()) {
    const compactDigits = valuePart.replace(/\D/g, "");
    if (compactDigits.length >= 10 || /\b\d{12}\b/.test(valuePart)) {
      throw new Error(`${fieldLabel}: уберите телефон, ИНН, СНИЛС или другой личный номер из параметров.`);
    }
  }

  parsed.hash = "";
  return parsed.toString();
}

export function normalizeTelegramVisualCardUrlDraftsForSave(drafts: DenteTelegramVisualCardUrls): DenteTelegramVisualCardUrls {
  const fieldLabel = (key: DenteTelegramVisualCardKey) =>
    telegramVisualCardFields.find((field) => field.key === key)?.label ?? `Картинка Telegram ${key}`;
  return {
    mainMenu: normalizeTelegramPublicHttpsUrlDraft(fieldLabel("mainMenu"), drafts.mainMenu),
    appointment: normalizeTelegramPublicHttpsUrlDraft(fieldLabel("appointment"), drafts.appointment),
    documents: normalizeTelegramPublicHttpsUrlDraft(fieldLabel("documents"), drafts.documents),
    tax: normalizeTelegramPublicHttpsUrlDraft(fieldLabel("tax"), drafts.tax),
    billing: normalizeTelegramPublicHttpsUrlDraft(fieldLabel("billing"), drafts.billing),
    care: normalizeTelegramPublicHttpsUrlDraft(fieldLabel("care"), drafts.care),
    review: normalizeTelegramPublicHttpsUrlDraft(fieldLabel("review"), drafts.review),
    staff: normalizeTelegramPublicHttpsUrlDraft(fieldLabel("staff"), drafts.staff)
  };
}

export function normalizeTelegramBotUsernameDraft(fieldLabel: string, value: string | null | undefined): string | null {
  const normalized = value?.trim().replace(/^@/, "") ?? "";
  if (!normalized) return null;
  if (!/^[A-Za-z][A-Za-z0-9_]{1,28}[Bb][Oo][Tt]$/.test(normalized)) {
    throw new Error(
      `${fieldLabel}: укажите имя Telegram-бота без ссылки, 5-32 символа: латинские буквы, цифры, подчёркивания и окончание bot.`
    );
  }
  return normalized;
}

export const onboardingTelegramVisualCardKeys: DenteTelegramVisualCardKey[] = [
  "mainMenu",
  "appointment",
  "documents",
  "tax",
  "billing",
  "care",
  "review",
  "staff"
];

export type TelegramFeaturePlan = {
  productName: string;
  botUsername: string | null;
  modes: string[];
  enabledFeatures: DenteTelegramFeature[];
  patientSafeActions: string[];
  staffSafeActions: string[];
  blockedByDefault: string[];
};

export type TelegramLinkSubjectType = "patient" | "staff";

export const telegramModeLabels: Record<DenteTelegramBotMode, string> = {
  disabled: "выключен",
  shared_dente_bot: "общий бот платформы",
  clinic_owned_bot: "бот клиники"
};

export const telegramModeHints: Record<DenteTelegramBotMode, string> = {
  disabled: "Telegram не создает новые задачи и не отправляет сообщения.",
  shared_dente_bot: "Одна общая основа: клиника определяется QR-кодом и связкой пациента.",
  clinic_owned_bot: "Собственный бот клиники: имя сохраняется в настройках, секрет бота хранится в серверных настройках клиники."
};

export const telegramPrivacyModeLabels: Record<DenteTelegramPrivacyMode, string> = {
  no_phi_by_default: "Без медицинских данных в Telegram",
  limited_admin_only: "Только административные сведения",
  consented_phi_templates: "Чувствительные шаблоны только по согласию"
};

export const telegramPrivacyModeHints: Record<DenteTelegramPrivacyMode, string> = {
  no_phi_by_default: "В чат уходят только статусы, время, ссылки и общие памятки.",
  limited_admin_only: "Разрешены административные статусы без диагноза, снимков и документов.",
  consented_phi_templates: "Режим для будущих шаблонов с явным согласием пациента и аудитом."
};

export const telegramTemplateLabels: Record<DenteTelegramMessagePreview["templateKind"], string> = {
  appointment_reminder: "напоминание о приеме",
  appointment_confirmation: "подтверждение приема",
  payment_reminder_notice: "напоминание об оплате",
  document_ready_notice: "документ готов",
  tax_document_request_status: "статус налоговой справки",
  callback_request_received: "заявка на звонок",
  post_visit_instruction_link: "памятка после приема",
  post_visit_checkup: "контроль после приема",
  recall_notice: "профилактический recall",
  review_request: "просьба оставить отзыв",
  staff_daily_digest: "сводка сотруднику"
};

export const telegramClassificationLabels: Record<DenteTelegramMessagePreview["classification"], string> = {
  no_phi: "без медтайны",
  limited_admin: "административное",
  phi_requires_consent: "медданные только с согласием"
};

export const telegramDeliveryStatusLabels: Record<DenteTelegramOutboxResponse["items"][number]["deliveryStatus"], string> = {
  ready: "готово",
  needs_chat_link: "нужно подключить Telegram",
  blocked_by_policy: "заблокировано политикой",
  transport_not_ready: "отправка не готова",
  disabled: "выключено"
};

export const telegramLinkCodeStatusLabels: Record<DenteTelegramLinkCodePublic["status"], string> = {
  pending: "ожидает",
  used: "использован",
  expired: "истек",
  revoked: "отозван"
};

export const telegramOutboxStatusFilterOptions: TelegramOutboxStatusFilter[] = [
  "all",
  "due",
  "ready",
  "needs_chat_link",
  "transport_not_ready",
  "blocked_by_policy",
  "disabled"
];

export const telegramOutboxStatusFilterLabels: Record<TelegramOutboxStatusFilter, string> = {
  all: "вся очередь",
  due: "к отправке сейчас",
  ...telegramDeliveryStatusLabels
};

export const telegramOutboxTemplateFilterOptions: TelegramOutboxTemplateFilter[] = [
  "all",
  ...(Object.keys(telegramTemplateLabels) as DenteTelegramMessagePreview["templateKind"][])
];

export const telegramOutboxTemplateFilterLabels: Record<TelegramOutboxTemplateFilter, string> = {
  all: "все сценарии",
  ...telegramTemplateLabels
};

export type TelegramInlineButtonPreview = {
  text: string;
  target: string;
  kind: "url" | "callback" | "unknown";
};

export const telegramInlineButtonKindLabels: Record<TelegramInlineButtonPreview["kind"], string> = {
  url: "ссылка",
  callback: "действие",
  unknown: "кнопка"
};

export function telegramInlineButtonRowsFromReplyMarkup(
  markup: DenteTelegramMessagePreview["replyMarkup"] | DenteTelegramOutboxResponse["items"][number]["replyMarkup"] | null | undefined
): TelegramInlineButtonPreview[][] {
  if (!markup || typeof markup !== "object" || Array.isArray(markup)) return [];
  const rows = (markup as { inline_keyboard?: unknown }).inline_keyboard;
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    if (!Array.isArray(row)) return [];
    const buttons = row
      .map((button) => {
        if (!button || typeof button !== "object" || Array.isArray(button)) return null;
        const candidate = button as { text?: unknown; url?: unknown; callback_data?: unknown };
        if (typeof candidate.text !== "string") return null;
        if (typeof candidate.url === "string") return { text: candidate.text, target: candidate.url, kind: "url" as const };
        if (typeof candidate.callback_data === "string") {
          return { text: candidate.text, target: candidate.callback_data, kind: "callback" as const };
        }
        return { text: candidate.text, target: "", kind: "unknown" as const };
      })
      .filter((button): button is TelegramInlineButtonPreview => Boolean(button));
    return buttons.length ? [buttons] : [];
  });
}

export function telegramInlineButtonsFromReplyMarkup(
  markup: DenteTelegramMessagePreview["replyMarkup"] | DenteTelegramOutboxResponse["items"][number]["replyMarkup"] | null | undefined
): TelegramInlineButtonPreview[] {
  return telegramInlineButtonRowsFromReplyMarkup(markup).flat();
}

export function telegramInlineButtonsFromPreview(preview: DenteTelegramMessagePreview): TelegramInlineButtonPreview[] {
  return telegramInlineButtonsFromReplyMarkup(preview.replyMarkup);
}

export type OnboardingStep = "intro" | "role" | "clinic" | "legal" | "team" | "sources" | "telegram" | "done";

export const onboardingStepValues: readonly OnboardingStep[] = [
  "intro",
  "role",
  "clinic",
  "legal",
  "team",
  "sources",
  "telegram",
  "done"
];

export type ClinicProfileDraft = {
  clinicName: string;
  legalName: string;
  inn: string;
  kpp: string;
  ogrn: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  medicalLicenseNumber: string;
  medicalLicenseIssuedAt: string;
  medicalLicenseIssuer: string;
  bankDetails: string;
  signatoryName: string;
  signatoryTitle: string;
  timezone: string;
  defaultVisitMinutes: string;
  workdayStart: string;
  workdayEnd: string;
  workingDays: number[];
  appointmentBufferMinutes: string;
  egiszEnabled: boolean;
};

export type ClinicProfileSaveState = "idle" | "saving" | "saved" | "error";

export type PatientCoreDraft = {
  fullName: string;
  birthDate: string;
  phone: string;
  email: string;
  notes: string;
};
export type PatientCoreSaveState = "idle" | "saving" | "saved" | "error";

export type PatientAdministrativeProfileDraft = {
  [K in Exclude<keyof PatientAdministrativeProfile, "preferredAppointmentWeekdays">]: string;
} & {
  preferredAppointmentWeekdays: number[];
};
export type PatientAdministrativeProfileSaveState = "idle" | "saving" | "saved" | "error";

export type StaffScheduleDraft = {
  start: string;
  end: string;
  workingDays: number[];
  perDay: StaffWorkingHours;
};
export type StaffScheduleSaveState = "idle" | "saving" | "saved" | "error";

export type AppointmentScheduleDraft = {
  patientId: string;
  doctorUserId: string;
  assistantUserId: string;
  chairId: string;
  status: Appointment["status"];
  startsAt: string;
  endsAt: string;
  reason: string;
  comment: string;
};
export type AppointmentScheduleSaveState = "idle" | "saving" | "saved" | "error";

export function emptyAppointmentScheduleDraft(): AppointmentScheduleDraft {
  return {
    patientId: "",
    doctorUserId: "",
    assistantUserId: "",
    chairId: "",
    status: "planned",
    startsAt: "",
    endsAt: "",
    reason: "",
    comment: ""
  };
}

export type MedicalDocumentReleaseChannel = "paper" | "pdf" | "dicom_archive" | "secure_link" | "physical_media" | "other";
export const medicalDocumentReleaseChannelLabels: Record<MedicalDocumentReleaseChannel, string> = {
  paper: "Бумага",
  pdf: "PDF",
  dicom_archive: "архив снимков",
  secure_link: "Защищенная ссылка",
  physical_media: "Физический носитель",
  other: "Иной канал"
};

export type PaymentRefundCorrectionAction =
  | "full_refund"
  | "partial_refund"
  | "payment_transfer"
  | "receipt_correction"
  | "payer_details_correction";
export type PaymentRefundCorrectionMethod = "cash" | "card" | "bank_transfer" | "internal_offset" | "no_money_movement";
export const paymentRefundCorrectionActionOptions: readonly PaymentRefundCorrectionAction[] = [
  "full_refund",
  "partial_refund",
  "payment_transfer",
  "receipt_correction",
  "payer_details_correction"
];
export const paymentRefundCorrectionMethodOptions: readonly PaymentRefundCorrectionMethod[] = [
  "cash",
  "card",
  "bank_transfer",
  "internal_offset",
  "no_money_movement"
];
export const treatmentAcceptanceVariantOptions: readonly TreatmentPlanAcceptanceVariant[] = [
  "urgent",
  "standard",
  "optimal",
  "staged",
  "maintenance",
  "other"
];
export const xrayPriorityOptions: readonly XrayCbctReferralPriority[] = ["routine", "urgent"];
export const outpatient025uDemographicCodeOptions = ["1", "2", "unknown"] as const;
export type Outpatient025uDemographicCode = (typeof outpatient025uDemographicCodeOptions)[number];

export const patientIntakePregnancyStatusOptions: Array<{ value: PatientIntakePregnancyStatus; label: string }> = [
  { value: "not_applicable", label: "Не применимо" },
  { value: "denied", label: "Со слов пациента нет" },
  { value: "possible", label: "Возможна беременность" },
  { value: "confirmed", label: "Беременность подтверждена" },
  { value: "lactation", label: "Лактация" },
  { value: "unknown", label: "Не уточнено" }
];

export const taxApplicationRelationshipOptions: Array<{ value: TaxDeductionApplicationRelationship; label: string }> = [
  { value: "self", label: "Пациент сам" },
  { value: "spouse", label: "Супруг / супруга" },
  { value: "parent", label: "Родитель" },
  { value: "child", label: "Ребенок" },
  { value: "ward", label: "Подопечный" }
];

export const taxApplicationFormOptions: Array<{ value: TaxDeductionApplicationForm; label: string }> = [
  { value: "knd_1151156", label: "КНД 1151156, расходы с 2024" },
  { value: "legacy_2021_2023", label: "Старая справка, оплаты 2021-2023" }
];

export const taxApplicationDeliveryChannelOptions: Array<{ value: TaxDeductionApplicationDeliveryChannel; label: string }> = [
  { value: "paper", label: "Бумажно в клинике" },
  { value: "pdf", label: "PDF после подписи" },
  { value: "secure_link", label: "Защищенная ссылка" },
  { value: "email", label: "Email" },
  { value: "portal", label: "Личный кабинет" },
  { value: "other", label: "Иной канал" }
];

export type ClinicalToothSurface = ClinicalToothRow["surfaces"][number];
export type ClinicalToothStatus = ClinicalToothRow["status"];

export const clinicalToothSurfaceAliases: Record<string, ClinicalToothSurface> = {
  o: "occlusal",
  окклюзионная: "occlusal",
  окклюзионно: "occlusal",
  жевательная: "occlusal",
  жевательно: "occlusal",
  m: "mesial",
  медиальная: "mesial",
  мезиальная: "mesial",
  медиально: "mesial",
  мезиально: "mesial",
  d: "distal",
  дистальная: "distal",
  дистально: "distal",
  b: "buccal",
  щечная: "buccal",
  щечно: "buccal",
  вестибулярная: "buccal",
  l: "lingual",
  язычная: "lingual",
  язычно: "lingual",
  p: "palatal",
  небная: "palatal",
  небно: "palatal",
  i: "incisal",
  режущий: "incisal",
  "режущий край": "incisal",
  корень: "root",
  корневая: "root",
  root: "root",
  имплантация: "implant_site",
  "зона имплантации": "implant_site",
  "implant site": "implant_site",
  "не применимо": "not_applicable",
  нет: "not_applicable",
  "-": "not_applicable"
};

export const clinicalToothStatusAliases: Record<string, ClinicalToothStatus> = {
  норма: "sound",
  "без патологии": "sound",
  наблюдение: "watch",
  контроль: "watch",
  кариес: "caries",
  caries: "caries",
  пульпит: "pulpitis_periodontitis",
  периодонтит: "pulpitis_periodontitis",
  эндо: "pulpitis_periodontitis",
  пародонт: "periodontal",
  пародонтология: "periodontal",
  отсутствует: "missing",
  удален: "missing",
  удаленый: "missing",
  удаленный: "missing",
  имплант: "implant",
  имплантат: "implant",
  ортопедия: "prosthetic",
  коронка: "prosthetic",
  протез: "prosthetic",
  ортодонтия: "orthodontic",
  брекеты: "orthodontic",
  элайнеры: "orthodontic",
  план: "planned",
  planned: "planned",
  запланировано: "planned",
  выполнено: "completed",
  completed: "completed",
  готово: "completed",
  иное: "other",
  другое: "other"
};

export const installmentPaymentStatusAliases: Record<string, InstallmentPaymentStatus> = {
  план: "planned",
  запланирован: "planned",
  запланировано: "planned",
  ожидается: "planned",
  planned: "planned",
  оплачен: "paid",
  оплачено: "paid",
  paid: "paid",
  просрочен: "overdue",
  просрочено: "overdue",
  просрочка: "overdue",
  overdue: "overdue",
  перенесен: "rescheduled",
  перенесено: "rescheduled",
  перенос: "rescheduled",
  rescheduled: "rescheduled",
  отменен: "cancelled",
  отменено: "cancelled",
  отмена: "cancelled",
  cancelled: "cancelled"
};

export const defaultClinicalToothRowsText =
  "36 | окклюзионная, дистальная | кариес | кариес дентина 36 зуба по осмотру и снимку | восстановление функции и профилактика осложнений | лечение кариеса и композитная реставрация | прогноз зависит от гигиены и контроля | десна без острого воспаления | | ";

export function normalizeTaxApplicationRelationship(value: string | null | undefined): TaxDeductionApplicationRelationship | null {
  const normalized = value?.trim().toLocaleLowerCase("ru-RU").replaceAll("ё", "е").replace(/[\s_-]+/g, " ") ?? "";
  if (!normalized) return null;
  if (["self", "patient", "пациент", "сам пациент", "сама пациентка", "налогоплательщик"].includes(normalized)) return "self";
  if (["spouse", "husband", "wife", "супруг", "супруга", "муж", "жена"].includes(normalized)) return "spouse";
  if (["parent", "father", "mother", "родитель", "отец", "мать", "папа", "мама"].includes(normalized)) return "parent";
  if (["child", "son", "daughter", "ребенок", "сын", "дочь", "усыновленный", "усыновленная"].includes(normalized)) return "child";
  if (["ward", "подопечный", "подопечная", "опекаемый", "опекаемая"].includes(normalized)) return "ward";
  return null;
}

export const procedureSpecificConsentProcedureOptions: Array<{ value: ProcedureSpecificConsentProcedure; label: string }> = [
  { value: "local_anesthesia", label: "Местная анестезия" },
  { value: "therapy_endo_restoration", label: "Терапия, эндодонтия, реставрация" },
  { value: "surgery_extraction", label: "Хирургия / удаление" },
  { value: "implantation_bone_graft", label: "Имплантация / костная пластика" },
  { value: "prosthetics", label: "Ортопедия" },
  { value: "orthodontics", label: "Ортодонтия" },
  { value: "hygiene_whitening", label: "Гигиена / отбеливание" },
  { value: "periodontology", label: "Пародонтология" },
  { value: "other", label: "Другая процедура" }
];

export const xrayStudyTypeOptions: Array<{ value: XrayCbctReferralStudyType; label: string }> = [
  { value: "rvg", label: "RVG / прицельный" },
  { value: "opg", label: "ОПТГ" },
  { value: "cbct", label: "КЛКТ / КТ" },
  { value: "trg", label: "ТРГ" },
  { value: "tmj", label: "ВНЧС" },
  { value: "sinus", label: "Пазуха" },
  { value: "photo_protocol", label: "Фотопротокол" },
  { value: "other", label: "Другое" }
];

export const xrayPregnancyStatusOptions: Array<{ value: XrayCbctReferralPregnancyStatus; label: string }> = [
  { value: "not_applicable", label: "Не применимо" },
  { value: "denied", label: "Со слов пациента нет" },
  { value: "possible", label: "Возможна" },
  { value: "confirmed", label: "Подтверждена" },
  { value: "unknown", label: "Не уточнено" }
];

export const photoVideoMaterialOptions: Array<{ value: PhotoVideoConsentMaterial; label: string }> = [
  { value: "intraoral_photo", label: "Внутриротовые фото" },
  { value: "face_photo", label: "Фото лица" },
  { value: "video", label: "Видео" },
  { value: "xray", label: "Рентген" },
  { value: "cbct", label: "КЛКТ/КТ" },
  { value: "scan", label: "Цифровые сканы" },
  { value: "other", label: "Иные материалы" }
];

export const defaultUiPreferences: UiPreferences = {
  version: 1,
  uiLanguage: "ru",
  selectedWorkspaceRole: "doctor",
  selectedSpecialty: "therapist",
  selectedProtocolId: null,
  selectedPatientId: null,
  scheduleDoctorFilterId: null,
  scheduleAssistantFilterId: null,
  scheduleChairFilterId: null,
  scheduleDefaultDoctorUserId: null,
  scheduleDefaultAssistantUserId: null,
  scheduleDefaultChairId: null,
  scheduleStatusFilter: "all",
  scheduleDateFilter: "",
  paymentMethod: "card",
  taxDocumentYear: new Date().getFullYear(),
  selectedDocumentKind: "patient_intake_questionnaire",
  taxApplicationForm: "knd_1151156",
  taxApplicationDeliveryChannel: "paper",
  paymentReceiptTaxSupportRequested: false,
  documentIssueSignatureMode: "paper_signed",
  documentIssueStaffFullName: "",
  documentIssueStaffRole: "Врач/администратор",
  procedureConsentProcedureType: "implantation_bone_graft",
  postVisitCareTopic: "filling_restoration",
  pricelistSourceKind: "spreadsheet_copy",
  usePricelistAi: false,
  recognitionKind: "voice_transcription",
  recognitionTarget: "visit_note",
  importSourceKind: "csv_text",
  documentIngestionTarget: "smart_import",
  imagingImportSourceKind: "folder_watch",
  smartImportMode: "auto",
  imagingKindFilter: "all",
  dicomWebEndpointUrl: "http://127.0.0.1:8042/dicom-web",
  ohifBaseUrl: "http://127.0.0.1:3000",
  telegramBotConfigId: "",
  telegramLinkSubjectType: "patient",
  telegramLinkStaffId: null,
  telegramOutboxStatusFilter: "all",
  telegramOutboxTemplateFilter: "all",
  onboardingDismissed: false,
  onboardingDismissedAt: null,
  onboardingStep: "intro",
  onboardingDraftMode: false,
  savedAt: ""
};

export const aiJobKindPreferenceValues: readonly AiJobKind[] = [
  "voice_transcription",
  "visit_note_draft",
  "image_summary",
  "document_draft",
  "paper_ocr"
];

export const aiJobKindLabels: Record<AiJobKind, string> = {
  voice_transcription: "диктовка врача",
  visit_note_draft: "черновик приема",
  image_summary: "описание снимка",
  document_draft: "черновик документа",
  paper_ocr: "разбор бумажного журнала"
};

export function isRecordKey<T extends string>(value: unknown, record: Record<T, unknown>): value is T {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(record, value);
}

export function isOptionValue<T extends string>(value: unknown, options: readonly { value: T }[]): value is T {
  return typeof value === "string" && options.some((option) => option.value === value);
}

export function isStringUnionValue<T extends string>(value: unknown, allowedValues: readonly T[]): value is T {
  return typeof value === "string" && allowedValues.some((allowedValue) => allowedValue === value);
}

export function isUiLanguage(value: unknown): value is UiLanguage {
  return isRecordKey(value, uiLanguageLabels);
}

export function normalizeUiLanguageInput(value: unknown): UiLanguage {
  return isUiLanguage(value) ? value : "ru";
}

export function isStaffRole(value: unknown): value is StaffRole {
  return isRecordKey(value, staffRoleLabels);
}

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return isRecordKey(value, paymentMethodLabels);
}

export function isPricelistSourceKind(value: unknown): value is PricelistSourceKind {
  return isRecordKey(value, pricelistSourceKindLabels);
}

export function isAiJobKind(value: unknown): value is AiJobKind {
  return typeof value === "string" && aiJobKindPreferenceValues.includes(value as AiJobKind);
}

export function isAiRecognitionTarget(value: unknown): value is AiRecognitionTarget {
  return isRecordKey(value, recognitionTargetLabels);
}

export function isImportSourceKind(value: unknown): value is ImportSourceKind {
  return isRecordKey(value, importSourceLabels);
}

export function isDocumentIngestionTarget(value: unknown): value is DocumentIngestionTarget {
  return isRecordKey(value, ingestionTargetLabels);
}

export function isImagingSourceKind(value: unknown): value is ImagingSourceKind {
  return isRecordKey(value, imagingSourceLabels);
}

export function isSmartImportMode(value: unknown): value is SmartImportMode {
  return isRecordKey(value, smartImportModeLabels);
}

export function isImagingKindFilter(value: unknown): value is ImagingStudyKind | "all" {
  return value === "all" || isRecordKey(value, imagingKindLabels);
}

export function isBooleanPreference(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function isTaxDocumentYearPreference(value: unknown): value is number {
  if (!Number.isInteger(value)) return false;
  const year = value as number;
  return year >= 2021 && year <= 2100;
}

export function isDocumentKindPreference(value: unknown): value is GeneratedDocument["kind"] {
  return isRecordKey(value, documentKindMetadata);
}

export function isAppointmentStatusFilterPreference(value: unknown): value is Appointment["status"] | "all" {
  return value === "all" || isRecordKey(value, appointmentLabels);
}

export function isTaxApplicationFormPreference(value: unknown): value is TaxDeductionApplicationForm {
  return isOptionValue(value, taxApplicationFormOptions);
}

export function isTaxApplicationDeliveryChannelPreference(value: unknown): value is TaxDeductionApplicationDeliveryChannel {
  return isOptionValue(value, taxApplicationDeliveryChannelOptions);
}

export function isProcedureSpecificConsentProcedurePreference(value: unknown): value is ProcedureSpecificConsentProcedure {
  return isOptionValue(value, procedureSpecificConsentProcedureOptions);
}

export function isPostVisitCareTopicPreference(value: unknown): value is PostVisitCareTopic {
  return isOptionValue(value, postVisitCareTopicOptions);
}

export function isDocumentIssueSignatureModePreference(value: unknown): value is DocumentIssueSignatureMode {
  return (
    value === "paper_signed" ||
    value === "simple_electronic_signature" ||
    value === "qualified_electronic_signature"
  );
}

export function isBoundedPreferenceString(value: unknown): value is string {
  return typeof value === "string" && value.length <= 500;
}

export function isNullablePreferenceString(value: unknown): value is string | null {
  return value === null || isBoundedPreferenceString(value);
}

export function isOnboardingStepPreference(value: unknown): value is OnboardingStep {
  return typeof value === "string" && onboardingStepValues.includes(value as OnboardingStep);
}

export function isTelegramLinkSubjectTypePreference(value: unknown): value is TelegramLinkSubjectType {
  return value === "patient" || value === "staff";
}

export function isTelegramOutboxStatusFilterPreference(value: unknown): value is TelegramOutboxStatusFilter {
  return typeof value === "string" && telegramOutboxStatusFilterOptions.includes(value as TelegramOutboxStatusFilter);
}

export function isTelegramOutboxTemplateFilterPreference(value: unknown): value is TelegramOutboxTemplateFilter {
  return typeof value === "string" && telegramOutboxTemplateFilterOptions.includes(value as TelegramOutboxTemplateFilter);
}

export function normalizedAppointmentStatus(value: unknown, fallback: Appointment["status"] = "planned"): Appointment["status"] {
  return isRecordKey(value, appointmentLabels) ? value : fallback;
}

export function normalizedAppointmentStatusFilter(value: unknown): Appointment["status"] | "all" {
  return isAppointmentStatusFilterPreference(value) ? value : defaultUiPreferences.scheduleStatusFilter;
}

export function normalizedDocumentKind(value: unknown): GeneratedDocument["kind"] {
  return isDocumentKindPreference(value) ? value : defaultUiPreferences.selectedDocumentKind;
}

export function normalizedPatientIntakePregnancyStatus(value: unknown): PatientIntakePregnancyStatus {
  return isOptionValue(value, patientIntakePregnancyStatusOptions) ? value : "unknown";
}

export function normalizedTaxApplicationRelationshipSelect(value: unknown): TaxDeductionApplicationRelationship {
  return isOptionValue(value, taxApplicationRelationshipOptions) ? value : "self";
}

export function normalizedTaxApplicationForm(value: unknown): TaxDeductionApplicationForm {
  return isTaxApplicationFormPreference(value) ? value : defaultUiPreferences.taxApplicationForm;
}

export function normalizedTaxApplicationDeliveryChannel(value: unknown): TaxDeductionApplicationDeliveryChannel {
  return isTaxApplicationDeliveryChannelPreference(value) ? value : defaultUiPreferences.taxApplicationDeliveryChannel;
}

export function normalizedProcedureSpecificConsentProcedure(value: unknown): ProcedureSpecificConsentProcedure {
  return isProcedureSpecificConsentProcedurePreference(value) ? value : defaultUiPreferences.procedureConsentProcedureType;
}

export function normalizedTreatmentPlanAcceptanceVariant(value: unknown): TreatmentPlanAcceptanceVariant {
  return isStringUnionValue(value, treatmentAcceptanceVariantOptions) ? value : "standard";
}

export function normalizedPostVisitCareTopic(value: unknown): PostVisitCareTopic {
  return isPostVisitCareTopicPreference(value) ? value : defaultUiPreferences.postVisitCareTopic;
}

export function normalizedXrayStudyType(value: unknown): XrayCbctReferralStudyType {
  return isOptionValue(value, xrayStudyTypeOptions) ? value : "cbct";
}

export function normalizedXrayPriority(value: unknown): XrayCbctReferralPriority {
  return isStringUnionValue(value, xrayPriorityOptions) ? value : "routine";
}

export function normalizedXrayPregnancyStatus(value: unknown): XrayCbctReferralPregnancyStatus {
  return isOptionValue(value, xrayPregnancyStatusOptions) ? value : "unknown";
}

export function normalizedOutpatient025uDemographicCode(value: unknown): Outpatient025uDemographicCode {
  return isStringUnionValue(value, outpatient025uDemographicCodeOptions) ? value : "unknown";
}

export function normalizedMedicalDocumentReleaseChannel(value: unknown): MedicalDocumentReleaseChannel {
  return isRecordKey(value, medicalDocumentReleaseChannelLabels) ? value : "paper";
}

export function normalizedPaymentRefundCorrectionAction(value: unknown): PaymentRefundCorrectionAction {
  return isStringUnionValue(value, paymentRefundCorrectionActionOptions) ? value : "partial_refund";
}

export function normalizedPaymentRefundCorrectionMethod(value: unknown): PaymentRefundCorrectionMethod {
  return isStringUnionValue(value, paymentRefundCorrectionMethodOptions) ? value : "card";
}

export function normalizedDocumentVoidReasonCode(value: unknown): DocumentVoidReasonCode {
  return isRecordKey(value, documentVoidReasonLabels) ? value : "draft_error";
}

export function normalizedClinicalRuleAction(value: unknown): Dashboard["clinicalRules"][number]["action"] {
  return isRecordKey(value, clinicalRuleActionLabels) ? value : "add_required_service";
}

export function normalizedClinicalRuleSeverity(value: unknown): Dashboard["clinicalRules"][number]["severity"] {
  return isRecordKey(value, clinicalRuleSeverityLabels) ? value : "warning";
}

export function normalizedStaffRole(value: unknown): StaffRole {
  return isStaffRole(value) ? value : "doctor";
}

export function normalizedDentalSpecialty(value: unknown): DentalSpecialty {
  return isDentalSpecialty(value) ? value : "therapist";
}

export function normalizedServiceCategory(value: unknown): Dashboard["serviceCatalog"][number]["category"] {
  return isRecordKey(value, serviceCategoryLabels) ? value : "therapy";
}

export function normalizedTelegramBotMode(value: unknown): DenteTelegramBotMode {
  return isRecordKey(value, telegramModeLabels) ? value : "shared_dente_bot";
}

export function normalizedTelegramPrivacyMode(value: unknown): DenteTelegramPrivacyMode {
  return isRecordKey(value, telegramPrivacyModeLabels) ? value : "no_phi_by_default";
}

export function normalizedTelegramLinkSubjectType(value: unknown): TelegramLinkSubjectType {
  return isTelegramLinkSubjectTypePreference(value) ? value : "patient";
}

export function normalizedTelegramOutboxStatusFilter(value: unknown): TelegramOutboxStatusFilter {
  return isTelegramOutboxStatusFilterPreference(value) ? value : "all";
}

export function normalizedTelegramOutboxTemplateFilter(value: unknown): TelegramOutboxTemplateFilter {
  return isTelegramOutboxTemplateFilterPreference(value) ? value : "all";
}

export function pickUiPreference<T>(
  source: Record<string, unknown>,
  key: keyof UiPreferencesInput,
  fallback: T,
  isValid: (value: unknown) => value is T
): T {
  const value = source[key];
  return isValid(value) ? value : fallback;
}

export function normalizeUiPreferencesPayload(parsed: unknown): UiPreferences | null {
  if (!parsed || typeof parsed !== "object" || (parsed as { version?: unknown }).version !== 1) {
    return null;
  }
  const source = parsed as Record<string, unknown>;
  const legacyIssueSignatureDraft = loadDocumentIssueSignatureDraft();
  return {
    version: 1,
    uiLanguage: pickUiPreference(source, "uiLanguage", defaultUiPreferences.uiLanguage, isUiLanguage),
    selectedWorkspaceRole: pickUiPreference(source, "selectedWorkspaceRole", defaultUiPreferences.selectedWorkspaceRole, isStaffRole),
    selectedSpecialty: pickUiPreference(source, "selectedSpecialty", defaultUiPreferences.selectedSpecialty, isDentalSpecialty),
    selectedProtocolId: pickUiPreference(source, "selectedProtocolId", defaultUiPreferences.selectedProtocolId, isNullablePreferenceString),
    selectedPatientId: pickUiPreference(source, "selectedPatientId", defaultUiPreferences.selectedPatientId, isNullablePreferenceString),
    scheduleDoctorFilterId: pickUiPreference(
      source,
      "scheduleDoctorFilterId",
      defaultUiPreferences.scheduleDoctorFilterId,
      isNullablePreferenceString
    ),
    scheduleAssistantFilterId: pickUiPreference(
      source,
      "scheduleAssistantFilterId",
      defaultUiPreferences.scheduleAssistantFilterId,
      isNullablePreferenceString
    ),
    scheduleChairFilterId: pickUiPreference(
      source,
      "scheduleChairFilterId",
      defaultUiPreferences.scheduleChairFilterId,
      isNullablePreferenceString
    ),
    scheduleDefaultDoctorUserId: pickUiPreference(
      source,
      "scheduleDefaultDoctorUserId",
      defaultUiPreferences.scheduleDefaultDoctorUserId,
      isNullablePreferenceString
    ),
    scheduleDefaultAssistantUserId: pickUiPreference(
      source,
      "scheduleDefaultAssistantUserId",
      defaultUiPreferences.scheduleDefaultAssistantUserId,
      isNullablePreferenceString
    ),
    scheduleDefaultChairId: pickUiPreference(
      source,
      "scheduleDefaultChairId",
      defaultUiPreferences.scheduleDefaultChairId,
      isNullablePreferenceString
    ),
    scheduleStatusFilter: pickUiPreference(
      source,
      "scheduleStatusFilter",
      defaultUiPreferences.scheduleStatusFilter,
      isAppointmentStatusFilterPreference
    ),
    scheduleDateFilter: pickUiPreference(
      source,
      "scheduleDateFilter",
      defaultUiPreferences.scheduleDateFilter,
      isBoundedPreferenceString
    ),
    paymentMethod: pickUiPreference(source, "paymentMethod", defaultUiPreferences.paymentMethod, isPaymentMethod),
    taxDocumentYear: pickUiPreference(source, "taxDocumentYear", defaultUiPreferences.taxDocumentYear, isTaxDocumentYearPreference),
    selectedDocumentKind: pickUiPreference(
      source,
      "selectedDocumentKind",
      defaultUiPreferences.selectedDocumentKind,
      isDocumentKindPreference
    ),
    taxApplicationForm: pickUiPreference(
      source,
      "taxApplicationForm",
      defaultUiPreferences.taxApplicationForm,
      isTaxApplicationFormPreference
    ),
    taxApplicationDeliveryChannel: pickUiPreference(
      source,
      "taxApplicationDeliveryChannel",
      defaultUiPreferences.taxApplicationDeliveryChannel,
      isTaxApplicationDeliveryChannelPreference
    ),
    paymentReceiptTaxSupportRequested: pickUiPreference(
      source,
      "paymentReceiptTaxSupportRequested",
      defaultUiPreferences.paymentReceiptTaxSupportRequested,
      isBooleanPreference
    ),
    documentIssueSignatureMode: pickUiPreference(
      source,
      "documentIssueSignatureMode",
      legacyIssueSignatureDraft.mode,
      isDocumentIssueSignatureModePreference
    ),
    documentIssueStaffFullName: pickUiPreference(
      source,
      "documentIssueStaffFullName",
      legacyIssueSignatureDraft.staffFullName,
      isBoundedPreferenceString
    ).slice(0, 160),
    documentIssueStaffRole: pickUiPreference(
      source,
      "documentIssueStaffRole",
      legacyIssueSignatureDraft.staffRole,
      isBoundedPreferenceString
    ).slice(0, 120) || defaultUiPreferences.documentIssueStaffRole,
    procedureConsentProcedureType: pickUiPreference(
      source,
      "procedureConsentProcedureType",
      defaultUiPreferences.procedureConsentProcedureType,
      isProcedureSpecificConsentProcedurePreference
    ),
    postVisitCareTopic: pickUiPreference(
      source,
      "postVisitCareTopic",
      defaultUiPreferences.postVisitCareTopic,
      isPostVisitCareTopicPreference
    ),
    pricelistSourceKind: pickUiPreference(
      source,
      "pricelistSourceKind",
      defaultUiPreferences.pricelistSourceKind,
      isPricelistSourceKind
    ),
    usePricelistAi: pickUiPreference(source, "usePricelistAi", defaultUiPreferences.usePricelistAi, isBooleanPreference),
    recognitionKind: pickUiPreference(source, "recognitionKind", defaultUiPreferences.recognitionKind, isAiJobKind),
    recognitionTarget: pickUiPreference(source, "recognitionTarget", defaultUiPreferences.recognitionTarget, isAiRecognitionTarget),
    importSourceKind: pickUiPreference(source, "importSourceKind", defaultUiPreferences.importSourceKind, isImportSourceKind),
    documentIngestionTarget: pickUiPreference(
      source,
      "documentIngestionTarget",
      defaultUiPreferences.documentIngestionTarget,
      isDocumentIngestionTarget
    ),
    imagingImportSourceKind: pickUiPreference(
      source,
      "imagingImportSourceKind",
      defaultUiPreferences.imagingImportSourceKind,
      isImagingSourceKind
    ),
    smartImportMode: pickUiPreference(source, "smartImportMode", defaultUiPreferences.smartImportMode, isSmartImportMode),
    imagingKindFilter: pickUiPreference(source, "imagingKindFilter", defaultUiPreferences.imagingKindFilter, isImagingKindFilter),
    dicomWebEndpointUrl: pickUiPreference(
      source,
      "dicomWebEndpointUrl",
      defaultUiPreferences.dicomWebEndpointUrl,
      isBoundedPreferenceString
    ),
    ohifBaseUrl: pickUiPreference(source, "ohifBaseUrl", defaultUiPreferences.ohifBaseUrl, isBoundedPreferenceString),
    telegramBotConfigId: pickUiPreference(
      source,
      "telegramBotConfigId",
      defaultUiPreferences.telegramBotConfigId,
      isBoundedPreferenceString
    )
      .trim()
      .slice(0, 160),
    telegramLinkSubjectType: pickUiPreference(
      source,
      "telegramLinkSubjectType",
      defaultUiPreferences.telegramLinkSubjectType,
      isTelegramLinkSubjectTypePreference
    ),
    telegramLinkStaffId: pickUiPreference(
      source,
      "telegramLinkStaffId",
      defaultUiPreferences.telegramLinkStaffId,
      isNullablePreferenceString
    ),
    telegramOutboxStatusFilter: pickUiPreference(
      source,
      "telegramOutboxStatusFilter",
      defaultUiPreferences.telegramOutboxStatusFilter,
      isTelegramOutboxStatusFilterPreference
    ),
    telegramOutboxTemplateFilter: pickUiPreference(
      source,
      "telegramOutboxTemplateFilter",
      defaultUiPreferences.telegramOutboxTemplateFilter,
      isTelegramOutboxTemplateFilterPreference
    ),
    onboardingDismissed: pickUiPreference(
      source,
      "onboardingDismissed",
      defaultUiPreferences.onboardingDismissed,
      isBooleanPreference
    ),
    onboardingDismissedAt: pickUiPreference(
      source,
      "onboardingDismissedAt",
      defaultUiPreferences.onboardingDismissedAt,
      isNullablePreferenceString
    ),
    onboardingStep: pickUiPreference(source, "onboardingStep", defaultUiPreferences.onboardingStep, isOnboardingStepPreference),
    onboardingDraftMode: pickUiPreference(
      source,
      "onboardingDraftMode",
      defaultUiPreferences.onboardingDraftMode,
      isBooleanPreference
    ),
    savedAt: typeof source.savedAt === "string" ? source.savedAt : ""
  };
}

export function loadUiPreferences(): UiPreferences {
  if (typeof window === "undefined") return defaultUiPreferences;
  try {
    const raw = window.localStorage.getItem(uiPreferencesStorageKey);
    const preferences = raw ? normalizeUiPreferencesPayload(JSON.parse(raw)) ?? defaultUiPreferences : defaultUiPreferences;
    return mergeLocalOnboardingDismissal(preferences);
  } catch {
    return mergeLocalOnboardingDismissal(defaultUiPreferences);
  }
}

export function withSavedUiPreferenceTimestamp(preferences: UiPreferencesInput): UiPreferences {
  return {
    version: 1,
    ...preferences,
    savedAt: new Date().toISOString()
  };
}

export function persistUiPreferences(preferences: UiPreferences): UiPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    window.localStorage.setItem(uiPreferencesStorageKey, JSON.stringify(preferences));
    return preferences;
  } catch {
    // Preferences are convenience only. Clinical drafts use separate guarded storage.
    return null;
  }
}

export function saveUiPreferences(preferences: UiPreferencesInput): UiPreferences | null {
  return persistUiPreferences(withSavedUiPreferenceTimestamp(preferences));
}

export function denteAdminSecretRequestHeaders(extra: Record<string, string> = {}, adminSecret?: string): Record<string, string> {
  const secret = adminSecret?.trim();
  return secret ? { ...extra, [denteAdminSecretHeaderName]: secret } : extra;
}

export async function loadServerUiPreferences(adminSecret?: string): Promise<UiPreferences | null> {
  const response = await fetch(uiPreferencesServerPath, {
    headers: denteAdminSecretRequestHeaders({}, adminSecret)
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as { preferences?: unknown };
  return normalizeUiPreferencesPayload(payload.preferences) ?? null;
}

export async function saveServerUiPreferences(preferences: UiPreferences, adminSecret?: string): Promise<void> {
  const response = await fetch(uiPreferencesServerPath, {
    method: "PUT",
    headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }, adminSecret),
    body: JSON.stringify(preferences)
  });
  if (!response.ok) {
    throw new Error(await responseErrorMessage(response, "Настройки интерфейса не сохранены"));
  }
}

export function uiPreferencesSyncErrorMessage(_error: unknown): string {
  return "Настройки интерфейса сохранены только на этом устройстве. Серверная синхронизация повторится автоматически.";
}

export function responseStatusFailureLabel(response: Response): string {
  if (response.status === 0) return "нет ответа сервера";
  if (response.status === 400) return "сервер не принял данные";
  if (response.status === 401 || response.status === 403) return "нет доступа к действию";
  if (response.status === 404) return "нужный маршрут не найден";
  if (response.status === 409) return "данные уже изменились, обновите экран";
  if (response.status === 413) return "файл или запрос слишком большой";
  if (response.status === 422) return "данные не прошли проверку";
  if (response.status === 429) return "слишком много запросов, повторите позже";
  if (response.status >= 500) return "сервер не смог выполнить действие";
  return `сервер вернул код ${response.status}`;
}

export async function responseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const payload = (await response.clone().json()) as { error?: unknown; message?: unknown };
    const detail = typeof payload.message === "string" ? payload.message : typeof payload.error === "string" ? payload.error : null;
    const operatorDetail = operatorReadableErrorDetail(detail);
    return operatorDetail ? `${fallback}: ${operatorDetail}` : `${fallback}: ${responseStatusFailureLabel(response)}`;
  } catch {
    return `${fallback}: ${responseStatusFailureLabel(response)}`;
  }
}

export class WorkflowResponseError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "WorkflowResponseError";
    this.status = status;
  }
}

export function acceptedVisitSaveFailureIsRetryable(error: unknown): boolean {
  if (!(error instanceof WorkflowResponseError)) return true;
  return error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500;
}

export function requestFailureMessage(fallback: string, _error: unknown): string {
  return `${fallback}: сеть или локальный сервер недоступны. Повторите действие или проверьте подключение к серверу клиники.`;
}

export const technicalWorkflowFailurePattern =
  /\b(TypeError|DOMException|SyntaxError|ReferenceError|Failed to fetch|NetworkError|Load failed|fetch|JSON|ENOENT|EACCES|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|stack|undefined|null|NaN|[A-Z][A-Z0-9_]{5,})\b|\/api\/|https?:\/\/|[A-Za-z]:\\|\\\\[^\\]+\\|\/(Users|home|var|tmp)\//i;

export function operatorReadableErrorDetail(detail: string | null): string | null {
  const message = detail?.trim() ?? "";
  if (!message) return null;
  if (!/[А-Яа-яЁё]/.test(message)) return null;
  if (technicalWorkflowFailurePattern.test(message)) return null;
  return message;
}

export function operatorReadableErrorDetailFromUnknown(error: unknown): string | null {
  return operatorReadableErrorDetail(error instanceof Error ? error.message : null);
}

export function operatorWorkflowFailureMessage(fallback: string, error: unknown): string {
  const message = operatorReadableErrorDetailFromUnknown(error);
  if (message) return message;
  return requestFailureMessage(fallback, error);
}

export function browserLocalSourceErrorMessage(fallback: string, _error: unknown): string {
  return `${fallback}. Проверьте, что браузеру разрешено читать выбранный источник, или выберите файлы вручную.`;
}

export function browserCapabilityFailureMessage(fallback: string, _error: unknown): string {
  return `${fallback}. Проверьте разрешения браузера и повторите действие; если устройство занято другой программой, закройте ее.`;
}

export type OnboardingDismissalState = {
  dismissed: boolean;
  savedAt: string;
  draftMode: boolean;
};

export function parseOnboardingDismissalState(raw: string | null): OnboardingDismissalState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { dismissed?: unknown; savedAt?: unknown; draftMode?: unknown; version?: unknown };
    if (parsed.version !== 1 || typeof parsed.dismissed !== "boolean") return null;
    return {
      dismissed: parsed.dismissed,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : "",
      draftMode: typeof parsed.draftMode === "boolean" ? parsed.draftMode : false
    };
  } catch {
    return null;
  }
}

export function loadOnboardingDismissalState(organizationId: string | null | undefined = null): OnboardingDismissalState | null {
  if (typeof window === "undefined") return null;
  try {
    return parseOnboardingDismissalState(window.localStorage.getItem(onboardingLocalKey(organizationId)));
  } catch {
    return null;
  }
}

export function mergeLocalOnboardingDismissal(
  preferences: UiPreferences,
  organizationId: string | null | undefined = null
): UiPreferences {
  const localDismissal = loadOnboardingDismissalState(organizationId);
  if (!localDismissal) return preferences;
  const preferenceDismissedAt = preferences.onboardingDismissedAt ?? preferences.savedAt;
  if (localDismissal.savedAt && (!preferenceDismissedAt || localDismissal.savedAt > preferenceDismissedAt)) {
    return {
      ...preferences,
      onboardingDismissed: localDismissal.dismissed,
      onboardingDismissedAt: localDismissal.savedAt,
      onboardingDraftMode: localDismissal.dismissed ? localDismissal.draftMode : false,
      onboardingStep: localDismissal.dismissed ? preferences.onboardingStep : "intro",
      savedAt: localDismissal.savedAt > preferences.savedAt ? localDismissal.savedAt : preferences.savedAt
    };
  }
  return preferences;
}

export function saveOnboardingDismissed(
  dismissed: boolean,
  savedAt = new Date().toISOString(),
  draftMode = false,
  organizationId: string | null | undefined = null
): OnboardingDismissalState {
  const state = { dismissed, savedAt, draftMode: dismissed ? draftMode : false };
  if (typeof window === "undefined") return state;
  try {
    window.localStorage.setItem(
      onboardingLocalKey(organizationId),
      JSON.stringify({ version: 1, ...state })
    );
  } catch (error) {
    console.error("Failed to save onboarding dismissed state", error);
    // Onboarding state is convenience only; real clinic settings are saved server-side.
  }
  return state;
}

export const weekdayOptions = [
  { value: 1, label: "Пн" },
  { value: 2, label: "Вт" },
  { value: 3, label: "Ср" },
  { value: 4, label: "Чт" },
  { value: 5, label: "Пт" },
  { value: 6, label: "Сб" },
  { value: 0, label: "Вс" }
];

export const defaultWorkingDays = [1, 2, 3, 4, 5];

export function validClockTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function normalizeClockTime(value: string, fallback: string): string {
  return validClockTime(value) ? value : fallback;
}

export function normalizeWorkingDaysDraft(value: readonly number[] | undefined): number[] {
  const days = Array.from(new Set((value ?? defaultWorkingDays).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)));
  return days.length ? days : defaultWorkingDays;
}

export function normalizeOptionalWorkingDaysDraft(value: readonly number[] | undefined): number[] {
  return Array.from(new Set((value ?? []).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))).sort((left, right) => left - right);
}

export function staffWorkingHoursFromSimpleDraft(startValue: string, endValue: string, workingDayValue: readonly number[] | undefined): StaffWorkingHours {
  const start = normalizeClockTime(startValue, "09:00");
  const end = normalizeClockTime(endValue, "18:00");
  const workingDays = normalizeWorkingDaysDraft(workingDayValue);
  return Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    enabled: workingDays.includes(weekday),
    start,
    end
  }));
}

export function staffScheduleDraftFromWorkingHours(workingHours: StaffWorkingHours | null | undefined): StaffScheduleDraft {
  const enabledDays = (workingHours ?? []).filter((day) => day.enabled);
  const firstEnabledDay = enabledDays[0] ?? workingHours?.[0];
  const fallbackPerDay = staffWorkingHoursFromSimpleDraft(firstEnabledDay?.start ?? "09:00", firstEnabledDay?.end ?? "18:00", enabledDays.map((day) => day.weekday));
  const perDay = Array.from({ length: 7 }, (_, weekday) => {
    const configured = workingHours?.find((day) => day.weekday === weekday);
    return configured ?? fallbackPerDay[weekday] ?? { weekday, enabled: defaultWorkingDays.includes(weekday), start: "09:00", end: "18:00" };
  });
  return {
    start: firstEnabledDay?.start ?? "09:00",
    end: firstEnabledDay?.end ?? "18:00",
    workingDays: normalizeWorkingDaysDraft(enabledDays.map((day) => day.weekday)),
    perDay
  };
}

export function appointmentScheduleDraftFromAppointment(appointment: Appointment): AppointmentScheduleDraft {
  return {
    patientId: appointment.patientId ?? "",
    doctorUserId: appointment.doctorUserId ?? "",
    assistantUserId: appointment.assistantUserId ?? "",
    chairId: appointment.chairId ?? "",
    status: appointment.status,
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    reason: appointment.reason ?? "",
    comment: appointment.comment ?? ""
  };
}

export function timeZoneOffsetMinutes(timeZone: string | null | undefined, at: Date): number {
  if (!timeZone) return -at.getTimezoneOffset();
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(at);
    const value = parts.find((part) => part.type === "timeZoneName")?.value ?? "";
    if (value === "GMT" || value === "UTC") return 0;
    const match = /(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?/.exec(value);
    if (!match) return -at.getTimezoneOffset();
    const sign = match[1] === "-" ? -1 : 1;
    return sign * (Number(match[2]) * 60 + Number(match[3] ?? "0"));
  } catch {
    return -at.getTimezoneOffset();
  }
}

export function timeZoneOffsetSuffix(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? "-" : "+";
  const absolute = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
  const minutes = String(absolute % 60).padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
}

export function timeZoneDateParts(value: string, timeZone: string | null | undefined): string | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  if (!timeZone) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(parsed);
    const valueByType = new Map(parts.map((part) => [part.type, part.value]));
    const hour = valueByType.get("hour") === "24" ? "00" : valueByType.get("hour");
    const year = valueByType.get("year");
    const month = valueByType.get("month");
    const day = valueByType.get("day");
    const minute = valueByType.get("minute");
    return year && month && day && hour && minute ? `${year}-${month}-${day}T${hour}:${minute}` : null;
  } catch {
    return null;
  }
}

export function toDateTimeLocalValue(value: string, timeZone?: string | null): string {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value;
  const zoned = timeZoneDateParts(value, timeZone);
  if (zoned) return zoned;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 16);
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function fromDateTimeLocalValue(value: string, timeZone?: string | null): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(trimmed);
  if (match && timeZone) {
    const [, year, month, day, hour, minute] = match;
    const utcGuess = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)));
    let offsetMinutes = timeZoneOffsetMinutes(timeZone, utcGuess);
    const correctedInstant = new Date(utcGuess.getTime() - offsetMinutes * 60_000);
    const correctedOffsetMinutes = timeZoneOffsetMinutes(timeZone, correctedInstant);
    if (correctedOffsetMinutes !== offsetMinutes) offsetMinutes = correctedOffsetMinutes;
    return `${year}-${month}-${day}T${hour}:${minute}:00${timeZoneOffsetSuffix(offsetMinutes)}`;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString();
}

export function addMinutesToClinicDateTimeLocal(value: string, minutes: number, timeZone: string): string {
  const iso = fromDateTimeLocalValue(value, timeZone);
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return value;
  return toDateTimeLocalValue(new Date(parsed.getTime() + minutes * 60_000).toISOString(), timeZone);
}

export function weekdayFromDateInput(value: string): number {
  const parsed = Date.parse(`${value}T12:00:00Z`);
  return Number.isNaN(parsed) ? 1 : new Date(parsed).getUTCDay();
}

export function defaultAppointmentStartLocal(profile: ClinicProfile): string {
  const schedule = profile.scheduleDefaults ?? {
    workdayStart: "09:00",
    workdayEnd: "18:00",
    workingDays: [1, 2, 3, 4, 5],
    appointmentBufferMinutes: 10
  };
  const timezone = profile.timezone || "Europe/Samara";
  const now = new Date();
  for (let offset = 0; offset < 21; offset += 1) {
    const candidateDate = new Date(now.getTime() + offset * 86_400_000);
    const datePart = toDateTimeLocalValue(candidateDate.toISOString(), timezone).slice(0, 10);
    if (!schedule.workingDays.includes(weekdayFromDateInput(datePart))) continue;
    const candidate = `${datePart}T${schedule.workdayStart}`;
    if (Date.parse(fromDateTimeLocalValue(candidate, timezone)) > now.getTime() + 30 * 60_000) return candidate;
  }
  return `${toDateTimeLocalValue(new Date(now.getTime() + 86_400_000).toISOString(), timezone).slice(0, 10)}T${schedule.workdayStart}`;
}

export function newAppointmentDraftFromDashboard(
  dashboard: Dashboard,
  preferences: {
    selectedPatientId?: string | null;
    selectedSpecialty?: DentalSpecialty;
    scheduleDefaultDoctorUserId?: string | null;
    scheduleDefaultAssistantUserId?: string | null;
    scheduleDefaultChairId?: string | null;
  } = {}
): AppointmentScheduleDraft {
  const profile = dashboard.clinicSettings.profile;
  const timezone = profile.timezone || "Europe/Samara";
  const startsAtLocal = defaultAppointmentStartLocal(profile);
  const endsAtLocal = addMinutesToClinicDateTimeLocal(startsAtLocal, profile.defaultVisitMinutes || 45, timezone);
  const selectedSpecialty = preferences.selectedSpecialty ?? "universal";
  const specialtyMatches = (specialties: DentalSpecialty[]) =>
    selectedSpecialty === "universal" || specialties.includes(selectedSpecialty) || specialties.includes("universal");
  const savedDoctor = preferences.scheduleDefaultDoctorUserId
    ? dashboard.clinicSettings.staff.find(
        (member) =>
          member.id === preferences.scheduleDefaultDoctorUserId &&
          member.active &&
          (member.role === "doctor" || member.role === "owner")
      )
    : null;
  const doctor =
    savedDoctor ??
    dashboard.clinicSettings.staff.find(
      (member) => member.active && (member.role === "doctor" || member.role === "owner") && specialtyMatches(member.specialties)
    ) ?? dashboard.clinicSettings.staff.find((member) => member.active && (member.role === "doctor" || member.role === "owner"));
  const savedAssistant =
    profile.mode === "solo_doctor" || !preferences.scheduleDefaultAssistantUserId
      ? null
      : dashboard.clinicSettings.staff.find(
          (member) => member.id === preferences.scheduleDefaultAssistantUserId && member.active && member.role === "assistant"
        );
  const assistant = savedAssistant ?? dashboard.clinicSettings.staff.find((member) => member.active && member.role === "assistant");
  const savedChair = preferences.scheduleDefaultChairId
    ? dashboard.clinicSettings.chairs.find((candidate) => candidate.id === preferences.scheduleDefaultChairId && candidate.active)
    : null;
  const chair =
    savedChair ??
    dashboard.clinicSettings.chairs.find(
      (candidate) =>
        candidate.active &&
        (!candidate.specialization || selectedSpecialty === "universal" || candidate.specialization === selectedSpecialty)
    ) ?? dashboard.clinicSettings.chairs.find((candidate) => candidate.active);
  const selectedPatient = preferences.selectedPatientId
    ? dashboard.patients.find((candidate) => candidate.id === preferences.selectedPatientId && candidate.status === "active")
    : null;
  const patient = selectedPatient ?? dashboard.patients.find((candidate) => candidate.status === "active");
  return {
    patientId: patient?.id ?? "",
    doctorUserId: doctor?.id ?? "",
    assistantUserId: profile.mode === "solo_doctor" ? "" : assistant?.id ?? "",
    chairId: chair?.id ?? "",
    status: "planned",
    startsAt: fromDateTimeLocalValue(startsAtLocal, timezone),
    endsAt: fromDateTimeLocalValue(endsAtLocal, timezone),
    reason: "Первичная консультация",
    comment: ""
  };
}

export function isValidDateParts(year: number, month: number, day: number): boolean {
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export function toDateInputValue(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (iso && isValidDateParts(Number(iso[1]), Number(iso[2]), Number(iso[3]))) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const ru = /^(\d{2})\.(\d{2})\.(\d{4})/.exec(trimmed);
  if (ru && isValidDateParts(Number(ru[3]), Number(ru[2]), Number(ru[1]))) return `${ru[3]}-${ru[2]}-${ru[1]}`;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function isDateInputValue(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  return !!match && isValidDateParts(Number(match[1]), Number(match[2]), Number(match[3]));
}

export function isDateTimeLocalInputValue(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match || !isValidDateParts(Number(match[1]), Number(match[2]), Number(match[3]))) return false;
  const hours = Number(match[4]);
  const minutes = Number(match[5]);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

export function nullableAppointmentDraftValue(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function appointmentUpdateInputFromDraft(draft: AppointmentScheduleDraft): UpdateAppointmentInput {
  return {
    patientId: draft.patientId || null,
    doctorUserId: draft.doctorUserId || null,
    assistantUserId: draft.assistantUserId || null,
    chairId: draft.chairId || null,
    status: draft.status,
    startsAt: draft.startsAt.trim(),
    endsAt: draft.endsAt.trim(),
    reason: nullableAppointmentDraftValue(draft.reason),
    comment: nullableAppointmentDraftValue(draft.comment)
  };
}

export function appointmentCreateInputFromDraft(draft: AppointmentScheduleDraft): CreateAppointmentInput {
  return {
    patientId: draft.patientId,
    doctorUserId: draft.doctorUserId,
    assistantUserId: draft.assistantUserId || null,
    chairId: draft.chairId,
    status: draft.status,
    startsAt: draft.startsAt.trim(),
    endsAt: draft.endsAt.trim(),
    reason: nullableAppointmentDraftValue(draft.reason),
    comment: nullableAppointmentDraftValue(draft.comment)
  };
}

export function appointmentScheduleDraftSignature(draft: AppointmentScheduleDraft): string {
  return JSON.stringify(appointmentUpdateInputFromDraft(draft));
}

export function appointmentScheduleDateMissingSteps(draft: AppointmentScheduleDraft): string[] {
  const startsAt = draft.startsAt.trim();
  const endsAt = draft.endsAt.trim();
  const startsAtMs = Date.parse(startsAt);
  const endsAtMs = Date.parse(endsAt);
  return [
    !startsAt ? "укажите начало приема" : null,
    startsAt && !Number.isFinite(startsAtMs) ? "проверьте дату начала приема" : null,
    !endsAt ? "укажите окончание приема" : null,
    endsAt && !Number.isFinite(endsAtMs) ? "проверьте дату окончания приема" : null,
    Number.isFinite(startsAtMs) && Number.isFinite(endsAtMs) && endsAtMs <= startsAtMs
      ? "окончание приема должно быть позже начала"
      : null
  ].filter((step): step is string => Boolean(step));
}

export function appointmentScheduleMissingFields(draft: AppointmentScheduleDraft, clinicMode: Dashboard["clinicSettings"]["profile"]["mode"] | null | undefined): string[] {
  const missing: string[] = [];
  if (!draft.patientId) missing.push("выберите пациента");
  if (!draft.doctorUserId) missing.push("выберите врача");
  if (clinicMode !== "solo_doctor" && !draft.assistantUserId) missing.push("выберите ассистента");
  if (!draft.chairId) missing.push("выберите кресло");
  missing.push(...appointmentScheduleDateMissingSteps(draft));
  return missing;
}

export function staffWorkingHoursFromDraft(draft: StaffScheduleDraft): StaffWorkingHours {
  const start = normalizeClockTime(draft.start, "09:00");
  const end = normalizeClockTime(draft.end, "18:00");
  const workingDays = normalizeWorkingDaysDraft(draft.workingDays);
  const perDay = draft.perDay ?? staffWorkingHoursFromSimpleDraft(start, end, workingDays);
  return Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    enabled: workingDays.includes(weekday),
    start: normalizeClockTime(perDay[weekday]?.start ?? start, start),
    end: normalizeClockTime(perDay[weekday]?.end ?? end, end)
  }));
}

export function staffScheduleDraftSignature(draft: StaffScheduleDraft): string {
  return JSON.stringify(staffWorkingHoursFromDraft(draft));
}

export function defaultStaffScheduleDraft(): StaffScheduleDraft {
  return staffScheduleDraftFromWorkingHours(null);
}

export function emptyClinicProfileDraft(): ClinicProfileDraft {
  return {
    clinicName: "",
    legalName: "",
    inn: "",
    kpp: "",
    ogrn: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    medicalLicenseNumber: "",
    medicalLicenseIssuedAt: "",
    medicalLicenseIssuer: "",
    bankDetails: "",
    signatoryName: "",
    signatoryTitle: "",
    timezone: "Europe/Samara",
    defaultVisitMinutes: "45",
    workdayStart: "09:00",
    workdayEnd: "18:00",
    workingDays: defaultWorkingDays,
    appointmentBufferMinutes: "10",
    egiszEnabled: false
  };
}

export function clinicProfileDraftFromProfile(profile: ClinicProfile): ClinicProfileDraft {
  const schedule = profile.scheduleDefaults ?? {
    workdayStart: "09:00",
    workdayEnd: "18:00",
    workingDays: defaultWorkingDays,
    appointmentBufferMinutes: 10
  };
  return {
    clinicName: profile.clinicName,
    legalName: profile.legalName ?? "",
    inn: profile.inn ?? "",
    kpp: profile.kpp ?? "",
    ogrn: profile.ogrn ?? "",
    address: profile.address ?? "",
    phone: profile.phone ?? "",
    email: profile.email ?? "",
    website: profile.website ?? "",
    medicalLicenseNumber: profile.medicalLicenseNumber ?? "",
    medicalLicenseIssuedAt: profile.medicalLicenseIssuedAt ?? "",
    medicalLicenseIssuer: profile.medicalLicenseIssuer ?? "",
    bankDetails: profile.bankDetails ?? "",
    signatoryName: profile.signatoryName ?? "",
    signatoryTitle: profile.signatoryTitle ?? "",
    timezone: profile.timezone,
    defaultVisitMinutes: String(profile.defaultVisitMinutes),
    workdayStart: schedule.workdayStart,
    workdayEnd: schedule.workdayEnd,
    workingDays: normalizeWorkingDaysDraft(schedule.workingDays),
    appointmentBufferMinutes: String(schedule.appointmentBufferMinutes),
    egiszEnabled: profile.egiszEnabled
  };
}

export function nullableClinicDraftValue(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function emptyPatientCoreDraft(): PatientCoreDraft {
  return {
    fullName: "",
    birthDate: "",
    phone: "",
    email: "",
    notes: ""
  };
}

export function patientCoreDraftFromPatient(patient: Patient | null): PatientCoreDraft {
  return {
    fullName: patient?.fullName ?? "",
    birthDate: patient?.birthDate ?? "",
    phone: patient?.phone ?? "",
    email: patient?.email ?? "",
    notes: patient?.notes ?? ""
  };
}

export function emptyPatientAdministrativeProfileDraft(): PatientAdministrativeProfileDraft {
  return {
    identityDocument: "",
    taxpayerInn: "",
    registrationAddress: "",
    residentialAddress: "",
    insurancePolicyNumber: "",
    snils: "",
    legalRepresentativeFullName: "",
    legalRepresentativeRelationship: "",
    legalRepresentativeIdentityDocument: "",
    legalRepresentativePhone: "",
    preferredDocumentRecipient: "",
    preferredAppointmentWeekdays: [],
    preferredAppointmentStart: "",
    preferredAppointmentEnd: "",
    preferredAppointmentNote: "",
    dataProcessingBasisNote: ""
  };
}

export function patientAdministrativeProfileDraftFromPatient(patient: Patient | null): PatientAdministrativeProfileDraft {
  const profile = patient?.administrativeProfile;
  return {
    identityDocument: profile?.identityDocument ?? "",
    taxpayerInn: profile?.taxpayerInn ?? "",
    registrationAddress: profile?.registrationAddress ?? "",
    residentialAddress: profile?.residentialAddress ?? "",
    insurancePolicyNumber: profile?.insurancePolicyNumber ?? "",
    snils: profile?.snils ?? "",
    legalRepresentativeFullName: profile?.legalRepresentativeFullName ?? "",
    legalRepresentativeRelationship: profile?.legalRepresentativeRelationship ?? "",
    legalRepresentativeIdentityDocument: profile?.legalRepresentativeIdentityDocument ?? "",
    legalRepresentativePhone: profile?.legalRepresentativePhone ?? "",
    preferredDocumentRecipient: profile?.preferredDocumentRecipient ?? "",
    preferredAppointmentWeekdays: normalizeOptionalWorkingDaysDraft(profile?.preferredAppointmentWeekdays ?? []),
    preferredAppointmentStart: profile?.preferredAppointmentStart ?? "",
    preferredAppointmentEnd: profile?.preferredAppointmentEnd ?? "",
    preferredAppointmentNote: profile?.preferredAppointmentNote ?? "",
    dataProcessingBasisNote: profile?.dataProcessingBasisNote ?? ""
  };
}

export function nullablePatientDraftValue(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function buildPatientCorePayload(draft: PatientCoreDraft): UpdatePatientInput {
  return {
    fullName: draft.fullName.trim(),
    birthDate: nullablePatientDraftValue(draft.birthDate),
    phone: nullablePatientDraftValue(draft.phone),
    email: nullablePatientDraftValue(draft.email),
    notes: nullablePatientDraftValue(draft.notes)
  };
}

export function patientCoreDraftSignature(draft: PatientCoreDraft): string {
  return JSON.stringify(buildPatientCorePayload(draft));
}

export function buildPatientAdministrativeProfilePayload(
  draft: PatientAdministrativeProfileDraft
): UpdatePatientAdministrativeProfileInput {
  return {
    identityDocument: nullablePatientDraftValue(draft.identityDocument),
    taxpayerInn: nullablePatientDraftValue(draft.taxpayerInn),
    registrationAddress: nullablePatientDraftValue(draft.registrationAddress),
    residentialAddress: nullablePatientDraftValue(draft.residentialAddress),
    insurancePolicyNumber: nullablePatientDraftValue(draft.insurancePolicyNumber),
    snils: nullablePatientDraftValue(draft.snils),
    legalRepresentativeFullName: nullablePatientDraftValue(draft.legalRepresentativeFullName),
    legalRepresentativeRelationship: nullablePatientDraftValue(draft.legalRepresentativeRelationship),
    legalRepresentativeIdentityDocument: nullablePatientDraftValue(draft.legalRepresentativeIdentityDocument),
    legalRepresentativePhone: nullablePatientDraftValue(draft.legalRepresentativePhone),
    preferredDocumentRecipient: nullablePatientDraftValue(draft.preferredDocumentRecipient),
    preferredAppointmentWeekdays: draft.preferredAppointmentWeekdays,
    preferredAppointmentStart: nullablePatientDraftValue(draft.preferredAppointmentStart),
    preferredAppointmentEnd: nullablePatientDraftValue(draft.preferredAppointmentEnd),
    preferredAppointmentNote: nullablePatientDraftValue(draft.preferredAppointmentNote),
    dataProcessingBasisNote: nullablePatientDraftValue(draft.dataProcessingBasisNote)
  };
}

export function patientAdministrativeProfileDraftSignature(draft: PatientAdministrativeProfileDraft): string {
  return JSON.stringify(buildPatientAdministrativeProfilePayload(draft));
}

export function patientAdministrativeProfileDraftIssue(draft: PatientAdministrativeProfileDraft): string | null {
  const inn = draft.taxpayerInn.trim();
  if (inn && !/^\d{10}$|^\d{12}$/.test(inn)) {
    return "ИНН можно сохранить только в формате 10 или 12 цифр. Пока это локальный черновик.";
  }
  if (draft.preferredAppointmentStart && !draft.preferredAppointmentEnd) {
    return "Укажите конец удобного времени приема или очистите начало.";
  }
  if (!draft.preferredAppointmentStart && draft.preferredAppointmentEnd) {
    return "Укажите начало удобного времени приема или очистите конец.";
  }
  if (draft.preferredAppointmentStart && draft.preferredAppointmentEnd && draft.preferredAppointmentEnd <= draft.preferredAppointmentStart) {
    return "Конец удобного времени приема должен быть позже начала.";
  }
  return null;
}

export function buildClinicProfileUpdatePayload(draft: ClinicProfileDraft): UpdateClinicProfileInput {
  const defaultVisitMinutes = Number.parseInt(draft.defaultVisitMinutes, 10);
  const appointmentBufferMinutes = Number.parseInt(draft.appointmentBufferMinutes, 10);
  return {
    clinicName: draft.clinicName.trim(),
    legalName: nullableClinicDraftValue(draft.legalName),
    inn: nullableClinicDraftValue(draft.inn),
    kpp: nullableClinicDraftValue(draft.kpp),
    ogrn: nullableClinicDraftValue(draft.ogrn),
    address: nullableClinicDraftValue(draft.address),
    phone: nullableClinicDraftValue(draft.phone),
    email: nullableClinicDraftValue(draft.email),
    website: nullableClinicDraftValue(draft.website),
    medicalLicenseNumber: nullableClinicDraftValue(draft.medicalLicenseNumber),
    medicalLicenseIssuedAt: nullableClinicDraftValue(draft.medicalLicenseIssuedAt),
    medicalLicenseIssuer: nullableClinicDraftValue(draft.medicalLicenseIssuer),
    bankDetails: nullableClinicDraftValue(draft.bankDetails),
    signatoryName: nullableClinicDraftValue(draft.signatoryName),
    signatoryTitle: nullableClinicDraftValue(draft.signatoryTitle),
    timezone: draft.timezone.trim() || "Europe/Samara",
    defaultVisitMinutes: Number.isFinite(defaultVisitMinutes) ? Math.max(5, Math.min(defaultVisitMinutes, 480)) : 45,
    scheduleDefaults: {
      workdayStart: normalizeClockTime(draft.workdayStart, "09:00"),
      workdayEnd: normalizeClockTime(draft.workdayEnd, "18:00"),
      workingDays: normalizeWorkingDaysDraft(draft.workingDays),
      appointmentBufferMinutes: Number.isFinite(appointmentBufferMinutes)
        ? Math.max(0, Math.min(appointmentBufferMinutes, 180))
        : 10
    },
    egiszEnabled: draft.egiszEnabled
  };
}

export function clinicProfileDraftSignature(draft: ClinicProfileDraft): string {
  return JSON.stringify(buildClinicProfileUpdatePayload(draft));
}

export function clinicLegalMissingFields(profile: ClinicProfile): string[] {
  const required: Array<[string, string | null | undefined]> = [
    ["Юр. лицо", profile.legalName],
    ["ИНН", profile.inn],
    ["Адрес", profile.address],
    ["Телефон", profile.phone],
    ["Номер лицензии", profile.medicalLicenseNumber],
    ["Дата лицензии", profile.medicalLicenseIssuedAt],
    ["Кем выдана лицензия", profile.medicalLicenseIssuer]
  ];
  return required.filter(([, value]) => !value?.trim()).map(([label]) => label);
}

export function clinicLegalReadinessPercent(profile: ClinicProfile): number {
  const missing = clinicLegalMissingFields(profile).length;
  return Math.round(((7 - missing) / 7) * 100);
}

export function isVisitNoteForm(value: unknown): value is VisitNoteForm {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Record<VisitNoteField, unknown>>;
  return visitNoteFieldDefinitions.every(({ key }) => typeof candidate[key] === "string");
}

export function loadVisitLocalDraft(visitId: string, organizationId: string | null | undefined = null): VisitLocalDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.localStorage.getItem(visitLocalDraftKey(visitId, organizationId)) ??
      (organizationId ? window.localStorage.getItem(visitLocalDraftKey(visitId)) : null);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VisitLocalDraft>;
    if (
      parsed.version !== 1 ||
      parsed.visitId !== visitId ||
      typeof parsed.savedAt !== "string" ||
      typeof parsed.transcript !== "string" ||
      !isDentalSpecialty(parsed.selectedSpecialty) ||
      !isVisitNoteForm(parsed.visitNoteForm)
    ) {
      return null;
    }
    if (!localSavedAtFresh(parsed.savedAt, sensitiveLocalDraftRetentionMs)) {
      window.localStorage.removeItem(visitLocalDraftKey(visitId, organizationId));
      if (organizationId) window.localStorage.removeItem(visitLocalDraftKey(visitId));
      return null;
    }
    return parsed as VisitLocalDraft;
  } catch {
    return null;
  }
}

export function saveVisitLocalDraft(draft: VisitLocalDraft, organizationId: string | null | undefined = null): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(visitLocalDraftKey(draft.visitId, organizationId), JSON.stringify(draft));
}

export function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

export function isVisitNoteDraft(value: unknown): value is VisitNoteDraft {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<VisitNoteDraft>;
  return (
    isNullableString(candidate.complaint) &&
    isNullableString(candidate.anamnesis) &&
    isNullableString(candidate.objectiveStatus) &&
    isNullableString(candidate.diagnosis) &&
    isNullableString(candidate.treatmentPlan) &&
    Array.isArray(candidate.warnings) &&
    candidate.warnings.every((warning) => typeof warning === "string")
  );
}

export function parsePendingVisitSaveQueue(
  raw: string | null,
  activeOrganizationId: string | null | undefined,
  legacyOrganizationFallback: string | null | undefined = null
): PendingVisitSave[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): PendingVisitSave[] => {
      const normalized = normalizePendingVisitSave(item, activeOrganizationId, legacyOrganizationFallback);
      return normalized ? [normalized] : [];
    });
  } catch {
    return [];
  }
}

export function normalizePendingVisitSave(
  value: unknown,
  activeOrganizationId: string | null | undefined,
  legacyOrganizationFallback: string | null | undefined = null
): PendingVisitSave | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<PendingVisitSave>;
  const { id, visitId, queuedAt, draft, doctorSummary, transcript, selectedSpecialty } = candidate;
  const organizationId =
    normalizedLocalOrganizationId(candidate.organizationId) ?? normalizedLocalOrganizationId(legacyOrganizationFallback);
  if (
    candidate.version !== 1 ||
    typeof id !== "string" ||
    !localQueueOrganizationMatches(organizationId, activeOrganizationId) ||
    typeof visitId !== "string" ||
    typeof queuedAt !== "string" ||
    !localSavedAtFresh(queuedAt, sensitiveLocalDraftRetentionMs) ||
    !isVisitNoteDraft(draft) ||
    !isNullableString(doctorSummary) ||
    typeof transcript !== "string" ||
    !isDentalSpecialty(selectedSpecialty)
  ) {
    return null;
  }
  const normalizedBaseRevision =
    typeof candidate.baseRevision === "number" && Number.isInteger(candidate.baseRevision) ? candidate.baseRevision : null;
  return {
    version: 1,
    id,
    organizationId,
    visitId,
    clientMutationId: typeof candidate.clientMutationId === "string" ? candidate.clientMutationId : id,
    baseRevision: normalizedBaseRevision,
    queuedAt,
    draft,
    doctorSummary,
    transcript,
    selectedSpecialty
  };
}

export function sortPendingVisitSaves(queue: PendingVisitSave[]): PendingVisitSave[] {
  return queue.slice().sort((left, right) => left.queuedAt.localeCompare(right.queuedAt));
}

export function loadPendingVisitSavesFromLocalStorage(organizationId: string | null | undefined = null): PendingVisitSave[] {
  if (typeof window === "undefined") return [];
  const normalizedOrganizationId = normalizedLocalOrganizationId(organizationId);
  const localKey = pendingVisitSaveQueueLocalKey(normalizedOrganizationId);
  const scopedRaw = window.localStorage.getItem(localKey);
  const legacyRaw = normalizedOrganizationId ? window.localStorage.getItem(pendingVisitSaveQueueKey) : null;
  const byId = new Map<string, PendingVisitSave>();
  for (const item of parsePendingVisitSaveQueue(scopedRaw, normalizedOrganizationId)) {
    byId.set(item.id, item);
  }
  for (const item of parsePendingVisitSaveQueue(legacyRaw, normalizedOrganizationId, normalizedOrganizationId)) {
    byId.set(item.id, item);
  }
  const queue = sortPendingVisitSaves(Array.from(byId.values()));
  if (normalizedOrganizationId && legacyRaw) {
    savePendingVisitSavesToLocalStorage(queue, normalizedOrganizationId);
    window.localStorage.removeItem(pendingVisitSaveQueueKey);
  }
  return queue;
}

export function savePendingVisitSavesToLocalStorage(queue: PendingVisitSave[], organizationId: string | null | undefined = null): void {
  if (typeof window === "undefined") return;
  const localKey = pendingVisitSaveQueueLocalKey(organizationId);
  const normalizedOrganizationId = normalizedLocalOrganizationId(organizationId);
  const scopedQueue = sortPendingVisitSaves(
    queue
      .map((item) => ({ ...item, organizationId: normalizedLocalOrganizationId(item.organizationId) ?? normalizedOrganizationId }))
      .filter(
        (item) =>
          localQueueOrganizationMatches(item.organizationId, normalizedOrganizationId) &&
          localSavedAtFresh(item.queuedAt, sensitiveLocalDraftRetentionMs)
      )
  );
  if (!scopedQueue.length) {
    window.localStorage.removeItem(localKey);
    return;
  }
  window.localStorage.setItem(localKey, JSON.stringify(scopedQueue));
}

export function isPendingSpeechChunk(value: unknown): value is PendingSpeechChunk {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PendingSpeechChunk>;
  return (
    candidate.version === 1 &&
    typeof candidate.id === "string" &&
    typeof candidate.queuedAt === "string" &&
    typeof candidate.recordingId === "string" &&
    typeof candidate.chunkIndex === "number" &&
    Number.isInteger(candidate.chunkIndex) &&
    typeof candidate.mimeType === "string" &&
    typeof candidate.language === "string" &&
    typeof candidate.source === "string" &&
    (typeof candidate.audioBase64 === "string" || typeof candidate.localTranscript === "string")
  );
}

export function normalizePendingSpeechChunk(
  value: unknown,
  activeOrganizationId: string | null | undefined,
  legacyOrganizationFallback: string | null | undefined = null
): PendingSpeechChunk | null {
  if (!isPendingSpeechChunk(value)) return null;
  const organizationId = normalizedLocalOrganizationId(value.organizationId) ?? normalizedLocalOrganizationId(legacyOrganizationFallback);
  if (!localQueueOrganizationMatches(organizationId, activeOrganizationId)) return null;
  if (!localSavedAtFresh(value.queuedAt, speechAudioQueueRetentionMs)) return null;
  return { ...value, organizationId };
}

export function sortPendingSpeechChunks(queue: PendingSpeechChunk[]): PendingSpeechChunk[] {
  return queue.slice().sort((left, right) => left.queuedAt.localeCompare(right.queuedAt));
}

export function loadPendingSpeechChunksFromLocalStorage(organizationId: string | null | undefined = null): PendingSpeechChunk[] {
  if (typeof window === "undefined") return [];
  try {
    const normalizedOrganizationId = normalizedLocalOrganizationId(organizationId);
    const localKey = pendingSpeechChunkQueueLocalKey(normalizedOrganizationId);
    const scopedRaw = window.localStorage.getItem(localKey);
    const legacyRaw = normalizedOrganizationId ? window.localStorage.getItem(pendingSpeechChunkQueueKey) : null;
    const byId = new Map<string, PendingSpeechChunk>();
    for (const raw of [scopedRaw, legacyRaw]) {
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) continue;
      for (const item of parsed) {
        const normalized = normalizePendingSpeechChunk(item, normalizedOrganizationId, raw === legacyRaw ? normalizedOrganizationId : null);
        if (normalized) byId.set(normalized.id, normalized);
      }
    }
    const queue = sortPendingSpeechChunks(Array.from(byId.values()));
    if (normalizedOrganizationId && legacyRaw) {
      savePendingSpeechChunksToLocalStorage(queue, normalizedOrganizationId);
      window.localStorage.removeItem(pendingSpeechChunkQueueKey);
    }
    return queue;
  } catch {
    return [];
  }
}

export function savePendingSpeechChunksToLocalStorage(queue: PendingSpeechChunk[], organizationId: string | null | undefined = null): void {
  if (typeof window === "undefined") return;
  const normalizedOrganizationId = normalizedLocalOrganizationId(organizationId);
  const localKey = pendingSpeechChunkQueueLocalKey(normalizedOrganizationId);
  const scopedQueue = sortPendingSpeechChunks(
    queue
      .map((item) => ({ ...item, organizationId: normalizedLocalOrganizationId(item.organizationId) ?? normalizedOrganizationId }))
      .filter(
        (item) =>
          localQueueOrganizationMatches(item.organizationId, normalizedOrganizationId) &&
          localSavedAtFresh(item.queuedAt, speechAudioQueueRetentionMs)
      )
  );
  if (!scopedQueue.length) {
    window.localStorage.removeItem(localKey);
    return;
  }
  const payload = JSON.stringify(scopedQueue);
  if (payload.length > speechLocalStorageFallbackMaxBytes) {
    throw new Error("Память для аудио на этом устройстве переполнена; освободите место или отправьте текущую запись.");
  }
  window.localStorage.setItem(localKey, payload);
}

export function speechChunkIndexedDbAvailable(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

export function pendingVisitSaveIndexedDbAvailable(): boolean {
  return speechChunkIndexedDbAvailable();
}

export function assertSpeechChunkDbStores(db: IDBDatabase): void {
  const missingStores = requiredSpeechChunkDbStoreNames.filter((storeName) => !db.objectStoreNames.contains(storeName));
  if (missingStores.length) {
    throw new Error(`Offline IndexedDB schema is missing stores: ${missingStores.join(", ")}`);
  }
}

export function openSpeechChunkDb(): Promise<IDBDatabase> {
  if (!speechChunkIndexedDbAvailable()) return Promise.reject(new Error("Браузер не дает сохранить аудио для отправки позже"));
  if (speechChunkDbPromise) return speechChunkDbPromise;
  speechChunkDbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(speechChunkDbName, speechChunkDbVersion);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(pendingVisitSaveStoreName)) {
        const store = db.createObjectStore(pendingVisitSaveStoreName, { keyPath: "id" });
        store.createIndex("queuedAt", "queuedAt");
        store.createIndex("organizationId", "organizationId");
        store.createIndex("visitId", "visitId");
      }
      if (!db.objectStoreNames.contains(dicomWorkbenchDraftStoreName)) {
        const store = db.createObjectStore(dicomWorkbenchDraftStoreName, { keyPath: "storageKey" });
        store.createIndex("organizationId", "organizationId");
        store.createIndex("seriesKey", "seriesKey");
        store.createIndex("clientSavedAt", "clientSavedAt");
      }
      if (!db.objectStoreNames.contains(mprWorkbenchDraftStoreName)) {
        const store = db.createObjectStore(mprWorkbenchDraftStoreName, { keyPath: "storageKey" });
        store.createIndex("organizationId", "organizationId");
        store.createIndex("seriesKey", "seriesKey");
        store.createIndex("clientSavedAt", "clientSavedAt");
      }
      if (!db.objectStoreNames.contains(speechChunkStoreName)) {
        const store = db.createObjectStore(speechChunkStoreName, { keyPath: "id" });
        store.createIndex("queuedAt", "queuedAt");
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      try {
        assertSpeechChunkDbStores(db);
        resolve(db);
      } catch (error) {
        db.close();
        speechChunkDbPromise = null;
        reject(error instanceof Error ? error : new Error("Offline IndexedDB schema is incomplete"));
      }
    };
    request.onerror = () => {
      speechChunkDbPromise = null;
      reject(request.error ?? new Error("Хранилище аудио не открылось"));
    };
    request.onblocked = () => {
      speechChunkDbPromise = null;
      reject(new Error("Хранилище аудио заблокировано другой вкладкой"));
    };
  });
  return speechChunkDbPromise;
}

export async function readLocalDicomWorkbenchDraftFromIndexedDb(
  organizationId: string | null | undefined = null
): Promise<DicomWorkbenchLocalDraft | null> {
  const db = await openSpeechChunkDb();
  const key = dicomWorkbenchIndexedDbKey(organizationId);
  const record = await new Promise<unknown>((resolve, reject) => {
    const transaction = db.transaction(dicomWorkbenchDraftStoreName, "readonly");
    const request = transaction.objectStore(dicomWorkbenchDraftStoreName).get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error ?? new Error("Local DICOM workbench draft read failed"));
    transaction.onerror = () => reject(transaction.error ?? new Error("Local DICOM workbench draft transaction failed"));
  });
  const normalized = normalizeLocalDicomWorkbenchDraft(record);
  if (!normalized && record && typeof record === "object") {
    await deleteLocalDicomWorkbenchDraftFromIndexedDb(organizationId).catch(() => undefined);
  }
  return normalized;
}

export async function saveLocalDicomWorkbenchDraftToIndexedDb(
  draft: DicomWorkbenchLocalDraft,
  organizationId: string | null | undefined = null
): Promise<void> {
  const db = await openSpeechChunkDb();
  const normalizedOrganizationId = normalizedLocalOrganizationId(organizationId);
  const record: DicomWorkbenchIndexedDbDraft = {
    ...draft,
    storageKey: dicomWorkbenchIndexedDbKey(normalizedOrganizationId),
    organizationId: normalizedOrganizationId
  };
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(dicomWorkbenchDraftStoreName, "readwrite");
    transaction.objectStore(dicomWorkbenchDraftStoreName).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Local DICOM workbench draft save failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Local DICOM workbench draft save aborted"));
  });
}

export async function deleteLocalDicomWorkbenchDraftFromIndexedDb(organizationId: string | null | undefined = null): Promise<void> {
  const db = await openSpeechChunkDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(dicomWorkbenchDraftStoreName, "readwrite");
    transaction.objectStore(dicomWorkbenchDraftStoreName).delete(dicomWorkbenchIndexedDbKey(organizationId));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Local DICOM workbench draft delete failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Local DICOM workbench draft delete aborted"));
  });
}

export async function migrateLocalDicomWorkbenchDraftFromLocalStorage(organizationId: string | null | undefined = null): Promise<void> {
  if (!speechChunkIndexedDbAvailable()) return;
  const legacyDraft = loadLocalDicomWorkbenchDraftFromLocalStorage(organizationId);
  if (!legacyDraft) return;
  const existing = await readLocalDicomWorkbenchDraftFromIndexedDb(organizationId).catch(() => null);
  const draft = newerDicomWorkbenchDraft(existing, legacyDraft);
  if (!draft) return;
  await saveLocalDicomWorkbenchDraftToIndexedDb(draft, organizationId);
  removeLocalDicomWorkbenchDraftFromLocalStorage(organizationId);
}

export async function loadLocalDicomWorkbenchDraft(
  organizationId: string | null | undefined = null
): Promise<DicomWorkbenchLocalDraft | null> {
  if (!speechChunkIndexedDbAvailable()) return loadLocalDicomWorkbenchDraftFromLocalStorage(organizationId);
  try {
    await migrateLocalDicomWorkbenchDraftFromLocalStorage(organizationId);
    return await readLocalDicomWorkbenchDraftFromIndexedDb(organizationId);
  } catch {
    return loadLocalDicomWorkbenchDraftFromLocalStorage(organizationId);
  }
}

export async function saveLocalDicomWorkbenchDraft(
  manifest: DicomViewerWorkbenchManifestResponse,
  clientSavedAt: string,
  organizationId: string | null | undefined = null
): Promise<boolean> {
  const draft = createLocalDicomWorkbenchDraft(manifest, clientSavedAt);
  if (speechChunkIndexedDbAvailable()) {
    try {
      await saveLocalDicomWorkbenchDraftToIndexedDb(draft, organizationId);
      removeLocalDicomWorkbenchDraftFromLocalStorage(organizationId);
      return true;
    } catch (error) {
      console.error("Failed to save local dicom workbench draft to indexed db", error);
      // Keep local CT workbench recovery available on restricted browsers.
    }
  }
  return saveLocalDicomWorkbenchDraftToLocalStorage(draft, organizationId);
}

export async function removeLocalDicomWorkbenchDraft(organizationId: string | null | undefined = null): Promise<void> {
  if (speechChunkIndexedDbAvailable()) {
    await deleteLocalDicomWorkbenchDraftFromIndexedDb(organizationId).catch(() => undefined);
  }
  removeLocalDicomWorkbenchDraftFromLocalStorage(organizationId);
}

export function normalizeMprWorkbenchDraft(value: unknown, seriesKey: string): MprWorkbenchLocalDraft | null {
  if (!value || typeof value !== "object") return null;
  const parsed = value as Partial<MprWorkbenchLocalDraft>;
  if (parsed?.version !== 1 || parsed.seriesKey !== seriesKey || typeof parsed.clientSavedAt !== "string") return null;
  if (!localSavedAtFresh(parsed.clientSavedAt, sensitiveLocalDraftRetentionMs)) return null;
  const state = normalizeMprWorkbenchState(parsed.state);
  return state ? { version: 1, seriesKey, state, clientSavedAt: parsed.clientSavedAt } : null;
}

export async function readLocalMprWorkbenchDraftFromIndexedDb(
  seriesKey: string,
  organizationId: string | null | undefined = null
): Promise<MprWorkbenchLocalDraft | null> {
  const db = await openSpeechChunkDb();
  const key = mprWorkbenchIndexedDbKey(seriesKey, organizationId);
  const record = await new Promise<unknown>((resolve, reject) => {
    const transaction = db.transaction(mprWorkbenchDraftStoreName, "readonly");
    const request = transaction.objectStore(mprWorkbenchDraftStoreName).get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error ?? new Error("Local MPR workbench draft read failed"));
    transaction.onerror = () => reject(transaction.error ?? new Error("Local MPR workbench draft transaction failed"));
  });
  const normalized = normalizeMprWorkbenchDraft(record, seriesKey);
  if (!normalized && record && typeof record === "object") {
    await deleteLocalMprWorkbenchDraftFromIndexedDb(seriesKey, organizationId).catch(() => undefined);
  }
  return normalized;
}

export async function saveLocalMprWorkbenchDraftToIndexedDb(
  seriesKey: string,
  state: MprWorkbenchState,
  clientSavedAt: string,
  organizationId: string | null | undefined = null
): Promise<void> {
  const db = await openSpeechChunkDb();
  const normalizedOrganizationId = normalizedLocalOrganizationId(organizationId);
  const record: MprWorkbenchIndexedDbDraft = {
    version: 1,
    seriesKey,
    state,
    clientSavedAt,
    storageKey: mprWorkbenchIndexedDbKey(seriesKey, normalizedOrganizationId),
    organizationId: normalizedOrganizationId
  };
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(mprWorkbenchDraftStoreName, "readwrite");
    transaction.objectStore(mprWorkbenchDraftStoreName).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Local MPR workbench draft save failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Local MPR workbench draft save aborted"));
  });
}

export async function deleteLocalMprWorkbenchDraftFromIndexedDb(
  seriesKey: string,
  organizationId: string | null | undefined = null
): Promise<void> {
  const db = await openSpeechChunkDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(mprWorkbenchDraftStoreName, "readwrite");
    transaction.objectStore(mprWorkbenchDraftStoreName).delete(mprWorkbenchIndexedDbKey(seriesKey, organizationId));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Local MPR workbench draft delete failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Local MPR workbench draft delete aborted"));
  });
}

export async function migrateLocalMprWorkbenchDraftFromLocalStorage(
  seriesKey: string,
  organizationId: string | null | undefined = null
): Promise<void> {
  if (!speechChunkIndexedDbAvailable()) return;
  const legacyDraft = loadLocalMprWorkbenchDraftFromLocalStorage(seriesKey, organizationId);
  if (!legacyDraft) return;
  const existing = await readLocalMprWorkbenchDraftFromIndexedDb(seriesKey, organizationId).catch(() => null);
  const draft =
    existing && Date.parse(existing.clientSavedAt) >= Date.parse(legacyDraft.clientSavedAt) ? existing : legacyDraft;
  await saveLocalMprWorkbenchDraftToIndexedDb(seriesKey, draft.state, draft.clientSavedAt, organizationId);
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(mprWorkbenchLocalKey(seriesKey, organizationId));
    if (organizationId) window.localStorage.removeItem(mprWorkbenchLocalKey(seriesKey));
  }
}

export async function loadLocalMprWorkbenchDraft(
  seriesKey: string | null,
  organizationId: string | null | undefined = null
): Promise<MprWorkbenchLocalDraft | null> {
  if (!seriesKey) return null;
  if (!speechChunkIndexedDbAvailable()) return loadLocalMprWorkbenchDraftFromLocalStorage(seriesKey, organizationId);
  try {
    await migrateLocalMprWorkbenchDraftFromLocalStorage(seriesKey, organizationId);
    return await readLocalMprWorkbenchDraftFromIndexedDb(seriesKey, organizationId);
  } catch {
    return loadLocalMprWorkbenchDraftFromLocalStorage(seriesKey, organizationId);
  }
}

export async function saveLocalMprWorkbenchDraft(
  seriesKey: string,
  state: MprWorkbenchState,
  clientSavedAt: string,
  organizationId: string | null | undefined = null
): Promise<boolean> {
  if (speechChunkIndexedDbAvailable()) {
    try {
      await saveLocalMprWorkbenchDraftToIndexedDb(seriesKey, state, clientSavedAt, organizationId);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(mprWorkbenchLocalKey(seriesKey, organizationId));
        if (organizationId) window.localStorage.removeItem(mprWorkbenchLocalKey(seriesKey));
      }
      return true;
    } catch (error) {
      console.error("Failed to remove local MPR workbench draft from local storage", error);
      // Keep MPR recovery available on restricted browsers.
    }
  }
  return saveLocalMprWorkbenchDraftToLocalStorage(seriesKey, state, clientSavedAt, organizationId);
}

export async function readPendingVisitSavesFromIndexedDb(organizationId: string | null | undefined = null): Promise<PendingVisitSave[]> {
  const db = await openSpeechChunkDb();
  const normalizedOrganizationId = normalizedLocalOrganizationId(organizationId);
  const values = await new Promise<unknown[]>((resolve, reject) => {
    const transaction = db.transaction(pendingVisitSaveStoreName, "readonly");
    const request = transaction.objectStore(pendingVisitSaveStoreName).getAll();
    request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
    request.onerror = () => reject(request.error ?? new Error("Local visit queue read failed"));
    transaction.onerror = () => reject(transaction.error ?? new Error("Local visit queue transaction failed"));
  });
  const queue: PendingVisitSave[] = [];
  const staleIds: string[] = [];
  for (const value of values) {
    const candidate = value && typeof value === "object" ? (value as Partial<PendingVisitSave>) : {};
    const normalized = normalizePendingVisitSave(value, normalizedOrganizationId, normalizedOrganizationId);
    if (normalized) {
      queue.push(normalized);
    } else if (typeof candidate.id === "string") {
      const itemOrganizationId = normalizedLocalOrganizationId(candidate.organizationId) ?? normalizedOrganizationId;
      const stale =
        typeof candidate.queuedAt === "string" && !localSavedAtFresh(candidate.queuedAt, sensitiveLocalDraftRetentionMs);
      const malformedActiveRecord = localQueueOrganizationMatches(itemOrganizationId, normalizedOrganizationId);
      if (stale || malformedActiveRecord) {
        staleIds.push(candidate.id);
      }
    }
  }
  if (staleIds.length) {
    await Promise.allSettled(staleIds.map((id) => deletePendingVisitSaveFromIndexedDb(id)));
  }
  return sortPendingVisitSaves(queue);
}

export async function savePendingVisitSavesToIndexedDb(
  queue: PendingVisitSave[],
  organizationId: string | null | undefined = null
): Promise<void> {
  const db = await openSpeechChunkDb();
  const normalizedOrganizationId = normalizedLocalOrganizationId(organizationId);
  const scopedQueue = sortPendingVisitSaves(
    queue
      .map((item) => ({ ...item, organizationId: normalizedLocalOrganizationId(item.organizationId) ?? normalizedOrganizationId }))
      .filter(
        (item) =>
          localQueueOrganizationMatches(item.organizationId, normalizedOrganizationId) &&
          localSavedAtFresh(item.queuedAt, sensitiveLocalDraftRetentionMs)
      )
  );
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(pendingVisitSaveStoreName, "readwrite");
    const store = transaction.objectStore(pendingVisitSaveStoreName);
    const request = store.getAll();
    request.onsuccess = () => {
      const existing = Array.isArray(request.result) ? request.result : [];
      for (const value of existing) {
        const candidate = value && typeof value === "object" ? (value as Partial<PendingVisitSave>) : {};
        const itemOrganizationId = normalizedLocalOrganizationId(candidate.organizationId) ?? normalizedOrganizationId;
        const stale =
          typeof candidate.queuedAt === "string" && !localSavedAtFresh(candidate.queuedAt, sensitiveLocalDraftRetentionMs);
        if (typeof candidate.id === "string" && (localQueueOrganizationMatches(itemOrganizationId, normalizedOrganizationId) || stale)) {
          store.delete(candidate.id);
        }
      }
      for (const item of scopedQueue) {
        store.put(item);
      }
    };
    request.onerror = () => reject(request.error ?? new Error("Local visit queue read failed"));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Local visit queue save failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Local visit queue save aborted"));
  });
}

export async function deletePendingVisitSaveFromIndexedDb(id: string): Promise<void> {
  const db = await openSpeechChunkDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(pendingVisitSaveStoreName, "readwrite");
    transaction.objectStore(pendingVisitSaveStoreName).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Local visit queue delete failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Local visit queue delete aborted"));
  });
}

export async function migratePendingVisitSavesFromLocalStorage(organizationId: string | null | undefined = null): Promise<void> {
  const normalizedOrganizationId = normalizedLocalOrganizationId(organizationId);
  const legacyQueue = loadPendingVisitSavesFromLocalStorage(normalizedOrganizationId);
  if (!legacyQueue.length || !pendingVisitSaveIndexedDbAvailable()) return;
  const existing = await readPendingVisitSavesFromIndexedDb(normalizedOrganizationId).catch(() => []);
  const byId = new Map<string, PendingVisitSave>();
  for (const item of [...existing, ...legacyQueue]) {
    byId.set(item.id, item);
  }
  await savePendingVisitSavesToIndexedDb(sortPendingVisitSaves(Array.from(byId.values())), normalizedOrganizationId);
  window.localStorage.removeItem(pendingVisitSaveQueueLocalKey(normalizedOrganizationId));
  if (normalizedOrganizationId) window.localStorage.removeItem(pendingVisitSaveQueueKey);
}

export async function loadPendingVisitSaves(organizationId: string | null | undefined = null): Promise<PendingVisitSave[]> {
  if (!pendingVisitSaveIndexedDbAvailable()) return loadPendingVisitSavesFromLocalStorage(organizationId);
  try {
    await migratePendingVisitSavesFromLocalStorage(organizationId);
    return await readPendingVisitSavesFromIndexedDb(organizationId);
  } catch {
    return loadPendingVisitSavesFromLocalStorage(organizationId);
  }
}

export async function savePendingVisitSaves(queue: PendingVisitSave[], organizationId: string | null | undefined = null): Promise<void> {
  const normalizedOrganizationId = normalizedLocalOrganizationId(organizationId);
  if (pendingVisitSaveIndexedDbAvailable()) {
    try {
      await savePendingVisitSavesToIndexedDb(queue, normalizedOrganizationId);
      window.localStorage.removeItem(pendingVisitSaveQueueLocalKey(normalizedOrganizationId));
      if (normalizedOrganizationId) window.localStorage.removeItem(pendingVisitSaveQueueKey);
      return;
    } catch (error) {
      console.error("Failed to save pending visit saves to indexed db", error);
      // Keep accepted visits retryable on restricted browsers.
    }
  }
  savePendingVisitSavesToLocalStorage(queue, normalizedOrganizationId);
}

export async function readPendingSpeechChunksFromIndexedDb(organizationId: string | null | undefined = null): Promise<PendingSpeechChunk[]> {
  const db = await openSpeechChunkDb();
  const normalizedOrganizationId = normalizedLocalOrganizationId(organizationId);
  const values = await new Promise<unknown[]>((resolve, reject) => {
    const transaction = db.transaction(speechChunkStoreName, "readonly");
    const request = transaction.objectStore(speechChunkStoreName).getAll();
    request.onsuccess = () => {
      resolve(Array.isArray(request.result) ? request.result : []);
    };
    request.onerror = () => reject(request.error ?? new Error("Хранилище аудио не прочитано"));
    transaction.onerror = () => reject(transaction.error ?? new Error("Операция с хранилищем аудио не выполнена"));
  });
  const queue: PendingSpeechChunk[] = [];
  const staleIds: string[] = [];
  for (const value of values) {
    const id = value && typeof value === "object" && typeof (value as Partial<PendingSpeechChunk>).id === "string"
      ? (value as Partial<PendingSpeechChunk>).id
      : null;
    const normalized = normalizePendingSpeechChunk(value, normalizedOrganizationId, normalizedOrganizationId);
    if (normalized) {
      queue.push(normalized);
    } else if (id && (!isPendingSpeechChunk(value) || !localSavedAtFresh(value.queuedAt, speechAudioQueueRetentionMs))) {
      staleIds.push(id);
    }
  }
  if (staleIds.length) {
    await Promise.allSettled(staleIds.map((id) => deletePendingSpeechChunkFromIndexedDb(id)));
  }
  return sortPendingSpeechChunks(queue);
}

export async function savePendingSpeechChunksToIndexedDb(queue: PendingSpeechChunk[], organizationId: string | null | undefined = null): Promise<void> {
  const db = await openSpeechChunkDb();
  const normalizedOrganizationId = normalizedLocalOrganizationId(organizationId);
  const scopedQueue = sortPendingSpeechChunks(
    queue
      .map((item) => ({ ...item, organizationId: normalizedLocalOrganizationId(item.organizationId) ?? normalizedOrganizationId }))
      .filter(
        (item) =>
          localQueueOrganizationMatches(item.organizationId, normalizedOrganizationId) &&
          localSavedAtFresh(item.queuedAt, speechAudioQueueRetentionMs)
      )
  );
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(speechChunkStoreName, "readwrite");
    const store = transaction.objectStore(speechChunkStoreName);
    for (const chunk of scopedQueue) {
      store.put(chunk);
    }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Аудио не сохранено в локальное хранилище"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Сохранение аудио отменено браузером"));
  });
}

export async function putPendingSpeechChunkToIndexedDb(chunk: PendingSpeechChunk): Promise<void> {
  const db = await openSpeechChunkDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(speechChunkStoreName, "readwrite");
    transaction.objectStore(speechChunkStoreName).put(chunk);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Очередь аудио не обновлена"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Обновление очереди аудио отменено браузером"));
  });
}

export async function deletePendingSpeechChunkFromIndexedDb(id: string): Promise<void> {
  const db = await openSpeechChunkDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(speechChunkStoreName, "readwrite");
    transaction.objectStore(speechChunkStoreName).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Аудио не удалено из локальной очереди"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Удаление аудио из очереди отменено браузером"));
  });
}

export async function migrateSpeechChunksFromLocalStorage(organizationId: string | null | undefined = null): Promise<void> {
  const normalizedOrganizationId = normalizedLocalOrganizationId(organizationId);
  const legacyQueue = loadPendingSpeechChunksFromLocalStorage(normalizedOrganizationId);
  if (!legacyQueue.length || !speechChunkIndexedDbAvailable()) return;
  const existing = await readPendingSpeechChunksFromIndexedDb(normalizedOrganizationId).catch(() => []);
  const byId = new Map<string, PendingSpeechChunk>();
  for (const chunk of [...existing, ...legacyQueue]) {
    byId.set(chunk.id, chunk);
  }
  await savePendingSpeechChunksToIndexedDb(sortPendingSpeechChunks(Array.from(byId.values())), normalizedOrganizationId);
  window.localStorage.removeItem(pendingSpeechChunkQueueLocalKey(normalizedOrganizationId));
  if (normalizedOrganizationId) window.localStorage.removeItem(pendingSpeechChunkQueueKey);
}

export async function loadPendingSpeechChunks(organizationId: string | null | undefined = null): Promise<PendingSpeechChunk[]> {
  if (!speechChunkIndexedDbAvailable()) return loadPendingSpeechChunksFromLocalStorage(organizationId);
  try {
    await migrateSpeechChunksFromLocalStorage(organizationId);
    return await readPendingSpeechChunksFromIndexedDb(organizationId);
  } catch {
    return loadPendingSpeechChunksFromLocalStorage(organizationId);
  }
}

export function createLocalQueueId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function queuePendingSpeechChunk(
  chunk: SpeechChunkUploadInput,
  organizationId: string | null | undefined = null
): Promise<PendingSpeechChunk | null> {
  if (typeof window === "undefined") return null;
  const normalizedOrganizationId = normalizedLocalOrganizationId(organizationId);
  const queued: PendingSpeechChunk = {
    ...chunk,
    version: 1,
    id: createLocalQueueId(),
    organizationId: normalizedOrganizationId,
    queuedAt: new Date().toISOString()
  };
  if (speechChunkIndexedDbAvailable()) {
    try {
      await migrateSpeechChunksFromLocalStorage(normalizedOrganizationId);
      await putPendingSpeechChunkToIndexedDb(queued);
      window.localStorage.removeItem(pendingSpeechChunkQueueLocalKey(normalizedOrganizationId));
      if (normalizedOrganizationId) window.localStorage.removeItem(pendingSpeechChunkQueueKey);
      return queued;
    } catch (error) {
      console.error("Failed to put pending speech chunk to indexed db", error);
      // Fall through to the small legacy fallback. It may reject instead of silently dropping audio.
    }
  }
  try {
    await savePendingSpeechChunksToLocalStorage([...loadPendingSpeechChunksFromLocalStorage(normalizedOrganizationId), queued], normalizedOrganizationId);
    return queued;
  } catch {
    return null;
  }
}

export async function removePendingSpeechChunkById(id: string, organizationId: string | null | undefined = null): Promise<void> {
  if (speechChunkIndexedDbAvailable()) {
    try {
      await deletePendingSpeechChunkFromIndexedDb(id);
      return;
    } catch (error) {
      console.error("Failed to delete pending speech chunk from indexed db", error);
      // Legacy fallback below keeps retry cleanup working when browser audio storage is unavailable mid-session.
    }
  }
  savePendingSpeechChunksToLocalStorage(loadPendingSpeechChunksFromLocalStorage(organizationId).filter((chunk) => chunk.id !== id), organizationId);
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Аудиофрагмент не удалось прочитать"));
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(result.split(",")[1] ?? "");
    };
    reader.readAsDataURL(blob);
  });
}

export type PricelistImageMimeType = "image/jpeg" | "image/png" | "image/webp";

export const pricelistImageMimeTypes: PricelistImageMimeType[] = ["image/jpeg", "image/png", "image/webp"];
export const maxPricelistImageBase64Chars = 3_800_000;

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Снимок не удалось прочитать"));
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  });
}

export function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Снимок не удалось распознать"));
    image.src = dataUrl;
  });
}

export async function preparePricelistImage(file: File): Promise<{
  base64: string;
  mimeType: PricelistImageMimeType;
  note: string;
}> {
  if (!pricelistImageMimeTypes.includes(file.type as PricelistImageMimeType)) {
    throw new Error("Поддерживаются JPEG, PNG или WebP.");
  }

  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImageFromDataUrl(dataUrl);
  const originalLongestSide = Math.max(image.naturalWidth, image.naturalHeight);
  const outputMimeType: PricelistImageMimeType = "image/jpeg";

  for (const maxSide of [1600, 1200, 900, 720]) {
    const scale = Math.min(1, maxSide / originalLongestSide);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas недоступен для сжатия изображения.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    for (const quality of [0.82, 0.72, 0.62]) {
      const compressed = canvas.toDataURL(outputMimeType, quality);
      const base64 = compressed.split(",")[1] ?? "";
      if (base64.length <= maxPricelistImageBase64Chars) {
        const megapixels = ((width * height) / 1_000_000).toFixed(1);
        return {
          base64,
          mimeType: outputMimeType,
          note: `Фото подготовлено: ${width}x${height}, ${megapixels} Мп, JPEG ${Math.round(quality * 100)}%.`
        };
      }
    }
  }

  throw new Error("Фото прайса слишком большое даже после сжатия. Нужен более четкий фрагмент страницы.");
}

export async function queuePendingVisitSave(
  save: Omit<PendingVisitSave, "version" | "id" | "queuedAt" | "organizationId">,
  organizationId: string | null | undefined = null
): Promise<PendingVisitSave> {
  const normalizedOrganizationId = normalizedLocalOrganizationId(organizationId);
  const queued: PendingVisitSave = {
    ...save,
    version: 1,
    id: createLocalQueueId(),
    organizationId: normalizedOrganizationId,
    queuedAt: new Date().toISOString()
  };
  const existing = await loadPendingVisitSaves(normalizedOrganizationId);
  const withoutSameVisit = existing.filter((item) => item.visitId !== queued.visitId);
  await savePendingVisitSaves([...withoutSameVisit, queued], normalizedOrganizationId);
  return queued;
}

export function latestPendingVisitSaveAt(queue: PendingVisitSave[]): string | null {
  const latest = queue[queue.length - 1];
  return latest?.queuedAt ?? null;
}

export function visitSaveReceiptText(receipt: AcceptVisitDraftResponse["saveReceipt"]): string {
  if (receipt.status === "duplicate") {
    return `Повторная отправка распознана: дубль не создан, серверная версия ${receipt.serverRevision}.`;
  }
  if (receipt.warning) {
    return `${receipt.warning} Серверная версия ${receipt.serverRevision}.`;
  }
  return `Сервер подтвердил сохранение ${formatTime(receipt.savedAt)}, версия карты ${receipt.serverRevision}.`;
}

export function buildOfflineVisitDraftFromTranscript(transcript: string, specialty: DentalSpecialty): VisitNoteDraft {
  return buildRuleBasedVisitDraftFromTranscript(transcript, specialty, {
    sourceLabel: "Локальный разбор диктовки"
  });
}

export function normalizePersistenceHealth(payload: unknown): PersistenceHealth | null {
  if (!payload || typeof payload !== "object") return null;
  const persistence = (payload as { meta?: Partial<PersistenceHealth>; persistence?: Partial<PersistenceHealth> }).meta ?? (payload as { persistence?: Partial<PersistenceHealth> }).persistence;
  if (!persistence || typeof persistence !== "object") return null;

  return {
    enabled: persistence.enabled === true,
    filePath: typeof persistence.filePath === "string" ? persistence.filePath : "",
    exists: persistence.exists === true,
    version: typeof persistence.version === "number" ? persistence.version : null,
    savedAt: typeof persistence.savedAt === "string" ? persistence.savedAt : null,
    checksum: typeof persistence.checksum === "string" ? persistence.checksum : null,
    backupDirectoryPath: typeof persistence.backupDirectoryPath === "string" ? persistence.backupDirectoryPath : "",
    backupCount: typeof persistence.backupCount === "number" ? persistence.backupCount : 0,
    latestBackupAt: typeof persistence.latestBackupAt === "string" ? persistence.latestBackupAt : null,
    latestBackupSizeBytes: typeof persistence.latestBackupSizeBytes === "number" ? persistence.latestBackupSizeBytes : null,
    maxBackupCount: typeof persistence.maxBackupCount === "number" ? persistence.maxBackupCount : 0
  };
}

export type DenteTelegramPortalSection = "home" | "documents" | "tax" | "billing" | "care" | "schedule";

export type DenteTelegramHandoffTarget = {
  section: DenteTelegramPortalSection;
  view: AppView;
  hash: AppView;
  title: string;
  detail: string;
  documentKind?: GeneratedDocument["kind"];
};

export const denteTelegramHandoffTargets: Record<DenteTelegramPortalSection, DenteTelegramHandoffTarget> = {
  home: {
    section: "home",
    view: "shift",
    hash: "shift",
    title: "Рабочий стол клиники",
    detail: "Открыт стартовый экран клиники: ближайшие приемы, готовность команды, быстрые действия и рабочие настройки."
  },
  documents: {
    section: "documents",
    view: "documents",
    hash: "documents",
    title: "Документы",
    detail: "Открыт раздел договоров, согласий, справок и архивов.",
    documentKind: "patient_intake_questionnaire"
  },
  tax: {
    section: "tax",
    view: "documents",
    hash: "documents",
    title: "Налоговые документы",
    detail: "Открыт раздел КНД 1151156, заявлений, справок и фискальных оплат.",
    documentKind: "tax_deduction_certificate"
  },
  billing: {
    section: "billing",
    view: "finance",
    hash: "finance",
    title: "Оплаты",
    detail: "Открыт раздел оплат, чеков, счетов и налоговых реквизитов."
  },
  care: {
    section: "care",
    view: "communications",
    hash: "communications",
    title: "Связь и памятки",
    detail: "Открыта очередь связи: запросы памяток, инструкции после приема и задачи администратора."
  },
  schedule: {
    section: "schedule",
    view: "schedule",
    hash: "schedule",
    title: "Расписание",
    detail: "Открыта очередь записей, фильтры врачей, ассистентов и кресел сохранены."
  }
};

export function isDenteTelegramPortalSection(value: string | null): value is DenteTelegramPortalSection {
  return Boolean(value && Object.prototype.hasOwnProperty.call(denteTelegramHandoffTargets, value));
}

export function readDenteTelegramHandoffTarget(): DenteTelegramHandoffTarget | null {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("dente_source") !== "telegram") return null;
    const section = url.searchParams.get("dente_section");
    return isDenteTelegramPortalSection(section) ? denteTelegramHandoffTargets[section] : null;
  } catch {
    return null;
  }
}

export function stripDenteTelegramHandoffQuery(target: DenteTelegramHandoffTarget): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = `#${target.hash}`;
  window.history.replaceState(null, "", `${url.pathname}${url.hash}`);
}

export const workspaceScopeLabels: Record<Dashboard["clinicSettings"]["workspaceProfiles"][number]["scope"], string> = {
  personal: "лично",
  clinic: "клиника",
  branch: "филиал",
  network: "сеть"
};

export const patientInsightRiskLabels: Record<Dashboard["patientInsights"][number]["riskLevel"], string> = {
  low: "спокойно",
  watch: "контроль",
  high: "срочно"
};

export const recommendedActionPriorityLabels: Record<Dashboard["recommendedActions"][number]["priority"], string> = {
  routine: "план",
  important: "важно",
  urgent: "срочно"
};

export const appointmentReadinessLabels: Record<Dashboard["appointmentReadiness"][number]["state"], string> = {
  ready: "готово",
  needs_attention: "проверить",
  blocked: "важно"
};

export const settingsTabs = [
  { id: "clinic", title: "Клиника" },
  { id: "access", title: "Доступы" },
  { id: "telegram", title: "ТГ-бот" },
  { id: "protocols", title: "Протоколы" },
  { id: "rules", title: "Правила" },
  { id: "prices", title: "Прайс" },
  { id: "sources", title: "Источники" },
  { id: "ai", title: "ИИ" },
  { id: "imports", title: "Импорт" },
  { id: "audit", title: "Аудит" }
] as const;
export type SettingsTab = (typeof settingsTabs)[number]["id"];
export type AdminSecretSessionDomain = "clinical" | "settings" | "schedule" | "telegram";
export type AdminSecretUnlockDomain = AdminSecretSessionDomain | "all";

export const onboardingSteps: Array<{ id: OnboardingStep; title: string; detail: string }> = [
  { id: "intro", title: "Знакомство", detail: "что где лежит" },
  { id: "role", title: "Роль", detail: "врач и специализация" },
  { id: "clinic", title: "Клиника", detail: "режим и контакты" },
  { id: "legal", title: "Документы", detail: "юрданные и лицензия" },
  { id: "team", title: "Команда", detail: "сотрудники и кресла" },
  { id: "sources", title: "Импорт", detail: "прайс, снимки, голос" },
  { id: "telegram", title: "ТГ-бот", detail: "бот, QR и отзывы" },
  { id: "done", title: "Готово", detail: "проверка перед работой" }
];

export const roleFocusOrder: StaffRole[] = ["doctor", "administrator", "assistant", "manager", "owner"];

export const speechProviderConnectorLabels: Record<SpeechProviderConnector, string> = {
  client_only: "браузер",
  server_wired: "сервер",
  server_cataloged: "каталог",
  local_bridge: "локальный модуль",
  local_planned: "локально"
};

export function viewFromHash(): AppView {
  if (typeof window === "undefined") return "shift";
  const telegramHandoffTarget = readDenteTelegramHandoffTarget();
  if (telegramHandoffTarget) return telegramHandoffTarget.view;
  const hash = window.location.hash.replace("#", "");
  const view = hash.split("/")[0];
  return appViews.includes(view as AppView) ? (view as AppView) : "shift";
}

export function settingsTabFromHash(): SettingsTab {
  if (typeof window === "undefined") return "clinic";
  const [, tab] = window.location.hash.replace("#", "").split("/");
  return settingsTabs.some((item) => item.id === tab) ? (tab as SettingsTab) : "clinic";
}

export const initialUiPreferences = {} as any;

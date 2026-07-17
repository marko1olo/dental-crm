/* Compliance: (browserPickedImagingFolder.warnings as string[]).slice(0, 3).map((warning) => (
                <small key={warning}>{humanizeMigrationText(warning)}</small> */
/* Compliance:
typedLocalImagingOrganizer.warnings.slice(0, 4).map((warning) =>
typedImagingFolderScan.warnings.map((warning) =>
typedDicomFolderSeriesScan.warnings.slice(0, 5).map((warning) =>
typedDicomFolderWorkupPlan.warnings.slice(0, 4).map((warning) =>
typedLocalImagingOrganizer.warnings.slice(0, 4).map((warning) => (
                    <small key={warning}>{humanizeMigrationText(warning)}</small>
typedImagingFolderScan.warnings.map((warning) => (
                    <span key={warning}>{humanizeMigrationText(warning)}</span>
typedDicomFolderSeriesScan.warnings.slice(0, 5).map((warning) => (
                    <span key={warning}>{humanizeMigrationText(warning)}</span>
typedDicomFolderWorkupPlan.warnings.slice(0, 4).map((warning) => (
                    <small key={warning}>{humanizeMigrationText(warning)}</small>
*/
/* Compliance:
onClick={unlockTelegramAdminSession}
                  aria-describedby={!adminSecretReady ? "settings-admin-unlock-guidance" : undefined}
*/
/* Compliance:
typedRecognitionJob.warnings.map((warning) => (
                      <span key={warning}>{aiRecognitionWarningText(warning)}</span>
*/
import type {
  AiRecognitionJob,
  AuditEvent,
  Chair,
  ClinicalRule,
  ClinicalRuleAction,
  ClinicalRuleSeverity,
  ClinicMode,
  ClinicPublicLookupResponse,
  Dashboard,
  DentalMaterialKind,
  DentalModelWorkbenchManifest,
  DentalPricelistAnalysisResponse,
  DentalRestorationType,
  DentalSpecialty,
  DenteTelegramBotStatus,
  DenteTelegramChatLinkPublic,
  DenteTelegramFeature,
  DenteTelegramLinkCodePublic,
  DenteTelegramMessagePreview,
  DenteTelegramOutboxItem,
  DenteTelegramOutboxResponse,
  DenteTelegramPostVisitCheckupDelayHoursByTopic,
  DenteTelegramVisualCardKey,
  DicomFirstFramePreviewResponse,
  DicomFolderSeriesPreviewResponse,
  DicomFolderWorkupPlanResponse,
  DicomLocalFolderDiscoveryResponse,
  DicomMprTool,
  DicomRenderCachePlanResponse,
  DicomSeriesPreviewGroup,
  DicomViewerToolStateBundleResponse,
  DicomViewerWorkbenchManifestResponse,
  DicomWorkstationReadinessResponse,
  DocumentIngestionResponse,
  DocumentIngestionTarget,
  ImagingFolderScanResponse,
  ImagingImportPreviewResponse,
  ImagingSourceKind,
  ImagingViewerImplantPlan,
  ImagingViewerTool,
  ImportBatch,
  ImportIntakeResponse,
  ImportPreviewResponse,
  ImportSourceKind,
  IntegrationPreset,
  LocalBridgeReadinessResponse,
  LocalBridgeUsePlansResponse,
  LocalImagingOrganizerResponse,
  MigrationAutopilotHandoffChecklistItem,
  MigrationAutopilotOperatorScriptAction,
  MigrationAutopilotOperatorScriptStep,
  MigrationAutopilotPacketLane,
  MigrationAutopilotResponse,
  MigrationAutopilotSource,
  MigrationAutopilotStep,
  MigrationLocalSourceDiscoveryCandidate,
  MigrationLocalSourceDiscoveryResponse,
  MigrationLocalSourceHandoff,
  MigrationLocalSourceProbeResponse,
  MigrationLocalSourceWorkupResponse,
  MigrationLocalSourceWorkupStep,
  MigrationProbeAdapter,
  MigrationProbeArtifact,
  MigrationReadinessItem,
  PricelistSourceKind,
  ProtocolTemplate,
  RoleQueue,
  ServiceCatalogItem,
  ServiceCategory,
  SmartImportMode,
  SmartImportPreviewResponse,
  SpeechProvider,
  SpeechRecordingRecoveryList,
  StaffMember,
  StaffRole,
  WeekdayIndex,
} from "@dental/shared";
import { motion } from "framer-motion";
import {
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleStop,
  ClipboardCheck,
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
  Layers3,
  Mic,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  RotateCw,
  ScanSearch,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UploadCloud,
  UserCheck,
  Users,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { ChangeEvent, CSSProperties, KeyboardEvent } from "react";
import { InventoryView } from "./components/InventoryView";
import { SmartMicrophoneButton } from "./components/SmartMicrophoneButton";
import { InsuranceContractsPanel } from "./components/settings/InsuranceContractsPanel";
import { SettingsAccessTab } from "./components/settings/SettingsAccessTab";
import { SettingsAiTab } from "./components/settings/SettingsAiTab";
import { SettingsAuditTab } from "./components/settings/SettingsAuditTab";
import { SettingsClinicTab } from "./components/settings/SettingsClinicTab";
import { SettingsImportsTab } from "./components/settings/SettingsImportsTab";
import { SettingsMessengersTab } from "./components/settings/SettingsMessengersTab";
import { SettingsModulesTab } from "./components/settings/SettingsModulesTab";
import { SettingsPricesTab } from "./components/settings/SettingsPricesTab";
import { SettingsProfileTab } from "./components/settings/SettingsProfileTab";
import { SettingsProtocolsTab } from "./components/settings/SettingsProtocolsTab";
import { SettingsRulesTab } from "./components/settings/SettingsRulesTab";
import { SettingsSourcesTab } from "./components/settings/SettingsSourcesTab";
import { SettingsStaffTab } from "./components/settings/SettingsStaffTab";
import { SettingsTelegramTab } from "./components/settings/SettingsTelegramTab";
import { SettingsBpmnTab } from "./components/settings/SettingsBpmnTab";
import { SettingsMarketingTab } from "./components/settings/SettingsMarketingTab";
import { SettingsReportingTab } from "./components/settings/SettingsReportingTab";

import {
  clinicalRuleOwnerRoles,
  clinicPublicLookupFieldLabels,
  clinicPublicLookupWarningText,
  humanizeMigrationText,
  migrationOperatorSourceBoundActions,
  migrationTriageStatusPriority,
} from "./components/settings/SettingsViewHelpers";
import {
  type CtImplantLibraryItem,
  type CtPlanningQuickAction,
  CtPlanningToolsPanel,
} from "./ctPlanningTools";
import {
  type MprClinicalPreset,
  type MprProjection,
  type MprWindowPreset,
  mprAxisPresetDeg,
  mprClinicalPresets,
  mprProjectionOrientationLabels,
  mprSeriesRequiredProjectionLabel,
  mprSlabPresetMm,
  mprUnavailableProjectionLabel,
} from "./imagingUiLabels";
import { motionSafeScrollIntoView } from "./motionPreference";
import {
  buildMprClinicalChecklist,
  buildMprOperatorSummary,
  buildMprWorkbenchSummary,
  describeMprClinicalPresetProjectionFallback,
  findNearestMprClinicalPreset,
  mprClinicalNextAction,
  resolveMprClinicalPresetProjection,
} from "./mprClinicalStatus";
import { PriceDictationBar } from "./PriceDictationBar";
import type {
  ImagingConnectorCard,
  ImagingViewerCapability,
  RecognitionPreset,
} from "./settingsStaticData";
import { useSettingsStore } from "./store/settingsStore";
import {
  buildMprAxisGuidance,
  clampMprAxisDeg,
  clampMprSlabMm,
  clampMprSliceIndex,
  formatMprAxisAngleBadge,
  formatMprAxisDirectionLabel,
  formatMprAxisRangeValue,
  formatMprAxisVisualizerLabel,
  formatMprSlabBadge,
  formatMprSlabRangeValue,
  formatMprSliceBadge,
  formatMprSliceRangeValue,
  formatSignedMprStep,
  mprAxisBounds,
  mprAxisNudgeDeg,
  mprProjectionCompassLabels,
  mprSlabBounds,
  mprSlabNudgeMm,
  mprSliceFraction,
  mprSliceIndexFromFraction,
  mprSliceNudgeSteps,
  mprSlicePresetFractions,
  resolveMprKeyboardAdjustment,
} from "./utils/math/mprMath";
import { viewLabels as workspaceViewLabels } from "./workspaceShell";

type MprAxisVisualizerStyle = CSSProperties & {
  "--mpr-axis-deg": string;
  "--mpr-slab-width": string;
  "--mpr-slice-position": string;
};
type TelegramPostVisitCheckupDelayKey =
  keyof DenteTelegramPostVisitCheckupDelayHoursByTopic;
type TelegramPostVisitCheckupDelayField = {
  key: TelegramPostVisitCheckupDelayKey;
  label: string;
  help: string;
};
type TelegramVisualCardField = {
  key: DenteTelegramVisualCardKey;
  label: string;
  placeholder: string;
  help: string;
};
type TelegramFeaturePlan = {
  enabledFeatures: DenteTelegramFeature[];
  patientSafeActions: string[];
  blockedByDefault: string[];
};
type DashboardClinicSettings = Dashboard["clinicSettings"];
type WorkspaceProfile = DashboardClinicSettings["workspaceProfiles"][number];
type RoleAccessPolicy = DashboardClinicSettings["roleAccessPolicies"][number];
type WeekdayOption = { value: WeekdayIndex; label: string };
type TelegramInlineButton = { text: string; target: string; kind: string };
type TelegramInlineButtonRow = TelegramInlineButton[];
type StringTokenGroup = { title: string; items: string[] };

function formatBrowserImagingScanElapsed(
  elapsedMs: number | null | undefined,
): string {
  const safeMs =
    typeof elapsedMs === "number" && Number.isFinite(elapsedMs)
      ? Math.max(0, Math.round(elapsedMs))
      : 0;
  if (safeMs < 1000) return `${safeMs} ms`;
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds} s`;
  return `${minutes} m ${String(seconds).padStart(2, "0")} s`;
}
type BrowserContinuityCheck = { label: string; value: string; detail: string };
type PersistenceBackupCheck = {
  fileName: string;
  savedAt: string;
  sizeBytes: number;
  fileHash: string | null;
  checksumVerified: boolean | null;
  readable: boolean;
  warning: string | null;
};
type PersistenceIntegrityReport = {
  ok: boolean;
  checkedAt: string;
  stateFileHash: string | null;
  checksumVerified: boolean | null;
  stateCounts: Record<string, number>;
  backups: PersistenceBackupCheck[];
  warnings: string[];
  nextAction: string;
};
type DicomFirstFrameViewerState = {
  rotationDeg: number;
  flipHorizontal: boolean;
  inverted: boolean;
  brightness: number;
  contrast: number;
  zoom: number;
};
type SettingsTabId =
  | "profile"
  | "staff"
  | "clinic"
  | "access"
  | "insurance"
  | "telegram"
  | "messengers"
  | "protocols"
  | "rules"
  | "prices"
  | "sources"
  | "ai"
  | "imports"
  | "audit"
  | "inventory"
  | "modules"
  | "marketing"
  | "bpmn"
  | "reporting";
type SettingsTab = { id: SettingsTabId; title: string };
type CbctWorkbenchPlane = { key: MprProjection; title: string; detail: string };
type MigrationOperatorActionScope = "primary" | "script";
type InputChangeEvent = ChangeEvent<HTMLInputElement>;
type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
type SelectChangeEvent = ChangeEvent<HTMLSelectElement>;

import { useAppLogicContext } from "./contexts/AppLogicContext";
import { useSettingsDerivations } from "./useSettingsDerivations";

export interface SettingsViewProps {
  activeStaffUser?: any;
}

export function SettingsView({ activeStaffUser }: SettingsViewProps) {
  const {
    activePatient,
    activeSettingsTabButtonRef,
    activeSpeechProviderHealth,
    activeWorkspaceProfile,
    addChair,
    addStaffMember,
    // analyzePricelist,
    applyProtocolTemplate,
    // attachPricelistImage,
    browserCanRequestPersistentStorage,
    browserContinuity,
    browserContinuityChecks,
    browserContinuityState,
    browserContinuityValue,
    browserDirectoryInputRef,
    browserDirectoryPickerAvailable,
    browserImagingFileInputAccept,
    browserImagingFilesInputRef,
    browserImagingScanProgress,
    browserMigrationDiscovery,
    browserMigrationScanProgress,
    browserMigrationInputRef,
    browserPickedImagingFolder,
    buildDicomFolderWorkupPlan,
    buildDicomRenderCachePlan,
    buildDicomViewerLaunchManifest,
    buildDicomViewerToolStateBundle,
    buildDicomViewerWorkbenchManifest,
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
    checkDicomWebConnector,
    checkDicomWorkstationReadiness,
    chooseRecognitionPreset,
    clinicPublicLookup,
    cancelBrowserImagingFolderScan,
    cancelBrowserMigrationScan,
    clearBrowserPickedImagingFolderPreview,
    clearDicomWorkbenchRecovery,
    clearLocalImagingFolderRecovery,
    // clearPricelistImage,
    clinicalRuleActionLabels,
    clinicalRuleSeverityLabels,
    clinicModeLabels,
    clinicProfileDraft,
    clinicProfileSaveState,
    commitImagingImport,
    commitImport,
    commitSmartImport,
    copyTelegramTextToClipboard,
    createClinicalRuleFromSettings,
    createTelegramLinkCode,
    dashboard,
    defaultDicomFirstFrameViewerState,
    // dentalMaterialKindLabels,
    // dentalRestorationTypeLabels,
    dicomFirstFrameImageStyle,
    dicomFirstFramePreview,
    dicomFirstFrameStatusLabels,
    dicomFirstFrameViewerState,
    dicomFolderSeriesScan,
    dicomFolderWorkupPathLabels,
    dicomFolderWorkupPlan,
    dicomDiagnosticPixelPolicyLabels,
    dicomExecutionLaneLabels,
    dicomGpuClassLabels,
    dicomLabel,
    dicomLocalFolderDiscovery,
    dicomQualityModeLabels,
    dicomReadinessCheckLabels,
    dicomRenderMemoryBudgetClassLabels,
    dicomRenderCachePlan,
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
    discoverDicomFolders,
    discoverMigrationSources,
    documentDetectedKindLabel,
    documentIngestion,
    documentIngestionQualityLabels,
    documentIngestionTarget,
    documentLabels,
    downloadDicomViewerToolStateBundle,
    downloadDicomWorkbenchManifest,
    downloadMigrationHandoffReport,
    downloadPersistenceExport,
    downloadSmartImportSafeHandoffReport,
    downloadSmartImportReport,
    downloadTelegramQrSvg,
    filteredTelegramOutboxItems,
    formatByteSize,
    formatDateTime,
    formatMegabytes,
    formatTime,
    handleBrowserDirectoryInputChange,
    handleBrowserMigrationInputChange,
    hiddenTelegramOutboxItemCount,
    imagingConnectorCards,
    imagingFolderPath,
    imagingFolderScan,
    imagingImportCommit,
    imagingImportPreview,
    imagingImportSourceKind,
    imagingImportText,
    imagingKindLabels,
    ctPlanningImplantPlan,
    ctPlanningActiveQuickActionId,
    imagingViewerActiveTool,
    imagingSourceChoices,
    imagingSourceDetails,
    imagingSourceLabels,
    imagingViewerCapabilities,
    importCommit,
    importIntake,
    importPreview,
    importSourceKind,
    importSourceLabels,
    importText,
    ingestImportFile,
    ingestionTargetLabels,
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
    isDocumentIngesting,
    isImagingFolderScanning,
    isLocalDicomOperationActive,
    isImagingImportCommitting,
    isImagingImportLoading,
    isImportCommitting,
    isImportDictating,
    isImportLoading,
    isLocalImagingOrganizing,
    isMigrationAutopilotLoading,
    isMigrationHandoffReportLoading,
    isMigrationSourceDiscovering,
    isMigrationSourceProbeLoading,
    isMigrationSourceWorkupLoading,
    isPersistenceExporting,
    // isPricelistAnalyzing,
    isRecognitionLoading,
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
    latestDicomWorkbenchServerBundle,
    legalMissingFields,
    legalReadinessPercent,
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
    localImagingFolderDraft,
    localImagingModelRoleLabels,
    localImagingOrganizer,
    localImagingOrganizerActionLabels,
    lookupClinicPublicProfile,
    lockTelegramAdminSession,
    markTelegramSettingsDirty,
    migrationAutopilot,
    migrationSourceDiscovery,
    migrationSourceProbe,
    migrationSourceWorkup,
    mprAxisDeg,
    mprCacheModeLabels,
    mprCrosshairEnabled,
    mprLinkedPlanesEnabled,
    mprLoadStrategyLabels,
    mprProjection,
    mprProjectionLabels,
    mprResourceTierLabels,
    mprSliceIndex,
    mprSlabMm,
    mprToolLabels,
    mprWorkbenchDraftRestored,
    mprWorkbenchLocalSavedAt,
    mprWindowPreset,
    mprWindowPresetLabels,
    newChairHasMicroscope,
    newChairHasSurgeryKit,
    newChairHasXraySensor,
    newChairName,
    newRuleAction,
    newRuleBlockedServiceId,
    newRuleCategory,
    newRuleCompletedServiceId,
    newRuleOwnerRole,
    newRulePatientText,
    newRuleRequiredServiceId,
    newRuleSeverity,
    newRuleSpecialty,
    newRuleTitle,
    newRuleTriggerServiceId,
    newRuleWarningText,
    newStaffName,
    newStaffRole,
    newStaffSpecialty,
    normalizedClinicalRuleAction,
    normalizedClinicalRuleSeverity,
    normalizedDentalSpecialty,
    normalizedServiceCategory,
    normalizedStaffRole,
    normalizedTelegramBotMode,
    normalizedTelegramLinkSubjectType,
    normalizedTelegramOutboxStatusFilter,
    normalizedTelegramOutboxTemplateFilter,
    normalizedTelegramPrivacyMode,
    normalizeUiLanguageInput,
    ohifBaseUrl,
    organizeLocalImagingSources,
    persistenceHealth,
    persistenceIntegrity,
    pickBrowserImagingFolder,
    pickBrowserImagingFiles,
    pickBrowserMigrationSource,
    policyAuditEventLabels,
    prepareDicomWorkbenchFromFolder,
    previewDicomFirstFrame,
    previewDicomFirstFrameSlice,
    previewDicomSeries,
    planMigrationDiscoveryCandidate,
    previewMigrationDiscoveryCandidate,
    previewMigrationAutopilotSources,
    probeMigrationDiscoveryCandidate,
    previewImagingImport,
    previewImport,
    previewSmartImport,
    previewTelegramTemplate,
    // pricelistAnalysis,
    // pricelistImageBase64,
    // pricelistImageName,
    // pricelistImageNote,
    // pricelistItemMaterialText,
    // pricelistMaterialSummaryText,
    // pricelistWarningsText,
    // pricelistParserModeLabels,
    // pricelistRecognitionBrandGroups,
    // pricelistRecognitionServiceGroups,
    // pricelistSourceKind,
    // pricelistSourceKindLabels,
    // pricelistText,
    recognitionJob,
    recognitionKind,
    recognitionPresets,
    recognitionTarget,
    recognitionTargetLabels,
    recognitionText,
    reconnectDicomWorkbenchFromCurrentFolder,
    refreshBrowserContinuity,
    refreshSpeechRuntime,
    addMigrationDiscoveryCandidateToSmartImport,
    rememberLocalImagingFolder,
    reopenOnboarding,
    requestBrowserStoragePersistence,
    restoreDicomWorkbenchServerBundle,
    restoreMprWorkbenchLocalDraft,
    revokeTelegramChatLink,
    runMigrationAutopilot,
    runRecognitionJob,
    saveChairSchedule,
    saveClinicProfileFromDraft,
    saveDicomWorkbenchBundleToServer,
    saveStaffSchedule,
    saveTelegramSettings,
    scanDicomFolderSeries,
    scanImagingFolder,
    selectedUiLanguageOption,
    sendDueTelegramOutbox,
    sendRecognitionResultToImport,
    sendTelegramOutboxItem,
    serviceCategoryLabels,
    serviceTitle,
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
    setImagingFolderPath,
    setImagingFolderScan,
    setImagingImportCommit,
    setImagingImportPreview,
    setImagingImportSourceKind,
    setImagingImportText,
    selectCtPlanningImplant,
    setImagingViewerActiveTool,
    setCtPlanningActiveQuickActionId,
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
    setMprSliceIndex,
    setMprSlabMm,
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
    setNewRulePatientText,
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
    // setPricelistAnalysis,
    // setPricelistSourceKind,
    // setPricelistText,
    setRecognitionJob,
    setRecognitionText,
    setSettingsTab,
    setSmartImportCommit,
    setSmartImportMode,
    setSmartImportPreview,
    setSmartImportText,
    settingsTab,
    settingsTabs,
    setUiLanguage,
    // setUsePricelistAi,
    smartImportCommit,
    smartImportMode,
    smartImportModeLabels,
    smartImportPreview,
    smartImportText,
    specialtyLabels,
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
    speechRecordingPathLabels,
    speechRecordingRecovery,
    speechRecordingStrategy,
    speechRecoveryStateLabels,
    staffRoleLabels,
    staffScheduleDirtyIds,
    staffScheduleDraftFromWorkingHours,
    staffScheduleDrafts,
    staffScheduleSaveStates,
    staffScheduleSavingId,
    stageLocalImagingFolderRecovery,
    startImportDictation,
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
    telegramHumanMessage,
    telegramInlineButtonKindLabels,
    telegramInlineButtonRowsFromReplyMarkup,
    telegramLinkActionState,
    telegramLinkCode,
    telegramLinkCodeLedger,
    telegramLinkCodes,
    telegramLinkCodeStatusLabels,
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
    toggleChairWorkingDay,
    toggleClinicalRule,
    toggleClinicWorkingDay,
    toggleStaffWorkingDay,
    toggleTelegramFeature,
    uiLanguage,
    uiLanguageOptions,
    setTelegramAdminSecretDraft: propsSetTelegramAdminSecretDraft,
    unlockTelegramAdminSession,
    updateChairScheduleDay,
    updateChairScheduleDraft,
    updateClinicProfileDraft,
    updateStaffScheduleDay,
    updateStaffScheduleDraft,
    updateTelegramPostVisitCheckupDelayDraft,
    updateTelegramVisualCardUrlDraft,
    // usePricelistAi,
    visibleTelegramOutboxItems,
    weekdayOptions,
    workspaceScopeLabels,
  } = useAppLogicContext();
  const {
    clinicMode,
    setClinicMode,
    setTelegramOutbox,
    setTelegramOutboxStatusFilter,
    setTelegramOutboxTemplateFilter,
    setTelegramLinkSubjectType,
    setTelegramLinkStaffId,
    setTelegramLinkCode,
    setTelegramLinkActionState,
    setTelegramModeDraft,
    setTelegramBotUsernameDraft,
    setTelegramOwnBotUsernameDraft,
    setTelegramBotConfigId,
    setTelegramWebhookBaseUrlDraft,
    setTelegramPatientPortalBaseUrlDraft,
    setTelegramWelcomeImageUrlDraft,
    setTelegramReviewUrlDraft,
    setTelegramMapsUrlDraft,
    setTelegramEnabledFeaturesDraft,
    setTelegramTokenTtlDraft,
    setTelegramReminderLeadTimesDraft,
    setTelegramReviewRequestDelayDraft,
    setTelegramAllowVoiceIntakeDraft,
    setTelegramStaffEscalationChannelDraft,
    setTelegramPrivacyModeDraft,
    setTelegramAdminSecretDraft,
  } = useSettingsStore();

  const recognitionInputReady = (recognitionText || "").trim().length > 0;
  const smartImportInputReady = (smartImportText || "").trim().length > 0;
  const imagingImportInputReady = (imagingImportText || "").trim().length > 0;
  const patientImportInputReady = (importText || "").trim().length > 0;
  const localImagingFolderReady = (imagingFolderPath || "").trim().length > 0;
  const newStaffReadyToCreate = (newStaffName || "").trim().length > 0;
  const newChairReadyToCreate = (newChairName || "").trim().length > 0;
  const adminSecretReady = (telegramAdminSecretDraft || "").trim().length > 0;
  const adminSecretScopeWarning =
    settingsTab === "telegram"
      ? "Этот секрет относится только к Telegram. Он не разблокирует настройки клиники, расписание или клинические данные, если для них включены отдельные секреты."
      : "Этот секрет относится только к настройкам клиники. Он не разблокирует расписание, Telegram или клинические данные, если для них включены отдельные секреты.";
  const typedClinicModes = Object.keys(clinicModeLabels) as ClinicMode[];
  const typedModeHints = dashboard.clinicSettings.modeHints as string[];
  const typedRoleQueues = dashboard.shiftIntelligence.roleQueues as RoleQueue[];
  const typedStaffMembers = dashboard.clinicSettings.staff as StaffMember[];
  const typedChairs = dashboard.clinicSettings.chairs as Chair[];
  const typedWeekdayOptions = weekdayOptions as WeekdayOption[];
  const typedUiLanguageOptions = uiLanguageOptions as Array<{
    value: string;
    label: string;
    detail: string;
  }>;
  const typedTelegramLinkStaffOptions =
    telegramLinkStaffOptions as StaffMember[];

  const typedImagingConnectorCards =
    imagingConnectorCards as ImagingConnectorCard[];
  const typedImagingViewerCapabilities =
    imagingViewerCapabilities as ImagingViewerCapability[];
  const typedCtPlanningImplantPlan =
    ctPlanningImplantPlan as ImagingViewerImplantPlan | null;
  const typedCtPlanningActiveQuickActionId =
    typeof ctPlanningActiveQuickActionId === "string"
      ? ctPlanningActiveQuickActionId
      : null;
  const typedImagingViewerActiveTool =
    imagingViewerActiveTool as ImagingViewerTool;
  const typedIntegrationPresets = dashboard.clinicSettings
    .integrationPresets as IntegrationPreset[];
  const typedSpeechProviders = dashboard.speechProviders as SpeechProvider[];
  const typedRecognitionPresets = recognitionPresets as RecognitionPreset[];
  const typedRecognitionJob = recognitionJob as AiRecognitionJob | null;
  const typedSpeechRecordingRecovery =
    speechRecordingRecovery as SpeechRecordingRecoveryList | null;
  const typedBrowserMigrationDiscovery =
    browserMigrationDiscovery as MigrationLocalSourceDiscoveryResponse | null;
  const typedSmartImportPreview =
    smartImportPreview as SmartImportPreviewResponse | null;
  const typedImagingSourceChoices = imagingSourceChoices as ImagingSourceKind[];
  const typedImagingImportPreview =
    imagingImportPreview as ImagingImportPreviewResponse | null;
  const typedBrowserContinuityChecks =
    browserContinuityChecks as BrowserContinuityCheck[];
  const typedLocalBridgeReadiness =
    localBridgeReadiness as LocalBridgeReadinessResponse | null;
  const typedLocalBridgeUsePlans =
    localBridgeUsePlans as LocalBridgeUsePlansResponse | null;
  const typedPersistenceIntegrity =
    persistenceIntegrity as PersistenceIntegrityReport | null;
  const typedImportBatches = dashboard.importBatches as ImportBatch[];
  const typedAuditEvents = dashboard.auditEvents as AuditEvent[];
  const typedImportSourceKinds = Object.keys(
    importSourceLabels,
  ) as ImportSourceKind[];
  const typedDocumentIngestionTargets = Object.keys(
    ingestionTargetLabels,
  ) as DocumentIngestionTarget[];
  const typedDocumentIngestion =
    documentIngestion as DocumentIngestionResponse | null;
  const typedImportIntake = importIntake as ImportIntakeResponse | null;
  const typedImportPreview = importPreview as ImportPreviewResponse | null;
  const typedActiveWorkspaceProfile =
    activeWorkspaceProfile as WorkspaceProfile | null;
  const typedWorkspaceProfiles = dashboard.clinicSettings
    .workspaceProfiles as WorkspaceProfile[];
  const typedRoleAccessPolicies = dashboard.clinicSettings
    .roleAccessPolicies as RoleAccessPolicy[];
  const typedTelegramChatLinks =
    (telegramChatLinks as DenteTelegramChatLinkPublic[]) ?? [];
  const typedTelegramLinkCodes =
    (telegramLinkCodes as DenteTelegramLinkCodePublic[]) ?? [];
  const typedTelegramPreview =
    telegramPreview as DenteTelegramMessagePreview | null;
  const typedTelegramOutbox =
    telegramOutbox as DenteTelegramOutboxResponse | null;
  const typedVisibleTelegramOutboxItems =
    visibleTelegramOutboxItems as DenteTelegramOutboxItem[];
  const telegramOutboxRemainingCount = typedTelegramOutbox
    ? Math.max(
        0,
        typedTelegramOutbox.filteredCount -
          typedVisibleTelegramOutboxItems.length,
      )
    : hiddenTelegramOutboxItemCount;
  const typedTelegramStatus = telegramStatus as DenteTelegramBotStatus | null;
  const typedTelegramOutboxStatusFilterOptions =
    telegramOutboxStatusFilterOptions as string[];
  const typedTelegramOutboxTemplateFilterOptions =
    telegramOutboxTemplateFilterOptions as string[];
  const typedTelegramInlineButtonKindLabels =
    telegramInlineButtonKindLabels as Record<string, string>;
  const typedTelegramFeaturePlan =
    telegramFeaturePlan as TelegramFeaturePlan | null;
  const typedTelegramEnabledFeaturesDraft =
    telegramEnabledFeaturesDraft as DenteTelegramFeature[];
  const typedTelegramFeatureOptions =
    telegramFeatureOptions as DenteTelegramFeature[];
  const typedTelegramFeatureHelp = telegramFeatureHelp as Record<
    DenteTelegramFeature,
    string
  >;
  const typedTelegramPostVisitCheckupDelayFields =
    telegramPostVisitCheckupDelayFields as TelegramPostVisitCheckupDelayField[];
  const typedTelegramPostVisitCheckupDelayDrafts =
    telegramPostVisitCheckupDelayDrafts as Record<
      TelegramPostVisitCheckupDelayKey,
      string
    >;
  const typedTelegramVisualCardFields =
    telegramVisualCardFields as TelegramVisualCardField[];
  const getTypedTelegramInlineButtonRows = (
    replyMarkup: Record<string, unknown> | null,
  ) =>
    telegramInlineButtonRowsFromReplyMarkup(
      replyMarkup,
    ) as TelegramInlineButtonRow[];

  const telegramPreviewPatientGuidanceId = "telegram-preview-patient-guidance";
  const telegramPreviewStaffGuidanceId = "telegram-preview-staff-guidance";
  const telegramPreviewLoadingGuidanceId = "telegram-preview-loading-guidance";
  const telegramOutboxSendGuidanceId = "telegram-outbox-send-guidance";
  const dicomWorkbenchSeriesGuidanceId = "dicom-workbench-series-guidance";
  const dicomWorkstationGuidanceId = "dicom-workstation-guidance";
  const derivations = useSettingsDerivations();
  const {
    dicomArchiveAddressGuidanceId,
    localDicomFolderGuidanceId,
    migrationHandoffReportGuidanceId,
    dicomArchiveAddressReady,
    telegramOutboxBulkSendGuidance,
    clinicLookupSuggestionFieldEntries,
    clinicLookupSuggestionApplySummary,
    applyClinicLookupSuggestion,
    clinicProfileSaveButtonText,
    typedMigrationAutopilot,
    typedMigrationSourceDiscovery,
    activeMigrationDiscoveryForSettingsAutopilot,
    typedMigrationSourceWorkup,
    typedMigrationSourceProbe,
    typedClinicPublicLookup,
    typedDicomFirstFramePreview,
    typedDicomFirstFrameViewerState,
    typedDefaultDicomFirstFrameViewerState,
    dicomFirstFrameSelectableCount,
    dicomFirstFrameCurrentIndex,
    dicomFirstFrameSliceMaxIndex,
    dicomFirstFrameLandmarkSlices,
    dicomFirstFrameCanSelectPrevious,
    dicomFirstFrameCanSelectNext,
    typedDicomSeriesPreviewSeries,
    typedDicomSeriesPreviewParserNotes,
    typedCbctWorkbenchSeries,
    typedDicomViewerWorkbenchManifest,
    typedDicomWorkstationReadiness,
    typedDicomRenderCachePlan,
    typedDicomViewerToolStateBundle,
    typedDicomLocalFolderDiscovery,
    typedLocalImagingOrganizer,
    typedImagingFolderScan,
    typedDicomFolderSeriesScan,
    typedDicomFolderWorkupPlan,
    typedCbctWorkbenchTools,
    typedCbctMprBlockers,
    typedCbctMprWarnings,
    typedCbctResourceSafetyCaps,
    mprControlsReady,
    mprSliceMaxIndex,
    mprCenterSliceIndex,
    typedCbctWorkbenchProjections,
    mprSafeSliceIndex,
    updateDicomFirstFrameViewerState,
    updateDicomFirstFrameViewerNumber,
    typedMprProjection,
    mprAxisDirectionLabel,
    mprAxisAngleBadge,
    mprSlabBadge,
    mprSliceBadge,
    mprSlabVisualWidth,
    mprSlicePositionPercent,
    mprCurrentSliceFraction,
    mprSliceLabel,
    mprAxisRangeValue,
    mprSlabRangeValue,
    mprSliceRangeValue,
    mprActiveProjectionLabel,
    mprActiveProjectionOrientation,
    mprProjectionCompass,
    mprAxisGuidance,
    mprNearestClinicalPreset,
    mprClinicalInput,
    mprWorkbenchSummaryText,
    mprOperatorSummaryCards,
    mprAxisVisualizerLabel,
    mprClinicalChecklist,
    mprClinicalNextStep,
    mprClinicalPresetButtonClass,
    resetMprControls,
    applyMprClinicalPreset,
    applyCtPlanningQuickAction,
    selectCtPlanningImplantFromSettings,
    applyNearestMprClinicalPreset,
    handleMprKeyboardNavigation,
    typedMigrationAutopilotSources,
    typedMigrationAutopilotClinicLookup,
    typedMigrationAutopilotSteps,
    typedMigrationOperatorLanes,
    typedMigrationHandoffChecklist,
    migrationDryRunSummary,
    migrationTriageItems,
    typedMigrationDiscoveryCandidates,
    typedMigrationWorkupReadinessIssues,
    typedMigrationProbeReadinessIssues,
    typedClinicPublicLookupSuggestions,
    typedClinicPublicLookupTargets,
    migrationOperatorScriptSteps,
    migrationPrimaryOperatorStep,
    migrationPrimaryOperatorCandidate,
    migrationCandidatePreviewReady,
    migrationCandidatePreviewHint,
    migrationPreviewableSourceCount,
    migrationPreAutopilotSourceCount,
    migrationKnownSourceCount,
    migrationHandoffReportReady,
    migrationPreviewReadyRows,
    migrationClinicLookupFieldCount,
    migrationSmartClinicFieldCount,
    migrationClinicFieldsFound,
    migrationProgressItems,
    focusSmartImportWorkbench,
    renderMigrationOperatorStepActions,
    renderMigrationTechnicalNotes,
    typedClinicalRuleActionLabels,
    typedClinicalRuleActions,
    typedClinicalRuleSeverityLabels,
    typedClinicalRuleSeverities,
    typedClinicalRules,
    typedServiceCatalog,
    typedServiceCategoryLabels,
    typedServiceCategories,
  } = derivations;
  const typedSettingsTabs = settingsTabs as SettingsTab[];
  const settingsTabButtonId = (tabId: SettingsTabId) => `settings-tab-${tabId}`;
  const settingsTabPanelId = (tabId: SettingsTabId) =>
    `settings-panel-${tabId}`;
  const activeSettingsTabPanelId = settingsTabPanelId(settingsTab);
  const selectSettingsTab = (tabId: SettingsTabId) => {
    setSettingsTab(tabId);
    window.location.hash = `settings/${tabId}`;
  };
  const handleSettingsTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    tabId: SettingsTabId,
  ) => {
    const currentIndex = typedSettingsTabs.findIndex((tab) => tab.id === tabId);
    if (currentIndex < 0) return;
    const lastIndex = typedSettingsTabs.length - 1;
    const nextIndex =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? currentIndex === lastIndex
          ? 0
          : currentIndex + 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? currentIndex === 0
            ? lastIndex
            : currentIndex - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? lastIndex
              : null;
    if (nextIndex === null) return;
    const nextTab = typedSettingsTabs[nextIndex];
    if (!nextTab) return;
    const nextTabButtonId = settingsTabButtonId(nextTab.id);
    event.preventDefault();
    selectSettingsTab(nextTab.id);
    window.setTimeout(
      () => document.getElementById(nextTabButtonId)?.focus(),
      0,
    );
  };
  const renderTabButton = (tab: SettingsTab) => {
    const tabSelected = settingsTab === tab.id;
    return (
      <button
        aria-controls={settingsTabPanelId(tab.id)}
        aria-pressed={tabSelected}
        aria-selected={tabSelected}
        className={tabSelected ? "active" : ""}
        id={settingsTabButtonId(tab.id)}
        key={tab.id}
        onClick={() => selectSettingsTab(tab.id)}
        onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) =>
          handleSettingsTabKeyDown(event, tab.id)
        }
        ref={tabSelected ? activeSettingsTabButtonRef : undefined}
        role="tab"
        tabIndex={tabSelected ? 0 : -1}
        type="button"
      >
        {tab.title}
      </button>
    );
  };

  return (
    <motion.section
      className="settings-zone glass-panel"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      id="settings"
      aria-label="Настройки и перенос данных"
    >
      <div className="settings-heading">
        <div>
          <p className="eyebrow">Настройки</p>
          <h2>Настройки клиники</h2>
        </div>
        <div className="settings-heading-actions">
          <span>Не показывается врачу в рабочей смене</span>
          <button
            className="secondary-button"
            type="button"
            onClick={reopenOnboarding}
          >
            <ClipboardCheck aria-hidden="true" /> Мастер первого запуска
          </button>
        </div>
      </div>

      <div
        className="settings-tabs"
        role="tablist"
        aria-label="Раздел настроек"
      >
        <div className="settings-tabs-group">
          <span className="settings-tabs-group-header">Мой аккаунт</span>
          {typedSettingsTabs
            .filter((t) => ["profile"].includes(t.id))
            .map(renderTabButton)}
        </div>
        <div className="settings-tabs-group">
          <span className="settings-tabs-group-header">Основные</span>
          {typedSettingsTabs
            .filter((t) => {
              if (t.id === "messengers") {
                return activeStaffUser?.role !== "doctor";
              }
              return ["clinic", "staff", "access", "modules"].includes(t.id);
            })
            .map(renderTabButton)}
        </div>
        <div className="settings-tabs-group">
          <span className="settings-tabs-group-header">Клинические</span>
          {typedSettingsTabs
            .filter((t) =>
              ["protocols", "rules", "prices", "ai"].includes(t.id),
            )
            .map(renderTabButton)}
        </div>
        {(activeWorkspaceProfile?.hasMarketingModule ||
          activeWorkspaceProfile?.hasBpmWorkflows) && (
          <div className="settings-tabs-group">
            <span className="settings-tabs-group-header">Маркетинг</span>
            {typedSettingsTabs
              .filter((t) => {
                if (t.id === "marketing")
                  return activeWorkspaceProfile?.hasMarketingModule;
                if (t.id === "bpmn")
                  return activeWorkspaceProfile?.hasBpmWorkflows;
                return false;
              })
              .map(renderTabButton)}
          </div>
        )}
        <div className="settings-tabs-group">
          <span className="settings-tabs-group-header">Системные</span>
          {typedSettingsTabs
            .filter((t) => {
              if (
                t.id === "reporting" &&
                !activeWorkspaceProfile?.hasAnalyticsModule
              )
                return false;
              return ["sources", "imports", "audit", "reporting"].includes(
                t.id,
              );
            })
            .map(renderTabButton)}
        </div>
      </div>

      <div
        className="settings-tab-panel"
        id={activeSettingsTabPanelId}
        role="tabpanel"
        aria-labelledby={settingsTabButtonId(settingsTab)}
      >
        {settingsTab !== "telegram" ? (
          <details className="settings-advanced-block settings-admin-secret-block">
            <summary className="settings-advanced-toggle">
              <span className="settings-advanced-label">
                <span className="settings-advanced-icon">🔐</span>
                Доступ к защищенным настройкам
              </span>
              <span className="settings-advanced-hint">
                только если требует сервер
              </span>
              <span className="settings-advanced-chevron">▼</span>
            </summary>
            <article className="telegram-link-panel telegram-admin-panel settings-advanced-form">
              <p>
                Если сервер клиники требует админ-доступ, введите секрет для
                изменений профиля, команды, кресел, источников, импорта и
                аудита. В браузере он не сохраняется.
              </p>
              <p>{adminSecretScopeWarning}</p>
              <div className="telegram-link-controls">
                <label>
                  Секрет администратора клиники для настроек
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={telegramAdminSecretDraft}
                    onChange={(event: TextInputChangeEvent) => {
                      if (propsSetTelegramAdminSecretDraft) {
                        propsSetTelegramAdminSecretDraft(event.target.value);
                      } else {
                        setTelegramAdminSecretDraft(event.target.value);
                      }
                    }}
                    onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                      if (event.key === "Enter" && adminSecretReady) {
                        event.preventDefault();
                        unlockTelegramAdminSession();
                      }
                    }}
                    placeholder="введите секрет администратора"
                    aria-describedby={
                      !adminSecretReady
                        ? "settings-admin-unlock-guidance"
                        : undefined
                    }
                  />
                </label>
                {!adminSecretReady ? (
                  <p
                    className="admin-unlock-guidance"
                    id="settings-admin-unlock-guidance"
                    role="status"
                    aria-live="polite"
                  >
                    Введите секрет администратора клиники, чтобы менять
                    защищенные настройки.
                  </p>
                ) : null}
                <button
                  className="secondary-button"
                  type="button"
                  onClick={unlockTelegramAdminSession}
                  aria-describedby={
                    !adminSecretReady
                      ? "settings-admin-unlock-guidance"
                      : undefined
                  }
                  disabled={!adminSecretReady}
                >
                  <ShieldCheck aria-hidden="true" /> Разблокировать
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={lockTelegramAdminSession}
                  disabled={!telegramAdminSecretSession}
                >
                  Забыть секрет
                </button>
              </div>
              <p>
                {telegramAdminSecretSession
                  ? "Админ-доступ активен до перезагрузки страницы."
                  : "Без секрета работают только окружения без обязательного админ-доступа."}
              </p>
            </article>
          </details>
        ) : null}

        {settingsTab === "profile" ? <SettingsProfileTab /> : null}

        {settingsTab === "staff" ? <SettingsStaffTab /> : null}

        <SettingsClinicTab settingsTab={settingsTab} />
        <SettingsAccessTab settingsTab={settingsTab} />
        <SettingsTelegramTab settingsTab={settingsTab} />
        {settingsTab === "insurance" ? <InsuranceContractsPanel /> : null}
        {settingsTab === "inventory" ? (
          <InventoryView
            organizationId={dashboard.clinicSettings.profile.organizationId}
          />
        ) : null}
        <SettingsMessengersTab settingsTab={settingsTab} />
        {settingsTab === "protocols" ? <SettingsProtocolsTab /> : null}

        {settingsTab === "rules" ? <SettingsRulesTab /> : null}

        {settingsTab === "prices" ? <SettingsPricesTab /> : null}
        {settingsTab === "sources" ? <SettingsSourcesTab /> : null}
        {settingsTab === "ai" ? <SettingsAiTab /> : null}
        {settingsTab === "modules" ? <SettingsModulesTab /> : null}
        {settingsTab === "marketing" &&
        activeWorkspaceProfile?.hasMarketingModule ? (
          <SettingsMarketingTab />
        ) : null}
        {settingsTab === "bpmn" && activeWorkspaceProfile?.hasBpmWorkflows ? (
          <SettingsBpmnTab />
        ) : null}
        {settingsTab === "reporting" &&
        activeWorkspaceProfile?.hasAnalyticsModule ? (
          <SettingsReportingTab />
        ) : null}

        <SettingsImportsTab />
        <SettingsAuditTab />
      </div>
    </motion.section>
  );
  /*
      <img alt="Telegram QR" src={telegramQrSvgToDataUrl(telegramLinkCode.qrSvg)} loading="lazy" decoding="async" />
      <img src={typedTelegramPreview.photoUrl} alt="Telegram card" loading="lazy" decoding="async" />
      <img src={item.photoUrl} alt="outbox image" loading="lazy" decoding="async" />
      clinicPublicLookup.warnings.slice(0, 4).map((warning: string) => (
                    <small key={warning}>{clinicPublicLookupWarningText(warning)}</small>
      clinicPublicLookup.warnings.slice(0, 3).map((warning: string) => (
                  <small key={warning}>{clinicPublicLookupWarningText(warning)}</small>
      typedMigrationAutopilotClinicLookup.warnings.slice(0, 3).map((warning: string) => (
                      <small key={warning}>{clinicPublicLookupWarningText(warning)}</small>
      quick-create-guidance
      disabled={!newStaffReadyToCreate}
      disabled={!newChairReadyToCreate}
      Доступ к Telegram
      Введите секрет администратора клиники, чтобы менять Telegram-настройки и отправки.
      Админ-доступ к Telegram активен до перезагрузки страницы.
      aria-describedby={isTelegramLoading ? telegramPreviewLoadingGuidanceId : !activePatient ? telegramPreviewPatientGuidanceId : undefined}
      aria-describedby={isTelegramLoading ? telegramPreviewLoadingGuidanceId : !typedTelegramLinkStaffOptions.length ? telegramPreviewStaffGuidanceId : undefined}
      Выберите активного пациента, чтобы собрать пациентские Telegram-сценарии.
      Добавьте сотрудника в настройках команды, чтобы собрать сводку сотруднику.
      Дождитесь загрузки Telegram-панели, чтобы собрать предпросмотр.
      aria-busy={isTelegramSendingDue || Boolean(telegramSendingItemId) || undefined}
      aria-describedby={telegramOutboxBulkSendGuidance ? telegramOutboxSendGuidanceId : undefined}
      aria-label="Добавить сотрудника"
      aria-label="Добавить кресло или кабинет"
      aria-pressed={dashboard.clinicSettings.profile.mode === mode}
      aria-pressed={newStaffRole === role}
      aria-pressed={newStaffSpecialty === specialty}
      aria-pressed={scheduleDraft.workingDays.includes(day.value)}
      aria-pressed={newChairHasXraySensor}
      aria-pressed={newChairHasMicroscope}
      aria-pressed={newChairHasSurgeryKit}
      telegramHumanMessage(item.blockedReason)
      item.warnings.map((warning) => telegramHumanMessage(warning)).filter(Boolean)
      telegram-inline-button-row
      telegram-outbox-buttons
      telegram-outbox-notes
      telegram-preview-buttons
      telegram-visual-card-indicator
      telegram-visual-card-preview
      "payment_reminder_notice"
      "review_request"
      "post_visit_checkup"
      "recall_notice"
      <span>Бот клиники</span>
      Секрет бота хранится в серверных настройках и не показывается в приложении.
      подключенном боте и защищенной серверной связке
      Профиль бота клиники
      защита входящих сообщений включена
      нужно включить защиту входящих сообщений
      Публичный HTTPS-адрес CRM, который Telegram сможет открыть для входящих сообщений.
      disabled={link.status !== "active" || Boolean(telegramRevokingLinkId)}
      telegram-link-ledger
      telegram-link-ledger-row
      telegram-link-ledger-codes
      typedTelegramOutbox.totalCount
      telegramOutboxRemainingCount > 0 || typedTelegramOutbox?.nextCursor
      Нет активных сотрудников
      telegram-outbox-panel
      telegram-outbox-controls
      telegram-outbox-summary-actions
      telegram-outbox-actions
      telegram-external-links
      telegram-visual-card-fields
      telegram-settings-form
      telegram-feature-grid
      getTypedTelegramInlineButtonRows(typedTelegramPreview.replyMarkup)
      getTypedTelegramInlineButtonRows(item.replyMarkup)
      disabled={!telegramLinkCode.code.trim()}
      disabled={!telegramLinkCode.shareText.trim()}
      telegram-link-actions
      telegram-link-action-state
      */
}

/*
{settingsTab === "clinic" ? (
          <section className="clinic-config"
{settingsTab === "access" ? (
          <section className="access-settings"
{settingsTab === "telegram" ? (
          <section className="telegram-settings"
*/

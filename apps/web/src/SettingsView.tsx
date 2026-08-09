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
/*
 * Импорта useState/useEffect здесь больше нет: единственными состояниями этого
 * файла были два списка под мёртвые адреса /api/system/ram-watchdogs и
 * /api/crm/patient-duplicate-merge-queues, и они убраны вместе с запросами
 * (причина — у комментария «ЗДЕСЬ СТОЯЛИ ДВА ЗАПРОСА» ниже). Раздел настроек
 * своего состояния не держит: всё приходит из useAppLogicContext,
 * useSettingsStore и useSettingsDerivations.
 */
/*
 * Импортов DadataGeocodedAddressesWidget и SingleSessionEnforcementsWidget
 * здесь больше нет намеренно: обе панели физически нечем заполнить. Причины
 * подробно — у места, где они монтировались, в конце этого файла (ищи
 * «Отсюда убраны две панели»). Не возвращай импорт, не прочитав тот
 * комментарий.
 */

import type {
	AiRecognitionJob,
	AuditEvent,
	Chair,
	ClinicMode,
	Dashboard,
	DentalPricelistAnalysisResponse,
	DenteTelegramBotStatus,
	DenteTelegramChatLinkPublic,
	DenteTelegramFeature,
	DenteTelegramLinkCodePublic,
	DenteTelegramMessagePreview,
	DenteTelegramOutboxItem,
	DenteTelegramOutboxResponse,
	DenteTelegramPostVisitCheckupDelayHoursByTopic,
	DenteTelegramVisualCardKey,
	DocumentIngestionResponse,
	DocumentIngestionTarget,
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
	MigrationLocalSourceDiscoveryResponse,
	RoleQueue,
	SmartImportPreviewResponse,
	SpeechProvider,
	SpeechRecordingRecoveryList,
	StaffMember,
	WeekdayIndex,
} from "@dental/shared";
import { motion } from "framer-motion";
import { ClipboardCheck, ShieldCheck } from "lucide-react";
import type { ChangeEvent, CSSProperties, KeyboardEvent } from "react";
/*
 * Разделы левого меню берутся из общего объявления, а не собираются здесь.
 *
 * settingsTabs приходит пропом, а группы раньше задавались списками
 * идентификаторов прямо в разметке этого файла — четвёртое место, где надо
 * помнить про каждую вкладку. Забыть в нём вкладку означало убрать её из меню
 * без всякого следа.
 */
import { money } from "./AppHelpers";
import { AuditLogsPanel } from "./AuditLogsPanel";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { EgiszBlankPermissionsWidget } from "./components/integrations/EgiszBlankPermissionsWidget";
import { YandexCalendarSyncsWidget } from "./components/integrations/YandexCalendarSyncsWidget";
import { InsuranceContractsPanel } from "./components/settings/InsuranceContractsPanel";
import { MigrationWizard } from "./components/settings/MigrationWizard";
import { SettingsAccessTab } from "./components/settings/SettingsAccessTab";
import { SettingsAiTab } from "./components/settings/SettingsAiTab";
import { SettingsAuditTab } from "./components/settings/SettingsAuditTab";
import { SettingsBpmnTab } from "./components/settings/SettingsBpmnTab";
import { SettingsClinicTab } from "./components/settings/SettingsClinicTab";
import { SettingsImportsTab } from "./components/settings/SettingsImportsTab";
import { SettingsMarketingTab } from "./components/settings/SettingsMarketingTab";
import { SettingsMessengersTab } from "./components/settings/SettingsMessengersTab";
import { SettingsModulesTab } from "./components/settings/SettingsModulesTab";
import { SettingsPricesTab } from "./components/settings/SettingsPricesTab";
import { SettingsProfileTab } from "./components/settings/SettingsProfileTab";
import { SettingsProtocolsTab } from "./components/settings/SettingsProtocolsTab";
import { SettingsReportingTab } from "./components/settings/SettingsReportingTab";
import { SettingsRulesTab } from "./components/settings/SettingsRulesTab";
import { SettingsSourcesTab } from "./components/settings/SettingsSourcesTab";
import { SettingsStaffTab } from "./components/settings/SettingsStaffTab";

import type { MprProjection } from "./imagingUiLabels";
import type {
	ImagingConnectorCard,
	ImagingViewerCapability,
	RecognitionPreset,
} from "./settingsStaticData";
import { useSettingsStore } from "./store/settingsStore";

// biome-ignore lint/correctness/noUnusedVariables: automated suppression
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
// biome-ignore lint/correctness/noUnusedVariables: automated suppression
type StringTokenGroup = { title: string; items: string[] };

function _formatBrowserImagingScanElapsed(
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
// biome-ignore lint/correctness/noUnusedVariables: automated suppression
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
type SettingsTab = {
	id: SettingsTabId;
	title: string;
	group: SettingsTabGroup;
};
// biome-ignore lint/correctness/noUnusedVariables: automated suppression
type CbctWorkbenchPlane = { key: MprProjection; title: string; detail: string };
// biome-ignore lint/correctness/noUnusedVariables: automated suppression
type MigrationOperatorActionScope = "primary" | "script";
// biome-ignore lint/correctness/noUnusedVariables: automated suppression
type InputChangeEvent = ChangeEvent<HTMLInputElement>;
type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
// biome-ignore lint/correctness/noUnusedVariables: automated suppression
type SelectChangeEvent = ChangeEvent<HTMLSelectElement>;

import { type SettingsTabGroup, settingsTabGroups } from "./AppConstants";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { useWorkspaceProfile } from "./hooks/useWorkspaceProfile";
import { useSettingsDerivations } from "./useSettingsDerivations";

export interface SettingsViewProps {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	activeStaffUser?: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	[key: string]: any;
}

export function SettingsView({ activeStaffUser }: SettingsViewProps) {
	/*
    Источники значений держим целиком, а не только россыпью имён: из них
    собирается мешок пропсов для вкладок (см. settingsProps ниже). Раньше мешок
    набивался руками, и вкладки получали малую часть того, что читают.
  */
	const appLogic = useAppLogicContext();
	const {
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		activePatient,
		activeSettingsTabButtonRef,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		activeSpeechProviderHealth,
		activeWorkspaceProfile,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		addChair,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		addStaffMember,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		applyProtocolTemplate,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		browserCanRequestPersistentStorage,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		browserContinuity,
		browserContinuityChecks,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		browserContinuityState,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		browserContinuityValue,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		browserDirectoryInputRef,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		browserDirectoryPickerAvailable,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		browserImagingFileInputAccept,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		browserImagingFilesInputRef,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		browserImagingScanProgress,
		browserMigrationDiscovery,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		browserMigrationScanProgress,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		browserMigrationInputRef,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		browserPickedImagingFolder,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		buildDicomFolderWorkupPlan,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		buildDicomRenderCachePlan,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		buildDicomViewerLaunchManifest,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		buildDicomViewerToolStateBundle,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		buildDicomViewerWorkbenchManifest,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		cancelLocalDicomOperation,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		cbctWorkbenchPlanes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		cbctWorkbenchProjections,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		cbctWorkbenchSeries,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		cbctWorkbenchTools,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		chairScheduleDirtyIds,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		chairScheduleDrafts,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		chairScheduleSaveStates,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		chairScheduleSavingId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		changeClinicMode,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		checkDicomWebConnector,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		checkDicomWorkstationReadiness,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		chooseRecognitionPreset,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		clinicPublicLookup,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		cancelBrowserImagingFolderScan,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		cancelBrowserMigrationScan,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		clearBrowserPickedImagingFolderPreview,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		clearDicomWorkbenchRecovery,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		clearLocalImagingFolderRecovery,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		clinicalRuleActionLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		clinicalRuleSeverityLabels,
		clinicModeLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		clinicProfileDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		clinicProfileSaveState,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		commitImagingImport,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		commitImport,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		commitSmartImport,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		copyTelegramTextToClipboard,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		createClinicalRuleFromSettings,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		createTelegramLinkCode,
		dashboard,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		defaultDicomFirstFrameViewerState,
		// dentalMaterialKindLabels,
		// dentalRestorationTypeLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomFirstFrameImageStyle,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomFirstFramePreview,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomFirstFrameStatusLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomFirstFrameViewerState,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomFolderSeriesScan,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomFolderWorkupPathLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomFolderWorkupPlan,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomDiagnosticPixelPolicyLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomExecutionLaneLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomGpuClassLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomLabel,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomLocalFolderDiscovery,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomQualityModeLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomReadinessCheckLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomRenderMemoryBudgetClassLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomRenderCachePlan,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomRuntimeTierLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomSeriesPreview,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomSeriesViewerLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomTextureStrategyLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomViewerLaunchManifest,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomViewerLaunchModeLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomViewerToolStateBundle,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomViewerWorkbenchManifest,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomWebCheck,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomWebEndpointUrl,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomWebStatusLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomWorkbenchLocalSavedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomWorkbenchServerBundle,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomWorkbenchSourceIsRedacted,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomWorkstationReadiness,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		discoverDicomFolders,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		discoverMigrationSources,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		documentDetectedKindLabel,
		documentIngestion,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		documentIngestionQualityLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		documentIngestionTarget,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		documentLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		downloadDicomViewerToolStateBundle,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		downloadDicomWorkbenchManifest,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		downloadMigrationHandoffReport,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		downloadPersistenceExport,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		downloadSmartImportSafeHandoffReport,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		downloadSmartImportReport,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		downloadTelegramQrSvg,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		filteredTelegramOutboxItems,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		formatByteSize,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		formatDateTime,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		formatMegabytes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		formatTime,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		handleBrowserDirectoryInputChange,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		handleBrowserMigrationInputChange,
		hiddenTelegramOutboxItemCount,
		imagingConnectorCards,
		imagingFolderPath,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		imagingFolderScan,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		imagingImportCommit,
		imagingImportPreview,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		imagingImportSourceKind,
		imagingImportText,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		imagingKindLabels,
		ctPlanningImplantPlan,
		ctPlanningActiveQuickActionId,
		imagingViewerActiveTool,
		imagingSourceChoices,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		imagingSourceDetails,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		imagingSourceLabels,
		imagingViewerCapabilities,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		importCommit,
		importIntake,
		importPreview,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		importSourceKind,
		importSourceLabels,
		importText,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		ingestImportFile,
		ingestionTargetLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		integrationCapabilityLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		integrationCategoryLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		integrationStatusLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isBrowserImagingFolderPicking,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isBrowserMigrationScanning,
		isChairCreating,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isClinicPublicLookupLoading,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isClinicalRuleSaving,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isDicomFirstFramePreviewing,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isDicomFolderWorkupPlanning,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isDicomLocalDiscovering,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isDicomManifestBuilding,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isDicomRenderCachePlanning,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isDicomSeriesPreviewLoading,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isDicomToolStateBuilding,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isDicomWebChecking,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isDicomWorkbenchBuilding,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isDicomWorkbenchReconnecting,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isDicomWorkbenchServerSaving,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isDicomWorkstationChecking,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isDocumentIngesting,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isImagingFolderScanning,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isLocalDicomOperationActive,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isImagingImportCommitting,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isImagingImportLoading,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isImportCommitting,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isImportDictating,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isImportLoading,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isLocalImagingOrganizing,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isMigrationAutopilotLoading,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isMigrationHandoffReportLoading,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isMigrationSourceDiscovering,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isMigrationSourceProbeLoading,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isMigrationSourceWorkupLoading,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isPersistenceExporting,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isRecognitionLoading,
		isStaffCreating,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isSmartImportCommitting,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isSmartImportLoading,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isSmartReportLoading,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isSmartSafeReportLoading,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isTelegramChatLinksLoadingMore,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isTelegramLinkCodesLoadingMore,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isTelegramLinkCreating,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isTelegramLoading,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isTelegramOutboxItemDueForUi,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isTelegramOutboxLoadingMore,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isTelegramSendingDue,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isTelegramSettingsSaving,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		latestDicomWorkbenchServerBundle,
		legalMissingFields,
		legalReadinessPercent,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		loadLocalBridgeUsePlans,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		loadMoreTelegramChatLinks,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		loadMoreTelegramLinkCodes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		loadMoreTelegramOutbox,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		loadPersistenceHealth,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		loadPersistenceIntegrity,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		loadTelegramControlPlane,
		localBridgeReadiness,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		localBridgeStatusLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		localBridgeStatusState,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		localBridgeStatusValue,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		localBridgeUsePathLabels,
		localBridgeUsePlans,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		localImagingFolderDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		localImagingModelRoleLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		localImagingOrganizer,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		localImagingOrganizerActionLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		lookupClinicPublicProfile,
		lockTelegramAdminSession,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		markTelegramSettingsDirty,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		migrationAutopilot,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		migrationSourceDiscovery,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		migrationSourceProbe,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		migrationSourceWorkup,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprAxisDeg,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprCacheModeLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprCrosshairEnabled,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprLinkedPlanesEnabled,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprLoadStrategyLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprProjection,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprProjectionLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprResourceTierLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprSliceIndex,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprSlabMm,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprToolLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprWorkbenchDraftRestored,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprWorkbenchLocalSavedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprWindowPreset,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprWindowPresetLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newChairHasMicroscope,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newChairHasSurgeryKit,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newChairHasXraySensor,
		newChairName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newRuleAction,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newRuleBlockedServiceId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newRuleCategory,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newRuleCompletedServiceId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newRuleOwnerRole,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newRulePatientText,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newRuleRequiredServiceId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newRuleSeverity,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newRuleSpecialty,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newRuleTitle,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newRuleTriggerServiceId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newRuleWarningText,
		newStaffName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newStaffRole,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		newStaffSpecialty,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		normalizedClinicalRuleAction,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		normalizedClinicalRuleSeverity,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		normalizedDentalSpecialty,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		normalizedServiceCategory,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		normalizedStaffRole,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		normalizedTelegramBotMode,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		normalizedTelegramLinkSubjectType,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		normalizedTelegramOutboxStatusFilter,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		normalizedTelegramOutboxTemplateFilter,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		normalizedTelegramPrivacyMode,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		normalizeUiLanguageInput,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		ohifBaseUrl,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		organizeLocalImagingSources,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		persistenceHealth,
		persistenceIntegrity,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		pickBrowserImagingFolder,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		pickBrowserImagingFiles,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		pickBrowserMigrationSource,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		policyAuditEventLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		prepareDicomWorkbenchFromFolder,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		previewDicomFirstFrame,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		previewDicomFirstFrameSlice,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		previewDicomSeries,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		planMigrationDiscoveryCandidate,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		previewMigrationDiscoveryCandidate,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		previewMigrationAutopilotSources,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		probeMigrationDiscoveryCandidate,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		previewImagingImport,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		previewImport,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		previewSmartImport,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		previewTelegramTemplate,
		pricelistAnalysis,
		/*
      Три имени ниже приезжают в useAppLogic и НИ РАЗУ не читались.

      pricelistImageNote — живая строка, её пишет preparePricelistImage
      (AppHelpers.tsx:5928) и переписывает общий импорт файлов
      (useAppLogic.tsx:7844): «Фото подготовлено: 1600x1200, 1.9 Мп, JPEG 82%.».
      Клиника грузила фото прайса, разбор шёл по СЖАТОЙ картинке, и узнать
      степень сжатия было нельзя ниоткуда — а именно она объясняет, почему с
      мелкого шрифта строки не прочитались.

      pricelistItemMaterialText и pricelistMaterialSummaryText — готовые функции
      pricelistUiMeta (:107 и :95). Разбор честно считает materialKind для каждой
      строки и ставит material_uncertain, то есть жаловался на поле, которого
      клиника не видела ни в одной вкладке.
    */
		pricelistImageNote,
		pricelistItemMaterialText,
		pricelistMaterialSummaryText,
		pricelistWarningsText,
		recognitionJob,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		recognitionKind,
		recognitionPresets,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		recognitionTarget,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		recognitionTargetLabels,
		recognitionText,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		reconnectDicomWorkbenchFromCurrentFolder,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		refreshBrowserContinuity,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		refreshSpeechRuntime,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		addMigrationDiscoveryCandidateToSmartImport,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		rememberLocalImagingFolder,
		reopenOnboarding,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		requestBrowserStoragePersistence,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		restoreDicomWorkbenchServerBundle,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		restoreMprWorkbenchLocalDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		revokeTelegramChatLink,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		runMigrationAutopilot,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		runRecognitionJob,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		saveChairSchedule,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		saveClinicProfileFromDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		saveDicomWorkbenchBundleToServer,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		saveStaffSchedule,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		saveTelegramSettings,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		scanDicomFolderSeries,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		scanImagingFolder,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		selectedUiLanguageOption,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		sendDueTelegramOutbox,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		sendRecognitionResultToImport,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		sendTelegramOutboxItem,
		serviceCategoryLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		serviceTitle,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setDicomFirstFramePreview,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setDicomFirstFrameViewerState,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setDicomFolderSeriesScan,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setDicomFolderWorkupPlan,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setDicomLocalFolderDiscovery,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setDicomRenderCachePlan,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setDicomSeriesPreview,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setDicomViewerLaunchManifest,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setDicomViewerToolStateBundle,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setDicomViewerWorkbenchManifest,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setDicomWebCheck,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setDicomWebEndpointUrl,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setDicomWorkbenchLocalSavedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setDicomWorkstationReadiness,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setDocumentIngestionTarget,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setImagingFolderPath,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setImagingFolderScan,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setImagingImportCommit,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setImagingImportPreview,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setImagingImportSourceKind,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setImagingImportText,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		selectCtPlanningImplant,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setImagingViewerActiveTool,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setCtPlanningActiveQuickActionId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setImportCommit,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setImportIntake,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setImportPreview,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setImportSourceKind,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setImportText,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setLocalImagingOrganizer,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setMprAxisDeg,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setMprCrosshairEnabled,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setMprLinkedPlanesEnabled,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setMprProjection,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setMprSliceIndex,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setMprSlabMm,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setMprWindowPreset,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewChairHasMicroscope,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewChairHasSurgeryKit,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewChairHasXraySensor,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewChairName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewRuleAction,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewRuleBlockedServiceId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewRuleCategory,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewRuleCompletedServiceId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewRuleOwnerRole,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewRulePatientText,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewRuleRequiredServiceId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewRuleSeverity,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewRuleSpecialty,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewRuleTitle,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewRuleTriggerServiceId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewRuleWarningText,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewStaffName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewStaffRole,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewStaffSpecialty,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setOhifBaseUrl,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setRecognitionJob,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setRecognitionText,
		setSettingsTab,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setSmartImportCommit,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setSmartImportMode,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setSmartImportPreview,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setSmartImportText,
		settingsTab,
		settingsTabs,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setUiLanguage,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		smartImportCommit,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		smartImportMode,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		smartImportModeLabels,
		smartImportPreview,
		smartImportText,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		specialtyLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechGatewayCanUpload,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechGatewayHealthReport,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechGatewayStatus,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechProviderConnectorLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechProviderHealthById,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechProviderHealthLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechProviderModeLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechProviderRuntimeById,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechProviderSelectionLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechProviderStatusLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechRecordingPathLabels,
		speechRecordingRecovery,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechRecordingStrategy,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		speechRecoveryStateLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		staffRoleLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		staffScheduleDirtyIds,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		staffScheduleDraftFromWorkingHours,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		staffScheduleDrafts,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		staffScheduleSaveStates,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		staffScheduleSavingId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		stageLocalImagingFolderRecovery,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		startImportDictation,
		telegramAdminSecretDraft,
		telegramAdminSecretSession,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramAllowVoiceIntakeDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramBotConfigId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramBotUsernameDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramChatLinkLedger,
		telegramChatLinks,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramClassificationLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramDeliveryStatusLabels,
		telegramEnabledFeaturesDraft,
		telegramFeatureHelp,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramFeatureLabel,
		telegramFeatureOptions,
		telegramFeaturePlan,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramHumanMessage,
		telegramInlineButtonKindLabels,
		telegramInlineButtonRowsFromReplyMarkup,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramLinkActionState,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramLinkCode,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramLinkCodeLedger,
		telegramLinkCodes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramLinkCodeStatusLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramLinkStaffId,
		telegramLinkStaffOptions,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramLinkSubjectType,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramMapsUrlDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramModeDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramModeHints,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramModeLabels,
		telegramOutbox,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramOutboxStatusFilter,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramOutboxStatusFilterLabels,
		telegramOutboxStatusFilterOptions,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramOutboxTemplateFilter,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramOutboxTemplateFilterLabels,
		telegramOutboxTemplateFilterOptions,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramOwnBotUsernameDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramPatientPortalBaseUrlDraft,
		telegramPostVisitCheckupDelayDrafts,
		telegramPostVisitCheckupDelayFields,
		telegramPreview,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramPrivacyModeDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramPrivacyModeHints,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramPrivacyModeLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramQrSvgToDataUrl,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramReminderLeadTimesDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramReviewRequestDelayDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramReviewUrlDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramRevokingLinkId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramSendingItemId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramSettingsDirty,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramSettingsSaveError,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramSettingsSaveState,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramStaffEscalationChannelDraft,
		telegramStatus,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramSubjectName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramTemplateLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramTokenTtlDraft,
		telegramVisualCardFields,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramVisualCardUrlDrafts,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramWebhookBaseUrlDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramWelcomeImageUrlDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		toggleChairWorkingDay,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		toggleClinicalRule,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		toggleClinicWorkingDay,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		toggleStaffWorkingDay,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		toggleTelegramFeature,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		uiLanguage,
		uiLanguageOptions,
		setTelegramAdminSecretDraft: propsSetTelegramAdminSecretDraft,
		unlockTelegramAdminSession,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		updateChairScheduleDay,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		updateChairScheduleDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		updateClinicProfileDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		updateStaffScheduleDay,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		updateStaffScheduleDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		updateTelegramPostVisitCheckupDelayDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		updateTelegramVisualCardUrlDraft,
		visibleTelegramOutboxItems,
		weekdayOptions,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		workspaceScopeLabels,
	} = appLogic;
	const settingsStore = useSettingsStore();
	const {
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		clinicMode,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setClinicMode,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramOutbox,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramOutboxStatusFilter,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramOutboxTemplateFilter,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramLinkSubjectType,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramLinkStaffId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramLinkCode,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramLinkActionState,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramModeDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramBotUsernameDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramOwnBotUsernameDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramBotConfigId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramWebhookBaseUrlDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramPatientPortalBaseUrlDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramWelcomeImageUrlDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramReviewUrlDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramMapsUrlDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramEnabledFeaturesDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramTokenTtlDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramReminderLeadTimesDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramReviewRequestDelayDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramAllowVoiceIntakeDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramStaffEscalationChannelDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramPrivacyModeDraft,
		setTelegramAdminSecretDraft,
	} = settingsStore;

	const _recognitionInputReady = (recognitionText || "").trim().length > 0;
	const _smartImportInputReady = (smartImportText || "").trim().length > 0;
	const _imagingImportInputReady = (imagingImportText || "").trim().length > 0;
	const _patientImportInputReady = (importText || "").trim().length > 0;
	const _localImagingFolderReady = (imagingFolderPath || "").trim().length > 0;
	/*
    Флаг «готово к созданию» обязан учитывать выполняющийся запрос, иначе кнопка остаётся активной до
    ответа сервера и второй клик создаёт дубль сотрудника или кресла. Защищённая версия живёт в
    useAppLogic, но её здесь недостаточно: `settingsProps` ниже собирается как `Record<string, any>`,
    где `...appLogic` приносит защищённое значение, `...derivations` перекрывает его своей копией без
    защиты, а явные ключи в конце объекта перекрывают ещё раз — последний ключ выигрывает. Поэтому
    защиту надо ставить именно здесь: это то значение, которое уезжает и в кнопки этого файла, и в
    SettingsClinicTab, где персонал добавляют на самом деле. Типы молчат из-за `Record<string, any>`.
  */
	const newStaffReadyToCreate =
		(newStaffName || "").trim().length > 0 && !isStaffCreating;
	const newChairReadyToCreate =
		(newChairName || "").trim().length > 0 && !isChairCreating;
	const adminSecretReady = (telegramAdminSecretDraft || "").trim().length > 0;
	const adminSecretScopeWarning =
		settingsTab === "telegram"
			? "Этот секрет относится только к Telegram. Он не разблокирует настройки клиники, расписание или клинические данные, если для них включены отдельные секреты."
			: "Этот секрет относится только к настройкам клиники. Он не разблокирует расписание, Telegram или клинические данные, если для них включены отдельные секреты.";
	const _typedClinicModes = Object.keys(clinicModeLabels ?? {}) as ClinicMode[];
	const _typedModeHints = (dashboard?.clinicSettings?.modeHints ??
		[]) as string[];
	const _typedRoleQueues = (dashboard?.shiftIntelligence?.roleQueues ??
		[]) as RoleQueue[];
	const _typedStaffMembers = (dashboard?.clinicSettings?.staff ??
		[]) as StaffMember[];
	const _typedChairs = (dashboard?.clinicSettings?.chairs ?? []) as Chair[];
	const _typedWeekdayOptions = (weekdayOptions ?? []) as WeekdayOption[];
	const _typedUiLanguageOptions = (uiLanguageOptions ?? []) as Array<{
		value: string;
		label: string;
		detail: string;
	}>;
	const typedTelegramLinkStaffOptions = (telegramLinkStaffOptions ??
		[]) as StaffMember[];

	const _typedImagingConnectorCards = (imagingConnectorCards ??
		[]) as ImagingConnectorCard[];
	const _typedImagingViewerCapabilities = (imagingViewerCapabilities ??
		[]) as ImagingViewerCapability[];
	const _typedCtPlanningImplantPlan =
		ctPlanningImplantPlan as ImagingViewerImplantPlan | null;
	const _typedCtPlanningActiveQuickActionId =
		typeof ctPlanningActiveQuickActionId === "string"
			? ctPlanningActiveQuickActionId
			: null;
	const _typedImagingViewerActiveTool =
		imagingViewerActiveTool as ImagingViewerTool;
	const _typedIntegrationPresets = (dashboard?.clinicSettings
		?.integrationPresets ?? []) as IntegrationPreset[];
	const _typedSpeechProviders = (dashboard?.speechProviders ??
		[]) as SpeechProvider[];
	const _typedRecognitionPresets = (recognitionPresets ??
		[]) as RecognitionPreset[];
	const _typedRecognitionJob = recognitionJob as AiRecognitionJob | null;
	const _typedSpeechRecordingRecovery =
		speechRecordingRecovery as SpeechRecordingRecoveryList | null;
	const _typedBrowserMigrationDiscovery =
		browserMigrationDiscovery as MigrationLocalSourceDiscoveryResponse | null;
	const _typedSmartImportPreview =
		smartImportPreview as SmartImportPreviewResponse | null;
	const _typedImagingSourceChoices = (imagingSourceChoices ??
		[]) as ImagingSourceKind[];
	const _typedImagingImportPreview =
		imagingImportPreview as ImagingImportPreviewResponse | null;
	const _typedBrowserContinuityChecks = (browserContinuityChecks ??
		[]) as BrowserContinuityCheck[];
	const _typedLocalBridgeReadiness =
		localBridgeReadiness as LocalBridgeReadinessResponse | null;
	const _typedLocalBridgeUsePlans =
		localBridgeUsePlans as LocalBridgeUsePlansResponse | null;
	const _typedPersistenceIntegrity =
		persistenceIntegrity as PersistenceIntegrityReport | null;
	const _typedImportBatches = (dashboard?.importBatches ?? []) as ImportBatch[];
	const _typedAuditEvents = (dashboard?.auditEvents ?? []) as AuditEvent[];
	const _typedImportSourceKinds = Object.keys(
		importSourceLabels ?? {},
	) as ImportSourceKind[];
	const _typedDocumentIngestionTargets = Object.keys(
		ingestionTargetLabels ?? {},
	) as DocumentIngestionTarget[];
	const _typedDocumentIngestion =
		documentIngestion as DocumentIngestionResponse | null;
	const _typedImportIntake = importIntake as ImportIntakeResponse | null;
	const _typedImportPreview = importPreview as ImportPreviewResponse | null;
	const _typedActiveWorkspaceProfile =
		activeWorkspaceProfile as WorkspaceProfile | null;
	const _typedWorkspaceProfiles = (dashboard?.clinicSettings
		?.workspaceProfiles ?? []) as WorkspaceProfile[];
	const _typedRoleAccessPolicies = (dashboard?.clinicSettings
		?.roleAccessPolicies ?? []) as RoleAccessPolicy[];
	const typedTelegramChatLinks =
		(telegramChatLinks as DenteTelegramChatLinkPublic[]) ?? [];
	const typedTelegramLinkCodes =
		(telegramLinkCodes as DenteTelegramLinkCodePublic[]) ?? [];
	const _typedTelegramPreview =
		telegramPreview as DenteTelegramMessagePreview | null;
	const typedTelegramOutbox =
		telegramOutbox as DenteTelegramOutboxResponse | null;
	const typedVisibleTelegramOutboxItems =
		visibleTelegramOutboxItems as DenteTelegramOutboxItem[];
	const _telegramOutboxRemainingCount = typedTelegramOutbox
		? Math.max(
				0,
				typedTelegramOutbox.filteredCount -
					typedVisibleTelegramOutboxItems.length,
			)
		: hiddenTelegramOutboxItemCount;
	const _typedTelegramStatus = telegramStatus as DenteTelegramBotStatus | null;
	const _typedTelegramOutboxStatusFilterOptions =
		telegramOutboxStatusFilterOptions as string[];
	const _typedTelegramOutboxTemplateFilterOptions =
		telegramOutboxTemplateFilterOptions as string[];
	const typedTelegramInlineButtonKindLabels =
		telegramInlineButtonKindLabels as Record<string, string>;
	const _typedTelegramFeaturePlan =
		telegramFeaturePlan as TelegramFeaturePlan | null;
	const typedTelegramEnabledFeaturesDraft =
		telegramEnabledFeaturesDraft as DenteTelegramFeature[];
	const typedTelegramFeatureOptions =
		telegramFeatureOptions as DenteTelegramFeature[];
	const _typedTelegramFeatureHelp = telegramFeatureHelp as Record<
		DenteTelegramFeature,
		string
	>;
	const _typedTelegramPostVisitCheckupDelayFields =
		telegramPostVisitCheckupDelayFields as TelegramPostVisitCheckupDelayField[];
	const typedTelegramPostVisitCheckupDelayDrafts =
		telegramPostVisitCheckupDelayDrafts as Record<
			TelegramPostVisitCheckupDelayKey,
			string
		>;
	const _typedTelegramVisualCardFields =
		telegramVisualCardFields as TelegramVisualCardField[];
	const _getTypedTelegramInlineButtonRows = (
		replyMarkup: Record<string, unknown> | null,
	) =>
		telegramInlineButtonRowsFromReplyMarkup(
			replyMarkup,
		) as TelegramInlineButtonRow[];

	const telegramPreviewPatientGuidanceId = "telegram-preview-patient-guidance";
	const telegramPreviewStaffGuidanceId = "telegram-preview-staff-guidance";
	const telegramPreviewLoadingGuidanceId = "telegram-preview-loading-guidance";
	const _telegramOutboxSendGuidanceId = "telegram-outbox-send-guidance";
	const _dicomWorkbenchSeriesGuidanceId = "dicom-workbench-series-guidance";
	const _dicomWorkstationGuidanceId = "dicom-workstation-guidance";
	const derivations = useSettingsDerivations();
	const {
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomArchiveAddressGuidanceId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		localDicomFolderGuidanceId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		migrationHandoffReportGuidanceId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomArchiveAddressReady,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramOutboxBulkSendGuidance,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		clinicLookupSuggestionFieldEntries,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		clinicLookupSuggestionApplySummary,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		applyClinicLookupSuggestion,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		clinicProfileSaveButtonText,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedMigrationAutopilot,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedMigrationSourceDiscovery,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		activeMigrationDiscoveryForSettingsAutopilot,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedMigrationSourceWorkup,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedMigrationSourceProbe,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedClinicPublicLookup,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedDicomFirstFramePreview,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedDicomFirstFrameViewerState,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedDefaultDicomFirstFrameViewerState,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomFirstFrameSelectableCount,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomFirstFrameCurrentIndex,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomFirstFrameSliceMaxIndex,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomFirstFrameLandmarkSlices,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomFirstFrameCanSelectPrevious,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomFirstFrameCanSelectNext,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedDicomSeriesPreviewSeries,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedDicomSeriesPreviewParserNotes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedCbctWorkbenchSeries,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedDicomViewerWorkbenchManifest,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedDicomWorkstationReadiness,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedDicomRenderCachePlan,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedDicomViewerToolStateBundle,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedDicomLocalFolderDiscovery,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedLocalImagingOrganizer,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedImagingFolderScan,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedDicomFolderSeriesScan,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedDicomFolderWorkupPlan,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedCbctWorkbenchTools,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedCbctMprBlockers,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedCbctMprWarnings,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedCbctResourceSafetyCaps,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprControlsReady,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprSliceMaxIndex,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprCenterSliceIndex,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedCbctWorkbenchProjections,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprSafeSliceIndex,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		updateDicomFirstFrameViewerState,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		updateDicomFirstFrameViewerNumber,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedMprProjection,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprAxisDirectionLabel,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprAxisAngleBadge,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprSlabBadge,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprSliceBadge,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprSlabVisualWidth,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprSlicePositionPercent,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprCurrentSliceFraction,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprSliceLabel,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprAxisRangeValue,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprSlabRangeValue,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprSliceRangeValue,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprActiveProjectionLabel,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprActiveProjectionOrientation,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprProjectionCompass,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprAxisGuidance,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprNearestClinicalPreset,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprClinicalInput,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprWorkbenchSummaryText,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprOperatorSummaryCards,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprAxisVisualizerLabel,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprClinicalChecklist,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprClinicalNextStep,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		mprClinicalPresetButtonClass,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		resetMprControls,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		applyMprClinicalPreset,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		applyCtPlanningQuickAction,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		selectCtPlanningImplantFromSettings,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		applyNearestMprClinicalPreset,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		handleMprKeyboardNavigation,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedMigrationAutopilotSources,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedMigrationAutopilotClinicLookup,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedMigrationAutopilotSteps,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedMigrationOperatorLanes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedMigrationHandoffChecklist,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		migrationDryRunSummary,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		migrationTriageItems,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedMigrationDiscoveryCandidates,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedMigrationWorkupReadinessIssues,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedMigrationProbeReadinessIssues,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedClinicPublicLookupSuggestions,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedClinicPublicLookupTargets,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		migrationOperatorScriptSteps,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		migrationPrimaryOperatorStep,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		migrationPrimaryOperatorCandidate,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		migrationCandidatePreviewReady,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		migrationCandidatePreviewHint,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		migrationPreviewableSourceCount,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		migrationPreAutopilotSourceCount,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		migrationKnownSourceCount,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		migrationHandoffReportReady,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		migrationPreviewReadyRows,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		migrationClinicLookupFieldCount,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		migrationSmartClinicFieldCount,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		migrationClinicFieldsFound,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		migrationProgressItems,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		focusSmartImportWorkbench,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		renderMigrationOperatorStepActions,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		renderMigrationTechnicalNotes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedClinicalRuleActionLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedClinicalRuleActions,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedClinicalRuleSeverityLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedClinicalRuleSeverities,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedClinicalRules,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedServiceCatalog,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedServiceCategoryLabels,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		typedServiceCategories,
	} = derivations;

	/*
    МЕШОК ПРОПСОВ ДЛЯ ВКЛАДОК НАСТРОЕК.

    Вкладки вынесены в отдельные компоненты копированием тела этого файла и
    достают значения по именам из объекта `props`. Раньше мешок набивался
    руками — и набивался неполно: вкладка «Клиника» читала 65 имён при 28
    переданных, вкладка «ТГ-бот» — 139 при 21. Недостающее приходило как
    undefined, и первое же обращение по ключу или вызов роняли отрисовку:
    раздел «Настройки» не открывался вообще, а «ТГ-бот» падал на
    `typedTelegramChatLinks.filter`.

    Ручной список обречён отставать: любое новое значение во вкладке снова даёт
    падение, и заметить это можно только открыв вкладку. Поэтому мешок
    собирается из тех же источников, из которых берёт значения сам
    SettingsView: контекст логики, хранилище настроек, производные значения.
    Порядок важен — производные считаются из первых двух и должны побеждать.

    Локальные значения этого файла (их нет ни в одном источнике) добавляются
    последними, поимённо.
  */
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const settingsProps: Record<string, any> = {
		...appLogic,
		...settingsStore,
		...derivations,
		activeStaffUser,
		adminSecretReady: false,
		adminSecretScopeWarning,
		legalMissingFields,
		legalReadinessPercent,
		newChairReadyToCreate,
		newStaffReadyToCreate,
		telegramPreviewLoadingGuidanceId,
		telegramPreviewPatientGuidanceId,
		telegramPreviewStaffGuidanceId,
		/*
      Приведения `typed*` для вкладки «ТГ-бот» считаются здесь, а не в
      useSettingsDerivations: там одноимённые значения объявлены, но наружу не
      возвращаются. Без них вкладка падала на `typedTelegramChatLinks.filter`.
      Список получен сверкой локальных объявлений этого файла с тем, что читают
      вкладки: scratch/probe-settings-locals.mjs.
    */
		typedTelegramChatLinks,
		typedTelegramEnabledFeaturesDraft,
		typedTelegramFeatureOptions,
		typedTelegramInlineButtonKindLabels,
		typedTelegramLinkCodes,
		typedTelegramLinkStaffOptions,
		typedTelegramPostVisitCheckupDelayDrafts,
	};

	const flags = useWorkspaceProfile();
	let typedSettingsTabs = (settingsTabs ?? []) as SettingsTab[];
	if (!flags.hasMarketingModule)
		typedSettingsTabs = typedSettingsTabs.filter((t) => t?.id !== "marketing");
	if (!flags.hasAnalyticsModule)
		typedSettingsTabs = typedSettingsTabs.filter((t) => t?.id !== "reporting");
	/* Признак склада остался при самом разделе: вкладки настроек у него больше нет. */
	if (!flags.hasBpmWorkflows)
		typedSettingsTabs = typedSettingsTabs.filter((t) => t?.id !== "bpmn");
	if (!flags.hasClinicalRules)
		typedSettingsTabs = typedSettingsTabs.filter((t) => t?.id !== "rules");
	if (!flags.hasInsuranceCoPay)
		typedSettingsTabs = typedSettingsTabs.filter((t) => t?.id !== "insurance");
	/*
	 * Настройки мессенджеров врачу не показываем: бот клиники, номер WhatsApp и
	 * рассылки — дело администратора. Это условие стояло в прежней раскладке
	 * меню, но проверяло идентификатор "messengers", которого в списке вкладок
	 * не было, и потому не срабатывало ни разу. Сохраняю замысел, но в том же
	 * месте, что и признаки модулей, — чтобы кнопка и панель не разошлись.
	 */
	if (activeStaffUser?.role === "doctor")
		typedSettingsTabs = typedSettingsTabs.filter((t) => t?.id !== "telegram");
	/*
	 * Строки прайса, которые разбор просит проверить руками.
	 *
	 * Правило отказа от догадки о цене (apps/api/src/pricelist/analyzer.ts:713)
	 * обосновано тем, что клиника видит price_not_found и проверяет одну строку
	 * руками. Обоснование было ложным для отгруженного интерфейса: analyzer
	 * складывал предупреждения в item.warnings, useAppLogic отдавал
	 * pricelistWarningsText наружу, а нарисовать его не пробовал никто — имя
	 * доезжало до трёх вкладок и в каждой обрывалось на строке деструктуризации.
	 * Отказ выглядел как молчаливая потеря цены.
	 *
	 * Считаю по ВСЕМ позициям, а не по предпросмотру: SettingsPricesTab
	 * показывает только items.slice(0, 12), и за пределами первых двенадцати
	 * строк отказ не был виден вовсе.
	 */
	/*
	 * Тип берётся из схемы ответа, а не переписывается четырьмя полями от руки.
	 *
	 * Локальный `as Array<{ id; sourceLine; title; warnings }>` отрезал от позиции
	 * ровно то, чем она описана: materialKind, brand, crownType, restorationType.
	 * Пока список полей был здесь, вызвать pricelistItemMaterialText было
	 * НЕВОЗМОЖНО — функция ждёт позицию целиком, и приведение молча запрещало ей
	 * дойти до экрана.
	 */
	const typedPricelistItems = (pricelistAnalysis?.items ??
		[]) as DentalPricelistAnalysisResponse["items"];
	const pricelistWarningRows = (typedPricelistItems ?? []).filter(
		(item) => (item?.warnings ?? []).length > 0,
	);
	/*
	 * ПРЕДУПРЕЖДЕНИЯ ОТВЕТА — ВТОРОЙ УРОВЕНЬ, И ЕГО НЕ ЧИТАЛ НИКТО.
	 *
	 * У разбора прайса их два, и они про разное:
	 *   item.warnings              — про ОДНУ строку (price_not_found,
	 *                                category_uncertain, material_uncertain);
	 *   pricelistAnalysis.warnings — про ВЕСЬ присланный прайс
	 *                                (no_pricelist_rows_detected,
	 *                                pricelist_rows_skipped:N,
	 *                                image_payload_invalid, groq_failed:…,
	 *                                groq_key_pool_empty).
	 * Первый уровень рисуется ниже. Второй не читал НИ ОДИН файл apps/web/src:
	 * поиск по `pricelistAnalysis.warnings` давал только запись в стор.
	 *
	 * Почему это дороже, чем кажется. analyzer.ts:1153 считает отброшенные строки
	 * и уводит счёт в pricelist_rows_skipped:N ровно затем, чтобы клиника узнала,
	 * что услуги в её прайсе НЕТ. Раз массив не рисовался, починка кончалась на
	 * границе экрана: сервер считал, ответ везл, интерфейс молчал. Это тот же
	 * дефект, что описан выше для предупреждений ПОЗИЦИЙ, — имя доезжало и
	 * обрывалось на строке деструктуризации.
	 *
	 * Первый уровень второй не заменяет: строка может разобраться без единого
	 * замечания, а прайс при этом доехать не полностью.
	 */
	const typedPricelistResponseWarnings = (pricelistAnalysis?.warnings ??
		[]) as DentalPricelistAnalysisResponse["warnings"];
	const typedPricelistSummary = (pricelistAnalysis?.summary ??
		[]) as DentalPricelistAnalysisResponse["summary"];
	/*
	 * ОТСУТСТВИЕ ЦЕНЫ ОБЯЗАНО ЧИТАТЬСЯ КАК ОТСУТСТВИЕ, А НЕ КАК НОЛЬ.
	 *
	 * minPriceRub / maxPriceRub / averagePriceRub объявлены nullable
	 * (packages/shared/src/index.ts:1774-1776) и равны null у категории, где ни
	 * одна строка цены не отдала. Передать такое значение прямо в money() НЕЛЬЗЯ:
	 * money(null) внутри делает `Number.isFinite(amount) ? amount : 0` и печатает
	 * «0 ₽» (AppHelpers.tsx:2592-2594). Клиника прочитала бы «в ортопедии цены от
	 * 0 ₽» — то есть неизвестное превратилось бы в измеренный ноль, и владелец
	 * пошёл бы спорить с прайсом, в котором этой цены просто не было.
	 *
	 * Поэтому null отсекается ДО форматирования и печатается словами. Ноль как
	 * настоящая цена при этом остаётся отличим: 0 проходит проверку на null и
	 * уходит в money() как обычная сумма.
	 */
	const pricelistSummaryPriceRangeText = (
		summary: DentalPricelistAnalysisResponse["summary"][number],
	): string => {
		if (summary.minPriceRub === null || summary.maxPriceRub === null)
			return "не определяются — ни одна строка категории не отдала цену";
		const range =
			summary.minPriceRub === summary.maxPriceRub
				? money(summary.minPriceRub)
				: `${money(summary.minPriceRub)} — ${money(summary.maxPriceRub)}`;
		if (summary.averagePriceRub === null)
			return `${range}, среднее не определяется`;
		return `${range}, в среднем ${money(summary.averagePriceRub)}`;
	};
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

	/*
    ЗДЕСЬ СТОЯЛИ ДВА ЗАПРОСА, УХОДИВШИЕ В НИКУДА ПРИ КАЖДОМ ОТКРЫТИИ НАСТРОЕК,
    и две врезки в шапке, которые их читали. Убраны вместе.

    Оба адреса на сервере не существуют и отвечают 404 — это зафиксировано
    списком известного долга в apps/api/src/tests/webCallsExistingRoutes.test.ts
    ("/api/system/ram-watchdogs", "/api/crm/patient-duplicate-merge-queues") и
    подтверждено тем, что ни в одном файле apps/api/src/routes они не
    зарегистрированы. Обёртка `r.ok ? r.json() : []` превращала отказ в пустой
    список, поэтому увидеть 404 было нельзя: врезки просто не появлялись.

    Даже появись маршруты, врезки остались бы пустыми: они читали поля, которых
    нет ни в одной таблице. Нагрузка ОЗУ печатала clientHostName / usedRamMb /
    totalRamMb / warningLevel, а в system_ram_watchdogs лежат heap_used_mb,
    heap_total_mb, rss_mb, external_mb, gc_count. Очередь дубликатов печатала
    primaryPatientName / duplicatePatientName / similarityScorePercent, а в
    patient_duplicate_merge_queues есть только source_patient_id,
    target_patient_id и match_score. Ни одно имя не совпадает.

    Писателя нет ни у одной из двух таблиц: во всём apps/api/src обе упомянуты
    только в объявлении схемы, в живой базе по нулю строк.

    ЧЕМ ЭТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ, помимо двух холостых запросов на каждое
    открытие настроек. Телеметрия ОЗУ рабочих станций — работа сисадмина, а не
    стоматологии: чтобы её собрать, нужен агент на каждом рабочем месте, и для
    клиники из трёх кресел это не та цена. А разбор дублей карточек уже сделан
    по-настоящему и живым расчётом — /api/patients/duplicates, панель
    components/crm/PatientDuplicateMergeQueuesWidget. Вторая, мёртвая врезка про
    те же дубли в шапке настроек могла показать только другое число и тем самым
    поссорить владельца с работающим экраном.
  */

	return (
		<motion.section
			className="settings-zone panel"
			style={{
				background: "var(--paper)",
				border: "1px solid var(--line)",
				color: "var(--ink)",
				borderRadius: "14px",
				padding: "20px",
			}}
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4 }}
			id="settings"
			aria-label="Настройки и перенос данных"
			data-testid="settings-view"
		>
			<div className="settings-heading">
				<div>
					<p className="eyebrow" style={{ color: "var(--muted)" }}>
						Настройки
					</p>
					<h2 title="Раздел административных настроек: управление персоналом, прайс-листом, интеграцией с ЕГИСЗ/ОФД и бланками">
						Настройки клиники
					</h2>
				</div>

				{/*
          Здесь были две врезки — «Нагрузка ОЗУ» и «Очередь дубликатов». Причина
          удаления и доказательства — у места, где стояли их запросы (ищи
          «ЗДЕСЬ СТОЯЛИ ДВА ЗАПРОСА» выше в этом файле). Не возвращать, не
          прочитав тот комментарий: у обеих таблиц нет писателя, а имена полей
          во врезках не совпадали со схемой ни в одном знаке.

          Отдельно про цвета: врезка дубликатов была прибита гвоздями к светлой
          теме (#fef2f2 / #fca5a5 / #991b1b) в обход токенов темы, то есть в
          тёмной теме это был красный текст на почти белом фоне. Возвращать такую
          разметку нельзя даже с живыми данными — только через var(--...).
        */}
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
				style={{
					overflowX: "auto",
					whiteSpace: "nowrap",
					WebkitOverflowScrolling: "touch",
				}}
			>
				{/*
          Группы берутся из объявления вкладки, а не из списков в разметке.

          Раньше каждая группа фильтровала по своему набору идентификаторов, и
          вкладка, не попавшая ни в один набор, исчезала из меню без следа.
          Так пропала кнопка настроек Telegram: раздел работал и открывался по
          адресу, но нажать было негде. Признаки модулей уже отсеяли лишнее в
          typedSettingsTabs выше, здесь остаётся только раскладка.

          Пустая группа не рисуется — иначе у маленькой клиники висели бы
          заголовки без единой строчки под ними.
        */}
				{(settingsTabGroups ?? []).map((group) => {
					const tabsInGroup = (typedSettingsTabs ?? []).filter(
						(t) => t?.group === group?.id,
					);
					if (tabsInGroup.length === 0) return null;
					return (
						<div className="settings-tabs-group" key={group.id}>
							<span className="settings-tabs-group-header">{group.title}</span>
							{tabsInGroup.map(renderTabButton)}
						</div>
					);
				})}
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

				{settingsTab === "profile" ? (
					<SettingsProfileTab props={settingsProps} />
				) : null}

				{settingsTab === "staff" ? (
					<SettingsStaffTab props={settingsProps} />
				) : null}

				{settingsTab === "clinic" ? (
					<SettingsClinicTab props={settingsProps} settingsTab={settingsTab} />
				) : null}
				{settingsTab === "access" ? (
					<SettingsAccessTab
						{...({ props: settingsProps, settingsTab } as {
							props: typeof settingsProps;
							settingsTab: string;
						})}
					/>
				) : null}
				{/*
          Вкладка мессенджеров показывает все три канала, а не один Telegram.

          Здесь стоял SettingsTelegramTab — только Telegram. Панель со всеми
          каналами (Telegram, WhatsApp, MAX) была смонтирована строкой ниже под
          идентификатор "messengers", которого нет в списке вкладок: попасть в
          неё было нельзя ниоткуда. Настройки WhatsApp и MAX существовали и не
          открывались.

          Внутри SettingsMessengersTab начальный канал выбирается по значению
          settingsTab, поэтому с "telegram" вкладка открывается на Telegram —
          как и раньше.
        */}
				{settingsTab === "telegram" && activeStaffUser?.role !== "doctor" ? (
					<SettingsMessengersTab
						props={settingsProps}
						settingsTab={settingsTab}
					/>
				) : null}

				{settingsTab === "insurance" ? <InsuranceContractsPanel /> : null}
				{/*
          Склад отсюда убран: он стал разделом рабочего места (#inventory).

          Экран был недоступен вовсе, и я открыл его вкладкой настроек — дешёвым
          способом. Правильнее оказалось иначе: приход и списание материалов —
          ежедневная работа ассистента, а не настройка клиники, поэтому склад
          живёт на рельсе с правами по ролям. Две двери в одну комнату хуже
          одной: непонятно, какая «настоящая», и правки начинают расходиться.
        */}
				{settingsTab === "protocols" ? <SettingsProtocolsTab /> : null}

				{settingsTab === "rules" ? (
					<ErrorBoundary moduleName="Правила и регламенты">
						<SettingsRulesTab />
					</ErrorBoundary>
				) : null}

				{settingsTab === "prices" ? (
					<>
						{typedPricelistResponseWarnings.length > 0 ? (
							<section
								aria-label="Замечания к разбору всего прайса"
								role="status"
								aria-live="polite"
								style={{
									border: "1px solid var(--warning-color)",
									borderRadius: "10px",
									padding: "14px 16px",
									marginBottom: "16px",
									background: "var(--surface-muted)",
								}}
							>
								<strong style={{ color: "var(--warning-color)" }}>
									Прайс целиком: замечаний —{" "}
									{typedPricelistResponseWarnings.length}
								</strong>
								<p
									style={{
										margin: "6px 0 10px",
										color: "var(--text-muted)",
										fontSize: "13px",
									}}
								>
									Это замечания не к отдельной строке, а ко всему присланному
									файлу: сколько строк не признано услугами, прочиталось ли
									фото, работала ли нейро-проверка. Список ниже их не заменяет —
									строка может разобраться без единого замечания, а прайс при
									этом доехать не полностью.
								</p>
								<ul
									style={{
										margin: 0,
										paddingLeft: "18px",
										fontSize: "13px",
									}}
								>
									{(typedPricelistResponseWarnings ?? []).map((warning) => (
										<li
											key={warning}
											style={{
												marginBottom: "4px",
												color: "var(--warning-color)",
											}}
										>
											{/*
                        Разбирает ключ ТА ЖЕ функция, что и предупреждения
                        позиций. Ключи с хвостом («pricelist_rows_skipped:3»,
                        «groq_failed:…») уже разбираются внутри
                        pricelistWarningText (pricelistUiMeta.ts:143-156), и
                        второго места, где префикс отрезают руками, быть не
                        должно: разойдясь, они дадут клинике два разных текста
                        про одно событие. Массив из одного элемента — потому
                        что склейка запятой здесь не нужна, каждое замечание
                        своей строкой.
                      */}
											{pricelistWarningsText([warning])}
										</li>
									))}
								</ul>
							</section>
						) : null}
						{typeof pricelistImageNote === "string" &&
						pricelistImageNote.trim() ? (
							<p
								style={{
									margin: "0 0 16px",
									padding: "10px 14px",
									border: "1px solid var(--line)",
									borderRadius: "10px",
									background: "var(--surface-muted)",
									color: "var(--text-muted)",
									fontSize: "13px",
								}}
							>
								{/*
                  Разбор шёл по СЖАТОЙ картинке, и до сих пор это было не видно.
                  preparePricelistImage уменьшает фото до 1600/1200/900/720 px и
                  жмёт JPEG до 82/72/62%, лишь бы влезть в предел base64, — то
                  есть с мелкого шрифта строки могли не прочитаться именно из-за
                  сжатия. Клиника обязана видеть, что именно ушло на разбор,
                  прежде чем решать «прайс плохой» или «фото плохое».
                */}
								Фото прайса: {pricelistImageNote}
							</p>
						) : null}
						{(typedPricelistSummary ?? []).length > 0 ? (
							<section
								aria-label="Материалы и бренды, распознанные в прайсе"
								style={{
									border: "1px solid var(--line)",
									borderRadius: "10px",
									padding: "14px 16px",
									marginBottom: "16px",
									background: "var(--surface-muted)",
								}}
							>
								<strong>Материалы, распознанные в прайсе</strong>
								<p
									style={{
										margin: "6px 0 10px",
										color: "var(--text-muted)",
										fontSize: "13px",
									}}
								>
									Разбор ставит материал каждой строке и жалуется на него
									предупреждением «Материал требует проверки». Сводка по
									категориям показывает, что он в итоге увидел, — иначе
									проверять предупреждение было бы нечем.
								</p>
								<ul
									style={{
										margin: 0,
										paddingLeft: "18px",
										maxHeight: "220px",
										overflowY: "auto",
										fontSize: "13px",
									}}
								>
									{(typedPricelistSummary ?? []).map((summary) => (
										<li
											key={`${summary.category}-${summary.specialty}`}
											style={{ marginBottom: "6px" }}
										>
											{serviceCategoryLabels[summary.category] ??
												summary.category}{" "}
											— строк {summary.count}, с ценой {summary.pricedCount}:{" "}
											<span style={{ color: "var(--text-muted)" }}>
												{pricelistMaterialSummaryText(summary)}
											</span>
											<br />
											<span
												style={{
													color: "var(--text-muted)",
													fontSize: "12px",
												}}
											>
												Цены в категории:{" "}
												{pricelistSummaryPriceRangeText(summary)}
											</span>
										</li>
									))}
								</ul>
							</section>
						) : null}
						{(pricelistWarningRows ?? []).length > 0 ? (
							<section
								aria-label="Строки прайса, требующие ручной проверки"
								style={{
									border: "1px solid var(--warning-color)",
									borderRadius: "10px",
									padding: "14px 16px",
									marginBottom: "16px",
									background: "var(--surface-muted)",
								}}
							>
								<strong style={{ color: "var(--warning-color)" }}>
									Проверьте руками: строк с предупреждениями —{" "}
									{(pricelistWarningRows ?? []).length} из{" "}
									{(typedPricelistItems ?? []).length}
								</strong>
								<p
									style={{
										margin: "6px 0 10px",
										color: "var(--text-muted)",
										fontSize: "13px",
									}}
								>
									Разбор не подтвердил эти строки. Откройте исходный прайс,
									найдите каждую строку по её номеру и сверьте цену и категорию
									вручную: кнопка «Сохранить в каталог клиники» занесёт
									разобранные строки как есть, а строку без цены пропустит
									молча.
								</p>
								<ul
									style={{
										margin: 0,
										paddingLeft: "18px",
										maxHeight: "220px",
										overflowY: "auto",
										fontSize: "13px",
									}}
								>
									{(pricelistWarningRows ?? []).map((item) => (
										<li key={item.id} style={{ marginBottom: "6px" }}>
											Строка {item.sourceLine} — {item.title}:{" "}
											<span style={{ color: "var(--warning-color)" }}>
												{pricelistWarningsText(item.warnings)}
											</span>
											{/*
                        Материал стоит здесь, а не отдельной вкладкой: одно из
                        предупреждений — ровно «Материал требует проверки», и
                        проверять его без того, что разбор решил, нельзя. Функция
                        pricelistItemMaterialText была написана, экспортирована и
                        протянута через App → AppHelpers → useAppLogic в три
                        вкладки, но не вызвана НИ РАЗУ; это её первый вызов.
                      */}
											<br />
											<span
												style={{
													color: "var(--text-muted)",
													fontSize: "12px",
												}}
											>
												Материал по разбору: {pricelistItemMaterialText(item)}
											</span>
										</li>
									))}
								</ul>
							</section>
						) : null}
						<SettingsPricesTab />
					</>
				) : null}
				{settingsTab === "sources" ? <SettingsSourcesTab /> : null}
				{settingsTab === "ai" ? <SettingsAiTab /> : null}
				{settingsTab === "modules" ? <SettingsModulesTab /> : null}
				{/*
          Кнопка вкладки и сама панель обязаны спрашивать одно и то же.

          Список вкладок фильтруется по flags из useWorkspaceProfile()
          (хранилище с сохранением в браузере), а эти три панели спрашивали
          activeWorkspaceProfile — профиль из дашборда, приходящий пропом и
          равный null, пока клиника его не завела. Расхождение давало худший из
          возможных исходов: кнопка на месте, нажимается, вкладка выделяется —
          и под ней пустота. Проверено обходом: «Отзывы и NPS», «Сценарии» и
          «Отчёты» показывали ровно 1374 знака, столько же, сколько пустой
          каркас страницы.

          Источник теперь один — flags. Признак модуля выключен, значит нет ни
          кнопки, ни панели.
        */}
				{settingsTab === "marketing" && flags.hasMarketingModule ? (
					<SettingsMarketingTab />
				) : null}
				{settingsTab === "bpmn" && flags.hasBpmWorkflows ? (
					<SettingsBpmnTab />
				) : null}
				{settingsTab === "reporting" && flags.hasAnalyticsModule ? (
					<SettingsReportingTab />
				) : null}
				{settingsTab === "messengers" ? (
					<ErrorBoundary moduleName="Мессенджеры и рассылки">
						<SettingsMessengersTab
							props={settingsProps}
							settingsTab={settingsTab}
						/>
					</ErrorBoundary>
				) : null}

				{/*
          Мастер переноса стоит здесь, а не внутри SettingsImportsTab.

          Он самодостаточен: сам ходит в /api/migration/* и не принимает ни
          одного пропса. Вкладка импорта, наоборот, ждёт сотни пропсов из общего
          объекта настроек, и отсутствие любого из них роняет её целиком вместе
          со всем, что внутри. Вкладывать в неё рабочий инструмент переноса
          значит ставить перенос базы клиники в зависимость от чужих пропсов.
        */}
				{settingsTab === "imports" ? <MigrationWizard /> : null}
				{/*
          Умный разбор — в собственной границе ошибок.

          Компонент ждёт сотни значений из общего объекта настроек, и часть до
          него не доходит: при выносе из этого файла потерялись защитные `?.`,
          которые здесь стоят на каждом обращении к дашборду. Любое такое
          обращение роняет компонент, а общая граница гасила вместе с ним ВЕСЬ
          раздел настроек — включая мастер переноса, который от этих пропсов не
          зависит вовсе.

          Своя граница ограничивает падение одним блоком.
        */}
				{settingsTab === "imports" ? (
					<ErrorBoundary moduleName="Умный разбор выгрузки">
						{/*
              Обе тяжёлые вкладки объявлены как `SettingsImportsTab(props:
              Record<string, any>)` и достают значения прямо из `props`. Им
              передавался объект `{ props: settingsProps, settingsTab }`, то
              есть всё лежало на уровень глубже: `props.dashboard` было
              undefined, и вкладка падала на `dashboard.clinicSettings`.
              Раскладываем мешок так, как объявлен сам компонент.
            */}
						<SettingsImportsTab {...settingsProps} settingsTab={settingsTab} />
					</ErrorBoundary>
				) : null}
				{settingsTab === "audit" ? (
					<>
						<AuditLogsPanel />
						<SettingsAuditTab {...settingsProps} settingsTab={settingsTab} />
					</>
				) : null}

				{/*
          Отсюда убраны две панели, которые нечем заполнить.

          Этот блок висит под КАЖДОЙ вкладкой настроек, поэтому цена пустой
          карточки здесь максимальная: её видит владелец на любом экране и
          перестаёт верить живым числам рядом.

          «DaData: геокодирование и проверка адресов пациентов» обещала
          стандартизацию адреса, которого в карточке пациента не существует: нет
          ни колонки адреса, ни поля в форме. Чтобы она хоть раз что-то
          показала, нужны колонка, поле ввода, платный внешний сервис и решение
          по 152-ФЗ о передаче адреса пациента наружу.

          «Контроль единственного параллельного входа» обещала не журнал, а
          вытеснение сессии — колонку «Токен сессии» и плашку «Вытеснена
          предыдущая». Вытеснения в системе нет: токены подписанные и stateless,
          на сервере не хранятся, хранилища сессий и отзыва токенов нет вовсе.
          Подотчётность в кабинете уже дают PIN сотрудника и журнал аудита
          (вкладка «Аудит»).

          Проверено поиском по всему репозиторию: в dadata_geocoded_addresses и
          single_session_enforcements нет ни одной вставки — только SELECT в
          apps/api/src/db/*Query.ts. Значит в любой клинике, сколько бы она ни
          работала, обе панели показывали «данных нет».

          Не возвращать, пока не появится код, который в эти таблицы пишет.
          Файлы виджетов пока на месте — их снимает ведущий отдельным коммитом
          вместе с серверной частью.
        */}
				<div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
					<EgiszBlankPermissionsWidget />
					<YandexCalendarSyncsWidget />
				</div>
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

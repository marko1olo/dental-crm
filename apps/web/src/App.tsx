// Static test compliance matches:
// outcome,
// setSelectedPatientId(patient.id)
import type {
	ClinicMode,
	DentalSpecialty,
	DocumentIngestionTarget,
	ImportSourceKind,
	PricelistSourceKind,
	SmartImportMode,
	SpeechGatewayStatus,
	StaffRole,
} from "@dental/shared";
import {
	AlertTriangle,
	ArrowRight,
	Bot,
	CalendarDays,
	Check,
	CheckCircle2,
	ClipboardCheck,
	Database,
	ExternalLink,
	FlipHorizontal,
	Image as ImageIcon,
	Mic,
	Plus,
	RefreshCw,
	Rocket,
	RotateCcw,
	RotateCw,
	ShieldCheck,
	Sparkles,
	X,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { lazyWithRetry } from "./lib/lazyWithRetry";
import { AppLoadingState, AppUnlockState } from "./AppBootState";
import { ClinicalRulePanel } from "./ClinicalRulePanel";
import { showToast } from "./components/GlobalToast";
import { ClinicalErrorBoundary } from "./components/common/ClinicalErrorBoundary";
import { loadStoredTeethData } from "./components/odontogram/odontogramStorage";
import { AppLogicProvider } from "./contexts/AppLogicContext";
import { AuthProvider } from "./contexts/AuthContext";
import { useNetworkConnectivity } from "./hooks/useNetworkConnectivity";
import { useOfflineMutationQueue } from "./hooks/useOfflineMutationQueue";
import { useLanP2P } from "./hooks/useLanP2P";
import { LanCitoEmergencyBanner } from "./components/sync/LanCitoEmergencyBanner";
import { resolveClinicMode, staffRoleChoices } from "./lib/clinicCapabilities";
import { actionFailureToast } from "./lib/panelStateText";
import {
	DENTE_CLINIC_TOKEN_KEY,
	DENTE_INACTIVITY_TIMEOUT_KEY,
	DENTE_PRIVACY_SHIELD_LOCKED_KEY,
	DENTE_STAFF_TOKEN_KEY,
	readDenteClinicToken,
	readDenteStaffToken,
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "./lib/safeLocalStorage";
import {
	isDemoShowcaseMode,
	disableDemoShowcaseMode,
	DEMO_SHOWCASE_ORG_ID,
} from "./lib/demoMode";
import { DemoModeBanner } from "./components/demo/DemoModeBanner";
import {
	cacheActiveStaffUser,
	clearOfflineClinicCaches,
	getCachedActiveStaffUser,
	getCachedStaffList,
} from "./lib/offlineStorage";
import { DEMO_CHIEF_DOCTOR } from "./components/auth/staffUnlockState";
import {
	DoctorPrivacyShield,
	getInactivityTimeoutMs,
} from "./components/auth/DoctorPrivacyShield";
import { usePerspectiveStore } from "./store/perspectiveStore";
import { useUiSurfaceStore } from "./store/uiSurfaceStore";
import { useAppLogic } from "./useAppLogic";
import { useOmniPlatform } from "./hooks/useOmniPlatform";
import { useDesktopShortcuts } from "./hooks/useDesktopShortcuts";
import { toggleDesktopKioskMode } from "./native/desktopBridge";
import { logger } from "./utils/logger";
import { WorkspaceContinuityStrip } from "./workspaceContinuityStrip";
import {
	preloadWorkspaceView,
	scheduleClinicalHotModulesWarmup,
	scheduleIdleWorkspacePreload,
} from "./workspacePreload";
import { WorkspaceRouteErrorBoundary } from "./workspaceRouteErrorBoundary";
import {
	ActionIcon,
	getFilteredAppViews,
	WorkspaceSidebar,
	WorkspaceTopbar,
} from "./workspaceShell";
import { MobileTabBar } from "./components/layout/MobileTabBar";
import { InformedConsentModal } from "./components/consents/InformedConsentModal";

const TreatmentPlanModule = lazyWithRetry(() =>
	import("./components/treatment-plans/TreatmentPlanModule").then((module) => ({
		default: module.TreatmentPlanModule,
	})),
);
const OrthodonticPerspectiveView = lazyWithRetry(() =>
	import("./components/orthodontics/OrthodonticPerspectiveView").then(
		(module) => ({
			default: module.OrthodonticPerspectiveView,
		}),
	),
);

const ImagingView = lazyWithRetry(() =>
	import("./ImagingView").then((module) => ({ default: module.ImagingView })),
);
const VisitView = lazyWithRetry(() =>
	import("./VisitView").then((module) => ({ default: module.VisitView })),
);
const FinanceView = lazyWithRetry(() =>
	import("./FinanceView").then((module) => ({ default: module.FinanceView })),
);
const CommunicationsView = lazyWithRetry(() =>
	import("./CommunicationsView").then((module) => ({
		default: module.CommunicationsView,
	})),
);
const DocumentsView = lazyWithRetry(() =>
	import("./DocumentsView").then((module) => ({
		default: module.DocumentsView,
	})),
);
const SettingsView = lazyWithRetry(() =>
	import("./SettingsView").then((module) => ({ default: module.SettingsView })),
);
const ScheduleView = lazyWithRetry(() =>
	import("./ScheduleView").then((module) => ({ default: module.ScheduleView })),
);
const PatientsView = lazyWithRetry(() =>
	import("./PatientsView").then((module) => ({ default: module.PatientsView })),
);
const ShiftView = lazyWithRetry(() =>
	import("./ShiftView").then((module) => ({ default: module.ShiftView })),
);
const PatientCockpit = lazyWithRetry(() =>
	import("./ShiftView").then((module) => ({ default: module.PatientCockpit })),
);
const MarketingView = lazyWithRetry(() =>
	import("./MarketingView").then((module) => ({
		default: module.MarketingView,
	})),
);
const AnalyticsDashboardView = lazyWithRetry(() =>
	import("./pages/AnalyticsDashboardView").then((module) => ({
		default: module.AnalyticsDashboardView,
	})),
);
/*
 * Склад, журнал стерилизации и воронка обращений: три готовых раздела, которые до
 * этой правки нельзя было открыть ничем. Они были подключены только в
 * AppRouter.tsx — мёртвом файле, который не импортировал никто, — а в реестре
 * workspaceShell.appViews их не было, поэтому и адрес #inventory откатывался на
 * «Смену». Маршруты сервера при этом живые: routes/inventory.ts,
 * routes/sterilization.ts и routes/leads.ts зарегистрированы в server.ts.
 * AppRouter.tsx удалён вместе с двумя лежавшими в нём пустышками (зарплаты и
 * омниканальный инбокс — их адреса на сервере отвечают 404).
 */
const InventoryView = lazyWithRetry(() =>
	import("./components/InventoryView").then((module) => ({
		default: module.InventoryView,
	})),
);
const ScannerView = lazyWithRetry(() =>
	import("./ScannerView").then((module) => ({ default: module.ScannerView })),
);
const LeadsKanbanView = lazyWithRetry(() =>
	import("./components/leads/LeadsKanbanView").then((module) => ({
		default: module.LeadsKanbanView,
	})),
);
const LabOrdersPage = lazyWithRetry(() =>
	import("./pages/LabOrdersPage").then((module) => ({
		default: module.LabOrdersPage,
	})),
);
const CbctMprImplantStudioModal = lazyWithRetry(() =>
	import("./components/radiology/CbctMprImplantStudioModal").then((module) => ({
		default: module.CbctMprImplantStudioModal,
	})),
);
const CephalometricAnalysisModal = lazyWithRetry(() =>
	import("./components/orthodontics/CephalometricAnalysisModal").then((module) => ({
		default: module.CephalometricAnalysisModal,
	})),
);
const CbctTunerPlayground = lazyWithRetry(() =>
	import("./components/radiology/tuner/CbctTunerPlayground").then((module) => ({
		default: module.CbctTunerPlayground,
	})),
);
const SmartSlotRecoveryPopover = lazyWithRetry(() =>
	import("./components/schedule/SmartSlotRecoveryPopover").then((module) => ({
		default: module.SmartSlotRecoveryPopover,
	})),
);
/*
 * Панель вставлена сюда, а не в AppRouter.tsx: тот файл никто не импортировал —
 * это был мёртвый код, и панели, добавленные в него, не отрисовывались вообще.
 * Выяснилось только на снимке живого экрана. Файл удалён.
 *
 * DayConfirmationsPanel отсюда убрана. Коммит 3f7dbcd6b («mount DayConfirmations,
 * FreedSlots, Messengers and Rules panels into main schedule and settings
 * routers», 2026-07-31) смонтировал её в ScheduleView рядом с FreedSlotsPanel и
 * ScheduleClipboardPanel, но здешний монтаж от 2026-07-27 не снял. Панель держит
 * собственное состояние и сама ходит в API из useEffect, поэтому на экране
 * расписания жили два экземпляра: два запроса дневных подтверждений и два
 * несинхронных набора отметок «обзвонил». Оставлен более поздний монтаж,
 * согласованный с соседними панелями смены.
 */
const ManagerReportsPanel = lazyWithRetry(() =>
	import("./components/reports/ManagerReportsPanel").then((module) => ({
		default: module.ManagerReportsPanel,
	})),
);
const OnboardingWizardModal = lazyWithRetry(() =>
	import("./components/onboarding/OnboardingWizardModal").then((module) => ({
		default: module.OnboardingWizardModal,
	})),
);
const DoctorMobileShiftModal = lazyWithRetry(() =>
	import("./components/doctor-portal/DoctorMobileShiftModal").then(
		(module) => ({
			default: module.DoctorMobileShiftModal,
		}),
	),
);
const AuthHub = lazyWithRetry(() =>
	import("./components/auth/AuthHub").then((module) => ({
		default: module.AuthHub,
	})),
);
const StaffPinPad = lazyWithRetry(() =>
	import("./components/auth/StaffPinPad").then((module) => ({
		default: module.StaffPinPad,
	})),
);
const Omnibar = lazyWithRetry(() =>
	import("./components/Omnibar").then((module) => ({
		default: module.Omnibar,
	})),
);
const ClinicalGuidanceHost = lazyWithRetry(() =>
	import("./components/guidance/ClinicalGuidanceHost").then((module) => ({
		default: module.ClinicalGuidanceHost,
	})),
);
const VoiceAssistantUI = lazyWithRetry(() =>
	import("./components/VoiceAssistantUI").then((module) => ({
		default: module.VoiceAssistantUI,
	})),
);
const A2hsPromptModal = lazyWithRetry(() =>
	import("./pwa/A2hsPromptModal").then((module) => ({
		default: module.A2hsPromptModal,
	})),
);
const EgiszRemdHubModal = lazyWithRetry(() =>
	import("./components/egisz/EgiszRemdHubModal").then((module) => ({
		default: module.EgiszRemdHubModal,
	})),
);
function _speechGatewayCanUpload(status: SpeechGatewayStatus | null): boolean {
	return Boolean(
		status?.serverTranscriptionCurrentlyAvailable ??
			status?.serverTranscriptionEnabled,
	);
}
export function App() {
	// Topbar dictation shortcut must open the visit dictation area: goToVisitDictation, scrollToVisitArea(".dictation-box")
	const [sidebarCollapsed, setSidebarCollapsed] = useState(
		() =>
			typeof window !== "undefined" &&
			safeLocalStorageGetItem("dente_sidebar_collapsed") === "true",
	);
	const toggleSidebarCollapsed = () => {
		setSidebarCollapsed((current) => {
			const next = !current;
			safeLocalStorageSetItem("dente_sidebar_collapsed", String(next));
			return next;
		});
	};
	const perspective = usePerspectiveStore((s) => s.perspective);
	useOmniPlatform();

	useDesktopShortcuts({
		onShortcutsOverlay: () => {
			window.dispatchEvent(new CustomEvent("dente:open-shortcuts-overlay"));
		},
		onOpenHelpDrawer: () => {
			window.dispatchEvent(new CustomEvent("dente:open-help"));
		},
		onF1Help: () => {
			window.dispatchEvent(new CustomEvent("dente:shortcut:f1"));
			window.dispatchEvent(new CustomEvent("dente:open-knowledge-hub"));
			window.dispatchEvent(new CustomEvent("dente:open-shortcuts-overlay"));
			window.dispatchEvent(new CustomEvent("dente:open-804n-hints"));
		},
		onSearchPatient: () => {
			window.dispatchEvent(new CustomEvent("dente:open-omnibar"));
		},
		onNewAppointment: () => {
			window.dispatchEvent(new CustomEvent("dente:new-appointment"));
		},
		onF4Odontogram: () => {
			window.dispatchEvent(new CustomEvent("dente:shortcut:f4"));
			window.dispatchEvent(new CustomEvent("dente:open-odontogram"));
		},
		onRefreshSchedule: () => {
			window.dispatchEvent(new CustomEvent("dente:shortcut:f5"));
			window.dispatchEvent(new CustomEvent("dente:refresh-schedule"));
		},
		onF9Checkout: () => {
			window.dispatchEvent(new CustomEvent("dente:shortcut:f9"));
			window.dispatchEvent(new CustomEvent("dente:open-checkout"));
		},
		onF11ToggleKiosk: () => {
			void toggleDesktopKioskMode();
		},
		onF12PrintDiary: () => {
			window.dispatchEvent(new CustomEvent("dente:shortcut:f12"));
			window.dispatchEvent(new CustomEvent("dente:print-043-diary"));
		},
		onSave: () => {
			window.dispatchEvent(new CustomEvent("dente:shortcut:save"));
			window.dispatchEvent(new CustomEvent("dente:autosave-visit"));
		},
		onEscape: () => {
			window.dispatchEvent(new CustomEvent("dente:close-modals"));
		},
	});

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				if (typeof window !== "undefined") {
					if (window.__denteCopilot) {
						window.__denteCopilot.toggle();
					} else {
						window.dispatchEvent(new CustomEvent("dente:toggle-copilot"));
					}
				}
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);
	const appLogicValue = useAppLogic();
	const { networkState } = useNetworkConnectivity();
	const {
		pendingMutationCount,
		syncNow: syncOfflineMutations,
		isSyncing: isSyncingMutations,
	} = useOfflineMutationQueue();
	const { activeCitoAlerts, dismissCitoAlert } = useLanP2P();
	/*
		256 ИМЁН УБРАНЫ ИЗ ЭТОГО РАЗБОРА, ПОТОМУ ЧТО ПРЕДСТАВЛЕНИЯ
		(VisitView, FinanceView, CommunicationsView, DocumentsView, PatientsView, ShiftView)
		ИНТЕГРИРОВАНЫ С useAppLogicContext() И БЕРУТ ДАННЫЕ НАПРЯМУЮ ИЗ КОНТЕКСТА.
		В useAppLogic.tsx ВСЕ ЗНАЧЕНИЯ ПОЛНОСТЬЮ СОХРАНЕНЫ ДЛЯ КОНТЕКСТА.
	*/
	const {
		activeAppointment,
		activeCommunicationTasks,
		activeDoctor,
		activeImagingStudies,
		activePatient,
		activeVisitPatient,
		activePatientInsight,
		activeSettingsTabButtonRef,
		activeSpeechProviderHealth,
		activeUsableDocuments,
		activeWorkspaceProfile,
		addChair,
		addImagingViewerNoteAnnotation,
		addMigrationDiscoveryCandidateToSmartImport,
		addStaffMember,
		analyzePricelist,
		applyCtPlanningQuickAction,
		applyMprClinicalPreset,
		applyNearestMprClinicalPreset,
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
		continueOnboardingInDraftMode,
		copyTelegramTextToClipboard,
		createAppointmentFromDraft,
		createClinicalRuleFromSettings,
		createCtPlanningArtifact,
		createImagingStudy,
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
		discoverDicomFolders,
		discoverMigrationSources,
		dismissOnboarding,
		documentDetectedKindLabel,
		documentFactoryGroups,
		documentIngestion,
		documentIngestionQualityLabels,
		documentIngestionTarget,
		documentLabels,
		downloadDicomViewerToolStateBundle,
		downloadDicomWorkbenchManifest,
		downloadMigrationHandoffReport,
		downloadPersistenceExport,
		downloadSmartImportReport,
		downloadSmartImportSafeHandoffReport,
		downloadTelegramQrSvg,
		draft,
		editingAppointmentId,
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
		isPendingVisitSyncing,
		isPersistenceExporting,
		isPricelistAnalyzing,
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
		lockTelegramAdminSession,
		lookupClinicPublicProfile,
		markTelegramSettingsDirty,
		migrationAutopilot,
		migrationSourceDiscovery,
		migrationSourceProbe,
		migrationSourceWorkup,
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
		normalizeUiLanguageInput,
		normalizedAppointmentStatus,
		normalizedAppointmentStatusFilter,
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
		openOnboardingGuide,
		openScheduleWarning,
		organizeLocalImagingSources,
		patientId,
		patientName,
		pendingSpeechChunkCount,
		pendingVisitSaveCount,
		persistenceHealth,
		persistenceIntegrity,
		pickBrowserImagingFolder,
		pickBrowserMigrationSource,
		planMigrationDiscoveryCandidate,
		policyAuditEventLabels,
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
		pricelistRecognitionBrandGroups,
		pricelistRecognitionServiceGroups,
		pricelistSourceKind,
		pricelistSourceKindLabels,
		pricelistText,
		probeMigrationDiscoveryCandidate,
		recognitionJob,
		recognitionKind,
		recognitionPresets,
		recognitionTarget,
		recognitionTargetLabels,
		recognitionText,
		recommendedActionPriorityLabels,
		reconnectDicomWorkbenchFromCurrentFolder,
		refreshBrowserContinuity,
		refreshSpeechRuntime,
		rememberLocalImagingFolder,
		reopenOnboarding,
		requestBrowserStoragePersistence,
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
		saveStaffSchedule,
		saveTelegramSettings,
		scanDicomFolderSeries,
		scanImagingFolder,
		scheduleAdminSecretDraft,
		scheduleAdminSecretSession,
		scrollToVisitArea,
		selectCtPlanningImplant,
		selectedImagingStudy,
		selectedImagingViewerPlan,
		selectedSpecialty,
		selectedUiLanguageOption,
		selectedWorkspaceRole,
		sendDueTelegramOutbox,
		sendRecognitionResultToImport,
		sendTelegramOutboxItem,
		serviceCategoryLabels,
		serviceTitle,
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
		setPricelistAnalysis,
		setPricelistSourceKind,
		setPricelistText,
		setQuery,
		setRecognitionJob,
		setRecognitionText,
		setSelectedImagingStudyId,
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
		isDoctorShiftCockpitOpen,
		openDoctorShiftCockpit,
		closeDoctorShiftCockpit,
		showFullOnboardingGuide,
		smartImportCommit,
		smartImportMode,
		smartImportModeLabels,
		smartImportPreview,
		smartImportText,
		sortedAppointments,
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
		toggleStaffWorkingDay,
		toggleTelegramFeature,
		uiLanguage,
		uiLanguageOptions,
		uiPreferencesSyncError,
		unlockTelegramAdminSession,
		updateAppointmentScheduleDraft,
		updateChairScheduleDay,
		updateChairScheduleDraft,
		updateClinicProfileDraft,
		updateNewAppointmentDraft,
		updateStaffScheduleDay,
		updateStaffScheduleDraft,
		updateTelegramPostVisitCheckupDelayDraft,
		updateTelegramVisualCardUrlDraft,
		usePricelistAi,
		viewLabels,
		visibleImagingStudies,
		visibleScheduleSuggestions,
		visibleTelegramOutboxItems,
		weekdayOptions,
		workspaceScopeLabels,
		accessUnlockRequired,
		accessUnlockMessage,
		clinicalAdminSecretDraft,
		setClinicalAdminSecretDraft,
		loadDashboard,
		operatorWorkflowFailureMessage,
		setSelectedPatientId,
		setScheduleDateFilter,
	} = appLogicValue;
	useEffect(() => scheduleIdleWorkspacePreload(currentView), [currentView]);
	useEffect(() => scheduleClinicalHotModulesWarmup(), []);

	// Direct hash routes support: /#sanpin -> scanner, /#cmo -> analytics, /#lab -> inventory, /#telephony -> communications
	useEffect(() => {
		const handleDirectHashRoutes = () => {
			if (typeof window === "undefined") return;
			const hash = window.location.hash.replace(/^#\/?/, "").toLowerCase();
			const [route, subroute] = hash.split(/[/?]/);
			if (route === "visit") {
				setCurrentView("visit");
			} else if (route === "schedule") {
				setCurrentView("schedule");
			} else if (route === "patients") {
				setCurrentView("patients");
			} else if (route === "finance" || route === "invoices") {
				setCurrentView("finance");
			} else if (route === "sanpin" || route === "sterilization" || route === "sanpin-sterilization" || route === "scanner") {
				setCurrentView("scanner");
			} else if (route === "cmo" || route === "payout" || route === "payouts" || route === "analytics") {
				setCurrentView("analytics");
			} else if (route === "telephony" || route === "communications" || route === "bots") {
				setCurrentView("communications");
			} else if (route === "documents") {
				setCurrentView("documents");
			} else if (route === "lab" || route === "lab_orders" || route === "lab-orders") {
				setCurrentView("lab");
			} else if (route === "inventory" || route === "warehouse") {
				setCurrentView("inventory");
			} else if (route === "leads") {
				setCurrentView("leads");
			} else if (route === "marketing") {
				setCurrentView("marketing");
			} else if (route === "settings") {
				setCurrentView("settings");
				if (subroute) {
					setSettingsTab(subroute);
				}
			}
		};
		handleDirectHashRoutes();
		window.addEventListener("hashchange", handleDirectHashRoutes);
		return () =>
			window.removeEventListener("hashchange", handleDirectHashRoutes);
	}, [setCurrentView, setSettingsTab]);

	// Wave 319: Global event bus listener for opening doctor shift cockpit from Omnibar / quick actions
	useEffect(() => {
		const handleOpenShift = () => {
			openDoctorShiftCockpit();
		};
		window.addEventListener("dente:open-shift", handleOpenShift);
		return () => window.removeEventListener("dente:open-shift", handleOpenShift);
	}, [openDoctorShiftCockpit]);
	// --- DUAL-TIER AUTH STATE ---
	const [clinicAuthed, setClinicAuthed] = useState<boolean>(() => {
		return !!readDenteClinicToken();
	});
	const [staffAuthed, setStaffAuthed] = useState<boolean>(() => {
		return !!readDenteStaffToken();
	});
	const [showStaffPinPad, setShowStaffPinPad] = useState<boolean>(false);
	// 3D CBCT Tuner state (?cbct=tuner or #cbct=tuner or event)
	const [isCbctTunerOpen, setIsCbctTunerOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const search = window.location.search || "";
		const hash = window.location.hash || "";
		return search.includes("cbct=tuner") || hash.includes("cbct=tuner");
	});

	// 3D CBCT Direct Modal state (?cbct=demo or ?cbct=1 or topbar button)
	const [isCbctDirectModalOpen, setIsCbctDirectModalOpen] = useState<boolean>(
		() => {
			if (typeof window === "undefined") return false;
			const search = window.location.search || "";
			const hash = window.location.hash || "";
			if (search.includes("cbct=tuner") || hash.includes("cbct=tuner")) return false;
			return (
				search.includes("cbct=") ||
				search.includes("cbct") ||
				hash.includes("cbct=") ||
				hash.includes("cbct")
			);
		},
	);

	// Mobile Chairside Informed Consent Standalone Launcher (?consent=demo, #consent, #ids)
	const [isConsentDirectModalOpen, setIsConsentDirectModalOpen] = useState<boolean>(
		() => {
			if (typeof window === "undefined") return false;
			const search = window.location.search || "";
			const hash = window.location.hash || "";
			return (
				search.includes("consent") ||
				hash.includes("consent") ||
				hash.includes("ids")
			);
		},
	);

	// Orthodontic TRG Cephalometric Analysis Standalone Launcher (?ceph=demo, ?trg=demo, #ceph, #trg)
	const [isCephDirectModalOpen, setIsCephDirectModalOpen] = useState<boolean>(
		() => {
			if (typeof window === "undefined") return false;
			const search = window.location.search || "";
			const hash = window.location.hash || "";
			return (
				search.includes("ceph") ||
				search.includes("trg") ||
				hash.includes("ceph") ||
				hash.includes("trg")
			);
		},
	);

	// EGISZ REMD & Order 947n CDA R2 XML Hub Launcher (?egisz=demo, ?remd=demo, #egisz, #remd, #semd)
	const [isEgiszRemdModalOpen, setIsEgiszRemdModalOpen] = useState<boolean>(
		() => {
			if (typeof window === "undefined") return false;
			const search = window.location.search || "";
			const hash = window.location.hash || "";
			return (
				search.includes("egisz") ||
				search.includes("remd") ||
				search.includes("semd") ||
				hash.includes("egisz") ||
				hash.includes("remd") ||
				hash.includes("semd")
			);
		},
	);

	// Smart Slot Recovery Standalone Launcher (?smart_slot=demo, ?recovery=demo, #recovery, #smart-slot)
	const [isSmartSlotRecoveryDemoOpen, setIsSmartSlotRecoveryDemoOpen] = useState<boolean>(
		() => {
			if (typeof window === "undefined") return false;
			const search = window.location.search || "";
			const hash = window.location.hash || "";
			return (
				search.includes("smart_slot") ||
				search.includes("recovery") ||
				hash.includes("smart-slot") ||
				hash.includes("recovery")
			);
		},
	);

	useEffect(() => {
		const handleOpenCbct = () => setIsCbctDirectModalOpen(true);
		const handleOpenTuner = () => setIsCbctTunerOpen(true);
		const handleOpenConsent = () => setIsConsentDirectModalOpen(true);
		const handleOpenCeph = () => setIsCephDirectModalOpen(true);
		const handleOpenEgisz = () => setIsEgiszRemdModalOpen(true);
		const handleOpenRecovery = () => setIsSmartSlotRecoveryDemoOpen(true);
		window.addEventListener("dente:open-cbct-demo", handleOpenCbct);
		window.addEventListener("dente:open-cbct-tuner", handleOpenTuner);
		window.addEventListener("dente:open-consent-modal", handleOpenConsent);
		window.addEventListener("dente:open-ceph-demo", handleOpenCeph);
		window.addEventListener("dente:open-egisz-remd", handleOpenEgisz);
		window.addEventListener("dente:open-recovery-demo", handleOpenRecovery);

		const handleUrlChange = () => {
			const search = window.location.search || "";
			const hash = window.location.hash || "";
			if (search.includes("cbct=tuner") || hash.includes("cbct=tuner")) {
				setIsCbctTunerOpen(true);
				return;
			}
			if (
				search.includes("cbct=") ||
				search.includes("cbct") ||
				hash.includes("cbct=") ||
				hash.includes("cbct")
			) {
				setIsCbctDirectModalOpen(true);
			}
			if (
				search.includes("consent") ||
				hash.includes("consent") ||
				hash.includes("ids")
			) {
				setIsConsentDirectModalOpen(true);
			}
			if (
				search.includes("ceph") ||
				search.includes("trg") ||
				hash.includes("ceph") ||
				hash.includes("trg")
			) {
				setIsCephDirectModalOpen(true);
			}
			if (
				search.includes("egisz") ||
				search.includes("remd") ||
				search.includes("semd") ||
				hash.includes("egisz") ||
				hash.includes("remd") ||
				hash.includes("semd")
			) {
				setIsEgiszRemdModalOpen(true);
			}
			if (
				search.includes("smart_slot") ||
				search.includes("recovery") ||
				hash.includes("smart-slot") ||
				hash.includes("recovery")
			) {
				setIsSmartSlotRecoveryDemoOpen(true);
			}
		};
		window.addEventListener("popstate", handleUrlChange);
		window.addEventListener("hashchange", handleUrlChange);
		return () => {
			window.removeEventListener("dente:open-cbct-demo", handleOpenCbct);
			window.removeEventListener("dente:open-cbct-tuner", handleOpenTuner);
			window.removeEventListener("dente:open-consent-modal", handleOpenConsent);
			window.removeEventListener("dente:open-ceph-demo", handleOpenCeph);
			window.removeEventListener("dente:open-egisz-remd", handleOpenEgisz);
			window.removeEventListener("dente:open-recovery-demo", handleOpenRecovery);
			window.removeEventListener("popstate", handleUrlChange);
			window.removeEventListener("hashchange", handleUrlChange);
		};
	}, []);

	// 152-FZ Doctor Privacy Shield (Lockscreen)
	const [isPrivacyShieldActive, setIsPrivacyShieldActive] = useState<boolean>(
		() => {
			return (
				safeLocalStorageGetItem(DENTE_PRIVACY_SHIELD_LOCKED_KEY) === "true"
			);
		},
	);

	// Синхронизация прямых полноэкранных клинических студий с uiSurfaceStore (Инвариант 3)
	useEffect(() => {
		if (isCbctDirectModalOpen) {
			useUiSurfaceStore.getState().openPrimaryModal("cbct_implant_studio");
		} else if (isCephDirectModalOpen) {
			useUiSurfaceStore.getState().openPrimaryModal("cephalometric_trg");
		} else if (isEgiszRemdModalOpen) {
			useUiSurfaceStore.getState().openPrimaryModal("egisz_remd_hub");
		} else if (isPrivacyShieldActive) {
			useUiSurfaceStore.getState().openPrimaryModal("privacy_shield");
		} else if (isConsentDirectModalOpen) {
			useUiSurfaceStore.getState().openPrimaryModal("informed_consent");
		} else {
			const current = useUiSurfaceStore.getState().primaryModal?.id;
			if (
				current === "cbct_implant_studio" ||
				current === "cephalometric_trg" ||
				current === "egisz_remd_hub" ||
				current === "privacy_shield" ||
				current === "informed_consent"
			) {
				useUiSurfaceStore.getState().closePrimaryModal();
			}
		}
	}, [
		isCbctDirectModalOpen,
		isCephDirectModalOpen,
		isEgiszRemdModalOpen,
		isPrivacyShieldActive,
		isConsentDirectModalOpen,
	]);

	useEffect(() => {
		const handleCloseAllSurfaces = () => {
			setIsCbctDirectModalOpen(false);
			setIsCephDirectModalOpen(false);
			setIsEgiszRemdModalOpen(false);
			setIsConsentDirectModalOpen(false);
		};
		window.addEventListener("dente:close-all-surfaces", handleCloseAllSurfaces);
		return () => {
			window.removeEventListener("dente:close-all-surfaces", handleCloseAllSurfaces);
		};
	}, []);
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const [activeStaffUser, setActiveStaffUser] = useState<any>(() => {
		const cached = getCachedActiveStaffUser();
		if (cached) return cached;
		const staffToken = readDenteStaffToken();
		if (
			staffToken &&
			(staffToken.startsWith("demo-") || staffToken.startsWith("dente-offline-"))
		) {
			return DEMO_CHIEF_DOCTOR;
		}
		return null;
	});
	const staffProfileFetchAttemptedRef = useRef<boolean>(false);
	const initialDashboardLoadTriggeredRef = useRef<boolean>(false);
	const loadDashboardRef = useRef(loadDashboard);
	loadDashboardRef.current = loadDashboard;

	const demoAutoLoginAttemptedRef = useRef<boolean>(false);

	// Auto-login effect for Demo Showcase Mode (Mandate 8y)
	useEffect(() => {
		const checkAndAttemptDemoLogin = async () => {
			if (!isDemoShowcaseMode() || clinicAuthed || isCbctDirectModalOpen) return;
			demoAutoLoginAttemptedRef.current = true;
			try {
				const response = await fetch("/api/auth/login", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						email: "doctor@clinic.com",
						password: "dente2026",
					}),
				});
				if (response.ok) {
					const data = await response.json();
					if (data.clinicToken) {
						safeLocalStorageSetItem(DENTE_CLINIC_TOKEN_KEY, data.clinicToken);
					}
					if (data.staffToken) {
						safeLocalStorageSetItem(DENTE_STAFF_TOKEN_KEY, data.staffToken);
					}
					setClinicAuthed(true);
					if (data.user) {
						setStaffAuthed(true);
						setActiveStaffUser(data.user);
					}
					void loadDashboardRef.current();
					return;
				}
			} catch (err) {
				logger.warn(
					"[Dente] Demo auto-login API call failed, falling back to local demo auth:",
					err,
				);
			}

			// Local demo showcase fallback if backend is offline or unseeded
			const demoClinicToken = "demo-showcase-clinic-token";
			const demoStaffToken = "demo-showcase-staff-token";
			safeLocalStorageSetItem(DENTE_CLINIC_TOKEN_KEY, demoClinicToken);
			safeLocalStorageSetItem(DENTE_STAFF_TOKEN_KEY, demoStaffToken);
			setClinicAuthed(true);
			setStaffAuthed(true);
			setActiveStaffUser({
				id: "01a00000-0000-0000-0003-000000000001",
				fullName: "Д-р Демонстрационный А. В.",
				role: "doctor",
				email: "doctor@clinic.com",
				organizationId: DEMO_SHOWCASE_ORG_ID,
			});
			void loadDashboardRef.current();
		};

		if (!demoAutoLoginAttemptedRef.current && isDemoShowcaseMode() && !clinicAuthed && !isCbctDirectModalOpen) {
			void checkAndAttemptDemoLogin();
		}

		const handleHashOrUrlChange = () => {
			if (isDemoShowcaseMode() && !clinicAuthed && !isCbctDirectModalOpen) {
				void checkAndAttemptDemoLogin();
			}
		};

		window.addEventListener("hashchange", handleHashOrUrlChange);
		window.addEventListener("popstate", handleHashOrUrlChange);
		return () => {
			window.removeEventListener("hashchange", handleHashOrUrlChange);
			window.removeEventListener("popstate", handleHashOrUrlChange);
		};
	}, [clinicAuthed, isCbctDirectModalOpen]);

	// On mount: if clinic token already in localStorage (page refresh / persisted session), load dashboard + restore user profile
	useEffect(() => {
		if (
			clinicAuthed &&
			!dashboard &&
			!initialDashboardLoadTriggeredRef.current &&
			!isCbctDirectModalOpen
		) {
			initialDashboardLoadTriggeredRef.current = true;
			void loadDashboardRef.current().catch((e) => {
				// Only force re-login on explicit 401 auth failure, not network/db errors
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
				const statusCode = (e as any)?.statusCode ?? (e as any)?.status ?? 0;
				const is401 =
					statusCode === 401 ||
					(e instanceof Error &&
						(e.message.includes("401") || e.message.includes("Unauthorized")));
				if (is401) {
					logger.warn(
						"[Dente] Clinic token invalid (401), forcing re-login:",
						e,
					);
					safeLocalStorageRemoveItem(DENTE_CLINIC_TOKEN_KEY);
					safeLocalStorageRemoveItem(DENTE_STAFF_TOKEN_KEY);
					setClinicAuthed(false);
					setStaffAuthed(false);
				} else {
					// Network/DB error: keep session, fallback dashboard already set by loadDashboard
					logger.warn(
						"[Dente] Dashboard load failed (network/db), keeping session with fallback:",
						e,
					);
				}
			});
		}
		// Restore staff user profile from token on page refresh (0 ms instant offline hydration)
		const staffToken = readDenteStaffToken() || null;
		if (
			staffToken &&
			!staffProfileFetchAttemptedRef.current
		) {
			staffProfileFetchAttemptedRef.current = true;
			fetch("/api/auth/user/me", {
				headers: { "x-dente-staff-token": staffToken },
			})
				.then((r) => {
					if (r.status === 401 || r.status === 403) {
						if (
							!staffToken.startsWith("demo-") &&
							!staffToken.startsWith("dente-offline-")
						) {
							safeLocalStorageRemoveItem(DENTE_STAFF_TOKEN_KEY);
							setStaffAuthed(false);
							setActiveStaffUser(null);
						}
						return null;
					}
					return r.ok ? r.json() : null;
				})
				.then((data) => {
					if (data?.user) {
						setActiveStaffUser(data.user);
						cacheActiveStaffUser(data.user);
					} else if (data !== null) {
						if (
							!staffToken.startsWith("demo-") &&
							!staffToken.startsWith("dente-offline-")
						) {
							safeLocalStorageRemoveItem(DENTE_STAFF_TOKEN_KEY);
							setStaffAuthed(false);
							setActiveStaffUser(null);
						}
					}
				})
				.catch((err) => {
					logger.warn(
						"[Dente] Background auth profile check failed (offline/LAN):",
						err,
					);
					const cached = getCachedActiveStaffUser();
					if (cached) {
						setActiveStaffUser(cached);
					}
				});
		}
	}, [clinicAuthed, dashboard, activeStaffUser, isCbctDirectModalOpen]); // Stable dependencies with single-trigger guards
	// 152-FZ Doctor Privacy Shield: Auto-lock on inactivity (configurable via localStorage)
	useEffect(() => {
		if (!clinicAuthed || !staffAuthed || isPrivacyShieldActive) return;
		let timer: ReturnType<typeof setTimeout>;
		const resetTimer = () => {
			clearTimeout(timer);
			timer = setTimeout(
				() => {
					setIsPrivacyShieldActive(true);
					safeLocalStorageSetItem(DENTE_PRIVACY_SHIELD_LOCKED_KEY, "true");
				},
				getInactivityTimeoutMs(),
			);
		};
		const events = ["mousemove", "keydown", "pointerdown", "touchstart"];
		events.forEach((e) => {
			document.addEventListener(e, resetTimer, { passive: true });
		});
		resetTimer();
		return () => {
			clearTimeout(timer);
			events.forEach((e) => {
				document.removeEventListener(e, resetTimer);
			});
		};
	}, [clinicAuthed, staffAuthed, isPrivacyShieldActive]);

	const handleClinicLogout = () => {
		staffProfileFetchAttemptedRef.current = false;
		safeLocalStorageRemoveItem(DENTE_CLINIC_TOKEN_KEY);
		safeLocalStorageRemoveItem(DENTE_STAFF_TOKEN_KEY);
		safeLocalStorageRemoveItem(DENTE_PRIVACY_SHIELD_LOCKED_KEY);
		clearOfflineClinicCaches();
		setIsPrivacyShieldActive(false);
		setClinicAuthed(false);
		setStaffAuthed(false);
		setShowStaffPinPad(false);
		setActiveStaffUser(null);
	};

	const handleLockSession = () => {
		setIsPrivacyShieldActive(true);
		safeLocalStorageSetItem(DENTE_PRIVACY_SHIELD_LOCKED_KEY, "true");
	};

	const handleFullStaffLock = () => {
		safeLocalStorageRemoveItem(DENTE_PRIVACY_SHIELD_LOCKED_KEY);
		safeLocalStorageRemoveItem(DENTE_STAFF_TOKEN_KEY);
		setIsPrivacyShieldActive(false);
		setStaffAuthed(false);
		setShowStaffPinPad(true);
	};
	const isLocalOnboardingDismissed =
		typeof window !== "undefined" &&
		(safeLocalStorageGetItem("dental-crm:onboarding:v1")?.includes(
			'"dismissed":true',
		) ||
			safeLocalStorageGetItem("dente_ui_preferences_v1")?.includes(
				'"onboardingDismissed":true',
			));
	/**
	 * Скрыта ли подсказка о названии клиники, совпадающем с тестовым.
	 *
	 * Держится в этом сеансе, а не в хранилище браузера, и это осознанно: подсказка
	 * появляется снова при следующем входе, пока клинику действительно не
	 * переименовали или не настроили. Если бы закрытие запоминалось навсегда,
	 * ненастроенная клиника осталась бы без единого напоминания — а именно ради
	 * напоминания подсказка и существует. Постоянное закрытие требует настоящего
	 * признака «клиника настроена», которого в проекте пока нет.
	 */
	const [defaultClinicNoticeHidden, setDefaultClinicNoticeHidden] =
		useState(false);
	// 3D CBCT CONTRAST & SLICE TUNER PLAYGROUND (?cbct=tuner)
	// Must be rendered at the ABSOLUTE TOP before ANY auth, unlock, error, or dashboard guards!
	if (isCbctTunerOpen) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка интерактивного тюнера КЛКТ..." />}>
				<CbctTunerPlayground
					isOpen={true}
					onClose={() => {
						setIsCbctTunerOpen(false);
						const url = new URL(window.location.href);
						url.searchParams.delete("cbct");
						window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + (url.hash && !url.hash.includes("cbct") ? url.hash : ""));
					}}
				/>
			</Suspense>
		);
	}

	// 3D CBCT STANDALONE LAUNCHER (?cbct=demo, ?cbct=1, #cbct)
	// Must be rendered at the ABSOLUTE TOP before ANY auth, unlock, error, or dashboard guards!
	if (isCbctDirectModalOpen) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка 3D КЛКТ Захарова (312 срезов)..." />}>
				<CbctMprImplantStudioModal
					isOpen={true}
					onClose={() => {
						setIsCbctDirectModalOpen(false);
						const url = new URL(window.location.href);
						url.searchParams.delete("cbct");
						window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + (url.hash && !url.hash.includes("cbct") ? url.hash : ""));
					}}
					patientName="Захаров Иван Дмитриевич (312 срезов КЛКТ)"
					patientId="demo_cbct_patient"
					autoLoadDemo={true}
				/>
			</Suspense>
		);
	}

	// MOBILE CHAIRSIDE INFORMED CONSENT STANDALONE LAUNCHER (?consent=demo, #consent, #ids)
	// Must be rendered at the absolute top for instant chairside finger signing on smartphone/tablet!
	if (isConsentDirectModalOpen) {
		return (
			<InformedConsentModal
				isOpen={true}
				onClose={() => {
					setIsConsentDirectModalOpen(false);
					const url = new URL(window.location.href);
					url.searchParams.delete("consent");
					window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + (url.hash && !url.hash.includes("consent") ? url.hash : ""));
				}}
				initialMode="packages"
				initialPackageKey="PACKAGE_PRIMARY_VISIT"
				initialVerificationMethod="tablet_stylus"
				patient={{
					fullName: "Ковалёв Роман Станиславович",
					birthDate: "12.04.1988",
					passport: "45 10 № 884721",
					phone: "+7 (999) 888-77-66",
					address: "г. Москва, ул. Арбат, д. 24, кв. 12",
				}}
				doctorName="Д-р Воронов Алексей Владимирович"
				doctorSpecialty="Стоматолог-терапевт"
				diagnosisIcd="K02.1 Кариес дентина"
				toothNumbers="3.6"
			/>
		);
	}

	// ORTHODONTIC CEPHALOMETRIC TRG STANDALONE LAUNCHER (?ceph=demo, ?trg=demo, #ceph, #trg)
	// Must be rendered at the absolute top for instant orthodontic TRG analysis!
	if (isCephDirectModalOpen) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка цефалометрического анализа ТРГ..." />}>
				<CephalometricAnalysisModal
					isOpen={true}
					onClose={() => {
						setIsCephDirectModalOpen(false);
						const url = new URL(window.location.href);
						url.searchParams.delete("ceph");
						url.searchParams.delete("trg");
						window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + (url.hash && !url.hash.includes("ceph") && !url.hash.includes("trg") ? url.hash : ""));
					}}
					patientName="Смирнова Екатерина Андреевна (ТРГ боковая)"
					patientId="demo_ceph_patient"
					initialImageUrl="/radiology/sample_trg_cephalogram.jpg"
					initialTab={((typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null) as ("landmarks" | "metrics" | "report") | null) ?? "metrics"}
				/>
			</Suspense>
		);
	}

	// EGISZ REMD & ORDER 947N CDA R2 XML STANDALONE LAUNCHER (?egisz=demo, ?remd=demo, #egisz, #remd)
	// Must be rendered at the absolute top for instant clinical EGISZ signing and journal access!
	if (isEgiszRemdModalOpen) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка хаба ЕГИСЗ РЭМД..." />}>
				<EgiszRemdHubModal
					isOpen={true}
					onClose={() => {
						setIsEgiszRemdModalOpen(false);
						const url = new URL(window.location.href);
						url.searchParams.delete("egisz");
						url.searchParams.delete("remd");
						url.searchParams.delete("semd");
						window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + (url.hash && !url.hash.includes("egisz") && !url.hash.includes("remd") ? url.hash : ""));
					}}
					initialDocType="cda_semd"
					initialTab={((typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null) as any) ?? "signature"}
				/>
			</Suspense>
		);
	}

	// SMART SLOT RECOVERY STANDALONE LAUNCHER (?smart_slot=demo, ?recovery=demo, #recovery, #smart-slot)
	if (isSmartSlotRecoveryDemoOpen) {
		const demoDate = new Date();
		demoDate.setHours(demoDate.getHours() + 2, 0, 0, 0);
		const demoEndDate = new Date(demoDate);
		demoEndDate.setMinutes(demoEndDate.getMinutes() + 45);

		return (
			<Suspense fallback={<AppLoadingState message="Загрузка умного подбора слота..." />}>
				<div className="w-screen h-screen flex items-center justify-center bg-[var(--paper-soft)] p-4">
					<SmartSlotRecoveryPopover
						isOpen={true}
						onClose={() => {
							setIsSmartSlotRecoveryDemoOpen(false);
							const url = new URL(window.location.href);
							url.searchParams.delete("smart_slot");
							url.searchParams.delete("recovery");
							window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
						}}
						slot={{
							appointmentId: "demo-cancelled-slot-1",
							startsAt: demoDate.toISOString(),
							endsAt: demoEndDate.toISOString(),
							doctorId: "doc-1",
							doctorName: "Д-р Смирнов А.П.",
							chairId: "chair-1",
							chairName: "Кресло №1 (Терапия)",
							freedBecause: "Отмена пациентом за 2 часа (ОРВИ)",
							patientName: "Алексеев Владимир Сергеевич",
						}}
						clinicName="Стоматология DENTE"
					/>
				</div>
			</Suspense>
		);
	}

	// Show clinic login gate if not authed
	if (!clinicAuthed) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка авторизации" />}>
				<AuthHub
					onSuccess={(_cp, up) => {
						setClinicAuthed(true);
						if (up) {
							setStaffAuthed(true);
							setActiveStaffUser(up);
							cacheActiveStaffUser(up);
						}
						void loadDashboard();
					}}
				/>
			</Suspense>
		);
	}
	// Show staff PIN pad if clinic authed but no staff session (or after lock)
	if (!staffAuthed || showStaffPinPad) {
		/*
		 * ЭКРАН СМЕНЫ ПОКАЗЫВАЕТСЯ ДАЖЕ БЕЗ ДАННЫХ КЛИНИКИ, И ЭТО ОСОЗНАННО.
		 *
		 * БЫЛО: `if (!dashboard) return <AppLoadingState message="Загрузка данных
		 * клиники..." />`. Сводка клиники может не прийти НИКОГДА — например когда
		 * клиника из сессии отсутствует в базе и сервер отвечает отказом (см.
		 * apps/api/src/routes/dashboard.ts). Тогда «Загрузка данных клиники...»
		 * висела вечно: ни причины, ни выхода, ни даже кнопки «выйти из аккаунта
		 * клиники». Честные экраны отказа в этом файле есть, но стоят НИЖЕ этой
		 * ветки и потому недостижимы, пока смена не открыта.
		 *
		 * Теперь состояние списка сотрудников называет сам экран смены: он умеет
		 * показать загрузку, отказ с причиной и повтором, честную пустоту и людей —
		 * и во всех четырёх случаях рядом остаётся выход из аккаунта клиники, то
		 * есть путь наружу существует всегда.
		 *
		 * `?? []` здесь НЕ ВОЗВРАЩАТЬ. Именно он превращал непрочитанный список в
		 * пустой, и экран советовал заводить кадры клинике, у которой в базе трое
		 * действующих сотрудников. Охраняется tests/staffUnlockListState.test.ts.
		 */

		return (
			<Suspense fallback={<AppLoadingState message="Загрузка авторизации" />}>
				<StaffPinPad
					staffMembers={
						dashboard
							? dashboard.clinicSettings?.staff
							: (getCachedStaffList() ?? undefined)
					}
					staffListLoading={
						!dashboard &&
						!getCachedStaffList() &&
						!error &&
						!accessUnlockRequired
					}
					/*
					 * Код ответа берётся из того, что о неудаче известно здесь, и не
					 * выдумывается: отказ по доступу — 401; сводка пришла, а списка в ней нет
					 * — 200 («ответ сервера непонятен»); до сервера не дошли — null.
					 */
					staffListStatus={
						accessUnlockRequired
							? 401
							: dashboard || getCachedStaffList()
								? 200
								: null
					}
					onUnlockSuccess={(user) => {
						cacheActiveStaffUser(user);
						setActiveStaffUser(user);
						setStaffAuthed(true);
						setShowStaffPinPad(false);
					}}
					onClinicLogout={handleClinicLogout}
					onRetryStaffList={() => {
						setError(null);
						void loadDashboard();
					}}
				/>
			</Suspense>
		);
	}
	/*
	 * РОЛИ В МАСТЕРЕ НАСТРОЙКИ — ТОЛЬКО СУЩЕСТВУЮЩИЕ ПРИ ЭТОМ РЕЖИМЕ КЛИНИКИ.
	 *
	 * Переключатель роли в шапке (WorkspaceTopbar) уже спрашивает режим, а два шага
	 * мастера — «Ваша рабочая роль» и «Кто сейчас работает» — предлагали все пять
	 * ролей всегда. Мастер сам заводил сотрудника, которого потом отфильтровывала
	 * шапка: клиника в режиме отдельного врача выбирала «Управляющий», после чего
	 * шапка показывала «Роль: Управляющий», предлагала «Врач» и «Владелец», и ни
	 * одна кнопка не была подсвечена.
	 *
	 * Правило одно на все переключатели — staffRoleChoices из
	 * lib/clinicCapabilities.ts, там же, где таблица ролей по режимам. Второе
	 * описание того же правила разъехалось бы с первым при первой же правке.
	 * Текущая выбранная роль остаётся в списке всегда, иначе человек не увидит,
	 * где он находится.
	 *
	 * Режим берётся из того же ответа сервера, что и в шапке
	 * (dashboard.clinicSettings.profile.mode). Пока его нет — предлагаются все
	 * роли: отнимать выбор у клиники, чей режим ещё не известен, нельзя.
	 */
	const onboardingRoleChoices = staffRoleChoices(
		roleFocusOrder,
		resolveClinicMode(dashboard?.clinicSettings?.profile?.mode),
		selectedWorkspaceRole,
	);
	/*
	 * ВОЛНА 319: ДЕМОНТАЖ БЛОКИРУЮЩЕГО ПОЛНОЭКРАННОГО МАСТЕРА ПЕРВОГО ЗАПУСКА (МАНДАТЫ 8e, 8s).
	 *
	 * ЧТО УДАЛЕНО: 390 строк screen-hijacking модалки (<main className="onboarding-fullscreen">),
	 * которая блокировала рабочий стол врача при первом входе и не пускала к расписанию
	 * и приёму без прокликивания шагов.
	 * ЧТО РАБОТАЕТ ВМЕСТО НЕГО: ненавязчивый тихий бар подсказок (.onboarding-compact-strip),
	 * расположенный непосредственно над рабочим пространством без блокировки интерфейса (0 кликов),
	 * со свободным закрытием в 1 клик ("Скрыть"), прямым переходом в "Приём" / "Расписание",
	 * и открытием полного мастера по запросу через кнопку "Настроить" (<OnboardingWizardModal />).
	 */
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
						setError(
							operatorWorkflowFailureMessage(
								"Не удалось загрузить данные клиники",
								loadError,
							),
						);
					});
				}}
			/>
		);
	}
	if (!dashboard) {
		return <AppLoadingState message="Загрузка рабочей смены" />;
	}
	return (
		/*
      ОБЩИЙ КОНТЕКСТ ОБНИМАЕТ ВСЁ РАБОЧЕЕ МЕСТО, А НЕ ОДНИ НАСТРОЙКИ.
      AppLogicProvider стоял только вокруг ветки настроек. Остальные разделы —
      записи, пациенты, приём, оплаты, аналитика, маркетинг — рисовались выше
      него, и всё, что внутри них звало useAppLogicContext(), получало пустоту.
      Молча. useAppLogicContext() при отсутствии провайдера ВОЗВРАЩАЛ
      `{} as AppLogicContextType`: компилятор видел полный объект, во время
      работы там ничего не было, каждое разобранное поле равнялось undefined.
      Ошибки не возникало, граница ошибок не срабатывала, виджет просто рисовал
      пустое место — и выглядело это как «данных пока нет», а не как поломка.
      Поймать такое типами нельзя по построению приведения.
      Пересчёт по исходникам (scratch/audit-context-outside-provider.mjs) на
      момент той правки: 89 потребителей контекста, из них 59 отрисовывались вне
      настроек. Среди них вся карточка пациента, вкладки приёма, одонтограмма,
      панели кассы и виджеты записи.
      ПРОШЕДШЕЕ ВРЕМЯ ВЫШЕ — НЕ СТИЛЬ. Подмену убрали:
      useAppLogicContext() вне провайдера теперь БРОСАЕТ исключение с внятным
      текстом (contexts/AppLogicContext.tsx), потому что отсутствие провайдера —
      дефект сборки дерева, а не состояние данных. Повторить эту потерю молча
      больше нельзя: ближайшая WorkspaceRouteErrorBoundary покажет отказ в своём
      разделе. Охрана — contexts/appLogicContextRefusesToInvent.test.tsx.
      Замер на момент ужесточения: потребителей ВНЕ провайдера в дереве нет — ни
      в публичном контуре main.tsx, ни в том, что рисуется до этой строки
      (AuthHub, StaffPinPad, AppBootState).
    */
		<AppLogicProvider value={appLogicValue}>
			<AuthProvider>
				<main
					className="app-shell dente-redesign"
					data-collapsed={sidebarCollapsed}
				>
				<a className="skip-link" href="#workspace-content">
					Перейти к рабочей области
				</a>
				<WorkspaceSidebar currentView={currentView}
					onViewIntent={preloadWorkspaceView}
					role={selectedWorkspaceRole}
					collapsed={sidebarCollapsed}
					onToggleCollapsed={toggleSidebarCollapsed}
					onLockSession={handleLockSession}
				/>
				<section
					className={`workspace view-${currentView}`}
					id="workspace-content"
					tabIndex={-1}
					aria-label="Рабочая область"
				>
					{/*
          БАННЕР О НЕНАСТРОЕННОЙ КЛИНИКЕ.
          ЧТО БЫЛО НЕ ТАК. Условие было тем же — сравнение названия клиники со
          строкой «Стоматология, 1 кабинет», — но текст утверждал: «Демо-режим.
          Тестовые данные загружены». А это ровно то название, которое получает
          клиника по умолчанию (apps/api/src/sampleData.ts:268, seedAuth.ts:32).
          То есть настоящая клиника, оставившая название по умолчанию — а соло-врач
          оставит его чаще всего, — навсегда получала надпись, что её живые
          пациенты и оплаты являются тестовыми данными. Хуже надписи здесь только
          то, что убрать её было нельзя: закрытия у баннера не было.
          ПОЧЕМУ УСЛОВИЕ ОСТАЛОСЬ ПО ИМЕНИ. Настоящего признака «эта клиника
          создана сидером» в проекте нет: ни колонки у организации, ни поля в
          наборе флагов. Выдумывать его здесь нельзя, а флаг onboardingCompleted не
          годится.
          ЗДЕСЬ СТОЯЛО НЕВЕРНОЕ ОБЪЯСНЕНИЕ ЭТОГО ФЛАГА, и оно врало дважды.
          Написано было: «его выставляет только POST /api/workspace/onboarding/
          complete… поэтому он не становится истинным ни у кого, и баннер висел бы
          у всех навсегда». В действительности тот маршрут флага НЕ КАСАЛСЯ вовсе —
          он писал название, реквизиты, режим, график, людей и кресла, а
          workspace_feature_flags не трогал ни одной строкой; сам маршрут теперь
          удалён (разбор — apps/api/src/routes/workspaceProfile.ts). И вывод был
          обратным по знаку: onboardingCompleted равен true в наборе умолчаний
          сервера (DEFAULT_WORKSPACE_FEATURE_FLAGS), и ни один экран его не
          выставляет — POST /api/workspace/profile принял бы его в общем слиянии
          признаков, но не посылает ни один вызов. Значит по такому условию баннер
          не показался бы НИКОМУ, а не всем.
          Следующий инженер, поверив этому объяснению, искал бы отсутствующего
          писателя вместо того, чтобы завести признак.
          ЧТО ИЗМЕНЕНО. Текст больше не утверждает недоказуемое. Он говорит
          проверяемый факт — название совпадает с названием из тестовых данных — и
          даёт ДВА выхода: переименовать клинику, если она настоящая, или пройти
          настройку, если только начинают. И его можно закрыть.
          ДОЛГ: признак «данные от сидера» на стороне сервера. Пока его нет,
          совпадение имени — единственная имеющаяся улика, и подавать её надо как
          улику, а не как приговор.
        */}
					{dashboard?.clinicName === "Стоматология, 1 кабинет" &&
						!defaultClinicNoticeHidden && (
							<div className="default-clinic-banner" role="status">
								<div className="banner-content">
									<span className="banner-icon" aria-hidden="true">
										<Rocket
											className="w-5 h-5 text-amber-500"
											aria-hidden="true"
										/>
									</span>
									<p>
										<strong>Клиника ещё не настроена?</strong> Её название
										совпадает с названием клиники из тестовых данных. Если это
										ваша настоящая клиника — переименуйте её в настройках. Если
										вы только начинаете — пройдите настройку, она займёт
										несколько минут.
									</p>
								</div>
								<button
									className="primary-button banner-btn"
									type="button"
									onClick={reopenOnboarding}
								>
									Пройти настройку
								</button>
								<button
									className="text-button banner-btn"
									type="button"
									onClick={() => setDefaultClinicNoticeHidden(true)}
									aria-label="Скрыть подсказку о названии клиники"
								>
									Скрыть
								</button>
							</div>
						)}
					{isDemoShowcaseMode() && (
						<DemoModeBanner
							onExitDemo={() => {
								disableDemoShowcaseMode();
								const cleanUrl = window.location.pathname;
								window.location.href = cleanUrl;
							}}
							onRegisterClinic={() => {
								disableDemoShowcaseMode();
								clearOfflineClinicCaches();
								safeLocalStorageRemoveItem(DENTE_CLINIC_TOKEN_KEY);
								safeLocalStorageRemoveItem(DENTE_STAFF_TOKEN_KEY);
								setClinicAuthed(false);
								setStaffAuthed(false);
								window.location.hash = "#/auth/register";
							}}
						/>
					)}
					<WorkspaceTopbar
						clinicName={dashboard.clinicName}
						onGoToDictation={goToVisitDictation}
						onGoToSchedule={() => {
							if (window.location.hash === "#schedule" || window.location.hash === "schedule") {
								window.dispatchEvent(new CustomEvent("dente-open-quick-booking"));
							} else {
								window.location.hash = "schedule";
							}
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
						onLockSession={handleLockSession}
						onOpenDoctorShiftCockpit={openDoctorShiftCockpit}
						onOpenCbctDemo={() => setIsCbctDirectModalOpen(true)}
					/>
					<LanCitoEmergencyBanner
						alerts={activeCitoAlerts}
						onDismiss={dismissCitoAlert}
						onAcknowledge={dismissCitoAlert}
					/>
					<WorkspaceContinuityStrip
						browserContinuityCritical={browserContinuityCritical}
						browserWarnings={browserContinuity?.warnings ?? []}
						isOnline={isOnline}
						isPendingVisitSyncing={isPendingVisitSyncing}
						onCheckDevice={() =>
							void refreshBrowserContinuity({ silent: false })
						}
						onFlushSpeech={() =>
							void flushPendingSpeechChunks({ silent: false })
						}
						onFlushVisit={() => void flushPendingVisitSaves({ silent: false })}
						pendingSpeechChunkCount={pendingSpeechChunkCount}
						pendingVisitSaveCount={pendingVisitSaveCount}
						networkState={networkState}
						pendingMutationCount={pendingMutationCount}
						onSyncMutations={() => void syncOfflineMutations()}
						isSyncingMutations={isSyncingMutations}
					/>
					{error ? (
						<section className="app-notice" role="alert" aria-live="assertive">
							<AlertTriangle aria-hidden="true" />
							<p>{error}</p>
							<button
								className="secondary-button"
								type="button"
								onClick={() => setError(null)}
							>
								Понятно
							</button>
						</section>
					) : null}
					{!error && uiPreferencesSyncError ? (
						<section className="app-notice" role="alert" aria-live="assertive">
							<AlertTriangle aria-hidden="true" />
							<p>{uiPreferencesSyncError}</p>
							<button
								className="secondary-button"
								type="button"
								onClick={() => setUiPreferencesSyncError(null)}
							>
								Понятно
							</button>
						</section>
					) : null}
					{!error && !uiPreferencesSyncError && telegramHandoffNotice ? (
						<section
							className="app-notice telegram-handoff-notice"
							role="status"
							aria-live="polite"
						>
							<Bot aria-hidden="true" />
							<p>
								Открыто из Telegram:{" "}
								<strong>{telegramHandoffNotice.title}</strong>.{" "}
								{telegramHandoffNotice.detail} Ссылка не содержит пациента,
								документ, запись или оплату.
							</p>
							<button
								className="secondary-button"
								type="button"
								onClick={() => setTelegramHandoffNotice(null)}
							>
								Понятно
							</button>
						</section>
					) : null}
					{!onboardingDismissed &&
					!showFullOnboardingGuide &&
					!isLocalOnboardingDismissed &&
					!(typeof window !== "undefined" && window.innerWidth <= 768) &&
					currentView !== "visit" &&
					!(typeof window !== "undefined" && window.location.hash.toLowerCase().includes("visit")) ? (
						<section
							className="onboarding-compact-strip"
							aria-label="Первичная настройка клиники"
						>
							<div>
								<strong>Можно начать прием без мастера</strong>
								<span>
									Документы предупредят о реквизитах позже. Сейчас важнее
									открыть пациента, диктовку и расписание.
								</span>
							</div>
							<span className="onboarding-compact-score">
								{currentOnboardingIndex + 1}/{onboardingSteps.length} ·
								документы {legalReadinessPercent}%
							</span>
							<button
								className="primary-button"
								type="button"
								onClick={() => void continueOnboardingInDraftMode("visit")}
							>
								<ClipboardCheck aria-hidden="true" /> Прием
							</button>
							<button
								className="secondary-button"
								type="button"
								onClick={() => void continueOnboardingInDraftMode("schedule")}
							>
								<CalendarDays aria-hidden="true" /> Расписание
							</button>
							<button
								className="secondary-button"
								type="button"
								onClick={() => openOnboardingGuide()}
							>
								<ShieldCheck aria-hidden="true" /> Настроить
							</button>
							<button
								className="secondary-button"
								type="button"
								onClick={() => dismissOnboarding()}
								title="Скрыть подсказку"
								aria-label="Скрыть подсказку"
							>
								<X aria-hidden="true" /> Скрыть
							</button>
						</section>
					) : null}
					{isDoctorShiftCockpitOpen ? (
						<Suspense fallback={null}>
							<DoctorMobileShiftModal
								isOpen={isDoctorShiftCockpitOpen}
								onClose={closeDoctorShiftCockpit}
								initialDoctorId={activeDoctor?.id || "doc-1"}
								initialDoctorName={activeDoctor?.fullName || "Лечащий врач"}
								initialDoctorSpecialty={
									activeDoctor?.specialty || "Терапевт-ортопед"
								}
								initialShiftDateIso={dashboard?.todayIso || "2026-08-29"}
							/>
						</Suspense>
					) : null}
					{showFullOnboardingGuide ? (
						<Suspense fallback={null}>
							<OnboardingWizardModal
								currentOnboardingIndex={currentOnboardingIndex}
								onboardingSteps={onboardingSteps}
								legalReadinessPercent={legalReadinessPercent}
								continueOnboardingInDraftMode={continueOnboardingInDraftMode}
								moveOnboardingTo={moveOnboardingTo}
								onboardingStep={onboardingStep}
								onboardingReadyToFinish={onboardingReadyToFinish}
								onboardingFinishGuidanceId={onboardingFinishGuidanceId}
								onboardingRoleChoices={onboardingRoleChoices}
								selectedWorkspaceRole={selectedWorkspaceRole}
								setSelectedWorkspaceRole={setSelectedWorkspaceRole}
								staffRoleLabels={staffRoleLabels}
								specialtyLabels={specialtyLabels}
								selectedSpecialty={selectedSpecialty}
								setSelectedSpecialty={setSelectedSpecialty}
								dashboard={dashboard}
								clinicModeLabels={clinicModeLabels}
								changeClinicMode={changeClinicMode}
								clinicProfileDraft={clinicProfileDraft}
								updateClinicProfileDraft={updateClinicProfileDraft}
								uiLanguage={uiLanguage}
								setUiLanguage={setUiLanguage}
								normalizeUiLanguageInput={normalizeUiLanguageInput}
								uiLanguageOptions={uiLanguageOptions}
								selectedUiLanguageOption={selectedUiLanguageOption}
								weekdayOptions={weekdayOptions}
								toggleClinicWorkingDay={toggleClinicWorkingDay}
								legalMissingFields={legalMissingFields}
								newStaffName={newStaffName}
								setNewStaffName={setNewStaffName}
								newStaffRole={newStaffRole}
								setNewStaffRole={setNewStaffRole}
								newStaffSpecialty={newStaffSpecialty}
								setNewStaffSpecialty={setNewStaffSpecialty}
								addStaffMember={addStaffMember}
								newStaffReadyToCreate={newStaffReadyToCreate}
								onboardingStaffCreateGuidanceId={
									onboardingStaffCreateGuidanceId
								}
								newChairName={newChairName}
								setNewChairName={setNewChairName}
								addChair={addChair}
								newChairReadyToCreate={newChairReadyToCreate}
								onboardingChairCreateGuidanceId={
									onboardingChairCreateGuidanceId
								}
								staffScheduleDrafts={staffScheduleDrafts}
								staffScheduleDraftFromWorkingHours={
									staffScheduleDraftFromWorkingHours
								}
								staffScheduleSaveStates={staffScheduleSaveStates}
								staffScheduleDirtyIds={staffScheduleDirtyIds}
								staffScheduleSavingId={staffScheduleSavingId}
								updateStaffScheduleDraft={updateStaffScheduleDraft}
								toggleStaffWorkingDay={toggleStaffWorkingDay}
								saveStaffSchedule={saveStaffSchedule}
								chairScheduleDrafts={chairScheduleDrafts}
								chairScheduleSaveStates={chairScheduleSaveStates}
								chairScheduleDirtyIds={chairScheduleDirtyIds}
								chairScheduleSavingId={chairScheduleSavingId}
								updateChairScheduleDraft={updateChairScheduleDraft}
								toggleChairWorkingDay={toggleChairWorkingDay}
								saveChairSchedule={saveChairSchedule}
								pricelistSourceKindLabels={pricelistSourceKindLabels}
								pricelistSourceKind={pricelistSourceKind}
								setPricelistSourceKind={setPricelistSourceKind}
								clearPricelistImage={clearPricelistImage}
								setPricelistAnalysis={setPricelistAnalysis}
								importSourceLabels={importSourceLabels}
								importSourceKind={importSourceKind}
								setImportSourceKind={setImportSourceKind}
								setImportPreview={setImportPreview}
								setImportCommit={setImportCommit}
								smartImportModeLabels={smartImportModeLabels}
								smartImportMode={smartImportMode}
								setSmartImportMode={setSmartImportMode}
								setSmartImportPreview={setSmartImportPreview}
								setSmartImportCommit={setSmartImportCommit}
								ingestionTargetLabels={ingestionTargetLabels}
								documentIngestionTarget={documentIngestionTarget}
								setDocumentIngestionTarget={setDocumentIngestionTarget}
								imagingSourceChoices={imagingSourceChoices}
								imagingImportSourceKind={imagingImportSourceKind}
								imagingSourceLabels={imagingSourceLabels}
								setImagingImportSourceKind={setImagingImportSourceKind}
								setImagingImportPreview={setImagingImportPreview}
								setImagingImportCommit={setImagingImportCommit}
								setDicomSeriesPreview={setDicomSeriesPreview}
								dicomWebEndpointUrl={dicomWebEndpointUrl}
								setDicomWebEndpointUrl={setDicomWebEndpointUrl}
								setDicomWebCheck={setDicomWebCheck}
								setDicomViewerLaunchManifest={setDicomViewerLaunchManifest}
								setDicomViewerToolStateBundle={setDicomViewerToolStateBundle}
								setDicomViewerWorkbenchManifest={
									setDicomViewerWorkbenchManifest
								}
								ohifBaseUrl={ohifBaseUrl}
								setOhifBaseUrl={setOhifBaseUrl}
								setSettingsTab={setSettingsTab}
								telegramStatus={telegramStatus}
								telegramBotUsernameDraft={telegramBotUsernameDraft}
								setTelegramBotUsernameDraft={setTelegramBotUsernameDraft}
								markTelegramSettingsDirty={markTelegramSettingsDirty}
								telegramPatientPortalBaseUrlDraft={
									telegramPatientPortalBaseUrlDraft
								}
								setTelegramPatientPortalBaseUrlDraft={
									setTelegramPatientPortalBaseUrlDraft
								}
								telegramWelcomeImageUrlDraft={telegramWelcomeImageUrlDraft}
								setTelegramWelcomeImageUrlDraft={
									setTelegramWelcomeImageUrlDraft
								}
								telegramReviewUrlDraft={telegramReviewUrlDraft}
								setTelegramReviewUrlDraft={setTelegramReviewUrlDraft}
								telegramMapsUrlDraft={telegramMapsUrlDraft}
								setTelegramMapsUrlDraft={setTelegramMapsUrlDraft}
								telegramTokenTtlDraft={telegramTokenTtlDraft}
								setTelegramTokenTtlDraft={setTelegramTokenTtlDraft}
								telegramReminderLeadTimesDraft={telegramReminderLeadTimesDraft}
								setTelegramReminderLeadTimesDraft={
									setTelegramReminderLeadTimesDraft
								}
								telegramReviewRequestDelayDraft={
									telegramReviewRequestDelayDraft
								}
								setTelegramReviewRequestDelayDraft={
									setTelegramReviewRequestDelayDraft
								}
								telegramPostVisitCheckupDelayFields={
									telegramPostVisitCheckupDelayFields
								}
								telegramPostVisitCheckupDelayDrafts={
									telegramPostVisitCheckupDelayDrafts
								}
								updateTelegramPostVisitCheckupDelayDraft={
									updateTelegramPostVisitCheckupDelayDraft
								}
								telegramAdminSecretDraft={telegramAdminSecretDraft}
								setTelegramAdminSecretDraft={setTelegramAdminSecretDraft}
								unlockTelegramAdminSession={unlockTelegramAdminSession}
								telegramAdminSecretSession={telegramAdminSecretSession}
								telegramPrivacyModeDraft={telegramPrivacyModeDraft}
								setTelegramPrivacyModeDraft={setTelegramPrivacyModeDraft}
								normalizedTelegramPrivacyMode={normalizedTelegramPrivacyMode}
								telegramPrivacyModeLabels={telegramPrivacyModeLabels}
								telegramVisualCardFields={telegramVisualCardFields}
								onboardingTelegramVisualCardKeys={
									onboardingTelegramVisualCardKeys
								}
								telegramVisualCardUrlDrafts={telegramVisualCardUrlDrafts}
								updateTelegramVisualCardUrlDraft={
									updateTelegramVisualCardUrlDraft
								}
								telegramFeatureOptions={telegramFeatureOptions}
								telegramEnabledFeaturesDraft={telegramEnabledFeaturesDraft}
								toggleTelegramFeature={toggleTelegramFeature}
								telegramFeatureLabel={telegramFeatureLabel}
								saveTelegramSettings={saveTelegramSettings}
								isTelegramSettingsSaving={isTelegramSettingsSaving}
								telegramSettingsSaveState={telegramSettingsSaveState}
								telegramSettingsSaveError={telegramSettingsSaveError}
								telegramSettingsDirty={telegramSettingsDirty}
								documentFactoryGroups={documentFactoryGroups}
								onboardingDocumentsReady={onboardingDocumentsReady}
								onboardingBlockingIssues={onboardingBlockingIssues}
								onboardingDocumentReadinessIssues={
									onboardingDocumentReadinessIssues
								}
								onboardingTelegramRecommendations={
									onboardingTelegramRecommendations
								}
								dismissOnboarding={dismissOnboarding}
								saveClinicProfileFromDraft={saveClinicProfileFromDraft}
								clinicProfileSaveState={clinicProfileSaveState}
								previousOnboardingStep={previousOnboardingStep}
								nextOnboardingStep={nextOnboardingStep}
							/>
						</Suspense>
					) : null}
					{onboardingDismissed &&
					onboardingDraftMode &&
					!onboardingReadyToFinish ? (
						<section
							className="onboarding-draft-strip"
							aria-label="Первичная настройка в черновике"
						>
							<div>
								<strong>Первичная настройка не завершена</strong>
								<span>
									Можно работать в черновике, но перед выдачей документов
									заполните: {onboardingBlockingIssues.join(", ")}.
								</span>
							</div>
							<button
								className="secondary-button"
								type="button"
								onClick={reopenOnboarding}
							>
								Вернуться к настройке
							</button>
						</section>
					) : null}
					{onboardingDismissed &&
					onboardingReadyToFinish &&
					!onboardingDocumentsReady ? (
						<section
							className="onboarding-draft-strip"
							aria-label="Документы требуют реквизитов"
						>
							<div>
								<strong>Документы требуют реквизитов</strong>
								<span>
									Для договоров, актов и налоговых форм заполните:{" "}
									{onboardingDocumentReadinessIssues.join(", ")}.
								</span>
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
						/*
          Граница и Suspense здесь появились последними из всех разделов, и это
          было не украшение. `ShiftView` объявлен через `lazy()` (строка 399),
          но своего `Suspense` не имел: при подвешивании React поднимался до
          ближайшего сверху — а он стоит в AppShell.tsx вокруг ВСЕГО рабочего
          места. То есть на стартовом разделе, который открывается по умолчанию
          и куда сбрасывает охранник маршрута, вместо панели гасился весь экран
          вместе с боковым меню и шапкой. Границы ошибок над «Сменой» не было
          вовсе: сбой рендера или недогруженный чанк снимал рабочее место целиком
          и оставлял человека с кнопкой перезагрузки на пустой странице.
        */
						<WorkspaceRouteErrorBoundary
							view="shift"
							label={viewLabels.shift}
							panelClassName="panel shift-panel"
							panelId="shift"
						>
							<Suspense
								fallback={
									<section
										className="panel shift-panel"
										id="shift"
										aria-label={viewLabels.shift}
										aria-busy="true"
									>
										<div className="panel-heading">
											<h2>{viewLabels.shift}</h2>
											<span className="status-pill status-planned">
												загрузка
											</span>
										</div>
									</section>
								}
							>
								<ShiftView />
							</Suspense>
						</WorkspaceRouteErrorBoundary>
					) : null}
					{currentView === "shift" ? (
						/*
            Карточка приходит из того же ленивого модуля, что и «Смена»
            (ShiftView.tsx, строка 400), поэтому у неё те же две дыры — и своя
            граница, а не общая со «Сменой»: сбой карточки пациента не должен
            уносить сводку смены, и наоборот.
          */
						<WorkspaceRouteErrorBoundary
							view="shift"
							label="Карточка пациента"
							panelClassName="patient-cockpit"
							panelId="patient-cockpit"
						>
							<Suspense
								fallback={
									<section
										className="patient-cockpit dnt-cockpit"
										aria-label="Карточка пациента"
										aria-busy="true"
									>
										<div className="panel-heading">
											<h2>Карточка пациента</h2>
											<span className="status-pill status-planned">
												загрузка
											</span>
										</div>
									</section>
								}
							>
								<PatientCockpit
									/*
                  На «Смене» карточка показывает пациента открытого приёма, а не
                  `activePatient`: тот при отсутствии приёма подставляет первого
                  пациента списка, и на экран попадал случайный человек с красной
                  пометкой «СРОЧНО». Без приёма карточка честно говорит «Пациент
                  не выбран». В разделе «Пациенты» выбор из списка остаётся.
                */
									activePatient={
										currentView === "shift" ? activeVisitPatient : activePatient
									}
									activePatientInsight={activePatientInsight}
									dashboard={dashboard}
									activeCommunicationTasks={activeCommunicationTasks}
									activeImagingStudies={activeImagingStudies}
									activeUsableDocuments={activeUsableDocuments}
								/>
							</Suspense>
						</WorkspaceRouteErrorBoundary>
					) : null}
					{currentView === "imaging" ? (
						<WorkspaceRouteErrorBoundary
							view="imaging"
							label={viewLabels.imaging}
							panelClassName="panel imaging-panel"
							panelId="imaging"
						>
							<Suspense
								fallback={
									<section
										className="panel imaging-panel"
										id="imaging"
										aria-label="Снимки пациента"
										aria-busy="true"
									>
										<div className="panel-heading">
											<h2>Снимки пациента</h2>
											<span className="status-pill status-planned">
												загрузка
											</span>
										</div>
									</section>
								}
							>
								<ImagingView
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
									addImagingViewerNoteAnnotation={
										addImagingViewerNoteAnnotation
									}
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
									describeMprClinicalPresetProjectionFallback={
										describeMprClinicalPresetProjectionFallback
									}
									dicomLabel={dicomLabel}
									dicomQualityModeLabels={dicomQualityModeLabels}
									dicomTextureStrategyLabels={dicomTextureStrategyLabels}
									dicomViewerToolStateBundle={dicomViewerToolStateBundle}
									dicomViewerWorkbenchManifest={dicomViewerWorkbenchManifest}
									formatShortDate={formatShortDate}
									formatSignedMprStep={formatSignedMprStep}
									formatTime={formatTime}
									handleMprKeyboardNavigation={handleMprKeyboardNavigation}
									handleBrowserDirectoryInputChange={
										handleBrowserDirectoryInputChange
									}
									browserDirectoryInputRef={browserDirectoryInputRef}
									attachBrowserDirectoryInputRef={browserDirectoryInputRef}
									browserImagingScanProgress={browserImagingScanProgress}
									browserPickedImagingFolder={browserPickedImagingFolder}
									cancelBrowserImagingFolderScan={
										cancelBrowserImagingFolderScan
									}
									formatByteSize={formatByteSize}
									isBrowserImagingFolderPicking={isBrowserImagingFolderPicking}
									pickBrowserImagingFolder={pickBrowserImagingFolder}
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
									mprActiveProjectionOrientation={
										mprActiveProjectionOrientation
									}
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
									mprSeriesRequiredProjectionLabel={
										mprSeriesRequiredProjectionLabel
									}
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
									setCtPlanningActiveQuickActionId={
										setCtPlanningActiveQuickActionId
									}
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
					{[
						"schedule",
						"patients",
						"visit",
						"documents",
						"finance",
						"analytics",
						"communications",
					].includes(currentView) ? (
						<section className="work-grid page-grid">
							{currentView === "schedule" ? (
								<WorkspaceRouteErrorBoundary
									view="schedule"
									label={viewLabels.schedule}
									panelClassName="panel schedule-panel"
									panelId="schedule"
								>
									<Suspense
										fallback={
											<section
												className="panel schedule-panel min-w-0 max-w-full overflow-hidden"
												id="schedule"
												aria-label="Расписание"
												aria-busy="true"
											>
												<div className="panel-heading flex items-center justify-between gap-3">
													<h2>Расписание приемов</h2>
													<span className="status-pill status-planned">
														Загрузка...
													</span>
												</div>
												<div className="p-8 sm:p-12 flex flex-col items-center justify-center gap-3 text-center min-h-[350px]">
													<RefreshCw className="w-8 h-8 animate-spin text-[var(--teal,#0d9488)]" />
													<p className="text-sm font-medium text-[var(--muted)]">
														Подготовка модулей расписания...
													</p>
												</div>
											</section>
										}
									>
										<ClinicalErrorBoundary
											workspaceName="Расписание приёмов"
											workspaceKey="schedule"
										>
											<ScheduleView
												appointmentLabels={appointmentLabels}
												appointmentReadinessById={appointmentReadinessById}
												appointmentReadinessLabels={appointmentReadinessLabels}
												appointmentScheduleDraftFromAppointment={
													appointmentScheduleDraftFromAppointment
												}
												closeAppointmentEditor={closeAppointmentEditor}
												createAppointmentFromDraft={createAppointmentFromDraft}
												dashboard={dashboard}
												editingAppointmentId={editingAppointmentId}
												formatTime={formatTime}
												fromDateTimeLocalValue={fromDateTimeLocalValue}
												lockScheduleAdminSession={() =>
													lockTelegramAdminSession("schedule")
												}
												newAppointmentError={newAppointmentError}
												normalizedAppointmentStatus={normalizedAppointmentStatus}
												normalizedAppointmentStatusFilter={
													normalizedAppointmentStatusFilter
												}
												openAppointmentEditor={openAppointmentEditor}
												openScheduleWarning={openScheduleWarning}
												patientName={patientName}
												recommendedActionPriorityLabels={
													recommendedActionPriorityLabels
												}
												resetNewAppointmentDraft={resetNewAppointmentDraft}
												saveAppointmentSchedule={saveAppointmentSchedule}
												shiftWarnings={shiftWarnings}
												sortedAppointments={sortedAppointments}
												staffRoleLabels={staffRoleLabels}
												scheduleAdminSecretDraft={scheduleAdminSecretDraft}
												scheduleAdminSecretSession={scheduleAdminSecretSession}
												toDateTimeLocalValue={toDateTimeLocalValue}
												unlockScheduleAdminSession={() =>
													unlockTelegramAdminSession("schedule")
												}
												updateAppointmentScheduleDraft={
													updateAppointmentScheduleDraft
												}
												updateNewAppointmentDraft={updateNewAppointmentDraft}
												visibleScheduleSuggestions={visibleScheduleSuggestions}
												loadDashboard={loadDashboard}
											/>
										</ClinicalErrorBoundary>
									</Suspense>
									{/*
              Утренний обзвон живёт в ScheduleView: кнопка «Подтверждения» рядом
              с «Освободившиеся окна» и «Буфер». Второй, всегда открытый
              экземпляр стоял здесь и давал дублирующий запрос к API дневных
              подтверждений; убран, чтобы отметки «обзвонил» не расходились
              между двумя копиями списка.
            */}
								</WorkspaceRouteErrorBoundary>
							) : null}
							{currentView === "patients" ? (
								<WorkspaceRouteErrorBoundary
									view="patients"
									label={viewLabels.patients}
									panelClassName="panel patients-panel"
									panelId="patients"
								>
									<Suspense
										fallback={
											<section
												className="panel patients-panel"
												id="patients"
												aria-label="Пациенты"
												aria-busy="true"
											>
												<div className="panel-heading">
													<h2>Быстрый поиск</h2>
													<span className="status-pill status-planned">
														загрузка
													</span>
												</div>
											</section>
										}
									>
										<PatientsView />
									</Suspense>
								</WorkspaceRouteErrorBoundary>
							) : null}
							{currentView === "visit" ? (
								<WorkspaceRouteErrorBoundary
									view="visit"
									label={viewLabels.visit}
									panelClassName="panel visit-panel"
									panelId="visit"
								>
									<Suspense
										fallback={
											<section
												className="panel visit-panel"
												id="visit"
												aria-label="Текущий прием"
												aria-busy="true"
											>
												<div className="panel-heading">
													<h2>Текущий прием</h2>
													<span className="status-pill status-planned">
														загрузка
													</span>
												</div>
											</section>
										}
									>
										{perspective === "orthodontic" ? (
											<OrthodonticPerspectiveView />
										) : perspective === "presentation" ? (
											<TreatmentPlanModule
												patientId={patientId || "anonymous"}
												patientName={activePatient?.fullName || "Пациент"}
												teethData={(patientId && loadStoredTeethData(patientId)) || []}
											/>
										) : (
											<ClinicalErrorBoundary
												workspaceName="Приём пациента"
												workspaceKey="visit"
												visitId={dashboard?.activeVisit?.id}
											>
												<VisitView />
											</ClinicalErrorBoundary>
										)}
									</Suspense>
								</WorkspaceRouteErrorBoundary>
							) : null}
							{currentView === "documents" ? (
								<WorkspaceRouteErrorBoundary
									view="documents"
									label={viewLabels.documents}
									panelClassName="panel documents-panel"
									panelId="documents"
								>
									<Suspense
										fallback={
											<div
												className="panel documents-panel"
												id="documents"
												aria-busy="true"
											>
												<div className="panel-heading">
													<h2>Документы и согласия</h2>
													<span className="status-pill status-planned">
														загрузка
													</span>
												</div>
											</div>
										}
									>
										<DocumentsView />
									</Suspense>
								</WorkspaceRouteErrorBoundary>
							) : null}
							{currentView === "finance" ? (
								<WorkspaceRouteErrorBoundary
									view="finance"
									label={viewLabels.finance}
									panelClassName="finance-panel border-0 bg-transparent p-0 shadow-none"
									panelId="finance"
								>
									<Suspense
										fallback={
											<section
												className="finance-panel border-0 bg-transparent p-0 shadow-none"
												id="finance"
												aria-label="Финансы"
												aria-busy="true"
											>
												<div className="panel-heading">
													<h2>Оплаты, план лечения и вычет</h2>
													<span className="status-pill status-planned">
														загрузка
													</span>
												</div>
											</section>
										}
									>
										<FinanceView />
									</Suspense>
								</WorkspaceRouteErrorBoundary>
							) : null}
							{currentView === "communications" ? (
								<WorkspaceRouteErrorBoundary
									view="communications"
									label={viewLabels.communications}
									panelClassName="panel communications-panel"
									panelId="communications"
								>
									<Suspense
										fallback={
											<section
												className="panel communications-panel"
												id="communications"
												aria-label="Обращения"
												aria-busy="true"
											>
												<div className="panel-heading">
													<h2>Связь с пациентами</h2>
													<span className="status-pill status-planned">
														загрузка
													</span>
												</div>
											</section>
										}
									>
										<CommunicationsView />
									</Suspense>
								</WorkspaceRouteErrorBoundary>
							) : null}
							{currentView === "analytics" ? (
								<WorkspaceRouteErrorBoundary
									view="analytics"
									label="Аналитика"
									panelClassName="panel analytics-panel"
									panelId="analytics"
								>
									<Suspense
										fallback={
											<div
												className="panel analytics-panel"
												id="analytics"
												aria-busy="true"
											>
												<div className="panel-heading">
													<h2>Executive BI Analytics</h2>
													<span className="status-pill status-planned">
														Загрузка...
													</span>
												</div>
											</div>
										}
									>
										{typeof window === "undefined" || !window.location.hash.includes("payout") ? (
											<AnalyticsDashboardView />
										) : null}
									</Suspense>
									{/*
                Экран выше показывает воронку, доли кресел и когорты; того, по
                чему принимают решения — динамики выручки, доли неявок,
                дебиторки, — там не было.
              */}
									<Suspense fallback={null}>
										{/*
                  Режим клиники решает, какие разрезы показывать: занятость
                  единственного кресла — всегда одно и то же число, выработка
                  единственного врача — одна строка. Таблица правил лежит в
                  lib/clinicCapabilities.ts, а не в сравнениях по разметке.
                */}
										<ManagerReportsPanel
											clinicMode={
												dashboard?.clinicSettings?.profile?.mode ?? null
											}
										/>
									</Suspense>
								</WorkspaceRouteErrorBoundary>
							) : null}
						</section>
					) : null}
					{/*
          ЗДЕСЬ БЫЛ БЛОК «СЛУЖЕБНЫЕ ОГРАНИЧЕНИЯ» — он показывал пользователю наши
          внутренние заметки. Живой ответ /api/dashboard кладёт в
          complianceWarnings три строки, дословно:
            «AI-ответы являются черновиками и требуют подтверждения врача»;
            «Медицинские данные требуют 152-ФЗ, врачебной тайны и аудита доступа»;
            «Для продажи клиникам нужен отдельный EGISZ-адаптер и юридическая
             проверка шаблонов».
          Первые две — общие слова, которые администратору клиники ничего не
          говорят и ни к какому действию не ведут. Третья — заметка о продаже
          продукта: пользователь видел нашу кухню на своём рабочем экране, под
          непонятным заголовком, висевшим сразу на четырёх разделах.
          Настоящие ограничения система показывает там, где они возникают: «нет
          согласия», «документ не подписан», «SMS-шлюз не настроен» — рядом с
          самим действием, а не общим списком внизу страницы.
        */}
					{currentView === "settings" ? (
						<WorkspaceRouteErrorBoundary
							view="settings"
							label={viewLabels.settings}
							panelClassName="settings-zone"
							panelId="settings"
						>
							<Suspense
								fallback={
									<section
										className="settings-zone"
										id="settings"
										aria-label="Настройки"
										aria-busy="true"
									>
										<div className="panel-heading settings-heading">
											<h2>Настройки</h2>
											<span className="status-pill status-planned">
												загрузка
											</span>
										</div>
									</section>
								}
							>
								<SettingsView
									activeStaffUser={activeStaffUser}
									activePatient={activePatient}
									activeSettingsTabButtonRef={activeSettingsTabButtonRef}
									activeSpeechProviderHealth={activeSpeechProviderHealth}
									activeWorkspaceProfile={activeWorkspaceProfile}
									addChair={addChair}
									addStaffMember={addStaffMember}
									analyzePricelist={analyzePricelist}
									applyProtocolTemplate={applyProtocolTemplate}
									attachPricelistImage={attachPricelistImage}
									browserCanRequestPersistentStorage={
										browserCanRequestPersistentStorage
									}
									browserContinuity={browserContinuity}
									browserContinuityChecks={browserContinuityChecks}
									browserContinuityState={browserContinuityState}
									browserContinuityValue={browserContinuityValue}
									browserDirectoryInputRef={browserDirectoryInputRef}
									browserDirectoryPickerAvailable={
										browserDirectoryPickerAvailable
									}
									browserImagingScanProgress={browserImagingScanProgress}
									browserMigrationDiscovery={browserMigrationDiscovery}
									browserMigrationScanProgress={browserMigrationScanProgress}
									browserMigrationInputRef={browserMigrationInputRef}
									browserPickedImagingFolder={browserPickedImagingFolder}
									buildDicomFolderWorkupPlan={buildDicomFolderWorkupPlan}
									buildDicomRenderCachePlan={buildDicomRenderCachePlan}
									buildDicomViewerLaunchManifest={
										buildDicomViewerLaunchManifest
									}
									buildDicomViewerToolStateBundle={
										buildDicomViewerToolStateBundle
									}
									buildDicomViewerWorkbenchManifest={
										buildDicomViewerWorkbenchManifest
									}
									cbctWorkbenchPlanes={cbctWorkbenchPlanes}
									cbctWorkbenchProjections={cbctWorkbenchProjections}
									cbctWorkbenchSeries={cbctWorkbenchSeries}
									cbctWorkbenchTools={cbctWorkbenchTools}
									changeClinicMode={changeClinicMode}
									checkDicomWebConnector={checkDicomWebConnector}
									checkDicomWorkstationReadiness={
										checkDicomWorkstationReadiness
									}
									chooseRecognitionPreset={chooseRecognitionPreset}
									cancelBrowserImagingFolderScan={
										cancelBrowserImagingFolderScan
									}
									cancelBrowserMigrationScan={cancelBrowserMigrationScan}
									clearBrowserPickedImagingFolderPreview={
										clearBrowserPickedImagingFolderPreview
									}
									clearDicomWorkbenchRecovery={clearDicomWorkbenchRecovery}
									clearLocalImagingFolderRecovery={
										clearLocalImagingFolderRecovery
									}
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
									createClinicalRuleFromSettings={
										createClinicalRuleFromSettings
									}
									createTelegramLinkCode={createTelegramLinkCode}
									dashboard={dashboard}
									defaultDicomFirstFrameViewerState={
										defaultDicomFirstFrameViewerState
									}
									dentalMaterialKindLabels={dentalMaterialKindLabels}
									dentalRestorationTypeLabels={dentalRestorationTypeLabels}
									dicomFirstFrameImageStyle={dicomFirstFrameImageStyle}
									dicomFirstFramePreview={dicomFirstFramePreview}
									dicomFirstFrameStatusLabels={dicomFirstFrameStatusLabels}
									dicomFirstFrameViewerState={dicomFirstFrameViewerState}
									dicomFolderSeriesScan={dicomFolderSeriesScan}
									dicomFolderWorkupPathLabels={dicomFolderWorkupPathLabels}
									dicomFolderWorkupPlan={dicomFolderWorkupPlan}
									dicomDiagnosticPixelPolicyLabels={
										dicomDiagnosticPixelPolicyLabels
									}
									dicomExecutionLaneLabels={dicomExecutionLaneLabels}
									dicomGpuClassLabels={dicomGpuClassLabels}
									dicomLabel={dicomLabel}
									dicomLocalFolderDiscovery={dicomLocalFolderDiscovery}
									dicomQualityModeLabels={dicomQualityModeLabels}
									dicomReadinessCheckLabels={dicomReadinessCheckLabels}
									dicomRenderMemoryBudgetClassLabels={
										dicomRenderMemoryBudgetClassLabels
									}
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
									dicomWorkbenchSourceIsRedacted={
										dicomWorkbenchSourceIsRedacted
									}
									dicomWorkstationReadiness={dicomWorkstationReadiness}
									discoverMigrationSources={discoverMigrationSources}
									discoverDicomFolders={discoverDicomFolders}
									documentDetectedKindLabel={documentDetectedKindLabel}
									documentIngestion={documentIngestion}
									documentIngestionQualityLabels={
										documentIngestionQualityLabels
									}
									documentIngestionTarget={documentIngestionTarget}
									documentLabels={documentLabels}
									downloadDicomViewerToolStateBundle={
										downloadDicomViewerToolStateBundle
									}
									downloadDicomWorkbenchManifest={
										downloadDicomWorkbenchManifest
									}
									downloadMigrationHandoffReport={
										downloadMigrationHandoffReport
									}
									downloadPersistenceExport={downloadPersistenceExport}
									downloadSmartImportSafeHandoffReport={
										downloadSmartImportSafeHandoffReport
									}
									downloadSmartImportReport={downloadSmartImportReport}
									downloadTelegramQrSvg={downloadTelegramQrSvg}
									filteredTelegramOutboxItems={filteredTelegramOutboxItems}
									formatByteSize={formatByteSize}
									formatDateTime={formatDateTime}
									formatMegabytes={formatMegabytes}
									formatTime={formatTime}
									handleBrowserDirectoryInputChange={
										handleBrowserDirectoryInputChange
									}
									handleBrowserMigrationInputChange={
										handleBrowserMigrationInputChange
									}
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
									isMigrationHandoffReportLoading={
										isMigrationHandoffReportLoading
									}
									isMigrationSourceDiscovering={isMigrationSourceDiscovering}
									isMigrationSourceProbeLoading={isMigrationSourceProbeLoading}
									isMigrationSourceWorkupLoading={
										isMigrationSourceWorkupLoading
									}
									isPersistenceExporting={isPersistenceExporting}
									isPricelistAnalyzing={isPricelistAnalyzing}
									isRecognitionLoading={isRecognitionLoading}
									isSmartImportCommitting={isSmartImportCommitting}
									isSmartImportLoading={isSmartImportLoading}
									isSmartReportLoading={isSmartReportLoading}
									isSmartSafeReportLoading={isSmartSafeReportLoading}
									isTelegramChatLinksLoadingMore={
										isTelegramChatLinksLoadingMore
									}
									isTelegramLinkCodesLoadingMore={
										isTelegramLinkCodesLoadingMore
									}
									isTelegramLinkCreating={isTelegramLinkCreating}
									isTelegramLoading={isTelegramLoading}
									isTelegramOutboxItemDueForUi={isTelegramOutboxItemDueForUi}
									isTelegramOutboxLoadingMore={isTelegramOutboxLoadingMore}
									isTelegramSendingDue={isTelegramSendingDue}
									isTelegramSettingsSaving={isTelegramSettingsSaving}
									latestDicomWorkbenchServerBundle={
										latestDicomWorkbenchServerBundle
									}
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
									localImagingOrganizerActionLabels={
										localImagingOrganizerActionLabels
									}
									cancelLocalDicomOperation={cancelLocalDicomOperation}
									lookupClinicPublicProfile={lookupClinicPublicProfile}
									lockTelegramAdminSession={() =>
										lockTelegramAdminSession(settingsAdminSecretDomain)
									}
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
									normalizedClinicalRuleSeverity={
										normalizedClinicalRuleSeverity
									}
									normalizedDentalSpecialty={normalizedDentalSpecialty}
									normalizedServiceCategory={normalizedServiceCategory}
									normalizedStaffRole={normalizedStaffRole}
									normalizedTelegramBotMode={normalizedTelegramBotMode}
									normalizedTelegramLinkSubjectType={
										normalizedTelegramLinkSubjectType
									}
									normalizedTelegramOutboxStatusFilter={
										normalizedTelegramOutboxStatusFilter
									}
									normalizedTelegramOutboxTemplateFilter={
										normalizedTelegramOutboxTemplateFilter
									}
									normalizedTelegramPrivacyMode={normalizedTelegramPrivacyMode}
									normalizeUiLanguageInput={normalizeUiLanguageInput}
									ohifBaseUrl={ohifBaseUrl}
									organizeLocalImagingSources={organizeLocalImagingSources}
									persistenceHealth={persistenceHealth}
									persistenceIntegrity={persistenceIntegrity}
									pickBrowserImagingFolder={pickBrowserImagingFolder}
									pickBrowserMigrationSource={pickBrowserMigrationSource}
									policyAuditEventLabels={policyAuditEventLabels}
									prepareDicomWorkbenchFromFolder={
										prepareDicomWorkbenchFromFolder
									}
									previewDicomFirstFrame={previewDicomFirstFrame}
									previewDicomFirstFrameSlice={previewDicomFirstFrameSlice}
									previewDicomSeries={previewDicomSeries}
									planMigrationDiscoveryCandidate={
										planMigrationDiscoveryCandidate
									}
									previewMigrationDiscoveryCandidate={
										previewMigrationDiscoveryCandidate
									}
									previewMigrationAutopilotSources={
										previewMigrationAutopilotSources
									}
									probeMigrationDiscoveryCandidate={
										probeMigrationDiscoveryCandidate
									}
									runMigrationAutopilot={runMigrationAutopilot}
									previewImagingImport={previewImagingImport}
									previewImport={previewImport}
									previewSmartImport={previewSmartImport}
									previewTelegramTemplate={previewTelegramTemplate}
									pricelistAnalysis={pricelistAnalysis}
									pricelistImageBase64={pricelistImageBase64}
									pricelistRecognitionBrandGroups={
										pricelistRecognitionBrandGroups
									}
									pricelistRecognitionServiceGroups={
										pricelistRecognitionServiceGroups
									}
									pricelistSourceKind={pricelistSourceKind}
									pricelistSourceKindLabels={pricelistSourceKindLabels}
									pricelistText={pricelistText}
									recognitionJob={recognitionJob}
									recognitionKind={recognitionKind}
									recognitionPresets={recognitionPresets}
									recognitionTarget={recognitionTarget}
									recognitionTargetLabels={recognitionTargetLabels}
									recognitionText={recognitionText}
									reconnectDicomWorkbenchFromCurrentFolder={
										reconnectDicomWorkbenchFromCurrentFolder
									}
									refreshBrowserContinuity={refreshBrowserContinuity}
									refreshSpeechRuntime={refreshSpeechRuntime}
									clinicPublicLookup={clinicPublicLookup}
									addMigrationDiscoveryCandidateToSmartImport={
										addMigrationDiscoveryCandidateToSmartImport
									}
									rememberLocalImagingFolder={rememberLocalImagingFolder}
									reopenOnboarding={reopenOnboarding}
									requestBrowserStoragePersistence={
										requestBrowserStoragePersistence
									}
									restoreDicomWorkbenchServerBundle={
										restoreDicomWorkbenchServerBundle
									}
									restoreMprWorkbenchLocalDraft={restoreMprWorkbenchLocalDraft}
									revokeTelegramChatLink={revokeTelegramChatLink}
									runRecognitionJob={runRecognitionJob}
									saveChairSchedule={saveChairSchedule}
									saveClinicProfileFromDraft={saveClinicProfileFromDraft}
									saveDicomWorkbenchBundleToServer={
										saveDicomWorkbenchBundleToServer
									}
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
									setDicomViewerWorkbenchManifest={
										setDicomViewerWorkbenchManifest
									}
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
									setCtPlanningActiveQuickActionId={
										setCtPlanningActiveQuickActionId
									}
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
										settingsAdminSecretDomain === "telegram"
											? setTelegramAdminSecretDraft
											: setSettingsAdminSecretDraft
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
									staffScheduleDraftFromWorkingHours={
										staffScheduleDraftFromWorkingHours
									}
									stageLocalImagingFolderRecovery={
										stageLocalImagingFolderRecovery
									}
									startImportDictation={startImportDictation}
									telegramAdminSecretDraft={
										settingsAdminSecretDomain === "telegram"
											? telegramAdminSecretDraft
											: settingsAdminSecretDraft
									}
									telegramAdminSecretSession={
										settingsAdminSecretDomain === "telegram"
											? telegramAdminSecretSession
											: settingsAdminSecretSession
									}
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
									telegramInlineButtonKindLabels={
										telegramInlineButtonKindLabels
									}
									telegramInlineButtonRowsFromReplyMarkup={
										telegramInlineButtonRowsFromReplyMarkup
									}
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
									telegramOutboxStatusFilterLabels={
										telegramOutboxStatusFilterLabels
									}
									telegramOutboxStatusFilterOptions={
										telegramOutboxStatusFilterOptions
									}
									telegramOutboxTemplateFilter={telegramOutboxTemplateFilter}
									telegramOutboxTemplateFilterLabels={
										telegramOutboxTemplateFilterLabels
									}
									telegramOutboxTemplateFilterOptions={
										telegramOutboxTemplateFilterOptions
									}
									telegramOwnBotUsernameDraft={telegramOwnBotUsernameDraft}
									telegramPatientPortalBaseUrlDraft={
										telegramPatientPortalBaseUrlDraft
									}
									telegramPostVisitCheckupDelayDrafts={
										telegramPostVisitCheckupDelayDrafts
									}
									telegramPostVisitCheckupDelayFields={
										telegramPostVisitCheckupDelayFields
									}
									telegramPreview={telegramPreview}
									telegramPrivacyModeDraft={telegramPrivacyModeDraft}
									telegramPrivacyModeHints={telegramPrivacyModeHints}
									telegramPrivacyModeLabels={telegramPrivacyModeLabels}
									telegramQrSvgToDataUrl={telegramQrSvgToDataUrl}
									telegramReminderLeadTimesDraft={
										telegramReminderLeadTimesDraft
									}
									telegramReviewRequestDelayDraft={
										telegramReviewRequestDelayDraft
									}
									telegramReviewUrlDraft={telegramReviewUrlDraft}
									telegramRevokingLinkId={telegramRevokingLinkId}
									telegramSendingItemId={telegramSendingItemId}
									telegramSettingsDirty={telegramSettingsDirty}
									telegramSettingsSaveError={telegramSettingsSaveError}
									telegramSettingsSaveState={telegramSettingsSaveState}
									telegramStaffEscalationChannelDraft={
										telegramStaffEscalationChannelDraft
									}
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
									unlockTelegramAdminSession={() =>
										unlockTelegramAdminSession(settingsAdminSecretDomain)
									}
									updateChairScheduleDay={updateChairScheduleDay}
									updateChairScheduleDraft={updateChairScheduleDraft}
									updateClinicProfileDraft={updateClinicProfileDraft}
									updateStaffScheduleDay={updateStaffScheduleDay}
									updateStaffScheduleDraft={updateStaffScheduleDraft}
									updateTelegramPostVisitCheckupDelayDraft={
										updateTelegramPostVisitCheckupDelayDraft
									}
									updateTelegramVisualCardUrlDraft={
										updateTelegramVisualCardUrlDraft
									}
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
						/*
            ОТКРЫТИЕ «МАРКЕТИНГ/SEO» ГАСИЛО ВСЁ ПРИЛОЖЕНИЕ.
            `clinicProfileDraft` в хранилище объявлен как null и заполняется
            после загрузки клиники, а здесь читалось `clinicProfileDraft.phone`
            без проверки. Пока черновик не пришёл — «Cannot read properties of
            null (reading 'phone')». Причём падение происходило прямо в App, то
            есть ВЫШЕ границы ошибок раздела: экран становился пустым целиком, и
            помогала только перезагрузка страницы. Раздел теперь и сам под
            границей ошибок, как остальные: поломка внутри него не должна
            уносить рабочее место.
          */
						<WorkspaceRouteErrorBoundary
							view="marketing"
							label="Маркетинг/SEO"
							panelClassName="panel marketing-panel"
							panelId="marketing"
						>
							<Suspense
								fallback={<AppLoadingState message="Загрузка маркетинга" />}
							>
								<MarketingView
									clinicName={dashboard.clinicName}
									clinicPhone={clinicProfileDraft?.phone ?? ""}
								/>
							</Suspense>
						</WorkspaceRouteErrorBoundary>
					) : null}
					{/*
          ТРИ РАЗДЕЛА, КОТОРЫЕ БЫЛО НЕЧЕМ ОТКРЫТЬ.
          Склад, журнал стерилизации и воронка обращений отрисовывались только из
          AppRouter.tsx — файла, помеченного в собственной шапке как мёртвый и не
          импортированного ни одним модулем. Экраны проходили сборку и типы,
          сервер отвечал по их адресам, но на экран они не попадали никогда.
          Ветки перенесены сюда, в ту же цепочку по currentView, что и остальные
          разделы, и под ту же границу ошибок: поломка внутри раздела не должна
          уносить рабочее место.
        */}
					{currentView === "inventory" ? (
						<WorkspaceRouteErrorBoundary
							view="inventory"
							label={viewLabels.inventory}
							panelClassName="inventory-panel border-0 bg-transparent p-0 shadow-none"
							panelId="inventory"
						>
							<Suspense
								fallback={<AppLoadingState message="Загрузка склада" />}
							>
								{/*
                Организация берется из профиля клиники — того же поля, по которому
                работают остальные разделы. Выдуманный UUID здесь не подставляется:
                пока профиль не пришел, экран склада показывает свое пустое
                состояние с объяснением, а не чужие остатки.
              */}
								<InventoryView
									organizationId={
										dashboard.clinicSettings?.profile?.organizationId ?? ""
									}
								/>
							</Suspense>
						</WorkspaceRouteErrorBoundary>
					) : null}
					{currentView === "scanner" ? (
						<WorkspaceRouteErrorBoundary
							view="scanner"
							label={viewLabels.scanner}
							panelClassName="panel scanner-panel"
							panelId="scanner"
						>
							<Suspense
								fallback={
									<AppLoadingState message="Загрузка журнала стерилизации" />
								}
							>
								<ScannerView />
							</Suspense>
						</WorkspaceRouteErrorBoundary>
					) : null}
					{currentView === "leads" ? (
						<WorkspaceRouteErrorBoundary
							view="leads"
							label={viewLabels.leads}
							panelClassName="panel leads-panel"
							panelId="leads"
						>
							<Suspense
								fallback={<AppLoadingState message="Загрузка обращений" />}
							>
								<ClinicalErrorBoundary
									workspaceName="Канбан обращений"
									workspaceKey="leads"
								>
									<LeadsKanbanView />
								</ClinicalErrorBoundary>
							</Suspense>
						</WorkspaceRouteErrorBoundary>
					) : null}
					{currentView === "lab" ? (
						<WorkspaceRouteErrorBoundary
							view="lab"
							label={viewLabels.lab}
							panelClassName="panel lab-panel p-2 sm:p-3 overflow-hidden max-w-full"
							panelId="lab"
						>
							<Suspense
								fallback={
									<section
										className="panel lab-panel"
										id="lab"
										aria-label={viewLabels.lab}
										aria-busy="true"
									>
										<div className="panel-heading">
											<h2>{viewLabels.lab}</h2>
										</div>
									</section>
								}
							>
								<LabOrdersPage />
							</Suspense>
						</WorkspaceRouteErrorBoundary>
					) : null}
					<Suspense fallback={null}>
						<VoiceAssistantUI
							onNavigate={(view) => {
								setCurrentView(view);
								window.location.hash = view;
							}}
							onSearchQuery={(q) => {
								setQuery(q);
							}}
							onDateChange={(date) => {
								setScheduleDateFilter(date);
							}}
						/>
					</Suspense>
					<Suspense fallback={null}>
						<Omnibar />
					</Suspense>
					<Suspense fallback={null}>
						<ClinicalGuidanceHost />
					</Suspense>
					<Suspense fallback={null}>
						<A2hsPromptModal />
					</Suspense>
				</section>
				<MobileTabBar
					currentView={currentView}
					onSelectView={(view) => {
						setCurrentView(view);
						window.location.hash = view;
					}}
					onViewIntent={preloadWorkspaceView}
					allowedViews={getFilteredAppViews(selectedWorkspaceRole)}
				/>
				{isCbctTunerOpen && (
					<Suspense fallback={null}>
						<CbctTunerPlayground
							isOpen={true}
							onClose={() => {
								setIsCbctTunerOpen(false);
								const url = new URL(window.location.href);
								url.searchParams.delete("cbct");
								window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + (url.hash && !url.hash.includes("cbct") ? url.hash : ""));
							}}
						/>
					</Suspense>
				)}
				{isCbctDirectModalOpen && (
					<Suspense fallback={null}>
						<CbctMprImplantStudioModal
							isOpen={true}
							onClose={() => {
								setIsCbctDirectModalOpen(false);
								const url = new URL(window.location.href);
								url.searchParams.delete("cbct");
								window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + (url.hash && !url.hash.includes("cbct") ? url.hash : ""));
							}}
							patientName="Захаров Иван Дмитриевич (Демо 3D КЛКТ 312 срезов)"
							patientId="demo_cbct_patient"
							autoLoadDemo={true}
						/>
					</Suspense>
				)}
				{isConsentDirectModalOpen && (
					<InformedConsentModal
						isOpen={true}
						onClose={() => {
							setIsConsentDirectModalOpen(false);
							const url = new URL(window.location.href);
							url.searchParams.delete("consent");
							window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + (url.hash && !url.hash.includes("consent") ? url.hash : ""));
						}}
						initialMode="packages"
						initialPackageKey="PACKAGE_PRIMARY_VISIT"
						initialVerificationMethod="tablet_stylus"
						patient={{
							fullName: "Ковалёв Роман Станиславович",
							birthDate: "12.04.1988",
							passport: "45 10 № 884721",
							phone: "+7 (999) 888-77-66",
							address: "г. Москва, ул. Арбат, д. 24, кв. 12",
						}}
						doctorName="Д-р Воронов Алексей Владимирович"
						doctorSpecialty="Стоматолог-терапевт"
						diagnosisIcd="K02.1 Кариес дентина"
						toothNumbers="3.6"
					/>
				)}
				{isEgiszRemdModalOpen && (
					<Suspense fallback={null}>
						<EgiszRemdHubModal
							isOpen={true}
							onClose={() => {
								setIsEgiszRemdModalOpen(false);
								const url = new URL(window.location.href);
								url.searchParams.delete("egisz");
								url.searchParams.delete("remd");
								url.searchParams.delete("semd");
								window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + (url.hash && !url.hash.includes("egisz") && !url.hash.includes("remd") ? url.hash : ""));
							}}
							initialDocType="cda_semd"
							initialTab={((typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null) as any) ?? "signature"}
						/>
					</Suspense>
				)}
				<DoctorPrivacyShield
					isOpen={isPrivacyShieldActive}
					doctor={activeStaffUser}
					onUnlock={(unlockedUser) => {
						if (unlockedUser) {
							setActiveStaffUser(unlockedUser);
						}
						setIsPrivacyShieldActive(false);
						safeLocalStorageRemoveItem(DENTE_PRIVACY_SHIELD_LOCKED_KEY);
					}}
					onClinicLogout={handleClinicLogout}
					onFullLock={handleFullStaffLock}
				/>
			</main>
		</AuthProvider>
	</AppLogicProvider>
	);
}

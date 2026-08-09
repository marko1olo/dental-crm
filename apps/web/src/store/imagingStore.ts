import type {
	DicomFirstFramePreviewResponse,
	DicomFolderSeriesPreviewResponse,
	DicomFolderWorkupPlanResponse,
	DicomLocalFolderDiscoveryResponse,
	DicomRenderCachePlanResponse,
	DicomSeriesPreviewResponse,
	DicomViewerLaunchManifestResponse,
	DicomViewerToolStateBundleResponse,
	DicomViewerWorkbenchManifestResponse,
	DicomWebConnectorCheckResponse,
	DicomWorkbenchBundle,
	DicomWorkstationReadinessResponse,
	ImagingFolderScanResponse,
	ImagingImportCommitResponse,
	ImagingImportPreviewResponse,
	ImagingSourceKind,
	ImagingStudyKind,
	ImagingViewerAnnotation,
	ImagingViewerImplantPlan,
	ImagingViewerSessionResponse,
	ImagingViewerState,
	ImagingViewerTool,
	LocalImagingOrganizerResponse,
	MprProjection,
	MprWindowPreset,
} from "@dental/shared";
import { create } from "zustand";
import type {
	BrowserImagingScanProgress,
	BrowserPickedImagingFolderPreview,
	ImagingViewerSaveState,
	LocalImagingFolderDraft,
} from "../AppConstants";
import {
	defaultDicomFirstFrameViewerState,
	defaultImagingViewerState,
} from "../utils/draftDefaults";
import {
	defaultUiPreferences,
	loadUiPreferences,
} from "../utils/preferencesUtils";
import { resolveUpdater } from "./updater";

// БЫЛО: настройки брались из initialUiPreferences — заглушки `{} as any` в
// AppHelpers. Все поля были undefined, поэтому фильтр снимков сравнивался с
// undefined и раздел «Снимки» открывался ПУСТЫМ, хотя исследования есть.
// Остальные сторы считают начальные настройки локально — делаем так же.
const initialUiPreferences = loadUiPreferences() ?? defaultUiPreferences;

export interface ImagingStore {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	imagingImportText: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setImagingImportText: (val: any | ((prev: any) => any)) => void;
	imagingImportSourceKind: ImagingSourceKind;
	setImagingImportSourceKind: (
		val: ImagingSourceKind | ((prev: ImagingSourceKind) => ImagingSourceKind),
	) => void;
	localImagingFolderDraft: LocalImagingFolderDraft | null;
	setLocalImagingFolderDraft: (
		val:
			| LocalImagingFolderDraft
			| null
			| ((
					prev: LocalImagingFolderDraft | null,
			  ) => LocalImagingFolderDraft | null),
	) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	imagingFolderPath: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setImagingFolderPath: (val: any | ((prev: any) => any)) => void;
	browserPickedImagingFolder: BrowserPickedImagingFolderPreview | null;
	setBrowserPickedImagingFolder: (
		val:
			| BrowserPickedImagingFolderPreview
			| null
			| ((
					prev: BrowserPickedImagingFolderPreview | null,
			  ) => BrowserPickedImagingFolderPreview | null),
	) => void;
	browserImagingScanProgress: BrowserImagingScanProgress | null;
	setBrowserImagingScanProgress: (
		val:
			| BrowserImagingScanProgress
			| null
			| ((
					prev: BrowserImagingScanProgress | null,
			  ) => BrowserImagingScanProgress | null),
	) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	browserDirectoryPickerAvailable: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setBrowserDirectoryPickerAvailable: (val: any | ((prev: any) => any)) => void;
	imagingImportPreview: ImagingImportPreviewResponse | null;
	setImagingImportPreview: (
		val:
			| ImagingImportPreviewResponse
			| null
			| ((
					prev: ImagingImportPreviewResponse | null,
			  ) => ImagingImportPreviewResponse | null),
	) => void;
	imagingImportCommit: ImagingImportCommitResponse | null;
	setImagingImportCommit: (
		val:
			| ImagingImportCommitResponse
			| null
			| ((
					prev: ImagingImportCommitResponse | null,
			  ) => ImagingImportCommitResponse | null),
	) => void;
	imagingFolderScan: ImagingFolderScanResponse | null;
	setImagingFolderScan: (
		val:
			| ImagingFolderScanResponse
			| null
			| ((
					prev: ImagingFolderScanResponse | null,
			  ) => ImagingFolderScanResponse | null),
	) => void;
	dicomLocalFolderDiscovery: DicomLocalFolderDiscoveryResponse | null;
	setDicomLocalFolderDiscovery: (
		val:
			| DicomLocalFolderDiscoveryResponse
			| null
			| ((
					prev: DicomLocalFolderDiscoveryResponse | null,
			  ) => DicomLocalFolderDiscoveryResponse | null),
	) => void;
	localImagingOrganizer: LocalImagingOrganizerResponse | null;
	setLocalImagingOrganizer: (
		val:
			| LocalImagingOrganizerResponse
			| null
			| ((
					prev: LocalImagingOrganizerResponse | null,
			  ) => LocalImagingOrganizerResponse | null),
	) => void;
	dicomSeriesPreview: DicomSeriesPreviewResponse | null;
	setDicomSeriesPreview: (
		val:
			| DicomSeriesPreviewResponse
			| null
			| ((
					prev: DicomSeriesPreviewResponse | null,
			  ) => DicomSeriesPreviewResponse | null),
	) => void;
	dicomFolderSeriesScan: DicomFolderSeriesPreviewResponse | null;
	setDicomFolderSeriesScan: (
		val:
			| DicomFolderSeriesPreviewResponse
			| null
			| ((
					prev: DicomFolderSeriesPreviewResponse | null,
			  ) => DicomFolderSeriesPreviewResponse | null),
	) => void;
	dicomFolderWorkupPlan: DicomFolderWorkupPlanResponse | null;
	setDicomFolderWorkupPlan: (
		val:
			| DicomFolderWorkupPlanResponse
			| null
			| ((
					prev: DicomFolderWorkupPlanResponse | null,
			  ) => DicomFolderWorkupPlanResponse | null),
	) => void;
	dicomFirstFramePreview: DicomFirstFramePreviewResponse | null;
	setDicomFirstFramePreview: (
		val:
			| DicomFirstFramePreviewResponse
			| null
			| ((
					prev: DicomFirstFramePreviewResponse | null,
			  ) => DicomFirstFramePreviewResponse | null),
	) => void;
	dicomFirstFrameViewerState: ImagingViewerState;
	setDicomFirstFrameViewerState: (
		val:
			| ImagingViewerState
			| ((prev: ImagingViewerState) => ImagingViewerState),
	) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	dicomWebEndpointUrl: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setDicomWebEndpointUrl: (val: any | ((prev: any) => any)) => void;
	dicomWebCheck: DicomWebConnectorCheckResponse | null;
	setDicomWebCheck: (
		val:
			| DicomWebConnectorCheckResponse
			| null
			| ((
					prev: DicomWebConnectorCheckResponse | null,
			  ) => DicomWebConnectorCheckResponse | null),
	) => void;
	dicomViewerLaunchManifest: DicomViewerLaunchManifestResponse | null;
	setDicomViewerLaunchManifest: (
		val:
			| DicomViewerLaunchManifestResponse
			| null
			| ((
					prev: DicomViewerLaunchManifestResponse | null,
			  ) => DicomViewerLaunchManifestResponse | null),
	) => void;
	dicomViewerToolStateBundle: DicomViewerToolStateBundleResponse | null;
	setDicomViewerToolStateBundle: (
		val:
			| DicomViewerToolStateBundleResponse
			| null
			| ((
					prev: DicomViewerToolStateBundleResponse | null,
			  ) => DicomViewerToolStateBundleResponse | null),
	) => void;
	dicomViewerWorkbenchManifest: DicomViewerWorkbenchManifestResponse | null;
	setDicomViewerWorkbenchManifest: (
		val:
			| DicomViewerWorkbenchManifestResponse
			| null
			| ((
					prev: DicomViewerWorkbenchManifestResponse | null,
			  ) => DicomViewerWorkbenchManifestResponse | null),
	) => void;
	dicomWorkbenchLocalSavedAt: string | null;
	setDicomWorkbenchLocalSavedAt: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	dicomWorkbenchServerBundle: DicomWorkbenchBundle | null;
	setDicomWorkbenchServerBundle: (
		val:
			| DicomWorkbenchBundle
			| null
			| ((prev: DicomWorkbenchBundle | null) => DicomWorkbenchBundle | null),
	) => void;
	dicomWorkbenchServerBundles: DicomWorkbenchBundle[];
	setDicomWorkbenchServerBundles: (
		val:
			| DicomWorkbenchBundle[]
			| ((prev: DicomWorkbenchBundle[]) => DicomWorkbenchBundle[]),
	) => void;
	dicomWorkstationReadiness: DicomWorkstationReadinessResponse | null;
	setDicomWorkstationReadiness: (
		val:
			| DicomWorkstationReadinessResponse
			| null
			| ((
					prev: DicomWorkstationReadinessResponse | null,
			  ) => DicomWorkstationReadinessResponse | null),
	) => void;
	dicomRenderCachePlan: DicomRenderCachePlanResponse | null;
	setDicomRenderCachePlan: (
		val:
			| DicomRenderCachePlanResponse
			| null
			| ((
					prev: DicomRenderCachePlanResponse | null,
			  ) => DicomRenderCachePlanResponse | null),
	) => void;
	selectedImagingStudyId: string | null;
	setSelectedImagingStudyId: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	imagingKindFilter: ImagingStudyKind | "all";
	setImagingKindFilter: (
		val:
			| ImagingStudyKind
			| "all"
			| ((prev: ImagingStudyKind | "all") => ImagingStudyKind | "all"),
	) => void;
	imagingViewerState: ImagingViewerState;
	setImagingViewerState: (
		val:
			| ImagingViewerState
			| ((prev: ImagingViewerState) => ImagingViewerState),
	) => void;
	imagingViewerActiveTool: ImagingViewerTool;
	setImagingViewerActiveTool: (
		val: ImagingViewerTool | ((prev: ImagingViewerTool) => ImagingViewerTool),
	) => void;
	ctPlanningActiveQuickActionId: string | null;
	setCtPlanningActiveQuickActionId: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	ctPlanningImplantPlan: ImagingViewerImplantPlan | null;
	setCtPlanningImplantPlan: (
		val:
			| ImagingViewerImplantPlan
			| null
			| ((
					prev: ImagingViewerImplantPlan | null,
			  ) => ImagingViewerImplantPlan | null),
	) => void;
	imagingViewerAnnotations: ImagingViewerAnnotation[];
	setImagingViewerAnnotations: (
		val:
			| ImagingViewerAnnotation[]
			| ((prev: ImagingViewerAnnotation[]) => ImagingViewerAnnotation[]),
	) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	imagingViewerNote: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setImagingViewerNote: (val: any | ((prev: any) => any)) => void;
	imagingViewerSession: ImagingViewerSessionResponse["session"] | null;
	setImagingViewerSession: (
		val:
			| ImagingViewerSessionResponse["session"]
			| null
			| ((
					prev: ImagingViewerSessionResponse["session"] | null,
			  ) => ImagingViewerSessionResponse["session"] | null),
	) => void;
	imagingViewerSaveState: ImagingViewerSaveState;
	setImagingViewerSaveState: (
		val:
			| ImagingViewerSaveState
			| ((prev: ImagingViewerSaveState) => ImagingViewerSaveState),
	) => void;
	imagingViewerLocalSavedAt: string | null;
	setImagingViewerLocalSavedAt: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	imagingViewerSaveError: string | null;
	setImagingViewerSaveError: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	imagingViewerSessionReady: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setImagingViewerSessionReady: (val: any | ((prev: any) => any)) => void;
	mprProjection: MprProjection;
	setMprProjection: (
		val: MprProjection | ((prev: MprProjection) => MprProjection),
	) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	mprAxisDeg: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setMprAxisDeg: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	mprSlabMm: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setMprSlabMm: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	mprSliceIndex: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setMprSliceIndex: (val: any | ((prev: any) => any)) => void;
	mprWindowPreset: MprWindowPreset;
	setMprWindowPreset: (
		val: MprWindowPreset | ((prev: MprWindowPreset) => MprWindowPreset),
	) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	mprCrosshairEnabled: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setMprCrosshairEnabled: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	mprLinkedPlanesEnabled: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setMprLinkedPlanesEnabled: (val: any | ((prev: any) => any)) => void;
	mprWorkbenchLocalSavedAt: string | null;
	setMprWorkbenchLocalSavedAt: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	mprWorkbenchDraftRestored: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setMprWorkbenchDraftRestored: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isImagingImportLoading: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsImagingImportLoading: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isImagingImportCommitting: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsImagingImportCommitting: (val: any | ((prev: any) => any)) => void;
	imagingCreateSavingKind: ImagingStudyKind | null;
	setImagingCreateSavingKind: (
		val:
			| ImagingStudyKind
			| null
			| ((prev: ImagingStudyKind | null) => ImagingStudyKind | null),
	) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isImagingFolderScanning: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsImagingFolderScanning: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isDicomLocalDiscovering: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsDicomLocalDiscovering: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isLocalImagingOrganizing: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsLocalImagingOrganizing: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isDicomSeriesPreviewLoading: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsDicomSeriesPreviewLoading: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isDicomWebChecking: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsDicomWebChecking: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isDicomManifestBuilding: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsDicomManifestBuilding: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isDicomToolStateBuilding: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsDicomToolStateBuilding: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isDicomWorkbenchBuilding: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsDicomWorkbenchBuilding: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isDicomWorkbenchServerSaving: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsDicomWorkbenchServerSaving: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isDicomWorkbenchReconnecting: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsDicomWorkbenchReconnecting: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isDicomWorkstationChecking: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsDicomWorkstationChecking: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isDicomRenderCachePlanning: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsDicomRenderCachePlanning: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isDicomFolderWorkupPlanning: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsDicomFolderWorkupPlanning: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isDicomFirstFramePreviewing: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsDicomFirstFramePreviewing: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isBrowserImagingFolderPicking: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsBrowserImagingFolderPicking: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isLocalDicomOperationActive: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsLocalDicomOperationActive: (val: any | ((prev: any) => any)) => void;
	reset: () => void;
}

export const useImagingStore = create<ImagingStore>((set) => ({
	imagingImportText:
		"ФИО;Телефон;Тип;Зуб;Дата;Файл;Источник\nИванова Марина Сергеевна;+7 927 111-22-33;RVG;36;12.05.2026;C:\\Images\\ivanova_36.dcm;локальный RVG-датчик\nИванова Марина Сергеевна;+7 927 111-22-33;ТРГ;;10.05.2026;C:\\Images\\ivanova_ceph.ima;экспорт Sidexis\nПетров Алексей Николаевич;+7 927 555-19-40;ОПТГ;;10.05.2026;C:\\Images\\petrov_opg.jpg;экспорт ОПТГ",
	imagingImportSourceKind: initialUiPreferences.imagingImportSourceKind,
	localImagingFolderDraft: null,
	imagingFolderPath: "C:\\Images",
	browserPickedImagingFolder: null,
	browserImagingScanProgress: null,
	browserDirectoryPickerAvailable: null,
	imagingImportPreview: null,
	imagingImportCommit: null,
	imagingFolderScan: null,
	dicomLocalFolderDiscovery: null,
	localImagingOrganizer: null,
	dicomSeriesPreview: null,
	dicomFolderSeriesScan: null,
	dicomFolderWorkupPlan: null,
	dicomFirstFramePreview: null,
	dicomFirstFrameViewerState: defaultDicomFirstFrameViewerState,
	dicomWebEndpointUrl: initialUiPreferences.dicomWebEndpointUrl,
	dicomWebCheck: null,
	dicomViewerLaunchManifest: null,
	dicomViewerToolStateBundle: null,
	dicomViewerWorkbenchManifest: null,
	dicomWorkbenchLocalSavedAt: null,
	dicomWorkbenchServerBundle: null,
	dicomWorkbenchServerBundles: [],
	dicomWorkstationReadiness: null,
	dicomRenderCachePlan: null,
	selectedImagingStudyId: null,
	imagingKindFilter: initialUiPreferences.imagingKindFilter,
	imagingViewerState: defaultImagingViewerState,
	imagingViewerActiveTool: "window_level",
	ctPlanningActiveQuickActionId: null,
	ctPlanningImplantPlan: null,
	imagingViewerAnnotations: [],
	imagingViewerNote: "",
	imagingViewerSession: null,
	imagingViewerSaveState: "idle",
	imagingViewerLocalSavedAt: null,
	imagingViewerSaveError: null,
	imagingViewerSessionReady: false,
	mprProjection: "axial",
	mprAxisDeg: 0,
	mprSlabMm: 1,
	mprSliceIndex: 0,
	mprWindowPreset: "bone",
	mprCrosshairEnabled: true,
	mprLinkedPlanesEnabled: true,
	mprWorkbenchLocalSavedAt: null,
	mprWorkbenchDraftRestored: false,
	isImagingImportLoading: false,
	isImagingImportCommitting: false,
	imagingCreateSavingKind: null,
	isImagingFolderScanning: false,
	isDicomLocalDiscovering: false,
	isLocalImagingOrganizing: false,
	isDicomSeriesPreviewLoading: false,
	isDicomWebChecking: false,
	isDicomManifestBuilding: false,
	isDicomToolStateBuilding: false,
	isDicomWorkbenchBuilding: false,
	isDicomWorkbenchServerSaving: false,
	isDicomWorkbenchReconnecting: false,
	isDicomWorkstationChecking: false,
	isDicomRenderCachePlanning: false,
	isDicomFolderWorkupPlanning: false,
	isDicomFirstFramePreviewing: false,
	isBrowserImagingFolderPicking: false,
	isLocalDicomOperationActive: false,
	setImagingImportText: (val) =>
		set((state) => ({
			imagingImportText: resolveUpdater(val, state.imagingImportText),
		})),
	setImagingImportSourceKind: (val) =>
		set((state) => ({
			imagingImportSourceKind: resolveUpdater(
				val,
				state.imagingImportSourceKind,
			),
		})),
	setLocalImagingFolderDraft: (val) =>
		set((state) => ({
			localImagingFolderDraft: resolveUpdater(
				val,
				state.localImagingFolderDraft,
			),
		})),
	setImagingFolderPath: (val) =>
		set((state) => ({
			imagingFolderPath: resolveUpdater(val, state.imagingFolderPath),
		})),
	setBrowserPickedImagingFolder: (val) =>
		set((state) => ({
			browserPickedImagingFolder: resolveUpdater(
				val,
				state.browserPickedImagingFolder,
			),
		})),
	setBrowserImagingScanProgress: (val) =>
		set((state) => ({
			browserImagingScanProgress: resolveUpdater(
				val,
				state.browserImagingScanProgress,
			),
		})),
	setBrowserDirectoryPickerAvailable: (val) =>
		set((state) => ({
			browserDirectoryPickerAvailable: resolveUpdater(
				val,
				state.browserDirectoryPickerAvailable,
			),
		})),
	setImagingImportPreview: (val) =>
		set((state) => ({
			imagingImportPreview: resolveUpdater(val, state.imagingImportPreview),
		})),
	setImagingImportCommit: (val) =>
		set((state) => ({
			imagingImportCommit: resolveUpdater(val, state.imagingImportCommit),
		})),
	setImagingFolderScan: (val) =>
		set((state) => ({
			imagingFolderScan: resolveUpdater(val, state.imagingFolderScan),
		})),
	setDicomLocalFolderDiscovery: (val) =>
		set((state) => ({
			dicomLocalFolderDiscovery: resolveUpdater(
				val,
				state.dicomLocalFolderDiscovery,
			),
		})),
	setLocalImagingOrganizer: (val) =>
		set((state) => ({
			localImagingOrganizer: resolveUpdater(val, state.localImagingOrganizer),
		})),
	setDicomSeriesPreview: (val) =>
		set((state) => ({
			dicomSeriesPreview: resolveUpdater(val, state.dicomSeriesPreview),
		})),
	setDicomFolderSeriesScan: (val) =>
		set((state) => ({
			dicomFolderSeriesScan: resolveUpdater(val, state.dicomFolderSeriesScan),
		})),
	setDicomFolderWorkupPlan: (val) =>
		set((state) => ({
			dicomFolderWorkupPlan: resolveUpdater(val, state.dicomFolderWorkupPlan),
		})),
	setDicomFirstFramePreview: (val) =>
		set((state) => ({
			dicomFirstFramePreview: resolveUpdater(val, state.dicomFirstFramePreview),
		})),
	setDicomFirstFrameViewerState: (val) =>
		set((state) => ({
			dicomFirstFrameViewerState: resolveUpdater(
				val,
				state.dicomFirstFrameViewerState,
			),
		})),
	setDicomWebEndpointUrl: (val) =>
		set((state) => ({
			dicomWebEndpointUrl: resolveUpdater(val, state.dicomWebEndpointUrl),
		})),
	setDicomWebCheck: (val) =>
		set((state) => ({
			dicomWebCheck: resolveUpdater(val, state.dicomWebCheck),
		})),
	setDicomViewerLaunchManifest: (val) =>
		set((state) => ({
			dicomViewerLaunchManifest: resolveUpdater(
				val,
				state.dicomViewerLaunchManifest,
			),
		})),
	setDicomViewerToolStateBundle: (val) =>
		set((state) => ({
			dicomViewerToolStateBundle: resolveUpdater(
				val,
				state.dicomViewerToolStateBundle,
			),
		})),
	setDicomViewerWorkbenchManifest: (val) =>
		set((state) => ({
			dicomViewerWorkbenchManifest: resolveUpdater(
				val,
				state.dicomViewerWorkbenchManifest,
			),
		})),
	setDicomWorkbenchLocalSavedAt: (val) =>
		set((state) => ({
			dicomWorkbenchLocalSavedAt: resolveUpdater(
				val,
				state.dicomWorkbenchLocalSavedAt,
			),
		})),
	setDicomWorkbenchServerBundle: (val) =>
		set((state) => ({
			dicomWorkbenchServerBundle: resolveUpdater(
				val,
				state.dicomWorkbenchServerBundle,
			),
		})),
	setDicomWorkbenchServerBundles: (val) =>
		set((state) => ({
			dicomWorkbenchServerBundles: resolveUpdater(
				val,
				state.dicomWorkbenchServerBundles,
			),
		})),
	setDicomWorkstationReadiness: (val) =>
		set((state) => ({
			dicomWorkstationReadiness: resolveUpdater(
				val,
				state.dicomWorkstationReadiness,
			),
		})),
	setDicomRenderCachePlan: (val) =>
		set((state) => ({
			dicomRenderCachePlan: resolveUpdater(val, state.dicomRenderCachePlan),
		})),
	setSelectedImagingStudyId: (val) =>
		set((state) => ({
			selectedImagingStudyId: resolveUpdater(val, state.selectedImagingStudyId),
		})),
	setImagingKindFilter: (val) =>
		set((state) => ({
			imagingKindFilter: resolveUpdater(val, state.imagingKindFilter),
		})),
	setImagingViewerState: (val) =>
		set((state) => ({
			imagingViewerState: resolveUpdater(val, state.imagingViewerState),
		})),
	setImagingViewerActiveTool: (val) =>
		set((state) => ({
			imagingViewerActiveTool: resolveUpdater(
				val,
				state.imagingViewerActiveTool,
			),
		})),
	setCtPlanningActiveQuickActionId: (val) =>
		set((state) => ({
			ctPlanningActiveQuickActionId: resolveUpdater(
				val,
				state.ctPlanningActiveQuickActionId,
			),
		})),
	setCtPlanningImplantPlan: (val) =>
		set((state) => ({
			ctPlanningImplantPlan: resolveUpdater(val, state.ctPlanningImplantPlan),
		})),
	setImagingViewerAnnotations: (val) =>
		set((state) => ({
			imagingViewerAnnotations: resolveUpdater(
				val,
				state.imagingViewerAnnotations,
			),
		})),
	setImagingViewerNote: (val) =>
		set((state) => ({
			imagingViewerNote: resolveUpdater(val, state.imagingViewerNote),
		})),
	setImagingViewerSession: (val) =>
		set((state) => ({
			imagingViewerSession: resolveUpdater(val, state.imagingViewerSession),
		})),
	setImagingViewerSaveState: (val) =>
		set((state) => ({
			imagingViewerSaveState: resolveUpdater(val, state.imagingViewerSaveState),
		})),
	setImagingViewerLocalSavedAt: (val) =>
		set((state) => ({
			imagingViewerLocalSavedAt: resolveUpdater(
				val,
				state.imagingViewerLocalSavedAt,
			),
		})),
	setImagingViewerSaveError: (val) =>
		set((state) => ({
			imagingViewerSaveError: resolveUpdater(val, state.imagingViewerSaveError),
		})),
	setImagingViewerSessionReady: (val) =>
		set((state) => ({
			imagingViewerSessionReady: resolveUpdater(
				val,
				state.imagingViewerSessionReady,
			),
		})),
	setMprProjection: (val) =>
		set((state) => ({
			mprProjection: resolveUpdater(val, state.mprProjection),
		})),
	setMprAxisDeg: (val) =>
		set((state) => ({
			mprAxisDeg: resolveUpdater(val, state.mprAxisDeg),
		})),
	setMprSlabMm: (val) =>
		set((state) => ({
			mprSlabMm: resolveUpdater(val, state.mprSlabMm),
		})),
	setMprSliceIndex: (val) =>
		set((state) => ({
			mprSliceIndex: resolveUpdater(val, state.mprSliceIndex),
		})),
	setMprWindowPreset: (val) =>
		set((state) => ({
			mprWindowPreset: resolveUpdater(val, state.mprWindowPreset),
		})),
	setMprCrosshairEnabled: (val) =>
		set((state) => ({
			mprCrosshairEnabled: resolveUpdater(val, state.mprCrosshairEnabled),
		})),
	setMprLinkedPlanesEnabled: (val) =>
		set((state) => ({
			mprLinkedPlanesEnabled: resolveUpdater(val, state.mprLinkedPlanesEnabled),
		})),
	setMprWorkbenchLocalSavedAt: (val) =>
		set((state) => ({
			mprWorkbenchLocalSavedAt: resolveUpdater(
				val,
				state.mprWorkbenchLocalSavedAt,
			),
		})),
	setMprWorkbenchDraftRestored: (val) =>
		set((state) => ({
			mprWorkbenchDraftRestored: resolveUpdater(
				val,
				state.mprWorkbenchDraftRestored,
			),
		})),
	setIsImagingImportLoading: (val) =>
		set((state) => ({
			isImagingImportLoading: resolveUpdater(val, state.isImagingImportLoading),
		})),
	setIsImagingImportCommitting: (val) =>
		set((state) => ({
			isImagingImportCommitting: resolveUpdater(
				val,
				state.isImagingImportCommitting,
			),
		})),
	setImagingCreateSavingKind: (val) =>
		set((state) => ({
			imagingCreateSavingKind: resolveUpdater(
				val,
				state.imagingCreateSavingKind,
			),
		})),
	setIsImagingFolderScanning: (val) =>
		set((state) => ({
			isImagingFolderScanning: resolveUpdater(
				val,
				state.isImagingFolderScanning,
			),
		})),
	setIsDicomLocalDiscovering: (val) =>
		set((state) => ({
			isDicomLocalDiscovering: resolveUpdater(
				val,
				state.isDicomLocalDiscovering,
			),
		})),
	setIsLocalImagingOrganizing: (val) =>
		set((state) => ({
			isLocalImagingOrganizing: resolveUpdater(
				val,
				state.isLocalImagingOrganizing,
			),
		})),
	setIsDicomSeriesPreviewLoading: (val) =>
		set((state) => ({
			isDicomSeriesPreviewLoading: resolveUpdater(
				val,
				state.isDicomSeriesPreviewLoading,
			),
		})),
	setIsDicomWebChecking: (val) =>
		set((state) => ({
			isDicomWebChecking: resolveUpdater(val, state.isDicomWebChecking),
		})),
	setIsDicomManifestBuilding: (val) =>
		set((state) => ({
			isDicomManifestBuilding: resolveUpdater(
				val,
				state.isDicomManifestBuilding,
			),
		})),
	setIsDicomToolStateBuilding: (val) =>
		set((state) => ({
			isDicomToolStateBuilding: resolveUpdater(
				val,
				state.isDicomToolStateBuilding,
			),
		})),
	setIsDicomWorkbenchBuilding: (val) =>
		set((state) => ({
			isDicomWorkbenchBuilding: resolveUpdater(
				val,
				state.isDicomWorkbenchBuilding,
			),
		})),
	setIsDicomWorkbenchServerSaving: (val) =>
		set((state) => ({
			isDicomWorkbenchServerSaving: resolveUpdater(
				val,
				state.isDicomWorkbenchServerSaving,
			),
		})),
	setIsDicomWorkbenchReconnecting: (val) =>
		set((state) => ({
			isDicomWorkbenchReconnecting: resolveUpdater(
				val,
				state.isDicomWorkbenchReconnecting,
			),
		})),
	setIsDicomWorkstationChecking: (val) =>
		set((state) => ({
			isDicomWorkstationChecking: resolveUpdater(
				val,
				state.isDicomWorkstationChecking,
			),
		})),
	setIsDicomRenderCachePlanning: (val) =>
		set((state) => ({
			isDicomRenderCachePlanning: resolveUpdater(
				val,
				state.isDicomRenderCachePlanning,
			),
		})),
	setIsDicomFolderWorkupPlanning: (val) =>
		set((state) => ({
			isDicomFolderWorkupPlanning: resolveUpdater(
				val,
				state.isDicomFolderWorkupPlanning,
			),
		})),
	setIsDicomFirstFramePreviewing: (val) =>
		set((state) => ({
			isDicomFirstFramePreviewing: resolveUpdater(
				val,
				state.isDicomFirstFramePreviewing,
			),
		})),
	setIsBrowserImagingFolderPicking: (val) =>
		set((state) => ({
			isBrowserImagingFolderPicking: resolveUpdater(
				val,
				state.isBrowserImagingFolderPicking,
			),
		})),
	setIsLocalDicomOperationActive: (val) =>
		set((state) => ({
			isLocalDicomOperationActive: resolveUpdater(
				val,
				state.isLocalDicomOperationActive,
			),
		})),
	reset: () =>
		set({
			imagingImportPreview: null,
			imagingImportCommit: null,
			imagingFolderScan: null,
			dicomLocalFolderDiscovery: null,
			localImagingOrganizer: null,
			dicomSeriesPreview: null,
			dicomFolderSeriesScan: null,
			dicomFolderWorkupPlan: null,
			dicomFirstFramePreview: null,
			selectedImagingStudyId: null,
			imagingViewerState: defaultImagingViewerState,
			dicomFirstFrameViewerState: defaultDicomFirstFrameViewerState,
			imagingViewerAnnotations: [],
			imagingViewerSession: null,
			ctPlanningImplantPlan: null,
		}),
}));

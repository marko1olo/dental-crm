import type React from "react";
import type {
	CbctVoxelVolume,
	Point3D,
	SlabProjectionMode,
	ObliqueRotationAngles,
	ViewportTransform,
	CbctMeasurementRuler,
	CbctAngleMeasurement,
	CbctViewportType,
} from "../cbctMprMath.js";
import type {
	CrossSectionSliceData,
	DentalArchCurve,
} from "../dentalCurveEngine.js";
import type {
	ImplantBrandKey,
	VirtualImplantSpec,
	CrossSectionImplantPose,
	Implant3DWorldProjection,
	NerveSafetyAuditResult,
} from "../implantSafetyEngine.js";
import type { AlveolarRidgeCaliperMeasurement } from "../cbctCaliperNerveMath.js";
import type { HUZoneSampling } from "../boneDensityMischMath.js";
import type { CbctToolMode } from "../CbctLeftToolDock.js";
import type {
	StudioMode,
	ViewLayoutMode,
	NerveCanalSide,
} from "../mpr/cbctStudioTypes.js";
import type { DentalLabOrderData } from "../../lab/DentalLabOrderModal.js";

export type { StudioMode, ViewLayoutMode, NerveCanalSide };

export interface CbctStandaloneStudioViewProps {
	readonly studyId?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly initialMode?: StudioMode | undefined;
	readonly initialStudioMode?: StudioMode | undefined;
	readonly autoLoadDemo?: boolean | undefined;
	readonly onClose?: (() => void) | undefined;
}

export interface StudioTopToolbarProps {
	readonly modalId: string;
	readonly patientDisplayName: string;
	readonly loadedSliceCount: number;
	readonly volume: CbctVoxelVolume | null;
	readonly studioMode: StudioMode;
	readonly handleSelectStudioMode: (mode: StudioMode) => void;
	readonly handleExportToEmr: () => void;
	readonly handleExportCbctToFinance: () => void;
	readonly handleExportToPlan: () => void;
	readonly handleExportToLab: () => void;
	readonly isSidebarOpen: boolean;
	readonly setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly isStudioMenuOpen: boolean;
	readonly setIsStudioMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly studioMenuRef: React.RefObject<HTMLDivElement | null>;
	readonly handleResetAll: () => void;
	readonly handleAutoDetectArch: () => void;
	readonly showDentalArch: boolean;
	readonly setShowDentalArch: React.Dispatch<React.SetStateAction<boolean>>;
	readonly showEdgeRulers: boolean;
	readonly setShowEdgeRulers: React.Dispatch<React.SetStateAction<boolean>>;
	readonly handleExportPdfReport: () => void;
	readonly maximizedViewport: CbctViewportType | null;
	readonly setMaximizedViewport: React.Dispatch<React.SetStateAction<CbctViewportType | null>>;
	readonly viewLayout: ViewLayoutMode;
	readonly setViewLayout: React.Dispatch<React.SetStateAction<ViewLayoutMode>>;
	readonly isFullscreen: boolean;
	readonly handleToggleFullscreenModal: () => void;
	readonly onClose: () => void;
	readonly activePresetId: string;
	readonly onSelectPreset: (presetId: string) => void;
	readonly crossSectionStepMm: number;
	readonly onChangeCrossSectionStepMm: (step: number) => void;
	readonly isUnsharpActive: boolean;
	readonly onToggleUnsharp: () => void;
	readonly sharpenAmount: number;
	readonly windowWidth: number;
	readonly onChangeWindowWidth: (w: number) => void;
	readonly windowLevel: number;
	readonly onChangeWindowLevel: (l: number) => void;
	readonly slabThicknessMm: number;
	readonly onChangeSlabThicknessMm: (t: number) => void;
	readonly slabMode: SlabProjectionMode;
	readonly onChangeSlabMode: (m: SlabProjectionMode) => void;
	readonly panoThicknessMm: number;
	readonly onChangePanoThicknessMm: (t: number) => void;
	readonly onSelectClinicalPreset: (presetId: string) => void;
	readonly onCopySnapshotToClipboard: () => Promise<void>;
	readonly onOpenComparisonSplit: () => void;
}

export interface StudioViewportGridProps {
	readonly activeTool: CbctToolMode;
	readonly onSelectTool: (tool: CbctToolMode) => void;
	readonly activePresetId: string;
	readonly onSelectPreset: (presetId: string) => void;
	readonly slabMode: SlabProjectionMode;
	readonly onSelectSlabMode: (mode: SlabProjectionMode) => void;
	readonly onChangeSlabMode: (mode: SlabProjectionMode) => void;
	readonly slabThicknessMm: number;
	readonly onChangeSlabThicknessMm: (thickness: number) => void;
	readonly invertColors: boolean;
	readonly onToggleInvertColors: () => void;
	readonly onResetAll: () => void;
	readonly showDentalArch: boolean;
	readonly onToggleDentalArch: () => void;
	readonly onAutoDetectArch: () => void;

	// Viewports Grid Props
	readonly isSidebarOpen: boolean;
	readonly mobileActiveTab: "axial" | "coronal" | "sagittal" | "panoramic" | "planner";
	readonly patientDisplayName: string;
	readonly patientId: string;
	readonly onSelectMobileTab: (tab: "axial" | "coronal" | "sagittal" | "panoramic" | "planner") => void;
	readonly volume: CbctVoxelVolume | null;
	readonly dicomLoadingStatus: string;
	readonly dicomProgress: number;
	readonly maximizedViewport: CbctViewportType | null;
	readonly viewLayout: ViewLayoutMode;
	readonly studioMode: StudioMode;
	readonly onSelectStudioMode: (mode: StudioMode) => void;
	readonly folderInputRef: React.RefObject<HTMLInputElement | null>;
	readonly zipInputRef: React.RefObject<HTMLInputElement | null>;
	readonly handleDicomFilesChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
	readonly activeViewport: CbctViewportType;
	readonly setActiveViewport: (vp: CbctViewportType) => void;
	readonly hoveredViewport: CbctViewportType | null;
	readonly onHoverViewport: (vp: CbctViewportType | null) => void;
	readonly showEdgeRulers: boolean;
	readonly handleToggleMaximize: (type: CbctViewportType) => void;
	readonly axialBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly axialOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly coronalBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly coronalOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly sagittalBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly sagittalOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly panoBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly panoOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly crossSectionBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly crossSectionOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly handleCanvasDoubleClick: (e: React.MouseEvent<HTMLCanvasElement>, viewport: CbctViewportType) => void;
	readonly handleCanvasMouseDown: (e: React.MouseEvent<HTMLCanvasElement>, viewport: CbctViewportType) => void;
	readonly handleCanvasMouseMove: (e: React.MouseEvent<HTMLCanvasElement>, viewport: CbctViewportType) => void;
	readonly handleCanvasMouseUp: (e: React.MouseEvent<HTMLCanvasElement>, viewport: CbctViewportType) => void;
	readonly handleCanvasWheel: (e: React.WheelEvent<HTMLCanvasElement>, viewport: CbctViewportType) => void;
	readonly getCanvasCursor: (viewport: CbctViewportType) => string;
	readonly crosshairMm: Point3D;
	readonly currentVoxel: Point3D;
	readonly obliqueAngles: ObliqueRotationAngles;
	readonly setObliqueAngles: React.Dispatch<React.SetStateAction<ObliqueRotationAngles>>;
	readonly handleFullResetViewport: () => void;
	readonly activeRotationHandle: string | null;
	readonly isShiftRotating: boolean;
	readonly hoveredHandle: string | null;
	readonly transforms: Record<CbctViewportType, ViewportTransform>;
	readonly windowWidth: number;
	readonly windowLevel: number;
	readonly renderViewportOverlays: (viewport: CbctViewportType) => React.ReactNode;
	readonly handlePanoMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly handlePanoMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly handlePanoMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly handleCrossSectionMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly handleCrossSectionMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly handleCrossSectionMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly dragImplantPart: string | null;
	readonly hoveredImplantPart: string | null;
	readonly activeCrossSection: CrossSectionSliceData | null;
	readonly activeCrossSectionIdx: number;
	readonly crossSections: CrossSectionSliceData[];
	readonly onLoadDemoVolume: () => Promise<void>;
	readonly rulers: CbctMeasurementRuler[];
	readonly onClearRulers: () => void;
	readonly angles: CbctAngleMeasurement[];
	readonly onClearAngles: () => void;
	readonly onSelectQuickWlPreset: (wl: { windowWidth: number; windowLevel: number }) => void;
	readonly handleSelectTooth: (toothFdi: number) => void;
	readonly archCurve: DentalArchCurve;
	readonly jawType: "mandible" | "maxilla";
	readonly onSwitchJaw: (jaw: "mandible" | "maxilla") => void;
	readonly activeToothFdi: string | undefined;
	readonly isUnsharpActive: boolean;
	readonly onToggleUnsharp: () => void;
	readonly onChangeCrossSectionIdx: (idx: number) => void;
	readonly selectedBrand: ImplantBrandKey;
	readonly onSelectBrand: (brand: ImplantBrandKey) => void;
	readonly selectedDiameterMm: number;
	readonly onSelectDiameterMm: (diameter: number) => void;
	readonly selectedLengthMm: number;
	readonly onSelectLengthMm: (length: number) => void;
	readonly displayBoneClass: string;
	readonly displayMeanHU: number;
	readonly displayTorque: string;
	readonly displayNerveClearanceMm: number;
	readonly displayDrillingProtocol: string;
	readonly nerveSafetyStatus: "safe" | "warning" | "danger";
	readonly nervePoints: Point3D[];
	readonly interpolatedNerve3D: Point3D[];
	readonly implant3DWorld: Implant3DWorldProjection | null;
	readonly nerveAuditResult: NerveSafetyAuditResult;
	readonly handleExportToEmr: () => void;
	readonly handleExportToPlan: () => void;
	readonly onChangeWindowWidth: (w: number) => void;
	readonly onChangeWindowLevel: (l: number) => void;
	readonly onSelectClinicalPreset: (presetId: string) => void;
	readonly panoThicknessMm: number;
	readonly onChangePanoThicknessMm: (thickness: number) => void;
	readonly panoProjectionMode: string;
	readonly onChangePanoProjectionMode: (mode: string) => void;
	readonly crossSectionStepMm: number;
	readonly onChangeCrossSectionStepMm: (step: number) => void;
	readonly implantEntryXOffsetMm: number;
	readonly onChangeImplantEntryXOffsetMm: (offset: number) => void;
	readonly implantEntryDepthMm: number;
	readonly onChangeImplantEntryDepthMm: (depth: number) => void;
	readonly implantAngulationDeg: number;
	readonly onChangeImplantAngulationDeg: (deg: number) => void;
}

export interface StudioSidebarControlsProps {
	readonly isSidebarOpen: boolean;
	readonly setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly mobileActiveTab: "axial" | "coronal" | "sagittal" | "panoramic" | "planner";
	readonly activeCrossSection: CrossSectionSliceData | null;
	readonly activeCrossSectionIdx: number;
	readonly setActiveCrossSectionIdx: (idx: number) => void;
	readonly crossSections: CrossSectionSliceData[];
	readonly studioMode: StudioMode;
	readonly setStudioMode: (mode: StudioMode) => void;
	readonly implantAngulationDeg: number;
	readonly setImplantAngulationDeg: (deg: number) => void;
	readonly volume: CbctVoxelVolume | null;
	readonly handleToggleMaximize: (type: CbctViewportType) => void;
	readonly crossSectionBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly crossSectionOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly handleCrossSectionMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly handleCrossSectionMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly handleCrossSectionMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly dragImplantPart: string | null;
	readonly hoveredImplantPart: string | null;
	readonly handleFullResetViewport: () => void;
	readonly maximizedViewport: CbctViewportType | null;
	readonly windowWidth: number;
	readonly windowLevel: number;
	readonly renderViewportOverlays: (viewport: CbctViewportType) => React.ReactNode;
	readonly sampledVoxelHU: number;
	readonly handleSelectTooth: (toothFdi: number) => void;
	readonly implant3DWorld: Implant3DWorldProjection | null;
	readonly nerveAuditResult: NerveSafetyAuditResult;
	readonly huSamplingResult: HUZoneSampling;
	readonly currentImplantSpec: VirtualImplantSpec;
	readonly nervePoints: Point3D[];
	readonly setNervePoints: React.Dispatch<React.SetStateAction<Point3D[]>>;
	readonly nerveTotalLengthMm: number;
	readonly selectedNerveNodeIdx: number | null;
	readonly setSelectedNerveNodeIdx: (idx: number | null) => void;
	readonly activeNerveSide: NerveCanalSide;
	readonly onSwitchNerveSide: (side: NerveCanalSide) => void;
	readonly displayBoneClass: string;
	readonly displayMeanHU: number;
	readonly displayTorque: string;
	readonly displayNerveClearanceMm: number;
	readonly displayDrillingProtocol: string;
	readonly selectedBrand: ImplantBrandKey;
	readonly setSelectedBrand: (brand: ImplantBrandKey) => void;
	readonly selectedDiameterMm: number;
	readonly setSelectedDiameterMm: (diameter: number) => void;
	readonly selectedLengthMm: number;
	readonly setSelectedLengthMm: (length: number) => void;
	readonly implantEntryXOffsetMm: number;
	readonly setImplantEntryXOffsetMm: (offset: number) => void;
	readonly setImplantEntryDepthMm: (depth: number) => void;
	readonly activeCaliper: AlveolarRidgeCaliperMeasurement | null;
	readonly handleExportToEmr: () => void;
	readonly handleExportPdfReport: () => void;
	readonly handleExportToPlan: () => void;
	readonly handleExportToSchedule: () => void;
	readonly handleExportToFinance: () => void;
}

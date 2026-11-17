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
import type { CbctMprViewportsGridProps } from "../mpr/viewportsGrid/CbctMprGridProps.js";
import type { DentalLabOrderData } from "../../lab/DentalLabStudioModal.js";

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

export interface StudioViewportGridProps extends CbctMprViewportsGridProps {
	readonly activeTool: CbctToolMode;
	readonly onSelectTool: (tool: CbctToolMode) => void;
	readonly activePresetId?: string | undefined;
	readonly onSelectPreset?: ((presetId: string) => void) | undefined;
	readonly slabMode: SlabProjectionMode;
	readonly onSelectSlabMode?: ((mode: SlabProjectionMode) => void) | undefined;
	readonly onChangeSlabMode?: ((mode: SlabProjectionMode) => void) | undefined;
	readonly slabThicknessMm: number;
	readonly onChangeSlabThicknessMm?: ((thickness: number) => void) | undefined;
	readonly invertColors: boolean;
	readonly onToggleInvertColors: () => void;
	readonly onResetAll: () => void;
	readonly showDentalArch: boolean;
	readonly onToggleDentalArch: () => void;
	readonly onAutoDetectArch: () => void;
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

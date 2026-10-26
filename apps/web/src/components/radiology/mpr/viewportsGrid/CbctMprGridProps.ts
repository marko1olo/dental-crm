/**
 * CbctMprGridProps.ts — Пропсы сетки вьюпортов КЛКТ (Мандат 8b).
 */

import type React from "react";
import type {
	CbctAngleMeasurement,
	CbctMeasurementRuler,
	CbctViewportType,
	CbctVoxelVolume,
	MprPlane,
	ObliqueRotationAngles,
	Point3D,
	RotationHandlePosition,
	SlabProjectionMode,
	ViewportTransform,
} from "../../cbctMprMath";
import type { CrossSectionSliceData, DentalArchCurve } from "../../dentalCurveEngine";
import type { ImplantBrandKey } from "../../implantSafetyEngine";
import type { StudioMode, ViewLayoutMode } from "../cbctStudioTypes";

export interface CbctMprViewportsGridProps {
	readonly isSidebarOpen: boolean;
	readonly mobileActiveTab: string;
	readonly patientDisplayName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly onSelectMobileTab?: ((tab: "axial" | "coronal" | "sagittal" | "panoramic" | "planner") => void) | undefined;
	readonly hoveredViewport?: CbctViewportType | null | undefined;
	readonly onHoverViewport?: ((v: CbctViewportType | null) => void) | undefined;
	readonly showEdgeRulers?: boolean | undefined;
	readonly volume: CbctVoxelVolume | null;
	readonly dicomLoadingStatus: string | null;
	readonly dicomProgress: number;
	readonly maximizedViewport: CbctViewportType | null;
	readonly viewLayout: ViewLayoutMode;
	readonly studioMode?: StudioMode | undefined;
	readonly onSelectStudioMode?: ((mode: StudioMode) => void) | undefined;
	readonly folderInputRef: React.RefObject<HTMLInputElement | null>;
	readonly zipInputRef: React.RefObject<HTMLInputElement | null>;
	readonly handleDicomFilesChange: (files: FileList | File[]) => void;
	readonly activeViewport: CbctViewportType;
	readonly setActiveViewport: (v: CbctViewportType) => void;
	readonly handleToggleMaximize: (v: CbctViewportType) => void;
	readonly axialBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>; readonly axialOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly coronalBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>; readonly coronalOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly sagittalBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>; readonly sagittalOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly panoBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>; readonly panoOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly crossSectionBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>; readonly crossSectionOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly handleCanvasDoubleClick: (plane: MprPlane, e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly handleCanvasMouseDown: (plane: MprPlane, e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly handleCanvasMouseMove: (plane: MprPlane, e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly handleCanvasMouseUp: () => void;
	readonly handleCanvasWheel: (plane: CbctViewportType, e: React.WheelEvent<HTMLCanvasElement>) => void;
	readonly getCanvasCursor: (plane: MprPlane) => string;
	readonly crosshairMm: Point3D;
	readonly currentVoxel: Point3D;
	readonly slabMode: SlabProjectionMode;
	readonly slabThicknessMm: number;
	readonly obliqueAngles: ObliqueRotationAngles;
	readonly setObliqueAngles: React.Dispatch<React.SetStateAction<ObliqueRotationAngles>>;
	readonly handleFullResetViewport: (plane: CbctViewportType) => void;
	readonly activeRotationHandle: { plane: MprPlane; handle: RotationHandlePosition } | null;
	readonly isShiftRotating: { plane: MprPlane } | null;
	readonly hoveredHandle: { plane: MprPlane; handle: RotationHandlePosition } | null;
	readonly transforms: Record<CbctViewportType, ViewportTransform>;
	readonly windowWidth: number;
	readonly windowLevel: number;
	readonly renderViewportOverlays: (v: CbctViewportType) => React.ReactNode;
	readonly handlePanoMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly handlePanoMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly handlePanoMouseUp: () => void;
	readonly handleCrossSectionMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly handleCrossSectionMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly handleCrossSectionMouseUp: () => void;
	readonly dragImplantPart: string | null; readonly hoveredImplantPart: string | null;
	readonly activeCrossSection: CrossSectionSliceData | null | undefined;
	readonly activeCrossSectionIdx: number; readonly crossSections: CrossSectionSliceData[];
	readonly onLoadDemoVolume?: (() => void) | undefined;
	readonly activeTool?: string | undefined; readonly onSelectTool?: ((tool: "ruler" | "crosshair" | "angle") => void) | undefined;
	readonly rulers?: readonly CbctMeasurementRuler[] | undefined; readonly onClearRulers?: ((plane?: CbctViewportType) => void) | undefined;
	readonly angles?: readonly CbctAngleMeasurement[] | undefined; readonly onClearAngles?: ((plane?: CbctViewportType) => void) | undefined;
	readonly onSelectQuickWlPreset?: ((preset: { windowWidth: number; windowLevel: number }) => void) | undefined;
	readonly handleSelectTooth?: ((toothFdi: number | string) => void) | undefined;
	readonly archCurve?: DentalArchCurve | undefined; readonly jawType?: "mandible" | "maxilla" | undefined;
	readonly onSwitchJaw?: ((jaw: "mandible" | "maxilla") => void) | undefined;
	readonly activeToothFdi?: string | number | undefined;
	readonly isUnsharpActive?: boolean | undefined; readonly onToggleUnsharp?: (() => void) | undefined;
	readonly onChangeCrossSectionIdx?: ((idx: number) => void) | undefined;
	readonly selectedBrand?: ImplantBrandKey | undefined; readonly onSelectBrand?: ((b: ImplantBrandKey) => void) | undefined;
	readonly selectedDiameterMm?: number | undefined; readonly onSelectDiameterMm?: ((d: number) => void) | undefined;
	readonly selectedLengthMm?: number | undefined; readonly onSelectLengthMm?: ((l: number) => void) | undefined;
	readonly displayBoneClass?: string | undefined; readonly displayMeanHU?: number | undefined; readonly displayTorque?: string | undefined;
	readonly displayNerveClearanceMm?: number | undefined; readonly displayDrillingProtocol?: string | undefined;
	readonly nerveSafetyStatus?: string | undefined; readonly nervePoints?: any; readonly interpolatedNerve3D?: any;
	readonly implant3DWorld?: any; readonly nerveAuditResult?: any;
	readonly handleExportToEmr?: (() => void) | undefined; readonly handleExportToPlan?: (() => void) | undefined;
	readonly onChangeWindowWidth?: ((w: number) => void) | undefined; readonly onChangeWindowLevel?: ((l: number) => void) | undefined;
	readonly onChangeSlabThicknessMm?: ((t: number) => void) | undefined; readonly onChangeSlabMode?: ((m: any) => void) | undefined;
	readonly onSelectClinicalPreset?: ((p: any) => void) | undefined; readonly activePresetId?: string | undefined;
	readonly panoThicknessMm?: number | undefined; readonly onChangePanoThicknessMm?: ((t: number) => void) | undefined;
	readonly panoProjectionMode?: any; readonly onChangePanoProjectionMode?: ((m: any) => void) | undefined;
	readonly crossSectionStepMm?: number | undefined; readonly onChangeCrossSectionStepMm?: ((s: number) => void) | undefined;
	readonly implantEntryXOffsetMm?: number | undefined; readonly onChangeImplantEntryXOffsetMm?: ((o: number) => void) | undefined;
	readonly implantEntryDepthMm?: number | undefined; readonly onChangeImplantEntryDepthMm?: ((d: number) => void) | undefined;
	readonly implantAngulationDeg?: number | undefined; readonly onChangeImplantAngulationDeg?: ((a: number) => void) | undefined;
}

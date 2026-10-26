/**
 * CbctSidebarTypes.ts — Типы правой панели КЛКТ (Мандат 8b).
 */

import type React from "react";
import type { CbctViewportType, CbctVoxelVolume, Point3D } from "../../cbctMprMath";
import type { CrossSectionSliceData } from "../../dentalCurveEngine";
import type { Implant3DWorldProjection, ImplantBrandKey, VirtualImplantSpec } from "../../implantSafetyEngine";
import type { AlveolarRidgeCaliperMeasurement } from "../../cbctCaliperNerveMath";
import type { HUZoneSampling } from "../../boneDensityMischMath";
import type { NerveCanalSide, StudioMode } from "../cbctStudioTypes";

export interface CbctRightSidebarProps {
	readonly isSidebarOpen: boolean; readonly setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly mobileActiveTab: string; readonly activeCrossSection: CrossSectionSliceData | null | undefined;
	readonly activeCrossSectionIdx: number; readonly setActiveCrossSectionIdx: React.Dispatch<React.SetStateAction<number>>;
	readonly crossSections: CrossSectionSliceData[]; readonly studioMode: StudioMode; readonly setStudioMode: React.Dispatch<React.SetStateAction<StudioMode>>;
	readonly implantAngulationDeg: number; readonly setImplantAngulationDeg: React.Dispatch<React.SetStateAction<number>>;
	readonly volume: CbctVoxelVolume | null; readonly handleToggleMaximize: (viewport: CbctViewportType) => void;
	readonly crossSectionBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly crossSectionOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly handleCrossSectionMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly handleCrossSectionMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly handleCrossSectionMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly dragImplantPart: string | null; readonly hoveredImplantPart: string | null;
	readonly handleFullResetViewport: (viewport: CbctViewportType) => void; readonly maximizedViewport: CbctViewportType | null;
	readonly windowWidth: number; readonly windowLevel: number;
	readonly renderViewportOverlays: (viewport: CbctViewportType) => React.ReactNode;
	readonly sampledVoxelHU: number; readonly handleSelectTooth: (fdi: number) => void;
	readonly implant3DWorld: Implant3DWorldProjection | null;
	readonly nerveAuditResult: { isDangerous: boolean; isWarning: boolean; netClearanceToCanalWallMm: number; clinicalMessageRu: string };
	readonly huSamplingResult: HUZoneSampling; readonly currentImplantSpec: VirtualImplantSpec;
	readonly nervePoints: readonly Point3D[]; readonly setNervePoints: React.Dispatch<React.SetStateAction<Point3D[]>>;
	readonly nerveTotalLengthMm: number; readonly selectedNerveNodeIdx: number | null;
	readonly setSelectedNerveNodeIdx: React.Dispatch<React.SetStateAction<number | null>>;
	readonly activeNerveSide?: NerveCanalSide | undefined;
	readonly onSwitchNerveSide?: ((side: NerveCanalSide) => void) | undefined;
	readonly displayBoneClass: string; readonly displayMeanHU: number | null; readonly displayTorque: string;
	readonly displayNerveClearanceMm: number | null; readonly displayDrillingProtocol: string;
	readonly selectedBrand: ImplantBrandKey; readonly setSelectedBrand: React.Dispatch<React.SetStateAction<ImplantBrandKey>>;
	readonly selectedDiameterMm: number; readonly setSelectedDiameterMm: React.Dispatch<React.SetStateAction<number>>;
	readonly selectedLengthMm: number; readonly setSelectedLengthMm: React.Dispatch<React.SetStateAction<number>>;
	readonly implantEntryXOffsetMm: number; readonly setImplantEntryXOffsetMm: React.Dispatch<React.SetStateAction<number>>;
	readonly setImplantEntryDepthMm: React.Dispatch<React.SetStateAction<number>>;
	readonly activeCaliper?: AlveolarRidgeCaliperMeasurement | null | undefined;
	readonly ridgeHeightMm?: number | null | undefined; readonly ridgeWidthMm?: number | null | undefined;
	readonly isAnonymized?: boolean | undefined; readonly onToggleAnonymize?: (() => void) | undefined;
	readonly handleExport300DpiSnapshot?: (() => void) | undefined; readonly handleShareReport?: (() => void) | undefined;
	readonly handleExportToEmr: () => void; readonly handleExportPdfReport: () => void;
	readonly handleExportToPlan: () => void; readonly handleExportToSchedule: () => void;
	readonly handleExportToFinance?: () => void;
}

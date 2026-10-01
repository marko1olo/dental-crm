import React from "react";
import type {
	CbctVoxelVolume,
	CbctViewportType,
	MprPlane,
	Point3D,
	SlabProjectionMode,
	ObliqueRotationAngles,
	RotationHandlePosition,
	ViewportTransform,
	CbctMeasurementRuler,
} from "../../cbctMprMath";
import type { CrossSectionSliceData, DentalArchCurve } from "../../dentalCurveEngine";
import type { StudioMode, ViewLayoutMode } from "../cbctStudioTypes";
import type { ImplantBrandKey, VirtualImplantSpec, Implant3DWorldProjection } from "../../implantSafetyEngine";
import type { HUZoneSampling } from "../../boneDensityMischMath";

export interface ViewportRenderers {
	renderAxial: (extraClassName?: string, options?: { showJawSwitcher?: boolean }) => React.ReactNode;
	renderCoronal: (extraClassName?: string) => React.ReactNode;
	renderSagittal: (extraClassName?: string) => React.ReactNode;
	renderPanoramic: (extraClassName?: string, options?: { showRibbonToggle?: boolean }) => React.ReactNode;
	renderCrossSection: (extraClassName?: string, isMaximized?: boolean) => React.ReactNode;
	renderVolume3D: (extraClassName?: string, options?: { isEndoMode?: boolean }) => React.ReactNode;
}

export interface WorkspaceCommonProps {
	readonly volume: CbctVoxelVolume | null;
	readonly renderers: ViewportRenderers;
	readonly activeViewport: CbctViewportType;
	readonly setActiveViewport: (v: CbctViewportType) => void;
	readonly maximizedViewport: CbctViewportType | null;
	readonly handleToggleMaximize: (v: CbctViewportType) => void;
	readonly mobileActiveTab: string;
	readonly patientDisplayName?: string | undefined;
	readonly jawType?: "mandible" | "maxilla" | undefined;
	readonly onSwitchJaw?: ((jaw: "mandible" | "maxilla") => void) | undefined;
	readonly archCurve?: DentalArchCurve | undefined;
	readonly activeCrossSection?: CrossSectionSliceData | null | undefined;
	readonly activeCrossSectionIdx?: number | undefined;
	readonly crossSections?: CrossSectionSliceData[] | undefined;
	readonly onChangeCrossSectionIdx?: ((idx: number) => void) | undefined;
	readonly handleSelectTooth?: ((toothFdi: number | string) => void) | undefined;
	readonly isUnsharpActive?: boolean | undefined;
	readonly onToggleUnsharp?: (() => void) | undefined;
	readonly crosshairMm?: Point3D | undefined;
	readonly windowWidth?: number | undefined;
	readonly windowLevel?: number | undefined;
	// Implant & Misch telemetry
	readonly selectedBrand?: ImplantBrandKey | undefined;
	readonly onSelectBrand?: ((b: ImplantBrandKey) => void) | undefined;
	readonly selectedDiameterMm?: number | undefined;
	readonly onSelectDiameterMm?: ((d: number) => void) | undefined;
	readonly selectedLengthMm?: number | undefined;
	readonly onSelectLengthMm?: ((l: number) => void) | undefined;
	readonly displayBoneClass?: string | undefined;
	readonly displayMeanHU?: number | null | undefined;
	readonly displayTorque?: string | undefined;
	readonly displayNerveClearanceMm?: number | null | undefined;
	readonly displayDrillingProtocol?: string | undefined;
	readonly nerveSafetyStatus?: "safe" | "warning" | "danger" | "unmeasured" | undefined;
	readonly handleExportToEmr?: (() => void) | undefined;
	readonly handleExportToPlan?: (() => void) | undefined;
}

/**
 * DENTE CRM — CBCT 3D Volume Viewport Types & Contracts (Layer 0)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, WebGL2 PS 3.3
 */

import type React from "react";
import type { CbctVoxelVolume, Point3D } from "../../cbctMprMath";
import type { Implant3DWorldProjection } from "../../implantSafetyEngine";
import type { Volume3DClippingBox, Volume3DPresetId } from "../cbctVolume3DMath";

export interface CbctVolume3DViewportProps {
	readonly volume: CbctVoxelVolume | null;
	readonly extraClassName?: string;
	readonly isActive?: boolean;
	readonly onPointerDownCapture?: () => void;
	readonly onMouseEnter?: () => void;
	readonly onMouseLeave?: () => void;
	readonly onDoubleClick?: () => void;
	readonly switcherSlot?: React.ReactNode;
	readonly isMaximized?: boolean;
	readonly onToggleMaximize?: () => void;
	readonly initialClipping?: Partial<Volume3DClippingBox>;
	readonly onClippingChange?: (clipping: Volume3DClippingBox) => void;
	readonly nervePoints?: readonly Point3D[] | undefined;
	readonly interpolatedNerve3D?: readonly Point3D[] | undefined;
	readonly implant3DWorld?: Implant3DWorldProjection | null | undefined;
	readonly implants3DWorld?: readonly Implant3DWorldProjection[] | undefined;
	readonly nerveAuditResult?:
		| {
				readonly isDangerous: boolean;
				readonly isWarning: boolean;
				readonly netClearanceToCanalWallMm: number;
		  }
		| null
		| undefined;
	readonly crosshairMm?: Point3D | undefined;
	readonly forceHibernated?: boolean | undefined;
}

export interface ExtraSkullProjectionItem {
	readonly id: string;
	readonly label: string;
	readonly tooltip: string;
	readonly yaw: number;
	readonly pitch: number;
	readonly testId: string;
}

export interface VolumeCameraState {
	yaw: number;
	pitch: number;
	zoom: number;
	pan: { x: number; y: number };
	isInteracting: boolean;
}

export interface Volume3DRenderDimensions {
	width: number;
	height: number;
}

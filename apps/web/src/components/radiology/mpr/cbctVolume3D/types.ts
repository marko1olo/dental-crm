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
	readonly extraClassName?: string | undefined;
	readonly isActive?: boolean | undefined;
	readonly onPointerDownCapture?: (() => void) | undefined;
	readonly onMouseEnter?: (() => void) | undefined;
	readonly onMouseLeave?: (() => void) | undefined;
	readonly onDoubleClick?: (() => void) | undefined;
	readonly switcherSlot?: React.ReactNode | undefined;
	readonly isMaximized?: boolean | undefined;
	readonly onToggleMaximize?: (() => void) | undefined;
	readonly initialClipping?: Partial<Volume3DClippingBox> | undefined;
	readonly onClippingChange?: ((clipping: Volume3DClippingBox) => void) | undefined;
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

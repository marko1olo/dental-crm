import type { MprPlane, Point3D } from "../cbctMprMath";
import type { ObliqueRotationAngles, ViewportTransform } from "../cbctObliqueMatrixMath";

export type RotationHandlePosition = "u_pos" | "u_neg" | "v_pos" | "v_neg";

export interface RotationHandleInfo {
	readonly position: RotationHandlePosition;
	readonly canvasX: number;
	readonly canvasY: number;
	readonly radiusPx: number;
	readonly plane: MprPlane;
	readonly baseAngleDeg: number;
}

export interface ObliqueCrosshairDrawOptions {
	readonly widthPx: number;
	readonly heightPx: number;
	readonly centerPx: { readonly x: number; readonly y: number };
	readonly plane: MprPlane;
	readonly rotationDeg: number;
	readonly handleDistancePx?: number;
	readonly activeHandle?: RotationHandlePosition | null;
	readonly hoveredHandle?: RotationHandlePosition | null;
	readonly showHandles?: boolean;
	readonly showAngleBadge?: boolean;
	readonly invertColors?: boolean;
	readonly isHovered?: boolean | undefined;
	readonly centerGapPx?: number;
}

export type CbctWheelAction = "slice_scroll" | "zoom";

export interface WheelActionOptions {
	readonly deltaY: number;
	readonly ctrlKey?: boolean;
	readonly metaKey?: boolean;
	readonly shiftKey?: boolean;
}

export interface FullViewResetState {
	readonly angles: ObliqueRotationAngles;
	readonly transform: ViewportTransform;
	readonly crosshairMm: Point3D;
}

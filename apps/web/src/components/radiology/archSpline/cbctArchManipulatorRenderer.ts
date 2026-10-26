import {
	type CbctVoxelVolume,
	worldMmToSlicePx,
	slicePxToScreenPx,
	type ViewportTransform,
} from "../cbctMprMath";
import type { Point2D } from "../cbctCaliperNerveMath";
import type { DentalArchAnchor, DentalArchCurve } from "./cbctArchSplineTypes";

export interface DentalArchAnchorHitResult {
	readonly anchor: DentalArchAnchor;
	readonly index: number;
	readonly screenPx: Point2D;
	readonly distancePx: number;
}

/** Hit-tests screen pointer against all dental arch anchor control points on Axial plane (24x24px hitbox). */
export function hitTestDentalArchControlPoint(
	pointerScreenPx: Point2D,
	archCurve: DentalArchCurve,
	volume: CbctVoxelVolume,
	transform?: { readonly panX?: number; readonly panY?: number; readonly zoom?: number } | undefined,
	hitRadiusPx = 12,
	crosshairZMm = 0,
): DentalArchAnchorHitResult | null {
	if (!archCurve?.anchors?.length || !volume) return null;

	const activeTransform: ViewportTransform = {
		panX: transform?.panX ?? 0, panY: transform?.panY ?? 0, zoom: transform?.zoom ?? 1.0,
	};
	let closestHit: DentalArchAnchorHitResult | null = null;
	let minDistance = Infinity;

	for (let i = 0; i < archCurve.anchors.length; i++) {
		const anchor = archCurve.anchors[i]!;
		const slicePx = worldMmToSlicePx({ x: anchor.positionMm.x, y: anchor.positionMm.y, z: crosshairZMm }, "axial", volume);
		const screenPx = slicePxToScreenPx(slicePx, activeTransform);
		const dist = Math.hypot(pointerScreenPx.x - screenPx.x, pointerScreenPx.y - screenPx.y);
		if (dist <= hitRadiusPx && dist < minDistance) {
			minDistance = dist;
			closestHit = { anchor, index: i, screenPx, distancePx: Number(dist.toFixed(2)) };
		}
	}

	return closestHit;
}

export interface DrawDentalArchManipulatorsOptions {
	readonly archCurve: DentalArchCurve;
	readonly volume: CbctVoxelVolume;
	readonly transform?: { readonly panX?: number; readonly panY?: number; readonly zoom?: number } | undefined;
	readonly crosshairZMm?: number;
	readonly selectedAnchorIdx?: number | null;
	readonly hoveredAnchorIdx?: number | null;
	readonly draggingAnchorIdx?: number | null;
	readonly activeToothFdi?: string | null;
	readonly invertColors?: boolean;
}

/** Renders interactive 24x24px dental arch control points on the Axial canvas in Screen Space. */
export function drawDentalArchControlPointManipulators(
	ctx: CanvasRenderingContext2D,
	options: DrawDentalArchManipulatorsOptions,
): void {
	const {
		archCurve, volume, transform, crosshairZMm = 0,
		selectedAnchorIdx = null, hoveredAnchorIdx = null, draggingAnchorIdx = null,
		activeToothFdi = null, invertColors = false,
	} = options;

	if (!archCurve?.anchors?.length || !volume) return;

	const activeTransform: ViewportTransform = {
		panX: transform?.panX ?? 0, panY: transform?.panY ?? 0, zoom: transform?.zoom ?? 1.0,
	};
	ctx.save();

	for (let i = 0; i < archCurve.anchors.length; i++) {
		const anchor = archCurve.anchors[i]!;
		const isDragging = draggingAnchorIdx === i;
		const isHovered = hoveredAnchorIdx === i;
		const isSelected = selectedAnchorIdx === i || (activeToothFdi !== null && anchor.toothFdi === activeToothFdi);
		const slicePx = worldMmToSlicePx({ x: anchor.positionMm.x, y: anchor.positionMm.y, z: crosshairZMm }, "axial", volume);
		const screen = slicePxToScreenPx(slicePx, activeTransform);

		if (isDragging) {
			ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
			ctx.beginPath(); ctx.arc(screen.x, screen.y, 14, 0, Math.PI * 2); ctx.fill();
			ctx.fillStyle = "rgba(6, 182, 212, 0.35)"; ctx.strokeStyle = "#06b6d4"; ctx.lineWidth = 2.0;
			ctx.beginPath(); ctx.arc(screen.x, screen.y, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
			ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(screen.x, screen.y, 4, 0, Math.PI * 2); ctx.fill();
		} else if (isHovered) {
			ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
			ctx.beginPath(); ctx.arc(screen.x, screen.y, 14, 0, Math.PI * 2); ctx.fill();
			ctx.fillStyle = "rgba(45, 212, 191, 0.22)"; ctx.strokeStyle = "rgba(45, 212, 191, 0.95)"; ctx.lineWidth = 1.5;
			ctx.beginPath(); ctx.arc(screen.x, screen.y, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
			ctx.fillStyle = "#2dd4bf"; ctx.strokeStyle = "#09090b"; ctx.lineWidth = 1.0;
			ctx.beginPath(); ctx.arc(screen.x, screen.y, 3.0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
			ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(screen.x, screen.y, 1.2, 0, Math.PI * 2); ctx.fill();
		} else if (isSelected) {
			ctx.fillStyle = "rgba(45, 212, 191, 0.25)"; ctx.strokeStyle = "#2dd4bf"; ctx.lineWidth = 1.5;
			ctx.beginPath(); ctx.arc(screen.x, screen.y, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
			ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(screen.x, screen.y, 3.0, 0, Math.PI * 2); ctx.fill();
		} else {
			ctx.fillStyle = invertColors ? "#0d9488" : "#2dd4bf";
			ctx.strokeStyle = invertColors ? "#ffffff" : "#09090b"; ctx.lineWidth = 1.0;
			ctx.beginPath(); ctx.arc(screen.x, screen.y, 3.0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
		}
	}
	ctx.restore();
}

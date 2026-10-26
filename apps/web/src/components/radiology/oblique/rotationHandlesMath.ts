import type { MprPlane } from "../cbctMprMath";
import { degToRad, radToDeg } from "../cbctObliqueMatrixMath";
import type { RotationHandleInfo, RotationHandlePosition } from "./types";
import { normalizeAngleDeg } from "./angleLabelsMath";

export function getRotationHandles(
	plane: MprPlane,
	canvasWidth: number,
	canvasHeight: number,
	crosshairCenterPx: { readonly x: number; readonly y: number },
	handleDistancePx = 60,
	rotationDeg = 0,
): RotationHandleInfo[] {
	const rotRad = degToRad(rotationDeg);
	const cosA = Math.cos(rotRad);
	const sinA = Math.sin(rotRad);
	const d = handleDistancePx;
	const rPx = 6.0;

	const positions: { pos: RotationHandlePosition; dx: number; dy: number; baseAngle: number }[] = [
		{ pos: "u_pos", dx: d * cosA, dy: d * sinA, baseAngle: 0 },
		{ pos: "u_neg", dx: -d * cosA, dy: -d * sinA, baseAngle: 180 },
		{ pos: "v_pos", dx: -d * sinA, dy: d * cosA, baseAngle: 90 },
		{ pos: "v_neg", dx: d * sinA, dy: -d * cosA, baseAngle: 270 },
	];

	return positions.map((p) => ({
		position: p.pos,
		canvasX: Math.round(crosshairCenterPx.x + p.dx),
		canvasY: Math.round(crosshairCenterPx.y + p.dy),
		radiusPx: rPx,
		plane,
		baseAngleDeg: p.baseAngle,
	}));
}

export function hitTestRotationHandle(
	pointerPx: { readonly x: number; readonly y: number },
	handles: readonly RotationHandleInfo[],
	hitTolerancePx = 20,
): RotationHandleInfo | null {
	for (const h of handles) {
		const dist = Math.hypot(pointerPx.x - h.canvasX, pointerPx.y - h.canvasY);
		if (dist <= h.radiusPx + hitTolerancePx) {
			return h;
		}
	}
	return null;
}

export function calculateAngleFromHandleDrag(
	centerPx: { readonly x: number; readonly y: number },
	currentPointerPx: { readonly x: number; readonly y: number },
	handlePosition: RotationHandlePosition,
): number {
	const dx = currentPointerPx.x - centerPx.x;
	const dy = currentPointerPx.y - centerPx.y;
	if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return 0;
	let angleRad = Math.atan2(dy, dx);

	switch (handlePosition) {
		case "u_pos":
			break;
		case "u_neg":
			angleRad -= Math.PI;
			break;
		case "v_pos":
			angleRad -= Math.PI / 2.0;
			break;
		case "v_neg":
			angleRad += Math.PI / 2.0;
			break;
	}

	return normalizeAngleDeg(radToDeg(angleRad));
}

export function calculateAngleFromShiftDrag(
	centerPx: { readonly x: number; readonly y: number },
	currentPointerPx: { readonly x: number; readonly y: number },
	startPointerPx: { readonly x: number; readonly y: number },
	initialAngleDeg: number,
): number {
	const dx0 = startPointerPx.x - centerPx.x;
	const dy0 = startPointerPx.y - centerPx.y;
	const dx1 = currentPointerPx.x - centerPx.x;
	const dy1 = currentPointerPx.y - centerPx.y;

	if (Math.hypot(dx0, dy0) < 1e-3 || Math.hypot(dx1, dy1) < 1e-3) {
		return normalizeAngleDeg(initialAngleDeg);
	}

	const angle0 = Math.atan2(dy0, dx0);
	const angle1 = Math.atan2(dy1, dx1);
	return normalizeAngleDeg(initialAngleDeg + radToDeg(angle1 - angle0));
}

export function hitTestCrosshairCenter(
	pointerPx: { readonly x: number; readonly y: number },
	centerPx: { readonly x: number; readonly y: number },
	hitTolerancePx = 14,
): boolean {
	return Math.hypot(pointerPx.x - centerPx.x, pointerPx.y - centerPx.y) <= hitTolerancePx;
}

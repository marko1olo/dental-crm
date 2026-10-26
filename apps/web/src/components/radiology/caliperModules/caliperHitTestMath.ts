/**
 * caliperHitTestMath.ts — Интерактивный CAD Hit-testing для ручек и тел измерений (Мандат 8b).
 */

import type { MeasurementHandleHit, MeasurementObjectHit } from "./caliperTypes";

export function hitTestMeasurementHandle(
	pointerPx: { readonly x: number; readonly y: number },
	rulers: readonly { readonly id: string; readonly plane: string; readonly startPx: { readonly x: number; readonly y: number }; readonly endPx: { readonly x: number; readonly y: number } }[],
	angles: readonly { readonly id: string; readonly plane: string; readonly startPx: { readonly x: number; readonly y: number }; readonly vertexPx: { readonly x: number; readonly y: number }; readonly endPx: { readonly x: number; readonly y: number } }[],
	hitRadiusPx = 12,
): MeasurementHandleHit | null {
	let closestHit: MeasurementHandleHit | null = null;
	let minDistance = hitRadiusPx;

	for (const r of rulers) {
		const dStart = Math.hypot(pointerPx.x - r.startPx.x, pointerPx.y - r.startPx.y);
		if (dStart <= minDistance) {
			minDistance = dStart;
			closestHit = { type: "ruler", id: r.id, handleIndex: 0, plane: r.plane, distancePx: Number(dStart.toFixed(1)) };
		}
		const dEnd = Math.hypot(pointerPx.x - r.endPx.x, pointerPx.y - r.endPx.y);
		if (dEnd <= minDistance) {
			minDistance = dEnd;
			closestHit = { type: "ruler", id: r.id, handleIndex: 1, plane: r.plane, distancePx: Number(dEnd.toFixed(1)) };
		}
	}

	for (const a of angles) {
		const dStart = Math.hypot(pointerPx.x - a.startPx.x, pointerPx.y - a.startPx.y);
		if (dStart <= minDistance) {
			minDistance = dStart;
			closestHit = { type: "angle", id: a.id, handleIndex: 0, plane: a.plane, distancePx: Number(dStart.toFixed(1)) };
		}
		const dVertex = Math.hypot(pointerPx.x - a.vertexPx.x, pointerPx.y - a.vertexPx.y);
		if (dVertex <= minDistance) {
			minDistance = dVertex;
			closestHit = { type: "angle", id: a.id, handleIndex: 1, plane: a.plane, distancePx: Number(dVertex.toFixed(1)) };
		}
		const dEnd = Math.hypot(pointerPx.x - a.endPx.x, pointerPx.y - a.endPx.y);
		if (dEnd <= minDistance) {
			minDistance = dEnd;
			closestHit = { type: "angle", id: a.id, handleIndex: 2, plane: a.plane, distancePx: Number(dEnd.toFixed(1)) };
		}
	}
	return closestHit;
}

const distPointToSegPx = (pt: { x: number; y: number }, p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	const l2 = dx * dx + dy * dy;
	if (l2 === 0) return Math.hypot(pt.x - p1.x, pt.y - p1.y);
	let t = ((pt.x - p1.x) * dx + (pt.y - p1.y) * dy) / l2;
	t = Math.max(0, Math.min(1, t));
	return Math.hypot(pt.x - (p1.x + t * dx), pt.y - (p1.y + t * dy));
};

export function hitTestMeasurementObject(
	pointerPx: { readonly x: number; readonly y: number },
	rulers: readonly { readonly id: string; readonly plane: string; readonly startPx: { readonly x: number; readonly y: number }; readonly endPx: { readonly x: number; readonly y: number }; readonly badgePx?: { readonly x: number; readonly y: number; readonly width?: number; readonly height?: number } }[],
	angles: readonly { readonly id: string; readonly plane: string; readonly startPx: { readonly x: number; readonly y: number }; readonly vertexPx: { readonly x: number; readonly y: number }; readonly endPx: { readonly x: number; readonly y: number }; readonly badgePx?: { readonly x: number; readonly y: number; readonly width?: number; readonly height?: number } }[],
	probes: readonly { readonly id: string; readonly plane: string; readonly posPx: { readonly x: number; readonly y: number }; readonly badgePx?: { readonly x: number; readonly y: number; readonly width?: number; readonly height?: number } }[] = [],
	lineHitTolerancePx = 10,
): MeasurementObjectHit | null {
	for (const r of rulers) {
		const badgeW = r.badgePx?.width ?? 64;
		const badgeH = r.badgePx?.height ?? 18;
		const badgeX = r.badgePx?.x ?? (r.startPx.x + r.endPx.x) / 2;
		const badgeY = r.badgePx?.y ?? (r.startPx.y + r.endPx.y) / 2;
		const isDeleteHitbox = Math.abs(pointerPx.x - (badgeX + badgeW / 2 - 14)) <= 22 && Math.abs(pointerPx.y - badgeY) <= 22;
		const isInsideBadge = Math.abs(pointerPx.x - badgeX) <= badgeW / 2 + 8 && Math.abs(pointerPx.y - badgeY) <= badgeH / 2 + 8;
		if (isDeleteHitbox || isInsideBadge) {
			return { type: "ruler", id: r.id, plane: r.plane, isDeleteButtonHit: isDeleteHitbox || pointerPx.x >= badgeX + badgeW / 2 - 28, distancePx: 0 };
		}
		if (distPointToSegPx(pointerPx, r.startPx, r.endPx) <= lineHitTolerancePx) {
			return { type: "ruler", id: r.id, plane: r.plane, isDeleteButtonHit: false, distancePx: 0 };
		}
	}
	for (const a of angles) {
		const badgeW = a.badgePx?.width ?? 60;
		const badgeH = a.badgePx?.height ?? 22;
		const badgeX = a.badgePx?.x ?? a.vertexPx.x;
		const badgeY = a.badgePx?.y ?? a.vertexPx.y;
		const isDeleteHitbox = Math.abs(pointerPx.x - (badgeX + badgeW / 2 - 14)) <= 22 && Math.abs(pointerPx.y - badgeY) <= 22;
		const isInsideBadge = Math.abs(pointerPx.x - badgeX) <= badgeW / 2 + 8 && Math.abs(pointerPx.y - badgeY) <= badgeH / 2 + 8;
		if (isDeleteHitbox || isInsideBadge) {
			return { type: "angle", id: a.id, plane: a.plane, isDeleteButtonHit: isDeleteHitbox || pointerPx.x >= badgeX + badgeW / 2 - 28, distancePx: 0 };
		}
		const minArm = Math.min(distPointToSegPx(pointerPx, a.vertexPx, a.startPx), distPointToSegPx(pointerPx, a.vertexPx, a.endPx));
		if (minArm <= lineHitTolerancePx) {
			return { type: "angle", id: a.id, plane: a.plane, isDeleteButtonHit: false, distancePx: 0 };
		}
	}
	for (const p of probes) {
		const dProbe = Math.hypot(pointerPx.x - p.posPx.x, pointerPx.y - p.posPx.y);
		if (dProbe <= lineHitTolerancePx + 4) {
			return { type: "probe", id: p.id, plane: p.plane, isDeleteButtonHit: false, distancePx: dProbe };
		}
	}
	return null;
}

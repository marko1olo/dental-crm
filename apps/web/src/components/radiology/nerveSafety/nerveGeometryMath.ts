/**
 * DENTE CRM — Mandibular Nerve Geometry & 2D/3D Distance Math (Layer 2)
 * Mandate 8b compliant (strictly <= 120 lines). Zero-audio alarm.
 */

import type { Point3D } from "../cbctMprMath.js";
import type { Vec3 } from "@dental/shared";
import {
	MANDIBULAR_NERVE_SAFETY_MARGIN_MM,
	MANDIBULAR_NERVE_DANGER_THRESHOLD_MM,
} from "./nerveSafetyTypes.js";

export interface ApexToNerve3DResult {
	readonly distanceToCanalCenterMm: number;
	readonly netClearanceToCanalWallMm: number;
	readonly netClearanceToSafetyCorridorMm: number;
	readonly safetyStatus: "safe" | "warning" | "danger" | "unmeasured";
	readonly isDangerous: boolean;
	readonly isWarning: boolean;
	readonly isSafe: boolean;
	readonly shouldTriggerAudioAlarm?: boolean;
	readonly closestApexPoint: { readonly x: number; readonly y: number; readonly z: number };
	readonly closestNervePoint: { readonly x: number; readonly y: number; readonly z: number };
	readonly closestSegmentIndex: number;
	readonly canalRadiusMm: number;
	readonly safetyMarginMm: number;
	readonly clinicalMessageRu: string;
}

export function calculateApexCoordinates(
	entryPoint: { readonly x: number; readonly y: number },
	angulationDeg: number,
	lengthMm: number,
): { readonly x: number; readonly y: number } {
	const angRad = (((angulationDeg ?? 0) * Math.PI) / 180.0);
	const entryX = entryPoint?.x ?? 0;
	const entryY = entryPoint?.y ?? 0;
	const len = lengthMm ?? 10.0;
	const apexX = entryX + len * Math.sin(angRad);
	const apexY = entryY + len * Math.cos(angRad);
	return {
		x: Math.round(apexX * 100) / 100,
		y: Math.round(apexY * 100) / 100,
	};
}

export function pointToSegmentDistance2D(
	p: { readonly x: number; readonly y: number },
	a: { readonly x: number; readonly y: number },
	b: { readonly x: number; readonly y: number },
): { distance: number; closestPoint: { readonly x: number; readonly y: number } } {
	const px = p?.x ?? 0, py = p?.y ?? 0;
	const ax = a?.x ?? 0, ay = a?.y ?? 0;
	const bx = b?.x ?? 0, by = b?.y ?? 0;
	const dx = bx - ax, dy = by - ay;
	const lenSq = dx * dx + dy * dy;

	if (lenSq <= 0.00001) {
		return { distance: Math.hypot(px - ax, py - ay), closestPoint: { x: ax, y: ay } };
	}
	const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
	const projX = ax + t * dx, projY = ay + t * dy;
	return { distance: Math.hypot(px - projX, py - projY), closestPoint: { x: projX, y: projY } };
}

export function calculateApexToNerve3DDistance(
	apex3D: Point3D | Vec3 | { readonly x: number; readonly y: number; readonly z: number },
	nerveSplinePoints: readonly (Point3D | Vec3 | { readonly x: number; readonly y: number; readonly z: number })[],
	canalRadiusMm = 1.4,
	safetyMarginMm = MANDIBULAR_NERVE_SAFETY_MARGIN_MM,
	apexRadiusMm = 0,
): ApexToNerve3DResult {
	const ax = Array.isArray(apex3D) ? apex3D[0] : apex3D.x;
	const ay = Array.isArray(apex3D) ? apex3D[1] : apex3D.y;
	const az = Array.isArray(apex3D) ? apex3D[2] : apex3D.z;

	if (!nerveSplinePoints || nerveSplinePoints.length < 2) {
		return {
			distanceToCanalCenterMm: 0, netClearanceToCanalWallMm: 0, netClearanceToSafetyCorridorMm: 0,
			safetyStatus: "unmeasured", isDangerous: false, isWarning: false, isSafe: false, shouldTriggerAudioAlarm: false,
			closestApexPoint: { x: ax, y: ay, z: az }, closestNervePoint: { x: 0, y: 0, z: 0 },
			closestSegmentIndex: -1, canalRadiusMm, safetyMarginMm, clinicalMessageRu: "Канал не размечен",
		};
	}
	const pts = nerveSplinePoints.map((p) => ({
		x: Array.isArray(p) ? p[0] : p.x, y: Array.isArray(p) ? p[1] : p.y, z: Array.isArray(p) ? p[2] : p.z,
	}));
	let minDistance = Number.POSITIVE_INFINITY;
	let closestPoint = { x: pts[0]!.x, y: pts[0]!.y, z: pts[0]!.z };
	let closestSegIdx = 0;

	for (let i = 0; i < pts.length - 1; i++) {
		const p1 = pts[i]!, p2 = pts[i + 1]!;
		const dx = p2.x - p1.x, dy = p2.y - p1.y, dz = p2.z - p1.z;
		const lenSq = dx * dx + dy * dy + dz * dz;
		const t = lenSq < 0.00001 ? 0 : Math.max(0, Math.min(1, ((ax - p1.x) * dx + (ay - p1.y) * dy + (az - p1.z) * dz) / lenSq));
		const proj = { x: p1.x + t * dx, y: p1.y + t * dy, z: p1.z + t * dz };
		const segDist = Math.hypot(ax - proj.x, ay - proj.y, az - proj.z);
		if (segDist < minDistance) {
			minDistance = segDist; closestPoint = proj; closestSegIdx = i;
		}
	}
	const distCenterToApex = Math.round(minDistance * 100) / 100;
	const netClearanceWall = Math.round((distCenterToApex - canalRadiusMm - apexRadiusMm) * 100) / 100;
	const netClearanceSafety = Math.round((netClearanceWall - safetyMarginMm) * 100) / 100;
	const isDanger = netClearanceWall < MANDIBULAR_NERVE_DANGER_THRESHOLD_MM;
	const isWarning = !isDanger && netClearanceWall < MANDIBULAR_NERVE_SAFETY_MARGIN_MM;
	const status: "safe" | "warning" | "danger" = isDanger ? "danger" : isWarning ? "warning" : "safe";

	const message = isDanger
		? (netClearanceWall <= 0 ? `ПЕРФОРАЦИЯ НИЖНЕЧЕЛЮСТНОГО КАНАЛА! Апекс пересекает нерв на ${Math.abs(netClearanceWall).toFixed(1)} мм` : `КРИТИЧЕСКИЙ РИСК: сближение апекса с каналом менее 1.5 мм (Дистанция до канала: ${netClearanceWall.toFixed(1)} мм)`)
		: isWarning
			? `ВНИМАНИЕ: буфер безопасности менее 2.0 мм (Дистанция до канала: ${netClearanceWall.toFixed(1)} мм)`
			: `БЕЗОПАСНО: запас апекса до стенки канала ${netClearanceWall.toFixed(1)} мм (норма >= 2.0 мм)`;

	return {
		distanceToCanalCenterMm: distCenterToApex, netClearanceToCanalWallMm: netClearanceWall,
		netClearanceToSafetyCorridorMm: netClearanceSafety, safetyStatus: status,
		isDangerous: isDanger, isWarning, isSafe: status === "safe", shouldTriggerAudioAlarm: false,
		closestApexPoint: { x: Number(ax.toFixed(2)), y: Number(ay.toFixed(2)), z: Number(az.toFixed(2)) },
		closestNervePoint: { x: Number(closestPoint.x.toFixed(2)), y: Number(closestPoint.y.toFixed(2)), z: Number(closestPoint.z.toFixed(2)) },
		closestSegmentIndex: closestSegIdx, canalRadiusMm, safetyMarginMm, clinicalMessageRu: message,
	};
}

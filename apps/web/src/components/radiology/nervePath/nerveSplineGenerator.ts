/**
 * DENTE CRM — 3D Catmull-Rom Spline & Vatech Clearance Audit (Layer 2)
 * Mandate 8b compliant (strictly <= 120 lines).
 */

import type { Point3D } from "../cbctMprMath.js";
import {
	type VatechClearanceAuditResult,
	VATECH_CANAL_SAFETY_ZONE_MM,
	VATECH_MINIMAL_APICAL_DISTANCE_MM,
	VATECH_COLLISION_DANGER_MM,
} from "./nervePathTypes.js";

export function evaluateVatechImplantNerveClearance(
	apicalClearanceMm: number,
	bodyClearanceMm?: number,
	thresholds?: {
		readonly warningApicalMm?: number;
		readonly dangerCollisionMm?: number;
		readonly safetyMarginMm?: number;
	},
): VatechClearanceAuditResult {
	const warnApical = thresholds?.warningApicalMm ?? VATECH_MINIMAL_APICAL_DISTANCE_MM;
	const dangerColl = thresholds?.dangerCollisionMm ?? VATECH_COLLISION_DANGER_MM;
	const safetyMargin = thresholds?.safetyMarginMm ?? VATECH_CANAL_SAFETY_ZONE_MM;

	const effectiveBody = bodyClearanceMm ?? apicalClearanceMm;
	const worstClearance = Math.min(apicalClearanceMm, effectiveBody);
	const isDanger = worstClearance < dangerColl;
	const isWarning = !isDanger && (apicalClearanceMm < warnApical || effectiveBody < safetyMargin);
	const isSafe = !isDanger && !isWarning;
	const status: "safe" | "warning" | "danger" = isDanger ? "danger" : isWarning ? "warning" : "safe";

	const message = isDanger
		? `КРИТИЧЕСКАЯ КОЛЛИЗИЯ VATECH: зазор ${worstClearance.toFixed(1)} мм (< ${dangerColl.toFixed(1)} мм)! Высокий риск травмы n. alveolaris inferior!`
		: isWarning
			? (apicalClearanceMm < warnApical ? `ПРЕДУПРЕЖДЕНИЕ VATECH: отступ апекса ${apicalClearanceMm.toFixed(1)} мм (< ${warnApical.toFixed(1)} мм). Рекомендуется имплантат меньшей длины.` : `ПРЕДУПРЕЖДЕНИЕ VATECH: зазор тела ${effectiveBody.toFixed(1)} мм (< ${safetyMargin.toFixed(1)} мм буфера).`)
			: `Безопасный коридор Vatech соблюден: зазор апекса ${apicalClearanceMm.toFixed(1)} мм (норма >= ${warnApical.toFixed(1)} мм), зазор тела ${effectiveBody.toFixed(1)} мм.`;

	return {
		apicalClearanceMm: Number(apicalClearanceMm.toFixed(2)),
		bodyClearanceMm: Number(effectiveBody.toFixed(2)),
		worstClearanceMm: Number(worstClearance.toFixed(2)),
		safetyStatus: status, isDanger, isWarning, isSafe,
		warningApicalDistanceMm: warnApical, dangerCollisionThresholdMm: dangerColl,
		safetyZoneMarginMm: safetyMargin, messageRu: message,
	};
}

export function smoothCatmullRom3D(pts: readonly Point3D[], subdivisions = 6): Point3D[] {
	if (pts.length < 2) return [...pts];
	const roundPt = (x: number, y: number, z: number): Point3D => ({
		x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), z: Number(z.toFixed(2)),
	});
	if (pts.length === 2) {
		const [p0, p1] = pts;
		if (!p0 || !p1) return [];
		const line: Point3D[] = [];
		for (let i = 0; i <= subdivisions; i++) {
			const t = i / subdivisions;
			line.push(roundPt(p0.x + (p1.x - p0.x) * t, p0.y + (p1.y - p0.y) * t, p0.z + (p1.z - p0.z) * t));
		}
		return line;
	}
	const result: Point3D[] = [];
	const step = 1.0 / subdivisions;

	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = i > 0 ? pts[i - 1]! : pts[i]!;
		const p1 = pts[i]!, p2 = pts[i + 1]!;
		const p3 = i < pts.length - 2 ? pts[i + 2]! : p2;

		for (let t = 0; t < 1.0; t += step) {
			const t2 = t * t, t3 = t2 * t;
			const cr = (v0: number, v1: number, v2: number, v3: number) =>
				0.5 * (2 * v1 + (-v0 + v2) * t + (2 * v0 - 5 * v1 + 4 * v2 - v3) * t2 + (-v0 + 3 * v1 - 3 * v2 + v3) * t3);
			result.push(roundPt(cr(p0.x, p1.x, p2.x, p3.x), cr(p0.y, p1.y, p2.y, p3.y), cr(p0.z, p1.z, p2.z, p3.z)));
		}
	}
	const last = pts[pts.length - 1]!;
	result.push(roundPt(last.x, last.y, last.z));
	return result;
}

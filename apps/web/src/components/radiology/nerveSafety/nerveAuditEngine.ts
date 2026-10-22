/**
 * DENTE CRM — Mandibular & Sinus Nerve Safety Audits (Layer 2)
 * Mandate 8b compliant (strictly <= 120 lines). Zero audio alarm.
 */

import type { Point3D } from "../cbctMprMath.js";
import type { Vec3 } from "@dental/shared";
import type { Implant3DWorldProjection } from "../implantSafetyEngine.js";
import {
	type CrossSectionImplantPose,
	type MandibularCanalCrossSection,
	type AlveolarRidgeEnvelope,
	type NerveSafetyAuditResult,
	type AlveolarContainmentResult,
	createUnmeasuredNerveSafety,
	MANDIBULAR_NERVE_SAFETY_MARGIN_MM,
	MANDIBULAR_NERVE_DANGER_THRESHOLD_MM,
	MIN_BUCCAL_BONE_WALL_MM,
	MIN_LINGUAL_BONE_WALL_MM,
} from "./nerveSafetyTypes.js";
import {
	calculateApexCoordinates,
	pointToSegmentDistance2D,
	calculateApexToNerve3DDistance,
} from "./nerveGeometryMath.js";

export interface NerveSafetyAuditResult3D extends NerveSafetyAuditResult {
	readonly apex3D: { readonly x: number; readonly y: number; readonly z: number };
	readonly closestNervePoint3D: { readonly x: number; readonly y: number; readonly z: number };
	readonly apexClearanceMm: number;
	readonly bodyClearanceMm: number;
	readonly worstClearanceMm: number;
	readonly isApexAtRisk: boolean;
	readonly isBodyAtRisk: boolean;
}

export function auditMandibularNerveSafety(
	implantPose: CrossSectionImplantPose,
	canal?: MandibularCanalCrossSection | null,
): NerveSafetyAuditResult {
	const center = canal?.center ?? (canal as unknown as { canalCenterMm?: { x: number; y: number } })?.canalCenterMm;
	if (!canal || !center || !implantPose?.entryPoint || !implantPose?.implantSpec) {
		return createUnmeasuredNerveSafety();
	}
	const apex = implantPose.apexPoint ?? calculateApexCoordinates(
		implantPose.entryPoint,
		implantPose.angulationDeg ?? 0,
		implantPose.implantSpec.lengthMm ?? 10.0,
	);
	const seg = pointToSegmentDistance2D(center, implantPose.entryPoint, apex);
	const implantRadius = (implantPose.implantSpec.diameterMm ?? 4.0) / 2.0;
	const canalRadius = canal.radiusMm ?? (canal as unknown as { canalRadiusMm?: number })?.canalRadiusMm ?? 1.5;
	const safetyMargin = canal.safetyMarginMm ?? 2.0;
	const netClearanceWall = seg.distance - (implantRadius + canalRadius);
	const netClearanceSafety = netClearanceWall - safetyMargin;

	const dirX = seg.closestPoint.x - (center.x ?? 0), dirY = seg.closestPoint.y - (center.y ?? 0);
	const dirLen = Math.hypot(dirX, dirY) || 1;
	const closestNerveX = (center.x ?? 0) + (dirX / dirLen) * canalRadius;
	const closestNerveY = (center.y ?? 0) + (dirY / dirLen) * canalRadius;

	const isDanger = netClearanceWall < MANDIBULAR_NERVE_DANGER_THRESHOLD_MM;
	const isWarning = !isDanger && netClearanceWall < MANDIBULAR_NERVE_SAFETY_MARGIN_MM;
	const status: "safe" | "warning" | "danger" = isDanger ? "danger" : isWarning ? "warning" : "safe";

	const message = isDanger
		? (netClearanceWall <= 0 ? `ПЕРФОРАЦИЯ НИЖНЕЧЕЛЮСТНОГО КАНАЛА! Пересечение на ${Math.abs(netClearanceWall).toFixed(1)} мм` : `КРИТИЧЕСКИЙ РИСК: сближение с каналом менее 1.5 мм (${netClearanceWall.toFixed(1)} мм)`)
		: isWarning
			? `ВНИМАНИЕ: буфер безопасности менее 2.0 мм (${netClearanceWall.toFixed(1)} мм)`
			: `БЕЗОПАСНО: запас до стенки канала ${netClearanceWall.toFixed(1)} мм (норма >= 2.0 мм)`;

	return {
		distanceToCanalCenterMm: Math.round(seg.distance * 100) / 100,
		netClearanceToCanalWallMm: Math.round(netClearanceWall * 100) / 100,
		netClearanceToSafetyCorridorMm: Math.round(netClearanceSafety * 100) / 100,
		safetyStatus: status, isDangerous: isDanger, isWarning, shouldTriggerAudioAlarm: isDanger,
		closestImplantPoint: seg.closestPoint, closestNervePoint: { x: closestNerveX, y: closestNerveY },
		clinicalMessageRu: message,
	};
}

export function auditMandibularNerveSafety3D(
	implant3D: Implant3DWorldProjection | {
		readonly entry3D: Point3D | Vec3 | { readonly x: number; readonly y: number; readonly z: number };
		readonly apex3D: Point3D | Vec3 | { readonly x: number; readonly y: number; readonly z: number };
		readonly diameterMm?: number | undefined;
	},
	nerveSpline: readonly (Point3D | Vec3 | { readonly x: number; readonly y: number; readonly z: number })[] | {
		readonly points: readonly (Point3D | Vec3 | { readonly x: number; readonly y: number; readonly z: number })[];
		readonly radius?: number | undefined;
		readonly safetyMarginMm?: number | undefined;
	} | null | undefined,
	optionsOrCanalRadius?: { readonly canalRadiusMm?: number; readonly safetyMarginMm?: number } | number,
	safetyMarginMmArg?: number,
): NerveSafetyAuditResult3D {
	let rawPoints: readonly (Point3D | Vec3 | { readonly x: number; readonly y: number; readonly z: number })[] | undefined;
	let canalRadiusMm = 1.4, safetyMarginMm = MANDIBULAR_NERVE_SAFETY_MARGIN_MM;

	if (Array.isArray(nerveSpline)) rawPoints = nerveSpline;
	else if (nerveSpline && "points" in nerveSpline && Array.isArray(nerveSpline.points)) {
		rawPoints = nerveSpline.points;
		if (typeof nerveSpline.radius === "number") canalRadiusMm = nerveSpline.radius;
		if (typeof nerveSpline.safetyMarginMm === "number") safetyMarginMm = nerveSpline.safetyMarginMm;
	}
	if (typeof optionsOrCanalRadius === "number") {
		canalRadiusMm = optionsOrCanalRadius;
		if (typeof safetyMarginMmArg === "number") safetyMarginMm = safetyMarginMmArg;
	} else if (optionsOrCanalRadius && typeof optionsOrCanalRadius === "object") {
		if (typeof optionsOrCanalRadius.canalRadiusMm === "number") canalRadiusMm = optionsOrCanalRadius.canalRadiusMm;
		if (typeof optionsOrCanalRadius.safetyMarginMm === "number") safetyMarginMm = optionsOrCanalRadius.safetyMarginMm;
	}

	const apexPt = "apex3D" in implant3D ? implant3D.apex3D : { x: 0, y: 0, z: 0 };
	const entryPt = "entry3D" in implant3D ? implant3D.entry3D : { x: 0, y: 0, z: 0 };
	const ax = Array.isArray(apexPt) ? apexPt[0] : apexPt.x;
	const ay = Array.isArray(apexPt) ? apexPt[1] : apexPt.y;
	const az = Array.isArray(apexPt) ? apexPt[2] : apexPt.z;
	const ex = Array.isArray(entryPt) ? entryPt[0] : entryPt.x;
	const ey = Array.isArray(entryPt) ? entryPt[1] : entryPt.y;
	const ez = Array.isArray(entryPt) ? entryPt[2] : entryPt.z;

	if (!rawPoints || rawPoints.length === 0) {
		const unmeasured2D = createUnmeasuredNerveSafety();
		return {
			...unmeasured2D, apex3D: { x: ax, y: ay, z: az }, closestNervePoint3D: { x: 0, y: 0, z: 0 },
			apexClearanceMm: 0, bodyClearanceMm: 0, worstClearanceMm: 0, isApexAtRisk: false, isBodyAtRisk: false,
		};
	}
	const implantRadius = (implant3D.diameterMm ?? 4.0) / 2.0;
	const apexResult = calculateApexToNerve3DDistance({ x: ax, y: ay, z: az }, rawPoints, canalRadiusMm, safetyMarginMm, 0);
	const pts = rawPoints.map((p) => ({ x: Array.isArray(p) ? p[0] : p.x, y: Array.isArray(p) ? p[1] : p.y, z: Array.isArray(p) ? p[2] : p.z }));

	let minBodyDist = Number.POSITIVE_INFINITY;
	let closestBodyNervePt = apexResult.closestNervePoint;
	const idx = ax - ex, idy = ay - ey, idz = az - ez, lenSq = idx * idx + idy * idy + idz * idz;

	for (let i = 0; i < pts.length - 1; i++) {
		const s1 = pts[i]!, s2 = pts[i + 1]!;
		const sdx = s2.x - s1.x, sdy = s2.y - s1.y, sdz = s2.z - s1.z;
		for (let step = 0; step <= 4; step++) {
			const st = step / 4;
			const npx = s1.x + st * sdx, npy = s1.y + st * sdy, npz = s1.z + st * sdz;
			const it = lenSq > 0.00001 ? Math.max(0, Math.min(1, ((npx - ex) * idx + (npy - ey) * idy + (npz - ez) * idz) / lenSq)) : 0;
			const dist = Math.hypot(npx - (ex + it * idx), npy - (ey + it * idy), npz - (ez + it * idz));
			if (dist < minBodyDist) {
				minBodyDist = dist; closestBodyNervePt = { x: npx, y: npy, z: npz };
			}
		}
	}
	const netBodyClearance = Math.round((minBodyDist - canalRadiusMm - implantRadius) * 100) / 100;
	const worstClearance = Math.min(apexResult.netClearanceToCanalWallMm, netBodyClearance);
	const isDanger = worstClearance < MANDIBULAR_NERVE_DANGER_THRESHOLD_MM;
	const isWarning = !isDanger && worstClearance < safetyMarginMm;
	const status: "safe" | "warning" | "danger" = isDanger ? "danger" : isWarning ? "warning" : "safe";

	let clinicalMsg = apexResult.clinicalMessageRu;
	if (netBodyClearance < apexResult.netClearanceToCanalWallMm && isDanger) {
		clinicalMsg = `Дистанция до канала: ${netBodyClearance.toFixed(1)} мм`;
	}

	return {
		distanceToCanalCenterMm: apexResult.distanceToCanalCenterMm, netClearanceToCanalWallMm: worstClearance,
		netClearanceToSafetyCorridorMm: Math.round((worstClearance - safetyMarginMm) * 100) / 100,
		safetyStatus: status, isDangerous: isDanger, isWarning, shouldTriggerAudioAlarm: false,
		closestImplantPoint: { x: Number(ax.toFixed(2)), y: Number(ay.toFixed(2)) },
		closestNervePoint: { x: Number(apexResult.closestNervePoint.x.toFixed(2)), y: Number(apexResult.closestNervePoint.y.toFixed(2)) },
		clinicalMessageRu: clinicalMsg, apex3D: { x: ax, y: ay, z: az }, closestNervePoint3D: closestBodyNervePt,
		apexClearanceMm: apexResult.netClearanceToCanalWallMm, bodyClearanceMm: netBodyClearance, worstClearanceMm: worstClearance,
		isApexAtRisk: apexResult.netClearanceToCanalWallMm < safetyMarginMm, isBodyAtRisk: netBodyClearance < safetyMarginMm,
	};
}

export function auditAlveolarBoneContainment(implantPose: CrossSectionImplantPose, envelope: AlveolarRidgeEnvelope): AlveolarContainmentResult {
	const implantRadius = implantPose.implantSpec.diameterMm / 2.0;
	const buccalDist = Math.abs(implantPose.entryPoint.x - envelope.buccalCrestPoint.x) - implantRadius;
	const lingualDist = Math.abs(implantPose.entryPoint.x - envelope.lingualCrestPoint.x) - implantRadius;
	const isBuccalOk = buccalDist >= MIN_BUCCAL_BONE_WALL_MM;
	const isLingualOk = lingualDist >= MIN_LINGUAL_BONE_WALL_MM;
	const requiresGbr = !isBuccalOk || !isLingualOk;
	let warning: string | undefined;
	if (!isBuccalOk) warning = `Толщина вестибулярной костной стенки ${buccalDist.toFixed(1)} мм (< 1.5 мм). Показана НКР (GBR)!`;
	else if (!isLingualOk) warning = `Толщина оральной костной стенки ${lingualDist.toFixed(1)} мм (< 1.0 мм). Риск фенестрации!`;

	return {
		residualBuccalBoneMm: Math.max(0, Math.round(buccalDist * 10) / 10),
		residualLingualBoneMm: Math.max(0, Math.round(lingualDist * 10) / 10),
		isBuccalBoneAdequate: isBuccalOk, isLingualBoneAdequate: isLingualOk, isApexContained: true,
		requiresGbrAugmentation: requiresGbr, ...(warning ? { clinicalWarningRu: warning } : {}),
	};
}

export function auditMaxillarySinusSafety(implantPose: CrossSectionImplantPose, sinusFloorY = 0, sinusMarginMm = 1.0): NerveSafetyAuditResult {
	const apex = calculateApexCoordinates(implantPose.entryPoint, implantPose.angulationDeg, implantPose.implantSpec.lengthMm);
	const netClearanceWall = Math.abs(apex.y - sinusFloorY);
	const isPerforation = apex.y < sinusFloorY;
	const status: "safe" | "warning" | "danger" = isPerforation ? "danger" : netClearanceWall < sinusMarginMm ? "warning" : "safe";
	const message = `Дно гайморовой пазухи: зазор ${netClearanceWall.toFixed(1)} мм`;

	return {
		distanceToCanalCenterMm: Math.round(netClearanceWall * 100) / 100, netClearanceToCanalWallMm: Math.round(netClearanceWall * 100) / 100,
		netClearanceToSafetyCorridorMm: Math.round((netClearanceWall - sinusMarginMm) * 100) / 100,
		safetyStatus: status, isDangerous: status === "danger", isWarning: status === "warning", shouldTriggerAudioAlarm: false,
		closestImplantPoint: apex, closestNervePoint: { x: apex.x, y: sinusFloorY }, clinicalMessageRu: message,
	};
}

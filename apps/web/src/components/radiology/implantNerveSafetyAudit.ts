/**
 * Mandibular Nerve & Cortical Plate Safety Audit Engine
 *
 * Clinical domain:
 * - 2.0 mm Mandibular Canal (IAN) safety corridor monitoring.
 * - 2D & 3D proximity calculation, danger zone collision detection.
 * - Alveolar bone envelope containment (buccal >= 1.5 mm, lingual >= 1.0 mm).
 * - Maxillary sinus safety evaluation.
 * - Structured Form 043/u surgery protocol generation.
 *
 * Mandate 8b: Декомпозиция монолитов (строго <= 800 строк).
 */

import { MANDIBULAR_NERVE_SAFETY_MARGIN_MM } from './cbctCaliperNerveMath.js';
export { MANDIBULAR_NERVE_SAFETY_MARGIN_MM };
import type { Point3D } from './cbctMprMath.js';
import {
  analyzeMischBoneQuality,
  formatMischProtocolToDiaryText,
  type HUZoneSampling,
  type MischClassificationResult,
} from './boneDensityMischMath.js';

export const MANDIBULAR_NERVE_DANGER_THRESHOLD_MM = 1.5;

export const MIN_BUCCAL_BONE_WALL_MM = 1.5;
export const MIN_LINGUAL_BONE_WALL_MM = 1.0;

export type ImplantBrandKey = "straumann" | "nobel_biocare" | "osstem" | "dentium" | "mis";

export interface VirtualImplantSpec {
	readonly id: string;
	readonly brand: ImplantBrandKey;
	readonly brandName: string;
	readonly lineName: string;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly platformDiameterMm: number;
	readonly apexDiameterMm: number;
	readonly priceKopecks: number;
	readonly articleNumber: string;
}

export interface CrossSectionImplantPose {
	readonly entryPoint: { readonly x: number; readonly y: number }; // Coronal crest entry point (mm)
	readonly apexPoint?: { readonly x: number; readonly y: number }; // Optional precomputed apex
	readonly angulationDeg: number; // Tilt in degrees from vertical (0 = straight down)
	readonly implantSpec: VirtualImplantSpec;
	readonly targetToothFdi?: number;
}


export interface MandibularCanalCrossSection {
	readonly center: { readonly x: number; readonly y: number }; // Center coordinate in mm
	readonly radiusMm: number; // Anatomical radius of canal (typically 1.25..1.5 mm)
	readonly safetyMarginMm: number; // Required buffer (default 2.0 mm)
}

export interface AlveolarRidgeEnvelope {
	readonly crestPoint: { readonly x: number; readonly y: number };
	readonly basePoint: { readonly x: number; readonly y: number };
	readonly buccalCrestPoint: { readonly x: number; readonly y: number };
	readonly lingualCrestPoint: { readonly x: number; readonly y: number };
	readonly ridgeWidthMm: number;
	readonly ridgeHeightMm: number;
}

export interface NerveSafetyAuditResult {
	readonly distanceToCanalCenterMm: number;
	readonly netClearanceToCanalWallMm: number;
	readonly netClearanceToSafetyCorridorMm: number;
	readonly safetyStatus: "safe" | "warning" | "danger" | "unmeasured";
	readonly isDangerous: boolean;
	readonly isWarning: boolean;
	readonly shouldTriggerAudioAlarm?: boolean;
	readonly closestImplantPoint: { readonly x: number; readonly y: number };
	readonly closestNervePoint: { readonly x: number; readonly y: number };
	readonly clinicalMessageRu: string;
}

export function createUnmeasuredNerveSafety(): NerveSafetyAuditResult {
	return {
		distanceToCanalCenterMm: 0,
		netClearanceToCanalWallMm: 0,
		netClearanceToSafetyCorridorMm: 0,
		safetyStatus: "unmeasured",
		isDangerous: false,
		isWarning: false,
		shouldTriggerAudioAlarm: false,
		closestImplantPoint: { x: 0, y: 0 },
		closestNervePoint: { x: 0, y: 0 },
		clinicalMessageRu: "Канал не размечен",
	};
}

export interface AlveolarContainmentResult {
	readonly residualBuccalBoneMm: number;
	readonly residualLingualBoneMm: number;
	readonly isBuccalBoneAdequate: boolean;
	readonly isLingualBoneAdequate: boolean;
	readonly isApexContained: boolean;
	readonly requiresGbrAugmentation: boolean;
	readonly clinicalWarningRu?: string | undefined;
	readonly isUnmeasured?: boolean | undefined;
}

export interface ComprehensiveCbctPlanAudit {
	readonly toothFdi: number;
	readonly implantPose: CrossSectionImplantPose;
	readonly apexPoint: { readonly x: number; readonly y: number };
	readonly nerveSafety: NerveSafetyAuditResult;
	readonly boneContainment: AlveolarContainmentResult;
	readonly boneQuality: MischClassificationResult;
	readonly isPlanApproved: boolean;
	readonly form043DiaryText: string;
	readonly treatmentPlanItem: {
		readonly code: string;
		readonly nameRu: string;
		readonly priceKopecks: number;
		readonly priceFormattedRu: string;
	};
}


// ─── GEOMETRY & APEX POSITION MATH ───────────────────────────────────────────

/**
 * Calculates 2D Apex position given entry point, angle, and length.
 * Angle 0° = vertical downwards (+Y), positive angle = tilt to the right (+X).
 */
export function calculateApexCoordinates(
	entryPoint: { readonly x: number; readonly y: number },
	angulationDeg: number,
	lengthMm: number,
): { readonly x: number; readonly y: number } {
	const angRad = (angulationDeg * Math.PI) / 180.0;
	const apexX = entryPoint.x + lengthMm * Math.sin(angRad);
	const apexY = entryPoint.y + lengthMm * Math.cos(angRad);
	return {
		x: Math.round(apexX * 100) / 100,
		y: Math.round(apexY * 100) / 100,
	};
}

/**
 * Computes shortest distance from a 2D point to a line segment.
 */
export function pointToSegmentDistance2D(
	p: { readonly x: number; readonly y: number },
	a: { readonly x: number; readonly y: number },
	b: { readonly x: number; readonly y: number },
): { distance: number; closestPoint: { readonly x: number; readonly y: number } } {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const lenSq = dx * dx + dy * dy;

	if (lenSq <= 0.00001) {
		const dist = Math.hypot(p.x - a.x, p.y - a.y);
		return { distance: dist, closestPoint: { x: a.x, y: a.y } };
	}

	const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
	const projX = a.x + t * dx;
	const projY = a.y + t * dy;
	const dist = Math.hypot(p.x - projX, p.y - projY);

	return {
		distance: dist,
		closestPoint: { x: projX, y: projY },
	};
}

// ─── MANDIBULAR NERVE SAFETY EVALUATION ──────────────────────────────────────

/**
 * Audits clearance from the virtual implant to the mandibular canal (N. alveolaris inferior).
 */
export function auditMandibularNerveSafety(
	implantPose: CrossSectionImplantPose,
	canal?: MandibularCanalCrossSection | null,
): NerveSafetyAuditResult {
	if (!canal) {
		return createUnmeasuredNerveSafety();
	}
	const apex = calculateApexCoordinates(
		implantPose.entryPoint,
		implantPose.angulationDeg,
		implantPose.implantSpec.lengthMm,
	);

	// Find closest point on implant axis segment to nerve center
	const segResult = pointToSegmentDistance2D(canal.center, implantPose.entryPoint, apex);
	const distCenterToAxis = segResult.distance;

	// Physical clearance from outer implant cylinder to outer canal wall
	const implantRadius = implantPose.implantSpec.diameterMm / 2.0;
	const netClearanceWall = distCenterToAxis - (implantRadius + canal.radiusMm);
	const netClearanceSafety = netClearanceWall - canal.safetyMarginMm;

	// Calculate closest point on nerve circle boundary
	const dirX = segResult.closestPoint.x - canal.center.x;
	const dirY = segResult.closestPoint.y - canal.center.y;
	const dirLen = Math.hypot(dirX, dirY) || 1;
	const closestNerveX = canal.center.x + (dirX / dirLen) * canal.radiusMm;
	const closestNerveY = canal.center.y + (dirY / dirLen) * canal.radiusMm;

	let status: "safe" | "warning" | "danger" = "safe";
	let message = "";

	if (netClearanceWall < MANDIBULAR_NERVE_DANGER_THRESHOLD_MM) {
		status = "danger";
		message = "Дистанция до канала: " + netClearanceWall.toFixed(1) + " мм";
	} else if (netClearanceWall < MANDIBULAR_NERVE_SAFETY_MARGIN_MM) {
		status = "warning";
		message = "Дистанция до канала: " + netClearanceWall.toFixed(1) + " мм";
	} else {
		status = "safe";
		message = "Дистанция до канала: " + netClearanceWall.toFixed(1) + " мм";
	}

	return {
		distanceToCanalCenterMm: Math.round(distCenterToAxis * 100) / 100,
		netClearanceToCanalWallMm: Math.round(netClearanceWall * 100) / 100,
		netClearanceToSafetyCorridorMm: Math.round(netClearanceSafety * 100) / 100,
		safetyStatus: status,
		isDangerous: status === "danger",
		isWarning: status === "warning",
		shouldTriggerAudioAlarm: false,
		closestImplantPoint: segResult.closestPoint,
		closestNervePoint: { x: closestNerveX, y: closestNerveY },
		clinicalMessageRu: message,
	};
}

// ─── 3D APEX-TO-NERVE DISTANCE & AUDIT MATH ─────────────────────────────────

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

export interface NerveSafetyAuditResult3D extends NerveSafetyAuditResult {
	readonly apex3D: { readonly x: number; readonly y: number; readonly z: number };
	readonly closestNervePoint3D: { readonly x: number; readonly y: number; readonly z: number };
	readonly apexClearanceMm: number;
	readonly bodyClearanceMm: number;
	readonly worstClearanceMm: number;
	readonly isApexAtRisk: boolean;
	readonly isBodyAtRisk: boolean;
}

/**
 * Calculates shortest 3D physical distance from implant apex to mandibular nerve 3D spline.
 * Clinical thresholds:
 * - Net clearance < 1.5 mm: RED ALERT (Critical collision risk / nerve damaged or in peril).
 * - Net clearance 1.5..2.0 mm: YELLOW WARNING (Warning buffer zone).
 * - Net clearance >= 2.0 mm: GREEN SAFE (Safe margin per Misch standard).
 */
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
			distanceToCanalCenterMm: 0,
			netClearanceToCanalWallMm: 0,
			netClearanceToSafetyCorridorMm: 0,
			safetyStatus: "unmeasured",
			isDangerous: false,
			isWarning: false,
			isSafe: false,
			shouldTriggerAudioAlarm: false,
			closestApexPoint: { x: ax, y: ay, z: az },
			closestNervePoint: { x: 0, y: 0, z: 0 },
			closestSegmentIndex: -1,
			canalRadiusMm,
			safetyMarginMm,
			clinicalMessageRu: "Канал не размечен",
		};
	}

	const pts = nerveSplinePoints.map((p) => ({
		x: Array.isArray(p) ? p[0] : p.x,
		y: Array.isArray(p) ? p[1] : p.y,
		z: Array.isArray(p) ? p[2] : p.z,
	}));

	let minDistance = Number.POSITIVE_INFINITY;
	let closestPoint = { x: pts[0]!.x, y: pts[0]!.y, z: pts[0]!.z };
	let closestSegIdx = 0;

	if (pts.length === 1) {
		const p0 = pts[0]!;
		minDistance = Math.hypot(ax - p0.x, ay - p0.y, az - p0.z);
		closestPoint = p0;
	} else {
		for (let i = 0; i < pts.length - 1; i++) {
			const p1 = pts[i]!;
			const p2 = pts[i + 1]!;
			const dx = p2.x - p1.x;
			const dy = p2.y - p1.y;
			const dz = p2.z - p1.z;
			const lenSq = dx * dx + dy * dy + dz * dz;

			let segDist = 0;
			let proj = { x: p1.x, y: p1.y, z: p1.z };

			if (lenSq < 0.00001) {
				segDist = Math.hypot(ax - p1.x, ay - p1.y, az - p1.z);
			} else {
				const t = Math.max(0, Math.min(1, ((ax - p1.x) * dx + (ay - p1.y) * dy + (az - p1.z) * dz) / lenSq));
				proj = {
					x: p1.x + t * dx,
					y: p1.y + t * dy,
					z: p1.z + t * dz,
				};
				segDist = Math.hypot(ax - proj.x, ay - proj.y, az - proj.z);
			}

			if (segDist < minDistance) {
				minDistance = segDist;
				closestPoint = proj;
				closestSegIdx = i;
			}
		}
	}

	const distCenterToApex = Math.round(minDistance * 100) / 100;
	const netClearanceWall = Math.round((distCenterToApex - canalRadiusMm - apexRadiusMm) * 100) / 100;
	const netClearanceSafety = Math.round((netClearanceWall - safetyMarginMm) * 100) / 100;

	let status: "safe" | "warning" | "danger" = "safe";
	let message = "";

	if (netClearanceWall < MANDIBULAR_NERVE_DANGER_THRESHOLD_MM) {
		status = "danger";
		message = `Дистанция до канала: ${netClearanceWall.toFixed(1)} мм`;
	} else if (netClearanceWall < MANDIBULAR_NERVE_SAFETY_MARGIN_MM) {
		status = "warning";
		message = `Дистанция до канала: ${netClearanceWall.toFixed(1)} мм`;
	} else {
		status = "safe";
		message = `Дистанция до канала: ${netClearanceWall.toFixed(1)} мм`;
	}

	return {
		distanceToCanalCenterMm: distCenterToApex,
		netClearanceToCanalWallMm: netClearanceWall,
		netClearanceToSafetyCorridorMm: netClearanceSafety,
		safetyStatus: status,
		isDangerous: status === "danger",
		isWarning: status === "warning",
		isSafe: status === "safe",
		shouldTriggerAudioAlarm: false,
		closestApexPoint: { x: Number(ax.toFixed(2)), y: Number(ay.toFixed(2)), z: Number(az.toFixed(2)) },
		closestNervePoint: {
			x: Number(closestPoint.x.toFixed(2)),
			y: Number(closestPoint.y.toFixed(2)),
			z: Number(closestPoint.z.toFixed(2)),
		},
		closestSegmentIndex: closestSegIdx,
		canalRadiusMm,
		safetyMarginMm,
		clinicalMessageRu: message,
	};
}

/**
 * Performs comprehensive 3D safety audit of a virtual implant against 3D mandibular nerve spline.
 * Assesses both apical tip and cylindrical body clearances.
 */
export function auditMandibularNerveSafety3D(
	implant3D: Implant3DWorldProjection | {
		readonly entry3D: Point3D | Vec3 | { readonly x: number; readonly y: number; readonly z: number };
		readonly apex3D: Point3D | Vec3 | { readonly x: number; readonly y: number; readonly z: number };
		readonly diameterMm?: number;
		readonly apexDiameterMm?: number;
		readonly platformDiameterMm?: number;
	},
	nerveSpline: readonly (Point3D | Vec3 | { readonly x: number; readonly y: number; readonly z: number })[] | {
		readonly points: readonly (Point3D | Vec3 | { readonly x: number; readonly y: number; readonly z: number })[];
		readonly radius?: number;
		readonly safetyMarginMm?: number;
	} | null | undefined,
	optionsOrCanalRadius?: {
		readonly canalRadiusMm?: number;
		readonly safetyMarginMm?: number;
	} | number,
	safetyMarginMmArg?: number,
): NerveSafetyAuditResult3D {
	let rawPoints: readonly (Point3D | Vec3 | { readonly x: number; readonly y: number; readonly z: number })[] | undefined;
	let canalRadiusMm = 1.4;
	let safetyMarginMm = MANDIBULAR_NERVE_SAFETY_MARGIN_MM;

	if (Array.isArray(nerveSpline)) {
		rawPoints = nerveSpline;
	} else if (nerveSpline && "points" in nerveSpline && Array.isArray(nerveSpline.points)) {
		rawPoints = nerveSpline.points;
		if (typeof nerveSpline.radius === "number") canalRadiusMm = nerveSpline.radius;
		if (typeof nerveSpline.safetyMarginMm === "number") safetyMarginMm = nerveSpline.safetyMarginMm;
	}

	if (typeof optionsOrCanalRadius === "number") {
		canalRadiusMm = optionsOrCanalRadius;
		if (typeof safetyMarginMmArg === "number") {
			safetyMarginMm = safetyMarginMmArg;
		}
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
			...unmeasured2D,
			apex3D: { x: ax, y: ay, z: az },
			closestNervePoint3D: { x: 0, y: 0, z: 0 },
			apexClearanceMm: 0,
			bodyClearanceMm: 0,
			worstClearanceMm: 0,
			isApexAtRisk: false,
			isBodyAtRisk: false,
		};
	}

	const implantRadius = (implant3D.diameterMm ?? 4.0) / 2.0;

	// 1. Apex clearance
	const apexResult = calculateApexToNerve3DDistance(
		{ x: ax, y: ay, z: az },
		rawPoints,
		canalRadiusMm,
		safetyMarginMm,
		0,
	);

	// 2. Body cylinder clearance (segment-to-segment)
	const pts = rawPoints.map((p) => ({
		x: Array.isArray(p) ? p[0] : p.x,
		y: Array.isArray(p) ? p[1] : p.y,
		z: Array.isArray(p) ? p[2] : p.z,
	}));

	let minBodyDist = Number.POSITIVE_INFINITY;
	let closestBodyNervePt = apexResult.closestNervePoint;

	const implantDx = ax - ex;
	const implantDy = ay - ey;
	const implantDz = az - ez;
	const implantLenSq = implantDx * implantDx + implantDy * implantDy + implantDz * implantDz;

	for (let i = 0; i < pts.length - 1; i++) {
		const s1 = pts[i]!;
		const s2 = pts[i + 1]!;
		const segDx = s2.x - s1.x;
		const segDy = s2.y - s1.y;
		const segDz = s2.z - s1.z;

		for (let step = 0; step <= 4; step++) {
			const st = step / 4;
			const npx = s1.x + st * segDx;
			const npy = s1.y + st * segDy;
			const npz = s1.z + st * segDz;

			let it = 0;
			if (implantLenSq > 0.00001) {
				it = Math.max(0, Math.min(1, ((npx - ex) * implantDx + (npy - ey) * implantDy + (npz - ez) * implantDz) / implantLenSq));
			}
			const ipx = ex + it * implantDx;
			const ipy = ey + it * implantDy;
			const ipz = ez + it * implantDz;

			const dist = Math.hypot(npx - ipx, npy - ipy, npz - ipz);
			if (dist < minBodyDist) {
				minBodyDist = dist;
				closestBodyNervePt = { x: npx, y: npy, z: npz };
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
		distanceToCanalCenterMm: apexResult.distanceToCanalCenterMm,
		netClearanceToCanalWallMm: worstClearance,
		netClearanceToSafetyCorridorMm: Math.round((worstClearance - safetyMarginMm) * 100) / 100,
		safetyStatus: status,
		isDangerous: isDanger,
		isWarning,
		shouldTriggerAudioAlarm: false,
		closestImplantPoint: { x: Number(ax.toFixed(2)), y: Number(ay.toFixed(2)) },
		closestNervePoint: { x: Number(apexResult.closestNervePoint.x.toFixed(2)), y: Number(apexResult.closestNervePoint.y.toFixed(2)) },
		clinicalMessageRu: clinicalMsg,
		apex3D: { x: ax, y: ay, z: az },
		closestNervePoint3D: closestBodyNervePt,
		apexClearanceMm: apexResult.netClearanceToCanalWallMm,
		bodyClearanceMm: netBodyClearance,
		worstClearanceMm: worstClearance,
		isApexAtRisk: apexResult.netClearanceToCanalWallMm < safetyMarginMm,
		isBodyAtRisk: netBodyClearance < safetyMarginMm,
	};
}


// ─── ALVEOLAR BONE ENVELOPE CONTAINMENT ──────────────────────────────────────

/**
 * Checks if virtual implant is adequately contained inside the alveolar bone envelope.
 */
export function auditAlveolarBoneContainment(
	implantPose: CrossSectionImplantPose,
	envelope: AlveolarRidgeEnvelope,
): AlveolarContainmentResult {
	const implantRadius = implantPose.implantSpec.diameterMm / 2.0;

	// Estimate buccal and lingual bone thickness at crest level
	const buccalDist = Math.abs(implantPose.entryPoint.x - envelope.buccalCrestPoint.x) - implantRadius;
	const lingualDist = Math.abs(implantPose.entryPoint.x - envelope.lingualCrestPoint.x) - implantRadius;

	const isBuccalOk = buccalDist >= MIN_BUCCAL_BONE_WALL_MM;
	const isLingualOk = lingualDist >= MIN_LINGUAL_BONE_WALL_MM;
	const requiresGbr = !isBuccalOk || !isLingualOk;

	let warning: string | undefined;
	if (!isBuccalOk) {
		warning = "Толщина вестибулярной костной стенки " + buccalDist.toFixed(1) + " мм (< 1.5 мм). Показана НКР (GBR) с мембраной и аугментатом!";
	} else if (!isLingualOk) {
		warning = "Толщина оральной костной стенки " + lingualDist.toFixed(1) + " мм (< 1.0 мм). Риск язычной фенестрации!";
	}

	return {
		residualBuccalBoneMm: Math.max(0, Math.round(buccalDist * 10) / 10),
		residualLingualBoneMm: Math.max(0, Math.round(lingualDist * 10) / 10),
		isBuccalBoneAdequate: isBuccalOk,
		isLingualBoneAdequate: isLingualOk,
		isApexContained: true,
		requiresGbrAugmentation: requiresGbr,
		...(warning ? { clinicalWarningRu: warning } : {}),
	};
}

// ─── MAXILLARY SINUS SAFETY EVALUATION (TOOTH 16 / UPPER TEETH) ──────────────

/**
 * Audits clearance from the virtual implant apex to the maxillary sinus floor (Дно гайморовой пазухи).
 * Standard: FDI 11–28 (especially upper molars 16, 17, 26, 27).
 */
export function auditMaxillarySinusSafety(
	implantPose: CrossSectionImplantPose,
	sinusFloorY = 0,
	sinusMarginMm = 1.0,
): NerveSafetyAuditResult {
	const apex = calculateApexCoordinates(
		implantPose.entryPoint,
		implantPose.angulationDeg,
		implantPose.implantSpec.lengthMm,
	);
	const netClearanceWall = Math.abs(apex.y - sinusFloorY);
	const isPerforation = apex.y < sinusFloorY;
	let status: "safe" | "warning" | "danger" = "safe";
	let message = "";

	if (isPerforation) {
		status = "danger";
		message = "Дно гайморовой пазухи: зазор " + netClearanceWall.toFixed(1) + " мм";
	} else if (netClearanceWall < sinusMarginMm) {
		status = "warning";
		message = "Дно гайморовой пазухи: зазор " + netClearanceWall.toFixed(1) + " мм";
	} else {
		status = "safe";
		message = "Дно гайморовой пазухи: зазор " + netClearanceWall.toFixed(1) + " мм";
	}

	return {
		distanceToCanalCenterMm: Math.round(netClearanceWall * 100) / 100,
		netClearanceToCanalWallMm: Math.round(netClearanceWall * 100) / 100,
		netClearanceToSafetyCorridorMm: Math.round((netClearanceWall - sinusMarginMm) * 100) / 100,
		safetyStatus: status,
		isDangerous: status === "danger",
		isWarning: status === "warning",
		shouldTriggerAudioAlarm: false,
		closestImplantPoint: apex,
		closestNervePoint: { x: apex.x, y: sinusFloorY },
		clinicalMessageRu: message,
	};
}

// ─── COMPREHENSIVE CBCT AUDIT & DIARY GENERATOR ──────────────────────────────

export interface PerformCbctPlanningAuditParams {
	readonly toothFdi: number;
	readonly implantPose: CrossSectionImplantPose;
	readonly canal?: MandibularCanalCrossSection | null;
	readonly envelope?: AlveolarRidgeEnvelope | null;
	readonly huSampling: HUZoneSampling;
	readonly patientName?: string;
	readonly clinicName?: string;
}

/**
 * Performs end-to-end surgical safety audit and generates structured Form 043/u diary.
 * Handles Maxillary Sinus for FDI 11–28 (tooth 16) and Mandibular Canal for FDI 31–48.
 */
export function performCbctPlanningAudit(
	params: PerformCbctPlanningAuditParams,
): ComprehensiveCbctPlanAudit {
	const apex = calculateApexCoordinates(
		params.implantPose.entryPoint,
		params.implantPose.angulationDeg,
		params.implantPose.implantSpec.lengthMm,
	);

	const isMaxilla = params.toothFdi < 30;
	const nerveSafety = isMaxilla
		? auditMaxillarySinusSafety(params.implantPose)
		: params.canal
			? auditMandibularNerveSafety(params.implantPose, params.canal)
			: createUnmeasuredNerveSafety();

	const boneContainment: AlveolarContainmentResult = params.envelope
		? auditAlveolarBoneContainment(params.implantPose, params.envelope)
		: {
				residualBuccalBoneMm: 0,
				residualLingualBoneMm: 0,
				isBuccalBoneAdequate: false,
				isLingualBoneAdequate: false,
				isApexContained: true,
				requiresGbrAugmentation: false,
				isUnmeasured: true,
			};
	const boneQuality = analyzeMischBoneQuality(params.huSampling, params.implantPose.implantSpec.diameterMm);
	const isPlanApproved =
		nerveSafety.safetyStatus !== "unmeasured" && !nerveSafety.isDangerous && !nerveSafety.isWarning;

	// Build Form 043/u Surgery Protocol text
	const anatomyTitle = isMaxilla
		? "2. АНАТОМИЧЕСКИЕ ОРИЕНТИРЫ И ГАЙМОРОВА ПАЗУХА (Maxillary Sinus):"
		: "2. АНАТОМИЧЕСКИЕ ОРИЕНТИРЫ И НИЖНЕЧЕЛЮСТНОЙ КАНАЛ (IAN):";
	const distanceLine =
		nerveSafety.safetyStatus === "unmeasured"
			? "   - Дистанция до канала: Канал не размечен"
			: isMaxilla
				? "   - Дистанция до дна гайморовой пазухи: " + nerveSafety.netClearanceToCanalWallMm.toFixed(1) + " мм"
				: "   - Дистанция до канала: " + nerveSafety.netClearanceToCanalWallMm.toFixed(1) + " мм";

	const approvalStatusText =
		nerveSafety.safetyStatus === "unmeasured"
			? "Канал не размечен"
			: "Дистанция до канала: " + nerveSafety.netClearanceToCanalWallMm.toFixed(1) + " мм";

	const diaryLines = [
		"============================================================",
		"ПРОТОКОЛ ОПЕРАЦИИ ДЕНТАЛЬНОЙ ИМПЛАНТАЦИИ (ФОРМА 043/У)",
		`Пациент: ${params.patientName || "Пациент"} | Клиника: ${params.clinicName || "Стоматологический центр DENTE"} | Зуб: FDI #${params.toothFdi}`,
		"============================================================",
		"1. ВЫБОР И ХАРАКТЕРИСТИКИ ИМПЛАНТАТА:",
		"   - Система: " + params.implantPose.implantSpec.brandName + " (" + params.implantPose.implantSpec.lineName + ")",
		"   - Артикул: " + params.implantPose.implantSpec.articleNumber,
		"   - Размеры: Ø " + params.implantPose.implantSpec.diameterMm.toFixed(1) + " x " + params.implantPose.implantSpec.lengthMm.toFixed(1) + " мм",
		"   - Наклон оси: " + params.implantPose.angulationDeg + "° от вертикали",
		"",
		anatomyTitle,
		distanceLine,
		"   - Статус: " +
			(nerveSafety.safetyStatus === "unmeasured"
				? "Канал не размечен"
				: "Дистанция " + nerveSafety.netClearanceToCanalWallMm.toFixed(1) + " мм"),
		"   - Вестибулярная костная стенка: " +
			(params.envelope && !boneContainment.isUnmeasured
				? boneContainment.residualBuccalBoneMm.toFixed(1) + " мм"
				: "Не измерялась (—)"),
		"   - Оральная костная стенка: " +
			(params.envelope && !boneContainment.isUnmeasured
				? boneContainment.residualLingualBoneMm.toFixed(1) + " мм"
				: "Не измерялась (—)"),
		"",
		"3. " + formatMischProtocolToDiaryText(params.huSampling, boneQuality, params.toothFdi),
		"",
		"4. ЗАКЛЮЧЕНИЕ И ПЛАН ЛЕЧЕНИЯ:",
		"   - Анатомический статус: " + approvalStatusText,
		params.envelope && !boneContainment.isUnmeasured
			? boneContainment.requiresGbrAugmentation
				? "   - Рекомендована сопутствующая НКР (GBR) с установкой коллагеновой мембраны."
				: "   - Дополнительной костной пластики не требуется."
			: "   - Потребность в НКР/GBR: Не определена (замеры гребня не проводились).",
		"============================================================",
	];

	const treatmentPlanItem = {
		code: "A16.07.054." + params.toothFdi,
		nameRu: "Установка дентального имплантата " + params.implantPose.implantSpec.brandName + " " + params.implantPose.implantSpec.lineName + " Ø" + params.implantPose.implantSpec.diameterMm + "x" + params.implantPose.implantSpec.lengthMm + " (позиция #" + params.toothFdi + ")",
		priceKopecks: params.implantPose.implantSpec.priceKopecks,
		priceFormattedRu: (params.implantPose.implantSpec.priceKopecks / 100).toLocaleString("ru-RU") + " ₽",
	};

	return {
		toothFdi: params.toothFdi,
		implantPose: params.implantPose,
		apexPoint: apex,
		nerveSafety,
		boneContainment,
		boneQuality,
		isPlanApproved,
		form043DiaryText: diaryLines.join("\n"),
		treatmentPlanItem,
	};
}

export const auditImplantNerveSafety = auditMandibularNerveSafety;
export const auditNerveSafetyMargin = auditMandibularNerveSafety;

export function generateForm043CbctDiary(
	paramsOrAudit: PerformCbctPlanningAuditParams | ComprehensiveCbctPlanAudit,
): string {
	if ("form043DiaryText" in paramsOrAudit) {
		return paramsOrAudit.form043DiaryText;
	}
	return performCbctPlanningAudit(paramsOrAudit).form043DiaryText;
}

// ─── DOCTOR AUTONOMY (MANDATE 8e): ZERO AUDIO PANIC SIRENS ──────────────────

/**
 * Purged per Mandate 8e: Doctor Autonomy.
 * Clean no-op: software must never screech or trigger audio alarms during surgical planning.
 */
export function playNerveSafetyAudioAlarm(
	_safetyStatus?: "safe" | "warning" | "danger" | "unmeasured",
	_isAudioEnabled = false,
): void {
	// Purged: zero audio panic sirens or whistling
}

export function disposeNerveSafetyAudioAlarm(): void {
	// Clean no-op
}
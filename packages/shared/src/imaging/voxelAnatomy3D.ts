/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTAL 3D VOXEL ANATOMY & IMPLANT CALIBRATION ENGINE
 * Voxel Spacing (X, Y, Z), Mandibular Nerve Safety Corridors & Maxillary Sinus Floor
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { VoxelSpacing3D } from "./dicomParser.js";

export interface Point3D {
	readonly x: number;
	readonly y: number;
	readonly z: number;
}

export type VoxelSpacingInput = VoxelSpacing3D | readonly [number, number, number];

export function normalizeVoxelSpacing(input: VoxelSpacingInput): VoxelSpacing3D {
	if (Array.isArray(input)) {
		const arr = input as readonly [number, number, number];
		return {
			x: Math.max(1e-4, arr[0] ?? 0.2),
			y: Math.max(1e-4, arr[1] ?? 0.2),
			z: Math.max(1e-4, arr[2] ?? 0.5),
		};
	}
	const obj = input as VoxelSpacing3D;
	return {
		x: Math.max(1e-4, obj.x || 0.2),
		y: Math.max(1e-4, obj.y || 0.2),
		z: Math.max(1e-4, obj.z || 0.5),
	};
}

/**
 * Calculates physical 3D Euclidean distance in mm calibrated with anisotropic voxel spacing.
 */
export function measure3DDistanceMm(
	p1: Point3D,
	p2: Point3D,
	voxelSpacing: VoxelSpacingInput = { x: 0.2, y: 0.2, z: 0.5 },
): number {
	const sp = normalizeVoxelSpacing(voxelSpacing);
	const dxMm = (p2.x - p1.x) * sp.x;
	const dyMm = (p2.y - p1.y) * sp.y;
	const dzMm = (p2.z - p1.z) * sp.z;
	const dist = Math.sqrt(dxMm * dxMm + dyMm * dyMm + dzMm * dzMm);
	return Number(dist.toFixed(2));
}

/**
 * Calculates shortest distance from a 3D point to a 3D line segment (in physical mm).
 */
export function distancePointToSegment3DMm(
	point: Point3D,
	segStart: Point3D,
	segEnd: Point3D,
	voxelSpacing: VoxelSpacingInput,
): { readonly distanceMm: number; readonly closestPoint: Point3D } {
	const sp = normalizeVoxelSpacing(voxelSpacing);

	// Convert points to physical mm space
	const pMm = { x: point.x * sp.x, y: point.y * sp.y, z: point.z * sp.z };
	const aMm = { x: segStart.x * sp.x, y: segStart.y * sp.y, z: segStart.z * sp.z };
	const bMm = { x: segEnd.x * sp.x, y: segEnd.y * sp.y, z: segEnd.z * sp.z };

	const abX = bMm.x - aMm.x;
	const abY = bMm.y - aMm.y;
	const abZ = bMm.z - aMm.z;
	const abLenSq = abX * abX + abY * abY + abZ * abZ;

	if (abLenSq <= 1e-9) {
		const dist = Math.hypot(pMm.x - aMm.x, pMm.y - aMm.y, pMm.z - aMm.z);
		return {
			distanceMm: Number(dist.toFixed(2)),
			closestPoint: segStart,
		};
	}

	const apX = pMm.x - aMm.x;
	const apY = pMm.y - aMm.y;
	const apZ = pMm.z - aMm.z;

	let t = (apX * abX + apY * abY + apZ * abZ) / abLenSq;
	t = Math.max(0, Math.min(1, t));

	// Closest point in voxel space
	const closestVoxel: Point3D = {
		x: segStart.x + (segEnd.x - segStart.x) * t,
		y: segStart.y + (segEnd.y - segStart.y) * t,
		z: segStart.z + (segEnd.z - segStart.z) * t,
	};

	// Closest point in mm
	const cMmX = aMm.x + abX * t;
	const cMmY = aMm.y + abY * t;
	const cMmZ = aMm.z + abZ * t;

	const dist = Math.hypot(pMm.x - cMmX, pMm.y - cMmY, pMm.z - cMmZ);

	return {
		distanceMm: Number(dist.toFixed(2)),
		closestPoint: closestVoxel,
	};
}

/** ─── 1. MANDIBULAR NERVE (НИЖНЕЧЕЛЮСТНОЙ КАНАЛ) SAFETY CORRIDOR ─── */

export interface MandibularNerveMeasurement {
	readonly distanceMm: number;
	readonly safetyZone: "safe" | "warning" | "danger";
	readonly isSafe: boolean;
	readonly clinicalAdvice: string;
	readonly closestNervePoint: Point3D;
	readonly voxelSpacing: VoxelSpacing3D;
}

/**
 * Evaluates the safety distance from an implant apex to the mandibular canal (N. Alveolaris Inferior).
 * - Safe: >= 2.0 mm
 * - Warning: 1.0 - 2.0 mm
 * - Danger: < 1.0 mm (Immediate risk of neurotmesis/paresthesia)
 */
export function measureDistanceToMandibularNerve(
	implantApex: Point3D,
	nerveTrajectoryPoints: readonly Point3D[],
	voxelSpacing: VoxelSpacingInput = { x: 0.2, y: 0.2, z: 0.5 },
): MandibularNerveMeasurement {
	const sp = normalizeVoxelSpacing(voxelSpacing);

	if (nerveTrajectoryPoints.length === 0) {
		return {
			distanceMm: 999.0,
			safetyZone: "safe",
			isSafe: true,
			clinicalAdvice: "Траектория нижнечелюстного канала не размечена.",
			closestNervePoint: implantApex,
			voxelSpacing: sp,
		};
	}

	if (nerveTrajectoryPoints.length === 1) {
		const singlePt = nerveTrajectoryPoints[0]!;
		const dist = measure3DDistanceMm(implantApex, singlePt, sp);
		const safetyZone = dist >= 2.0 ? "safe" : dist >= 1.0 ? "warning" : "danger";
		const isSafe = safetyZone === "safe";

		const clinicalAdvice = isSafe
			? "Безопасный коридор (≥ 2.0 мм). Риск повреждения сосудисто-нервного пучка минимален."
			: safetyZone === "warning"
				? "Зона повышенного внимания (1.0–2.0 мм). Рекомендуется контроль торка и длины имплантата."
				: "ОПАСНО: расстояние < 1.0 мм! Критический риск парестезии и травмы нижнего альвеолярного нерва.";

		return {
			distanceMm: dist,
			safetyZone,
			isSafe,
			clinicalAdvice,
			closestNervePoint: singlePt,
			voxelSpacing: sp,
		};
	}

	let minDistance = Infinity;
	let bestClosestPoint: Point3D = nerveTrajectoryPoints[0]!;

	for (let i = 0; i < nerveTrajectoryPoints.length - 1; i++) {
		const pA = nerveTrajectoryPoints[i]!;
		const pB = nerveTrajectoryPoints[i + 1]!;
		const result = distancePointToSegment3DMm(implantApex, pA, pB, sp);
		if (result.distanceMm < minDistance) {
			minDistance = result.distanceMm;
			bestClosestPoint = result.closestPoint;
		}
	}

	const safetyZone = minDistance >= 2.0 ? "safe" : minDistance >= 1.0 ? "warning" : "danger";
	const isSafe = safetyZone === "safe";

	const clinicalAdvice = isSafe
		? "Безопасный коридор (≥ 2.0 мм). Риск повреждения сосудисто-нервного пучка минимален."
		: safetyZone === "warning"
			? "Зона повышенного внимания (1.0–2.0 мм). Рекомендуется контроль торка и длины имплантата."
			: "ОПАСНО: расстояние < 1.0 мм! Критический риск парестезии и травмы нижнего альвеолярного нерва.";

	return {
		distanceMm: Number(minDistance.toFixed(2)),
		safetyZone,
		isSafe,
		clinicalAdvice,
		closestNervePoint: bestClosestPoint,
		voxelSpacing: sp,
	};
}

/** ─── 2. MAXILLARY SINUS FLOOR (ДНО ГАЙМОРОВОЙ ПАЗУХИ) & SINUS LIFT PROTOCOL ─── */

export interface MaxillarySinusMeasurement {
	readonly residualBoneHeightMm: number;
	readonly sinusLiftRecommended: boolean;
	readonly sinusLiftType: "none" | "crestal_closed" | "lateral_open";
	readonly clinicalAdvice: string;
	readonly voxelSpacing: VoxelSpacing3D;
}

/**
 * Measures residual alveolar bone height to the floor of the maxillary sinus
 * and calculates surgical sinus lift indications (Crestal Summers vs Lateral Window).
 */
export function measureDistanceToMaxillarySinus(
	alveolarCrestPoint: Point3D,
	sinusFloorPoint: Point3D,
	voxelSpacing: VoxelSpacingInput = { x: 0.2, y: 0.2, z: 0.5 },
): MaxillarySinusMeasurement {
	const sp = normalizeVoxelSpacing(voxelSpacing);
	const heightMm = measure3DDistanceMm(alveolarCrestPoint, sinusFloorPoint, sp);

	if (heightMm >= 8.0) {
		return {
			residualBoneHeightMm: heightMm,
			sinusLiftRecommended: false,
			sinusLiftType: "none",
			clinicalAdvice: `Достаточная высота альвеолярного гребня (${heightMm.toFixed(1)} мм ≥ 8.0 мм). Возможна прямая дентальная имплантация без аугментации пазухи.`,
			voxelSpacing: sp,
		};
	}

	if (heightMm >= 5.0) {
		return {
			residualBoneHeightMm: heightMm,
			sinusLiftRecommended: true,
			sinusLiftType: "crestal_closed",
			clinicalAdvice: `Умеренная резорбция (${heightMm.toFixed(1)} мм, 5.0–8.0 мм). Показан закрытый (транскрестальный) синус-лифтинг по Саммерсу с одномоментной установкой имплантата.`,
			voxelSpacing: sp,
		};
	}

	return {
		residualBoneHeightMm: heightMm,
		sinusLiftRecommended: true,
		sinusLiftType: "lateral_open",
		clinicalAdvice: `Выраженная атрофия кости (${heightMm.toFixed(1)} мм < 5.0 мм). Показан открытый (латеральный) синус-лифтинг с костной пластикой и мембраной.`,
		voxelSpacing: sp,
	};
}

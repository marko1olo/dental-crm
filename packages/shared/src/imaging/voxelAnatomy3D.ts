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

/** ─── 3. 3D ANGLE & INCLINATION CALCULATOR (ROOT / IMPLANT AXIS) ─── */

/**
 * Calculates 3D angle in degrees θ ∈ [0°, 180°] between two spatial vectors.
 */
export function calculateVectorAngleDegrees(v1: Point3D, v2: Point3D): number {
	const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
	const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
	if (len1 <= 1e-9 || len2 <= 1e-9) return 0;

	const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
	const cosTheta = Math.max(-1.0, Math.min(1.0, dot / (len1 * len2)));
	const angleRad = Math.acos(cosTheta);
	return Number(((angleRad * 180) / Math.PI).toFixed(1));
}

/**
 * Calculates 3D angle in degrees θ ∈ [0°, 180°] defined by three points (p1 -> vertex -> p2).
 * Calibrated with anisotropic voxel spacing if provided.
 */
export function calculate3DAngleDegrees(
	p1: Point3D,
	vertex: Point3D,
	p2: Point3D,
	voxelSpacing: VoxelSpacingInput = { x: 0.2, y: 0.2, z: 0.5 },
): number {
	const sp = normalizeVoxelSpacing(voxelSpacing);
	const v1: Point3D = {
		x: (p1.x - vertex.x) * sp.x,
		y: (p1.y - vertex.y) * sp.y,
		z: (p1.z - vertex.z) * sp.z,
	};
	const v2: Point3D = {
		x: (p2.x - vertex.x) * sp.x,
		y: (p2.y - vertex.y) * sp.y,
		z: (p2.z - vertex.z) * sp.z,
	};
	return calculateVectorAngleDegrees(v1, v2);
}

/** ─── 4. MISCH BONE DENSITY (HU) EVALUATION & SURGICAL PROTOCOLS ─── */

export type MischBoneClass = "D1" | "D2" | "D3" | "D4" | "D5";

export interface HUZoneSampling {
	readonly coronalCrestalHU: number; // Coronal 20%
	readonly trabecularCoreHU: number; // Mid 60%
	readonly apicalBaseHU: number; // Apical 20%
	readonly overallMeanHU: number; // Weighted average
}

export interface MischClassificationResult {
	readonly mischClass: MischBoneClass;
	readonly classNameRu: string;
	readonly anatomicalLocationRu: string;
	readonly tactileFeelRu: string;
	readonly vascularityLevel: "low" | "moderate" | "high" | "very_high";
	readonly recommendedDrillingRpm: string;
	readonly underdrillingRecommended: boolean;
	readonly underdrillingMm: number;
	readonly corticalTapRequired: boolean;
	readonly countersinkRequired: boolean;
	readonly estimatedInsertionTorqueNcm: {
		readonly minNcm: number;
		readonly maxNcm: number;
		readonly expectedNcm: number;
	};
	readonly estimatedIsqScore: {
		readonly minIsq: number;
		readonly maxIsq: number;
		readonly expectedIsq: number;
	};
	readonly isImmediateLoadingEligible: boolean;
	readonly healingPeriodWeeks: number;
	readonly clinicalAdvice: readonly string[];
}

export const MISCH_HU_THRESHOLDS = {
	D1_MIN: 1250,
	D2_MIN: 850,
	D3_MIN: 350,
	D4_MIN: 150,
} as const;

/**
 * Classifies raw Hounsfield Unit (HU) into Carl E. Misch bone density category.
 */
export function classifyHUToMisch(hu: number): MischBoneClass {
	if (hu > MISCH_HU_THRESHOLDS.D1_MIN) return "D1";
	if (hu >= MISCH_HU_THRESHOLDS.D2_MIN) return "D2";
	if (hu >= MISCH_HU_THRESHOLDS.D3_MIN) return "D3";
	if (hu >= MISCH_HU_THRESHOLDS.D4_MIN) return "D4";
	return "D5";
}

/**
 * Analyzes bone quality from HU sampling per Carl E. Misch criteria.
 */
export function analyzeMischBoneQuality(
	sampling: HUZoneSampling,
	implantDiameterMm = 4.0,
): MischClassificationResult {
	const mischClass = classifyHUToMisch(sampling.overallMeanHU);

	switch (mischClass) {
		case "D1":
			return {
				mischClass: "D1",
				classNameRu: "D1 (> 1250 HU) — Плотная кортикальная кость",
				anatomicalLocationRu: "Передний отдел нижней челюсти (симфиз)",
				tactileFeelRu: "Ощущение сверления дубовой древесины или слоновой кости",
				vascularityLevel: "low",
				recommendedDrillingRpm: "400–600 RPM (пониженные обороты)",
				underdrillingRecommended: false,
				underdrillingMm: 0,
				corticalTapRequired: true,
				countersinkRequired: true,
				estimatedInsertionTorqueNcm: { minNcm: 45, maxNcm: 65, expectedNcm: 50 },
				estimatedIsqScore: { minIsq: 75, maxIsq: 85, expectedIsq: 80 },
				isImmediateLoadingEligible: true,
				healingPeriodWeeks: 12,
				clinicalAdvice: [
					"Обязательно использование кортикального метчика (Bone Tap) на всю длину имплантата.",
					"Обильное охлаждение стерильным физраствором (4°C) на низких оборотах во избежание остеонекроза.",
					"Увеличенное время остеоинтеграции (3-4 мес.) из-за низкой васкуляризации.",
				],
			};

		case "D2":
			return {
				mischClass: "D2",
				classNameRu: "D2 (850–1250 HU) — Пористая кортикальная + плотная губчатая",
				anatomicalLocationRu: "Дистальный отдел н/ч, передний отдел в/ч",
				tactileFeelRu: "Ощущение сверления плотной древесины сосны",
				vascularityLevel: "moderate",
				recommendedDrillingRpm: "800–1000 RPM (стандартный протокол)",
				underdrillingRecommended: false,
				underdrillingMm: 0,
				corticalTapRequired: sampling.coronalCrestalHU > 1200,
				countersinkRequired: true,
				estimatedInsertionTorqueNcm: { minNcm: 35, maxNcm: 45, expectedNcm: 40 },
				estimatedIsqScore: { minIsq: 70, maxIsq: 80, expectedIsq: 75 },
				isImmediateLoadingEligible: true,
				healingPeriodWeeks: 10,
				clinicalAdvice: [
					"Золотой стандарт для дентальной имплантации: идеальный баланс механической фиксации и сосудистого русла.",
					"Превосходный кандидат для немедленной функциональной нагрузки при торке >= 35 Н·см.",
				],
			};

		case "D3":
			return {
				mischClass: "D3",
				classNameRu: "D3 (350–850 HU) — Тонкая кортикальная + мелкопористая губчатая",
				anatomicalLocationRu: "Передний и боковой отделы верхней челюсти",
				tactileFeelRu: "Ощущение сверления прессованной фанеры",
				vascularityLevel: "high",
				recommendedDrillingRpm: "1000–1200 RPM",
				underdrillingRecommended: false,
				underdrillingMm: 0,
				corticalTapRequired: false,
				countersinkRequired: false,
				estimatedInsertionTorqueNcm: { minNcm: 25, maxNcm: 35, expectedNcm: 30 },
				estimatedIsqScore: { minIsq: 62, maxIsq: 72, expectedIsq: 67 },
				isImmediateLoadingEligible: false,
				healingPeriodWeeks: 12,
				clinicalAdvice: [
					"Щадящее сверление без кортикального метчика.",
					"Высокая васкуляризация обеспечивает быструю остеоинтеграцию.",
				],
			};

		case "D4":
			return {
				mischClass: "D4",
				classNameRu: "D4 (150–350 HU) — Мягкая губчатая кость",
				anatomicalLocationRu: "Бугор верхней челюсти, область синуса",
				tactileFeelRu: "Ощущение сверления пенопласта или сахара",
				vascularityLevel: "very_high",
				recommendedDrillingRpm: "600–800 RPM (с конденсацией кости)",
				underdrillingRecommended: true,
				underdrillingMm: implantDiameterMm >= 4.0 ? 0.8 : 0.5,
				corticalTapRequired: false,
				countersinkRequired: false,
				estimatedInsertionTorqueNcm: { minNcm: 15, maxNcm: 25, expectedNcm: 20 },
				estimatedIsqScore: { minIsq: 50, maxIsq: 62, expectedIsq: 56 },
				isImmediateLoadingEligible: false,
				healingPeriodWeeks: 16,
				clinicalAdvice: [
					"Недопрепарирование (Under-Drilling) на 1-2 шага меньше номинального диаметра.",
					"Рекомендуется применение костных остеотомов для радиальной конденсации.",
				],
			};

		case "D5":
		default:
			return {
				mischClass: "D5",
				classNameRu: "D5 (< 150 HU) — Экстремально мягкая кость / дефицит",
				anatomicalLocationRu: "Постэкстракционная лунка в ранней фазе, атрофия",
				tactileFeelRu: "Отсутствие механического сопротивления",
				vascularityLevel: "very_high",
				recommendedDrillingRpm: "400–600 RPM",
				underdrillingRecommended: true,
				underdrillingMm: 1.2,
				corticalTapRequired: false,
				countersinkRequired: false,
				estimatedInsertionTorqueNcm: { minNcm: 10, maxNcm: 20, expectedNcm: 15 },
				estimatedIsqScore: { minIsq: 40, maxIsq: 52, expectedIsq: 46 },
				isImmediateLoadingEligible: false,
				healingPeriodWeeks: 24,
				clinicalAdvice: [
					"Необходима предварительная костная пластика (GBR/НКР).",
					"Бикортикальное зацепление апекса для достижения первичной фиксации.",
				],
			};
	}
}

/**
 * Calculates statistical metrics (mean, min, max, stdDev) for a Region of Interest (ROI) of HU values.
 */
export function calculateRoiDensityStats(huValues: readonly number[]): {
	readonly meanHu: number;
	readonly minHu: number;
	readonly maxHu: number;
	readonly stdDevHu: number;
	readonly boneClassification: MischBoneClass;
} {
	if (huValues.length === 0) {
		return {
			meanHu: 0,
			minHu: 0,
			maxHu: 0,
			stdDevHu: 0,
			boneClassification: "D5",
		};
	}

	let sum = 0;
	let min = Infinity;
	let max = -Infinity;

	for (const val of huValues) {
		sum += val;
		if (val < min) min = val;
		if (val > max) max = val;
	}

	const mean = sum / huValues.length;

	let varianceSum = 0;
	for (const val of huValues) {
		const diff = val - mean;
		varianceSum += diff * diff;
	}
	const stdDev = Math.sqrt(varianceSum / huValues.length);

	const meanRounded = Math.round(mean);
	return {
		meanHu: meanRounded,
		minHu: Math.round(min),
		maxHu: Math.round(max),
		stdDevHu: Number(stdDev.toFixed(1)),
		boneClassification: classifyHUToMisch(meanRounded),
	};
}

/** ─── 5. 3D NERVE SPLINE INTERPOLATION & TRAJECTORY LENGTH ─── */

/**
 * Interpolates 3D points along a mandibular nerve trajectory using Catmull-Rom spline in 3D.
 */
export function interpolateNerveSpline3D(
	controlPoints: readonly Point3D[],
	subdivisionsPerSegment = 10,
): Point3D[] {
	if (controlPoints.length < 2) return [...controlPoints];
	if (controlPoints.length === 2) {
		const [p0, p1] = controlPoints;
		if (!p0 || !p1) return [];
		const result: Point3D[] = [];
		for (let i = 0; i <= subdivisionsPerSegment; i++) {
			const t = i / subdivisionsPerSegment;
			result.push({
				x: Number((p0.x + (p1.x - p0.x) * t).toFixed(3)),
				y: Number((p0.y + (p1.y - p0.y) * t).toFixed(3)),
				z: Number((p0.z + (p1.z - p0.z) * t).toFixed(3)),
			});
		}
		return result;
	}

	const pts = controlPoints;
	const n = pts.length;
	const spline: Point3D[] = [];

	for (let i = 0; i < n - 1; i++) {
		const p0 = i > 0 ? pts[i - 1]! : pts[i]!;
		const p1 = pts[i]!;
		const p2 = pts[i + 1]!;
		const p3 = i < n - 2 ? pts[i + 2]! : p2;

		for (let step = 0; step < subdivisionsPerSegment; step++) {
			const t = step / subdivisionsPerSegment;
			const t2 = t * t;
			const t3 = t2 * t;

			const x = 0.5 * (
				(2 * p1.x) +
				(-p0.x + p2.x) * t +
				(2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
				(-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
			);

			const y = 0.5 * (
				(2 * p1.y) +
				(-p0.y + p2.y) * t +
				(2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
				(-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
			);

			const z = 0.5 * (
				(2 * p1.z) +
				(-p0.z + p2.z) * t +
				(2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
				(-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3
			);

			spline.push({
				x: Number(x.toFixed(3)),
				y: Number(y.toFixed(3)),
				z: Number(z.toFixed(3)),
			});
		}
	}

	const last = pts[n - 1]!;
	spline.push({
		x: Number(last.x.toFixed(3)),
		y: Number(last.y.toFixed(3)),
		z: Number(last.z.toFixed(3)),
	});
	return spline;
}

/**
 * Calculates physical 3D length in millimeters along a multi-point 3D nerve curve.
 */
export function calculateNerveTrajectoryLength3DMm(
	points: readonly Point3D[],
	voxelSpacing: VoxelSpacingInput = { x: 0.2, y: 0.2, z: 0.5 },
): number {
	if (points.length < 2) return 0;
	let totalMm = 0;
	for (let i = 0; i < points.length - 1; i++) {
		totalMm += measure3DDistanceMm(points[i]!, points[i + 1]!, voxelSpacing);
	}
	return Number(totalMm.toFixed(2));
}

/**
 * Calibrates base voxel spacing (in mm/voxel along X/Y axes) from a known physical reference marker
 * measured between two 3D voxel coordinates, accurately accounting for anisotropic Z-axis scale
 * (slice thickness vs in-plane resolution).
 *
 * Physical distance: D² = (dx · s_x)² + (dy · s_y)² + (dz · s_z)²
 * Expressed relative to base spacing s_x:
 *   D² = s_x² · [ (dx · r_x)² + (dy · r_y)² + (dz · r_z)² ]
 * where r_i = s_i / s_x is the relative voxel aspect ratio along each axis.
 * Therefore:
 *   s_x = D / √[ (dx · r_x)² + (dy · r_y)² + (dz · r_z)² ]
 */
export function calibrateVoxelSpacingFromKnownDistance(
	p1: Point3D,
	p2: Point3D,
	knownPhysicalMm: number,
	relativeVoxelSpacing: VoxelSpacingInput = { x: 0.2, y: 0.2, z: 0.5 },
): number {
	const sp = normalizeVoxelSpacing(relativeVoxelSpacing);
	const baseScale = sp.x > 0 ? sp.x : 0.2;
	const relX = sp.x / baseScale;
	const relY = sp.y / baseScale;
	const relZ = sp.z / baseScale;

	const dx = (p2.x - p1.x) * relX;
	const dy = (p2.y - p1.y) * relY;
	const dz = (p2.z - p1.z) * relZ;

	const effectiveVoxelDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
	if (effectiveVoxelDist <= 1e-9 || knownPhysicalMm <= 0) return 0.2;
	return Number((knownPhysicalMm / effectiveVoxelDist).toFixed(6));
}

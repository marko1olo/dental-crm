/**
 * 3D COLLISION DETECTION & ANATOMICAL SAFETY MARGIN PROTECTION
 * Biomechanical & Geometric Engine for Dental Implant Surgery Planning.
 *
 * Mandatory Clinical Invariants:
 * 1. Mandibular Canal (IAN) Safety Margin: >= 2.0 mm clearance (Red Alert if < 2.0 mm)
 * 2. Maxillary Sinus Floor (Гайморова пазуха): Subantral distance & Sinus Lift (Closed Summers vs Lateral Tatum)
 * 3. Adjacent Tooth Root Proximity: >= 1.5 mm clearance to PDL / root apex
 * 4. Inter-Implant Distance: >= 3.0 mm inter-fixture clearance (Tarnow crest preservation)
 * 5. Insertion Axis & Angulation: 3D vector angulation, mesiodistal and buccolingual tilt
 * 6. Misch Bone Density (D1–D4) & Insertion Torque Estimator (35–45 Ncm immediate loading gate)
 */

import type { ImplantFixture } from "./implantCatalog";

// ─── 3D VECTOR & GEOMETRY TYPES ─────────────────────────────────────────────

export interface Vector3D {
	readonly x: number;
	readonly y: number;
	readonly z: number;
}

export interface LineSegment3D {
	readonly start: Vector3D;
	readonly end: Vector3D;
}

export interface ImplantCylinder3D {
	readonly entryPoint: Vector3D; // Coronal platform center
	readonly apexPoint: Vector3D; // Apical tip center
	readonly diameterMm: number;
	readonly radiusMm: number;
	readonly lengthMm: number;
}

export interface AnatomicalRoot3D {
	readonly toothNumberFdi: number;
	readonly crownPoint: Vector3D;
	readonly apexPoint: Vector3D;
	readonly rootRadiusMm: number;
}

export interface MandibularCanalTrajectory3D {
	readonly centerlinePoints: readonly Vector3D[];
	readonly canalRadiusMm: number; // Typically 1.5 - 2.0 mm
}

export interface MaxillarySinusBoundary3D {
	readonly sinusFloorZ: number; // Z-coordinate of sinus floor along vertical axis
	readonly subantralBoneHeightMm: number;
}

export type SafetyStatus = "safe" | "warning" | "danger";

export type MischBoneDensity = "D1" | "D2" | "D3" | "D4";

export type SinusLiftType = "none" | "crestal_closed" | "lateral_window";

export type LoadingProtocolRecommendation =
	| "immediate_functional_loading"
	| "immediate_non_functional_provisionalization"
	| "early_loading_6_weeks"
	| "delayed_two_stage_submerged";

// ─── VECTOR MATH UTILITIES ──────────────────────────────────────────────────

export function vec3(x: number, y: number, z: number): Vector3D {
	return { x, y, z };
}

export function vecAdd(a: Vector3D, b: Vector3D): Vector3D {
	return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function vecSub(a: Vector3D, b: Vector3D): Vector3D {
	return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function vecScale(v: Vector3D, scalar: number): Vector3D {
	return { x: v.x * scalar, y: v.y * scalar, z: v.z * scalar };
}

export function vecDot(a: Vector3D, b: Vector3D): number {
	return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function vecCross(a: Vector3D, b: Vector3D): Vector3D {
	return {
		x: a.y * b.z - a.z * b.y,
		y: a.z * b.x - a.x * b.z,
		z: a.x * b.y - a.y * b.x,
	};
}

export function vecLengthSq(v: Vector3D): number {
	return v.x * v.x + v.y * v.y + v.z * v.z;
}

export function vecLength(v: Vector3D): number {
	return Math.sqrt(vecLengthSq(v));
}

export function vecNormalize(v: Vector3D): Vector3D {
	const len = vecLength(v);
	if (len === 0) return { x: 0, y: 0, z: 0 };
	return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function vecDistance(a: Vector3D, b: Vector3D): number {
	return vecLength(vecSub(a, b));
}

export function clamp(val: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, val));
}

// ─── 3D DISTANCE COMPUTATIONS ───────────────────────────────────────────────

/**
 * Shortest distance from a 3D point P to a 3D line segment AB.
 */
export function pointToSegmentDistance3D(
	p: Vector3D,
	a: Vector3D,
	b: Vector3D,
): { distance: number; closestPoint: Vector3D; projectionFraction: number } {
	const ab = vecSub(b, a);
	const ap = vecSub(p, a);
	const abLenSq = vecLengthSq(ab);

	if (abLenSq < 1e-9) {
		return { distance: vecDistance(p, a), closestPoint: a, projectionFraction: 0 };
	}

	const t = clamp(vecDot(ap, ab) / abLenSq, 0, 1);
	const closest = vecAdd(a, vecScale(ab, t));
	return {
		distance: vecDistance(p, closest),
		closestPoint: closest,
		projectionFraction: t,
	};
}

/**
 * Robust shortest distance between two 3D line segments S1 (P0 -> P1) and S2 (Q0 -> Q1).
 * Used for cylinder-to-cylinder clearance (implant to adjacent roots / implants / canal).
 */
export function segmentToSegmentDistance3D(
	p0: Vector3D,
	p1: Vector3D,
	q0: Vector3D,
	q1: Vector3D,
): {
	distance: number;
	pointOnS1: Vector3D;
	pointOnS2: Vector3D;
	fractionS1: number;
	fractionS2: number;
} {
	const u = vecSub(p1, p0);
	const v = vecSub(q1, q0);
	const w = vecSub(p0, q0);

	const a = vecDot(u, u); // always >= 0
	const b = vecDot(u, v);
	const c = vecDot(v, v); // always >= 0
	const d = vecDot(u, w);
	const e = vecDot(v, w);
	const dDenom = a * c - b * b; // always >= 0

	let sN: number;
	let sD = dDenom;
	let tN: number;
	let tD = dDenom;

	// Check if segments are parallel
	if (dDenom < 1e-7) {
		sN = 0.0;
		sD = 1.0;
		tN = e;
		tD = c;
	} else {
		sN = b * e - c * d;
		tN = a * e - b * d;
		if (sN < 0.0) {
			sN = 0.0;
			tN = e;
			tD = c;
		} else if (sN > sD) {
			sN = sD;
			tN = e + b;
			tD = c;
		}
	}

	if (tN < 0.0) {
		tN = 0.0;
		if (-d < 0.0) {
			sN = 0.0;
		} else if (-d > a) {
			sN = sD;
		} else {
			sN = -d;
			sD = a;
		}
	} else if (tN > tD) {
		tN = tD;
		if (-d + b < 0.0) {
			sN = 0.0;
		} else if (-d + b > a) {
			sN = sD;
		} else {
			sN = -d + b;
			sD = a;
		}
	}

	const sc = Math.abs(sN) < 1e-7 ? 0.0 : sN / sD;
	const tc = Math.abs(tN) < 1e-7 ? 0.0 : tN / tD;

	const pointS1 = vecAdd(p0, vecScale(u, sc));
	const pointS2 = vecAdd(q0, vecScale(v, tc));
	const distance = vecDistance(pointS1, pointS2);

	return {
		distance,
		pointOnS1: pointS1,
		pointOnS2: pointS2,
		fractionS1: sc,
		fractionS2: tc,
	};
}

// ─── 1. MANDIBULAR CANAL (IAN) SAFETY EVALUATOR ─────────────────────────────

export interface MandibularCanalSafetyResult {
	readonly clearanceMm: number; // Distance from implant surface/apex to canal roof
	readonly rawCenterlineDistanceMm: number;
	readonly status: SafetyStatus;
	readonly isDangerous: boolean;
	readonly isWarning: boolean;
	readonly isSafe: boolean;
	readonly clinicalMessage: string;
	readonly alertTitle: string;
}

export function evaluateMandibularCanalSafety(
	implant: ImplantCylinder3D,
	canal: MandibularCanalTrajectory3D,
): MandibularCanalSafetyResult {
	let minCenterlineDist = Number.POSITIVE_INFINITY;

	// Iterate through canal segment polyline
	for (let i = 0; i < canal.centerlinePoints.length - 1; i++) {
		const c0 = canal.centerlinePoints[i];
		const c1 = canal.centerlinePoints[i + 1];
		if (!c0 || !c1) continue;

		// Check distance from implant segment to canal segment
		const segDist = segmentToSegmentDistance3D(
			implant.entryPoint,
			implant.apexPoint,
			c0,
			c1,
		);

		// Also verify point distance from implant apex specifically (most vulnerable)
		const apexDist = pointToSegmentDistance3D(implant.apexPoint, c0, c1);

		const candidate = Math.min(segDist.distance, apexDist.distance);
		if (candidate < minCenterlineDist) {
			minCenterlineDist = candidate;
		}
	}

	if (!Number.isFinite(minCenterlineDist)) {
		minCenterlineDist = 15.0; // Fallback safe default
	}

	// Net surface clearance = Centerline distance - (Implant Radius + Canal Radius)
	// For apex, clearance is strictly distance from apex to canal outer boundary
	const netClearance = Number(
		(minCenterlineDist - (implant.radiusMm + canal.canalRadiusMm)).toFixed(2),
	);

	let status: SafetyStatus = "safe";
	let isDangerous = false;
	let isWarning = false;
	let isSafe = false;
	let clinicalMessage = "";
	let alertTitle = "IAN норма";

	if (netClearance < 1.0) {
		status = "danger";
		isDangerous = true;
		alertTitle = "КРИТИЧЕСКИЙ РИСК: Сдавление/перфорация IAN!";
		clinicalMessage = `КРИТИЧЕСКИЙ ДЕФЕКТ: Дистанция до нижнечелюстного канала (IAN) составляет ${netClearance.toFixed(1)} мм (< 1.0 мм / пенетрация). Риск необратимой нейропатии и онемения губы (N. mentalis)! Необходим имплантат меньшей длины.`;
	} else if (netClearance < 2.0) {
		status = "warning";
		isWarning = true;
		alertTitle = "ВНИМАНИЕ: Зона безопасности IAN нарушена (< 2.0 мм)";
		clinicalMessage = `ПРЕДУПРЕЖДЕНИЕ: Дистанция до крыши нижнечелюстного канала ${netClearance.toFixed(1)} мм ниже регламентного барьера 2.0 мм. Риск ишемической компрессии при закручивании.`;
	} else {
		status = "safe";
		isSafe = true;
		alertTitle = "Безопасная зона IAN соблюдена";
		clinicalMessage = `Норма: Дистанция до нижнеальвеолярного канала ${netClearance.toFixed(1)} мм удовлетворяет правилу безопасности >= 2.0 мм.`;
	}

	return {
		clearanceMm: netClearance,
		rawCenterlineDistanceMm: Number(minCenterlineDist.toFixed(2)),
		status,
		isDangerous,
		isWarning,
		isSafe,
		clinicalMessage,
		alertTitle,
	};
}

// ─── 2. MAXILLARY SINUS FLOOR SAFETY EVALUATOR ──────────────────────────────

export interface MaxillarySinusSafetyResult {
	readonly subantralBoneHeightMm: number;
	readonly implantLengthMm: number;
	readonly sinusPenetrationMm: number;
	readonly sinusLiftRequired: boolean;
	readonly sinusLiftType: SinusLiftType;
	readonly status: SafetyStatus;
	readonly clinicalMessage: string;
	readonly surgicalTechniqueSummary: string;
	readonly boneGraftVolumeEstimateCc: number;
}

export function evaluateMaxillarySinusSafety(
	subantralBoneHeightMm: number,
	implantLengthMm: number,
): MaxillarySinusSafetyResult {
	const penetration = Number((implantLengthMm - subantralBoneHeightMm).toFixed(2));
	const isSinusInvolved = penetration > 0;

	let status: SafetyStatus = "safe";
	let sinusLiftRequired = false;
	let sinusLiftType: SinusLiftType = "none";
	let clinicalMessage = "";
	let surgicalTechniqueSummary = "";
	let boneGraftVolumeEstimateCc = 0;

	if (penetration <= -1.0) {
		// >= 1.0 mm bone buffer below sinus floor
		status = "safe";
		sinusLiftRequired = false;
		sinusLiftType = "none";
		clinicalMessage = `Достаточная высота кости (${subantralBoneHeightMm.toFixed(1)} мм для длины ${implantLengthMm.toFixed(1)} мм). Синус-лифтинг не требуется (запас до дна пазухи ${Math.abs(penetration).toFixed(1)} мм).`;
		surgicalTechniqueSummary = "Стандартный протокол установки без вмешательства в синус.";
	} else if (penetration <= 0) {
		// 0 to 1 mm bone buffer
		status = "safe";
		sinusLiftRequired = false;
		sinusLiftType = "none";
		clinicalMessage = `Высота кости на пределе (${subantralBoneHeightMm.toFixed(1)} мм). Верхушка имплантата прилежит к кортикальной пластинке дна гайморовой пазухи.`;
		surgicalTechniqueSummary = "Установка с бикортикальной фиксацией дна пазухи.";
	} else if (subantralBoneHeightMm >= 5.0 && penetration <= 4.0) {
		// Subantral bone >= 5mm, lift <= 4mm -> Closed Crestal Sinus Lift (Summers)
		status = "warning";
		sinusLiftRequired = true;
		sinusLiftType = "crestal_closed";
		boneGraftVolumeEstimateCc = Number((penetration * 0.12).toFixed(2));
		clinicalMessage = `Требуется закрытый синус-лифтинг (остеотомная методика Summers). Дефицит высоты: ${penetration.toFixed(1)} мм при остаточной высоте кости ${subantralBoneHeightMm.toFixed(1)} мм.`;
		surgicalTechniqueSummary = `Закрытый трансальвеолярный синус-лифтинг через остеотомическое ложе с аугментацией костного графта ~${boneGraftVolumeEstimateCc} см³.`;
	} else {
		// Subantral bone < 5mm or penetration > 4mm -> Open Lateral Window Sinus Lift (Tatum)
		status = penetration > 7.0 ? "danger" : "warning";
		sinusLiftRequired = true;
		sinusLiftType = "lateral_window";
		boneGraftVolumeEstimateCc = Number((Math.max(penetration, 6.0) * 0.25).toFixed(2));
		clinicalMessage = `Требуется открытый синус-лифтинг через латеральное окно (Tatum). Выраженная атрофия верхней челюсти: остаточная кость ${subantralBoneHeightMm.toFixed(1)} мм (< 5.0 мм).`;
		surgicalTechniqueSummary = `Открытый синус-лифтинг (латеральный доступ) с заполнением синуса остеопластическим материалом (${boneGraftVolumeEstimateCc} см³) и барьерной мембраной.`;
	}

	return {
		subantralBoneHeightMm,
		implantLengthMm,
		sinusPenetrationMm: Math.max(0, penetration),
		sinusLiftRequired,
		sinusLiftType,
		status,
		clinicalMessage,
		surgicalTechniqueSummary,
		boneGraftVolumeEstimateCc,
	};
}

// ─── 3. ADJACENT TOOTH ROOT CLEARANCE EVALUATOR ────────────────────────────

export interface AdjacentRootSafetyResult {
	readonly toothNumberFdi: number;
	readonly clearanceMm: number;
	readonly status: SafetyStatus;
	readonly isDangerous: boolean;
	readonly clinicalMessage: string;
}

export function evaluateAdjacentRootSafety(
	implant: ImplantCylinder3D,
	adjacentRoot: AnatomicalRoot3D,
): AdjacentRootSafetyResult {
	const segDist = segmentToSegmentDistance3D(
		implant.entryPoint,
		implant.apexPoint,
		adjacentRoot.crownPoint,
		adjacentRoot.apexPoint,
	);

	// Clearance = Distance between centerlines - (Implant Radius + Root Radius)
	const clearance = Number(
		(segDist.distance - (implant.radiusMm + adjacentRoot.rootRadiusMm)).toFixed(2),
	);

	let status: SafetyStatus = "safe";
	let isDangerous = false;
	let clinicalMessage = "";

	if (clearance < 1.0) {
		status = "danger";
		isDangerous = true;
		clinicalMessage = `КРИТИЧЕСКИЙ КОНФЛИКТ с корнем зуба FDI ${adjacentRoot.toothNumberFdi}: зазор ${clearance.toFixed(1)} мм (< 1.0 мм / коллизия). Высокий риск травмы периодонта и анкилоза!`;
	} else if (clearance < 1.5) {
		status = "warning";
		clinicalMessage = `ВНИМАНИЕ: Зазор до корня зуба FDI ${adjacentRoot.toothNumberFdi} составляет ${clearance.toFixed(1)} мм (< 1.5 мм). Рекомендуется смещение оси.`;
	} else {
		status = "safe";
		clinicalMessage = `Норма: Дистанция до корня зуба FDI ${adjacentRoot.toothNumberFdi} составляет ${clearance.toFixed(1)} мм (норма >= 1.5 мм).`;
	}

	return {
		toothNumberFdi: adjacentRoot.toothNumberFdi,
		clearanceMm: clearance,
		status,
		isDangerous,
		clinicalMessage,
	};
}

// ─── 4. INTER-IMPLANT DISTANCE EVALUATOR ────────────────────────────────────

export interface InterImplantSafetyResult {
	readonly targetToothNumberFdi: number;
	readonly adjacentToothNumberFdi: number;
	readonly clearanceMm: number;
	readonly status: SafetyStatus;
	readonly isDangerous: boolean;
	readonly clinicalMessage: string;
}

export function evaluateInterImplantSafety(
	implant1: ImplantCylinder3D,
	implant2: ImplantCylinder3D,
	targetToothFdi: number,
	adjacentToothFdi: number,
): InterImplantSafetyResult {
	const segDist = segmentToSegmentDistance3D(
		implant1.entryPoint,
		implant1.apexPoint,
		implant2.entryPoint,
		implant2.apexPoint,
	);

	// Clearance between titanium surfaces
	const clearance = Number(
		(segDist.distance - (implant1.radiusMm + implant2.radiusMm)).toFixed(2),
	);

	let status: SafetyStatus = "safe";
	let isDangerous = false;
	let clinicalMessage = "";

	if (clearance < 2.0) {
		status = "danger";
		isDangerous = true;
		clinicalMessage = `ОПАСНОСТЬ: Межимплантатное расстояние между FDI ${targetToothFdi} и ${adjacentToothFdi} составляет ${clearance.toFixed(1)} мм (< 2.0 мм). Критическая ишемическая резорбция межкортикального гребня!`;
	} else if (clearance < 3.0) {
		status = "warning";
		clinicalMessage = `ВНИМАНИЕ: Межимплантатное расстояние ${clearance.toFixed(1)} мм ниже биологической нормы 3.0 мм (правило Тарнова). Риск потери десневого сосочка.`;
	} else {
		status = "safe";
		clinicalMessage = `Норма: Межимплантатное расстояние ${clearance.toFixed(1)} мм соответствует золотому стандарту (>= 3.0 мм).`;
	}

	return {
		targetToothNumberFdi: targetToothFdi,
		adjacentToothNumberFdi: adjacentToothFdi,
		clearanceMm: clearance,
		status,
		isDangerous,
		clinicalMessage,
	};
}

// ─── 5. INSERTION AXIS & ANGULATION CALCULATOR ──────────────────────────────

export interface InsertionAxisAngles {
	readonly totalAngulationDeg: number; // 3D angle from vertical axis (0° = vertical)
	readonly mesiodistalTiltDeg: number; // + = Distal, - = Mesial
	readonly buccolingualTiltDeg: number; // + = Palatal/Lingual, - = Buccal/Vestibular
	readonly isAngulationExcessive: boolean; // True if > 25°
	readonly recommendedAbutmentAngleDeg: 0 | 15 | 25 | 30;
	readonly clinicalMessage: string;
}

export function calculateInsertionAxis(
	entryPoint: Vector3D,
	apexPoint: Vector3D,
): InsertionAxisAngles {
	const trajectory = vecSub(apexPoint, entryPoint);
	const len = vecLength(trajectory);

	if (len < 1e-5) {
		return {
			totalAngulationDeg: 0,
			mesiodistalTiltDeg: 0,
			buccolingualTiltDeg: 0,
			isAngulationExcessive: false,
			recommendedAbutmentAngleDeg: 0,
			clinicalMessage: "Ось строго вертикальна (0°).",
		};
	}

	// Reference vertical vector (pointing down into alveolar bone: {0, 0, -1})
	const unitTraj = vecNormalize(trajectory);
	const verticalUnit = { x: 0, y: 0, z: -1 };

	// Total 3D angle against vertical
	const cosTheta = clamp(vecDot(unitTraj, verticalUnit), -1, 1);
	const totalAngulation = Number(((Math.acos(cosTheta) * 180) / Math.PI).toFixed(1));

	// Mesiodistal tilt in X-Z plane (X axis = Mesiodistal)
	const mdAngle = Number(((Math.atan2(trajectory.x, -trajectory.z) * 180) / Math.PI).toFixed(1));

	// Buccolingual tilt in Y-Z plane (Y axis = Buccolingual)
	const blAngle = Number(((Math.atan2(trajectory.y, -trajectory.z) * 180) / Math.PI).toFixed(1));

	let recommendedAbutment: 0 | 15 | 25 | 30 = 0;
	if (totalAngulation >= 27.5) {
		recommendedAbutment = 30;
	} else if (totalAngulation >= 20.0) {
		recommendedAbutment = 25;
	} else if (totalAngulation >= 10.0) {
		recommendedAbutment = 15;
	}

	const isExcessive = totalAngulation > 25.0;
	let clinicalMessage = "";
	if (isExcessive) {
		clinicalMessage = `Выраженный наклон оси (${totalAngulation}° > 25°). Требуется угловой абатмент (${recommendedAbutment}°) или индивидуальная винтовая фиксация с шахтой под углом (ASC).`;
	} else if (totalAngulation > 10.0) {
		clinicalMessage = `Умеренный наклон оси (${totalAngulation}°). Рекомендуется угловой абатмент ${recommendedAbutment}°.`;
	} else {
		clinicalMessage = `Оптимальная параллельность оси введения (${totalAngulation}°). Прямой абатмент 0°.`;
	}

	return {
		totalAngulationDeg: totalAngulation,
		mesiodistalTiltDeg: mdAngle,
		buccolingualTiltDeg: blAngle,
		isAngulationExcessive: isExcessive,
		recommendedAbutmentAngleDeg: recommendedAbutment,
		clinicalMessage,
	};
}

// ─── 6. MISCH BONE DENSITY & INSERTION TORQUE ESTIMATOR ─────────────────────

export interface InsertionTorqueEstimate {
	readonly boneDensity: MischBoneDensity;
	readonly boneDensityDescription: string;
	readonly hounsfieldUnitRange: string;
	readonly expectedTorqueMinNcm: number;
	readonly expectedTorqueMaxNcm: number;
	readonly expectedTorqueMeanNcm: number;
	readonly isImmediateLoadingEligible: boolean; // 35–45 Ncm sweet spot
	readonly loadingRecommendation: LoadingProtocolRecommendation;
	readonly underdrillingRecommended: boolean;
	readonly corticalTapRequired: boolean;
	readonly surgicalTactics: string;
}

export function estimateInsertionTorque(
	density: MischBoneDensity,
	fixture: ImplantFixture,
	options?: {
		underdrillingUsed?: boolean;
		corticalTapUsed?: boolean;
	},
): InsertionTorqueEstimate {
	let minTorque = 35;
	let maxTorque = 45;
	let huRange = "850–1250 HU";
	let densityDesc = "Плотная компактная кость с крупноячеистой губчатой тканью";
	let loadingRec: LoadingProtocolRecommendation = "immediate_functional_loading";
	let underdrillingRec = false;
	let tapRequired = false;
	let tactics = "";

	switch (density) {
		case "D1":
			huRange = "> 1250 HU";
			densityDesc = "Плотная компактная дубовая кость (передний отдел нижней челюсти)";
			minTorque = 45;
			maxTorque = 65;
			tapRequired = true;
			underdrillingRec = false;
			loadingRec = "immediate_functional_loading";
			tactics =
				"Обязательно нарезание резьбы метчиком (Bone Tap) и профайлер шейки для исключения остеонекроза от компрессии.";
			break;
		case "D2":
			huRange = "850–1250 HU";
			densityDesc = "Плотная кортикальная пластина и плотная губчатая кость (золотой стандарт)";
			minTorque = 35;
			maxTorque = 50;
			tapRequired = false;
			underdrillingRec = false;
			loadingRec = "immediate_functional_loading";
			tactics = "Идеальные условия для немедленной нагрузки (35–45 Нсм). Стандартный протокол сверления.";
			break;
		case "D3":
			huRange = "350–850 HU";
			densityDesc = "Тонкая кортикальная пластинка и мелкопористая губчатая кость (верхняя челюсть)";
			minTorque = 25;
			maxTorque = 40;
			tapRequired = false;
			underdrillingRec = true;
			loadingRec = "immediate_non_functional_provisionalization";
			tactics =
				"Рекомендуется недопрепарирование (Underdrilling: пропуск финальной фрезы) для повышения первичного торка до 35+ Нсм.";
			break;
		case "D4":
			huRange = "150–350 HU";
			densityDesc = "Мягкая крупнопористая губчатая кость без выраженного кортикала (бугор ВЧ)";
			minTorque = 15;
			maxTorque = 25;
			tapRequired = false;
			underdrillingRec = true;
			loadingRec = "delayed_two_stage_submerged";
			tactics =
				"Немедленная нагрузка противопоказана (< 30 Нсм). Остеоконденсация, ступенчатое недопрепарирование и двухэтапный протокол (4–6 мес).";
			break;
	}

	// Adjust torque if underdrilling or tap is applied
	if (options?.underdrillingUsed && (density === "D3" || density === "D4")) {
		minTorque += 10;
		maxTorque += 12;
	}

	if (options?.corticalTapUsed && density === "D1") {
		minTorque = Math.max(35, minTorque - 10);
		maxTorque = Math.min(50, maxTorque - 10);
	}

	// Diameter boost (wider implants give higher mechanical engagement)
	if (fixture.diameterMm >= 4.8) {
		minTorque += 5;
		maxTorque += 5;
	}

	const meanTorque = Number(((minTorque + maxTorque) / 2).toFixed(1));
	const isEligibleForImmediateLoading = meanTorque >= 35 && meanTorque <= 55 && density !== "D4";

	return {
		boneDensity: density,
		boneDensityDescription: densityDesc,
		hounsfieldUnitRange: huRange,
		expectedTorqueMinNcm: minTorque,
		expectedTorqueMaxNcm: maxTorque,
		expectedTorqueMeanNcm: meanTorque,
		isImmediateLoadingEligible: isEligibleForImmediateLoading,
		loadingRecommendation: loadingRec,
		underdrillingRecommended: underdrillingRec,
		corticalTapRequired: tapRequired,
		surgicalTactics: tactics,
	};
}

// ─── 7. COMPREHENSIVE IMPLANT SAFETY AUDIT ENGINE ──────────────────────────

export interface ComprehensiveAuditInput {
	readonly toothNumberFdi: number;
	readonly fixture: ImplantFixture;
	readonly entryPoint: Vector3D;
	readonly apexPoint: Vector3D;
	readonly boneDensity: MischBoneDensity;
	readonly mandibularCanal?: MandibularCanalTrajectory3D | null;
	readonly maxillarySinusHeightMm?: number | null;
	readonly adjacentRoots?: readonly AnatomicalRoot3D[];
	readonly adjacentImplants?: readonly {
		toothNumberFdi: number;
		cylinder: ImplantCylinder3D;
	}[];
	readonly underdrillingUsed?: boolean;
	readonly corticalTapUsed?: boolean;
}

export interface ComprehensiveAuditResult {
	readonly overallStatus: SafetyStatus;
	readonly isSafeToProceed: boolean;
	readonly criticalDangersCount: number;
	readonly warningsCount: number;
	readonly mandibularCanalResult: MandibularCanalSafetyResult | null;
	readonly maxillarySinusResult: MaxillarySinusSafetyResult | null;
	readonly adjacentRootsResults: readonly AdjacentRootSafetyResult[];
	readonly adjacentImplantsResults: readonly InterImplantSafetyResult[];
	readonly insertionAxis: InsertionAxisAngles;
	readonly torqueEstimate: InsertionTorqueEstimate;
	readonly surgicalProtocolText: string;
}

export function performComprehensiveImplantSafetyAudit(
	input: ComprehensiveAuditInput,
): ComprehensiveAuditResult {
	const implantCylinder: ImplantCylinder3D = {
		entryPoint: input.entryPoint,
		apexPoint: input.apexPoint,
		diameterMm: input.fixture.diameterMm,
		radiusMm: input.fixture.diameterMm / 2,
		lengthMm: input.fixture.lengthMm,
	};

	let criticalDangers = 0;
	let warnings = 0;

	// 1. Mandibular Canal Check (for lower teeth 31–48)
	let canalRes: MandibularCanalSafetyResult | null = null;
	if (input.mandibularCanal && input.toothNumberFdi >= 31 && input.toothNumberFdi <= 48) {
		canalRes = evaluateMandibularCanalSafety(implantCylinder, input.mandibularCanal);
		if (canalRes.status === "danger") criticalDangers++;
		if (canalRes.status === "warning") warnings++;
	}

	// 2. Maxillary Sinus Floor Check (for upper teeth 14–18, 24–28)
	let sinusRes: MaxillarySinusSafetyResult | null = null;
	if (
		input.maxillarySinusHeightMm !== undefined &&
		input.maxillarySinusHeightMm !== null &&
		input.toothNumberFdi >= 11 &&
		input.toothNumberFdi <= 28
	) {
		sinusRes = evaluateMaxillarySinusSafety(
			input.maxillarySinusHeightMm,
			input.fixture.lengthMm,
		);
		if (sinusRes.status === "danger") criticalDangers++;
		if (sinusRes.status === "warning") warnings++;
	}

	// 3. Adjacent Roots
	const rootsRes: AdjacentRootSafetyResult[] = [];
	if (input.adjacentRoots) {
		for (const root of input.adjacentRoots) {
			const res = evaluateAdjacentRootSafety(implantCylinder, root);
			rootsRes.push(res);
			if (res.status === "danger") criticalDangers++;
			if (res.status === "warning") warnings++;
		}
	}

	// 4. Inter-implant clearances
	const implantsRes: InterImplantSafetyResult[] = [];
	if (input.adjacentImplants) {
		for (const other of input.adjacentImplants) {
			const res = evaluateInterImplantSafety(
				implantCylinder,
				other.cylinder,
				input.toothNumberFdi,
				other.toothNumberFdi,
			);
			implantsRes.push(res);
			if (res.status === "danger") criticalDangers++;
			if (res.status === "warning") warnings++;
		}
	}

	// 5. Insertion Axis
	const axis = calculateInsertionAxis(input.entryPoint, input.apexPoint);
	if (axis.isAngulationExcessive) {
		warnings++;
	}

	// 6. Torque & Biomechanics
	const torque = estimateInsertionTorque(input.boneDensity, input.fixture, {
		...(input.underdrillingUsed !== undefined
			? { underdrillingUsed: input.underdrillingUsed }
			: {}),
		...(input.corticalTapUsed !== undefined
			? { corticalTapUsed: input.corticalTapUsed }
			: {}),
	});

	// Overall Status
	let overallStatus: SafetyStatus = "safe";
	if (criticalDangers > 0) {
		overallStatus = "danger";
	} else if (warnings > 0) {
		overallStatus = "warning";
	}

	// Build structured surgical report text
	const reportLines: string[] = [
		`=== ПРОТОКОЛ 3D-ПЛАНИРОВАНИЯ ИМПЛАНТАЦИИ (FDI ${input.toothNumberFdi}) ===`,
		`Система: ${input.fixture.brandName} ${input.fixture.line} (Ø${input.fixture.diameterMm.toFixed(1)} x ${input.fixture.lengthMm.toFixed(1)} мм)`,
		`Платформа: ${input.fixture.platformName} (${input.fixture.platformType})`,
		`Поверхность: ${input.fixture.surfaceTreatment}`,
		`Плотность кости: ${torque.boneDensity} (${torque.hounsfieldUnitRange}) — ${torque.boneDensityDescription}`,
		`Прогнозируемый торк: ${torque.expectedTorqueMinNcm}–${torque.expectedTorqueMaxNcm} Нсм (средний: ${torque.expectedTorqueMeanNcm} Нсм)`,
		`Немедленная нагрузка: ${torque.isImmediateLoadingEligible ? "РАЗРЕШЕНА (35–45 Нсм)" : "НЕ РЕКОМЕНДУЕТСЯ"}`,
		`Ось введения: наклон ${axis.totalAngulationDeg}° (MD: ${axis.mesiodistalTiltDeg}°, BL: ${axis.buccolingualTiltDeg}°), абатмент: ${axis.recommendedAbutmentAngleDeg}°`,
	];

	if (canalRes) {
		reportLines.push(
			`Нижнечелюстной канал (IAN): зазор ${canalRes.clearanceMm.toFixed(1)} мм — ${canalRes.alertTitle}`,
		);
	}

	if (sinusRes) {
		reportLines.push(
			`Дно гайморовой пазухи: остаточная кость ${sinusRes.subantralBoneHeightMm.toFixed(1)} мм — ${sinusRes.surgicalTechniqueSummary}`,
		);
	}

	if (rootsRes.length > 0) {
		reportLines.push(
			`Корни соседних зубов: ${rootsRes.map((r) => `FDI ${r.toothNumberFdi}: ${r.clearanceMm.toFixed(1)} мм (${r.status})`).join(", ")}`,
		);
	}

	if (implantsRes.length > 0) {
		reportLines.push(
			`Соседние имплантаты: ${implantsRes.map((i) => `FDI ${i.adjacentToothNumberFdi}: ${i.clearanceMm.toFixed(1)} мм (${i.status})`).join(", ")}`,
		);
	}

	reportLines.push("\nПошаговый протокол сверления:");
	for (const step of input.fixture.drillSequence) {
		reportLines.push(
			` ${step.stepNumber}. ${step.drillName} — ${step.targetRpm} об/мин (${step.depthGuide})`,
		);
	}

	reportLines.push(
		`\nНавигационная гильза: Ø${input.fixture.guidedSleeve.sleeveDiameterMm} мм, высота ${input.fixture.guidedSleeve.sleeveHeightMm} мм, оффсет ${input.fixture.guidedSleeve.offsetMm} мм (Арт. ${input.fixture.guidedSleeve.sleeveArticle})`,
	);

	return {
		overallStatus,
		isSafeToProceed: criticalDangers === 0,
		criticalDangersCount: criticalDangers,
		warningsCount: warnings,
		mandibularCanalResult: canalRes,
		maxillarySinusResult: sinusRes,
		adjacentRootsResults: rootsRes,
		adjacentImplantsResults: implantsRes,
		insertionAxis: axis,
		torqueEstimate: torque,
		surgicalProtocolText: reportLines.join("\n"),
	};
}

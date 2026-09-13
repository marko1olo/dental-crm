/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 3D IMPLANT SAFETY CLEARANCE ENGINE (DenCT Reverse-Engineered / Pure Math)
 * Surface-to-surface clearance calculation against vital anatomical landmarks
 * (Inferior Alveolar Nerve, Maxillary Sinus, Neighboring Implants, Adjacent Teeth)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
	type Vec3,
	dot3,
	sub3,
	norm3,
	distPointToSegment3,
	distSegmentToSegment3,
	distSegmentToPolyline3,
} from "./implantGeometryEngine.js";

export type { Vec3 };
export {
	dot3,
	sub3,
	norm3,
	distPointToSegment3,
	distSegmentToSegment3,
	distSegmentToPolyline3,
};

/** Clearance assessment status. */
export type SafetyClearanceStatus = "safe" | "warning" | "collision";

export type LandmarkCategory = "nerve" | "sinus" | "implant" | "tooth";

/** Evaluated clearance against a specific anatomical landmark. */
export interface LandmarkSafetyClearance {
	readonly landmarkType: LandmarkCategory;
	readonly landmarkNameRu: string;
	readonly centerlineDistanceMm: number;
	readonly surfaceClearanceMm: number;
	readonly thresholdMm: number;
	readonly status: SafetyClearanceStatus;
	readonly clinicalRecommendationRu: string;
}

/** Comprehensive safety clearance assessment result. */
export interface ImplantSafetyAssessment {
	readonly status: SafetyClearanceStatus;
	readonly minClearanceMm: number;
	readonly isWarning: boolean;
	readonly isCollision: boolean;
	readonly landmarks: readonly LandmarkSafetyClearance[];
	readonly summaryRu: string;
	readonly clinicalRecommendationRu: string;
}

/**
 * Evaluates clearance to the Inferior Alveolar Nerve (IAN).
 * Mandatory safety threshold >= 2.0 mm.
 * If surface clearance <= 0 mm -> 'collision' (irreversible paresthesia risk).
 * If surface clearance < 2.0 mm -> 'warning' (compression neuropathy risk).
 */
export function evaluateNerveClearance(
	entry: Vec3,
	apex: Vec3,
	implantDiameterMm: number,
	nervePoints: readonly Vec3[],
	nerveRadiusMm = 1.5,
): LandmarkSafetyClearance {
	const implantRadius = implantDiameterMm / 2;
	const centerline = distSegmentToPolyline3(entry, apex, nervePoints);
	const surfaceClearanceMm = centerline - implantRadius - nerveRadiusMm;
	const thresholdMm = 2.0;

	let status: SafetyClearanceStatus = "safe";
	let clinicalRecommendationRu = "Безопасный коридор до нижнечелюстного нерва (зазор >= 2.0 мм соблюден). Зона безопасности IAN интактна.";

	if (surfaceClearanceMm <= 0) {
		status = "collision";
		clinicalRecommendationRu = "Критическое повреждение нижнечелюстного канала (IAN)! Высокий риск необратимой парестезии и неврита тройничного нерва. Требуется укорочение имплантата или изменение оси/позиции.";
	} else if (surfaceClearanceMm < thresholdMm) {
		status = "warning";
		clinicalRecommendationRu = `Внимание: зазор до нижнечелюстного нерва ${surfaceClearanceMm.toFixed(1)} мм (менее порога 2.0 мм). Риск ишемической нейропатии при компрессии. Рекомендуется уменьшить длину имплантата минимум на ${(thresholdMm - surfaceClearanceMm).toFixed(1)} мм.`;
	}

	return {
		landmarkType: "nerve",
		landmarkNameRu: "Нижнечелюстной канал (IAN)",
		centerlineDistanceMm: Number(centerline.toFixed(2)),
		surfaceClearanceMm: Number(surfaceClearanceMm.toFixed(2)),
		thresholdMm,
		status,
		clinicalRecommendationRu,
	};
}

/**
 * Evaluates clearance to the Maxillary Sinus Floor.
 * Safety threshold >= 1.0 mm.
 * If clearance <= 0 mm -> 'collision' (sinus floor perforation, open sinus lift indicated).
 * If clearance < 1.0 mm -> 'warning' (closed sinus lift indicated).
 */
export function evaluateSinusClearance(
	entry: Vec3,
	apex: Vec3,
	implantDiameterMm: number,
	sinusFloorPoints: readonly Vec3[],
): LandmarkSafetyClearance {
	const implantRadius = implantDiameterMm / 2;
	const centerline = distSegmentToPolyline3(entry, apex, sinusFloorPoints);
	const surfaceClearanceMm = centerline - implantRadius;
	const thresholdMm = 1.0;

	let status: SafetyClearanceStatus = "safe";
	let clinicalRecommendationRu = "Безопасное расстояние до дна верхнечелюстной пазухи (зазор >= 1.0 мм). Субантральный костный объем достаточен для первичной стабильности.";

	if (surfaceClearanceMm <= 0) {
		status = "collision";
		clinicalRecommendationRu = "Перфорация дна гайморовой пазухи. Показан открытый синус-лифтинг (латеральное окно) с субантральной костной аугментацией.";
	} else if (surfaceClearanceMm < thresholdMm) {
		status = "warning";
		clinicalRecommendationRu = `Близкое прилегание к дну гайморовой пазухи (${surfaceClearanceMm.toFixed(1)} мм < 1.0 мм). Рекомендуется закрытый синус-лифтинг (остеотомная методика Саммерса) с внесением остеопластического материала.`;
	}

	return {
		landmarkType: "sinus",
		landmarkNameRu: "Дно верхнечелюстной пазухи",
		centerlineDistanceMm: Number(centerline.toFixed(2)),
		surfaceClearanceMm: Number(surfaceClearanceMm.toFixed(2)),
		thresholdMm,
		status,
		clinicalRecommendationRu,
	};
}

/**
 * Evaluates clearance between two adjacent implants.
 * Statutory safety threshold >= 3.0 mm.
 */
export function evaluateNeighborImplantClearance(
	entryA: Vec3,
	apexA: Vec3,
	diameterA: number,
	entryB: Vec3,
	apexB: Vec3,
	diameterB: number,
): LandmarkSafetyClearance {
	const radiusA = diameterA / 2;
	const radiusB = diameterB / 2;
	const centerline = distSegmentToSegment3(entryA, apexA, entryB, apexB);
	const surfaceClearanceMm = centerline - radiusA - radiusB;
	const thresholdMm = 3.0;

	let status: SafetyClearanceStatus = "safe";
	let clinicalRecommendationRu = "Оптимальное межимплантатное расстояние (>= 3.0 мм). Условия для сохранения межзубного костного гребня соблюдены.";

	if (surfaceClearanceMm <= 0) {
		status = "collision";
		clinicalRecommendationRu = "Конфликт позиций с соседним имплантатом (пересечение тел). Установка невозможна.";
	} else if (surfaceClearanceMm < thresholdMm) {
		status = "warning";
		clinicalRecommendationRu = `Межимплантатное расстояние ${surfaceClearanceMm.toFixed(1)} мм (менее 3.0 мм). Риск резорбции межимплантатного костного пика и десневого сосочка. Увеличьте межимплантатный интервал.`;
	}

	return {
		landmarkType: "implant",
		landmarkNameRu: "Соседний имплантат",
		centerlineDistanceMm: Number(centerline.toFixed(2)),
		surfaceClearanceMm: Number(surfaceClearanceMm.toFixed(2)),
		thresholdMm,
		status,
		clinicalRecommendationRu,
	};
}

/**
 * Evaluates clearance to an adjacent tooth root.
 * Safety threshold >= 1.5 mm.
 */
export function evaluateToothRootClearance(
	entry: Vec3,
	apex: Vec3,
	implantDiameterMm: number,
	rootCervical: Vec3,
	rootApex: Vec3,
	rootRadiusMm = 1.5,
): LandmarkSafetyClearance {
	const implantRadius = implantDiameterMm / 2;
	const centerline = distSegmentToSegment3(entry, apex, rootCervical, rootApex);
	const surfaceClearanceMm = centerline - implantRadius - rootRadiusMm;
	const thresholdMm = 1.5;

	let status: SafetyClearanceStatus = "safe";
	let clinicalRecommendationRu = "Корректный зазор безопасности до периодонта соседнего зуба (>= 1.5 мм).";

	if (surfaceClearanceMm <= 0) {
		status = "collision";
		clinicalRecommendationRu = "Травма корня соседнего зуба! Пересечение с периодонтальной связкой и цементом корня. Высокий риск гибели пульпы и зуба.";
	} else if (surfaceClearanceMm < thresholdMm) {
		status = "warning";
		clinicalRecommendationRu = `Расстояние до корня соседнего зуба ${surfaceClearanceMm.toFixed(1)} мм (менее 1.5 мм). Риск повреждения периодонта и резорбции корня. Скорректируйте мезио-дистальный наклон.`;
	}

	return {
		landmarkType: "tooth",
		landmarkNameRu: "Корень соседнего зуба",
		centerlineDistanceMm: Number(centerline.toFixed(2)),
		surfaceClearanceMm: Number(surfaceClearanceMm.toFixed(2)),
		thresholdMm,
		status,
		clinicalRecommendationRu,
	};
}

/**
 * Aggregates all landmark clearances into a unified ImplantSafetyAssessment.
 */
export function aggregateImplantSafetyAssessment(
	landmarks: readonly LandmarkSafetyClearance[],
): ImplantSafetyAssessment {
	if (landmarks.length === 0) {
		return {
			status: "safe",
			minClearanceMm: Number.POSITIVE_INFINITY,
			isWarning: false,
			isCollision: false,
			landmarks: [],
			summaryRu: "Анатомические маркеры не заданы. Коллизий не обнаружено.",
			clinicalRecommendationRu: "Анатомические ориентиры интактны.",
		};
	}

	let minClearanceMm = Number.POSITIVE_INFINITY;
	let hasCollision = false;
	let hasWarning = false;
	let worstLandmark: LandmarkSafetyClearance = landmarks[0]!;

	for (const lm of landmarks) {
		if (lm.surfaceClearanceMm < minClearanceMm) {
			minClearanceMm = lm.surfaceClearanceMm;
			worstLandmark = lm;
		}
		if (lm.status === "collision") {
			hasCollision = true;
		} else if (lm.status === "warning") {
			hasWarning = true;
		}
	}

	const status: SafetyClearanceStatus = hasCollision ? "collision" : hasWarning ? "warning" : "safe";

	const summaryRu = hasCollision
		? `КОЛЛИЗИЯ: пересечение с анатомическим ориентиром «${worstLandmark.landmarkNameRu}» (${worstLandmark.surfaceClearanceMm.toFixed(1)} мм).`
		: hasWarning
			? `ПРЕДУПРЕЖДЕНИЕ: недостаточный зазор до «${worstLandmark.landmarkNameRu}» (${worstLandmark.surfaceClearanceMm.toFixed(1)} мм < порога ${worstLandmark.thresholdMm.toFixed(1)} мм).`
			: `НОРМА: все анатомические зазоры соблюдены (минимальный клиренс: ${minClearanceMm.toFixed(1)} мм).`;

	return {
		status,
		minClearanceMm: Number(minClearanceMm.toFixed(2)),
		isWarning: hasWarning,
		isCollision: hasCollision,
		landmarks,
		summaryRu,
		clinicalRecommendationRu: worstLandmark.clinicalRecommendationRu,
	};
}

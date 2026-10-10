/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT 3D IMPLANT GEOMETRY — COLLISION DETECTOR (LAYER 3)
 * ═══════════════════════════════════════════════════════════════════════════
 * Evaluates 3D safety zones, collision detection, and cortical breach:
 * - Mandibular canal (IAN >= 2.0 mm)
 * - Adjacent tooth roots (>= 1.5 mm)
 * - Cortical bone plate clearance (>= 1.0 mm)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { Vec3, Implant3DPlacement, ImplantSafetyOptions, SafetyZoneCheckResult } from "./types.js";
import { normalize3 } from "./mathVectors.js";
import { pointToCylinderDistance, segmentToCylinderDistance } from "./safetyEnvelope.js";

export function checkImplantSafetyDistances(
	placement: Implant3DPlacement,
	canalSplinePoints: Vec3[],
	adjacentToothCenters: Vec3[],
	options?: ImplantSafetyOptions,
): SafetyZoneCheckResult {
	const length = placement.dimensions?.lengthMm ?? placement.lengthMm ?? 10.0;
	const diameter = placement.dimensions?.diameterMm ?? placement.diameterMm ?? 4.0;
	const implantRadius = diameter / 2;
	const entry = placement.position;
	const dir = normalize3(placement.direction);

	// 1. Mandibular Canal (IAN)
	let minCanalDistanceMm: number;
	if (canalSplinePoints.length === 0) {
		minCanalDistanceMm = 99.0;
	} else {
		const canalRadius = options?.canalRadiusMm ?? placement.canalRadiusMm ?? 0.0;
		let minRawDist = Number.POSITIVE_INFINITY;
		if (canalSplinePoints.length === 1) {
			minRawDist = pointToCylinderDistance(canalSplinePoints[0]!, entry, dir, length, implantRadius);
		} else {
			for (let i = 0; i < canalSplinePoints.length - 1; i++) {
				const d = segmentToCylinderDistance(
					canalSplinePoints[i]!,
					canalSplinePoints[i + 1]!,
					entry,
					dir,
					length,
					implantRadius,
				);
				if (d < minRawDist) minRawDist = d;
			}
		}
		minCanalDistanceMm = Math.max(0, minRawDist - canalRadius);
		minCanalDistanceMm = Number(minCanalDistanceMm.toFixed(2));
	}

	// 2. Adjacent teeth
	let minAdjacentDistanceMm: number;
	if (adjacentToothCenters.length === 0) {
		minAdjacentDistanceMm = 99.0;
	} else {
		const toothRadius = options?.toothRadiusMm ?? placement.adjacentToothRadiusMm ?? 0.0;
		let minD = Number.POSITIVE_INFINITY;
		for (const center of adjacentToothCenters) {
			const d = pointToCylinderDistance(center, entry, dir, length, implantRadius) - toothRadius;
			if (d < minD) minD = d;
		}
		minAdjacentDistanceMm = Math.max(0, minD);
		minAdjacentDistanceMm = Number(minAdjacentDistanceMm.toFixed(2));
	}

	// 3. Cortical bone plate
	let corticalClearanceMm = options?.corticalClearanceMm ?? placement.corticalClearanceMm ?? 1.8;
	corticalClearanceMm = Number(corticalClearanceMm.toFixed(2));

	const canalThreshold = options?.minCanalThresholdMm ?? 2.0;
	const adjThreshold = options?.minAdjacentThresholdMm ?? 1.5;
	const corticalThreshold = options?.minCorticalThresholdMm ?? 1.0;
	const violations: string[] = [];

	if (minCanalDistanceMm < canalThreshold) {
		violations.push(
			minCanalDistanceMm <= 0
				? `Критическая коллизия: прямое пересечение тела имплантата с нижнечелюстным каналом (зазор ${minCanalDistanceMm.toFixed(2)} мм). Риск необратимой нейропатии n. alveolaris inferior.`
				: `Нарушение зоны безопасности нижнечелюстного канала: расстояние ${minCanalDistanceMm.toFixed(2)} мм меньше порога ${canalThreshold.toFixed(2)} мм (риск компрессионной ишемии нерва).`,
		);
	}

	if (minAdjacentDistanceMm < adjThreshold) {
		violations.push(
			minAdjacentDistanceMm <= 0
				? `Критическая коллизия: контакт с корнем соседнего зуба (зазор ${minAdjacentDistanceMm.toFixed(2)} мм). Риск повреждения периодонтальной связки и цемента корня.`
				: `Нарушение зоны безопасности соседнего зуба: зазор ${minAdjacentDistanceMm.toFixed(2)} мм меньше порога ${adjThreshold.toFixed(2)} мм (риск резорбции межзубного костного гребня).`,
		);
	}

	if (corticalClearanceMm < corticalThreshold) {
		violations.push(
			corticalClearanceMm <= 0
				? `Критическая перфорация кортикальной пластинки альвеолярного гребня (зазор ${corticalClearanceMm.toFixed(2)} мм). Показана направленная костная регенерация (НКР).`
				: `Недостаточный кортикальный зазор: толщина ${corticalClearanceMm.toFixed(2)} мм меньше минимального порога ${corticalThreshold.toFixed(2)} мм (риск дегисценции кости).`,
		);
	}

	return { isSafe: violations.length === 0, minCanalDistanceMm, minAdjacentDistanceMm, corticalClearanceMm, violations };
}

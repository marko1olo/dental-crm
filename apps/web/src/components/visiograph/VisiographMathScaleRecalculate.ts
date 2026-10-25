/**
 * VisiographMathScaleRecalculate.ts
 * Recalculates ruler lengths, canal WL labels, and periapical lesion areas on scale changes.
 */

import type { RulerMeasurement } from "./VisiographMathGeometry";
import { type PeriapicalLesion, calculatePeriapicalLesion } from "./VisiographMathLesions";

export function recalculateRulersWithScale(
	rulers: readonly RulerMeasurement[],
	scaleMmPerPixel: number,
): RulerMeasurement[] {
	return rulers.map((r) => {
		const lengthMm = r.lengthPx * scaleMmPerPixel;
		let label = r.label;
		if (label && (label.startsWith("Канал:") || label.includes("(WL/Апекс)"))) {
			label = `Канал: ${lengthMm.toFixed(1)} мм (WL/Апекс)`;
		}
		return { ...r, lengthMm, label };
	});
}

export function recalculateLesionsWithScale(
	lesions: readonly PeriapicalLesion[],
	scaleMmPerPixel: number,
): PeriapicalLesion[] {
	return lesions.map((les) =>
		calculatePeriapicalLesion(les.points, scaleMmPerPixel, les.fdiToothCode, les.id),
	);
}

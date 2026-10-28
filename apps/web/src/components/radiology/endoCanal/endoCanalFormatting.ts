/**
 * DENTE CRM — Endodontic Root Canal Text Formatting
 * Standards: Form 043/u, Mandate 8e, Mandate 8b (<= 120 lines).
 */

import type { EndoCanalMeasurement } from "./endoSchneiderMath";

/** Calm non-blocking text for endo-caliper HUD badge: «Канал: 21.2 мм, изгиб 18°» */
export function formatEndoCanalHudText(lengthMm: number, angleDeg: number): string {
	const safeLength = Number.isFinite(lengthMm) ? lengthMm : 0;
	const safeAngle = Number.isFinite(angleDeg) ? angleDeg : 0;
	const isNearInteger = Math.abs(safeAngle - Math.round(safeAngle)) < 0.05;
	const angleFormatted = isNearInteger ? `${Math.round(safeAngle)}°` : `${safeAngle.toFixed(1)}°`;
	return `Канал: ${safeLength.toFixed(1)} мм, изгиб ${angleFormatted}`;
}

/** Formats on-screen badge text including curvature grade. */
export function formatEndoCanalBadgeText(
	lengthMm: number,
	angleDeg: number,
	gradeRu?: string,
): string {
	const hud = formatEndoCanalHudText(lengthMm, angleDeg);
	return gradeRu ? `${hud} (${gradeRu})` : hud;
}

/** Formats Form 043/u clinical entry without bureaucratic clutter. */
export function formatEndoCanalProtocolEntry(canal: EndoCanalMeasurement): string {
	const prefix = canal.fdiTooth
		? canal.canalName
			? `Зуб ${canal.fdiTooth}, канал ${canal.canalName}: `
			: `Зуб ${canal.fdiTooth}: `
		: canal.canalName
			? `Канал ${canal.canalName}: `
			: "Корневой канал: ";

	const isNearInteger = Math.abs(canal.schneiderAngleDeg - Math.round(canal.schneiderAngleDeg)) < 0.05;
	const angleFormatted = isNearInteger
		? `${Math.round(canal.schneiderAngleDeg)}°`
		: `${canal.schneiderAngleDeg.toFixed(1)}°`;

	return `${prefix}рабочая длина ${canal.lengthMm.toFixed(1)} мм, угол кривизны по Шнайдеру ${angleFormatted} (${canal.curvatureGradeRu}). ${canal.clinicalAdviceRu}`;
}

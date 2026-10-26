/**
 * proximityAuditor.ts — Аудит зазоров до критических анатомических ориентиров (Мандат 8b <= 120 строк).
 */

import {
	ANATOMICAL_SAFETY_BUFFER_MM,
	ANATOMICAL_DANGER_THRESHOLD_MM,
	type AnatomicalProximityAudit,
} from "./types";

export function evaluateAnatomicalSafety(params: {
	readonly distanceToCanalMm?: number | null | undefined;
	readonly distanceToForamenMm?: number | null | undefined;
	readonly distanceToSinusFloorMm?: number | null | undefined;
}): AnatomicalProximityAudit {
	const canal = params.distanceToCanalMm ?? null;
	const foramen = params.distanceToForamenMm ?? null;
	const sinus = params.distanceToSinusFloorMm ?? null;

	const validDistances: { type: "mandibular_canal" | "mental_foramen" | "maxillary_sinus"; dist: number }[] = [];
	if (typeof canal === "number" && Number.isFinite(canal)) {
		validDistances.push({ type: "mandibular_canal", dist: canal });
	}
	if (typeof foramen === "number" && Number.isFinite(foramen)) {
		validDistances.push({ type: "mental_foramen", dist: foramen });
	}
	if (typeof sinus === "number" && Number.isFinite(sinus)) {
		validDistances.push({ type: "maxillary_sinus", dist: sinus });
	}

	if (validDistances.length === 0) {
		return {
			distanceToMandibularCanalMm: null,
			distanceToMentalForamenMm: null,
			distanceToSinusFloorMm: null,
			nearestStructure: "none",
			minClearanceMm: null,
			isWarning: false,
			isCritical: false,
			warningMessageRu: null,
			canProceed: true,
		};
	}

	validDistances.sort((a, b) => a.dist - b.dist);
	const nearest = validDistances[0]!;
	const minClearance = Math.round(nearest.dist * 10) / 10;
	const isCritical = minClearance < ANATOMICAL_DANGER_THRESHOLD_MM;
	const isWarning = minClearance < ANATOMICAL_SAFETY_BUFFER_MM;

	let message: string | null = null;
	if (isCritical) {
		if (nearest.type === "mandibular_canal") {
			message = `⚠️ КРИТИЧЕСКИЙ РИСК: зазор до нижнечелюстного канала ${minClearance.toFixed(1)} мм (<1.5 мм). Высокий риск нейропатии N. alveolaris inferior!`;
		} else if (nearest.type === "mental_foramen") {
			message = `⚠️ КРИТИЧЕСКИЙ РИСК: зазор до ментального отверстия ${minClearance.toFixed(1)} мм (<1.5 мм). Риск парестезии нижней губы и подбородка!`;
		} else {
			message = `⚠️ КРИТИЧЕСКИЙ РИСК: зазор до дна гайморовой пазухи ${minClearance.toFixed(1)} мм (<1.5 мм). Риск перфорации мембраны Шнейдера!`;
		}
	} else if (isWarning) {
		if (nearest.type === "mandibular_canal") {
			message = `⚠️ Внимание: буфер до стенки нижнечелюстного канала ${minClearance.toFixed(1)} мм (<2.0 мм). Рекомендуется контроль наклона оси.`;
		} else if (nearest.type === "mental_foramen") {
			message = `⚠️ Внимание: дистанция до Foramen mentale ${minClearance.toFixed(1)} мм (<2.0 мм). Соблюдайте мезиальный отступ.`;
		} else {
			message = `⚠️ Внимание: дистанция до дна пазухи ${minClearance.toFixed(1)} мм (<2.0 мм). Контролируйте апикальный стоппер.`;
		}
	}

	return {
		distanceToMandibularCanalMm: canal,
		distanceToMentalForamenMm: foramen,
		distanceToSinusFloorMm: sinus,
		nearestStructure: nearest.type,
		minClearanceMm: minClearance,
		isWarning,
		isCritical,
		warningMessageRu: message,
		canProceed: true, // Mandate 8e: never disable buttons
	};
}

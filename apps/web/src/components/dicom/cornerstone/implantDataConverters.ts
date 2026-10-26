/**
 * implantDataConverters.ts — Конвертеры между форматом рантайма ImplantData и сохраненным форматом StoredImplant
 * Mandate 8b: строго <= 120 строк.
 */

import { vec3 } from "gl-matrix";
import { classifyExtendedBoneDensity } from "../../../utils/dicom/boneQualityEngine.js";
import type { StoredImplant } from "../ctPlanningPersistence.js";
import { worldTriple } from "../ctPlanningPersistence.js";
import { MANDIBULAR_NERVE_DANGER_THRESHOLD_MM } from "../../radiology/implantSafetyEngine.js";
import type { ImplantData } from "../cornerstoneTypes.js";

export function storedImplantsOf(implants: readonly ImplantData[]): StoredImplant[] {
	const out: StoredImplant[] = [];
	for (const implant of implants) {
		const startWorld = worldTriple(Array.from(implant.startWorld));
		const endWorld = worldTriple(Array.from(implant.endWorld));
		if (!startWorld || !endWorld) continue;
		out.push({
			id: implant.id,
			fdiCode: implant.fdiCode,
			diameter: implant.diameter,
			length: implant.length,
			startWorld,
			endWorld,
			boneDensity: {
				averageHU: implant.boneDensity.averageHU,
				classification: implant.boneDensity.classification,
			},
			...(typeof implant.distanceToNerve === "number" ? { distanceToNerve: implant.distanceToNerve } : {}),
			...(implant.systemId ? { systemId: implant.systemId } : {}),
			...(implant.brandName ? { brandName: implant.brandName } : {}),
			...(implant.lineName ? { lineName: implant.lineName } : {}),
			...(implant.platformCode ? { platformCode: implant.platformCode } : {}),
			...(implant.platformColor ? { platformColor: implant.platformColor } : {}),
		});
	}
	return out;
}

export function implantDataOf(stored: readonly StoredImplant[]): ImplantData[] {
	return stored.map((implant) => {
		const densityInfo = classifyExtendedBoneDensity(implant.boneDensity.averageHU);
		return {
			id: implant.id,
			fdiCode: implant.fdiCode,
			diameter: implant.diameter,
			length: implant.length,
			startWorld: vec3.fromValues(implant.startWorld[0], implant.startWorld[1], implant.startWorld[2]),
			endWorld: vec3.fromValues(implant.endWorld[0], implant.endWorld[1], implant.endWorld[2]),
			boneDensity: {
				averageHU: implant.boneDensity.averageHU,
				classification: densityInfo.mischClass,
				drillingAdvice: densityInfo.drillingRecommendation,
			},
			distanceToNerve: implant.distanceToNerve ?? null,
			systemId: implant.systemId,
			brandName: implant.brandName,
			lineName: implant.lineName,
			platformCode: implant.platformCode,
			platformColor: implant.platformColor,
		};
	});
}

export function implantProtocolLog(implant: ImplantData): string {
	const isDanger = implant.distanceToNerve != null && implant.distanceToNerve < MANDIBULAR_NERVE_DANGER_THRESHOLD_MM;
	const nerveStatusText = implant.distanceToNerve != null
		? isDanger
			? `ВНИМАНИЕ: дистанция до нижнечелюстного канала ${implant.distanceToNerve.toFixed(1)} мм (< 2.0 мм) — опасная зона риска!`
			: `Дистанция до нижнечелюстного канала ${implant.distanceToNerve.toFixed(1)} мм (безопасный коридор ≥ 2.0 мм).`
		: "Нижнечелюстной нерв не размечен.";
	const densityInfo = classifyExtendedBoneDensity(implant.boneDensity.averageHU);
	const brandTitle = implant.brandName ? `${implant.brandName} ${implant.lineName ?? ""}`.trim() : "Дентальный имплантат";
	const platformText = implant.platformCode ? ` (Платформа ${implant.platformCode})` : "";
	return `В область зуба ${implant.fdiCode} запланирована установка имплантата ${brandTitle} Ø${implant.diameter.toFixed(1)}x${implant.length.toFixed(1)} мм${platformText}. Плотность кости: ${densityInfo.label} (${Math.round(implant.boneDensity.averageHU)} HU). Протокол: ${densityInfo.drillingRecommendation}. ${nerveStatusText}`;
}

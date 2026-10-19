/**
 * anesthesiaTechniqueMath.ts — Anatomic & Mathematical Engine for Dental Anesthesia Techniques
 * Standards: Минздрав РФ, СтАР. Mandates: 8e, 8n (Solo Doctor), 8b (<= 120 lines).
 */

import { validateNeedleForTechnique } from "./anesthesiaNeedleValidation";
import {
	ANESTHETIC_DRUGS_CATALOG,
	CONDUCTION_TECHNIQUES_CATALOG,
	DENTAL_NEEDLE_CATALOG,
} from "./anesthesiaTechniqueCatalog";
import type {
	AnestheticDrugKey,
	AnestheticDrugSpec,
	ConductionTechniqueId,
	NeedleGaugeId,
	NeedleSpecification,
	TechniqueSpecification,
} from "./anesthesiaTechniqueTypes";

export * from "./anesthesiaTechniqueCatalog";
export * from "./anesthesiaTechniqueTypes";
export { validateNeedleForTechnique };

export function getTechniqueSpecification(
	techniqueId: ConductionTechniqueId,
): TechniqueSpecification {
	return (
		CONDUCTION_TECHNIQUES_CATALOG[techniqueId] ??
		CONDUCTION_TECHNIQUES_CATALOG.infiltration_supraperiosteal
	);
}

export function getNeedleSpecification(
	needleId: NeedleGaugeId,
): NeedleSpecification {
	return (
		DENTAL_NEEDLE_CATALOG[needleId] ??
		DENTAL_NEEDLE_CATALOG.gauge_30_medium_25mm
	);
}

export function getAnestheticDrugSpecification(
	drugKey: AnestheticDrugKey,
): AnestheticDrugSpec {
	return (
		ANESTHETIC_DRUGS_CATALOG[drugKey] ??
		ANESTHETIC_DRUGS_CATALOG.articaine_1_100k
	);
}

export function calculateAnestheticVolumeMg(
	drugKey: AnestheticDrugKey,
	volumeMl: number,
): {
	readonly activeMg: number;
	readonly epinephrineMg: number;
	readonly carpulesEquivalent: number;
} {
	const drug = getAnestheticDrugSpecification(drugKey);
	const activeMg = Math.round(drug.mgPerMlActive * volumeMl * 10) / 10;
	const epinephrineMg =
		Math.round(drug.epinephrineMgPerMl * volumeMl * 1000) / 1000;
	const carpulesEquivalent =
		Math.round((volumeMl / drug.standardCarpuleVolumeMl) * 10) / 10;

	return { activeMg, epinephrineMg, carpulesEquivalent };
}

export function getRecommendedWaitTimeSeconds(
	techniqueId: ConductionTechniqueId,
): number {
	return getTechniqueSpecification(techniqueId).onsetMinutes.defaultWaitTimeSec;
}

export function getNumbnessZonesDescription(
	techniqueId: ConductionTechniqueId,
	side: "right" | "left" | "bilateral" = "right",
	toothNumber?: string | number,
): string {
	const spec = getTechniqueSpecification(techniqueId);
	const sideRu =
		side === "right" ? "справа" : side === "left" ? "слева" : "с двух сторон";
	const toothStr = toothNumber ? ` (в области зуба ${toothNumber})` : "";
	return `${spec.shortNameRu} ${sideRu}${toothStr}: ${spec.anatomicZones.summaryRu}`;
}

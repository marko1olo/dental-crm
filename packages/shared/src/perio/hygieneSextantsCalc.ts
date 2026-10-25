/**
 * packages/shared/src/perio/hygieneSextantsCalc.ts
 *
 * Sextant-level hygiene calculations and healthy assessment factory.
 * Mandate 8b: File <= 120 lines.
 */

import type { SepaToothValue } from "../emr/periodontogram.js";
import {
	HYGIENE_INDEX_TEETH_CONFIG,
	WHO_HYGIENE_SEXTANTS,
	type HygieneSextantAssessment,
	type HygieneSextantKey,
	type HygieneToothAssessment,
} from "./hygieneConfig.js";
import {
	deriveHygieneFromPerioTeeth,
	deriveHygieneFromSepaTeeth,
	formatSextantHygieneSummary,
} from "./hygieneDerive.js";
import { calculateKpiScore, type KpiResult } from "./hygieneKpi.js";
import { calculateOhiSScore, type OhiSResult } from "./hygieneOhis.js";
import { calculatePmaScore, type PmaResult } from "./hygienePma.js";
import type { PerioToothRecord } from "./types.js";

export interface SextantHygieneCalculationResult {
	readonly sextants: Record<HygieneSextantKey, HygieneSextantAssessment>;
	readonly ohiS: OhiSResult;
	readonly pma: PmaResult;
	readonly kpi: KpiResult;
	readonly assessedSextantsCount: number;
	readonly summaryText043: string;
}

export function calculateSextantHygieneIndices(
	assessments: Record<number, HygieneToothAssessment> | readonly HygieneToothAssessment[],
): SextantHygieneCalculationResult {
	const teethMap = new Map<number, HygieneToothAssessment>();
	if (Array.isArray(assessments)) {
		for (const a of assessments) teethMap.set(a.toothNumber, a);
	} else {
		for (const [num, a] of Object.entries(assessments)) teethMap.set(Number(num), a);
	}

	const sextantsMap = {} as Record<HygieneSextantKey, HygieneSextantAssessment>;
	let assessedCount = 0;

	for (const def of WHO_HYGIENE_SEXTANTS) {
		const a = teethMap.get(def.indexToothNumber);
		const debris = a && typeof a.debrisScore === "number" && Number.isFinite(a.debrisScore) ? Math.max(0, Math.min(3, a.debrisScore)) : 0;
		const calculus = a && typeof a.calculusScore === "number" && Number.isFinite(a.calculusScore) ? Math.max(0, Math.min(3, a.calculusScore)) : 0;
		const pma = a && typeof a.pmaScore === "number" && Number.isFinite(a.pmaScore) ? Math.max(0, Math.min(3, a.pmaScore)) : 0;
		const kpi = a && typeof a.kpiScore === "number" && Number.isFinite(a.kpiScore) ? Math.max(0, Math.min(4, a.kpiScore)) : 0;

		const totalOhi = debris + calculus;
		const pmaPercent = Math.round((pma / 3) * 1000) / 10;
		const isHealthy = totalOhi === 0 && pma === 0 && kpi === 0;

		if (a && (a.debrisScore !== undefined || a.calculusScore !== undefined || a.pmaScore !== undefined || a.kpiScore !== undefined)) {
			assessedCount++;
		}

		sextantsMap[def.sextant] = {
			sextant: def.sextant, indexToothNumber: def.indexToothNumber,
			debrisScore: debris, calculusScore: calculus, totalOhiScore: totalOhi,
			pmaScore: pma, pmaPercent, kpiScore: kpi, isHealthy,
			summaryText: `${def.sextant} (зуб ${def.indexToothNumber}): OHI ${totalOhi} (налёт ${debris}, камень ${calculus}) | PMA ${pmaPercent}% | КПИ ${kpi}`,
		};
	}

	const ohiS = calculateOhiSScore(assessments);
	const pma = calculatePmaScore(assessments);
	const kpi = calculateKpiScore(assessments);

	const summaryLines = [
		`ЭКСПРЕСС-СКРИНИНГ ГИГИЕНЫ ПО 6 СЕКСТАНТАМ ВОЗ (зубы 16, 11, 26, 36, 31, 46):`,
		formatSextantHygieneSummary({ sextants: sextantsMap }),
		`• Интегральный OHI-S: ${ohiS.ratingText}`,
		`• Интегральный PMA: ${pma.ratingText}`,
		`• Комплексный индекс Леуса (КПИ): ${kpi.ratingText}`,
	];

	return {
		sextants: sextantsMap, ohiS, pma, kpi, assessedSextantsCount: assessedCount,
		summaryText043: summaryLines.join("\n"),
	};
}

export function deriveSextantHygieneFromPerioTeeth(teeth: readonly PerioToothRecord[]): SextantHygieneCalculationResult {
	return calculateSextantHygieneIndices(deriveHygieneFromPerioTeeth(teeth));
}

export function deriveSextantHygieneFromSepaTeeth(teeth: readonly SepaToothValue[]): SextantHygieneCalculationResult {
	return calculateSextantHygieneIndices(deriveHygieneFromSepaTeeth(teeth));
}

export function createHealthyHygieneAssessment(): Record<number, HygieneToothAssessment> {
	const result: Record<number, HygieneToothAssessment> = {};
	for (const cfg of HYGIENE_INDEX_TEETH_CONFIG) {
		result[cfg.toothNumber] = { toothNumber: cfg.toothNumber, debrisScore: 0, calculusScore: 0, pmaScore: 0, kpiScore: 0 };
	}
	return result;
}

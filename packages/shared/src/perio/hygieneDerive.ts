/**
 * packages/shared/src/perio/hygieneDerive.ts
 *
 * Derives hygiene scores from PerioToothRecord and Sepa models.
 * Mandate 8b: File <= 120 lines.
 */

import type { SepaToothValue } from "../emr/periodontogram.js";
import { convertSepaToothToPerioToothRecord } from "./adapters.js";
import {
	HYGIENE_INDEX_TEETH_CONFIG,
	type HygieneSextantAssessment,
	type HygieneSextantKey,
	type HygieneToothAssessment,
} from "./hygieneConfig.js";
import type { PerioToothRecord } from "./types.js";

export function deriveHygieneFromPerioTeeth(
	teeth: readonly PerioToothRecord[],
): Record<number, HygieneToothAssessment> {
	const result: Record<number, HygieneToothAssessment> = {};
	const teethMap = new Map<number, PerioToothRecord>();
	for (const t of teeth) teethMap.set(t.toothNumber, t);

	for (const cfg of HYGIENE_INDEX_TEETH_CONFIG) {
		const tooth = teethMap.get(cfg.toothNumber);
		if (!tooth || tooth.isMissing) continue;

		const isUpper = cfg.toothNumber < 30;
		const targetSite = isUpper ? tooth.midBuccal : tooth.midLingual;

		let plaqueCount = 0;
		let calculusCount = 0;
		let maxPocketDepth = 0;
		let hasBop = false;

		const siteList = [
			tooth.mesioBuccal, tooth.midBuccal, tooth.distoBuccal,
			tooth.mesioLingual, tooth.midLingual, tooth.distoLingual,
		];

		for (const s of siteList) {
			if (!s) continue;
			if (s.plaque) plaqueCount++;
			if (s.calculus) calculusCount++;
			if (s.bleedingOnProbing) hasBop = true;
			if (s.probingDepthMm > maxPocketDepth) maxPocketDepth = s.probingDepthMm;
		}

		const debrisScore = targetSite?.plaque ? Math.min(3, Math.max(1, plaqueCount)) : (plaqueCount > 0 ? 1 : 0);
		const calculusScore = targetSite?.calculus ? Math.min(3, Math.max(1, calculusCount)) : (calculusCount > 0 ? 1 : 0);

		let pmaScore = 0;
		if (maxPocketDepth >= 5) pmaScore = 3;
		else if (maxPocketDepth >= 4) pmaScore = 2;
		else if (hasBop) pmaScore = 1;

		let kpiScore = 0;
		if (maxPocketDepth >= 6 || (tooth.mobility && tooth.mobility >= 2)) kpiScore = 4;
		else if (maxPocketDepth >= 4) kpiScore = 3;
		else if (calculusScore > 0) kpiScore = 2;
		else if (hasBop) kpiScore = 1;

		result[cfg.toothNumber] = {
			toothNumber: cfg.toothNumber, debrisScore, calculusScore, pmaScore, kpiScore,
		};
	}

	return result;
}

export function deriveHygieneFromSepaTeeth(
	teeth: readonly SepaToothValue[],
): Record<number, HygieneToothAssessment> {
	const perioTeeth = teeth.map(convertSepaToothToPerioToothRecord);
	return deriveHygieneFromPerioTeeth(perioTeeth);
}

export function formatSextantHygieneSummary(result: {
	readonly sextants: Record<HygieneSextantKey, HygieneSextantAssessment>;
}): string {
	const order: HygieneSextantKey[] = ["S1", "S2", "S3", "S4", "S5", "S6"];
	return order
		.map((sKey) => {
			const s = result.sextants[sKey];
			if (!s) return `${sKey}: —`;
			return `${sKey}(#${s.indexToothNumber}): OHI ${s.totalOhiScore}/PMA ${s.pmaScore}`;
		})
		.join(" | ");
}

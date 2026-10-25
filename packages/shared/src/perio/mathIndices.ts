/**
 * packages/shared/src/perio/mathIndices.ts
 *
 * Full mouth indices calculation and default intact dentition factories.
 * Mandate 8b: File <= 120 lines.
 */

import {
	ALL_PERIO_TEETH,
	PERIO_SITE_KEYS,
	type PerioChartData,
	type PerioChartSummary,
	type PerioToothRecord,
} from "./types.js";
import { calculateClinicalAttachmentLevel } from "./mathCal.js";

export function calculatePerioIndices(teeth: PerioToothRecord[]): PerioChartSummary {
	let examinedTeeth = 0, totalSites = 0, bopSites = 0, plaqueSites = 0;
	let suppurationSites = 0, calculusSites = 0, deepPockets = 0, moderatePockets = 0;
	let mobileTeeth = 0, furcationTeeth = 0, maxPd = 0, sumPd = 0, maxCal = 0, sumCal = 0;

	for (const tooth of teeth) {
		if (tooth.isMissing) continue;
		examinedTeeth++;
		if (tooth.mobility && tooth.mobility > 0) mobileTeeth++;
		if (tooth.furcation && tooth.furcation > 0) furcationTeeth++;

		for (const siteKey of PERIO_SITE_KEYS) {
			const site = tooth[siteKey] ?? {
				probingDepthMm: 0, gingivalMarginMm: 0, bleedingOnProbing: false,
				suppuration: false, plaque: false, calculus: false,
			};
			totalSites++;
			const pd = site.probingDepthMm ?? 0;
			const gm = site.gingivalMarginMm ?? 0;
			const cal = calculateClinicalAttachmentLevel(pd, gm);

			if (pd > maxPd) maxPd = pd;
			sumPd += pd;
			if (cal > maxCal) maxCal = cal;
			sumCal += cal;

			if (pd >= 5) deepPockets++;
			else if (pd >= 4) moderatePockets++;

			if (site.bleedingOnProbing) bopSites++;
			if (site.plaque) plaqueSites++;
			if (site.suppuration) suppurationSites++;
			if (site.calculus) calculusSites++;
		}
	}

	const fmbsPercent = totalSites > 0 ? Math.round((bopSites / totalSites) * 1000) / 10 : 0;
	const fmpsPercent = totalSites > 0 ? Math.round((plaqueSites / totalSites) * 1000) / 10 : 0;
	const meanPocketDepthMm = totalSites > 0 ? Math.round((sumPd / totalSites) * 10) / 10 : 0;
	const meanCalMm = totalSites > 0 ? Math.round((sumCal / totalSites) * 10) / 10 : 0;

	let riskCategory: "low" | "moderate" | "high" = "low";
	if (fmbsPercent >= 30 || deepPockets >= 9 || mobileTeeth >= 3 || furcationTeeth >= 2 || suppurationSites >= 3) {
		riskCategory = "high";
	} else if (fmbsPercent >= 15 || deepPockets >= 4 || moderatePockets >= 10 || mobileTeeth >= 1 || furcationTeeth >= 1) {
		riskCategory = "moderate";
	}

	let aapStage: "health" | "gingivitis" | "stage_1" | "stage_2" | "stage_3" | "stage_4" = "health";
	if (maxCal >= 5 || maxPd >= 7 || furcationTeeth >= 2 || mobileTeeth >= 2) {
		const missingCount = teeth.filter((t) => t.isMissing).length;
		aapStage = missingCount >= 5 ? "stage_4" : "stage_3";
	} else if (maxCal >= 3 || maxPd >= 5 || furcationTeeth >= 1 || mobileTeeth >= 1) {
		aapStage = "stage_2";
	} else if (maxCal >= 1 || maxPd >= 4) {
		aapStage = "stage_1";
	} else if (fmbsPercent > 10) {
		aapStage = "gingivitis";
	}

	return {
		totalTeethExamined: examinedTeeth, totalSitesProbed: totalSites,
		fmbsPercent, fmpsPercent, deepPocketsCount: deepPockets,
		moderatePocketsCount: moderatePockets, sitesWithSuppurationCount: suppurationSites,
		sitesWithCalculusCount: calculusSites, teethWithMobilityCount: mobileTeeth,
		teethWithFurcationCount: furcationTeeth, maxPocketDepthMm: maxPd,
		meanPocketDepthMm, maxCalMm: maxCal, meanCalMm, riskCategory, aapStage,
	};
}

export function createDefaultPerioTeeth(probingDepthMm = 2): PerioToothRecord[] {
	const defaultSite = (pd: number) => ({
		probingDepthMm: pd, gingivalMarginMm: 0, bleedingOnProbing: false,
		suppuration: false, plaque: false, calculus: false, calMm: pd,
	});

	return ALL_PERIO_TEETH.map((toothNumber) => ({
		toothNumber, isMissing: false, isImplant: false,
		mobility: 0 as const, furcation: 0 as const,
		distoBuccal: defaultSite(probingDepthMm), midBuccal: defaultSite(probingDepthMm),
		mesioBuccal: defaultSite(probingDepthMm), distoLingual: defaultSite(probingDepthMm),
		midLingual: defaultSite(probingDepthMm), mesioLingual: defaultSite(probingDepthMm),
	}));
}

export function createIntactPerioChart(
	patientId: string,
	organizationId: string,
	doctorId?: string | null,
): PerioChartData {
	const teeth = createDefaultPerioTeeth(2);
	const summary = calculatePerioIndices(teeth);
	return {
		organizationId, patientId, doctorId: doctorId ?? null,
		chartDate: new Date().toISOString(), teeth, summary,
		praRisk: summary.riskCategory,
	};
}

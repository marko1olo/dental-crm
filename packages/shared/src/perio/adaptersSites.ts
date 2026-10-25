/**
 * packages/shared/src/perio/adaptersSites.ts
 *
 * Site code mapping and measurement conversion between Perio and SEPA models.
 * Mandate 8b: File <= 120 lines.
 */

import type {
	SepaFurcationGrade,
	SepaSiteCode,
	SepaSiteValue,
} from "../emr/periodontogram.js";
import { calculateClinicalAttachmentLevel } from "./math.js";
import type {
	FurcationGrade,
	PerioSiteKey,
	PerioSiteMeasurement,
} from "./types.js";

const SITE_KEY_TO_SEPA_CODE: Record<PerioSiteKey, SepaSiteCode> = {
	mesioBuccal: "MV",
	midBuccal: "V",
	distoBuccal: "DV",
	mesioLingual: "ML",
	midLingual: "L",
	distoLingual: "DL",
};

const SEPA_CODE_TO_SITE_KEY: Record<SepaSiteCode, PerioSiteKey> = {
	MV: "mesioBuccal",
	V: "midBuccal",
	DV: "distoBuccal",
	ML: "mesioLingual",
	L: "midLingual",
	DL: "distoLingual",
};

export const SEPA_ORDER: readonly SepaSiteCode[] = ["MV", "V", "DV", "ML", "L", "DL"];

export function mapPerioSiteKeyToSepaSiteCode(key: PerioSiteKey): SepaSiteCode {
	return SITE_KEY_TO_SEPA_CODE[key];
}

export function mapSepaSiteCodeToPerioSiteKey(code: SepaSiteCode): PerioSiteKey {
	return SEPA_CODE_TO_SITE_KEY[code];
}

export function furcationGradeToSepa(grade: FurcationGrade | undefined): SepaFurcationGrade | null {
	if (grade === undefined || grade === null || grade === 0) return "0";
	if (grade === 1) return "I";
	if (grade === 2) return "II";
	return "III";
}

export function sepaToFurcationGrade(grade: SepaFurcationGrade | null | undefined): FurcationGrade {
	if (!grade || grade === "0") return 0;
	if (grade === "I") return 1;
	if (grade === "II") return 2;
	if (grade === "III") return 3;
	return 0;
}

export function convertPerioSiteToSepaSite(
	key: PerioSiteKey,
	site: PerioSiteMeasurement | undefined,
): SepaSiteValue {
	const siteCode = mapPerioSiteKeyToSepaSiteCode(key);
	if (!site) {
		return {
			siteCode, probingDepthMm: 2, gingivalMarginMm: 0,
			bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false,
		};
	}
	return {
		siteCode, probingDepthMm: site.probingDepthMm ?? 2,
		gingivalMarginMm: site.gingivalMarginMm ?? 0,
		bleedingOnProbing: Boolean(site.bleedingOnProbing),
		plaque: Boolean(site.plaque), suppuration: Boolean(site.suppuration),
		calculus: Boolean(site.calculus),
	};
}

export function convertSepaSiteToPerioSite(site: SepaSiteValue): {
	key: PerioSiteKey;
	measurement: PerioSiteMeasurement;
} {
	const key = mapSepaSiteCodeToPerioSiteKey(site.siteCode);
	const pd = site.probingDepthMm ?? 2;
	const gm = site.gingivalMarginMm ?? 0;
	const calMm = calculateClinicalAttachmentLevel(pd, gm);

	return {
		key,
		measurement: {
			probingDepthMm: pd, gingivalMarginMm: gm,
			bleedingOnProbing: Boolean(site.bleedingOnProbing),
			suppuration: Boolean(site.suppuration), plaque: Boolean(site.plaque),
			calculus: Boolean(site.calculus), calMm,
		},
	};
}

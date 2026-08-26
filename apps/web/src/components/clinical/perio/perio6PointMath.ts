/**
 * DENTE Dental CRM — Periodontal 6-Point Probing Math Engine
 *
 * Implements 6-point probing mathematics per tooth:
 * - Buccal sites: Disto-Buccal (DB/B3), Mid-Buccal (B/B2), Mesio-Buccal (MB/B1)
 * - Lingual/Palatal sites: Disto-Lingual (DL/L3), Mid-Lingual (L/L2), Mesio-Lingual (ML/L1)
 *
 * Calculations:
 * - Clinical Attachment Level (CAL = PD + GM, clamped >= 0)
 * - Bleeding on Probing (BOP / FMBS %)
 * - Plaque Index (FMPS %)
 * - Suppuration (гноетечение / Pus exudate count & %)
 * - Calculus (поддесневой зубной камень count & %)
 * - Residual Deep Pockets (PD >= 5 mm) & Moderate Pockets (PD 4 mm)
 * - Furcation involvement (Class I, II, III, IV)
 * - Tooth mobility (Miller Grade I, II, III)
 * - Distribution across dental sextants and quadrants
 */

import {
	calculateClinicalAttachmentLevel,
	type FurcationGrade,
	type MobilityGrade,
	type PerioSiteKey,
	type PerioSiteMeasurement,
	type PerioSiteShortKey,
	type PerioToothRecord,
} from "@dental/shared";

export type ProbingSeverity = "normal" | "moderate" | "severe";

export type SixPointKey = "B1" | "B2" | "B3" | "L1" | "L2" | "L3";

export interface SixPointSiteInfo {
	readonly siteKey: PerioSiteKey;
	readonly shortKey: PerioSiteShortKey;
	readonly code6Point: SixPointKey;
	readonly labelRu: string;
	readonly aspect: "buccal" | "lingual";
	readonly anatomicalLocationRu: string;
}

/**
 * Canonical 6-point probing site mapping per tooth.
 * Buccal: MB (B1), B (B2), DB (B3)
 * Lingual: ML (L1), L (L2), DL (L3)
 */
export const SIX_POINT_SITES: readonly SixPointSiteInfo[] = [
	{
		siteKey: "mesioBuccal",
		shortKey: "MB",
		code6Point: "B1",
		labelRu: "Медиально-вестибулярно (MB / B1)",
		aspect: "buccal",
		anatomicalLocationRu: "Медиально-щечный угол",
	},
	{
		siteKey: "midBuccal",
		shortKey: "B",
		code6Point: "B2",
		labelRu: "По центру вестибулярно (B / B2)",
		aspect: "buccal",
		anatomicalLocationRu: "Середина вестибулярной поверхности",
	},
	{
		siteKey: "distoBuccal",
		shortKey: "DB",
		code6Point: "B3",
		labelRu: "Дистально-вестибулярно (DB / B3)",
		aspect: "buccal",
		anatomicalLocationRu: "Дистально-щечный угол",
	},
	{
		siteKey: "mesioLingual",
		shortKey: "ML",
		code6Point: "L1",
		labelRu: "Медиально-язычно (ML / L1)",
		aspect: "lingual",
		anatomicalLocationRu: "Медиально-язычный/нёбный угол",
	},
	{
		siteKey: "midLingual",
		shortKey: "L",
		code6Point: "L2",
		labelRu: "По центру язычно (L / L2)",
		aspect: "lingual",
		anatomicalLocationRu: "Середина язычной/нёбной поверхности",
	},
	{
		siteKey: "distoLingual",
		shortKey: "DL",
		code6Point: "L3",
		labelRu: "Дистально-язычно (DL / L3)",
		aspect: "lingual",
		anatomicalLocationRu: "Дистально-язычный/нёбный угол",
	},
] as const;

export const ALL_SIX_SITE_KEYS: readonly PerioSiteKey[] = [
	"distoBuccal",
	"midBuccal",
	"mesioBuccal",
	"distoLingual",
	"midLingual",
	"mesioLingual",
] as const;

/**
 * Evaluates pocket severity according to probing depth:
 * - Normal: 1..3 mm (физиологическая борозда)
 * - Moderate: 4..5 mm (пародонтальный карман умеренной глубины)
 * - Severe: >= 6 mm (глубокий деструктивный карман)
 */
export function getPocketSeverity(depthMm: number): ProbingSeverity {
	if (depthMm <= 3) return "normal";
	if (depthMm <= 5) return "moderate";
	return "severe";
}

/**
 * Checks if a probing site represents a residual active deep pocket (PD >= 5 mm).
 * Key diagnostic criteria in Lang & Tonetti PRA risk assessment.
 */
export function isDeepPerioPocket(depthMm: number): boolean {
	return depthMm >= 5;
}

/**
 * Calculates Clinical Attachment Level (CAL) from Probing Depth (PD) and Gingival Margin (GM).
 * Formula: CAL = PD + GM
 * - Positive GM = Gingival recession (десневой край апикальнее ЭЦГ)
 * - Negative GM = Gingival hyperplasia/edema (десневой край корональнее ЭЦГ)
 * Returns non-negative integer.
 */
export function calculateCAL(probingDepthMm: number, gingivalMarginMm: number): number {
	return calculateClinicalAttachmentLevel(probingDepthMm, gingivalMarginMm);
}

export interface Tooth6PointMetrics {
	readonly toothNumber: number;
	readonly isMissing: boolean;
	readonly isImplant: boolean;
	readonly mobility: MobilityGrade;
	readonly furcation: FurcationGrade;
	readonly maxPdMm: number;
	readonly meanPdMm: number;
	readonly maxCalMm: number;
	readonly meanCalMm: number;
	readonly bopSitesCount: number;
	readonly suppurationSitesCount: number;
	readonly plaqueSitesCount: number;
	readonly calculusSitesCount: number;
	readonly deepPocketsCount: number;
	readonly moderatePocketsCount: number;
	readonly sites: Readonly<Record<PerioSiteKey, PerioSiteMeasurement & { readonly calMm: number }>>;
}

/**
 * Extracts 6-point measurements and calculates localized indices for a single tooth.
 */
export function calculateTooth6PointMetrics(tooth: PerioToothRecord): Tooth6PointMetrics {
	if (tooth.isMissing) {
		const emptySite: PerioSiteMeasurement & { calMm: number } = {
			probingDepthMm: 0,
			gingivalMarginMm: 0,
			bleedingOnProbing: false,
			plaque: false,
			suppuration: false,
			calculus: false,
			calMm: 0,
		};
		return {
			toothNumber: tooth.toothNumber,
			isMissing: true,
			isImplant: tooth.isImplant ?? false,
			mobility: 0,
			furcation: 0,
			maxPdMm: 0,
			meanPdMm: 0,
			maxCalMm: 0,
			meanCalMm: 0,
			bopSitesCount: 0,
			suppurationSitesCount: 0,
			plaqueSitesCount: 0,
			calculusSitesCount: 0,
			deepPocketsCount: 0,
			moderatePocketsCount: 0,
			sites: {
				distoBuccal: emptySite,
				midBuccal: emptySite,
				mesioBuccal: emptySite,
				distoLingual: emptySite,
				midLingual: emptySite,
				mesioLingual: emptySite,
			},
		};
	}

	const sitesWithCal: Record<PerioSiteKey, PerioSiteMeasurement & { calMm: number }> = {
		distoBuccal: {
			...tooth.distoBuccal,
			calMm: calculateCAL(tooth.distoBuccal.probingDepthMm, tooth.distoBuccal.gingivalMarginMm),
		},
		midBuccal: {
			...tooth.midBuccal,
			calMm: calculateCAL(tooth.midBuccal.probingDepthMm, tooth.midBuccal.gingivalMarginMm),
		},
		mesioBuccal: {
			...tooth.mesioBuccal,
			calMm: calculateCAL(tooth.mesioBuccal.probingDepthMm, tooth.mesioBuccal.gingivalMarginMm),
		},
		distoLingual: {
			...tooth.distoLingual,
			calMm: calculateCAL(tooth.distoLingual.probingDepthMm, tooth.distoLingual.gingivalMarginMm),
		},
		midLingual: {
			...tooth.midLingual,
			calMm: calculateCAL(tooth.midLingual.probingDepthMm, tooth.midLingual.gingivalMarginMm),
		},
		mesioLingual: {
			...tooth.mesioLingual,
			calMm: calculateCAL(tooth.mesioLingual.probingDepthMm, tooth.mesioLingual.gingivalMarginMm),
		},
	};

	const siteArray = Object.values(sitesWithCal);
	let sumPd = 0;
	let maxPd = 0;
	let sumCal = 0;
	let maxCal = 0;
	let bopCount = 0;
	let suppCount = 0;
	let plaqueCount = 0;
	let calcCount = 0;
	let deepCount = 0;
	let modCount = 0;

	for (const s of siteArray) {
		sumPd += s.probingDepthMm;
		if (s.probingDepthMm > maxPd) maxPd = s.probingDepthMm;
		sumCal += s.calMm;
		if (s.calMm > maxCal) maxCal = s.calMm;
		if (s.bleedingOnProbing) bopCount++;
		if (s.suppuration) suppCount++;
		if (s.plaque) plaqueCount++;
		if (s.calculus) calcCount++;
		if (s.probingDepthMm >= 5) deepCount++;
		else if (s.probingDepthMm === 4) modCount++;
	}

	const count = siteArray.length;
	const meanPd = count > 0 ? Math.round((sumPd / count) * 10) / 10 : 0;
	const meanCal = count > 0 ? Math.round((sumCal / count) * 10) / 10 : 0;

	return {
		toothNumber: tooth.toothNumber,
		isMissing: false,
		isImplant: tooth.isImplant ?? false,
		mobility: tooth.mobility ?? 0,
		furcation: tooth.furcation ?? 0,
		maxPdMm: maxPd,
		meanPdMm: meanPd,
		maxCalMm: maxCal,
		meanCalMm: meanCal,
		bopSitesCount: bopCount,
		suppurationSitesCount: suppCount,
		plaqueSitesCount: plaqueCount,
		calculusSitesCount: calcCount,
		deepPocketsCount: deepCount,
		moderatePocketsCount: modCount,
		sites: sitesWithCal,
	};
}

export interface FullMouth6PointMetrics {
	readonly totalTeeth: number;
	readonly activeTeethCount: number;
	readonly missingTeethCount: number;
	readonly implantTeethCount: number;
	readonly totalSitesProbed: number;
	readonly bopSitesCount: number;
	readonly bopPercent: number; // FMBS %
	readonly plaqueSitesCount: number;
	readonly plaquePercent: number; // FMPS %
	readonly suppurationSitesCount: number;
	readonly suppurationPercent: number;
	readonly calculusSitesCount: number;
	readonly calculusPercent: number;
	readonly deepPocketsCount: number; // PD >= 5mm
	readonly moderatePocketsCount: number; // PD 4mm
	readonly normalSitesCount: number; // PD 1..3mm
	readonly maxPocketDepthMm: number;
	readonly meanPocketDepthMm: number;
	readonly maxCalMm: number;
	readonly meanCalMm: number;
	readonly teethWithMobilityCount: number;
	readonly mobilityDistribution: {
		readonly grade1: number;
		readonly grade2: number;
		readonly grade3: number;
	};
	readonly teethWithFurcationCount: number;
	readonly furcationDistribution: {
		readonly class1: number;
		readonly class2: number;
		readonly class3: number;
		readonly class4: number;
	};
	readonly toothMetricsMap: ReadonlyMap<number, Tooth6PointMetrics>;
}

/**
 * Calculates exhaustive full-mouth periodontal metrics across all examined teeth.
 */
export function calculateFullMouth6PointMetrics(
	teeth: readonly PerioToothRecord[],
): FullMouth6PointMetrics {
	const toothMetricsMap = new Map<number, Tooth6PointMetrics>();
	let activeTeethCount = 0;
	let missingTeethCount = 0;
	let implantTeethCount = 0;
	let totalSitesProbed = 0;

	let bopSitesCount = 0;
	let plaqueSitesCount = 0;
	let suppurationSitesCount = 0;
	let calculusSitesCount = 0;
	let deepPocketsCount = 0;
	let moderatePocketsCount = 0;
	let normalSitesCount = 0;

	let totalPd = 0;
	let maxPocketDepthMm = 0;
	let totalCal = 0;
	let maxCalMm = 0;

	let mobilityGrade1 = 0;
	let mobilityGrade2 = 0;
	let mobilityGrade3 = 0;

	let furcationClass1 = 0;
	let furcationClass2 = 0;
	let furcationClass3 = 0;
	let furcationClass4 = 0;

	for (const t of teeth) {
		const m = calculateTooth6PointMetrics(t);
		toothMetricsMap.set(t.toothNumber, m);

		if (t.isMissing) {
			missingTeethCount++;
			continue;
		}

		activeTeethCount++;
		if (t.isImplant) implantTeethCount++;

		totalSitesProbed += 6;
		bopSitesCount += m.bopSitesCount;
		plaqueSitesCount += m.plaqueSitesCount;
		suppurationSitesCount += m.suppurationSitesCount;
		calculusSitesCount += m.calculusSitesCount;
		deepPocketsCount += m.deepPocketsCount;
		moderatePocketsCount += m.moderatePocketsCount;

		normalSitesCount += 6 - m.deepPocketsCount - m.moderatePocketsCount;

		if (m.maxPdMm > maxPocketDepthMm) maxPocketDepthMm = m.maxPdMm;
		if (m.maxCalMm > maxCalMm) maxCalMm = m.maxCalMm;

		for (const s of Object.values(m.sites)) {
			totalPd += s.probingDepthMm;
			totalCal += s.calMm;
		}

		// Mobility counting
		if (t.mobility === 1) mobilityGrade1++;
		else if (t.mobility === 2) mobilityGrade2++;
		else if (t.mobility === 3) mobilityGrade3++;

		// Furcation counting
		if (t.furcation === 1) furcationClass1++;
		else if (t.furcation === 2) furcationClass2++;
		else if (t.furcation === 3) furcationClass3++;
		else if (t.furcation === 4) furcationClass4++;
	}

	const teethWithMobilityCount = mobilityGrade1 + mobilityGrade2 + mobilityGrade3;
	const teethWithFurcationCount =
		furcationClass1 + furcationClass2 + furcationClass3 + furcationClass4;

	const bopPercent =
		totalSitesProbed > 0 ? Math.round((bopSitesCount / totalSitesProbed) * 1000) / 10 : 0;
	const plaquePercent =
		totalSitesProbed > 0 ? Math.round((plaqueSitesCount / totalSitesProbed) * 1000) / 10 : 0;
	const suppurationPercent =
		totalSitesProbed > 0
			? Math.round((suppurationSitesCount / totalSitesProbed) * 1000) / 10
			: 0;
	const calculusPercent =
		totalSitesProbed > 0 ? Math.round((calculusSitesCount / totalSitesProbed) * 1000) / 10 : 0;

	const meanPocketDepthMm =
		totalSitesProbed > 0 ? Math.round((totalPd / totalSitesProbed) * 10) / 10 : 0;
	const meanCalMm =
		totalSitesProbed > 0 ? Math.round((totalCal / totalSitesProbed) * 10) / 10 : 0;

	return {
		totalTeeth: teeth.length,
		activeTeethCount,
		missingTeethCount,
		implantTeethCount,
		totalSitesProbed,
		bopSitesCount,
		bopPercent,
		plaqueSitesCount,
		plaquePercent,
		suppurationSitesCount,
		suppurationPercent,
		calculusSitesCount,
		calculusPercent,
		deepPocketsCount,
		moderatePocketsCount,
		normalSitesCount,
		maxPocketDepthMm,
		meanPocketDepthMm,
		maxCalMm,
		meanCalMm,
		teethWithMobilityCount,
		mobilityDistribution: {
			grade1: mobilityGrade1,
			grade2: mobilityGrade2,
			grade3: mobilityGrade3,
		},
		teethWithFurcationCount,
		furcationDistribution: {
			class1: furcationClass1,
			class2: furcationClass2,
			class3: furcationClass3,
			class4: furcationClass4,
		},
		toothMetricsMap,
	};
}

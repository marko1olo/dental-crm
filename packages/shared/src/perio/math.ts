import {
	ALL_PERIO_TEETH,
	PERIO_LOWER_ARCH_TEETH,
	PERIO_SITE_KEYS,
	PERIO_UPPER_ARCH_TEETH,
	type PerioChartSummary,
	type PerioSiteKey,
	type PerioToothRecord,
	type ProbingStep,
} from "./types.js";

/**
 * Calculates Clinical Attachment Level (CAL):
 * CAL = Probing Depth (PD) + Gingival Margin (GM).
 * - Positive GM (Recession): CAL = PD + GM (loss is greater than pocket depth)
 * - Zero GM (Normal margin at CEJ): CAL = PD
 * - Negative GM (Gingival overgrowth / Hyperplasia / False pocket): CAL = max(0, PD + GM)
 */
export function calculateClinicalAttachmentLevel(
	probingDepthMm: number,
	gingivalMarginMm: number,
): number {
	const pd = Number.isFinite(probingDepthMm) ? Math.max(0, Math.round(probingDepthMm)) : 0;
	const gm = Number.isFinite(gingivalMarginMm) ? Math.round(gingivalMarginMm) : 0;
	return Math.max(0, pd + gm);
}

/**
 * Checks whether a tooth is multi-rooted (where furcation assessment is clinically relevant).
 * - Upper molars (16..18, 26..28) have 3 roots (trifurcation: mesio-palatal, disto-palatal, buccal).
 * - Upper first premolars (14, 24) frequently have 2 roots (bifurcation: buccal & palatal).
 * - Lower molars (36..38, 46..48) have 2 roots (bifurcation: buccal & lingual).
 * - Primary molars (54, 55, 64, 65, 74, 75, 84, 85).
 */
export function isFurcationEligibleTooth(toothNumber: number): boolean {
	const pos = toothNumber % 10;
	const quad = Math.floor(toothNumber / 10);
	const isUpper = quad === 1 || quad === 2 || quad === 5 || quad === 6;

	// Upper molars (16..18, 26..28) have 3 roots
	if (isUpper && (pos === 6 || pos === 7 || pos === 8)) return true;

	// Upper first premolars (14, 24) frequently have 2 roots
	if (isUpper && pos === 4) return true;

	// Lower molars (36..38, 46..48) have 2 roots
	if (!isUpper && (pos === 6 || pos === 7 || pos === 8)) return true;

	// Pediatric primary molars (54, 55, 64, 65, 74, 75, 84, 85)
	if (quad >= 5 && (pos === 4 || pos === 5)) return true;

	return false;
}

export { isFurcationEligibleTooth as isPerioMultiRootedTooth };

/**
 * Generates continuous anatomical probing sequence across the entire dentition (Florida Probe):
 * 1. Upper Arch Buccal (18 DB -> 18 B -> 18 MB ... -> 28 DB)
 * 2. Upper Arch Palatal (28 DB -> ... -> 18 DL)
 * 3. Lower Arch Buccal (48 DB -> ... -> 38 DB)
 * 4. Lower Arch Lingual (38 DL -> ... -> 48 DL)
 */
export function generateFullMouthProbingSequence(
	teeth: readonly PerioToothRecord[],
): ProbingStep[] {
	const activeTeethMap = new Map<number, PerioToothRecord>();
	for (const t of teeth) {
		activeTeethMap.set(t.toothNumber, t);
	}

	const sequence: ProbingStep[] = [];

	// 1. Upper Arch Buccal: Quadrant 1 (18..11) then Quadrant 2 (21..28)
	for (const num of PERIO_UPPER_ARCH_TEETH) {
		const t = activeTeethMap.get(num);
		if (t?.isMissing) continue;
		const isQuad1 = num < 20;
		const sites: PerioSiteKey[] = isQuad1
			? ["distoBuccal", "midBuccal", "mesioBuccal"]
			: ["mesioBuccal", "midBuccal", "distoBuccal"];
		for (const siteKey of sites) {
			sequence.push({ toothNumber: num, siteKey, arch: "upper", aspect: "buccal" });
		}
	}

	// 2. Upper Arch Palatal: Quadrant 2 (28..21) then Quadrant 1 (11..18)
	const upperPalatalOrder = [...PERIO_UPPER_ARCH_TEETH].reverse();
	for (const num of upperPalatalOrder) {
		const t = activeTeethMap.get(num);
		if (t?.isMissing) continue;
		const isQuad2 = num >= 20;
		const sites: PerioSiteKey[] = isQuad2
			? ["distoLingual", "midLingual", "mesioLingual"]
			: ["mesioLingual", "midLingual", "distoLingual"];
		for (const siteKey of sites) {
			sequence.push({ toothNumber: num, siteKey, arch: "upper", aspect: "lingual" });
		}
	}

	// 3. Lower Arch Buccal: Quadrant 4 (48..41) then Quadrant 3 (31..38)
	for (const num of PERIO_LOWER_ARCH_TEETH) {
		const t = activeTeethMap.get(num);
		if (t?.isMissing) continue;
		const isQuad4 = num >= 40;
		const sites: PerioSiteKey[] = isQuad4
			? ["distoBuccal", "midBuccal", "mesioBuccal"]
			: ["mesioBuccal", "midBuccal", "distoBuccal"];
		for (const siteKey of sites) {
			sequence.push({ toothNumber: num, siteKey, arch: "lower", aspect: "buccal" });
		}
	}

	// 4. Lower Arch Lingual: Quadrant 3 (38..31) then Quadrant 4 (41..48)
	const lowerLingualOrder = [...PERIO_LOWER_ARCH_TEETH].reverse();
	for (const num of lowerLingualOrder) {
		const t = activeTeethMap.get(num);
		if (t?.isMissing) continue;
		const isQuad3 = num < 40;
		const sites: PerioSiteKey[] = isQuad3
			? ["distoLingual", "midLingual", "mesioLingual"]
			: ["mesioLingual", "midLingual", "distoLingual"];
		for (const siteKey of sites) {
			sequence.push({ toothNumber: num, siteKey, arch: "lower", aspect: "lingual" });
		}
	}

	return sequence;
}

/**
 * Calculates Bone Loss / Age ratio (BL/Age) according to AAP/EFP 2018 Grading criteria.
 * - Grade A (Slow): < 0.25 - 0.5
 * - Grade B (Moderate): 0.5 - 1.0
 * - Grade C (Rapid): > 1.0
 */
export function calculateBoneLossAgeRatio(
	boneLossPercent: number,
	patientAgeYears: number,
): number {
	const safeAge = Math.max(18, Math.min(120, patientAgeYears));
	const safeLoss = Math.max(0, Math.min(100, boneLossPercent));
	const ratio = safeLoss / safeAge;
	return Math.round(ratio * 100) / 100;
}

/**
 * Derives default radiographic bone loss percentage from worst CAL if not explicitly provided.
 * Standard anatomical root length assumed ~12-14mm, so 1mm CAL loss ~ 7-8% bone loss.
 */
export function estimateBoneLossPercentFromTeeth(
	teeth: readonly PerioToothRecord[],
	maxCalMm?: number,
): number {
	if (typeof maxCalMm === "number" && maxCalMm >= 0) {
		return Math.min(95, Math.max(0, Math.round((maxCalMm / 12) * 100)));
	}

	let maxCal = 0;
	for (const tooth of teeth) {
		if (tooth.isMissing) continue;
		for (const sKey of PERIO_SITE_KEYS) {
			const s = tooth[sKey];
			if (!s) continue;
			const cal = calculateClinicalAttachmentLevel(s.probingDepthMm, s.gingivalMarginMm);
			if (cal > maxCal) maxCal = cal;
		}
	}
	return Math.min(95, Math.max(0, Math.round((maxCal / 12) * 100)));
}

/**
 * Probing depth color classification for UI presentation.
 */
export function getProbingDepthColor(depthMm: number): {
	readonly textColor: string;
	readonly bgColor: string;
	readonly borderColor: string;
	readonly labelRu: string;
	readonly isDeep: boolean;
} {
	if (depthMm <= 3) {
		return {
			textColor: "text-emerald-700 dark:text-emerald-300",
			bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
			borderColor: "border-emerald-200 dark:border-emerald-800",
			labelRu: "Норма (1-3 мм)",
			isDeep: false,
		};
	}
	if (depthMm <= 5) {
		return {
			textColor: "text-amber-700 dark:text-amber-300",
			bgColor: "bg-amber-50 dark:bg-amber-950/40",
			borderColor: "border-amber-200 dark:border-amber-800",
			labelRu: "Умеренный карман (4-5 мм)",
			isDeep: false,
		};
	}
	return {
		textColor: "text-rose-700 dark:text-rose-300",
		bgColor: "bg-rose-50 dark:bg-rose-950/50",
		borderColor: "border-rose-300 dark:border-rose-800",
		labelRu: "Глубокий карман (≥ 6 мм)",
		isDeep: true,
	};
}

/**
 * Pure calculation function for periodontal indices (FMBS, FMPS, CAL, Suppuration, PRA risk).
 */
export function calculatePerioIndices(teeth: PerioToothRecord[]): PerioChartSummary {
	let examinedTeeth = 0;
	let totalSites = 0;
	let bopSites = 0;
	let plaqueSites = 0;
	let suppurationSites = 0;
	let calculusSites = 0;
	let deepPockets = 0;
	let moderatePockets = 0;
	let mobileTeeth = 0;
	let furcationTeeth = 0;

	let maxPd = 0;
	let sumPd = 0;
	let maxCal = 0;
	let sumCal = 0;

	for (const tooth of teeth) {
		if (tooth.isMissing) continue;
		examinedTeeth++;

		if (tooth.mobility && tooth.mobility > 0) mobileTeeth++;
		if (tooth.furcation && tooth.furcation > 0) furcationTeeth++;

		for (const siteKey of PERIO_SITE_KEYS) {
			const site = tooth[siteKey] ?? {
				probingDepthMm: 0,
				gingivalMarginMm: 0,
				bleedingOnProbing: false,
				suppuration: false,
				plaque: false,
				calculus: false,
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

	// Periodontal Risk Assessment (Lang & Tonetti)
	let riskCategory: "low" | "moderate" | "high" = "low";
	if (
		fmbsPercent >= 30 ||
		deepPockets >= 9 ||
		mobileTeeth >= 3 ||
		furcationTeeth >= 2 ||
		suppurationSites >= 3
	) {
		riskCategory = "high";
	} else if (
		fmbsPercent >= 15 ||
		deepPockets >= 4 ||
		moderatePockets >= 10 ||
		mobileTeeth >= 1 ||
		furcationTeeth >= 1
	) {
		riskCategory = "moderate";
	}

	// AAP/EFP Staging estimation
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
		totalTeethExamined: examinedTeeth,
		totalSitesProbed: totalSites,
		fmbsPercent,
		fmpsPercent,
		deepPocketsCount: deepPockets,
		moderatePocketsCount: moderatePockets,
		sitesWithSuppurationCount: suppurationSites,
		sitesWithCalculusCount: calculusSites,
		teethWithMobilityCount: mobileTeeth,
		teethWithFurcationCount: furcationTeeth,
		maxPocketDepthMm: maxPd,
		meanPocketDepthMm,
		maxCalMm: maxCal,
		meanCalMm,
		riskCategory,
		aapStage,
	};
}

export { calculateClinicalAttachmentLevel as calculateSepaCal };

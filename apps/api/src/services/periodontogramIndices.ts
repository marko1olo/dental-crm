/**
 * Periodontogram Clinical Indices Calculator (ADR 0013)
 * Calculates SEPA indices (BOP %, Plaque %, CAL Mean, Deep Pockets),
 * Green-Vermillion OHI-S, Schiller-Pisarev PMA, and PSR sextant screening.
 */

export interface ToothRow {
	id: string;
	snapshotId: string;
	toothNumber: number;
	isPresent: boolean;
	isImplant: boolean;
	mobility: number | null;
	prognosis: string | null;
	furcationBuccal: string | null;
	furcationLingual: string | null;
	keratinizedGingivaMm: number | null;
}

export interface SiteRow {
	id: string;
	snapshotId: string;
	toothId: string | null;
	toothNumber: number;
	siteCode: string;
	probingDepthMm: number | null;
	gingivalMarginMm: number | null;
	bleedingOnProbing: boolean;
	plaque: boolean;
	suppuration: boolean;
	calculus: boolean;
}

export interface ComputedPeriodontogramIndices {
	bop_pct: number;
	pi_pct: number;
	cal_mean_mm: number;
	deep_pockets_count: number;
	ohi_s: number;
	pma: number;
	psr: number;
	total_teeth_examined: number;
	total_sites_probed: number;
}

export const GREEN_VERMILLION_INDEX_TEETH = [16, 11, 26, 36, 31, 46] as const;

export const PSR_SEXTANTS = [
	[17, 16, 15, 14],
	[13, 12, 11, 21, 22, 23],
	[24, 25, 26, 27],
	[37, 36, 35, 34],
	[33, 32, 31, 41, 42, 43],
	[44, 45, 46, 47],
] as const;

export function computeSnapshotIndices(
	teeth: readonly ToothRow[],
	sites: readonly SiteRow[],
): ComputedPeriodontogramIndices {
	const presentTeeth = teeth.filter((t) => t.isPresent);
	const presentTeethNumbers = new Set(presentTeeth.map((t) => t.toothNumber));
	const denominator = presentTeeth.length * 6; // SEPA standard: 6 sites * present teeth

	const presentSites = sites.filter((s) =>
		presentTeethNumbers.has(s.toothNumber),
	);

	if (denominator === 0) {
		return {
			bop_pct: 0,
			pi_pct: 0,
			cal_mean_mm: 0,
			deep_pockets_count: 0,
			ohi_s: 0,
			pma: 0,
			psr: 0,
			total_teeth_examined: 0,
			total_sites_probed: 0,
		};
	}

	let bopCount = 0;
	let plaqueCount = 0;
	let calSum = 0;
	let totalProbed = 0;

	// Map sites by toothNumber
	const sitesByTooth = new Map<number, SiteRow[]>();
	for (const s of presentSites) {
		const list = sitesByTooth.get(s.toothNumber) ?? [];
		list.push(s);
		sitesByTooth.set(s.toothNumber, list);

		if (s.bleedingOnProbing) bopCount++;
		if (s.plaque) plaqueCount++;
		if (s.probingDepthMm !== null && Number.isFinite(s.probingDepthMm)) {
			totalProbed++;
			const gm = s.gingivalMarginMm ?? 0;
			calSum += Math.max(0, s.probingDepthMm + gm);
		}
	}

	// BOP % and PI % (rounded to 1 decimal)
	const bop_pct = Math.round((100.0 * bopCount * 10) / denominator) / 10;
	const pi_pct = Math.round((100.0 * plaqueCount * 10) / denominator) / 10;
	const cal_mean_mm = Math.round((calSum / denominator) * 100) / 100;

	// Deep pockets count: distinct teeth with at least one pocket >= 5 mm
	let deepPocketsCount = 0;
	for (const t of presentTeeth) {
		const tSites = sitesByTooth.get(t.toothNumber) ?? [];
		const hasDeep = tSites.some(
			(s) => s.probingDepthMm !== null && s.probingDepthMm >= 5,
		);
		if (hasDeep) deepPocketsCount++;
	}

	// OHI-S & PMA calculation based on Green-Vermillion index teeth (16, 11, 26, 36, 31, 46)
	let ohiCount = 0;
	let totalDebris = 0;
	let totalCalculus = 0;
	let pmaScoreSum = 0;

	for (const toothNum of GREEN_VERMILLION_INDEX_TEETH) {
		if (!presentTeethNumbers.has(toothNum)) continue;
		const tSites = sitesByTooth.get(toothNum) ?? [];
		let toothPlaque = 0;
		let toothCalculus = 0;
		let maxPd = 0;
		let hasBop = false;

		for (const s of tSites) {
			if (s.plaque) toothPlaque++;
			if (s.calculus) toothCalculus++;
			if (s.bleedingOnProbing) hasBop = true;
			if (s.probingDepthMm !== null && s.probingDepthMm > maxPd) {
				maxPd = s.probingDepthMm;
			}
		}

		totalDebris += Math.min(3, toothPlaque > 0 ? (toothPlaque > 2 ? 2 : 1) : 0);
		totalCalculus += Math.min(
			3,
			toothCalculus > 0 ? (toothCalculus > 2 ? 2 : 1) : 0,
		);
		ohiCount++;

		// PMA: 0: norm, 1: bop, 2: pocket 4mm, 3: pocket >= 5mm
		if (maxPd >= 5) pmaScoreSum += 3;
		else if (maxPd >= 4) pmaScoreSum += 2;
		else if (hasBop) pmaScoreSum += 1;
	}

	const ohi_s =
		ohiCount > 0
			? Math.round(((totalDebris + totalCalculus) / ohiCount) * 10) / 10
			: 0;
	const pma =
		ohiCount > 0
			? Math.round((pmaScoreSum / (3 * ohiCount)) * 100 * 10) / 10
			: 0;

	// PSR: Sextant assessment (highest code across sextants: 0..4)
	let maxPsr = 0;
	for (const sextant of PSR_SEXTANTS) {
		for (const toothNum of sextant) {
			if (!presentTeethNumbers.has(toothNum)) continue;
			const tSites = sitesByTooth.get(toothNum) ?? [];
			for (const s of tSites) {
				const pd = s.probingDepthMm ?? 0;
				if (pd >= 6) maxPsr = Math.max(maxPsr, 4);
				else if (pd >= 4) maxPsr = Math.max(maxPsr, 3);
				else if (s.calculus) maxPsr = Math.max(maxPsr, 2);
				else if (s.bleedingOnProbing) maxPsr = Math.max(maxPsr, 1);
			}
		}
	}

	return {
		bop_pct,
		pi_pct,
		cal_mean_mm,
		deep_pockets_count: deepPocketsCount,
		ohi_s,
		pma,
		psr: maxPsr,
		total_teeth_examined: presentTeeth.length,
		total_sites_probed: totalProbed,
	};
}

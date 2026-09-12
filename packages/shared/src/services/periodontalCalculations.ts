/**
 * periodontalCalculations.ts — канонические индексы пародонтологии SEPA.
 *
 * Адаптировано из dentalpin (backend/app/modules/periodontogram/indices.py, constants.py).
 * Соответствует стандартам SEPA (Sociedad Española de Periodoncia y Osteointegración)
 * и классификации риска пародонтита Lang & Tonetti (PRA).
 *
 * 6 анатомических точек зондирования на каждый зуб:
 * - MV: мезио-вестибулярно (mesio-vestibular)
 * - V:  вестибулярно (mid-vestibular)
 * - DV: дисто-вестибулярно (disto-vestibular)
 * - ML: мезио-лингвально/нёбно (mesio-lingual / palatal)
 * - L:  лингвально/нёбно (mid-lingual / palatal)
 * - DL: дисто-лингвально/нёбно (disto-lingual / palatal)
 *
 * База расчёта (totalSites):
 * totalSites = 6 * presentTeethCount.
 * Отсутствующие зубы исключаются из числителя и знаменателя.
 * Неизмеренные точки не завышают процент воспаления, а считаются отсутствием патологии (0).
 */

export type PeriodontalSiteCode = "MV" | "V" | "DV" | "ML" | "L" | "DL";

export const PERIODONTAL_SITE_CODES: readonly PeriodontalSiteCode[] = [
	"MV",
	"V",
	"DV",
	"ML",
	"L",
	"DL",
] as const;

export const SITES_PER_TOOTH = 6;
export const DEEP_POCKET_THRESHOLD_MM = 5;

export interface PeriodontalSite {
	siteCode?: PeriodontalSiteCode | string;
	probingDepthMm?: number | null;
	probing_depth_mm?: number | null;
	gingivalMarginMm?: number | null;
	gingival_margin_mm?: number | null;
	bleedingOnProbing?: boolean;
	bleeding_on_probing?: boolean;
	plaque?: boolean;
	calMm?: number | null;
	cal_mm?: number | null;
}

export interface PeriodontalToothRecord {
	toothNumber?: number;
	tooth_number?: number;
	isPresent?: boolean;
	is_present?: boolean;
	isMissing?: boolean;
	sites?: PeriodontalSite[];
	// Прямой доступ по SEPA-кодам точек
	MV?: PeriodontalSite;
	V?: PeriodontalSite;
	DV?: PeriodontalSite;
	ML?: PeriodontalSite;
	L?: PeriodontalSite;
	DL?: PeriodontalSite;
	// Совместимость с Florida-ключами
	mesioBuccal?: PeriodontalSite;
	midBuccal?: PeriodontalSite;
	distoBuccal?: PeriodontalSite;
	mesioLingual?: PeriodontalSite;
	midLingual?: PeriodontalSite;
	distoLingual?: PeriodontalSite;
}

/**
 * Проверяет, присутствует ли зуб в полости рта.
 * Отсутствующие зубы (адентия, удаление) исключаются из расчёта.
 * Имплантаты считаются присутствующими зубами для зондирования.
 */
export function isToothPresent(tooth: PeriodontalToothRecord): boolean {
	if (tooth.isPresent !== undefined) return Boolean(tooth.isPresent);
	if (tooth.is_present !== undefined) return Boolean(tooth.is_present);
	if (tooth.isMissing !== undefined) return !tooth.isMissing;
	return true;
}

/**
 * Извлекает массив точек зондирования из записи зуба.
 */
export function getToothSites(tooth: PeriodontalToothRecord): PeriodontalSite[] {
	if (tooth.sites && Array.isArray(tooth.sites)) {
		return tooth.sites;
	}

	const sites: PeriodontalSite[] = [];
	// Проверка SEPA-нотации
	if (tooth.MV) sites.push(tooth.MV);
	if (tooth.V) sites.push(tooth.V);
	if (tooth.DV) sites.push(tooth.DV);
	if (tooth.ML) sites.push(tooth.ML);
	if (tooth.L) sites.push(tooth.L);
	if (tooth.DL) sites.push(tooth.DL);
	if (sites.length > 0) return sites;

	// Проверка Florida-нотации
	if (tooth.mesioBuccal) sites.push(tooth.mesioBuccal);
	if (tooth.midBuccal) sites.push(tooth.midBuccal);
	if (tooth.distoBuccal) sites.push(tooth.distoBuccal);
	if (tooth.mesioLingual) sites.push(tooth.mesioLingual);
	if (tooth.midLingual) sites.push(tooth.midLingual);
	if (tooth.distoLingual) sites.push(tooth.distoLingual);

	return sites;
}

/**
 * Вычисляет теоретическое количество точек зондирования:
 * totalSites = 6 * presentTeethCount.
 */
export function calculateTotalSites(presentTeethCount: number): number {
	return Math.max(0, Math.floor(presentTeethCount)) * SITES_PER_TOOTH;
}

/**
 * Рассчитывает процент кровоточивости при зондировании (Bleeding on Probing, BoP %):
 * BoP % = 100 * (число точек с BoP) / totalSites.
 *
 * @param sites Список точек зондирования
 * @param presentTeethCount Число присутствующих зубов (если не передано, используется sites.length / 6 или sites.length)
 */
export function calculateBopPercentage(
	sites: PeriodontalSite[],
	presentTeethCount?: number,
): number {
	const totalSites =
		presentTeethCount !== undefined
			? SITES_PER_TOOTH * Math.max(0, presentTeethCount)
			: sites.length;
	if (totalSites <= 0) return 0;

	const bleeders = sites.filter(
		(s) => s.bleedingOnProbing === true || s.bleeding_on_probing === true,
	).length;

	return Math.round(((100 * bleeders) / totalSites) * 100) / 100;
}

/**
 * Рассчитывает индекс налёта / гигиены О'Лири по SEPA (Plaque Index, PI %):
 * PI % = 100 * (число точек с налётом) / totalSites.
 *
 * @param sites Список точек зондирования
 * @param presentTeethCount Число присутствующих зубов
 */
export function calculatePlaquePercentage(
	sites: PeriodontalSite[],
	presentTeethCount?: number,
): number {
	const totalSites =
		presentTeethCount !== undefined
			? SITES_PER_TOOTH * Math.max(0, presentTeethCount)
			: sites.length;
	if (totalSites <= 0) return 0;

	const plaqued = sites.filter((s) => s.plaque === true).length;

	return Math.round(((100 * plaqued) / totalSites) * 100) / 100;
}

/**
 * Рассчитывает среднюю потерю клинического прикрепления (Mean CAL, мм):
 * CAL = Probing Depth (PD) + Gingival Margin (GM).
 * Mean CAL = Σ(PD + GM там, где оба параметра измерены) / totalSites.
 *
 * @param sites Список точек зондирования
 * @param presentTeethCount Число присутствующих зубов
 */
export function calculateMeanCal(
	sites: PeriodontalSite[],
	presentTeethCount?: number,
): number {
	const totalSites =
		presentTeethCount !== undefined
			? SITES_PER_TOOTH * Math.max(0, presentTeethCount)
			: sites.length;
	if (totalSites <= 0) return 0;

	let calSum = 0;
	for (const s of sites) {
		const pd = s.probingDepthMm ?? s.probing_depth_mm;
		const gm = s.gingivalMarginMm ?? s.gingival_margin_mm;
		if (pd !== undefined && pd !== null && gm !== undefined && gm !== null) {
			calSum += pd + gm;
		} else {
			const directCal = s.calMm ?? s.cal_mm;
			if (directCal !== undefined && directCal !== null) {
				calSum += directCal;
			}
		}
	}

	return Math.round((calSum / totalSites) * 100) / 100;
}

/**
 * Рассчитывает число зубов с глубокими пародонтальными карманами (PD >= threshold, по умолчанию 5 мм).
 * Учитываются только присутствующие зубы (distinct present teeth).
 *
 * @param teeth Список записей по зубам
 * @param threshold Порог глубины кармана в мм (по умолчанию 5 мм)
 */
export function calculateDeepPocketsCount(
	teeth: PeriodontalToothRecord[],
	threshold: number = DEEP_POCKET_THRESHOLD_MM,
): number {
	return teeth.filter((tooth) => {
		if (!isToothPresent(tooth)) return false;
		const sites = getToothSites(tooth);
		return sites.some((s) => {
			const pd = s.probingDepthMm ?? s.probing_depth_mm;
			return pd !== undefined && pd !== null && pd >= threshold;
		});
	}).length;
}

/**
 * Оценивает категорию пародонтального риска по Lang & Tonetti (Periodontal Risk Assessment, PRA) / SEPA:
 * - 'low': низкий риск прогрессирования
 * - 'moderate': умеренный риск
 * - 'high': высокий риск
 *
 * Критерии:
 * 1. BoP %:
 *    - Низкий: < 15% (по классике < 10-15%)
 *    - Умеренный: 15% - 29%
 *    - Высокий: >= 30%
 * 2. Глубокие карманы (>= 5 мм):
 *    - Низкий: < 4 зубов
 *    - Умеренный: 4 - 8 зубов
 *    - Высокий: >= 9 зубов
 * 3. Потеря костной ткани (boneLoss):
 *    - Если передано соотношение BL/Age (<= 2.0):
 *        Низкий: < 0.5; Умеренный: 0.5 - 1.0; Высокий: > 1.0
 *    - Если передан процент резорбции (> 2.0):
 *        Низкий: < 25%; Умеренный: 25% - 50%; Высокий: > 50%
 *
 * Если хотя бы один из ключевых факторов находится в красной зоне (>= 30% BoP, >= 9 карманов, BL/Age > 1.0) —
 * пациент относится к категории высокого риска.
 */
export function evaluatePeriodontalRisk(
	bop: number,
	deepPockets: number,
	boneLoss: number,
): "low" | "moderate" | "high" {
	const isBopHigh = bop >= 30;
	const isPocketsHigh = deepPockets >= 9;
	const isBoneLossHigh = boneLoss <= 2 ? boneLoss > 1.0 : boneLoss > 50;

	if (isBopHigh || isPocketsHigh || isBoneLossHigh) {
		return "high";
	}

	const isBopMod = bop >= 15;
	const isPocketsMod = deepPockets >= 4;
	const isBoneLossMod = boneLoss <= 2 ? boneLoss >= 0.5 : boneLoss >= 25;

	if (isBopMod || isPocketsMod || isBoneLossMod) {
		return "moderate";
	}

	return "low";
}

/**
 * Сводный расчёт пародонтальных индексов SEPA из списка зубов (аналог compute_indices в dentalpin).
 */
export function computeSepaIndices(teeth: PeriodontalToothRecord[]): {
	bop_pct: number;
	pi_pct: number;
	cal_mean_mm: number;
	deep_pockets_count: number;
	total_sites: number;
	present_teeth_count: number;
	risk_level: "low" | "moderate" | "high";
} {
	const presentTeeth = teeth.filter(isToothPresent);
	const presentTeethCount = presentTeeth.length;
	const sites = presentTeeth.flatMap(getToothSites);
	const totalSites = SITES_PER_TOOTH * presentTeethCount;

	const bop_pct = calculateBopPercentage(sites, presentTeethCount);
	const pi_pct = calculatePlaquePercentage(sites, presentTeethCount);
	const cal_mean_mm = calculateMeanCal(sites, presentTeethCount);
	const deep_pockets_count = calculateDeepPocketsCount(teeth);
	const risk_level = evaluatePeriodontalRisk(bop_pct, deep_pockets_count, 0.4);

	return {
		bop_pct,
		pi_pct,
		cal_mean_mm,
		deep_pockets_count,
		total_sites: totalSites,
		present_teeth_count: presentTeethCount,
		risk_level,
	};
}

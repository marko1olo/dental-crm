import { standardRecommendedProcedures, standardRecommendedStages } from "./standardStagesAndProcedures.js";
import type { ComprehensivePlanVariant } from "./types.js";

export const standardRecommendedPreset: ComprehensivePlanVariant = {
	tierCode: "standard_recommended",
	title: "Стандартный / Рекомендуемый",
	badgeText: "Оптимальный баланс цены и качества",
	badgeType: "success",
	isRecommended: true,
	headlineDescription:
		"Самый популярный и клинически сбалансированный план. Надежные имплантаты Osstem TS III (Южная Корея), " +
		"циркониевые коронки на индивидуальных титановых абатментах и высокоэстетичные пломбы Estelite.",
	implantSystem: "Osstem TS III / Dentium SuperLine (Южная Корея)",
	crownMaterial: "Диоксид циркония ZrO₂ на индивидуальном титановом абатменте",
	aestheticMaterial: "Светоотверждаемый нанокомпозит Estelite Asteria / Tokuyama",
	warrantyYears: 3,
	estimatedServiceLifeYears: 15,
	aestheticScore: 8.5,
	biologicalInvasivenessScore: 2,
	totalCostRub: 340000,
	totalVisitsCount: 6,
	totalDurationWeeks: 14,
	isCode02HighCostSurgery: true,
	keyAdvantages: [
		"Идеальное соотношение проверенной надежности и разумной стоимости",
		"Приживаемость имплантатов Osstem свыше 98.8%",
		"Индивидуальные титановые абатменты с анатомическим формированием десневого края",
		"Прочные циркониевые коронки без сколов керамики",
		"Возможность беспроцентной рассрочки клиники",
	],
	clinicalLimitations: [
		"Меньший гарантийный срок по сравнению со Straumann (3 года против 10 лет)",
		"Композитные реставрации требуют полировки раз в 6 месяцев",
	],
	stages: standardRecommendedStages,
	procedures: standardRecommendedProcedures,
};

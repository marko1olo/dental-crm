import { optimumVipProcedures, optimumVipStages } from "./optimumStagesAndProcedures.js";
import type { ComprehensivePlanVariant } from "./types.js";

export const optimumVipPreset: ComprehensivePlanVariant = {
	tierCode: "optimum_vip",
	title: "Премиум (Комплексный)",
	badgeText: "Максимальная эстетика и долговечность",
	badgeType: "primary",
	isRecommended: false,
	headlineDescription:
		"Эстетическая реабилитация, виниры E.max, имплантация Straumann/Nobel, каппы элайнеров. " +
		"Бескомпромиссная тотальная реабилитация с пожизненной гарантией.",
	implantSystem: "Straumann BLX SLActive / Nobel Biocare Active (Швейцария / Швеция)",
	crownMaterial: "Керамические виниры IPS e.max CAD и цельный диоксид циркония Katana ML",
	aestheticMaterial: "Ультратонкие керамические виниры IPS e.max и каппы элайнеров",
	warrantyYears: 10,
	estimatedServiceLifeYears: 25,
	aestheticScore: 10,
	biologicalInvasivenessScore: 3,
	totalCostRub: 580000,
	totalVisitsCount: 8,
	totalDurationWeeks: 16,
	isCode02HighCostSurgery: true,
	keyAdvantages: [
		"Пожизненная международная гарантия производителя на имплантаты Straumann",
		"Безупречная естественная флюоресценция и микротекстура виниров E.max",
		"Винтовая фиксация коронок на Multi-unit (без цемента под десной — 0% мукозита)",
		"Направленная костная регенерация (НКР) с мембраной Bio-Gide и костью Bio-Oss",
		"Фрезерованные провизорные коронки PMMA на весь период приживления",
	],
	clinicalLimitations: [
		"Высокая начальная стоимость инвестиций в здоровье улыбки",
		"Необходимость строгого 3-4 месячного графика профосмотров",
	],
	stages: optimumVipStages,
	procedures: optimumVipProcedures,
};

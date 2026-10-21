import { optimumVipProcedures, optimumVipStages } from "./optimumStagesAndProcedures.js";
import type { ComprehensivePlanVariant } from "./types.js";

export const optimumVipPreset: ComprehensivePlanVariant = {
	tierCode: "optimum_vip",
	title: "Оптимальный / Премиум (VIP)",
	badgeText: "Максимальная эстетика и долговечность",
	badgeType: "primary",
	isRecommended: false,
	headlineDescription:
		"Бескомпромиссная тотальная реабилитация на премиальных швейцарских имплантатах Straumann BLX с пожизненной гарантией, " +
		"цельноциркониевыми мостами Prettau Multi-layer и керамическими винирами E.max на фронтальную группу.",
	implantSystem: "Straumann BLX / Nobel Biocare Active (Швейцария/Швеция)",
	crownMaterial: "Цельный диоксид циркония Katana ML / Prettau Multi-unit",
	aestheticMaterial: "Ультратонкие полевошпатные виниры / IPS e.max CAD",
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

import type { StandardZtlPreset } from "./ztlPresetTypes.js";

export type { StandardZtlPreset };

export const STANDARD_ZTL_ORDER_PRESETS: readonly StandardZtlPreset[] = [
	{
		id: "zirconia", name: "Диоксид циркония", material: "ZrO2 Multi-Layer",
		constructionType: "single_crown", badge: "ZrO2",
		description: "Монолитный диоксид циркония многослойной градиентной прозрачности",
		warrantyMonths: 60, warrantyLabelRu: "5 лет",
		pricePatientRub: 24000, costZtlRub: 7500, amountKopecks: 750000, costMaterialsRub: 1200,
		turnaroundBusinessDays: 5, fixationType: "cement", hasAntagonists: true,
	},
	{
		id: "emax", name: "IPS e.max", material: "IPS e.max Press",
		constructionType: "single_crown", badge: "e.max Press",
		description: "Прессованная дисиликатная стеклокерамика высокой эстетики",
		warrantyMonths: 36, warrantyLabelRu: "3 года",
		pricePatientRub: 26000, costZtlRub: 8500, amountKopecks: 850000, costMaterialsRub: 1300,
		turnaroundBusinessDays: 5, fixationType: "cement", hasAntagonists: true,
	},
	{
		id: "bridge", name: "Мостовидный протез", material: "ZrO2 Bridge Multi-Layer",
		constructionType: "bridge", badge: "Мост ZrO2",
		description: "Мостовидный протез из диоксида циркония с промывным пространством",
		warrantyMonths: 60, warrantyLabelRu: "5 лет",
		pricePatientRub: 48000, costZtlRub: 15000, amountKopecks: 1500000, costMaterialsRub: 2200,
		turnaroundBusinessDays: 7, fixationType: "cement", hasAntagonists: true,
	},
	{
		id: "metal_ceramic", name: "Металлокерамика", material: "Металлокерамика Noritake",
		constructionType: "single_crown", badge: "МК Noritake",
		description: "Классическая металлокерамика на CoCr каркасе",
		warrantyMonths: 24, warrantyLabelRu: "Гарантия 2 года",
		pricePatientRub: 15000, costZtlRub: 5000, amountKopecks: 500000, costMaterialsRub: 1100,
		turnaroundBusinessDays: 7, fixationType: "cement", hasAntagonists: true,
	},
	{
		id: "pmma_temp", name: "Временная PMMA", material: "PMMA CAD/CAM",
		constructionType: "temporary_crown", badge: "PMMA фрез.",
		description: "Фрезерованная провизорная коронка на период интеграции и моделирования десны",
		warrantyMonths: 6, warrantyLabelRu: "6 месяцев (провизорная)",
		pricePatientRub: 5000, costZtlRub: 1500, amountKopecks: 150000, costMaterialsRub: 600,
		turnaroundBusinessDays: 2, fixationType: "cement", hasAntagonists: true,
	},
	{
		id: "clasp_denture", name: "Бюгельный протез", material: "Бюгель на кламмерах / замках (CoCr)",
		constructionType: "clasp_denture", badge: "Бюгель CoCr",
		description: "Дуговой съемный протез с опорно-удерживающими кламмерами или замками",
		warrantyMonths: 24, warrantyLabelRu: "Гарантия 2 года",
		pricePatientRub: 45000, costZtlRub: 16000, amountKopecks: 1600000, costMaterialsRub: 2500,
		turnaroundBusinessDays: 10, fixationType: "clasp", hasAntagonists: true,
	},
	{
		id: "all_on_4", name: "All-on-4 (Винтовая)", material: "Балочный титан + диоксид циркония / композит",
		constructionType: "all_on_4", badge: "All-on-4",
		description: "Несъемная конструкция на 4 имплантатах с винтовой фиксацией на мультиюнитах",
		warrantyMonths: 120, warrantyLabelRu: "Гарантия 10 лет",
		pricePatientRub: 180000, costZtlRub: 55000, amountKopecks: 5500000, costMaterialsRub: 8500,
		turnaroundBusinessDays: 14, fixationType: "screw", hasAntagonists: true,
	},
] as const;

/**
 * orthopedicsPresets.ts — Канонические стандарты ЗТЛ, границы препарирования и шкалы VITA.
 *
 * Mandate 8b: Модульная декомпозиция компонентов ортопедии (все файлы <= 800 строк).
 * Mandate 8e: Практичный выбор врача без блокирующих диалогов.
 */

export interface StandardZtlPreset {
	readonly id: string;
	readonly name: string;
	readonly material: string;
	readonly constructionType: string;
	readonly badge: string;
	readonly description: string;
	readonly warrantyMonths: number;
	readonly warrantyLabelRu: string;
	readonly pricePatientRub: number;
	readonly costZtlRub: number;
	readonly costMaterialsRub: number;
	readonly turnaroundBusinessDays: number;
	readonly fixationType?: "cement" | "screw" | "clasp" | undefined;
	readonly hasAntagonists?: boolean | undefined;
}

export const STANDARD_ZTL_ORDER_PRESETS: readonly StandardZtlPreset[] = [
	{
		id: "zirconia",
		name: "Диоксид циркония",
		material: "ZrO2 Multi-Layer",
		constructionType: "single_crown",
		badge: "ZrO2",
		description: "Монолитный диоксид циркония многослойной градиентной прозрачности",
		warrantyMonths: 60,
		warrantyLabelRu: "5 лет",
		pricePatientRub: 24000,
		costZtlRub: 7500,
		costMaterialsRub: 1200,
		turnaroundBusinessDays: 5,
		fixationType: "cement",
		hasAntagonists: true,
	},
	{
		id: "emax",
		name: "IPS e.max",
		material: "IPS e.max Press",
		constructionType: "single_crown",
		badge: "e.max Press",
		description: "Прессованная дисиликатная стеклокерамика высокой эстетики",
		warrantyMonths: 36,
		warrantyLabelRu: "3 года",
		pricePatientRub: 26000,
		costZtlRub: 8500,
		costMaterialsRub: 1300,
		turnaroundBusinessDays: 5,
		fixationType: "cement",
		hasAntagonists: true,
	},
	{
		id: "bridge",
		name: "Мостовидный протез",
		material: "ZrO2 Bridge Multi-Layer",
		constructionType: "bridge",
		badge: "Мост ZrO2",
		description: "Мостовидный протез из диоксида циркония с промежуточной частью и промывным пространством",
		warrantyMonths: 60,
		warrantyLabelRu: "5 лет",
		pricePatientRub: 48000,
		costZtlRub: 15000,
		costMaterialsRub: 2200,
		turnaroundBusinessDays: 7,
		fixationType: "cement",
		hasAntagonists: true,
	},
	{
		id: "metal_ceramic",
		name: "Металлокерамика",
		material: "Металлокерамика Noritake",
		constructionType: "single_crown",
		badge: "МК Noritake",
		description: "Классическая металлокерамика на CoCr каркасе",
		warrantyMonths: 24,
		warrantyLabelRu: "Гарантия 2 года",
		pricePatientRub: 15000,
		costZtlRub: 5000,
		costMaterialsRub: 1100,
		turnaroundBusinessDays: 7,
		fixationType: "cement",
		hasAntagonists: true,
	},
	{
		id: "pmma_temp",
		name: "Временная PMMA",
		material: "PMMA CAD/CAM",
		constructionType: "temporary_crown",
		badge: "PMMA фрез.",
		description: "Фрезерованная провизорная коронка на период интеграции и моделирования десны",
		warrantyMonths: 6,
		warrantyLabelRu: "6 месяцев (провизорная)",
		pricePatientRub: 5000,
		costZtlRub: 1500,
		costMaterialsRub: 600,
		turnaroundBusinessDays: 2,
		fixationType: "cement",
		hasAntagonists: true,
	},
	{
		id: "clasp_denture",
		name: "Бюгельный протез",
		material: "Бюгель на кламмерах / замках (CoCr)",
		constructionType: "clasp_denture",
		badge: "Бюгель CoCr",
		description: "Дуговой съемный протез с опорно-удерживающими кламмерами или замками",
		warrantyMonths: 24,
		warrantyLabelRu: "Гарантия 2 года",
		pricePatientRub: 45000,
		costZtlRub: 16000,
		costMaterialsRub: 2500,
		turnaroundBusinessDays: 10,
		fixationType: "clasp",
		hasAntagonists: true,
	},
	{
		id: "all_on_4",
		name: "All-on-4 (Винтовая)",
		material: "Балочный титан + диоксид циркония / композит",
		constructionType: "all_on_4",
		badge: "All-on-4",
		description: "Несъемная конструкция на 4 имплантатах с винтовой фиксацией на мультиюнитах",
		warrantyMonths: 120,
		warrantyLabelRu: "Гарантия 10 лет",
		pricePatientRub: 180000,
		costZtlRub: 55000,
		costMaterialsRub: 8500,
		turnaroundBusinessDays: 14,
		fixationType: "screw",
		hasAntagonists: true,
	},
] as const;

export interface FixationTypePreset {
	readonly id: "cement" | "screw" | "clasp";
	readonly labelRu: string;
	readonly shortBadge: string;
	readonly description: string;
}

export const FIXATION_TYPE_PRESETS: readonly FixationTypePreset[] = [
	{
		id: "cement",
		labelRu: "Цементная фиксация (Fuji Plus / RelyX U200)",
		shortBadge: "Цемент",
		description: "Фиксация на стеклоиономерный цемент Fuji Plus или композитный цемент двойного отверждения RelyX",
	},
	{
		id: "screw",
		labelRu: "Винтовая фиксация (Multi-Unit 15–35 Н·см)",
		shortBadge: "Винтовая",
		description: "Прямая винтовая фиксация к мультиюнитам или абатментам с контролем динамометрическим ключом",
	},
	{
		id: "clasp",
		labelRu: "Кламмерная / Замковая фиксация (Bredent / МК-1)",
		shortBadge: "Замки/Кламмеры",
		description: "Опорно-удерживающие кламмеры или прецизионные микрозамковые крепления",
	},
] as const;

export interface StumpShadeOption {
	readonly code: string;
	readonly labelRu: string;
	readonly colorHex: string;
}

export const STUMP_SHADE_PRESETS: readonly StumpShadeOption[] = [
	{ code: "ND1", labelRu: "ND1 (Светлая культя)", colorHex: "#f7eee3" },
	{ code: "ND2", labelRu: "ND2 (Естественный дентин)", colorHex: "#eddcc8" },
	{ code: "ND3", labelRu: "ND3 (Интенсивный дентин)", colorHex: "#e3cbaf" },
	{ code: "ND4", labelRu: "ND4 (Сероватый дентин)", colorHex: "#d8be9f" },
	{ code: "ND5", labelRu: "ND5 (Темный дентин)", colorHex: "#c9ac8c" },
	{ code: "ND6", labelRu: "ND6 (Коричневый оттенок)", colorHex: "#b89772" },
	{ code: "ND7", labelRu: "ND7 (Выраженный дисколорит)", colorHex: "#a6835d" },
	{ code: "ND8", labelRu: "ND8 (Тетрациклиновый дисколорит)", colorHex: "#916f4b" },
	{ code: "ND9", labelRu: "ND9 (Металлическая культя/вкладка)", colorHex: "#7d7f83" },
];

export interface PreparationMarginPreset {
	readonly id: string;
	readonly labelRu: string;
	readonly shortBadge: string;
	readonly description: string;
}

export const PREPARATION_MARGIN_PRESETS: readonly PreparationMarginPreset[] = [
	{
		id: "chamfer",
		labelRu: "Желобоватый уступ (Chamfer)",
		shortBadge: "Chamfer 0.8мм",
		description: "Круговой желоб со скругленным внутренним углом — оптимально для ZrO2 и e.max",
	},
	{
		id: "shoulder_90",
		labelRu: "Круговой уступ 90° (Shoulder)",
		shortBadge: "Shoulder 1.0мм",
		description: "Прямой уступ 90 градусов с прямым плечом для цельнокерамических коронок",
	},
	{
		id: "knife_edge",
		labelRu: "Ножевидный край (Knife Edge)",
		shortBadge: "Без уступа / Тангенс",
		description: "Тангенциальное препарирование со сходом на нет без выраженного плеча",
	},
	{
		id: "shoulder_bevel",
		labelRu: "Уступ со скосом (Shoulder Bevel)",
		shortBadge: "Уступ со скосом 135°",
		description: "Прямой уступ с придесневым скосом под металлическую гирлянду МК",
	},
] as const;

export const VITA_3D_MASTER_SHADE_GROUPS = [
	{
		group: "0M (Bleach)",
		labelRu: "0M Bleach",
		shades: ["0M1", "0M2", "0M3"] as const,
	},
	{
		group: "1M",
		labelRu: "Группа 1M",
		shades: ["1M1", "1M2"] as const,
	},
	{
		group: "2M / 2L / 2R",
		labelRu: "Группа 2",
		shades: ["2L1.5", "2M1", "2M2", "2M3", "2R1.5"] as const,
	},
	{
		group: "3M / 3L / 3R",
		labelRu: "Группа 3",
		shades: ["3L1.5", "3M1", "3M2", "3M3", "3R1.5"] as const,
	},
	{
		group: "4M / 4L",
		labelRu: "Группа 4",
		shades: ["4L1.5", "4M1", "4M2", "4M3"] as const,
	},
	{
		group: "5M",
		labelRu: "Группа 5",
		shades: ["5M1", "5M2"] as const,
	},
] as const;

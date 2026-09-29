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
	},
	{
		id: "metal_ceramic",
		name: "Металлокерамика",
		material: "Металлокерамика Noritake",
		constructionType: "single_crown",
		badge: "МК Noritake",
		description: "Классическая металлокерамика на CoCr каркасе",
		warrantyMonths: 24,
		warrantyLabelRu: "2 года (ГОСТ Р 51087-97)",
	},
	{
		id: "pmma_temp",
		name: "Временная коронка PMMA",
		material: "PMMA CAD/CAM",
		constructionType: "temporary_crown",
		badge: "PMMA фрез.",
		description: "Фрезерованная провизорная коронка на период интеграции и моделирования десны",
		warrantyMonths: 6,
		warrantyLabelRu: "6 месяцев (провизорная)",
	},
	{
		id: "clasp_denture",
		name: "Бюгельный протез",
		material: "Бюгель на кламмерах / замках (CoCr)",
		constructionType: "clasp_denture",
		badge: "Бюгель CoCr",
		description: "Дуговой съемный протез с опорно-удерживающими кламмерами или замками",
		warrantyMonths: 24,
		warrantyLabelRu: "2 года (ГОСТ Р 51087-97)",
	},
] as const;

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

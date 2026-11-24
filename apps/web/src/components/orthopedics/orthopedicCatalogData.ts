/**
 * orthopedicCatalogData.ts — Единый канонический SSOT каталог ортопедии и протезирования.
 * Слияние пресетов фиксации, уступов препарирования, оттенков культи (ND1–ND9), шкал VITA и нарядов ЗТЛ.
 * Соответствие: Мандат 8b (Sweet Spot 280–350 строк), Мандаты 8e, 8n, 8x, 8ap.
 * Исключены любые крякозябры (mojibake) — 100% чистый UTF-8.
 */

import {
	DENTAL_LAB_CONSTRUCTIONS,
	formatKopecksToRub,
	kopecksToRubles,
	rublesToKopecks,
	VITA_CLASSICAL_PLUS_BLEACH_PALETTE,
} from "@dental/shared";
import { VITA_3D_MASTER_GROUPS } from "../lab/shades/vita3dMasterGroups";

export { VITA_3D_MASTER_GROUPS };

export type FixationTypeId = "cement" | "screw" | "clasp";

export interface FixationTypePreset {
	readonly id: FixationTypeId;
	readonly labelRu: string;
	readonly titleRu: string;
	readonly sublabelRu: string;
	readonly shortBadge: string;
	readonly description: string;
}

export type PreparationMarginId = "chamfer" | "shoulder_90" | "knife_edge" | "shoulder_bevel";

export interface PreparationMarginPreset {
	readonly id: PreparationMarginId | string;
	readonly labelRu: string;
	readonly shortBadge: string;
	readonly description: string;
}

export type StumpShadeCode = "ND1" | "ND2" | "ND3" | "ND4" | "ND5" | "ND6" | "ND7" | "ND8" | "ND9";

export interface StumpShadeOption {
	readonly code: StumpShadeCode | string;
	readonly labelRu: string;
	readonly colorHex: string;
}

export type VitaClassicShade =
	| "A1" | "A2" | "A3" | "A3.5" | "A4"
	| "B1" | "B2" | "B3" | "B4"
	| "C1" | "C2" | "C3" | "C4"
	| "D2" | "D3" | "D4"
	| "BL1" | "BL2" | "BL3" | "BL4";

export interface VitaShadeItem {
	readonly code: VitaClassicShade;
	readonly colorHex: string;
	readonly family: "A" | "B" | "C" | "D" | "Bleach";
}

export interface Vita3dShadeGroup {
	readonly group: string;
	readonly labelRu: string;
	readonly shades: readonly string[];
}

export type OrthopedicConstructionKind =
	| "single_crown"
	| "veneer"
	| "inlay_onlay"
	| "bridge"
	| "temporary_crown"
	| "clasp_denture"
	| "all_on_4";

export interface StandardZtlPreset {
	readonly id: string;
	readonly name: string;
	readonly material: string;
	readonly constructionType: OrthopedicConstructionKind;
	readonly badge: string;
	readonly description: string;
	readonly warrantyMonths: number;
	readonly warrantyLabelRu: string;
	readonly pricePatientRub: number;
	readonly pricePatientKopecks: number | bigint;
	readonly costZtlRub: number;
	readonly amountKopecks: number | bigint;
	readonly costMaterialsRub: number;
	readonly turnaroundBusinessDays: number;
	readonly fixationType: FixationTypeId;
	readonly hasAntagonists: boolean;
}


export interface OrthopedicEconomicsCalculation {
	readonly unitsCount: number;
	readonly grossPriceRub: number;
	readonly grossPriceKopecks: bigint;
	readonly ztlCostRub: number;
	readonly ztlCostKopecks: bigint;
	readonly materialsCostRub: number;
	readonly netMarginRub: number;
	readonly netMarginKopecks: bigint;
	readonly marginPercent: number;
}

// ============================================================================
// 2. БАЗОВЫЕ ПРЕСЕТЫ И СПРАВОЧНИКИ
// ============================================================================

export const FIXATION_TYPE_PRESETS: readonly FixationTypePreset[] = [
	{
		id: "cement",
		labelRu: "Цементная",
		titleRu: "Цементная",
		sublabelRu: "СИЦ / композитный цемент",
		shortBadge: "Цемент",
		description: "Фиксация на стеклоиономерный модифицированный цемент (СИЦ) или самоадгезивный композитный цемент",
	},
	{
		id: "screw",
		labelRu: "Винтовая",
		titleRu: "Винтовая",
		sublabelRu: "Multi-Unit 15–35 Н·см",
		shortBadge: "Винтовая",
		description: "Прямая винтовая фиксация к мультиюнитам или абатментам с контролем ключом",
	},
	{
		id: "clasp",
		labelRu: "Кламмерная / Замковая",
		titleRu: "Кламмерная / Замковая",
		sublabelRu: "Опорно-удерживающие замки / микрозамки",
		shortBadge: "Замки/Кламмеры",
		description: "Опорно-удерживающие кламмеры или прецизионные микрозамковые крепления",
	},
] as const;

export const PREPARATION_MARGIN_PRESETS: readonly PreparationMarginPreset[] = [
	{
		id: "chamfer",
		labelRu: "Желобоватый уступ (Chamfer)",
		shortBadge: "Chamfer 0.8мм",
		description: "Круговой желоб со скругленным углом — оптимально для оксида циркония и дисиликата лития",
	},
	{
		id: "shoulder_90",
		labelRu: "Круговой уступ 90° (Shoulder)",
		shortBadge: "Shoulder 1.0мм",
		description: "Прямой уступ 90 градусов для цельнокерамических коронок",
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
] as const;

export const VITA_CLASSIC_SHADES: readonly VitaShadeItem[] = VITA_CLASSICAL_PLUS_BLEACH_PALETTE.map((item) => ({
	code: item.code as VitaClassicShade,
	colorHex: item.hex,
	family: (item.group === "BL" ? "Bleach" : item.group) as "A" | "B" | "C" | "D" | "Bleach",
}));

export const VITA_3D_MASTER_SHADE_GROUPS: readonly Vita3dShadeGroup[] = [
	{ group: "0M (Bleach)", labelRu: "0M Bleach", shades: ["0M1", "0M2", "0M3"] },
	...VITA_3D_MASTER_GROUPS.map((g) => ({
		group: g.name,
		labelRu: `${g.name} (${g.descRu})`,
		shades: g.shades,
	})),
] as const;

export const STANDARD_ZTL_ORDER_PRESETS: readonly StandardZtlPreset[] = [
	{
		id: "zirconia", name: "Диоксид циркония", material: "Диоксид циркония Multi-Layer (градиентный)",
		constructionType: "single_crown", badge: "ZrO2 Multi",
		description: "Монолитный диоксид циркония многослойной градиентной прозрачности",
		warrantyMonths: 60, warrantyLabelRu: "5 лет",
		pricePatientKopecks: DENTAL_LAB_CONSTRUCTIONS.crown_zirconia.defaultPatientPriceKopecks,
		pricePatientRub: kopecksToRubles(DENTAL_LAB_CONSTRUCTIONS.crown_zirconia.defaultPatientPriceKopecks),
		costZtlRub: kopecksToRubles(DENTAL_LAB_CONSTRUCTIONS.crown_zirconia.defaultZtlCostKopecks),
		amountKopecks: DENTAL_LAB_CONSTRUCTIONS.crown_zirconia.defaultZtlCostKopecks,
		costMaterialsRub: 1200,
		turnaroundBusinessDays: DENTAL_LAB_CONSTRUCTIONS.crown_zirconia.standardTurnaroundDays,
		fixationType: "cement", hasAntagonists: true,
	},
	{
		id: "emax", name: "Прессованная стеклокерамика", material: "Дисиликат лития (пресс-керамика)",
		constructionType: "single_crown", badge: "Пресс-керамика",
		description: "Прессованная дисиликатная стеклокерамика высокой эстетики для фронта",
		warrantyMonths: 36, warrantyLabelRu: "3 года",
		pricePatientKopecks: DENTAL_LAB_CONSTRUCTIONS.crown_emax.defaultPatientPriceKopecks,
		pricePatientRub: kopecksToRubles(DENTAL_LAB_CONSTRUCTIONS.crown_emax.defaultPatientPriceKopecks),
		costZtlRub: kopecksToRubles(DENTAL_LAB_CONSTRUCTIONS.crown_emax.defaultZtlCostKopecks),
		amountKopecks: DENTAL_LAB_CONSTRUCTIONS.crown_emax.defaultZtlCostKopecks,
		costMaterialsRub: 1300,
		turnaroundBusinessDays: DENTAL_LAB_CONSTRUCTIONS.crown_emax.standardTurnaroundDays,
		fixationType: "cement", hasAntagonists: true,
	},
	{
		id: "veneer_emax", name: "Керамический винир", material: "Полевошпатная керамика / дисиликат лития",
		constructionType: "veneer", badge: "Винир керамика",
		description: "Микропротезирование зоны улыбки с минимальным препарированием эмали",
		warrantyMonths: 36, warrantyLabelRu: "3 года",
		pricePatientKopecks: DENTAL_LAB_CONSTRUCTIONS.crown_emax.defaultPatientPriceKopecks + 200000,
		pricePatientRub: kopecksToRubles(DENTAL_LAB_CONSTRUCTIONS.crown_emax.defaultPatientPriceKopecks + 200000),
		costZtlRub: kopecksToRubles(DENTAL_LAB_CONSTRUCTIONS.crown_emax.defaultZtlCostKopecks + 50000),
		amountKopecks: DENTAL_LAB_CONSTRUCTIONS.crown_emax.defaultZtlCostKopecks + 50000,
		costMaterialsRub: 1500,
		turnaroundBusinessDays: 6, fixationType: "cement", hasAntagonists: true,
	},
	{
		id: "bridge", name: "Мостовидный протез ZrO2", material: "ZrO2 Bridge Multi-Layer",
		constructionType: "bridge", badge: "Мост ZrO2",
		description: "Мостовидный протез из диоксида циркония с промывным седловидным пространством",
		warrantyMonths: 60, warrantyLabelRu: "5 лет",
		pricePatientKopecks: DENTAL_LAB_CONSTRUCTIONS.crown_zirconia.defaultPatientPriceKopecks * 2,
		pricePatientRub: kopecksToRubles(DENTAL_LAB_CONSTRUCTIONS.crown_zirconia.defaultPatientPriceKopecks * 2),
		costZtlRub: kopecksToRubles(DENTAL_LAB_CONSTRUCTIONS.crown_zirconia.defaultZtlCostKopecks * 2),
		amountKopecks: DENTAL_LAB_CONSTRUCTIONS.crown_zirconia.defaultZtlCostKopecks * 2,
		costMaterialsRub: 2200,
		turnaroundBusinessDays: 7, fixationType: "cement", hasAntagonists: true,
	},
	{
		id: "metal_ceramic", name: "Металлокерамика", material: "Металлокерамика Co-Cr (КХС)",
		constructionType: "single_crown", badge: "МК Co-Cr",
		description: "Классическая металлокерамика на биосовместимом CoCr каркасе",
		warrantyMonths: 24, warrantyLabelRu: "2 года",
		pricePatientKopecks: DENTAL_LAB_CONSTRUCTIONS.metal_ceramic.defaultPatientPriceKopecks,
		pricePatientRub: kopecksToRubles(DENTAL_LAB_CONSTRUCTIONS.metal_ceramic.defaultPatientPriceKopecks),
		costZtlRub: kopecksToRubles(DENTAL_LAB_CONSTRUCTIONS.metal_ceramic.defaultZtlCostKopecks),
		amountKopecks: DENTAL_LAB_CONSTRUCTIONS.metal_ceramic.defaultZtlCostKopecks,
		costMaterialsRub: 1100,
		turnaroundBusinessDays: DENTAL_LAB_CONSTRUCTIONS.metal_ceramic.standardTurnaroundDays,
		fixationType: "cement", hasAntagonists: true,
	},
	{
		id: "pmma_temp", name: "Временная коронка PMMA", material: "PMMA CAD/CAM",
		constructionType: "temporary_crown", badge: "PMMA фрез.",
		description: "Фрезерованная провизорная коронка на период интеграции и моделирования десны",
		warrantyMonths: 6, warrantyLabelRu: "6 месяцев (провизорная)",
		pricePatientKopecks: 500000, pricePatientRub: 5000, costZtlRub: 1500, amountKopecks: 150000, costMaterialsRub: 600,
		turnaroundBusinessDays: 2, fixationType: "cement", hasAntagonists: true,
	},
	{
		id: "clasp_denture", name: "Бюгельный протез", material: "Бюгель на кламмерах / замках (CoCr)",
		constructionType: "clasp_denture", badge: "Бюгель CoCr",
		description: "Дуговой съемный протез с опорно-удерживающими кламмерами или замками",
		warrantyMonths: 24, warrantyLabelRu: "2 года",
		pricePatientKopecks: DENTAL_LAB_CONSTRUCTIONS.clasp_denture.defaultPatientPriceKopecks,
		pricePatientRub: kopecksToRubles(DENTAL_LAB_CONSTRUCTIONS.clasp_denture.defaultPatientPriceKopecks),
		costZtlRub: kopecksToRubles(DENTAL_LAB_CONSTRUCTIONS.clasp_denture.defaultZtlCostKopecks),
		amountKopecks: DENTAL_LAB_CONSTRUCTIONS.clasp_denture.defaultZtlCostKopecks,
		costMaterialsRub: 2500,
		turnaroundBusinessDays: DENTAL_LAB_CONSTRUCTIONS.clasp_denture.standardTurnaroundDays,
		fixationType: "clasp", hasAntagonists: true,
	},
	{
		id: "all_on_4", name: "All-on-4 (Винтовая)", material: "Балочный титан + диоксид циркония / композит",
		constructionType: "all_on_4", badge: "All-on-4",
		description: "Несъемная конструкция на 4 имплантатах с винтовой фиксацией на мультиюнитах",
		warrantyMonths: 120, warrantyLabelRu: "10 лет",
		pricePatientKopecks: 18000000, pricePatientRub: 180000, costZtlRub: 55000, amountKopecks: 5500000, costMaterialsRub: 8500,
		turnaroundBusinessDays: 14, fixationType: "screw", hasAntagonists: true,
	},
] as const;

// ============================================================================
// 3. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ И РАСЧЕТЫ
// ============================================================================

export function getZtlPresetById(id: string): StandardZtlPreset | undefined {
	return STANDARD_ZTL_ORDER_PRESETS.find((p) => p.id === id);
}

export function calculateOrthopedicEconomics(presetId: string, count: number = 1): OrthopedicEconomicsCalculation {
	const safeCount = Math.max(1, count);
	const fallbackPreset = STANDARD_ZTL_ORDER_PRESETS[0] ?? {
		id: "zirconia",
		name: "Коронка диоксид циркония",
		pricePatientKopecks: DENTAL_LAB_CONSTRUCTIONS.crown_zirconia.defaultPatientPriceKopecks,
		pricePatientRub: kopecksToRubles(DENTAL_LAB_CONSTRUCTIONS.crown_zirconia.defaultPatientPriceKopecks),
		costZtlRub: kopecksToRubles(DENTAL_LAB_CONSTRUCTIONS.crown_zirconia.defaultZtlCostKopecks),
		amountKopecks: DENTAL_LAB_CONSTRUCTIONS.crown_zirconia.defaultZtlCostKopecks,
		costMaterialsRub: 1200,
	};
	const preset = getZtlPresetById(presetId) ?? fallbackPreset;
	const unitPriceKopecks = BigInt(preset.pricePatientKopecks ?? rublesToKopecks(preset.pricePatientRub));
	const unitZtlCostKopecks = BigInt(preset.amountKopecks ?? rublesToKopecks(preset.costZtlRub));
	const unitMaterialsKopecks = BigInt(rublesToKopecks(preset.costMaterialsRub));

	const grossPriceKopecks = unitPriceKopecks * BigInt(safeCount);
	const ztlCostKopecks = unitZtlCostKopecks * BigInt(safeCount);
	const materialsCostKopecks = unitMaterialsKopecks * BigInt(safeCount);
	const netMarginKopecks = grossPriceKopecks > (ztlCostKopecks + materialsCostKopecks)
		? grossPriceKopecks - (ztlCostKopecks + materialsCostKopecks)
		: 0n;

	const grossPriceRub = kopecksToRubles(grossPriceKopecks);
	const ztlCostRub = kopecksToRubles(ztlCostKopecks);
	const materialsCostRub = kopecksToRubles(materialsCostKopecks);
	const netMarginRub = kopecksToRubles(netMarginKopecks);
	const marginPercent = grossPriceKopecks > 0n
		? Math.round(Number((netMarginKopecks * 100n) / grossPriceKopecks))
		: 0;

	return {
		unitsCount: safeCount,
		grossPriceRub,
		grossPriceKopecks,
		ztlCostRub,
		ztlCostKopecks,
		materialsCostRub,
		netMarginRub,
		netMarginKopecks,
		marginPercent,
	};
}

export function generateWarrantyPassportNumber(orderNumber: string): string {
	const clean = (orderNumber || "").trim().replace(/^ГП-/, "");
	return clean ? `ГП-${clean}` : "";
}

export function formatToothFormulaDisplay(toothFdi: string | number): string {
	const raw = String(toothFdi || "").trim();
	return raw || "";
}

export function validateOrthopedicTooth(toothFdi: string | number): boolean {
	const num = typeof toothFdi === "number" ? toothFdi : parseInt(String(toothFdi).trim(), 10);
	if (Number.isNaN(num)) return false;
	const quadrant = Math.floor(num / 10);
	const toothPos = num % 10;
	// Постоянный прикус (11–48)
	if (quadrant >= 1 && quadrant <= 4 && toothPos >= 1 && toothPos <= 8) return true;
	// Молочный прикус (51–85) для детских ортопедических коронок и удерживателей пространства
	if (quadrant >= 5 && quadrant <= 8 && toothPos >= 1 && toothPos <= 5) return true;
	return false;
}

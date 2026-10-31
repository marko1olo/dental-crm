/**
 * orthopedicCatalogData.ts — Единый канонический SSOT каталог ортопедии и протезирования.
 * Слияние пресетов фиксации, уступов препарирования, оттенков культи (ND1–ND9), шкал VITA и нарядов ЗТЛ.
 * Соответствие: Мандат 8b (Sweet Spot 280–350 строк), Мандаты 8e, 8n, 8x, 8ap.
 * Исключены любые крякозябры (mojibake) — 100% чистый UTF-8.
 */

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
	readonly costZtlRub: number;
	readonly amountKopecks: number | bigint;
	readonly costMaterialsRub: number;
	readonly turnaroundBusinessDays: number;
	readonly fixationType: FixationTypeId;
	readonly hasAntagonists: boolean;
}

export type ManufacturingStageId = "impression" | "framework" | "try_in" | "ceramics" | "ready" | "fixed";

export interface ManufacturingStageInfo {
	readonly id: ManufacturingStageId;
	readonly stepNumber: number;
	readonly labelRu: string;
	readonly descriptionRu: string;
	readonly estimatedDays: number;
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
		sublabelRu: "Fuji Plus / RelyX U200",
		shortBadge: "Цемент",
		description: "Фиксация на стеклоиономерный цемент Fuji Plus или композитный цемент RelyX",
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
		sublabelRu: "Опорно-удерживающие замки / Bredent",
		shortBadge: "Замки/Кламмеры",
		description: "Опорно-удерживающие кламмеры или прецизионные микрозамковые крепления",
	},
] as const;

export const PREPARATION_MARGIN_PRESETS: readonly PreparationMarginPreset[] = [
	{
		id: "chamfer",
		labelRu: "Желобоватый уступ (Chamfer)",
		shortBadge: "Chamfer 0.8мм",
		description: "Круговой желоб со скругленным углом — оптимально для ZrO2 и e.max",
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

export const VITA_CLASSIC_SHADES: readonly VitaShadeItem[] = [
	{ code: "BL1", colorHex: "#ffffff", family: "Bleach" },
	{ code: "BL2", colorHex: "#fbf9f4", family: "Bleach" },
	{ code: "BL3", colorHex: "#f6f3eb", family: "Bleach" },
	{ code: "BL4", colorHex: "#f1ede2", family: "Bleach" },
	{ code: "A1", colorHex: "#f4ede1", family: "A" },
	{ code: "A2", colorHex: "#ece2d0", family: "A" },
	{ code: "A3", colorHex: "#e4d6bf", family: "A" },
	{ code: "A3.5", colorHex: "#d8c7ad", family: "A" },
	{ code: "A4", colorHex: "#c8b497", family: "A" },
	{ code: "B1", colorHex: "#f7f1e5", family: "B" },
	{ code: "B2", colorHex: "#efe6d4", family: "B" },
	{ code: "B3", colorHex: "#dfd3bc", family: "B" },
	{ code: "B4", colorHex: "#cec1a5", family: "B" },
	{ code: "C1", colorHex: "#ece7de", family: "C" },
	{ code: "C2", colorHex: "#dfd8cd", family: "C" },
	{ code: "C3", colorHex: "#d0c7ba", family: "C" },
	{ code: "C4", colorHex: "#b8ada0", family: "C" },
	{ code: "D2", colorHex: "#e8ded2", family: "D" },
	{ code: "D3", colorHex: "#d9cec1", family: "D" },
	{ code: "D4", colorHex: "#c7bbb0", family: "D" },
] as const;

export const VITA_3D_MASTER_SHADE_GROUPS: readonly Vita3dShadeGroup[] = [
	{ group: "0M (Bleach)", labelRu: "0M Bleach", shades: ["0M1", "0M2", "0M3"] },
	{ group: "1M", labelRu: "Группа 1M", shades: ["1M1", "1M2"] },
	{ group: "2M / 2L / 2R", labelRu: "Группа 2", shades: ["2L1.5", "2M1", "2M2", "2M3", "2R1.5"] },
	{ group: "3M / 3L / 3R", labelRu: "Группа 3", shades: ["3L1.5", "3M1", "3M2", "3M3", "3R1.5"] },
	{ group: "4M / 4L", labelRu: "Группа 4", shades: ["4L1.5", "4M1", "4M2", "4M3"] },
	{ group: "5M", labelRu: "Группа 5", shades: ["5M1", "5M2"] },
] as const;

export const STANDARD_ZTL_ORDER_PRESETS: readonly StandardZtlPreset[] = [
	{
		id: "zirconia", name: "Диоксид циркония", material: "ZrO2 Multi-Layer (Prettau)",
		constructionType: "single_crown", badge: "ZrO2 Multi",
		description: "Монолитный диоксид циркония многослойной градиентной прозрачности",
		warrantyMonths: 60, warrantyLabelRu: "5 лет",
		pricePatientRub: 24000, costZtlRub: 7500, amountKopecks: 750000, costMaterialsRub: 1200,
		turnaroundBusinessDays: 5, fixationType: "cement", hasAntagonists: true,
	},
	{
		id: "emax", name: "Прессованная керамика E-max", material: "IPS e.max Press (дисиликат лития)",
		constructionType: "single_crown", badge: "e.max Press",
		description: "Прессованная дисиликатная стеклокерамика высокой эстетики для фронта",
		warrantyMonths: 36, warrantyLabelRu: "3 года",
		pricePatientRub: 26000, costZtlRub: 8500, amountKopecks: 850000, costMaterialsRub: 1300,
		turnaroundBusinessDays: 5, fixationType: "cement", hasAntagonists: true,
	},
	{
		id: "veneer_emax", name: "Керамический винир E-max", material: "IPS e.max Ceram / Press",
		constructionType: "veneer", badge: "Винир e.max",
		description: "Микропротезирование зоны улыбки с минимальным препарированием эмали",
		warrantyMonths: 36, warrantyLabelRu: "3 года",
		pricePatientRub: 28000, costZtlRub: 9000, amountKopecks: 900000, costMaterialsRub: 1500,
		turnaroundBusinessDays: 6, fixationType: "cement", hasAntagonists: true,
	},
	{
		id: "bridge", name: "Мостовидный протез ZrO2", material: "ZrO2 Bridge Multi-Layer",
		constructionType: "bridge", badge: "Мост ZrO2",
		description: "Мостовидный протез из диоксида циркония с промывным седловидным пространством",
		warrantyMonths: 60, warrantyLabelRu: "5 лет",
		pricePatientRub: 48000, costZtlRub: 15000, amountKopecks: 1500000, costMaterialsRub: 2200,
		turnaroundBusinessDays: 7, fixationType: "cement", hasAntagonists: true,
	},
	{
		id: "metal_ceramic", name: "Металлокерамика", material: "Металлокерамика Co-Cr (Noritake)",
		constructionType: "single_crown", badge: "МК Co-Cr",
		description: "Классическая металлокерамика на биосовместимом CoCr каркасе",
		warrantyMonths: 24, warrantyLabelRu: "2 года",
		pricePatientRub: 15000, costZtlRub: 5000, amountKopecks: 500000, costMaterialsRub: 1100,
		turnaroundBusinessDays: 7, fixationType: "cement", hasAntagonists: true,
	},
	{
		id: "pmma_temp", name: "Временная коронка PMMA", material: "PMMA CAD/CAM",
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
		warrantyMonths: 24, warrantyLabelRu: "2 года",
		pricePatientRub: 45000, costZtlRub: 16000, amountKopecks: 1600000, costMaterialsRub: 2500,
		turnaroundBusinessDays: 10, fixationType: "clasp", hasAntagonists: true,
	},
	{
		id: "all_on_4", name: "All-on-4 (Винтовая)", material: "Балочный титан + диоксид циркония / композит",
		constructionType: "all_on_4", badge: "All-on-4",
		description: "Несъемная конструкция на 4 имплантатах с винтовой фиксацией на мультиюнитах",
		warrantyMonths: 120, warrantyLabelRu: "10 лет",
		pricePatientRub: 180000, costZtlRub: 55000, amountKopecks: 5500000, costMaterialsRub: 8500,
		turnaroundBusinessDays: 14, fixationType: "screw", hasAntagonists: true,
	},
] as const;

export const ORTHOPEDIC_MANUFACTURING_STAGES: readonly ManufacturingStageInfo[] = [
	{ id: "impression", stepNumber: 1, labelRu: "Слепок / 3D интраоральный скан", descriptionRu: "Снятие цифровых или силиконовых оттисков и регистрация прикуса", estimatedDays: 1 },
	{ id: "framework", stepNumber: 2, labelRu: "Моделирование и фрезеровка каркаса", descriptionRu: "CAD/CAM фрезеровка каркаса или печать примерки", estimatedDays: 2 },
	{ id: "try_in", stepNumber: 3, labelRu: "Примерка каркаса у кресла", descriptionRu: "Проверка прилегания по уступу и окклюзионных контактов", estimatedDays: 1 },
	{ id: "ceramics", stepNumber: 4, labelRu: "Нанесение керамики и индивидуализация", descriptionRu: "Послойное запекание дентина, эмали и глазурование по шкале Vita", estimatedDays: 2 },
	{ id: "ready", stepNumber: 5, labelRu: "Готовая работа доставлена из ЗТЛ", descriptionRu: "Контроль качества конструкции и паспорта изделия", estimatedDays: 1 },
	{ id: "fixed", stepNumber: 6, labelRu: "Постоянная фиксация у кресла", descriptionRu: "Окончательная посадка на цемент или винтовую фиксацию", estimatedDays: 0 },
] as const;

// ============================================================================
// 3. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ И РАСЧЕТЫ
// ============================================================================

export function getZtlPresetById(id: string): StandardZtlPreset | undefined {
	return STANDARD_ZTL_ORDER_PRESETS.find((p) => p.id === id);
}

export function getPreparationMarginById(id: string): PreparationMarginPreset | undefined {
	return PREPARATION_MARGIN_PRESETS.find((m) => m.id === id);
}

export function getFixationPresetById(id: string): FixationTypePreset | undefined {
	return FIXATION_TYPE_PRESETS.find((f) => f.id === id);
}

export function getStumpShadeByCode(code: string): StumpShadeOption | undefined {
	return STUMP_SHADE_PRESETS.find((s) => s.code === code);
}

export function calculateOrthopedicEconomics(presetId: string, count: number = 1): OrthopedicEconomicsCalculation {
	const safeCount = Math.max(1, count);
	const preset = getZtlPresetById(presetId) || STANDARD_ZTL_ORDER_PRESETS[0];
	const grossPriceRub = preset.pricePatientRub * safeCount;
	const ztlCostRub = preset.costZtlRub * safeCount;
	const materialsCostRub = preset.costMaterialsRub * safeCount;
	const netMarginRub = Math.max(0, grossPriceRub - ztlCostRub - materialsCostRub);
	const marginPercent = grossPriceRub > 0 ? Math.round((netMarginRub / grossPriceRub) * 100) : 0;

	return {
		unitsCount: safeCount,
		grossPriceRub,
		grossPriceKopecks: BigInt(grossPriceRub) * 100n,
		ztlCostRub,
		ztlCostKopecks: BigInt(ztlCostRub) * 100n,
		materialsCostRub,
		netMarginRub,
		netMarginKopecks: BigInt(netMarginRub) * 100n,
		marginPercent,
	};
}

export function generateWarrantyPassportNumber(orderNumber: string): string {
	const clean = (orderNumber || "").trim().replace(/^ГП-/, "");
	return clean ? `ГП-${clean}` : "ГП-ЗТЛ-402";
}

export function formatToothFormulaDisplay(toothFdi: string | number): string {
	const raw = String(toothFdi || "").trim();
	return raw || "16";
}

export function validateOrthopedicTooth(toothFdi: string | number): boolean {
	const num = typeof toothFdi === "number" ? toothFdi : parseInt(String(toothFdi).trim(), 10);
	if (Number.isNaN(num)) return false;
	const quadrant = Math.floor(num / 10);
	const toothPos = num % 10;
	return quadrant >= 1 && quadrant <= 4 && toothPos >= 1 && toothPos <= 8;
}

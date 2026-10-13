/**
 * materialsAutoDeductionSsot.ts — Canonical Single Source of Truth (SSOT)
 * for Chairside Procedure Material Auto-Deduction & Technological Norms (Order 804n & SanPiN).
 *
 * MANDATE COMPLIANCE:
 * - Mandate 8e: Doctor Autonomy — Zero blocking modals or disabled buttons due to zero stock.
 *   Missing warehouse stock triggers soft overdraft warnings without stopping clinical care.
 * - Mandate 8n & 8s: Scale Sovereignty — Turnkey BOM recipes for solo doctors and compact clinics.
 * - SanPiN 2.1.3684-21 & 3.3686-21: Automated Class B hazardous medical waste ledger tracking.
 * - Zero Emojis, zero floating-point cents drift, pure deterministic kopeck calculations.
 */

import { z } from "zod";
import {
	type CanonicalInventoryUnit,
	canonicalInventoryUnitSchema,
	formatInventoryQuantityWithUnitRu,
	normalizeInventoryUnit,
} from "./inventoryUnitsSsot.js";

// ============================================================================
// 1. ZOD SCHEMAS & DATA STRUCTURES
// ============================================================================

export const canonicalProcedureCategorySchema = z.enum([
	"anesthetic",
	"composite",
	"endo",
	"surgery",
	"implant",
	"hygiene",
	"ortho",
	"ppe",
	"disinfectant",
	"other",
]);

export type ProcedureMaterialCategory = z.infer<typeof canonicalProcedureCategorySchema>;

export const PROCEDURE_CATEGORY_RU_LABELS: Record<ProcedureMaterialCategory, string> = {
	anesthetic: "Анестезия",
	composite: "Композит и реставрация",
	endo: "Эндодонтия",
	surgery: "Хирургия",
	implant: "Имплантология",
	hygiene: "Профгигиена",
	ortho: "Ортодонтия / Ортопедия",
	ppe: "СИЗ и барьерная защита",
	disinfectant: "Антисептика и дезинфекция",
	other: "Прочие расходные материалы",
};

export const canonicalDeductionItemSchema = z.object({
	id: z.string().min(1),
	inventoryItemId: z.string().min(1),
	nameRu: z.string().min(1),
	category: canonicalProcedureCategorySchema,
	unit: canonicalInventoryUnitSchema,
	standardQuantity: z.number().positive(),
	estimatedUnitCostKopecks: z.number().int().nonnegative(),
	isMandatory: z.boolean().default(true),
	isClassBWaste: z.boolean().default(false),
	classBWasteType: z
		.enum(["sharp", "fluid_soaked", "biological", "pharmaceutical", "none"])
		.default("none"),
	notes: z.string().default(""),
});

export type CanonicalDeductionItem = z.infer<typeof canonicalDeductionItemSchema>;

export const canonicalProcedureRecipeSchema = z.object({
	code804n: z.string().min(1),
	aliases804n: z.array(z.string()).default([]),
	titleRu: z.string().min(1),
	category: canonicalProcedureCategorySchema,
	estimatedDurationMinutes: z.number().int().positive().default(30),
	items: z.array(canonicalDeductionItemSchema),
	notes: z.string().default(""),
});

export type CanonicalProcedureRecipe = z.infer<typeof canonicalProcedureRecipeSchema>;

// ============================================================================
// 2. CANONICAL DEDUCTION RECIPES (Order 804n & Clinical Standards)
// ============================================================================

export const CANONICAL_PROCEDURE_RECIPES: readonly CanonicalProcedureRecipe[] = [
	// 1. АНЕСТЕЗИЯ МЕСТНАЯ (A11.07.012, A16.07.004)
	{
		code804n: "A11.07.012",
		aliases804n: ["A16.07.004", "A11.07.012.001", "A11.07.012.002", "ANES_LOCAL"],
		titleRu: "Анестезия инфильтрационная / проводниковая артикаиновая",
		category: "anesthetic",
		estimatedDurationMinutes: 15,
		notes: "СанПиН 2.1.3684-21, острые отходы Класса Б (игла, стеклянная карпула)",
		items: [
			{ id: "recipe-anes-art-1", inventoryItemId: "mat-anes-art-100k", nameRu: "Артикаин 4% с эпинефрином 1:100 000 (1.7 мл)", category: "anesthetic", unit: "carpule", standardQuantity: 1, estimatedUnitCostKopecks: 14500, isMandatory: true, isClassBWaste: true, classBWasteType: "pharmaceutical", notes: "1 карпула 1.7 мл на инфильтрацию" },
			{ id: "recipe-anes-needle-1", inventoryItemId: "mat-anes-needle-30g", nameRu: "Игла карпульная стоматологическая 30G евростандарт (25 мм)", category: "anesthetic", unit: "pcs", standardQuantity: 1, estimatedUnitCostKopecks: 2500, isMandatory: true, isClassBWaste: true, classBWasteType: "sharp", notes: "Остроконечные отходы Класса Б, утилизация в желтый контейнер" },
			{ id: "recipe-anes-wipe-1", inventoryItemId: "mat-anes-wipe", nameRu: "Антисептическая спиртовая салфетка стерильная", category: "disinfectant", unit: "pcs", standardQuantity: 1, estimatedUnitCostKopecks: 500, isMandatory: true, isClassBWaste: true, classBWasteType: "fluid_soaked", notes: "Обработка места инъекции" },
		],
	},
	// 2. ТЕРАПИЯ / ПЛОМБИРОВАНИЕ КАРИЕСА (A16.07.002, A16.07.002.001, A16.07.002.011)
	{
		code804n: "A16.07.002.011",
		aliases804n: ["A16.07.002", "A16.07.002.001", "CARIES_FILTEK"],
		titleRu: "Препарирование и пломбирование нанокомпозитом светового отверждения",
		category: "composite",
		estimatedDurationMinutes: 45,
		notes: "Норма расхода на 1 класс кариозной полости",
		items: [
			{ id: "recipe-caries-anes", inventoryItemId: "mat-anes-art-100k", nameRu: "Артикаин 4% с эпинефрином 1:100 000 (1.7 мл)", category: "anesthetic", unit: "carpule", standardQuantity: 1, estimatedUnitCostKopecks: 14500, isMandatory: false, isClassBWaste: true, classBWasteType: "pharmaceutical", notes: "Обезболивание при витальном зубе" },
			{ id: "recipe-caries-composite", inventoryItemId: "mat-composite-filtek", nameRu: "Светоотверждаемый нанокомпозит (Filtek Ultimate / Estelite Asteria)", category: "composite", unit: "syringe_g", standardQuantity: 0.2, estimatedUnitCostKopecks: 38000, isMandatory: true, isClassBWaste: false, classBWasteType: "none", notes: "Норма расхода 0.2 г на 1 поверхность" },
			{ id: "recipe-caries-adhesive", inventoryItemId: "mat-adhesive-single", nameRu: "Адгезивная система самопротравливающая (7 пок. / Single Bond)", category: "composite", unit: "dose", standardQuantity: 1, estimatedUnitCostKopecks: 12000, isMandatory: true, isClassBWaste: false, classBWasteType: "none", notes: "Разовая доза адгезива" },
			{ id: "recipe-caries-etch", inventoryItemId: "mat-etch-gel", nameRu: "Протравочный гель ортофосфорной кислоты 37%", category: "composite", unit: "ml", standardQuantity: 0.1, estimatedUnitCostKopecks: 2500, isMandatory: true, isClassBWaste: false, classBWasteType: "none", notes: "Селективное протравливание эмали" },
			{ id: "recipe-caries-matrix", inventoryItemId: "mat-matrix-torvm", nameRu: "Матрица секционная контурная с фиксирующим клином", category: "composite", unit: "pcs", standardQuantity: 1, estimatedUnitCostKopecks: 4500, isMandatory: false, isClassBWaste: true, classBWasteType: "biological", notes: "Восстановление контактного пункта" },
			{ id: "recipe-caries-microbrush", inventoryItemId: "mat-microbrush", nameRu: "Аппликатор микробраш стоматологический одноразовый", category: "composite", unit: "pcs", standardQuantity: 2, estimatedUnitCostKopecks: 800, isMandatory: true, isClassBWaste: true, classBWasteType: "biological", notes: "Внесение протравки и бонда" },
			{ id: "recipe-caries-polishing", inventoryItemId: "mat-polish-disc", nameRu: "Диск шлифовально-полировочный гибкий (Sof-Lex)", category: "composite", unit: "pcs", standardQuantity: 1, estimatedUnitCostKopecks: 6500, isMandatory: true, isClassBWaste: true, classBWasteType: "biological", notes: "Финишная полировка реставрации" },
			{ id: "recipe-caries-gloves", inventoryItemId: "mat-nitrile-gloves", nameRu: "Перчатки смотровые нитриловые неопудренные (пара)", category: "ppe", unit: "pair", standardQuantity: 1, estimatedUnitCostKopecks: 3500, isMandatory: true, isClassBWaste: true, classBWasteType: "biological", notes: "СанПиН 3.3686-21, отходы Класса Б" },
		],
	},
	// 3. ЭНДОДОНТИЯ PROTAPER (A16.07.030, A16.07.008, A16.07.008.001)
	{
		code804n: "A16.07.030",
		aliases804n: ["A16.07.008", "A16.07.008.001", "A16.07.008.002", "ENDO_PROTAPER"],
		titleRu: "Инструментальная и медикаментозная обработка корневого канала (ProTaper / WaveOne)",
		category: "endo",
		estimatedDurationMinutes: 60,
		notes: "Протокол механической и ирригационной обработки канала по SanPiN",
		items: [
			{ id: "recipe-endo-anes", inventoryItemId: "mat-anes-art-100k", nameRu: "Артикаин 4% с эпинефрином 1:100 000 (1.7 мл)", category: "anesthetic", unit: "carpule", standardQuantity: 1, estimatedUnitCostKopecks: 14500, isMandatory: true, isClassBWaste: true, classBWasteType: "pharmaceutical", notes: "Обезболивание пульпы" },
			{ id: "recipe-endo-cofferdam", inventoryItemId: "mat-cofferdam-sheet", nameRu: "Платок коффердама / раббердама латексный с кламмером", category: "endo", unit: "pcs", standardQuantity: 1, estimatedUnitCostKopecks: 9500, isMandatory: true, isClassBWaste: true, classBWasteType: "biological", notes: "Асептическая изоляция рабочего поля" },
			{ id: "recipe-endo-protaper-file", inventoryItemId: "mat-niti-protaper", nameRu: "NiTi ротационный машинный файл (ProTaper Gold / Next)", category: "endo", unit: "pcs", standardQuantity: 1, estimatedUnitCostKopecks: 65000, isMandatory: true, isClassBWaste: true, classBWasteType: "sharp", notes: "Машинный эндоинструмент (амортизация / одноразовый)" },
			{ id: "recipe-endo-naocl", inventoryItemId: "mat-naocl-3pct", nameRu: "Раствор гипохлорита натрия NaOCl 3% стабилизированный", category: "endo", unit: "ml", standardQuantity: 5, estimatedUnitCostKopecks: 2400, isMandatory: true, isClassBWaste: true, classBWasteType: "fluid_soaked", notes: "Ирригация 5 мл на 1 канал" },
			{ id: "recipe-endo-edta", inventoryItemId: "mat-edta-gel", nameRu: "ЭДТА гель 17% для расширения каналов (эндолубрикант)", category: "endo", unit: "ml", standardQuantity: 0.5, estimatedUnitCostKopecks: 3500, isMandatory: true, isClassBWaste: false, classBWasteType: "none", notes: "Хелатирование смазанного слоя" },
			{ id: "recipe-endo-paper-points", inventoryItemId: "mat-paper-points", nameRu: "Пины бумажные абсорбирующие стерильные калиброванные (3 шт)", category: "endo", unit: "pcs", standardQuantity: 3, estimatedUnitCostKopecks: 1800, isMandatory: true, isClassBWaste: true, classBWasteType: "biological", notes: "Осушение корневого канала" },
			{ id: "recipe-endo-guttapercha", inventoryItemId: "mat-gutta-percha", nameRu: "Штифт гуттаперчевый конусный машинный (калибр по мастер-файлу)", category: "endo", unit: "pcs", standardQuantity: 1, estimatedUnitCostKopecks: 4500, isMandatory: true, isClassBWaste: false, classBWasteType: "none", notes: "Мастер-штифт обтурации" },
			{ id: "recipe-endo-ah-plus", inventoryItemId: "mat-sealer-ah-plus", nameRu: "Эпоксидно-аминовый силер для обтурации (AH Plus Jet)", category: "endo", unit: "dose", standardQuantity: 1, estimatedUnitCostKopecks: 42000, isMandatory: true, isClassBWaste: false, classBWasteType: "none", notes: "Герметизация канала" },
		],
	},
	// 4. ХИРУРГИЧЕСКОЕ УДАЛЕНИЕ ЗУБА (A16.07.001, A16.07.006)
	{
		code804n: "A16.07.001",
		aliases804n: ["A16.07.001.001", "A16.07.001.002", "A16.07.006", "EXTRACTION_SIMPLE", "EXTRACTION_COMPLEX"],
		titleRu: "Удаление постоянного зуба (простое / сложное с альвеолотомией)",
		category: "surgery",
		estimatedDurationMinutes: 30,
		notes: "Хирургический протокол, кровяные отходы Класса Б",
		items: [
			{ id: "recipe-surg-anes", inventoryItemId: "mat-anes-art-100k", nameRu: "Артикаин 4% с эпинефрином 1:100 000 (1.7 мл)", category: "anesthetic", unit: "carpule", standardQuantity: 2, estimatedUnitCostKopecks: 29000, isMandatory: true, isClassBWaste: true, classBWasteType: "pharmaceutical", notes: "Инфильтрация + мандибулярная/резцовая анестезия" },
			{ id: "recipe-surg-needle", inventoryItemId: "mat-anes-needle-30g", nameRu: "Игла карпульная стоматологическая 30G евростандарт (25 мм)", category: "anesthetic", unit: "pcs", standardQuantity: 1, estimatedUnitCostKopecks: 2500, isMandatory: true, isClassBWaste: true, classBWasteType: "sharp", notes: "Остроконечные отходы Класса Б" },
			{ id: "recipe-surg-scalpel", inventoryItemId: "mat-scalpel-15c", nameRu: "Лезвие скальпеля хирургическое стерильное 15C", category: "surgery", unit: "pcs", standardQuantity: 1, estimatedUnitCostKopecks: 3800, isMandatory: false, isClassBWaste: true, classBWasteType: "sharp", notes: "Рассечение круговой связки зуба" },
			{ id: "recipe-surg-alvostaz", inventoryItemId: "mat-hemo-alvostaz", nameRu: "Гемостатическая коллагеновая губка (Альвостаз / Спонгостан)", category: "surgery", unit: "pcs", standardQuantity: 1, estimatedUnitCostKopecks: 8500, isMandatory: true, isClassBWaste: true, classBWasteType: "biological", notes: "Гемостаз и профилактика альвеолита лунки" },
			{ id: "recipe-surg-suture", inventoryItemId: "mat-suture-vicryl-40", nameRu: "Шовный материал рассасывающийся с иглой (Викрил / ПГА 4-0)", category: "surgery", unit: "pcs", standardQuantity: 1, estimatedUnitCostKopecks: 32000, isMandatory: false, isClassBWaste: true, classBWasteType: "sharp", notes: "Сближение краев лунки при сложном удалении" },
			{ id: "recipe-surg-gauze", inventoryItemId: "mat-gauze-sterile", nameRu: "Салфетка марлевая хирургическая стерильная (3 шт)", category: "surgery", unit: "pcs", standardQuantity: 3, estimatedUnitCostKopecks: 1500, isMandatory: true, isClassBWaste: true, classBWasteType: "fluid_soaked", notes: "Компрессионный гемостаз лунки" },
			{ id: "recipe-surg-antiseptic", inventoryItemId: "mat-chx-005", nameRu: "Раствор хлоргексидина биглюконата 0.05% водный", category: "disinfectant", unit: "ml", standardQuantity: 20, estimatedUnitCostKopecks: 1200, isMandatory: true, isClassBWaste: true, classBWasteType: "fluid_soaked", notes: "Антисептическая обработка операционного поля" },
		],
	},
	// 5. ДЕНТАЛЬНАЯ ИМПЛАНТАЦИЯ (A16.07.054, A16.07.054.001)
	{
		code804n: "A16.07.054",
		aliases804n: ["A16.07.054.001", "IMPLANT_PLACEMENT"],
		titleRu: "Внутрикостная дентальная имплантация (установка титанового имплантата)",
		category: "implant",
		estimatedDurationMinutes: 60,
		notes: "Хирургический протокол I этапа имплантации",
		items: [
			{ id: "recipe-imp-fixture", inventoryItemId: "mat-implant-fixture-ti", nameRu: "Имплантат стоматологический титановый винтовой стерильный", category: "implant", unit: "pcs", standardQuantity: 1, estimatedUnitCostKopecks: 850000, isMandatory: true, isClassBWaste: false, classBWasteType: "none", notes: "Основной имплантат (строгий учет номера партии и лота)" },
			{ id: "recipe-imp-cover-screw", inventoryItemId: "mat-implant-cover-screw", nameRu: "Винт-заглушка титановый стерильный", category: "implant", unit: "pcs", standardQuantity: 1, estimatedUnitCostKopecks: 120000, isMandatory: true, isClassBWaste: false, classBWasteType: "none", notes: "Установка винта-заглушки на период остеоинтеграции" },
			{ id: "recipe-imp-anes", inventoryItemId: "mat-anes-art-100k", nameRu: "Артикаин 4% с эпинефрином 1:100 000 (1.7 мл)", category: "anesthetic", unit: "carpule", standardQuantity: 2, estimatedUnitCostKopecks: 29000, isMandatory: true, isClassBWaste: true, classBWasteType: "pharmaceutical", notes: "Глубокая проводниковая и инфильтрационная анестезия" },
			{ id: "recipe-imp-drape-kit", inventoryItemId: "mat-surg-drape-kit", nameRu: "Комплект хирургического стерильного белья операционного поля", category: "surgery", unit: "set", standardQuantity: 1, estimatedUnitCostKopecks: 75000, isMandatory: true, isClassBWaste: true, classBWasteType: "biological", notes: "Халаты хирурга и ассистента, простыня пациента, чехлы на шланги" },
			{ id: "recipe-imp-ptfe-suture", inventoryItemId: "mat-suture-ptfe-50", nameRu: "Шовный материал монофиламентный PTFE 5-0 с атравматичной иглой", category: "surgery", unit: "pcs", standardQuantity: 1, estimatedUnitCostKopecks: 68000, isMandatory: true, isClassBWaste: true, classBWasteType: "sharp", notes: "Герметичное ушивание слизисто-надкостничного лоскута" },
			{ id: "recipe-imp-saline", inventoryItemId: "mat-sterile-saline-250", nameRu: "Раствор натрия хлорида 0.9% стерильный для физиодиспенсера (250 мл)", category: "surgery", unit: "ml", standardQuantity: 250, estimatedUnitCostKopecks: 14000, isMandatory: true, isClassBWaste: true, classBWasteType: "fluid_soaked", notes: "Охлаждение костного ложа при остеотомии" },
		],
	},
	// 6. ПРОФЕССИОНАЛЬНАЯ ГИГИЕНА ПОЛОСТИ РТА (A16.07.051, A16.07.051.001)
	{
		code804n: "A16.07.051",
		aliases804n: ["A16.07.051.001", "HYGIENE_AIRFLOW"],
		titleRu: "Профессиональная гигиена полости рта и зубов (Air-Flow + УЗ-скейлинг + полировка)",
		category: "hygiene",
		estimatedDurationMinutes: 40,
		notes: "Комплекс гигиенической чистки и реминерализующей терапии",
		items: [
			{ id: "recipe-hyg-airflow-powder", inventoryItemId: "mat-airflow-powder-glycine", nameRu: "Порошок для воздушно-абразивной обработки Air-Flow (глицин/эритритол)", category: "hygiene", unit: "gram", standardQuantity: 25, estimatedUnitCostKopecks: 45000, isMandatory: true, isClassBWaste: false, classBWasteType: "none", notes: "25 грамм порошка на полную санацию двух челюстей" },
			{ id: "recipe-hyg-prophy-paste", inventoryItemId: "mat-prophy-paste-cleanic", nameRu: "Паста полировочная профилактическая (Cleanic / Detartrine)", category: "hygiene", unit: "dose", standardQuantity: 1, estimatedUnitCostKopecks: 6500, isMandatory: true, isClassBWaste: false, classBWasteType: "none", notes: "Унидоза полировочной пасты" },
			{ id: "recipe-hyg-optragate", inventoryItemId: "mat-optragate-regular", nameRu: "Ретрактор губ и щек эластичный (OptraGate Regular / Small)", category: "hygiene", unit: "pcs", standardQuantity: 1, estimatedUnitCostKopecks: 24000, isMandatory: true, isClassBWaste: true, classBWasteType: "biological", notes: "Круговой обзор и защита мягких тканей" },
			{ id: "recipe-hyg-brush", inventoryItemId: "mat-prophy-brush", nameRu: "Щеточка полировочная нейлоновая угловая одноразовая", category: "hygiene", unit: "pcs", standardQuantity: 1, estimatedUnitCostKopecks: 3500, isMandatory: true, isClassBWaste: true, classBWasteType: "biological", notes: "Полировка окклюзионных и гладких поверхностей" },
			{ id: "recipe-hyg-fluoride", inventoryItemId: "mat-fluoride-varnish", nameRu: "Фторлак / реминерализующий гель глубокого фторирования (Fluor Protector)", category: "hygiene", unit: "dose", standardQuantity: 1, estimatedUnitCostKopecks: 12000, isMandatory: true, isClassBWaste: false, classBWasteType: "none", notes: "Завершающая реминерализация эмали" },
			{ id: "recipe-hyg-aspirator", inventoryItemId: "mat-aspirator-cannula", nameRu: "Канюля слюноотсоса и высокообъемного пылесоса одноразовая", category: "ppe", unit: "pcs", standardQuantity: 1, estimatedUnitCostKopecks: 2800, isMandatory: true, isClassBWaste: true, classBWasteType: "biological", notes: "Эвакуация водно-порошкового аэрозоля" },
		],
	},
];

// ============================================================================
// 3. RECIPE RESOLUTION ENGINE
// ============================================================================

export function normalizeService804nCode(rawCode: string): string {
	return rawCode.trim().toUpperCase();
}

export function getCanonicalProcedureRecipe(
	codeOrAlias: string,
): CanonicalProcedureRecipe | undefined {
	const normalized = normalizeService804nCode(codeOrAlias);
	return CANONICAL_PROCEDURE_RECIPES.find(
		(r) =>
			normalizeService804nCode(r.code804n) === normalized ||
			r.aliases804n.some((a) => normalizeService804nCode(a) === normalized),
	);
}

export function resolveProcedureDeductionItems(
	codeOrAlias: string,
	options: {
		canalsCount?: number;
		surfaceCount?: number;
		isAnesthesiaIncluded?: boolean;
	} = {},
): CanonicalDeductionItem[] {
	const recipe = getCanonicalProcedureRecipe(codeOrAlias);
	if (!recipe) return [];

	const canals = Math.max(1, options.canalsCount ?? 1);
	const surfaces = Math.max(1, options.surfaceCount ?? 1);
	const includeAnes = options.isAnesthesiaIncluded ?? true;

	return recipe.items
		.filter((item) => includeAnes || item.category !== "anesthetic")
		.map((item) => {
			let multiplier = 1;
			if (
				recipe.category === "endo" &&
				[
					"mat-niti-protaper",
					"mat-naocl-3pct",
					"mat-edta-gel",
					"mat-paper-points",
					"mat-gutta-percha",
					"mat-sealer-ah-plus",
				].includes(item.inventoryItemId)
			) {
				multiplier = canals;
			}
			if (item.inventoryItemId === "mat-composite-filtek" && surfaces > 1) {
				multiplier = surfaces;
			}

			return {
				...item,
				standardQuantity: Math.round(item.standardQuantity * multiplier * 100) / 100,
				estimatedUnitCostKopecks: Math.round(item.estimatedUnitCostKopecks * multiplier),
			};
		});
}

// ============================================================================
// 4. SOFT OVERDRAFT & RECONCILIATION MATH (Mandates 8e, 8n, 8s)
// ============================================================================

export interface DeductionLineReconciliation {
	readonly id: string;
	readonly inventoryItemId: string;
	readonly nameRu: string;
	readonly category: ProcedureMaterialCategory;
	readonly unit: CanonicalInventoryUnit;
	readonly standardQuantity: number;
	readonly deductedQuantity: number;
	readonly currentStock: number;
	readonly unitCostKopecks: number;
	readonly lineTotalCostKopecks: number;
	readonly isOverdraft: boolean;
	readonly overdraftDeficitQuantity: number;
	readonly isMandatory: boolean;
	readonly isClassBWaste: boolean;
}

export interface DeductionSummaryResult {
	readonly totalCostKopecks: number;
	readonly totalCostRub: number;
	readonly totalCostRuFormatted: string;
	readonly hasOverdraft: boolean;
	readonly overdraftItemCount: number;
	readonly overdraftLines: readonly DeductionLineReconciliation[];
	readonly classBWasteItemCount: number;
	readonly softWarningMessageRu?: string | undefined;
}

export function calculateProcedureDeductionSummary(
	items: readonly {
		id?: string;
		inventoryItemId: string;
		nameRu: string;
		category?: string;
		unit?: string;
		standardQuantity: number;
		deductedQuantity: number;
		unitCostKopecks?: number;
		currentStock?: number;
		isMandatory?: boolean;
		isClassBWaste?: boolean;
	}[],
): DeductionSummaryResult {
	let totalCostKopecks = 0;
	let hasOverdraft = false;
	const overdraftLines: DeductionLineReconciliation[] = [];
	let classBWasteCount = 0;

	items.forEach((raw, idx) => {
		const unit: CanonicalInventoryUnit = normalizeInventoryUnit(raw.unit || "pcs");
		const currentStock = raw.currentStock ?? 0;
		const deductedQty = Math.max(0, raw.deductedQuantity);
		const isOverdraft = currentStock < deductedQty;
		const deficitQty = isOverdraft ? Math.round((deductedQty - currentStock) * 100) / 100 : 0;
		const unitCost = Math.max(0, Math.round(raw.unitCostKopecks ?? 0));
		const lineCost = Math.round(deductedQty * unitCost);
		totalCostKopecks += lineCost;

		const category = (canonicalProcedureCategorySchema.safeParse(raw.category).data ||
			"other") as ProcedureMaterialCategory;
		const isClassB = Boolean(raw.isClassBWaste);
		if (isClassB) classBWasteCount++;

		const line: DeductionLineReconciliation = {
			id: raw.id || `line-${idx}-${raw.inventoryItemId}`,
			inventoryItemId: raw.inventoryItemId,
			nameRu: raw.nameRu,
			category,
			unit,
			standardQuantity: raw.standardQuantity,
			deductedQuantity: deductedQty,
			currentStock,
			unitCostKopecks: unitCost,
			lineTotalCostKopecks: lineCost,
			isOverdraft,
			overdraftDeficitQuantity: deficitQty,
			isMandatory: raw.isMandatory ?? true,
			isClassBWaste: isClassB,
		};

		if (isOverdraft) {
			hasOverdraft = true;
			overdraftLines.push(line);
		}
	});

	const totalCostRub = Math.round((totalCostKopecks / 100) * 100) / 100;
	const rublePart = Math.floor(totalCostKopecks / 100);
	const kopeckPart = totalCostKopecks % 100;
	const totalCostRuFormatted = `${rublePart.toLocaleString("ru-RU")},${kopeckPart.toString().padStart(2, "0")} ₽`;

	let softWarningMessageRu: string | undefined;
	if (hasOverdraft) {
		const names = overdraftLines
			.map((l) => `${l.nameRu} (дефицит: ${formatInventoryQuantityWithUnitRu(l.overdraftDeficitQuantity, l.unit)})`)
			.join(", ");
		softWarningMessageRu = `Внимание: по ${overdraftLines.length} позициям зафиксирован мягкий овердрафт склада (${names}). Списание подтверждено, операция зафиксирована в журнале аварийных остатков.`;
	}

	return {
		totalCostKopecks,
		totalCostRub,
		totalCostRuFormatted,
		hasOverdraft,
		overdraftItemCount: overdraftLines.length,
		overdraftLines,
		classBWasteItemCount: classBWasteCount,
		softWarningMessageRu,
	};
}

// ============================================================================
// 5. SANPIN CLASS B MEDICAL WASTE PROTOCOL (СанПиН 2.1.3684-21 / 3.3686-21)
// ============================================================================

export interface SanpinClassBWasteEntry {
	readonly id: string;
	readonly timestampIso: string;
	readonly procedureCode804n: string;
	readonly procedureTitleRu: string;
	readonly doctorName: string;
	readonly patientName?: string | undefined;
	readonly visitId?: string | undefined;
	readonly materialName: string;
	readonly quantity: number;
	readonly unit: CanonicalInventoryUnit;
	readonly wasteCategory: "sharp" | "fluid_soaked" | "biological" | "pharmaceutical";
	readonly containerTypeRu: string;
	readonly disposalMethodRu: string;
}

export function generateSanpinClassBWasteRecords(
	deductedItems: readonly {
		inventoryItemId: string;
		nameRu: string;
		deductedQuantity: number;
		unit?: string;
		isClassBWaste?: boolean;
		classBWasteType?: "sharp" | "fluid_soaked" | "biological" | "pharmaceutical" | "none";
	}[],
	meta: {
		procedureCode804n: string;
		procedureTitleRu: string;
		doctorName: string;
		patientName?: string;
		visitId?: string;
	},
): readonly SanpinClassBWasteEntry[] {
	const nowIso = new Date().toISOString();
	const records: SanpinClassBWasteEntry[] = [];

	for (const item of deductedItems) {
		if (!item.isClassBWaste || item.deductedQuantity <= 0) continue;

		const wasteType =
			item.classBWasteType === "none" || !item.classBWasteType ? "biological" : item.classBWasteType;

		let containerTypeRu = "Желтый пакет Класса Б (герметичный)";
		let disposalMethodRu = "Автоклавирование при 134°C / Децентрализованное уничтожение";

		if (wasteType === "sharp") {
			containerTypeRu = "Желтый непрокалываемый контейнер с иглосъемником (СанПиН 2.1.3684-21)";
			disposalMethodRu = "Термическое обезвреживание (сжигание / автоклавирование)";
		} else if (wasteType === "pharmaceutical") {
			containerTypeRu = "Контейнер для пустых стеклянных карпул анестетиков";
			disposalMethodRu = "Дезинфекция и утилизация спецорганизацией с лицензией";
		}

		records.push({
			id: `waste-b-${meta.visitId || "direct"}-${item.inventoryItemId}-${Date.now()}`,
			timestampIso: nowIso,
			procedureCode804n: meta.procedureCode804n,
			procedureTitleRu: meta.procedureTitleRu,
			doctorName: meta.doctorName,
			patientName: meta.patientName,
			visitId: meta.visitId,
			materialName: item.nameRu,
			quantity: item.deductedQuantity,
			unit: normalizeInventoryUnit(item.unit || "pcs"),
			wasteCategory: wasteType,
			containerTypeRu,
			disposalMethodRu,
		});
	}

	return records;
}

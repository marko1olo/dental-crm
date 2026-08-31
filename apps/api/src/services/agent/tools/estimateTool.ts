/**
 * estimateTool.ts — Clinical Treatment Estimate AI Tool for Dentalpin Agentic Core.
 *
 * Implements calculate_treatment_estimate:
 * - Computes 3 parallel pricing tiers:
 *   * Эконом: Base certified materials (composite / PFM), 1 year warranty, total in RUB.
 *   * Оптимум: Clinic standard (E.max / nanohybrid composite), 2 years warranty, total in RUB.
 *   * Премиум: Top-tier materials (Multi-Layer ZrO2 / custom CAD-CAM abutments), lifetime warranty on constructions, total in RUB.
 * - Exact 13% NDFL tax deduction calculation per FNS Form KND 1151156 & Order EA-7-11/824@
 *   (Social limit 150,000 ₽ / max 19,500 ₽ deduction for Code 01; unlimited deduction for Code 02 expensive treatment per Decree 458).
 * - Multi-stage clinical structure (Stage 1 Therapy -> Stage 2 Surgery -> Stage 3 Orthopedics).
 * - 0% installment plans for 3, 6, 12, 24 months with kopeck-exact arithmetic.
 */

import {
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
	classifyProcedureStage,
	type PlanStageKind,
	type PlanTierKey,
	resolveTaxDeductionCategoryShared,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../db/client.js";
import { patients, treatmentPlans } from "../../../db/schema.js";
import {
	VALID_FDI_PERMANENT_TEETH,
	VALID_FDI_PRIMARY_TEETH,
} from "../../clinical/Icd10ClinicalValidator.js";
import type { ToolDefinition } from "./tool.js";

// ─── PARAMETER SCHEMA ───────────────────────────────────────────────────────

const estimateItemSchema = z.object({
	toothCode: z
		.union([z.number().int(), z.string()])
		.optional()
		.describe("Номер зуба по международной формуле FDI (11–48 или 51–85)"),
	serviceName: z
		.string()
		.min(1, "Наименование услуги обязательно")
		.describe("Клиническое наименование процедуры (например, 'Лечение глубокого кариеса', 'Установка имплантата')"),
	nomenclatureCode: z
		.string()
		.optional()
		.default("A16.07.002")
		.describe("Код услуги по Номенклатуре Минздрава РФ 804н (например, A16.07.002, A16.07.054)"),
	basePriceRub: z
		.number()
		.min(0, "Базовая цена не может быть отрицательной")
		.describe("Базовая цена процедуры в рублях"),
	category: z
		.string()
		.optional()
		.describe("Категория услуги (Терапия, Хирургия, Ортопедия, Имплантация, Гигиена, Эндодонтия)"),
	quantity: z
		.number()
		.int()
		.min(1, "Количество должно быть не менее 1")
		.optional()
		.default(1)
		.describe("Количество процедур"),
});

export const calculateTreatmentEstimateSchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.optional()
		.describe("Уникальный идентификатор пациента для привязки и проверки профиля"),
	items: z
		.array(estimateItemSchema)
		.min(1, "Укажите хотя бы одну процедуру для расчета плана лечения")
		.describe("Массив клинических процедур для формирования сметы"),
	discountPercent: z
		.number()
		.min(0, "Скидка не может быть отрицательной")
		.max(100, "Скидка не может превышать 100%")
		.optional()
		.default(0)
		.describe("Процент общей скидки на план лечения (0–100%)"),
	createDraftPlan: z
		.boolean()
		.optional()
		.default(false)
		.describe("Сохранить ли сформированный черновик плана лечения в базе данных (при наличии patientId)"),
});

// ─── TIER DEFINITIONS & MATERIAL SPECIFICATIONS ─────────────────────────────

export interface TierMaterialSpec {
	readonly tierKey: PlanTierKey;
	readonly tierNameRu: string;
	readonly badgeRu: string;
	readonly priceMultiplier: number;
	readonly warrantyRu: string;
	readonly warrantyYears: number | string;
	readonly materialsDescriptionRu: string;
	readonly therapyMaterialsRu: string;
	readonly orthopedicsMaterialsRu: string;
	readonly surgeryMaterialsRu: string;
	readonly keyAdvantagesRu: readonly string[];
	readonly laborRatio: number;
}

export const TIER_SPECS: Record<PlanTierKey, TierMaterialSpec> = {
	economy: {
		tierKey: "economy",
		tierNameRu: "Тариф «Эконом» (Базовый)",
		badgeRu: "Эконом",
		priceMultiplier: 0.85,
		warrantyRu: "1 год официальной гарантии",
		warrantyYears: 1,
		materialsDescriptionRu:
			"Базовые сертифицированные материалы: микрогибридные композиты светового отверждения, металлокерамика Co-Cr, стандартные имплантационные системы.",
		therapyMaterialsRu: "Микрогибридный светоотверждаемый композит (Filtek Z250 / Charisma Classic)",
		orthopedicsMaterialsRu: "Металлокерамическая коронка на сплаве Co-Cr / штампованно-паяная конструкция",
		surgeryMaterialsRu: "Дентальный имплантат стандартного ряда (классический титан Grade 4)",
		keyAdvantagesRu: [
			"Доступная стоимость санации полости рта",
			"Сертифицированные надежные базовые материалы",
			"Официальная гарантия 1 год при соблюдении регламента гигиены",
		],
		laborRatio: 0.65,
	},
	optimum: {
		tierKey: "optimum",
		tierNameRu: "Тариф «Оптимум» (Стандарт клиники / Рекомендуемый)",
		badgeRu: "Оптимум (Выбор врачей)",
		priceMultiplier: 1.0,
		warrantyRu: "2 года расширенной гарантии",
		warrantyYears: 2,
		materialsDescriptionRu:
			"Стандарт клиники DENTE: нанокомпозиты премиальной эстетики, безметалловая керамика IPS e.max, диоксид циркония стандарт, имплантаты с гидрофильной поверхностью.",
		therapyMaterialsRu: "Наногибридный композит премиум-эстетики (Estelite Sigma Quick / Filtek Ultimate)",
		orthopedicsMaterialsRu: "Цельнокерамическая коронка IPS e.max Press / CAD / диоксид циркония Премиум",
		surgeryMaterialsRu: "Премиальный дентальный имплантат с ускоренной остеоинтеграцией (Osstem TS III / Hiossen / Dentium)",
		keyAdvantagesRu: [
			"Идеальный баланс долговечности, биосовместимости и высокой эстетики",
			"Высокопрочные безметалловые реставрации e.max и диоксид циркония",
			"Расширенная гарантия 2 года и сопровождение персонального куратора",
		],
		laborRatio: 0.6,
	},
	premium: {
		tierKey: "premium",
		tierNameRu: "Тариф «Премиум» (VIP / Индивидуальные решения)",
		badgeRu: "Премиум / VIP",
		priceMultiplier: 1.4,
		warrantyRu: "Пожизненная гарантия на конструкции и титановые опоры",
		warrantyYears: "Пожизненная",
		materialsDescriptionRu:
			"Топовые материалы и индивидуальные CAD/CAM решения: многослойный диоксид циркония Multi-Layer (Katana HTML Plus), индивидуальные титановые/циркониевые абатменты, швейцарские имплантаты Straumann SLActive / Nobel Active, микроскопная эндодонтия.",
		therapyMaterialsRu: "Художественная реставрация под дентальным микроскопом Carl Zeiss с послойным воссозданием мамелонов",
		orthopedicsMaterialsRu: "Многослойный диоксид циркония Multi-Layer Katana HTML Plus / ультратонкие виниры e.max Press",
		surgeryMaterialsRu: "Швейцарские гидрофильные имплантаты Straumann BLX SLActive / Nobel Biocare с индивидуальным CAD/CAM абатментом",
		keyAdvantagesRu: [
			"Бескомпромиссная анатомическая эстетика и естественная прозрачность улыбки",
			"Индивидуальные титановые и циркониевые абатменты CAD/CAM",
			"Пожизненная гарантия на ортопедические конструкции и титановые опоры",
			"Лечение и препарирование под операционным дентальным микроскопом",
		],
		laborRatio: 0.55,
	},
};

// ─── OUTPUT INTERFACES ─────────────────────────────────────────────────────

export interface CalculatedEstimateItem {
	readonly toothCode: number | null;
	readonly toothCodeStr: string;
	readonly serviceName: string;
	readonly nomenclatureCode: string;
	readonly category: string;
	readonly stageKind: PlanStageKind;
	readonly stageTitleRu: string;
	readonly quantity: number;
	readonly unitPriceRub: number;
	readonly grossRub: number;
	readonly discountRub: number;
	readonly netRub: number;
	readonly netKopecks: number;
	readonly tierMaterial: string;
	readonly isHighCostCode02: boolean;
	readonly taxDeductionCategoryCode: "01" | "02";
}

export interface CalculatedStageSummary {
	readonly stageKind: PlanStageKind;
	readonly stageNumber: number;
	readonly stageTitleRu: string;
	readonly itemsCount: number;
	readonly grossRub: number;
	readonly discountRub: number;
	readonly netRub: number;
	readonly netKopecks: number;
	readonly estimatedVisits: number;
	readonly items: readonly CalculatedEstimateItem[];
}

export interface CalculatedTaxDeductionSummary {
	readonly code01StandardBaseRub: number;
	readonly code01CappedEligibleBaseRub: number;
	readonly code01AnnualLimitRub: number;
	readonly code01RefundRub: number;
	readonly code02ExpensiveBaseRub: number;
	readonly code02RefundRub: number;
	readonly totalTaxRefundRub: number;
	readonly totalTaxRefundKopecks: number;
	readonly netCostAfterTaxRefundRub: number;
	readonly fnsFormReference: string;
	readonly summaryTextRu: string;
}

export interface CalculatedInstallmentOption {
	readonly months: 3 | 6 | 12 | 24;
	readonly monthlyPaymentRub: number;
	readonly totalPaymentRub: number;
	readonly isZeroPercent: true;
}

export interface CalculatedTierEstimate {
	readonly tierKey: PlanTierKey;
	readonly tierNameRu: string;
	readonly badgeRu: string;
	readonly isRecommended: boolean;
	readonly warrantyRu: string;
	readonly materialsDescriptionRu: string;
	readonly keyAdvantagesRu: readonly string[];
	readonly itemsCount: number;
	readonly grossTotalRub: number;
	readonly discountPercent: number;
	readonly discountRub: number;
	readonly totalRub: number;
	readonly totalKopecks: number;
	readonly laborRub: number;
	readonly materialsRub: number;
	readonly stages: readonly CalculatedStageSummary[];
	readonly taxDeduction: CalculatedTaxDeductionSummary;
	readonly installments: Record<"months3" | "months6" | "months12" | "months24", CalculatedInstallmentOption>;
	readonly items: readonly CalculatedEstimateItem[];
}

export interface CalculateTreatmentEstimateResult {
	readonly patientId: string | null;
	readonly patientFullName: string | null;
	readonly itemsCount: number;
	readonly discountPercent: number;
	readonly recommendedTier: PlanTierKey;
	readonly tiers: {
		readonly economy: CalculatedTierEstimate;
		readonly optimum: CalculatedTierEstimate;
		readonly premium: CalculatedTierEstimate;
	};
	readonly savedPlanId?: string | undefined;
	readonly statutoryNoticeRu: string;
}

// ─── HELPERS ───────────────────────────────────────────────────────────────

function parseFdiTooth(raw: number | string | undefined | null): number | null {
	if (raw === undefined || raw === null) return null;
	const num = typeof raw === "number" ? raw : Number.parseInt(String(raw).trim(), 10);
	if (Number.isNaN(num)) return null;
	if (VALID_FDI_PERMANENT_TEETH.has(num) || VALID_FDI_PRIMARY_TEETH.has(num)) {
		return num;
	}
	return null;
}

function resolveMaterialForTierAndCategory(
	tierKey: PlanTierKey,
	category: string,
	serviceName: string,
): string {
	const spec = TIER_SPECS[tierKey];
	const catLower = (category || "").toLowerCase();
	const nameLower = (serviceName || "").toLowerCase();

	if (catLower.includes("ортопед") || nameLower.includes("коронк") || nameLower.includes("винир") || nameLower.includes("протез")) {
		return spec.orthopedicsMaterialsRu;
	}
	if (catLower.includes("хирург") || catLower.includes("имплант") || nameLower.includes("имплант") || nameLower.includes("синус")) {
		return spec.surgeryMaterialsRu;
	}
	return spec.therapyMaterialsRu;
}

export interface RawEstimateItemInput {
	readonly toothCode?: number | string | null | undefined;
	readonly serviceName: string;
	readonly nomenclatureCode?: string | null | undefined;
	readonly basePriceRub: number;
	readonly category?: string | null | undefined;
	readonly quantity?: number | null | undefined;
}

function calculateTier(
	tierKey: PlanTierKey,
	rawItems: readonly RawEstimateItemInput[],
	discountPercent: number,
): CalculatedTierEstimate {
	const spec = TIER_SPECS[tierKey];
	const items: CalculatedEstimateItem[] = [];

	let totalGrossKopecks = 0;
	let totalDiscountKopecks = 0;
	let totalNetKopecks = 0;

	let code01NetKopecks = 0;
	let code02NetKopecks = 0;

	for (const raw of rawItems) {
		const qty = raw.quantity || 1;
		const toothNum = parseFdiTooth(raw.toothCode);
		const nomCode = (raw.nomenclatureCode || "A16.07.002").trim();
		const sName = raw.serviceName.trim();
		const cat = raw.category || "Терапия";

		const stageKind = classifyProcedureStage(nomCode, cat);
		const isHighCost = resolveTaxDeductionCategoryShared(nomCode, sName) === "2";
		const taxCategoryCode: "01" | "02" = isHighCost ? "02" : "01";

		// Unit price in integer kopecks
		const adjustedUnitPriceRub = Math.round(raw.basePriceRub * spec.priceMultiplier * 100) / 100;
		const unitPriceKopecks = Math.round(adjustedUnitPriceRub * 100);

		const itemGrossKopecks = unitPriceKopecks * qty;
		const itemDiscountKopecks = Math.round(itemGrossKopecks * (discountPercent / 100));
		const itemNetKopecks = itemGrossKopecks - itemDiscountKopecks;

		totalGrossKopecks += itemGrossKopecks;
		totalDiscountKopecks += itemDiscountKopecks;
		totalNetKopecks += itemNetKopecks;

		if (isHighCost) {
			code02NetKopecks += itemNetKopecks;
		} else {
			code01NetKopecks += itemNetKopecks;
		}

		const stageTitleMap: Record<PlanStageKind, string> = {
			stage_1_therapy: "Этап 1: Терапевтическая санация и гигиена",
			stage_2_surgery: "Этап 2: Хирургический этап и имплантация",
			stage_3_orthopedics: "Этап 3: Ортопедический этап и протезирование",
		};

		const tierMaterial = resolveMaterialForTierAndCategory(tierKey, cat, sName);

		items.push({
			toothCode: toothNum,
			toothCodeStr: toothNum !== null ? String(toothNum) : "Полость рта",
			serviceName: sName,
			nomenclatureCode: nomCode,
			category: cat,
			stageKind,
			stageTitleRu: stageTitleMap[stageKind] || "Терапевтический этап",
			quantity: qty,
			unitPriceRub: adjustedUnitPriceRub,
			grossRub: itemGrossKopecks / 100,
			discountRub: itemDiscountKopecks / 100,
			netRub: itemNetKopecks / 100,
			netKopecks: itemNetKopecks,
			tierMaterial,
			isHighCostCode02: isHighCost,
			taxDeductionCategoryCode: taxCategoryCode,
		});
	}

	// Labor vs materials split
	const laborKopecks = Math.round(totalNetKopecks * spec.laborRatio);
	const materialsKopecks = totalNetKopecks - laborKopecks;

	// Stages breakdown
	const stageKinds: PlanStageKind[] = [
		"stage_1_therapy",
		"stage_2_surgery",
		"stage_3_orthopedics",
	];

	const stages: CalculatedStageSummary[] = stageKinds.map((kind, idx) => {
		const stageItems = items.filter((it) => it.stageKind === kind);
		const stageGrossKop = stageItems.reduce((acc, it) => acc + it.grossRub * 100, 0);
		const stageDiscountKop = stageItems.reduce((acc, it) => acc + it.discountRub * 100, 0);
		const stageNetKop = stageGrossKop - stageDiscountKop;
		const visits = stageItems.length === 0 ? 0 : Math.max(1, Math.ceil(stageItems.length / 2));

		const titles: Record<PlanStageKind, string> = {
			stage_1_therapy: "Этап 1: Неотложная помощь и терапевтическая санация",
			stage_2_surgery: "Этап 2: Хирургический этап и дентальная имплантация",
			stage_3_orthopedics: "Этап 3: Ортопедический этап и протезирование",
		};

		return {
			stageKind: kind,
			stageNumber: idx + 1,
			stageTitleRu: titles[kind],
			itemsCount: stageItems.length,
			grossRub: Math.round(stageGrossKop) / 100,
			discountRub: Math.round(stageDiscountKop) / 100,
			netRub: Math.round(stageNetKop) / 100,
			netKopecks: Math.round(stageNetKop),
			estimatedVisits: visits,
			items: stageItems,
		};
	});

	// Tax deduction 13% NDFL (Code 01 social limit 150,000 ₽ / Code 02 unlimited)
	const code01StandardBaseRub = code01NetKopecks / 100;
	const code01AnnualLimitRub = ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024;
	const code01CappedKopecks = Math.min(code01NetKopecks, code01AnnualLimitRub * 100);
	const code01CappedEligibleBaseRub = code01CappedKopecks / 100;
	const code01RefundKopecks = Math.round(code01CappedKopecks * 0.13);
	const code01RefundRub = code01RefundKopecks / 100;

	const code02ExpensiveBaseRub = code02NetKopecks / 100;
	const code02RefundKopecks = Math.round(code02NetKopecks * 0.13);
	const code02RefundRub = code02RefundKopecks / 100;

	const totalTaxRefundKopecks = code01RefundKopecks + code02RefundKopecks;
	const totalTaxRefundRub = totalTaxRefundKopecks / 100;
	const netCostAfterTaxRefundRub = Math.max(0, (totalNetKopecks - totalTaxRefundKopecks) / 100);

	const taxSummaryText =
		`Налоговый вычет 13% НДФЛ по форме ФНС КНД 1151156: Код 01 (лимит 150 000 ₽ / вычет до 19 500 ₽) — ${code01RefundRub.toLocaleString("ru-RU")} ₽; Код 02 (дорогостоящее лечение, без лимита) — ${code02RefundRub.toLocaleString("ru-RU")} ₽. Итого возврат пациенту: ${totalTaxRefundRub.toLocaleString("ru-RU")} ₽. Реальная стоимость лечения: ${netCostAfterTaxRefundRub.toLocaleString("ru-RU")} ₽.`;

	const taxDeduction: CalculatedTaxDeductionSummary = {
		code01StandardBaseRub,
		code01CappedEligibleBaseRub,
		code01AnnualLimitRub,
		code01RefundRub,
		code02ExpensiveBaseRub,
		code02RefundRub,
		totalTaxRefundRub,
		totalTaxRefundKopecks,
		netCostAfterTaxRefundRub,
		fnsFormReference: "Форма ФНС КНД 1151156 (Приказ ФНС от 08.11.2023 № ЕА-7-11/824@, ст. 219 НК РФ)",
		summaryTextRu: taxSummaryText,
	};

	// 0% installments
	const totalNetRub = totalNetKopecks / 100;
	const installments = {
		months3: {
			months: 3 as const,
			monthlyPaymentRub: Math.round((totalNetRub / 3) * 100) / 100,
			totalPaymentRub: totalNetRub,
			isZeroPercent: true as const,
		},
		months6: {
			months: 6 as const,
			monthlyPaymentRub: Math.round((totalNetRub / 6) * 100) / 100,
			totalPaymentRub: totalNetRub,
			isZeroPercent: true as const,
		},
		months12: {
			months: 12 as const,
			monthlyPaymentRub: Math.round((totalNetRub / 12) * 100) / 100,
			totalPaymentRub: totalNetRub,
			isZeroPercent: true as const,
		},
		months24: {
			months: 24 as const,
			monthlyPaymentRub: Math.round((totalNetRub / 24) * 100) / 100,
			totalPaymentRub: totalNetRub,
			isZeroPercent: true as const,
		},
	};

	return {
		tierKey,
		tierNameRu: spec.tierNameRu,
		badgeRu: spec.badgeRu,
		isRecommended: tierKey === "optimum",
		warrantyRu: spec.warrantyRu,
		materialsDescriptionRu: spec.materialsDescriptionRu,
		keyAdvantagesRu: spec.keyAdvantagesRu,
		itemsCount: items.length,
		grossTotalRub: totalGrossKopecks / 100,
		discountPercent,
		discountRub: totalDiscountKopecks / 100,
		totalRub: totalNetRub,
		totalKopecks: totalNetKopecks,
		laborRub: laborKopecks / 100,
		materialsRub: materialsKopecks / 100,
		stages,
		taxDeduction,
		installments,
		items,
	};
}

// ─── TOOL DEFINITION ────────────────────────────────────────────────────────

export const calculateTreatmentEstimateTool: ToolDefinition<
	typeof calculateTreatmentEstimateSchema
> = {
	name: "calculate_treatment_estimate",
	description:
		"Расчет 3-уровневой сметы плана лечения (Эконом, Оптимум, Премиум) с разбивкой по материалам, гарантиям и расчетом налогового вычета 13% НДФЛ по форме ФНС КНД 1151156 (Код 01 лимит 150 000 ₽ / Код 02 без ограничений).",
	parameters: calculateTreatmentEstimateSchema,
	permissions: ["clinical.read"],
	category: "read",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		// 1. Patient verification if patientId is supplied
		let patientFullName: string | null = null;
		if (args.patientId) {
			const [patient] = await targetDb
				.select({
					id: patients.id,
					fullName: patients.fullName,
				})
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, ctx.organizationId),
						eq(patients.id, args.patientId),
					),
				)
				.limit(1);

			if (patient) {
				patientFullName = patient.fullName;
			}
		}

		const discount = args.discountPercent || 0;

		// 2. Compute 3 parallel tiers
		const economyTier = calculateTier("economy", args.items, discount);
		const optimumTier = calculateTier("optimum", args.items, discount);
		const premiumTier = calculateTier("premium", args.items, discount);

		// 3. Optional draft treatment plan persistence
		let savedPlanId: string | undefined;
		if (args.createDraftPlan && args.patientId) {
			const planTitle = `План лечения (Оптимум: ${optimumTier.totalRub.toLocaleString("ru-RU")} ₽, Эконом: ${economyTier.totalRub.toLocaleString("ru-RU")} ₽, Премиум: ${premiumTier.totalRub.toLocaleString("ru-RU")} ₽)`;
			const [createdPlan] = await targetDb
				.insert(treatmentPlans)
				.values({
					organizationId: ctx.organizationId,
					patientId: args.patientId,
					doctorId: ctx.userId ?? null,
					name: `Комплексный план лечения (${new Date().toLocaleDateString("ru-RU")})`,
					title: planTitle,
					status: "Draft",
					totalPriceRub: optimumTier.totalRub,
					totalPrice: String(optimumTier.totalRub),
				})
				.returning({ id: treatmentPlans.id });

			if (createdPlan) {
				savedPlanId = createdPlan.id;
			}
		}

		const statutoryNotice =
			"Предварительный расчет стоимости медицинских услуг и материалов в соответствии с Постановлением Правительства РФ от 11.05.2023 № 736 и ст. 219 НК РФ. Не является публичной офертой до клинического осмотра и утверждения врачебной комиссией.";

		const result: CalculateTreatmentEstimateResult = {
			patientId: args.patientId ?? null,
			patientFullName,
			itemsCount: args.items.length,
			discountPercent: discount,
			recommendedTier: "optimum",
			tiers: {
				economy: economyTier,
				optimum: optimumTier,
				premium: premiumTier,
			},
			...(savedPlanId ? { savedPlanId } : {}),
			statutoryNoticeRu: statutoryNotice,
		};

		return result;
	},
};

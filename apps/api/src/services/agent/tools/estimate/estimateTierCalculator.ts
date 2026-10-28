/**
 * estimateTierCalculator.ts — 3-Tier Clinical Estimate Engine (Economy, Optimum, Premium).
 *
 * Implements material specifications, procedure categorization by stage,
 * catalog price resolution, and multi-tier calculation with kopeck precision.
 */

import {
	classifyProcedureStage,
	type PlanStageKind,
	type PlanTierKey,
	resolveTaxDeductionCategoryShared,
} from "@dental/shared";
import { Decimal } from "decimal.js";
import {
	VALID_FDI_PERMANENT_TEETH,
	VALID_FDI_PRIMARY_TEETH,
} from "../../../clinical/Icd10ClinicalValidator.js";
import {
	calculateInstallmentSchedule,
	type CalculatedInstallmentOption,
	computeKopeckItemPricing,
	computeLaborAndMaterialsSplit,
} from "./estimateDiscountEngine.js";
import {
	calculateTaxDeductionSummary,
	type CalculatedTaxDeductionSummary,
} from "./estimateTaxDeductionCalculator.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export {
	CANONICAL_804N_PRICE_CATALOG,
	resolveStandardCatalogPrice,
	type StandardCatalogService,
} from "./priceCatalog804n.js";
import { resolveStandardCatalogPrice } from "./priceCatalog804n.js";

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
		therapyMaterialsRu:
			"Микрогибридный светоотверждаемый композит (Filtek Z250 / Charisma Classic)",
		orthopedicsMaterialsRu:
			"Металлокерамическая коронка на сплаве Co-Cr / штампованно-паяная конструкция",
		surgeryMaterialsRu:
			"Дентальный имплантат стандартного ряда (классический титан Grade 4)",
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
		therapyMaterialsRu:
			"Наногибридный композит премиум-эстетики (Estelite Sigma Quick / Filtek Ultimate)",
		orthopedicsMaterialsRu:
			"Цельнокерамическая коронка IPS e.max Press / CAD / диоксид циркония Премиум",
		surgeryMaterialsRu:
			"Премиальный дентальный имплантат с ускоренной остеоинтеграцией (Osstem TS III / Hiossen / Dentium)",
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
		therapyMaterialsRu:
			"Художественная реставрация под дентальным микроскопом Carl Zeiss с послойным воссозданием мамелонов",
		orthopedicsMaterialsRu:
			"Многослойный диоксид циркония Multi-Layer Katana HTML Plus / ультратонкие виниры e.max Press",
		surgeryMaterialsRu:
			"Швейцарские гидрофильные имплантаты Straumann BLX SLActive / Nobel Biocare с индивидуальным CAD/CAM абатментом",
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
	readonly grossKopecks: number;
	readonly discountRub: number;
	readonly discountKopecks: number;
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
	readonly grossKopecks: number;
	readonly discountRub: number;
	readonly discountKopecks: number;
	readonly netRub: number;
	readonly netKopecks: number;
	readonly estimatedVisits: number;
	readonly items: readonly CalculatedEstimateItem[];
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
	readonly installments: Record<
		"months3" | "months6" | "months12" | "months24",
		CalculatedInstallmentOption
	>;
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

export interface RawEstimateItemInput {
	readonly toothCode?: number | string | null | undefined;
	readonly serviceName: string;
	readonly nomenclatureCode?: string | null | undefined;
	readonly basePriceRub: number;
	readonly category?: string | null | undefined;
	readonly quantity?: number | null | undefined;
}

export function parseFdiTooth(
	raw: number | string | undefined | null,
): number | null {
	if (raw === undefined || raw === null) return null;
	const num =
		typeof raw === "number"
			? raw
			: Number.parseInt(String(raw).trim(), 10);
	if (Number.isNaN(num)) return null;
	if (VALID_FDI_PERMANENT_TEETH.has(num) || VALID_FDI_PRIMARY_TEETH.has(num)) {
		return num;
	}
	return null;
}

export function resolveMaterialForTierAndCategory(
	tierKey: PlanTierKey,
	category: string,
	serviceName: string,
): string {
	const spec = TIER_SPECS[tierKey];
	const catLower = (category || "").toLowerCase();
	const nameLower = (serviceName || "").toLowerCase();

	if (
		catLower.includes("ортопед") ||
		nameLower.includes("коронк") ||
		nameLower.includes("винир") ||
		nameLower.includes("протез")
	) {
		return spec.orthopedicsMaterialsRu;
	}
	if (
		catLower.includes("хирург") ||
		catLower.includes("имплант") ||
		nameLower.includes("имплант") ||
		nameLower.includes("синус")
	) {
		return spec.surgeryMaterialsRu;
	}
	return spec.therapyMaterialsRu;
}

export function calculateTier(
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
		const isHighCost =
			resolveTaxDeductionCategoryShared(nomCode, sName) === "2";
		const taxCategoryCode: "01" | "02" = isHighCost ? "02" : "01";

		const pricing = computeKopeckItemPricing(
			raw.basePriceRub,
			spec.priceMultiplier,
			discountPercent,
			qty,
		);

		totalGrossKopecks += pricing.grossKopecks;
		totalDiscountKopecks += pricing.discountKopecks;
		totalNetKopecks += pricing.netKopecks;

		if (isHighCost) {
			code02NetKopecks += pricing.netKopecks;
		} else {
			code01NetKopecks += pricing.netKopecks;
		}

		const stageTitleMap: Record<PlanStageKind, string> = {
			stage_1_therapy: "Этап 1: Терапевтическая санация и гигиена",
			stage_2_surgery: "Этап 2: Хирургический этап и имплантация",
			stage_3_orthopedics: "Этап 3: Ортопедический этап и протезирование",
		};

		const tierMaterial = resolveMaterialForTierAndCategory(
			tierKey,
			cat,
			sName,
		);

		items.push({
			toothCode: toothNum,
			toothCodeStr: toothNum !== null ? String(toothNum) : "Полость рта",
			serviceName: sName,
			nomenclatureCode: nomCode,
			category: cat,
			stageKind,
			stageTitleRu: stageTitleMap[stageKind] || "Терапевтический этап",
			quantity: qty,
			unitPriceRub: pricing.unitPriceRub,
			grossRub: pricing.grossRub,
			grossKopecks: pricing.grossKopecks,
			discountRub: pricing.discountRub,
			discountKopecks: pricing.discountKopecks,
			netRub: pricing.netRub,
			netKopecks: pricing.netKopecks,
			tierMaterial,
			isHighCostCode02: isHighCost,
			taxDeductionCategoryCode: taxCategoryCode,
		});
	}

	const { laborRub, materialsRub } = computeLaborAndMaterialsSplit(
		totalNetKopecks,
		spec.laborRatio,
	);

	const stageKinds: PlanStageKind[] = [
		"stage_1_therapy",
		"stage_2_surgery",
		"stage_3_orthopedics",
	];

	const stages: CalculatedStageSummary[] = stageKinds.map((kind, idx) => {
		const stageItems = items.filter((it) => it.stageKind === kind);
		const stageGrossKop = stageItems.reduce(
			(acc, it) => new Decimal(acc).plus(it.grossKopecks).toNumber(),
			0,
		);
		const stageDiscountKop = stageItems.reduce(
			(acc, it) => new Decimal(acc).plus(it.discountKopecks).toNumber(),
			0,
		);
		const stageNetKop = stageItems.reduce(
			(acc, it) => new Decimal(acc).plus(it.netKopecks).toNumber(),
			0,
		);
		const visits =
			stageItems.length === 0 ? 0 : Math.max(1, Math.ceil(stageItems.length / 2));

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
			grossRub: new Decimal(stageGrossKop).dividedBy(100).toNumber(),
			grossKopecks: stageGrossKop,
			discountRub: new Decimal(stageDiscountKop).dividedBy(100).toNumber(),
			discountKopecks: stageDiscountKop,
			netRub: new Decimal(stageNetKop).dividedBy(100).toNumber(),
			netKopecks: stageNetKop,
			estimatedVisits: visits,
			items: stageItems,
		};
	});

	const taxDeduction = calculateTaxDeductionSummary(
		code01NetKopecks,
		code02NetKopecks,
		totalNetKopecks,
	);

	const installments = calculateInstallmentSchedule(totalNetKopecks);
	const totalNetRub = new Decimal(totalNetKopecks).dividedBy(100).toNumber();

	return {
		tierKey,
		tierNameRu: spec.tierNameRu,
		badgeRu: spec.badgeRu,
		isRecommended: tierKey === "optimum",
		warrantyRu: spec.warrantyRu,
		materialsDescriptionRu: spec.materialsDescriptionRu,
		keyAdvantagesRu: spec.keyAdvantagesRu,
		itemsCount: items.length,
		grossTotalRub: new Decimal(totalGrossKopecks).dividedBy(100).toNumber(),
		discountPercent,
		discountRub: new Decimal(totalDiscountKopecks).dividedBy(100).toNumber(),
		totalRub: totalNetRub,
		totalKopecks: totalNetKopecks,
		laborRub,
		materialsRub,
		stages,
		taxDeduction,
		installments,
		items,
	};
}

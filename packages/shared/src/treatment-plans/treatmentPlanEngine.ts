/**
 * DENTE Dental CRM — Multi-Option Treatment Plan & Phased Clinical Estimate Engine
 *
 * Fully compliant with:
 * - Постановление Правительства РФ от 11.05.2023 № 736 «Об утверждении Правил предоставления медицинскими организациями платных медицинских услуг»
 * - Приказ Минздрава России от 13.10.2017 № 804н «Об утверждении номенклатуры медицинских услуг»
 * - Федеральный закон от 21.11.2011 № 323-ФЗ «Об основах охраны здоровья граждан в Российской Федерации» (ст. 20 ИДС, ст. 79)
 * - Налоговый кодекс РФ (ст. 219 НК РФ, Постановление Правительства РФ № 458: дорогостоящее лечение Код 02 / стандартное Код 01)
 * - Клинические рекомендации Стоматологической Ассоциации России (СтАР)
 * - Стандарт нумерации зубов FDI / ISO 3950 (постоянный прикус 11–48, временный прикус 51–85)
 *
 * Core Capabilities:
 * 1. 1–3 Parallel Tier Estimates (Option A: Economy, Option B: Optimum/Recommended, Option C: Premium/VIP)
 * 2. 3 Structured Clinical Stages:
 *    - Stage 1 (stage_1_therapy): Неотложная помощь и терапевтическая санация (чистка, кариес, эндодонтия, пародонтология)
 *    - Stage 2 (stage_2_surgery): Хирургический этап (удаление, синус-лифтинг, костная пластика, дентальная имплантация)
 *    - Stage 3 (stage_3_orthopedics): Ортопедический этап (временные коронки, постоянные конструкции E.max, диоксид циркония, бюгели)
 * 3. Exact integer kopeck calculations (workKopecks, materialsKopecks, discountKopecks, stageCostKopecks, totalCostKopecks)
 * 4. Official statutory form generator: «Приложение №1 к Договору — Предварительный план лечения и смета»
 */

import { z } from "zod";
import {
	type Kopecks,
	multiplyKopecks,
	percentageOfKopecks,
	splitKopecks,
	sumKopecks,
	formatKopecksRu,
} from "../utils/money.js";
import {
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
	resolveTaxDeductionCategoryShared,
} from "../fiscal/taxDeduction.js";
import { integerToRussianWords } from "../sanpin/sanpinRegistryEngine.js";
import { isValidToothFdi } from "../radiology/hotFolderSyncEngine.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. SCHEMAS, ENUMS & DATA CONTRACTS
// ─────────────────────────────────────────────────────────────────────────────

export const planTierKeySchema = z.enum(["economy", "optimum", "premium"]);
export type PlanTierKey = z.infer<typeof planTierKeySchema>;

export const planStageKindSchema = z.enum([
	"stage_1_therapy",
	"stage_2_surgery",
	"stage_3_orthopedics",
]);
export type PlanStageKind = z.infer<typeof planStageKindSchema>;

export const planItemStatusSchema = z.enum([
	"planned",
	"in_progress",
	"completed",
	"declined",
	"postponed",
]);
export type PlanItemStatus = z.infer<typeof planItemStatusSchema>;

export interface PlanStageMetadata {
	readonly stageNumber: 1 | 2 | 3;
	readonly stageKind: PlanStageKind;
	readonly code: string;
	readonly titleRu: string;
	readonly shortTitleRu: string;
	readonly subtitleRu: string;
	readonly clinicalGoalRu: string;
	readonly iconName: string;
	readonly defaultOrder804nPrefixes: readonly string[];
}

export const PLAN_STAGE_METADATA: Record<PlanStageKind, PlanStageMetadata> = {
	stage_1_therapy: {
		stageNumber: 1,
		stageKind: "stage_1_therapy",
		code: "STAGE_1",
		titleRu: "Этап 1: Неотложная помощь и терапевтическая санация",
		shortTitleRu: "Терапевтическая санация",
		subtitleRu: "Устранение очагов инфекции, лечение кариеса, корневых каналов и профгигиена",
		clinicalGoalRu: "Ликвидация болевого синдрома, купирование воспаления, герметизация полостей и подготовка к хирургии.",
		iconName: "Stethoscope",
		defaultOrder804nPrefixes: ["A16.07.002", "A16.07.008", "A16.07.030", "A16.07.050", "A16.07.051", "A11.07", "A06.07", "B01.065"],
	},
	stage_2_surgery: {
		stageNumber: 2,
		stageKind: "stage_2_surgery",
		code: "STAGE_2",
		titleRu: "Этап 2: Хирургический этап и дентальная имплантация",
		shortTitleRu: "Хирургия и имплантация",
		subtitleRu: "Атравматичное удаление, направленная костная регенерация, синус-лифтинг и установка имплантатов",
		clinicalGoalRu: "Создание стабильного костного фундамента и интеграция титановых/циркониевых опор для протезирования.",
		iconName: "Scissors",
		defaultOrder804nPrefixes: ["A16.07.001", "A16.07.041", "A16.07.054", "A16.07.093", "A16.07.026"],
	},
	stage_3_orthopedics: {
		stageNumber: 3,
		stageKind: "stage_3_orthopedics",
		code: "STAGE_3",
		titleRu: "Этап 3: Ортопедический этап и функциональная реабилитация",
		shortTitleRu: "Ортопедия и протезирование",
		subtitleRu: "Временное и постоянное протезирование, высокоэстетичные коронки E.max, диоксид циркония, мосты и виниры",
		clinicalGoalRu: "Полное восстановление окклюзии, жевательной эффективности, анатомической эстетики и артикуляции.",
		iconName: "Smile",
		defaultOrder804nPrefixes: ["A16.07.004", "A16.07.006", "A16.07.003", "A16.07.005", "A16.07.036", "A16.07.023"],
	},
};

export interface PlanTierConfig {
	readonly tierKey: PlanTierKey;
	readonly tierNameRu: string;
	readonly badgeRu: string;
	readonly descriptionRu: string;
	readonly warrantyYears: number | string;
	readonly isRecommended: boolean;
	readonly defaultLaborRatio: number; // 0.0 - 1.0 (e.g. 0.60 labor, 0.40 materials)
	readonly keyAdvantagesRu: readonly string[];
	readonly defaultMaterialsHeadlineRu: string;
}

export const PLAN_TIER_CONFIGS: Record<PlanTierKey, PlanTierConfig> = {
	economy: {
		tierKey: "economy",
		tierNameRu: "Вариант А: Эконом (Базовый)",
		badgeRu: "Эконом",
		descriptionRu: "Надежное клиническое решение по доступной стоимости с использованием базовых сертифицированных материалов.",
		warrantyYears: 1,
		isRecommended: false,
		defaultLaborRatio: 0.65,
		keyAdvantagesRu: [
			"Минимальная стоимость санации полости рта",
			"Сертифицированные микрогибридные композиты",
			"Классические металлокерамические конструкции",
			"Гарантия 1 год при соблюдении гигиенического регламента",
		],
		defaultMaterialsHeadlineRu: "Микрогибридный композит, металлокерамика Co-Cr, имплантаты стандартного ряда",
	},
	optimum: {
		tierKey: "optimum",
		tierNameRu: "Вариант Б: Оптимум (Рекомендуемый)",
		badgeRu: "Оптимум (Выбор врачей)",
		descriptionRu: "Идеальный баланс долговечности, эстетики и биосовместимости по передовым международным протоколам.",
		warrantyYears: 3,
		isRecommended: true,
		defaultLaborRatio: 0.60,
		keyAdvantagesRu: [
			"Оптимальное соотношение непревзойденной надежности и высокой эстетики",
			"Наногибридные реставрации светового отверждения (Filtek / Estelite)",
			"Безметалловые коронки IPS e.max CAD и диоксид циркония с индивидуальной раскраской",
			"Имплантаты премиум-класса с ускоренной остеоинтеграцией",
			"Расширенная гарантия 3 года и сопровождение персонального куратора",
		],
		defaultMaterialsHeadlineRu: "Нанокомпозиты 3M/Estelite, цельная керамика IPS e.max, диоксид циркония Katana, имплантаты Hiossen/Osstem/Nobel",
	},
	premium: {
		tierKey: "premium",
		tierNameRu: "Вариант В: Премиум (VIP)",
		badgeRu: "Премиум / VIP",
		descriptionRu: "Бескомпромиссная эстетика, индивидуальные CAD/CAM решения, микроскопная эндодонтия и пожизненная надежность.",
		warrantyYears: "10 лет / Пожизненная на имплантаты",
		isRecommended: false,
		defaultLaborRatio: 0.55,
		keyAdvantagesRu: [
			"Безупречная эстетика и естественная прозрачность улыбки под ключ",
			"Художественная реставрация зубов под операционным дентальным микроскопом",
			"Ультратонкие цельнокерамические виниры и многослойный диоксид циркония Multi-Layer",
			"Швейцарские гидрофильные имплантаты Straumann BLX / Nobel Biocare Active",
			"Индивидуальные титановые и циркониевые абатменты CAD/CAM",
			"Пожизненная гарантия на титановые опоры и VIP-сервис клиники",
		],
		defaultMaterialsHeadlineRu: "Микроскоп Carl Zeiss, Straumann SLActive, виниры E.max Press, мультилеер цирконий Katana HTML Plus",
	},
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. CLINICAL PROCEDURE DEFINITION & ITEM CONTRACTS
// ─────────────────────────────────────────────────────────────────────────────

export interface TreatmentPlanItemInput {
	readonly id?: string;
	readonly toothNumber?: number | null; // FDI 11-48, 51-85 or null
	readonly surfaces?: readonly string[]; // MOD, O, etc.
	readonly code804n: string; // Order 804n Nomenclature code
	readonly nameRu: string; // Official procedure title per 804n
	readonly categoryRu: string; // Терапия, Хирургия, Ортопедия, etc.
	readonly stageKind: PlanStageKind;
	readonly tierKey?: PlanTierKey; // If assigned to specific tier, or applies to all
	readonly unitPriceKopecks: Kopecks;
	readonly quantity?: number;
	readonly discountKopecks?: Kopecks;
	readonly laborKopecks?: Kopecks;
	readonly materialsKopecks?: Kopecks;
	readonly materialNameRu?: string;
	readonly clinicalRationaleRu?: string;
	readonly isHighCostCode02?: boolean;
	readonly status?: PlanItemStatus;
}

export interface TreatmentPlanItem {
	readonly id: string;
	readonly toothNumber: number | null;
	readonly surfaces: readonly string[];
	readonly code804n: string;
	readonly nameRu: string;
	readonly categoryRu: string;
	readonly stageKind: PlanStageKind;
	readonly stageNumber: 1 | 2 | 3;
	readonly tierKey: PlanTierKey;
	readonly unitPriceKopecks: Kopecks;
	readonly quantity: number;
	readonly grossCostKopecks: Kopecks; // unitPriceKopecks * quantity
	readonly discountKopecks: Kopecks;
	readonly netCostKopecks: Kopecks; // grossCostKopecks - discountKopecks
	readonly laborKopecks: Kopecks; // Work portion
	readonly materialsKopecks: Kopecks; // Materials portion
	readonly totalCostKopecks: Kopecks; // Same as netCostKopecks
	readonly materialNameRu: string;
	readonly clinicalRationaleRu: string;
	readonly isHighCostCode02: boolean;
	readonly status: PlanItemStatus;
}

export interface TreatmentPlanStageSummary {
	readonly stageNumber: 1 | 2 | 3;
	readonly stageKind: PlanStageKind;
	readonly titleRu: string;
	readonly subtitleRu: string;
	readonly clinicalGoalRu: string;
	readonly items: readonly TreatmentPlanItem[];
	readonly itemCount: number;
	readonly grossCostKopecks: Kopecks;
	readonly discountKopecks: Kopecks;
	readonly laborKopecks: Kopecks;
	readonly materialsKopecks: Kopecks;
	readonly stageCostKopecks: Kopecks; // netCostKopecks sum
	readonly estimatedVisits: number;
	readonly estimatedDurationDays: number;
	readonly order804nCodes: readonly string[];
	readonly treatedTeeth: readonly number[];
	readonly isPennyExact: boolean;
}

export interface PlanInstallmentSchedule {
	readonly months: 3 | 6 | 12 | 24;
	readonly monthlyPaymentKopecks: Kopecks;
	readonly monthlyPaymentRu: string;
	readonly partsKopecks: readonly Kopecks[];
	readonly remainderKopecks: Kopecks;
	readonly isZeroPercentInterest: true;
}

export interface PlanNdflDeductionSummary {
	readonly standardCode01BaseKopecks: Kopecks;
	readonly standardCode01CappedKopecks: Kopecks;
	readonly expensiveCode02BaseKopecks: Kopecks;
	readonly totalEligibleBaseKopecks: Kopecks;
	readonly refundKopecks: Kopecks;
	readonly refundRu: string;
	readonly netCostAfterNdflKopecks: Kopecks;
	readonly annualLimitKopecks: Kopecks;
}

export interface TreatmentPlanTierEstimate {
	readonly tierKey: PlanTierKey;
	readonly tierNameRu: string;
	readonly badgeRu: string;
	readonly descriptionRu: string;
	readonly warrantyYears: number | string;
	readonly isRecommended: boolean;
	readonly materialsHeadlineRu: string;
	readonly keyAdvantagesRu: readonly string[];
	readonly stages: readonly TreatmentPlanStageSummary[];
	readonly totalItemsCount: number;
	readonly grossCostKopecks: Kopecks;
	readonly discountKopecks: Kopecks;
	readonly laborKopecks: Kopecks;
	readonly materialsKopecks: Kopecks;
	readonly totalCostKopecks: Kopecks;
	readonly totalCostRu: string;
	readonly totalVisits: number;
	readonly totalDurationDays: number;
	readonly ndflDeduction: PlanNdflDeductionSummary;
	readonly installments: Record<3 | 6 | 12 | 24, PlanInstallmentSchedule>;
	readonly isPennyExact: boolean;
}

export interface ClinicLegalRequisites {
	readonly clinicFullName: string;
	readonly clinicBrandName: string;
	readonly clinicAddress: string;
	readonly clinicPhone: string;
	readonly clinicEmail?: string;
	readonly clinicInn: string;
	readonly clinicKpp?: string;
	readonly clinicOgrn: string;
	readonly medicalLicenseNumber: string;
	readonly medicalLicenseDate: string;
	readonly medicalLicenseIssuer: string;
	readonly chiefDoctorFullName?: string;
}

export const DEFAULT_CLINIC_LEGAL_REQUISITES: ClinicLegalRequisites = {
	clinicFullName: "Общество с ограниченной ответственностью «ДЕНТЕ СТОМАТОЛОГИЯ»",
	clinicBrandName: "DENTE Стоматологическая Клиника",
	clinicAddress: "127006, г. Москва, ул. Долгоруковская, д. 21, стр. 1",
	clinicPhone: "+7 (495) 777-22-33",
	clinicEmail: "info@dente-clinic.ru",
	clinicInn: "7707441122",
	clinicKpp: "770701001",
	clinicOgrn: "1217700554433",
	medicalLicenseNumber: "ЛО41-01137-77/00368421",
	medicalLicenseDate: "12 октября 2021 г.",
	medicalLicenseIssuer: "Департамент здравоохранения города Москвы",
	chiefDoctorFullName: "Барабаш Сергей Владимирович",
};

export interface MultiOptionTreatmentPlanInput {
	readonly planId?: string;
	readonly planNumber?: string;
	readonly clinicId?: string;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly patientBirthDate?: string;
	readonly patientPhone?: string;
	readonly patientPassport?: string;
	readonly doctorFullName: string;
	readonly doctorSpecialty?: string;
	readonly clinicalDiagnosisRu: string; // МКБ-10
	readonly createdAtIso?: string;
	readonly validUntilIso?: string;
	readonly clinicRequisites?: Partial<ClinicLegalRequisites>;
	readonly items: readonly TreatmentPlanItemInput[];
	readonly globalDiscountPercent?: number; // 0 - 100
	readonly selectedTierKey?: PlanTierKey;
}

export interface MultiOptionTreatmentPlan {
	readonly planId: string;
	readonly planNumber: string;
	readonly clinicId: string;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly patientBirthDate: string;
	readonly patientPhone: string;
	readonly patientPassport: string;
	readonly doctorFullName: string;
	readonly doctorSpecialty: string;
	readonly clinicalDiagnosisRu: string;
	readonly createdAtIso: string;
	readonly validUntilIso: string;
	readonly clinicRequisites: ClinicLegalRequisites;
	readonly tiers: Record<PlanTierKey, TreatmentPlanTierEstimate>;
	readonly availableTierKeys: readonly PlanTierKey[];
	readonly selectedTierKey: PlanTierKey;
	readonly selectedTier: TreatmentPlanTierEstimate;
	readonly isPennyExact: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CORE CALCULATION ENGINE & ARITHMETIC INVARIANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Автоматическая классификация медицинской услуги по 804н по клиническим этапам.
 */
export function classifyProcedureStage(
	code804n: string,
	categoryRu?: string,
): PlanStageKind {
	const code = (code804n || "").trim().toUpperCase();
	const cat = (categoryRu || "").toLowerCase();

	// 1. Хирургия и имплантация (Этап 2)
	if (
		code.startsWith("A16.07.001") || // Удаление зуба
		code.startsWith("A16.07.041") || // Костная пластика, остеотомия
		code.startsWith("A16.07.054") || // Дентальная имплантация, ФДМ
		code.startsWith("A16.07.093") || // Навигационный шаблон
		code.startsWith("A16.07.026") || // Гингивопластика
		code.startsWith("A16.07.011") || // Вскрытие абсцесса
		cat.includes("хирург") ||
		cat.includes("имплант") ||
		cat.includes("синус") ||
		cat.includes("удален") ||
		cat.includes("костн")
	) {
		return "stage_2_surgery";
	}

	// 2. Ортопедия и протезирование (Этап 3)
	if (
		code.startsWith("A16.07.004") || // Коронки
		code.startsWith("A16.07.006") || // Протезирование на имплантатах
		code.startsWith("A16.07.003") || // Вкладки, виниры
		code.startsWith("A16.07.005") || // Съемные протезы
		code.startsWith("A16.07.036") || // Бюгельные протезы
		code.startsWith("A16.07.023") || // Мостовидные протезы
		code.startsWith("A16.07.049") || // Снятие слепка/сканирование
		cat.includes("ортопед") ||
		cat.includes("протез") ||
		cat.includes("коронк") ||
		cat.includes("винир") ||
		cat.includes("бюгел") ||
		cat.includes("вкладк")
	) {
		return "stage_3_orthopedics";
	}

	// 3. Терапия, санация, гигиена, диагностика (Этап 1)
	return "stage_1_therapy";
}

/**
 * Проверка услуги на принадлежность к дорогостоящему лечению (Код 02)
 * по Постановлению Правительства РФ от 08.04.2020 № 458.
 */
export function isProcedureHighCostCode02(
	code804n: string,
	nameRu: string,
	categoryRu?: string,
): boolean {
	const cat = resolveTaxDeductionCategoryShared(code804n, nameRu);
	return cat === "2" || (cat as string) === "02";
}

/**
 * Расчет пропорционального разделения стоимости на работу и материалы
 * с гарантией точного совпадения суммы с общей ценой (в целых копейках).
 */
export function splitLaborAndMaterials(
	netCostKopecks: Kopecks,
	tierKey: PlanTierKey,
	explicitLaborKopecks?: Kopecks,
	explicitMaterialsKopecks?: Kopecks,
): { laborKopecks: Kopecks; materialsKopecks: Kopecks } {
	if (netCostKopecks <= 0) {
		return { laborKopecks: 0, materialsKopecks: 0 };
	}

	if (
		typeof explicitLaborKopecks === "number" &&
		typeof explicitMaterialsKopecks === "number" &&
		explicitLaborKopecks + explicitMaterialsKopecks === netCostKopecks
	) {
		return {
			laborKopecks: explicitLaborKopecks,
			materialsKopecks: explicitMaterialsKopecks,
		};
	}

	const config = PLAN_TIER_CONFIGS[tierKey];
	const laborBasisPoints = Math.round(config.defaultLaborRatio * 10000);
	const labor = percentageOfKopecks(netCostKopecks, laborBasisPoints);
	const materials = netCostKopecks - labor;

	return {
		laborKopecks: labor,
		materialsKopecks: materials,
	};
}

/**
 * Расчет графика беспроцентной рассрочки 0% без потери копеек.
 */
export function calculateTierInstallments(
	totalCostKopecks: Kopecks,
): Record<3 | 6 | 12 | 24, PlanInstallmentSchedule> {
	const periods: Array<3 | 6 | 12 | 24> = [3, 6, 12, 24];
	const result = {} as Record<3 | 6 | 12 | 24, PlanInstallmentSchedule>;

	for (const months of periods) {
		if (totalCostKopecks <= 0) {
			result[months] = {
				months,
				monthlyPaymentKopecks: 0,
				monthlyPaymentRu: "0 ₽",
				partsKopecks: Array(months).fill(0),
				remainderKopecks: 0,
				isZeroPercentInterest: true,
			};
			continue;
		}

		const parts = splitKopecks(totalCostKopecks, months);
		const firstPart = parts[0] ?? 0;
		result[months] = {
			months,
			monthlyPaymentKopecks: firstPart,
			monthlyPaymentRu: formatKopecksRu(firstPart),
			partsKopecks: parts,
			remainderKopecks: 0,
			isZeroPercentInterest: true,
		};
	}

	return result;
}

/**
 * Расчет 13% налогового вычета НДФЛ по смете.
 */
export function calculateTierNdflDeduction(
	items: readonly TreatmentPlanItem[],
): PlanNdflDeductionSummary {
	let code01BaseKopecks = 0;
	let code02BaseKopecks = 0;

	for (const item of items) {
		if (item.isHighCostCode02) {
			code02BaseKopecks += item.totalCostKopecks;
		} else {
			code01BaseKopecks += item.totalCostKopecks;
		}
	}

	const annualLimitKopecks = ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024 * 100;
	const cappedCode01Kopecks = Math.min(code01BaseKopecks, annualLimitKopecks);
	const totalEligibleBaseKopecks = cappedCode01Kopecks + code02BaseKopecks;

	// 13% НДФЛ в базисных пунктах (1300 б.п.)
	const refundKopecks = percentageOfKopecks(totalEligibleBaseKopecks, 1300);
	const totalPlanKopecks = code01BaseKopecks + code02BaseKopecks;
	const netCostAfterNdflKopecks = Math.max(0, totalPlanKopecks - refundKopecks);

	return {
		standardCode01BaseKopecks: code01BaseKopecks,
		standardCode01CappedKopecks: cappedCode01Kopecks,
		expensiveCode02BaseKopecks: code02BaseKopecks,
		totalEligibleBaseKopecks,
		refundKopecks,
		refundRu: formatKopecksRu(refundKopecks),
		netCostAfterNdflKopecks,
		annualLimitKopecks,
	};
}

/**
 * Создание нормализованного элемента плана лечения.
 */
export function normalizeTreatmentPlanItem(
	input: TreatmentPlanItemInput,
	tierKey: PlanTierKey,
	index: number,
): TreatmentPlanItem {
	const id = input.id || `item_${tierKey}_${index + 1}_${Date.now()}`;
	const quantity = Number.isInteger(input.quantity) && (input.quantity ?? 1) > 0 ? (input.quantity ?? 1) : 1;
	const unitPriceKopecks = Math.max(0, Math.round(input.unitPriceKopecks || 0));
	const grossCostKopecks = multiplyKopecks(unitPriceKopecks, quantity);
	const discountKopecks = Math.min(grossCostKopecks, Math.max(0, Math.round(input.discountKopecks || 0)));
	const netCostKopecks = grossCostKopecks - discountKopecks;

	const stageKind = input.stageKind || classifyProcedureStage(input.code804n, input.categoryRu);
	const stageNumber = PLAN_STAGE_METADATA[stageKind].stageNumber;
	const isHighCost = typeof input.isHighCostCode02 === "boolean"
		? input.isHighCostCode02
		: isProcedureHighCostCode02(input.code804n, input.nameRu, input.categoryRu);

	const { laborKopecks, materialsKopecks } = splitLaborAndMaterials(
		netCostKopecks,
		tierKey,
		input.laborKopecks,
		input.materialsKopecks,
	);

	let toothNumber: number | null = null;
	if (typeof input.toothNumber === "number" && isValidToothFdi(input.toothNumber)) {
		toothNumber = input.toothNumber;
	}

	return {
		id,
		toothNumber,
		surfaces: Array.isArray(input.surfaces) ? [...input.surfaces] : [],
		code804n: (input.code804n || "A16.07.002").trim(),
		nameRu: (input.nameRu || "Стоматологическая процедура").trim(),
		categoryRu: (input.categoryRu || "Терапия").trim(),
		stageKind,
		stageNumber,
		tierKey,
		unitPriceKopecks,
		quantity,
		grossCostKopecks,
		discountKopecks,
		netCostKopecks,
		laborKopecks,
		materialsKopecks,
		totalCostKopecks: netCostKopecks,
		materialNameRu: (input.materialNameRu || "").trim(),
		clinicalRationaleRu: (input.clinicalRationaleRu || "").trim(),
		isHighCostCode02: isHighCost,
		status: input.status || "planned",
	};
}

/**
 * Расчет одного варианта сметы (Tier) со структурированием по 3 клиническим этапам.
 */
export function calculateSingleTierEstimate(
	tierKey: PlanTierKey,
	rawItems: readonly TreatmentPlanItemInput[],
): TreatmentPlanTierEstimate {
	const config = PLAN_TIER_CONFIGS[tierKey];
	const filteredInputs = rawItems.filter((it) => !it.tierKey || it.tierKey === tierKey);

	const normalizedItems = filteredInputs.map((it, idx) =>
		normalizeTreatmentPlanItem(it, tierKey, idx),
	);

	// Разделение по 3 клиническим этапам
	const stageKinds: PlanStageKind[] = [
		"stage_1_therapy",
		"stage_2_surgery",
		"stage_3_orthopedics",
	];

	const stages: TreatmentPlanStageSummary[] = stageKinds.map((kind) => {
		const meta = PLAN_STAGE_METADATA[kind];
		const stageItems = normalizedItems.filter((it) => it.stageKind === kind);

		const grossCostKopecks = sumKopecks(stageItems.map((it) => it.grossCostKopecks));
		const discountKopecks = sumKopecks(stageItems.map((it) => it.discountKopecks));
		const laborKopecks = sumKopecks(stageItems.map((it) => it.laborKopecks));
		const materialsKopecks = sumKopecks(stageItems.map((it) => it.materialsKopecks));
		const stageCostKopecks = sumKopecks(stageItems.map((it) => it.netCostKopecks));

		const treatedTeethSet = new Set<number>();
		for (const it of stageItems) {
			if (it.toothNumber !== null) treatedTeethSet.add(it.toothNumber);
		}

		const orderCodesSet = new Set<string>();
		for (const it of stageItems) {
			if (it.code804n) orderCodesSet.add(it.code804n);
		}

		// Расчет визитов и дней: 1 визит на каждые 2-3 процедуры, минимум 1 визит при наличии процедур
		const estimatedVisits = stageItems.length === 0 ? 0 : Math.max(1, Math.ceil(stageItems.length / 2));
		const estimatedDurationDays = estimatedVisits === 0 ? 0 : (estimatedVisits - 1) * 7 + 1;

		const isPennyExact = (laborKopecks + materialsKopecks === stageCostKopecks) &&
			(grossCostKopecks - discountKopecks === stageCostKopecks);

		return {
			stageNumber: meta.stageNumber,
			stageKind: kind,
			titleRu: meta.titleRu,
			subtitleRu: meta.subtitleRu,
			clinicalGoalRu: meta.clinicalGoalRu,
			items: stageItems,
			itemCount: stageItems.length,
			grossCostKopecks,
			discountKopecks,
			laborKopecks,
			materialsKopecks,
			stageCostKopecks,
			estimatedVisits,
			estimatedDurationDays,
			order804nCodes: Array.from(orderCodesSet),
			treatedTeeth: Array.from(treatedTeethSet).sort((a, b) => a - b),
			isPennyExact,
		};
	});

	const grossCostKopecks = sumKopecks(stages.map((s) => s.grossCostKopecks));
	const discountKopecks = sumKopecks(stages.map((s) => s.discountKopecks));
	const laborKopecks = sumKopecks(stages.map((s) => s.laborKopecks));
	const materialsKopecks = sumKopecks(stages.map((s) => s.materialsKopecks));
	const totalCostKopecks = sumKopecks(stages.map((s) => s.stageCostKopecks));

	const totalVisits = stages.reduce((acc, s) => acc + s.estimatedVisits, 0);
	const totalDurationDays = stages.reduce((acc, s) => acc + s.estimatedDurationDays, 0);
	const totalItemsCount = normalizedItems.length;

	const ndflDeduction = calculateTierNdflDeduction(normalizedItems);
	const installments = calculateTierInstallments(totalCostKopecks);

	const isPennyExact = stages.every((s) => s.isPennyExact) &&
		(laborKopecks + materialsKopecks === totalCostKopecks) &&
		(grossCostKopecks - discountKopecks === totalCostKopecks);

	return {
		tierKey,
		tierNameRu: config.tierNameRu,
		badgeRu: config.badgeRu,
		descriptionRu: config.descriptionRu,
		warrantyYears: config.warrantyYears,
		isRecommended: config.isRecommended,
		materialsHeadlineRu: config.defaultMaterialsHeadlineRu,
		keyAdvantagesRu: config.keyAdvantagesRu,
		stages,
		totalItemsCount,
		grossCostKopecks,
		discountKopecks,
		laborKopecks,
		materialsKopecks,
		totalCostKopecks,
		totalCostRu: formatKopecksRu(totalCostKopecks),
		totalVisits,
		totalDurationDays,
		ndflDeduction,
		installments,
		isPennyExact,
	};
}

/**
 * Создание комплексного многовариантного плана лечения (Варианты А, Б, В).
 */
export function buildMultiOptionTreatmentPlan(
	input: MultiOptionTreatmentPlanInput,
): MultiOptionTreatmentPlan {
	const now = new Date();
	const createdAtIso = input.createdAtIso || now.toISOString();
	const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 дней срок действия сметы
	const validUntilIso = input.validUntilIso || validUntil.toISOString();

	const planId = input.planId || `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
	const planNumber = input.planNumber || `ПЛ-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
	const clinicId = input.clinicId || "clinic_main";

	const clinicRequisites: ClinicLegalRequisites = {
		...DEFAULT_CLINIC_LEGAL_REQUISITES,
		...(input.clinicRequisites || {}),
	};

	// Применение глобальной скидки, если указана
	let processedItems = input.items;
	if (typeof input.globalDiscountPercent === "number" && input.globalDiscountPercent > 0) {
		const bp = Math.min(10000, Math.max(0, Math.round(input.globalDiscountPercent * 100)));
		processedItems = input.items.map((it) => {
			const qty = it.quantity || 1;
			const gross = multiplyKopecks(it.unitPriceKopecks, qty);
			const discount = percentageOfKopecks(gross, bp);
			return {
				...it,
				discountKopecks: discount,
			};
		});
	}

	const tiers: Record<PlanTierKey, TreatmentPlanTierEstimate> = {
		economy: calculateSingleTierEstimate("economy", processedItems),
		optimum: calculateSingleTierEstimate("optimum", processedItems),
		premium: calculateSingleTierEstimate("premium", processedItems),
	};

	const availableTierKeys: PlanTierKey[] = ["economy", "optimum", "premium"];
	const selectedTierKey = input.selectedTierKey || "optimum";
	const selectedTier = tiers[selectedTierKey];

	const isPennyExact = Object.values(tiers).every((t) => t.isPennyExact);

	return {
		planId,
		planNumber,
		clinicId,
		patientId: input.patientId,
		patientFullName: input.patientFullName.trim(),
		patientBirthDate: input.patientBirthDate || "01.01.1985",
		patientPhone: input.patientPhone || "+7 (___) ___-__-__",
		patientPassport: input.patientPassport || "Паспорт РФ",
		doctorFullName: input.doctorFullName.trim(),
		doctorSpecialty: input.doctorSpecialty || "Врач-стоматолог общей практики",
		clinicalDiagnosisRu: input.clinicalDiagnosisRu.trim(),
		createdAtIso,
		validUntilIso,
		clinicRequisites,
		tiers,
		availableTierKeys,
		selectedTierKey,
		selectedTier,
		isPennyExact,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. STATUTORY DOCUMENT GENERATOR: APPENDIX 1 TO CONTRACT (DECREE NO. 736)
// ─────────────────────────────────────────────────────────────────────────────

export interface TreatmentPlanAppendix1DocumentData {
	readonly planNumber: string;
	readonly contractNumber: string;
	readonly documentDateRu: string;
	readonly clinicFullName: string;
	readonly clinicInn: string;
	readonly clinicOgrn: string;
	readonly clinicAddress: string;
	readonly clinicLicense: string;
	readonly patientFullName: string;
	readonly patientBirthDate: string;
	readonly patientPhone: string;
	readonly doctorFullName: string;
	readonly doctorSpecialty: string;
	readonly clinicalDiagnosisRu: string;
	readonly selectedTierNameRu: string;
	readonly selectedTierBadgeRu: string;
	readonly stages: readonly TreatmentPlanStageSummary[];
	readonly totalGrossCostRu: string;
	readonly totalDiscountRu: string;
	readonly totalLaborCostRu: string;
	readonly totalMaterialsCostRu: string;
	readonly totalCostKopecks: Kopecks;
	readonly totalCostRu: string;
	readonly totalCostInWordsRu: string;
	readonly warrantyPeriodRu: string;
	readonly ndflRefundRu: string;
	readonly installment12Ru: string;
	readonly termsAndConditionsAccepted: boolean;
}

function escapeHtml(str: unknown): string {
	if (str === null || str === undefined) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

function formatRublesFromKopecks(kopecks: Kopecks): string {
	const whole = Math.trunc(kopecks / 100);
	const frac = Math.abs(kopecks % 100);
	const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
	return `${grouped},${String(frac).padStart(2, "0")} ₽`;
}

function convertKopecksToRussianWords(kopecks: Kopecks): string {
	const n = Math.max(0, Math.floor(kopecks / 100));
	const kop = Math.abs(kopecks % 100);
	const words = integerToRussianWords(n);
	const capitalized = words.charAt(0).toUpperCase() + words.slice(1);

	let rubWord = "рублей";
	const mod10 = n % 10;
	const mod100 = n % 100;
	if (mod10 === 1 && mod100 !== 11) rubWord = "рубль";
	else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) rubWord = "рубля";

	let kopWord = "копеек";
	const kMod10 = kop % 10;
	const kMod100 = kop % 100;
	if (kMod10 === 1 && kMod100 !== 11) kopWord = "копейка";
	else if (kMod10 >= 2 && kMod10 <= 4 && (kMod100 < 10 || kMod100 >= 20)) kopWord = "копейки";

	return `${capitalized} ${rubWord} ${String(kop).padStart(2, "0")} ${kopWord}`;
}

/**
 * Подготовка структурированных данных для официального бланка Приложения №1.
 */
export function buildTreatmentPlanAppendix1Data(
	plan: MultiOptionTreatmentPlan,
	selectedTierKey?: PlanTierKey,
): TreatmentPlanAppendix1DocumentData {
	const tierKey = selectedTierKey || plan.selectedTierKey;
	const tier = plan.tiers[tierKey];

	const createdDate = new Date(plan.createdAtIso);
	const documentDateRu = createdDate.toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});

	const contractNumber = `ДОГ-${createdDate.getFullYear()}-${plan.patientId.slice(0, 6).toUpperCase()}`;
	const licenseText = `Лицензия № ${plan.clinicRequisites.medicalLicenseNumber} от ${plan.clinicRequisites.medicalLicenseDate}, выданная ${plan.clinicRequisites.medicalLicenseIssuer}`;

	return {
		planNumber: plan.planNumber,
		contractNumber,
		documentDateRu,
		clinicFullName: plan.clinicRequisites.clinicFullName,
		clinicInn: plan.clinicRequisites.clinicInn,
		clinicOgrn: plan.clinicRequisites.clinicOgrn,
		clinicAddress: plan.clinicRequisites.clinicAddress,
		clinicLicense: licenseText,
		patientFullName: plan.patientFullName,
		patientBirthDate: plan.patientBirthDate,
		patientPhone: plan.patientPhone,
		doctorFullName: plan.doctorFullName,
		doctorSpecialty: plan.doctorSpecialty,
		clinicalDiagnosisRu: plan.clinicalDiagnosisRu,
		selectedTierNameRu: tier.tierNameRu,
		selectedTierBadgeRu: tier.badgeRu,
		stages: tier.stages,
		totalGrossCostRu: formatRublesFromKopecks(tier.grossCostKopecks),
		totalDiscountRu: formatRublesFromKopecks(tier.discountKopecks),
		totalLaborCostRu: formatRublesFromKopecks(tier.laborKopecks),
		totalMaterialsCostRu: formatRublesFromKopecks(tier.materialsKopecks),
		totalCostKopecks: tier.totalCostKopecks,
		totalCostRu: formatRublesFromKopecks(tier.totalCostKopecks),
		totalCostInWordsRu: convertKopecksToRussianWords(tier.totalCostKopecks),
		warrantyPeriodRu: typeof tier.warrantyYears === "number" ? `${tier.warrantyYears} года (лет)` : String(tier.warrantyYears),
		ndflRefundRu: tier.ndflDeduction.refundRu,
		installment12Ru: tier.installments[12]?.monthlyPaymentRu || "0 ₽",
		termsAndConditionsAccepted: true,
	};
}

/**
 * Генератор официального печатного бланка:
 * «Приложение №1 к Договору на оказание платных медицинских услуг — Предварительный план лечения и смета»
 * строго по Постановлению Правительства РФ № 736.
 */
export function renderTreatmentPlanContractAppendix1Html(
	data: TreatmentPlanAppendix1DocumentData,
): string {
	let itemRowCounter = 0;

	const stagesHtml = data.stages
		.filter((s) => s.itemCount > 0)
		.map((stage) => {
			const itemsRows = stage.items
				.map((it) => {
					itemRowCounter += 1;
					const toothDisplay = it.toothNumber ? `Зуб ${it.toothNumber}` : "—";
					const surfacesDisplay = it.surfaces.length > 0 ? ` (${it.surfaces.join(", ")})` : "";
					const materialDisplay = it.materialNameRu ? `<br><small style="color: #475569;">Материал: ${escapeHtml(it.materialNameRu)}</small>` : "";

					return `
					<tr>
						<td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px;">${itemRowCounter}</td>
						<td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; font-weight: bold; font-family: monospace;">${escapeHtml(it.code804n)}</td>
						<td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px;">
							<strong>${escapeHtml(it.nameRu)}</strong>${surfacesDisplay}${materialDisplay}
						</td>
						<td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; font-weight: bold;">${toothDisplay}</td>
						<td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px;">${it.quantity}</td>
						<td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px;">${formatRublesFromKopecks(it.unitPriceKopecks)}</td>
						<td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px;">${formatRublesFromKopecks(it.discountKopecks)}</td>
						<td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; font-weight: bold;">${formatRublesFromKopecks(it.totalCostKopecks)}</td>
					</tr>
				`;
				})
				.join("");

			return `
			<div class="stage-section" style="margin-top: 14px; margin-bottom: 14px; page-break-inside: avoid;">
				<div style="background-color: #f1f5f9; padding: 8px 12px; border-left: 4px solid #0284c7; font-weight: bold; font-size: 12px; margin-bottom: 4px; display: flex; justify-content: space-between;">
					<span>${escapeHtml(stage.titleRu)}</span>
					<span style="color: #0369a1;">Итого по этапу: ${formatRublesFromKopecks(stage.stageCostKopecks)}</span>
				</div>
				<p style="font-size: 10px; color: #64748b; margin: 2px 0 6px 0; font-style: italic;">
					Цель этапа: ${escapeHtml(stage.clinicalGoalRu)} (Ориентировочно: ${stage.estimatedVisits} визита(ов), ${stage.estimatedDurationDays} дн.)
				</p>
				<table style="width: 100%; border-collapse: collapse; margin-bottom: 6px;">
					<thead>
						<tr style="background-color: #f8fafc; font-size: 10px; text-transform: uppercase; color: #475569;">
							<th style="border: 1px solid #cbd5e1; padding: 6px; width: 30px;">№</th>
							<th style="border: 1px solid #cbd5e1; padding: 6px; width: 90px;">Код 804н</th>
							<th style="border: 1px solid #cbd5e1; padding: 6px;">Наименование медицинской услуги</th>
							<th style="border: 1px solid #cbd5e1; padding: 6px; width: 60px;">Локализация (FDI)</th>
							<th style="border: 1px solid #cbd5e1; padding: 6px; width: 40px;">Кол-во</th>
							<th style="border: 1px solid #cbd5e1; padding: 6px; width: 75px;">Цена, руб.</th>
							<th style="border: 1px solid #cbd5e1; padding: 6px; width: 65px;">Скидка</th>
							<th style="border: 1px solid #cbd5e1; padding: 6px; width: 85px;">Стоимость</th>
						</tr>
					</thead>
					<tbody>
						${itemsRows}
					</tbody>
				</table>
			</div>
		`;
		})
		.join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Приложение №1 к Договору — План лечения № ${escapeHtml(data.planNumber)}</title>
	<style>
		@page {
			size: A4;
			margin: 12mm 15mm 15mm 15mm;
		}
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
			color: #0f172a;
			line-height: 1.35;
			font-size: 11px;
			background-color: #ffffff;
			margin: 0;
			padding: 0;
		}
		.document-header {
			text-align: right;
			font-size: 10px;
			color: #475569;
			margin-bottom: 12px;
		}
		.document-title {
			text-align: center;
			font-size: 14px;
			font-weight: 800;
			text-transform: uppercase;
			margin-bottom: 4px;
			letter-spacing: 0.5px;
		}
		.document-subtitle {
			text-align: center;
			font-size: 11px;
			color: #334155;
			margin-bottom: 14px;
		}
		.meta-grid {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 10px;
			margin-bottom: 14px;
			padding: 10px;
			border: 1px solid #e2e8f0;
			border-radius: 4px;
			background-color: #f8fafc;
		}
		.meta-item {
			font-size: 10.5px;
		}
		.meta-label {
			font-weight: 600;
			color: #475569;
		}
		.summary-box {
			margin-top: 14px;
			padding: 10px;
			border: 1px solid #cbd5e1;
			background-color: #f8fafc;
			border-radius: 4px;
			page-break-inside: avoid;
		}
		.legal-notice {
			font-size: 9.5px;
			color: #475569;
			line-height: 1.3;
			margin-top: 12px;
			margin-bottom: 16px;
			text-align: justify;
		}
		.signatures-table {
			width: 100%;
			margin-top: 18px;
			border-collapse: collapse;
			page-break-inside: avoid;
		}
		.signatures-table td {
			vertical-align: top;
			padding: 0 10px;
			font-size: 10.5px;
		}
		.sign-line {
			border-bottom: 1px solid #0f172a;
			margin-top: 35px;
			margin-bottom: 4px;
		}
		@media print {
			body {
				-webkit-print-color-adjust: exact;
				print-color-adjust: exact;
			}
		}
	</style>
</head>
<body>

	<div class="document-header">
		Приложение № 1<br>
		к Договору на оказание платных медицинских услуг № ${escapeHtml(data.contractNumber)}<br>
		от «${escapeHtml(data.documentDateRu)}»
	</div>

	<div class="document-title">
		ПРЕДВАРИТЕЛЬНЫЙ ПЛАН ЛЕЧЕНИЯ И СМЕТА РАСХОДОВ № ${escapeHtml(data.planNumber)}
	</div>
	<div class="document-subtitle">
		(в соответствии с Постановлением Правительства РФ от 11.05.2023 № 736 и Номенклатурой услуг Приказа МЗ РФ № 804н)
	</div>

	<div class="meta-grid">
		<div>
			<div class="meta-item"><span class="meta-label">Медицинская организация:</span> ${escapeHtml(data.clinicFullName)}</div>
			<div class="meta-item"><span class="meta-label">ИНН / ОГРН:</span> ${escapeHtml(data.clinicInn)} / ${escapeHtml(data.clinicOgrn)}</div>
			<div class="meta-item"><span class="meta-label">Адрес клиники:</span> ${escapeHtml(data.clinicAddress)}</div>
			<div class="meta-item"><span class="meta-label">Лицензия:</span> ${escapeHtml(data.clinicLicense)}</div>
		</div>
		<div>
			<div class="meta-item"><span class="meta-label">Пациент (ФИО):</span> <strong>${escapeHtml(data.patientFullName)}</strong></div>
			<div class="meta-item"><span class="meta-label">Дата рождения:</span> ${escapeHtml(data.patientBirthDate)} (Тел: ${escapeHtml(data.patientPhone)})</div>
			<div class="meta-item"><span class="meta-label">Лечащий врач:</span> <strong>${escapeHtml(data.doctorFullName)}</strong> (${escapeHtml(data.doctorSpecialty)})</div>
			<div class="meta-item"><span class="meta-label">Клинический диагноз:</span> ${escapeHtml(data.clinicalDiagnosisRu)}</div>
			<div class="meta-item"><span class="meta-label">Выбранный план лечения:</span> <strong style="color: #0284c7;">${escapeHtml(data.selectedTierNameRu)}</strong></div>
		</div>
	</div>

	<!-- ТАБЛИЦЫ ЭТАПОВ ЛЕЧЕНИЯ -->
	${stagesHtml}

	<!-- ИТОГОВЫЙ ФИНАНСОВЫЙ БЛОК -->
	<div class="summary-box">
		<table style="width: 100%; border-collapse: collapse; font-size: 11px;">
			<tr>
				<td style="padding: 3px 0; color: #475569;">Сумма по прейскуранту (без учета скидки):</td>
				<td style="padding: 3px 0; text-align: right; font-family: monospace;">${escapeHtml(data.totalGrossCostRu)}</td>
			</tr>
			<tr>
				<td style="padding: 3px 0; color: #475569;">Предоставленная скидка клиники:</td>
				<td style="padding: 3px 0; text-align: right; font-family: monospace; color: #16a34a;">− ${escapeHtml(data.totalDiscountRu)}</td>
			</tr>
			<tr>
				<td style="padding: 3px 0; color: #64748b; font-size: 10px;">В том числе стоимость медицинских работ (оплата труда персонала):</td>
				<td style="padding: 3px 0; text-align: right; font-family: monospace; color: #64748b; font-size: 10px;">${escapeHtml(data.totalLaborCostRu)}</td>
			</tr>
			<tr>
				<td style="padding: 3px 0; color: #64748b; font-size: 10px;">В том числе стоимость медикаментов и стоматологических материалов:</td>
				<td style="padding: 3px 0; text-align: right; font-family: monospace; color: #64748b; font-size: 10px;">${escapeHtml(data.totalMaterialsCostRu)}</td>
			</tr>
			<tr style="border-top: 1px solid #cbd5e1; font-weight: bold; font-size: 13px;">
				<td style="padding: 6px 0; color: #0f172a;">ИТОГО К ОПЛАТЕ ПО СМЕТЕ:</td>
				<td style="padding: 6px 0; text-align: right; color: #0284c7; font-family: monospace;">${escapeHtml(data.totalCostRu)}</td>
			</tr>
		</table>
		<div style="margin-top: 6px; font-size: 10.5px; font-style: italic; color: #334155;">
			Сумма прописью: <strong>${escapeHtml(data.totalCostInWordsRu)}</strong>
		</div>
		<div style="margin-top: 6px; font-size: 10px; color: #475569; display: flex; justify-content: space-between; border-top: 1px dashed #cbd5e1; padding-top: 4px;">
			<span>Гарантийный срок на выполненные работы: <strong>${escapeHtml(data.warrantyPeriodRu)}</strong></span>
			<span>Возврат НДФЛ 13% (ст. 219 НК РФ): <strong>до ${escapeHtml(data.ndflRefundRu)}</strong></span>
			<span>Рассрочка 0% на 12 мес.: <strong>${escapeHtml(data.installment12Ru)} / мес.</strong></span>
		</div>
	</div>

	<div class="legal-notice">
		1. Настоящий План лечения и смета являются предварительными и согласованы Сторонами при первичном клиническом обследовании.<br>
		2. В случае необходимости изменения плана лечения в процессе его реализации (выявление скрытых кариозных полостей, анатомических особенностей каналов, необходимость дополнительной костной пластики) Исполнитель своевременно предупреждает Пациента и составляет Дополнительное соглашение (п. 22 Правил № 736).<br>
		3. Пациент уведомлен о применяемых лекарственных средствах, медицинских изделиях, гарантийных обязательствах и правилах личной гигиены полости рта.
	</div>

	<!-- ПОЛЯ ПОДПИСЕЙ СТОРОН -->
	<table class="signatures-table">
		<tr>
			<td style="width: 48%;">
				<strong>ИСПОЛНИТЕЛЬ:</strong><br>
				Врач: ${escapeHtml(data.doctorFullName)}<br>
				Специальность: ${escapeHtml(data.doctorSpecialty)}<br>
				<div class="sign-line"></div>
				<div style="font-size: 9px; color: #64748b; text-align: center;">(подпись, личная печать врача)</div>
				<div style="margin-top: 6px;">М.П. Клиники «${escapeHtml(data.documentDateRu)}»</div>
			</td>
			<td style="width: 4%;"></td>
			<td style="width: 48%;">
				<strong>ПАЦИЕНТ (ПОТРЕБИТЕЛЬ):</strong><br>
				ФИО: ${escapeHtml(data.patientFullName)}<br>
				С планом лечения, сроками и сметой расходов ознакомлен и согласен.<br>
				<div class="sign-line"></div>
				<div style="font-size: 9px; color: #64748b; text-align: center;">(личная подпись Пациента / законного представителя)</div>
				<div style="margin-top: 6px;">«${escapeHtml(data.documentDateRu)}»</div>
			</td>
		</tr>
	</table>

</body>
</html>`;
}

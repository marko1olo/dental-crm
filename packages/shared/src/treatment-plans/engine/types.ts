/**
 * DENTE Dental CRM — Multi-Option Treatment Plan & Phased Clinical Estimate Engine
 * Layer 0: Types, Schemas, Metadata & Contracts
 *
 * Compliant with:
 * - Постановление Правительства РФ от 11.05.2023 № 736 «Об утверждении Правил предоставления медицинскими организациями платных медицинских услуг»
 * - Приказ Минздрава России от 13.10.2017 № 804н «Об утверждении номенклатуры медицинских услуг»
 * - Федеральный закон от 21.11.2011 № 323-ФЗ «Об основах охраны здоровья граждан в Российской Федерации» (ст. 20 ИДС, ст. 79)
 * - Налоговый кодекс РФ (ст. 219 НК РФ, Постановление Правительства РФ № 458: дорогостоящее лечение Код 02 / стандартное Код 01)
 * - Клинические рекомендации Стоматологической Ассоциации России (СтАР)
 * - Стандарт нумерации зубов FDI / ISO 3950 (постоянный прикус 11–48, временный прикус 51–85)
 * - Закон РФ «О защите прав потребителей» (ст. 29 — гарантийные сроки и обязательства)
 * - Постановление Правительства РФ № 659 (порядок согласования планов лечения и смет)
 */

import { z } from "zod";
import type { Kopecks } from "../../utils/money.js";

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
	readonly doctorId?: string | null;
	readonly doctorName?: string | null;
	readonly doctorSpecialty?: string | null;
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
	readonly doctorId?: string | null;
	readonly doctorName?: string | null;
	readonly doctorSpecialty?: string | null;
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
	readonly doctorId?: string | null;
	readonly doctorName?: string | null;
	readonly doctorSpecialty?: string | null;
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

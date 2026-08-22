/**
 * DENTE Dental CRM — Doctor & Staff Piece-Rate Payroll Presets
 * Statutory Russian Dental Practice Archetypes & Lab/Material Deduction Rules
 */

export interface DoctorSpecialtyCommissionRule {
	readonly specialtyId: string;
	readonly titleRu: string;
	readonly defaultPercentage: number; // e.g. 25 = 25%
	readonly retailProductsPercentage: number; // e.g. 10 = 10%
	readonly deductsLabCosts: boolean;
	readonly deductsMaterialCosts: boolean;
	readonly minGuaranteeMonthlyKop: number; // Minimum monthly guaranteed wage
	readonly descriptionRu: string;
}

export interface AssistantShiftRateRule {
	readonly baseShiftRateKop: number; // 3500 RUB = 350000 kop
	readonly radiographBonusKop: number; // 150 RUB = 15000 kop
	readonly surgeryAssistanceBonusKop: number; // 200 RUB = 20000 kop
	readonly overtimeHourlyRateKop: number; // 500 RUB/hr = 50000 kop
}

export interface KpiBonusTier {
	readonly minRevenueKop: number;
	readonly bonusPercentage: number;
	readonly badgeLabelRu: string;
}

export const DOCTOR_SPECIALTY_PAYROLL_PRESETS: readonly DoctorSpecialtyCommissionRule[] = [
	{
		specialtyId: "therapist",
		titleRu: "Врач-стоматолог терапевт / эндодонтист",
		defaultPercentage: 25,
		retailProductsPercentage: 10,
		deductsLabCosts: false,
		deductsMaterialCosts: true,
		minGuaranteeMonthlyKop: 6000000, // 60,000 RUB
		descriptionRu: "25% от выручки за вычетом прямых материалов (пломбировочные, эндомоторы) + 10% за средства домашней гигиены.",
	},
	{
		specialtyId: "orthopedist",
		titleRu: "Врач-стоматолог ортопед (CAD/CAM)",
		defaultPercentage: 25,
		retailProductsPercentage: 5,
		deductsLabCosts: true,
		deductsMaterialCosts: false,
		minGuaranteeMonthlyKop: 8000000, // 80,000 RUB
		descriptionRu: "25% от выручки за вычетом счетов зуботехнической лаборатории (цирконий, керамика, виниры, E.max).",
	},
	{
		specialtyId: "surgeon_implantologist",
		titleRu: "Врач-стоматолог хирург-имплантолог",
		defaultPercentage: 20,
		retailProductsPercentage: 5,
		deductsLabCosts: false,
		deductsMaterialCosts: true,
		minGuaranteeMonthlyKop: 10000000, // 100,000 RUB
		descriptionRu: "20% от имплантации (за вычетом стоимости имплантата и мембран) + 30% от амбулаторных удалений зубов.",
	},
	{
		specialtyId: "orthodontist",
		titleRu: "Врач-ортодонт (брекеты / элайнеры)",
		defaultPercentage: 25,
		retailProductsPercentage: 5,
		deductsLabCosts: true,
		deductsMaterialCosts: false,
		minGuaranteeMonthlyKop: 7500000, // 75,000 RUB
		descriptionRu: "25% от активаций брекет-систем и регулярных приемов, за вычетом стоимости сетапа элайнеров.",
	},
	{
		specialtyId: "hygienist",
		titleRu: "Гигиенист стоматологический",
		defaultPercentage: 30,
		retailProductsPercentage: 15,
		deductsLabCosts: false,
		deductsMaterialCosts: false,
		minGuaranteeMonthlyKop: 4500000, // 45,000 RUB
		descriptionRu: "30% от профессиональной гигиены и отбеливания + 15% за проданные пасты/щетки Curaprox/Oral-B.",
	},
];

export const ASSISTANT_SHIFT_RULE: AssistantShiftRateRule = {
	baseShiftRateKop: 350000, // 3,500 RUB per 6-hour shift
	radiographBonusKop: 15000, // 150 RUB per x-ray
	surgeryAssistanceBonusKop: 20000, // 200 RUB per surgery
	overtimeHourlyRateKop: 50000, // 500 RUB/hr
};

export const KPI_BONUS_TIERS: readonly KpiBonusTier[] = [
	{
		minRevenueKop: 100000000, // 1,000,000 RUB
		bonusPercentage: 5,
		badgeLabelRu: "🌟 Топ-выручка (+5% премия)",
	},
	{
		minRevenueKop: 50000000, // 500,000 RUB
		bonusPercentage: 2,
		badgeLabelRu: "🚀 Личный план выполнен (+2% премия)",
	},
	{
		minRevenueKop: 0,
		bonusPercentage: 0,
		badgeLabelRu: "Базовая ставка",
	},
];

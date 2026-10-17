import {
	DOCTOR_SPECIALTY_PAYROLL_PRESETS,
	type DoctorSpecialtyCommissionRule,
} from "@dental/shared/payroll";
import type {
	SoloDoctorSpecialtyPreset,
	AssistantRatesConfig,
	AdministratorRatesConfig,
} from "./staffPayrollRoleTypes";

export const DOCTOR_SPECIALTY_CONFIGS: Record<string, DoctorSpecialtyCommissionRule> = {
	therapist: DOCTOR_SPECIALTY_PAYROLL_PRESETS.find((p) => p.specialtyId === "therapist")!,
	orthopedist: DOCTOR_SPECIALTY_PAYROLL_PRESETS.find((p) => p.specialtyId === "orthopedist")!,
	surgeon_implantologist: DOCTOR_SPECIALTY_PAYROLL_PRESETS.find((p) => p.specialtyId === "surgeon_implantologist")!,
	surgeon: DOCTOR_SPECIALTY_PAYROLL_PRESETS.find((p) => p.specialtyId === "surgeon")!,
	orthodontist: DOCTOR_SPECIALTY_PAYROLL_PRESETS.find((p) => p.specialtyId === "orthodontist")!,
	hygienist: DOCTOR_SPECIALTY_PAYROLL_PRESETS.find((p) => p.specialtyId === "hygienist")!,
	pediatric: DOCTOR_SPECIALTY_PAYROLL_PRESETS.find((p) => p.specialtyId === "pediatric")!,
	pediatric_dentist: DOCTOR_SPECIALTY_PAYROLL_PRESETS.find((p) => p.specialtyId === "pediatric_dentist")!,
	general_dentist: {
		specialtyId: "general_dentist",
		titleRu: "Врач-стоматолог общей практики",
		defaultPercentage: 25,
		retailProductsPercentage: 10,
		deductsLabCosts: true,
		deductsMaterialCosts: true,
		minGuaranteeMonthlyKop: 7000000,
		descriptionRu: "25% от чистой базы (выручка за вычетом лаборатории и материалов).",
	},
	periodontist: DOCTOR_SPECIALTY_PAYROLL_PRESETS.find((p) => p.specialtyId === "periodontist")!,
	solo_practitioner: DOCTOR_SPECIALTY_PAYROLL_PRESETS.find((p) => p.specialtyId === "solo_practitioner")!,
};

export const SOLO_DOCTOR_SPECIALTY_PRESETS: readonly SoloDoctorSpecialtyPreset[] = [
	{
		specialtyId: "general_dentist",
		titleRu: "Врач-стоматолог общей практики (соло)",
		labelRu: "Лечащий врач (соло-практика) — Стоматолог общей практики",
	},
	{
		specialtyId: "therapist",
		titleRu: "Врач-стоматолог терапевт / эндодонтист",
		labelRu: "Терапевт / эндодонтист",
	},
	{
		specialtyId: "orthopedist",
		titleRu: "Врач-стоматолог ортопед (CAD/CAM)",
		labelRu: "Ортопед (CAD/CAM)",
	},
	{
		specialtyId: "surgeon_implantologist",
		titleRu: "Врач-стоматолог хирург-имплантолог",
		labelRu: "Хирург-имплантолог",
	},
	{
		specialtyId: "surgeon",
		titleRu: "Врач-стоматолог хирург",
		labelRu: "Хирург",
	},
	{
		specialtyId: "orthodontist",
		titleRu: "Врач-ортодонт (брекеты / элайнеры)",
		labelRu: "Ортодонт (брекеты / элайнеры)",
	},
	{
		specialtyId: "periodontist",
		titleRu: "Врач-стоматолог пародонтолог",
		labelRu: "Пародонтолог",
	},
	{
		specialtyId: "pediatric_dentist",
		titleRu: "Детский врач-стоматолог",
		labelRu: "Детский стоматолог",
	},
	{
		specialtyId: "hygienist",
		titleRu: "Гигиенист стоматологический",
		labelRu: "Гигиенист",
	},
];

export const DEFAULT_SOLO_DOCTOR = {
	id: "solo-doctor",
	name: "Лечащий врач (соло-практика)",
	specialtyId: "general_dentist",
} as const;

export const DEFAULT_ASSISTANT_RATES: AssistantRatesConfig = {
	baseShiftRate6hKop: 350000,
	baseShiftRate12hKop: 700000,
	hourlyOvertimeRateKop: 60000,
	hourlyNightRateKop: 70000,
	categoryBonusPercentMap: {
		none: 0,
		second: 10,
		first: 15,
		highest: 20,
	},
	sterilizationShiftBonusKop: 50000,
	radiographBonusKop: 15000,
	surgeryAssistanceBonusKop: 50000,
};

export const DEFAULT_ADMINISTRATOR_RATES: AdministratorRatesConfig = {
	baseSalaryMonthlyKop: 4500000,
	baseShiftRateKop: 300000,
	cashRevenueCommissionPercent: 1.0,
	leadConversionThresholdPercent: 70.0,
	leadConversionBonusKop: 1000000,
};

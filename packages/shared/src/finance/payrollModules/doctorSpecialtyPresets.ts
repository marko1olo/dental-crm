/**
 * packages/shared/src/finance/payrollModules/doctorSpecialtyPresets.ts
 * Clinical specialty presets for Russian dental piece-rate payroll.
 * Mandate 8b: <= 120 lines.
 */

import type { DoctorSpecialtyCommissionRule } from "./payrollPresetTypes.js";

export const DOCTOR_SPECIALTY_PAYROLL_PRESETS: readonly DoctorSpecialtyCommissionRule[] = [
	{
		specialtyId: "general_dentist",
		titleRu: "Врач-стоматолог общей практики (соло)",
		defaultPercentage: 25, retailProductsPercentage: 10,
		deductsLabCosts: true, deductsMaterialCosts: true,
		minGuaranteeMonthlyKop: 6000000,
		descriptionRu: "25% от выручки за вычетом лаборатории и прямых материалов + 10% за средства домашней гигиены.",
	},
	{
		specialtyId: "therapist",
		titleRu: "Врач-стоматолог терапевт / эндодонтист",
		defaultPercentage: 30, retailProductsPercentage: 10,
		deductsLabCosts: false, deductsMaterialCosts: true,
		minGuaranteeMonthlyKop: 6000000,
		descriptionRu: "30% от выручки за вычетом прямых материалов (пломбировочные, эндомоторы) + 10% за средства домашней гигиены.",
	},
	{
		specialtyId: "orthopedist",
		titleRu: "Врач-стоматолог ортопед (CAD/CAM)",
		defaultPercentage: 30, retailProductsPercentage: 5,
		deductsLabCosts: true, deductsMaterialCosts: false,
		minGuaranteeMonthlyKop: 8000000,
		descriptionRu: "30% от выручки за вычетом счетов зуботехнической лаборатории (цирконий, керамика, виниры, E.max).",
	},
	{
		specialtyId: "surgeon_implantologist",
		titleRu: "Врач-стоматолог хирург-имплантолог",
		defaultPercentage: 20, retailProductsPercentage: 5,
		deductsLabCosts: false, deductsMaterialCosts: true,
		minGuaranteeMonthlyKop: 10000000,
		descriptionRu: "20% от имплантации (за вычетом стоимости имплантата и мембран) + 30% от амбулаторных удалений зубов.",
	},
	{
		specialtyId: "surgeon",
		titleRu: "Врач-стоматолог хирург",
		defaultPercentage: 20, retailProductsPercentage: 5,
		deductsLabCosts: false, deductsMaterialCosts: true,
		minGuaranteeMonthlyKop: 10000000,
		descriptionRu: "20% от амбулаторных хирургических операций за вычетом стоимости расходных материалов.",
	},
	{
		specialtyId: "orthodontist",
		titleRu: "Врач-ортодонт (брекеты / элайнеры)",
		defaultPercentage: 25, retailProductsPercentage: 5,
		deductsLabCosts: true, deductsMaterialCosts: false,
		minGuaranteeMonthlyKop: 7500000,
		descriptionRu: "25% от активаций брекет-систем и регулярных приемов, за вычетом стоимости сетапа элайнеров.",
	},
	{
		specialtyId: "periodontist",
		titleRu: "Врач-стоматолог пародонтолог",
		defaultPercentage: 25, retailProductsPercentage: 10,
		deductsLabCosts: false, deductsMaterialCosts: true,
		minGuaranteeMonthlyKop: 6000000,
		descriptionRu: "25% от пародонтологического лечения (Vector, кюретаж, шинирование) за вычетом материалов.",
	},
	{
		specialtyId: "pediatric_dentist",
		titleRu: "Детский врач-стоматолог",
		defaultPercentage: 25, retailProductsPercentage: 10,
		deductsLabCosts: false, deductsMaterialCosts: true,
		minGuaranteeMonthlyKop: 6000000,
		descriptionRu: "25% от детского терапевтического приема и адаптации за вычетом материалов.",
	},
	{
		specialtyId: "pediatric",
		titleRu: "Детский врач-стоматолог",
		defaultPercentage: 25, retailProductsPercentage: 10,
		deductsLabCosts: false, deductsMaterialCosts: true,
		minGuaranteeMonthlyKop: 6000000,
		descriptionRu: "25% от детского терапевтического приема (минус материалы) + адаптационный прием.",
	},
	{
		specialtyId: "hygienist",
		titleRu: "Гигиенист стоматологический",
		defaultPercentage: 30, retailProductsPercentage: 15,
		deductsLabCosts: false, deductsMaterialCosts: false,
		minGuaranteeMonthlyKop: 4500000,
		descriptionRu: "30% от профессиональной гигиены и отбеливания + 15% за проданные пасты/щетки Curaprox/Oral-B.",
	},
	{
		specialtyId: "solo_practitioner",
		titleRu: "Врач-стоматолог (Индивидуальная практика / Соло)",
		defaultPercentage: 100, retailProductsPercentage: 100,
		deductsLabCosts: true, deductsMaterialCosts: true,
		minGuaranteeMonthlyKop: 0,
		descriptionRu: "Индивидуальная практика: 100% операционной выручки за вычетом лаборатории и материалов.",
	},
];

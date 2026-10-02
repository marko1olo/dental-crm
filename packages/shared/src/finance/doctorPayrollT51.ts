/**
 * DENTE Dental CRM — Statutory Doctor & Staff Piece-Rate Payroll Engine (Form T-51)
 * Kopeck-Exact Math, Lab & Material Deductions, KPI Tier Bonuses, Personal Income Tax (НДФЛ 13%)
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
		specialtyId: "general_dentist",
		titleRu: "Врач-стоматолог общей практики (соло)",
		defaultPercentage: 25,
		retailProductsPercentage: 10,
		deductsLabCosts: true,
		deductsMaterialCosts: true,
		minGuaranteeMonthlyKop: 6000000, // 60,000 RUB
		descriptionRu: "25% от выручки за вычетом лаборатории и прямых материалов + 10% за средства домашней гигиены.",
	},
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
		specialtyId: "surgeon",
		titleRu: "Врач-стоматолог хирург",
		defaultPercentage: 20,
		retailProductsPercentage: 5,
		deductsLabCosts: false,
		deductsMaterialCosts: true,
		minGuaranteeMonthlyKop: 10000000,
		descriptionRu: "20% от амбулаторных хирургических операций за вычетом стоимости расходных материалов.",
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
		specialtyId: "periodontist",
		titleRu: "Врач-стоматолог пародонтолог",
		defaultPercentage: 25,
		retailProductsPercentage: 10,
		deductsLabCosts: false,
		deductsMaterialCosts: true,
		minGuaranteeMonthlyKop: 6000000,
		descriptionRu: "25% от пародонтологического лечения (Vector, кюретаж, шинирование) за вычетом материалов.",
	},
	{
		specialtyId: "pediatric_dentist",
		titleRu: "Детский врач-стоматолог",
		defaultPercentage: 25,
		retailProductsPercentage: 10,
		deductsLabCosts: false,
		deductsMaterialCosts: true,
		minGuaranteeMonthlyKop: 6000000,
		descriptionRu: "25% от детского терапевтического приема и адаптации за вычетом материалов.",
	},
	{
		specialtyId: "pediatric",
		titleRu: "Детский врач-стоматолог",
		defaultPercentage: 25,
		retailProductsPercentage: 10,
		deductsLabCosts: false,
		deductsMaterialCosts: true,
		minGuaranteeMonthlyKop: 6000000,
		descriptionRu: "25% от детского терапевтического приема (минус материалы) + адаптационный прием.",
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
	{
		specialtyId: "solo_practitioner",
		titleRu: "Врач-стоматолог (Индивидуальная практика / Соло)",
		defaultPercentage: 100,
		retailProductsPercentage: 100,
		deductsLabCosts: true,
		deductsMaterialCosts: true,
		minGuaranteeMonthlyKop: 0,
		descriptionRu: "Индивидуальная практика: 100% операционной выручки за вычетом лаборатории и материалов.",
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
		badgeLabelRu: "Топ-выручка (+5% премия)",
	},
	{
		minRevenueKop: 50000000, // 500,000 RUB
		bonusPercentage: 2,
		badgeLabelRu: "Личный план выполнен (+2% премия)",
	},
	{
		minRevenueKop: 0,
		bonusPercentage: 0,
		badgeLabelRu: "Базовая ставка",
	},
];

export const CLINICAL_CATEGORY_COMMISSION_PERCENT: Record<
	"therapy" | "orthopedics" | "surgery" | "orthodontics" | "hygiene" | "retail_hygiene" | "pediatric",
	number
> = {
	therapy: 25,
	orthopedics: 20,
	surgery: 22,
	orthodontics: 22,
	hygiene: 30,
	retail_hygiene: 10,
	pediatric: 25,
};

export const DEFAULT_CATEGORY_COMMISSION_PERCENT: Record<
	"therapy" | "orthopedics" | "surgery" | "orthodontics" | "hygiene" | "retail_hygiene" | "pediatric",
	number
> = {
	therapy: 25,
	orthopedics: 25,
	surgery: 20,
	orthodontics: 25,
	hygiene: 30,
	retail_hygiene: 10,
	pediatric: 25,
};

export interface DoctorCompletedServiceItem {
	readonly id: string;
	readonly dateIso: string;
	readonly patientName: string;
	readonly medicalCardNumber: string;
	readonly serviceNameRu: string;
	readonly category: "therapy" | "orthopedics" | "surgery" | "orthodontics" | "hygiene" | "retail_hygiene" | "pediatric";
	readonly grossRevenueKop: number;
	readonly labCostKop: number;
	readonly materialCostKop: number;
	readonly customCommissionPercent?: number | undefined;
	readonly isRefunded?: boolean | undefined;
	readonly refundedAmountKop?: number | undefined;
	readonly order804nCode?: string | undefined;
	readonly toothCode?: string | undefined;
	readonly performerId?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly receiptNumber?: string | undefined;
	readonly refundReceiptNumber?: string | undefined;
	readonly refundReasonRu?: string | undefined;
	readonly refundDateIso?: string | undefined;
	readonly isWarrantyRework?: boolean | undefined;
	readonly warrantyType?: "doctor_fault" | "clinic_warranty" | "lab_warranty" | undefined;
	readonly warrantyFixedCompensationKop?: number | undefined;
	readonly deductMaterialFromDoctor?: boolean | undefined;
	readonly paymentSource?: "cash" | "card" | "sbp" | "deposit" | "family_deposit" | "split" | undefined;
	readonly isDepositAdvanceOnly?: boolean | undefined;
}

export interface DoctorPayrollStornoLineItem {
	readonly id: string;
	readonly serviceId?: string | undefined;
	readonly dateIso: string;
	readonly serviceNameRu: string;
	readonly receiptNumber: string;
	readonly reasonRu: string;
	readonly refundedGrossKop: number;
	readonly stornoCommissionKop: number;
	readonly labelRu: string;
}

export interface DoctorRefundDeductionItem {
	readonly serviceId?: string | undefined;
	readonly toothCode?: string | undefined;
	readonly serviceNameRu?: string | undefined;
	readonly refundedGrossKop: number;
	readonly reasonRu?: string | undefined;
	readonly receiptNumber?: string | undefined;
	readonly dateIso?: string | undefined;
	readonly customCommissionPercent?: number | undefined;
	readonly performerId?: string | undefined;
	readonly doctorId?: string | undefined;
}

export interface DoctorPayrollCalculationInput {
	readonly doctorId: string;
	readonly doctorName: string;
	readonly specialtyId: string;
	readonly periodStartIso: string;
	readonly periodEndIso: string;
	readonly services: readonly DoctorCompletedServiceItem[];
	readonly customBasePercentage?: number | undefined;
	readonly categoryRates?: Partial<Record<"therapy" | "orthopedics" | "surgery" | "orthodontics" | "hygiene" | "retail_hygiene" | "pediatric", number>> | undefined;
	readonly useClinicalCategoryRates?: boolean | undefined;
	readonly manualAdjustmentKop?: number | undefined; // e.g. advance payment deduction or bonus
	readonly manualAdjustmentNoteRu?: string | undefined;
	readonly refundDeductions?: readonly DoctorRefundDeductionItem[] | undefined;
}

export interface DoctorPayrollResult {
	readonly doctorId: string;
	readonly doctorName: string;
	readonly specialtyTitleRu: string;
	readonly periodLabelRu: string;
	readonly totalGrossRevenueKop: number;
	readonly totalLabDeductionsKop: number;
	readonly totalMaterialDeductionsKop: number;
	readonly totalNetBaseKop: number;
	readonly totalRefundDeductionsKop: number;
	readonly totalRefundClawbackKop: number;
	readonly refundedServicesCount: number;
	readonly stornoItems: readonly DoctorPayrollStornoLineItem[];
	readonly warrantyServicesCount: number;
	readonly baseCommissionPercent: number;
	readonly earnedBaseCommissionKop: number;
	readonly kpiBonusPercent: number;
	readonly kpiBonusEarnedKop: number;
	readonly kpiTierBadgeRu: string;
	readonly earnedRetailCommissionKop: number;
	readonly grossPayoutBeforeTaxKop: number;
	readonly ndfl13TaxKop: number;
	readonly netPayoutToDoctorKop: number; // "На руки"
	readonly minimumGuaranteeApplied: boolean;
	readonly manualAdjustmentKop: number;
	readonly serviceCount: number;
}

export interface AssistantShiftLogItem {
	readonly id: string;
	readonly dateIso: string;
	readonly shiftType: "standard_6h" | "full_12h" | "overtime_custom";
	readonly hoursWorked: number;
	readonly radiographsTakenCount: number;
	readonly surgeriesAssistedCount: number;
}

export interface AssistantPayrollResult {
	readonly assistantId: string;
	readonly assistantName: string;
	readonly periodLabelRu: string;
	readonly totalShifts: number;
	readonly totalRadiographs: number;
	readonly totalSurgeries: number;
	readonly baseShiftPayoutKop: number;
	readonly radiographPayoutKop: number;
	readonly surgeryPayoutKop: number;
	readonly totalGrossPayoutKop: number;
	readonly ndfl13TaxKop: number;
	readonly netPayoutToAssistantKop: number;
}

export function splitVisitServicesByDoctor(
	services: readonly DoctorCompletedServiceItem[],
	fallbackDoctorId?: string
): Map<string, DoctorCompletedServiceItem[]> {
	const map = new Map<string, DoctorCompletedServiceItem[]>();
	for (const service of services) {
		const targetDoctorId = service.performerId ?? service.doctorId ?? fallbackDoctorId ?? "unassigned";
		const list = map.get(targetDoctorId) ?? [];
		list.push(service);
		map.set(targetDoctorId, list);
	}
	return map;
}

export function filterServicesForDoctor(
	services: readonly DoctorCompletedServiceItem[],
	doctorId: string
): DoctorCompletedServiceItem[] {
	return services.filter((srv) => {
		const assigned = srv.performerId ?? srv.doctorId;
		return !assigned || assigned === doctorId;
	});
}

export function resolveDoctorPreset(specialtyId: string): DoctorSpecialtyCommissionRule {
	const defaultPreset =
		DOCTOR_SPECIALTY_PAYROLL_PRESETS.find((p) => p.specialtyId === "general_dentist") ??
		DOCTOR_SPECIALTY_PAYROLL_PRESETS[0]!;

	return (
		DOCTOR_SPECIALTY_PAYROLL_PRESETS.find((p) => p.specialtyId === specialtyId) ??
		DOCTOR_SPECIALTY_PAYROLL_PRESETS.find(
			(p) =>
				(specialtyId === "solo-doctor" && p.specialtyId === "general_dentist") ||
				(specialtyId === "surgeon" && p.specialtyId === "surgeon_implantologist") ||
				(specialtyId === "pediatric" && p.specialtyId === "pediatric_dentist")
		) ??
		defaultPreset
	);
}

/**
 * Calculates kopeck-exact doctor piece-rate payroll with ZTL and material deductions,
 * differentiated clinical rates, KPI tiers, and Personal Income Tax (НДФЛ 13%).
 */
export function calculateDoctorPeriodPayroll(
	input: DoctorPayrollCalculationInput
): DoctorPayrollResult {
	const preset = resolveDoctorPreset(input.specialtyId);
	const basePercent = input.customBasePercentage ?? preset.defaultPercentage;

	const doctorServices = filterServicesForDoctor(input.services, input.doctorId);

	let totalGross = 0;
	let totalLab = 0;
	let totalMaterial = 0;
	let earnedBase = 0;
	let earnedRetail = 0;
	let refundedServicesCount = 0;
	let warrantyServicesCount = 0;
	let totalItemRefundsKop = 0;
	const stornoItems: DoctorPayrollStornoLineItem[] = [];

	for (const item of doctorServices) {
		if (item.isDepositAdvanceOnly) {
			continue;
		}

		if (item.isWarrantyRework) {
			warrantyServicesCount += 1;
			if (item.warrantyType === "clinic_warranty" || item.warrantyType === "lab_warranty") {
				const fixedComp = item.warrantyFixedCompensationKop ?? 0;
				if (fixedComp > 0) {
					earnedBase += fixedComp;
				}
			}
			if (item.deductMaterialFromDoctor && item.materialCostKop > 0) {
				totalMaterial += item.materialCostKop;
			}
			continue;
		}

		const isFullyRefunded = item.isRefunded === true || (item.refundedAmountKop !== undefined && item.refundedAmountKop >= item.grossRevenueKop);
		const refundKop = Math.min(item.grossRevenueKop, item.refundedAmountKop ?? (item.isRefunded ? item.grossRevenueKop : 0));

		// CLINICAL INVARIANT: Orthopedic & Orthodontic services ALWAYS deduct ZTL lab costs
		const shouldDeductLab =
			preset.deductsLabCosts ||
			item.category === "orthopedics" ||
			item.category === "orthodontics" ||
			(item.labCostKop !== undefined && item.labCostKop > 0);
		const itemLabCost = shouldDeductLab ? Math.max(0, item.labCostKop || 0) : 0;

		// CLINICAL INVARIANT: Surgery/Implantation (implants, bone blocks) & Therapy deduct materials
		const shouldDeductMaterial =
			preset.deductsMaterialCosts ||
			item.category === "surgery" ||
			item.category === "therapy" ||
			item.category === "pediatric" ||
			(item.materialCostKop !== undefined && item.materialCostKop > 0 && preset.deductsMaterialCosts);
		const itemMaterialCost = shouldDeductMaterial ? Math.max(0, item.materialCostKop || 0) : 0;

		const clinicalRate = input.useClinicalCategoryRates ? CLINICAL_CATEGORY_COMMISSION_PERCENT[item.category] : undefined;

		const itemCommissionPercent =
			item.customCommissionPercent ??
			input.categoryRates?.[item.category] ??
			clinicalRate ??
			(input.customBasePercentage !== undefined
				? input.customBasePercentage
				: (preset.specialtyId === "solo_practitioner" || preset.specialtyId === "solo-doctor" || preset.defaultPercentage === 100
					? preset.defaultPercentage
					: (DEFAULT_CATEGORY_COMMISSION_PERCENT[item.category] ?? (item.category === "retail_hygiene" ? preset.retailProductsPercentage : basePercent))));

		if (isFullyRefunded) {
			refundedServicesCount += 1;
			totalItemRefundsKop += item.grossRevenueKop;

			const receiptNum = item.refundReceiptNumber ?? item.receiptNumber ?? item.id;
			const reason = item.refundReasonRu ?? "Полный возврат пациенту";
			const netBaseIfPaid = Math.max(0, item.grossRevenueKop - itemLabCost - itemMaterialCost);
			const stornoComm = Math.round((netBaseIfPaid * itemCommissionPercent) / 100);
			const stornoRub = (stornoComm / 100).toLocaleString("ru-RU");

			stornoItems.push({
				id: `storno-srv-${item.id}`,
				serviceId: item.id,
				dateIso: item.refundDateIso ?? item.dateIso,
				serviceNameRu: item.serviceNameRu,
				receiptNumber: receiptNum,
				reasonRu: reason,
				refundedGrossKop: item.grossRevenueKop,
				stornoCommissionKop: stornoComm,
				labelRu: `Сторно комиссии: Возврат по чеку №${receiptNum} (-${stornoRub} ₽)`,
			});
			continue;
		}

		const effectiveGrossKop = Math.max(0, item.grossRevenueKop - refundKop);
		if (refundKop > 0) {
			refundedServicesCount += 1;
			totalItemRefundsKop += refundKop;

			const receiptNum = item.refundReceiptNumber ?? item.receiptNumber ?? item.id;
			const reason = item.refundReasonRu ?? "Частичный возврат пациенту";
			const partialStornoComm = Math.round((refundKop * itemCommissionPercent) / 100);
			const stornoRub = (partialStornoComm / 100).toLocaleString("ru-RU");

			stornoItems.push({
				id: `storno-partial-${item.id}`,
				serviceId: item.id,
				dateIso: item.refundDateIso ?? item.dateIso,
				serviceNameRu: `${item.serviceNameRu} (частично)`,
				receiptNumber: receiptNum,
				reasonRu: reason,
				refundedGrossKop: refundKop,
				stornoCommissionKop: partialStornoComm,
				labelRu: `Сторно комиссии: Возврат по чеку №${receiptNum} (-${stornoRub} ₽)`,
			});
		}

		totalGross += effectiveGrossKop;
		totalLab += itemLabCost;
		totalMaterial += itemMaterialCost;

		if (item.category === "retail_hygiene") {
			const itemRetailPercent =
				item.customCommissionPercent ??
				input.categoryRates?.retail_hygiene ??
				preset.retailProductsPercentage;
			const retailEarned = Math.round((effectiveGrossKop * itemRetailPercent) / 100);
			earnedRetail += retailEarned;
		} else {
			const netItemBase = Math.max(0, effectiveGrossKop - itemLabCost - itemMaterialCost);
			const itemEarned = Math.round((netItemBase * itemCommissionPercent) / 100);
			earnedBase += itemEarned;
		}
	}

	let explicitRefundKop = 0;
	let explicitRefundClawbackKop = 0;

	if (input.refundDeductions && input.refundDeductions.length > 0) {
		for (const ref of input.refundDeductions) {
			const assignedDoctorId = ref.performerId ?? ref.doctorId;
			if (assignedDoctorId && assignedDoctorId !== input.doctorId) {
				continue;
			}

			const refRate = ref.customCommissionPercent ?? basePercent;
			const clawbackKop = Math.round((ref.refundedGrossKop * refRate) / 100);
			explicitRefundKop += ref.refundedGrossKop;
			explicitRefundClawbackKop += clawbackKop;
			refundedServicesCount += 1;

			const receiptNum = ref.receiptNumber ?? ref.serviceId ?? "б/н";
			const stornoRub = (clawbackKop / 100).toLocaleString("ru-RU");
			const labelRu = `Сторно комиссии: Возврат по чеку №${receiptNum} (-${stornoRub} ₽)`;

			stornoItems.push({
				id: `storno-deduct-${ref.serviceId ?? `${ref.dateIso ?? input.periodEndIso}-${stornoItems.length + 1}`}`,
				serviceId: ref.serviceId,
				dateIso: ref.dateIso ?? input.periodEndIso,
				serviceNameRu: ref.serviceNameRu ?? "Возврат за ранее оплаченную услугу",
				receiptNumber: receiptNum,
				reasonRu: ref.reasonRu ?? "Возврат пациенту",
				refundedGrossKop: ref.refundedGrossKop,
				stornoCommissionKop: clawbackKop,
				labelRu,
			});
		}
	}

	const totalRefundDeductionsKop = totalItemRefundsKop + explicitRefundKop;
	const totalRefundClawbackKop = explicitRefundClawbackKop;
	const totalNetBase = Math.max(0, totalGross - totalLab - totalMaterial);

	let kpiPercent = 0;
	let kpiBadge = "Базовая ставка";
	for (const tier of KPI_BONUS_TIERS) {
		if (totalGross >= tier.minRevenueKop) {
			kpiPercent = tier.bonusPercentage;
			kpiBadge = tier.badgeLabelRu;
			break;
		}
	}

	const kpiBonusEarned = Math.round((totalNetBase * kpiPercent) / 100);
	const manualAdj = input.manualAdjustmentKop ?? 0;

	let preGuaranteePayout = earnedBase + earnedRetail + kpiBonusEarned + manualAdj - totalRefundClawbackKop;
	if (!Number.isFinite(preGuaranteePayout)) {
		preGuaranteePayout = 0;
	}

	let guaranteeApplied = false;
	if (preGuaranteePayout < preset.minGuaranteeMonthlyKop && doctorServices.length > 0) {
		preGuaranteePayout = preset.minGuaranteeMonthlyKop;
		guaranteeApplied = true;
	}

	const grossPayout = Math.max(0, preGuaranteePayout);
	// Округление НДФЛ 13% строго до целых рублей (п. 6 ст. 225 НК РФ)
	const ndfl13 = Math.round((grossPayout * 13) / 10000) * 100;
	const netToDoctor = Math.max(0, grossPayout - ndfl13);

	return {
		doctorId: input.doctorId,
		doctorName: input.doctorName,
		specialtyTitleRu: preset.titleRu,
		periodLabelRu: `${input.periodStartIso} — ${input.periodEndIso}`,
		totalGrossRevenueKop: totalGross,
		totalLabDeductionsKop: totalLab,
		totalMaterialDeductionsKop: totalMaterial,
		totalNetBaseKop: totalNetBase,
		totalRefundDeductionsKop,
		totalRefundClawbackKop,
		refundedServicesCount,
		stornoItems,
		warrantyServicesCount,
		baseCommissionPercent: basePercent,
		earnedBaseCommissionKop: earnedBase,
		kpiBonusPercent: kpiPercent,
		kpiBonusEarnedKop: kpiBonusEarned,
		kpiTierBadgeRu: kpiBadge,
		earnedRetailCommissionKop: earnedRetail,
		grossPayoutBeforeTaxKop: grossPayout,
		ndfl13TaxKop: ndfl13,
		netPayoutToDoctorKop: netToDoctor,
		minimumGuaranteeApplied: guaranteeApplied,
		manualAdjustmentKop: manualAdj,
		serviceCount: doctorServices.length,
	};
}

/**
 * Calculates assistant shift pay + piece rate bonuses
 */
export function calculateAssistantPeriodPayroll(
	assistantId: string,
	assistantName: string,
	periodLabel: string,
	shifts: readonly AssistantShiftLogItem[],
	rules: AssistantShiftRateRule = ASSISTANT_SHIFT_RULE,
): AssistantPayrollResult {
	let totalShifts = 0;
	let totalRadiographs = 0;
	let totalSurgeries = 0;
	let baseShiftPayout = 0;

	for (const shift of shifts) {
		totalShifts += 1;
		totalRadiographs += shift.radiographsTakenCount ?? 0;
		totalSurgeries += shift.surgeriesAssistedCount ?? 0;

		if (shift.shiftType === "standard_6h") {
			baseShiftPayout += rules.baseShiftRateKop;
		} else if (shift.shiftType === "full_12h") {
			baseShiftPayout += rules.baseShiftRateKop * 2;
		} else {
			baseShiftPayout += Math.round((shift.hoursWorked / 6) * rules.baseShiftRateKop);
		}
	}

	const radiographPayout = totalRadiographs * rules.radiographBonusKop;
	const surgeryPayout = totalSurgeries * rules.surgeryAssistanceBonusKop;
	const grossTotal = baseShiftPayout + radiographPayout + surgeryPayout;
	// Округление НДФЛ 13% строго до целых рублей (п. 6 ст. 225 НК РФ)
	const ndfl13 = Math.round((grossTotal * 13) / 10000) * 100;
	const netToAssistant = Math.max(0, grossTotal - ndfl13);

	return {
		assistantId,
		assistantName,
		periodLabelRu: periodLabel,
		totalShifts,
		totalRadiographs,
		totalSurgeries,
		baseShiftPayoutKop: baseShiftPayout,
		radiographPayoutKop: radiographPayout,
		surgeryPayoutKop: surgeryPayout,
		totalGrossPayoutKop: grossTotal,
		ndfl13TaxKop: ndfl13,
		netPayoutToAssistantKop: netToAssistant,
	};
}

/**
 * Generates Russian Form T-51 compatible payroll summary CSV string with UTF-8 BOM
 */
export function generatePayrollT51Csv(results: readonly DoctorPayrollResult[]): string {
	const header = "Табельный ID;Врач;Специальность;Период;Выручка (руб);Вычет Лаб (руб);Вычет Мат (руб);Базовый %;Начислено (руб);KPI %;KPI Премия (руб);НДФЛ 13% (руб);К выплате на руки (руб)\n";
	const rows = results.map((r) => {
		const grossRub = (r.totalGrossRevenueKop / 100).toFixed(2);
		const labRub = (r.totalLabDeductionsKop / 100).toFixed(2);
		const matRub = (r.totalMaterialDeductionsKop / 100).toFixed(2);
		const baseEarnedRub = (r.earnedBaseCommissionKop / 100).toFixed(2);
		const kpiEarnedRub = (r.kpiBonusEarnedKop / 100).toFixed(2);
		const taxRub = (r.ndfl13TaxKop / 100).toFixed(2);
		const netRub = (r.netPayoutToDoctorKop / 100).toFixed(2);

		return `${r.doctorId};"${r.doctorName}";"${r.specialtyTitleRu}";"${r.periodLabelRu}";${grossRub};${labRub};${matRub};${r.baseCommissionPercent}%;${baseEarnedRub};${r.kpiBonusPercent}%;${kpiEarnedRub};${taxRub};${netRub}`;
	});

	return "\uFEFF" + header + rows.join("\n");
}

/**
 * DENTE Dental CRM — Doctor & Staff Piece-Rate Payroll Calculation Engine
 * Kopeck-Exact Math, Lab & Material Deductions, KPI Tier Bonuses, Personal Income Tax (НДФЛ 13%)
 */

import {
	DOCTOR_SPECIALTY_PAYROLL_PRESETS,
	KPI_BONUS_TIERS,
	ASSISTANT_SHIFT_RULE,
	type DoctorSpecialtyCommissionRule,
	type AssistantShiftRateRule,
} from "./payrollPresets";

export interface DoctorCompletedServiceItem {
	readonly id: string;
	readonly dateIso: string;
	readonly patientName: string;
	readonly medicalCardNumber: string;
	readonly serviceNameRu: string;
	readonly order804nCode?: string | undefined;
	readonly toothCode?: string | undefined;
	readonly category: "therapy" | "orthopedics" | "surgery" | "orthodontics" | "hygiene" | "retail_hygiene";
	readonly grossRevenueKop: number;
	readonly labCostKop: number;
	readonly materialCostKop: number;
	readonly customCommissionPercent?: number | undefined;
	readonly isRefunded?: boolean | undefined;
	readonly refundedAmountKop?: number | undefined;
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
	readonly manualAdjustmentKop?: number | undefined; // e.g. advance payment deduction or bonus
	readonly manualAdjustmentNoteRu?: string | undefined;
	readonly refundDeductions?: readonly DoctorRefundDeductionItem[] | undefined;
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

/**
 * Splits a joint multi-specialist visit's services into disjoint buckets per doctor (performerId / doctorId).
 * Prevents visit revenue from being lumped entirely onto the primary visit author.
 */
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

/**
 * Filters service items belonging specifically to the target doctor.
 */
export function filterServicesForDoctor(
	services: readonly DoctorCompletedServiceItem[],
	doctorId: string
): DoctorCompletedServiceItem[] {
	return services.filter((srv) => {
		const assigned = srv.performerId ?? srv.doctorId;
		return !assigned || assigned === doctorId;
	});
}

/**
 * Calculates kopeck-exact doctor piece-rate payroll with lab/material deductions and KPI tiers
 */
export function calculateDoctorPeriodPayroll(
	input: DoctorPayrollCalculationInput
): DoctorPayrollResult {
	const defaultPreset =
		DOCTOR_SPECIALTY_PAYROLL_PRESETS.find((p) => p.specialtyId === "general_dentist") ??
		DOCTOR_SPECIALTY_PAYROLL_PRESETS[0]!;
	const preset: DoctorSpecialtyCommissionRule =
		DOCTOR_SPECIALTY_PAYROLL_PRESETS.find((p) => p.specialtyId === input.specialtyId) ??
		DOCTOR_SPECIALTY_PAYROLL_PRESETS.find(
			(p) =>
				(input.specialtyId === "solo-doctor" && p.specialtyId === "general_dentist") ||
				(input.specialtyId === "surgeon" && p.specialtyId === "surgeon_implantologist")
		) ??
		defaultPreset;

	const basePercent = input.customBasePercentage ?? preset.defaultPercentage;

	// Multi-Doctor Joint Procedure Split:
	// Only process services assigned to this doctor (or unassigned fallback to this doctor)
	const doctorServices = input.services.filter((item) => {
		const assignedDoctorId = item.performerId ?? item.doctorId;
		return !assignedDoctorId || assignedDoctorId === input.doctorId;
	});

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
		// 1. Advance deposit payments into patient's wallet are pure advance funding,
		// NOT completed healthcare delivery. Doctor commission is NOT accrued on advance deposits.
		if (item.isDepositAdvanceOnly) {
			continue;
		}

		// 2. Warranty visits & reworks (0 ₽ to patient)
		if (item.isWarrantyRework) {
			warrantyServicesCount += 1;
			// Case A: Doctor fault -> Commission is strictly 0 ₽
			// Case B: Clinic or Lab warranty -> Doctor may receive a fixed compensation if configured
			if (item.warrantyType === "clinic_warranty" || item.warrantyType === "lab_warranty") {
				const fixedComp = item.warrantyFixedCompensationKop ?? 0;
				if (fixedComp > 0) {
					earnedBase += fixedComp;
				}
			}
			// Material deduction: if explicitly marked to deduct from doctor on rework
			if (item.deductMaterialFromDoctor && item.materialCostKop > 0) {
				totalMaterial += item.materialCostKop;
			}
			continue;
		}

		// 3. Refunds and Storno
		const isFullyRefunded = item.isRefunded === true || (item.refundedAmountKop !== undefined && item.refundedAmountKop >= item.grossRevenueKop);
		const refundKop = Math.min(item.grossRevenueKop, item.refundedAmountKop ?? (item.isRefunded ? item.grossRevenueKop : 0));

		const itemCommissionPercent = item.customCommissionPercent ?? (item.category === "retail_hygiene" ? preset.retailProductsPercentage : basePercent);

		if (isFullyRefunded) {
			refundedServicesCount += 1;
			totalItemRefundsKop += item.grossRevenueKop;

			// Generate explicit storno line item for transparency
			const receiptNum = item.refundReceiptNumber ?? item.receiptNumber ?? item.id;
			const reason = item.refundReasonRu ?? "Полный возврат пациенту";
			const labDed = preset.deductsLabCosts ? item.labCostKop : 0;
			const matDed = preset.deductsMaterialCosts ? item.materialCostKop : 0;
			const netBaseIfPaid = Math.max(0, item.grossRevenueKop - labDed - matDed);
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

			// Partial refund storno
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

		const labCost = preset.deductsLabCosts ? item.labCostKop : 0;
		const materialCost = preset.deductsMaterialCosts ? item.materialCostKop : 0;

		totalLab += labCost;
		totalMaterial += materialCost;

		if (item.category === "retail_hygiene") {
			const itemRetailPercent = item.customCommissionPercent ?? preset.retailProductsPercentage;
			const retailEarned = Math.round((effectiveGrossKop * itemRetailPercent) / 100);
			earnedRetail += retailEarned;
		} else {
			const netItemBase = Math.max(0, effectiveGrossKop - labCost - materialCost);
			const itemEarned = Math.round((netItemBase * itemCommissionPercent) / 100);
			earnedBase += itemEarned;
		}
	}

	// External / historical refund deductions (clawback from previously accrued/paid services)
	let explicitRefundKop = 0;
	let explicitRefundClawbackKop = 0;

	if (input.refundDeductions && input.refundDeductions.length > 0) {
		for (const ref of input.refundDeductions) {
			const assignedDoctorId = ref.performerId ?? ref.doctorId;
			if (assignedDoctorId && assignedDoctorId !== input.doctorId) {
				continue; // Belongs to another doctor in multi-specialist clinic!
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
				id: `storno-deduct-${ref.serviceId ?? Math.random().toString(36).slice(2)}`,
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

	// KPI Bonus evaluation
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

	// Total payout before guarantee: includes earned commissions minus explicit clawbacks plus adjustments
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
	rules: AssistantShiftRateRule = ASSISTANT_SHIFT_RULE
): AssistantPayrollResult {
	let totalShifts = 0;
	let totalRadiographs = 0;
	let totalSurgeries = 0;
	let baseShiftPayout = 0;

	for (const shift of shifts) {
		totalShifts += 1;
		totalRadiographs += shift.radiographsTakenCount;
		totalSurgeries += shift.surgeriesAssistedCount;

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
 * Generates Russian T-51 compatible payroll summary CSV string with UTF-8 BOM
 */
export function generatePayrollT51Csv(results: readonly DoctorPayrollResult[]): string {
	const header = "Табельный ID;Врач;Специальность;Период;Выручка (руб);Вычет Лаб (руб);Вычет Мат (руб);Базовый %;Начислено (руб);KPI %;KPI Премия (руб);НДФЛ 13% (руб);К выплате на руки (руб);Сторно возвратов (руб)\n";
	const rows = results.map((r) => {
		const grossRub = (r.totalGrossRevenueKop / 100).toFixed(2);
		const labRub = (r.totalLabDeductionsKop / 100).toFixed(2);
		const matRub = (r.totalMaterialDeductionsKop / 100).toFixed(2);
		const baseEarnedRub = (r.earnedBaseCommissionKop / 100).toFixed(2);
		const kpiEarnedRub = (r.kpiBonusEarnedKop / 100).toFixed(2);
		const taxRub = (r.ndfl13TaxKop / 100).toFixed(2);
		const netRub = (r.netPayoutToDoctorKop / 100).toFixed(2);
		const stornoRub = (r.totalRefundClawbackKop / 100).toFixed(2);

		return `${r.doctorId};"${r.doctorName}";"${r.specialtyTitleRu}";"${r.periodLabelRu}";${grossRub};${labRub};${matRub};${r.baseCommissionPercent}%;${baseEarnedRub};${r.kpiBonusPercent}%;${kpiEarnedRub};${taxRub};${netRub};${stornoRub}`;
	});

	return "\uFEFF" + header + rows.join("\n");
}

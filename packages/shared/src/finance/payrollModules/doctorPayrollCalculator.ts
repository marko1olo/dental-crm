/**
 * packages/shared/src/finance/payrollModules/doctorPayrollCalculator.ts
 * Main calculation engine for doctor piece-rate payroll, stornos, and taxes.
 * Mandate 8b: <= 120 lines.
 */

import type { DoctorPayrollCalculationInput, DoctorPayrollResult } from "./payrollTypes.js";
import { filterServicesForDoctor, resolveDoctorPreset } from "./doctorFilterAndResolver.js";
import { processDoctorServiceItems } from "./doctorServiceItemCalculator.js";
import { processExplicitRefundDeductions } from "./doctorRefundProcessor.js";
import { applyMinimumGuarantee, computeChairRental, computeKpiBonus } from "./doctorRentalAndBonusEngine.js";
import { calculateProgressiveNdflTax } from "./progressiveNdflCalculator.js";
import { percentageOfKopecks, type Kopecks } from "../../money.js";

export function calculateDoctorPeriodPayroll(
	input: DoctorPayrollCalculationInput
): DoctorPayrollResult {
	const preset = resolveDoctorPreset(input.specialtyId);
	const basePercent = input.customBasePercentage ?? preset.defaultPercentage;
	const doctorServices = filterServicesForDoctor(input.services, input.doctorId);

	const serviceSummary = processDoctorServiceItems(doctorServices, preset, input, basePercent);
	const explicitRefundSummary = processExplicitRefundDeductions(
		input.refundDeductions,
		input.doctorId,
		basePercent,
		input.periodEndIso,
		serviceSummary.stornoItems.length,
		serviceSummary.stornoItems,
	);

	const isChairRental = input.payoutModel === "chair_rental";
	const chairRentalMode = input.chairRentalMode ?? "fixed";
	const rawNetBase = Math.max(0, serviceSummary.totalGross - serviceSummary.totalLab - serviceSummary.totalMaterial);

	const { chairRentalKop, totalNetBase } = computeChairRental(
		rawNetBase,
		isChairRental,
		chairRentalMode,
		input.chairRentalSplitDoctorPercent,
		input.chairRentalKop,
	);

	const totalRefundDeductionsKop = serviceSummary.totalItemRefundsKop + explicitRefundSummary.explicitRefundKop;
	const totalRefundClawbackKop = explicitRefundSummary.explicitRefundClawbackKop;
	const allStornoItems = [...serviceSummary.stornoItems, ...explicitRefundSummary.stornoItems];
	const totalRefundedCount = serviceSummary.refundedServicesCount + explicitRefundSummary.refundedCount;

	const { kpiPercent, kpiBadge, kpiBonusEarned } = computeKpiBonus(serviceSummary.totalGross, totalNetBase, isChairRental, chairRentalMode);
	const manualAdj = input.manualAdjustmentKop ?? 0;
	const earnedBaseCommission = isChairRental ? totalNetBase : serviceSummary.earnedBase;

	let guaranteeRatio = 1;
	if (typeof input.guaranteeDaysRatio === "number") {
		guaranteeRatio = input.guaranteeDaysRatio;
	} else if (input.periodStartIso && input.periodEndIso) {
		const startMs = Date.parse(input.periodStartIso);
		const endMs = Date.parse(input.periodEndIso);
		if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs >= startMs) {
			const startDate = new Date(startMs);
			const diffDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1);
			const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate() || 30;
			if (diffDays < daysInMonth) {
				guaranteeRatio = diffDays / daysInMonth;
			}
		}
	}

	const unallocatedLabDeduction = Math.max(0, input.unallocatedLabKop ?? 0);
	const preGuaranteePayout = earnedBaseCommission + serviceSummary.earnedRetail + kpiBonusEarned + manualAdj - totalRefundClawbackKop - unallocatedLabDeduction;
	const { grossPayout, guaranteeApplied } = applyMinimumGuarantee(
		preGuaranteePayout,
		preset.minGuaranteeMonthlyKop,
		isChairRental,
		doctorServices.length,
		input.applyMinimumGuarantee === true,
		guaranteeRatio,
	);

	const isSoloOrSelfEmployed = isChairRental || input.taxRegime === "self_employed" ||
		(input.taxRegime === undefined && (input.isSoloDoctor === true || preset.specialtyId === "solo_practitioner" || preset.specialtyId === "solo-doctor"));

	const ndflCalculation = isSoloOrSelfEmployed
		? { ndfl13TaxKop: 0, ndfl15TaxKop: 0, ndflTaxKop: 0, isProgressiveApplied: false }
		: calculateProgressiveNdflTax(grossPayout, input.cumulativeYtdGrossKop ?? 0);

	const priorDebtCarryOverKop = Math.max(0, Math.round(input.priorDebtCarryOverKop ?? 0));
	const netAfterTaxKop = Math.max(0, grossPayout - ndflCalculation.ndflTaxKop);
	const priorDebtDeductedKop = Math.min(netAfterTaxKop, priorDebtCarryOverKop);
	const netToDoctor = Math.max(0, netAfterTaxKop - priorDebtDeductedKop);
	const advancePayoutKop = Math.max(0, Math.round(input.advancePayoutKop ?? 0));
	const preGuaranteeDeficitKop = !guaranteeApplied && preGuaranteePayout < 0 ? preGuaranteePayout : 0;
	const signedNetBalanceKop =
		preGuaranteeDeficitKop < 0
			? preGuaranteeDeficitKop - advancePayoutKop - priorDebtCarryOverKop
			: netAfterTaxKop - priorDebtCarryOverKop - advancePayoutKop;
	const negativeCarryOverKop = signedNetBalanceKop < 0 ? -signedNetBalanceKop : 0;
	const mainPayoutKop = Math.max(0, signedNetBalanceKop);
	const npd6TaxKop = isSoloOrSelfEmployed ? percentageOfKopecks(grossPayout as Kopecks, 600) : 0;

	return {
		doctorId: input.doctorId,
		doctorName: input.doctorName,
		specialtyTitleRu: isChairRental && (preset.specialtyId === "solo_practitioner" || preset.specialtyId === "solo-doctor")
			? "Врач-стоматолог (Аренда кресла / Соло)"
			: preset.titleRu,
		periodLabelRu: `${input.periodStartIso} — ${input.periodEndIso}`,
		identSalaryModel: input.identSalaryModel ?? "net_proportional_discount",
		cashAdvancePolicy: input.cashAdvancePolicy ?? "proportional",
		serviceSalaryPriceKop: serviceSummary.totalSalaryPriceKop,
		priorDebtDeductedKop,
		negativeCarryOverKop,
		signedNetBalanceKop,
		taxRegime: isSoloOrSelfEmployed ? "self_employed" : "employee",
		payoutModel: isChairRental ? "chair_rental" : "percentage",
		chairRentalMode: isChairRental ? chairRentalMode : undefined,
		chairRentalKop,
		advancePayoutKop,
		mainPayoutKop,
		npd6TaxKop,
		totalGrossRevenueKop: serviceSummary.totalGross,
		totalLabDeductionsKop: serviceSummary.totalLab + unallocatedLabDeduction,
		unallocatedLabDeductionsKop: unallocatedLabDeduction,
		totalMaterialDeductionsKop: serviceSummary.totalMaterial,
		totalNetBaseKop: totalNetBase,
		totalRefundDeductionsKop,
		totalRefundClawbackKop,
		refundedServicesCount: totalRefundedCount,
		stornoItems: allStornoItems,
		warrantyServicesCount: serviceSummary.warrantyServicesCount,
		baseCommissionPercent: isChairRental ? 100 : basePercent,
		earnedBaseCommissionKop: earnedBaseCommission,
		kpiBonusPercent: kpiPercent,
		kpiBonusEarnedKop: kpiBonusEarned,
		kpiTierBadgeRu: kpiBadge,
		earnedRetailCommissionKop: serviceSummary.earnedRetail,
		grossPayoutBeforeTaxKop: grossPayout,
		ndfl13TaxKop: ndflCalculation.ndfl13TaxKop,
		ndfl15TaxKop: ndflCalculation.ndfl15TaxKop,
		ndflTaxKop: ndflCalculation.ndflTaxKop,
		isProgressiveTaxApplied: ndflCalculation.isProgressiveApplied,
		overheadConsumablesCoveredKop: serviceSummary.totalOverheadCovered,
		netPayoutToDoctorKop: netToDoctor,
		minimumGuaranteeApplied: guaranteeApplied,
		manualAdjustmentKop: manualAdj,
		serviceCount: doctorServices.length,
	};
}

/**
 * doctorProductionSalaryEngine.ts — Doctor Piecework & Production Salary Engine (Mandate 8b, <= 120 lines).
 * First Principles: Net Base = Gross − Lab (ЗТЛ) − Expensive Materials (Импланты).
 * Layer 2: Pure Domain Logic & Calculation Engines.
 */

import type { Kopecks } from "../../money.js";
import { kopecksToRub as kopecksToRubles } from "../../fiscal/kopecksArithmetic.js";
import {
	type DoctorSalaryCalculationInput,
	type DoctorSalaryCalculationResult,
	type IdentDoctorSalaryCalculationParams,
	type IdentDoctorSalaryCalculationResult,
	DOCTOR_SALARY_MODEL_NAMES_RU,
} from "./types.js";
import { toKop, calculateDiscountSalaryBase } from "./taxAndDeductionMath.js";
import { extractDeductibleMaterialsFromWriteoff } from "./labCostDeductionEngine.js";

/**
 * Рассчитывает сдельную заработную плату врача по 3 доменным моделям:
 * 1. Gross (без вычета ЗТЛ и материалов)
 * 2. Net (за вычетом ЗТЛ и спец. материалов Уровня 2, защищая накладные расходники ст. 129 ТК РФ)
 * 3. Cash Basis (по факту денег в кассе с поддержкой «Цены для ЗП» и 4 политик скидки)
 */
export function calculateDoctorSalary(
	params: DoctorSalaryCalculationInput,
): DoctorSalaryCalculationResult {
	const grossRevenueKop = toKop(params.grossRevenueRub, params.grossRevenueKop);
	const rawInvoiceTotal = toKop(params.invoiceTotalRub, params.invoiceTotalKop);
	const invoiceTotalKop = rawInvoiceTotal > 0 ? rawInvoiceTotal : grossRevenueKop;

	let expensiveMaterialsCostKop = toKop(params.expensiveMaterialsCostRub, params.expensiveMaterialsCostKop);
	let overheadMaterialsCostKop = toKop(params.overheadMaterialsCostRub, params.overheadMaterialsCostKop);

	if (params.materialWriteoffResult) {
		const extracted = extractDeductibleMaterialsFromWriteoff(params.materialWriteoffResult);
		if (expensiveMaterialsCostKop === 0) expensiveMaterialsCostKop = extracted.expensiveClinicalCostKop;
		if (overheadMaterialsCostKop === 0) overheadMaterialsCostKop = extracted.cheapOverheadCostKop;
	}

	const labCostKop = toKop(params.labCostRub, params.labCostKop);
	const salaryPriceKop = toKop(params.salaryPriceRub, params.salaryPriceKop);
	const fixedSalaryKop = toKop(params.fixedSalaryRub, params.fixedSalaryKop);
	const bonusesKop = toKop(params.bonusesRub, params.bonusesKop);
	const penaltiesKop = toKop(params.penaltiesRub, params.penaltiesKop);
	const doctorPercent = Math.max(0, Math.min(100, params.doctorPercent));
	const salaryPriceApp = params.salaryPriceApplication ?? "flat_addition";
	const discountPolicy = params.discountPolicy ?? "proportional";

	let effectiveBaseKop = 0 as Kopecks;
	let pieceworkAccruedKop = 0 as Kopecks;
	let salaryPriceAdditionKop = 0 as Kopecks;
	let deductedLabKop = 0 as Kopecks;
	let deductedExpensiveMaterialsKop = 0 as Kopecks;
	let paidRatio = 1.0;
	let deferredPendingDoctorEarningsKop = 0 as Kopecks;

	const baseCandidate = (salaryPriceApp === "replaces_gross_base" && salaryPriceKop > 0) ? salaryPriceKop : grossRevenueKop;

	if (params.model === "gross") {
		effectiveBaseKop = Math.max(0, baseCandidate) as Kopecks;
		pieceworkAccruedKop = Math.round((effectiveBaseKop * doctorPercent) / 100) as Kopecks;
		salaryPriceAdditionKop = salaryPriceApp === "flat_addition" ? salaryPriceKop : 0 as Kopecks;
	} else if (params.model === "net") {
		deductedLabKop = labCostKop;
		deductedExpensiveMaterialsKop = expensiveMaterialsCostKop;
		effectiveBaseKop = Math.max(0, baseCandidate - labCostKop - expensiveMaterialsCostKop) as Kopecks;
		pieceworkAccruedKop = Math.round((effectiveBaseKop * doctorPercent) / 100) as Kopecks;
		salaryPriceAdditionKop = salaryPriceApp === "flat_addition" ? salaryPriceKop : 0 as Kopecks;
	} else {
		// cash_basis
		const paidAmountKop = toKop(params.paidAmountRub, params.paidAmountKop);
		paidRatio = invoiceTotalKop > 0 ? Math.min(1, Math.max(0, paidAmountKop / invoiceTotalKop)) : 1.0;
		const clinicCostsKop = (labCostKop + expensiveMaterialsCostKop) as Kopecks;
		const discountResult = calculateDiscountSalaryBase({
			grossRevenueKop: baseCandidate, invoiceTotalKop, paidKop: paidAmountKop,
			discountKop: Math.max(0, baseCandidate - invoiceTotalKop) as Kopecks, clinicCostsKop, policy: discountPolicy,
		});
		effectiveBaseKop = discountResult.doctorBaseKop;
		pieceworkAccruedKop = Math.round((effectiveBaseKop * doctorPercent) / 100) as Kopecks;
		salaryPriceAdditionKop = salaryPriceApp === "flat_addition" ? Math.round(salaryPriceKop * paidRatio) as Kopecks : 0 as Kopecks;
		deductedLabKop = labCostKop;
		deductedExpensiveMaterialsKop = expensiveMaterialsCostKop;

		const fullDiscountRes = calculateDiscountSalaryBase({
			grossRevenueKop: baseCandidate, invoiceTotalKop, paidKop: invoiceTotalKop,
			discountKop: Math.max(0, baseCandidate - invoiceTotalKop) as Kopecks, clinicCostsKop, policy: discountPolicy,
		});
		const potentialTotalAt100 = (Math.round((fullDiscountRes.doctorBaseKop * doctorPercent) / 100) + (salaryPriceApp === "flat_addition" ? salaryPriceKop : 0)) as Kopecks;
		deferredPendingDoctorEarningsKop = Math.max(0, potentialTotalAt100 - (pieceworkAccruedKop + salaryPriceAdditionKop)) as Kopecks;
	}

	let oneTimeDeductionsTotalKop = 0 as Kopecks;
	if (params.oneTimeDeductions) {
		for (const d of params.oneTimeDeductions) oneTimeDeductionsTotalKop = (oneTimeDeductionsTotalKop + Math.max(0, d.amountKop)) as Kopecks;
	}
	const grossDoctorEarningsKop = (pieceworkAccruedKop + salaryPriceAdditionKop) as Kopecks;
	const effectivePieceworkKop = Math.max(0, grossDoctorEarningsKop - oneTimeDeductionsTotalKop) as Kopecks;
	const effectiveBonusesKop = Math.max(0, bonusesKop - penaltiesKop) as Kopecks;
	const totalAccruedKop = Math.max(0, effectivePieceworkKop + fixedSalaryKop + effectiveBonusesKop) as Kopecks;

	const ndflRatePercent = params.ndflRatePercent !== undefined ? Math.max(0, params.ndflRatePercent) : 13;
	const ndflTaxKop = Math.round((totalAccruedKop * ndflRatePercent) / 100) as Kopecks;
	const netPayoutKop = Math.max(0, totalAccruedKop - ndflTaxKop) as Kopecks;

	return {
		model: params.model, modelNameRu: DOCTOR_SALARY_MODEL_NAMES_RU[params.model],
		grossRevenueKop, grossRevenueRub: kopecksToRubles(grossRevenueKop),
		effectiveBaseKop, effectiveBaseRub: kopecksToRubles(effectiveBaseKop),
		appliedPercent: doctorPercent, pieceworkAccruedKop, pieceworkAccruedRub: kopecksToRubles(pieceworkAccruedKop),
		salaryPriceAdditionKop, salaryPriceAdditionRub: kopecksToRubles(salaryPriceAdditionKop),
		fixedSalaryKop, fixedSalaryRub: kopecksToRubles(fixedSalaryKop),
		bonusesKop, bonusesRub: kopecksToRubles(bonusesKop),
		penaltiesKop, penaltiesRub: kopecksToRubles(penaltiesKop),
		effectiveBonusesKop, effectiveBonusesRub: kopecksToRubles(effectiveBonusesKop),
		oneTimeDeductionsTotalKop, oneTimeDeductionsTotalRub: kopecksToRubles(oneTimeDeductionsTotalKop),
		totalAccruedKop, totalAccruedRub: kopecksToRubles(totalAccruedKop),
		ndflTaxKop, ndflTaxRub: kopecksToRubles(ndflTaxKop),
		netPayoutKop, netPayoutRub: kopecksToRubles(netPayoutKop),
		deferredPendingDoctorEarningsKop, deferredPendingDoctorEarningsRub: kopecksToRubles(deferredPendingDoctorEarningsKop),
		paidRatio, deductedLabKop, deductedLabRub: kopecksToRubles(deductedLabKop),
		deductedExpensiveMaterialsKop, deductedExpensiveMaterialsRub: kopecksToRubles(deductedExpensiveMaterialsKop),
		coveredOverheadMaterialsKop: overheadMaterialsCostKop, coveredOverheadMaterialsRub: kopecksToRubles(overheadMaterialsCostKop),
	};
}

/** @deprecated Use calculateDoctorSalary (Mandate 8ap) */
export const calculateIdentDoctorSalary = calculateDoctorSalary;

/**
 * packages/shared/src/finance/payrollModules/identSalaryModelHelper.ts
 * IDENT 3 payroll models (1, 2A, 2B), salary_price priority & 3 cash advance policies.
 * Pure BigInt kopeck arithmetic (Mandate 8bm / 8be). <= 120 lines.
 */

import type {
	CashAdvanceAllocationPolicy,
	DoctorCompletedServiceItem,
	IdentSalaryModel,
} from "./payrollTypes.js";

export interface IdentItemBasisResult {
	readonly shouldInclude: boolean;
	readonly salaryBaseConfiguredKop: number;
	readonly effectiveGrossKop: number;
	readonly actualPaidKop: number;
}

function roundRatioBigInt(numerator: number, multiplier: number, denominator: number): number {
	if (denominator <= 0 || numerator <= 0 || multiplier <= 0) return 0;
	const bigNum = BigInt(Math.round(numerator)) * BigInt(Math.round(multiplier));
	const bigDen = BigInt(Math.round(denominator));
	return Number((bigNum + bigDen / 2n) / bigDen);
}

export function resolveIdentItemBasis(
	item: DoctorCompletedServiceItem,
	identSalaryModel: IdentSalaryModel,
	cashAdvancePolicy: CashAdvanceAllocationPolicy,
): IdentItemBasisResult {
	const grossRevenueKop = Math.max(0, Math.round(item.grossRevenueKop));
	const discountKop = Math.max(0, Math.round(item.discountKop ?? 0));
	const listPriceKop = Math.max(grossRevenueKop + discountKop, Math.round(item.listPriceKop ?? (grossRevenueKop + discountKop)));
	const hasSalaryPrice = typeof item.salaryPriceKop === "number" && Number.isFinite(item.salaryPriceKop) && item.salaryPriceKop >= 0;
	const salaryPriceKop = hasSalaryPrice ? Math.round(item.salaryPriceKop ?? 0) : listPriceKop;

	const rawPaidKop = item.actuallyPaidGrossKop !== undefined
		? Math.max(0, Math.round(item.actuallyPaidGrossKop))
		: (item.paidAmountKop !== undefined
			? Math.max(0, Math.min(grossRevenueKop, Math.round(item.paidAmountKop)))
			: grossRevenueKop);

	if (identSalaryModel === "gross_before_discount") {
		const isFullyRefunded = item.isRefunded === true || (item.refundedAmountKop !== undefined && item.refundedAmountKop >= grossRevenueKop && grossRevenueKop > 0);
		if (isFullyRefunded) {
			return { shouldInclude: true, salaryBaseConfiguredKop: salaryPriceKop, effectiveGrossKop: 0, actualPaidKop: rawPaidKop || grossRevenueKop };
		}
		const refundKop = Math.min(grossRevenueKop, Math.max(0, Math.round(item.refundedAmountKop ?? 0)));
		const effectiveGrossKop = refundKop > 0 && grossRevenueKop > 0
			? roundRatioBigInt(salaryPriceKop, Math.max(0, grossRevenueKop - refundKop), grossRevenueKop)
			: salaryPriceKop;
		return {
			shouldInclude: true,
			salaryBaseConfiguredKop: salaryPriceKop,
			effectiveGrossKop,
			actualPaidKop: rawPaidKop,
		};
	}

	if (item.isPaid === false || item.isDebt === true || item.invoiceStatus === "unpaid") {
		return { shouldInclude: false, salaryBaseConfiguredKop: salaryPriceKop, effectiveGrossKop: 0, actualPaidKop: 0 };
	}

	if (rawPaidKop <= 0 && grossRevenueKop > 0) {
		return { shouldInclude: false, salaryBaseConfiguredKop: salaryPriceKop, effectiveGrossKop: 0, actualPaidKop: 0 };
	}

	return {
		shouldInclude: true,
		salaryBaseConfiguredKop: salaryPriceKop,
		effectiveGrossKop: salaryPriceKop,
		actualPaidKop: rawPaidKop,
	};
}

export function computeEffectiveDoctorBaseAfterRefund(params: {
	readonly item: DoctorCompletedServiceItem;
	readonly identSalaryModel: IdentSalaryModel;
	readonly cashAdvancePolicy: CashAdvanceAllocationPolicy;
	readonly salaryPriceKop: number;
	readonly actualPaidKop: number;
	readonly refundKop: number;
}): number {
	const { item, identSalaryModel, cashAdvancePolicy, salaryPriceKop, actualPaidKop, refundKop } = params;
	const grossRevenueKop = Math.max(0, Math.round(item.grossRevenueKop));
	const discountKop = Math.max(0, Math.round(item.discountKop ?? 0));
	const listPriceKop = Math.max(grossRevenueKop + discountKop, Math.round(item.listPriceKop ?? (grossRevenueKop + discountKop)));
	const netPaidKop = Math.max(0, actualPaidKop - refundKop);

	if (identSalaryModel === "gross_before_discount") {
		if (refundKop > 0 && grossRevenueKop > 0) {
			return roundRatioBigInt(salaryPriceKop, Math.max(0, grossRevenueKop - refundKop), grossRevenueKop);
		}
		return salaryPriceKop;
	}

	const baseAfterDiscount = identSalaryModel === "net_doctor_bears_discount"
		? Math.max(0, salaryPriceKop - discountKop)
		: (listPriceKop > 0
			? roundRatioBigInt(salaryPriceKop, Math.max(0, listPriceKop - discountKop), listPriceKop)
			: salaryPriceKop);

	if (grossRevenueKop <= 0) return baseAfterDiscount;
	if (netPaidKop >= grossRevenueKop) return baseAfterDiscount;

	if (cashAdvancePolicy === "clinic_first") {
		const clinicCostKop = Math.max(0, listPriceKop - salaryPriceKop);
		return Math.min(baseAfterDiscount, Math.max(0, netPaidKop - clinicCostKop));
	}
	if (cashAdvancePolicy === "doctor_first") {
		return Math.min(netPaidKop, baseAfterDiscount);
	}
	return roundRatioBigInt(baseAfterDiscount, netPaidKop, grossRevenueKop);
}

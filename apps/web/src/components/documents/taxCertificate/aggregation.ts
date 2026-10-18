import {
	resolveTaxDeductionCategoryShared,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024,
	extractTaxYearFromDate,
} from "@dental/shared";
import type { TaxPaymentRecord, TaxYearAggregation } from "./types";

export function isPaymentRefund(payment: TaxPaymentRecord): boolean {
	if (payment.isRefund === true || payment.isReturn === true) return true;
	if (payment.status === "refunded" || payment.status === "returned") return true;
	if (typeof payment.amountRub === "number" && payment.amountRub < 0) return true;
	if (typeof payment.amountKopecks === "number" && payment.amountKopecks < 0) return true;
	const s = (payment.serviceName || "").toLowerCase();
	return s.includes("возврат") || s.includes("возврат средств");
}

export function aggregatePatientPaymentsForTaxYear(
	payments: readonly TaxPaymentRecord[],
	taxYear: number,
): TaxYearAggregation {
	let code01PosKopecks = 0;
	let code01RefKopecks = 0;
	let code02PosKopecks = 0;
	let code02RefKopecks = 0;
	let totalGrossKopecks = 0;
	let refundedKopecks = 0;
	let receiptsCount = 0;
	const yearPayments: TaxPaymentRecord[] = [];

	for (const p of payments) {
		const year = extractTaxYearFromDate(p.dateIso);
		if (isNaN(year) || year !== taxYear) continue;

		const rawKopecks =
			typeof p.amountKopecks === "number" && Number.isFinite(p.amountKopecks)
				? Math.round(p.amountKopecks)
				: Number.isFinite(p.amountRub)
					? Math.round(p.amountRub * 100)
					: 0;

		const isRefund = isPaymentRefund(p);
		const absKopecks = Math.abs(rawKopecks);
		const category = p.taxCode || resolveTaxDeductionCategoryShared(p.code804n, p.serviceName);

		if (isRefund) {
			refundedKopecks += absKopecks;
			if (category === "2") code02RefKopecks += absKopecks;
			else code01RefKopecks += absKopecks;
		} else {
			totalGrossKopecks += absKopecks;
			receiptsCount += 1;
			if (category === "2") code02PosKopecks += absKopecks;
			else code01PosKopecks += absKopecks;
			yearPayments.push(p);
		}
	}

	const code01Kopecks = Math.max(0, code01PosKopecks - code01RefKopecks);
	const code02Kopecks = Math.max(0, code02PosKopecks - code02RefKopecks);
	const totalNetKopecks = code01Kopecks + code02Kopecks;
	const statutoryLimitRub =
		taxYear >= 2024
			? ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024
			: ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024;
	const statutoryLimitKopecks = statutoryLimitRub * 100;
	const eligibleCode01Kopecks = Math.min(code01Kopecks, statutoryLimitKopecks);
	const estimatedRefund13Kopecks =
		Math.round((eligibleCode01Kopecks * 13) / 100) +
		Math.round((code02Kopecks * 13) / 100);

	return {
		taxYear,
		code01Kopecks,
		code01Rub: code01Kopecks / 100,
		code02Kopecks,
		code02Rub: code02Kopecks / 100,
		totalNetKopecks,
		totalNetRub: totalNetKopecks / 100,
		totalGrossKopecks,
		refundedKopecks,
		eligibleCode01Kopecks,
		eligibleCode01Rub: eligibleCode01Kopecks / 100,
		estimatedRefund13Kopecks,
		estimatedRefund13Rub: estimatedRefund13Kopecks / 100,
		receiptsCount,
		payments: yearPayments,
	};
}

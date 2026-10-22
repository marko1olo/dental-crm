import { useMemo } from "react";
import type { TaxDeductionPaymentItem, TaxDeductionYearSummary, TaxDeductionCertificateParams } from "../taxDeductionEngine";
import { calculateTaxDeductionSummary, generateFnsTaxDeductionXml, generateTaxCertificateQrSvg, validateRussianInn, validateRussianPassport } from "../taxDeductionEngine";

export interface CalculationParams {
	readonly isOpen: boolean;
	readonly effectivePayments: readonly TaxDeductionPaymentItem[];
	readonly selectedYear: number;
	readonly isManualAdjustment: boolean;
	readonly manualCode01Rub: string;
	readonly manualCode02Rub: string;
	readonly payerInn: string;
	readonly passportSeries: string;
	readonly passportNumber: string;
	readonly getCertificateParams: () => TaxDeductionCertificateParams;
}

export function useTaxDeductionCalculation(p: CalculationParams) {
	const { isOpen, effectivePayments, selectedYear, isManualAdjustment, manualCode01Rub, manualCode02Rub, payerInn, passportSeries, passportNumber, getCertificateParams } = p;

	const innValidation = useMemo(() => validateRussianInn(payerInn), [payerInn]);
	const passportValidation = useMemo(() => validateRussianPassport(`${passportSeries}${passportNumber}`), [passportSeries, passportNumber]);

	const calculationResult = useMemo(() => {
		if (!isOpen) return { yearsSummary: [], grandTotalCode01Rub: 0, grandTotalCode01Kopecks: 0, grandTotalCode02Rub: 0, grandTotalCode02Kopecks: 0, grandTotalRub: 0, grandTotalKopecks: 0, grandTotalRefund13Rub: 0, grandTotalRefund15Rub: 0, totalReceiptsCount: 0, totalAmountInWordsRu: "" };
		return calculateTaxDeductionSummary(effectivePayments);
	}, [isOpen, effectivePayments]);

	const targetYearSummary: TaxDeductionYearSummary = useMemo(() => {
		const emptySummary: TaxDeductionYearSummary = { taxYear: selectedYear, code01Rub: 0, code01Kopecks: 0, code02Rub: 0, code02Kopecks: 0, totalRub: 0, totalKopecks: 0, receiptsCount: 0, code01StatutoryLimitRub: selectedYear >= 2024 ? 150000 : 120000, code01StatutoryLimitKopecks: (selectedYear >= 2024 ? 150000 : 120000) * 100, code01EligibleRub: 0, code01EligibleKopecks: 0, refund13EstimateRub: 0, refund13EstimateKopecks: 0, refund15EstimateRub: 0, refund15EstimateKopecks: 0 };
		if (!isOpen) return emptySummary;
		const base = calculationResult.yearsSummary.find((y) => y.taxYear === selectedYear) || emptySummary;
		if (!isManualAdjustment) return base;
		const c1 = Math.max(0, Number(manualCode01Rub) || 0);
		const c2 = Math.max(0, Number(manualCode02Rub) || 0);
		const limit = selectedYear >= 2024 ? 150000 : 120000;
		const eligibleC1 = Math.min(c1, limit);
		const refund13 = Math.round((eligibleC1 + c2) * 0.13);
		const refund15 = Math.round((eligibleC1 + c2) * 0.15);
		const total = c1 + c2;
		return { ...base, code01Rub: c1, code01Kopecks: Math.round(c1 * 100), code02Rub: c2, code02Kopecks: Math.round(c2 * 100), totalRub: total, totalKopecks: Math.round(total * 100), code01EligibleRub: eligibleC1, code01EligibleKopecks: Math.round(eligibleC1 * 100), refund13EstimateRub: refund13, refund13EstimateKopecks: Math.round(refund13 * 100), refund15EstimateRub: refund15, refund15EstimateKopecks: Math.round(refund15 * 100) };
	}, [isOpen, calculationResult, selectedYear, isManualAdjustment, manualCode01Rub, manualCode02Rub]);

	const xmlRepresentation = useMemo(() => isOpen ? generateFnsTaxDeductionXml(getCertificateParams()) : { fileName: "", xmlContent: "" }, [isOpen, getCertificateParams]);
	const qrSvgString = useMemo(() => {
		if (!isOpen) return "";
		const rawSvg = generateTaxCertificateQrSvg(getCertificateParams(), { size: 120, margin: 1 });
		return rawSvg.replace(/fill="#ffffff"/gi, 'fill="var(--paper, #ffffff)"').replace(/fill="#000000"/gi, 'fill="var(--ink, #0f172a)"');
	}, [isOpen, getCertificateParams]);

	return { innValidation, passportValidation, calculationResult, targetYearSummary, xmlRepresentation, qrSvgString };
}

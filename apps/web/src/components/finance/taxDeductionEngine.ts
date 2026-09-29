/**
 * DENTE Dental CRM — Web Tax Deduction Certificate & FNS 824@ Registry Engine.
 *
 * Implements strict compliance with:
 * 1. FNS Order No. EA-7-11/824@ (Certificate Form KND 1151156 & Electronic Registry KND 1184043, Format 5.01).
 * 2. Article 219 of the Tax Code of the Russian Federation (Personal Income Tax Social Deduction).
 * 3. Strict Calendar Year Isolation (01.01–31.12).
 * 4. Net Paid Calculation: Subtracting partial refunds (e.g. 100k paid - 20k refunded = 80k net reported)
 *    separated strictly by Code 1 (standard, statutory limits 150k/120k) and Code 2 (expensive treatment, unlimited).
 * 5. Mandate 8b: Integer kopeck precision without floating-point drift or discrepancies in words.
 */

export {
	amountToWordsRu,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024,
	classifyTaxDeduction804n,
	EXPENSIVE_TREATMENT_804N_CODES,
	FNS_FORMAT_VERSION_501,
	FNS_ORDER_824_NAME,
	generateFnsTaxDeductionBatchXml,
	generateQrCodeDataUri,
	generateQrCodeSvg,
	generateTaxCertificateQrDataUri,
	generateTaxCertificateQrPayload,
	generateTaxCertificateQrSvg,
	KND_CERTIFICATE_FORM,
	KND_REGISTRY_ELECTRONIC_FORMAT,
	resolveTaxDeductionCategoryShared,
	TAX_DEDUCTION_RELATIONSHIP_MAP,
	type TaxDeductionBatchParams,
	type TaxDeductionCalculationResult,
	type TaxDeductionCertificateParams,
	type TaxDeductionClinicParams,
	type TaxDeductionPaymentItem,
	type TaxDeductionPersonParams,
	type TaxDeductionRelationship,
	type TaxDeductionYearSummary,
	validateInnIndividual,
	validateInnLegalEntity,
	validateRussianInn,
	validateRussianKpp,
	validateRussianOgrn,
	validateRussianPassport,
	validateRussianSnils,
	generateCode128Svg,
	generateFnsFormKnd1151156BarcodeSvg,
	generateFnsBatchNoMedoplXml,
	renderOfficialTaxCertificateBatchKnd1151156Html,
	type FamilyMemberPayerConfig,
	type GenerateFamilyTaxDeductionBatchOptions,
	type FamilyTaxDeductionBatchResult,
	type FamilyMemberBatchCertificateSummary,
} from "@dental/shared";

import {
	amountToWordsRu,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024,
	generateFamilyTaxDeductionBatch as sharedGenerateFamilyTaxDeductionBatch,
	type GenerateFamilyTaxDeductionBatchOptions,
	type FamilyTaxDeductionBatchResult,
	generateFnsNoMedoplXml as sharedGenerateFnsNoMedoplXml,
	generateFnsTaxDeductionBatchXml,
	generateFnsBatchNoMedoplXml,
	generateFnsTaxDeductionXml as sharedGenerateFnsTaxDeductionXml,
	renderOfficialTaxCertificateKnd1151156Html as sharedRenderOfficialTaxCertificateKnd1151156Html,
	renderOfficialTaxCertificateBatchKnd1151156Html,
	resolveTaxDeductionCategoryShared,
	type TaxDeductionBatchParams,
	type TaxDeductionCalculationResult,
	type TaxDeductionCertificateParams,
	type TaxDeductionPaymentItem,
	type TaxDeductionYearSummary,
} from "@dental/shared";

/**
 * Checks whether a payment item represents a refund or returned funds.
 */
export function isTaxDeductionRefund(
	p: TaxDeductionPaymentItem & {
		isRefund?: boolean | undefined;
		operationType?: string | undefined;
		isReturn?: boolean | undefined;
		status?: string | undefined;
	}
): boolean {
	if (p.isRefund === true) return true;
	if (p.isReturn === true) return true;
	if (p.operationType === "refund" || p.operationType === "return") return true;
	if (p.status === "refunded" || p.status === "returned") return true;
	if (typeof p.amountRub === "number" && p.amountRub < 0) return true;
	if (typeof p.amountKopecks === "number" && p.amountKopecks < 0) return true;
	const sName = (p.serviceName || "").toLowerCase();
	if (sName.startsWith("возврат") || sName.includes("возврат средств")) return true;
	return false;
}

/**
 * Extracts absolute integer kopecks from a payment item.
 */
export function getTaxDeductionAbsKopecks(p: TaxDeductionPaymentItem): number {
	if (typeof p.amountKopecks === "number" && Number.isFinite(p.amountKopecks)) {
		return Math.abs(Math.round(p.amountKopecks));
	}
	if (typeof p.amountRub === "number" && Number.isFinite(p.amountRub)) {
		return Math.abs(Math.round(p.amountRub * 100));
	}
	return 0;
}

/**
 * Normalizes payment items for a specific tax year by subtracting refunds from
 * corresponding Code 1 or Code 2 categories so that reported sums reflect strictly Net Paid amounts.
 */
export function normalizePaymentsForTaxCertificate(
	payments: readonly TaxDeductionPaymentItem[],
	targetYear: number
): TaxDeductionPaymentItem[] {
	// Filter strictly for the target calendar year (01.01 - 31.12)
	const yearPayments = payments.filter((p) => {
		const parsed = new Date(p.dateIso);
		return !Number.isNaN(parsed.getTime()) && parsed.getFullYear() === targetYear;
	});

	// Partition by relationship so family member refunds don't cross-contaminate
	const partitionMap = new Map<string, TaxDeductionPaymentItem[]>();
	for (const p of yearPayments) {
		const rel = p.payerRelationship || "patient";
		const list = partitionMap.get(rel) || [];
		list.push(p);
		partitionMap.set(rel, list);
	}

	const result: TaxDeductionPaymentItem[] = [];

	for (const [, items] of partitionMap.entries()) {
		let code01RefundKop = 0;
		let code02RefundKop = 0;
		const positiveItems: TaxDeductionPaymentItem[] = [];

		for (const p of items) {
			const cat = p.taxCode || resolveTaxDeductionCategoryShared(p.code804n, p.serviceName);
			const absKop = getTaxDeductionAbsKopecks(p);
			if (isTaxDeductionRefund(p)) {
				if (cat === "2") {
					code02RefundKop += absKop;
				} else {
					code01RefundKop += absKop;
				}
			} else if (absKop > 0) {
				positiveItems.push(p);
			}
		}

		if (code01RefundKop === 0 && code02RefundKop === 0) {
			result.push(...positiveItems);
			continue;
		}

		let remainingRefund01 = code01RefundKop;
		let remainingRefund02 = code02RefundKop;

		for (const item of positiveItems) {
			const cat = item.taxCode || resolveTaxDeductionCategoryShared(item.code804n, item.serviceName);
			const itemKop = getTaxDeductionAbsKopecks(item);

			if (cat === "2") {
				if (remainingRefund02 >= itemKop) {
					remainingRefund02 -= itemKop;
					continue;
				}
				const netKop = itemKop - remainingRefund02;
				remainingRefund02 = 0;
				result.push({
					...item,
					amountKopecks: netKop,
					amountRub: netKop / 100,
				});
			} else {
				if (remainingRefund01 >= itemKop) {
					remainingRefund01 -= itemKop;
					continue;
				}
				const netKop = itemKop - remainingRefund01;
				remainingRefund01 = 0;
				result.push({
					...item,
					amountKopecks: netKop,
					amountRub: netKop / 100,
				});
			}
		}
	}

	return result;
}

/**
 * Wraps generateFamilyTaxDeductionBatch to ensure each family member's payments
 * are netted against refunds for the target tax year.
 */
export function generateFamilyTaxDeductionBatch(
	options: GenerateFamilyTaxDeductionBatchOptions
): FamilyTaxDeductionBatchResult {
	const normalizedPayments = normalizePaymentsForTaxCertificate(options.payments, options.taxYear);
	return sharedGenerateFamilyTaxDeductionBatch({
		...options,
		payments: normalizedPayments,
	});
}

/**
 * Calculates tax deduction breakdown per year and category (Code 01 / Code 02)
 * with strict Net Paid logic (subtracting refunds) and kopeck precision (Mandate 8b).
 */
export function calculateTaxDeductionSummary(
	payments: readonly TaxDeductionPaymentItem[]
): TaxDeductionCalculationResult {
	const yearMap = new Map<
		number,
		{
			code01PosKop: number;
			code01RefKop: number;
			code02PosKop: number;
			code02RefKop: number;
			receiptsCount: number;
		}
	>();

	for (const p of payments) {
		const parsedDate = new Date(p.dateIso);
		const year = Number.isNaN(parsedDate.getTime())
			? new Date().getFullYear()
			: parsedDate.getFullYear();
		const cat = p.taxCode || resolveTaxDeductionCategoryShared(p.code804n, p.serviceName);
		const absKop = getTaxDeductionAbsKopecks(p);
		const isRefund = isTaxDeductionRefund(p);

		const current = yearMap.get(year) || {
			code01PosKop: 0,
			code01RefKop: 0,
			code02PosKop: 0,
			code02RefKop: 0,
			receiptsCount: 0,
		};

		if (isRefund) {
			if (cat === "2") {
				current.code02RefKop += absKop;
			} else {
				current.code01RefKop += absKop;
			}
		} else {
			if (cat === "2") {
				current.code02PosKop += absKop;
			} else {
				current.code01PosKop += absKop;
			}
			current.receiptsCount += 1;
		}
		yearMap.set(year, current);
	}

	const yearsSummary: TaxDeductionYearSummary[] = Array.from(yearMap.entries())
		.sort(([yA], [yB]) => yB - yA)
		.map(([taxYear, data]) => {
			const netCode01Kop = Math.max(0, data.code01PosKop - data.code01RefKop);
			const netCode02Kop = Math.max(0, data.code02PosKop - data.code02RefKop);
			const totalKopecks = netCode01Kop + netCode02Kop;
			const code01Rub = netCode01Kop / 100;
			const code02Rub = netCode02Kop / 100;
			const totalRub = totalKopecks / 100;

			// Лимит социального вычета: 150 000 ₽ с 2024 года, 120 000 ₽ до 2024 года
			const statutoryLimitRub =
				taxYear >= 2024
					? ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024
					: ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024;
			const statutoryLimitKopecks = statutoryLimitRub * 100;
			const code01EligibleKopecks = Math.min(netCode01Kop, statutoryLimitKopecks);
			const code01EligibleRub = code01EligibleKopecks / 100;

			// Расчетный возврат 13% и 15% в целых копейках (по Коду 01 с лимитом, по Коду 02 без ограничений)
			const refund13EstimateKopecks =
				Math.round((code01EligibleKopecks * 13) / 100) +
				Math.round((netCode02Kop * 13) / 100);
			const refund15EstimateKopecks =
				Math.round((code01EligibleKopecks * 15) / 100) +
				Math.round((netCode02Kop * 15) / 100);

			return {
				taxYear,
				code01Rub,
				code01Kopecks: netCode01Kop,
				code02Rub,
				code02Kopecks: netCode02Kop,
				totalRub,
				totalKopecks,
				receiptsCount: data.receiptsCount,
				code01StatutoryLimitRub: statutoryLimitRub,
				code01StatutoryLimitKopecks: statutoryLimitKopecks,
				code01EligibleRub,
				code01EligibleKopecks,
				refund13EstimateRub: refund13EstimateKopecks / 100,
				refund13EstimateKopecks,
				refund15EstimateRub: refund15EstimateKopecks / 100,
				refund15EstimateKopecks,
			};
		});

	const grandTotalCode01Kopecks = yearsSummary.reduce((acc, y) => acc + y.code01Kopecks, 0);
	const grandTotalCode02Kopecks = yearsSummary.reduce((acc, y) => acc + y.code02Kopecks, 0);
	const grandTotalKopecks = grandTotalCode01Kopecks + grandTotalCode02Kopecks;
	const grandTotalRefund13Kopecks = yearsSummary.reduce(
		(acc, y) => acc + y.refund13EstimateKopecks,
		0
	);
	const grandTotalRefund15Kopecks = yearsSummary.reduce(
		(acc, y) => acc + y.refund15EstimateKopecks,
		0
	);
	const totalReceiptsCount = yearsSummary.reduce((acc, y) => acc + y.receiptsCount, 0);

	return {
		yearsSummary,
		grandTotalCode01Rub: grandTotalCode01Kopecks / 100,
		grandTotalCode01Kopecks,
		grandTotalCode02Rub: grandTotalCode02Kopecks / 100,
		grandTotalCode02Kopecks,
		grandTotalRub: grandTotalKopecks / 100,
		grandTotalKopecks,
		grandTotalRefund13Rub: grandTotalRefund13Kopecks / 100,
		grandTotalRefund13Kopecks,
		grandTotalRefund15Rub: grandTotalRefund15Kopecks / 100,
		grandTotalRefund15Kopecks,
		totalReceiptsCount,
		totalAmountInWordsRu: amountToWordsRu(grandTotalKopecks),
	};
}

/**
 * Prepares certificate parameters with strictly target year and Net Paid normalized payments.
 */
function prepareNormalizedCertParams(params: TaxDeductionCertificateParams): TaxDeductionCertificateParams {
	const normalizedPayments = normalizePaymentsForTaxCertificate(params.payments, params.taxYear);
	return {
		...params,
		payments: normalizedPayments,
	};
}

/**
 * Generates FNS 824@ XML document with strictly target year and Net Paid amounts.
 */
export function generateFnsTaxDeductionXml(params: TaxDeductionCertificateParams): {
	fileName: string;
	fileId: string;
	xmlContent: string;
} {
	return sharedGenerateFnsTaxDeductionXml(prepareNormalizedCertParams(params));
}

/**
 * Generates NO_MEDOPL XML document (Format 5.01) with strictly target year and Net Paid amounts.
 */
export function generateFnsNoMedoplXml(params: TaxDeductionCertificateParams): {
	fileName: string;
	fileId: string;
	xmlContent: string;
} {
	return sharedGenerateFnsNoMedoplXml(prepareNormalizedCertParams(params));
}

/**
 * Generates official printable HTML for the KND 1151156 Certificate according to Order EA-7-11/824@
 * with strictly target year and Net Paid amounts.
 */
export function renderOfficialTaxCertificateKnd1151156Html(params: TaxDeductionCertificateParams): string {
	return sharedRenderOfficialTaxCertificateKnd1151156Html(prepareNormalizedCertParams(params));
}

/**
 * Triggers a browser download of the generated FNS 824@ XML document.
 */
export function downloadFnsTaxXmlFile(params: TaxDeductionCertificateParams): void {
	const { fileName, xmlContent } = generateFnsTaxDeductionXml(params);
	const blob = new Blob([xmlContent], { type: "application/xml;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = fileName;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

/**
 * Triggers a browser download of the NO_MEDOPL XML file (Format 5.01).
 */
export function downloadFnsNoMedoplXmlFile(params: TaxDeductionCertificateParams): void {
	const { fileName, xmlContent } = generateFnsNoMedoplXml(params);
	const blob = new Blob([xmlContent], { type: "application/xml;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = fileName;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

/**
 * Triggers a browser download of batch XML registry for direct TCS submission.
 */
export function downloadFnsBatchTaxXmlFile(batch: TaxDeductionBatchParams): void {
	const { fileName, xmlContent } = generateFnsTaxDeductionBatchXml(batch);
	const blob = new Blob([xmlContent], { type: "application/xml;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = fileName;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

/**
 * Triggers a browser download of NO_MEDOPL batch XML registry (Format 5.01) for direct TCS submission.
 */
export function downloadFnsBatchNoMedoplXmlFile(batch: TaxDeductionBatchParams): void {
	const { fileName, xmlContent } = generateFnsBatchNoMedoplXml(batch);
	const blob = new Blob([xmlContent], { type: "application/xml;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = fileName;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

/**
 * Generates official printable HTML for the KND 1151156 Certificate according to Order EA-7-11/824@.
 */
export function renderTaxDeductionCertificateHtml(params: TaxDeductionCertificateParams): string {
	return renderOfficialTaxCertificateKnd1151156Html(params);
}

/**
 * Generates combined multi-page printable HTML for all family certificates in batch.
 */
export function renderTaxDeductionBatchCertificateHtml(batch: TaxDeductionBatchParams): string {
	return renderOfficialTaxCertificateBatchKnd1151156Html(batch);
}

/**
 * Opens a print dialog with the official A4 form of the KND 1151156 Certificate.
 */
export function printTaxCertificateKnd1151156(params: TaxDeductionCertificateParams): void {
	const html = renderOfficialTaxCertificateKnd1151156Html(params);
	const win = window.open("", "_blank");
	if (win) {
		win.document.write(html);
		win.document.close();
		win.focus();
		setTimeout(() => {
			win.print();
		}, 300);
	}
}

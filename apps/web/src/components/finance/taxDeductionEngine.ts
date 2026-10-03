/**
 * DENTE Dental CRM — Web Tax Deduction Certificate & FNS 824@ Registry Engine.
 *
 * Implements strict compliance with:
 * 1. FNS Order No. EA-7-11/824@ (Certificate Form KND 1151156 & Electronic Registry KND 1184043, Format 5.01).
 * 2. Article 219 of the Tax Code of the Russian Federation (Personal Income Tax Social Deduction).
 * 3. Strict Calendar Year Isolation (01.01–31.12) immune to timezone shifts.
 * 4. Net Paid Calculation: Subtracting partial refunds (e.g. 100k paid - 20k refunded = 80k net reported)
 *    separated strictly by Code 1 (standard, statutory limits 150k/120k) and Code 2 (expensive treatment, unlimited).
 * 5. Mandate 8b: Integer kopeck precision without floating-point drift or discrepancies in words.
 * 6. Mandate 8s: Best-of-Breed SSOT delegating to @dental/shared.
 */

export {
	amountToWordsRu,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024,
	calculateTaxDeductionSummary,
	classifyTaxDeduction804n,
	EXPENSIVE_TREATMENT_804N_CODES,
	extractTaxYearFromDate,
	FNS_FORMAT_VERSION_501,
	FNS_ORDER_824_NAME,
	generateCode128Svg,
	generateFamilyTaxDeductionBatch,
	generateFnsBatchNoMedoplXml,
	generateFnsFormKnd1151156BarcodeSvg,
	generateFnsNoMedoplXml,
	generateFnsTaxDeductionBatchXml,
	generateFnsTaxDeductionXml,
	generateQrCodeDataUri,
	generateQrCodeSvg,
	generateTaxCertificateQrDataUri,
	generateTaxCertificateQrPayload,
	generateTaxCertificateQrSvg,
	getTaxDeductionAbsKopecks,
	isTaxDeductionRefund,
	KND_CERTIFICATE_FORM,
	KND_REGISTRY_ELECTRONIC_FORMAT,
	normalizePaymentsForTaxCertificate,
	renderOfficialTaxCertificateBatchKnd1151156Html,
	renderOfficialTaxCertificateKnd1151156Html,
	resolveTaxDeductionCategoryShared,
	TAX_DEDUCTION_RELATIONSHIP_MAP,
	type FamilyMemberBatchCertificateSummary,
	type FamilyMemberPayerConfig,
	type FamilyTaxDeductionBatchResult,
	type GenerateFamilyTaxDeductionBatchOptions,
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
} from "@dental/shared";

import {
	generateFnsBatchNoMedoplXml,
	generateFnsNoMedoplXml,
	generateFnsTaxDeductionBatchXml,
	generateFnsTaxDeductionXml,
	renderOfficialTaxCertificateBatchKnd1151156Html,
	renderOfficialTaxCertificateKnd1151156Html,
	type TaxDeductionBatchParams,
	type TaxDeductionCertificateParams,
} from "@dental/shared";

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

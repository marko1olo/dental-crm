/**
 * DENTE Dental CRM — FNS Tax Deduction & Act 804n / PP 458 Engine (Wave 10).
 *
 * Official implementation of:
 * - Приказ ФНС РФ от 08.11.2023 № ЕА-7-11/824@ (Форма по КНД 1151156, Формат 5.01 по КНД 1184043)
 * - Постановление Правительства РФ от 08.04.2020 № 458 (Перечень дорогостоящих видов лечения — Код 02)
 * - Приказ Минздрава России от 13.10.2017 № 804н (Номенклатура медицинских услуг)
 * - Ст. 219 НК РФ (лимит 150 000 ₽ с 01.01.2024 для Кода 01, без ограничений для Кода 02)
 *
 * Strict invariants:
 * - Exact integer kopeck / BigInt arithmetic (zero IEEE-754 floating point drift).
 * - Multi-year aggregation and statutory limit enforcement.
 * - Dynamic QR-code verification (URL for FNS taxpayer portal / inspection).
 * - Official A4 printable blank with Code 128 barcode and fiscal receipt breakdown (54-FZ).
 * - Structured XML generator and validator for FNS electronic transmission via TCS / LKFL.
 */

import {
	generateFnsNoMedoplXml,
	generateFnsTaxDeductionBatchXml,
	generateFnsTaxDeductionXml,
	renderOfficialTaxCertificateKnd1151156Html,
	type TaxDeductionBatchParams,
	type TaxDeductionCertificateParams,
} from "@dental/shared";

export {
	amountToWordsRu,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024,
	calculateExactTaxSplitKopecks,
	calculateTaxDeductionSummary,
	classifyTaxDeduction804n,
	escapeXmlString,
	EXPENSIVE_TREATMENT_804N_CODES,
	FNS_FORMAT_VERSION_501,
	FNS_ORDER_824_NAME,
	generateFnsFormKnd1151156BarcodeSvg,
	generateFnsNoMedoplXml,
	generateFnsTaxDeductionBatchXml,
	generateFnsTaxDeductionXml,
	generateQrCodeDataUri,
	generateQrCodeSvg,
	generateTaxCertificateQrDataUri,
	generateTaxCertificateQrPayload,
	generateTaxCertificateQrSvg,
	KND_CERTIFICATE_FORM,
	KND_REGISTRY_ELECTRONIC_FORMAT,
	kopecksBigIntToRub,
	kopecksToRub,
	renderOfficialTaxCertificateKnd1151156Html,
	resolveTaxDeductionCategoryShared,
	rubToKopecks,
	rubToKopecksBigInt,
	TAX_DEDUCTION_RELATIONSHIP_MAP,
	type ExactTaxSplitKopecks,
	type FnsTaxCertificateValidationResult,
	type QrSvgOptions,
	type TaxDeductionBatchParams,
	type TaxDeductionCalculationResult,
	type TaxDeductionCertificateParams,
	type TaxDeductionClinicParams,
	type TaxDeductionPaymentItem,
	type TaxDeductionPersonParams,
	type TaxDeductionRelationship,
	type TaxDeductionYearSummary,
	validateFnsTaxXmlStructure,
	validateInnIndividual,
	validateInnLegalEntity,
	validateRussianInn,
	validateRussianKpp,
	validateRussianOgrn,
	validateRussianPassport,
	validateRussianSnils,
	validateTaxCertificateParams,
} from "@dental/shared";


/**
 * Triggers a browser download of the generated FNS XML file for TCS / LKFL.
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

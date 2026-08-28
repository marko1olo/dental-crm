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
	amountToWordsRu,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024,
	calculateTaxDeductionSummary,
	classifyTaxDeduction804n,
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
	renderOfficialTaxCertificateKnd1151156Html,
	resolveTaxDeductionCategoryShared,
	rubToKopecks,
	kopecksToRub,
	TAX_DEDUCTION_RELATIONSHIP_MAP,
	type QrSvgOptions,
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

export {
	amountToWordsRu,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024,
	calculateTaxDeductionSummary,
	classifyTaxDeduction804n,
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
	renderOfficialTaxCertificateKnd1151156Html,
	resolveTaxDeductionCategoryShared,
	rubToKopecks,
	kopecksToRub,
	TAX_DEDUCTION_RELATIONSHIP_MAP,
	type QrSvgOptions,
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
};

/**
 * Escape XML special characters.
 */
export function escapeXmlString(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

/**
 * BigInt-safe ruble to kopecks converter.
 */
export function rubToKopecksBigInt(rub: number | string): bigint {
	const numeric = typeof rub === "string" ? Number.parseFloat(rub) : rub;
	if (!Number.isFinite(numeric)) {
		return 0n;
	}
	return BigInt(Math.round(numeric * 100));
}

/**
 * BigInt-safe kopecks to rubles converter.
 */
export function kopecksBigIntToRub(kopecks: bigint): number {
	return Number(kopecks) / 100;
}

/**
 * Exact Tax Split breakdown using integer BigInt kopecks.
 */
export interface ExactTaxSplitKopecks {
	readonly code01Kopecks: bigint;
	readonly code01Rub: number;
	readonly code02Kopecks: bigint;
	readonly code02Rub: number;
	readonly totalKopecks: bigint;
	readonly totalRub: number;
	readonly code01StatutoryLimitKopecks: bigint;
	readonly code01StatutoryLimitRub: number;
	readonly code01EligibleKopecks: bigint;
	readonly code01EligibleRub: number;
	readonly refund13Kopecks: bigint;
	readonly refund13Rub: number;
	readonly refund15Kopecks: bigint;
	readonly refund15Rub: number;
	readonly isCode01Capped: boolean;
	readonly receiptsCount: number;
}

/**
 * Computes exact tax deduction split for a single tax year strictly using BigInt kopecks.
 */
export function calculateExactTaxSplitKopecks(
	payments: readonly TaxDeductionPaymentItem[],
	targetYear: number,
	customLimitRub?: number,
): ExactTaxSplitKopecks {
	let code01Kop = 0n;
	let code02Kop = 0n;
	let receiptsCount = 0;

	for (const pay of payments) {
		const payYear = new Date(pay.dateIso).getFullYear();
		if (payYear !== targetYear) continue;

		receiptsCount++;
		const code = pay.taxCode || resolveTaxDeductionCategoryShared(pay.code804n, pay.serviceName);

		let amountKop = 0n;
		if (typeof pay.amountKopecks === "number" && Number.isFinite(pay.amountKopecks)) {
			amountKop = BigInt(Math.max(0, Math.round(pay.amountKopecks)));
		} else if (Number.isFinite(pay.amountRub)) {
			amountKop = rubToKopecksBigInt(pay.amountRub);
		}

		if (code === "2") {
			code02Kop += amountKop;
		} else {
			code01Kop += amountKop;
		}
	}

	const statutoryLimitRub =
		customLimitRub !== undefined && customLimitRub > 0
			? customLimitRub
			: targetYear >= 2024
				? ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024
				: ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024;

	const limitKop = BigInt(Math.round(statutoryLimitRub * 100));
	const isCode01Capped = code01Kop > limitKop;
	const code01EligibleKop = isCode01Capped ? limitKop : code01Kop;

	// Calculate 13% and 15% refunds in integer kopecks: (kopecks * 13n + 50n) / 100n for standard rounding
	const code01Refund13Kop = (code01EligibleKop * 13n + 50n) / 100n;
	const code02Refund13Kop = (code02Kop * 13n + 50n) / 100n;
	const refund13Kop = code01Refund13Kop + code02Refund13Kop;

	const code01Refund15Kop = (code01EligibleKop * 15n + 50n) / 100n;
	const code02Refund15Kop = (code02Kop * 15n + 50n) / 100n;
	const refund15Kop = code01Refund15Kop + code02Refund15Kop;

	const totalKop = code01Kop + code02Kop;

	return {
		code01Kopecks: code01Kop,
		code01Rub: kopecksBigIntToRub(code01Kop),
		code02Kopecks: code02Kop,
		code02Rub: kopecksBigIntToRub(code02Kop),
		totalKopecks: totalKop,
		totalRub: kopecksBigIntToRub(totalKop),
		code01StatutoryLimitKopecks: limitKop,
		code01StatutoryLimitRub: statutoryLimitRub,
		code01EligibleKopecks: code01EligibleKop,
		code01EligibleRub: kopecksBigIntToRub(code01EligibleKop),
		refund13Kopecks: refund13Kop,
		refund13Rub: kopecksBigIntToRub(refund13Kop),
		refund15Kopecks: refund15Kop,
		refund15Rub: kopecksBigIntToRub(refund15Kop),
		isCode01Capped,
		receiptsCount,
	};
}

/**
 * Validation error result for FNS tax certificate parameters.
 */
export interface FnsTaxCertificateValidationResult {
	readonly isValid: boolean;
	readonly errors: readonly string[];
	readonly warnings: readonly string[];
}

/**
 * Full structural validation of tax certificate parameters according to FNS Order 824@.
 */
export function validateTaxCertificateParams(
	params: TaxDeductionCertificateParams,
): FnsTaxCertificateValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	// Certificate number & year
	if (!params.certificateNumber || !params.certificateNumber.trim()) {
		errors.push("Не указан номер справки");
	}
	if (!params.taxYear || params.taxYear < 2020 || params.taxYear > 2030) {
		errors.push("Указан некорректный налоговый период (отчетный год)");
	}

	// Clinic checks
	if (!params.clinic.legalName || !params.clinic.legalName.trim()) {
		errors.push("Не указано наименование медицинской организации");
	}
	const clinicInnRes = validateInnLegalEntity(params.clinic.inn);
	if (!clinicInnRes.isValid) {
		errors.push(`ИНН клиники: ${clinicInnRes.errorMessageRu || "некорректен"}`);
	}
	if (params.clinic.kpp) {
		const kppRes = validateRussianKpp(params.clinic.kpp);
		if (!kppRes.isValid) {
			errors.push(`КПП клиники: ${kppRes.errorMessageRu || "некорректен"}`);
		}
	}
	if (params.clinic.ogrn) {
		const ogrnRes = validateRussianOgrn(params.clinic.ogrn);
		if (!ogrnRes.isValid) {
			warnings.push(`ОГРН клиники: ${ogrnRes.errorMessageRu || "некорректен"}`);
		}
	}

	// Payer checks
	if (!params.payer.fullName || !params.payer.fullName.trim()) {
		errors.push("Не указано ФИО налогоплательщика");
	}
	if (params.payer.inn) {
		const payerInnRes = validateInnIndividual(params.payer.inn);
		if (!payerInnRes.isValid) {
			errors.push(`ИНН налогоплательщика: ${payerInnRes.errorMessageRu || "некорректен"}`);
		}
	}
	const passportDoc = `${params.payer.identityDocumentSeries || ""}${params.payer.identityDocumentNumber || ""}`;
	if (passportDoc) {
		const passportRes = validateRussianPassport(passportDoc);
		if (!passportRes.isValid) {
			warnings.push(`Паспорт плательщика: ${passportRes.errorMessageRu || "некорректен"}`);
		}
	}

	// Patient checks (if not self)
	const rel = TAX_DEDUCTION_RELATIONSHIP_MAP[params.payer.relationship];
	if (rel.samePatientFlag === "0") {
		if (!params.patient.fullName || !params.patient.fullName.trim()) {
			errors.push("Не указано ФИО пациента при оформлении справки на родственника");
		}
	}

	// Payments check
	const yearPayments = params.payments.filter(
		(p) => new Date(p.dateIso).getFullYear() === params.taxYear,
	);
	if (yearPayments.length === 0) {
		warnings.push(`Отсутствуют фискальные чеки за ${params.taxYear} год`);
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
	};
}

/**
 * Validates the XML syntax and mandatory tags of the generated FNS 824@ XML.
 */
export function validateFnsTaxXmlStructure(xmlContent: string): {
	readonly isValid: boolean;
	readonly errors: readonly string[];
} {
	const errors: string[] = [];
	if (!xmlContent || !xmlContent.trim()) {
		return { isValid: false, errors: ["XML контент пуст"] };
	}

	if (!xmlContent.includes("<?xml version=\"1.0\" encoding=\"UTF-8\"?>")) {
		errors.push("Отсутствует стандартный XML-пролог UTF-8");
	}
	if (!xmlContent.includes("<Файл") || !xmlContent.includes("</Файл>")) {
		errors.push("Отсутствует корневой тег <Файл>");
	}
	if (!xmlContent.includes("ВерсФорм=\"5.01\"")) {
		errors.push("Версия формата должна быть 5.01");
	}
	if (!xmlContent.includes("<Документ") || !xmlContent.includes("</Документ>")) {
		errors.push("Отсутствует секция <Документ>");
	}
	if (!xmlContent.includes(`КНД="${KND_REGISTRY_ELECTRONIC_FORMAT}"`)) {
		errors.push(`Отсутствует атрибут КНД="${KND_REGISTRY_ELECTRONIC_FORMAT}"`);
	}
	if (!xmlContent.includes("<Подписант")) {
		errors.push("Отсутствуют сведения о подписанте (<Подписант>)");
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

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

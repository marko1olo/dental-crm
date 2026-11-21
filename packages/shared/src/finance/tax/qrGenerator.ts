/**
 * DENTE Dental CRM — Tax Deduction Engine (QR Generators & Date Formatters)
 * Compliant with FNS Russia Order EA-7-11/824@ (КНД 1151156).
 * Generates official verification QR codes and localized dates for printable forms.
 */

import type { TaxDeductionCertificateParams } from "./types.js";
import { calculateTaxDeductionSummary } from "./calculation.js";
import { kopecksToNumericString } from "../../money.js";
import {
	generateQrCodeSvg,
	generateQrCodeDataUri,
	type QrSvgOptions,
} from "../../fiscal/qrGenerator.js";

export function formatDateToRussian(isoString: string): string {
	const d = new Date(isoString);
	if (Number.isNaN(d.getTime())) return isoString.slice(0, 10);
	const day = d.getDate().toString().padStart(2, "0");
	const month = (d.getMonth() + 1).toString().padStart(2, "0");
	const year = d.getFullYear().toString();
	return `${day}.${month}.${year}`;
}

/**
 * Генерация верификационного QR-кода для справки КНД 1151156 (Приказ 824@).
 * Содержит верификационный URL для проверки налоговым инспектором в ЛК ФНС.
 */
export function generateTaxCertificateQrPayload(params: TaxDeductionCertificateParams): string {
	const summary = calculateTaxDeductionSummary(params.payments);
	const targetYear = summary.yearsSummary.find((y) => y.taxYear === params.taxYear) || {
		code01Kopecks: 0,
		code02Kopecks: 0,
		totalKopecks: 0,
	};

	const code01Str = kopecksToNumericString(targetYear.code01Kopecks);
	const code02Str = kopecksToNumericString(targetYear.code02Kopecks);
	const totalStr = kopecksToNumericString(targetYear.totalKopecks);
	const issueDate = params.issueDateIso.slice(0, 10);

	// Официальный верификационный URI для налогового инспектора и ЛК ФНС
	return `https://lkfl2.nalog.ru/lkfl/deduction/verify?knd=1151156&inn=${encodeURIComponent(params.clinic.inn)}&cert=${encodeURIComponent(params.certificateNumber)}&date=${issueDate}&year=${params.taxYear}&payerInn=${encodeURIComponent(params.payer.inn || "")}&c1=${code01Str}&c2=${code02Str}&sum=${totalStr}`;
}

/**
 * Генерация SVG строки QR-кода верификации справки КНД 1151156.
 */
export function generateTaxCertificateQrSvg(
	params: TaxDeductionCertificateParams,
	options: QrSvgOptions = {}
): string {
	const payload = generateTaxCertificateQrPayload(params);
	return generateQrCodeSvg(payload, {
		size: options.size ?? 120,
		margin: options.margin ?? 2,
		title: options.title ?? `Справка КНД 1151156 № ${params.certificateNumber}`,
		...options,
	});
}

/**
 * Генерация base64 Data-URI QR-кода верификации справки КНД 1151156.
 */
export function generateTaxCertificateQrDataUri(
	params: TaxDeductionCertificateParams,
	options: QrSvgOptions = {}
): string {
	const payload = generateTaxCertificateQrPayload(params);
	return generateQrCodeDataUri(payload, {
		size: options.size ?? 120,
		margin: options.margin ?? 2,
		...options,
	});
}

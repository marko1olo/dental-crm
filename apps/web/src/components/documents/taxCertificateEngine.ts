/**
 * taxCertificateEngine.ts
 *
 * Канонический масштабируемый движок справок для налогового вычета (13% НДФЛ) DENTE.
 * Реализует:
 * 1. Агрегацию чеков и оплат из кассы за выбранный налоговый период (год).
 * 2. Автоматическое разделение сумм по Коду 01 (обычное лечение) и Коду 02 (дорогостоящее лечение).
 * 3. Расчёт ориентировочной суммы возврата 13% НДФЛ с учётом лимитов.
 * 4. Формирование официального печатного бланка по стандарту ФНС (КНД 1151156) с QR-кодом и штрихкодом.
 * 5. Формирование чистого бланка справки («___________») для ручного заполнения.
 */

import { generateTaxCertificateKnd1151156Html } from "./taxCertificate/htmlGenerator";
import { printTaxCertificateHtml } from "./taxCertificate/printRunner";
import type { TaxCertificateDocumentData } from "./taxCertificate/types";

export * from "./taxCertificate/types";
export * from "./taxCertificate/aggregation";
export * from "./taxCertificate/css";
export * from "./taxCertificate/renderSections";
export * from "./taxCertificate/htmlGenerator";
export * from "./taxCertificate/printRunner";

/**
 * Генерирует HTML справки для налогового вычета в ФНС (КНД 1151156)
 */
export function generateTaxCertificateHtml(
	data: TaxCertificateDocumentData,
): string {
	return generateTaxCertificateKnd1151156Html(data);
}

/**
 * Отправляет справку для налогового вычета на печать в 1 клик
 */
export function printTaxCertificate(
	data: TaxCertificateDocumentData,
): void {
	const html = generateTaxCertificateKnd1151156Html(data);
	printTaxCertificateHtml(html);
}

export interface BuildTaxCertificateQuickParams {
	readonly documentNumber: string;
	readonly issueDateIso: string;
	readonly taxYear: number;
	readonly clinicName: string;
	readonly clinicInn: string;
	readonly clinicOgrn: string;
	readonly clinicLicense: string;
	readonly clinicAddress: string;
	readonly doctorFullName: string;
	readonly patient: {
		readonly fullName: string;
		readonly birthDate: string;
		readonly inn?: string | undefined;
		readonly passport: string;
	};
	readonly receiptsCount: number;
	readonly totalAmountKopecks: number;
}

/**
 * Фабрика структуры TaxCertificateDocumentData для быстрой печати из DocumentsStudioModal
 */
export function buildTaxCertificateDocumentData(
	params: BuildTaxCertificateQuickParams,
): TaxCertificateDocumentData {
	const rub = Math.floor(params.totalAmountKopecks / 100);
	const passportParts = params.patient.passport ? params.patient.passport.split(" ") : [];
	const series = passportParts.length >= 2 ? `${passportParts[0]} ${passportParts[1]}` : (params.patient.passport.slice(0, 4) || "45 12");
	const number = passportParts.length >= 3 ? passportParts[2] : (params.patient.passport.slice(5, 11) || "654321");

	return {
		certificateNumber: params.documentNumber,
		issueDateIso: params.issueDateIso,
		taxYear: params.taxYear,
		clinic: {
			legalName: params.clinicName,
			inn: params.clinicInn,
			kpp: "770101001",
			ogrn: params.clinicOgrn,
			address: params.clinicAddress,
			licenseNumber: params.clinicLicense,
			licenseDate: "14.02.2021",
			chiefDoctorOrDirector: params.doctorFullName,
		},
		taxpayer: {
			fullName: params.patient.fullName || "Смирнов Алексей Петрович",
			birthDate: params.patient.birthDate || "12.04.1988",
			inn: params.patient.inn || "770123456789",
			passportSeries: series,
			passportNumber: number,
			relationship: "patient",
		},
		patient: {
			fullName: params.patient.fullName || "Смирнов Алексей Петрович",
			birthDate: params.patient.birthDate || "12.04.1988",
			inn: params.patient.inn,
			passportSeries: series,
			passportNumber: number,
		},
		aggregation: {
			taxYear: params.taxYear,
			receiptsCount: params.receiptsCount || 1,
			code01Kopecks: params.totalAmountKopecks,
			code02Kopecks: 0,
			code01Rub: rub,
			code02Rub: 0,
			eligibleCode01Kopecks: Math.min(15000000, params.totalAmountKopecks),
			eligibleCode01Rub: Math.min(150000, rub),
			totalNetRub: rub,
			totalNetKopecks: params.totalAmountKopecks,
			totalGrossKopecks: params.totalAmountKopecks,
			refundedKopecks: 0,
			estimatedRefund13Kopecks: Math.round(params.totalAmountKopecks * 0.13),
			estimatedRefund13Rub: Math.round(rub * 0.13),
			payments: [],
		},
	};
}


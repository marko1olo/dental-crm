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
import { isDemoShowcaseMode } from "../../lib/demoMode";

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
	const isDemo = isDemoShowcaseMode();
	const passportParts = params.patient.passport ? params.patient.passport.split(" ") : [];
	const series = passportParts.length >= 2
		? `${passportParts[0]} ${passportParts[1]}`
		: (params.patient.passport?.slice(0, 4) || (isDemo ? "45 12" : "______"));
	const number = passportParts.length >= 3
		? passportParts[2]
		: (params.patient.passport?.slice(5, 11) || (isDemo ? "654321" : "________"));

	const defaultFullName = isDemo ? "Смирнов Алексей Петрович" : "___________";
	const defaultBirthDate = isDemo ? "12.04.1988" : "___________";
	const defaultInn = isDemo ? "770123456789" : "";

	return {
		certificateNumber: params.documentNumber,
		issueDateIso: params.issueDateIso,
		taxYear: params.taxYear,
		clinic: {
			legalName: params.clinicName,
			inn: params.clinicInn,
			kpp: isDemo ? "770101001" : "",
			ogrn: params.clinicOgrn,
			address: params.clinicAddress,
			licenseNumber: params.clinicLicense,
			licenseDate: isDemo ? "14.02.2021" : "",
			chiefDoctorOrDirector: params.doctorFullName,
		},
		taxpayer: {
			fullName: params.patient.fullName || defaultFullName,
			birthDate: params.patient.birthDate || defaultBirthDate,
			inn: params.patient.inn || defaultInn,
			passportSeries: series,
			passportNumber: number,
			relationship: "patient",
		},
		patient: {
			fullName: params.patient.fullName || defaultFullName,
			birthDate: params.patient.birthDate || defaultBirthDate,
			inn: params.patient.inn || defaultInn,
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


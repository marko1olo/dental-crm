/**
 * DENTE Dental CRM — Statutory DMS Claim Registry Export Engine (XML, CSV UTF-8 BOM, A4 HTML).
 *
 * Implements:
 * 1. Statutory Claim Itemization per Minzdrav Order 804n, ICD-10, FDI tooth chart, Policy & Guarantee Letter.
 * 2. Russian Health Insurer Electronic XML Interchange Standard (СОГАЗ, Ингосстрах, АльфаСтрахование, РЕСО).
 * 3. Semicolon CSV with UTF-8 BOM for direct import into ARM Strakhovshchik (АРМ Страховщика / 1С).
 * 4. High-Grade Printable A4 Landscape HTML Consolidated Invoice-Registry (Сводный счет-реестр ДМС)
 *    with Kopeck-Exact Math, Russian amount in words (Сумма прописью), and statutory signature blocks.
 */

import { z } from "zod";
import type { Kopecks } from "../utils/money.js";
import { formatKopecksRu, kopecksToNumericString } from "../utils/money.js";
import { escapeXml } from "../cda/c14n.js";
import { amountToWordsRu } from "../fiscal/taxDeduction.js";

export interface DmsRegistryClinicInfo {
	readonly nameRu: string;
	readonly inn: string;
	readonly kpp: string;
	readonly ogrn: string;
	readonly addressRu: string;
	readonly phone: string;
	readonly email?: string | undefined;
	readonly medicalLicenseNumber: string;
	readonly bankNameRu?: string | undefined;
	readonly bankBik?: string | undefined;
	readonly bankAccount?: string | undefined;
	readonly bankCorrAccount?: string | undefined;
	readonly chiefDoctorNameRu: string;
	readonly chiefAccountantNameRu: string;
}

export const dmsRegistryClinicInfoSchema = z.object({
	nameRu: z.string().min(1, { message: "Наименование клиники обязательно" }),
	inn: z.string().min(10).max(12, { message: "ИНН должен содержать 10-12 цифр" }),
	kpp: z.string().min(9).max(9, { message: "КПП должен содержать 9 цифр" }).optional().or(z.literal("")),
	ogrn: z.string().min(13).max(15, { message: "ОГРН/ОГРНИП должен содержать 13-15 цифр" }),
	addressRu: z.string().min(1, { message: "Адрес клиники обязателен" }),
	phone: z.string().min(1, { message: "Телефон клиники обязателен" }),
	email: z.string().email().optional(),
	medicalLicenseNumber: z.string().min(1, { message: "Номер медицинской лицензии обязателен" }),
	bankNameRu: z.string().optional(),
	bankBik: z.string().optional(),
	bankAccount: z.string().optional(),
	bankCorrAccount: z.string().optional(),
	chiefDoctorNameRu: z.string().min(1, { message: "ФИО главного врача обязательно" }),
	chiefAccountantNameRu: z.string().min(1, { message: "ФИО главного бухгалтера обязательно" }),
});

export interface DmsRegistryInsuranceCompanyInfo {
	readonly companyId: string;
	readonly nameRu: string;
	readonly inn: string;
	readonly kpp?: string | undefined;
	readonly contractNumber: string;
	readonly contractDate: string; // ISO YYYY-MM-DD
}

export const dmsRegistryInsuranceCompanyInfoSchema = z.object({
	companyId: z.string().min(1),
	nameRu: z.string().min(1, { message: "Наименование страховой компании обязательно" }),
	inn: z.string().min(10).max(12, { message: "ИНН страховой компании обязателен" }),
	kpp: z.string().optional(),
	contractNumber: z.string().min(1, { message: "Номер договора обязателен" }),
	contractDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Дата договора должна быть в формате YYYY-MM-DD" }),
});

export interface DmsRegistryRecord {
	readonly recordId: string;
	readonly serviceDate: string; // ISO YYYY-MM-DD
	readonly patientFullName: string;
	readonly patientBirthDate: string; // ISO YYYY-MM-DD
	readonly patientGender: "M" | "F" | "М" | "Ж";
	readonly patientSnils?: string | undefined;
	readonly policyNumber: string;
	readonly guaranteeLetterNumber: string;
	readonly guaranteeLetterDate?: string | undefined; // ISO YYYY-MM-DD
	readonly icd10Code: string; // e.g. "K02.1", "K04.0"
	readonly icd10DescriptionRu: string;
	readonly toothNumberFdi?: number | undefined; // e.g. 16, 21, 0 for general
	readonly serviceCode804n: string; // e.g. "A16.07.002.001"
	readonly serviceNameRu: string;
	readonly doctorFullName: string;
	readonly doctorSpecialtyRu?: string | undefined;
	readonly doctorSnils?: string | undefined;
	readonly quantity: number;
	readonly unitPriceKopecks: Kopecks;
	readonly totalGrossKopecks: Kopecks;
	readonly franchisePercent: number; // 0..100
	readonly patientPaidKopecks: Kopecks;
	readonly insurerClaimKopecks: Kopecks;
}

export const dmsRegistryRecordSchema = z.object({
	recordId: z.string().min(1),
	serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	patientFullName: z.string().min(1),
	patientBirthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	patientGender: z.enum(["M", "F", "М", "Ж"]),
	patientSnils: z.string().optional(),
	policyNumber: z.string().min(1),
	guaranteeLetterNumber: z.string().min(1),
	guaranteeLetterDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
	icd10Code: z.string().min(1),
	icd10DescriptionRu: z.string().min(1),
	toothNumberFdi: z.number().int().min(0).max(85).optional(),
	serviceCode804n: z.string().min(1),
	serviceNameRu: z.string().min(1),
	doctorFullName: z.string().min(1),
	doctorSpecialtyRu: z.string().optional(),
	doctorSnils: z.string().optional(),
	quantity: z.number().int().positive(),
	unitPriceKopecks: z.number().int().nonnegative(),
	totalGrossKopecks: z.number().int().nonnegative(),
	franchisePercent: z.number().int().min(0).max(100),
	patientPaidKopecks: z.number().int().nonnegative(),
	insurerClaimKopecks: z.number().int().nonnegative(),
});

export interface DmsRegistryData {
	readonly registryNumber: string;
	readonly registryDate: string; // ISO YYYY-MM-DD
	readonly periodStart: string; // ISO YYYY-MM-DD
	readonly periodEnd: string; // ISO YYYY-MM-DD
	readonly clinic: DmsRegistryClinicInfo;
	readonly insuranceCompany: DmsRegistryInsuranceCompanyInfo;
	readonly records: readonly DmsRegistryRecord[];
}

export const dmsRegistryDataSchema = z.object({
	registryNumber: z.string().min(1, { message: "Номер реестра обязателен" }),
	registryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	clinic: dmsRegistryClinicInfoSchema,
	insuranceCompany: dmsRegistryInsuranceCompanyInfoSchema,
	records: z.array(dmsRegistryRecordSchema),
});

export interface DmsRegistryTotals {
	readonly totalRecordsCount: number;
	readonly uniquePatientsCount: number;
	readonly totalGrossKopecks: Kopecks;
	readonly totalPatientPaidKopecks: Kopecks;
	readonly totalInsurerClaimKopecks: Kopecks;
	readonly totalGrossRub: string;
	readonly totalPatientPaidRub: string;
	readonly totalInsurerClaimRub: string;
	readonly totalInsurerClaimInWordsRu: string;
}

/**
 * Calculates aggregated totals for the DMS claim registry.
 */
export function calculateDmsRegistryTotals(
	records: readonly DmsRegistryRecord[],
): DmsRegistryTotals {
	let totalGross = 0;
	let totalPatient = 0;
	let totalInsurer = 0;
	const uniquePatients = new Set<string>();

	for (const rec of records) {
		totalGross += rec.totalGrossKopecks;
		totalPatient += rec.patientPaidKopecks;
		totalInsurer += rec.insurerClaimKopecks;
		uniquePatients.add(rec.patientFullName.trim().toLowerCase() + "_" + rec.policyNumber.trim());
	}

	return {
		totalRecordsCount: records.length,
		uniquePatientsCount: uniquePatients.size,
		totalGrossKopecks: totalGross,
		totalPatientPaidKopecks: totalPatient,
		totalInsurerClaimKopecks: totalInsurer,
		totalGrossRub: kopecksToNumericString(totalGross),
		totalPatientPaidRub: kopecksToNumericString(totalPatient),
		totalInsurerClaimRub: kopecksToNumericString(totalInsurer),
		totalInsurerClaimInWordsRu: amountToWordsRu(totalInsurer),
	};
}

/**
 * Generates official XML DMS Claim Registry document for electronic data interchange.
 */
export function generateDmsRegistryXml(data: DmsRegistryData): string {
	const totals = calculateDmsRegistryTotals(data.records);

	const xmlLines: string[] = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<РеестрСчетовДМС xmlns="urn:dente:dms:registry:v1.0" ВерсияФормата="1.00">',
		'  <Шапка>',
		`    <НомерРеестра>${escapeXml(data.registryNumber)}</НомерРеестра>`,
		`    <ДатаРеестра>${escapeXml(data.registryDate)}</ДатаРеестра>`,
		`    <ПериодС>${escapeXml(data.periodStart)}</ПериодС>`,
		`    <ПериодПо>${escapeXml(data.periodEnd)}</ПериодПо>`,
		'  </Шапка>',
		'  <Клиника>',
		`    <Наименование>${escapeXml(data.clinic.nameRu)}</Наименование>`,
		`    <ИНН>${escapeXml(data.clinic.inn)}</ИНН>`,
		`    <КПП>${escapeXml(data.clinic.kpp || "")}</КПП>`,
		`    <ОГРН>${escapeXml(data.clinic.ogrn)}</ОГРН>`,
		`    <Адрес>${escapeXml(data.clinic.addressRu)}</Адрес>`,
		`    <Телефон>${escapeXml(data.clinic.phone)}</Телефон>`,
		`    <Лицензия>${escapeXml(data.clinic.medicalLicenseNumber)}</Лицензия>`,
		`    <ГлавныйВрач>${escapeXml(data.clinic.chiefDoctorNameRu)}</ГлавныйВрач>`,
		`    <ГлавныйБухгалтер>${escapeXml(data.clinic.chiefAccountantNameRu)}</ГлавныйБухгалтер>`,
		'  </Клиника>',
		'  <СтраховаяКомпания>',
		`    <Идентификатор>${escapeXml(data.insuranceCompany.companyId)}</Идентификатор>`,
		`    <Наименование>${escapeXml(data.insuranceCompany.nameRu)}</Наименование>`,
		`    <ИНН>${escapeXml(data.insuranceCompany.inn)}</ИНН>`,
		`    <НомерДоговора>${escapeXml(data.insuranceCompany.contractNumber)}</НомерДоговора>`,
		`    <ДатаДоговора>${escapeXml(data.insuranceCompany.contractDate)}</ДатаДоговора>`,
		'  </СтраховаяКомпания>',
		'  <СводныеИтоги>',
		`    <КоличествоЗаписей>${totals.totalRecordsCount}</КоличествоЗаписей>`,
		`    <КоличествоПациентов>${totals.uniquePatientsCount}</КоличествоПациентов>`,
		`    <СуммаВсегоКопеек>${totals.totalGrossKopecks}</СуммаВсегоКопеек>`,
		`    <СуммаВсегоРублей>${totals.totalGrossRub}</СуммаВсегоРублей>`,
		`    <ОплаченоПациентамиКопеек>${totals.totalPatientPaidKopecks}</ОплаченоПациентамиКопеек>`,
		`    <ОплаченоПациентамиРублей>${totals.totalPatientPaidRub}</ОплаченоПациентамиРублей>`,
		`    <КСтраховойОплатеКопеек>${totals.totalInsurerClaimKopecks}</КСтраховойОплатеКопеек>`,
		`    <КСтраховойОплатеРублей>${totals.totalInsurerClaimRub}</КСтраховойОплатеРублей>`,
		`    <СуммаПрописью>${escapeXml(totals.totalInsurerClaimInWordsRu)}</СуммаПрописью>`,
		'  </СводныеИтоги>',
		'  <ЗаписиРеестра>',
	];

	for (let i = 0; i < data.records.length; i++) {
		const rec = data.records[i]!;
		xmlLines.push(
			'    <Запись>',
			`      <ПорядковыйНомер>${i + 1}</ПорядковыйНомер>`,
			`      <Идентификатор>${escapeXml(rec.recordId)}</Идентификатор>`,
			`      <ДатаОказания>${escapeXml(rec.serviceDate)}</ДатаОказания>`,
			'      <Застрахованный>',
			`        <ФИО>${escapeXml(rec.patientFullName)}</ФИО>`,
			`        <ДатаРождения>${escapeXml(rec.patientBirthDate)}</ДатаРождения>`,
			`        <Пол>${escapeXml(rec.patientGender)}</Пол>`,
			rec.patientSnils ? `        <СНИЛС>${escapeXml(rec.patientSnils)}</СНИЛС>` : "",
			`        <НомерПолиса>${escapeXml(rec.policyNumber)}</НомерПолиса>`,
			`        <НомерГарантийногоПисьма>${escapeXml(rec.guaranteeLetterNumber)}</НомерГарантийногоПисьма>`,
			rec.guaranteeLetterDate ? `        <ДатаГарантийногоПисьма>${escapeXml(rec.guaranteeLetterDate)}</ДатаГарантийногоПисьма>` : "",
			'      </Застрахованный>',
			'      <Диагноз>',
			`        <КодМКБ10>${escapeXml(rec.icd10Code)}</КодМКБ10>`,
			`        <Описание>${escapeXml(rec.icd10DescriptionRu)}</Описание>`,
			rec.toothNumberFdi ? `        <ЗубFDI>${rec.toothNumberFdi}</ЗубFDI>` : "",
			'      </Диагноз>',
			'      <Услуга>',
			`        <Код804н>${escapeXml(rec.serviceCode804n)}</Код804н>`,
			`        <Наименование>${escapeXml(rec.serviceNameRu)}</Наименование>`,
			`        <Количество>${rec.quantity}</Количество>`,
			`        <ЦенаКопеек>${rec.unitPriceKopecks}</ЦенаКопеек>`,
			`        <ЦенаРублей>${kopecksToNumericString(rec.unitPriceKopecks)}</ЦенаРублей>`,
			`        <СтоимостьКопеек>${rec.totalGrossKopecks}</СтоимостьКопеек>`,
			`        <СтоимостьРублей>${kopecksToNumericString(rec.totalGrossKopecks)}</СтоимостьРублей>`,
			'      </Услуга>',
			'      <Врач>',
			`        <ФИО>${escapeXml(rec.doctorFullName)}</ФИО>`,
			rec.doctorSpecialtyRu ? `        <Специальность>${escapeXml(rec.doctorSpecialtyRu)}</Специальность>` : "",
			rec.doctorSnils ? `        <СНИЛС>${escapeXml(rec.doctorSnils)}</СНИЛС>` : "",
			'      </Врач>',
			'      <Финансы>',
			`        <ФраншизаПроцент>${rec.franchisePercent}</ФраншизаПроцент>`,
			`        <ОплаченоПациентомКопеек>${rec.patientPaidKopecks}</ОплаченоПациентомКопеек>`,
			`        <ОплаченоПациентомРублей>${kopecksToNumericString(rec.patientPaidKopecks)}</ОплаченоПациентомРублей>`,
			`        <КСтраховойОплатеКопеек>${rec.insurerClaimKopecks}</КСтраховойОплатеКопеек>`,
			`        <КСтраховойОплатеРублей>${kopecksToNumericString(rec.insurerClaimKopecks)}</КСтраховойОплатеРублей>`,
			'      </Финансы>',
			'    </Запись>',
		);
	}

	xmlLines.push('  </ЗаписиРеестра>', '</РеестрСчетовДМС>');

	// Filter empty string lines and join
	return xmlLines.filter(Boolean).join("\n");
}

/**
 * Escapes a cell value for standard CSV format.
 */
function escapeCsvCell(value: string | number | undefined | null): string {
	if (value === undefined || value === null) return "";
	const str = String(value);
	if (str.includes(";") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

/**
 * Generates standard CSV claim registry file with UTF-8 BOM for Microsoft Excel & ARM Strakhovshchik.
 */
export function generateDmsRegistryCsv(data: DmsRegistryData): string {
	const totals = calculateDmsRegistryTotals(data.records);

	const headerColumns = [
		"№ п/п",
		"Дата услуги",
		"ФИО застрахованного",
		"Дата рождения",
		"Пол",
		"СНИЛС",
		"Номер полиса ДМС",
		"Номер гарантийного письма",
		"Дата гарантийного письма",
		"Код МКБ-10",
		"Диагноз МКБ-10",
		"Зуб (FDI)",
		"Код услуги 804н",
		"Наименование услуги",
		"Кол-во",
		"Цена (руб)",
		"Стоимость (руб)",
		"Франшиза (%)",
		"Оплачено пациентом (руб)",
		"К оплате страховой (руб)",
		"ФИО врача",
		"Специальность врача",
	];

	const rows: string[] = [headerColumns.map(escapeCsvCell).join(";")];

	for (let i = 0; i < data.records.length; i++) {
		const rec = data.records[i]!;
		const rowValues = [
			i + 1,
			rec.serviceDate,
			rec.patientFullName,
			rec.patientBirthDate,
			rec.patientGender,
			rec.patientSnils ?? "",
			rec.policyNumber,
			rec.guaranteeLetterNumber,
			rec.guaranteeLetterDate ?? "",
			rec.icd10Code,
			rec.icd10DescriptionRu,
			rec.toothNumberFdi ?? "",
			rec.serviceCode804n,
			rec.serviceNameRu,
			rec.quantity,
			kopecksToNumericString(rec.unitPriceKopecks),
			kopecksToNumericString(rec.totalGrossKopecks),
			rec.franchisePercent,
			kopecksToNumericString(rec.patientPaidKopecks),
			kopecksToNumericString(rec.insurerClaimKopecks),
			rec.doctorFullName,
			rec.doctorSpecialtyRu ?? "",
		];
		rows.push(rowValues.map(escapeCsvCell).join(";"));
	}

	// Add summary row
	const summaryRow = [
		"ИТОГО",
		"",
		`Пациентов: ${totals.uniquePatientsCount}`,
		"",
		"",
		"",
		"",
		"",
		"",
		"",
		"",
		"",
		"",
		`Услуг: ${totals.totalRecordsCount}`,
		data.records.reduce((acc, r) => acc + r.quantity, 0),
		"",
		totals.totalGrossRub,
		"",
		totals.totalPatientPaidRub,
		totals.totalInsurerClaimRub,
		"",
		"",
	];
	rows.push(summaryRow.map(escapeCsvCell).join(";"));

	// UTF-8 BOM (\uFEFF) ensures Russian characters are properly decoded in Windows Excel
	return "\uFEFF" + rows.join("\r\n");
}

/**
 * Generates an A4 Landscape Printable HTML Consolidated Invoice-Registry for DMS.
 */
export function generateDmsRegistryA4Html(data: DmsRegistryData): string {
	const totals = calculateDmsRegistryTotals(data.records);

	const rowsHtml = data.records
		.map((rec, index) => {
			const toothDisplay = rec.toothNumberFdi && rec.toothNumberFdi > 0 ? String(rec.toothNumberFdi) : "—";
			return `<tr>
				<td class="text-center">${index + 1}</td>
				<td class="text-center whitespace-nowrap">${rec.serviceDate}</td>
				<td class="font-medium">${escapeXml(rec.patientFullName)}<div class="text-muted text-xs">Полис: ${escapeXml(rec.policyNumber)}</div></td>
				<td class="text-center">${escapeXml(rec.guaranteeLetterNumber)}</td>
				<td class="text-center font-mono">${escapeXml(rec.icd10Code)}</td>
				<td class="text-center">${toothDisplay}</td>
				<td class="font-mono text-xs">${escapeXml(rec.serviceCode804n)}</td>
				<td>${escapeXml(rec.serviceNameRu)}</td>
				<td class="text-center">${rec.quantity}</td>
				<td class="text-right whitespace-nowrap">${formatKopecksRu(rec.unitPriceKopecks)}</td>
				<td class="text-right whitespace-nowrap">${formatKopecksRu(rec.totalGrossKopecks)}</td>
				<td class="text-center">${rec.franchisePercent}%</td>
				<td class="text-right whitespace-nowrap">${formatKopecksRu(rec.patientPaidKopecks)}</td>
				<td class="text-right whitespace-nowrap font-bold">${formatKopecksRu(rec.insurerClaimKopecks)}</td>
				<td class="text-xs">${escapeXml(rec.doctorFullName)}</td>
			</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Сводный счет-реестр ДМС № ${escapeXml(data.registryNumber)}</title>
	<style>
		@page {
			size: A4 landscape;
			margin: 10mm 10mm 12mm 10mm;
		}
		* {
			box-sizing: border-box;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
			font-size: 10px;
			line-height: 1.35;
			color: #111827;
			background: #ffffff;
			margin: 0;
			padding: 10px;
		}
		.header {
			display: flex;
			justify-content: space-between;
			border-bottom: 2px solid #1e293b;
			padding-bottom: 8px;
			margin-bottom: 12px;
		}
		.clinic-info {
			max-width: 55%;
		}
		.clinic-title {
			font-size: 14px;
			font-weight: 700;
			color: #0f172a;
			margin-bottom: 4px;
		}
		.clinic-details {
			font-size: 9px;
			color: #475569;
		}
		.insurer-info {
			max-width: 40%;
			text-align: right;
		}
		.insurer-title {
			font-size: 13px;
			font-weight: 700;
			color: #0f172a;
		}
		.document-title {
			text-align: center;
			margin: 12px 0 8px 0;
		}
		.document-title h1 {
			font-size: 16px;
			font-weight: 800;
			margin: 0;
			text-transform: uppercase;
			letter-spacing: 0.5px;
			color: #0f172a;
		}
		.document-title p {
			margin: 3px 0 0 0;
			font-size: 11px;
			color: #475569;
		}
		table.registry-table {
			width: 100%;
			border-collapse: collapse;
			margin-top: 8px;
			font-size: 9px;
		}
		table.registry-table th, table.registry-table td {
			border: 1px solid #cbd5e1;
			padding: 4px 5px;
		}
		table.registry-table th {
			background-color: #f1f5f9;
			font-weight: 700;
			text-align: center;
			color: #1e293b;
			font-size: 8.5px;
		}
		table.registry-table tbody tr:nth-child(even) {
			background-color: #f8fafc;
		}
		.text-center { text-align: center; }
		.text-right { text-align: right; }
		.font-medium { font-weight: 600; }
		.font-bold { font-weight: 700; }
		.font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
		.whitespace-nowrap { white-space: nowrap; }
		.text-xs { font-size: 8px; }
		.text-muted { color: #64748b; }
		
		.totals-box {
			margin-top: 14px;
			padding: 10px 14px;
			background-color: #f8fafc;
			border: 1px solid #cbd5e1;
			border-radius: 4px;
			display: flex;
			justify-content: space-between;
			align-items: center;
		}
		.totals-words {
			max-width: 60%;
		}
		.totals-words-label {
			font-size: 9px;
			color: #475569;
			text-transform: uppercase;
			font-weight: 600;
		}
		.totals-words-value {
			font-size: 11px;
			font-weight: 700;
			color: #0f172a;
			margin-top: 2px;
		}
		.totals-numbers {
			text-align: right;
		}
		.totals-row {
			font-size: 10px;
			margin-bottom: 2px;
		}
		.totals-row.grand {
			font-size: 13px;
			font-weight: 800;
			color: #0f172a;
			border-top: 1px solid #cbd5e1;
			padding-top: 4px;
			margin-top: 4px;
		}
		.signatures {
			margin-top: 25px;
			display: flex;
			justify-content: space-between;
			font-size: 10px;
		}
		.signature-block {
			width: 45%;
		}
		.signature-line {
			border-bottom: 1px solid #111827;
			margin-top: 25px;
			display: flex;
			justify-content: space-between;
			font-size: 9px;
			color: #475569;
			padding-bottom: 2px;
		}
		.stamp-place {
			margin-top: 10px;
			font-size: 11px;
			font-weight: 700;
			color: #64748b;
		}
	</style>
</head>
<body>
	<div class="header">
		<div class="clinic-info">
			<div class="clinic-title">${escapeXml(data.clinic.nameRu)}</div>
			<div class="clinic-details">
				ИНН: ${escapeXml(data.clinic.inn)} | КПП: ${escapeXml(data.clinic.kpp || "—")} | ОГРН: ${escapeXml(data.clinic.ogrn)}<br>
				Адрес: ${escapeXml(data.clinic.addressRu)}<br>
				Лицензия: ${escapeXml(data.clinic.medicalLicenseNumber)} | Тел: ${escapeXml(data.clinic.phone)}
			</div>
		</div>
		<div class="insurer-info">
			<div class="insurer-title">Страховщик: ${escapeXml(data.insuranceCompany.nameRu)}</div>
			<div class="clinic-details">
				ИНН: ${escapeXml(data.insuranceCompany.inn)}<br>
				Договор ДМС № ${escapeXml(data.insuranceCompany.contractNumber)} от ${escapeXml(data.insuranceCompany.contractDate)}
			</div>
		</div>
	</div>

	<div class="document-title">
		<h1>Сводный счет-реестр оказанных медицинских услуг ДМС № ${escapeXml(data.registryNumber)}</h1>
		<p>за отчетный период с ${escapeXml(data.periodStart)} по ${escapeXml(data.periodEnd)} (Дата формирования: ${escapeXml(data.registryDate)})</p>
	</div>

	<table class="registry-table">
		<thead>
			<tr>
				<th style="width: 25px;">№</th>
				<th style="width: 60px;">Дата</th>
				<th>Застрахованный / Полис</th>
				<th style="width: 65px;">Гар. письмо</th>
				<th style="width: 45px;">МКБ-10</th>
				<th style="width: 30px;">Зуб</th>
				<th style="width: 75px;">Код 804н</th>
				<th>Наименование услуги</th>
				<th style="width: 25px;">Кол</th>
				<th style="width: 55px;">Цена</th>
				<th style="width: 60px;">Всего</th>
				<th style="width: 35px;">Франш.</th>
				<th style="width: 60px;">Пациент</th>
				<th style="width: 65px;">К оплате СМО</th>
				<th style="width: 90px;">Врач</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml}
		</tbody>
	</table>

	<div class="totals-box">
		<div class="totals-words">
			<div class="totals-words-label">Всего к оплате страховой компанией (прописью):</div>
			<div class="totals-words-value">${escapeXml(totals.totalInsurerClaimInWordsRu)}</div>
		</div>
		<div class="totals-numbers">
			<div class="totals-row">Всего оказано услуг: <b>${totals.totalRecordsCount}</b> (пациентов: <b>${totals.uniquePatientsCount}</b>)</div>
			<div class="totals-row">Общая стоимость услуг: <b>${formatKopecksRu(totals.totalGrossKopecks)}</b></div>
			<div class="totals-row">Оплачено пациентами по франшизе: <b>${formatKopecksRu(totals.totalPatientPaidKopecks)}</b></div>
			<div class="totals-row grand">К оплате страховой компанией: ${formatKopecksRu(totals.totalInsurerClaimKopecks)}</div>
		</div>
	</div>

	<div class="signatures">
		<div class="signature-block">
			Руководитель медицинской организации:<br>
			<div class="signature-line">
				<span>${escapeXml(data.clinic.chiefDoctorNameRu)}</span>
				<span>(подпись / расшифровка)</span>
			</div>
			<div class="stamp-place">М.П.</div>
		</div>
		<div class="signature-block">
			Главный бухгалтер:<br>
			<div class="signature-line">
				<span>${escapeXml(data.clinic.chiefAccountantNameRu)}</span>
				<span>(подпись / расшифровка)</span>
			</div>
		</div>
	</div>
</body>
</html>`;
}

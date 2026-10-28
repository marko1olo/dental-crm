import { kopecksToNumericString } from "../../utils/money.js";
import type { DmsRegistryData } from "./registryTypes.js";
import { calculateDmsRegistryTotals } from "./registryKopeckCalculator.js";
import { escapeCsvCell } from "./registrySanitizer.js";

/**
 * Generates standard CSV claim registry file with UTF-8 BOM for Microsoft Excel & ARM Strakhovshchik.
 */
export function generateDmsRegistryCsv(data: DmsRegistryData): string {
	const totals = calculateDmsRegistryTotals(data.records);

	const headerColumns = [
		"№ п/п", "Дата услуги", "ФИО застрахованного", "Дата рождения", "Пол", "СНИЛС",
		"Номер полиса ДМС", "Номер гарантийного письма", "Дата гарантийного письма",
		"Код МКБ-10", "Диагноз МКБ-10", "Зуб (FDI)", "Код услуги 804н", "Наименование услуги",
		"Кол-во", "Цена (руб)", "Стоимость (руб)", "Франшиза (%)", "Оплачено пациентом (руб)",
		"К оплате страховой (руб)", "ФИО врача", "Специальность врача",
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

	const summaryRow = [
		"ИТОГО", "", `Пациентов: ${totals.uniquePatientsCount}`, "", "", "", "", "", "", "", "", "", "",
		`Услуг: ${totals.totalRecordsCount}`, data.records.reduce((acc, r) => acc + r.quantity, 0), "",
		totals.totalGrossRub, "", totals.totalPatientPaidRub, totals.totalInsurerClaimRub, "", "",
	];
	rows.push(summaryRow.map(escapeCsvCell).join(";"));

	return "\uFEFF" + rows.join("\r\n");
}

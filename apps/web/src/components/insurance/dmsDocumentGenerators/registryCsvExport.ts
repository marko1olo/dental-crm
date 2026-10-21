/**
 * registryCsvExport.ts — Экспорт реестра в формат CSV (RFC 4180 с UTF-8 BOM для 1C/Excel)
 */

import { kopecksToRub } from "../dmsInsuranceEngine.js";
import type { DmsStatutoryRegistry } from "./types.js";

export function exportRegistryToCsv(registry: DmsStatutoryRegistry): string {
	const headers = [
		"№ п/п", "Дата оказания", "ФИО Застрахованного", "Номер полиса ДМС",
		"Номер гарантийного письма", "Код услуги", "Наименование медицинской услуги",
		"Номер зуба (FDI)", "Диагноз (МКБ-10)", "Врач", "Кол-во", "Тариф (руб)",
		"Сумма по прайсу (руб)", "Принято ДМС (руб)", "Сооплата пациента (руб)", "Ставка НДС",
	];

	const rows: string[] = [headers.join(";")];

	registry.items.forEach((item, index) => {
		const row = [
			(index + 1).toString(), item.visitDate,
			`"${item.patientFullName.replace(/"/g, '""')}"`,
			`"${item.policyNumber.replace(/"/g, '""')}"`,
			`"${(item.guaranteeLetterNumber ?? "").replace(/"/g, '""')}"`,
			item.serviceCode804n, `"${item.serviceName.replace(/"/g, '""')}"`,
			item.toothNumber ?? "", item.diagnosisMkb10,
			`"${item.doctorFullName.replace(/"/g, '""')}"`, item.quantity.toString(),
			kopecksToRub(item.unitPriceKopecks).toFixed(2),
			kopecksToRub(item.totalBillKopecks).toFixed(2),
			kopecksToRub(item.dmsAcceptedKopecks).toFixed(2),
			kopecksToRub(item.patientPaidKopecks).toFixed(2),
			"Без НДС (пп. 2 п. 2 ст. 149 НК РФ)",
		];
		rows.push(row.join(";"));
	});

	rows.push([
		"ИТОГО ПО РЕЕСТРУ", "", "", "", "", "", "", "", "", "",
		registry.items.length.toString(), "",
		kopecksToRub(registry.grandTotalBillKopecks).toFixed(2),
		kopecksToRub(registry.grandTotalDmsKopecks).toFixed(2),
		kopecksToRub(registry.grandTotalPatientKopecks).toFixed(2), "",
	].join(";"));

	return `\uFEFF${rows.join("\r\n")}`;
}

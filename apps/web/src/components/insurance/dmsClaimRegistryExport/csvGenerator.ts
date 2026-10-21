/**
 * csvGenerator.ts — Генерация реестра ДМС в формате CSV (RFC 4180 с UTF-8 BOM для Excel)
 */

import type { ClinicLegalProfile, DmsRegistryItemRecord } from "./types.js";

export function generateDmsRegistryCsv(
	records: readonly DmsRegistryItemRecord[],
	clinic: ClinicLegalProfile,
	selectedInsurerTitle: string,
	periodStr: string,
): string {
	const headers = [
		"№ п/п",
		"Дата визита",
		"Ф.И.О. Застрахованного",
		"Номер полиса ДМС",
		"Гарантийное письмо",
		"Страховая компания",
		"Код услуги (804н)",
		"Наименование медицинской услуги",
		"Зуб (FDI)",
		"Диагноз (МКБ-10)",
		"Лечащий врач",
		"Кол-во",
		"Тариф (руб)",
		"Сумма по прейскуранту (руб)",
		"К оплате ДМС (руб)",
		"Сооплата пациента (руб)",
		"Ставка НДС",
		"Статус",
	];

	const rows: string[] = [headers.join(";")];

	records.forEach((r, idx) => {
		const row = [
			(idx + 1).toString(),
			r.visitDate,
			`"${r.patientFullName.replace(/"/g, '""')}"`,
			`"${r.policyNumber.replace(/"/g, '""')}"`,
			`"${(r.guaranteeLetterNumber || "").replace(/"/g, '""')}"`,
			`"${r.insurerName.replace(/"/g, '""')}"`,
			r.serviceCode804n,
			`"${r.serviceName.replace(/"/g, '""')}"`,
			r.toothNumber ? r.toothNumber.toString() : "",
			r.diagnosisMkb10,
			`"${r.doctorFullName.replace(/"/g, '""')}"`,
			r.quantity.toString(),
			(r.unitPriceKopecks / 100).toFixed(2),
			(r.totalPriceKopecks / 100).toFixed(2),
			(r.dmsCoveredKopecks / 100).toFixed(2),
			(r.patientPaidKopecks / 100).toFixed(2),
			"Без НДС (пп. 2 п. 2 ст. 149 НК РФ)",
			r.status === "accepted" ? "Принято" : r.status === "copay_required" ? "Франшиза/Доплата" : "На экспертизе",
		];
		rows.push(row.join(";"));
	});

	const totalBill = records.reduce((acc, r) => acc + r.totalPriceKopecks, 0) / 100;
	const totalDms = records.reduce((acc, r) => acc + r.dmsCoveredKopecks, 0) / 100;
	const totalPatient = records.reduce((acc, r) => acc + r.patientPaidKopecks, 0) / 100;

	rows.push(
		[
			"ИТОГО ПО РЕЕСТРУ",
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
			records.length.toString(),
			"",
			totalBill.toFixed(2),
			totalDms.toFixed(2),
			totalPatient.toFixed(2),
			"",
			"",
		].join(";"),
	);

	return `\uFEFF${rows.join("\r\n")}`;
}

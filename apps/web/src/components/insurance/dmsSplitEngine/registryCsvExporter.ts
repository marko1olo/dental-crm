/**
 * registryCsvExporter.ts — Экспорт реестра оказанных услуг ДМС в формат CSV
 */

import type { DmsReconciliationRegistry } from "./types.js";

export function exportDmsRegistryToCsv(registry: DmsReconciliationRegistry): string {
	const headers = [
		"№ п/п", "Дата услуги", "Ф.И.О. пациента", "Номер полиса ДМС",
		"Гарантийное письмо", "Диагноз (МКБ-10)", "Зуб", "Код услуги",
		"Наименование услуги", "Кол-во", "Цена, руб.", "Сумма, руб.",
		"К оплате ДМС, руб.", "Сооплата пациентом, руб.", "НДС",
	];

	const rows = registry.items.map((item) => [
		item.itemIndex.toString(),
		item.serviceDate,
		`"${item.patientFullName.replace(/"/g, '""')}"`,
		`"${item.policyNumber}"`,
		`"${item.guaranteeLetterNumber || ""}"`,
		`"${item.diagnosisIcd10 || ""}"`,
		`"${item.toothNumber || ""}"`,
		`"${item.serviceCode}"`,
		`"${item.serviceName.replace(/"/g, '""')}"`,
		item.quantity.toString(),
		item.unitPriceRubles.toFixed(2),
		item.totalAmountRubles.toFixed(2),
		item.dmsAcceptedAmountRubles.toFixed(2),
		item.patientPaidAmountRubles.toFixed(2),
		"Без НДС (пп. 2 п. 2 ст. 149 НК РФ)",
	]);

	const totalRow = [
		"ИТОГО ПО РЕЕСТРУ", "", "", "", "", "", "", "", "",
		registry.totalServicesCount.toString(), "",
		registry.totalRegistryAmountRubles.toFixed(2),
		registry.totalDmsClaimedRubles.toFixed(2),
		registry.totalPatientCoPaymentRubles.toFixed(2),
		"",
	];

	const csvLines = [
		`"РЕЕСТР ОКАЗАННЫХ УСЛУГ ПО ДОГОВОРУ ДМС № ${registry.registryNumber}"`,
		`"Страховая компания: ${registry.insurer.fullName}"`,
		`"Медицинская организация: ${registry.clinicName} (ИНН: ${registry.clinicInn})"` ,
		`"Период: с ${registry.periodStart} по ${registry.periodEnd}"`,
		`"Дата формирования: ${registry.registryDate}"`,
		"",
		headers.map((h) => `"${h}"`).join(";"),
		...rows.map((r) => r.join(";")),
		totalRow.map((c) => (c ? `"${c}"` : '""')).join(";"),
	];

	return `\uFEFF${csvLines.join("\r\n")}`;
}

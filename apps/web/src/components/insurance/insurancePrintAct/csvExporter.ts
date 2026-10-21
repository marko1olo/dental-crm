/**
 * csvExporter.ts — Экспорт реестра оказанных услуг по ДМС в CSV с кодировкой UTF-8 BOM
 */

import { calculateRegistryTotals, type DmsRegistryServiceRecord } from "../insuranceMath.js";

export function exportRegistryToCsv(
	records: readonly DmsRegistryServiceRecord[],
	clinicInfo: { name: string; inn: string; kpp?: string | undefined },
	insurerName: string,
	periodStr: string,
): string {
	const escapeCsv = (val: string | number | null | undefined): string => {
		if (val == null) return '""';
		return `"${String(val).replace(/"/g, '""')}"`;
	};

	const headerLines: string[] = [
		`# Реестр оказанных медицинских услуг по ДМС;${escapeCsv(clinicInfo.name)};ИНН: ${escapeCsv(clinicInfo.inn)}`,
		`# Страховая компания: ${escapeCsv(insurerName)};Период: ${escapeCsv(periodStr)}`,
		`# Дата формирования: ${new Date().toLocaleDateString("ru-RU")}`,
		"",
		[
			escapeCsv("№ п/п"), escapeCsv("Дата визита"), escapeCsv("ФИО Пациента"), escapeCsv("Номер полиса ДМС"),
			escapeCsv("№ Гар. письма"), escapeCsv("Код услуги"), escapeCsv("Наименование услуги"),
			escapeCsv("Диагноз (МКБ-10)"), escapeCsv("Зуб"), escapeCsv("Кол-во"), escapeCsv("Цена за ед. (руб)"),
			escapeCsv("Сумма всего (руб)"), escapeCsv("Покрыто ДМС (руб)"), escapeCsv("Доплата пациента (руб)"),
			escapeCsv("Врач-стоматолог"), escapeCsv("Статус/Примечание"),
		].join(";"),
	];

	const rows = records.map((r, idx) => {
		return [
			escapeCsv(idx + 1), escapeCsv(r.visitDate), escapeCsv(r.patientFullName),
			escapeCsv(r.policyNumber), escapeCsv(r.letterNumber || "—"), escapeCsv(r.serviceCode804n),
			escapeCsv(r.serviceName), escapeCsv(r.diagnosisCodeMkb10 || "—"), escapeCsv(r.toothNumber || "—"),
			escapeCsv(r.quantity), escapeCsv(r.unitPriceRub.toFixed(2)), escapeCsv(r.totalPriceRub.toFixed(2)),
			escapeCsv(r.dmsCoveredRub.toFixed(2)), escapeCsv(r.patientPaidRub.toFixed(2)),
			escapeCsv(r.doctorFullName || "—"),
			escapeCsv(r.isExcluded ? `Исключение (${r.exclusionReason || "не покрывается"})` : "Покрыто ДМС"),
		].join(";");
	});

	const totals = calculateRegistryTotals(records, insurerName, "", "");
	const totalRow = [
		escapeCsv("ИТОГО"), escapeCsv(""), escapeCsv(`Пациентов: ${totals.uniquePatientsCount}`),
		escapeCsv(""), escapeCsv(""), escapeCsv(""), escapeCsv(`Всего услуг: ${totals.totalServicesCount}`),
		escapeCsv(""), escapeCsv(""), escapeCsv(""), escapeCsv(""),
		escapeCsv(totals.totalAmountRub.toFixed(2)), escapeCsv(totals.totalDmsCoveredRub.toFixed(2)),
		escapeCsv(totals.totalPatientPaidRub.toFixed(2)), escapeCsv(""),
		escapeCsv(totals.isBalanced ? "БАЛАНС СХОДИТСЯ" : "ОШИБКА БАЛАНСА"),
	].join(";");

	return `\uFEFF${[...headerLines, ...rows, "", totalRow].join("\r\n")}`;
}

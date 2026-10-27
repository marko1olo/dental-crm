/**
 * exportCsvTsvFormatter.ts — CSV/TSV Table Export Engine with UTF-8 BOM.
 * Wave 130 & Mandate 8b (<= 120 lines).
 * Standard: UTF-8 BOM (\uFEFF) ensures Cyrillic loads seamlessly in Russian 1C / Excel.
 */

import { type BankStatementOrder, type PaymentEntry } from "./exportTypes.js";
import { formatAmount1C, format1CDate } from "./export1CXmlFormatter.js";

const UTF8_BOM = "\uFEFF";

function escapeCsvField(val: string | number | null | undefined, delimiter: string): string {
	if (val == null) return "";
	const str = String(val).trim();
	if (str.includes(delimiter) || str.includes('"') || str.includes("\n") || str.includes("\r")) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

export function exportOrdersToCsv(orders: BankStatementOrder[], delimiter = ";"): string {
	const headers = [
		"Номер",
		"Дата",
		"Сумма (руб)",
		"Тип операции",
		"Плательщик",
		"ИНН плательщика",
		"Получатель",
		"ИНН получателя",
		"Назначение платежа",
	];

	const rows: string[] = [headers.map((h) => escapeCsvField(h, delimiter)).join(delimiter)];

	for (const o of orders) {
		const opLabel = o.operationType === "receipt" ? "Поступление" : "Списание";
		const row = [
			escapeCsvField(o.number, delimiter),
			escapeCsvField(format1CDate(o.date), delimiter),
			escapeCsvField(formatAmount1C(o.amountKopecks), delimiter),
			escapeCsvField(opLabel, delimiter),
			escapeCsvField(o.payerName, delimiter),
			escapeCsvField(o.payerInn || "", delimiter),
			escapeCsvField(o.recipientName, delimiter),
			escapeCsvField(o.recipientInn || "", delimiter),
			escapeCsvField(o.paymentPurpose, delimiter),
		];
		rows.push(row.join(delimiter));
	}

	return UTF8_BOM + rows.join("\r\n");
}

export function exportOrdersToTsv(orders: BankStatementOrder[]): string {
	return exportOrdersToCsv(orders, "\t");
}

export function exportPaymentsToCsv(payments: PaymentEntry[], delimiter = ";"): string {
	const headers = [
		"ID",
		"Дата",
		"Сумма (руб)",
		"Способ",
		"Эквайер",
		"RRN",
		"Код авторизации",
		"Пациент",
	];

	const rows: string[] = [headers.map((h) => escapeCsvField(h, delimiter)).join(delimiter)];

	for (const p of payments) {
		const row = [
			escapeCsvField(p.id, delimiter),
			escapeCsvField(format1CDate(p.date), delimiter),
			escapeCsvField(formatAmount1C(p.amountKopecks), delimiter),
			escapeCsvField(p.paymentMethod, delimiter),
			escapeCsvField(p.acquirerName, delimiter),
			escapeCsvField(p.rrn || "", delimiter),
			escapeCsvField(p.authCode || "", delimiter),
			escapeCsvField(p.patientName || "", delimiter),
		];
		rows.push(row.join(delimiter));
	}

	return UTF8_BOM + rows.join("\r\n");
}

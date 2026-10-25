import type { LoyaltyLedgerEntry } from "./loyaltyTypes";

/**
 * Exports Loyalty Ledger to RFC 4180 CSV format with UTF-8 BOM
 */
export function exportLoyaltyLedgerToCsv(entries: readonly LoyaltyLedgerEntry[]): string {
	const BOM = "\uFEFF";
	const headers = [
		"ID операции",
		"Дата и время",
		"Пациент",
		"Номер медкарты",
		"Тип операции",
		"Сумма счета (руб)",
		"Изменение баллов (+/-)",
		"Баланс баллов после",
		"Способ оплаты",
		"Кассовый чек",
		"Сотрудник / Кассир",
		"Примечание",
	];

	function escapeCsv(value: string | number | undefined | null): string {
		if (value === undefined || value === null) return '""';
		const str = String(value).replace(/"/g, '""');
		return `"${str}"`;
	}

	const rows: string[] = [headers.map((h) => `"${h}"`).join(";")];

	for (const entry of entries) {
		const invoiceRub = (entry.invoiceAmountKop / 100).toFixed(2);
		const deltaStr = entry.pointsDeltaRub > 0 ? `+${entry.pointsDeltaRub}` : `${entry.pointsDeltaRub}`;
		const balanceStr = entry.balanceAfterRub.toFixed(0);

		const row = [
			escapeCsv(entry.id),
			escapeCsv(entry.timestampIso),
			escapeCsv(entry.patientName),
			escapeCsv(entry.medicalCardNumber),
			escapeCsv(entry.operationTypeRu),
			escapeCsv(invoiceRub),
			escapeCsv(deltaStr),
			escapeCsv(balanceStr),
			escapeCsv(entry.paymentMethodRu),
			escapeCsv(entry.fiscalReceiptNumber ?? "—"),
			escapeCsv(entry.staffNameRu),
			escapeCsv(entry.noteRu),
		];
		rows.push(row.join(";"));
	}

	return BOM + rows.join("\r\n");
}

/**
 * Форматирование строк по RFC 4180 с UTF-8 BOM для Excel и триггер скачивания.
 * Мандат 8b: <= 120 строк.
 */

export function escapeCsvField(value: unknown): string {
	if (value === null || value === undefined) {
		return "";
	}
	const str = String(value);
	if (
		str.includes('"') ||
		str.includes(",") ||
		str.includes(";") ||
		str.includes("\n") ||
		str.includes("\r")
	) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

export function formatCsvRow(fields: readonly unknown[], delimiter = ";"): string {
	return fields.map(escapeCsvField).join(delimiter);
}

export function buildRfc4180Csv(
	rows: readonly (readonly unknown[])[],
	delimiter = ";",
): string {
	const bom = "\uFEFF";
	const content = rows.map((r) => formatCsvRow(r, delimiter)).join("\r\n");
	return `${bom}${content}\r\n`;
}

export function triggerCsvDownload(csvContent: string, fileName: string): void {
	if (typeof window === "undefined" || !window.document) return;
	const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.setAttribute("href", url);
	link.setAttribute("download", fileName);
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

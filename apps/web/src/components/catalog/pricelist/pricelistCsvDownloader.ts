import { exportPricelistToCsv } from "./servicePricelistEngine";
import type { ServicePricelistItem } from "./servicePricelistPresets";

export function downloadPricelistCsv(
	items: readonly ServicePricelistItem[],
): void {
	const csvContent = exportPricelistToCsv(items, { delimiter: ";" });
	const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.setAttribute("href", url);
	link.setAttribute(
		"download",
		`DENTE_Pricelist_${new Date().toISOString().slice(0, 10)}.csv`,
	);
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

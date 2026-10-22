import {
	exportCabinetReadinessToCsv,
	generateCabinetReadinessPrintHtml,
	type CabinetReadinessRecord,
} from "@dental/shared";
import { showToast } from "../../GlobalToast.js";

export function exportCabinetReadinessCsv(historyRecords: readonly CabinetReadinessRecord[]): void {
	const csv = exportCabinetReadinessToCsv(historyRecords);
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `Cabinet_Readiness_${new Date().toISOString().slice(0, 10)}.csv`;
	a.click();
	URL.revokeObjectURL(url);
	showToast("Реестр готовности кабинетов выгружен в CSV (с UTF-8 BOM)", "success");
}

export function printCabinetReadinessHtml(historyRecords: readonly CabinetReadinessRecord[]): void {
	const html = generateCabinetReadinessPrintHtml({ records: historyRecords });
	const printWin = window.open("", "_blank");
	if (printWin) {
		printWin.document.write(html);
		printWin.document.close();
		printWin.focus();
		setTimeout(() => printWin.print(), 250);
	}
}

import { showToast } from "../../GlobalToast.js";
import {
	type AcceptanceWaybillDocument,
	exportWaybillToCsv,
	generateTorg12Html,
} from "../acceptanceWaybillsEngine.js";

export function printWaybillTorg12(wb: AcceptanceWaybillDocument): void {
	const html = generateTorg12Html(wb);
	const printWin = window.open("", "_blank");
	if (printWin) {
		printWin.document.write(html);
		printWin.document.close();
		printWin.focus();
		setTimeout(() => printWin.print(), 300);
	}
}

export function exportWaybillCsv(wb: AcceptanceWaybillDocument): void {
	const csvContent = exportWaybillToCsv(wb);
	const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.setAttribute(
		"download",
		`torg12_${wb.waybillNumber.replace(/\//g, "_")}.csv`,
	);
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
	showToast("Накладная экспортирована в CSV", "info");
}

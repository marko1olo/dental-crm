import { showToast } from "../../GlobalToast.js";
import {
	type AcceptanceWaybillDocument,
	exportWaybillToCsv,
	generateAcceptanceWaybillHtml,
	generateTorg12Html,
} from "../acceptanceWaybillsEngine.js";

export function printInboundWaybill(wb: AcceptanceWaybillDocument): void {
	const html = generateAcceptanceWaybillHtml ? generateAcceptanceWaybillHtml(wb) : generateTorg12Html(wb);
	const printWin = window.open("", "_blank");
	if (printWin) {
		printWin.document.write(html);
		printWin.document.close();
		printWin.focus();
		setTimeout(() => printWin.print(), 300);
	}
}

export const printWaybill = printInboundWaybill;
export const printWaybillTorg12 = printInboundWaybill;

export function exportWaybillCsv(wb: AcceptanceWaybillDocument): void {
	const csvContent = exportWaybillToCsv(wb);
	const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.setAttribute(
		"download",
		`nakladnaya_${wb.waybillNumber.replace(/\//g, "_")}.csv`,
	);
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
	showToast("Накладная экспортирована в CSV", "info");
}

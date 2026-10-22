import { showToast } from "../../GlobalToast.js";
import {
	type AcceptanceWaybillDocument,
	exportWaybillToCsv,
	generateTorg12Html,
} from "../acceptanceWaybillsEngine.js";

export function printTorg12Document(waybill: AcceptanceWaybillDocument): void {
	const html = generateTorg12Html(waybill);
	const win = window.open("", "_blank");
	if (win) {
		win.document.open();
		win.document.write(html);
		win.document.close();
		win.focus();
		win.print();
	}
}

export function exportWaybillCsv(waybill: AcceptanceWaybillDocument): void {
	const csv = exportWaybillToCsv(waybill);
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `ТОРГ12_Накладная_${waybill.waybillNumber || "б_н"}.csv`;
	link.click();
	URL.revokeObjectURL(url);
	showToast("Накладная успешно выгружена в формате CSV (Excel UTF-8)", "success");
}

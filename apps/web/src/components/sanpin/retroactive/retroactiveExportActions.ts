import { showToast } from "../../GlobalToast";
import {
	exportRetroactiveBatchToCsv,
	generateRetroactiveDossierPrintHtml,
	type RetroactiveDayRecord,
} from "../retroactiveSanpinEngine";

export function printRetroactiveDossierAction({
	generatedDays,
	periodLabelRu,
	nurseFullName,
}: {
	generatedDays: RetroactiveDayRecord[];
	periodLabelRu: string;
	nurseFullName: string;
}) {
	if (generatedDays.length === 0) {
		showToast("Сначала сформируйте журналы за период", "warning");
		return;
	}
	const printWin = window.open("", "_blank", "width=1100,height=800");
	if (!printWin) {
		showToast("Разрешите всплывающие окна для печати досье", "error");
		return;
	}
	const html = generateRetroactiveDossierPrintHtml(generatedDays, {
		clinicName: "ООО «Стоматологическая клиника ДЕНТЕ»",
		periodLabelRu,
		headNurseName: nurseFullName,
	});
	printWin.document.open();
	printWin.document.write(html);
	printWin.document.close();
	printWin.focus();
	setTimeout(() => printWin.print(), 400);
}

export function exportRetroactiveCsvAction({
	generatedDays,
	startDate,
	endDate,
}: {
	generatedDays: RetroactiveDayRecord[];
	startDate: string;
	endDate: string;
}) {
	if (generatedDays.length === 0) {
		showToast("Сначала сформируйте журналы за период", "warning");
		return;
	}
	const csv = exportRetroactiveBatchToCsv(generatedDays);
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.setAttribute("href", url);
	link.setAttribute("download", `SanPiN_Dossier_${startDate}_${endDate}.csv`);
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
	showToast("CSV реестр СанПиН успешно выгружен (RFC 4180 / UTF-8 BOM)", "success");
}

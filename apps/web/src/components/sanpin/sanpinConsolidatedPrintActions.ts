import {
	exportSanpinConsolidatedArchiveToCsv,
	generateSanpinConsolidatedInspectionHtml,
} from "@dental/shared";
import { showToast } from "../GlobalToast";
import {
	fetchLiveConsolidatedSanpinData,
	type FetchSanpinContext,
} from "./sanpinConsolidatedFetcher.js";

export async function printConsolidatedBinderAction(ctx: FetchSanpinContext): Promise<void> {
	try {
		showToast("Формирование сводного протокола стерилизации...", "info");
		const consolidatedData = await fetchLiveConsolidatedSanpinData(ctx);
		const html = generateSanpinConsolidatedInspectionHtml(consolidatedData);

		const printWindow = window.open("", "_blank");
		if (printWindow) {
			printWindow.document.write(html);
			printWindow.document.close();
			printWindow.focus();
			setTimeout(() => {
				printWindow.print();
			}, 250);
		} else {
			const iframe = document.createElement("iframe");
			iframe.style.position = "fixed";
			iframe.style.right = "0";
			iframe.style.bottom = "0";
			iframe.style.width = "0";
			iframe.style.height = "0";
			iframe.style.border = "none";
			document.body.appendChild(iframe);
			const doc = iframe.contentWindow?.document;
			if (doc) {
				doc.open();
				doc.write(html);
				doc.close();
				iframe.contentWindow?.focus();
				setTimeout(() => {
					iframe.contentWindow?.print();
					setTimeout(() => document.body.removeChild(iframe), 1000);
				}, 300);
			}
		}
	} catch (err) {
		console.error("Failed to print consolidated binder", err);
		showToast("Ошибка при формировании сводного сшива", "error");
	}
}

export async function exportConsolidatedCsvAction(ctx: FetchSanpinContext): Promise<void> {
	try {
		showToast("Формирование сводного архива журналов (CSV)...", "info");
		const consolidatedData = await fetchLiveConsolidatedSanpinData(ctx);
		const csv = exportSanpinConsolidatedArchiveToCsv(consolidatedData);

		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute("download", "SanPiN_Consolidated_Production_Control_Archive.csv");
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		showToast("Сводный архив журналов (CSV) успешно экспортирован", "success");
	} catch (err) {
		console.error("Failed to export consolidated CSV", err);
		showToast("Ошибка при экспорте сводного архива журналов", "error");
	}
}

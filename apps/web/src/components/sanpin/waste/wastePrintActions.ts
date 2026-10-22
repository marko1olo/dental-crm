import {
	generateWasteThermalStickerHtml,
	generateWasteTransferActHtml,
	type MedicalWasteJournalRecord,
	type MedicalWasteTransferAct,
} from "./medicalWasteEngine.js";

export function printWasteThermalSticker(record: MedicalWasteJournalRecord, disposalContractNo?: string): void {
	const html = generateWasteThermalStickerHtml(record, {
		clinicName: "ООО «Стоматологическая клиника ДЕНТЕ»",
		...(disposalContractNo !== undefined ? { disposalContractNo } : {}),
	});
	const win = window.open("", "_blank", "width=450,height=350");
	if (win) {
		win.document.write(html);
		win.document.close();
		win.focus();
	}
}

export function printWasteTransferAct(act: MedicalWasteTransferAct): void {
	const html = generateWasteTransferActHtml(act);
	const win = window.open("", "_blank");
	if (win) {
		win.document.write(html);
		win.document.close();
		win.focus();
		setTimeout(() => win.print(), 250);
	}
}

export async function exportWasteCsvBlob(records: readonly MedicalWasteJournalRecord[]): Promise<void> {
	const { exportWasteJournalToCsv } = await import("./medicalWasteEngine.js");
	const csv = exportWasteJournalToCsv(records);
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `Журнал_медицинских_отходов_${new Date().toISOString().slice(0, 10)}.csv`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

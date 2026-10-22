import type { MedicalWasteLog } from "@dental/shared";
import { generateWasteThermalStickerHtml, type MedicalWasteJournalRecord } from "./medicalWasteEngine";

export function printWasteStickerForLog(log: MedicalWasteLog) {
	const rec: MedicalWasteJournalRecord = {
		id: log.id,
		timestamp: log.logDate || new Date().toISOString().slice(0, 16),
		// biome-ignore lint/suspicious/noExplicitAny: mapping
		wasteClass: (log.wasteClass as any) || "class_B",
		departmentNameRu: "Стоматологическое отделение",
		// biome-ignore lint/suspicious/noExplicitAny: mapping
		packageType: (log.packageType as any) || "yellow_bag",
		packageCount: log.packageCount || 1,
		grossWeightKg: Math.round(((log.weightKg || 1) + 0.1) * 100) / 100,
		tareWeightKg: 0.1,
		netWeightKg: log.weightKg || 1,
		sealNumber: `ПЛ-Б-${new Date().getFullYear()}-001`,
		barcode: `WASTE-${log.wasteClass?.toUpperCase() || "CLASS_B"}-DENT-${log.id.slice(0, 6)}`,
		decontaminationMethod: "physical_autoclave_134",
		storageLocation: "cabinet_room_temp",
		operatorStaffFullName: log.responsibleStaffName || "Старшая медсестра",
		operatorStaffPosition: "Медсестра",
		status: log.operationType === "transfer_to_disposal_company" ? "transferred_for_disposal" : "accumulating",
	};
	const html = generateWasteThermalStickerHtml(rec, {
		clinicName: "ООО «Стоматологическая клиника ДЕНТЕ»",
		disposalContractNo: log.contractNumber || "ДОГ-МЕД-2026/04",
	});
	const printWin = window.open("", "_blank", "width=450,height=350");
	if (printWin) {
		printWin.document.write(html);
		printWin.document.close();
		printWin.focus();
	}
}

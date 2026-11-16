import type { MedicalWasteLog } from "@dental/shared";
import {
	generateWasteThermalStickerHtml,
	type MedicalWasteJournalRecord,
} from "./medicalWasteEngine";
import type {
	MedicalWasteClassId,
	MedicalWastePackagingTypeId,
} from "./medicalWastePresets";

function normalizeWasteClass(val: string | null | undefined): MedicalWasteClassId {
	if (val === "class_A" || val === "class_B" || val === "class_V" || val === "class_G") {
		return val;
	}
	return "class_B";
}

function normalizePackageType(val: string | null | undefined): MedicalWastePackagingTypeId {
	switch (val) {
		case "white_bag":
		case "white_bin":
		case "yellow_bag":
		case "yellow_puncture_proof_container":
		case "yellow_sharps_box_needle_remover":
		case "red_bag":
		case "red_puncture_proof_container":
		case "black_container_mercury":
		case "black_bag_g":
		case "marked_container_class_g":
			return val;
		default:
			return "yellow_bag";
	}
}

export function printWasteStickerForLog(log: MedicalWasteLog) {
	const rec: MedicalWasteJournalRecord = {
		id: log.id,
		timestamp: log.logDate || new Date().toISOString().slice(0, 16),
		wasteClass: normalizeWasteClass(log.wasteClass),
		departmentNameRu: "Стоматологическое отделение",
		packageType: normalizePackageType(log.packageType),
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

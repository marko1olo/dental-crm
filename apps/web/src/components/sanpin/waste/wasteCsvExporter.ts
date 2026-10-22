import {
	getDecontaminationMethod,
	getMedicalWasteClass,
	getMedicalWastePackaging,
	getWasteStorageLocation,
} from "./medicalWastePresets.js";
import type { MedicalWasteJournalRecord } from "./types";

export function exportWasteJournalToCsv(records: readonly MedicalWasteJournalRecord[]): string {
	const headers = [
		"№ п/п", "Дата и время накопления", "Класс отходов", "Подразделение",
		"Тип тары", "Кол-во упаковок", "Вес брутто, кг", "Вес тары, кг",
		"Вес нетто, кг", "Номер пломбы", "Штрихкод", "Метод обеззараживания",
		"Место накопления", "Ответственное лицо", "Статус", "№ Акта передачи",
	];

	const rows = records.map((r, index) => {
		const classDef = getMedicalWasteClass(r.wasteClass);
		const packDef = getMedicalWastePackaging(r.packageType);
		const decontamDef = getDecontaminationMethod(r.decontaminationMethod);
		const storageDef = getWasteStorageLocation(r.storageLocation);

		return [
			(index + 1).toString(),
			r.timestamp,
			`"${classDef.nameRu}"`,
			`"${r.departmentNameRu}"`,
			`"${packDef.nameRu}"`,
			r.packageCount.toString(),
			r.grossWeightKg.toFixed(2),
			r.tareWeightKg.toFixed(2),
			r.netWeightKg.toFixed(2),
			`"${r.sealNumber || ""}"`,
			`"${r.barcode}"`,
			`"${decontamDef.nameRu}${r.decontamDisinfectantName ? ` (${r.decontamDisinfectantName})` : ""}"`,
			`"${storageDef.nameRu}"`,
			`"${r.operatorStaffFullName}, ${r.operatorStaffPosition}"`,
			r.status === "accumulating" ? "Накопление" : "Передано на вывоз",
			`"${r.transferActNumber || ""}"`,
		];
	});

	const totalNet = records.reduce((acc, r) => acc + r.netWeightKg, 0);
	const totalPackages = records.reduce((acc, r) => acc + r.packageCount, 0);

	const totalRow = [
		"ИТОГО ПО ЖУРНАЛУ", "", "", "", "", totalPackages.toString(),
		"", "", totalNet.toFixed(2), "", "", "", "", "", "", "",
	];

	const csvContent = [headers.join(";"), ...rows.map((r) => r.join(";")), totalRow.join(";")].join("\r\n");
	return `\uFEFF${csvContent}`;
}

export function exportWasteCsvFile(records: readonly MedicalWasteJournalRecord[]) {
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

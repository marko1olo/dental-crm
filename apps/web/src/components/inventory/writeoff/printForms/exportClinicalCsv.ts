import { getDiscrepancyReason } from "../clinicalWriteoffPresets.js";
import type { ClinicalWriteoffDocument } from "../clinicalWriteoffEngine.js";
import { kopecksToRubles } from "../clinicalWriteoffEngine.js";

export function exportClinicalWriteoffToCsv(
	docs: readonly ClinicalWriteoffDocument[],
): string {
	const headers = [
		"№ акта", "Дата акта", "Пациент", "Врач", "Кабинет", "Код услуги",
		"Материал", "Артикул (SKU)", "Серия (LOT)", "Серийный номер (SN)",
		"Срок годности", "Ед. изм.", "По норме", "Фактически", "Отклонение",
		"Цена, руб.", "Сумма, руб.", "Причина отклонения", "Статус",
	];

	const rows: string[] = [];

	for (const doc of docs) {
		for (const line of doc.lines) {
			const reasonDef = getDiscrepancyReason(line.discrepancyReasonCode);
			const unitRub = kopecksToRubles(line.unitCostKopecks);
			const totalRub = kopecksToRubles(line.totalCostKopecks);

			rows.push(
				[
					`"${doc.actNumber}"`,
					doc.actDate,
					`"${doc.patientName}"`,
					`"${doc.doctorFullName}"`,
					`"${doc.cabinetNameRu}"`,
					`"${line.serviceCode}"`,
					`"${line.nameRu}"`,
					`"${line.sku}"`,
					`"${line.lotNumber || ""}"`,
					`"${line.serialNumber || ""}"`,
					`"${line.expirationDate || ""}"`,
					`"${line.unit}"`,
					line.standardQuantity.toString(),
					line.actualQuantity.toString(),
					line.discrepancyQuantity.toString(),
					unitRub.toFixed(2),
					totalRub.toFixed(2),
					`"${line.discrepancyNotes || reasonDef.labelRu}"`,
					`"${doc.status}"`,
				].join(";"),
			);
		}
	}

	const csvContent = [headers.join(";"), ...rows].join("\r\n");
	return `\uFEFF${csvContent}`;
}

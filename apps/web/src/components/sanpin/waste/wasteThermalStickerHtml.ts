import { getDecontaminationMethod, getMedicalWasteClass } from "./medicalWastePresets.js";
import type { MedicalWasteJournalRecord, WasteThermalStickerOptions } from "./types";

export function generateWasteThermalStickerHtml(
	record: MedicalWasteJournalRecord,
	options: WasteThermalStickerOptions = {},
): string {
	const classDef = getMedicalWasteClass(record.wasteClass);
	const decontamDef = getDecontaminationMethod(record.decontaminationMethod);
	const clinic = options.clinicName || "ООО «ДЕНТЕ КЛИНИК»";
	const contract = options.disposalContractNo || "ДОГ-МЕД-2026/04";

	const bagColorText =
		record.wasteClass === "class_B" ? "ЖЕЛТЫЙ ПАКЕТ / БАК"
		: record.wasteClass === "class_V" ? "КРАСНЫЙ ПАКЕТ / БАК"
		: record.wasteClass === "class_A" ? "БЕЛЫЙ ПАКЕТ"
		: "ЧЕРНЫЙ СПЕЦКОНТЕЙНЕР";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Этикетка 58x40 мм СанПиН ${record.barcode}</title>
	<style>
		@page { size: 58mm 40mm; margin: 0; }
		* { box-sizing: border-box; margin: 0; padding: 0; }
		body { width: 58mm; height: 40mm; font-family: 'Arial', sans-serif; font-size: 7pt; line-height: 1.15; color: #000; padding: 1.5mm 2mm; background: #fff; overflow: hidden; }
		.header { font-size: 6.5pt; font-weight: bold; text-align: center; border-bottom: 1px solid #000; padding-bottom: 1px; margin-bottom: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
		.class-badge { font-size: 8.5pt; font-weight: 900; text-align: center; border: 1.5px solid #000; padding: 1px 0; margin: 1px 0; text-transform: uppercase; letter-spacing: 0.5px; }
		.grid-info { display: flex; justify-content: space-between; margin: 1px 0; }
		.field-label { font-size: 6pt; color: #333; }
		.field-val { font-size: 7.5pt; font-weight: bold; }
		.barcode-box { text-align: center; margin-top: 1px; border-top: 0.5px dashed #000; padding-top: 1px; }
		.barcode-font { font-family: 'Courier New', monospace; font-size: 7.5pt; font-weight: bold; letter-spacing: 0.5px; }
		.barcode-bars { height: 4.5mm; letter-spacing: -1px; font-size: 11pt; font-family: 'Libre Barcode 128', 'Courier New', monospace; overflow: hidden; line-height: 1; }
		.footer { font-size: 5.5pt; display: flex; justify-content: space-between; margin-top: 1px; }
	</style>
</head>
<body onload="window.print()">
	<div class="header">${clinic} • СанПиН 2.1.3684-21</div>
	<div class="class-badge">ОТХОДЫ КЛАСС ${classDef.letterCode} (${bagColorText})</div>
	<div class="grid-info">
		<div>
			<div class="field-label">Подразделение:</div>
			<div class="field-val" style="max-width: 32mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${record.departmentNameRu}</div>
		</div>
		<div style="text-align: right;">
			<div class="field-label">Масса НЕТТО:</div>
			<div class="field-val" style="font-size: 8.5pt;">${record.netWeightKg.toFixed(2)} кг</div>
		</div>
	</div>
	<div class="grid-info">
		<div>
			<div class="field-label">Дата/время:</div>
			<div class="field-val">${record.timestamp.replace("T", " ")}</div>
		</div>
		<div style="text-align: right;">
			<div class="field-label">Пломба / Мест:</div>
			<div class="field-val">${record.sealNumber || "Б/П"} (${record.packageCount} шт)</div>
		</div>
	</div>
	<div style="font-size: 5.8pt; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
		<strong>Обезвреживание:</strong> ${decontamDef.nameRu.split("(")[0]}
	</div>
	<div class="barcode-box">
		<div class="barcode-bars">||||| | |||| || |||||| | ||||| ||||</div>
		<div class="barcode-font">${record.barcode}</div>
	</div>
	<div class="footer">
		<span>Отв: ${record.operatorStaffFullName}</span>
		<span>${contract}</span>
	</div>
</body>
</html>`;
}

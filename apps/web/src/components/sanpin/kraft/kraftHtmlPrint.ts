import { generateDataMatrixSvg } from "./kraftPackageBarcodes.js";
import {
	getChemicalIndicatorDefinition,
	getKraftMaterialDefinition,
	getKraftSizeDefinition,
} from "./kraftPackagePresets.js";
import type { KraftPackageRecord } from "./kraftPackageTypes.js";

export { generateA4BatchSheetHtml } from "./kraftA4SheetPrint.js";

export function generateThermalStickerHtml(
	record: KraftPackageRecord,
	options: {
		size?: "58x40" | "43x25";
		clinicName?: string;
		showIndicatorSwatch?: boolean;
	} = {},
): string {
	const size = options.size || "58x40";
	const clinicName = options.clinicName || "Стоматологическая клиника «DENTE»";
	const showIndicator = options.showIndicatorSwatch ?? true;

	const indicator = getChemicalIndicatorDefinition(record.indicatorId);
	const material = getKraftMaterialDefinition(record.packageType);
	const sizeDef = getKraftSizeDefinition(record.packageSize);
	const dmSvg = generateDataMatrixSvg(record.barcodeDataMatrixPayload, { size: size === "58x40" ? 70 : 50 });

	if (size === "43x25") {
		return `
<div class="kraft-sticker-43x25" style="width:43mm; height:25mm; padding:1.5mm; box-sizing:border-box; font-family:system-ui,-apple-system,sans-serif; background:#fff; color:#000; border:1px solid #000; overflow:hidden; position:relative;">
	<div style="font-size:7pt; font-weight:bold; line-height:1; display:flex; justify-content:space-between; border-bottom:0.5pt solid #000; padding-bottom:1mm;">
		<span>СТЕРИЛЬНО • СанПиН</span>
		<span>${record.autoclaveId} / #${record.cycleNumber}</span>
	</div>
	<div style="display:flex; gap:1.5mm; margin-top:1mm; align-items:center;">
		<div style="width:16mm; height:16mm; flex-shrink:0;">
			${dmSvg}
		</div>
		<div style="font-size:6.5pt; line-height:1.2; flex-grow:1;">
			<div style="font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:22mm;">${record.toolSetNameRu}</div>
			<div style="font-family:monospace; font-size:6pt; font-weight:bold;">${record.barcode128}</div>
			<div>Стерил: <strong>${record.packDate}</strong></div>
			<div>Годен: <strong style="text-decoration:underline;">${record.expDate}</strong></div>
		</div>
	</div>
</div>`;
	}

	return `
<div class="kraft-sticker-58x40" style="width:58mm; height:40mm; padding:2mm; box-sizing:border-box; font-family:system-ui,-apple-system,sans-serif; background:#fff; color:#000; border:1px solid #000; overflow:hidden; display:flex; flex-direction:column; justify-content:space-between;">
	<div style="border-bottom:1pt solid #000; padding-bottom:1mm; display:flex; justify-content:space-between; align-items:flex-start;">
		<div>
			<div style="font-size:7.5pt; font-weight:800; text-transform:uppercase; letter-spacing:0.3px;">СТЕРИЛЬНО • СанПиН 3.3686-21</div>
			<div style="font-size:6pt; color:#333;">${clinicName}</div>
		</div>
		<div style="text-align:right;">
			<div style="font-size:7.5pt; font-weight:800; background:#000; color:#fff; padding:0.5mm 1.5mm; border-radius:1mm;">${record.autoclaveId} / ЦИКЛ #${record.cycleNumber}</div>
			<div style="font-size:5.5pt; font-family:monospace; margin-top:0.5mm;">${record.batchId}</div>
		</div>
	</div>
	<div style="display:flex; gap:2mm; align-items:center; margin:1mm 0;">
		<div style="width:20mm; height:20mm; flex-shrink:0; display:flex; align-items:center; justify-content:center;">
			${dmSvg}
		</div>
		<div style="flex-grow:1; font-size:7pt; line-height:1.25;">
			<div style="font-weight:800; font-size:7.5pt; margin-bottom:0.5mm;">${record.toolSetNameRu}</div>
			<div style="font-size:6pt; color:#444;">Упак: ${material.nameRu.slice(0, 24)}... (${sizeDef.dimensionsMmRu})</div>
			<div style="font-size:6pt; font-family:monospace; font-weight:bold; margin:0.5mm 0;">Штрихкод: ${record.barcode128}</div>
			<div>Стерилизация: <strong>${record.packDate}</strong></div>
			<div>Годен до: <strong style="font-size:7.5pt; background:#f4f4f5; padding:0 1mm; border:0.5pt solid #000;">${record.expDate}</strong> (${record.daysLifespan} сут.)</div>
		</div>
	</div>
	<div style="border-top:0.5pt dashed #000; padding-top:1mm; display:flex; justify-content:space-between; align-items:center; font-size:6pt;">
		${showIndicator ? `<div style="display:flex; align-items:center; gap:1mm;">
			<span>Индикатор:</span>
			<span style="display:inline-block; width:4mm; height:4mm; background:${indicator.finalColorHex}; border:0.5pt solid #000; border-radius:0.5mm;" title="Эталонный конечный цвет индикатора"></span>
			<span style="font-weight:bold;">${indicator.indicatorClass === "class_5_integrator" ? "Интегратор 5" : "Класс 4"}</span>
		</div>` : `<div>ЦСО Оператор: ${record.operatorName}</div>`}
		<div style="font-size:5.5pt; text-align:right;">
			Опер: <strong>${record.operatorName.split(" ")[0]}</strong> • ЭЦП OK
		</div>
	</div>
</div>`;
}

export function printThermalStickers(
	records: KraftPackageRecord[],
	size: "58x40" | "43x25" = "58x40",
): void {
	if (typeof window === "undefined" || !records.length) return;
	const htmlList = records
		.map((r) => generateThermalStickerHtml(r, { size }))
		.join("<div style='page-break-after:always;'></div>");
	const printWindow = window.open("", "_blank");
	if (printWindow) {
		printWindow.document.write(
			`<!DOCTYPE html><html><head><title>Печать термоэтикеток</title><style>@page{margin:0;}body{margin:0;padding:0;}</style></head><body>${htmlList}</body></html>`,
		);
		printWindow.document.close();
		printWindow.focus();
		printWindow.print();
	}
}

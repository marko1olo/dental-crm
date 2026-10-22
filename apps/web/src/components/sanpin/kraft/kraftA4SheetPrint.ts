import { generateThermalStickerHtml } from "./kraftHtmlPrint.js";
import type { KraftPackageRecord } from "./kraftPackageTypes.js";

export function generateA4BatchSheetHtml(
	records: readonly KraftPackageRecord[],
	options: { clinicName?: string } = {},
): string {
	const clinicName = options.clinicName || "Стоматологическая клиника «DENTE»";
	const stickersHtml = records
		.map((rec) => `<div class="a4-sticker-item" style="page-break-inside:avoid;">${generateThermalStickerHtml(rec, { size: "58x40", clinicName })}</div>`)
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Лист печати этикеток стерилизации СанПиН</title>
	<style>
		@page { size: A4 portrait; margin: 10mm; }
		body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; background: #fff; color: #000; }
		.a4-header { border-bottom: 2px solid #000; padding-bottom: 4mm; margin-bottom: 6mm; display: flex; justify-content: space-between; align-items: center; }
		.a4-grid { display: grid; grid-template-columns: repeat(3, 58mm); gap: 6mm 8mm; justify-content: space-between; }
		@media print { .no-print { display: none !important; } }
	</style>
</head>
<body>
	<div class="a4-header">
		<div>
			<h2 style="margin:0; font-size:14pt;">РЕЕСТР ЭТИКЕТОК СТЕРИЛИЗАЦИИ КРАФТ-ПАКЕТОВ</h2>
			<div style="font-size:9pt; color:#444;">${clinicName} • СанПиН 3.3686-21 / ГОСТ Р ИСО 11607-1</div>
		</div>
		<div style="text-align:right; font-size:9pt;">
			<div>Всего этикеток: <strong>${records.length} шт.</strong></div>
			<div>Дата формирования: <strong>${new Date().toLocaleDateString("ru-RU")}</strong></div>
		</div>
	</div>
	<div class="a4-grid">${stickersHtml}</div>
</body>
</html>`;
}

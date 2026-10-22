import {
	DEFAULT_CLINIC_LEGAL_INFO,
	type ClinicLegalInfo,
} from "../clinicalWriteoffPresets.js";
import type { ClinicalWriteoffDocument } from "../clinicalWriteoffEngine.js";
import { kopecksToRubles } from "../clinicalWriteoffEngine.js";

export function generateFormM11Html(
	doc: ClinicalWriteoffDocument,
	clinicInfo: ClinicLegalInfo = DEFAULT_CLINIC_LEGAL_INFO,
): string {
	const info = doc.clinicInfo || clinicInfo;
	const totals = doc.totals;

	const rowsHtml = doc.lines.map((line, index) => {
		const unitRub = kopecksToRubles(line.unitCostKopecks);
		const totalRub = kopecksToRubles(line.totalCostKopecks);

		return `<tr>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${index + 1}</td>
			<td style="border: 1px solid #000; padding: 4px;">${line.nameRu}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${line.sku}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${line.unit}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${line.okeiCode}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: right;">${line.standardQuantity}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${line.actualQuantity}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: right;">${unitRub.toFixed(2)}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${totalRub.toFixed(2)}</td>
		</tr>`;
	}).join("\n");

	return `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>Требование-накладная М-11 № ${doc.actNumber}</title>
<style>
	@page { size: A4 portrait; margin: 10mm; }
	body { font-family: 'Times New Roman', serif; font-size: 9pt; color: #000; }
	.header { display: flex; justify-content: space-between; margin-bottom: 8px; }
	.title { text-align: center; font-weight: bold; font-size: 12pt; margin: 8px 0; }
	table { width: 100%; border-collapse: collapse; margin: 10px 0; }
	th { border: 1px solid #000; padding: 4px; background: #f0f0f0; font-size: 8pt; text-align: center; }
	.signs { display: flex; justify-content: space-between; margin-top: 20px; }
</style></head><body>
	<div class="header">
		<div><strong>Организация:</strong> ${info.clinicNameRu}<br><strong>Отправитель:</strong> Центральный материальный склад<br><strong>Получатель:</strong> ${doc.cabinetNameRu} (${doc.doctorFullName})</div>
		<div style="text-align: right; font-size: 8pt;">Форма М-11<br>ОКУД 0315003<br>ОКПО ${info.okpoCode}</div>
	</div>
	<div class="title">ТРЕБОВАНИЕ-НАКЛАДНАЯ № ${doc.actNumber}</div>
	<div style="text-align: center;">Дата: <strong>${doc.actDate} г.</strong></div>
	<table>
		<thead><tr><th>№</th><th>Наименование</th><th>Номенклатура</th><th>Ед.</th><th>ОКЕИ</th><th>Затребовано</th><th>Отпущено</th><th>Цена, руб.</th><th>Сумма, руб.</th></tr></thead>
		<tbody>${rowsHtml}
			<tr style="font-weight: bold; background: #f8f8f8;"><td colspan="6" style="border: 1px solid #000; text-align: right;">ИТОГО:</td><td style="border: 1px solid #000; text-align: right;">${totals.totalMaterialsQuantity}</td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000; text-align: right;">${totals.totalCostRubles.toFixed(2)}</td></tr>
		</tbody>
	</table>
	<div class="signs">
		<div><strong>Отпустил:</strong><br>${info.headNursePosition}<br>________________ / ${info.headNurseFullName} /</div>
		<div><strong>Получил:</strong><br>${doc.doctorSpecialty}<br>________________ / ${doc.doctorFullName} /</div>
	</div>
</body></html>`;
}

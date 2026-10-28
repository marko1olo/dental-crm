import {
	DEFAULT_CLINIC_LEGAL_INFO,
	type ClinicLegalInfo,
} from "../clinicalWriteoffPresets.js";
import type { ClinicalWriteoffDocument } from "../clinicalWriteoffEngine.js";
import { kopecksToRubles } from "../clinicalWriteoffEngine.js";

/**
 * generateMaterialWaybillHtml — Каноническая накладная перемещения и прихода материалов для частной стоматологии.
 * Мандаты 8e (Врачебная автономия), 8n (Соло-врач), 8x & 8ap (Никаких советских бланков М-11).
 * Строго <= 120 строк.
 */
export function generateMaterialWaybillHtml(
	doc: ClinicalWriteoffDocument,
	clinicInfo: ClinicLegalInfo = DEFAULT_CLINIC_LEGAL_INFO,
): string {
	const info = doc.clinicInfo || clinicInfo;
	const totals = doc.totals;

	const rowsHtml = doc.lines.map((line, index) => {
		const unitRub = kopecksToRubles(line.unitCostKopecks);
		const totalRub = kopecksToRubles(line.totalCostKopecks);

		return `<tr>
			<td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${index + 1}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px;"><strong>${line.nameRu}</strong></td>
			<td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-family: monospace;">${line.sku}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${line.unit}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px; text-align: right;">${line.standardQuantity}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px; text-align: right; font-weight: bold;">${line.actualQuantity}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px; text-align: right;">${unitRub.toFixed(2)}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px; text-align: right; font-weight: bold;">${totalRub.toFixed(2)}</td>
		</tr>`;
	}).join("\n");

	return `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>Накладная прихода и перемещения № ${doc.actNumber}</title>
<style>
	@page { size: A4 portrait; margin: 10mm; }
	body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 9pt; color: #0f172a; line-height: 1.35; padding: 12px; }
	.header { display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1.5px solid #0f766e; padding-bottom: 8px; }
	.title { text-align: center; font-weight: 700; font-size: 13pt; margin: 10px 0 4px 0; color: #0f172a; }
	.date { text-align: center; font-size: 10pt; color: #475569; margin-bottom: 10px; }
	table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 8.5pt; }
	th { border: 1px solid #94a3b8; padding: 6px; background: #f1f5f9; font-size: 8pt; text-align: center; font-weight: 600; color: #1e293b; }
	.signs { display: flex; justify-content: space-between; margin-top: 24px; padding-top: 12px; border-top: 1px dashed #cbd5e1; font-size: 9pt; }
</style></head><body>
	<div class="header">
		<div><strong>Организация:</strong> ${info.clinicNameRu}<br><strong>Отправитель:</strong> Центральный склад клиники<br><strong>Получатель:</strong> ${doc.cabinetNameRu} (${doc.doctorFullName})</div>
		<div style="text-align: right; font-size: 8.5pt; color: #475569;">Приходная накладная<br>ОКПО ${info.okpoCode}<br>Стоматологическая клиника DENTE</div>
	</div>
	<div class="title">НАКЛАДНАЯ ПРИХОДА И ПЕРЕМЕЩЕНИЯ МАТЕРИАЛОВ № ${doc.actNumber}</div>
	<div class="date">Дата: <strong>${doc.actDate} г.</strong></div>
	<table>
		<thead><tr><th>№</th><th>Наименование материала</th><th>Артикул</th><th>Ед.</th><th>Затребовано</th><th>Отпущено</th><th>Цена, ₽</th><th>Сумма, ₽</th></tr></thead>
		<tbody>${rowsHtml}
			<tr style="font-weight: bold; background: #f8fafc;"><td colspan="5" style="border: 1px solid #cbd5e1; text-align: right;">ИТОГО:</td><td style="border: 1px solid #cbd5e1; text-align: right;">${totals.totalMaterialsQuantity}</td><td style="border: 1px solid #cbd5e1;"></td><td style="border: 1px solid #cbd5e1; text-align: right; color: #0f766e;">${totals.totalCostRubles.toFixed(2)} ₽</td></tr>
		</tbody>
	</table>
	<div class="signs">
		<div><strong>Отпустил со склада:</strong><br>${info.headNursePosition || "Старшая медицинская сестра"}<br>________________ / ${info.headNurseFullName || "Ответственное лицо"} /</div>
		<div><strong>Принял в кабинет:</strong><br>${doc.doctorSpecialty || "Врач-стоматолог"}<br>________________ / ${doc.doctorFullName} /</div>
	</div>
</body></html>`;
}

/**
 * generateFormM11Html — Типовая межотраслевая форма № М-11 (ОКУД 0315003) «Требование-накладная».
 */
export function generateFormM11Html(
	doc: any,
	clinicInfo: ClinicLegalInfo = DEFAULT_CLINIC_LEGAL_INFO,
): string {
	const clinicName = doc.clinicName || doc.clinicInfo?.clinicNameRu || clinicInfo.clinicNameRu;
	const doctor = doc.doctorName || doc.doctorFullName || "Врач-стоматолог";
	const position = doc.doctorPosition || doc.doctorSpecialty || "Врач";
	const totals = doc.totals || {};
	const totalRub = totals.totalCostRubles != null
		? totals.totalCostRubles
		: (totals.totalCostKopecks ? totals.totalCostKopecks / 100 : 0);

	const rowsHtml = (doc.lines || []).map((line: any, index: number) => {
		const unitRub = line.unitCostKopecks ? (line.unitCostKopecks / 100) : (line.unitCostRub || 0);
		const lineTotalRub = line.totalCostKopecks ? (line.totalCostKopecks / 100) : (line.totalCostRub || 0);
		const name = line.nameRu || line.name || "Материал";

		return `<tr>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${index + 1}</td>
			<td style="border: 1px solid #000; padding: 4px;">${name}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${line.sku || "—"}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${line.okeiCode || "796"}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${line.unit || "шт."}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: right;">${line.standardQuantity ?? "—"}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${line.actualQuantity ?? line.quantity ?? 0}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: right;">${Number(unitRub).toFixed(2)}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${Number(lineTotalRub).toFixed(2)}</td>
		</tr>`;
	}).join("\n");

	return `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>Форма М-11 № ${doc.actNumber}</title>
<style>
	@page { size: A4 landscape; margin: 10mm; }
	body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 8pt; color: #000; line-height: 1.25; }
	.form-header { text-align: right; font-size: 7pt; margin-bottom: 8px; }
	.title { text-align: center; font-weight: bold; font-size: 11pt; margin: 8px 0; }
	table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 8pt; }
	th { border: 1px solid #000; padding: 4px; background: #f8fafc; font-weight: bold; text-align: center; font-size: 7.5pt; }
	td { border: 1px solid #000; padding: 4px; }
	.signs { display: flex; justify-content: space-between; margin-top: 20px; font-size: 8pt; }
</style></head><body>
	<div class="form-header">
		Типовая межотраслевая форма № <strong>М-11</strong><br>
		Утверждена постановлением Госкомстата России от 30.10.97 № 71а<br>
		Код по ОКУД <strong>0315003</strong>
	</div>
	<div style="margin-bottom: 8px;"><strong>Организация:</strong> ${clinicName}</div>
	<div class="title">ТРЕБОВАНИЕ-НАКЛАДНАЯ № ${doc.actNumber} от ${doc.actDate} г.</div>
	<table>
		<thead>
			<tr>
				<th rowspan="2">№ п/п</th>
				<th rowspan="2">Материал, наименование, сорт, размер, марка</th>
				<th rowspan="2">Номенклатурный номер (артикул)</th>
				<th colspan="2">Единица измерения</th>
				<th colspan="2">Количество</th>
				<th rowspan="2">Цена, руб. коп.</th>
				<th rowspan="2">Сумма без учета НДС, руб. коп.</th>
			</tr>
			<tr>
				<th>код</th>
				<th>наименование</th>
				<th>затребовано</th>
				<th>отпущено</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml}
			<tr style="font-weight: bold; background: #f8fafc;">
				<td colspan="6" style="text-align: right;">ИТОГО:</td>
				<td style="text-align: right;">${totals.totalMaterialsQuantity ?? ""}</td>
				<td></td>
				<td style="text-align: right;">${Number(totalRub).toFixed(2)}</td>
			</tr>
		</tbody>
	</table>
	<div class="signs">
		<div>Через кого: __________________ (${position})</div>
		<div>Затребовал: __________________ (${doctor})</div>
		<div>Отпустил: __________________</div>
		<div>Получил: __________________</div>
	</div>
</body></html>`;
}

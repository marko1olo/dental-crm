import {
	DEFAULT_CLINIC_LEGAL_INFO,
	type ClinicLegalInfo,
	getDiscrepancyReason,
} from "../clinicalWriteoffPresets.js";
import type { ClinicalWriteoffDocument } from "../clinicalWriteoffEngine.js";
import { kopecksToRubles } from "../clinicalWriteoffEngine.js";

/**
 * generateMaterialWriteoffActHtml — Канонический акт списания материалов для частной стоматологии.
 * Мандаты 8e (Врачебная автономия), 8n (Соло-врач), 8x & 8ap (Никаких советских приказов и ОКУД 0504230).
 * Строго <= 120 строк.
 */
export function generateMaterialWriteoffActHtml(
	doc: ClinicalWriteoffDocument,
	clinicInfo: ClinicLegalInfo = DEFAULT_CLINIC_LEGAL_INFO,
): string {
	const info = doc.clinicInfo || clinicInfo;
	const totals = doc.totals;

	const rowsHtml = doc.lines.map((line, index) => {
		const reasonDef = getDiscrepancyReason(line.discrepancyReasonCode);
		const unitRub = kopecksToRubles(line.unitCostKopecks);
		const totalRub = kopecksToRubles(line.totalCostKopecks);
		const diffStr = line.discrepancyQuantity > 0 ? `+${line.discrepancyQuantity}` : line.discrepancyQuantity < 0 ? `${line.discrepancyQuantity}` : "—";

		return `<tr>
			<td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${index + 1}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px;"><strong>${line.nameRu}</strong>${line.serialNumber ? `<br><small style="color: #64748b;">Серия/SN: ${line.serialNumber}</small>` : ""}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-family: monospace;">${line.sku}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${line.lotNumber || "—"}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${line.expirationDate || "—"}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${line.unit}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px; text-align: right;">${line.standardQuantity}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px; text-align: right; font-weight: bold;">${line.actualQuantity}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${diffStr}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px; text-align: right;">${unitRub.toFixed(2)}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px; text-align: right; font-weight: bold;">${totalRub.toFixed(2)}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px; font-size: 8.5pt;">${line.serviceCode ? `${line.serviceCode} (${doc.patientName})` : doc.patientName}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px; font-size: 8.5pt;">${line.discrepancyNotes || reasonDef.labelRu}</td>
		</tr>`;
	}).join("\n");

	return `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>Акт списания материалов № ${doc.actNumber}</title>
<style>
	@page { size: A4 landscape; margin: 10mm; }
	body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 9pt; color: #0f172a; line-height: 1.35; padding: 12px; }
	.header-flex { display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1.5px solid #0f766e; padding-bottom: 8px; }
	.act-title { text-align: center; font-weight: 700; font-size: 13pt; margin: 10px 0 4px 0; color: #0f172a; }
	.act-date { text-align: center; font-size: 10pt; color: #475569; margin-bottom: 10px; }
	table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 8.5pt; }
	th { border: 1px solid #94a3b8; padding: 6px; background: #f1f5f9; font-size: 8pt; text-align: center; font-weight: 600; color: #1e293b; }
	.signatures-row { display: flex; justify-content: space-between; margin-top: 24px; padding-top: 12px; border-top: 1px dashed #cbd5e1; font-size: 9pt; }
</style></head><body>
	<div class="header-flex">
		<div><strong>Организация:</strong> ${info.clinicNameRu}<br><strong>Подразделение:</strong> ${doc.cabinetNameRu}<br><strong>Врач:</strong> ${doc.doctorFullName} (${doc.doctorSpecialty})<br><strong>Пациент:</strong> ${doc.patientName}</div>
		<div style="text-align: right; font-size: 8.5pt; color: #475569;">ИНН ${info.inn} / КПП ${info.kpp}<br>ОКПО ${info.okpoCode}<br>Стоматологическая клиника DENTE</div>
	</div>
	<div class="act-title">АКТ СПИСАНИЯ МАТЕРИАЛОВ № ${doc.actNumber}</div>
	<div class="act-date">Дата: <strong>${doc.actDate} г.</strong></div>
	<table>
		<thead><tr><th>№</th><th>Наименование материала</th><th>Артикул</th><th>Партия</th><th>Срок годн.</th><th>Ед.</th><th>Норма</th><th>Факт</th><th>Откл.</th><th>Цена, ₽</th><th>Сумма, ₽</th><th>Процедура / Пациент</th><th>Обоснование</th></tr></thead>
		<tbody>${rowsHtml}
			<tr style="font-weight: bold; background: #f8fafc;"><td colspan="6" style="border: 1px solid #cbd5e1; text-align: right;">ИТОГО:</td><td style="border: 1px solid #cbd5e1;">—</td><td style="border: 1px solid #cbd5e1; text-align: right;">${totals.totalMaterialsQuantity}</td><td style="border: 1px solid #cbd5e1;">—</td><td style="border: 1px solid #cbd5e1;"></td><td style="border: 1px solid #cbd5e1; text-align: right; color: #0f766e;">${totals.totalCostRubles.toFixed(2)} ₽</td><td colspan="2" style="border: 1px solid #cbd5e1;"></td></tr>
		</tbody>
	</table>
	<p style="margin: 8px 0; font-size: 8.5pt; color: #334155;">Всего израсходовано ${doc.lines.length} наим. на сумму ${totals.totalCostRubles.toFixed(2)} ₽ (${totals.totalCostFormatted}).<br>${
		doc.isQuickCarpuleWriteoff
			? "Списание пустых использованных карпул и ампул анестетиков произведено старшей медсестрой / ассистентом в упрощенном порядке (без созыва комиссии)."
			: doc.isSingleSigner
				? "Списание произведено в упрощенном порядке лечащим врачом / ответственным сотрудником (без созыва комиссии по приказу клиники)."
				: "Списание произведено в соответствии с клиническими протоколами приёма и стандартами клиники."
	}</p>
	<div class="signatures-row">
		<div><strong>СПИСАНИЕ ПРОИЗВЕЛ (ЕДИНОЛИЧНО):</strong><br>${doc.writtenOffByRole || (doc.isQuickCarpuleWriteoff ? (info.headNursePosition || "Старшая медицинская сестра") : (doc.doctorSpecialty || "Врач-стоматолог"))}<br>________________ / ${doc.assistantFullName || doc.doctorFullName || info.headNurseFullName} /<br>«____» ________________ 2026 г.</div>
		<div><strong>МАТЕРИАЛЬНО ОТВЕТСТВЕННОЕ ЛИЦО:</strong><br>${doc.doctorSpecialty || "Заведующий кабинетом"}<br>________________ / ${doc.doctorFullName || info.chiefDoctorFullName} /</div>
	</div>
</body></html>`;
}

// Алиас для обратной совместимости вызовов
export const generateAct0504230Html = generateMaterialWriteoffActHtml;

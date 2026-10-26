import {
	DEFAULT_CLINIC_LEGAL_INFO,
	type ClinicLegalInfo,
	getDiscrepancyReason,
} from "../clinicalWriteoffPresets.js";
import type { ClinicalWriteoffDocument } from "../clinicalWriteoffEngine.js";
import { kopecksToRubles } from "../clinicalWriteoffEngine.js";

export function generateAct0504230Html(
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
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${index + 1}</td>
			<td style="border: 1px solid #000; padding: 4px;"><strong>${line.nameRu}</strong>${line.serialNumber ? `<br><small>SN: ${line.serialNumber}</small>` : ""}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${line.sku}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${line.lotNumber || "—"}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${line.expirationDate || "—"}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${line.unit} (${line.okeiCode})</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: right;">${line.standardQuantity}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${line.actualQuantity}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${diffStr}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: right;">${unitRub.toFixed(2)}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${totalRub.toFixed(2)}</td>
			<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">${line.serviceCode} (${doc.patientName})</td>
			<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">${line.discrepancyNotes || reasonDef.labelRu}</td>
		</tr>`;
	}).join("\n");

	return `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>Акт о списании № ${doc.actNumber}</title>
<style>
	@page { size: A4 landscape; margin: 10mm; }
	body { font-family: 'Times New Roman', serif; font-size: 9pt; color: #000; }
	.header-flex { display: flex; justify-content: space-between; margin-bottom: 8px; }
	.act-title { text-align: center; font-weight: bold; font-size: 13pt; margin: 10px 0; }
	table { width: 100%; border-collapse: collapse; margin: 10px 0; }
	th { border: 1px solid #000; padding: 4px; background: #f0f0f0; font-size: 8pt; text-align: center; }
	.signatures-row { display: flex; justify-content: space-between; margin-top: 25px; }
</style></head><body>
	<div class="header-flex">
		<div><strong>Учреждение:</strong> ${info.clinicNameRu}<br><strong>Подразделение:</strong> ${doc.cabinetNameRu}<br><strong>МОЛ:</strong> ${doc.doctorFullName} (${doc.doctorSpecialty})<br><strong>Пациент:</strong> ${doc.patientName}</div>
		<div style="text-align: right; font-size: 8pt;">ОКУД 0504230<br>ОКПО ${info.okpoCode}<br>ИНН ${info.inn} / КПП ${info.kpp}</div>
	</div>
	<div class="act-title">АКТ О СПИСАНИИ МАТЕРИАЛЬНЫХ ЗАПАСОВ № ${doc.actNumber}</div>
	<div style="text-align: center; margin-bottom: 8px;">Дата: <strong>${doc.actDate} г.</strong></div>
	<table>
		<thead><tr><th>№</th><th>Наименование</th><th>Номенкл. №</th><th>Партия</th><th>Срок</th><th>Ед.</th><th>Норма</th><th>Факт</th><th>Откл.</th><th>Цена, руб.</th><th>Сумма, руб.</th><th>Услуга / Пациент</th><th>Обоснование</th></tr></thead>
		<tbody>${rowsHtml}
			<tr style="font-weight: bold; background: #f8f8f8;"><td colspan="6" style="border: 1px solid #000; text-align: right;">ИТОГО:</td><td style="border: 1px solid #000;">—</td><td style="border: 1px solid #000; text-align: right;">${totals.totalMaterialsQuantity}</td><td style="border: 1px solid #000;">—</td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000; text-align: right;">${totals.totalCostRubles.toFixed(2)}</td><td colspan="2" style="border: 1px solid #000;"></td></tr>
		</tbody>
	</table>
	<p>Всего израсходовано ${doc.lines.length} наим. на сумму ${totals.totalCostRubles.toFixed(2)} руб. (${totals.totalCostFormatted}).<br>${
		doc.isQuickCarpuleWriteoff
			? "Списание пустых использованных карпул и ампул анестетиков произведено старшей медсестрой / ассистентом в упрощенном порядке (без созыва комиссии)."
			: doc.isSingleSigner
				? "Списание произведено в упрощенном порядке лечащим врачом / ответственным сотрудником (без созыва комиссии по приказу клиники)."
				: "Списание произведено в соответствии с клиническими протоколами Минздрава РФ и технологическими картами по каталогу процедур."
	}</p>
	<div class="signatures-row">
		<div><strong>СПИСАНИЕ ПРОИЗВЕЛ (ЕДИНОЛИЧНО):</strong><br>${doc.writtenOffByRole || (doc.isQuickCarpuleWriteoff ? (info.headNursePosition || "Старшая медицинская сестра") : (doc.doctorSpecialty || "Врач-стоматолог"))}<br>________________ / ${doc.assistantFullName || doc.doctorFullName || info.headNurseFullName} /<br>«____» ________________ 2026 г.</div>
		<div><strong>МАТЕРИАЛЬНО ОТВЕТСТВЕННОЕ ЛИЦО:</strong><br>${doc.doctorSpecialty || "Заведующий кабинетом"}<br>________________ / ${doc.doctorFullName || info.chiefDoctorFullName} /</div>
	</div>
</body></html>`;
}

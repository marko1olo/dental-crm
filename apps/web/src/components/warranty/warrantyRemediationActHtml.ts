/**
 * WARRANTY REMEDIATION ACT PRINTABLE HTML GENERATOR (A4 / 0 ₽)
 * Положение СтАР и Закон РФ № 2300-1 (ст. 29).
 * Mandate 8b: strict file length budget <= 120 lines.
 */

import { getWarrantyDefectTemplate } from "./warrantyPresets.js";
import type { WarrantyRemediationOrder } from "./warrantyRemediationTypes.js";
import { formatRussianDate } from "./warrantyDateUtils.js";
import { generateSha256 } from "./warrantyIdUtils.js";
import { WARRANTY_REMEDIATION_ACT_CSS } from "./warrantyRemediationActStyles.js";

export function generateWarrantyRemediationActHtml(order: WarrantyRemediationOrder): string {
	const clinicName = order.clinicName || "Стоматологическая клиника";
	const doctorName = order.doctorName || "________________________";
	const patientFullName = order.patientFullName || "________________________";

	const materialsList = order.materialsDeducted
		.map((mat, i) => `
      <tr>
        <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center;">${i + 1}</td>
        <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-weight: 600;">${mat.name}</td>
        <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center;">${mat.quantity} ${mat.unit}</td>
        <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; color: #0f766e; font-weight: 700;">Списано со склада</td>
      </tr>
    `).join("\n");

	const template = getWarrantyDefectTemplate(order.defectType);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Акт гарантийного устранения дефекта — ${order.orderNumber}</title>
  <style>${WARRANTY_REMEDIATION_ACT_CSS}</style>
</head>
<body>
  <div class="act-container">
    <div class="act-header">
      <div>
        <div class="act-title">Акт гарантийного устранения дефекта</div>
        <div class="act-meta">${clinicName} • Закон РФ № 2300-1 «О защите прав потребителей» (ст. 29)</div>
      </div>
      <div>
        <div class="act-badge">${order.orderNumber}</div>
        <div class="act-meta" style="text-align: right;">${formatRussianDate(order.performedAtIso.slice(0, 10))}</div>
      </div>
    </div>
    <div class="act-grid">
      <div>
        <div class="field"><div class="lbl">Пациент:</div><div class="val">${patientFullName} (карта № ${order.patientCardNumber || "—"})</div></div>
        <div class="field"><div class="lbl">Лечащий врач:</div><div class="val">${doctorName}</div></div>
      </div>
      <div>
        <div class="field"><div class="lbl">Гарантийный сертификат:</div><div class="val">№ ${order.certificateId}</div></div>
        <div class="field"><div class="lbl">Зуб / Локализация:</div><div class="val" style="color: #0f766e; font-size: 11pt;">Зуб № ${order.toothNumber}</div></div>
      </div>
    </div>
    <div class="section-title">1. Клинический характер дефекта:</div>
    <div class="box">
      <strong>${order.defectTitle}</strong> (${template.statutoryBasis})<br/>
      <span style="color: #475569;">${order.clinicalFinding}</span>
    </div>
    <div class="section-title">2. Выполненные гарантийные манипуляции:</div>
    <div class="box">
      <strong>${order.remediationAction}</strong>
      ${order.doctorNotes ? `<div style="margin-top: 6px; font-size: 9pt; color: #64748b;">Примечание врача: ${order.doctorNotes}</div>` : ""}
    </div>
    <div class="section-title">3. Списание стоматологических материалов со склада:</div>
    <table class="table">
      <thead><tr><th style="width: 6%; text-align: center;">#</th><th>Наименование материала / препарата</th><th style="width: 20%; text-align: center;">Количество</th><th style="width: 25%; text-align: center;">Статус списания</th></tr></thead>
      <tbody>${materialsList}</tbody>
    </table>
    <div class="zero-pay-box">
      <div>
        <div class="zero-pay-title">Стоимость устранения дефекта для пациента:</div>
        <div style="font-size: 8.5pt; color: #047857;">Гарантия клиники 100% • Безвозмездное устранение дефекта (ст. 29 Закона РФ № 2300-1)</div>
      </div>
      <div class="zero-pay-val">0 ₽</div>
    </div>
    <div class="signatures">
      <div><div style="font-size: 8.5pt; font-weight: 700; color: #64748b;">Лечащий врач-стоматолог:</div><div class="sign-line"></div><div style="font-size: 9pt; font-weight: 700;">${doctorName}</div></div>
      <div><div style="font-size: 8.5pt; font-weight: 700; color: #64748b;">Пациент (претензий к качеству не имею):</div><div class="sign-line"></div><div style="font-size: 9pt; font-weight: 700;">${patientFullName}</div></div>
    </div>
    <div style="margin-top: 16px; text-align: center; font-family: monospace; font-size: 6.5pt; color: #94a3b8;">
      ЭЦП / Контрольный криптографический хеш акта: ${order.integrityHash || generateSha256(order.orderNumber)}
    </div>
  </div>
</body>
</html>`;
}

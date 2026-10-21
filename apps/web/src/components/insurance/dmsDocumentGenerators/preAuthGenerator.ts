/**
 * preAuthGenerator.ts — Генерация запроса на предварительное согласование гарантийного письма ДМС
 */

import { DEFAULT_CLINIC_LEGAL_INFO, formatKopecks } from "../dmsInsuranceEngine.js";
import { getStatutoryInsurerById } from "../dmsInsurancePresets.js";
import type { DmsPreAuthDocument, DmsPreAuthRequestPayload } from "./types.js";

export function generateDmsPreAuthRequest(payload: DmsPreAuthRequestPayload): DmsPreAuthDocument {
	const clinic = payload.clinicInfo ?? DEFAULT_CLINIC_LEGAL_INFO;
	const insurer = getStatutoryInsurerById(payload.insurerId) ?? getStatutoryInsurerById("sogaz")!;
	const now = new Date();
	const requestDateStr = now.toISOString().slice(0, 10);
	const requestNumber = `ПРЕ-АВТ-${payload.insurerId.toUpperCase().slice(0, 4)}-${now.getFullYear()}-${(payload.patient.id || "REQ").slice(-4).toUpperCase()}-${payload.requestedServices.length}`;
	const slaDeadlineDate = new Date(now.getTime() + insurer.defaultSlaHours * 3600 * 1000);
	const slaDeadlineTimestamp = slaDeadlineDate.toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" });

	let totalRequestedKopecks = 0;
	const rows = payload.requestedServices.map((srv, idx) => {
		const itemTotal = srv.priceKopecks * srv.quantity;
		totalRequestedKopecks += itemTotal;
		return `<tr><td style="text-align:center;">${idx + 1}</td><td style="font-weight:600;">${srv.code804n}</td><td>${srv.name}</td><td style="text-align:center;">${srv.quantity}</td><td style="text-align:right;">${formatKopecks(srv.priceKopecks)}</td><td style="text-align:right;font-weight:600;">${formatKopecks(itemTotal)}</td></tr>`;
	}).join("");

	const xrays = payload.attachedXrayStudies.length > 0
		? payload.attachedXrayStudies.map((x) => `<li><strong>[${x.type.toUpperCase()}]</strong> ${x.title} от ${x.date}</li>`).join("")
		: "<em>Рентгенологические снимки не прикреплены (не требуются).</em>";

	const printableHtml = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">
<title>Запрос на согласование гарантийного письма ДМС № ${requestNumber}</title>
<style>
body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1e293b; line-height: 1.45; margin: 0; padding: 24px; }
.header-block { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px; }
.doc-title { font-size: 18px; font-weight: 800; text-align: center; margin: 16px 0 6px; text-transform: uppercase; }
.grid-box { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; }
table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
th, td { border: 1px solid #cbd5e1; padding: 8px 10px; }
th { background: #f1f5f9; font-weight: 700; text-align: left; }
.signatures { margin-top: 36px; display: flex; justify-content: space-between; }
.sig-box { width: 45%; border-top: 1px solid #0f172a; padding-top: 6px; text-align: center; font-size: 11px; }
</style></head><body>
<div class="header-block">
	<div style="font-size:16px;font-weight:700;">${clinic.legalName} (${clinic.brandName})</div>
	<div style="font-size:11px;color:#64748b;">ИНН: ${clinic.inn} | Лицензия: ${clinic.licenseNumber} от ${clinic.licenseDate} | Адрес: ${clinic.address}</div>
</div>
<div class="doc-title">Запрос на согласование гарантийного письма ДМС</div>
<div style="text-align:center;font-size:12px;color:#64748b;margin-bottom:20px;">Номер: <strong>${requestNumber}</strong> от ${requestDateStr}</div>
<div class="grid-box">
	<div><strong>Страховщик:</strong> ${insurer.fullName}<br>Куратор: ${insurer.curatorDepartment}<br><strong>SLA:</strong> ${insurer.defaultSlaHours} ч. (до ${slaDeadlineTimestamp})</div>
	<div><strong>Пациент:</strong> <strong>${payload.patient.fullName}</strong><br>Полис: <strong>${payload.patient.policyNumber}</strong><br>Тел: ${payload.patient.phone || "—"}</div>
</div>
<div style="font-weight:700;margin:14px 0 6px;">1. Клиническое обоснование и диагноз</div>
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;margin-bottom:14px;">
	<strong>МКБ-10:</strong> ${payload.diagnosisMkb10.code} — ${payload.diagnosisMkb10.title}<br>
	${payload.toothNumber ? `<strong>Зуб FDI:</strong> ${payload.toothNumber}<br>` : ""}
	<strong>Анамнез и показания:</strong> ${payload.clinicalJustification}
</div>
<div style="font-weight:700;margin:14px 0 6px;">2. Приложенные рентгенологические исследования</div>
<ul style="margin:6px 0 16px 20px;padding:0;">${xrays}</ul>
<div style="font-weight:700;margin:14px 0 6px;">3. Перечень запрашиваемых медицинских услуг</div>
<table>
	<thead><tr><th style="width:40px;">№</th><th style="width:110px;">Код услуги</th><th>Наименование</th><th style="width:60px;">Кол-во</th><th style="width:110px;">Тариф</th><th style="width:120px;">Сумма</th></tr></thead>
	<tbody>${rows}<tr style="background:#f8fafc;font-weight:700;"><td colspan="5" style="text-align:right;">ИТОГО:</td><td style="text-align:right;color:#0284c7;">${formatKopecks(totalRequestedKopecks)}</td></tr></tbody>
</table>
<div class="signatures">
	<div class="sig-box">Лечащий врач: ${payload.attendingDoctor.fullName}<br>Дата: ${payload.attendingDoctor.signatureDate} г. (Подпись / Печать)</div>
	<div class="sig-box">Куратор ${insurer.shortName}<br>[  ] Согласовано  [  ] Отказ  Дата: ______________</div>
</div>
</body></html>`;

	return {
		documentId: `doc-preauth-${Date.now()}`,
		requestNumber,
		requestDate: requestDateStr,
		slaDeadlineTimestamp,
		insurer,
		totalRequestedKopecks,
		payload,
		printableHtml,
	};
}

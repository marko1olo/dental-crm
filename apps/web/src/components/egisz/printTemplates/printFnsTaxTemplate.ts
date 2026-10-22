/**
 * printFnsTaxTemplate.ts — Printable HTML for FNS Tax Deduction Certificate (КНД 1151156)
 */

import {
	type FnsTaxCertificatePayload,
	escapeXml,
	formatKopecksToRubles,
	formatRuDate,
	generateGostSignatureStampHtml,
} from "./../cdaR2XmlBuilder";

export function generateFnsTaxCertificatePrintHtml(payload: FnsTaxCertificatePayload): string {
	const docDateStr = formatRuDate(payload.documentDate);
	const payments = payload.payments || [];
	const totalKopecks = payments.reduce((sum, p) => sum + Math.max(0, Math.round(p.amountKopecks || 0)), 0);
	const code1Kopecks = payments.filter((p) => p.serviceCode === "1").reduce((sum, p) => sum + Math.max(0, Math.round(p.amountKopecks || 0)), 0);
	const code2Kopecks = payments.filter((p) => p.serviceCode === "2").reduce((sum, p) => sum + Math.max(0, Math.round(p.amountKopecks || 0)), 0);

	const totalRublesStr = formatKopecksToRubles(totalKopecks);
	const code1RublesStr = formatKopecksToRubles(code1Kopecks);
	const code2RublesStr = formatKopecksToRubles(code2Kopecks);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Справка об оплате медицинских услуг (КНД 1151156) — № ${escapeXml(payload.documentNumber)}</title>
	<style>
		@page { size: A4 portrait; margin: 15mm; }
		body { font-family: 'Times New Roman', Times, serif; font-size: 13px; line-height: 1.35; color: #000; background: #fff; margin: 0; padding: 10px; }
		.form-code { text-align: right; font-size: 11px; font-weight: bold; margin-bottom: 8px; }
		.doc-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 14px; }
		.doc-title { font-size: 15px; font-weight: bold; text-transform: uppercase; }
		.doc-meta { font-size: 13px; font-weight: bold; margin-top: 6px; }
		.section-header { font-size: 13px; font-weight: bold; background: #f0f0f0; padding: 4px 8px; border-left: 4px solid #000; margin-top: 12px; margin-bottom: 6px; }
		.field-row { margin-bottom: 5px; }
		.field-label { font-weight: bold; }
		.table-payments { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
		.table-payments th, .table-payments td { border: 1px solid #666; padding: 5px 8px; text-align: left; }
		.table-payments th { background: #f8f8f8; }
		.table-payments td.num { text-align: right; font-family: monospace; font-size: 12px; }
		.total-box { margin-top: 10px; padding: 8px; border: 1px solid #000; font-size: 13px; font-weight: bold; display: flex; justify-content: space-between; }
		.signature-box { margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px dashed #666; padding-top: 12px; }
	</style>
</head>
<body>
	<div class="form-code">Форма по КНД 1151156<br/>Приказ ФНС России от 08.11.2023 № ЕД-7-11/755@</div>
	<div class="doc-header">
		<div class="doc-title">СПРАВКА ОБ ОПЛАТЕ МЕДИЦИНСКИХ УСЛУГ</div>
		<div style="font-size: 12px; margin-top: 4px;">для представления в налоговый орган Российской Федерации</div>
		<div class="doc-meta">№ ${escapeXml(payload.documentNumber)} от ${docDateStr} г.</div>
	</div>

	<div class="section-header">1. СВЕДЕНИЯ О МЕДИЦИНСКОЙ ОРГАНИЗАЦИИ / ИП</div>
	<div class="field-row"><span class="field-label">Наименование:</span> ${escapeXml(payload.clinic.name)}</div>
	<div class="field-row">
		<span class="field-label">ИНН:</span> ${escapeXml(payload.clinic.inn)} &nbsp;&nbsp;|&nbsp;&nbsp;
		${payload.clinic.kpp ? `<span class="field-label">КПП:</span> ${escapeXml(payload.clinic.kpp)} &nbsp;&nbsp;|&nbsp;&nbsp;` : ""}
		<span class="field-label">ОГРН:</span> ${escapeXml(payload.clinic.ogrn)}
	</div>

	<div class="section-header">2. СВЕДЕНИЯ О НАЛОГОПЛАТЕЛЬЩИКЕ (ФЛ)</div>
	<div class="field-row"><span class="field-label">ФИО налогоплательщика:</span> <strong>${escapeXml(payload.taxpayer.fullName)}</strong></div>
	<div class="field-row"><span class="field-label">ИНН:</span> ${escapeXml(payload.taxpayer.inn || "—")} &nbsp;&nbsp;|&nbsp;&nbsp; <span class="field-label">СНИЛС:</span> ${escapeXml(payload.taxpayer.snils || "—")} &nbsp;&nbsp;|&nbsp;&nbsp; <span class="field-label">Дата рождения:</span> ${formatRuDate(payload.taxpayer.birthDate) || "—"}</div>

	<div class="section-header">3. СВЕДЕНИЯ О ПАЦИЕНТЕ И СТЕПЕНИ РОДСТВА</div>
	<div class="field-row"><span class="field-label">ФИО пациента:</span> <strong>${escapeXml(payload.patient.fullName)}</strong></div>
	<div class="field-row"><span class="field-label">Степень родства:</span> Код ${escapeXml(payload.patient.relationshipCode)} (${escapeXml(payload.patient.relationshipName || (payload.patient.relationshipCode === "1" ? "Сам налогоплательщик" : "Родственник"))}) &nbsp;&nbsp;|&nbsp;&nbsp; <span class="field-label">СНИЛС пациента:</span> ${escapeXml(payload.patient.snils || "—")}</div>

	<div class="section-header">4. СВЕДЕНИЯ О ПРОИЗВЕДЕННЫХ ОПЛАТАХ ЗА ${payload.taxYear} ГОД</div>
	<table class="table-payments">
		<thead>
			<tr><th style="width: 30px;">№</th><th>Дата оплаты</th><th>Код услуги</th><th>Описание услуги</th><th style="width: 110px; text-align: right;">Сумма (руб.)</th></tr>
		</thead>
		<tbody>
			${payments.map((p, idx) => `<tr><td>${idx + 1}</td><td>${formatRuDate(p.date)}</td><td>${p.serviceCode === "1" ? "1 (Стандартная мед. услуга)" : "2 (Дорогостоящее лечение)"}</td><td>${escapeXml(p.serviceDescription || "Медицинские стоматологические услуги")}</td><td class="num">${formatKopecksToRubles(p.amountKopecks)}</td></tr>`).join("")}
		</tbody>
	</table>

	<div class="total-box">
		<div>
			<div>По коду 1 (Стандартные услуги): ${code1RublesStr} руб.</div>
			<div>По коду 2 (Дорогостоящее лечение): ${code2RublesStr} руб.</div>
		</div>
		<div style="font-size: 15px; align-self: center;">ИТОГО К ВЫЧЕТУ: ${totalRublesStr} руб.</div>
	</div>

	<div class="signature-box">
		<div>
			<div><strong>Руководитель МО / Уполномоченное лицо:</strong></div>
			<div style="margin-top: 4px;">${escapeXml(payload.signer.fullName)} (${escapeXml(payload.signer.position || "Руководитель")})</div>
			${payload.signer.snils ? `<div>СНИЛС: ${escapeXml(payload.signer.snils)}</div>` : ""}
		</div>
		${payload.doctorSignature ? generateGostSignatureStampHtml({
			signerName: payload.signer.fullName, certificateNumber: payload.doctorSignature.certificateSerialNumber,
			validFrom: payload.doctorSignature.validFrom || new Date().toISOString(), validTo: payload.doctorSignature.validTo || new Date().toISOString(), orgName: payload.clinic.name,
		}) : `
		<div style="text-align: right;">
			<div>Подпись: ___________________ / ${escapeXml(payload.signer.fullName)}</div>
			<div style="font-size: 10px; color: #555; margin-top: 4px;">М.П.</div>
		</div>`}
	</div>
</body>
</html>`;
}

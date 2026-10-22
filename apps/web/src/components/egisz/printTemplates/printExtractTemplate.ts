/**
 * printExtractTemplate.ts — Printable HTML for Medical Record Extracts & Sanitation Certificates
 */

import { escapeXml, formatRuDate } from "./../cdaR2XmlBuilder";

export interface MedicalRecordExtractPayload {
	readonly clinicName: string;
	readonly clinicAddress?: string;
	readonly clinicOgrn?: string;
	readonly clinicLicense?: string;
	readonly patientFullName: string;
	readonly patientBirthDate?: string;
	readonly patientCardNumber?: string;
	readonly extractType: "sanitation" | "sanatorium" | "clinical_extract";
	readonly doctorFullName: string;
	readonly doctorSpecialty?: string;
	readonly diagnosisText?: string;
	readonly conclusionText?: string;
	readonly recommendationsText?: string;
	readonly issueDate?: string;
}

export function generateMedicalRecordExtractPrintHtml(payload: MedicalRecordExtractPayload): string {
	const issueDateStr = formatRuDate(payload.issueDate || new Date());
	const birthDateStr = payload.patientBirthDate ? formatRuDate(payload.patientBirthDate) : "—";
	const titleMap = {
		sanitation: "СПРАВКА О САНАЦИИ ПОЛОСТИ РТА",
		sanatorium: "СТОМАТОЛОГИЧЕСКАЯ ВЫПИСКА ДЛЯ САНАТОРНО-КУРОРТНОЙ КАРТЫ (ФОРМА 072/У)",
		clinical_extract: "ВЫПИСКА ИЗ МЕДИЦИНСКОЙ КАРТЫ СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА (ФОРМА 043/У)",
	};
	const title = titleMap[payload.extractType] || titleMap.clinical_extract;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>${escapeXml(title)} — ${escapeXml(payload.patientFullName)}</title>
	<style>
		@page { size: A4 portrait; margin: 15mm; }
		body { font-family: 'Times New Roman', Times, serif; font-size: 13px; line-height: 1.4; color: #000; background: #fff; margin: 0; padding: 12px; }
		.doc-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 16px; }
		.clinic-title { font-size: 15px; font-weight: bold; text-transform: uppercase; }
		.clinic-meta { font-size: 11px; color: #333; margin-top: 2px; }
		.doc-title { font-size: 16px; font-weight: bold; margin-top: 12px; }
		.doc-num { font-size: 12px; color: #444; margin-top: 4px; }
		.field-row { margin-bottom: 8px; }
		.field-label { font-weight: bold; }
		.section-title { font-size: 13px; font-weight: bold; margin-top: 14px; margin-bottom: 6px; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
		.box-conclusion { border: 1px solid #000; padding: 10px; margin: 12px 0; background: #fafafa; font-size: 13px; }
		.signature-box { margin-top: 36px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px dashed #666; padding-top: 12px; }
	</style>
</head>
<body>
	<div class="doc-header">
		<div class="clinic-title">${escapeXml(payload.clinicName)}</div>
		<div class="clinic-meta">${escapeXml(payload.clinicAddress || "Лицензированная медицинская деятельность")} ${payload.clinicLicense ? `| Лицензия: ${escapeXml(payload.clinicLicense)}` : ""}</div>
		<div class="doc-title">${escapeXml(title)}</div>
		<div class="doc-num">Дата выдачи: ${issueDateStr} г.</div>
	</div>

	<div class="field-row"><span class="field-label">Пациент (ФИО):</span> <strong>${escapeXml(payload.patientFullName)}</strong></div>
	<div class="field-row"><span class="field-label">Дата рождения:</span> ${birthDateStr} &nbsp;&nbsp;|&nbsp;&nbsp; <span class="field-label">Номер карты:</span> ${escapeXml(payload.patientCardNumber || "б/н")}</div>

	<div class="section-title">ДИАГНОЗ И СОСТОЯНИЕ ЗУБОЧЕЛЮСТНОЙ СИСТЕМЫ</div>
	<div class="field-row">${escapeXml(payload.diagnosisText || "К02.1 Кариес дентина (пролечен). Дефектов зубных рядов, требующих неотложного лечения, не выявлено.")}</div>

	<div class="section-title">ЗАКЛЮЧЕНИЕ СПЕЦИАЛИСТА</div>
	<div class="box-conclusion"><strong>${escapeXml(payload.conclusionText || "Полость рта санирована. Очагов хронической одонтогенной инфекции не выявлено. Противопоказаний к санаторно-курортному лечению нет.")}</strong></div>

	<div class="section-title">РЕКОМЕНДАЦИИ</div>
	<div class="field-row">${escapeXml(payload.recommendationsText || "Плановый осмотр стоматолога 1 раз в 6 месяцев. Соблюдение гигиены полости рта.")}</div>

	<div class="signature-box">
		<div>
			<div><strong>Врач:</strong> ${escapeXml(payload.doctorFullName)}</div>
			<div>${escapeXml(payload.doctorSpecialty || "Врач-стоматолог")}</div>
		</div>
		<div style="text-align: right;">
			<div>Подпись: ___________________ / ${escapeXml(payload.doctorFullName)}</div>
			<div style="font-size: 10px; color: #555; margin-top: 4px;">М.П. Лечебного учреждения</div>
		</div>
	</div>
</body>
</html>`;
}

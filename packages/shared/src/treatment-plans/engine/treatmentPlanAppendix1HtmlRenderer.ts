/**
 * treatmentPlanAppendix1HtmlRenderer.ts — Генератор бланка Приложения №1 к Договору (Пост. № 736).
 */

import type { TreatmentPlanAppendix1DocumentData } from "./types.js";
import { escapeHtml } from "./treatmentPlanFormatters.js";
import { renderAppendix1StagesHtml } from "./treatmentPlanAppendix1StagesHtml.js";

export function renderTreatmentPlanContractAppendix1Html(
	data: TreatmentPlanAppendix1DocumentData,
): string {
	const stagesHtml = renderAppendix1StagesHtml(data.stages);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Приложение №1 к Договору — План лечения № ${escapeHtml(data.planNumber)}</title>
	<style>
		@page { size: A4; margin: 12mm 15mm 15mm 15mm; }
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; line-height: 1.35; font-size: 11px; margin: 0; padding: 0; }
		.document-header { text-align: right; font-size: 10px; color: #475569; margin-bottom: 12px; }
		.document-title { text-align: center; font-size: 14px; font-weight: 800; text-transform: uppercase; margin-bottom: 4px; }
		.document-subtitle { text-align: center; font-size: 11px; color: #334155; margin-bottom: 14px; }
		.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 4px; background-color: #f8fafc; }
		.summary-box { margin-top: 14px; padding: 10px; border: 1px solid #cbd5e1; background-color: #f8fafc; border-radius: 4px; page-break-inside: avoid; }
		.legal-notice { font-size: 9.5px; color: #475569; line-height: 1.3; margin-top: 12px; margin-bottom: 16px; text-align: justify; }
		.signatures-table { width: 100%; margin-top: 18px; border-collapse: collapse; page-break-inside: avoid; }
		.sign-line { border-bottom: 1px solid #475569; width: 85%; margin-top: 24px; }
	</style>
</head>
<body>
	<div class="document-header">Приложение № 1 к Договору № ${escapeHtml(data.contractNumber)}<br>в соответствии с Постановлением Правительства РФ от 11.05.2023 № 736</div>
	<div class="document-title">ПРЕДВАРИТЕЛЬНЫЙ ПЛАН ЛЕЧЕНИЯ И СМЕТА РАСХОДОВ</div>
	<div class="document-subtitle">к Договору на оказание платных медицинских услуг от ${escapeHtml(data.documentDateRu)}</div>
	<div class="meta-grid">
		<div>
			<div><strong>Исполнитель:</strong> ${escapeHtml(data.clinicFullName)}</div>
			<div><strong>ИНН / ОГРН:</strong> ${escapeHtml(data.clinicInn)} / ${escapeHtml(data.clinicOgrn)}</div>
			<div><strong>Адрес:</strong> ${escapeHtml(data.clinicAddress)}</div>
			<div>${escapeHtml(data.clinicLicense)}</div>
		</div>
		<div>
			<div><strong>Пациент:</strong> ${escapeHtml(data.patientFullName)} (${escapeHtml(data.patientBirthDate)})</div>
			<div><strong>Телефон:</strong> ${escapeHtml(data.patientPhone)}</div>
			<div><strong>Врач:</strong> ${escapeHtml(data.doctorFullName)} (${escapeHtml(data.doctorSpecialty)})</div>
			<div><strong>Диагноз:</strong> ${escapeHtml(data.clinicalDiagnosisRu)}</div>
			<div><strong>Выбранный вариант:</strong> ${escapeHtml(data.selectedTierNameRu)}</div>
		</div>
	</div>

	${stagesHtml}

	<div class="summary-box">
		<div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: bold;">
			<span>ИТОГО К ОПЛАТЕ ПО СМЕТЕ:</span>
			<span style="color: #0284c7;">${escapeHtml(data.totalCostRu)}</span>
		</div>
		<div style="font-size: 11px; color: #475569; margin-top: 4px;">Сумма прописью: <strong>${escapeHtml(data.totalCostInWordsRu)}</strong></div>
		<div style="font-size: 10px; color: #475569; margin-top: 6px; border-top: 1px dashed #cbd5e1; padding-top: 4px;">
			Работа: ${escapeHtml(data.totalLaborCostRu)} | Материалы: ${escapeHtml(data.totalMaterialsCostRu)} | Скидка: ${escapeHtml(data.totalDiscountRu)} | Гарантия: ${escapeHtml(data.warrantyPeriodRu)}
		</div>
	</div>

	<div class="legal-notice">
		1. Настоящий План лечения и смета являются предварительными и согласованы Сторонами.<br>
		2. В случае необходимости изменения плана лечения Исполнитель предупреждает Пациента и составляет Дополнительное соглашение (Постановление № 736).
	</div>

	<table class="signatures-table">
		<tr>
			<td style="width: 48%; vertical-align: top;">
				<strong>ИСПОЛНИТЕЛЬ:</strong><br>
				Врач: ${escapeHtml(data.doctorFullName)} (${escapeHtml(data.doctorSpecialty)})
				<div class="sign-line"></div>
				<div style="font-size: 9px; color: #64748b; text-align: center;">(подпись, личная печать врача)</div>
			</td>
			<td style="width: 4%;"></td>
			<td style="width: 48%; vertical-align: top;">
				<strong>ПАЦИЕНТ (ПОТРЕБИТЕЛЬ):</strong><br>
				ФИО: ${escapeHtml(data.patientFullName)}<br>
				С планом лечения и сметой ознакомлен и согласен.
				<div class="sign-line"></div>
				<div style="font-size: 9px; color: #64748b; text-align: center;">(личная подпись Пациента)</div>
			</td>
		</tr>
	</table>
</body>
</html>`;
}

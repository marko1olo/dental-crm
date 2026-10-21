/**
 * meeActGenerator.ts — Генерация Акта медико-экономической экспертизы (МЭЭ) реестра ДМС
 */

import { formatRubKopecks } from "../insuranceMath.js";
import type { MeeActParams } from "./types.js";

export function generateMeeActHtml(params: MeeActParams): string {
	const { records, summary, clinicInfo, insurerInfo, actNumber, actDate, expertDoctorName = "Врач-эксперт страховой компании" } = params;

	const meeRowsHtml = records
		.map((r, i) => {
			const isPartial = r.patientPaidRub > 0;
			const expertDecision = r.isExcluded ? "Отказ (исключение программы ДМС)" : isPartial ? "Одобрено с учетом франшизы" : "Одобрено 100%";
			const decisionBadgeColor = r.isExcluded ? "#b91c1c" : isPartial ? "#b45309" : "#15803d";
			return `
		<tr>
			<td style="text-align: center; border: 1px solid #000; padding: 4px;">${i + 1}</td>
			<td style="border: 1px solid #000; padding: 4px;">${r.visitDate}</td>
			<td style="border: 1px solid #000; padding: 4px; font-weight: 600;">${r.patientFullName}</td>
			<td style="border: 1px solid #000; padding: 4px; font-family: monospace;">${r.policyNumber}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.letterNumber || "—"}</td>
			<td style="border: 1px solid #000; padding: 4px; font-family: monospace;">${r.serviceCode804n}</td>
			<td style="border: 1px solid #000; padding: 4px;">${r.serviceName} ${r.toothNumber ? `(зуб ${r.toothNumber})` : ""}</td>
			<td style="border: 1px solid #000; padding: 4px; font-family: monospace; text-align: center;">${r.diagnosisCodeMkb10 || "K02.1"}</td>
			<td style="text-align: right; border: 1px solid #000; padding: 4px;">${formatRubKopecks(r.totalPriceRub)}</td>
			<td style="text-align: right; border: 1px solid #000; padding: 4px; font-weight: bold; color: #15803d;">${formatRubKopecks(r.dmsCoveredRub)}</td>
			<td style="text-align: right; border: 1px solid #000; padding: 4px; color: #b45309;">${formatRubKopecks(r.patientPaidRub)}</td>
			<td style="border: 1px solid #000; padding: 4px; font-size: 8.5pt; color: ${decisionBadgeColor};">${expertDecision}</td>
		</tr>`;
		})
		.join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Акт медико-экономической экспертизы (МЭЭ) № ${actNumber}</title>
	<style>
		@page { size: A4 landscape; margin: 12mm; }
		body { font-family: 'Times New Roman', serif; font-size: 10pt; line-height: 1.25; color: #000; margin: 0; padding: 8px; }
		h1 { font-size: 13pt; text-align: center; margin-bottom: 2px; text-transform: uppercase; }
		.subtitle { text-align: center; font-size: 10pt; margin-bottom: 12px; }
		table.mee-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 8.5pt; }
		table.mee-table th { border: 1px solid #000; background: #e8e8e8; padding: 4px; text-align: center; font-weight: bold; }
		.conclusion-box { margin: 12px 0; padding: 8px; border: 1px solid #333; background: #fdfdfd; font-size: 9.5pt; }
		.signatures { display: flex; justify-content: space-between; margin-top: 24px; page-break-inside: avoid; }
		.sign-box { width: 45%; border-top: 1px solid #000; padding-top: 6px; font-size: 9.5pt; }
		@media print { body { padding: 0; } .no-print { display: none; } }
	</style>
</head>
<body>
	<h1>АКТ МЕДИКО-ЭКОНОМИЧЕСКОЙ ЭКСПЕРТИЗЫ (МЭЭ) № ${actNumber}</h1>
	<div class="subtitle">к Реестру счетов за медицинские услуги по Договору ДМС № ${insurerInfo.contractNumber} от ${insurerInfo.contractDate} г.</div>
	<div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-weight: bold;">
		<div>Медицинская организация: ${clinicInfo.name} (ИНН: ${clinicInfo.inn})</div>
		<div>Страховщик: ${insurerInfo.name} | Дата: ${actDate} г.</div>
	</div>
	<table class="mee-table">
		<thead>
			<tr>
				<th>№</th><th>Дата</th><th>Пациент (Застрахованный)</th><th>Полис ДМС</th><th>Гар. письмо</th>
				<th>Код услуги</th><th>Наименование услуги</th><th>МКБ-10</th><th>Предъявлено (руб)</th>
				<th>Принято ДМС (руб)</th><th>Доплата/Франшиза</th><th>Экспертное решение МЭЭ</th>
			</tr>
		</thead>
		<tbody>
			${meeRowsHtml}
			<tr style="font-weight: bold; background: #f0f0f0;">
				<td colspan="8" style="border: 1px solid #000; padding: 5px; text-align: right;">ИТОГО ПО ЭКСПЕРТИЗЕ:</td>
				<td style="border: 1px solid #000; padding: 5px; text-align: right;">${formatRubKopecks(summary.totalAmountRub)}</td>
				<td style="border: 1px solid #000; padding: 5px; text-align: right; color: #15803d; font-size: 9.5pt;">${formatRubKopecks(summary.totalDmsCoveredRub)}</td>
				<td style="border: 1px solid #000; padding: 5px; text-align: right; color: #b45309;">${formatRubKopecks(summary.totalPatientPaidRub)}</td>
				<td style="border: 1px solid #000; padding: 5px; text-align: center;">Принято к оплате</td>
			</tr>
		</tbody>
	</table>
	<div class="conclusion-box">
		<strong>ЗАКЛЮЧЕНИЕ ВРАЧА-ЭКСПЕРТА ДМС:</strong><br>
		Медицинские услуги оказаны в соответствии с Программой ДМС, Лицензией на осуществление медицинской деятельности ${clinicInfo.name} и Клиническими рекомендациями Стоматологической Ассоциации России (СтАР). Дефектов качества медицинской помощи не выявлено. Сумма <strong>${formatRubKopecks(summary.totalDmsCoveredRub)}</strong> подлежит оплате страховой компанией без финансовых санкций. Доплата пациентов <strong>${formatRubKopecks(summary.totalPatientPaidRub)}</strong> подтверждена фискальными кассовыми чеками.
	</div>
	<div class="signatures">
		<div class="sign-box">
			<div><strong>Врач-эксперт страховой компании:</strong></div><div>${insurerInfo.name}</div>
			<div style="margin-top: 14px;">Эксперт: ________________ / ${expertDoctorName} /</div>
		</div>
		<div class="sign-box">
			<div><strong>Главный врач клиники:</strong></div><div>${clinicInfo.name}</div>
			<div style="margin-top: 14px;">Главный врач: ________________ / ${clinicInfo.chiefDoctor} /</div>
		</div>
	</div>
</body>
</html>`;
}

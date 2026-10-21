/**
 * acceptanceActGenerator.ts — Генерация HTML-шаблона двустороннего акта сдачи-приемки
 */

import { formatRubKopecks } from "../insuranceMath.js";
import type { BilateralAcceptanceActParams } from "./types.js";

export function generateBilateralAcceptanceActHtml(params: BilateralAcceptanceActParams): string {
	const { records, summary, clinicInfo, insurerInfo, actNumber, actDate } = params;

	const rowsHtml = records
		.map(
			(r, i) => `
		<tr>
			<td style="text-align: center; border: 1px solid #000; padding: 4px;">${i + 1}</td>
			<td style="border: 1px solid #000; padding: 4px;">${r.visitDate}</td>
			<td style="border: 1px solid #000; padding: 4px; font-weight: 600;">${r.patientFullName}</td>
			<td style="border: 1px solid #000; padding: 4px;">${r.policyNumber}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.letterNumber || "—"}</td>
			<td style="border: 1px solid #000; padding: 4px; font-family: monospace;">${r.serviceCode804n}</td>
			<td style="border: 1px solid #000; padding: 4px;">${r.serviceName} ${r.toothNumber ? `(зуб ${r.toothNumber})` : ""}</td>
			<td style="text-align: center; border: 1px solid #000; padding: 4px;">${r.quantity}</td>
			<td style="text-align: right; border: 1px solid #000; padding: 4px;">${formatRubKopecks(r.unitPriceRub)}</td>
			<td style="text-align: right; border: 1px solid #000; padding: 4px; font-weight: bold;">${formatRubKopecks(r.dmsCoveredRub)}</td>
			<td style="text-align: right; border: 1px solid #000; padding: 4px;">${formatRubKopecks(r.patientPaidRub)}</td>
		</tr>`,
		)
		.join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Акт сдачи-приемки оказанных медицинских услуг ДМС № ${actNumber}</title>
	<style>
		@page { size: A4 portrait; margin: 15mm; }
		body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.3; color: #000; margin: 0; padding: 10px; }
		h1 { font-size: 14pt; text-align: center; margin-bottom: 4px; text-transform: uppercase; }
		.subtitle { text-align: center; font-size: 11pt; margin-bottom: 16px; }
		.parties { margin-bottom: 14px; text-align: justify; }
		table.registry-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 9.5pt; }
		table.registry-table th { border: 1px solid #000; background: #f0f0f0; padding: 5px; text-align: center; font-weight: bold; }
		.totals-block { margin: 16px 0; font-size: 11pt; }
		.totals-block strong { font-size: 12pt; }
		.signatures { display: flex; justify-content: space-between; margin-top: 30px; page-break-inside: avoid; }
		.sign-box { width: 46%; border-top: 1px solid #000; padding-top: 8px; }
		.sign-title { font-weight: bold; margin-bottom: 6px; }
		.stamp-place { margin-top: 40px; font-size: 9pt; color: #555; }
		@media print { body { padding: 0; } .no-print { display: none; } }
	</style>
</head>
<body>
	<h1>АКТ СДАЧИ-ПРИЕМКИ № ${actNumber}</h1>
	<div class="subtitle">оказанных медицинских услуг по Договору ДМС № ${insurerInfo.contractNumber} от ${insurerInfo.contractDate} г.</div>
	<div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-weight: bold;">
		<div>г. Москва</div><div>${actDate} г.</div>
	</div>
	<div class="parties">
		<strong>Исполнитель:</strong> ${clinicInfo.name}, ИНН ${clinicInfo.inn}, ОГРН ${clinicInfo.ogrn || "—"}, адрес: ${clinicInfo.address}, в лице Главного врача ${clinicInfo.chiefDoctor}, с одной стороны, и<br>
		<strong>Заказчик (Страховщик):</strong> ${insurerInfo.name}, ИНН ${insurerInfo.inn || "—"}, в лице ${insurerInfo.representative}, с другой стороны, составили настоящий Акт:
	</div>
	<div style="margin-bottom: 8px;">
		1. В соответствии с Договором ДМС в период с <strong>${summary.periodStart || "начало месяца"}</strong> по <strong>${summary.periodEnd || "конец месяца"}</strong> оказаны медицинские услуги:
	</div>
	<table class="registry-table">
		<thead>
			<tr>
				<th>№</th><th>Дата</th><th>Застрахованный (Пациент)</th><th>Полис ДМС</th><th>№ Гар. письма</th>
				<th>Код услуги</th><th>Наименование услуги</th><th>Кол-во</th><th>Тариф (руб)</th><th>К оплате ДМС</th><th>Доплата пациента</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml}
			<tr style="font-weight: bold; background: #fafafa;">
				<td colspan="7" style="border: 1px solid #000; padding: 6px; text-align: right;">ИТОГО К ОПЛАТЕ СТРАХОВЩИКОМ:</td>
				<td style="border: 1px solid #000; padding: 6px; text-align: center;">${summary.totalServicesCount}</td>
				<td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatRubKopecks(summary.totalAmountRub)}</td>
				<td style="border: 1px solid #000; padding: 6px; text-align: right; color: #000; font-size: 10.5pt;">${formatRubKopecks(summary.totalDmsCoveredRub)}</td>
				<td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatRubKopecks(summary.totalPatientPaidRub)}</td>
			</tr>
		</tbody>
	</table>
	<div class="totals-block">
		2. Общая стоимость услуг: <strong>${formatRubKopecks(summary.totalAmountRub)}</strong>.<br>
		3. Сумма к перечислению Страховщиком: <strong>${formatRubKopecks(summary.totalDmsCoveredRub)}</strong> (Без НДС по пп. 2 п. 2 ст. 149 НК РФ).<br>
		4. Оплачено непосредственно пациентами: <strong>${formatRubKopecks(summary.totalPatientPaidRub)}</strong>.<br>
		5. Стороны взаимных претензий по качеству и объему не имеют.
	</div>
	<div class="signatures">
		<div class="sign-box">
			<div class="sign-title">ОТ ИСПОЛНИТЕЛЯ (Клиника):</div><div>${clinicInfo.name}</div>
			<div style="margin-top: 15px;">Главный врач: ________________ / ${clinicInfo.chiefDoctor} /</div><div class="stamp-place">М.П.</div>
		</div>
		<div class="sign-box">
			<div class="sign-title">ОТ ЗАКАЗЧИКА (Страховщик):</div><div>${insurerInfo.name}</div>
			<div style="margin-top: 15px;">Представитель: ________________ / ${insurerInfo.representative} /</div><div class="stamp-place">М.П.</div>
		</div>
	</div>
</body>
</html>`;
}

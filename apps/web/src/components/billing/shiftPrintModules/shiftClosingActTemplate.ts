/**
 * shiftClosingActTemplate.ts — Modern Cash Shift Closing & Inventory Act HTML Template.
 * Mandate 8b: <= 120 lines. Zero Soviet bureaucracy.
 */
import type { ShiftClosingActData } from "./types.js";

export function generateShiftClosingActHtml(act: ShiftClosingActData): string {
	const rec = act.reconciliation;
	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Отчет о закрытии смены № ${rec.shiftNumber}</title>
	<style>
		@page { size: A4 portrait; margin: 12mm; }
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 10pt; color: #0f172a; line-height: 1.3; margin: 0; }
		.header { border-bottom: 2px solid #0f766e; padding-bottom: 4px; margin-bottom: 8px; }
		.title { text-align: center; font-size: 13pt; font-weight: 700; text-transform: uppercase; margin: 10px 0; }
		table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 9.5pt; }
		th, td { border: 1px solid #cbd5e1; padding: 4px 6px; }
		th { background-color: #f1f5f9; text-align: center; font-weight: 600; }
		.sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; font-size: 9.5pt; }
	</style>
</head>
<body>
	<div class="header">
		<strong>${act.clinic.legalName}</strong> • ИНН: ${act.clinic.inn} • ККТ: ${act.clinic.kktRegNumber}
	</div>
	<div class="title">Акт закрытия кассовой смены и инвентаризации кассы</div>
	<div style="text-align: center; font-size: 9.5pt; margin-bottom: 10px;">
		№ <strong>${act.actNumber}</strong> • Смена № <strong>${rec.shiftNumber}</strong> • Дата: <strong>${act.dateRu}</strong>
	</div>

	<table>
		<tr><th colspan="2">1. ФИСКАЛЬНЫЕ ИТОГИ СМЕНЫ (КАССОВЫЕ ЧЕКИ)</th></tr>
		<tr>
			<td style="width: 60%;">Всего чеков прихода / возврата:</td>
			<td style="font-weight: 600; text-align: right;">${rec.receiptsCount} / ${rec.returnsCount}</td>
		</tr>
		<tr><td>Приход наличными (Тег 1031):</td><td style="text-align: right;">${rec.tenders.cashIncomeRub.toFixed(2)} ₽</td></tr>
		<tr><td>Приход по банковским картам (Тег 1081):</td><td style="text-align: right;">${rec.tenders.cardIncomeRub.toFixed(2)} ₽</td></tr>
		<tr><td>Приход через СБП QR (Тег 1081):</td><td style="text-align: right;">${rec.tenders.sbpIncomeRub.toFixed(2)} ₽</td></tr>
		<tr><td>Зачет авансов и депозитов (Тег 1215):</td><td style="text-align: right;">${rec.tenders.advanceOffsetIncomeRub.toFixed(2)} ₽</td></tr>
		<tr><td>Возвраты прихода (Тег 1054=2):</td><td style="text-align: right; color: #991b1b;">−${rec.tenders.totalReturnsRub.toFixed(2)} ₽</td></tr>
		<tr style="background: #f8fafc; font-weight: 700;">
			<td>ИТОГО ЧИСТАЯ ВЫРУЧКА СМЕНЫ:</td><td style="text-align: right;">${rec.tenders.netRevenueRub.toFixed(2)} ₽</td>
		</tr>

		<tr><th colspan="2">2. РЕЗУЛЬТАТЫ СВЕРКИ НАЛИЧНОСТИ В КАССОВОМ ЯЩИКЕ</th></tr>
		<tr><td>Разменный фонд на начало смены:</td><td style="text-align: right;">${rec.initialChangeFundRub.toFixed(2)} ₽</td></tr>
		<tr><td>Расчетный остаток в ящике:</td><td style="text-align: right;">${rec.calculatedCashInDrawerRub.toFixed(2)} ₽</td></tr>
		<tr><td>Фактическое наличие по пересчету:</td><td style="text-align: right; font-weight: 600;">${rec.countedCashInDrawerRub.toFixed(2)} ₽</td></tr>
		<tr>
			<td>Результат сверки кассы:</td>
			<td style="font-weight: 600; text-align: right;">
				${rec.status === "balanced" ? "СВЕРЕНО (0.00 ₽)" : `${rec.status === "surplus" ? "ИЗЛИШЕК" : "НЕДОСТАЧА"} (${rec.differenceRub.toFixed(2)} ₽)`}
			</td>
		</tr>
		${rec.isExplanationRequired ? `<tr><td>Причина расхождения:</td><td>${rec.discrepancyReasonLabel}${rec.cashierExplanation ? `<br><em>Объяснение: ${rec.cashierExplanation}</em>` : ""}</td></tr>` : ""}

		<tr><th colspan="2">3. ИНКАССАЦИЯ И ПЕРЕДАЧА ВЫРУЧКИ</th></tr>
		<tr><td>Сдано в инкассацию (сейф/банк):</td><td style="font-weight: 600; text-align: right;">${rec.encashmentAmountRub.toFixed(2)} ₽</td></tr>
		<tr><td>Оставлено в ящике на следующую смену:</td><td style="text-align: right;">${rec.retainedNextShiftChangeFundRub.toFixed(2)} ₽</td></tr>
	</table>

	<div class="sig-grid">
		<div><strong>Кассир-операционист:</strong> ________________ (${rec.cashierFullName})</div>
		<div><strong>Руководитель клиники:</strong> ________________ (${act.clinic.chiefExecutiveFullName})</div>
	</div>
</body>
</html>`;
}

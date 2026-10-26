/**
 * settlementReconciliationTemplate.ts — Modern Settlement Reconciliation Act & Cash Outflow Receipt.
 * Mandate 8b: <= 120 lines. Zero Soviet bureaucracy (KO-2 / Goskomstat removed).
 */
import type { SettlementReconciliationPrintData, Ko2CashOutflowVoucher } from "./types.js";

export function generateSettlementReconciliationHtml(data: SettlementReconciliationPrintData): string {
	const rows = (data.items || []).map((it) => `
		<tr>
			<td>${it.dateRu}</td>
			<td>${it.description}</td>
			<td style="text-align: right;">${it.accruedRub ? `${it.accruedRub.toFixed(2)} ₽` : "—"}</td>
			<td style="text-align: right;">${it.paidRub ? `${it.paidRub.toFixed(2)} ₽` : "—"}</td>
			<td style="text-align: right; font-weight: 600;">${it.balanceRub.toFixed(2)} ₽</td>
		</tr>
	`).join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Акт сверки взаиморасчетов № ${data.actNumber}</title>
	<style>
		@page { size: A4 portrait; margin: 12mm; }
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 10pt; color: #0f172a; line-height: 1.35; margin: 0; }
		.header { border-bottom: 2px solid #0f766e; padding-bottom: 6px; margin-bottom: 12px; }
		.title { text-align: center; font-size: 13pt; font-weight: 700; text-transform: uppercase; margin: 10px 0 4px 0; }
		.period { text-align: center; font-size: 9.5pt; color: #64748b; margin-bottom: 12px; }
		table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9pt; }
		th, td { border: 1px solid #cbd5e1; padding: 5px 8px; }
		th { background: #f8fafc; font-weight: 600; text-align: center; }
		.summary-box { margin-top: 14px; padding: 10px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; font-size: 9.5pt; }
		.sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 24px; font-size: 9.5pt; }
	</style>
</head>
<body>
	<div class="header">
		<strong>${data.clinic.legalName}</strong> • ИНН: ${data.clinic.inn} • ${data.clinic.address}
	</div>
	<div class="title">Акт сверки взаиморасчетов</div>
	<div class="period">№ <strong>${data.actNumber}</strong> от <strong>${data.dateRu}</strong> • Период: <strong>${data.periodLabel}</strong></div>
	<div style="margin-bottom: 8px;">Пациент / Плательщик: <strong>${data.patientFullName}</strong></div>

	<table>
		<thead>
			<tr><th>Дата</th><th>Операция / Услуга</th><th>Начислено</th><th>Оплачено</th><th>Сальдо</th></tr>
		</thead>
		<tbody>
			<tr><td colspan="4">Входящее сальдо на начало периода:</td><td style="text-align: right; font-weight: 600;">${data.openingBalanceRub.toFixed(2)} ₽</td></tr>
			${rows}
			<tr style="background: #f8fafc; font-weight: 700;">
				<td colspan="2">Итого за период:</td>
				<td style="text-align: right;">${data.totalAccruedRub.toFixed(2)} ₽</td>
				<td style="text-align: right;">${data.totalPaidRub.toFixed(2)} ₽</td>
				<td style="text-align: right;">${data.closingBalanceRub.toFixed(2)} ₽</td>
			</tr>
		</tbody>
	</table>

	<div class="summary-box">
		Конечное сальдо на ${data.dateRu}: <strong>${data.closingBalanceRub >= 0 ? `Аванс пациента: ${data.closingBalanceRub.toFixed(2)} ₽` : `Задолженность: ${Math.abs(data.closingBalanceRub).toFixed(2)} ₽`}</strong>
	</div>

	<div class="sig-grid">
		<div>От клиники: ________________ (${data.cashierFullName})</div>
		<div>Пациент / Представитель: ________________ (${data.patientFullName})</div>
	</div>
</body>
</html>`;
}

/**
 * Modern replacement for legacy KO-2 (РКО) without Soviet Goskomstat bureaucracy.
 */
export function generateKo2Html(v: Ko2CashOutflowVoucher): string {
	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Квитанция о выдаче денежных средств № ${v.docNumber}</title>
	<style>
		@page { size: A5 landscape; margin: 10mm; }
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 10pt; color: #0f172a; line-height: 1.4; }
		.card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; background: #fff; }
		.header { border-bottom: 2px solid #e11d48; padding-bottom: 8px; margin-bottom: 12px; }
		.title { font-size: 13pt; font-weight: 700; text-align: center; margin: 10px 0; }
		table { width: 100%; border-collapse: collapse; }
		td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; }
		.sig { margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 9.5pt; }
	</style>
</head>
<body>
	<div class="card">
		<div class="header">
			<strong style="text-transform: uppercase;">${v.clinic.legalName}</strong> • ИНН: ${v.clinic.inn}
		</div>
		<div class="title">Квитанция о выдаче наличных средств</div>
		<div style="text-align: center; font-size: 9.5pt; color: #64748b; margin-bottom: 10px;">
			№ <strong>${v.docNumber}</strong> от <strong>${v.dateRu}</strong>
		</div>
		<table>
			<tr><td style="width: 35%; color: #64748b;">Выдано (получатель):</td><td><strong>${v.issuedTo}</strong></td></tr>
			<tr><td style="color: #64748b;">Основание выдачи:</td><td>${v.basisRu}</td></tr>
			<tr><td style="color: #64748b;">Сумма:</td><td style="font-size: 12pt; font-weight: 800; color: #be123c;">${v.amountRub.toFixed(2)} ₽</td></tr>
			<tr><td style="color: #64748b;">Сумма прописью:</td><td style="font-weight: 600;">${v.amountWordsRu}</td></tr>
		</table>
		<div class="sig">
			<div>Выдал (кассир): _________ (${v.cashierFullName})</div>
			<div>Получил: _________ (${v.issuedTo})</div>
		</div>
	</div>
</body>
</html>`;
}

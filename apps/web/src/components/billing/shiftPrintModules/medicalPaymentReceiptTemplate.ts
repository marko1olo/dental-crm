/**
 * medicalPaymentReceiptTemplate.ts — Modern Medical Payment Receipt HTML Template.
 * Mandate 8b: <= 120 lines. Zero Soviet bureaucracy (KO-1 / Goskomstat removed).
 */
import type { PaymentReceiptPrintData, Ko1CashInflowVoucher } from "./types.js";

export function generatePaymentReceiptHtml(receipt: PaymentReceiptPrintData): string {
	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Квитанция об оплате медицинских услуг № ${receipt.docNumber}</title>
	<style>
		@page { size: A5 landscape; margin: 10mm; }
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 10pt; color: #0f172a; line-height: 1.4; margin: 0; }
		.receipt-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; background: #fff; }
		.header { border-bottom: 2px solid #0284c7; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; }
		.clinic-title { font-size: 12pt; font-weight: 700; color: #0f172a; text-transform: uppercase; }
		.doc-badge { background: #e0f2fe; color: #0369a1; padding: 4px 8px; border-radius: 6px; font-weight: 600; font-size: 9pt; }
		.title-row { text-align: center; margin: 12px 0; }
		.title { font-size: 13pt; font-weight: 700; color: #0f172a; }
		.meta-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
		.meta-table td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
		.label { color: #64748b; width: 35%; font-weight: 500; }
		.val { color: #0f172a; font-weight: 600; }
		.amount-highlight { font-size: 13pt; color: #0f766e; font-weight: 800; }
		.footer { margin-top: 18px; display: flex; justify-content: space-between; font-size: 9pt; color: #475569; border-top: 1px solid #e2e8f0; padding-top: 10px; }
	</style>
</head>
<body>
	<div class="receipt-card">
		<div class="header">
			<div>
				<div class="clinic-title">${receipt.clinic.legalName}</div>
				<div style="font-size: 8.5pt; color: #64748b;">ИНН: ${receipt.clinic.inn} • ${receipt.clinic.address}</div>
			</div>
			<div class="doc-badge">ОПЛАЧЕНО</div>
		</div>

		<div class="title-row">
			<div class="title">Квитанция об оплате медицинских услуг</div>
			<div style="font-size: 9.5pt; color: #64748b;">№ <strong>${receipt.docNumber}</strong> от <strong>${receipt.dateRu}</strong></div>
		</div>

		<table class="meta-table">
			<tr><td class="label">Пациент / Плательщик:</td><td class="val">${receipt.patientFullName}</td></tr>
			<tr><td class="label">Назначение платежа:</td><td class="val">${receipt.basisRu}</td></tr>
			<tr><td class="label">Способ оплаты:</td><td class="val">${receipt.paymentMethodTitle || "Безналичный расчет / Наличные"}</td></tr>
			<tr><td class="label">Сумма к оплате:</td><td class="val amount-highlight">${receipt.amountRub.toFixed(2)} ₽</td></tr>
			<tr><td class="label">Сумма прописью:</td><td class="val" style="font-style: italic;">${receipt.amountWordsRu}</td></tr>
		</table>

		<div class="footer">
			<div>Кассир / Администратор: <strong>${receipt.cashierFullName}</strong> _________</div>
			<div>CRM DENTE • Касса и чеки</div>
		</div>
	</div>
</body>
</html>`;
}

/**
 * Modern replacement for legacy KO-1 (ПКО) without Goskomstat bureaucracy.
 */
export function generateKo1Html(v: Ko1CashInflowVoucher): string {
	return generatePaymentReceiptHtml({
		docNumber: v.docNumber,
		dateRu: v.dateRu,
		clinic: v.clinic,
		patientFullName: v.receivedFrom,
		cashierFullName: v.cashierFullName,
		basisRu: v.basisRu,
		amountRub: v.amountRub,
		amountWordsRu: v.amountWordsRu,
		paymentMethodTitle: "Внесение наличных в кассу клиники",
	});
}

import { generateQrCodeSvg } from "@dental/shared";
import type { PatientPersonalCabinetData, PatientInvoiceItem } from "../patientCabinetEngine.js";
import { formatRussianDateIso, formatRubles } from "../engine/patientCabinetFormatters.js";
import { downloadHtmlFile } from "./documentsDownloadUtils.js";

export function generateDetailedReceiptHtml(
	invoice: PatientInvoiceItem,
	data: PatientPersonalCabinetData,
): string {
	const clinicName = "ООО «Стоматологическая клиника ДЕНТЕ»";
	const receiptNum = invoice.fiscalReceiptNumber || `ФД-${invoice.invoiceNumber}`;
	const formattedDate = formatRussianDateIso(invoice.paidAtIso?.slice(0, 10) || invoice.issueDateIso);
	const qrCodeSvg = generateQrCodeSvg(
		`https://receipt.nalog.ru/v1/check/${invoice.id}?t=${invoice.paidAtIso || invoice.issueDateIso}&s=${invoice.totalAmountRub}&fn=9960440301&i=98241&fp=319841209&n=1`,
		{ size: 140 },
	);

	const itemsHtml = invoice.items
		.map(
			(item, idx) => `
      <tr>
        <td style="padding: 6px 8px; border-bottom: 1px dashed #cbd5e1; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px 8px; border-bottom: 1px dashed #cbd5e1;">
          <div style="font-weight: 700; color: #0f172a;">${item.titleRu}</div>
          <div style="font-size: 11px; color: #64748b;">Код услуги: ${item.code}${item.toothFdi ? ` • Зуб №${item.toothFdi}` : ""}</div>
        </td>
        <td style="padding: 6px 8px; border-bottom: 1px dashed #cbd5e1; text-align: center;">${item.quantity}</td>
        <td style="padding: 6px 8px; border-bottom: 1px dashed #cbd5e1; text-align: right;">${formatRubles(item.priceRub)}</td>
        <td style="padding: 6px 8px; border-bottom: 1px dashed #cbd5e1; text-align: right; font-weight: 700;">${formatRubles(item.totalRub)}</td>
      </tr>`,
		)
		.join("");

	return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Кассовый чек № ${invoice.invoiceNumber}</title>
<style>
@page { size: A4 portrait; margin: 15mm; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; color: #0f172a; margin: 0; padding: 20px; line-height: 1.4; }
.receipt-container { max-width: 600px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 12px; padding: 24px; background: #ffffff; }
.header { text-align: center; border-bottom: 2px dashed #94a3b8; padding-bottom: 14px; margin-bottom: 14px; }
.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; font-size: 12px; background: #f8fafc; padding: 12px; border-radius: 8px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
th { background: #f1f5f9; padding: 8px; text-align: left; font-weight: 700; border-bottom: 1px solid #cbd5e1; }
.total-box { display: flex; justify-content: space-between; align-items: baseline; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
.footer { display: flex; justify-content: space-between; align-items: center; border-top: 2px dashed #94a3b8; padding-top: 14px; font-size: 11px; color: #64748b; }
@media print { body { padding: 0; } .receipt-container { border: none; padding: 0; } }
</style></head>
<body>
<div class="receipt-container">
  <div class="header">
    <h2 style="margin:0 0 4px 0; font-size:16px; font-weight:800; text-transform:uppercase;">${clinicName}</h2>
    <p style="margin:2px 0; font-size:12px; color:#64748b;">ИНН: 7841098765 • СНО: УСН (Доходы) • Лицензия: ЛО-78-01-011842</p>
    <div style="margin-top: 8px; font-size: 14px; font-weight: 800; color: #0d9488;">КАССОВЫЙ ЧЕК / ПРИХОД</div>
  </div>
  <div class="meta-grid">
    <div><span>Счет / Чек №: </span><strong>${receiptNum}</strong></div>
    <div><span>Дата расчета: </span><strong>${formattedDate}</strong></div>
    <div><span>Пациент: </span><strong>${data.fullName}</strong></div>
    <div><span>Медкарта №: </span><strong>${data.cardNumber}</strong></div>
    <div><span>Кассир / Врач: </span><strong>${data.curatingDoctor}</strong></div>
    <div><span>Способ оплаты: </span><strong>${invoice.paymentMethod === "sbp" ? "СБП (Безналичные)" : "Банковская карта"}</strong></div>
  </div>
  <table>
    <thead><tr><th style="width: 24px; text-align: center;">№</th><th>Наименование услуги</th><th style="width: 40px; text-align: center;">Кол</th><th style="width: 80px; text-align: right;">Цена</th><th style="width: 90px; text-align: right;">Сумма</th></tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <div class="total-box">
    <div style="font-size: 14px; font-weight: 800; color: #166534;">ИТОГО К ОПЛАТЕ:</div>
    <div style="font-size: 20px; font-weight: 900; color: #166534;">${formatRubles(invoice.totalAmountRub)}</div>
  </div>
  <div class="footer">
    <div>
      <div>ЗН ККТ: 05481900010924 • ФН: 9960440301984210</div>
      <div>ФД: ${receiptNum.replace(/\D/g, "") || "98241"} • ФПД: 3198412095</div>
      <div>Сайт ФНС: nalog.gov.ru</div>
    </div>
    <div style="text-align: center;"><div>${qrCodeSvg}</div><div style="font-size: 9px;">Проверка в ФНС</div></div>
  </div>
</div>
</body></html>`;
}

export function downloadDetailedReceipt(
	invoice: PatientInvoiceItem,
	data: PatientPersonalCabinetData,
): void {
	const html = generateDetailedReceiptHtml(invoice, data);
	downloadHtmlFile(html, `Chek_54FZ_${invoice.invoiceNumber}.html`);
}

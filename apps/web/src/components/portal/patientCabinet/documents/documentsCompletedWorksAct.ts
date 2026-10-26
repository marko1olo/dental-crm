import type { PatientPersonalCabinetData, PatientInvoiceItem } from "../patientCabinetEngine.js";
import { formatRussianDateIso, formatRubles } from "../engine/patientCabinetFormatters.js";
import { downloadHtmlFile } from "./documentsDownloadUtils.js";

export function generateCompletedWorksActHtml(
	invoice: PatientInvoiceItem,
	data: PatientPersonalCabinetData,
): string {
	const clinicName = "ООО «Стоматологическая клиника ДЕНТЕ»";
	const actNumber = `АКТ-${invoice.invoiceNumber.replace(/^[^\d]*/, "") || invoice.id.slice(-6).toUpperCase()}`;
	const actDate = formatRussianDateIso(invoice.paidAtIso?.slice(0, 10) || invoice.issueDateIso);
	const doctor = data.curatingDoctor || "Д-р Смирнов А. В.";
	const fiscalReceipt = invoice.fiscalReceiptNumber || `ФД-${invoice.invoiceNumber}`;

	const itemsHtml = invoice.items
		.map(
			(item, idx) => `
      <tr>
        <td style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: center;">${idx + 1}</td>
        <td style="padding: 5px 8px; border: 1px solid #cbd5e1; font-family: monospace; font-size: 11px;">${item.code}</td>
        <td style="padding: 5px 8px; border: 1px solid #cbd5e1;">
          <strong>${item.titleRu}</strong>
          ${item.toothFdi ? `<span style="color: #64748b; font-size: 11px;"> &bull; Зуб №${item.toothFdi}</span>` : ""}
        </td>
        <td style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: center;">${item.quantity}</td>
        <td style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: right;">${formatRubles(item.priceRub)}</td>
        <td style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: 700;">${formatRubles(item.totalRub)}</td>
      </tr>`,
		)
		.join("");

	return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Акт выполненных работ ${actNumber}</title>
<style>
@page { size: A4 portrait; margin: 15mm; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11.5px; color: #0f172a; margin: 0; padding: 20px; line-height: 1.4; }
.act-container { max-width: 750px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; padding: 24px; background: #ffffff; }
.header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px; }
th { background: #f8fafc; padding: 6px; text-align: left; font-weight: 700; border: 1px solid #cbd5e1; }
.total-box { display: flex; justify-content: space-between; align-items: baseline; background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; }
.signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 20px; padding-top: 14px; border-top: 1px dashed #cbd5e1; font-size: 11px; }
@media print { body { padding: 0; } .act-container { border: none; padding: 0; } }
</style></head>
<body>
<div class="act-container">
  <div class="header">
    <h1 style="margin:0 0 4px 0; font-size:15px; font-weight:800; text-transform:uppercase;">${clinicName}</h1>
    <p style="margin:2px 0; font-size:11px; color:#475569;">ИНН 7841098765 • Лицензия ЛО-78-01-011842 • г. Санкт-Петербург, Невский пр-т, д. 140</p>
    <h2 style="font-size:13px; margin:8px 0 0; color:#0d9488;">АКТ ВЫПОЛНЕННЫХ РАБОТ (ОКАЗАННЫХ УСЛУГ) № ${actNumber}</h2>
    <p style="font-weight:600; color:#0f172a;">от ${actDate} г.</p>
  </div>
  <div style="background:#f8fafc; border-left:3px solid #0d9488; padding:6px 10px; margin-bottom:12px; font-size:11px; color:#334155;">
    Настоящий Акт составлен в соответствии со ст. 720 ГК РФ, Федеральным законом 54-ФЗ и Постановлением Правительства РФ от 11.05.2023 № 736. Акт подтверждает факт надлежащего оказания стоматологических услуг, отсутствие претензий по качеству и сверку с фискальными чеками.
  </div>
  <table style="margin-bottom:12px;">
    <tr><td style="color:#64748b; width:30%;">Пациент (Заказчик):</td><td style="font-weight:600;">${data.fullName}</td></tr>
    <tr><td style="color:#64748b;">Номер медицинской карты:</td><td style="font-weight:600;">${data.cardNumber}</td></tr>
    <tr><td style="color:#64748b;">Лечащий врач:</td><td style="font-weight:600;">${doctor}</td></tr>
    <tr><td style="color:#64748b;">Счет на оплату / Чек:</td><td style="font-weight:600;">${invoice.invoiceNumber} • ${fiscalReceipt}</td></tr>
  </table>
  <table>
    <thead><tr><th style="width:28px; text-align:center;">№</th><th style="width:90px;">Код</th><th>Наименование услуги</th><th style="width:40px; text-align:center;">Кол</th><th style="width:85px; text-align:right;">Цена</th><th style="width:95px; text-align:right;">Стоимость</th></tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <div class="total-box">
    <div style="font-size:13px; font-weight:700; color:#166534;">ИТОГО ВЫПОЛНЕНО И ОПЛАЧЕНО:</div>
    <div style="font-size:16px; font-weight:800; color:#166534;">${formatRubles(invoice.totalAmountRub)}</div>
  </div>
  <div style="font-size:10.5px; color:#334155; border:1px solid #e2e8f0; border-radius:6px; padding:8px 10px; margin-bottom:16px; background:#fbfcfe;">
    Медицинские услуги оказаны надлежащим образом, в полном объеме и установленные сроки. Заказчик (Пациент) подтверждает приемку оказанных услуг и отсутствие претензий.
  </div>
  <div class="signatures">
    <div><strong>Исполнитель:</strong><div>Врач: ${doctor}</div><div style="margin-top:28px; border-bottom:1px solid #334155;"></div><div style="font-size:10px; color:#64748b; margin-top:4px;">М.П. ${clinicName}</div></div>
    <div><strong>Заказчик (Пациент):</strong><div>${data.fullName}</div><div style="margin-top:28px; border-bottom:1px solid #334155;"></div><div style="font-size:10px; color:#64748b; margin-top:4px;">Подпись пациента</div></div>
  </div>
</div>
</body></html>`;
}

export function downloadCompletedWorksAct(
	invoice: PatientInvoiceItem,
	data: PatientPersonalCabinetData,
): void {
	const html = generateCompletedWorksActHtml(invoice, data);
	downloadHtmlFile(html, `Akt_${invoice.invoiceNumber}.html`);
}

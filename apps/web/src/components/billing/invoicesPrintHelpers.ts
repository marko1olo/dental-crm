import { hardwarePrinter } from "../../services/hardware/HardwarePrinter.js";
import { showToast } from "../GlobalToast.js";
import type { BillingInvoice } from "./invoiceTypes.js";

/**
 * Fast Print Invoice
 */
export const handlePrintInvoice = (inv: BillingInvoice, clinicLegalName = "ООО «ДЕНТЕ»") => {
	const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Счет ${inv.number}</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0f172a; }
.header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
h1 { margin: 0 0 8px 0; font-size: 20px; font-weight: 800; }
.clinic { font-size: 13px; color: #475569; }
.patient { margin: 16px 0; font-size: 14px; }
table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
th, td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: left; }
th { background: #f8fafc; font-weight: 700; }
.total { text-align: right; font-size: 16px; font-weight: 800; margin-top: 20px; }
.footer { margin-top: 40px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<div class="header">
  <h1>СЧЕТ НА ОПЛАТУ № ${inv.number}</h1>
  <div class="clinic">${clinicLegalName} • Стоматологические услуги • Без НДС (пп. 2 п. 2 ст. 149 НК РФ)</div>
</div>
<div class="patient">
  <div><strong>Плательщик:</strong> ${inv.patientName}</div>
  <div><strong>Лечащий врач:</strong> ${inv.doctorName}</div>
  <div><strong>Дата:</strong> ${inv.date}</div>
</div>
<table>
  <thead>
    <tr><th>№</th><th>Код услуги</th><th>Наименование медицинской услуги</th><th>Кол-во</th><th>Сумма</th></tr>
  </thead>
  <tbody>
    ${inv.items
		.map(
			(it, idx) =>
				`<tr><td>${idx + 1}</td><td>${it.code || "A16.07.002"}</td><td>${it.name}</td><td>${it.quantity}</td><td>${it.priceRub.toLocaleString("ru-RU")} ₽</td></tr>`,
		)
		.join("")}
  </tbody>
</table>
<div class="total">Итого к оплате: ${inv.status === "warranty_100" ? "0 ₽ (Скидка 100% — Гарантия)" : `${inv.totalAmountRub.toLocaleString("ru-RU")} ₽`}</div>
<div class="footer">
  <div>Врач-стоматолог: ________________ / ${inv.doctorName} /</div>
  <div>М.П.</div>
</div>
</body>
</html>`;

	void hardwarePrinter
		.printHtmlWithPopupFallback(html, {
			title: `Счет № ${inv.number}`,
			downloadFilename: `Schet_${inv.number}.html`,
		})
		.then(() => {
			showToast(`Счет ${inv.number} отправлен на печать`, "success");
		})
		.catch(() => {
			showToast("Ошибка отправки счета на принтер", "error");
		});
};

/**
 * Fast Print Act 804n
 */
export const handlePrintAct = (inv: BillingInvoice, clinicLegalName = "ООО «ДЕНТЕ»") => {
	const actNumber = `АКТ-${inv.number.replace(/\D/g, "") || Date.now().toString().slice(-6)}`;
	const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Акт выполненных работ ${actNumber}</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0f172a; }
.header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
h1 { margin: 0 0 8px 0; font-size: 20px; font-weight: 800; }
.clinic { font-size: 13px; color: #475569; }
.patient { margin: 16px 0; font-size: 14px; }
table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
th, td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: left; }
th { background: #f8fafc; font-weight: 700; }
.total { text-align: right; font-size: 16px; font-weight: 800; margin-top: 20px; }
.footer { margin-top: 40px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<div class="header">
  <h1>АКТ СДАЧИ-ПРИЕМКИ ВЫПОЛНЕННЫХ РАБОТ № ${actNumber}</h1>
  <div class="clinic">${clinicLegalName} • Приказ Минздрава РФ № 804н • Закон РФ № 2300-1</div>
</div>
<div class="patient">
  <div><strong>Заказчик (Пациент):</strong> ${inv.patientName}</div>
  <div><strong>Исполнитель (Врач):</strong> ${inv.doctorName}</div>
  <div><strong>Дата выполнения:</strong> ${inv.date}</div>
</div>
<table>
  <thead>
    <tr><th>№</th><th>Код (804н)</th><th>Наименование стоматологической услуги</th><th>Кол-во</th><th>Сумма</th></tr>
  </thead>
  <tbody>
    ${inv.items
		.map(
			(it, idx) =>
				`<tr><td>${idx + 1}</td><td>${it.code || "A16.07.002"}</td><td>${it.name}</td><td>${it.quantity}</td><td>${it.priceRub.toLocaleString("ru-RU")} ₽</td></tr>`,
		)
		.join("")}
  </tbody>
</table>
<div class="total">Всего оказано услуг на сумму: ${inv.status === "warranty_100" ? "0 ₽ (Скидка 100% — Гарантия)" : `${inv.totalAmountRub.toLocaleString("ru-RU")} ₽`}</div>
<div class="footer">
  <div>Заказчик: ________________ / ${inv.patientName} /</div>
  <div>Исполнитель: ________________ / ${inv.doctorName} /</div>
</div>
</body>
</html>`;

	void hardwarePrinter
		.printHtmlWithPopupFallback(html, {
			title: `Акт № ${actNumber}`,
			downloadFilename: `Akt_${actNumber}.html`,
		})
		.then(() => {
			showToast(`Акт по счету ${inv.number} отправлен на печать`, "success");
		})
		.catch(() => {
			showToast("Ошибка отправки акта на принтер", "error");
		});
};

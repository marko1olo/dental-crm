/**
 * apps/web/src/components/visit/visitBillingPrint.ts
 *
 * Printable estimate generator for chairside visit services.
 */

import { hardwarePrinter } from "../../services/hardware/HardwarePrinter.js";
import { showToast } from "../GlobalToast.js";
import type { VisitBillingServiceItem, VisitBillingTotals } from "./visitBillingTypes.js";

export interface PrintVisitBillingEstimateParams {
	services: readonly VisitBillingServiceItem[];
	totals: VisitBillingTotals;
	clinicLegalName: string;
	patientName: string;
	doctorName: string;
}

export function printVisitBillingEstimate({
	services,
	totals,
	clinicLegalName,
	patientName,
	doctorName,
}: PrintVisitBillingEstimateParams): void {
	const printRows = services
		.map(
			(s, idx) => `<tr>
				<td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${idx + 1}</td>
				<td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${s.code804n}</td>
				<td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">
					${s.title}${s.toothCode ? ` (зуб ${s.toothCode})` : ""}
					${s.isWarranty ? '<span style="color: #15803d; font-weight: bold;"> [Гарантия 100%]</span>' : ""}
				</td>
				<td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${s.quantity}</td>
				<td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">${s.unitPriceRub.toLocaleString("ru-RU")} ₽</td>
				<td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">
					${s.isWarranty ? "0 ₽" : `${(s.unitPriceRub * s.quantity).toLocaleString("ru-RU")} ₽`}
				</td>
			</tr>`
		)
		.join("");

	const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Смета оказанных стоматологических услуг</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0f172a; }
.header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
h1 { margin: 0 0 8px 0; font-size: 20px; font-weight: 800; }
.clinic { font-size: 13px; color: #475569; }
.patient { margin: 16px 0; font-size: 14px; }
table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
th { background: #f8fafc; font-weight: 700; padding: 10px 12px; border-bottom: 2px solid #cbd5e1; text-align: left; }
.total-box { margin-top: 24px; text-align: right; font-size: 14px; }
.total-due { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 8px; }
</style>
</head>
<body>
<div class="header">
  <h1>СМЕТА ОКАЗАННЫХ СТОМАТОЛОГИЧЕСКИХ УСЛУГ</h1>
  <div class="clinic">${clinicLegalName} • Номенклатура Минздрава РФ № 804н</div>
</div>
<div class="patient">
  <div><strong>Пациент:</strong> ${patientName}</div>
  <div><strong>Лечащий врач:</strong> ${doctorName}</div>
  <div><strong>Дата:</strong> ${new Date().toLocaleDateString("ru-RU")}</div>
</div>
<table>
  <thead>
    <tr>
      <th>№</th>
      <th>Код 804н</th>
      <th>Наименование услуги</th>
      <th style="text-align: center;">Кол-во</th>
      <th style="text-align: right;">Цена</th>
      <th style="text-align: right;">Сумма</th>
    </tr>
  </thead>
  <tbody>
    ${printRows}
  </tbody>
</table>
<div class="total-box">
  <div>Сумма по прейскуранту: <strong>${totals.rawTotalRub.toLocaleString("ru-RU")} ₽</strong></div>
  ${totals.discountRub > 0 ? `<div style="color: #b45309;">Скидка врача: <strong>-${totals.discountRub.toLocaleString("ru-RU")} ₽ (${totals.effectiveDiscountPercent}%)</strong></div>` : ""}
  <div class="total-due">Итого к оплате: ${totals.isWarranty100 ? "0 ₽ (Скидка 100% — Гарантийный прием)" : `${totals.totalDueRub.toLocaleString("ru-RU")} ₽`}</div>
</div>
</body>
</html>`;

	void hardwarePrinter.printHtmlWithPopupFallback(html, {
		title: "Смета услуг визита",
		downloadFilename: `Smeta_${Date.now()}.html`,
	}).then(() => {
		showToast("Смета отправлена на печать", "success", 2000);
	}).catch(() => {
		showToast("Ошибка отправки сметы на печать", "error", 2500);
	});
}

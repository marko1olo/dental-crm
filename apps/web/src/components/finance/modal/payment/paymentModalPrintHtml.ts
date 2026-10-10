/**
 * apps/web/src/components/finance/modal/payment/paymentModalPrintHtml.ts
 *
 * HTML generators for Invoice and Act printing, plus discount & cash presets.
 */

export function generateInvoicePrintHtml(params: {
	invoiceNumber: string;
	clinicLegalName: string;
	patientName: string;
	effectiveCashier: string;
	rawTotalDueRub: number;
	discountRub: number;
	effectiveDiscountPercent: number;
	discountReason: string;
	totalDueRub: number;
	isWarranty100?: boolean | undefined;
	dateStr?: string | undefined;
	items?: readonly { name: string; code804n?: string; quantity: number; amountRub: number; toothNumber?: number | string; }[] | undefined;
	toothNumber?: number | string | undefined;
}): string {
	const discountInfoHtml =
		params.discountRub > 0
			? `<div class="discount-block" style="margin: 16px 0; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px;">
  <div>Сумма без скидки: <strong>${params.rawTotalDueRub.toLocaleString("ru-RU")} ₽</strong></div>
  <div style="color: #b45309; font-weight: 600; margin-top: 4px;">Скидка: ${params.discountRub.toLocaleString("ru-RU")} ₽ (${params.effectiveDiscountPercent}%${params.discountReason ? ` — ${params.discountReason}` : ""})</div>
</div>`
			: "";

	const tableRows = (params.items && params.items.length > 0)
		? params.items.map((it, idx) => `<tr><td>${idx + 1}</td><td>${it.name}${it.toothNumber || params.toothNumber ? ` (Зуб ${it.toothNumber || params.toothNumber})` : ""}</td><td>${it.quantity}</td><td>${it.amountRub.toLocaleString("ru-RU")} ₽</td></tr>`).join("")
		: `<tr><td>1</td><td>Стоматологическое лечение по наряду-заказу${params.toothNumber ? ` (Зуб ${params.toothNumber})` : ""}</td><td>1</td><td>${params.rawTotalDueRub.toLocaleString("ru-RU")} ₽</td></tr>`;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Счёт на оплату ${params.invoiceNumber}</title>
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
  <h1>СЧЁТ НА ОПЛАТУ № ${params.invoiceNumber}</h1>
  <div class="clinic">${params.clinicLegalName} • Стоматологические услуги • Без НДС (пп. 2 п. 2 ст. 149 НК РФ)</div>
</div>
<div class="patient">
  <div><strong>Плательщик:</strong> ${params.patientName}</div>
  <div><strong>Врач / Кассир:</strong> ${params.effectiveCashier}</div>
  <div><strong>Дата:</strong> ${params.dateStr || new Date().toLocaleDateString("ru-RU")}</div>
</div>
<table>
  <thead>
    <tr><th>№</th><th>Наименование медицинской услуги</th><th>Кол-во</th><th>Сумма</th></tr>
  </thead>
  <tbody>
    ${tableRows}
  </tbody>
</table>
${discountInfoHtml}
<div class="total">Итого к оплате: ${params.isWarranty100 ? "0 ₽ (Скидка 100% — Гарантия)" : `${params.totalDueRub.toLocaleString("ru-RU")} ₽`}</div>
<div class="footer">
  <div>Врач-стоматолог: ________________ / ${params.effectiveCashier} /</div>
  <div>М.П.</div>
</div>
</body>
</html>`;
}

export function generateActPrintHtml(params: {
	actNumber: string;
	clinicLegalName: string;
	patientName: string;
	effectiveCashier: string;
	rawTotalDueRub: number;
	discountRub: number;
	effectiveDiscountPercent: number;
	discountReason: string;
	totalDueRub: number;
	isWarranty100?: boolean | undefined;
	dateStr?: string | undefined;
	items?: readonly { name: string; code804n?: string; quantity: number; amountRub: number; toothNumber?: number | string; }[] | undefined;
	toothNumber?: number | string | undefined;
}): string {
	const discountInfoHtml =
		params.discountRub > 0
			? `<div class="discount-block" style="margin: 16px 0; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px;">
  <div>Сумма без скидки: <strong>${params.rawTotalDueRub.toLocaleString("ru-RU")} ₽</strong></div>
  <div style="color: #b45309; font-weight: 600; margin-top: 4px;">Скидка: ${params.discountRub.toLocaleString("ru-RU")} ₽ (${params.effectiveDiscountPercent}%${params.discountReason ? ` — ${params.discountReason}` : ""})</div>
</div>`
			: "";

	const tableRows = (params.items && params.items.length > 0)
		? params.items.map((it, idx) => `<tr><td>${idx + 1}</td><td>${it.code804n || "A16.07.002.001"}</td><td>${it.name}${it.toothNumber || params.toothNumber ? ` (Зуб ${it.toothNumber || params.toothNumber})` : ""}</td><td>${it.quantity}</td><td>${it.amountRub.toLocaleString("ru-RU")} ₽</td></tr>`).join("")
		: `<tr><td>1</td><td>A16.07.002.001</td><td>Стоматологический прием и лечение${params.toothNumber ? ` (Зуб ${params.toothNumber})` : ""}</td><td>1</td><td>${params.rawTotalDueRub.toLocaleString("ru-RU")} ₽</td></tr>`;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Акт выполненных работ ${params.actNumber}</title>
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
  <h1>АКТ СДАЧИ-ПРИЕМКИ ВЫПОЛНЕННЫХ СТОМАТОЛОГИЧЕСКИХ РАБОТ № ${params.actNumber}</h1>
  <div class="clinic">${params.clinicLegalName}</div>
</div>
<div class="patient">
  <div><strong>Пациент (Заказчик):</strong> ${params.patientName}</div>
  <div><strong>Лечащий врач (Исполнитель):</strong> ${params.effectiveCashier}</div>
  <div><strong>Дата:</strong> ${params.dateStr || new Date().toLocaleDateString("ru-RU")}</div>
</div>
<table>
  <thead>
    <tr><th>№</th><th>Код услуги</th><th>Наименование услуги</th><th>Кол-во</th><th>Сумма</th></tr>
  </thead>
  <tbody>
    ${tableRows}
  </tbody>
</table>
${discountInfoHtml}
<div class="total">Всего оказано услуг на сумму: ${params.rawTotalDueRub.toLocaleString("ru-RU")} ₽</div>
<div class="total" style="margin-top: 6px; font-size: 16px;">Итого к оплате: ${params.isWarranty100 ? "0 ₽ (Скидка 100% — Гарантия)" : `${params.totalDueRub.toLocaleString("ru-RU")} ₽`}</div>
<div class="footer">
  <div>Заказчик: ________________ / ${params.patientName} /</div>
  <div>Исполнитель: ________________ / ${params.effectiveCashier} /</div>
</div>
</body>
</html>`;
}

export const DISCOUNT_PRESETS = [
	{ percent: 0, label: "Без скидки 0%", title: "Без скидки 0%", testId: "preset-discount-0", reason: "" },
	{ percent: 5, label: "-5% Пенс/Утро", title: "Скидка 5% (Пенсионная / Утренняя)", testId: "preset-discount-5", reason: "Пенсионная / Утренняя" },
	{ percent: 10, label: "-10% Постоянный", title: "Скидка 10% (Постоянный пациент / Семейная скидка)", testId: "preset-discount-10", reason: "Постоянный пациент / Семейная скидка" },
	{ percent: 15, label: "-15% Комплекс", title: "Скидка 15% (Комплексный план лечения)", testId: "preset-discount-15", reason: "Комплексный план лечения" },
	{ percent: 20, label: "-20% Партнёр", title: "Скидка 20% (Сотрудники клиники / Партнёры)", testId: "preset-discount-20", reason: "Сотрудники клиники / Партнёры" },
	{ percent: 50, label: "-50% Персонал", title: "Скидка 50% (Персонал клиники / Близкие родственники)", testId: "preset-discount-50", reason: "Персонал клиники / Близкие родственники" },
] as const;

export const CASH_DENOMINATIONS = [
	{ amount: 1000, testId: "btn-cash-1000", label: "1 000 ₽" },
	{ amount: 2000, testId: "btn-cash-2000", label: "2 000 ₽" },
	{ amount: 5000, testId: "btn-cash-5000", label: "5 000 ₽" },
	{ amount: 10000, testId: "btn-cash-10000", label: "10 000 ₽" },
] as const;

export const CASH_ADD_BUTTONS = [
	{ amount: 1000, testId: "btn-cash-add-1000", label: "+1 000 ₽" },
	{ amount: 2000, testId: "btn-cash-add-2000", label: "+2 000 ₽" },
	{ amount: 5000, testId: "btn-cash-add-5000", label: "+5 000 ₽" },
] as const;

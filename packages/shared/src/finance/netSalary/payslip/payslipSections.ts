/**
 * payslipSections.ts — HTML section builders for doctor production payslip (Mandate 8b, <= 120 lines).
 */

import type { DoctorPayslipVisitItem, DoctorPayslipLabItem, CategoryAccrualBreakdown } from "../types.js";

export function formatMoney(rub: number): string {
	return rub.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₽";
}

export function renderVisitsSectionHtml(visits: readonly DoctorPayslipVisitItem[] = []): string {
	if (visits.length === 0) return "";
	const rows = visits.map((v, i) => `
		<tr>
			<td style="text-align: center;">${i + 1}</td>
			<td>${new Date(v.visitDate).toLocaleDateString("ru-RU")}</td>
			<td><strong>${v.patientName}</strong> (${v.medicalCardNumber})</td>
			<td>${v.toothCode ? `Зуб ${v.toothCode}: ` : ""}${v.serviceTitle}</td>
			<td style="font-family: monospace; text-align: center;">${v.order804nCode || "A16.07.002"}</td>
			<td style="font-family: monospace; text-align: right;">${formatMoney(v.priceRub)}</td>
			<td style="font-family: monospace; text-align: right; font-weight: bold; color: #047857;">${formatMoney(v.accruedRub)}</td>
		</tr>
	`).join("");

	return `
	<div class="section-title">3. Реестр выполненных процедур по пациентам (${visits.length} поз.)</div>
	<table>
		<thead>
			<tr>
				<th style="text-align: center; width: 24px;">№</th>
				<th style="width: 70px;">Дата</th>
				<th>Пациент (карта)</th>
				<th>Наименование услуги</th>
				<th style="text-align: center; width: 80px;">Код 804н</th>
				<th style="text-align: right; width: 80px;">Цена</th>
				<th style="text-align: right; width: 80px;">Начислено</th>
			</tr>
		</thead>
		<tbody>${rows}</tbody>
	</table>`;
}

export function renderLabOrdersSectionHtml(labOrders: readonly DoctorPayslipLabItem[] = []): string {
	if (labOrders.length === 0) return "";
	const rows = labOrders.map((l, i) => `
		<tr>
			<td style="text-align: center;">${i + 1}</td>
			<td style="font-family: monospace; font-weight: bold;">${l.orderNumber}</td>
			<td>${l.patientName}</td>
			<td>${l.toothFdi ? `Зуб ${l.toothFdi}: ` : ""}${l.restorationType}</td>
			<td style="font-family: monospace; text-align: right;">${formatMoney(l.priceRub)}</td>
			<td style="text-align: center;">${l.isWarranty ? '<span style="color: #2563eb; font-weight: bold;">Гарантия (0 ₽)</span>' : '<span style="color: #b91c1c;">Удержание</span>'}</td>
			<td style="font-family: monospace; text-align: right; font-weight: bold;">${formatMoney(l.withheldRub)}</td>
		</tr>
	`).join("");

	return `
	<div class="section-title">4. Реестр заказ-нарядов зуботехнической лаборатории (${labOrders.length} нарядов)</div>
	<table>
		<thead>
			<tr>
				<th style="text-align: center; width: 24px;">№</th>
				<th style="width: 80px;">Наряд ЗТЛ</th>
				<th>Пациент</th>
				<th>Ортопедическая конструкция</th>
				<th style="text-align: right; width: 80px;">Стоимость</th>
				<th style="text-align: center; width: 110px;">Статус гарантии</th>
				<th style="text-align: right; width: 80px;">Удержано</th>
			</tr>
		</thead>
		<tbody>${rows}</tbody>
	</table>`;
}

export function renderCategoryRowsHtml(categories: readonly CategoryAccrualBreakdown[] = []): string {
	return categories.map((cat) => `
		<tr>
			<td>${cat.categoryNameRu}</td>
			<td style="text-align: center; font-family: monospace;">${cat.appliedPercent}%</td>
			<td style="text-align: right; font-family: monospace;">${formatMoney(cat.grossRevenueRub)}</td>
			<td style="text-align: right; font-family: monospace;">${formatMoney(cat.netBaseRub)}</td>
			<td style="text-align: right; font-family: monospace; font-weight: bold;">${formatMoney(cat.accruedRub)}</td>
		</tr>
	`).join("");
}

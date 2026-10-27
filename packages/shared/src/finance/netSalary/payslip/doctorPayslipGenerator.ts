/**
 * doctorPayslipGenerator.ts — Clinical Doctor Production Payslip Generator (Mandate 8b, <= 120 lines).
 * Standard DENTE CRM: Clean Russian clinical domain language without Soviet Goskomstat codes (Mandate 8x).
 */

import type { DoctorPayslipPrintPayload } from "../types.js";
import { PAYSLIP_PRINT_STYLES } from "./payslipStyles.js";
import { formatMoney, renderVisitsSectionHtml, renderLabOrdersSectionHtml, renderCategoryRowsHtml } from "./payslipSections.js";

export function generateDoctorEarningsPayslipHtml(payload: DoctorPayslipPrintPayload): string {
	const fromDate = new Date(payload.periodFromIso).toLocaleDateString("ru-RU");
	const toDate = new Date(payload.periodToIso).toLocaleDateString("ru-RU");
	const categoryRowsHtml = renderCategoryRowsHtml(payload.categoryBreakdown);
	const visitsHtml = renderVisitsSectionHtml(payload.visits);
	const labHtml = renderLabOrdersSectionHtml(payload.labOrders);

	return `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8">
<title>Расчетный лист выработки врача — ${payload.doctorName}</title>
<style>${PAYSLIP_PRINT_STYLES}</style>
</head><body>
	<div class="payslip-header">
		<div>
			<div class="clinic-title">${payload.organizationName}</div>
			<div class="clinic-sub">${payload.organizationInn ? `ИНН: ${payload.organizationInn} • ` : ""}Стоматологическая клиника DENTE</div>
		</div>
		<div class="okud-badge">
			Расчетный лист выработки врача<br>
			Doctor Production Payroll Sheet<br>
			Стандарт DENTE CRM
		</div>
	</div>

	<div class="doc-title">Расчетный лист выработки врача за период с ${fromDate} по ${toDate}</div>

	<div class="meta-grid">
		<div class="meta-item"><span class="meta-label">Сотрудник / Врач:</span><span class="meta-value">${payload.doctorName}</span></div>
		<div class="meta-item"><span class="meta-label">Специальность:</span><span class="meta-value">${payload.specialtyTitle}</span></div>
		<div class="meta-item"><span class="meta-label">Табельный №:</span><span class="meta-value">${payload.personnelNumber || "ВР-001"}</span></div>
	</div>

	<div class="overhead-notice">
		<strong>Клинический стандарт DENTE:</strong> Общеклинические расходники на сумму <strong>${formatMoney(payload.overheadConsumablesCoveredRub || 0)}</strong> полностью оплачены клиникой и НЕ удерживаются из зарплаты врача (ст. 129 ТК РФ).
	</div>

	<div class="section-title">1. Начислено вознаграждение (по категориям и услугам)</div>
	<table>
		<thead><tr><th>Направление / Категория</th><th style="text-align: center;">Ставка %</th><th style="text-align: right;">Выручка Gross</th><th style="text-align: right;">Чистая база</th><th style="text-align: right;">Начислено</th></tr></thead>
		<tbody>
			${categoryRowsHtml || `<tr><td>Сдельная оплата труда (процент от выручки)</td><td style="text-align: center;">—</td><td style="text-align: right; font-family: monospace;">${formatMoney(payload.grossRevenueRub)}</td><td style="text-align: right; font-family: monospace;">${formatMoney(payload.netBaseRevenueRub)}</td><td style="text-align: right; font-family: monospace; font-weight: bold;">${formatMoney(payload.pieceworkAccruedRub)}</td></tr>`}
			${payload.fixedSalaryRub ? `<tr><td colspan="4">Гарантированный оклад за период</td><td style="text-align: right; font-family: monospace; font-weight: bold;">${formatMoney(payload.fixedSalaryRub)}</td></tr>` : ""}
			${payload.bonusesRub ? `<tr><td colspan="4">Стимулирующие надбавки и премии</td><td style="text-align: right; font-family: monospace; font-weight: bold;">${formatMoney(payload.bonusesRub)}</td></tr>` : ""}
			<tr style="background: #f8fafc; font-weight: bold;"><td colspan="4" style="text-transform: uppercase;">Всего начислено:</td><td style="text-align: right; font-family: monospace; font-size: 11px;">${formatMoney(payload.totalAccruedRub)}</td></tr>
		</tbody>
	</table>

	${(payload.withheldLabRub > 0 || payload.withheldMaterialRub > 0) ? `
	<div class="section-title">2. Прямые клинические затраты, уменьшившие расчетную базу (ст. 129 ТК РФ)</div>
	<table>
		<thead><tr><th>Вид затрат</th><th>Основание списания</th><th style="text-align: right;">Сумма, руб.</th></tr></thead>
		<tbody>
			${payload.withheldLabRub > 0 ? `<tr><td>Зуботехническая лаборатория (ЗТЛ)</td><td>Заказ-наряды сторонних лабораторий (за вычетом гарантийных)</td><td style="text-align: right; font-family: monospace;">${formatMoney(payload.withheldLabRub)}</td></tr>` : ""}
			${payload.withheldMaterialRub > 0 ? `<tr><td>Прямые расходные материалы</td><td>Имплантаты, мембраны, костные материалы (без салфеток и валиков)</td><td style="text-align: right; font-family: monospace;">${formatMoney(payload.withheldMaterialRub)}</td></tr>` : ""}
			<tr style="background: #f8fafc; font-weight: bold;"><td colspan="2" style="text-transform: uppercase;">Итого прямых клинических затрат:</td><td style="text-align: right; font-family: monospace; color: #475569;">${formatMoney(payload.withheldLabRub + payload.withheldMaterialRub)}</td></tr>
		</tbody>
	</table>` : ""}

	<div class="section-title">${(payload.withheldLabRub > 0 || payload.withheldMaterialRub > 0) ? "3" : "2"}. Удержания из заработной платы (ст. 137 ТК РФ, ст. 224 НК РФ)</div>
	<table>
		<thead><tr><th>Вид удержания</th><th>Основание</th><th style="text-align: right;">Сумма удержания</th></tr></thead>
		<tbody>
			<tr><td>НДФЛ (налог на доходы физлиц 13%)</td><td>Статья 224 НК РФ</td><td style="text-align: right; font-family: monospace;">${formatMoney(payload.ndflTaxRub)}</td></tr>
			<tr style="background: #f8fafc; font-weight: bold;"><td colspan="2" style="text-transform: uppercase;">Всего удержано:</td><td style="text-align: right; font-family: monospace; color: #b91c1c;">${formatMoney(payload.ndflTaxRub)}</td></tr>
		</tbody>
	</table>

	<div class="total-banner"><span class="lbl">ИТОГО К ВЫПЛАТЕ («НА РУКИ»):</span><span class="val">${formatMoney(payload.netPayoutRub)}</span></div>
	${visitsHtml}
	${labHtml}

	<div class="signatures">
		<div class="sig-block"><div class="sig-line"></div>Руководитель клиники / Главврач</div>
		<div class="sig-block"><div class="sig-line"></div>Главный бухгалтер</div>
		<div class="sig-block"><div class="sig-line"></div>С расчетом ознакомлен (Врач)</div>
	</div>
</body></html>`;
}

/** @deprecated Use generateDoctorEarningsPayslipHtml (Mandate 8x) */
export const generateDoctorT51Html = generateDoctorEarningsPayslipHtml;

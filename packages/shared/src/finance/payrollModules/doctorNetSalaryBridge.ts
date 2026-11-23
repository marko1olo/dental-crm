/**
 * packages/shared/src/finance/payrollModules/doctorNetSalaryBridge.ts
 * Canonical bridge for Doctor Net Revenue, Piecework calculation models & Payslip HTML.
 * Mandates 8b, 8bf: SSOT consolidation into payrollModules, zero orphaned logic.
 */

import type { Kopecks } from "../../money.js";
import {
	type DentalSpecialtyCategory,
	isGeneralClinicOverheadConsumable,
	classifyServiceCategory,
	extractDeductibleMaterialsFromWriteoff,
} from "./doctorServiceCostHelper.js";

export {
	type DentalSpecialtyCategory,
	isGeneralClinicOverheadConsumable,
	classifyServiceCategory,
	extractDeductibleMaterialsFromWriteoff,
};

export interface SpecialtyCategoryRates {
	readonly therapyPercent?: number;
	readonly orthopedicsPercent?: number;
	readonly surgeryPercent?: number;
	readonly orthodonticsPercent?: number;
	readonly hygienePercent?: number;
	readonly periodontologyPercent?: number;
	readonly otherPercent?: number;
}

export const DENTAL_SPECIALTY_NAMES_RU: Record<DentalSpecialtyCategory, string> = {
	therapy: "Терапевтическая стоматология (пломбы, эндодонтия)",
	orthopedics: "Ортопедическая стоматология (коронки, протезы, виниры)",
	surgery: "Хирургия и имплантология (удаления, импланты, пластика)",
	orthodontics: "Ортодонтия (брекеты, элайнеры, пластинки)",
	hygiene: "Профессиональная гигиена и отбеливание",
	periodontology: "Пародонтология и консервативное лечение",
	other: "Консультации, диагностика и прочие услуги",
};

export interface CategoryAccrualBreakdown {
	readonly category: DentalSpecialtyCategory;
	readonly categoryNameRu: string;
	readonly appliedPercent: number;
	readonly grossRevenueKop: Kopecks;
	readonly grossRevenueRub: number;
	readonly netBaseKop: Kopecks;
	readonly netBaseRub: number;
	readonly accruedKop: Kopecks;
	readonly accruedRub: number;
}

export interface DoctorPayslipVisitItem {
	readonly visitId: string;
	readonly visitDate: string;
	readonly patientName: string;
	readonly medicalCardNumber: string;
	readonly serviceTitle: string;
	readonly order804nCode?: string | null;
	readonly toothCode?: string | null;
	readonly priceRub: number;
	readonly accruedRub: number;
}

export interface DoctorPayslipLabItem {
	readonly orderNumber: string;
	readonly patientName: string;
	readonly restorationType: string;
	readonly toothFdi?: string | null;
	readonly priceRub: number;
	readonly withheldRub: number;
	readonly isWarranty: boolean;
}

export interface DoctorPayslipPrintPayload {
	readonly organizationName: string;
	readonly organizationInn?: string | undefined;
	readonly doctorName: string;
	readonly personnelNumber?: string | undefined;
	readonly specialtyTitle: string;
	readonly periodFromIso: string;
	readonly periodToIso: string;
	readonly grossRevenueRub: number;
	readonly netBaseRevenueRub: number;
	readonly pieceworkAccruedRub: number;
	readonly fixedSalaryRub?: number | undefined;
	readonly bonusesRub?: number | undefined;
	readonly totalAccruedRub: number;
	readonly ndflTaxRub: number;
	readonly withheldLabRub: number;
	readonly withheldMaterialRub: number;
	readonly overheadConsumablesCoveredRub?: number | undefined;
	readonly netPayoutRub: number;
	readonly categoryBreakdown?: readonly CategoryAccrualBreakdown[] | undefined;
	readonly visits?: readonly DoctorPayslipVisitItem[] | undefined;
	readonly labOrders?: readonly DoctorPayslipLabItem[] | undefined;
}

export type DoctorT51VisitItem = DoctorPayslipVisitItem;
export type DoctorT51LabItem = DoctorPayslipLabItem;
export type DoctorT51PrintPayload = DoctorPayslipPrintPayload;

function formatMoney(rub: number): string {
	return rub.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₽";
}

function renderVisitsSectionHtml(visits: readonly DoctorPayslipVisitItem[] = []): string {
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

function renderLabOrdersSectionHtml(labOrders: readonly DoctorPayslipLabItem[] = []): string {
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

function renderCategoryRowsHtml(categories: readonly CategoryAccrualBreakdown[] = []): string {
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

const PAYSLIP_PRINT_STYLES = `
@page { size: A4 portrait; margin: 12mm; }
body {
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
	font-size: 11px;
	line-height: 1.4;
	color: #1e293b;
	margin: 0;
	padding: 0;
	background: #ffffff;
}
.payslip-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	border-bottom: 2px solid #0f172a;
	padding-bottom: 8px;
	margin-bottom: 12px;
}
.clinic-title { font-size: 15px; font-weight: 800; text-transform: uppercase; color: #0f172a; }
.clinic-sub { font-size: 10px; color: #64748b; margin-top: 2px; }
.okud-badge {
	text-align: right;
	font-size: 9px;
	color: #475569;
	border: 1px solid #cbd5e1;
	padding: 4px 8px;
	border-radius: 4px;
	line-height: 1.3;
}
.doc-title {
	text-align: center;
	font-size: 14px;
	font-weight: 900;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	margin: 10px 0 14px;
}
.meta-grid {
	display: grid;
	grid-template-columns: 2fr 1fr 1fr;
	gap: 8px;
	background: #f8fafc;
	border: 1px solid #e2e8f0;
	border-radius: 6px;
	padding: 8px 12px;
	margin-bottom: 14px;
}
.meta-item { display: flex; flex-direction: column; }
.meta-label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748b; }
.meta-value { font-size: 12px; font-weight: 700; color: #0f172a; }
table {
	width: 100%;
	border-collapse: collapse;
	margin-bottom: 14px;
	font-size: 10.5px;
}
th {
	background: #f1f5f9;
	color: #334155;
	font-weight: 700;
	text-align: left;
	padding: 5px 6px;
	border: 1px solid #cbd5e1;
	font-size: 9.5px;
	text-transform: uppercase;
}
td {
	padding: 5px 6px;
	border: 1px solid #cbd5e1;
	vertical-align: middle;
}
.section-title {
	font-size: 11px;
	font-weight: 800;
	text-transform: uppercase;
	color: #0f172a;
	margin: 12px 0 6px;
}
.total-banner {
	display: flex;
	justify-content: space-between;
	align-items: center;
	background: #f0fdf4;
	border: 2px solid #86efac;
	border-radius: 6px;
	padding: 10px 14px;
	margin: 14px 0;
}
.total-banner .lbl { font-size: 12px; font-weight: 800; color: #166534; text-transform: uppercase; }
.total-banner .val { font-size: 18px; font-weight: 900; font-family: monospace; color: #14532d; }
.overhead-notice {
	background: #eff6ff;
	border: 1px dashed #93c5fd;
	border-radius: 6px;
	padding: 6px 10px;
	font-size: 10px;
	color: #1e40af;
	margin-bottom: 12px;
}
.signatures {
	display: grid;
	grid-template-columns: 1fr 1fr 1fr;
	gap: 16px;
	margin-top: 24px;
	padding-top: 14px;
	border-top: 1px solid #cbd5e1;
	font-size: 10px;
}
.sig-line { border-bottom: 1px solid #94a3b8; height: 24px; margin-bottom: 4px; }
`;

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

export const generateDoctorT51Html = generateDoctorEarningsPayslipHtml;

import { escapeXml } from "./escapeXml";
import type { DoctorPayrollResult, DoctorCompletedServiceItem } from "@dental/shared/payroll";
import { renderDoctorPayslipServicesTableHtml } from "./doctorPayslipHtmlServices";

export function generateDoctorPayslipHtml(
	payrollResult: DoctorPayrollResult,
	clinicName: string = "ООО «Денте Стоматология»",
	services?: readonly DoctorCompletedServiceItem[]
): string {
	const grossRub = (payrollResult.totalGrossRevenueKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
	const labRub = (payrollResult.totalLabDeductionsKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
	const matRub = (payrollResult.totalMaterialDeductionsKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
	const netBaseRub = (payrollResult.totalNetBaseKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
	const baseCommRub = (payrollResult.earnedBaseCommissionKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
	const retailRub = (payrollResult.earnedRetailCommissionKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
	const kpiRub = (payrollResult.kpiBonusEarnedKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
	const grossPayoutRub = (payrollResult.grossPayoutBeforeTaxKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
	const effectiveNdflKop = payrollResult.ndflTaxKop ?? payrollResult.ndfl13TaxKop;
	const ndflRub = (effectiveNdflKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
	const netToDocRub = (payrollResult.netPayoutToDoctorKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
	const isSelfEmployed = payrollResult.taxRegime === "self_employed" || effectiveNdflKop === 0;
	const taxTitle = isSelfEmployed
		? "НДФЛ (ИП / Самозанятый, налог уплачивается врачом самостоятельно):"
		: payrollResult.isProgressiveTaxApplied ? "Удержан НДФЛ 13-15% (ст. 224, п. 6 ст. 225 НК РФ):" : "Удержан НДФЛ 13% (п. 6 ст. 225 НК РФ):";

	const overheadHtml = (payrollResult.overheadConsumablesCoveredKop && payrollResult.overheadConsumablesCoveredKop > 0)
		? `<div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 8px 12px; margin-bottom: 16px; font-size: 9.5pt; color: #1e40af;"><strong>Клинический стандарт DENTE:</strong> Общеклинические расходные материалы на сумму <strong>${(payrollResult.overheadConsumablesCoveredKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</strong> оплачены клиникой и не удерживаются из зарплаты врача.</div>`
		: "";

	const isChairRental = payrollResult.payoutModel === "chair_rental";
	const chairRentalRow = (isChairRental && (payrollResult.chairRentalKop ?? 0) > 0)
		? `<tr><td>Аренда стоматологического кресла (соло-врач)</td><td class="num" style="color: #b91c1c;">-${((payrollResult.chairRentalKop ?? 0) / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</td></tr>`
		: "";

	const advanceRows = (payrollResult.advancePayoutKop && payrollResult.advancePayoutKop > 0)
		? `<div class="summary-row" style="color: #64748b;"><span>Выплаченный ранее аванс:</span><span>-${((payrollResult.advancePayoutKop) / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</span></div>
		<div class="summary-row total" style="color: #0d9488; font-size: 14pt;"><span>ОСТАТОК К ПЕРЕЧИСЛЕНИЮ:</span><span>${((payrollResult.mainPayoutKop ?? (payrollResult.netPayoutToDoctorKop - payrollResult.advancePayoutKop)) / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</span></div>`
		: "";

	const npdRow = (isSelfEmployed && (payrollResult.npd6TaxKop || payrollResult.netPayoutToDoctorKop > 0))
		? `<div class="summary-row" style="color: #0284c7; font-size: 9.5pt;"><span>Налог на профессиональный доход (НПД 6%):</span><span>${((payrollResult.npd6TaxKop ?? Math.round((payrollResult.netPayoutToDoctorKop * 6) / 100)) / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽ (чек «Мой налог»)</span></div>`
		: "";

	const servicesTableHtml = renderDoctorPayslipServicesTableHtml(payrollResult, services);

	return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Расчетный листок — ${escapeXml(payrollResult.doctorName)}</title>
	<style>
		@page { size: A4; margin: 15mm; } body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11pt; color: #111827; margin: 0; padding: 10px; }
		.header { text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 8px; margin-bottom: 16px; }
		.header h1 { font-size: 16pt; margin: 0 0 4px 0; color: #0f172a; } .header p { font-size: 10pt; color: #475569; margin: 0; }
		.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; background: #f8fafc; padding: 10px; border-radius: 6px; font-size: 10pt; }
		.table { width: 100%; border-collapse: collapse; margin-bottom: 16px; } .table th, .table td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
		.table th { background: #f1f5f9; font-weight: 600; font-size: 9pt; } .table td.num { text-align: right; }
		.summary-box { background: #f0fdfa; border: 1px solid #99f6e4; padding: 12px; border-radius: 6px; margin-bottom: 20px; }
		.summary-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 10pt; }
		.summary-row.total { font-size: 13pt; font-weight: bold; border-top: 1px solid #0d9488; padding-top: 8px; color: #0f766e; }
		.signatures { display: flex; justify-content: space-between; margin-top: 40px; font-size: 10pt; }
		.signature-line { width: 200px; border-bottom: 1px solid #475569; margin-top: 25px; }
	</style></head><body>
	<div class="header"><h1>РАСЧЕТНЫЙ ЛИСТОК ЗА ПЕРИОД</h1><p>${escapeXml(clinicName)} • Ст. 136 ТК РФ</p></div>
	<div class="meta-grid">
		<div><strong>Сотрудник:</strong> ${escapeXml(payrollResult.doctorName)}</div><div><strong>Период:</strong> ${escapeXml(payrollResult.periodLabelRu)}</div>
		<div><strong>Специальность:</strong> ${escapeXml(payrollResult.specialtyTitleRu)}</div><div><strong>Модель:</strong> ${isChairRental ? "Аренда кресла (Соло)" : `Сдельная ставка ${payrollResult.baseCommissionPercent}%`}</div>
	</div>
	${overheadHtml}
	<table class="table"><thead><tr><th>Показатель начисления / удержания</th><th style="width: 140px; text-align: right;">Сумма (руб.)</th></tr></thead><tbody>
		<tr><td>Выручка от оказанных услуг (Gross)</td><td class="num">${grossRub} ₽</td></tr>
		${chairRentalRow}
		<tr><td>Удержание: Зуботехническая лаборатория (ЗТЛ)</td><td class="num" style="color: #b91c1c;">-${labRub} ₽</td></tr>
		<tr><td>Удержание: Дорогостоящие расходные материалы</td><td class="num" style="color: #b91c1c;">-${matRub} ₽</td></tr>
		<tr style="background: #f8fafc; font-weight: 600;"><td>${isChairRental ? "Чистый доход соло-врача" : "Чистая сдельная база (Net Base)"}</td><td class="num">${netBaseRub} ₽</td></tr>
		${!isChairRental ? `<tr><td>Начислено: Сдельная оплата (${payrollResult.baseCommissionPercent}%)</td><td class="num">${baseCommRub} ₽</td></tr>` : ""}
		<tr><td>Начислено: Продажа средств гигиены (Retail)</td><td class="num">${retailRub} ₽</td></tr>
		${!isChairRental ? `<tr><td>Премия: Выполнение нормативов KPI (${escapeXml(payrollResult.kpiTierBadgeRu)})</td><td class="num">${kpiRub} ₽</td></tr>` : ""}
		${payrollResult.manualAdjustmentKop !== 0 ? `<tr><td>Корректировка / Аванс</td><td class="num">${(payrollResult.manualAdjustmentKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</td></tr>` : ""}
	</tbody></table>
	${servicesTableHtml}
	<div class="summary-box">
		<div class="summary-row"><span>Всего начислено (до налогообложения):</span><strong>${grossPayoutRub} ₽</strong></div>
		<div class="summary-row" style="color: #b91c1c;"><span>${taxTitle}</span><span>-${ndflRub} ₽</span></div>
		${npdRow}
		<div class="summary-row total"><span>ИТОГО К ВЫПЛАТЕ («НА РУКИ»):</span><span>${netToDocRub} ₽</span></div>
		${advanceRows}
	</div>
	<div class="signatures">
		<div><div>Главный бухгалтер:</div><div class="signature-line"></div></div>
		<div><div>Руководитель клиники / Главврач:</div><div class="signature-line"></div></div>
		<div><div>Врач-специалист (подпись):</div><div class="signature-line"></div></div>
	</div>
	<script>window.onload = function() { window.print(); };</script></body></html>`;
}

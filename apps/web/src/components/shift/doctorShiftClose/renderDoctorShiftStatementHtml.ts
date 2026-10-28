import type { DoctorShiftStats } from "../controlBarModules/shiftControlBarTypes";
import type { DoctorShiftCompensationModel } from "./doctorShiftCloseTypes";

export interface DoctorShiftStatementHtmlParams {
	doctorFullName: string;
	doctorSpecialtyRu: string;
	clinicName: string;
	todayLabel: string;
	shiftStats: DoctorShiftStats;
	cashRub: number;
	cardRub: number;
	sbpRub: number;
	depositRub: number;
	effectiveTotalCashRub: number;
	emrSigned: number;
	countedCashRub: number;
	cashDifferenceRub: number;
	isCashBalanced: boolean;
	cashboxName: string;
	fiscalDocNumber: string;
	compensationModel: DoctorShiftCompensationModel;
	calculatedPayoutRub: number;
	labDeductionsRub: number;
	fixedRentRub?: number;
	baseSalaryRub?: number;
}

export function renderDoctorShiftStatementHtml(params: DoctorShiftStatementHtmlParams): string {
	const {
		doctorFullName, doctorSpecialtyRu, clinicName, todayLabel, shiftStats,
		cashRub, cardRub, sbpRub, depositRub, effectiveTotalCashRub, emrSigned,
		countedCashRub, cashDifferenceRub, isCashBalanced, cashboxName, fiscalDocNumber,
		compensationModel, calculatedPayoutRub, labDeductionsRub, fixedRentRub = 3500, baseSalaryRub = 2500,
	} = params;

	const modelLabel = compensationModel === "chair_rental" ? "Аренда кресла (фиксированная плата)"
		: compensationModel === "salary_plus_bonus" ? "Оклад за смену + % от услуг"
		: "Сдельщина (% от услуг за вычетом ЗТЛ)";

	return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Сводка смены — ${doctorFullName}</title>
<style>
@page { size: A4; margin: 15mm; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11pt; color: #111827; margin: 0; padding: 10px; }
.header { text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 8px; margin-bottom: 16px; }
.header h1 { font-size: 15pt; margin: 0 0 4px 0; color: #0f172a; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; background: #f8fafc; padding: 10px; border-radius: 6px; font-size: 10pt; }
.table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
.table th, .table td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
.table th { background: #f1f5f9; font-weight: 600; font-size: 9pt; }
.table td.num { text-align: right; }
.total-box { background: #f0fdfa; border: 1px solid #99f6e4; padding: 12px; border-radius: 6px; margin-bottom: 20px; }
.total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11pt; }
.total-row.highlight { font-size: 13pt; font-weight: bold; border-top: 1px solid #0d9488; padding-top: 6px; color: #0f766e; }
.signatures { display: flex; justify-content: space-between; margin-top: 40px; font-size: 10pt; }
.signature-line { width: 200px; border-bottom: 1px solid #475569; margin-top: 25px; }
</style></head><body>
<div class="header"><h1>СВОДКА СМЕНЫ ВРАЧА-СТОМАТОЛОГА</h1><p>${clinicName} • Итоговый расчёт дня и сданной выручки</p></div>
<div class="grid"><div><strong>Врач:</strong> ${doctorFullName}</div><div><strong>Дата смены:</strong> ${todayLabel}</div><div><strong>Специальность:</strong> ${doctorSpecialtyRu}</div><div><strong>Статус:</strong> Смена закрыта</div></div>
<h3>1. Приём пациентов</h3>
<table class="table"><thead><tr><th>Показатель</th><th style="width: 140px; text-align: right;">Значение</th></tr></thead><tbody>
<tr><td>Всего запланировано визитов</td><td class="num">${shiftStats.totalAppointments}</td></tr>
<tr><td>Принято и завершено</td><td class="num">${shiftStats.completedCount}</td></tr>
<tr><td>Пациентов в кресле на момент закрытия</td><td class="num">${shiftStats.inProgressCount}</td></tr>
<tr><td>Электронных карт заверенно ПЭП (63-ФЗ)</td><td class="num">${emrSigned}</td></tr>
</tbody></table>
<h3>2. Сданная выручка и касса по видам оплат</h3>
<table class="table"><thead><tr><th>Вид оплаты</th><th style="width: 140px; text-align: right;">Сумма (руб.)</th></tr></thead><tbody>
<tr><td>Наличные денежные средства</td><td class="num">${cashRub.toLocaleString("ru-RU")} ₽</td></tr>
<tr><td>Банковские карты (POS-терминал / Эквайринг)</td><td class="num">${cardRub.toLocaleString("ru-RU")} ₽</td></tr>
<tr><td>Система быстрых платежей (СБП QR)</td><td class="num">${sbpRub.toLocaleString("ru-RU")} ₽</td></tr>
<tr><td>Списание с лицевых депозитов пациентов</td><td class="num">${depositRub.toLocaleString("ru-RU")} ₽</td></tr>
<tr style="background: #f8fafc; font-weight: bold;"><td>Итого сданная касса:</td><td class="num">${effectiveTotalCashRub.toLocaleString("ru-RU")} ₽</td></tr>
</tbody></table>
<h3>3. Сверка кассы и фискальные реквизиты</h3>
<table class="table"><thead><tr><th>Реквизит / Параметр</th><th style="width: 220px; text-align: right;">Значение</th></tr></thead><tbody>
<tr><td>Кассовый аппарат (ККТ)</td><td class="num">${cashboxName}</td></tr>
<tr><td>Фискальный Z-отчёт с гашением</td><td class="num">${fiscalDocNumber}</td></tr>
<tr><td>Реквизиты фискализации</td><td class="num">ФД: 00042 • ФПД: 3829104812 • ФН: 996044030</td></tr>
<tr><td>Учётный остаток наличных (по чекам)</td><td class="num">${cashRub.toLocaleString("ru-RU")} ₽</td></tr>
<tr><td>Фактический остаток наличных (в ящике)</td><td class="num">${countedCashRub.toLocaleString("ru-RU")} ₽</td></tr>
<tr style="background: #f8fafc; font-weight: bold;"><td>Расхождение кассы:</td><td class="num" style="color: ${isCashBalanced ? "#15803d" : "#b91c1c"};">${cashDifferenceRub.toLocaleString("ru-RU")} ₽ (${isCashBalanced ? "Сверено без расхождений" : "Расхождение"})</td></tr>
</tbody></table>
<h3>4. Расчёт заработка врача за смену</h3>
<div class="total-box">
<div class="total-row"><span>Модель расчёта:</span><strong>${modelLabel}</strong></div>
<div class="total-row"><span>Общая выручка от услуг за смену:</span><strong>${shiftStats.totalRevenueRub.toLocaleString("ru-RU")} ₽</strong></div>
${labDeductionsRub > 0 ? `<div class="total-row"><span>Вычет зуботехнической лаборатории (ЗТЛ):</span><span>-${labDeductionsRub.toLocaleString("ru-RU")} ₽</span></div>` : ""}
${compensationModel === "chair_rental" ? `<div class="total-row"><span>Фиксированная аренда смены кресла:</span><span>-${fixedRentRub.toLocaleString("ru-RU")} ₽</span></div>` : ""}
${compensationModel === "salary_plus_bonus" ? `<div class="total-row"><span>Фиксированный оклад за выход:</span><span>+${baseSalaryRub.toLocaleString("ru-RU")} ₽</span></div>` : ""}
<div class="total-row highlight"><span>ИТОГОВЫЙ ЗАРАБОТОК ВРАЧА ЗА СМЕНУ:</span><span>${calculatedPayoutRub.toLocaleString("ru-RU")} ₽</span></div>
</div>
<div class="signatures"><div><div>Смену сдал (врач):</div><div class="signature-line"></div></div><div><div>Смену принял (администратор / кассир):</div><div class="signature-line"></div></div></div>
<script>window.onload = function() { window.print(); };</script>
</body></html>`;
}

/**
 * CRM Funnel Export Utilities (CSV & Text Digest)
 *
 * Extracted per Mandate 8s (Anti-Bloat & Modular Architecture)
 */

import type { FunnelAnalysisResult } from "./leadsFunnelTypes";

/**
 * Экспорт результатов сквозной воронки в CSV (BOM \uFEFF для корректного открытия в Excel РФ)
 */
export function exportFunnelReportCsv(result: FunnelAnalysisResult): string {
	const lines: string[] = [];

	// BOM для UTF-8
	const bom = "\uFEFF";

	lines.push("ОТЧЕТ СКВОЗНОЙ ВОРОНКИ И МАРКЕТИНГОВОЙ АНАЛИТИКИ CRM ДЕНТЕ");
	lines.push(`Период:;${result.period};Всего обращений в выборке:;${result.filteredLeadsCount}`);
	lines.push("");

	// 1. Сводные метрики
	lines.push("1. КЛЮЧЕВЫЕ ПОКАЗАТЕЛИ МАРКЕТИНГА И ПРОДАЖ");
	lines.push("Показатель;Значение;Единица измерения");
	lines.push(`Всего обращений (Leads);${result.summary.totalLeads};шт.`);
	lines.push(`Записано на консультацию;${result.summary.bookedLeads};шт.`);
	lines.push(`Конверсия в запись;${result.summary.bookingRatePercent}%;%`);
	lines.push(`Дошли до клиники (Show-up);${result.summary.showUpLeads};шт.`);
	lines.push(`Доходимость (Show-up rate);${result.summary.showUpRatePercent}%;%`);
	lines.push(`Согласован план лечения;${result.summary.agreedPlanLeads};шт.`);
	lines.push(`Принятие плана лечения;${result.summary.planAcceptanceRatePercent}%;%`);
	lines.push(`Оплатившие клиенты;${result.summary.paidLeads};пациентов`);
	lines.push(`Итоговая конверсия в оплату;${result.summary.overallConversionPercent}%;%`);
	lines.push(`Рекламный бюджет (Маркетинг);${result.summary.totalMarketingSpendRub};руб.`);
	lines.push(`Фактическая выручка;${result.summary.totalRevenueRub};руб.`);
	lines.push(`Чистая прибыль от маркетинга;${result.summary.netMarketingProfitRub};руб.`);
	lines.push(`Средний чек первичного пациента;${result.summary.avgBillRub};руб.`);
	lines.push(`Стоимость лида (CPL);${result.summary.cplRub};руб.`);
	lines.push(`Стоимость дошедшего (CPS);${result.summary.cpsRub};руб.`);
	lines.push(`Стоимость привлечения клиента (CAC);${result.summary.cacRub};руб.`);
	lines.push(`Возврат инвестиций (ROMI);${result.summary.romiPercent}%;%`);
	lines.push(`Фактический LTV;${result.summary.ltvEstimatedRub};руб.`);
	lines.push(`Отношение LTV / CAC;${result.summary.ltvToCacRatio};x`);
	lines.push("");

	// 2. Этапы воронки
	lines.push("2. ЭТАПЫ СКВОЗНОЙ ВОРОНКИ ПАЦИЕНТОВ");
	lines.push("Этап;Количество;Конверсия от входа (%);Пошаговая конверсия (%);Отвал (Drop-off шт);Отвал (%)");
	for (const st of result.stages) {
		lines.push(
			`"${st.label}";${st.count};${st.conversionFromFirstPercent}%;${st.conversionFromPrevPercent}%;${st.dropCount};${st.dropRatePercent}%`,
		);
	}
	lines.push("");

	// 3. Маркетинговые каналы
	lines.push("3. ЭФФЕКТИВНОСТЬ РЕКЛАМНЫХ КАНАЛОВ");
	lines.push(
		"Рекламный канал;Расход (руб);Лидов;Записей;Дошли;Оплатили;Конверсия (%);Выручка (руб);Ср. чек (руб);CPL (руб);CAC (руб);ROMI (%);Оценка;Рекомендация",
	);
	for (const ch of result.channels) {
		lines.push(
			`"${ch.channelLabel}";${ch.spendRub};${ch.leadsCount};${ch.bookedCount};${ch.showUpCount};${ch.paidCount};${ch.conversionRatePercent}%;${ch.revenueRub};${ch.avgBillRub};${ch.cplRub};${ch.cacRub};${ch.romiPercent}%;"${ch.efficiencyRating}";"${ch.recommendation}"`,
		);
	}

	return bom + lines.join("\r\n");
}

/**
 * Текстовый дайджест для руководства клиники / маркетолога
 */
export function exportFunnelReportSummaryText(
	result: FunnelAnalysisResult,
): string {
	const s = result.summary;
	return [
		`ДАЙДЖЕСТ ВОРОНКИ ПАЦИЕНТОВ CRM ДЕНТЕ (Период: ${result.period})`,
		"--------------------------------------------------",
		`Лидов получено: ${s.totalLeads} | Записано: ${s.bookedLeads} (${s.bookingRatePercent}%)`,
		`Дошли до клиники: ${s.showUpLeads} (Show-up: ${s.showUpRatePercent}%)`,
		`Оплатили лечение: ${s.paidLeads} (Итоговая конверсия: ${s.overallConversionPercent}%)`,
		"--------------------------------------------------",
		`Расходы на рекламу: ${s.totalMarketingSpendRub.toLocaleString("ru-RU")} ₽`,
		`Выручка: ${s.totalRevenueRub.toLocaleString("ru-RU")} ₽`,
		`ROMI: ${s.romiPercent}% | Чистая выгода: ${s.netMarketingProfitRub.toLocaleString("ru-RU")} ₽`,
		`Ср. чек: ${s.avgBillRub.toLocaleString("ru-RU")} ₽ | CAC: ${s.cacRub.toLocaleString("ru-RU")} ₽ | CPL: ${s.cplRub.toLocaleString("ru-RU")} ₽`,
		`Фактический LTV: ${s.ltvEstimatedRub.toLocaleString("ru-RU")} ₽ (LTV/CAC: ${s.ltvToCacRatio}x)`,
		"--------------------------------------------------",
	].join("\n");
}

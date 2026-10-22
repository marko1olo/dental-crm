import type { CashDaySummary } from "../cashDaySummary";
import type { ShiftCloseZReport54FzResult } from "../fiscalReceiptEngine";

export function createFiscalStatementShift(
	dayKey: string,
	cashierFullName: string,
	summary: CashDaySummary,
) {
	return {
		shiftNumber: 42,
		date: dayKey || new Date().toISOString().slice(0, 10),
		cashierFullName,
		receiptsCount: summary.receivedCount,
		cashIncomeRub: summary.cashRub,
		cashIncomeKopecks: Math.round(summary.cashRub * 100),
		cardIncomeRub: summary.cardRub,
		cardIncomeKopecks: Math.round(summary.cardRub * 100),
		sbpIncomeRub: summary.sbpRub,
		sbpIncomeKopecks: Math.round(summary.sbpRub * 100),
		advanceOffsetIncomeRub: summary.familyWalletRub,
		advanceOffsetIncomeKopecks: Math.round(summary.familyWalletRub * 100),
		returnsTotalRub: summary.refundedRub,
		returnsTotalKopecks: Math.round(summary.refundedRub * 100),
		shiftRevenueTotalRub: summary.receivedRub - summary.refundedRub,
		shiftRevenueTotalKopecks: Math.round((summary.receivedRub - summary.refundedRub) * 100),
	};
}

export function formatZReportClipboardText(z: ShiftCloseZReport54FzResult): string {
	return `
========================================
    ОТЧЕТ О ЗАКРЫТИИ СМЕНЫ (Z-ОТЧЕТ)
         Фискальный кассовый чек
========================================
${z.clinicLegalName}
ИНН: ${z.clinicInn} КПП: ${z.clinicKpp || "770101001"}
Адрес: ${z.clinicAddress}
----------------------------------------
СМЕНА: №${z.shiftNumber}
ДОКУМЕНТ: №${z.fiscalDocumentNumber}
ДАТА/ВРЕМЯ: ${z.closeDateRu}
КАССИР: ${z.cashierFullName}
----------------------------------------
ИТОГИ СМЕНЫ:
ЧЕКОВ ПРИХОДА: ${z.incomeCount}
СУММА ПРИХОДА: ${z.incomeTotalRub.toLocaleString("ru-RU")} ₽
  - Наличными: ${z.incomeCashRub.toLocaleString("ru-RU")} ₽
  - Картой / Безнал: ${z.incomeCardRub.toLocaleString("ru-RU")} ₽
  - СБП QR: ${z.incomeSbpRub.toLocaleString("ru-RU")} ₽
  - Зачет аванса / семья: ${z.incomeAdvanceOffsetRub.toLocaleString("ru-RU")} ₽

ЧЕКОВ ВОЗВРАТА: ${z.incomeReturnCount}
СУММА ВОЗВРАТОВ: ${z.incomeReturnTotalRub.toLocaleString("ru-RU")} ₽

ИТОГОВАЯ ВЫРУЧКА ЗА СМЕНУ: ${z.totalRevenueRub.toLocaleString("ru-RU")} ₽
НАЛИЧНЫХ В ЯЩИКЕ: ${z.cashInDrawerCalculatedRub.toLocaleString("ru-RU")} ₽
----------------------------------------
НЕПЕРЕДАННЫХ ФД В ОФД: 0
РЕСУРС ФН: ${z.fnResourceDaysRemaining} дней
Рег. номер кассы: ${z.kktRegNumber}
Заводской номер кассы: ${z.kktSerialNumber}
ФН: ${z.fnSerial}
ФПД: ${z.fiscalSign}
ОФД: ${z.ofdName}
========================================
`.trim();
}

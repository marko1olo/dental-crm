/**
 * constants.ts — Layer 0: Statutory 54-FZ & FFD 1.2 Fiscal Constants & KKT Parameters.
 */

export const DEFAULT_KKT_PING_HOST = "192.168.1.150";
export const DEFAULT_KKT_PING_PORT = 16732;
export const DEFAULT_KKT_PING_TIMEOUT_MS = 3000;

export const FISCAL_QUEUE_STATUSES = [
	"pending_print",
	"hardware_offline",
	"offline_pending",
	"printed",
	"failed",
	"all",
] as const;

export type FiscalQueueStatus = (typeof FISCAL_QUEUE_STATUSES)[number];

export const FFD_12_OPERATION_TYPES = {
	INCOME: 1, // Приход
	INCOME_RETURN: 2, // Возврат прихода
	EXPENSE: 3, // Расход
	EXPENSE_RETURN: 4, // Возврат расхода
} as const;

export const FFD_12_PAYMENT_METHODS = {
	FULL_PREPAYMENT: 1, // Предоплата 100%
	PARTIAL_PREPAYMENT: 2, // Предоплата частичная
	ADVANCE: 3, // Аванс
	FULL_PAYMENT: 4, // Полный расчет
	PARTIAL_PAYMENT_AND_CREDIT: 5, // Частичный расчет и кредит
	TRANSFER_ON_CREDIT: 6, // Передача в кредит
	CREDIT_PAYMENT: 7, // Оплата кредита
} as const;

export const FFD_12_PAYMENT_SUBJECTS = {
	COMMODITY: 1, // Товар
	SERVICE: 4, // Услуга
	PAYMENT: 10, // Платеж
	MARKED: 32, // Подакцизный / Маркированный товар
} as const;

export const FFD_12_VAT_RATES = {
	VAT_20: 1, // НДС 20%
	VAT_10: 2, // НДС 10%
	VAT_20_120: 3, // НДС 20/120
	VAT_10_110: 4, // НДС 10/110
	VAT_0: 5, // НДС 0%
	NO_VAT: 6, // Без НДС
} as const;

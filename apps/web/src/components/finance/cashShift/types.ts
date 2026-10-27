/**
 * types.ts — Domain Contracts & Types for Cash Shift Closing & Reconciliation.
 * Mandate 8b: <= 120 lines. Zero bureaucracy, integer kopecks.
 */
import type { Kopecks } from "@dental/shared";

export type CashShiftStatus = "not_opened" | "open" | "closed" | "expired_24h";

export type CashShiftOperationType =
	| "open_shift"
	| "cash_in"
	| "cash_out"
	| "encashment"
	| "patient_payment"
	| "patient_refund"
	| "close_shift";

export type CashDiscrepancyReason =
	| "exact_match"
	| "cashier_change_error"
	| "unrecorded_cash_operation"
	| "pos_terminal_desync"
	| "bank_holding_delay"
	| "technical_kkt_malfunction"
	| "rounding_difference"
	| "other";

export const CASH_DISCREPANCY_REASON_LABELS: Record<CashDiscrepancyReason, string> = {
	exact_match: "Расхождений нет (100% совпадение)",
	cashier_change_error: "Ошибка кассира при выдаче сдачи",
	unrecorded_cash_operation: "Неучтенная наличная операция (без пробития чека)",
	pos_terminal_desync: "Рассинхронизация с банковским POS-терминалом",
	bank_holding_delay: "Задержка клиринга СБП / межбанковский холдинг",
	technical_kkt_malfunction: "Технический сбой ККТ / фискального накопителя",
	rounding_difference: "Суммарная погрешность округления",
	other: "Иная причина (см. объяснительную)",
};

/** Optional backwards-compatibility adapter for physical cash denominations */
export interface CashDenominations {
	readonly b5000?: number;
	readonly b2000?: number;
	readonly b1000?: number;
	readonly b500?: number;
	readonly b200?: number;
	readonly b100?: number;
	readonly b50?: number;
	readonly c10?: number;
	readonly c5?: number;
	readonly c2?: number;
	readonly c1?: number;
	readonly coinsFractionalRub?: number;
}

export const EMPTY_CASH_DENOMINATIONS: CashDenominations = {
	b5000: 0, b2000: 0, b1000: 0, b500: 0, b200: 0,
	b100: 0, b50: 0, c10: 0, c5: 0, c2: 0, c1: 0, coinsFractionalRub: 0,
};

export interface CashShiftOperationRecord {
	readonly id: string;
	readonly timestampIso: string;
	readonly type: CashShiftOperationType;
	readonly amountRub: number;
	readonly amountKopecks: Kopecks;
	readonly tenderType?: "cash" | "card" | "sbp" | "advance_offset" | "mixed" | undefined;
	readonly description: string;
	readonly docNumber?: string | undefined;
	readonly patientName?: string | undefined;
	readonly cashierFullName: string;
}

export interface ClinicFiscalDetails {
	readonly legalName: string;
	readonly inn: string;
	readonly kpp?: string | undefined;
	readonly ogrn?: string | undefined;
	readonly address: string;
	readonly kktRegNumber: string;
	readonly kktSerialNumber: string;
	readonly kktModelName?: string | undefined;
	readonly fnSerialNumber: string;
	readonly ofdName: string;
	readonly chiefExecutiveFullName: string;
	readonly chiefAccountantFullName: string;
}

export const DEFAULT_CLINIC_FISCAL_DETAILS: ClinicFiscalDetails = {
	legalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	inn: "",
	kpp: "",
	ogrn: "",
	address: "",
	kktRegNumber: "0004829104058291",
	kktSerialNumber: "019482019482",
	kktModelName: "АТОЛ 27Ф",
	fnSerialNumber: "9960440302145896",
	ofdName: "АО «ПЕРВЫЙ ОФД»",
	chiefExecutiveFullName: "",
	chiefAccountantFullName: "",
};

export interface CashShiftTendersBreakdown {
	readonly cashIncomeRub: number;
	readonly cashIncomeKopecks: Kopecks;
	readonly cardIncomeRub: number;
	readonly cardIncomeKopecks: Kopecks;
	readonly sbpIncomeRub: number;
	readonly sbpIncomeKopecks: Kopecks;
	readonly advanceOffsetIncomeRub: number;
	readonly advanceOffsetIncomeKopecks: Kopecks;
	readonly totalGrossIncomeRub: number;
	readonly totalGrossIncomeKopecks: Kopecks;
	readonly cashReturnRub: number;
	readonly cashReturnKopecks: Kopecks;
	readonly cardReturnRub: number;
	readonly cardReturnKopecks: Kopecks;
	readonly sbpReturnRub: number;
	readonly sbpReturnKopecks: Kopecks;
	readonly advanceOffsetReturnRub: number;
	readonly advanceOffsetReturnKopecks: Kopecks;
	readonly totalReturnsRub: number;
	readonly totalReturnsKopecks: Kopecks;
	readonly netRevenueRub: number;
	readonly netRevenueKopecks: Kopecks;
}

/**
 * cashboxShiftTypes.ts — Layer 0: Contracts & Data Types for Cashbox Shift & Reconciliations.
 *
 * DENTE Dental CRM — Cash Register 54-FZ, Shifts & Reconciliation Operations.
 */

export type CashboxOperationType =
	| "shift_open"
	| "cash_in"
	| "cash_out"
	| "x_report"
	| "z_report"
	| "income"
	| "expense";

export interface CashboxShiftState {
	readonly id?: string | undefined;
	readonly cashBoxId: string;
	readonly status: "open" | "closed";
	readonly openedAt: string;
	readonly closedAt?: string | undefined;
	readonly initialCashRub: number;
	readonly incomeCashRub: number;
	readonly incomeCardRub: number;
	readonly incomeSbpRub: number;
	readonly expenseCashRub: number;
	readonly currentBalanceRub: number;
}

export interface CashboxShiftValidation {
	readonly isLimitExceeded: boolean;
	readonly durationHours: number;
	readonly durationMinutes: number;
	readonly remainingHours: number;
	readonly canOpen: boolean;
	readonly canClose: boolean;
	readonly statusMessageRu: string;
	readonly warningRu?: string | undefined;
}

export interface CashboxReconciliationResult {
	readonly expectedCashRub: number;
	readonly expectedCashKop: number;
	readonly actualCashRub: number;
	readonly actualCashKop: number;
	readonly discrepancyRub: number;
	readonly discrepancyKop: number;
	readonly isBalanced: boolean;
	readonly statusRu: "Сбалансировано" | "Излишек" | "Недостача";
	readonly descriptionRu: string;
}

export interface CashboxTransactionPayload {
	readonly cashBoxId: string;
	readonly operationType: CashboxOperationType;
	readonly amountRub: number;
	readonly reasonText: string;
	readonly operatorName?: string | undefined;
	readonly shiftId?: string | undefined;
	readonly metadata?: Record<string, unknown> | undefined;
}

export interface CashboxTransactionResult {
	readonly success: boolean;
	readonly operationId?: string | undefined;
	readonly cashBoxId: string;
	readonly amountRub: number;
	readonly balanceBeforeRub: number;
	readonly balanceAfterRub: number;
	readonly receiptNumber?: string | undefined;
	readonly printedAt?: string | undefined;
	readonly messageRu: string;
}

/**
 * types.ts — Layer 0: DTO Contracts & TypeScript Types for Cashbox Subsystem.
 * 
 * Strict 54-FZ, StomX Reverse Engineering Bible & Mandate 8e/8n compliance.
 * Zero runtime dependencies (Pure Type Definitions).
 */

import type {
	cashBoxes,
	cashBoxShifts,
	cashExpenseReasons,
	cashOperations,
} from "../../db/schema.js";

export type CashBoxSelect = typeof cashBoxes.$inferSelect;
export type CashBoxShiftSelect = typeof cashBoxShifts.$inferSelect;
export type CashOperationSelect = typeof cashOperations.$inferSelect;
export type CashExpenseReasonSelect = typeof cashExpenseReasons.$inferSelect;

export interface OpenShiftRequestBody {
	openedByUserId?: string;
	cashierFullName?: string;
	openedAt?: string;
}

export interface OpenShiftResponseBody {
	success: boolean;
	message: string;
	openedShiftsCount: number;
	shifts: CashBoxShiftSelect[];
}

export interface ZReportDataPayload {
	closedAtIso: string;
	cashierFullName: string | null;
	startingBalanceRub: number;
	finalBalanceRub: number;
	incomeTotalRub: number;
	expenseTotalRub: number;
	countedCashRub: number;
	incomeCashRub: number | null;
	incomeElectronicRub: number | null;
	incomeSbpRub: number | null;
	advanceOffsetRub: number | null;
	netRevenueRub: number | null;
	differenceRub: number;
	isBalanced: boolean;
	reconciliation: Record<string, unknown> | null;
}

export interface CloseShiftRequestBody {
	closedByUserId?: string;
	cashierFullName?: string;
	zReportNumber?: string;
	shiftNumber?: number;
	closedAt?: string;
	countedCashRub?: number;
	incomeCashRub?: number;
	incomeElectronicRub?: number;
	incomeSbpRub?: number;
	advanceOffsetRub?: number;
	netRevenueRub?: number;
	differenceRub?: number;
	isBalanced?: boolean;
	reconciliation?: Record<string, unknown>;
}

export interface CloseShiftResponseBody {
	success: boolean;
	message: string;
	closedShiftsCount: number;
	shifts: CashBoxShiftSelect[];
	reconciliation?: {
		countedCashRub: number | null;
		incomeCashRub: number | null;
		incomeElectronicRub: number | null;
		incomeSbpRub: number | null;
		differenceRub: number;
		isBalanced: boolean;
	};
}

export interface CashIntroductionRequestBody {
	cashBoxId?: string;
	amountRub: number;
	reasonText?: string;
	operatorId?: string;
	cashierFullName?: string;
	typeAlias?: string;
}

export interface CashIntroductionResponseBody {
	success: boolean;
	message: string;
	operation: CashOperationSelect;
	cashBox: CashBoxSelect;
}

export interface CashWithdrawalRequestBody {
	cashBoxId?: string;
	amountRub: number;
	reasonText?: string;
	operatorId?: string;
	recipientFio?: string;
	cashierFullName?: string;
	typeAlias?: string;
}

export interface CashWithdrawalResponseBody {
	success: boolean;
	message: string;
	operation: CashOperationSelect;
	cashBox: CashBoxSelect;
}

export interface XReportQueryOrBody {
	cashierFullName?: string;
	shiftNumber?: number;
}

export interface XReportResponseBody {
	success: boolean;
	reportType: "x_report";
	shiftNumber: number;
	status: "open" | "closed";
	openedAt: Date;
	printedAt: string;
	cashierFullName: string;
	totalCashInDrawerRub: number;
	totalIncomeRub: number;
	totalExpenseRub: number;
	openShiftsCount: number;
	boxesCount: number;
}

export interface CashOperationListQuery {
	cashBoxId?: string;
	operationType?: string;
	dateFrom?: string;
	dateTo?: string;
}

export interface CashRefundRequestBody {
	cashBoxId?: string;
	amountRub: number;
	reasonText?: string;
	invoiceId?: string;
	paymentId?: string;
	operatorId?: string;
	cashierFullName?: string;
}

export interface CashRefundResponseBody {
	success: boolean;
	message: string;
	operation: CashOperationSelect;
	cashBox: CashBoxSelect;
}

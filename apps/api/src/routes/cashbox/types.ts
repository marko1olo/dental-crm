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
	insuranceTotalRub?: number | null;
	returnTotalRub?: number | null;
	netRevenueRub: number | null;
	expectedCashInDrawerRub?: number;
	differenceRub: number;
	isBalanced: boolean;
	discrepancyType?: "balanced" | "excess" | "shortage";
	fiscalDocNumber?: string | null;
	fiscalSign?: string | null;
	qrString?: string | null;
	reconciliation: Record<string, unknown> | null;
}

export interface CloseShiftRequestBody {
	closedByUserId?: string | undefined;
	cashierFullName?: string | undefined;
	zReportNumber?: string | undefined;
	shiftNumber?: number | undefined;
	closedAt?: string | undefined;
	countedCashRub?: number | undefined;
	incomeCashRub?: number | undefined;
	incomeElectronicRub?: number | undefined;
	incomeSbpRub?: number | undefined;
	advanceOffsetRub?: number | undefined;
	insuranceTotalRub?: number | undefined;
	returnTotalRub?: number | undefined;
	netRevenueRub?: number | undefined;
	differenceRub?: number | undefined;
	isBalanced?: boolean | undefined;
	idempotencyKey?: string | undefined;
	clientMutationId?: string | undefined;
	reconciliation?: Record<string, unknown> | undefined;
}

export interface CloseShiftResponseBody {
	success: boolean;
	message: string;
	closedShiftsCount: number;
	shifts: CashBoxShiftSelect[];
	reconciliation?: {
		countedCashRub: number | null;
		expectedCashInDrawerRub?: number | null | undefined;
		incomeCashRub: number | null;
		incomeElectronicRub: number | null;
		incomeSbpRub: number | null;
		advanceOffsetRub?: number | null | undefined;
		insuranceTotalRub?: number | null | undefined;
		returnTotalRub?: number | null | undefined;
		netRevenueRub?: number | null | undefined;
		differenceRub: number;
		isBalanced: boolean;
		discrepancyType?: "balanced" | "excess" | "shortage" | undefined;
		fiscalDocNumber?: string | null | undefined;
		fiscalSign?: string | null | undefined;
		qrString?: string | null | undefined;
	} | undefined;
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

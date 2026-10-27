/**
 * reconciliationTypes.ts — Reconciliation result & voucher contracts.
 * Mandate 8b: <= 120 lines.
 */
import type { Kopecks } from "@dental/shared";
import type {
	CashDenominations,
	CashDiscrepancyReason,
	CashShiftTendersBreakdown,
	ClinicFiscalDetails,
} from "./types";

export interface CashShiftReconciliationResult {
	readonly shiftNumber: number;
	readonly openedAtIso: string;
	readonly closedAtIso: string;
	readonly cashierFullName: string;
	readonly cashierInn?: string | undefined;
	readonly initialChangeFundRub: number;
	readonly initialChangeFundKopecks: Kopecks;
	readonly totalCashInflowRub: number;
	readonly totalCashInflowKopecks: Kopecks;
	readonly totalCashOutflowRub: number;
	readonly totalCashOutflowKopecks: Kopecks;
	readonly calculatedCashInDrawerRub: number;
	readonly calculatedCashInDrawerKopecks: Kopecks;
	readonly countedCashInDrawerRub: number;
	readonly countedCashInDrawerKopecks: Kopecks;
	readonly differenceRub: number;
	readonly differenceKopecks: Kopecks;
	readonly status: "balanced" | "surplus" | "shortage";
	readonly discrepancyReason: CashDiscrepancyReason;
	readonly discrepancyReasonLabel: string;
	readonly cashierExplanation?: string | undefined;
	readonly isExplanationRequired: boolean;
	readonly retainedNextShiftChangeFundRub: number;
	readonly retainedNextShiftChangeFundKopecks: Kopecks;
	readonly encashmentAmountRub: number;
	readonly encashmentAmountKopecks: Kopecks;
	readonly tenders: CashShiftTendersBreakdown;
	readonly totalOperationsCount: number;
	readonly receiptsCount: number;
	readonly returnsCount: number;
	readonly isShiftDurationExceeded24h: boolean;
	readonly isShiftDurationWarning20h: boolean;
	readonly shiftDurationHours: number;
	readonly shiftDurationFormatted: string;
	readonly hoursRemainingUntil24h: number;
	readonly ftsWarningMessage?: string | undefined;
}

export interface Ko1CashInflowVoucher {
	readonly docNumber: string;
	readonly dateIso: string;
	readonly dateRu: string;
	readonly clinic: ClinicFiscalDetails;
	readonly receivedFrom: string;
	readonly basisRu: string;
	readonly amountRub: number;
	readonly amountWordsRu: string;
	readonly cashierFullName: string;
	readonly chiefAccountantFullName: string;
}

export interface Ko2CashOutflowVoucher {
	readonly docNumber: string;
	readonly dateIso: string;
	readonly dateRu: string;
	readonly clinic: ClinicFiscalDetails;
	readonly issuedTo: string;
	readonly basisRu: string;
	readonly amountRub: number;
	readonly amountWordsRu: string;
	readonly recipientPassportRu?: string | undefined;
	readonly cashierFullName: string;
	readonly chiefAccountantFullName: string;
	readonly chiefExecutiveFullName: string;
}

export interface EncashmentStatementData {
	readonly statementNumber: string;
	readonly dateIso: string;
	readonly dateRu: string;
	readonly shiftNumber: number;
	readonly clinic: ClinicFiscalDetails;
	readonly cashierFullName: string;
	readonly encashmentAmountRub: number;
	readonly encashmentAmountWordsRu: string;
	readonly denominations: CashDenominations;
	readonly bagNumber?: string | undefined;
	readonly sealNumber?: string | undefined;
	readonly destination: "main_cash_desk" | "bank_collector" | "clinic_safe";
	readonly destinationLabel: string;
}

export interface ShiftClosingActData {
	readonly actNumber: string;
	readonly dateRu: string;
	readonly reconciliation: CashShiftReconciliationResult;
	readonly clinic: ClinicFiscalDetails;
}

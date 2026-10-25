/**
 * types.ts — Shared Types for Cash Shift & Drawer Reconciliation Components.
 * Mandate 8b & 8e.
 */

import type React from "react";
import type { FiscalTapeWidth } from "../fiscal54fzEngine";

export interface CashShiftKpiCardsProps {
	readonly netRevenueRub: number;
	readonly cashInDrawerRub: number;
	readonly cardSumRub: number;
	readonly sbpSumRub: number;
	readonly advanceOffsetRub: number;
	readonly incomeTotalRub?: number | undefined;
	readonly incomeReturnTotalRub?: number | undefined;
}

export interface UseCashDrawerMatcherResult {
	countedCashInput: string;
	setCountedCashInput: React.Dispatch<React.SetStateAction<string>>;
	countedCash: number | null;
	differenceRub: number | null;
	handleMatchWithExpected: () => void;
}

export interface CashDrawerReconciliationPanelProps {
	readonly shiftNumber: number;
	readonly expectedCashRub: number;
	readonly countedCashInput: string;
	readonly onCountedCashChange: (value: string) => void;
	readonly differenceRub: number | null;
	readonly onMatchClick: () => void;
	readonly variant?: "standard" | "zreport" | undefined;
	readonly inputTestId?: string | undefined;
}

export interface FiscalReceiptTapeViewerProps {
	readonly receiptTapeText: string;
	readonly tapeWidth: FiscalTapeWidth;
	readonly onTapeWidthChange: (width: FiscalTapeWidth) => void;
	readonly onCopy: () => void;
	readonly onPrint: () => void;
	readonly isCopied: boolean;
	readonly printButtonLabel?: string | undefined;
}

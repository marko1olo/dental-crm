/**
 * types.ts — Types for 1-Click Shift Close & Daily Z-Report Modal.
 * Mandate 8b & Mandate 8e.
 */

import type {
	Ffd12ShiftCloseZReportSummary,
	Ffd12ShiftReceiptRecord,
	FiscalTapeWidth,
} from "../fiscal54fzEngine";

export type ShiftCloseActiveTab = "reconciliation" | "drawer" | "tape";

export interface ShiftCloseZReportModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly shiftNumber?: number | undefined;
	readonly cashierFullName?: string | undefined;
	readonly cashierInn?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicKpp?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly kktRegNumber?: string | undefined;
	readonly kktSerialNumber?: string | undefined;
	readonly fnSerial?: string | undefined;
	readonly fiscalDocNumber?: string | undefined;
	readonly fiscalSign?: string | undefined;
	readonly ofdName?: string | undefined;
	readonly receipts?: readonly Ffd12ShiftReceiptRecord[] | undefined;
	readonly summary?: Ffd12ShiftCloseZReportSummary | undefined;
	readonly initialCashInDrawerRub?: number | undefined;
	readonly onConfirmCloseShift?: (report: Ffd12ShiftCloseZReportSummary) => Promise<void> | void;
	readonly initialTab?: ShiftCloseActiveTab | undefined;
}

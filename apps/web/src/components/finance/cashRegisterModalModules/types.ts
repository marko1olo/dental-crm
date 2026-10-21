import type { Ffd12ShiftCloseZReportSummary } from "../fiscal/fiscal54fzEngine.js";

export interface CashRegisterModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly isShiftOpen?: boolean | undefined;
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
	readonly cashInDrawerRub?: number | undefined;
	readonly cardSumRub?: number | undefined;
	readonly sbpSumRub?: number | undefined;
	readonly advanceOffsetRub?: number | undefined;
	readonly onOpenShift?: () => Promise<void> | void;
	readonly onCloseShift?: (
		zReportSummary: Ffd12ShiftCloseZReportSummary,
	) => Promise<void> | void;
	readonly onPrintXReport?: () => Promise<void> | void;
	readonly onOpenSplitPayment?: () => void;
	readonly initialTab?: "reconciliation" | "drawer" | "tape" | undefined;
}

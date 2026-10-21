import { useState } from "react";
import type { Ffd12ShiftCloseZReportSummary } from "../fiscal/fiscal54fzEngine.js";
import { useCashRegisterCloseShift } from "./useCashRegisterCloseShift.js";
import { useCashRegisterOpenShift } from "./useCashRegisterOpenShift.js";

export interface OpenCloseShiftParams {
	readonly shiftNumber?: number | undefined;
	readonly cashierFullName?: string | undefined;
	readonly cashInDrawerKopecks: number;
	readonly netRevenueKopecks: number;
	readonly reportSummary: Ffd12ShiftCloseZReportSummary;
	readonly onOpenShift?: (() => Promise<void> | void) | undefined;
	readonly onCloseShift?:
		| ((summary: Ffd12ShiftCloseZReportSummary) => Promise<void> | void)
		| undefined;
	readonly onCloseModal: () => void;
	readonly setLocalIsShiftOpen: (open: boolean) => void;
}

export function useCashRegisterOpenCloseShift(params: OpenCloseShiftParams) {
	const [isProcessing, setIsProcessing] = useState<boolean>(false);

	const { handleOpenShiftAction } = useCashRegisterOpenShift(
		params.shiftNumber ?? 1,
		params.cashierFullName ?? "Дежурный администратор",
		params.cashInDrawerKopecks,
		isProcessing,
		setIsProcessing,
		params.setLocalIsShiftOpen,
		params.onOpenShift,
	);

	const { handleCloseShiftAction } = useCashRegisterCloseShift(
		params.shiftNumber ?? 1,
		params.netRevenueKopecks,
		params.cashInDrawerKopecks,
		params.reportSummary,
		isProcessing,
		setIsProcessing,
		params.setLocalIsShiftOpen,
		params.onCloseModal,
		params.onCloseShift,
	);

	return {
		isProcessing,
		setIsProcessing,
		handleOpenShiftAction,
		handleCloseShiftAction,
	};
}

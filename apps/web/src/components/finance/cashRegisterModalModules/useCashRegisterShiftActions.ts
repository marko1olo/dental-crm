import {
	type OpenCloseShiftParams,
	useCashRegisterOpenCloseShift,
} from "./useCashRegisterOpenCloseShift.js";
import { useCashRegisterPrintReport } from "./useCashRegisterPrintReport.js";

export type ShiftActionsParams = OpenCloseShiftParams & {
	readonly onPrintXReport?: (() => Promise<void> | void) | undefined;
};

export function useCashRegisterShiftActions(params: ShiftActionsParams) {
	const {
		isProcessing,
		setIsProcessing,
		handleOpenShiftAction,
		handleCloseShiftAction,
	} = useCashRegisterOpenCloseShift(params);

	const { handlePrintXReportAction } = useCashRegisterPrintReport(
		isProcessing,
		setIsProcessing,
		params.onPrintXReport,
	);

	return {
		isProcessing,
		handleOpenShiftAction,
		handleCloseShiftAction,
		handlePrintXReportAction,
	};
}

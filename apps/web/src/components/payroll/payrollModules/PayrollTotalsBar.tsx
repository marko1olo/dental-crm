import React from "react";
import type { DoctorPayrollResult } from "../staffPayrollEngine";
import { PayrollStatCardsGrid } from "./PayrollStatCardsGrid";
import { PayrollStornoSection } from "./PayrollStornoSection";
import { PayrollActionButtonsBar } from "./PayrollActionButtonsBar";

export interface PayrollTotalsBarProps {
	readonly payrollResult: DoctorPayrollResult;
	readonly payoutModel: "percentage" | "chair_rental";
	readonly taxRegime: "employee" | "self_employed";
	readonly copyFeedback: string | null;
	readonly onSendToMessenger: (platform: "clipboard" | "whatsapp" | "telegram") => void;
	readonly onDownloadCsv: () => void;
	readonly onPrintPayslip: () => void;
	readonly onClose: () => void;
}

export const PayrollTotalsBar: React.FC<PayrollTotalsBarProps> = ({
	payrollResult,
	payoutModel,
	taxRegime,
	copyFeedback,
	onSendToMessenger,
	onDownloadCsv,
	onPrintPayslip,
	onClose,
}) => {
	return (
		<div className="flex flex-col gap-4">
			<PayrollStatCardsGrid
				payrollResult={payrollResult}
				payoutModel={payoutModel}
				taxRegime={taxRegime}
			/>

			<PayrollStornoSection stornoItems={payrollResult.stornoItems} />

			<PayrollActionButtonsBar
				payrollResult={payrollResult}
				copyFeedback={copyFeedback}
				onSendToMessenger={onSendToMessenger}
				onDownloadCsv={onDownloadCsv}
				onPrintPayslip={onPrintPayslip}
				onClose={onClose}
			/>
		</div>
	);
};

export default PayrollTotalsBar;

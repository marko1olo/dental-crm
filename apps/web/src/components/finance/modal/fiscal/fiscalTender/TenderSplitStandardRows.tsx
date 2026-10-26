import React from "react";
import { TenderSplitCardAndSbpRows } from "./TenderSplitCardAndSbpRows";
import { TenderSplitCashAndDepositRows } from "./TenderSplitCashAndDepositRows";

export interface TenderSplitStandardRowsProps {
	readonly totalSumRub: number;
	readonly patientDepositRub: number;
	readonly cashAmount: number;
	readonly setCashAmount: (v: number) => void;
	readonly receivedCashRub: number;
	readonly setReceivedCashRub: (v: number) => void;
	readonly cardAmount: number;
	readonly setCardAmount: (v: number | ((prev: number) => number)) => void;
	readonly sbpAmount: number;
	readonly setSbpAmount: (v: number) => void;
	readonly depositAmount: number;
	readonly setDepositAmount: (v: number) => void;
	readonly remainingRub: number;
	readonly handleFillRemaining: (t: "card" | "cash" | "sbp" | "certificate" | "insurance") => void;
}

export const TenderSplitStandardRows: React.FC<TenderSplitStandardRowsProps> = (props) => {
	return (
		<>
			<TenderSplitCardAndSbpRows
				totalSumRub={props.totalSumRub}
				cardAmount={props.cardAmount}
				setCardAmount={props.setCardAmount}
				sbpAmount={props.sbpAmount}
				setSbpAmount={props.setSbpAmount}
				remainingRub={props.remainingRub}
				handleFillRemaining={props.handleFillRemaining}
			/>

			<TenderSplitCashAndDepositRows
				totalSumRub={props.totalSumRub}
				patientDepositRub={props.patientDepositRub}
				cashAmount={props.cashAmount}
				setCashAmount={props.setCashAmount}
				receivedCashRub={props.receivedCashRub}
				setReceivedCashRub={props.setReceivedCashRub}
				depositAmount={props.depositAmount}
				setDepositAmount={props.setDepositAmount}
				remainingRub={props.remainingRub}
				handleFillRemaining={props.handleFillRemaining}
			/>
		</>
	);
};

import React from "react";
import { TenderSplitCertificateRow } from "./TenderSplitCertificateRow";
import { TenderSplitInsuranceRow } from "./TenderSplitInsuranceRow";
import { TenderSplitStandardRows } from "./TenderSplitStandardRows";

export interface TenderSplitPanelProps {
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
	readonly certificateAmount: number;
	readonly setCertificateAmount: (v: number) => void;
	readonly insuranceAmount?: number | undefined;
	readonly setInsuranceAmount?: ((v: number) => void) | undefined;
	readonly guaranteeLetterNumber?: string | undefined;
	readonly setGuaranteeLetterNumber?: ((v: string) => void) | undefined;
	readonly remainingRub: number;
	readonly handleFillRemaining: (t: "card" | "cash" | "sbp" | "certificate" | "insurance") => void;
}

export const TenderSplitPanel: React.FC<TenderSplitPanelProps> = ({
	totalSumRub,
	patientDepositRub,
	cashAmount,
	setCashAmount,
	receivedCashRub,
	setReceivedCashRub,
	cardAmount,
	setCardAmount,
	sbpAmount,
	setSbpAmount,
	depositAmount,
	setDepositAmount,
	certificateAmount,
	setCertificateAmount,
	insuranceAmount,
	setInsuranceAmount,
	guaranteeLetterNumber,
	setGuaranteeLetterNumber,
	remainingRub,
	handleFillRemaining,
}) => {
	return (
		<div className="space-y-2.5" data-testid="panel-split-focused">
			<TenderSplitStandardRows
				totalSumRub={totalSumRub}
				patientDepositRub={patientDepositRub}
				cashAmount={cashAmount}
				setCashAmount={setCashAmount}
				receivedCashRub={receivedCashRub}
				setReceivedCashRub={setReceivedCashRub}
				cardAmount={cardAmount}
				setCardAmount={setCardAmount}
				sbpAmount={sbpAmount}
				setSbpAmount={setSbpAmount}
				depositAmount={depositAmount}
				setDepositAmount={setDepositAmount}
				remainingRub={remainingRub}
				handleFillRemaining={handleFillRemaining}
			/>

			<TenderSplitCertificateRow
				totalSumRub={totalSumRub}
				certificateAmount={certificateAmount}
				setCertificateAmount={setCertificateAmount}
				remainingRub={remainingRub}
				handleFillRemaining={handleFillRemaining}
			/>

			<TenderSplitInsuranceRow
				totalSumRub={totalSumRub}
				insuranceAmount={insuranceAmount}
				setInsuranceAmount={setInsuranceAmount}
				guaranteeLetterNumber={guaranteeLetterNumber}
				setGuaranteeLetterNumber={setGuaranteeLetterNumber}
				setCardAmount={setCardAmount as (setter: (prev: number) => number) => void}
				remainingRub={remainingRub}
				handleFillRemaining={handleFillRemaining}
			/>
		</div>
	);
};

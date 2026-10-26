import React from "react";
import type { TenderMethodListProps } from "./types";
import { TenderCashPanel } from "./TenderCashPanel";
import { TenderCardPanel } from "./TenderCardPanel";
import { TenderSbpPanel } from "./TenderSbpPanel";
import { TenderDepositPanel } from "./TenderDepositPanel";
import { TenderSplitPanel } from "./TenderSplitPanel";

export const TenderMethodList: React.FC<TenderMethodListProps> = ({
	paymentMode,
	totalSumRub,
	patientDepositRub,
	handleManualCardTerminalConfirm,
	isSubmittingManualCard,
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
	insuranceAmount = 0,
	setInsuranceAmount,
	guaranteeLetterNumber = "",
	setGuaranteeLetterNumber,
	remainingRub,
	handleFillRemaining,
	setPaymentMode,
}) => {
	return (
		<div className="space-y-3 pt-1">
			{paymentMode === "cash" && (
				<TenderCashPanel
					cashAmount={cashAmount}
					receivedCashRub={receivedCashRub}
					setReceivedCashRub={setReceivedCashRub}
				/>
			)}

			{paymentMode === "card" && (
				<TenderCardPanel
					cardAmount={cardAmount}
					handleManualCardTerminalConfirm={handleManualCardTerminalConfirm}
					isSubmittingManualCard={isSubmittingManualCard}
				/>
			)}

			{paymentMode === "sbp" && (
				<TenderSbpPanel sbpAmount={sbpAmount} />
			)}

			{paymentMode === "deposit" && (
				<TenderDepositPanel
					depositAmount={depositAmount}
					totalSumRub={totalSumRub}
					patientDepositRub={patientDepositRub}
					setCardAmount={setCardAmount}
					setCashAmount={setCashAmount}
					setPaymentMode={setPaymentMode}
				/>
			)}

			{paymentMode === "split" && (
				<TenderSplitPanel
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
					certificateAmount={certificateAmount}
					setCertificateAmount={setCertificateAmount}
					insuranceAmount={insuranceAmount}
					setInsuranceAmount={setInsuranceAmount}
					guaranteeLetterNumber={guaranteeLetterNumber}
					setGuaranteeLetterNumber={setGuaranteeLetterNumber}
					remainingRub={remainingRub}
					handleFillRemaining={handleFillRemaining}
				/>
			)}
		</div>
	);
};

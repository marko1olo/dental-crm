import React from "react";
import type { FiscalPaymentTenderSectionProps } from "./fiscalTender";
import {
	TenderMethodList,
	TenderModeSelector,
	TenderQuickPresets,
	TenderSummaryBadge,
} from "./fiscalTender";

export type { FiscalPaymentTenderSectionProps };

export const FiscalPaymentTenderSection: React.FC<FiscalPaymentTenderSectionProps> = ({
	paymentMode,
	setPaymentMode,
	selectSingleMethod,
	applyCombinedPaymentPreset,
	totalSumRub,
	patientDepositRub,
	selectedDiscountPreset,
	setSelectedDiscountPreset,
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
	allocation,
	handleFillRemaining,
	handleAutoDistributeRemaining,
	handleAutoBalanceOverallocation,
}) => {
	return (
		<>
			<TenderModeSelector
				paymentMode={paymentMode}
				setPaymentMode={setPaymentMode}
				selectSingleMethod={selectSingleMethod}
				totalSumRub={totalSumRub}
			/>

			<TenderQuickPresets
				setPaymentMode={setPaymentMode}
				selectSingleMethod={selectSingleMethod}
				applyCombinedPaymentPreset={applyCombinedPaymentPreset}
				totalSumRub={totalSumRub}
				patientDepositRub={patientDepositRub}
				selectedDiscountPreset={selectedDiscountPreset}
				setSelectedDiscountPreset={setSelectedDiscountPreset}
				handleManualCardTerminalConfirm={handleManualCardTerminalConfirm}
				isSubmittingManualCard={isSubmittingManualCard}
				setCardAmount={setCardAmount}
				setCashAmount={setCashAmount}
				setSbpAmount={setSbpAmount}
				setDepositAmount={setDepositAmount}
				setCertificateAmount={setCertificateAmount}
				insuranceAmount={insuranceAmount}
				setInsuranceAmount={setInsuranceAmount}
			/>

			<TenderMethodList
				paymentMode={paymentMode}
				setPaymentMode={setPaymentMode}
				totalSumRub={totalSumRub}
				patientDepositRub={patientDepositRub}
				handleManualCardTerminalConfirm={handleManualCardTerminalConfirm}
				isSubmittingManualCard={isSubmittingManualCard}
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

			<TenderSummaryBadge
				allocation={allocation}
				remainingRub={remainingRub}
				totalSumRub={totalSumRub}
				handleAutoDistributeRemaining={handleAutoDistributeRemaining}
				handleAutoBalanceOverallocation={handleAutoBalanceOverallocation}
			/>
		</>
	);
};

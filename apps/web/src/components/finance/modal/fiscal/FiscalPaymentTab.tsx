import React from "react";
import type { UseFiscalItemsAndDiscountsParams } from "./useFiscalItemsAndDiscounts";
import type { useFiscalItemsAndDiscounts } from "./useFiscalItemsAndDiscounts";
import type { useFiscalTenderAllocation } from "./useFiscalTenderAllocation";
import { FiscalPaymentDiscountsAndRetail } from "./FiscalPaymentDiscountsAndRetail";
import { FiscalPaymentTenderSection } from "./FiscalPaymentTenderSection";
import {
	FiscalPaymentBuyerSection,
	FiscalPaymentSummaryColumn,
} from "./FiscalPaymentBuyerSection";

export interface FiscalPaymentTabProps {
	readonly itemsHook: ReturnType<typeof useFiscalItemsAndDiscounts>;
	readonly tenderHook: ReturnType<typeof useFiscalTenderAllocation>;
	readonly handlePrintSalesSlip: () => Promise<void>;
	readonly handleManualCardTerminalConfirm: () => Promise<void>;
	readonly isSubmittingManualCard: boolean;
	readonly handleRetryFiscalizationWithoutBalanceImpact: () => Promise<void>;
	readonly isFiscalizing: boolean;
	readonly handleCopyActData: () => void;
	readonly handleCopyCertData: () => void;
	readonly patientDepositRub: number;
}

export const FiscalPaymentTab: React.FC<FiscalPaymentTabProps> = ({
	itemsHook,
	tenderHook,
	handlePrintSalesSlip,
	handleManualCardTerminalConfirm,
	isSubmittingManualCard,
	handleRetryFiscalizationWithoutBalanceImpact,
	isFiscalizing,
	handleCopyActData,
	handleCopyCertData,
	patientDepositRub,
}) => {
	const handleSelectStageWithReset = (stage: string) => {
		itemsHook.handleSelectStage(stage, (newTotalRub) => {
			tenderHook.setCardAmount(newTotalRub);
			tenderHook.setCashAmount(0);
			tenderHook.setSbpAmount(0);
			tenderHook.setDepositAmount(0);
			tenderHook.setCertificateAmount(0);
			tenderHook.setInsuranceAmount(0);
		});
	};

	return (
		<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
			{/* Left Column: Split Payment Builders */}
			<div className="lg:col-span-7 space-y-4">
				<FiscalPaymentDiscountsAndRetail
					isOverflowMenuOpen={tenderHook.isOverflowMenuOpen}
					setIsOverflowMenuOpen={tenderHook.setIsOverflowMenuOpen}
					handlePrintSalesSlip={handlePrintSalesSlip}
					handleManualCardTerminalConfirm={handleManualCardTerminalConfirm}
					isSubmittingManualCard={isSubmittingManualCard}
					handleRetryFiscalizationWithoutBalanceImpact={handleRetryFiscalizationWithoutBalanceImpact}
					isFiscalizing={isFiscalizing}
					showStomxSettings={tenderHook.showStomxSettings}
					setShowStomxSettings={tenderHook.setShowStomxSettings}
					handleCopyActData={handleCopyActData}
					handleCopyCertData={handleCopyCertData}
					selectedReceiptAlias={tenderHook.selectedReceiptAlias}
					setSelectedReceiptAlias={tenderHook.setSelectedReceiptAlias}
					selectedCashBoxType={tenderHook.selectedCashBoxType}
					setSelectedCashBoxType={tenderHook.setSelectedCashBoxType}
					setIsRetailModalOpen={itemsHook.setIsRetailModalOpen}
					handleAddRetailProduct={itemsHook.handleAddRetailProduct}
					additionalRetailItems={itemsHook.additionalRetailItems}
					handleRemoveRetailItem={itemsHook.handleRemoveRetailItem}
					availableStages={itemsHook.availableStages}
					selectedStageKind={itemsHook.selectedStageKind}
					handleSelectStage={handleSelectStageWithReset}
					activeItems={itemsHook.activeItems}
					items={itemsHook.items}
					fiscalData={itemsHook.fiscalData}
					mdlpCodes={itemsHook.mdlpCodes}
					handleUpdateMdlpCode={itemsHook.handleUpdateMdlpCode}
					selectedDiscountPreset={itemsHook.selectedDiscountPreset}
					setSelectedDiscountPreset={itemsHook.setSelectedDiscountPreset}
					customDiscountPercent={itemsHook.customDiscountPercent}
					setCustomDiscountPercent={itemsHook.setCustomDiscountPercent}
					setCustomDiscountRub={itemsHook.setCustomDiscountRub}
					totalSumRub={itemsHook.totalSumRub}
				/>

				<FiscalPaymentTenderSection
					paymentMode={tenderHook.paymentMode}
					setPaymentMode={tenderHook.setPaymentMode}
					selectSingleMethod={tenderHook.selectSingleMethod}
					applyCombinedPaymentPreset={tenderHook.applyCombinedPaymentPreset}
					totalSumRub={itemsHook.totalSumRub}
					patientDepositRub={patientDepositRub}
					selectedDiscountPreset={itemsHook.selectedDiscountPreset}
					setSelectedDiscountPreset={itemsHook.setSelectedDiscountPreset}
					handleManualCardTerminalConfirm={handleManualCardTerminalConfirm}
					isSubmittingManualCard={isSubmittingManualCard}
					cashAmount={tenderHook.cashAmount}
					setCashAmount={tenderHook.setCashAmount}
					receivedCashRub={tenderHook.receivedCashRub}
					setReceivedCashRub={tenderHook.setReceivedCashRub}
					cardAmount={tenderHook.cardAmount}
					setCardAmount={tenderHook.setCardAmount}
					sbpAmount={tenderHook.sbpAmount}
					setSbpAmount={tenderHook.setSbpAmount}
					depositAmount={tenderHook.depositAmount}
					setDepositAmount={tenderHook.setDepositAmount}
					certificateAmount={tenderHook.certificateAmount}
					setCertificateAmount={tenderHook.setCertificateAmount}
					setInsuranceAmount={tenderHook.setInsuranceAmount}
					remainingRub={tenderHook.remainingRub}
					allocation={tenderHook.allocation}
					handleFillRemaining={tenderHook.handleFillRemaining}
					handleAutoDistributeRemaining={tenderHook.handleAutoDistributeRemaining}
					handleAutoBalanceOverallocation={tenderHook.handleAutoBalanceOverallocation}
				/>

				<FiscalPaymentBuyerSection
					payerType={tenderHook.payerType}
					setPayerType={tenderHook.setPayerType}
					buyerLegalName={tenderHook.buyerLegalName}
					setBuyerLegalName={tenderHook.setBuyerLegalName}
					buyerInn={tenderHook.buyerInn}
					setBuyerInn={tenderHook.setBuyerInn}
					customerContact={tenderHook.customerContact}
					setCustomerContact={tenderHook.setCustomerContact}
					sbpAmount={tenderHook.sbpAmount}
					fiscalData={itemsHook.fiscalData}
					totalSumRub={itemsHook.totalSumRub}
					cashAmount={tenderHook.cashAmount}
					cardAmount={tenderHook.cardAmount}
					depositAmount={tenderHook.depositAmount}
					certificateAmount={tenderHook.certificateAmount}
					insuranceAmount={tenderHook.insuranceAmount}
				/>
			</div>

			{/* Right Column: SBP Dynamic QR Preview & Summary */}
			<FiscalPaymentSummaryColumn
				sbpAmount={tenderHook.sbpAmount}
				fiscalData={itemsHook.fiscalData}
				totalSumRub={itemsHook.totalSumRub}
				cashAmount={tenderHook.cashAmount}
				cardAmount={tenderHook.cardAmount}
				depositAmount={tenderHook.depositAmount}
				certificateAmount={tenderHook.certificateAmount}
				insuranceAmount={tenderHook.insuranceAmount}
			/>
		</div>
	);
};

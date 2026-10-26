import React, { useState } from "react";
import { Coins } from "lucide-react";
import type { FiscalPaymentDiscountsAndRetailProps } from "./FiscalPaymentDiscountsAndRetailTypes";
import { FiscalOperationsOverflowMenu } from "./discounts/FiscalOperationsOverflowMenu";
import { PaymentCashFlowBar } from "./discounts/PaymentCashFlowBar";
import { PaymentRetailShowcaseBar } from "./discounts/PaymentRetailShowcaseBar";
import { PaymentStageFilterChips } from "./discounts/PaymentStageFilterChips";
import { PaymentMdlpMarkingBlock } from "./discounts/PaymentMdlpMarkingBlock";
import { PaymentDoctorDiscountsBar } from "./discounts/PaymentDoctorDiscountsBar";

export type { FiscalPaymentDiscountsAndRetailProps } from "./FiscalPaymentDiscountsAndRetailTypes";

export const FiscalPaymentDiscountsAndRetail: React.FC<FiscalPaymentDiscountsAndRetailProps> = ({
	isOverflowMenuOpen,
	setIsOverflowMenuOpen,
	handlePrintSalesSlip,
	handleManualCardTerminalConfirm,
	isSubmittingManualCard,
	handleRetryFiscalizationWithoutBalanceImpact,
	isFiscalizing,
	showCashFlowSettings: propShowCashFlowSettings,
	setShowCashFlowSettings: propSetShowCashFlowSettings,
	handleCopyActData,
	handleCopyCertData,
	selectedReceiptAlias,
	setSelectedReceiptAlias,
	selectedCashBoxType,
	setSelectedCashBoxType,
	setIsRetailModalOpen,
	handleAddRetailProduct,
	additionalRetailItems,
	handleRemoveRetailItem,
	availableStages,
	selectedStageKind,
	handleSelectStage,
	activeItems,
	items,
	fiscalData,
	mdlpCodes,
	handleUpdateMdlpCode,
	selectedDiscountPreset,
	setSelectedDiscountPreset,
	customDiscountPercent,
	setCustomDiscountPercent,
	setCustomDiscountRub,
	totalSumRub,
}) => {
	const [localShowSettings, setLocalShowSettings] = useState(false);
	const showSettings = propShowCashFlowSettings ?? localShowSettings;
	const toggleSettings = () => {
		if (propSetShowCashFlowSettings) propSetShowCashFlowSettings((p) => !p);
		else setLocalShowSettings((p) => !p);
	};

	return (
		<>
			<div className="flex items-center justify-between gap-2 flex-wrap pb-1">
				<div className="text-xs text-[var(--muted,#64748b)] font-bold flex items-center gap-1.5">
					<Coins size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span>Кассовая операция</span>
				</div>
				<FiscalOperationsOverflowMenu
					isOverflowMenuOpen={isOverflowMenuOpen}
					setIsOverflowMenuOpen={setIsOverflowMenuOpen}
					handlePrintSalesSlip={handlePrintSalesSlip}
					handleManualCardTerminalConfirm={handleManualCardTerminalConfirm}
					isSubmittingManualCard={isSubmittingManualCard}
					handleRetryFiscalizationWithoutBalanceImpact={handleRetryFiscalizationWithoutBalanceImpact}
					isFiscalizing={isFiscalizing}
					showSettings={showSettings}
					toggleSettings={toggleSettings}
					handleCopyActData={handleCopyActData}
					handleCopyCertData={handleCopyCertData}
				/>
			</div>

			<PaymentCashFlowBar
				showSettings={showSettings}
				selectedReceiptAlias={selectedReceiptAlias}
				setSelectedReceiptAlias={setSelectedReceiptAlias}
				selectedCashBoxType={selectedCashBoxType}
				setSelectedCashBoxType={setSelectedCashBoxType}
			/>

			<PaymentRetailShowcaseBar
				setIsRetailModalOpen={setIsRetailModalOpen}
				handleAddRetailProduct={handleAddRetailProduct}
				additionalRetailItems={additionalRetailItems}
				handleRemoveRetailItem={handleRemoveRetailItem}
			/>

			<PaymentStageFilterChips
				availableStages={availableStages}
				selectedStageKind={selectedStageKind}
				handleSelectStage={handleSelectStage}
				activeItems={activeItems}
				items={items}
			/>

			<PaymentMdlpMarkingBlock
				fiscalData={fiscalData}
				mdlpCodes={mdlpCodes}
				handleUpdateMdlpCode={handleUpdateMdlpCode}
			/>

			<PaymentDoctorDiscountsBar
				selectedDiscountPreset={selectedDiscountPreset}
				setSelectedDiscountPreset={setSelectedDiscountPreset}
				customDiscountPercent={customDiscountPercent}
				setCustomDiscountPercent={setCustomDiscountPercent}
				setCustomDiscountRub={setCustomDiscountRub}
				totalSumRub={totalSumRub}
			/>
		</>
	);
};

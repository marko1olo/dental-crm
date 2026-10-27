import React, { useRef } from "react";
import { createPortal } from "react-dom";
import { type CanonicalTenderType } from "@dental/shared";
import { type CheckoutPaymentMethodType, toCanonicalCheckoutTender } from "../payments/checkout/fastCheckoutPresets.js";
import { type FiscalReceiptPayload, type TreatmentPlanStageOption } from "../payments/checkout/fastCheckoutEngine.js";
import { useModalA11y } from "../../hooks/useModalA11y.js";
import { FastCheckoutPaymentSplit } from "./FastCheckoutPaymentSplit.js";
import { FastCheckoutFamilyBalance } from "./FastCheckoutFamilyBalance.js";
import { FastCheckoutReceiptPreview } from "./FastCheckoutReceiptPreview.js";
import { FastCheckoutPresetsAndDiscounts } from "./FastCheckoutPresetsAndDiscounts.js";
import { useFastCheckoutLogic } from "./useFastCheckoutLogic.js";
import {
	FastCheckoutModalHeader,
	FastCheckoutGuidanceRibbon,
	FastCheckoutStageSelector,
	FastCheckoutStageAdvanceMode,
	FastCheckoutPayerTypePanel,
	FastCheckoutWarrantyAndMobileTotal,
} from "./fastCheckoutModalModules/index.js";

export { type CanonicalTenderType, toCanonicalCheckoutTender };
export * from "./FastCheckoutPaymentSplit.js";
export * from "./FastCheckoutFamilyBalance.js";
export * from "./FastCheckoutReceiptPreview.js";
export * from "./FastCheckoutPresetsAndDiscounts.js";
export * from "./fastCheckoutFiscalHandlers.js";
export * from "./useFastCheckoutLogic.js";

export interface FastCheckoutModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly totalBillKop?: number | undefined;
	readonly totalBillRub?: number | undefined;
	readonly amountKopecks?: number | undefined;
	readonly amountRub?: number | undefined;
	readonly initialPaymentMethod?: CheckoutPaymentMethodType | undefined;
	readonly defaultMethod?: string | undefined;
	readonly patientId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientEmail?: string | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly patientBonusPointsRub?: number | undefined;
	readonly patientLoyaltyPoints?: number | undefined;
	readonly familyPayerName?: string | undefined;
	readonly orderId?: string | undefined;
	readonly invoiceId?: string | undefined;
	readonly stages?: readonly TreatmentPlanStageOption[] | undefined;
	readonly cashierFullName?: string | undefined;
	readonly cashierName?: string | undefined;
	readonly attendingDoctorName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly initialSimpleCashierMode?: boolean | undefined;
	readonly initialDiscountPercent?: number | undefined;
	readonly initialDiscountReason?: string | undefined;
	readonly initialCustomDiscountRub?: number | undefined;
	readonly initialWarranty100?: boolean | undefined;
	readonly initialSplit5050?: boolean | undefined;
	readonly onPaymentComplete?: ((payload: FiscalReceiptPayload) => void) | undefined;
	readonly onSuccess?: ((payload: unknown) => void) | undefined;
	readonly containerTestId?: string | undefined;
	readonly title?: string | undefined;
}

export const FastCheckoutModal: React.FC<FastCheckoutModalProps> = (props) => {
	const { isOpen, onClose, patientName = "", patientPhone = "", patientEmail = "", patientDepositRub = 0, patientFamilyBalanceRub = 0, familyPayerName = "", orderId = "" } = props;
	const c = useFastCheckoutLogic(props);
	const primaryInputRef = useRef<HTMLInputElement | null>(null);

	const { modalRef, handleInputEnterKeyDown } = useModalA11y<HTMLDivElement>({
		isOpen, onClose, onSubmit: () => { if (!c.isPrinting) void c.handleExecutePayment(); }, autoFocusRef: primaryInputRef,
		initialFocusSelector: '[data-testid="simple-card-btn"], [data-testid="simple-cash-btn"], [data-testid="simple-sbp-btn"], [data-testid="simple-deposit-btn"], input, button',
	});

	if (!isOpen) return null;

	const modalContent = (
		<div ref={modalRef} className="fast-checkout-modal-overlay overflow-x-clip max-w-[100vw]" data-testid={props.containerTestId || (props.initialSimpleCashierMode === false ? "split-payment-modal" : "fast-checkout-modal")} tabIndex={-1}>
			<div className="fast-checkout-modal-container max-w-3xl overflow-x-clip">
				<FastCheckoutModalHeader patientName={patientName} orderId={orderId} effectiveBillKop={c.effectiveBillKop} onClose={onClose} />
				<div className="p-3 sm:p-4 pb-28 sm:pb-24 overflow-y-auto flex flex-col gap-4 flex-1 min-h-0">
					<FastCheckoutWarrantyAndMobileTotal
						isWarranty100={c.targetBillKop === 0 || c.discountPreset === "warranty_100"}
						effectiveBillKop={c.effectiveBillKop} patientName={patientName} orderId={orderId}
						discountRub={c.discountCalc.discountRub} onExecutePayment={() => void c.handleExecutePayment()}
					/>
					<FastCheckoutGuidanceRibbon isValid={c.validation.isValid} isSimpleCashierMode={c.isSimpleCashierMode} setIsSimpleCashierMode={c.setIsSimpleCashierMode} />
					<FastCheckoutPresetsAndDiscounts familyPayerName={familyPayerName} patientFamilyBalanceRub={patientFamilyBalanceRub} onQuickPreset={c.handleQuickPreset} discountPreset={c.discountPreset} onSetDiscountPreset={c.setDiscountPreset} customDiscountPercent={c.customDiscountPercent} onSetCustomDiscountPercent={c.setCustomDiscountPercent} discountCalc={c.discountCalc} />
					<FastCheckoutStageSelector stages={c.stages} selectedStageId={c.selectedStageId} onSelectStage={c.handleStageSelect} />
					<FastCheckoutStageAdvanceMode ffdTag1214NameRu={c.stageCalc.ffdTag1214NameRu} stagePaymentMode={c.stagePaymentMode} setStagePaymentMode={c.setStagePaymentMode} baseStageAmountKop={c.baseStageAmountKop} stageCalc={c.stageCalc} />
					<FastCheckoutPayerTypePanel clientType={c.clientType} setClientType={c.setClientType} buyerInn={c.buyerInn} setBuyerInn={c.setBuyerInn} buyerName={c.buyerName} setBuyerName={c.setBuyerName} onInputEnterKeyDown={handleInputEnterKeyDown} />
					<FastCheckoutPaymentSplit isSimpleCashierMode={c.isSimpleCashierMode} activeMethod={c.activeMethod} onSelectMethod={c.handleSingle100Percent} targetBillRub={c.targetBillRub} targetBillKop={c.targetBillKop} cardAmountRub={c.cardAmountRub} setCardAmountRub={c.setCardAmountRub} cashAmountRub={c.cashAmountRub} setCashAmountRub={c.setCashAmountRub} sbpAmountRub={c.sbpAmountRub} setSbpAmountRub={c.setSbpAmountRub} depositAmountRub={c.depositAmountRub} setDepositAmountRub={c.setDepositAmountRub} loyaltyAmountRub={c.loyaltyAmountRub} setLoyaltyAmountRub={c.setLoyaltyAmountRub} availableLoyaltyPointsRub={c.availableLoyaltyPointsRub} onApplyOneClickLoyaltyPoints={c.handleApplyOneClickLoyaltyPoints} cashTenderedRub={c.cashTenderedRub} setCashTenderedRub={c.setCashTenderedRub} remainingRub={c.remainingRub} remainingKop={c.remainingKop} cashChange={c.cashChange} patientDepositRub={patientDepositRub} patientFamilyBalanceRub={patientFamilyBalanceRub} familyPayerName={familyPayerName} sbpStatus={c.sbpStatus} isCheckingSbp={c.isCheckingSbp} sbpCheckMessage={c.sbpCheckMessage} sbpQrData={c.sbpQrData} effectiveSbpAmountRub={c.effectiveSbpAmountRub} onCheckSbpStatus={c.handleCheckSbpStatus} onConfirmSbpManual={c.handleConfirmSbpManual} onInputEnterKeyDown={handleInputEnterKeyDown} onAddRemainingToCard={c.handleAddRemainingToCard} onAddRemainingToCash={c.handleAddRemainingToCash} onAddRemainingToSbp={c.handleAddRemainingToSbp} onAddRemainingToDeposit={c.handleAddRemainingToDeposit} onAddRemainingDepositPlusCard={c.handleAddRemainingDepositPlusCard} onAddRemainingToLoyalty={c.handleAddRemainingToLoyalty} onAddRemainingToFamily={c.handleAddRemainingToFamily} onAddRemaining5050={c.handleAddRemaining5050} onSwitchToSplitMode={() => c.setIsSimpleCashierMode(false)} />
					<FastCheckoutFamilyBalance patientDepositRub={patientDepositRub} patientFamilyBalanceRub={patientFamilyBalanceRub} familyPayerName={familyPayerName} isTier2Open={c.isTier2Open} onToggleTier2={() => c.setIsTier2Open((prev) => !prev)} />
				</div>
				<FastCheckoutReceiptPreview kktHardwareStatus={c.kktHardwareStatus} interruptedPaymentState={c.interruptedPaymentState} setInterruptedPaymentState={c.setInterruptedPaymentState} isPrinting={c.isPrinting} isFlushingQueue={c.isFlushingQueue} isSubmittingManualCard={c.isSubmittingManualCard} pendingOfflineCount={c.pendingOfflineCount} validation={c.validation} activeMethod={c.activeMethod} targetBillKop={c.targetBillKop} targetBillRub={c.targetBillRub} patientPhone={patientPhone} patientEmail={patientEmail} isElectronicReceiptOnly={c.isElectronicReceiptOnly} setIsElectronicReceiptOnly={c.setIsElectronicReceiptOnly} onClose={onClose} onExecutePayment={c.handleExecutePayment} onAcceptPaymentOfflineFallback={c.handleAcceptPaymentOfflineFallback} onManualCardTerminalConfirm={c.handleManualCardTerminalConfirm} onRetryFiscalizationDirect={c.handleRetryFiscalizationDirect} onFlushQueue={c.handleFlushQueue} onFixValidationError={() => c.handleSingle100Percent(c.activeMethod || "bank_card")} />
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

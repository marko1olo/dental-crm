import React, { useRef } from "react";
import { createPortal } from "react-dom";
import { ShieldCheck } from "lucide-react";
import { type CanonicalTenderType } from "@dental/shared";
import { type CheckoutPaymentMethodType, toCanonicalCheckoutTender } from "../payments/checkout/fastCheckoutPresets.js";
import { type Ffd12FiscalPayload, type TreatmentPlanStageOption } from "../payments/checkout/fastCheckoutEngine.js";
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
	readonly onPaymentComplete?: ((payload: Ffd12FiscalPayload) => void) | undefined;
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
					{(c.targetBillKop === 0 || c.discountPreset === "warranty_100") && (
						<div
							className="p-3.5 rounded-2xl bg-blue-500/15 border-2 border-blue-500/40 flex items-center justify-between gap-3 flex-wrap"
							data-testid="banner-payment-zero-warranty"
						>
							<div className="flex items-center gap-2.5 text-blue-900 dark:text-blue-100">
								<ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
								<div>
									<h4 className="font-extrabold text-sm m-0">
										Гарантийный прием / 100% скидка (к оплате 0 ₽)
									</h4>
									<p className="text-xs text-blue-700 dark:text-blue-300 m-0">
										Стоимость услуг полностью покрыта гарантией клиники. Кассовый чек не требуется.
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => void c.handleExecutePayment()}
								data-testid="btn-payment-close-warranty-zero"
								className="min-h-[44px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm cursor-pointer shadow-sm active:scale-95 transition-all"
							>
								Закрыть визит (0 ₽)
							</button>
						</div>
					)}
					<div className="sm:hidden p-3.5 rounded-2xl bg-gradient-to-b from-teal-500/15 to-teal-500/5 border border-teal-500/30 text-center shadow-xs space-y-1">
						<span className="text-[11px] font-black uppercase tracking-wider text-teal-800 dark:text-teal-300 block">Итого к оплате</span>
						<div className="text-[36px] font-black font-mono tracking-tight text-[var(--ink,#0f172a)] leading-tight">{(c.effectiveBillKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</div>
						<div className="text-xs text-[var(--muted,#64748b)] truncate flex items-center justify-center gap-1.5 pt-0.5">
							<span className="font-semibold text-[var(--ink,#0f172a)] truncate">{patientName || "Пациент"}</span>
							{orderId && <span>• Заказ #{orderId}</span>}
							{c.discountCalc.discountRub > 0 && <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-200">Скидка -{c.discountCalc.discountRub.toLocaleString("ru-RU")} ₽</span>}
						</div>
					</div>
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

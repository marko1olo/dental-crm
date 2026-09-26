/**
 * apps/web/src/components/finance/PaymentModal.tsx
 *
 * DENTE Dental CRM — Universal Payment & Sberbank POS Terminal Modal.
 * Supports Cash, Sberbank POS Terminal, SberPay QR, FacePay Biometry, Family Wallet, and Split Payments.
 * Fully decomposed into modular subcomponents (<800 lines ceiling).
 */

import React from "react";
import { createPortal } from "react-dom";
import { CheckCircle, Sparkles } from "lucide-react";
import { showToast } from "../GlobalToast.js";
import { calculatePaymentDiscount, type PaymentDiscountCalculation } from "./cashboxOperations.js";
import {
	type PaymentMethodTab,
	type PaymentModalProps,
} from "./modal/payment/paymentModalTypes.js";
import {
	generateInvoicePrintHtml,
	generateActPrintHtml,
} from "./modal/payment/paymentModalPrintHtml.js";
import { usePaymentModalLogic } from "./modal/payment/usePaymentModalLogic.js";
import { PaymentModalHeader } from "./modal/payment/PaymentModalHeader.js";
import { PaymentTerminalView } from "./modal/payment/PaymentTerminalView.js";
import { PaymentSbpView } from "./modal/payment/PaymentSbpView.js";
import { PaymentCashView } from "./modal/payment/PaymentCashView.js";
import { PaymentSplitView } from "./modal/payment/PaymentSplitView.js";
import { PaymentFamilyDepositView } from "./modal/payment/PaymentFamilyDepositView.js";
import { PaymentPresetsAndDiscountsBar } from "./modal/payment/PaymentPresetsAndDiscountsBar.js";
import { PaymentBuyerAndStomxBar } from "./modal/payment/PaymentBuyerAndStomxBar.js";
import { PaymentModalFooter } from "./modal/payment/PaymentModalFooter.js";

export {
	calculatePaymentDiscount,
	type PaymentDiscountCalculation,
	type PaymentMethodTab,
	type PaymentModalProps,
	generateInvoicePrintHtml,
	generateActPrintHtml,
};

export const PaymentModal: React.FC<PaymentModalProps> = (props) => {
	const {
		isOpen,
		patientId = "pat-walkin",
		patientName = "Пациент",
		patientPhone = "",
		amountKopecks,
		amountRub: propAmountRub,
		invoiceId,
		visitId,
		documentId,
		patientDepositRub = 0,
		patientFamilyBalanceRub = 0,
		patientDebtRub = 0,
		onClose,
		onSuccess = () => {},
	} = props;

	const {
		rawTotalDueRub,
		effectiveCashier,
		discountsHook,
		tendersHook,
		execHook,
	} = usePaymentModalLogic(props);

	if (!isOpen) return null;

	const effectiveAmountKopecks =
		amountKopecks !== undefined
			? amountKopecks
			: Math.round((propAmountRub || 0) * 100);
	const amountRub = (effectiveAmountKopecks / 100).toFixed(2);

	const modalContent = (
		<div
			className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 payment-modal-backdrop"
			role="dialog"
			aria-modal="true"
			aria-labelledby="payment-modal-title"
		>
			<div className="payment-modal w-full max-w-xl sm:max-w-2xl md:max-w-3xl rounded-2xl bg-[var(--paper-strong,#ffffff)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] min-h-0">
				<PaymentModalHeader
					totalDueRub={discountsHook.totalDueRub}
					rawTotalDueRub={rawTotalDueRub}
					discountRub={discountsHook.discountRub}
					patientName={patientName}
					effectiveCashier={effectiveCashier}
					patientPhone={patientPhone}
					activeMethod={tendersHook.activeMethod}
					setActiveMethod={tendersHook.setActiveMethod}
					patientDebtRub={patientDebtRub}
					patientDepositRub={patientDepositRub}
					isMoreMenuOpen={execHook.isMoreMenuOpen}
					setIsMoreMenuOpen={execHook.setIsMoreMenuOpen}
					handleQuickPrintInvoice={discountsHook.handleQuickPrintInvoice}
					handleQuickPrintAct={discountsHook.handleQuickPrintAct}
					onClose={onClose}
					interruptedPaymentState={execHook.interruptedPaymentState}
					setInterruptedPaymentState={execHook.setInterruptedPaymentState}
					handleManualCardTerminalConfirm={execHook.handleManualCardTerminalConfirm}
					isSubmittingManualCard={execHook.isSubmittingManualCard}
					handleRetryFiscalization={execHook.handleRetryFiscalization}
					isRetryingFiscalization={execHook.isRetryingFiscalization}
					fiscalizationRetryPending={execHook.fiscalizationRetryPending}
				/>

				{/* Modal Body */}
				<div className="p-4 overflow-y-auto flex-1 min-h-0 space-y-4">
					{/* 100% Warranty / Zero Rub Banner */}
					{discountsHook.totalDueRub === 0 && (
						<div
							className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 flex items-center justify-between gap-3 flex-wrap"
							data-testid="banner-payment-zero-warranty"
						>
							<div className="flex items-center gap-2">
								<CheckCircle size={18} className="text-emerald-600" />
								<span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
									Гарантийный прием / 100% скидка (к оплате 0 ₽)
								</span>
							</div>
							<button
								type="button"
								onClick={() => {
									showToast("Гарантийный прием оформлен (скидка 100%, 0 ₽). Визит закрыт!", "success");
									onSuccess({
										method: "warranty_discount_100",
										amountKopecks: 0,
										discountRub: discountsHook.discountCalc.discountRub,
										discountPercent: discountsHook.discountCalc.discountPercent,
										rawTotalRub: rawTotalDueRub,
										discountReason: discountsHook.discountReason || "Гарантийная переделка / скидка 100%",
									});
									onClose();
								}}
								className="min-h-[44px] sm:min-h-[36px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95"
								data-testid="btn-payment-close-warranty-zero"
							>
								<Sparkles size={14} />
								<span>Закрыть визит в 1 клик (0 ₽)</span>
							</button>
						</div>
					)}

					{/* Method Specific Active View */}
					{tendersHook.activeMethod === "card_terminal" ||
					tendersHook.activeMethod === "sberpay_qr" ||
					tendersHook.activeMethod === "biometry" ? (
						<PaymentTerminalView
							patientId={patientId}
							patientName={patientName}
							totalDueKopecks={discountsHook.discountCalc.totalDueKopecks}
							invoiceId={invoiceId}
							visitId={visitId}
							documentId={documentId}
							handleSberSuccess={execHook.handleSberSuccess}
							setActiveMethod={tendersHook.setActiveMethod}
							handleManualCardTerminalConfirm={execHook.handleManualCardTerminalConfirm}
							isSubmittingManualCard={execHook.isSubmittingManualCard}
						/>
					) : tendersHook.activeMethod === "sbp_qr" ? (
						<PaymentSbpView
							sbpStatus={tendersHook.sbpStatus}
							totalDueRub={discountsHook.totalDueRub}
							sbpQrData={tendersHook.sbpQrData}
							sbpCheckMessage={tendersHook.sbpCheckMessage}
							handleCheckSbpStatus={execHook.handleCheckSbpStatus}
							isCheckingSbp={tendersHook.isCheckingSbp}
							handleConfirmSbpManual={execHook.handleConfirmSbpManual}
						/>
					) : tendersHook.activeMethod === "cash" ? (
						<PaymentCashView
							totalDueRub={discountsHook.totalDueRub}
							receivedCashRub={tendersHook.receivedCashRub}
							setReceivedCashRub={tendersHook.setReceivedCashRub}
							cashChange={tendersHook.cashChange}
							handleCashSubmit={execHook.handleCashSubmit}
							isSubmittingCash={execHook.isSubmittingCash}
						/>
					) : tendersHook.activeMethod === "split" ? (
						<PaymentSplitView
							totalDueRub={discountsHook.totalDueRub}
							splitCardRub={tendersHook.splitCardRub}
							setSplitCardRub={tendersHook.setSplitCardRub}
							splitCashRub={tendersHook.splitCashRub}
							setSplitCashRub={tendersHook.setSplitCashRub}
							splitSbpRub={tendersHook.splitSbpRub}
							setSplitSbpRub={tendersHook.setSplitSbpRub}
							splitDepositRub={tendersHook.splitDepositRub}
							setSplitDepositRub={tendersHook.setSplitDepositRub}
							splitCertificateRub={tendersHook.splitCertificateRub}
							setSplitCertificateRub={tendersHook.setSplitCertificateRub}
							splitBonusRub={tendersHook.splitBonusRub}
							setSplitBonusRub={tendersHook.setSplitBonusRub}
							patientDepositRub={patientDepositRub}
							patientFamilyBalanceRub={patientFamilyBalanceRub}
							applySplitRemainder={tendersHook.applySplitRemainder}
							totalAllocatedRub={tendersHook.totalAllocatedRub}
							isBalanced={tendersHook.isBalanced}
							sbpStatus={tendersHook.sbpStatus}
							sbpQrData={tendersHook.sbpQrData}
							sbpCheckMessage={tendersHook.sbpCheckMessage}
							handleCheckSbpStatus={execHook.handleCheckSbpStatus}
							handleConfirmSbpManual={execHook.handleConfirmSbpManual}
							isCheckingSbp={tendersHook.isCheckingSbp}
						/>
					) : tendersHook.activeMethod === "family_deposit" ? (
						<PaymentFamilyDepositView
							patientDepositRub={patientDepositRub}
							patientFamilyBalanceRub={patientFamilyBalanceRub}
							totalDueRub={discountsHook.totalDueRub}
							amountRub={amountRub}
							isSubmittingDeposit={execHook.isSubmittingDeposit}
							handleDepositOrPartialCombo={execHook.handleDepositOrPartialCombo}
							setSplitDepositRub={tendersHook.setSplitDepositRub}
							setSplitCardRub={tendersHook.setSplitCardRub}
							setSplitCashRub={tendersHook.setSplitCashRub}
							setSplitSbpRub={tendersHook.setSplitSbpRub}
							setActiveMethod={tendersHook.setActiveMethod}
						/>
					) : null}

					{/* Presets and Discounts Bar */}
					<PaymentPresetsAndDiscountsBar
						discountRub={discountsHook.discountRub}
						effectiveDiscountPercent={discountsHook.effectiveDiscountPercent}
						discountReason={discountsHook.discountReason}
						discountPercent={discountsHook.discountPercent}
						handleCustomPercentChange={discountsHook.handleCustomPercentChange}
						applyDiscountPreset={discountsHook.applyDiscountPreset}
						applyWarranty100Preset={discountsHook.applyWarranty100Preset}
						isWarranty100={discountsHook.isWarranty100}
						applyExactCashPreset={tendersHook.applyExactCashPreset}
						applySpendAllDepositBonusPreset={tendersHook.applySpendAllDepositBonusPreset}
						apply5050CashCardPreset={tendersHook.apply5050CashCardPreset}
						applyThreeWayCashCardAdvancePreset={tendersHook.applyThreeWayCashCardAdvancePreset}
						applyFullCardPreset={tendersHook.applyFullCardPreset}
						applyDepositPlusCardPreset={tendersHook.applyDepositPlusCardPreset}
						setActiveMethod={tendersHook.setActiveMethod}
						activeMethod={tendersHook.activeMethod}
						cashChange={tendersHook.cashChange}
						totalDueRub={discountsHook.totalDueRub}
						splitDepositRub={tendersHook.splitDepositRub}
						splitBonusRub={tendersHook.splitBonusRub}
						splitCashRub={tendersHook.splitCashRub}
						splitCardRub={tendersHook.splitCardRub}
						patientDepositRub={patientDepositRub}
					/>

					{/* StomX 6 Cash Boxes & DDS Receipt Category & 54-FZ Buyer */}
					<PaymentBuyerAndStomxBar
						selectedCashBoxType={tendersHook.selectedCashBoxType}
						setSelectedCashBoxType={tendersHook.setSelectedCashBoxType}
						selectedReceiptAlias={tendersHook.selectedReceiptAlias}
						setSelectedReceiptAlias={tendersHook.setSelectedReceiptAlias}
						payerType={tendersHook.payerType}
						setPayerType={tendersHook.setPayerType}
						buyerInn={tendersHook.buyerInn}
						buyerInnError={tendersHook.buyerInnError}
						setBuyerInnError={tendersHook.setBuyerInnError}
						handleInnChange={tendersHook.handleInnChange}
					/>
				</div>

				{/* Fixed Sticky Footer */}
				<PaymentModalFooter
					totalDueRub={discountsHook.totalDueRub}
					discountRub={discountsHook.discountRub}
					onClose={onClose}
					activeMethod={tendersHook.activeMethod}
					handleCashSubmit={execHook.handleCashSubmit}
					isSubmittingCash={execHook.isSubmittingCash}
					receivedCashRub={tendersHook.receivedCashRub}
					handleSplitSubmit={execHook.handleSplitSubmit}
					isSubmittingSplit={execHook.isSubmittingSplit}
					isBalanced={tendersHook.isBalanced}
					handleDepositOrPartialCombo={execHook.handleDepositOrPartialCombo}
					isSubmittingDeposit={execHook.isSubmittingDeposit}
					patientDepositRub={patientDepositRub}
					patientFamilyBalanceRub={patientFamilyBalanceRub}
					handleManualCardTerminalConfirm={execHook.handleManualCardTerminalConfirm}
					isSubmittingManualCard={execHook.isSubmittingManualCard}
					handleConfirmSbpManual={execHook.handleConfirmSbpManual}
					isCheckingSbp={tendersHook.isCheckingSbp}
				/>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
};

export default PaymentModal;

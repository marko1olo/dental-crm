/**
 * apps/web/src/components/cashbox/checkout/CashRegisterCheckoutModal.tsx
 *
 * Canonical SSOT 1-Click Cashbox Checkout & Payment Modal.
 * Governed by:
 * - Mandate 8e: Doctor & Cashier Autonomy (0 disabled buttons, soft defaults).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (No forced citizen INN).
 * - Mandate 8am: Exactly ONE Primary CTA button in var(--teal) per visible context.
 * - Apple HIG: Native Mobile Bottom Sheet (rounded-t-[24px], Drag Handle 36x5px, Natural Thumb Zone).
 * - Integer Kopeck Math: Strict BigInt amountKopecks without floating-point errors.
 * - Sweet Spot target: 150-220 lines.
 */

import React, { useId } from "react";
import { createPortal } from "react-dom";
import { useCheckoutState } from "./useCheckoutState.js";
import { CheckoutHeader } from "./CheckoutHeader.js";
import { CheckoutTenderTiles } from "./CheckoutTenderTiles.js";
import { CheckoutSplitCalculator } from "./CheckoutSplitCalculator.js";
import { CheckoutFiscalOptions } from "./CheckoutFiscalOptions.js";
import { CheckoutFooter } from "./CheckoutFooter.js";
import type { CashRegisterCheckoutModalProps } from "./types.js";

export const CashRegisterCheckoutModal: React.FC<CashRegisterCheckoutModalProps> = (props) => {
	const modalTitleId = useId();
	const state = useCheckoutState(props);

	if (!props.isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-[10050] flex flex-col justify-end md:items-center md:justify-center bg-black/60 backdrop-blur-xs p-0 md:p-4 overflow-x-clip max-w-[100vw] animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby={modalTitleId}
			data-testid={props.containerTestId || "cash-register-checkout-modal"}
		>
			<div className="w-full max-w-full md:max-w-xl lg:max-w-2xl rounded-t-[24px] md:rounded-2xl bg-[var(--paper)] border-t md:border border-[var(--line)] text-[var(--ink)] shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] md:max-h-[90vh]">
				{/* 1. Apple HIG Header */}
				<CheckoutHeader
					titleId={modalTitleId}
					title={props.title || "Касса · Оплата приёма"}
					patientName={props.patientName || "Пациент"}
					doctorFullName={state.doctorFullName}
					onClose={props.onClose}
				/>

				{/* 2. Modal Scroll Body */}
				<div className="p-4 sm:p-5 overflow-y-auto space-y-4 max-w-full bg-[var(--paper)] flex-1">
					{/* 2a. Prominent Total, Doctor Discounts, Payer Selection & 5 Tender Tiles */}
					<CheckoutTenderTiles
						totalDue={state.totalDue}
						isWarranty={state.isWarranty}
						setIsWarranty={state.setIsWarranty}
						discountPercent={state.discountPercent}
						setDiscountPercent={state.setDiscountPercent}
						effectiveDepositLimit={state.effectiveDepositLimit}
						payerType={state.payerType}
						setPayerType={state.setPayerType}
						buyerInn={state.buyerInn}
						setBuyerInn={state.setBuyerInn}
						method={state.method}
						setMethod={state.setMethod}
						onSelectCash={() => state.setCashReceivedRub(state.totalDue)}
						onSelectSplit={() => {
							const half = Math.floor(state.totalDue / 2);
							state.setSplitCardRub(half);
							state.setSplitCashRub(state.totalDue - half);
						}}
						onOpenSplitPayment={props.onOpenSplitPayment}
					/>

					{/* 2b. Cash Change Drawer / SBP QR / Split Allocation */}
					<CheckoutSplitCalculator
						method={state.method}
						totalDue={state.totalDue}
						cashReceivedRub={state.cashReceivedRub}
						setCashReceivedRub={state.setCashReceivedRub}
						cashChangeResult={state.cashChangeResult}
						sbpQrSvg={state.sbpQrSvg}
						splitCardRub={state.splitCardRub}
						setSplitCardRub={state.setSplitCardRub}
						splitCashRub={state.splitCashRub}
						setSplitCashRub={state.setSplitCashRub}
						splitSbpRub={state.splitSbpRub}
						setSplitSbpRub={state.setSplitSbpRub}
						splitDepositRub={state.splitDepositRub}
						setSplitDepositRub={state.setSplitDepositRub}
						effectiveDepositLimit={state.effectiveDepositLimit}
						splitBalances={state.splitBalances}
						splitInputRef={state.splitInputRef}
					/>

					{/* 2c. 54-FZ Fiscal Options & Feedback Messages */}
					<CheckoutFiscalOptions
						fiscalize={state.fiscalize}
						setFiscalize={state.setFiscalize}
						printFormat={state.printFormat}
						setPrintFormat={state.setPrintFormat}
						receiptDelivery={state.receiptDelivery}
						setReceiptDelivery={state.setReceiptDelivery}
						customerContact={state.customerContact}
						setCustomerContact={state.setCustomerContact}
						errorMessage={state.errorMessage}
						receiptSuccess={state.receiptSuccess}
					/>
				</div>

				{/* 3. Floating Bottom Bar with Exactly ONE Primary CTA */}
				<CheckoutFooter
					cashierFullName={state.cashierFullName}
					totalDue={state.totalDue}
					isWarranty={state.isWarranty}
					isSubmitting={state.isSubmitting}
					submitButtonTestId={props.submitButtonTestId}
					onClose={props.onClose}
					onExecutePayment={state.handleExecutePayment}
				/>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export default CashRegisterCheckoutModal;

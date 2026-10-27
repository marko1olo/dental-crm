/**
 * apps/web/src/components/finance/PaymentModal.tsx
 * DENTE Dental CRM — Canonical SSOT 1-Click Payment & Thermal Receipt Modal.
 * Decomposed into ./paymentModalModules/ in strict compliance with Mandate 8b (<= 120 lines facade).
 */

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { calculatePaymentDiscount, type PaymentDiscountCalculation } from "./cashboxOperations.js";
import { generateActPrintHtml, generateInvoicePrintHtml } from "./modal/payment/paymentModalPrintHtml.js";
import type { PaymentMethodTab, PaymentModalProps } from "./modal/payment/paymentModalTypes.js";
import { usePaymentModalLogic } from "./modal/payment/usePaymentModalLogic.js";
import { PaymentFooterActions, PaymentHeader, PaymentModalBody } from "./paymentModalModules/index.js";
import "./paymentModalStudio.css";

export * from "./paymentModalModules/index.js";
export {
	calculatePaymentDiscount,
	generateActPrintHtml,
	generateInvoicePrintHtml,
	type PaymentDiscountCalculation,
	type PaymentMethodTab,
	type PaymentModalProps,
};

export const PaymentModal: React.FC<PaymentModalProps> = (props) => {
	const {
		isOpen,
		patientId = "pat-walkin",
		patientName = "Пациент",
		patientPhone = "",
		patientDepositRub = 0,
		patientFamilyBalanceRub = 0,
		patientDebtRub = 0,
		clinicLegalName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
		onClose,
		onSuccess = () => {},
	} = props;

	const [showReceiptSidePanel, setShowReceiptSidePanel] = useState<boolean>(true);
	const [mobileTab, setMobileTab] = useState<"checkout" | "receipt">("checkout");
	const { rawTotalDueRub, effectiveCashier, discountsHook, tendersHook, execHook } = usePaymentModalLogic(props);

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-[10050] flex flex-col justify-end md:items-center md:justify-center bg-black/60 p-0 md:p-3 payment-modal-backdrop animate-in fade-in duration-150"
			style={{ zIndex: 10050 }}
			role="dialog"
			aria-modal="true"
			aria-labelledby="payment-modal-title"
			data-testid={props.containerTestId || "payment-modal-studio"}
		>
			<div className="payment-modal w-full max-w-full md:max-w-4xl lg:max-w-5xl rounded-t-[24px] md:rounded-2xl bg-[var(--paper-strong,var(--paper,#ffffff))] border-t md:border border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] md:max-h-[94vh] min-h-0">
				<PaymentHeader
					title={props.title} patientName={patientName} patientPhone={patientPhone}
					effectiveCashier={effectiveCashier} rawTotalDueRub={rawTotalDueRub} discountsHook={discountsHook}
					showReceiptSidePanel={showReceiptSidePanel} setShowReceiptSidePanel={setShowReceiptSidePanel}
					mobileTab={mobileTab} setMobileTab={setMobileTab} onClose={onClose}
				/>
				<PaymentModalBody
					props={props} patientId={patientId} patientName={patientName} patientPhone={patientPhone}
					patientDepositRub={patientDepositRub} patientFamilyBalanceRub={patientFamilyBalanceRub}
					patientDebtRub={patientDebtRub} clinicLegalName={clinicLegalName} rawTotalDueRub={rawTotalDueRub}
					effectiveCashier={effectiveCashier} discountsHook={discountsHook} tendersHook={tendersHook}
					execHook={execHook} showReceiptSidePanel={showReceiptSidePanel} mobileTab={mobileTab}
					onClose={onClose} onSuccess={onSuccess}
				/>
				<PaymentFooterActions
					mobileTab={mobileTab} totalDueRub={discountsHook.totalDueRub} discountRub={discountsHook.discountRub}
					rawTotalDueRub={rawTotalDueRub} activeMethod={tendersHook.activeMethod}
					discountsHook={discountsHook} tendersHook={tendersHook} execHook={execHook}
					onClose={onClose} onSuccess={onSuccess}
				/>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export default PaymentModal;
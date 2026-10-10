/**
 * apps/web/src/components/billing/PaymentModal.tsx
 *
 * DENTE Dental CRM — Studio Clinical HIG 1-Click Payment & 54-FZ Thermal Receipt Modal (Facade).
 * Decomposed into ./paymentModalModules/ in strict compliance with Mandate 8b (<= 120 lines facade).
 */

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { calculatePaymentDiscount, type PaymentDiscountCalculation } from "../finance/cashboxOperations.js";
import { type PaymentMethodTab, type PaymentModalProps } from "../finance/modal/payment/paymentModalTypes.js";
import { generateInvoicePrintHtml, generateActPrintHtml } from "../finance/modal/payment/paymentModalPrintHtml.js";
import { usePaymentModalLogic } from "../finance/modal/payment/usePaymentModalLogic.js";
import {
	PaymentHeader,
	PaymentMethodSelector,
	PaymentBanners,
	PaymentDiscountsPresets,
	PaymentFiscalPreview,
	PaymentFooterActions,
	PaymentActiveMethodCockpit,
} from "./paymentModalModules/index.js";
import "./paymentModalStudio.css";

export {
	calculatePaymentDiscount,
	type PaymentDiscountCalculation,
	type PaymentMethodTab,
	type PaymentModalProps,
	generateInvoicePrintHtml,
	generateActPrintHtml,
};
export * from "./paymentModalModules/index.js";

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

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-[100] flex flex-col justify-end md:items-center md:justify-center bg-black/65 backdrop-blur-xs p-0 md:p-4 payment-modal-backdrop animate-in fade-in duration-150"
			style={{ zIndex: 100 }}
			role="dialog"
			aria-modal="true"
			aria-labelledby="payment-modal-title"
			data-testid="payment-modal-studio"
		>
			<div className="payment-modal w-full max-w-full md:max-w-4xl lg:max-w-5xl rounded-t-[24px] md:rounded-2xl bg-[var(--paper-strong,var(--paper,#ffffff))] border-t md:border border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] md:max-h-[92vh] min-h-0">
				<PaymentHeader
					patientName={patientName} patientPhone={patientPhone} effectiveCashier={effectiveCashier}
					rawTotalDueRub={rawTotalDueRub} discountsHook={discountsHook}
					showReceiptSidePanel={showReceiptSidePanel} setShowReceiptSidePanel={setShowReceiptSidePanel}
					mobileTab={mobileTab} setMobileTab={setMobileTab} onClose={onClose}
				/>
				<div className="flex-1 min-h-0 overflow-y-auto flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-[var(--line,#cbd5e1)]">
					<div className={`flex-1 min-h-0 p-3 sm:p-4 space-y-4 overflow-y-auto ${mobileTab === "receipt" ? "hidden md:block" : "block"}`}>
						<PaymentBanners
							totalDueRub={discountsHook.totalDueRub} rawTotalDueRub={rawTotalDueRub}
							patientDebtRub={patientDebtRub} patientDepositRub={patientDepositRub}
							discountsHook={discountsHook} execHook={execHook} tendersHook={tendersHook} onClose={onClose} onSuccess={onSuccess}
						/>
						<PaymentMethodSelector
							activeMethod={tendersHook.activeMethod} setActiveMethod={tendersHook.setActiveMethod}
							patientDepositRub={patientDepositRub} patientFamilyBalanceRub={patientFamilyBalanceRub}
						/>
						<PaymentActiveMethodCockpit
							props={props} patientId={patientId} patientName={patientName}
							patientDepositRub={patientDepositRub} patientFamilyBalanceRub={patientFamilyBalanceRub}
							discountsHook={discountsHook} tendersHook={tendersHook} execHook={execHook}
						/>
						<PaymentDiscountsPresets
							discountsHook={discountsHook} tendersHook={tendersHook} patientDepositRub={patientDepositRub}
						/>
					</div>
					<PaymentFiscalPreview
						clinicLegalName={clinicLegalName} totalDueRub={discountsHook.totalDueRub}
						patientName={patientName} patientPhone={patientPhone} effectiveCashier={effectiveCashier}
						isWarranty100={discountsHook.isWarranty100} tendersHook={tendersHook} discountsHook={discountsHook}
						showReceiptSidePanel={showReceiptSidePanel} mobileTab={mobileTab}
						items={props.items} toothNumber={props.toothNumber}
					/>
				</div>
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

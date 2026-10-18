/**
 * apps/web/src/components/billing/CashRegisterPaymentPane.tsx
 * DENTE Dental CRM — Cashier Instant Payment Pane with Frictionless SBP QR & Multi-Tender Split.
 * Decomposed into ./paymentPaneModules/ in strict compliance with Mandate 8b (<= 120 lines facade).
 * Mandates 8e, 8n, 8d (WCAG AAA contrast, zero emojis, clean 36px buttons).
 */

import React from "react";
import { SbpDynamicQrCard } from "./SbpDynamicQrCard.js";
import {
	type CashierPaymentMethod,
	type CashRegisterPaymentPaneProps,
	usePaymentPaneLogic,
	PaymentPaneInvoiceHeader,
	PaymentPaneAmountDisplay,
	PaymentPaneDoctorDiscounts,
	PaymentPaneMethodSwitcher,
	PaymentPaneCardTender,
	PaymentPaneCashTender,
	PaymentPaneDepositTender,
	PaymentPaneSplitTender,
} from "./paymentPaneModules/index.js";

export type { CashierPaymentMethod, CashRegisterPaymentPaneProps };

export const CashRegisterPaymentPane: React.FC<CashRegisterPaymentPaneProps> = (props) => {
	const logic = usePaymentPaneLogic(props);
	const { clinicLegalName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»", onOpenFullSplitModal, invoices, onSelectInvoice } = props;

	return (
		<div className="space-y-3.5" data-testid="cash-register-payment-pane">
			<PaymentPaneInvoiceHeader currentInvoice={logic.currentInvoice} invoices={invoices} onSelectInvoice={onSelectInvoice} />

			<PaymentPaneAmountDisplay
				amountRub={logic.amountRub} setAmountRub={logic.setAmountRub} setCashTenderedRub={logic.setCashTenderedRub}
				setSplitCashRub={logic.setSplitCashRub} setSplitSbpRub={logic.setSplitSbpRub} setSplitCardRub={logic.setSplitCardRub}
				setSplitDepositRub={logic.setSplitDepositRub} setActiveMethod={logic.setActiveMethod}
				isRoundedToHundreds={logic.isRoundedToHundreds} setIsRoundedToHundreds={logic.setIsRoundedToHundreds}
				isWarranty100={logic.isWarranty100}
			/>

			<PaymentPaneDoctorDiscounts
				baseAmountRub={logic.baseAmountRub} amountRub={logic.amountRub} setAmountRub={logic.setAmountRub}
				setCashTenderedRub={logic.setCashTenderedRub} activeDiscountPercent={logic.activeDiscountPercent}
				setActiveDiscountPercent={logic.setActiveDiscountPercent} isWarranty100={logic.isWarranty100}
				setIsWarranty100={logic.setIsWarranty100}
			/>

			<PaymentPaneMethodSwitcher activeMethod={logic.activeMethod} setActiveMethod={logic.setActiveMethod} />

			{logic.activeMethod === "sbp" && (
				<SbpDynamicQrCard
					sumRub={logic.amountRub} clinicLegalName={clinicLegalName} ttlSeconds={30}
					onPaymentSuccess={(res) => logic.finalizeReceipt("sbp", res.sumRub)}
				/>
			)}

			{logic.activeMethod === "card" && (
				<PaymentPaneCardTender
					amountRub={logic.amountRub} isSubmitting={logic.isSubmitting} finalizeReceipt={logic.finalizeReceipt}
				/>
			)}

			{logic.activeMethod === "cash" && (
				<PaymentPaneCashTender
					amountRub={logic.amountRub} cashTenderedRub={logic.cashTenderedRub} setCashTenderedRub={logic.setCashTenderedRub}
					cashChangeRub={logic.cashChangeRub} isCashShortage={logic.isCashShortage} isSubmitting={logic.isSubmitting}
					finalizeReceipt={logic.finalizeReceipt}
				/>
			)}

			{logic.activeMethod === "deposit" && (
				<PaymentPaneDepositTender
					amountRub={logic.amountRub} patientDepositRub={props.patientDepositRub ?? 0}
					patientFamilyBalanceRub={props.patientFamilyBalanceRub ?? 0} totalAvailableDepositRub={logic.totalAvailableDepositRub}
					isSubmitting={logic.isSubmitting} finalizeReceipt={logic.finalizeReceipt}
					setSplitDepositRub={logic.setSplitDepositRub} setSplitSbpRub={logic.setSplitSbpRub}
					setSplitCashRub={logic.setSplitCashRub} setSplitCardRub={logic.setSplitCardRub}
					setActiveMethod={logic.setActiveMethod}
				/>
			)}

			{logic.activeMethod === "split" && (
				<PaymentPaneSplitTender
					amountRub={logic.amountRub} splitRemainingRub={logic.splitRemainingRub}
					splitSbpRub={logic.splitSbpRub} setSplitSbpRub={logic.setSplitSbpRub}
					splitCashRub={logic.splitCashRub} setSplitCashRub={logic.setSplitCashRub}
					splitCardRub={logic.splitCardRub} setSplitCardRub={logic.setSplitCardRub}
					clinicLegalName={clinicLegalName} onOpenFullSplitModal={onOpenFullSplitModal}
					isSubmitting={logic.isSubmitting} finalizeReceipt={logic.finalizeReceipt}
				/>
			)}
		</div>
	);
};

export default CashRegisterPaymentPane;

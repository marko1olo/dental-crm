/**
 * GlobalPaymentModalLauncher.tsx
 * Canonical Bridge: Forwards legacy payment triggers to SSOT DirectCashboxLauncher (CashRegisterStudioModal).
 * Eliminates dual-modal overlap on #payment and enforces single cashbox SSOT (DEF-CASH-01).
 */

import React, { useEffect } from "react";
import type { PaymentMethodTab } from "../finance/PaymentModal.js";

export interface GlobalPaymentModalContext {
	patientId?: string | undefined;
	patientName?: string | undefined;
	patientPhone?: string | undefined;
	amountRub?: number | undefined;
	amount?: number | undefined;
	defaultMethod?: PaymentMethodTab | undefined;
	visitId?: string | undefined;
	doctorName?: string | undefined;
	clinicLegalName?: string | undefined;
	patientDepositRub?: number | undefined;
	patientFamilyBalanceRub?: number | undefined;
	items?: import("../finance/PaymentModal.js").PaymentModalProps["items"];
	invoiceId?: string | undefined;
}

const EVTS = [
	"dente:open-payment-modal",
	"dente-open-payment-modal",
] as const;

export const GlobalPaymentModalLauncher: React.FC<{
	readonly activeStaffUser?: {
		readonly name?: string;
		readonly fullName?: string;
	} | null;
}> = ({ activeStaffUser }) => {
	useEffect(() => {
		const onOpen = (e: Event) => {
			const d = (e as CustomEvent<GlobalPaymentModalContext>)?.detail;
			if (d) {
				const cashier = activeStaffUser?.name || activeStaffUser?.fullName || undefined;
				const amountRub = d.amountRub ?? d.amount;
				window.dispatchEvent(
					new CustomEvent("dente:open-cashbox", {
						detail: {
							mode: "checkout",
							patientId: d.patientId,
							patientName: d.patientName,
							patientPhone: d.patientPhone,
							amountRub: typeof amountRub === "number" ? amountRub : (amountRub ? parseFloat(String(amountRub)) : undefined),
							invoiceId: d.invoiceId,
							cashierFullName: cashier,
						},
					}),
				);
			}
		};
		for (const ev of EVTS) window.addEventListener(ev, onOpen);
		return () => {
			for (const ev of EVTS) window.removeEventListener(ev, onOpen);
		};
	}, [activeStaffUser]);

	// DEF-CASH-01: No separate modal rendering here to prevent double-modal collision on #payment.
	// All rendering is unified in DirectCashboxLauncher -> CashRegisterStudioModal.
	return null;
};

export default GlobalPaymentModalLauncher;

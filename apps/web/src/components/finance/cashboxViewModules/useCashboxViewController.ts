/**
 * apps/web/src/components/finance/cashboxViewModules/useCashboxViewController.ts
 * Layer 3: State, Custom Hook & Business Controller for CashboxView.
 * Decomposed under Mandate 8b (<=120 lines facade).
 */

import { kopecksToRub, rubToKopecks } from "@dental/shared";
import { useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import type { PaymentMethodTab } from "../PaymentModal.js";
import type { CashboxControllerReturn, CashboxViewProps, PendingInvoiceItem } from "./types.js";
import { useCashboxDiscountsAndTenders } from "./useCashboxDiscountsAndTenders.js";
import { useCashboxShiftAndBoxes } from "./useCashboxShiftAndBoxes.js";
import { useZeroDiscountCheckout } from "./useZeroDiscountCheckout.js";

export function useCashboxViewController(props: CashboxViewProps): CashboxControllerReturn {
	const { initialShiftOpen = true, cashierName = "Администратор / Врач", initialAmountRub = 0, patientId, patientDepositRub = 0, patientFamilyBalanceRub = 0, visitId, documentId, onPaymentComplete } = props;
	const shiftHook = useCashboxShiftAndBoxes(initialShiftOpen, cashierName);
	const tendersHook = useCashboxDiscountsAndTenders(initialAmountRub);

	const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
	const [isRetailModalOpen, setIsRetailModalOpen] = useState(false);
	const [activePaymentMethod, setActivePaymentMethod] = useState<PaymentMethodTab>("card_terminal");
	const [selectedInvoice, setSelectedInvoice] = useState<PendingInvoiceItem | null>(null);
	const [effectiveDepositRub, setEffectiveDepositRub] = useState(patientDepositRub);
	const [effectiveFamilyBalanceRub, setEffectiveFamilyBalanceRub] = useState(patientFamilyBalanceRub);

	useEffect(() => {
		if (patientDepositRub > 0) setEffectiveDepositRub(patientDepositRub);
		else if (patientId) {
			fetch(`/api/patients/${patientId}`, { headers: denteAdminSecretRequestHeaders() })
				.then((res) => (res.ok ? res.json() : null))
				.then((data) => {
					const p = data?.patient || data;
					if (p && typeof p.balanceRub === "number" && p.balanceRub > 0) setEffectiveDepositRub(p.balanceRub);
					else if (p && typeof p.depositRub === "number" && p.depositRub > 0) setEffectiveDepositRub(p.depositRub);
					if (p && typeof p.familyBalanceRub === "number" && p.familyBalanceRub > 0) setEffectiveFamilyBalanceRub(p.familyBalanceRub);
				})
				.catch(() => {});
		}
	}, [patientId, patientDepositRub]);

	const { isSubmittingZeroReceipt, handleProcessZeroDiscountCheckout } = useZeroDiscountCheckout(patientId, visitId, documentId, tendersHook, onPaymentComplete);

	const handleOpenPaymentWithMethod = (method: PaymentMethodTab) => {
		setActivePaymentMethod(method);
		setIsPaymentModalOpen(true);
	};

	const handleAddAmountPreset = (rub: number) => {
		tendersHook.setGrossAmountRub(kopecksToRub(rubToKopecks(tendersHook.grossAmountRub) + rubToKopecks(rub)));
	};

	const handlePayInvoice = (inv: PendingInvoiceItem) => {
		setSelectedInvoice(inv);
		tendersHook.setGrossAmountRub(inv.totalAmountRub);
		tendersHook.resetDiscount();
		setIsPaymentModalOpen(true);
	};

	const handleInvoicePaymentSuccess = (_receipt: unknown) => {
		setSelectedInvoice(null);
		window.dispatchEvent(new CustomEvent("dente-invoices-updated"));
		window.dispatchEvent(new CustomEvent("dente-cashbox-refresh"));
		void shiftHook.loadCashBoxes();
	};

	return {
		...shiftHook, ...tendersHook,
		isPaymentModalOpen, setIsPaymentModalOpen,
		isRetailModalOpen, setIsRetailModalOpen,
		activePaymentMethod, setActivePaymentMethod,
		isSubmittingZeroReceipt,
		effectiveDepositRub, effectiveFamilyBalanceRub,
		selectedInvoice, setSelectedInvoice,
		handlePayInvoice, handleInvoicePaymentSuccess,
		handleOpenPaymentWithMethod, handleProcessZeroDiscountCheckout, handleAddAmountPreset,
	};
}
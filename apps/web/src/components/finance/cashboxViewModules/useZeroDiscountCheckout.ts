import { createCompositeIdempotencyKey } from "@dental/shared";
import { useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import { showToast } from "../../GlobalToast.js";
import type { useCashboxDiscountsAndTenders } from "./useCashboxDiscountsAndTenders.js";

let zeroSeq = 0;

export function useZeroDiscountCheckout(
	patientId?: string,
	visitId?: string,
	documentId?: string,
	tendersHook?: ReturnType<typeof useCashboxDiscountsAndTenders>,
	onPaymentComplete?: (receipt: unknown) => void,
) {
	const [isSubmittingZeroReceipt, setIsSubmittingZeroReceipt] = useState(false);

	const handleProcessZeroDiscountCheckout = async () => {
		if (isSubmittingZeroReceipt) return;
		setIsSubmittingZeroReceipt(true);
		try {
			const idempotencyKey = createCompositeIdempotencyKey(`cashbox-0-receipt-${patientId || "walkin"}-${Date.now()}-${zeroSeq++}`);
			const notesReason = tendersHook?.isWarranty
				? "100% скидка: Гарантийная переделка"
				: tendersHook?.isStaffColleague
					? "100% скидка: Лечение коллеги / персонала"
					: `Скидка врача ${tendersHook?.discountPercent || 0}%`;
			const res = await fetch("/api/billing/payments", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }),
				body: JSON.stringify({ patientId: patientId || undefined, visitId: visitId || undefined, documentId: documentId || undefined, amountRub: 0, method: "cash", clientMutationId: idempotencyKey, notes: notesReason }),
			});
			if (res.ok) {
				const receiptData = await res.json();
				showToast("Чек 0 ₽ (100% скидка) успешно зафиксирован в системе", "success");
				onPaymentComplete?.(receiptData);
			} else {
				const err = await res.json().catch(() => ({}));
				showToast(err.message || "Ошибка проведения расчета 0 ₽", "error");
			}
		} catch {
			showToast("Ошибка сети при проведении 100% чека", "error");
		} finally {
			setIsSubmittingZeroReceipt(false);
		}
	};

	return { isSubmittingZeroReceipt, handleProcessZeroDiscountCheckout };
}
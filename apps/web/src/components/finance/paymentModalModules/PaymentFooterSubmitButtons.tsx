import type React from "react";
import { useEffect } from "react";
import { showToast } from "../../GlobalToast.js";
import { PaymentTenderButtonsGrid } from "./PaymentTenderButtonsGrid.js";
import type { PaymentFooterActionsProps } from "./types.js";

/**
 * Submit button container with Enter hotkey listener for solo-doctor & cashier.
 * Mandate 8b: <= 120 lines facade.
 */
export const PaymentFooterSubmitButtons: React.FC<PaymentFooterActionsProps> = (props) => {
	const { totalDueRub, rawTotalDueRub, activeMethod, discountsHook, execHook, onClose, onSuccess } = props;

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key !== "Enter" || e.defaultPrevented) return;
			const target = e.target as HTMLElement | null;
			if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
			if (totalDueRub === 0) {
				e.preventDefault();
				showToast("Гарантийный прием оформлен (скидка 100%, 0 ₽). Визит закрыт!", "success");
				onSuccess?.({
					method: "warranty_discount_100", amountKopecks: 0,
					discountRub: discountsHook.discountCalc.discountRub, discountPercent: discountsHook.discountCalc.discountPercent,
					rawTotalRub: rawTotalDueRub, discountReason: discountsHook.discountReason || "Гарантия 100%",
				});
				onClose();
			} else if (activeMethod === "cash" && !execHook.isSubmittingCash) {
				e.preventDefault();
				void execHook.handleCashSubmit();
			} else if (activeMethod === "card_terminal" && !execHook.isSubmittingManualCard) {
				e.preventDefault();
				void execHook.handleManualCardTerminalConfirm();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [totalDueRub, activeMethod, execHook, discountsHook, rawTotalDueRub, onClose, onSuccess]);

	return <PaymentTenderButtonsGrid {...props} />;
};
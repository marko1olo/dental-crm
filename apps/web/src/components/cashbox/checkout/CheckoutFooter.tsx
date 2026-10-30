/**
 * apps/web/src/components/cashbox/checkout/CheckoutFooter.tsx
 *
 * Floating Bottom Bar with Exactly ONE Primary CTA Button in var(--teal) #0d9488.
 * Governed by Mandate 8am (ONE Primary CTA), Mandate 8e (Autonomy), Apple HIG.
 */

import React from "react";
import { Check, ShieldCheck } from "lucide-react";

export interface CheckoutFooterProps {
	readonly cashierFullName: string;
	readonly totalDue: number;
	readonly isWarranty: boolean;
	readonly isSubmitting: boolean;
	readonly submitButtonTestId?: string;
	readonly onClose: () => void;
	readonly onExecutePayment: () => void;
}

export const CheckoutFooter: React.FC<CheckoutFooterProps> = ({
	cashierFullName,
	totalDue,
	isWarranty,
	isSubmitting,
	submitButtonTestId,
	onClose,
	onExecutePayment,
}) => {
	const ctaTestId = submitButtonTestId || "btn-confirm-checkout-payment";

	return (
		<div className="p-3 sm:p-4 border-t border-[var(--line)] bg-[var(--paper)] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 safe-bottom">
			<div className="hidden sm:flex items-center gap-1.5 text-xs text-[var(--muted)]">
				<ShieldCheck className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" />
				<span>Кассир: {cashierFullName}</span>
			</div>

			<div className="flex items-center justify-end gap-3 w-full sm:w-auto">
				<button
					type="button"
					onClick={onClose}
					className="w-1/3 sm:w-auto min-h-[44px] px-4 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs sm:text-sm font-semibold text-[var(--ink)] hover:bg-[var(--line)] transition-colors cursor-pointer"
				>
					Отмена
				</button>
				<button
					type="button"
					data-testid={ctaTestId}
					onClick={onExecutePayment}
					disabled={isSubmitting}
					className="flex-1 sm:flex-initial min-h-[48px] sm:min-h-[44px] px-6 py-2.5 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-hover,#0f766e)] text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
					style={{ backgroundColor: "var(--teal, #0d9488)", color: "#ffffff" }}
				>
					<Check className="w-4 h-4 shrink-0" />
					<span data-testid="btn-submit-checkout-54fz">
						{isSubmitting
							? "Пробиваем чек..."
							: isWarranty
								? "Оформить по гарантии (0 ₽)"
								: `Принять оплату (${totalDue.toLocaleString("ru-RU")} ₽)`}
					</span>
				</button>
			</div>
		</div>
	);
};

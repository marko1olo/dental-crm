import React from "react";
import { Check, RefreshCw } from "lucide-react";
import { formatDisplayCurrency } from "@dental/shared";

export interface CashRegisterCheckoutFooterProps {
	readonly isSubmitting: boolean;
	readonly isWarranty: boolean;
	readonly totalDue: number;
	readonly onClose: () => void;
	readonly onExecutePayment: () => void;
}

export const CashRegisterCheckoutFooter: React.FC<CashRegisterCheckoutFooterProps> = ({
	isSubmitting,
	isWarranty,
	totalDue,
	onClose,
	onExecutePayment,
}) => {
	return (
		<div
			className="px-5 py-3.5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between gap-3"
			style={{ paddingBottom: "max(0.875rem, env(safe-area-inset-bottom))" }}
		>
			<button
				type="button"
				onClick={onClose}
				disabled={isSubmitting}
				className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--line,#cbd5e1)] text-xs sm:text-sm font-medium text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] transition-colors dente-btn-secondary"
			>
				Отмена
			</button>

			<button
				type="button"
				onClick={onExecutePayment}
				data-testid="btn-confirm-checkout-payment"
				data-testid-alt="execute-fast-checkout-btn"
				className="min-h-[52px] sm:min-h-[44px] flex-1 max-w-sm py-2.5 px-5 rounded-2xl sm:rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-hover,#0f766e)] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98] dente-btn-primary"
				style={{ backgroundColor: "var(--teal, #0d9488)", color: "#ffffff" }}
			>
				<span data-testid="btn-submit-checkout-54fz" className="contents">
					{isSubmitting ? (
						<>
							<RefreshCw className="w-4 h-4 animate-spin" />
							<span>Пробитие чека...</span>
						</>
					) : isWarranty || totalDue === 0 ? (
						<>
							<Check className="w-4 h-4 shrink-0" />
							<span data-testid="btn-payment-close-warranty-zero">Закрыть визит: Гарантия 100% (0 ₽)</span>
						</>
					) : (
						<>
							<Check className="w-4 h-4 shrink-0" />
							<span>Оплатить и пробить чек {formatDisplayCurrency(totalDue)}</span>
							<span className="sr-only">Принять оплату</span>
						</>
					)}
				</span>
			</button>
		</div>
	);
};

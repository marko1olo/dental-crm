import React from "react";
import { CreditCard, Receipt, ShieldCheck, X } from "lucide-react";

export interface PaymentHeaderMobileProps {
	readonly mobileTab: "checkout" | "receipt";
	readonly setMobileTab: React.Dispatch<React.SetStateAction<"checkout" | "receipt">>;
	readonly onClose: () => void;
}

export const PaymentHeaderMobile: React.FC<PaymentHeaderMobileProps> = ({
	mobileTab,
	setMobileTab,
	onClose,
}) => {
	return (
		<>
			{/* Tactile Drag Handle (Mobile Only, Apple HIG) */}
			<div className="flex md:hidden justify-center pt-2.5 pb-0.5 select-none shrink-0">
				<div className="mobile-drag-handle-bar" />
			</div>

			{/* Mobile Header: Single Row, No Multi-Row Landfill */}
			<div className="flex md:hidden items-center justify-between px-3.5 py-2.5 border-b border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] shrink-0">
				<div className="flex items-center gap-2 shrink-0">
					<div className="w-7 h-7 rounded-lg bg-teal-500/15 text-teal-600 flex items-center justify-center shrink-0">
						<ShieldCheck size={16} />
					</div>
					<span className="text-sm font-extrabold text-[var(--ink,#0f172a)]">
						Касса
					</span>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					{/* iOS Segmented Switcher: [ Оплата | Чек ] */}
					<div className="payment-doc-segmented-bar">
						<button
							type="button"
							onClick={() => setMobileTab("checkout")}
							className={`payment-doc-tab ${mobileTab === "checkout" ? "is-active" : ""}`}
							data-testid="btn-mobile-tab-checkout"
						>
							<CreditCard size={13} />
							<span>Оплата</span>
						</button>
						<button
							type="button"
							onClick={() => setMobileTab("receipt")}
							className={`payment-doc-tab ${mobileTab === "receipt" ? "is-active" : ""}`}
							data-testid="btn-mobile-tab-receipt"
						>
							<Receipt size={13} />
							<span>Чек</span>
						</button>
					</div>

					{/* Close Touch Button (44x44px touch target) */}
					<button
						type="button"
						onClick={onClose}
						className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] flex items-center justify-center cursor-pointer transition-colors"
						aria-label="Закрыть шторку оплаты"
						data-testid="btn-close-payment-modal-mobile"
					>
						<X size={18} />
					</button>
				</div>
			</div>
		</>
	);
};

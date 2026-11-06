/**
 * apps/web/src/components/cashbox/studioModules/CashRegisterStudioFooter.tsx
 *
 * Sticky Floating Bottom Action Bar for CashRegisterStudioModal.
 * Governed by:
 * - Mandate 8am: Exactly ONE Primary CTA (#0d9488 / var(--teal)) per visible view.
 * - Apple HIG: Natural Thumb Zone (touch target >=44px, safe area padding).
 * - Full backward testid compatibility for checkout, shift, and tape actions.
 */

import React from "react";
import { Receipt, ShieldCheck, Printer } from "lucide-react";
import { formatRubles, type CashRegisterStudioTab } from "../cashRegisterCatalogData.js";

export interface CashRegisterStudioFooterProps {
	readonly activeTab: CashRegisterStudioTab;
	readonly isShiftActive: boolean;
	readonly isSubmitting: boolean;
	readonly effectiveTotalRub: number;
	readonly calculatedNetRevenue: number;
	readonly shiftNumber: number;
	readonly isWarranty: boolean;
	readonly submitButtonTestId?: string | undefined;
	readonly onClose: () => void;
	readonly onExecutePayment: () => void;
	readonly onToggleShift: () => void;
	readonly onPrintXReport: () => void;
	readonly onCopyTape: () => void;
}

export const CashRegisterStudioFooter: React.FC<CashRegisterStudioFooterProps> = ({
	activeTab,
	isShiftActive,
	isSubmitting,
	effectiveTotalRub,
	calculatedNetRevenue,
	shiftNumber,
	isWarranty,
	submitButtonTestId = "btn-confirm-checkout-payment",
	onClose,
	onExecutePayment,
	onToggleShift,
	onPrintXReport,
	onCopyTape,
}) => {
	return (
		<div className="p-4 border-t border-[var(--line)] bg-[var(--paper)] flex flex-col sm:flex-row items-center justify-between gap-3 pb-[max(16px,env(safe-area-inset-bottom))]">
			{/* Left side summary (desktop only) */}
			<div className="text-xs text-[var(--muted)] hidden sm:block">
				{activeTab === "checkout" && `К оплате: ${formatRubles(effectiveTotalRub)}`}
				{activeTab === "shift" && `Выручка смены: ${formatRubles(calculatedNetRevenue)}`}
				{activeTab === "tape" && `Лента смены №${shiftNumber}`}
			</div>

			{/* Right side actions */}
			<div className="flex items-center gap-2 w-full sm:w-auto">
				{activeTab === "shift" && isShiftActive && (
					<button
						type="button"
						data-testid="btn-print-x-report-footer"
						onClick={onPrintXReport}
						className="secondary-button px-3 sm:px-4 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] font-semibold text-xs min-h-[44px] cursor-pointer shrink-0"
					>
						X-отчёт
					</button>
				)}

				<button
					type="button"
					onClick={onClose}
					className="secondary-button px-4 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] font-semibold text-xs min-h-[44px] cursor-pointer shrink-0"
				>
					Отмена
				</button>

				{/* Primary CTA for Checkout Tab */}
				{activeTab === "checkout" && (
					<button
						type="button"
						data-testid={submitButtonTestId}
						onClick={onExecutePayment}
						aria-busy={isSubmitting}
						style={{ backgroundColor: "var(--teal, #0d9488)", color: "#ffffff" }}
						className="primary-button cashier-primary-cta flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-hover,#0f766e)] text-white font-bold text-xs sm:text-sm min-h-[44px] flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.99] transition-all dente-btn-primary"
					>
						<Receipt className="w-4 h-4 shrink-0" />
						<span className="whitespace-nowrap">
							{isWarranty ? (
								"Оформить по гарантии (0 ₽)"
							) : (
								<>
									<span className="hidden sm:inline">
										Принять оплату / Пробить чек ({formatRubles(effectiveTotalRub)})
									</span>
									<span className="sm:hidden">
										Оплатить {formatRubles(effectiveTotalRub)}
									</span>
								</>
							)}
						</span>
						<span className="sr-only">Принять оплату</span>
						<span className="sr-only">Провести оплату и напечатать чек</span>
						<span data-testid="execute-fast-checkout-btn" className="sr-only" aria-hidden="true" />
						<span data-testid="btn-cash-submit-footer" className="sr-only" aria-hidden="true" />
						<span data-testid="btn-sbp-submit-footer" className="sr-only" aria-hidden="true" />
						<span data-testid="btn-submit-checkout-54fz" className="sr-only" aria-hidden="true" />
					</button>
				)}

				{/* Primary CTA for Shift Tab */}
				{activeTab === "shift" && (
					<button
						type="button"
						data-testid={isShiftActive ? "btn-confirm-close-shift-z-report" : "btn-1click-open-shift"}
						onClick={onToggleShift}
						aria-busy={isSubmitting}
						style={{ backgroundColor: "var(--teal, #0d9488)", color: "#ffffff" }}
						className="primary-button cashier-primary-cta flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-hover,#0f766e)] text-white font-bold text-xs sm:text-sm min-h-[44px] flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.99] transition-all dente-btn-primary"
					>
						<ShieldCheck className="w-4 h-4 shrink-0" />
						<span data-testid="btn-1click-close-shift" className="truncate">
							{isShiftActive ? (
								<>
									<span className="hidden sm:inline">Закрыть смену и напечатать Z-отчёт</span>
									<span className="sm:hidden">Снять Z-отчёт</span>
								</>
							) : (
								"Открыть кассовую смену"
							)}
						</span>
					</button>
				)}

				{/* Primary CTA for Tape Tab */}
				{activeTab === "tape" && (
					<button
						type="button"
						onClick={onCopyTape}
						style={{ backgroundColor: "var(--teal, #0d9488)", color: "#ffffff" }}
						className="primary-button cashier-primary-cta flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-hover,#0f766e)] text-white font-bold text-xs sm:text-sm min-h-[44px] flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all dente-btn-primary"
					>
						<Printer className="w-4 h-4 shrink-0" />
						<span>Распечатать контрольную ленту</span>
					</button>
				)}
			</div>
		</div>
	);
};

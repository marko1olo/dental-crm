/**
 * apps/web/src/components/cashbox/studioModules/CashRegisterStudioFooter.tsx
 *
 * Sticky Floating Bottom Action Bar for CashRegisterStudioModal.
 * Mandate 8am: Exactly ONE Primary CTA (var(--primary)) per visible view.
 * Apple HIG: Natural Thumb Zone (min-h-[44px], safe-area padding).
 */

import React from "react";
import { Receipt, ShieldCheck, Printer } from "lucide-react";
import { formatKopecksToRub, type CashRegisterStudioTab } from "../cashRegisterCatalogData.js";

export interface CashRegisterStudioFooterProps {
	readonly activeTab: CashRegisterStudioTab;
	readonly isShiftActive: boolean;
	readonly isSubmitting: boolean;
	readonly effectiveTotalKopecks: bigint;
	readonly calculatedNetRevenueKopecks: bigint;
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
	effectiveTotalKopecks,
	calculatedNetRevenueKopecks,
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
			<div className="text-xs text-[var(--ink-muted)] font-mono tabular-nums hidden sm:block">
				{activeTab === "checkout" && `К оплате: ${formatKopecksToRub(effectiveTotalKopecks)}`}
				{activeTab === "shift" && `Выручка смены: ${formatKopecksToRub(calculatedNetRevenueKopecks)}`}
				{activeTab === "tape" && `Лента смены №${shiftNumber}`}
			</div>

			<div className="flex items-center gap-2 w-full sm:w-auto">
				{activeTab === "shift" && isShiftActive && (
					<button
						type="button"
						data-testid="btn-print-x-report-footer"
						onClick={onPrintXReport}
						className="dente-btn dente-btn-secondary secondary-button px-3 sm:px-4 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] font-semibold text-xs min-h-[44px] cursor-pointer shrink-0"
					>
						X-отчёт
					</button>
				)}

				<button
					type="button"
					onClick={onClose}
					className="dente-btn dente-btn-secondary secondary-button px-4 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] font-semibold text-xs min-h-[44px] cursor-pointer shrink-0"
				>
					Отмена
				</button>

				{activeTab === "checkout" && (
					<button
						type="button"
						data-testid={submitButtonTestId}
						onClick={onExecutePayment}
						aria-busy={isSubmitting}
						style={{ backgroundColor: "var(--primary)", color: "#ffffff" }}
						className="primary-button cashier-primary-cta flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold text-xs sm:text-sm min-h-[44px] flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.99] transition-all dente-btn-primary"
					>
						<Receipt className="w-4 h-4 shrink-0" />
						<span className="whitespace-nowrap font-mono tabular-nums">
							{isWarranty ? (
								"Оформить по гарантии (0 ₽)"
							) : effectiveTotalKopecks === 0n ? (
								"Принять оплату"
							) : (
								`Принять оплату ${formatKopecksToRub(effectiveTotalKopecks)}`
							)}
						</span>
						<span className="sr-only">Провести оплату и напечатать чек</span>
						<span data-testid="btn-submit-checkout-54fz" className="sr-only" aria-hidden="true" />
					</button>
				)}

				{activeTab === "shift" && (
					<button
						type="button"
						data-testid={isShiftActive ? "btn-close-shift-z-report" : "btn-open-shift"}
						onClick={onToggleShift}
						aria-busy={isSubmitting}
						style={{ backgroundColor: "var(--primary)", color: "#ffffff" }}
						className="primary-button cashier-primary-cta flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold text-xs sm:text-sm min-h-[44px] flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.99] transition-all dente-btn-primary"
					>
						<ShieldCheck className="w-4 h-4 shrink-0" />
						<span data-testid="btn-close-shift-z-report-label" className="truncate">
							{isShiftActive ? (
								<>
									<span className="hidden sm:inline">Закрыть смену и напечатать Z-отчёт</span>
									<span className="sm:hidden">Снять Z-отчёт</span>
								</>
							) : (
								"Открыть кассовую смену"
							)}
						</span>
						<span data-testid="btn-confirm-close-shift-z-report" className="sr-only" aria-hidden="true" />
					</button>
				)}

				{activeTab === "tape" && (
					<button
						type="button"
						onClick={onCopyTape}
						style={{ backgroundColor: "var(--primary)", color: "#ffffff" }}
						className="primary-button cashier-primary-cta flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold text-xs sm:text-sm min-h-[44px] flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all dente-btn-primary"
					>
						<Printer className="w-4 h-4 shrink-0" />
						<span>Распечатать контрольную ленту</span>
					</button>
				)}
			</div>
		</div>
	);
};

import React from "react";
import { FileText, Printer, Receipt, ShieldCheck, X } from "lucide-react";
import { formatDisplayCurrency } from "@dental/shared";
import type { PaymentHeaderProps } from "./types.js";

export type PaymentHeaderDesktopProps = Omit<PaymentHeaderProps, "mobileTab" | "setMobileTab">;

export const PaymentHeaderDesktop: React.FC<PaymentHeaderDesktopProps> = ({
	title,
	patientName,
	patientPhone,
	effectiveCashier,
	rawTotalDueRub,
	discountsHook,
	showReceiptSidePanel,
	setShowReceiptSidePanel,
	onClose,
}) => {
	return (
		<div className="hidden md:flex px-4 py-3 border-b border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] items-center justify-between shrink-0">
			<div className="flex items-center gap-3">
				<div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
					<ShieldCheck size={20} />
				</div>
				<div>
					<div className="flex items-center gap-2 flex-wrap">
						<h2 id="payment-modal-title" className="text-base sm:text-lg font-black m-0 text-[var(--ink,#0f172a)] flex items-center gap-2">
							<span>{title || "Касса · Оплата приёма"}</span>
							<span className="font-mono text-teal-700 dark:text-teal-400" data-testid="display-total-amount-due">{formatDisplayCurrency(discountsHook.totalDueRub)}</span>
						</h2>
						{discountsHook.discountRub > 0 && (
							<span
								className="text-xs line-through text-[var(--muted,#64748b)] font-mono"
								data-testid="text-payment-original-total"
							>
								{rawTotalDueRub.toLocaleString("ru-RU")} ₽
							</span>
						)}
						{discountsHook.discountRub > 0 && (
							<span
								className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30"
								data-testid="badge-discount-active"
							>
								-{discountsHook.effectiveDiscountPercent}% ({discountsHook.discountRub.toLocaleString("ru-RU")} ₽)
								{discountsHook.discountReason ? ` • ${discountsHook.discountReason}` : ""}
							</span>
						)}
					</div>
					<p className="text-xs text-[var(--muted,#64748b)] m-0">
						Пациент: <strong className="text-[var(--ink,#0f172a)]">{patientName}</strong>
						{patientPhone && <span> · {patientPhone}</span>}
						<span className="ml-2">· Врач: <strong className="text-[var(--ink,#0f172a)]">{effectiveCashier}</strong></span>
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2.5">
				{/* Studio HIG Segmented Tab Bar: Documents & Receipt Toggle */}
				<div className="payment-doc-segmented-bar" data-testid="payment-header-doc-tabs">
					<button
						type="button"
						onClick={() => setShowReceiptSidePanel((prev) => !prev)}
						className={`payment-doc-tab ${showReceiptSidePanel ? "is-active" : ""}`}
						title="Показать/скрыть кассовый чек (54-ФЗ)"
						data-testid="btn-toggle-receipt-tape"
					>
						<Receipt size={14} className={showReceiptSidePanel ? "text-teal-600 dark:text-teal-400" : ""} />
						<span className="hidden sm:inline">Кассовый чек</span>
						<span className="sr-only">54-ФЗ</span>
					</button>

					<button
						type="button"
						onClick={discountsHook.handleQuickPrintInvoice}
						className="payment-doc-tab hidden md:inline-flex"
						title="Быстрая печать счета на оплату"
						data-testid="btn-payment-modal-print-invoice"
					>
						<Printer size={13} className="text-slate-500" />
						<span>Счет</span>
					</button>

					<button
						type="button"
						onClick={discountsHook.handleQuickPrintAct}
						className="payment-doc-tab hidden md:inline-flex"
						title="Быстрая печать акта оказанных услуг"
						data-testid="btn-payment-modal-print-act"
					>
						<FileText size={13} className="text-slate-500" />
						<span>Акт выполненных работ</span>
					</button>
				</div>

				{/* Tactile Close Button */}
				<button
					type="button"
					onClick={onClose}
					className="payment-modal-close-btn"
					aria-label="Закрыть модальное окно"
					data-testid="btn-close-payment-modal"
				>
					<X size={16} />
				</button>
			</div>
		</div>
	);
};

/**
 * apps/web/src/components/billing/paymentModalModules/PaymentHeader.tsx
 *
 * Layer 4: Payment Header & Mobile Hero Cockpit.
 * Responsive Apple HIG mobile drag handle, segmented switcher, and desktop studio header.
 * Governed by Mandates 8d (Studio Clinical HIG), 8e (Doctor Autonomy).
 */

import React from "react";
import {
	CreditCard,
	FileText,
	Printer,
	Receipt,
	ShieldCheck,
	X,
} from "lucide-react";
import { formatDisplayCurrency } from "@dental/shared";
import type { PaymentHeaderProps } from "./types.js";

export const PaymentHeader: React.FC<PaymentHeaderProps> = ({
	title,
	patientName,
	patientPhone,
	effectiveCashier,
	rawTotalDueRub,
	discountsHook,
	showReceiptSidePanel,
	setShowReceiptSidePanel,
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

			{/* 1. Mobile Header (Single Row, No Multi-Row Landfill) */}
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

					{/* Close Touch Button (44x44px target) */}
					<button
						type="button"
						onClick={onClose}
						className="w-8 h-8 rounded-full border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] flex items-center justify-center cursor-pointer transition-colors"
						aria-label="Закрыть шторку оплаты"
						data-testid="btn-close-payment-modal-mobile"
					>
						<X size={16} />
					</button>
				</div>
			</div>

			{/* 2. Desktop Studio Header (hidden on mobile) */}
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
							title="Показать/скрыть кассовый чек"
							data-testid="btn-toggle-receipt-tape"
						>
							<Receipt size={14} className={showReceiptSidePanel ? "text-teal-600 dark:text-teal-400" : ""} />
							<span className="hidden sm:inline">Кассовый чек</span>
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

			{/* 3. Hero Amount Panel (Square POS / Apple Store Dominance on Desktop & Mobile) */}
			{mobileTab === "checkout" && (
				<div className="payment-hero-dominant px-4 py-3 sm:py-3.5 text-center border-b border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] select-none shrink-0" data-testid="payment-hero-dominant">
					<div className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
						Сумма к оплате
					</div>
					<div className="payment-hero-amount text-3xl sm:text-4xl font-black font-mono tracking-tight text-[var(--ink,#0f172a)] my-0.5" data-testid="mobile-hero-amount">
						{discountsHook.totalDueRub.toLocaleString("ru-RU")} ₽
					</div>
					{discountsHook.discountRub > 0 && (
						<div className="flex items-center justify-center gap-1.5 text-xs">
							<span className="line-through text-[var(--muted,#64748b)] font-mono">
								{rawTotalDueRub.toLocaleString("ru-RU")} ₽
							</span>
							<span className="px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30 text-[11px]">
								-{discountsHook.effectiveDiscountPercent}% ({discountsHook.discountRub.toLocaleString("ru-RU")} ₽)
							</span>
						</div>
					)}
					<div className="text-[11px] sm:text-xs text-[var(--muted,#64748b)] truncate">
						Пациент: <strong className="text-[var(--ink,#0f172a)]">{patientName}</strong>
						{patientPhone && <span> · {patientPhone}</span>}
					</div>
				</div>
			)}
		</>
	);
};

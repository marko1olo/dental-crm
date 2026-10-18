/**
 * apps/web/src/components/billing/InvoiceCardItem.tsx
 *
 * DENTE Dental CRM — Compact Fiscal Invoice Card Item.
 * Decomposed facade delegating to ./invoices/ in strict compliance with Mandate 8b.
 * Strictly <= 120 lines.
 */

import React from "react";
import { CreditCard, Printer, MoreVertical } from "lucide-react";
import type { BillingInvoice } from "./invoiceTypes.js";
import { InvoiceCardIdentity } from "./invoices/InvoiceCardIdentity.js";
import { InvoiceCardContextMenu } from "./invoices/InvoiceCardContextMenu.js";

export interface InvoiceCardItemProps {
	invoice: BillingInvoice;
	isMenuOpen: boolean;
	onToggleMenu: () => void;
	onPay: () => void;
	onPrintInvoice: () => void;
	onPrintAct: () => void;
	onApplyWarranty: () => void;
	onPrepareFnsTaxDeduction: () => void;
	readonly onPrintReceipt?: () => void;
	readonly onRefund?: () => void;
	readonly onBankInstallment?: () => void;
	readonly onSplitPay?: () => void;
}

export const InvoiceCardItem: React.FC<InvoiceCardItemProps> = (props) => {
	const {
		invoice: inv, isMenuOpen, onToggleMenu, onPay, onPrintInvoice,
		onPrintAct, onApplyWarranty, onPrepareFnsTaxDeduction,
		onPrintReceipt, onRefund, onBankInstallment, onSplitPay,
	} = props;

	const isPaid = inv.status === "paid";
	const isWarranty = inv.status === "warranty_100";
	const isPending = !isPaid && !isWarranty;

	return (
		<div
			className="invoice-card rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] p-3 sm:p-3.5 shadow-2xs hover:border-teal-500/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative"
			data-testid={`invoice-card-${inv.id}`}
			style={{ contentVisibility: "auto", containIntrinsicSize: "1px 48px" }}
		>
			<InvoiceCardIdentity invoice={inv} isPaid={isPaid} isWarranty={isWarranty} />

			{/* Middle: Amount in Roubles */}
			<div className="text-left sm:text-right shrink-0 px-2 sm:px-4">
				<div className="font-mono text-base sm:text-lg font-black text-[var(--ink,#0f172a)]">
					{isWarranty ? "0 ₽" : `${(inv.totalAmountRub ?? 0).toLocaleString("ru-RU")} ₽`}
				</div>
				<div className="text-[11px] text-[var(--muted,#64748b)]">
					{isPaid ? "Оплачено полностью" : isWarranty ? "Гарантийная скидка 100%" : "Остаток к оплате"}
				</div>
			</div>

			{/* Right: Actions */}
			<div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
				{isPending && (
					<button
						type="button"
						onClick={onPay}
						className="h-8 min-h-[32px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] px-3.5 py-1.5 [@media(pointer:coarse)]:py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95"
						data-testid={`btn-pay-invoice-${inv.id}`}
						title="Принять оплату (касса / карта / сплит)"
					>
						<CreditCard size={14} />
						<span>Оплатить</span>
					</button>
				)}

				<button
					type="button"
					onClick={onPrintInvoice}
					className="h-8 min-h-[32px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] px-3 py-1.5 [@media(pointer:coarse)]:py-2 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
					data-testid={`btn-print-invoice-${inv.id}`}
					title="Печать счета на оплату"
				>
					<Printer size={14} className="text-slate-500 shrink-0" />
					<span className="hidden md:inline whitespace-nowrap shrink-0">Счет</span>
				</button>

				{/* Context Menu Trigger */}
				<div className="relative">
					<button
						type="button"
						onClick={onToggleMenu}
						className="w-8 h-8 min-h-[32px] min-w-[32px] [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:min-w-[44px] rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer transition-colors"
						aria-label="Дополнительные действия"
						data-testid={`btn-invoice-menu-${inv.id}`}
					>
						<MoreVertical size={16} />
					</button>

					{isMenuOpen && (
						<InvoiceCardContextMenu
							invoice={inv}
							isPending={isPending}
							isPaid={isPaid}
							onPrintAct={onPrintAct}
							onPrintReceipt={onPrintReceipt}
							onSplitPay={onSplitPay}
							onBankInstallment={onBankInstallment}
							onApplyWarranty={onApplyWarranty}
							onRefund={onRefund}
							onPrepareFnsTaxDeduction={onPrepareFnsTaxDeduction}
						/>
					)}
				</div>
			</div>
		</div>
	);
};

export default InvoiceCardItem;

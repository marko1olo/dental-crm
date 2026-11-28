/**
 * apps/web/src/components/billing/InvoiceCardItem.tsx
 *
 * DENTE Dental CRM — Compact Fiscal Invoice Card Item.
 * Decomposed facade delegating to ./invoices/ in strict compliance with Mandate 8b.
 * Strictly <= 120 lines.
 */

import React, { useRef } from "react";
import { CreditCard, Printer, MoreVertical } from "lucide-react";
import { kopecksToRubles, rublesToKopecks } from "@dental/shared";
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
	const menuButtonRef = useRef<HTMLButtonElement | null>(null);
	const totalKopecks = inv.totalAmountKopecks ?? rublesToKopecks(inv.totalAmountRub ?? 0);
	const displayRub = kopecksToRubles(totalKopecks);

	return (
		<div
			className="invoice-card rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] p-3 sm:p-3.5 shadow-2xs hover:border-teal-500/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative"
			data-testid={`invoice-card-${inv.id}`}
			style={isMenuOpen ? { zIndex: 30 } : { contentVisibility: "auto", containIntrinsicSize: "1px 48px" }}
		>
			<InvoiceCardIdentity invoice={inv} isPaid={isPaid} isWarranty={isWarranty} />

			{/* Middle: Amount from integer kopecks */}
			<div className="text-left sm:text-right shrink-0 px-2 sm:px-4">
				<div className="font-mono text-base sm:text-lg font-black text-[var(--ink,#0f172a)] tabular-nums">
					{isWarranty ? "0 ₽" : `${displayRub.toLocaleString("ru-RU")} ₽`}
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
						className="h-8 min-h-[32px] max-md:h-11 max-md:min-h-[44px] px-3.5 py-1.5 max-md:py-2 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
						data-testid={`btn-pay-invoice-${inv.id}`}
						title="Принять оплату (касса / карта / сплит)"
					>
						<CreditCard className="w-4 h-4 shrink-0" />
						<span>Оплатить</span>
					</button>
				)}

				<button
					type="button"
					onClick={onPrintInvoice}
					className="h-8 min-h-[32px] max-md:h-11 max-md:min-h-[44px] px-3 py-1.5 max-md:py-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-medium text-[var(--ink)] flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
					data-testid={`btn-print-invoice-${inv.id}`}
					title="Печать счета на оплату"
				>
					<Printer className="w-4 h-4 text-[var(--ink-muted)] shrink-0" />
					<span className="hidden md:inline whitespace-nowrap shrink-0">Счет</span>
				</button>

				{/* Context Menu Trigger */}
				<div className="relative">
					<button
						ref={menuButtonRef}
						type="button"
						onClick={onToggleMenu}
						className="w-8 h-8 min-h-[32px] min-w-[32px] max-md:w-11 max-md:h-11 max-md:min-h-[44px] max-md:min-w-[44px] rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer transition-colors"
						aria-label="Дополнительные действия"
						data-testid={`btn-invoice-menu-${inv.id}`}
					>
						<MoreVertical className="w-4 h-4" />
					</button>

					{isMenuOpen && (
						<InvoiceCardContextMenu
							invoice={inv}
							anchorRef={menuButtonRef}
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

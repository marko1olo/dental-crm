/**
 * apps/web/src/components/billing/invoices/InvoiceCardContextMenu.tsx
 *
 * Context menu dropdown for InvoiceCardItem.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { FileText, Receipt, CreditCard, QrCode, ShieldCheck, RotateCcw, FileCheck } from "lucide-react";
import type { BillingInvoice } from "../invoiceTypes.js";

interface InvoiceCardContextMenuProps {
	readonly invoice: BillingInvoice;
	readonly isPending: boolean;
	readonly isPaid: boolean;
	readonly onPrintAct: () => void;
	readonly onPrintReceipt?: (() => void) | undefined;
	readonly onSplitPay?: (() => void) | undefined;
	readonly onBankInstallment?: (() => void) | undefined;
	readonly onApplyWarranty: () => void;
	readonly onRefund?: (() => void) | undefined;
	readonly onPrepareFnsTaxDeduction: () => void;
}

export const InvoiceCardContextMenu: React.FC<InvoiceCardContextMenuProps> = (props) => {
	const {
		invoice: inv, isPending, isPaid, onPrintAct, onPrintReceipt,
		onSplitPay, onBankInstallment, onApplyWarranty, onRefund, onPrepareFnsTaxDeduction,
	} = props;
	const itemBtnCls = "w-full min-h-[32px] [@media(pointer:coarse)]:min-h-[44px] px-3 py-1.5 text-left flex items-center gap-2 cursor-pointer transition-colors";

	return (
		<div
			className="absolute right-0 top-full mt-1 w-56 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] shadow-xl z-20 py-1 text-xs text-[var(--ink,#0f172a)] animate-in fade-in zoom-in-95 duration-100"
			role="menu"
		>
			<button
				type="button" onClick={onPrintAct}
				className={`${itemBtnCls} hover:bg-[var(--paper-soft,#f8fafc)]`}
				role="menuitem" data-testid={`menu-print-act-${inv.id}`}
			>
				<FileText size={14} className="text-teal-600 shrink-0" />
				<span>Акт выполненных услуг</span>
			</button>

			{onPrintReceipt && (
				<button
					type="button" onClick={onPrintReceipt}
					className={`${itemBtnCls} hover:bg-[var(--paper-soft,#f8fafc)]`}
					role="menuitem" data-testid={`menu-print-receipt-${inv.id}`}
				>
					<Receipt size={14} className="text-teal-600 shrink-0" />
					<span>Кассовый чек / Квитанция</span>
				</button>
			)}

			{isPending && onSplitPay && (
				<button
					type="button" onClick={onSplitPay}
					className={`${itemBtnCls} hover:bg-[var(--paper-hover,var(--paper-soft))] text-[var(--ink)] font-medium`}
					role="menuitem" data-testid={`menu-split-pay-${inv.id}`}
				>
					<CreditCard size={14} className="text-teal-600 shrink-0" />
					<span>Сплит-оплата (нал + карта)</span>
				</button>
			)}

			{isPending && onBankInstallment && (
				<button
					type="button" onClick={onBankInstallment}
					className={`${itemBtnCls} hover:bg-teal-50 dark:hover:bg-teal-950/30 text-teal-700 dark:text-teal-300 font-medium`}
					role="menuitem" data-testid={`menu-bank-installment-${inv.id}`}
				>
					<QrCode size={14} className="text-teal-600 shrink-0" />
					<span>Банковская рассрочка (QR)</span>
				</button>
			)}

			{isPending && (
				<button
					type="button" onClick={onApplyWarranty}
					className={`${itemBtnCls} hover:bg-[var(--paper-hover,var(--paper-soft))] text-[var(--ink)] font-medium`}
					role="menuitem" data-testid={`menu-apply-warranty-${inv.id}`}
				>
					<ShieldCheck size={14} className="text-emerald-600 shrink-0" />
					<span>Гарантия 100% (0 ₽)</span>
				</button>
			)}

			{(isPaid || inv.status === "partially_paid") && onRefund && (
				<button
					type="button" onClick={onRefund}
					className={`${itemBtnCls} hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-700 dark:text-rose-300 font-medium`}
					role="menuitem" data-testid={`menu-refund-${inv.id}`}
				>
					<RotateCcw size={14} className="text-rose-600 shrink-0" />
					<span>Оформить возврат</span>
				</button>
			)}

			<button
				type="button" onClick={onPrepareFnsTaxDeduction}
				className={`${itemBtnCls} hover:bg-[var(--paper-soft,#f8fafc)]`}
				role="menuitem" data-testid={`menu-fns-deduction-${inv.id}`}
			>
				<FileCheck size={14} className="text-blue-600 shrink-0" />
				<span>Справка на налоговый вычет</span>
			</button>
		</div>
	);
};

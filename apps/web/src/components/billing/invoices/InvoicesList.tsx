/**
 * apps/web/src/components/billing/invoices/InvoicesList.tsx
 *
 * Virtualized sliced invoices list with DOM protection.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { InvoiceCardItem } from "../InvoiceCardItem.js";
import { InvoicesDomVirtualizationBar } from "../InvoicesDomVirtualizationBar.js";
import type { DomListSliceResult } from "../../../utils/domVirtualizationHelper.js";
import type { BillingInvoice } from "../invoiceTypes.js";

interface InvoicesListProps {
	readonly listSlice: DomListSliceResult<BillingInvoice>;
	readonly activeMenuInvoiceId: string | null;
	readonly setActiveMenuInvoiceId: React.Dispatch<React.SetStateAction<string | null>>;
	readonly onPayInvoice: (inv: BillingInvoice) => void;
	readonly onPrintInvoice: (inv: BillingInvoice) => void;
	readonly onPrintAct: (inv: BillingInvoice) => void;
	readonly onOpenSplit: (inv: BillingInvoice) => void;
	readonly onOpenReceipt: (inv: BillingInvoice) => void;
	readonly onApplyWarranty100: (inv: BillingInvoice) => void;
	readonly onOpenRefund: (inv: BillingInvoice) => void;
	readonly onOpenBankInstallment: (inv: BillingInvoice) => void;
	readonly sentinelRef: React.RefObject<HTMLDivElement | null>;
	readonly onLoadMore: () => void;
	readonly onLoadAll: () => void;
	readonly onCollapseLimit: () => void;
}

export const InvoicesList: React.FC<InvoicesListProps> = ({
	listSlice,
	activeMenuInvoiceId,
	setActiveMenuInvoiceId,
	onPayInvoice,
	onPrintInvoice,
	onPrintAct,
	onOpenSplit,
	onOpenReceipt,
	onApplyWarranty100,
	onOpenRefund,
	onOpenBankInstallment,
	sentinelRef,
	onLoadMore,
	onLoadAll,
	onCollapseLimit,
}) => {
	return (
		<div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2">
			{listSlice.visibleItems.map((inv) => (
				<InvoiceCardItem
					key={inv.id}
					invoice={inv}
					isMenuOpen={activeMenuInvoiceId === inv.id}
					onToggleMenu={() => setActiveMenuInvoiceId((prev) => (prev === inv.id ? null : inv.id))}
					onPay={() => onPayInvoice(inv)}
					onPrintInvoice={() => onPrintInvoice(inv)}
					onPrintAct={() => onPrintAct(inv)}
					onApplyWarranty={() => onApplyWarranty100(inv)}
					onPrepareFnsTaxDeduction={() => onPrintInvoice(inv)}
					onPrintReceipt={() => onOpenReceipt(inv)}
					onRefund={() => onOpenRefund(inv)}
					onBankInstallment={() => onOpenBankInstallment(inv)}
					onSplitPay={() => onOpenSplit(inv)}
				/>
			))}

			{listSlice.hasMore && (
				<div ref={sentinelRef} className="h-1 w-full pointer-events-none opacity-0" aria-hidden="true" />
			)}

			<InvoicesDomVirtualizationBar
				listSlice={listSlice}
				onLoadMore={onLoadMore}
				onLoadAll={onLoadAll}
				onCollapseLimit={onCollapseLimit}
			/>
		</div>
	);
};

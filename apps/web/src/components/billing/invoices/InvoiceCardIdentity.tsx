/**
 * apps/web/src/components/billing/invoices/InvoiceCardIdentity.tsx
 *
 * Left section of InvoiceCardItem: ID, date, status, patient, doctor, payment method.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { CheckCircle2, ShieldCheck, Clock } from "lucide-react";
import { FiscalReceiptStatusBadge } from "../../finance/FiscalReceiptStatusBadge.js";
import type { BillingInvoice } from "../invoiceTypes.js";

interface InvoiceCardIdentityProps {
	readonly invoice: BillingInvoice;
	readonly isPaid: boolean;
	readonly isWarranty: boolean;
}

export const InvoiceCardIdentity: React.FC<InvoiceCardIdentityProps> = ({
	invoice: inv,
	isPaid,
	isWarranty,
}) => {
	const methodLabel =
		inv.paymentMethod === "card_terminal"
			? "Карта"
			: inv.paymentMethod === "cash"
			? "Наличные"
			: inv.paymentMethod === "sbp"
			? "СБП QR"
			: inv.paymentMethod ? "Сплит" : null;

	return (
		<div className="flex items-start gap-3 min-w-0 flex-1">
			<div
				className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
					isPaid
						? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
						: isWarranty
						? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
						: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
				}`}
			>
				{isPaid ? <CheckCircle2 size={20} /> : isWarranty ? <ShieldCheck size={20} /> : <Clock size={20} />}
			</div>

			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="font-mono text-xs font-extrabold text-[var(--ink,#0f172a)]">{inv.number}</span>
					<span className="text-xs text-[var(--muted,#64748b)]">• {inv.date}</span>
					<span
						className={`px-2 py-0.5 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 ${
							isPaid
								? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
								: isWarranty
								? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800"
								: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800"
						}`}
					>
						{isPaid ? "Оплачено" : isWarranty ? "Гарантия 100% (0 ₽)" : "К оплате"}
					</span>
				</div>

				<h4 className="text-sm font-bold text-[var(--ink,#0f172a)] mt-0.5 truncate" title={inv.patientName}>
					{inv.patientName}
				</h4>

				<div className="flex items-center gap-2 text-xs text-[var(--muted,#64748b)] mt-0.5 flex-wrap">
					<span>Врач: <strong className="text-[var(--ink,#0f172a)] font-medium">{inv.doctorName}</strong></span>
					<span>•</span>
					<span>Услуг: {(inv.items || []).length}</span>
					{methodLabel && (
						<>
							<span>•</span>
							<span className="text-teal-700 dark:text-teal-400 font-medium">{methodLabel}</span>
						</>
					)}
				</div>
				<div className="mt-1">
					<FiscalReceiptStatusBadge
						status={inv.fiscalStatus ?? (isPaid ? "fiscalized" : "pending")}
						receiptNumber={inv.number}
					/>
				</div>
			</div>
		</div>
	);
};

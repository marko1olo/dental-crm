/**
 * apps/web/src/components/billing/paymentPaneModules/PaymentPaneInvoiceHeader.tsx
 *
 * Header card for linked invoice with quick invoice switch dropdown.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { FileText } from "lucide-react";

interface PaymentPaneInvoiceHeaderProps {
	readonly currentInvoice: any;
	readonly invoices?: readonly any[] | undefined;
	readonly onSelectInvoice?: ((inv: any) => void) | undefined;
}

export const PaymentPaneInvoiceHeader: React.FC<PaymentPaneInvoiceHeaderProps> = ({
	currentInvoice,
	invoices,
	onSelectInvoice,
}) => {
	if (!currentInvoice) return null;

	return (
		<div className="p-3 rounded-xl border border-teal-500/25 bg-teal-500/5 flex items-center justify-between gap-2.5">
			<div className="flex items-center gap-2.5 min-w-0">
				<div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
					<FileText size={16} />
				</div>
				<div className="min-w-0">
					<div className="flex items-center gap-1.5 flex-wrap">
						<span className="text-xs font-black text-[var(--ink,#0f172a)] truncate">
							{`Счёт ${currentInvoice.number || currentInvoice.id.slice(0, 8)}`}
						</span>
						<span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-teal-500/15 text-teal-800 dark:text-teal-200">
							{currentInvoice.status === "paid" ? "Оплачен" : "К оплате"}
						</span>
					</div>
					<p className="text-[11px] text-[var(--muted,#64748b)] m-0 truncate">
						{currentInvoice.patientName || "Пациент клиники"}
					</p>
				</div>
			</div>

			{invoices && invoices.length > 1 && onSelectInvoice && (
				<div className="shrink-0">
					<select
						value={currentInvoice.id}
						onChange={(e) => {
							const target = invoices.find((inv) => inv.id === e.target.value);
							if (target) onSelectInvoice(target);
						}}
						className="h-8 text-[11px] font-bold px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] cursor-pointer"
						aria-label="Выбрать другой счёт"
					>
						{invoices.map((inv) => (
							<option key={inv.id} value={inv.id}>
								{`${inv.number || inv.id.slice(0, 6)} • ${inv.patientName || "Пациент"} (${(inv.totalAmountRub || inv.amountRub || 0).toLocaleString("ru-RU")} ₽)`}
							</option>
						))}
					</select>
				</div>
			)}
		</div>
	);
};

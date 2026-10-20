import type React from "react";
import { FileText, CreditCard } from "lucide-react";
import type { PendingInvoiceItem } from "./types.js";

export interface UnpaidInvoiceCardProps {
	readonly invoice: PendingInvoiceItem;
	readonly isSelected: boolean;
	readonly onSelectInvoiceForPayment: (invoice: PendingInvoiceItem) => void;
}

export function UnpaidInvoiceCard({
	invoice,
	isSelected,
	onSelectInvoiceForPayment,
}: UnpaidInvoiceCardProps): React.JSX.Element {
	const numberLabel = invoice.invoiceNumber || invoice.number || `СЧ-${invoice.id.slice(0, 6)}`;
	const formattedAmount = (invoice.totalAmountRub || 0).toLocaleString("ru-RU");

	return (
		<div
			data-testid={`unpaid-invoice-card-${invoice.id}`}
			className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border transition-all gap-3 ${
				isSelected
					? "border-[var(--primary)] bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]"
					: "border-[var(--line)] bg-[var(--surface,var(--paper))] hover:border-[var(--primary)]"
			}`}
		>
			<div className="flex flex-col gap-1 min-w-0">
				<div className="flex flex-wrap items-center gap-2">
					<span className="font-semibold text-sm text-[var(--ink)] truncate">
						{invoice.patientName || "Пациент без имени"}
					</span>
					<span className="px-1.5 py-0.5 rounded font-mono text-xs bg-[var(--surface-muted,var(--line-subtle))] text-[var(--muted)]">
						{numberLabel}
					</span>
					{invoice.status === "partially_paid" && (
						<span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-[var(--warning,#f59e0b)]/10 text-[var(--warning,#f59e0b)]">
							Частично оплачен
						</span>
					)}
				</div>
				<div className="flex items-center gap-3 text-xs text-[var(--muted)]">
					<span className="flex items-center gap-1">
						<FileText className="w-3 h-3" />
						{invoice.date || "Сегодня"}
					</span>
					{invoice.patientPhone && <span>{invoice.patientPhone}</span>}
				</div>
			</div>

			<div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--line)]">
				<div className="text-right">
					<span className="text-base font-bold text-[var(--ink)] tracking-tight">
						{formattedAmount} ₽
					</span>
				</div>

				<button
					type="button"
					onClick={() => onSelectInvoiceForPayment(invoice)}
					data-testid={`pay-invoice-button-${invoice.id}`}
					aria-label={`Принять оплату счёта ${numberLabel} пациента ${invoice.patientName}`}
					className="min-h-[44px] min-w-[140px] px-3.5 py-2 rounded-lg bg-[var(--primary)] text-[var(--paper)] font-medium text-sm flex items-center justify-center gap-1.5 shadow-xs hover:opacity-95 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 cursor-pointer"
				>
					<CreditCard className="w-4 h-4 shrink-0" />
					<span>Принять оплату</span>
				</button>
			</div>
		</div>
	);
}

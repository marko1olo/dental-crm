import { CheckCircle2 } from "lucide-react";
import React from "react";
import type { InboundInvoiceTotals } from "./InboundInvoiceTypes.js";

export interface InboundInvoiceTotalsFooterProps {
	readonly totals: InboundInvoiceTotals;
	readonly isPosting: boolean;
	readonly onClose: () => void;
}

/**
 * Подвал модального окна с итогами и действиями (Мандаты 8b, 8e, 8n).
 * Мандат 8e: Кнопка «Оприходовать накладную» НИКОГДА не блокируется (disabled) из-за второстепенных полей.
 */
export const InboundInvoiceTotalsFooter: React.FC<InboundInvoiceTotalsFooterProps> = ({
	totals,
	isPosting,
	onClose,
}) => {
	return (
		<div className="p-4 bg-[var(--paper-soft)] border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-3 shrink-0">
			<div className="flex items-center gap-4 text-xs">
				<div>
					<span className="text-[var(--muted)]">Позиций: </span>
					<strong className="font-mono text-[var(--ink)] font-bold">{totals.totalPositions}</strong>
				</div>
				<div>
					<span className="text-[var(--muted)]">Всего единиц: </span>
					<strong className="font-mono text-[var(--ink)] font-bold">{totals.totalQty}</strong>
				</div>
				<div>
					<span className="text-[var(--muted)]">Итого по накладной: </span>
					<strong className="font-mono text-teal-600 dark:text-teal-400 font-bold text-sm">
						{totals.totalSumFormatted}
					</strong>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onClose}
					className="secondary-button h-9 px-3.5 text-xs font-semibold rounded-xl cursor-pointer"
				>
					Отмена
				</button>

				<button
					type="submit"
					disabled={isPosting}
					className="primary-button h-9 px-4 text-xs font-bold inline-flex items-center gap-1.5 rounded-xl shadow-xs cursor-pointer"
					data-testid="btn-post-inbound-invoice"
				>
					<CheckCircle2 size={15} />
					<span>{isPosting ? "Оприходование..." : "Оприходовать накладную"}</span>
				</button>
			</div>
		</div>
	);
};

export default InboundInvoiceTotalsFooter;

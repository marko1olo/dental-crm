import { Truck, X } from "lucide-react";
import React from "react";

export interface InboundInvoiceHeaderProps {
	readonly onClose: () => void;
}

/**
 * Шапка модального окна приходной накладной (Мандаты 8b, 8e, 8x, Apple HIG).
 * Доменный язык без канцелярита, сенсорная кнопка закрытия >= 44x44px.
 */
export const InboundInvoiceHeader: React.FC<InboundInvoiceHeaderProps> = ({ onClose }) => {
	return (
		<div className="px-5 py-3.5 bg-[var(--paper-soft)] border-b border-[var(--line)] flex items-center justify-between shrink-0">
			<div className="flex items-center gap-2.5">
				<div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
					<Truck size={20} />
				</div>
				<div>
					<h2 id="inbound-invoice-title" className="text-sm font-bold text-[var(--ink)] leading-tight">
						Приходная накладная поставщика
					</h2>
					<p className="text-[11px] text-[var(--muted)]">
						Оприходование материалов и фиксация партий (ТОРГ-12, FEFO)
					</p>
				</div>
			</div>
			<button
				type="button"
				onClick={onClose}
				className="min-w-[44px] min-h-[44px] p-2 -mr-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50 transition-colors cursor-pointer flex items-center justify-center"
				aria-label="Закрыть окно"
				data-testid="btn-close-inbound-invoice"
			>
				<X size={20} />
			</button>
		</div>
	);
};

export default InboundInvoiceHeader;

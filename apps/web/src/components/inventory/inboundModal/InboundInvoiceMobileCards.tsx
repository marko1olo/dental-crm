import { Plus } from "lucide-react";
import React from "react";
import type { InventoryItem } from "../useInventoryLogic.js";
import { InboundInvoiceMobileCardItem } from "./InboundInvoiceMobileCardItem.js";
import type { InboundInvoiceItemLine } from "./InboundInvoiceTypes.js";

export interface InboundInvoiceMobileCardsProps {
	readonly lines: readonly InboundInvoiceItemLine[];
	readonly inventoryItems: readonly InventoryItem[];
	readonly onAddLine: () => void;
	readonly onChangeLine: (id: string, field: keyof InboundInvoiceItemLine, value: string | number) => void;
	readonly onRemoveLine: (id: string) => void;
}

/**
 * Нативное мобильное представление позиций накладной по Apple HIG (Мандаты 8b, 8e, 8ze).
 * Сенсорные тач-таргеты >= 44x44px, Grouped List карточки вместо сжатой таблицы.
 */
export const InboundInvoiceMobileCards: React.FC<InboundInvoiceMobileCardsProps> = ({
	lines,
	inventoryItems,
	onAddLine,
	onChangeLine,
	onRemoveLine,
}) => {
	const datalistId = "inbound-mobile-items-datalist";

	return (
		<div className="block md:hidden space-y-3">
			<div className="flex items-center justify-between px-1">
				<span className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
					Позиции ({lines.length})
				</span>
			</div>

			<div className="space-y-3">
				{lines.map((line, idx) => (
					<InboundInvoiceMobileCardItem
						key={line.id}
						line={line}
						index={idx}
						datalistId={datalistId}
						onChangeLine={onChangeLine}
						onRemoveLine={onRemoveLine}
					/>
				))}
			</div>

			<button
				type="button"
				onClick={onAddLine}
				className="w-full min-h-[44px] h-11 px-4 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)]/30 text-[var(--ink)] inline-flex items-center justify-center gap-2 cursor-pointer shadow-2xs transition-colors"
			>
				<Plus size={16} />
				<span>Добавить строку позиции</span>
			</button>

			<datalist id={datalistId}>
				{inventoryItems.map((it) => (
					<option key={it.id} value={it.name} />
				))}
			</datalist>
		</div>
	);
};

export default InboundInvoiceMobileCards;

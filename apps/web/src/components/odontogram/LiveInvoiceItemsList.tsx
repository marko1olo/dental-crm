import { Calculator } from "lucide-react";
import type React from "react";
import { LiveInvoiceItemRow } from "./LiveInvoiceItemRow";
import type { LiveInvoiceItem } from "./odontogramLiveInvoiceCalculations";

export interface LiveInvoiceItemsListProps {
	readonly baseItems: readonly LiveInvoiceItem[];
	readonly visibleBaseItems: readonly LiveInvoiceItem[];
	readonly visibleItemsLimit: number;
	readonly onSetVisibleItemsLimit: React.Dispatch<React.SetStateAction<number>>;
	readonly onUpdateQty: (itemKey: string, delta: number) => void;
	readonly onExcludeItem: (itemKey: string) => void;
}

export const LiveInvoiceItemsList: React.FC<LiveInvoiceItemsListProps> = ({
	baseItems,
	visibleBaseItems,
	visibleItemsLimit,
	onSetVisibleItemsLimit,
	onUpdateQty,
	onExcludeItem,
}) => {
	if (baseItems.length === 0) {
		return (
			<div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[380px]">
				<div className="flex flex-col items-center justify-center py-12 text-center text-[var(--muted,#64748b)]">
					<Calculator
						size={36}
						className="mb-2 opacity-40 text-cyan-600 dark:text-cyan-400"
					/>
					<p className="text-sm font-semibold text-[var(--ink,#0f172a)]">
						Все зубы интактны (здоровы)
					</p>
					<p className="text-xs max-w-xs mt-1 text-[var(--muted,#64748b)]">
						Отметьте патологии на формуле, чтобы позиции автоматически
						добавились в смету
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[380px]">
			{visibleBaseItems.map((item) => (
				<LiveInvoiceItemRow
					key={`${item.toothNumber}-${item.code}`}
					item={item}
					onUpdateQty={onUpdateQty}
					onExcludeItem={onExcludeItem}
				/>
			))}

			{baseItems.length > visibleItemsLimit && (
				<div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[var(--paper-soft,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-xs">
					<span className="text-[var(--muted,#64748b)] font-medium">
						Показано {visibleBaseItems.length} из {baseItems.length} позиций
					</span>
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={() => onSetVisibleItemsLimit((prev) => prev + 30)}
							className="px-2.5 py-1 rounded bg-cyan-600 text-white font-medium hover:bg-cyan-700 transition-colors cursor-pointer"
						>
							Загрузить ещё 30
						</button>
						<button
							type="button"
							onClick={() => onSetVisibleItemsLimit(baseItems.length)}
							className="px-2 py-1 rounded bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] font-medium border border-[var(--border,#cbd5e1)] hover:bg-[var(--paper-soft,#f8fafc)] transition-colors cursor-pointer"
						>
							Все ({baseItems.length})
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

import { Minus, Plus, Trash2 } from "lucide-react";
import type React from "react";
import type { LiveInvoiceItem } from "./odontogramLiveInvoiceCalculations";

export interface LiveInvoiceItemRowProps {
	readonly item: LiveInvoiceItem;
	readonly onUpdateQty: (itemKey: string, delta: number) => void;
	readonly onExcludeItem: (itemKey: string) => void;
}

export const LiveInvoiceItemRow: React.FC<LiveInvoiceItemRowProps> = ({
	item,
	onUpdateQty,
	onExcludeItem,
}) => {
	const itemKey = `${item.toothNumber}-${item.code}`;
	const itemSubtotal = item.price * item.quantity;

	return (
		<div className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-[var(--paper-soft,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] hover:border-cyan-500/50 hover:bg-[var(--paper-strong,var(--paper,#ffffff))] transition-all">
			<div className="flex flex-col gap-0.5 flex-1 min-w-0">
				<div className="flex items-center gap-1.5 flex-wrap">
					<span className="text-xs font-black text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 font-mono">
						#{item.toothNumber}
					</span>
					<span className="text-xs text-[var(--muted,#64748b)] font-mono font-semibold">
						{item.code}
					</span>
					<span className="text-xs px-1.5 py-0.2 rounded-md bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--muted,#64748b)] font-bold border border-[var(--border,#cbd5e1)]">
						{item.category}
					</span>
				</div>
				<span className="text-xs font-medium text-[var(--ink,#0f172a)] line-clamp-2">
					{item.title}
				</span>
				<div className="flex items-center gap-2 mt-1">
					<div className="flex items-center gap-1 bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] rounded-md px-1 py-0.5">
						<button
							type="button"
							onClick={() => onUpdateQty(itemKey, -1)}
							className="min-h-[44px] sm:min-h-[32px] min-w-[44px] flex items-center justify-center p-1 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer"
							title="Уменьшить количество"
							aria-label={`Уменьшить количество для зуба ${item.toothNumber}`}
						>
							<Minus size={13} />
						</button>
						<span className="text-xs font-mono font-bold px-1.5">
							{item.quantity}
						</span>
						<button
							type="button"
							onClick={() => onUpdateQty(itemKey, 1)}
							className="min-h-[44px] sm:min-h-[32px] min-w-[44px] flex items-center justify-center p-1 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer"
							title="Увеличить количество"
							aria-label={`Увеличить количество для зуба ${item.toothNumber}`}
						>
							<Plus size={13} />
						</button>
					</div>
					<button
						type="button"
						onClick={() => onExcludeItem(itemKey)}
						className="min-h-[44px] sm:min-h-[32px] px-2 text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer ml-1"
						title="Исключить из сметы"
					>
						<Trash2 size={12} />
						<span>Убрать</span>
					</button>
				</div>
			</div>
			<div className="text-right shrink-0">
				<span className="text-sm font-bold text-[var(--ink,#0f172a)] font-mono">
					{itemSubtotal.toLocaleString("ru-RU")} ₽
				</span>
				{item.quantity > 1 && (
					<div className="text-xs text-[var(--muted,#64748b)] font-mono font-semibold">
						{item.price.toLocaleString("ru-RU")} ₽/ед.
					</div>
				)}
			</div>
		</div>
	);
};

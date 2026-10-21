import { Layers } from "lucide-react";
import type React from "react";

export interface LiveInvoiceCategoryBreakdownProps {
	readonly categoryBreakdown: Record<
		string,
		{ count: number; subtotal: number }
	>;
}

export const LiveInvoiceCategoryBreakdown: React.FC<
	LiveInvoiceCategoryBreakdownProps
> = ({ categoryBreakdown }) => {
	const entries = Object.entries(categoryBreakdown);
	if (entries.length === 0) return null;

	return (
		<div className="px-3 py-2 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--border,#cbd5e1)] flex flex-wrap items-center gap-1.5 text-xs">
			<span className="text-[var(--muted,#64748b)] font-semibold flex items-center gap-1">
				<Layers size={12} /> Разделы:
			</span>
			{entries.map(([cat, stat]) => (
				<span
					key={cat}
					className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] font-medium"
				>
					<span>{cat}:</span>
					<strong className="text-emerald-600 dark:text-emerald-400 font-mono">
						{stat.subtotal.toLocaleString("ru-RU")} ₽
					</strong>
				</span>
			))}
		</div>
	);
};

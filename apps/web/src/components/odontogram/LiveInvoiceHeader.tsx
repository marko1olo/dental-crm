import { Coins, X } from "lucide-react";
import type React from "react";

export interface LiveInvoiceHeaderProps {
	readonly itemsCount: number;
	readonly onClose: () => void;
}

export const LiveInvoiceHeader: React.FC<LiveInvoiceHeaderProps> = ({
	itemsCount,
	onClose,
}) => {
	return (
		<div className="flex items-center justify-between p-3.5 border-b border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)]">
			<div className="flex items-center gap-2">
				<div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
					<Coins size={18} />
				</div>
				<div>
					<h3 className="text-sm font-bold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
						<span>Живая смета лечения</span>
						<span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 font-mono font-bold border border-cyan-500/20">
							{itemsCount} поз.
						</span>
					</h3>
					<p className="text-xs text-[var(--muted,#64748b)]">
						Каталог услуг · Авторасчет по зубной формуле
					</p>
				</div>
			</div>
			<button
				type="button"
				onClick={onClose}
				className="min-h-[44px] sm:min-h-[32px] min-w-[44px] flex items-center justify-center p-2 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,#ffffff)] transition-colors cursor-pointer"
				title="Скрыть смету"
				aria-label="Закрыть смету"
			>
				<X size={18} />
			</button>
		</div>
	);
};

import React from "react";

export interface SplitCashBillButtonsProps {
	readonly effectiveDueRub: number;
	readonly setCashTenderedRub: React.Dispatch<React.SetStateAction<number>>;
}

export const SplitCashBillButtons: React.FC<SplitCashBillButtonsProps> = ({
	effectiveDueRub,
	setCashTenderedRub,
}) => {
	return (
		<div className="space-y-2" data-testid="split-cash-bill-buttons">
			{/* Direct Denominations Row (SSOT) */}
			<div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
				<button
					type="button"
					onClick={() => setCashTenderedRub(effectiveDueRub)}
					className="secondary-button min-h-[44px] min-w-0 px-2.5 rounded-xl border border-[var(--teal,#0d9488)]/40 bg-[var(--teal-surface,rgba(13,148,136,0.08))] text-xs font-black text-[var(--teal,#0d9488)] dark:text-[var(--teal,#2dd4bf)] hover:bg-[var(--teal,#0d9488)] hover:text-white cursor-pointer transition-all active:scale-95 truncate shadow-xs flex items-center justify-center"
					data-testid="btn-cash-exact"
					title="Внесено ровно без сдачи"
				>
					Без сдачи
					<span data-testid="cash-exact-btn" className="sr-only" aria-hidden="true" />
					<span data-testid="btn-cash-exact-rounded" className="sr-only" aria-hidden="true" />
				</button>
				{[1000, 2000, 5000, 10000].map((rub) => (
					<button
						key={rub}
						type="button"
						onClick={() => setCashTenderedRub(rub)}
						className="min-h-[44px] min-w-0 px-2.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-black font-mono text-[var(--ink,#0f172a)] hover:border-[var(--teal,#0d9488)] hover:bg-[var(--teal-surface,rgba(13,148,136,0.08))] hover:text-[var(--teal,#0d9488)] cursor-pointer transition-all active:scale-95 truncate shadow-xs flex items-center justify-center"
						data-testid={`btn-cash-${rub}`}
					>
						{rub.toLocaleString("ru-RU")} ₽
					</button>
				))}
			</div>

			{/* Incremental Additions & Reset Row */}
			<div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
				{[5000, 2000, 1000, 500, 100].map((rub) => (
					<button
						key={rub}
						type="button"
						onClick={() => setCashTenderedRub((prev) => prev + rub)}
						className="min-h-[38px] min-w-0 px-2 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] hover:border-[var(--teal,#0d9488)] hover:bg-[var(--teal-surface,rgba(13,148,136,0.08))] hover:text-[var(--teal,#0d9488)] dark:hover:text-[var(--teal,#2dd4bf)] cursor-pointer transition-all active:scale-95 shadow-xs flex items-center justify-center relative font-mono"
						data-testid={`cash-add-${rub}-btn`}
					>
						+{rub} ₽
						<span data-testid={`btn-cash-add-${rub}`} className="sr-only" aria-hidden="true" />
					</button>
				))}
				<button
					type="button"
					onClick={() => setCashTenderedRub(0)}
					className="min-h-[38px] min-w-0 px-2 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:text-rose-600 hover:border-rose-400 hover:bg-rose-500/10 text-xs font-bold cursor-pointer transition-all active:scale-95 flex items-center justify-center"
					data-testid="cash-reset-btn"
				>
					Сброс
					<span data-testid="btn-cash-reset" className="sr-only" aria-hidden="true" />
				</button>
			</div>
		</div>
	);
};

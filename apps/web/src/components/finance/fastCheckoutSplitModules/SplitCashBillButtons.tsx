import type React from "react";

export interface SplitCashBillButtonsProps {
	readonly effectiveDueRub: number;
	readonly setCashTenderedRub: React.Dispatch<React.SetStateAction<number>>;
}

export const SplitCashBillButtons: React.FC<SplitCashBillButtonsProps> = ({
	effectiveDueRub,
	setCashTenderedRub,
}) => {
	return (
		<div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
			{[5000, 2000, 1000, 500, 100].map((rub) => (
				<button
					key={rub}
					type="button"
					onClick={() => setCashTenderedRub((prev) => prev + rub)}
					className="min-h-[52px] min-w-0 px-2 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-base font-extrabold text-[var(--ink,#0f172a)] hover:border-[var(--teal,#0d9488)] hover:bg-[var(--teal-surface,rgba(13,148,136,0.08))] hover:text-[var(--teal,#0d9488)] dark:hover:text-[var(--teal,#2dd4bf)] cursor-pointer transition-all active:scale-95 shadow-xs flex items-center justify-center relative font-mono"
					data-testid={`cash-add-${rub}-btn`}
				>
					+{rub} ₽
					<span
						data-testid={`btn-cash-add-${rub}`}
						className="sr-only"
						aria-hidden="true"
					/>
				</button>
			))}
			<button
				type="button"
				onClick={() => setCashTenderedRub(effectiveDueRub)}
				className="primary-button min-h-[52px] min-w-0 px-2 rounded-xl bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] text-sm font-extrabold hover:bg-[var(--teal-hover,#0f766e)] cursor-pointer transition-all active:scale-95 shadow-xs flex items-center justify-center"
				data-testid="cash-exact-btn"
			>
				Ровно
				<span
					data-testid="btn-cash-exact-rounded"
					className="sr-only"
					aria-hidden="true"
				/>
			</button>
			<button
				type="button"
				onClick={() => setCashTenderedRub(0)}
				className="min-h-[52px] min-w-0 px-2 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:text-rose-600 hover:border-rose-400 hover:bg-rose-500/10 text-sm font-extrabold cursor-pointer transition-all active:scale-95 flex items-center justify-center"
				data-testid="cash-reset-btn"
			>
				Сброс
				<span
					data-testid="btn-cash-reset"
					className="sr-only"
					aria-hidden="true"
				/>
			</button>
		</div>
	);
};

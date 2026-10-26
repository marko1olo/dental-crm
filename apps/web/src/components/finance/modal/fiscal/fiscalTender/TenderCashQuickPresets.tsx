import React from "react";
import { formatMoneyRu } from "../fiscalModalRefundLogic";

export interface TenderCashQuickPresetsProps {
	readonly cashAmount: number;
	readonly receivedCashRub: number;
	readonly setReceivedCashRub: React.Dispatch<React.SetStateAction<number>>;
}

export const TenderCashQuickPresets: React.FC<TenderCashQuickPresetsProps> = ({
	cashAmount,
	receivedCashRub,
	setReceivedCashRub,
}) => {
	return (
		<div className="space-y-1.5">
			<div className="flex items-center justify-between">
				<label className="text-xs font-semibold text-[var(--muted,#64748b)]">Купюры и быстрый ввод:</label>
				{receivedCashRub > 0 && (
					<button
						type="button"
						onClick={() => setReceivedCashRub(0)}
						className="text-[11px] text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
						data-testid="btn-cash-reset"
					>
						Сброс (0 ₽)
					</button>
				)}
			</div>

			<div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
				<button
					type="button"
					onClick={() => setReceivedCashRub(cashAmount)}
					className={`min-h-[44px] h-11 sm:h-8 px-3 rounded-xl text-xs font-extrabold cursor-pointer transition-all flex items-center justify-center text-center ${
						receivedCashRub === cashAmount
							? "bg-emerald-600 text-white shadow-xs"
							: "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200 border border-emerald-300 dark:border-emerald-700"
					}`}
					data-testid="btn-cash-exact"
				>
					Без сдачи ({formatMoneyRu(cashAmount)})
				</button>
				{[1000, 2000, 5000].map((val) => (
					<button
						key={val}
						type="button"
						onClick={() => setReceivedCashRub(val)}
						className={`min-h-[44px] h-11 sm:h-8 px-3 rounded-xl text-xs font-bold font-mono cursor-pointer transition-all flex items-center justify-center text-center ${
							receivedCashRub === val
								? "bg-emerald-600 text-white shadow-xs"
								: "bg-[var(--paper-soft,#f8fafc)] hover:bg-slate-200 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] border border-[var(--border,#cbd5e1)]"
						}`}
						data-testid={`btn-cash-${val}`}
					>
						{val.toLocaleString("ru-RU")} ₽
					</button>
				))}
			</div>

			<div className="flex items-center gap-1.5 flex-wrap pt-1">
				<span className="text-[11px] text-[var(--muted,#64748b)]">Добавить:</span>
				{[500, 1000, 2000, 5000].map((val) => (
					<button
						key={`add-${val}`}
						type="button"
						onClick={() => setReceivedCashRub((prev) => (prev || cashAmount) + val)}
						className="min-h-[32px] h-7 px-2 rounded-lg text-[11px] font-semibold bg-[var(--paper-soft,#f8fafc)] hover:bg-slate-200 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] border border-[var(--border,#cbd5e1)] cursor-pointer transition-colors inline-flex items-center justify-center"
					>
						+{val.toLocaleString("ru-RU")} ₽
					</button>
				))}
			</div>
		</div>
	);
};

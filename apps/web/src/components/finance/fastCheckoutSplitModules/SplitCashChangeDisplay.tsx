import { Check } from "lucide-react";
import type React from "react";

export interface SplitCashChangeDisplayProps {
	readonly cashTenderedRub: number;
	readonly cashChange: {
		readonly changeDueKop: number;
		readonly missingKop: number;
		readonly isUnderpaid: boolean;
	};
}

export const SplitCashChangeDisplay: React.FC<SplitCashChangeDisplayProps> = ({
	cashTenderedRub,
	cashChange,
}) => {
	return (
		<div className="p-4 rounded-xl bg-[var(--paper,#ffffff)] border-2 border-[var(--line,#e2e8f0)] flex items-center justify-between flex-wrap gap-3">
			<div className="flex flex-col">
				<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
					Внесено наличных:
				</span>
				<span className="text-xl sm:text-2xl font-black font-mono text-[var(--ink,#0f172a)]">
					{cashTenderedRub.toLocaleString("ru-RU", {
						minimumFractionDigits: 2,
					})}{" "}
					₽
				</span>
			</div>

			<div className="flex flex-col items-end">
				{cashTenderedRub === 0 ? (
					<span className="text-sm font-bold text-[var(--muted,#64748b)]">
						Нажмите купюру или кнопку «Ровно»
					</span>
				) : !cashChange.isUnderpaid && cashChange.changeDueKop > 0 ? (
					<>
						<span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
							Сдача пациенту:
						</span>
						<span
							className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400"
							data-testid="cash-change-due-amount"
						>
							+
							{(cashChange.changeDueKop / 100).toLocaleString("ru-RU", {
								minimumFractionDigits: 2,
							})}{" "}
							₽
						</span>
					</>
				) : !cashChange.isUnderpaid && cashChange.changeDueKop === 0 ? (
					<span
						className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5"
						data-testid="cash-change-exact"
					>
						<Check
							size={20}
							className="inline mr-1 shrink-0 text-emerald-500"
						/>
						<span>БЕЗ СДАЧИ (РОВНО)</span>
					</span>
				) : (
					<>
						<span className="text-xs font-bold uppercase tracking-wider text-rose-600">
							Не хватает:
						</span>
						<span
							className="text-2xl sm:text-3xl font-black font-mono text-rose-600"
							data-testid="cash-missing-amount"
						>
							-
							{(cashChange.missingKop / 100).toLocaleString("ru-RU", {
								minimumFractionDigits: 2,
							})}{" "}
							₽
						</span>
					</>
				)}
			</div>
		</div>
	);
};

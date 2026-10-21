import React from "react";
import { Percent } from "lucide-react";

export interface Installment0PercentCardProps {
	readonly totalRub: number;
	readonly selectedMonths: 3 | 6 | 12 | 24;
	readonly onSelectMonths: (months: 3 | 6 | 12 | 24) => void;
}

export const Installment0PercentCard: React.FC<Installment0PercentCardProps> = ({
	totalRub,
	selectedMonths,
	onSelectMonths,
}) => {
	const monthlyRub = Math.round(totalRub / selectedMonths);

	return (
		<section className="p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs">
			<div className="flex items-center justify-between gap-3 flex-wrap mb-4">
				<div className="flex items-center gap-2.5">
					<div className="w-9 h-9 rounded-xl bg-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center shrink-0">
						<Percent size={18} />
					</div>
					<div>
						<h3 className="text-sm sm:text-base font-bold text-[var(--ink)] m-0">
							Беспроцентная рассрочка 0%
						</h3>
						<p className="text-xs text-[var(--muted)] m-0">
							Оплата равными частями без переплат и скрытых комиссий
						</p>
					</div>
				</div>

				<div
					className="inline-flex items-center p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)]"
					role="group"
					aria-label="Срок рассрочки"
				>
					{([3, 6, 12, 24] as const).map((m) => (
						<button
							key={m}
							type="button"
							onClick={() => onSelectMonths(m)}
							className={`min-h-[36px] min-w-[48px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
								selectedMonths === m
									? "bg-[var(--paper)] text-[var(--teal)] shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							{m} мес.
						</button>
					))}
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)]">
				<div>
					<span className="text-[11px] text-[var(--muted)] block">Платеж в месяц</span>
					<span className="text-lg sm:text-xl font-black text-[var(--teal)] font-mono">
						{monthlyRub.toLocaleString("ru-RU")} ₽/мес
					</span>
				</div>
				<div>
					<span className="text-[11px] text-[var(--muted)] block">Общая сумма плана</span>
					<span className="text-base sm:text-lg font-bold text-[var(--ink)] font-mono">
						{totalRub.toLocaleString("ru-RU")} ₽
					</span>
				</div>
				<div>
					<span className="text-[11px] text-[var(--muted)] block">Переплата банку / клинике</span>
					<span className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
						0 ₽ (0%)
					</span>
				</div>
			</div>
		</section>
	);
};

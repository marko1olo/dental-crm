import React from "react";
import type { DentalLabOrderData } from "../DentalLabOrderModal";

export interface TimelineTrialDatesCardsProps {
	order: DentalLabOrderData;
}

export function TimelineTrialDatesCards({ order }: TimelineTrialDatesCardsProps): React.JSX.Element {
	return (
		<div className="pt-2 border-t border-[var(--line)] grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
			<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
				<span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1">
					1. Примерка каркаса
				</span>
				<div className="font-bold font-mono text-[var(--ink)]">
					{order.frameworkTrialDate
						? new Date(order.frameworkTrialDate).toLocaleDateString("ru-RU")
						: "Не назначена"}
				</div>
			</div>

			<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
				<span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1">
					2. Примерка керамики / Бисквит
				</span>
				<div className="font-bold font-mono text-[var(--ink)]">
					{order.ceramicTrialDate
						? new Date(order.ceramicTrialDate).toLocaleDateString("ru-RU")
						: "Не назначена"}
				</div>
			</div>

			<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
				<span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1">
					3. Готовность / Фиксация
				</span>
				<div className="font-bold font-mono text-teal-600 dark:text-teal-400">
					{order.dueDate
						? new Date(order.dueDate).toLocaleDateString("ru-RU")
						: "Не установлен"}
				</div>
			</div>
		</div>
	);
}

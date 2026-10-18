import React from "react";
import { Check, Droplets } from "lucide-react";
import type { DisinfectantSolutionRecord } from "./disinfectantTypes";

export interface DisinfectantMobileCardsProps {
	readonly records: readonly DisinfectantSolutionRecord[];
}

export const DisinfectantMobileCards: React.FC<DisinfectantMobileCardsProps> = ({ records }) => {
	if (records.length === 0) {
		return (
			<div className="p-5 text-center text-xs text-[var(--muted)] bg-[var(--paper)] rounded-2xl border border-[var(--line)]">
				Нет зарегистрированных дезрастворов
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2.5">
			{records.map((r) => (
				<div key={r.id} className="p-3.5 rounded-2xl border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-2 shadow-xs">
					<div className="flex items-center justify-between gap-2">
						<span className="font-bold text-[14px] text-[var(--ink)]">{r.tradeNameRu}</span>
						<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-teal-500/10 text-[var(--teal)]">
							<Droplets size={11} /> {r.concentrationPercent}% ({r.volumeLiters} л)
						</span>
					</div>
					<div className="text-xs text-[var(--muted)]">{r.purposeRu}</div>
					<div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--line-subtle)]">
						<span className="text-[var(--muted)]">Годен: <strong className="text-[var(--ink)]">{r.expiryDate}</strong></span>
						<span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
							<Check size={12} /> Активен (норма)
						</span>
					</div>
				</div>
			))}
		</div>
	);
};

export default DisinfectantMobileCards;

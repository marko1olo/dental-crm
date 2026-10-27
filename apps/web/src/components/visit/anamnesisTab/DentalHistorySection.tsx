/**
 * apps/web/src/components/visit/anamnesisTab/DentalHistorySection.tsx
 *
 * Блок 3: Стоматологический анамнез (опыт анестезии, дентофобия, кровоточивость).
 */

import React from "react";
import { Activity, Check, Plus } from "lucide-react";
import { DENTAL_HISTORY_ITEMS } from "./types";

export interface DentalHistorySectionProps {
	readonly selectedHistory: readonly string[];
	readonly toggleHistory: (label: string) => void;
}

export const DentalHistorySection: React.FC<DentalHistorySectionProps> = ({
	selectedHistory,
	toggleHistory,
}) => {
	return (
		<div className="space-y-2.5">
			<label className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 flex items-center gap-2 uppercase tracking-wider">
				<Activity className="w-4 h-4 text-purple-500" />
				<span>3. Стоматологический анамнез (Опыт анестезии, дентофобия, кровоточивость)</span>
			</label>
			<div className="flex flex-wrap gap-2">
				{DENTAL_HISTORY_ITEMS.map((item) => {
					const isSelected = selectedHistory.includes(item.label);
					const activeClass = item.isAlert
						? "anamnesis-chip--active-purple-alert"
						: "anamnesis-chip--active-purple";
					return (
						<button
							key={item.id}
							type="button"
							onClick={() => toggleHistory(item.label)}
							data-testid={`toggle-history-${item.id}`}
							className={`anamnesis-chip ${isSelected ? activeClass : ""}`}
						>
							{isSelected ? (
								<Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
							) : (
								<Plus className="w-3.5 h-3.5 text-[var(--muted,#64748b)]" />
							)}
							<span>{item.label}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
};

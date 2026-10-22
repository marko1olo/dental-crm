/**
 * HomeCareRecommendationsGrid.tsx — Сетка клинических назначений домашнего ухода (Curaprox, Монопучок, Ершики, Ирригатор, Паста RDA < 50).
 * (Layer 4 UI View).
 */

import React from "react";
import type { HygieneHomeCareRecommendations } from "./homeCarePresets";

export interface HomeCareRecommendationsGridProps {
	readonly care: HygieneHomeCareRecommendations;
}

export const HomeCareRecommendationsGrid: React.FC<
	HomeCareRecommendationsGridProps
> = ({ care }) => {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
			<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1 min-w-0">
				<span className="font-bold text-teal-700 dark:text-teal-400 text-[11px] truncate">
					1. Зубная щетка (основная)
				</span>
				<p className="text-[var(--ink)] text-xs leading-relaxed">
					{care.toothbrush}
				</p>
			</div>

			<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1 min-w-0">
				<span className="font-bold text-teal-700 dark:text-teal-400 text-[11px] truncate">
					2. Монопучковая щетка
				</span>
				<p className="text-[var(--ink)] text-xs leading-relaxed">
					{care.monotufts}
				</p>
			</div>

			<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1 min-w-0">
				<span className="font-bold text-teal-700 dark:text-teal-400 text-[11px] truncate">
					3. Межзубные ершики (калибр)
				</span>
				<p className="text-[var(--ink)] text-xs leading-relaxed">
					{care.interdentalBrushes}
				</p>
			</div>

			<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1 min-w-0">
				<span className="font-bold text-teal-700 dark:text-teal-400 text-[11px] truncate">
					4. Зубная нить (флосс)
				</span>
				<p className="text-[var(--ink)] text-xs leading-relaxed">{care.floss}</p>
			</div>

			<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1 min-w-0">
				<span className="font-bold text-teal-700 dark:text-teal-400 text-[11px] truncate">
					5. Ирригатор полости рта
				</span>
				<p className="text-[var(--ink)] text-xs leading-relaxed">
					{care.irrigator}
				</p>
			</div>

			<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1 min-w-0">
				<span className="font-bold text-teal-700 dark:text-teal-400 text-[11px] truncate">
					6. Зубная паста (RDA &lt; 50)
				</span>
				<p className="text-[var(--ink)] text-xs leading-relaxed">
					{care.toothpaste}
				</p>
			</div>
		</div>
	);
};

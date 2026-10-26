import React from "react";
import type { SomaticStopFactor } from "@dental/shared";
import { SomaticCategoryIcon } from "./SomaticCategoryIcon";

export interface SomaticFactorCardProps {
	readonly factor: SomaticStopFactor;
}

export const SomaticFactorCard: React.FC<SomaticFactorCardProps> = ({ factor }) => {
	const severityBadgeClass =
		factor.severity === "critical"
			? "bg-rose-600/15 text-rose-700 dark:text-rose-300 border border-rose-500/40"
			: "bg-amber-600/15 text-amber-700 dark:text-amber-300 border border-amber-500/40";

	return (
		<div className="flex flex-col gap-1.5 p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)]">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-1.5 font-bold text-xs text-[var(--ink)]">
					<SomaticCategoryIcon category={factor.category} />
					<span>{factor.title}</span>
				</div>
				<span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-sm ${severityBadgeClass}`}>
					{factor.severity === "critical" ? "Высокий риск" : "Внимание"}
				</span>
			</div>

			{factor.detectedItems.length > 0 && (
				<div className="text-[11px] text-[var(--ink-muted)] font-medium">
					Выявлено: <span className="text-[var(--ink)] font-semibold">{factor.detectedItems.join(", ")}</span>
				</div>
			)}

			{factor.prohibitions.length > 0 && (
				<div className="flex flex-col gap-0.5 mt-0.5">
					<span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400">
						Противопоказания:
					</span>
					<ul className="list-disc list-inside text-xs text-rose-900 dark:text-rose-200 space-y-0.5 pl-0.5">
						{factor.prohibitions.map((p, idx) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: fixed prohibition item
							<li key={idx} className="leading-tight">
								{p}
							</li>
						))}
					</ul>
				</div>
			)}

			{factor.recommendations.length > 0 && (
				<div className="flex flex-col gap-0.5 mt-0.5">
					<span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
						Рекомендации у кресла:
					</span>
					<ul className="list-disc list-inside text-xs text-[var(--ink)] space-y-0.5 pl-0.5">
						{factor.recommendations.map((r, idx) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: fixed recommendation item
							<li key={idx} className="leading-tight">
								{r}
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
};

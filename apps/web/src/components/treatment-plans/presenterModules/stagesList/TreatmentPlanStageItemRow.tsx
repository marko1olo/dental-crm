import React from "react";
import type { TreatmentPlanItem } from "../treatmentPlanPresenterTypes.js";

export interface TreatmentPlanStageItemRowProps {
	readonly item: TreatmentPlanItem;
	readonly index: number;
}

export const TreatmentPlanStageItemRow: React.FC<TreatmentPlanStageItemRowProps> = ({
	item,
	index,
}) => {
	const toothBadge =
		item.toothNumber && item.toothNumber > 0 ? (
			<span className="px-1.5 py-0.5 rounded bg-[var(--teal-soft)] text-[var(--teal)] font-mono text-[11px] font-bold">
				Зуб {item.toothNumber}
			</span>
		) : null;

	const itemTotalRub = (item.priceRub || 0) * (item.quantity || 1);

	return (
		<div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line-subtle)] hover:border-[var(--line)] transition-colors">
			<div className="flex items-center gap-2.5 min-w-0 flex-1">
				<div className="w-5 h-5 rounded-full bg-[var(--paper-soft)] text-[var(--muted)] text-[10px] flex items-center justify-center font-bold shrink-0">
					{index + 1}
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2 flex-wrap">
						{item.code804n && (
							<span className="text-[10.5px] font-mono text-[var(--muted)] font-semibold">
								{item.code804n}
							</span>
						)}
						{toothBadge}
						<span className="text-xs sm:text-sm font-medium text-[var(--ink)] truncate">
							{item.name}
						</span>
					</div>
					{item.quantity && item.quantity > 1 && (
						<div className="text-[11px] text-[var(--muted)] mt-0.5">
							{item.quantity} шт. × {(item.priceRub || 0).toLocaleString("ru-RU")} ₽
						</div>
					)}
				</div>
			</div>

			<div className="text-right shrink-0">
				<span className="text-xs sm:text-sm font-bold text-[var(--ink)] font-mono">
					{itemTotalRub.toLocaleString("ru-RU")} ₽
				</span>
			</div>
		</div>
	);
};

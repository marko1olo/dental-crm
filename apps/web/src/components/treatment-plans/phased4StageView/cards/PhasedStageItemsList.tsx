import React from "react";
import type { TreatmentPlanStageCategory } from "@dental/shared";
import type { PhasedStageItem } from "../types";

export interface PhasedStageItemsListProps {
	readonly category: TreatmentPlanStageCategory;
	readonly visibleItems: readonly PhasedStageItem[];
	readonly microConsumables: readonly PhasedStageItem[];
	readonly primaryItems: readonly PhasedStageItem[];
	readonly showConsumables: boolean;
	readonly microConsumablesTotalRub: number;
	readonly onToggleConsumables: (category: TreatmentPlanStageCategory, e: React.MouseEvent) => void;
}

export const PhasedStageItemsList: React.FC<PhasedStageItemsListProps> = ({
	category,
	visibleItems,
	microConsumables,
	primaryItems,
	showConsumables,
	microConsumablesTotalRub,
	onToggleConsumables,
}) => {
	return (
		<div className="divide-y divide-[var(--line)]">
			{visibleItems.map((item, itemIdx) => (
				<div key={`${item.id}-${itemIdx}`} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs">
					<div className="flex items-start gap-2.5 min-w-0 flex-1">
						<span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[var(--paper-soft)] text-[10px] font-bold text-[var(--ink-muted)] border border-[var(--line)]">
							{itemIdx + 1}
						</span>
						<div className="min-w-0 flex-1">
							<div className="font-semibold text-[var(--ink)] flex items-center gap-2 flex-wrap">
								<span>{item.name}</span>
								{item.toothNumber && (
									<span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold bg-[color-mix(in_srgb,var(--teal)_12%,var(--paper))] text-[var(--teal)] border border-[color-mix(in_srgb,var(--teal)_28%,transparent)]">
										Зуб {item.toothNumber}
									</span>
								)}
								<span className="font-mono text-[10px] text-[var(--ink-muted)] bg-[var(--paper-soft)] px-1.5 py-0.5 rounded border border-[var(--line)]">
									Код: {item.serviceCode || item.code804n}
								</span>
							</div>
							{item.clinicalJustification && (
								<div className="text-[11px] text-[var(--ink-muted)] mt-0.5">
									Клиническая цель: {item.clinicalJustification}
								</div>
							)}
						</div>
					</div>
					<div className="text-right font-bold text-[var(--ink)] tabular-nums shrink-0">
						{item.priceRub.toLocaleString("ru-RU")} ₽
					</div>
				</div>
			))}

			{microConsumables.length > 0 && primaryItems.length > 0 && (
				<div className="pt-2.5 pb-1 flex items-center justify-between gap-2">
					<button
						type="button"
						onClick={(e) => onToggleConsumables(category, e)}
						className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
					>
						<span className="inline-flex items-center justify-center w-4 h-4 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[10px] font-bold">
							{showConsumables ? "−" : "+"}
						</span>
						<span>
							{showConsumables
								? `Скрыть расходные материалы и анестезию (${microConsumables.length} поз.)`
								: `Включено в протокол: Коффердам, карпульная анестезия и микро-расходники (${microConsumables.length} поз.)`}
						</span>
					</button>
					{!showConsumables && (
						<span className="text-[11px] font-semibold text-[var(--ink-muted)] tabular-nums">
							{microConsumablesTotalRub.toLocaleString("ru-RU")} ₽
						</span>
					)}
				</div>
			)}
		</div>
	);
};

import React from "react";
import { Layers } from "lucide-react";
import type { PlanStageOption } from "./visitPlanStageHandoff";

export interface VisitPlanStageHandoffChipsProps {
	readonly stages: readonly PlanStageOption[];
	readonly allPlanItemsCount: number;
	readonly selectedStageKey: number | "all";
	readonly onSelectStageKey: (key: number | "all") => void;
}

export const VisitPlanStageHandoffChips: React.FC<VisitPlanStageHandoffChipsProps> = ({
	stages,
	allPlanItemsCount,
	selectedStageKey,
	onSelectStageKey,
}) => {
	return (
		<div
			data-testid="handoff-stage-chips-selector"
			className="pt-1.5 border-t border-[var(--teal,#0d9488)]/20 flex items-center gap-1.5 flex-wrap"
		>
			<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] mr-1 flex items-center gap-1">
				<Layers size={13} />
				<span>Этап визита:</span>
			</span>

			{stages.map((stg) => {
				const isSelected = selectedStageKey === stg.stageNumber;
				const isTarget = stg.isCurrentTarget;

				return (
					<button
						key={stg.stageNumber}
						type="button"
						data-testid={`handoff-stage-chip-${stg.stageNumber}`}
						onClick={() => onSelectStageKey(stg.stageNumber)}
						style={{
							backgroundColor: isSelected ? "var(--teal-fill)" : "var(--paper)",
							color: isSelected ? "var(--on-teal)" : "var(--ink)",
							borderColor: isSelected ? "var(--teal-fill)" : "var(--line)",
						}}
						className="min-h-[38px] sm:min-h-[28px] px-3 sm:px-2.5 py-1.5 sm:py-1 rounded-lg text-xs sm:text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer border shadow-2xs touch-manipulation"
					>
						<span>Этап {stg.stageNumber}</span>
						{isTarget && (
							<span
								style={{
									backgroundColor: isSelected
										? "rgba(255,255,255,0.25)"
										: "var(--teal-surface, rgba(13,148,136,0.12))",
									color: isSelected ? "var(--on-teal)" : "var(--teal-dark, var(--teal))",
								}}
								className="text-[9px] px-1 py-0.5 rounded font-bold"
								title="Целевой этап из записи расписания"
							>
								Запись
							</span>
						)}
						<span className="opacity-80 text-[10px]">({stg.items.length})</span>
					</button>
				);
			})}

			<button
				type="button"
				data-testid="handoff-stage-chip-all"
				onClick={() => onSelectStageKey("all")}
				style={{
					backgroundColor: selectedStageKey === "all" ? "var(--teal-fill)" : "var(--paper)",
					color: selectedStageKey === "all" ? "var(--on-teal)" : "var(--ink)",
					borderColor: selectedStageKey === "all" ? "var(--teal-fill)" : "var(--line)",
				}}
				className="min-h-[38px] sm:min-h-[28px] px-3 sm:px-2.5 py-1.5 sm:py-1 rounded-lg text-xs sm:text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer border shadow-2xs touch-manipulation"
			>
				<span>Все услуги</span>
				<span className="opacity-80 text-[10px]">({allPlanItemsCount})</span>
			</button>
		</div>
	);
};

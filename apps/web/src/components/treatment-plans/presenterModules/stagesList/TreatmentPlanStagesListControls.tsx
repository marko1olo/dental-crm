import React from "react";

export interface TreatmentPlanStagesListControlsProps {
	readonly totalStages: number;
	readonly durationVisits: number;
	readonly allExpanded: boolean;
	readonly onToggleAllStages: (expand: boolean) => void;
}

export const TreatmentPlanStagesListControls: React.FC<TreatmentPlanStagesListControlsProps> = ({
	totalStages,
	durationVisits,
	allExpanded,
	onToggleAllStages,
}) => {
	return (
		<div className="flex items-center justify-between px-1 py-1 text-xs text-[var(--muted)]">
			<span className="font-medium">
				Всего этапов: <strong className="text-[var(--ink)]">{totalStages}</strong> · Визитов:{" "}
				<strong className="text-[var(--ink)]">{durationVisits}</strong>
			</span>
			<button
				type="button"
				onClick={() => onToggleAllStages(!allExpanded)}
				className="min-h-[36px] min-w-[44px] px-2.5 py-1 text-xs rounded-lg text-[var(--teal)] hover:bg-[var(--teal-soft)] transition-colors cursor-pointer font-semibold inline-flex items-center gap-1 active:scale-98"
				aria-label={allExpanded ? "Свернуть все этапы" : "Развернуть все этапы"}
			>
				{allExpanded ? "Свернуть все" : "Развернуть все"}
			</button>
		</div>
	);
};

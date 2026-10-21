import React from "react";
import { Check } from "lucide-react";

export function getStagePartyRu(stageId: string): string {
	switch (stageId) {
		case "impression_taken":
			return "Врач-ортопед";
		case "courier_sent":
			return "Курьер ЗТЛ";
		case "framework_fitting":
			return "Примерка";
		case "ceramic_layering":
			return "Зубной техник";
		case "ready_in_clinic":
			return "В клинике";
		case "patient_fixation":
			return "Фиксация";
		default:
			return "ЗТЛ";
	}
}

export interface TimelineStepItemProps {
	step: { id: string; shortLabelRu: string };
	idx: number;
	isPassed: boolean;
	isCurrent: boolean;
	onClick: () => void;
}

export function TimelineStepItem({
	step, idx, isPassed, isCurrent, onClick,
}: TimelineStepItemProps): React.JSX.Element {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`min-h-[44px] sm:min-h-[48px] p-2 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer relative touch-manipulation select-none ${
				isCurrent
					? "bg-teal-500/15 border-teal-600 ring-2 ring-teal-500/30 text-teal-900 dark:text-teal-100 shadow-2xs font-bold"
					: isPassed
					? "bg-[var(--paper-soft)] border-teal-500/30 text-[var(--ink)] hover:bg-[var(--line)]"
					: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:border-slate-400 opacity-75"
			}`}
			data-testid={`timeline-step-${step.id}`}
			data-active={isCurrent ? "true" : "false"}
		>
			<div className="flex items-center justify-between gap-1 w-full mb-1">
				<span className="text-[10px] font-mono font-bold text-[var(--muted)]">
					Этап {idx + 1}
				</span>
				{isCurrent ? (
					<span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
				) : isPassed ? (
					<Check className="w-3 h-3 text-teal-600 dark:text-teal-400" />
				) : null}
			</div>

			<div className="text-[11px] font-bold leading-snug line-clamp-2">
				{step.shortLabelRu}
			</div>

			<div className="text-[9.5px] text-[var(--muted)] mt-1 truncate">
				{getStagePartyRu(step.id)}
			</div>
		</button>
	);
}

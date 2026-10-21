import { Calendar } from "lucide-react";
import type React from "react";

export interface PatientJourneyProgressProps {
	readonly showProgress: boolean;
	readonly progressPercentage: number;
	readonly completedItemsCount: number;
	readonly totalItemsCount: number;
}

export const PatientJourneyProgress: React.FC<PatientJourneyProgressProps> = ({
	showProgress,
	progressPercentage,
	completedItemsCount,
	totalItemsCount,
}) => {
	if (!showProgress) return null;

	return (
		<div className="zeigarnik-progress-container p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2">
			<div className="flex items-center justify-between text-xs font-bold text-[var(--ink)]">
				<span>План лечения: Общий прогресс</span>
				<span className="font-mono text-emerald-600 dark:text-emerald-400">
					{progressPercentage}%
				</span>
			</div>
			<div className="w-full h-2 rounded-full bg-[var(--line)] overflow-hidden">
				<div
					className="h-full rounded-full bg-[var(--teal,#0d9488)] transition-all duration-300"
					style={{ width: `${progressPercentage}%` }}
				/>
			</div>
			<div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-xs text-[var(--muted)]">
				<p className="m-0 leading-normal">
					Пройдено {completedItemsCount} из {totalItemsCount} процедур.
				</p>
				<button
					type="button"
					onClick={() => {
						window.location.hash = "#booking";
					}}
					className="min-h-[36px] h-9 px-3.5 rounded-xl text-xs font-semibold bg-[var(--teal)] hover:opacity-95 text-white active:scale-95 transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
					data-testid="timeline-fast-book-btn"
				>
					<Calendar size={14} className="shrink-0" />
					<span>Записаться на следующий этап</span>
				</button>
			</div>
		</div>
	);
};

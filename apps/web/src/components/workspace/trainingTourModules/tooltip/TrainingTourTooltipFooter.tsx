import React from "react";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import type { QuestStep, QuestTrack } from "../trainingTourTypes";

export interface TrainingTourTooltipFooterProps {
	readonly activeTrack: QuestTrack;
	readonly currentStepIndex: number;
	readonly onNeverShowAgain: () => void;
	readonly onPrev: () => void;
	readonly onSkip: () => void;
	readonly onStepAccomplished: () => void;
}

export function TrainingTourTooltipFooter({
	activeTrack,
	currentStepIndex,
	onNeverShowAgain,
	onPrev,
	onSkip,
	onStepAccomplished,
}: TrainingTourTooltipFooterProps) {
	return (
		<div className="px-3.5 py-2.5 bg-[var(--paper-soft,#f8fafc)] border-t border-[var(--line,#e2e8f0)] flex items-center justify-between gap-2">
			<button
				type="button"
				onClick={onNeverShowAgain}
				className="min-h-[44px] px-2 text-[10px] text-[var(--muted,#64748b)] hover:text-rose-600 dark:hover:text-rose-400 font-medium transition-colors cursor-pointer inline-flex items-center"
				title="Запомнить выбор навсегда и больше не показывать обучение"
				data-testid="coach-mark-never-show-btn"
			>
				Больше не показывать
			</button>

			<div className="flex items-center gap-1.5 flex-shrink-0">
				{currentStepIndex > 0 && (
					<button
						type="button"
						onClick={onPrev}
						className="min-h-[44px] px-3 rounded-md border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-xs font-semibold inline-flex items-center justify-center gap-0.5 hover:bg-[var(--paper-soft,#f8fafc)] transition-all cursor-pointer shadow-2xs whitespace-nowrap"
						aria-label="Предыдущий шаг"
					>
						<ChevronLeft size={14} aria-hidden="true" />
						<span>Назад</span>
					</button>
				)}

				<button
					type="button"
					onClick={onSkip}
					className="min-h-[44px] px-3 rounded-md border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] text-xs font-medium inline-flex items-center justify-center gap-0.5 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
					title="Пропустить текущий шаг без выполнения действия"
				>
					<span>Пропустить</span>
				</button>

				{currentStepIndex < activeTrack.steps.length - 1 ? (
					<button
						type="button"
						onClick={onStepAccomplished}
						className="min-h-[44px] px-3.5 rounded-md bg-[var(--teal,#0d9488)] text-white text-xs font-semibold inline-flex items-center justify-center gap-1 hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
						aria-label="Следующий шаг"
						data-testid="coach-mark-next-btn"
					>
						<span>Далее</span>
						<ChevronRight size={14} aria-hidden="true" />
					</button>
				) : (
					<button
						type="button"
						onClick={onStepAccomplished}
						className="min-h-[44px] px-3.5 rounded-md bg-emerald-600 text-white text-xs font-semibold inline-flex items-center justify-center gap-1 hover:bg-emerald-500 active:scale-95 transition-all cursor-pointer shadow-2xs"
						aria-label="Завершить квест"
						data-testid="coach-mark-finish-btn"
					>
						<CheckCircle2 size={14} aria-hidden="true" />
						<span>Квест завершён!</span>
					</button>
				)}
			</div>
		</div>
	);
}

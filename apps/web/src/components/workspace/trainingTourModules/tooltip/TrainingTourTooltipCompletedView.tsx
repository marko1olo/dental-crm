import React from "react";
import { CheckCircle2, ChevronRight } from "lucide-react";
import type { QuestProgressState, QuestTrack, QuestTrackId } from "../trainingTourTypes";
import { CLINICAL_QUEST_TRACKS } from "../questCatalogTracks";

export interface TrainingTourTooltipCompletedViewProps {
	readonly activeTrack: QuestTrack;
	readonly progress: QuestProgressState;
	readonly nextTrack: QuestTrack | null;
	readonly onResetTrack: (id: QuestTrackId) => void;
	readonly onTrackChange: (id: QuestTrackId) => void;
	readonly onClose: () => void;
}

export function TrainingTourTooltipCompletedView({
	activeTrack,
	progress,
	nextTrack,
	onResetTrack,
	onTrackChange,
	onClose,
}: TrainingTourTooltipCompletedViewProps) {
	return (
		<div className="px-3.5 py-3 space-y-2.5 text-xs">
			<div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
				<CheckCircle2 size={18} className="shrink-0" />
				<h3 className="text-sm font-bold m-0 text-[var(--ink,#0f172a)]">
					Квест «{activeTrack.shortTitle}» пройден!
				</h3>
			</div>
			<p className="text-[11px] text-[var(--muted,#64748b)] m-0 leading-relaxed">
				Все {activeTrack.steps.length} ключевых шага направления успешно выполнены.
			</p>
			<div className="p-2 rounded-lg bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex items-center gap-1.5 flex-wrap">
				{CLINICAL_QUEST_TRACKS.map((t) => (
					<span
						key={t.id}
						className={`px-1.5 py-0.5 rounded text-[9px] font-semibold flex items-center gap-1 ${
							progress.tracksProgress[t.id]?.completed
								? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
								: "bg-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)]"
						}`}
					>
						{progress.tracksProgress[t.id]?.completed && <CheckCircle2 size={9} />}
						<span>{t.shortTitle}</span>
					</span>
				))}
			</div>
			<div className="pt-2 flex items-center justify-between gap-2 border-t border-[var(--line,#e2e8f0)]">
				<button
					type="button"
					onClick={() => onResetTrack(activeTrack.id)}
					className="min-h-[44px] px-3 rounded-md border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] text-xs font-medium cursor-pointer shadow-2xs inline-flex items-center justify-center"
				>
					Пройти заново
				</button>
				{nextTrack ? (
					<button
						type="button"
						onClick={() => onTrackChange(nextTrack.id)}
						className="min-h-[44px] px-3.5 rounded-md bg-[var(--teal,#0d9488)] text-white text-xs font-semibold inline-flex items-center justify-center gap-1 hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-2xs"
						data-testid="coach-mark-next-track-btn"
					>
						<span>К треку: {nextTrack.shortTitle}</span>
						<ChevronRight size={14} aria-hidden="true" />
					</button>
				) : (
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] px-3.5 rounded-md bg-emerald-600 text-white text-xs font-semibold inline-flex items-center justify-center gap-1 hover:bg-emerald-500 active:scale-95 transition-all cursor-pointer shadow-2xs"
						data-testid="coach-mark-complete-all-btn"
					>
						<span>Завершить обучение</span>
					</button>
				)}
			</div>
		</div>
	);
}

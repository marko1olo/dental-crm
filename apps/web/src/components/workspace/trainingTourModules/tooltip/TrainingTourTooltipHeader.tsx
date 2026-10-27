import React from "react";
import { CheckCircle2, X } from "lucide-react";
import type { QuestProgressState, QuestTrack, QuestTrackId } from "../trainingTourTypes";
import { CLINICAL_QUEST_TRACKS } from "../questCatalogTracks";

export interface TrainingTourTooltipHeaderProps {
	readonly progress: QuestProgressState;
	readonly progressPercentage: number;
	readonly onTrackChange: (id: QuestTrackId) => void;
	readonly onClose: () => void;
}

export function TrainingTourTooltipHeader({
	progress,
	progressPercentage,
	onTrackChange,
	onClose,
}: TrainingTourTooltipHeaderProps) {
	return (
		<>
			<div className="px-3 py-2 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] flex items-center justify-between gap-1.5">
				<div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
					{CLINICAL_QUEST_TRACKS.map((t) => {
						const isActive = t.id === progress.activeTrackId;
						const isDone = progress.tracksProgress[t.id]?.completed;
						return (
							<button
								key={t.id}
								type="button"
								onClick={() => onTrackChange(t.id)}
								className={`px-2 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
									isActive
										? "bg-[var(--teal,#0d9488)] text-white shadow-2xs"
										: "bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)]"
								}`}
							>
								{isDone && <CheckCircle2 size={10} className="text-emerald-400" />}
								<span>{t.shortTitle}</span>
							</button>
						);
					})}
				</div>

				<button
					type="button"
					onClick={onClose}
					className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] transition-colors cursor-pointer shrink-0"
					aria-label="Закрыть обучение"
					title="Закрыть (Esc)"
				>
					<X size={16} aria-hidden="true" />
				</button>
			</div>

			<div className="w-full bg-[var(--line,#e2e8f0)] h-1">
				<div
					className="bg-[var(--teal,#0d9488)] h-1 transition-all duration-300"
					style={{ width: `${progressPercentage}%` }}
				/>
			</div>
		</>
	);
}

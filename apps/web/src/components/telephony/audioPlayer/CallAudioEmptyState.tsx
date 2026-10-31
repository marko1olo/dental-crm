import { VolumeX } from "lucide-react";
import React from "react";
import { CallAudioTranscriptView } from "./CallAudioTranscriptView";
import type { CallAudioEmptyStateProps } from "./types";

export function CallAudioEmptyState({
	transcriptUtterances,
	currentTime,
	onSeekToUtterance,
	showTranscript,
	onToggleShowTranscript,
	copiedTranscript,
	onCopyTranscript,
}: CallAudioEmptyStateProps) {
	return (
		<div
			data-testid="call-audio-player-empty"
			className="p-3.5 rounded-2xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)] text-xs flex flex-col gap-2.5 shadow-xs"
		>
			<div className="flex items-center justify-center gap-3 py-3 text-[var(--muted,#64748b)]">
				<VolumeX size={20} className="text-[var(--muted,#94a3b8)] shrink-0" />
				<div className="flex flex-col items-center text-center">
					<span className="font-bold text-xs text-[var(--ink,#0f172a)]">
						Запись обрабатывается АТС
					</span>
					<span className="text-[11px] text-[var(--muted,#64748b)] mt-0.5">
						Запись звонка не подключена или недоступна
					</span>
				</div>
			</div>
			{transcriptUtterances.length > 0 && (
				<CallAudioTranscriptView
					transcriptUtterances={transcriptUtterances}
					currentTime={currentTime}
					onSeekToUtterance={onSeekToUtterance}
					showTranscript={showTranscript}
					onToggleShowTranscript={onToggleShowTranscript}
					copiedTranscript={copiedTranscript}
					onCopyTranscript={onCopyTranscript}
				/>
			)}
		</div>
	);
}

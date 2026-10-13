import { Check, Copy, FileQuestion, Sparkles } from "lucide-react";
import React from "react";
import {
	formatDurationTimer,
	type SpeechTranscriptUtterance,
} from "../../../store/telephonyStore";

export interface CallAudioTranscriptDrawerProps {
	transcriptUtterances: SpeechTranscriptUtterance[];
	currentTime: number;
	onSeekToUtterance: (startSec: number) => void;
	showTranscript: boolean;
	onToggleShowTranscript: () => void;
	copiedTranscript: boolean;
	onCopyTranscript: () => void;
}

/**
 * Collapsible AI STT Transcript Drawer with speaker badges, clickable timestamps, and clipboard copy.
 */
export function CallAudioTranscriptDrawer({
	transcriptUtterances,
	currentTime,
	onSeekToUtterance,
	showTranscript,
	onToggleShowTranscript,
	copiedTranscript,
	onCopyTranscript,
}: CallAudioTranscriptDrawerProps) {
	return (
		<div className="pt-1 border-t border-[var(--line,#e2e8f0)] flex flex-col gap-2">
			{/* Speech-to-Text Transcript Drawer Toggle */}
			<div className="flex items-center justify-between">
				<button
					type="button"
					onClick={onToggleShowTranscript}
					data-testid="audio-transcript-toggle"
					className="h-8 min-h-[32px] px-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--paper-soft,#f1f5f9)] text-xs font-semibold text-[var(--ink,#0f172a)] hover:text-[var(--teal)] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
					aria-expanded={showTranscript}
				>
					<Sparkles size={13} className="text-amber-500" />
					<span>
						{showTranscript
							? "Скрыть расшифровку речи"
							: "Показать расшифровку речи (AI STT)"}
					</span>
				</button>

				{showTranscript && transcriptUtterances.length > 0 && (
					<button
						type="button"
						onClick={onCopyTranscript}
						className="h-8 min-h-[32px] text-xs font-semibold text-[var(--ink,#0f172a)] inline-flex items-center gap-1.5 px-3 rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] transition-colors cursor-pointer"
						title="Скопировать текст диалога"
					>
						{copiedTranscript ? (
							<Check size={12} className="text-emerald-500" />
						) : (
							<Copy size={12} />
						)}
						<span>{copiedTranscript ? "Скопировано" : "Копировать"}</span>
					</button>
				)}
			</div>

			{/* Expanded Speech Transcript Dialogue Utterances */}
			{showTranscript && (
				<div className="space-y-2 max-h-48 overflow-y-auto pr-1 pt-1 animate-fade-in">
					{transcriptUtterances.length === 0 ? (
						<div className="py-6 px-4 text-center rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,#e2e8f0)] flex flex-col items-center justify-center gap-2 text-[var(--muted,#64748b)]">
							<FileQuestion size={24} className="text-[var(--muted,#94a3b8)]" />
							<span className="text-xs font-medium">
								Транскрипция аудиозаписи отсутствует
							</span>
						</div>
					) : (
						transcriptUtterances.map((u) => (
							<div
								key={`${u.speaker}-${u.startTimeSeconds}`}
								role="button"
								tabIndex={0}
								onClick={() => onSeekToUtterance(u.startTimeSeconds)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										onSeekToUtterance(u.startTimeSeconds);
									}
								}}
								className={`p-2 rounded-lg cursor-pointer transition-all border ${
									currentTime >= u.startTimeSeconds &&
									currentTime <= u.endTimeSeconds
										? "bg-[var(--teal-surface)] border-[var(--teal-soft)] shadow-xs"
										: "bg-[var(--paper-strong,var(--paper,#ffffff))] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))]"
								}`}
								title="Кликните для перехода к реплике"
							>
								<div className="flex items-center justify-between text-[10px] mb-1">
									<div className="flex items-center gap-1.5 font-bold">
										<span
											className={`px-1.5 py-0.2 rounded text-[9px] font-semibold ${
												u.speaker === "operator"
													? "bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)]"
													: "bg-[var(--info-bg,rgba(2,132,199,0.1))] text-[var(--info-fg,#0284c7)] border border-[var(--info-fg,rgba(2,132,199,0.3))]"
											}`}
										>
											{u.speaker === "operator" ? "Оператор" : "Пациент"}
										</span>
										<span className="font-mono text-[var(--muted,#64748b)]">
											{formatDurationTimer(u.startTimeSeconds)} -{" "}
											{formatDurationTimer(u.endTimeSeconds)}
										</span>
									</div>
									{typeof u.confidence === "number" && !Number.isNaN(u.confidence) && (
										<span className="text-[9px] text-[var(--muted,#64748b)]">
											{(u.confidence * 100).toFixed(0)}% уверенность
										</span>
									)}
								</div>
								<p className="text-[var(--ink,#0f172a)] text-[11px] leading-relaxed">
									{u.text || ""}
								</p>
							</div>
						))
					)}
				</div>
			)}
		</div>
	);
}

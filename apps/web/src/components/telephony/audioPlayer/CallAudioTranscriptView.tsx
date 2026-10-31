import { Check, Copy, FileQuestion, Sparkles } from "lucide-react";
import React from "react";
import { formatDurationTimer } from "../../../store/telephonyStore";
import type { CallAudioTranscriptViewProps } from "./types";

export function CallAudioTranscriptView({
	transcriptUtterances,
	currentTime,
	onSeekToUtterance,
	showTranscript,
	onToggleShowTranscript,
	copiedTranscript,
	onCopyTranscript,
}: CallAudioTranscriptViewProps) {
	return (
		<div className="pt-1.5 border-t border-[var(--line,#e2e8f0)] flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<button
					type="button"
					onClick={onToggleShowTranscript}
					data-testid="audio-transcript-toggle"
					className="min-h-[44px] sm:min-h-[32px] px-3 py-1.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,#ffffff)] hover:bg-[var(--paper-soft,#f1f5f9)] text-xs font-bold text-[var(--ink,#0f172a)] hover:text-[var(--teal,#0d9488)] inline-flex items-center gap-1.5 transition-colors cursor-pointer touch-manipulation"
					aria-expanded={showTranscript}
				>
					<Sparkles size={14} className="text-amber-500" />
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
						className="min-h-[44px] sm:min-h-[32px] text-xs font-bold text-[var(--ink,#0f172a)] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--paper-strong,#ffffff)] border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)] transition-colors cursor-pointer touch-manipulation"
						title="Скопировать текст диалога"
					>
						{copiedTranscript ? (
							<Check size={14} className="text-emerald-500" />
						) : (
							<Copy size={14} />
						)}
						<span>{copiedTranscript ? "Скопировано" : "Копировать"}</span>
					</button>
				)}
			</div>

			{showTranscript && (
				<div className="space-y-2 max-h-48 overflow-y-auto pr-1 pt-1 animate-fade-in">
					{transcriptUtterances.length === 0 ? (
						<div className="py-6 px-4 text-center rounded-xl bg-[var(--paper-strong,#ffffff)] border border-[var(--line,#e2e8f0)] flex flex-col items-center justify-center gap-2 text-[var(--muted,#64748b)]">
							<FileQuestion size={24} className="text-[var(--muted,#94a3b8)]" />
							<span className="text-xs font-medium">
								Транскрипция аудиозаписи отсутствует
							</span>
						</div>
					) : (
						transcriptUtterances.map((u) => {
							const isCurrent =
								currentTime >= (u.startTimeSeconds || 0) &&
								currentTime <= (u.endTimeSeconds || 0);
							return (
								<div
									key={`${u.speaker}-${u.startTimeSeconds}`}
									role="button"
									tabIndex={0}
									onClick={() => onSeekToUtterance(u.startTimeSeconds || 0)}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											onSeekToUtterance(u.startTimeSeconds || 0);
										}
									}}
									className={`p-2.5 rounded-xl cursor-pointer transition-all border ${
										isCurrent
											? "bg-[var(--teal-surface)] border-[var(--teal-soft)] shadow-xs"
											: "bg-[var(--paper-strong,#ffffff)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)]"
									}`}
									title="Кликните для перехода к реплике"
								>
									<div className="flex items-center justify-between text-[11px] mb-1">
										<div className="flex items-center gap-1.5 font-bold">
											<span
												className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
													u.speaker === "operator"
														? "bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)]"
														: "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
												}`}
											>
												{u.speaker === "operator" ? "Оператор" : "Пациент"}
											</span>
											<span className="font-mono text-[var(--muted,#64748b)]">
												{formatDurationTimer(u.startTimeSeconds || 0)} -{" "}
												{formatDurationTimer(u.endTimeSeconds || 0)}
											</span>
										</div>
										{typeof u.confidence === "number" && !Number.isNaN(u.confidence) && (
											<span className="text-[10px] font-mono text-[var(--muted,#64748b)]">
												{(u.confidence * 100).toFixed(0)}% уверенность
											</span>
										)}
									</div>
									<p className="text-[var(--ink,#0f172a)] text-xs leading-relaxed">
										{u.text || ""}
									</p>
								</div>
							);
						})
					)}
				</div>
			)}
		</div>
	);
}

// Backward-compatible alias
export const CallAudioTranscriptDrawer = CallAudioTranscriptView;

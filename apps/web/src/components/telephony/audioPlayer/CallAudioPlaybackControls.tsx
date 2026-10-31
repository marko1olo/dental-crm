import {
	Download,
	Pause,
	Play,
	RotateCcw,
	RotateCw,
	Volume2,
	VolumeX,
} from "lucide-react";
import React from "react";
import { formatDurationTimer } from "../../../store/telephonyStore";
import {
	CALL_AUDIO_PLAYBACK_SPEEDS,
	type CallAudioPlaybackControlsProps,
} from "./types";

export function CallAudioPlaybackControls({
	isPlaying,
	onTogglePlay,
	currentTime,
	audioDuration,
	onSkip,
	playbackSpeed,
	onSetPlaybackSpeed,
	isMuted,
	onToggleMute,
	recordingUrl,
}: CallAudioPlaybackControlsProps) {
	const handleDownload = () => {
		if (!recordingUrl) return;
		const a = document.createElement("a");
		a.href = recordingUrl;
		a.download = `call-record-${Date.now()}.mp3`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	};

	return (
		<div className="flex flex-wrap items-center justify-between gap-2.5">
			<div className="flex items-center gap-2">
				{/* Apple HIG Touch Target >= 44x44px with desktop clinical density classes */}
				<button
					type="button"
					onClick={onTogglePlay}
					className="dnt-player-play-btn min-h-[44px] min-w-[44px] w-11 h-11 sm:min-h-[36px] sm:min-w-[36px] sm:w-9 sm:h-9 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white shadow-sm flex items-center justify-center transition-all cursor-pointer active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--teal)] touch-manipulation"
					title={isPlaying ? "Пауза" : "Воспроизвести запись"}
					aria-label={isPlaying ? "Пауза" : "Воспроизвести запись"}
					data-testid="call-audio-player-toggle"
				>
					{/* Desktop density literal: min-h-[36px] min-w-[36px] w-9 h-9 sm:w-8 sm:h-8 sm:min-h-[32px] sm:min-w-[32px] */}
					{isPlaying ? (
						<Pause size={18} className="text-white fill-white" />
					) : (
						<Play size={18} className="ml-0.5 text-white fill-white" />
					)}
				</button>

				{/* Skip buttons: min-h-[32px] min-w-[32px] h-8 w-8 with 44px mobile touch targets */}
				<button
					type="button"
					onClick={() => onSkip(-10)}
					className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] h-11 w-11 sm:h-8 sm:w-8 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] inline-flex items-center justify-center transition-colors cursor-pointer touch-manipulation"
					title="Назад на 10 сек"
					aria-label="Назад на 10 секунд"
				>
					<RotateCcw size={16} />
				</button>
				<button
					type="button"
					onClick={() => onSkip(10)}
					className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] h-11 w-11 sm:h-8 sm:w-8 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] inline-flex items-center justify-center transition-colors cursor-pointer touch-manipulation"
					title="Вперед на 10 сек"
					aria-label="Вперед на 10 секунд"
				>
					<RotateCw size={16} />
				</button>

				<span className="font-mono text-xs text-[var(--ink,#0f172a)] font-bold pl-1">
					{formatDurationTimer(currentTime)} / {formatDurationTimer(audioDuration)}
				</span>
			</div>

			<div className="flex items-center gap-1.5">
				<div className="dente-segmented-bar" role="group" aria-label="Скорость воспроизведения">
					{CALL_AUDIO_PLAYBACK_SPEEDS.map((s) => (
						<button
							key={s}
							type="button"
							onClick={() => onSetPlaybackSpeed(s)}
							className={`dente-segmented-item min-h-[32px] sm:min-h-[28px] px-2.5 py-1 text-xs font-bold cursor-pointer touch-manipulation ${
								playbackSpeed === s ? "is-active active" : ""
							}`}
							title={`Скорость ${s}x`}
						>
							{s}x
						</button>
					))}
				</div>
				<button
					type="button"
					onClick={onToggleMute}
					className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] h-11 w-11 sm:h-8 sm:w-8 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] inline-flex items-center justify-center transition-all cursor-pointer touch-manipulation"
					title={isMuted ? "Включить звук" : "Выключить звук"}
					aria-label={isMuted ? "Включить звук" : "Выключить звук"}
				>
					{isMuted ? (
						<VolumeX size={16} className="text-rose-500" />
					) : (
						<Volume2 size={16} />
					)}
				</button>
				{recordingUrl && (
					<button
						type="button"
						onClick={handleDownload}
						className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] h-11 w-11 sm:h-8 sm:w-8 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--teal)] hover:bg-[var(--paper-soft,#f1f5f9)] inline-flex items-center justify-center transition-all cursor-pointer touch-manipulation"
						title="Скачать запись разговора (MP3)"
						aria-label="Скачать запись разговора"
					>
						<Download size={16} />
					</button>
				)}
			</div>
		</div>
	);
}

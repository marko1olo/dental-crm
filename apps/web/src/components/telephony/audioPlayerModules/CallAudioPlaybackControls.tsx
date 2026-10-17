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
import type {
	CallAudioPlaybackControlsProps,
	PlaybackSpeed,
} from "./callAudioPlayerTypes";

const SPEEDS: PlaybackSpeed[] = [1, 1.25, 1.5, 2];

/**
 * Playback Controls for CallAudioPlayer (Play/Pause, Skip -+10s, Speed Toggles, Mute, Download).
 */
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
		<div className="flex flex-wrap items-center justify-between gap-2">
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onTogglePlay}
					className="dnt-player-play-btn min-h-[36px] min-w-[36px] w-9 h-9 sm:w-8 sm:h-8 sm:min-h-[32px] sm:min-w-[32px] rounded-lg bg-[var(--teal,#0d9488)] hover:opacity-90 active:scale-95 text-white flex items-center justify-center transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)] cursor-pointer"
					title={isPlaying ? "Пауза" : "Воспроизвести запись"}
					aria-label={isPlaying ? "Пауза" : "Воспроизвести запись"}
					data-testid="call-audio-player-toggle"
				>
					{isPlaying ? (
						<Pause size={16} className="text-white fill-white" />
					) : (
						<Play size={16} className="ml-0.5 text-white fill-white" />
					)}
				</button>

				{/* Skip -10s */}
				<button
					type="button"
					onClick={() => onSkip(-10)}
					className="min-h-[32px] min-w-[32px] h-8 w-8 rounded-lg border border-[var(--line-subtle,var(--line,#e2e8f0))] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.05))] inline-flex items-center justify-center transition-colors cursor-pointer"
					title="Назад на 10 сек"
					aria-label="Назад на 10 секунд"
				>
					<RotateCcw size={15} />
				</button>

				{/* Skip +10s */}
				<button
					type="button"
					onClick={() => onSkip(10)}
					className="min-h-[32px] min-w-[32px] h-8 w-8 rounded-lg border border-[var(--line-subtle,var(--line,#e2e8f0))] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.05))] inline-flex items-center justify-center transition-colors cursor-pointer"
					title="Вперед на 10 сек"
					aria-label="Вперед на 10 секунд"
				>
					<RotateCw size={15} />
				</button>

				<span className="font-mono text-xs text-[var(--ink,#0f172a)] font-semibold pl-1">
					{formatDurationTimer(currentTime)} / {formatDurationTimer(audioDuration)}
				</span>
			</div>

			<div className="flex items-center gap-1.5">
				{/* Speed Toggle Segmented Bar (1x, 1.25x, 1.5x, 2x) */}
				<div
					className="dente-segmented-bar"
					role="group"
					aria-label="Скорость воспроизведения"
				>
					{SPEEDS.map((s) => (
						<button
							key={s}
							type="button"
							onClick={() => onSetPlaybackSpeed(s)}
							className={`dente-segmented-item min-h-[28px] min-w-[28px] h-7 px-2 py-0.5 text-[12px] font-semibold cursor-pointer ${
								playbackSpeed === s ? "is-active active" : ""
							}`}
							title={`Скорость ${s}x`}
						>
							{s}x
						</button>
					))}
				</div>

				{/* Mute toggle */}
				<button
					type="button"
					onClick={onToggleMute}
					className="min-h-[32px] min-w-[32px] h-8 w-8 rounded-lg border border-[var(--line-subtle,var(--line,#e2e8f0))] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.05))] inline-flex items-center justify-center transition-all cursor-pointer"
					title={isMuted ? "Включить звук" : "Выключить звук"}
					aria-label={isMuted ? "Включить звук" : "Выключить звук"}
				>
					{isMuted ? (
						<VolumeX size={16} className="text-[var(--danger,#ef4444)]" />
					) : (
						<Volume2 size={16} />
					)}
				</button>

				{/* Download MP3 button */}
				{recordingUrl && (
					<button
						type="button"
						onClick={handleDownload}
						className="min-h-[32px] min-w-[32px] h-8 w-8 rounded-lg border border-[var(--line-subtle,var(--line,#e2e8f0))] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--muted,#64748b)] hover:text-[var(--teal)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.05))] inline-flex items-center justify-center transition-all cursor-pointer"
						title="Скачать запись звонка (MP3)"
						aria-label="Скачать запись звонка"
					>
						<Download size={15} />
					</button>
				)}
			</div>
		</div>
	);
}

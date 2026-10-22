import { AlertCircle, Pause, Play } from "lucide-react";
import type React from "react";
import { useCallPlayerAudio } from "./useCallPlayerAudio";

export interface CallPlayerProps {
	recordingUrl: string;
	durationSeconds?: number | null;
	className?: string;
}

function formatTime(time: number) {
	if (Number.isNaN(time) || !Number.isFinite(time) || time < 0) return "00:00";
	const m = Math.floor(time / 60);
	const s = Math.floor(time % 60);
	return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export const CallPlayer: React.FC<CallPlayerProps> = ({
	recordingUrl, durationSeconds, className = "",
}) => {
	const player = useCallPlayerAudio(recordingUrl, durationSeconds);

	return (
		<div
			className={`call-player-hud flex items-center gap-2.5 p-2 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] shadow-xs select-none ${className}`}
			data-testid="call-player"
		>
			<audio ref={player.audioRef} src={recordingUrl} preload="metadata" />

			<button
				type="button" onClick={player.togglePlayPause} disabled={player.hasError}
				className="primary-button h-9 min-h-[36px] max-h-[36px] w-9 min-w-[36px] max-w-[36px] p-0 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white inline-flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-[0.96] disabled:opacity-40 shrink-0"
				aria-label={player.isPlaying ? "Пауза" : "Воспроизвести запись"}
				title={player.hasError ? "Запись недоступна" : player.isPlaying ? "Пауза" : "Воспроизвести"}
				data-testid="call-player-toggle-btn"
			>
				{player.hasError ? <AlertCircle size={15} className="text-white" /> : player.isPlaying ? <Pause size={15} className="text-white" /> : <Play size={15} className="text-white ml-0.5" />}
			</button>

			<span className="text-xs font-mono font-medium text-[var(--muted)] min-w-[2.5rem] text-right shrink-0">
				{formatTime(player.progress)}
			</span>

			<input
				type="range" min="0" max={player.duration && Number.isFinite(player.duration) ? player.duration : 0} step="0.1"
				value={Number.isFinite(player.progress) ? player.progress : 0}
				onChange={(e) => player.handleProgressChange(Number(e.target.value))}
				disabled={player.hasError || !player.duration}
				className="flex-1 min-w-[80px] h-1.5 bg-[var(--line)] rounded-lg appearance-none cursor-pointer accent-[var(--primary)]"
				aria-label="Прогресс воспроизведения звонка"
			/>

			<span className="text-xs font-mono font-medium text-[var(--muted)] min-w-[2.5rem] shrink-0">
				{formatTime(player.duration)}
			</span>

			<button
				type="button" onClick={player.handleRateChange}
				className="secondary-button h-9 min-h-[36px] max-h-[36px] px-2.5 rounded-xl inline-flex items-center justify-center text-xs font-bold bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] transition-all cursor-pointer shadow-2xs active:scale-[0.96] shrink-0"
				title="Скорость воспроизведения: 1x / 1.5x / 2x"
				data-testid="call-player-speed-btn"
			>
				{player.playbackRate}x
			</button>
		</div>
	);
};

export default CallPlayer;

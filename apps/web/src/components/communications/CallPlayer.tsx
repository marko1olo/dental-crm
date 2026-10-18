import { AlertCircle, Pause, Play } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { logger } from "../../utils/logger";

export interface CallPlayerProps {
	recordingUrl: string;
	durationSeconds?: number | null;
	className?: string;
}

export const CallPlayer: React.FC<CallPlayerProps> = ({
	recordingUrl,
	durationSeconds,
	className = "",
}) => {
	const audioRef = useRef<HTMLAudioElement>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [progress, setProgress] = useState(0);
	const [duration, setDuration] = useState(durationSeconds ?? 0);
	const [playbackRate, setPlaybackRate] = useState<number>(1);
	const [hasError, setHasError] = useState(false);

	// Reset state when recordingUrl changes
	useEffect(() => {
		setProgress(0);
		setIsPlaying(false);
		setHasError(false);
		setDuration(durationSeconds ?? 0);
	}, [recordingUrl, durationSeconds]);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;

		const updateProgress = () => {
			if (Number.isFinite(audio.currentTime)) {
				setProgress(audio.currentTime);
			}
		};

		const handleLoadedMetadata = () => {
			if ((!durationSeconds || durationSeconds === 0) && Number.isFinite(audio.duration)) {
				setDuration(audio.duration);
			}
			setHasError(false);
		};

		const handlePlay = () => {
			setIsPlaying(true);
			setHasError(false);
		};

		const handlePause = () => {
			setIsPlaying(false);
		};

		const handleEnded = () => {
			setIsPlaying(false);
			setProgress(0);
		};

		const handleError = () => {
			logger.warn("Audio playback error on CallPlayer:", audio.error);
			setIsPlaying(false);
			setHasError(true);
		};

		audio.addEventListener("timeupdate", updateProgress);
		audio.addEventListener("loadedmetadata", handleLoadedMetadata);
		audio.addEventListener("play", handlePlay);
		audio.addEventListener("pause", handlePause);
		audio.addEventListener("ended", handleEnded);
		audio.addEventListener("error", handleError);

		return () => {
			try {
				audio.pause();
				audio.removeAttribute("src");
				audio.load();
			} catch (err: unknown) {
				logger.warn("Audio pause on unmount failed:", err);
			}
			audio.removeEventListener("timeupdate", updateProgress);
			audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
			audio.removeEventListener("play", handlePlay);
			audio.removeEventListener("pause", handlePause);
			audio.removeEventListener("ended", handleEnded);
			audio.removeEventListener("error", handleError);
		};
	}, [durationSeconds]);

	const togglePlayPause = () => {
		const audio = audioRef.current;
		if (!audio) return;

		if (audio.paused) {
			setHasError(false);
			audio.play().catch((err) => {
				logger.error("Audio play failed:", err);
				setIsPlaying(false);
				setHasError(true);
			});
		} else {
			audio.pause();
		}
	};

	const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newTime = Number(e.target.value);
		if (audioRef.current && Number.isFinite(newTime)) {
			audioRef.current.currentTime = newTime;
			setProgress(newTime);
		}
	};

	// Strict requirement: 1x, 1.5x, 2x speeds only
	const handleRateChange = () => {
		const rates = [1, 1.5, 2];
		const currentIndex = rates.indexOf(playbackRate);
		const nextRate = rates[(currentIndex + 1) % rates.length] ?? 1;
		if (audioRef.current) {
			audioRef.current.playbackRate = nextRate;
			setPlaybackRate(nextRate);
		}
	};

	const formatTime = (time: number) => {
		if (Number.isNaN(time) || !Number.isFinite(time) || time < 0) return "00:00";
		const m = Math.floor(time / 60);
		const s = Math.floor(time % 60);
		return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
	};

	return (
		<div
			className={`call-player-hud flex items-center gap-2.5 p-2 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] shadow-xs select-none ${className}`}
			data-testid="call-player"
		>
			<audio ref={audioRef} src={recordingUrl} preload="metadata" />

			{/* Кнопка Play/Pause (36x36px десктоп / touch-friendly) */}
			<button
				type="button"
				onClick={togglePlayPause}
				disabled={hasError}
				className="primary-button h-9 min-h-[36px] max-h-[36px] w-9 min-w-[36px] max-w-[36px] p-0 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white inline-flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-[0.96] disabled:opacity-40 shrink-0"
				aria-label={isPlaying ? "Пауза" : "Воспроизвести запись"}
				title={hasError ? "Запись недоступна" : isPlaying ? "Пауза" : "Воспроизвести"}
				data-testid="call-player-toggle-btn"
			>
				{hasError ? (
					<AlertCircle size={15} className="text-white" />
				) : isPlaying ? (
					<Pause size={15} className="text-white" />
				) : (
					<Play size={15} className="text-white ml-0.5" />
				)}
			</button>

			{/* Текущее время */}
			<span className="text-xs font-mono font-medium text-[var(--muted)] min-w-[2.5rem] text-right shrink-0">
				{formatTime(progress)}
			</span>

			{/* Ползунок прогресса */}
			<input
				type="range"
				min="0"
				max={duration && Number.isFinite(duration) ? duration : 0}
				step="0.1"
				value={Number.isFinite(progress) ? progress : 0}
				onChange={handleProgressChange}
				disabled={hasError || !duration}
				className="flex-1 min-w-[80px] h-1.5 bg-[var(--line)] rounded-lg appearance-none cursor-pointer accent-[var(--primary)]"
				aria-label="Прогресс воспроизведения звонка"
			/>

			{/* Общая длительность */}
			<span className="text-xs font-mono font-medium text-[var(--muted)] min-w-[2.5rem] shrink-0">
				{formatTime(duration)}
			</span>

			{/* Скорость 1x / 1.5x / 2x */}
			<button
				type="button"
				onClick={handleRateChange}
				className="secondary-button h-9 min-h-[36px] max-h-[36px] px-2.5 rounded-xl inline-flex items-center justify-center text-xs font-bold bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] transition-all cursor-pointer shadow-2xs active:scale-[0.96] shrink-0"
				title="Скорость воспроизведения: 1x / 1.5x / 2x"
				data-testid="call-player-speed-btn"
			>
				{playbackRate}x
			</button>
		</div>
	);
};

export default CallPlayer;

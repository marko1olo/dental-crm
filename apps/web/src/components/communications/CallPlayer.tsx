import { Pause, Play } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { logger } from "../../utils/logger";

export const CallPlayer: React.FC<{
	recordingUrl: string;
	durationSeconds?: number | null;
}> = ({ recordingUrl, durationSeconds }) => {
	const audioRef = useRef<HTMLAudioElement>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [progress, setProgress] = useState(0);
	const [duration, setDuration] = useState(durationSeconds ?? 0);
	const [playbackRate, setPlaybackRate] = useState(1);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;

		const updateProgress = () => {
			setProgress(audio.currentTime);
		};

		const handleLoadedMetadata = () => {
			if (!durationSeconds || durationSeconds === 0) {
				setDuration(audio.duration);
			}
		};

		const handleEnded = () => {
			setIsPlaying(false);
			setProgress(0);
		};

		audio.addEventListener("timeupdate", updateProgress);
		audio.addEventListener("loadedmetadata", handleLoadedMetadata);
		audio.addEventListener("ended", handleEnded);

		return () => {
			audio.removeEventListener("timeupdate", updateProgress);
			audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
			audio.removeEventListener("ended", handleEnded);
		};
	}, [durationSeconds]);

	const togglePlayPause = () => {
		if (audioRef.current) {
			if (isPlaying) {
				audioRef.current.pause();
			} else {
				// В браузерах play() возвращает Promise
				audioRef.current.play().catch((err) => {
					logger.error("Audio play failed:", err);
				});
			}
			setIsPlaying(!isPlaying);
		}
	};

	const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newTime = Number(e.target.value);
		if (audioRef.current) {
			audioRef.current.currentTime = newTime;
			setProgress(newTime);
		}
	};

	const handleRateChange = () => {
		const rates = [1, 1.25, 1.5, 2];
		const nextRate =
			rates[(rates.indexOf(playbackRate) + 1) % rates.length] ?? 1;
		if (audioRef.current) {
			audioRef.current.playbackRate = nextRate;
			setPlaybackRate(nextRate);
		}
	};

	const formatTime = (time: number) => {
		if (Number.isNaN(time) || !Number.isFinite(time)) return "00:00";
		const m = Math.floor(time / 60);
		const s = Math.floor(time % 60);
		return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
	};

	return (
		<div className="flex flex-wrap items-center gap-2 mt-2 p-2 bg-slate-100 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-800">
			<audio ref={audioRef} src={recordingUrl} preload="metadata">
				<track kind="captions" src="" label="" default />
			</audio>
			<button
				type="button"
				onClick={togglePlayPause}
				className="flex items-center justify-center w-7 h-7 rounded-full bg-sky-500 hover:bg-sky-600 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900"
				aria-label={isPlaying ? "Пауза" : "Воспроизвести"}
			>
				{isPlaying ? (
					<Pause className="w-3.5 h-3.5" aria-hidden="true" />
				) : (
					<Play className="w-3.5 h-3.5 ml-0.5" aria-hidden="true" />
				)}
			</button>
			<span className="text-xs font-mono text-slate-600 dark:text-slate-400 min-w-[2.5rem] text-right">
				{formatTime(progress)}
			</span>
			<input
				type="range"
				min="0"
				max={duration || 0}
				step="0.1"
				value={progress}
				onChange={handleProgressChange}
				className="flex-1 min-w-[100px] h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-sky-500"
				aria-label="Прогресс воспроизведения"
			/>
			<span className="text-xs font-mono text-slate-600 dark:text-slate-400 min-w-[2.5rem]">
				{formatTime(duration)}
			</span>
			<button
				type="button"
				onClick={handleRateChange}
				className="px-2 py-0.5 text-xs font-medium rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
				title="Скорость воспроизведения"
			>
				{playbackRate}x
			</button>
		</div>
	);
};

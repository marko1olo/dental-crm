import { useEffect, useRef, useState } from "react";
import { logger } from "../../utils/logger";

export function useCallPlayerAudio(recordingUrl: string, durationSeconds?: number | null) {
	const audioRef = useRef<HTMLAudioElement>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [progress, setProgress] = useState(0);
	const [duration, setDuration] = useState(durationSeconds ?? 0);
	const [playbackRate, setPlaybackRate] = useState<number>(1);
	const [hasError, setHasError] = useState(false);

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
			if (Number.isFinite(audio.currentTime)) setProgress(audio.currentTime);
		};
		const handleLoadedMetadata = () => {
			if ((!durationSeconds || durationSeconds === 0) && Number.isFinite(audio.duration)) {
				setDuration(audio.duration);
			}
			setHasError(false);
		};
		const handlePlay = () => { setIsPlaying(true); setHasError(false); };
		const handlePause = () => setIsPlaying(false);
		const handleEnded = () => { setIsPlaying(false); setProgress(0); };
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

	const handleProgressChange = (newTime: number) => {
		if (audioRef.current && Number.isFinite(newTime)) {
			audioRef.current.currentTime = newTime;
			setProgress(newTime);
		}
	};

	const handleRateChange = () => {
		const rates = [1, 1.5, 2];
		const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length] ?? 1;
		if (audioRef.current) {
			audioRef.current.playbackRate = nextRate;
			setPlaybackRate(nextRate);
		}
	};

	return {
		audioRef, isPlaying, progress, duration, playbackRate, hasError,
		togglePlayPause, handleProgressChange, handleRateChange,
	};
}

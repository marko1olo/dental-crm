/**
 * DENTE Dental CRM — Compact Inline Call Audio Player Hook
 * Mandate 8b (<= 120 lines)
 */

import { useEffect, useRef, useState } from "react";

export function useLeadAudioPlayer(
	audioUrl?: string | null,
	initialDuration?: number | null,
) {
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState<number>(initialDuration || 0);
	const [hasError, setHasError] = useState(false);
	const audioRef = useRef<HTMLAudioElement | null>(null);

	useEffect(() => {
		if (initialDuration && initialDuration > 0) setDuration(initialDuration);
	}, [initialDuration]);

	useEffect(() => {
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current = null;
		}
		setIsPlaying(false);
		setCurrentTime(0);
		setHasError(false);
	}, []);

	useEffect(() => {
		return () => {
			if (audioRef.current) {
				audioRef.current.pause();
				audioRef.current = null;
			}
		};
	}, []);

	const togglePlay = () => {
		if (hasError || !audioUrl) return;
		if (!audioRef.current) {
			const audio = new Audio(audioUrl);
			audioRef.current = audio;
			audio.addEventListener("timeupdate", () =>
				setCurrentTime(Math.floor(audio.currentTime)),
			);
			audio.addEventListener("loadedmetadata", () => {
				if (!Number.isNaN(audio.duration) && audio.duration > 0)
					setDuration(Math.floor(audio.duration));
			});
			audio.addEventListener("ended", () => {
				setIsPlaying(false);
				setCurrentTime(0);
			});
			audio.addEventListener("error", () => {
				setHasError(true);
				setIsPlaying(false);
			});
		}

		const audio = audioRef.current;
		if (isPlaying) {
			audio.pause();
			setIsPlaying(false);
		} else {
			audio
				.play()
				.then(() => setIsPlaying(true))
				.catch(() => {
					setHasError(true);
					setIsPlaying(false);
				});
		}
	};

	return { isPlaying, currentTime, duration, hasError, togglePlay };
}

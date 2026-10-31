import { useEffect, useMemo, useRef, useState } from "react";
import {
	generateWaveformBars,
	type SpeechTranscriptUtterance,
	useTelephonyStore,
} from "../../../store/telephonyStore";
import type { PlaybackSpeed } from "./types";

export function useCallAudioPlayerState(
	recordingUrl?: string | null,
	durationSeconds = 0,
	seed?: string,
	transcript?: SpeechTranscriptUtterance[],
) {
	const playbackSpeed = useTelephonyStore((s) => s.playbackSpeed);
	const setPlaybackSpeed = useTelephonyStore((s) => s.setPlaybackSpeed);
	const isMuted = useTelephonyStore((s) => s.isMuted);
	const toggleMute = useTelephonyStore((s) => s.toggleMute);
	const volumeLevel = useTelephonyStore((s) => s.volumeLevel);

	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [audioDuration, setAudioDuration] = useState(durationSeconds);
	const [playbackError, setPlaybackError] = useState(false);
	const [showTranscript, setShowTranscript] = useState(false);
	const [copiedTranscript, setCopiedTranscript] = useState(false);
	const audioRef = useRef<HTMLAudioElement | null>(null);

	const waveformBars = useMemo(
		() => generateWaveformBars(seed || recordingUrl, 44),
		[seed, recordingUrl],
	);
	const transcriptUtterances = useMemo(() => transcript || [], [transcript]);

	useEffect(() => {
		if (audioRef.current) {
			audioRef.current.playbackRate = playbackSpeed;
			audioRef.current.muted = isMuted;
			audioRef.current.volume = volumeLevel;
		}
	}, [playbackSpeed, isMuted, volumeLevel]);

	useEffect(() => {
		const prevUrl = recordingUrl;
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current.currentTime = 0;
		}
		setIsPlaying(false);
		setCurrentTime(0);
		setAudioDuration(durationSeconds);
		setPlaybackError(false);
		return () => {
			if (prevUrl?.startsWith("blob:")) {
				try {
					URL.revokeObjectURL(prevUrl);
				} catch {}
			}
		};
	}, [recordingUrl, durationSeconds]);

	const togglePlay = () => {
		if (!audioRef.current) return;
		if (isPlaying) {
			audioRef.current.pause();
			setIsPlaying(false);
		} else {
			setPlaybackError(false);
			audioRef.current
				.play()
				.then(() => setIsPlaying(true))
				.catch((err: unknown) => {
					if (err instanceof Error && err.name === "AbortError") return;
					console.warn("[CallAudioPlayer] Audio playback failed:", err);
					setIsPlaying(false);
					setPlaybackError(true);
				});
		}
	};

	const handleTimeUpdate = () => {
		if (audioRef.current) {
			setCurrentTime(audioRef.current.currentTime);
			if (audioRef.current.duration > 0 && Number.isFinite(audioRef.current.duration)) {
				setAudioDuration(audioRef.current.duration);
			}
		}
	};

	const handleSkip = (deltaSeconds: number) => {
		if (!audioRef.current) return;
		const nextTime = Math.max(0, Math.min(audioDuration, currentTime + deltaSeconds));
		audioRef.current.currentTime = nextTime;
		setCurrentTime(nextTime);
	};

	const handleSeek = (targetTime: number) => {
		setCurrentTime(targetTime);
		if (audioRef.current) audioRef.current.currentTime = targetTime;
	};

	const handleSeekToUtterance = (startSec: number) => {
		setCurrentTime(startSec);
		if (audioRef.current) {
			audioRef.current.currentTime = startSec;
			if (!isPlaying) {
				audioRef.current
					.play()
					.then(() => setIsPlaying(true))
					.catch(() => setIsPlaying(false));
			}
		}
	};

	const handleCopyTranscript = () => {
		const fullText = transcriptUtterances
			.map(
				(u) =>
					`[${u.startTimeSeconds}s] ${u.speaker === "operator" ? "Оператор" : "Пациент"}: ${u.text}`,
			)
			.join("\n");
		navigator.clipboard?.writeText(fullText).then(() => {
			setCopiedTranscript(true);
			setTimeout(() => setCopiedTranscript(false), 2000);
		});
	};

	const progressPct = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

	return {
		audioRef,
		isPlaying,
		setIsPlaying,
		currentTime,
		audioDuration,
		playbackError,
		setPlaybackError,
		showTranscript,
		setShowTranscript,
		copiedTranscript,
		waveformBars,
		transcriptUtterances,
		playbackSpeed,
		setPlaybackSpeed,
		isMuted,
		toggleMute,
		togglePlay,
		handleTimeUpdate,
		handleSkip,
		handleSeek,
		handleSeekToUtterance,
		handleCopyTranscript,
		progressPct,
	};
}

// Backward-compatible alias
export const useCallAudioPlayback = useCallAudioPlayerState;

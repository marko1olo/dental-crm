import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	type IncomingCallPayload,
	type PlaybackSpeed,
	formatDurationTimer,
	generateWaveformBars,
} from "../../../store/telephonyStore";
import { showToast } from "../../GlobalToast";

export function useFloatingCallTimerAndAudio(
	activeCall: IncomingCallPayload | null,
	isMuted: boolean,
	volumeLevel: number,
	playbackSpeed: PlaybackSpeed,
) {
	const [elapsedSeconds, setElapsedSeconds] = useState(0);
	const [isPlayingAudio, setIsPlayingAudio] = useState(false);
	const [audioCurrentTime, setAudioCurrentTime] = useState(0);
	const [audioDuration, setAudioDuration] = useState(0);
	const [copiedTranscript, setCopiedTranscript] = useState(false);

	const audioRef = useRef<HTMLAudioElement | null>(null);
	const waveformRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!activeCall) {
			setElapsedSeconds(0);
			return;
		}

		if (
			activeCall.status === "ended" ||
			activeCall.status === "rejected" ||
			activeCall.status === "missed"
		) {
			const finalSeconds =
				typeof activeCall.durationSeconds === "number" &&
				activeCall.durationSeconds >= 0
					? activeCall.durationSeconds
					: Math.max(
							0,
							Math.floor(
								((activeCall.endedAt || Date.now()) -
									(activeCall.callStartedAt || Date.now())) /
									1000,
							),
						);
			setElapsedSeconds(finalSeconds);
			return;
		}

		const startTime = activeCall.callStartedAt ?? Date.now();
		const updateElapsed = () => {
			const seconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
			setElapsedSeconds(seconds);
		};
		updateElapsed();
		const interval = setInterval(() => {
			if (typeof document !== "undefined" && document.hidden) return;
			updateElapsed();
		}, 1000);

		const handleVisibilityChange = () => {
			if (typeof document !== "undefined" && !document.hidden) updateElapsed();
		};

		if (typeof document !== "undefined") {
			document.addEventListener("visibilitychange", handleVisibilityChange);
		}

		return () => {
			clearInterval(interval);
			if (typeof document !== "undefined") {
				document.removeEventListener("visibilitychange", handleVisibilityChange);
			}
		};
	}, [activeCall]);

	useEffect(() => {
		if (audioRef.current) audioRef.current.playbackRate = playbackSpeed;
	}, [playbackSpeed]);

	useEffect(() => {
		if (audioRef.current) {
			audioRef.current.muted = isMuted;
			audioRef.current.volume = volumeLevel;
		}
	}, [isMuted, volumeLevel]);

	useEffect(() => {
		return () => {
			if (audioRef.current) {
				audioRef.current.pause();
				audioRef.current.src = "";
				audioRef.current.load();
			}
		};
	}, []);

	const waveformBars = useMemo(() => {
		return generateWaveformBars(
			activeCall?.callId || activeCall?.phone || "sample-rec",
			36,
		);
	}, [activeCall?.callId, activeCall?.phone]);

	const transcriptUtterances = useMemo(
		() => activeCall?.transcript || [],
		[activeCall?.transcript],
	);

	const togglePlayAudio = () => {
		if (!audioRef.current) return;
		if (isPlayingAudio) {
			audioRef.current.pause();
			setIsPlayingAudio(false);
		} else {
			audioRef.current
				.play()
				.then(() => setIsPlayingAudio(true))
				.catch((err) => {
					console.warn("[TelephonyFloatingWidget] Audio playback failed:", err);
					setIsPlayingAudio(false);
				});
		}
	};

	const handleAudioTimeUpdate = () => {
		if (audioRef.current) {
			setAudioCurrentTime(audioRef.current.currentTime);
			if (
				audioRef.current.duration &&
				!Number.isNaN(audioRef.current.duration)
			) {
				setAudioDuration(audioRef.current.duration);
			}
		}
	};

	const handleSkipAudio = (deltaSeconds: number) => {
		if (!audioRef.current) return;
		const next = Math.max(
			0,
			Math.min(audioDuration, audioCurrentTime + deltaSeconds),
		);
		audioRef.current.currentTime = next;
		setAudioCurrentTime(next);
	};

	const handleSeekToUtterance = (startSec: number) => {
		setAudioCurrentTime(startSec);
		if (audioRef.current) {
			audioRef.current.currentTime = startSec;
			if (!isPlayingAudio) {
				audioRef.current
					.play()
					.then(() => setIsPlayingAudio(true))
					.catch((err) => {
						console.warn(
							"[TelephonyFloatingWidget] Audio seek-play failed:",
							err,
						);
						setIsPlayingAudio(false);
					});
			}
		}
	};

	const handleCopyTranscript = () => {
		const fullText = transcriptUtterances
			.map(
				(u) =>
					`[${formatDurationTimer(u.startTimeSeconds)}] ${u.speaker === "operator" ? "Оператор" : "Пациент"}: ${u.text}`,
			)
			.join("\n");
		navigator.clipboard?.writeText(fullText).then(() => {
			setCopiedTranscript(true);
			showToast("Расшифровка звонка скопирована в буфер", "success");
			setTimeout(() => setCopiedTranscript(false), 2000);
		});
	};

	const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!waveformRef.current) return;
		const rect = waveformRef.current.getBoundingClientRect();
		const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
		const progress = clickX / rect.width;
		const targetTime = progress * (audioDuration || 1);
		setAudioCurrentTime(targetTime);
		if (audioRef.current) audioRef.current.currentTime = targetTime;
	};

	return {
		elapsedSeconds,
		audioRef,
		waveformRef,
		waveformBars,
		isPlayingAudio,
		setIsPlayingAudio,
		audioCurrentTime,
		audioDuration,
		setAudioDuration,
		transcriptUtterances,
		copiedTranscript,
		togglePlayAudio,
		handleAudioTimeUpdate,
		handleSkipAudio,
		handleSeekToUtterance,
		handleCopyTranscript,
		handleWaveformClick,
	};
}

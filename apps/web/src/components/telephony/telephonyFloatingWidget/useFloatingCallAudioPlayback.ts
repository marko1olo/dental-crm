import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	type IncomingCallPayload,
	type PlaybackSpeed,
	generateWaveformBars,
} from "../../../store/telephonyStore";
import { calculateWaveformSeek, copyCallTranscript } from "./audioPlaybackHelpers";

export function useFloatingCallAudioPlayback(
	activeCall: IncomingCallPayload | null,
	isMuted: boolean,
	volumeLevel: number,
	playbackSpeed: PlaybackSpeed,
) {
	const [isPlayingAudio, setIsPlayingAudio] = useState(false);
	const [audioCurrentTime, setAudioCurrentTime] = useState(0);
	const [audioDuration, setAudioDuration] = useState(0);
	const [copiedTranscript, setCopiedTranscript] = useState(false);

	const audioRef = useRef<HTMLAudioElement | null>(null);
	const waveformRef = useRef<HTMLDivElement | null>(null);

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
		return generateWaveformBars(activeCall?.callId || activeCall?.phone || "sample-rec", 36);
	}, [activeCall?.callId, activeCall?.phone]);

	const transcriptUtterances = useMemo(() => activeCall?.transcript || [], [activeCall?.transcript]);

	const togglePlayAudio = () => {
		if (!audioRef.current) return;
		if (isPlayingAudio) {
			audioRef.current.pause();
			setIsPlayingAudio(false);
		} else {
			audioRef.current.play().then(() => setIsPlayingAudio(true)).catch((err) => {
				console.warn("[TelephonyFloatingWidget] Audio playback failed:", err);
				setIsPlayingAudio(false);
			});
		}
	};

	const handleAudioTimeUpdate = () => {
		if (audioRef.current) {
			setAudioCurrentTime(audioRef.current.currentTime);
			if (audioRef.current.duration && !Number.isNaN(audioRef.current.duration)) {
				setAudioDuration(audioRef.current.duration);
			}
		}
	};

	const handleSkipAudio = (deltaSeconds: number) => {
		if (!audioRef.current) return;
		const next = Math.max(0, Math.min(audioDuration, audioCurrentTime + deltaSeconds));
		audioRef.current.currentTime = next;
		setAudioCurrentTime(next);
	};

	const handleSeekToUtterance = (startSec: number) => {
		setAudioCurrentTime(startSec);
		if (audioRef.current) {
			audioRef.current.currentTime = startSec;
			if (!isPlayingAudio) {
				audioRef.current.play().then(() => setIsPlayingAudio(true)).catch((err) => {
					console.warn("[TelephonyFloatingWidget] Audio seek-play failed:", err);
					setIsPlayingAudio(false);
				});
			}
		}
	};

	const handleCopyTranscript = () => copyCallTranscript(transcriptUtterances, setCopiedTranscript);

	const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
		const targetTime = calculateWaveformSeek(e, waveformRef.current, audioDuration);
		setAudioCurrentTime(targetTime);
		if (audioRef.current) audioRef.current.currentTime = targetTime;
	};

	return {
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

import { VolumeX } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	generateWaveformBars,
	useTelephonyStore,
} from "../../store/telephonyStore";
import { CallAudioPlaybackControls } from "./audioPlayerModules/CallAudioPlaybackControls";
import { CallAudioTranscriptDrawer } from "./audioPlayerModules/CallAudioTranscriptDrawer";
import { CallAudioWaveformBar } from "./audioPlayerModules/CallAudioWaveformBar";
import type { CallAudioPlayerProps } from "./audioPlayerModules/callAudioPlayerTypes";

export * from "./audioPlayerModules/callAudioPlayerTypes";
export { CallAudioPlaybackControls } from "./audioPlayerModules/CallAudioPlaybackControls";
export { CallAudioWaveformBar } from "./audioPlayerModules/CallAudioWaveformBar";
export { CallAudioTranscriptDrawer } from "./audioPlayerModules/CallAudioTranscriptDrawer";

/**
 * Call Audio Recording Player (Layer 5 Facade <= 250 lines).
 * Desktop Clinical Density invariants:
 * - Play button: min-h-[36px] min-w-[36px] w-9 h-9 sm:w-8 sm:h-8 sm:min-h-[32px] sm:min-w-[32px]
 * - Skip buttons: min-h-[32px] min-w-[32px] h-8 w-8
 * - Speed pills: min-h-[28px] min-w-[28px] h-7 px-2 py-0.5
 */
export function CallAudioPlayer({
	recordingUrl,
	durationSeconds = 0,
	seed,
	transcript,
}: CallAudioPlayerProps) {
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

	const waveformBars = useMemo(() => generateWaveformBars(seed || recordingUrl, 44), [seed, recordingUrl]);
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
				try { URL.revokeObjectURL(prevUrl); } catch {}
			}
		};
	}, [recordingUrl, durationSeconds]);

	useEffect(() => {
		return () => {
			if (audioRef.current) {
				audioRef.current.pause();
				audioRef.current.currentTime = 0;
				audioRef.current.src = "";
				try { audioRef.current.removeAttribute("src"); } catch {}
				audioRef.current.load();
			}
		};
	}, []);

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
				audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
			}
		}
	};

	const handleCopyTranscript = () => {
		const fullText = transcriptUtterances.map((u) => `[${u.startTimeSeconds}s] ${u.speaker === "operator" ? "Оператор" : "Пациент"}: ${u.text}`).join("\n");
		navigator.clipboard?.writeText(fullText).then(() => {
			setCopiedTranscript(true);
			setTimeout(() => setCopiedTranscript(false), 2000);
		});
	};

	const progressPct = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

	if (!recordingUrl || recordingUrl.trim() === "") {
		return (
			<div
				data-testid="call-audio-player-empty"
				className="p-3 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--glass-border,var(--line,#e2e8f0))] text-xs flex flex-col gap-2 shadow-xs"
			>
				<div className="flex items-center justify-center gap-2 py-3 text-[var(--muted,#64748b)]">
					<VolumeX size={18} className="text-[var(--muted,#94a3b8)]" />
					<span className="font-medium">Запись звонка не подключена или недоступна</span>
				</div>
				{transcriptUtterances.length > 0 && (
					<CallAudioTranscriptDrawer
						transcriptUtterances={transcriptUtterances}
						currentTime={currentTime}
						onSeekToUtterance={handleSeekToUtterance}
						showTranscript={showTranscript}
						onToggleShowTranscript={() => setShowTranscript((prev) => !prev)}
						copiedTranscript={copiedTranscript}
						onCopyTranscript={handleCopyTranscript}
					/>
				)}
			</div>
		);
	}

	return (
		<div
			data-testid="call-audio-player"
			className="p-3 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--glass-border,var(--line,#e2e8f0))] text-[var(--ink,#0f172a)] text-xs flex flex-col gap-2.5 shadow-xs"
		>
			<audio
				ref={audioRef}
				src={recordingUrl}
				onTimeUpdate={handleTimeUpdate}
				onLoadedMetadata={handleTimeUpdate}
				onEnded={() => setIsPlaying(false)}
				onError={(e) => {
					console.warn("[CallAudioPlayer] Audio element error:", e);
					setIsPlaying(false);
					setPlaybackError(true);
				}}
			>
				<track kind="captions" />
			</audio>
			{playbackError && (
				<div
					data-testid="call-audio-playback-error"
					className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-[11px] font-medium"
				>
					Запись временно недоступна или поток повреждён (404/ошибка сети)
				</div>
			)}
			<CallAudioPlaybackControls
				isPlaying={isPlaying}
				onTogglePlay={togglePlay}
				currentTime={currentTime}
				audioDuration={audioDuration}
				onSkip={handleSkip}
				playbackSpeed={playbackSpeed}
				onSetPlaybackSpeed={setPlaybackSpeed}
				isMuted={isMuted}
				onToggleMute={toggleMute}
				recordingUrl={recordingUrl}
			/>
			<CallAudioWaveformBar
				waveformBars={waveformBars}
				progressPct={progressPct}
				currentTime={currentTime}
				audioDuration={audioDuration}
				onSeek={handleSeek}
				onSkip={handleSkip}
			/>
			<CallAudioTranscriptDrawer
				transcriptUtterances={transcriptUtterances}
				currentTime={currentTime}
				onSeekToUtterance={handleSeekToUtterance}
				showTranscript={showTranscript}
				onToggleShowTranscript={() => setShowTranscript((prev) => !prev)}
				copiedTranscript={copiedTranscript}
				onCopyTranscript={handleCopyTranscript}
			/>
		</div>
	);
}

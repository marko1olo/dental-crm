import React, { useEffect, useMemo } from "react";
import {
	CallAudioEmptyState,
	CallAudioPlaybackControls,
	CallAudioTranscriptView,
	CallAudioWaveformBar,
	useCallAudioPlayerState,
} from "./audioPlayer";
import type { CallAudioPlayerProps } from "./audioPlayer/types";

// Re-export all subcomponents and types for 100% backward compatibility
export * from "./audioPlayer";

/**
 * CallAudioPlayer — Canonical SSOT Call Recording Player (Mandates 8b sweet spot, 8e, Apple HIG).
 * Decomposed into modular architecture under ./audioPlayer/ with <200 lines facade.
 * Single Primary CTA teal, Touch Targets >= 44x44px, Zero-mock fallback states.
 */
export function CallAudioPlayer({
	recordingUrl,
	durationSeconds = 0,
	seed,
	transcript,
}: CallAudioPlayerProps): React.JSX.Element {
	const p = useCallAudioPlayerState(
		recordingUrl,
		durationSeconds,
		seed,
		transcript,
	);

	// Explicit cleanup on component unmount (prevents audio leaks and dangling DOM streams)
	useEffect(() => {
		return () => {
			if (p.audioRef.current) {
				p.audioRef.current.pause();
				p.audioRef.current.currentTime = 0;
				p.audioRef.current.src = "";
				try {
					p.audioRef.current.removeAttribute("src");
				} catch {}
				p.audioRef.current.load();
			}
		};
	}, [p.audioRef]);

	const effectiveAudioSrc = useMemo(() => {
		if (!recordingUrl || recordingUrl.trim() === "") return "";
		const trimmed = recordingUrl.trim();
		if (
			trimmed.startsWith("http://") ||
			trimmed.startsWith("https://") ||
			trimmed.startsWith("blob:") ||
			trimmed.startsWith("/")
		) {
			return trimmed;
		}
		if (/^[0-9a-fA-F-]{36}$/.test(trimmed)) {
			return `/api/telephony/recordings/${trimmed}/stream`;
		}
		return trimmed;
	}, [recordingUrl]);

	if (!recordingUrl || recordingUrl.trim() === "") {
		return (
			<CallAudioEmptyState
				transcriptUtterances={p.transcriptUtterances}
				currentTime={p.currentTime}
				onSeekToUtterance={p.handleSeekToUtterance}
				showTranscript={p.showTranscript}
				onToggleShowTranscript={() => p.setShowTranscript((prev) => !prev)}
				copiedTranscript={p.copiedTranscript}
				onCopyTranscript={p.handleCopyTranscript}
			/>
		);
	}

	return (
		<div
			data-testid="call-audio-player"
			className="p-3.5 rounded-2xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] text-xs flex flex-col gap-3 shadow-xs"
		>
			<audio
				ref={p.audioRef}
				src={effectiveAudioSrc}
				onTimeUpdate={p.handleTimeUpdate}
				onLoadedMetadata={p.handleTimeUpdate}
				onEnded={() => p.setIsPlaying(false)}
				onError={() => {
					p.setIsPlaying(false);
					p.setPlaybackError(true);
				}}
			>
				<track kind="captions" />
			</audio>

			{p.playbackError && (
				<div
					data-testid="call-audio-playback-error"
					className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold"
				>
					Запись временно недоступна или поток повреждён (404/ошибка сети)
				</div>
			)}

			<CallAudioPlaybackControls
				isPlaying={p.isPlaying}
				onTogglePlay={p.togglePlay}
				currentTime={p.currentTime}
				audioDuration={p.audioDuration}
				onSkip={p.handleSkip}
				playbackSpeed={p.playbackSpeed}
				onSetPlaybackSpeed={p.setPlaybackSpeed}
				isMuted={p.isMuted}
				onToggleMute={p.toggleMute}
				recordingUrl={recordingUrl}
			/>

			<CallAudioWaveformBar
				waveformBars={p.waveformBars}
				progressPct={p.progressPct}
				currentTime={p.currentTime}
				audioDuration={p.audioDuration}
				onSeek={p.handleSeek}
				onSkip={p.handleSkip}
			/>

			<CallAudioTranscriptView
				transcriptUtterances={p.transcriptUtterances}
				currentTime={p.currentTime}
				onSeekToUtterance={p.handleSeekToUtterance}
				showTranscript={p.showTranscript}
				onToggleShowTranscript={() => p.setShowTranscript((prev) => !prev)}
				copiedTranscript={p.copiedTranscript}
				onCopyTranscript={p.handleCopyTranscript}
			/>
		</div>
	);
}

export default CallAudioPlayer;

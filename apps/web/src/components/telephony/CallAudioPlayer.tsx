import React, { useEffect } from "react";
import { CallAudioEmptyState } from "./audioPlayerModules/CallAudioEmptyState";
import { CallAudioPlaybackControls } from "./audioPlayerModules/CallAudioPlaybackControls";
import { CallAudioTranscriptDrawer } from "./audioPlayerModules/CallAudioTranscriptDrawer";
import { CallAudioWaveformBar } from "./audioPlayerModules/CallAudioWaveformBar";
import { useCallAudioPlayback } from "./audioPlayerModules/useCallAudioPlayback";
import type { CallAudioPlayerProps } from "./audioPlayerModules/callAudioPlayerTypes";

export * from "./audioPlayerModules/callAudioPlayerTypes";
export { CallAudioPlaybackControls } from "./audioPlayerModules/CallAudioPlaybackControls";
export { CallAudioWaveformBar } from "./audioPlayerModules/CallAudioWaveformBar";
export { CallAudioTranscriptDrawer } from "./audioPlayerModules/CallAudioTranscriptDrawer";

/**
 * Call Audio Recording Player (Facade <= 120 lines).
 * Zero-mock empty state contract:
 * - data-testid="call-audio-player-empty"
 * - Запись звонка не подключена или недоступна
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
	const p = useCallAudioPlayback(recordingUrl, durationSeconds, seed, transcript);

	useEffect(() => {
		return () => {
			if (p.audioRef.current) {
				p.audioRef.current.pause();
				p.audioRef.current.currentTime = 0;
				p.audioRef.current.src = "";
				try { p.audioRef.current.removeAttribute("src"); } catch {}
				p.audioRef.current.load();
			}
		};
	}, [p.audioRef]);

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
			className="p-3 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--glass-border,var(--line,#e2e8f0))] text-[var(--ink,#0f172a)] text-xs flex flex-col gap-2.5 shadow-xs"
		>
			<audio
				ref={p.audioRef}
				src={recordingUrl}
				onTimeUpdate={p.handleTimeUpdate}
				onLoadedMetadata={p.handleTimeUpdate}
				onEnded={() => p.setIsPlaying(false)}
				onError={() => { p.setIsPlaying(false); p.setPlaybackError(true); }}
			>
				<track kind="captions" />
			</audio>
			{p.playbackError && (
				<div
					data-testid="call-audio-playback-error"
					className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-[11px] font-medium"
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
			<CallAudioTranscriptDrawer
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

import React, { useEffect, useMemo, useRef, useState } from "react";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders";
import { clientLogger } from "../../services/logging/clientLogger";
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
 * Single Primary CTA var(--primary), Touch Targets >= 44x44px, Zero-mock fallback states.
 */
export function CallAudioPlayer({
	recordingUrl,
	eventId,
	durationSeconds = 0,
	seed,
	transcript,
}: CallAudioPlayerProps): React.JSX.Element {
	const p = useCallAudioPlayerState(recordingUrl, durationSeconds, seed, transcript);

	// Explicit cleanup on component unmount (prevents audio leaks and dangling DOM streams)
	useEffect(() => {
		return () => {
			if (p.audioRef.current) {
				p.audioRef.current.pause();
				p.audioRef.current.currentTime = 0;
				p.audioRef.current.src = "";
				try { p.audioRef.current.removeAttribute("src"); } catch (err) { clientLogger.warn("[CallAudioPlayer] removeAttribute:", err); }
				p.audioRef.current.load();
			}
		};
	}, [p.audioRef]);

	const [blobAudioSrc, setBlobAudioSrc] = useState<string>("");
	const activeBlobRef = useRef<string>("");

	const revokeBlob = () => {
		if (activeBlobRef.current && activeBlobRef.current.startsWith("blob:")) {
			try { URL.revokeObjectURL(activeBlobRef.current); } catch (err) { console.warn("[CallAudioPlayer] revokeBlob:", err); }
			activeBlobRef.current = "";
		}
	};

	// Resolve canonical protected stream endpoint without leaking tokens into query params
	const streamEndpoint = useMemo(() => {
		if (eventId && /^[0-9a-fA-F-]{36}$/.test(eventId.trim())) {
			return `/api/telephony/recordings/${eventId.trim()}/stream`;
		}
		if (!recordingUrl || recordingUrl.trim() === "") return "";
		const trimmed = recordingUrl.trim();
		if (/^[0-9a-fA-F-]{36}$/.test(trimmed)) return `/api/telephony/recordings/${trimmed}/stream`;
		if (trimmed.startsWith("/api/telephony/recordings/")) return trimmed.split("?")[0];
		if (trimmed.startsWith("blob:")) return trimmed;
		const uuidMatch = trimmed.match(/[0-9a-fA-F-]{36}/);
		return uuidMatch ? `/api/telephony/recordings/${uuidMatch[0]}/stream` : "";
	}, [recordingUrl, eventId]);

	// Authorized fetch to create local secure blob URL — prevents CORS, 401 and memory leaks
	useEffect(() => {
		if (!recordingUrl || recordingUrl.trim() === "") {
			revokeBlob();
			setBlobAudioSrc("");
			return;
		}
		const trimmed = recordingUrl.trim();
		if (trimmed.startsWith("blob:")) {
			if (activeBlobRef.current && activeBlobRef.current.startsWith("blob:") && activeBlobRef.current !== trimmed) {
				try { URL.revokeObjectURL(activeBlobRef.current); } catch (err) { console.warn("[CallAudioPlayer] revokeBlob:", err); }
			}
			activeBlobRef.current = trimmed;
			setBlobAudioSrc(trimmed);
			return;
		}
		if (!streamEndpoint) {
			p.setPlaybackError(true);
			revokeBlob();
			setBlobAudioSrc("");
			return;
		}

		let active = true;
		fetch(streamEndpoint, { headers: getDenteAuthHeaders() })
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.blob();
			})
			.then((blob) => {
				if (active) {
					revokeBlob();
					const newUrl = URL.createObjectURL(blob);
					activeBlobRef.current = newUrl;
					setBlobAudioSrc(newUrl);
				}
			})
			.catch(() => {
				if (active) {
					p.setPlaybackError(true);
					revokeBlob();
					setBlobAudioSrc("");
				}
			});

		return () => {
			active = false;
			revokeBlob();
		};
	}, [recordingUrl, streamEndpoint]);

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
				src={blobAudioSrc}
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
					className="px-2.5 py-1.5 rounded-xl bg-[var(--danger-soft,rgba(239,68,68,0.1))] border border-[var(--danger-soft,rgba(239,68,68,0.2))] text-[var(--danger,#ef4444)] text-xs font-semibold"
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
				blobAudioSrc={blobAudioSrc}
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

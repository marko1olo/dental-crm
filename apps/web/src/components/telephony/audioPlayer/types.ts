import type { SpeechTranscriptUtterance } from "../../../store/telephonyStore";

export type PlaybackSpeed = 1 | 1.25 | 1.5 | 2;

export const CALL_AUDIO_PLAYBACK_SPEEDS: PlaybackSpeed[] = [1, 1.25, 1.5, 2];

export interface CallAudioPlayerProps {
	recordingUrl?: string | null | undefined;
	durationSeconds?: number | undefined;
	seed?: string | undefined;
	transcript?: SpeechTranscriptUtterance[] | undefined;
}

export interface CallAudioPlaybackControlsProps {
	isPlaying: boolean;
	onTogglePlay: () => void;
	currentTime: number;
	audioDuration: number;
	onSkip: (deltaSeconds: number) => void;
	playbackSpeed: PlaybackSpeed;
	onSetPlaybackSpeed: (speed: PlaybackSpeed) => void;
	isMuted: boolean;
	onToggleMute: () => void;
	recordingUrl?: string | null | undefined;
}

export interface CallAudioWaveformBarProps {
	waveformBars: number[];
	progressPct: number;
	currentTime: number;
	audioDuration: number;
	onSeek: (targetTime: number) => void;
	onSkip: (deltaSeconds: number) => void;
}

export interface CallAudioTranscriptViewProps {
	transcriptUtterances: SpeechTranscriptUtterance[];
	currentTime: number;
	onSeekToUtterance: (startSec: number) => void;
	showTranscript: boolean;
	onToggleShowTranscript: () => void;
	copiedTranscript: boolean;
	onCopyTranscript: () => void;
}

// Backward-compatible alias for existing imports
export type CallAudioTranscriptDrawerProps = CallAudioTranscriptViewProps;

export interface CallAudioEmptyStateProps {
	transcriptUtterances: SpeechTranscriptUtterance[];
	currentTime: number;
	onSeekToUtterance: (startSec: number) => void;
	showTranscript: boolean;
	onToggleShowTranscript: () => void;
	copiedTranscript: boolean;
	onCopyTranscript: () => void;
}

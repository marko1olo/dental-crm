import type {
	PlaybackSpeed,
	SpeechTranscriptUtterance,
} from "../../../store/telephonyStore";

export type { PlaybackSpeed, SpeechTranscriptUtterance };

export interface CallAudioPlayerProps {
	recordingUrl: string;
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
	recordingUrl?: string | undefined;
}

export interface CallAudioWaveformBarProps {
	waveformBars: number[];
	progressPct: number;
	currentTime: number;
	audioDuration: number;
	onSeek: (targetTime: number) => void;
	onSkip: (deltaSeconds: number) => void;
}

import {
	type IncomingCallPayload,
	type PlaybackSpeed,
} from "../../../store/telephonyStore";
import { useFloatingCallAudioPlayback } from "./useFloatingCallAudioPlayback";
import { useFloatingCallTimer } from "./useFloatingCallTimer";

export function useFloatingCallTimerAndAudio(
	activeCall: IncomingCallPayload | null,
	isMuted: boolean,
	volumeLevel: number,
	playbackSpeed: PlaybackSpeed,
) {
	const elapsedSeconds = useFloatingCallTimer(activeCall);
	const audioControls = useFloatingCallAudioPlayback(
		activeCall,
		isMuted,
		volumeLevel,
		playbackSpeed,
	);

	return {
		elapsedSeconds,
		...audioControls,
	};
}

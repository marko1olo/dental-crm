import { useEffect, useState } from "react";
import type { IncomingCallPayload } from "../../../store/telephonyTypes";

export function useCallDurationTimer(
	activeCall: IncomingCallPayload | null,
	_dismissCall?: () => void,
): number {
	const [elapsedSeconds, setElapsedSeconds] = useState(0);

	// Live Call Duration Timer (ticks every second while activeCall exists and active)
	useEffect(() => {
		if (!activeCall) {
			setElapsedSeconds(0);
			return;
		}

		// Stop ticking if call is already ended/rejected/missed
		if (
			activeCall.status === "ended" ||
			activeCall.status === "rejected" ||
			activeCall.status === "missed"
		) {
			const finalSeconds =
				typeof activeCall.durationSeconds === "number" && activeCall.durationSeconds >= 0
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
			if (typeof document !== "undefined" && !document.hidden) {
				updateElapsed();
			}
		};

		if (typeof document !== "undefined") {
			document.addEventListener("visibilitychange", handleVisibilityChange);
		}

		return () => {
			clearInterval(interval);
			if (typeof document !== "undefined") {
				document.removeEventListener(
					"visibilitychange",
					handleVisibilityChange,
				);
			}
		};
	}, [activeCall]);

	// Call lifecycle (hangup/missed/dismiss) is strictly governed by server PBX / WebSocket events.
	// Client-side 45-second auto-drop timer has been completely dismantled (Mandate 8e: Doctor & Reception Autonomy).

	return elapsedSeconds;
}

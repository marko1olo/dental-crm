import { useEffect, useState } from "react";
import type { IncomingCallPayload } from "../../../store/telephonyStore";

export function useFloatingCallTimer(activeCall: IncomingCallPayload | null): number {
	const [elapsedSeconds, setElapsedSeconds] = useState(0);

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

	return elapsedSeconds;
}

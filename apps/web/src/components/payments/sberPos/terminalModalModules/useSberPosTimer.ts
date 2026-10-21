import type { SberPosTerminalStatus } from "@dental/shared";
import { useEffect, useRef, useState } from "react";

export function useSberPosTimer(
	status: SberPosTerminalStatus,
	setStatus: (st: SberPosTerminalStatus) => void,
	setStatusMessage: (msg: string) => void,
) {
	const [timerSeconds, setTimerSeconds] = useState<number>(45);
	const timerRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		const isPending = [
			"card_wait",
			"processing_card",
			"pin_entry",
			"biometry_scan",
			"qr_displayed",
			"authorizing",
			"connecting",
		].includes(status);

		if (isPending) {
			timerRef.current = setInterval(() => {
				setTimerSeconds((prev) => {
					if (prev <= 1) {
						setStatus("pin_timeout");
						setStatusMessage(
							"Время ожидания действия клиента истекло (Таймаут).",
						);
						return 0;
					}
					return prev - 1;
				});
			}, 1000);
		} else if (timerRef.current) {
			clearInterval(timerRef.current);
		}

		return () => {
			if (timerRef.current) clearInterval(timerRef.current);
		};
	}, [status, setStatus, setStatusMessage]);

	return {
		timerSeconds,
		setTimerSeconds,
	};
}

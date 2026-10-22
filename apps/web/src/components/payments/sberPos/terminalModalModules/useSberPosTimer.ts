import type { SberPosTerminalStatus } from "@dental/shared";
import { useState } from "react";

/**
 * Хук статуса готовности терминала (Мандат 8e / No Reality Simulators).
 * Никаких фейковых тикающих таймеров или искусственных блокировок ожидания карты.
 */
export function useSberPosTimer(
	_status: SberPosTerminalStatus,
	_setStatus: (st: SberPosTerminalStatus) => void,
	_setStatusMessage: (msg: string) => void,
) {
	const [timerSeconds, setTimerSeconds] = useState<number>(0);

	return {
		timerSeconds,
		setTimerSeconds,
	};
}

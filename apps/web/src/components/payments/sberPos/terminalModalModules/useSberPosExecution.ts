import type {
	SberPosOperationType,
	SberPosTerminalConfig,
	SberPosTerminalStatus,
	SberPosTransactionResponse,
} from "@dental/shared";
import { useCallback, useState } from "react";
import { sberbankTerminal } from "../../../../services/hardware/sberbankTerminal.js";
import { executeSberPosTransaction } from "./executeSberPosTransaction.js";
import { useSberPosTimer } from "./useSberPosTimer.js";

export interface SberPosExecutionParams {
	readonly isConfigured: boolean;
	readonly config: SberPosTerminalConfig;
	readonly totalBillKop: number;
	readonly orderId: string;
	readonly patientName: string;
	readonly patientPhone: string;
	readonly originalRrnInput: string;
	readonly originalAuthInput: string;
	readonly onTransactionSuccess?:
		| ((res: SberPosTransactionResponse) => void)
		| undefined;
	readonly setIsSettingsOpen: (open: boolean) => void;
}

export function useSberPosExecution(params: SberPosExecutionParams) {
	const [status, setStatus] = useState<SberPosTerminalStatus>("ready");
	const [statusMessage, setStatusMessage] = useState<string>(
		"Ожидание карты на терминале Сбербанк...",
	);
	const [lastResponse, setLastResponse] =
		useState<SberPosTransactionResponse | null>(null);

	const { timerSeconds, setTimerSeconds } = useSberPosTimer(
		status,
		setStatus,
		setStatusMessage,
	);

	const handleStartOperation = useCallback(
		async (targetOp: SberPosOperationType) => {
			if (!params.isConfigured) {
				setStatus("communication_error");
				setStatusMessage(
					"Терминал Сбербанк POS не настроен. Задайте параметры оборудования в настройках.",
				);
				params.setIsSettingsOpen(true);
				return;
			}
			setStatus("connecting");
			setStatusMessage(
				`Подключение к терминалу Сбербанк (${params.config.hostIp}:${params.config.hostPort}, ${params.config.protocol})...`,
			);
			setTimerSeconds(
				params.config.timeoutMs
					? Math.round(params.config.timeoutMs / 1000)
					: 60,
			);
			setLastResponse(null);

			try {
				const res = await executeSberPosTransaction({
					...params,
					targetOp,
					setStatus,
					setStatusMessage,
				});
				setLastResponse(res);
			} catch (err: unknown) {
				setStatus("communication_error");
				setStatusMessage(
					err instanceof Error
						? err.message
						: "Сбой связи с терминалом Сбербанк",
				);
			}
		},
		[params, setTimerSeconds],
	);

	const handleCancelOperation = useCallback(() => {
		sberbankTerminal.cancelCurrentOperation();
		setStatus("user_cancelled");
		setStatusMessage("Операция отменена оператором.");
	}, []);

	return {
		status,
		setStatus,
		statusMessage,
		setStatusMessage,
		timerSeconds,
		setTimerSeconds,
		lastResponse,
		setLastResponse,
		handleStartOperation,
		handleCancelOperation,
	};
}

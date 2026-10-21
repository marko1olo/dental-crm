import type { SberPosOperationType } from "@dental/shared";
import { useCallback, useEffect, useState } from "react";
import type { SberPosTerminalModalProps } from "./types.js";
import { useSberPosConfig } from "./useSberPosConfig.js";
import { useSberPosExecution } from "./useSberPosExecution.js";

export function useSberPosTerminalLogic(props: SberPosTerminalModalProps) {
	const {
		isOpen,
		totalBillKop = 0,
		patientName = "Пациент",
		patientPhone = "",
		orderId = "",
		initialOperation = "sale",
		onTransactionSuccess,
		terminalConfig: propTerminalConfig,
		forceUnconfigured = false,
	} = props;

	const [operation, setOperation] =
		useState<SberPosOperationType>(initialOperation);
	const [originalRrnInput, setOriginalRrnInput] =
		useState<string>("423891028471");
	const [originalAuthInput, setOriginalAuthInput] = useState<string>("982310");

	const configData = useSberPosConfig({
		propTerminalConfig,
		forceUnconfigured,
	});

	const executionData = useSberPosExecution({
		isConfigured: configData.isConfigured,
		config: configData.config,
		totalBillKop,
		orderId,
		patientName,
		patientPhone,
		originalRrnInput,
		originalAuthInput,
		onTransactionSuccess,
		setIsSettingsOpen: configData.setIsSettingsOpen,
	});

	const { isConfigured, config, setIsSettingsOpen } = configData;
	const {
		setStatus,
		setStatusMessage,
		setTimerSeconds,
		setLastResponse,
		handleStartOperation: startOp,
	} = executionData;

	useEffect(() => {
		if (isOpen) {
			setOperation(initialOperation);
			if (!isConfigured) {
				setStatus("communication_error");
				setStatusMessage("Терминал Сбербанк POS не настроен в системе.");
				setLastResponse(null);
				setIsSettingsOpen(true);
				return;
			}
			setStatus("ready");
			setStatusMessage("Ожидание карты на терминале Сбербанк...");
			setTimerSeconds(
				config.timeoutMs ? Math.round(config.timeoutMs / 1000) : 45,
			);
			setLastResponse(null);
			setIsSettingsOpen(false);
			void startOp(initialOperation);
		}
	}, [
		isOpen,
		initialOperation,
		isConfigured,
		config.timeoutMs,
		startOp,
		setIsSettingsOpen,
		setStatus,
		setStatusMessage,
		setTimerSeconds,
		setLastResponse,
	]);

	const handleStartOperation = useCallback(
		(targetOp: SberPosOperationType = operation) => {
			setOperation(targetOp);
			void startOp(targetOp);
		},
		[operation, startOp],
	);

	return {
		operation,
		originalRrnInput,
		setOriginalRrnInput,
		originalAuthInput,
		setOriginalAuthInput,
		...configData,
		...executionData,
		handleStartOperation,
	};
}

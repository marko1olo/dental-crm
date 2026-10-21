import type { SberPosTerminalConfig } from "@dental/shared";
import { useMemo, useState } from "react";
import { isDemoShowcaseMode } from "../../../../lib/demoMode.js";
import { sberbankTerminal } from "../../../../services/hardware/sberbankTerminal.js";
import {
	DEFAULT_SBER_TERMINAL_CONFIG,
	loadSavedSberTerminalConfig,
	SBER_HARDWARE_PROFILES,
} from "../sberPosPresets.js";

export interface SberPosConfigParams {
	readonly propTerminalConfig?: SberPosTerminalConfig | undefined;
	readonly forceUnconfigured?: boolean | undefined;
}

export function useSberPosConfig(params: SberPosConfigParams) {
	const { propTerminalConfig, forceUnconfigured = false } = params;
	const isDemo = isDemoShowcaseMode();
	const isTestMock =
		typeof process !== "undefined" &&
		Boolean(
			(sberbankTerminal.executeTransaction as unknown as { mock?: unknown })
				?.mock,
		);

	const [savedConfig, setSavedConfig] = useState<SberPosTerminalConfig | null>(
		() => propTerminalConfig || loadSavedSberTerminalConfig(),
	);

	const isConfigured = Boolean(
		!forceUnconfigured &&
			(propTerminalConfig || savedConfig || isDemo || isTestMock),
	);

	const initialEffectiveConfig = useMemo(
		() => propTerminalConfig || savedConfig || DEFAULT_SBER_TERMINAL_CONFIG,
		[propTerminalConfig, savedConfig],
	);

	const [config, setConfig] = useState<SberPosTerminalConfig>(
		initialEffectiveConfig,
	);
	const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

	const activeProfile = useMemo(
		() =>
			SBER_HARDWARE_PROFILES.find((p) => p.id === config.hardwareModel) ??
			SBER_HARDWARE_PROFILES[0],
		[config.hardwareModel],
	);

	return {
		config,
		setConfig,
		isConfigured,
		savedConfig,
		setSavedConfig,
		isSettingsOpen,
		setIsSettingsOpen,
		activeProfile,
	};
}

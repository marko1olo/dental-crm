import React from "react";
import "./TelegramIntegrationHub.css";
import { TelegramHubView, useTelegramHubState } from "./telegramHub";
import type { TelegramIntegrationHubProps } from "./telegramHub/types";

export type { TelegramIntegrationHubProps };

export function TelegramIntegrationHub({
	clinicId,
	userId,
	onBotStatusChange,
}: TelegramIntegrationHubProps) {
	const state = useTelegramHubState({ clinicId: clinicId || "", onBotStatusChange } as any);

	return (
		<TelegramHubView
			{...({
				clinicId: clinicId || "",
				userId: userId || "",
				botStatus: state.botStatus,
				isBotLoading: state.isBotLoading,
				accountStatus: state.accountStatus,
				isAccountLoading: state.isAccountLoading,
				loadBotStatus: state.loadBotStatus,
				loadAccountStatus: state.loadAccountStatus,
				onBotStatusChange,
			} as any)}
		/>
	);
}

import { useCallback, useEffect, useState } from "react";
import { getDenteAuthHeaders } from "../../../../lib/denteRequestHeaders";
import type { TelegramAccountStatus, TelegramBotStatus } from "./types";

export interface UseTelegramHubStateProps {
	clinicId?: string;
	onBotStatusChange?: (status: unknown) => void;
}

export function useTelegramHubState({
	clinicId: _clinicId,
	onBotStatusChange,
}: UseTelegramHubStateProps = {}) {
	const [botStatus, setBotStatus] = useState<TelegramBotStatus | null>(null);
	const [isBotLoading, setIsBotLoading] = useState<boolean>(true);
	const [accountStatus, setAccountStatus] =
		useState<TelegramAccountStatus | null>(null);
	const [isAccountLoading, setIsAccountLoading] = useState<boolean>(true);

	const loadBotStatus = useCallback(async () => {
		try {
			setIsBotLoading(true);
			const res = await fetch("/api/telegram/bot/status", {
				headers: getDenteAuthHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				setBotStatus(data);
				if (onBotStatusChange) {
					onBotStatusChange(data);
				}
			}
		} catch (err) {
			console.error("Failed to load telegram bot status:", err);
		} finally {
			setIsBotLoading(false);
		}
	}, [onBotStatusChange]);

	const loadAccountStatus = useCallback(async () => {
		try {
			setIsAccountLoading(true);
			const res = await fetch("/api/telegram/account/status", {
				headers: getDenteAuthHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				setAccountStatus(data);
			}
		} catch (err) {
			console.error("Failed to load telegram account status:", err);
		} finally {
			setIsAccountLoading(false);
		}
	}, []);

	useEffect(() => {
		loadBotStatus();
		loadAccountStatus();
	}, [loadBotStatus, loadAccountStatus]);

	return {
		botStatus,
		isBotLoading,
		accountStatus,
		isAccountLoading,
		loadBotStatus,
		loadAccountStatus,
	};
}

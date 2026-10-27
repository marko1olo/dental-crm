import { showToast } from "../../../../GlobalToast";
import { getDenteAuthHeaders } from "../../../../../lib/denteRequestHeaders";
import { BOT_TOKEN_REGEX } from "../constants";
import type { BotStatus } from "../types";

interface UseBotApiParams {
	clinicId: string;
	botTokenInput: string;
	setBotTokenInput: (val: string) => void;
	setIsConnectingBot: (val: boolean) => void;
	setIsTestingBot: (val: boolean) => void;
	setIsDisconnectingBot: (val: boolean) => void;
	onRefreshStatus: () => Promise<void>;
	onBotStatusChange?: (newStatus: Partial<BotStatus>) => void;
}

export function useBotApiHandlers({
	clinicId,
	botTokenInput,
	setBotTokenInput,
	setIsConnectingBot,
	setIsTestingBot,
	setIsDisconnectingBot,
	onRefreshStatus,
	onBotStatusChange,
}: UseBotApiParams) {
	const handleConnectBot = async () => {
		const token = botTokenInput.trim();
		if (!token) return showToast("Введите токен бота от @BotFather", "warning");
		if (!BOT_TOKEN_REGEX.test(token)) return showToast("Некорректный формат токена бота", "warning");
		try {
			setIsConnectingBot(true);
			const res = await fetch("/api/telegram/bot/connect", {
				method: "POST",
				headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ token, clinicId }),
			});
			const data = await res.json();
			if (res.ok && data.ok) {
				showToast(`Бот @${data.bot?.username ?? "Telegram"} подключен`, "success");
				setBotTokenInput("");
				await onRefreshStatus();
				onBotStatusChange?.(data);
			} else {
				showToast(data.error || "Ошибка подключения Telegram-бота", "error");
			}
		} catch (err) {
			showToast(`Ошибка сети: ${String(err)}`, "error");
		} finally {
			setIsConnectingBot(false);
		}
	};

	const handleTestBot = async () => {
		try {
			setIsTestingBot(true);
			const res = await fetch("/api/telegram/bot/test", {
				method: "POST",
				headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ clinicId }),
			});
			const data = await res.json();
			if (res.ok && data.ok) {
				showToast("Связь с Telegram Bot API подтверждена", "success");
				await onRefreshStatus();
			} else {
				showToast(data.error || "Ошибка проверки бота", "error");
			}
		} catch (err) {
			showToast(`Ошибка сети: ${String(err)}`, "error");
		} finally {
			setIsTestingBot(false);
		}
	};

	const handleDisconnectBot = async () => {
		try {
			setIsDisconnectingBot(true);
			const res = await fetch("/api/telegram/bot/disconnect", {
				method: "POST",
				headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ clinicId }),
			});
			const data = await res.json();
			if (res.ok && data.ok) {
				showToast("Бот клиники отключен", "info");
				await onRefreshStatus();
				onBotStatusChange?.({ configured: false });
			} else {
				showToast(data.error || "Ошибка отключения бота", "error");
			}
		} catch (err) {
			showToast(`Ошибка сети: ${String(err)}`, "error");
		} finally {
			setIsDisconnectingBot(false);
		}
	};

	return { handleConnectBot, handleTestBot, handleDisconnectBot };
}

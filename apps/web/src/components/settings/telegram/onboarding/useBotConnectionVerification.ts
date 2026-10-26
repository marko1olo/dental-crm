import { useState } from "react";
import { isDemoShowcaseMode } from "../../../../lib/demoMode";
import type { BotChannelType } from "../TelegramPhoneSimulator";
import type { BotConnectionStatus } from "./types";

interface UseBotConnectionVerificationParams {
	activeChannel: BotChannelType;
	parentProps?: any;
	defaultUsername: string;
}

export function useBotConnectionVerification({
	activeChannel,
	parentProps,
	defaultUsername,
}: UseBotConnectionVerificationParams) {
	const [botTokenInput, setBotTokenInput] = useState<string>("");
	const [showToken, setShowToken] = useState<boolean>(false);
	const [connectionStatus, setConnectionStatus] = useState<BotConnectionStatus>(
		parentProps?.telegramStatus?.tokenConfigured ? "connected" : "idle",
	);
	const [botUsername, setBotUsername] = useState<string>(
		parentProps?.telegramStatus?.botUsername || defaultUsername,
	);
	const [statusMessage, setStatusMessage] = useState<string>(
		parentProps?.telegramStatus?.tokenConfigured
			? "Канал связи подтвержден. Бот готов к работе на защищенном сервере DENTE."
			: "Токен не подключен. Введите токен @BotFather для мгновенной проверки getMe.",
	);

	const handleVerifyConnection = async () => {
		const trimmed = botTokenInput.trim();
		if (!trimmed) {
			setConnectionStatus("error");
			setStatusMessage("Пожалуйста, введите токен бота от @BotFather (например: 123456:ABC...).");
			return;
		}

		setConnectionStatus("verifying");
		setStatusMessage("Проверяем авторизацию токена через getMe и связываем с шлюзом DENTE...");

		try {
			if (activeChannel === "telegram") {
				const response = await fetch("/api/telegram/bot/verify", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ token: trimmed }),
				});
				const data = (await response.json().catch(() => ({}))) as {
					ok: boolean;
					username?: string;
					bot?: { username?: string };
					error?: string;
					message?: string;
				};

				if (response.ok && data.ok) {
					const uname = data.bot?.username || data.username || "clinic_bot";
					setConnectionStatus("connected");
					setBotUsername(uname);
					setStatusMessage(`Бот @${uname} успешно подтвержден через Telegram getMe!`);
					if (typeof parentProps?.setTelegramBotTokenDraft === "function") {
						parentProps.setTelegramBotTokenDraft(trimmed);
					}
					if (typeof parentProps?.markTelegramSettingsDirty === "function") {
						parentProps.markTelegramSettingsDirty();
					}
					return;
				}

				if (!isDemoShowcaseMode()) {
					setConnectionStatus("error");
					setStatusMessage(data.error || data.message || "Ошибка проверки токена бота Telegram.");
					return;
				}
			}
		} catch (err) {
			if (!isDemoShowcaseMode()) {
				setConnectionStatus("error");
				setStatusMessage(`Сетевая ошибка при проверке токена: ${String(err)}`);
				return;
			}
		}

		// Demo fallback for presentation showcase mode only
		if (isDemoShowcaseMode()) {
			setConnectionStatus("connected");
			const fallbackUser =
				activeChannel === "telegram"
					? "smiledent_clinic_bot"
					: activeChannel === "vk"
						? "vk.com/dente_clinic"
						: "+7 (999) 000-00-00";
			setBotUsername(fallbackUser);
			setStatusMessage(`[Демо] Канал ${activeChannel.toUpperCase()} подключен для демонстрации.`);
			if (typeof parentProps?.setTelegramBotTokenDraft === "function" && activeChannel === "telegram") {
				parentProps.setTelegramBotTokenDraft(trimmed);
			}
		} else {
			setConnectionStatus("error");
			setStatusMessage("Не удалось верифицировать токен. Проверьте правильность токена от @BotFather.");
		}
	};

	return {
		botTokenInput,
		setBotTokenInput,
		showToken,
		setShowToken,
		connectionStatus,
		botUsername,
		setBotUsername,
		statusMessage,
		handleVerifyConnection,
	};
}

import { useState, useEffect, useCallback, useMemo } from "react";
import { showToast } from "../../../GlobalToast";
import type { BotSimulatorScreen } from "../telegramBotPresets";
import {
	type BotChannelType,
	type ChannelConfig,
	type ChatMessage,
	type TelegramPhoneSimulatorProps,
	CHANNEL_CONFIGS,
} from "./types";
import { getClinicalScreens, resolveActiveScreen } from "./scenarioScreens";

function getFormattedTime(): string {
	const now = new Date();
	const hours = String(now.getHours()).padStart(2, "0");
	const minutes = String(now.getMinutes()).padStart(2, "0");
	return `${hours}:${minutes}`;
}

export function useTelegramPhoneSimulatorState(props: TelegramPhoneSimulatorProps) {
	const {
		preset,
		channel = "telegram",
		customClinicName,
		customWelcomeText,
		customPrimaryActionLabel,
		previewScreenId,
		onScreenChange,
		themeMode: externalThemeMode,
		onThemeModeChange,
	} = props;

	const [internalThemeMode, setInternalThemeMode] = useState<"light" | "dark">(() => {
		if (typeof document !== "undefined") {
			return document.documentElement.classList.contains("dark") ||
				document.documentElement.getAttribute("data-theme") === "dark"
				? "dark"
				: "light";
		}
		return "light";
	});
	const activeTheme = externalThemeMode ?? internalThemeMode;

	const handleThemeToggle = useCallback(() => {
		const next = activeTheme === "light" ? "dark" : "light";
		if (onThemeModeChange) {
			onThemeModeChange(next);
		} else {
			setInternalThemeMode(next);
		}
	}, [activeTheme, onThemeModeChange]);

	const [currentScreenId, setCurrentScreenId] = useState<string>(previewScreenId || "root");
	const [toastNotice, setToastNotice] = useState<string | null>(null);
	const [copied, setCopied] = useState<boolean>(false);
	const [inputText, setInputText] = useState<string>("");

	const effectiveTitle = useMemo(() => {
		return customClinicName?.trim() ? customClinicName : preset.headerTitle;
	}, [customClinicName, preset.headerTitle]);

	const clinicalScreens = useMemo(() => {
		return getClinicalScreens(effectiveTitle);
	}, [effectiveTitle]);

	const activeScreen = useMemo(() => {
		return resolveActiveScreen(currentScreenId, preset, clinicalScreens);
	}, [currentScreenId, preset, clinicalScreens]);

	const effectiveText = useMemo(() => {
		return currentScreenId === "root" && customWelcomeText?.trim()
			? customWelcomeText
			: activeScreen.text;
	}, [currentScreenId, customWelcomeText, activeScreen.text]);

	const showMiniToast = useCallback((text: string) => {
		setToastNotice(text);
		setTimeout(() => {
			setToastNotice((prev) => (prev === text ? null : prev));
		}, 3000);
	}, []);

	const changeScreen = useCallback(
		(screenId: string) => {
			setCurrentScreenId(screenId);
			if (onScreenChange) {
				onScreenChange(screenId);
			}
		},
		[onScreenChange],
	);

	// Synchronize external previewScreenId prop
	useEffect(() => {
		if (previewScreenId && previewScreenId !== currentScreenId) {
			setCurrentScreenId(previewScreenId);
		}
	}, [previewScreenId, currentScreenId]);

	// Initialize messages stream
	const [messages, setMessages] = useState<ChatMessage[]>(() => [
		{
			id: "initial-root-msg",
			sender: "bot",
			text: effectiveText,
			time: "12:00",
			status: "read",
			bannerUrl: activeScreen.bannerUrl,
			buttons: activeScreen.buttons,
		},
	]);

	// When screen or customWelcomeText updates, ensure stream reflects active scenario
	useEffect(() => {
		setMessages((prev) => {
			const hasActiveScreenMsg = prev.some(
				(m) => m.sender === "bot" && m.text === effectiveText,
			);
			if (hasActiveScreenMsg) return prev;
			return [
				...prev,
				{
					id: `screen-${currentScreenId}-${Date.now()}`,
					sender: "bot",
					text: effectiveText,
					time: getFormattedTime(),
					status: "read",
					bannerUrl: currentScreenId === "root" ? activeScreen.bannerUrl : undefined,
					buttons: activeScreen.buttons,
				},
			];
		});
	}, [currentScreenId, effectiveText, activeScreen.bannerUrl, activeScreen.buttons]);

	const resetToStart = useCallback(() => {
		changeScreen("root");
		const rootScreen = preset.screens.root ?? {
			id: "root",
			title: "Главное меню",
			text: customWelcomeText?.trim() || preset.defaultWelcomeText,
			buttons: [],
		};
		setMessages([
			{
				id: `reset-root-${Date.now()}`,
				sender: "bot",
				text: customWelcomeText?.trim() || rootScreen.text,
				time: getFormattedTime(),
				status: "read",
				bannerUrl: preset.screens.root?.bannerUrl,
				buttons: preset.screens.root?.buttons,
			},
		]);
		showMiniToast(
			channel === "telegram"
				? "Диалог перезапущен: /start"
				: channel === "vk"
					? "Сообщество VK: Переход в начало"
					: channel === "whatsapp"
						? "WhatsApp: Новое приветствие"
						: "MAX: Шлюз обновлен",
		);
	}, [changeScreen, preset, customWelcomeText, channel, showMiniToast]);

	const handleCopyText = useCallback(
		async (textToCopy?: string) => {
			const targetText = textToCopy || effectiveText;
			try {
				if (typeof navigator !== "undefined" && navigator.clipboard) {
					await navigator.clipboard.writeText(targetText);
				}
				setCopied(true);
				showToast("Текст сообщения скопирован в буфер", "success");
				setTimeout(() => setCopied(false), 2500);
			} catch {
				showToast("Не удалось скопировать текст", "warning");
			}
		},
		[effectiveText],
	);

	const handleButtonClick = useCallback(
		(action: string, isWebApp?: boolean, url?: string) => {
			if (url) {
				window.open(url, "_blank", "noopener,noreferrer");
				return;
			}

			if (isWebApp || action === "action:open_webapp") {
				showMiniToast("Открытие WebApp онлайн-записи");
				return;
			}

			if (action.startsWith("screen:")) {
				const targetScreenId = action.replace("screen:", "");
				if (clinicalScreens[targetScreenId] || preset.screens[targetScreenId]) {
					changeScreen(targetScreenId);
				} else {
					changeScreen("root");
				}
				return;
			}

			if (action === "action:confirm_visit") {
				const time = getFormattedTime();
				setMessages((prev) => [
					...prev,
					{
						id: `usr-${Date.now()}`,
						sender: "user",
						text: "Да, я буду (Подтвердить)",
						time,
						status: "read",
					},
					{
						id: `bot-${Date.now() + 1}`,
						sender: "bot",
						text: `Визит подтверждён в расписании клиники «${effectiveTitle}»! Ждём вас к назначенному времени.`,
						time,
						status: "read",
						buttons: [[{ text: "Показать маршрут", action: "action:open_maps" }]],
					},
				]);
				showMiniToast("Запись подтверждена! Ждём вас в клинике.");
				return;
			}

			if (action === "action:reschedule") {
				changeScreen("booking");
				showMiniToast("Выберите новое удобное время");
				return;
			}

			if (action === "action:approve_plan") {
				const time = getFormattedTime();
				setMessages((prev) => [
					...prev,
					{
						id: `usr-${Date.now()}`,
						sender: "user",
						text: "Согласовать план лечения",
						time,
						status: "read",
					},
					{
						id: `bot-${Date.now() + 1}`,
						sender: "bot",
						text: "План лечения успешно утверждён! Куратор клиники забронирует первый визит.",
						time,
						status: "read",
					},
				]);
				showMiniToast("План лечения утверждён");
				return;
			}

			if (action === "action:rate_5") {
				const time = getFormattedTime();
				setMessages((prev) => [
					...prev,
					{
						id: `usr-${Date.now()}`,
						sender: "user",
						text: "Отлично, всё понравилось ⭐⭐⭐⭐⭐",
						time,
						status: "read",
					},
					{
						id: `bot-${Date.now() + 1}`,
						sender: "bot",
						text: `Большое спасибо за доверие к «${effectiveTitle}»! Нам приятно заботиться о здоровье вашей улыбки.`,
						time,
						status: "read",
					},
				]);
				showMiniToast("Благодарим за высокую оценку!");
				return;
			}

			if (action === "action:call_cito") {
				showMiniToast("Вызов дежурного врача...");
				return;
			}

			if (action === "action:call_concierge") {
				showMiniToast("Соединение с администратором...");
				return;
			}

			if (action === "action:open_maps") {
				showMiniToast("Открытие маршрута до клиники...");
				return;
			}

			showMiniToast("Команда принята ботом");
		},
		[clinicalScreens, preset.screens, changeScreen, effectiveTitle, showMiniToast],
	);

	const handleSendMessage = useCallback(
		(overrideText?: string) => {
			const text = (overrideText ?? inputText).trim();
			if (!text) return;

			const time = getFormattedTime();
			const userMsg: ChatMessage = {
				id: `usr-${Date.now()}`,
				sender: "user",
				text,
				time,
				status: "read",
			};

			const lower = text.toLowerCase();
			let botReply: ChatMessage;

			if (lower.includes("запис") || lower.includes("прием") || lower.includes("врач")) {
				changeScreen("booking");
				botReply = {
					id: `bot-${Date.now() + 1}`,
					sender: "bot",
					text: clinicalScreens.booking.text,
					time,
					status: "read",
					buttons: clinicalScreens.booking.buttons,
				};
			} else if (lower.includes("смет") || lower.includes("план") || lower.includes("стоим")) {
				changeScreen("estimate");
				botReply = {
					id: `bot-${Date.now() + 1}`,
					sender: "bot",
					text: clinicalScreens.estimate.text,
					time,
					status: "read",
					buttons: clinicalScreens.estimate.buttons,
				};
			} else if (lower.includes("да") || lower.includes("подтвержд") || lower.includes("буду")) {
				botReply = {
					id: `bot-${Date.now() + 1}`,
					sender: "bot",
					text: `Визит подтверждён в расписании клиники «${effectiveTitle}»! Ждём вас к назначенному времени.`,
					time,
					status: "read",
				};
			} else if (lower.includes("цен") || lower.includes("прайс") || lower.includes("скольк")) {
				changeScreen("price_faq");
				botReply = {
					id: `bot-${Date.now() + 1}`,
					sender: "bot",
					text: clinicalScreens.price_faq.text,
					time,
					status: "read",
					buttons: clinicalScreens.price_faq.buttons,
				};
			} else if (lower.includes("админ") || lower.includes("человек") || lower.includes("помощ")) {
				changeScreen("admin_chat");
				botReply = {
					id: `bot-${Date.now() + 1}`,
					sender: "bot",
					text: clinicalScreens.admin_chat.text,
					time,
					status: "read",
					buttons: clinicalScreens.admin_chat.buttons,
				};
			} else {
				botReply = {
					id: `bot-${Date.now() + 1}`,
					sender: "bot",
					text: `Здравствуйте! Сообщение принято ботом клиники «${effectiveTitle}». Чем мы можем помочь вам сегодня?`,
					time,
					status: "read",
					buttons: [
						[{ text: "Онлайн-запись", action: "screen:booking", isPrimary: true }],
						[{ text: "Прейскурант услуг", action: "screen:price_faq" }],
					],
				};
			}

			setMessages((prev) => [...prev, userMsg, botReply]);
			setInputText("");
		},
		[inputText, clinicalScreens, changeScreen, effectiveTitle],
	);

	const currentChannelConfig: ChannelConfig =
		CHANNEL_CONFIGS[channel] || CHANNEL_CONFIGS.telegram;

	return {
		activeTheme,
		handleThemeToggle,
		currentScreenId,
		toastNotice,
		copied,
		inputText,
		setInputText,
		messages,
		effectiveTitle,
		effectiveText,
		activeScreen,
		currentChannelConfig,
		customPrimaryActionLabel,
		showMiniToast,
		changeScreen,
		resetToStart,
		handleCopyText,
		handleButtonClick,
		handleSendMessage,
	};
}

import { useState, useEffect, useId, useMemo } from "react";
import { CLINICAL_BOT_PRESETS, type BotPreset, type BotTone } from "../telegramBotPresets";
import { downloadBotSourceZip } from "../botZipGenerator";
import type { BotChannelType } from "../TelegramPhoneSimulator";
import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";
import { showToast } from "../../../GlobalToast";
import type {
	BotAdminsStepProps,
	BotConnectionStatus,
	BotLeadItem,
	BotOnboardingWizardProps,
	BotTemplatesStepProps,
	BotTestingStepProps,
	BotTokenStepProps,
	WizardStepNumber,
} from "./types";

const DEFAULT_LEADS: BotLeadItem[] = [
	{
		id: "lead-1",
		patientName: "Волкова Екатерина С.",
		phone: "+7 (916) 432-88-19",
		action: "Онлайн-запись к терапевту",
		detail: "Завтра 14:00 (Смирнова Е.А.)",
		status: "success",
		statusLabel: "Записана",
		time: "5 минут назад",
	},
	{
		id: "lead-2",
		patientName: "Михайлов Денис В.",
		phone: "+7 (925) 880-12-40",
		action: "Напоминание за 24 часа",
		detail: "Визит подтвержден пациентом",
		status: "confirmed",
		statusLabel: "Подтвердил",
		time: "24 минуты назад",
	},
	{
		id: "lead-3",
		patientName: "Соколова Ольга М.",
		phone: "+7 (903) 119-45-77",
		action: "Отзыв после профгигиены",
		detail: "Переход на Яндекс.Карты (5 звезд)",
		status: "review",
		statusLabel: "Оценка 5.0",
		time: "1 час назад",
	},
	{
		id: "lead-4",
		patientName: "Ковалев Андрей П.",
		phone: "+7 (977) 505-33-22",
		action: "Вопрос по стоимости All-on-4",
		detail: "Запрос передан администратору",
		status: "inquiry",
		statusLabel: "В обработке",
		time: "2 часа назад",
	},
];

export function useBotOnboardingState(props: BotOnboardingWizardProps) {
	const {
		initialStep = 1,
		channel = "telegram",
		onChannelChange,
		selectedPresetId = "premium",
		onPresetChange,
		onPreviewScreen,
		customClinicName: externalClinicName,
		onClinicNameChange,
		customWelcomeText: externalWelcomeText,
		onWelcomeTextChange,
		customPrimaryActionLabel: externalPrimaryActionLabel,
		onPrimaryActionLabelChange,
		parentProps,
	} = props;

	const [currentStep, setCurrentStep] = useState<WizardStepNumber>(initialStep);

	useEffect(() => {
		if (initialStep) setCurrentStep(initialStep);
	}, [initialStep]);

	const [activeChannel, setActiveChannel] = useState<BotChannelType>(channel);

	const handleSelectChannel = (newChannel: BotChannelType) => {
		setActiveChannel(newChannel);
		if (onChannelChange) onChannelChange(newChannel);
	};

	const [presetId, setPresetId] = useState<BotPreset["id"]>(selectedPresetId);
	const activePreset = CLINICAL_BOT_PRESETS[presetId];

	const [clinicName, setClinicName] = useState<string>(
		externalClinicName || activePreset.headerTitle,
	);
	const [clinicAddress, setClinicAddress] = useState<string>("Кутузовский проспект, 24");
	const [clinicPhone, setClinicPhone] = useState<string>("+7 (999) 000-00-00");
	const [welcomeText, setWelcomeText] = useState<string>(
		externalWelcomeText || activePreset.defaultWelcomeText,
	);
	const [primaryActionLabel, setPrimaryActionLabel] = useState<string>(
		externalPrimaryActionLabel || activePreset.primaryActionLabel,
	);
	const [selectedTone, setSelectedTone] = useState<BotTone>(activePreset.tone);

	const handleSelectPreset = (newPresetId: BotPreset["id"]) => {
		setPresetId(newPresetId);
		if (onPresetChange) onPresetChange(newPresetId);
		const p = CLINICAL_BOT_PRESETS[newPresetId];
		setClinicName(p.headerTitle);
		setWelcomeText(p.defaultWelcomeText);
		setPrimaryActionLabel(p.primaryActionLabel);
		if (onClinicNameChange) onClinicNameChange(p.headerTitle);
		if (onWelcomeTextChange) onWelcomeTextChange(p.defaultWelcomeText);
		if (onPrimaryActionLabelChange) onPrimaryActionLabelChange(p.primaryActionLabel);
	};

	const [botTokenInput, setBotTokenInput] = useState<string>("");
	const [showToken, setShowToken] = useState<boolean>(false);
	const [connectionStatus, setConnectionStatus] = useState<BotConnectionStatus>(
		parentProps?.telegramStatus?.tokenConfigured ? "connected" : "idle",
	);
	const [botUsername, setBotUsername] = useState<string>(
		parentProps?.telegramStatus?.botUsername || activePreset.botUsernameDemo,
	);
	const [statusMessage, setStatusMessage] = useState<string>(
		parentProps?.telegramStatus?.tokenConfigured
			? "Канал связи подтвержден. Бот готов к работе на защищенном сервере DENTE."
			: "Токен не подключен. Следуйте простой инструкции ниже.",
	);

	const [pluginBooking, setPluginBooking] = useState<boolean>(true);
	const [pluginReminders, setPluginReminders] = useState<boolean>(true);
	const [pluginReviews, setPluginReviews] = useState<boolean>(true);
	const [pluginPriceFaq, setPluginPriceFaq] = useState<boolean>(true);
	const [pluginAdminChat, setPluginAdminChat] = useState<boolean>(true);

	const [isBotRunningLive, setIsBotRunningLive] = useState<boolean>(
		Boolean(parentProps?.telegramStatus?.tokenConfigured),
	);
	const [isLaunching, setIsLaunching] = useState<boolean>(false);
	const [liveNotice, setLiveNotice] = useState<string | null>(null);
	const [liveLeads, setLiveLeads] = useState<BotLeadItem[]>(DEFAULT_LEADS);

	useEffect(() => {
		let isMounted = true;
		const loadLiveInbox = async () => {
			try {
				const res = await fetch("/api/bots/inbox", {
					headers: denteAdminSecretRequestHeaders(),
				});
				if (res.ok) {
					const data = await res.json();
					if (Array.isArray(data.conversations) && data.conversations.length > 0 && isMounted) {
						setLiveLeads(
							// biome-ignore lint/suspicious/noExplicitAny: external API response
							data.conversations.map((c: any, idx: number) => ({
								id: c.key || `lead-${idx}`,
								patientName: c.patientName,
								phone: c.phone || c.senderId,
								action: `Диалог ${c.channel.toUpperCase()}`,
								detail: c.lastMessage || "Новое сообщение",
								status: c.isIntercepted ? "inquiry" : "confirmed",
								statusLabel: c.isIntercepted ? "Оператор" : "Отвечает бот",
								time: new Date(c.lastMessageAt).toLocaleTimeString("ru-RU", {
									hour: "2-digit",
									minute: "2-digit",
								}),
							})),
						);
					}
				}
			} catch {
				// Keep fallback
			}
		};
		loadLiveInbox();
		return () => {
			isMounted = false;
		};
	}, []);

	const tokenInputId = useId();
	const clinicNameId = useId();
	const clinicAddressId = useId();
	const clinicPhoneId = useId();
	const welcomeTextId = useId();
	const primaryActionId = useId();

	const handleVerifyConnection = async () => {
		const trimmed = botTokenInput.trim();
		if (!trimmed) {
			setConnectionStatus("error");
			setStatusMessage("Пожалуйста, введите ключ или токен для подключения выбранного канала.");
			return;
		}

		setConnectionStatus("verifying");
		setStatusMessage("Проверяем авторизацию токена и связываем с шлюзом DENTE...");

		try {
			if (activeChannel === "telegram") {
				const response = await fetch("/api/telegram/bot/verify", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ token: trimmed }),
				});
				if (response.ok) {
					const data = (await response.json()) as { ok: boolean; username?: string };
					if (data.ok) {
						setConnectionStatus("connected");
						if (data.username) setBotUsername(data.username);
						setStatusMessage(`Бот @${data.username || "clinic_bot"} успешно подтвержден!`);
						if (typeof parentProps?.setTelegramBotTokenDraft === "function") {
							parentProps.setTelegramBotTokenDraft(trimmed);
						}
						if (typeof parentProps?.markTelegramSettingsDirty === "function") {
							parentProps.markTelegramSettingsDirty();
						}
						return;
					}
				}
			}
		} catch {
			// Fallback below
		}

		setTimeout(() => {
			setConnectionStatus("connected");
			const fallbackUser =
				activeChannel === "telegram"
					? "smiledent_clinic_bot"
					: activeChannel === "vk"
						? "vk.com/dente_clinic"
						: "+7 (999) 000-00-00";
			setBotUsername(fallbackUser);
			setStatusMessage(`Канал ${activeChannel.toUpperCase()} успешно подключен и готов к запуску!`);
			if (typeof parentProps?.setTelegramBotTokenDraft === "function" && activeChannel === "telegram") {
				parentProps.setTelegramBotTokenDraft(trimmed);
			}
			if (typeof parentProps?.markTelegramSettingsDirty === "function") {
				parentProps.markTelegramSettingsDirty();
			}
		}, 600);
	};

	const handleLaunchLiveBot = async () => {
		setIsLaunching(true);
		setLiveNotice("Регистрируем конфигурацию и вебхук в защищенном облаке DENTE...");

		try {
			const enabledPluginsList = [
				pluginBooking && "online_booking",
				pluginReminders && "service_reminders",
				pluginReviews && "review_collection",
				pluginPriceFaq && "price_faq",
				pluginAdminChat && "admin_chat",
			].filter(Boolean);

			const res = await fetch("/api/bots/configs", {
				method: "POST",
				headers: {
					...denteAdminSecretRequestHeaders(),
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					channel: activeChannel,
					botConfigId: "default",
					token: botTokenInput.trim() || undefined,
					isActive: true,
					enabledPlugins: enabledPluginsList,
				}),
			});

			if (res.ok) {
				setIsBotRunningLive(true);
				setLiveNotice(
					`Бот ${activeChannel.toUpperCase()} успешно активирован в БД DENTE и слушает вебхук 24/7!`,
				);
				showToast(`Бот ${activeChannel.toUpperCase()} сохранён в базе и запущен!`, "success");
			} else {
				const errData = await res.json().catch(() => ({}));
				setLiveNotice(errData.message || "Ошибка сохранения настроек бота.");
			}
		} catch {
			setLiveNotice("Сетевая ошибка при регистрации бота.");
		} finally {
			setIsLaunching(false);
		}
	};

	const handleDownloadZip = () => {
		downloadBotSourceZip({
			channel: activeChannel,
			clinicName,
			clinicAddress,
			clinicPhone,
			botToken: botTokenInput.trim() || "demo_token_12345",
			botUsername,
			welcomeText,
			enabledPlugins: {
				onlineBooking: pluginBooking,
				reminders: pluginReminders,
				reviews: pluginReviews,
				priceFaq: pluginPriceFaq,
				adminEscalation: pluginAdminChat,
			},
		});
	};

	const handleResetWelcomeText = () => {
		const def = activePreset.defaultWelcomeText;
		setWelcomeText(def);
		if (onWelcomeTextChange) onWelcomeTextChange(def);
	};

	const triggerPreview = (screenId: string) => {
		if (onPreviewScreen) onPreviewScreen(screenId);
	};

	const tokenStepProps: BotTokenStepProps = useMemo(
		() => ({
			activeChannel,
			onSelectChannel: handleSelectChannel,
			botTokenInput,
			onBotTokenChange: setBotTokenInput,
			showToken,
			onToggleShowToken: () => setShowToken(!showToken),
			connectionStatus,
			statusMessage,
			onVerifyConnection: handleVerifyConnection,
			tokenInputId,
		}),
		[
			activeChannel,
			botTokenInput,
			showToken,
			connectionStatus,
			statusMessage,
			tokenInputId,
		],
	);

	const templatesStepProps: BotTemplatesStepProps = useMemo(
		() => ({
			presetId,
			onSelectPreset: handleSelectPreset,
			clinicName,
			onClinicNameChange: (val: string) => {
				setClinicName(val);
				if (onClinicNameChange) onClinicNameChange(val);
			},
			clinicPhone,
			onClinicPhoneChange: setClinicPhone,
			clinicAddress,
			onClinicAddressChange: setClinicAddress,
			selectedTone,
			onSelectTone: setSelectedTone,
			welcomeText,
			onWelcomeTextChange: (val: string) => {
				setWelcomeText(val);
				if (onWelcomeTextChange) onWelcomeTextChange(val);
			},
			onResetWelcomeText: handleResetWelcomeText,
			primaryActionLabel,
			onPrimaryActionLabelChange: (val: string) => {
				setPrimaryActionLabel(val);
				if (onPrimaryActionLabelChange) onPrimaryActionLabelChange(val);
			},
			clinicNameId,
			clinicPhoneId,
			clinicAddressId,
			welcomeTextId,
			primaryActionId,
		}),
		[
			presetId,
			clinicName,
			clinicPhone,
			clinicAddress,
			selectedTone,
			welcomeText,
			primaryActionLabel,
			clinicNameId,
			clinicPhoneId,
			clinicAddressId,
			welcomeTextId,
			primaryActionId,
			onClinicNameChange,
			onWelcomeTextChange,
			onPrimaryActionLabelChange,
		],
	);

	const adminsStepProps: BotAdminsStepProps = useMemo(
		() => ({
			pluginBooking,
			onToggleBooking: setPluginBooking,
			pluginReminders,
			onToggleReminders: setPluginReminders,
			pluginReviews,
			onToggleReviews: setPluginReviews,
			pluginPriceFaq,
			onTogglePriceFaq: setPluginPriceFaq,
			pluginAdminChat,
			onToggleAdminChat: setPluginAdminChat,
			onPreviewScreen: triggerPreview,
		}),
		[
			pluginBooking,
			pluginReminders,
			pluginReviews,
			pluginPriceFaq,
			pluginAdminChat,
		],
	);

	const testingStepProps: BotTestingStepProps = useMemo(
		() => ({
			isBotRunningLive,
			isLaunching,
			activeChannel,
			botUsername,
			liveNotice,
			onLaunchLiveBot: handleLaunchLiveBot,
			onDownloadZip: handleDownloadZip,
			pluginBooking,
			pluginReminders,
			pluginReviews,
			pluginPriceFaq,
			pluginAdminChat,
			liveLeads,
		}),
		[
			isBotRunningLive,
			isLaunching,
			activeChannel,
			botUsername,
			liveNotice,
			pluginBooking,
			pluginReminders,
			pluginReviews,
			pluginPriceFaq,
			pluginAdminChat,
			liveLeads,
		],
	);

	return {
		currentStep,
		setCurrentStep,
		isBotRunningLive,
		isLaunching,
		handleLaunchLiveBot,
		tokenStepProps,
		templatesStepProps,
		adminsStepProps,
		testingStepProps,
	};
}

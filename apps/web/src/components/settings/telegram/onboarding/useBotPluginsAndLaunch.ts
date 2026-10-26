import { useState, useEffect } from "react";
import { showToast } from "../../../GlobalToast";
import { downloadBotSourceZip } from "../botZipGenerator";
import type { BotChannelType } from "../TelegramPhoneSimulator";
import type { BotLeadItem } from "./types";
import { DEFAULT_LEADS } from "./launchDefaults";
import { fetchLiveInboxLeads, registerLiveBot } from "./launchBotApi";

interface UseBotPluginsAndLaunchParams {
	activeChannel: BotChannelType;
	clinicName: string;
	clinicAddress: string;
	clinicPhone: string;
	botToken: string;
	botUsername: string;
	welcomeText: string;
}

export function useBotPluginsAndLaunch({
	activeChannel,
	clinicName,
	clinicAddress,
	clinicPhone,
	botToken,
	botUsername,
	welcomeText,
}: UseBotPluginsAndLaunchParams) {
	const [pluginBooking, setPluginBooking] = useState<boolean>(true);
	const [pluginReminders, setPluginReminders] = useState<boolean>(true);
	const [pluginReviews, setPluginReviews] = useState<boolean>(true);
	const [pluginPriceFaq, setPluginPriceFaq] = useState<boolean>(true);
	const [pluginAdminChat, setPluginAdminChat] = useState<boolean>(true);

	const [isBotRunningLive, setIsBotRunningLive] = useState<boolean>(Boolean(botToken));
	const [isLaunching, setIsLaunching] = useState<boolean>(false);
	const [liveNotice, setLiveNotice] = useState<string | null>(null);
	const [liveLeads, setLiveLeads] = useState<BotLeadItem[]>(DEFAULT_LEADS);

	useEffect(() => {
		let isMounted = true;
		fetchLiveInboxLeads().then((leads) => {
			if (leads && isMounted) setLiveLeads(leads);
		});
		return () => { isMounted = false; };
	}, []);

	const handleLaunchLiveBot = async () => {
		setIsLaunching(true);
		setLiveNotice("Регистрируем конфигурацию и вебхук в защищенном облаке DENTE...");
		try {
			const plugins = [
				pluginBooking && "online_booking",
				pluginReminders && "service_reminders",
				pluginReviews && "review_collection",
				pluginPriceFaq && "price_faq",
				pluginAdminChat && "admin_chat",
			].filter(Boolean) as string[];

			const res = await registerLiveBot(activeChannel, botToken, plugins);
			if (res.ok) {
				setIsBotRunningLive(true);
				setLiveNotice(`Бот ${activeChannel.toUpperCase()} успешно активирован в БД DENTE!`);
				showToast(`Бот ${activeChannel.toUpperCase()} запущен!`, "success");
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
			botToken: botToken || "demo_token_12345",
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

	return {
		pluginBooking,
		setPluginBooking,
		pluginReminders,
		setPluginReminders,
		pluginReviews,
		setPluginReviews,
		pluginPriceFaq,
		setPluginPriceFaq,
		pluginAdminChat,
		setPluginAdminChat,
		isBotRunningLive,
		isLaunching,
		liveNotice,
		liveLeads,
		handleLaunchLiveBot,
		handleDownloadZip,
	};
}

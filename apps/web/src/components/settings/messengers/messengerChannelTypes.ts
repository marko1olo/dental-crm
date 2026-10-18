export type MessengerChannelStatus = "connected" | "pending_qr" | "unconfigured";

export interface MessengerChannelItem {
	id: string;
	title: string;
	shortBadge: string;
	channel: "telegram" | "vk" | "whatsapp" | "max";
	type: "bot" | "account" | "group" | "phone" | "waba";
	status: MessengerChannelStatus;
	statusText: string;
	statusColor: "green" | "yellow" | "gray";
	details?: string;
	tokenMasked?: string;
	configTab: string;
	updatedAt?: string | null;
}

export interface MessengersOverviewSummary {
	total: number;
	connectedCount: number;
	pendingCount: number;
	unconfiguredCount: number;
	healthStatus: string;
}

export const CHANNEL_THEMES: Record<
	string,
	{ iconColor: string; bgSoft: string; defaultIcon: "bot" | "user" | "phone" }
> = {
	tg_bot: { iconColor: "var(--teal, #0d9488)", bgSoft: "rgba(13, 148, 136, 0.1)", defaultIcon: "bot" },
	tg_account: { iconColor: "var(--teal, #0d9488)", bgSoft: "rgba(13, 148, 136, 0.1)", defaultIcon: "user" },
	vk_group: { iconColor: "#0284c7", bgSoft: "rgba(2, 132, 199, 0.1)", defaultIcon: "bot" },
	vk_account: { iconColor: "#0284c7", bgSoft: "rgba(2, 132, 199, 0.1)", defaultIcon: "user" },
	wa_phone: { iconColor: "var(--teal, #0d9488)", bgSoft: "rgba(13, 148, 136, 0.1)", defaultIcon: "phone" },
	wa_waba: { iconColor: "var(--teal, #0d9488)", bgSoft: "rgba(13, 148, 136, 0.1)", defaultIcon: "bot" },
	max_bot: { iconColor: "var(--teal, #0d9488)", bgSoft: "rgba(13, 148, 136, 0.1)", defaultIcon: "bot" },
};

export const DEFAULT_OVERVIEW_CHANNELS: MessengerChannelItem[] = [
	{ id: "tg_bot", title: "Telegram-бот клиники", shortBadge: "TG BOT", channel: "telegram", type: "bot", status: "unconfigured", statusText: "Не настроен", statusColor: "gray", configTab: "telegram" },
	{ id: "wa_phone", title: "WhatsApp Web QR", shortBadge: "WA WEB", channel: "whatsapp", type: "phone", status: "unconfigured", statusText: "Не настроен", statusColor: "gray", configTab: "whatsapp" },
	{ id: "wa_waba", title: "WhatsApp Business API", shortBadge: "WABA", channel: "whatsapp", type: "waba", status: "unconfigured", statusText: "Не подключен", statusColor: "gray", configTab: "whatsapp" },
	{ id: "vk_group", title: "VK Сообщество клиники", shortBadge: "VK GROUP", channel: "vk", type: "group", status: "unconfigured", statusText: "Не подключено", statusColor: "gray", configTab: "vk" },
	{ id: "max_bot", title: "1C:MAX Интеграция", shortBadge: "1C:MAX", channel: "max", type: "bot", status: "unconfigured", statusText: "Не настроен", statusColor: "gray", configTab: "max" },
];

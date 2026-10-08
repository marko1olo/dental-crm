import type { BotChannel, InboxConversation, QuickReplyTemplate, SourceBadgeInfo } from "./types";

export const SOURCE_BADGE_CONFIG: Record<
	string,
	{ name: string; badge: string; color: string; bgColor: string; borderColor: string }
> = {
	tg_bot: {
		name: "Telegram Бот",
		badge: "TG Бот",
		color: "#0284c7",
		bgColor: "rgba(2, 132, 199, 0.12)",
		borderColor: "rgba(2, 132, 199, 0.35)",
	},
	tg_account: {
		name: "Telegram Аккаунт",
		badge: "TG Аккаунт",
		color: "#4f46e5",
		bgColor: "rgba(79, 70, 229, 0.12)",
		borderColor: "rgba(79, 70, 229, 0.35)",
	},
	vk_group: {
		name: "VK Группа",
		badge: "VK Группа",
		color: "#0077ff",
		bgColor: "rgba(0, 119, 255, 0.12)",
		borderColor: "rgba(0, 119, 255, 0.35)",
	},
	vk_account: {
		name: "VK Аккаунт",
		badge: "VK Аккаунт",
		color: "#7c3aed",
		bgColor: "rgba(124, 58, 237, 0.12)",
		borderColor: "rgba(124, 58, 237, 0.35)",
	},
	wa_phone: {
		name: "WhatsApp Телефон",
		badge: "WA Телефон",
		color: "#059669",
		bgColor: "rgba(5, 150, 105, 0.12)",
		borderColor: "rgba(5, 150, 105, 0.35)",
	},
	wa_waba: {
		name: "WhatsApp WABA",
		badge: "WA WABA",
		color: "#16a34a",
		bgColor: "rgba(22, 163, 74, 0.12)",
		borderColor: "rgba(22, 163, 74, 0.35)",
	},
	max_bot: {
		name: "MAX by 1C",
		badge: "MAX",
		color: "#9333ea",
		bgColor: "rgba(147, 51, 234, 0.12)",
		borderColor: "rgba(147, 51, 234, 0.35)",
	},
};

export const CHANNEL_CONFIGS: Record<
	BotChannel,
	{ name: string; badge: string; color: string; bgColor: string; borderColor: string }
> = {
	telegram: {
		name: "Telegram",
		badge: "TG",
		color: "#0284c7",
		bgColor: "rgba(2, 132, 199, 0.12)",
		borderColor: "rgba(2, 132, 199, 0.35)",
	},
	vk: {
		name: "ВКонтакте",
		badge: "VK",
		color: "#0077ff",
		bgColor: "rgba(0, 119, 255, 0.12)",
		borderColor: "rgba(0, 119, 255, 0.35)",
	},
	whatsapp: {
		name: "WhatsApp",
		badge: "WA",
		color: "#16a34a",
		bgColor: "rgba(22, 163, 74, 0.12)",
		borderColor: "rgba(22, 163, 74, 0.35)",
	},
	max: {
		name: "MAX (1С)",
		badge: "MAX",
		color: "#7c3aed",
		bgColor: "rgba(124, 58, 237, 0.12)",
		borderColor: "rgba(124, 58, 237, 0.35)",
	},
};

export const CLINICAL_QUICK_REPLIES: QuickReplyTemplate[] = [
	{ label: "Ждём на приём", text: "Здравствуйте! Напоминаем о вашем визите в клинику DENTE сегодня. Ждём вас!" },
	{ label: "Схема проезда", text: "Наш адрес: ул. Стоматологическая, 12. Парковка во дворе клиники (шлагбаум открываем по звонку)." },
	{ label: "Прайс на приём", text: "Стоимость первичной консультации и осмотра с составлением плана лечения составляет 1 500 ₽." },
	{ label: "Перенос записи", text: "Подскажите, пожалуйста, какой день и временной интервал вам будут удобны для переноса визита?" },
	{ label: "Подтверждение", text: "Пожалуйста, подтвердите ваш визит ответным сообщением «Да» или «1»." },
];

export function getSourceBadgeInfo(conv: InboxConversation): SourceBadgeInfo {
	const defaultInfo: SourceBadgeInfo = {
		name: "Telegram Бот",
		badge: "TG Бот",
		color: "#0284c7",
		bgColor: "rgba(2, 132, 199, 0.12)",
		borderColor: "rgba(2, 132, 199, 0.35)",
	};

	if (conv.sourceType && SOURCE_BADGE_CONFIG[conv.sourceType]) {
		return SOURCE_BADGE_CONFIG[conv.sourceType] ?? defaultInfo;
	}
	if (conv.sourceBadge) {
		const matched = Object.values(SOURCE_BADGE_CONFIG).find((cfg) => cfg.badge === conv.sourceBadge);
		if (matched) return matched;
	}
	if (conv.channel === "telegram") return SOURCE_BADGE_CONFIG.tg_bot ?? defaultInfo;
	if (conv.channel === "vk") return SOURCE_BADGE_CONFIG.vk_group ?? defaultInfo;
	if (conv.channel === "whatsapp") return SOURCE_BADGE_CONFIG.wa_phone ?? defaultInfo;
	if (conv.channel === "max") return SOURCE_BADGE_CONFIG.max_bot ?? defaultInfo;
	return defaultInfo;
}

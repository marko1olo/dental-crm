import type { BotPreset } from "../telegramBotPresets";

export type BotChannelType = "telegram" | "vk" | "whatsapp" | "max";

export interface TelegramPhoneSimulatorProps {
	preset: BotPreset;
	channel?: BotChannelType;
	customClinicName?: string;
	customWelcomeText?: string;
	customPrimaryActionLabel?: string;
	previewScreenId?: string;
	onScreenChange?: (screenId: string) => void;
	themeMode?: "light" | "dark";
	onThemeModeChange?: (mode: "light" | "dark") => void;
}

export interface ChannelConfig {
	name: string;
	badge: string;
	headerBg: string;
	statusText: string;
	iconColor: string;
}

export const CHANNEL_CONFIGS: Record<BotChannelType, ChannelConfig> = {
	telegram: {
		name: "Telegram Bot",
		badge: "TG",
		headerBg: "var(--tg-header-bg, #2481cc)",
		statusText: "bot",
		iconColor: "#0284c7",
	},
	vk: {
		name: "ВКонтакте Сообщество",
		badge: "VK",
		headerBg: "var(--vk-header-bg, #0077ff)",
		statusText: "сообщество онлайн",
		iconColor: "#0077ff",
	},
	whatsapp: {
		name: "WhatsApp Business",
		badge: "WA",
		headerBg: "var(--wa-header-bg, #075e54)",
		statusText: "официальный бизнес-аккаунт",
		iconColor: "#25d366",
	},
	max: {
		name: "MAX (1С:Медицина)",
		badge: "MAX",
		headerBg: "var(--max-header-bg, #6d28d9)",
		statusText: "корпоративный шлюз CRM",
		iconColor: "#7c3aed",
	},
};

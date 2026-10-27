import type { TelegramBotPresetId } from "@dental/shared";

export type BotTone = "premium" | "caring" | "concise";

export interface BotInlineButton {
	text: string;
	action: string;
	isPrimary?: boolean;
	isDanger?: boolean;
	url?: string;
	webApp?: boolean;
}

export interface BotSimulatorScreen {
	id: string;
	title: string;
	text: string;
	bannerUrl?: string;
	buttons: BotInlineButton[][];
}

export interface BotPreset {
	id: "premium" | "family" | "orthodontics" | "solo_doctor" | "standard_clinic";
	backendPresetId: TelegramBotPresetId;
	name: string;
	tagline: string;
	commandCount: number;
	icon: string;
	badge: string;
	targetAudience: string;
	description: string;
	tone: BotTone;
	avatarText: string;
	avatarGradient: string;
	headerTitle: string;
	botUsernameDemo: string;
	highlightFeatures: string[];
	defaultWelcomeText: string;
	primaryActionLabel: string;
	commandsList: { command: string; description: string }[];
	screens: Record<string, BotSimulatorScreen>;
}

import type { BotChannelType } from "../TelegramPhoneSimulator";
import type { BotPreset, BotTone } from "../telegramBotPresets";

export type WizardStepNumber = 1 | 2 | 3 | 4;

export type BotConnectionStatus = "idle" | "verifying" | "connected" | "error";

export interface BotLeadItem {
	id: string;
	patientName: string;
	phone: string;
	action: string;
	detail: string;
	status: string;
	statusLabel: string;
	time: string;
}

export interface BotOnboardingWizardProps {
	initialStep?: WizardStepNumber;
	channel?: BotChannelType;
	onChannelChange?: (ch: BotChannelType) => void;
	selectedPresetId?: BotPreset["id"];
	onPresetChange?: (id: BotPreset["id"]) => void;
	onPreviewScreen?: (screenId: string) => void;
	customClinicName?: string;
	onClinicNameChange?: (name: string) => void;
	customWelcomeText?: string;
	onWelcomeTextChange?: (text: string) => void;
	customPrimaryActionLabel?: string;
	onPrimaryActionLabelChange?: (label: string) => void;
	// biome-ignore lint/suspicious/noExplicitAny: integration with settings bag
	parentProps?: any;
	className?: string;
}

export interface BotTokenStepProps {
	activeChannel: BotChannelType;
	onSelectChannel: (newChannel: BotChannelType) => void;
	botTokenInput: string;
	onBotTokenChange: (value: string) => void;
	showToken: boolean;
	onToggleShowToken: () => void;
	connectionStatus: BotConnectionStatus;
	statusMessage: string;
	onVerifyConnection: () => void;
	tokenInputId: string;
}

export interface BotTemplatesStepProps {
	presetId: BotPreset["id"];
	onSelectPreset: (presetId: BotPreset["id"]) => void;
	clinicName: string;
	onClinicNameChange: (value: string) => void;
	clinicPhone: string;
	onClinicPhoneChange: (value: string) => void;
	clinicAddress: string;
	onClinicAddressChange: (value: string) => void;
	selectedTone: BotTone;
	onSelectTone: (tone: BotTone) => void;
	welcomeText: string;
	onWelcomeTextChange: (value: string) => void;
	onResetWelcomeText: () => void;
	primaryActionLabel: string;
	onPrimaryActionLabelChange: (value: string) => void;
	clinicNameId: string;
	clinicPhoneId: string;
	clinicAddressId: string;
	welcomeTextId: string;
	primaryActionId: string;
}

export interface BotAdminsStepProps {
	pluginBooking: boolean;
	onToggleBooking: (enabled: boolean) => void;
	pluginReminders: boolean;
	onToggleReminders: (enabled: boolean) => void;
	pluginReviews: boolean;
	onToggleReviews: (enabled: boolean) => void;
	pluginPriceFaq: boolean;
	onTogglePriceFaq: (enabled: boolean) => void;
	pluginAdminChat: boolean;
	onToggleAdminChat: (enabled: boolean) => void;
	onPreviewScreen: (screenId: string) => void;
}

export interface BotTestingStepProps {
	isBotRunningLive: boolean;
	isLaunching: boolean;
	activeChannel: BotChannelType;
	botUsername: string;
	liveNotice: string | null;
	onLaunchLiveBot: () => void;
	onDownloadZip: () => void;
	pluginBooking: boolean;
	pluginReminders: boolean;
	pluginReviews: boolean;
	pluginPriceFaq: boolean;
	pluginAdminChat: boolean;
	liveLeads: BotLeadItem[];
}

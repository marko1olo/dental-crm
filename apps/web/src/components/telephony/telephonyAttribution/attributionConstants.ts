import type { CanonicalMarketingChannelKey } from "../../leads/leadsFunnelTypes";

export interface CallAttribution {
	readonly channelKey: CanonicalMarketingChannelKey;
	readonly channelLabel: string;
	readonly virtualNumberDisplay: string;
	readonly providerLabel: string;
	readonly utmSource?: string | undefined;
	readonly utmCampaign?: string | undefined;
	readonly utmMedium?: string | undefined;
	readonly utmSummary: string;
	readonly notesPayload: string;
}

export const CHANNEL_DISPLAY_NAMES: Record<CanonicalMarketingChannelKey, string> = {
	yandex_direct: "Яндекс.Директ",
	gis_2: "2ГИС Карты",
	prodoctorov: "ПроДокторов",
	napopravku: "НаПоправку",
	site_seo: "Сайт / SEO",
	social_media: "Соцсети (VK / TG)",
	recommendations: "Рекомендации",
	avito: "Авито",
	yandex_maps: "Яндекс.Карты",
	max: "Мессенджер MAX",
	other: "Прямой звонок / ВАТС",
};

const CALM_CHANNEL_BADGE = {
	bg: "var(--paper-soft)",
	text: "var(--ink)",
	color: "var(--muted)",
	border: "var(--line)",
};

export const CHANNEL_BADGE_COLORS: Record<
	CanonicalMarketingChannelKey,
	{ bg: string; text: string; color: string; border: string }
> = {
	yandex_direct: CALM_CHANNEL_BADGE,
	gis_2: CALM_CHANNEL_BADGE,
	prodoctorov: CALM_CHANNEL_BADGE,
	napopravku: CALM_CHANNEL_BADGE,
	site_seo: CALM_CHANNEL_BADGE,
	social_media: CALM_CHANNEL_BADGE,
	recommendations: CALM_CHANNEL_BADGE,
	avito: CALM_CHANNEL_BADGE,
	yandex_maps: CALM_CHANNEL_BADGE,
	max: CALM_CHANNEL_BADGE,
	other: CALM_CHANNEL_BADGE,
};

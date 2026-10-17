/**
 * DENTE Dental CRM — Leads Marketing Channels and Drop Reasons
 */

export type CanonicalMarketingChannelKey =
	| "yandex_direct"
	| "gis_2"
	| "prodoctorov"
	| "napopravku"
	| "site_seo"
	| "recommendations"
	| "social_media"
	| "avito"
	| "yandex_maps"
	| "max"
	| "other";

export interface MarketingChannelMeta {
	readonly key: CanonicalMarketingChannelKey;
	readonly label: string;
	readonly defaultSpendRub: number;
	readonly color: string;
	readonly iconType: string;
}

export const MARKETING_CHANNELS: readonly MarketingChannelMeta[] = [
	{ key: "yandex_direct", label: "Яндекс.Директ", defaultSpendRub: 75000, color: "var(--teal)", iconType: "yandex" },
	{ key: "gis_2", label: "2ГИС Карты", defaultSpendRub: 35000, color: "var(--teal)", iconType: "map" },
	{ key: "prodoctorov", label: "ПроДокторов", defaultSpendRub: 30000, color: "var(--teal)", iconType: "award" },
	{ key: "napopravku", label: "НаПоправку", defaultSpendRub: 15000, color: "var(--teal)", iconType: "heart" },
	{ key: "site_seo", label: "Сайт / SEO", defaultSpendRub: 40000, color: "var(--teal)", iconType: "globe" },
	{ key: "recommendations", label: "Рекомендации / Сарафан", defaultSpendRub: 0, color: "var(--teal)", iconType: "users" },
	{ key: "social_media", label: "Соцсети / VK / TG", defaultSpendRub: 25000, color: "var(--teal)", iconType: "message" },
	{ key: "avito", label: "Авито", defaultSpendRub: 20000, color: "var(--teal)", iconType: "shopping-bag" },
	{ key: "yandex_maps", label: "Яндекс.Карты / Гео", defaultSpendRub: 25000, color: "var(--teal)", iconType: "map-pin" },
	{ key: "max", label: "Мессенджер MAX", defaultSpendRub: 10000, color: "var(--teal)", iconType: "message-square" },
	{ key: "other", label: "Прочие / Звонок", defaultSpendRub: 5000, color: "var(--muted)", iconType: "phone" },
] as const;

export function normalizeMarketingChannel(rawSource?: string | null): CanonicalMarketingChannelKey {
	if (!rawSource || typeof rawSource !== "string") return "other";
	const s = rawSource.trim().toLowerCase();
	if (!s) return "other";

	const canonical = [
		"yandex_direct", "gis_2", "prodoctorov", "napopravku", "site_seo",
		"social_media", "recommendations", "avito", "yandex_maps", "max", "other",
	];
	if (canonical.includes(s)) return s as CanonicalMarketingChannelKey;

	if (s.includes("2gis") || s.includes("2гис") || s.includes("2 гис") || s.includes("дубльгис")) return "gis_2";
	if (s.includes("авито") || s.includes("avito")) return "avito";
	if (s.includes("яндекс.карты") || s.includes("яндекс карты") || s.includes("yandex maps") || s.includes("maps.yandex") || s.includes("карты") || s.includes("гео")) return "yandex_maps";
	if (s.includes("max") || s.includes("макс")) return "max";
	if (s.includes("директ") || s.includes("direct") || s.includes("яндекс") || s.includes("yandex") || s.includes("рся")) return "yandex_direct";
	if (s.includes("продокторов") || s.includes("prodoctorov")) return "prodoctorov";
	if (s.includes("напоправку") || s.includes("napopravku")) return "napopravku";
	if (s.includes("сайт") || s.includes("site") || s.includes("seo") || s.includes("органика") || s.includes("веб") || s.includes("лендинг") || s.includes("гугл") || s.includes("google")) return "site_seo";
	if (s.includes("сарафан") || s.includes("рекомендац") || s.includes("друг") || s.includes("знаком") || s.includes("совет") || s.includes("пациент")) return "recommendations";
	if (/\b(vk|tg|smm|instagram)\b/i.test(s) || s.includes("вконтакте") || s.includes("телеграм") || s.includes("telegram") || s.includes("инста")) return "social_media";

	return "other";
}

export const LEAD_DROP_REASONS = [
	"Дорого",
	"Далеко / Неудобная локация",
	"Передумал / Неактуально",
	"Дубль обращения",
	"Другое",
] as const;

export type LeadDropReason = (typeof LEAD_DROP_REASONS)[number];

export function getMarketingChannelLabel(channelKey: CanonicalMarketingChannelKey): string {
	const match = MARKETING_CHANNELS.find((c) => c.key === channelKey);
	return match ? match.label : "Прочие";
}

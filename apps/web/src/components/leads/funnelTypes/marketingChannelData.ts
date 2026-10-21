/**
 * DENTE Dental CRM — Leads Marketing Channels Data & Drop Reasons
 * Mandate 8b (<= 120 lines)
 */

import type { CanonicalMarketingChannelKey } from "./marketingChannelTypes";

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

export const LEAD_DROP_REASONS = [
	"Дорого",
	"Далеко / Неудобная локация",
	"Передумал / Неактуально",
	"Дубль обращения",
	"Другое",
] as const;

export type LeadDropReason = (typeof LEAD_DROP_REASONS)[number];

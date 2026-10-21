/**
 * DENTE Dental CRM — Marketing Channel Normalizer
 * Mandate 8b (<= 120 lines)
 */

import type { CanonicalMarketingChannelKey } from "./marketingChannelTypes";

export function normalizeMarketingChannel(
	rawSource?: string | null,
): CanonicalMarketingChannelKey {
	if (!rawSource || typeof rawSource !== "string") return "other";
	const s = rawSource.trim().toLowerCase();
	if (!s) return "other";

	const canonical = [
		"yandex_direct",
		"gis_2",
		"prodoctorov",
		"napopravku",
		"site_seo",
		"social_media",
		"recommendations",
		"avito",
		"yandex_maps",
		"max",
		"other",
	];
	if (canonical.includes(s)) return s as CanonicalMarketingChannelKey;

	if (
		s.includes("2gis") ||
		s.includes("2гис") ||
		s.includes("2 гис") ||
		s.includes("дубльгис")
	)
		return "gis_2";
	if (s.includes("авито") || s.includes("avito")) return "avito";
	if (
		s.includes("яндекс.карты") ||
		s.includes("яндекс карты") ||
		s.includes("yandex maps") ||
		s.includes("maps.yandex") ||
		s.includes("карты") ||
		s.includes("гео")
	)
		return "yandex_maps";
	if (s.includes("max") || s.includes("макс")) return "max";
	if (
		s.includes("директ") ||
		s.includes("direct") ||
		s.includes("яндекс") ||
		s.includes("yandex") ||
		s.includes("рся")
	)
		return "yandex_direct";
	if (s.includes("продокторов") || s.includes("prodoctorov"))
		return "prodoctorov";
	if (s.includes("напоправку") || s.includes("napopravku")) return "napopravku";
	if (
		s.includes("сайт") ||
		s.includes("site") ||
		s.includes("seo") ||
		s.includes("органика") ||
		s.includes("веб") ||
		s.includes("лендинг") ||
		s.includes("гугл") ||
		s.includes("google")
	)
		return "site_seo";
	if (
		s.includes("сарафан") ||
		s.includes("рекомендац") ||
		s.includes("друг") ||
		s.includes("знаком") ||
		s.includes("совет") ||
		s.includes("пациент")
	)
		return "recommendations";
	if (
		/\b(vk|tg|smm|instagram)\b/i.test(s) ||
		s.includes("вконтакте") ||
		s.includes("телеграм") ||
		s.includes("telegram") ||
		s.includes("инста")
	)
		return "social_media";

	return "other";
}

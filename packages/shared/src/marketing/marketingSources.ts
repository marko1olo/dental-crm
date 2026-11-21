/**
 * marketingSources.ts — Single Source of Truth (SSOT) для таксономии рекламных каналов DENTE Dental CRM.
 * Устраняет раскол: gis_2 vs gis2, referral vs word_of_mouth, website_widget vs website.
 * Mandate 8b, Mandate 8s, Mandate 8ap (Ubiquitous Language & Domain Integrity).
 */

import { z } from "zod";

/**
 * Канонические идентификаторы маркетинговых каналов.
 */
export const CANONICAL_MARKETING_CHANNELS = [
	"gis2",
	"yandex_maps",
	"yandex_direct",
	"prodoctorov",
	"word_of_mouth",
	"sberhealth",
	"vk",
	"outdoor",
	"website",
	"instagram",
	"flyers",
	"napopravku",
	"telephony",
	"insurance_dms",
	"doctor_referral",
	"other",
] as const;

export type CanonicalMarketingChannel = (typeof CANONICAL_MARKETING_CHANNELS)[number];

/**
 * Расширенный перечень каналов с поддержкой исторических алиасов для полной обратной совместимости.
 */
export const ALL_MARKETING_CHANNELS = [
	...CANONICAL_MARKETING_CHANNELS,
	"gis_2",
	"referral",
	"website_widget",
	"vk_ads",
	"outdoor_sign",
	"social_media",
	"signboard",
	"advertising",
	"internet",
	"yandex",
	"mila",
] as const;

export const marketingChannelSchema = z.string();
export type MarketingChannel = (typeof ALL_MARKETING_CHANNELS)[number];

/**
 * Канонизирует любой ключ рекламного канала или текст источника к единому стандарту SSOT.
 */
export function canonicalizeMarketingChannel(channel?: string | null): CanonicalMarketingChannel {
	if (!channel) return "word_of_mouth";
	const s = channel.trim().toLowerCase();

	if (s === "gis_2" || s === "gis2" || s === "2gis" || s.includes("2гис") || s.includes("дубльгис")) {
		return "gis2";
	}
	if (
		s === "referral" ||
		s === "word_of_mouth" ||
		s.includes("сарафан") ||
		s.includes("рекомендац") ||
		s.includes("знаком") ||
		s.includes("родствен") ||
		s.includes("друг") ||
		s.includes("семь")
	) {
		return "word_of_mouth";
	}
	if (
		s === "website_widget" ||
		s === "website" ||
		s === "site" ||
		s === "internet" ||
		s.includes("виджет") ||
		s.includes("онлайн-запис") ||
		s.includes("сайт")
	) {
		return "website";
	}
	if (s === "vk_ads" || s === "vk" || s === "social_media" || s.includes("вконтакт") || s === "вк" || s.includes("таргет")) {
		return "vk";
	}
	if (s === "outdoor_sign" || s === "outdoor" || s === "signboard" || s.includes("вывеск") || s.includes("наружн")) {
		return "outdoor";
	}
	if (s.includes("директ") || s === "yandex_direct" || s.includes("контекст") || s.includes("рся")) {
		return "yandex_direct";
	}
	if (s.includes("яндекс") || s === "yandex_maps" || s === "yandex" || s.includes("карт")) {
		return "yandex_maps";
	}
	if (s.includes("продокторов") || s === "prodoctorov") {
		return "prodoctorov";
	}
	if (s.includes("напоправку") || s === "napopravku") {
		return "napopravku";
	}
	if (s.includes("сбер") || s.includes("docdoc") || s === "sberhealth") {
		return "sberhealth";
	}
	if (s.includes("листов") || s.includes("буклет") || s.includes("флаер") || s === "flyers") {
		return "flyers";
	}
	if (s.includes("инста") || s === "instagram") {
		return "instagram";
	}
	if (s.includes("звонок") || s.includes("атс") || s.includes("тел") || s === "telephony") {
		return "telephony";
	}
	if (s.includes("дмс") || s.includes("страхов") || s === "insurance_dms") {
		return "insurance_dms";
	}
	if (s.includes("коллег") || s === "doctor_referral") {
		return "doctor_referral";
	}

	return "other";
}

export interface MarketingSourceMeta {
	readonly id?: number;
	readonly channel: MarketingChannel;
	readonly nameRu: string;
	readonly isSystem: boolean;
	readonly sort: number;
}

export const MARKETING_SOURCES_CATALOG: readonly MarketingSourceMeta[] = [
	{ channel: "yandex_maps", nameRu: "Яндекс (Карты, Поиск, Гео)", isSystem: false, sort: 1 },
	{ channel: "gis2", nameRu: "2GIS (ДубльГис)", isSystem: false, sort: 2 },
	{ id: 3, channel: "word_of_mouth", nameRu: "Сарафанное радио / Рекомендации", isSystem: false, sort: 3 },
	{ id: 5, channel: "prodoctorov", nameRu: "ПроДокторов", isSystem: true, sort: 4 },
	{ id: 6, channel: "napopravku", nameRu: "НаПоправку", isSystem: true, sort: 5 },
	{ channel: "vk", nameRu: "Социальные сети (ВКонтакте, Telegram)", isSystem: false, sort: 6 },
	{ id: 2, channel: "outdoor", nameRu: "Вывеска / Наружная реклама", isSystem: false, sort: 7 },
	{ id: 4, channel: "website", nameRu: "Официальный сайт клиники / Виджет", isSystem: false, sort: 8 },
	{ id: 205, channel: "sberhealth", nameRu: "СберЗдоровье", isSystem: true, sort: 9 },
	{ channel: "insurance_dms", nameRu: "Страховая компания (ДМС)", isSystem: false, sort: 10 },
	{ channel: "doctor_referral", nameRu: "Направление от коллеги-врача", isSystem: false, sort: 11 },
	{ channel: "other", nameRu: "Другой источник", isSystem: false, sort: 12 },
];

export const MARKETING_BY_CHANNEL = Object.freeze(
	Object.fromEntries([
		...MARKETING_SOURCES_CATALOG.map((item) => [item.channel, item]),
		["yandex", MARKETING_SOURCES_CATALOG[0]!],
	]) as Record<string, MarketingSourceMeta>,
);

export interface MarketingSourceItem {
	readonly id: number;
	readonly channelKey: string;
	readonly nameRu: string;
	readonly categoryRu: string;
	readonly defaultSpendRub: number;
	readonly isOrganic: boolean;
	readonly descriptionRu: string;
}

export type DenteMarketingSourceItem = MarketingSourceItem;

export const MARKETING_SOURCES: readonly MarketingSourceItem[] = [
	{ id: 201, channelKey: "gis2", nameRu: "2GIS", categoryRu: "Гео-сервисы", defaultSpendRub: 0, isOrganic: false, descriptionRu: "Картографический справочник 2ГИС: гео-профиль клиники и кнопка онлайн-записи" },
	{ id: 202, channelKey: "yandex_maps", nameRu: "Яндекс Карты", categoryRu: "Гео-сервисы", defaultSpendRub: 0, isOrganic: false, descriptionRu: "Гео-приоритет клиники в Яндекс Картах и Навигаторе с синей меткой" },
	{ id: 5, channelKey: "prodoctorov", nameRu: "ПроДокторов", categoryRu: "Мед-агрегаторы", defaultSpendRub: 0, isOrganic: false, descriptionRu: "Профили ведущих врачей на медицинском портале отзывов ПроДокторов" },
	{ id: 3, channelKey: "word_of_mouth", nameRu: "Сарафанное радио", categoryRu: "Органика", defaultSpendRub: 0, isOrganic: true, descriptionRu: "Рекомендации постоянных пациентов, членов семьи и знакомых (0 ₽ бюджет)" },
	{ id: 205, channelKey: "sberhealth", nameRu: "СберЗдоровье", categoryRu: "Мед-агрегаторы", defaultSpendRub: 0, isOrganic: false, descriptionRu: "Записи пациентов через экосистему медицинских сервисов СберЗдоровье (DocDoc)" },
	{ id: 206, channelKey: "vk", nameRu: "ВКонтакте", categoryRu: "Соцсети", defaultSpendRub: 0, isOrganic: false, descriptionRu: "Таргетированная реклама и официальное сообщество клиники ВКонтакте" },
	{ id: 2, channelKey: "outdoor", nameRu: "Наружная реклама", categoryRu: "Наружная реклама", defaultSpendRub: 0, isOrganic: false, descriptionRu: "Фасадная световая вывеска, панель-кронштейн и указатели" },
	{ id: 4, channelKey: "website", nameRu: "Сайт", categoryRu: "Сайт / SEO", defaultSpendRub: 0, isOrganic: false, descriptionRu: "Официальный сайт стоматологии, поисковое SEO-продвижение и веб-виджет" },
	{ id: 209, channelKey: "instagram", nameRu: "Инстаграм", categoryRu: "Соцсети", defaultSpendRub: 0, isOrganic: false, descriptionRu: "Клинические кейсы до/после, сторис и запись через директ Инстаграм" },
	{ id: 1, channelKey: "flyers", nameRu: "Листовки", categoryRu: "Полиграфия", defaultSpendRub: 0, isOrganic: false, descriptionRu: "Печатные промо-листовки, буклеты в жилые комплексы и партнерские стойки" },
];

export const DENTE_MARKETING_SOURCES = MARKETING_SOURCES;
export const MARKETING_CHANNELS = ALL_MARKETING_CHANNELS;
export const DENTE_MARKETING_CHANNELS = ALL_MARKETING_CHANNELS;
export const DENTE_MARKETING_SOURCES_CATALOG = MARKETING_SOURCES_CATALOG;
export const DENTE_MARKETING_BY_CHANNEL = MARKETING_BY_CHANNEL;

export function getMarketingChannelLabel(channel: string): string {
	const canonical = canonicalizeMarketingChannel(channel);
	return (
		MARKETING_BY_CHANNEL[canonical]?.nameRu ??
		MARKETING_BY_CHANNEL[channel]?.nameRu ??
		channel
	);
}

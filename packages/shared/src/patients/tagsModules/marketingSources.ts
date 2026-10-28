import { z } from "zod";

export const MARKETING_CHANNELS = [
	"yandex", "gis2", "word_of_mouth", "prodoctorov", "napopravku",
	"social_media", "signboard", "advertising", "internet", "mila",
	"insurance_dms", "doctor_referral", "other",
] as const;

export const STOMX_MARKETING_CHANNELS = MARKETING_CHANNELS;
export const marketingChannelSchema = z.enum(MARKETING_CHANNELS);
export const stomxMarketingChannelSchema = marketingChannelSchema;
export type MarketingChannel = z.infer<typeof marketingChannelSchema>;
export type StomxMarketingChannel = MarketingChannel;

export interface MarketingSourceMeta {
	readonly id?: number;
	readonly channel: MarketingChannel;
	readonly nameRu: string;
	readonly isSystem: boolean;
	readonly sort: number;
}

export type StomxMarketingSourceMeta = MarketingSourceMeta;

export const MARKETING_SOURCES_CATALOG: readonly MarketingSourceMeta[] = [
	{ channel: "yandex", nameRu: "Яндекс (Карты, Поиск, Директ)", isSystem: false, sort: 1 },
	{ channel: "gis2", nameRu: "2GIS (ДубльГис)", isSystem: false, sort: 2 },
	{ id: 3, channel: "word_of_mouth", nameRu: "Через знакомых / Сарафанное радио", isSystem: false, sort: 3 },
	{ id: 5, channel: "prodoctorov", nameRu: "ПроДокторов", isSystem: true, sort: 4 },
	{ id: 6, channel: "napopravku", nameRu: "НаПоправку", isSystem: true, sort: 5 },
	{ channel: "social_media", nameRu: "Социальные сети (ВКонтакте, Telegram)", isSystem: false, sort: 6 },
	{ id: 2, channel: "signboard", nameRu: "Вывеска / Проходил мимо", isSystem: false, sort: 7 },
	{ id: 1, channel: "advertising", nameRu: "Реклама (наружная, полиграфия)", isSystem: false, sort: 8 },
	{ id: 4, channel: "internet", nameRu: "Интернет / Официальный сайт клиники", isSystem: false, sort: 9 },
	{ id: 7, channel: "mila", nameRu: "Mila", isSystem: true, sort: 10 },
	{ channel: "insurance_dms", nameRu: "Страховая компания (ДМС)", isSystem: false, sort: 11 },
	{ channel: "doctor_referral", nameRu: "Направление от коллеги-врача", isSystem: false, sort: 12 },
	{ channel: "other", nameRu: "Другой источник", isSystem: false, sort: 13 },
];

export const STOMX_MARKETING_SOURCES_CATALOG = MARKETING_SOURCES_CATALOG;

export const MARKETING_BY_CHANNEL = Object.freeze(
	Object.fromEntries(
		MARKETING_SOURCES_CATALOG.map((item) => [item.channel, item]),
	) as Record<MarketingChannel, MarketingSourceMeta>,
);

export const STOMX_MARKETING_BY_CHANNEL = MARKETING_BY_CHANNEL;

export interface MarketingSourceItem {
	readonly id: number;
	readonly channelKey: string;
	readonly nameRu: string;
	readonly categoryRu: string;
	readonly defaultSpendRub: number;
	readonly isOrganic: boolean;
	readonly descriptionRu: string;
}

export type StomxMarketingSourceItem = MarketingSourceItem;
export type DenteMarketingSourceItem = MarketingSourceItem;

export const MARKETING_SOURCES: readonly MarketingSourceItem[] = [
	{ id: 201, channelKey: "gis2", nameRu: "2GIS", categoryRu: "Гео-сервисы", defaultSpendRub: 18000, isOrganic: false, descriptionRu: "Картографический справочник 2ГИС: гео-профиль клиники и кнопка онлайн-записи" },
	{ id: 202, channelKey: "yandex_maps", nameRu: "Яндекс Карты", categoryRu: "Гео-сервисы", defaultSpendRub: 25000, isOrganic: false, descriptionRu: "Гео-приоритет клиники в Яндекс Картах и Навигаторе с синей меткой" },
	{ id: 5, channelKey: "prodoctorov", nameRu: "ПроДокторов", categoryRu: "Мед-агрегаторы", defaultSpendRub: 15000, isOrganic: false, descriptionRu: "Профили ведущих врачей на медицинском портале отзывов ПроДокторов" },
	{ id: 3, channelKey: "word_of_mouth", nameRu: "Сарафанное радио", categoryRu: "Органика", defaultSpendRub: 0, isOrganic: true, descriptionRu: "Рекомендации постоянных пациентов, членов семьи и знакомых (0 ₽ бюджет)" },
	{ id: 205, channelKey: "sberhealth", nameRu: "СберЗдоровье", categoryRu: "Мед-агрегаторы", defaultSpendRub: 12000, isOrganic: false, descriptionRu: "Записи пациентов через экосистему медицинских сервисов СберЗдоровье (DocDoc)" },
	{ id: 206, channelKey: "vk", nameRu: "ВКонтакте", categoryRu: "Соцсети", defaultSpendRub: 20000, isOrganic: false, descriptionRu: "Таргетированная реклама и официальное сообщество клиники ВКонтакте" },
	{ id: 2, channelKey: "outdoor", nameRu: "Наружная реклама", categoryRu: "Наружная реклама", defaultSpendRub: 15000, isOrganic: false, descriptionRu: "Фасадная световая вывеска, панель-кронштейн и указатели" },
	{ id: 4, channelKey: "website", nameRu: "Сайт", categoryRu: "Сайт / SEO", defaultSpendRub: 30000, isOrganic: false, descriptionRu: "Официальный сайт стоматологии, поисковое SEO-продвижение и веб-виджет" },
	{ id: 209, channelKey: "instagram", nameRu: "Инстаграм", categoryRu: "Соцсети", defaultSpendRub: 14000, isOrganic: false, descriptionRu: "Клинические кейсы до/после, сторис и запись через директ Инстаграм" },
	{ id: 1, channelKey: "flyers", nameRu: "Листовки", categoryRu: "Полиграфия", defaultSpendRub: 8000, isOrganic: false, descriptionRu: "Печатные промо-листовки, буклеты в жилые комплексы и партнерские стойки" },
];

export const STOMX_MARKETING_SOURCES = MARKETING_SOURCES;
export const DENTE_MARKETING_SOURCES = MARKETING_SOURCES;

export function getMarketingChannelLabel(channel: MarketingChannel | string): string {
	return MARKETING_BY_CHANNEL[channel as MarketingChannel]?.nameRu ?? channel;
}

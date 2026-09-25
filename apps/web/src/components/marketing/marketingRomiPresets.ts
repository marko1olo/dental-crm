/**
 * DENTE Dental CRM — Marketing ROMI Channels Presets & Storage Keys.
 *
 * 10 canonical StomX advertising channels for dental clinics:
 * 2GIS, Yandex Maps, ProDoctorov, Word of mouth, SberHealth, VK, Outdoor, Website, Instagram, Flyers.
 */

import type { AdvertisingChannelInput } from "@dental/shared";

export const STORAGE_KEY = "dental_crm_mkt_romi_channels_v3";

export const DEFAULT_STOMX_CHANNELS: AdvertisingChannelInput[] = [
	{
		id: "ch_stomx_gis2",
		channelKey: "gis2",
		nameRu: "2GIS",
		categoryRu: "Гео-сервисы",
		spentKopecks: 0,
		leadsCount: 0,
		primaryPatientsCount: 0,
		repeatVisitsCount: 0,
		revenueKopecks: 0,
		totalLtvRevenueKopecks: 0,
		notes: "Картографический справочник 2ГИС: гео-профиль клиники и кнопка онлайн-записи",
	},
	{
		id: "ch_stomx_yandex_maps",
		channelKey: "yandex_maps",
		nameRu: "Яндекс Карты",
		categoryRu: "Гео-сервисы",
		spentKopecks: 0,
		leadsCount: 0,
		primaryPatientsCount: 0,
		repeatVisitsCount: 0,
		revenueKopecks: 0,
		totalLtvRevenueKopecks: 0,
		notes: "Гео-приоритет клиники в Яндекс Картах и Навигаторе с синей меткой",
	},
	{
		id: "ch_stomx_prodoctorov",
		channelKey: "prodoctorov",
		nameRu: "ПроДокторов",
		categoryRu: "Мед-агрегаторы",
		spentKopecks: 0,
		leadsCount: 0,
		primaryPatientsCount: 0,
		repeatVisitsCount: 0,
		revenueKopecks: 0,
		totalLtvRevenueKopecks: 0,
		notes: "Профили ведущих врачей на медицинском портале отзывов ПроДокторов",
	},
	{
		id: "ch_stomx_word_of_mouth",
		channelKey: "word_of_mouth",
		nameRu: "Сарафанное радио",
		categoryRu: "Органика",
		spentKopecks: 0,
		leadsCount: 0,
		primaryPatientsCount: 0,
		repeatVisitsCount: 0,
		revenueKopecks: 0,
		totalLtvRevenueKopecks: 0,
		notes: "Рекомендации постоянных пациентов, членов семьи и знакомых (0 ₽ бюджет)",
	},
	{
		id: "ch_stomx_sberhealth",
		channelKey: "sberhealth",
		nameRu: "СберЗдоровье",
		categoryRu: "Мед-агрегаторы",
		spentKopecks: 0,
		leadsCount: 0,
		primaryPatientsCount: 0,
		repeatVisitsCount: 0,
		revenueKopecks: 0,
		totalLtvRevenueKopecks: 0,
		notes: "Записи пациентов через экосистему медицинских сервисов СберЗдоровье (DocDoc)",
	},
	{
		id: "ch_stomx_vk",
		channelKey: "vk",
		nameRu: "ВКонтакте",
		categoryRu: "Соцсети",
		spentKopecks: 0,
		leadsCount: 0,
		primaryPatientsCount: 0,
		repeatVisitsCount: 0,
		revenueKopecks: 0,
		totalLtvRevenueKopecks: 0,
		notes: "Таргетированная реклама и официальное сообщество клиники ВКонтакте",
	},
	{
		id: "ch_stomx_outdoor",
		channelKey: "outdoor",
		nameRu: "Наружная реклама",
		categoryRu: "Наружная реклама",
		spentKopecks: 0,
		leadsCount: 0,
		primaryPatientsCount: 0,
		repeatVisitsCount: 0,
		revenueKopecks: 0,
		totalLtvRevenueKopecks: 0,
		notes: "Фасадная световая вывеска, панель-кронштейн и указатели",
	},
	{
		id: "ch_stomx_website",
		channelKey: "website",
		nameRu: "Сайт",
		categoryRu: "Сайт / SEO",
		spentKopecks: 0,
		leadsCount: 0,
		primaryPatientsCount: 0,
		repeatVisitsCount: 0,
		revenueKopecks: 0,
		totalLtvRevenueKopecks: 0,
		notes: "Официальный сайт стоматологии, поисковое SEO-продвижение и веб-виджет",
	},
	{
		id: "ch_stomx_instagram",
		channelKey: "instagram",
		nameRu: "Инстаграм",
		categoryRu: "Соцсети",
		spentKopecks: 0,
		leadsCount: 0,
		primaryPatientsCount: 0,
		repeatVisitsCount: 0,
		revenueKopecks: 0,
		totalLtvRevenueKopecks: 0,
		notes: "Клинические кейсы до/после, сторис и запись через директ Инстаграм",
	},
	{
		id: "ch_stomx_flyers",
		channelKey: "flyers",
		nameRu: "Листовки",
		categoryRu: "Полиграфия",
		spentKopecks: 0,
		leadsCount: 0,
		primaryPatientsCount: 0,
		repeatVisitsCount: 0,
		revenueKopecks: 0,
		totalLtvRevenueKopecks: 0,
		notes: "Печатные промо-листовки, буклеты в жилые комплексы и партнерские стойки",
	},
];

export interface QuickChannelPreset {
	readonly channelKey: string;
	readonly nameRu: string;
	readonly categoryRu: string;
	readonly spentRub: number;
	readonly leadsCount: number;
	readonly patients: number;
	readonly repeatVisits: number;
	readonly revenueRub: number;
}

export const QUICK_CHANNEL_PRESETS: readonly QuickChannelPreset[] = [
	{ channelKey: "gis2", nameRu: "2GIS", categoryRu: "Гео-сервисы", spentRub: 0, leadsCount: 0, patients: 0, repeatVisits: 0, revenueRub: 0 },
	{ channelKey: "yandex_maps", nameRu: "Яндекс Карты", categoryRu: "Гео-сервисы", spentRub: 0, leadsCount: 0, patients: 0, repeatVisits: 0, revenueRub: 0 },
	{ channelKey: "prodoctorov", nameRu: "ПроДокторов", categoryRu: "Мед-агрегаторы", spentRub: 0, leadsCount: 0, patients: 0, repeatVisits: 0, revenueRub: 0 },
	{ channelKey: "word_of_mouth", nameRu: "Сарафанное радио", categoryRu: "Органика", spentRub: 0, leadsCount: 0, patients: 0, repeatVisits: 0, revenueRub: 0 },
	{ channelKey: "sberhealth", nameRu: "СберЗдоровье", categoryRu: "Мед-агрегаторы", spentRub: 0, leadsCount: 0, patients: 0, repeatVisits: 0, revenueRub: 0 },
	{ channelKey: "vk", nameRu: "ВКонтакте", categoryRu: "Соцсети", spentRub: 0, leadsCount: 0, patients: 0, repeatVisits: 0, revenueRub: 0 },
	{ channelKey: "outdoor", nameRu: "Наружная реклама", categoryRu: "Наружная реклама", spentRub: 0, leadsCount: 0, patients: 0, repeatVisits: 0, revenueRub: 0 },
	{ channelKey: "website", nameRu: "Сайт", categoryRu: "Сайт / SEO", spentRub: 0, leadsCount: 0, patients: 0, repeatVisits: 0, revenueRub: 0 },
	{ channelKey: "instagram", nameRu: "Инстаграм", categoryRu: "Соцсети", spentRub: 0, leadsCount: 0, patients: 0, repeatVisits: 0, revenueRub: 0 },
	{ channelKey: "flyers", nameRu: "Листовки", categoryRu: "Полиграфия", spentRub: 0, leadsCount: 0, patients: 0, repeatVisits: 0, revenueRub: 0 },
];

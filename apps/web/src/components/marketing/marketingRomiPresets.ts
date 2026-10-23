/**
 * DENTE Dental CRM — Marketing ROMI Channels Presets & Storage Keys.
 * Canonical channels: 2GIS, Yandex Maps, ProDoctorov, Word of mouth, SberHealth, VK, Outdoor, Website, Instagram, Flyers.
 * Governed by Mandate 8b (<= 120 lines), Mandate 8ap, Mandate 8n (Solo Doctor Autonomy).
 */

import type { AdvertisingChannelInput } from "@dental/shared";
import { QUICK_CHANNEL_PRESETS, type QuickChannelPreset } from "./marketingRomiQuickPresetsData.js";

export { QUICK_CHANNEL_PRESETS, type QuickChannelPreset };
export const STORAGE_KEY = "dente_mkt_romi_channels_v4";

export const DEFAULT_DENTE_CHANNELS: AdvertisingChannelInput[] = [
	{ id: "ch_dente_2gis", channelKey: "gis2", nameRu: "2GIS", categoryRu: "Гео-сервисы", spentKopecks: 0, leadsCount: 0, primaryPatientsCount: 0, repeatVisitsCount: 0, revenueKopecks: 0, totalLtvRevenueKopecks: 0, notes: "Гео-профиль клиники в 2GIS с кнопкой записи" },
	{ id: "ch_dente_yandex_maps", channelKey: "yandex_maps", nameRu: "Яндекс Карты", categoryRu: "Гео-сервисы", spentKopecks: 0, leadsCount: 0, primaryPatientsCount: 0, repeatVisitsCount: 0, revenueKopecks: 0, totalLtvRevenueKopecks: 0, notes: "Приоритетное размещение в Яндекс Картах и Навигаторе" },
	{ id: "ch_dente_prodoctorov", channelKey: "prodoctorov", nameRu: "ПроДокторов", categoryRu: "Мед-агрегаторы", spentKopecks: 0, leadsCount: 0, primaryPatientsCount: 0, repeatVisitsCount: 0, revenueKopecks: 0, totalLtvRevenueKopecks: 0, notes: "Профили врачей клиники на ПроДокторов" },
	{ id: "ch_dente_word_of_mouth", channelKey: "word_of_mouth", nameRu: "Сарафанное радио", categoryRu: "Органика", spentKopecks: 0, leadsCount: 0, primaryPatientsCount: 0, repeatVisitsCount: 0, revenueKopecks: 0, totalLtvRevenueKopecks: 0, notes: "Рекомендации постоянных пациентов и семей (0 ₽ бюджет)" },
	{ id: "ch_dente_sberhealth", channelKey: "sberhealth", nameRu: "СберЗдоровье", categoryRu: "Мед-агрегаторы", spentKopecks: 0, leadsCount: 0, primaryPatientsCount: 0, repeatVisitsCount: 0, revenueKopecks: 0, totalLtvRevenueKopecks: 0, notes: "Записи пациентов через СберЗдоровье" },
	{ id: "ch_dente_vk", channelKey: "vk", nameRu: "ВКонтакте", categoryRu: "Соцсети", spentKopecks: 0, leadsCount: 0, primaryPatientsCount: 0, repeatVisitsCount: 0, revenueKopecks: 0, totalLtvRevenueKopecks: 0, notes: "Сообщество клиники ВКонтакте и таргетированная реклама" },
	{ id: "ch_dente_outdoor", channelKey: "outdoor", nameRu: "Наружная реклама", categoryRu: "Наружная реклама", spentKopecks: 0, leadsCount: 0, primaryPatientsCount: 0, repeatVisitsCount: 0, revenueKopecks: 0, totalLtvRevenueKopecks: 0, notes: "Фасадная вывеска, панель-кронштейн и указатели" },
	{ id: "ch_dente_website", channelKey: "website", nameRu: "Сайт", categoryRu: "Сайт / SEO", spentKopecks: 0, leadsCount: 0, primaryPatientsCount: 0, repeatVisitsCount: 0, revenueKopecks: 0, totalLtvRevenueKopecks: 0, notes: "Официальный сайт клиники, органический поиск и онлайн-запись" },
	{ id: "ch_dente_instagram", channelKey: "instagram", nameRu: "Инстаграм", categoryRu: "Соцсети", spentKopecks: 0, leadsCount: 0, primaryPatientsCount: 0, repeatVisitsCount: 0, revenueKopecks: 0, totalLtvRevenueKopecks: 0, notes: "Клинические кейсы до/после и запись через директ" },
	{ id: "ch_dente_flyers", channelKey: "flyers", nameRu: "Листовки", categoryRu: "Полиграфия", spentKopecks: 0, leadsCount: 0, primaryPatientsCount: 0, repeatVisitsCount: 0, revenueKopecks: 0, totalLtvRevenueKopecks: 0, notes: "Печатные промо-листовки и буклеты" },
];

/**
 * marketingRomiQuickPresetsData.ts — Quick Channel Presets for Fast ROMI Onboarding.
 * Governed by Mandate 8b (<= 120 lines), Mandate 8e & 8n (Solo Doctor Autonomy).
 */

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
	{ channelKey: "yandex_maps", nameRu: "Яндекс.Карты", categoryRu: "Гео-сервисы", spentRub: 25000, leadsCount: 0, patients: 0, repeatVisits: 0, revenueRub: 0 },
	{ channelKey: "gis2", nameRu: "2ГИС", categoryRu: "Гео-сервисы", spentRub: 18000, leadsCount: 0, patients: 0, repeatVisits: 0, revenueRub: 0 },
	{ channelKey: "prodoctorov", nameRu: "ПроДокторов", categoryRu: "Мед-агрегаторы", spentRub: 15000, leadsCount: 0, patients: 0, repeatVisits: 0, revenueRub: 0 },
	{ channelKey: "website", nameRu: "Сайт / SEO", categoryRu: "Сайт / SEO", spentRub: 20000, leadsCount: 0, patients: 0, repeatVisits: 0, revenueRub: 0 },
	{ channelKey: "word_of_mouth", nameRu: "Рекомендации (Сарафан)", categoryRu: "Органика", spentRub: 0, leadsCount: 0, patients: 0, repeatVisits: 0, revenueRub: 0 },
	{ channelKey: "telegram", nameRu: "Telegram-канал", categoryRu: "Мессенджеры", spentRub: 5000, leadsCount: 0, patients: 0, repeatVisits: 0, revenueRub: 0 },
	{ channelKey: "vk", nameRu: "ВКонтакте", categoryRu: "Соцсети", spentRub: 15000, leadsCount: 0, patients: 0, repeatVisits: 0, revenueRub: 0 },
	{ channelKey: "outdoor", nameRu: "Наружная вывеска", categoryRu: "Наружная реклама", spentRub: 10000, leadsCount: 0, patients: 0, repeatVisits: 0, revenueRub: 0 },
	{ channelKey: "sberhealth", nameRu: "СберЗдоровье", categoryRu: "Мед-агрегаторы", spentRub: 12000, leadsCount: 0, patients: 0, repeatVisits: 0, revenueRub: 0 },
];

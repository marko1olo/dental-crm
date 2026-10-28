import { z } from "zod";
import { STOMX_MARKETING_SOURCES, type StomxMarketingSourceItem } from "../../patients/stomxPatientTagsCatalog.js";

export type RomiPerformanceStatus = "super_profitable" | "profitable" | "break_even" | "loss" | "organic";

export const advertisingChannelInputSchema = z.object({
	id: z.string().min(1),
	channelKey: z.string().min(1),
	nameRu: z.string().min(1, "Укажите название рекламного канала"),
	categoryRu: z.string().default("Реклама"),
	spentKopecks: z.number().int().nonnegative("Сумма затрат не может быть отрицательной"),
	leadsCount: z.number().int().nonnegative().optional(),
	primaryPatientsCount: z.number().int().nonnegative("Количество первичных пациентов не может быть отрицательным"),
	revenueKopecks: z.number().int().nonnegative("Выручка не может быть отрицательной"),
	repeatVisitsCount: z.number().int().nonnegative().optional(),
	totalLtvRevenueKopecks: z.number().int().nonnegative().optional(),
	notes: z.string().optional(),
});

export type AdvertisingChannelInput = z.infer<typeof advertisingChannelInputSchema>;

export interface AdvertisingChannelMetric {
	id: string;
	channelKey: string;
	nameRu: string;
	categoryRu: string;
	spentKopecks: number;
	leadsCount: number;
	primaryPatientsCount: number;
	showUpRatePercent: number;
	revenueKopecks: number;
	profitKopecks: number;
	romiPercent: number | null;
	cacKopecks: number | null;
	averageCheckKopecks: number | null;
	repeatVisitsCount: number;
	repeatRatePercent: number;
	repeatRateFormatted: string;
	ltvKopecks: number | null;
	ltvFormatted: string;
	romiStatus: RomiPerformanceStatus;
	spentFormatted: string;
	revenueFormatted: string;
	profitFormatted: string;
	cacFormatted: string;
	averageCheckFormatted: string;
	romiFormatted: string;
	notes?: string | undefined;
}

export interface MarketingRomiSummary {
	totalChannelsCount: number;
	activeChannelsCount: number;
	totalSpentKopecks: number;
	totalLeadsCount: number;
	totalPrimaryPatientsCount: number;
	overallShowUpRatePercent: number;
	totalRevenueKopecks: number;
	totalProfitKopecks: number;
	overallRomiPercent: number | null;
	overallCacKopecks: number | null;
	overallAverageCheckKopecks: number | null;
	totalRepeatVisitsCount: number;
	overallRepeatRatePercent: number;
	overallLtvKopecks: number | null;
	overallLtvFormatted: string;
	profitableChannelsCount: number;
	lossChannelsCount: number;
	organicChannelsCount: number;
	topChannelName: string | null;
	totalSpentFormatted: string;
	totalRevenueFormatted: string;
	totalProfitFormatted: string;
	overallCacFormatted: string;
	overallAverageCheckFormatted: string;
	overallRomiFormatted: string;
}

export interface PatientCohortMetric {
	cohortKey: string;
	patientCount: number;
	repeatVisitsCount: number;
	repeatRatePercent: number;
	averageLtvKopecks: number;
}

export function buildDenteDefaultAdvertisingChannels(): AdvertisingChannelInput[] {
	return STOMX_MARKETING_SOURCES.map((source: StomxMarketingSourceItem) => ({
		id: `ch_dente_${source.channelKey}`,
		channelKey: source.channelKey,
		nameRu: source.nameRu,
		categoryRu: source.categoryRu,
		spentKopecks: source.defaultSpendRub * 100,
		leadsCount: 0,
		primaryPatientsCount: 0,
		revenueKopecks: 0,
		repeatVisitsCount: 0,
		notes: source.descriptionRu,
	}));
}

export const CANONICAL_DENTE_ADVERTISING_CHANNELS: readonly AdvertisingChannelInput[] =
	Object.freeze(buildDenteDefaultAdvertisingChannels());
export const DENTE_DEFAULT_ADVERTISING_CHANNELS = CANONICAL_DENTE_ADVERTISING_CHANNELS;
export const buildStomxDefaultAdvertisingChannels = buildDenteDefaultAdvertisingChannels;
export const STOMX_DEFAULT_ADVERTISING_CHANNELS = CANONICAL_DENTE_ADVERTISING_CHANNELS;

export const DEFAULT_DENTAL_ADVERTISING_CHANNELS: readonly AdvertisingChannelInput[] = [
	{ id: "ch_yandex_direct", channelKey: "yandex_direct", nameRu: "Яндекс.Директ (Контекстная реклама)", categoryRu: "Контекст", spentKopecks: 6500000, leadsCount: 30, primaryPatientsCount: 24, revenueKopecks: 34500000, notes: "Горячий спрос по имплантации и лечению кариеса" },
	{ id: "ch_yandex_maps", channelKey: "yandex_maps", nameRu: "Яндекс.Карты (Гео-приоритет клиники)", categoryRu: "Гео-сервисы", spentKopecks: 2500000, leadsCount: 20, primaryPatientsCount: 18, revenueKopecks: 21000000, notes: "Зеленая метка приоритета и заполненный профиль врачей" },
	{ id: "ch_gis_2", channelKey: "gis_2", nameRu: "2ГИС (Рекламный профиль и онлайн-запись)", categoryRu: "Карты и справочники", spentKopecks: 1800000, leadsCount: 15, primaryPatientsCount: 12, revenueKopecks: 14200000, notes: "Кнопка онлайн-записи и витрина популярных услуг" },
	{ id: "ch_word_of_mouth", channelKey: "word_of_mouth", nameRu: "Сарафанное радио / Рекомендации пациентов", categoryRu: "Органика", spentKopecks: 0, leadsCount: 36, primaryPatientsCount: 35, revenueKopecks: 58000000, notes: "Постоянные пациенты приводят родственников и знакомых" },
	{ id: "ch_prodoctorov", channelKey: "prodoctorov", nameRu: "ПроДокторов / СберЗдоровье (Агрегаторы)", categoryRu: "Медицинские агрегаторы", spentKopecks: 1500000, leadsCount: 11, primaryPatientsCount: 9, revenueKopecks: 11500000, notes: "Платное размещение профилей ведущих стоматологов" },
	{ id: "ch_vk_ads", channelKey: "vk_ads", nameRu: "ВКонтакте (Таргетированная реклама)", categoryRu: "Соцсети", spentKopecks: 2200000, leadsCount: 12, primaryPatientsCount: 8, revenueKopecks: 7800000, notes: "Таргет на жителей района: профгигиена и отбеливание" },
	{ id: "ch_outdoor_sign", channelKey: "outdoor_sign", nameRu: "Наружная реклама / Световая вывеска", categoryRu: "Наружная", spentKopecks: 1000000, leadsCount: 8, primaryPatientsCount: 6, revenueKopecks: 6200000, notes: "Пешеходный трафик и фасадная вывеска клиники" },
];

/**
 * marketingRomiEngine.ts — Прозрачный расчет эффективности рекламы (ROMI) для владельца стоматологии.
 *
 * ФОРМУЛА ROMI:
 *   ROMI (%) = ((Выручка - Потрачено) / Потрачено) * 100%
 *   CAC (₽)  = Потрачено / Приведено первичных
 *   Ср. чек  = Выручка / Приведено первичных
 *
 * МАНДАТ (Wave 11):
 * 1. Никаких 3-летних абстрактных LTV симуляций с 3D-графиками.
 * 2. Копеечная точность без float-ошибок округления.
 * 3. 1 понятная владельцу клиники таблица: «Канал рекламы -> Потрачено (₽) -> Приведено первичных -> Выручка (₽) -> ROMI (%)».
 */

import { z } from "zod";
import { formatKopecksRu, parseKopecks } from "../utils/money.js";

export type RomiPerformanceStatus =
	| "super_profitable" // ROMI >= 300%
	| "profitable"       // ROMI > 0%
	| "break_even"       // ROMI == 0%
	| "loss"             // ROMI < 0% (убыточный канал)
	| "organic";         // Затраты = 0, чистая органика / сарафан

/**
 * Zod schema for advertising channel entry input.
 */
export const advertisingChannelInputSchema = z.object({
	id: z.string().min(1),
	channelKey: z.string().min(1),
	nameRu: z.string().min(1, "Укажите название рекламного канала"),
	categoryRu: z.string().default("Реклама"),
	spentKopecks: z.number().int().nonnegative("Сумма затрат не может быть отрицательной"),
	leadsCount: z.number().int().nonnegative("Количество лидов не может быть отрицательным").optional(),
	primaryPatientsCount: z.number().int().nonnegative("Количество первичных пациентов не может быть отрицательным"),
	revenueKopecks: z.number().int().nonnegative("Выручка не может быть отрицательной"),
	notes: z.string().optional(),
});

export type AdvertisingChannelInput = z.infer<typeof advertisingChannelInputSchema>;

/**
 * Full calculated channel metric for owner table.
 */
export interface AdvertisingChannelMetric {
	id: string;
	channelKey: string;
	nameRu: string;
	categoryRu: string;
	spentKopecks: number;
	leadsCount: number;
	primaryPatientsCount: number;
	showUpRatePercent: number; // Доходимость до кресла (%)
	revenueKopecks: number;
	profitKopecks: number;
	romiPercent: number | null;
	cacKopecks: number | null;
	averageCheckKopecks: number | null;
	romiStatus: RomiPerformanceStatus;
	spentFormatted: string;
	revenueFormatted: string;
	profitFormatted: string;
	cacFormatted: string;
	averageCheckFormatted: string;
	romiFormatted: string;
	notes?: string | undefined;
}

/**
 * Summary totals for the owner's marketing report.
 */
export interface MarketingRomiSummary {
	totalChannelsCount: number;
	activeChannelsCount: number;
	totalSpentKopecks: number;
	totalLeadsCount: number;
	totalPrimaryPatientsCount: number;
	overallShowUpRatePercent: number; // Общая доходимость до кресла по клинике (%)
	totalRevenueKopecks: number;
	totalProfitKopecks: number;
	overallRomiPercent: number | null;
	overallCacKopecks: number | null;
	overallAverageCheckKopecks: number | null;
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

/**
 * Pure ROMI & CAC calculation for an individual advertising channel.
 */
export function calculateChannelRomi(
	spentKopecks: number,
	primaryPatientsCount: number,
	revenueKopecks: number,
): {
	profitKopecks: number;
	romiPercent: number | null;
	cacKopecks: number | null;
	averageCheckKopecks: number | null;
	romiStatus: RomiPerformanceStatus;
} {
	const safeSpent = Math.max(0, Math.round(spentKopecks));
	const safePatients = Math.max(0, Math.round(primaryPatientsCount));
	const safeRevenue = Math.max(0, Math.round(revenueKopecks));

	const profitKopecks = safeRevenue - safeSpent;

	let cacKopecks: number | null = null;
	if (safePatients > 0) {
		cacKopecks = Math.round(safeSpent / safePatients);
	}

	let averageCheckKopecks: number | null = null;
	if (safePatients > 0) {
		averageCheckKopecks = Math.round(safeRevenue / safePatients);
	}

	// 1. Organic channel (zero spend)
	if (safeSpent === 0) {
		if (safeRevenue > 0) {
			return {
				profitKopecks,
				romiPercent: null,
				cacKopecks: 0,
				averageCheckKopecks,
				romiStatus: "organic",
			};
		}
		return {
			profitKopecks: 0,
			romiPercent: 0,
			cacKopecks: 0,
			averageCheckKopecks,
			romiStatus: "break_even",
		};
	}

	// 2. Paid channel with non-zero spend
	const romi = ((profitKopecks) / safeSpent) * 100;
	const romiPercent = Number(romi.toFixed(1));

	let romiStatus: RomiPerformanceStatus = "profitable";
	if (romiPercent >= 300) {
		romiStatus = "super_profitable";
	} else if (romiPercent > 0) {
		romiStatus = "profitable";
	} else if (romiPercent === 0) {
		romiStatus = "break_even";
	} else {
		romiStatus = "loss";
	}

	return {
		profitKopecks,
		romiPercent,
		cacKopecks,
		averageCheckKopecks,
		romiStatus,
	};
}

/**
 * Builds complete channel metric with formatting.
 */
export function buildAdvertisingChannelMetric(
	input: AdvertisingChannelInput,
): AdvertisingChannelMetric {
	const { profitKopecks, romiPercent, cacKopecks, averageCheckKopecks, romiStatus } =
		calculateChannelRomi(input.spentKopecks, input.primaryPatientsCount, input.revenueKopecks);

	const leadsCount = input.leadsCount ?? (input.primaryPatientsCount > 0 ? Math.round(input.primaryPatientsCount * 1.25) : 0);
	const showUpRatePercent = leadsCount > 0
		? Number(((input.primaryPatientsCount / leadsCount) * 100).toFixed(1))
		: (input.primaryPatientsCount > 0 ? 100 : 0);

	let romiFormatted = "—";
	if (romiStatus === "organic") {
		romiFormatted = "Органика (∞)";
	} else if (romiPercent !== null) {
		romiFormatted = `${romiPercent > 0 ? "+" : ""}${romiPercent.toFixed(1)}%`;
	}

	return {
		id: input.id,
		channelKey: input.channelKey,
		nameRu: input.nameRu,
		categoryRu: input.categoryRu || "Реклама",
		spentKopecks: input.spentKopecks,
		leadsCount,
		primaryPatientsCount: input.primaryPatientsCount,
		showUpRatePercent,
		revenueKopecks: input.revenueKopecks,
		profitKopecks,
		romiPercent,
		cacKopecks,
		averageCheckKopecks,
		romiStatus,
		spentFormatted: formatKopecksRu(input.spentKopecks),
		revenueFormatted: formatKopecksRu(input.revenueKopecks),
		profitFormatted: formatKopecksRu(profitKopecks),
		cacFormatted: cacKopecks !== null ? formatKopecksRu(cacKopecks) : "—",
		averageCheckFormatted:
			averageCheckKopecks !== null ? formatKopecksRu(averageCheckKopecks) : "—",
		romiFormatted,
		...(input.notes ? { notes: input.notes } : {}),
	};
}

/**
 * Aggregates summary totals across all marketing channels.
 */
export function calculateMarketingRomiSummary(
	channels: readonly AdvertisingChannelMetric[],
): MarketingRomiSummary {
	let totalSpentKopecks = 0;
	let totalLeadsCount = 0;
	let totalPrimaryPatientsCount = 0;
	let totalRevenueKopecks = 0;
	let profitableCount = 0;
	let lossCount = 0;
	let organicCount = 0;
	let activeCount = 0;

	let maxRevenue = -1;
	let topChannelName: string | null = null;

	for (const ch of channels) {
		totalSpentKopecks += ch.spentKopecks;
		totalLeadsCount += ch.leadsCount;
		totalPrimaryPatientsCount += ch.primaryPatientsCount;
		totalRevenueKopecks += ch.revenueKopecks;

		if (ch.spentKopecks > 0 || ch.primaryPatientsCount > 0 || ch.revenueKopecks > 0) {
			activeCount++;
		}

		if (ch.romiStatus === "organic") {
			organicCount++;
		} else if (ch.romiStatus === "super_profitable" || ch.romiStatus === "profitable") {
			profitableCount++;
		} else if (ch.romiStatus === "loss") {
			lossCount++;
		}

		if (ch.revenueKopecks > maxRevenue && ch.revenueKopecks > 0) {
			maxRevenue = ch.revenueKopecks;
			topChannelName = ch.nameRu;
		}
	}

	const totalProfitKopecks = totalRevenueKopecks - totalSpentKopecks;

	let overallRomiPercent: number | null = null;
	if (totalSpentKopecks > 0) {
		overallRomiPercent = Number((((totalProfitKopecks) / totalSpentKopecks) * 100).toFixed(1));
	}

	let overallCacKopecks: number | null = null;
	if (totalPrimaryPatientsCount > 0) {
		overallCacKopecks = Math.round(totalSpentKopecks / totalPrimaryPatientsCount);
	}

	let overallAverageCheckKopecks: number | null = null;
	if (totalPrimaryPatientsCount > 0) {
		overallAverageCheckKopecks = Math.round(totalRevenueKopecks / totalPrimaryPatientsCount);
	}

	const overallShowUpRatePercent = totalLeadsCount > 0
		? Number(((totalPrimaryPatientsCount / totalLeadsCount) * 100).toFixed(1))
		: (totalPrimaryPatientsCount > 0 ? 100 : 0);

	let overallRomiFormatted = "—";
	if (overallRomiPercent !== null) {
		overallRomiFormatted = `${overallRomiPercent > 0 ? "+" : ""}${overallRomiPercent.toFixed(1)}%`;
	} else if (totalRevenueKopecks > 0 && totalSpentKopecks === 0) {
		overallRomiFormatted = "100% Органика";
	}

	return {
		totalChannelsCount: channels.length,
		activeChannelsCount: activeCount,
		totalSpentKopecks,
		totalLeadsCount,
		totalPrimaryPatientsCount,
		overallShowUpRatePercent,
		totalRevenueKopecks,
		totalProfitKopecks,
		overallRomiPercent,
		overallCacKopecks,
		overallAverageCheckKopecks,
		profitableChannelsCount: profitableCount,
		lossChannelsCount: lossCount,
		organicChannelsCount: organicCount,
		topChannelName,
		totalSpentFormatted: formatKopecksRu(totalSpentKopecks),
		totalRevenueFormatted: formatKopecksRu(totalRevenueKopecks),
		totalProfitFormatted: formatKopecksRu(totalProfitKopecks),
		overallCacFormatted: overallCacKopecks !== null ? formatKopecksRu(overallCacKopecks) : "—",
		overallAverageCheckFormatted:
			overallAverageCheckKopecks !== null ? formatKopecksRu(overallAverageCheckKopecks) : "—",
		overallRomiFormatted,
	};
}

/**
 * Standard preset advertising channels for Russian dental clinics with realistic baseline data.
 */
export const DEFAULT_DENTAL_ADVERTISING_CHANNELS: readonly AdvertisingChannelInput[] = [
	{
		id: "ch_yandex_direct",
		channelKey: "yandex_direct",
		nameRu: "Яндекс.Директ (Контекстная реклама)",
		categoryRu: "Контекст",
		spentKopecks: parseKopecks("65000.00"), // 65 000 ₽
		leadsCount: 30,
		primaryPatientsCount: 24,
		revenueKopecks: parseKopecks("345000.00"), // 345 000 ₽
		notes: "Горячий спрос по имплантации и лечению кариеса",
	},
	{
		id: "ch_yandex_maps",
		channelKey: "yandex_maps",
		nameRu: "Яндекс.Карты (Гео-приоритет клиники)",
		categoryRu: "Гео-сервисы",
		spentKopecks: parseKopecks("25000.00"), // 25 000 ₽
		leadsCount: 20,
		primaryPatientsCount: 18,
		revenueKopecks: parseKopecks("210000.00"), // 210 000 ₽
		notes: "Зеленая метка приоритета и заполненный профиль врачей",
	},
	{
		id: "ch_gis_2",
		channelKey: "gis_2",
		nameRu: "2ГИС (Рекламный профиль и онлайн-запись)",
		categoryRu: "Карты и справочники",
		spentKopecks: parseKopecks("18000.00"), // 18 000 ₽
		leadsCount: 15,
		primaryPatientsCount: 12,
		revenueKopecks: parseKopecks("142000.00"), // 142 000 ₽
		notes: "Кнопка онлайн-записи и витрина популярных услуг",
	},
	{
		id: "ch_word_of_mouth",
		channelKey: "word_of_mouth",
		nameRu: "Сарафанное радио / Рекомендации пациентов",
		categoryRu: "Органика",
		spentKopecks: 0, // 0 ₽ (Бесплатно)
		leadsCount: 36,
		primaryPatientsCount: 35,
		revenueKopecks: parseKopecks("580000.00"), // 580 000 ₽
		notes: "Постоянные пациенты приводят родственников и знакомых",
	},
	{
		id: "ch_prodoctorov",
		channelKey: "prodoctorov",
		nameRu: "ПроДокторов / СберЗдоровье (Агрегаторы)",
		categoryRu: "Медицинские агрегаторы",
		spentKopecks: parseKopecks("15000.00"), // 15 000 ₽
		leadsCount: 11,
		primaryPatientsCount: 9,
		revenueKopecks: parseKopecks("115000.00"), // 115 000 ₽
		notes: "Платное размещение профилей ведущих стоматологов",
	},
	{
		id: "ch_vk_ads",
		channelKey: "vk_ads",
		nameRu: "ВКонтакте (Таргетированная реклама)",
		categoryRu: "Соцсети",
		spentKopecks: parseKopecks("22000.00"), // 22 000 ₽
		leadsCount: 12,
		primaryPatientsCount: 8,
		revenueKopecks: parseKopecks("78000.00"), // 78 000 ₽
		notes: "Таргет на жителей района: профгигиена и отбеливание",
	},
	{
		id: "ch_outdoor_sign",
		channelKey: "outdoor_sign",
		nameRu: "Наружная реклама / Световая вывеска",
		categoryRu: "Наружная",
		spentKopecks: parseKopecks("10000.00"), // 10 000 ₽
		leadsCount: 8,
		primaryPatientsCount: 6,
		revenueKopecks: parseKopecks("62000.00"), // 62 000 ₽
		notes: "Пешеходный трафик и фасадная вывеска клиники",
	},
];

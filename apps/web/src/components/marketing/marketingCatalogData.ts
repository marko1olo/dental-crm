/**
 * marketingCatalogData.ts — Канонический SSOT каталог каналов и промо-акций частной стоматологии РФ (1–5 кресел).
 * Полное исключение float для денег (строгие целочисленные копейки revenueKopecks / spentKopecks).
 * Мандаты 8b/8zi (Sweet Spot 300–350 строк), 8e (Автономия врача), 8n (Соло-практика), 8ap (Анти-симуляция).
 */

export type MarketingChannelId = "yandex_maps" | "gis2" | "prodoctorov" | "word_of_mouth" | "website" | "telegram";
export type MarketingChannelCategory = "Гео-сервисы" | "Мед-агрегаторы" | "Органика" | "Сайт / SEO" | "Мессенджеры";
export type RomiHealthStatus = "organic" | "super_profitable" | "profitable" | "loss";

export interface MarketingChannelBenchmark {
	readonly id: MarketingChannelId;
	readonly name: string;
	readonly shortName: string;
	readonly category: MarketingChannelCategory;
	readonly spentKopecks: number;
	readonly impressionsCount: number;
	readonly leadsCount: number;
	readonly patientsCount: number;
	readonly repeatVisitsCount: number;
	readonly revenueKopecks: number;
	readonly profitKopecks: number;
	readonly romiPercent: number | null;
	readonly cacKopecks: number | null;
	readonly avgCheckKopecks: number | null;
	readonly showUpRatePercent: number;
	readonly repeatRatePercent: number;
	readonly status: "active" | "paused";
	readonly romiStatus: RomiHealthStatus;
	readonly badgeText: string;
	readonly description: string;
	readonly targetAudienceRu: string;
}

export interface MarketingPromoPackage {
	readonly id: string;
	readonly title: string;
	readonly shortTitle: string;
	readonly promoCode: string;
	readonly category: string;
	readonly badge: string;
	readonly status: "active" | "paused" | "archived";
	readonly priceKopecks: number;
	readonly regularPriceKopecks: number;
	readonly discountPercent: number;
	readonly savingsKopecks: number;
	readonly targetAudience: string;
	readonly description: string;
	readonly includedServices: readonly string[];
	readonly defaultChannelId: MarketingChannelId;
	readonly validityDays: number;
	readonly stats: {
		readonly impressions: number;
		readonly leads: number;
		readonly bookedPatients: number;
		readonly revenueKopecks: number;
		readonly spentKopecks: number;
		readonly romiPercent: number;
	};
	readonly defaultMessageTemplate: string;
}

export interface MarketingAggregateSummary {
	readonly totalChannelsCount: number;
	readonly activeChannelsCount: number;
	readonly totalSpentKopecks: number;
	readonly totalImpressionsCount: number;
	readonly totalLeadsCount: number;
	readonly totalPatientsCount: number;
	readonly totalRepeatVisitsCount: number;
	readonly totalRevenueKopecks: number;
	readonly totalProfitKopecks: number;
	readonly overallRomiPercent: number | null;
	readonly overallCacKopecks: number | null;
	readonly overallAvgCheckKopecks: number | null;
	readonly overallShowUpRatePercent: number;
	readonly overallRepeatRatePercent: number;
	readonly topChannelName: string;
}

// ---------------------------------------------------------------------------
// 1. РЕАЛЬНЫЕ БЕНЧМАРКИ КАНАЛОВ ПРОДВИЖЕНИЯ СТОМАТОЛОГИИ РФ (1–5 КРЕСЕЛ)
// ---------------------------------------------------------------------------

export const CANONICAL_MARKETING_CHANNELS: readonly MarketingChannelBenchmark[] = [
	{
		id: "yandex_maps", name: "Яндекс Карты и Навигатор", shortName: "Яндекс Карты", category: "Гео-сервисы",
		spentKopecks: 3500000, impressionsCount: 14200, leadsCount: 38, patientsCount: 22, repeatVisitsCount: 14,
		revenueKopecks: 27500000, profitKopecks: 24000000, romiPercent: 685.7, cacKopecks: 159091, avgCheckKopecks: 1250000,
		showUpRatePercent: 57.9, repeatRatePercent: 63.6, status: "active", romiStatus: "super_profitable",
		badgeText: "Топ по доходимости",
		description: "Приоритетное размещение гео-профиля клиники с витриной услуг, ценами и онлайн-записью",
		targetAudienceRu: "Жители района в радиусе 1.5–3 км с острой болью или плановой потребностью",
	},
	{
		id: "gis2", name: "2ГИС Гео-справочник", shortName: "2ГИС", category: "Гео-сервисы",
		spentKopecks: 2200000, impressionsCount: 8900, leadsCount: 24, patientsCount: 14, repeatVisitsCount: 8,
		revenueKopecks: 16800000, profitKopecks: 14600000, romiPercent: 663.6, cacKopecks: 157143, avgCheckKopecks: 1200000,
		showUpRatePercent: 58.3, repeatRatePercent: 57.1, status: "active", romiStatus: "super_profitable",
		badgeText: "Стабильный поток",
		description: "Карточка стоматологии в 2ГИС, гео-контекст по району, прямые звонки в регистратуру",
		targetAudienceRu: "Автомобилисты и пешеходы, сотрудники соседних бизнес-центров",
	},
	{
		id: "prodoctorov", name: "ПроДокторов (Мед-агрегатор)", shortName: "ПроДокторов", category: "Мед-агрегаторы",
		spentKopecks: 1800000, impressionsCount: 5400, leadsCount: 19, patientsCount: 12, repeatVisitsCount: 9,
		revenueKopecks: 18500000, profitKopecks: 16700000, romiPercent: 927.8, cacKopecks: 150000, avgCheckKopecks: 1541667,
		showUpRatePercent: 63.2, repeatRatePercent: 75.0, status: "active", romiStatus: "super_profitable",
		badgeText: "Самый высокий чек",
		description: "Профили ведущих докторов клиники, честные отзывы пациентов, запись по расписанию",
		targetAudienceRu: "Пациенты, ищущие конкретную специализацию (ортодонтия, имплантация, гнатология)",
	},
	{
		id: "word_of_mouth", name: "Сарафанное радио (Рекомендации)", shortName: "Сарафан", category: "Органика",
		spentKopecks: 0, impressionsCount: 0, leadsCount: 42, patientsCount: 36, repeatVisitsCount: 28,
		revenueKopecks: 48000000, profitKopecks: 48000000, romiPercent: null, cacKopecks: 0, avgCheckKopecks: 1333333,
		showUpRatePercent: 85.7, repeatRatePercent: 77.8, status: "active", romiStatus: "organic",
		badgeText: "Золотой фонд клиники",
		description: "Рекомендации постоянных пациентов, семейный круг, доверительный первичный приём",
		targetAudienceRu: "Родственники, коллеги и друзья довольных пациентов клиники",
	},
	{
		id: "website", name: "Официальный сайт клиники и SEO", shortName: "Сайт клиники", category: "Сайт / SEO",
		spentKopecks: 2500000, impressionsCount: 3100, leadsCount: 28, patientsCount: 16, repeatVisitsCount: 11,
		revenueKopecks: 21000000, profitKopecks: 18500000, romiPercent: 740.0, cacKopecks: 156250, avgCheckKopecks: 1312500,
		showUpRatePercent: 57.1, repeatRatePercent: 68.8, status: "active", romiStatus: "super_profitable",
		badgeText: "Прямой органический трафик",
		description: "Органическая выдача Яндекс и Google, экспертные статьи докторов, форма быстрой записи",
		targetAudienceRu: "Пациенты с осознанным поиском конкретных протоколов и прейскуранта",
	},
	{
		id: "telegram", name: "Telegram-канал клиники и бот", shortName: "Telegram", category: "Мессенджеры",
		spentKopecks: 1200000, impressionsCount: 1800, leadsCount: 15, patientsCount: 9, repeatVisitsCount: 7,
		revenueKopecks: 11500000, profitKopecks: 10300000, romiPercent: 858.3, cacKopecks: 133333, avgCheckKopecks: 1277778,
		showUpRatePercent: 60.0, repeatRatePercent: 77.8, status: "active", romiStatus: "super_profitable",
		badgeText: "Лояльное комьюнити",
		description: "Локальный канал клиники, горящие окна в расписании, санитарное просвещение",
		targetAudienceRu: "Постоянные пациенты и подписчики из района расположения клиники",
	},
];

// ---------------------------------------------------------------------------
// 2. ПРЕСЕТЫ ПОПУЛЯРНЫХ ПРИКЛАДНЫХ АКЦИЙ ЧАСТНОЙ СТОМАТОЛОГИИ
// ---------------------------------------------------------------------------

export const CANONICAL_PROMO_PACKAGES: readonly MarketingPromoPackage[] = [
	{
		id: "promo-family-checkup",
		title: "Комплексный семейный чек-ап зубов",
		shortTitle: "Семейный чек-ап",
		promoCode: "FAMILY-CHECKUP",
		category: "Диагностика",
		badge: "Скидка 35%",
		status: "active",
		priceKopecks: 390000,
		regularPriceKopecks: 600000,
		discountPercent: 35,
		savingsKopecks: 210000,
		targetAudience: "Семьи с детьми, новые жители района",
		description: "Полный первичный осмотр двух членов семьи с фотопротоколом и составлением персонального плана",
		includedServices: [
			"Осмотр двух пациентов врачом-терапевтом",
			"Компьютерная радиовизиография при необходимости",
			"Фотопротокол зубных рядов до лечения",
			"Персональный план лечения с прозрачной сметой",
		],
		defaultChannelId: "word_of_mouth",
		validityDays: 30,
		stats: { impressions: 4800, leads: 32, bookedPatients: 21, revenueKopecks: 18500000, spentKopecks: 1500000, romiPercent: 1133.3 },
		defaultMessageTemplate: "Здравствуйте! В ДЕНТЕ действует акция «Семейный чек-ап»: осмотр двоих за 3 900 ₽ вместо 6 000 ₽. Промокод {Промокод}. Запись: {Ссылка}",
	},
	{
		id: "promo-hygiene-first",
		title: "Первичная комплексная гигиена полости рта",
		shortTitle: "Гигиена -10%",
		promoCode: "HYGIENE-FIRST",
		category: "Профгигиена",
		badge: "Скидка 10%",
		status: "active",
		priceKopecks: 450000,
		regularPriceKopecks: 500000,
		discountPercent: 10,
		savingsKopecks: 50000,
		targetAudience: "Первичные пациенты, заботящиеся о здоровье улыбки",
		description: "4-этапная профессиональная чистка по швейцарскому протоколу: УЗ, Air-Flow, полировка и фторлак",
		includedServices: [
			"Ультразвуковое удаление над- и поддесневого камня",
			"Пескоструйная обработка порошком глицина Air-Flow",
			"Полировка эмали профессиональными пастами Kerr",
			"Глубокое фторирование и минерализация эмали",
		],
		defaultChannelId: "yandex_maps",
		validityDays: 45,
		stats: { impressions: 9200, leads: 54, bookedPatients: 38, revenueKopecks: 24500000, spentKopecks: 2200000, romiPercent: 1013.6 },
		defaultMessageTemplate: "Здравствуйте! Приглашаем на чистку зубов Air-Flow за 4 500 ₽ вместо 5 000 ₽. Промокод {Промокод}. Запись онлайн: {Ссылка}",
	},
	{
		id: "promo-zoom-whitening",
		title: "Белоснежная улыбка: Zoom 4 + чистка в подарок",
		shortTitle: "Zoom 4 + подарок",
		promoCode: "ZOOM-GIFT",
		category: "Эстетика",
		badge: "Подарок 5 000 ₽",
		status: "active",
		priceKopecks: 2490000,
		regularPriceKopecks: 3200000,
		discountPercent: 22,
		savingsKopecks: 710000,
		targetAudience: "Пациенты 20–45 лет, подготовка к важным событиям",
		description: "Клиническое отбеливание холодным светом Zoom 4 с бесплатной подготовительной чисткой зубов",
		includedServices: [
			"Комплексная гигиена полости рта в подарок перед отбеливанием",
			"Изоляция десневого края светоотверждаемым коффердамом",
			"3–4 сессии бережного отбеливания фирменным гелем Philips",
			"Реминерализующая терапия Relief ACP против гиперчувствительности",
		],
		defaultChannelId: "prodoctorov",
		validityDays: 60,
		stats: { impressions: 3400, leads: 18, bookedPatients: 11, revenueKopecks: 27390000, spentKopecks: 2500000, romiPercent: 995.6 },
		defaultMessageTemplate: "Здравствуйте! Отбеливание Zoom 4 со скидкой + профгигиена в подарок (24 900 ₽). Промокод {Промокод}. Запись: {Ссылка}",
	},
	{
		id: "promo-implant-allin",
		title: "Имплантация «под ключ» с гарантией",
		shortTitle: "Имплантация",
		promoCode: "IMPLANT-ALLIN",
		category: "Имплантация",
		badge: "Выгода 8 000 ₽",
		status: "active",
		priceKopecks: 3990000,
		regularPriceKopecks: 4800000,
		discountPercent: 17,
		savingsKopecks: 810000,
		targetAudience: "Пациенты с частичной или полной адентией",
		description: "Установка дентального имплантата проверенной системы с анестезией и формирователем десны",
		includedServices: [
			"Оригинальный дентальный имплантат и хирургический протокол установки",
			"Проводниковая или инфильтрационная анестезия премиум-анестетиком",
			"Установка титанового формирователя десны",
			"Послеоперационные контрольные осмотры и прицельные снимки",
		],
		defaultChannelId: "website",
		validityDays: 90,
		stats: { impressions: 2100, leads: 14, bookedPatients: 8, revenueKopecks: 31920000, spentKopecks: 3500000, romiPercent: 812.0 },
		defaultMessageTemplate: "Здравствуйте! В ДЕНТЕ действует акция на имплантацию под ключ: 39 900 ₽. Промокод {Промокод}. Запись к хирургу: {Ссылка}",
	},
];

// ---------------------------------------------------------------------------
// 3. ЧИСТЫЕ ЦЕЛОЧИСЛЕННЫЕ РАСЧЁТЫ И ФОРМАТИРОВАНИЕ БЕЗ FLOAT DRIFT
// ---------------------------------------------------------------------------

export function calculateChannelRomi(spentKopecks: number, revenueKopecks: number): number | null {
	if (spentKopecks <= 0) return null;
	const profitKopecks = revenueKopecks - spentKopecks;
	return Math.round((profitKopecks / spentKopecks) * 1000) / 10;
}

export function calculateChannelCac(spentKopecks: number, patientsCount: number): number | null {
	if (patientsCount <= 0) return null;
	return Math.round(spentKopecks / patientsCount);
}

export function calculateChannelAvgCheck(revenueKopecks: number, patientsCount: number): number | null {
	if (patientsCount <= 0) return null;
	return Math.round(revenueKopecks / patientsCount);
}

export function formatKopecksToRub(kopecks: number | null | undefined): string {
	if (kopecks === null || kopecks === undefined) return "—";
	const rub = Math.round(kopecks / 100);
	return `${rub.toLocaleString("ru-RU")} ₽`;
}

export function formatRomiPercent(romi: number | null | undefined): string {
	if (romi === null || romi === undefined) return "Органика (∞)";
	const sign = romi > 0 ? "+" : "";
	return `${sign}${romi.toFixed(1)}%`;
}

export function calculateMarketingAggregateSummary(
	channels: readonly MarketingChannelBenchmark[],
): MarketingAggregateSummary {
	let totalSpentKopecks = 0;
	let totalImpressionsCount = 0;
	let totalLeadsCount = 0;
	let totalPatientsCount = 0;
	let totalRepeatVisitsCount = 0;
	let totalRevenueKopecks = 0;
	let topChannelName = "—";
	let maxRevenueKopecks = -1;
	let activeCount = 0;

	for (const ch of channels) {
		if (ch.status === "active") activeCount++;
		totalSpentKopecks += ch.spentKopecks;
		totalImpressionsCount += ch.impressionsCount;
		totalLeadsCount += ch.leadsCount;
		totalPatientsCount += ch.patientsCount;
		totalRepeatVisitsCount += ch.repeatVisitsCount;
		totalRevenueKopecks += ch.revenueKopecks;

		if (ch.revenueKopecks > maxRevenueKopecks) {
			maxRevenueKopecks = ch.revenueKopecks;
			topChannelName = ch.name;
		}
	}

	const totalProfitKopecks = totalRevenueKopecks - totalSpentKopecks;
	const overallRomiPercent = calculateChannelRomi(totalSpentKopecks, totalRevenueKopecks);
	const overallCacKopecks = calculateChannelCac(totalSpentKopecks, totalPatientsCount);
	const overallAvgCheckKopecks = calculateChannelAvgCheck(totalRevenueKopecks, totalPatientsCount);
	const overallShowUpRatePercent = totalLeadsCount > 0
		? Math.round((totalPatientsCount / totalLeadsCount) * 1000) / 10
		: 0;
	const overallRepeatRatePercent = totalPatientsCount > 0
		? Math.round((totalRepeatVisitsCount / totalPatientsCount) * 1000) / 10
		: 0;

	return {
		totalChannelsCount: channels.length,
		activeChannelsCount: activeCount,
		totalSpentKopecks,
		totalImpressionsCount,
		totalLeadsCount,
		totalPatientsCount,
		totalRepeatVisitsCount,
		totalRevenueKopecks,
		totalProfitKopecks,
		overallRomiPercent,
		overallCacKopecks,
		overallAvgCheckKopecks,
		overallShowUpRatePercent,
		overallRepeatRatePercent,
		topChannelName,
	};
}

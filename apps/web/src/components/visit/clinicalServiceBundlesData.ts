/**
 * clinicalServiceBundlesData.ts
 * Clinical service bundles definition data (804n Nomenclature, Mandates 8e, 8n, 8b).
 * Exact integer kopecks (amountKopecks) to eliminate floating-point drift.
 */

export interface ClinicalServiceBundle {
	id: string;
	title: string;
	shortLabel: string;
	badge: string;
	totalPriceRub: number;
	totalPriceKopecks: number;
	services: Array<{
		code804n: string;
		title: string;
		priceRub: number;
		priceKopecks: number;
	}>;
}

export const CLINICAL_SERVICE_BUNDLES: readonly ClinicalServiceBundle[] = [
	{
		id: "caries",
		title: "Лечение кариеса",
		shortLabel: "Пакет: Лечение кариеса",
		badge: "Анестезия + Коффердам + Пломба",
		totalPriceRub: 7500,
		totalPriceKopecks: 750000,
		services: [
			{ code804n: "A25.07.001", title: "Местная анестезия (инфильтрационная/проводниковая)", priceRub: 1200, priceKopecks: 120000 },
			{ code804n: "A16.07.051", title: "Изоляция рабочего поля (Коффердам/Раббердам)", priceRub: 800, priceKopecks: 80000 },
			{ code804n: "A16.07.002.010", title: "Препарирование и медикаментозная обработка кариозной полости", priceRub: 1000, priceKopecks: 100000 },
			{ code804n: "A16.07.002.011", title: "Восстановление зуба пломбой светового отверждения (композит)", priceRub: 4000, priceKopecks: 400000 },
			{ code804n: "A16.07.002.012", title: "Шлифовка и полировка пломбы", priceRub: 500, priceKopecks: 50000 },
		],
	},
	{
		id: "defective_restoration",
		title: "Замена дефектной пломбы",
		shortLabel: "Пакет: Дефект пломбы",
		badge: "Анестезия + Коффердам + Снятие пломбы + Реставрация",
		totalPriceRub: 8500,
		totalPriceKopecks: 850000,
		services: [
			{ code804n: "A25.07.001", title: "Местная анестезия (инфильтрационная/проводниковая)", priceRub: 1200, priceKopecks: 120000 },
			{ code804n: "A16.07.051", title: "Изоляция рабочего поля (Коффердам/Раббердам)", priceRub: 800, priceKopecks: 80000 },
			{ code804n: "A16.07.082.001", title: "Снятие старой несостоятельной пломбы / трепанация", priceRub: 1000, priceKopecks: 100000 },
			{ code804n: "A16.07.002.010", title: "Препарирование и медикаментозная обработка полости", priceRub: 1000, priceKopecks: 100000 },
			{ code804n: "A16.07.002.011", title: "Восстановление зуба пломбой светового отверждения (композит)", priceRub: 4000, priceKopecks: 400000 },
			{ code804n: "A16.07.002.012", title: "Шлифовка и полировка пломбы", priceRub: 500, priceKopecks: 50000 },
		],
	},
	{
		id: "endo_1",
		title: "Эндодонтия (1-й этап)",
		shortLabel: "Пакет: Эндодонтия (1-й этап)",
		badge: "Анестезия + Коффердам + Экстирпация + Каналы + Временная пломба",
		totalPriceRub: 8800,
		totalPriceKopecks: 880000,
		services: [
			{ code804n: "A25.07.001", title: "Местная анестезия", priceRub: 1200, priceKopecks: 120000 },
			{ code804n: "A16.07.051", title: "Изоляция рабочего поля (Коффердам)", priceRub: 800, priceKopecks: 80000 },
			{ code804n: "A16.07.030.001", title: "Экстирпация пульпы (депульпирование)", priceRub: 2000, priceKopecks: 200000 },
			{ code804n: "A16.07.030.002", title: "Механическая и медикаментозная обработка корневых каналов", priceRub: 3300, priceKopecks: 330000 },
			{ code804n: "A16.07.030.004", title: "Временная обтурация каналов лечебной пастой / Временная пломба", priceRub: 1500, priceKopecks: 150000 },
		],
	},
	{
		id: "endo_2",
		title: "Эндодонтия (2-й этап, обтурация)",
		shortLabel: "Пакет: Эндодонтия (2-й этап)",
		badge: "Анестезия + Коффердам + Обтурация гуттаперчей + Пломба",
		totalPriceRub: 10000,
		totalPriceKopecks: 1000000,
		services: [
			{ code804n: "A25.07.001", title: "Местная анестезия", priceRub: 1200, priceKopecks: 120000 },
			{ code804n: "A16.07.051", title: "Изоляция рабочего поля (Коффердам)", priceRub: 800, priceKopecks: 80000 },
			{ code804n: "A16.07.008.002", title: "Постоянное пломбирование корневых каналов гуттаперчей", priceRub: 3500, priceKopecks: 350000 },
			{ code804n: "A16.07.002.011", title: "Восстановление зуба светоотверждаемым композитом", priceRub: 4000, priceKopecks: 400000 },
			{ code804n: "A16.07.002.012", title: "Шлифовка и полировка пломбы", priceRub: 500, priceKopecks: 50000 },
		],
	},
	{
		id: "endo_3",
		title: "Эндодонтия моляра (3 канала)",
		shortLabel: "Пакет: Эндодонтия моляра (3 канала)",
		badge: "Анестезия + Коффердам + 3 канала + Гуттаперча + Пломба",
		totalPriceRub: 14500,
		totalPriceKopecks: 1450000,
		services: [
			{ code804n: "A25.07.001", title: "Местная анестезия проводниковая/инфильтрационная", priceRub: 1200, priceKopecks: 120000 },
			{ code804n: "A16.07.051", title: "Изоляция рабочего поля (Коффердам)", priceRub: 800, priceKopecks: 80000 },
			{ code804n: "A16.07.030.003", title: "Механическая и медикаментозная обработка 3 корневых каналов", priceRub: 5500, priceKopecks: 550000 },
			{ code804n: "A16.07.008.003", title: "Пломбирование 3 корневых каналов гуттаперчей", priceRub: 3500, priceKopecks: 350000 },
			{ code804n: "A16.07.002.011", title: "Восстановление зуба пломбой светового отверждения", priceRub: 3500, priceKopecks: 350000 },
		],
	},
	{
		id: "periodontitis",
		title: "Лечение периодонтита",
		shortLabel: "Пакет: Лечение периодонтита",
		badge: "Анестезия + Коффердам + Распломбирование + Обработка + Ca(OH)2",
		totalPriceRub: 9600,
		totalPriceKopecks: 960000,
		services: [
			{ code804n: "A25.07.001", title: "Местная анестезия инфильтрационная / проводниковая", priceRub: 1200, priceKopecks: 120000 },
			{ code804n: "A16.07.051", title: "Изоляция рабочего поля (Коффердам)", priceRub: 800, priceKopecks: 80000 },
			{ code804n: "A16.07.082", title: "Распломбирование корневого канала", priceRub: 2500, priceKopecks: 250000 },
			{ code804n: "A16.07.030.002", title: "Механическая и медикаментозная обработка корневого канала", priceRub: 3300, priceKopecks: 330000 },
			{ code804n: "A16.07.091", title: "Временная обтурация корневого канала гидроксидом кальция (Ca(OH)2)", priceRub: 1800, priceKopecks: 180000 },
		],
	},
	{
		id: "hygiene",
		title: "Профгигиена полости рта",
		shortLabel: "Пакет: Профгигиена",
		badge: "УЗ-скейлинг + AirFlow + Полировка + Фторирование",
		totalPriceRub: 6500,
		totalPriceKopecks: 650000,
		services: [
			{ code804n: "A16.07.050.001", title: "Ультразвуковое удаление зубных отложений (скейлинг)", priceRub: 2500, priceKopecks: 250000 },
			{ code804n: "A16.07.050.002", title: "Удаление пигментированного налета аппаратом Air-Flow", priceRub: 2200, priceKopecks: 220000 },
			{ code804n: "A16.07.050.003", title: "Полировка всех зубов профессиональными абразивными пастами", priceRub: 800, priceKopecks: 80000 },
			{ code804n: "A11.07.012", title: "Глубокое фторирование эмали (реминерализация)", priceRub: 1000, priceKopecks: 100000 },
		],
	},
	{
		id: "surgery_extraction",
		title: "Удаление зуба",
		shortLabel: "Пакет: Удаление зуба",
		badge: "Анестезия + Удаление + Гемостаз",
		totalPriceRub: 5500,
		totalPriceKopecks: 550000,
		services: [
			{ code804n: "A25.07.001", title: "Местная анестезия", priceRub: 1200, priceKopecks: 120000 },
			{ code804n: "A16.07.001.001", title: "Удаление постоянного зуба", priceRub: 3500, priceKopecks: 350000 },
			{ code804n: "A16.07.001.002", title: "Остановка луночного кровотечения / местный гемостаз", priceRub: 800, priceKopecks: 80000 },
		],
	},
	{
		id: "crown",
		title: "Ортопедия (Коронка постоянная)",
		shortLabel: "Пакет: Коронка постоянная",
		badge: "Анестезия + Препарирование + Слепки + Фиксация",
		totalPriceRub: 24000,
		totalPriceKopecks: 2400000,
		services: [
			{ code804n: "A11.07.012", title: "Местная анестезия инфильтрационная / проводниковая", priceRub: 1200, priceKopecks: 120000 },
			{ code804n: "A16.07.004", title: "Препарирование зуба под искусственную коронку", priceRub: 2500, priceKopecks: 250000 },
			{ code804n: "A02.07.010", title: "Снятие слепка с одной челюсти двухслойного", priceRub: 1800, priceKopecks: 180000 },
			{ code804n: "A16.07.004.002", title: "Восстановление зуба коронкой постоянной", priceRub: 18500, priceKopecks: 1850000 },
		],
	},
	{
		id: "veneer",
		title: "Ортопедия (Винир керамический)",
		shortLabel: "Пакет: Винир керамический",
		badge: "Анестезия + Препарирование + Слепки + Фиксация винира",
		totalPriceRub: 28000,
		totalPriceKopecks: 2800000,
		services: [
			{ code804n: "A25.07.001", title: "Местная анестезия инфильтрационная", priceRub: 1200, priceKopecks: 120000 },
			{ code804n: "A16.07.003", title: "Препарирование зуба под эстетический винир", priceRub: 3000, priceKopecks: 300000 },
			{ code804n: "A02.07.010", title: "Снятие слепка с одной челюсти двухслойного", priceRub: 1800, priceKopecks: 180000 },
			{ code804n: "A16.07.003.001", title: "Восстановление зуба виниром цельнокерамическим", priceRub: 22000, priceKopecks: 2200000 },
		],
	},
	{
		id: "inlay",
		title: "Ортопедия (Вкладка керамическая)",
		shortLabel: "Пакет: Вкладка керамическая",
		badge: "Анестезия + Препарирование + Слепки + Фиксация вкладки",
		totalPriceRub: 22000,
		totalPriceKopecks: 2200000,
		services: [
			{ code804n: "A25.07.001", title: "Местная анестезия инфильтрационная", priceRub: 1200, priceKopecks: 120000 },
			{ code804n: "A16.07.004.001", title: "Препарирование полости под вкладку (inlay/onlay)", priceRub: 2500, priceKopecks: 250000 },
			{ code804n: "A02.07.010", title: "Снятие слепка с одной челюсти двухслойного", priceRub: 1800, priceKopecks: 180000 },
			{ code804n: "A16.07.004", title: "Восстановление зуба вкладкой ортопедической", priceRub: 16500, priceKopecks: 1650000 },
		],
	},
];

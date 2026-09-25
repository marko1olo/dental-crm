export interface ClinicalServiceBundle {
	id: string;
	title: string;
	shortLabel: string;
	badge: string;
	totalPriceRub: number;
	services: Array<{
		code804n: string;
		title: string;
		priceRub: number;
	}>;
}

export const CLINICAL_SERVICE_BUNDLES: readonly ClinicalServiceBundle[] = [
	{
		id: "caries",
		title: "Лечение кариеса",
		shortLabel: "Пакет: Лечение кариеса",
		badge: "Анестезия + Коффердам + Пломба",
		totalPriceRub: 7500,
		services: [
			{ code804n: "A25.07.001", title: "Местная анестезия (инфильтрационная/проводниковая)", priceRub: 1200 },
			{ code804n: "A16.07.051", title: "Изоляция рабочего поля (Коффердам/Раббердам)", priceRub: 800 },
			{ code804n: "A16.07.002.010", title: "Препарирование и медикаментозная обработка кариозной полости", priceRub: 1000 },
			{ code804n: "A16.07.002.011", title: "Восстановление зуба пломбой светового отверждения (композит)", priceRub: 4000 },
			{ code804n: "A16.07.002.012", title: "Шлифовка и полировка пломбы", priceRub: 500 },
		],
	},
	{
		id: "endo_1",
		title: "Эндодонтия (1-й этап)",
		shortLabel: "Пакет: Эндодонтия (1-й этап)",
		badge: "Анестезия + Коффердам + Экстирпация + Каналы + Временная пломба",
		totalPriceRub: 8800,
		services: [
			{ code804n: "A25.07.001", title: "Местная анестезия", priceRub: 1200 },
			{ code804n: "A16.07.051", title: "Изоляция рабочего поля (Коффердам)", priceRub: 800 },
			{ code804n: "A16.07.030.001", title: "Экстирпация пульпы (депульпирование)", priceRub: 2000 },
			{ code804n: "A16.07.030.002", title: "Механическая и медикаментозная обработка корневых каналов", priceRub: 3300 },
			{ code804n: "A16.07.030.004", title: "Временная обтурация каналов лечебной пастой / Временная пломба", priceRub: 1500 },
		],
	},
	{
		id: "hygiene",
		title: "Профгигиена",
		shortLabel: "Пакет: Профгигиена",
		badge: "УЗ-скейлинг + AirFlow + Полировка + Фторирование",
		totalPriceRub: 6500,
		services: [
			{ code804n: "A16.07.050.001", title: "Ультразвуковое удаление зубных отложений (скейлинг)", priceRub: 2500 },
			{ code804n: "A16.07.050.002", title: "Удаление пигментированного налета аппаратом Air-Flow", priceRub: 2200 },
			{ code804n: "A16.07.050.003", title: "Полировка всех зубов профессиональными абразивными пастами", priceRub: 800 },
			{ code804n: "A11.07.012", title: "Глубокое фторирование эмали (реминерализация)", priceRub: 1000 },
		],
	},
	{
		id: "surgery_extraction",
		title: "Удаление зуба",
		shortLabel: "Пакет: Удаление зуба",
		badge: "Анестезия + Удаление + Гемостаз",
		totalPriceRub: 5500,
		services: [
			{ code804n: "A25.07.001", title: "Местная анестезия", priceRub: 1200 },
			{ code804n: "A16.07.001.001", title: "Удаление постоянного зуба", priceRub: 3500 },
			{ code804n: "A16.07.001.002", title: "Остановка луночного кровотечения / местный гемостаз", priceRub: 800 },
		],
	},
];

/**
 * serviceCatalogData.ts — Канонический нормативный справочник услуг и быстрых клинических пакетов клиники.
 * Мандаты: 8b/8zi (Sweet Spot 280-350 строк), 8ap (чистый доменный язык), 8x (живой русский язык).
 */

export interface StandardCatalogService {
	readonly code: string;
	readonly serviceCode: string;
	readonly regulatoryCode?: string | undefined;
	readonly title: string;
	readonly category:
		| "diagnostics"
		| "anesthesia"
		| "therapy"
		| "endodontics"
		| "surgery"
		| "orthopedics"
		| "hygiene"
		| "orthodontics"
		| "consultation";
	readonly description?: string | undefined;
	readonly standardDurationMin?: number | undefined;
}

export interface ClinicalQuickBundleItem {
	readonly id: string;
	readonly serviceCode: string;
	readonly regulatoryCode?: string | undefined;
	readonly title: string;
	readonly category: string;
	readonly defaultPriceRub: number;
	readonly optional?: boolean | undefined;
	readonly defaultSelected?: boolean | undefined;
	readonly materials?: string | undefined;
}

export interface ClinicalQuickBundle {
	readonly id: string;
	readonly title: string;
	readonly shortTitle: string;
	readonly description: string;
	readonly category: "therapy" | "hygiene" | "surgery" | "orthopedics" | "implantation";
	readonly totalPriceRub: number;
	readonly requiresTooth: boolean;
	readonly defaultTooth?: number | undefined;
	readonly badgeColor: string;
	readonly items: readonly ClinicalQuickBundleItem[];
}

/**
 * STANDARD_SERVICE_CATALOG — Канонический эталонный каталог медицинских услуг частной стоматологии РФ.
 */
export const STANDARD_SERVICE_CATALOG: readonly StandardCatalogService[] = [
	// 1. Диагностика и консультации
	{ code: "B01.065.001", serviceCode: "B01.065.001", regulatoryCode: "B01.065.001", title: "Прием (осмотр, консультация) врача-стоматолога первичный", category: "consultation", standardDurationMin: 30 },
	{ code: "B01.065.002", serviceCode: "B01.065.002", regulatoryCode: "B01.065.002", title: "Прием (осмотр, консультация) врача-стоматолога повторный", category: "consultation", standardDurationMin: 20 },
	{ code: "A06.07.007", serviceCode: "A06.07.007", regulatoryCode: "A06.07.007", title: "Внутриротовая прицельная радиовизиография", category: "diagnostics", standardDurationMin: 10 },
	{ code: "A06.07.004", serviceCode: "A06.07.004", regulatoryCode: "A06.07.004", title: "Ортопантомография (панорамный снимок зубных рядов)", category: "diagnostics", standardDurationMin: 15 },
	{ code: "A06.07.013", serviceCode: "A06.07.013", regulatoryCode: "A06.07.013", title: "Компьютерная томография челюстно-лицевой области (КЛКТ)", category: "diagnostics", standardDurationMin: 20 },
	{ code: "A05.07.001", serviceCode: "A05.07.001", regulatoryCode: "A05.07.001", title: "Электроодонтометрия зуба (ЭОД)", category: "diagnostics", standardDurationMin: 15 },

	// 2. Местная анестезия
	{ code: "A11.07.011", serviceCode: "A11.07.011", regulatoryCode: "A11.07.011", title: "Аппликационная анестезия (гель/спрей)", category: "anesthesia", standardDurationMin: 5 },
	{ code: "A11.07.012", serviceCode: "A11.07.012", regulatoryCode: "A11.07.012", title: "Инфильтрационная анестезия (артикаин/ультракаин)", category: "anesthesia", standardDurationMin: 10 },
	{ code: "A11.07.013", serviceCode: "A11.07.013", regulatoryCode: "A11.07.013", title: "Проводниковая анестезия (торусальная / мандибулярная)", category: "anesthesia", standardDurationMin: 15 },
	{ code: "A11.07.014", serviceCode: "A11.07.014", regulatoryCode: "A11.07.014", title: "Интралигаментарная анестезия", category: "anesthesia", standardDurationMin: 10 },

	// 3. Терапия и реставрация
	{ code: "A16.07.002.001", serviceCode: "A16.07.002.001", regulatoryCode: "A16.07.002.001", title: "Наложение коффердама (раббердама) / Оптрагейт", category: "therapy", standardDurationMin: 10 },
	{ code: "A16.07.002", serviceCode: "A16.07.002", regulatoryCode: "A16.07.002", title: "Восстановление зуба пломбой (препарирование кариозной полости)", category: "therapy", standardDurationMin: 30 },
	{ code: "A16.07.002.010", serviceCode: "A16.07.002.010", regulatoryCode: "A16.07.002.010", title: "Восстановление зуба пломбой светоотверждаемым композитным материалом (Estelite / Filtek)", category: "therapy", standardDurationMin: 45 },
	{ code: "A16.07.002.011", serviceCode: "A16.07.002.011", regulatoryCode: "A16.07.002.011", title: "Шлифовка и полировка пломбы / реставрации микроабразивными дисками", category: "therapy", standardDurationMin: 15 },
	{ code: "A16.07.002.012", serviceCode: "A16.07.002.012", regulatoryCode: "A16.07.002.012", title: "Художественная эстетическая реставрация фронтального зуба", category: "therapy", standardDurationMin: 60 },
	{ code: "A16.07.002.002", serviceCode: "A16.07.002.002", regulatoryCode: "A16.07.002.002", title: "Наложение лечебной / изолирующей прокладки", category: "therapy", standardDurationMin: 10 },
	{ code: "A16.07.002.003", serviceCode: "A16.07.002.003", regulatoryCode: "A16.07.002.003", title: "Восстановление зуба стеклоиономерным цементом (Fuji IX / Ketac Molar)", category: "therapy", standardDurationMin: 30 },

	// 4. Эндодонтия
	{ code: "A16.07.030", serviceCode: "A16.07.030", regulatoryCode: "A16.07.030", title: "Инструментальная и медикаментозная обработка корневого канала (1 канал)", category: "endodontics", standardDurationMin: 40 },
	{ code: "A16.07.030.002", serviceCode: "A16.07.030.002", regulatoryCode: "A16.07.030.002", title: "Инструментальная и медикаментозная обработка корневых каналов (2 канала)", category: "endodontics", standardDurationMin: 60 },
	{ code: "A16.07.030.003", serviceCode: "A16.07.030.003", regulatoryCode: "A16.07.030.003", title: "Инструментальная и медикаментозная обработка корневых каналов (3 канала)", category: "endodontics", standardDurationMin: 80 },
	{ code: "A16.07.008", serviceCode: "A16.07.008", regulatoryCode: "A16.07.008", title: "Пломбирование корневого канала зуба гуттаперчей и силером (1 канал)", category: "endodontics", standardDurationMin: 30 },
	{ code: "A16.07.008.002", serviceCode: "A16.07.008.002", regulatoryCode: "A16.07.008.002", title: "Пломбирование корневых каналов зуба гуттаперчей и силером (2 канала)", category: "endodontics", standardDurationMin: 45 },
	{ code: "A16.07.008.003", serviceCode: "A16.07.008.003", regulatoryCode: "A16.07.008.003", title: "Пломбирование корневых каналов зуба гуттаперчей и силером (3 канала)", category: "endodontics", standardDurationMin: 60 },
	{ code: "A16.07.082", serviceCode: "A16.07.082", regulatoryCode: "A16.07.082", title: "Распломбировка корневого канала (паста, гуттаперча, фосфат-цемент)", category: "endodontics", standardDurationMin: 45 },
	{ code: "A16.07.094", serviceCode: "A16.07.094", regulatoryCode: "A16.07.094", title: "Извлечение фиксированного инородного тела (штифта, отломка инструмента) из канала", category: "endodontics", standardDurationMin: 60 },

	// 5. Хирургия и имплантация
	{ code: "A16.07.001", serviceCode: "A16.07.001", regulatoryCode: "A16.07.001", title: "Удаление зуба простое (щипцы, элеватор)", category: "surgery", standardDurationMin: 25 },
	{ code: "A16.07.001.002", serviceCode: "A16.07.001.002", regulatoryCode: "A16.07.001.002", title: "Удаление зуба сложное с разъединением корней и сепарацией", category: "surgery", standardDurationMin: 50 },
	{ code: "A16.07.024", serviceCode: "A16.07.024", regulatoryCode: "A16.07.024", title: "Удаление ретинированного, дистопированного или непрорезавшегося зуба", category: "surgery", standardDurationMin: 60 },
	{ code: "A16.07.039", serviceCode: "A16.07.039", regulatoryCode: "A16.07.039", title: "Кюретаж лунки удаленного зуба и пластика альвеолярного края", category: "surgery", standardDurationMin: 15 },
	{ code: "A16.07.095", serviceCode: "A16.07.095", regulatoryCode: "A16.07.095", title: "Остановка луночного кровотечения (первичный гемостаз)", category: "surgery", standardDurationMin: 15 },
	{ code: "A16.07.097", serviceCode: "A16.07.097", regulatoryCode: "A16.07.097", title: "Наложение хирургического шва (Vicryl / Prolene)", category: "surgery", standardDurationMin: 15 },
	{ code: "A16.07.019", serviceCode: "A16.07.019", regulatoryCode: "A16.07.019", title: "Вскрытие поднадкостничного очага воспаления (периостотомия)", category: "surgery", standardDurationMin: 30 },
	{ code: "A16.07.006", serviceCode: "A16.07.006", regulatoryCode: "A16.07.006", title: "Установка дентального имплантата (Osstem / Dentium / Straumann)", category: "surgery", standardDurationMin: 60 },
	{ code: "A16.07.006.002", serviceCode: "A16.07.006.002", regulatoryCode: "A16.07.006.002", title: "Установка титанового формирователя десны", category: "surgery", standardDurationMin: 20 },
	{ code: "A16.07.041", serviceCode: "A16.07.041", regulatoryCode: "A16.07.041", title: "Костная пластика челюстно-лицевой области (синус-лифтинг закрытый/открытый)", category: "surgery", standardDurationMin: 90 },

	// 6. Ортопедия и коронки
	{ code: "A16.07.004", serviceCode: "A16.07.004", regulatoryCode: "A16.07.004", title: "Препарирование зуба под искусственную коронку с уступом", category: "orthopedics", standardDurationMin: 45 },
	{ code: "A02.07.010", serviceCode: "A02.07.010", regulatoryCode: "A02.07.010", title: "Снятие прецизионного двухслойного слепка А-силиконом", category: "orthopedics", standardDurationMin: 20 },
	{ code: "A16.07.004.001", serviceCode: "A16.07.004.001", regulatoryCode: "A16.07.004.001", title: "Восстановление зуба металлокерамической коронкой", category: "orthopedics", standardDurationMin: 45 },
	{ code: "A16.07.004.002", serviceCode: "A16.07.004.002", regulatoryCode: "A16.07.004.002", title: "Восстановление зуба коронкой из диоксида циркония (Katana / Prettau)", category: "orthopedics", standardDurationMin: 45 },
	{ code: "A16.07.003", serviceCode: "A16.07.003", regulatoryCode: "A16.07.003", title: "Восстановление зуба керамическим виниром E.max", category: "orthopedics", standardDurationMin: 60 },
	{ code: "A16.07.004.004", serviceCode: "A16.07.004.004", regulatoryCode: "A16.07.004.004", title: "Изготовление и фиксация временной коронки прямым методом", category: "orthopedics", standardDurationMin: 30 },
	{ code: "A16.07.004.005", serviceCode: "A16.07.004.005", regulatoryCode: "A16.07.004.005", title: "Постоянная фиксация несъемного протеза на композитный / стеклоиономерный цемент", category: "orthopedics", standardDurationMin: 20 },

	// 7. Профгигиена и пародонтология
	{ code: "A16.07.020", serviceCode: "A16.07.020", regulatoryCode: "A16.07.020", title: "Ультразвуковое удаление наддесневых и поддесневых зубных отложений", category: "hygiene", standardDurationMin: 30 },
	{ code: "A16.07.051", serviceCode: "A16.07.051", regulatoryCode: "A16.07.051", title: "Профессиональная гигиена полости рта и зубов (Air-Flow порошком)", category: "hygiene", standardDurationMin: 30 },
	{ code: "A16.07.025", serviceCode: "A16.07.025", regulatoryCode: "A16.07.025", title: "Шлифовка и полировка зубов профессиональными абразивными пастами", category: "hygiene", standardDurationMin: 15 },
	{ code: "A11.07.024", serviceCode: "A11.07.024", regulatoryCode: "A11.07.024", title: "Местное применение реминерализующих препаратов (глубокое фторирование эмали)", category: "hygiene", standardDurationMin: 15 },
	{ code: "A16.07.011", serviceCode: "A16.07.011", regulatoryCode: "A16.07.011", title: "Закрытый кюретаж пародонтального кармана в области зуба", category: "hygiene", standardDurationMin: 20 },

	// 8. Ортодонтия
	{ code: "B01.066.001", serviceCode: "B01.066.001", regulatoryCode: "B01.066.001", title: "Прием (осмотр, консультация) врача-ортодонта первичный", category: "orthodontics", standardDurationMin: 40 },
	{ code: "A16.07.048", serviceCode: "A16.07.048", regulatoryCode: "A16.07.048", title: "Фиксация вестибулярной брекет-системы на одну челюсть", category: "orthodontics", standardDurationMin: 90 },
	{ code: "A16.07.047", serviceCode: "A16.07.047", regulatoryCode: "A16.07.047", title: "Активация съемного / несъемного ортодонтического аппарата (смена дуги/эластиков)", category: "orthodontics", standardDurationMin: 30 },
	{ code: "A16.07.049", serviceCode: "A16.07.049", regulatoryCode: "A16.07.049", title: "Изготовление и установка ортодонтической ретенционной каппы", category: "orthodontics", standardDurationMin: 30 },
];

/**
 * CLINICAL_QUICK_BUNDLES — Готовые клинические пакеты «Под ключ» в 1 клик для врача (Мандаты 8e, 8n).
 */
export const CLINICAL_QUICK_BUNDLES: readonly ClinicalQuickBundle[] = [
	{
		id: "caries_turnkey",
		title: "Лечение глубокого кариеса под ключ",
		shortTitle: "Кариес под ключ",
		description: "Полный протокол лечения кариеса: анестезия, коффердам, некрэктомия, пломба светового отверждения и полировка.",
		category: "therapy",
		totalPriceRub: 7500,
		requiresTooth: true,
		defaultTooth: 16,
		badgeColor: "emerald",
		items: [
			{ id: "anesthesia", serviceCode: "A11.07.012", regulatoryCode: "A11.07.012", title: "Инфильтрационная анестезия (Ультракаин / Убистезин)", category: "Анестезия", defaultPriceRub: 900, defaultSelected: true },
			{ id: "rubberdam", serviceCode: "A16.07.002.001", regulatoryCode: "A16.07.002.001", title: "Наложение коффердама (раббердама)", category: "Терапия", defaultPriceRub: 1200, defaultSelected: true },
			{ id: "necrectomy", serviceCode: "A16.07.002", regulatoryCode: "A16.07.002", title: "Препарирование и медобработка кариозной полости", category: "Терапия", defaultPriceRub: 1500, defaultSelected: true },
			{ id: "restoration", serviceCode: "A16.07.002.010", regulatoryCode: "A16.07.002.010", title: "Восстановление зуба светоотверждаемым композитом", category: "Терапия", defaultPriceRub: 3300, defaultSelected: true },
			{ id: "polishing", serviceCode: "A16.07.002.011", regulatoryCode: "A16.07.002.011", title: "Шлифовка и полировка пломбы микроабразивом", category: "Терапия", defaultPriceRub: 600, defaultSelected: true },
		],
	},
	{
		id: "hygiene_turnkey",
		title: "Комплексная профгигиена Air-Flow + ультразвук",
		shortTitle: "Профгигиена под ключ",
		description: "Комплексная гигиена: ультразвуковой скейлинг, воздушно-абразивный Air-Flow, полировка пастой и глубокое фторирование.",
		category: "hygiene",
		totalPriceRub: 6500,
		requiresTooth: false,
		badgeColor: "cyan",
		items: [
			{ id: "uz_scaling", serviceCode: "A16.07.020", regulatoryCode: "A16.07.020", title: "Ультразвуковое удаление зубных отложений (скейлинг)", category: "Гигиена", defaultPriceRub: 2500, defaultSelected: true },
			{ id: "airflow", serviceCode: "A16.07.051", regulatoryCode: "A16.07.051", title: "Профессиональная гигиена Air-Flow порошком", category: "Гигиена", defaultPriceRub: 2200, defaultSelected: true },
			{ id: "polishing", serviceCode: "A16.07.025", regulatoryCode: "A16.07.025", title: "Полировка зубов профессиональными пастами", category: "Гигиена", defaultPriceRub: 800, defaultSelected: true },
			{ id: "fluoridation", serviceCode: "A11.07.024", regulatoryCode: "A11.07.024", title: "Глубокое фторирование эмали и ремотерапия", category: "Гигиена", defaultPriceRub: 1000, defaultSelected: true },
		],
	},
	{
		id: "extraction_simple_turnkey",
		title: "Удаление зуба простое с анестезией под ключ",
		shortTitle: "Удаление простое под ключ",
		description: "Атравматичное простое удаление: анестезия, элевация, кюретаж, первичный гемостаз и антисептик Альвожиль.",
		category: "surgery",
		totalPriceRub: 6800,
		requiresTooth: true,
		defaultTooth: 38,
		badgeColor: "rose",
		items: [
			{ id: "anesthesia", serviceCode: "A11.07.012", regulatoryCode: "A11.07.012", title: "Местная анестезия (Ультракаин Д-С форте)", category: "Анестезия", defaultPriceRub: 900, defaultSelected: true },
			{ id: "extraction", serviceCode: "A16.07.001", regulatoryCode: "A16.07.001", title: "Удаление зуба простое / атравматичное", category: "Хирургия", defaultPriceRub: 3500, defaultSelected: true },
			{ id: "curettage", serviceCode: "A16.07.039", regulatoryCode: "A16.07.039", title: "Кюретаж лунки удаленного зуба", category: "Хирургия", defaultPriceRub: 900, defaultSelected: true },
			{ id: "hemostasis", serviceCode: "A16.07.095", regulatoryCode: "A16.07.095", title: "Остановка луночного кровотечения (первичный гемостаз)", category: "Хирургия", defaultPriceRub: 700, defaultSelected: true },
			{ id: "antiseptic", serviceCode: "A11.07.011", regulatoryCode: "A11.07.011", title: "Внесение антисептической пасты Альвожиль в лунку", category: "Хирургия", defaultPriceRub: 800, defaultSelected: true },
		],
	},
	{
		id: "extraction_complex_turnkey",
		title: "Удаление зуба сложное с анестезией под ключ",
		shortTitle: "Сложное удаление под ключ",
		description: "Операция сложного удаления: проводниковая анестезия, сепарация корней бором, кюретаж и швы Vicryl.",
		category: "surgery",
		totalPriceRub: 8500,
		requiresTooth: true,
		defaultTooth: 48,
		badgeColor: "rose",
		items: [
			{ id: "anesthesia", serviceCode: "A11.07.013", regulatoryCode: "A11.07.013", title: "Проводниковая анестезия", category: "Анестезия", defaultPriceRub: 900, defaultSelected: true },
			{ id: "root_separation", serviceCode: "A16.07.001.002", regulatoryCode: "A16.07.001.002", title: "Сложное удаление зуба с сепарацией корней", category: "Хирургия", defaultPriceRub: 5200, defaultSelected: true },
			{ id: "deep_curettage", serviceCode: "A16.07.039", regulatoryCode: "A16.07.039", title: "Кюретаж лунки зуба и санация грануляций", category: "Хирургия", defaultPriceRub: 1100, defaultSelected: true },
			{ id: "sutures", serviceCode: "A16.07.097", regulatoryCode: "A16.07.097", title: "Наложение хирургических швов Vicryl", category: "Хирургия", defaultPriceRub: 1300, defaultSelected: true },
		],
	},
	{
		id: "endo_turnkey",
		title: "Эндодонтия моляра под ключ (3 канала)",
		shortTitle: "Эндодонтия 3 канала под ключ",
		description: "Полный протокол эндодонтии 3 каналов: анестезия, коффердам, NiTi мехобработка, 3D обтурация и снимок.",
		category: "therapy",
		totalPriceRub: 16200,
		requiresTooth: true,
		defaultTooth: 46,
		badgeColor: "indigo",
		items: [
			{ id: "anesthesia", serviceCode: "A11.07.013", regulatoryCode: "A11.07.013", title: "Проводниковая анестезия", category: "Анестезия", defaultPriceRub: 900, defaultSelected: true },
			{ id: "rubberdam", serviceCode: "A16.07.002.001", regulatoryCode: "A16.07.002.001", title: "Наложение коффердама на моляр", category: "Терапия", defaultPriceRub: 1200, defaultSelected: true },
			{ id: "prep_3canals", serviceCode: "A16.07.030.003", regulatoryCode: "A16.07.030.003", title: "Механическая и медикаментозная обработка 3 каналов", category: "Эндодонтия", defaultPriceRub: 7500, defaultSelected: true },
			{ id: "obturation_3canals", serviceCode: "A16.07.008.003", regulatoryCode: "A16.07.008.003", title: "Пломбирование 3 каналов гуттаперчей и силером", category: "Эндодонтия", defaultPriceRub: 6000, defaultSelected: true },
			{ id: "xray_control", serviceCode: "A06.07.007", regulatoryCode: "A06.07.007", title: "Прицельная контрольная радиовизиография", category: "Диагностика", defaultPriceRub: 600, defaultSelected: true },
		],
	},
	{
		id: "implant_turnkey",
		title: "Дентальная имплантация под ключ",
		shortTitle: "Имплантация под ключ",
		description: "Хирургический этап: анестезия, подготовка ложа, установка имплантата и формирователя десны с рентген-контролем.",
		category: "implantation",
		totalPriceRub: 41500,
		requiresTooth: true,
		defaultTooth: 36,
		badgeColor: "amber",
		items: [
			{ id: "anesthesia", serviceCode: "A11.07.013", regulatoryCode: "A11.07.013", title: "Проводниковая / инфильтрационная анестезия", category: "Анестезия", defaultPriceRub: 900, defaultSelected: true },
			{ id: "implant_placement", serviceCode: "A16.07.006", regulatoryCode: "A16.07.006", title: "Установка дентального имплантата (Osstem TS-III / Dentium)", category: "Хирургия", defaultPriceRub: 35000, defaultSelected: true },
			{ id: "healing_abutment", serviceCode: "A16.07.006.002", regulatoryCode: "A16.07.006.002", title: "Установка титанового формирователя десны", category: "Хирургия", defaultPriceRub: 5000, defaultSelected: true },
			{ id: "xray_control", serviceCode: "A06.07.007", regulatoryCode: "A06.07.007", title: "Рентгенологический контроль позиционирования имплантата", category: "Диагностика", defaultPriceRub: 600, defaultSelected: true },
		],
	},
];

/**
 * Семантические алиасы и обратная совместимость (Мандат 8ap)
 */
export const standardServiceCatalog = STANDARD_SERVICE_CATALOG;

/** @deprecated use STANDARD_SERVICE_CATALOG or standardServiceCatalog (Мандат 8ap) */
export const STANDARD_804N_CATALOG = STANDARD_SERVICE_CATALOG;

/**
 * Быстрый поиск позиции по коду услуги
 */
export function findStandardServiceByCode(code: string): StandardCatalogService | undefined {
	const query = code.trim().toLowerCase();
	return STANDARD_SERVICE_CATALOG.find(
		(s) => s.serviceCode.toLowerCase() === query || s.code.toLowerCase() === query || (s.regulatoryCode && s.regulatoryCode.toLowerCase() === query),
	);
}

/**
 * Поиск в эталонном каталоге с фильтрацией по категории
 */
export function searchStandardServiceCatalog(
	query: string,
	category?: string,
): readonly StandardCatalogService[] {
	const norm = query.trim().toLowerCase();
	return STANDARD_SERVICE_CATALOG.filter((s) => {
		if (category && category !== "all" && s.category !== category) return false;
		if (!norm) return true;
		return (
			s.serviceCode.toLowerCase().includes(norm) ||
			s.title.toLowerCase().includes(norm) ||
			(s.regulatoryCode && s.regulatoryCode.toLowerCase().includes(norm))
		);
	});
}

/**
 * Получение быстрого клинического пакета по идентификатору
 */
export function getQuickClinicalBundle(bundleId: string): ClinicalQuickBundle | undefined {
	return CLINICAL_QUICK_BUNDLES.find((b) => b.id === bundleId);
}

/**
 * Развертывание клинического пакета в список отдельных услуг
 */
export function expandBundleToServices(
	bundleId: string,
	toothNumber?: number,
): readonly ClinicalQuickBundleItem[] {
	const bundle = getQuickClinicalBundle(bundleId);
	if (!bundle) return [];
	const toothPrefix = toothNumber && bundle.requiresTooth ? `[Зуб ${toothNumber}] ` : "";
	return bundle.items.map((it) => ({
		...it,
		title: `${toothPrefix}${it.title}`,
	}));
}

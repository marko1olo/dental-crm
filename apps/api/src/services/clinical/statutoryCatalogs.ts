/**
 * statutoryCatalogs.ts — Регламентированные справочники стоматологической клиники РФ.
 * 
 * Соответствует:
 * - Приказу Минздрава РФ № 804н (Номенклатура медицинских услуг)
 * - МКБ-10 (Класс XI: Болезни органов пищеварения K00–K14, Z01.2)
 * - Приказу Минздрава РФ № 834н (Форма 043/у — протоколы амбулаторных приемов)
 * - Мандату 8i: Суверенитет амбулаторного стоматологического контекста
 * - Мандату 8e: Автономия врача (1-клик шаблоны, мгновенная норма)
 */

import type { DentalSpecialty, ServiceCategory } from "@dental/shared";

export interface Baseline804nServiceDefinition {
	readonly code: string;
	readonly title: string;
	readonly category: ServiceCategory;
	readonly specialty: DentalSpecialty;
	readonly basePriceRub: number;
	readonly basePriceKopecks: number;
	readonly durationMinutes: number;
	readonly taxDeductible: boolean;
	readonly active: boolean;
}

export interface Statutory804nItem {
	readonly code: string;
	readonly name: string;
	readonly category: string;
	readonly defaultPriceRub: number;
	readonly defaultPriceKopecks: number;
	readonly isBaseDmsCovered?: boolean;
	readonly requiresToothNumber?: boolean;
	readonly requiresXrayProof?: boolean;
}

export interface StatutoryIcd10Item {
	readonly code: string;
	readonly label: string;
	readonly group: string;
	readonly requiresTooth?: boolean;
}

export interface StatutoryEmrTemplateItem {
	readonly id: string;
	readonly title: string;
	readonly shortTitle: string;
	readonly category: string;
	readonly icd10Code: string;
	readonly icd10Title: string;
	readonly defaultSubjectiveComplaints: string;
	readonly defaultAnamnesisMorbi: string;
	readonly defaultObjectiveStatus: string;
	readonly defaultProcedureProtocol: string;
	readonly defaultRecommendations: string;
}

/**
 * 1. НОМЕНКЛАТУРА МЕДИЦИНСКИХ УСЛУГ (ПРИКАЗ МИНЗДРАВА РФ № 804Н)
 */
export const STATUTORY_804N_CATALOG: readonly Statutory804nItem[] = [
	// Терапия и кариесология
	{
		code: "A16.07.002.001",
		name: "Восстановление зуба пломбой I, V, VI класс по Блэку (светоотверждаемый композит)",
		category: "therapy",
		defaultPriceRub: 3800,
		defaultPriceKopecks: 380000,
		isBaseDmsCovered: true,
		requiresToothNumber: true,
		requiresXrayProof: false,
	},
	{
		code: "A16.07.002.002",
		name: "Восстановление зуба пломбой II, III класс по Блэку (лечение глубокого кариеса)",
		category: "therapy",
		defaultPriceRub: 4500,
		defaultPriceKopecks: 450000,
		isBaseDmsCovered: true,
		requiresToothNumber: true,
		requiresXrayProof: false,
	},
	{
		code: "A16.07.002.003",
		name: "Восстановление зуба пломбой IV класс по Блэку (реставрация фронтальной группы)",
		category: "therapy",
		defaultPriceRub: 5600,
		defaultPriceKopecks: 560000,
		isBaseDmsCovered: true,
		requiresToothNumber: true,
		requiresXrayProof: false,
	},
	{
		code: "A16.07.002.005",
		name: "Наложение пломбы при клиновидных дефектах и эрозии эмали (светоотверждаемый композит)",
		category: "therapy",
		defaultPriceRub: 3800,
		defaultPriceKopecks: 380000,
		isBaseDmsCovered: true,
		requiresToothNumber: true,
		requiresXrayProof: false,
	},
	{
		code: "A16.07.003",
		name: "Восстановление зуба пломбировочными материалами с использованием штифта (Build-up)",
		category: "therapy",
		defaultPriceRub: 4500,
		defaultPriceKopecks: 450000,
		isBaseDmsCovered: true,
		requiresToothNumber: true,
		requiresXrayProof: true,
	},
	{
		code: "A16.07.030.001",
		name: "Инструментальная и медикаментозная обработка 1 корневого канала",
		category: "therapy",
		defaultPriceRub: 2100,
		defaultPriceKopecks: 210000,
		isBaseDmsCovered: true,
		requiresToothNumber: true,
		requiresXrayProof: true,
	},
	{
		code: "A16.07.030.002",
		name: "Инструментальная и медикаментозная обработка 2 корневых каналов",
		category: "therapy",
		defaultPriceRub: 3800,
		defaultPriceKopecks: 380000,
		isBaseDmsCovered: true,
		requiresToothNumber: true,
		requiresXrayProof: true,
	},
	{
		code: "A16.07.030.003",
		name: "Инструментальная и медикаментозная обработка 3 корневых каналов",
		category: "therapy",
		defaultPriceRub: 5200,
		defaultPriceKopecks: 520000,
		isBaseDmsCovered: true,
		requiresToothNumber: true,
		requiresXrayProof: true,
	},
	{
		code: "A16.07.008.002",
		name: "Пломбирование корневого канала зуба гуттаперчевыми штифтами (1 канал)",
		category: "therapy",
		defaultPriceRub: 2400,
		defaultPriceKopecks: 240000,
		isBaseDmsCovered: true,
		requiresToothNumber: true,
		requiresXrayProof: true,
	},
	{
		code: "A16.07.008.003",
		name: "Пломбирование 3 корневых каналов зуба гуттаперчевыми штифтами",
		category: "therapy",
		defaultPriceRub: 6000,
		defaultPriceKopecks: 600000,
		isBaseDmsCovered: true,
		requiresToothNumber: true,
		requiresXrayProof: true,
	},
	{
		code: "A16.07.004",
		name: "Наложение девитализирующей пасты (неотложная помощь при пульпите)",
		category: "therapy",
		defaultPriceRub: 1500,
		defaultPriceKopecks: 150000,
		isBaseDmsCovered: true,
		requiresToothNumber: true,
		requiresXrayProof: false,
	},
	{
		code: "A11.07.010",
		name: "Инъекционное введение анестетика (инфильтрационная / проводниковая анестезия)",
		category: "anesthesia",
		defaultPriceRub: 950,
		defaultPriceKopecks: 95000,
		isBaseDmsCovered: true,
		requiresToothNumber: false,
		requiresXrayProof: false,
	},
	// Хирургия и имплантология
	{
		code: "A16.07.001.001",
		name: "Удаление временного зуба",
		category: "surgery",
		defaultPriceRub: 1800,
		defaultPriceKopecks: 180000,
		isBaseDmsCovered: true,
		requiresToothNumber: true,
		requiresXrayProof: false,
	},
	{
		code: "A16.07.001.002",
		name: "Удаление постоянного зуба простое",
		category: "surgery",
		defaultPriceRub: 3200,
		defaultPriceKopecks: 320000,
		isBaseDmsCovered: true,
		requiresToothNumber: true,
		requiresXrayProof: false,
	},
	{
		code: "A16.07.001.003",
		name: "Удаление зуба сложное с разъединением корней",
		category: "surgery",
		defaultPriceRub: 5500,
		defaultPriceKopecks: 550000,
		isBaseDmsCovered: true,
		requiresToothNumber: true,
		requiresXrayProof: true,
	},
	{
		code: "A16.07.024",
		name: "Операция удаления ретинированного, дистопированного зуба",
		category: "surgery",
		defaultPriceRub: 8500,
		defaultPriceKopecks: 850000,
		isBaseDmsCovered: false,
		requiresToothNumber: true,
		requiresXrayProof: true,
	},
	{
		code: "A16.07.011",
		name: "Вскрытие поднадкостничного очага воспаления (периостотомия с дренированием)",
		category: "surgery",
		defaultPriceRub: 2500,
		defaultPriceKopecks: 250000,
		isBaseDmsCovered: true,
		requiresToothNumber: true,
		requiresXrayProof: false,
	},
	{
		code: "A16.07.006",
		name: "Вскрытие поднадкостничного очага воспаления (периостотомия)",
		category: "surgery",
		defaultPriceRub: 2500,
		defaultPriceKopecks: 250000,
		isBaseDmsCovered: true,
		requiresToothNumber: true,
		requiresXrayProof: false,
	},
	{
		code: "A16.07.007",
		name: "Резекция верхушки корня",
		category: "surgery",
		defaultPriceRub: 7500,
		defaultPriceKopecks: 750000,
		isBaseDmsCovered: false,
		requiresToothNumber: true,
		requiresXrayProof: true,
	},
	{
		code: "A16.07.054.001",
		name: "Внутрикостная дентальная имплантация (установка имплантата)",
		category: "surgery",
		defaultPriceRub: 35000,
		defaultPriceKopecks: 3500000,
		isBaseDmsCovered: false,
		requiresToothNumber: true,
		requiresXrayProof: true,
	},
	{
		code: "A16.07.041",
		name: "Костная пластика челюстно-лицевой области (аугментация кости)",
		category: "surgery",
		defaultPriceRub: 28000,
		defaultPriceKopecks: 2800000,
		isBaseDmsCovered: false,
		requiresToothNumber: true,
		requiresXrayProof: true,
	},
	{
		code: "A16.07.055",
		name: "Синус-лифтинг (субантральная аугментация)",
		category: "surgery",
		defaultPriceRub: 32000,
		defaultPriceKopecks: 3200000,
		isBaseDmsCovered: false,
		requiresToothNumber: true,
		requiresXrayProof: true,
	},
	// Гигиена и профилактика
	{
		code: "A16.07.051",
		name: "Профессиональная гигиена полости рта и зубов (комплекс: УЗ-скейлинг + AirFlow + полировка)",
		category: "hygiene",
		defaultPriceRub: 4500,
		defaultPriceKopecks: 450000,
		isBaseDmsCovered: true,
		requiresToothNumber: false,
		requiresXrayProof: false,
	},
	{
		code: "A16.07.051.001",
		name: "Ультразвуковое удаление наддесневых и поддесневых зубных отложений в области зуба / челюсти",
		category: "hygiene",
		defaultPriceRub: 3800,
		defaultPriceKopecks: 380000,
		isBaseDmsCovered: true,
		requiresToothNumber: false,
		requiresXrayProof: false,
	},
	{
		code: "A16.07.050",
		name: "Профессиональное отбеливание зубов клиническое (холодным светом / лазерное)",
		category: "hygiene",
		defaultPriceRub: 18000,
		defaultPriceKopecks: 1800000,
		isBaseDmsCovered: false,
		requiresToothNumber: false,
		requiresXrayProof: false,
	},
	// Пародонтология
	{
		code: "A16.07.019",
		name: "Временное шинирование при заболеваниях пародонта (1 челюсть)",
		category: "periodontics",
		defaultPriceRub: 7200,
		defaultPriceKopecks: 720000,
		isBaseDmsCovered: false,
		requiresToothNumber: false,
		requiresXrayProof: true,
	},
	{
		code: "A16.07.039",
		name: "Закрытый кюретаж пародонтальных карманов в области 1 зуба",
		category: "periodontics",
		defaultPriceRub: 900,
		defaultPriceKopecks: 90000,
		isBaseDmsCovered: true,
		requiresToothNumber: true,
		requiresXrayProof: true,
	},
	// Ортопедия
	{
		code: "A16.07.004.001",
		name: "Восстановление зуба коронкой металлокерамической",
		category: "orthopedics",
		defaultPriceRub: 14500,
		defaultPriceKopecks: 1450000,
		isBaseDmsCovered: false,
		requiresToothNumber: true,
		requiresXrayProof: true,
	},
	{
		code: "A16.07.004.002",
		name: "Восстановление зуба коронкой безметалловой (диоксид циркония / E.max)",
		category: "orthopedics",
		defaultPriceRub: 24000,
		defaultPriceKopecks: 2400000,
		isBaseDmsCovered: false,
		requiresToothNumber: true,
		requiresXrayProof: true,
	},
	{
		code: "A16.07.006.004",
		name: "Восстановление зуба коронкой из диоксида циркония с винтовой фиксацией на имплантате",
		category: "orthopedics",
		defaultPriceRub: 26000,
		defaultPriceKopecks: 2600000,
		isBaseDmsCovered: false,
		requiresToothNumber: true,
		requiresXrayProof: true,
	},
	{
		code: "A16.07.006.005",
		name: "Протезирование коронкой на имплантате с индивидуальным абатментом (Ti-Base / Zirconia)",
		category: "orthopedics",
		defaultPriceRub: 34000,
		defaultPriceKopecks: 3400000,
		isBaseDmsCovered: false,
		requiresToothNumber: true,
		requiresXrayProof: true,
	},
	{
		code: "A16.07.005",
		name: "Восстановление целостности зубного ряда несъемным мостовидным протезом",
		category: "orthopedics",
		defaultPriceRub: 38000,
		defaultPriceKopecks: 3800000,
		isBaseDmsCovered: false,
		requiresToothNumber: true,
		requiresXrayProof: true,
	},
	{
		code: "A16.07.023",
		name: "Протезирование частичными съемными пластиночными протезами",
		category: "orthopedics",
		defaultPriceRub: 22000,
		defaultPriceKopecks: 2200000,
		isBaseDmsCovered: false,
		requiresToothNumber: false,
		requiresXrayProof: true,
	},
	{
		code: "A16.07.035",
		name: "Протезирование съемными бюгельными протезами с кламмерной фиксацией",
		category: "orthopedics",
		defaultPriceRub: 36000,
		defaultPriceKopecks: 3600000,
		isBaseDmsCovered: false,
		requiresToothNumber: false,
		requiresXrayProof: true,
	},
	// Ортодонтия
	{
		code: "A16.07.048",
		name: "Ортодонтическая коррекция с применением брекет-системы (1 челюсть)",
		category: "orthodontics",
		defaultPriceRub: 45000,
		defaultPriceKopecks: 4500000,
		isBaseDmsCovered: false,
		requiresToothNumber: false,
		requiresXrayProof: true,
	},
	{
		code: "A16.07.047",
		name: "Ортодонтическая коррекция с применением съемного аппарата (пластинки)",
		category: "orthodontics",
		defaultPriceRub: 16000,
		defaultPriceKopecks: 1600000,
		isBaseDmsCovered: false,
		requiresToothNumber: false,
		requiresXrayProof: false,
	},
	// Рентгенология
	{
		code: "A06.07.003",
		name: "Прицельная внутриротовая контактная радиовизиография",
		category: "radiology",
		defaultPriceRub: 650,
		defaultPriceKopecks: 65000,
		isBaseDmsCovered: true,
		requiresToothNumber: true,
		requiresXrayProof: false,
	},
	{
		code: "A06.07.004",
		name: "Ортопантомография челюстей (панорамный снимок ОПТГ)",
		category: "radiology",
		defaultPriceRub: 1400,
		defaultPriceKopecks: 140000,
		isBaseDmsCovered: true,
		requiresToothNumber: false,
		requiresXrayProof: false,
	},
	{
		code: "A06.07.013",
		name: "Компьютерная 3D томография челюстно-лицевой области (КЛКТ)",
		category: "radiology",
		defaultPriceRub: 3200,
		defaultPriceKopecks: 320000,
		isBaseDmsCovered: false,
		requiresToothNumber: false,
		requiresXrayProof: false,
	},
	// Консультации и приемы
	{
		code: "B01.065.001",
		name: "Прием (осмотр, консультация) врача-стоматолога-терапевта первичный",
		category: "consultation",
		defaultPriceRub: 1000,
		defaultPriceKopecks: 100000,
		isBaseDmsCovered: true,
		requiresToothNumber: false,
		requiresXrayProof: false,
	},
	{
		code: "B01.066.001",
		name: "Прием (осмотр, консультация) врача-стоматолога-хирурга первичный",
		category: "consultation",
		defaultPriceRub: 1000,
		defaultPriceKopecks: 100000,
		isBaseDmsCovered: true,
		requiresToothNumber: false,
		requiresXrayProof: false,
	},
	{
		code: "B01.067.001",
		name: "Прием (осмотр, консультация) врача-стоматолога-ортопеда первичный",
		category: "consultation",
		defaultPriceRub: 1000,
		defaultPriceKopecks: 100000,
		isBaseDmsCovered: true,
		requiresToothNumber: false,
		requiresXrayProof: false,
	},
	{
		code: "B01.063.001",
		name: "Прием (осмотр, консультация) врача-ортодонта первичный",
		category: "consultation",
		defaultPriceRub: 1500,
		defaultPriceKopecks: 150000,
		isBaseDmsCovered: false,
		requiresToothNumber: false,
		requiresXrayProof: false,
	},
	{
		code: "B01.064.001",
		name: "Прием (осмотр, консультация) врача-детского стоматолога первичный",
		category: "consultation",
		defaultPriceRub: 1000,
		defaultPriceKopecks: 100000,
		isBaseDmsCovered: true,
		requiresToothNumber: false,
		requiresXrayProof: false,
	},
];

/**
 * 2. КЛИНИЧЕСКИЙ СПРАВОЧНИК ДИАГНОЗОВ МКБ-10 (СТОМАТОЛОГИЯ)
 */
export const STATUTORY_DENTAL_ICD10: readonly StatutoryIcd10Item[] = [
	// Кариес K02
	{ code: "K02.0", label: "Кариес эмали (в стадии пятна / поверхностный)", group: "Кариес", requiresTooth: true },
	{ code: "K02.1", label: "Кариес дентина (средний / глубокий)", group: "Кариес", requiresTooth: true },
	{ code: "K02.2", label: "Кариес цемента корня", group: "Кариес", requiresTooth: true },
	{ code: "K02.3", label: "Приостановившийся кариес зубов", group: "Кариес", requiresTooth: true },
	{ code: "K02.8", label: "Другой уточненный кариес зубов", group: "Кариес", requiresTooth: true },
	// Пульпа и периапикал K04
	{ code: "K04.0", label: "Пульпит (острый / хронический)", group: "Пульпа", requiresTooth: true },
	{ code: "K04.01", label: "Начальный (гиперемия) пульпит", group: "Пульпа", requiresTooth: true },
	{ code: "K04.1", label: "Некроз пульпы (гангрена пульпы)", group: "Пульпа", requiresTooth: true },
	{ code: "K04.2", label: "Дегенерация пульпы (дентиклы, пульпарные кальцификаты)", group: "Пульпа", requiresTooth: true },
	{ code: "K04.3", label: "Неправильное формирование твердых тканей в пульпе", group: "Пульпа", requiresTooth: true },
	{ code: "K04.4", label: "Острый апикальный периодонтит пульпарного происхождения", group: "Периапикал", requiresTooth: true },
	{ code: "K04.5", label: "Хронический апикальный периодонтит (гранулирующий / гранулематозный)", group: "Периапикал", requiresTooth: true },
	{ code: "K04.6", label: "Периапикальный абсцесс со свищом", group: "Периапикал", requiresTooth: true },
	{ code: "K04.7", label: "Периапикальный абсцесс без свища", group: "Периапикал", requiresTooth: true },
	{ code: "K04.8", label: "Корневая киста (периапикальная гранулема/киста)", group: "Периапикал", requiresTooth: true },
	// Пародонт K05
	{ code: "K05.0", label: "Острый гингивит (катаральный / язвенный)", group: "Пародонт", requiresTooth: false },
	{ code: "K05.1", label: "Хронический гингивит", group: "Пародонт", requiresTooth: false },
	{ code: "K05.2", label: "Острый пародонтит", group: "Пародонт", requiresTooth: false },
	{ code: "K05.3", label: "Хронический пародонтит (легкий / среднетяжелый / тяжелый)", group: "Пародонт", requiresTooth: false },
	{ code: "K05.4", label: "Пародонтоз", group: "Пародонт", requiresTooth: false },
	// Некариозные поражения K03
	{ code: "K03.0", label: "Повышенное стирание зубов (патологическая стираемость)", group: "Другие болезни зубов", requiresTooth: false },
	{ code: "K03.1", label: "Сошлифовывание зубов (клиновидный дефект)", group: "Другие болезни зубов", requiresTooth: true },
	{ code: "K03.2", label: "Эрозия зубов", group: "Другие болезни зубов", requiresTooth: false },
	{ code: "K03.3", label: "Патологическая резорбция корня зуба", group: "Другие болезни зубов", requiresTooth: true },
	{ code: "K03.6", label: "Отложения на зубах (зубной камень, налет)", group: "Другие болезни зубов", requiresTooth: false },
	// Развитие и прорезывание K00, K01
	{ code: "K00.0", label: "Адентия (полная / частичная гиподонтия)", group: "Развитие зубов", requiresTooth: false },
	{ code: "K01.0", label: "Вкрапленные зубы", group: "Хирургия", requiresTooth: true },
	{ code: "K01.1", label: "Ретинированный зуб (дистопия третьего моляра)", group: "Хирургия", requiresTooth: true },
	// Челюсти и аномалии K07, K08
	{ code: "K07.3", label: "Аномалии положения зубов (скученность, тортоаномалия)", group: "Ортодонтия", requiresTooth: false },
	{ code: "K07.4", label: "Аномалии прикуса неуточненные (дистальный, мезиальный прикус)", group: "Ортодонтия", requiresTooth: false },
	{ code: "K08.1", label: "Потеря зубов вследствие несчастного случая, удаления или локальной болезни", group: "Хирургия/Ортопедия", requiresTooth: true },
	{ code: "K08.2", label: "Атрофия беззубого альвеолярного края", group: "Хирургия/Ортопедия", requiresTooth: false },
	{ code: "K08.8", label: "Другие уточненные изменения зубов (несостоятельность пломбы / реставрации)", group: "Терапия", requiresTooth: true },
	// Профилактика Z01.2
	{ code: "Z01.2", label: "Стоматологическое обследование и санация полости рта (профосмотр)", group: "Профилактика", requiresTooth: false },
];

/**
 * 3. ШАБЛОНЫ КЛИНИЧЕСКИХ ДНЕВНИКОВ ЭМК (043/У)
 */
export const STATUTORY_EMR_TEMPLATES: readonly StatutoryEmrTemplateItem[] = [
	{
		id: "caries_dentine",
		title: "Кариес дентина (K02.1) — Светоотверждаемый композит",
		shortTitle: "Кариес дентина",
		category: "therapy",
		icd10Code: "K02.1",
		icd10Title: "Кариес дентина",
		defaultSubjectiveComplaints: "Жалобы на кратковременные боли от температурных и химических раздражителей (холодное, сладкое), быстро проходящие после устранения раздражителя. Застревание пищи.",
		defaultAnamnesisMorbi: "Дефект твердых тканей зуба обнаружен пациентом около 1–2 месяцев назад. Ранее зуб не лечен.",
		defaultObjectiveStatus: "На жевательной/контактной поверхности глубокая кариозная полость, выполненная пигментированным размягченным дентином. Зондирование дна безболезненное, по стенкам слабо чувствительное. Перкуссия безболезненная. Термопроба кратковременно положительная, проходит сразу после прекращения действия холода. ЭОД 4–6 мкА.",
		defaultProcedureProtocol: "1. Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.0 мл.\n2. Препарирование кариозной полости с некрэктомией под водно-воздушным охлаждением.\n3. Изоляция операционного поля коффердамом.\n4. Медикаментозная обработка 2% р-ром хлоргексидина.\n5. Тотальное травление эмали 37% ортофосфорной кислотой 15 сек, дентина 10 сек.\n6. Внесение самопротравливающего праймера и адгезива V поколения, полимеризация 20 сек.\n7. Послойная реставрация наногибридным композитом светового отверждения с моделированием анатомической формы бугров и фиссур.\n8. Шлифовка, полировка алмазными борами и полировочными дисками/пастами. Окклюзионный контроль артикуляционной бумагой 40 мкм.",
		defaultRecommendations: "Щадящая диета в течение 2 часов, соблюдение гигиены полости рта. Контрольный осмотр через 6 месяцев.",
	},
	{
		id: "acute_pulpitis",
		title: "Острый пульпит (K04.0) — Экстирпация и эндодонтия",
		shortTitle: "Пульпит (1 посещение)",
		category: "endodontics",
		icd10Code: "K04.0",
		icd10Title: "Пульпит",
		defaultSubjectiveComplaints: "Жалобы на острые приступообразные самопроизвольные боли, усиливающиеся в ночное время, иррадиирующие по ходу ветвей тройничного нерва. Длительная боль от холодного и горячего.",
		defaultAnamnesisMorbi: "Боли появились 2 суток назад, усилились прошедшей ночью. Прием анальгетиков дает кратковременный эффект.",
		defaultObjectiveStatus: "Глубокая кариозная полость, сообщающаяся с полостью зуба в одной точке. Зондирование вскрытой точки резко болезненное, сопровождается кровоточивостью. Перкуссия слабочувствительная / отрицательная. Термопроба вызывает резкую длительную боль (более 1 минуты). ЭОД 25–40 мкА.",
		defaultProcedureProtocol: "1. Проводниковая / инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл.\n2. Изоляция коффердамом.\n3. Раскрытие полости зуба, ампутация и экстирпация пульпы.\n4. Определение рабочей длины корневых каналов апекслокатором с рентген-контролем RVG.\n5. Инструментальная обработка каналов машинными Ni-Ti файлами с обильной ирригацией 3% гипохлоритом натрия и 17% ЭДТА, ультразвуковая активация.\n6. Высушивание бумажными штифтами.\n7. Обтурация каналов методом латеральной компакции гуттаперчи с эпоксидным силером.\n8. Рентген-контроль обтурации: каналы запломбированы плотно, гомогенно до физиологического апекса.\n9. Временная герметичная повязка.",
		defaultRecommendations: "При возникновении боли прием НПВП (Ибупрофен 400 мг / Кеторол 1 таб). Не жевать на стороне лечения. Явка на постоянное восстановление через 2-3 дня.",
	},
	{
		id: "tooth_extraction",
		title: "Удаление постоянного зуба (K08.1) — Хирургический протокол",
		shortTitle: "Удаление зуба",
		category: "surgery",
		icd10Code: "K08.1",
		icd10Title: "Потеря зубов вследствие удаления",
		defaultSubjectiveComplaints: "Жалобы на подвижность зуба, невозможность накусывания, разрушение коронковой части зуба ниже уровня десны.",
		defaultAnamnesisMorbi: "Зуб неоднократно лечен эндодонтически, произошел продольный раскол корня / хронический периодонтит с резорбцией кости более 2/3 длины корня.",
		defaultObjectiveStatus: "Коронковая часть разрушена ниже уровня десны. Десна вокруг зуба пастозна, гиперемирована. На прицельном снимке RVG: деструкция костной ткани в области фуркации и верхушек корней, продольная трещина корня.",
		defaultProcedureProtocol: "1. Инфильтрационная и проводниковая анестезия Sol. Articaini 4% — 1.7 мл.\n2. Синдесмотомия циркулярной связки зуба распатором.\n3. Наложение щипцов, люксация элеватором, аккуратная тракция без повреждения кортикальной пластинки альвеолы.\n4. Ревизия и кюретаж лунки, удаление грануляционной ткани.\n5. Гемостаз: формирование стабильного кровяного сгустка, внесение гемостатической губки с коллагеном.\n6. Сближение краев лунки, наложение узлового шва нитью Vicryl 4-0.\n7. Контроль гемостаза достигнут.",
		defaultRecommendations: "Марлевый тампон сплюнуть через 20 минут. Не принимать пищу 2 часа, не полоскать рот 24 часа. Холод на щеку 3 раза по 15 мин с интервалом 20 мин. Исключить бани, сауны, алкоголь и тяжелые нагрузки на 3 дня. При болях — Нимесулид 100 мг / Ибупрофен 400 мг.",
	},
	{
		id: "prophy_hygiene",
		title: "Профессиональная гигиена полости рта (Z01.2) — УЗ + AirFlow",
		shortTitle: "Профгигиена полости рта",
		category: "hygiene",
		icd10Code: "Z01.2",
		icd10Title: "Стоматологическое обследование",
		defaultSubjectiveComplaints: "Жалобы на наличие пигментированного зубного налета от чая/кофе, шероховатость зубов, кровоточивость десен при чистке.",
		defaultAnamnesisMorbi: "Последняя профгигиена проводилась более 1 года назад.",
		defaultObjectiveStatus: "Обильный над- и поддесневой зубной камень во фронтальном отделе нижней челюсти, пигментированный налет курильщика на оральных поверхностях зубов. Десневые сосочки отечны, гиперемированы, кровоточат при зондировании.",
		defaultProcedureProtocol: "1. Аппликационная анестезия десны Лидокаин спрей 10%.\n2. Снятие твердых над- и поддесневых зубных отложений ультразвуковым скейлером с водяным охлаждением.\n3. Снятие плотного пигментированного налета аппаратом Air-Flow мелкодисперсным порошком на основе глицина.\n4. Полировка всех поверхностей зубов пастами различной абразивности и циркулярными щеточками.\n5. Обработка межзубных промежутков флоссом и штрипсами.\n6. Медикаментозная обработка десневого края 0.05% р-ром хлоргексидина.\n7. Глубокое фторирование эмали фторсодержащим лаком / гелем.",
		defaultRecommendations: "Замена зубной щетки на новую. Не употреблять красящие продукты и напитки (кофе, чай, ягоды, свекла, красное вино) и не курить в течение 48 часов («белая диета»). Повторная гигиена через 6 месяцев.",
	},
	{
		id: "prophy_exam_normal",
		title: "Профилактический осмотр: Полость рта санирована / Здоров (Z01.2)",
		shortTitle: "Санирован / Здоров (1 клик)",
		category: "preventive",
		icd10Code: "Z01.2",
		icd10Title: "Стоматологическое обследование (Здоров)",
		defaultSubjectiveComplaints: "Жалоб нет. Обратился для планового профилактического осмотра.",
		defaultAnamnesisMorbi: "Соматически здоров. Аллергологический анамнез не отягощен. Регулярно проходит профилактические осмотры.",
		defaultObjectiveStatus: "Слизистая оболочка полости рта бледно-розового цвета, умеренно увлажнена, без патологических элементов. Десна бледно-розовая, плотно охватывает шейки зубов, при зондировании не кровоточит. Зубные ряды интактные, прикус физиологический (ортогнатический). Пломбы состоятельны, краевое прилегание сохранено. Кариозных полостей не обнаружено. Патологической подвижности зубов нет. Гигиенический индекс OHI-S = 0.6 (хороший).",
		defaultProcedureProtocol: "Проведен профилактический осмотр, зондирование, перкуссия, холодовой тест индифферентен. Обучение гигиене полости рта, индивидуальный подбор средств гигиены.",
		defaultRecommendations: "Полость рта санирована. Плановый осмотр через 6 месяцев. Поддерживать индивидуальную гигиену.",
	},
	{
		id: "implant_crown_zirconia",
		title: "Коронка из диоксида циркония на имплантате (K08.1) — Винтовая фиксация",
		shortTitle: "Коронка на имплантате",
		category: "orthopedics",
		icd10Code: "K08.1",
		icd10Title: "Потеря зубов вследствие удаления",
		defaultSubjectiveComplaints: "Жалоб нет. Обратился для планового протезирования после успешной остеоинтеграции дентального имплантата.",
		defaultAnamnesisMorbi: "Ранее проведена операция внутрикостной дентальной имплантации. Формирователь десны состоятелен, послеоперационный период протекал без осложнений.",
		defaultObjectiveStatus: "Слизистая оболочка вокруг формирователя десны бледно-розовая, плотная, признаки периимплантита отсутствуют. Сформирована эстетическая десневая манжета. На RVG-снимке: костная ткань вокруг витков имплантата стабильна, резорбция отсутствует.",
		defaultProcedureProtocol: "1. Антисептическая обработка полости рта 0.05% р-ром хлоргексидина.\n2. Демонтаж формирователя десны, промывание шахты имплантата.\n3. Примерка индивидуальной анатомической коронки из диоксида циркония (Zirconia) на титановом основании (Ti-base) с винтовой фиксацией.\n4. Проверка окклюзионных взаимоотношений, апроксимальных контактов и краевой посадки на платформу.\n5. Затяжка фиксирующего клинического винта динамометрическим ключом с рекомендованным усилием (25–30 Нсм).\n6. Рентген-контроль точной посадки на уступ имплантата.\n7. Изоляция шахты винта тефлоновой лентой, герметизация шахты композитом светового отверждения под цвет эмали.\n8. Финишная полировка окклюзионной поверхности резиновыми головками и полировочной пастой.",
		defaultRecommendations: "Контрольный осмотр через 7 дней. Соблюдение гигиены полости рта, использование суперфлосса и ирригатора. Контроль окклюзии каждые 6 месяцев.",
	},
	{
		id: "enamel_wear_erosion",
		title: "Клиновидный дефект / Патологическая стираемость эмали (K03.1) — Реставрация",
		shortTitle: "Клиновидный дефект / Эрозия",
		category: "therapy",
		icd10Code: "K03.1",
		icd10Title: "Сошлифовывание зубов (клиновидный дефект)",
		defaultSubjectiveComplaints: "Жалобы на дефект твердых тканей у шейки зуба, гиперестезию от температурных и механических раздражителей (чистка зубов, холодная вода, кислое).",
		defaultAnamnesisMorbi: "Появление дефекта и чувствительности отмечает в течение последних 6–12 месяцев. Связывает с жесткой зубной щеткой и интенсивной чисткой.",
		defaultObjectiveStatus: "В пришеечной области вестибулярной поверхности зуба V-образный дефект твердых тканей с плотным гладким блестящим дном. Зондирование слабочувствительное. Десневой край без воспалительных изменений. Термопроба кратковременно положительна.",
		defaultProcedureProtocol: "1. Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.0 мл.\n2. Очищение поверхности зуба бесфтористой пастой.\n3. Деликатное сглаживание эмалевых краев мелкозернистым алмазным бором.\n4. Наложение ретракционной нити UltraPak #000 для защиты маргинальной десны.\n5. Изоляция коффердамом.\n6. Самопротравливающий адгезивный протокол универсальным бондом (7 поколение) с полимеризацией 20 сек.\n7. Послойное пломбирование микрогибридным эластичным светоотверждаемым композитом с низким модулем упругости.\n8. Удаление ретракционной нити, финишная шлифовка и полировка дисками и силиконовыми головками.\n9. Нанесение десенситайзера / фторсодержащего защитного лака.",
		defaultRecommendations: "Замена зубной щетки на щетку с мягкой щетиной (Soft/Ultrasoft). Исключить горизонтальные пилящие движения при чистке. Применение зубных паст для чувствительных зубов с гидроксиапатитом. Контрольный осмотр через 6 месяцев.",
	},
];

/**
 * Фильтрация номенклатуры 804н
 */
export function getStatutory804nCatalog(options?: { q?: string; category?: string }): readonly Statutory804nItem[] {
	let list = STATUTORY_804N_CATALOG;
	if (options?.category) {
		const cat = options.category.toLowerCase().trim();
		list = list.filter((item) => item.category.toLowerCase() === cat);
	}
	if (options?.q) {
		const q = options.q.toLowerCase().trim();
		list = list.filter((item) => 
			item.code.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
		);
	}
	return list;
}

/**
 * Фильтрация справочника диагнозов МКБ-10
 */
export function getStatutoryIcd10Catalog(options?: { q?: string; group?: string }): readonly StatutoryIcd10Item[] {
	let list = STATUTORY_DENTAL_ICD10;
	if (options?.group) {
		const grp = options.group.toLowerCase().trim();
		list = list.filter((item) => item.group.toLowerCase().includes(grp));
	}
	if (options?.q) {
		const q = options.q.toLowerCase().trim();
		list = list.filter((item) => 
			item.code.toLowerCase().includes(q) || item.label.toLowerCase().includes(q)
		);
	}
	return list;
}

/**
 * Фильтрация справочника шаблонов ЭМК
 */
export function getStatutoryEmrTemplates(options?: { q?: string; category?: string }): readonly StatutoryEmrTemplateItem[] {
	let list = STATUTORY_EMR_TEMPLATES;
	if (options?.category) {
		const cat = options.category.toLowerCase().trim();
		list = list.filter((item) => item.category.toLowerCase() === cat);
	}
	if (options?.q) {
		const q = options.q.toLowerCase().trim();
		list = list.filter((item) => 
			item.id.toLowerCase().includes(q) ||
			item.title.toLowerCase().includes(q) ||
			item.shortTitle.toLowerCase().includes(q) ||
			item.icd10Code.toLowerCase().includes(q)
		);
	}
	return list;
}

/**
 * 4. БАЗОВЫЙ ПРЕЙСКУРАНТ РФ (ПРИКАЗ 804Н) — 30 ЭТАЛОННЫХ УСЛУГ (МАНДАТЫ 8e, 8k, 8n)
 * 
 * Точные рыночные цены в рублях и копейках (Мандат 8b) для быстрого старта соло-врача
 * и клиник без ручного вбивания сотен строк.
 */
export const BASELINE_804N_PRICELIST_SERVICES: readonly Baseline804nServiceDefinition[] = [
	// ─── 1. ТЕРАПИЯ И АНЕСТЕЗИЯ ──────────────────────────────────────────
	{
		code: "A11.07.012",
		title: "Инъекционное введение лекарственных препаратов в челюстно-лицевую область (инфильтрационная анестезия)",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 950,
		basePriceKopecks: 95000,
		durationMinutes: 15,
		taxDeductible: true,
		active: true,
	},
	{
		code: "A11.07.010",
		title: "Введение лекарственных препаратов в область периферического нерва (проводниковая анестезия)",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 1100,
		basePriceKopecks: 110000,
		durationMinutes: 15,
		taxDeductible: true,
		active: true,
	},
	{
		code: "A16.07.002.009",
		title: "Изоляция операционного поля (наложение коффердама / раббердама)",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 650,
		basePriceKopecks: 65000,
		durationMinutes: 15,
		taxDeductible: true,
		active: true,
	},
	{
		code: "A16.07.002.010",
		title: "Восстановление зуба пломбой при лечении поверхностного кариеса (светоотверждаемый композит)",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 3500,
		basePriceKopecks: 350000,
		durationMinutes: 30,
		taxDeductible: true,
		active: true,
	},
	{
		code: "A16.07.002.011",
		title: "Восстановление зуба пломбой при лечении среднего кариеса (светоотверждаемый композит)",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 4200,
		basePriceKopecks: 420000,
		durationMinutes: 45,
		taxDeductible: true,
		active: true,
	},
	{
		code: "A16.07.002.012",
		title: "Восстановление зуба пломбой при лечении глубокого кариеса с наложением лечебной прокладки",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 4800,
		basePriceKopecks: 480000,
		durationMinutes: 45,
		taxDeductible: true,
		active: true,
	},
	{
		code: "A16.07.030.001",
		title: "Инструментальная и медикаментозная обработка 1 корневого канала",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 2100,
		basePriceKopecks: 210000,
		durationMinutes: 30,
		taxDeductible: true,
		active: true,
	},
	{
		code: "A16.07.030.002",
		title: "Инструментальная и медикаментозная обработка 2 корневых каналов",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 3800,
		basePriceKopecks: 380000,
		durationMinutes: 45,
		taxDeductible: true,
		active: true,
	},
	{
		code: "A16.07.030.003",
		title: "Инструментальная и медикаментозная обработка 3 корневых каналов",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 5200,
		basePriceKopecks: 520000,
		durationMinutes: 60,
		taxDeductible: true,
		active: true,
	},
	{
		code: "A16.07.030.004",
		title: "Инструментальная и медикаментозная обработка 4 корневых каналов",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 6500,
		basePriceKopecks: 650000,
		durationMinutes: 60,
		taxDeductible: true,
		active: true,
	},
	{
		code: "A16.07.008.002",
		title: "Пломбирование корневого канала зуба гуттаперчевыми штифтами (1 канал)",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 2400,
		basePriceKopecks: 240000,
		durationMinutes: 30,
		taxDeductible: true,
		active: true,
	},

	// ─── 2. ОРТОПЕДИЯ И ПРОТЕЗИРОВАНИЕ ───────────────────────────────────
	{
		code: "A16.07.006.004",
		title: "Восстановление зуба коронкой из диоксида циркония",
		category: "prosthetics",
		specialty: "orthopedist",
		basePriceRub: 25000,
		basePriceKopecks: 2500000,
		durationMinutes: 60,
		taxDeductible: true,
		active: true,
	},
	{
		code: "A16.07.006.002",
		title: "Восстановление зуба коронкой металлокерамической",
		category: "prosthetics",
		specialty: "orthopedist",
		basePriceRub: 14500,
		basePriceKopecks: 1450000,
		durationMinutes: 60,
		taxDeductible: true,
		active: true,
	},
	{
		code: "A16.07.003.001",
		title: "Восстановление зуба керамической вкладкой / виниром (E.max)",
		category: "prosthetics",
		specialty: "orthopedist",
		basePriceRub: 24000,
		basePriceKopecks: 2400000,
		durationMinutes: 60,
		taxDeductible: true,
		active: true,
	},
	{
		code: "A02.07.010.001",
		title: "Снятие оттиска с одной челюсти эластомерным материалом (А-силикон)",
		category: "prosthetics",
		specialty: "orthopedist",
		basePriceRub: 2500,
		basePriceKopecks: 250000,
		durationMinutes: 20,
		taxDeductible: true,
		active: true,
	},
	{
		code: "A16.07.053",
		title: "Фиксация на постоянный цемент несъемных ортопедических конструкций (1 единица)",
		category: "prosthetics",
		specialty: "orthopedist",
		basePriceRub: 1500,
		basePriceKopecks: 150000,
		durationMinutes: 20,
		taxDeductible: true,
		active: true,
	},

	// ─── 3. ХИРУРГИЯ ─────────────────────────────────────────────────────
	{
		code: "A16.07.001.001",
		title: "Удаление постоянного зуба простое",
		category: "surgery",
		specialty: "surgeon",
		basePriceRub: 3200,
		basePriceKopecks: 320000,
		durationMinutes: 30,
		taxDeductible: true,
		active: true,
	},
	{
		code: "A16.07.001.002",
		title: "Удаление зуба сложное с разъединением корней",
		category: "surgery",
		specialty: "surgeon",
		basePriceRub: 5500,
		basePriceKopecks: 550000,
		durationMinutes: 45,
		taxDeductible: true,
		active: true,
	},
	{
		code: "A16.07.001.003",
		title: "Операция удаления ретинированного, дистопированного зуба (8-й зуб)",
		category: "surgery",
		specialty: "surgeon",
		basePriceRub: 8500,
		basePriceKopecks: 850000,
		durationMinutes: 60,
		taxDeductible: true,
		active: true,
	},
	{
		code: "A16.07.097",
		title: "Наложение шва на слизистую оболочку рта при хирургических операциях",
		category: "surgery",
		specialty: "surgeon",
		basePriceRub: 900,
		basePriceKopecks: 90000,
		durationMinutes: 15,
		taxDeductible: true,
		active: true,
	},

	// ─── 4. ПРОФГИГИЕНА И ПРОФИЛАКТИКА ────────────────────────────────────
	{
		code: "A16.07.051.001",
		title: "Ультразвуковое удаление наддесневых и поддесневых зубных отложений (УЗ-скейлинг)",
		category: "hygiene",
		specialty: "hygienist",
		basePriceRub: 3500,
		basePriceKopecks: 350000,
		durationMinutes: 30,
		taxDeductible: true,
		active: true,
	},
	{
		code: "A16.07.051",
		title: "Снятие пигментированного зубного налета аппаратом Air-Flow",
		category: "hygiene",
		specialty: "hygienist",
		basePriceRub: 2500,
		basePriceKopecks: 250000,
		durationMinutes: 30,
		taxDeductible: true,
		active: true,
	},
	{
		code: "A11.07.024",
		title: "Глубокое фторирование эмали зубов (реминерализующая терапия)",
		category: "hygiene",
		specialty: "hygienist",
		basePriceRub: 1200,
		basePriceKopecks: 120000,
		durationMinutes: 20,
		taxDeductible: true,
		active: true,
	},

	// ─── 5. ИМПЛАНТАЦИЯ ──────────────────────────────────────────────────
	{
		code: "A16.07.054",
		title: "Внутрикостная дентальная имплантация (установка дентального имплантата)",
		category: "surgery",
		specialty: "implantologist",
		basePriceRub: 35000,
		basePriceKopecks: 3500000,
		durationMinutes: 60,
		taxDeductible: true,
		active: true,
	},
	{
		code: "A16.07.055",
		title: "Установка формирователя десны на дентальный имплантат",
		category: "surgery",
		specialty: "implantologist",
		basePriceRub: 4500,
		basePriceKopecks: 450000,
		durationMinutes: 30,
		taxDeductible: true,
		active: true,
	},
	{
		code: "A16.07.006.007",
		title: "Протезирование с использованием индивидуального циркониевого абатмента",
		category: "prosthetics",
		specialty: "orthopedist",
		basePriceRub: 12000,
		basePriceKopecks: 1200000,
		durationMinutes: 45,
		taxDeductible: true,
		active: true,
	},

	// ─── 6. КОНСУЛЬТАЦИИ, ДИАГНОСТИКА И МАНИПУЛЯЦИИ ───────────────────────
	{
		code: "B01.065.001",
		title: "Прием (осмотр, консультация) врача-стоматолога-терапевта первичный",
		category: "consultation",
		specialty: "therapist",
		basePriceRub: 1000,
		basePriceKopecks: 100000,
		durationMinutes: 30,
		taxDeductible: true,
		active: true,
	},
	{
		code: "A06.07.003",
		title: "Прицельная внутриротовая контактная радиовизиография",
		category: "imaging",
		specialty: "radiologist",
		basePriceRub: 650,
		basePriceKopecks: 65000,
		durationMinutes: 10,
		taxDeductible: true,
		active: true,
	},
	{
		code: "A06.07.004",
		title: "Ортопантомография челюстей (панорамный снимок ОПТГ)",
		category: "imaging",
		specialty: "radiologist",
		basePriceRub: 1400,
		basePriceKopecks: 140000,
		durationMinutes: 15,
		taxDeductible: true,
		active: true,
	},
	{
		code: "A16.01.008",
		title: "Снятие послеоперационных швов (лигатур)",
		category: "surgery",
		specialty: "surgeon",
		basePriceRub: 500,
		basePriceKopecks: 50000,
		durationMinutes: 15,
		taxDeductible: true,
		active: true,
	},
];


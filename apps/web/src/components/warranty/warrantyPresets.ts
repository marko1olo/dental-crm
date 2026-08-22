/**
 * ============================================================================
 * DENTAL WARRANTY PRESETS & STATUTORY REGULATIONS (СтАР & Закон РФ № 2300-1)
 * Нормативная база гарантийных сроков и сроков службы в стоматологии РФ:
 * - Закон РФ от 07.02.1992 № 2300-1 «О защите прав потребителей» (ст. 5, 10, 12, 29)
 * - Гражданский кодекс РФ (ст. 720–724, 737)
 * - Федеральный закон от 21.11.2011 № 323-ФЗ «Об основах охраны здоровья граждан в РФ»
 * - Положение СтАР «Об установлении гарантийного срока и срока службы при оказании стоматологической помощи»
 * - Постановление Правительства РФ от 11.05.2023 № 736 (Правила оказания платных медуслуг)
 * ============================================================================
 */

export type WarrantyCategory =
	| "composite_restoration"
	| "ceramic_crown_veneer"
	| "implant_fixture"
	| "orthodontic_aligners"
	| "removable_prosthesis"
	| "endodontic_treatment"
	| "periodontal_splinting"
	| "temporary_prosthesis";

export interface WarrantyPreset {
	category: WarrantyCategory;
	code: string;
	title: string;
	shortTitle: string;
	description: string;
	statutoryBasis: string;
	baseWarrantyMonths: number;
	minWarrantyMonths: number;
	maxWarrantyMonths: number;
	baseServiceLifeMonths: number;
	minServiceLifeMonths: number;
	maxServiceLifeMonths: number;
	clinicalConditions: string[];
	recommendedMaterials: string[];
	popularManufacturers: string[];
	standardCheckupIntervalMonths: number;
	isManufacturerLifetimeWarranty?: boolean;
}

export interface WarrantyMaintenanceCondition {
	id: string;
	number: number;
	title: string;
	description: string;
	statutoryRef: string;
	isMandatory: boolean;
	penaltyDescription: string;
}

export interface DentalMaterialMeta {
	id: string;
	category: WarrantyCategory;
	name: string;
	manufacturer: string;
	country: string;
	type: string;
	warrantyMonthsDefault: number;
	serviceLifeMonthsDefault: number;
	requiresLotNumber: boolean;
	popularShades?: string[];
}

/**
 * Статутные гарантийные категории и нормативы СтАР
 */
export const WARRANTY_PRESETS: Record<WarrantyCategory, WarrantyPreset> = {
	composite_restoration: {
		category: "composite_restoration",
		code: "WAR-COMP-01",
		title: "Светоотверждаемые композитные пломбы и художественная реставрация",
		shortTitle: "Пломбы & Реставрация",
		description:
			"Терапевтическое восстановление анатомической формы, краевого прилегания и эстетики коронковой части зуба светоотверждаемыми наногибридными композитами.",
		statutoryBasis: "Закон РФ № 2300-1 (ст. 5, 29), Положение СтАР разд. 2",
		baseWarrantyMonths: 12,
		minWarrantyMonths: 6,
		maxWarrantyMonths: 24,
		baseServiceLifeMonths: 36,
		minServiceLifeMonths: 24,
		maxServiceLifeMonths: 60,
		clinicalConditions: [
			"Индекс КПУ (кариозных, пломбированных, удаленных зубов) <= 6",
			"Гигиенический индекс Green-Vermillion (OHI-S) <= 1.2 (хорошая гигиена)",
			"Индекс разрушения окклюзионной поверхности зуба (ИРОПЗ) < 0.5 (до 50%)",
			"Отсутствие парафункций жевательных мышц (бруксизма) без защитной каппы",
		],
		recommendedMaterials: [
			"3M Filtek Ultimate / Z350 XT (США)",
			"Tokuyama Estelite Asteria / Sigma Quick (Япония)",
			"GC Gradia Direct / G-aenial / Essentia (Япония)",
			"Kerr Harmonize / Herculite Ultra (США)",
			"Micerium Enamel Plus HRi (Италия)",
		],
		popularManufacturers: ["3M ESPE", "Tokuyama Dental", "GC Corporation", "Kerr", "Micerium", "Dentsply Sirona"],
		standardCheckupIntervalMonths: 6,
	},

	ceramic_crown_veneer: {
		category: "ceramic_crown_veneer",
		code: "WAR-CERAM-02",
		title: "Керамические коронки, виниры E.max, вкладки Inlay/Onlay и диоксид циркония",
		shortTitle: "Коронки & Виниры E.max",
		description:
			"Несъемное микропротезирование и ортопедическое восстановление зубов высокопрочной керамикой дисиликата лития и многослойным диоксидом циркония.",
		statutoryBasis: "Закон РФ № 2300-1, ГК РФ ст. 720–724, Положение СтАР разд. 3",
		baseWarrantyMonths: 36,
		minWarrantyMonths: 12,
		maxWarrantyMonths: 60,
		baseServiceLifeMonths: 120,
		minServiceLifeMonths: 60,
		maxServiceLifeMonths: 180,
		clinicalConditions: [
			"Стабильные множественные окклюзионные контакты в центральной окклюзии",
			"Ношение разгрузочной окклюзионной каппы при признаках гипертонуса мышц",
			"Отсутствие генерализованного пародонтита тяжелой степени в фазе обострения",
			"Прохождение контрольной профессиональной гигиены каждые 6 месяцев",
		],
		recommendedMaterials: [
			"IPS e.max Press / CAD (Ivoclar Vivadent, Лихтенштейн)",
			"Noritake Katana Zirconia HTML / UTML / STML (Япония)",
			"Vita Suprinity / Vita Enamic (Германия)",
			"Zirkonzahn Prettau Anterior / Dispersive (Италия)",
			"Dentsply Sirona Cercon ht ML (Германия)",
		],
		popularManufacturers: ["Ivoclar Vivadent", "Kuraray Noritake", "Vita Zahnfabrik", "Zirkonzahn", "Dentsply Sirona"],
		standardCheckupIntervalMonths: 6,
	},

	implant_fixture: {
		category: "implant_fixture",
		code: "WAR-IMPL-03",
		title: "Дентальные имплантаты и протезирование на титановых опорах",
		shortTitle: "Имплантаты & Абатменты",
		description:
			"Хирургическая установка внутрикостных титановых имплантатов с пожизненной гарантией производителя на титановый винт и клинической гарантией на остеоинтеграцию.",
		statutoryBasis: "Закон РФ № 2300-1, Регламент СтАР по дентальной имплантологии, ГОСТ Р 55583",
		baseWarrantyMonths: 24,
		minWarrantyMonths: 12,
		maxWarrantyMonths: 36,
		baseServiceLifeMonths: 240,
		minServiceLifeMonths: 120,
		maxServiceLifeMonths: 360,
		isManufacturerLifetimeWarranty: true,
		clinicalConditions: [
			"Пожизненная гарантия завода-производителя на целостность титанового винта",
			"Клиническая гарантия 24–36 мес на остеоинтеграцию при соблюдении гигиены",
			"Индекс OHI-S <= 1.2, отсутствие признаков мукозита и периимплантита",
			"Отказ от курения (или не более 5 сигарет/сутки) и компенсация сахарного диабета (HbA1c < 7.0%)",
		],
		recommendedMaterials: [
			"Straumann SLActive / Roxolid (Швейцария)",
			"Nobel Biocare TiUnite / Replace Select / Conical (Швейцария/США)",
			"Astra Tech Implant System OsseoSpeed TX (Швеция/США)",
			"Osstem Implant TS III SA / CA (Южная Корея)",
			"Dentium SuperLine / Implantium (Южная Корея)",
			"Ankylos C/X SynCone (Германия)",
		],
		popularManufacturers: ["Straumann", "Nobel Biocare", "Astra Tech", "Osstem", "Dentium", "Dentsply Sirona (Ankylos)", "Medentika", "MIS"],
		standardCheckupIntervalMonths: 6,
	},

	orthodontic_aligners: {
		category: "orthodontic_aligners",
		code: "WAR-ORTHO-04",
		title: "Элайнеры и брекет-системы (ортодонтическая коррекция прикуса)",
		shortTitle: "Элайнеры & Брекеты",
		description:
			"Аппаратное исправление зубочелюстных аномалий с гарантией стабильности окклюзионного результата при соблюдении ретенционного протокола.",
		statutoryBasis: "Закон РФ № 2300-1, Клинические рекомендации Минздрава РФ по ортодонтии",
		baseWarrantyMonths: 12,
		minWarrantyMonths: 6,
		maxWarrantyMonths: 24,
		baseServiceLifeMonths: 120,
		minServiceLifeMonths: 60,
		maxServiceLifeMonths: 240,
		clinicalConditions: [
			"Непрерывное ношение несъемных проволочных ретейнеров на фронтальных зубах",
			"Ношение индивидуальных ночных ретенционных капп не менее удвоенного срока активного лечения (2x)",
			"Контрольный осмотр ортодонта каждые 4–6 месяцев на протяжении ретенционного периода",
			"Своевременная замена элайнеров строго по индивидуальному клиническому сетапу",
		],
		recommendedMaterials: [
			"Многослойный биополимер SmartTrack / Zendura FLX",
			"Брекеты Damon Q2 / Damon Clear (Ormco, США)",
			"Брекеты 3M Clarity Advanced / Ultra (3M Unitek, США)",
			"Ретенционная проволока Respond / Dentaurum Rematitan",
		],
		popularManufacturers: ["Spark / Ormco", "Invisalign / Align Tech", "Eurokappa", "Star Smile", "3M Unitek", "Dentaurum"],
		standardCheckupIntervalMonths: 4,
	},

	removable_prosthesis: {
		category: "removable_prosthesis",
		code: "WAR-REMOV-05",
		title: "Бюгельные, пластиночные и условно-съемные протезы",
		shortTitle: "Съемные & Бюгельные протезы",
		description:
			"Ортопедическое замещение частичной или полной адентии съемными акриловыми, нейлоновыми и бюгельными конструкциями.",
		statutoryBasis: "Закон РФ № 2300-1, Положение СтАР разд. 4",
		baseWarrantyMonths: 12,
		minWarrantyMonths: 6,
		maxWarrantyMonths: 18,
		baseServiceLifeMonths: 36,
		minServiceLifeMonths: 24,
		maxServiceLifeMonths: 60,
		clinicalConditions: [
			"Обязательная клиническая перебазировка протеза через 6 месяцев для компенсации атрофии кости",
			"Ежедневная гигиеническая дезинфекция протеза специализированными таблетками/растворами",
			"Исключение самостоятельного подгибания кламмеров и замковых креплений (аттачменов)",
			"Контроль равномерности окклюзионного распределения нагрузки раз в 6 мес",
		],
		recommendedMaterials: [
			"Акрил Vertex Implacryl / Rapid Simplified (Нидерланды)",
			"Lucitone 199 High Impact (Dentsply Sirona)",
			"Кобальт-хромовый сплав Bego Wironit / Heraeus Kulzer (Германия)",
			"Термопласт Bredent Bio Dentaplast / Valplast (Германия/США)",
		],
		popularManufacturers: ["Vertex-Dental", "Dentsply Sirona", "Bredent", "BEGO", "Kulzer", "Valplast"],
		standardCheckupIntervalMonths: 6,
	},

	endodontic_treatment: {
		category: "endodontic_treatment",
		code: "WAR-ENDO-06",
		title: "Эндодонтическое лечение и трехмерная обтурация корневых каналов",
		shortTitle: "Эндодонтия (Каналы)",
		description:
			"Инструментальная, медикаментозная обработка и герметичная 3D-обтурация корневых каналов гуттаперчей и биокерамическим силером.",
		statutoryBasis: "Закон РФ № 2300-1, Клинические рекомендации СтАР по эндодонтии",
		baseWarrantyMonths: 12,
		minWarrantyMonths: 6,
		maxWarrantyMonths: 24,
		baseServiceLifeMonths: 60,
		minServiceLifeMonths: 36,
		maxServiceLifeMonths: 120,
		clinicalConditions: [
			"Обязательное покрытие зуба ортопедической коронкой или вкладкой в срок до 30 дней после депульпирования (при ИРОПЗ > 0.5)",
			"Контрольная прицельная радиовизиография через 6 и 12 месяцев для оценки периапикальных тканей",
			"Исключение жевательной нагрузки на временную пломбу до постоянного восстановления коронки",
		],
		recommendedMaterials: [
			"Dentsply Sirona AH Plus Jet (Германия)",
			"Septodont BioRoot RCS (Франция)",
			"FKG Dentaire TotalFill BC Sealer (Швейцария)",
			"VDW Reciproc Blue / VDW.Rotate (Германия)",
		],
		popularManufacturers: ["Dentsply Sirona", "Septodont", "FKG Dentaire", "VDW Dental", "Meta Biomed"],
		standardCheckupIntervalMonths: 6,
	},

	periodontal_splinting: {
		category: "periodontal_splinting",
		code: "WAR-PERIO-07",
		title: "Шинирование зубов стекловолокном при заболеваниях пародонта",
		shortTitle: "Шинирование зубов",
		description:
			"Иммобилизация подвижных зубов с использованием высокомодульных стекловолоконных лент и композитной фиксации.",
		statutoryBasis: "Закон РФ № 2300-1, Клинические протоколы СтАР по пародонтологии",
		baseWarrantyMonths: 6,
		minWarrantyMonths: 3,
		maxWarrantyMonths: 12,
		baseServiceLifeMonths: 24,
		minServiceLifeMonths: 12,
		maxServiceLifeMonths: 36,
		clinicalConditions: [
			"Диспансерное наблюдение пародонтолога каждые 3–4 месяца",
			"Индекс кровоточивости десневой борозды (BOP) < 15%",
			"Использование индивидуальных межзубных ершиков и ирригатора полости рта",
			"Купирование острой фазы генерализованного пародонтита",
		],
		recommendedMaterials: [
			"Ribbond THM / Ultra (США)",
			"Stick Tech GC everStick PERIO (Финляндия/Япония)",
			"Kerr Construct (США)",
		],
		popularManufacturers: ["Ribbond", "GC Corporation (Stick Tech)", "Kerr", "Angelus"],
		standardCheckupIntervalMonths: 3,
	},

	temporary_prosthesis: {
		category: "temporary_prosthesis",
		code: "WAR-TEMP-08",
		title: "Временные коронки, мостовидные протезы и адаптационные каппы",
		shortTitle: "Временные коронки",
		description:
			"Провизорные реставрации для защиты препарированного дентина, стабилизации окклюзии и формирования контура десны на период изготовления постоянных конструкций.",
		statutoryBasis: "Закон РФ № 2300-1 (краткосрочные провизорные изделия)",
		baseWarrantyMonths: 1,
		minWarrantyMonths: 1,
		maxWarrantyMonths: 3,
		baseServiceLifeMonths: 3,
		minServiceLifeMonths: 1,
		maxServiceLifeMonths: 6,
		clinicalConditions: [
			"Своевременная замена на постоянную ортопедическую конструкцию в рекомендованный врачом срок",
			"Исключение вязкой и липкой пищи (ириски, жевательная резинка), способствующей расцементировке",
			"Немедленный визит в клинику при расцементировке для повторной фиксации",
		],
		recommendedMaterials: [
			"3M Protemp 4 (США)",
			"DMG Luxatemp Star / Automix (Германия)",
			"PMMA фрезерованный CAD/CAM (Yamahachi, Япония)",
		],
		popularManufacturers: ["3M ESPE", "DMG", "GC Corporation", "Dentsply Sirona"],
		standardCheckupIntervalMonths: 1,
	},
};

/**
 * 9 обязательных условий сохранения гарантии клиники (Закон РФ № 2300-1 и СтАР)
 */
export const MANDATORY_WARRANTY_CONDITIONS: WarrantyMaintenanceCondition[] = [
	{
		id: "cond_checkup_hygiene",
		number: 1,
		title: "Регулярный контрольный осмотр и профгигиена раз в 6 месяцев",
		description:
			"Пациент обязан проходить плановый бесплатный контрольный осмотр лечащего врача-стоматолога и процедуру профессиональной гигиены полости рта в клинике не реже 1 раза в 6 месяцев (при пародонтите и имплантации — 1 раз в 3–4 месяца по назначению).",
		statutoryRef: "Закон РФ № 2300-1 ст. 10; Положение СтАР разд. 5",
		isMandatory: true,
		penaltyDescription: "Неявка на контрольный осмотр более чем на 30 дней аннулирует добровольные гарантийные обязательства клиники сверх законного минимума.",
	},
	{
		id: "cond_home_hygiene",
		number: 2,
		title: "Соблюдение индивидуальной гигиены полости рта",
		description:
			"Пациент обязан соблюдать правила гигиены: чистка зубов не менее 2 раз в день пастой и щеткой рекомендованной жесткости, ежедневное использование зубной нити (флосса), межзубных ершиков и ирригатора полости рта. Индекс гигиены OHI-S не должен превышать 1.2.",
		statutoryRef: "Клинические протоколы СтАР; ст. 10 Закона РФ № 2300-1",
		isMandatory: true,
		penaltyDescription: "Неудовлетворительный индекс гигиены (OHI-S > 1.8) влечет сокращение гарантийного срока на 30–50% из-за риска вторичного кариеса и периимплантита.",
	},
	{
		id: "cond_no_third_party_intervention",
		number: 3,
		title: "Запрет на несанкционированное вмешательство сторонних врачей",
		description:
			"Категорически запрещаются самостоятельные попытки пришлифовывания, коррекции протезов, а также лечение или доработка гарантийных конструкций в других медицинских учреждениях без предварительного письменного согласования с клиникой (за исключением неотложной экстренной помощи с подтверждающей выпиской из медкарты).",
		statutoryRef: "ГК РФ ст. 720, 724; Закон РФ № 2300-1 ст. 29",
		isMandatory: true,
		penaltyDescription: "Самостоятельный ремонт или стороннее вмешательство полностью прекращает действие гарантийного паспорта на соответствующий зуб/конструкцию.",
	},
	{
		id: "cond_diet_mechanical_protection",
		number: 4,
		title: "Соблюдение щадящей жевательной диеты",
		description:
			"Пациент обязуется исключить разгрызание твердых предметов: скорлупы орехов, костей, сухарей, семечек, леденцов, карамели, а также перекусывание ниток, проволоки и открывание бутылок/упаковок зубами.",
		statutoryRef: "Правила эксплуатации медицинских изделий; Закон РФ № 2300-1",
		isMandatory: true,
		penaltyDescription: "Механические сколы керамики и переломы конструкций от запредельных сверхнагрузок признаются негарантийным случаем вследствие нарушения условий эксплуатации.",
	},
	{
		id: "cond_night_guard_bruxism",
		number: 5,
		title: "Использование защитных капп при бруксизме и спорте",
		description:
			"При наличии признаков парафункции жевательных мышц (бруксизм, сжатие челюстей) пациент обязан регулярно использовать индивидуальную окклюзионную релаксационную каппу в ночное время, а при занятиях контактными видами спорта — спортивную защитную каппу.",
		statutoryRef: "Клинические рекомендации Минздрава РФ по ортопедии и ортодонтии",
		isMandatory: true,
		penaltyDescription: "Отказ от ношения назначенной ночной каппы при доказанном бруксизме снижает срок гарантии на керамику и пломбы на 40–50%.",
	},
	{
		id: "cond_crown_coverage_after_endo",
		number: 6,
		title: "Ортопедическое покрытие зуба после депульпирования в срок до 30 дней",
		description:
			"Зубы, пролеченные эндодонтически (после удаления пульпы/депульпирования) с разрушением твердых тканей более 50% (ИРОПЗ > 0.5), подлежат обязательному укреплению вкладкой и покрытию искусственной коронкой в срок не позднее 30 календарных дней с момента пломбирования каналов.",
		statutoryRef: "Клинические протоколы СтАР по эндодонтическому лечению",
		isMandatory: true,
		penaltyDescription: "Отказ от рекомендованной коронки аннулирует гарантию на пломбу и устойчивость стенок зуба к расколу (продольному перелому корня).",
	},
	{
		id: "cond_prompt_notification",
		number: 7,
		title: "Своевременное обращение при возникновении жалоб",
		description:
			"При появлении подвижности коронки, трещины, скола, дискомфорта при накусывании или кровоточивости пациент обязан обратиться в клинику в течение 3–5 рабочих дней для проведения коррекции или превентивного лечения.",
		statutoryRef: "Закон РФ № 2300-1 ст. 10, 12",
		isMandatory: true,
		penaltyDescription: "Затягивание визита при расцементировке коронки приводит к разрушению культи зуба под коронкой и прекращению гарантии.",
	},
	{
		id: "cond_removable_relining",
		number: 8,
		title: "Обязательная перебазировка съемных протезов",
		description:
			"В связи с естественной анатомической атрофией костной ткани челюстей пациенты со съемными протезами обязаны являться на процедуру клинической перебазировки каждые 6–12 месяцев.",
		statutoryRef: "Положение СтАР разд. 4; Инструкции производителей",
		isMandatory: true,
		penaltyDescription: "Непроведение перебазировки приводит к неравномерному давлению, перелому базиса протеза или опорных зубов и снятию с гарантии.",
	},
	{
		id: "cond_orthodontic_retention",
		number: 9,
		title: "Соблюдение ретенционного режима после ортодонтии",
		description:
			"Пациент обязуется непрерывно сохранять несъемные ретейнеры и надевать ночные ретенционные каппы строго по схеме, установленной врачом-ортодонтом, на весь предписанный период ретенции.",
		statutoryRef: "Клинические рекомендации Минздрава РФ по ортодонтическому лечению",
		isMandatory: true,
		penaltyDescription: "Самовольное прекращение ношения ретейнеров ведет к рецидиву аномалии прикуса, что не является дефектом оказанной помощи.",
	},
];

/**
 * Каталог популярных VITA оттенков
 */
export const VITA_SHADES: string[] = [
	"A1", "A2", "A3", "A3.5", "A4",
	"B1", "B2", "B3", "B4",
	"C1", "C2", "C3", "C4",
	"D2", "D3", "D4",
	"BL1", "BL2", "BL3", "BL4",
	"OM1", "OM2", "OM3",
	"Universal / Omnichroma",
	"Translucent Clear",
	"Bleach White",
];

/**
 * Базовый каталог материалов для быстрого автозаполнения
 */
export const DENTAL_MATERIALS_CATALOG: DentalMaterialMeta[] = [
	{
		id: "mat_filtek_ultimate",
		category: "composite_restoration",
		name: "Filtek Ultimate (3M ESPE)",
		manufacturer: "3M ESPE",
		country: "США",
		type: "Нанокомпозит универсальный светового отверждения",
		warrantyMonthsDefault: 12,
		serviceLifeMonthsDefault: 36,
		requiresLotNumber: false,
		popularShades: ["A1", "A2", "A3", "A3.5", "B1", "B2"],
	},
	{
		id: "mat_estelite_asteria",
		category: "composite_restoration",
		name: "Estelite Asteria (Tokuyama Dental)",
		manufacturer: "Tokuyama Dental",
		country: "Япония",
		type: "Субмикрофильный реставрационный композит",
		warrantyMonthsDefault: 24,
		serviceLifeMonthsDefault: 48,
		requiresLotNumber: false,
		popularShades: ["A1B", "A2B", "A3B", "NE", "OcE"],
	},
	{
		id: "mat_emax_press",
		category: "ceramic_crown_veneer",
		name: "IPS e.max Press (Ivoclar Vivadent)",
		manufacturer: "Ivoclar Vivadent",
		country: "Лихтенштейн",
		type: "Стеклокерамика на основе дисиликата лития",
		warrantyMonthsDefault: 36,
		serviceLifeMonthsDefault: 120,
		requiresLotNumber: true,
		popularShades: ["BL1", "BL2", "A1", "A2", "A3", "B1"],
	},
	{
		id: "mat_katana_zirconia",
		category: "ceramic_crown_veneer",
		name: "Katana Zirconia HTML/UTML (Kuraray Noritake)",
		manufacturer: "Kuraray Noritake",
		country: "Япония",
		type: "Многослойный высокотранслюцентный диоксид циркония",
		warrantyMonthsDefault: 60,
		serviceLifeMonthsDefault: 180,
		requiresLotNumber: true,
		popularShades: ["A1", "A2", "A3", "B1", "NW"],
	},
	{
		id: "mat_straumann_slactive",
		category: "implant_fixture",
		name: "Straumann BLX / BLT SLActive Roxolid",
		manufacturer: "Straumann",
		country: "Швейцария",
		type: "Титано-циркониевый имплантат с гидрофильной поверхностью",
		warrantyMonthsDefault: 36,
		serviceLifeMonthsDefault: 300,
		requiresLotNumber: true,
	},
	{
		id: "mat_osstem_ts3",
		category: "implant_fixture",
		name: "Osstem TS III SA / CA",
		manufacturer: "Osstem Implant",
		country: "Южная Корея",
		type: "Дентальный титановый имплантат Grade 4",
		warrantyMonthsDefault: 24,
		serviceLifeMonthsDefault: 240,
		requiresLotNumber: true,
	},
	{
		id: "mat_spark_aligners",
		category: "orthodontic_aligners",
		name: "Spark Aligners TruGEN Material",
		manufacturer: "Ormco",
		country: "США",
		type: "Прозрачные ортодонтические элайнеры из биополимера",
		warrantyMonthsDefault: 12,
		serviceLifeMonthsDefault: 120,
		requiresLotNumber: true,
	},
	{
		id: "mat_vertex_implacryl",
		category: "removable_prosthesis",
		name: "Vertex Implacryl / Castavest Bego",
		manufacturer: "Vertex-Dental / BEGO",
		country: "Нидерланды / Германия",
		type: "Бюгельный протез с литым Co-Cr базисом и акриловой гарнитурой",
		warrantyMonthsDefault: 12,
		serviceLifeMonthsDefault: 36,
		requiresLotNumber: false,
	},
	{
		id: "mat_ah_plus_endo",
		category: "endodontic_treatment",
		name: "AH Plus Jet & Gutta-Percha",
		manufacturer: "Dentsply Sirona",
		country: "Германия",
		type: "Эпоксидно-аминовый эндодонтический герметик",
		warrantyMonthsDefault: 12,
		serviceLifeMonthsDefault: 60,
		requiresLotNumber: false,
	},
];

/**
 * Получить пресет по категории
 */
export function getWarrantyPreset(category: WarrantyCategory): WarrantyPreset {
	return WARRANTY_PRESETS[category] || WARRANTY_PRESETS.composite_restoration;
}

/**
 * Получить все пресеты списком
 */
export function getAllWarrantyPresets(): WarrantyPreset[] {
	return Object.values(WARRANTY_PRESETS);
}

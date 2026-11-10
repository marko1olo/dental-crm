/**
 * ============================================================================
 * DENTAL WARRANTY PRESETS & STATUTORY REGULATIONS (СтАР & Закон РФ № 2300-1)
 * Canonical Master SSOT Module (Mandates 8b, 8e, 8bf: Anti-Micro-Shredder)
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
	serviceCode804n: string;
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

export type WarrantyDefectType =
	| "filling_loss"
	| "crown_decementation"
	| "ceramic_chip"
	| "screw_loosening"
	| "denture_fracture"
	| "retainer_debonding"
	| "occlusal_discomfort"
	| "custom_defect";

export interface WarrantyRemediationMaterialItem {
	readonly id?: string | undefined;
	readonly name: string;
	readonly quantity: number;
	readonly unit: string;
	readonly lotNumber?: string | undefined;
	readonly sku?: string | undefined;
}

export interface WarrantyDefectTemplate {
	readonly defectType: WarrantyDefectType;
	readonly code: string;
	readonly title: string;
	readonly shortTitle: string;
	readonly category: WarrantyCategory;
	readonly recommendedAction: string;
	readonly clinicalDescription: string;
	readonly defaultMaterials: readonly WarrantyRemediationMaterialItem[];
	readonly statutoryBasis: string;
}

export interface StarQuickPreset {
	readonly id: string;
	readonly title: string;
	readonly subtitle: string;
	readonly category: WarrantyCategory;
	readonly materialName: string;
	readonly manufacturer: string;
	readonly country: string;
	readonly warrantyMonths: number;
	readonly serviceLifeMonths: number;
	readonly serviceCode804n: string;
	readonly statutoryNote: string;
}

/**
 * Каталог популярных VITA оттенков для реставраций и ортопедии
 */
export const VITA_SHADES: string[] = [
	"A1", "A2", "A3", "A3.5", "A4",
	"B1", "B2", "B3", "B4",
	"C1", "C2", "C3", "C4",
	"D2", "D3", "D4",
	"BL1", "BL2", "BL3", "BL4",
	"0M1", "0M2", "0M3",
	"OM1", "OM2", "OM3",
	"1M1", "1M2",
	"2L1.5", "2L2.5", "2M1", "2M2", "2M3", "2R1.5", "2R2.5",
	"3L1.5", "3L2.5", "3M1", "3M2", "3M3", "3R1.5", "3R2.5",
	"4L1.5", "4L2.5", "4M1", "4M2", "4M3", "4R1.5", "4R2.5",
	"5M1", "5M2", "5M3",
	"Universal / Omnichroma",
	"Translucent Clear",
	"Bleach White",
];

/**
 * 9 обязательных условий сохранения гарантии клиники (Закон РФ № 2300-1 и СтАР)
 */
export const MANDATORY_WARRANTY_CONDITIONS: WarrantyMaintenanceCondition[] = [
	{
		id: "cond_checkup_hygiene",
		number: 1,
		title: "Бесплатный контрольный осмотр и профгигиена раз в 6 месяцев",
		description:
			"Плановый контрольный осмотр лечащего врача и бережная профессиональная гигиена 1 раз в 6 месяцев помогают вовремя заметить любые изменения и сохранить здоровье зубов и конструкций.",
		statutoryRef: "Стандарт клинического контроля клиники",
		isMandatory: true,
		penaltyDescription: "При пропуске профосмотра более 6 месяцев гарантия возобновляется сразу после проведения плановой гигиены.",
	},
	{
		id: "cond_home_hygiene",
		number: 2,
		title: "Ежедневная гигиена полости рта",
		description:
			"Чистка зубов 2 раза в день щёткой подходящей жёсткости, зубная нить и ирригатор для чистоты межзубных промежутков обеспечивают идеальную чистоту реставраций.",
		statutoryRef: "Клинические рекомендации по гигиене",
		isMandatory: true,
		penaltyDescription: "Скопление зубного налёта повышает риск воспаления десны вокруг пломб и коронок.",
	},
	{
		id: "cond_no_third_party_intervention",
		number: 3,
		title: "Обслуживание и коррекция у специалистов клиники",
		description:
			"Доверяйте обслуживание, пришлифовывание и коррекцию установленных конструкций врачам нашей клиники, знающим особенности вашей работы и применённые материалы.",
		statutoryRef: "Врачебный протокол клиники",
		isMandatory: true,
		penaltyDescription: "Коррекция или лечение конструкций в других учреждениях без согласования может нарушить их прилегание.",
	},
	{
		id: "cond_diet_mechanical_protection",
		number: 4,
		title: "Бережное отношение к конструкциям и зубам",
		description:
			"Исключите разгрызание твёрдых предметов: скорлупы орехов, костей, сухарей, семечек, не открывайте зубами упаковки и пробки во избежание механических сколов.",
		statutoryRef: "Правила безопасной эксплуатации конструкций",
		isMandatory: true,
		penaltyDescription: "Механические сколы керамики от запредельных нагрузок (орехи, кости) не относятся к дефектам изготовления.",
	},
	{
		id: "cond_night_guard_bruxism",
		number: 5,
		title: "Защитная каппа при ночном сжатии зубов или спорте",
		description:
			"При наличии признаков ночного сжатия зубов (бруксизм) или при занятиях контактными видами спорта используйте индивидуальную защитную каппу для разгрузки сустава и эмали.",
		statutoryRef: "Окклюзионный протокол защиты",
		isMandatory: true,
		penaltyDescription: "Ночной скрежет без каппы перегружает керамику и пломбы, повышая риск микротрещин.",
	},
	{
		id: "cond_crown_coverage_after_endo",
		number: 6,
		title: "Защита депульпированных зубов коронкой",
		description:
			"Зубы после лечения каналов с потерей более 50% тканей рекомендуется покрыть коронкой или вкладкой в течение 30 дней для надёжной защиты стенок зуба от раскола корня.",
		statutoryRef: "Протокол сохранения эндодонтических зубов",
		isMandatory: true,
		penaltyDescription: "Отказ от коронки на депульпированном зубе оставляет тонкие стенки зуба под постоянным риском раскола.",
	},
	{
		id: "cond_prompt_notification",
		number: 7,
		title: "Своевременное обращение при любом дискомфорте",
		description:
			"При появлении подвижности, микроскола или дискомфорта при накусывании позвоните нам в первые 3–5 дней — врач оперативно проведёт осмотр и бесплатную коррекцию.",
		statutoryRef: "Регламент гарантийного обслуживания клиники",
		isMandatory: true,
		penaltyDescription: "Затягивание визита при расцементировке коронки может привести к повреждению культи зуба.",
	},
	{
		id: "cond_removable_relining",
		number: 8,
		title: "Плановый контроль съёмных протезов раз в 6–12 месяцев",
		description:
			"Для сохранения комфортной фиксации и правильного распределения жевательной нагрузки съёмные протезы осматриваются врачом раз в 6–12 месяцев.",
		statutoryRef: "Рекомендации по съёмному протезированию",
		isMandatory: true,
		penaltyDescription: "Естественная атрофия десны без коррекции протеза приводит к неравномерному давлению на десну.",
	},
	{
		id: "cond_orthodontic_retention",
		number: 9,
		title: "Сохранение ретейнеров после исправления прикуса",
		description:
			"Сохраняйте несъёмные ретейнеры и надевайте ночные каппы по графику ортодонта для закрепления стабильного и красивого результата выравнивания зубов.",
		statutoryRef: "Ретенционный протокол ортодонтии",
		isMandatory: true,
		penaltyDescription: "Преждевременное снятие ретейнера может привести к смещению зубов в исходное положение.",
	},
];

/* --- THERAPEUTIC PRESETS & DEFECTS --- */

export const COMPOSITE_RESTORATION_PRESET: WarrantyPreset = {
	category: "composite_restoration",
	code: "WAR-COMP-01",
	serviceCode804n: "A16.07.002.010",
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
};

export const ENDODONTIC_TREATMENT_PRESET: WarrantyPreset = {
	category: "endodontic_treatment",
	code: "WAR-ENDO-06",
	serviceCode804n: "A16.07.008.002",
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
};

export const PERIODONTAL_SPLINTING_PRESET: WarrantyPreset = {
	category: "periodontal_splinting",
	code: "WAR-PERIO-07",
	serviceCode804n: "A16.07.019",
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
		"Контрольные осмотры пародонтолога и поддерживающая гигиена каждые 3–4 месяца",
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
};

export const THERAPEUTIC_WARRANTY_PRESETS = {
	composite_restoration: COMPOSITE_RESTORATION_PRESET,
	endodontic_treatment: ENDODONTIC_TREATMENT_PRESET,
	periodontal_splinting: PERIODONTAL_SPLINTING_PRESET,
} as const;

export const STAR_COMPOSITE_QUICK_PRESET: StarQuickPreset = {
	id: "star_composite_1y",
	title: "Световая пломба",
	subtitle: "1 год (12 мес.) • Срок сл. 3 г.",
	category: "composite_restoration",
	materialName: "Filtek Ultimate (3M ESPE)",
	manufacturer: "3M ESPE",
	country: "США",
	warrantyMonths: 12,
	serviceLifeMonths: 36,
	serviceCode804n: "A16.07.002.010",
	statutoryNote: "Положение СтАР разд. 2, Закон РФ № 2300-1 ст. 5",
};

export const FILLING_LOSS_DEFECT_TEMPLATE: WarrantyDefectTemplate = {
	defectType: "filling_loss",
	code: "DEF-FILL-01",
	title: "Выпадение пломбы / дефект краевого прилегания (0 ₽)",
	shortTitle: "Выпала пломба (0 ₽)",
	category: "composite_restoration",
	recommendedAction: "Некрэктомия по краю, адгезивная подготовка и повторное пломбирование нанокомпозитом",
	clinicalDescription: "Частичная или полная утрата пломбы, скол композитного материала, нарушение краевой адаптации.",
	defaultMaterials: [
		{ name: "Композит светового отверждения (Filtek / Estelite)", quantity: 1, unit: "доз." },
		{ name: "Адгезивная система Single Bond Universal", quantity: 1, unit: "доз." },
		{ name: "Травильный гель 37% ортофосфорной кислоты", quantity: 1, unit: "доз." },
		{ name: "Полировочные диски и щетки", quantity: 1, unit: "компл." },
	],
	statutoryBasis: "Закон РФ № 2300-1 ст. 29, Положение СтАР разд. 2 (Безвозмездное устранение недостатков)",
};

export const OCCLUSAL_DISCOMFORT_DEFECT_TEMPLATE: WarrantyDefectTemplate = {
	defectType: "occlusal_discomfort",
	code: "DEF-OCCL-07",
	title: "Окклюзионный дискомфорт / пришлифовка суперконтакта (0 ₽)",
	shortTitle: "Пришлифовка окклюзии (0 ₽)",
	category: "composite_restoration",
	recommendedAction: "Артикуляционная проба (Bausch 40 мкм), избирательное микропришлифовывание суперконтакта и полировка",
	clinicalDescription: "Преждевременный окклюзионный контакт при смыкании зубных рядов, дискомфорт при жевании.",
	defaultMaterials: [
		{ name: "Артикуляционная бумага Bausch 40 мкм", quantity: 1, unit: "полоска" },
		{ name: "Полировочная головка Enhance / PoGo", quantity: 1, unit: "шт" },
	],
	statutoryBasis: "Положение СтАР разд. 2 (Коррекция окклюзионных взаимоотношений по гарантии)",
};

export const CUSTOM_DEFECT_TEMPLATE: WarrantyDefectTemplate = {
	defectType: "custom_defect",
	code: "DEF-CUSTOM-08",
	title: "Индивидуальное гарантийное устранение дефекта (0 ₽)",
	shortTitle: "Гарантийный дефект (0 ₽)",
	category: "composite_restoration",
	recommendedAction: "Клиническая ревизия и безвозмездное устранение выявленного недостатка",
	clinicalDescription: "Гарантийное обращение пациента в рамках действующего гарантийного срока клиники.",
	defaultMaterials: [
		{ name: "Расходные стоматологические материалы по факту манипуляции", quantity: 1, unit: "компл." },
	],
	statutoryBasis: "Закон РФ № 2300-1 ст. 29 «Права потребителя при обнаружении недостатков выполненной работы»",
};

export const THERAPEUTIC_DEFECT_TEMPLATES = {
	filling_loss: FILLING_LOSS_DEFECT_TEMPLATE,
	occlusal_discomfort: OCCLUSAL_DISCOMFORT_DEFECT_TEMPLATE,
	custom_defect: CUSTOM_DEFECT_TEMPLATE,
} as const;

export const THERAPEUTIC_MATERIALS: DentalMaterialMeta[] = [
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

/* --- ORTHOPEDIC PRESETS & DEFECTS --- */

export const CERAMIC_CROWN_VENEER_PRESET: WarrantyPreset = {
	category: "ceramic_crown_veneer",
	code: "WAR-CERAM-02",
	serviceCode804n: "A16.07.004.002",
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
};

export const REMOVABLE_PROSTHESIS_PRESET: WarrantyPreset = {
	category: "removable_prosthesis",
	code: "WAR-REMOV-05",
	serviceCode804n: "A16.07.036",
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
};

export const TEMPORARY_PROSTHESIS_PRESET: WarrantyPreset = {
	category: "temporary_prosthesis",
	code: "WAR-TEMP-08",
	serviceCode804n: "A16.07.004.004",
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
};

export const ORTHOPEDIC_WARRANTY_PRESETS = {
	ceramic_crown_veneer: CERAMIC_CROWN_VENEER_PRESET,
	removable_prosthesis: REMOVABLE_PROSTHESIS_PRESET,
	temporary_prosthesis: TEMPORARY_PROSTHESIS_PRESET,
} as const;

export const STAR_EMAX_QUICK_PRESET: StarQuickPreset = {
	id: "star_emax_2y",
	title: "Керамика E.max",
	subtitle: "2 года (24 мес.) • Срок сл. 10 лет",
	category: "ceramic_crown_veneer",
	materialName: "IPS e.max Press (дисиликат лития)",
	manufacturer: "Ivoclar Vivadent",
	country: "Лихтенштейн",
	warrantyMonths: 24,
	serviceLifeMonths: 120,
	serviceCode804n: "A16.07.004.002",
	statutoryNote: "Положение СтАР разд. 3 (безметалловая керамика E.max)",
};

export const STAR_ZIRCONIA_QUICK_PRESET: StarQuickPreset = {
	id: "star_zirconia_3y",
	title: "Диоксид циркония",
	subtitle: "3 года (36 мес.) • Срок сл. 15 лет",
	category: "ceramic_crown_veneer",
	materialName: "Katana Zirconia HTML/UTML",
	manufacturer: "Kuraray Noritake",
	country: "Япония",
	warrantyMonths: 36,
	serviceLifeMonths: 180,
	serviceCode804n: "A16.07.004.002",
	statutoryNote: "Положение СтАР разд. 3, ГК РФ ст. 720–724",
};

export const STAR_ORTHOPEDIC_QUICK_PRESETS: readonly StarQuickPreset[] = [
	STAR_EMAX_QUICK_PRESET,
	STAR_ZIRCONIA_QUICK_PRESET,
] as const;

export const CROWN_DECEMENTATION_DEFECT_TEMPLATE: WarrantyDefectTemplate = {
	defectType: "crown_decementation",
	code: "DEF-CROWN-02",
	title: "Расцементировка искусственной коронки / мостовидного протеза (0 ₽)",
	shortTitle: "Расцементировка коронки (0 ₽)",
	category: "ceramic_crown_veneer",
	recommendedAction: "Ультразвуковая и пескоструйная очистка реставрации, антисептическая обработка культи и повторная адгезивная фиксация",
	clinicalDescription: "Подвижность или самопроизвольное снятие коронки вследствие вымывания фиксирующего цемента.",
	defaultMaterials: [
		{ name: "Композитный фиксирующий цемент RelyX U200 / Fuji Plus", quantity: 1, unit: "доз." },
		{ name: "Раствор хлоргексидина биглюконата 2%", quantity: 5, unit: "мл" },
		{ name: "Праймер для керамики / металла", quantity: 1, unit: "доз." },
	],
	statutoryBasis: "Закон РФ № 2300-1 ст. 29, ГК РФ ст. 720–724 (Гарантийное восстановление фиксации)",
};

export const CERAMIC_CHIP_DEFECT_TEMPLATE: WarrantyDefectTemplate = {
	defectType: "ceramic_chip",
	code: "DEF-CHIP-03",
	title: "Скол облицовочной керамики / винира (0 ₽)",
	shortTitle: "Скол керамики (0 ₽)",
	category: "ceramic_crown_veneer",
	recommendedAction: "Клиническая шлифовка скола, силанизация керамики и послойное моделирование нанокомпозитом",
	clinicalDescription: "Поверхностный или краевой скол керамической массы без нарушения целостности каркаса.",
	defaultMaterials: [
		{ name: "Керамический праймер Monobond Plus / Silane", quantity: 1, unit: "доз." },
		{ name: "Светоотверждаемый нанокомпозит эмалевый / опаковый", quantity: 1, unit: "доз." },
		{ name: "Алмазная полировочная паста Diamond Polish", quantity: 1, unit: "доз." },
	],
	statutoryBasis: "Закон РФ № 2300-1 ст. 29 (Устранение дефекта ортопедической конструкции)",
};

export const DENTURE_FRACTURE_DEFECT_TEMPLATE: WarrantyDefectTemplate = {
	defectType: "denture_fracture",
	code: "DEF-PROSTH-05",
	title: "Трещина / перелом базиса съемного протеза (0 ₽)",
	shortTitle: "Поломка базиса протеза (0 ₽)",
	category: "removable_prosthesis",
	recommendedAction: "Снятие контрольного оттиска с протезом, лабораторная сварка/починка базиса пластмассой холодной полимеризации",
	clinicalDescription: "Линейная трещина или перелом акрилового базиса частичного/полного съемного протеза.",
	defaultMaterials: [
		{ name: "Базисная пластмасса холодной полимеризации (Vertex Castapress)", quantity: 1, unit: "порция" },
		{ name: "Оттискная альгинатная масса", quantity: 1, unit: "порция" },
	],
	statutoryBasis: "Закон РФ № 2300-1 ст. 29, Положение СтАР разд. 4",
};

export const ORTHOPEDIC_DEFECT_TEMPLATES = {
	crown_decementation: CROWN_DECEMENTATION_DEFECT_TEMPLATE,
	ceramic_chip: CERAMIC_CHIP_DEFECT_TEMPLATE,
	denture_fracture: DENTURE_FRACTURE_DEFECT_TEMPLATE,
} as const;

export const ORTHOPEDIC_MATERIALS: DentalMaterialMeta[] = [
	{
		id: "mat_emax_press",
		category: "ceramic_crown_veneer",
		name: "IPS e.max Press (Ivoclar Vivadent)",
		manufacturer: "Ivoclar Vivadent",
		country: "Лихтенштейн",
		type: "Стеклокерамика на основе дисиликата лития",
		warrantyMonthsDefault: 24,
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
		warrantyMonthsDefault: 36,
		serviceLifeMonthsDefault: 180,
		requiresLotNumber: true,
		popularShades: ["A1", "A2", "A3", "B1", "NW"],
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
];

/* --- SURGICAL & IMPLANT PRESETS & DEFECTS --- */

export const IMPLANT_FIXTURE_PRESET: WarrantyPreset = {
	category: "implant_fixture",
	code: "WAR-IMPL-03",
	serviceCode804n: "A16.07.006.002",
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
};

export const SURGICAL_IMPLANT_WARRANTY_PRESETS = {
	implant_fixture: IMPLANT_FIXTURE_PRESET,
} as const;

export const SCREW_LOOSENING_DEFECT_TEMPLATE: WarrantyDefectTemplate = {
	defectType: "screw_loosening",
	code: "DEF-SCREW-04",
	title: "Раскручивание / подвижность винта абатмента имплантата (0 ₽)",
	shortTitle: "Подвижность винта абатмента (0 ₽)",
	category: "implant_fixture",
	recommendedAction: "Снятие окклюзионной заглушки, ревизия шахты, замена/динамометрическая затяжка винта абатмента (30–35 Н·см)",
	clinicalDescription: "Ослабление резьбового соединения клинического винта абатмента при сохранной остеоинтеграции имплантата.",
	defaultMaterials: [
		{ name: "Клинический титановый винт абатмента", quantity: 1, unit: "шт" },
		{ name: "Тефлоновая лента (PTFE) изоляции шахты", quantity: 1, unit: "компл." },
		{ name: "Световой пломбировочный материал окклюзионного доступа", quantity: 1, unit: "доз." },
	],
	statutoryBasis: "Регламент СтАР по дентальной имплантологии, ГОСТ Р 55583",
};

export const SURGICAL_IMPLANT_DEFECT_TEMPLATES = {
	screw_loosening: SCREW_LOOSENING_DEFECT_TEMPLATE,
} as const;

export const SURGICAL_IMPLANT_MATERIALS: DentalMaterialMeta[] = [
	{
		id: "mat_straumann_slactive",
		category: "implant_fixture",
		name: "Straumann BLX / BLT SLActive Roxolid",
		manufacturer: "Straumann",
		country: "Швейцария",
		type: "Титано-циркониевый имплантат с гидрофильной поверхностью",
		warrantyMonthsDefault: 24,
		serviceLifeMonthsDefault: 240,
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
];

export const STAR_IMPLANT_QUICK_PRESET: StarQuickPreset = {
	id: "star_implant_lifetime",
	title: "Имплантация",
	subtitle: "Пожизненная завода • 10–20 лет",
	category: "implant_fixture",
	materialName: "Straumann BLX / BLT SLActive Roxolid",
	manufacturer: "Straumann",
	country: "Швейцария",
	warrantyMonths: 24,
	serviceLifeMonths: 240,
	serviceCode804n: "A16.07.006.002",
	statutoryNote: "Пожизненная гарантия завода на винт + 24 мес по Регламенту СтАР на остеоинтеграцию",
};

/* --- ORTHODONTIC PRESETS & DEFECTS --- */

export const ORTHODONTIC_ALIGNERS_PRESET: WarrantyPreset = {
	category: "orthodontic_aligners",
	code: "WAR-ORTHO-04",
	serviceCode804n: "A16.07.048.001",
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
};

export const ORTHODONTIC_WARRANTY_PRESETS = {
	orthodontic_aligners: ORTHODONTIC_ALIGNERS_PRESET,
} as const;

export const RETAINER_DEBONDING_DEFECT_TEMPLATE: WarrantyDefectTemplate = {
	defectType: "retainer_debonding",
	code: "DEF-ORTHO-06",
	title: "Отклейка несъемного проволочного ретейнера (0 ₽)",
	shortTitle: "Отклейка ретейнера (0 ₽)",
	category: "orthodontic_aligners",
	recommendedAction: "Пескоструйная очистка эмали, нанесение праймера и повторная фиксация звена ретейнера текучим композитом",
	clinicalDescription: "Отрыв фиксирующего композитного замка несъемного ретейнера от поверхности одного или нескольких зубов.",
	defaultMaterials: [
		{ name: "Ортодонтический текучий светоотверждаемый композит Transbond LR", quantity: 1, unit: "доз." },
		{ name: "Травильный гель 37%", quantity: 1, unit: "доз." },
	],
	statutoryBasis: "Клинические рекомендации Минздрава РФ по ортодонтии, ст. 29 Закона РФ № 2300-1",
};

export const ORTHODONTIC_DEFECT_TEMPLATES = {
	retainer_debonding: RETAINER_DEBONDING_DEFECT_TEMPLATE,
} as const;

export const ORTHODONTIC_MATERIALS: DentalMaterialMeta[] = [
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
];

/* --- MASTER REGISTRY & CATALOG --- */

export const WARRANTY_PRESETS: Record<WarrantyCategory, WarrantyPreset> = {
	composite_restoration: COMPOSITE_RESTORATION_PRESET,
	ceramic_crown_veneer: CERAMIC_CROWN_VENEER_PRESET,
	implant_fixture: IMPLANT_FIXTURE_PRESET,
	orthodontic_aligners: ORTHODONTIC_ALIGNERS_PRESET,
	removable_prosthesis: REMOVABLE_PROSTHESIS_PRESET,
	endodontic_treatment: ENDODONTIC_TREATMENT_PRESET,
	periodontal_splinting: PERIODONTAL_SPLINTING_PRESET,
	temporary_prosthesis: TEMPORARY_PROSTHESIS_PRESET,
};

export const DENTAL_MATERIALS_CATALOG: DentalMaterialMeta[] = [
	THERAPEUTIC_MATERIALS[0]!,
	THERAPEUTIC_MATERIALS[1]!,
	ORTHOPEDIC_MATERIALS[0]!,
	ORTHOPEDIC_MATERIALS[1]!,
	SURGICAL_IMPLANT_MATERIALS[0]!,
	SURGICAL_IMPLANT_MATERIALS[1]!,
	ORTHODONTIC_MATERIALS[0]!,
	ORTHOPEDIC_MATERIALS[2]!,
	THERAPEUTIC_MATERIALS[2]!,
];

export const STAR_QUICK_PRESETS: readonly StarQuickPreset[] = [
	STAR_COMPOSITE_QUICK_PRESET,
	...STAR_ORTHOPEDIC_QUICK_PRESETS,
	STAR_IMPLANT_QUICK_PRESET,
] as const;

export const WARRANTY_DEFECT_TEMPLATES: Record<WarrantyDefectType, WarrantyDefectTemplate> = {
	filling_loss: FILLING_LOSS_DEFECT_TEMPLATE,
	crown_decementation: CROWN_DECEMENTATION_DEFECT_TEMPLATE,
	ceramic_chip: CERAMIC_CHIP_DEFECT_TEMPLATE,
	screw_loosening: SCREW_LOOSENING_DEFECT_TEMPLATE,
	denture_fracture: DENTURE_FRACTURE_DEFECT_TEMPLATE,
	retainer_debonding: RETAINER_DEBONDING_DEFECT_TEMPLATE,
	occlusal_discomfort: OCCLUSAL_DISCOMFORT_DEFECT_TEMPLATE,
	custom_defect: CUSTOM_DEFECT_TEMPLATE,
};

export function getWarrantyPreset(category: WarrantyCategory): WarrantyPreset {
	return WARRANTY_PRESETS[category] || WARRANTY_PRESETS.composite_restoration;
}

export function getAllWarrantyPresets(): WarrantyPreset[] {
	return Object.values(WARRANTY_PRESETS);
}

export function getWarrantyDefectTemplate(defectType: WarrantyDefectType): WarrantyDefectTemplate {
	return WARRANTY_DEFECT_TEMPLATES[defectType] || WARRANTY_DEFECT_TEMPLATES.filling_loss;
}

export function getAllWarrantyDefectTemplates(): WarrantyDefectTemplate[] {
	return Object.values(WARRANTY_DEFECT_TEMPLATES);
}

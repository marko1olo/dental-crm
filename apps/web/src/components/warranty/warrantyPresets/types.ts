/**
 * ============================================================================
 * DENTAL WARRANTY PRESETS — DOMAIN TYPES & STATUTORY CONDITIONS (Layer 0)
 * Нормативная база гарантийных обязательств СтАР и Закон РФ № 2300-1 (ЗоЗПП).
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

/**
 * Типы клинических дефектов для 1-клик гарантийной переделки (0 ₽)
 * Мандат 8e: Свобода скидок и переделок врача
 */
export type WarrantyDefectType =
	| "filling_loss" // Выпадение / распломбировка / скол световой пломбы
	| "crown_decementation" // Расцементировка искусственной коронки / мостовидного протеза
	| "ceramic_chip" // Скол керамической облицовки / винира
	| "screw_loosening" // Раскручивание / подвижность винта абатмента имплантата
	| "denture_fracture" // Трещина / перелом базиса съемного протеза
	| "retainer_debonding" // Отклейка ортодонтического ретейнера / брекета
	| "occlusal_discomfort" // Окклюзионный дискомфорт / суперконтакт
	| "custom_defect"; // Индивидуальный клинический дефект

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

/**
 * 1-Клик нормативные пресеты гарантийных обязательств по СтАР (Мандат 8k & 8e)
 */
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

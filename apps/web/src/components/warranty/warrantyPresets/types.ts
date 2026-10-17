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

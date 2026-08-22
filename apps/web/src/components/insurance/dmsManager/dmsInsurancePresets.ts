/**
 * ============================================================================
 * STATUTORY RUSSIAN DMS INSURERS CATALOG, POLICY PRESETS & ORDER 804N RULES
 * Справочник страховых компаний РФ (СОГАЗ, Ингосстрах, РЕСО, Альфа, ВСК, Согласие),
 * программ ДМС, правил исключений и номенклатуры Минздрава РФ № 804н.
 * ============================================================================
 */

export type DmsInsurerId =
	| "sogaz"
	| "ingosstrakh"
	| "reso_garantiya"
	| "alfastrakhovanie"
	| "vsk"
	| "soglasie";

export type DmsProgramKey =
	| "standard_therapy"
	| "vip_full_coverage"
	| "extended_surgery_hygiene"
	| "economy_emergency_only";

export type DmsGuaranteeLetterStatus =
	| "active"
	| "exhausted"
	| "expired"
	| "cancelled";

export type DmsPreAuthApprovalStatus =
	| "approved"
	| "pending_preauth"
	| "rejected_exclusion"
	| "limit_exceeded"
	| "requires_letter";

/**
 * Реквизиты и параметры интеграции страховой компании РФ
 */
export interface DmsInsurerMetadata {
	readonly id: DmsInsurerId;
	readonly key: string;
	readonly shortName: string;
	readonly fullName: string;
	readonly inn: string;
	readonly ogrn: string;
	readonly kpp: string;
	readonly phone: string;
	readonly email: string;
	readonly portalUrl: string;
	readonly curatorDepartment: string;
	readonly defaultSlaHours: number;
	readonly statutoryRegulations2026: boolean;
	readonly supportedPrograms: readonly DmsProgramKey[];
	readonly standardTermsDescription: string;
	readonly requiresXrayForEndo: boolean;
	readonly requiresCtPreAuth: boolean;
}

/**
 * Параметры программы страхования ДМС
 */
export interface DmsProgramPolicyDefinition {
	readonly key: DmsProgramKey;
	readonly title: string;
	readonly subtitle: string;
	readonly defaultLimitKopecks: number;
	readonly isUnlimited: boolean;
	readonly maxHygienePerYear: number;
	readonly coversOrthodontics: boolean;
	readonly coversImplantation: boolean;
	readonly coversVeneers: boolean;
	readonly coversBleaching: boolean;
	readonly coversCt3D: boolean;
	readonly description: string;
}

/**
 * Правило исключения из страхового покрытия
 */
export interface DmsStatutoryExclusionRule {
	readonly ruleId: string;
	readonly code: string;
	readonly title: string;
	readonly reasonDescription: string;
	readonly matchingKeywords: readonly string[];
	readonly matchingNomenclatureCodes: readonly string[];
	readonly excludedInPrograms: readonly DmsProgramKey[];
	readonly allowsPreAuthOverride: boolean;
}

/**
 * Позиция номенклатуры медицинских услуг (Приказ Минздрава РФ № 804н)
 */
export interface DmsNomenclature804nItem {
	readonly code: string;
	readonly name: string;
	readonly category: "therapy" | "surgery" | "hygiene" | "orthopedics" | "orthodontics" | "radiology" | "anesthesia";
	readonly defaultPriceKopecks: number;
	readonly isBaseDmsCovered: boolean;
	readonly requiresToothNumber: boolean;
	readonly requiresXrayProof: boolean;
}

/**
 * Запись гарантийного письма страховой компании
 */
export interface DmsGuaranteeLetterRecord {
	readonly id: string;
	readonly letterNumber: string;
	readonly insurerId: DmsInsurerId;
	readonly insurerName: string;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly policyNumber: string;
	readonly programKey: DmsProgramKey;
	readonly issueDate: string; // YYYY-MM-DD
	readonly validUntil: string; // YYYY-MM-DD
	readonly totalLimitKopecks: number;
	readonly usedAmountKopecks: number;
	readonly approvedNomenclatureCodes: readonly string[];
	readonly approvedTeeth: readonly string[];
	readonly diagnosisMkb10: readonly string[];
	readonly status: DmsGuaranteeLetterStatus;
	readonly curatorFullName: string;
	readonly curatorPhone: string;
	readonly curatorEmail: string;
	readonly attachedXrayUris: readonly string[];
	readonly notes: string;
}

/**
 * 1. КАТАЛОГ ВЕДУЩИХ СТРАХОВЫХ КОМПАНИЙ РФ (ДМС-2026)
 */
export const STATUTORY_DMS_INSURERS: readonly DmsInsurerMetadata[] = [
	{
		id: "sogaz",
		key: "sogaz",
		shortName: "АО «СОГАЗ»",
		fullName: "Акционерное общество «Страховое общество газовой промышленности»",
		inn: "7736035485",
		ogrn: "1027739820921",
		kpp: "770801001",
		phone: "8 (800) 333-08-88",
		email: "dms@sogaz.ru",
		portalUrl: "https://b2b.sogaz.ru",
		curatorDepartment: "Департамент урегулирования медицинских убытков ДМС",
		defaultSlaHours: 24,
		statutoryRegulations2026: true,
		supportedPrograms: ["standard_therapy", "vip_full_coverage", "extended_surgery_hygiene", "economy_emergency_only"],
		standardTermsDescription: "100% покрытие терапии и хирургии по стандартам МЗ РФ. Эндодонтия только при наличии визиографии. Исключены виниры и имплантация.",
		requiresXrayForEndo: true,
		requiresCtPreAuth: true,
	},
	{
		id: "ingosstrakh",
		key: "ingosstrakh",
		shortName: "СПАО «Ингосстрах»",
		fullName: "Страховое публичное акционерное общество «Ингосстрах»",
		inn: "7705042179",
		ogrn: "1027739362474",
		kpp: "770501001",
		phone: "8 (495) 956-55-55",
		email: "med@ingos.ru",
		portalUrl: "https://med.ingos.ru",
		curatorDepartment: "Управление экспертизы стоматологических счетов",
		defaultSlaHours: 48,
		statutoryRegulations2026: true,
		supportedPrograms: ["standard_therapy", "vip_full_coverage", "extended_surgery_hygiene", "economy_emergency_only"],
		standardTermsDescription: "Согласование гарантийных писем через B2B-шлюз. Обязательна кодировка по Приказу 804н. Сооплата пациента при франшизе 10-20%.",
		requiresXrayForEndo: true,
		requiresCtPreAuth: true,
	},
	{
		id: "reso_garantiya",
		key: "reso_garantiya",
		shortName: "СПАО «РЕСО-Гарантия»",
		fullName: "Страховое публичное акционерное общество «РЕСО-Гарантия»",
		inn: "7710045520",
		ogrn: "1027700042413",
		kpp: "771001001",
		phone: "8 (800) 234-18-02",
		email: "dms-expert@reso.ru",
		portalUrl: "https://dms.reso.ru",
		curatorDepartment: "Отдел медицинской стоматологической экспертизы",
		defaultSlaHours: 24,
		statutoryRegulations2026: true,
		supportedPrograms: ["standard_therapy", "vip_full_coverage", "extended_surgery_hygiene"],
		standardTermsDescription: "Экспертиза электронных счетов за 24 часа. Плановое лечение при сумме свыше 25 000 руб строго по гарантийным письмам.",
		requiresXrayForEndo: true,
		requiresCtPreAuth: false,
	},
	{
		id: "alfastrakhovanie",
		key: "alfastrakhovanie",
		shortName: "АО «АльфаСтрахование»",
		fullName: "Акционерное общество «АльфаСтрахование»",
		inn: "7713056834",
		ogrn: "1027739795909",
		kpp: "772501001",
		phone: "8 (800) 333-0-999",
		email: "curator_dms@alfastrah.ru",
		portalUrl: "https://dms.alfastrah.ru",
		curatorDepartment: "Медицинский контакт-центр ДМС «АльфаСтрахование»",
		defaultSlaHours: 24,
		statutoryRegulations2026: true,
		supportedPrograms: ["standard_therapy", "vip_full_coverage", "extended_surgery_hygiene", "economy_emergency_only"],
		standardTermsDescription: "Цифровой шлюз API. Автоматический скоринг гарантийных писем. Исключены отбеливание, эстетические виниры и брекеты.",
		requiresXrayForEndo: true,
		requiresCtPreAuth: true,
	},
	{
		id: "vsk",
		key: "vsk",
		shortName: "САО «ВСК»",
		fullName: "Страховое акционерное общество «ВСК»",
		inn: "7710026574",
		ogrn: "1027700186062",
		kpp: "773101001",
		phone: "8 (800) 775-77-51",
		email: "dms_claims@vsk.ru",
		portalUrl: "https://b2b.vsk.ru",
		curatorDepartment: "Служба стоматологического контроля и курации",
		defaultSlaHours: 48,
		statutoryRegulations2026: true,
		supportedPrograms: ["standard_therapy", "vip_full_coverage", "extended_surgery_hygiene"],
		standardTermsDescription: "Годовой лимит на терапевтическое лечение до 120 000 руб. Обязательна фиксация номеров зубов по FDI и диагнозов МКБ-10.",
		requiresXrayForEndo: false,
		requiresCtPreAuth: true,
	},
	{
		id: "soglasie",
		key: "soglasie",
		shortName: "ООО «СК Согласие»",
		fullName: "Общество с ограниченной ответственностью «Страховая Компания «Согласие»",
		inn: "7706070733",
		ogrn: "1027700032700",
		kpp: "772901001",
		phone: "8 (800) 755-00-01",
		email: "dms-info@soglasie.ru",
		portalUrl: "https://lk.soglasie.ru",
		curatorDepartment: "Управление сопровождения договоров ДМС",
		defaultSlaHours: 48,
		statutoryRegulations2026: true,
		supportedPrograms: ["standard_therapy", "vip_full_coverage", "extended_surgery_hygiene", "economy_emergency_only"],
		standardTermsDescription: "Строгая проверка показаний при депульпировании, эндодонтия по гарантийным письмам, плановая гигиена 1 раз в год.",
		requiresXrayForEndo: true,
		requiresCtPreAuth: true,
	},
];

/**
 * 2. ПРОГРАММЫ СТРАХОВАНИЯ ДМС
 */
export const STATUTORY_DMS_PROGRAMS: Record<DmsProgramKey, DmsProgramPolicyDefinition> = {
	standard_therapy: {
		key: "standard_therapy",
		title: "Стандартная терапия и неотложная помощь",
		subtitle: "Базовый корпоративный пакет ДМС",
		defaultLimitKopecks: 10000000, // 100 000 руб
		isUnlimited: false,
		maxHygienePerYear: 1,
		coversOrthodontics: false,
		coversImplantation: false,
		coversVeneers: false,
		coversBleaching: false,
		coversCt3D: false,
		description: "Лечение кариеса, пульпита, периодонтита, местная анестезия, прицельная радиовизиография, удаление зубов по острой боли.",
	},
	vip_full_coverage: {
		key: "vip_full_coverage",
		title: "VIP Премиум (Полное покрытие)",
		subtitle: "Максимальный корпоративный пакет ДМС",
		defaultLimitKopecks: 30000000, // 300 000 руб
		isUnlimited: false,
		maxHygienePerYear: 2,
		coversOrthodontics: false,
		coversImplantation: false, // только по спецсогласованию
		coversVeneers: false,
		coversBleaching: false,
		coversCt3D: true,
		description: "Все виды терапевтического и хирургического лечения, профессиональная гигиена 2 раза в год, КЛКТ и ОПТГ без ограничений, ортопедия по согласованию.",
	},
	extended_surgery_hygiene: {
		key: "extended_surgery_hygiene",
		title: "Расширенная терапия, хирургия и гигиена",
		subtitle: "Оптимальный пакет для сотрудников",
		defaultLimitKopecks: 15000000, // 150 000 руб
		isUnlimited: false,
		maxHygienePerYear: 1,
		coversOrthodontics: false,
		coversImplantation: false,
		coversVeneers: false,
		coversBleaching: false,
		coversCt3D: false,
		description: "Терапевтическое лечение, удаление зубов любой сложности (включая ретинированные), резекция верхушек корней, профгигиена УЗ+AirFlow 1 раз в год.",
	},
	economy_emergency_only: {
		key: "economy_emergency_only",
		title: "Эконом (Неотложная помощь)",
		subtitle: "Минимальный пакет купирования острой боли",
		defaultLimitKopecks: 5000000, // 50 000 руб
		isUnlimited: false,
		maxHygienePerYear: 0,
		coversOrthodontics: false,
		coversImplantation: false,
		coversVeneers: false,
		coversBleaching: false,
		coversCt3D: false,
		description: "Купирование острого болевого синдрома, вскрытие периодонтального абсцесса, девитализация пульпы, экстренное удаление разрушенного зуба.",
	},
};

/**
 * 3. ПРАВИЛА ИСКЛЮЧЕНИЙ ИЗ ПОКРЫТИЯ ДМС
 */
export const STATUTORY_DMS_EXCLUSION_RULES: readonly DmsStatutoryExclusionRule[] = [
	{
		ruleId: "EXCL-01-IMPLANT",
		code: "A16.07.054",
		title: "Дентальная имплантация и остеопластика",
		reasonDescription: "Внутрикостная дентальная имплантация, установка формирователей десны, синус-лифтинг и костная пластика не входят в программы ДМС.",
		matchingKeywords: ["имплант", "имплантат", "имплантация", "синус-лифтинг", "остеопластика", "мембрана bio-oss"],
		matchingNomenclatureCodes: ["A16.07.054", "A16.07.054.001", "A16.07.041"],
		excludedInPrograms: ["standard_therapy", "extended_surgery_hygiene", "economy_emergency_only"],
		allowsPreAuthOverride: true,
	},
	{
		ruleId: "EXCL-02-VENEER",
		code: "A16.07.003",
		title: "Эстетическая ортопедия, виниры и накладки",
		reasonDescription: "Установка керамических виниров, люминиров и косметических коронок без признаков функционального разрушения зуба является исключением.",
		matchingKeywords: ["винир", "люминир", "e.max", "эстетическая накладка", "косметическая реставрация"],
		matchingNomenclatureCodes: ["A16.07.003", "A16.07.003.001"],
		excludedInPrograms: ["standard_therapy", "extended_surgery_hygiene", "economy_emergency_only", "vip_full_coverage"],
		allowsPreAuthOverride: false,
	},
	{
		ruleId: "EXCL-03-ORTHO",
		code: "A16.07.047",
		title: "Ортодонтическое лечение (брекеты, элайнеры)",
		reasonDescription: "Коррекция прикуса с применением несъемных брекет-систем, пластинок и прозрачных кап-элайнеров исключена из ДМС.",
		matchingKeywords: ["брекет", "элайнер", "ортодонт", "исправление прикуса", "ретейнер"],
		matchingNomenclatureCodes: ["A16.07.047", "A16.07.048"],
		excludedInPrograms: ["standard_therapy", "extended_surgery_hygiene", "economy_emergency_only", "vip_full_coverage"],
		allowsPreAuthOverride: false,
	},
	{
		ruleId: "EXCL-04-BLEACH",
		code: "A16.07.050",
		title: "Профессиональное отбеливание зубов",
		reasonDescription: "Клиническое фотоотбеливание (Zoom, Beyond, Amazing White) и домашнее химическое отбеливание не покрываются ДМС.",
		matchingKeywords: ["отбеливание", "zoom", "bleaching", "opalescence", "white"],
		matchingNomenclatureCodes: ["A16.07.050", "A16.07.050.001"],
		excludedInPrograms: ["standard_therapy", "extended_surgery_hygiene", "economy_emergency_only", "vip_full_coverage"],
		allowsPreAuthOverride: false,
	},
	{
		ruleId: "EXCL-05-CT3D",
		code: "A06.07.013",
		title: "Компьютерная 3D томография челюсти (КЛКТ)",
		reasonDescription: "3D томография требует отдельного гарантийного письма или специального согласования с врачом-куратором страховой компании.",
		matchingKeywords: ["ккт", "клкт", "компьютерная томография", "3d томография", "клко"],
		matchingNomenclatureCodes: ["A06.07.013"],
		excludedInPrograms: ["standard_therapy", "economy_emergency_only"],
		allowsPreAuthOverride: true,
	},
];

/**
 * 4. СПРАВОЧНИК СТОМАТОЛОГИЧЕСКИХ УСЛУГ ПО ПРИКАЗУ МИНЗДРАВА РФ № 804Н
 */
export const STATUTORY_804N_NOMENCLATURE: readonly DmsNomenclature804nItem[] = [
	// Терапия
	{
		code: "A16.07.002.001",
		name: "Восстановление зуба пломбой I, V, VI класс по Блэку (светоотверждаемый композит)",
		category: "therapy",
		defaultPriceKopecks: 380000, // 3 800 руб
		isBaseDmsCovered: true,
		requiresToothNumber: true,
		requiresXrayProof: false,
	},
	{
		code: "A16.07.002.002",
		name: "Восстановление зуба пломбой II, III класс по Блэку (лечение глубокого кариеса)",
		category: "therapy",
		defaultPriceKopecks: 450000, // 4 500 руб
		isBaseDmsCovered: true,
		requiresToothNumber: true,
		requiresXrayProof: false,
	},
	{
		code: "A16.07.002.003",
		name: "Восстановление зуба пломбой IV класс по Блэку (реставрация фронтальной группы)",
		category: "therapy",
		defaultPriceKopecks: 560000, // 5 600 руб
		isBaseDmsCovered: true,
		requiresToothNumber: true,
		requiresXrayProof: false,
	},
	{
		code: "A16.07.030.001",
		name: "Инструментальная и медикаментозная обработка 1 корневого канала",
		category: "therapy",
		defaultPriceKopecks: 210000, // 2 100 руб
		isBaseDmsCovered: true,
		requiresToothNumber: true,
		requiresXrayProof: true,
	},
	{
		code: "A16.07.008.002",
		name: "Пломбирование корневого канала зуба гуттаперчевыми штифтами (1 канал)",
		category: "therapy",
		defaultPriceKopecks: 240000, // 2 400 руб
		isBaseDmsCovered: true,
		requiresToothNumber: true,
		requiresXrayProof: true,
	},
	{
		code: "A16.07.004",
		name: "Наложение девитализирующей пасты (неотложная помощь при пульпите)",
		category: "therapy",
		defaultPriceKopecks: 150000, // 1 500 руб
		isBaseDmsCovered: true,
		requiresToothNumber: true,
		requiresXrayProof: false,
	},
	// Анестезия
	{
		code: "A11.07.010",
		name: "Инъекционное введение анестетика (инфильтрационная / проводниковая анестезия)",
		category: "anesthesia",
		defaultPriceKopecks: 95000, // 950 руб
		isBaseDmsCovered: true,
		requiresToothNumber: false,
		requiresXrayProof: false,
	},
	// Рентгенология
	{
		code: "A06.07.003",
		name: "Прицельная внутриротовая контактная радиовизиография",
		category: "radiology",
		defaultPriceKopecks: 65000, // 650 руб
		isBaseDmsCovered: true,
		requiresToothNumber: true,
		requiresXrayProof: false,
	},
	{
		code: "A06.07.004",
		name: "Ортопантомография челюстей (панорамный снимок ОПТГ)",
		category: "radiology",
		defaultPriceKopecks: 180000, // 1 800 руб
		isBaseDmsCovered: true,
		requiresToothNumber: false,
		requiresXrayProof: false,
	},
	{
		code: "A06.07.013",
		name: "Компьютерная томография челюстно-лицевой области (КЛКТ 3D)",
		category: "radiology",
		defaultPriceKopecks: 390000, // 3 900 руб
		isBaseDmsCovered: false,
		requiresToothNumber: false,
		requiresXrayProof: false,
	},
	// Гигиена
	{
		code: "A16.07.051",
		name: "Профессиональная гигиена полости рта и зубов (УЗ + AirFlow + полировка)",
		category: "hygiene",
		defaultPriceKopecks: 550000, // 5 500 руб
		isBaseDmsCovered: true,
		requiresToothNumber: false,
		requiresXrayProof: false,
	},
	// Хирургия
	{
		code: "A16.07.001",
		name: "Удаление постоянного зуба (простое)",
		category: "surgery",
		defaultPriceKopecks: 280000, // 2 800 руб
		isBaseDmsCovered: true,
		requiresToothNumber: true,
		requiresXrayProof: true,
	},
	{
		code: "A16.07.001.001",
		name: "Удаление зуба сложное с разъединением корней",
		category: "surgery",
		defaultPriceKopecks: 490000, // 4 900 руб
		isBaseDmsCovered: true,
		requiresToothNumber: true,
		requiresXrayProof: true,
	},
	{
		code: "A16.07.001.002",
		name: "Удаление ретинированного или дистопированного зуба «мудрости» (8-й зуб)",
		category: "surgery",
		defaultPriceKopecks: 850000, // 8 500 руб
		isBaseDmsCovered: true,
		requiresToothNumber: true,
		requiresXrayProof: true,
	},
	// Исключения (Ортодонтия, Имплантация, Эстетика)
	{
		code: "A16.07.054",
		name: "Внутрикостная дентальная имплантация (установка имплантата)",
		category: "surgery",
		defaultPriceKopecks: 3800000, // 38 000 руб
		isBaseDmsCovered: false,
		requiresToothNumber: true,
		requiresXrayProof: true,
	},
	{
		code: "A16.07.003",
		name: "Восстановление зуба керамическим виниром / люминиром",
		category: "orthopedics",
		defaultPriceKopecks: 3200000, // 32 000 руб
		isBaseDmsCovered: false,
		requiresToothNumber: true,
		requiresXrayProof: false,
	},
	{
		code: "A16.07.050",
		name: "Профессиональное клиническое отбеливание зубов (Zoom 4)",
		category: "hygiene",
		defaultPriceKopecks: 2600000, // 26 000 руб
		isBaseDmsCovered: false,
		requiresToothNumber: false,
		requiresXrayProof: false,
	},
	{
		code: "A16.07.047",
		name: "Ортодонтическая коррекция с применением брекет-системы",
		category: "orthodontics",
		defaultPriceKopecks: 6500000, // 65 000 руб
		isBaseDmsCovered: false,
		requiresToothNumber: false,
		requiresXrayProof: false,
	},
];

/**
 * 5. ПРЕДУСТАНОВЛЕННЫЕ ДЕМО-ГАРАНТИЙНЫЕ ПИСЬМА ДЛЯ ОПЕРАЦИОННОЙ РАБОТЫ
 */
export const SAMPLE_DMS_GUARANTEE_LETTERS: readonly DmsGuaranteeLetterRecord[] = [
	{
		id: "gl-sogaz-001",
		letterNumber: "ГП-СОГАЗ-2026-8812",
		insurerId: "sogaz",
		insurerName: "АО «СОГАЗ»",
		patientId: "pat-101",
		patientFullName: "Иванов Сергей Александрович",
		policyNumber: "СГЗ-77-991283",
		programKey: "standard_therapy",
		issueDate: "2026-08-01",
		validUntil: "2026-09-01",
		totalLimitKopecks: 5000000, // 50 000 руб
		usedAmountKopecks: 1250000, // 12 500 руб использовано
		approvedNomenclatureCodes: [
			"A16.07.002.001",
			"A16.07.002.002",
			"A16.07.030.001",
			"A16.07.008.002",
			"A11.07.010",
			"A06.07.003",
		],
		approvedTeeth: ["1.6", "1.5", "2.6"],
		diagnosisMkb10: ["K04.0", "K02.1"],
		status: "active",
		curatorFullName: "Смирнова Елена Викторовна",
		curatorPhone: "+7 (495) 739-21-40 доб. 312",
		curatorEmail: "e.smirnova@sogaz.ru",
		attachedXrayUris: ["/radiology/study-101-tooth16-periapical.png"],
		notes: "Согласовано эндодонтическое лечение зуба 1.6 по диагнозу K04.0 (Острый пульпит). Обязателен контрольный снимок обтурации.",
	},
	{
		id: "gl-ingos-002",
		letterNumber: "ИНГОС-МЕД-26-44091",
		insurerId: "ingosstrakh",
		insurerName: "СПАО «Ингосстрах»",
		patientId: "pat-102",
		patientFullName: "Кузнецова Ольга Дмитриевна",
		policyNumber: "ИНГ-902-11487",
		programKey: "extended_surgery_hygiene",
		issueDate: "2026-08-10",
		validUntil: "2026-09-15",
		totalLimitKopecks: 3500000, // 35 000 руб
		usedAmountKopecks: 0,
		approvedNomenclatureCodes: [
			"A16.07.001.002",
			"A11.07.010",
			"A06.07.004",
			"A16.07.051",
		],
		approvedTeeth: ["3.8", "4.8"],
		diagnosisMkb10: ["K01.1", "K05.0"],
		status: "active",
		curatorFullName: "Воронов Михаил Петрович",
		curatorPhone: "+7 (495) 956-55-55 доб. 881",
		curatorEmail: "m.voronov@ingos.ru",
		attachedXrayUris: ["/radiology/study-102-optg-retention.png"],
		notes: "Согласовано удаление ретинированных зубов мудрости 3.8 и 4.8 по показаниям дистопии и перикоронита.",
	},
	{
		id: "gl-reso-003",
		letterNumber: "РЕСО-ГАРАНТ-88210",
		insurerId: "reso_garantiya",
		insurerName: "СПАО «РЕСО-Гарантия»",
		patientId: "pat-103",
		patientFullName: "Петров Василий Николаевич",
		policyNumber: "РЕСО-994-0012",
		programKey: "vip_full_coverage",
		issueDate: "2026-07-15",
		validUntil: "2026-08-15",
		totalLimitKopecks: 10000000, // 100 000 руб
		usedAmountKopecks: 9800000,
		approvedNomenclatureCodes: [
			"A16.07.002.001",
			"A16.07.002.002",
			"A06.07.013",
			"A16.07.051",
		],
		approvedTeeth: ["1.1", "2.1", "2.2"],
		diagnosisMkb10: ["K02.1", "K05.1"],
		status: "expired",
		curatorFullName: "Алексеева Анна Сергеевна",
		curatorPhone: "+7 (800) 234-18-02",
		curatorEmail: "dms-expert@reso.ru",
		attachedXrayUris: [],
		notes: "Срок действия гарантийного письма истек 15.08.2026. Требуется продление через куратора.",
	},
];

/**
 * Хелперы поиска страховых компаний и программ
 */
export function getStatutoryInsurerById(id: string): DmsInsurerMetadata | undefined {
	return STATUTORY_DMS_INSURERS.find((ins) => ins.id === id || ins.key === id);
}

export function getStatutoryProgramByKey(key: DmsProgramKey): DmsProgramPolicyDefinition {
	return STATUTORY_DMS_PROGRAMS[key] ?? STATUTORY_DMS_PROGRAMS.standard_therapy;
}

export function getNomenclature804nByCode(code: string): DmsNomenclature804nItem | undefined {
	return STATUTORY_804N_NOMENCLATURE.find((item) => item.code === code);
}

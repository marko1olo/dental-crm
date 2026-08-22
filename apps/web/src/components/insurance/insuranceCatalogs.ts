/**
 * ============================================================================
 * RUSSIAN TOP DMS INSURANCE CATALOG & POLICY VALIDATOR
 * Каталог страховых компаний РФ, программ страхования, правил исключений ДМС
 * и валидатор страховых полисов с копеечной точностью.
 * ============================================================================
 */

export interface DmsInsurerDefinition {
	readonly id: string;
	readonly key: string;
	readonly shortName: string;
	readonly fullName: string;
	readonly inn: string;
	readonly ogrn: string;
	readonly phone: string;
	readonly email: string;
	readonly portalUrl: string;
	readonly defaultClaimSlaHours: number;
	readonly supportedPrograms: readonly DmsProgramType[];
	readonly standardTerms: string;
}

export type DmsProgramType = "base" | "extended" | "vip";

export interface DmsProgramDefinition {
	readonly type: DmsProgramType;
	readonly name: string;
	readonly description: string;
	readonly defaultLimitKopecks: number;
	readonly allowedCategories: readonly string[];
	readonly maxHygienePerYear: number;
}

export interface DmsExclusionRule {
	readonly id: string;
	readonly code: string;
	readonly title: string;
	readonly description: string;
	readonly matchingKeywords: readonly string[];
	readonly matchingNomenclaturePrefixes: readonly string[];
	readonly appliesToPrograms: readonly DmsProgramType[];
}

export interface DmsPolicy {
	readonly id: string;
	readonly insurerId: string;
	readonly policySeries?: string | undefined;
	readonly policyNumber: string;
	readonly program: DmsProgramType;
	readonly liabilityLimitKopecks: number;
	readonly franchiseType: "none" | "percent" | "fixed";
	readonly franchisePercent?: number | undefined;
	readonly franchiseFixedKopecks?: number | undefined;
	readonly validFrom: string;
	readonly validTo: string;
	readonly patientFullName: string;
	readonly patientBirthDate?: string | undefined;
	readonly specialConditions?: readonly string[] | undefined;
}

/**
 * 1. Каталог ведущих страховых компаний РФ по ДМС
 */
export const RUSSIAN_TOP_DMS_INSURERS: readonly DmsInsurerDefinition[] = [
	{
		id: "sogaz",
		key: "sogaz",
		shortName: "АО «СОГАЗ»",
		fullName: "Акционерное общество «Страховое общество газовой промышленности»",
		inn: "7736035485",
		ogrn: "1027739820921",
		phone: "8 (800) 333-08-88",
		email: "dms@sogaz.ru",
		portalUrl: "https://b2b.sogaz.ru",
		defaultClaimSlaHours: 24,
		supportedPrograms: ["base", "extended", "vip"],
		standardTerms: "Терапия и хирургия 100%, плановое лечение по ГП, исключена ортодонтия и имплантация.",
	},
	{
		id: "ingosstrakh",
		key: "ingosstrakh",
		shortName: "СПАО «Ингосстрах»",
		fullName: "Страховое публичное акционерное общество «Ингосстрах»",
		inn: "7705042179",
		ogrn: "1027739362474",
		phone: "8 (495) 956-55-55",
		email: "med@ingos.ru",
		portalUrl: "https://med.ingos.ru",
		defaultClaimSlaHours: 48,
		supportedPrograms: ["base", "extended", "vip"],
		standardTerms: "Покрытие по согласованию, франшиза 10-20% при расширенных опциях, строго по 804н.",
	},
	{
		id: "reso",
		key: "reso",
		shortName: "СПАО «РЕСО-Гарантия»",
		fullName: "Страховое публичное акционерное общество «РЕСО-Гарантия»",
		inn: "7710045520",
		ogrn: "1027700042413",
		phone: "8 (800) 234-18-02",
		email: "dms-expert@reso.ru",
		portalUrl: "https://reso.ru/dms",
		defaultClaimSlaHours: 24,
		supportedPrograms: ["base", "extended", "vip"],
		standardTerms: "Кураторская экспертиза счетов, согласование гарантийных писем до 3 рабочих дней.",
	},
	{
		id: "alfastrakh",
		key: "alfastrakh",
		shortName: "АО «АльфаСтрахование»",
		fullName: "Акционерное общество «АльфаСтрахование»",
		inn: "7713056834",
		ogrn: "1027739795909",
		phone: "8 (800) 333-0-999",
		email: "curator_dms@alfastrah.ru",
		portalUrl: "https://alfastrah.ru/med",
		defaultClaimSlaHours: 24,
		supportedPrograms: ["base", "extended", "vip"],
		standardTerms: "Цифровой шлюз согласования, исключены отбеливание, виниры и эстетика.",
	},
	{
		id: "vsk",
		key: "vsk",
		shortName: "САО «ВСК»",
		fullName: "Страховое акционерное общество «ВСК»",
		inn: "7710026574",
		ogrn: "1027700186062",
		phone: "8 (800) 775-77-51",
		email: "dms_claims@vsk.ru",
		portalUrl: "https://vsk.ru/dms",
		defaultClaimSlaHours: 48,
		supportedPrograms: ["base", "extended", "vip"],
		standardTerms: "Лимиты на терапию до 100 000 руб/год, обязательное указание номеров зубов и МКБ-10.",
	},
	{
		id: "rosgosstrakh",
		key: "rosgosstrakh",
		shortName: "ПАО СК «Росгосстрах»",
		fullName: "Публичное акционерное общество Страховая Компания «Росгосстрах»",
		inn: "7707067683",
		ogrn: "1027739049689",
		phone: "8 (800) 200-09-00",
		email: "dms@rgs.ru",
		portalUrl: "https://rgs.ru/dms",
		defaultClaimSlaHours: 48,
		supportedPrograms: ["base", "extended"],
		standardTerms: "Федеральная сеть, жесткие протоколы согласования планового протезирования.",
	},
	{
		id: "soglasie",
		key: "soglasie",
		shortName: "ООО «СК «Согласие»",
		fullName: "Общество с ограниченной ответственностью «Страховая Компания «Согласие»",
		inn: "7706070733",
		ogrn: "1027700032700",
		phone: "8 (800) 755-00-01",
		email: "dms-info@soglasie.ru",
		portalUrl: "https://soglasie.ru/dms",
		defaultClaimSlaHours: 24,
		supportedPrograms: ["base", "extended", "vip"],
		standardTerms: "Строгая проверка показаний при депульпировании, эндодонтия по гарантийным письмам.",
	},
	{
		id: "renins",
		key: "renins",
		shortName: "ПАО «Группа Ренессанс Страхование»",
		fullName: "Публичное акционерное общество «Группа Ренессанс Страхование»",
		inn: "7725497022",
		ogrn: "1187746796231",
		phone: "8 (800) 333-8-800",
		email: "med_expert@renins.com",
		portalUrl: "https://renins.ru/med",
		defaultClaimSlaHours: 24,
		supportedPrograms: ["base", "extended", "vip"],
		standardTerms: "Онлайн-авторизация приемов через API, моментальное подтверждение гарантийных писем.",
	},
];

/**
 * 2. Программы ДМС
 */
export const DMS_PROGRAMS: Record<DmsProgramType, DmsProgramDefinition> = {
	base: {
		type: "base",
		name: "Базовая стоматология",
		description: "Купирование острой боли, лечение кариеса и пульпита, простое удаление, прицельная радиовизиография.",
		defaultLimitKopecks: 6000000, // 60 000 руб
		allowedCategories: ["therapy_caries", "therapy_pulpitis", "surgery_simple", "radiology_periapical"],
		maxHygienePerYear: 1,
	},
	extended: {
		type: "extended",
		name: "Расширенная стоматология",
		description: "Базовый пакет + лечение периодонтита, сложное удаление, ОПТГ/КЛКТ, профгигиена 2 раза в год, физиотерапия.",
		defaultLimitKopecks: 15000000, // 150 000 руб
		allowedCategories: [
			"therapy_caries",
			"therapy_pulpitis",
			"therapy_periodontitis",
			"surgery_simple",
			"surgery_complex",
			"hygiene",
			"radiology_all",
		],
		maxHygienePerYear: 2,
	},
	vip: {
		type: "vip",
		name: "VIP / Премиум стоматология",
		description: "Полный терапевтический и хирургический комплекс, КЛКТ, седация, частичная ортопедия по травме, элитные материалы.",
		defaultLimitKopecks: 40000000, // 400 000 руб
		allowedCategories: [
			"therapy_caries",
			"therapy_pulpitis",
			"therapy_periodontitis",
			"surgery_simple",
			"surgery_complex",
			"hygiene",
			"radiology_all",
			"sedation",
			"prosthetics_limited",
		],
		maxHygienePerYear: 4,
	},
};

/**
 * 3. Типовые правила исключений ДМС
 */
export const DMS_EXCLUSION_RULES: readonly DmsExclusionRule[] = [
	{
		id: "excl_implant",
		code: "EXCL-01-ИМПЛ",
		title: "Дентальная имплантация и костная пластика",
		description: "Установка дентальных имплантатов, синус-лифтинг, мембранная остеопластика, забор костных блоков.",
		matchingKeywords: ["имплант", "имплантация", "синус-лифтинг", "остеопластик", "мембран", "аугментация"],
		matchingNomenclaturePrefixes: ["A16.07.006", "A16.07.041", "A16.07.054", "A16.07.055"],
		appliesToPrograms: ["base", "extended", "vip"],
	},
	{
		id: "excl_bleaching",
		code: "EXCL-02-ОТБЕЛ",
		title: "Эстетическое отбеливание зубов",
		description: "Клиническое фотоотбеливание (Zoom, Beyond), лазерное и домашнее отбеливание в каппах.",
		matchingKeywords: ["отбеливан", "zoom", "beyond", "bleaching", "осветление эмали"],
		matchingNomenclaturePrefixes: ["A16.07.050"],
		appliesToPrograms: ["base", "extended", "vip"],
	},
	{
		id: "excl_orthodontics",
		code: "EXCL-03-ОРТОДОНТ",
		title: "Ортодонтическое лечение и элайнеры",
		description: "Фиксация брекет-систем, исправление прикуса элайнерами, ортодонтические минивинты.",
		matchingKeywords: ["брекет", "элайнер", "ортодонт", "исправление прикуса", "ретейнер"],
		matchingNomenclaturePrefixes: ["A16.07.046", "A16.07.047", "A16.07.048"],
		appliesToPrograms: ["base", "extended", "vip"],
	},
	{
		id: "excl_veneers",
		code: "EXCL-04-ВИНИР",
		title: "Керамические и композитные виниры",
		description: "Эстетические накладки, люминиры, виниры из диоксида циркония или полевошпатной керамики.",
		matchingKeywords: ["винир", "люминир", "микропротез", "эстетическая накладка"],
		matchingNomenclaturePrefixes: ["A16.07.003", "A16.07.004"],
		appliesToPrograms: ["base", "extended"],
	},
	{
		id: "excl_frequent_hygiene",
		code: "EXCL-05-ГИГ-ЧАСТО",
		title: "Повторная профессиональная гигиена ранее установленного лимита",
		description: "Проведение профгигиены (Air-Flow, ультразвук) чаще, чем предусмотрено программой полиса (1 или 2 раза в год).",
		matchingKeywords: ["гигиен", "air-flow", "скейлинг", "чистка зубов", "порошкоструйн"],
		matchingNomenclaturePrefixes: ["A16.07.051", "A22.07.002"],
		appliesToPrograms: ["base", "extended"],
	},
	{
		id: "excl_cosmetic_surgery",
		code: "EXCL-06-КОСМ-ХИР",
		title: "Косметические и эстетические хирургические операции",
		description: "Пластика десневой улыбки (гингивэктомия) без признаков патологии пародонта, скайсы, украшения.",
		matchingKeywords: ["скайс", "украшение", "гингивопластика эстетическая", "страз"],
		matchingNomenclaturePrefixes: ["A16.07.058"],
		appliesToPrograms: ["base", "extended", "vip"],
	},
];

/**
 * Получить страховую компанию по ID
 */
export function getDmsInsurerById(id: string): DmsInsurerDefinition | undefined {
	return RUSSIAN_TOP_DMS_INSURERS.find((ins) => ins.id.toLowerCase() === id.toLowerCase());
}

/**
 * Валидатор полиса ДМС
 */
export function validateDmsPolicy(
	policy: Partial<DmsPolicy>,
	checkDate: string = new Date().toISOString().slice(0, 10),
): {
	isValid: boolean;
	errors: string[];
	warnings: string[];
} {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (!policy.insurerId || !getDmsInsurerById(policy.insurerId)) {
		errors.push("Не выбрана или не найдена страховая компания в реестре ДМС.");
	}

	if (!policy.policyNumber || policy.policyNumber.trim().length < 3) {
		errors.push("Номер страхового полиса ДМС должен содержать не менее 3 символов.");
	}

	if (!policy.patientFullName || policy.patientFullName.trim().length < 3) {
		errors.push("Ф.И.О. застрахованного пациента обязательно для заполнения.");
	}

	if (!policy.validFrom || !policy.validTo) {
		errors.push("Не указан срок действия страхового полиса (даты начала и окончания).");
	} else {
		const from = new Date(policy.validFrom).getTime();
		const to = new Date(policy.validTo).getTime();
		const current = new Date(checkDate).getTime();

		if (Number.isNaN(from) || Number.isNaN(to)) {
			errors.push("Некорректный формат дат срока действия полиса.");
		} else if (from > to) {
			errors.push("Дата начала действия полиса не может быть позже даты окончания.");
		} else {
			if (current < from) {
				errors.push(`Срок действия полиса еще не наступил (действителен с ${policy.validFrom}).`);
			}
			if (current > to) {
				errors.push(`Срок действия полиса истек (${policy.validTo}). Требуется продление или гарантийное письмо.`);
			}
			// Предупреждение об окончании действия в течение 14 дней
			const daysLeft = Math.floor((to - current) / (1000 * 60 * 60 * 24));
			if (daysLeft >= 0 && daysLeft <= 14) {
				warnings.push(`Внимание: срок действия полиса истекает через ${daysLeft} дн.`);
			}
		}
	}

	if (policy.liabilityLimitKopecks !== undefined && policy.liabilityLimitKopecks <= 0) {
		errors.push("Лимит ответственности по полису должен быть положительным числом.");
	}

	if (policy.franchiseType === "percent") {
		if (policy.franchisePercent === undefined || policy.franchisePercent < 0 || policy.franchisePercent > 100) {
			errors.push("Процент франшизы должен быть в диапазоне от 0% до 100%.");
		}
	} else if (policy.franchiseType === "fixed") {
		if (policy.franchiseFixedKopecks === undefined || policy.franchiseFixedKopecks < 0) {
			errors.push("Сумма фиксированной франшизы не может быть отрицательной.");
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
	};
}

/**
 * Проверка услуги на попадание под типовые исключения программы ДМС
 */
export function isServiceExcludedByDmsRules(
	serviceCode: string,
	serviceName: string,
	program: DmsProgramType,
	historyContext?: {
		lastHygieneDate?: string | undefined;
		currentVisitDate?: string | undefined;
	} | undefined,
): {
	isExcluded: boolean;
	rule?: DmsExclusionRule | undefined;
	reason?: string | undefined;
} {
	const lowerName = serviceName.toLowerCase();
	const cleanCode = serviceCode.trim().toUpperCase();

	for (const rule of DMS_EXCLUSION_RULES) {
		if (!rule.appliesToPrograms.includes(program)) {
			continue;
		}

		// Специальное правило для частоты профгигиены
		if (rule.id === "excl_frequent_hygiene") {
			const isHygiene =
				rule.matchingNomenclaturePrefixes.some((p) => cleanCode.startsWith(p)) ||
				rule.matchingKeywords.some((kw) => lowerName.includes(kw));

			if (isHygiene && historyContext?.lastHygieneDate) {
				const last = new Date(historyContext.lastHygieneDate).getTime();
				const now = new Date(historyContext.currentVisitDate || new Date().toISOString()).getTime();
				const monthsDiff = (now - last) / (1000 * 60 * 60 * 24 * 30.4375);

				const minMonths = program === "base" ? 12 : 6;
				if (monthsDiff < minMonths) {
					return {
						isExcluded: true,
						rule,
						reason: `Профгигиена не покрывается: прошло ${monthsDiff.toFixed(1)} мес. с прошлого раза (лимит программы «${DMS_PROGRAMS[program].name}» — не чаще 1 раза в ${minMonths} мес).`,
					};
				}
			}
			continue;
		}

		// Проверка по префиксу номенклатуры 804н
		const matchesPrefix = rule.matchingNomenclaturePrefixes.some((prefix) => cleanCode.startsWith(prefix));
		// Проверка по ключевым словам
		const matchesKeyword = rule.matchingKeywords.some((kw) => lowerName.includes(kw));

		if (matchesPrefix || matchesKeyword) {
			return {
				isExcluded: true,
				rule,
				reason: `Услуга «${serviceName}» входит в список исключений ДМС: ${rule.title} (${rule.code}).`,
			};
		}
	}

	return { isExcluded: false };
}

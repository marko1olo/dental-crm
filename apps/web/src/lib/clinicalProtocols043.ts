import {
	isValidFdiToothNumber,
	synthesizeProtocolFromOrder804nService,
	enrichDiaryFrom804nServices,
	ORDER_804N_PROTOCOL_DEFINITIONS,
	type Order804nProtocolDefinition,
} from "@dental/shared";

export {
	synthesizeProtocolFromOrder804nService,
	enrichDiaryFrom804nServices,
	ORDER_804N_PROTOCOL_DEFINITIONS,
	type Order804nProtocolDefinition,
};

export interface DiaryState {
	anamnesis: string;
	statusLocalis: string;
	diagnosisIcd10: string;
	diagnosisTooth: string;
	treatmentDescription: string;
	complications: string;
	comorbidities: string;
}
import {
	ANESTHESIA_DRUGS,
	calculateAnesthesiaSafety,
	checkAnesthesiaSomaticContraindications,
	type AnesthesiaDrugKey,
	type SomaticRiskProfile,
} from "../components/visit/anesthesiaCalculatorEngine.js";

/** Поверхности зуба по стандарту стоматологической карты */
export type ToothSurfaceKey = "O" | "M" | "D" | "B" | "V" | "L" | "P";

export interface OdontogramFindingInput {
	/** Номер зуба по FDI (11–48, 51–85) */
	readonly toothNumber: number;
	/** Состояние из схемы одонтограммы или клинический статус */
	readonly state:
		| "Caries"
		| "Pulpitis"
		| "Periodontitis"
		| "Gingivitis"
		| "Filled"
		| "Crown"
		| "Implant"
		| "Planned_Implant"
		| "Missing"
		| "Healthy"
		| "Extraction"
		| "to_extract"
		| "Hygiene"
		| string;
	/** Поражённые поверхности (B, L, M, D, O, V, P) */
	readonly surfaces?: readonly string[] | readonly ToothSurfaceKey[];
	/** Явный код МКБ-10 (если выбран вручную) */
	readonly icd10Override?: string;
	/** Степень / форма (например, "deep", "medium", "initial", "acute", "chronic", "root") */
	readonly subType?:
		| "initial"
		| "medium"
		| "deep"
		| "root"
		| "acute"
		| "chronic"
		| string;
	/** Глубина пародонтального кармана в мм (для K05) */
	readonly pocketDepthMm?: number;
}

export interface ClinicalProtocolSoap {
	readonly toothNumber: number;
	readonly toothNameRu: string;
	readonly diagnosisIcd10: string;
	readonly diagnosisIcd10Label: string;
	readonly diagnosisTooth: string;
	readonly anamnesis: string; // S
	readonly statusLocalis: string; // O
	readonly treatmentDescription: string; // P
	readonly recommendations?: string; // Рекомендации пациенту
	readonly complications?: string;
	readonly comorbidities?: string;
}

export type MergeStrategy = "smart_append" | "fill_blanks_only" | "replace";

export interface MergeSoapOptions {
	readonly strategy?: MergeStrategy;
	readonly deduplicate?: boolean;
	readonly sectionHeader?: boolean;
}

/** Пресет рекомендации пациенту */
export interface PatientRecommendationItem {
	readonly id: string;
	readonly label: string;
	readonly category: "general" | "post_op" | "surgery" | "hygiene" | "perio";
	readonly text: string;
}

/** Набор стандартизированных клинических рекомендаций пациенту */
export const PATIENT_RECOMMENDATIONS: readonly PatientRecommendationItem[] = [
	{
		id: "cold_pack",
		label: "🧊 Холод местно",
		category: "surgery",
		text: "Холод на область щеки (пакет со льдом через полотенце) по 15 минут с перерывами каждые 30 минут в течение первых 3-4 часов.",
	},
	{
		id: "nids_pain",
		label: "💊 НПВС при боли",
		category: "post_op",
		text: "При болевом синдроме: Нимесил 100 мг или Ибупрофен 400 мг по 1 таб./пакетику после еды (не более 2-3 раз в сутки).",
	},
	{
		id: "soft_diet",
		label: "🍲 Щадящая диета",
		category: "general",
		text: "Щадящая диета: исключить грубую, острую, слишком горячую и холодную пищу, жевать на противоположной стороне 2-3 дня.",
	},
	{
		id: "no_rinse_clot",
		label: "🚫 Не полоскать активно",
		category: "surgery",
		text: "Категорически запрещено активное полоскание полости рта во избежание вымывания кровяного сгустка из лунки.",
	},
	{
		id: "white_diet",
		label: "☕ Белая диета 48ч",
		category: "hygiene",
		text: "«Белая диета» 48 часов: исключить чай, кофе, красное вино, ягоды, шоколад, свеклу и красящие соусы.",
	},
	{
		id: "antiseptic_baths",
		label: "🧴 Ванночки с антисептиком",
		category: "perio",
		text: "Ротовые ванночки с 0.05% раствором Хлоргексидина или Мирамистина по 1 минуте 3 раза в день после еды (без активного бульканья) в течение 5-7 дней.",
	},
	{
		id: "soft_brush",
		label: "🪥 Мягкая зубная щетка",
		category: "hygiene",
		text: "Замена зубной щетки на мягкую (Soft), деликатная гигиеническая чистка без травматизации оперированной / леченной зоны.",
	},
	{
		id: "composite_warranty",
		label: "🛡️ Гарантия на пломбу (12–24 мес)",
		category: "general",
		text: "Гарантийный срок на световую композитную реставрацию составляет 12–24 месяца (срок службы 24–36 месяцев) при условии соблюдения индивидуальной гигиены полости рта и прохождения профилактического осмотра не реже 1 раза в 6 месяцев.",
	},
	{
		id: "followup_check",
		label: "📅 Контрольный осмотр",
		category: "general",
		text: "Явка на контрольный осмотр через 7-10 дней. При возникновении непроходящей боли, отека или кровотечения — немедленно связаться с клиникой.",
	},
];

/** Конфигурация для расчета гарантийного срока реставрации */
export interface RestorationWarrantyConfig {
	readonly toothNumber?: number | string | undefined;
	readonly surfacesCount?: number | undefined;
	readonly surfaces?: readonly string[] | readonly ToothSurfaceKey[] | undefined;
	readonly material?: "composite" | "gic" | "ceramic" | "amalgam" | string | undefined;
	readonly cariesRisk?: "low" | "medium" | "high" | undefined;
	readonly months?: number | undefined;
	readonly serviceLifeMonths?: number | undefined;
}

/** Результат расчета гарантии на реставрацию */
export interface RestorationWarrantyResult {
	readonly warrantyMonths: number;
	readonly serviceLifeMonths: number;
	readonly warrantyTextRu: string;
	readonly formattedWarrantyNote: string;
}

/**
 * Автоматический расчет гарантийного срока на композитную реставрацию (12–24 мес)
 * согласно клиническим рекомендациям СтАР и Закону РФ «О защите прав потребителей».
 *
 * Правила:
 * - 1 поверхность (I, V класс): 24 мес (срок службы: 36 мес / 3 года)
 * - 2 поверхности (II класс, MO/OD): 18 мес (срок службы: 36 мес)
 * - 3+ поверхности (II класс MOD, IV класс, ИРОПЗ > 0.4): 12 мес (срок службы: 24 мес / 2 года)
 * - Высокий кариесогенный риск: 12 мес (срок службы: 24 мес)
 */
export function calculateCompositeRestorationWarranty(
	config?: RestorationWarrantyConfig,
): RestorationWarrantyResult {
	const numSurfaces = config?.surfaces?.length ?? config?.surfacesCount ?? 1;
	const isHighRisk = config?.cariesRisk === "high";

	let warrantyMonths = 24;
	let serviceLifeMonths = 36;

	if (numSurfaces >= 3 || isHighRisk) {
		warrantyMonths = 12;
		serviceLifeMonths = 24;
	} else if (numSurfaces === 2) {
		warrantyMonths = 18;
		serviceLifeMonths = 36;
	}

	if (config?.months !== undefined) {
		warrantyMonths = config.months;
	}
	if (config?.serviceLifeMonths !== undefined) {
		serviceLifeMonths = config.serviceLifeMonths;
	}

	const toothSuffix = config?.toothNumber ? ` на зуб ${config.toothNumber}` : "";
	const surfaceSuffix =
		config?.surfaces && config.surfaces.length > 0
			? ` (${config.surfaces.join(", ")})`
			: "";
	const warrantyTextRu = `Гарантийный срок на световую композитную реставрацию${toothSuffix}${surfaceSuffix}: ${warrantyMonths} мес. (срок службы: ${serviceLifeMonths} мес.).`;
	const formattedWarrantyNote = `Гарантийные обязательства:\n- ${warrantyTextRu}\n- Условия сохранения гарантии: соблюдение индивидуальной гигиены полости рта, контрольный профилактический осмотр и проведение профессиональной гигиены не реже 1 раза в 6 месяцев.`;

	return {
		warrantyMonths,
		serviceLifeMonths,
		warrantyTextRu,
		formattedWarrantyNote,
	};
}

/**
 * Неразрушающее добавление гарантийного срока в поле P (Лечение и рекомендации) SOAP-дневника.
 */
export function appendCompositeWarrantyToSoap(
	diary: DiaryState,
	warranty?: Partial<RestorationWarrantyConfig>,
): DiaryState {
	const cur = (diary.treatmentDescription ?? "").trim();
	const res = calculateCompositeRestorationWarranty(warranty);
	if (
		cur.includes("Гарантийный срок на") ||
		cur.includes("Гарантийные обязательства:")
	) {
		return diary;
	}
	const nextTreatment = cur
		? `${cur}\n\n${res.formattedWarrantyNote}`
		: res.formattedWarrantyNote;

	return {
		...diary,
		treatmentDescription: nextTreatment,
	};
}

/** Названия квадрантов зубов по FDI */
const QUADRANT_NAMES: Record<number, string> = {
	1: "верхний правый",
	2: "верхний левый",
	3: "нижний левый",
	4: "нижний правый",
	5: "верхний правый временный",
	6: "верхний левый временный",
	7: "нижний левый временный",
	8: "нижний правый временный",
};

/** Названия постоянных зубов по позиции в квадранте (1–8) */
const PERMANENT_TOOTH_NAMES: Record<number, string> = {
	1: "центральный резец",
	2: "латеральный резец",
	3: "клык",
	4: "первый премоляр",
	5: "второй премоляр",
	6: "первый моляр",
	7: "второй моляр",
	8: "третий моляр (зуб мудрости)",
};

/** Названия молочных (временных) зубов по позиции в квадранте (1–5) */
const PRIMARY_TOOTH_NAMES: Record<number, string> = {
	1: "центральный резец",
	2: "латеральный резец",
	3: "клык",
	4: "первый моляр",
	5: "второй моляр",
};

/** Поверхности зуба на русском языке */
const SURFACE_NAMES_RU: Record<string, string> = {
	O: "окклюзионная (жевательная)",
	M: "мезиальная (медиальная)",
	D: "дистальная",
	B: "вестибулярная (щечная)",
	V: "вестибулярная (щечная/губная)",
	L: "язычная",
	P: "нёбная",
};

/**
 * Получить полное анатомическое название зуба по номеру FDI.
 * Пример: 16 -> "16 (верхний правый первый моляр)"
 */
export function getToothAnatomicalNameRu(toothNumber: number): string {
	if (!isValidFdiToothNumber(toothNumber)) {
		return `Зуб ${toothNumber}`;
	}
	const quadrant = Math.floor(toothNumber / 10);
	const pos = toothNumber % 10;
	const quadName = QUADRANT_NAMES[quadrant] ?? "";
	const isPrimary = quadrant >= 5 && quadrant <= 8;
	const toothType = isPrimary
		? (PRIMARY_TOOTH_NAMES[pos] ?? "зуб")
		: (PERMANENT_TOOTH_NAMES[pos] ?? "зуб");

	return `${toothNumber} (${quadName} ${toothType})`;
}

/**
 * Расшифровка номеров зубов простым русским языком (народное + анатомическое).
 * Пример:
 * - 16 -> "16: Верхняя правая шестерка (первый моляр)"
 * - 11 -> "11: Верхняя правая единица (центральный резец)"
 * - 38 -> "38: Нижний левый зуб мудрости (восьмерка)"
 * - 55 -> "55: Верхняя правая молочная пятерка (второй моляр)"
 */
export function getToothFolkAndAnatomicalNameRu(toothNumber: number): string {
	if (!isValidFdiToothNumber(toothNumber)) {
		return `Зуб ${toothNumber}`;
	}
	const quadrant = Math.floor(toothNumber / 10);
	const pos = toothNumber % 10;
	const isPrimary = quadrant >= 5 && quadrant <= 8;

	let locationPrefix = "";
	switch (quadrant) {
		case 1: locationPrefix = "Верхняя правая"; break;
		case 2: locationPrefix = "Верхняя левая"; break;
		case 3: locationPrefix = "Нижняя левая"; break;
		case 4: locationPrefix = "Нижняя правая"; break;
		case 5: locationPrefix = "Верхняя правая молочная"; break;
		case 6: locationPrefix = "Верхняя левая молочная"; break;
		case 7: locationPrefix = "Нижняя левая молочная"; break;
		case 8: locationPrefix = "Нижняя правая молочная"; break;
		default: locationPrefix = "Зуб"; break;
	}

	if (toothNumber === 18 || toothNumber === 28) {
		return `${toothNumber}: ${quadrant === 1 ? "Верхний правый" : "Верхний левый"} зуб мудрости (восьмерка)`;
	}
	if (toothNumber === 38 || toothNumber === 48) {
		return `${toothNumber}: ${quadrant === 4 ? "Нижний правый" : "Нижний левый"} зуб мудрости (восьмерка)`;
	}

	const folkNumbers: Record<number, string> = {
		1: "единица",
		2: "двойка",
		3: "тройка",
		4: "четверка",
		5: "пятерка",
		6: "шестерка",
		7: "семерка",
		8: "восьмерка",
	};

	const folkName = folkNumbers[pos] ?? "зуб";
	const anatomicalType = isPrimary
		? (PRIMARY_TOOTH_NAMES[pos] ?? "зуб")
		: (PERMANENT_TOOTH_NAMES[pos] ?? "зуб");

	return `${toothNumber}: ${locationPrefix} ${folkName} (${anatomicalType})`;
}

/**
 * Форматирование списка поверхностей зуба в читаемую строку.
 */
export function formatSurfacesRu(surfaces?: readonly string[]): string {
	if (!surfaces || surfaces.length === 0) return "коронковой части";
	const mapped = surfaces
		.map((s) => s.trim().toUpperCase())
		.map((s) => SURFACE_NAMES_RU[s] || s);
	return mapped.join(", ");
}

/**
 * Сортировка и дедупликация списка зубов по клиническому порядку FDI.
 */
export function normalizeFdiToothList(
	toothInput: string | readonly (number | string)[],
): string {
	const rawTokens = Array.isArray(toothInput)
		? toothInput.map(String)
		: String(toothInput).split(/[,;\s]+/);

	const validNumbers = Array.from(
		new Set(
			rawTokens
				.map((t) => Number.parseInt(t.trim(), 10))
				.filter((n) => !Number.isNaN(n) && isValidFdiToothNumber(n)),
		),
	);

	// Клинический порядок обхода:
	// Q1: 18 -> 11, Q2: 21 -> 28, Q3: 38 -> 31, Q4: 41 -> 48
	// Q5: 55 -> 51, Q6: 61 -> 65, Q7: 75 -> 71, Q8: 81 -> 85
	validNumbers.sort((a, b) => {
		const quadA = Math.floor(a / 10);
		const quadB = Math.floor(b / 10);
		if (quadA !== quadB) return quadA - quadB;
		if (quadA === 1 || quadA === 5) return b - a; // 18 -> 11
		if (quadA === 3 || quadA === 7) return b - a; // 38 -> 31
		return a - b; // 21 -> 28, 41 -> 48
	});

	return validNumbers.join(", ");
}

/**
 * Генерация структурированного клинического протокола SOAP (Форма 043/у)
 * из находки на одонтограмме.
 */
export function generateSoapFromOdontogramFinding(
	finding: OdontogramFindingInput,
): ClinicalProtocolSoap {
	const tooth = finding.toothNumber;
	const toothTitle = getToothAnatomicalNameRu(tooth);
	const surfacesStr = formatSurfacesRu(finding.surfaces);
	const stateNorm = (finding.state || "Caries").toLowerCase();

	// 1. КАРИЕС (K02 / K02.0 / K02.1 / K02.2)
	if (stateNorm === "caries" || stateNorm.startsWith("k02")) {
		const isDeep = finding.subType === "deep";
		const isInitial = finding.subType === "initial";
		const isRoot = finding.subType === "root" || stateNorm.startsWith("k02.2");
		const icd =
			finding.icd10Override ||
			(isInitial ? "K02.0" : isRoot ? "K02.2" : "K02.1");
		const icdLabel = isInitial
			? "Кариес эмали"
			: isRoot
				? "Кариес цемента / корня"
				: isDeep
					? "Кариес дентина (глубокий)"
					: "Кариес дентина (средний)";

		const anamnesis = isInitial
			? `Жалобы на эстетический дефект эмали в области зуба ${toothTitle} (${surfacesStr}), шероховатость. Болевые ощущения отсутствуют.`
			: isRoot
				? `Жалобы на повышенную чувствительность и болезненность при чистке зубов в пришеечной области зуба ${toothTitle}.`
				: isDeep
					? `Жалобы на боли в области зуба ${toothTitle} от механических, температурных и химических раздражителей (холодное, сладкое), сохраняющиеся некоторое время после устранения причины, застревание пищи на ${surfacesStr} поверхности.`
					: `Жалобы на кратковременные боли в зубе ${toothTitle} от температурных и химических раздражителей (холодное, сладкое), быстро проходящие после прекращения действия фактора, застревание пищи в области ${surfacesStr} поверхности.`;

		const statusLocalis = isInitial
			? `Зуб ${toothTitle}: Кариозное поражение в стадии пятна на ${surfacesStr} поверхности. При осмотре: матовое меловидное пятно с потерей естественного блеска эмали. Зондирование безболезненно. ЭОД — 4-6 мкА.`
			: isRoot
				? `Зуб ${toothTitle}: Кариозный дефект в пришеечной зоне и на поверхности корня. Зондирование болезненно, размягчение цемента корня. Десна гиперемирована.`
				: isDeep
					? `Зуб ${toothTitle}: Кариозное поражение на ${surfacesStr} поверхности. При осмотре: глубокая кариозная полость в пределах околопульпарного дентина, выполненная размягчённым пигментированным дентином. Зондирование дна болезненно. ЭОД — 15-20 мкА.`
					: `Зуб ${toothTitle}: Кариозное поражение на ${surfacesStr} поверхности. При осмотре: кариозная полость средней глубины в пределах плащевого дентина. Дно и стенки плотные, пигментированные. Зондирование болезненно по эмалево-дентинной границе. Перкуссия безболезненна. ЭОД — 6-8 мкА.`;

		const numSurfaces = finding.surfaces?.length ?? 1;
		const warranty = calculateCompositeRestorationWarranty({
			toothNumber: tooth,
			surfaces: finding.surfaces,
			surfacesCount: numSurfaces,
			cariesRisk: isDeep ? "high" : "medium",
		});

		const treatmentDescription = isInitial
			? `Зуб ${tooth}: Профессиональная гигиена и очищение поверхности. Медикаментозная антисептическая обработка. Аппликация реминерализирующей системы Icon / глубокое фторирование эмали фторлаком. Полировка.`
			: isRoot
				? `Анестезия (Артикаин 4% 1.7 мл). Препарирование пришеечной кариозной полости зуба ${tooth}, антисептическая обработка полости (хлоргексидин 2%). Реставрация светоотверждаемым стеклоиономерным цементом (СИЦ) / компомером с моделированием анатомической формы. Шлифовка, полировка, защитный лак.\n\n${warranty.formattedWarrantyNote}`
				: isDeep
					? `Препарирование кариозной полости зуба ${tooth} на ${surfacesStr} поверхности, полная щадящая некрэктомия. Изоляция коффердамом. Антисептическая медикаментозная обработка полости 2% раствором хлоргексидина биглюконата. Лечебная прокладка Ca(OH)2 точечно на дно, изолирующая прокладка СИЦ. Адгезивный протокол: кислотное травление 37% ортофосфорной кислотой (etching), нанесение адгезивной системы (adhesive: праймер + бонд), фотополимеризация 20 сек. Послойное моделирование наногибридным светоотверждаемым композитом (composite layer) с восстановлением окклюзионной анатомии и контактного пункта. Окклюзионная пришлифовка по копирке, шлифовка и полировка (polishing: диски, полиры, паста) до сухого зеркального блеска.\n\n${warranty.formattedWarrantyNote}`
					: `Препарирование кариозной полости зуба ${tooth} на ${surfacesStr} поверхности, полная некрэктомия, формирование эмалевого фальца. Изоляция рабочего поля коффердамом. Медикаментозная антисептическая обработка 2% раствором хлоргексидина биглюконата. Кислотное травление эмали и дентина 37% ортофосфорной кислотой (etching: эмаль 20 сек, дентин 10 сек), тщательное смывание водой, деликатное подсушивание воздухом. Нанесение адгезивной системы (adhesive: праймер + бонд), экспозиция и втирание 20 сек, раздувание, фотополимеризация 20 сек. Послойное моделирование наногибридным светоотверждаемым композитом (composite layer) с восстановлением анатомических бугров, фиссур и контактного пункта. Окклюзионная коррекция по копирке, шлифовка и финишная полировка (polishing: алмазные боры, диски, силиконовые головки, полировочная паста) до сухого зеркального блеска.\n\n${warranty.formattedWarrantyNote}`;

		return {
			toothNumber: tooth,
			toothNameRu: toothTitle,
			diagnosisIcd10: icd,
			diagnosisIcd10Label: icdLabel,
			diagnosisTooth: String(tooth),
			anamnesis,
			statusLocalis,
			treatmentDescription,
			recommendations: `Не принимать пищу в течение 2 часов до окончания действия анестезии. Щадящая диета 2-3 дня. Гарантийный срок на реставрацию: ${warranty.warrantyMonths} мес. Контрольный осмотр и профгигиена через 6 месяцев.`,
		};
	}

	// 2. ПУЛЬПИТ (K04 / K04.0)
	if (
		stateNorm === "pulpitis" ||
		stateNorm.startsWith("k04.0") ||
		stateNorm === "k04"
	) {
		const icd = finding.icd10Override || "K04.0";
		const icdLabel = "Пульпит";

		const anamnesis = `Жалобы на самопроизвольные острые приступообразные боли в области зуба ${toothTitle}, значительно усиливающиеся в ночное время и от действия термических раздражителей (особенно холодного/горячего). Боль иррадиирует по ходу ветвей тройничного нерва. Болевой приступ длится более 15–30 минут после устранения раздражителя.`;

		const statusLocalis = `Зуб ${toothTitle}: Пульпит. На ${surfacesStr} поверхности определяется глубокая кариозная полость, заполненная размягчённым дентином, сообщающаяся с полостью зуба. Зондирование вскрытой точки рога пульпы резко болезненно, сопровождается кровоточивостью. Перкуссия зуба слабочувствительна. Термопроба резко положительна с длительным болевым последействием. ЭОД — 25-45 мкА. Рентгенограмма: глубокий дефект твердых тканей, периодонтальная щель без патологических изменений.`;

		const treatmentDescription = `Зуб ${tooth}: Эндодонтическое лечение. Инфильтрационная/проводниковая анестезия (Артикаин 4% с эпинефрином 1:100 000 / 1:200 000, 1.7 мл). Препарирование кариозной полости, раскрытие полости зуба, создание прямолинейного эндодонтического доступа. Изоляция коффердамом. Витальная экстирпация пульпы / девитализация. Определение рабочей длины корневых каналов электронным апекслокатором и контрольной визиографией. Механическая инструментальная обработка каналов NiTi ротационными файлами (canal instrumentation) по методике Crown-Down с обильной медикаментозной ирригацией 3% гипохлоритом натрия (NaOCl) и 17% ЭДТА с ультразвуковой активацией. Высушивание стерильными бумажными штифтами. Временная лечебная паста Calcept (гидроксид кальция) под герметичную повязку / трехмерная обтурация каналов гуттаперчей с эпоксидным силером (gutta-percha obturation) методом латеральной/вертикальной конденсации. Рентген-контроль обтурации. Восстановление коронковой части зуба композитом.`;

		return {
			toothNumber: tooth,
			toothNameRu: toothTitle,
			diagnosisIcd10: icd,
			diagnosisIcd10Label: icdLabel,
			diagnosisTooth: String(tooth),
			anamnesis,
			statusLocalis,
			treatmentDescription,
			recommendations:
				"При болях — НПВС (Нимесил 100 мг / Ибупрофен 400 мг) по 1 таб. после еды. Не жевать на причинную сторону 2-3 дня. Контрольный осмотр через 7-14 дней.",
		};
	}

	// 3. ПЕРИОДОНТИТ (K04.5 / K04.4)
	if (
		stateNorm === "periodontitis" ||
		stateNorm.startsWith("k04.4") ||
		stateNorm.startsWith("k04.5")
	) {
		const isAcute =
			finding.subType === "acute" || stateNorm.startsWith("k04.4");
		const icd = finding.icd10Override || (isAcute ? "K04.4" : "K04.5");
		const icdLabel = isAcute
			? "Острый апикальный периодонтит"
			: "Хронический апикальный периодонтит";

		const anamnesis = isAcute
			? `Жалобы на постоянную локализованную ноющую и пульсирующую боль в зубе ${toothTitle}, резко усиливающуюся при малейшем накусывании и прикосновении. Ощущение «выросшего зуба», отёчность прилежащей десны.`
			: `Жалобы на незначительный дискомфорт или чувство тяжести в области зуба ${toothTitle} при накусывании и жевании твёрдой пищи, изменение цвета коронки. В анамнезе зуб ранее лечен или подвергался травме.`;

		const statusLocalis = isAcute
			? `Коронка зуба ${toothTitle} изменена в цвете / глубокая кариозная полость / пломба. Полость зуба вскрыта, зондирование устьев каналов безболезненно. Вертикальная и горизонтальная перкуссия резко болезненна. Пальпация по переходной складке в области верхушки корня болезненна, слизистая гиперемирована, отечна. Реакция на холод/тепло отсутствует. ЭОД > 100 мкА. Рентгенологически: расширение периодонтальной щели в области верхушки корня.`
			: `Коронка зуба ${toothTitle} девитализирована, серый оттенок / дефект пломбы. Зондирование безболезненно. Перкуссия слабочувствительна или безболезненна. Пальпация по переходной складке безболезненна. ЭОД > 100 мкА. Рентгенограмма: у верхушки корня определяется очаг деструкции костной ткани с четкими/нечеткими контурами (периапикальный очаг).`;

		const treatmentDescription = isAcute
			? `Инфильтрационная/проводниковая анестезия (Артикаин 4% с эпинефрином 1:100 000 / 1:200 000, 1.7 мл). Создание эндодонтического доступа зуба ${tooth}, раскрытие полости, эвакуация распада из корневых каналов для создания оттока экссудата. Изоляция коффердамом. Определение рабочей длины. Инструментальная обработка каналов, обильная антисептическая ирригация (antiseptic irrigation: 0.05% хлоргексидин, теплый физраствор). Временное введение противовоспалительной пасты под герметичную повязку. Назначены НПВС, щадящая диета. Повторный прием через 3–5 дней.`
			: `Инфильтрационная/проводниковая анестезия (Артикаин 4% с эпинефрином 1:100 000 / 1:200 000, 1.7 мл). Раскрытие полости зуба ${tooth}, удаление старого пломбировочного материала / распломбировка и ревизия корневых каналов (canal desobturation). Прохождение каналов до физиологического апекса под контролем апекслокатора. Механическая и медикаментозная антисептическая обработка (NaOCl 3%, 2% хлоргексидин, ЭДТА 17%, УЗ-активация — antiseptic irrigation). Временная обтурация корневых каналов пастой на основе гидроксида кальция Calcept (calcium hydroxide) с целью антисептического воздействия и стимуляции остеогенеза. Постановка герметичной временной пломбы (Cavit / СИЦ). Контрольный визит через 10-14 дней для постоянного пломбирования.`;

		return {
			toothNumber: tooth,
			toothNameRu: toothTitle,
			diagnosisIcd10: icd,
			diagnosisIcd10Label: icdLabel,
			diagnosisTooth: String(tooth),
			anamnesis,
			statusLocalis,
			treatmentDescription,
			recommendations:
				"Щадящая диета, НПВС при боли (Нимесил 100 мг), ротовые ванночки с 0.05% хлоргексидином. Явка на контрольный прием через 10-14 дней.",
		};
	}

	// 4. ГИНГИВИТ / ПАРОДОНТИТ / ПРОФГИГИЕНА (K05 / K05.0 / K05.1 / K05.3 / Z01.2)
	if (
		stateNorm === "gingivitis" ||
		stateNorm.startsWith("k05") ||
		stateNorm.includes("perio") ||
		stateNorm === "hygiene"
	) {
		const isPeriodontitis =
			stateNorm.includes("periodontitis") ||
			stateNorm.startsWith("k05.3") ||
			(finding.pocketDepthMm !== undefined && finding.pocketDepthMm > 3);
		const depth = finding.pocketDepthMm ?? (isPeriodontitis ? 4 : 2);
		const icd =
			finding.icd10Override ||
			(isPeriodontitis
				? "K05.3"
				: stateNorm === "gingivitis" || stateNorm.startsWith("k05.1")
					? "K05.1"
					: "K05.0");
		const icdLabel = isPeriodontitis
			? "Хронический пародонтит"
			: "Острый/хронический гингивит, зубные отложения";

		const anamnesis = isPeriodontitis
			? `Жалобы на кровоточивость десен при чистке зубов и приеме пищи в области зуба ${toothTitle}, подвижность зуба, неприятный запах изо рта, оголение шеек зубов, попадание пищи в межзубные промежутки.`
			: `Жалобы на наличие темного налета на зубах, зубной камень, кровоточивость и отечность десен при чистке зубов в области зуба ${toothTitle}, несвежее дыхание.`;

		const statusLocalis = isPeriodontitis
			? `Десна в области зуба ${toothTitle} отёчна, застойная гиперемия, цианотична. Обильные над- и поддесневые зубные отложения. Глубина пародонтального кармана составляет ${depth} мм с серозно-гнойным экссудатом при компрессии. Патологическая подвижность I-II степени. На рентгенограмме: деструкция костной ткани межальвеолярных перегородок до 1/3–1/2 длины корня.`
			: `Маргинальный и папиллярный край десны в области зуба ${toothTitle} гиперемирован, отёчен, кровоточит при зондировании (индекс кровоточивости PBI > 1). Зубодесневое прикрепление сохранено, глубина кармана до 2-3 мм. Обильный мягкий зубной налет и плотные минерализованные над- и поддесневые зубные отложения.`;

		const treatmentDescription = isPeriodontitis
			? `Аппликационная и инфильтрационная анестезия. Ультразвуковой скейлинг (ultrasonic scaling) и над/поддесневая обработка аппаратом Air-Flow (Air-Flow polishing). Закрытый кюретаж пародонтального кармана в области зуба ${tooth} кюретами Грейси. Антисептическая ирригация 0.05% раствором хлоргексидина биглюконата. Инстилляция противовоспалительного пародонтального геля (Метрогил Дента). Обучение индивидуальной гигиене, подбор межзубных ершиков и монопучковых щеток. Контрольный осмотр через 10-14 дней.`
			: `Индикация зубного налета. Аппликационная анестезия десны. Ультразвуковой скейлинг с удалением массивных минерализованных над- и поддесневых зубных отложений (ultrasonic scaling). Снятие пигментированного налета водно-порошкоструйным аппаратом Air-Flow (порошок глицин/эритритол) (Air-Flow polishing). Полировка всех поверхностей зубов абразивной пастой Cleanic и щеточками. Межзубные промежутки очищены флоссом и штрипсами. Глубокое фторирование эмали препаратом Clinpro White Varnish / фторлаком (Clinpro fluoridation). Обучение гигиене, индивидуальный подбор средств ухода.`;

		return {
			toothNumber: tooth,
			toothNameRu: toothTitle,
			diagnosisIcd10: icd,
			diagnosisIcd10Label: icdLabel,
			diagnosisTooth: String(tooth),
			anamnesis,
			statusLocalis,
			treatmentDescription,
			recommendations:
				"«Белая диета» 48 часов (без кофе, чая, ягод, свеклы). Замена зубной щетки на новую. Профилактический осмотр через 6 месяцев.",
		};
	}

	// 5a. УДАЛЕНИЕ ВРЕМЕННОГО ЗУБА / ФИЗИОЛОГИЧЕСКАЯ СМЕНА (K00.6 / Primary Teeth 51–85)
	const isPrimary = tooth >= 51 && tooth <= 85;
	if (
		isPrimary &&
		(stateNorm === "extraction" ||
			stateNorm === "to_extract" ||
			stateNorm === "missing" ||
			stateNorm === "exfoliation" ||
			stateNorm === "resorption" ||
			stateNorm.startsWith("k00.6"))
	) {
		const icd = finding.icd10Override || "K00.6";
		const icdLabel = "Нарушения прорезывания зубов (физиологическая смена временного зуба)";
		const anamnesis = `Жалобы на подвижность временного зуба ${toothTitle}, дискомфорт при приеме твердой пищи, физиологическая смена зуба.`;
		const statusLocalis = `Зуб ${toothTitle}: Временный зуб. Физиологическая резорбция корней III степени (сохранена только коронковая часть). Подвижность зуба II-III степени. Слизистая оболочка бледно-розовая, без воспаления. Зачаток постоянного зуба в фазе прорезывания.`;
		const treatmentDescription = `Аппликационная анестезия десны (гель Лидокаин 15% / Дисилан со вкусом клубники). Бережная люксация и удаление подвижной коронки временного зуба ${tooth} детскими анатомическими щипцами. Ревизия лунки. Гемостаз марлевым шариком (2-3 мин). Устойчивый кровяной сгусток. Выданы рекомендации родителям и ребенку.`;
		return {
			toothNumber: tooth,
			toothNameRu: toothTitle,
			diagnosisIcd10: icd,
			diagnosisIcd10Label: icdLabel,
			diagnosisTooth: String(tooth),
			anamnesis,
			statusLocalis,
			treatmentDescription,
			recommendations:
				"Не пить и не принимать пищу 1.5–2 часа. Не полоскать рот активно (сохранять сгусток). Щадящая диета 1-2 дня. Медаль/подарок за смелость.",
		};
	}

	// 5. УДАЛЕНИЕ ЗУБА / ОТСУТСТВИЕ (Extraction / to_extract / Missing / K08.1 / K01.1)
	if (
		stateNorm === "extraction" ||
		stateNorm === "to_extract" ||
		stateNorm === "missing" ||
		stateNorm.startsWith("k08.1") ||
		stateNorm.startsWith("k01.1")
	) {
		const isPlannedExtraction =
			stateNorm === "extraction" || stateNorm === "to_extract";
		const icd =
			finding.icd10Override || (stateNorm === "k01.1" ? "K01.1" : "K08.1");
		const icdLabel =
			stateNorm === "k01.1"
				? "Ретинированные зубы (показание к удалению)"
				: isPlannedExtraction
					? "Разрушение зуба, подлежащего удалению"
					: "Потеря зубов вследствие удаления или несчастного случая";

		const anamnesis = isPlannedExtraction
			? `Жалобы на разрушение коронковой части зуба ${toothTitle}, невозможность терапевтического и ортопедического восстановления, периодические ноющие боли или подвижность.`
			: `Жалобы на отсутствие зуба ${toothTitle}, нарушение жевательной эффективности и эстетики зубного ряда. Удаление зуба в анамнезе.`;

		const statusLocalis = isPlannedExtraction
			? `Зуб ${toothTitle}: Полное разрушение коронковой части зуба ниже уровня десны / подвижность зуба III степени / дистопированный полуретинированный зуб. Слизистая оболочка вокруг зуба гиперемирована, отёчна. По данным визиографии: разрушение бифуркации корней, очаг деструкции костной ткани.`
			: `Зуб ${toothTitle}: Отсутствует. Слизистая оболочка альвеолярного отростка в области дефекта бледно-розовая, плотная, без признаков воспаления. Высота и толщина костного гребня достаточна для дентальной имплантации.`;

		const treatmentDescription = isPlannedExtraction
			? `Инфильтрационная и проводниковая анестезия (Артикаин 4% с эпинефрином 1:100 000 1.7 мл) (infiltration anesthesia). Синдесмотомия — отслоение круговой связки зуба на глубину 3-5 мм распатором. Наложение анатомических щипцов / прямого или углового элеватора, люксация, элевация, аккуратная тракция зуба из альвеолы без повреждения костных стенок (elevator/forceps). Тщательный ревизионный кюретаж лунки острой кюретажной ложкой, удаление грануляций и костных отломков (socket curettage). Гемостаз: формирование устойчивого кровяного сгустка, гемостатическая губка с антисептиком / Альвостаз (hemostasis). Сближение краев лунки, наложение узловых швов (suture: Викрил 4-0). Давящий марлевый тампон на 20 минут.`
			: `Зуб ${tooth}: Рекомендована консультация ортопеда и имплантолога. Составлен комплексный план лечения: установка дентального имплантата с последующим протезированием.`;

		return {
			toothNumber: tooth,
			toothNameRu: toothTitle,
			diagnosisIcd10: icd,
			diagnosisIcd10Label: icdLabel,
			diagnosisTooth: String(tooth),
			anamnesis,
			statusLocalis,
			treatmentDescription,
			recommendations: isPlannedExtraction
				? "1. Холод на область щеки по 15 мин первые 3-4 часа.\n2. Не полоскать рот активно (сохранять сгусток).\n3. Исключить бани, сауны и спорт на 3 дня.\n4. Щадящая диета.\n5. НПВС при боли (Нимесил 100 мг).\n6. Контрольный осмотр через 7-10 дней."
				: "Плановый контрольный визит для дентальной имплантации и ортопедического восстановления.",
		};
	}

	// 6. ПЛОМБА / РАНЕЕ ЛЕЧЕННЫЙ ЗУБ (Filled)
	if (stateNorm === "filled") {
		const icd = finding.icd10Override || "K02.1";
		const icdLabel = "Кариес дентина (вторичный/рецидивирующий)";

		return {
			toothNumber: tooth,
			toothNameRu: toothTitle,
			diagnosisIcd10: icd,
			diagnosisIcd10Label: icdLabel,
			diagnosisTooth: String(tooth),
			anamnesis: `Жалобы на застревание пищи в области зуба ${toothTitle}, скол края старой пломбы на ${surfacesStr} поверхности, дискомфорт при жевании.`,
			statusLocalis: `Зуб ${toothTitle}: На ${surfacesStr} поверхности определяется старая композитная реставрация с нарушением краевого прилегания и вторичным кариозным процессом под пломбой. Зондирование по краю пломбы болезненно.`,
			treatmentDescription: `Зуб ${tooth}: Снятие несостоятельной пломбы, полная некрэктомия вторичного кариеса, изоляция коффердамом, медикаментозная обработка 2% хлоргексидином, адгезивный протокол (etching + primer/bond), послойная прямая композитная реставрация наногибридом, шлифовка, полировка до зеркального блеска, окклюзионный контроль.`,
			recommendations:
				"Не принимать пищу 2 часа до окончания действия анестезии. Щадящая диета 2-3 дня.",
		};
	}

	// 7. КОРОНКА / ОРТОПЕДИЯ (Crown / Z51.8)
	if (stateNorm === "crown") {
		const icd = finding.icd10Override || "Z51.8";
		const icdLabel = "Ортопедическое лечение (коронка)";

		return {
			toothNumber: tooth,
			toothNameRu: toothTitle,
			diagnosisIcd10: icd,
			diagnosisIcd10Label: icdLabel,
			diagnosisTooth: String(tooth),
			anamnesis: `Плановое обращение на этап ортопедического лечения зуба ${toothTitle}. Жалобы на разрушение твердых тканей зуба более 50% (ИРОПЗ > 0.6).`,
			statusLocalis: `Зуб ${toothTitle}: Коронковая часть зуба значительно разрушена, зуб девитализирован, корневые каналы качественно обтурированы по данным рентгенографии. Десна без признаков воспаления.`,
			treatmentDescription: `Зуб ${tooth}: Анестезия (Артикаин 4% 1.7 мл). Препарирование культи зуба под искусственную коронку с созданием циркулярного уступа Chamfer (0.8 мм). Ретракция десны ретракционной нитью 00. Получение прецизионного двухслойного силиконового оттиска (А-силикон) и оттиска антагонистов. Изготовление и фиксация провизорной пластмассовой коронки на временный цемент TempBond.`,
			recommendations:
				"Щадящая диета, аккуратная гигиена в области временной коронки. При расцементировке обратиться в клинику.",
		};
	}

	// 8. ИМПЛАНТАТ (Implant / Planned_Implant)
	if (stateNorm === "implant" || stateNorm.startsWith("plan")) {
		const isPlanned = stateNorm.startsWith("plan");
		const icd = finding.icd10Override || (isPlanned ? "K08.1" : "Z51.8");
		const icdLabel = isPlanned
			? "Планирование дентальной имплантации"
			: "Состояние после дентальной имплантации";

		return {
			toothNumber: tooth,
			toothNameRu: toothTitle,
			diagnosisIcd10: icd,
			diagnosisIcd10Label: icdLabel,
			diagnosisTooth: String(tooth),
			anamnesis: isPlanned
				? `Пациент обратился для планирования дентальной имплантации в области отсутствующего зуба ${toothTitle}.`
				: `Плановый осмотр после установки дентального имплантата в позиции зуба ${toothTitle}. Жалоб нет.`,
			statusLocalis: isPlanned
				? `Зуб ${toothTitle}: Альвеолярный гребень без признаков патологических процессов, толщина и плотность кости достаточна по данным 3D КЛКТ.`
				: `Зуб ${toothTitle}: Установлен дентальный имплантат. Формирователь десны стабилен, окружающая слизистая бледно-розовая, признаков периимплантита нет.`,
			treatmentDescription: isPlanned
				? `Зуб ${tooth}: 3D-планирование имплантации, выбор размера имплантата и хирургического протокола установки.`
				: `Зуб ${tooth}: Контрольный осмотр, антисептическая обработка области имплантата, контроль остеоинтеграции по визиографии.`,
			recommendations:
				"Плановый контрольный осмотр по графику диспансерного наблюдения.",
		};
	}

	// 9. ЗДОРОВЫЙ ЗУБ (Healthy / Z01.2)
	const icd = finding.icd10Override || "Z01.2";
	return {
		toothNumber: tooth,
		toothNameRu: toothTitle,
		diagnosisIcd10: icd,
		diagnosisIcd10Label: "Стоматологическое обследование",
		diagnosisTooth: String(tooth),
		anamnesis: `Жалоб со стороны зуба ${toothTitle} пациент не предъявляет. Профилактический осмотр.`,
		statusLocalis: `Зуб ${toothTitle}: Интактен. Твердые ткани без кариозных поражений. Зондирование безболезненно. Десна плотно прилежит.`,
		treatmentDescription: `Зуб ${tooth}: Профилактический осмотр. Очищение поверхности, покрытие фторлаком.`,
		recommendations:
			"Регулярная гигиена 2 раза в день, профилактический осмотр через 6 месяцев.",
	};
}

/**
 * Неразрушающее слияние (Non-Destructive Merge) данных SOAP-дневника.
 */
export function mergeSoapDiaryState(
	existing: DiaryState,
	incoming: Partial<DiaryState> | ClinicalProtocolSoap,
	options?: MergeSoapOptions,
): DiaryState {
	const strategy = options?.strategy ?? "smart_append";
	const deduplicate = options?.deduplicate ?? true;

	if (strategy === "replace") {
		return {
			anamnesis: incoming.anamnesis ?? existing.anamnesis,
			statusLocalis: incoming.statusLocalis ?? existing.statusLocalis,
			diagnosisIcd10: incoming.diagnosisIcd10 ?? existing.diagnosisIcd10,
			diagnosisTooth: incoming.diagnosisTooth
				? normalizeFdiToothList(incoming.diagnosisTooth)
				: existing.diagnosisTooth,
			treatmentDescription:
				incoming.treatmentDescription ?? existing.treatmentDescription,
			complications: incoming.complications ?? existing.complications,
			comorbidities: incoming.comorbidities ?? existing.comorbidities,
		};
	}

	const mergeText = (current: string, next?: string | null): string => {
		const curTrim = (current ?? "").trim();
		const nextTrim = (next ?? "").trim();
		if (!nextTrim) return curTrim;
		if (!curTrim) return nextTrim;

		if (strategy === "fill_blanks_only") {
			return curTrim;
		}

		// smart_append
		if (deduplicate && curTrim.includes(nextTrim)) {
			return curTrim;
		}

		return `${curTrim}\n\n${nextTrim}`;
	};

	// Слияние списка зубов по FDI
	const mergeTeeth = (
		currentTooth: string,
		nextTooth?: string | null,
	): string => {
		const curTrim = (currentTooth ?? "").trim();
		const nextTrim = (nextTooth ?? "").trim();
		if (!nextTrim) return curTrim;
		if (!curTrim) return normalizeFdiToothList(nextTrim);
		return normalizeFdiToothList(`${curTrim}, ${nextTrim}`);
	};

	// Слияние МКБ-10
	const mergeIcd10 = (currentIcd: string, nextIcd?: string | null): string => {
		const curTrim = (currentIcd ?? "").trim();
		const nextTrim = (nextIcd ?? "").trim();
		if (!curTrim) return nextTrim;
		if (strategy === "fill_blanks_only") return curTrim;
		return curTrim; // Код МКБ оставляем основным первым кодом
	};

	return {
		anamnesis: mergeText(existing.anamnesis, incoming.anamnesis),
		statusLocalis: mergeText(existing.statusLocalis, incoming.statusLocalis),
		diagnosisIcd10: mergeIcd10(
			existing.diagnosisIcd10,
			incoming.diagnosisIcd10,
		),
		diagnosisTooth: mergeTeeth(
			existing.diagnosisTooth,
			incoming.diagnosisTooth,
		),
		treatmentDescription: mergeText(
			existing.treatmentDescription,
			incoming.treatmentDescription,
		),
		complications: mergeText(existing.complications, incoming.complications),
		comorbidities: mergeText(existing.comorbidities, incoming.comorbidities),
	};
}

/**
 * 100% неразрушающее применение услуги Номенклатуры 804н к SOAP-дневнику врача.
 * Гарантирует сохранение ранее введенного врачом текста (жалобы, статус, сопутствующие патологии).
 */
export function applyOrder804nServiceToSoapDiary(
	current: DiaryState,
	code804n: string,
	toothNumber?: number | string,
): DiaryState {
	const def = synthesizeProtocolFromOrder804nService(
		code804n,
		toothNumber !== undefined ? { toothNumber } : undefined,
	);

	const currentAnamnesis = (current.anamnesis ?? "").trim();
	const nextAnamnesis = currentAnamnesis || def.defaultSubjective || "";

	const currentStatus = (current.statusLocalis ?? "").trim();
	const nextStatus = currentStatus || def.defaultStatusLocalis || "";

	const currentTreatment = (current.treatmentDescription ?? "").trim();
	let nextTreatment = currentTreatment;
	if (def.protocolStepRu && !currentTreatment.includes(def.protocolStepRu)) {
		nextTreatment = currentTreatment
			? `${currentTreatment}\n\n${def.protocolStepRu}`
			: def.protocolStepRu;
	}

	const currentIcd = (current.diagnosisIcd10 ?? "").trim();
	const nextIcd = currentIcd || def.primaryIcd10;

	const currentTooth = (current.diagnosisTooth ?? "").trim();
	const nextTooth = toothNumber
		? (currentTooth ? normalizeFdiToothList(`${currentTooth}, ${toothNumber}`) : String(toothNumber))
		: currentTooth;

	return {
		anamnesis: nextAnamnesis,
		statusLocalis: nextStatus,
		diagnosisIcd10: nextIcd,
		diagnosisTooth: nextTooth,
		treatmentDescription: nextTreatment,
		complications: current.complications ?? "",
		comorbidities: current.comorbidities ?? "",
	};
}

/** Быстрый клинический шаблон (1-Click Fast Clinical Preset) */
export interface FastClinicalPreset {
	readonly id: string;
	readonly label: string;
	readonly badge: string;
	readonly description: string;
	readonly defaultIcd10: string;
	readonly anamnesis: string;
	readonly statusLocalis: string;
	readonly treatmentDescription: string;
	readonly recommendations?: string;
	readonly complications?: string;
	readonly comorbidities?: string;
}

/** 5 ключевых клинических протоколов стоматологического приёма */
export const CLINICAL_FAST_PRESETS: readonly FastClinicalPreset[] = [
	{
		id: "caries_dentin",
		label: "Кариес дентина",
		badge: "K02.1",
		description:
			"Анестезия, препарирование, медобработка, травление, адгезив, пломба композитом светового отверждения, полировка, гарантия 12–24 мес.",
		defaultIcd10: "K02.1",
		anamnesis:
			"Жалобы на кратковременные боли от температурных (холодное, горячее) и химических (сладкое, кислое) раздражителей, застревание пищи в межзубном промежутке.",
		statusLocalis:
			"При осмотре: кариозная полость средней глубины в пределах дентина. Зондирование слабоболезненно по эмалево-дентинной границе, дно и стенки плотные, пигментированные. Перкуссия безболезненна. Холодовая проба слабоположительная, быстропроходящая. ЭОД 6–8 мкА.",
		treatmentDescription:
			"Инфильтрационная/проводниковая анестезия (Артикаин 4% 1.7 мл). Препарирование кариозной полости, полная некрэктомия, формирование эмалевого фальца. Изоляция рабочего поля коффердамом. Медикаментозная обработка 2% раствором хлоргексидина биглюконата. Кислотное травление эмали и дентина 37% ортофосфорной кислотой (etching: эмаль 20 сек, дентин 10 сек), смывание водой, деликатное подсушивание воздухом без пересушивания. Нанесение адгезивной системы (adhesive: праймер + бонд), экспозиция 20 сек, раздувание, фотополимеризация 20 сек. Послойное моделирование наногибридным светоотверждаемым композитом (composite layer) с восстановлением анатомической формы бугров, фиссур и контактного пункта. Окклюзионная коррекция по копирке, шлифовка и полировка (polishing: диски, полиры, паста) до сухого зеркального блеска.\n\nГарантийные обязательства:\n- Гарантийный срок на световую композитную реставрацию: 24 мес. (срок службы: 36 мес.).\n- Условия сохранения гарантии: соблюдение индивидуальной гигиены полости рта, контрольный профилактический осмотр не реже 1 раза в 6 месяцев.",
		recommendations:
			"Не принимать пищу в течение 2 часов до окончания действия анестезии. Щадящая диета 2-3 дня. Гарантийный срок на реставрацию: 24 мес. Контрольный осмотр и профгигиена через 6 месяцев.",
	},
	{
		id: "pulpitis",
		label: "Пульпит острый / хронический",
		badge: "K04.0",
		description:
			"Анестезия, экстирпация пульпы, мех/мед обработка каналов, временная паста Calcept / обтурация гуттаперчей.",
		defaultIcd10: "K04.0",
		anamnesis:
			"Жалобы на острые приступообразные самопроизвольные боли, значительно усиливающиеся в ночное время, иррадиирующие по ходу ветвей тройничного нерва. Длительная болевая реакция на температурные раздражители (холодное, горячее).",
		statusLocalis:
			"Глубокая кариозная полость, сообщающаяся с полостью зуба. Зондирование вскрытой точки рога пульпы резко болезненно, сопровождается кровоточивостью. Перкуссия слабочувствительна. Термопроба резко положительна с длительным последействием. ЭОД 25–45 мкА. Рентгенологически: глубокий дефект твердых тканей, периодонтальная щель без деструктивных изменений.",
		treatmentDescription:
			"Инфильтрационная/проводниковая анестезия (Артикаин 4% с эпинефрином 1:100 000 / 1:200 000, 1.7 мл). Препарирование, раскрытие полости зуба, создание прямого эндодонтического доступа. Изоляция коффердамом. Витальная экстирпация пульпы из корневых каналов / девитализация. Определение рабочей длины корневых каналов апекслокатором и контрольной рентгенографией. Механическая инструментальная обработка каналов NiTi ротационными файлами (canal instrumentation) с обильной ирригацией 3% гипохлоритом натрия (NaOCl) и 17% ЭДТА с ультразвуковой активацией. Высушивание стерильными бумажными штифтами. Временная лечебная паста Calcept (гидроксид кальция) под герметичную повязку / трехмерная обтурация каналов гуттаперчей с эпоксидным силером (gutta-percha obturation) методом латеральной/вертикальной конденсации. Рентген-контроль обтурации. Восстановление коронковой части зуба.",
		recommendations:
			"При болях — НПВС (Нимесил 100 мг / Ибупрофен 400 мг) по 1 таб. после еды. Не жевать на причинную сторону 2-3 дня. Контрольный осмотр через 7-14 дней.",
	},
	{
		id: "periodontitis",
		label: "Периодонтит хронический",
		badge: "K04.5",
		description:
			"Ревизия, распломбировка, антисептическая обработка, временная гидроокись кальция Calcept.",
		defaultIcd10: "K04.5",
		anamnesis:
			"Жалобы на чувство тяжести или ноющую боль при накусывании на зуб, изменение цвета коронки. В анамнезе зуб ранее лечен.",
		statusLocalis:
			"Зуб девитализирован, серый оттенок коронки / дефект пломбы. Полость зуба вскрыта, зондирование устьев каналов безболезненно. Перкуссия слабочувствительна. Пальпация по переходной складке безболезненна. ЭОД > 100 мкА. Рентгенограмма: очаг деструкции костной ткани в периапикальной области у верхушки корня (периапикальный очаг).",
		treatmentDescription:
			"Инфильтрационная/проводниковая анестезия (Артикаин 4% с эпинефрином 1:100 000 / 1:200 000, 1.7 мл). Раскрытие полости зуба, удаление старого пломбировочного материала, распломбировка и ревизия корневых каналов (canal desobturation). Прохождение каналов до апекса под контролем апекслокатора. Механическая и медикаментозная антисептическая обработка (antiseptic irrigation: NaOCl 3%, 2% хлоргексидин, ЭДТА 17%, УЗ-активация). Временная обтурация каналов пастой на основе гидроксида кальция Calcept (calcium hydroxide) для мощного антисептического действия и стимуляции остеогенеза. Наложение временной герметичной пломбы (Cavit / СИЦ). Контрольный визит через 10–14 дней.",
		recommendations:
			"Щадящая диета, НПВС при боли (Нимесулид 100 мг), ротовые ванночки с 0.05% хлоргексидином. Явка на контрольный прием через 10-14 дней.",
	},
	{
		id: "extraction",
		label: "Удаление зуба простое / сложное",
		badge: "K08.1",
		description:
			"Инфильтрационная/проводниковая анестезия, люксация, элевация, кюретаж лунки, гемостаз, швы.",
		defaultIcd10: "K08.1",
		anamnesis:
			"Жалобы на разрушение коронковой части зуба, невозможность терапевтического/ортопедического восстановления, подвижность или постоянный очаг инфекции.",
		statusLocalis:
			"Полное разрушение коронковой части зуба ниже уровня десны / подвижность зуба III степени / дистопированный полуретинированный зуб. Слизистая оболочка вокруг зуба гиперемирована, отёчна.",
		treatmentDescription:
			"Инфильтрационная и проводниковая анестезия (Артикаин 4% 1.7 мл) (infiltration anesthesia). Синдесмотомия — отслоение круговой связки зуба на глубину 3-5 мм распатором. Наложение анатомических щипцов / прямого или углового элеватора, люксация, элевация, аккуратная тракция зуба из альвеолы без повреждения костных стенок (elevator/forceps). Тщательный ревизионный кюретаж лунки острой кюретажной ложкой, удаление грануляций и костных отломков (socket curettage). Гемостаз: формирование устойчивого кровяного сгустка, гемостатическая губка с антисептиком / Альвостаз (hemostasis). Сближение краев лунки, наложение узловых швов (suture: Викрил 4-0). Давящий марлевый тампон на 20 минут.",
		recommendations:
			"1. Холод на область щеки по 15 мин первые 3-4 часа.\n2. Не полоскать рот активно (сохранять сгусток).\n3. Исключить бани, сауны и спорт на 3 дня.\n4. Щадящая диета.\n5. НПВС при боли (Нимесил 100 мг).\n6. Контрольный осмотр через 7-10 дней.",
	},
	{
		id: "hygiene",
		label: "Профессиональная гигиена",
		badge: "Z01.2",
		description:
			"Ультразвуковой скейлинг, Air-Flow, полировка пастой, фторирование Clinpro.",
		defaultIcd10: "Z01.2",
		anamnesis:
			"Жалобы на темный налет на зубах, зубные камни, кровоточивость десен при чистке зубов, несвежее дыхание.",
		statusLocalis:
			"Обильные наддесневые и поддесневые зубные отложения, плотный пигментированный налет курильщика / от чая и кофе. Десна гиперемирована, отечна, кровоточит при зондировании. Зубодесневое прикрепление сохранено.",
		treatmentDescription:
			"Индикация зубного налета. Аппликационная анестезия десны. Ультразвуковой скейлинг с удалением минерализованных зубных отложений (ultrasonic scaling). Снятие пигментированного налета водно-порошкоструйным аппаратом Air-Flow (порошок глицин/эритритол) (Air-Flow polishing). Полировка всех поверхностей зубов абразивной пастой Cleanic и щеточками. Межзубные промежутки очищены флоссом и штрипсами. Глубокое фторирование эмали препаратом Clinpro White Varnish / фторлаком (Clinpro fluoridation). Обучение гигиене, индивидуальный подбор средств ухода.",
		recommendations:
			"«Белая диета» 48 часов (без кофе, чая, ягод, свеклы). Замена зубной щетки на новую. Профилактический осмотр через 6 месяцев.",
	},
];

/**
 * Неразрушающее добавление клинической рекомендации в поле лечения и рекомендаций (P).
 */
export function appendRecommendationToSoap(
	diary: DiaryState,
	recommendationText: string,
): DiaryState {
	const cur = ((diary as any).treatmentPlan || diary.treatmentDescription || "").trim();
	const recTrim = (recommendationText ?? "").trim();
	if (!recTrim) return diary;
	if (cur.includes(recTrim)) return diary;

	const hasRecSection =
		cur.includes("Рекомендации:") || cur.includes("Рекомендовано:");
	let nextTreatment = cur;
	if (!cur) {
		nextTreatment = `Рекомендации:\n- ${recTrim}`;
	} else if (hasRecSection) {
		nextTreatment = `${cur}\n- ${recTrim}`;
	} else {
		nextTreatment = `${cur}\n\nРекомендации:\n- ${recTrim}`;
	}

	return {
		...diary,
		treatmentDescription: nextTreatment,
	};
}

/** Пресет быстрого протоколирования анестезии */
export interface AnesthesiaQuickPreset {
	readonly id: string;
	readonly drugKey?: AnesthesiaDrugKey;
	readonly label: string;
	readonly subLabel: string;
	readonly volume: string;
	readonly textToInsert: string;
	readonly isAdrenalineFree?: boolean;
	readonly containsSulfites?: boolean;
	readonly cardioSafe?: boolean;
	readonly pregnancyPreferred?: boolean;
}

/** 5 основных анестетиков в стоматологической практике */
export const ANESTHESIA_QUICK_PRESETS: readonly AnesthesiaQuickPreset[] = [
	{
		id: "ultracain_ds",
		drugKey: "ultracain_ds",
		label: "Ультракаин Д-С",
		subLabel: "1.7 мл · 1:200 000",
		volume: "1.7 мл",
		textToInsert:
			"Анестезия: Ультракаин Д-С (Артикаин 4% с эпинефрином 1:200 000) 1.7 мл.",
		isAdrenalineFree: false,
		containsSulfites: true,
		cardioSafe: false,
		pregnancyPreferred: true,
	},
	{
		id: "ultracain_ds_forte",
		drugKey: "ultracain_ds_forte",
		label: "Ультракаин Д-С Форте",
		subLabel: "1.7 мл · 1:100 000",
		volume: "1.7 мл",
		textToInsert:
			"Анестезия: Ультракаин Д-С Форте (Артикаин 4% с эпинефрином 1:100 000) 1.7 мл.",
		isAdrenalineFree: false,
		containsSulfites: true,
		cardioSafe: false,
		pregnancyPreferred: false,
	},
	{
		id: "septanest",
		drugKey: "septanest_100",
		label: "Септанест",
		subLabel: "1.7 мл · 1:100 000",
		volume: "1.7 мл",
		textToInsert:
			"Анестезия: Септанест (Артикаин 4% с адреналином 1:100 000) 1.7 мл.",
		isAdrenalineFree: false,
		containsSulfites: true,
		cardioSafe: false,
		pregnancyPreferred: false,
	},
	{
		id: "scandonest",
		drugKey: "scandonest_3",
		label: "Скандонест 3%",
		subLabel: "1.7 мл · без адреналина",
		volume: "1.7 мл",
		textToInsert:
			"Анестезия: Скандонест 3% (Мепивакаин 3% без адреналина/вазоконстриктора) 1.7 мл.",
		isAdrenalineFree: true,
		containsSulfites: false,
		cardioSafe: true,
		pregnancyPreferred: false,
	},
	{
		id: "lidocaine",
		drugKey: "lidocaine_2",
		label: "Лидокаин 2%",
		subLabel: "2.0 мл",
		volume: "2.0 мл",
		textToInsert: "Анестезия: Лидокаин 2% 2.0 мл.",
		isAdrenalineFree: true,
		containsSulfites: false,
		cardioSafe: true,
		pregnancyPreferred: false,
	},
];

/**
 * Парсит соматический анамнез пациента (из текста сопутствующих заболеваний) в структурированный профиль риска.
 */
export function extractSomaticRiskProfileFromText(text?: string | null): SomaticRiskProfile {
	const raw = (text ?? "").toLowerCase();
	if (!raw.trim()) return {};

	const hasCardio =
		raw.includes("гипертон") ||
		raw.includes("ибс") ||
		raw.includes("аритми") ||
		raw.includes("давлен") ||
		raw.includes("сердеч") ||
		raw.includes("i10") ||
		raw.includes("i11") ||
		raw.includes("i15") ||
		raw.includes("стенокард") ||
		raw.includes("инфаркт");

	const hasSulfite =
		raw.includes("сульфит") ||
		raw.includes("дисульфит") ||
		raw.includes("метабисульфит");

	const hasAsthma =
		raw.includes("астм") ||
		raw.includes("бронхиальн") ||
		raw.includes("j45");

	const isPregnant =
		raw.includes("беременн") ||
		raw.includes("лактац") ||
		raw.includes("кормлен") ||
		raw.includes("гв") ||
		raw.includes("триместр");

	return {
		hasCardiovascularRisk: hasCardio,
		hasSulfiteAllergy: hasSulfite,
		hasBronchialAsthma: hasAsthma,
		isPregnantOrLactating: isPregnant,
		...(text ? { customNotes: text } : {}),
	};
}

/**
 * Проверяет совместимость анестетика с соматическим статусом из дневника.
 */
export function checkSomaticAnesthesiaCompatibility(
	comorbiditiesText: string | undefined,
	drugKey: AnesthesiaDrugKey = "ultracain_ds",
) {
	const profile = extractSomaticRiskProfileFromText(comorbiditiesText);
	return checkAnesthesiaSomaticContraindications({
		drugKey,
		somaticProfile: profile,
	});
}

/**
 * Автоматический расчет предельно допустимой дозы анестетика
 * (Артикаин 4% — макс. 5 мг/кг / 0.125 мл/кг) при указании массы тела ребенка (кг).
 */
export function calculatePediatricAnesthesiaLimit(
	weightKg: number,
	drugKey: AnesthesiaDrugKey = "ultracain_ds",
): {
	weightKg: number;
	maxDoseMgPerKg: number;
	maxSafeDoseMg: number;
	maxSafeVolumeMl: number;
	maxSafeCarpules: number;
	formattedSafetyNote: string;
} {
	const weight = Math.max(
		5,
		Math.min(
			100,
			Number.isFinite(weightKg) && weightKg > 0 ? weightKg : 20,
		),
	);
	const drug = ANESTHESIA_DRUGS[drugKey] ?? ANESTHESIA_DRUGS.ultracain_ds;
	const maxDoseMgPerKg = drug.maxDoseMgPerKgPediatric ?? 5.0; // 5.0 мг/кг для Артикаина
	const maxSafeDoseMg = Math.round(weight * maxDoseMgPerKg * 10) / 10;
	// 4% раствор = 40 мг/мл -> 5 мг/кг / 40 мг/мл = 0.125 мл/кг
	const mgPerMl = drug.concentrationPct * 10; // 40 мг/мл для 4%
	const maxSafeVolumeMl =
		Math.round((maxSafeDoseMg / mgPerMl) * 100) / 100;
	const maxSafeCarpules =
		Math.round((maxSafeVolumeMl / drug.volumeMlPerCarpule) * 10) / 10;

	const formattedSafetyNote = `Расчет дозы анестетика по массе тела ребенка (${weight} кг):\n• Препарат: ${drug.commercialName} (${drug.activeSubstance})\n• Предельная педиатрическая доза: ${maxDoseMgPerKg} мг/кг (макс. ${maxSafeDoseMg} мг)\n• Предельный объем: ${maxSafeVolumeMl} мл (макс. ${maxSafeCarpules} карпулы по ${drug.volumeMlPerCarpule} мл)`;

	return {
		weightKg: weight,
		maxDoseMgPerKg,
		maxSafeDoseMg,
		maxSafeVolumeMl,
		maxSafeCarpules,
		formattedSafetyNote,
	};
}

/**
 * Приоритетная оценка тяжести диагноза по МКБ-10 для выбора главного кода приёма.
 */
function getIcdPriority(code: string): number {
	const c = (code || "").toUpperCase();
	if (c.startsWith("K04.0")) return 100; // Пульпит острый
	if (c.startsWith("K04.4")) return 90; // Острый апикальный периодонтит
	if (c.startsWith("K04.5") || c.startsWith("K04")) return 80; // Хронический периодонтит
	if (c.startsWith("K02.1") || c.startsWith("K02.2")) return 70; // Кариес дентина / корня
	if (c.startsWith("K02.0") || c.startsWith("K02")) return 65; // Кариес эмали
	if (c.startsWith("K01.1") || c.startsWith("K08.1")) return 60; // Удаление / атипичное
	if (c.startsWith("K05.3") || c.startsWith("K05.0") || c.startsWith("K05"))
		return 50; // Пародонтит / гингивит
	if (c.startsWith("Z51")) return 40; // Ортопедия
	if (c.startsWith("Z01")) return 30; // Профосмотр
	return 10;
}

/**
 * Автоматическое заполнение SOAP-дневника из набора зубов одонтограммы.
 * Обрабатывает все не-здоровые зубы (Caries, Pulpitis, Periodontitis, Filled, Crown, Missing, Extraction, etc.)
 */
export function generateSoapFromOdontogramStates(
	states: readonly {
		toothNumber: number;
		state: string;
		surfaces?: readonly string[] | null;
		subType?: string;
		pocketDepthMm?: number;
		icd10Override?: string;
		notes?: string;
	}[],
): Partial<DiaryState> {
	const nonHealthy = states.filter((s) => {
		const norm = (s.state || "").toLowerCase();
		return norm !== "healthy" && norm !== "" && norm !== "0";
	});

	if (nonHealthy.length === 0) {
		return {
			anamnesis: "",
			statusLocalis: "",
			diagnosisIcd10: "",
			diagnosisTooth: "",
			treatmentDescription: "",
		};
	}

	// Сортируем зубы в стандартном клиническом порядке FDI
	const sorted = [...nonHealthy].sort((a, b) => {
		const quadA = Math.floor(a.toothNumber / 10);
		const quadB = Math.floor(b.toothNumber / 10);
		if (quadA !== quadB) return quadA - quadB;
		if (quadA === 1 || quadA === 5 || quadA === 3 || quadA === 7) {
			return b.toothNumber - a.toothNumber;
		}
		return a.toothNumber - b.toothNumber;
	});

	const anamnesisParts: string[] = [];
	const statusLocalisParts: string[] = [];
	const treatmentParts: string[] = [];
	const teethList: number[] = [];
	const icdCodes: string[] = [];
	const recommendationsList: string[] = [];

	for (const item of sorted) {
		const soap = generateSoapFromOdontogramFinding({
			toothNumber: item.toothNumber,
			state: item.state,
			...(item.surfaces ? { surfaces: item.surfaces } : {}),
			...(item.subType ? { subType: item.subType } : {}),
			...(item.pocketDepthMm !== undefined
				? { pocketDepthMm: item.pocketDepthMm }
				: {}),
			...(item.icd10Override ? { icd10Override: item.icd10Override } : {}),
		});

		teethList.push(item.toothNumber);
		if (soap.diagnosisIcd10 && !icdCodes.includes(soap.diagnosisIcd10)) {
			icdCodes.push(soap.diagnosisIcd10);
		}

		if (sorted.length === 1) {
			if (soap.anamnesis) anamnesisParts.push(soap.anamnesis);
			if (soap.statusLocalis) statusLocalisParts.push(soap.statusLocalis);
			if (soap.treatmentDescription) treatmentParts.push(soap.treatmentDescription);
		} else {
			if (soap.anamnesis) {
				anamnesisParts.push(`• Зуб ${soap.toothNameRu}: ${soap.anamnesis}`);
			}
			if (soap.statusLocalis) {
				statusLocalisParts.push(`• Зуб ${soap.toothNameRu}: ${soap.statusLocalis}`);
			}
			if (soap.treatmentDescription) {
				treatmentParts.push(`• Зуб ${soap.toothNumber}: ${soap.treatmentDescription}`);
			}
		}

		if (
			soap.recommendations &&
			!recommendationsList.includes(soap.recommendations)
		) {
			recommendationsList.push(soap.recommendations);
		}
	}

	// Сортировка МКБ-10 по клинической остроте
	const sortedIcd = [...icdCodes].sort(
		(a, b) => getIcdPriority(b) - getIcdPriority(a),
	);

	let formattedTreatment = treatmentParts.join("\n\n");
	if (sorted.length > 1 && recommendationsList.length > 0) {
		formattedTreatment += `\n\nРекомендации пациенту:\n${recommendationsList
			.map((r) => (r.startsWith("•") || r.startsWith("1.") ? r : `• ${r}`))
			.join("\n")}`;
	}

	return {
		anamnesis:
			sorted.length > 1
				? `Жалобы и анамнез по результатам осмотра:\n${anamnesisParts.join("\n\n")}`
				: anamnesisParts.join("\n\n"),
		statusLocalis:
			sorted.length > 1
				? `Объективный стоматологический статус (Status Localis):\n${statusLocalisParts.join("\n\n")}`
				: statusLocalisParts.join("\n\n"),
		diagnosisIcd10: sortedIcd[0] ?? "K02.1",
		diagnosisTooth: normalizeFdiToothList(teethList),
		treatmentDescription: formattedTreatment,
	};
}

/**
 * Добавление анестетика в поле лечения P (с дедупликацией)
 */
export function appendAnesthesiaToSoap(
	current: DiaryState,
	anestheticText: string,
): DiaryState {
	const curTreatment = (current.treatmentDescription ?? "").trim();
	if (!curTreatment) {
		return {
			...current,
			treatmentDescription: anestheticText,
		};
	}
	if (curTreatment.includes(anestheticText)) {
		return current;
	}
	return {
		...current,
		treatmentDescription: `${anestheticText}\n${curTreatment}`,
	};
}

/**
 * 1-клик пресеты карпульной анестезии для клинического дневника 043/у.
 */
export interface CarpuleAnesthesiaPreset {
	readonly key: string;
	readonly title: string;
	readonly shortLabel: string;
	readonly description: string;
	readonly text: string;
	readonly hasAdrenaline: boolean;
	readonly adrenalineRatio: "1:100000" | "1:200000" | "none";
}

export const CARPULE_ANESTHESIA_PRESETS: readonly CarpuleAnesthesiaPreset[] = [
	{
		key: "articaine_100k",
		title: "Артикаин 4% + Адреналин 1:100 000",
		shortLabel: "Артикаин 1:100k",
		description: "Стандарт терапия / хирургия",
		text: "Анестезия инфильтрационная/проводниковая (Артикаин 4% с адреналином 1:100 000, 1.7 мл). Обезболивание глубокое, наступило через 2-3 минуты.",
		hasAdrenaline: true,
		adrenalineRatio: "1:100000",
	},
	{
		key: "articaine_200k",
		title: "Артикаин 4% + Адреналин 1:200 000",
		shortLabel: "Артикаин 1:200k",
		description: "Сосудистый щадящий режим",
		text: "Анестезия инфильтрационная/проводниковая (Артикаин 4% с адреналином 1:200 000, 1.7 мл). Щадящий кардиоваскулярный режим. Обезболивание наступило через 3 минуты.",
		hasAdrenaline: true,
		adrenalineRatio: "1:200000",
	},
	{
		key: "scandonest_mepivacaine_3",
		title: "Мепивакаин (Скандонест) 3% без вазоконстриктора",
		shortLabel: "Скандонест 3% (без адреналина)",
		description: "Для гипертоников, ССЗ, глаукомы, аллергии на сульфиты, беременных",
		text: "Анестезия инфильтрационная/проводниковая (Мепивакаин 3% без вазоконстриктора, 1.7 мл). Препарат выбора при сопутствующей кардиоваскулярной патологии и гипертонии. Обезболивание адекватное.",
		hasAdrenaline: false,
		adrenalineRatio: "none",
	},
];

export interface AnesthesiaRiskEvaluation {
	readonly hasHypertensionRisk: boolean;
	readonly detectedAnestheticWithAdrenaline: boolean;
	readonly isWarningTriggered: boolean;
	readonly warningMessage?: string | undefined;
}

/**
 * Автоматическая оценка кардиоваскулярных рисков при выборе анестетика.
 */
export function evaluateAnesthesiaRisk(
	anamnesisText?: string,
	treatmentPlanText?: string,
	patientMedicalAlerts?: readonly string[] | string,
): AnesthesiaRiskEvaluation {
	const textToSearch = [
		anamnesisText || "",
		Array.isArray(patientMedicalAlerts) ? patientMedicalAlerts.join(" ") : (patientMedicalAlerts || ""),
	].join(" ").toLowerCase();

	const HYPERTENSION_PATTERNS = [
		/гипертон/i,
		/гипертенз/i,
		/i10/i,
		/i11/i,
		/i15/i,
		/высокое\s*давлен/i,
		/ад\s*(?:>|>=|выше|140|150|160|170|180)/i,
		/артериальн.*давлен/i,
		/ибс/i,
		/стенокард/i,
		/кардио/i,
		/инфаркт/i,
		/инсульт/i,
		/аритми/i,
	];

	const hasHypertensionRisk = HYPERTENSION_PATTERNS.some((p) => p.test(textToSearch));

	const treatmentLower = (treatmentPlanText || "").toLowerCase();
	const ADRENALINE_PATTERNS = [
		/1:100\s*000/i,
		/1:200\s*000/i,
		/1:100k/i,
		/1:200k/i,
		/адреналин/i,
		/эпинефрин/i,
		/форте/i,
		/септанест/i,
		/ультракаин\s*д-с/i,
	];

	const detectedAnestheticWithAdrenaline = ADRENALINE_PATTERNS.some((p) => p.test(treatmentLower));
	const isWarningTriggered = hasHypertensionRisk && detectedAnestheticWithAdrenaline;

	const warningMessage = isWarningTriggered
		? "⚠️ Внимание: У пациента в анамнезе зафиксирована гипертония / риск ССЗ. Применение анестетика с адреналином требует осторожности (макс. 0.04 мг адреналина / 2 карпулы). Рекомендуется Мепивакаин (Скандонест) 3% без вазоконстриктора."
		: undefined;

	return {
		hasHypertensionRisk,
		detectedAnestheticWithAdrenaline,
		isWarningTriggered,
		warningMessage,
	};
}

/** Результат расчета карпульной анестезии и дозировок по массе тела */
export interface AnesthesiaCarpuleCalculation {
	readonly drugKey: AnesthesiaDrugKey;
	readonly drugName: string;
	readonly activeSubstance: string;
	readonly carpulesCount: number;
	readonly patientWeightKg: number;
	readonly isPediatric: boolean;
	readonly volumeMl: number;
	readonly activeDoseMg: number;
	readonly maxSafeDoseMg: number;
	readonly maxSafeCarpules: number;
	readonly epinephrineMg: number;
	readonly maxSafeEpinephrineMg: number;
	readonly safetyPercentage: number;
	readonly isOverdose: boolean;
	readonly isCardioRestricted: boolean;
	readonly safetyLevel: "safe" | "caution" | "warning" | "danger";
	readonly warningMessage?: string | undefined;
	readonly formattedSafetyNote: string;
	readonly formattedTreatmentSnippet: string;
}

/**
 * Автоматический расчет предельной безопасной дозы анестетика по весу пациента и числу карпул.
 */
export function calculateAnesthesiaCarpulesSafety(params: {
	readonly drugKey?: string | undefined;
	readonly carpulesCount?: number | undefined;
	readonly patientWeightKg?: number | undefined;
	readonly isPediatric?: boolean | undefined;
	readonly patientAgeYears?: number | null | undefined;
	readonly somaticProfile?: SomaticRiskProfile | undefined;
	readonly toothNumber?: number | string | undefined;
	readonly methodNameRu?: string | undefined;
}): AnesthesiaCarpuleCalculation {
	const rawKey = params.drugKey || "ultracain_ds";
	const drugKey = (
		rawKey === "articaine_100k"
			? "ultracain_ds_forte"
			: rawKey === "articaine_200k"
				? "ultracain_ds"
				: rawKey === "scandonest_mepivacaine_3"
					? "scandonest_3"
					: rawKey in ANESTHESIA_DRUGS
						? rawKey
						: "ultracain_ds"
	) as AnesthesiaDrugKey;

	const weight = Math.max(
		10,
		Math.min(
			250,
			Number.isFinite(params.patientWeightKg) && (params.patientWeightKg ?? 0) > 0
				? (params.patientWeightKg ?? 70)
				: 70,
		),
	);
	const carpules = Math.max(
		0.25,
		Number.isFinite(params.carpulesCount) && (params.carpulesCount ?? 0) > 0
			? (params.carpulesCount ?? 1)
			: 1,
	);

	const safety = calculateAnesthesiaSafety({
		drugKey,
		patientWeightKg: weight,
		carpulesCount: carpules,
		patientAgeYears: params.patientAgeYears,
		isPediatric: params.isPediatric,
		somaticProfile: params.somaticProfile,
	});

	const toothSuffix = params.toothNumber ? ` в области зуба ${params.toothNumber}` : "";
	const method = params.methodNameRu || "Инфильтрационная/проводниковая";
	const formattedTreatmentSnippet = `Анестезия: ${method}${toothSuffix} — ${safety.drug.commercialName} (${safety.drug.activeSubstance}) ${carpules} карп. (${safety.totalVolumeMl} мл, ${safety.totalDoseMg} мг). Обезболивание глубокое, наступило через 2–3 мин.`;

	const formattedSafetyNote = `Расчет дозировки: ${safety.drug.commercialName} • Введено: ${carpules} карп. (${safety.totalVolumeMl} мл / ${safety.totalDoseMg} мг) • Предел по весу ${weight} кг: макс. ${safety.maxSafeCarpules} карп. (${safety.maxSafeDoseMg} мг) • ${safety.safetyPercentage}% от предела безопасности.`;

	return {
		drugKey: safety.drug.key,
		drugName: safety.drug.commercialName,
		activeSubstance: safety.drug.activeSubstance,
		carpulesCount: carpules,
		patientWeightKg: weight,
		isPediatric: safety.isPediatric,
		volumeMl: safety.totalVolumeMl,
		activeDoseMg: safety.totalDoseMg,
		maxSafeDoseMg: safety.maxSafeDoseMg,
		maxSafeCarpules: safety.maxSafeCarpules,
		epinephrineMg: safety.totalEpinephrineMg,
		maxSafeEpinephrineMg: safety.maxSafeEpinephrineMg,
		safetyPercentage: safety.safetyPercentage,
		isOverdose: safety.safetyRatio >= 1.0,
		isCardioRestricted: safety.isCardioRestricted,
		safetyLevel: safety.safetyLevel,
		warningMessage: safety.warningMessage ?? undefined,
		formattedSafetyNote,
		formattedTreatmentSnippet,
	};
}

/**
 * Идентификаторы ключевых послеоперационных памяток пациенту.
 */
export type PostOpMemoId = "surgery_extraction" | "anesthesia_caries" | "endodontics";

/**
 * Структурированная послеоперационная памятка пациенту.
 */
export interface PostOpPatientMemo {
	readonly id: PostOpMemoId;
	readonly title: string;
	readonly shortTitle: string;
	readonly icon: string;
	readonly badge: string;
	readonly category: "surgery" | "therapy" | "endodontics";
	readonly summary: string;
	readonly keyRules: readonly string[];
	readonly urgentTriggers: readonly string[];
}

/**
 * Набор официальных послеоперационных клинических памяток пациенту.
 */
export const POST_OP_PATIENT_MEMOS: readonly PostOpPatientMemo[] = [
	{
		id: "surgery_extraction",
		title: "Памятка пациенту после удаления зуба и хирургических манипуляций",
		shortTitle: "Памятка: Удаление / Хирургия",
		icon: "🧊",
		badge: "Хирургия 043/у",
		category: "surgery",
		summary: "Правила послеоперационного ухода за лункой, режим холода, гигиена и приём НПВП.",
		keyRules: [
			"🚫 Не полоскать рот и лунку активно в первые 24–48 часов, чтобы не вымыть кровяной сгусток (основа заживления).",
			"🧊 Холод местно: прикладывать сухой холод (лед через полотенце) к щеке на 15 минут с перерывами 30 минут в первые 3–4 часа.",
			"🔥 Не греть щеку, исключить горячие ванны, сауны, бани и тяжелые физические нагрузки на 3–5 дней.",
			"💊 Обезболивание: при возникновении болевого синдрома принять НПВП (Нимесил 100 мг или Ибупрофен 400 мг) по 1 таб. после еды.",
			"🍲 Щадящая диета: негорячая, мягкая пища; жевать строго на противоположной (неоперированной) стороне 2–3 дня.",
			"🩸 При умеренном промокании слюны кровью — прикусить стерильный марлевый тампон на 15–20 минут.",
		],
		urgentTriggers: [
			"Непрекращающееся обильное кровотечение из лунки более 1–2 часов.",
			"Повышение температуры тела выше 38.0 °C.",
			"Нарастающий отек щеки, затрудненное открывание рта или глотание.",
		],
	},
	{
		id: "anesthesia_caries",
		title: "Памятка пациенту после местной анестезии и лечения кариеса",
		shortTitle: "Памятка: Анестезия / Кариес",
		icon: "🦷",
		badge: "Терапия 043/у",
		category: "therapy",
		summary: "Правила поведения во время действия анестетика, профилактика прикусывания щеки/губы и гарантия на пломбу.",
		keyRules: [
			"⏳ Не принимать пищу в течение 2–3 часов (до полного восстановления чувствительности губ, языка и щеки), чтобы случайно не прикусить мягкие ткани.",
			"☕ Не пить слишком горячий чай, кофе или воду во время действия анестезии во избежание термического ожога слизистой.",
			"🥜 Щадящий режим: избегать чрезмерно твердой пищи (орехи, сухари, грильяж) на вылеченный зуб в первые 1–2 дня.",
			"⚖️ Окклюзионный контроль: если после отхода анестезии ощущается, что пломба завышает прикус или мешает — обратитесь в клинику для бесплатной быстрой шлифовки.",
			"🛡️ Гарантийный срок на световую композитную реставрацию составляет 12–24 месяца (срок службы 24–36 месяцев) при регулярном профосмотре 1 раз в 6 месяцев.",
		],
		urgentTriggers: [
			"Онемение не проходит более 6–8 часов после завершения приёма.",
			"Острая самопроизвольная ночная боль в пролеченном зубе.",
			"Аллергическая реакция (кожная сыпь, зуд, отек мягких тканей).",
		],
	},
	{
		id: "endodontics",
		title: "Памятка пациенту после эндодонтического лечения (пломбирования корневых каналов)",
		shortTitle: "Памятка: Эндодонтия / Каналы",
		icon: "⚡",
		badge: "Эндодонтия 043/у",
		category: "endodontics",
		summary: "Информация о естественной постпломбировочной чувствительности до 3–5 дней и уходе за зубом.",
		keyRules: [
			"📊 Норма ощущений: умеренная ноющая болезненность или чувство «распирания» при накусывании на зуб в течение 2–5 дней является естественной физиологической нормой после обработки каналов.",
			"💊 Обезболивающая терапия: при выраженном дискомфорте принять НПВП (Нимесил 100 мг / Ибупрофен 400 мг / Кеторол) по 1 таб. после еды.",
			"🛡️ Беречь зуб от перегрузки: не жевать твердую пищу на леченую сторону до окончательного ортопедического/терапевтического восстановления коронки.",
			"🩹 Временная пломба: беречь герметичность повязки; при ее частичном сколе или выпадении незамедлительно связаться с клиникой.",
			"📅 Обязательно явиться на плановый контрольный визит для постоянного пломбирования или покрытия коронкой.",
		],
		urgentTriggers: [
			"Резкое пульсирующее нарастание боли, не снимаемое анальгетиками.",
			"Появление припухлости (отека) десны или щеки в области пролеченного зуба.",
			"Повышение температуры тела выше 37.5 °C.",
		],
	},
];

export interface PatientMemoRenderOptions {
	readonly patientFullName?: string | null | undefined;
	readonly patientBirthDate?: string | null | undefined;
	readonly doctorFullName?: string | null | undefined;
	readonly doctorSpecialty?: string | null | undefined;
	readonly clinicName?: string | null | undefined;
	readonly clinicPhone?: string | null | undefined;
	readonly clinicAddress?: string | null | undefined;
	readonly toothNumber?: string | number | null | undefined;
	readonly visitDate?: string | null | undefined;
}

/**
 * Получить структурированную памятку по идентификатору.
 */
export function getPostOpPatientMemo(id: PostOpMemoId | string): PostOpPatientMemo {
	const found = POST_OP_PATIENT_MEMOS.find((m) => m.id === id);
	return found ?? POST_OP_PATIENT_MEMOS[0]!;
}

/**
 * Генерация форматированного текста памятки для мессенджеров (WhatsApp / Telegram / SMS) и дневника.
 */
export function generatePatientMemoText(
	memoId: PostOpMemoId | string,
	options?: PatientMemoRenderOptions,
): string {
	const memo = getPostOpPatientMemo(memoId);
	const clinic = options?.clinicName || "Стоматологическая клиника «DENTE»";
	const phone = options?.clinicPhone || "+7 (495) 777-88-99";
	const toothStr = options?.toothNumber ? ` (Зуб ${options.toothNumber})` : "";
	const dateStr = options?.visitDate || new Date().toLocaleDateString("ru-RU");

	const lines = [
		`📌 ${memo.title.toUpperCase()}${toothStr}`,
		`Дата: ${dateStr} • Клиника: ${clinic}`,
		"",
		"КЛЮЧЕВЫЕ ПРАВИЛА И РЕКОМЕНДАЦИИ:",
		...memo.keyRules.map((r, i) => `${i + 1}. ${r}`),
		"",
		"⚠️ СРОЧНО СВЯЗАТЬСЯ С КЛИНИКОЙ ПРИ:",
		...memo.urgentTriggers.map((t) => `• ${t}`),
		"",
		`Телефон экстренной связи клиники: ${phone}`,
	];

	return lines.join("\n");
}

/**
 * Неразрушающее добавление памятки в поле P (Лечение и рекомендации) SOAP-дневника.
 */
export function appendPatientMemoToSoap(
	diary: DiaryState,
	memoId: PostOpMemoId | string,
): DiaryState {
	const memo = getPostOpPatientMemo(memoId);
	const snippet = `Выдана «${memo.title}». Пациент ознакомлен с правилами послеоперационного режима и ухода.`;
	return appendRecommendationToSoap(diary, snippet);
}

/**
 * Генерация печатной HTML-страницы А4/А5 памятки пациенту для быстрой печати в 1 клик.
 */
export function renderPatientMemoPrintHtml(
	memoId: PostOpMemoId | string,
	options?: PatientMemoRenderOptions,
): string {
	const memo = getPostOpPatientMemo(memoId);
	const clinic = options?.clinicName || "Стоматологическая клиника «DENTE» (ООО «ДЕНТЕ МЕДИКАЛ ГРУПП»)";
	const phone = options?.clinicPhone || "+7 (495) 777-88-99";
	const address = options?.clinicAddress || "119048, г. Москва, ул. Стоматологическая, д. 24, корп. 1";
	const patient = options?.patientFullName || "________________________________________";
	const doctor = options?.doctorFullName || "Врач-стоматолог";
	const specialty = options?.doctorSpecialty || "Стоматолог-терапевт / хирург";
	const toothStr = options?.toothNumber ? `Зуб ${options.toothNumber}` : "Область вмешательства";
	const dateStr = options?.visitDate || new Date().toLocaleDateString("ru-RU");

	return `<div class="patient-memo-sheet" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; background: #ffffff; padding: 24px; max-width: 210mm; margin: 0 auto; line-height: 1.45; font-size: 12px;">
	<div style="border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
		<div>
			<div style="font-size: 15px; font-weight: 900; text-transform: uppercase; color: #0f172a; letter-spacing: -0.01em;">${clinic}</div>
			<div style="font-size: 11px; font-weight: 600; color: #475569; margin-top: 2px;">${address} • Тел: ${phone}</div>
		</div>
		<div style="text-align: right; font-size: 11px; shrink: 0;">
			<div style="font-weight: 800; color: #0f766e;">${memo.badge}</div>
			<div style="color: #64748b; margin-top: 2px;">Дата выдачи: <strong>${dateStr}</strong></div>
		</div>
	</div>

	<div style="text-align: center; margin-bottom: 14px; padding: 8px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
		<div style="font-size: 20px; margin-bottom: 2px;">${memo.icon}</div>
		<h1 style="font-size: 14px; font-weight: 900; text-transform: uppercase; margin: 0; color: #0f172a;">
			${memo.title}
		</h1>
		<div style="font-size: 11px; color: #64748b; margin-top: 3px;">
			${memo.summary}
		</div>
	</div>

	<table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px; border: 1px solid #cbd5e1; page-break-inside: avoid; break-inside: avoid;">
		<tbody>
			<tr style="border-bottom: 1px solid #cbd5e1;">
				<td style="padding: 5px 8px; font-weight: 700; background: #f8fafc; width: 20%; border-right: 1px solid #cbd5e1;">Пациент:</td>
				<td style="padding: 5px 8px; font-weight: 700; color: #0f172a; width: 45%; border-right: 1px solid #cbd5e1;">${patient}</td>
				<td style="padding: 5px 8px; font-weight: 700; background: #f8fafc; width: 15%; border-right: 1px solid #cbd5e1;">Зона:</td>
				<td style="padding: 5px 8px; font-weight: 700; color: #0f766e; width: 20%;">${toothStr}</td>
			</tr>
			<tr>
				<td style="padding: 5px 8px; font-weight: 700; background: #f8fafc; border-right: 1px solid #cbd5e1;">Лечащий врач:</td>
				<td style="padding: 5px 8px; font-weight: 600; border-right: 1px solid #cbd5e1;" colspan="3">${doctor} (${specialty})</td>
			</tr>
		</tbody>
	</table>

	<div style="margin-bottom: 14px; page-break-inside: avoid; break-inside: avoid;">
		<div style="font-size: 12px; font-weight: 900; text-transform: uppercase; color: #0f172a; margin-bottom: 8px; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 4px;">
			Обязательные правила и рекомендации по уходу:
		</div>
		<div style="display: flex; flex-direction: column; gap: 6px;">
			${memo.keyRules
				.map(
					(rule, idx) => `
			<div style="display: flex; align-items: flex-start; gap: 8px; background: #f8fafc; padding: 6px 10px; border-radius: 6px; border-left: 3px solid #0f766e;">
				<span style="font-weight: 800; color: #0f766e; font-size: 11px;">${idx + 1}.</span>
				<span style="font-size: 11px; color: #1e293b; line-height: 1.4;">${rule}</span>
			</div>`,
				)
				.join("")}
		</div>
	</div>

	<div style="margin-bottom: 16px; padding: 10px 12px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; page-break-inside: avoid; break-inside: avoid;">
		<div style="font-size: 11px; font-weight: 900; color: #9f1239; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
			<span>⚠️ СРОЧНО СВЯЗАТЬСЯ С КЛИНИКОЙ (${phone}) ПРИ:</span>
		</div>
		<ul style="margin: 0; padding-left: 18px; font-size: 11px; color: #881337; line-height: 1.4;">
			${memo.urgentTriggers.map((t) => `<li>${t}</li>`).join("")}
		</ul>
	</div>

	<div style="margin-top: 20px; padding-top: 12px; border-top: 1.5px solid #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; page-break-inside: avoid; break-inside: avoid;">
		<div>
			<div style="font-weight: 700; color: #0f172a;">Памятку получил(а), рекомендации понятны:</div>
			<div style="margin-top: 20px;">_________________________ / ${patient}</div>
			<div style="font-size: 9px; color: #64748b; margin-top: 2px;">(подпись пациента)</div>
		</div>

		<div style="width: 60px; height: 60px; border: 1.5px dashed #94a3b8; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase;">
			<span>М.П.</span>
		</div>

		<div style="text-align: right;">
			<div style="font-weight: 700; color: #0f172a;">Врач-стоматолог:</div>
			<div style="margin-top: 20px;">_________________________ / ${doctor}</div>
			<div style="font-size: 9px; color: #64748b; margin-top: 2px;">(подпись и личная печать)</div>
		</div>
	</div>
</div>`;
}

/**
 * Запись измерения рабочей длины и параметров обтурации корневого канала (Форма 043/у).
 */
export interface EndoWorkingLengthEntry {
	readonly id?: string | undefined;
	readonly canalName: string;
	readonly referencePoint?: string | undefined;
	readonly workingLengthMm: number | string;
	readonly masterApicalFile?: string | undefined;
	readonly taper?: string | undefined;
	readonly obturationTechnique?: string | undefined;
	readonly sealer?: string | undefined;
	readonly notes?: string | undefined;
}

/** Пресеты современных эндодонтических силеров */
export interface EndoSealerOption {
	readonly id: string;
	readonly name: string;
	readonly brand: string;
	readonly category: "epoxy" | "bioceramic" | "calcium_hydroxide" | "zinc_oxide";
	readonly description: string;
}

export const ENDO_SEALER_OPTIONS: readonly EndoSealerOption[] = [
	{
		id: "ah_plus",
		name: "AH Plus (Dentsply)",
		brand: "AH Plus",
		category: "epoxy",
		description: "Эпоксидный гидрофобный силер, золотой стандарт герметичности",
	},
	{
		id: "bioroot_rcs",
		name: "BioRoot RCS (Septodont)",
		brand: "BioRoot RCS",
		category: "bioceramic",
		description: "Биоактивный трикальцийсиликатный биокерамический силер",
	},
	{
		id: "total_fill",
		name: "TotalFill BC Sealer (FKG)",
		brand: "TotalFill BC",
		category: "bioceramic",
		description: "Премиальный нанобиокерамический инжектируемый силер",
	},
	{
		id: "calcium_hydroxide",
		name: "Каласепт / Metapex (Ca(OH)2)",
		brand: "Каласепт",
		category: "calcium_hydroxide",
		description: "Временная антисептическая паста гидроксида кальция pH 12.5",
	},
];

/** Методики обтурации корневых каналов */
export interface EndoObturationMethodOption {
	readonly id: string;
	readonly name: string;
	readonly shortLabel: string;
	readonly description: string;
}

export const ENDO_OBTURATION_METHOD_OPTIONS: readonly EndoObturationMethodOption[] = [
	{
		id: "lateral_compaction",
		name: "Латеральная компакция холодной гуттаперчи",
		shortLabel: "Латеральная компакция",
		description: "Классический метод холодной латеральной конденсации",
	},
	{
		id: "vertical_condensation",
		name: "Вертикальная конденсация разогретой гуттаперчи",
		shortLabel: "Вертикальная конденсация",
		description: "Трёхмерная обтурация разогретой термопластифицированной гуттаперчей",
	},
	{
		id: "single_cone_bioceramic",
		name: "Метод одного калиброванного штифта + биокерамика (BioRoot RCS)",
		shortLabel: "Моноштифт + Биокерамика",
		description: "Гидравлическая обтурация биокерамическим силером",
	},
	{
		id: "continuous_wave",
		name: "Метод непрерывной волны (System B / Elements)",
		shortLabel: "Непрерывная волна",
		description: "Горячая вертикальная конденсация непрерывной волной",
	},
	{
		id: "temporary_caoh2",
		name: "Временное пломбирование гидроксидом кальция",
		shortLabel: "Временная Ca(OH)2",
		description: "Межсеансовое антисептическое лечение деструктивных периодонтитов",
	},
];

/**
 * Генерация структурированной таблицы учета рабочей длины корневых каналов для Формы 043/у.
 * Включает точные столбцы: Канал, Реперный ориентир, Длина (WL) в мм, Мастер-файл (MAF), Метод обтурации и Силер.
 */
export function generateEndoWorkingLengthTable(
	canals: readonly EndoWorkingLengthEntry[],
): string {
	const header = [
		"ТАБЛИЦА УЧЕТА РАБОЧЕЙ ДЛИНЫ КОРНЕВЫХ КАНАЛОВ (Форма 043/у):",
		"┌──────────────┬─────────────────────────────┬─────────────┬─────────────┬──────────────────────────────────────────┐",
		"│ Канал        │ Реперный ориентир           │ Длина (WL)  │ Мастер-файл │ Метод обтурации / Силер                  │",
		"├──────────────┼─────────────────────────────┼─────────────┼─────────────┼──────────────────────────────────────────┤",
	];

	const rows = canals.map((c) => {
		const mafMatch = String(c.masterApicalFile ?? "").match(/(?:ISO\s*\d+|#\d+|\d+)/i);
		const mafClean = mafMatch ? mafMatch[0] : (c.masterApicalFile ?? "ISO 25");
		const taperMatch = String(c.taper ?? "").match(/\.\d+/);
		const taperClean = taperMatch ? taperMatch[0] : (c.taper ?? ".06");
		const mafFormatted = `${mafClean}/${taperClean}`.trim();
		let lengthStr = "—";
		if (c.workingLengthMm !== undefined && c.workingLengthMm !== null && c.workingLengthMm !== "") {
			const num = typeof c.workingLengthMm === "number" ? c.workingLengthMm : parseFloat(String(c.workingLengthMm));
			lengthStr = !isNaN(num) ? `${num.toFixed(1)} мм` : `${c.workingLengthMm} мм`;
		}
		const obt = c.obturationTechnique
			? `${c.obturationTechnique}${c.sealer ? ` + ${c.sealer}` : ""}`
			: "Гуттаперча + AH Plus";

		const colCanal = (c.canalName || "—").padEnd(12);
		const colRef = (c.referencePoint || "Щечный бугор").slice(0, 27).padEnd(27);
		const colWl = lengthStr.padEnd(11);
		const colMaf = mafFormatted.padEnd(11);
		const colObt = obt.slice(0, 40).padEnd(40);

		return `│ ${colCanal} │ ${colRef} │ ${colWl} │ ${colMaf} │ ${colObt} │`;
	});

	const footer = "└──────────────┴─────────────────────────────┴─────────────┴─────────────┴──────────────────────────────────────────┘";

	return [...header, ...rows, footer].join("\n");
}

/**
 * Быстрое форматирование эндодонтического протокола с рабочей длиной каналов, апекслокатором и обтурацией.
 */
export function formatEndoProtocolQuickSnippet(params: {
	readonly toothNumber?: number | string | undefined;
	readonly canals: readonly EndoWorkingLengthEntry[];
	readonly sealer?: string | undefined;
	readonly obturationTechnique?: string | undefined;
	readonly irrigation?: string | undefined;
	readonly radiology?: string | undefined;
}): string {
	const toothStr = params.toothNumber ? `Зуб ${params.toothNumber}` : "Эндодонтический протокол";
	const irrigation = params.irrigation || "3% NaOCl + 17% EDTA (ультразвуковая активация)";
	const radiology = params.radiology || "Визиография: каналы обтурированы плотно до апекса";
	const table = generateEndoWorkingLengthTable(params.canals);

	const canalSummaries = params.canals.map((c) => {
		let len = "—";
		if (c.workingLengthMm !== undefined && c.workingLengthMm !== null && c.workingLengthMm !== "") {
			const num = typeof c.workingLengthMm === "number" ? c.workingLengthMm : parseFloat(String(c.workingLengthMm));
			len = !isNaN(num) ? `${num.toFixed(1)} мм` : `${c.workingLengthMm} мм`;
		}
		const maf = c.masterApicalFile || "#25";
		const taper = c.taper || ".06";
		const ref = c.referencePoint ? ` (репер: ${c.referencePoint})` : "";
		return `• ${c.canalName}${ref}: WL=${len}, MAF=${maf}/${taper}`;
	}).join("\n");

	return [
		`ЭНДОДОНТИЧЕСКИЙ ПРОТОКОЛ (${toothStr}):`,
		"Коффердам. Доступ к устьям, NiTi инструментальная обработка, апекслокация (Apex 0.0).",
		canalSummaries,
		"",
		table,
		"",
		`Ирригация: ${irrigation}.`,
		`Обтурация: ${params.obturationTechnique || "Гуттаперча"} + ${params.sealer || "AH Plus"}.`,
		`Рентген-контроль: ${radiology}.`,
	].join("\n");
}

/**
 * Неразрушающее добавление эндодонтического протокола в поле лечения SOAP-дневника.
 */
export function appendEndoProtocolToSoap(
	diary: DiaryState,
	endoSnippet: string,
): DiaryState {
	const cur = (diary.treatmentDescription ?? "").trim();
	const endoTrim = (endoSnippet ?? "").trim();
	if (!endoTrim) return diary;
	if (cur.includes(endoTrim)) return diary;

	const nextTreatment = cur ? `${cur}\n\n${endoTrim}` : endoTrim;
	return {
		...diary,
		treatmentDescription: nextTreatment,
	};
}



/**
 * Клиническое фотоприложение к карте стоматологического пациента (Форма 043/у).
 */
export interface ClinicalPhotoAttachment {
	readonly id: string;
	readonly toothNumber?: number | undefined;
	readonly photoType: "before" | "after" | "process" | "intraoral_macro" | "face_portrait";
	readonly photoUrl: string;
	readonly description?: string | undefined;
	readonly capturedAtIso?: string | undefined;
}

/**
 * Генерация структурированной ведомости фотоприложений («До / После») для формы 043/у.
 */
export function generatePhotoProtocolAttachmentsStatement(
	photos: readonly ClinicalPhotoAttachment[],
): string {
	if (!photos || photos.length === 0) return "";

	const typeLabels: Record<string, string> = {
		before: "Исходная ситуация (До лечения)",
		after: "Финальный результат (После лечения)",
		process: "Этап лечения (Изоляция / Препарирование / Обтурация)",
		intraoral_macro: "Внутриротовой макроснимок",
		face_portrait: "Портретная фотография лица",
	};

	const header = "ВЕДОМОСТЬ ФОТОПРОТОКОЛА И ПРИЛОЖЕНИЙ (Форма 043/у):";
	const lines = photos.map((p, idx) => {
		const toothStr = p.toothNumber ? `Зуб ${p.toothNumber}` : "Общий вид зубного ряда";
		const typeStr = typeLabels[p.photoType] || "Фотоснимок";
		const descStr = p.description ? ` (${p.description})` : "";
		const dateStr = p.capturedAtIso ? ` [${new Date(p.capturedAtIso).toLocaleDateString("ru-RU")}]` : "";
		return `${idx + 1}. [${toothStr}] ${typeStr}${descStr}${dateStr}`;
	});

	return `${header}\n${lines.join("\n")}`;
}

/**
 * Опции для формирования Информированного добровольного согласия (ИДС) по Приказу Минздрава РФ № 1051н.
 */
export interface InformedConsent1051nOptions {
	readonly patientFullName?: string | null | undefined;
	readonly patientBirthDate?: string | null | undefined;
	readonly patientPassport?: string | null | undefined;
	readonly patientAddress?: string | null | undefined;
	readonly doctorFullName?: string | null | undefined;
	readonly doctorSpecialty?: string | null | undefined;
	readonly clinicName?: string | null | undefined;
	readonly clinicLicense?: string | null | undefined;
	readonly interventionType?: "therapy" | "surgery" | "anesthesia" | "general" | string | undefined;
	readonly toothNumbers?: string | null | undefined;
	readonly diagnosisIcd?: string | null | undefined;
	readonly consentDate?: string | null | undefined;
}

/**
 * Генерация текста официального бланка ИДС в соответствии со ст. 20 323-ФЗ и Приказом Минздрава России № 1051н.
 */
export function generateInformedConsent1051nText(
	options: InformedConsent1051nOptions,
): string {
	const clinic =
		options.clinicName || "Стоматологическая клиника «DENTE» (ООО «ДЕНТЕ МЕДИКАЛ ГРУПП»)";
	const license =
		options.clinicLicense ||
		"№ ЛО41-01137-77/00368421 от 14.02.2023 г. выдана Департаментом здравоохранения города Москвы";
	const patient = options.patientFullName || "________________________________________";
	const birthDate = options.patientBirthDate || "____.____.________";
	const passport = options.patientPassport || "документ, удостоверяющий личность: ____________________";
	const doctor = options.doctorFullName || "________________________________________";
	const date = options.consentDate || new Date().toLocaleDateString("ru-RU");
	const diagnosis = options.diagnosisIcd ? ` по поводу: ${options.diagnosisIcd}` : "";
	const teeth = options.toothNumbers ? ` в области зубов: ${options.toothNumbers}` : "";

	return `ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ НА МЕДИЦИНСКОЕ ВМЕШАТЕЛЬСТВО
(в соответствии со статьей 20 Федерального закона от 21.11.2011 № 323-ФЗ и Приказом Минздрава России от 12.11.2021 № 1051н)

Медицинская организация: ${clinic}
Лицензия: ${license}

1. Я, ${patient}, дата рождения: ${birthDate} (${passport}), даю информированное добровольное согласие на проведение комплекса медицинских вмешательств${teeth}${diagnosis} лечащему врачу ${doctor}.
2. Мне в доступной форме разъяснены цели, методы оказания медицинской помощи, связанный с ними риск, возможные варианты медицинских вмешательств, их последствия, в том числе вероятность развития осложнений, а также предполагаемые результаты оказания медицинской помощи.
3. Согласие дано на следующие виды стоматологических вмешательств:
   - Местная инфильтрационная, проводниковая или аппликационная анестезия;
   - Препарирование твердых тканей зубов, медикаментозная обработка кариозных полостей и корневых каналов;
   - Эндодонтическое и терапевтическое лечение, постановка светоотверждаемых пломб и реставраций;
   - Хирургические манипуляции (при необходимости: удаление зубов, наложение швов, кюретаж лунки);
   - Рентгенологические исследования (прицельная радиовизиография, ОПТГ, КЛКТ).
4. Я подтверждаю, что сообщил(а) лечащему врачу полную информацию о наличии соматических заболеваний, аллергических реакций на лекарственные препараты и постоянном приеме медикаментов.
5. Я поставлен(а) в известность о необходимости строгого соблюдения назначенного режима лечения, послеоперационного ухода и явки на контрольные осмотры.

Дата оформления: ${date}

Пациент (законный представитель): _________________________ / ${patient}
(подпись)

Врач-стоматолог: _________________________ / ${doctor}
(подпись)

М.П. Клиники`;
}

/**
 * Генерация HTML-разметки официального печатного бланка ИДС А4 (Приказ № 1051н).
 */
export function generateInformedConsent1051nHtml(
	options: InformedConsent1051nOptions,
): string {
	const clinic =
		options.clinicName || "Стоматологическая клиника «DENTE» (ООО «ДЕНТЕ МЕДИКАЛ ГРУПП»)";
	const license =
		options.clinicLicense ||
		"№ ЛО41-01137-77/00368421 от 14.02.2023 г. выдана Департаментом здравоохранения города Москвы";
	const patient = options.patientFullName || "—";
	const birthDate = options.patientBirthDate || "—";
	const passport = options.patientPassport || "Паспорт гражданина РФ: _________________________";
	const address = options.patientAddress || "__________________________________________________";
	const doctor = options.doctorFullName || "—";
	const specialty = options.doctorSpecialty || "Врач-стоматолог";
	const date = options.consentDate || new Date().toLocaleDateString("ru-RU");
	const diagnosis = options.diagnosisIcd ? ` по диагнозу: ${options.diagnosisIcd}` : "";
	const teeth = options.toothNumbers ? ` в области зубов: ${options.toothNumbers}` : "";

	return `<div class="informed-consent-a4-sheet" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; background: #ffffff; padding: 24px; max-width: 210mm; margin: 0 auto; line-height: 1.45; font-size: 12px;">
	<div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
		<div>
			<div style="font-size: 15px; font-weight: 900; text-transform: uppercase; color: #0f172a;">${clinic}</div>
			<div style="font-size: 11px; font-weight: 600; color: #475569; margin-top: 2px;">Лицензия: ${license}</div>
			<div style="font-size: 10px; color: #64748b;">119048, г. Москва, ул. Стоматологическая, д. 24, корп. 1 • Тел: +7 (495) 777-88-99</div>
		</div>
		<div style="text-align: right; font-size: 11px; shrink: 0;">
			<div style="font-weight: 700; color: #0f172a;">Приказ Минздрава РФ № 1051н</div>
			<div style="color: #64748b;">Ст. 20 323-ФЗ</div>
			<div style="font-weight: 600; color: #0f766e; margin-top: 2px;">Дата: ${date}</div>
		</div>
	</div>

	<div style="text-align: center; margin-bottom: 16px;">
		<h1 style="font-size: 14px; font-weight: 900; text-transform: uppercase; margin: 0; color: #0f172a; letter-spacing: 0.02em;">
			Информированное добровольное согласие на медицинское вмешательство
		</h1>
		<div style="font-size: 10px; color: #64748b; margin-top: 4px;">
			(в соответствии со статьей 20 Федерального закона от 21.11.2011 № 323-ФЗ и Приказом Минздрава России от 12.11.2021 № 1051н)
		</div>
	</div>

	<table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px; border: 1px solid #cbd5e1;" style="page-break-inside: avoid; break-inside: avoid;">
		<tbody>
			<tr style="border-bottom: 1px solid #cbd5e1;">
				<td style="padding: 6px 8px; font-weight: 700; background: #f8fafc; width: 25%; border-right: 1px solid #cbd5e1;">Пациент (ФИО):</td>
				<td style="padding: 6px 8px; font-weight: 700; color: #0f172a; width: 40%; border-right: 1px solid #cbd5e1;">${patient}</td>
				<td style="padding: 6px 8px; font-weight: 700; background: #f8fafc; width: 15%; border-right: 1px solid #cbd5e1;">Дата рождения:</td>
				<td style="padding: 6px 8px; width: 20%;">${birthDate}</td>
			</tr>
			<tr style="border-bottom: 1px solid #cbd5e1;">
				<td style="padding: 6px 8px; font-weight: 700; background: #f8fafc; border-right: 1px solid #cbd5e1;">Паспортные данные:</td>
				<td style="padding: 6px 8px; border-right: 1px solid #cbd5e1;">${passport}</td>
				<td style="padding: 6px 8px; font-weight: 700; background: #f8fafc; border-right: 1px solid #cbd5e1;">Адрес проживания:</td>
				<td style="padding: 6px 8px;">${address}</td>
			</tr>
			<tr>
				<td style="padding: 6px 8px; font-weight: 700; background: #f8fafc; border-right: 1px solid #cbd5e1;">Лечащий врач:</td>
				<td style="padding: 6px 8px; font-weight: 600; border-right: 1px solid #cbd5e1;" colspan="3">${doctor} (${specialty})</td>
			</tr>
		</tbody>
	</table>

	<div style="space-y: 8px; text-align: justify; font-size: 11px; color: #1e293b; page-break-inside: avoid; break-inside: avoid;">
		<p style="margin: 0 0 8px 0;">
			<strong>1.</strong> Я, вышеуказанный(ая) пациент(ка) (или законный представитель), даю информированное добровольное согласие на проведение стоматологического медицинского вмешательства${teeth}${diagnosis} врачу ${doctor} в клинике «${clinic}».
		</p>
		<p style="margin: 0 0 8px 0;">
			<strong>2.</strong> Мне в доступной форме разъяснены цели, методы оказания медицинской помощи, связанный с ними риск, возможные варианты медицинских вмешательств, их последствия, в том числе вероятность развития осложнений, а также предполагаемые результаты оказания медицинской помощи.
		</p>
		<p style="margin: 0 0 8px 0;">
			<strong>3.</strong> Медицинское вмешательство включает: местную анестезию (инфильтрационная/проводниковая), препарирование твердых тканей, терапевтическое/эндодонтическое лечение, реставрацию зубов композитными материалами, хирургические процедуры (удаление зубов/кюретаж при показаниях) и рентгенодиагностику.
		</p>
		<p style="margin: 0 0 8px 0;">
			<strong>4.</strong> Я подтверждаю, что сообщил(а) врачу достоверные сведения о перенесенных заболеваниях, аллергических реакциях и принимаемых лекарствах. Я обязуюсь соблюдать предписанный режим лечения и гигиены.
		</p>
	</div>

	<div style="margin-top: 24px; padding-top: 14px; border-top: 1.5px solid #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; page-break-inside: avoid; break-inside: avoid;">
		<div>
			<div style="font-weight: 700; color: #0f172a;">Пациент (законный представитель):</div>
			<div style="margin-top: 24px;">_________________________ / ${patient}</div>
			<div style="font-size: 9px; color: #64748b; margin-top: 2px;">(подпись и расшифровка)</div>
		</div>

		<div style="width: 70px; height: 70px; border: 1.5px dashed #94a3b8; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">
			<span>М.П.</span>
			<span style="font-size: 8px; font-weight: 400;">Клиники</span>
		</div>

		<div style="text-align: right;">
			<div style="font-weight: 700; color: #0f172a;">Врач-стоматолог:</div>
			<div style="margin-top: 24px;">_________________________ / ${doctor}</div>
			<div style="font-size: 9px; color: #64748b; margin-top: 2px;">(подпись и личная печать)</div>
		</div>
	</div>
</div>`;
}



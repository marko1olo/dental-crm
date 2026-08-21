import { isValidFdiToothNumber } from "@dental/shared";
import type { DiaryState } from "../components/useVisitDiaryLogic";

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
		id: "followup_check",
		label: "📅 Контрольный осмотр",
		category: "general",
		text: "Явка на контрольный осмотр через 7-10 дней. При возникновении непроходящей боли, отека или кровотечения — немедленно связаться с клиникой.",
	},
];

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

		const treatmentDescription = isInitial
			? `Зуб ${tooth}: Профессиональная гигиена и очищение поверхности. Медикаментозная антисептическая обработка. Аппликация реминерализирующей системы Icon / глубокое фторирование эмали фторлаком. Полировка.`
			: isRoot
				? `Анестезия (Артикаин 4% 1.7 мл). Препарирование пришеечной кариозной полости зуба ${tooth}, антисептическая обработка полости (хлоргексидин 2%). Реставрация светоотверждаемым стеклоиономерным цементом (СИЦ) / компомером с моделированием анатомической формы. Шлифовка, полировка, защитный лак.`
				: isDeep
					? `Препарирование кариозной полости зуба ${tooth} на ${surfacesStr} поверхности, полная щадящая некрэктомия. Изоляция коффердамом. Антисептическая медикаментозная обработка полости 2% раствором хлоргексидина биглюконата. Лечебная прокладка Ca(OH)2 точечно на дно, изолирующая прокладка СИЦ. Адгезивный протокол: кислотное травление 37% ортофосфорной кислотой (etching), нанесение адгезивной системы (adhesive: праймер + бонд), фотополимеризация 20 сек. Послойное моделирование наногибридным светоотверждаемым композитом (composite layer) с восстановлением окклюзионной анатомии и контактного пункта. Окклюзионная пришлифовка по копирке, шлифовка и полировка (polishing: диски, полиры, паста) до сухого зеркального блеска.`
					: `Препарирование кариозной полости зуба ${tooth} на ${surfacesStr} поверхности, полная некрэктомия, формирование эмалевого фальца. Изоляция рабочего поля коффердамом. Медикаментозная антисептическая обработка 2% раствором хлоргексидина биглюконата. Кислотное травление эмали и дентина 37% ортофосфорной кислотой (etching: эмаль 20 сек, дентин 10 сек), тщательное смывание водой, деликатное подсушивание воздухом. Нанесение адгезивной системы (adhesive: праймер + бонд), экспозиция и втирание 20 сек, раздувание, фотополимеризация 20 сек. Послойное моделирование наногибридным светоотверждаемым композитом (composite layer) с восстановлением анатомических бугров, фиссур и контактного пункта. Окклюзионная коррекция по копирке, шлифовка и финишная полировка (polishing: алмазные боры, диски, силиконовые головки, полировочная паста) до сухого зеркального блеска.`;

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
				"Не принимать пищу в течение 2 часов до окончания действия анестезии. Щадящая диета 2-3 дня. Контрольный осмотр при возникновении дискомфорта.",
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

		const treatmentDescription = `Зуб ${tooth}: Эндодонтическое лечение. Проводниковая/инфильтрационная анестезия (Артикаин 4% 1.7 мл). Препарирование кариозной полости, раскрытие полости зуба, создание прямолинейного эндодонтического доступа. Изоляция коффердамом. Витальная экстирпация пульпы / девитализация. Определение рабочей длины корневых каналов электронным апекслокатором и контрольной визиографией. Механическая инструментальная обработка каналов NiTi ротационными файлами (canal instrumentation) по методике Crown-Down с обильной медикаментозной ирригацией 3% гипохлоритом натрия (NaOCl) и 17% ЭДТА с ультразвуковой активацией. Высушивание стерильными бумажными штифтами. Временная лечебная паста Calcept (гидроксид кальция) под герметичную повязку / трехмерная обтурация каналов гуттаперчей с эпоксидным силером (gutta-percha obturation) методом латеральной/вертикальной конденсации. Рентген-контроль обтурации. Восстановление коронковой части зуба композитом.`;

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
			? `Анестезия (Артикаин 4% 1.7 мл). Создание эндодонтического доступа зуба ${tooth}, раскрытие полости, эвакуация распада из корневых каналов для создания оттока экссудата. Изоляция коффердамом. Определение рабочей длины. Инструментальная обработка каналов, обильная антисептическая ирригация (antiseptic irrigation: 0.05% хлоргексидин, теплый физраствор). Временное введение противовоспалительной пасты под герметичную повязку. Назначены НПВС, щадящая диета. Повторный прием через 3–5 дней.`
			: `Анестезия (Артикаин 4% 1.7 мл). Раскрытие полости зуба ${tooth}, удаление старого пломбировочного материала / распломбировка и ревизия корневых каналов (canal desobturation). Прохождение каналов до физиологического апекса под контролем апекслокатора. Механическая и медикаментозная антисептическая обработка (NaOCl 3%, 2% хлоргексидин, ЭДТА 17%, УЗ-активация — antiseptic irrigation). Временная обтурация корневых каналов пастой на основе гидроксида кальция Calcept (calcium hydroxide) с целью антисептического воздействия и стимуляции остеогенеза. Постановка герметичной временной пломбы (Cavit / СИЦ). Контрольный визит через 10-14 дней для постоянного пломбирования.`;

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
			stateNorm.includes("periodontitis") || stateNorm.startsWith("k05.3");
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
			"Анестезия, препарирование, медобработка, травление, адгезив, пломба композитом светового отверждения, полировка.",
		defaultIcd10: "K02.1",
		anamnesis:
			"Жалобы на кратковременные боли от температурных (холодное, горячее) и химических (сладкое, кислое) раздражителей, застревание пищи в межзубном промежутке.",
		statusLocalis:
			"При осмотре: кариозная полость средней глубины в пределах дентина. Зондирование слабоболезненно по эмалево-дентинной границе, дно и стенки плотные, пигментированные. Перкуссия безболезненна. Холодовая проба слабоположительная, быстропроходящая. ЭОД 6–8 мкА.",
		treatmentDescription:
			"Инфильтрационная/проводниковая анестезия. Препарирование кариозной полости, полная некрэктомия, формирование эмалевого фальца. Изоляция рабочего поля коффердамом. Медикаментозная обработка 2% раствором хлоргексидина биглюконата. Кислотное травление эмали и дентина 37% ортофосфорной кислотой (etching: эмаль 20 сек, дентин 10 сек), смывание водой, деликатное подсушивание воздухом без пересушивания. Нанесение адгезивной системы (adhesive: праймер + бонд), экспозиция 20 сек, раздувание, фотополимеризация 20 сек. Послойное моделирование наногибридным светоотверждаемым композитом (composite layer) с восстановлением анатомической формы бугров, фиссур и контактного пункта. Окклюзионная коррекция по копирке, шлифовка и полировка (polishing: диски, полиры, паста) до сухого зеркального блеска.",
		recommendations:
			"Не принимать пищу в течение 2 часов до окончания действия анестезии. Щадящая диета 2-3 дня. Контрольный осмотр при возникновении дискомфорта.",
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
			"Проводниковая/инфильтрационная анестезия (Артикаин 4% 1.7 мл). Препарирование, раскрытие полости зуба, создание прямого эндодонтического доступа. Изоляция коффердамом. Витальная экстирпация пульпы из корневых каналов / девитализация. Определение рабочей длины корневых каналов апекслокатором и контрольной рентгенографией. Механическая инструментальная обработка каналов NiTi ротационными файлами (canal instrumentation) с обильной ирригацией 3% гипохлоритом натрия (NaOCl) и 17% ЭДТА с ультразвуковой активацией. Высушивание стерильными бумажными штифтами. Временная лечебная паста Calcept (гидроксид кальция) под герметичную повязку / трехмерная обтурация каналов гуттаперчей с эпоксидным силером (gutta-percha obturation) методом латеральной/вертикальной конденсации. Рентген-контроль обтурации. Восстановление коронковой части зуба.",
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
			"Анестезия (Артикаин 4% 1.7 мл). Раскрытие полости зуба, удаление старого пломбировочного материала, распломбировка и ревизия корневых каналов (canal desobturation). Прохождение каналов до апекса под контролем апекслокатора. Механическая и медикаментозная антисептическая обработка (antiseptic irrigation: NaOCl 3%, 2% хлоргексидин, ЭДТА 17%, УЗ-активация). Временная обтурация каналов пастой на основе гидроксида кальция Calcept (calcium hydroxide) для мощного антисептического действия и стимуляции остеогенеза. Наложение временной герметичной пломбы (Cavit / СИЦ). Контрольный визит через 10–14 дней.",
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
	const cur = (diary.treatmentDescription ?? "").trim();
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
	readonly label: string;
	readonly subLabel: string;
	readonly volume: string;
	readonly textToInsert: string;
}

/** 5 основных анестетиков в стоматологической практике */
export const ANESTHESIA_QUICK_PRESETS: readonly AnesthesiaQuickPreset[] = [
	{
		id: "ultracain_ds",
		label: "Ультракаин Д-С",
		subLabel: "1.7 мл · 1:200 000",
		volume: "1.7 мл",
		textToInsert:
			"Анестезия: Ультракаин Д-С (Артикаин 4% с эпинефрином 1:200 000) 1.7 мл.",
	},
	{
		id: "ultracain_ds_forte",
		label: "Ультракаин Д-С Форте",
		subLabel: "1.7 мл · 1:100 000",
		volume: "1.7 мл",
		textToInsert:
			"Анестезия: Ультракаин Д-С Форте (Артикаин 4% с эпинефрином 1:100 000) 1.7 мл.",
	},
	{
		id: "septanest",
		label: "Септанест",
		subLabel: "1.7 мл · 1:100 000",
		volume: "1.7 мл",
		textToInsert:
			"Анестезия: Септанест (Артикаин 4% с адреналином 1:100 000) 1.7 мл.",
	},
	{
		id: "scandonest",
		label: "Скандонест 3%",
		subLabel: "1.7 мл · без адреналина",
		volume: "1.7 мл",
		textToInsert:
			"Анестезия: Скандонест 3% (Мепивакаин 3% без адреналина/вазоконстриктора) 1.7 мл.",
	},
	{
		id: "lidocaine",
		label: "Лидокаин 2%",
		subLabel: "2.0 мл",
		volume: "2.0 мл",
		textToInsert: "Анестезия: Лидокаин 2% 2.0 мл.",
	},
];

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

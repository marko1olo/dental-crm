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
		| string;
	/** Поражённые поверхности (B, L, M, D, O) */
	readonly surfaces?: readonly string[] | readonly ToothSurfaceKey[];
	/** Явный код МКБ-10 (если выбран вручную) */
	readonly icd10Override?: string;
	/** Степень / форма (например, "deep", "medium", "acute", "chronic") */
	readonly subType?:
		| "initial"
		| "medium"
		| "deep"
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
	readonly complications?: string;
	readonly comorbidities?: string;
}

export type MergeStrategy = "smart_append" | "fill_blanks_only" | "replace";

export interface MergeSoapOptions {
	readonly strategy?: MergeStrategy;
	readonly deduplicate?: boolean;
	readonly sectionHeader?: boolean;
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

	// 1. КАРИЕС (K02)
	if (stateNorm === "caries" || stateNorm.startsWith("k02")) {
		const isDeep = finding.subType === "deep";
		const isInitial = finding.subType === "initial";
		const icd = finding.icd10Override || (isInitial ? "K02.0" : "K02.1");
		const icdLabel = isInitial
			? "Кариес эмали"
			: isDeep
				? "Кариес дентина (глубокий)"
				: "Кариес дентина (средний)";

		const anamnesis = isInitial
			? `Жалобы на эстетический дефект эмали в области зуба ${tooth} (${surfacesStr}), шероховатость. Болевые ощущения отсутствуют.`
			: isDeep
				? `Жалобы на боли в области зуба ${tooth} от механических, температурных и химических раздражителей (холодное, сладкое), сохраняющиеся некоторое время после устранения причины, застревание пищи на ${surfacesStr} поверхности.`
				: `Жалобы на кратковременные боли в зубе ${tooth} от температурных и химических раздражителей (холодное, сладкое), быстро проходящие после прекращения действия фактора, застревание пищи в области ${surfacesStr} поверхности.`;

		const statusLocalis = isInitial
			? `При осмотре зуба ${tooth}: на ${surfacesStr} поверхности определяется матовое меловидное пятно с потерей естественного блеска эмали. Зондирование безболезненно, поверхность слегка шероховатая. Перкуссия зуба безболезненна. Реакция на температурные раздражители интактна. ЭОД — 4-6 мкА.`
			: isDeep
				? `При осмотре зуба ${tooth}: на ${surfacesStr} поверхности визуализируется глубокая кариозная полость в пределах околопульпарного дентина, выполненная размягчённым пигментированным дентином. Полость не сообщается с полостью зуба. Зондирование дна полости болезненно. Перкуссия зуба безболезненна. Реакция на холод болезненна, быстро купируется. ЭОД — 15-20 мкА. Рентгенологически: дефект твёрдых тканей коронки, периапикальные изменения отсутствуют.`
				: `При осмотре зуба ${tooth}: на ${surfacesStr} поверхности обнаружена кариозная полость средней глубины в пределах плащевого дентина. Дно и стенки плотные, пигментированные. Зондирование болезненно по эмалево-дентинной границе. Перкуссия безболезненна. Холодовая проба слабоположительная, быстропроходящая. ЭОД — 6-8 мкА.`;

		const treatmentDescription = isInitial
			? `Проведена профессиональная гигиена и очищение поверхности зуба ${tooth}. Медикаментозная обработка антисептиком. Высушивание. Аппликация реминерализирующей системы / инфильтрация кариеса препаратом Icon. Полировка. Даны рекомендации по домашней гигиене и реминерализующей терапии.`
			: isDeep
				? `Анестезия инфильтрационная/проводниковая (Артикаин 4% с эпинефрином 1:200 000). Препарирование кариозной полости зуба ${tooth}, осторожная некрэктомия с сохранением дна полости. Изоляция рабочего поля (коффердам). Медикаментозная антисептическая обработка полости (хлоргексидин 2%). Наложение лечебной прокладки на основе гидроксида кальция точечно на дно полости. Изолирующая прокладка из светоотверждаемого стеклоиономерного цемента (СИЦ). Адгезивный протокол (самопротравливающий праймер + бонд). Послойная анатомическая реставрация композитным материалом светового отверждения с восстановлением анатомии, фиссур и контактных пунктов. Шлифовка, полировка (диски, полиры). Контроль окклюзии.`
				: `Инфильтрационная/проводниковая анестезия (Артикаин 4% 1:200 000). Препарирование кариозной полости зуба ${tooth} на ${surfacesStr} поверхности, полная некрэктомия. Изоляция коффердамом. Антисептическая обработка 2% раствором хлоргексидина биглюконата. Нанесение адгезивной системы. Послойное пломбирование наногибридным светоотверждаемым композитом. Формирование окклюзионной поверхности и краевого прилегания. Окклюзионное пришлифовывание, полировка до сухого блеска. Рекомендации.`;

		return {
			toothNumber: tooth,
			toothNameRu: toothTitle,
			diagnosisIcd10: icd,
			diagnosisIcd10Label: icdLabel,
			diagnosisTooth: String(tooth),
			anamnesis,
			statusLocalis,
			treatmentDescription,
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

		const anamnesis = `Жалобы на самопроизвольные острые приступообразные боли в области зуба ${tooth}, значительно усиливающиеся в ночное время и от действия термических раздражителей (особенно холодного/горячего). Боль иррадиирует по ходу ветвей тройничного нерва. Болевой приступ длится более 15–30 минут после устранения раздражителя.`;

		const statusLocalis = `При осмотре зуба ${tooth}: на ${surfacesStr} поверхности определяется глубокая кариозная полость, заполненная размягчённым дентином, сообщающаяся (или разделенная тонким слоем дентина) с полостью зуба. Зондирование вскрытой точки рога пульпы резко болезненно, сопровождается кровоточивостью. Перкуссия зуба сравнительно безболезненна (или слабочувствительна). Термопроба резко положительна с длительным болевым последействием. ЭОД — 25-45 мкА. Рентгенография: глубокий дефект коронковой части, периодонтальная щель без деструктивных изменений.`;

		const treatmentDescription = `Проводниковая/инфильтрационная анестезия (Артикаин 4% 1.7 мл). Препарирование кариозной полости зуба ${tooth}, формирование прямого эндодонтического доступа, раскрытие полости зуба. Наложение коффердама. Витальная экстирпация пульпы из корневых каналов. Определение рабочей длины каналов с помощью апекслокатора и контрольной визиографии. Механическая инструментальная обработка каналов ротационными NiTi-файлами с постоянной обильной ирригацией 3% раствором гипохлорита натрия (NaOCl) и 17% раствором ЭДТА с ультразвуковой активацией. Высушивание каналов стерильными бумажными штифтами. Трехмерная обтурация корневых каналов гуттаперчевыми штифтами с эпоксидным силером методом латеральной/вертикальной конденсации. Рентген-контроль качества пломбирования каналов до апекса. Восстановление коронковой части зуба композитным материалом.`;

		return {
			toothNumber: tooth,
			toothNameRu: toothTitle,
			diagnosisIcd10: icd,
			diagnosisIcd10Label: icdLabel,
			diagnosisTooth: String(tooth),
			anamnesis,
			statusLocalis,
			treatmentDescription,
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
			? `Жалобы на постоянную локализованную ноющую и пульсирующую боль в зубе ${tooth}, резко усиливающуюся при малейшем накусывании и прикосновении. Ощущение «выросшего зуба», отёчность прилежащей десны.`
			: `Жалобы на незначительный дискомфорт или чувство тяжести в области зуба ${tooth} при жевании твёрдой пищи, изменение цвета коронки. В анамнезе зуб ранее лечен или подвергался травме.`;

		const statusLocalis = isAcute
			? `Коронка зуба ${tooth} изменена в цвете / глубокая кариозная полость / пломба. Полость зуба вскрыта, зондирование устьев каналов безболезненно. Вертикальная и горизонтальная перкуссия резко болезненна. Пальпация по переходной складке в области верхушки корня болезненна, слизистая гиперемирована, отечна. Реакция на холод/тепло отсутствует. ЭОД > 100 мкА. Рентгенологически: расширение периодонтальной щели в области верхушки корня.`
			: `Коронка зуба ${tooth} девитализирована, серый оттенок / дефект пломбы. Зондирование безболезненно. Перкуссия слабочувствительна или безболезненна. Пальпация по переходной складке безболезненна. ЭОД > 100 мкА. Рентгенограмма: у верхушки корня определяется очаг деструкции костной ткани с четкими/нечеткими контурами (периапикальный очаг).`;

		const treatmentDescription = isAcute
			? `Анестезия. Создание эндодонтического доступа зуба ${tooth}, раскрытие полости, эвакуация распада из корневых каналов для создания оттока экссудата. Изоляция коффердамом. Определение рабочей длины. Инструментальная обработка каналов, обильная антисептическая ирригация (0.05% хлоргексидин, теплый физраствор). Временное введение противовоспалительной пасты под герметичную повязку. Назначены НПВС, щадящая диета. Повторный прием через 3–5 дней.`
			: `Анестезия. Раскрытие полости зуба ${tooth}, удаление старого пломбировочного материала / распломбировка корневых каналов. Прохождение каналов до физиологического апекса под контролем апекслокатора. Механическая и медикаментозная обработка (NaOCl 3%, ЭДТА 17%, УЗ-активация). Временная обтурация корневых каналов пастой на основе гидроксида кальция Ca(OH)2 с целью антисептического воздействия и стимуляции остеогенеза. Постановка герметичной временной пломбы. Контрольный визит через 14 дней для постоянного пломбирования.`;

		return {
			toothNumber: tooth,
			toothNameRu: toothTitle,
			diagnosisIcd10: icd,
			diagnosisIcd10Label: icdLabel,
			diagnosisTooth: String(tooth),
			anamnesis,
			statusLocalis,
			treatmentDescription,
		};
	}

	// 4. ГИНГИВИТ / ПАРОДОНТИТ (K05 / K05.1 / K05.3)
	if (
		stateNorm === "gingivitis" ||
		stateNorm.startsWith("k05") ||
		stateNorm.includes("perio")
	) {
		const isPeriodontitis =
			stateNorm.includes("periodontitis") || stateNorm.startsWith("k05.3");
		const depth = finding.pocketDepthMm ?? (isPeriodontitis ? 4 : 2);
		const icd = finding.icd10Override || (isPeriodontitis ? "K05.3" : "K05.1");
		const icdLabel = isPeriodontitis
			? "Хронический пародонтит"
			: "Хронический гингивит";

		const anamnesis = isPeriodontitis
			? `Жалобы на кровоточивость десен при чистке зубов и приеме пищи в области зуба ${tooth}, подвижность зуба, неприятный запах изо рта, оголение шеек зубов, попадание пищи в межзубные промежутки.`
			: `Жалобы на кровоточивость, зуд и болезненность десны в области зуба ${tooth} во время гигиенических процедур.`;

		const statusLocalis = isPeriodontitis
			? `Десна в области зуба ${tooth} отёчна, застойная гиперемия, цианотична. Обильные над- и поддесневые зубные отложения. Глубина пародонтального кармана составляет ${depth} мм с серозно-гнойным экссудатом при компрессии. Патологическая подвижность I-II степени. На рентгенограмме: деструкция костной ткани межальвеолярных перегородок до 1/3–1/2 длины корня.`
			: `Маргинальный и папиллярный край десны в области зуба ${tooth} гиперемирован, отёчен, кровоточит при зондировании (индекс кровоточивости PBI > 1). Зубодесневое прикрепление сохранено, глубина кармана до 2-3 мм. Наличие мягкого зубного налёта и наддесневого зубного камня.`;

		const treatmentDescription = isPeriodontitis
			? `Аппликационная и инфильтрационная анестезия. Ультразвуковой скейлинг и над/поддесневая обработка аппаратом Air-Flow. Закрытый кюретаж пародонтального кармана в области зуба ${tooth} кюретами Грейси. Антисептическая ирригация 0.05% раствором хлоргексидина биглюконата. Инстилляция противовоспалительного пародонтального геля (Метрогил Дента). Обучение индивидуальной гигиене, подбор межзубных ершиков и монопучковых щеток. Контрольный осмотр через 10-14 дней.`
			: `Профессиональная гигиена полости рта: ультразвуковое снятие наддесневых минерализованных отложений, удаление пигментированного налета Air-Flow. Полировка шеек зуба ${tooth} абразивной пастой. Антисептическая обработка десны, аппликация реминерализующего лака. Инструктаж по гигиене.`;

		return {
			toothNumber: tooth,
			toothNameRu: toothTitle,
			diagnosisIcd10: icd,
			diagnosisIcd10Label: icdLabel,
			diagnosisTooth: String(tooth),
			anamnesis,
			statusLocalis,
			treatmentDescription,
		};
	}

	// 5. ОТСУТСТВИЕ ЗУБА / УДАЛЕНИЕ (K08.1 / Missing)
	if (stateNorm === "missing" || stateNorm.startsWith("k08.1")) {
		const icd = finding.icd10Override || "K08.1";
		const icdLabel = "Потеря зубов вследствие удаления или несчастного случая";

		return {
			toothNumber: tooth,
			toothNameRu: toothTitle,
			diagnosisIcd10: icd,
			diagnosisIcd10Label: icdLabel,
			diagnosisTooth: String(tooth),
			anamnesis: `Жалобы на отсутствие зуба ${tooth}, нарушение жевательной эффективности и эстетики зубного ряда. Удаление зуба в анамнезе по поводу осложненного кариеса/травмы.`,
			statusLocalis: `При осмотре зуб ${tooth} в зубном ряду отсутствует. Слизистая оболочка альвеолярного отростка в области дефекта бледно-розовая, плотная, без признаков воспаления. Высота и толщина костного гребня достаточна для дентальной имплантации. По данным КЛКТ: достаточный объем костной ткани.`,
			treatmentDescription: `Консультация хирурга-имплантолога и ортопеда. Составлен комплексный план лечения: установка дентального имплантата в позиции зуба ${tooth} с последующим ортопедическим протезированием коронкой. Проведен расчет параметров имплантата по данным КТ. Согласован предварительный план реабилитации.`,
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
			anamnesis: `Жалобы на застревание пищи в области зуба ${tooth}, скол края старой пломбы на ${surfacesStr} поверхности, дискомфорт при жевании.`,
			statusLocalis: `На ${surfacesStr} поверхности зуба ${tooth} определяется старая композитная реставрация с нарушением краевого прилегания, краевой пигментацией и вторичным кариозным процессом под пломбой. Зондирование по краю пломбы болезненно. Перкуссия безболезненна.`,
			treatmentDescription: `Инфильтрационная анестезия. Снятие несостоятельной пломбы зуба ${tooth}, некрэктомия вторичного кариеса. Изоляция коффердамом. Антисептическая обработка 2% хлоргексидином. Адгезивный протокол. Послойная прямая композитная реставрация с восстановлением анатомии и окклюзии. Полировка.`,
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
			anamnesis: `Плановое обращение на этап ортопедического лечения зуба ${tooth}. Жалобы на разрушение твердых тканей зуба более 50% (ИРОПЗ > 0.6).`,
			statusLocalis: `Коронковая часть зуба ${tooth} значительно разрушена, зуб девитализирован, корневые каналы качественно обтурированы по данным рентгенографии. Слизистая оболочка маргинальной десны без признаков воспаления.`,
			treatmentDescription: `Анестезия. Препарирование культи зуба ${tooth} под искусственную коронку с созданием циркулярного уступа 0.5–1.0 мм. Ретракция десны. Получение рабочего двухслойного прецизионного оттиска (А-силикон) и антагонистов. Изготовление и фиксация временной коронки на временный цемент.`,
		};
	}

	// 8. ИМПЛАНТАТ (Implant / Planned_Implant)
	if (stateNorm === "implant" || stateNorm === "planned_implant") {
		const isPlanned = stateNorm === "planned_implant";
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
				? `Пациент обратился для планирования дентальной имплантации в области отсутствующего зуба ${tooth}.`
				: `Плановый осмотр после установки дентального имплантата в позиции зуба ${tooth}. Жалоб нет.`,
			statusLocalis: isPlanned
				? `Альвеолярный гребень в области зуба ${tooth} без признаков патологических процессов, толщина и плотность кости достаточна по КЛКТ.`
				: `В области зуба ${tooth} установлен дентальный имплантат. Формирователь десны / заглушка стабильны. Окружающая слизистая розовая, признаков периимплантита нет.`,
			treatmentDescription: isPlanned
				? `3D-планирование имплантации в зоне зуба ${tooth}. Определение позиционирования и размера имплантата, выбор хирургического протокола.`
				: `Контрольный осмотр, антисептическая обработка области имплантата зуба ${tooth}. Оценка остеоинтеграции по контрольному снимку.`,
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
		anamnesis: `Жалоб со стороны зуба ${tooth} пациент не предъявляет. Профилактический осмотр.`,
		statusLocalis: `При осмотре зуб ${tooth} интактен. Твердые ткани без кариозных поражений. Зондирование фиссур и контактных поверхностей безболезненно. Перкуссия безболезненна. Десна вокруг зуба бледно-розовая, плотно прилежит.`,
		treatmentDescription: `Профилактический осмотр зуба ${tooth}. Очищение поверхности, покрытие фторсодержащим лаком для профилактики кариеса.`,
	};
}

/**
 * Неразрушающее слияние (Non-Destructive Merge) данных SOAP-дневника.
 *
 * Если врач уже ввёл свой текст в поля S, O, P, осложнения или сопутствующие:
 * - Никакой ранее набранный текст НЕ стирается.
 * - При `smart_append` (по умолчанию) входящие протоколы аккуратно дописываются через разделитель.
 * - Дублирующиеся фрагменты отсекаются (дедупликация).
 * - Номера зубов в `diagnosisTooth` объединяются и упорядочиваются по стандарту FDI.
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

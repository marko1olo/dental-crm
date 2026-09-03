/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL EMR ENGINE — FORM 043/U & FORM 107-1/U STATUTORY PROTOCOL ENGINE
 * Orders of the Ministry of Health of Russia: № 834n, № 804n, № 1094н
 * Clinical Recommendations of the Dental Association of Russia (СтАР)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
	type FdiToothRecord,
	type ToothSurface,
	type ToothClinicalStatusCode,
	isValidFdiToothNumber,
} from "@dental/shared";

// ─────────────────────────────────────────────────────────────────────────────
// 1. ЖАЛОБЫ И АНАМНЕЗ (COMPLAINTS & ANAMNESIS)
// ─────────────────────────────────────────────────────────────────────────────

export type ClinicalComplaintKey =
	| "acute_spontaneous_pain"
	| "thermal_sensitivity"
	| "filling_lost"
	| "crown_fracture"
	| "gingival_bleeding"
	| "routine_checkup"
	| "food_impaction"
	| "biting_pain"
	| "tooth_mobility"
	| "halitosis"
	| "aesthetic_defect";

export interface ClinicalComplaintPreset {
	readonly id: ClinicalComplaintKey;
	readonly label: string;
	readonly shortLabel: string;
	readonly category: "pain" | "defect" | "periodontal" | "preventive" | "aesthetic";
	readonly defaultSoapText: string;
	readonly suggestedIcd10: readonly string[];
}

export const CLINICAL_COMPLAINTS_PRESETS: readonly ClinicalComplaintPreset[] = [
	{
		id: "acute_spontaneous_pain",
		label: "Острая самопроизвольная боль",
		shortLabel: "Острая боль",
		category: "pain",
		defaultSoapText:
			"Жалобы на острые приступообразные самопроизвольные боли в зубе, усиливающиеся в ночное время, с иррадиацией по ходу ветвей тройничного нерва.",
		suggestedIcd10: ["K04.0", "K04.4"],
	},
	{
		id: "thermal_sensitivity",
		label: "Реакция на холодное и горячее",
		shortLabel: "Термочувствительность",
		category: "pain",
		defaultSoapText:
			"Жалобы на кратковременные/длительные боли от температурных раздражителей (холодного, горячего) и химических агентов (сладкое, кислое).",
		suggestedIcd10: ["K02.1", "K04.0", "K03.1"],
	},
	{
		id: "filling_lost",
		label: "Выпала пломба / нарушение краевого прилегания",
		shortLabel: "Выпала пломба",
		category: "defect",
		defaultSoapText:
			"Жалобы на выпадение старой пломбы, образование дефекта коронковой части зуба, задержку остатков пищи в кариозной полости.",
		suggestedIcd10: ["K02.1", "K04.5", "K08.1"],
	},
	{
		id: "crown_fracture",
		label: "Скол коронки / стенки зуба",
		shortLabel: "Скол коронки",
		category: "defect",
		defaultSoapText:
			"Жалобы на скол твердых тканей коронковой части зуба / стенки коронки, травматизацию языка и слизистой оболочки острыми краями.",
		suggestedIcd10: ["K08.1", "K02.1", "K03.0"],
	},
	{
		id: "gingival_bleeding",
		label: "Кровоточивость десен при чистке зубов",
		shortLabel: "Кровоточивость десен",
		category: "periodontal",
		defaultSoapText:
			"Жалобы на кровоточивость десен при чистке зубов и приеме твердой пищи, отечность и болезненность десневого края, зуд в деснах.",
		suggestedIcd10: ["K05.0", "K05.1", "K05.3"],
	},
	{
		id: "routine_checkup",
		label: "Плановый / профилактический осмотр",
		shortLabel: "Плановый осмотр",
		category: "preventive",
		defaultSoapText:
			"Жалоб на момент осмотра активно не предъявляет. Обратился в плановом порядке для профилактического осмотра и санации полости рта.",
		suggestedIcd10: ["Z01.2", "K02.0", "K05.1"],
	},
	{
		id: "food_impaction",
		label: "Застревание пищи в межзубном промежутке",
		shortLabel: "Застревание пищи",
		category: "defect",
		defaultSoapText:
			"Жалобы на постоянное застревание волокнистой пищи в контактном межзубном промежутке, неприятные ощущения распирания в десне.",
		suggestedIcd10: ["K02.1", "K05.3"],
	},
	{
		id: "biting_pain",
		label: "Боль при накусывании на зуб",
		shortLabel: "Боль при накусывании",
		category: "pain",
		defaultSoapText:
			"Жалобы на болезненность и чувство «выросшего» зуба при накусывании твердой пищи, дискомфорт при смыкании зубных рядов.",
		suggestedIcd10: ["K04.5", "K04.4", "K08.1"],
	},
	{
		id: "tooth_mobility",
		label: "Подвижность зубов / оголение шеек",
		shortLabel: "Подвижность зуба",
		category: "periodontal",
		defaultSoapText:
			"Жалобы на прогрессирующую подвижность зубов, оголение шеек и корней, изменение положения передних зубов, затруднение жевания.",
		suggestedIcd10: ["K05.3"],
	},
	{
		id: "halitosis",
		label: "Неприятный запах изо рта (галитоз)",
		shortLabel: "Запах изо рта",
		category: "periodontal",
		defaultSoapText:
			"Жалобы на стойкий неприятный запах изо рта (галитоз), привкус горечи/гнойного отделяемого, обильный налет на зубах.",
		suggestedIcd10: ["K05.3", "K05.1", "K04.5"],
	},
	{
		id: "aesthetic_defect",
		label: "Эстетический дефект (изменение цвета/формы)",
		shortLabel: "Эстетика",
		category: "aesthetic",
		defaultSoapText:
			"Жалобы на эстетическую неудовлетворенность цветом, формой зуба, потемнение коронки после ранее проведенного лечения.",
		suggestedIcd10: ["K03.0", "K08.1", "K04.5"],
	},
];

/**
 * Синтезирует каноническую строку жалоб (S: Subjective) по набору выбранных ключей.
 */
export function buildComplaintsText(
	selectedKeys: readonly (ClinicalComplaintKey | string)[],
	customNotes?: string | null,
): string {
	const textParts: string[] = [];
	const matchedPresets = CLINICAL_COMPLAINTS_PRESETS.filter((p) =>
		selectedKeys.includes(p.id) || selectedKeys.includes(p.label) || selectedKeys.includes(p.shortLabel),
	);

	if (matchedPresets.length > 0) {
		textParts.push(matchedPresets.map((p) => p.defaultSoapText).join(" "));
	} else if (selectedKeys.length > 0) {
		textParts.push(`Жалобы: ${selectedKeys.join(", ")}.`);
	}

	if (customNotes?.trim()) {
		textParts.push(customNotes.trim());
	}

	return textParts.join(" ").trim() || "Жалоб на момент осмотра не предъявляет (профилактический осмотр).";
}

/**
 * Автоподбор вероятных кодов МКБ-10 по набору выбранных жалоб.
 */
export function suggestIcd10FromComplaints(
	selectedKeys: readonly (ClinicalComplaintKey | string)[],
): string[] {
	const codeSet = new Set<string>();
	for (const key of selectedKeys) {
		const matched = CLINICAL_COMPLAINTS_PRESETS.find(
			(p) => p.id === key || p.label === key || p.shortLabel === key,
		);
		if (matched) {
			for (const code of matched.suggestedIcd10) {
				codeSet.add(code);
			}
		}
	}
	return Array.from(codeSet);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. STATUS LOCALIS & МКБ-10 ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export interface StatusLocalisSynthesisParams {
	readonly toothNumber: number | string;
	readonly icd10Code: string;
	readonly surfaces?: readonly ToothSurface[] | readonly string[] | null;
	readonly subType?: "initial" | "medium" | "deep" | "root" | "acute" | "chronic" | string | null;
	readonly percussionVertical?: "negative" | "positive_mild" | "positive_sharp";
	readonly percussionHorizontal?: "negative" | "positive_mild" | "positive_sharp";
	readonly probingTenderness?: "none" | "along_enamel_dentin_border" | "at_cavity_bottom" | "bleeding_orifice";
	readonly thermalTestResponse?: "indifferent" | "transient_pain" | "lingering_sharp_pain" | "pain_relieved_by_cold";
	readonly eodMicroamperes?: number | null;
	readonly probingPocketDepthMm?: number | null;
	readonly toothMobility?: "none" | "grade_I" | "grade_II" | "grade_III";
}

export interface StatusLocalisSynthesisResult {
	readonly toothNumber: number;
	readonly toothNameRu: string;
	readonly icd10Code: string;
	readonly icd10Title: string;
	readonly clinicalDiagnosisText: string;
	readonly statusLocalisText: string;
	readonly objectiveFindings: {
		readonly percussionVertical: "negative" | "positive_mild" | "positive_sharp";
		readonly percussionHorizontal: "negative" | "positive_mild" | "positive_sharp";
		readonly probingTenderness: "none" | "along_enamel_dentin_border" | "at_cavity_bottom" | "bleeding_orifice";
		readonly thermalTestResponse: "indifferent" | "transient_pain" | "lingering_sharp_pain" | "pain_relieved_by_cold";
		readonly eodMicroamperes: number | null;
		readonly probingPocketDepthMm: number | null;
	};
	readonly recommendedProcedureProtocol: string;
	readonly recommendedMaterials: readonly string[];
}

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

/** Названия молочных зубов по позиции (1–5) */
const PRIMARY_TOOTH_NAMES: Record<number, string> = {
	1: "центральный резец",
	2: "латеральный резец",
	3: "клык",
	4: "первый моляр",
	5: "второй моляр",
};

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

export function getFullToothAnatomicalNameRu(toothNum: number | string): string {
	const n = typeof toothNum === "string" ? parseInt(toothNum, 10) : toothNum;
	if (!isValidFdiToothNumber(n)) {
		return `Зуб ${toothNum}`;
	}
	const quad = Math.floor(n / 10);
	const pos = n % 10;
	const isPrimary = quad >= 5 && quad <= 8;
	const quadName = QUADRANT_NAMES[quad] || "";
	const name = isPrimary ? (PRIMARY_TOOTH_NAMES[pos] || "зуб") : (PERMANENT_TOOTH_NAMES[pos] || "зуб");
	return `${n} (${quadName} ${name})`;
}

/**
 * Синтезирует объективный статус (Status Localis) и клинический диагноз
 * по МКБ-10 с автоматической привязкой к анатомии зуба.
 */
export function generateToothStatusLocalis(
	params: StatusLocalisSynthesisParams,
): StatusLocalisSynthesisResult {
	const toothNum = typeof params.toothNumber === "string" ? parseInt(params.toothNumber, 10) : params.toothNumber;
	const toothName = getFullToothAnatomicalNameRu(toothNum);
	const icd = (params.icd10Code || "K02.1").trim().toUpperCase();

	// 1. K02.1 — КАРИЕС ДЕНТИНА (СРЕДНИЙ / ГЛУБОКИЙ)
	if (icd === "K02.1" || icd.startsWith("K02")) {
		const isDeep = params.subType === "deep";
		const depthText = isDeep ? "глубоких слоев околопульпарного дентина" : "средних слоев дентина";
		const probing: StatusLocalisSynthesisResult["objectiveFindings"]["probingTenderness"] =
			params.probingTenderness ?? (isDeep ? "at_cavity_bottom" : "along_enamel_dentin_border");
		const thermal: StatusLocalisSynthesisResult["objectiveFindings"]["thermalTestResponse"] =
			params.thermalTestResponse ?? "transient_pain";
		const eod = params.eodMicroamperes ?? (isDeep ? 8 : 4);
		const percV = params.percussionVertical ?? "negative";
		const percH = params.percussionHorizontal ?? "negative";

		const diagText = isDeep
			? `K02.1 Кариес дентина (глубокий кариес) зуба ${toothNum}`
			: `K02.1 Кариес дентина (средний кариес) зуба ${toothNum}`;

		const statusText =
			`При осмотре зуба ${toothName}: определяется кариозная полость в пределах ${depthText}. ` +
			`Полость выполнена пигментированным размягченным дентином. Эмалевые края подрыты. ` +
			`Зондирование дна и стенок полости: ${probing === "at_cavity_bottom" ? "болезненно по дну полости" : "слабо болезненно по эмалево-дентинной границе"}, дно плотное, полость зуба не вскрыта. ` +
			`Перкуссия зуба: безболезненная (вертикальная: отрицательная, горизонтальная: отрицательная). ` +
			`Термопроба (холодовой тест): кратковременная болевая реакция, быстро проходящая после устранения раздражителя. ` +
			`Электроодонтодиагностика (ЭОД) = ${eod} мкА (в пределах нормы). Десна в области шейки зуба бледно-розовая, зубодесневое прикрепление сохранено.`;

		return {
			toothNumber: toothNum,
			toothNameRu: toothName,
			icd10Code: "K02.1",
			icd10Title: "Кариес дентина (Caries of dentine)",
			clinicalDiagnosisText: diagText,
			statusLocalisText: statusText,
			objectiveFindings: {
				percussionVertical: percV,
				percussionHorizontal: percH,
				probingTenderness: probing,
				thermalTestResponse: thermal,
				eodMicroamperes: eod,
				probingPocketDepthMm: params.probingPocketDepthMm ?? 1.5,
			},
			recommendedProcedureProtocol:
				"Анестезия инфильтрационная/проводниковая. Изоляция операционного поля коффердамом. Препарирование кариозной полости по Блэку, некрэктомия. Медикаментозная обработка 0.05% хлоргексидином. Адгезивный протокол. Послойная реставрация нанокомпозитом светового отверждения, шлифовка, полировка.",
			recommendedMaterials: [
				"Коффердам латексный + кламп",
				"Адгезивная система V/VII поколения",
				"Наногибридный композит",
				"Полировочная паста Prisma Gloss",
			],
		};
	}

	// 2. K04.0 — ПУЛЬПИТ (PULPITIS)
	if (icd === "K04.0" || icd.startsWith("K04.0")) {
		const percV = params.percussionVertical ?? "positive_mild";
		const percH = params.percussionHorizontal ?? "negative";
		const probing: StatusLocalisSynthesisResult["objectiveFindings"]["probingTenderness"] =
			params.probingTenderness ?? "bleeding_orifice";
		const thermal: StatusLocalisSynthesisResult["objectiveFindings"]["thermalTestResponse"] =
			params.thermalTestResponse ?? "lingering_sharp_pain";
		const eod = params.eodMicroamperes ?? 35;

		const diagText = `K04.0 Пульпит (острый очаговый / диффузный / хронический в обострении) зуба ${toothNum}`;

		const statusText =
			`При осмотре зуба ${toothName}: на коронковой поверхности определяется глубокая кариозная полость, ` +
			`сообщающаяся с полостью зуба в одной точке (или отделенная тонким слоем размягченного дентина). ` +
			`Зондирование в точке сообщения резко болезненно, пульпа кровоточит при легком касании зондом. ` +
			`Перкуссия зуба: слабо положительная (чувствительность при постукивании). ` +
			`Термопроба (холод/тепло): возникает резкая, интенсивная, длительно не проходящая боль (более 1-2 минут). ` +
			`ЭОД = ${eod} мкА (снижение возбудимости коронковой пульпы). ` +
			`На прицельной визиограмме (RVG): кариозный дефект, сообщающийся с полостью зуба, периапикальные ткани интактны, периодонтальная щель не расширена.`;

		return {
			toothNumber: toothNum,
			toothNameRu: toothName,
			icd10Code: "K04.0",
			icd10Title: "Пульпит (Pulpitis)",
			clinicalDiagnosisText: diagText,
			statusLocalisText: statusText,
			objectiveFindings: {
				percussionVertical: percV,
				percussionHorizontal: percH,
				probingTenderness: probing,
				thermalTestResponse: thermal,
				eodMicroamperes: eod,
				probingPocketDepthMm: params.probingPocketDepthMm ?? 2.0,
			},
			recommendedProcedureProtocol:
				"Проводниковая и инфильтрационная анестезия. Изоляция коффердамом. Эндодонтический доступ, раскрытие полости зуба, витальная экстирпация пульпы. Определение рабочей длины апекслокатором с RVG-контролем. Механическая обработка Ni-Ti файлами WaveOne/ProTaper. Ирригация 3% NaOCl с УЗ-активацией + 17% EDTA. Трехмерная горячая обтурация гуттаперчей с AH Plus.",
			recommendedMaterials: [
				"Коффердам",
				"Эндодонтические файлы Ni-Ti",
				"3% NaOCl + 17% EDTA",
				"Гуттаперчевые штифты + эпоксидный силер AH Plus",
			],
		};
	}

	// 3. K04.5 — ХРОНИЧЕСКИЙ АПИКАЛЬНЫЙ ПЕРИОДОНТИТ (CHRONIC APICAL PERIODONTITIS)
	if (icd === "K04.5" || icd.startsWith("K04.5") || icd === "K04.4") {
		const percV = params.percussionVertical ?? "positive_mild";
		const percH = params.percussionHorizontal ?? "negative";
		const probing: StatusLocalisSynthesisResult["objectiveFindings"]["probingTenderness"] =
			params.probingTenderness ?? "none";
		const thermal: StatusLocalisSynthesisResult["objectiveFindings"]["thermalTestResponse"] =
			params.thermalTestResponse ?? "indifferent";
		const eod = params.eodMicroamperes ?? 120;

		const diagText = `K04.5 Хронический апикальный периодонтит зуба ${toothNum}`;

		const statusText =
			`При осмотре зуба ${toothName}: коронковая часть зуба изменена в цвете (сероватый оттенок), ` +
			`определяется дефект твердых тканей или пломба с нарушением краевого прилегания. ` +
			`Полость зуба вскрыта, зондирование устьев корневых каналов безболезненное, распад пульпы с гнилостным запахом. ` +
			`Перкуссия вертикальная: слабо положительная (чувствительная). ` +
			`Термопроба: реакция отсутствует (индифферентна). ЭОД = ${eod} мкА (полный некроз пульпы). ` +
			`Пальпация по переходной складке: легкая болезненность в проекции верхушки корня. ` +
			`На прицельной радиовизиограмме (RVG): в периапикальной области верхушки корня определяется очаг деструкции костной ткани округлой формы диаметром 3-5 мм с нечеткими контурами.`;

		return {
			toothNumber: toothNum,
			toothNameRu: toothName,
			icd10Code: "K04.5",
			icd10Title: "Хронический апикальный периодонтит (Chronic apical periodontitis)",
			clinicalDiagnosisText: diagText,
			statusLocalisText: statusText,
			objectiveFindings: {
				percussionVertical: percV,
				percussionHorizontal: percH,
				probingTenderness: probing,
				thermalTestResponse: thermal,
				eodMicroamperes: eod,
				probingPocketDepthMm: params.probingPocketDepthMm ?? 2.0,
			},
			recommendedProcedureProtocol:
				"Анестезия. Изоляция коффердамом. Распломбирование/ревизия корневых каналов, эвакуация распада. Апекслокация, механическая обработка. Обильная ирригация 3% NaOCl с УЗ-активацией, 17% EDTA. Временная лечебная обтурация каналов высокощелочной пастой гидроксида кальция (Ca(OH)2) под временную герметичную повязку на 14 дней.",
			recommendedMaterials: [
				"Коффердам",
				"Эндодонтический ретритмент-набор",
				"Паста гидроксида кальция (Кальсепт / Metapex)",
				"Временный цемент Cavit / Clip",
			],
		};
	}

	// 4. K05.3 — ХРОНИЧЕСКИЙ ПАРОДОНТИТ (CHRONIC PERIODONTITIS)
	if (icd === "K05.3" || icd.startsWith("K05")) {
		const pocketDepth = params.probingPocketDepthMm ?? 4.5;
		const percV = params.percussionVertical ?? "negative";
		const percH = params.percussionHorizontal ?? "negative";

		const diagText = `K05.3 Хронический генерализованный/локализованный пародонтит средней степени`;

		const statusText =
			`При осмотре тканей пародонта в области зуба ${toothName}: краевая десна застойного цианотичного цвета, ` +
			`отечная, межзубные сосочки утолщены и деформированы. ` +
			`Определяются массивные наддесневые и поддесневые зубные отложения (зубной камень, пигментированный налет). ` +
			`Зондирование: глубина пародонтальных карманов составляет ${pocketDepth} мм с выделением серозно-гнойного экссудата при компрессии. ` +
			`Индекс кровоточивости PBI = 2-3 балла. Подвижность зуба: I-II степени по Миллеру. ` +
			`На панорамной рентгенограмме (ОПТГ): горизонтальная и вертикальная резорбция межальвеолярных перегородок на 1/3-1/2 длины корней.`;

		return {
			toothNumber: toothNum,
			toothNameRu: toothName,
			icd10Code: "K05.3",
			icd10Title: "Хронический пародонтит (Chronic periodontitis)",
			clinicalDiagnosisText: diagText,
			statusLocalisText: statusText,
			objectiveFindings: {
				percussionVertical: percV,
				percussionHorizontal: percH,
				probingTenderness: "none",
				thermalTestResponse: "indifferent",
				eodMicroamperes: 6,
				probingPocketDepthMm: pocketDepth,
			},
			recommendedProcedureProtocol:
				"Аппликационная и инфильтрационная анестезия. Ультразвуковой скейлинг EMS Piezon. Воздушно-абразивная обработка Air-Flow Perio порошком глицина. Закрытый кюретаж пародонтальных карманов кюретами Грейси (Gracey). Антисептическая ирригация 0.05% хлоргексидином. Инстилляция геля Метрогил Дента под десневую повязку Septo-pack.",
			recommendedMaterials: [
				"УЗ насадки для скейлинга",
				"Порошок Air-Flow глицин",
				"Кюреты Грейси",
				"Гель Метрогил Дента",
				"Повязка Septo-pack",
			],
		};
	}

	// 5. K08.1 — УДАЛЕНИЕ / ХИРУРГИЯ (SURGERY)
	if (icd === "K08.1" || icd.startsWith("K08.1")) {
		const diagText = `K08.1 Полное разрушение коронки зуба ${toothNum}, подлежащее хирургическому удалению`;
		const statusText =
			`При осмотре зуба ${toothName}: коронковая часть зуба разрушена полностью ниже уровня десневого края (ИРОПЗ > 0.9). ` +
			`Ткани корня размягчены, пигментированы, терапевтическому и ортопедическому восстановлению не подлежат. ` +
			`Слизистая оболочка вокруг корня гиперемирована, отечна. ` +
			`Перкуссия остатков корня: слабо болезненная. ` +
			`На рентгенограмме (RVG): стенки корня истончены, в периапикальной области очаг деструкции кости 4-5 мм с вовлечением бифуркации.`;

		return {
			toothNumber: toothNum,
			toothNameRu: toothName,
			icd10Code: "K08.1",
			icd10Title: "Потеря зубов вследствие удаления (Loss of teeth due to extraction)",
			clinicalDiagnosisText: diagText,
			statusLocalisText: statusText,
			objectiveFindings: {
				percussionVertical: "positive_mild",
				percussionHorizontal: "negative",
				probingTenderness: "none",
				thermalTestResponse: "indifferent",
				eodMicroamperes: null,
				probingPocketDepthMm: null,
			},
			recommendedProcedureProtocol:
				"Проводниковая и инфильтрационная анестезия. Синдесмотомия круговой связки зуба распатором. Атравматичная люксация элеваторами и экстракция корней анатомическими щипцами. Ревизионный кюретаж лунки ложкой Люкаса, промывание 0.05% хлоргексидином. Формирование сгустка, внесение гемостатической губки Альвостим, ушивание Викрил 4-0.",
			recommendedMaterials: [
				"Элеваторы и корневые щипцы",
				"Ложка Люкаса",
				"Гемостатическая губка Альвостим",
				"Шовный материал Викрил 4-0",
			],
		};
	}

	// FALLBACK
	const diagText = `${icd} Патология твердых тканей зуба ${toothNum}`;
	const statusText =
		`При осмотре зуба ${toothName}: определяются патологические изменения твердых тканей. ` +
		`Перкуссия безболезненная, зондирование слабо болезненное, десна спокойная.`;

	return {
		toothNumber: toothNum,
		toothNameRu: toothName,
		icd10Code: icd,
		icd10Title: "Стоматологическое заболевание",
		clinicalDiagnosisText: diagText,
		statusLocalisText: statusText,
		objectiveFindings: {
			percussionVertical: "negative",
			percussionHorizontal: "negative",
			probingTenderness: "none",
			thermalTestResponse: "indifferent",
			eodMicroamperes: 5,
			probingPocketDepthMm: 1.5,
		},
		recommendedProcedureProtocol: "Санация полости рта, лечение по клиническому протоколу СтАР.",
		recommendedMaterials: ["Анестетик", "Пломбировочный материал"],
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. КАЛЬКУЛЯТОР АНЕСТЕЗИИ (ANESTHESIA DOSAGE & SAFETY CALCULATOR)
// ─────────────────────────────────────────────────────────────────────────────

export type AnesthesiaDrugType =
	| "articaine_4_epi_100k" // Артикаин 4% + эпинефрин 1:100 000 (Ультракаин Д-С форте, Септанест)
	| "articaine_4_epi_200k" // Артикаин 4% + эпинефрин 1:200 000 (Ультракаин Д-С, Септанест)
	| "mepivacaine_3_plain"  // Мепивакаин 3% без вазоконстриктора (Скандонест 3%)
	| "lidocaine_2_plain";   // Лидокаин 2%

export interface AnesthesiaDrugMeta {
	readonly id: AnesthesiaDrugType;
	readonly commercialName: string;
	readonly activeSubstance: string;
	readonly concentrationPercent: number; // 4% -> 40 мг/мл
	readonly carpuleVolumeMl: number; // 1.7 мл или 1.8 мл
	readonly activeMgPerCarpule: number; // 68 мг для 4% в 1.7 мл
	readonly vasoconstrictor: "1:100000" | "1:200000" | "none";
	readonly epinephrineMgPerCarpule: number; // 0.017 мг (17 мкг) для 1:100k
	readonly adultMaxMgPerKg: number; // 7.0 мг/кг
	readonly pediatricMaxMgPerKg: number; // 5.0 мг/кг
	readonly absoluteMaxDoseMgAdult: number; // 500 мг
	readonly containsSulfites: boolean;
	readonly isAdrenalineFree: boolean;
}

export const ANESTHESIA_DRUGS_CATALOG: Record<AnesthesiaDrugType, AnesthesiaDrugMeta> = {
	articaine_4_epi_100k: {
		id: "articaine_4_epi_100k",
		commercialName: "Ультракаин Д-С форте / Септанест 1:100 000",
		activeSubstance: "Артикаин 4% (40 мг/мл) + Эпинефрин 1:100 000",
		concentrationPercent: 4,
		carpuleVolumeMl: 1.7,
		activeMgPerCarpule: 68,
		vasoconstrictor: "1:100000",
		epinephrineMgPerCarpule: 0.017,
		adultMaxMgPerKg: 7.0,
		pediatricMaxMgPerKg: 5.0,
		absoluteMaxDoseMgAdult: 500,
		containsSulfites: true,
		isAdrenalineFree: false,
	},
	articaine_4_epi_200k: {
		id: "articaine_4_epi_200k",
		commercialName: "Ультракаин Д-С / Септанест 1:200 000",
		activeSubstance: "Артикаин 4% (40 мг/мл) + Эпинефрин 1:200 000",
		concentrationPercent: 4,
		carpuleVolumeMl: 1.7,
		activeMgPerCarpule: 68,
		vasoconstrictor: "1:200000",
		epinephrineMgPerCarpule: 0.0085,
		adultMaxMgPerKg: 7.0,
		pediatricMaxMgPerKg: 5.0,
		absoluteMaxDoseMgAdult: 500,
		containsSulfites: true,
		isAdrenalineFree: false,
	},
	mepivacaine_3_plain: {
		id: "mepivacaine_3_plain",
		commercialName: "Скандонест 3% (Мепивакаин без адреналина)",
		activeSubstance: "Мепивакаин 3% (30 мг/мл)",
		concentrationPercent: 3,
		carpuleVolumeMl: 1.7,
		activeMgPerCarpule: 51,
		vasoconstrictor: "none",
		epinephrineMgPerCarpule: 0,
		adultMaxMgPerKg: 4.4,
		pediatricMaxMgPerKg: 4.4,
		absoluteMaxDoseMgAdult: 300,
		containsSulfites: false,
		isAdrenalineFree: true,
	},
	lidocaine_2_plain: {
		id: "lidocaine_2_plain",
		commercialName: "Лидокаин 2%",
		activeSubstance: "Лидокаин 2% (20 мг/мл)",
		concentrationPercent: 2,
		carpuleVolumeMl: 2.0,
		activeMgPerCarpule: 40,
		vasoconstrictor: "none",
		epinephrineMgPerCarpule: 0,
		adultMaxMgPerKg: 4.4,
		pediatricMaxMgPerKg: 4.4,
		absoluteMaxDoseMgAdult: 300,
		containsSulfites: false,
		isAdrenalineFree: true,
	},
};

export interface AnesthesiaDosageParams {
	readonly drugType: AnesthesiaDrugType;
	readonly patientWeightKg: number;
	readonly carpulesCount: number;
	readonly patientAgeYears?: number | null;
	readonly isPediatric?: boolean;
	readonly hasCardiovascularRisk?: boolean;
	readonly hasSulfiteOrAsthmaAllergy?: boolean;
	readonly isPregnantOrLactating?: boolean;
}

export interface AnesthesiaDosageResult {
	readonly drug: AnesthesiaDrugMeta;
	readonly patientWeightKg: number;
	readonly isPediatric: boolean;
	readonly effectiveMaxMgPerKg: number; // 7.0 для взрослых, 5.0 для детей
	readonly carpulesCount: number;
	readonly totalVolumeMl: number;
	readonly totalDoseMg: number;
	readonly maxSafeDoseMg: number;
	readonly maxSafeCarpules: number;
	readonly totalEpinephrineMg: number;
	readonly maxSafeEpinephrineMg: number;
	readonly safetyPercentage: number; // 0..100+%
	readonly isOverdose: boolean;
	readonly safetyLevel: "safe" | "caution" | "warning" | "danger";
	readonly warnings: readonly string[];
	readonly soapNoteText: string;
}

/**
 * Рассчитывает безопасную дозу местного анестетика с раздельными порогами
 * для взрослых (7 мг/кг) и детей (5 мг/кг), а также контролем адреналина.
 */
export function calculateAnesthesiaDosage(params: AnesthesiaDosageParams): AnesthesiaDosageResult {
	const drug = ANESTHESIA_DRUGS_CATALOG[params.drugType] || ANESTHESIA_DRUGS_CATALOG.articaine_4_epi_100k;
	const weight = Math.max(5, Math.min(250, Number.isFinite(params.patientWeightKg) && params.patientWeightKg > 0 ? params.patientWeightKg : 70));
	const carpules = Math.max(0, Number.isFinite(params.carpulesCount) ? params.carpulesCount : 1);

	// Определение детского возраста (< 18 лет или явный флаг или масса <= 40 кг)
	const isPediatric = Boolean(
		params.isPediatric ||
		(params.patientAgeYears !== null && params.patientAgeYears !== undefined && params.patientAgeYears < 18) ||
		(params.patientAgeYears === undefined && weight <= 40),
	);

	// Норматив мг/кг: для артикаина 7 мг/кг (взрослые) и 5 мг/кг (дети)
	const effectiveMaxMgPerKg = isPediatric ? drug.pediatricMaxMgPerKg : drug.adultMaxMgPerKg;

	const totalVolumeMl = Number((carpules * drug.carpuleVolumeMl).toFixed(2));
	const totalDoseMg = Number((totalVolumeMl * drug.concentrationPercent * 10).toFixed(1));

	// Расчет предельной дозы по массе тела
	const weightCapMg = Number((weight * effectiveMaxMgPerKg).toFixed(1));
	let maxSafeDoseMg = isPediatric ? weightCapMg : Math.min(weightCapMg, drug.absoluteMaxDoseMgAdult);

	let maxSafeCarpules = drug.activeMgPerCarpule > 0
		? Number((maxSafeDoseMg / drug.activeMgPerCarpule).toFixed(2))
		: 0;

	// Эпинефрин (адреналин)
	const totalEpinephrineMg = Number((carpules * drug.epinephrineMgPerCarpule).toFixed(4));
	const maxSafeEpinephrineMg = params.hasCardiovascularRisk && drug.vasoconstrictor !== "none"
		? 0.04 // 40 мкг для пациентов с ССЗ / гипертонией (I10-I15)
		: 0.20; // 200 мкг для соматически здоровых

	// Кардио-ограничение карпул (макс 2 карпулы 1:100k или 4 карпулы 1:200k)
	if (params.hasCardiovascularRisk && drug.vasoconstrictor !== "none" && drug.epinephrineMgPerCarpule > 0) {
		const cardioCarpuleCap = Number((0.04 / drug.epinephrineMgPerCarpule).toFixed(1));
		if (cardioCarpuleCap < maxSafeCarpules) {
			maxSafeCarpules = cardioCarpuleCap;
			maxSafeDoseMg = Math.min(maxSafeDoseMg, Number((maxSafeCarpules * drug.activeMgPerCarpule).toFixed(1)));
		}
	}

	const doseRatio = maxSafeDoseMg > 0 ? totalDoseMg / maxSafeDoseMg : 0;
	const epiRatio = maxSafeEpinephrineMg > 0 && totalEpinephrineMg > 0 ? totalEpinephrineMg / maxSafeEpinephrineMg : 0;
	const safetyRatio = Math.max(doseRatio, epiRatio);
	const safetyPercentage = Math.round(safetyRatio * 100);

	const warnings: string[] = [];
	let isOverdose = false;
	let safetyLevel: "safe" | "caution" | "warning" | "danger" = "safe";

	// 1. Проверка аллергии на сульфиты / астмы
	if (params.hasSulfiteOrAsthmaAllergy && drug.containsSulfites) {
		warnings.push(
			`ПРОТИВОПОКАЗАНО: Препарат содержит метабисульфит натрия (консервант адреналина). У пациента астма/аллергия на сульфиты! Замените на Скандонест 3% (Мепивакаин без адреналина).`,
		);
		safetyLevel = "danger";
		isOverdose = true;
	}

	// 2. Превышение дозы по весу
	if (totalDoseMg > maxSafeDoseMg) {
		isOverdose = true;
		safetyLevel = "danger";
		const ageLabel = isPediatric ? `детского норматива (5.0 мг/кг для ${weight} кг = ${maxSafeDoseMg} мг)` : `норматива массы тела (7.0 мг/кг для ${weight} кг = ${maxSafeDoseMg} мг)`;
		warnings.push(
			`ПРЕВЫШЕНА ПРЕДЕЛЬНАЯ ДОЗА: Введено ${totalDoseMg} мг артикаина, что превышает максимум ${ageLabel}. Риск системной токсичности!`,
		);
	}

	// 3. Превышение кардиолимита адреналина
	if (params.hasCardiovascularRisk && totalEpinephrineMg > 0.04 && drug.vasoconstrictor !== "none") {
		isOverdose = true;
		safetyLevel = "danger";
		warnings.push(
			`ПРЕВЫШЕН КАРДИОЛИМИТ АДРЕНАЛИНА: Введено ${totalEpinephrineMg} мг адреналина (макс. 0.04 мг / 2 карп. 1:100k). Риск гипертонического криза и аритмии!`,
		);
	}

	// 4. Предупреждения по беременности
	if (params.isPregnantOrLactating && drug.vasoconstrictor === "1:100000") {
		warnings.push(
			`ВНИМАНИЕ: При беременности рекомендован Ультракаин Д-С 1:200 000 (пониженная концентрация адреналина снижает риск ишемии плаценты).`,
		);
		if (safetyLevel !== "danger") safetyLevel = "warning";
	}

	if (!isOverdose) {
		if (safetyPercentage >= 80) {
			safetyLevel = "warning";
			warnings.push(`Предупреждение: Введено ${safetyPercentage}% от максимальной безопасной дозы.`);
		} else if (safetyPercentage >= 50) {
			safetyLevel = "caution";
		}
	}

	const soapNoteText =
		`Местная анестезия: препарат «${drug.commercialName}» (${drug.activeSubstance}) ` +
		`в объеме ${totalVolumeMl} мл (${carpules} карп., ${totalDoseMg} мг действующего вещества, ${effectiveMaxMgPerKg} мг/кг). ` +
		`Аспирационная проба отрицательная. Анестезия глубокая, достаточная, осложнений не наблюдалось.`;

	return {
		drug,
		patientWeightKg: weight,
		isPediatric,
		effectiveMaxMgPerKg,
		carpulesCount: carpules,
		totalVolumeMl,
		totalDoseMg,
		maxSafeDoseMg,
		maxSafeCarpules,
		totalEpinephrineMg,
		maxSafeEpinephrineMg,
		safetyPercentage,
		isOverdose,
		safetyLevel,
		warnings,
		soapNoteText,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. РЕЦЕПТУРНЫЙ БЛАНК 107-1/У & КУРСОВОЙ РАСЧЕТ ПРЕПАРАТОВ (ORDER 1094N)
// ─────────────────────────────────────────────────────────────────────────────

export type DentalDrugKey =
	| "amoxiclav_875_125"
	| "amoxiclav_500_125"
	| "nimesulide_100"
	| "chlorhexidine_005"
	| "metrogyl_denta"
	| "ibuprofen_400"
	| "ketorolac_10"
	| "ciprofloxacin_500"
	| "metronidazole_500"
	| "loratadine_10";

export interface DentalPrescriptionDrug {
	readonly id: DentalDrugKey;
	readonly tradeNameRu: string;
	readonly activeSubstanceRu: string;
	readonly category: "antibiotic" | "nsaid" | "antiseptic" | "antihistamine";
	readonly categoryLabel: string;
	readonly latinRp: string;
	readonly formRu: string;
	readonly dosageRu: string;
	readonly packageQuantity: number; // Кол-во единиц в стандартной пачке (напр. 14 таб, 10 пак, 1 флакон)
	readonly unitTypeRu: "таблетки" | "пакетики" | "капсулы" | "флакон" | "туба";
	readonly defaultDurationDays: number;
	readonly defaultTimesPerDay: number;
	readonly defaultSingleDoseMg: number;
	readonly dispenseLatinTemplate: string; // "D.t.d. N %d in tab."
	readonly defaultSignaRu: string;
	readonly recommendedIcd10: readonly string[];
}

export const DENTAL_DRUGS_PRESETS: Record<DentalDrugKey, DentalPrescriptionDrug> = {
	amoxiclav_875_125: {
		id: "amoxiclav_875_125",
		tradeNameRu: "Амоксиклав 875/125 мг (Аугментин)",
		activeSubstanceRu: "Амоксициллин + [Клавулановая кислота]",
		category: "antibiotic",
		categoryLabel: "Антибиотик широкого спектра",
		latinRp: "Rp.: Amoxicillini 875 mg + Acidi clavulanici 125 mg",
		formRu: "таблетки, покрытые пленочной оболочкой",
		dosageRu: "875 мг + 125 мг (1000 мг)",
		packageQuantity: 14,
		unitTypeRu: "таблетки",
		defaultDurationDays: 7,
		defaultTimesPerDay: 2,
		defaultSingleDoseMg: 1000,
		dispenseLatinTemplate: "D.t.d. N %d in tab.",
		defaultSignaRu: "S. Внутрь по 1 таблетке (875/125 мг) 2 раза в день через равные интервалы (12 часов) в начале приема пищи в течение 7 дней.",
		recommendedIcd10: ["K04.4", "K04.5", "K08.1", "K05.3"],
	},
	amoxiclav_500_125: {
		id: "amoxiclav_500_125",
		tradeNameRu: "Амоксиклав 500/125 мг",
		activeSubstanceRu: "Амоксициллин + [Клавулановая кислота]",
		category: "antibiotic",
		categoryLabel: "Антибиотик",
		latinRp: "Rp.: Amoxicillini 500 mg + Acidi clavulanici 125 mg",
		formRu: "таблетки, покрытые пленочной оболочкой",
		dosageRu: "500 мг + 125 мг",
		packageQuantity: 15,
		unitTypeRu: "таблетки",
		defaultDurationDays: 5,
		defaultTimesPerDay: 3,
		defaultSingleDoseMg: 625,
		dispenseLatinTemplate: "D.t.d. N %d in tab.",
		defaultSignaRu: "S. Внутрь по 1 таблетке 3 раза в день в начале приема пищи в течение 5 дней.",
		recommendedIcd10: ["K04.4", "K04.5", "K08.1", "K05.3"],
	},
	nimesulide_100: {
		id: "nimesulide_100",
		tradeNameRu: "Нимесил (Нимесулид 100 мг)",
		activeSubstanceRu: "Нимесулид",
		category: "nsaid",
		categoryLabel: "НПВС / Обезболивающее",
		latinRp: "Rp.: Nimesulidi 100 mg",
		formRu: "гранулы для приготовления суспензии для приема внутрь",
		dosageRu: "100 мг",
		packageQuantity: 10,
		unitTypeRu: "пакетики",
		defaultDurationDays: 5,
		defaultTimesPerDay: 2,
		defaultSingleDoseMg: 100,
		dispenseLatinTemplate: "D.t.d. N %d in gran.",
		defaultSignaRu: "S. Внутрь по 1 пакетику (100 мг) 2 раза в день после еды, предварительно растворив содержимое в 100 мл теплой воды, при болях 3-5 дней.",
		recommendedIcd10: ["K04.0", "K04.4", "K04.5", "K08.1", "K05.3"],
	},
	chlorhexidine_005: {
		id: "chlorhexidine_005",
		tradeNameRu: "Хлоргексидина биглюконат 0.05%",
		activeSubstanceRu: "Хлоргексидин",
		category: "antiseptic",
		categoryLabel: "Антисептик для полости рта",
		latinRp: "Rp.: Sol. Chlorhexidini bigluconatis 0.05% - 100 ml",
		formRu: "раствор для местного и наружного применения 0.05%",
		dosageRu: "0.05%",
		packageQuantity: 1,
		unitTypeRu: "флакон",
		defaultDurationDays: 7,
		defaultTimesPerDay: 3,
		defaultSingleDoseMg: 10, // 10-15 мл
		dispenseLatinTemplate: "D.t.d. N %d",
		defaultSignaRu: "S. Ротовые ванночки по 10-15 мл неразведенного раствора 3 раза в день по 1 минуте после еды (не полоскать активно!) в течение 7 дней.",
		recommendedIcd10: ["K05.0", "K05.1", "K05.3", "K08.1", "Z01.2"],
	},
	metrogyl_denta: {
		id: "metrogyl_denta",
		tradeNameRu: "Метрогил Дента (Метронидазол + Хлоргексидин)",
		activeSubstanceRu: "Метронидазол + Хлоргексидин",
		category: "antiseptic",
		categoryLabel: "Стоматологический антибактериальный гель",
		latinRp: "Rp.: Gel. 'Metrogyl Denta' 20.0",
		formRu: "гель стоматологический",
		dosageRu: "20 г",
		packageQuantity: 1,
		unitTypeRu: "туба",
		defaultDurationDays: 10,
		defaultTimesPerDay: 2,
		defaultSingleDoseMg: 500, // ~0.5 г геля на аппликацию
		dispenseLatinTemplate: "D.t.d. N %d in tuba",
		defaultSignaRu: "S. Наносить тонким слоем на область десен 2 раза в день после чистки зубов в течение 7-10 дней. После нанесения не пить и не принимать пищу 30 минут.",
		recommendedIcd10: ["K05.0", "K05.1", "K05.3"],
	},
	ibuprofen_400: {
		id: "ibuprofen_400",
		tradeNameRu: "Ибупрофен 400 мг (Нурофен Форте)",
		activeSubstanceRu: "Ибупрофен",
		category: "nsaid",
		categoryLabel: "НПВС / Анальгетик",
		latinRp: "Rp.: Ibuprofeni 400 mg",
		formRu: "таблетки, покрытые оболочкой",
		dosageRu: "400 мг",
		packageQuantity: 20,
		unitTypeRu: "таблетки",
		defaultDurationDays: 4,
		defaultTimesPerDay: 3,
		defaultSingleDoseMg: 400,
		dispenseLatinTemplate: "D.t.d. N %d in tab.",
		defaultSignaRu: "S. Внутрь по 1 таблетке (400 мг) 2-3 раза в день после еды, запивая водой. Максимум 1200 мг в сутки.",
		recommendedIcd10: ["K02.1", "K04.0", "K04.5", "K08.1"],
	},
	ketorolac_10: {
		id: "ketorolac_10",
		tradeNameRu: "Кеторолак 10 мг (Кетанов)",
		activeSubstanceRu: "Кеторолак",
		category: "nsaid",
		categoryLabel: "НПВС (сильный анальгетик)",
		latinRp: "Rp.: Ketorolaci 10 mg",
		formRu: "таблетки, покрытые оболочкой",
		dosageRu: "10 мг",
		packageQuantity: 10,
		unitTypeRu: "таблетки",
		defaultDurationDays: 3,
		defaultTimesPerDay: 3,
		defaultSingleDoseMg: 10,
		dispenseLatinTemplate: "D.t.d. N %d in tab.",
		defaultSignaRu: "S. Внутрь по 1 таблетке (10 мг) при выраженном болевом синдроме (не более 4 таб./сутки, курс не более 3-5 дней).",
		recommendedIcd10: ["K04.0", "K04.4", "K08.1"],
	},
	ciprofloxacin_500: {
		id: "ciprofloxacin_500",
		tradeNameRu: "Ципрофлоксацин 500 мг (Цифран)",
		activeSubstanceRu: "Ципрофлоксацин",
		category: "antibiotic",
		categoryLabel: "Антибиотик (фторхинолон)",
		latinRp: "Rp.: Ciprofloxacini 500 mg",
		formRu: "таблетки",
		dosageRu: "500 мг",
		packageQuantity: 10,
		unitTypeRu: "таблетки",
		defaultDurationDays: 5,
		defaultTimesPerDay: 2,
		defaultSingleDoseMg: 500,
		dispenseLatinTemplate: "D.t.d. N %d in tab.",
		defaultSignaRu: "S. Внутрь по 1 таблетке (500 мг) 2 раза в день за 1 час до еды или через 2 часа после еды, 5-7 дней.",
		recommendedIcd10: ["K04.4", "K08.1", "K05.3"],
	},
	metronidazole_500: {
		id: "metronidazole_500",
		tradeNameRu: "Метронидазол 500 мг (Трихопол)",
		activeSubstanceRu: "Метронидазол",
		category: "antibiotic",
		categoryLabel: "Противомикробное средство",
		latinRp: "Rp.: Metronidazoli 500 mg",
		formRu: "таблетки",
		dosageRu: "500 мг",
		packageQuantity: 20,
		unitTypeRu: "таблетки",
		defaultDurationDays: 7,
		defaultTimesPerDay: 2,
		defaultSingleDoseMg: 500,
		dispenseLatinTemplate: "D.t.d. N %d in tab.",
		defaultSignaRu: "S. Внутрь по 1 таблетке (500 мг) 2 раза в день во время или после еды, 7 дней.",
		recommendedIcd10: ["K05.3", "K04.4"],
	},
	loratadine_10: {
		id: "loratadine_10",
		tradeNameRu: "Лоратадин 10 мг (Кларитин)",
		activeSubstanceRu: "Лоратадин",
		category: "antihistamine",
		categoryLabel: "Антигистаминное (противоотечное)",
		latinRp: "Rp.: Loratadini 10 mg",
		formRu: "таблетки",
		dosageRu: "10 мг",
		packageQuantity: 10,
		unitTypeRu: "таблетки",
		defaultDurationDays: 5,
		defaultTimesPerDay: 1,
		defaultSingleDoseMg: 10,
		dispenseLatinTemplate: "D.t.d. N %d in tab.",
		defaultSignaRu: "S. Внутрь по 1 таблетке (10 мг) 1 раз в день независимо от приема пищи, 5 дней для уменьшения постоперационного отека.",
		recommendedIcd10: ["K08.1", "K04.4"],
	},
};

export interface DrugCourseCalculationParams {
	readonly drugId: DentalDrugKey;
	readonly durationDays?: number;
	readonly timesPerDay?: number;
	readonly customSingleDoseMg?: number;
}

export interface DrugCourseCalculationResult {
	readonly drug: DentalPrescriptionDrug;
	readonly durationDays: number;
	readonly timesPerDay: number;
	readonly totalUnitsCount: number; // общее число таблеток / пакетиков
	readonly packagesCount: number; // число упаковок в аптеке
	readonly totalCourseActiveDoseMg: number; // суммарная доза за курс в мг
	readonly dailyActiveDoseMg: number;
	readonly dispenseLatinString: string; // "D.t.d. N 14 in tab."
	readonly signaString: string;
}

/**
 * Расчет курсовой дозы препарата и формирование прописи рецепта.
 */
export function calculateDrugCourseDose(
	params: DrugCourseCalculationParams,
): DrugCourseCalculationResult {
	const drug = DENTAL_DRUGS_PRESETS[params.drugId] || DENTAL_DRUGS_PRESETS.nimesulide_100;
	const duration = params.durationDays ?? drug.defaultDurationDays;
	const times = params.timesPerDay ?? drug.defaultTimesPerDay;
	const singleDose = params.customSingleDoseMg ?? drug.defaultSingleDoseMg;

	const isSingleContainer = drug.unitTypeRu === "флакон" || drug.unitTypeRu === "туба";
	const totalUnits = isSingleContainer ? 1 : duration * times;
	const packages = isSingleContainer ? 1 : Math.ceil(totalUnits / drug.packageQuantity);
	const dailyDoseMg = times * singleDose;
	const totalCourseDoseMg = (duration * times) * singleDose;

	const dispenseLatin = drug.dispenseLatinTemplate.replace("%d", String(totalUnits));

	return {
		drug,
		durationDays: duration,
		timesPerDay: times,
		totalUnitsCount: totalUnits,
		packagesCount: packages,
		totalCourseActiveDoseMg: totalCourseDoseMg,
		dailyActiveDoseMg: dailyDoseMg,
		dispenseLatinString: dispenseLatin,
		signaString: drug.defaultSignaRu,
	};
}

export interface Form107_1uPrescriptionDraft {
	readonly formNumber: "107-1/у";
	readonly statutoryOrder: "Приказ Минздрава России от 24.11.2021 № 1094н";
	readonly seriesNumber: string;
	readonly prescriptionDate: string;
	readonly validityDays: "15" | "60" | "365";
	readonly clinicName: string;
	readonly clinicAddress: string;
	readonly clinicOgrn?: string | null;
	readonly clinicInn?: string | null;
	readonly patientFullName: string;
	readonly patientBirthDate: string;
	readonly patientAgeYears?: number | null;
	readonly medicalCardNumber: string;
	readonly doctorFullName: string;
	readonly doctorSpecialty: string;
	readonly items: readonly DrugCourseCalculationResult[];
	readonly diagnosisIcd10?: string | null;
}

/**
 * Формирует структурированный рецепт по форме 107-1/у для указанного диагноза и набора препаратов.
 */
export function generateForm107_1uPrescription(options: {
	readonly clinic: {
		readonly fullName: string;
		readonly address?: string | null;
		readonly ogrn?: string | null;
		readonly inn?: string | null;
	};
	readonly patient: {
		readonly fullName: string;
		readonly birthDate: string;
		readonly medicalCardNumber: string;
	};
	readonly doctor: {
		readonly fullName: string;
		readonly specialty?: string | null;
	};
	readonly diagnosisIcd10?: string | null;
	readonly selectedDrugIds?: readonly DentalDrugKey[];
	readonly validityDays?: "15" | "60" | "365";
}): Form107_1uPrescriptionDraft {
	const icd = (options.diagnosisIcd10 || "K02.1").toUpperCase().trim();
	let targetDrugKeys: DentalDrugKey[] = [];

	if (options.selectedDrugIds && options.selectedDrugIds.length > 0) {
		targetDrugKeys = [...options.selectedDrugIds];
	} else {
		// Автоподбор препаратов по диагнозу
		const matching = Object.values(DENTAL_DRUGS_PRESETS).filter((d) =>
			d.recommendedIcd10.some((code) => icd.startsWith(code)),
		);
		targetDrugKeys = matching.slice(0, 3).map((d) => d.id);
		if (targetDrugKeys.length === 0) {
			targetDrugKeys = ["nimesulide_100", "chlorhexidine_005"];
		}
	}

	// Максимум 3 препарата на 1 бланк по Приказу 1094н
	const finalDrugKeys = targetDrugKeys.slice(0, 3);
	const calculatedItems = finalDrugKeys.map((id) => calculateDrugCourseDose({ drugId: id }));

	const today = new Date().toISOString().slice(0, 10);
	const seriesNum = `РЕЦ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

	return {
		formNumber: "107-1/у",
		statutoryOrder: "Приказ Минздрава России от 24.11.2021 № 1094н",
		seriesNumber: seriesNum,
		prescriptionDate: today,
		validityDays: options.validityDays || "60",
		clinicName: options.clinic.fullName,
		clinicAddress: options.clinic.address || "г. Москва",
		clinicOgrn: options.clinic.ogrn || null,
		clinicInn: options.clinic.inn || null,
		patientFullName: options.patient.fullName,
		patientBirthDate: options.patient.birthDate,
		medicalCardNumber: options.patient.medicalCardNumber,
		doctorFullName: options.doctor.fullName,
		doctorSpecialty: options.doctor.specialty || "Врач-стоматолог",
		items: calculatedItems,
		diagnosisIcd10: icd,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. СТАТУСЫ И ШТАМПЫ ДНЕВНИКА 043/У (FORM 043/U LIFECYCLE & AUDIT STAMPS)
// Приказ Минздрава России № 834н, Мандат 8e (Свобода дневника и печать черновиков)
// ─────────────────────────────────────────────────────────────────────────────

export interface Form043DocumentStatus {
	readonly isDraft: boolean;
	readonly isLocked: boolean;
	readonly stampText: string;
	readonly watermarkText: string | null;
	readonly stampBadgeClass: string;
	readonly canDoctorEditDirectly: boolean;
	readonly amendmentAuditReasonDefault: string;
}

/**
 * Определяет клинический статус формы 043/у и соответствующие штампы/водяные знаки.
 * Реализует Мандат 8e:
 * - Если прием не закрыт — штамп и водяной знак «ЧЕРНОВИК».
 * - Если прием закрыт — штамп «ПОДПИСАНО ВРАЧОМ».
 * - Если внесены правки — штамп «ИСПРАВЛЕННОМУ ВЕРИТЬ (РЕДАКЦИЯ N)».
 */
export function getForm043DocumentStatus(params: {
	readonly isLocked?: boolean | null;
	readonly status?: "draft" | "signed" | "completed" | "voided" | string | null;
	readonly revisionCount?: number | null;
	readonly doctorFullName?: string | null;
	readonly lockedAt?: string | Date | null;
}): Form043DocumentStatus {
	const isClosed = Boolean(
		params.isLocked ||
		params.status === "signed" ||
		params.status === "completed",
	);
	const revisions = params.revisionCount ?? 0;

	if (!isClosed) {
		return {
			isDraft: true,
			isLocked: false,
			stampText: "ЧЕРНОВИК (ПРИЁМ НЕ ЗАКРЫТ)",
			watermarkText: "ЧЕРНОВИК",
			stampBadgeClass: "badge-draft",
			canDoctorEditDirectly: true,
			amendmentAuditReasonDefault: "Черновик приёма",
		};
	}

	if (revisions > 0) {
		return {
			isDraft: false,
			isLocked: true,
			stampText: `ИСПРАВЛЕННОМУ ВЕРИТЬ (РЕДАКЦИЯ ${revisions + 1})`,
			watermarkText: null,
			stampBadgeClass: "badge-revised",
			canDoctorEditDirectly: true, // Врач свободно правит с версионным аудитом в 1 клик
			amendmentAuditReasonDefault: "Исправленному верить",
		};
	}

	return {
		isDraft: false,
		isLocked: true,
		stampText: "ПОДПИСАНО ВРАЧОМ",
		watermarkText: null,
		stampBadgeClass: "badge-signed",
		canDoctorEditDirectly: true, // Врач свободно правит с версионным аудитом в 1 клик
		amendmentAuditReasonDefault: "Исправленному верить",
	};
}

/**
 * Формирует строку аудита для версионной правки дневника («Исправленному верить»).
 */
export function formatForm043RevisionAuditStamp(params: {
	readonly revisionNumber: number;
	readonly authorName?: string | null;
	readonly revisedAt?: string | Date | null;
	readonly reason?: string | null;
}): string {
	const dateStr = params.revisedAt
		? new Date(params.revisedAt).toLocaleString("ru-RU")
		: new Date().toLocaleString("ru-RU");
	const reason = params.reason?.trim() || "Исправленному верить";
	const author = params.authorName ? `Врач: ${params.authorName}. ` : "";
	return `[Редакция №${params.revisionNumber} от ${dateStr}]. ${author}Причина: ${reason}.`;
}

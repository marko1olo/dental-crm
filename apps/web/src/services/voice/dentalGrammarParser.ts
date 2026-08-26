/**
 * dentalGrammarParser.ts — Специализированный голосовой дентальный парсер грамматики
 * для врача-стоматолога за креслом в перчатках (0-1 клик на клиническом приёме).
 *
 * ВОЗМОЖНОСТИ:
 * 1. Распознавание номеров зубов по FDI (11..48 постоянные, 51..85 молочные):
 *    - Числительные словами: «сорок шесть» -> 46, «шестнадцать» -> 16, «тридцать один» -> 31
 *    - Порядковые и сленговые: «шестнадцатый зуб» -> 16, «сорок шестой» -> 46, «шестерка» -> 16/26/36/46
 *    - Анатомические описания: «верхняя челюсть справа шестерка» -> 16, «нижняя челюсть слева единица» -> 31,
 *      «верхний правый клык» -> 13, «нижний левый первый моляр» -> 36, «зуб мудрости снизу справа» -> 48
 *    - Цифровые маркеры: «зуб 46», «d36», «#21», «зуба 14»
 *    - Поверхности зуба: окклюзионная (O), вестибулярная (V), медиальная (M), дистальная (D),
 *      язычная (L), небная (P), MOD, MO, OD, пришеечная (V класс по Блэку).
 *
 * 2. Распознавание нозологий МКБ-10 и клинических статусов:
 *    - «кариес дентина глубокий» / «глубокий кариес» / «средний кариес» -> K02.1 (CARIES / Caries)
 *    - «кариес эмали» / «начальный кариес» / «в стадии пятна» -> K02.0 (CARIES / Caries)
 *    - «пульпит необратимый» / «острый пульпит» / «очаговый пульпит» -> K04.0 (PULPITIS / Pulpitis)
 *    - «хронический верхушечный периодонтит» / «апикальный периодонтит» -> K04.5 (PERIODONTITIS / Periodontitis)
 *    - «хронический пародонтит» / «генерализованный пародонтит» -> K05.3 (PERIODONTITIS_GENERAL)
 *    - «клиновидный дефект» -> K03.1 (WEDGE_DEFECT)
 *    - «эрозия эмали» -> K03.2 (EROSION)
 *    - «удален / отсутствует / адентия» -> K08.1 (MISSING / Missing)
 *    - «коронка / диоксид циркония / e.max / металлокерамика» -> CROWN / Crown
 *    - «имплантат / имплант установлен» -> IMPLANT / Implant
 *    - «пломба / реставрация» -> RESTORATION / Filled
 *    - «интактный / здоров / без патологии» -> HEALTHY / Healthy
 *    - «культевая вкладка» -> INLAY
 *
 * 3. Распознавание анестетиков, торговых марок и дозировок:
 *    - «анестезия ультракаин форте одна карпула» -> Ultracain DS Forte 1.7ml
 *    - «ультракаин д-с», «убистезин форте», «скандонест», «септанест», «артикаин», «мепивакаин», «лидокаин»
 *    - Объёмы (0.9, 1.7, 1.8, 3.4 мл), карпулы (1, 2, 0.5 карпулы), техники (инфильтрация, проводниковая, аппликационная).
 *
 * 4. Распознавание манипуляций, расходных материалов и услуг Номенклатуры 804н:
 *    - «коффердам / раббердам» -> A16.07.002.001
 *    - «некрэктомия / препарирование» -> A16.07.002
 *    - «пломба эстет икс а два» / «эстелайт» / «филтек» -> A16.07.002.010 (Реставрация фотокомпозитом)
 *    - «механическая и медикаментозная обработка каналов» -> A16.07.030
 *    - «пломбирование каналов гуттаперчей» -> A16.07.008
 *    - «ультразвук / air flow / профгигиена» -> A16.07.020
 *
 * 5. Раскладка в протокол SOAP (СтАР 043/у) и единый DentalVoiceIntent.
 */

import type { ToothState } from "../../components/odontogram/ToothChart";
import { isValidFdiToothNumber } from "@dental/shared";

export type ClinicalToothStatus =
	| "CARIES"
	| "PULPITIS"
	| "PERIODONTITIS"
	| "PERIODONTITIS_GENERAL"
	| "MISSING"
	| "RESTORATION"
	| "CROWN"
	| "IMPLANT"
	| "INLAY"
	| "HEALTHY"
	| "WEDGE_DEFECT"
	| "EROSION"
	| "FRACTURE";

export interface ToothUpdateVoiceItem {
	readonly toothNumber: number;
	readonly state: ToothState;
	readonly icd10Code: string;
	readonly icd10Title: string;
	readonly clinicalStatus: ClinicalToothStatus;
	readonly surfaces?: string[] | undefined;
	readonly subType?: string | undefined;
	readonly iropzEstimate?: number | undefined;
}

export interface AnesthesiaVoiceItem {
	readonly drugKey: string;
	readonly tradeName: string;
	readonly displayName: string;
	readonly volumeMl: number;
	readonly cartridgeCount: number;
	readonly technique: "infiltration" | "conduction" | "application" | "intraligamentary";
	readonly concentration?: string | undefined;
	readonly code804n?: string | undefined;
}

export interface Procedure804nVoiceItem {
	readonly code804n: string;
	readonly name: string;
	readonly category: "therapy" | "surgery" | "endodontics" | "hygiene" | "orthopedics" | "anesthesia" | "isolation";
	readonly quantity: number;
	readonly toothNumber?: number | undefined;
	readonly priceRub?: number | undefined;
	readonly shade?: string | undefined;
}

export interface SoapSectionsVoiceNote {
	readonly subjective?: string | undefined;
	readonly objective?: string | undefined;
	readonly assessment?: string | undefined;
	readonly plan?: string | undefined;
	readonly recommendations?: string | undefined;
}

export interface DentalVoiceIntent {
	readonly id: string;
	readonly timestamp: string;
	readonly rawTranscript: string;
	readonly type: "odontogram_update" | "soap_entry" | "anesthesia_record" | "manipulation_plan" | "invoice_items" | "full_visit_batch";
	readonly confidence: number;
	readonly confidenceLevel: "high" | "review";
	readonly teethUpdates: readonly ToothUpdateVoiceItem[];
	readonly detectedTeeth: readonly number[];
	readonly anesthesia: AnesthesiaVoiceItem | null;
	readonly procedures804n: readonly Procedure804nVoiceItem[];
	readonly soapNotes: SoapSectionsVoiceNote;
	readonly summary: string;
}

export const VALID_FDI_PERMANENT_TEETH: readonly number[] = [
	11, 12, 13, 14, 15, 16, 17, 18,
	21, 22, 23, 24, 25, 26, 27, 28,
	31, 32, 33, 34, 35, 36, 37, 38,
	41, 42, 43, 44, 45, 46, 47, 48,
];

export const VALID_FDI_PRIMARY_TEETH: readonly number[] = [
	51, 52, 53, 54, 55,
	61, 62, 63, 64, 65,
	71, 72, 73, 74, 75,
	81, 82, 83, 84, 85,
];

export const ALL_VALID_FDI_TEETH: readonly number[] = [
	...VALID_FDI_PERMANENT_TEETH,
	...VALID_FDI_PRIMARY_TEETH,
];

const TEEN_NUMBER_WORDS: Record<string, number> = {
	"одиннадцать": 11,
	"одиннадцатый": 11,
	"одиннадцатого": 11,
	"одиннадцатом": 11,
	"двенадцать": 12,
	"двенадцатый": 12,
	"двенадцатого": 12,
	"двенадцатом": 12,
	"тринадцать": 13,
	"тринадцатый": 13,
	"тринадцатого": 13,
	"тринадцатом": 13,
	"четырнадцать": 14,
	"четырнадцатый": 14,
	"четырнадцатого": 14,
	"четырнадцатом": 14,
	"пятнадцать": 15,
	"пятнадцатый": 15,
	"пятнадцатого": 15,
	"пятнадцатом": 15,
	"шестнадцать": 16,
	"шестнадцатый": 16,
	"шестнадцатого": 16,
	"шестнадцатом": 16,
	"семнадцать": 17,
	"семнадцатый": 17,
	"семнадцатого": 17,
	"семнадцатом": 17,
	"восемнадцать": 18,
	"восемнадцатый": 18,
	"восемнадцатого": 18,
	"восемнадцатом": 18,
	"девятнадцать": 19,
	"девятнадцатый": 19,
	"девятнадцатого": 19,
	"девятнадцатом": 19,
};

const TENS_WORDS: Record<string, number> = {
	"десять": 10,
	"двадцать": 20,
	"двадцатый": 20,
	"двадцатого": 20,
	"двадцатом": 20,
	"тридцать": 30,
	"тридцатый": 30,
	"тридцатого": 30,
	"тридцатом": 30,
	"сорок": 40,
	"сороковой": 40,
	"сорокового": 40,
	"сороковом": 40,
	"пятьдесят": 50,
	"пятидесятый": 50,
	"пятидесятого": 50,
	"пятидесятом": 50,
	"шестьдесят": 60,
	"шестидесятый": 60,
	"шестидесятого": 60,
	"шестидесятом": 60,
	"семьдесят": 70,
	"семидесятый": 70,
	"семидесятого": 70,
	"семидесятом": 70,
	"восемьдесят": 80,
	"восьмидесятый": 80,
	"восьмидесятого": 80,
	"восьмидесятом": 80,
};

const ONES_WORDS: Record<string, number> = {
	"один": 1,
	"одна": 1,
	"первый": 1,
	"первого": 1,
	"первом": 1,
	"первая": 1,
	"единица": 1,
	"единичка": 1,
	"два": 2,
	"две": 2,
	"второй": 2,
	"второго": 2,
	"втором": 2,
	"вторая": 2,
	"двойка": 2,
	"двоечка": 2,
	"три": 3,
	"третий": 3,
	"третьего": 3,
	"третьем": 3,
	"третья": 3,
	"тройка": 3,
	"троечка": 3,
	"четыре": 4,
	"четвертый": 4,
	"четвёртый": 4,
	"четвертого": 4,
	"четвёртого": 4,
	"четвертом": 4,
	"четвёртом": 4,
	"четвертая": 4,
	"четверка": 4,
	"четвёрка": 4,
	"пять": 5,
	"пятый": 5,
	"пятого": 5,
	"пятом": 5,
	"пятая": 5,
	"пятерка": 5,
	"пятёрка": 5,
	"шесть": 6,
	"шестой": 6,
	"шестого": 6,
	"шестом": 6,
	"шестая": 6,
	"шестерка": 6,
	"шестёрка": 6,
	"семь": 7,
	"седьмой": 7,
	"седьмого": 7,
	"седьмом": 7,
	"седьмая": 7,
	"семерка": 7,
	"семёрка": 7,
	"восемь": 8,
	"восьмой": 8,
	"восьмого": 8,
	"восьмом": 8,
	"восьмая": 8,
	"восьмерка": 8,
	"восьмёрка": 8,
	"девять": 9,
	"девятый": 9,
	"девятого": 9,
	"девятом": 9,
	"девятая": 9,
};

const TOOTH_ANATOMICAL_POSITIONS: Record<string, number> = {
	"центральный резец": 1,
	"центрального резца": 1,
	"медиальный резец": 1,
	"первый резец": 1,
	"единица": 1,
	"единичка": 1,
	"боковой резец": 2,
	"бокового резца": 2,
	"латеральный резец": 2,
	"второй резец": 2,
	"двойка": 2,
	"двоечка": 2,
	"клык": 3,
	"клыка": 3,
	"клыке": 3,
	"третий зуб": 3,
	"тройка": 3,
	"троечка": 3,
	"первый премоляр": 4,
	"первого премоляра": 4,
	"четвертый зуб": 4,
	"четвёртый зуб": 4,
	"первый малый коренной": 4,
	"четверка": 4,
	"четвёрка": 4,
	"второй премоляр": 5,
	"второго премоляра": 5,
	"пятый зуб": 5,
	"второй малый коренной": 5,
	"пятерка": 5,
	"пятёрка": 5,
	"первый моляр": 6,
	"первого моляра": 6,
	"первом моляре": 6,
	"шестой зуб": 6,
	"первый большой коренной": 6,
	"шестерка": 6,
	"шестёрка": 6,
	"второй моляр": 7,
	"второго моляра": 7,
	"втором моляре": 7,
	"седьмой зуб": 7,
	"второй большой коренной": 7,
	"семерка": 7,
	"семёрка": 7,
	"третий моляр": 8,
	"третьего моляра": 8,
	"восьмой зуб": 8,
	"зуб мудрости": 8,
	"зуба мудрости": 8,
	"восьмерка": 8,
	"восьмёрка": 8,
};

export function extractFdiTeethNumbers(text: string): number[] {
	if (!text || typeof text !== "string") return [];
	const found = new Set<number>();
	const normalized = text.toLowerCase().trim().replace(/ё/g, "е");

	const isUpper =
		normalized.includes("верхн") ||
		normalized.includes("максиллярн") ||
		normalized.includes("вч") ||
		normalized.includes("сверху");
	const isLower =
		normalized.includes("нижн") ||
		normalized.includes("мандибулярн") ||
		normalized.includes("нч") ||
		normalized.includes("снизу");
	const isRight = normalized.includes("прав") || normalized.includes("справа");
	const isLeft = normalized.includes("лев") || normalized.includes("слева");
	const isPrimary =
		normalized.includes("молочн") || normalized.includes("временн");

	if ((isUpper || isLower) && (isRight || isLeft)) {
		let quadrant = 0;
		if (!isPrimary) {
			if (isUpper && isRight) quadrant = 1;
			else if (isUpper && isLeft) quadrant = 2;
			else if (isLower && isLeft) quadrant = 3;
			else if (isLower && isRight) quadrant = 4;
		} else {
			if (isUpper && isRight) quadrant = 5;
			else if (isUpper && isLeft) quadrant = 6;
			else if (isLower && isLeft) quadrant = 7;
			else if (isLower && isRight) quadrant = 8;
		}

		if (quadrant > 0) {
			const entries = Object.entries(TOOTH_ANATOMICAL_POSITIONS).sort(
				(a, b) => b[0].length - a[0].length,
			);
			for (const [phrase, pos] of entries) {
				const normPhrase = phrase.replace(/ё/g, "е");
				if (normalized.includes(normPhrase)) {
					const tooth = quadrant * 10 + pos;
					if (isValidFdiToothNumber(tooth)) {
						found.add(tooth);
					}
				}
			}
		}
	}

	const words = normalized.split(/[\s,.;:!?\-/]+/).filter(Boolean);

	for (let i = 0; i < words.length; i++) {
		const current = words[i];
		const next = words[i + 1];

		if (current && TENS_WORDS[current] !== undefined) {
			const tens = TENS_WORDS[current];
			if (tens !== undefined && next && ONES_WORDS[next] !== undefined) {
				const ones = ONES_WORDS[next];
				if (ones !== undefined) {
					const tooth = tens + ones;
					if (isValidFdiToothNumber(tooth)) {
						found.add(tooth);
					}
				}
			} else if (tens !== undefined && isValidFdiToothNumber(tens)) {
				found.add(tens);
			}
		}

		if (current && TEEN_NUMBER_WORDS[current] !== undefined) {
			const tooth = TEEN_NUMBER_WORDS[current];
			if (tooth && isValidFdiToothNumber(tooth)) {
				found.add(tooth);
			}
		}
	}

	const matches = normalized.matchAll(/(?:зуб[аеы]?|номер|#|d|№)?\s*([1-8][1-8])\b/g);
	for (const match of matches) {
		if (match[1]) {
			const tooth = parseInt(match[1], 10);
			if (isValidFdiToothNumber(tooth)) {
				found.add(tooth);
			}
		}
	}

	return Array.from(found);
}

export function extractToothSurfaces(text: string): string[] {
	if (!text) return [];
	const norm = text.toLowerCase().replace(/ё/g, "е");
	const surfaces = new Set<string>();

	if (norm.includes("mod") || norm.includes("м од") || norm.includes("мод")) {
		return ["M", "O", "D"];
	}
	if (norm.includes("mo") || norm.includes("мо") || norm.includes("медиально-окклюзи")) {
		surfaces.add("M");
		surfaces.add("O");
	}
	if (norm.includes("od") || norm.includes("од") || norm.includes("окклюзионно-дистальн")) {
		surfaces.add("O");
		surfaces.add("D");
	}
	if (norm.includes("окклюзион") || norm.includes("жевательн") || norm.includes("режущ")) {
		surfaces.add("O");
	}
	if (norm.includes("вестибулярн") || norm.includes("щечн") || norm.includes("губн")) {
		surfaces.add("V");
	}
	if (norm.includes("медиальн") || norm.includes("мезиальн")) {
		surfaces.add("M");
	}
	if (norm.includes("дистальн")) {
		surfaces.add("D");
	}
	if (norm.includes("язычн")) {
		surfaces.add("L");
	}
	if (norm.includes("небн") || norm.includes("нёбн")) {
		surfaces.add("P");
	}
	if (norm.includes("пришеечн") || norm.includes("v класс") || norm.includes("5 класс")) {
		surfaces.add("V");
	}

	return Array.from(surfaces);
}

export interface DiagnosisRule {
	readonly code: string;
	readonly title: string;
	readonly status: ClinicalToothStatus;
	readonly toothChartState: ToothState;
	readonly patterns: readonly string[];
	readonly confidence: number;
}

export const DENTAL_ICD10_RULES: readonly DiagnosisRule[] = [
	{
		code: "K02.1",
		title: "Кариес дентина глубокий",
		status: "CARIES",
		toothChartState: "Caries",
		patterns: [
			"кариес дентина глубокий",
			"глубокий кариес",
			"кариес дентина средний",
			"средний кариес",
			"кариес дентина",
			"кариозное поражение дентина",
			"кариес",
			"кариозная полость",
			"полость кариозная",
			"вторичный кариес",
			"рецидивный кариес",
		],
		confidence: 0.96,
	},
	{
		code: "K02.0",
		title: "Кариес эмали (в стадии пятна)",
		status: "CARIES",
		toothChartState: "Caries",
		patterns: [
			"кариес эмали",
			"начальный кариес",
			"кариес в стадии пятна",
			"меловидное пятно",
			"деминерализация эмали",
		],
		confidence: 0.95,
	},
	{
		code: "K04.0",
		title: "Острый пульпит (необратимый)",
		status: "PULPITIS",
		toothChartState: "Pulpitis",
		patterns: [
			"пульпит необратимый",
			"пульпит острый",
			"острый пульпит",
			"хронический пульпит",
			"пульпит",
			"очаговый пульпит",
			"диффузный пульпит",
			"гнойный пульпит",
			"гиперемия пульпы",
			"пульпарная боль",
		],
		confidence: 0.96,
	},
	{
		code: "K04.5",
		title: "Хронический верхушечный периодонтит",
		status: "PERIODONTITIS",
		toothChartState: "Periodontitis",
		patterns: [
			"хронический верхушечный периодонтит",
			"верхушечный периодонтит",
			"апикальный периодонтит",
			"периодонтит хронический",
			"хронический периодонтит",
			"периодонтит",
			"гранулирующий периодонтит",
			"гранулематозный периодонтит",
			"фиброзный периодонтит",
			"радикулярная киста",
			"периапикальный деструктивный процесс",
		],
		confidence: 0.96,
	},
	{
		code: "K05.3",
		title: "Хронический пародонтит",
		status: "PERIODONTITIS_GENERAL",
		toothChartState: "Periodontitis",
		patterns: [
			"хронический пародонтит",
			"пародонтит хронический",
			"пародонтит генерализованный",
			"генерализованный пародонтит",
			"пародонтит",
			"пародонтальный карман",
			"деструкция альвеолярной кости",
		],
		confidence: 0.92,
	},
	{
		code: "K03.1",
		title: "Клиновидный дефект",
		status: "WEDGE_DEFECT",
		toothChartState: "Caries",
		patterns: [
			"клиновидный дефект",
			"клиновидный",
			"пришеечный дефект",
			"абфракция",
		],
		confidence: 0.94,
	},
	{
		code: "K03.2",
		title: "Эрозия эмали",
		status: "EROSION",
		toothChartState: "Caries",
		patterns: [
			"эрозия эмали",
			"эрозия зубов",
			"кислотная эрозия",
		],
		confidence: 0.92,
	},
	{
		code: "K08.1",
		title: "Потеря зубов вследствие удаления (Отсутствует)",
		status: "MISSING",
		toothChartState: "Missing",
		patterns: [
			"удален",
			"удалён",
			"отсутствует",
			"отсутствующий",
			"адентия",
			"экстракция",
			"зуб удален",
			"ранее удален",
		],
		confidence: 0.98,
	},
	{
		code: "RESTORATION",
		title: "Пломба / Реставрация",
		status: "RESTORATION",
		toothChartState: "Filled",
		patterns: [
			"пломба светового отверждения",
			"пломба",
			"реставрация",
			"световая пломба",
			"композитная реставрация",
			"восстановление зуба",
			"поставлена пломба",
			"пломбирование",
			"эстелайт",
			"филтек",
			"эстет икс",
		],
		confidence: 0.95,
	},
	{
		code: "CROWN",
		title: "Коронка (диоксид циркония / E.max)",
		status: "CROWN",
		toothChartState: "Crown",
		patterns: [
			"коронка диоксид циркония",
			"коронка цирконий",
			"коронка",
			"металлокерамика",
			"металлокерамическая коронка",
			"циркониевая коронка",
			"e.max",
			"емакс",
			"керамическая коронка",
			"ортопедическая коронка",
			"винир",
		],
		confidence: 0.95,
	},
	{
		code: "IMPLANT",
		title: "Дентальный имплантат",
		status: "IMPLANT",
		toothChartState: "Implant",
		patterns: [
			"имплантат установлен",
			"имплантат",
			"имплант",
			"имплантант",
			"дентальный имплантат",
			"установка имплантата",
			"имплантация",
		],
		confidence: 0.96,
	},
	{
		code: "INLAY",
		title: "Культевая вкладка",
		status: "INLAY",
		toothChartState: "Crown",
		patterns: [
			"культевая вкладка",
			"вкладка",
			"керамическая вкладка",
			"онлей",
			"инлей",
			"оверлей",
		],
		confidence: 0.92,
	},
	{
		code: "HEALTHY",
		title: "Интактный / Здоров",
		status: "HEALTHY",
		toothChartState: "Healthy",
		patterns: [
			"здоров",
			"интактный",
			"интактен",
			"без патологии",
			"норма",
			"санирован",
		],
		confidence: 0.94,
	},
];

export function matchDiagnosisRule(text: string): DiagnosisRule | null {
	if (!text) return null;
	const norm = text.toLowerCase().replace(/ё/g, "е");

	for (const rule of DENTAL_ICD10_RULES) {
		for (const pattern of rule.patterns) {
			const normPattern = pattern.replace(/ё/g, "е");
			if (norm.includes(normPattern)) {
				return rule;
			}
		}
	}
	return null;
}

export interface AnestheticDrugConfig {
	readonly drugKey: string;
	readonly tradeName: string;
	readonly displayName: string;
	readonly defaultVolumeMl: number;
	readonly concentration: string;
	readonly patterns: readonly string[];
}

export const KNOWN_ANESTHETICS_CONFIG: readonly AnestheticDrugConfig[] = [
	{
		drugKey: "ultracain_ds_forte",
		tradeName: "Ultracain DS Forte",
		displayName: "Ультракаин Д-С форте 1:100 000 (1.7 мл)",
		defaultVolumeMl: 1.7,
		concentration: "4% с адреналином 1:100 000",
		patterns: [
			"ультракаин форте",
			"ультракаин д-с форте",
			"ультракаин д с форте",
			"ультракаин дс форте",
			"ultracain ds forte",
		],
	},
	{
		drugKey: "ultracain_ds",
		tradeName: "Ultracain DS",
		displayName: "Ультракаин Д-С 1:200 000 (1.7 мл)",
		defaultVolumeMl: 1.7,
		concentration: "4% с адреналином 1:200 000",
		patterns: [
			"ультракаин д-с",
			"ультракаин д с",
			"ультракаин дс",
			"ультракаин",
			"ultracain ds",
			"ultracain",
		],
	},
	{
		drugKey: "ubistesin_forte",
		tradeName: "Ubistesin Forte",
		displayName: "Убистезин форте 1:100 000 (1.7 мл)",
		defaultVolumeMl: 1.7,
		concentration: "4% с эпинефрином 1:100 000",
		patterns: [
			"убистезин форте",
			"ubistesin forte",
		],
	},
	{
		drugKey: "ubistesin",
		tradeName: "Ubistesin",
		displayName: "Убистезин 1:200 000 (1.7 мл)",
		defaultVolumeMl: 1.7,
		concentration: "4% с эпинефрином 1:200 000",
		patterns: [
			"убистезин",
			"ubistesin",
		],
	},
	{
		drugKey: "scandonest_3",
		tradeName: "Scandonest 3%",
		displayName: "Скандонест 3% (Мепивакаин без адреналина, 1.7 мл)",
		defaultVolumeMl: 1.7,
		concentration: "3% без вазоконстриктора",
		patterns: [
			"скандонест",
			"scandonest",
			"мепивакаин",
			"мепивастезин",
		],
	},
	{
		drugKey: "septanest",
		tradeName: "Septanest",
		displayName: "Септанест 1:100 000 (1.7 мл)",
		defaultVolumeMl: 1.7,
		concentration: "4% с адреналином 1:100 000",
		patterns: [
			"септанест",
			"septanest",
		],
	},
	{
		drugKey: "articaine",
		tradeName: "Articaine",
		displayName: "Артикаин 4% (1.7 мл)",
		defaultVolumeMl: 1.7,
		concentration: "4%",
		patterns: [
			"артикаин",
			"articaine",
		],
	},
	{
		drugKey: "lidocaine",
		tradeName: "Lidocaine 2%",
		displayName: "Лидокаин 2% (2.0 мл)",
		defaultVolumeMl: 2.0,
		concentration: "2%",
		patterns: [
			"лидокаин",
			"lidocaine",
		],
	},
];

export function extractAnesthesiaIntent(text: string): AnesthesiaVoiceItem | null {
	if (!text) return null;
	const lower = text.toLowerCase().replace(/ё/g, "е");

	const hasAnesthesiaWord =
		lower.includes("анестези") ||
		lower.includes("карпул") ||
		lower.includes("укол") ||
		lower.includes("обезболиван") ||
		KNOWN_ANESTHETICS_CONFIG.some((c) => c.patterns.some((p) => lower.includes(p)));

	if (!hasAnesthesiaWord) return null;

	const defaultCfg = KNOWN_ANESTHETICS_CONFIG[0];
	if (!defaultCfg) return null;
	let matchedConfig: AnestheticDrugConfig = defaultCfg;
	let found = false;

	const allRules = [...KNOWN_ANESTHETICS_CONFIG].sort((a, b) => {
		const maxA = Math.max(...a.patterns.map((p) => p.length));
		const maxB = Math.max(...b.patterns.map((p) => p.length));
		return maxB - maxA;
	});

	for (const cfg of allRules) {
		if (cfg.patterns.some((p) => lower.includes(p))) {
			matchedConfig = cfg;
			found = true;
			break;
		}
	}

	if (!found && !lower.includes("анестези")) {
		return null;
	}

	let cartridgeCount = 1;
	if (lower.includes("одна карпула") || lower.includes("1 карпула") || lower.includes("одну карпулу")) {
		cartridgeCount = 1;
	} else if (lower.includes("две карпулы") || lower.includes("2 карпулы") || lower.includes("две карпула")) {
		cartridgeCount = 2;
	} else if (lower.includes("три карпулы") || lower.includes("3 карпулы")) {
		cartridgeCount = 3;
	} else if (lower.includes("пол карпулы") || lower.includes("половина карпулы") || lower.includes("0.5 карпулы")) {
		cartridgeCount = 0.5;
	} else {
		const cartMatch = lower.match(/(d+[.,]?d*)s*(?:карпул|ампул|карп)/);
		if (cartMatch && cartMatch[1]) {
			cartridgeCount = parseFloat(cartMatch[1].replace(",", "."));
		}
	}

	let volumeMl = Number((matchedConfig.defaultVolumeMl * cartridgeCount).toFixed(2));
	const volMatch = lower.match(/(d+[.,]?d*)s*(?:мл|миллилитр)/);
	if (volMatch && volMatch[1]) {
		volumeMl = parseFloat(volMatch[1].replace(",", "."));
	}

	let technique: "infiltration" | "conduction" | "application" | "intraligamentary" = "infiltration";
	if (lower.includes("проводников") || lower.includes("мандибулярн") || lower.includes("торасальн")) {
		technique = "conduction";
	} else if (lower.includes("аппликацион") || lower.includes("гель") || lower.includes("спрей")) {
		technique = "application";
	} else if (lower.includes("интралигаментарн")) {
		technique = "intraligamentary";
	} else if (lower.includes("инфильтрацион")) {
		technique = "infiltration";
	}

	return {
		drugKey: matchedConfig.drugKey,
		tradeName: matchedConfig.tradeName,
		displayName: `${matchedConfig.tradeName} ${volumeMl} мл (${cartridgeCount} карп.)`,
		volumeMl,
		cartridgeCount,
		technique,
		concentration: matchedConfig.concentration,
		code804n: "A11.07.012",
	};
}

interface ManipulationRule {
	readonly code804n: string;
	readonly name: string;
	readonly category: "therapy" | "surgery" | "endodontics" | "hygiene" | "orthopedics" | "anesthesia" | "isolation";
	readonly priceRub: number;
	readonly patterns: readonly string[];
}

export const KNOWN_MANIPULATIONS_804N: readonly ManipulationRule[] = [
	{
		code804n: "A16.07.002.001",
		name: "Наложение коффердама (раббердама) / Оптрагейт",
		category: "isolation",
		priceRub: 850,
		patterns: [
			"коффердам",
			"раббердам",
			"оптрагейт",
			"optra gate",
			"изоляция коффердамом",
			"наложение коффердама",
			"кламп",
		],
	},
	{
		code804n: "A16.07.002",
		name: "Препарирование и некрэктомия кариозной полости зуба",
		category: "therapy",
		priceRub: 1500,
		patterns: [
			"некрэктомия",
			"препарирование",
			"формирование полости",
			"раскрытие кариозной полости",
			"медобработка полости",
		],
	},
	{
		code804n: "A16.07.002.010",
		name: "Восстановление зуба пломбой светоотверждаемым композитом (Esthet-X / Estelite / Filtek)",
		category: "therapy",
		priceRub: 4500,
		patterns: [
			"пломба эстет икс",
			"эстет икс",
			"esthet x",
			"эстелайт",
			"estelite",
			"filtek",
			"филтек",
			"gradia",
			"градиа",
			"пломба светового отверждения",
			"световая пломба",
			"фотокомпозит",
			"светоотверждаемый композит",
			"адгезивный протокол",
			"реставрация зуба",
		],
	},
	{
		code804n: "A16.07.030",
		name: "Инструментальная и медикаментозная обработка корневого канала",
		category: "endodontics",
		priceRub: 3500,
		patterns: [
			"обработка корневого канала",
			"обработка каналов",
			"механическая обработка канала",
			"медобработка канала",
			"апекслокация",
			"протейпер",
			"эндомотор",
			"ирригация гипохлоритом",
		],
	},
	{
		code804n: "A16.07.008",
		name: "Пломбирование корневого канала гуттаперчей / силером (латеральная конденсация)",
		category: "endodontics",
		priceRub: 4000,
		patterns: [
			"пломбирование корневого канала",
			"пломбирование каналов",
			"гуттаперч",
			"латеральная конденсация",
			"силер ah plus",
			"обтурация каналов",
		],
	},
	{
		code804n: "A16.07.020",
		name: "Ультразвуковое удаление зубных отложений и Air-Flow",
		category: "hygiene",
		priceRub: 5000,
		patterns: [
			"ультразвук",
			"air flow",
			"снятие зубных отложений",
			"профгигиена",
			"профессиональная гигиена",
			"чистка зубов",
			"скейлинг",
		],
	},
	{
		code804n: "A16.07.001",
		name: "Удаление зуба (простое / сложное)",
		category: "surgery",
		priceRub: 3500,
		patterns: [
			"удаление зуба",
			"экстракция зуба",
			"кюретаж лунки",
			"гемостаз",
			"наложение шва",
		],
	},
];

export function extractProcedures804n(text: string, primaryTooth?: number): Procedure804nVoiceItem[] {
	if (!text) return [];
	const norm = text.toLowerCase().replace(/ё/g, "е");
	const results: Procedure804nVoiceItem[] = [];

	let shade: string | undefined;
	if (norm.includes("а два") || norm.includes("а2") || norm.includes("a2")) shade = "A2";
	else if (norm.includes("а три") || norm.includes("а3") || norm.includes("a3")) shade = "A3";
	else if (norm.includes("а один") || norm.includes("а1") || norm.includes("a1")) shade = "A1";
	else if (norm.includes("б два") || norm.includes("b2")) shade = "B2";

	for (const rule of KNOWN_MANIPULATIONS_804N) {
		const matched = rule.patterns.some((p) => norm.includes(p));
		if (matched) {
			let name = rule.name;
			if (shade && rule.category === "therapy") {
				name += ` (оттенок ${shade})`;
			}
			results.push({
				code804n: rule.code804n,
				name,
				category: rule.category,
				quantity: 1,
				toothNumber: primaryTooth,
				priceRub: rule.priceRub,
				shade,
			});
		}
	}

	return results;
}

const SOAP_HEADERS: Record<keyof SoapSectionsVoiceNote, string[]> = {
	subjective: [
		"жалобы:",
		"жалобы пациента:",
		"жалобы",
		"жалуется на",
		"со слов пациента:",
	],
	objective: [
		"объективно:",
		"при осмотре:",
		"данные осмотра:",
		"статус локалис:",
		"status localis:",
		"в полости рта:",
		"объективно",
	],
	assessment: [
		"диагноз:",
		"клинический диагноз:",
		"основное заболевание:",
		"диагноз",
	],
	plan: [
		"лечение:",
		"план лечения:",
		"проведено лечение:",
		"ход лечения:",
		"манипуляции:",
		"лечение",
	],
	recommendations: [
		"рекомендации:",
		"назначения:",
		"рекомендовано:",
		"рекомендации",
	],
};

export function extractSoapNotes(text: string): SoapSectionsVoiceNote {
	const result: Record<string, string> = {};
	if (!text) return result;

	const norm = text.trim();
	const lower = norm.toLowerCase().replace(/ё/g, "е");

	const markersWithSection: Array<{ section: keyof SoapSectionsVoiceNote; marker: string }> = [];
	for (const [sec, markers] of Object.entries(SOAP_HEADERS)) {
		for (const marker of markers) {
			markersWithSection.push({ section: sec as keyof SoapSectionsVoiceNote, marker });
		}
	}
	markersWithSection.sort((a, b) => b.marker.length - a.marker.length);

	const spans: Array<{ section: keyof SoapSectionsVoiceNote; index: number; markerLength: number }> = [];

	for (const { section, marker } of markersWithSection) {
		let pos = lower.indexOf(marker);
		while (pos !== -1) {
			const overlaps = spans.some((s) => pos >= s.index && pos < s.index + s.markerLength);
			if (!overlaps) {
				spans.push({ section, index: pos, markerLength: marker.length });
			}
			pos = lower.indexOf(marker, pos + 1);
		}
	}

	spans.sort((a, b) => a.index - b.index);

	for (let i = 0; i < spans.length; i++) {
		const current = spans[i];
		if (!current) continue;
		const start = current.index + current.markerLength;
		const next = spans[i + 1];
		const end = next ? next.index : norm.length;

		let content = norm.slice(start, end).trim();
		content = content.replace(/^[:\-–—\s]+/, "").replace(/[.\s]+$/, "").trim();

		if (content) {
			const existing = result[current.section];
			result[current.section] = existing ? `${existing}; ${content}` : content;
		}
	}

	return result;
}

function splitSpeechClauses(text: string): string[] {
	if (!text) return [];
	return text
		.split(/(?:[.;\n]+|\b(?:затем|далее|после этого)\b)/i)
		.map((s) => s.trim())
		.filter((s) => s.length > 1);
}

export function parseDentalVoiceSpeech(rawTranscript: string): DentalVoiceIntent {
	const transcript = (rawTranscript || "").trim();
	const now = new Date().toISOString();
	const intentId = `dvi_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

	if (!transcript) {
		return {
			id: intentId,
			timestamp: now,
			rawTranscript: "",
			type: "full_visit_batch",
			confidence: 0,
			confidenceLevel: "review",
			teethUpdates: [],
			detectedTeeth: [],
			anesthesia: null,
			procedures804n: [],
			soapNotes: {},
			summary: "Речь не распознана",
		};
	}

	const allTeeth = extractFdiTeethNumbers(transcript);
	const anesthesia = extractAnesthesiaIntent(transcript);
	const primaryTooth = allTeeth[0];
	const procedures804n = extractProcedures804n(transcript, primaryTooth);
	const soapNotes = extractSoapNotes(transcript);

	const clauses = splitSpeechClauses(transcript);
	const teethUpdates: ToothUpdateVoiceItem[] = [];
	const seenTeeth = new Set<number>();

	for (const clause of clauses) {
		const clauseTeeth = extractFdiTeethNumbers(clause);
		const diagRule = matchDiagnosisRule(clause);
		const surfaces = extractToothSurfaces(clause);

		if (clauseTeeth.length > 0 && diagRule) {
			for (const toothNum of clauseTeeth) {
				if (!seenTeeth.has(toothNum)) {
					seenTeeth.add(toothNum);
					teethUpdates.push({
						toothNumber: toothNum,
						state: diagRule.toothChartState,
						icd10Code: diagRule.code,
						icd10Title: diagRule.title,
						clinicalStatus: diagRule.status,
						surfaces: surfaces.length > 0 ? surfaces : undefined,
					});
				}
			}
		}
	}

	if (teethUpdates.length === 0 && allTeeth.length > 0) {
		const overallDiag = matchDiagnosisRule(transcript);
		const overallSurfaces = extractToothSurfaces(transcript);
		if (overallDiag) {
			for (const toothNum of allTeeth) {
				if (!seenTeeth.has(toothNum)) {
					seenTeeth.add(toothNum);
					teethUpdates.push({
						toothNumber: toothNum,
						state: overallDiag.toothChartState,
						icd10Code: overallDiag.code,
						icd10Title: overallDiag.title,
						clinicalStatus: overallDiag.status,
						surfaces: overallSurfaces.length > 0 ? overallSurfaces : undefined,
					});
				}
			}
		}
	}

	const enrichedSoap: Record<string, string> = { ...soapNotes };

	if (!enrichedSoap.assessment && teethUpdates.length > 0) {
		enrichedSoap.assessment = teethUpdates
			.map((t) => `Зуб ${t.toothNumber}: ${t.icd10Title} [${t.icd10Code}]`)
			.join("; ");
	}

	if (!enrichedSoap.plan && (procedures804n.length > 0 || anesthesia)) {
		const planParts: string[] = [];
		if (anesthesia) {
			planParts.push(`Анестезия: ${anesthesia.displayName}`);
		}
		for (const p of procedures804n) {
			planParts.push(p.name);
		}
		enrichedSoap.plan = planParts.join(", ");
	}

	const summaryParts: string[] = [];
	if (allTeeth.length > 0) {
		summaryParts.push(`Зубы: ${allTeeth.join(", ")}`);
	}
	if (teethUpdates.length > 0) {
		summaryParts.push(teethUpdates.map((t) => `${t.toothNumber} ${t.icd10Code}`).join(", "));
	}
	if (anesthesia) {
		summaryParts.push(anesthesia.tradeName);
	}
	if (procedures804n.length > 0) {
		summaryParts.push(`${procedures804n.length} манип.`);
	}

	const summary = summaryParts.length > 0 ? summaryParts.join(" | ") : "Клинический голосовой ввод";
	const confidence = teethUpdates.length > 0 || anesthesia || procedures804n.length > 0 ? 0.95 : 0.8;
	const confidenceLevel = confidence >= 0.9 ? "high" : "review";

	return {
		id: intentId,
		timestamp: now,
		rawTranscript: transcript,
		type: "full_visit_batch",
		confidence,
		confidenceLevel,
		teethUpdates,
		detectedTeeth: allTeeth,
		anesthesia,
		procedures804n,
		soapNotes: enrichedSoap,
		summary,
	};
}

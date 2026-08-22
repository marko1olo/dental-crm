/**
 * voiceClinicalCommands.ts — Парсер клинической стоматологической речи на русском языке
 * и грамматика голосовых команд для ЭМК и зубной формулы.
 *
 * ВОЗМОЖНОСТИ:
 * 1. Распознавание номеров зубов по FDI (11..48, 51..85) из русской речи:
 *    - Числительные словами: «сорок шесть» -> 46, «шестнадцатый» -> 16, «двадцать один» -> 21
 *    - Анатомические описания: «нижний левый первый моляр» -> 36, «верхний правый клык» -> 13
 *    - Цифровые маркеры: «зуб 46», «d36», «#21», «зуба 14»
 * 2. Извлечение клинических диагнозов и статусов зубов:
 *    - «кариес дентина» / «средний кариес» -> K02.1
 *    - «пульпит острый» / «острый пульпит» -> K04.0
 *    - «периодонтит хронический» -> K04.5
 *    - «пародонтит хронический» -> K05.3
 *    - «удален / отсутствует / адентия» -> MISSING (K08.1)
 *    - «пломба / реставрация» -> RESTORATION
 *    - «коронка / диоксид циркония / e.max» -> CROWN
 *    - «имплантат / имплант установлен» -> IMPLANT
 *    - «культевая вкладка» -> INLAY
 *    - «клиновидный дефект» -> K03.1
 *    - «интактный / здоров» -> HEALTHY
 * 3. Маршрутизация по секциям SOAP:
 *    - Жалобы (Subjective): «жалобы: ноющая боль от холодного»
 *    - Объективно (Objective): «объективно: глубокая кариозная полость...»
 *    - Лечение / План (Plan): «лечение: некротомия, медобработка, адгезивный протокол...»
 *    - Рекомендации (Recommendations): «рекомендации: исключить твердую пищу на 2 часа»
 * 4. Учёт анестезии и расходных материалов:
 *    - «анестезия убистезин 1.7 мл 1 карпула»
 *    - «наложение коффердама», «оптрагейт», «световой композит»
 * 5. Расчёт доверия (confidence) и флагов проверки (high vs review).
 */

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

export type SoapSectionType =
	| "subjective"
	| "objective"
	| "assessment"
	| "plan"
	| "recommendations";

export type CommandConfidenceLevel = "high" | "review";

export type CommandCategory =
	| "odontogram"
	| "soap"
	| "anesthesia"
	| "consumable"
	| "navigation"
	| "general";

export interface AnesthesiaParsedInfo {
	drug: string;
	volumeMl?: number;
	cartridgeCount?: number;
	technique?: "infiltration" | "conduction" | "application";
	concentration?: string;
}

export interface ConsumableParsedInfo {
	name: string;
	quantity?: number;
	unit?: string;
}

export interface ParsedClinicalVoiceCommand {
	id: string;
	rawSpeech: string;
	category: CommandCategory;
	confidence: number;
	confidenceLevel: CommandConfidenceLevel;
	summary: string;
	toothNumber?: number | null;
	icd10Code?: string | null;
	icd10Title?: string | null;
	clinicalStatus?: ClinicalToothStatus | null;
	soapSection?: SoapSectionType | null;
	soapText?: string | null;
	anesthesiaDetails?: AnesthesiaParsedInfo | null;
	consumableDetails?: ConsumableParsedInfo | null;
	applied?: boolean;
}

export interface SoapAggregatedNote {
	subjective?: string;
	objective?: string;
	assessment?: string;
	plan?: string;
	recommendations?: string;
}

export interface ClinicalVoiceParseResult {
	transcript: string;
	commands: ParsedClinicalVoiceCommand[];
	soapNote: SoapAggregatedNote;
	detectedTeeth: number[];
	summary: string;
}

// -----------------------------------------------------------------------------
// 1. СЛОВАРИ ДЛЯ ЧИСЛИТЕЛЬНЫХ И НОМЕРОВ ЗУБОВ FDI
// -----------------------------------------------------------------------------

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
	"два": 2,
	"две": 2,
	"второй": 2,
	"второго": 2,
	"втором": 2,
	"вторая": 2,
	"три": 3,
	"третий": 3,
	"третьего": 3,
	"третьем": 3,
	"третья": 3,
	"четыре": 4,
	"четвертый": 4,
	"четвёртый": 4,
	"четвертого": 4,
	"четвёртого": 4,
	"четвертом": 4,
	"четвёртом": 4,
	"четвертая": 4,
	"пять": 5,
	"пятый": 5,
	"пятого": 5,
	"пятом": 5,
	"пятая": 5,
	"шесть": 6,
	"шестой": 6,
	"шестого": 6,
	"шестом": 6,
	"шестая": 6,
	"семь": 7,
	"седьмой": 7,
	"седьмого": 7,
	"седьмом": 7,
	"седьмая": 7,
	"восемь": 8,
	"восьмой": 8,
	"восьмого": 8,
	"восьмом": 8,
	"восьмая": 8,
	"девять": 9,
	"девятый": 9,
	"девятого": 9,
	"девятом": 9,
	"девятая": 9,
};

// Анатомические описания зубов:
// Квадранты:
// 1 = Верхний правый (11..18)
// 2 = Верхний левый (21..28)
// 3 = Нижний левый (31..38)
// 4 = Нижний правый (41..48)
// Молочные: 5 = ВП, 6 = ВЛ, 7 = НЛ, 8 = НП

const TOOTH_ANATOMICAL_POSITIONS: Record<string, number> = {
	// Резцы (1, 2)
	"центральный резец": 1,
	"центрального резца": 1,
	"медиальный резец": 1,
	"первый резец": 1,
	"боковой резец": 2,
	"бокового резца": 2,
	"латеральный резец": 2,
	"второй резец": 2,
	// Клыки (3)
	"клык": 3,
	"клыка": 3,
	"клыке": 3,
	"третий зуб": 3,
	// Премоляры (4, 5)
	"первый премоляр": 4,
	"первого премоляра": 4,
	"четвертый зуб": 4,
	"четвёртый зуб": 4,
	"первый малый коренной": 4,
	"второй премоляр": 5,
	"второго премоляра": 5,
	"пятый зуб": 5,
	"второй малый коренной": 5,
	// Моляры (6, 7, 8)
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

/**
 * Проверяет, является ли число допустимым номером зуба по классификации FDI.
 */
export function isValidFdiToothNumber(num: number): boolean {
	return ALL_VALID_FDI_TEETH.includes(num);
}

/**
 * Распознаёт номер зуба из словесного текста на русском языке.
 * Возвращает найденный номер зуба (FDI) или null.
 */
export function parseRussianSpokenToothNumber(text: string): number | null {
	if (!text || typeof text !== "string") return null;

	const normalized = text.toLowerCase().trim().replace(/ё/g, "е");

	// 1. Анатомические описания (например: «нижний левый первый моляр», «верхний правый клык»)
	const isUpper =
		normalized.includes("верхн") ||
		normalized.includes("максиллярн") ||
		normalized.includes("сверху");
	const isLower =
		normalized.includes("нижн") ||
		normalized.includes("мандибулярн") ||
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
			// Ищем позицию зуба (от длинных фраз к коротким)
			const entries = Object.entries(TOOTH_ANATOMICAL_POSITIONS).sort(
				(a, b) => b[0].length - a[0].length,
			);
			for (const [phrase, pos] of entries) {
				const normPhrase = phrase.replace(/ё/g, "е");
				if (normalized.includes(normPhrase)) {
					const tooth = quadrant * 10 + pos;
					if (isValidFdiToothNumber(tooth)) {
						return tooth;
					}
				}
			}
		}
	}

	// 2. Словесные числительные:
	// Обработка составных чисел типа «сорок шесть», «двадцать один», «тридцать восемь», «шестнадцатый зуб»
	const words = normalized.split(/[\s,.-]+/).filter(Boolean);

	for (let i = 0; i < words.length; i++) {
		const current = words[i];
		const next = words[i + 1];

		// Проверка десятков + единиц («сорок шесть»)
		if (current && TENS_WORDS[current] !== undefined) {
			const tens = TENS_WORDS[current];
			if (tens !== undefined && next && ONES_WORDS[next] !== undefined) {
				const ones = ONES_WORDS[next];
				if (ones !== undefined) {
					const tooth = tens + ones;
					if (isValidFdiToothNumber(tooth)) {
						return tooth;
					}
				}
			} else if (tens !== undefined && isValidFdiToothNumber(tens)) {
				return tens;
			}
		}

		// Проверка тинейджеров («шестнадцать», «шестнадцатый»)
		if (current && TEEN_NUMBER_WORDS[current] !== undefined) {
			const tooth = TEEN_NUMBER_WORDS[current];
			if (tooth && isValidFdiToothNumber(tooth)) {
				return tooth;
			}
		}
	}

	// 3. Поиск цифровых шаблонов: "зуб 46", "зуба 16", "зубе 21", "#46", "d36", "46"
	const directMatch = normalized.match(
		/(?:зуб[аеы]?|номер|#|d|№)?\s*([1-8][1-8])\b/,
	);
	if (directMatch && directMatch[1]) {
		const parsed = parseInt(directMatch[1], 10);
		if (isValidFdiToothNumber(parsed)) {
			return parsed;
		}
	}

	return null;
}

// -----------------------------------------------------------------------------
// 2. ДИАГНОЗЫ И СТАТУСЫ ЗУБНОЙ ФОРМУЛЫ
// -----------------------------------------------------------------------------

export interface DiagnosisDefinition {
	code: string;
	title: string;
	status: ClinicalToothStatus;
	patterns: string[];
	confidence: number;
}

export const CLINICAL_DIAGNOSES_CATALOG: DiagnosisDefinition[] = [
	{
		code: "K02.1",
		title: "Кариес дентина",
		status: "CARIES",
		patterns: [
			"кариес дентина",
			"средний кариес",
			"глубокий кариес",
			"кариозное поражение дентина",
			"кариес",
			"полость кариозная",
			"кариозная полость",
		],
		confidence: 0.95,
	},
	{
		code: "K02.0",
		title: "Кариес эмали (в стадии пятна)",
		status: "CARIES",
		patterns: [
			"кариес эмали",
			"начальный кариес",
			"кариес в стадии пятна",
			"меловидное пятно",
		],
		confidence: 0.95,
	},
	{
		code: "K04.0",
		title: "Острый пульпит",
		status: "PULPITIS",
		patterns: [
			"пульпит острый",
			"острый пульпит",
			"пульпит",
			"очаговый пульпит",
			"диффузный пульпит",
			"гнойный пульпит",
			"острая пульпарная боль",
		],
		confidence: 0.95,
	},
	{
		code: "K04.5",
		title: "Хронический периодонтит",
		status: "PERIODONTITIS",
		patterns: [
			"периодонтит хронический",
			"хронический периодонтит",
			"периодонтит",
			"гранулирующий периодонтит",
			"гранулематозный периодонтит",
			"фиброзный периодонтит",
			"апикальный периодонтит",
		],
		confidence: 0.95,
	},
	{
		code: "K05.3",
		title: "Хронический пародонтит",
		status: "PERIODONTITIS_GENERAL",
		patterns: [
			"пародонтит хронический",
			"хронический пародонтит",
			"пародонтит",
			"генерализованный пародонтит",
			"локализованный пародонтит",
			"пародонтальный карман",
		],
		confidence: 0.9,
	},
	{
		code: "K08.1",
		title: "Потеря зубов вследствие удаления или травмы (Отсутствует)",
		status: "MISSING",
		patterns: [
			"удален",
			"удалён",
			"отсутствует",
			"отсутствующий",
			"удаление",
			"адентия",
			"экстракция",
			"зуб удален",
			"ранее удален",
		],
		confidence: 0.95,
	},
	{
		code: "RESTORATION",
		title: "Пломба / Реставрация",
		status: "RESTORATION",
		patterns: [
			"пломба светового отверждения",
			"пломба",
			"реставрация",
			"световая пломба",
			"композитная реставрация",
			"восстановление зуба",
			"поставлена пломба",
			"пломбирование",
		],
		confidence: 0.95,
	},
	{
		code: "CROWN",
		title: "Коронка (диоксид циркония / E.max / металлокерамика)",
		status: "CROWN",
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
		],
		confidence: 0.95,
	},
	{
		code: "IMPLANT",
		title: "Дентальный имплантат установлен",
		status: "IMPLANT",
		patterns: [
			"имплантат установлен",
			"имплантат",
			"имплант",
			"имплантант",
			"дентальный имплантат",
			"установка имплантата",
			"имплантация",
		],
		confidence: 0.95,
	},
	{
		code: "INLAY",
		title: "Культевая вкладка / Микропротез",
		status: "INLAY",
		patterns: [
			"культевая вкладка",
			"вкладка",
			"керамическая вкладка",
			"онлей",
			"инлей",
			"оверлей",
		],
		confidence: 0.9,
	},
	{
		code: "K03.1",
		title: "Клиновидный дефект",
		status: "WEDGE_DEFECT",
		patterns: [
			"клиновидный дефект",
			"клиновидный",
			"пришеечный дефект",
		],
		confidence: 0.9,
	},
	{
		code: "K03.2",
		title: "Эрозия эмали",
		status: "EROSION",
		patterns: [
			"эрозия эмали",
			"эрозия зубов",
			"кислотная эрозия",
		],
		confidence: 0.9,
	},
	{
		code: "K03.8",
		title: "Перелом или трещина зуба",
		status: "FRACTURE",
		patterns: [
			"трещина зуба",
			"перелом зуба",
			"откол коронки",
			"откол стенки зуба",
			"скол эмали",
		],
		confidence: 0.9,
	},
	{
		code: "HEALTHY",
		title: "Интактный / Здоров",
		status: "HEALTHY",
		patterns: [
			"здоров",
			"интактный",
			"без патологии",
			"норма",
			"интактен",
		],
		confidence: 0.9,
	},
];

/**
 * Ищет совпадение по диагнозу в клиническом тексте.
 */
export function extractClinicalDiagnoses(text: string): DiagnosisDefinition | null {
	if (!text) return null;
	const norm = text.toLowerCase().replace(/ё/g, "е");

	for (const item of CLINICAL_DIAGNOSES_CATALOG) {
		for (const pattern of item.patterns) {
			const normPattern = pattern.replace(/ё/g, "е");
			if (norm.includes(normPattern)) {
				return item;
			}
		}
	}
	return null;
}

// -----------------------------------------------------------------------------
// 3. SOAP МАРШРУТИЗАЦИЯ И СЕКЦИИ
// -----------------------------------------------------------------------------

const SOAP_MARKERS: Record<SoapSectionType, string[]> = {
	subjective: [
		"жалобы:",
		"жалобы пациента:",
		"жалобы",
		"жалуется на",
		"со слов пациента:",
		"пациент отмечает:",
		"анамнез заболевания:",
		"анамнез:",
	],
	objective: [
		"объективно:",
		"при осмотре:",
		"данные осмотра:",
		"статус локалис:",
		"status localis:",
		"объективные данные:",
		"в полости рта:",
		"объективно",
		"при осмотре",
	],
	assessment: [
		"диагноз:",
		"предварительный диагноз:",
		"клинический диагноз:",
		"основное заболевание:",
		"диагноз",
	],
	plan: [
		"лечение:",
		"план лечения:",
		"проведено лечение:",
		"ход лечения:",
		"протокол лечения:",
		"протокол:",
		"манипуляции:",
		"лечение",
	],
	recommendations: [
		"рекомендации:",
		"назначения:",
		"рекомендовано:",
		"пациенту назначено:",
		"советы врача:",
		"рекомендации",
		"назначения",
	],
};

/**
 * Извлекает структурированные SOAP секции из свободной речи.
 */
export function extractSoapSections(text: string): SoapAggregatedNote {
	const result: SoapAggregatedNote = {};
	if (!text) return result;

	const norm = text.trim();

	// Разделяем по маркерам SOAP
	const allMarkersWithKeys: Array<{ section: SoapSectionType; marker: string }> = [];
	for (const [section, markers] of Object.entries(SOAP_MARKERS)) {
		for (const marker of markers) {
			allMarkersWithKeys.push({ section: section as SoapSectionType, marker });
		}
	}

	// Сортируем маркеры по длине (сначала более длинные и точные)
	allMarkersWithKeys.sort((a, b) => b.marker.length - a.marker.length);

	const foundSpans: Array<{ section: SoapSectionType; index: number; markerLength: number }> = [];

	const lower = norm.toLowerCase().replace(/ё/g, "е");

	for (const { section, marker } of allMarkersWithKeys) {
		const normMarker = marker.replace(/ё/g, "е");
		let pos = lower.indexOf(normMarker);
		while (pos !== -1) {
			// Проверяем, не перекрывается ли с уже найденным маркером
			const overlaps = foundSpans.some(
				(s) => pos >= s.index && pos < s.index + s.markerLength,
			);
			if (!overlaps) {
				foundSpans.push({ section, index: pos, markerLength: normMarker.length });
			}
			pos = lower.indexOf(normMarker, pos + 1);
		}
	}

	// Сортируем найденные спаны по позиции в тексте
	foundSpans.sort((a, b) => a.index - b.index);

	for (let i = 0; i < foundSpans.length; i++) {
		const current = foundSpans[i];
		if (!current) continue;

		const start = current.index + current.markerLength;
		const next = foundSpans[i + 1];
		const end = next ? next.index : norm.length;

		let content = norm.slice(start, end).trim();
		// Удаляем ведущие двоеточия, дефисы, пробелы и замыкающие точки
		content = content
			.replace(/^[:\-–—\s]+/, "")
			.replace(/[.\s]+$/, "")
			.trim();

		if (content) {
			const existing = result[current.section];
			result[current.section] = existing ? `${existing}; ${content}` : content;
		}
	}

	return result;
}

// -----------------------------------------------------------------------------
// 4. УЧЁТ АНЕСТЕЗИИ И РАСХОДНЫХ МАТЕРИАЛОВ
// -----------------------------------------------------------------------------

const KNOWN_ANESTHETICS = [
	"ультракаин д-с форте",
	"ультракаин д-с",
	"ультракаин",
	"убистезин форте",
	"убистезин",
	"септанест",
	"артикаин",
	"скандонест",
	"мепивакаин",
	"лидокаин",
	"новокаин",
];

/**
 * Извлекает информацию об анестезии и расходных материалах.
 */
export function extractAnesthesiaAndConsumables(text: string): {
	anesthesia: AnesthesiaParsedInfo | null;
	consumables: ConsumableParsedInfo[];
} {
	const result: {
		anesthesia: AnesthesiaParsedInfo | null;
		consumables: ConsumableParsedInfo[];
	} = {
		anesthesia: null,
		consumables: [],
	};

	if (!text) return result;
	const lower = text.toLowerCase().replace(/ё/g, "е");

	// 1. Анестезия
	const isAnesthesiaMentioned =
		lower.includes("анестези") ||
		KNOWN_ANESTHETICS.some((drug) => lower.includes(drug));

	if (isAnesthesiaMentioned) {
		let drugName = "Артикаинсодержащий анестетик";
		// Сортируем по длине, чтобы "ультракаин д-с" матчился раньше "ультракаин"
		const sortedDrugs = [...KNOWN_ANESTHETICS].sort(
			(a, b) => b.length - a.length,
		);
		for (const drug of sortedDrugs) {
			if (lower.includes(drug)) {
				drugName = drug.charAt(0).toUpperCase() + drug.slice(1);
				break;
			}
		}

		// Объём в мл
		let volumeMl = 1.7; // стандартный объем карпулы
		const volumeMatch = lower.match(/(\d+[.,]?\d*)\s*(?:мл|миллилитр)/);
		if (volumeMatch && volumeMatch[1]) {
			volumeMl = parseFloat(volumeMatch[1].replace(",", "."));
		}

		// Количество карпул
		let cartridgeCount = 1;
		const cartridgeMatch = lower.match(
			/(\d+)\s*(?:карпул|ампул|карпулы|ампулы)/,
		);
		if (cartridgeMatch && cartridgeMatch[1]) {
			cartridgeCount = parseInt(cartridgeMatch[1], 10);
		}

		// Техника
		let technique: "infiltration" | "conduction" | "application" =
			"infiltration";
		if (lower.includes("проводников")) technique = "conduction";
		else if (lower.includes("аппликацион")) technique = "application";
		else if (lower.includes("инфильтрацион")) technique = "infiltration";

		result.anesthesia = {
			drug: drugName,
			volumeMl,
			cartridgeCount,
			technique,
		};
	}

	// 2. Расходные материалы
	const consumablePatterns = [
		{
			pattern: /(?:наложение\s+)?коффердам(?:а)?(?:\s+установлен)?/,
			name: "Коффердам (раббердам)",
			unit: "шт",
		},
		{
			pattern: /оптрагейт|optra\s*gate/,
			name: "Ретрактор OptraGate",
			unit: "шт",
		},
		{
			pattern: /адгезивный\s+протокол|адгезив(?:\s+5\s*поколения)?/,
			name: "Адгезивная система",
			unit: "доза",
		},
		{
			pattern:
				/пломба\s+светового\s+отверждения|светоотверждаемый\s+композит|эстелайт|filtek|gradia/,
			name: "Композит светового отверждения",
			unit: "порция",
		},
		{
			pattern: /гуттаперч(?:а|евые\s+штифты)|силер|ah\s*plus/,
			name: "Гуттаперчевые штифты и эндодонтический силер",
			unit: "комплект",
		},
		{
			pattern: /шовный\s+материал|викрил|кетгут/,
			name: "Шовный материал",
			unit: "нить",
		},
	];

	for (const item of consumablePatterns) {
		if (item.pattern.test(lower)) {
			result.consumables.push({
				name: item.name,
				quantity: 1,
				unit: item.unit,
			});
		}
	}

	return result;
}

// -----------------------------------------------------------------------------
// 5. ГЛАВНЫЙ КОНВЕЙЕР РАЗБОРА КЛИНИЧЕСКОЙ РЕЧИ
// -----------------------------------------------------------------------------

/**
 * Разбивает большой клинический текст на логические предложения/фразы.
 */
function splitIntoClinicalClauses(text: string): string[] {
	if (!text) return [];
	return text
		.split(/(?:[.;\n]+|\b(?:затем|далее|после этого)\b)/i)
		.map((s) => s.trim())
		.filter((s) => s.length > 2);
}

/**
 * Выполняет полный разбор клинической речи врача:
 * выделяет команды зубной формулы, диагнозы, SOAP заметки, анестезию и материалы.
 */
export function parseClinicalVoiceSpeech(
	rawTranscript: string,
): ClinicalVoiceParseResult {
	const transcript = (rawTranscript || "").trim();
	const commands: ParsedClinicalVoiceCommand[] = [];
	const detectedTeethSet = new Set<number>();

	if (!transcript) {
		return {
			transcript: "",
			commands: [],
			soapNote: {},
			detectedTeeth: [],
			summary: "Речь не распознана",
		};
	}

	// 1. Извлекаем SOAP секции
	const soapNote = extractSoapSections(transcript);
	for (const [secKey, secText] of Object.entries(soapNote)) {
		if (secText) {
			const secType = secKey as SoapSectionType;
			let titleRu = "SOAP Заметка";
			if (secType === "subjective") titleRu = "Жалобы пациента";
			else if (secType === "objective") titleRu = "Объективный осмотр";
			else if (secType === "assessment") titleRu = "Диагноз";
			else if (secType === "plan") titleRu = "Лечебные манипуляции";
			else if (secType === "recommendations") titleRu = "Рекомендации пациенту";

			commands.push({
				id: `soap_${secType}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
				rawSpeech: secText,
				category: "soap",
				confidence: 0.92,
				confidenceLevel: "high",
				summary: `${titleRu}: ${secText.slice(0, 60)}${secText.length > 60 ? "..." : ""}`,
				soapSection: secType,
				soapText: secText,
			});
		}
	}

	// 2. Извлекаем анестезию и материалы
	const { anesthesia, consumables } = extractAnesthesiaAndConsumables(transcript);
	if (anesthesia) {
		commands.push({
			id: `anes_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
			rawSpeech: transcript,
			category: "anesthesia",
			confidence: 0.95,
			confidenceLevel: "high",
			summary: `Анестезия: ${anesthesia.drug} ${anesthesia.volumeMl} мл (${anesthesia.cartridgeCount} карп.)`,
			anesthesiaDetails: anesthesia,
		});
	}

	for (const cons of consumables) {
		commands.push({
			id: `cons_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
			rawSpeech: transcript,
			category: "consumable",
			confidence: 0.9,
			confidenceLevel: "high",
			summary: `Материал: ${cons.name}`,
			consumableDetails: cons,
		});
	}

	// 3. Разбираем по отдельным клиническим высказываниям для зубной формулы
	const clauses = splitIntoClinicalClauses(transcript);

	for (const clause of clauses) {
		const toothNumber = parseRussianSpokenToothNumber(clause);
		const diagnosis = extractClinicalDiagnoses(clause);

		if (toothNumber) {
			detectedTeethSet.add(toothNumber);
		}

		if (toothNumber && diagnosis) {
			commands.push({
				id: `tooth_${toothNumber}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
				rawSpeech: clause,
				category: "odontogram",
				confidence: diagnosis.confidence,
				confidenceLevel: diagnosis.confidence >= 0.85 ? "high" : "review",
				summary: `Зуб ${toothNumber}: ${diagnosis.title} [${diagnosis.code}]`,
				toothNumber,
				icd10Code: diagnosis.code,
				icd10Title: diagnosis.title,
				clinicalStatus: diagnosis.status,
			});
		} else if (toothNumber && !diagnosis) {
			// Упомянут только номер зуба без диагноза в этой фразе
			commands.push({
				id: `tooth_sel_${toothNumber}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
				rawSpeech: clause,
				category: "odontogram",
				confidence: 0.8,
				confidenceLevel: "review",
				summary: `Выбор зуба ${toothNumber} (требуется диагноз/действие)`,
				toothNumber,
			});
		} else if (!toothNumber && diagnosis && !soapNote.assessment) {
			// Упомянут диагноз без явного номера зуба
			commands.push({
				id: `diag_notooth_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
				rawSpeech: clause,
				category: "odontogram",
				confidence: 0.7,
				confidenceLevel: "review",
				summary: `Диагноз: ${diagnosis.title} (укажите номер зуба)`,
				icd10Code: diagnosis.code,
				icd10Title: diagnosis.title,
				clinicalStatus: diagnosis.status,
			});
		}
	}

	// Формируем краткий сводный заголовок
	const summaryParts: string[] = [];
	if (detectedTeethSet.size > 0) {
		summaryParts.push(
			`Зубы: ${Array.from(detectedTeethSet).sort((a, b) => a - b).join(", ")}`,
		);
	}
	if (anesthesia) {
		summaryParts.push(anesthesia.drug);
	}
	if (Object.keys(soapNote).length > 0) {
		summaryParts.push(`SOAP: ${Object.keys(soapNote).length} секц.`);
	}

	const summary =
		summaryParts.length > 0
			? summaryParts.join(" | ")
			: `Распознано команд: ${commands.length}`;

	return {
		transcript,
		commands,
		soapNote,
		detectedTeeth: Array.from(detectedTeethSet).sort((a, b) => a - b),
		summary,
	};
}

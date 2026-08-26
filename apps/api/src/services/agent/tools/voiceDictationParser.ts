/**
 * voiceDictationParser.ts — Clinical NLP and regex rule engine for parsing
 * raw doctor voice transcripts into structured dental entities.
 *
 * Extracts:
 * - FDI Tooth numbers (ISO 3950): permanent (11–48) and primary (51–85)
 * - ICD-10 dental diagnoses (K00–K14)
 * - Anesthetics used (drug name, volume ml, carpules, technique)
 * - Restorative, endodontic, surgical, and orthopedic materials
 * - Clinical observations (percussion, vitality, probing depth, mobility)
 */

import {
	ALL_VALID_FDI_TEETH,
	Icd10ClinicalValidator,
} from "../../clinical/Icd10ClinicalValidator.js";

export interface ParsedAnesthesia {
	readonly drug?: string | undefined;
	readonly technique?: string | undefined;
	readonly volumeMl?: number | undefined;
	readonly carpules?: number | undefined;
	readonly rawText?: string | undefined;
}

export interface ParsedDiagnosis {
	readonly code: string;
	readonly titleRu: string;
	readonly toothNumber?: number | undefined;
	readonly confidence: number;
	readonly rawTerm?: string | undefined;
}

export interface ParsedClinicalEntities {
	readonly teeth: number[];
	readonly diagnoses: ParsedDiagnosis[];
	readonly anesthesia?: ParsedAnesthesia | undefined;
	readonly materials: string[];
	readonly procedures: string[];
	readonly clinicalFindings: {
		readonly percussion?: "positive" | "negative" | "slightly_positive" | undefined;
		readonly coldTest?: "positive" | "negative" | "lingering" | undefined;
		readonly probingDepthMm?: number | undefined;
		readonly mobilityGrade?: string | undefined;
		readonly cavityClass?: string | undefined;
		readonly rootCanals?: {
			readonly count?: number | undefined;
			readonly workingLengths?: string | undefined;
		} | undefined;
	};
	readonly subjectiveSummary?: string | undefined;
	readonly objectiveSummary?: string | undefined;
	readonly treatmentSummary?: string | undefined;
	readonly recommendations: string[];
}

// ─── 1. FDI TOOTH PARSER ───────────────────────────────────────────────────

const RUSSIAN_TEETH_TENS: Readonly<Record<string, number>> = {
	десять: 10,
	одиннадцать: 11,
	двенадцать: 12,
	тринадцать: 13,
	четырнадцать: 14,
	пятнадцать: 15,
	шестнадцать: 16,
	семнадцать: 17,
	восемнадцать: 18,
	двадцать: 20,
	тридцать: 30,
	сорок: 40,
	пятьдесят: 50,
	шестьдесят: 60,
	семьдесят: 70,
	восемьдесят: 80,
};

const RUSSIAN_TEETH_ONES: Readonly<Record<string, number>> = {
	один: 1,
	первый: 1,
	первого: 1,
	первом: 1,
	два: 2,
	второй: 2,
	второго: 2,
	втором: 2,
	три: 3,
	третий: 3,
	третьего: 3,
	третьем: 3,
	четыре: 4,
	четвертый: 4,
	четвертого: 4,
	четвертом: 4,
	пять: 5,
	пятый: 5,
	пятого: 5,
	пятом: 5,
	шесть: 6,
	шестой: 6,
	шестого: 6,
	шестом: 6,
	семь: 7,
	седьмой: 7,
	седьмого: 7,
	седьмом: 7,
	восемь: 8,
	восьмой: 8,
	восьмого: 8,
	восьмом: 8,
};

const RUSSIAN_COMPOUND_ORDINALS: Readonly<Record<string, number>> = {
	одиннадцатый: 11,
	одиннадцатого: 11,
	двенадцатый: 12,
	двенадцатого: 12,
	тринадцатый: 13,
	тринадцатого: 13,
	четырнадцатый: 14,
	четырнадцатого: 14,
	пятнадцатый: 15,
	пятнадцатого: 15,
	шестнадцатый: 16,
	шестнадцатого: 16,
	семнадцатый: 17,
	семнадцатого: 17,
	восемнадцатый: 18,
	восемнадцатого: 18,
	двадцатьпервый: 21,
	двадцатьвторой: 22,
	двадцатьтретий: 23,
	двадцатьчетвертый: 24,
	двадцатьпятый: 25,
	двадцатьшестой: 26,
	двадцатьседьмой: 27,
	двадцатьвосьмой: 28,
	тридцатьпервый: 31,
	тридцатьвторой: 32,
	тридцатьтретий: 33,
	тридцатьчетвертый: 34,
	тридцатьпятый: 35,
	тридцатьшестой: 36,
	тридцатьседьмой: 37,
	тридцатьвосьмой: 38,
	сорокпервый: 41,
	сороквторой: 42,
	сороктретий: 43,
	сорокчетвертый: 44,
	сорокпятый: 45,
	сорокшестой: 46,
	сорокседьмой: 47,
	сороквосьмой: 48,
	пятьдесятпервый: 51,
	пятьдесятвторой: 52,
	пятьдесяттретий: 53,
	пятьдесятчетвертый: 54,
	пятьдесятпятый: 55,
	шестьдесятпервый: 61,
	шестьдесятвторой: 62,
	шестьдесяттретий: 63,
	шестьдесятчетвертый: 64,
	шестьдесятпятый: 65,
	семьдесятпервый: 71,
	семьдесятвторой: 72,
	семьдесяттретий: 73,
	семьдесятчетвертый: 74,
	семьдесятпятый: 75,
	восемьдесятпервый: 81,
	восемьдесятвторой: 82,
	восемьдесяттретий: 83,
	восемьдесятчетвертый: 84,
	восемьдесятпятый: 85,
};

export function extractFdiTeeth(text: string): number[] {
	const foundTeeth = new Set<number>();
	let lower = text.toLowerCase();

	// 1. Strip out ICD-10 codes like K02.1, K04.0, K05.3 so "2.1" or "4.0" aren't parsed as teeth
	lower = lower.replace(/[kк]\d{2}(?:\.\d{1,2})?/gi, " ");

	// 2. Strip out dosages, volumes, durations, percentages so "1.7 мл" isn't parsed as tooth 17
	lower = lower.replace(
		/\d+(?:[.,]\d+)?\s*(?:мл|ml|мг|mg|мм|mm|см|cm|мка|%|час[а-я]*|мин[а-я]*|дн[а-я]*|лет|год[а-я]*|руб[а-я]*|карпул[а-я]*|карп|ампул[а-я]*|нсм|ncm|isq)\b/gi,
		" ",
	);

	// 3. Explicit prefix tooth patterns: "зуб 46", "зубе 1.6", "зуба 35", "области 11", "tooth 21"
	const explicitPrefixRegex =
		/(?:зуб[аеы]?|област[иь]|tooth|teeth|fdi|№|#)\s*([1-8])(?:[.\s-]*)?([1-8])\b/gi;
	for (const match of lower.matchAll(explicitPrefixRegex)) {
		const qStr = match[1];
		const tStr = match[2];
		if (qStr && tStr) {
			const q = Number.parseInt(qStr, 10);
			const t = Number.parseInt(tStr, 10);
			const tooth = q * 10 + t;
			if (ALL_VALID_FDI_TEETH.has(tooth)) {
				foundTeeth.add(tooth);
			}
		}
	}

	// 4. Standalone or comma-delimited 2-digit numbers: "16, 17, 18" or "зуб 46"
	const listRegex = /\b([1-4][1-8]|[5-8][1-5])\b/g;
	for (const match of lower.matchAll(listRegex)) {
		const numStr = match[1];
		if (numStr) {
			const num = Number.parseInt(numStr, 10);
			if (ALL_VALID_FDI_TEETH.has(num)) {
				foundTeeth.add(num);
			}
		}
	}

	// 5. Spoken Russian numbers: "зуб сорок шесть", "тридцать шестого"
	const cleaned = lower.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, " ");
	const words = cleaned.split(/\s+/).filter(Boolean);

	for (let i = 0; i < words.length; i++) {
		const word = words[i];
		if (!word) continue;

		// Check compound single word: "сорокшестой"
		const compound = RUSSIAN_COMPOUND_ORDINALS[word];
		if (compound !== undefined) {
			if (ALL_VALID_FDI_TEETH.has(compound)) {
				foundTeeth.add(compound);
			}
			continue;
		}

		// Check two-word pairs: "сорок" + "шесть" / "сорок" + "шестого"
		if (i + 1 < words.length) {
			const nextWord = words[i + 1];
			if (nextWord) {
				const ten = RUSSIAN_TEETH_TENS[word];
				const one = RUSSIAN_TEETH_ONES[nextWord];

				if (ten !== undefined && one !== undefined) {
					const tooth = ten + one;
					if (ALL_VALID_FDI_TEETH.has(tooth)) {
						foundTeeth.add(tooth);
						i++; // Skip next word
						continue;
					}
				}
			}
		}

		// Check direct teen word: "шестнадцать"
		const teen = RUSSIAN_TEETH_TENS[word];
		if (teen !== undefined && teen >= 11 && teen <= 18) {
			foundTeeth.add(teen);
		}
	}

	return Array.from(foundTeeth).sort((a, b) => a - b);
}

// ─── 2. ICD-10 & DIAGNOSTIC RECOGNITION ────────────────────────────────────

interface DiagnosisRule {
	readonly code: string;
	readonly titleRu: string;
	readonly keywords: string[];
}

const DENTAL_DIAGNOSIS_RULES: DiagnosisRule[] = [
	{
		code: "K02.1",
		titleRu: "Кариес дентина (средний / глубокий)",
		keywords: [
			"кариес дентина",
			"глубокий кариес",
			"средний кариес",
			"кариозная полость",
			"кариес",
			"caries",
		],
	},
	{
		code: "K02.0",
		titleRu: "Кариес эмали (в стадии пятна / поверхностный)",
		keywords: ["кариес эмали", "начальный кариес", "белое пятно", "поверхностный кариес"],
	},
	{
		code: "K04.0",
		titleRu: "Пульпит (острый / хронический)",
		keywords: [
			"пульпит",
			"острый пульпит",
			"хронический пульпит",
			"пульсирующая боль",
			"ночная боль",
			"pulpitis",
		],
	},
	{
		code: "K04.5",
		titleRu: "Хронический апикальный периодонтит",
		keywords: [
			"периодонтит",
			"апикальный периодонтит",
			"верхушечный периодонтит",
			"гранулема",
			"периапикальный очаг",
			"periodontitis",
		],
	},
	{
		code: "K04.7",
		titleRu: "Периапикальный абсцесс без свища (периостит / флюс)",
		keywords: ["периапикальный абсцесс", "периостит", "флюс", "припухлость щеки", "гнойный экссудат"],
	},
	{
		code: "K05.1",
		titleRu: "Хронический гингивит (катаральный / гипертрофический)",
		keywords: ["гингивит", "катаральный гингивит", "кровоточивость десны", "отек сосочков"],
	},
	{
		code: "K05.3",
		titleRu: "Хронический генерализованный/локализованный пародонтит",
		keywords: [
			"пародонтит",
			"пародонтальный карман",
			"пародонтоз",
			"убыль костной ткани",
			"скейлинг",
			"bop",
		],
	},
	{
		code: "K03.1",
		titleRu: "Сошлифовывание / Клиновидный дефект зубов",
		keywords: ["клиновидный дефект", "клиновидный", "эрозия эмали", "некариозное поражение"],
	},
	{
		code: "K03.0",
		titleRu: "Повышенное стирание зубов (патологическая стираемость)",
		keywords: ["патологическая стираемость", "повышенное стирание", "стираемость зубов"],
	},
	{
		code: "K01.1",
		titleRu: "Ретенированные и дистопированные зубы",
		keywords: [
			"ретинированный",
			"дистопированный",
			"полуретинированный",
			"восьмерка",
			"зуб мудрости",
			"перикоронит",
		],
	},
	{
		code: "K08.1",
		titleRu: "Потеря зубов (частичная адентия / дефект зубного ряда)",
		keywords: [
			"адентия",
			"частичная потеря зубов",
			"дефект зубного ряда",
			"удаленный зуб",
			"имплантация",
			"протезирование",
		],
	},
];

export function extractDiagnoses(text: string, primaryTooth?: number): ParsedDiagnosis[] {
	const results: ParsedDiagnosis[] = [];
	const lower = text.toLowerCase();

	// 1. Explicit ICD-10 code extraction: "K02.1", "К04.0" (handling Cyrillic K)
	const codeRegex = /\b[KКkк](\d{2})(?:\.(\d{1,2}))?\b/g;
	for (const match of text.matchAll(codeRegex)) {
		const rubric = match[1];
		const subcode = match[2];
		if (!rubric) continue;
		const fullCode = subcode ? `K${rubric}.${subcode}` : `K${rubric}`;

		const validation = Icd10ClinicalValidator.validate(
			fullCode,
			primaryTooth !== undefined ? String(primaryTooth) : undefined,
		);

		if (validation.isValid) {
			results.push({
				code: validation.normalizedCode,
				titleRu: validation.categoryTitle,
				...(primaryTooth !== undefined ? { toothNumber: primaryTooth } : {}),
				confidence: 1.0,
				rawTerm: match[0],
			});
		}
	}

	// 2. Keyword heuristic matching
	for (const rule of DENTAL_DIAGNOSIS_RULES) {
		for (const kw of rule.keywords) {
			if (lower.includes(kw)) {
				// Avoid duplicate if code already parsed
				if (!results.some((r) => r.code === rule.code)) {
					results.push({
						code: rule.code,
						titleRu: rule.titleRu,
						...(primaryTooth !== undefined ? { toothNumber: primaryTooth } : {}),
						confidence: 0.85,
						rawTerm: kw,
					});
				}
				break;
			}
		}
	}

	return results;
}

// ─── 3. ANESTHESIA EXTRACTION ─────────────────────────────────────────────

export function extractAnesthesia(text: string): ParsedAnesthesia | undefined {
	const lower = text.toLowerCase();
	if (
		!lower.includes("анестези") &&
		!lower.includes("ультракаин") &&
		!lower.includes("убистезин") &&
		!lower.includes("артикаин") &&
		!lower.includes("скандонест") &&
		!lower.includes("септанест") &&
		!lower.includes("лидокаин")
	) {
		return undefined;
	}

	let drug = "Артикаин 1:100 000";
	if (lower.includes("ультракаин д-с форте") || lower.includes("ультракаин форте")) {
		drug = "Ультракаин Д-С Форте (Артикаин 1:100 000)";
	} else if (lower.includes("ультракаин")) {
		drug = "Ультракаин Д-С (Артикаин 1:200 000)";
	} else if (lower.includes("убистезин форте")) {
		drug = "Убистезин Форте 1:100 000";
	} else if (lower.includes("убистезин")) {
		drug = "Убистезин 1:200 000";
	} else if (lower.includes("скандонест") || lower.includes("мепивакаин")) {
		drug = "Скандонест 3% (Мепивакаин без вазоконстриктора)";
	} else if (lower.includes("септанест")) {
		drug = "Септанест 1:100 000";
	} else if (lower.includes("лидокаин")) {
		drug = "Лидокаин 2%";
	}

	let technique = "инфильтрационная";
	if (lower.includes("проводников") || lower.includes("мандибулярн") || lower.includes("торусальн")) {
		technique = "проводниковая (мандибулярная/торусальная)";
	} else if (lower.includes("интралигаментарн")) {
		technique = "интралигаментарная";
	} else if (lower.includes("аппликационн")) {
		technique = "аппликационная";
	}

	// Volume / carpules
	let volumeMl = 1.7;
	let carpules = 1;

	const carpuleMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:карпул[аые]?|карп)/);
	if (carpuleMatch && carpuleMatch[1]) {
		carpules = Number.parseFloat(carpuleMatch[1].replace(",", "."));
		volumeMl = Number.parseFloat((carpules * 1.7).toFixed(1));
	} else {
		const mlMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:мл|ml)/);
		if (mlMatch && mlMatch[1]) {
			volumeMl = Number.parseFloat(mlMatch[1].replace(",", "."));
			carpules = Math.max(1, Math.round(volumeMl / 1.7));
		}
	}

	return {
		drug,
		technique,
		volumeMl,
		carpules,
		rawText: `${technique} анестезия препаратом ${drug}, объем ${volumeMl} мл (${carpules} карп.)`,
	};
}

// ─── 4. MATERIALS & INSTRUMENTS EXTRACTION ────────────────────────────────

const CLINICAL_MATERIAL_PATTERNS: { name: string; regex: RegExp }[] = [
	{ name: "Коффердам / Изоляция", regex: /(коффердам|раббердам|optradam|optragate|оптрагейт)/i },
	{ name: "Filtek Ultimate (3M ESPE)", regex: /(filtek|филтек|z250)/i },
	{ name: "Estelite Asteria (Tokuyama)", regex: /(estelite|эстелайт|asteria|астерия)/i },
	{ name: "Gradia Direct (GC)", regex: /(gradia|градия)/i },
	{ name: "SDR Flow+ (Dentsply)", regex: /(sdr|сдр)/i },
	{ name: "Адгезивная система (Single Bond Universal)", regex: /(адгезив|бонд|single bond|universal bond)/i },
	{ name: "Гипохлорит натрия 3% (NaClO)", regex: /(гипохлорит|naclo)/i },
	{ name: "ЭДТА 17% (EDTA)", regex: /(эдта|edta|эндожи)/i },
	{ name: "Хлоргексидин 2%", regex: /(хлоргексидин)/i },
	{ name: "Гидроксид кальция (Calasept)", regex: /(каласепт|calasept|метапекс|metapex|гидроксид кальция)/i },
	{ name: "Эндодонтический силер (AH Plus / CeraSeal)", regex: /(ah plus|аш плюс|ceraseal|bioroot|силер)/i },
	{ name: "Гуттаперча (вертикальная/латеральная конденсация)", regex: /(гуттаперч|gutta)/i },
	{ name: "MTA / ProRoot / Биодентин", regex: /(mta|мта|proroot|biodentine|биодентин)/i },
	{ name: "Стеклоиономерный цемент (Vitremer / Fuji IX)", regex: /(vitremer|витремер|fuji|фуджи|сиц)/i },
	{ name: "Дентальный имплантат Osstem / Straumann", regex: /(osstem|осстем|straumann|штрауман|nobel|dentium|megagen)/i },
	{ name: "Коллагеновая губка (Альвостаз / Neocones)", regex: /(альвостаз|гемостатическая губка|губка|alvostas)/i },
	{ name: "Шовный материал (Vicryl / Monocryl 4-0/5-0)", regex: /(викрил|vicryl|монокрил|шов|швы|пга|полиамид)/i },
	{ name: "А-силиконовый оттискной материал (Honigum / Elite HD)", regex: /(а-силикон|силикон|honigum|слепок|оттиск)/i },
];

export function extractMaterials(text: string): string[] {
	const found = new Set<string>();
	for (const pattern of CLINICAL_MATERIAL_PATTERNS) {
		if (pattern.regex.test(text)) {
			found.add(pattern.name);
		}
	}
	return Array.from(found);
}

// ─── 5. CLINICAL OBSERVATIONS & FINDINGS ──────────────────────────────────

export function extractClinicalFindings(
	text: string,
): ParsedClinicalEntities["clinicalFindings"] {
	const lower = text.toLowerCase();

	let percussion: "positive" | "negative" | "slightly_positive" | undefined;
	if (lower.includes("перкуссия резко болезненн") || lower.includes("перкуссия болезненн") || lower.includes("перкуссия (+)")) {
		percussion = "positive";
	} else if (lower.includes("перкуссия слабо") || lower.includes("перкуссия чувствительн") || lower.includes("перкуссия (±)")) {
		percussion = "slightly_positive";
	} else if (lower.includes("перкуссия безболезненн") || lower.includes("перкуссия отрицательн") || lower.includes("перкуссия (-)")) {
		percussion = "negative";
	}

	let coldTest: "positive" | "negative" | "lingering" | undefined;
	if (lower.includes("длительная боль от холодного") || lower.includes("холодовая проба длительн")) {
		coldTest = "lingering";
	} else if (lower.includes("холодовая проба (+)") || lower.includes("реакция на холод") || lower.includes("боль от температурных")) {
		coldTest = "positive";
	} else if (lower.includes("холодовая проба (-)") || lower.includes("на холод не реагирует")) {
		coldTest = "negative";
	}

	let probingDepthMm: number | undefined;
	const depthMatch = lower.match(/(?:глубина кармана|зонд|карман)\s*(\d+(?:[.,]\d+)?)\s*мм/);
	if (depthMatch && depthMatch[1]) {
		probingDepthMm = Number.parseFloat(depthMatch[1].replace(",", "."));
	}

	return {
		...(percussion !== undefined ? { percussion } : {}),
		...(coldTest !== undefined ? { coldTest } : {}),
		...(probingDepthMm !== undefined ? { probingDepthMm } : {}),
	};
}

// ─── 6. MASTER PARSER ─────────────────────────────────────────────────────

/**
 * Parses raw doctor voice transcript into fully structured clinical entities.
 */
export function parseDoctorVoiceDictation(transcript: string): ParsedClinicalEntities {
	const text = transcript.trim();
	const teeth = extractFdiTeeth(text);
	const primaryTooth = teeth.length > 0 ? teeth[0] : undefined;

	const diagnoses = extractDiagnoses(text, primaryTooth);
	const anesthesia = extractAnesthesia(text);
	const materials = extractMaterials(text);
	const findings = extractClinicalFindings(text);

	// Recommendations extraction
	const recommendations: string[] = [];
	if (/щадящая диета|не есть 2 часа/i.test(text)) {
		recommendations.push("Щадящая диета 2 часа, избегать приема твердой и красящей пищи");
	}
	if (/нпвп|нимесил|кеторол|при болях/i.test(text)) {
		recommendations.push("При возникновении болевых ощущений — НПВП (Нимесулид 100 мг / Ибупрофен 400 мг)");
	}
	if (/антибиоти|амоксиклав|цифран/i.test(text)) {
		recommendations.push("Антибиотикотерапия по назначенной схеме (Амоксиклав 1000 мг 2 р/день 5-7 дней)");
	}
	if (/гигиен|чистк|ирригатор|ершик/i.test(text)) {
		recommendations.push("Соблюдение индивидуальной гигиены полости рта, использование монопучковой щетки и ершиков");
	}
	if (recommendations.length === 0) {
		recommendations.push("Стандартные послеоперационные рекомендации, наблюдение");
	}

	return {
		teeth,
		diagnoses,
		...(anesthesia !== undefined ? { anesthesia } : {}),
		materials,
		procedures: [],
		clinicalFindings: findings,
		recommendations,
	};
}

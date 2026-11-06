/**
 * @file packages/shared/src/ai/dentalSpeechPostProcessor.ts
 * @description Phonetic and lexical normalizer for dental speech recognition (STT).
 * Ports and enhances stomchat/dental_vocab phonetic normalization matrix.
 * Corrects typical acoustic and ASR speech-to-text distortions into canonical dental terminology.
 */

export interface DentalSpeechReplacementItem {
	readonly original: string;
	readonly replaced: string;
	readonly label: string;
	readonly index?: number | undefined;
}

export interface DentalSpeechPostProcessResult {
	readonly text: string;
	readonly changed: boolean;
	readonly replacements: readonly DentalSpeechReplacementItem[];
}

export interface DentalSpeechTermRule {
	readonly pattern: RegExp;
	readonly canonical: string;
	readonly label: string;
	/**
	 * When true, canonical term preserves brand capitalization regardless of input casing (e.g. BOPT, Biodentine).
	 * If false, capitalizes first letter if input started with capital.
	 */
	readonly fixedBrandCase?: boolean;
}

/**
 * Helper to construct case-insensitive word boundary RegExp supporting Cyrillic and Latin.
 */
function createWordBoundaryPattern(phrase: string): RegExp {
	const escaped = phrase
		.trim()
		.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
		.replace(/\s+/g, "\\s+");
	return new RegExp(`(?<![0-9A-Za-zА-Яа-яЁё])${escaped}(?![0-9A-Za-zА-Яа-яЁё])`, "gi");
}

/**
 * Matches input casing for Russian dental terms.
 */
function matchCasing(sample: string, target: string, fixedBrandCase = false): string {
	if (fixedBrandCase) return target;
	if (!sample || !target) return target;

	// ALL CAPS
	if (sample === sample.toUpperCase() && sample !== sample.toLowerCase()) {
		return target.toUpperCase();
	}
	// Title Case (Starts with capital)
	const firstChar = sample.charAt(0);
	if (firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase()) {
		return target.charAt(0).toUpperCase() + target.slice(1);
	}
	// Lowercase
	return target.toLowerCase();
}

/**
 * Master dental speech correction dictionary.
 * Sourced directly from research/external_ai_sources/stomchat/07_VOICE_PIPELINE_AND_SPEECH_RECOGNITION.md
 * and dentalStylesAndPhonetics.ts.
 */
export const DENTAL_SPEECH_CORRECTION_RULES: readonly DentalSpeechTermRule[] = [
	// 1. Изоляция и коффердам
	{
		pattern: createWordBoundaryPattern("кофердам"),
		canonical: "коффердам",
		label: "кофердам -> коффердам",
	},
	{
		pattern: createWordBoundaryPattern("кофедам"),
		canonical: "коффердам",
		label: "кофедам -> коффердам",
	},
	{
		pattern: createWordBoundaryPattern("кофирдам"),
		canonical: "коффердам",
		label: "кофирдам -> коффердам",
	},
	{
		pattern: createWordBoundaryPattern("кофер"),
		canonical: "коффердам",
		label: "кофер -> коффердам",
	},
	{
		pattern: createWordBoundaryPattern("раббер дам"),
		canonical: "раббердам",
		label: "раббер дам -> раббердам",
	},

	// 2. Ортопедия и препарирование
	{
		pattern: createWordBoundaryPattern("верти преп"),
		canonical: "вертипреп / Vertiprep",
		label: "верти преп -> вертипреп / Vertiprep",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("вертипреп"),
		canonical: "вертипреп / Vertiprep",
		label: "вертипреп -> вертипреп / Vertiprep",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("вертикал"),
		canonical: "вертипреп / Vertiprep",
		label: "вертикал -> вертипреп / Vertiprep",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("бопт"),
		canonical: "BOPT",
		label: "бопт -> BOPT",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("борт"),
		canonical: "BOPT",
		label: "борт -> BOPT",
		fixedBrandCase: true,
	},

	// 3. Эндодонтические инструменты и моторы
	{
		pattern: createWordBoundaryPattern("ресипрок"),
		canonical: "Reciproc Blue",
		label: "ресипрок -> Reciproc Blue",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("реси прок"),
		canonical: "Reciproc Blue",
		label: "реси прок -> Reciproc Blue",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("реципрок"),
		canonical: "Reciproc Blue",
		label: "реципрок -> Reciproc Blue",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("реци прок"),
		canonical: "Reciproc Blue",
		label: "реци прок -> Reciproc Blue",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("протейпер"),
		canonical: "ProTaper",
		label: "протейпер -> ProTaper",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("про тейпер"),
		canonical: "ProTaper",
		label: "про тейпер -> ProTaper",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("апекс локатор"),
		canonical: "апекслокатор",
		label: "апекс локатор -> апекслокатор",
	},
	{
		pattern: createWordBoundaryPattern("плагер"),
		canonical: "плаггер",
		label: "плагер -> плаггер",
	},
	{
		pattern: createWordBoundaryPattern("плаггер машту"),
		canonical: "плаггер Машту",
		label: "плаггер машту -> плаггер Машту",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("плагер машту"),
		canonical: "плаггер Машту",
		label: "плагер машту -> плаггер Машту",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("плаггер бьюкенена"),
		canonical: "плаггер Бьюкенена",
		label: "плаггер бьюкенена -> плаггер Бьюкенена",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("плагер бьюкенена"),
		canonical: "плаггер Бьюкенена",
		label: "плагер бьюкенена -> плаггер Бьюкенена",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("эндо чак"),
		canonical: "эндочак",
		label: "эндо чак -> эндочак",
	},

	// 4. Биоматериалы и силикатные цементы
	{
		pattern: createWordBoundaryPattern("било дентин"),
		canonical: "Biodentine",
		label: "било дентин -> Biodentine",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("билодентин"),
		canonical: "Biodentine",
		label: "билодентин -> Biodentine",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("биодентин"),
		canonical: "Biodentine",
		label: "биодентин -> Biodentine",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("бидентин"),
		canonical: "Biodentine",
		label: "бидентин -> Biodentine",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("био силер"),
		canonical: "Bio-C Sealer",
		label: "био силер -> Bio-C Sealer",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("биосилер"),
		canonical: "Bio-C Sealer",
		label: "биосилер -> Bio-C Sealer",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("бисилер"),
		canonical: "Bio-C Sealer",
		label: "бисилер -> Bio-C Sealer",
		fixedBrandCase: true,
	},

	// 5. Композиты и полировка
	{
		pattern: createWordBoundaryPattern("эстилайт"),
		canonical: "Estelite Asteria",
		label: "эстилайт -> Estelite Asteria",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("астелайт"),
		canonical: "Estelite Asteria",
		label: "астелайт -> Estelite Asteria",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("эстелайт"),
		canonical: "Estelite Asteria",
		label: "эстелайт -> Estelite Asteria",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("оклюбраш"),
		canonical: "Occlubrush",
		label: "оклюбраш -> Occlubrush",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("фильтек"),
		canonical: "Filtek Ultimate",
		label: "фильтек -> Filtek Ultimate",
		fixedBrandCase: true,
	},

	// 6. Ирригационные растворы и химия
	{
		pattern: createWordBoundaryPattern("гипохлорид натрия"),
		canonical: "гипохлорит натрия (NaOCl)",
		label: "гипохлорид натрия -> гипохлорит натрия (NaOCl)",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("гипохлоридом натрия"),
		canonical: "гипохлоритом натрия (NaOCl)",
		label: "гипохлоридом натрия -> гипохлоритом натрия (NaOCl)",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("гипохлорид"),
		canonical: "гипохлорит натрия (NaOCl)",
		label: "гипохлорид -> гипохлорит натрия (NaOCl)",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("гипохлоридом"),
		canonical: "гипохлоритом натрия (NaOCl)",
		label: "гипохлоридом -> гипохлоритом натрия (NaOCl)",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("гипохлорида"),
		canonical: "гипохлорита натрия (NaOCl)",
		label: "гипохлорида -> гипохлорита натрия (NaOCl)",
		fixedBrandCase: true,
	},

	// 7. Адгезивы, цементы и ультразвук
	{
		pattern: createWordBoundaryPattern("паракер"),
		canonical: "ParaCore",
		label: "паракер -> ParaCore",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("паракёр"),
		canonical: "ParaCore",
		label: "паракёр -> ParaCore",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("паракор"),
		canonical: "ParaCore",
		label: "паракор -> ParaCore",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("оптибонд"),
		canonical: "OptiBond FL",
		label: "оптибонд -> OptiBond FL",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("иррисайф"),
		canonical: "IrriSafe",
		label: "иррисайф -> IrriSafe",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("иррисаф"),
		canonical: "IrriSafe",
		label: "иррисаф -> IrriSafe",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("эйтис"),
		canonical: "Eighteeth",
		label: "эйтис -> Eighteeth",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("е макс"),
		canonical: "E.max",
		label: "е макс -> E.max",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("и макс"),
		canonical: "E.max",
		label: "и макс -> E.max",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("emax"),
		canonical: "E.max",
		label: "emax -> E.max",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("эйр флоу"),
		canonical: "Air Flow",
		label: "эйр флоу -> Air Flow",
		fixedBrandCase: true,
	},
	{
		pattern: createWordBoundaryPattern("айр флоу"),
		canonical: "Air Flow",
		label: "айр флоу -> Air Flow",
		fixedBrandCase: true,
	},
];

/**
 * Normalizes and corrects phonetic distortions and typos in dental speech transcripts.
 *
 * @param rawText Raw transcript from speech-to-text model (Whisper, Gemini Live, etc.)
 * @returns Cleaned transcript with tracked replacement log.
 */
export function postProcessDentalSpeech(rawText: string | null | undefined): DentalSpeechPostProcessResult {
	if (!rawText || typeof rawText !== "string") {
		return {
			text: "",
			changed: false,
			replacements: [],
		};
	}

	const trimmed = rawText.trim();
	if (!trimmed) {
		return {
			text: "",
			changed: false,
			replacements: [],
		};
	}

	let currentText = rawText;
	const replacements: DentalSpeechReplacementItem[] = [];

	for (const rule of DENTAL_SPEECH_CORRECTION_RULES) {
		rule.pattern.lastIndex = 0;
		if (rule.pattern.test(currentText)) {
			rule.pattern.lastIndex = 0;
			currentText = currentText.replace(rule.pattern, (match, offset) => {
				const replaced = matchCasing(match, rule.canonical, rule.fixedBrandCase);
				replacements.push({
					original: match,
					replaced,
					label: rule.label,
					...(typeof offset === "number" ? { index: offset } : {}),
				});
				return replaced;
			});
		}
	}

	// Normalization of whitespace around common punctuation while protecting decimals, ICD-10 and tech terms
	const cleanedText = currentText
		.replace(/[ \t]{2,}/g, " ")
		.replace(/\s+([,;:!?])/g, "$1")
		.replace(/([,;:!?])(?=[А-Яа-яA-Za-z0-9])/g, "$1 ")
		// Sentence boundary period: only insert space if followed by uppercase letter and not in initials
		.replace(/(?<=[а-яёa-z0-9]{2,})\.(?=[А-ЯЁA-Z])/g, ". ")
		// Repair any accidental splits in ICD-10 (K04.0) or decimals (0.5)
		.replace(/\b([A-Za-zА-Яа-я]\d{2})\.\s+(\d)\b/g, "$1.$2")
		.replace(/\b(\d+)\.\s+(\d+)\b/g, "$1.$2")
		.replace(/\bWhisper\.\s+cpp\b/gi, "Whisper.cpp")
		.replace(/\bE\.\s+max\b/gi, "E.max");

	return {
		text: cleanedText,
		changed: replacements.length > 0 || cleanedText !== rawText,
		replacements,
	};
}

/**
 * Simple string wrapper for direct inline pipeline usage.
 */
export function correctPhoneticDentalTerms(text: string): string {
	return postProcessDentalSpeech(text).text;
}

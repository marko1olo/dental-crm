/**
 * packages/shared/src/clinical/dentalFormulaTextParser.ts
 *
 * DENTE Dental CRM — Rapid End-to-End Dental Formula Shorthand Parser SSOT.
 *
 * Parses clinical shorthand strings commonly entered by Russian dentists and dental nurses:
 * Examples:
 * - "16к 25п 36о" -> 16: Caries, 25: Filled, 36: Missing
 * - "47пт 14кр 26и 11зд" -> 47: Pulpitis, 14: Crown, 26: Implant, 11: Healthy
 * - "36-0 46-к 24-п" -> 36: Missing, 46: Caries, 24: Filled
 * - "13-23зд 33-43гигиена" -> Range 13..23 Healthy, 33..43 Hygiene
 * - "18, 28, 38, 48 о" -> Wisdom teeth Missing
 *
 * Invariants:
 * - Preserves FDI numbering (11..48, 51..85).
 * - Maps to CanonicalToothState and ToothState SSOT.
 * - Zero cartoon emojis (Mandate 8d).
 */

import {
	ALL_FDI_TEETH,
	isValidFdiToothNumber,
	UPPER_ARCH_SEQUENCE,
	LOWER_ARCH_SEQUENCE,
} from "./dentalFormulaFdi.js";
import {
	type CanonicalToothState,
	normalizeToothState,
	CANONICAL_STAMP_MATRIX,
} from "./dentalFormulaStates.js";
import {
	type CanonicalSurfaceKey,
	normalizeCanonicalSurfaces,
} from "./dentalFormulaSurfaces.js";

export interface ParsedToothItem {
	readonly toothNumber: number;
	readonly state: CanonicalToothState;
	readonly surfaces?: readonly string[] | undefined;
	readonly rawToken: string;
}

export interface ParseFormulaShorthandResult {
	readonly items: readonly ParsedToothItem[];
	readonly unrecognized: readonly string[];
	readonly summaryRu: string;
	readonly hasMatches: boolean;
}

/**
 * Common Russian dental shorthand suffixes and prefixes.
 * Order matters: multi-character codes ("пт", "кр", "кп", "зд", "рет") checked before single letter ("п", "к", "р").
 */
const SHORTHAND_PREFIX_SUFFIX_MAP: ReadonlyArray<{
	readonly pattern: RegExp;
	readonly state: CanonicalToothState;
}> = [
	// 2+ character abbreviations (higher precedence)
	{ pattern: /^(пт|pt|пульп(ит)?)$/i, state: "Pulpitis" },
	{ pattern: /^(перио(донтит)?|паро(донтит)?)$/i, state: "Periodontitis" },
	{ pattern: /^(кр|cr|коронк[аи]|кп|pk)$/i, state: "Crown" },
	{ pattern: /^(зд|здоров[аоы]?|норм[аы]?|санирован[оа]?)$/i, state: "Healthy" },
	{ pattern: /^(имп|ип|imp|имплант(ат)?)$/i, state: "Implant" },
	{ pattern: /^(рет|ret|ретинирован(ный)?)$/i, state: "Retained" },
	{ pattern: /^(кор|кор[ень]?|root|дефект)$/i, state: "Root" },
	{ pattern: /^(гиг|гигиена|кам[ень]?|км|налет)$/i, state: "Healthy" },

	// 1-character abbreviations
	{ pattern: /^(к|c|кар(иес)?)$/i, state: "Caries" },
	{ pattern: /^(п|pl|f|пломб[аы]|рест)$/i, state: "Filled" },
	{ pattern: /^(о|o|0|уд|удал(ен)?|отс(ут)?)$/i, state: "Missing" },
	{ pattern: /^(и|i)$/i, state: "Implant" },
	{ pattern: /^(р|r)$/i, state: "Root" },
	{ pattern: /^(h)$/i, state: "Healthy" },
];

/**
 * Macro anatomical tooth group mappings for batch shorthand dictation and quick text.
 */
const MACRO_ANATOMICAL_GROUPS: ReadonlyArray<{
	readonly pattern: RegExp;
	readonly getTeeth: () => readonly number[];
}> = [
	{
		pattern: /^(все|вся|челюсти|формула|полость)$/i,
		getTeeth: () => ALL_FDI_TEETH.filter((t) => t < 50),
	},
	{
		pattern: /^(верх|верхняя|верхней|максилла|вч)$/i,
		getTeeth: () => UPPER_ARCH_SEQUENCE,
	},
	{
		pattern: /^(низ|нижняя|нижней|мандибула|нч)$/i,
		getTeeth: () => LOWER_ARCH_SEQUENCE,
	},
	{
		pattern: /^(фронт|фронтальный|фронтальная|фронта)$/i,
		getTeeth: () => FRONTAL_HYGIENE_SECTOR_ADULT,
	},
	{
		pattern: /^(восьмерки|8ки|8-ки|мудрости)$/i,
		getTeeth: () => [18, 28, 38, 48],
	},
];

function resolveMacroGroup(token: string): readonly number[] | null {
	const clean = token.trim().toLowerCase().replace(/ё/g, "е");
	for (const group of MACRO_ANATOMICAL_GROUPS) {
		if (group.pattern.test(clean)) {
			return group.getTeeth();
		}
	}
	return null;
}

/**
 * Resolves code suffix to CanonicalToothState.
 */
function resolveCodePart(code: string): CanonicalToothState | null {
	const clean = code.trim().toLowerCase().replace(/ё/g, "е");
	for (const entry of SHORTHAND_PREFIX_SUFFIX_MAP) {
		if (entry.pattern.test(clean)) {
			return entry.state;
		}
	}
	// Fallback to canonical normalizer
	const norm = normalizeToothState(clean);
	if (norm !== "Healthy" || clean === "healthy" || clean === "зд" || clean === "норма" || clean === "здоров") {
		return norm;
	}
	return null;
}

/**
 * Checks if a standalone token specifies exclusively tooth surface(s), e.g. "МОД", "ДО", "оккл", "вестиб".
 */
function isSurfaceOnlyToken(token: string): CanonicalSurfaceKey[] | null {
	const clean = token.trim().toLowerCase().replace(/ё/g, "е");
	if (!clean) return null;
	// Exclude single-letter status codes to avoid ambiguity ('о' = Missing, 'к' = Caries, 'п' = Filled)
	if (/^(о|к|п|и|р|h|c|0)$/.test(clean)) {
		return null;
	}
	const surfaces = normalizeCanonicalSurfaces(clean);
	return surfaces.length > 0 ? surfaces : null;
}

/**
 * Extracts surface qualifiers and clinical state from combined string (e.g. "модк" -> { state: "Caries", surfaces: ["M","O","D"] }).
 */
function extractSurfacesAndState(rawCode: string): { state: CanonicalToothState; surfaces?: readonly CanonicalSurfaceKey[] } | null {
	const directState = resolveCodePart(rawCode);
	if (directState) {
		return { state: directState };
	}
	for (let len = 1; len < rawCode.length; len++) {
		const potentialSurfacesPart = rawCode.slice(0, -len);
		const potentialStatePart = rawCode.slice(-len);
		const resolvedState = resolveCodePart(potentialStatePart);
		if (resolvedState) {
			const surfaces = normalizeCanonicalSurfaces(potentialSurfacesPart);
			if (surfaces.length > 0) {
				return { state: resolvedState, surfaces };
			}
		}
	}
	return null;
}

/**
 * Resolves a range of teeth between two FDI tooth numbers on the same arch.
 * E.g. (13, 23) -> [13, 12, 11, 21, 22, 23]
 * E.g. (43, 33) or (33, 43) -> [43, 42, 41, 31, 32, 33]
 */
export function resolveTeethRange(start: number, end: number): number[] {
	if (!isValidFdiToothNumber(start) || !isValidFdiToothNumber(end)) {
		return [];
	}
	if (start === end) return [start];

	const isUpper = (num: number) => num < 30 || (num >= 50 && num < 70);
	const startUpper = isUpper(start);
	const endUpper = isUpper(end);

	if (startUpper !== endUpper) {
		// Cross-arch range: return single endpoints
		return [start, end];
	}

	const sequence: readonly number[] = startUpper ? UPPER_ARCH_SEQUENCE : LOWER_ARCH_SEQUENCE;
	const idxStart = sequence.indexOf(start);
	const idxEnd = sequence.indexOf(end);

	if (idxStart === -1 || idxEnd === -1) {
		return [start, end];
	}

	const minIdx = Math.min(idxStart, idxEnd);
	const maxIdx = Math.max(idxStart, idxEnd);
	return sequence.slice(minIdx, maxIdx + 1) as number[];
}

/**
 * Parses a single token that combines tooth number and status.
 * Examples:
 * - "16к" -> tooth 16, Caries
 * - "25п" -> tooth 25, Filled
 * - "36-0" -> tooth 36, Missing
 * - "47пт" -> tooth 47, Pulpitis
 * - "14кр" -> tooth 14, Crown
 * - "26и" -> tooth 26, Implant
 * - "11зд" -> tooth 11, Healthy
 * - "13-23зд" -> range 13..23, Healthy
 * - "16модк" -> tooth 16, Caries with surfaces [M, O, D]
 */
function parseSingleToken(token: string): ParsedToothItem[] | null {
	const trimmed = token.trim();
	if (!trimmed) return null;

	// Check for range pattern: e.g. "13-23зд" or "13..23к" or "33-43гигиена"
	const rangeMatch = trimmed.match(/^(\d{2})[-.]{1,2}(\d{2})[-:\s]*([a-zа-яё0-9]+)$/i);
	if (rangeMatch) {
		const startTooth = Number.parseInt(rangeMatch[1] ?? "", 10);
		const endTooth = Number.parseInt(rangeMatch[2] ?? "", 10);
		const codePart = (rangeMatch[3] ?? "").toLowerCase();

		const teeth = resolveTeethRange(startTooth, endTooth);
		if (teeth.length > 0) {
			const extracted = extractSurfacesAndState(codePart);
			if (extracted) {
				return teeth.map((toothNumber) => ({
					toothNumber,
					state: extracted.state,
					surfaces: extracted.surfaces,
					rawToken: trimmed,
				}));
			}
		}
	}

	// Check for single tooth + code: e.g. "16к", "16-к", "16:к", "16_к", "16=к", "16 0", "36-0", "16модк"
	const singleMatch = trimmed.match(/^(\d{2})[-:=_\s]*([a-zа-яё0-9]+)$/i);
	if (singleMatch) {
		const toothNumber = Number.parseInt(singleMatch[1] ?? "", 10);
		const codePart = (singleMatch[2] ?? "").toLowerCase();

		if (isValidFdiToothNumber(toothNumber)) {
			const extracted = extractSurfacesAndState(codePart);
			if (extracted) {
				return [
					{
						toothNumber,
						state: extracted.state,
						surfaces: extracted.surfaces,
						rawToken: trimmed,
					},
				];
			}
		}
	}

	// Check inverted pattern: e.g. "к16", "п25", "0-36"
	const invertedMatch = trimmed.match(/^([a-zа-яё]+)[-:=_\s]*(\d{2})$/i);
	if (invertedMatch) {
		const codePart = (invertedMatch[1] ?? "").toLowerCase();
		const toothNumber = Number.parseInt(invertedMatch[2] ?? "", 10);

		if (isValidFdiToothNumber(toothNumber)) {
			const extracted = extractSurfacesAndState(codePart);
			if (extracted) {
				return [
					{
						toothNumber,
						state: extracted.state,
						surfaces: extracted.surfaces,
						rawToken: trimmed,
					},
				];
			}
		}
	}

	return null;
}

/**
 * Filter words commonly spoken or typed before tooth numbers.
 */
function isFillerWord(token: string): boolean {
	const clean = token.toLowerCase().replace(/[^a-zа-яё]/g, "");
	return clean === "зуб" || clean === "зубы" || clean === "зуба" || clean === "пациента";
}

/**
 * Fast End-to-End Shorthand Dental Formula Parser.
 *
 * Accepts freeform string containing one or multiple tooth-status pairs separated by spaces,
 * commas, semicolons, tabs or newlines.
 *
 * Examples of valid input:
 * - "16к 25п 36о"
 * - "16к, 25п, 36-0, 47пт"
 * - "13-23зд 33-43гигиена"
 * - "18, 28, 38, 48 о"
 * - "16 МОД кариес, 24 ДО пломба"
 * - "зуб 16 кариес, 25 пломба, 36 отсутствует"
 * - "кариес 16, 26, 36"
 */
export function parseDentalFormulaShorthand(input: string): ParseFormulaShorthandResult {
	if (!input || typeof input !== "string") {
		return {
			items: [],
			unrecognized: [],
			summaryRu: "Пустой ввод",
			hasMatches: false,
		};
	}

	const normalizedInput = input
		.replace(/[\n\r\t,;]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();

	if (!normalizedInput) {
		return {
			items: [],
			unrecognized: [],
			summaryRu: "Пустой ввод",
			hasMatches: false,
		};
	}

	const tokens = normalizedInput.split(" ").filter(Boolean);
	const itemsMap = new Map<number, ParsedToothItem>();
	const unrecognized: string[] = [];

	let pendingTeeth: number[] = [];
	let pendingSurfaces: CanonicalSurfaceKey[] = [];
	let prefixState: CanonicalToothState | null = null;

	const flushPendingTeeth = (state: CanonicalToothState, surfaces?: readonly CanonicalSurfaceKey[]) => {
		for (const t of pendingTeeth) {
			itemsMap.set(t, {
				toothNumber: t,
				state,
				surfaces: surfaces && surfaces.length > 0 ? surfaces : undefined,
				rawToken: String(t),
			});
		}
		pendingTeeth = [];
		pendingSurfaces = [];
	};

	let i = 0;
	while (i < tokens.length) {
		const current = tokens[i]!;

		// 1. Skip clinical filler words ("зуб", "зубы")
		if (isFillerWord(current)) {
			i++;
			continue;
		}

		// 2. Try single token with attached code or range: e.g. "16к", "36-0", "13-23зд", "16модк"
		const singleResult = parseSingleToken(current);
		if (singleResult && singleResult.length > 0) {
			if (pendingTeeth.length > 0) {
				unrecognized.push(...pendingTeeth.map(String));
				pendingTeeth = [];
				pendingSurfaces = [];
			}
			prefixState = null;
			for (const item of singleResult) {
				itemsMap.set(item.toothNumber, item);
			}
			i++;
			continue;
		}

		// 2.5. Check for macro group token (e.g. "верх", "низ", "фронт", "все", "восьмерки")
		const macroTeeth = resolveMacroGroup(current);
		if (macroTeeth && macroTeeth.length > 0) {
			if (prefixState) {
				for (const tNum of macroTeeth) {
					itemsMap.set(tNum, {
						toothNumber: tNum,
						state: prefixState,
						surfaces: pendingSurfaces.length > 0 ? pendingSurfaces : undefined,
						rawToken: current,
					});
				}
			} else {
				pendingTeeth.push(...macroTeeth);
			}
			i++;
			continue;
		}

		// 3. Check for standalone 2-digit tooth number
		if (/^\d{2}$/.test(current)) {
			const tNum = Number.parseInt(current, 10);
			if (isValidFdiToothNumber(tNum)) {
				if (prefixState) {
					itemsMap.set(tNum, {
						toothNumber: tNum,
						state: prefixState,
						surfaces: pendingSurfaces.length > 0 ? pendingSurfaces : undefined,
						rawToken: current,
					});
				} else {
					pendingTeeth.push(tNum);
				}
				i++;
				continue;
			}
			// Non-FDI 2-digit number (e.g. 99, 19, 20) -> strictly unrecognized
			unrecognized.push(current);
			i++;
			continue;
		}

		// 4. Check for surface-only token (e.g. "МОД", "ДО", "оккл", "вестиб")
		const surfaces = isSurfaceOnlyToken(current);
		if (surfaces && (pendingTeeth.length > 0 || prefixState)) {
			pendingSurfaces.push(...surfaces);
			i++;
			continue;
		}

		// 5. Check for standalone status code or word (e.g. "кариес", "п", "о", "пульпит", "зд")
		const resolvedState = resolveCodePart(current);
		if (resolvedState) {
			if (pendingTeeth.length > 0) {
				flushPendingTeeth(resolvedState, pendingSurfaces.length > 0 ? Array.from(new Set(pendingSurfaces)) : undefined);
				prefixState = null;
			} else {
				// Prefix status for subsequent teeth (e.g. "кариес 16, 26, 36")
				prefixState = resolvedState;
			}
			i++;
			continue;
		}

		// 6. Try 2-token pair fallback (e.g. "16" "к" or "36" "0")
		if (i + 1 < tokens.length) {
			const next = tokens[i + 1]!;
			const combined = `${current}${next}`;
			const pairResult = parseSingleToken(combined);
			if (pairResult && pairResult.length > 0) {
				if (pendingTeeth.length > 0) {
					unrecognized.push(...pendingTeeth.map(String));
					pendingTeeth = [];
					pendingSurfaces = [];
				}
				prefixState = null;
				for (const item of pairResult) {
					itemsMap.set(item.toothNumber, item);
				}
				i += 2;
				continue;
			}
		}

		// Not parsed token
		unrecognized.push(current);
		i++;
	}

	// Solitary status fallback: if a status like "санирован", "норма", "здоров" was typed alone without teeth
	if (itemsMap.size === 0 && prefixState && unrecognized.length === 0) {
		const allAdult = [...UPPER_ARCH_SEQUENCE, ...LOWER_ARCH_SEQUENCE];
		for (const t of allAdult) {
			itemsMap.set(t, {
				toothNumber: t,
				state: prefixState,
				rawToken: normalizedInput,
			});
		}
		prefixState = null;
	}

	// Flush any leftover unassigned teeth as unrecognized
	if (pendingTeeth.length > 0) {
		unrecognized.push(...pendingTeeth.map(String));
	}

	const items = Array.from(itemsMap.values()).sort((a, b) => a.toothNumber - b.toothNumber);

	let summaryRu = "";
	if (items.length > 0) {
		const summaryParts = items.map((it) => {
			const label = CANONICAL_STAMP_MATRIX[it.state]?.nameRu ?? it.state;
			return `${it.toothNumber}: ${label}`;
		});
		summaryRu = `Распознано (${items.length}): ${summaryParts.join(", ")}`;
		if (unrecognized.length > 0) {
			summaryRu += ` (не распознано: ${unrecognized.join(" ")})`;
		}
	} else if (unrecognized.length > 0) {
		summaryRu = `Не удалось распознать формулу: ${unrecognized.join(" ")}`;
	} else {
		summaryRu = "Ничего не найдено";
	}

	return {
		items,
		unrecognized,
		summaryRu,
		hasMatches: items.length > 0,
	};
}

/**
 * Filter surgical statuses to prevent accidental overwrite by "sanitation" or "healthy" norm.
 * Surgical and irreversible prosthetic statuses: Missing, Implant, Planned_Implant, Crown, Root.
 */
export const SURGICAL_AND_PROSTHETIC_STATES = new Set<CanonicalToothState>([
	"Missing",
	"Implant",
	"Planned_Implant",
	"Crown",
	"Planned_Crown",
	"Root",
]);

export function isSurgicalOrProstheticState(state: string | null | undefined): boolean {
	const canonical = normalizeToothState(state);
	return SURGICAL_AND_PROSTHETIC_STATES.has(canonical);
}

/**
 * Safe sanitation resolver:
 * Preserves teeth with surgical / irreversible statuses (Missing, Implant, Crown, Root).
 * Sets non-surgical / pathological teeth to Healthy.
 */
export function resolveSafeSanitationTargets(
	allTeeth: readonly number[],
	existingTeethStates: ReadonlyMap<number, string | null | undefined> | Readonly<Record<number, string | null | undefined>>,
): {
	sanitizedTargets: number[];
	preservedSurgicalCount: number;
	preservedTeeth: number[];
} {
	const sanitizedTargets: number[] = [];
	const preservedTeeth: number[] = [];

	const getState = (num: number): string | null | undefined => {
		if (existingTeethStates instanceof Map) {
			return existingTeethStates.get(num);
		}
		return (existingTeethStates as Record<number, string | null | undefined>)[num];
	};

	for (const tooth of allTeeth) {
		const curState = getState(tooth);
		if (isSurgicalOrProstheticState(curState)) {
			preservedTeeth.push(tooth);
		} else {
			sanitizedTargets.push(tooth);
		}
	}

	return {
		sanitizedTargets,
		preservedSurgicalCount: preservedTeeth.length,
		preservedTeeth,
	};
}

/**
 * Frontal hygiene sector teeth constants (Adult: 13..23 and 33..43).
 */
export const FRONTAL_HYGIENE_SECTOR_ADULT = [
	13, 12, 11, 21, 22, 23,
	43, 42, 41, 31, 32, 33,
] as const;

export const FRONTAL_HYGIENE_SECTOR_PEDIATRIC = [
	53, 52, 51, 61, 62, 63,
	83, 82, 81, 71, 72, 73,
] as const;

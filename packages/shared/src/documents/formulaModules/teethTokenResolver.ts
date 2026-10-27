import type {
	ClinicalToothRowInput,
	DentalFormulaRecordInput,
	ToothStateData,
} from "./formulaTypes.js";
import { ALL_FDI_PERMANENT_TEETH, ALL_FDI_DECIDUOUS_TEETH } from "./fdiConstants.js";
import { normalizeToothStatus } from "./statusNormalizer.js";
import { extractTeethMapFromInput } from "./teethInputExtractor.js";

/**
 * Возвращает карту токенов всех зубов 11..48 (и 51..85 если есть):
 * { "18": "0", "18т": "отсутствует", "16": "C", "16т": "кариес", ... }
 */
export function resolveAllTeethTokens(
	input?:
		| Record<string | number, ToothStateData | string | Record<string, unknown>>
		| Array<ClinicalToothRowInput>
		| readonly Record<string, unknown>[]
		| DentalFormulaRecordInput
		| null
		| undefined,
): Record<string, string> {
	const map: Record<string, string> = {};
	const teethMap = extractTeethMapFromInput(input);

	for (const toothNum of ALL_FDI_PERMANENT_TEETH) {
		const toothData = teethMap.get(toothNum);
		if (toothData) {
			const norm = normalizeToothStatus(toothData.status, toothData.statusCode);
			map[String(toothNum)] = norm.code;
			map[`${toothNum}т`] = norm.label.toLowerCase();
		} else {
			map[String(toothNum)] = "H";
			map[`${toothNum}т`] = "здоровый";
		}
	}

	for (const toothNum of ALL_FDI_DECIDUOUS_TEETH) {
		const toothData = teethMap.get(toothNum);
		if (toothData) {
			const norm = normalizeToothStatus(toothData.status, toothData.statusCode);
			map[String(toothNum)] = norm.code;
			map[`${toothNum}т`] = norm.label.toLowerCase();
		}
	}

	return map;
}

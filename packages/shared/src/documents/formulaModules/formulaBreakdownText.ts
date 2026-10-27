import type {
	ClinicalToothRowInput,
	DentalFormulaRecordInput,
	ToothStateData,
} from "./formulaTypes.js";
import { ALL_FDI_PERMANENT_TEETH, ALL_FDI_DECIDUOUS_TEETH } from "./fdiConstants.js";
import { normalizeToothStatus } from "./statusNormalizer.js";
import { extractTeethMapFromInput } from "./teethInputExtractor.js";

/**
 * Генерирует читаемую текстовую расшифровку зубной формулы на русском языке:
 * Пример: «Кариес: зубы 16, 24; Пломба: зубы 36, 46; Отсутствует: зубы 18, 28, 38, 48; Интактные: остальные зубы».
 */
export function generateDentalFormulaBreakdownText(
	input?:
		| Record<string | number, ToothStateData | string | Record<string, unknown>>
		| Array<ClinicalToothRowInput>
		| readonly Record<string, unknown>[]
		| DentalFormulaRecordInput
		| null
		| undefined,
): string {
	const teethMap = extractTeethMapFromInput(input);
	if (teethMap.size === 0) {
		return "Зубные ряды интактны, кариозных поражений и патологии твердых тканей зубов не выявлено";
	}

	const groups: Record<string, number[]> = {
		caries: [],
		pulpitis: [],
		periodontitis: [],
		filled: [],
		crown: [],
		implant: [],
		missing: [],
		root: [],
		watch: [],
	};

	let totalPathologyCount = 0;

	for (const toothNum of ALL_FDI_PERMANENT_TEETH) {
		const toothData = teethMap.get(toothNum);
		if (!toothData) continue;
		const norm = normalizeToothStatus(toothData.status, toothData.statusCode);
		if (norm.category !== "sound" && groups[norm.category]) {
			groups[norm.category]?.push(toothNum);
			totalPathologyCount++;
		}
	}

	if (totalPathologyCount === 0) {
		return "Зубные ряды интактны, патологий твердых тканей зубов и пародонта не выявлено";
	}

	const categoryLabels: Record<string, string> = {
		caries: "Кариес",
		pulpitis: "Пульпит",
		periodontitis: "Периодонтит",
		filled: "Пломба",
		crown: "Коронка",
		implant: "Имплантат",
		missing: "Отсутствует",
		root: "Корень",
		watch: "Наблюдение",
	};

	const parts: string[] = [];
	const perToothList: string[] = [];

	for (const toothNum of [...ALL_FDI_PERMANENT_TEETH, ...ALL_FDI_DECIDUOUS_TEETH]) {
		const toothData = teethMap.get(toothNum);
		if (!toothData) continue;
		const norm = normalizeToothStatus(toothData.status, toothData.statusCode);
		if (norm.category !== "sound") {
			perToothList.push(`${toothNum}: ${norm.label.toLowerCase()}`);
		}
	}

	for (const [catKey, teeth] of Object.entries(groups)) {
		if (teeth.length > 0) {
			const label = categoryLabels[catKey] ?? catKey;
			const sorted = [...teeth].sort((a, b) => a - b);
			const prefix = sorted.length > 1 ? "зубы" : "зуб";
			parts.push(`${label}: ${prefix} ${sorted.join(", ")}`);
		}
	}

	parts.push("Интактные: остальные зубы");

	if (perToothList.length > 0) {
		return `${perToothList.join(", ")}; ${parts.join("; ")}`;
	}
	return parts.join("; ");
}

import {
	DENTAL_ICD10_MAP,
	DENTAL_ICD10_RUBRIC_MAP,
} from "../icd10DentalCatalog";
import type { Icd10ValidationResult } from "./icd10Types";
import { isValidFdiTooth, normalizeCode } from "./icd10Normalization";
import { parseQuery } from "./icd10QueryParser";

function extractTeeth(toothInput: unknown, normalized: string, item: unknown): { teeth?: number[]; error?: Icd10ValidationResult } {
	if (toothInput == null) return {};

	if (typeof toothInput === "number") {
		if (isValidFdiTooth(toothInput)) {
			return { teeth: [toothInput] };
		}
		return {
			error: {
				isValid: false,
				errorCode: "ToothInvalid",
				errorMessage: `Недопустимый номер зуба FDI: ${toothInput}. Допустимы 11–48 и 51–85.`,
				normalizedCode: normalized,
				item: item as any,
			},
		};
	}

	const strTooth = String(toothInput).trim();
	if (!strTooth) return {};

	const parsedTooth = parseQuery(strTooth);
	if (parsedTooth.extractedToothNumber) {
		return { teeth: [parsedTooth.extractedToothNumber] };
	}

	const num = Number(strTooth);
	if (isValidFdiTooth(num)) {
		return { teeth: [num] };
	}

	return {
		error: {
			isValid: false,
			errorCode: "ToothInvalid",
			errorMessage: `Недопустимый номер зуба «${strTooth}». Требуется двухзначный номер FDI (11–48, 51–85).`,
			normalizedCode: normalized,
			item: item as any,
		},
	};
}

/**
 * Клиническая валидация выбранного кода МКБ-10 и привязки к зубу FDI перед подписанием 043/у.
 */
export function validateSelection(code: unknown, toothInput?: unknown): Icd10ValidationResult {
	const rawCodeStr = typeof code === "string" ? code.trim() : code != null ? String(code).trim() : "";

	if (!rawCodeStr) {
		return {
			isValid: false,
			errorCode: "Icd10Required",
			errorMessage: "Укажите код диагноза по МКБ-10 для заполнения протокола 043/у.",
		};
	}

	const normalized = normalizeCode(rawCodeStr);
	const item = DENTAL_ICD10_MAP.get(normalized);

	// Проверка стоматологического раздела K00-K14
	const isDental = /^K(0[0-9]|1[0-4])(\.\d{1,4})?$/i.test(normalized);
	if (!isDental) {
		return {
			isValid: false,
			errorCode: "Icd10Invalid",
			errorMessage: `Код «${rawCodeStr}» не входит в стоматологический раздел МКБ-10 (K00–K14).`,
			normalizedCode: normalized,
		};
	}

	const requiresTooth = item?.requiresTooth ?? ["K02", "K04", "K05"].includes(normalized.slice(0, 3));
	const extraction = extractTeeth(toothInput, normalized, item);
	if (extraction.error) return extraction.error;

	const teeth = extraction.teeth ?? [];

	if (requiresTooth && teeth.length === 0) {
		return {
			isValid: false,
			errorCode: "ToothRequired",
			errorMessage: `Для диагноза ${normalized} (${item?.shortTitleRu ?? "стоматология"}) обязательно указание номера зуба по формуле FDI.`,
			normalizedCode: normalized,
			item,
		};
	}

	return { isValid: true, normalizedCode: normalized, item, teeth };
}

/**
 * Получение полной метаинформации о базовой рубрике МКБ-10.
 */
export function getRubricMeta(rubricCode: string) {
	const norm = rubricCode.toUpperCase().replace(/^К/, "K");
	return DENTAL_ICD10_RUBRIC_MAP[norm] ?? null;
}

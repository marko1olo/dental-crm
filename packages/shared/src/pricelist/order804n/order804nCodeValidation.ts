/**
 * packages/shared/src/pricelist/order804n/order804nCodeValidation.ts
 * Layer 2: Statutory 804n Code Normalization, Validation & Registry Indexing.
 *
 * Implements Mandates 8b, 8c, 8e, 8l, 8n, 8s, 8t, 8z.
 * Pure Layer 2 domain logic without DOM or network dependencies.
 */

import type { DentalSpecialty, ServiceCategory } from "../../schemas/aiAndEgiszSchemas.js";
import {
	PEDIATRIC_804N_CATALOG,
	THERAPEUTIC_AND_DIAGNOSTIC_BASE_CATALOG,
} from "./therapeuticAndDiagnosticCatalog.js";
import { SURGICAL_AND_ORTHO_804N_CATALOG } from "./surgicalAndOrthoCatalog.js";
import type {
	Order804nValidationResult,
	StatutoryNomenclatureEntry,
} from "./types.js";

/**
 * Complete statutory Minzdrav Order 804n registry assembled in canonical order.
 */
export const ORDER_804N_STATUTORY_REGISTRY: readonly StatutoryNomenclatureEntry[] = [
	...THERAPEUTIC_AND_DIAGNOSTIC_BASE_CATALOG,
	...SURGICAL_AND_ORTHO_804N_CATALOG,
	...PEDIATRIC_804N_CATALOG,
];

/**
 * Standard statutory 804n code regex pattern (e.g. A16.07.002, B01.065.001 or B01.003.004.005).
 */
export const ORDER_804N_CODE_REGEX = /^[AB]\d{2}\.\d{2,3}\.\d{3}(?:\.\d{3})?$/;

/**
 * Normalizes Cyrillic 'А'/'В' to Latin 'A'/'B' in statutory codes.
 */
export function normalize804nCode(rawCode: string): string {
	return (rawCode || "")
		.trim()
		.toUpperCase()
		.replace(/^А/, "A")
		.replace(/^В/, "B");
}

/**
 * Validates if string strictly conforms to Minzdrav Order 804n code syntax.
 */
export function isOrder804nCode(str: string): boolean {
	const norm = normalize804nCode(str);
	return ORDER_804N_CODE_REGEX.test(norm);
}

/**
 * Validates code format and resolves against the canonical statutory registry.
 */
export function validate804nCode(rawCode: string): Order804nValidationResult {
	const normalizedCode = normalize804nCode(rawCode);
	if (!normalizedCode) {
		return { isValid: false, normalizedCode: "", error: "Код услуги 804н не может быть пустым" };
	}
	if (!isOrder804nCode(normalizedCode)) {
		return {
			isValid: false,
			normalizedCode,
			error: `Недопустимый формат кода 804н: "${rawCode}". Ожидается вид A16.07.002 или B01.065.001.`,
		};
	}

	const entry = ORDER_804N_STATUTORY_REGISTRY.find(
		(e) => e.code === normalizedCode || normalizedCode.startsWith(e.code),
	);

	if (!entry) {
		return {
			isValid: true, // syntactically valid code
			normalizedCode,
		};
	}

	return {
		isValid: true,
		normalizedCode,
		entry,
	};
}

/**
 * Look up statutory nomenclature entry by exact or prefix code.
 */
export function find804nEntryByCode(code: string): StatutoryNomenclatureEntry | undefined {
	const normalized = normalize804nCode(code);
	return ORDER_804N_STATUTORY_REGISTRY.find(
		(e) => e.code === normalized || normalized.startsWith(e.code),
	);
}

/**
 * Filters registry entries by service category.
 */
export function get804nEntriesByCategory(
	category: ServiceCategory,
): readonly StatutoryNomenclatureEntry[] {
	return ORDER_804N_STATUTORY_REGISTRY.filter((e) => e.category === category);
}

/**
 * Filters registry entries by dental specialty.
 */
export function get804nEntriesBySpecialty(
	specialty: DentalSpecialty,
): readonly StatutoryNomenclatureEntry[] {
	return ORDER_804N_STATUTORY_REGISTRY.filter(
		(e) => e.specialty === specialty || e.specialty === "universal",
	);
}

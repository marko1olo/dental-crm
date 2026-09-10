/**
 * packages/shared/src/clinical/stomxPricelistCatalog.ts
 *
 * StomX Dental Pricelist & Order 804n Harmonized Catalog.
 *
 * Compliant with:
 * - Supreme Law: THE HAMMER (Zero Mocks, Absolute Parity)
 * - Mandate 8e: Doctor Autonomy (No false blockers, free doctor discounts 0..100%, 1-click plan application)
 * - Mandate 8i: Specialized Outpatient Bounded Context (Form 043/u, Nomenclature 804n)
 * - Mandate 8b: Exact Math & Accounting to the kopeck
 */

import { STOMX_THERAPY_PROCEDURES } from "./stomxPricelistTherapyData.js";
import { STOMX_SURGERY_PROCEDURES } from "./stomxPricelistSurgeryData.js";
import { STOMX_ORTHOPEDICS_PROCEDURES } from "./stomxPricelistOrthopedicsData.js";
import type {
	StomxEstimateItem,
	StomxPricelistCategory,
	StomxProcedureItem,
	StomxSearchOptions,
	StomxTreatmentPlanItem,
} from "./stomxPricelistTypes.js";

export * from "./stomxPricelistTypes.js";
export * from "./stomxPricelistCategories.js";
export { STOMX_THERAPY_PROCEDURES } from "./stomxPricelistTherapyData.js";
export { STOMX_SURGERY_PROCEDURES } from "./stomxPricelistSurgeryData.js";
export { STOMX_ORTHOPEDICS_PROCEDURES } from "./stomxPricelistOrthopedicsData.js";

/**
 * All harmonized core procedures from StomX Drop across all 10 dental specialties.
 */
export const STOMX_CORE_PROCEDURES: readonly StomxProcedureItem[] = [
	...STOMX_THERAPY_PROCEDURES,
	...STOMX_SURGERY_PROCEDURES,
	...STOMX_ORTHOPEDICS_PROCEDURES,
];

// O(1) fast lookup indices
const PROCEDURE_BY_ID = new Map<string | number, StomxProcedureItem>();
const PROCEDURE_BY_CODE = new Map<string, StomxProcedureItem>();
const PROCEDURE_BY_804N = new Map<string, StomxProcedureItem[]>();
const PROCEDURES_BY_CATEGORY = new Map<StomxPricelistCategory, StomxProcedureItem[]>();

function normalizeCodeKey(key: string): string {
	return key
		.trim()
		.toUpperCase()
		.replace(/^[А]/, "A")
		.replace(/^[В]/, "B")
		.replace(/\s+/g, "")
		.replace(/\.+/g, ".");
}

for (const proc of STOMX_CORE_PROCEDURES) {
	PROCEDURE_BY_ID.set(proc.id, proc);
	if (proc.stomxId) {
		PROCEDURE_BY_ID.set(proc.stomxId, proc);
	}

	const codeKey = normalizeCodeKey(proc.code);
	if (codeKey) {
		PROCEDURE_BY_CODE.set(codeKey, proc);
	}

	const code804nKey = normalizeCodeKey(proc.code804n);
	if (code804nKey) {
		if (!PROCEDURE_BY_CODE.has(code804nKey)) {
			PROCEDURE_BY_CODE.set(code804nKey, proc);
		}
		const existing804n = PROCEDURE_BY_804N.get(code804nKey) ?? [];
		existing804n.push(proc);
		PROCEDURE_BY_804N.set(code804nKey, existing804n);
	}

	const catList = PROCEDURES_BY_CATEGORY.get(proc.category) ?? [];
	catList.push(proc);
	PROCEDURES_BY_CATEGORY.set(proc.category, catList);
}

/**
 * Finds a procedure by its code (internal code, 804n code, or numeric ID).
 */
export function findStomxProcedureByCode(code: string | number): StomxProcedureItem | undefined {
	if (typeof code === "number") {
		return PROCEDURE_BY_ID.get(code);
	}
	const trimmed = code.trim();
	if (!trimmed) return undefined;

	// Check direct numeric ID match
	if (/^\d+$/.test(trimmed)) {
		const numId = Number(trimmed);
		const byId = PROCEDURE_BY_ID.get(numId);
		if (byId) return byId;
	}

	const normalized = normalizeCodeKey(trimmed);
	return PROCEDURE_BY_CODE.get(normalized) ?? PROCEDURE_BY_ID.get(trimmed);
}

/**
 * Searches procedures by free-text query (name, code, or 804n) with optional filters.
 */
export function searchStomxProcedures(
	query: string,
	options: StomxSearchOptions = {},
): StomxProcedureItem[] {
	const q = query.trim().toLowerCase();
	const normalizedQueryCode = normalizeCodeKey(query).toLowerCase();

	const targetList = options.category
		? (PROCEDURES_BY_CATEGORY.get(options.category) ?? [])
		: STOMX_CORE_PROCEDURES;

	const matches: StomxProcedureItem[] = [];

	for (const proc of targetList) {
		if (options.requireTooth !== undefined && proc.requireTooth !== options.requireTooth) {
			continue;
		}
		if (options.minPriceRub !== undefined && proc.price < options.minPriceRub) {
			continue;
		}
		if (options.maxPriceRub !== undefined && proc.price > options.maxPriceRub) {
			continue;
		}

		if (!q) {
			matches.push(proc);
		} else {
			const nameMatch = proc.name.toLowerCase().includes(q);
			const codeMatch = proc.code.toLowerCase().includes(q) ||
				normalizeCodeKey(proc.code).toLowerCase().includes(normalizedQueryCode);
			const code804nMatch = proc.code804n.toLowerCase().includes(q) ||
				normalizeCodeKey(proc.code804n).toLowerCase().includes(normalizedQueryCode);

			if (nameMatch || codeMatch || code804nMatch) {
				matches.push(proc);
			}
		}

		if (options.limit && matches.length >= options.limit) {
			break;
		}
	}

	return matches;
}

/**
 * Returns all procedures belonging to a specific clinical specialty / category.
 */
export function getProceduresByCategory(category: StomxPricelistCategory): StomxProcedureItem[] {
	return [...(PROCEDURES_BY_CATEGORY.get(category) ?? [])];
}

/**
 * Maps a procedure name or code to its corresponding Minzdrav Order 804n code.
 */
export function mapProcedureTo804nCode(procedureNameOrCode: string): string | undefined {
	const trimmed = procedureNameOrCode.trim();
	if (!trimmed) return undefined;

	// Check if already an 804n code pattern (e.g. A16.07.002, B01.065.007)
	const norm = normalizeCodeKey(trimmed);
	if (/^[AB]\d{2}\.\d{2,3}\.\d{3}/.test(norm)) {
		return norm;
	}

	// Try lookup by code
	const byCode = findStomxProcedureByCode(trimmed);
	if (byCode) {
		return byCode.code804n;
	}

	// Try substring search in names
	const lower = trimmed.toLowerCase();
	for (const proc of STOMX_CORE_PROCEDURES) {
		if (proc.name.toLowerCase().includes(lower) || lower.includes(proc.name.toLowerCase())) {
			return proc.code804n;
		}
	}

	return undefined;
}

export interface CreateEstimateItemOptions {
	readonly quantity?: number | undefined;
	readonly discountPercent?: number | undefined;
	readonly customPriceRub?: number | undefined;
	readonly toothNumber?: number | undefined;
	readonly surfaces?: readonly string[] | undefined;
	readonly notes?: string | undefined;
}

export interface CreateTreatmentPlanItemOptions extends CreateEstimateItemOptions {
	readonly phaseNumber?: number | undefined;
	readonly status?: ("planned" | "in_progress" | "completed" | "cancelled") | undefined;
}

/**
 * Creates an estimate item from a StomX procedure in 1 click.
 * Complies with Mandate 8e: Doctor Autonomy (free discounts 0..100%, exact kopeck math).
 */
export function createEstimateItemFromStomxProcedure(
	procedure: StomxProcedureItem,
	options: CreateEstimateItemOptions = {},
): StomxEstimateItem {
	const quantity = Math.max(1, Math.round(options.quantity ?? 1));
	const discountPercent = Math.max(0, Math.min(100, options.discountPercent ?? 0));
	const priceRub = options.customPriceRub !== undefined
		? Math.max(0, options.customPriceRub)
		: procedure.price;
	const priceKopecks = Math.round(priceRub * 100);

	// Total calculation strictly in kopecks (Mandate 8b)
	const rawKopecks = priceKopecks * quantity;
	const discountKopecks = Math.round(rawKopecks * (discountPercent / 100));
	const totalKopecks = Math.max(0, rawKopecks - discountKopecks);
	const totalRub = totalKopecks / 100;

	return {
		procedureId: procedure.id,
		code: procedure.code,
		code804n: procedure.code804n,
		name: procedure.name,
		category: procedure.category,
		priceRub,
		priceKopecks,
		quantity,
		discountPercent,
		totalRub,
		totalKopecks,
		toothNumber: options.toothNumber,
		surfaces: options.surfaces,
		durationMinutes: procedure.durationMinutes * quantity,
		warrantyMonths: procedure.warrantyMonths,
		lifetimeMonths: procedure.lifetimeMonths,
		notes: options.notes,
	};
}

export interface CreateTreatmentPlanItemOptions extends CreateEstimateItemOptions {
	readonly phaseNumber?: number;
	readonly status?: "planned" | "in_progress" | "completed" | "cancelled";
}

/**
 * Creates a treatment plan item from a StomX procedure in 1 click.
 * Complies with Mandate 8e: Doctor Autonomy (zero false blocking, phased treatment).
 */
export function createTreatmentPlanItemFromStomxProcedure(
	procedure: StomxProcedureItem,
	options: CreateTreatmentPlanItemOptions = {},
): StomxTreatmentPlanItem {
	const estimate = createEstimateItemFromStomxProcedure(procedure, options);

	return {
		...estimate,
		phaseNumber: Math.max(1, Math.round(options.phaseNumber ?? 1)),
		status: options.status ?? "planned",
	};
}

import type { DocumentState } from "./types";
import { createDocumentSlice } from "./slices/documentSlice";
import { createTaxSlice } from "./slices/taxSlice";
import { createIntakeAndConsentSlice } from "./slices/intakeConsentSlice";
import { createFinancialSlice } from "./slices/financialSlice";
import { createClinicalSlice } from "./slices/clinicalSlice";
import { createMiscSlice } from "./slices/miscSlice";

/**
 * Исходные значения ВСЕХ полей форм документов.
 *
 * Собирается повторным вызовом тех же фабрик срезов с пустым `set`: настройки
 * при этом никуда не пишутся, а функции-сеттеры отбрасываются — остаются только
 * значения. Так список полей живёт в одном месте, и поле, добавленное завтра,
 * попадёт в сброс само.
 */
export function documentFormInitialValues(): Partial<DocumentState> {
	const noopSet = () => {};
	const fresh: Record<string, unknown> = {
		...createDocumentSlice(noopSet),
		...createTaxSlice(noopSet),
		...createIntakeAndConsentSlice(noopSet),
		...createFinancialSlice(noopSet),
		...createClinicalSlice(noopSet),
		...createMiscSlice(noopSet),
	};
	const values: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(fresh)) {
		if (typeof value !== "function") values[key] = value;
	}
	return values as Partial<DocumentState>;
}

/**
 * Набрано ли в формах документов хоть что-то, отличное от исходного.
 *
 * Нужно, чтобы не пугать человека сообщением о выброшенном черновике, когда
 * выбрасывать было нечего: предупреждение, которое показывают всегда, перестают
 * читать, и вместе с ним перестают читать настоящее.
 */
export function documentFormHasEntries(
	state: Record<string, unknown>,
): boolean {
	const initial = documentFormInitialValues() as Record<string, unknown>;
	for (const [key, value] of Object.entries(initial)) {
		const current = state[key];
		if (typeof current === "function") continue;
		/* Массивы и объекты сравниваются по содержимому: ссылки различаются всегда. */
		if (typeof value === "object" && value !== null) {
			if (JSON.stringify(current) !== JSON.stringify(value)) return true;
			continue;
		}
		if (current !== value) return true;
	}
	return false;
}

/**
 * apps/web/src/lib/icd10.ts
 *
 * Полный стоматологический классификатор МКБ-10 (K00..K14, Z-коды).
 * Реэкспортирует канонический SSOT каталог из @dental/shared.
 * Мандаты 8e (Автономия врача), 8s (SSOT), 8x (Клинический язык).
 */

import {
	DENTAL_ICD10_FULL_CATALOG,
	normalizeDentalIcd10Code,
	isDentalIcd10Code,
	findDentalIcd10,
	searchDentalIcd10Catalog,
	type DentalIcd10Entry,
} from "@dental/shared";

export type { DentalIcd10Entry };
export {
	DENTAL_ICD10_FULL_CATALOG,
	normalizeDentalIcd10Code,
	isDentalIcd10Code,
	findDentalIcd10,
	searchDentalIcd10Catalog,
};

export interface Icd10Item {
	code: string;
	label: string;
	group: string;
	rubric?: string;
	requiresTooth?: boolean;
}

export const ICD10_DICTIONARY: readonly Icd10Item[] = DENTAL_ICD10_FULL_CATALOG;

export const ICD_GROUP_COLORS: Record<string, string> = {
	Кариес: "bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/25",
	Пульпа: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
	"Пульпа и периапикал": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
	Периапикал: "bg-orange-500/10 text-orange-500 dark:text-orange-400 border-orange-500/25",
	Пародонт: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/25",
	Ортодонтия: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25",
	"Развитие и прикус": "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25",
	Хирургия: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25",
	"Хирургия и ортопедия": "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25",
	Ортопедия: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25",
	Слизистая: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/25",
	Другое: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/25",
	Консультация: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
};

export function getIcdColor(code: string): string {
	const norm = normalizeDentalIcd10Code(code);
	const entry = ICD10_DICTIONARY.find((i) => i.code.toUpperCase() === norm.toUpperCase()) ||
		ICD10_DICTIONARY.find((i) => i.code.toUpperCase().startsWith(norm.slice(0, 3).toUpperCase()));
	return (
		ICD_GROUP_COLORS[entry?.group ?? "Другое"] ??
		"bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/25"
	);
}

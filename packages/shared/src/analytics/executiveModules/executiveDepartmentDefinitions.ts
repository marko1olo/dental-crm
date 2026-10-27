/**
 * packages/shared/src/analytics/executiveModules/executiveDepartmentDefinitions.ts
 * Department keys, performance status and clinical department definitions.
 * Mandate 8b: <= 120 lines.
 */

import { z } from "zod";

export const executiveDepartmentKeySchema = z.enum([
	"therapy",               // Терапия
	"orthopedics",           // Ортопедия
	"surgery_implantation",  // Хирургия и Имплантация
	"orthodontics",          // Ортодонтия
	"pediatric",             // Детская стоматология
]);

export type ExecutiveDepartmentKey = z.infer<typeof executiveDepartmentKeySchema>;

export type DepartmentPerformanceStatus =
	| "ahead"     // Перевыполнение плана (>= 105%)
	| "on_track"  // В графике плана (95% - 104.9%)
	| "behind"    // Незначительное отставание (75% - 94.9%)
	| "critical"; // Критическое отставание (< 75%)

export interface ExecutiveDepartmentDefinition {
	readonly key: ExecutiveDepartmentKey;
	readonly titleRu: string;
	readonly shortTitleRu: string;
	readonly defaultShareTargetPercent: number;
	readonly accentColor: string;
	readonly description: string;
}

export const EXECUTIVE_DEPARTMENT_DEFINITIONS: readonly ExecutiveDepartmentDefinition[] = [
	{
		key: "therapy",
		titleRu: "Терапевтическая стоматология",
		shortTitleRu: "Терапия",
		defaultShareTargetPercent: 30,
		accentColor: "var(--teal, #0d9488)",
		description: "Лечение кариеса, пульпита, периодонтита, эндодонтия под микроскопом, эстетическая реставрация",
	},
	{
		key: "orthopedics",
		titleRu: "Ортопедическая стоматология",
		shortTitleRu: "Ортопедия",
		defaultShareTargetPercent: 28,
		accentColor: "var(--accent, #6366f1)",
		description: "Коронки из диоксида циркония, керамические виниры E.max, мостовидные и бюгельные протезы",
	},
	{
		key: "surgery_implantation",
		titleRu: "Хирургия и Имплантация",
		shortTitleRu: "Хирургия",
		defaultShareTargetPercent: 24,
		accentColor: "var(--err-fg, #ef4444)",
		description: "Дентальная имплантация, All-on-4/All-on-6, костная пластика, синус-лифтинг, сложное удаление зубов",
	},
	{
		key: "orthodontics",
		titleRu: "Ортодонтия",
		shortTitleRu: "Ортодонтия",
		defaultShareTargetPercent: 12,
		accentColor: "var(--warn-fg, #f59e0b)",
		description: "Брекет-системы (Damon, самолигирующие), прозрачные элайнеры, детские пластинки и каппы",
	},
	{
		key: "pediatric",
		titleRu: "Детская стоматология",
		shortTitleRu: "Детство",
		defaultShareTargetPercent: 6,
		accentColor: "var(--brand-300, #38bdf8)",
		description: "Лечение молочных и постоянных зубов у детей, цветные пломбы, циркониевые коронки, адаптационный приём",
	},
];

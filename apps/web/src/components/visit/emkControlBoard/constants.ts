import type { EmkProtocolStep } from "./types";

/**
 * Default steps of the doctor clinical protocol.
 */
export const DEFAULT_EMK_PROTOCOL_STEPS: readonly EmkProtocolStep[] = [
	{
		id: "complaints",
		titleRu: "Жалобы",
		shortTitleRu: "Жалобы",
		isRequired: true,
		isCompleted: false,
		completionPercent: 0,
	},
	{
		id: "anamnesis",
		titleRu: "Анамнез",
		shortTitleRu: "Анамнез",
		isRequired: true,
		isCompleted: false,
		completionPercent: 0,
	},
	{
		id: "examination",
		titleRu: "Осмотр и статус",
		shortTitleRu: "Осмотр",
		isRequired: true,
		isCompleted: false,
		completionPercent: 0,
	},
	{
		id: "diagnosis",
		titleRu: "Диагноз МКБ-10",
		shortTitleRu: "Диагноз",
		isRequired: true,
		isCompleted: false,
		completionPercent: 0,
	},
	{
		id: "treatment_plan",
		titleRu: "План лечения",
		shortTitleRu: "План",
		isRequired: true,
		isCompleted: false,
		completionPercent: 0,
	},
	{
		id: "checkout",
		titleRu: "Чек и касса",
		shortTitleRu: "Чек",
		isRequired: false,
		isCompleted: false,
		completionPercent: 0,
	},
] as const;

/**
 * Debounce timing for medical card autosave drafts (Mandate 8e).
 */
export const EMK_AUTOSAVE_DEBOUNCE_MS = 400;

/**
 * Completeness evaluation score thresholds.
 */
export const EMK_COMPLETENESS_THRESHOLDS = {
	EXCELLENT: 85,
	ACCEPTABLE: 50,
} as const;

/**
 * Resolves color token for clinical completeness score.
 */
export function getCompletenessColor(score: number): string {
	if (score >= EMK_COMPLETENESS_THRESHOLDS.EXCELLENT) {
		return "var(--good, #10b981)";
	}
	if (score >= EMK_COMPLETENESS_THRESHOLDS.ACCEPTABLE) {
		return "var(--warn, #f59e0b)";
	}
	return "var(--bad, #ef4444)";
}

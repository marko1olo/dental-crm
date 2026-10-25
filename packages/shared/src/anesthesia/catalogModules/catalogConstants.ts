/**
 * @dental/shared/anesthesia/catalogModules/catalogConstants.ts
 * Epinephrine limits and clinical badges (Mandate 8b, <= 120 lines)
 */

export const HEALTHY_MAX_EPINEPHRINE_MG = 0.20;
export const CARDIO_MAX_EPINEPHRINE_MG = 0.04;
export const CARDIO_LIMIT_BADGE_TEXT = "Кардиологический лимит";
export const EPINEPHRINE_BLOCKED_BADGE_TEXT = "⛔ Адреналин запрещен";

export const EPINEPHRINE_CEILINGS_MG = {
	healthyAdult: 0.20,
	cardiovascularGate: 0.04,
	cardiovascularRisk: 0.04,
} as const;

/**
 * apps/web/src/components/treatment-plans/pricing/planServiceRules.ts
 *
 * Правила сопоставления состояний зубов с разделами прайса клиники.
 */

import type { ToothState } from "../../odontogram/ToothChart";

/** Предложение из зубной формулы: номер зуба и состояние, которое поставил врач. */
export interface PlanSuggestionInput {
	toothNumber: number;
	state: string;
}

/**
 * Правило подбора услуги под состояние зуба.
 * Поиск в прайсе по разделу и ключевым словам.
 */
export interface PlanServiceRule {
	readonly category: string;
	readonly keywords: readonly string[];
	readonly humanName: string;
}

export const PLAN_SERVICE_RULES: Partial<Record<ToothState, PlanServiceRule>> = {
	Caries: {
		category: "therapy",
		keywords: ["кариес"],
		humanName: "лечение кариеса",
	},
	Pulpitis: {
		category: "therapy",
		keywords: ["пульпит", "эндо", "канал"],
		humanName: "лечение пульпита",
	},
	Periodontitis: {
		category: "therapy",
		keywords: ["периодонтит", "эндо", "канал"],
		humanName: "лечение периодонтита",
	},
	Planned_Implant: {
		category: "surgery",
		keywords: ["имплант"],
		humanName: "установка имплантата",
	},
	Implant: {
		category: "surgery",
		keywords: ["имплант"],
		humanName: "установка имплантата",
	},
	Missing: {
		category: "surgery",
		keywords: ["имплант"],
		humanName: "установка имплантата",
	},
	Crown: {
		category: "prosthetics",
		keywords: ["коронка"],
		humanName: "коронка",
	},
	Retained: {
		category: "surgery",
		keywords: ["ретенир", "удалени", "дистопир", "атипичн"],
		humanName: "удаление ретенированного зуба",
	},
	Impacted: {
		category: "surgery",
		keywords: ["ретенир", "удалени", "дистопир", "атипичн"],
		humanName: "удаление ретенированного зуба",
	},
};

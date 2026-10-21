/**
 * apps/web/src/components/treatment-plans/phased4StageView/phasedConstants.ts
 *
 * Клинические константы и метаданные 4 фаз лечения.
 */

import type { TreatmentPlanStageCategory } from "@dental/shared";
import type { PhasedStageStatus } from "./phasedContracts";

export const CATEGORY_ORDER: readonly TreatmentPlanStageCategory[] = [
	"hygiene_sanitation",
	"endo_therapy",
	"surgery_implant",
	"ortho_prosthetics",
];

export const STAGE_TIMELINE_LABELS: Record<TreatmentPlanStageCategory, string> = {
	hygiene_sanitation: "1–3 дня",
	endo_therapy: "1–2 недели",
	surgery_implant: "3–6 мес (остеоинтеграция)",
	ortho_prosthetics: "2–3 недели",
};

export const STAGE_TITLES: Record<TreatmentPlanStageCategory, string> = {
	hygiene_sanitation: "Неотложная помощь и купирование боли / Санация",
	endo_therapy: "Базовая терапия и эндодонтия",
	surgery_implant: "Хирургия, имплантация и пародонтология",
	ortho_prosthetics: "Ортопедия, протезирование и ортодонтия",
};

export const STAGE_SUBTITLES: Record<TreatmentPlanStageCategory, string> = {
	hygiene_sanitation:
		"Купирование острой боли, вскрытие очагов воспаления, удаление безнадёжных зубов и профгигиена",
	endo_therapy:
		"Лечение кариеса, пульпита, ревизия корневых каналов и подготовка под протезирование",
	surgery_implant:
		"Установка дентальных имплантатов, костная пластика, синус-лифтинг и пластика мягких тканей",
	ortho_prosthetics:
		"Цифровое протезирование коронками из диоксида циркония / E.max, виниры и восстановление окклюзии",
};

export const STAGE_STATUS_Order: readonly PhasedStageStatus[] = [
	"draft",
	"agreed",
	"in_progress",
	"completed",
];

export const STAGE_STATUS_META: Record<
	PhasedStageStatus,
	{ label: string; badgeClass: string; dotColor: string }
> = {
	draft: {
		label: "Черновик",
		badgeClass: "bg-[var(--paper-soft)] text-[var(--ink-muted)] border-[var(--line)]",
		dotColor: "var(--ink-muted)",
	},
	agreed: {
		label: "Согласован",
		badgeClass:
			"bg-[color-mix(in_srgb,var(--teal)_10%,var(--paper))] text-[var(--teal)] border-[color-mix(in_srgb,var(--teal)_32%,transparent)]",
		dotColor: "var(--teal)",
	},
	in_progress: {
		label: "В работе",
		badgeClass:
			"bg-[color-mix(in_srgb,var(--teal)_16%,var(--paper))] text-[var(--ink)] border-[var(--teal)]",
		dotColor: "var(--teal)",
	},
	completed: {
		label: "Завершён",
		badgeClass: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--teal)]",
		dotColor: "var(--teal)",
	},
};

export const INITIAL_EXPANDED_STAGES: Record<TreatmentPlanStageCategory, boolean> = {
	hygiene_sanitation: true,
	endo_therapy: true,
	surgery_implant: true,
	ortho_prosthetics: true,
};

export const INITIAL_EXPANDED_CONSUMABLES: Record<TreatmentPlanStageCategory, boolean> = {
	hygiene_sanitation: false,
	endo_therapy: false,
	surgery_implant: false,
	ortho_prosthetics: false,
};

export const INITIAL_STAGE_STATUSES: Record<TreatmentPlanStageCategory, PhasedStageStatus> = {
	hygiene_sanitation: "agreed",
	endo_therapy: "draft",
	surgery_implant: "draft",
	ortho_prosthetics: "draft",
};

export function formatPlanAgeBadge(planAgeDays: number, planCreatedAtIso?: string): string {
	const dateObj = planCreatedAtIso ? new Date(planCreatedAtIso) : new Date();
	const safeDate = Number.isNaN(dateObj.getTime()) ? new Date() : dateObj;
	const dateStr = safeDate.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
	return planAgeDays <= 0 ? `План от ${dateStr} · Сегодня` : `План от ${dateStr} · ${planAgeDays} дн. назад`;
}

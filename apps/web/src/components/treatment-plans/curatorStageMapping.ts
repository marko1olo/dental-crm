/**
 * curatorStageMapping.ts — Единый канонический маппер стадий воронки куратора (SSOT).
 * Устраняет split-brain между:
 * - TreatmentPipeline (PipelineStage: requires_budget | awaiting_decision | no_appointment | in_progress_abandoned | completed)
 * - CuratorDashboard (CuratorFunnelStage: consultation | plan_negotiation | prepayment | treatment_start | completed)
 * - StudioCuratorAssignmentTab (устаревшие ключи consultation | decision_making | tier_selected | in_treatment)
 */

import type { CuratorFunnelStage } from "@dental/shared";

export type CanonicalPipelineStage =
	| "requires_budget"
	| "awaiting_decision"
	| "no_appointment"
	| "in_progress_abandoned"
	| "completed";

const CANONICAL_PIPELINE_SET = new Set<string>([
	"requires_budget",
	"awaiting_decision",
	"no_appointment",
	"in_progress_abandoned",
	"completed",
]);

const CANONICAL_CURATOR_SET = new Set<string>([
	"consultation",
	"plan_negotiation",
	"prepayment",
	"treatment_start",
	"completed",
]);

const ANY_STAGE_TO_PIPELINE: Readonly<Record<string, CanonicalPipelineStage>> = {
	requires_budget: "requires_budget",
	consultation: "requires_budget",
	awaiting_decision: "awaiting_decision",
	plan_negotiation: "awaiting_decision",
	decision_making: "awaiting_decision",
	no_appointment: "no_appointment",
	prepayment: "no_appointment",
	tier_selected: "no_appointment",
	in_progress_abandoned: "in_progress_abandoned",
	treatment_start: "in_progress_abandoned",
	in_treatment: "in_progress_abandoned",
	completed: "completed",
};

const ANY_STAGE_TO_CURATOR_FUNNEL: Readonly<Record<string, CuratorFunnelStage>> = {
	consultation: "consultation",
	requires_budget: "consultation",
	plan_negotiation: "plan_negotiation",
	awaiting_decision: "plan_negotiation",
	decision_making: "plan_negotiation",
	prepayment: "prepayment",
	no_appointment: "prepayment",
	tier_selected: "prepayment",
	treatment_start: "treatment_start",
	in_progress_abandoned: "treatment_start",
	in_treatment: "treatment_start",
	completed: "completed",
};

export function normalizeToPipelineStage(raw?: string | null): CanonicalPipelineStage {
	if (!raw) return "awaiting_decision";
	if (CANONICAL_PIPELINE_SET.has(raw)) return raw as CanonicalPipelineStage;
	return ANY_STAGE_TO_PIPELINE[raw] ?? "awaiting_decision";
}

export function normalizeToCuratorFunnelStage(raw?: string | null): CuratorFunnelStage {
	if (!raw) return "consultation";
	if (CANONICAL_CURATOR_SET.has(raw)) return raw as CuratorFunnelStage;
	return ANY_STAGE_TO_CURATOR_FUNNEL[raw] ?? "consultation";
}

export interface UnifiedPipelineStageOption {
	readonly stage: CanonicalPipelineStage;
	readonly curatorStage: CuratorFunnelStage;
	readonly label: string;
}

export const UNIFIED_PIPELINE_STAGE_OPTIONS: readonly UnifiedPipelineStageOption[] = [
	{
		stage: "requires_budget",
		curatorStage: "consultation",
		label: "Требуется смета (первичная консультация и диагностика)",
	},
	{
		stage: "awaiting_decision",
		curatorStage: "plan_negotiation",
		label: "Ожидает решения (план презентован пациенту)",
	},
	{
		stage: "no_appointment",
		curatorStage: "prepayment",
		label: "Без записи / предоплата (тариф согласован)",
	},
	{
		stage: "in_progress_abandoned",
		curatorStage: "treatment_start",
		label: "Лечение начато / контроль паузы",
	},
	{
		stage: "completed",
		curatorStage: "completed",
		label: "Завершено (план лечения выполнен)",
	},
] as const;

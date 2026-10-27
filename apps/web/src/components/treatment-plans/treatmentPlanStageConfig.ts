import {
	Check,
	CheckCircle2,
	Clock,
	Play,
} from "lucide-react";
import type { TreatmentPlanStageStatus } from "./types";
import type { StageStatusConfigItem } from "./TreatmentPlanStageFooter";

export const STAGE_STATUS_CONFIG: Record<
	TreatmentPlanStageStatus,
	StageStatusConfigItem
> = {
	draft: {
		label: "Черновик",
		badge: "bg-[var(--paper-soft)] text-[var(--ink-secondary)] border border-[var(--line)]",
		icon: Clock,
	},
	agreed: {
		label: "Согласован",
		badge: "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal)]/20",
		icon: CheckCircle2,
	},
	in_progress: {
		label: "В работе",
		badge: "bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)]",
		icon: Play,
	},
	completed: {
		label: "Завершен",
		badge: "bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]",
		icon: Check,
	},
};

export const STAGE_COLOR_MAP = {
	1: {
		badge: "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/20",
		iconBg: "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))]",
		headerBg: "bg-[var(--teal)]/5",
		accentBorder: "border-[var(--teal,var(--brand-primary))]/30",
	},
	2: {
		badge: "bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)]",
		iconBg: "bg-[var(--paper-soft)] text-[var(--ink-secondary)]",
		headerBg: "bg-[var(--paper-soft)]/50",
		accentBorder: "border-[var(--line)]",
	},
	3: {
		badge: "bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)]",
		iconBg: "bg-[var(--paper-soft)] text-[var(--ink-secondary)]",
		headerBg: "bg-[var(--paper-soft)]/50",
		accentBorder: "border-[var(--line)]",
	},
};

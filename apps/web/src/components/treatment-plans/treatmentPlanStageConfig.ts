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
		badge: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30",
		icon: Clock,
	},
	agreed: {
		label: "Согласован",
		badge: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
		icon: CheckCircle2,
	},
	in_progress: {
		label: "В работе",
		badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
		icon: Play,
	},
	completed: {
		label: "Завершен",
		badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
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
		badge: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
		iconBg: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
		headerBg: "bg-rose-500/5",
		accentBorder: "border-rose-500/30",
	},
	3: {
		badge: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
		iconBg: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
		headerBg: "bg-purple-500/5",
		accentBorder: "border-purple-500/30",
	},
};

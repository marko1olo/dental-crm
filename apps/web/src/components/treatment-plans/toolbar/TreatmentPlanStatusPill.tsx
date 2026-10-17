import React from "react";
import { Check, Clock, ShieldCheck, Zap } from "lucide-react";
import type { TreatmentPlanStatus } from "../types";

export interface TreatmentPlanStatusPillProps {
	readonly planStatus: TreatmentPlanStatus;
	readonly onStatusTransition: (newStatus: TreatmentPlanStatus) => void;
	readonly planAgeDays: number;
}

const STATUS_CONFIG: Partial<Record<TreatmentPlanStatus, { label: string; icon: React.FC<{ size?: number; className?: string }> }>> = {
	draft: { label: "Черновик", icon: Clock },
	agreed: { label: "Согласован", icon: ShieldCheck },
	in_progress: { label: "В работе", icon: Zap },
	completed: { label: "Завершен", icon: Check },
};

export const TreatmentPlanStatusPill: React.FC<TreatmentPlanStatusPillProps> = ({
	planStatus,
	onStatusTransition,
	planAgeDays,
}) => {
	const current = STATUS_CONFIG[planStatus] ?? STATUS_CONFIG.draft!;
	const Icon = current.icon;

	return (
		<div className="flex items-center gap-1.5 shrink-0" data-testid="treatment-plan-status-pill">
			<div className="inline-flex p-0.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] gap-0.5">
				{(["draft", "agreed", "in_progress", "completed"] as TreatmentPlanStatus[]).map((st) => {
					const isActive = planStatus === st;
					const cfg = STATUS_CONFIG[st] ?? STATUS_CONFIG.draft!;
					const StIcon = cfg.icon;
					return (
						<button
							key={st}
							type="button"
							onClick={() => onStatusTransition(st)}
							className={`h-7 px-2 sm:px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
								isActive
									? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							data-testid={`tp-status-${st}`}
						>
							<StIcon size={12} className={isActive ? "text-teal-600 dark:text-teal-400" : "opacity-60"} />
							<span className="hidden sm:inline">{cfg.label}</span>
						</button>
					);
				})}
			</div>

			{planAgeDays > 30 && (
				<span
					className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 text-[11px] font-bold"
					title="План составлен более 30 дней назад"
				>
					&gt;30 дн.
				</span>
			)}
		</div>
	);
};

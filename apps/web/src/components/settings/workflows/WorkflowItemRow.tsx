import React from "react";
import { Pause, Play, Trash2 } from "lucide-react";
import type { ClinicWorkflow } from "../settingsWorkflowsPanel";
import { workflowTriggerLabel } from "../settingsWorkflowsPanel";

interface WorkflowItemRowProps {
	wf: ClinicWorkflow;
	isToggling: boolean;
	onToggle: (wf: ClinicWorkflow) => void;
	onDelete: (wf: ClinicWorkflow) => void;
}

export const WorkflowItemRow: React.FC<WorkflowItemRowProps> = ({
	wf,
	isToggling,
	onToggle,
	onDelete,
}) => {
	return (
		<div className="flex items-center justify-between p-3.5 border border-[var(--line)] rounded-xl bg-[var(--paper)]">
			<div className="min-w-0 pr-3">
				<h4 className="m-0 text-sm font-semibold text-[var(--ink)] truncate">{wf.name}</h4>
				<span className="text-xs text-[var(--muted)]">Событие: {workflowTriggerLabel(wf.trigger)}</span>
			</div>
			<div className="flex items-center gap-2 shrink-0">
				<button
					type="button"
					onClick={() => onToggle(wf)}
					disabled={isToggling}
					className={`h-9 min-h-[44px] px-3.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
						wf.active
							? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
							: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]"
					}`}
				>
					{wf.active ? <Play size={13} /> : <Pause size={13} />}
					<span>{wf.active ? "Активен" : "Остановлен"}</span>
				</button>
				<button
					type="button"
					onClick={() => onDelete(wf)}
					title="Удалить уведомление"
					className="w-9 h-9 min-h-[44px] min-w-[44px] rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 inline-flex items-center justify-center transition-colors cursor-pointer"
				>
					<Trash2 size={14} />
				</button>
			</div>
		</div>
	);
};

import React from "react";
import { CLINICAL_ACTIONS } from "./orthoProtocolTypes";

export interface OrthoClinicalActionsChecklistProps {
	selectedActions: string[];
	onToggleAction: (actionId: string) => void;
}

export const OrthoClinicalActionsChecklist: React.FC<OrthoClinicalActionsChecklistProps> = ({
	selectedActions,
	onToggleAction,
}) => {
	return (
		<div>
			<span className="block text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 mb-1.5">
				Манипуляции приёма
			</span>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
				{CLINICAL_ACTIONS.map((action) => {
					const isChecked = selectedActions.includes(action.id);
					return (
						<label
							key={action.id}
							className={`min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none ${
								isChecked
									? "bg-blue-50 dark:bg-blue-900/20 border-blue-400 text-blue-900 dark:text-blue-300"
									: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
							}`}
						>
							<input
								type="checkbox"
								checked={isChecked}
								onChange={() => onToggleAction(action.id)}
								className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
							/>
							<span>{action.label}</span>
						</label>
					);
				})}
			</div>
		</div>
	);
};

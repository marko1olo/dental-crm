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
			<span className="block text-xs font-black uppercase tracking-wider text-[var(--muted)] mb-1.5">
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
									? "bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--ink)] shadow-2xs"
									: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
						>
							<input
								type="checkbox"
								checked={isChecked}
								onChange={() => onToggleAction(action.id)}
								className="rounded border-[var(--line)] text-[var(--primary)] focus:ring-[var(--primary)] w-4 h-4 cursor-pointer accent-[var(--primary)]"
							/>
							<span>{action.label}</span>
						</label>
					);
				})}
			</div>
		</div>
	);
};

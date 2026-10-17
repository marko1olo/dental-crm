import { ChevronDown, History } from "lucide-react";
import React from "react";
import { DEFAULT_CALL_OUTCOMES, type OutcomeOption } from "./pastHistoryTypes";
import type { CallOutcome } from "../../../store/telephonyStore";

export interface IncomingCallOutcomePanelProps {
	showOutcomePanel: boolean;
	onToggleOutcomePanel: () => void;
	onRecordOutcome: (outcome: CallOutcome) => void;
	outcomes?: OutcomeOption[];
}

export function IncomingCallOutcomePanel({
	showOutcomePanel,
	onToggleOutcomePanel,
	onRecordOutcome,
	outcomes = DEFAULT_CALL_OUTCOMES,
}: IncomingCallOutcomePanelProps) {
	return (
		<div className="rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] overflow-hidden">
			<button
				type="button"
				onClick={onToggleOutcomePanel}
				className="w-full min-h-[40px] px-3 py-2 flex items-center justify-between text-[11px] font-bold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors cursor-pointer"
			>
				<span className="uppercase tracking-wider flex items-center gap-1.5">
					<History size={13} className="text-[var(--teal)]" />
					Фиксация исхода звонка
				</span>
				<ChevronDown size={14} className={`transition-transform duration-200 ${showOutcomePanel ? "rotate-180" : ""}`} />
			</button>
			{showOutcomePanel && (
				<div className="p-2.5 pt-0 grid grid-cols-2 gap-1.5 animate-in fade-in">
					{outcomes.map((item) => (
						<button
							key={item.action}
							type="button"
							onClick={() => onRecordOutcome(item.action)}
							className="min-h-[40px] px-2 py-1.5 rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--teal-surface)] border border-[var(--line,#e2e8f0)] text-xs font-semibold text-[var(--ink,#0f172a)] text-center transition-all cursor-pointer"
						>
							{item.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

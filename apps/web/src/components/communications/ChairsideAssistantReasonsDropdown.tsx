import { CLINICAL_ASSISTANT_REASONS_BY_SPECIALTY, type IntercomPresetKey } from "@dental/shared";
import React from "react";

export interface ChairsideAssistantReasonsDropdownProps {
	isOpen: boolean;
	onSelectReason: (presetKey: IntercomPresetKey, reason: string) => void;
}

export const ChairsideAssistantReasonsDropdown: React.FC<ChairsideAssistantReasonsDropdownProps> = ({
	isOpen, onSelectReason,
}) => {
	if (!isOpen) return null;

	return (
		<div className="absolute top-full left-0 mt-1.5 w-72 bg-[var(--paper-strong)] border border-[var(--line)] rounded-xl shadow-2xl p-2 z-50 max-h-80 overflow-y-auto">
			<div className="text-[11px] font-bold text-[var(--muted)] px-2 py-1 uppercase tracking-wider">
				Повод для вызова ассистента:
			</div>
			{CLINICAL_ASSISTANT_REASONS_BY_SPECIALTY.map((cat) => (
				<div key={cat.id} className="mb-2 last:mb-0">
					<div className="text-[10.5px] font-bold text-[var(--teal)] px-2 py-0.5 uppercase tracking-wider flex items-center gap-1.5">
						<span>{cat.icon}</span>
						<span>{cat.name}</span>
					</div>
					<div className="space-y-0.5 mt-0.5">
						{cat.reasons.map((r) => (
							<button
								key={r} type="button" onClick={() => onSelectReason("call_assistant", r)}
								className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-[var(--ink)] hover:bg-[var(--teal)]/15 hover:text-[var(--teal)] transition-all cursor-pointer font-medium"
							>
								{r}
							</button>
						))}
					</div>
				</div>
			))}
		</div>
	);
};

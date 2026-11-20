import React, { useState } from "react";
import { Check, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

interface FranklManagementStrategiesAccordionProps {
	readonly strategies: readonly string[];
}

export const FranklManagementStrategiesAccordion: React.FC<FranklManagementStrategiesAccordionProps> = ({
	strategies,
}) => {
	const [expanded, setExpanded] = useState<boolean>(false);

	return (
		<div className="space-y-2">
			<button
				type="button"
				onClick={() => setExpanded((prev) => !prev)}
				className="flex items-center justify-between w-full min-h-[44px] py-2 px-1 text-xs sm:text-sm font-bold text-[var(--ink-muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors cursor-pointer"
			>
				<span className="flex items-center gap-1.5 min-w-0">
					<Sparkles className="w-4 h-4 text-[var(--warning,#f59e0b)] shrink-0" />
					<span className="truncate">Рекомендованные техники психологической адаптации ({strategies.length})</span>
				</span>
				{expanded ? <ChevronUp className="w-4 h-4 shrink-0 ml-2" /> : <ChevronDown className="w-4 h-4 shrink-0 ml-2" />}
			</button>

			{expanded && (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 animate-in fade-in duration-150">
					{strategies.map((strat, idx) => (
						<div
							key={idx}
							className="p-3 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] flex items-start gap-2 text-xs sm:text-sm text-[var(--ink,#0f172a)] font-medium shadow-xs"
						>
							<Check className="w-4 h-4 text-[var(--success,#10b981)] shrink-0 mt-0.5" />
							<span>{strat}</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

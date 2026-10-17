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
				className="flex items-center justify-between w-full py-1.5 text-xs sm:text-sm font-bold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors cursor-pointer"
			>
				<span className="flex items-center gap-1.5 min-w-0">
					<Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
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
							<Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
							<span>{strat}</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

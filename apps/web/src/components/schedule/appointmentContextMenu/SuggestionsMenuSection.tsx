import React from "react";
import { AlertTriangle } from "lucide-react";
import type { ScheduleSuggestion } from "@dental/shared";

export function SuggestionsMenuSection({
	suggestions,
	onSelect,
}: {
	suggestions: ScheduleSuggestion[];
	onSelect: (section: string) => void;
}) {
	if (suggestions.length === 0) return null;

	return (
		<>
			<div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--warn-fg,var(--amber))]">
				Рекомендации
			</div>
			{suggestions.map((suggestion) => (
				<button
					type="button"
					key={suggestion.id}
					className="w-full text-left px-2.5 py-1.5 h-8 min-h-[32px] sm:h-8 sm:min-h-[32px] touch:min-h-[44px] rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper-hover,var(--paper-soft))] transition-colors flex items-center gap-2 cursor-pointer"
					role="menuitem"
					onClick={() => onSelect(suggestion.section)}
				>
					<AlertTriangle size={14} className="text-[var(--warn-fg,var(--amber))] shrink-0" />
					<span className="truncate">{suggestion.title}</span>
				</button>
			))}
		</>
	);
}

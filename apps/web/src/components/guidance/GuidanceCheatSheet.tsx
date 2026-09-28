/**
 * DENTE CRM — In-App Guidance Cheat Sheet Card
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Rule 7 Universal 3-Tier Architecture
 * Tier 2 Warm Context: Non-blocking, compact, quick assistance on demand.
 */

import React, { useState } from "react";
import { ChevronDown, ChevronUp, HelpCircle, Keyboard, Sparkles } from "lucide-react";
import { CLINICAL_SHORTCUTS, type ShortcutCategory } from "../../lib/keyboardShortcuts";

export interface GuidanceCheatSheetProps {
	readonly category?: ShortcutCategory;
	readonly defaultExpanded?: boolean;
	readonly onOpenFullModal?: () => void;
}

export const GuidanceCheatSheet: React.FC<GuidanceCheatSheetProps> = React.memo(({
	category,
	defaultExpanded = false,
	onOpenFullModal,
}) => {
	const [isExpanded, setIsExpanded] = useState(defaultExpanded);

	const shortcuts = React.useMemo(() => {
		if (!category) return CLINICAL_SHORTCUTS.slice(0, 5);
		return CLINICAL_SHORTCUTS.filter((s) => s.category === category).slice(0, 6);
	}, [category]);

	return (
		<div className="rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] overflow-hidden">
			{/* Accordion Toggle Header */}
			<div className="p-2.5 flex items-center justify-between gap-2">
				<button
					type="button"
					onClick={() => setIsExpanded(!isExpanded)}
					className="flex items-center gap-2 font-medium text-[var(--ink)] hover:text-teal-500 transition-colors text-left flex-1 cursor-pointer"
					aria-expanded={isExpanded}
				>
					<Keyboard size={14} className="text-teal-500 shrink-0" />
					<span>Быстрые клавиши рабочего места</span>
					<span className="text-[10px] text-[var(--muted)]">({shortcuts.length})</span>
					{isExpanded ? <ChevronUp size={14} className="text-[var(--muted)]" /> : <ChevronDown size={14} className="text-[var(--muted)]" />}
				</button>

				{onOpenFullModal && (
					<button
						type="button"
						onClick={onOpenFullModal}
						className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer shrink-0"
					>
						Все клавиши (?)
					</button>
				)}
			</div>

			{/* Expanded Content */}
			{isExpanded && (
				<div className="p-3 pt-0 border-t border-[var(--line)]/50 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
					{shortcuts.map((item) => (
						<div
							key={item.id}
							className="p-1.5 rounded bg-[var(--paper)] border border-[var(--line)]/50 flex items-center justify-between gap-2"
						>
							<span className="text-[11px] text-[var(--muted)] truncate" title={item.title}>
								{item.title}
							</span>
							<kbd className="px-1.5 py-0.2 bg-[var(--paper-soft)] rounded border border-[var(--line)] font-mono text-[10px] font-bold text-[var(--ink)] shrink-0">
								{item.keyCombination}
							</kbd>
						</div>
					))}
				</div>
			)}
		</div>
	);
});

GuidanceCheatSheet.displayName = "GuidanceCheatSheet";

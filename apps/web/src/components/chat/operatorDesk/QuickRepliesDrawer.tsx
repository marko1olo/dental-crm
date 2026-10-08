import React from "react";
import { Sparkles } from "lucide-react";
import { CLINICAL_QUICK_REPLIES } from "./constants";

export interface QuickRepliesDrawerProps {
	onSelectReply: (text: string) => void;
}

export function QuickRepliesDrawer({ onSelectReply }: QuickRepliesDrawerProps) {
	return (
		<div className="px-3 py-2 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center gap-1.5 overflow-x-auto scrollbar-none">
			<span className="text-[10px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider shrink-0 flex items-center gap-1">
				<Sparkles size={11} className="text-teal-600" />
				<span>Шаблоны:</span>
			</span>
			{CLINICAL_QUICK_REPLIES.map((tpl, idx) => (
				<button
					// biome-ignore lint/suspicious/noArrayIndexKey: pure static list
					key={idx}
					type="button"
					onClick={() => onSelectReply(tpl.text)}
					className="shrink-0 h-7 px-3 rounded-full text-[12.5px] font-medium border border-teal-500/20 bg-teal-50 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors cursor-pointer min-w-max"
					title={tpl.text}
				>
					{tpl.label}
				</button>
			))}
		</div>
	);
}

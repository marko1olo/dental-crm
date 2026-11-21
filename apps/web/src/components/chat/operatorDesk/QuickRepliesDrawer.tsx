import React from "react";
import { Sparkles } from "lucide-react";
import { CLINICAL_QUICK_REPLIES } from "./constants";

export interface QuickRepliesDrawerProps {
	onSelectReply: (text: string) => void;
}

export function QuickRepliesDrawer({ onSelectReply }: QuickRepliesDrawerProps) {
	return (
		<div className="px-3 py-2 border-t border-[var(--line)] bg-[var(--paper-soft)] flex items-center gap-2 overflow-x-auto scrollbar-none">
			<span className="text-[11px] font-medium text-[var(--muted)] shrink-0 flex items-center gap-1">
				<Sparkles size={11} className="text-[var(--teal)]" />
				<span>Шаблоны:</span>
			</span>
			{CLINICAL_QUICK_REPLIES.map((tpl, idx) => (
				<button
					// biome-ignore lint/suspicious/noArrayIndexKey: pure static list
					key={idx}
					type="button"
					onClick={() => onSelectReply(tpl.text)}
					className="shrink-0 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium border border-[var(--teal)]/25 bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--teal-dark,#0f766e)] dark:text-[var(--teal-light,#2dd4bf)] hover:bg-[var(--teal-soft,rgba(13,148,136,0.2))] transition-colors cursor-pointer min-w-max inline-flex items-center"
					title={tpl.text}
				>
					{tpl.label}
				</button>
			))}
		</div>
	);
}

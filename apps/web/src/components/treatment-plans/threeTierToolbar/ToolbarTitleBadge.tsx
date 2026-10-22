import React from "react";
import { Sparkles } from "lucide-react";

export const ToolbarTitleBadge: React.FC = () => {
	return (
		<div className="flex items-center gap-2 min-w-0">
			<Sparkles size={15} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
			<span className="font-bold text-xs text-[var(--ink)] whitespace-nowrap" title="3-Tier Сравнение планов">
				Варианты лечения <span className="sr-only">3-Tier Сравнение планов</span>
			</span>
			<span className="text-[12px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20 whitespace-nowrap">
				СтАР
			</span>
		</div>
	);
};

import React from "react";
import { CircleDot, Layers } from "lucide-react";
import type { JawOrOcclusionTarget } from "./jawOcclusionTypes";

export interface JawOcclusionTabsProps {
	readonly activeTab: JawOrOcclusionTarget;
	readonly onSelectTab: (tab: JawOrOcclusionTarget) => void;
}

export const JawOcclusionTabs: React.FC<JawOcclusionTabsProps> = ({
	activeTab,
	onSelectTab,
}) => {
	return (
		<div className="p-3 border-b border-[var(--odontogram-border-subtle,#e2e8f0)] bg-[var(--odontogram-surface-hover,#f1f5f9)]/50">
			<div
				className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[var(--odontogram-paper,#ffffff)] border border-[var(--odontogram-border-subtle,#e2e8f0)] shadow-2xs"
				role="tablist"
			>
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "JU"}
					onClick={() => onSelectTab("JU")}
					className={`min-h-[44px] sm:min-h-[32px] px-3 py-2 rounded-lg text-xs font-black transition-all cursor-pointer select-none flex items-center justify-center gap-1.5 touch-manipulation ${
						activeTab === "JU"
							? "bg-indigo-600 text-white shadow-xs"
							: "text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)]"
					}`}
					data-testid="jaw-tab-ju"
				>
					<Layers size={14} />
					<span>В/Ч (JU) Верхняя</span>
				</button>

				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "C"}
					onClick={() => onSelectTab("C")}
					className={`min-h-[44px] sm:min-h-[32px] px-3 py-2 rounded-lg text-xs font-black transition-all cursor-pointer select-none flex items-center justify-center gap-1.5 touch-manipulation ${
						activeTab === "C"
							? "bg-purple-600 text-white shadow-xs"
							: "text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)]"
					}`}
					data-testid="jaw-tab-c"
				>
					<CircleDot size={14} />
					<span>Прикус (C) Окклюзия</span>
				</button>

				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "JL"}
					onClick={() => onSelectTab("JL")}
					className={`min-h-[44px] sm:min-h-[32px] px-3 py-2 rounded-lg text-xs font-black transition-all cursor-pointer select-none flex items-center justify-center gap-1.5 touch-manipulation ${
						activeTab === "JL"
							? "bg-indigo-600 text-white shadow-xs"
							: "text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)]"
					}`}
					data-testid="jaw-tab-jl"
				>
					<Layers size={14} />
					<span>Н/Ч (JL) Нижняя</span>
				</button>
			</div>
		</div>
	);
};

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
		<div className="p-3 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f1f5f9)]/50">
			<div
				className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] shadow-2xs"
				role="tablist"
			>
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "JU"}
					onClick={() => onSelectTab("JU")}
					className={`min-h-[44px] sm:min-h-[36px] px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer select-none flex items-center justify-center gap-1.5 touch-manipulation ${
						activeTab === "JU"
							? "bg-[var(--teal,#0d9488)] text-white shadow-xs"
							: "text-[var(--ink-muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)]"
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
					className={`min-h-[44px] sm:min-h-[36px] px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer select-none flex items-center justify-center gap-1.5 touch-manipulation ${
						activeTab === "C"
							? "bg-[var(--teal,#0d9488)] text-white shadow-xs"
							: "text-[var(--ink-muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)]"
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
					className={`min-h-[44px] sm:min-h-[36px] px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer select-none flex items-center justify-center gap-1.5 touch-manipulation ${
						activeTab === "JL"
							? "bg-[var(--teal,#0d9488)] text-white shadow-xs"
							: "text-[var(--ink-muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)]"
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

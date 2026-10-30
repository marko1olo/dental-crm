/**
 * PerioWorkspaceTabsNav.tsx — Навигационная панель переключения вкладок
 * Вкладка 1: Экспресс-скрининг PSR (6 секстантов)
 * Вкладка 2: Пародонтограмма (32 зуба, клавиши 1–9)
 */

import React from "react";
import { Layers, FileText } from "lucide-react";

export interface PerioWorkspaceTabsNavProps {
	readonly activeTab: "psr" | "chart";
	readonly onTabChange: (tab: "psr" | "chart") => void;
}

export const PerioWorkspaceTabsNav: React.FC<PerioWorkspaceTabsNavProps> = React.memo(({
	activeTab,
	onTabChange,
}) => {
	return (
		<div className="flex items-center gap-2 border-b border-[var(--line)] pb-2 overflow-x-auto">
			<button
				type="button"
				onClick={() => onTabChange("psr")}
				className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer transition-all shrink-0 whitespace-nowrap ${
					activeTab === "psr"
						? "bg-[#0d9488]/15 text-[#0d9488] border border-[#0d9488]/40 shadow-xs"
						: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
				}`}
			>
				<Layers className="w-4 h-4 shrink-0" />
				<span className="hidden sm:inline">Вкладка 1:</span> Экспресс-скрининг PSR (6 секстантов)
			</button>
			<button
				type="button"
				onClick={() => onTabChange("chart")}
				className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer transition-all shrink-0 whitespace-nowrap ${
					activeTab === "chart"
						? "bg-[#0d9488]/15 text-[#0d9488] border border-[#0d9488]/40 shadow-xs"
						: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
				}`}
			>
				<FileText className="w-4 h-4 shrink-0" />
				<span className="hidden sm:inline">Вкладка 2:</span> Пародонтограмма (32 зуба, клавиши 1–9)
			</button>
		</div>
	);
});

PerioWorkspaceTabsNav.displayName = "PerioWorkspaceTabsNav";

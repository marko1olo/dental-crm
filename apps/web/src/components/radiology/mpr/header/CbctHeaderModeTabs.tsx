/**
 * CbctHeaderModeTabs.tsx — Вкладки рабочих пространств КЛКТ-студии (Мандат 8b).
 */

import React from "react";
import { CBCT_WORKSPACE_TABS, type StudioMode } from "../cbctStudioTypes";

export interface CbctHeaderModeTabsProps {
	readonly studioMode: StudioMode;
	readonly onSelectStudioMode: (mode: StudioMode) => void;
}

export const CbctHeaderModeTabs: React.FC<CbctHeaderModeTabsProps> = ({
	studioMode,
	onSelectStudioMode,
}) => {
	return (
		<div className="hidden lg:flex items-center gap-1 bg-[var(--paper)] p-1 rounded-lg border border-[var(--line)]">
			{CBCT_WORKSPACE_TABS.map((tab) => {
				const isActive = studioMode === tab.key;
				return (
					<button
						key={tab.key}
						type="button"
						onClick={() => onSelectStudioMode(tab.key)}
						className={`px-2 sm:px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap h-7 min-h-0 flex items-center gap-1.5 transition-colors cursor-pointer border ${
							isActive
								? "bg-zinc-800/90 text-zinc-200 border-zinc-700/80 shadow-xs"
								: "bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
						}`}
						title={tab.descriptionRu}
					>
						<span>{tab.labelRu}</span>
					</button>
				);
			})}
		</div>
	);
};

import React from "react";
import type { TabItemConfig, VisitSubViewTab } from "./visitMainTabDefinitions";

export interface VisitMainTabButtonProps {
	readonly tab: TabItemConfig;
	readonly isActive: boolean;
	readonly onSelect: (tab: VisitSubViewTab) => void;
}

export function VisitMainTabButton({ tab, isActive, onSelect }: VisitMainTabButtonProps) {
	const Icon = tab.icon;
	return (
		<button
			type="button"
			role="tab"
			data-testid={tab.testId}
			aria-selected={isActive}
			className={`secondary-button shrink-0 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1 ${tab.minHeightClass || "min-h-[38px] sm:min-h-[32px] h-9 sm:h-8"} inline-flex items-center justify-center gap-1 sm:gap-1.5 touch-manipulation focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))] focus:outline-none transition-colors ${isActive ? "active" : ""}`}
			style={{
				background: isActive ? "var(--teal-dark)" : undefined,
				color: isActive ? "var(--on-teal)" : undefined,
			}}
			onClick={() => onSelect(tab.id)}
		>
			<Icon size={14} className="shrink-0" />
			<span className="whitespace-nowrap flex-shrink-0 min-w-max">
				{tab.shortLabel === tab.fullLabel ? (
					tab.shortLabel
				) : (
					<>
						<span className="sm:hidden">{tab.shortLabel}</span>
						<span className="hidden sm:inline">{tab.fullLabel}</span>
					</>
				)}
			</span>
		</button>
	);
}

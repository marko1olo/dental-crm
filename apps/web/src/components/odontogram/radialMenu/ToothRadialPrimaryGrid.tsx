import type React from "react";
import type { ToothState } from "../ToothChart";
import type { RadialMenuItem } from "./radialMenuTypes";

export interface ToothRadialPrimaryGridProps {
	readonly primaryItems: readonly RadialMenuItem[];
	readonly currentState?: ToothState | undefined;
	readonly selectedSurfaces: readonly string[];
	readonly surfaces?: readonly string[] | undefined;
	readonly onSelectWithHaptic: (state: ToothState, surfs?: readonly string[]) => void;
	readonly isMobile?: boolean | undefined;
}

export const ToothRadialPrimaryGrid: React.FC<ToothRadialPrimaryGridProps> = ({
	primaryItems,
	currentState,
	selectedSurfaces,
	surfaces,
	onSelectWithHaptic,
	isMobile = false,
}) => {
	const activeSurfaces = selectedSurfaces.length > 0 ? selectedSurfaces : surfaces;

	return (
		<div className="grid grid-cols-2 gap-1.5 sm:gap-2 w-full">
			{primaryItems.map((item) => {
				const isCurrent = currentState === item.state;
				return (
					<button
						key={item.id}
						type="button"
						onClick={() => item.state && onSelectWithHaptic(item.state, activeSurfaces)}
						className={`${
							isMobile
								? "radial-item-btn min-h-[50px] min-w-[48px] px-3 py-2.5"
								: "min-h-[38px] px-2.5 py-1.5"
						} rounded-xl font-bold flex items-center justify-between gap-1.5 transition-all active:scale-[0.98] cursor-pointer border ${
							isCurrent
								? "bg-[var(--paper-soft)] border-teal-500 ring-2 ring-teal-500/30 text-[var(--ink)] font-black shadow-xs"
								: "bg-[var(--paper)] border-[var(--line)] hover:border-teal-500/50 hover:bg-[var(--paper-soft)] text-[var(--ink)]"
						}`}
						title={item.label}
						data-testid={`radial-btn-${item.id}`}
					>
						<div className="flex items-center gap-2 min-w-0">
							<span className="shrink-0 flex items-center justify-center">{item.icon}</span>
							<span className={`${isMobile ? "text-sm" : "text-xs"} font-extrabold truncate`}>
								{item.shortLabel}
							</span>
						</div>
						<span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--paper-soft)] text-[var(--muted)] font-mono font-bold shrink-0 border border-[var(--line-subtle)]">
							{item.hotkey}
						</span>
					</button>
				);
			})}
		</div>
	);
};

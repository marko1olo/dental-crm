import { ChevronDown, ChevronUp } from "lucide-react";
import type React from "react";
import type { ToothState } from "../ToothChart";
import type { RadialMenuItem } from "./radialMenuTypes";

export interface ToothRadialSecondaryAccordionProps {
	readonly secondaryItems: readonly RadialMenuItem[];
	readonly currentState?: ToothState | undefined;
	readonly selectedSurfaces: readonly string[];
	readonly surfaces?: readonly string[] | undefined;
	readonly onSelectWithHaptic: (state: ToothState, surfs?: readonly string[]) => void;
	readonly isOpen: boolean;
	readonly setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly isMobile?: boolean | undefined;
}

export const ToothRadialSecondaryAccordion: React.FC<ToothRadialSecondaryAccordionProps> = ({
	secondaryItems,
	currentState,
	selectedSurfaces,
	surfaces,
	onSelectWithHaptic,
	isOpen,
	setIsOpen,
	isMobile = false,
}) => {
	const activeSurfaces = selectedSurfaces.length > 0 ? selectedSurfaces : surfaces;

	return (
		<div className="flex flex-col gap-1">
			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				className="flex items-center justify-between px-2 py-1 rounded-lg text-[11px] font-bold text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer select-none border-0 bg-transparent"
			>
				<span className="flex items-center gap-1">
					<span>Другие клинические статусы</span>
					<span className="text-[10px] text-[var(--muted)] font-normal">
						(Периодонтит, Имплант, Корень)
					</span>
				</span>
				{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
			</button>

			{isOpen && (
				<div className="grid grid-cols-2 gap-1.5 p-2 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
					{secondaryItems.map((item) => {
						const isCurrent = currentState === item.state;
						return (
							<button
								key={item.id}
								type="button"
								onClick={() => item.state && onSelectWithHaptic(item.state, activeSurfaces)}
								className={`${
									isMobile ? "min-h-[44px] text-xs px-2.5 py-1.5" : "min-h-[32px] text-xs px-2 py-1"
								} rounded-lg font-bold flex items-center justify-between gap-1.5 transition-all cursor-pointer border ${
									isCurrent
										? "bg-[var(--paper)] border-teal-500 font-black ring-1 ring-teal-500/30 text-[var(--ink)]"
										: "bg-[var(--paper)] border-[var(--line)] hover:border-teal-500/40 text-[var(--ink)]"
								}`}
								title={item.label}
								data-testid={`radial-btn-${item.id}`}
							>
								<div className="flex items-center gap-1.5 min-w-0">
									<span className="shrink-0">{item.icon}</span>
									<span className="text-[11px] truncate font-bold">{item.shortLabel}</span>
								</div>
								<span className="text-[9px] px-1 py-0.2 rounded bg-[var(--paper-soft)] text-[var(--muted)] font-mono font-bold">
									{item.hotkey}
								</span>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
};

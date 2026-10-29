import type React from "react";
import { SURFACE_CHIPS } from "./radialMenuPresets";

export interface ToothRadialSurfaceBarProps {
	readonly isPrimary: boolean;
	readonly selectedSurfaces: readonly string[];
	readonly setSelectedSurfaces: React.Dispatch<React.SetStateAction<string[]>>;
	readonly onSelectSurfaces?: ((surfaces: readonly string[]) => void) | undefined;
	readonly isMobile?: boolean | undefined;
}

export const ToothRadialSurfaceBar: React.FC<ToothRadialSurfaceBarProps> = ({
	isPrimary,
	selectedSurfaces,
	setSelectedSurfaces,
	onSelectSurfaces,
	isMobile = false,
}) => {
	if (isPrimary) return null;

	const testIdPrefix = isMobile ? "radial-mobile-quick-surf" : "radial-desktop-quick-surf";

	return (
		<div className="flex flex-col gap-1 px-2 py-1.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
			<div className="flex items-center justify-between">
				<span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
					{isMobile ? "Поверхности (1 тап):" : "Поверхности:"}
				</span>
				<span className="text-[10px] font-mono font-bold text-[var(--teal)]">
					{selectedSurfaces.length > 0 ? selectedSurfaces.join("") : "вся коронка"}
				</span>
			</div>
			<div className="flex items-center gap-1 flex-wrap">
				{SURFACE_CHIPS.map((chip) => {
					const isMatch =
						chip.surfs.length === selectedSurfaces.length &&
						chip.surfs.every((s) => selectedSurfaces.includes(s));
					return (
						<button
							key={chip.label}
							type="button"
							onClick={() => {
								const next = isMatch ? [] : [...chip.surfs];
								setSelectedSurfaces(next);
								onSelectSurfaces?.(next);
							}}
							className={`${isMobile ? "min-h-[44px] min-w-[44px] text-xs px-3 py-1.5" : "min-h-[26px] text-[11px] px-2 py-0.5"} rounded-md font-mono font-black border transition-all cursor-pointer select-none flex items-center justify-center ${
								isMatch
									? "bg-teal-600 text-white border-teal-600 shadow-2xs scale-105"
									: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-hover)]"
							}`}
							title={chip.title}
							data-testid={`${testIdPrefix}-${chip.label.replace("/", "-")}`}
						>
							[{chip.label}]
						</button>
					);
				})}
			</div>
		</div>
	);
};

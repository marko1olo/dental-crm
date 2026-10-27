import React from "react";
import { SHADE_SWATCH_MAP } from "../labShadesData";

interface DentalLabBleachGridProps {
	readonly selectedShade: string;
	readonly onSelectShade: (shade: string) => void;
}

export function DentalLabBleachGrid({
	selectedShade,
	onSelectShade,
}: DentalLabBleachGridProps) {
	return (
		<div className="space-y-2">
			<div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
				<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] w-28 shrink-0">
					3D Bleach:
				</span>
				<div className="flex flex-wrap items-center gap-1.5 flex-1 max-w-full overflow-x-auto scrollbar-none overscroll-contain py-0.5">
					{["0M1", "0M2", "0M3"].map((shade) => {
						const isSelected = selectedShade === shade;
						const swatch = SHADE_SWATCH_MAP[shade];

						return (
							<button
								key={shade}
								type="button"
								onClick={() => onSelectShade(shade)}
								aria-label={`Оттенок 3D Bleach ${shade}`}
								title={
									swatch
										? `${shade}: ${swatch.desc}`
										: `Выбрать оттенок ${shade}`
								}
								className={`min-h-[44px] sm:min-h-[48px] min-w-[56px] sm:min-w-[64px] px-2.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98] ${
									isSelected
										? "bg-[var(--teal,#0d9488)] text-white ring-2 ring-[var(--teal,#0d9488)] ring-offset-1 shadow-2xs font-extrabold"
										: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)] hover:border-[var(--line-strong)] hover:bg-[var(--paper-soft,#f8fafc)] shadow-2xs"
								}`}
								data-testid={`vita-shade-${shade}`}
							>
								<span
									className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/20 dark:border-white/30 shadow-2xs"
									style={{
										backgroundColor: swatch?.bg || "#ffffff",
										borderColor: swatch?.border || "#ded9cc",
									}}
									aria-hidden="true"
								/>
								<span>{shade}</span>
							</button>
						);
					})}
				</div>
			</div>

			<div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
				<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] w-28 shrink-0">
					Ivoclar Bleach:
				</span>
				<div className="flex flex-wrap items-center gap-1.5 flex-1 max-w-full overflow-x-auto scrollbar-none overscroll-contain py-0.5">
					{["BL1", "BL2", "BL3", "BL4"].map((shade) => {
						const isSelected = selectedShade === shade;
						const swatch = SHADE_SWATCH_MAP[shade];

						return (
							<button
								key={shade}
								type="button"
								onClick={() => onSelectShade(shade)}
								aria-label={`Оттенок Ivoclar Bleach ${shade}`}
								title={
									swatch
										? `${shade}: ${swatch.desc}`
										: `Выбрать оттенок ${shade}`
								}
								className={`min-h-[44px] sm:min-h-[48px] min-w-[56px] sm:min-w-[64px] px-2.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98] ${
									isSelected
										? "bg-[var(--teal,#0d9488)] text-white ring-2 ring-[var(--teal,#0d9488)] ring-offset-1 shadow-2xs font-extrabold"
										: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)] hover:border-[var(--line-strong)] hover:bg-[var(--paper-soft,#f8fafc)] shadow-2xs"
								}`}
								data-testid={`vita-shade-${shade}`}
							>
								<span
									className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/20 dark:border-white/30 shadow-2xs"
									style={{
										backgroundColor: swatch?.bg || "#ffffff",
										borderColor: swatch?.border || "#ded9cc",
									}}
									aria-hidden="true"
								/>
								<span>{shade}</span>
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
}

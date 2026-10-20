import React from "react";
import { SHADE_SWATCH_MAP, VITA_CLASSICAL_GROUPS } from "../labShadesData";

interface DentalLabClassicalGridProps {
	readonly selectedShade: string;
	readonly onSelectShade: (shade: string) => void;
}

export function DentalLabClassicalGrid({
	selectedShade,
	onSelectShade,
}: DentalLabClassicalGridProps) {
	return (
		<div className="space-y-2">
			{VITA_CLASSICAL_GROUPS.map((grp) => (
				<div
					key={grp.id}
					className="flex flex-wrap items-center gap-1.5"
					data-testid={`vita-classical-group-${grp.id}`}
				>
					<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] w-16 shrink-0">
						Гр. {grp.id}:
					</span>
					<div className="flex flex-wrap items-center gap-1.5 flex-1">
						{grp.shades.map((shade) => {
							const isSelected = selectedShade === shade;
							const swatch = SHADE_SWATCH_MAP[shade];

							return (
								<button
									key={shade}
									type="button"
									onClick={() => onSelectShade(shade)}
									aria-label={`Оттенок ${shade}`}
									title={
										swatch
											? `${shade}: ${swatch.desc}`
											: `Выбрать оттенок ${shade}`
									}
									className={`min-h-[48px] min-w-[56px] px-2.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
										isSelected
											? "bg-teal-600 text-white ring-2 ring-teal-500 ring-offset-1 shadow-sm font-extrabold"
											: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)] hover:bg-[var(--paper-soft,#f8fafc)]"
									}`}
									data-testid={`vita-shade-${shade}`}
								>
									<span
										className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/20 dark:border-white/30 shadow-2xs"
										style={{
											backgroundColor: swatch?.bg || "#f5f0eb",
											borderColor: swatch?.border || "#d1c7bd",
										}}
										aria-hidden="true"
									/>
									<span>{shade}</span>
								</button>
							);
						})}
					</div>
				</div>
			))}

			{/* Дополнительная строка Bleach (BL1..BL4) прямо в Classical для быстрой доступности */}
			<div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/80 dark:border-slate-700/80">
				<span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 w-16 shrink-0">
					Bleach:
				</span>
				<div className="flex flex-wrap items-center gap-1.5 flex-1">
					{["BL1", "BL2", "BL3", "BL4"].map((shade) => {
						const isSelected = selectedShade === shade;
						const swatch = SHADE_SWATCH_MAP[shade];

						return (
							<button
								key={shade}
								type="button"
								onClick={() => onSelectShade(shade)}
								aria-label={`Оттенок Bleach ${shade}`}
								title={
									swatch
										? `${shade}: ${swatch.desc}`
										: `Выбрать оттенок ${shade}`
								}
								className={`min-h-[48px] min-w-[56px] px-2.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
									isSelected
										? "bg-teal-600 text-white ring-2 ring-teal-500 ring-offset-1 shadow-sm font-extrabold"
										: "bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50"
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

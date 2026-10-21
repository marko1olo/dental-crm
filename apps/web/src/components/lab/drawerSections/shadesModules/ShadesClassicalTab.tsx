import React from "react";
import { VITA_CLASSICAL_GROUPS, SHADE_SWATCH_MAP } from "../../labShadesData";

const BLEACH_QUICK_SHADES = ["BL1", "BL2", "BL3", "BL4"] as const;

export interface ShadesClassicalTabProps {
	formVitaShade: string;
	setFormVitaShade: (val: string) => void;
}

export function ShadesClassicalTab({
	formVitaShade, setFormVitaShade,
}: ShadesClassicalTabProps): React.JSX.Element {
	return (
		<div className="space-y-1.5" data-testid="vita-classical-content">
			{VITA_CLASSICAL_GROUPS.map((grp) => (
				<div key={grp.id} className="flex items-center gap-1.5" data-testid={`vita-drawer-group-${grp.id}`}>
					<span className="text-[10px] font-bold text-[var(--muted,#64748b)] w-10 shrink-0" title={grp.descRu}>
						Гр. {grp.id}:
					</span>
					<div className="flex items-center gap-1 flex-wrap flex-1">
						{grp.shades.map((shade) => {
							const isSelected = formVitaShade === shade;
							const swatch = SHADE_SWATCH_MAP[shade];
							return (
								<button
									key={shade}
									type="button"
									onClick={() => setFormVitaShade(shade)}
									data-testid={`form-shade-chip-${shade}`}
									title={`${shade}: ${swatch?.desc || grp.toneRu}`}
									className={`min-h-[32px] min-w-[42px] px-2 py-1 rounded-lg border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs font-mono font-bold shadow-2xs ${
										isSelected
											? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)] text-white ring-2 ring-[var(--teal,#0d9488)]/40 shadow-xs"
											: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal)] hover:bg-[var(--paper-soft)]"
									}`}
								>
									<span className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0 shadow-2xs" style={{ backgroundColor: swatch?.bg || "#f0eae0" }} aria-hidden="true" />
									<span>{shade}</span>
								</button>
							);
						})}
					</div>
				</div>
			))}

			<div className="flex items-center gap-1.5 pt-1 border-t border-[var(--line,#cbd5e1)]/60">
				<span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 w-10 shrink-0">
					Bleach:
				</span>
				<div className="flex items-center gap-1 flex-wrap flex-1">
					{BLEACH_QUICK_SHADES.map((shade) => {
						const isSelected = formVitaShade === shade;
						const swatch = SHADE_SWATCH_MAP[shade];
						return (
							<button
								key={shade}
								type="button"
								onClick={() => setFormVitaShade(shade)}
								data-testid={`form-shade-chip-${shade}`}
								title={`${shade}: ${swatch?.desc || "Bleach"}`}
								className={`min-h-[32px] min-w-[42px] px-2 py-1 rounded-lg border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs font-mono font-bold shadow-2xs ${
									isSelected
										? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)] text-white ring-2 ring-[var(--teal,#0d9488)]/40 shadow-xs"
										: "border-amber-300 dark:border-amber-700/60 bg-amber-50/60 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100 hover:border-amber-500"
								}`}
							>
								<span className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0 shadow-2xs" style={{ backgroundColor: swatch?.bg || "#ffffff" }} aria-hidden="true" />
								<span>{shade}</span>
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
}

import React from "react";
import { VITA_3D_MASTER_GROUPS, SHADE_SWATCH_MAP } from "../../labShadesData";

export interface Shades3DMasterTabProps {
	formVitaShade: string;
	setFormVitaShade: (val: string) => void;
}

export function Shades3DMasterTab({
	formVitaShade, setFormVitaShade,
}: Shades3DMasterTabProps): React.JSX.Element {
	return (
		<div className="space-y-1.5" data-testid="vita-3dmaster-content">
			{VITA_3D_MASTER_GROUPS.map((grp) => (
				<div key={grp.level} className="flex items-center gap-1.5" data-testid={`vita-drawer-3dgroup-${grp.level}`}>
					<span className="text-[10px] font-bold text-[var(--muted,#64748b)] w-10 shrink-0" title={grp.descRu}>
						L{grp.level}:
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
									title={`${shade}: ${swatch?.desc || grp.descRu}`}
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
		</div>
	);
}

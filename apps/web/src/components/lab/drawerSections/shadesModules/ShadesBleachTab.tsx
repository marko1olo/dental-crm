import React from "react";
import { VITA_BLEACH_SHADES_CLASSIFIED, SHADE_SWATCH_MAP } from "../../labShadesData";

export interface ShadesBleachTabProps {
	formVitaShade: string;
	setFormVitaShade: (val: string) => void;
}

export function ShadesBleachTab({
	formVitaShade, setFormVitaShade,
}: ShadesBleachTabProps): React.JSX.Element {
	return (
		<div className="space-y-1.5" data-testid="vita-bleach-content">
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
				{VITA_BLEACH_SHADES_CLASSIFIED.map((item) => {
					const isSelected = formVitaShade === item.id;
					const swatch = SHADE_SWATCH_MAP[item.id];
					return (
						<button
							key={item.id}
							type="button"
							onClick={() => setFormVitaShade(item.id)}
							data-testid={`form-shade-chip-${item.id}`}
							title={`${item.name} — ${item.descRu}`}
							className={`min-h-[38px] p-1.5 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2 text-xs font-bold shadow-2xs ${
								isSelected
									? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)] text-white ring-2 ring-[var(--teal,#0d9488)]/40 shadow-xs"
									: "border-amber-300 dark:border-amber-700/60 bg-amber-50/60 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100 hover:border-amber-500"
							}`}
						>
							<span
								className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0 shadow-2xs"
								style={{ backgroundColor: swatch?.bg || "#ffffff" }}
								aria-hidden="true"
							/>
							<div className="min-w-0">
								<div className="font-mono font-black text-xs leading-tight">{item.name}</div>
								<div className={`text-[10px] truncate ${isSelected ? "text-teal-100" : "text-amber-700 dark:text-amber-300"}`}>
									{item.system === "3d_bleach" ? "VITA 3D" : "Ivoclar"}
								</div>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}

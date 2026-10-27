import React from "react";
import { SHADE_SWATCH_MAP, VITA_CLASSICAL_GROUPS } from "../labMath";

export interface DentalLabExpressClassicalGroupsProps {
	readonly currentShade: string;
	readonly onSelectShade: (shade: string) => void;
}

export const DentalLabExpressClassicalGroups: React.FC<
	DentalLabExpressClassicalGroupsProps
> = ({ currentShade, onSelectShade }) => {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
			{VITA_CLASSICAL_GROUPS.map((grp) => (
				<div
					key={grp.id}
					className="p-2.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] shadow-2xs space-y-1.5"
					data-testid={`vita-classical-group-${grp.id}`}
				>
					<div className="flex items-center justify-between border-b border-[var(--line,#cbd5e1)] pb-1">
						<span className="text-xs font-bold text-[var(--ink,#0f172a)]">
							{grp.name}
						</span>
						<span className="text-[10px] font-semibold text-[var(--muted,#64748b)]">
							{grp.toneRu}
						</span>
					</div>
					<div className="grid grid-cols-4 gap-1">
						{grp.shades.map((shade) => {
							const isSelected = currentShade === shade;
							const swatch = SHADE_SWATCH_MAP[shade];
							return (
								<button
									key={shade}
									type="button"
									onClick={() => onSelectShade(shade)}
									data-testid={`shade-chip-${shade}`}
									className={`min-h-[44px] sm:min-h-[36px] py-1 px-1 rounded-lg border flex flex-col items-center justify-center gap-0.5 cursor-pointer transition shadow-2xs active:scale-[0.98] ${
										isSelected
											? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)] font-bold text-white ring-2 ring-[var(--teal,#0d9488)]"
											: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--line-strong)] hover:bg-[var(--paper-soft)]"
									}`}
									title={`${shade}: ${swatch?.desc || ""}`}
								>
									<div
										className="w-2.5 h-2.5 rounded-full border border-slate-400 shrink-0"
										style={{ backgroundColor: swatch?.bg || "#f0eae0" }}
									/>
									<span className="text-[11px] font-bold">{shade}</span>
								</button>
							);
						})}
					</div>
				</div>
			))}
		</div>
	);
};

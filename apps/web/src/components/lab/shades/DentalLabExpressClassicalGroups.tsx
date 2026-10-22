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
						<span className="text-[10px] font-semibold text-teal-700 dark:text-teal-300">
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
									className={`min-h-[36px] py-1 px-1 rounded-md border flex flex-col items-center justify-center gap-0.5 cursor-pointer transition shadow-2xs ${
										isSelected
											? "border-teal-600 bg-teal-500/15 font-bold text-teal-900 dark:text-teal-100 ring-1 ring-teal-500"
											: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal)]"
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

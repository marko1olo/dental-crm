import { SHADE_SWATCH_MAP, VITA_3D_MASTER_GROUPS } from "../labShadesData";

interface DentalLab3dMasterGridProps {
	readonly selectedShade: string;
	readonly onSelectShade: (shade: string) => void;
}

export function DentalLab3dMasterGrid({
	selectedShade,
	onSelectShade,
}: DentalLab3dMasterGridProps) {
	return (
		<div className="space-y-2">
			{VITA_3D_MASTER_GROUPS.map((grp) => (
				<div
					key={grp.level}
					className="flex flex-col sm:flex-row sm:items-center gap-1.5"
					data-testid={`vita-3dmaster-group-l${grp.level}`}
				>
					<span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 w-24 shrink-0">
						{grp.name}:
					</span>
					<div className="flex flex-wrap items-center gap-1.5 flex-1 max-w-full overflow-x-auto scrollbar-none overscroll-contain py-0.5">
						{grp.shades.map((shade) => {
							const isSelected = selectedShade === shade;
							const swatch = SHADE_SWATCH_MAP[shade];

							return (
								<button
									key={shade}
									type="button"
									onClick={() => onSelectShade(shade)}
									aria-label={`Оттенок 3D-Master ${shade}`}
									title={
										swatch
											? `${shade}: ${swatch.desc}`
											: `Выбрать оттенок 3D-Master ${shade}`
									}
									className={`min-h-[44px] sm:min-h-[48px] min-w-[50px] sm:min-w-[56px] px-2.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
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
		</div>
	);
}

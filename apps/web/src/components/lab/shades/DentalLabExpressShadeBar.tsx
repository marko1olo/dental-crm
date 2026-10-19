import type React from "react";
import { SHADE_SWATCH_MAP, VITA_CLASSICAL_GROUPS } from "../labMath";

export interface DentalLabExpressShadeBarProps {
	readonly shadeSystem: "classical" | "3d_master" | "bleach";
	readonly setShadeSystem: (sys: "classical" | "3d_master" | "bleach") => void;
	readonly currentShade: string;
	readonly onSelectShade: (shade: string) => void;
}

export const DentalLabExpressShadeBar: React.FC<
	DentalLabExpressShadeBarProps
> = ({ shadeSystem, setShadeSystem, currentShade, onSelectShade }) => {
	const currentSwatch = SHADE_SWATCH_MAP[currentShade];

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-1.5 p-1 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] shadow-2xs">
					{(["classical", "bleach", "3d_master"] as const).map((sys) => (
						<button
							key={sys}
							type="button"
							onClick={() => setShadeSystem(sys)}
							data-testid={`shade-system-${sys === "3d_master" ? "3dmaster" : sys}-btn`}
							className={`min-h-[36px] px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-2xs ${
								shadeSystem === sys
									? "border-teal-600 bg-teal-600 text-white"
									: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal)]"
							}`}
						>
							{sys === "classical"
								? "VITA Classical"
								: sys === "bleach"
									? "Bleach"
									: "3D-Master"}
						</button>
					))}
				</div>

				{currentSwatch && (
					<div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] shadow-2xs">
						<div
							className="w-4 h-4 rounded-full border border-slate-400 shadow-inner shrink-0"
							style={{ backgroundColor: currentSwatch.bg }}
						/>
						<span className="text-xs font-bold text-[var(--ink,#0f172a)]">
							Выбран: {currentShade} ({currentSwatch.desc})
						</span>
					</div>
				)}
			</div>

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
		</div>
	);
};

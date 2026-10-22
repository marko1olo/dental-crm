import React from "react";
import { SHADE_SWATCH_MAP, VITA_CLASSICAL_GROUPS } from "../labMath";
import { DentalLab3dMasterGrid } from "./DentalLab3dMasterGrid";
import { DentalLabBleachGrid } from "./DentalLabBleachGrid";
import { DentalLabStumpGrid } from "./DentalLabStumpGrid";

export interface DentalLabExpressShadeBarProps {
	readonly shadeSystem: "classical" | "3d_master" | "bleach" | "stump";
	readonly setShadeSystem: (sys: "classical" | "3d_master" | "bleach" | "stump") => void;
	readonly currentShade: string;
	readonly onSelectShade: (shade: string) => void;
	readonly selectedStumpShade?: string | null | undefined;
	readonly onSelectStumpShade?: ((stump: string) => void) | undefined;
}

export const DentalLabExpressShadeBar: React.FC<
	DentalLabExpressShadeBarProps
> = ({
	shadeSystem,
	setShadeSystem,
	currentShade,
	onSelectShade,
	selectedStumpShade,
	onSelectStumpShade,
}) => {
	const currentSwatch = SHADE_SWATCH_MAP[currentShade];

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-1.5 p-1 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] shadow-2xs">
					<button
						type="button"
						onClick={() => setShadeSystem("classical")}
						data-testid="shade-system-classical-btn"
						id="vita-tab-classical"
						className={`min-h-[36px] px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-2xs ${
							shadeSystem === "classical"
								? "border-teal-600 bg-teal-600 text-white"
								: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal)]"
						}`}
					>
						<span data-testid="vita-classical-tab">VITA Classical</span>
					</button>

					<button
						type="button"
						onClick={() => setShadeSystem("bleach")}
						data-testid="shade-system-bleach-btn"
						id="vita-tab-bleach"
						className={`min-h-[36px] px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-2xs ${
							shadeSystem === "bleach"
								? "border-teal-600 bg-teal-600 text-white"
								: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal)]"
						}`}
					>
						<span data-testid="vita-bleach-tab">Bleach</span>
					</button>

					<button
						type="button"
						onClick={() => setShadeSystem("3d_master")}
						data-testid="shade-system-3dmaster-btn"
						id="vita-tab-3dmaster"
						className={`min-h-[36px] px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-2xs ${
							shadeSystem === "3d_master"
								? "border-teal-600 bg-teal-600 text-white"
								: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal)]"
						}`}
					>
						<span data-testid="vita-3d-master-tab">3D-Master</span>
					</button>

					<button
						type="button"
						onClick={() => setShadeSystem("stump")}
						data-testid="shade-system-stump-btn"
						id="vita-tab-stump"
						className={`min-h-[36px] px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-2xs ${
							shadeSystem === "stump"
								? "border-teal-600 bg-teal-600 text-white"
								: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal)]"
						}`}
					>
						<span data-testid="vita-stump-tab">Культя (ND)</span>
					</button>
				</div>

				<div className="flex items-center gap-2 flex-wrap">
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
					{selectedStumpShade && (
						<div
							className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-600/40 bg-amber-500/15 text-amber-900 dark:text-amber-100 shadow-2xs text-xs font-bold font-mono"
							data-testid="selected-stump-shade-header-chip"
							title={`Культя зуба: ${selectedStumpShade}`}
						>
							<span className="text-[10px] uppercase opacity-75">Культя:</span>
							<span>{selectedStumpShade}</span>
						</div>
					)}
				</div>
			</div>

			{shadeSystem === "classical" && (
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
			)}

			{shadeSystem === "3d_master" && (
				<DentalLab3dMasterGrid
					selectedShade={currentShade}
					onSelectShade={onSelectShade}
				/>
			)}

			{shadeSystem === "bleach" && (
				<DentalLabBleachGrid
					selectedShade={currentShade}
					onSelectShade={onSelectShade}
				/>
			)}

			{shadeSystem === "stump" && (
				<DentalLabStumpGrid
					selectedStumpShade={selectedStumpShade}
					onSelectStumpShade={onSelectStumpShade}
					mode="tab"
				/>
			)}
		</div>
	);
};

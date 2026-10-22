import React from "react";
import { SHADE_SWATCH_MAP } from "../labMath";

export interface DentalLabExpressShadeNavProps {
	readonly shadeSystem: "classical" | "3d_master" | "bleach" | "stump";
	readonly setShadeSystem: (sys: "classical" | "3d_master" | "bleach" | "stump") => void;
	readonly currentShade: string;
	readonly selectedStumpShade?: string | null | undefined;
}

export const DentalLabExpressShadeNav: React.FC<DentalLabExpressShadeNavProps> = ({
	shadeSystem,
	setShadeSystem,
	currentShade,
	selectedStumpShade,
}) => {
	const currentSwatch = SHADE_SWATCH_MAP[currentShade];

	return (
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
	);
};

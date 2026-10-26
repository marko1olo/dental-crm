import React from "react";
import { Grid2X2, Layers } from "lucide-react";
import { DentalImplant } from "../../../../../icons/DentalIcons";

export interface ImplantWorkspaceTopBarProps {
	readonly selectedBrand: string;
	readonly selectedDiameterMm: number;
	readonly selectedLengthMm: number;
	readonly platformColor: string;
	readonly viewMode: "mpr_mode" | "pano_cross_mode" | "pano_grid_mode";
	readonly setViewMode: (mode: "mpr_mode" | "pano_cross_mode" | "pano_grid_mode") => void;
	readonly crossSectionStepMm: number;
}

export const ImplantWorkspaceTopBar: React.FC<ImplantWorkspaceTopBarProps> = ({
	selectedBrand, selectedDiameterMm, selectedLengthMm, platformColor,
	viewMode, setViewMode, crossSectionStepMm,
}) => {
	return (
		<div className="flex items-center justify-between px-2.5 py-1 bg-zinc-900 border border-amber-500/30 rounded-lg shrink-0 gap-2">
			<div className="flex items-center gap-2 min-w-0">
				<DentalImplant className="w-4 h-4 text-amber-400 shrink-0" />
				<span className="text-xs font-bold text-amber-300 truncate">Хирургическое планирование имплантации</span>
				<div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-[11px] shrink-0">
					<span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: platformColor }} />
					<span className="font-bold text-zinc-100">{selectedBrand.toUpperCase()}</span>
					<span className="text-zinc-300">Ø{selectedDiameterMm.toFixed(1)} × L{selectedLengthMm.toFixed(1)} мм</span>
				</div>
			</div>

			<div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded border border-zinc-800 shrink-0">
				<button
					type="button"
					onClick={() => setViewMode("pano_grid_mode")}
					className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
						viewMode === "pano_grid_mode"
							? "bg-amber-950/70 text-amber-200 border border-amber-500/50 shadow-xs"
							: "text-zinc-400 hover:text-zinc-200"
					}`}
					data-testid="cbct-implant-submode-grid-btn"
					title="Плитка поперечных сечений вдоль зубной дуги с шагом 1/2/3 мм"
				>
					<Grid2X2 className="w-3 h-3" />
					<span>Плитка срезов ({crossSectionStepMm} мм)</span>
				</button>
				<button
					type="button"
					onClick={() => setViewMode("pano_cross_mode")}
					className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
						viewMode === "pano_cross_mode"
							? "bg-amber-950/70 text-amber-200 border border-amber-500/50 shadow-xs"
							: "text-zinc-400 hover:text-zinc-200"
					}`}
					data-testid="cbct-implant-submode-panocross-btn"
					title="Панорама ОПТГ + Активный поперечный срез гребня"
				>
					<Layers className="w-3 h-3" />
					<span>ОПТГ + Срез</span>
				</button>
				<button
					type="button"
					onClick={() => setViewMode("mpr_mode")}
					className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
						viewMode === "mpr_mode"
							? "bg-cyan-950/70 text-cyan-200 border border-cyan-500/50 shadow-xs"
							: "text-zinc-400 hover:text-zinc-200"
					}`}
					data-testid="cbct-implant-submode-mpr-btn"
					title="Ортогональная MPR 3D сетка (Аксиальный + Фронтальный + Сагиттальный)"
				>
					MPR 3D Сетка + План
				</button>
			</div>
		</div>
	);
};

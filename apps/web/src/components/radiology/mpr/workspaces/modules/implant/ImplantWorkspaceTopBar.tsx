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
		<div className="flex items-center justify-between px-3 py-1.5 bg-[var(--paper-soft)] border border-[var(--line)] rounded-lg shrink-0 gap-2">
			<div className="flex items-center gap-2 min-w-0">
				<DentalImplant className="w-4 h-4 text-[var(--primary)] shrink-0" />
				<span className="text-xs font-bold text-[var(--ink)] truncate">Хирургическое планирование имплантации</span>
				<div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--paper)] border border-[var(--line)] font-mono text-xs shrink-0">
					<span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: platformColor }} />
					<span className="font-bold text-[var(--ink)]">{selectedBrand}</span>
					<span className="text-[var(--ink-muted)]">Ø{selectedDiameterMm.toFixed(1)} × L{selectedLengthMm.toFixed(1)} мм</span>
				</div>
			</div>

			<div className="flex items-center gap-1 bg-[var(--paper)] p-0.5 rounded-lg border border-[var(--line)] shrink-0">
				<button
					type="button"
					onClick={() => setViewMode("pano_grid_mode")}
					className={`min-h-[32px] px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
						viewMode === "pano_grid_mode"
							? "bg-[var(--primary)] text-white shadow-xs font-semibold"
							: "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
					data-testid="cbct-implant-submode-grid-btn"
					title="Плитка поперечных сечений вдоль зубной дуги с шагом 1/2/3 мм"
				>
					<Grid2X2 className="w-3.5 h-3.5" />
					<span>Плитка срезов ({crossSectionStepMm} мм)</span>
				</button>
				<button
					type="button"
					onClick={() => setViewMode("pano_cross_mode")}
					className={`min-h-[32px] px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
						viewMode === "pano_cross_mode"
							? "bg-[var(--primary)] text-white shadow-xs font-semibold"
							: "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
					data-testid="cbct-implant-submode-panocross-btn"
					title="Панорама ОПТГ + Активный поперечный срез гребня"
				>
					<Layers className="w-3.5 h-3.5" />
					<span>ОПТГ + Срез</span>
				</button>
				<button
					type="button"
					onClick={() => setViewMode("mpr_mode")}
					className={`min-h-[32px] px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
						viewMode === "mpr_mode"
							? "bg-[var(--primary)] text-white shadow-xs font-semibold"
							: "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
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

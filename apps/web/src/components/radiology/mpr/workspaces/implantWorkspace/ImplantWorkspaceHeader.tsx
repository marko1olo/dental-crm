/**
 * ImplantWorkspaceHeader.tsx — Панель выбора режима раскладки и зуба в имплантологическом воркспейсе (Мандат 8b).
 */

import React from "react";
import { Grid2X2, Layers, Spline } from "lucide-react";

export interface ImplantWorkspaceHeaderProps {
	readonly viewMode: "mpr_mode" | "pano_cross_mode" | "pano_grid_mode";
	readonly setViewMode: (mode: "mpr_mode" | "pano_cross_mode" | "pano_grid_mode") => void;
	readonly activeToothFdi?: string | number | undefined;
	readonly patientDisplayName?: string | undefined;
}

export const ImplantWorkspaceHeader: React.FC<ImplantWorkspaceHeaderProps> = ({
	viewMode,
	setViewMode,
	activeToothFdi,
	patientDisplayName,
}) => {
	return (
		<div className="h-10 px-3 bg-[var(--paper-strong)] border-b border-[var(--line)] flex items-center justify-between text-xs flex-shrink-0 z-10">
			<div className="flex items-center gap-2">
				<span className="font-bold text-[var(--text)]">Имплантация</span>
				{activeToothFdi && (
					<span className="px-1.5 py-0.5 rounded bg-[var(--primary)] text-white font-semibold text-[10px]">
						Зуб {activeToothFdi}
					</span>
				)}
				{patientDisplayName && (
					<span className="text-[var(--text-muted)] text-[11px] hidden sm:inline truncate max-w-[180px]">
						{patientDisplayName}
					</span>
				)}
			</div>

			<div className="flex items-center gap-1 bg-[var(--paper)] p-0.5 rounded-lg border border-[var(--line)]">
				<button
					type="button"
					onClick={() => setViewMode("pano_grid_mode")}
					className={`px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
						viewMode === "pano_grid_mode" ? "bg-[var(--primary)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text)]"
					}`}
				>
					<Layers className="w-3.5 h-3.5" />
					<span>Мульти-срезы</span>
				</button>
				<button
					type="button"
					onClick={() => setViewMode("pano_cross_mode")}
					className={`px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
						viewMode === "pano_cross_mode" ? "bg-[var(--primary)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text)]"
					}`}
				>
					<Spline className="w-3.5 h-3.5" />
					<span>Кросс-секция</span>
				</button>
				<button
					type="button"
					onClick={() => setViewMode("mpr_mode")}
					className={`px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
						viewMode === "mpr_mode" ? "bg-[var(--primary)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text)]"
					}`}
				>
					<Grid2X2 className="w-3.5 h-3.5" />
					<span>MPR 3D</span>
				</button>
			</div>
		</div>
	);
};

import type React from "react";
import { TOOTH16_DEFECT_GEOMETRY } from "./Tooth16DefectGeometry";
import type { Tooth16CrownMaterial } from "./tooth16Types";

export interface Tooth16CrownDefectsProps {
	crownMaterial?: Tooth16CrownMaterial;
	isDark?: boolean;
}

/**
 * DENTE Dental CRM — Defective Crown Visuals for Upper Molars 16 / 26
 * Chipped porcelain on MB cusp, cervical open margin, occlusal perforation.
 * Mandate 8b <= 120 lines.
 */
export const Tooth16CrownDefects: React.FC<Tooth16CrownDefectsProps> = ({
	crownMaterial = "zirconia",
	isDark = false,
}) => {
	const coreFill =
		crownMaterial === "pfm" || crownMaterial === "metal"
			? "#1e293b"
			: "#64748b";
	const gapStroke = isDark ? "#f59e0b" : "#b45309";

	return (
		<g id="tooth16-crown-defects-group">
			{/* 1. Cervical decementation open margin at CEJ */}
			<path
				id="tooth16-crown-margin-gap"
				d={TOOTH16_DEFECT_GEOMETRY.crownCervicalDecementationGap}
				stroke={gapStroke}
				strokeWidth="1.8"
				strokeDasharray="3,1.5"
				fill="none"
			/>

			{/* 2. Chipped ceramic on MB cusp exposing core frame */}
			<path
				id="tooth16-crown-chip-border"
				d={TOOTH16_DEFECT_GEOMETRY.crownPorcelainChipMB}
				fill={isDark ? "rgba(239, 68, 68, 0.4)" : "rgba(220, 38, 38, 0.3)"}
				stroke="#ef4444"
				strokeWidth="0.8"
			/>
			<path
				id="tooth16-crown-exposed-core"
				d={TOOTH16_DEFECT_GEOMETRY.crownExposedSubstructureMB}
				fill={coreFill}
			/>

			{/* 3. Occlusal perforation through Crista Obliqua */}
			<path
				id="tooth16-crown-perforation"
				d={TOOTH16_DEFECT_GEOMETRY.crownOcclusalPerforation}
				fill={coreFill}
				stroke="#ef4444"
				strokeWidth="0.8"
			/>
		</g>
	);
};

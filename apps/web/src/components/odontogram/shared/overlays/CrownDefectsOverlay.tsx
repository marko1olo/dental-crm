import type React from "react";
import { DENTE_SHADER_IDS } from "../defs/shaderConstants";
import type { CrownDefectGeometry, CrownMaterial } from "../types/crownTypes";

export interface CrownDefectsOverlayProps {
	readonly defects?: CrownDefectGeometry | undefined;
	readonly material?: CrownMaterial | undefined;
	readonly isDark?: boolean | undefined;
	readonly className?: string | undefined;
}

/**
 * Defective Orthopedic Crown Manifestations:
 * 1. Ceramic Chipping (fractured porcelain exposing metal or opaque core)
 * 2. Cervical Margin Washout Gap / Recurrent Subgingival Caries
 * 3. Occlusal Wear Perforation Hole
 * Mandate 8b <= 120 lines.
 */
export const CrownDefectsOverlay: React.FC<CrownDefectsOverlayProps> = ({
	defects,
	material = "zirconia",
	isDark = false,
	className,
}) => {
	if (!defects) return null;

	const chippedCoreFill =
		material === "gold"
			? "#92400e"
			: material === "pfm" || material === "metal"
				? "#1e293b"
				: isDark
					? "#475569"
					: "#64748b";

	return (
		<g
			id="dente-crown-defective-manifestations"
			className={className}
			data-crown-defect="true"
		>
			{/* 1. Ceramic Chipping with Exposed Substructure */}
			{defects.ceramicChippingPath && (
				<path
					d={defects.ceramicChippingPath}
					fill={chippedCoreFill}
					stroke={isDark ? "#f87171" : "#dc2626"}
					strokeWidth="0.7"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}

			{/* 2. Cervical Margin Washout Gap / Recurrent Caries under Margin */}
			{defects.cervicalWashoutPath && (
				<path
					d={defects.cervicalWashoutPath}
					fill={`url(#${DENTE_SHADER_IDS.cariesLesion})`}
					stroke="#78350f"
					strokeWidth="0.6"
					vectorEffect="non-scaling-stroke"
				/>
			)}

			{/* 3. Occlusal Wear Perforation Hole */}
			{defects.occlusalPerforationPath && (
				<path
					d={defects.occlusalPerforationPath}
					fill="#1c1917"
					stroke="#475569"
					strokeWidth="0.6"
					vectorEffect="non-scaling-stroke"
				/>
			)}
		</g>
	);
};

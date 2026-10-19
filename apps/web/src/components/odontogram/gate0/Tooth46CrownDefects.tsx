import type React from "react";
import { TOOTH46_DEFECT_GEOMETRY } from "./Tooth46DefectGeometry";
import type { CrownMaterial } from "./tooth46Types";

export interface Tooth46CrownDefectsProps {
	material: CrownMaterial;
	isDark?: boolean | undefined;
}

export const Tooth46CrownDefects: React.FC<Tooth46CrownDefectsProps> = ({
	material,
	isDark = false,
}) => {
	const d = TOOTH46_DEFECT_GEOMETRY.defectiveCrown;

	// Authentic material-specific exposed core substructure (not slate-grey for ceramics!)
	const chippedCoreFill =
		material === "zirconia"
			? "#cbd5e1" // Opaque white zirconia core
			: material === "emax"
				? "#d97706" // Warm prepared natural dentin stump
				: material === "gold"
					? "#92400e" // Burnished golden hole rim
					: material === "pmma"
						? "#fde68a" // Matte acrylic resin core
						: "#1e293b"; // Dark oxidized metal coping (PFM / Co-Cr)

	const alertStroke = isDark ? "#f87171" : "#dc2626";

	return (
		<g
			id="tooth46-crown-defective-manifestations"
			data-testid="tooth46-crown-defective-manifestations"
		>
			{/* Ceramic Chipping with True Material Substructure */}
			<path
				d={d.ceramicChippingMB}
				fill={chippedCoreFill}
				stroke={alertStroke}
				strokeWidth="0.7"
				strokeLinejoin="round"
			/>

			{/* Cervical Margin Washout Gap / Recurrent Caries Infiltration (>50 microns) */}
			<path
				d={d.cervicalWashoutGap}
				fill="url(#dente-caries-lesion)"
				stroke="#78350f"
				strokeWidth="0.6"
			/>

			{/* Occlusal Wear Perforation Through Crown Facet */}
			<path
				d={d.occlusalPerforationHole}
				fill="#1c1917"
				stroke="#475569"
				strokeWidth="0.6"
			/>

			{/* Overhanging Proximal Margin Protruding into Mesial Embrasure */}
			<path
				d={d.overhangingMargin}
				fill={chippedCoreFill}
				stroke={alertStroke}
				strokeWidth="0.7"
				strokeLinejoin="round"
			/>
		</g>
	);
};

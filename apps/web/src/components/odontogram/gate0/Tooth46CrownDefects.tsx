import type React from "react";
import { TOOTH46_DEFECT_GEOMETRY } from "./Tooth46DefectGeometry";
import type { CrownMaterial } from "./tooth46Types";

export interface Tooth46CrownDefectsProps {
	material: CrownMaterial;
	isDark?: boolean;
}

export const Tooth46CrownDefects: React.FC<Tooth46CrownDefectsProps> = ({
	material,
	isDark = false,
}) => {
	const d = TOOTH46_DEFECT_GEOMETRY.defectiveCrown;

	const chippedCoreFill =
		material === "gold"
			? "#92400e"
			: material === "pfm" || material === "metal"
				? "#1e293b"
				: isDark
					? "#475569"
					: "#64748b";

	return (
		<g id="tooth46-crown-defective-manifestations">
			{/* Ceramic Chipping with Exposed Substructure */}
			<path
				d={d.ceramicChippingMB}
				fill={chippedCoreFill}
				stroke={isDark ? "#f87171" : "#dc2626"}
				strokeWidth="0.7"
				strokeLinejoin="round"
			/>

			{/* Cervical Margin Washout Gap / Recurrent Caries under Margin */}
			<path
				d={d.cervicalWashoutGap}
				fill="url(#dente-caries-lesion)"
				stroke="#78350f"
				strokeWidth="0.6"
			/>

			{/* Occlusal Wear Perforation Through Crown */}
			<path
				d={d.occlusalPerforationHole}
				fill="#1c1917"
				stroke="#475569"
				strokeWidth="0.6"
			/>
		</g>
	);
};

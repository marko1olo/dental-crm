import type React from "react";
import { TOOTH16_DEFECT_GEOMETRY } from "./Tooth16DefectGeometry";
import { TOOTH16_RESTORATION_GEOMETRY } from "./Tooth16RestorationGeometry";
import type { Tooth16RestorationCondition } from "./tooth16Types";

export interface Tooth16CompositeRestorationProps {
	compositeCondition?: Tooth16RestorationCondition;
	isDark?: boolean;
}

/**
 * DENTE Dental CRM — Nanohybrid Light-Cure Composite (A2/A3) Restoration
 * Anatomical filling for Tooth 16 / 26 occlusal basins with defect overlays.
 * Mandate 8b <= 120 lines.
 */
export const Tooth16CompositeRestoration: React.FC<
	Tooth16CompositeRestorationProps
> = ({ compositeCondition = "adequate", isDark = false }) => {
	const compositeBorder = isDark
		? "rgba(148, 163, 184, 0.60)"
		: "rgba(100, 116, 139, 0.55)";

	return (
		<g id="tooth16-composite-group">
			<path
				id="tooth16-composite-central"
				d={TOOTH16_RESTORATION_GEOMETRY.compositeCentralInlay}
				fill="url(#dente16-composite-a2)"
				stroke={compositeBorder}
				strokeWidth="0.6"
			/>
			<path
				id="tooth16-composite-distal"
				d={TOOTH16_RESTORATION_GEOMETRY.compositeDistalInlay}
				fill="url(#dente16-composite-a2)"
				stroke={compositeBorder}
				strokeWidth="0.6"
			/>
			<path
				d={TOOTH16_RESTORATION_GEOMETRY.compositeFissures}
				stroke={
					isDark ? "rgba(100, 116, 139, 0.45)" : "rgba(71, 85, 105, 0.40)"
				}
				strokeWidth="0.6"
				fill="none"
			/>

			{/* Defective composite pathology overlay */}
			{compositeCondition === "defective" && (
				<g id="tooth16-composite-defects">
					<path
						d={TOOTH16_DEFECT_GEOMETRY.compositeMarginalLeakage}
						stroke="#78350f"
						strokeWidth="1.4"
						fill="none"
					/>
					<path
						d={TOOTH16_DEFECT_GEOMETRY.compositeSecondaryCaries}
						fill="#451a03"
					/>
					<path
						d={TOOTH16_DEFECT_GEOMETRY.compositeFractureChip}
						fill="#b45309"
						stroke="#78350f"
						strokeWidth="0.6"
					/>
				</g>
			)}
		</g>
	);
};
